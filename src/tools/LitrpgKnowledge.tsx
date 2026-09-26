// LitRPG 지식·소재 사전 — 게임판타지·LitRPG 장르에서 자주 쓰는 소재·설정·고증 지식을
// 카테고리(펼침)로 풍부하게 모은 로컬 사전. 검색 + 무작위 + 클릭 복사 + 연계/프로젝트 추가.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage 만 사용(외부 API 없음).
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'litrpg-knowledge',
  name: 'LitRPG 지식 사전',
  icon: '🎮',
  group: '지식 사전',
  genre: '게임판타지·LitRPG',
  intro: '상태창·스킬·등급·시스템·회귀 등 게임판타지·LitRPG의 소재·설정·고증을 펼쳐 보고 복사',
  w: 640,
  h: 660,
}

interface Entry {
  /** 표제어 */
  name: string
  /** 풀이(장르 고증·관습·활용) */
  desc: string
  /** 검색·복사용 보조 키워드(영문·이명 등) */
  tags?: string[]
  /** 작가용 활용 팁/함정(선택) */
  tip?: string
}
interface CatDef { key: string; label: string; icon: string; note: string; items: Entry[] }

// ─────────────────────────────────────────────────────────────────────────────
// 장르 도시에 근거 자작 데이터 — 게임판타지·LitRPG 특화·구체적(일반론 배제)
// ─────────────────────────────────────────────────────────────────────────────
const CATS: CatDef[] = [
  {
    key: 'branch', label: '장르 분기·모드', icon: '🌿',
    note: '작품 시작 시 첫 선택지. 분기에 따라 관습·금기·페이싱이 자동으로 갈린다.',
    items: [
      { name: 'VR 다이브형', tags: ['VRMMO', '로열로드', '달빛조각사', 'dive'], desc: '현실의 인간이 가상현실 게임에 접속한다. 로그아웃·현실 생활·게임 성과의 현금화가 공존하는 이중 구조. 생산직·노가다·일확천금 서사가 잘 붙는다.', tip: '현실 시간과 게임 시간의 환율(1:N)을 명시하면 "현실 하루=게임 며칠 수련" 같은 사이다가 가능.' },
      { name: '갇힘/데스게임형', tags: ['SAO', '소드아트온라인', 'death game', '로그아웃불가'], desc: '게임에서 못 나오고, 게임 속 죽음이 곧 현실의 죽음. 긴장도 최상. "안전지대" 묘사가 곧 긴장 완화이므로 절제해야 한다.', tip: '데스게임이면 부활·리스폰을 함부로 허용하지 말 것. 죽음의 무게가 장르 동력이다.' },
      { name: '이세계 전이+시스템형', tags: ['이세계', '나혼렙', 'solo leveling', '전이'], desc: '다른 세계로 넘어갔는데 그 세계에 게임 시스템(상태창·레벨)이 깔려 있다. 로그아웃 개념이 없어 "현실 도피처"가 없다.', tip: '왜 이 세계에 시스템이 존재하는지를 후반 떡밥으로 깔아두면 스케일업이 자연스럽다.' },
      { name: '현실 침공형(시스템 아포칼립스)', tags: ['헌터물', '게이트', '던전', '각성', '전독시'], desc: '어느 날 현실에 상태창·던전·게이트가 생긴다. 헌터물·각성자물과 강하게 겹친다. 평범한 일상과 비일상이 충돌하는 데서 드라마가 나온다.', tip: '"각성 등급 판정" 장면을 1막의 사이다/굴욕 분기점으로 쓰기 좋다(F급으로 무시→반전).' },
      { name: '던전 코어/관리형', tags: ['dungeon core', 'divine dungeon', '던전마스터'], desc: '주인공이 던전 그 자체(코어)이거나 던전을 경영·육성한다. 침입자를 막고 몬스터·함정을 배치하며 성장. 빌드·자원관리 쾌감이 핵심.', tip: '"방어자 시점"이라 일반 LitRPG의 사냥 루프가 뒤집힌다 — 보상은 침입자 격퇴로 환산.' },
      { name: '탑 등반형', tags: ['tower', '탑', '층', 'floor'], desc: '한 층씩 올라가며 시험·보스를 깬다. 층=난이도 게이트가 명확해 단기 목표가 자동 생성된다. 층마다 규칙이 바뀌는 변주가 강점.', tip: '"히든 층/숨겨진 길"을 두면 주인공만의 특별함을 만들기 쉽다.' },
      { name: '회귀+게임지식형', tags: ['회귀', 'regression', '회귀자', '미래지식'], desc: '결과를 이미 아는 자가 시스템·공략 지식을 무기로 삼는다. 한국 장르의 결정적 변주이자 "사이다 양산기". 전독시는 "원작을 다 읽은 독자" 형태로 변형.', tip: '미래지식은 "언제 어떻게 써먹나"의 기대감으로 운용 — 한 번에 다 풀면 긴장이 죽는다.' },
    ],
  },
  {
    key: 'status', label: '상태창·시스템 메시지', icon: '🪟',
    note: '서술을 멈추고 "팝업"을 띄워 호흡을 끊는 연출 자체가 장르의 멋.',
    items: [
      { name: '상태창(Status Window)', tags: ['status', '스테이터스', 'HP', 'MP'], desc: 'HP/MP/스탯/레벨/경험치를 텍스트 박스로 본문에 삽입. [ ], < >, 굵게, 구분선으로 시각 분리. 정보 전달 + 리듬 환기 + 보상 연출을 한 번에 한다.', tip: '상태창을 매 화 도배하면 둔감해진다 — 갱신이 "사건"일 때만 띄울 것.' },
      { name: '시스템 메시지', tags: ['system message', '알림', 'notification'], desc: '"[레벨이 올랐습니다]", "[칭호를 획득했습니다]" 식의 일방 통보. 굵은 괄호·줄바꿈으로 본문과 분리해 시선을 잡는다.', tip: '같은 양식의 메시지를 일관되게 써야 독자가 "규칙"으로 받아들인다.' },
      { name: '전투 로그·딜미터', tags: ['combat log', '데미지', 'damage', 'DPS'], desc: '"데미지 1,234! 치명타!" 식 수치 출력으로 박진감. 누적 딜·약점타·연계 보너스를 숫자로 보여 줘 전투를 "관전 가능한 정보"로 만든다.', tip: '숫자 인플레가 심해지면 자릿수 자체가 무의미 — 상대치(약점 ×3 등)로 전환하면 감흥 유지.' },
      { name: '튜토리얼 안내(시스템 음성)', tags: ['tutorial', '튜토리얼', '안내자'], desc: '초반 규칙 학습=독자 온보딩. 안내 멘트로 세계관 규칙을 자연스럽게 설명. "튜토리얼 보상"으로 첫 특별함을 쥐여주는 단골 구간.', tip: '튜토리얼을 길게 끌면 진입 장벽 — 핵심 규칙 3~4개만 보여주고 빠르게 본편으로.' },
      { name: '경고/페널티 알림', tags: ['warning', '패널티', 'penalty', '디버프'], desc: '"[경고: 5분 내 처치하지 못하면 즉사]" 같은 제약 통보가 즉시 긴장을 만든다. 실패 조건을 명시할수록 클라이맥스가 선명해진다.', tip: '페널티는 반드시 실행하라 — 협박만 하고 안 지키면 시스템의 권위가 무너진다.' },
      { name: '히든 메시지·시스템 오류', tags: ['hidden', 'error', '버그', '글리치'], desc: '"[알 수 없는 권한이 감지되었습니다]", "[██████]" 같은 깨진 메시지. 시스템의 배후·비밀을 암시하는 떡밥 장치로 후반 메인 플롯과 연결된다.', tip: '깨진 텍스트(██)는 떡밥의 시각적 사인 — 남발하면 효과 반감.' },
    ],
  },
  {
    key: 'growth', label: '성장·스탯·레벨', icon: '📈',
    note: '독자는 주인공이 강해지는 것을 "숫자로" 확인하고 싶어 한다. 빠지면 LitRPG로 인정받기 어렵다.',
    items: [
      { name: '레벨업', tags: ['level up', '경험치', 'EXP', 'XP'], desc: '경험치 누적으로 레벨 상승, 잉여 스탯 포인트 획득. 가장 기본적인 보상 단위이자 "조금 더 강해짐"의 미세 보상.', tip: '레벨업 보상을 매번 똑같이 주지 말 것 — 가끔 "스킬 해금"처럼 질적 보상을 섞어야 둔감화 방지.' },
      { name: '스탯 분배', tags: ['stat', '능력치', '힘', '민첩', '지능', '체력'], desc: '잉여 포인트를 어디에 넣느냐가 곧 캐릭터성. 근접 깡스탯 vs 마법 vs 민첩 잠입 같은 빌드 정체성을 만든다.', tip: '주인공의 분배 선택을 "고민 장면"으로 보여주면 독자가 빌드에 감정이입한다.' },
      { name: '히든 스탯', tags: ['hidden stat', '숨겨진 능력치', '카르마', '명성'], desc: '행운·매력·신앙·카르마·악명처럼 일반에 안 보이는 특수 스탯. 주인공만의 특별함·숨겨진 분기 조건으로 쓰인다.', tip: '히든 스탯은 "어쩌다 충족된 조건"으로 드러낼 때 가장 쾌감이 크다.' },
      { name: '스탯 포인트·자유 분배', tags: ['free point', '보너스 포인트'], desc: '레벨업·퀘스트·칭호로 받은 자유 포인트. 분배의 자유도가 빌드 최적화(머리싸움)의 묘미를 만든다.', tip: '"올인 빌드"의 위험과 보상을 함께 보여줘야 선택이 긴장된다.' },
      { name: '한계 돌파(Limit Break)', tags: ['limit break', '각성', '잠재력', '돌파'], desc: '죽기 직전 새 스킬 각성·숨은 잠재력 개방. "[조건 충족: ○○ 발동]" 시스템 메시지로 역전을 정당화하는 클라이맥스 단골.', tip: '복선을 미리 깔아둔 한계 돌파만이 "데우스 엑스 마키나"를 면한다.' },
      { name: '레벨 캡·전직 게이트', tags: ['level cap', 'cap', '전직'], desc: '특정 레벨에서 막히고, 전직 퀘스트를 통과해야 상한이 열린다. 성장에 구획(게이트)을 만들어 동기를 부여.', tip: '캡을 뚫는 방식이 주인공만 다르면(편법·히든 루트) 차별화 포인트.' },
      { name: '수치 인플레 관리', tags: ['power creep', '파워인플레', '인플레'], desc: '후반으로 갈수록 숫자가 커져 감흥이 둔해지는 구조적 약점. 단위 리셋(차원/등급 개편)·상대평가(랭킹)·질적 보상으로 보완한다.', tip: '성장 그래프를 추적해 "보상 둔감화" 신호를 조기에 잡아라.' },
    ],
  },
  {
    key: 'skill', label: '스킬·직업·클래스', icon: '✨',
    note: '스킬 시너지·콤보의 묘미, 그리고 히든/유니크 클래스를 통한 주인공 특별화.',
    items: [
      { name: '스킬 트리·진화', tags: ['skill tree', '스킬', '진화', '상위스킬'], desc: '습득 조건·등급(액티브/패시브)·연계기로 구성. 스킬 진화/각성/상위 스킬로 성장의 질적 도약을 만든다.', tip: '"숙련도 100% → 진화" 같은 명시 조건이 독자에게 다음 목표를 준다.' },
      { name: '액티브 스킬', tags: ['active', '발동기', '쿨다운'], desc: '직접 발동하는 공격·기동기. 쿨다운·MP 소모라는 제약이 전투를 머리싸움으로 만든다.', tip: '강력기일수록 쿨이 길어야 "언제 쓰느냐"의 긴장이 산다.' },
      { name: '패시브 스킬', tags: ['passive', '상시', '특성'], desc: '항상 적용되는 보정. 빌드의 토대를 이루고, 시너지 설계의 핵심 변수가 된다.', tip: '패시브의 누적 시너지를 한 장면에서 "터뜨리면" 빌드의 카타르시스가 나온다.' },
      { name: '스킬 콤보·연계기', tags: ['combo', '연계', 'synergy', '시너지'], desc: '스킬을 순서대로 엮어 추가 효과를 내는 연속기. "최적해를 찾아내는 머리싸움"의 쾌감을 담당.', tip: '독자가 따라 외울 수 있을 만큼 명확한 콤보가 "전략의 묘미"를 만든다.' },
      { name: '히든/유니크 클래스', tags: ['hidden class', 'unique', '직업', '유일직업'], desc: '주인공만 가진 직업. 특별함의 단골 장치. 전직 퀘스트가 작은 아크 단위가 된다.', tip: '유니크 클래스는 "왜 나만?"의 정당화(조건·우연·자격)가 있어야 설득력이 산다.' },
      { name: '전직·상위 직업', tags: ['advance class', '전직', '2차각성'], desc: '기본 직업 → 상위 직업으로의 도약. 전직 퀘스트의 시련을 통해 큰 폭의 성장을 정당화한다.', tip: '전직 직전을 "한계에 부딪힌 답답함"으로 깔면 전직 순간이 사이다가 된다.' },
      { name: '스킬 북·전수·각인', tags: ['skill book', '습득', '각인', '전수'], desc: '스킬을 책·NPC 전수·각인으로 배운다. 희귀 스킬북의 입수가 그 자체로 루팅 보상이 된다.', tip: '"이미 배운 스킬과의 충돌/대체" 규칙을 두면 선택의 긴장이 생긴다.' },
    ],
  },
  {
    key: 'rarity', label: '등급·아이템·인벤토리', icon: '💎',
    note: 'Common→Legendary로 이어지는 공통 측정자. 루팅(개봉)의 쾌감과 강화의 도박성.',
    items: [
      { name: '레어리티 등급', tags: ['rarity', 'common', 'rare', 'epic', 'legendary', 'mythic'], desc: '일반→고급→희귀→영웅→유니크→전설→신화 식 색상·등급. 아이템·스킬·몬스터·던전 전반에 적용되는 공통 측정자.', tip: '등급 색을 본문에서 일관되게 부르면(예: "보라색 빛" = 에픽) 독자가 즉시 가치를 읽는다.' },
      { name: '인벤토리·무게·슬롯', tags: ['inventory', '무게', '슬롯', 'weight'], desc: '저장 공간·무게·슬롯 제한이 자원관리 변수. 아공간 인벤토리는 편의이자 "현실 침공형"에서 강력한 이점.', tip: '제한이 있어야 "무엇을 버리고 무엇을 챙기나"의 선택이 산다 — 무제한은 긴장 소멸.' },
      { name: '세트 아이템·세트 효과', tags: ['set', '세트효과', '풀세트'], desc: '같은 세트를 모으면 추가 보너스. "2/4/6 세트 효과" 식 단계 보상이 수집 동기를 만든다.', tip: '마지막 한 조각이 안 나오는 "수집의 애태움"이 서사적 긴장으로 쓰인다.' },
      { name: '강화·인챈트·소켓', tags: ['enhance', '강화', 'enchant', 'socket', '옵션'], desc: '+1~+N 강화, 속성 인챈트, 보석 소켓, 랜덤 옵션 뽑기. 확률(성공/파괴)이 도박성과 긴장을 만든다.', tip: '강화 실패로 장비 파괴 → 캐릭터의 모든 것을 건 한 방이 명장면이 된다.' },
      { name: '랜덤 옵션·아이템 굴리기', tags: ['random option', '리롤', 'reroll', 'RNG'], desc: '같은 아이템도 옵션이 무작위. "원하는 옵션이 뜰 때까지" 리롤하는 도박. RNG가 서사적 긴장 장치.', tip: '"최악의 옵션이 떴는데 알고 보니 시너지"는 반전 루팅의 단골.' },
      { name: '루팅·드랍·개봉', tags: ['loot', '드랍', 'drop', 'unboxing', '전리품'], desc: '보스를 잡고 드랍을 까보는 "개봉(unboxing)" 긴장. 낮은 드랍률일수록 입수가 사건이 된다.', tip: '"드랍 확인" 장면을 클라이맥스 직후 보상으로 배치하면 카타르시스가 두 번 온다.' },
      { name: '아티팩트·신물(神物)', tags: ['artifact', '신물', '고대유물', 'relic'], desc: '세계관급 유일 아이템. 봉인·각성 조건·대가가 붙어 단순 장비를 넘어 플롯 엔진이 된다.', tip: '신물은 "사용 대가/봉인 해제 조건"으로 양날의 검을 만들어야 서사가 산다.' },
      { name: '소모품·물약·스크롤', tags: ['potion', '물약', 'scroll', '소모품'], desc: 'HP/MP 회복, 귀환 스크롤, 버프 음식 등. 평범해 보여도 "마지막 물약 한 병"이 생사를 가르는 긴장을 만든다.', tip: '자원이 떨어지는 압박을 누적시키면 평범한 물약도 클라이맥스의 변수가 된다.' },
    ],
  },
  {
    key: 'quest', label: '퀘스트·칭호·업적', icon: '📜',
    note: '히든·연계 퀘스트가 플롯 분기점. 칭호는 업적의 수치화이자 버프·해금 조건.',
    items: [
      { name: '메인/서브 퀘스트', tags: ['main quest', 'sub quest', '메인', '서브'], desc: '큰 줄기(메인)와 곁가지(서브)로 목표 위계를 만든다. 단기·중기·장기 목표가 동시에 굴러가게 하는 골격.', tip: '"이번 화에 다음 목표가 갱신됐는가?"를 페이싱 체크리스트로.' },
      { name: '히든 퀘스트', tags: ['hidden quest', '히든', '숨겨진'], desc: '특정 조건·선택·히든 스탯으로만 발동. 주인공만의 특별한 보상·분기로 이어지는 플롯 전환점.', tip: '"무심코 한 선택이 히든 퀘스트 조건이었다"는 회수의 쾌감이 크다.' },
      { name: '연계 퀘스트', tags: ['chain quest', '연계', 'chain'], desc: '여러 퀘스트가 사슬처럼 이어져 한 아크를 이룬다. 단계마다 보상·난이도가 상승해 몰입을 유지.', tip: '연계의 마지막 단계에 "예상 못 한 배신/반전"을 넣으면 아크가 살아난다.' },
      { name: '실패 페널티·시간 제한', tags: ['fail', '페널티', 'time limit', '제한시간'], desc: '실패 시 스탯 하락·아이템 손실·즉사. 명시된 실패 조건이 긴장을 만든다. 시간 제한은 즉효 긴장 장치.', tip: '실패의 대가를 한 번 실제로 치르게 하면 이후 모든 퀘스트에 무게가 실린다.' },
      { name: '칭호(Title)', tags: ['title', '칭호', '업적칭호'], desc: '업적으로 획득하는 명칭. 버프·해금 조건으로 작동. "최초 달성(First Clear)" 보너스가 단골.', tip: '겉보기 시시한 칭호가 알고 보니 강력한 조건부 버프 — 반전 빌드의 재료.' },
      { name: '업적·도전과제', tags: ['achievement', '업적', '도전과제'], desc: '"○○를 1000마리 처치", "노데스 클리어" 같은 조건 달성 보상. 수집·완벽주의 독자의 욕망을 자극.', tip: '"세계 최초" 업적은 랭킹·평판과 묶어 사회적 인정의 쾌감으로 증폭.' },
      { name: '첫 클리어(First Clear) 보너스', tags: ['first clear', '최초', '월드퍼스트'], desc: '아무도 못 한 것을 처음 해냈을 때의 특별 보상·칭호·공개 알림. 주인공을 단숨에 스타로 만든다.', tip: '"전 서버 공지" 연출로 주인공의 위상 상승을 외부 시선으로 보여줘라.' },
    ],
  },
  {
    key: 'combat', label: '전투·확률·상태이상', icon: '⚔️',
    note: '쿨다운·자원관리·상태이상이 전투를 머리싸움으로. 확률은 서사적 긴장 장치.',
    items: [
      { name: '크리티컬·약점타', tags: ['critical', '치명타', '약점', 'weakness'], desc: '확률 기반 추가 피해. "치명타 발동!" 메시지로 박진감. 약점 속성 공략이 전술의 핵심 변수.', tip: '크리 확률을 빌드 선택과 묶으면(고위험 고수익) 전투가 도박처럼 긴장된다.' },
      { name: '상태이상(중독·기절·출혈·화상)', tags: ['status effect', '디버프', 'poison', 'stun', 'burn'], desc: '중독·기절·출혈·화상·빙결 등과 지속시간. 한 방보다 누적 데미지·행동 봉쇄가 판을 가른다.', tip: '상태이상의 "면역/저항/해제" 규칙을 명시하면 전술 선택지가 풍부해진다.' },
      { name: '버프·디버프', tags: ['buff', 'debuff', '강화', '약화'], desc: '아군 강화·적군 약화의 지속 효과. 버프 타이밍·중첩 규칙이 레이드 전술의 묘미.', tip: '"버프가 끊기는 순간"을 위기 트리거로 쓰면 자원관리 긴장이 산다.' },
      { name: '쿨다운·자원관리', tags: ['cooldown', '쿨타임', 'MP', '스태미나'], desc: '강력기는 쿨이 길고 MP/스태미나를 크게 먹는다. "지금 이 기술을 쓰면 다음 위기에 못 쓴다"는 선택이 전투를 머리싸움으로.', tip: '쿨/자원 잔량을 독자에게 보여주면 전투가 "관전 가능한 퍼즐"이 된다.' },
      { name: '확률·드랍률·성공률(RNG)', tags: ['RNG', '확률', 'drop rate', '성공률'], desc: '드랍률·강화 성공률·회피율 등 모든 무작위. 확률이 곧 긴장(강화 실패로 파괴 등). "0.01% 확률을 뚫는" 연출이 사이다.', tip: '운(행운 스탯)을 변수로 두면 RNG를 캐릭터 능력으로 회수할 수 있다.' },
      { name: '어그로·탱킹·포지셔닝', tags: ['aggro', '탱커', '딜러', '힐러', '포지션'], desc: '몬스터의 표적(어그로) 관리, 탱-딜-힐 역할 분담, 위치 선정. 파티·레이드 전투의 협동 전술 골격.', tip: '"어그로가 엉키는 순간"의 혼란을 위기로 쓰면 파티 호흡이 드라마가 된다.' },
      { name: '패턴 파악·기믹', tags: ['pattern', '기믹', 'gimmick', '페이즈'], desc: '보스의 행동 패턴·페이즈 전환·특수 기믹(장판/소환/광폭화). 패턴 파악 → 전멸 위기 → 역전의 3박자가 레이드 클라이맥스.', tip: '"광폭화(enrage) 타이머"를 두면 DPS 압박으로 시간 긴장을 만든다.' },
    ],
  },
  {
    key: 'system', label: '시스템 배후·세계관', icon: '🌐',
    note: '"이 시스템은 왜 존재하나, 누가 만들었나"가 후반 메인 떡밥. 게임에서 우주적 음모로 스케일업.',
    items: [
      { name: '시스템(의인화 AI)', tags: ['system', '시스템', 'AI', '관리자'], desc: "'시스템' 자체가 인격적 존재로 등장(전독시의 도깨비, 솔로레벨링의 시스템). 안내자이자 세계관 비밀의 화자 역할도 겸한다.", tip: '시스템의 "말투/태도"에 개성을 주면 정보 전달이 캐릭터 드라마가 된다.' },
      { name: '관리자·신·탑의 주인', tags: ['administrator', '신', 'god', '탑의주인', '배후'], desc: '시스템을 만든 존재. 신/관리자/외계존재/탑의 주인 등. 후반부 메인 빌런 또는 진실의 핵으로 스케일업한다.', tip: '"게임인 줄 알았는데 우주적 실험/전쟁이었다"는 장르의 단골 반전 구조.' },
      { name: '시나리오·코인·정산', tags: ['scenario', '시나리오', '코인', 'coin'], desc: '시스템이 강제하는 "시나리오"와 그 보상 재화(코인). 생존이 곧 콘텐츠 소비, 코인이 곧 권력이 되는 메타 구조(전독시형).', tip: '"관객/별/후원" 같은 외부 시선을 두면 행동에 추가 인센티브가 생긴다.' },
      { name: '시스템 공정성·일관성', tags: ['fairness', '공정성', '규칙'], desc: '규칙은 명시되고 작가가 임의로 어기면 독자 반발. "사기여도 규칙 안에서 사기여야 한다"는 장르의 신뢰 계약.', tip: '주인공의 편법이 "규칙의 빈틈을 찌른 것"으로 설계되면 사기여도 정당해 보인다.' },
      { name: '현실↔게임 환율·연동', tags: ['exchange', '환율', '현금화', '연동'], desc: '게임 재화의 현금화, 게임 성과가 현실 지위로(달빛조각사형). 현실 침공형에선 게임 능력이 곧 현실 권력.', tip: '환율을 구체 수치로 못 박으면 경제·계급 서사가 단단해진다.' },
      { name: '시스템 사회·경제 시뮬', tags: ['economy', '경제', '사회', '로그호라이즌'], desc: '갇힌 세계에서 화폐·길드·생산·정치가 작동하는 사회 시뮬레이션(로그 호라이즌형). 전투 외 "세계 운영"이 콘텐츠.', tip: '인플레이션·독점·세금 같은 경제 사건을 갈등의 축으로 쓸 수 있다.' },
    ],
  },
  {
    key: 'world', label: '무대·게이트·던전', icon: '🏰',
    note: '파워 게이팅(난이도 구획): 마을→필드→던전→레이드→상위 지역. 진입마다 자격 게이트.',
    items: [
      { name: '게이트·차원문', tags: ['gate', '게이트', '차원문', '균열'], desc: '현실에 열리는 던전 입구. 등급(D~S, 나아가 SS)으로 위험도를 표시. 브레이크(폭주) 시 몬스터가 현실로 쏟아진다.', tip: '"브레이크 임박" 게이트는 시간 제한 긴장과 사회적 책임을 동시에 거는 장치.' },
      { name: '던전·레이드', tags: ['dungeon', '던전', 'raid', '레이드'], desc: '몬스터·함정·보스가 있는 공략 공간. 솔로 던전부터 공대 레이드까지. 에피소드 한 덩어리의 기본 단위.', tip: '던전마다 "고유 규칙"을 하나씩 두면 반복 사냥이 지루해지지 않는다.' },
      { name: '필드·사냥터·존', tags: ['field', '사냥터', 'zone', '존'], desc: '레벨대별 사냥 구역. 적정 레벨·몬스터 종류·드랍이 정해져 성장 동선을 안내한다. "사냥터 텃세"가 갈등 소재.', tip: '"낮은 사냥터에서 고효율을 뽑는 편법"은 회귀/지식형의 단골 사이다.' },
      { name: '보스·네임드 몬스터', tags: ['boss', '보스', 'named', '네임드'], desc: '구역의 정점. 패턴·기믹·페이즈를 가진 클라이맥스 단위. 첫 처치(First Kill)는 칭호·드랍·명성의 삼중 보상.', tip: '보스 직전 "전멸 직전의 변수(히든스킬·각성·동료 희생)"가 역전의 3박자.' },
      { name: '안전지대·마을·길드홀', tags: ['safe zone', '안전지대', '마을', '귀환'], desc: '전투가 금지된 휴식·거래·정보의 거점. 완급 조절과 인간관계 묘사가 일어나는 곳. 데스게임형에선 함부로 두면 안 됨.', tip: '전투 70 : 휴식·관계·세계관 30 비율의 "30"을 담당하는 공간.' },
      { name: '히든 던전·숨겨진 지역', tags: ['hidden dungeon', '히든', '숨겨진'], desc: '조건·히든 퀘스트·우연으로만 들어가는 비밀 공간. 주인공만의 특별 보상·정보·전직의 무대.', tip: '"남들이 못 본 길"은 회귀/지식형 주인공의 정보 우위를 보여주기에 최적.' },
      { name: '리스폰·세이브·페널티', tags: ['respawn', '리스폰', 'save', '부활'], desc: '죽으면 부활(경험치·아이템 손실)하거나, 데스게임이면 영구사망. 부활 규칙이 장르 톤 전체를 결정한다.', tip: '"부활 가능 vs 영구사망"은 첫 화에서 못 박아야 이후 죽음의 무게가 일관된다.' },
    ],
  },
  {
    key: 'social', label: '랭킹·길드·평판', icon: '🏆',
    note: '길드·랭커·순위표·명성 — 사회적 인정의 수치화. 무시당하던 자가 압도로 갚는 사이다 리듬.',
    items: [
      { name: '랭킹·순위표', tags: ['ranking', '랭킹', 'leaderboard', '순위'], desc: '전투력·기여도·클리어 기록의 공개 순위. 상대평가라 수치 인플레 속에서도 "1위"의 가치가 유지된다.', tip: '"무명 → 랭킹 급상승"의 외부 반응(충격받는 랭커들)을 보여주면 사이다가 증폭.' },
      { name: '랭커·고수', tags: ['ranker', '랭커', '고수', '강자'], desc: '상위권의 강자들. 주인공의 라이벌·동경 대상·넘어야 할 벽. 그들의 "평가 변화"가 주인공 성장의 거울.', tip: '랭커가 주인공을 "처음엔 무시 → 인정 → 경계"하는 단계가 위상 상승의 척도.' },
      { name: '길드·클랜', tags: ['guild', '길드', 'clan', '클랜'], desc: '플레이어 결사체. 가입·창설·길드전·세력 다툼. 명문 길드의 스카우트/거절이 주인공 평판의 시금석.', tip: '"대형 길드의 영입 제안을 거절"하는 장면은 주인공의 자존·노선을 선언하는 사이다.' },
      { name: '명성·악명·평판', tags: ['fame', '명성', '악명', 'reputation'], desc: '세력·NPC·플레이어 사이의 평가 수치. 명성은 상점 할인·퀘스트 해금, 악명은 현상금·적대를 부른다.', tip: '명성과 악명을 동시에 운용하면 "영웅이자 위험인물"의 입체적 위상이 생긴다.' },
      { name: 'PK·진영·세력전', tags: ['PK', '진영', 'faction', '세력전', 'PVP'], desc: '플레이어 간 전투(PvP)·진영 대립·대규모 공성. 협력 일변도를 깨고 인간 대 인간의 정치·배신 드라마를 연다.', tip: '"믿었던 동료의 PK 배신"은 데스게임/현실 침공형에서 무게가 가장 큰 반전.' },
      { name: '경매장·거래·상인', tags: ['auction', '경매', '거래', '상인', '시세'], desc: '아이템 시세·경매·상점. 정보(시세)를 아는 자가 부를 쌓는 경제 콘텐츠. 회귀/지식형의 일확천금 무대.', tip: '"폭락 직전에 팔고 폭등 직전에 산다"는 미래지식 사이다의 경제판 버전.' },
    ],
  },
  {
    key: 'archetype', label: '인물·역할 유형', icon: '🧑‍🤝‍🧑',
    note: '장르가 즐겨 쓰는 캐릭터 원형. 빌드·역할·동기가 곧 정체성.',
    items: [
      { name: '회귀자·플레이어', tags: ['regressor', '회귀자', '플레이어'], desc: '결과를 아는 자. 공략·미래·죽을 사람을 안다. 정보 우위가 곧 능력. 감정(미리 겪은 상실)이 동기의 깊이를 준다.', tip: '"이미 알기에 더 괴로운" 회귀자의 정서를 살리면 사이다에 무게가 실린다.' },
      { name: 'F급/약자 출신 주인공', tags: ['F급', '약자', '하위랭커', '각성실패'], desc: '최약체로 시작해 무시·멸시당하다 특별함을 얻어 역전. 한국 장르의 표준 오프닝 비트("억울한 현실 → 각성").', tip: '초반 굴욕은 후반 사이다의 채권 — 갚을 대상(무시한 자)을 명확히 심어둬라.' },
      { name: '생산직·생활 플레이어', tags: ['생산직', '대장장이', '연금술사', '노가다'], desc: '전투 대신 제작·채집·요리·건축으로 성장(달빛조각사형). 노가다·일확천금·경제 서사의 주역.', tip: '"전투직이 무시하던 생산직이 핵심 변수"가 되는 역전이 이 유형의 사이다.' },
      { name: '시스템/안내자(도깨비형)', tags: ['도깨비', '안내자', '관리자NPC'], desc: '인격을 가진 시스템·진행자. 규칙을 설명하고 시나리오를 강제하며, 비밀의 화자가 된다. 적도 아군도 아닌 변수.', tip: '안내자의 "변덕/규칙 위반 신호"는 시스템 배후 떡밥의 핵심 사인.' },
      { name: 'NPC가 자아를 얻다', tags: ['NPC', '오버로드', '자아', '동료'], desc: '게임 종료/시스템 변화 후 NPC가 살아 움직인다(오버로드형). 도구였던 존재가 인격·충성·배신의 드라마 주체가 됨.', tip: '"NPC가 진짜 살아있음"을 주인공이 깨닫는 순간이 윤리적 전환점.' },
      { name: '라이벌 랭커·먼치킨 빌런', tags: ['rival', '라이벌', '빌런', '먼치킨'], desc: '주인공을 압박하는 강자. 같은 시스템 안의 "규칙적 강함"이라야 설득력. 넘어설 때 성장의 척도가 된다.', tip: '빌런도 시스템 규칙을 지켜야 "사기여도 공정"의 신뢰가 유지된다.' },
      { name: '히든 클래스 보유자', tags: ['히든클래스', '유니크', '특별함'], desc: '남들 없는 직업·스킬·칭호를 가진 자. 특별함의 화신. 그 정당화(자격·조건·대가)가 캐릭터 신뢰를 좌우.', tip: '특별함에 "대가/제약"을 붙이면 먼치킨이 입체적 인물로 산다.' },
    ],
  },
  {
    key: 'pitfall', label: '함정·금기(작법)', icon: '⚠️',
    note: '장르 관습을 어겼을 때 독자가 떠나는 지점. 도구로 미리 점검할 항목들.',
    items: [
      { name: '규칙 임의 변경', tags: ['규칙위반', '데우스엑스마키나', '치트'], desc: '위기 때마다 작가가 새 규칙·새 힘을 즉석에서 만들면 신뢰 붕괴. "사기여도 규칙 안에서 사기여야 한다".', tip: '역전의 변수는 반드시 사전 복선으로 깔아두고 회수하라.' },
      { name: '성장 빠짐(보상 누락)', tags: ['보상누락', '성장정체', '페이싱'], desc: '여러 화 동안 수치·보상·다음 목표가 갱신되지 않으면 LitRPG의 추진력이 죽는다.', tip: '체크리스트: "이번 화에 성장(수치)·보상·다음 목표 중 최소 1개가 갱신됐는가?"' },
      { name: '고구마 과다(답답함)', tags: ['고구마', '답답함', '사이다부족'], desc: '무시·억울함·오해가 너무 길면 독자가 이탈. 한국 웹소설은 "고구마 최소, 사이다 극대" 리듬이 생명.', tip: '굴욕(고구마)은 빠르게, 보상(사이다)은 확실하게 — 채권은 반드시 회수.' },
      { name: '파워 인플레 피로', tags: ['파워인플레', '둔감화', '숫자인플레'], desc: '연속 전투·끝없는 숫자 상승으로 보상이 둔감해지는 현상. 변주(신지역·신시스템·라이벌) 없이 반복하면 지친다.', tip: '단위 리셋·상대평가(랭킹)·질적 보상으로 둔감화를 끊어라.' },
      { name: '튜토리얼 과부하', tags: ['설정과다', '튜토리얼', '진입장벽'], desc: '초반에 규칙·설정을 한꺼번에 쏟으면 진입 장벽. 온보딩은 "필요한 순간에 조금씩".', tip: '핵심 규칙 3~4개만 먼저, 나머지는 사건 속에서 자연 노출.' },
      { name: '안전지대 남용(긴장 소멸)', tags: ['안전지대', '긴장소멸', '데스게임'], desc: '데스게임/생존물에서 안전·부활·무제한 자원을 남발하면 죽음의 무게가 사라진다.', tip: '톤을 정했으면(영구사망/부활) 끝까지 일관되게 — 예외는 큰 대가와 함께만.' },
      { name: '시스템 떡밥 방치', tags: ['떡밥', '회수', '시스템배후'], desc: '"시스템은 왜 존재하나"를 깔아만 두고 회수 안 하면 후반 동력이 빠진다. 게임에서 우주적 음모로의 스케일업 실패.', tip: '중반부터 배후 단서를 점증시켜 클라이맥스에서 한 번에 회수.' },
    ],
  },
]

