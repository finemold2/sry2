// LitRPG 시그니처 생성기(대형 조합) — 게임판타지·LitRPG의 심장인 '시스템 한 벌'을 통째로 빚어내는 대형 생성기.
//   14개 슬롯(직업·클래스 × 핵심 스킬·시너지 × 스탯 빌드 정체성 × 던전·필드 무대 × 네임드 몬스터·보스 × 시스템창 알림 × 보상·드랍 아이템 × 칭호·업적 × 퀘스트(메인/히든) × 성장 한계·페널티 × 시스템 배후 떡밥 × 시그니처 한 줄)
//   × 분기 기조 5종(VR 다이브/데스게임/이세계 전이/현실 침공/회귀·원작지식) → 잠금(🔒)/부분 재생성(🎲) + 총 조합수 표시(1조 이상).
//   게임판타지·LitRPG 도시에(상태창·스킬 트리·등급 체계·칭호·히든 클래스·성장 게이팅·수치 인플레·시스템 배후)에 근거.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(잠금/마지막 결과)만 사용. 언마운트 정리.
// 연계(linkbus): 빚어낸 시스템을 프로젝트 자료 〈시스템 설정〉 폴더에 메모로 추가 · 스니펫 라이브러리 저장 · 관련 도구 열기.
import { useState, useEffect, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'litrpg-signature', name: '시스템·퀘스트 시그니처 생성기', icon: '🎮', group: '생성기', genre: '게임판타지·LitRPG', intro: '직업·스킬·스탯빌드·던전·보스·시스템창·보상·칭호·퀘스트·성장한계까지 LitRPG 시스템 한 벌을 통째로 빚어냅니다', w: 600, h: 720 }

const LS = 'sry:tool:litrpg-signature'

// ---------- 슬롯 풀(로컬·게임판타지/LitRPG 특화) ----------
// 각 슬롯은 충분히 다양하게(도시에 3항 '서사 장치' / 2항 '독자 기대' / 4항 '페이싱' 근거).
// 조합수 = 모든 슬롯 풀 길이의 곱 × 기조 수 → 1조(10^12) 이상 보장.
interface Slot { key: string; label: string; icon: string; hint: string; pool: string[] }

