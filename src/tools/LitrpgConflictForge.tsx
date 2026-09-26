// 게임판타지·LitRPG 갈등·딜레마 단조기 — 도시에에 근거한 'LitRPG다운' 갈등 구도 슬롯 조합 생성기.
//  분기(VR다이브/데스게임/이세계전이/현실침공) 첫 선택 → 톤·관습이 결정되고, 이후 슬롯이 그 색을 띤다.
//  슬롯: 분기 · 주인공(원형) · 시스템 권능(특별함) · 욕망(목표 위계) · 장애물 · 시스템의 대가/페널티
//        · 위기에 걸린 것 · 도덕적 딜레마 · 비틀기(시스템의 배후) · 무대(던전/레이드/랭킹전)
//  슬롯별 🔒 잠금 + 부분 재생성, 전체 조합수 표시(1조 이상). 결과를 한 줄 갈등 문장으로 조립.
//  연계: addToProject(folder:'갈등') 문서 추가 · addToLibrary('snippets') 글감 저장 · 관련 도구 열기.
//  자급식: react · './linkbus' 외 import 없음. 전부 로컬. localStorage 'sry:tool:litrpg-conflictforge'.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'litrpg-conflictforge', name: 'LitRPG 갈등 단조기', icon: '⚔️', group: '생성기', genre: '게임판타지·LitRPG', intro: '상태창·시스템·레벨업·페널티·데스게임으로 LitRPG다운 갈등과 딜레마를 무작위 단조', w: 620, h: 700 }

// ── 0) 장르 분기(첫 선택) — 도시에 §0: 네 분기가 톤·관습·금기를 가른다 ──
interface Branch { key: string; label: string; icon: string; hint: string; tag: string }
const BRANCHES: Branch[] = [
  { key: 'vr', label: 'VR 다이브형', icon: '🎮', hint: '현실 인간이 VRMMO에 접속(달빛조각사/로열로드). 로그아웃·현실 생활 존재.', tag: '캡슐 다이브' },
  { key: 'death', label: '갇힘·데스게임형', icon: '💀', hint: '게임에서 못 나옴, 죽으면 진짜 죽음(SAO). 긴장도 최상, 안전지대 없음.', tag: '데스게임' },
  { key: 'isekai', label: '이세계 전이+시스템형', icon: '🌀', hint: '다른 세계로 넘어갔는데 게임 시스템이 깔려 있음. 로그아웃 개념 없음.', tag: '시스템 전이' },
  { key: 'apoc', label: '현실 침공형(시스템 아포칼립스)', icon: '🌃', hint: '어느 날 현실에 상태창·던전·게이트가 생김(헌터물과 융합).', tag: '시스템 침공' },
]
function branchDef(k: string): Branch { return BRANCHES.find((b) => b.key === k) || BRANCHES[3] }

// ── LitRPG 도시에 기반 공통 슬롯 풀(장르 특화·구체) ──
// 1) 주인공 원형 — 약자/하층 랭커/F급 각성자에서 출발하는 성장 곡선의 시작점
const SUBJECT_ALL = [
  '랭킹 최하위로 무시당하던 F급 각성자', '길드에서 쫓겨난 짐꾼 포지션 플레이어', '튜토리얼도 못 깨던 무재능 신규 유저',
  '회귀해 모든 공략을 외운 전(前) 1위 랭커', '원작 소설을 끝까지 읽은 유일한 독자', '스탯이 전부 0으로 시작한 버그 같은 계정',
  '히든 클래스를 단독으로 받은 평범한 직장인', '죽은 형의 계정을 물려받은 동생', '시스템 메시지에 홀로 응답할 수 있는 자',
  '레벨이 오르지 않는 저주받은 직업의 소유자', '현실에선 병상에 누운 채 게임에만 접속하는 환자', '게임 폐인이라 손가락질받던 무직 청년',
  '각성 등급 측정 불가 판정을 받은 이레귤러', '튜토리얼 100층을 홀로 돌파한 외톨이', '죽으면 하루 전으로 회귀하는 능력을 가진 자',
  '아이템 감정 능력만 비정상적으로 높은 상인', '버려진 초보 마을에서 시작한 늦깎이 유저', '시스템이 오류라며 추방하려는 비정규 플레이어',
  '전설의 노가다 끝에 유니크를 얻은 생산직', '죽음의 카운트가 머리 위에 뜬 시한부 플레이어', '게이트 너머에서 10년을 버티고 돌아온 귀환자',
  '시나리오를 거부하고 시스템과 거래하는 협상가', '랭커였던 부모의 빚을 떠안은 신참 헌터', '클리어 보상을 빼앗기고 누명까지 쓴 공략조장',
  '동료를 살리려다 영구사망 페널티를 대신 떠안은 탱커', '시스템이 부여한 직업을 끝내 거부한 무직 각성자', '레이드 전멸의 유일한 생존자로 낙인찍힌 힐러',
  '튜토리얼 버그를 악용했다 영구 정지당할 뻔한 트롤러', '저주 등급 아이템에 의식이 깃든 채 깨어난 검',
]
// 분기별 색을 더하는 보조 주체(앞 풀에 합쳐짐)
const SUBJECT_EXTRA: Record<string, string[]> = {
  vr: ['현금화로 가족을 부양하려는 생계형 플레이어', '랭킹전 상금만 노리는 프로게이머 지망생', '게임 속 NPC와 정을 붙여버린 다이버'],
  death: ['공략조 전멸 후 홀로 살아남은 생존자', '동생을 인질로 데스게임에 끌려온 형', '죽음의 페널티를 한 번 직접 목격한 자'],
  isekai: ['전생의 기억을 가진 채 시스템 세계에 태어난 자', '용사 소환에 휘말려 끌려온 일반인', '이 세계가 게임임을 아는 유일한 전생자'],
  apoc: ['게이트 1세대 각성자로 살아남은 베테랑', '가족을 던전 브레이크로 잃은 복수자', '협회가 통제하려는 등급 외 변종 각성자'],
}

