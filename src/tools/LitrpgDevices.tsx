// 게임판타지·LitRPG 서사 장치·전개법 사전 — 이 장르 고유의 서사 장치(상태창·시스템 메시지·레벨업·
//  스탯 분배·스킬 트리·퀘스트·클래스·등급/레어리티·칭호·인벤토리·RNG·시스템 AI·회귀+게임지식·시스템의
//  배후…)와 전개/구조 패턴·페이싱·클라이맥스 관습을 ① 정의 ② 사용법 ③ 예시 ④ 비틀기 로 정리한 로컬 사전.
//  도시에(LitRPG 4분기 · Reader Promise · 코어 루프 · 파워 게이팅 · 수치 인플레 관리 · 한계 돌파)에 근거한
//  자작 데이터. 펼침/접힘 + 카테고리 + 검색 + 무작위(중복 회피) + 영감 3연 + 즐겨찾기 + 클릭복사.
//  연계: 항목/현재 보기를 프로젝트 자료 〈LitRPG 장치〉 폴더 문서로 추가, 글감 스니펫 저장, 관련 도구 열기.
//  자급식 — react 와 './linkbus' 외 import 없음. 외부 API 없음. 상태는 localStorage 자동 저장/복원(graceful).
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'litrpg-devices', name: 'LitRPG 서사 장치·전개 사전', icon: '🎮', group: '장치·전개', genre: '게임판타지·LitRPG', intro: '상태창·레벨업·스킬 트리·퀘스트·클래스·등급·칭호·RNG·시스템 AI·회귀+게임지식… 게임판타지·LitRPG 고유의 서사 장치와 전개·페이싱·클라이맥스 관습을 정의·사용법·예시·비틀기로', w: 680, h: 700 }

const LS = 'sry:tool:litrpg-devices:'
const ALL_KEY = '__all__'

// ── 데이터 모델: 한 항목 = LitRPG 서사 장치/전개 관습 ──
interface Device {
  name: string         // 한국어 명칭
  aka?: string         // 원어/별칭
  def: string          // 정의 — 이 장치가 무엇인가(도시에 근거)
  how: string          // 사용법 — 어떻게 쓰는가(작법)
  example: string      // 예시 — 대표작/장면
  twist: string        // 비틀기 — 클리셰를 전복하는 변주
}
interface CatDef { key: string; label: string; icon: string; blurb: string; items: Device[] }

