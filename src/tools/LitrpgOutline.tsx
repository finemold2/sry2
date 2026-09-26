// 게임판타지·LitRPG 개요(아웃라인) 빌더 — 이 장르 표준 구조(VR 다이브형/갇힘·데스게임형/이세계 전이+시스템형/
// 현실 침공(시스템 아포칼립스)형/한국 연재 회귀+게임지식형)에 맞춘 장·막 개요 템플릿을 채우는 도구.
// 분기를 고르면 그 결에 맞는 막·비트가 펼쳐지고, 각 비트에 내용을 적고(자동저장), 비트를 추가·삭제·순서변경한다.
// "비트 영감 굴리기"로 LitRPG 특화 슬롯(접속·각성 트리거/상태창 연출/스킬·빌드/퀘스트·게이트/시스템 떡밥/보상·드랍/전환장치)을
//   무작위 조합해 빈칸을 채울 글감을 만든다(잠금/재생성·조합수 표시, 1조+).
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크 없음(전부 로컬·자작 데이터). 언마운트 시 타이머 정리.
// 데이터: localStorage 'sry:tool:litrpg-outline' (분기별 비트 내용·작품 메타 보관).
// 연계: addToProject(root:'draft', folder:'개요') 로 바인더 원고에 개요 문서 추가, addToLibrary('snippets', ...) 로 굴린 영감을 글감 보관,
//       openToolLinked 로 관련 구조 도구(플롯 피라미드·장면 목록·세계관 위키·영웅의 여정·비트 시트) 열기.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'litrpg-outline',
  name: 'LitRPG 개요 빌더',
  icon: '🎮',
  group: '구조',
  genre: '게임판타지·LitRPG',
  intro: 'VR다이브·데스게임·이세계전이·현실침공·회귀게임지식 등 LitRPG 표준 구조에 맞춘 장·막 개요를 채우고 비트 영감을 굴리세요',
  w: 740,
  h: 670,
}

const LS = 'sry:tool:litrpg-outline'

// ──────────────────────────────────────────────────────────────────────────
// 비트(개요 항목) 모델 — 막(act) 라벨로 묶이는 고정 비트 + 사용자가 더한 자유 비트
// ──────────────────────────────────────────────────────────────────────────
interface BeatDef {
  key: string
  act: string        // 막/구간 라벨
  title: string      // 비트 이름
  hint: string       // 이 비트에 무엇을 쓸지 안내(LitRPG 특화)
}
interface TemplateDef {
  key: string
  label: string
  icon: string
  tag: string        // 하위유형 한 줄 설명
  blurb: string      // 어떤 작품에 맞는지
  beats: BeatDef[]
}

// ── 1) VR 다이브형 — 현실↔게임 이중구조(달빛조각사·로열로드형) ────────────────
const T_DIVE: BeatDef[] = [
  { key: 'd_real', act: '1막 · 현실의 바닥', title: '현실의 결핍 · 다이브 동기', hint: '빚·생계·취업난 등 현실의 절박함을 깐다. "게임으로 인생 역전"이라는 동기와, 로그인 캡슐·과금 한계 같은 현실 제약을 보여준다.' },
  { key: 'd_login', act: '1막 · 현실의 바닥', title: '접속 · 튜토리얼(독자 온보딩)', hint: '캡슐 접속·캐릭터 생성. 시스템 안내 AI가 조작·상태창·인터페이스를 설명 = 독자에게 규칙을 학습시키는 구간. 첫 시스템 메시지 연출.' },
  { key: 'd_unique', act: '1막 · 현실의 바닥', title: '히든 직업·유니크 스킬 획득', hint: '남들 못 가진 전직 퀘스트·NPC 호감도·예외 조건으로 특별함을 얻는다. 단, "규칙 안에서 사기"여야 공정성 위반이 아니다.' },
  { key: 'd_grind', act: '2막 · 노가다와 경제', title: '생산·사냥의 코어 루프', hint: '사냥→경험치·드랍→레벨업·강화→더 센 사냥. 생산직(대장장이·연금·요리)·일확천금·노가다 묘사. 가시적 수치 보상의 쾌감.' },
  { key: 'd_econ', act: '2막 · 노가다와 경제', title: '게임 경제 · 현실 환율 연동', hint: '경매장·시세·길드 거래. 게임 재화의 현금화, 게임 성과가 현실 지위·수입으로 환산되는 이중구조의 묘미.' },
  { key: 'd_guild', act: '2막 · 노가다와 경제', title: '길드·랭킹·라이벌 진입', hint: '명문 길드 스카우트·랭커 사회·순위표 경쟁. 라이벌과 현실 인맥이 얽히며 사회적 인정이 수치화된다.' },
  { key: 'd_logout', act: '3막 · 현실의 반작용', title: '로그아웃 · 현실과의 충돌', hint: '게임 속 성취가 현실로 새어 나온다. 정체 노출·기업의 견제·현실 인간관계 변화. 현실-게임 이중구조의 갈등 폭발.' },
  { key: 'd_event', act: '3막 · 현실의 반작용', title: '월드 이벤트 · 대규모 레이드', hint: '운영자 발 대형 이벤트·서버 보스·점령전. 수만 유저가 얽힌 판에서 주인공만의 빌드·전략이 빛난다.' },
  { key: 'd_secret', act: '4막 · 게임의 비밀', title: '게임의 진실 떡밥', hint: '히든 피스·세계관 비화·운영진/AI의 의도. "이 게임은 단순 게임이 아니다"라는 큰 미스터리를 가속한다.' },
  { key: 'd_apex', act: '결말 · 전설 등극', title: '최종 공략 · 랭킹 1위 · 현실 역전', hint: '미답 던전 최초 클리어·세계 최강 랭커 등극. 게임에서의 정점이 곧 현실의 인생 역전으로 완성되는 카타르시스.' },
]

// ── 2) 갇힘/데스게임형 — 죽으면 진짜 죽음(SAO형) ─────────────────────────────
const T_DEATH: BeatDef[] = [
  { key: 'k_start', act: '1막 · 갇힘', title: '정상 접속 → 탈출 불가 선언', hint: '평범하게 접속했으나 로그아웃이 막힌다. 게임마스터/시스템이 "탈출 조건"과 "죽으면 진짜 죽음" 규칙을 선포한다. 안전지대 묘사 금지.' },
  { key: 'k_rule', act: '1막 · 갇힘', title: '데스 규칙·페널티 정립', hint: 'HP 0 = 영구사망, PK·상태이상·디버프의 무게를 명확히 한다. 죽음이 되돌릴 수 없기에 모든 전투에 실제 긴장이 깔린다.' },
  { key: 'k_panic', act: '1막 · 갇힘', title: '초반 패닉 · 첫 사망 목격', hint: '대혼란·자포자기·약탈. 눈앞에서 누군가 진짜로 죽는 충격으로 "이건 게임이 아니다"를 각인. 주인공이 생존 의지를 다진다.' },
  { key: 'k_solo', act: '2막 · 공략', title: '솔로/소규모 생존 전략', hint: '신중한 정보 수집·안전한 빌드·도망과 회피. 무모한 돌격조의 죽음과 대비되는 "살아남는 자"의 합리적 플레이.' },
  { key: 'k_floor', act: '2막 · 공략', title: '층·구획 보스 공략(파워 게이팅)', hint: '한 층을 깨야 다음 층이 열린다. 보스 패턴 파악→전멸 위기→히든 변수로 역전. 클리어가 곧 탈출에 한 걸음 다가가는 진척.' },
  { key: 'k_bond', act: '2막 · 공략', title: '동료·길드·신뢰의 무게', hint: '데스게임이기에 신뢰가 곧 목숨. 협력 길드 결성, 그러나 한 번의 배신·판단 미스가 영구사망으로 이어지는 비정함.' },
  { key: 'k_killer', act: '3막 · 인간 악', title: 'PK·살인 길드의 위협', hint: '몬스터보다 무서운 건 사람. 살인 플레이어·광신 집단·게임 안에서 권력을 휘두르는 자가 등장한다. 인간성에 대한 질문.' },
  { key: 'k_loss', act: '3막 · 인간 악', title: '돌이킬 수 없는 상실', hint: '소중한 동료의 영구사망. 데스게임의 가장 무거운 카드. 슬픔과 분노가 주인공을 한계까지 몰아붙인다.' },
  { key: 'k_truth', act: '4막 · 진실', title: '게임마스터·시스템의 정체', hint: '왜 갇혔나, 누가 만들었나. 게임마스터의 동기·집착·실체가 드러나며 단순 게임에서 더 큰 음모로 스케일업한다.' },
  { key: 'k_clear', act: '결말 · 탈출', title: '최종 보스 · 클리어 · 귀환', hint: '마지막 층·최종 결전. 한계 돌파 연출(조건 충족 발동)로 역전하고 탈출 조건을 충족. 살아 돌아온 자들의 후유증과 여운.' },
]