// 2) 시스템 권능(특별함) — 도시에 §2: 남들 못 가진 직업/칭호/스킬의 '특별함'
const POWER = [
  '획득 경험치가 동료에게도 분배되는 〈군주〉 패시브', '죽인 적을 그림자 병사로 부리는 〈군단 소환〉',
  '실패한 퀘스트를 한 번 되돌리는 〈재시도〉 권능', '히든 클래스 〈시스템 관리자 대행〉의 콘솔 권한',
  '모든 스킬을 한 단계 위로 끌어올리는 〈상위 호환〉', '죽으면 어제로 돌아가는 〈세이브 포인트〉 능력',
  '확률 100%로 고정시키는 〈필연〉 칭호 효과', '남의 스킬을 한 번 보면 복제하는 〈모방〉',
  '레벨 제한을 무시하는 〈무한 성장〉 유니크 직업', '아이템 옵션을 강제로 재설정하는 〈운명 개찬〉',
  '죽을 위기마다 새 스킬이 각성하는 〈한계 돌파〉', '시스템 메시지를 편집·은폐할 수 있는 〈로그 조작〉',
  '경험치 대신 〈깨달음〉으로 성장하는 비공식 성장식', '히든 퀘스트만 골라 받는 〈탐색자〉 칭호',
  '드랍률·강화 성공률을 자신에게만 올리는 〈편애〉', '죽은 자의 스탯을 흡수하는 〈포식〉 스킬',
  '미래 1분을 미리 보는 〈예지 로그〉', '단 한 번, 시스템 규칙을 어길 수 있는 〈예외 권한〉',
  '스탯을 자유롭게 재분배하는 〈초기화 토큰〉 무한 보유', '동료의 죽음을 자신의 레벨로 되사는 〈대속〉',
  '디버프를 버프로 뒤집는 〈역전〉 패시브', '봉인된 0층의 보스 패턴을 통째로 아는 지식',
  '클리어 보상을 두 배로 받는 〈최초 달성〉 상시 적용', '시스템조차 감지 못하는 〈규격 외〉 스탯 창',
  '받은 피해를 그대로 적에게 되돌리는 〈반사〉 패시브', '죽은 직후 단 3초 행동을 보장하는 〈사후 유예〉',
  '아군의 사망을 한 번 무효로 만드는 〈수호자의 맹세〉', '한 번 본 던전 지도를 영구히 기억하는 〈탐험가의 눈〉',
  '레벨 차를 무시하고 약점을 꿰뚫는 〈필중 일격〉 칭호', '확률 보상을 두 번 굴려 좋은 쪽을 택하는 〈재추첨〉',
]

// 3) 욕망 — 도시에 §2·§4: 단기·중기·장기 목표 위계가 동시에 굴러간다
const DESIRE = [
  '랭킹 1위에 올라 무시했던 자들을 굴복시키는 것', '다음 층 보스를 잡아 막힌 공략을 뚫는 것',
  '히든 클래스 전직 퀘스트를 완수하는 것', '회귀 전의 비극을 이번 차수에는 막는 것',
  '데스게임을 클리어해 모두를 현실로 돌려보내는 것', '죽은 동료를 부활시킬 유니크 아이템을 손에 넣는 것',
  '시스템의 정체와 이 모든 게임의 목적을 밝히는 것', '현실의 빚과 가족을 게임 보상으로 구제하는 것',
  '최강 길드를 세워 던전 패권을 쥐는 것', '봉인된 최종 보스를 토벌해 세계를 끝내는 것',
  '각성 등급을 끌어올려 S급 헌터로 인정받는 것', '원작의 파멸 시나리오를 회피하고 살아남는 것',
  '게이트를 닫아 현실로의 몬스터 유입을 막는 것', '관리자(도깨비/시스템)와의 거래에서 우위를 점하는 것',
  '단 하나뿐인 〈최초 클리어〉 칭호를 차지하는 것', '강화에 성공해 전설 등급 무기를 완성하는 것',
  '레이드 공략조를 전멸 없이 통과시키는 것', '히든 던전의 진짜 보상에 가장 먼저 닿는 것',
  '시나리오에서 벗어나 자유 의지로 살아남는 것', '죽음의 페널티를 영구히 해제할 방법을 찾는 것',
  '버그로 규정된 자신의 권능을 시스템에 정식 등록시키는 것', '무너진 공략조를 다시 모아 재기에 성공하는 것',
  '강제 로그아웃을 막던 봉인 코드를 해제해 현실로 돌아가는 것', '랭킹전 부정행위의 진상을 폭로해 누명을 벗는 것',
]

