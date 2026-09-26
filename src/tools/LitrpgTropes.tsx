// 게임판타지·LitRPG 트로프·관습 체크리스트 — 이 장르의 독자 기대(Reader Promise)·필수 요소·흔한 함정·클리셰(+비틀기)를
// 4분기(VR 다이브/데스게임/이세계 전이+시스템/현실 침공) 프리셋과 함께 카테고리별 체크리스트로 점검한다.
// 부가: '클리셰 비틀기 발생기'(슬롯 풀 무작위·잠금·재생성·조합수 표시) + 클릭복사 + 사전류 검색/펼침.
// 모든 상태(체크·사용자 항목·삭제된 기본·접힘·분기 선택)는 localStorage('sry:tool:litrpg-tropes')에 자동 저장/복원.
// 자급식: react 와 './linkbus' 외 import 금지. localStorage 미지원/차단/손상 시 메모리만 사용하며 throw 금지.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'litrpg-tropes',
  name: 'LitRPG 트로프 체크',
  icon: '🎮',
  group: '구상·정리',
  genre: '게임판타지·LitRPG',
  intro: '게임판타지·LitRPG 독자 기대·필수 요소·함정·클리셰(+비틀기)를 분기별로 점검하세요',
  w: 660,
  h: 640,
}

const LS_KEY = 'sry:tool:litrpg-tropes'

