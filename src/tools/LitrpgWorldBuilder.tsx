// 게임판타지·LitRPG 세계관 빌더 — '시스템(System)'이 깔린 세계를 세우기 위한 설정 항목을 도시에에 근거해 질문·입력으로 구조화한다.
//  · 좌측: 설정 섹션(분기·계보 / 시스템 규칙 / 성장·스탯 / 직업·스킬 / 등급·아이템 / 퀘스트·던전 / 시스템의 배후 / 함정 점검) 탐색.
//  · 우측: 섹션별 안내 질문 + 자유 입력. 각 질문에는 LitRPG 도시에 기반 '예시 칩'(클릭 채우기/복사)과 무작위 추천.
//  · 상단: '시스템 세계 자동 생성기' — 슬롯 풀에서 무작위 조합(잠금/재생성), 조합수 표시(1조 이상). 생성한 골격은 본문에 반영하거나 글감/장소 라이브러리로 보낼 수 있다.
//  · 연계: 📄 프로젝트에 추가(자료 › 세계관), 라이브러리(스니펫/장소), 관련 도구 열기. payload.genre 활용.
// 규칙: react 와 './linkbus' 만 import. 모든 데이터는 localStorage('sry:tool:litrpg-worldbuilder')에 JSON 자동 저장/복원. 언마운트 정리.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  addToProject,
  hasProjectBridge,
  addToLibrary,
  openToolLinked,
  Emoji,
  emojify,
} from './linkbus'

export const meta = { id: 'litrpg-worldbuilder', name: '게임판타지·LitRPG 세계관 빌더', icon: '🎮', group: '세계관', genre: '게임판타지·LitRPG', intro: '분기·시스템 규칙·성장·직업·등급·퀘스트·시스템의 배후를 질문으로 구조화하는 설정 바이블', w: 760, h: 660 }

const LS_KEY = 'sry:tool:litrpg-worldbuilder'

// ───────────────────────── 설정 스키마(도시에 근거) ─────────────────────────
// 각 섹션은 안내 질문(필드)들로 구성. 필드마다 도움말 + 예시 칩(게임판타지·LitRPG 특화·구체적).
interface Field {
  key: string
  label: string
  ph: string        // placeholder/도움말
  hint?: string     // 한 줄 작법 조언
  chips: string[]   // 클릭하면 입력에 채워지는(또는 이어붙는) 장르 특화 예시
  big?: boolean     // 긴 입력칸
}
interface Section {
  key: string
  icon: string
  label: string
  blurb: string
  fields: Field[]
}