// ── 3) 이세계 전이 + 시스템형 — 로그아웃 없음(나혼렙·전형적 웹소설) ──────────
const T_ISEKAI: BeatDef[] = [
  { key: 'i_transfer', act: '1막 · 전이와 각성', title: '전이/소환 · 시스템 부여', hint: '다른 세계로 넘어가니 그 세계에 게임 시스템(상태창·레벨·스킬)이 깔려 있다. 로그아웃 개념 없음 = 이게 곧 새 현실임을 각인.' },
  { key: 'i_status', act: '1막 · 전이와 각성', title: '첫 상태창 · 약체 시작', hint: '레벨1·낮은 스탯·평범하거나 쓰레기 같은 초기 스킬. 시스템 메시지로 규칙을 학습. 단, 남다른 잠재력·고유 스킬의 떡밥을 심는다.' },
  { key: 'i_hidden', act: '1막 · 전이와 각성', title: '히든 클래스·전용 시스템 획득', hint: '주인공만의 치트(전용 퀘스트 라인·성장 무제한·그림자 군단식 고유 능력). "나만의 특별함"이 판을 뒤집을 토대.' },
  { key: 'i_loop', act: '2막 · 성장 1부', title: '레벨업 코어 루프 가속', hint: '사냥·던전·퀘스트의 연쇄로 급성장. 스탯 분배=캐릭터성, 스킬 트리·시너지 조합의 빌드 묘미. 회차마다 가시적 보상.' },
  { key: 'i_quest', act: '2막 · 성장 1부', title: '히든·연계 퀘스트(플롯 분기)', hint: '메인/서브/히든 퀘스트. 특히 히든·연계 퀘스트가 클래스 해금·세계관 진입의 분기점이 된다. 실패 페널티로 긴장.' },
  { key: 'i_society', act: '2막 · 성장 2부', title: '길드·랭킹·세력 정치 진입', hint: '모험가 길드·왕국·마탑의 권력 구도. 동료·라이벌·흑막 배치. 명성·칭호로 사회적 인정을 수치화한다.' },
  { key: 'i_wall', act: '2막 · 성장 2부', title: '벽과 돌파 · 파워 인플레 관리', hint: '주인공 강화에 맞춰 더 강한 적·서열·등급(상위 던전·네임드)을 배치. "벽→각성→돌파" 리듬으로 수치 인플레를 통제.' },
  { key: 'i_system', act: '3막 · 시스템의 의도', title: '시스템의 배후 떡밥', hint: '이 시스템은 왜 존재하나, 누가 깔았나(신·관리자·탑의 주인·외계 존재). 단순 성장물에서 우주적 음모로 스케일업.' },
  { key: 'i_lowest', act: '4막 · 위기', title: '최대 위기 · 진각성', hint: '동료·근거지·힘을 잃는 구간 → 히든 피스·전직·2차 각성으로 진짜 힘 개방. 앞서 심은 시스템 설정 회수로 정당화.' },
  { key: 'i_apex', act: '결말 · 정점', title: '최종 보스 · 세계 최강 등극', hint: '시스템의 주인/최종 흑막과의 결전. 모든 떡밥을 회수하며 정점에 오른다. 후일담·차기 시즌 떡밥으로 동력 유지.' },
]

// ── 4) 현실 침공형(시스템 아포칼립스) — 헌터물 융합(전독시·나혼렙 일부) ────────
const T_INVADE: BeatDef[] = [
  { key: 'v_dday', act: '1막 · 침공', title: '시스템 강림 · 세계 규칙 개편', hint: '어느 날 현실에 상태창·던전·게이트·시나리오가 생긴다. 인류 절반이 죽는 혼돈. "더 이상 옛 세상이 아니다"를 선포.' },
  { key: 'v_weak', act: '1막 · 침공', title: '약자 주인공의 처지', hint: 'F급 각성자·무명·소시민으로 무시·착취당한다. 사이다를 위한 고구마 바닥. 다만 남다른 정보·각오의 떡밥을 심는다.' },
  { key: 'v_advantage', act: '1막 · 침공', title: '정보 우위 · 고유 권능 획득', hint: '회귀·원작 지식·전용 시스템(코인·시나리오 해석·그림자)으로 "나만 미래/규칙을 안다". 줄 사이다의 약속과 첫 역전.' },
  { key: 'v_scenario', act: '2막 · 시나리오', title: '메인 시나리오·강제 퀘스트', hint: '시스템이 강제하는 생존 시나리오·페널티(불이행 시 사망). 도깨비/관리자식 진행자 등장. 정보전·선택의 긴장.' },
  { key: 'v_dungeon', act: '2막 · 시나리오', title: '던전·게이트 공략 · 각성 성장', hint: '게이트 클리어·보스 레이드로 급성장. 스탯·스킬·아이템 보상을 가시화. 다른 헌터·세력과의 경쟁과 협력.' },
  { key: 'v_power', act: '2막 · 시나리오', title: '협회·길드·세력 권력 구도', hint: '헌터 협회·길드·국가·재벌의 이권 다툼. 동료·라이벌·흑막 헌터 배치. 시스템 능력이 곧 현실 권력으로 환산된다.' },
  { key: 'v_secret', act: '3막 · 시스템의 정체', title: '시스템·침공의 기원 떡밥', hint: '왜 현실이 침공당했나, 시스템·별자리·탑의 주인은 무엇인가. 메인 미스터리 가속, 종말 카운트다운의 조짐.' },
  { key: 'v_crisis', act: '4막 · 대재난', title: 'S급 재난 · 소중한 것 상실', hint: '도시·국가를 위협하는 던전 브레이크·최종 시나리오. 동료·세계의 일부를 잃는 최대 위기. 다음 역전의 낙차를 키운다.' },
  { key: 'v_limit', act: '4막 · 대재난', title: '한계 돌파 · 숨은 패 개방', hint: '회귀 지식의 마지막 카드·전용 권능의 진짜 형태·각성 2차. 앞서 심은 설정의 회수로 역전을 정당화한다.' },
  { key: 'v_end', act: '결말 · 결말', title: '세계의 운명 · 시스템과의 결판', hint: '시스템의 주인/최종 흑막과의 결전과 세계의 향방. 인류·시스템·주인공의 관계가 매듭지어진다. 메타적 여운.' },
]