const SLOTS: Slot[] = [
  {
    key: 'job', label: '직업·클래스', icon: '🛡️', hint: '히든/유니크 클래스가 주인공 특별화의 단골(도시에 3항)',
    pool: [
      '히든 클래스 〈그림자 군주(Shadow Monarch)〉 — 죽인 적을 그림자 병사로 부리는 단독 보유 직업',
      '유니크 클래스 〈각성하지 못한 자(Unawakened)〉 — 스탯창이 비어 있어 무엇이든 될 수 있는 빈 그릇',
      '전직 불가 판정 〈무직(無職)〉 — 시스템이 직업을 거부했으나 그래서 모든 스킬을 배울 수 있는 역설',
      '히든 직업 〈시스템 해커(System Breaker)〉 — 상태창을 직접 편집·버그를 이용하는 메타 클래스',
      '유니크 클래스 〈기록자(Chronicler)〉 — 본 것을 \'스킬북\'으로 복제·기록하는 카피 직업',
      '히든 직업 〈사망 회귀자(Returner)〉 — 죽으면 특정 세이브 포인트로 되돌아가는 1인 전용 클래스',
      '전설 등급 직업 〈용기사(Dragon Knight)〉 — 드래곤과 계약해 탈것·브레스를 공유하는 정통 전투직',
      '히든 클래스 〈소환술사·군단장(Legion Summoner)〉 — 동시 소환 수 제한이 없는 물량형 직업',
      '유니크 클래스 〈빈민가의 도적(Slum Rat)〉 — 도주·은신·뒤통수 특화, 정면이 약한 대신 변수의 왕',
      '히든 직업 〈성흔의 사도(Stigma Apostle)〉 — 신의 권능을 빌리되 매번 신앙심을 소모하는 양날의 성직',
      '버그성 클래스 〈레벨 1 고정(Lv.1 Lock)〉 — 레벨이 오르지 않는 대신 스킬 숙련만으로 강해지는 변종',
      '유니크 클래스 〈빚쟁이 연금술사(Debt Alchemist)〉 — 강해질수록 시스템에 \'대가\'가 빚으로 누적되는 직업',
      '히든 직업 〈관전자(Spectator)〉 — 전투에 끼지 못하는 대신 모든 정보를 열람하는 정보전 특화',
      '전직 퀘스트 실패자 〈낙오자(Dropout)〉 — 정규 루트를 놓쳐 비주류 스킬만으로 올라가는 언더독',
      '유니크 클래스 〈복제의 광대(Mimic Jester)〉 — 적의 클래스를 한 번 베끼는 광역 카피·교란형',
      '히든 클래스 〈탑의 관리자(Tower Admin)〉 — 던전 일부를 \'편집\'할 수 있는 GM급 권한 직업',
    ],
  },
  {
    key: 'skill', label: '핵심 스킬·시너지', icon: '🌀', hint: '연계기·진화·각성이 빌드의 묘미(도시에 2항)',
    pool: [
      '〈시간 정지(Stopwatch)〉 — 3초간 세계를 멈추되, 쓸수록 본인 수명이 깎이는 패시브 페널티',
      '〈약점 간파(Appraisal)〉 — 적의 스탯·약점·다음 패턴을 텍스트로 표시(고급 정보전 스킬)',
      '〈복제·일회용(One-Time Mimic)〉 — 방금 본 스킬을 단 한 번 그대로 재현',
      '〈그림자 교환(Shadow Swap)〉 — 그림자가 닿는 두 지점을 순간 교체하는 회피·기습 콤보',
      '〈광폭화(Berserk)〉 — HP가 깎일수록 공격력이 비례 상승, 이성을 잃는 디버프 동반',
      '〈무한 인벤토리(Bottomless Bag)〉 — 무게·슬롯 제한 없는 수납, 전투 중 무엇이든 즉시 꺼냄',
      '〈치유 역전(Reverse Heal)〉 — 회복기를 적에게 거꾸로 꽂아 \'과회복 폭주\'로 터뜨리는 변칙',
      '〈연계 콤보(Chain Combo)〉 — 스킬을 끊기지 않게 잇는 만큼 마지막 일격의 배율이 폭등',
      '〈디버프 흡수(Affliction Eater)〉 — 자신에게 걸린 상태이상을 양분으로 바꾸는 역설 패시브',
      '〈소환 동기화(Sync Summon)〉 — 소환수와 감각·고통·스탯을 공유, 다수를 한 몸처럼 운용',
      '〈확률 조작(Loaded Dice)〉 — 드랍률·강화 성공률·치명타에 보정을 거는 도박형 능력',
      '〈게이트 생성(Open Gate)〉 — 던전 입구를 임의로 뚫는, 공략 순서를 깨버리는 반칙 스킬',
      '〈경험치 강탈(EXP Steal)〉 — 처치 시 적이 쌓은 경험치를 통째로 빼앗는 성장 가속기',
      '〈무효화 결계(Null Field)〉 — 범위 내 모든 스킬·버프를 꺼버리는, 먼치킨 봉인용 카운터',
      '〈재생 폭주(Overgrowth)〉 — 팔다리가 잘려도 재생, 단 재생한 부위가 인간성을 잃어감',
      '〈딜레이 폭격(Delayed Burst)〉 — 입힌 데미지를 적립했다 한 번에 터뜨리는 누적·역전 스킬',
      '〈언어 해독(Tongue of Babel)〉 — 모든 종족·시스템 메시지·숨겨진 룬을 읽어내는 해석 능력',
      '〈죽음 카운트(Death Count)〉 — 죽을 때마다 영구 스탯이 1씩 오르는, 죽음을 자원으로 쓰는 빌드',
    ],
  },
  {
    key: 'build', label: '스탯 빌드 정체성', icon: '📊', hint: '어디에 투자하느냐가 곧 캐릭터성(도시에 3항)',
    pool: [
      '극단 〈민첩 몰빵〉 — 한 대도 못 맞으면 죽지 않는다, 회피·속도로 압도하는 유리대포',
      '〈근력·체력 탱커〉 — 깡스탯으로 모든 걸 받아내는 단순무식, 라이트한 전략과 묵직한 한 방',
      '〈지능·마력 글래스캐넌〉 — MP 관리만 되면 한 방에 보스를 지우는 화력 특화, 근접에 취약',
      '〈올스탯 균형형〉 — 약점이 없는 대신 한계도 명확, 빌드보다 운영으로 이기는 정석',
      '〈행운(Luck) 외길〉 — 드랍·크리·이벤트 확률을 극대화, 전투력은 운에 베팅하는 도박 빌드',
      '〈무(無)스탯·숙련도형〉 — 수치 대신 \'스킬 숙련\'만으로 강해지는 비정규 성장',
      '〈정신력·의지 특화〉 — 심마·공포·정신계 공격에 면역, 멘탈 게임에서 무너지지 않는 빌드',
      '〈서포터·버퍼〉 — 혼자선 약하나 파티 전체를 두 배로 만드는, 레이드의 숨은 코어',
      '〈디버프·암살 특화〉 — 독·출혈·치명을 쌓아 강적을 천천히 갉는 누적형 살수',
      '〈소환·물량 지휘〉 — 본체는 약체, 부하의 수와 진형으로 전장을 점령하는 지휘관',
      '〈생산·제작 특화(생활형)〉 — 전투보다 강화·연금·요리로 부를 쌓아 권력으로 환산하는 달빛조각사형',
      '〈반사·카운터 특화〉 — 받은 만큼 되돌려주는, 강한 적일수록 위험한 거울형 빌드',
    ],
  },
  {
    key: 'stage', label: '던전·필드 무대', icon: '🏰', hint: '난이도 구획(파워 게이팅)의 한 칸(도시에 4항)',
    pool: [
      '〈초보자의 무덤〉 1층 던전 — 튜토리얼을 가장한, 첫 사망자가 쏟아지는 거짓 안전지대',
      '〈끝없는 계단탑〉 — 한 층마다 규칙이 바뀌는 무한 등반, 위로 갈수록 보상과 사망률이 함께 폭등',
      '〈붕괴하는 지하 미궁〉 — 시간제한 던전, 무너지기 전에 보스를 잡거나 출구를 찾아야 하는 압박',
      '〈역병의 늪지 필드〉 — 지속 디버프(중독·시야제한) 지역, 빌드보다 \'버티는 법\'이 시험되는 무대',
      '〈붉은 게이트(브레이크 직전)〉 — 현실로 몬스터가 쏟아지기 직전의 균열, 시한폭탄 같은 레이드',
      '〈얼어붙은 왕의 빙궁〉 — 매 턴 스태미나가 깎이는 한랭 지역, 자원 관리가 곧 생존',
      '〈환영의 거울 회랑〉 — 자신의 복제와 싸우는 정신계 던전, 빌드를 그대로 카운터당함',
      '〈경매장이 열리는 안전구역〉 — 전투 없는 막간, 정보·아이템·동맹이 거래되는 사회 시뮬레이션 무대',
      '〈히든 피스(숨겨진 방)〉 — 특정 조건을 만족한 단 한 명만 들어가는, 유니크 보상의 비밀 구획',
      '〈공성·진영전 필드〉 — 길드 대 길드, 거점을 두고 수백 명이 부딪치는 대규모 PvP 전장',
      '〈심해의 침묵 던전〉 — 소리·시야가 봉인된 공포 구획, 정보 스킬이 무력화되는 역공략 지대',
      '〈리스폰 없는 지옥 난이도〉 — 죽으면 캐릭터가 영구 삭제되는, 데스게임형 최종 시험장',
      '〈고대 유적의 보물 금고〉 — 함정과 수수께끼로 가득한 탐색 던전, 전투보다 머리싸움',
      '〈무한 웨이브 투기장〉 — 끝없이 밀려오는 적을 몇 라운드 버티느냐로 순위가 갈리는 랭킹 무대',
    ],
  },
  {
    key: 'boss', label: '네임드 몬스터·보스', icon: '🐉', hint: '패턴 파악→전멸 위기→역전 변수(도시에 5항)',
    pool: [
      '네임드 〈불멸의 리치 왕〉 — 죽여도 정해진 횟수만큼 부활, 진짜 본체(심장)를 찾아야 끝나는 보스',
      '필드 보스 〈천 개의 눈 거신〉 — 사각이 없어 은신이 통하지 않는, 정면 돌파를 강요하는 위압',
      '히든 보스 〈거울의 군주〉 — 공격받은 패턴을 그대로 베껴 쓰는, 강할수록 위험한 거울형',
      '레이드 보스 〈역병의 어미〉 — 시간이 갈수록 졸개를 무한 증식, 장기전을 강제하는 광역 위협',
      '네임드 〈배신한 전(前) 1위 랭커〉 — 인간형 보스, 플레이어의 빌드·심리를 읽고 카운터하는 지능형',
      '히든 보스 〈시스템이 봉인한 버그 개체〉 — 규칙 밖에서 움직여 정공법이 통하지 않는 이레귤러',
      '필드 보스 〈탐식의 슬라임 군집〉 — 물리·마법을 흡수해 강해지는, 약점 속성을 찾아야 하는 퍼즐형',
      '레이드 보스 〈여덟 머리 폭풍룡〉 — 머리마다 다른 속성·페이즈를 가진, 파티 분담이 필수인 단계형',
      '네임드 〈울지 않는 사형집행인〉 — 한 방에 즉사시키는 처형기를 가진, 회피 외엔 답이 없는 보스',
      '히든 보스 〈주인공을 아는 자〉 — 회귀·원작 지식까지 꿰뚫고 \'미래를 바꾼 변수\'를 노리는 메타 적',
      '레이드 보스 〈심연에서 기어오른 옛 존재〉 — 본 것만으로 정신 디버프가 걸리는 코즈믹 호러형',
      '필드 보스 〈자가 학습하는 골렘〉 — 같은 수가 두 번 안 통하는, 매 시도 새 전술을 요구하는 적응형',
      '네임드 〈눈물의 인질 보스〉 — 인질을 방패 삼아, 힘이 아니라 선택을 시험하는 도덕적 딜레마형',
      '최종 보스 〈시스템의 화신〉 — 규칙 그 자체가 적이 된, 세계관의 비밀과 직결된 마지막 벽',
    ],
  },
  {
    key: 'window', label: '시스템창 알림', icon: '💬', hint: '서술을 멈추고 띄우는 \'팝업\' 연출(도시에 3항)',
    pool: [
      '[알림] 조건을 충족했습니다. 히든 클래스로의 전직이 \'당신에게만\' 허락됩니다. (수락 / 거절)',
      '[경고] 회복 불가능한 페널티가 적용됩니다. 그래도 진행하시겠습니까? (Y/N) … 남은 시간 00:03',
      '[업적] \'최초 클리어(First Clear)\' — 이 위업은 전 세계에 단 한 번만 기록됩니다.',
      '[시스템] 당신은 규칙을 위반했습니다. …흥미롭군요. 관리자가 당신을 지켜보기 시작합니다.',
      '[전투 로그] 치명타! 218,540의 피해! …대상의 \'불사\' 특성이 발동합니다. 사망이 무효화되었습니다.',
      '[퀘스트 갱신] 숨겨진 분기 조건이 충족되어, 메인 시나리오의 경로가 변경되었습니다.',
      '[알림] 당신의 행동이 시나리오를 벗어났습니다. 예측 불가 변수로 \'추가 보상\'이 책정됩니다.',
      '[등급 판정] 측정 불가(Unmeasurable). …시스템이 당신의 잠재력을 평가하지 못합니다.',
      '[경고] 스탯 인플레이션 임계점 도달. 세계의 \'난이도 보정\'이 당신을 표적으로 재조정됩니다.',
      '[알림] 죽음을 \'대가\'로 지불하시겠습니까? 지불 시, 단 한 번 결과를 되돌립니다.',
      '[시스템] 당신만이 이 메시지를 볼 수 있습니다. 다른 플레이어에게 발설하면 페널티가 부과됩니다.',
      '[칭호 획득] 조건을 알 수 없는 칭호를 얻었습니다. …이 칭호의 효과는 \'아직\' 공개되지 않습니다.',
      '[알림] 당신은 이 던전의 \'관리자 권한\' 일부를 획득했습니다. 규칙을 편집할 수 있습니다.',
      '[속보] 전 서버 공지 — 누군가 \'불가능\'으로 분류된 퀘스트를 클리어했습니다.',
    ],
  },
  {
    key: 'reward', label: '보상·드랍 아이템', icon: '💎', hint: '루팅의 쾌감·세트/옵션 도박성(도시에 2·3항)',
    pool: [
      '〈데미지를 흡수해 적립하는 검(Greedy Blade)〉 — 받은 피해를 칼날에 모았다 한 번에 토해내는 유니크',
      '〈죽은 자의 회중시계〉 — 하루 한 번, 직전 3초로 시간을 되감는 신화 등급 아티팩트',
      '〈이름이 빈칸인 반지〉 — 착용자가 이름을 붙이는 순간 능력이 결정되는, 랜덤 옵션 도박템',
      '〈쪼개진 세트의 한 조각(1/7)〉 — 일곱을 모으면 직업을 초월하는 전설 세트의 첫 단서',
      '〈상태이상 무효의 망토〉 — 모든 디버프를 막지만, 버프(회복 포함)도 함께 막는 양날의 방어구',
      '〈경험치 두 배 목걸이(저주 동봉)〉 — 성장은 두 배, 단 사망 시 잃는 것도 두 배인 하이리스크 장신구',
      '〈빈 스킬북〉 — 본 적 있는 스킬 하나를 영구 각인할 수 있는, 단 한 장의 백지 비급',
      '〈탐식의 인벤토리 가방〉 — 안에 넣은 아이템을 천천히 \'합성\'해 새 옵션을 만드는 변이 수납',
      '〈깨지면 한 번 부활하는 부적〉 — 즉사를 막는 소모품, 단 부활 후 모든 스탯이 절반으로',
      '〈관리자의 명령어 조각〉 — 시스템에 \'한 줄 명령\'을 입력할 수 있는, 세계관 핵심급 치트 아이템',
      '〈상대의 가장 강한 스킬을 봉인하는 족쇄〉 — 강적일수록 강력한, 핸디캡 전용 유니크',
      '〈성장하는 알(미확인)〉 — 정체불명의 탈것·소환수가 부화하는, 장기 떡밥형 펫 아이템',
      '〈한 번만 옳은 답을 알려주는 주사위〉 — 분기에서 \'최적해\'를 한 번 확정하는 회귀자형 보조구',
      '〈피로 값을 치르는 만능 열쇠〉 — 어떤 잠긴 문·금고·게이트도 여는, 단 HP를 대가로 먹는 도구',
    ],
  },
  {
    key: 'title', label: '칭호·업적', icon: '🏆', hint: '업적이 버프·해금 조건이 된다(도시에 3항)',
    pool: [
      '〈최초의 등반자(First Climber)〉 — 미답 구간을 처음 밟은 자에게만, 영구 명성 보정',
      '〈불가능을 증명한 자〉 — 클리어 불가 퀘스트를 깬 자, 시스템의 \'관심\'을 끄는 양날의 칭호',
      '〈혼자 서는 자(Solo)〉 — 파티 없이 던전을 깬 만큼 강해지는, 고독을 자원으로 바꾸는 칭호',
      '〈죽음을 비웃는 자〉 — 즉사를 회피할 때마다 누적되는, 클러치 상황 전용 버프',
      '〈규칙의 위반자(Outlaw)〉 — 시스템을 속인 횟수만큼 \'추적자\'가 강해지는 하이리스크 칭호',
      '〈천 명을 살린 자〉 — 적이 아닌 동료를 지킨 업적, 서포트·진영전에서 진가를 발휘',
      '〈약자의 왕(King of the Weak)〉 — 자신보다 레벨이 높은 적을 잡을수록 강해지는 언더독 보정',
      '〈정보의 지배자〉 — 미공개 정보를 가장 먼저 해금한 자, 거래·정보전 우위 칭호',
      '〈학살자(Slaughterer)〉 — 처치 수에 비례한 공격 보정, 단 NPC·동료가 그를 두려워하는 사회 페널티',
      '〈예언을 비튼 자〉 — 정해진 결말을 바꾼 자에게, 운명·확률에 개입하는 권능',
      '〈경매장의 큰손〉 — 누적 거래액 1위, 시세·정보·인맥이 곧 무기인 생활형 칭호',
      '〈마지막까지 남은 자(Last Survivor)〉 — 전멸 위기를 홀로 넘긴 자에게, 1회용 부활급 버프',
      '〈시스템이 두려워한 자〉 — 후반부 떡밥과 직결, 효과가 \'잠겨 있는\' 미스터리 칭호',
    ],
  },
  {
    key: 'quest', label: '퀘스트(메인/히든)', icon: '📜', hint: '히든·연계 퀘스트가 플롯 분기점(도시에 3항)',
    pool: [
      '[히든] \'시스템이 숨긴 0층\'을 찾아라 — 실패 시 기억 일부가 삭제되는, 진실 추적 퀘스트',
      '[메인] 무너지는 도시를 떠나 \'안전구역\'까지 — 동행 NPC를 몇이나 살리느냐로 보상이 갈림',
      '[연계] 죽은 동료의 마지막 부탁 — 완수하면 그의 유니크 스킬을 상속받는 감정선 퀘스트',
      '[히든] 보스를 \'죽이지 말고\' 굴복시켜라 — 무력이 아닌 협상·심리를 시험하는 분기 퀘스트',
      '[메인] 다음 게이트 자격을 얻어라 — 레벨·아이템·평판 게이트를 동시에 통과해야 하는 관문',
      '[히든] \'관리자\'와의 거래 — 받아들이면 강해지지만, 한 가지 자유를 영원히 저당 잡힘',
      '[연계] 라이벌 길드의 함정에서 배신자를 색출하라 — 누구를 의심하느냐로 결말이 바뀌는 정보전',
      '[히든] 회귀 전 \'그날\'을 막아라 — 정해진 비극의 분기점, 시간이 정확히 흐르는 카운트다운형',
      '[메인] 첫 레이드 보스를 토벌하라 — 파티 합과 빌드 시너지가 처음 시험되는 진입 관문',
      '[히든] \'금지된 직업서\'를 회수하라 — 손에 넣는 순간 강호(서버) 전체가 적이 되는 양날의 보상',
      '[연계] 폐허의 NPC 왕국을 재건하라 — 전투 대신 경제·외교로 세력을 키우는 장기 운영 퀘스트',
      '[히든] 시스템 메시지의 \'거짓말\'을 증명하라 — 신뢰할 수 없는 안내자를 의심하는 메타 퀘스트',
      '[메인] 랭킹전 결승에 올라라 — 전 서버가 지켜보는, 명성과 자존심이 걸린 PvP 토너먼트',
      '[히든] 사라진 \'최초의 플레이어\'를 추적하라 — 세계관의 기원과 닿는 최종 떡밥 퀘스트',
    ],
  },
  {
    key: 'limit', label: '성장 한계·페널티', icon: '⚖️', hint: '얻는 대신 치르는 값·인플레 관리(도시에 4·9항)',
    pool: [
      '강해질수록 \'대가\'가 빚으로 쌓여, 누적되면 시스템이 강제로 회수(파산=캐릭터 삭제)',
      '핵심 스킬을 쓸 때마다 수명이 눈에 띄게 깎인다 — 강함과 남은 시간의 트레이드오프',
      '레벨이 오르지 않는 대신 숙련도만으로 성장 — 한계는 늦지만 분명히 존재하는 천장',
      '죽음을 자원으로 쓰는 빌드 — 되돌릴 때마다 기억·감정 일부가 영구히 마모된다',
      '먼치킨이 될수록 세계의 \'난이도 보정\'이 그를 표적으로 재조정 — 강할수록 외로워지는 구조',
      '신·관리자의 권능을 빌리는 만큼 자유의지를 저당 잡힌다 — 언젠가 \'대가의 날\'이 온다',
      '광폭화·폭주 계열은 이성을 잃어, 적과 아군을 구분하지 못하는 위험을 안고 쓴다',
      '복제·카피는 \'한 번뿐\' — 잘못 쓰면 그 강력함을 영영 못 돌려받는 일회성 제약',
      '수치는 끝없이 커지지만, 일정 등급에서 \'단위 리셋(차원/세계 개편)\'으로 모든 게 상대화된다',
      '회귀·원작 지식은 만능이 아니다 — 한 번 미래를 바꾸면 그 이후의 정보가 통째로 무효가 된다',
      '소환·물량형은 본체가 약체 — 부하를 잃으면 순식간에 가장 약한 존재로 추락한다',
      '정보·간파 스킬은 \'무효화 결계\' 한 방에 무력화 — 머리싸움이 통하지 않는 적 앞의 공백',
      '강화·확률 조작에는 반동이 있어, 실패가 누적되면 장비 파괴·대형 디버프로 되돌아온다',
    ],
  },
  {
    key: 'backstory', label: '시스템 배후 떡밥', icon: '🛸', hint: '\'이 시스템은 왜 존재하나\'가 메인 떡밥(도시에 3항)',
    pool: [
      '이 시스템은 멸망을 앞둔 세계가 \'구원자\'를 찾으려 돌리는 마지막 선별 장치였다',
      '시스템 안내자(도깨비/관리자)는 인격을 가진 존재이며, 플레이어를 \'관람\'하는 상위 문명의 도구다',
      '이 세계는 누군가의 게임 서버이고, 죽으면 진짜 죽지만 \'운영자\'는 그것을 콘텐츠로 소비한다',
      '시스템은 신이 만든 게 아니라, 과거의 플레이어가 세계를 해킹해 남긴 \'유산 코드\'다',
      '레벨·스탯은 진짜가 아니라, 인류를 길들이려 외계 존재가 덧씌운 \'가짜 규칙\'이다',
      '시스템의 최종 목표는 한 명의 \'압도적 강자\'를 길러 더 큰 재앙의 제물로 바치는 것이다',
      '회귀·원작이 존재하는 이유는, 세계가 같은 결말을 거부하고 \'다른 분기\'를 찾고 있기 때문이다',
      '안내자는 사실 봉인된 적이며, 플레이어를 강하게 만들수록 자신의 봉인이 풀린다',
      '이 \'게임\'은 두 문명의 대리전 — 플레이어들은 각자 모르는 채 서로 다른 깃발의 말이다',
      '시스템은 인류 멸종 후를 위한 \'백업\' — 강해진 데이터만 다음 세계로 이식된다',
      '상태창 너머에는 \'관리자\'조차 통제 못 하는 버그가 깨어나고 있고, 주인공이 그 변수다',
      '최초의 플레이어는 클리어에 성공했고, 그 보상이 바로 \'다음 차례의 세계\'를 만드는 권한이었다',
    ],
  },
  {
    key: 'signame', label: '시그니처 한 줄', icon: '✨', hint: '이 시스템·주인공을 한 문장으로 각인',
    pool: [
      '“레벨업은 끝나지 않는다 — 끝나는 건 나를 막던 자들이다.”',
      '“남들이 보스를 잡을 때, 나는 보스를 부하로 삼는다.”',
      '“이 상태창은 거짓말을 한다. 그래서 나는 시스템을 의심한다.”',
      '“죽어도 돌아온다 — 그게 내가 가진 단 하나의 사기 스킬이다.”',
      '“너희는 공략을 찾지만, 나는 이미 결말을 읽었다.”',
      '“강해지는 데에는 값이 있다. 나는 기꺼이 그 빚을 진다.”',
      '“F급으로 시작했다고? 그건 너희가 나를 측정하지 못했을 뿐이다.”',
      '“던전은 무대고, 보스는 관객이며, 클리어는 나의 인사다.”',
      '“최초 클리어 보너스 — 이 세계에서 처음은 언제나 나였다.”',
      '“시스템이 만든 규칙 안에서, 나는 가장 정직하게 사기를 친다.”',
      '“스탯은 거들 뿐, 머리싸움에서 진 적은 한 번도 없다.”',
      '“이 게임을 끝내는 방법은 이기는 게 아니라, 만든 자를 찾는 것이다.”',
      '“레벨 1로도 충분하다 — 너희가 레벨을 믿는다면.”',
      '“회귀 전 그날, 나는 여기서 죽었다. 이번엔 다르다.”',
    ],
  },
]