const SECTIONS: Section[] = [
  {
    key: 'branch',
    icon: '🚪',
    label: '분기·계보·톤',
    blurb: '가장 먼저 4분기(VR 다이브 / 갇힘·데스게임 / 이세계 전이+시스템 / 현실 침공)를 못박아야 로그아웃 유무·죽음의 무게·페이싱이 자동으로 갈린다. 모방·변주할 계보도 함께 정해두면 관습 세트가 정렬된다.',
    fields: [
      {
        key: 'mode', label: '핵심 분기(첫 선택지)', ph: 'VR 다이브 / 갇힘·데스게임 / 이세계 전이+시스템 / 현실 침공(시스템 아포칼립스) 중 무엇인가',
        hint: '이 한 줄이 로그아웃 안전지대·영구사망·현실 이중구조의 유무를 결정한다. 가장 먼저 못박자.',
        chips: [
          'VR 다이브형 — 현실의 인간이 가상현실 게임에 접속(달빛조각사·로열로드). 로그아웃·현실 생활 묘사 존재',
          '갇힘·데스게임형 — 게임에서 못 나오고, 죽으면 진짜 죽는다(소드 아트 온라인). 긴장도 최상, 안전지대 묘사 금지',
          '이세계 전이+시스템형 — 다른 세계로 넘어갔는데 그 세계에 게임 시스템이 깔려 있다(나 혼자만 레벨업). 로그아웃 개념 없음',
          '현실 침공형(시스템 아포칼립스) — 어느 날 현실에 상태창·던전·게이트가 생긴다(전지적 독자 시점 구조). 헌터물과 강하게 겹침',
        ],
      },
      {
        key: 'lineage', label: '계보·모방할 결', ph: '어느 대표작의 문법을 따를지(달빛조각사형 경제·생산 / SAO형 데스게임 긴장 / 전독시형 메타·정보전 / 솔로레벨링형 단독 시스템)',
        hint: '계보에 따라 톤·관습·보상 리듬이 자동 정렬된다. 한 줄로 못박자.',
        chips: [
          '달빛조각사형 — 생산직·노가다·일확천금, 게임 성과의 현실 환금. 경제·길드 운영이 서사의 축',
          'SAO형 데스게임 — 로그아웃 불가, 죽음=현실 사망. 층(floor) 공략과 생존의 긴장',
          '전독시형 메타·정보전 — "원작을 다 읽은 독자"의 미래지식, 시나리오·코인·도깨비(시스템 화자)',
          '솔로레벨링형 — 나만 보이는 단독 시스템 창, F급→최강의 가파른 성장, 그림자군단식 고유 능력',
          '오버로드형 — 게임 종료 후 캐릭터로 전이, NPC가 살아 움직이는 세계',
          '로그 호라이즌형 — 갇힘 + 게임 세계의 사회·경제 시뮬레이션 구축',
        ],
      },
      {
        key: 'reality', label: '현실↔게임 이중구조', ph: '로그아웃이 되는가, 현실 생활이 묘사되는가, 게임 성과가 현실 지위·재화로 환산되는가',
        hint: '분기별로 다르다. VR형은 현실 묘사 필수, 데스게임·전이형은 현실 단절이 긴장의 원천.',
        chips: [
          '게임 성과의 현금화 — 게임 내 재화·아이템이 현실 돈이 되고, 랭커는 현실 유명인이 된다',
          '로그아웃 후의 일상 — 현실의 빈곤·사회적 약자가 게임 속에서만 누군가가 된다',
          '현실 단절 — 로그아웃 불가, 게임 안의 시간만이 유일한 현실이 된다',
          '능력의 현실 전이 — 현실 침공형: 게임 능력(스탯·스킬)이 현실 권력·생존력이 된다',
        ],
      },
      {
        key: 'theme', label: '핵심 테마·질문', ph: '수치 너머에 이 작품이 끝내 묻는 것(강함의 의미 / 인간성과 시스템 / 현실의 가치 / 자유의지)',
        hint: '레벨업 너머의 한 문장이 작품을 기억하게 만든다.',
        chips: [
          '시스템이 부여한 강함은 정말 \'나\'의 것인가 — 능력과 자아의 거리',
          '게임 속 죽음에도 무게가 있는가 — 데스게임의 윤리',
          '수치로 환산되지 않는 것(우정·현실·존엄)은 무엇인가',
          '정해진 시나리오 안에서 자유의지는 가능한가 — 메타·운명 테마',
        ],
      },
    ],
  },
  {
    key: 'system',
    icon: '📟',
    label: '시스템 규칙·일관성',
    blurb: '시스템은 단순 소재가 아니라 서사의 엔진이다. 규칙은 명시되고 공정해야 한다("사기여도 규칙 안에서 사기"). 작가가 임의로 어기면 독자가 반발한다. 상태창의 표기·화자·범위를 먼저 정하라.',
    fields: [
      {
        key: 'origin', label: '시스템의 형태·정체', ph: '상태창은 누구에게 보이는가(전체/나만), 어떤 모습인가, 시스템은 인격을 가진 존재인가',
        hint: '\'나만 보이는 단독 시스템\'은 주인공 특별화의 강력한 장치. 화자형 시스템(도깨비·관리자)은 세계관 비밀의 입이 된다.',
        chips: [
          '나만 보이는 단독 시스템 창 — 세상 누구도 못 보는 상태창이 주인공에게만 떴다(솔로레벨링형)',
          '세계 전체에 깔린 공용 시스템 — 모든 각성자/플레이어가 자기 상태창을 본다',
          '인격을 가진 시스템 — \'시스템\'·도깨비·관리자 AI가 말을 걸고 안내하며, 세계의 비밀을 쥐고 있다',
          '튜토리얼 안내자 — 초반 규칙을 알려주는 가이드 AI가 점차 그 정체가 떡밥이 된다',
        ],
      },
      {
        key: 'message', label: '시스템 메시지 표기 규칙', ph: '본문에 어떤 형식으로 팝업을 띄울지([ ]·< >·굵게·구분선), 메시지의 어투·문체',
        hint: '서술을 멈추고 \'팝업\'을 띄워 호흡을 끊는 연출 자체가 장르의 멋. 표기 규칙을 통일하라.',
        chips: [
          '[ 띵! ] 형 — 효과음 의성어 + 대괄호로 시스템 알림을 시각 분리',
          '< 시스템 > 형 — 꺾쇠와 구분선으로 박스를 만들어 본문과 구별',
          '무미건조한 기계 어투 — "획득하였습니다." 식 정중·건조체로 시스템의 비인간성을 강조',
          '반말·장난스러운 화자 — 도깨비처럼 인격적이고 능청스러운 안내 멘트',
        ],
      },
      {
        key: 'fairness', label: '규칙의 일관성·공정성', ph: '시스템 규칙은 어디까지 명시되며, 주인공의 \'사기\'는 어떻게 규칙 안에서 정당화되는가',
        hint: '먼치킨이어도 규칙 안에서 사기여야 한다. 데우스 엑스 마키나식 임의 변경은 독자 신뢰를 깨뜨린다.',
        chips: [
          '명시된 규칙 — 스탯·스킬·확률이 수치로 공개되어 독자가 검증할 수 있다',
          '히든 규칙의 해금 — 숨은 규칙은 \'조건 충족\' 메시지로 공정하게 드러난다',
          '주인공만의 합법적 어드밴티지 — 남들도 쓸 수 있으나 주인공만 그 활용법을 안다',
          '시스템도 룰을 따른다 — 시스템조차 어길 수 없는 상위 법칙이 후반 떡밥이 된다',
        ],
      },
      {
        key: 'death', label: '죽음·부활·페널티 규칙', ph: '죽으면 어떻게 되는가(부활/경험치·아이템 손실/영구사망), 세이브·리스폰·디버프의 규칙',
        hint: '부활 규칙이 장르 톤을 결정한다. 데스게임이면 영구사망, VR형이면 손실 페널티.',
        chips: [
          '영구사망 — 게임 속 죽음이 현실의 죽음(데스게임형). 모든 전투가 진짜다',
          '리스폰 + 손실 — 부활하되 경험치·아이템·레벨을 잃어 죽음이 뼈아프다',
          '페널티 디버프 — 사망 후 일정 기간 능력치 하락·접속 제한',
          '횟수 제한 부활 — 목숨이 자원이 되어, 남은 부활 수가 곧 긴장 게이지',
        ],
      },
    ],
  },
  {
    key: 'growth',
    icon: '📈',
    label: '성장·레벨·스탯',
    blurb: '성장의 가시화(숫자로 확인하는 강해짐)는 장르의 심장이다. 레벨업·스탯 분배·경험치 루프를 설계하되, 후반 수치 인플레를 막을 장치도 함께 박아야 긴장이 산다.',
    fields: [
      {
        key: 'stat', label: '스탯·레벨 체계', ph: '어떤 스탯이 있고(힘·민첩·지능·체력·행운…), 레벨업 시 포인트를 어떻게 배분하는가',
        hint: '스탯 분배는 곧 캐릭터성이다. 빌드 정체성(깡스탯/마법/잠입)이 선택의 쾌감을 만든다.',
        chips: [
          '근력·민첩·체력·지능·감각·행운 6스탯 — 레벨업마다 자유 분배 포인트 획득',
          '깡스탯 vs 효율 빌드 — 한 스탯에 몰빵하거나 시너지를 노리는 최적화의 머리싸움',
          '히든 스탯(행운·매력·카르마) — 남들 모르는 숨은 수치가 분기·드랍률을 바꾼다',
          '스탯 상한·전직 해금 — 일정 스탯을 찍어야 상위 직업·스킬이 열린다',
        ],
      },
      {
        key: 'exp', label: '경험치·코어 루프', ph: '경험치는 어떻게 얻는가(사냥/퀘스트/업적), 사냥→경험치→레벨업→더 센 사냥의 반복 루프 설계',
        hint: '코어 루프가 지루해지지 않게 신지역·신시스템·라이벌을 주기적으로 투입하라.',
        chips: [
          '사냥→경험치/드랍→레벨업→더 센 사냥 — 반복 보상 루프(코어 루프)',
          '퀘스트·업적 경험치 — 전투 외 행동(생산·탐험·최초 달성)으로도 성장',
          '경험치 효율 격차 — 같은 몹도 누가 어떻게 잡느냐로 효율이 갈리는 \'노가다 최적화\'',
          '레벨 디버프 — 과한 레벨 차 사냥은 경험치 페널티로 정직한 단계를 강제',
        ],
      },
      {
        key: 'special', label: '주인공의 특별함·어드밴티지', ph: '주인공만의 히든 클래스·유니크 스킬·단독 시스템·회귀 지식 등 \'특별함\'의 원천',
        hint: '남들 못 가진 직업/칭호/스킬을 얻는 특별함은 독자의 핵심 욕망. 단, 대가·제약을 붙여라.',
        chips: [
          '회귀+게임지식 — 이미 결과를 아는 자가 공략·미래를 무기로 삼는다(사이다 양산기)',
          '단독 성장형 스킬 — 남들과 다른 규칙으로 무한 성장하는 고유 능력(레벨업·복제·흡수)',
          '히든 클래스 — 조건을 충족한 단 한 명만 전직할 수 있는 유니크 직업',
          '시스템의 총애 — 어떤 이유로 시스템이 주인공에게만 특혜·히든 퀘스트를 준다',
        ],
      },
      {
        key: 'curve', label: '성장 곡선·페이싱', ph: '약자에서 최강까지의 단계와, 회차/장당 비트. 전투·성장 70% : 휴식·관계·세계관 30% 황금비',
        hint: '나선형 반복(강화→더 강한 적→강화)이 곧 플롯 곡선. 챕터마다 성장(수치)·보상·다음 목표 중 하나는 갱신하라.',
        chips: [
          '나선형 성장 — 약한 시작→단계적 강화→더 강한 적→재강화의 반복, 챕터마다 미세 보상',
          '사이클 비트 — 무시받음→도발→압도적 반격→주변의 경악(사이다 리듬)',
          '파워 게이팅 — 마을→필드→던전→레이드→상위 지역, 각 구획에 자격 게이트',
          '중반 최저점 — 배신·동료의 죽음·정체 폭로로 추락 후 진각성',
        ],
      },
    ],
  },
  {
    key: 'class',
    icon: '🗡️',
    label: '직업·스킬·전직',
    blurb: '클래스/직업과 스킬 트리는 빌드의 묘미다. 전직 퀘스트는 작은 아크 단위가 되고, 히든·유니크 클래스는 주인공 특별화의 단골. 스킬은 이름이 아니라 시너지·콤보·제약으로 굴려라.',
    fields: [
      {
        key: 'classes', label: '직업 체계·전직', ph: '기본 직업군(전사·마법사·궁수·도적·성직자…)과 전직·상위 직업·히든 클래스의 구조',
        hint: '전직 퀘스트를 작은 아크로 쓰면 좋다. 직업마다 \'못 하는 것\'(약점)을 줘 균형을 잡자.',
        chips: [
          '기본 4직업 + 전직 트리 — 전사·마법사·도적·성직자에서 1·2차 전직으로 분화',
          '히든·유니크 클래스 — 특정 조건·아이템·퀘스트로만 열리는 단 하나의 직업',
          '생산·비전투 직업 — 대장장이·연금술사·조각사·요리사가 경제와 서사를 굴린다(달빛조각사형)',
          '전직 퀘스트 — 직업 각성에 시련·시험이 따르는 작은 아크',
        ],
      },
      {
        key: 'skill', label: '스킬 트리·시너지', ph: '스킬 습득 조건, 액티브/패시브, 연계기(콤보)와 시너지, 스킬 진화·각성·상위 스킬',
        hint: '스킬은 멋진 이름이 아니라 \'무엇을 푸는 수\'다. 콤보·상성·제약으로 전투를 머리싸움으로.',
        chips: [
          '액티브/패시브 구분 + 연계기(콤보) — 스킬 조합으로 폭딜·CC가 터지는 시너지',
          '스킬 진화·각성 — 숙련도가 차면 상위 스킬로 진화하거나 히든 옵션이 열린다',
          '습득 조건 — 스승·스킬북·특정 행동 반복 등 스킬마다 다른 해금 경로',
          '스킬 상성표 — 어떤 스킬이 어떤 적/상태를 카운터하는지 가위바위보 설계',
        ],
      },
      {
        key: 'resource', label: '자원·쿨다운·상태이상', ph: 'MP·스태미나 등 자원 관리, 강력기의 쿨다운, 중독·기절·출혈·화상 등 상태이상과 지속시간',
        hint: '"강력기는 쿨이 길다"는 제약이 전투를 전술 게임으로 만든다. 상태이상은 변수다.',
        chips: [
          'MP·스태미나 — 강력기는 자원을 크게 먹어 난사할 수 없다',
          '쿨다운 — 필살기는 긴 쿨로 \'언제 쓸지\'가 승부의 머리싸움',
          '상태이상 — 중독·기절·출혈·화상·빙결과 지속시간, 해제·면역의 변수',
          '버프/디버프 — 시간제한 강화·약화가 전투 타이밍을 지배',
        ],
      },
      {
        key: 'title', label: '칭호·업적 시스템', ph: '업적으로 얻는 칭호, 칭호의 버프·해금 조건, \'최초 달성(First Clear)\' 보너스',
        hint: '칭호는 특별함의 수치화. \'최초 달성\' 보너스가 경쟁·선점의 동기가 된다.',
        chips: [
          '최초 달성(First Clear) — 던전·업적을 가장 먼저 깬 자에게만 주는 유니크 칭호·보상',
          '버프형 칭호 — 칭호 장착 시 스탯·확률 보너스를 주는 능동 자원',
          '히든 업적 — 의외의 행동으로 해금되는 숨은 칭호가 분기·소문을 만든다',
          '악명·평판 칭호 — \'학살자\'·\'배신자\' 등 부정적 칭호의 페널티와 서사',
        ],
      },
    ],
  },
  {
    key: 'item',
    icon: '💎',
    label: '등급·아이템·인벤토리',
    blurb: '등급(레어리티) 체계는 아이템·스킬·몬스터·던전을 가로지르는 공통 측정자다. 루팅(개봉)의 쾌감, 강화·인챈트의 도박성, 세트 효과가 보상 설계의 핵심. 인벤토리·무게 제약도 변수다.',
    fields: [
      {
        key: 'tier', label: '등급·레어리티 체계', ph: '커먼→언커먼→레어→에픽→유니크→레전더리→미스릭 식 색상·등급. 어디까지 존재하고 무엇이 희소한가',
        hint: '등급은 공통 측정자다. 색상·이름·상한을 통일하고, 최상위 등급의 의미를 흐리지 마라.',
        chips: [
          '7등급 — 커먼·언커먼·레어·에픽·유니크·레전더리·미스릭(신화)으로 색상 구분',
          '유니크의 의미 — 세상에 단 하나뿐인 등급, 소유 자체가 사건이 된다',
          '등급 인플레 방지 — 레전더리 이상은 작품 전체에 손에 꼽게 등장',
          '등급의 횡단 적용 — 같은 등급 체계가 아이템·스킬·몬스터·던전에 일관 적용',
        ],
      },
      {
        key: 'loot', label: '드랍·루팅·확률(RNG)', ph: '드랍률·확률(RNG)이 어떻게 긴장 장치가 되는가, 보스 처치 후 \'개봉\'의 연출',
        hint: '드랍을 까보는 개봉(unboxing) 긴장이 보상감의 핵심. 확률은 서사적 도박이다.',
        chips: [
          '보스 드랍 개봉 — 잡고 나서 무엇이 떨어지는지 까보는 긴장과 환호/탄식',
          '낮은 확률의 대박 — 0.01% 드랍을 뽑아내는 \'행운\'이 서사를 흔든다',
          '확률의 잔혹함 — 강화 실패로 장비가 파괴되는 도박성 RNG',
          '드랍 테이블 공개 — 무엇이 어떤 확률로 떨어지는지 알려진 정보전',
        ],
      },
      {
        key: 'enhance', label: '강화·인챈트·옵션', ph: '강화 성공/실패·장비 파괴, 인챈트·소켓·랜덤 옵션(옵션 뽑기의 도박성), 세트 효과',
        hint: '강화 실패로 장비가 깨지는 긴장, 랜덤 옵션 뽑기의 도박성이 보상 루프를 자극한다.',
        chips: [
          '강화 +1~+15 — 단계가 오를수록 성공률이 떨어지고 실패 시 파괴 위험',
          '랜덤 옵션 뽑기 — 같은 아이템도 붙는 옵션이 달라 \'리롤\'의 도박',
          '세트 효과 — 같은 세트를 모으면 추가 보너스가 터지는 수집 동기',
          '소켓·인챈트 — 보석·룬을 박아 능력을 커스텀하는 빌드의 변수',
        ],
      },
      {
        key: 'inventory', label: '인벤토리·아이템 제약', ph: '무게/슬롯 제한, 소모품·재료·퀘스트 아이템 분류, 거래·경매·현금화',
        hint: '제약(무게·슬롯)이 선택을 만든다. 거래·경매는 경제와 갈등의 무대다.',
        chips: [
          '무게·슬롯 제한 — 무엇을 챙기고 버릴지가 매 순간의 선택',
          '아공간 인벤토리 — 사실상 무제한이라 보급·생산형 플레이가 가능',
          '경매장·거래 — 희귀템을 둘러싼 입찰·사기·시세 조작의 경제 갈등',
          '귀속 아이템 — 거래 불가로 묶여 직접 쟁취해야만 하는 보상',
        ],
      },
    ],
  },
  {
    key: 'quest',
    icon: '🗺️',
    label: '퀘스트·던전·랭킹',
    blurb: '에피소드 단위가 던전·레이드·퀘스트·랭킹전 한 덩어리다. 히든·연계 퀘스트는 플롯 분기점이 되고, 실패 페널티가 긴장을 만든다. 랭킹·길드·평판은 사회적 인정의 수치화.',
    fields: [
      {
        key: 'quest', label: '퀘스트 체계', ph: '메인/서브/히든/연계 퀘스트, 실패 페널티, 히든·연계 퀘스트가 플롯 분기점이 되는 구조',
        hint: '히든·연계 퀘스트가 분기점이다. 실패 페널티가 있어야 수락에 무게가 실린다.',
        chips: [
          '메인·서브·히든·연계 — 히든 퀘스트가 유니크 보상·플롯 분기로 이어진다',
          '실패 페널티 — 시간 제한·디버프·평판 하락이 걸린 \'거절할 수 없는\' 의뢰',
          '히든 발동 조건 — 특정 NPC·행동·아이템으로만 열리는 숨은 의뢰',
          '연계 퀘스트 — 한 의뢰의 결말이 다음 의뢰를 여는 사슬형 아크',
        ],
      },
      {
        key: 'dungeon', label: '던전·게이트·레이드', ph: '던전/게이트의 등급·난이도, 입장 자격, 레이드 보스의 패턴, 첫 클리어 보상',
        hint: '보스 레이드는 전형적 클라이맥스 단위: 패턴 파악→전멸 위기→역전 변수의 3박자.',
        chips: [
          '던전 등급(D~S·SSS) — 등급별 난이도와 입장 제한, 등급이 곧 위험·보상의 척도',
          '게이트·브레이크 — 현실 침공형: 게이트가 터지면 몬스터가 현실로 쏟아진다',
          '레이드 보스 패턴 — 페이즈·광폭화·기믹을 공략하는 머리싸움',
          '히든 던전·최초 공략 — 아무도 모르는 던전을 처음 깨는 선점의 보상',
        ],
      },
      {
        key: 'rank', label: '랭킹·길드·평판', ph: '랭커·순위표·명성, 길드의 운영·정치, 평판이 어떻게 사회적 인정으로 수치화되는가',
        hint: '랭킹·평판은 사회적 인정의 수치화이자 경쟁의 엔진. 길드는 경제·정치의 무대.',
        chips: [
          '랭커·순위표 — 공식 랭킹이 사회적 지위·후원·표적이 된다',
          '길드 운영 — 가입·정치·전쟁·경제, 길드전이 거대 갈등 단위',
          '명성·악명 — 행적이 평판으로 쌓여 NPC 반응·상점 가격·퀘스트를 바꾼다',
          '랭킹전·콜로세움 — 플레이어 간 공식 대결로 서열을 가린다',
        ],
      },
      {
        key: 'economy', label: '경제·NPC·세계 시뮬레이션', ph: '재화·상점·생산·거래의 흐름, NPC의 자율성(살아 움직이는가), 게임 세계의 사회 구축',
        hint: '로그 호라이즌·오버로드형은 \'게임 세계의 사회·경제 시뮬레이션\'이 매력. NPC에 생명을 줄지 결정하라.',
        chips: [
          '살아 움직이는 NPC — 오버로드형: NPC가 자아·감정을 갖고 독자적으로 행동',
          '플레이어 경제 — 생산·유통·시세가 도는 자급 경제(달빛조각사·로그 호라이즌형)',
          '도시·세력 운영 — 마을·길드 영지를 키우고 통치하는 경영 시뮬레이션',
          '재화 환율 — 게임 골드↔현실 돈, 또는 시나리오 코인 같은 특수 재화',
        ],
      },
    ],
  },
  {
    key: 'mystery',
    icon: '🔮',
    label: '시스템의 배후·세계 비밀',
    blurb: '후반부의 메인 떡밥은 "이 시스템은 왜 존재하나, 누가 만들었나"다. 단순 게임에서 우주적 음모로 스케일업하는 장치. 시스템의 의도·관리자·탑의 주인을 미리 설계해 복선을 깔아라.',
    fields: [
      {
        key: 'maker', label: '시스템의 창조자·의도', ph: '시스템은 누가·왜 만들었는가(신/관리자/외계존재/탑의 주인), 그 진짜 목적은 무엇인가',
        hint: '단순 게임에서 우주적 음모로 스케일업하는 핵심 떡밥. 초반부터 작은 복선을 심어라.',
        chips: [
          '신·초월적 존재 — 시스템은 신이 인류를 시험·선별하기 위해 내린 장치',
          '관리자·운영자 — 게임 너머의 \'운영자\'가 데이터·플레이어를 관찰·조작한다',
          '외계·차원 침략 — 시스템은 다른 차원이 이 세계를 \'사냥터\'로 등록한 결과',
          '탑·차원의 주인 — 끝없는 탑을 오르게 만든 존재가 정점에서 기다린다',
        ],
      },
      {
        key: 'truth', label: '세계의 진실·반전 떡밥', ph: '게임/세계의 정체에 관한 숨은 진실과, 그것이 드러날 반전 떡밥',
        hint: '"이 세계는 무엇인가"의 반전. 폭로 시점과 파장을 미리 설계하라.',
        chips: [
          '이 세계가 진짜 — 게임인 줄 알았으나 실은 진짜 세계/멸망한 미래였다',
          '주인공이 핵심 변수 — 시스템·시나리오가 본래 주인공을 중심으로 설계되었다',
          '시스템은 방패였다 — 적인 줄 알았던 시스템이 더 큰 재앙을 막는 장치였다',
          '회귀·반복의 진실 — 세계는 이미 수없이 반복됐고 누군가 루프를 돌리고 있다',
        ],
      },
      {
        key: 'endgame', label: '엔드게임·최종 목표', ph: '시스템이 제시하는 최종 목표(클리어 조건/탑 정상/시스템 파괴), 그 너머의 결말',
        hint: '단기(레벨)·중기(던전)·장기(시스템의 끝) 목표가 동시에 굴러야 한다. 최종 목표를 정하라.',
        chips: [
          '게임 클리어 — 최종 보스/마지막 층을 깨면 모두가 풀려난다(데스게임형)',
          '탑의 정상 — 끝없는 탑을 끝까지 올라 그 주인과 마주한다',
          '시스템 파괴·해방 — 시스템 자체를 부수거나 규칙을 다시 쓰는 것이 진엔딩',
          '세계 구원 — 침공·멸망을 막아내는 것이 최종 목표(현실 침공형)',
        ],
      },
      {
        key: 'climax', label: '클라이맥스 관습', ph: '정점의 전투를 어떻게 닫을지(한계 돌파·각성 / 히든스킬 / 동료 희생 / 시스템 메시지 역전)',
        hint: '"패턴 파악→전멸 위기→역전 변수"의 3박자. 한계 돌파는 \'조건 충족\' 메시지로 정당화하라.',
        chips: [
          '한계 돌파(Limit Break) — 죽기 직전 새 스킬 각성, "[조건 충족]" 메시지로 역전을 정당화',
          '히든스킬·아이템 — 숨겨둔 한 수가 패턴 파악 후 전멸 위기를 뒤집는다',
          '동료의 희생 — 누군가의 대가로 만들어내는 역전과 그 무게',
          '시스템 개입·반전 — 시스템 메시지가 판을 뒤집는 변수가 되어 클라이맥스를 닫는다',
        ],
      },
    ],
  },
  {
    key: 'pitfall',
    icon: '🚧',
    label: '함정 점검',
    blurb: '게임판타지·LitRPG가 흔히 빠지는 덫을 미리 체크한다. 설계 단계에서 막아두면 후반에 무너지지 않는다.',
    fields: [
      {
        key: 'inflation', label: '수치 인플레이션 방지책', ph: '후반 숫자가 커져 보상이 둔해지지 않도록 단위 리셋·상대평가·질적 보상을 어떻게 마련했는가',
        hint: '수치 인플레는 후반 긴장 약화의 1순위 원인. 단위 리셋·랭킹·고유 능력으로 보완하라.',
        chips: [
          '단위 리셋 — 차원·등급 개편으로 숫자를 한 번 접고 새 스케일을 연다',
          '상대평가(랭킹) — 절대 수치보다 \'몇 위인가\'로 강함을 체감시킨다',
          '질적 보상 — 더 큰 숫자가 아니라 새로운 고유 능력·규칙으로 보상한다',
          '강함의 대가 — 수치만 키우지 않고 부작용·제약을 함께 부여',
        ],
      },
      {
        key: 'consistency', label: '시스템 일관성 점검', ph: '규칙을 임의로 어기지 않았는가, 주인공의 \'사기\'가 규칙 안에서 정당한가',
        hint: '데우스 엑스 마키나식 규칙 변경은 독자 신뢰를 깨뜨린다. 사기여도 규칙 안에서 사기여야 한다.',
        chips: [
          '핵심 규칙을 문서로 못박고, 전개 중 어기지 않는다',
          '주인공의 어드밴티지는 \'설명 가능\'해야 한다(우연·특혜 남발 금지)',
          '새 능력 등장 시 반드시 \'통하지 않는\' 장면을 한 번은 넣어 균형',
          '확률·드랍은 미리 제시한 범위 안에서 굴린다',
        ],
      },
      {
        key: 'pacing', label: '페이싱·독자 계약 점검', ph: '성장(수치)·보상·다음 목표 갱신이 끊기지 않는가, 사이다 남발·고구마 과다가 아닌가',
        hint: '이번 화에 성장·보상·다음 목표 중 최소 하나가 갱신됐는지 점검. 연속 전투만 이어지면 보상 둔감화.',
        chips: [
          '회차/장마다 성장·보상·다음 훅 중 최소 하나는 닫는다',
          '전투·성장 70% : 휴식·관계·세계관 30% 황금비를 의식한다',
          '사이다 사이에 \'질 수도 있다\'는 긴장을 의도적으로 배치',
          '고구마(답답함)는 짧게, 사이다는 명확하게 — 무시→증명→응징의 리듬',
        ],
      },
      {
        key: 'tutorial', label: '튜토리얼·온보딩 점검', ph: '규칙 학습(튜토리얼)이 독자 온보딩과 겸하는가, 설명 과다로 늘어지지 않는가',
        hint: '튜토리얼 구간은 곧 독자 온보딩이다. 규칙을 사건 속에서 자연스럽게 가르쳐라.',
        chips: [
          '규칙은 설명이 아니라 사건으로 보여준다(첫 전투·첫 죽음·첫 레벨업)',
          '상태창 첫 등장에 핵심 규칙을 압축해 깔되, 한 번에 쏟지 않는다',
          '첫 특별함 획득(히든 클래스·유니크 스킬)을 튜토리얼 끝에 배치해 훅을 건다',
          '낯선 용어는 처음 등장 시 한 줄로 풀어 진입장벽을 낮춘다',
        ],
      },
    ],
  },
]