// ── 5) 한국 연재형 — 회귀 + 게임지식(사이다 누적·골든타임 후킹) ──────────────
const T_WEB: BeatDef[] = [
  { key: 'w_hook', act: '도입 · 골든타임(1~3화)', title: '회귀/각성 트리거', hint: '죽음·바닥·굴욕 직후 게임 능력을 안고 회귀하거나 시스템에 각성. 1화에서 차별점과 후킹을 즉시 제시한다.' },
  { key: 'w_know', act: '도입 · 골든타임(1~3화)', title: '게임지식·정보 우위 선언', hint: '공략·패치·히든 피스·미래 사건을 안다. "이미 결과를 아는 자"의 무기. 독자에게 줄 사이다의 약속.' },
  { key: 'w_first', act: '도입 · 골든타임(1~3화)', title: '첫 사이다 · 클리프행어', hint: '무시하던 자·가족·길드를 초반에 통쾌하게 역전. 회차 끝 클리프행어로 다음 화를 견인. 즉각 보상의 리듬.' },
  { key: 'w_system', act: '전개 · 성장 1부', title: '시스템·스테이터스 정립', hint: '레벨·스탯·스킬·등급(F~SSS)·상점·칭호·인벤토리 UI 규칙을 세운다. 성장의 가시화와 즉각 보상의 토대.' },
  { key: 'w_use', act: '전개 · 성장 1부', title: '게임지식 활용(언제·어떻게)', hint: '아는 미래를 "언제 어떻게 써먹나"의 기대감 운용. 히든 퀘스트 선점·강화 성공 타이밍·노 정보 약점 공략으로 사이다 양산.' },
  { key: 'w_episode', act: '전개 · 성장 1부', title: '단위 에피소드(던전·시험·랭킹전)', hint: '던전 공략·토너먼트·길드 의뢰의 연쇄. 회차당 최소 1회 카타르시스, 떡밥-회수의 미세 루프를 굴린다.' },
  { key: 'w_wall', act: '전개 · 성장 2부', title: '벽과 돌파 · 인플레 관리', hint: '주인공 강화에 맞춰 더 강한 적·서열을 배치. 단위 리셋(차원·등급 개편)·상대평가(랭킹)·질적 보상으로 둔감화를 막는다.' },
  { key: 'w_big', act: '전개 · 성장 2부', title: '거대 떡밥 본격화', hint: '회귀의 원인·시스템의 정체·흑막의 정체 등 메인 서사를 가속. 단위 보상 위에 큰 미스터리를 얹는다.' },
  { key: 'w_low', act: '위기 · 전환', title: '최대 위기 · 소중한 것 상실', hint: '동료·근거지·정보 우위를 잃는 고구마 구간. 다음 사이다의 낙차를 위해 굴욕·답답함을 의도적으로 축적한다.' },
  { key: 'w_break', act: '위기 · 전환', title: '진각성 · 숨은 패 개방', hint: '히든 클래스·전직·전용 시스템의 진짜 형태를 연다. 앞서 심은 설정의 회수로 정당화하는 돌파.' },
  { key: 'w_final', act: '결말 · 최강의 사이다', title: '최강 역전 · 응징 · 등극', hint: '쌓인 모든 굴욕·떡밥을 한 번에 응징·회수. 랭킹 1위·세계 최강 등극의 압도적 카타르시스.' },
  { key: 'w_after', act: '결말 · 최강의 사이다', title: '후일담 · 다음 시즌 떡밥', hint: '보상받은 일상·관계 정리. 차기 흑막·신 시스템·신세계 떡밥으로 연재 동력을 잇는다.' },
]

const TEMPLATES: TemplateDef[] = [
  { key: 'dive', label: 'VR 다이브형', icon: '🕹️', tag: '가상현실 · 현실↔게임 이중구조', blurb: '달빛조각사·로열로드식. 캡슐 접속·로그아웃·게임 경제·현실 환율 연동. 노가다·생산직·일확천금 서사.', beats: T_DIVE },
  { key: 'death', label: '갇힘·데스게임형', icon: '💀', tag: 'SAO형 · 죽으면 진짜 죽음', blurb: '소드 아트 온라인식. 로그아웃 불가, 영구사망, 층 공략. 긴장도 최상 · 안전지대 없음 · 인간 악.', beats: T_DEATH },
  { key: 'isekai', label: '이세계 전이+시스템', icon: '🌌', tag: '로그아웃 없음 · 시스템 깔린 세계', blurb: '나혼렙·오버로드식. 다른 세계에 게임 시스템이 존재. 히든 클래스·레벨업 코어 루프·시스템 배후 미스터리.', beats: T_ISEKAI },
  { key: 'invade', label: '현실 침공형', icon: '🌐', tag: '시스템 아포칼립스 · 헌터물 융합', blurb: '전독시·나혼렙(현실)식. 현실에 상태창·게이트·시나리오 강림. 약자→최강, 시나리오·정보전, 별자리/도깨비.', beats: T_INVADE },
  { key: 'web', label: '회귀+게임지식형', icon: '⏪', tag: '한국 연재 · 골든타임 사이다', blurb: '회귀물×게임지식. "이미 결과를 아는 자"의 정보 우위. 골든타임 후킹·회차 클리프행어·최강의 사이다.', beats: T_WEB },
]
function tplDef(k: string): TemplateDef { return TEMPLATES.find((t) => t.key === k) || TEMPLATES[0] }

