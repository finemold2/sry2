// 게임판타지·LitRPG 어휘·표현 사전 — 상태창·시스템 메시지·스탯·스킬·등급·퀘스트·길드·헌터물 어휘와
//  이 장르 특유의 관용표현·말투·상투구·시스템 안내문을 카테고리로 모은 로컬 사전.
//  사전류: 카테고리 펼침/접기 + 검색 + 무작위 + 클릭복사 + 스니펫 저장.
//  생성기 탭: '시스템 메시지 조합기' — 트리거(발동 조건) × 알림 머리 × 대상·획득 × 수치·등급 × 효과·여파 × 안내·맺음 6슬롯을 굴려
//  [ ] 시스템 팝업 한 줄을 대량 생성한다(슬롯 잠금/재생성, 조합 수 1조 이상 표시).
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(즐겨찾기·탭·보관함)만 사용. 외부 API 불필요.
//  도시에 근거: 달빛조각사·SAO·나혼렙·전독시·DCC·HWFWM 등 VR다이브/데스게임/이세계전이+시스템/현실침공 4분기의
//  상태창·시스템·레벨업·스킬트리·퀘스트·등급·칭호·인벤토리·RNG·회귀+게임지식 관습을 항목 데이터에 구체적으로 반영(일반론 배제).
// 연계(linkbus): 항목·시스템 메시지를 스니펫 라이브러리에 저장하고, 프로젝트 자료 〈LitRPG 어휘〉 폴더 문서로 추가한다.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'litrpg-lexicon',
  name: 'LitRPG 어휘·표현 사전',
  icon: '🎮',
  group: '어휘·표현',
  genre: '게임판타지·LitRPG',
  intro: '상태창·시스템 메시지·스탯·스킬·등급·퀘스트·헌터물 용어와 말투·상투구를 찾고, [시스템] 팝업을 슬롯 조합으로 굴리세요',
  w: 620,
  h: 700,
}

const LS = 'sry:tool:litrpg-lexicon'

// ── 사전 항목 ────────────────────────────────────────────
interface Term { name: string; gloss: string; note?: string }
interface Cat { key: string; label: string; icon: string; desc: string; items: Term[] }