// ───────────────────────── 시스템 세계 자동 생성기 슬롯 풀 ─────────────────────────
// 슬롯 12개. 각 풀 16개. 조합수 = 각 풀 크기의 곱 = 16^12 ≈ 2.81×10^14 (이전 14^12 ≈ 5.67×10^13 에서 +2.2×10^14 증가) → 핵심 생성기 1조 이상 충족.
// (정확한 수치는 런타임에 combos = 모든 풀 크기의 곱으로 계산해 화면에 표기한다.)
interface Slot { key: string; label: string; icon: string; pool: string[] }
const SLOTS: Slot[] = [
  {
    key: 'mode', label: '핵심 분기', icon: '🚪', pool: [
      'VR 다이브형 — 풀다이브 캡슐로 접속하는 차세대 가상현실 MMORPG, 로그아웃과 현실이 공존한다',
      '갇힘·데스게임형 — 로그아웃이 봉인되고 게임 속 죽음이 곧 현실의 죽음이 되었다',
      '이세계 전이+시스템형 — 다른 세계로 떨어졌는데 그 세계에 게임 같은 시스템이 깔려 있다',
      '현실 침공형 — 어느 날 하늘에 균열이 열리고 현실에 상태창·던전·게이트가 생겨났다',
      'VR+현실 동기화형 — 게임 속 행위가 현실에 영향을 미치는 위험한 연동 게임',
      '데스게임 탈출형 — 갇힌 자들이 클리어만이 유일한 탈출구임을 깨닫고 층을 오른다',
      '전이 회귀형 — 죽었다가 시스템이 깔린 세계의 과거로 회귀해 다시 시작한다',
      '시스템 아포칼립스형 — 인류 대부분이 죽고 살아남은 각성자만이 게이트와 싸운다',
      '게임 종료 전이형 — 서비스 종료 직전, 캐릭터째로 그 세계로 빨려 들어갔다',
      '튜토리얼 강제 소환형 — 인류 전원이 시스템의 \'튜토리얼\'에 강제로 입장당했다',
      '꿈·가상 이중세계형 — 잠들면 시스템이 깔린 또 다른 세계에서 깨어난다',
      'AR 침투형 — 증강현실 게임이 현실과 겹쳐지며 몬스터가 거리로 나온다',
      '클로즈드 베타 갇힘형 — 비공개 테스트 서버에 소수의 인원이 통째로 갇혔다',
      '구원형 전이 — 멸망을 막기 위해 시스템이 선택한 자들을 다른 세계로 불러들였다',
      '귀환형 — 다른 세계에서 산전수전 겪고 시스템째로 현실로 돌아온 자의 이야기',
      '강제 길드 소집형 — 어느 날 모든 인간이 진영·길드로 나뉘어 시스템 전쟁에 징집되었다',
    ],
  },
  {
    key: 'lineage', label: '계보·톤', icon: '📖', pool: [
      '달빛조각사형 — 생산·노가다·경제와 일확천금, 게임 성과의 현실 환금이 서사의 축',
      'SAO형 데스게임 — 로그아웃 불가, 죽음의 무게가 모든 전투를 진짜로 만든다',
      '전독시형 메타·정보전 — 미래/원작 지식과 시나리오·코인·도깨비(시스템 화자)',
      '솔로레벨링형 — 나만 보이는 단독 시스템, F급→최강의 가파른 성장과 고유 군단',
      '오버로드형 — 캐릭터로 전이, 살아 움직이는 NPC와 절대자의 군림',
      '로그 호라이즌형 — 갇힘 + 게임 세계의 사회·경제 시뮬레이션 구축',
      '코노스바형 — 시스템·클리셰를 비트는 코미디·패러디 톤',
      'Cradle형 수행 위계 — 수치적 경지 사다리를 오르는 성장 위계의 쾌감',
      'Dungeon Crawler Carl형 — 잔혹하고 부조리한 데스게임 쇼, 블랙코미디 해설',
      '회귀 게임지식형 — 결과를 아는 자가 공략을 무기로 삼는 사이다 양산',
      '헌터물 융합형 — 각성·길드·게이트가 상태창과 결합한 현실형 능력 배틀',
      'He Who Fights with Monsters형 — 위트 있는 1인칭, 스킬·등급 시스템의 정교한 운용',
      '방패 용사형 — 소환된 약자가 멸시를 딛고 스테이터스로 증명하는 역전',
      '나는 될 놈이다형 — 회귀·재능 각성으로 정해진 미래를 뒤집는 성장 드라마',
      '전생검신형 무협 융합 — 무공·내공이 시스템 스탯과 결합한 동양풍 성장 위계',
      'Worm·이능 진영형 — 능력자 진영 정치와 빌드 운용이 얽힌 치밀한 권능 배틀',
    ],
  },
  {
    key: 'system', label: '시스템의 형태', icon: '📟', pool: [
      '나에게만 보이는 단독 상태창이 떴다 — 세상 누구도 이 창을 보지 못한다',
      '세계 전체에 공용 시스템이 깔려 모두가 자기 상태창을 본다',
      '인격을 가진 시스템이 능청스럽게 말을 걸며 세계의 비밀을 쥐고 있다',
      '\'관리자\' AI가 규칙을 통보하고 플레이어를 차갑게 관찰한다',
      '도깨비·중개자 같은 화자가 시나리오와 보상을 제시한다',
      '음성 없는 메시지창만 뜨는 무미건조한 기계식 시스템',
      '튜토리얼 가이드가 안내하다가 점차 그 정체가 떡밥이 된다',
      '시스템이 \'퀘스트\'와 \'페널티\'로 인간을 길들이려 한다',
      '낡은 게임 UI 그대로 — 옛 RPG의 인터페이스가 현실에 덧씌워졌다',
      '시스템이 선별·등급을 매기며 인류를 \'플레이어\'와 \'NPC\'로 나눈다',
      '계약형 시스템 — 동의해야 능력을 주고, 어기면 가혹하게 회수한다',
      '예언·신탁형 — 시스템이 미래의 시나리오를 단편적으로 흘린다',
      '복수의 시스템이 충돌 — 서로 다른 규칙의 시스템이 패권을 다툰다',
      '주인공의 회귀와 함께 깨어난, 오직 그만 아는 \'두 번째\' 시스템',
      '상점·포인트형 시스템 — 업적으로 모은 포인트로 능력·아이템을 사는 거래식 인터페이스',
      '결함 있는 시스템 — 버그와 오류가 잦아, 그 틈을 읽는 자가 이득을 본다',
    ],
  },
  {
    key: 'special', label: '주인공의 특별함', icon: '⭐', pool: [
      '회귀+게임지식 — 이미 모든 결과를 아는 자가 공략을 무기로 삼는다',
      '단독 성장형 고유 스킬 — 남들과 다른 규칙으로 무한 성장하는 능력',
      '히든 클래스 전직 — 조건을 충족한 단 한 명만 얻는 유니크 직업',
      '능력 복제·흡수 — 적의 스킬·스탯을 빼앗아 자기 것으로 만든다',
      '시스템의 총애 — 어떤 이유로 시스템이 그에게만 히든 퀘스트·특혜를 준다',
      '죽음마다 강해지는 회귀 — 죽으면 되돌아오되 경험과 한 줌의 성장이 남는다',
      '소환·사역 계열 — 처치한 적을 부하·그림자로 되살려 군단을 만든다',
      '버그·이레귤러 — 시스템이 의도하지 않은 변수, 규칙의 틈을 파고드는 존재',
      '원작/미래를 아는 독자 — 이 세계가 그가 읽은 이야기임을 안다',
      '극악의 페널티를 짊어진 대신 무한 성장 잠재력을 얻은 직업',
      '감정·카르마를 수치로 다루는 히든 스탯의 주인',
      '제로에서 시작 — 모든 스탯이 0이라 무엇이든 될 수 있는 백지의 그릇',
      '시간 정지·되감기 같은 시스템 밖 권능을 한정적으로 쓴다',
      '두 직업을 겸하는 금지된 \'이중 클래스\'의 유일한 보유자',
      '성장 배율 특성 — 같은 행동으로 남보다 몇 배 빠르게 경험치·숙련도를 쌓는다',
      '시스템 메시지를 편집하는 권한 — 자신에게 뜨는 알림·판정을 일부 다시 쓸 수 있다',
    ],
  },
  {
    key: 'stat', label: '성장·스탯 체계', icon: '📈', pool: [
      '근력·민첩·체력·지능·감각·행운 6스탯, 레벨업마다 자유 분배 포인트',
      '깡스탯 몰빵 vs 시너지 효율, 빌드 정체성을 가르는 최적화의 싸움',
      '히든 스탯(행운·매력·카르마)이 드랍률과 분기를 은밀히 바꾼다',
      '스탯 상한과 전직 게이트 — 일정 수치를 찍어야 상위 직업이 열린다',
      '경지 위계형 — 등급(브론즈~미스릭)으로 강함을 단계화',
      '숙련도 기반 — 행동을 반복할수록 그 능력이 자라는 학습형 성장',
      '한계 돌파 시스템 — 정해진 상한을 시련으로 부수며 올라간다',
      '스탯=수명·자원 — 능력치를 쓸수록 다른 무언가를 소모하는 트레이드오프',
      '레벨 없는 칭호·업적 성장 — 행적이 곧 힘이 되는 비선형 성장',
      '코어·각인 시스템 — 몬스터 코어를 흡수해 능력을 새기는 성장',
      '재능 등급 — 타고난 \'재능 티어\'가 성장 속도의 천장을 정한다',
      '환생 누적형 — 전생의 성장이 일부 계승되어 출발선이 다르다',
      '파티 공유 성장 — 동료의 성장이 시너지로 본인에게도 돌아온다',
      '디버프 시작형 — 저주받은 마이너스 스탯에서 출발해 역설계로 강해진다',
      '특성·재능 트리 — 레벨업마다 분기형 특성을 찍어 빌드 정체성을 굳힌다',
      '위험 보상형 — 더 큰 위험을 감수할수록 더 많은 성장치를 주는 고위험 고성장 규칙',
    ],
  },
  {
    key: 'class', label: '직업·전직', icon: '🗡️', pool: [
      '기본 4직업(전사·마법사·도적·성직자)에서 1·2차 전직으로 분화',
      '히든·유니크 클래스 — 특정 조건·아이템·퀘스트로만 열리는 단 하나의 직업',
      '생산·비전투 직업(대장장이·연금술사·조각사)이 경제와 서사를 굴린다',
      '소환·사역 직업 — 정령·언데드·그림자를 부려 군단으로 싸운다',
      '암살·잠입 직업 — 은신·일격·정보전 중심의 그림자 플레이',
      '버퍼·서포터 직업 — 파티를 살리는 헌신형, 그러나 숨은 잠재력',
      '저주받은 직업 — 모두가 기피하나 극한의 보상을 숨긴 함정 직업',
      '탱커·수호자 직업 — 어그로와 방벽으로 레이드를 지탱한다',
      '원소 마법사 — 속성 상성과 영창·쿨다운을 운용하는 화력 직업',
      '궁수·레인저 — 거리·지형·정찰을 지배하는 견제형',
      '복합·이중 클래스 — 두 직업의 시너지로 정석을 깨는 빌드',
      '무직(無職)에서 각성 — 직업 없는 자가 끝내 전무후무한 클래스로 각성',
      '네크로맨서·강령술 — 죽음을 다루어 금기시되는 직업',
      '검사+마법의 마검사 — 근접과 마법을 겸하는 동경의 하이브리드',
      '음유시인·인챈터 — 노래·연주로 아군을 강화하고 적을 흔드는 변칙 지원 직업',
      '용기사·기수 — 탈것·소환수와 한 몸으로 싸우는 기동형 직업',
    ],
  },
  {
    key: 'skill', label: '핵심 스킬·시너지', icon: '✨', pool: [
      '액티브/패시브 연계기 — 스킬 조합으로 폭딜·CC가 터지는 시너지 빌드',
      '스킬 진화·각성 — 숙련도가 차면 상위 스킬로 진화하며 히든 옵션이 열린다',
      '상성 카운터 — 특정 적·상태를 정확히 깨는 가위바위보식 스킬 설계',
      '쿨다운·자원 관리 — 강력기는 쿨이 길고 자원을 크게 먹어 타이밍이 승부',
      '상태이상 운용 — 중독·기절·출혈·빙결을 거는 디버프 전술',
      '버프·각성기 — 시간제한 강화로 한 타이밍에 화력을 폭발시킨다',
      '광역기 vs 단일기 — 다수전과 보스전의 선택을 가르는 화력 분배',
      '자가희생형 스킬 — 큰 대가를 치르고 판을 뒤집는 최후의 한 수',
      '소환·분신 스킬 — 머릿수를 불려 전선을 장악',
      '회피·반격 패시브 — 맞을수록 강해지거나 되돌리는 카운터',
      '디스펠·정화 — 적의 버프·시스템 효과를 지우는 변수',
      '히든 콤보 — 특정 순서로만 발동하는 숨겨진 연계 필살기',
      '스택·중첩형 — 쌓을수록 폭발하는 누적 메커니즘',
      '시전 중단·심리전 — 영창을 끊고 빈틈을 노리는 무초승유초식 운용',
      '지형·환경 활용 — 함정·지형·날씨를 무기로 바꾸는 머리싸움형 스킬',
      '도트·지속 피해 — 즉발 대신 시간이 갈수록 쌓이는 출혈·맹독 압박 빌드',
    ],
  },
  {
    key: 'tier', label: '등급·아이템', icon: '💎', pool: [
      '7등급(커먼~미스릭) 색상 체계가 아이템·스킬·몬스터·던전을 가로지른다',
      '유니크 — 세상에 단 하나뿐인 등급, 소유 자체가 강호의 사건이 된다',
      '강화 +1~+15 — 단계가 오를수록 성공률이 떨어지고 실패 시 파괴 위험',
      '랜덤 옵션 뽑기 — 같은 아이템도 붙는 옵션이 달라 \'리롤\'의 도박',
      '세트 효과 — 같은 세트를 모으면 추가 보너스가 터지는 수집 동기',
      '보스 드랍 개봉 — 잡고 나서 무엇이 떨어지는지 까보는 환호와 탄식',
      '귀속 아이템 — 거래 불가로, 직접 쟁취해야만 하는 보상',
      '소켓·룬 — 보석·룬을 박아 능력을 커스텀하는 빌드 변수',
      '성장형 아이템 — 주인과 함께 자라며 스토리를 품은 무기',
      '봉인 아이템 — 조건을 풀어야 진가가 드러나는 잠긴 보물',
      '저주 아이템 — 강력하나 대가를 요구하는 양날의 검',
      '신화 등급(미스릭)은 작품 전체에 손에 꼽게만 등장한다',
      '경매장 시세 — 희귀템을 둘러싼 입찰·사기·시세 조작의 경제',
      '도면·레시피 — 제작으로만 얻는 생산 직업의 독점 자산',
      '소모성 한정 아이템 — 한 번 쓰면 사라지는 강력한 일회용 카드의 타이밍 싸움',
      '귀환·전이 아이템 — 위기에서 빠져나오거나 거점을 잇는 이동형 보물',
    ],
  },
  {
    key: 'quest', label: '퀘스트·던전', icon: '🗺️', pool: [
      '히든 퀘스트가 유니크 보상·플롯 분기로 이어진다',
      '연계 퀘스트 — 한 의뢰의 결말이 다음을 여는 사슬형 아크',
      '실패 페널티 — 시간 제한·디버프·평판 하락이 걸린 거절 불가의 의뢰',
      '던전 등급(D~SSS) — 등급이 곧 위험과 보상의 척도',
      '게이트 브레이크 — 게이트가 터지면 몬스터가 현실로 쏟아진다',
      '레이드 보스 패턴 — 페이즈·광폭화·기믹을 공략하는 머리싸움',
      '히든 던전 최초 공략 — 아무도 모르는 던전을 처음 깨는 선점 보상',
      '타임어택 던전 — 제한 시간 안에 깨야 보상이 커지는 압박',
      '생존형 웨이브 던전 — 끝없이 밀려오는 적을 버티는 소모전',
      '퍼즐·기믹 던전 — 전투보다 머리로 푸는 함정과 수수께끼',
      '시나리오·메인 퀘스트 — 거역하면 \'페널티\'가 떨어지는 강제 줄거리',
      '월드 보스 — 서버/세계 단위로 모두가 달려드는 거대 이벤트',
      '히든 보스 — 조건을 채운 자에게만 모습을 드러내는 숨은 강적',
      '클리어 보상 분배 — 기여도·랭킹에 따른 전리품 다툼',
      '에스코트·호위 퀘스트 — 약한 대상을 지키며 돌파해야 하는 변수 많은 의뢰',
      '연속 웨이브 공성전 — 거점을 두고 밀려오는 적을 막아내는 대규모 방어전',
    ],
  },
  {
    key: 'social', label: '랭킹·세력 구도', icon: '🏆', pool: [
      '공식 랭킹이 사회적 지위·후원·표적을 동시에 만든다',
      '거대 길드들의 패권 다툼과 길드전이 거대 갈등 단위가 된다',
      '명성·악명 평판이 NPC 반응·상점 가격·퀘스트 분기를 바꾼다',
      '헌터 협회/관리국이 각성자를 등급으로 통제한다',
      '신흥 세력이 기존 랭커 카르텔의 질서를 뒤흔든다',
      '랭킹전·콜로세움에서 플레이어들이 공식 서열을 가린다',
      'F급 취급받던 주인공이 숨은 실력으로 판을 뒤집는다',
      '국가·기업이 게이트와 던전 이권을 두고 충돌한다',
      '플레이어 경제가 도는 자급 사회(생산·유통·시세)',
      '도시·영지 운영 — 마을을 키우고 통치하는 경영 시뮬레이션',
      '살아 움직이는 NPC들이 자기 세력과 정치를 갖는다',
      '랭커 사냥꾼 — 강자만 노리는 PK·암살 세력의 그림자',
      '비밀 결사 — 시스템의 진실을 쫓는 지하 조직',
      '협력 불가 데스게임 — 모두가 잠재적 적인 만인의 투쟁',
      '신생 길드 창설 — 밑바닥에서 동료를 모아 자기 세력을 키워 올린다',
      '진영 대립 구도 — 인류와 몬스터, 혹은 두 거대 세력으로 갈린 전선의 정치',
    ],
  },
  {
    key: 'mystery', label: '시스템의 배후', icon: '🔮', pool: [
      '시스템은 신이 인류를 시험·선별하기 위해 내린 장치였다',
      '게임 너머의 \'관리자\'가 플레이어를 관찰·조작하고 있다',
      '시스템은 다른 차원이 이 세계를 \'사냥터\'로 등록한 결과다',
      '끝없는 탑을 오르게 만든 존재가 정점에서 기다린다',
      '게임인 줄 알았으나 실은 진짜 세계/멸망한 미래였다',
      '시스템·시나리오가 본래 주인공을 중심으로 설계되었다',
      '적인 줄 알았던 시스템이 더 큰 재앙을 막는 방패였다',
      '세계는 이미 수없이 반복됐고 누군가 루프를 돌리고 있다',
      '시스템은 죽어가는 세계가 짜낸 마지막 생존 프로그램이다',
      '인류는 더 강한 존재들의 \'양식\'으로 사육되고 있었다',
      '두 신/세력이 시스템을 두고 대리전을 벌이는 중이다',
      '시스템을 만든 자는 정작 그것에 갇힌 옛 플레이어였다',
      '예언 속 \'마지막 플레이어\'가 곧 시스템을 끝낼 열쇠다',
      '시스템의 진짜 목적은 \'후계자\'를 길러내는 것이었다',
      '시스템은 멸망한 문명이 남긴 자동화된 유산이 폭주한 것이다',
      '시스템은 인류의 집단 무의식이 빚어낸 거대한 꿈·시뮬레이션이다',
    ],
  },
  {
    key: 'climax', label: '정점의 결착·최종 목표', icon: '🎯', pool: [
      '죽기 직전 한계 돌파로 새 스킬을 각성, "[조건 충족]"으로 역전한다',
      '숨겨둔 히든스킬·아이템이 전멸 위기를 단숨에 뒤집는다',
      '동료의 희생을 발판 삼아 만들어내는 무거운 역전',
      '최종 보스가 사실 시스템의 창조자/옛 자신이었다는 폭로',
      '시스템 자체를 부수거나 규칙을 다시 써 세계를 해방한다',
      '끝없는 탑의 정상에서 그 주인과 마주하는 최후의 결전',
      '게임 클리어로 갇힌 모두를 풀어내고 현실로 돌아간다',
      '현실로 쏟아진 멸망의 군세를 막아내는 세계 구원',
      '회귀의 끝에서 이번엔 모두를 살리는 진엔딩을 그린다',
      '압도적 격차의 확인사살과 군중·적의 경악으로 닫는다',
      '시스템과의 마지막 \'계약\'을 역이용해 판을 엎는다',
      '랭킹 1위 결정전, 단 한 번의 대결로 모든 것을 건다',
      '세계를 다시 시작시키는 대가로 자신을 거는 희생적 결말',
      '강함의 끝에서 수치 너머의 한 사람·현실을 택하는 결말',
      '시스템을 부수는 대신 그 규칙을 물려받아 새 질서의 관리자가 된다',
      '최강에 오른 뒤 모든 권능을 내려놓고 평범한 일상으로 돌아가는 결말',
    ],
  },
]