// ──────────────────────────────────────────────────────────────────────────
// 비트 영감 굴리기 — LitRPG 특화 슬롯 풀(잠금/재생성, 조합수 표시)
//   문장 골격: [무대]의 [분위기] 속, [주인공]에게 [트리거]가 일어나고 [상태창 연출]이 떠오른다.
//              [스킬·빌드]를 무기로 [퀘스트·게이트]에 도전하며, [걸린 것]을 두고 [시스템 떡밥]이 드러나고,
//              [보상·드랍]을 얻은 끝에 [전환 장치]로 다음 비트를 연다.
// 조합수 = 9개 풀 길이의 곱(아래에서 자동 계산·표시) → 1조 이상.
// ──────────────────────────────────────────────────────────────────────────
const SLOT_STAGE = [ // 26
  '튜토리얼 던전 1층의 안내 홀', '현실에 처음 열린 도심 한복판의 게이트', '캡슐 접속 직후의 캐릭터 생성 광장',
  '미답파 100층 탑의 봉인된 보스룸', '경매장이 붐비는 중앙 도시 상업구', '몬스터 웨이브가 밀려오는 성벽 위',
  '히든 피스가 잠든 폐광 최심부', '랭커들이 모인 콜로세움 PvP 투기장', '로그아웃이 막힌 시작 마을 광장',
  '죽으면 진짜 죽는 데스게임 50층', '시나리오 진행자가 강림한 텅 빈 지하철역', '운영자 발 월드 보스가 출현한 필드',
  '시스템 상점의 푸른 인터페이스 너머', '회귀 직후 눈을 뜬 익숙한 첫 새벽', '대균열이 벌어지는 S급 던전 입구',
  '길드 영지의 생산 공방과 대장간', '심연에서 별자리가 내려다보는 시나리오 무대', '히든 클래스 전직 퀘스트의 시험장',
  '버그처럼 비어 있는 미구현 맵 구석', '강화에 실패한 장비가 깨지는 강화소', '레이드 공대가 집결한 보스룸 입구',
  '현실과 게임이 겹쳐 보이는 각성자 협회', '드랍 아이템을 까보는 전리품 분배의 순간', '탑의 관리자가 기다리는 최상층 옥좌',
  '시간이 멈춘 듯한 세이브 포인트', '그림자 군단이 도열한 어둠의 영지',
]
const SLOT_HERO = [ // 26
  '회귀해 게임지식을 안고 돌아온 자', '각성한 최약체 F급 헌터', '히든 클래스를 홀로 얻은 무명 모험가',
  '원작 소설을 다 읽은 유일한 독자', '로그아웃이 막힌 데스게임의 솔로 플레이어', '현실의 빚을 갚으러 다이브한 가장',
  '레벨업이 무제한인 전용 시스템 보유자', '죽은 동료의 복수를 다짐한 생존자', '버그 같은 고유 권능을 각성한 소시민',
  '랭킹 1위를 노리는 신예 랭커', '시스템만이 동료인 외톨이 공략가', '전직 퀘스트를 깬 직업 1호 보유자',
  '그림자 군단을 부리는 네크로형 헌터', '강화·확률을 읽어내는 정보형 빌드', '죽음의 시나리오를 강제당한 일반인',
  '미래 패치를 아는 베타테스터 출신', '계약으로 정령왕을 부리는 소환사', '생산직 만렙의 대장장이 겸 상인',
  '진명을 잃은 채 깨어난 봉인된 강자', '별자리의 화신으로 지목된 자', '게이트 안에서 길드를 이끄는 길드장',
  '치트 같은 패시브를 타고난 천재', '히든 피스를 독점하려는 음모가', '시스템의 시험 대상이 된 선택받은 자',
  '회귀 전 자신을 죽인 자를 쫓는 복수자', '인류 마지막 시나리오를 짊어진 영웅',
]
const SLOT_TRIGGER = [ // 24
  '돌연 눈앞에 반투명한 상태창이 떠오르고', '로그아웃 버튼이 사라졌다는 시스템 경고가 울리며', '죽기 직전 다시 첫날로 회귀하고',
  '히든 클래스 전직 조건이 충족됐다는 알림이 뜨며', '레벨업 팡파르와 함께 스탯 포인트가 쏟아지고', '강제 메인 시나리오가 카운트다운을 시작하며',
  '게이트가 도심 한복판에 굉음과 함께 열리고', '미답파 보스의 패턴이 한순간 읽히며', '히든 퀘스트가 조용히 활성화되고',
  '드랍된 상자에서 유니크 등급 빛이 새어 나오며', '죽었어야 할 인물이 멀쩡히 다시 나타나고', '강화 +9의 성공 메시지가 떠오르며',
  '시스템이 숨겨둔 진실의 로그를 한 줄 흘리고', '회귀 전 기억과 다른 미래가 분기하며', 'PK 살인 길드가 안전지대를 덮치고',
  '진행자(도깨비)가 다음 시나리오를 선포하며', '전용 시스템이 남들에겐 보이지 않는 옵션을 열고', '던전 브레이크 경보가 도시 전역에 울리며',
  '치명타 한 방에 보스의 체력이 붉게 깎이고', '계약 정령이 더 큰 제물을 요구하며', '봉인 해제 조건이 마지막 한 칸을 남기고',
  '베타 시절의 버그가 그대로 남아 있음을 발견하며', '별자리가 후원 메시지를 띄우고', '경험치 바가 다음 레벨을 가득 채우며',
]
// 히든 클래스/스킬 진화 연출의 「○○」 자리를 채울 구체 명사 풀(미치환 플레이스홀더 제거 + 조합수 증가).
const HIDDEN_CLASS = [ // 12 — 히든 클래스 이름
  '그림자 군주', '죽음의 인도자', '심연 검성', '용살자', '시간의 회귀자', '폭군의 후계',
  '천 개의 별을 읽는 자', '망령 군단 지휘관', '무한 연성술사', '재앙의 화신', '봉인된 마검사', '천명의 사도',
]
const SKILL_EVO = [ // 12 — 스킬 진화: 「하위」 → 상위 스킬
  '베기 → 참룡검', '화염구 → 멸세 화염폭', '은신 → 그림자 도약', '회복 → 만유 재생', '간파 → 천안통', '소환 → 군단 강림',
  '강타 → 붕산권', '독침 → 만독 침식', '방어 → 절대 결계', '연사 → 폭풍의 화살비', '집중 → 시간 가속', '저주 → 종말의 낙인',
]
const SLOT_STATUS = [ // 20 고정 + (히든 클래스 12 + 스킬 진화 12) = 의미상 동적 치환
  '[레벨 업! Lv.1 → Lv.2] 메시지가 화면을 덮고', '[경고: 로그아웃 불가] 붉은 시스템창이 깜빡이고',
  '<퀘스트 발생: 메인 시나리오> 팝업이 강제로 열리며', '[칭호 획득: 최초 클리어(First Clear)]가 새겨지고', '<강화 성공! +8 → +9> 푸른 빛이 번지며',
  '[치명타! 데미지 12,480] 전투 로그가 솟구치고', '[스탯 포인트 +5] 배분 대기 메시지가 뜨고',
  '<드랍: 유니크 등급 아이템> 빛기둥이 솟으며', '[상태이상: 중독 — 지속 30초] 디버프가 걸리고', '<업적 달성: 단독 보스 격파>가 기록되며',
  '[전용 시스템: 당신에게만 보이는 옵션] 이 깜빡이고', '<연계 퀘스트 해금: 히든 라인>이 연쇄로 열리며', '[남은 시간 03:00:00] 시나리오 타이머가 흐르고',
  '<인벤토리: 세트 효과 4/4 발동>이 점등되며', '[쿨다운 00:45] 강력기 재사용 대기가 돌고', '<랭킹 갱신: 전체 1,204위 → 87위>가 치솟으며',
  '[경험치 +1,200 / 다음 레벨까지 340] 바가 차오르고', '<페널티 경고: 퀘스트 실패 시 사망>이 명멸하며', '[히든 피스 발견: 미공개 던전]이 지도에 점등되고',
  '<시스템: 흥미롭군. 자격을 시험하겠다> 메시지가 떠오르며',
  // 아래 24개: 「○○」를 구체 명사로 치환한 히든 클래스/스킬 진화 연출(플레이스홀더 노출 없음)
  ...HIDDEN_CLASS.map((c) => `<히든 클래스 「${c}」 획득> 알림이 굵게 떠오르며`),
  ...SKILL_EVO.map((s) => `<스킬 진화: ${s}> 알림이 울리며`),
]
const SLOT_BUILD = [ // 22
  '깡스탯 근접 탱커 빌드', '치명타 특화 암살 잠입 빌드', '광역 마법 누킹 빌드', '소환수·그림자 군단 운용 빌드',
  '디버프·상태이상 컨트롤 빌드', '강화·확률을 읽는 도박 운용', '생산직·연금 시너지 하이브리드', '버프·지원 힐러 빌드',
  '쿨다운·자원관리 극대화 빌드', '세트 효과 풀세팅 옵션 빌드', '히든 패시브 연계 콤보 빌드', '진명·각성 기반 일격필살 빌드',
  '정령 계약 멀티 소환 빌드', '회귀 지식으로 선점한 사기 스킬', '전용 시스템 무제한 성장 빌드', '독·출혈 도트 누적 빌드',
  '반사·카운터 받아치기 빌드', '은신·기습 후 한 방 빌드', '아이템 드랍률 극대화 트레저 빌드', '광역 군중 제어(CC) 빌드',
  '경험치 효율 극대화 사냥 빌드', '면역·해제 위주의 생존 빌드',
]
const SLOT_QUEST = [ // 22
  '미답파 층의 보스 레이드에 도전하고', '실패 시 사망하는 강제 메인 시나리오를 받으며', '히든 퀘스트의 까다로운 조건을 추적하고',
  '대균열 던전 브레이크를 막아야 하며', '랭킹전 토너먼트에서 상위 랭커와 맞붙고', '전직 퀘스트의 시험을 통과해야 하며',
  '월드 보스 첫 처치 경쟁에 뛰어들고', '제한 시간 안에 봉인을 해제해야 하며', '길드 점령전에서 영지를 두고 충돌하고',
  '연계 퀘스트가 예상 밖의 분기로 갈라지며', '히든 피스를 독점하려 미구현 맵을 파고들고', '데스게임 한 층의 클리어 조건을 풀어야 하며',
  '드랍 확률 낮은 유니크를 노린 반복 사냥에 매달리고', 'PvP 결투로 명예와 칭호를 걸며', '강화 성공률에 장비의 운명을 걸고',
  '협회·국가가 의뢰한 S급 토벌에 나서며', '시나리오 진행자가 낸 수수께끼를 풀어야 하고', '봉인된 네임드를 깨워 토벌하려 하며',
  '동료를 살릴 단 한 번의 구출 퀘스트에 나서고', '회귀 전 비극이 일어난 사건을 미리 막으려 하며', '히든 클래스 해금의 마지막 조건을 채우려 하고',
  '탑의 관리자가 낸 자격 시험을 치르며',
]
const SLOT_SYSTEM = [ // 20
  '이 시스템이 누가·왜 깔았는지 의문이 고개를 들고', '진행자(도깨비)의 진짜 의도가 어른거리며', '상태창 너머에 또 다른 관찰자가 있음이 드러나고',
  '전용 시스템이 사실 시험·선별 장치였음이 비치며', '레벨업의 환희 뒤에 숨은 디버프·대가가 누적되고', '회귀가 한 번뿐이 아닐지 모른다는 암시가 깔리며',
  '게임 세계가 단순 게임이 아니라는 단서가 드러나고', '별자리·후원자의 거래에 숨은 함정이 비치며', '시스템 메시지의 어투가 점점 인격적으로 변하고',
  '탑/시스템의 주인이라는 존재의 그림자가 비치며', '죽으면 진짜 죽는 규칙의 예외가 있음이 암시되고', '원작과 어긋난 분기가 더 큰 비밀을 가리키며',
  '버그·미구현 영역이 의도된 흔적임이 드러나고', '강화·확률의 난수에 누군가의 손길이 비치며', '튜토리얼 안내 AI가 무언가를 숨기고 있고',
  '인류의 시나리오가 더 큰 게임의 한 판일 뿐임이 암시되며', '히든 피스가 세계의 비밀로 향하는 열쇠임이 드러나고', '주인공의 각성이 곧 봉인 해제의 조건이었음이 비치며',
  '시스템의 공정성에 균열을 내는 사기 옵션이 발각되고', '관리자가 주인공을 특별히 주시하고 있음이 드러나며',
]
const SLOT_REWARD = [ // 20
  '유니크 등급 아이템을 손에 넣은 끝에', '최초 클리어 칭호와 버프를 거머쥔 끝에', '히든 클래스 전직에 성공한 끝에',
  '상위 스킬로 진화시킨 끝에', '강화 +9 무기를 완성한 끝에', '세트 효과 풀세팅을 갖춘 끝에',
  '랭킹 상위권으로 단숨에 도약한 끝에', '전용 시스템의 새 옵션을 개방한 끝에', '봉인된 잠재력을 각성시킨 끝에',
  '레어 드랍을 독점한 끝에', '히든 퀘스트의 비밀 보상을 받은 끝에', '진명을 되찾아 본래 힘을 연 끝에',
  '그림자 군단을 한 단계 늘린 끝에', '레벨 캡을 돌파한 끝에', '회귀 지식으로 미래의 보상을 선점한 끝에',
  '월드 보스 퍼스트 킬 보상을 챙긴 끝에', '치명적 약점을 메울 면역 스킬을 얻은 끝에', '경험치 폭증으로 단번에 여러 레벨을 올린 끝에',
  '미공개 던전의 첫 발견 보너스를 독차지한 끝에', '세트 마지막 조각을 맞춰 풀세트 효과를 켠 끝에',
]
const SLOT_MOOD = [ // 20
  '경이와 설렘이 차오르는', '숨 막히는 긴장이 팽팽한', '잿빛 절망이 무겁게 내려앉은', '통쾌한 사이다가 터지는',
  '음모와 정보전이 번뜩이는', '죽음의 공포가 스며든', '환호하는 관중의 열기가 넘치는', '서늘한 살의가 도사린',
  '비통한 상실의 슬픔이 감도는', '뒤틀린 시스템의 불길함이 깔린', '치밀한 빌드 최적화의 몰입이 흐르는', '폭발 직전의 클라이맥스 압박이 차오르는',
  '루팅 직전의 두근거리는 기대가 감도는', '냉혹한 랭킹 경쟁이 끓는', '회귀자만 아는 우월감이 흐르는', '한계 돌파의 각성이 차오르는',
  '데스게임의 절박한 생존 본능이 들끓는', '시스템 너머의 거대한 미스터리가 어른거리는',
  '첫 보스 격파를 앞둔 비장한 결의가 서린', '연속 사망 끝에 바닥난 자원의 초조함이 감도는',
]
const SLOT_TURN = [ // 17
  '클리프행어로 다음 비트를 연다', '거짓 승리로 판을 뒤집는다', '복선 한 줄을 슬쩍 심어 둔다',
  '시스템 떡밥을 한 조각 흘려 둔다', '진각성의 징조로 끝맺는다', '동료의 희생으로 무게를 더한다',
  '사이다 직전 고구마로 낙차를 키운다', '흑막·진행자의 시점으로 장을 닫는다', '봉인·시나리오 카운트다운을 한 칸 줄인다',
  '새 동료·라이벌의 등장으로 판을 넓힌다', '스케일을 한 단계 끌어올린다(마을→세계)', '거짓 패배로 독자의 가슴을 졸이게 한다',
  '히든 옵션을 처음 발현해 보인다', '적의 인간적 사연을 드러내 입체화한다', '다음 회차의 거대한 떡밥을 던진다',
  '랭킹·등급의 단위 리셋을 예고한다', '숨겨둔 두 번째 직업의 존재를 처음 암시한다',
]
const SLOTS: { key: string; label: string; pool: string[] }[] = [
  { key: 'stage', label: '무대', pool: SLOT_STAGE },
  { key: 'mood', label: '분위기', pool: SLOT_MOOD },
  { key: 'hero', label: '주인공', pool: SLOT_HERO },
  { key: 'trigger', label: '접속·각성 트리거', pool: SLOT_TRIGGER },
  { key: 'status', label: '상태창 연출', pool: SLOT_STATUS },
  { key: 'build', label: '스킬·빌드', pool: SLOT_BUILD },
  { key: 'quest', label: '퀘스트·게이트', pool: SLOT_QUEST },
  { key: 'system', label: '시스템 떡밥', pool: SLOT_SYSTEM },
  { key: 'reward', label: '보상·드랍', pool: SLOT_REWARD },
  { key: 'turn', label: '전환 장치', pool: SLOT_TURN },
]
// 조합수: 각 풀 길이의 곱. (26×20×26×24×22×22×22×20×20×17, 표시 단위로 환산)
const COMBOS = SLOTS.reduce((n, s) => n * s.pool.length, 1)
function fmtCombos(n: number): string {
  if (n >= 1e16) return (n / 1e16).toFixed(n >= 1e17 ? 0 : 1).replace(/\.0$/, '') + '경'
  if (n >= 1e12) return (n / 1e12).toFixed(n >= 1e13 ? 0 : 1).replace(/\.0$/, '') + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, '') + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, '') + '만'
  return n.toLocaleString('ko-KR')
}
function rndIdx(len: number): number { return Math.floor(Math.random() * len) }
// 조사 자동 선택 — 앞 글자(한글 음절)의 받침 유무로 실제 하나를 골라 출력(괄호 이중표기 금지).
function hasJong(word: string): boolean {
  const ch = word.charCodeAt(word.length - 1)
  if (ch < 0xac00 || ch > 0xd7a3) return false // 한글 음절이 아니면 받침 없음으로 취급
  return (ch - 0xac00) % 28 !== 0
}
// 받침 있으면 with, 없으면 without (예: josa(w,'을','를'))
function josa(word: string, withJong: string, noJong: string): string {
  return word + (hasJong(word) ? withJong : noJong)
}