// 4) 장애물(LitRPG 특화) — 욕망을 가로막는 시스템·규칙·세력의 힘
const OBSTACLE = [
  '시스템이 그에게만 클리어 불가 페널티 퀘스트를 강요하는 것', '죽으면 진짜로 죽는 데스게임 규칙이 안전지대를 지운 것',
  '회귀를 눈치챈 누군가가 같은 미래 지식을 쥐고 있다는 사실', '원작과 달라진 전개가 그의 공략 지식을 무력화하는 것',
  '최상위 길드가 클리어 보상과 공략 정보를 독점한 것', '보스 패턴이 매 차수마다 바뀌어 외운 공략이 통하지 않는 것',
  '히든 클래스 전직 조건이 가장 소중한 것을 제물로 요구하는 것', '강화 실패 시 장비가 파괴되는 확률(RNG)이 발목을 잡는 것',
  '관리자가 시나리오를 강제로 비틀어 그를 함정에 빠뜨리는 것', '레벨이 올라도 적의 성장 속도가 더 빨라 격차가 벌어지는 것',
  '게이트 브레이크로 몬스터가 현실로 쏟아져 나오는 것', '협회·길드가 그의 등급 외 능력을 통제·말살하려는 것',
  '동료의 배신으로 공략 정보와 아이템이 적에게 넘어간 것', '시스템 메시지가 거짓 정보를 흘려 그를 오판하게 만드는 것',
  '부활·세이브가 통하지 않는 절대 사망 구간에 들어선 것', '쿨다운과 MP 고갈로 결정적 순간에 권능을 쓸 수 없는 것',
  '상태이상(중독·기절·봉인)이 연쇄로 걸려 행동이 막히는 것', '랭킹전 룰이 그의 강점을 봉인하도록 설계된 것',
  '시간 제한 안에 층을 돌파하지 못하면 전원 사망하는 카운트다운', '데스게임 운영자가 클리어 자체를 막으려 규칙을 추가하는 것',
  '그를 따르던 공략조가 시스템의 회유에 넘어가 적이 된 것', '시스템이 그의 특별함을 버그로 규정해 삭제하려는 것',
  '권능 사용 횟수가 일일 제한에 묶여 결정적 순간에 잠기는 것', '랭킹 보상 정산이 그에게만 무한정 보류되는 것',
  '같은 히든 클래스를 노리는 경쟁자가 한발 앞서 있는 것', '맵 전체에 그를 노리는 현상금이 걸려 추격대가 따라붙는 것',
]

// 5) 시스템의 대가/페널티 — 도시에 §3: 비용·확률·쿨다운이 곧 서사적 긴장
const COST = [
  '권능을 쓸 때마다 현실의 기억 한 조각이 사라진다', '레벨을 올릴수록 인간성을 잃고 몬스터화가 진행된다',
  '회귀(세이브)는 한 번 쓸 때마다 되돌릴 수 있는 시간이 줄어든다', '미래 지식은 한 번 바꿀 때마다 더 크게 어긋난다',
  '죽은 적을 부리려면 그만큼 자신의 수명을 지불해야 한다', '강력기는 쿨다운이 길어 한 번 쓰면 한참을 무방비가 된다',
  '스킬을 쓸 때마다 시스템에 빚(코인/벌점)이 쌓여 청구된다', '경험치를 흡수할 때 그 대상의 고통까지 함께 떠안는다',
  '확률 100% 고정 권능을 쓰면 다음 행운이 0%로 봉인된다', '대속(代贖)으로 살린 동료의 운명이 곧 그의 짐이 된다',
  '로그 조작은 들키는 순간 시스템의 표적이 되어 추적당한다', '한계 돌파로 각성한 힘은 폭주해 아군까지 휩쓴다',
  '디버프를 버프로 뒤집는 대가로 회복 수단이 전부 막힌다', '편애(드랍률 상승)의 반동이 동료들의 운을 깎아먹는다',
  '예지 로그를 볼 때마다 본 미래의 무게만큼 수명이 준다', '예외 권한은 평생 단 한 번뿐, 쓰는 즉시 평범한 자가 된다',
  '강화에 한 번 실패하면 그동안 쌓은 성과가 통째로 날아간다', '시스템의 호의에는 반드시 더 큰 시나리오의 빚이 따른다',
  '대가가 명시되지 않는다 — 그래서 무엇을 잃었는지 끝내 모른다', '치른 대가는 늘 가장 늦게, 가장 잔혹한 순간에 청구된다',
  '권능을 한 번 쓸 때마다 최대 체력의 상한이 영구히 깎인다', '되돌린 죽음만큼 다음 부활의 비용이 기하급수로 불어난다',
  '반사·되돌림 권능을 쓰면 그 반동이 곱절로 자신에게 돌아온다', '능력을 각성시킬수록 시스템이 그의 행동권을 점점 제한한다',
]

