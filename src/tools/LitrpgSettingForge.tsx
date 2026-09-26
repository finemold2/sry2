// 게임판타지·LitRPG 배경·현장 생성기(LitrpgSettingForge) — 던전·게이트·필드·세이프존·게임 속 도시를
//   슬롯 조합으로 무작위 생성. 4분기(VR 다이브 / 데스게임 / 이세계+시스템 / 현실 침공)별 색채를 반영.
//   슬롯별 🔒 잠금 + 🎲 부분 재생성, 전체 조합수(1조+) 표시.
//   연계(linkbus): addToProject(kind:'setting', folder:'장소') 로 프로젝트 바인더에 장소 카드 추가,
//   장소 라이브러리(addToLibrary 'places')에 저장, 관련 도구(배경 설정집/장면/감각 팔레트 등) 열기.
// import 는 react 와 './linkbus' 만 사용한다(다른 모듈 금지).
import { useMemo, useState, useEffect, useRef } from 'react'
import { addToLibrary, openToolLinked, addToProject, hasProjectBridge, TOOL_RELATIONS, Emoji, emojify } from './linkbus'

export const meta = { id: 'litrpg-settingforge', name: 'LitRPG 배경 생성기(1조+ 조합)', icon: '🗺️', group: '배경', genre: '게임판타지·LitRPG', intro: '던전·게이트·세이프존·게임 속 도시를 시스템 색채와 함께 빚어내는 게임판타지·LitRPG 전용 배경 생성기', w: 560, h: 680 }

const LS_KEY = 'sry:tool:litrpg-settingforge'

// 관련 도구 이름표(연계 버튼 라벨용)
const REL_LABEL: Record<string, string> = {
  'setting-bible': '🗺️ 배경 설정집',
  'scene-list': '🎬 장면 목록',
  'scene-forge': '🎬 장면 생성기',
  'sensory-palette': '🌫 감각 팔레트',
  'moodboard-grid': '🧩 무드보드',
  'imagination-gallery': '🖼 상상력 갤러리',
  'world-wiki': '📚 세계관 위키',
}

// 4분기(첫 선택지) — 분기에 따라 톤/금기/연출이 갈린다(도시에 0장).
type Branch = 'vr' | 'death' | 'isekai' | 'invasion'
interface BranchDef { key: Branch; label: string; icon: string; tag: string; note: string }
const BRANCHES: BranchDef[] = [
  { key: 'vr', label: 'VR 다이브형', icon: '🕹️', tag: 'VRMMORPG', note: '현실의 인간이 가상현실 게임에 접속. 로그아웃·현금화·길드 경제가 살아 있다(달빛조각사·로열로드 계열).' },
  { key: 'death', label: '갇힘·데스게임형', icon: '💀', tag: '데스게임', note: '게임에서 못 나오고, 죽으면 진짜 죽는다. 긴장 최상 — "안전지대"라는 말조차 의심스럽다(SAO 계열).' },
  { key: 'isekai', label: '이세계+시스템형', icon: '🌌', tag: '이세계 시스템', note: '넘어간 세계에 게임 시스템이 깔려 있다. 로그아웃 개념 없음, 이곳이 곧 현실(나 혼자만 레벨업 계열).' },
  { key: 'invasion', label: '현실 침공형', icon: '🌐', tag: '시스템 아포칼립스', note: '어느 날 현실에 상태창·게이트·던전이 생겼다. 헌터·각성자가 일상과 뒤섞인다(전지적 독자 시점 계열).' },
]

interface Slot { key: string; label: string; options: string[]; per?: Partial<Record<Branch, string[]>> }