// 천 단위 구분 표기(조합수)
function fmtNum(n: number): string {
  try { return n.toLocaleString('ko-KR') } catch { return String(n) }
}
// 큰 수 한국어 단위(억/조) 보조 표기
function koUnit(n: number): string {
  if (n >= 1e12) return `약 ${(n / 1e12).toFixed(n >= 1e13 ? 0 : 1)}조`
  if (n >= 1e8) return `약 ${(n / 1e8).toFixed(n >= 1e9 ? 0 : 1)}억`
  if (n >= 1e4) return `약 ${(n / 1e4).toFixed(0)}만`
  return fmtNum(n)
}

function randIdx(len: number): number {
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const a = new Uint32Array(1)
      crypto.getRandomValues(a)
      return a[0] % len
    }
  } catch {}
  return Math.floor(Math.random() * len)
}

// HTML 이스케이프(프로젝트 bodyHtml 용)
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

type Answers = Record<string, string>           // `${section}.${field}` → 값
type SkeletonState = Record<string, number>     // slot.key → 선택 인덱스
type LockState = Record<string, boolean>        // slot.key → 잠금

interface Store {
  answers: Answers
  skeleton: SkeletonState
  locks: LockState
  activeSection: string
}

function defaultSkeleton(): SkeletonState {
  const s: SkeletonState = {}
  for (const slot of SLOTS) s[slot.key] = randIdx(slot.pool.length)
  return s
}