// 카테고리 6종(도시에 §0 분기 / §3 서사 장치 / §4 전개·구조 / §5 클라이맥스 / Reader Promise / 회귀·메타)
const CATS: CatDef[] = [
  {
    key: 'mode', label: '4대 분기·기반', icon: '🌐',
    blurb: '작품의 톤·금기·페이싱을 결정하는 첫 선택 — VR 다이브 / 데스게임 / 이세계 전이 / 현실 침공.',
    items: [
      {
        name: 'VR 다이브형', aka: 'Full-Dive VRMMO',
        def: '현실의 인간이 가상현실 게임에 접속해 모험하는 한국 게임판타지의 정통. 로그아웃·현실 생활·게임 내 경제가 함께 굴러가는 이중 구조(달빛조각사·로열로드 계열).',
        how: '"게임 안의 성과가 현실의 지위·돈으로 환산"되는 환율을 명시해 두라 — 그래야 게임 속 노가다·일확천금이 현실의 절박함과 연결돼 무게가 생긴다. 로그아웃 장면으로 호흡을 환기하고, 게임 내 자유와 현실 제약의 낙차를 활용하라.',
        example: '달빛조각사 — 가난한 위드가 게임 속 노동·생산·사냥으로 번 돈이 곧 현실 가족을 부양하는 생계가 된다. 게임이 곧 직업.',
        twist: '로그아웃이 점점 불가능해지거나(데스게임으로 변질), 게임 속 인격이 현실의 나보다 진짜가 되게 하라. 또는 "현실이 사실 더 큰 게임"이었다는 액자 전복.',
      },
      {
        name: '데스게임형', aka: 'Death Game',
        def: '게임에서 빠져나올 수 없고, 게임 내 죽음이 곧 현실의 진짜 죽음인 최고 긴장형(소드 아트 온라인의 원형). 안전지대라는 개념이 사실상 무력화된다.',
        how: '"세이브·리스폰·안전지대 없음"을 규칙으로 못 박아 모든 전투에 영구사망의 무게를 실어라. 클리어 조건(최종 보스·최상층)을 탈출의 유일한 길로 제시해 장기 목표를 건다. 사망자 수를 카운트로 가시화하면 긴장이 누적된다.',
        example: '소드 아트 온라인 — "이 게임에서 죽으면 현실에서도 죽는다"는 운영자의 선언이 1화에서 모든 규칙을 재정의한다. 로그아웃 버튼이 사라진다.',
        twist: '"죽으면 진짜 죽는다"가 거짓말이거나, 죽은 자가 다른 형태로 살아 있게 하라. 또는 데스게임의 운영자가 사실 갇힌 자를 구하려는 존재였다는 반전.',
      },
      {
        name: '이세계 전이+시스템형', aka: 'Isekai + System',
        def: '다른 세계로 넘어갔는데 그 세계 자체에 레벨·스탯·스킬 같은 게임 시스템이 깔려 있는 형. 로그아웃·현실 복귀 개념이 없어 "이 세계가 곧 현실"이다.',
        how: '시스템을 "이 세계의 물리법칙"으로 다뤄 누구나 상태창을 보고 레벨을 올린다는 전제를 세계관에 내장하라. 전이자(주인공)에게만 주어진 특권(고유 스킬·시스템 단독 조작)을 차별점으로. 돌아갈 곳이 없으니 정착·생존·세력 구축이 동력이 된다.',
        example: '나 혼자만 레벨업류 — 세계에 게이트·헌터·각성 시스템이 상수로 존재하고, 주인공만 "혼자 레벨업하는 시스템"을 단독 보유한다.',
        twist: '이 세계의 시스템이 사실 "전이자를 가두기 위한 장치"였거나, 원래 세계로 돌아가는 것이 진짜 엔딩 조건이게 하라. 정착의 안락을 탈출의 갈등으로 뒤집는다.',
      },
      {
        name: '현실 침공형', aka: 'System Apocalypse',
        def: '어느 날 현실에 상태창·던전·게이트·몬스터가 출현해 일상이 게임 규칙으로 재편되는 형. 헌터물·각성물과 강하게 겹친다(시스템 아포칼립스).',
        how: '"평범한 현실 → 시스템 강림 → 모두가 강제 플레이어가 됨"의 충격을 1막의 인사이팅 인시던트로 강하게 터뜨려라. 약자(F급·미각성자)였던 주인공이 시스템 덕에 역전하는 사이다 구조와, 기존 사회 질서의 붕괴·재편을 함께 그린다.',
        example: '전지적 독자 시점 — 읽던 소설이 현실이 되고, 도깨비가 시나리오·코인·스탯을 강제하며 서울 한복판이 생존 게임장으로 변한다.',
        twist: '시스템 강림이 인류를 구하려는 것이 아니라 "관전·수확"을 위한 것이게 하라. 또는 침공의 진짜 목적이 특정 한 사람을 시험하기 위함이었다는 축소·전복.',
      },
      {
        name: '회귀+게임지식', aka: 'Regression + Meta Knowledge',
        def: '이미 결말·공략·미래를 아는 자가 시스템 지식을 무기로 다시 시작하는, 한국 장르의 결정적 변주. "결과를 아는 자"가 곧 최강의 치트.',
        how: '"남들은 모르는 미래 정보"를 사이다의 핵심 연료로 — 기연의 위치, 보스의 패턴, 숨은 퀘스트, 시장의 흐름을 선점하게 하라. 다만 전지(全知)가 긴장을 죽이지 않게, 지식이 어긋나는 "변수(나비효과)"를 의도적으로 심어라.',
        example: '전지적 독자 시점 — "원작 소설을 끝까지 읽은 단 한 명의 독자"라는 형태로, 시나리오의 전개와 결말을 아는 정보 우위가 곧 능력이 된다.',
        twist: '회귀했더니 미래가 이미 바뀌어 지식이 무용지물이 되거나, "나만 회귀한 게 아님"을 드러내라. 또는 알던 공략이 사실 함정으로 깔린 가짜였다는 전복.',
      },
      {
        name: '복귀형·은퇴 랭커', aka: 'Returning Legend',
        def: '한때 정점에 섰다가 은퇴·몰락·봉인된 최강자가 다시 게임/세계에 돌아오는 형. 회귀와 달리 "실력은 이미 있으나 처지가 바닥"인 낙차를 쓴다.',
        how: '과거의 위명과 현재의 비루한 처지 사이 낙차로 초반 후킹을 만들고, 정체를 숨긴 채 압도하는 "고인물의 여유"를 사이다로 배치하라. 옛 동료·라이벌·원수와의 재회를 중기 동력으로.',
        example: '전설의 랭커가 신분을 감추고 초보 구역에 나타나, 풋내기 행세를 하다 결정적 순간에 진짜 실력을 드러내는 전형.',
        twist: '돌아온 최강자가 사실 실력의 대부분을 잃었거나, 그의 "전성기 지식"이 패치·세대교체로 통하지 않게 하라. 권위의 향수를 정면으로 시험한다.',
      },
    ],
  },
  {
    key: 'system', label: '상태창·시스템', icon: '🖥️',
    blurb: '상태창·시스템 메시지·전투 로그·튜토리얼 AI — 화면에 뜨는 게임 UI를 서사로 쓰는 기술.',
    items: [
      {
        name: '상태창·시스템 메시지', aka: 'Status Window',
        def: 'HP/MP/스탯/레벨/경험치 바를 텍스트 박스로 본문에 삽입하는 LitRPG의 심장. 정보 전달 + 리듬 환기 + 보상 연출을 한 번에 한다.',
        how: '서술을 잠시 멈추고 `[ ]`·`< >`·굵게·구분선으로 "팝업"을 띄워 호흡을 끊는 연출 자체를 멋으로 써라. 단, 매 장면 도배하면 가독성이 죽으니 "보상·전환·정보 갱신"의 결정적 순간에만 배치하라. 창의 톤(기계적/유머/위압적)으로 시스템의 인격을 암시할 수 있다.',
        example: '나 혼자만 레벨업류 — "[레벨이 올랐습니다]" "[새로운 스킬을 습득했습니다]" 알림창이 회차의 보상 비트이자 다음 화 후킹으로 기능한다.',
        twist: '상태창에 "표시되지 않는 숨은 수치"가 있음을 드러내거나, 시스템 메시지가 주인공에게 거짓·편향된 정보를 흘리게 하라. 절대 신뢰하던 UI를 믿을 수 없는 화자로 만든다.',
      },
      {
        name: '전투 로그·딜미터', aka: 'Combat Log / DPS Meter',
        def: '"데미지 1,234! 치명타!" 식으로 전투 수치를 실시간 출력해 박진감을 만드는 장치. 추상적 강함을 구체적 숫자로 환산한다.',
        how: '핵심 한 방·치명타·연계기의 수치만 골라 보여 임팩트를 살려라(모든 타격을 적으면 지루). 적의 남은 HP %를 노출해 "역전까지 얼마"를 독자가 체감하게 하라. 빗나감·저항·반사 같은 변수 로그로 긴장을 만든다.',
        example: '레이드물의 보스전 — 파티 전체 딜량과 보스 HP 바가 실시간으로 깎이며, 마지막 1%에서의 전멸 위기가 수치로 가시화된다.',
        twist: '딜미터가 "측정 불가" 또는 "오류"를 띄우게 해 주인공의 격이 시스템의 한계를 넘었음을 암시하라. 또는 수치가 조작된 가짜였음을 폭로한다.',
      },
      {
        name: '튜토리얼·온보딩', aka: 'Tutorial',
        def: '초반에 시스템 규칙을 학습시키는 구간. 인물의 학습 = 독자의 온보딩으로, 세계관 규칙을 자연스럽게 설명하는 인포덤프 회피 장치.',
        how: '"강의"가 아니라 "직접 해보며 깨치게" 하라 — 첫 사냥, 첫 레벨업, 첫 사망 페널티를 체험형으로 배치해 규칙을 몸으로 익히게 한다. 튜토리얼 자체를 첫 위기·첫 사이다로 만들어 지루하지 않게.',
        example: '현실 침공형의 1막 — "튜토리얼 던전"에서 강제 플레이어가 된 사람들이 규칙을 모른 채 죽어 나가고, 주인공만 빠르게 적응한다.',
        twist: '튜토리얼이 사실 "솎아내기·선별" 과정이었거나, 영영 끝나지 않는 무한 튜토리얼이게 하라. 안전한 연습 구간을 가장 잔혹한 시험으로 뒤집는다.',
      },
      {
        name: '시스템 AI·관리자', aka: 'System AI / Administrator',
        def: '안내자 AI·관리자·\'시스템\' 자체가 인격을 가진 존재로 등장하는 장치(전독시의 도깨비, 솔로레벨링의 시스템). 세계관 비밀의 화자 역할도 겸한다.',
        how: '시스템에 말투·성격·의도를 부여해 단순 UI를 캐릭터로 격상시켜라. 친절·중립·조롱·냉혹 중 톤을 정하고, 그 인격이 "정보를 주되 다 주지 않는" 방식으로 미스터리를 운용하라. 후반 떡밥(누가 만들었나)의 입이 된다.',
        example: '전지적 독자 시점 — 도깨비들이 시나리오를 진행·중계하고 코인을 분배하며, 그들 배후의 \'성좌\'·\'스타 스트림\'이라는 거대한 관전 구조를 드러낸다.',
        twist: '친절한 안내자가 사실 적이거나, 시스템 AI가 자아·감정을 갖고 규칙을 어겨 주인공 편이 되게 하라. 도구였던 존재가 운명의 동반자·배신자가 된다.',
      },
      {
        name: '도움말·감정·검색', aka: 'Inspect / Appraise',
        def: '대상을 살펴 정보(이름·등급·약점·내력)를 읽어내는 정보계 스킬·기능. 정보 비대칭을 직접 조작하는 장치.',
        how: '감정 스킬의 등급을 두어 "더 높은 감정 = 더 깊은 진실"을 단계적으로 풀어라. 적의 약점·내성·숨은 옵션을 미리 읽어 전술을 짜게 하면 머리싸움의 쾌감이 산다. 감정 실패·오감정으로 함정도 만든다.',
        example: '주인공이 \'관찰안\'으로 보스의 패턴과 약점 속성을 미리 읽어, 파티에게 공략법을 지시하는 정보전 장면.',
        twist: '감정 스킬에 "보면 안 되는 것을 본 대가"를 부과하거나, 감정 결과가 의도적으로 조작·은폐되게 하라. 진실을 보는 능력을 저주로 만든다.',
      },
      {
        name: '시스템 상점·코인', aka: 'System Shop / Currency',
        def: '시스템이 제공하는 상점·재화(코인·포인트)로 스킬·아이템·정보를 사고파는 장치. 성장의 선택지를 경제 문제로 바꾼다.',
        how: '"무엇에 코인을 쓸 것인가"를 캐릭터의 선택·가치관으로 드러내라. 한정·기간제·일회성 상품으로 긴장과 후회를 만들고, 재화 획득 방법(시나리오 보상·업적·거래)을 다양화해 코어 루프를 굴린다.',
        example: '전지적 독자 시점 — 시나리오 클리어로 얻은 \'코인\'으로 스탯·스킬·아이템을 구매하며, 코인 사용 전략 자체가 생존 전술이 된다.',
        twist: '상점 화폐가 "수명·기억·인간성"으로 결제되게 하거나, 빚을 지면 시스템에 종속되게 하라. 편리한 경제를 영혼을 저당 잡히는 함정으로 비튼다.',
      },
    ],
  },
  {
    key: 'growth', label: '성장·빌드', icon: '📈',
    blurb: '레벨업·스탯 분배·스킬 트리·클래스·칭호 — 강해짐을 수치로 보여주는 성장 엔진.',
    items: [
      {
        name: '레벨업·경험치', aka: 'Level Up / EXP',
        def: '경험치를 쌓아 레벨을 올리고 그때마다 보상을 받는 성장의 기본 단위. 독자가 "강해짐"을 숫자로 확인하는 Reader Promise의 핵심.',
        how: '레벨업을 회차의 보상 비트로 규칙적으로 배치하되, 후반 인플레를 대비해 "레벨당 체감 도약"을 질적으로 설계하라(단순 +1이 아니라 새 지평). 경험치 효율(사냥터·배율·기연)을 둘러싼 전략을 깔면 성장이 머리싸움이 된다.',
        example: '나 혼자만 레벨업류 — "레벨이 올랐습니다" 알림이 끊임없이 이어지며, 남들은 못 올리는 레벨을 혼자 올리는 독점적 성장이 사이다가 된다.',
        twist: '레벨이 오를수록 "잃는 것"이 생기게 하거나(인간성·기억), 레벨 상한·정체기로 양적 성장을 막아 질적 돌파만이 답이 되게 하라. 무한 성장의 쾌감에 제동을 건다.',
      },
      {
        name: '스탯 분배', aka: 'Stat Allocation',
        def: '레벨업 시 잉여 포인트를 어떤 능력치에 투자할지 고르는 선택. 그 선택이 곧 캐릭터의 정체성과 빌드가 된다.',
        how: '"근접 깡스탯 vs 마법 vs 민첩 잠입" 같은 빌드 정체성을 분배로 드러내라. 극단적 몰빵·기형적 빌드의 리스크와 보상을 명확히 하고, 잘못된 분배의 후회·재분배의 대가를 긴장으로 쓴다. 숨은 스탯(행운·매력·카르마)이 의외의 변수가 되게 하라.',
        example: '모든 포인트를 한 스탯에 몰빵해 정상적 공략을 포기하는 대신 극단적 특화로 돌파하는 "기형 빌드" 주인공.',
        twist: '한 번 분배하면 되돌릴 수 없게 해 매 선택을 무겁게 하거나, 시스템이 권하는 "정석 분배"가 사실 함정이게 하라. 자유로운 빌드를 운명적 선택으로 만든다.',
      },
      {
        name: '스킬 트리·시너지·콤보', aka: 'Skill Tree / Synergy',
        def: '스킬 습득 조건·등급(액티브/패시브)·연계기·진화를 트리로 엮은 체계. 어떤 조합을 짜느냐의 최적화 쾌감이 핵심.',
        how: '스킬 단독이 아니라 "조합 시너지"에 묘미를 두라 — A스킬이 B스킬의 조건을 열고, 둘을 엮으면 C콤보가 발동하는 식. 스킬 진화·각성·상위 스킬로 성장의 단계를 만들고, 숨은 습득 조건을 퍼즐로 깐다.',
        example: '특정 스킬을 일정 숙련도까지 올리면 상위 스킬로 진화하거나, 두 스킬의 연계로만 발동하는 히든 콤보가 보스 공략의 열쇠가 되는 전개.',
        twist: '쓸모없어 보이던 잡스킬이 특정 조합에서 사기 콤보가 되게 하거나, 스킬 트리에 "되돌릴 수 없는 분기"를 두어 한쪽을 영영 포기하게 하라. 최적해의 함정을 노출한다.',
      },
      {
        name: '클래스·전직·히든 직업', aka: 'Class / Job Change',
        def: '전직·상위 직업·히든/유니크 클래스 체계. 전직 퀘스트는 작은 아크 단위가 되고, 히든 클래스는 주인공 특별화의 단골이다.',
        how: '전직을 "통과의례"로 설계해 자격(레벨·퀘스트·시험)을 게이트로 걸어라. 히든·유니크 클래스에는 강력함과 함께 "남들이 모르는 위험·고독"을 부여해 특별함의 대가를 보인다. 직업이 곧 전투 스타일·서사 역할을 규정하게 하라.',
        example: '달빛조각사 — 위드가 아무도 택하지 않던 "전설의 직업(달빛 조각사)"을 히든 조건으로 얻어 생산·전투·예술이 융합된 유일무이한 빌드를 구축한다.',
        twist: '히든 클래스가 사실 저주받은 직업이거나, "최약체 쓰레기 직업"이 운용에 따라 최강이 되게 하라. 클래스 서열의 통념을 정면으로 뒤집는다.',
      },
      {
        name: '칭호 시스템', aka: 'Title System',
        def: '업적으로 칭호를 획득하고 그 칭호가 버프·해금 조건이 되는 장치. "최초 달성(First Clear)" 보너스가 대표적.',
        how: '칭호를 단순 장식이 아니라 "실질 버프 + 서사적 의미"로 이중 설계하라. 최초 클리어·고난도 업적·기행(奇行)으로 얻는 희귀 칭호를 차별점으로, 부정적 칭호(저주받은 자·학살자)로 낙인·갈등을 만든다.',
        example: '아무도 달성 못 한 위업을 처음 이뤄 "○○ 최초 클리어자" 칭호와 막대한 선점 보너스를 독식하는 사이다 전개.',
        twist: '명예로운 칭호가 사실 표적·족쇄가 되게 하거나, 숨기고 싶은 흑역사 칭호가 결정적 순간에 강제로 공개되게 하라. 명성의 양날을 드러낸다.',
      },
      {
        name: '쿨다운·자원관리', aka: 'Cooldown / Resource',
        def: 'MP·스태미나 소모와 "강력기는 쿨이 길다"는 제약. 무엇을 언제 쓰느냐의 자원 관리가 전투를 머리싸움으로 만든다.',
        how: '필살기에 긴 쿨다운·큰 자원 소모를 걸어 "한 번의 기회"에 긴장을 응축하라. 자원 고갈 상태에서의 위기, 쿨다운 사이의 빈틈을 전술 변수로 쓴다. 자원 회복 수단(포션·휴식·흡수)의 제한으로 장기전을 설계하라.',
        example: '최강기를 쓰고 난 직후 쿨다운 동안 무방비가 된 주인공이, 그 빈틈을 동료·꼼수로 메우는 전술 장면.',
        twist: '쿨다운·자원 제약을 깨는 "치트"를 주되 그 대가를 치명적으로 만들거나, 자원을 "타인의 것"으로 빌려 쓰게 하라. 무한 화력의 환상을 비용의 드라마로 바꾼다.',
      },
      {
        name: '버프·디버프·상태이상', aka: 'Buff / Debuff / Status',
        def: '중독·기절·출혈·화상·둔화 같은 상태이상과 지속시간. 전투의 흐름을 바꾸는 전술 변수다.',
        how: '단순 데미지 교환을 넘어 "상태이상의 중첩·해제·면역"으로 전투를 입체화하라. 디버프를 거는 빌드(상태이상 특화)와 푸는 빌드(해제·정화)의 역할을 나누고, 지속시간·스택을 둘러싼 타이밍 싸움을 만든다.',
        example: '독·출혈을 중첩시켜 압도적 스탯의 보스를 시간차로 무너뜨리는, 정면 화력이 아닌 디버프 운영 공략.',
        twist: '디버프가 사실 위장한 버프이거나(독에 적응해 면역 획득), 영구·해제 불가 상태이상으로 캐릭터의 운명을 바꿔라. 일시적 변수를 영구적 낙인으로 만든다.',
      },
    ],
  },
  {
    key: 'content', label: '퀘스트·콘텐츠·루팅', icon: '🗺️',
    blurb: '퀘스트·던전·레이드·등급/레어리티·인벤토리·강화·드랍 — 모험과 보상을 굴리는 콘텐츠 장치.',
    items: [
      {
        name: '퀘스트 시스템', aka: 'Quest System',
        def: '메인/서브/히든/연계 퀘스트로 목표를 부여하는 장치. 히든·연계 퀘스트가 플롯 분기점 역할을 하고, 실패 페널티가 긴장을 만든다.',
        how: '메인 퀘스트로 장기 목표를, 서브로 호흡 환기를, 히든·연계로 "주인공만의 특별한 길"을 열어라. 퀘스트에 시간제한·실패 페널티·선택지 분기를 걸어 무게를 주고, 보상(경험치·아이템·칭호·정보)을 명시해 동기를 가시화한다.',
        example: '남들은 받지 못하는 "히든 퀘스트"를 특정 조건으로 발동시켜 유니크 보상·클래스·세계관 비밀을 독점하는 전개.',
        twist: '거절할 수 없는 강제 퀘스트로 자유의지를 박탈하거나, 퀘스트의 진짜 의뢰인·목적이 정반대였음을 드러내라. 친절한 길잡이를 조종의 사슬로 비튼다.',
      },
      {
        name: '던전·레이드·게이트', aka: 'Dungeon / Raid / Gate',
        def: '몬스터·함정·보스로 구성된 공략 공간. 던전 하나 = 에피소드 한 덩어리로, 웹소설의 자연스러운 화 단위가 된다.',
        how: '던전마다 고유 콘셉트(기믹·테마·제한 규칙)를 주어 반복을 피하라. 입장 자격(레벨·인원·아이템)을 게이트로, 내부에 패턴 학습·자원 고갈·보스 3박자를 배치한다. 최초 공략·노데스 클리어 같은 추가 도전으로 보상을 차등화하라.',
        example: '현실 침공형 — 갑자기 열린 게이트 안의 던전을 공략하지 못하면 몬스터가 현실로 쏟아지는, 시한이 걸린 레이드 구조.',
        twist: '던전이 사실 살아 있는 생물·인격이거나(던전 코어물), 공략 대상이던 던전이 알고 보니 누군가의 무덤·감옥이게 하라. 정복의 무대를 애도·해방의 공간으로 바꾼다.',
      },
      {
        name: '등급·레어리티 체계', aka: 'Rarity / Tier',
        def: 'Common→Uncommon→Rare→Epic→Unique→Legendary→Mythic 식 등급·색상 체계. 아이템·스킬·몬스터·던전 전반에 적용되는 공통 측정자다.',
        how: '등급을 색·이름·연출로 통일해 독자가 한눈에 가치를 읽게 하라("자줏빛 = 유니크"). 등급 간 격차를 양적·질적으로 차등화하고, 상위 등급의 첫 등장을 "사건"으로 연출한다. 등급을 넘어서는 예외(등급 외·측정불가)로 특별함의 정점을 만든다.',
        example: '드랍된 아이템의 이름이 회색에서 황금색으로 빛나는 순간, 파티 전원이 숨을 죽이는 "레전더리 등장" 연출.',
        twist: '낮은 등급 아이템이 운용·조합으로 상위를 능가하게 하거나, 등급 체계 자체가 시스템이 강제한 "가치의 세뇌"였음을 폭로하라. 측정자의 권위를 의심하게 한다.',
      },
      {
        name: '인벤토리·세트·강화', aka: 'Inventory / Set / Enhance',
        def: '무게·슬롯 제한, 세트 아이템 보너스, 강화·인챈트·소켓·랜덤 옵션을 다루는 장비 시스템. 도박성 옵션 뽑기의 긴장이 핵심.',
        how: '슬롯·무게 제한으로 "무엇을 챙기고 버릴지"의 선택을 만들고, 세트 효과로 장비 수집 동기를 건다. 강화·옵션 뽑기에 성공률·실패 페널티(장비 파괴)를 두어 도박의 짜릿함과 좌절을 연출하라. 인벤토리 자체를 트릭(공간 마법·시체 보관)으로도 쓴다.',
        example: '달빛조각사 — 강화에 실패해 어렵게 모은 장비가 박살나거나, 세트 효과를 맞추려 똑같은 던전을 수십 번 도는 노가다의 서사.',
        twist: '강화 성공률·랜덤 옵션을 주인공만 "고정·조작"할 수 있게 하거나(회귀·치트), 인벤토리에 "버릴 수 없는 저주받은 아이템"을 박아 두어라. 도박의 운을 실력 또는 족쇄로 전환한다.',
      },
      {
        name: '드랍·확률·RNG', aka: 'Drop Rate / RNG',
        def: '드랍률·크리티컬·강화 성공률 같은 확률 자체를 서사적 긴장 장치로 쓰는 것. "개봉(unboxing)"의 긴장과 보상이 루팅의 쾌감을 만든다.',
        how: '보스 처치 후 드랍 개봉을 "긴장 → 해소"의 작은 클라이맥스로 연출하라. 극악의 확률을 뚫는 순간(0.01% 드랍)을 사이다로, 거듭된 꽝을 고구마로 리듬을 탄다. 확률 보정(행운 스탯·아이템)을 빌드 변수로 깔아라.',
        example: '수백 번 잡아도 안 나오던 전설 아이템이 마침내 떨어지는 순간, 또는 강화 9성에서 터지는 좌절을 수치로 보여 주는 장면.',
        twist: '주인공에게만 확률이 의도적으로 조작(상향/하향)되어 있음을 드러내거나, "확률은 환상이고 모든 결과가 정해져 있었다"는 운명론으로 뒤집어라. RNG의 무작위성 자체를 의심하게 한다.',
      },
      {
        name: '세이브·리스폰·사망 페널티', aka: 'Save / Respawn / Death Penalty',
        def: '죽으면 부활하되 경험치·아이템·레벨을 잃는 부활 규칙. 데스게임이면 영구사망으로, 부활 규칙이 장르 톤 전체를 결정한다.',
        how: '"죽음의 비용"을 명확히 정해 모든 전투의 무게를 조율하라 — 가벼운 페널티면 모험적 톤, 영구사망이면 극한 긴장. 부활 지점·횟수 제한·디버프(사망 후유증)로 위기를 설계하고, 죽음을 전략적으로 활용하는 꼼수(자살 귀환 등)도 변수로 둔다.',
        example: '데스게임형 — 단 한 번의 죽음이 곧 끝이라 모든 선택이 목숨값으로 환산되는, 안전지대 없는 긴장.',
        twist: '"부활"이 사실 복제·다른 존재로의 교체였거나, 죽을 때마다 기억·인격의 일부를 잃게 하라. 안전망이던 리스폰을 정체성 침식의 공포로 바꾼다.',
      },
    ],
  },
  {
    key: 'structure', label: '전개·구조·페이싱', icon: '🧭',
    blurb: '성장 곡선·코어 루프·파워 게이팅·수치 인플레 관리·정보 비대칭 — 장편을 굴리는 골격.',
    items: [
      {
        name: '성장 곡선 = 플롯 곡선', aka: 'Growth Curve as Plot',
        def: '약한 시작 → 단계적 강화 → 더 강한 적 → 다시 강화의 나선형 반복이 곧 플롯이 되는 LitRPG의 거시 구조. 챕터마다 "조금 더 강해짐"이 미세 보상으로 깔린다.',
        how: '매 소단위마다 "성장(수치)·보상·다음 목표 중 최소 하나"를 갱신해 추진력을 잃지 말라. 강화 → 더 센 적 → 재강화의 나선을 반복하되, 단조로움을 피하려 강화의 "종류"를 바꿔라(레벨→스킬→장비→동료→지식).',
        example: '약체 주인공이 한 단계씩 강해지며 매번 자신보다 강한 적을 만나 다시 성장하는, 끝없이 위로 감기는 나선형 전개.',
        twist: '성장 곡선을 의도적으로 꺾어 "강함의 정점에서 추락"시키거나(능력 봉인·리셋), 성장이 곧 파멸로 향하는 곡선이게 하라. 우상향의 쾌감에 비극적 그림자를 드리운다.',
      },
      {
        name: '코어 루프', aka: 'Core Loop',
        def: '사냥 → 경험치·드랍 → 레벨업·강화 → 더 센 사냥으로 도는 반복 보상 루프. 이 루프가 지루해지지 않게 변주를 투입하는 것이 페이싱의 핵심.',
        how: '루프 자체를 보상감 있게 굴리되, 일정 주기마다 "신지역·신시스템·라이벌·신규 콘텐츠"를 투입해 둔감화를 막아라. 루프의 한 바퀴가 회차·소아크 단위와 맞물리게 설계한다.',
        example: '신규 사냥터 발견 → 효율적 파밍 → 레벨·장비 점프 → 더 위험한 사냥터로 이동, 이 사이클의 반복과 변주.',
        twist: '코어 루프를 깨는 "외부 사건(전쟁·재난·배신)"으로 안정된 파밍을 무너뜨리거나, 루프 자체가 누군가 설계한 "쳇바퀴"였음을 자각하게 하라. 안락한 반복을 탈출해야 할 감옥으로 비튼다.',
      },
      {
        name: '파워 게이팅', aka: 'Power Gating',
        def: '마을→필드→던전→레이드→보스→상위 지역으로 난이도를 구획하고, 각 진입에 자격(레벨·아이템·퀘스트) 게이트를 두는 구조. 성장 동기의 엔진.',
        how: '구획마다 "들어가려면 이만큼 강해져야 한다"는 명확한 벽을 세워 단기 목표를 만들어라. 게이트를 정공법(자격 충족)과 꼼수(우회·자격 위조)로 넘는 두 길을 열어 두면 빌드·전략의 묘미가 산다.',
        example: '특정 레벨·장비가 없으면 입장 자체가 막히는 상위 던전이, 주인공의 다음 성장 목표를 자연히 지정하는 구조.',
        twist: '게이트를 자격 미달인 채로 "꼼수·각오"로 돌파하게 하거나, 어렵게 넘은 게이트 너머가 사실 함정이게 하라. 성장의 질서를 무모함의 도박으로 비튼다.',
      },
      {
        name: '명확한 목표 위계', aka: 'Goal Hierarchy',
        def: '다음 레벨·다음 던전·다음 보스·다음 랭킹처럼 단기·중기·장기 목표가 동시에 굴러가는 구조. 독자가 늘 "다음에 뭘 향하는지" 알게 한다.',
        how: '회차 단위 단기 목표, 소아크 단위 중기 목표, 작품 전체의 장기 목표를 항상 동시에 노출하라. 단기 목표를 자주 달성해 보상감을 주되, 그것이 중·장기 목표로 연결되게 사슬을 건다.',
        example: '"이번 화엔 이 보스를 잡고(단기), 이 던전을 클리어해(중기), 결국 탑 최상층에 오른다(장기)"가 한 호흡에 보이는 전개.',
        twist: '장기 목표가 도중에 무의미해지거나(도달하니 의미 상실), 진짜 최종 목표가 숨겨져 있었음을 드러내라. 명확하던 위계를 통째로 재배열한다.',
      },
      {
        name: '수치 인플레 관리', aka: 'Power Creep Control',
        def: '후반으로 갈수록 숫자가 커져 감흥이 둔해지는 LitRPG의 구조적 약점을, 단위 리셋·상대평가·질적 보상으로 보완하는 페이싱 기법.',
        how: '양적 인플레가 한계에 다다르면 "단위 리셋(차원·등급 개편)"으로 판을 갈아엎거나, 절대 수치 대신 "랭킹·상대평가"로 긴장을 유지하라. 큰 숫자보다 "남이 못 가진 고유 능력(질적 보상)"으로 특별함을 전환한다.',
        example: '레벨·스탯 숫자가 무의미해질 즈음, "경지·차원·격" 같은 새로운 상위 척도를 도입해 성장의 척도 자체를 갈아 끼우는 전개.',
        twist: '인플레를 정면으로 풍자해 "숫자가 다 무슨 의미냐"를 주제로 삼거나, 가장 약한 수치의 주인공이 인플레된 강자를 이기게 하라. 수치 경쟁의 허무를 폭로한다.',
      },
      {
        name: '정보 비대칭·미래지식 운용', aka: 'Information Asymmetry',
        def: '회귀·원작지식형이 "주인공만 아는 미래"로 서스펜스 대신 \'언제 어떻게 써먹나\'의 기대감을 운용하는 페이싱.',
        how: '독자에게 "주인공이 무엇을 아는지"를 일부 공유해 "저 정보를 언제 터뜨릴까"의 기대감을 깔아라. 지식이 통하는 사이다와, 지식이 어긋나는 변수(나비효과)를 교차해 전지의 지루함을 막는다.',
        example: '전지적 독자 시점 — 원작의 전개를 아는 주인공이 미래의 위기를 미리 대비하지만, 자신의 개입으로 원작이 뒤틀리며 예측이 빗나가기 시작한다.',
        twist: '"나만 아는 줄 알았던 정보를 적도 알고 있었다"거나, 알던 미래가 의도된 가짜 정보였음을 드러내라. 정보 우위를 정보 함정으로 뒤집는다.',
      },
      {
        name: '페이싱 황금비·완급', aka: 'Pacing Balance',
        def: '전투·성장(쾌감) 70% : 휴식·인간관계·세계관(완급) 30% 정도의 체감 균형. 연속 전투만 이어지면 보상 둔감화(파워 인플레 피로)가 온다.',
        how: '강한 전투·성장 비트 사이에 휴식·관계·세계관 호흡을 의도적으로 끼워 보상의 민감도를 회복하라. 일상·생산·동료와의 시간이 다음 전투의 긴장을 충전한다. 완급의 리듬을 소아크 단위로 설계하라.',
        example: '치열한 레이드 직후 마을에서의 정비·동료와의 대화·다음 목표 설정으로 호흡을 고르는 "막간" 구성.',
        twist: '의도적으로 휴식을 박탈해 숨 막히는 연속 위기로 몰거나, "안전한 막간"이 사실 가장 위험한 함정이게 하라. 완급의 안도를 불안으로 비튼다.',
      },
    ],
  },
  {
    key: 'climax', label: '클라이맥스·관습', icon: '⚔️',
    blurb: '보스 레이드·한계 돌파·복선 회수·시스템의 배후·랭킹전 — 절정의 카타르시스 설계.',
    items: [
      {
        name: '보스 레이드·네임드 처치', aka: 'Boss Raid',
        def: '게임판타지·LitRPG의 가장 전형적 클라이맥스 단위. "패턴 파악 → 전멸 위기 → 역전 변수(히든스킬·각성·아이템·동료 희생)" 3박자로 굴러간다.',
        how: '보스의 강함·패턴을 미리 충분히 증명해 승리를 값지게 하라. 전멸 직전까지 몰아붙인 뒤, 그동안 쌓은 빌드·정보·동료가 톱니처럼 맞물리는 역전 변수를 터뜨려라. 보스의 HP %·페이즈 전환을 긴장의 눈금으로 쓴다.',
        example: '레이드 보스가 마지막 페이즈에서 전멸기를 쓰기 직전, 주인공의 히든 스킬·동료의 희생·아이템 발동이 맞물려 한 끗 차로 역전하는 클라이맥스.',
        twist: '보스를 "쓰러뜨리지 않고" 이기게 하거나(설득·해방·시스템 우회), 처치한 보스가 사실 구해야 할 존재였음을 드러내라. 정복의 카타르시스에 회한을 겹친다.',
      },
      {
        name: '한계 돌파·각성', aka: 'Limit Break / Awakening',
        def: '죽기 직전 새 스킬을 각성하거나 숨겨진 잠재력을 개방해 역전하는 연출. "조건 충족: [○○] 발동" 시스템 메시지로 역전을 정당화한다.',
        how: '각성의 "방아쇠"를 감정·각오의 한계점(소중한 것의 상실, 분노, 결심)에 두고, 그 직전까지 충분히 무력했어야 해방이 카타르시스가 된다. 각성의 복선(잠재 스탯·봉인된 스킬·미달 조건)을 미리 깔아 데우스 엑스 마키나를 피하라.',
        example: '전멸 직전 "[히든 조건 충족 — 각성]" 메시지와 함께 봉인됐던 진짜 힘이 개방되며 전세가 뒤집히는, 시스템이 보증하는 역전.',
        twist: '각성한 진짜 힘이 사실 저주이거나, 각성의 대가로 인간성·기억·동료를 잃게 하라. 또는 각성을 끝내 "거부"하는 선택으로 인간으로 남기를 택하게 한다.',
      },
      {
        name: '복선의 일괄 회수', aka: 'Payoff Convergence',
        def: '앞서 심어 둔 시스템 규칙·스킬 조합·아이템·정보가 클라이맥스에서 결정타로 한꺼번에 회수되는 카타르시스. 규칙이 명시적인 LitRPG에서 특히 강력하다.',
        how: '회수할 순간을 먼저 정하고 거꾸로 복선을 심어라(역설계). 무심히 깔아 둔 잡스킬·낡은 아이템·사소한 시스템 규칙이 "아, 그래서!"의 쾌감으로 터지게 하라. 절정에서 새 능력을 갑툭튀시키는 것은 최대 금기.',
        example: '초반에 쓸모없어 보이던 스킬·아이템·시스템 규칙이 최종 보스 공략의 유일한 해법으로 한꺼번에 맞물리는 결말.',
        twist: '독자가 "복선"이라 믿은 것들이 모두 레드 헤링이고 진짜 열쇠는 무시당하던 곳에 있었거나, 회수가 비극적 방향으로 터지게 하라. 회수의 방향 자체를 비튼다.',
      },
      {
        name: '랭킹전·경쟁·PvP', aka: 'Ranking / PvP',
        def: '길드·랭커·순위표·명성으로 사회적 인정을 수치화한 경쟁. 랭킹전·결투·세력전이 클라이맥스의 무대가 된다.',
        how: '랭킹을 단순 숫자가 아니라 "라이벌·세력·자존심"의 드라마로 채워라. PvP는 PvE와 달리 "상대의 빌드·심리·메타"를 읽는 머리싸움으로 설계하고, 순위 역전·하극상·최강자 도전을 사이다로 배치한다.',
        example: '무명의 주인공이 공식 랭킹전에서 부동의 1위 랭커를 꺾어 순위표를 뒤집는, 명성의 하극상 클라이맥스.',
        twist: '랭킹 시스템 자체가 조작·세력에 의해 왜곡돼 있음을 폭로하거나, 정점에 오른 주인공이 "랭킹의 무의미"를 깨닫고 판을 떠나게 하라. 경쟁의 권위를 해체한다.',
      },
      {
        name: '시스템의 의도·배후', aka: 'The System Behind',
        def: '후반부에 "이 시스템은 왜 존재하나, 누가 만들었나"가 메인 떡밥이 되는 장치. 단순 게임에서 우주적 음모(신·관리자·외계존재·탑의 주인)로 스케일업한다.',
        how: '초반의 친절한 게임 규칙에 미세한 "위화감(설명되지 않는 예외·관전자의 흔적)"을 흩뿌려 두고, 후반에 그것들을 배후의 단서로 회수하라. 시스템의 정체 폭로가 곧 작품의 거대 클라이맥스이자 주제 선언이 되게 한다.',
        example: '전지적 독자 시점 — 시나리오·코인·도깨비 너머에 \'성좌\'와 \'스타 스트림\'이라는 거대한 관전·이야기 구조가 있었음이 드러나며 스케일이 우주적으로 확장된다.',
        twist: '배후가 거창한 존재가 아니라 허무하게 작거나(고장난 코드·죽은 신·한 사람의 집착), 시스템을 만든 자가 사실 주인공 자신·미래의 나였음을 드러내라. 거대 음모를 친밀한 비극으로 환원한다.',
      },
      {
        name: '현실↔게임 환율 회수', aka: 'Reality-Game Exchange',
        def: '게임 내 재화·성과가 현실 지위·권력으로 환산되거나, 현실 침공형에서 게임 능력이 현실 권력이 되는 연동의 클라이맥스적 활용.',
        how: '"게임에서 쌓은 것"이 현실의 결정적 순간에 회수되게 사슬을 걸어라 — 게임 머니가 현실 빚을 갚고, 게임 명성이 현실 지위가 되고, 게임 능력이 현실 위기를 푼다. 두 세계의 판돈을 한 장면에 수렴시킨다.',
        example: '달빛조각사 — 게임 속에서 쌓은 부와 위명이 현실의 가난·무시를 단번에 뒤집는, 두 세계가 맞닿는 사이다.',
        twist: '게임의 성공이 현실에선 독·표적이 되거나, 두 세계의 환율이 역전돼 현실이 게임에 종속되게 하라. 또는 게임과 현실의 경계 자체가 무너지게 한다.',
      },
    ],
  },
]