// 도시에 근거 게임판타지·LitRPG 전용 어휘. 카테고리별 구체·특화 데이터(일반론 금지).
const CATS: Cat[] = [
  {
    key: 'system', label: '시스템·상태창', icon: '🖥️', desc: '상태창·시스템 메시지·진행을 굴리는 핵심 장치',
    items: [
      { name: '상태창(Status Window)', gloss: 'HP/MP/레벨/스탯/경험치를 텍스트 박스로 본문에 띄우는 장르의 얼굴. 서술을 멈추고 [ ]·< >로 팝업을 띄워 호흡을 끊는 연출 자체가 멋이다.', note: '"상태창 열기" 또는 의지로 호출.' },
      { name: '시스템 메시지(System Message)', gloss: '[띠링!] 하고 떠오르는 안내 팝업. 보상·경고·해금을 통보하며, 서사의 박자를 환기하는 리듬 장치.', note: '대개 푸른빛 반투명 창으로 묘사.' },
      { name: '튜토리얼(Tutorial)', gloss: '규칙을 가르치는 도입 구간. 독자 온보딩과 겹치며, 시스템이 안내자 AI로 의인화되어 말을 건다.' },
      { name: '시스템(의인화)', gloss: '관리자·도깨비·\'성좌\'·\'시스템\'처럼 인격을 띤 규칙의 화자. 세계관 비밀을 흘리는 후반부 떡밥의 핵심.', note: '전독시의 도깨비, 솔로레벨링의 \'시스템\'.' },
      { name: '메인 화면·로비', gloss: '접속 시 처음 뜨는 캐릭터 선택·길드·우편함 허브(VR 다이브형). 로그아웃과 현실을 잇는 경계면.' },
      { name: '경험치 바(EXP Bar)', gloss: '다음 레벨까지의 진행도. 99% → 100% 직전의 긴장과 \'레벨 업!\' 팝업의 카타르시스가 보상 연출의 기본기.' },
      { name: '딜미터·전투 로그', gloss: '"데미지 1,234! 치명타!" 식 수치 출력. 누적 피해·DPS로 기여도를 객관화해 박진감을 만든다.' },
      { name: '쿨다운(Cooldown)', gloss: '강력기를 다시 못 쓰는 재사용 대기 시간. "쿨이 길다"는 제약이 전투를 자원 관리·머리싸움으로 바꾼다.' },
      { name: '상태이상(Status Effect)', gloss: '중독·기절·출혈·화상·빙결·침묵 등 지속시간 있는 디버프. 전투의 변수이자 빌드 카운터의 축.' },
      { name: '버프/디버프', gloss: '능력치를 올리거나(버프) 깎는(디버프) 효과. 지속시간·중첩·해제 조건이 전술 변수.' },
      { name: '리스폰·페널티(Respawn)', gloss: '죽으면 부활하되 경험치·아이템·시간을 잃는다. 데스게임형은 영구사망 — 부활 규칙이 곧 장르 톤이다.' },
      { name: '세이브 포인트·귀환석', gloss: '저장·복귀 지점. 안전지대(세이프존)에서만 로그아웃·휴식이 가능하다는 규칙이 긴장을 조율.', note: '데스게임형은 "안전지대 묘사 금지"가 함정.' },
      { name: '시스템 상점(System Shop)', gloss: '코인·포인트로 스킬·아이템을 사는 창. 전독시의 \'코인\' 경제처럼 성과를 재화로 환산하는 장치.' },
      { name: '업적·도전과제(Achievement)', gloss: '"최초로 ○○ 달성" 식 기록. 칭호·보너스의 해금 조건이자 \'특별함\'의 증표.' },
      { name: '시스템 버그·치트키·관리자 권한', gloss: '규칙의 빈틈·예외. 남용하면 "사기는 규칙 안에서의 사기여야 한다"는 독자 약속이 깨진다.', note: '공정성 훼손은 최대 함정.' },
      { name: '회귀+게임지식', gloss: '이미 결과를 아는 자가 공략·미래를 무기로 삼는 한국형 변주. \'언제 어떻게 써먹나\'의 기대감이 사이다 엔진.', note: '전독시는 "원작을 다 읽은 독자"로 변형.' },
    ],
  },
  {
    key: 'stat', label: '스탯·성장', icon: '📊', desc: '레벨·스탯·경험치 등 수치 성장의 어휘',
    items: [
      { name: '레벨(Level)·레벨업', gloss: '강함을 한눈에 보여주는 정수 지표. 레벨업 시 \'스탯 포인트\'를 얻어 빌드를 결정한다. 성장의 가시화 그 자체.' },
      { name: '스탯(Stat)', gloss: '힘(STR)·민첩(AGI)·체력(VIT/CON)·지능(INT)·정신력(WIS)·행운(LUK) 등 능력 수치. 어디에 투자하느냐가 곧 캐릭터성.' },
      { name: '경험치(EXP)', gloss: '몬스터·퀘스트로 얻어 레벨을 올리는 자원. \'경험치 효율\'·\'경험치 셔틀\'이 노가다 서사의 용어.' },
      { name: '스탯 분배(Build)', gloss: '잉여 포인트를 어디에 찍을지의 선택. "근접 깡스탯 vs 마법 vs 민첩 잠입" — 최적해를 찾는 머리싸움의 쾌감.' },
      { name: '깡스탯·올인 빌드', gloss: '한 능력치에 몰빵한 극단적 특화. 약점은 크지만 한 분야 화력은 압도적. 먼치킨 빌드의 단골.' },
      { name: '히든 스탯(Hidden Stat)', gloss: '명성·카르마·신앙심·광기처럼 숨겨진 수치. 특정 조건에서만 열려 히든 클래스·이벤트를 해금한다.' },
      { name: '스탯 캡·소프트캡', gloss: '능력치 상한·체감 효율이 꺾이는 지점. 후반 수치 인플레를 막는 규칙 장치.' },
      { name: '능력치 보정(Buff Stack)', gloss: '장비·칭호·버프로 더해지는 추가 수치. "기본 100 + 장비 50 + 칭호 20" 식 합산이 강함을 정량화.' },
      { name: '성장형(Growth-type)', gloss: '쓸수록·키울수록 강해지는 캐릭터·아이템·스킬. 미천하게 시작해 끝없이 자라는 한국형 노가다 로망.', note: '달빛조각사의 \'노가다\' 성장.' },
      { name: '잠재력(Potential)·각성치', gloss: '타고난 성장 한계·재능. "백 년에 한 번 나올 잠재력"이 주인공 특별화의 떡밥.' },
      { name: '환산 스탯·전투력(CP)', gloss: '모든 능력을 하나의 숫자로 합친 종합 지표. \'전투력 측정기\'가 격차를 한 줄로 못박는다(경악 유발).' },
      { name: '레벨 캡·전직 레벨', gloss: '다음 단계로 못 넘어가는 한계 레벨. 깨려면 전직·환생·차원 돌파 같은 \'단위 리셋\'이 필요하다.' },
      { name: '경험치 페널티(데스 페널티)', gloss: '사망 시 경험치·레벨이 깎이는 벌칙. 위험 지역 진입의 무게를 결정.' },
      { name: '폭렙(급성장)', gloss: '히든 던전·기연·시스템 보정으로 단기에 레벨이 치솟는 것. 사이다의 핵심 리듬.' },
    ],
  },
  {
    key: 'skill', label: '스킬·클래스', icon: '🌀', desc: '스킬 트리·직업·전직 등 능력 체계',
    items: [
      { name: '스킬(Skill)', gloss: '액티브(발동)·패시브(상시) 능력. 습득 조건·등급·레벨이 있고, 숙련도가 오르면 위력이 강해진다.' },
      { name: '스킬 트리(Skill Tree)', gloss: '선행 스킬을 찍어야 다음이 열리는 분기 구조. 어떤 가지를 탈지가 빌드 정체성을 만든다.' },
      { name: '스킬 시너지·콤보', gloss: '두 스킬을 잇거나 겹쳐 위력을 폭증시키는 연계. "최적 콤보 발굴"이 전략 묘미의 핵심.' },
      { name: '스킬 진화·각성·상위 스킬', gloss: '숙련 만렙·조건 충족 시 스킬이 한 단계 위로 변모. \'하급 화염구 → 지옥불\' 식 질적 도약.' },
      { name: '패시브(Passive)', gloss: '항상 적용되는 상시 효과. 자동 회복·확률 발동·스탯 보정 등 빌드의 토대를 깐다.' },
      { name: '액티브(Active)·궁극기(Ultimate)', gloss: '발동형 기술. 최강의 한 방인 궁극기는 쿨·자원 소모가 크고, 역전 클라이맥스의 단골.' },
      { name: '클래스·직업(Class)', gloss: '전사·마법사·도적·궁수·성직자·소환사 등 역할. 무기·스탯·스킬 풀이 달라 서사 톤을 가른다.' },
      { name: '전직(Job Change)', gloss: '상위 직업으로 갈아타는 통과의례. \'전직 퀘스트\'가 작은 아크 단위가 된다.' },
      { name: '히든 클래스·유니크 직업', gloss: '주인공만 가진 단 하나의 직업(네크로맨서·그림자군주·전설의 ○○). 특별함의 단골이자 사이다 출처.', note: '나혼렙의 그림자군단이 대표.' },
      { name: '스킬북·스킬 습득', gloss: '책·각인·전수로 스킬을 얻음. \'사용 시 사라지는 스킬북\'의 희소성이 선택의 무게를 만든다.' },
      { name: '숙련도(Proficiency)', gloss: '스킬·무기 사용으로 쌓이는 익숙함. 만렙이 되면 진화·마스터리 보너스가 열린다.' },
      { name: '특성·특전(Trait/Perk)', gloss: '캐릭터에 붙는 영구 보정·고유 성질. 종족 특성·각성 특전 등이 빌드를 차별화한다.' },
      { name: '소환·펫·종속(Summon)', gloss: '몬스터·영혼·군단을 부리는 능력. 그림자군단·정령처럼 \'세력 단위 화력\'으로 스케일을 키운다.' },
      { name: '고유 능력(Unique Skill)', gloss: '복제 불가의 단 하나뿐인 권능. 수치 인플레를 질적 보상으로 보완하는 후반 장치.' },
      { name: '저항·무효(Resistance/Immunity)', gloss: '특정 속성·상태이상을 견디거나 무시하는 능력. 만독불침의 게임판 — 카운터의 카운터.' },
    ],
  },
  {
    key: 'rarity', label: '등급·아이템', icon: '💎', desc: '레어리티 체계와 인벤토리·강화 어휘',
    items: [
      { name: '등급(Rarity)', gloss: '커먼→언커먼→레어→에픽→유니크→레전더리→미스릭(신화) 식 색상·위계. 아이템·스킬·몬스터·던전 전반의 공통 측정자.', note: '작품마다 명칭·색이 다름.' },
      { name: '유니크/레전더리', gloss: '세상에 하나뿐(유니크)이거나 전설급(레전더리) 등급. 획득 자체가 사건이 되는 욕망의 정점.' },
      { name: '아이템(Item)·드랍', gloss: '장비·소비·재료의 총칭. 보스 처치 후 드랍을 \'개봉(unboxing)\'하는 루팅의 쾌감이 보상 루프의 핵심.' },
      { name: '인벤토리(Inventory)', gloss: '무게·슬롯 제한이 있는 소지품 창. \'아공간 인벤토리\'의 용량과 정리가 생존·경제의 변수.' },
      { name: '세트 효과(Set Bonus)', gloss: '같은 세트 아이템을 모으면 추가로 붙는 보너스. "2세트/4세트 효과" 수집 욕구를 자극.' },
      { name: '옵션·랜덤 옵션', gloss: '아이템에 무작위로 붙는 부가 능력치. \'잘 뜬 옵션\'을 노리는 \'옵션 뽑기\'의 도박성이 긴장을 만든다.' },
      { name: '강화(Enhancement)·+수치', gloss: '+1, +2…로 장비를 단단하게 만드는 시스템. \'강화 성공률\'과 실패 시 \'장비 파괴\'가 RNG 긴장 장치.', note: '템빨류의 핵심.' },
      { name: '인챈트·소켓·룬', gloss: '마법 부여(인챈트)·보석 박기(소켓)·룬 각인으로 능력을 덧붙임. 빌드 커스터마이즈의 정밀 작업.' },
      { name: '귀속·거래 불가(Bound)', gloss: '특정 캐릭터에게 묶여 팔 수 없는 아이템. 경제와 \'얻은 자만의 특권\'을 규정.' },
      { name: '소모품(Consumable)', gloss: '포션·스크롤·귀환서·해독제 등 1회용. 자원 관리와 위기 탈출의 변수.' },
      { name: '재료·제작(Crafting)', gloss: '몬스터 부산물·광물로 장비를 만드는 생산. 대장장이·연금술·요리 등 \'생산직\'이 달빛조각사형 경제의 축.' },
      { name: '신물·아티팩트(Artifact)', gloss: '세계관급 사연이 깃든 전설의 물건. 그 자체가 떡밥·분쟁의 씨앗이 된다.' },
      { name: '감정(Appraisal)', gloss: '미확인 아이템의 정체·등급을 밝히는 행위. \'감정 실패\'·\'숨겨진 옵션 개방\'이 반전의 묘미.' },
      { name: '봉인 해제·각성 아이템', gloss: '조건을 채우면 진짜 성능이 열리는 \'성장형 장비\'. 미천한 외형 속의 신물이라는 로망.' },
    ],
  },
  {
    key: 'quest', label: '퀘스트·던전', icon: '🗺️', desc: '퀘스트 체계와 던전·레이드 공략 어휘',
    items: [
      { name: '퀘스트(Quest)', gloss: '메인·서브·연계·반복 임무. 실패 페널티·제한 시간이 긴장을 만들고, 보상이 성장을 추진한다.' },
      { name: '히든 퀘스트(Hidden Quest)', gloss: '조건을 우연·통찰로 충족해야 열리는 숨은 임무. 플롯 분기점이자 유니크 보상의 출처.' },
      { name: '연계 퀘스트(Quest Chain)', gloss: '하나를 깨면 다음이 열리는 사슬 임무. 작은 아크를 엮어 중기 목표를 굴린다.' },
      { name: '메인 시나리오·시나리오', gloss: '거대한 줄기 임무(현실 침공형의 \'시나리오\'). 클리어 보상·실패 시 \'전원 사망\' 같은 판돈이 걸린다.', note: '전독시의 \'시나리오\' 구조.' },
      { name: '던전(Dungeon)', gloss: '몬스터·함정·보스가 배치된 공략 구역. 입장 자격(레벨/아이템)을 두어 파워 게이팅을 건다.' },
      { name: '히든 던전·인스턴스', gloss: '숨겨졌거나 파티 전용으로 격리된 던전. \'최초 발견\'·\'퍼스트 클리어\' 보너스가 특별함을 준다.' },
      { name: '레이드(Raid)', gloss: '대규모 파티가 도전하는 고난도 보스전. "패턴 파악 → 전멸 위기 → 역전 변수"의 3박자 클라이맥스.' },
      { name: '보스·네임드(Boss/Named)', gloss: '이름이 붙은 강적. 고유 패턴·페이즈 전환·\'광폭화(엔레이지)\'로 긴장을 끌어올린다.' },
      { name: '필드·사냥터·스폰', gloss: '몬스터가 리젠(재생성)되는 야외 구역. \'사냥→경험치/드랍→레벨업\'의 코어 루프가 도는 곳.' },
      { name: '게이트·균열(Gate/Rift)', gloss: '현실 침공형에서 던전이 열리는 차원의 문. 등급(E~S/SS)이 위협도를 정하고, 방치 시 \'브레이크\'.', note: '헌터물의 핵심 장치.' },
      { name: '브레이크·몬스터 웨이브', gloss: '게이트를 못 막아 몬스터가 현실로 쏟아지는 재앙. 도시 단위 위기의 발화점.' },
      { name: '파티·공략·트라이', gloss: '함께 도는 모임(파티), 정공법(공략), 반복 도전(트라이). 전멸(와이프) 끝의 클리어가 카타르시스.' },
      { name: '난이도·층(Floor/Tower)', gloss: '쉬움~지옥, 1층~100층 식 단계. 탑등반물은 \'층\'이 곧 성장 게이트이자 목표 위계.' },
      { name: '히든 피스·이스터에그', gloss: '개발자(혹은 시스템)가 숨긴 단서·보물. 회귀·원작지식형 주인공만 아는 선점 포인트.' },
    ],
  },
  {
    key: 'social', label: '랭킹·길드·세력', icon: '🏆', desc: '경쟁·평판·사회 구조의 어휘',
    items: [
      { name: '랭커(Ranker)·순위표', gloss: '서버·세계 순위에 오른 강자. \'랭킹\'은 사회적 인정의 수치화이자 끝없는 도전의 무대.' },
      { name: '길드(Guild)', gloss: '플레이어·헌터들의 결사체. 길드전·길드 의뢰·내부 정치가 사회 서사를 굴린다.' },
      { name: '길드마스터·부길드장', gloss: '길드의 수장과 2인자. 영입·축출·배신이 조직 드라마의 단골.' },
      { name: '명성·악명(Fame/Infamy)', gloss: '평판 수치. 높으면 NPC 호감·할인·히든 퀘스트가 열리고, 악명은 현상금·추적을 부른다.' },
      { name: '칭호(Title)', gloss: '업적으로 얻는 호칭. \'최초 클리어\'·\'학살자\'처럼 버프를 주거나 특정 콘텐츠를 해금한다.' },
      { name: '현상금·PK·카오', gloss: '플레이어를 죽이는 PK와 그에 따른 악명(카오 상태)·현상금. 무법지대 긴장의 핵심.' },
      { name: '경매장·거래소(Auction)', gloss: '아이템을 사고파는 시장. 시세·매점매석·작전이 게임 내 경제 전쟁을 만든다.' },
      { name: '헌터·각성자(Hunter/Awakened)', gloss: '게이트를 공략하는 능력 각성자. 등급(E~S)이 사회적 지위·권력으로 직결되는 현실 침공형 직업.', note: '나혼렙·헌터물의 기둥.' },
      { name: '협회·관리국', gloss: '헌터를 등록·관리하고 게이트를 배분하는 공적 기관. 권력·이권·은폐의 무대.' },
      { name: 'F급·S급(등급 각성자)', gloss: '각성자의 격차. \'세상에서 가장 약한 F급\'이 \'유일한 S급\'으로 거듭나는 역전이 사이다 원형.' },
      { name: '환율·현질·아이템 현금거래(RMT)', gloss: '게임 재화의 현금화. 게임 성과가 현실 부·지위로 이어지는 달빛조각사형 \'직업으로서의 게임\'.' },
      { name: '공대·공략조·정예', gloss: '레이드를 위한 편성 단위. 탱커·딜러·힐러의 \'역할(트라이앵글)\' 분담이 전술의 기본.' },
      { name: '랭킹전·콜로세움·투기장', gloss: 'PvP로 서열을 가리는 무대. 우승 → 주목·보상·정체 폭로의 장치.' },
    ],
  },
  {
    key: 'line', label: '관용 대사·시스템 안내문', icon: '💬', desc: '장르 특유의 시스템 문구와 캐릭터 정형 대사',
    items: [
      { name: '[당신은 레벨 업 하였습니다!]', gloss: '가장 상징적인 보상 통보. 짧고 굵게 한 줄로 떠 카타르시스를 응축한다.' },
      { name: '[히든 클래스 \'○○\'의 조건을 충족하였습니다.]', gloss: '특별함을 여는 결정적 시스템 메시지. 직후 독백·경악이 사이다를 증폭한다.' },
      { name: '[퀘스트가 발생했습니다.]', gloss: '새 임무의 알림. 보상·실패 페널티·제한 시간을 함께 통보해 판돈을 못박는다.' },
      { name: '[경고: 사망 시 부활하지 못합니다.]', gloss: '데스게임형의 톤을 정하는 경고문. 모든 행동에 목숨의 무게를 싣는다.' },
      { name: '"상태창."', gloss: '주인공이 의지로 창을 호출하는 한마디. 가장 짧고 흔한 LitRPG 발화 트리거.' },
      { name: '"이게…… 가능한 수치라고?"', gloss: '주변 인물이 주인공의 비정상 스탯·성장에 경악하는 정형 대사. 먼치킨 사이다의 반응 샷.' },
      { name: '"나는 이 시나리오의 결말을 알고 있다."', gloss: '회귀·원작지식형 주인공의 우위 선언. \'언제 써먹나\'의 기대감을 못박는다.' },
      { name: '[당신은 \'최초로\' ○○을 달성한 유일한 존재입니다.]', gloss: '퍼스트 클리어 보너스 통보. \'유일\'·\'최초\'가 특별함의 핵심 어휘.' },
      { name: '"패턴은 파악했다. 이제부터 반격이다."', gloss: '레이드 클라이맥스의 역전 선언. 전멸 위기 직후의 전환점 대사.' },
      { name: '[조건 충족: 봉인된 힘이 개방됩니다.]', gloss: '한계 돌파(Limit Break)를 정당화하는 시스템 메시지. 죽기 직전의 각성을 규칙으로 뒷받침한다.' },
      { name: '"여긴 게임이지만, 죽음은 진짜다."', gloss: '데스게임형의 주제를 한 줄로 압축한 정형 대사. 긴장의 근원을 환기.' },
      { name: '[당신의 행동을 \'성좌\'들이 주목합니다.]', gloss: '관전자·후원자 시스템의 통보. 메타적 시선과 \'코인\' 경제를 연결(전독시식 변형).' },
      { name: '"로그아웃이…… 안 돼."', gloss: '갇힘/데스게임형의 인사이팅 인시던트 대사. 안전장치가 사라진 공포의 시작.' },
      { name: '[스킬 \'○○\'의 숙련도가 한계에 도달했습니다. 진화하시겠습니까?]', gloss: '질적 도약을 묻는 선택 팝업. \'예/아니오\'가 빌드의 분기를 만든다.' },
      { name: '"고작 이 정도로 나를 막을 수 있을 것 같나?"', gloss: '압도적 격차를 못박는 멸시 대사. 빌런·먼치킨 양쪽이 쓰는 도발 정형구.' },
      { name: '[게이트 \'붕괴(브레이크)\'까지 남은 시간: 00:59:59]', gloss: '카운트다운 통보. 가시적 제한 시간으로 한 에피소드의 긴장을 조인다.' },
    ],
  },
  {
    key: 'place', label: '장소·NPC·기물', icon: '🏰', desc: '게임 세계의 공간·NPC·풍물 어휘',
    items: [
      { name: '시작 마을(Starting Town)', gloss: '튜토리얼을 마치고 출발하는 초보 거점. 첫 사이다·첫 동료·첫 의뢰가 발생하는 무대.' },
      { name: '안전지대(Safe Zone)', gloss: '몬스터가 들어올 수 없는 구역. 휴식·로그아웃·정비의 공간. 데스게임형에선 \'유일한 안식처\'.' },
      { name: 'NPC(논플레이어 캐릭터)', gloss: '시스템이 굴리는 등장인물. \'오버로드\'식으로 NPC가 자아를 가지면 세계가 살아 움직이는 반전이 된다.', note: '오버로드의 NPC 각성.' },
      { name: '퀘스트 NPC·의뢰인', gloss: '임무를 주는 인물. 호감도·선택지에 따라 보상·분기·배신이 달라진다.' },
      { name: '여관·주점·길드 홀', gloss: '정보·파티 모집·시비가 오가는 사교 거점. \'주점에서의 만남\'이 동료 영입의 단골.' },
      { name: '대장간·연금술 공방', gloss: '제작·강화·인챈트가 이뤄지는 생산 시설. 생산직 서사·경제의 중심.' },
      { name: '차원의 탑·무한의 탑(Tower)', gloss: '층마다 시험이 기다리는 등반 콘텐츠. \'탑\'을 오르는 것이 곧 성장과 진실 추적의 여정.' },
      { name: '비경·히든 맵', gloss: '지도에 없는 숨은 구역. 전대의 유산·유니크 보상·세계관 비밀이 잠든 기연의 무대.' },
      { name: '보스룸·결전장', gloss: '네임드·레이드 보스가 기다리는 격리 공간. 진입하면 입구가 봉인되는 \'배수의 진\'이 단골.' },
      { name: '귀환 포탈·텔레포트 게이트', gloss: '거점·던전을 잇는 이동 장치. 사용 비용·쿨다운·\'좌표 지식\'이 전략 변수.' },
      { name: '경매장·상점가', gloss: '아이템 거래의 중심지. 시세·정보·작전이 오가는 \'게임 속 시장 경제\'의 무대.' },
      { name: '현실·바깥(로그아웃 세계)', gloss: 'VR 다이브형의 또 다른 무대. 게임 성과가 현실 지위로 환산되는 이중 구조의 한 축.' },
      { name: '코어·던전 코어(Dungeon Core)', gloss: '던전의 심장. 던전 코어물에선 주인공이 코어가 되어 던전을 설계·육성한다(서구 LitRPG 분파).', note: 'Divine Dungeon 계열.' },
    ],
  },
]