// 게임판타지·LitRPG 도시에에 근거한 자작 데이터 — 일반론이 아닌 장르 특화·구체.
// per: 분기별로 갈아끼우는 옵션(있으면 공통 options 대신 분기 옵션을 사용 → 분기마다 색채가 달라진다).
const SLOTS: Slot[] = [
  {
    key: 'locale', label: '현장(장소)',
    options: [
      '초보자 사냥터로 통하는 마을 동쪽 들판', '몬스터 리스폰 안개가 자욱한 던전 1층 입구',
      '랭커들의 이름이 빛나는 광장의 명예의 전당 석판', '경매장과 노점이 뒤엉킨 중앙 마켓 거리',
      '대장간 화로가 붉게 타오르는 강화·인챈트 공방', '길드 깃발이 줄지어 걸린 길드 회관 로비',
      '보스룸으로 통하는 봉인된 미궁의 마지막 회랑', '필드 보스가 출현하는 자정의 폐허 협곡',
      '안전지대(세이프존)로 지정된 분수대 광장', '레이드 파티가 집결하는 던전 게이트 앞 베이스캠프',
      '드랍템을 까보는 떨림이 감도는 보물방(트레저룸)', '튜토리얼 안내가 흘러나오는 시작의 방',
      'PK가 허용되는 무법 지대(카오스 필드)의 갈림길', '경험치 효율 좋기로 소문난 숨은 골드 던전',
      '히든 클래스 전직 퀘스트가 시작되는 폐신전 제단', '서버 최초 클리어가 걸린 미공략 던전의 첫 방',
      '버려진 NPC 마을의 텅 빈 여관 카운터', '하늘섬으로 이어지는 부유 정거장의 포탈 게이트',
      '경쟁 길드와 영지전이 벌어지는 성벽 위 공성 거점', '시세 그래프가 흐르는 거래소(트레이드 허브) 단말 앞',
      '죽으면 부활하는 리스폰 포인트(소생의 샘) 주변', '난이도 게이팅이 걸린 상위 지역 입구의 레벨 제한 결계',
      '데미지 로그가 허공에 흐르는 투기장(아레나) 중앙', '독·출혈 디버프가 만연한 늪지대 사냥터',
      '시스템 메시지가 깜빡이는 던전 코어룸', '플레이어 묘비가 늘어선 데스게임의 추모 회랑',
      '미니맵에도 안 잡히는 히든 피스(숨겨진 구역)의 좁은 틈', '쿨다운을 식히며 쉬는 모닥불(캠프파이어) 자리',
      '랭킹전 결승이 중계되는 콜로세움 관중석', 'NPC 상점주가 시세를 흥정하는 잡화상 카운터',
    ],
    per: {
      vr: [
        '로그아웃 직전 접속을 종료하는 마을 여관 침대', '현금 거래(현질) 흥정이 오가는 뒷골목 암시장',
        '캡슐방 줄지어 늘어선 현실의 PC방 겸 다이브 센터', '생산직 플레이어들이 모이는 요리·재봉 길드 작업장',
        '아이템 노가다로 골드를 긁는 채광·벌목 노가다 필드', '공식 운영진 GM이 순찰하는 신고 다발 핫스팟',
        '랭킹 1위 길드의 위용이 서린 성주의 옥좌실', '베타 테스터만 아는 숨겨진 미발견 던전 입구',
      ],
      death: [
        '클리어 전엔 절대 나갈 수 없는 봉인된 도시 성문 안', '동료의 사망 통보가 빛 입자로 흩어지는 추모비 앞',
        '"여기도 안전하지 않다"는 낙서가 새겨진 임시 거점', '플레이어 군집이 공략을 의논하는 광장의 작전 회의장',
        '단 한 번의 죽음이 곧 끝인 외나무다리 위 보스 통로', '운영자(게임 마스터)의 모습이 사라진 텅 빈 관제탑',
        '레드 길드(살인 길드)가 매복한 좁은 협곡 사냥터', '층(플로어) 보스 공략대가 전멸 위기에 몰린 대전당',
      ],
      isekai: [
        '시스템이 부여한 직업 길드의 의뢰 게시판 앞', '상태창에 "이세계"라 표기된 낯선 왕도의 성문',
        '신(神)을 자처하는 관리자의 신탁이 내려오는 대신전', '원주민과 전이자가 섞여 사는 변경 개척촌',
        '몬스터 웨이브가 주기적으로 쏟아지는 마경(魔境) 경계', '특성·스킬을 감정해주는 길드 감정소 카운터',
        '전이자만 들어갈 수 있는 히든 던전의 균열', '마왕성으로 향하는 마지막 관문의 거대 게이트',
      ],
      invasion: [
        '도심 한복판에 입을 벌린 등급 미정의 게이트', '헌터 협회 건물의 던전 의뢰·정산 창구',
        '각성자 등급 측정이 진행되는 협회 측정실', '브레이크(게이트 폭주) 직전 대피령이 내린 시가지',
        '몬스터가 쏟아진 무너진 지하철역 플랫폼', 'F급 각성자들이 헐값에 모이는 잡몹 사냥 의뢰소',
        '국가 지정 S급 던전 앞의 통제선과 군 병력', '상태창이 처음 떠오른 평범한 자취방 책상 앞',
      ],
    },
  },
  {
    key: 'era', label: '시각·기상',
    options: [
      '튜토리얼 BGM이 잔잔히 깔리는 게임 속 새벽', '몬스터 리젠이 빨라지는 게임 내 자정',
      '필드 보스가 깨어나는 붉은 달이 뜬 밤', '레이드 타임이 시작되는 정오 직후',
      '안개 디버프가 시야를 갉아먹는 흐린 아침', '눈보라 페널티로 이동속도가 깎이는 한겨울 설원',
      '독무(毒霧) 이벤트가 발생한 늪지의 황혼', '서버 점검 직후 텅 빈 로그인 첫 순간',
      '경험치 2배 버프가 걸린 주말 골든타임', '폭우로 화염 스킬 위력이 줄어드는 장맛비 속',
      '리스폰 직후 무적 시간(인빈시블)이 깜빡이는 찰나', '쿨다운이 막 돌아온 결정적 한 박자',
      'PK 페널티가 사라지는 무법의 그믐밤', '서버 최초 클리어 카운트다운이 흐르는 마지막 1분',
    ],
    per: {
      vr: [
        '현실에선 새벽 3시, 게임 속은 한낮인 시차의 순간', '로그아웃 예약 알림이 깜빡이는 접속 종료 직전',
        '서버 점검 공지가 뜬 강제 로그아웃 임박의 긴장', '주말 풀타임 사냥을 앞둔 접속 직후의 들뜸',
      ],
      death: [
        '"오늘도 누군가 죽었다"는 사망 카운트가 갱신되는 새벽', '층 공략 데드라인이 코앞인 절체절명의 한밤',
        '플레이어 수가 또 줄어든 텅 빈 광장의 황혼', '보스 리젠까지 남은 시간이 0으로 수렴하는 순간',
      ],
      isekai: [
        '이세계의 두 개 달이 겹쳐 뜬 마력 충만의 밤', '몬스터 웨이브 예고 종이 울리는 해질녘',
        '신탁이 하늘에 새겨지는 동틀 무렵', '마경의 기운이 짙어지는 식(蝕)의 한낮',
      ],
      invasion: [
        '게이트 균열 지수가 임계에 닿은 출근길 아침', '브레이크 경보 사이렌이 도시에 울려 퍼지는 밤',
        '협회 비상소집이 떨어진 새벽의 정적', '전국 게이트가 동시 활성화된 재난의 정오',
      ],
    },
  },
  {
    key: 'mood', label: '분위기',
    options: [
      '보스룸 문 앞의 숨 막히는 긴장', '드랍템을 까보기 직전의 두근거림',
      '레벨업 팡파르가 울린 직후의 벅찬 성취감', '전멸(와이프) 직전의 절체절명',
      '서버 최초 클리어를 노리는 들끓는 경쟁심', '히든 퀘스트를 발견한 자의 은밀한 흥분',
      '무시당하던 자가 실력을 드러내기 직전의 통쾌함(사이다 직전)', '강화 실패로 장비가 부서질지 모를 도박의 손떨림',
      'PK당할지 모를 무법 지대의 서늘한 경계', '랭킹이 한 칸 밀린 자의 분한 집념',
      '시스템 메시지가 곧 떠오를 듯한 기대감', '쿨다운을 기다리는 초조한 침묵',
      '디버프가 중첩되는 가운데 버텨내는 비장함', '미공략 구역에 첫발을 딛는 개척자의 설렘',
      '동료의 죽음 앞에 굳어버린 침통', '한계 돌파(리미트 브레이크)를 앞둔 떨리는 각오',
    ],
    per: {
      vr: [
        '현실의 빚을 게임으로 갚으려는 절박한 생계감', '랭커가 된 자의 우쭐한 명예욕',
        '길드 정치와 배신이 도사린 음흉한 분위기', '노가다의 지루함을 견디는 묵묵한 인내',
      ],
      death: [
        '한 번의 실수가 곧 죽음인 짓누르는 공포', '살아남는 것 외엔 아무것도 사치인 처절함',
        '"우린 정말 나갈 수 있을까"라는 체념 어린 절망', '동료를 믿어도 되는지 의심하는 불신의 냉기',
      ],
      isekai: [
        '시스템의 의도를 알 수 없는 불길한 신비감', '이 세계의 주인이 되어가는 자의 야심',
        '신을 자처하는 관리자에 대한 경외와 의심', '낯선 세계에 던져진 자의 고독한 막막함',
      ],
      invasion: [
        '일상이 무너지는 재난 영화 같은 비현실감', '약자 각성자의 짓밟히는 굴욕과 분노',
        '게이트 너머 미지에 대한 본능적 두려움', '국가도 손쓰지 못하는 무력감 속의 결단',
      ],
    },
  },
  {
    key: 'system', label: '시스템 색채',
    options: [
      '상태창과 시스템 메시지가 본문에 팝업처럼 떠오르는', 'HP·MP·스태미나 바가 시야 한구석에 떠 있는',
      '레벨·경험치·스탯 분배 알림이 끊임없이 흐르는', '스킬 트리와 연계기 시너지가 핵심인',
      '아이템 등급(노멀~유니크~레전더리)이 색으로 구분되는', '칭호(타이틀) 획득 보너스가 해금 조건이 되는',
      '히든·연계 퀘스트가 플롯 분기로 작동하는', '강화·인챈트·소켓의 랜덤 옵션 도박성이 짙은',
      '드랍률·크리티컬·성공률 같은 확률(RNG)이 긴장을 만드는', '버프·디버프·상태이상(중독·기절·출혈)이 전술 변수인',
      '쿨다운·자원관리가 전투를 머리싸움으로 만드는', '전투 로그·딜미터로 데미지 수치가 출력되는',
      '랭킹·명성·길드 평판이 수치화되어 경쟁하는', '인벤토리 슬롯·무게·세트 효과가 관리되는',
      '회귀·원작지식으로 미래 공략을 아는 자가 유리한', '히든 클래스·유니크 스킬을 단독 보유한 자가 특별한',
    ],
    per: {
      vr: [
        '현실↔게임 환율과 현금화가 권력이 되는', '운영진 GM·공지·서버 점검이 세계 규칙인',
        '생산직(요리·대장·재봉) 숙련도가 경제를 굴리는', '베타 정보·공략 위키가 정보 무기가 되는',
      ],
      death: [
        '죽으면 영구사망(영혼 소멸)이라 부활이 없는', 'HP가 0이 되면 현실의 육체도 죽는',
        '로그아웃 명령어 자체가 삭제·봉인된', '클리어 조건만이 유일한 탈출구인',
      ],
      isekai: [
        '시스템이 인격을 가진 안내자(관리자)로 말을 거는', '신(神)이 부여한 가호·축복이 스탯에 반영되는',
        '로그아웃 개념 없이 이곳이 곧 현실인', '특성·스킬을 감정·각성시키는 길드 시스템이 있는',
      ],
      invasion: [
        '각성자 등급(F~S·SS)이 사회적 신분이 된', '게이트 등급과 브레이크 카운트가 재난 지표인',
        '도깨비·관리자 같은 시스템 화자가 시나리오를 굴리는', '코인·시나리오 보상이 생존과 직결되는',
      ],
    },
  },
  {
    key: 'threat', label: '위협·몬스터',
    options: [
      '리젠된 잡몹(몬스터) 무리가 어그로를 끌고 몰려드는', '패턴을 읽어야 하는 네임드 필드 보스가 도사린',
      '광역기(AoE)와 즉사 패턴을 쓰는 레이드 보스가 잠든', '독·출혈·기절 디버프를 거는 상태이상형 몬스터가 깔린',
      '플레이어를 사냥하는 레드 네임(PK·살인귀)이 매복한', '체력이 깎일수록 페이즈가 바뀌는 다단 변신 보스가 있는',
      '소환수를 끝없이 부르는 소환형 보스(서머너)가 버티는', '약점 속성이 숨겨진 정령·골렘이 길을 막는',
      '경험치 어비스(고효율 몹)지만 한 대만 맞아도 위험한', '맵 전체에 함정·기관·즉사 트랩이 깔린',
      '버그처럼 강한 미공략 히든 보스가 잠복한', '플레이어의 스킬을 복사·반사하는 미러형 적이 있는',
    ],
    per: {
      vr: [
        '운영진이 풀어놓은 한정 이벤트 월드보스가 등장한', '현질 유저(과금러)도 쩔쩔매는 핵-난이도 던전인',
        '드랍템을 노린 다른 길드와의 자리 다툼(스틸)이 벌어지는', 'NPC인 줄 알았던 존재가 실은 적대 세력인',
      ],
      death: [
        '한 번 맞으면 죽는, 회피만이 답인 일격필살 보스가 있는', '동료를 인질로 삼는 레드 길드가 몰려드는',
        '사망 시 시신조차 빛 입자로 사라지는 처형형 함정이 깔린', '운영자도 손대지 않는 버그성 즉사 구간이 있는',
      ],
      isekai: [
        '마경에서 쏟아지는 몬스터 웨이브가 끝없이 밀려오는', '마왕군 간부(마장)가 직접 전선을 지휘하는',
        '신의 시련으로 소환된 시험형 수호자가 가로막는', '전이자를 노리는 토착 마물 무리가 추적하는',
      ],
      invasion: [
        '게이트 등급에 맞지 않는 격외(格外) 보스가 튀어나온', '브레이크로 던전 밖 현실까지 몬스터가 쏟아진',
        '도심을 짓밟는 거대 몬스터(필드형 재해)가 출현한', '각성자를 사냥하는 인간형 적·배신자 헌터가 섞인',
      ],
    },
  },
  {
    key: 'detail', label: '현장 디테일',
    options: [
      '허공에 반투명하게 떠오른 [시스템] 메시지 창', '바닥에 흩뿌려진 드랍 아이템의 등급별 빛 기둥',
      '벽에 새겨진 던전 공략 힌트와 선대 도전자의 낙서', '깨진 강화석과 부서진 장비의 잔해가 나뒹구는',
      '리스폰 포인트를 표시하는 푸른빛 마법진', '몬스터의 사체가 사라지며 남긴 골드와 전리품',
      'NPC 상점주의 머리 위에 뜬 느낌표(!) 퀘스트 표식', '미니맵·나침반이 가리키는 미답 구역의 안개',
      '경험치 바가 가득 차며 번지는 레벨업 광휘', '쿨다운 게이지가 천천히 차오르는 스킬 아이콘들',
      '강화 +수치가 새겨진 무기에서 흐르는 옵션 이펙트', '함정 발동을 알리는 빨간 경고창과 카운트다운',
      '보스의 HP 바가 화면 상단에 길게 걸린', '파티원의 HP·버프 상태가 떠 있는 진형(포메이션)',
      '딜미터에 누적되는 데미지 숫자의 잔상', '히든 피스를 여는 숨겨진 스위치와 봉인 문양',
    ],
    per: {
      vr: [
        '현금 시세표가 적힌 경매장 단말 화면', '길드 마크가 박힌 망토와 영지 깃발',
        '생산 숙련도 게이지가 오르는 작업대와 레시피북', '로그아웃 버튼이 떠 있는 시스템 메뉴창',
      ],
      death: [
        '사망자 이름이 새겨진 추모비와 빛바랜 닉네임', '클리어까지 남은 층수를 표시하는 거대 석판',
        '로그아웃 항목이 회색으로 비활성화된 메뉴', '레드 길드의 핏빛 마크가 칠해진 경고 낙서',
      ],
      isekai: [
        '시스템 안내자(관리자)의 목소리가 울리는 빈 허공', '신전 제단에 떠오른 가호·축복의 신성 문자',
        '감정소에서 빛나는 스킬·특성 감정 결과창', '이세계 통화와 길드 의뢰서가 쌓인 게시판',
      ],
      invasion: [
        '협회가 붙인 게이트 등급 표지판과 통제선', '각성자 등급이 표기된 협회 인식표(헌터 라이선스)',
        '현실 건물에 박힌 던전 균열의 검은 틈', '뉴스 속보가 흐르는 전광판과 대피 안내방송',
      ],
    },
  },
  {
    key: 'sense', label: '오감(五感)',
    options: [
      '귓가에 울리는 레벨업 효과음과 팡파르', '시야 구석에서 깜빡이는 알림창의 푸른 빛',
      '몬스터를 벨 때 손끝에 전해지는 타격감의 진동', '드랍템이 떨어지며 짤랑이는 골드 소리',
      '던전 깊은 곳의 축축한 이끼와 곰팡내', '강화로에서 피어오르는 쇳내와 마력의 열기',
      '디버프에 걸린 혀끝의 쓴 독 맛', '회복 포션이 목을 타고 내리는 서늘한 청량감',
      '스킬 시전 시 손바닥에 모이는 마력의 찌릿함', '보스의 포효가 흙바닥을 울리는 저음의 진동',
      '안개 필드의 눅눅한 습기와 시린 한기', '쿨다운이 돌아오며 울리는 맑은 차임 소리',
      '리스폰 직후 폐로 들어오는 첫 숨의 비현실감', '크리티컬 명중을 알리는 날카로운 타격음',
      '인벤토리를 여닫는 공허한 마법창 효과음', '시스템 메시지가 뜰 때 잠깐 멎는 듯한 정적',
    ],
    per: {
      vr: [
        '캡슐에서 깨어날 때 코를 찌르는 현실의 공기', '오감 동기화로 진짜처럼 느껴지는 가짜 통증',
        '경매장의 떠들썩한 호객 소리와 동전 소리', '로그아웃 직전 시야가 흐려지는 접속 종료의 감각',
      ],
      death: [
        '죽은 동료가 빛 입자로 흩어질 때의 서늘한 적막', '"이게 진짜 통증이다"라는 실감 나는 고통',
        '사망 통보음이 광장에 울려 퍼지는 둔중한 종소리', '심장 박동이 곧 목숨임을 알리는 자신의 숨소리',
      ],
      isekai: [
        '시스템 안내자의 무감정한 목소리가 머릿속에 울리는', '신성력이 살갗에 닿을 때의 따스한 떨림',
        '이세계 마력이 공기 중에 감도는 비릿한 향', '두 개 달빛 아래 낯선 풀벌레 울음',
      ],
      invasion: [
        '게이트에서 새어나오는 차갑고 비린 마기(魔氣)', '사이렌과 비명이 뒤섞인 도심의 소음',
        '각성 순간 온몸을 관통하는 전류 같은 감각', '현실의 아스팔트 냄새와 던전 너머 흙냄새의 충돌',
      ],
    },
  },
  {
    key: 'event', label: '벌어질 사건',
    options: [
      '예상 못 한 히든 퀘스트가 발동되며 분기가 열린다', '서버 최초 클리어(퍼스트 클리어) 보너스가 걸린다',
      '드랍된 유니크 아이템을 두고 분배 다툼이 벌어진다', '강화에 실패해 장비가 눈앞에서 산산이 부서진다',
      '보스가 페이즈 전환과 함께 광폭화(버서커)에 들어간다', '전멸 직전, 숨겨둔 한계 돌파 스킬이 각성한다',
      '레드 네임(PK)이 사냥터를 급습해 학살을 시작한다', '미공략 히든 보스가 봉인을 깨고 모습을 드러낸다',
      '파티원 하나가 어그로를 끌어 자신을 희생한다', '시스템이 "조건 충족: [○○] 발동" 메시지를 띄운다',
      '경험치 바가 가득 차며 직업 전직 퀘스트가 열린다', '함정이 작동해 출구가 봉인되고 카운트다운이 시작된다',
      '약점 속성을 알아챈 순간 전세가 뒤집힌다', '랭킹 라이벌과의 데미지 경쟁이 결판으로 치닫는다',
      '히든 클래스 전직 시험이 갑작스레 시작된다', '드랍률 0.01%의 전설 장비가 마침내 떨어진다',
    ],
    per: {
      vr: [
        '현질 유저 길드가 자리(스폿)를 빼앗으러 몰려온다', '운영진이 긴급 점검을 예고하며 강제 로그아웃이 임박한다',
        '현실의 빚 독촉 전화가 다이브 중 머릿속을 스친다', '생산직 노가다 끝에 대박 레시피를 손에 넣는다',
      ],
      death: [
        '동료의 HP가 0에 닿아 영구사망 통보가 뜬다', '"여기도 안전지대가 아니다"라는 진실이 드러난다',
        '클리어 조건을 두고 플레이어들이 둘로 갈라진다', '로그아웃이 막힌 채 데드라인 카운트가 0을 향한다',
      ],
      isekai: [
        '시스템 안내자가 세계관의 비밀 한 조각을 흘린다', '신을 자처하는 관리자가 새로운 시련을 선포한다',
        '마경에서 몬스터 웨이브가 예고 없이 터져 나온다', '전이자의 특이 특성이 뜻밖의 순간에 발현된다',
      ],
      invasion: [
        '게이트가 브레이크 직전 임계에 도달한다', '약자 취급받던 각성자가 숨겨온 등급을 드러낸다',
        '협회 측정 결과가 모두의 예상을 뒤엎는다', '현실로 쏟아진 몬스터가 일반인을 덮치기 시작한다',
      ],
    },
  },
  {
    key: 'terrain', label: '지형·구조',
    options: [
      '리젠 포인트가 흩어진 너른 사냥터 필드', '여러 갈래로 갈라지는 미궁형 던전 회랑',
      '보스룸으로 통하는 단 하나의 봉인 문', '함정과 기관이 깔린 좁은 비밀 통로(히든 피스)',
      '포탈 게이트가 늘어선 차원 정거장', '계단식으로 층(플로어)이 이어지는 탑 구조',
      '용암·낭떠러지가 가로지르는 즉사 지형', '안개로 시야가 막힌 늪지·습지대',
      '리스폰 마법진과 모닥불이 놓인 세이프존', '관중석이 둘러싼 원형 투기장(아레나)',
      '경매장·노점이 빼곡한 게임 속 도시 거리', '성벽과 공성 거점이 마주한 영지전 전장',
      '엘리베이터처럼 위아래로 이어진 수직 던전', '맵 밖으로 떨어지는 무한 낙하 구역의 경계',
    ],
    per: {
      vr: [
        '길드 영지와 성(城)이 들어선 점령 지역', '생산 작업장과 상점이 늘어선 마을 중심가',
        '현실의 캡슐방과 연결된 접속 로비 공간', '노가다 채집지가 펼쳐진 광산·삼림 필드',
      ],
      death: [
        '클리어 전엔 봉인된, 출구가 막힌 도시 구역', '층마다 보스가 가로막는 100층짜리 거탑',
        '플레이어가 모여 사는 임시 거점(전선 마을)', '레드 길드 영역으로 표시된 적색 위험 지대',
      ],
      isekai: [
        '왕도·변경촌이 펼쳐진 이세계 대륙', '마경과 인간 영역을 가르는 결계 경계선',
        '신전·길드가 중심을 이루는 이세계 도시', '마왕성으로 이어지는 마지막 관문 회랑',
      ],
      invasion: [
        '현실 건물 사이에 균열로 뚫린 게이트 내부', '도심 지하로 확장된 던전화된 지하 구역',
        '협회·통제선이 둘러싼 게이트 관리 구역', '브레이크로 현실과 던전이 뒤섞인 붕괴 지대',
      ],
    },
  },
  {
    key: 'goal', label: '이곳에 온 목적',
    options: [
      '레벨업과 경험치 효율을 노린 사냥', '서버 최초 클리어(퍼스트 클리어)를 노린 도전',
      '히든 클래스·유니크 스킬 전직 퀘스트 수행', '레전더리 장비를 노린 보스 레이드',
      '랭킹 상위 진입을 위한 데미지 기록 경신', '드랍률 낮은 재료를 모으는 파밍·노가다',
      '실패하면 페널티가 큰 히든 퀘스트 클리어', '강화·인챈트 재료를 확보하려는 거래',
      '미공략 구역을 처음 밟는 개척·탐사', '라이벌 길드와의 영지전·경쟁에서의 승리',
      '회귀·원작지식으로 미래의 변수를 선점하기', '동료를 구하거나 잃은 것을 되찾으려는 결의',
    ],
    per: {
      vr: [
        '현실의 빚을 갚을 골드(현금화)를 벌기 위해', '길드의 명예와 영지를 지키기 위해',
        '생산 숙련도를 올려 시장을 장악하기 위해', '랭커가 되어 현실의 지위를 끌어올리기 위해',
      ],
      death: [
        '이 게임을 클리어하고 현실로 살아 돌아가기 위해', '죽은 동료의 몫까지 끝까지 살아남기 위해',
        '로그아웃을 막은 배후의 정체를 밝히기 위해', '레드 길드로부터 약한 플레이어들을 지키기 위해',
      ],
      isekai: [
        '시스템과 신탁의 의도, 이 세계의 비밀을 밝히기 위해', '마왕·마경의 위협으로부터 세계를 구하기 위해',
        '전이자로서 살아남아 이 세계에 자리 잡기 위해', '고향(원래 세계)으로 돌아갈 단서를 찾기 위해',
      ],
      invasion: [
        '게이트 브레이크를 막아 도시를 지키기 위해', '약자에서 벗어나 강한 각성자로 거듭나기 위해',
        '시스템·시나리오의 배후를 추적하기 위해', '가족과 일상을 지킬 힘과 코인을 얻기 위해',
      ],
    },
  },
]

