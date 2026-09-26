// LitRPG 사건 단조소 — 게임판타지·LitRPG 한 편의 "사건/소재"를 슬롯 조합으로 대량 생성한다.
//  분기(다이브/데스게임/전이+시스템/현실침공) × 트리거 × 무대(던전·게이트) × 적/네임드 × 시스템 장치
//  × 보상/루팅 × 비틀기(반전·함정) × 페널티 × 다음 게이트(목표) 슬롯을 굴려, "어디서 무엇이 터지고,
//  시스템은 뭐라 띄우며, 무엇을 얻고 무엇을 잃는가"를 한 사건으로 엮는다. 도시에의 장르 관습에 근거.
//  마음에 드는 슬롯은 🔒로 고정하고 나머지만 다시 굴린다(조합 1조+).
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(보관함)만 사용. 외부 API 불필요.
// 연계(linkbus): 현재 사건을 자료('research')/'사건' 폴더 문서로 추가, 글감 스니펫 라이브러리에도 저장,
//  배신 시나리오 생성기 등 관련 도구를 데이터와 함께 연다.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'litrpg-eventforge', name: 'LitRPG 사건 단조소', icon: '⚔️', group: '생성기', genre: '게임판타지·LitRPG', intro: '분기·무대·네임드·시스템 장치·보상·반전·페널티·다음 게이트를 슬롯 조합으로 굴려 한 편의 사건을 대량 생성', w: 580, h: 680 }

const LS = 'sry:tool:litrpg-eventforge'