const LS = 'sry:tool:litrpg-knowledge:'
const ALL_KEY = '__all__'
const FAV_KEY = '__fav__'
const flatAll = (): { cat: CatDef; item: Entry }[] =>
  CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ─────────────────────────────────────────────────────────────────────────────
// 한국어 조사 보정 헬퍼 — 앞 글자 받침(종성)을 보고 실제 조사를 골라 출력.
// "을(를)" 같은 괄호 이중표기를 결과에 절대 노출하지 않는다.
// ─────────────────────────────────────────────────────────────────────────────
/** 마지막 글자가 한글이고 받침(종성)이 있으면 true. ㄹ받침 여부도 따로 본다. */
function hangulTail(word: string): { hasFinal: boolean; isRieul: boolean } {
  const ch = word.charCodeAt(word.length - 1)
  if (Number.isNaN(ch) || ch < 0xac00 || ch > 0xd7a3) return { hasFinal: false, isRieul: false }
  const fin = (ch - 0xac00) % 28 // 0이면 받침 없음
  return { hasFinal: fin !== 0, isRieul: fin === 8 }
}
/** 을/를 */
const eul = (w: string) => w + (hangulTail(w).hasFinal ? '을' : '를')
/** 이/가 */
const iga = (w: string) => w + (hangulTail(w).hasFinal ? '이' : '가')
/** 으로/로 (ㄹ받침은 '로') */
const euro = (w: string) => { const t = hangulTail(w); return w + (!t.hasFinal || t.isRieul ? '로' : '으로') }