// 분기별 실제 옵션 배열 — 공통 풀(장르 전반) + 해당 분기 전용 풀(분기 색채)을 합쳐 쓴다.
//   이렇게 하면 도시에 기반의 풍부한 공통 데이터를 모두 살리면서, 분기마다 전용 옵션이 더해져
//   색채가 갈리고 조합수도 크게 늘어난다(슬롯별 풀이 16~38개로 커져 전체 조합 1조+ 달성).
function optsOf(s: Slot, b: Branch): string[] {
  const extra = s.per && s.per[b] ? s.per[b]! : []
  return extra.length ? s.options.concat(extra) : s.options
}

// 전체 조합수 — 현재 분기 기준 슬롯 옵션 수의 곱. (도구 규약상 핵심 생성기는 1조+ 지향)
function comboOf(b: Branch): number {
  return SLOTS.reduce((n, s) => n * optsOf(s, b).length, 1) * BRANCHES.length
}

function randIdx(n: number) { return Math.floor(Math.random() * n) }

interface SavedPreset { id: string; name: string; branch: Branch; picks: Record<string, number>; ts: number }

function loadPresets(): SavedPreset[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (Array.isArray(p)) return p as SavedPreset[]
    }
  } catch { /* noop */ }
  return []
}

// payload.genre → 분기 추정(없으면 기본 isekai 계열이 가장 보편적이나, 첫 진입은 vr 로 시작)
function branchFromPayload(payload?: Record<string, unknown>): Branch {
  const raw = (payload && typeof payload.branch === 'string' ? payload.branch : '') as string
  if (raw === 'vr' || raw === 'death' || raw === 'isekai' || raw === 'invasion') return raw
  const g = (payload && typeof payload.genre === 'string' ? payload.genre : '') as string
  const t = (g || '').toLowerCase()
  if (t.includes('데스') || t.includes('death') || t.includes('sao')) return 'death'
  if (t.includes('침공') || t.includes('헌터') || t.includes('게이트') || t.includes('각성')) return 'invasion'
  if (t.includes('이세계') || t.includes('전이') || t.includes('isekai')) return 'isekai'
  return 'vr'
}