// ─────────────────────────────────────────────────────────────────────────────
// 분기(첫 선택지) — 도시에 0장. 선택에 따라 관습·금기·페이싱이 갈린다.
interface Branch {
  id: string
  name: string
  icon: string
  desc: string
  // 이 분기에서 특히 챙길 점 / 피할 점
  must: string[]
  avoid: string[]
}
const BRANCHES: Branch[] = [
  {
    id: 'vr',
    name: 'VR 다이브형',
    icon: '🕶️',
    desc: '현실의 인간이 가상현실 게임에 접속(달빛조각사·로열로드 계열). 로그아웃·현실 생활 존재.',
    must: [
      '게임 성과가 현실 지위·재화로 환산되는 "환율"이 설계되어 있다',
      '로그아웃 후 현실 생활(가족·돈·학업·직장)이 동기로 작동한다',
      '캡슐/기기·접속 시간 제한 같은 현실 제약이 긴장을 만든다',
      '생산직·노가다·경제 플레이가 전투만큼 보상감을 준다(달빛조각사형)',
    ],
    avoid: [
      '현실 파트가 게임 파트와 따로 놀아 흐름을 끊는다',
      '현금화·환율을 설정만 하고 한 번도 써먹지 않는다',
      '게임이라 죽어도 그만이라 긴장(스테이크)이 사라진다',
    ],
  },
  {
    id: 'death',
    name: '갇힘·데스게임형',
    icon: '💀',
    desc: '게임에서 못 나옴, 죽으면 진짜 죽음(SAO 계열). 긴장도 최상.',
    must: [
      '죽음=영구사망 규칙이 초반에 명시되고 흔들리지 않는다',
      '"안전지대"조차 심리적 압박이 있어 긴장이 유지된다',
      '탈출·클리어라는 거대 장기 목표가 모든 행동을 견인한다',
      '동료의 영구 죽음이 실제 무게(상실)로 다뤄진다',
    ],
    avoid: [
      '로그아웃 안전지대를 묘사해 데스게임 긴장을 깨뜨린다',
      '주인공만 죽지 않는 안전 보정으로 위기감이 0이 된다',
      '부활·세이브를 슬쩍 허용해 규칙을 배신한다',
    ],
  },
  {
    id: 'isekai',
    name: '이세계 전이+시스템형',
    icon: '🌌',
    desc: '다른 세계로 넘어갔는데 그 세계에 게임 시스템이 깔려 있음(나 혼자만 레벨업). 로그아웃 없음.',
    must: [
      '시스템이 "왜 이 세계에 존재하나"라는 후반 떡밥으로 연결된다',
      '돌아갈 곳이 없으니 이 세계에 뿌리내릴 사회적 목표가 있다',
      '원주민(NPC가 아닌 사람들)과의 관계가 살아 있다',
      '시스템 보유자가 주인공뿐/소수라 "특별함"이 성립한다',
    ],
    avoid: [
      '왜 게임 시스템이 있는지 끝까지 함구해 무책임하게 느껴진다',
      '이세계 고유 문화·법칙 없이 게임 UI만 둥둥 떠다닌다',
      '전이 직후 곧장 먼치킨이라 성장 곡선이 사라진다',
    ],
  },
  {
    id: 'apoc',
    name: '현실 침공형(시스템 아포칼립스)',
    icon: '🌃',
    desc: '어느 날 현실에 상태창·던전·게이트가 생김(전지적 독자 시점·헌터물). 헌터물과 강하게 겹침.',
    must: [
      '갑작스러운 시스템 도래에 사회·국가·경제가 반응한다(헌터협회·길드·등급)',
      '각성 등급(F~S/SS)이 사회적 계급으로 작동한다',
      '게이트·던전 브레이크 같은 재난이 일상의 위협으로 깔린다',
      '게임 능력이 현실 권력으로 전환되는 경로가 분명하다',
    ],
    avoid: [
      '세계가 침공당했는데 일반인의 공포·혼란이 전혀 안 보인다',
      '헌터 행정·경제·정치가 편의대로 있다 없다 한다',
      '각성 즉시 최강이라 약자 시절의 설움(=사이다 연료)이 없다',
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// 체크리스트 카테고리 — 도시에 2~9장 기반. id 는 cat.id + index 로 파생(안정적).
type Kind = 'promise' | 'must' | 'pitfall' | 'cliche'
interface Cat {
  id: string
  name: string
  icon: string
  kind: Kind
  desc: string
  items: string[]
}
const CATS: Cat[] = [
  // ── 독자 기대(Reader Promise) — 도시에 2장
  {
    id: 'promise',
    name: '독자 기대(약속)',
    icon: '🤝',
    kind: 'promise',
    desc: '이걸 어기면 독자가 떠난다 — 장르의 핵심 약속',
    items: [
      '성장이 "숫자"로 가시화된다(레벨업·스탯·새 스킬 획득의 보상감)',
      '시스템 규칙이 명시되고 공정하다 — 사기여도 규칙 안에서 사기다',
      '사이다(카타르시스)가 고구마보다 우세하다 — 무시당하던 자가 압도적으로 갚는다',
      '목표 위계가 동시에 굴러간다 — 다음 레벨·던전·보스·랭킹',
      '빌드·전략의 묘미가 있다 — 스탯/스킬 시너지 최적해 찾기',
      '희귀·유니크에 대한 욕망을 채워준다 — 남들 못 가진 직업·칭호·아이템',
      '랭킹·평판이 수치화되어 사회적 인정 욕구를 자극한다',
      '루팅(개봉)의 쾌감이 있다 — 보스 처치 후 드랍을 까보는 긴장',
      '매 화 최소 하나는 갱신된다 — 성장(수치)·보상·다음 목표 중 하나',
    ],
  },
  // ── 필수 서사 장치 — 도시에 3장
  {
    id: 'device',
    name: '필수 서사 장치',
    icon: '🧩',
    kind: 'must',
    desc: '장치는 "사용/미사용/변형"으로 토글 — 세계관 규칙서의 뼈대',
    items: [
      '상태창/시스템 메시지를 본문에 삽입한다([ ]·< >·구분선으로 시각 분리)',
      '레벨업 시 스탯 분배가 곧 캐릭터의 정체성이 된다',
      '스킬 트리·시너지·콤보(액티브/패시브·진화·각성·상위 스킬)가 있다',
      '퀘스트(메인/서브/히든/연계)와 실패 페널티가 플롯을 분기시킨다',
      '클래스/직업·전직·히든/유니크 클래스로 주인공을 특별화한다',
      '등급·레어리티 체계(커먼→유니크→레전더리→미식)가 공통 측정자로 쓰인다',
      '칭호(Title) 시스템 — 업적·최초 달성(First Clear)이 버프·해금을 준다',
      '인벤토리·세트 효과·강화/인챈트/소켓·랜덤 옵션(도박성)이 있다',
      '확률(RNG)이 서사적 긴장 장치다 — 강화 실패로 장비 파괴 등',
      '시스템/안내자 AI(도깨비·관리자)가 세계관 비밀의 화자를 겸한다',
      '전투 로그·딜미터로 박진감을 준다("데미지 1,234! 치명타!")',
      '버프/디버프·상태이상(중독·기절·출혈·화상)이 전투 변수가 된다',
      '쿨다운·자원관리(MP/스태미나)가 전투를 머리싸움으로 만든다',
      '회귀/루프 + 게임지식 — "결과를 아는 자"가 공략을 무기로 삼는다',
      '시스템의 의도·배후(신·관리자·탑의 주인)가 후반 메인 떡밥으로 스케일업한다',
    ],
  },
  // ── 구조·페이싱 — 도시에 4~5장
  {
    id: 'pacing',
    name: '구조·페이싱',
    icon: '📈',
    kind: 'must',
    desc: '성장 곡선=플롯 곡선 — 나선형 반복과 게이팅',
    items: [
      '오프닝 5비트: 억울한 현실 → 각성/전이 → 튜토리얼 → 첫 특별함 → 첫 사이다',
      '튜토리얼 구간이 곧 독자 온보딩(규칙 학습) 역할을 한다',
      '에피소드=던전·레이드·퀘스트·랭킹전 한 덩어리(1화=1훅, 5~10화=1소아크)',
      '파워 게이팅 — 마을→필드→던전→레이드→보스→상위 지역에 자격 게이트',
      '코어 루프(사냥→경험치/드랍→레벨업/강화→더 센 사냥)에 변주를 주기 투입',
      '전투·성장 70 : 휴식·관계·세계관 30 의 완급(연속 전투 보상 둔감화 방지)',
      '수치 인플레를 관리한다 — 단위 리셋·상대평가(랭킹)·질적 보상으로 보완',
      '회귀/원작지식형은 "언제 어떻게 써먹나"의 기대감으로 서스펜스를 운용한다',
    ],
  },
  // ── 클라이맥스 — 도시에 5장
  {
    id: 'climax',
    name: '클라이맥스',
    icon: '🔥',
    kind: 'must',
    desc: '보스 레이드·한계 돌파의 3박자',
    items: [
      '보스/네임드 처치가 클라이맥스 단위다',
      '3박자: 패턴 파악 → 전멸 위기 → 역전 변수(히든스킬·각성·아이템·동료 희생)',
      '한계 돌파(Limit Break) — 죽기 직전 새 스킬 각성/잠재력 개방으로 역전',
      '"조건 충족: [○○] 발동" 시스템 메시지로 역전을 공정하게 정당화한다',
      '역전 변수의 단서가 미리 깔려 데우스 엑스 마키나가 아니다',
    ],
  },
  // ── 흔한 함정 — 도시에 9장(각 장치의 함정)
  {
    id: 'pitfall',
    name: '흔한 함정',
    icon: '⚠️',
    kind: 'pitfall',
    desc: '체크되면 위험 — 빠지기 쉬운 함정 점검',
    items: [
      '먼치킨 보정으로 긴장(스테이크)이 사라진다 — 위기다운 위기가 없다',
      '작가가 시스템 규칙을 임의로 어긴다(공정성 붕괴, 독자 반발)',
      '상태창·수치 나열에 본문이 잡아먹혀 서사가 멈춘다(스탯시트 덤프)',
      '파워 인플레로 숫자만 커지고 감흥은 둔해진다(인플레 피로)',
      '회귀/원작지식이 만능 치트라 갈등·긴장이 증발한다',
      '튜토리얼·설정 인포덤프가 한곳에 몰려 초반 이탈을 부른다',
      '히든/유니크가 남발되어 "특별함"이 흔해진다',
      '미회수 떡밥(시스템 배후·복선)이 방치된다',
      '주인공이 수동적이다 — 시스템이 떠먹여 주기만 한다',
      '동료·조연이 경험치 셔틀·기능 부품으로만 소비된다',
      '여성·NPC 등 캐릭터가 보상(트로피)으로 도구화된다',
      '게임 규칙과 세계관 개연성이 충돌하는데 봉합하지 않는다',
    ],
  },
  // ── 클리셰(+비틀기) — 도시에 전반. 각 항목은 "흔한 클리셰 → 비틀기"
  {
    id: 'cliche',
    name: '클리셰 → 비틀기',
    icon: '♻️',
    kind: 'cliche',
    desc: '익숙한 클리셰를 신선하게 — 비틀기 예시 포함',
    items: [
      '꼴찌·F급 각성자가 사실 유일무이한 히든 클래스 → 등급은 그대로지만 "측정 불가"한 비범함으로 비튼다',
      '튜토리얼에서 남들 못 본 히든 보상 단독 획득 → 보상에 치명적 대가/저주를 함께 붙인다',
      '회귀해서 미래를 다 안다 → 회귀로 미래가 어긋나 지식이 점점 무용해진다',
      '시스템이 친절히 다 알려주는 안내자 → 안내자가 거짓·편향 정보를 흘리는 화자다',
      '강화 떡상으로 사기 장비 완성 → 강화의 대가로 장비가 사용자를 잠식한다',
      '죽으면 부활하는 안전한 게임 → 부활 때마다 기억/스탯/인간성을 잃는다',
      '먼치킨 주인공이 모두를 압도 → 힘이 아니라 "정보·관계·판짜기"로 이긴다',
      '히든 퀘스트로 유니크 클래스 전직 → 유니크 클래스가 사회적 낙인·표적이 된다',
      '랭킹 1위를 향한 단순 상승 → 1위가 되는 순간 더 거대한 판의 말이었음이 드러난다',
      '시스템 배후=신/관리자 → 배후가 주인공 자신/독자/시스템 그 자체라는 메타 반전',
      '동료의 희생으로 역전 → 희생이 헛되거나 되살아나 더 큰 딜레마가 된다',
      '보스 패턴 파훼=클리어 → 패턴을 깬 대가로 더 위험한 진짜 보스가 깨어난다',
      '현실 침공 후 각성=계급 상승 → 각성이 인간성을 비인간 존재로 변질시킨다',
      '게임 화폐의 현금화로 일확천금 → 현금화가 게임-현실 경제를 붕괴시키는 부메랑이 된다',
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// 한국어 조사 자동 선택 — 앞 글자 받침을 보고 실제 하나를 골라 출력(괄호 이중표기 금지).
// 한글 음절 받침 유무 판정: (코드-0xAC00) % 28 !== 0 이면 받침 있음. 'ㄹ' 받침은 (…%28)===8.
function hasFinalConsonant(word: string): boolean {
  const ch = word.trim().slice(-1)
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false // 한글 음절이 아니면 받침 없음으로 취급
  return (code - 0xac00) % 28 !== 0
}
// 을/를 (목적격)
const josaEul = (w: string) => w + (hasFinalConsonant(w) ? '을' : '를')
// 이/가 (주격)
const josaGa = (w: string) => w + (hasFinalConsonant(w) ? '이' : '가')

// ─────────────────────────────────────────────────────────────────────────────
// 클리셰 비틀기 발생기 — 슬롯 풀 무작위(잠금/재생성) + 조합수 표시.
// 7개 슬롯의 곱 ≥ 50억 지향(핵심 생성기).
interface Slot {
  id: keyof Twist
  label: string
  icon: string
  pool: string[]
}
interface Twist {
  who: string
  stage: string
  trope: string
  twist: string
  cost: string
  ally: string
  stinger: string
}
const SLOTS: Slot[] = [
  {
    id: 'who',
    label: '주인공',
    icon: '🧑‍🎤',
    pool: [
      '만년 F급 각성자', '게임 폐인 출신 백수', '회귀한 전직 1위 랭커', '원작 소설을 다 읽은 독자',
      '버그로 갇힌 베타테스터', '생산직 대장장이 플레이어', '시스템이 인정 안 한 무직자',
      '죽으면 진짜 죽는 데스게임 생존자', '이세계로 떨어진 평범한 회사원', '게이트가 열린 날 각성한 고등학생',
      '디버프만 잔뜩 깔린 저주받은 캐릭터', '자아를 가진 NPC', '관리자에게 미움받는 이레귤러',
      '튜토리얼을 못 깬 채 본편에 던져진 자', '스탯이 0으로 고정된 글리치 유저',
      '랭커였다가 모든 걸 잃은 몰락 길드장', '시스템 메시지가 안 보이는 무감각자', '버려진 초기 서버의 마지막 유저',
      '평판이 바닥까지 떨어진 PK 살인마', '죽을 때마다 능력이 한 단계 강해지는 불운아', '아무 직업도 못 받은 무직 광부',
      '튜토리얼 NPC였다가 자아를 얻은 안내자', '레벨이 1로 영원히 고정된 봉인된 강자', '디버그 권한을 우연히 주운 일반인',
      '운영자에게 밴당했다 풀려난 복귀 유저', '죽은 형의 계정을 물려받은 동생', '실력 대신 운빨만 미친 도박꾼 플레이어',
      '전투 능력 0짜리 순수 생활 직업자', '경험치 대신 빚만 쌓이는 가난한 모험가', '모든 스탯이 평균인 지극히 평범한 회사원',
    ],
  },
  {
    id: 'stage',
    label: '무대',
    icon: '🗺️',
    pool: [
      '풀다이브 가상현실 게임', '못 나가는 데스게임 던전', '게임 시스템이 깔린 이세계',
      '상태창이 도래한 현실 도시', '끝없이 층을 오르는 탑', '주기적으로 열리는 게이트 너머',
      '폐허가 된 초기 서버', '신들이 운영하는 투기장', '회귀가 반복되는 시간 루프',
      '왕국 멸망 직전의 전장', '버그가 들끓는 미완성 베타 맵', '현실과 게임이 뒤섞인 경계 지대',
      '랭커들만 입장하는 최상위 레이드', '튜토리얼 섬', '몬스터 웨이브가 밀려오는 변경 요새',
      '플레이어 도시국가', '심해에 가라앉은 봉인 던전', '하늘에 떠 있는 부유성',
    ],
  },
  {
    id: 'trope',
    label: '클리셰',
    icon: '♻️',
    pool: [
      '히든 클래스로 전직', '튜토리얼 단독 히든 보상', '회귀로 미래를 앎', '강화 떡상 사기 장비',
      '죽어도 부활하는 안전망', '먼치킨으로 전부 압도', '랭킹 1위 등극', '시스템 안내자의 친절한 가이드',
      '동료 희생으로 역전', '보스 패턴 파훼', '각성으로 계급 상승', '게임 화폐 현금화로 일확천금',
      '유니크 스킬 단독 보유', '최초 달성 보너스 독식', '레이드 막타로 영웅 등극',
      '히든 퀘스트 연쇄 클리어', '버려진 직업으로 사기 빌드 완성', '소환수와의 절대 충성 계약',
      '한계 돌파로 죽기 직전 각성', '신의 가호를 받은 선택받은 자', '경매장 정보 독점으로 떼돈',
      '동료들과의 끈끈한 길드 결성', '치트급 패시브 스킬 발현', '봉인된 고대 무기 해방',
      '약점 간파로 강적 무력화', '노가다 끝에 만렙 달성', '히든 보스 토벌 명성 획득',
      '저주 아이템을 역이용한 반전', '버그 활용으로 무한 자원 확보', '시스템 도움말을 끝까지 정독해 얻은 이점',
    ],
  },
  {
    id: 'twist',
    label: '비틀기',
    icon: '🔀',
    pool: [
      '그 능력이 측정·복제 불가라 오히려 표적이 된다', '얻은 즉시 더 강한 적의 어그로가 끌린다',
      '지식이 어긋나기 시작해 점점 무용해진다', '힘이 아니라 정보·관계·판짜기로만 이긴다',
      '시스템이 거짓을 흘리는 신뢰 불가 화자다', '대가로 기억과 인간성을 야금야금 잃는다',
      '성공의 순간 더 큰 판의 말이었음이 드러난다', '배후가 주인공 자신이라는 메타 반전으로 뒤집힌다',
      '되살아난 희생이 더 큰 딜레마를 만든다', '클리어가 진짜 보스를 깨운다',
      '각성이 인간을 비인간 존재로 변질시킨다', '경제와 사회가 붕괴하는 부메랑이 된다',
      '능력에 인격이 깃들어 주인공과 협상·대립한다', '남들에겐 버그·반칙으로 보여 추방 위기에 몰린다',
      '이득을 본 만큼 세계의 균형이 무너진다', '쾌감에 중독되어 스스로를 통제하지 못한다',
      '한 번의 성공이 평생의 표적 신세로 이어진다', '가장 믿던 동료가 그 대가를 노리고 접근했다',
      '능력의 진짜 주인이 따로 있어 회수당할 위기다', '강해질수록 원래 목표를 잊어버린다',
      '구원한 줄 알았던 결과가 더 큰 비극을 부른다', '승리의 증거가 곧 죄목이 되어 돌아온다',
      '시스템이 일부러 이기게 두고 관찰하는 중이었다', '얻은 힘이 주변 사람들을 끌어들여 위험에 빠뜨린다',
      '예언대로 이뤘더니 예언 자체가 함정이었다', '압도적인 힘이 적이 아니라 동료를 두렵게 만든다',
      '반복될수록 효과가 줄어 결국 무뎌진다', '진실을 알고 나면 되돌릴 수 없게 설계돼 있었다',
      '승자가 다음 판의 제물로 지정되는 규칙이 숨어 있었다', '편법이 들통나 쌓아온 명성이 한순간에 무너진다',
    ],
  },
  {
    id: 'cost',
    label: '대가',
    icon: '⚖️',
    pool: [
      '수명이 깎인다', '특정 감정을 잃는다', '소중한 기억이 지워진다', '되돌릴 수 없는 디버프가 영구히 붙는다',
      '주변인이 대신 페널티를 받는다', '능력을 쓸수록 인간성이 마모된다', '시스템에 갚을 수 없는 빚이 쌓인다',
      '쿨다운이 며칠 단위로 길어진다', '같은 적에게는 두 번 통하지 않는다', '사용 사실이 적에게 즉시 노출된다',
      '신체 일부가 비인간으로 변한다', '운명이 뒤틀려 가까운 이의 죽음이 앞당겨진다',
      '쓸 때마다 무작위 스탯 하나가 봉인된다', '신뢰하던 동료의 호감도가 떨어진다', '꿈자리가 사나워져 잠을 못 잔다',
      '능력을 쓴 장소가 영구히 오염된다', '되돌리려면 더 큰 희생을 치러야 한다', '감각 하나가 둔해진다',
      '나이를 거꾸로 먹어 어려진다', '다음 한 판은 강제로 약체화된다', '소지한 아이템 하나가 무작위로 사라진다',
      '평판이 깎여 마을 출입이 제한된다', '쓸수록 시스템의 감시 등급이 올라간다', '고통이 현실의 몸에까지 전이된다',
    ],
  },
  {
    id: 'ally',
    label: '곁의 존재',
    icon: '🤝',
    pool: [
      '믿음직한 베테랑 길드장', '정체를 숨긴 라이벌 랭커', '말을 거는 시스템 안내 AI',
      '계약으로 묶인 소환수', '빚을 진 정보상', '주인공만 따르는 견습 후배',
      '같은 회귀자라 주장하는 수상한 동행', '버려진 NPC 출신 동료', '현실의 가족',
      '적이었다가 손잡은 전 보스', '능력에 깃든 또 하나의 인격', '관리자 측의 감시자',
      '죽은 친구의 유지를 잇는 후계자', '돈만 보고 붙은 용병 파티', '주인공을 짝사랑하는 치유사',
      '경쟁 길드의 첩자', '말 못 하는 충직한 펫', '정체불명의 후원자',
    ],
  },
  {
    id: 'stinger',
    label: '떡밥(스팅어)',
    icon: '🪝',
    pool: [
      '관리자가 주인공을 "변수"로 분류했다는 메시지', '같은 능력을 가진 자가 또 있다는 단서',
      '시스템이 만들어진 진짜 목적이 슬쩍 드러난다', '죽은 줄 알았던 인물의 ID가 로그에 남는다',
      '튜토리얼 시절의 NPC가 본편에서 적으로 재등장한다', '랭킹 너머 "0위"라는 자리의 존재가 암시된다',
      '게이트 너머에서 현실로 무언가 넘어오기 시작한다', '주인공의 스탯 하나가 "???"로 가려져 있다',
      '히든 퀘스트가 다음 차원의 열쇠를 가리킨다', '시스템이 처음으로 "예측 불가"라고 응답한다',
      '회귀 전 기억과 다른 분기점이 발생했다', '동료 중 하나가 시스템의 끄나풀이라는 암시가 떨어진다',
      '하늘에 모든 플레이어가 보는 공지가 새로 뜬다', '봉인된 지역의 문이 스스로 열리기 시작한다',
      '주인공의 이름이 금지어 목록에 올라가 있다', '오래전 사라진 1세대 플레이어의 흔적이 발견된다',
      '시스템이 곧 대규모 업데이트를 예고한다', '거울 속 자신이 다르게 움직인 순간이 포착된다',
      '죽은 동료의 장비가 다른 사람 손에서 발견된다', '하늘의 카운트다운 숫자가 줄기 시작한다',
      '주인공의 능력치 옆에 처음 보는 게이지가 생긴다', '세계 전체에 원인 불명의 버그가 번지기 시작한다',
      '예언서의 마지막 장이 백지로 비어 있다', '시스템이 "두 번째 시험"을 언급한다',
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
interface UserItem { id: string; text: string }
interface Persisted {
  branch: string
  checked: Record<string, boolean>
  removedDefaults: string[]
  userItems: Record<string, UserItem[]>
  collapsed: Record<string, boolean>
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function emptyState(): Persisted {
  return { branch: '', checked: {}, removedDefaults: [], userItems: {}, collapsed: {} }
}
function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return emptyState()
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return emptyState()
    const checked: Record<string, boolean> = {}
    if (p.checked && typeof p.checked === 'object') for (const k of Object.keys(p.checked)) checked[k] = !!p.checked[k]
    const collapsed: Record<string, boolean> = {}
    if (p.collapsed && typeof p.collapsed === 'object') for (const k of Object.keys(p.collapsed)) collapsed[k] = !!p.collapsed[k]
    const userItems: Record<string, UserItem[]> = {}
    if (p.userItems && typeof p.userItems === 'object') {
      for (const k of Object.keys(p.userItems)) {
        const arr = p.userItems[k]
        if (Array.isArray(arr)) userItems[k] = arr.filter((x: any) => x && typeof x.text === 'string').map((x: any) => ({ id: String(x.id || newId()), text: String(x.text) }))
      }
    }
    const removedDefaults = Array.isArray(p.removedDefaults) ? p.removedDefaults.filter((x: any) => typeof x === 'string') : []
    const branch = typeof p.branch === 'string' ? p.branch : ''
    return { branch, checked, removedDefaults, userItems, collapsed }
  } catch { return emptyState() }
}

const defaultItemId = (catId: string, idx: number) => `d:${catId}:${idx}`

interface MergedItem { id: string; text: string; user: boolean }
function catItems(cat: Cat, state: Persisted): MergedItem[] {
  const out: MergedItem[] = []
  cat.items.forEach((text, idx) => {
    const id = defaultItemId(cat.id, idx)
    if (state.removedDefaults.includes(id)) return
    out.push({ id, text, user: false })
  })
  ;(state.userItems[cat.id] || []).forEach((u) => out.push({ id: u.id, text: u.text, user: true }))
  return out
}

const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 조합수 포맷(한국어 큰 단위)
function fmtBig(n: number): string {
  if (!isFinite(n)) return '∞'
  const units: [number, string][] = [[1e16, '경'], [1e12, '조'], [1e8, '억'], [1e4, '만']]
  for (const [v, u] of units) {
    if (n >= v) {
      const q = n / v
      return (q >= 100 ? Math.round(q).toLocaleString() : q.toFixed(q >= 10 ? 1 : 2)) + u
    }
  }
  return Math.round(n).toLocaleString()
}

export default function LitrpgTropes({ payload }: { payload?: Record<string, unknown> }) {
  const [state, setState] = useState<Persisted>(() => loadState())
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  // 발생기 상태
  const [twist, setTwist] = useState<Twist>(() => rollAll())
  const [locks, setLocks] = useState<Record<keyof Twist, boolean>>({ who: false, stage: false, trope: false, twist: false, cost: false, ally: false, stinger: false })
  const [genOpen, setGenOpen] = useState(true)

  const mounted = useRef(true)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; if (toastTimer.current) clearTimeout(toastTimer.current) }
  }, [])

  // payload.genre / payload.branch 로 분기 힌트 — 첫 진입에 분기 미선택이면 매핑.
  useEffect(() => {
    if (!payload || state.branch) return
    const b = (payload.branch ?? payload.subgenre ?? payload.genre) as string | undefined
    if (typeof b !== 'string') return
    const s = b.toLowerCase()
    let hit = ''
    if (/vr|다이브|가상현실|로열로드/.test(s)) hit = 'vr'
    else if (/death|데스게임|갇힘|sao/.test(s)) hit = 'death'
    else if (/이세계|전이|isekai|솔로|혼자/.test(s)) hit = 'isekai'
    else if (/침공|아포칼립스|헌터|게이트|전독시|apoc/.test(s)) hit = 'apoc'
    if (hit) setState((p) => ({ ...p, branch: hit }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 진행 상황이 사라질 수 있어요.') }
  }, [state])

  function flash(msg: string) {
    if (!mounted.current) return
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { if (mounted.current) setToast('') }, 2200)
  }

  async function copyText(text: string, okMsg: string) {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      flash(okMsg)
    } catch { flash('복사에 실패했어요. 직접 선택해 복사하세요.') }
  }

  // ── 체크리스트 조작 ──
  const toggle = (id: string) => setState((s) => ({ ...s, checked: { ...s.checked, [id]: !s.checked[id] } }))
  const toggleCollapse = (id: string) => setState((s) => ({ ...s, collapsed: { ...s.collapsed, [id]: !s.collapsed[id] } }))
  const addUserItem = (catId: string) => {
    const text = (drafts[catId] || '').trim()
    if (!text) return
    setState((s) => ({ ...s, userItems: { ...s.userItems, [catId]: [...(s.userItems[catId] || []), { id: newId(), text }] } }))
    setDrafts((d) => ({ ...d, [catId]: '' }))
  }
  const removeItem = (catId: string, itemId: string, isUser: boolean) => {
    setState((s) => {
      const checked = { ...s.checked }; delete checked[itemId]
      if (isUser) return { ...s, checked, userItems: { ...s.userItems, [catId]: (s.userItems[catId] || []).filter((u) => u.id !== itemId) } }
      return { ...s, checked, removedDefaults: [...s.removedDefaults, itemId] }
    })
  }
  const saveEdit = () => {
    if (!editing) return
    const text = editing.text.trim(); const target = editing
    setEditing(null)
    if (!text) return
    setState((s) => {
      for (const catId of Object.keys(s.userItems)) {
        const arr = s.userItems[catId] || []
        if (arr.some((u) => u.id === target.id)) return { ...s, userItems: { ...s.userItems, [catId]: arr.map((u) => (u.id === target.id ? { ...u, text } : u)) } }
      }
      const m = /^d:([^:]+):/.exec(target.id)
      if (m) {
        const catId = m[1]; const repl: UserItem = { id: newId(), text }
        const wasChecked = !!s.checked[target.id]; const checked = { ...s.checked }; delete checked[target.id]
        if (wasChecked) checked[repl.id] = true
        return { ...s, checked, removedDefaults: s.removedDefaults.includes(target.id) ? s.removedDefaults : [...s.removedDefaults, target.id], userItems: { ...s.userItems, [catId]: [...(s.userItems[catId] || []), repl] } }
      }
      return s
    })
  }
  const moveUserItem = (catId: string, itemId: string, dir: -1 | 1) => {
    setState((s) => {
      const arr = (s.userItems[catId] || []).slice()
      const i = arr.findIndex((u) => u.id === itemId); if (i < 0) return s
      const j = i + dir; if (j < 0 || j >= arr.length) return s
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp
      return { ...s, userItems: { ...s.userItems, [catId]: arr } }
    })
  }
  const resetCat = (catId: string) => {
    setState((s) => {
      const checked = { ...s.checked }
      const cat = CATS.find((x) => x.id === catId)
      if (cat) cat.items.forEach((_, idx) => { delete checked[defaultItemId(catId, idx)] })
      ;(s.userItems[catId] || []).forEach((u) => { delete checked[u.id] })
      return { ...s, checked }
    })
  }
  const resetAll = () => setState((s) => ({ ...s, checked: {} }))
  const pickBranch = (id: string) => setState((s) => ({ ...s, branch: s.branch === id ? '' : id }))

  // ── 진행률 ──
  const perCat = CATS.map((c) => {
    const items = catItems(c, state)
    const done = items.filter((it) => state.checked[it.id]).length
    return { cat: c, items, total: items.length, done }
  })
  const totalItems = perCat.reduce((a, p) => a + p.total, 0)
  const totalDone = perCat.reduce((a, p) => a + p.done, 0)
  const totalPct = totalItems ? Math.round((totalDone / totalItems) * 100) : 0
  const activeBranch = BRANCHES.find((b) => b.id === state.branch) || null

  // ── 발생기 ──
  function rollAll(): Twist {
    const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]
    const by = (id: keyof Twist) => pick(SLOTS.find((s) => s.id === id)!.pool)
    return { who: by('who'), stage: by('stage'), trope: by('trope'), twist: by('twist'), cost: by('cost'), ally: by('ally'), stinger: by('stinger') }
  }
  const reroll = () => {
    const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]
    setTwist((cur) => {
      const next = { ...cur }
      for (const s of SLOTS) if (!locks[s.id]) (next[s.id] as string) = pick(s.pool)
      return next
    })
  }
  const rerollSlot = (id: keyof Twist) => {
    const slot = SLOTS.find((s) => s.id === id)!
    setTwist((cur) => ({ ...cur, [id]: slot.pool[Math.floor(Math.random() * slot.pool.length)] }))
  }
  const toggleLock = (id: keyof Twist) => setLocks((l) => ({ ...l, [id]: !l[id] }))
  const combos = SLOTS.reduce((a, s) => a * s.pool.length, 1) // 30*18*30*30*24*18*24 = 5,038,848,000
  const lockedCombos = SLOTS.reduce((a, s) => a * (locks[s.id] ? 1 : s.pool.length), 1)

  const twistLine = (t: Twist) =>
    `${josaGa(t.who)} ${josaEul(t.stage)} 무대로, "${t.trope}"${hasFinalConsonant(t.trope) ? '이라는' : '라는'} 클리셰를 따르지만 — ${t.twist}. 대가: ${t.cost}. 곁에는 ${josaGa(t.ally)} 있다. 다음 떡밥: ${t.stinger}.`

  const twistToLibrary = () => {
    addToLibrary('snippets', { text: twistLine(twist), source: 'LitRPG 트로프 체크 · 클리셰 비틀기', tags: ['게임판타지·LitRPG', '클리셰', '비틀기'] })
    flash('글감으로 저장했어요 (스니펫)')
  }
  const twistToProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const body =
      `<p><strong>주인공</strong> ${escHtml(twist.who)}</p>` +
      `<p><strong>무대</strong> ${escHtml(twist.stage)}</p>` +
      `<p><strong>클리셰</strong> ${escHtml(twist.trope)}</p>` +
      `<p><strong>비틀기</strong> ${escHtml(twist.twist)}</p>` +
      `<p><strong>대가</strong> ${escHtml(twist.cost)}</p>` +
      `<p><strong>곁의 존재</strong> ${escHtml(twist.ally)}</p>` +
      `<p><strong>떡밥(스팅어)</strong> ${escHtml(twist.stinger)}</p>` +
      `<hr/><p>${escHtml(twistLine(twist))}</p>`
    const id = addToProject({ kind: 'text', root: 'research', folder: '기획', title: `클리셰 비틀기 — ${twist.trope}`, bodyHtml: body, meta: { 장르: '게임판타지·LitRPG', 클리셰: twist.trope, 비틀기: twist.twist } })
    flash(id ? "프로젝트 '기획' 폴더에 비틀기 아이디어를 추가했어요." : '프로젝트에 추가하지 못했어요.')
  }

  // ── 전체 체크리스트 → 프로젝트/복사 ──
  const toBodyHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><strong>장르: 게임판타지·LitRPG</strong></p>`)
    if (activeBranch) {
      parts.push(`<h3>${escHtml(activeBranch.icon + ' 분기: ' + activeBranch.name)}</h3>`)
      parts.push(`<p>${escHtml(activeBranch.desc)}</p>`)
      parts.push(`<p><strong>이 분기에서 챙길 것</strong></p>`)
      activeBranch.must.forEach((m) => parts.push(`<p>✔ ${escHtml(m)}</p>`))
      parts.push(`<p><strong>피할 것</strong></p>`)
      activeBranch.avoid.forEach((m) => parts.push(`<p>✘ ${escHtml(m)}</p>`))
    }
    parts.push(`<p><strong>진행률: ${totalDone}/${totalItems} (${totalPct}%)</strong></p>`)
    perCat.forEach((p) => {
      parts.push(`<h3>${escHtml(p.cat.icon + ' ' + p.cat.name)} [${p.done}/${p.total}]</h3>`)
      if (!p.items.length) parts.push('<p>(항목 없음)</p>')
      else p.items.forEach((it) => parts.push(`<p>${state.checked[it.id] ? '☑' : '☐'} ${escHtml(it.text)}</p>`))
    })
    return parts.join('')
  }
  const toProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '기획',
      title: `LitRPG 트로프 체크 (${totalDone}/${totalItems})`,
      bodyHtml: toBodyHtml(),
      meta: {
        장르: '게임판타지·LitRPG',
        분기: activeBranch ? activeBranch.name : '(미선택)',
        진행률: `${totalDone}/${totalItems} (${totalPct}%)`,
        ...Object.fromEntries(perCat.map((p) => [p.cat.name, `${p.done}/${p.total}`])),
      },
    })
    flash(id ? `프로젝트 '기획' 폴더에 체크리스트를 추가했어요 (${totalDone}/${totalItems})` : '프로젝트에 연결되지 않았습니다')
  }
  const exportText = () => {
    const lines: string[] = ['# 게임판타지·LitRPG 트로프 체크', '']
    if (activeBranch) {
      lines.push(`## ${activeBranch.icon} 분기: ${activeBranch.name}`, activeBranch.desc, '')
      lines.push('[챙길 것]'); activeBranch.must.forEach((m) => lines.push(`- ✔ ${m}`))
      lines.push('[피할 것]'); activeBranch.avoid.forEach((m) => lines.push(`- ✘ ${m}`)); lines.push('')
    }
    lines.push(`진행률: ${totalDone}/${totalItems} (${totalPct}%)`, '')
    perCat.forEach((p) => {
      lines.push(`## ${p.cat.icon} ${p.cat.name}  [${p.done}/${p.total}]`)
      p.items.forEach((it) => lines.push(`- [${state.checked[it.id] ? 'x' : ' '}] ${it.text}`))
      lines.push('')
    })
    copyText(lines.join('\n').trim(), `체크리스트를 복사했어요 (${totalDone}/${totalItems})`)
  }

  // 검색 필터(사전류 검색)
  const q = search.trim().toLowerCase()

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', fontSize: 14 }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }
  const headTitle: React.CSSProperties = { fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }
  const bar = (h = 8): React.CSSProperties => ({ height: h, borderRadius: 99, background: 'var(--chrome-2)', border: '1px solid var(--border)', overflow: 'hidden', flex: 1, minWidth: 0 })
  const fill = (pct: number): React.CSSProperties => ({ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--ok)' : 'var(--accent)', transition: 'width .25s ease' })
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }
  const catHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', userSelect: 'none', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }
  const itemRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 12px' }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 13.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const tinyBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '3px 6px', borderRadius: 6, flexShrink: 0 }
  const chip = (active: boolean): React.CSSProperties => ({ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left', padding: '8px 10px', borderRadius: 10, border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'var(--accent)' : 'var(--paper)', color: active ? '#fff' : 'var(--text)', cursor: 'pointer', flex: '1 1 46%', minWidth: 0 })
  const slotBox: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 9px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--paper)' }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={headTitle}><Emoji e="🎮"/> LitRPG 트로프 체크</span>
        <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>게임판타지·LitRPG</span>
        <span style={{ flex: 1 }} />
        {toast && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{toast}</span>}
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge() || totalItems === 0} title={hasProjectBridge() ? "현재 점검 상태를 프로젝트 '기획' 폴더 문서로 추가" : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="minibtn" onClick={exportText} disabled={totalItems === 0} title="체크리스트를 텍스트로 복사"><Emoji e="📋"/> 내보내기</button>
        <button className="minibtn" onClick={resetAll} disabled={totalDone === 0} title="모든 체크 해제">↺ 전체 해제</button>
      </div>

      {/* 전체 진행률 */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>전체</span>
        <div style={bar()}><div style={fill(totalPct)} /></div>
        <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, color: totalPct >= 100 ? 'var(--ok)' : 'var(--text)' }}>{totalDone}/{totalItems} · {totalPct}%</span>
      </div>

      {/* 검색 */}
      <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <input style={input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="항목 검색(예: 회귀, 강화, 인플레, 안내자…)" aria-label="항목 검색" />
      </div>

      {note && <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--warn)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {/* 첫 선택지: 분기 */}
        <div style={card}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
            <span><Emoji e="🧭"/> 분기 선택</span>
            <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 400 }}>먼저 고르면 관습·금기가 갈립니다</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 12 }}>
            {BRANCHES.map((b) => (
              <div key={b.id} role="button" tabIndex={0} style={chip(state.branch === b.id)} onClick={() => pickBranch(b.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickBranch(b.id) } }} title={b.desc}>
                <span style={{ fontWeight: 700, fontSize: 13.5 }}><Emoji e={b.icon}/> {b.name}</span>
                <span style={{ fontSize: 11.5, opacity: 0.9, lineHeight: 1.4 }}>{b.desc}</span>
              </div>
            ))}
          </div>
          {activeBranch && (
            <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px 11px' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ok)', marginBottom: 4 }}>✔ 이 분기에서 챙길 것</div>
                {activeBranch.must.map((m, i) => <div key={i} style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text)' }}>· {m}</div>)}
              </div>
              <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px 11px' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--warn)', marginBottom: 4 }}>✘ 이 분기에서 피할 것</div>
                {activeBranch.avoid.map((m, i) => <div key={i} style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text)' }}>· {m}</div>)}
              </div>
            </div>
          )}
        </div>

        {/* 클리셰 비틀기 발생기 */}
        <div style={card}>
          <div style={{ ...catHead, cursor: 'pointer' }} onClick={() => setGenOpen((v) => !v)}>
            <span style={{ fontSize: 11, color: 'var(--muted)', width: 12, flexShrink: 0 }}>{genOpen ? '▾' : '▸'}</span>
            <span style={{ fontSize: 16 }}><Emoji e="🎲"/></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>클리셰 비틀기 발생기</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>슬롯 무작위·잠금·재생성 · 조합수 {fmtBig(combos)}가지</div>
            </div>
            <button style={tinyBtn} title="잠기지 않은 슬롯 재생성" onClick={(e) => { e.stopPropagation(); reroll() }}><Emoji e="🎲"/> 굴리기</button>
          </div>
          {genOpen && (
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SLOTS.map((s) => (
                <div key={s.id} style={slotBox}>
                  <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}><Emoji e={s.icon}/></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', marginBottom: 1 }}>{s.label} · {s.pool.length}종</div>
                    <div style={{ fontSize: 13, lineHeight: 1.45, wordBreak: 'break-word' }}>{twist[s.id]}</div>
                  </div>
                  <button style={{ ...tinyBtn, color: locks[s.id] ? 'var(--accent)' : 'var(--muted)', borderColor: locks[s.id] ? 'var(--accent)' : 'var(--border)' }} title={locks[s.id] ? '잠금 해제' : '이 슬롯 고정'} onClick={() => toggleLock(s.id)}>{locks[s.id] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
                  <button style={tinyBtn} title="이 슬롯만 다시" onClick={() => rerollSlot(s.id)}><Emoji e="🎲"/></button>
                </div>
              ))}
              <div style={{ background: 'var(--paper)', border: '1px dashed var(--border)', borderRadius: 9, padding: '9px 11px', fontSize: 12.5, lineHeight: 1.6 }}>{twistLine(twist)}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>현재 잠금 조합: {fmtBig(lockedCombos)}가지</span>
                <span style={{ flex: 1 }} />
                <button className="minibtn" onClick={() => copyText(twistLine(twist), '비틀기 한 줄을 복사했어요')}><Emoji e="📋"/> 복사</button>
                <button className="minibtn" onClick={twistToLibrary}><Emoji e="💡"/> 글감 저장</button>
                <button className="linkbtn" onClick={twistToProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? "이 비틀기를 프로젝트 '기획' 폴더에 추가" : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
              </div>
            </div>
          )}
        </div>

        {/* 카테고리 체크리스트 */}
        {perCat.map(({ cat, items, total, done }) => {
          const filtered = q ? items.filter((it) => it.text.toLowerCase().includes(q)) : items
          if (q && filtered.length === 0) return null
          const pct = total ? Math.round((done / total) * 100) : 0
          const open = q ? true : !state.collapsed[cat.id]
          const draft = drafts[cat.id] || ''
          return (
            <div key={cat.id} style={card}>
              <div style={catHead} onClick={() => !q && toggleCollapse(cat.id)}>
                <span style={{ fontSize: 11, color: 'var(--muted)', width: 12, flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
                <span style={{ fontSize: 16, flexShrink: 0 }}><Emoji e={cat.icon}/></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{cat.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.desc}</div>
                </div>
                <div style={{ width: 80, flexShrink: 0 }}><div style={bar(6)}><div style={fill(pct)} /></div></div>
                <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, width: 56, textAlign: 'right', color: pct >= 100 && total > 0 ? 'var(--ok)' : 'var(--muted)' }}>{done}/{total}</span>
                <button style={tinyBtn} title="이 분류 체크 해제" disabled={done === 0} onClick={(e) => { e.stopPropagation(); resetCat(cat.id) }}>↺</button>
              </div>

              {open && (
                <div>
                  {filtered.length === 0 ? (
                    <div style={{ padding: '14px 12px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>이 분류에 항목이 없어요. 아래에서 점검 항목을 추가하세요.</div>
                  ) : (
                    filtered.map((it) => {
                      const isEditing = editing && editing.id === it.id
                      const checked = !!state.checked[it.id]
                      const userArr = state.userItems[cat.id] || []
                      const uIdx = it.user ? userArr.findIndex((u) => u.id === it.id) : -1
                      return (
                        <div key={it.id} style={{ ...itemRow, borderTop: '1px solid var(--border)' }}>
                          {isEditing ? (
                            <>
                              <input style={{ ...input, flex: 1 }} value={editing!.text} autoFocus onChange={(e) => setEditing({ id: it.id, text: e.target.value })}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit() } if (e.key === 'Escape') { e.preventDefault(); setEditing(null) } }} aria-label="항목 수정" />
                              <button style={tinyBtn} title="저장" onClick={saveEdit}>저장</button>
                              <button style={tinyBtn} title="취소" onClick={() => setEditing(null)}>취소</button>
                            </>
                          ) : (
                            <>
                              <input type="checkbox" checked={checked} onChange={() => toggle(it.id)} style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, cursor: 'pointer', accentColor: 'var(--accent)' }} aria-label={it.text} />
                              <span onClick={() => toggle(it.id)} style={{ flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.5, cursor: 'pointer', wordBreak: 'break-word', color: checked ? 'var(--muted)' : 'var(--text)', textDecoration: checked ? 'line-through' : 'none' }}>
                                {it.text}
                                {it.user && <span style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 5, padding: '0 4px', verticalAlign: 'middle' }}>내 항목</span>}
                              </span>
                              <button style={tinyBtn} title="이 항목 복사" onClick={() => copyText(it.text, '항목을 복사했어요')}>⧉</button>
                              {it.user && (
                                <>
                                  <button style={tinyBtn} title="위로" disabled={uIdx <= 0} onClick={() => moveUserItem(cat.id, it.id, -1)}>↑</button>
                                  <button style={tinyBtn} title="아래로" disabled={uIdx < 0 || uIdx >= userArr.length - 1} onClick={() => moveUserItem(cat.id, it.id, 1)}>↓</button>
                                </>
                              )}
                              <button style={tinyBtn} title="수정" onClick={() => setEditing({ id: it.id, text: it.text })}>✎</button>
                              <button style={{ ...tinyBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeItem(cat.id, it.id, it.user)}>✕</button>
                            </>
                          )}
                        </div>
                      )
                    })
                  )}

                  {!q && (
                    <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
                      <input style={{ ...input, flex: 1 }} value={draft} onChange={(e) => setDrafts((d) => ({ ...d, [cat.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUserItem(cat.id) } }} placeholder={`${cat.name}에 점검 항목 추가…`} maxLength={200} aria-label={`${cat.name} 항목 추가`} />
                      <button className="minibtn" onClick={() => addUserItem(cat.id)} disabled={!draft.trim()}>＋ 추가</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* 연계 도구 */}
        <div className="linkbar" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
          <button className="linkbtn" onClick={() => openToolLinked('conflict-builder', payload)} title="갈등 설계기 열기"><Emoji e="⚔️"/> 갈등 설계기</button>
          <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', payload)} title="플롯 피라미드 열기"><Emoji e="🎢"/> 플롯 피라미드</button>
          <button className="linkbtn" onClick={() => openToolLinked('character-forge', payload)} title="인물 생성 열기"><Emoji e="🧑‍🎤"/> 인물 생성</button>
          <button className="linkbtn" onClick={() => openToolLinked('world-wiki', payload)} title="세계관 위키 열기"><Emoji e="📖"/> 세계관 위키</button>
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6, paddingBottom: 4 }}>
          먼저 분기를 고르면 관습·금기가 정렬됩니다. 항목을 눌러 체크하고, 머리글로 펼치거나 접으세요. 기본 항목도 수정·삭제할 수 있고 ⧉로 복사됩니다. 발생기는 슬롯을 🔒로 고정하고 🎲로 재생성하세요. 모든 진행 상황은 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