// ─────────────────────────────────────────────────────────────────────────────
// 세계관 한 줄 설정(전제) 조합 생성기 — 슬롯 7개의 곱집합.
// 각 슬롯은 문법 역할이 고정되고 서로 독립적(다른 슬롯을 전제하지 않음)이라
// 곱집합으로 섞여도 의미 충돌 없이 "말이 되는" LitRPG 전제 한 문장을 만든다.
//   조합수 = 28 × 26 × 26 × 24 × 24 × 22 × 22 = 5,276,823,552 (>50억 + 옛값)
// 문장 틀:
//   [분기] 세계관에서, [주인공]이/가 [시스템]을/를 무기 삼아 [성장동력](으)로 거듭나며,
//   [무대]에서 [목표]을/를 두고 [종결].
// ─────────────────────────────────────────────────────────────────────────────
/** s1 분기·모드 — 명사구(세계관 종류). 뒤에 "세계관에서"가 붙는다. (28) */
const G_BRANCH = [
  'VR 다이브', '로그아웃 불가의 데스게임', '게임 시스템이 깔린 이세계', '상태창이 강림한 현실',
  '한 층씩 오르는 무한의 탑', '주인공이 곧 코어인 던전', '회귀로 다시 시작된', '원작을 다 읽은 회귀',
  '게이트가 열린 현대 도시', '신들이 운영하는 시험장', '멸망 직전의 종말물', '시간이 역행하는',
  '꿈과 현실이 뒤섞인', '죽으면 처음으로 돌아가는', '레벨이 곧 신분인 계급제', '코인이 권력인 시나리오 강제',
  '몬스터가 일상이 된', '플레이어만 살아남은', '가상과 실제의 환율이 붙은', '신화가 재가동된',
  '버그가 현실을 침식하는', '튜토리얼이 영원히 끝나지 않는', '직업 각성이 운명을 가르는',
  '랭킹이 모든 것을 정하는', '히든 피스로 가득한', '재능이 수치로 측정되는', '차원이 융합된',
  '관리자에게 감시당하는',
]
/** s2 주인공 유형 — 명사(주어). 이/가 붙는다. (26) */
const G_HERO = [
  '최약체 F급 각성자', '미래를 아는 회귀자', '원작을 기억하는 독자', '버려졌던 막내 헌터',
  '전투를 못하는 생산직', '히든 클래스를 얻은 신입', '시스템의 버그를 쥔 자', '몰락한 명문가의 후예',
  '재능 없다 무시받던 청년', '죽음을 두려워 않는 폐인', '치트를 거머쥔 평범한 회사원', '천재라 불리다 추락한 랭커',
  '기억을 잃은 옛 영웅', '계약으로 묶인 소환사', '저주받은 핏줄의 검사', '운만 비정상적으로 높은 자',
  '암살자 출신의 은퇴자', '신에게 점찍힌 사도', '복수만 남은 생존자', '평판이 바닥인 악명 높은 자',
  '튜토리얼을 끝낸 1세대 각성자', '남들 못 보는 정보창을 가진 자', '한 번 죽었다 돌아온 자',
  '길드에서 내쳐진 보조 직업자', '숫자 너머를 읽는 분석가', '규칙의 빈틈을 노리는 책략가',
]
/** s3 시스템 핵심 — 명사(목적어). 을/를 붙는다. (26) */
const G_SYSTEM = [
  '남들에게 안 보이는 히든 스탯', '0.01% 확률을 뒤집는 행운', '결과를 미리 아는 공략 지식', '죽기 직전 깨어나는 한계 돌파',
  '무엇이든 베끼는 모방 스킬', '경험치를 두 배로 먹는 특성', '실패해도 파괴되지 않는 강화', '유일직업 고유의 권능',
  '시스템 메시지의 숨은 떡밥', '상태이상을 되돌리는 해제기', '쿨다운이 없는 반칙기', '스킬을 합성하는 연계 권한',
  '드랍률을 끌어올리는 칭호', '봉인이 풀린 고대 신물', '레벨 캡을 무시하는 편법', '관리자 권한의 일부',
  '죽음마저 자원으로 바꾸는 능력', '시나리오 보상을 독점하는 자격', '아무도 모르는 히든 퀘스트', '세트 효과를 완성한 풀세트',
  '적의 약점을 꿰뚫는 감정안', '경고 페널티를 역이용하는 술수', '인벤토리 안의 비장의 한 수',
  '랜덤 옵션을 원하는 대로 뽑는 손', '버그로 열린 금지된 루트', '시스템이 인정한 첫 클리어 특권',
]
/** s4 성장 동력 — 명사. 으로/로 붙는다. (24) */
const G_GROWTH = [
  '끝없는 노가다', '치밀한 빌드 설계', '목숨을 건 사냥', '미래지식을 쓴 선점',
  '스킬 콤보의 숙련', '히든 던전 공략', '경매장 시세 차익', '동료와의 연계 전술',
  '실패를 거듭한 강화 도박', '보스의 첫 처치', '전직 퀘스트의 돌파', '약점 속성의 공략',
  '스탯 올인의 극단', '정보 우위의 선수', '생산·제작의 축적', '한계 돌파의 반복',
  '랭킹전의 실전 경험', '시나리오 코인의 누적', '죽음을 무릅쓴 던전 러시', '히든 클래스의 각성',
  '세력전에서의 무공', '버그 루트의 선점', '연계 퀘스트의 완수', '도박 같은 한 방',
]
/** s5 무대 — 명사(장소). "에서"가 붙는다. (24) */
const G_STAGE = [
  '폭주 직전의 게이트', '아무도 못 깬 히든 던전', '랭커들이 모인 최상층', '몬스터가 쏟아진 도심',
  '안전지대 없는 데스 필드', '신이 마련한 시험의 방', '길드전이 벌어진 공성장', '경매장이 들끓는 거점 도시',
  '봉인이 풀린 고대 유적', '브레이크가 임박한 균열', '전 서버가 주목한 레이드', '낮은 레벨대의 외딴 사냥터',
  '관리자가 숨겨둔 비밀 층', '진영이 충돌하는 경계지', '첫 클리어가 걸린 신규 던전', '환율이 요동치는 시장',
  '리스폰이 봉인된 최종 구역', '튜토리얼이 끝나는 관문', '먼치킨 빌런이 군림하는 영역', '회귀 전 무너졌던 도시',
  '시나리오가 강제된 무대', '광폭화 타이머가 도는 보스룸', '명문 길드의 본거지', '차원이 겹친 틈새 공간',
]
/** s6 목표·갈등 — 명사구(목적). 을/를 붙는다. (22) */
const G_GOAL = [
  '무시당한 과거의 설욕', '동료를 살릴 마지막 기회', '시스템의 배후 진실', '세계 최초 클리어의 영광',
  '잃었던 핏줄의 복수', '랭킹 1위의 자리', '봉인된 신물의 회수', '멸망을 막을 단 하나의 단서',
  '대형 길드의 콧대 꺾기', '회귀 전 죽은 이의 생존', '관리자를 끌어내릴 약점', '금지된 히든 직업의 해금',
  '폭주 게이트의 봉쇄', '먼치킨 빌런의 타도', '전 서버 공지에 새길 이름', '경매장을 뒤흔들 한탕',
  '잃어버린 기억의 복원', '시나리오 보상의 독식', '약자들의 안전한 피난처', '신에게 진 빚의 청산',
  '무너진 길드의 재건', '진영 전쟁의 승리',
]
/** s7 종결 — 완결된 서술(종결문). 그대로 문장 끝에 온다. (22) */
const G_END = [
  '판을 통째로 뒤집는다.', '모두의 예상을 산산이 깨부순다.', '끝내 정점에 선다.', '아무도 못 본 길을 연다.',
  '한순간에 전세를 역전시킨다.', '무시하던 자들을 무릎 꿇린다.', '운명을 제 손으로 다시 쓴다.', '불가능을 가능으로 바꾼다.',
  '세계의 규칙을 새로 정한다.', '잿더미 위에서 다시 일어선다.', '모든 빚을 한 번에 갚는다.', '전설로 이름을 남긴다.',
  '한계를 넘어 새 경지에 닿는다.', '적의 심장을 정확히 노린다.', '숨겨진 진실을 끝내 파헤친다.', '판도를 자기 쪽으로 끌어온다.',
  '벼랑 끝에서 승리를 거머쥔다.', '모든 것을 걸고 마지막 수를 둔다.', '약자의 반란을 완성한다.', '신의 계획마저 비틀어 버린다.',
  '잊혀졌던 영웅으로 부활한다.', '끝까지 살아남아 모든 걸 차지한다.',
]
/** 슬롯 풀 메타(화면 표시·곱 계산용). 고유 항목만. */
const PREMISE_SLOTS: { label: string; pool: string[] }[] = [
  { label: '분기·모드', pool: G_BRANCH },
  { label: '주인공', pool: G_HERO },
  { label: '시스템 핵심', pool: G_SYSTEM },
  { label: '성장 동력', pool: G_GROWTH },
  { label: '무대', pool: G_STAGE },
  { label: '목표·갈등', pool: G_GOAL },
  { label: '종결', pool: G_END },
]
/** 슬롯 풀 크기의 곱(= 한 전제 문장의 조합 가짓수). */
const PREMISE_COMBOS = PREMISE_SLOTS.reduce((p, s) => p * s.pool.length, 1)
/** 무작위 전제 문장 1개 생성 — 조사 보정 적용, 괄호 이중표기 없음. */
function buildPremise(): string {
  const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]
  const s1 = pick(G_BRANCH), s2 = pick(G_HERO), s3 = pick(G_SYSTEM)
  const s4 = pick(G_GROWTH), s5 = pick(G_STAGE), s6 = pick(G_GOAL), s7 = pick(G_END)
  return `${s1} 세계관에서, ${iga(s2)} ${eul(s3)} 무기 삼아 ${euro(s4)} 거듭나며, ` +
    `${s5}에서 ${eul(s6)} 두고 ${s7}`
}