// 6) 위기에 걸린 것 — 도시에 §4: 실패의 대가(상승하는 스케일)
const STAKES = [
  '데스게임이 끝나지 않아 갇힌 모두가 차례로 죽는다', '게이트가 영구히 열려 현실 전체가 거대한 던전이 된다',
  '회귀의 기회를 잃고 같은 비극이 영원히 반복된다', '그를 믿고 따른 공략조 전원이 전멸한다',
  '시스템이 인류를 실험체로 삭제(롤백)해 버린다', '부활시키려던 동료가 영영 데이터째 소멸한다',
  '최상위 길드가 클리어 권한을 독점해 약자는 영원히 종속된다', '랭킹과 명예를 모두 잃고 다시 무시당하는 자로 추락한다',
  '폭주한 힘이 그가 지키려던 모든 것을 먼저 부순다', '몬스터 웨이브가 마지막 안전도시까지 함락시킨다',
  '시스템의 빚이 한계를 넘어 그의 존재가 회수된다', '데스게임 운영자가 클리어 직전 규칙을 바꿔 전원을 죽인다',
  '시나리오에서 이탈한 대가로 세계가 강제 종료된다', '현실의 가족이 게임 실패의 연좌로 위험에 처한다',
  '진짜 클리어 보상 대신 더 잔혹한 다음 차수가 시작된다', '그의 특별함이 삭제되어 모든 성장이 0으로 초기화된다',
  '인류의 마지막 각성자 세대가 통째로 무너진다', '관리자와의 거래 실패로 종(種) 전체가 탈락 처리된다',
  '그를 끝까지 믿어준 단 한 사람마저 그를 두려워하게 된다', '지키려던 무대(서버/세계) 자체가 흔적도 없이 삭제된다',
  '봉인이 풀린 최종 보스가 안전도시를 향해 진군을 시작한다', '그가 모은 모든 공략 데이터가 적의 손에 통째로 넘어간다',
  '다시 일어선 공략조가 그의 선택 하나에 또 한 번 무너진다', '현실로 통하는 마지막 로그아웃 게이트가 영원히 닫힌다',
]

// 7) 도덕적 딜레마 — 도시에 §3·§5: 둘 다 가질 수 없는 가치 사이의 선택
const DILEMMA = [
  '모두를 클리어시키려면 한 사람을 데스게임의 제물로 바쳐야 한다', '회귀로 한 사람을 살리면 그 대가로 다른 이가 죽는다',
  '시스템을 이기려면 시스템이 시키는 가장 잔인한 짓을 해야 한다', '동료를 부활시키려면 산 자의 수명을 빼앗아야 한다',
  '랭킹 1위가 되려면 자신을 키워준 길드를 짓밟아야 한다', '진실을 밝히면 시스템이 지탱하던 가짜 평화가 무너진다',
  '최종 보스를 막을 유일한 힘은 스스로 보스가 되는 것뿐이다', '공략 정보를 공유하면 그의 유일한 우위가 사라진다',
  '약자를 구하면 강자 전원을 적으로 돌려 공략이 불가능해진다', '게이트를 닫으면 그 안에 남은 동료들도 함께 봉인된다',
  '미래를 바꾸려면 회귀 전 자신이 한 모든 선행을 되돌려야 한다', '특별함을 유지하려면 자신을 버그로 신고하려는 동료를 막아야 한다',
  '시스템의 거래를 받으면 인류가, 거절하면 자신과 가족이 죽는다', '대속으로 동료를 살릴 때마다 그만큼 자기 인간성을 내준다',
  '폭주를 멈추려면 가장 강한 자기 권능을 영영 봉인해야 한다', '시나리오를 따르면 무고한 자가, 거스르면 자신이 탈락한다',
  '진짜 보상을 차지하면 함께 온 동료를 빈손으로 돌려보내야 한다', '관리자를 속이면 다음 차수의 더 약한 자들이 그 빚을 갚는다',
  '평범한 일상으로 돌아가려면 지금 의지하는 자들을 전장에 버려야 한다', '한 명을 영구사망에서 구하면 자신의 세이브를 영영 잃는다',
  '권능을 정식 등록하려면 그 힘을 시스템에 영구히 종속시켜야 한다', '재기에 성공하려면 한때 자신을 배신한 자와 다시 손잡아야 한다',
  '누명을 벗으려면 진짜 부정행위자였던 은인의 죄를 폭로해야 한다', '약점을 꿰뚫는 필중기를 쓰려면 그 적의 마지막 사정을 들어야 한다',
]