export default function LitrpgSettingForge({ payload }: { payload?: Record<string, unknown> }) {
  const [branch, setBranch] = useState<Branch>(() => branchFromPayload(payload))
  const [picks, setPicks] = useState<Record<string, number>>(() => {
    const b = branchFromPayload(payload)
    return Object.fromEntries(SLOTS.map((s) => [s.key, randIdx(optsOf(s, b).length)]))
  })
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  // 사용자 정의 항목(라벨+값) — 무작위 생성 대상 아님(사용자가 직접 입력). 재생성 시 값만 비우고 라벨 유지.
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  // 고정 '기타' 자유 입력칸 — 항상 표시, 기본 비어 있음.
  const [etc, setEtc] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState('')
  const [presets, setPresets] = useState<SavedPreset[]>(() => loadPresets())
  const mounted = useRef(true)
  const flashTimer = useRef<number | null>(null)
  const copyTimer = useRef<number | null>(null)

  const branchDef = BRANCHES.find((x) => x.key === branch)!

  // payload.genre 안내(이 도구는 게임판타지·LitRPG 전용 데이터)
  const genreNote = useMemo(() => {
    const g = payload && typeof payload.genre === 'string' ? (payload.genre as string) : ''
    return g && g !== '게임판타지·LitRPG' ? `요청 장르 '${g}' — 이 도구는 게임판타지·LitRPG 전용 데이터로 빚습니다.` : ''
  }, [payload])

  // 프리셋 영속(localStorage)
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(presets)) } catch { /* 용량 초과 등 무시 */ }
  }, [presets])

  // 언마운트 정리(타이머 해제)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (flashTimer.current) { clearTimeout(flashTimer.current); flashTimer.current = null }
      if (copyTimer.current) { clearTimeout(copyTimer.current); copyTimer.current = null }
    }
  }, [])

  // 현재 픽 인덱스가 분기별 옵션 길이를 벗어나지 않도록 보정(분기 전환 안전).
  const clampPicks = (p: Record<string, number>, b: Branch): Record<string, number> =>
    Object.fromEntries(SLOTS.map((s) => {
      const len = optsOf(s, b).length
      const cur = p[s.key]
      return [s.key, typeof cur === 'number' && cur >= 0 && cur < len ? cur : randIdx(len)]
    }))

  const switchBranch = (b: Branch) => {
    if (b === branch) return
    setBranch(b)
    clearUserInputs()
    // 분기 전환 시 잠금 안 된 슬롯만 새로 굴리고, 잠긴 슬롯은 인덱스를 보정해 유지.
    setPicks((p) => Object.fromEntries(SLOTS.map((s) => {
      const len = optsOf(s, b).length
      if (locked[s.key]) {
        const cur = p[s.key]
        return [s.key, typeof cur === 'number' && cur < len ? cur : randIdx(len)]
      }
      return [s.key, randIdx(len)]
    })))
  }

  const rollAll = () => { clearUserInputs(); setPicks((p) => Object.fromEntries(SLOTS.map((s) => [s.key, locked[s.key] ? p[s.key] : randIdx(optsOf(s, branch).length)]))) }
  const rollOne = (k: string) => setPicks((p) => ({ ...p, [k]: randIdx(optsOf(SLOTS.find((s) => s.key === k)!, branch).length) }))
  const toggleLock = (k: string) => setLocked((l) => ({ ...l, [k]: !l[k] }))

  // 사용자 정의 항목 추가/수정/삭제 — 무작위 생성하지 않고 사용자가 직접 적는다.
  const addCustom = () => {
    const label = (window.prompt('추가할 항목 이름을 입력하세요') || '').trim()
    if (!label) return
    setCustom((c) => [...c, { id: 'cf_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) => setCustom((c) => c.map((x) => (x.id === id ? { ...x, value } : x)))
  const removeCustom = (id: string) => setCustom((c) => c.filter((x) => x.id !== id))
  // 무작위(재)생성 시 사용자 정의 값·기타는 비우되 항목 정의(라벨)는 유지한다.
  const clearUserInputs = () => { setCustom((c) => c.map((x) => ({ ...x, value: '' }))); setEtc('') }

  // 다른 도구로 보낼 객체의 fields 에 더할 사용자 항목(값 있는 것)·기타(비어있지 않을 때).
  const userFields = (): Record<string, string> => {
    const f: Record<string, string> = {}
    custom.forEach((x) => { const v = x.value.trim(); if (x.label && v) f[x.label] = v })
    if (etc.trim()) f.etc = etc.trim()
    return f
  }
  // 복사/요약 텍스트에 붙일 사용자 항목·기타 꼬리말.
  const userTail = (): string => {
    const parts: string[] = []
    custom.forEach((x) => { const v = x.value.trim(); if (x.label && v) parts.push(`${x.label}: ${v}`) })
    if (etc.trim()) parts.push(`기타: ${etc.trim()}`)
    return parts.length ? '\n' + parts.join('\n') : ''
  }

  const val = (k: string) => {
    const s = SLOTS.find((x) => x.key === k)!
    const arr = optsOf(s, branch)
    const i = picks[k]
    return arr[typeof i === 'number' && i < arr.length ? i : 0]
  }

  // 장소 이름(라이브러리/프로젝트 제목용) — 시스템 색채 + 현장
  const placeName = useMemo(() => `[${branchDef.tag}] ${val('locale')}`, [picks, branch]) // eslint-disable-line react-hooks/exhaustive-deps

  const sceneText = useMemo(() => {
    return `《${branchDef.label}》 [${val('era')}] ${val('locale')}. ${val('terrain')}이(가) 펼쳐진 곳, 분위기는 ${val('mood')}. ` +
      `이곳은 ${val('system')} 무대다. 현장에는 ${val('detail')} 있고, ${val('sense')}가 감돈다. ` +
      `${val('threat')} 이곳에, 누군가는 ${val('goal')} 발을 들인다. 이윽고 ${val('event')}.`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks, branch])

  const flash = (m: string) => {
    setSaved(m)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { if (mounted.current) setSaved('') }, 1600)
  }
  const copy = () => {
    navigator.clipboard?.writeText(sceneText + userTail()).then(() => {
      if (!mounted.current) return
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1400)
    }).catch(() => {})
  }

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // [연계] 프로젝트 바인더에 장소 카드(설정) 추가
  const toProject = () => {
    const uf = userFields()
    const ufHtml = Object.entries(uf).map(([k, v]) => `<p>${esc(k === 'etc' ? '기타' : k)}: ${esc(v)}</p>`).join('')
    const id = addToProject({
      kind: 'setting', root: 'research', folder: '장소',
      title: placeName,
      icon: '🗺️',
      bodyHtml:
        `<p><b>${esc(placeName)}</b> <i>(${esc(branchDef.label)} · 게임판타지·LitRPG)</i></p>` +
        `<p>시각·기상: ${esc(val('era'))}</p>` +
        `<p>지형·구조: ${esc(val('terrain'))}</p>` +
        `<p>분위기: ${esc(val('mood'))}</p>` +
        `<p>시스템 색채: ${esc(val('system'))}</p>` +
        `<p>위협·몬스터: ${esc(val('threat'))}</p>` +
        `<p>현장 디테일: ${esc(val('detail'))}</p>` +
        `<p>오감: ${esc(val('sense'))}</p>` +
        `<p>이곳에 온 목적: ${esc(val('goal'))}</p>` +
        `<p>벌어질 사건: ${esc(val('event'))}</p>` +
        ufHtml +
        `<p>${esc(sceneText)}</p>`,
      synopsis: sceneText + userTail(),
      character: {
        name: placeName, kind: val('locale'), mood: val('mood'), 분기: branchDef.label, 시각: val('era'), 지형: val('terrain'), 시스템: val('system'),
        // 정규(장소) 키 — 받는 허브(배경 설정집)에서 항목이 제자리에 들어가도록 매핑(추가만).
        atmosphere: val('mood'),
        appearance: val('detail'),
        sensory: val('sense'),
        geography: val('terrain'),
        climate: val('era'),
        history: `${branchDef.label} · 게임판타지·LitRPG`,
        rules: val('system'),
        dangers: val('threat'),
        notes: `목적: ${val('goal')} / 사건: ${val('event')}\n${sceneText}`,
        // 사용자 정의 항목(라벨 그대로)·기타 — 값 있을 때만(userFields). 다른 도구에 그대로 노출.
        ...uf,
      },
      meta: { 분기: branchDef.label, 현장: val('locale'), 분위기: val('mood'), 시각: val('era'), 지형: val('terrain'), 시스템색채: val('system'), 위협: val('threat'), 장르: '게임판타지·LitRPG' },
    })
    flash(id ? '프로젝트에 장소 추가됨(자료 ▸ 장소)' : '프로젝트에 연결되지 않았습니다')
  }

  // [연계] 장소 라이브러리에 저장
  const toLibrary = () => {
    addToLibrary('places', {
      name: placeName,
      kind: val('locale'),
      mood: val('mood'),
      sensory: val('sense'),
      history: `${branchDef.label} / ${val('era')} / ${val('terrain')} / ${val('system')}`,
      rules: val('system'),
      notes: sceneText,
      fields: {
        name: placeName,
        kind: val('locale'),
        atmosphere: val('mood'),
        appearance: val('detail'),
        sensory: val('sense'),
        geography: val('terrain'),
        climate: val('era'),
        history: `${branchDef.label} · 게임판타지·LitRPG`,
        rules: val('system'),
        dangers: val('threat'),
        notes: `목적: ${val('goal')} / 사건: ${val('event')}\n${sceneText}`,
        // 사용자 정의 항목(라벨 그대로)·기타 — 값 있을 때만.
        ...userFields(),
      },
      source: 'LitRPG 배경 생성기',
    })
    flash('장소 라이브러리에 저장')
  }

  // [연계] 배경 설정집으로 보내기(데이터 동반)
  const toSettingBible = () => {
    openToolLinked('setting-bible', {
      genre: '게임판타지·LitRPG',
      place: {
        name: placeName, type: '지하·던전', mood: val('mood'), sensory: val('sense'),
        history: `${branchDef.label} · ${val('era')}`, rules: val('system'), notes: sceneText,
        fields: {
          name: placeName,
          kind: val('locale'),
          atmosphere: val('mood'),
          appearance: val('detail'),
          sensory: val('sense'),
          geography: val('terrain'),
          climate: val('era'),
          history: `${branchDef.label} · 게임판타지·LitRPG`,
          rules: val('system'),
          dangers: val('threat'),
          notes: `목적: ${val('goal')} / 사건: ${val('event')}\n${sceneText}`,
          // 사용자 정의 항목(라벨 그대로)·기타 — 값 있을 때만.
          ...userFields(),
        },
      },
    })
    flash('배경 설정집으로 보냄')
  }

  const savePreset = () => {
    const name = placeName.length > 26 ? placeName.slice(0, 26) + '…' : placeName
    setPresets((p) => [{ id: 'lsf_' + Date.now().toString(36), name, branch, picks: { ...picks }, ts: Date.now() }, ...p].slice(0, 40))
    flash('현재 조합을 즐겨찾기에 저장')
  }
  const applyPreset = (p: SavedPreset) => {
    const b = p.branch || 'vr'
    setBranch(b)
    setPicks(clampPicks({ ...p.picks }, b))
    flash('즐겨찾기 불러옴')
  }
  const delPreset = (id: string) => setPresets((arr) => arr.filter((x) => x.id !== id))

  const related = (TOOL_RELATIONS['setting-bible'] || []).filter((id) => id !== 'setting-bible' && REL_LABEL[id]).slice(0, 5)
  const combos = useMemo(() => comboOf(branch), [branch])

  // ── 스타일 ──
  const chip = (active: boolean): React.CSSProperties => ({
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'var(--accent)' : 'var(--paper)',
    color: active ? '#fff' : 'var(--text)',
    borderRadius: 999, padding: '5px 11px', fontSize: 12, cursor: 'pointer', lineHeight: 1.2, whiteSpace: 'nowrap',
  })

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)', overflow: 'auto' }}>
      {/* 4분기 선택(첫 선택지) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {BRANCHES.map((b) => (
            <button key={b.key} style={chip(b.key === branch)} onClick={() => switchBranch(b.key)} title={b.note}>
              <Emoji e={b.icon} /> {b.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}><Emoji e={branchDef.icon} /> {branchDef.note}</div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        조합 가능 무대 <b style={{ color: 'var(--accent)' }}>{combos.toLocaleString()}</b>가지(1조+, 4분기 포함). 슬롯을 <Emoji e="🔒" /> 잠그고 나머지만 <Emoji e="🎲" /> 돌려 원하는 배경을 빚으세요.
      </div>
      {genreNote && <div style={{ fontSize: 11.5, color: 'var(--accent)' }}>※ {genreNote}</div>}

      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 14.5, lineHeight: 1.65 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{placeName}</div>
        {sceneText}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SLOTS.map((s) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', width: 78, flexShrink: 0 }}>{s.label}</span>
            <span style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>{val(s.key)}</span>
            <button className="minibtn" title={locked[s.key] ? '잠금 해제' : '이 슬롯 잠금'} onClick={() => toggleLock(s.key)} style={{ color: locked[s.key] ? 'var(--accent)' : 'var(--muted)' }}>{locked[s.key] ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
            <button className="minibtn" title="이 슬롯만 다시" onClick={() => rollOne(s.key)} disabled={locked[s.key]}><Emoji e="🎲" /></button>
          </div>
        ))}

        {/* 사용자 정의 항목 — 직접 입력(무작위 생성 안 함). 재생성 시 값만 비우고 라벨 유지. */}
        {custom.map((c) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px dashed var(--border)', borderRadius: 8, padding: '6px 8px' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', width: 78, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.label}>{c.label}</span>
            <input
              value={c.value}
              onChange={(e) => setCustomValue(c.id, e.target.value)}
              placeholder="직접 입력"
              style={{ flex: 1, fontSize: 13, lineHeight: 1.4, background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 7px' }}
            />
            <button className="minibtn" title="이 항목 삭제" onClick={() => removeCustom(c.id)}>✕</button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="minibtn" onClick={addCustom} title="이름을 입력해 빈 입력칸을 추가합니다(직접 작성)">＋ 항목 추가</button>
        </div>

        {/* 고정 '기타' 자유 입력 — 항상 표시, 기본 비어 있음. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>기타</span>
          <textarea
            value={etc}
            onChange={(e) => setEtc(e.target.value)}
            placeholder="자유롭게 적어두세요(이 무대에 대한 메모·설정 등)"
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, lineHeight: 1.5, background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={rollAll}><Emoji e="🎲" /> 무대 생성</button>
        <button className="minibtn" onClick={copy}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
        <button className="minibtn" onClick={savePreset}><Emoji e="⭐" /> 즐겨찾기</button>
      </div>

      <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '현재 무대를 프로젝트 자료(장소)에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={toLibrary}><Emoji e="🏞" /> 장소 저장</button>
        <button className="linkbtn" onClick={toSettingBible}><Emoji e="🗺️" /> 배경 설정집으로</button>
        {related.filter((id) => id !== 'setting-bible').map((id) => (
          <button key={id} className="linkbtn" onClick={() => openToolLinked(id, { genre: '게임판타지·LitRPG' })}>{emojify(REL_LABEL[id] || id)}</button>
        ))}
      </div>

      {presets.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}><Emoji e="⭐" /> 즐겨찾기 ({presets.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflow: 'auto' }}>
            {presets.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <button className="linkbtn" style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={() => applyPreset(p)} title="이 조합 불러오기">{p.name}</button>
                <button className="minibtn" title="삭제" onClick={() => delPreset(p.id)}><Emoji e="🗑" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {saved && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>✓ {saved}</div>}
    </div>
  )
}