// ---- 슬롯 정의 ----
// 각 슬롯은 LitRPG 사건의 한 축. faces = 그 축의 후보(로컬 표). 장르 특화·구체적으로 충분히 다양하게.
interface Slot { key: string; label: string; icon: string; desc: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'mode', label: '분기', icon: '🌐', desc: '어떤 LitRPG 세계 구조인가',
    faces: [
      'VR 다이브형 — 로그아웃 가능, 현실 생활이 병존하는 풀다이브 캡슐',
      '데스게임형 — 로그아웃 차단, HP 0이면 현실의 뇌까지 소각',
      '이세계 전이+시스템형 — 다른 세계로 넘어왔는데 상태창이 깔려 있다',
      '현실 침공형 — 어느 날 하늘에 균열이 갈라지고 게이트·상태창이 현실에 강림',
      '회귀+게임지식형 — 멸망을 한 번 겪고 모든 공략을 외운 채 첫날로 되돌아왔다',
      '원작 독자형 — 다 읽은 소설이 현실이 되었고, 결말까지 알고 있다',
      '관리자/탑 등반형 — 정체불명의 시스템이 99층의 탑으로 인류를 떠민다',
      '샌드박스 생산형 — 전투보다 채집·제작·경영으로 부를 쌓는 노가다 다이브',
      '헌터물 융합형 — 각성한 자만 게이트에 들어가는 등급제 헌터 사회',
      '경제·사회 시뮬형 — 갇힌 게임 안에서 길드 정치와 화폐 경제가 굴러간다(로그 호라이즌식)',
      '게임 종료 후 전이형 — 서비스 종료된 게임 캐릭터로 살아 움직이는 세계에 떨어졌다(오버로드식)',
      '시스템 패러디·코미디형 — 규칙은 진지하나 능력치·전직이 죄다 어이없게 꼬인다(코노스바식)',
      '던전 코어형 — 플레이어가 아니라 던전 그 자체가 되어 침입자를 막고 성장한다',
      '루프형 — 죽거나 실패하면 같은 구간을 처음부터 다시, 지식만 누적된다(타임루프+시스템)',
      '직업·전직 특화형 — 전투력보다 어떤 클래스로 전직하느냐가 운명을 가른다',
      '아카데미·학원형 — 시스템이 깔린 모험가 양성 학교에서 등급을 두고 경쟁한다',
      '협동 레이드형 — 솔로로는 절대 못 깨는, 대규모 공략대가 전제인 세계',
      '상태창 비공개형 — 남의 스탯이 안 보여, 정보 자체가 최강의 자원이 된다',
    ],
  },
  {
    key: 'trigger', label: '발단', icon: '⚡', desc: '사건의 인사이팅 인시던트',
    faces: [
      '받아들이는 순간 거부할 수 없는 [긴급 퀘스트]가 강제로 발령됐다',
      '아무도 깬 적 없는 히든 트리거를 실수로 밟아 버렸다',
      '서버 점검 공지가 뜨더니 로그아웃 버튼이 통째로 사라졌다',
      '튜토리얼이 끝나기도 전에 1층 보스가 안전지대를 짓밟고 내려왔다',
      '랭킹 1위가 공략 영상을 막판에 조작해 모두를 함정으로 유인했다',
      '죽은 줄 알았던 NPC가 시스템 메시지를 거슬러 말을 걸어왔다',
      '게이트의 등급이 측정 직전 D급에서 갑자기 S급으로 폭주했다',
      '경매장에 떠선 안 될 [봉인된 유물]이 헐값에 올라왔다',
      '카운트다운이 0이 되면 도시 하나가 통째로 던전화된다는 경고가 떴다',
      '동료의 상태창에 [???] 디버프가 붙더니 적군 색으로 물들었다',
      '한 번만 받을 수 있는 [선착순 히든 클래스] 알림이 전 서버에 울렸다',
      '죽으면 잃는 줄 알았던 기억이, 부활하자 통째로 사라져 있었다',
      'F급 각성자로 무시받던 주인공에게만 [???] 직업 알림이 떴다',
      '월드 보스가 예정보다 사흘 일찍 리젠되어 도시 한복판에 강림했다',
      '시스템 상점에 단 1초간 [전설 등급]이 가격 0으로 노출됐다',
      '회귀 전 기억과 달리, 이번엔 그 던전이 처음부터 열려 있지 않았다',
      '인스턴스 던전 입구가 닫히며 파티 전원이 안에 갇혔다',
      '필드 보스를 두고 두 대형 길드가 동시에 어그로를 끌어 난전이 터졌다',
      '튜토리얼 안내 AI가 "이건 게임이 아니다"라는 문장을 출력했다',
      '강제 PK 모드가 30분간 발동된다는 전 서버 공지가 울렸다',
      '받은 [의뢰서]의 발신인이 이미 죽은 사람의 이름이었다',
      '한밤중, 잠든 도시 위로 [던전 브레이크] 카운트가 떠올랐다',
      '랭커 전용 히든 맵의 좌표가 익명으로 전체 채팅에 뿌려졌다',
      '시스템이 "버그를 발견했습니다. 신고하시겠습니까?"라고 물어왔다',
      '평범한 줄 알았던 첫 사냥터에서 [개발자도 모르는 미구현 구역]에 발을 들였다',
      '동급 최하위였던 주인공의 등급이 측정 도중 측정 불가로 튀어 올랐다',
      '한 번 거절한 [숨은 의뢰]가 거절할수록 보상이 불어나며 다시 떠올랐다',
      '클리어 보상으로 받은 상자에서 다른 플레이어의 [유언]이 흘러나왔다',
    ],
  },
  {
    key: 'stage', label: '무대', icon: '🏰', desc: '사건이 벌어지는 던전·구역',
    faces: [
      '시간이 역행하는 [모래시계 회랑] 던전 — 한 발 늦으면 방이 통째로 리셋된다',
      '바닥이 용암으로 차오르는 [무너지는 화산 코어] 레이드',
      '거짓말을 하면 즉사하는 [심판자의 거울 미궁]',
      '죽은 플레이어가 적 몬스터로 부활하는 [망자의 공동묘지 필드]',
      '중력이 층마다 뒤집히는 [거꾸로 선 첨탑]',
      '안개에 닿으면 스탯이 1씩 깎이는 [잿빛 늪지대]',
      '소리를 내면 즉시 어그로가 끌리는 [침묵의 수정 동굴]',
      'PvP가 강제 허용된 [무법지대] 경매 도시',
      '실시간으로 지형이 재배치되는 [살아 있는 미로]',
      '보스 방 직전, 동료를 한 명만 데려갈 수 있는 [선택의 다리]',
      '균열 너머로 보이는 현실의 도심 — 몬스터가 도로로 쏟아진다',
      '99층 탑의 [관리자의 시험장] — 규칙 자체를 적이 바꾼다',
      '게임 화폐가 현실 통장으로 정산되는 [환금 길드 본부]',
      '강화 실패 시 장비가 폭발하는 [도박의 대장간]',
      '입장 인원에 비례해 난이도가 오르는 [균형의 콜로세움]',
      '시야가 5미터로 제한되는 [영원한 밤의 숲]',
      '체력이 아니라 정신력을 깎는 [악몽의 회랑]',
      '한 번 들어가면 24시간 못 나오는 [봉인 인스턴스]',
      '플레이어끼리만 신뢰할 수 있는, NPC 전원이 적인 [배신자의 성]',
      '구간마다 클래스가 강제로 바뀌는 [변신의 신전]',
      '아이템을 쓸 수 없는 [맨손의 시험장]',
      '죽은 자의 장비가 그대로 굴러다니는 [전멸한 공략대의 흔적]',
      '지상 100층 빌딩이 통째로 던전화된 [수직 레이드]',
      '레벨이 입장 시 1로 고정되는 [평등의 심연]',
      '보물상자가 곧 함정인 [탐욕의 보고]',
      '실시간 랭킹이 머리 위에 표시되는 [경쟁의 투기장]',
      '회복 스킬과 포션이 전부 막히는 [금욕의 수도원]',
      '한 명이 받은 피해가 파티 전원에게 분산되는 [운명 공유의 제단]',
      '들어선 순서대로 강제 1대1이 붙는 [순번의 결투장]',
      '특정 한 명만 출구를 알 수 있는 [기억상실의 지하 미궁]',
    ],
  },
  {
    key: 'foe', label: '적/네임드', icon: '👹', desc: '맞서는 존재',
    faces: [
      '패턴을 학습해 같은 수가 두 번 통하지 않는 [적응형 보스]',
      'HP가 깎일수록 강해지는 [광폭화 네임드]',
      '플레이어의 최강 스킬을 그대로 복제해 되돌려주는 [거울 기사]',
      '죽일 때마다 더 강하게 부활하는 [불멸의 리치]',
      '겉보기엔 약한 NPC지만 정체는 시스템의 [숨은 관리자]',
      '동료로 위장해 파티에 잠입한 [배신 플레이어]',
      '버그를 무기로 쓰는 [규칙 바깥의 글리치 몬스터]',
      '한 방에 즉사기를 거는 대신 쿨이 60초인 [도박형 처형자]',
      '이름조차 [???]로 가려진, 운영진도 모르는 [미등록 개체]',
      '과거 회차에서 주인공을 죽였던 [전생의 원수 랭커]',
      '소환수 군단을 부리는 [네크로맨서 길드마스터]',
      '현실의 인간을 인질로 잡은 [현실 침공 게이트의 군주]',
      '광역 디버프로 파티 전체를 무력화하는 [역병의 사제]',
      '둘로 나뉘면 더 강해져 절대 나눠 치면 안 되는 [분열의 슬라임 왕]',
      '특정 속성 공격에만 데미지가 들어가는 [원소 봉인 골렘]',
      '주인공의 약점을 정확히 아는, 미래에서 온 [또 다른 회귀자]',
      '플레이어를 죽일 때마다 그 외형과 스킬을 흡수하는 [도플갱어]',
      '체력은 없고 즉사 패턴만 있는, 회피 100% 요구의 [무도의 검귀]',
      '현실의 권력과 결탁한 [부패한 길드 연합의 수장]',
      '시스템을 해킹해 규칙을 자기 편으로 바꾸는 [버그 유저]',
      '처치 순간 자폭해 공략대를 길동무로 삼는 [순교자형 보스]',
      '대화로만 무력화할 수 있는, 전투 불가의 [수수께끼의 문지기]',
      '소설 원작에서 죽었어야 할, 살아남은 [궤도를 벗어난 인물]',
      '탑의 한 층을 통째로 지배하는 [관리자급 수문장]',
      '죽인 횟수만큼 다음 부활에서 패턴이 늘어나는 [기록형 사냥꾼]',
      '공격하면 그 데미지를 반사해 되돌려주는 [가시갑옷의 수호기사]',
      '시간을 멈춰 한 턴씩 선공을 빼앗는 [시간 정지의 마도사]',
      '주인공이 가장 신뢰하는 동료의 얼굴로 나타나는 [의태형 포식자]',
    ],
  },
  {
    key: 'system', label: '시스템 장치', icon: '🪟', desc: '이 사건에서 작동하는 게임 시스템',
    faces: [
      '[히든 클래스 전직 조건 충족] — 남들 못 가진 유니크 직업이 열린다',
      '[칭호 획득: 최초 클리어(First Clear)] — 전 서버 단 한 명의 영구 버프',
      '[스킬 진화] 액티브가 상위 스킬로 각성하며 콤보 연계가 풀린다',
      '[랜덤 옵션 재감정] 같은 장비를 두고 옵션을 다시 뽑는 도박',
      '[연계 퀘스트 분기] 한 선택이 메인 라인 자체를 갈라 버린다',
      '[세트 효과 발동] 마지막 한 조각을 끼우자 숨은 보너스가 터진다',
      '[강화 +9 → +10 도전] 성공률 12%, 실패 시 장비 파괴',
      '[딜미터 출력] "치명타! 1,288,402 데미지" — 박진감 있는 전투 로그',
      '[상태이상 중첩] 출혈·중독·기절이 겹쳐 전술이 머리싸움이 된다',
      '[시스템 AI의 개입] 안내자가 규칙을 어기고 힌트를 흘린다',
      '[경험치 폭발] 한 번의 처치로 다섯 레벨이 한꺼번에 오른다',
      '[히든 퀘스트 해금] 조건을 모르는 채 우연히 트리거를 밟았다',
      '[스탯 강제 재분배] 모든 포인트가 0으로 초기화되며 다시 빌드해야 한다',
      '[쿨다운 봉인] 가장 강한 필살기가 이 구간 내내 잠긴다',
      '[한계 돌파(Limit Break)] 죽기 직전, 조건 충족으로 잠재력이 개방된다',
      '[소켓 인챈트] 빈 슬롯에 박은 보석이 숨은 옵션을 깨운다',
      '[자원 고갈 경고] MP·스태미나가 바닥나 강력기를 봉인당한 채 싸운다',
      '[버프 동기화] 파티 전원의 스킬 쿨이 맞물려야만 콤보가 성립한다',
      '[랭킹 실시간 갱신] 처치 순간 순위표가 뒤집히며 명성이 폭등한다',
      '[드랍 확률 0.01%] 떨어지면 인생 역전, 안 떨어지면 맨손인 도박',
      '[전직 퀘스트 발령] 작은 아크가 열리며 상위 직업의 길이 보인다',
      '[시스템 메시지 오류] 표시된 수치 위로 [ERROR] 글자가 깜빡인다',
      '[패시브 각성] 위기에서 잠들어 있던 고유 능력이 처음으로 발동한다',
      '[인벤토리 무게 초과] 전리품을 다 못 챙기는 선택의 압박이 걸린다',
      '[퀵슬롯 자동화] 정해 둔 콤보가 조건이 맞는 순간 알아서 터진다',
      '[속성 상성 노출] 적의 약점 속성이 머리 위에 실시간으로 표시된다',
      '[히든 피스 수집] 흩어진 조각을 모으자 봉인된 스킬 한 줄이 채워진다',
      '[난이도 자동 보정] 파티가 강할수록 적의 스탯이 조용히 따라 오른다',
    ],
  },
  {
    key: 'twist', label: '비틀기', icon: '🌀', desc: '사건의 반전·함정',
    faces: [
      '공략대로 깼더니, 그 공략 자체가 적이 흘린 가짜였다',
      '보스를 잡자 진짜 보스가 "수고했다"며 박수치며 등장한다',
      '얻은 전설 아이템에 [저주: 착용 해제 불가]가 숨어 있었다',
      '구한 NPC가 사실 이 사건 전체를 설계한 흑막이었다',
      '클리어 보상이 다음 던전을 여는 [봉인 해제 열쇠]였다 — 풀려선 안 됐다',
      '회귀 전 지식이 이번 회차엔 통하지 않는다 — 미래가 바뀌었다',
      '죽인 적이 동료의 잃어버린 가족이었다',
      '승리 직후 [페널티: 다음 사망은 영구사망] 메시지가 떴다',
      '시스템이 거짓말을 했다 — 표시된 수치가 전부 조작이었다',
      '"이건 시험이 아니라 선발이었다" — 통과자만 더 깊은 함정으로 끌려간다',
      '동료의 희생으로 이겼지만, 부활 아이템이 한 개 남아 있었음을 뒤늦게 안다',
      '깬 던전이 현실의 특정 장소와 좌표가 일치했다',
      '보스를 살려 두는 것이 진짜 정답이었다 — 처치가 곧 함정이었다',
      '얻은 히든 클래스의 진짜 이름은 [제물]이었다',
      '이 모든 사건이 주인공의 등급을 측정하기 위한 시스템의 관찰이었다',
      '함께 싸운 NPC가 원작 소설 속 "죽었어야 할 인물"이었다',
      '시스템이 보상 대신 [선택지] 두 개만 띄우고 사라졌다',
      '클리어 직후, 같은 던전이 한 단계 위 난이도로 다시 열렸다',
      '적의 정체가 미래의 자기 자신이었다',
      '얻은 정보가 진짜였지만, 그걸 안다는 사실 자체가 표식이 되어 추적당한다',
      '구원받은 줄 알았던 마을이 사실 거대한 인스턴스 함정이었다',
      '승리의 대가로 세계의 [난이도] 자체가 한 단계 올라갔다',
      '얻은 보상은 진짜였지만, 그것이 시스템이 노린 [미끼]였다',
      '쓰러뜨린 적이 마지막 숨으로 진짜 적의 좌표를 알려 주고 사라졌다',
      '클리어 조건을 채운 순간, 그것이 봉인을 풀 마지막 열쇠였음이 드러났다',
      '함께 싸운 동료의 진짜 목적은 처음부터 주인공의 스킬 복사였다',
    ],
  },
  {
    key: 'reward', label: '보상/루팅', icon: '💎', desc: '무엇을 얻는가(개봉의 쾌감)',
    faces: [
      '[유니크 등급] 단 하나뿐인 고유 장비가 드랍됐다',
      '[전설(Legendary)] 세트의 마지막 조각',
      '[히든 스킬북] 습득 조건이 살벌한 금지된 스킬',
      '[칭호] "○○의 학살자" — 동족 상대 피해 +40%',
      '[소환 계약서] 보스를 그림자 군단의 일원으로 부린다',
      '[스탯 영구 증가 물약] 한 번뿐인 잠재력 개방',
      '[환금 가능 골드] 현실 통장으로 바로 정산되는 거액',
      '[설계도] 같은 등급 장비를 직접 제작할 수 있는 레시피',
      '[봉인된 유물] 정체불명, 감정에 막대한 비용이 든다',
      '[빈손] 드랍이 0개 — 대신 [최초 도달] 업적만 남았다',
      '[경험치 폭탄] 레벨이 단숨에 두 자릿수 점프',
      '[히든 클래스 전직권] 전 서버에 단 한 장',
      '[신화(Mythic) 등급] 등급 표가 갱신될 정도의 초월 장비',
      '[고유 패시브 각인] 두 번 다시 못 얻는 영구 능력이 몸에 새겨진다',
      '[펫 알] 부화시키면 성장하는 동반 소환수의 알',
      '[전직 NPC의 신뢰] 숨은 상위 직업으로 가는 인맥을 얻었다',
      '[지도 조각] 미발견 히든 던전의 좌표 일부',
      '[명성 +9999] 도시의 모든 NPC가 주인공을 알아본다',
      '[강화석 한 무더기] 도박 같은 +10 도전의 밑천',
      '[봉인 해제 권한] 다른 플레이어는 못 여는 구역의 열쇠',
      '[원작에 없던 아이템] 회귀·독자 지식으로도 몰랐던 변수',
      '[부활권] 다음 죽음 한 번을 무를 수 있는 단 한 장',
      '[속성 정수] 무기에 영구히 깃들 수 있는 희귀 원소 결정',
      '[차원 주머니] 무게 제한이 없는, 거의 무한한 휴대 창고',
      '[보스 영혼석] 처치한 네임드의 핵심 패시브 하나를 빌려 쓴다',
      '[성장형 무기] 주인을 따라 함께 레벨이 오르는 단 하나의 검',
    ],
  },
  {
    key: 'penalty', label: '대가/페널티', icon: '🩸', desc: '무엇을 잃거나 위험을 지는가',
    faces: [
      '레벨이 한 단계 내려가고 경험치 절반이 증발했다',
      '아끼던 장비가 강화 실패로 산산조각 났다',
      '[수배 상태] 모든 도시의 NPC가 적대로 돌아섰다',
      '동료 한 명이 부활 불가 상태로 영구 사망했다',
      '[저주] 일정 시간 동안 회복 스킬이 전부 봉인된다',
      '히든 클래스의 대가로 기존 스킬 트리가 전부 초기화됐다',
      '현실의 몸에 게임의 상처가 그대로 새겨졌다',
      '[빚] 갚지 못하면 능력치가 압류되는 시스템 채무를 졌다',
      '얻은 만큼 수명이 깎이는 [생명 환산] 계약에 묶였다',
      '다음 24시간 동안 [디버프: 모든 능력치 -50%]',
      '한 번 더 죽으면 캐릭터가 완전 삭제된다는 경고가 박혔다',
      '대가는 즉시 청구되지 않았다 — 더 큰 청구서가 예약돼 있다',
      '메인 스킬 하나가 영구히 봉인되어 다른 빌드를 강요당한다',
      '인벤토리 절반이 압류되어 핵심 소모품을 잃었다',
      '명성이 곤두박질쳐 길드에서 제명당했다',
      '랭킹이 폭락해 상위 던전 입장 자격을 박탈당했다',
      '특정 NPC의 신뢰가 0이 되어 연계 퀘스트 라인이 끊겼다',
      '회귀의 비밀이 한 사람에게 들켜 버렸다',
      '얻은 칭호의 부작용으로 같은 진영의 어그로를 끌게 됐다',
      '현실의 시간이 게임의 몇 배로 흘러 며칠을 잃었다',
      '얻은 장비가 [귀속] 상태라 팔지도 넘기지도 못하게 됐다',
      '클리어 보상의 대가로 다음 던전이 [솔로 입장]으로 잠겼다',
      '강해진 만큼 시스템의 [감시 등급]이 한 단계 격상됐다',
      '얻은 힘을 한 번 쓸 때마다 수명이 하루씩 깎이는 표식이 새겨졌다',
    ],
  },
  {
    key: 'gate', label: '다음 게이트', icon: '🚪', desc: '사건이 가리키는 다음 목표',
    faces: [
      '한 등급 위 [상위 던전]의 입장 자격이 막 열렸다',
      '[전직 퀘스트]가 발령됐다 — 작은 아크 하나가 시작된다',
      '랭킹전 시즌이 개막했다 — 1위를 향한 경쟁이 점화된다',
      '"이 시스템은 누가 만들었나" — 세계의 비밀로 향하는 떡밥이 깔렸다',
      '길드 창설/공성전 — 사회적 권력을 향한 판이 커진다',
      '회귀 전엔 없던 [미지의 변수]가 등장해 미래가 흔들린다',
      '현실로 균열이 번진다 — 게임의 사건이 도시를 위협한다',
      '탑의 다음 층 — 규칙이 통째로 바뀌는 [관리자의 시험]이 예고됐다',
      '잃어버린 동료를 되살릴 [부활 퀘스트]의 단서를 손에 넣었다',
      '히든 보스가 잠든 [봉인 구역]의 좌표가 드러났다',
      '환금한 골드로 현실의 위기를 막을 [마지막 거래]가 성사 직전이다',
      '시스템 AI가 "다음엔 너를 시험하겠다"는 마지막 말을 남겼다',
      '새 시즌 업데이트로 세계관 규칙 자체가 개편된다는 공지가 떴다',
      '동급 최강 라이벌이 결투를 정식으로 신청해 왔다',
      '주인공만 들어갈 수 있는 [솔로 인스턴스]의 입구가 나타났다',
      '대륙 단위의 [월드 퀘스트]가 전 서버에 발령됐다',
      '소환수를 진화시킬 [상위 계약]의 재료 목록이 공개됐다',
      '원작에서 알던 멸망의 날까지 남은 [카운트다운]이 시작됐다',
      '현실의 적대 세력이 게임 속 주인공의 정체를 캐기 시작했다',
      '봉인됐던 [최종 보스]의 부활 조건 하나가 충족됐다',
      '경제를 뒤흔들 [신규 산업 아이템]의 독점 기회가 열렸다',
      '세계를 가르는 [진영 선택]의 순간이 코앞에 닥쳤다',
      '성장형 무기를 깨울 [각성 시련]의 입구가 모습을 드러냈다',
      '주인공을 노리는 [현상금 사냥꾼]들의 추격이 시작됐다',
      '봉인된 기억을 되찾을 [과거의 던전]으로 가는 길이 열렸다',
      '게이트 너머의 [또 다른 세계]로 향하는 차원문이 점화됐다',
    ],
  },
]