// ──────────────────────────────────────────────────────────────────────────
// 저장 모델
// ──────────────────────────────────────────────────────────────────────────
interface UserBeat { id: string; act: string; title: string; hint?: string }
interface Store {
  title: string                                   // 작품 제목
  logline: string                                 // 한 줄 로그라인
  tpl: string                                     // 선택 템플릿(분기) key
  texts: Record<string, Record<string, string>>   // 분기별: 비트 key → 내용 텍스트
  extra: Record<string, UserBeat[]>               // 분기별: 사용자가 더한 자유 비트
  order: Record<string, string[]>                 // 분기별: 비트 표시 순서(키 배열)
  done: Record<string, Record<string, boolean>>   // 비트 완료 체크
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return 'b_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function emptyStore(): Store {
  return { title: '', logline: '', tpl: 'isekai', texts: {}, extra: {}, order: {}, done: {} }
}

function loadStore(): Store {
  const base = emptyStore()
  try {
    const raw = localStorage.getItem(LS)
    if (!raw) return base
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return base
    base.title = typeof p.title === 'string' ? p.title : ''
    base.logline = typeof p.logline === 'string' ? p.logline : ''
    base.tpl = TEMPLATES.some((t) => t.key === p.tpl) ? p.tpl : 'isekai'
    if (p.texts && typeof p.texts === 'object') {
      for (const tk of Object.keys(p.texts)) {
        const m = p.texts[tk]
        if (m && typeof m === 'object') {
          base.texts[tk] = {}
          for (const bk of Object.keys(m)) if (typeof m[bk] === 'string') base.texts[tk][bk] = m[bk]
        }
      }
    }
    if (p.done && typeof p.done === 'object') {
      for (const tk of Object.keys(p.done)) {
        const m = p.done[tk]
        if (m && typeof m === 'object') {
          base.done[tk] = {}
          for (const bk of Object.keys(m)) base.done[tk][bk] = !!m[bk]
        }
      }
    }
    if (p.extra && typeof p.extra === 'object') {
      for (const tk of Object.keys(p.extra)) {
        if (Array.isArray(p.extra[tk])) {
          base.extra[tk] = p.extra[tk]
            .filter((b: any) => b && typeof b === 'object' && typeof b.title === 'string')
            .map((b: any) => ({ id: String(b.id || newId()), act: typeof b.act === 'string' ? b.act : '추가', title: String(b.title), hint: typeof b.hint === 'string' ? b.hint : '' }))
        }
      }
    }
    if (p.order && typeof p.order === 'object') {
      for (const tk of Object.keys(p.order)) if (Array.isArray(p.order[tk])) base.order[tk] = p.order[tk].filter((x: any) => typeof x === 'string')
    }
    return base
  } catch {
    return base
  }
}