// ── 시스템 메시지 조합기 슬롯 ──────────────────────────────
// 트리거(발동 조건) × 알림 머리 × 대상·획득 × 수치·등급 × 효과·여파 × 안내·맺음 6슬롯.
// 각 슬롯 40~52면 → 조합 수 수천억~수조(1조 이상) 자동 표시.
interface GenSlot { key: string; label: string; icon: string; pre?: boolean; faces: string[] }

const GEN_SLOTS: GenSlot[] = [
  {
    key: 'trigger', label: '발동 상황(서술)', icon: '⚡', pre: true,
    faces: [
      '마지막 일격이 보스의 심장을 꿰뚫는 순간,', '죽음을 각오하고 봉인을 풀어젖히자,',
      '몬스터 웨이브가 안전지대를 덮치기 직전,', '히든 던전의 마지막 문이 열리며,',
      '레벨 99의 경험치 바가 끝까지 차오른 찰나,', '게이트 너머에서 균열이 굉음을 내며 벌어지자,',
      '회귀 전의 기억대로 함정을 피해낸 순간,', '전멸 직전, 단 한 사람만이 일어섰을 때,',
      '미확인 아이템을 감정에 올리는 순간,', '쓰러진 적의 사체에서 빛무리가 피어오르며,',
      '탑의 다음 층으로 발을 들이자마자,', '시스템이 처음으로 \'주인공\'을 인식한 순간,',
      '광폭화에 들어선 네임드가 마지막 패턴을 펼치자,', '숨겨진 조건을 우연히 충족한 그 순간,',
      '한계를 넘어선 진기가 단전을 가르며,', '죽었어야 할 자가 눈을 뜬 바로 그때,',
      '동료의 희생이 마지막 변수를 만들어낸 순간,', '봉인된 던전 코어에 손을 얹자,',
      '서버 최초로 그 위업을 달성한 찰나,', '로그아웃 버튼이 사라진 것을 깨달은 순간,',
      '성좌들이 일제히 시선을 돌린 그때,', '강화 +9의 망치가 모루를 내리치는 순간,',
      '스킬 숙련도가 마침내 한계에 닿자,', '독무가 걷히고 진짜 보스가 드러나는 순간,',
      '현상금이 걸린 PK가 칼을 거두지 않자,', '연계 퀘스트의 마지막 고리가 맞물리며,',
      '코어에 마지막 마력을 불어넣은 찰나,', '랭킹 1위의 자리를 단 한 끗으로 넘어선 순간,',
      '시나리오 실패까지 1초를 남기고,', '미천한 외형의 장비가 진짜 모습을 드러내자,',
      '세이프존 밖에서 부활석이 산산이 부서진 순간,', '관리자 권한의 빈틈을 파고든 그때,',
      '버려진 비경의 제단에 제물을 바치자,', '전직 시험의 마지막 관문을 통과한 순간,',
      '몬스터의 핵(코어)을 으스러뜨린 찰나,', '예언대로 일곱 번째 봉인이 풀리며,',
      '죽음의 카운트다운이 0에 닿기 직전,', '히든 피스를 가장 먼저 손에 넣은 순간,',
      '폭주한 마력이 경맥을 역류하기 시작하자,', '\'유일한 S급\'이라는 판정이 내려진 그때,',
    ],
  },
  {
    key: 'head', label: '알림 머리(시스템)', icon: '🔔',
    faces: [
      '[띠링!]', '[System]', '[알림]', '[축하합니다!]', '[경고]',
      '[조건 충족]', '[퀘스트 완료]', '[퀘스트 발생]', '[레벨 업!]', '[업적 달성]',
      '[히든 클래스]', '[전직 가능]', '[스킬 진화]', '[봉인 해제]', '[최초 달성]',
      '[긴급]', '[던전 클리어]', '[레이드 격파]', '[칭호 획득]', '[각성]',
      '[시나리오]', '[성좌의 메시지]', '[게이트]', '[관리자]', '[루팅]',
      '[감정 결과]', '[강화 결과]', '[스탯 분배]', '[페널티]', '[복귀]',
      '[발견]', '[해금]', '[상태이상]', '[연계 퀘스트]', '[랭킹 갱신]',
      '[히든 던전]', '[보스 처치]', '[한계 돌파]', '[특성 획득]', '[경고: 사망]',
    ],
  },
  {
    key: 'subject', label: '대상·획득', icon: '🎁',
    faces: [
      '히든 클래스 \'그림자 군주\'를', '유니크 스킬 \'시간 역행\'을', '레전더리 등급 무기 \'여명의 파편\'을',
      '칭호 \'최초의 정복자\'를', '전설급 펫 \'잿빛 드레이크\'를', '잠재력 \'천부의 재능\'을',
      '에픽 세트 \'폭군의 갑주\' 4세트 효과를', '히든 스탯 \'광기\'를', '봉인된 고유 능력 \'절대 영역\'을',
      '신화(미스릭) 등급 아티팩트 \'세계수의 씨앗\'을', '스킬북 \'금기의 강령술\'을', '소환 권능 \'백만의 군세\'를',
      '히든 퀘스트 \'멸망의 예언자\'를', '+10에 도달한 \'심연의 검\'을', '랭킹 1위의 자리를',
      '유일 직업 \'시스템 관리자\'를', '각성 등급 \'S급\' 판정을', '연계 퀘스트의 최종 보상을',
      '던전 코어 \'태초의 심장\'을', '전직 직업 \'성기사 → 심판자\'를', '저항 특성 \'만독불침\'을',
      '히든 던전 \'잊혀진 왕의 무덤\'의 첫 발견 권리를', '궁극기 \'세계 붕괴\'를', '명성 +10,000과 \'영웅\' 호칭을',
      '경험치 5배 보너스를', '미확인 옵션이 \'잘 뜬\' 반지를', '귀속 아이템 \'운명의 나침반\'을',
      '회귀 전엔 몰랐던 히든 피스를', '성좌 \'무형의 관찰자\'의 후원을', '차원의 탑 100층 돌파 보상을',
      '랜덤 옵션 \'치명타 확률 +50%\'를', '제작 비급 \'전설 대장장이의 망치질\'을', '스킬 진화 \'화염구 → 지옥불\'을',
      '한계 돌파 \'리미트 브레이크\'의 자격을', '히든 직업 \'네크로맨서\'를', '유니크 패시브 \'불사의 의지\'를',
      '세계 최초 클리어 칭호를', '봉인 해제된 신물 \'여신의 눈물\'을', '각성치 \'각성 한계 돌파\'를',
      '게이트 등급 \'SS급\' 공략 권한을', '폭렙 보너스 \'경험치 폭주\'를',
    ],
  },
  {
    key: 'value', label: '수치·등급', icon: '🔢',
    faces: [
      '획득했습니다.', '레벨이 한 번에 27 상승했습니다.', '모든 스탯이 +50 증가했습니다.',
      '등급이 \'유니크\'로 승격되었습니다.', '전투력이 9,999,999를 돌파했습니다.', '경험치가 320% 누적되었습니다.',
      '숙련도가 \'마스터(MAX)\'에 도달했습니다.', '강화에 성공하여 +10이 되었습니다.', '드랍률 0.001%의 보상이 떨어졌습니다.',
      '히든 옵션 3개가 동시에 개방되었습니다.', '능력치 보정 +200%가 적용됩니다.', '쿨다운이 영구히 0초가 됩니다.',
      '상태이상 \'즉사\'가 부여됩니다.', '레전더리 등급으로 확정되었습니다.', '서버 최초로 기록되었습니다.',
      '치명타 배율이 ×5로 상향됩니다.', '잠재력 등급이 \'SSS\'로 측정되었습니다.', '명성이 50,000 증가했습니다.',
      '경험치 5배 버프가 7일간 지속됩니다.', '체력 한계가 두 배로 확장됩니다.', '스킬 슬롯이 3개 추가되었습니다.',
      '저항 수치가 100%(완전 무효)가 됩니다.', '단 한 번만 발동하는 권능이 각인됩니다.', '레벨 캡이 해제되었습니다.',
      '전 스탯에 종족 보정 +30%가 더해집니다.', '확률 변동: 강화 성공률 100% 보장.', '인벤토리 용량이 무한으로 확장됩니다.',
      '랭킹이 1,204위에서 1위로 도약했습니다.', '효과가 영구히 귀속됩니다.', '24시간 한정으로 무적이 부여됩니다.',
      '미스릭(신화) 등급으로 진화했습니다.', '경험치 보너스가 폭주 상태로 누적됩니다.', '광역 피해 1,000,000을 입혔습니다.',
      '소환 가능 군단의 수가 10,000으로 늘었습니다.', '히든 스탯 \'운\'이 임계치를 넘겼습니다.', '데미지 흡혈 100%가 적용됩니다.',
      '봉인이 7단계 중 7단계까지 풀렸습니다.', '성좌 후원으로 코인 100,000이 지급됩니다.', '전직 조건이 모두 충족되었습니다.',
      '단 0.1초 차이로 갱신에 성공했습니다.', '환산 전투력이 측정 불가(∞)로 표시됩니다.',
    ],
  },
  {
    key: 'effect', label: '효과·여파(서술)', icon: '🌋',
    faces: [
      '주변의 모든 적이 그 자리에서 얼어붙었다.', '관전하던 랭커들이 일제히 숨을 삼켰다.',
      '전장의 공기가 통째로 뒤바뀌었다.', '시스템마저 잠시 침묵하는 듯했다.',
      '경악한 길드원들이 말을 잇지 못했다.', '죽음의 카운트다운이 거짓말처럼 멈췄다.',
      '무너지던 전열이 단숨에 역전되었다.', '성좌들의 시선이 그에게로 쏠렸다.',
      '협회의 측정기가 비명을 지르며 터졌다.', '하늘 위로 거대한 시스템 창이 펼쳐졌다.',
      '적 보스가 처음으로 두려움을 드러냈다.', '게이트 너머의 군세가 일제히 멈춰 섰다.',
      '동료들의 눈에 비로소 희망이 돌아왔다.', '낡은 장비가 눈부신 빛으로 새로 태어났다.',
      '전 서버에 그의 이름이 알림으로 떠올랐다.', '봉인되어 있던 진짜 힘이 흘러넘쳤다.',
      '주변 십 리의 몬스터가 본능적으로 도망쳤다.', '회귀 전의 미래가 비로소 어긋나기 시작했다.',
      '한낱 F급이라 비웃던 자들이 굳어버렸다.', '탑 전체가 새 도전자의 등장에 진동했다.',
      '관리국 비상망이 한꺼번에 울렸다.', '버려졌던 비경이 다시 빛을 머금었다.',
      '쏟아지던 몬스터 웨이브가 일순 잦아들었다.', '경매장 시세가 그 한 건으로 요동쳤다.',
      '쓰러졌던 파티원들이 하나둘 일어섰다.', '적의 광폭화 패턴이 거짓말처럼 무력화됐다.',
      '세계의 규칙 한 줄이 그의 손에서 비틀렸다.', '히든 보스의 마지막 페이즈가 끝내 깨졌다.',
      '단 한 수에 격차가 천 길로 벌어졌다.', '잿더미 속에서 전설이 다시 일어섰다.',
      '결전장의 입구가 굳게 봉인되어 닫혔다.', '드랍된 보상의 빛에 모두의 눈이 멀 듯했다.',
      '오랜 침묵을 깨고 NPC가 스스로 입을 열었다.', '강화에 실패했던 손이 마침내 떨림을 멈췄다.',
      '랭킹판의 1위 칸이 그의 이름으로 갈렸다.', '안전지대의 결계가 한층 더 단단해졌다.',
      '그의 그림자에서 군단이 검은 안개처럼 솟았다.', '코어가 맥박치며 던전 전체가 깨어났다.',
      '예언서의 마지막 장이 저절로 넘어갔다.', '현실의 하늘에마저 균열의 빛이 번졌다.',
    ],
  },
  {
    key: 'witness', label: '관전·반응 주체(서술)', icon: '👁️', pre: true,
    faces: [
      '이 모든 광경을 지켜본 길드마스터는', '뒤늦게 측정기를 들이댄 협회 직원은',
      '관중석을 가득 메운 랭커들은', '회귀 전 그를 짓밟았던 옛 동료는',
      '게이트를 함께 막던 S급 헌터들은', '실시간 중계를 보던 전 세계 시청자는',
      '그를 F급이라 비웃던 옛 길드원들은', '시나리오를 굴리던 도깨비(시스템)는',
      '천 년을 잠들어 있던 던전의 NPC는', '관전하던 적대 길드의 정보원은',
      '탑의 다음 층을 지키는 시험관은', '뒷짐 지고 지켜보던 전대의 랭커는',
      '그를 후원하던 성좌들은', '경매장 한복판의 상인들은',
      '쓰러졌다 깨어난 파티의 막내는', '관리국 비상대책반의 국장은',
      '먼발치에서 숨죽인 신참 헌터는', '오랜 라이벌이자 1위였던 자는',
      '죽은 줄로만 알았던 옛 스승은', '광폭화 직전의 보스조차',
      '연단 위에서 시상을 준비하던 운영진은', '몰래 그를 시험하던 히든 NPC는',
      '결전장 입구에 모여든 군웅은', '회귀의 비밀을 눈치챈 단 한 사람은',
      '비웃음을 거둔 적의 우두머리는', '새 도전자를 경계하던 탑의 주인은',
    ],
  },
  {
    key: 'next', label: '후속 전개·다음 국면(서술)', icon: '➡️',
    faces: [
      '그제야 진짜 시험이 시작되었음을 직감했다.', '비로소 그의 정체를 묻기 시작했다.',
      '다음 시나리오의 윤곽을 떠올리며 침을 삼켰다.', '이미 벌어진 격차를 좁힐 수 없음을 깨달았다.',
      '서둘러 상부에 그의 이름을 보고했다.', '회귀 이전과 달라진 미래에 전율했다.',
      '다음 게이트의 좌표가 어디일지 가늠하기 시작했다.', '그를 영입하기 위한 수싸움에 들어갔다.',
      '봉인 너머의 진실에 한 발짝 더 다가섰음을 알았다.', '그가 노리는 최종 목표를 비로소 의심했다.',
      '탑의 다음 층이 부르는 소리에 귀를 기울였다.', '이 위업이 판세를 통째로 뒤집었음을 인정했다.',
      '다가올 몬스터 웨이브에 대비를 서둘렀다.', '그의 다음 한 수가 무엇일지 두려워했다.',
      '랭킹 1위 자리의 무게를 새삼 곱씹었다.', '히든 던전 너머에 무엇이 있을지 상상했다.',
      '시스템이 그를 어디까지 끌고 갈지 가늠했다.', '복수의 칼끝이 누구를 향할지 헤아렸다.',
      '다음 전직 시험이 더 가혹하리라 직감했다.', '진짜 적은 따로 있음을 어렴풋이 깨달았다.',
      '그가 쥔 패가 아직 한참 남았음을 알아챘다.', '세계의 규칙이 그를 중심으로 재편됨을 느꼈다.',
      '다가올 결전의 판돈이 얼마나 큰지 가늠했다.', '이 모든 게 시작에 불과함을 직감했다.',
    ],
  },
  {
    key: 'close', label: '안내·맺음(시스템/대사)', icon: '🎮',
    faces: [
      '[지금부터 새로운 전설이 시작됩니다.]', '[당신은 이 위업을 달성한 유일한 존재입니다.]',
      '"이게…… 가능한 수치라고?"', '"이제부터, 반격이다."', '[보상을 수령하시겠습니까? 예 / 아니오]',
      '[남은 시간 안에 다음 시나리오를 클리어하십시오.]', '"나는 이 결말을 이미 알고 있다."',
      '[숨겨진 조건이 추가로 해금되었습니다.]', '"고작 이 정도로 나를 막을 수 있을 것 같나?"',
      '[성좌들이 당신의 행보에 열광합니다.]', '[경고: 다음 층의 시험은 죽음을 동반합니다.]',
      '"여긴 게임이지만, 죽음은 진짜다."', '[연계 퀘스트가 새로이 발생했습니다.]',
      '[전 서버에 당신의 업적이 공표되었습니다.]', '"상태창." — 그는 담담히 창을 닫았다.',
      '[다음 목표: 차원의 탑 다음 층 정복.]', '"드디어, 미래가 내 손에 들어왔다."',
      '[봉인된 다음 단계가 조건부로 개방됩니다.]', '"세상에서 가장 약했던 내가, 이제 정점에 선다."',
      '[관리자 권한이 일부 위임되었습니다.]', '[히든 던전의 좌표가 지도에 새겨졌습니다.]',
      '"패턴은 끝났다. 남은 건 처리뿐."', '[칭호의 추가 효과는 장착 시 적용됩니다.]',
      '"이 한 수에, 모든 것을 건다."', '[다음 게이트의 등급이 상향 조정되었습니다.]',
      '"끝까지 지켜봐라. 이게 진짜 실력이다."', '[당신을 주목하는 새로운 존재가 나타났습니다.]',
      '[페널티 없이 안전지대로 귀환합니다.]', '"규칙 안에서, 나는 누구보다 사기적이다."',
      '[축하합니다. 당신은 한계를 돌파했습니다.]', '"로그아웃은 없다. 그러니 끝을 보자."',
      '[다음 진화까지 남은 숙련도: 0%]', '"이 세계의 진실에 한 걸음 더 다가섰다."',
      '[전직 시험의 다음 관문이 열렸습니다.]', '"빚은 갚는다 — 시스템의 이름으로."',
      '[랭킹 보상은 시즌 종료 시 지급됩니다.]', '"이름을 기억해라. 오늘부터 1위는 나다."',
      '[던전 코어가 당신을 새 주인으로 인정합니다.]', '"각오해라. 진짜 시나리오는 지금부터다."',
      '[모든 보상이 인벤토리로 귀속되었습니다.]',
    ],
  },
]