const ORDER = SLOTS.map((s) => s.key)
const DEFAULT_ACTIVE = ['mode', 'trigger', 'stage', 'foe', 'system', 'twist', 'reward', 'penalty', 'gate']

const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]

// 조합 수: 활성 슬롯 faces 길이의 곱.
function comboCount(active: string[]): number {
  let n = 1
  active.forEach((k) => { const s = SLOTS.find((x) => x.key === k); if (s) n *= s.faces.length })
  return n
}
// 전체(모든 슬롯) 조합 수 — 헤더에 "최대 ~조" 표기.
const MAX_COMBOS = comboCount(ORDER)

function fmt(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(n >= 1e13 ? 0 : 1).replace(/\.0$/, '') + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, '') + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(0) + '만'
  return n.toLocaleString()
}

const escHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 굴린 결과를 한 편의 사건 시놉시스로 엮는다.
function compose(by: Record<string, string>): string {
  const parts: string[] = []
  if (by.mode) parts.push(`【${by.mode}】`)
  if (by.trigger) parts.push(`발단: ${by.trigger}`)
  if (by.stage) parts.push(`무대는 ${by.stage}.`)
  if (by.foe) parts.push(`맞서는 것은 ${by.foe}.`)
  if (by.system) parts.push(`결정적 순간, ${by.system}`)
  if (by.twist) parts.push(`그러나 ${by.twist}`)
  if (by.reward) parts.push(`전리품: ${by.reward}.`)
  if (by.penalty) parts.push(`대가: ${by.penalty}.`)
  if (by.gate) parts.push(`그리고 다음 게이트가 열린다 — ${by.gate}`)
  return parts.join(' ')
}