// 조합수: 각 항목은 [정의·사용법·예시·비틀기] 4개의 독립 "관점(facet)"을 갖는다.
// 무작위 영감 4연은 사전 항목 N개에서 "서로 다른 4장을 순서대로 뽑고(P(N,4)), 각 장마다
// 4개 관점 중 하나를 골라 비추는" 식으로 카드를 만든다. 따라서 실제 생성 가지수는
// P(N,4) × 4^4 로, 아래 표기 조합수와 정확히 일치한다(허수 아님).
const ALL_ITEMS = (): { cat: CatDef; item: Device }[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))
const TOTAL = CATS.reduce((n, c) => n + c.items.length, 0)
// 관점(facet) 키 — 영감 4연이 각 카드마다 하나를 골라 비춘다.
const FACETS: { key: 'def' | 'how' | 'example' | 'twist'; label: string }[] = [
  { key: 'def', label: '정의' }, { key: 'how', label: '사용법' }, { key: 'example', label: '예시' }, { key: 'twist', label: '비틀기' },
]
// 영감 조합수: 서로 다른 4항목 순열(P(N,4)) × 4개 관점 배정(4^4). 실제 생성 가지수.
const combos = (() => {
  const N = TOTAL
  const perm4 = N * (N - 1) * (N - 2) * (N - 3)
  return perm4 * 4 * 4 * 4 * 4
})()
const fmtCombos = (n: number): string => {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(2) + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(1) + '만'
  return String(n)
}

const escapeHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const plain = (s: { cat: CatDef; item: Device }): string =>
  `${s.item.name}${s.item.aka ? ` (${s.item.aka})` : ''}  [${s.cat.icon} ${s.cat.label}]\n` +
  `[정의] ${s.item.def}\n` +
  `[사용법] ${s.item.how}\n` +
  `[예시] ${s.item.example}\n` +
  `[비틀기] ${s.item.twist}`

// 관련 도구(연계) — LitRPG 장치 사전에서 자연히 이어지는 도구들(있으면 열림, 없으면 무동작 graceful)
const RELATED: { id: string; label: string; icon: string }[] = [
  { id: 'litrpg-sceneforge', label: 'LitRPG 장면 생성기', icon: '🎮' },
  { id: 'litrpg-signature', label: '시스템 시그니처 생성기', icon: '🖥️' },
  { id: 'litrpg-tropes', label: 'LitRPG 트로프 점검', icon: '📐' },
  { id: 'litrpg-lexicon', label: 'LitRPG 어휘 사전', icon: '📜' },
  { id: 'genre-conventions', label: '장르 관습 체크리스트', icon: '📐' },
  { id: 'hero-journey-map', label: '영웅의 여정 맵', icon: '🧭' },
]

const GENRE = '게임판타지·LitRPG'
const FOLDER = 'LitRPG 장치'