function load(): Store {
  const base: Store = { answers: {}, skeleton: {}, locks: {}, activeSection: SECTIONS[0].key }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { ...base, skeleton: defaultSkeleton() }
    const p = JSON.parse(raw)
    const answers: Answers = {}
    if (p && p.answers && typeof p.answers === 'object') {
      for (const k of Object.keys(p.answers)) if (typeof p.answers[k] === 'string') answers[k] = p.answers[k]
    }
    const skeleton: SkeletonState = {}
    for (const slot of SLOTS) {
      const v = p?.skeleton?.[slot.key]
      skeleton[slot.key] = typeof v === 'number' && v >= 0 && v < slot.pool.length ? v : randIdx(slot.pool.length)
    }
    const locks: LockState = {}
    for (const slot of SLOTS) locks[slot.key] = !!p?.locks?.[slot.key]
    const activeSection = SECTIONS.some((s) => s.key === p?.activeSection) ? p.activeSection : SECTIONS[0].key
    return { answers, skeleton, locks, activeSection }
  } catch {
    return { ...base, skeleton: defaultSkeleton() }
  }
}

export default function LitrpgWorldBuilder({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState<Store>(() => load())
  const [query, setQuery] = useState('')
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')
  const [showSkeleton, setShowSkeleton] = useState(true)

  // ── 사용자 정의 항목 + 고정 '기타' 자유 입력 (additive) ──
  // 미리 만든 데이터가 없으므로 무작위 생성하지 않는다. 사용자가 직접 라벨/값을 적는다.
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')

  const addCustom = () => {
    const label = (window.prompt('추가할 항목의 이름을 입력하세요 (예: 세계의 화폐, 금기, 특수 규칙 등)') || '').trim()
    if (!label) return
    const id = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `c-${Date.now()}-${randIdx(1e9)}`
    setCustom((arr) => [...arr, { id, label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) => setCustom((arr) => arr.map((it) => (it.id === id ? { ...it, value } : it)))
  const removeCustom = (id: string) => setCustom((arr) => arr.filter((it) => it.id !== id))
  // 무작위 생성 시 사용자 정의 '값'과 '기타'는 비우되, 항목(라벨)은 유지한다.
  const clearCustomValues = () => {
    setCustom((arr) => arr.map((it) => ({ ...it, value: '' })))
    setEtc('')
  }
  // 다른 도구로 보낼 엔티티 fields 에 합칠, 값이 채워진 사용자 정의 항목 + 기타.
  const customFields = (): Record<string, string> => {
    const f: Record<string, string> = {}
    for (const it of custom) {
      const v = it.value.trim()
      const k = it.label.trim()
      if (v && k) f[k] = v
    }
    if (etc.trim()) f.etc = etc.trim()
    return f
  }
  // 복사/요약 텍스트용 — 채워진 사용자 정의 항목 + 기타를 줄 문자열로.
  const customText = (): string => {
    const lines: string[] = []
    for (const it of custom) {
      const v = it.value.trim()
      const k = it.label.trim()
      if (v && k) lines.push(`${k}: ${v}`)
    }
    if (etc.trim()) lines.push(`기타: ${etc.trim()}`)
    return lines.join('\n')
  }

  const mounted = useRef(true)
  const copyTimer = useRef<number | null>(null)
  const noteTimer = useRef<number | null>(null)

  // payload.genre — 다른(공통) 도구 동선에서 장르가 넘어오면 안내에 반영(LitRPG 전용 도구라 보조 용도).
  const genreHint = typeof payload?.genre === 'string' ? (payload.genre as string) : meta.genre

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (copyTimer.current) { clearTimeout(copyTimer.current); copyTimer.current = null }
      if (noteTimer.current) { clearTimeout(noteTimer.current); noteTimer.current = null }
    }
  }, [])

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(store))
    } catch {
      if (mounted.current) flashNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.')
    }
  }, [store])

  // 조합수 = 모든 슬롯 풀 크기의 곱
  const combos = useMemo(() => SLOTS.reduce((acc, s) => acc * s.pool.length, 1), [])

  const flashCopied = (msg: string) => {
    setCopied(msg)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => { if (mounted.current) setCopied('') }, 1600)
  }
  const flashNote = (msg: string) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => { if (mounted.current) setNote('') }, 4200)
  }

  const copyText = useCallback(async (text: string, okMsg: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      flashCopied(okMsg)
    } catch {
      flashCopied('복사 실패 — 직접 선택해 복사하세요.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 답안 입력 ──
  const fkey = (sec: string, field: string) => `${sec}.${field}`
  const getAns = (sec: string, field: string) => store.answers[fkey(sec, field)] || ''
  const setAns = (sec: string, field: string, value: string) => {
    setStore((s) => ({ ...s, answers: { ...s.answers, [fkey(sec, field)]: value } }))
  }
  // 예시 칩 → 입력에 채움(비어있으면 대체, 내용 있으면 줄바꿈으로 이어붙임)
  const applyChip = (sec: string, field: string, chip: string) => {
    setStore((s) => {
      const k = fkey(sec, field)
      const cur = s.answers[k] || ''
      const next = cur.trim() ? cur.replace(/\s*$/, '') + '\n' + chip : chip
      return { ...s, answers: { ...s.answers, [k]: next } }
    })
  }

  const setActiveSection = (key: string) => setStore((s) => ({ ...s, activeSection: key }))

  // ── 시스템 세계 골격 생성기 ──
  const rerollAll = () => {
    setStore((s) => {
      const next: SkeletonState = { ...s.skeleton }
      for (const slot of SLOTS) if (!s.locks[slot.key]) next[slot.key] = randIdx(slot.pool.length)
      return { ...s, skeleton: next }
    })
    // 무작위 재생성 시 사용자 정의 '값'과 '기타'를 비운다(항목 정의는 유지).
    clearCustomValues()
  }
  const rerollOne = (key: string) => {
    setStore((s) => ({ ...s, skeleton: { ...s.skeleton, [key]: randIdx(SLOTS.find((x) => x.key === key)!.pool.length) } }))
  }
  const toggleLock = (key: string) => {
    setStore((s) => ({ ...s, locks: { ...s.locks, [key]: !s.locks[key] } }))
  }

  const skeletonLines = (): { label: string; icon: string; text: string }[] =>
    SLOTS.map((slot) => ({ label: slot.label, icon: slot.icon, text: slot.pool[store.skeleton[slot.key] ?? 0] }))

  const skeletonText = (): string =>
    skeletonLines().map((l) => `${l.icon} ${l.label}: ${l.text}`).join('\n')

  const skeletonTitle = (): string => {
    // 분기 + 주인공의 특별함 앞머리를 제목 후보로
    const mode = SLOTS[0].pool[store.skeleton.mode ?? 0]
    const special = SLOTS[3].pool[store.skeleton.special ?? 0]
    return `시스템 세계 골격 — ${mode.split(/[—,(]/)[0].trim()} / ${special.split(/[—,(]/)[0].trim()}`
  }

  // 생성한 골격을 본문(섹션 답안)에 반영 — 슬롯을 대응 섹션 필드에 채운다(빈 필드는 대체, 내용 있으면 이어붙임).
  // skill·tier·quest·social 슬롯은 직접 대응 필드가 여럿이라 핵심 매핑만 반영한다.
  const SKELETON_MAP: Record<string, [string, string]> = {
    mode: ['branch', 'mode'],
    lineage: ['branch', 'lineage'],
    system: ['system', 'origin'],
    special: ['growth', 'special'],
    stat: ['growth', 'stat'],
    class: ['class', 'classes'],
    skill: ['class', 'skill'],
    tier: ['item', 'tier'],
    quest: ['quest', 'quest'],
    social: ['quest', 'rank'],
    mystery: ['mystery', 'maker'],
    climax: ['mystery', 'climax'],
  }
  const applySkeletonToAnswers = () => {
    setStore((s) => {
      const ans = { ...s.answers }
      let filled = 0
      for (const slot of SLOTS) {
        const dest = SKELETON_MAP[slot.key]
        if (!dest) continue
        const k = fkey(dest[0], dest[1])
        const text = slot.pool[s.skeleton[slot.key] ?? 0]
        ans[k] = (!ans[k] || !ans[k].trim()) ? text : ans[k].replace(/\s*$/, '') + '\n' + text
        filled++
      }
      window.setTimeout(() => { if (mounted.current) flashNote(`골격 ${filled}개 항목을 설정 본문에 반영했어요. (기존 입력은 아래에 이어붙임)`) }, 0)
      return { ...s, answers: ans }
    })
  }

  // 골격을 글감(스니펫) 라이브러리로
  const skeletonToLibrary = () => {
    addToLibrary('snippets', {
      text: skeletonTitle() + '\n\n' + skeletonText(),
      source: '게임판타지·LitRPG 세계관 빌더 · 시스템 세계 골격',
      tags: ['게임판타지', 'LitRPG', '세계관', '시스템골격'],
    })
    flashCopied('시스템 세계 골격을 글감 라이브러리에 담았어요')
  }

  // 골격의 '세계 무대'를 장소 라이브러리로(분기+계보 톤을 분위기로)
  const skeletonPlaceToLibrary = () => {
    const mode = SLOTS[0].pool[store.skeleton.mode ?? 0]
    const social = SLOTS[9].pool[store.skeleton.social ?? 0]
    const lineage = SLOTS[1].pool[store.skeleton.lineage ?? 0]
    const placeName = '시스템 세계 — ' + mode.split(/[—,(]/)[0].trim()
    addToLibrary('places', {
      name: placeName,
      kind: '가상세계·게임월드',
      mood: lineage,
      history: mode,
      rules: social,
      // 받는 허브(배경 설정집)에서 기본 칸에 정확히 들어가도록 정규(정규화) 장소 키로 매핑한 fields를 추가.
      // 기존 키(name/kind/mood/history/rules)는 그대로 두고 fields만 추가(additive).
      fields: {
        name: placeName,
        kind: '가상세계·게임월드',
        atmosphere: lineage,   // 계보·톤 → 분위기(atmosphere)
        history: mode,         // 핵심 분기(세계의 발단) → 역사(history)
        rules: social,         // 랭킹·세력 구도 → 규칙·질서(rules)
        ...customFields(),     // 사용자 정의 항목(라벨=키) + 기타(etc) — 값이 있는 것만
      },
      source: '게임판타지·LitRPG 세계관 빌더',
    })
    flashCopied('시스템 세계 무대를 장소 라이브러리에 담았어요')
  }

  // 골격을 프로젝트에 추가(자료 › 세계관)
  const skeletonToProject = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않아 추가할 수 없어요.'); return }
    const title = skeletonTitle()
    const body = skeletonLines().map((l) => `<p><b>${esc(l.icon + ' ' + l.label)}</b> — ${esc(l.text)}</p>`).join('')
    const metaCols: Record<string, string> = {
      장르: '게임판타지·LitRPG',
      분기: SLOTS[0].pool[store.skeleton.mode ?? 0].split(/[—,(]/)[0].trim().slice(0, 40),
      계보: SLOTS[1].pool[store.skeleton.lineage ?? 0].split(/[—,(]/)[0].trim().slice(0, 40),
    }
    const id = addToProject({ kind: 'text', root: 'research', folder: '세계관', title, bodyHtml: body, meta: metaCols })
    if (id) flashNote(`‘${title}’을(를) 프로젝트 ‘자료 › 세계관’에 추가했어요.`)
    else flashNote('프로젝트에 추가하지 못했어요.')
  }

  // ── 전체 설정 → 텍스트(섹션별 채워진 답안만) ──
  const buildFullText = (): string => {
    const out: string[] = []
    out.push('# 게임판타지·LitRPG 세계관 설정 — 시스템 세계')
    out.push('')
    out.push('[시스템 세계 골격]')
    out.push(skeletonText())
    for (const sec of SECTIONS) {
      const filled = sec.fields.filter((f) => getAns(sec.key, f.key).trim())
      if (!filled.length) continue
      out.push('')
      out.push(`## ${sec.icon} ${sec.label}`)
      for (const f of filled) {
        out.push(`- ${f.label}: ${getAns(sec.key, f.key).trim().replace(/\n/g, '\n    ')}`)
      }
    }
    // 사용자 정의 항목 + 기타
    const ct = customText()
    if (ct) {
      out.push('')
      out.push('## ＋ 사용자 정의 · 기타')
      for (const line of ct.split('\n')) out.push(`- ${line}`)
    }
    return out.join('\n')
  }

  const buildFullHtml = (): string => {
    const parts: string[] = []
    parts.push(`<h2>게임판타지·LitRPG 세계관 설정 — 시스템 세계</h2>`)
    parts.push(`<p><b>시스템 세계 골격</b></p>`)
    parts.push(skeletonLines().map((l) => `<p>${esc(l.icon + ' ' + l.label)}: ${esc(l.text)}</p>`).join(''))
    for (const sec of SECTIONS) {
      const filled = sec.fields.filter((f) => getAns(sec.key, f.key).trim())
      if (!filled.length) continue
      parts.push(`<h3>${esc(sec.icon + ' ' + sec.label)}</h3>`)
      for (const f of filled) {
        const v = getAns(sec.key, f.key).trim().replace(/\r\n|\r|\n/g, '<br>')
        parts.push(`<p><b>${esc(f.label)}</b><br>${esc(v).replace(/&lt;br&gt;/g, '<br>')}</p>`)
      }
    }
    // 사용자 정의 항목 + 기타
    for (const it of custom) {
      const v = it.value.trim()
      const k = it.label.trim()
      if (v && k) parts.push(`<p><b>${esc(k)}</b><br>${esc(v).replace(/\r\n|\r|\n/g, '<br>')}</p>`)
    }
    if (etc.trim()) parts.push(`<p><b>기타</b><br>${esc(etc.trim()).replace(/\r\n|\r|\n/g, '<br>')}</p>`)
    return parts.join('')
  }

  const exportAll = () => {
    copyText(buildFullText(), '전체 세계관 설정을 복사했어요')
  }

  const fullToProject = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않아 추가할 수 없어요.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '세계관',
      title: '게임판타지·LitRPG 세계관 설정 — 시스템 세계',
      bodyHtml: buildFullHtml(),
      meta: { 장르: '게임판타지·LitRPG', 섹션: String(answeredSectionCount) },
    })
    if (id) flashNote('전체 세계관 설정을 프로젝트 ‘자료 › 세계관’에 추가했어요.')
    else flashNote('프로젝트에 추가하지 못했어요.')
  }

  // 섹션 답안 통계
  const sectionFilledCount = (sec: Section) => sec.fields.filter((f) => getAns(sec.key, f.key).trim()).length
  const answeredSectionCount = SECTIONS.filter((s) => sectionFilledCount(s) > 0).length
  const totalFilled = SECTIONS.reduce((a, s) => a + sectionFilledCount(s), 0)
  const totalFields = SECTIONS.reduce((a, s) => a + s.fields.length, 0)

  // 검색: 매칭 섹션/필드 강조 + 첫 매칭 섹션으로 점프 후보
  const q = query.trim().toLowerCase()
  const fieldMatches = (sec: Section, f: Field) => {
    if (!q) return false
    return (
      sec.label.toLowerCase().includes(q) ||
      f.label.toLowerCase().includes(q) ||
      f.ph.toLowerCase().includes(q) ||
      (f.hint || '').toLowerCase().includes(q) ||
      f.chips.some((c) => c.toLowerCase().includes(q))
    )
  }
  const sectionHasMatch = (sec: Section) => !!q && (sec.label.toLowerCase().includes(q) || sec.fields.some((f) => fieldMatches(sec, f)))

  const active = SECTIONS.find((s) => s.key === store.activeSection) || SECTIONS[0]

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', fontSize: 14, minHeight: 0 }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }
  const headTitle: React.CSSProperties = { fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex' }
  const leftCol: React.CSSProperties = { width: 210, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--chrome-2)' }
  const leftHead: React.CSSProperties = { padding: 10, display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--border)', flexShrink: 0 }
  const search: React.CSSProperties = { width: '100%', padding: '7px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const navWrap: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }
  const rightCol: React.CSSProperties = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }
  const label: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }
  const area: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', resize: 'vertical', minHeight: 56, lineHeight: 1.55, fontFamily: 'inherit' }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }
  const sectionTitle: React.CSSProperties = { fontSize: 13.5, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }
  const tinyBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '4px 7px', borderRadius: 6 }
  const linkbtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', cursor: 'pointer', fontSize: 12, lineHeight: 1.2, padding: '6px 9px', borderRadius: 8 }
  const chip: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--chrome-2)', color: 'var(--text)', cursor: 'pointer', fontSize: 11.5, lineHeight: 1.4, padding: '5px 8px', borderRadius: 999, textAlign: 'left' }
  const linkbar: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }
  const muted: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }

  const related = ['setting-bible', 'world-wiki', 'character-forge', 'name-mixer']
  const relLabel: Record<string, string> = {
    'setting-bible': '🗺️ 배경 설정집',
    'world-wiki': '📚 세계관 위키',
    'character-forge': '🧬 캐릭터 포지',
    'name-mixer': '🔤 이름 믹서',
  }
  const openRelated = (id: string) => openToolLinked(id, { genre: '게임판타지·LitRPG' })

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={headTitle}><Emoji e="🎮"/> 게임판타지·LitRPG 세계관 빌더</span>
        <span style={{ ...muted, fontSize: 12 }}>시스템 설정 {totalFilled}/{totalFields} · 섹션 {answeredSectionCount}/{SECTIONS.length}</span>
        <span style={{ flex: 1 }} />
        {copied && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{copied}</span>}
        <button className="minibtn" onClick={() => setShowSkeleton((v) => !v)} title="시스템 세계 골격 생성기 펼치기/접기">
          {showSkeleton ? '▾ 골격 생성기' : '▸ 골격 생성기'}
        </button>
        <button className="minibtn" onClick={exportAll} title="전체 세계관 설정을 텍스트로 복사"><Emoji e="📋"/> 전체 복사</button>
        <button className="linkbtn" style={linkbtn} onClick={fullToProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '전체 설정을 프로젝트 자료(세계관)에 문서로 추가' : '프로젝트에 연결되어 있지 않아요'}>
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
      </div>

      {note && <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--warn)', borderBottom: '1px solid var(--border)', lineHeight: 1.5 }}>{note}</div>}

      {/* ── 시스템 세계 골격 자동 생성기 ── */}
      {showSkeleton && (
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0, maxHeight: 320, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={sectionTitle}><Emoji e="🎲"/> 시스템 세계 골격 자동 생성기</span>
            <span style={muted}>슬롯 무작위 조합 · 잠금(<Emoji e="🔒"/>)은 고정 · 조합수 <b style={{ color: 'var(--accent)' }}>{fmtNum(combos)}</b>가지 ({koUnit(combos)})</span>
            <span style={{ flex: 1 }} />
            <button className="btn-primary" onClick={rerollAll} title="잠그지 않은 슬롯을 모두 다시 굴립니다"><Emoji e="🎲"/> 전체 재생성</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8 }}>
            {SLOTS.map((slot) => {
              const locked = !!store.locks[slot.key]
              return (
                <div key={slot.key} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px', background: 'var(--paper)', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}><Emoji e={slot.icon}/> {slot.label}</span>
                    <span style={{ flex: 1 }} />
                    <button style={{ ...tinyBtn, color: locked ? 'var(--accent)' : 'var(--muted)', borderColor: locked ? 'var(--accent)' : 'var(--border)' }} onClick={() => toggleLock(slot.key)} title={locked ? '잠금 해제' : '이 슬롯 고정'}>
                      {locked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                    </button>
                    <button style={tinyBtn} onClick={() => rerollOne(slot.key)} disabled={locked} title="이 슬롯만 다시 굴리기"><Emoji e="🎲"/></button>
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{slot.pool[store.skeleton[slot.key] ?? 0]}</div>
                </div>
              )
            })}
          </div>

          <div style={linkbar}>
            <button className="minibtn" onClick={() => copyText(skeletonTitle() + '\n\n' + skeletonText(), '시스템 세계 골격을 복사했어요')}><Emoji e="📋"/> 골격 복사</button>
            <button className="minibtn" onClick={applySkeletonToAnswers} title="골격을 아래 설정 항목 본문에 반영">⬇ 설정에 반영</button>
            <button className="minibtn" onClick={skeletonToLibrary} title="시스템 세계 골격을 글감(스니펫) 라이브러리에 저장"><Emoji e="📥"/> 글감으로</button>
            <button className="minibtn" onClick={skeletonPlaceToLibrary} title="시스템 세계 무대를 장소 라이브러리에 저장"><Emoji e="📍"/> 장소로</button>
            <button className="linkbtn" style={linkbtn} onClick={skeletonToProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '이 골격을 프로젝트 자료(세계관)에 추가' : '프로젝트에 연결되어 있지 않아요'}><Emoji e="📄"/> 골격을 프로젝트에</button>
          </div>
        </div>
      )}

      <div style={body}>
        {/* 좌측: 섹션 내비 + 검색 */}
        <div style={leftCol}>
          <div style={leftHead}>
            <input style={search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍 설정 항목 검색" aria-label="설정 항목 검색" />
          </div>
          <div style={navWrap}>
            {SECTIONS.map((sec) => {
              const activeSec = sec.key === store.activeSection
              const cnt = sectionFilledCount(sec)
              const hit = sectionHasMatch(sec)
              return (
                <button
                  key={sec.key}
                  onClick={() => setActiveSection(sec.key)}
                  style={{
                    textAlign: 'left',
                    border: '1px solid ' + (activeSec ? 'var(--accent)' : (hit ? 'var(--accent)' : 'transparent')),
                    background: activeSec ? 'var(--paper)' : (hit ? 'var(--paper)' : 'transparent'),
                    color: 'var(--text)', cursor: 'pointer', borderRadius: 8, padding: '8px 9px',
                    display: 'flex', flexDirection: 'column', gap: 3,
                    boxShadow: activeSec ? '0 0 0 1px var(--accent)' : 'none',
                  }}
                  title={sec.label}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: activeSec ? 700 : 600, fontSize: 13 }}>
                    <span aria-hidden><Emoji e={sec.icon}/></span>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sec.label}</span>
                    {cnt > 0 && <span style={{ fontSize: 10.5, color: '#fff', background: 'var(--accent)', borderRadius: 999, padding: '1px 6px', flexShrink: 0 }}>{cnt}</span>}
                  </span>
                </button>
              )
            })}
          </div>
          <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)' }}>
            <div style={{ ...muted, fontSize: 11 }}>대상 장르: <b style={{ color: 'var(--accent)' }}>{genreHint}</b></div>
          </div>
        </div>

        {/* 우측: 섹션 질문·입력 */}
        <div style={rightCol}>
          <div style={scroll}>
            <div style={panel}>
              <div style={sectionTitle}><span aria-hidden><Emoji e={active.icon}/></span> {active.label}</div>
              <div style={muted}>{active.blurb}</div>
            </div>

            {active.fields.map((f) => {
              const val = getAns(active.key, f.key)
              const hit = fieldMatches(active, f)
              return (
                <div key={f.key} style={{ ...panel, borderColor: hit ? 'var(--accent)' : 'var(--border)' }}>
                  <div style={label}>{f.label}</div>
                  <div style={{ ...muted, marginTop: -4 }}>{f.ph}</div>
                  <textarea
                    style={{ ...area, minHeight: f.big ? 96 : 56 }}
                    value={val}
                    onChange={(e) => setAns(active.key, f.key, e.target.value)}
                    placeholder="여기에 이 항목의 설정을 적으세요. 아래 예시를 눌러 채울 수도 있어요."
                    aria-label={f.label}
                  />
                  {f.hint && <div style={{ ...muted, color: 'var(--muted)' }}><Emoji e="💡"/> {f.hint}</div>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)' }}>예시 (클릭하면 채워져요)</span>
                      <span style={{ flex: 1 }} />
                      <button style={tinyBtn} onClick={() => applyChip(active.key, f.key, f.chips[randIdx(f.chips.length)])} title="예시 중 하나를 무작위로 채우기"><Emoji e="🎲"/> 무작위</button>
                      {val.trim() && <button style={{ ...tinyBtn, color: 'var(--warn)' }} onClick={() => setAns(active.key, f.key, '')} title="이 항목 비우기">✕ 비우기</button>}
                      {val.trim() && <button style={tinyBtn} onClick={() => copyText(`${f.label}: ${val.trim()}`, '항목을 복사했어요')} title="이 항목 복사"><Emoji e="📋"/></button>}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {f.chips.map((c, i) => (
                        <button
                          key={i}
                          style={chip}
                          onClick={() => applyChip(active.key, f.key, c)}
                          title="클릭: 입력에 채우기 / 복사는 우측 📋 사용"
                        >
                          {c.length > 64 ? c.slice(0, 64) + '…' : c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* 사용자 정의 항목 + 고정 '기타' 자유 입력 */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={sectionTitle}>＋ 사용자 정의 항목</div>
                <span style={{ flex: 1 }} />
                <button className="minibtn" onClick={addCustom} title="원하는 항목(이름)을 직접 추가합니다. 내용은 직접 적으세요.">＋ 항목 추가</button>
              </div>
              <div style={muted}>준비된 예시가 없는, 작품만의 설정 항목을 직접 추가하세요. (무작위 재생성 시 값은 비워지고 항목 이름은 남습니다)</div>
              {custom.length === 0 && <div style={{ ...muted, fontStyle: 'italic' }}>아직 추가한 항목이 없어요. ‘＋ 항목 추가’로 만들어 보세요.</div>}
              {custom.map((it) => (
                <div key={it.id} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ ...label, marginBottom: 0 }}>{it.label}</span>
                    <span style={{ flex: 1 }} />
                    <button style={{ ...tinyBtn, color: 'var(--warn)' }} onClick={() => removeCustom(it.id)} title="이 항목 삭제">✕</button>
                  </div>
                  <textarea
                    style={{ ...area, minHeight: 48 }}
                    value={it.value}
                    onChange={(e) => setCustomValue(it.id, e.target.value)}
                    placeholder={`‘${it.label}’의 내용을 직접 적으세요.`}
                    aria-label={it.label}
                  />
                </div>
              ))}
            </div>

            {/* 고정 '기타' 자유 입력 */}
            <div style={panel}>
              <div style={label}>기타</div>
              <div style={{ ...muted, marginTop: -4 }}>어느 항목에도 들어가지 않는 메모·아이디어·자유 서술을 충분히 적으세요.</div>
              <textarea
                style={{ ...area, minHeight: 96 }}
                value={etc}
                onChange={(e) => setEtc(e.target.value)}
                placeholder="여기에 자유롭게 적으세요. (무작위 재생성 시 비워집니다)"
                aria-label="기타"
              />
            </div>

            {/* 연계 도구 */}
            <div style={panel}>
              <div style={sectionTitle}><Emoji e="🔗"/> 함께 쓰면 좋은 도구</div>
              <div style={linkbar}>
                {related.map((rid) => (
                  <button key={rid} className="linkbtn" style={linkbtn} onClick={() => openRelated(rid)} title={`${relLabel[rid] || rid} 열기 (게임판타지·LitRPG 모드)`}>
                    {emojify(relLabel[rid] || rid)}
                  </button>
                ))}
              </div>
              <div style={muted}>던전·게이트·도시는 <b>배경 설정집</b>에서 카드로, 시스템·규칙 자료는 <b>세계관 위키</b>에서 페이지로 이어 정리하면 좋아요. 플레이어·NPC와 이름은 캐릭터 포지·이름 믹서로.</div>
            </div>

            <div style={{ ...muted, paddingBottom: 4 }}>
              모든 입력은 이 브라우저에 자동 저장됩니다. 게임판타지·LitRPG 도시에에 근거한 예시는 ‘채우기’용 출발점이니 작품에 맞게 변주하세요.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