interface Saved { id: string; text: string; note: string; slots: string; rows: string }

export default function LitrpgEventForge({ payload }: { payload?: Record<string, unknown> }) {
  const [active, setActive] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':active')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          const valid = ORDER.filter((k) => arr.includes(k))
          if (valid.length) return valid
        }
      }
    } catch { /* ignore */ }
    return DEFAULT_ACTIVE
  })
  const [results, setResults] = useState<Record<string, string>>({})
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)
  const [saved, setSaved] = useState<Saved[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':saved')
      if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr }
    } catch { /* ignore */ }
    return []
  })

  const [tab, setTab] = useState<'forge' | 'saved'>('forge')
  const [toast, setToast] = useState('')
  const [copiedKey, setCopiedKey] = useState('')
  const nonce = useRef(0)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 페이로드로 슬롯 프리셋이 넘어오면 적용(연계 진입). 1회.
  useEffect(() => {
    const want = payload?.slots
    if (Array.isArray(want)) {
      const valid = want.filter((k): k is string => typeof k === 'string' && ORDER.includes(k))
      if (valid.length) setActive(ORDER.filter((k) => valid.includes(k)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 저장
  useEffect(() => { try { localStorage.setItem(LS + ':active', JSON.stringify(active)) } catch { /* ignore */ } }, [active])
  useEffect(() => { try { localStorage.setItem(LS + ':saved', JSON.stringify(saved)) } catch { /* ignore */ } }, [saved])

  // 비활성 슬롯의 결과/잠금 정리
  useEffect(() => {
    setResults((prev) => {
      const next: Record<string, string> = {}
      active.forEach((k) => { if (prev[k]) next[k] = prev[k] })
      return next
    })
    setLocked((prev) => {
      const next: Record<string, boolean> = {}
      active.forEach((k) => { if (prev[k]) next[k] = true })
      return next
    })
  }, [active])

  // 굴림 애니메이션 자동 해제 + 언마운트 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 320)
    return () => window.clearTimeout(t)
  }, [rolling])

  // 복사/토스트 피드백 정리(언마운트 포함)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1800)
    return () => window.clearTimeout(t)
  }, [toast])
  useEffect(() => {
    if (!copiedKey) return
    const t = window.setTimeout(() => { if (mounted.current) setCopiedKey('') }, 1500)
    return () => window.clearTimeout(t)
  }, [copiedKey])

  const toggleSlot = (key: string) => {
    setActive((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev // 최소 1개
        return prev.filter((k) => k !== key)
      }
      return ORDER.filter((k) => prev.includes(k) || k === key)
    })
  }

  const forge = useCallback(() => {
    const my = ++nonce.current
    setRolling(true)
    setResults((prev) => {
      if (my !== nonce.current) return prev
      const next: Record<string, string> = { ...prev }
      active.forEach((k) => {
        if (locked[k] && prev[k]) return // 잠긴 슬롯 유지
        const slot = SLOTS.find((s) => s.key === k)
        if (!slot) return
        let f = pick(slot.faces)
        if (f === prev[k] && slot.faces.length > 1) f = pick(slot.faces) // 연속 중복 완화
        next[k] = f
      })
      return next
    })
  }, [active, locked])

  const toggleLock = (key: string) => setLocked((prev) => ({ ...prev, [key]: !prev[key] }))

  const rolledList = active
    .map((k) => ({ slot: SLOTS.find((s) => s.key === k)!, face: results[k] }))
    .filter((r) => r.slot && r.face) as { slot: Slot; face: string }[]

  const hasResults = rolledList.length > 0
  const byKey: Record<string, string> = {}
  rolledList.forEach((r) => { byKey[r.slot.key] = r.face })
  const story = hasResults ? compose(byKey) : ''
  const combos = comboCount(active)
  const slotLabelLine = active.map((k) => SLOTS.find((s) => s.key === k)?.label || k).join('·')
  const rowsText = () => rolledList.map((r) => `${r.slot.icon} ${r.slot.label}: ${r.face}`).join('\n')

  const saveCurrent = () => {
    if (!hasResults) return
    setSaved((prev) => {
      if (prev.some((s) => s.text === story)) { setToast('이미 보관함에 있습니다.'); return prev }
      const rec: Saved = {
        id: 'sv_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4).toString(36),
        text: story,
        note: '',
        slots: slotLabelLine,
        rows: rowsText(),
      }
      setToast('보관함에 저장했습니다.')
      return [rec, ...prev]
    })
  }

  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))
  const setNote = (id: string, note: string) => setSaved((prev) => prev.map((s) => (s.id === id ? { ...s, note } : s)))
  const moveSaved = (id: string, dir: -1 | 1) => {
    setSaved((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      const ni = idx + dir
      if (ni < 0 || ni >= prev.length) return prev
      const a = prev.slice()
      ;[a[idx], a[ni]] = [a[ni], a[idx]]
      return a
    })
  }

  const copy = (key: string, text: string) => {
    const done = () => { if (mounted.current) setCopiedKey(key) }
    try {
      if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done)) }
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setToast('복사에 실패했습니다.') }
  }

  // 프로젝트 본문(HTML) — 완성 사건 + 슬롯별 분해.
  const bodyHtmlFor = (text: string, rows: string, slots: string) => {
    const rowLines = rows
      ? rows.split('\n').filter(Boolean).map((ln) => `<p>${escHtml(ln)}</p>`).join('')
      : ''
    return [
      `<p style="font-size:15px;line-height:1.8;"><b>${escHtml(text)}</b></p>`,
      `<hr/>`,
      slots ? `<p><b>슬롯 조합:</b> ${escHtml(slots)}</p>` : '',
      rowLines,
    ].join('')
  }

  // 프로젝트 연동 — 현재 사건을 자료(research)/'사건' 폴더에 문서로 추가.
  const addStoryToProject = () => {
    if (!hasResults) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '사건',
      title: `⚔️ LitRPG 사건 — ${(byKey.foe || story).slice(0, 24)}${(byKey.foe || story).length > 24 ? '…' : ''}`,
      bodyHtml: bodyHtmlFor(story, rowsText(), slotLabelLine),
      synopsis: story,
      meta: { 분기: byKey.mode?.split(' —')[0] || '—', 무대: byKey.stage?.split(' —')[0] || '—', 적: byKey.foe || '—', 보상: byKey.reward || '—', 페널티: byKey.penalty || '—' },
    })
    setToast(id ? '프로젝트 자료 〈사건〉 폴더에 사건을 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 스니펫 저장 — 글감 라이브러리에 사건을 스니펫으로 추가(여러 도구가 공유).
  const saveSnippet = (text: string, slots: string) => {
    if (!text) return
    addToLibrary('snippets', {
      text: `[LitRPG 사건] ${text}`,
      source: 'LitRPG 사건 단조소',
      tags: ['글감', '사건', '게임판타지', 'LitRPG', ...slots.split('·').filter(Boolean)],
    })
    setToast('스니펫 라이브러리에 저장했습니다.')
  }

  // 보관 항목 하나를 프로젝트에 추가
  const addSavedToProject = (s: Saved) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '사건',
      title: `⚔️ LitRPG 사건 — ${s.text.slice(0, 24)}${s.text.length > 24 ? '…' : ''}`,
      bodyHtml: bodyHtmlFor(s.text, s.rows, s.slots) + (s.note ? `<p style="color:#888;">📝 ${escHtml(s.note)}</p>` : ''),
      synopsis: s.text,
    })
    setToast(id ? '프로젝트 〈사건〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 배신 시나리오 생성기로 연계 — 이 사건의 '비틀기'를 배신 전개로 확장.
  const toBetrayalTool = () => {
    openToolLinked('betrayal-gen', { genre: meta.genre, seedFrom: 'litrpg-eventforge', hint: byKey.twist || '' })
    setToast('배신 시나리오 생성기를 열었습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const cardBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>분기·발단·무대·적·시스템 장치·비틀기·보상·페널티·다음 게이트</b> 슬롯을 골라 굴리면, 게임판타지·LitRPG 한 편의 사건이 엮입니다. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴리세요. <span style={{ color: 'var(--accent)' }}>최대 약 {fmt(MAX_COMBOS)}가지</span> 조합.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'}
          style={{ borderColor: tab === 'forge' ? 'var(--accent)' : 'var(--border)', color: tab === 'forge' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⚔️"/> 생성
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐"/> 보관함 ({saved.length})
        </button>
      </div>

      {tab === 'forge' && (
        <>
          {/* 슬롯 선택 */}
          <div style={chipRow}>
            {SLOTS.map((s) => {
              const on = active.includes(s.key)
              return (
                <button key={s.key} className="minibtn" onClick={() => toggleSlot(s.key)} aria-pressed={on}
                  title={s.desc}
                  style={{ opacity: on ? 1 : 0.5, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                  <Emoji e={s.icon}/> {s.label}{on ? '' : ' +'}
                </button>
              )
            })}
          </div>

          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            선택한 슬롯 가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmt(combos)}</b>가지 {combos >= 1e12 ? '(1조+)' : combos >= 1e8 ? '(1억+)' : ''}
          </div>

          {/* 슬롯별 굴림 결과 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {active.map((k) => {
              const slot = SLOTS.find((s) => s.key === k)!
              const face = results[k]
              const isLocked = !!locked[k]
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 22, width: 28, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-12deg) scale(1.15)' : 'none' }}>
                    <Emoji e={slot.icon}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{slot.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.45, color: face ? 'var(--text)' : 'var(--muted)' }}>
                      {face ? (rolling && !isLocked ? '…' : face) : '— 굴려주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => toggleLock(k)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 완성 사건 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="⚔️"/> 한 편의 사건</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: hasResults ? 'var(--text)' : 'var(--muted)' }}>
              {story || '슬롯을 골라 굴리면, 게임판타지·LitRPG 한 편의 사건이 만들어집니다.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={forge}><Emoji e="⚔️"/> 생성 / 다시 굴리기</button>
            <button className="minibtn" onClick={() => copy('story', `${story}\n\n${rowsText()}`)} disabled={!hasResults}>
              {copiedKey === 'story' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={saveCurrent} disabled={!hasResults}><Emoji e="⭐"/> 보관</button>
            <button className="minibtn" onClick={() => saveSnippet(story, slotLabelLine)} disabled={!hasResults} title="글감 스니펫 라이브러리에 저장"><Emoji e="✂️"/> 스니펫</button>
          </div>

          {/* 프로젝트·도구 연계 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={addStoryToProject} disabled={!hasResults || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !hasResults ? '먼저 사건을 굴려주세요' : '현재 사건을 프로젝트 자료 〈사건〉 폴더에 문서로 추가'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={toBetrayalTool} title="이 사건의 비틀기를 배신 시나리오로 확장"><Emoji e="🗡️"/> 배신 시나리오로</button>
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ ...hint, textAlign: 'center', padding: '24px 8px' }}>
              아직 보관한 사건이 없습니다. 〈생성〉 탭에서 마음에 드는 사건을 굴려 <b><Emoji e="⭐"/> 보관</b>하세요.
            </div>
          )}
          {saved.map((s, i) => (
            <div key={s.id} style={cardBox}>
              <div style={{ fontSize: 13.5, lineHeight: 1.65 }}>{s.text}</div>
              {s.slots && <div style={{ fontSize: 11, color: 'var(--muted)' }}>슬롯: {s.slots}</div>}
              <textarea
                value={s.note}
                onChange={(e) => setNote(s.id, e.target.value)}
                placeholder="메모(이 사건을 어떻게 쓸지)…"
                rows={2}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontSize: 12, background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}
              />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="minibtn" onClick={() => copy('sv_' + s.id, `${s.text}\n\n${s.rows}`)}>
                  {copiedKey === 'sv_' + s.id ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
                </button>
                <button className="minibtn" onClick={() => saveSnippet(s.text, s.slots)}><Emoji e="✂️"/> 스니펫</button>
                <button className="linkbtn" onClick={() => addSavedToProject(s)} disabled={!hasProjectBridge()}
                  title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 사건을 프로젝트 자료 〈사건〉 폴더에 추가'}>
                  <Emoji e="📄"/> 프로젝트에 추가
                </button>
                <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">▼</button>
                <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ marginLeft: 'auto', color: 'var(--danger, #d66)' }}><Emoji e="🗑️"/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
    </div>
  )
}