// 8) 비틀기(반전 씨앗) — 도시에 §3: '시스템의 의도·배후'를 향한 클리셰 전복
const TWIST = [
  '시스템은 게임이 아니라 인류를 시험·선별하는 외계 존재의 장치였다', '관리자(도깨비)가 처음부터 그의 성장을 설계한 흑막이었다',
  '회귀의 미래 지식은 누군가 그의 머리에 심어둔 거짓이었다', '원작 소설의 진짜 결말은 그가 아는 것과 정반대였다',
  '데스게임의 운영자가 사실 그를 살리려던 미래의 자신이었다', '최종 보스와 주인공이 같은 데이터의 두 인격이었다',
  '그가 토벌하던 몬스터들이 시스템 붕괴를 함께 막던 수호자였다', '특별한 권능은 시스템의 버그가 아니라 일부러 흘린 미끼였다',
  '구하려던 세계가 이미 누군가의 꿈/시뮬레이션 속이었다', '죽은 줄 알았던 동료가 시스템 관리자로 살아 돌아왔다',
  '시스템을 만든 것은 미래의 인류 자신, 멸망을 막으려는 마지막 수였다', '랭킹 1위는 인간이 아니라 인류를 관찰하는 AI의 아바타였다',
  '회귀의 진짜 목적은 비극을 막는 게 아니라 무한히 반복시키는 것이었다', '그를 추방한 길드가 그를 미끼로 더 큰 위협을 가두고 있었다',
  '시스템 메시지의 화자가 곧 그의 잃어버린 또 다른 자아였다', '클리어 보상은 자유가 아니라 다음 게임의 운영 권한이었다',
  '무시당하던 짐꾼이야말로 서버 전체를 홀로 떠받치던 핵심 코드였다', '게임을 끝내는 순간 현실 쪽이 데이터로 소멸하게 설계돼 있었다',
  '죽음의 페널티는 벌이 아니라 진짜 세계로 가는 유일한 출구였다', '시스템은 이미 클리어됐고, 지금은 우승자가 즐기는 재방송이었다',
  '그가 끝내 등록하려던 권능은 시스템을 정지시키는 자폭 코드였다', '재기를 도운 새 공략조 전원이 시스템이 붙인 감시자였다',
  '그를 노리던 현상금의 발주자는 미래에서 그를 지키려는 자신이었다', '필중 일격의 진짜 효과는 적이 아니라 시스템 핵을 겨누는 것이었다',
]

// 9) 무대(하위유형) — 도시에 §3·§4: 던전·레이드·랭킹전·튜토리얼 한 덩어리
const STAGE = [
  '전멸 위기의 레이드 보스방 앞', '죽음의 카운트가 흐르는 데스게임 최상층', '브레이크 직전의 현실 도시 게이트',
  '히든 클래스 전직 퀘스트의 시험장', '랭킹 1위를 가리는 길드 공개 레이드', '회귀 전 비극이 벌어졌던 그 운명의 층',
  '관리자와 거래가 오가는 시스템 콘솔 공간', '강화·인챈트의 운을 거는 대장간(확률 도박)', '튜토리얼을 갓 벗어난 초보 마을의 함정',
  '안전지대가 사라진 절대 사망 구간', '봉인된 0층, 최종 보스가 잠든 심층', '몬스터 웨이브가 밀려드는 마지막 안전도시',
  '클리어 보상이 걸린 히든 던전의 보물방', '공략조가 분열하는 던전 한복판', '원작 시나리오상 파멸이 예정된 분기점',
  '게이트 너머, 시간이 다르게 흐르는 이세계 필드', '랭커들의 PVP가 벌어지는 결투장', '시스템이 강제로 소집한 생존 시나리오 무대',
  '현금화 거래가 오가는 게임 속 경매장', '죽은 자의 데이터가 떠도는 로그아웃 불가 서버',
  '권능을 정식 등록하는 시스템 심사장', '현상금 사냥꾼들이 그를 노리고 매복한 좁은 회랑',
  '전멸했던 공략조가 재집결하는 길드 거점', '랭킹전 부정행위가 적발되는 운영진 감사실',
]