// 관련 LitRPG 도구(연계 버튼). 같은 장르 스위트의 형제 도구 id.
const RELATED: { id: string; label: string }[] = [
  { id: 'litrpg-status-gen', label: '상태창 생성기' },
  { id: 'litrpg-skill-gen', label: '스킬·아이템 생성기' },
  { id: 'litrpg-system-msg', label: '시스템 메시지 작성기' },
  { id: 'litrpg-quest-gen', label: '퀘스트 생성기' },
]

export default function LitrpgKnowledge({ payload }: { payload?: Record<string, unknown> }) {
  const genre = typeof payload?.genre === 'string' ? (payload.genre as string) : '게임판타지·LitRPG'

  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || raw === FAV_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 펼침 상태(카테고리별)
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'open')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o }
    } catch { /* ignore */ }
    return { [CATS[0].key]: true }
  })
  // 즐겨찾기: "catKey::name"
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o }
    } catch { /* ignore */ }
    return {}
  })
  const [random, setRandom] = useState<{ cat: CatDef; item: Entry } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string>('')

  const toastTimer = useRef<number | null>(null)
  const copyTimer = useRef<number | null>(null)

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'open', JSON.stringify(open)) } catch { /* ignore */ } }, [open])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  // 언마운트 정리
  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
  }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  // 조합수: '세계관 한 줄 설정 조합 생성기'가 한 전제 문장을 만들 때 곱해지는
  // 슬롯 7개 풀 크기의 곱(고유 항목만). 28×26×26×24×24×22×22 = 5,276,823,552.
  // 각 슬롯은 문법 역할이 고정·상호 독립이라 곱집합으로 섞여도 의미가 충돌하지 않는다.
  const combos = PREMISE_COMBOS
  // 무작위 전제 문장(슬롯 곱집합의 한 결과)
  const [premise, setPremise] = useState<string>('')
  const rollPremise = useCallback(() => { setPremise(buildPremise()) }, [])
  const comboText = useMemo(() => {
    if (!isFinite(combos)) return '천문학적'
    if (combos >= 1e12) return (combos / 1e12).toFixed(combos >= 1e13 ? 0 : 1) + '조'
    if (combos >= 1e8) return (combos / 1e8).toFixed(combos >= 1e9 ? 0 : 1) + '억'
    return Math.round(combos).toLocaleString('ko-KR')
  }, [combos])

  const favKey = (catKey: string, name: string) => `${catKey}::${name}`

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2200)
  }, [])

  const copy = useCallback((text: string, id: string) => {
    if (!text) return
    const done = () => {
      setCopiedKey(id)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1400)
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
    } else fallbackCopy(text, done)
  }, [])

  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      done()
    } catch { showToast('복사 실패 — 직접 선택하세요') }
  }

  const toggleFav = (catKey: string, name: string) => {
    const k = favKey(catKey, name)
    setFavs((prev) => { const next = { ...prev }; if (next[k]) delete next[k]; else next[k] = true; return next })
  }

  // 검색·필터 결과(카테고리별 그룹 유지 — 펼침 탐색용)
  const ql = query.trim().toLowerCase()
  const matches = useCallback((e: Entry) => {
    if (!ql) return true
    if (e.name.toLowerCase().includes(ql) || e.desc.toLowerCase().includes(ql)) return true
    if (e.tip && e.tip.toLowerCase().includes(ql)) return true
    if (e.tags && e.tags.some((t) => t.toLowerCase().includes(ql))) return true
    return false
  }, [ql])

  const grouped = useMemo(() => {
    let base = CATS
    if (cat !== ALL_KEY && cat !== FAV_KEY) base = CATS.filter((c) => c.key === cat)
    return base.map((c) => ({
      cat: c,
      items: c.items.filter((it) => {
        if (cat === FAV_KEY && !favs[favKey(c.key, it.name)]) return false
        return matches(it)
      }),
    })).filter((g) => g.items.length > 0 || (!ql && cat !== FAV_KEY))
  }, [cat, ql, matches, favs])

  const shownCount = useMemo(() => grouped.reduce((n, g) => n + g.items.length, 0), [grouped])

  const rollRandom = useCallback(() => {
    const pool = (cat === ALL_KEY || cat === FAV_KEY)
      ? (cat === FAV_KEY ? flatAll().filter((x) => favs[favKey(x.cat.key, x.item.name)]) : flatAll())
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (!pool.length) { setRandom(null); showToast('무작위로 뽑을 항목이 없습니다.'); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.name === prev.item.name && pick.cat.key === prev.cat.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      // 펼침: 뽑힌 카테고리를 펼쳐 위치를 보여줌
      setOpen((o) => ({ ...o, [pick.cat.key]: true }))
      return pick
    })
  }, [cat, favs, showToast])

  const entryText = (c: CatDef, it: Entry) =>
    `${c.icon} ${c.label} · ${it.name}\n${it.desc}` + (it.tip ? `\n[활용] ${it.tip}` : '')

  // 라이브러리(스니펫) 저장 — 생성 글감
  const saveSnippet = (c: CatDef, it: Entry) => {
    addToLibrary('snippets', {
      text: entryText(c, it),
      source: 'LitRPG 지식 사전 · ' + c.label,
      tags: ['게임판타지·LitRPG', c.label, ...(it.tags || [])],
    })
    showToast(`스니펫 저장: ${it.name}`)
  }

  // 프로젝트 자료에 추가
  const addCurrentToProject = (c: CatDef, it: Entry) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(c.icon + ' ' + c.label)} · ${escapeHtml(it.name)}</b></p>`,
      `<p>${escapeHtml(it.desc)}</p>`,
      it.tags && it.tags.length ? `<p style="color:#888">키워드: ${escapeHtml(it.tags.join(', '))}</p>` : '',
      it.tip ? `<p><b>활용 팁</b><br>${escapeHtml(it.tip)}</p>` : '',
      `<p style="color:#888">출처: LitRPG 지식 사전 · 장르 ${escapeHtml(genre)}</p>`,
    ].filter(Boolean).join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: 'LitRPG 설정',
      title: `${it.name} (${c.label})`, bodyHtml,
    })
    if (id) showToast(`프로젝트 자료 〈LitRPG 설정〉에 '${it.name}' 추가됨`)
  }

  // 카테고리 묶음(현재 표시 중인 카테고리 전체)을 한 문서로 프로젝트에 추가
  const addCategoryToProject = (g: { cat: CatDef; items: Entry[] }) => {
    if (!hasProjectBridge() || !g.items.length) return
    const bodyHtml = [
      `<p style="color:#888">${escapeHtml(g.cat.note)}</p>`,
      ...g.items.map((it) =>
        `<p><b>${escapeHtml(it.name)}</b> — ${escapeHtml(it.desc)}` +
        (it.tip ? `<br><i>활용: ${escapeHtml(it.tip)}</i>` : '') + `</p>`),
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: 'LitRPG 설정',
      title: `${g.cat.label} 모음 (${g.items.length}개)`, bodyHtml,
    })
    if (id) showToast(`〈${g.cat.label}〉 ${g.items.length}개를 프로젝트 자료에 추가`)
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>{genre}</b> 장르의 소재·설정·고증 <b>{total}개</b>를 {CATS.length}개 카테고리로 모았습니다.
        검색·펼침으로 찾고, 클릭 복사·무작위·프로젝트 추가로 바로 쓰세요. 세계관 전제 조합 <b>{comboText}</b>가지(슬롯 7개 곱집합).
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="표제어·풀이·키워드로 검색 (예: 회귀, 히든, 강화, 데스게임, RNG)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="✨"/> 전체
        </button>
        <button className="minibtn" onClick={() => setCat(FAV_KEY)} aria-pressed={cat === FAV_KEY}
          style={{ borderColor: cat === FAV_KEY ? 'var(--accent)' : 'var(--border)', color: cat === FAV_KEY ? 'var(--text)' : 'var(--muted)' }}>
          ★ 즐겨찾기
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={c.icon}/> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 무작위 소재</button>
        <button className="minibtn" onClick={rollPremise} style={{ flex: '0 0 auto' }}
          title={`슬롯 7개를 곱집합으로 조합해 LitRPG 전제 한 문장을 생성 (${comboText}가지)`}>
          <Emoji e="🧩"/> 전제 한 줄 생성
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{shownCount}개 표시</span>
      </div>

      {/* 전제(설정 한 줄) 조합 결과 */}
      {premise && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e="🧩"/> 세계관 전제 조합 ({comboText}가지)</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setPremise('')}>✕</button>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.65, margin: '6px 0' }}>{premise}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={rollPremise}><Emoji e="🎲"/> 다시 굴리기</button>
            <button className="minibtn" onClick={() => copy(premise, 'premise')}>
              {copiedKey === 'premise' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={() => { addToLibrary('snippets', { text: premise, source: 'LitRPG 지식 사전 · 세계관 전제 조합', tags: ['게임판타지·LitRPG', '전제', '로그라인'] }); showToast('전제 스니펫 저장') }}>
              <Emoji e="💾"/> 스니펫 저장
            </button>
            {hasProjectBridge() && (
              <button className="minibtn" onClick={() => { const id = addToProject({ kind: 'text', root: 'research', folder: 'LitRPG 설정', title: '세계관 전제 (조합)', bodyHtml: `<p>${escapeHtml(premise)}</p>` }); if (id) showToast('프로젝트 자료에 전제 추가됨') }}>
                <Emoji e="📄"/> 프로젝트
              </button>
            )}
          </div>
        </div>
      )}

      {/* 무작위 결과 카드 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon}/> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0' }}>{random.item.desc}</div>
          {random.item.tip && (
            <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--accent)' }}><Emoji e="💡"/> {random.item.tip}</div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(entryText(random.cat, random.item), 'rand')}>
              {copiedKey === 'rand' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={() => saveSnippet(random.cat, random.item)}><Emoji e="💾"/> 스니펫 저장</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>
              {favs[favKey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => addCurrentToProject(random.cat, random.item)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '프로젝트 자료 〈LitRPG 설정〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            {RELATED.map((r) => (
              <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre, seed: random.item.name })}>
                <Emoji e="🔗"/> {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>
          ✓ {toast}
        </div>
      )}

      {/* 펼침 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {grouped.length === 0 || shownCount === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {cat === FAV_KEY ? '☆ 아직 즐겨찾기한 소재가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : grouped.map((g) => {
          // 검색 중이거나 즐겨찾기/단일 카테고리면 자동 펼침
          const expanded = !!ql || cat === FAV_KEY || cat !== ALL_KEY || open[g.cat.key]
          return (
            <div key={g.cat.key} style={card}>
              <div
                onClick={() => { if (!ql && cat === ALL_KEY) setOpen((o) => ({ ...o, [g.cat.key]: !o[g.cat.key] })) }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: (!ql && cat === ALL_KEY) ? 'pointer' : 'default' }}
              >
                <span style={{ fontSize: 15 }}><Emoji e={g.cat.icon}/></span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{g.cat.label}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{g.items.length}</span>
                {!ql && cat === ALL_KEY && (
                  <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 12 }}>{expanded ? '▾' : '▸'}</span>
                )}
                {(cat !== ALL_KEY || ql) && hasProjectBridge() && g.items.length > 0 && (
                  <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={(e) => { e.stopPropagation(); addCategoryToProject(g) }}
                    title="이 카테고리 표시 항목 전체를 프로젝트 자료에 추가"><Emoji e="📄"/> 묶음 추가</button>
                )}
              </div>
              {expanded && (
                <>
                  <div style={{ ...hint, margin: '6px 0 2px' }}>{g.cat.note}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    {g.items.map((it) => {
                      const fk = favKey(g.cat.key, it.name)
                      const isFav = !!favs[fk]
                      const copyId = 'item:' + fk
                      return (
                        <div key={fk} style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                            <span
                              style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                              title="클릭하여 표제어 복사"
                              onClick={() => copy(it.name, 'name:' + fk)}
                            >
                              {it.name}{copiedKey === 'name:' + fk ? ' ✓' : ''}
                            </span>
                            <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                              onClick={() => toggleFav(g.cat.key, it.name)}
                              style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                              {isFav ? '★' : '☆'}
                            </button>
                          </div>
                          <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 4 }}>{it.desc}</div>
                          {it.tip && <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--accent)', marginTop: 3 }}><Emoji e="💡"/> {it.tip}</div>}
                          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                            <button className="minibtn" onClick={() => copy(entryText(g.cat, it), copyId)}>
                              {copiedKey === copyId ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
                            </button>
                            <button className="minibtn" onClick={() => saveSnippet(g.cat, it)}><Emoji e="💾"/> 스니펫</button>
                            {hasProjectBridge() && (
                              <button className="minibtn" onClick={() => addCurrentToProject(g.cat, it)}><Emoji e="📄"/> 프로젝트</button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      <div style={hint}>
        소재는 정답이 아니라 출발점입니다. 분기·관습을 고르고 함정을 피해 자기 세계관 규칙으로 비틀어 쓰세요.
      </div>
    </div>
  )
}