const flatAll = (): { cat: Cat; item: Term }[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const fmtBig = (n: number) => {
  // 큰 수를 '약 X조 Y억' 식으로 보기 좋게
  const eok = 1e8, jo = 1e12
  if (n >= jo) return `약 ${(n / jo).toFixed(n >= jo * 10 ? 0 : 2)}조`
  if (n >= eok) return `약 ${(n / eok).toFixed(n >= eok * 10 ? 0 : 1)}억`
  return n.toLocaleString('ko-KR')
}

export default function LitrpgLexicon({ payload }: { payload?: Record<string, unknown> }) {
  const payloadGenre = typeof payload?.genre === 'string' ? (payload.genre as string) : ''
  const [tab, setTab] = useState<'dict' | 'gen' | 'saved'>(() => {
    try {
      const raw = localStorage.getItem(LS + ':tab')
      if (raw === 'dict' || raw === 'gen' || raw === 'saved') return raw
    } catch { /* ignore */ }
    return 'dict'
  })

  // ── 사전 상태 ──
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + ':open')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o }
    } catch { /* ignore */ }
    return { [CATS[0].key]: true }
  })
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + ':favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [randomTerm, setRandomTerm] = useState<{ cat: Cat; item: Term } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // ── 생성기 상태 ──
  const [picks, setPicks] = useState<number[]>(() => GEN_SLOTS.map((s) => Math.floor(Math.random() * s.faces.length)))
  const [locks, setLocks] = useState<boolean[]>(() => GEN_SLOTS.map(() => false))

  // ── 보관함(생성 메시지 CRUD) ──
  interface SavedLine { id: string; text: string; slots: string; ts: number }
  const [saved, setSaved] = useState<SavedLine[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':saved')
      if (raw) { const a = JSON.parse(raw); if (Array.isArray(a)) return a }
    } catch { /* ignore */ }
    return []
  })

  const toastTimer = useRef<number | null>(null)
  const flash = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }, [])
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }, [])

  // 영속
  useEffect(() => { try { localStorage.setItem(LS + ':tab', tab) } catch { /* ignore */ } }, [tab])
  useEffect(() => { try { localStorage.setItem(LS + ':open', JSON.stringify(open)) } catch { /* ignore */ } }, [open])
  useEffect(() => { try { localStorage.setItem(LS + ':favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])
  useEffect(() => { try { localStorage.setItem(LS + ':saved', JSON.stringify(saved)) } catch { /* ignore */ } }, [saved])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  const combos = useMemo(() => GEN_SLOTS.reduce((n, s) => n * s.faces.length, 1), [])

  const favKey = (catKey: string, name: string) => `${catKey}::${name}`

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1400)
    }).catch(() => { /* graceful */ })
  }

  const toggleFav = (catKey: string, name: string) => {
    const k = favKey(catKey, name)
    setFavs((prev) => { const next = { ...prev }; if (next[k]) delete next[k]; else next[k] = true; return next })
  }

  // 검색 시: 매칭되는 카테고리를 자동 펼침
  const q = query.trim().toLowerCase()
  const matched = useMemo(() => {
    return CATS.map((c) => {
      let items = c.items
      if (onlyFav) items = items.filter((it) => favs[favKey(c.key, it.name)])
      if (q) items = items.filter((it) => it.name.toLowerCase().includes(q) || it.gloss.toLowerCase().includes(q) || (it.note || '').toLowerCase().includes(q))
      return { cat: c, items }
    }).filter((g) => g.items.length > 0)
  }, [q, onlyFav, favs])
  const shownCount = useMemo(() => matched.reduce((n, g) => n + g.items.length, 0), [matched])

  const rollRandomTerm = useCallback(() => {
    const pool = flatAll()
    setRandomTerm((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pick.item.name === prev.item.name) pick = pool[Math.floor(Math.random() * pool.length)]
      return pick
    })
  }, [])

  // ── 생성기 동작 ──
  const roll = useCallback(() => {
    setPicks((prev) => prev.map((p, i) => {
      if (locks[i]) return p
      const len = GEN_SLOTS[i].faces.length
      if (len <= 1) return p
      let n = Math.floor(Math.random() * len)
      if (n === p) n = (n + 1 + Math.floor(Math.random() * (len - 1))) % len
      return n
    }))
  }, [locks])
  const toggleLock = (i: number) => setLocks((prev) => prev.map((v, idx) => (idx === i ? !v : v)))

  const line = useMemo(() => {
    // 슬롯 순서: 발동상황 · 알림머리 · 대상·획득 · 수치·등급 · 효과·여파 · 관전·반응 · 후속·다음 · 안내·맺음
    const [tr, hd, su, va, ef, wi, nx, cl] = picks.map((p, i) => GEN_SLOTS[i].faces[p])
    // "발동상황 [머리] 대상을 수치. 효과. 관전자는 후속. 맺음" — 시스템 팝업이 끼어드는 LitRPG 한 단락으로 엮는다.
    return `${tr} ${hd} ${su} ${va}\n${ef} ${wi} ${nx}\n${cl}`
  }, [picks])
  const lineFlat = useMemo(() => line.replace(/\n/g, ' '), [line])
  const slotSummary = useMemo(() => picks.map((p, i) => GEN_SLOTS[i].faces[p]).join(' · '), [picks])

  // ── 저장/연계 ──
  const saveTermSnippet = (cat: Cat, item: Term) => {
    addToLibrary('snippets', {
      text: `[LitRPG어휘·${cat.label}] ${item.name} — ${item.gloss}${item.note ? ` (${item.note})` : ''}`,
      source: 'LitRPG 어휘·표현 사전',
      tags: ['게임판타지', 'LitRPG', '어휘', cat.label, item.name],
    })
    flash(`스니펫에 '${item.name}'을(를) 저장했습니다.`)
  }

  const saveLineSnippet = () => {
    addToLibrary('snippets', {
      text: `[LitRPG 시스템 메시지]\n${line}`,
      source: 'LitRPG 어휘·표현 사전 (시스템 메시지 조합기)',
      tags: ['게임판타지', 'LitRPG', '시스템메시지', '글감'],
    })
    flash('시스템 메시지를 스니펫에 저장했습니다.')
  }

  const keepLine = () => {
    setSaved((prev) => [{ id: 'll_' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), text: line, slots: slotSummary, ts: Date.now() }, ...prev].slice(0, 200))
    flash('보관함에 시스템 메시지를 담았습니다.')
  }
  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))

  const termToProject = (cat: Cat, item: Term) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = [
      `<p><b>${escapeHtml(cat.icon + ' ' + cat.label)} · ${escapeHtml(item.name)}</b></p>`,
      `<p>${escapeHtml(item.gloss)}</p>`,
      item.note ? `<p style="color:#888"><i>${escapeHtml(item.note)}</i></p>` : '',
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: 'LitRPG 어휘', title: item.name, bodyHtml })
    if (id) flash(`프로젝트 자료 〈LitRPG 어휘〉에 '${item.name}'을(를) 추가했습니다.`)
  }

  const lineToProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = [
      `<p><b>🎮 LitRPG 시스템 메시지</b></p>`,
      `<p style="font-size:14px;white-space:pre-wrap"><b>${escapeHtml(line)}</b></p>`,
      `<p style="color:#888"><i>슬롯: ${escapeHtml(slotSummary)}</i></p>`,
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: 'LitRPG 어휘', title: lineFlat.slice(0, 24) + (lineFlat.length > 24 ? '…' : ''), bodyHtml })
    if (id) flash('프로젝트 자료 〈LitRPG 어휘〉에 시스템 메시지를 추가했습니다.')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const tabBtn = (on: boolean): React.CSSProperties => ({ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' })

  return (
    <div style={wrap}>
      {/* 헤더 */}
      <div style={hint}>
        상태창·시스템·스탯·스킬·등급·퀘스트·랭킹·헌터물 어휘를 <b>{CATS.length}개 분류 · {total}개 항목</b>으로 모았습니다.
        {payloadGenre && payloadGenre !== '게임판타지·LitRPG' ? <> (요청 장르: <b>{escapeHtml(payloadGenre)}</b> — LitRPG 어휘로 안내합니다)</> : null}
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('dict')} aria-pressed={tab === 'dict'} style={tabBtn(tab === 'dict')}><Emoji e="📚" /> 어휘 사전</button>
        <button className="minibtn" onClick={() => setTab('gen')} aria-pressed={tab === 'gen'} style={tabBtn(tab === 'gen')}><Emoji e="🎲" /> 시스템 메시지 조합기</button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'} style={tabBtn(tab === 'saved')}><Emoji e="📁" /> 보관함{saved.length ? ` (${saved.length})` : ''}</button>
      </div>

      {/* ── 사전 탭 ── */}
      {tab === 'dict' && (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="용어·뜻으로 검색 (예: 상태창, 스탯, 히든 클래스, 게이트, 레이드)"
            style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={rollRandomTerm} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 용어</button>
            <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
              style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
              {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
            </button>
            <span style={{ ...hint, marginLeft: 'auto' }}>{shownCount}개 표시</span>
          </div>

          {/* 무작위 결과 */}
          {randomTerm && (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={randomTerm.cat.icon} /> {randomTerm.cat.label}</span>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{randomTerm.item.name}</span>
                <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandomTerm(null)}>✕</button>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0' }}>{randomTerm.item.gloss}</div>
              {randomTerm.item.note && <div style={{ fontSize: 12, color: 'var(--muted)' }}>※ {randomTerm.item.note}</div>}
              <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                <button className="minibtn" onClick={() => copy(`${randomTerm.item.name} — ${randomTerm.item.gloss}`, 'rnd')}>{copiedKey === 'rnd' ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}</button>
                <button className="minibtn" onClick={() => toggleFav(randomTerm.cat.key, randomTerm.item.name)}>{favs[favKey(randomTerm.cat.key, randomTerm.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}</button>
                <button className="linkbtn" onClick={() => saveTermSnippet(randomTerm.cat, randomTerm.item)}><Emoji e="💾" /> 스니펫 저장</button>
                <button className="linkbtn" onClick={() => termToProject(randomTerm.cat, randomTerm.item)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈LitRPG 어휘〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
              </div>
            </div>
          )}

          {toast && <div style={{ fontSize: 12.5, color: 'var(--accent)', textAlign: 'center' }}>✓ {toast}</div>}

          {/* 카테고리 펼침 목록 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {matched.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
                {onlyFav ? '☆ 아직 즐겨찾기한 용어가 없습니다. 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
              </div>
            ) : matched.map(({ cat: c, items }) => {
              const isOpen = q ? true : (open[c.key] ?? false) // 검색 중엔 항상 펼침
              return (
                <div key={c.key} style={card}>
                  <button
                    onClick={() => { if (!q) setOpen((o) => ({ ...o, [c.key]: !(o[c.key] ?? false) })) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', color: 'var(--text)', cursor: q ? 'default' : 'pointer', padding: 0, font: 'inherit', textAlign: 'left' }}
                  >
                    <span style={{ fontSize: 14 }}>{isOpen ? '▾' : '▸'}</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e={c.icon} /> {c.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{items.length}</span>
                    <span style={{ ...hint, marginLeft: 'auto', maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.desc}</span>
                  </button>
                  {isOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                      {items.map((item) => {
                        const fk = favKey(c.key, item.name)
                        const isFav = !!favs[fk]
                        const cid = 'i:' + fk
                        return (
                          <div key={fk} style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                              <span
                                onClick={() => copy(`${item.name} — ${item.gloss}`, cid)}
                                title="클릭하면 복사"
                                style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                              >{item.name}</span>
                              {copiedKey === cid && <span style={{ fontSize: 11, color: 'var(--accent)' }}>✓ 복사됨</span>}
                              <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(c.key, item.name)}
                                style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>{isFav ? '★' : '☆'}</button>
                            </div>
                            <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 4 }}>{item.gloss}</div>
                            {item.note && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>※ {item.note}</div>}
                            <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                              <button className="minibtn" onClick={() => copy(`${item.name} — ${item.gloss}`, cid)}><Emoji e="📋" /> 복사</button>
                              <button className="linkbtn" onClick={() => saveTermSnippet(c, item)}><Emoji e="💾" /> 스니펫</button>
                              <button className="linkbtn" onClick={() => termToProject(c, item)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈LitRPG 어휘〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── 생성기 탭 ── */}
      {tab === 'gen' && (
        <>
          <div style={hint}>
            여덟 슬롯(발동상황·알림머리·대상·수치·효과·관전·후속·맺음)을 굴려 [시스템] 팝업이 끼어드는 LitRPG 한 단락을 생성합니다. 마음에 드는 슬롯은 <Emoji e="🔒" />로 고정하고 나머지만 다시 굴리세요.
            조합 수 <b>{fmtBig(combos)}</b> ({combos.toLocaleString('ko-KR')}가지).
          </div>

          {/* 결과 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{line}</div>
            <div style={{ ...hint, marginTop: 8 }}>{slotSummary}</div>
          </div>

          {/* 슬롯들 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {GEN_SLOTS.map((s, i) => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="minibtn" onClick={() => toggleLock(i)} aria-pressed={locks[i]} title={locks[i] ? '잠금 해제' : '이 슬롯 고정'}
                  style={{ flexShrink: 0, borderColor: locks[i] ? 'var(--accent)' : 'var(--border)' }}><Emoji e={locks[i] ? '🔒' : '🔓'} /></button>
                <div style={{ flex: 1, minWidth: 0, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e={s.icon} /> {s.label} <span style={{ opacity: 0.7 }}>({s.faces.length})</span></div>
                  <div style={{ fontSize: 13, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.faces[picks[i]]}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={roll} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 굴리기</button>
            <button className="minibtn" onClick={() => copy(line, 'genline')}>{copiedKey === 'genline' ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}</button>
            <button className="minibtn" onClick={keepLine}><Emoji e="📌" /> 보관함에 담기</button>
          </div>

          <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
            <button className="linkbtn" onClick={saveLineSnippet}><Emoji e="💾" /> 스니펫 저장</button>
            <button className="linkbtn" onClick={lineToProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈LitRPG 어휘〉에 시스템 메시지 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
            <button className="linkbtn" onClick={() => openToolLinked('character-sheet')} title="인물 시트 열기"><Emoji e="🧑" /> 인물 시트</button>
            <button className="linkbtn" onClick={() => openToolLinked('scene-list')} title="장면 목록 열기"><Emoji e="🎬" /> 장면 목록</button>
          </div>

          {toast && <div style={{ fontSize: 12.5, color: 'var(--accent)', textAlign: 'center' }}>✓ {toast}</div>}
          <div style={hint}>팝업은 출발점입니다. 작품의 분기(VR다이브·데스게임·이세계전이+시스템·현실침공)와 시스템 톤에 맞춰 등급명·수치·말투를 손보면 한층 살아납니다.</div>
        </>
      )}

      {/* ── 보관함 탭 ── */}
      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
          {toast && <div style={{ fontSize: 12.5, color: 'var(--accent)', textAlign: 'center' }}>✓ {toast}</div>}
          {saved.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
              아직 담은 시스템 메시지가 없습니다. 〈시스템 메시지 조합기〉에서 마음에 드는 팝업을 <Emoji e="📌" />로 담아 보세요.
            </div>
          ) : saved.map((s) => (
            <div key={s.id} style={card}>
              <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{s.text}</div>
              <div style={{ ...hint, marginTop: 6 }}>{s.slots}</div>
              <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                <button className="minibtn" onClick={() => copy(s.text, 'sv:' + s.id)}>{copiedKey === 'sv:' + s.id ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}</button>
                <button className="linkbtn" onClick={() => { addToLibrary('snippets', { text: `[LitRPG 시스템 메시지]\n${s.text}`, source: 'LitRPG 어휘·표현 사전', tags: ['게임판타지', 'LitRPG', '시스템메시지', '글감'] }); flash('스니펫에 저장했습니다.') }}><Emoji e="💾" /> 스니펫</button>
                <button className="linkbtn" disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈LitRPG 어휘〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}
                  onClick={() => {
                    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
                    const flat = s.text.replace(/\n/g, ' ')
                    const id = addToProject({ kind: 'text', root: 'research', folder: 'LitRPG 어휘', title: flat.slice(0, 24) + (flat.length > 24 ? '…' : ''), bodyHtml: `<p style="font-size:14px;white-space:pre-wrap"><b>${escapeHtml(s.text)}</b></p><p style="color:#888"><i>${escapeHtml(s.slots)}</i></p>` })
                    if (id) flash('프로젝트 자료 〈LitRPG 어휘〉에 추가했습니다.')
                  }}><Emoji e="📄" /> 프로젝트</button>
                <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => removeSaved(s.id)}><Emoji e="🗑" /> 삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