interface Slot { key: string; label: string; icon: string; pool: string[] }
const BASE_SLOTS: Slot[] = [
  { key: 'subject', label: '주인공(원형)', icon: '🧑‍💻', pool: SUBJECT_ALL },
  { key: 'power', label: '시스템 권능(특별함)', icon: '🌟', pool: POWER },
  { key: 'desire', label: '욕망(목표)', icon: '🎯', pool: DESIRE },
  { key: 'obstacle', label: '장애물', icon: '🧱', pool: OBSTACLE },
  { key: 'cost', label: '시스템의 대가/페널티', icon: '🩸', pool: COST },
  { key: 'stakes', label: '위기에 걸린 것', icon: '💥', pool: STAKES },
  { key: 'dilemma', label: '도덕적 딜레마', icon: '⚖️', pool: DILEMMA },
  { key: 'twist', label: '비틀기(시스템의 배후)', icon: '🔮', pool: TWIST },
  { key: 'stage', label: '무대(던전/레이드)', icon: '🗺️', pool: STAGE },
]

// 분기 선택에 따라 주체 풀에 분기색 보조 풀을 합친 슬롯 세트를 만든다.
function slotsFor(branchKey: string): Slot[] {
  const extra = SUBJECT_EXTRA[branchKey] || []
  return BASE_SLOTS.map((s) => (s.key === 'subject' ? { ...s, pool: [...s.pool, ...extra] } : s))
}

// 조합수 = 분기 수 × 각 슬롯 풀 크기의 곱(분기색 보조 풀은 변동 → 최소 보장값으로 표기)
function comboCount(branchKey: string): number {
  return slotsFor(branchKey).reduce((acc, s) => acc * s.pool.length, BRANCHES.length)
}

const LS_KEY = 'sry:tool:litrpg-conflictforge'
const ri = (n: number) => Math.floor(Math.random() * n)
const pick = (a: string[], avoid?: string) => {
  if (a.length <= 1) return a[0]
  let v = a[ri(a.length)]
  if (avoid !== undefined && v === avoid) v = a[ri(a.length)]
  return v
}

type Result = Record<string, string>

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 한글 조사 자동 선택 — 마지막 글자의 받침 유무를 보고 둘 중 하나를 고른다.
// '으로/로'는 ㄹ 받침일 때 '로'를 쓰는 예외를 반영한다. 괄호 이중표기('을(를)') 없이 단일 출력.
function hasBatchim(word: string): boolean | null {
  const m = (word || '').match(/[가-힣]\s*$/)
  if (!m) return null // 한글로 끝나지 않으면 판단 불가
  const code = m[0].trim().charCodeAt(0) - 0xac00
  return code % 28 !== 0
}
function josa(word: string, withB: string, noB: string): string {
  const b = hasBatchim(word)
  // 한글이 아니면(숫자·영문 등) 받침 있는 형태를 기본으로 보수적 선택
  if (b === null) return word + withB
  return word + (b ? withB : noB)
}
const eun = (w: string) => josa(w, '은', '는')   // 은/는
const eul = (w: string) => josa(w, '을', '를')   // 을/를
const iga = (w: string) => josa(w, '이', '가')   // 이/가

// 한 줄 갈등 문장 조립 — 슬롯들을 LitRPG다운 갈등 구문으로.
function summarize(branchKey: string, r: Result): string {
  const b = branchDef(branchKey)
  const subj = r.subject || '주인공'
  const power = (r.power || '').replace(/[.。]$/, '')
  const desire = (r.desire || '무언가').replace(/[.。]$/, '')
  const ob = (r.obstacle || '장애물').replace(/[.。]$/, '')
  const cost = (r.cost || '').replace(/[.。]$/, '')
  const stakes = (r.stakes || '').replace(/[.。]$/, '')
  const dilemma = (r.dilemma || '').replace(/[.。]$/, '')
  const stage = r.stage || ''
  let s = `[${b.tag}] ${stage ? stage + '에서, ' : ''}${eun(subj)} ${eul(desire)} 노리지만, ${iga(ob)} 앞을 가로막는다.`
  if (power) s += ` 그가 쥔 패는 ${power}.`
  if (cost) {
    // cost 문구에 이미 '대가'가 들어 있으면 래퍼('…는 대가가 따른다')를 생략해 '대가…대가' 중복을 막는다.
    s += /대가/.test(cost) ? ` 다만 그 힘에는 가혹한 조건이 붙는다. ${cost}.` : ` 다만 그 힘에는 ${cost}는 대가가 따른다.`
  }
  if (dilemma) s += ` 결국 그는 선택을 강요받는다 — ${dilemma}.`
  if (stakes) s += ` 실패하면 ${stakes}.`
  return s
}

// 저장된 즐겨찾기(고정 조합) 항목
interface Saved { id: string; branch: string; result: Result; createdAt: number }