// ──────────────────────────────────────────────────────────────────────────
export default function LitrpgOutline({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [note, setNote] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [showSpark, setShowSpark] = useState(false)
  // 영감 슬롯 현재 선택 인덱스 + 잠금
  const [picks, setPicks] = useState<Record<string, number>>(() => {
    const o: Record<string, number> = {}
    for (const s of SLOTS) o[s.key] = rndIdx(s.pool.length)
    return o
  })
  const [locks, setLocks] = useState<Record<string, boolean>>({})
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // payload.genre 활용 — 게임판타지·LitRPG 외 장르로 열려도 동작하되 안내.
  const payloadGenre = typeof payload?.genre === 'string' ? (payload!.genre as string) : ''

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
  }, [])

  // payload 로 분기(템플릿)를 지정해 열 수 있게(예: 다른 도구에서 tpl 전달).
  useEffect(() => {
    const t = typeof payload?.tpl === 'string' ? (payload!.tpl as string) : ''
    if (t && TEMPLATES.some((x) => x.key === t)) setStore((s) => ({ ...s, tpl: t }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동 저장.
  useEffect(() => {
    try {
      localStorage.setItem(LS, JSON.stringify(store))
    } catch {
      if (mounted.current) flash('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.', true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store])

  const flash = (msg: string, warn = false) => {
    if (!mounted.current) return
    setNote((warn ? '⚠️ ' : '') + msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2600)
  }

  const tkey = store.tpl
  const def = tplDef(tkey)

  // 현재 분기의 전체 비트(기본 + 사용자 추가)를 order 에 맞춰 정렬.
  const buildBeats = (): BeatDef[] => {
    const base = def.beats
    const extra = (store.extra[tkey] || []).map((b) => ({ key: b.id, act: b.act, title: b.title, hint: b.hint || '' }))
    const all = [...base, ...extra]
    const ord = store.order[tkey]
    if (ord && ord.length) {
      const map = new Map(all.map((b) => [b.key, b]))
      const sorted: BeatDef[] = []
      for (const k of ord) { const b = map.get(k); if (b) { sorted.push(b); map.delete(k) } }
      for (const b of all) if (map.has(b.key)) sorted.push(b) // 신규(순서 미기재)는 뒤에
      return sorted
    }
    return all
  }
  const beats = buildBeats()

  const getText = (bk: string) => store.texts[tkey]?.[bk] || ''
  const isDone = (bk: string) => !!store.done[tkey]?.[bk]

  const setText = (bk: string, v: string) => {
    setStore((s) => ({ ...s, texts: { ...s.texts, [tkey]: { ...(s.texts[tkey] || {}), [bk]: v } } }))
  }
  const toggleDone = (bk: string) => {
    setStore((s) => ({ ...s, done: { ...s.done, [tkey]: { ...(s.done[tkey] || {}), [bk]: !(s.done[tkey]?.[bk]) } } }))
  }
  const toggleOpen = (bk: string) => setOpen((o) => ({ ...o, [bk]: !o[bk] }))

  // 순서 보장: 현재 비트 키 배열을 order 에 반영하고 dir 방향 이동.
  const moveBeat = (bk: string, dir: -1 | 1) => {
    const keys = beats.map((b) => b.key)
    const i = keys.indexOf(bk)
    const j = i + dir
    if (i < 0 || j < 0 || j >= keys.length) return
    ;[keys[i], keys[j]] = [keys[j], keys[i]]
    setStore((s) => ({ ...s, order: { ...s.order, [tkey]: keys } }))
  }

  // 자유 비트 추가(현재 마지막 막 라벨로).
  const addBeat = () => {
    const lastAct = beats.length ? beats[beats.length - 1].act : '추가'
    const nb: UserBeat = { id: newId(), act: lastAct, title: '새 비트', hint: '' }
    setStore((s) => {
      const extra = [...(s.extra[tkey] || []), nb]
      const order = (s.order[tkey] && s.order[tkey].length) ? [...s.order[tkey], nb.id] : [...beats.map((b) => b.key), nb.id]
      return { ...s, extra: { ...s.extra, [tkey]: extra }, order: { ...s.order, [tkey]: order } }
    })
    setOpen((o) => ({ ...o, [nb.id]: true }))
    flash('새 비트를 추가했어요. 제목과 내용을 채워보세요.')
  }
  const isExtra = (bk: string) => (store.extra[tkey] || []).some((b) => b.id === bk)
  const renameBeat = (bk: string, title: string) => {
    setStore((s) => ({ ...s, extra: { ...s.extra, [tkey]: (s.extra[tkey] || []).map((b) => (b.id === bk ? { ...b, title } : b)) } }))
  }
  const removeBeat = (bk: string) => {
    if (!window.confirm('이 비트와 내용을 삭제할까요?')) return
    setStore((s) => {
      const extra = (s.extra[tkey] || []).filter((b) => b.id !== bk)
      const texts = { ...(s.texts[tkey] || {}) }; delete texts[bk]
      const done = { ...(s.done[tkey] || {}) }; delete done[bk]
      const order = (s.order[tkey] || beats.map((b) => b.key)).filter((k) => k !== bk)
      return { ...s, extra: { ...s.extra, [tkey]: extra }, texts: { ...s.texts, [tkey]: texts }, done: { ...s.done, [tkey]: done }, order: { ...s.order, [tkey]: order } }
    })
  }

  // ── 진행률 ───────────────────────────────────────────────────────────────
  const filled = beats.filter((b) => getText(b.key).trim()).length
  const doneCount = beats.filter((b) => isDone(b.key)).length
  const pct = beats.length ? Math.round((filled / beats.length) * 100) : 0

  // ── 영감 굴리기 ─────────────────────────────────────────────────────────
  const roll = () => {
    setPicks((prev) => {
      const next = { ...prev }
      for (const s of SLOTS) if (!locks[s.key]) next[s.key] = rndIdx(s.pool.length)
      return next
    })
  }
  const toggleLock = (k: string) => setLocks((l) => ({ ...l, [k]: !l[k] }))
  const sparkText = (): string => {
    const v = (k: string) => SLOTS.find((s) => s.key === k)!.pool[picks[k]]
    return `${v('mood')} ${v('stage')}에서, ${v('hero')}에게 ${v('trigger')} ${v('status')}. ${josa(v('build'), '을', '를')} 무기로 ${v('quest')}, ${v('system')}. ${v('reward')} 끝내 ${v('turn')}.`
  }
  const sparkToLibrary = () => {
    const item = addToLibrary('snippets', { text: sparkText(), source: 'LitRPG 개요 빌더 · 비트 영감', tags: ['게임판타지·LitRPG', def.label] })
    flash(item ? '굴린 비트 영감을 글감(스니펫)에 보관했어요.' : '글감 보관에 실패했어요.', !item)
  }
  const sparkToCopy = async () => {
    const text = sparkText()
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); flash('비트 영감을 복사했어요.'); return }
    } catch {}
    try {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.focus(); ta.select(); const ok = document.execCommand('copy'); document.body.removeChild(ta)
      flash(ok ? '비트 영감을 복사했어요.' : '복사에 실패했어요.', !ok)
    } catch { flash('복사에 실패했어요.', true) }
  }
  // 선택한 비트의 내용으로 끼워넣기 — 첫 빈 비트 또는 첫 비트에.
  const sparkInto = () => {
    const target = beats.find((b) => !getText(b.key).trim()) || beats[0]
    if (!target) return
    const cur = getText(target.key)
    setText(target.key, cur ? cur + '\n' + sparkText() : sparkText())
    setOpen((o) => ({ ...o, [target.key]: true }))
    flash(`'${target.title}' 비트에 영감을 넣었어요.`)
  }

  // ── 텍스트/HTML 내보내기 ─────────────────────────────────────────────────
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const escMl = (s: string) => esc(s).replace(/\n/g, '<br/>')

  const buildText = (): string => {
    const lines: string[] = []
    lines.push(`# LitRPG 개요 — ${def.label}${store.title ? ` · ${store.title}` : ''}`)
    if (store.logline.trim()) lines.push(`로그라인: ${store.logline.trim()}`)
    lines.push(`채운 비트 ${filled}/${beats.length} · 완료 ${doneCount} (${pct}%)`)
    lines.push('')
    let lastAct = ''
    for (const b of beats) {
      if (b.act !== lastAct) { lines.push(`## ${b.act}`); lastAct = b.act }
      lines.push(`${isDone(b.key) ? '[v]' : '[ ]'} ${b.title}`)
      const t = getText(b.key).trim()
      lines.push(t ? t.split('\n').map((l) => '   ' + l).join('\n') : '   (미작성)')
      lines.push('')
    }
    return lines.join('\n').trimEnd() + '\n'
  }
  const buildHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><strong>LitRPG 개요 · ${esc(def.label)}</strong>${store.title ? ` — ${esc(store.title)}` : ''}</p>`)
    if (store.logline.trim()) parts.push(`<p><em>로그라인: ${esc(store.logline.trim())}</em></p>`)
    parts.push(`<p>채운 비트 ${filled}/${beats.length} · 완료 ${doneCount} (${pct}%)</p>`)
    let lastAct = ''
    for (const b of beats) {
      if (b.act !== lastAct) { parts.push(`<h2>${esc(b.act)}</h2>`); lastAct = b.act }
      parts.push(`<h3>${isDone(b.key) ? '✅ ' : ''}${esc(b.title)}</h3>`)
      const t = getText(b.key).trim()
      parts.push(`<p>${t ? escMl(t) : '<em>(미작성)</em>'}</p>`)
    }
    return parts.join('')
  }

  const copyAll = async () => {
    const text = buildText()
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); flash('개요 전체를 복사했어요.'); return }
    } catch {}
    try {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.focus(); ta.select(); const ok = document.execCommand('copy'); document.body.removeChild(ta)
      flash(ok ? '개요 전체를 복사했어요.' : '복사에 실패했어요. 직접 선택해 복사하세요.', !ok)
    } catch { flash('복사에 실패했어요.', true) }
  }
  const exportTxt = () => {
    try {
      const blob = new Blob([buildText()], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (store.title ? store.title.replace(/[\\/:*?"<>|]/g, '_') : 'litrpg-outline') + '-개요.txt'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1200)
      flash('개요를 .txt 로 내보냈어요.')
    } catch { flash('내보내기가 지원되지 않는 환경이에요.', true) }
  }

  // 프로젝트(원고 › 개요 폴더)에 개요 문서로 추가.
  const toProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.', true); return }
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '개요',
      title: `개요 · ${store.title || def.label}`,
      bodyHtml: buildHtml(),
      synopsis: store.logline.trim() || def.blurb,
      icon: meta.icon,
      meta: {
        장르: '게임판타지·LitRPG',
        분기: def.label,
        로그라인: store.logline.trim() || '(없음)',
        진행: `${filled}/${beats.length} (${pct}%)`,
      },
    })
    flash(id ? '원고(개요)에 개요 문서를 추가했어요.' : '프로젝트에 연결되지 않았습니다.', !id)
  }

  // 분기(템플릿) 전환.
  const switchTpl = (k: string) => { setStore((s) => ({ ...s, tpl: k })); setOpen({}) }

  // 현재 분기 내용 비우기.
  const resetTpl = () => {
    if (!window.confirm(`'${def.label}' 구조의 모든 비트 내용·추가 비트·순서를 비웁니다. 계속할까요?`)) return
    setStore((s) => ({
      ...s,
      texts: { ...s.texts, [tkey]: {} },
      done: { ...s.done, [tkey]: {} },
      extra: { ...s.extra, [tkey]: [] },
      order: { ...s.order, [tkey]: [] },
    }))
    setOpen({})
    flash('현재 구조의 내용을 비웠어요.')
  }

  const relatedTools = ['plot-pyramid', 'scene-list', 'world-wiki', 'hero-journey-map', 'save-the-cat-beats']
  const relatedNames: Record<string, string> = {
    'plot-pyramid': '⛰️ 플롯 피라미드', 'scene-list': '🎬 장면 목록', 'world-wiki': '📚 세계관 위키',
    'hero-journey-map': '🗺️ 영웅의 여정', 'save-the-cat-beats': '🐱 비트 시트',
  }

  // ── 스타일 ─────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0 }
  const head: React.CSSProperties = { padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--chrome-2)' }
  const input: React.CSSProperties = { padding: '8px 10px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', minWidth: 0 }
  const tplRow: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap' }
  const tplBtn = (active: boolean): React.CSSProperties => ({
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '7px 10px', borderRadius: 10, cursor: 'pointer',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'), background: active ? 'var(--accent)' : 'var(--panel)',
    color: active ? '#fff' : 'var(--text)', fontSize: 12.5, lineHeight: 1.3,
  })
  const barWrap: React.CSSProperties = { height: 9, borderRadius: 99, background: 'var(--paper)', border: '1px solid var(--border)', overflow: 'hidden' }
  const barFill: React.CSSProperties = { height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--ok))', transition: 'width .25s ease' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }
  const actLabel: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: 'var(--accent)', margin: '8px 0 2px', display: 'flex', alignItems: 'center', gap: 6 }
  const card = (done: boolean): React.CSSProperties => ({ border: '1px solid var(--border)', borderRadius: 11, background: 'var(--panel)', borderLeft: `4px solid ${done ? 'var(--ok)' : 'var(--accent)'}`, overflow: 'hidden' })
  const cHead: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 9, padding: '9px 11px' }
  const cTitle: React.CSSProperties = { fontSize: 14, fontWeight: 700, lineHeight: 1.35, flex: 1, minWidth: 0 }
  const chk: React.CSSProperties = { flexShrink: 0, width: 17, height: 17, marginTop: 2, cursor: 'pointer', accentColor: 'var(--ok)' }
  const iconBtn: React.CSSProperties = { flexShrink: 0, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 3 }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, padding: '0 11px 6px' }
  const ta: React.CSSProperties = { width: '100%', minHeight: 64, resize: 'vertical', padding: '8px 10px', fontSize: 13.5, lineHeight: 1.55, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const foot: React.CSSProperties = { borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--chrome-2)' }
  const sparkBox: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }
  const slotRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }
  const slotChip: React.CSSProperties = { flex: 1, minWidth: 0, padding: '6px 9px', borderRadius: 8, background: 'var(--chrome-2)', border: '1px solid var(--border)', lineHeight: 1.4 }

  let lastAct = ''

  return (
    <div style={wrap}>
      <div style={head}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input style={{ ...input, flex: '2 1 200px' }} value={store.title} onChange={(e) => setStore((s) => ({ ...s, title: e.target.value }))} placeholder="작품 제목 (선택)" maxLength={120} aria-label="작품 제목" />
          <input style={{ ...input, flex: '3 1 260px' }} value={store.logline} onChange={(e) => setStore((s) => ({ ...s, logline: e.target.value }))} placeholder="로그라인 한 줄 (예: 회귀한 F급 헌터가 게임지식으로 세계 최강에 오른다)" maxLength={200} aria-label="로그라인" />
        </div>

        <div style={tplRow}>
          {TEMPLATES.map((t) => (
            <button key={t.key} style={tplBtn(t.key === tkey)} onClick={() => switchTpl(t.key)} title={t.blurb}>
              <span style={{ fontWeight: 800 }}><Emoji e={t.icon}/> {t.label}</span>
              <span style={{ fontSize: 11, opacity: t.key === tkey ? 0.9 : 0.7 }}>{t.tag}</span>
            </button>
          ))}
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>{def.blurb}</div>

        <div style={barWrap}><div style={barFill} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, color: 'var(--muted)', gap: 10 }}>
          <span>채운 비트 <strong style={{ color: 'var(--text)' }}>{filled}</strong>/{beats.length} · 완료 <strong style={{ color: 'var(--ok)' }}>{doneCount}</strong> · <strong style={{ color: 'var(--accent)' }}>{pct}%</strong></span>
          <button className="minibtn" onClick={() => setShowSpark((v) => !v)} title="LitRPG 특화 슬롯으로 비트 영감을 무작위 조합">{showSpark ? <><Emoji e="🎲"/> 영감 닫기</> : <><Emoji e="🎲"/> 비트 영감 굴리기</>}</button>
        </div>

        {payloadGenre && payloadGenre !== '게임판타지·LitRPG' && (
          <div style={{ fontSize: 11.5, color: 'var(--warn)', lineHeight: 1.5 }}>이 도구는 게임판타지·LitRPG 전용이에요. (요청 장르: {payloadGenre})</div>
        )}
        {note && <div style={{ fontSize: 12, lineHeight: 1.5, color: note.startsWith('⚠️') ? 'var(--warn)' : 'var(--ok)' }}>{emojify(note)}</div>}
      </div>

      {/* 영감 패널 */}
      {showSpark && (
        <div style={{ padding: '10px 14px 0' }}>
          <div style={sparkBox}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 13 }}><Emoji e="🎲"/> LitRPG 비트 영감</strong>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>조합 가능 수 <strong style={{ color: 'var(--accent)' }}>{fmtCombos(COMBOS)}</strong>가지 ({COMBOS.toLocaleString('ko-KR')})</span>
              <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={roll}><Emoji e="🎲"/> 굴리기</button>
            </div>
            {SLOTS.map((s) => (
              <div key={s.key} style={slotRow}>
                <span style={{ width: 96, flexShrink: 0, color: 'var(--muted)', fontWeight: 600 }}>{s.label}</span>
                <span style={slotChip}>{s.pool[picks[s.key]]}</span>
                <button style={{ ...iconBtn, color: locks[s.key] ? 'var(--accent)' : 'var(--muted)' }} onClick={() => toggleLock(s.key)} title={locks[s.key] ? '잠금 해제' : '이 슬롯 잠그기(재굴림 제외)'} aria-label="슬롯 잠금">{locks[s.key] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
              </div>
            ))}
            <div style={{ fontSize: 13, lineHeight: 1.6, padding: '8px 10px', background: 'var(--chrome-2)', borderRadius: 8, border: '1px dashed var(--border)' }}>{sparkText()}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="minibtn" onClick={sparkInto} disabled={!beats.length}>↩ 빈 비트에 넣기</button>
              <button className="linkbtn" onClick={sparkToLibrary}><Emoji e="📌"/> 글감으로 보관</button>
              <button className="minibtn" onClick={sparkToCopy}><Emoji e="📋"/> 복사</button>
            </div>
          </div>
        </div>
      )}

      {/* 비트 목록 */}
      <div style={body}>
        {beats.map((b, i) => {
          const showAct = b.act !== lastAct
          lastAct = b.act
          const isOpen = !!open[b.key]
          const txt = getText(b.key)
          const done = isDone(b.key)
          const extra = isExtra(b.key)
          return (
            <div key={b.key}>
              {showAct && <div style={actLabel}><span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--accent)', display: 'inline-block' }} />{b.act}</div>}
              <div style={card(done)}>
                <div style={cHead}>
                  <input type="checkbox" style={chk} checked={done} onChange={() => toggleDone(b.key)} aria-label={`${b.title} 완료`} />
                  {extra ? (
                    <input
                      style={{ ...input, flex: 1, padding: '4px 8px', fontSize: 14, fontWeight: 700 }}
                      value={b.title}
                      onChange={(e) => renameBeat(b.key, e.target.value)}
                      aria-label="비트 제목"
                      maxLength={80}
                    />
                  ) : (
                    <div style={cTitle}>{b.title}{txt.trim() && !isOpen ? <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · 작성됨</span> : ''}</div>
                  )}
                  <button style={iconBtn} onClick={() => moveBeat(b.key, -1)} disabled={i === 0} title="위로" aria-label="위로">▲</button>
                  <button style={iconBtn} onClick={() => moveBeat(b.key, 1)} disabled={i === beats.length - 1} title="아래로" aria-label="아래로">▼</button>
                  {extra && <button style={iconBtn} onClick={() => removeBeat(b.key)} title="삭제" aria-label="삭제"><Emoji e="🗑️"/></button>}
                  <button className="minibtn" style={{ flexShrink: 0 }} onClick={() => toggleOpen(b.key)} aria-expanded={isOpen}>{isOpen ? '접기 ▲' : '펼치기 ▼'}</button>
                </div>
                {isOpen && (
                  <>
                    {b.hint && <div style={hint}><Emoji e="💡"/> {emojify(b.hint)}</div>}
                    <div style={{ padding: '0 11px 11px' }}>
                      <textarea style={ta} value={txt} onChange={(e) => setText(b.key, e.target.value)} placeholder="이 비트에서 일어나는 일·전투·성장(수치)·보상·다음 목표를 적어보세요…" />
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
        <button className="minibtn" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={addBeat}>＋ 비트 추가</button>
      </div>

      {/* 연계 바 */}
      <div style={{ ...foot, paddingBottom: 0 }} className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '원고 › 개요 폴더에 개요 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        {relatedTools.map((id) => (
          <button key={id} className="linkbtn" onClick={() => openToolLinked(id, { genre: '게임판타지·LitRPG' })} title={`${relatedNames[id]} 열기`}>{emojify(relatedNames[id])}</button>
        ))}
      </div>

      {/* 하단 액션 */}
      <div style={foot}>
        <button className="btn-primary" onClick={copyAll}><Emoji e="📋"/> 전체 복사</button>
        <button className="minibtn" onClick={exportTxt}><Emoji e="⬇️"/> .txt 내보내기</button>
        <button className="minibtn" onClick={() => setOpen(Object.fromEntries(beats.map((b) => [b.key, true])))}>모두 펼치기</button>
        <button className="minibtn" onClick={() => setOpen({})}>모두 접기</button>
        <span style={{ flex: 1 }} />
        <button className="minibtn" style={{ color: 'var(--warn)' }} onClick={resetTpl}>이 구조 비우기</button>
      </div>
    </div>
  )
}