// 조합을 한 번 더 갈래내는 '분기 기조'(같은 슬롯 조합도 기조에 따라 결이 달라진다 → 조합수에 포함). 도시에 0항 '핵심 분기 4종' + 한국형 회귀·원작지식 변주.
interface Tone { key: string; label: string; desc: string }
const TONES: Tone[] = [
  { key: 'vr', label: 'VR 다이브형', desc: '현실의 인간이 가상현실 게임에 접속 — 로그아웃·현실 생활·게임 성과의 현금화/지위 환산(달빛조각사·로열로드 계열).' },
  { key: 'death', label: '데스게임/갇힘형', desc: '게임에서 못 나오고, 죽으면 진짜 죽는다 — 안전지대가 없는 최상의 긴장(소드 아트 온라인 계열).' },
  { key: 'isekai', label: '이세계 전이+시스템형', desc: '다른 세계로 넘어갔는데 그곳에 게임 시스템이 깔려 있다 — 로그아웃 개념 없이 시스템이 곧 세계의 법칙.' },
  { key: 'apoc', label: '현실 침공(시스템 아포칼립스)형', desc: '어느 날 현실에 상태창·던전·게이트가 생긴다 — 헌터물과 강하게 겹치는, 각성·F급에서의 역전.' },
  { key: 'regress', label: '회귀·원작지식형', desc: '결과를 이미 아는 자가 공략 지식을 무기로 — 도발→압도→경악 리액션의 사이다 양산(전지적 독자 시점·회귀물 변주).' },
]