export default function LitrpgDevices({ payload }: { payload?: Record<string, unknown> }) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try { const raw = localStorage.getItem(LS + 'cat'); if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw } catch { /* ignore */ }
    return ALL_KEY
  })
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try { const raw = localStorage.getItem(LS + 'open'); if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> } } catch { /* ignore */ }
    return {}
  })
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try { const raw = localStorage.getItem(LS + 'favs'); if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> } } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  // 무작위 영감(4장) — 각 장은 비출 관점(facet)을 함께 가진다
  const [spark, setSpark] = useState<{ cat: CatDef; item: Device; facet: typeof FACETS[number] }[] | null>(null)
  const [random, setRandom] = useState<{ cat: CatDef; item: Device } | null>(null) // 무작위 1개
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const mounted = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // payload.cat 으로 초기 카테고리 지정(연계 진입). payload.genre 는 참고용.
  useEffect(() => {
    try {
      const c = payload && typeof payload.cat === 'string' ? payload.cat : ''
      if (c && CATS.some((x) => x.key === c)) setCat(c)
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 영속 저장(graceful)
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'open', JSON.stringify(open)) } catch { /* ignore */ } }, [open])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  // 언마운트 정리
  useEffect(() => () => {
    mounted.current = false
    if (copyTimer.current) clearTimeout(copyTimer.current)
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  const itemKey = (catKey: string, name: string) => `${catKey}::${name}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = cat === ALL_KEY ? ALL_ITEMS() : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[itemKey(c.key, item.name)])
    if (q) base = base.filter(({ cat: c, item }) =>
      item.name.toLowerCase().includes(q) ||
      (item.aka ? item.aka.toLowerCase().includes(q) : false) ||
      item.def.toLowerCase().includes(q) ||
      item.how.toLowerCase().includes(q) ||
      item.example.toLowerCase().includes(q) ||
      item.twist.toLowerCase().includes(q) ||
      c.label.toLowerCase().includes(q))
    return base
  }, [query, cat, onlyFav, favs])

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { if (mounted.current) setToast(null) }, 2200)
  }

  // 무작위 1개(현재 카테고리/검색 풀에서, 직전과 중복 회피)
  const rollRandom = useCallback(() => {
    const pool = filtered.length ? filtered : ALL_ITEMS()
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.name === prev.item.name && pick.cat.key === prev.cat.key) pick = pool[Math.floor(Math.random() * pool.length)]
      return pick
    })
    setSpark(null)
  }, [filtered])

  // 무작위 영감: 서로 다른 4장(전체 풀) 순서대로 뽑고 각 장마다 관점 하나를 골라 비춤 → 충돌·교배 발상용
  const rollSpark = useCallback(() => {
    const pool = ALL_ITEMS()
    if (pool.length < 4) { setSpark(null); return }
    const idx: number[] = []
    while (idx.length < 4) { const r = Math.floor(Math.random() * pool.length); if (!idx.includes(r)) idx.push(r) }
    setSpark(idx.map((i) => ({ ...pool[i], facet: FACETS[Math.floor(Math.random() * FACETS.length)] })))
    setRandom(null)
  }, [])

  const toggleOpen = (catKey: string, name: string) => {
    const k = itemKey(catKey, name)
    setOpen((prev) => { const n = { ...prev }; if (n[k]) delete n[k]; else n[k] = true; return n })
  }
  const toggleFav = (catKey: string, name: string) => {
    const k = itemKey(catKey, name)
    setFavs((prev) => { const n = { ...prev }; if (n[k]) delete n[k]; else n[k] = true; return n })
  }
  const expandAll = () => { const n: Record<string, boolean> = {}; filtered.forEach(({ cat: c, item }) => { n[itemKey(c.key, item.name)] = true }); setOpen((prev) => ({ ...prev, ...n })) }
  const collapseAll = () => setOpen({})

  const copy = (text: string, id: string) => {
    if (!text) return
    const done = () => { if (!mounted.current) return; setCopiedKey(id); if (copyTimer.current) clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => { if (mounted.current) setCopiedKey((c) => (c === id ? null : c)) }, 1500) }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(() => {})
      else { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done() }
    } catch { /* graceful */ }
  }

  // 글감 스니펫 저장
  const saveSnippet = (s: { cat: CatDef; item: Device }) => {
    addToLibrary('snippets', { text: plain(s), source: 'LitRPG 서사 장치 사전', tags: [GENRE, '서사장치', s.cat.label, s.item.name] })
    showToast(`스니펫 보관함에 ‘${s.item.name}’을(를) 저장했습니다.`)
  }

  // 프로젝트 자료 〈LitRPG 장치〉 폴더에 단일 항목 문서로 추가
  const addItemToProject = (s: { cat: CatDef; item: Device }) => {
    if (!hasProjectBridge()) { showToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = [
      `<p><b>${escapeHtml(s.cat.icon + ' ' + s.cat.label)} · ${escapeHtml(s.item.name)}${s.item.aka ? ` <i>(${escapeHtml(s.item.aka)})</i>` : ''}</b></p>`,
      `<p><b>정의</b> · ${escapeHtml(s.item.def)}</p>`,
      `<p><b>사용법</b> · ${escapeHtml(s.item.how)}</p>`,
      `<p><b>예시</b> · ${escapeHtml(s.item.example)}</p>`,
      `<p><b>비틀기</b> · ${escapeHtml(s.item.twist)}</p>`,
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: FOLDER,
      title: `${s.item.name}${s.item.aka ? ` (${s.item.aka})` : ''}`,
      bodyHtml,
      meta: { 장르: GENRE, 분류: s.cat.label, 장치: s.item.name },
    })
    showToast(id ? `프로젝트 자료 〈${FOLDER}〉에 ‘${s.item.name}’을(를) 추가했습니다.` : '프로젝트에 추가하지 못했습니다.')
  }

  // 현재 보기(필터된 전체)를 한 편의 문서로 프로젝트에 추가
  const addViewToProject = () => {
    if (!hasProjectBridge()) { showToast('프로젝트에 연결되어 있지 않습니다.'); return }
    if (filtered.length === 0) { showToast('추가할 항목이 없습니다.'); return }
    const catL = cat === ALL_KEY ? '전체' : (CATS.find((c) => c.key === cat)?.label || '전체')
    const parts: string[] = [`<p><b>🎮 LitRPG 서사 장치·전개 — ${escapeHtml(catL)} (${filtered.length}개)</b></p>`]
    filtered.forEach(({ cat: c, item }) => {
      parts.push(`<h3>${escapeHtml(c.icon + ' ' + item.name)}${item.aka ? ` (${escapeHtml(item.aka)})` : ''}</h3>`)
      parts.push(`<p><b>정의</b> · ${escapeHtml(item.def)}</p>`)
      parts.push(`<p><b>사용법</b> · ${escapeHtml(item.how)}</p>`)
      parts.push(`<p><b>예시</b> · ${escapeHtml(item.example)}</p>`)
      parts.push(`<p><b>비틀기</b> · ${escapeHtml(item.twist)}</p>`)
    })
    const id = addToProject({ kind: 'text', root: 'research', folder: FOLDER, title: `LitRPG 서사 장치 — ${catL} (${filtered.length})`, bodyHtml: parts.join(''), meta: { 장르: GENRE, 분류: catL, 항목수: String(filtered.length) } })
    showToast(id ? `프로젝트 자료 〈${FOLDER}〉에 ${filtered.length}개 항목 문서를 추가했습니다.` : '프로젝트에 추가하지 못했습니다.')
  }

  // 영감 4연 → 프로젝트 메모로 추가(교배 발상). 각 카드는 골라 비춘 관점(facet)으로 표시.
  const addSparkToProject = () => {
    if (!spark) return
    if (!hasProjectBridge()) { showToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = [
      `<p><b>🃏 LitRPG 장치 교배 영감 (4연)</b></p>`,
      `<ul>${spark.map((s) => `<li><b>${escapeHtml(s.item.name)}</b> <i>(${escapeHtml(s.cat.label)})</i> — <b>${escapeHtml(s.facet.label)}</b>: ${escapeHtml(s.item[s.facet.key])}</li>`).join('')}</ul>`,
      `<p>위 4가지 장치(와 비춘 관점)를 충돌·교배해 하나의 새 장치/장면을 빚어 보세요.</p>`,
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: FOLDER, title: `LitRPG 장치 교배 영감 (${spark.map((s) => s.item.name).join(' × ')})`, bodyHtml, meta: { 장르: GENRE, 분류: '영감 교배' } })
    showToast(id ? `프로젝트 자료 〈${FOLDER}〉에 영감 4연을 추가했습니다.` : '프로젝트에 추가하지 못했습니다.')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden', fontSize: 14 }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginRight: 6 }
  const lineStyle: React.CSSProperties = { fontSize: 13, lineHeight: 1.6, marginTop: 6 }
  const input: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }

  const renderDetail = (item: Device) => (
    <>
      <div style={lineStyle}><span style={labelStyle}>정의</span>{item.def}</div>
      <div style={lineStyle}><span style={labelStyle}>사용법</span>{item.how}</div>
      <div style={lineStyle}><span style={labelStyle}>예시</span>{item.example}</div>
      <div style={lineStyle}><span style={{ ...labelStyle, color: 'var(--warn)' }}>비틀기</span>{item.twist}</div>
    </>
  )

  const catLabel = cat === ALL_KEY ? '전체' : (CATS.find((c) => c.key === cat)?.label || '전체')

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>게임판타지·LitRPG</b> 고유의 서사 장치(상태창·시스템 메시지·레벨업·스탯 분배·스킬 트리·퀘스트·클래스·등급·칭호·RNG·시스템 AI·회귀+게임지식·시스템의 배후…)와 전개·페이싱·클라이맥스 관습 <b>{TOTAL}개</b>를 <b>정의·사용법·예시·비틀기</b>로 정리했습니다. 무작위 영감 조합 <b>약 {fmtCombos(combos)}가지</b>.
      </div>

      {/* 검색 */}
      <input value={query} onChange={(e) => setQuery(e.target.value)} style={input}
        placeholder="장치·전개 검색 (예: 상태창, 레벨업, 스킬 트리, 히든 클래스, 데스게임, 회귀, 보스 레이드)" aria-label="검색" />

      {/* 카테고리 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}><Emoji e="🎮"/> 전체</button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on} title={c.blurb}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}><Emoji e={c.icon}/> {c.label}</button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom}><Emoji e="🎲"/> 무작위 장치</button>
        <button className="minibtn" onClick={rollSpark} title="서로 다른 장치 4개를 뽑고 관점까지 굴려 교배·충돌 발상"><Emoji e="🃏"/> 영감 4연</button>
        <button className="minibtn" onClick={expandAll}>⊕ 모두 펼치기</button>
        <button className="minibtn" onClick={collapseAll}>⊖ 모두 접기</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>{onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}</button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 연계 + 현재 보기 프로젝트 추가 */}
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={addViewToProject} disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? `현재 보기(${catLabel} ${filtered.length}개)를 프로젝트 자료 〈${FOLDER}〉 폴더에 한 문서로 추가` : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        {RELATED.map((r) => (
          <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: GENRE })} title={`${r.label} 열기`}><Emoji e={r.icon}/> {r.label}</button>
        ))}
      </div>

      {/* 무작위 영감 4연 */}
      {spark && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}><Emoji e="🃏"/> 영감 4연 — 4가지 장치와 관점을 충돌·교배해 새 장치를 빚어 보세요</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={rollSpark}>↻ 다시</button>
            <button className="minibtn" onClick={() => setSpark(null)}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {spark.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
                <span style={{ fontSize: 11, color: 'var(--accent)', flexShrink: 0 }}><Emoji e={s.cat.icon}/> {s.cat.label}</span>
                <b>{s.item.name}</b>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--warn)', flexShrink: 0 }}>{s.facet.label}</span>
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>{s.item[s.facet.key]}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(spark.map((s) => `• ${s.item.name} [${s.facet.label}] — ${s.item[s.facet.key]}`).join('\n'), 'spark')}>{copiedKey === 'spark' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
            <button className="minibtn" onClick={() => { addToLibrary('snippets', { text: 'LitRPG 장치 교배 영감(4연)\n' + spark.map((s) => `• ${s.item.name} (${s.cat.label}) [${s.facet.label}] — ${s.item[s.facet.key]}`).join('\n'), source: 'LitRPG 서사 장치 사전', tags: [GENRE, '영감', '교배'] }); showToast('영감 4연을 스니펫으로 저장했습니다.') }}><Emoji e="📌"/> 스니펫 저장</button>
            <button className="linkbtn" onClick={addSparkToProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? `영감 4연을 프로젝트 자료 〈${FOLDER}〉 폴더에 메모로 추가` : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
          </div>
        </div>
      )}

      {/* 무작위 1개 카드 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon}/> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            {random.item.aka && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{random.item.aka}</span>}
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={rollRandom}>↻ 다시</button>
            <button className="minibtn" onClick={() => setRandom(null)}>✕</button>
          </div>
          {renderDetail(random.item)}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(plain(random), 'rand')}>{copiedKey === 'rand' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="📌"/> 스니펫 저장</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>{favs[itemKey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}</button>
            <button className="linkbtn" onClick={() => addItemToProject(random)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? `이 장치를 프로젝트 자료 〈${FOLDER}〉 폴더에 추가` : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5 }}>✓ {toast}</div>}

      {/* 목록(펼침형) */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 장치가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const k = itemKey(c.key, item.name)
            const isOpen = !!open[k]
            const isFav = !!favs[k]
            const copyId = 'item:' + k
            return (
              <div key={k} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => toggleOpen(c.key, item.name)} role="button" aria-expanded={isOpen}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', width: 14, flexShrink: 0 }}>{isOpen ? '▾' : '▸'}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon}/></span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</span>
                  {item.aka && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{item.aka}</span>}
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={(e) => { e.stopPropagation(); toggleFav(c.key, item.name) }}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>{isFav ? '★' : '☆'}</button>
                </div>
                {!isOpen && (
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 5, marginLeft: 22, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.def}</div>
                )}
                {isOpen && (
                  <div style={{ marginLeft: 22 }}>
                    {renderDetail(item)}
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      <button className="minibtn" onClick={(e) => { e.stopPropagation(); copy(plain({ cat: c, item }), copyId) }}>{copiedKey === copyId ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
                      <button className="minibtn" onClick={(e) => { e.stopPropagation(); saveSnippet({ cat: c, item }) }}><Emoji e="📌"/> 스니펫 저장</button>
                      <button className="linkbtn" onClick={(e) => { e.stopPropagation(); addItemToProject({ cat: c, item }) }} disabled={!hasProjectBridge()}
                        title={hasProjectBridge() ? `이 장치를 프로젝트 자료 〈${FOLDER}〉 폴더에 추가` : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>장치는 목적이 아니라 도구입니다. <b>관습(정의·사용법)</b>은 독자와의 약속이니 충실히 지키되, <b>비틀기</b>로 클리셰를 전복해 신선함을 만드세요. LitRPG는 <b>성장의 수치화·시스템의 공정성</b>이 약속이고, 클라이맥스는 <b>복선 회수·한계 돌파</b>가, 후반은 <b>시스템의 배후</b>가 카타르시스를 만듭니다.</div>
    </div>
  )
}