function loadSaved(): Saved[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.saved) ? p.saved : Array.isArray(p) ? p : []
    return arr
      .filter((x: any) => x && typeof x === 'object' && x.result && typeof x.result === 'object')
      .map((x: any) => ({
        id: String(x.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7))),
        branch: BRANCHES.some((b) => b.key === x.branch) ? x.branch : 'apoc',
        result: x.result as Result,
        createdAt: Number(x.createdAt) || Date.now(),
      }))
  } catch { return [] }
}
function loadBranch(): string {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) { const p = JSON.parse(raw); if (BRANCHES.some((b) => b.key === p?.branch)) return p.branch }
  } catch { /* ignore */ }
  return 'apoc'
}

export default function LitrpgConflictForge({ payload }: { payload?: Record<string, unknown> }) {
  const genreLabel = typeof payload?.genre === 'string' ? (payload.genre as string) : '게임판타지·LitRPG'

  const [branch, setBranch] = useState<string>(() => loadBranch())
  const [result, setResult] = useState<Result>(() => {
    const slots = slotsFor(loadBranch())
    const r: Result = {}
    slots.forEach((s) => { r[s.key] = pick(s.pool) })
    return r
  })
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)
  const [toast, setToast] = useState('')
  const [saved, setSaved] = useState<Saved[]>(() => loadSaved())
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 분기·저장 목록 영속화 — 차단/용량초과 graceful
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ branch, saved })) }
    catch { if (mounted.current) setToast('이 브라우저에서 저장이 막혀 있어요.') }
  }, [branch, saved])

  // 토스트 자동 소거 + 언마운트 정리
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1900)
    return () => window.clearTimeout(t)
  }, [toast])

  // 굴림 애니메이션 자동 해제 + 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 360)
    return () => window.clearTimeout(t)
  }, [rolling])

  const slots = slotsFor(branch)
  const COMBOS = comboCount(branch)

  const rollAll = useCallback(() => {
    setRolling(true)
    setResult((prev) => {
      const next: Result = { ...prev }
      slotsFor(branch).forEach((s) => { if (!locked[s.key]) next[s.key] = pick(s.pool, prev[s.key]) })
      return next
    })
  }, [locked, branch])

  const rollOne = (key: string) => {
    const slot = slotsFor(branch).find((s) => s.key === key)
    if (!slot) return
    setResult((prev) => ({ ...prev, [key]: pick(slot.pool, prev[key]) }))
  }
  const toggleLock = (key: string) => setLocked((l) => ({ ...l, [key]: !l[key] }))

  // 분기 변경 — 잠기지 않은 주체는 새 분기색 풀에서 다시 뽑아 일관성 유지
  const changeBranch = (k: string) => {
    setBranch(k)
    if (!locked.subject) {
      const sub = slotsFor(k).find((s) => s.key === 'subject')!
      setResult((prev) => ({ ...prev, subject: pick(sub.pool, prev.subject) }))
    }
  }

  const bDef = branchDef(branch)
  const summary = summarize(branch, result)

  const plainText = () => {
    const lines = slots.map((s) => `${s.icon} ${s.label}: ${result[s.key]}`).join('\n')
    return `[LitRPG 갈등 · ${bDef.label}]\n${lines}\n\n✍️ ${summary}`
  }

  const copy = () => {
    const text = plainText()
    const done = () => { if (mounted.current) setToast('복사했습니다') }
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
    } catch { if (mounted.current) setToast('복사 실패') }
  }

  // 즐겨찾기 저장(현재 조합 고정)
  const star = () => {
    setSaved((prev) => [{ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), branch, result: { ...result }, createdAt: Date.now() }, ...prev].slice(0, 40))
    setToast('즐겨찾기에 저장했습니다')
  }
  const loadSavedItem = (s: Saved) => { setBranch(s.branch); setResult({ ...s.result }); setLocked({}); setToast('불러왔습니다') }
  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))

  // 연계: 갈등 글감을 라이브러리 스니펫으로
  const toSnippet = () => {
    addToLibrary('snippets', { text: summary, source: 'LitRPG 갈등 단조기', tags: ['게임판타지', 'LitRPG', '갈등', bDef.label, result.subject || ''].filter(Boolean) })
    setToast('글감 라이브러리(스니펫)에 저장했습니다')
  }

  // 연계: 프로젝트 자료 〈갈등〉 폴더에 문서로
  const toProject = () => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다'); return }
    const rows = slots.map((s) => `<p><b>${escHtml(s.icon)} ${escHtml(s.label)}</b><br>${escHtml(result[s.key])}</p>`).join('')
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.7;"><b>✍️ ${escHtml(summary)}</b></p>`,
      `<p style="color:#888;">분기: ${escHtml(bDef.icon + ' ' + bDef.label)} — ${escHtml(bDef.hint)}</p>`,
      `<hr/>`,
      rows,
    ].join('')
    const title = `LitRPG 갈등 — ${(result.subject || '주인공').slice(0, 18)}`
    const id = addToProject({
      kind: 'text', root: 'research', folder: '갈등',
      title, bodyHtml, synopsis: summary,
      meta: { 장르: genreLabel, 분기: bDef.label, 무대: result.stage || '—', 딜레마: (result.dilemma || '—').slice(0, 40) },
    })
    setToast(id ? '프로젝트 자료 〈갈등〉 폴더에 추가했습니다 (바인더·DB 확인)' : '프로젝트에 추가하지 못했습니다')
  }

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 8, padding: 12, boxSizing: 'border-box', color: 'var(--text)', background: 'var(--paper)', overflow: 'auto' }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
  const slotRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="⚔️"/></span>
        <strong style={{ fontSize: 14 }}>LitRPG 갈등 단조기</strong>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }} title="분기 × 모든 슬롯 풀 조합의 경우의 수(최소 보장)">
          약 {COMBOS.toLocaleString()} 조합
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
        먼저 <b>장르 분기</b>를 고르면 톤·관습이 정해집니다. 그다음 상태창·시스템·페널티 슬롯을 굴려 갈등을 단조하세요. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 단조합니다.
      </div>

      {/* 0) 분기 선택 */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 9px' }}>
        <div style={{ fontSize: 10.5, color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>① 장르 분기 (톤·관습 결정)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {BRANCHES.map((b) => {
            const on = b.key === branch
            return (
              <button
                key={b.key}
                className="minibtn"
                onClick={() => changeBranch(b.key)}
                aria-pressed={on}
                title={b.hint}
                style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', background: on ? 'var(--chrome-2)' : undefined, color: on ? 'var(--text)' : 'var(--muted)', opacity: on ? 1 : 0.75 }}
              ><Emoji e={b.icon}/> {b.label}</button>
            )
          })}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}><Emoji e={bDef.icon}/> <b>{bDef.label}</b> — {bDef.hint}</div>
      </div>

      {/* 슬롯 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {slots.map((s) => {
          const isLocked = !!locked[s.key]
          return (
            <div key={s.key} style={slotRow}>
              <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-10deg) scale(1.15)' : 'none' }}><Emoji e={s.icon}/></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{s.label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
                  {rolling && !isLocked ? '…' : result[s.key]}
                </div>
              </div>
              <button className="minibtn" title={isLocked ? '고정 해제' : '이 슬롯 고정'} onClick={() => toggleLock(s.key)} style={{ flexShrink: 0, padding: '2px 6px', borderColor: isLocked ? 'var(--accent)' : 'var(--border)', color: isLocked ? 'var(--accent)' : 'var(--muted)' }}>{isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
              <button className="minibtn" title="이 슬롯만 다시" onClick={() => rollOne(s.key)} disabled={isLocked} style={{ flexShrink: 0, padding: '2px 6px' }}><Emoji e="🎲"/></button>
            </div>
          )
        })}
      </div>

      {/* 조합 한 줄 요약 */}
      <div style={{ background: 'var(--chrome-2)', border: '1px solid var(--accent)', borderRadius: 10, padding: '11px 13px' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}><Emoji e="📝"/> 갈등 한 줄 요약</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.65 }}>{summary}</div>
      </div>

      {/* 조작 버튼 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, minWidth: 130 }} onClick={rollAll}><Emoji e="⚒️"/> 갈등 단조하기</button>
        <button className="minibtn" onClick={copy}><Emoji e="📋"/> 복사</button>
        <button className="minibtn" onClick={star} title="현재 조합을 즐겨찾기에 저장"><Emoji e="⭐"/> 저장</button>
      </div>

      {/* 연계 */}
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '이 갈등을 프로젝트 자료 〈갈등〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={toSnippet}><Emoji e="📥"/> 글감 라이브러리</button>
        <button className="linkbtn" onClick={() => openToolLinked('conflict-builder', { character: result.subject, desire: result.desire, obstacle: result.obstacle, stakes: result.stakes })} title="갈등 설계기로 보내 더 다듬기"><Emoji e="⚔️"/> 갈등 설계기</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck')} title="반전 카드 더 보기"><Emoji e="🔮"/> 반전 카드</button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--ok)', textAlign: 'center' }}>{toast}</div>}

      {/* 즐겨찾기 목록 */}
      {saved.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5, fontWeight: 600 }}><Emoji e="⭐"/> 저장된 갈등 {saved.length}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {saved.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 9px' }}>
                <span style={{ flexShrink: 0, fontSize: 13 }} title={branchDef(s.branch).label}><Emoji e={branchDef(s.branch).icon}/></span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={summarize(s.branch, s.result)}>{summarize(s.branch, s.result)}</span>
                <button className="minibtn" style={{ flexShrink: 0, padding: '2px 6px', fontSize: 11 }} onClick={() => loadSavedItem(s)} title="불러오기">↻</button>
                <button className="minibtn" style={{ flexShrink: 0, padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={() => removeSaved(s.id)} title="삭제"><Emoji e="🗑️"/></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