const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]
const fmt = (n: number) => {
  // 1조 이상은 한국어 '조/억' 단위로 가독성 있게 표기
  if (n >= 1e12) return (n / 1e12).toFixed(2).replace(/\.?0+$/, '') + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + '억'
  return n.toLocaleString('ko-KR')
}

// 총 조합수 = 모든 슬롯 풀 길이의 곱 × 기조 수. (곱만 계산해 부동소수 영향 최소화)
const COMBOS = SLOTS.reduce((acc, s) => acc * s.pool.length, 1) * TONES.length

// HTML 이스케이프(프로젝트 본문 안전화 — & < > 필수)
const escHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

type Picks = Record<string, string>

export default function LitrpgSignature({ payload }: { payload?: Record<string, unknown> }) {
  const [picks, setPicks] = useState<Picks>({})
  const [toneKey, setToneKey] = useState<string>(TONES[0].key)
  const [toneLocked, setToneLocked] = useState(false)
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [spinning, setSpinning] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | null>(null)

  // payload.genre / payload.tone 활용 — 다른 도구에서 컨텍스트를 넘겨받으면 분기 기조 기본값을 맞춰 준다.
  useEffect(() => {
    const g = String(payload?.genre ?? '') + ' ' + String(payload?.tone ?? '') + ' ' + String(payload?.mode ?? '')
    if (/회귀|환생|원작|전독시|전지적|루프|먼치킨/.test(g)) setToneKey('regress')
    else if (/현실|침공|아포칼립스|헌터|각성|게이트|던전브레이크/.test(g)) setToneKey('apoc')
    else if (/이세계|전이|시스템|솔로레벨업|나혼렙/.test(g)) setToneKey('isekai')
    else if (/데스게임|갇힘|SAO|소드아트|영구사망/.test(g)) setToneKey('death')
    else if (/VR|가상현실|다이브|로열로드|달빛조각사/.test(g)) setToneKey('vr')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 마지막 결과/잠금 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS)
      if (raw) {
        const p = JSON.parse(raw) as { picks?: Picks; toneKey?: string; locked?: Record<string, boolean>; toneLocked?: boolean }
        if (p.picks && typeof p.picks === 'object') {
          const valid: Picks = {}
          SLOTS.forEach((s) => { if (typeof p.picks![s.key] === 'string') valid[s.key] = p.picks![s.key] })
          if (Object.keys(valid).length) setPicks(valid)
        }
        if (typeof p.toneKey === 'string' && TONES.some((t) => t.key === p.toneKey)) setToneKey(p.toneKey)
        if (p.locked && typeof p.locked === 'object') setLocked(p.locked)
        if (typeof p.toneLocked === 'boolean') setToneLocked(p.toneLocked)
      }
    } catch { /* ignore */ }
  }, [])

  // 결과/잠금 저장
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify({ picks, toneKey, locked, toneLocked })) } catch { /* ignore */ }
  }, [picks, toneKey, locked, toneLocked])

  // 첫 진입 시 한 번 굴려 빈 상태 방지
  useEffect(() => {
    if (Object.keys(picks).length === 0) {
      const next: Picks = {}
      SLOTS.forEach((s) => { next[s.key] = pick(s.pool) })
      setPicks(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 굴림 애니메이션 자동 해제 + 언마운트 정리
  useEffect(() => {
    if (!spinning) return
    const t = window.setTimeout(() => setSpinning(false), 380)
    return () => window.clearTimeout(t)
  }, [spinning, picks])

  // 언마운트 시 토스트 타이머 정리
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }, [])

  const generate = useCallback(() => {
    setCopied(false); setSaved(false)
    setSpinning(true)
    setPicks((prev) => {
      const next: Picks = { ...prev }
      SLOTS.forEach((s) => {
        if (locked[s.key] && prev[s.key]) return // 잠긴 슬롯 유지
        let v = pick(s.pool)
        if (v === prev[s.key] && s.pool.length > 1) v = pick(s.pool) // 연속 동일 완화
        next[s.key] = v
      })
      return next
    })
    if (!toneLocked) {
      setToneKey((cur) => {
        let t = pick(TONES.map((x) => x.key))
        if (t === cur && TONES.length > 1) t = pick(TONES.map((x) => x.key))
        return t
      })
    }
  }, [locked, toneLocked])

  const rollOne = (key: string) => {
    setCopied(false); setSaved(false)
    setPicks((prev) => {
      const s = SLOTS.find((x) => x.key === key)!
      let v = pick(s.pool)
      if (v === prev[key] && s.pool.length > 1) v = pick(s.pool)
      return { ...prev, [key]: v }
    })
  }

  const toggleLock = (key: string) => setLocked((p) => ({ ...p, [key]: !p[key] }))

  const ready = SLOTS.every((s) => picks[s.key])
  const tone = TONES.find((t) => t.key === toneKey) || TONES[0]

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2200)
  }

  // 텍스트 요약(복사·스니펫용)
  const summaryText = () => {
    if (!ready) return ''
    const lines = SLOTS.map((s) => `${s.icon} ${s.label}: ${picks[s.key]}`)
    return [
      `【LitRPG 시스템 시그니처】 ${picks.job}  (분기 기조: ${tone.label})`,
      ...lines,
      ``,
      `${picks.signame}`,
      `※ ${tone.desc}`,
    ].join('\n')
  }

  const copy = () => {
    if (!ready) return
    navigator.clipboard?.writeText(summaryText()).then(() => {
      setCopied(true); window.setTimeout(() => setCopied(false), 1500)
    }).catch(() => flash('클립보드 복사가 지원되지 않습니다.'))
  }

  // 스니펫 라이브러리 저장(영감 메모로 재사용)
  const saveSnippet = () => {
    if (!ready) return
    addToLibrary('snippets', {
      text: summaryText(),
      source: 'LitRPG 시스템·퀘스트 시그니처 생성기',
      tags: ['게임판타지·LitRPG', '시스템', '퀘스트', tone.label, picks.job.slice(0, 24)],
    })
    setSaved(true); window.setTimeout(() => setSaved(false), 1500)
    flash('스니펫 라이브러리에 시스템을 저장했습니다.')
  }

  // 프로젝트 자료 〈시스템 설정〉 폴더에 메모로 추가 — 시그니처 + 슬롯 분해(설정 설계용)
  const toProject = () => {
    if (!ready) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const rows = SLOTS
      .map((s) => `<p><b>${escHtml(s.icon)} ${escHtml(s.label)}</b> <span style="color:#888;">(${escHtml(s.hint)})</span><br/>${escHtml(picks[s.key])}</p>`)
      .join('')
    const bodyHtml = [
      `<p style="font-size:18px;"><b>🎮 ${escHtml(picks.job)}</b></p>`,
      `<p style="font-size:14px;color:#666;font-style:italic;">${escHtml(picks.signame)}</p>`,
      `<p style="color:#888;">분기 기조 — <b>${escHtml(tone.label)}</b> · ${escHtml(tone.desc)}</p>`,
      `<hr/>`,
      rows,
    ].join('')
    const id = addToProject({
      kind: 'setting',
      root: 'research',
      folder: '시스템 설정',
      title: `🎮 ${picks.job.slice(0, 28)} (${tone.label})`,
      bodyHtml,
      synopsis: `${picks.build} · 핵심 스킬: ${picks.skill}`.slice(0, 140),
      meta: {
        기조: tone.label, 직업: picks.job, 핵심스킬: picks.skill, 스탯빌드: picks.build,
        무대: picks.stage, 보스: picks.boss, 칭호: picks.title, 성장한계: picks.limit, 배후떡밥: picks.backstory,
      },
    })
    flash(id ? '프로젝트 자료 〈시스템 설정〉 폴더에 추가했습니다.' : '프로젝트 추가에 실패했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <div style={hint}>
        이 작품만의 <b>시스템 한 벌</b>을 <b>직업·스킬·스탯빌드·던전·보스·시스템창·보상·칭호·퀘스트·성장한계·배후떡밥</b>까지 통째로 빚어냅니다.
        마음에 드는 슬롯은 🔒로 고정하고 나머지만 다시 굴리세요. 좋은 시스템은 멋진 스킬보다 <b>규칙의 일관성·약점·대가</b>가 핵심입니다.
      </div>

      {/* 조합수 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, border: '1px solid var(--accent)', borderRadius: 999, padding: '2px 9px' }}>
          <Emoji e="🎲" /> {fmt(COMBOS)}가지 조합
        </span>
        <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>({COMBOS.toLocaleString('ko-KR')})</span>
      </div>

      {/* 분기 기조 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>분기 기조</span>
        {TONES.map((t) => {
          const on = t.key === toneKey
          return (
            <button key={t.key} className="minibtn" onClick={() => { setToneKey(t.key); setCopied(false); setSaved(false) }}
              aria-pressed={on} title={t.desc}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              {t.label}
            </button>
          )
        })}
        <button className="minibtn" onClick={() => setToneLocked((v) => !v)} title={toneLocked ? '기조 고정 해제' : '기조 고정'}
          style={{ borderColor: toneLocked ? 'var(--accent)' : 'var(--border)' }}>
          {toneLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
        </button>
      </div>

      {/* 시그니처 헤더 카드 */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginBottom: 4 }}><Emoji e="🎮" /> 이 작품의 시그니처 직업·클래스</div>
        <div style={{
          fontSize: 19, fontWeight: 700, lineHeight: 1.4,
          color: ready ? 'var(--text)' : 'var(--muted)',
          transition: 'opacity .2s', opacity: spinning ? 0.5 : 1,
        }}>
          {ready ? (spinning ? '…시스템을 빚어내는 중…' : picks.job) : '생성해 보세요.'}
        </div>
        {ready && !spinning && (
          <>
            <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', marginTop: 6, lineHeight: 1.5 }}>
              {picks.signame}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, marginTop: 6 }}>
              <b style={{ color: 'var(--ok)' }}>{tone.label}</b> · {tone.desc}
            </div>
          </>
        )}
      </div>

      {/* 슬롯 분해(잠금/부분 재생성 단위) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SLOTS.map((s) => {
          if (s.key === 'job' || s.key === 'signame') return null // 헤더 카드에서 이미 표시
          const v = picks[s.key]
          const isLocked = !!locked[s.key]
          return (
            <div key={s.key} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '8px 11px',
            }}>
              <div style={{
                fontSize: 19, width: 24, textAlign: 'center', flexShrink: 0,
                transition: 'transform .25s',
                transform: spinning && !isLocked ? 'rotate(14deg) scale(1.15)' : 'none',
              }}><Emoji e={s.icon} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                  {s.label} <span style={{ opacity: 0.6 }}>({s.pool.length})</span> · {s.hint}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.45, color: v ? 'var(--text)' : 'var(--muted)' }}>
                  {v ? (spinning && !isLocked ? '…' : v) : '— 생성해 주세요 —'}
                </div>
              </div>
              <button className="minibtn" onClick={() => rollOne(s.key)} disabled={isLocked} title="이 슬롯만 다시"
                style={{ flexShrink: 0, padding: '0 6px' }}><Emoji e="🎲" /></button>
              <button className="minibtn" onClick={() => toggleLock(s.key)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                style={{ flexShrink: 0, padding: '0 6px', borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                {isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
              </button>
            </div>
          )
        })}
      </div>

      {/* 직업명·시그니처도 개별 재생성/잠금 가능하게(헤더 아래 작은 컨트롤) */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>직업/한 줄만:</span>
        <button className="minibtn" onClick={() => rollOne('job')} disabled={!!locked.job} title="직업·클래스만 다시"><Emoji e="🎲" /> 직업</button>
        <button className="minibtn" onClick={() => toggleLock('job')} style={{ borderColor: locked.job ? 'var(--accent)' : 'var(--border)' }}>{locked.job ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
        <button className="minibtn" onClick={() => rollOne('signame')} disabled={!!locked.signame} title="시그니처 한 줄만 다시"><Emoji e="🎲" /> 한 줄</button>
        <button className="minibtn" onClick={() => toggleLock('signame')} style={{ borderColor: locked.signame ? 'var(--accent)' : 'var(--border)' }}>{locked.signame ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
      </div>

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={generate}><Emoji e="🎮" /> 시스템 생성 / 다시 굴리기</button>
        <button className="minibtn" onClick={copy} disabled={!ready}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
        <button className="minibtn" onClick={saveSnippet} disabled={!ready} title="스니펫 라이브러리에 저장">
          {saved ? <>✓ 저장됨</> : <><Emoji e="⭐" /> 스니펫</>}
        </button>
      </div>

      {/* 프로젝트 연계 + 관련 도구 */}
      <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!ready || !hasProjectBridge()}
          title={
            !hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다'
            : !ready ? '먼저 시스템을 생성해주세요'
            : '생성한 시스템과 슬롯 분해를 프로젝트 자료 〈시스템 설정〉 폴더에 추가'
          }
        >
          <Emoji e="📄" /> 프로젝트에 추가
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('world-wiki', { genre: '게임판타지·LitRPG' })} title="세계관(시스템·세계) 위키에 정리">
          <Emoji e="📚" /> 세계관 위키
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('setting-bible', { genre: '게임판타지·LitRPG' })} title="배경 설정집(던전·세계)으로">
          <Emoji e="🏰" /> 배경 설정집
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('quest-forge', { genre: '게임판타지·LitRPG', seed: picks.quest || '' })} title="이 시스템에 맞는 퀘스트를 더 만들기">
          <Emoji e="📜" /> 퀘스트 생성기
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('character-sheet', { genre: '게임판타지·LitRPG', character: { name: '', notes: `${picks.job ? picks.job.slice(0, 24) : ''} 보유 플레이어`, fields: { notes: `${picks.job ? picks.job.slice(0, 24) : ''} 보유 플레이어` } } })} title="이 직업을 가진 인물 시트 만들기">
          <Emoji e="🧑‍🎤" /> 인물 시트
        </button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>
        좋은 시스템은 '무엇을 할 수 있는가'보다 <b>약점·대가·성장 한계</b>가 더 흥미롭습니다(도시에 2항: 규칙의 일관성·공정성, 9항: 수치 인플레 관리).
        클라이맥스에선 <b>네임드 보스 + 한계 돌파(역전 변수)</b>를, 중반엔 <b>성장 페널티·배후 떡밥</b>을 복선으로 회수해 보세요.
      </div>
    </div>
  )
}
