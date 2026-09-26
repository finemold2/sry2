// 현판 회귀 시그니처 — 현대판타지·회귀 각성·전개 대형 생성기(조합 1조+ 지향).
//  회귀/빙의/각성 계기 × 능력·시스템 × 현대 무대(직업군) × 적대 세력(길드/재벌/괴수) × 먼치킨 전개 × 반전(숨은 진실)
//  여섯 슬롯의 로컬 풀(현판·회귀 도시에 기반·장르 특화)에서 무작위로 뽑아,
//  "프롤로그(죽음·배신·후회) → 회귀/각성 자각 → 첫 미래지식 행사 → 세력 대결·먼치킨 사이다
//   → 메타지식 무효화 위기 → 자력 청산·반전"으로 이어지는 현판 회귀 한 편을 조립한다.
//  슬롯별 🔒 잠금 + 부분 재생성, 총 조합수(1조+) 표시, 보관함(localStorage 자동 저장/복원),
//  스니펫 라이브러리 저장, 프로젝트(자료) 추가, 관련 도구 열기. 외부 네트워크·라이브러리 없음.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'modfan-signature',
  name: '현판 회귀 시그니처(1조+ 조합)',
  icon: '⏳',
  group: '생성기',
  genre: '현대판타지·회귀',
  intro: '회귀/빙의/각성 계기·능력/시스템·현대 무대·적대 세력·먼치킨 전개·반전을 조합해 현대판타지 회귀 전개를 1조+ 가지로 대량 생성하세요',
  w: 620,
  h: 720,
}

const LS = 'sry:tool:modfan-signature'

interface Slot { key: string; label: string; icon: string; beat: string; faces: string[] }

// 여섯 축의 로컬 풀(현대판타지·회귀 도시에 근거).
//  ①회귀/빙의/각성 계기 ②능력·시스템 ③현대 무대(직업군) ④적대 세력 ⑤먼치킨 전개 ⑥반전·숨은 진실.
//  각 풀이 넉넉해 전체 조합수가 1조(10^12)를 가뿐히 넘는다(아래 TOTAL_COMBOS 계산).
const SLOTS: Slot[] = [
  {
    key: 'trigger', label: '회귀/각성 계기', icon: '⏳', beat: '프롤로그·자각',
    faces: [
      '동료 헌터들에게 배신당해 던전 한복판에 버려져 죽은 순간, 각성 직전의 평범한 대학생으로 회귀한다',
      '게이트 브레이크로 도시가 무너지던 날 마수의 손에 찢겨 죽고, 첫 게이트가 열리기 십 년 전으로 회귀한다',
      '주가 조작 누명을 쓰고 옥중에서 숨을 거둔 뒤, IMF 직전 신입사원이던 그날 아침으로 회귀한다',
      '데뷔 직전 사고로 무대에 서지 못한 채 잊혀 죽고, 연습생 오디션 전날로 회귀한다',
      '암 선고를 받고 병상에서 눈을 감자, 익숙한 천장 — 스무 살 자취방 옥탑에서 다시 눈을 뜬다',
      '재벌가의 버려진 사생아로 멸시받다 살해당한 뒤, 그 가문의 막내로 다시 어린아이가 되어 회귀한다',
      '세계를 멸망시킨 최종 보스를 쓰러뜨린 직후 모든 동료가 죽은 폐허에서, 게이트가 처음 출현하던 날로 회귀한다',
      '코인 폭락으로 전 재산을 잃고 한강 다리 위에서 뛰어내린 순간, 매수 버튼을 누르기 직전으로 회귀한다',
      '프로게이머의 꿈을 접고 평범하게 늙어 죽은 노인이, 첫 PC방에 발을 들이던 열일곱으로 회귀한다',
      '교통사고로 죽은 줄 알았는데, 읽던 회귀물 웹소설 속 三화 만에 죽는 단역 헌터의 몸에 빙의한다',
      '야근 끝에 책상에 엎드려 잠들었다가, 십오 년 전 신입 막내였던 첫 출근 날로 회귀한다',
      '전쟁 같은 길드 항쟁에서 모든 길드원을 잃고 자신마저 쓰러진 뒤, 길드를 만들기 전으로 회귀한다',
      '딸의 수술비를 마련 못 해 떠나보낸 가장이, 딸이 아직 건강하던 십 년 전으로 회귀한다',
      '한물간 배우로 단역만 전전하다 무명으로 죽은 뒤, 첫 오디션을 망치기 직전으로 회귀한다',
      '의료사고의 책임을 뒤집어쓰고 면허를 잃은 의사가, 인턴 첫날로 회귀한다',
      '가족을 인질로 잡힌 채 협회의 도구로 굴려지다 토사구팽당하고, 각성 전 평범한 고등학생으로 회귀한다',
      '대지진으로 가족을 모두 잃은 그날을 기억한 채, 지진이 일어나기 한 달 전으로 회귀한다',
      '세계 랭킹 1위 헌터였으나 정체 모를 자에게 암살당하고, 막 D급으로 각성하던 날로 회귀한다',
      '망한 게임 회사의 마지막 직원으로 폐업 정리를 하다, 그 게임의 기획서를 쓰기 전으로 회귀한다',
      '소설 마지막 장을 덮은 순간, 그 책 속에서 곧 폐기될 운명인 "재능 없는 각성자"의 몸으로 빙의한다',
      '죽기 직전 "다시 한번만"을 외쳤더니 시스템 음성이 들리며, 십 년 전 그날로 되감긴다',
      '배신한 친구의 칼에 찔려 쓰러진 순간, 그 친구와 아직 둘도 없는 사이였던 학창 시절로 회귀한다',
      '괴수 사태로 폐허가 된 미래에서 마지막 생존자로 죽고, 사태 발발 삼 년 전으로 회귀한다',
      '복권 1등을 놓치고 평생 후회하며 늙은 노인이, 그 번호를 기억한 채 추첨 일주일 전으로 회귀한다',
      '게이트 공략 중 동료를 구하려다 죽었고, 그 동료가 아직 살아 있는 과거로 회귀한다',
      '회사를 빼앗기고 길거리에 나앉은 창업자가, 첫 사업계획서를 쓰던 청년 시절로 회귀한다',
      '독이 든 축하주를 마시고 쓰러진 차기 회장이, 가문 후계 싸움이 시작되기 전으로 회귀한다',
      '실험체로 끌려가 폐기된 각성자가, 능력이 발현되기 직전의 평범한 시절로 회귀한다',
      '세 번째 회귀 — 앞선 두 번의 죽음을 모두 기억한 채, 이번엔 누구도 믿지 않기로 하고 다시 시작한다',
      '죽음의 순간 상태창이 떠오르며 "회귀 권한이 부여되었습니다"라는 메시지와 함께 과거로 던져진다',
      '미래에서 보낸 자신의 메시지를 받고, 그 경고대로 게이트가 열리기 직전의 오늘로 돌아온다',
      '소속사에 노예 계약으로 묶여 착취당하다 버려진 아이돌이, 계약서에 도장을 찍기 전날로 회귀한다',
      '주식 천재라 불렸으나 작전 세력에 당해 파산하고, 첫 주식을 사기 전으로 회귀한다',
      '히어로로 추앙받다 정부에 토사구팽당한 각성자가, 능력을 숨기기로 다짐하며 각성 전으로 회귀한다',
      '집을 사지 못해 평생 전세를 전전한 가장이, 강남 한복판이 허허벌판이던 시절로 회귀한다',
      '천재 작곡가의 곡을 빼앗기고 무명으로 죽은 뒤, 그 멜로디를 머릿속에 새긴 채 데뷔 전으로 회귀한다',
      '게이트 너머 이세계에서 십 년을 구른 회귀자가, 마침내 게이트를 통해 각성 전의 현대로 돌아온다',
      '협회장의 음모로 누명을 쓰고 처형된 길드장이, 그 협회장이 아직 무명이던 시절로 회귀한다',
      '마지막 게이트가 닫히던 날 세계와 함께 사라진 영웅이, 첫 게이트가 열리기 직전으로 회귀한다',
      '재벌 2세에게 짓밟히고 버려진 흙수저가, 그 재벌이 아직 작은 가게 사장이던 시절로 회귀한다',
      '죽기 직전 본 뉴스 속보의 날짜를 또렷이 기억한 채, 그 사건이 터지기 한 달 전으로 회귀한다',
      '각성 능력이 폭주해 모두를 잃고 자멸한 자가, 능력이 처음 깨어나기 전으로 회귀해 통제법을 새로 익힌다',
      '평생 2인자로만 살다 죽은 매니저가, 자신이 키운 스타를 처음 만나기 전으로 회귀한다',
      '게임 속 세계로 빨려 들어가 죽고 보니, 자신이 즐겨 하던 그 게임의 튜토리얼 직전으로 돌아와 있다',
      '회귀했지만 능력은 없고 오직 십 년치 미래 지식만이 유일한 무기로 남았다',
      '동생을 지키지 못한 형이, 동생이 아직 웃고 있던 그날로 회귀해 이번엔 반드시 지키기로 한다',
      '실패한 연예 기획자가, 자신이 놓친 미래의 대스타들을 모두 기억한 채 창업 전으로 회귀한다',
      '국가대표 선발에서 떨어진 채 늙어 죽은 선수가, 첫 입단 테스트 전날로 회귀한다',
      '평생 모은 재산을 사기당하고 빈손으로 죽은 노인이, 그 사기꾼을 처음 만나기 전으로 회귀한다',
      '게이트 안에서 수십 년을 갇혀 늙어 죽었으나, 현대로 돌아와 보니 단 하루도 지나지 않은 그날이다',
      '대표팀에서 쫓겨나 술로 망가진 코치가, 자신이 키운 천재 제자를 처음 만나던 날로 회귀한다',
      '내부 고발 후 매장당해 잊혀 죽은 직원이, 그 비리가 시작되기 전 입사 첫날로 회귀한다',
      '폐급 취급받다 버려진 각성자가, 자신의 진짜 등급이 숨겨져 있었음을 안 채 판정 전날로 회귀한다',
      '평생 한 번도 1등을 못 해 본 만년 2등이, 모든 경쟁자의 미래를 기억한 채 첫 시합 전으로 회귀한다',
      '딸의 데뷔를 끝내 못 본 채 죽은 아버지가, 딸이 첫 오디션을 보러 가던 그날 아침으로 회귀한다',
    ],
  },
  {
    key: 'power', label: '능력·시스템', icon: '🪟', beat: '두 번째 무기',
    faces: [
      '눈앞에 오직 자신에게만 보이는 상태창이 떠, 경험치·레벨·스킬을 게임처럼 관리한다',
      '회귀 전 십 년치 미래 지식 — 종목·게이트·인물의 흥망을 통째로 기억한다',
      '사람·몬스터의 "약점"이 붉은 점으로 표시되는 절대 감정안(鑑定眼)을 얻는다',
      '한 번 본 스킬·검술·악보·코드를 즉시 복제해 습득하는 모방의 권능을 가진다',
      '실패하면 그 직전 세이브 지점으로 되돌아가는, 자신만의 "리셋" 능력이 남아 있다',
      '죽음을 한 번 무를 수 있는 일회성 "되감기" 권능이 손등에 새겨져 있다',
      '아이템·재화를 무한 보관하는 인벤토리 시스템이 머릿속에 펼쳐진다',
      '저평가된 자산·인재·기술에 황금빛 표식이 보이는 "선점의 눈"을 얻는다',
      '상대의 거짓말이 회색으로 들리는 간파 능력으로 협상 테이블을 지배한다',
      '한계 없이 성장하는 "무한 성장" 특성 — 천장이 없는 스탯을 부여받는다',
      '게이트의 등급·출현 시각·내부 구조가 지도로 미리 펼쳐지는 예지 시스템',
      '죽인 적의 능력 일부를 흡수하는 약탈(掠奪) 시스템을 각성한다',
      '시간을 아주 잠깐 멈추거나 늦추는, 자신에게만 흐르는 시간 가속 능력',
      '회귀와 함께 "퀘스트"와 "보상"이 뜨는 게임형 인생 관리 시스템을 받는다',
      '한 분야의 정보를 머릿속 데이터베이스처럼 검색하는 만능 사전 능력',
      '타인의 재능·성공 확률이 수치로 보이는 "스카우터"의 눈을 가진다',
      '미래의 차트·시세·흥행 성적이 흐릿하게 겹쳐 보이는 예지의 단편들',
      '한 번 들은 곡·본 영상·읽은 시나리오를 완벽히 기억하는 절대 기억력',
      '신체 능력을 순간적으로 폭발시키는 "각성 모드", 다만 반동이 따른다',
      '아군의 능력치를 끌어올리는 지휘·버프 계열 권능으로 판을 짜는 전략가가 된다',
      '죽기 직전의 위기에서만 발동하는 한 줄기 "기사회생"의 권능',
      '대상의 미래 일부가 짧은 환영으로 스치는 불완전한 예지력',
      '돈을 굴릴수록 직감이 적중하는, 자본에 깃든 기묘한 "재물운" 특성',
      '한 번 계약하면 어기지 못하게 만드는 "맹약" 권능으로 사람을 묶는다',
      '독·저주·상태이상을 모두 무효화하는 절대 내성을 타고난다',
      '게이트 안에서만 시간이 다르게 흐르는 "수련의 방"을 자유로이 연다',
      '타인에게 자신의 능력 일부를 빌려주는 "권능 분배" 시스템',
      '실력·재능을 일부러 낮춰 보이게 위장하는 "은폐" 스킬을 함께 얻는다',
      '죽은 자의 마지막 기억을 읽어내는 사령(死靈) 감응 능력',
      '한 번 맺은 인연의 위기를 감지하는 "유대의 끈" 능력으로 사람을 구한다',
      '시세·여론·인기 흐름이 그래프로 떠오르는 "트렌드 감지" 시스템',
      '회귀 전 자신이 익힌 모든 무공·스킬을 0레벨부터 다시, 그러나 더 빠르게 쌓는다',
      '특정 인물의 충성도·호감도가 게이지로 보이는 인간관계 시스템',
      '게이트 등급을 한 단계 낮춰 공략 난이도를 떨어뜨리는 "하향 조정" 권능',
      '실패한 미래를 분기별로 열람할 수 있는 "타임라인" 시스템 창',
      '한 번 손에 쥔 무기·악기를 신체의 일부처럼 다루는 "숙련 가속" 특성',
      '주변의 위험 수치를 색으로 표시하는 "위협 레이더"를 늘 켜고 다닌다',
      '죽음의 순간마다 강해지는 "역경 성장" — 절체절명일수록 한계가 풀린다',
      '소문·정보를 끌어모으는 "정보망" 시스템으로 미래의 단서를 사들인다',
      '대상을 한순간 "분석 완료"해 모든 스펙을 알아내는 정밀 감정 시스템',
      '잃어버린 회귀 전 기억을 한 조각씩 되찾는 "기억 복원" 권능',
      '재화를 경험치로 환산해 성장에 직접 투자하는 "환금 성장" 시스템',
      '타인의 능력을 잠시 빌려 쓰는 "차용" 권능으로, 상황마다 다른 무기를 든다',
      '대상의 "운명선"이 실처럼 보여, 누가 누구와 엮일지 미리 읽어내는 눈',
      '같은 실수를 반복하면 경고가 뜨는 "데자뷔 알림" 시스템으로 분기를 관리한다',
      '한 번 적은 메모가 절대 틀리지 않는 "확정 예언서"로 미래를 못박는다',
      '죽음을 앞둔 자에게만 보이는 "마지막 한마디"를 읽어, 진실에 닿는다',
      '게이트 드롭 아이템의 등장 확률이 표시되는 "확률 조작" 특성',
      '회귀 전 동료들의 스킬 트리를 통째로 기억해, 그들의 성장을 앞당겨 주는 조언자가 된다',
      '감정의 동요 없이 최적의 수만 계산하는, 위기에서 빛나는 "냉정의 두뇌"',
      '한 번 본 시세 패턴을 영원히 기억해, 시장의 반복을 짚어내는 "패턴 안(眼)"',
      '신체를 회복시키는 자가 치유 권능 — 다치면 다칠수록 더 단단해진다',
      '특정 장소·물건에 남은 과거의 잔상을 읽는 "사이코메트리" 능력',
    ],
  },
  {
    key: 'stage', label: '현대 무대(직업)', icon: '🏙️', beat: '두 번째 인생의 판',
    faces: [
      '게이트와 던전이 일상이 된 현대, 헌터협회 소속 최약체 D급으로 다시 시작한다',
      '대기업 후계 다툼이 한창인 재벌가의 막내로, 경영권을 둘러싼 판에 뛰어든다',
      '아이돌 기획사의 막내 연습생으로, 데뷔조 막차를 노린다',
      '여의도 증권가의 신입 애널리스트로, 미래의 폭등 종목을 손에 쥐고 입성한다',
      '프로게임단 후보 선수로, e스포츠가 막 태동하던 PC방 시대를 살아간다',
      '대학병원 인턴으로, 미래 의학 지식을 품고 의국 정치판에 들어선다',
      '망해 가는 작은 영화 기획사의 막내 PD로, 미래의 천만 영화 시나리오를 안다',
      '한물간 야구단의 신인 투수로, 미래의 명승부와 트레이드를 모두 기억한다',
      '스타트업 한 칸짜리 사무실의 공동창업자로, 미래의 유니콘 기업을 설계한다',
      '편의점 아르바이트생이지만, 게이트 출현 일정을 손바닥처럼 꿰고 있다',
      '대형 로펌의 막내 변호사로, 미래에 터질 대형 소송들을 미리 안다',
      '인디 게임 개발자로, 메가히트할 게임의 기획을 통째로 기억한 채 시작한다',
      '방송국 막내 작가로, 미래의 국민 예능과 스타 MC를 미리 점찍어 둔다',
      '신생 길드의 막내 헌터로, 훗날 최강이 될 길드의 토대를 닦는다',
      '부동산 중개소 막내 직원으로, 십 년 뒤 금싸라기가 될 땅을 알고 있다',
      '대학가의 평범한 복학생이지만, 곧 닥칠 각성 사태의 첫 신호를 기다린다',
      '몰락한 가문의 후계로, 가업인 무역상사를 되살리려 첫발을 뗀다',
      '신인 웹툰 작가로, 미래의 대박 IP를 머릿속에 그려 둔 채 데뷔한다',
      '셰프 지망생으로, 미슐랭 별을 받을 미래 트렌드 요리를 이미 안다',
      '경찰대 신입 생도로, 미래의 미제 사건과 거대 비리를 미리 파악하고 있다',
      '군 특수부대의 신병으로, 곧 시작될 게이트 군사 작전의 미래를 안다',
      '연예부 신입 기자로, 미래의 특종과 스캔들을 손에 쥐고 입사한다',
      '바이오 벤처의 연구원으로, 미래에 노벨상감이 될 기술을 알고 있다',
      '대형 엔터의 신인 매니저로, 미래의 톱스타가 될 무명들을 알아본다',
      '음악 프로듀서 지망생으로, 미래의 차트 올킬 곡들을 기억한 채 작업실을 연다',
      '국내 최대 길드의 비전투 지원 요원으로 잠입해, 안에서 판을 흔든다',
      '대기업 평사원으로, 회사의 미래 흥망과 임원들의 비리를 전부 안다',
      '시골 약방의 손자로, 미래의 신약과 건강 트렌드를 알고 가업을 키운다',
      '게임 회사의 QA 테스터로, 미래의 대작 게임 기획을 통째로 가져온다',
      '신생 OTT 플랫폼의 기획자로, 미래의 글로벌 흥행작들을 미리 안다',
      '중소 기획사의 무명 배우로, 미래의 인생작 캐스팅을 모두 기억한다',
      '대학 동아리에서 시작한 e스포츠 팀의 감독으로, 미래의 로스터를 짠다',
      '벤처캐피털의 막내 심사역으로, 미래에 대박 날 스타트업들을 안다',
      '국가 직속 각성자 양성소의 훈련생으로, 미래의 등급 판정을 미리 안다',
      '재래시장 청과상의 아들로, 미래의 유통 혁명을 알고 사업을 시작한다',
      '인기 없는 변두리 헬스장의 트레이너로, 미래의 격투 스타들을 키워낸다',
      '신문사 경제부 인턴으로, 미래의 경제 위기와 호황 사이클을 전부 안다',
      '망한 동네 빵집 아들로, 미래의 디저트 트렌드를 알고 프랜차이즈를 꿈꾼다',
      '대형 길드의 공략조 막내로, 미래의 게이트 공략 정답지를 손에 쥐고 있다',
      '연예계 데뷔를 앞둔 무명 트로트 가수로, 미래의 역주행 신화를 안다',
      '코딩 부트캠프 수강생으로, 미래의 빅테크 서비스를 통째로 기획해 둔다',
      '대형 병원 응급실의 신참 간호사로, 미래의 의료 사고와 비리를 모두 안다',
      '게임 방송을 막 시작한 무명 스트리머로, 미래의 떡상 콘텐츠를 통째로 기억한다',
      '항만·물류 회사의 말단 사원으로, 미래의 무역 흐름과 환율을 손바닥처럼 안다',
      '대학 농구부의 후보 선수로, 미래의 프로 무대와 드래프트 순위를 모두 기억한다',
      '신생 패션 브랜드의 디자이너 지망생으로, 미래의 유행을 거꾸로 알고 있다',
      '게이트 부산물을 다루는 연금술 공방의 막내로, 미래의 대박 레시피를 안다',
      '중소 출판사의 막내 편집자로, 미래의 베스트셀러 원고들을 미리 알아본다',
      '동네 헬스 유튜버로, 미래의 피트니스 열풍과 인기 콘텐츠를 기억한다',
      '지방 방송국 아나운서로, 미래의 대형 특종과 정치 지형을 미리 파악한다',
      '신생 코인 거래소의 개발자로, 미래의 폭등·폭락 사이클을 전부 안다',
      '대기업 비서실의 말단으로, 회장과 임원들의 미래 비리를 가장 가까이서 안다',
      '국립과학수사연구원 신입으로, 미래의 미제 사건 진범들을 이미 알고 있다',
    ],
  },
  {
    key: 'goal', label: '회귀 직후 목표', icon: '✅', beat: '체크리스트',
    faces: [
      '①이번엔 반드시 가족을 지킨다 ②나를 버린 그놈들에게 갚아준다 ③그 종목을 산다 — 할 일 목록부터 적는다',
      '전생에 떠나보낸 가족의 죽음을, 날짜까지 기억하는 그 사건을 이번엔 기필코 막기로 한다',
      '회귀 전 자신을 배신한 자에게 복수하기 전에, 먼저 그가 의지할 모든 기반부터 조용히 무너뜨린다',
      '종잣돈을 마련하는 것이 첫 과제 — 미래에 폭등할 종목 하나에 전 재산을 거는 것부터 시작한다',
      '미래의 거물이 될 무명들을 명단으로 정리하고, 그들이 빛나기 전에 한 명씩 포섭하러 나선다',
      '가장 먼저 자신의 각성 능력을 남몰래 통제하는 법을 익혀, 전생처럼 폭주하지 않기로 한다',
      '회귀 전 자신을 죽인 게이트의 출현일을 달력에 표시하고, 그날까지 강해질 계획을 세운다',
      '미래에 터질 비리·사건을 증거째 미리 확보해, 결정적일 때 터뜨릴 카드로 쟁여 둔다',
      '전생에 놓친 단 한 사람을 이번엔 붙잡기로, 그를 다시 만날 그날을 손꼽아 기다린다',
      '아무도 모르는 저평가 자산·기술·인재를 목록화해, 경쟁자보다 먼저 선점하기로 한다',
      '미래 지식을 들키지 않도록, 모든 성공을 "천재성"이나 "우연"으로 위장할 각본부터 짠다',
      '회귀자임을 끝까지 숨긴 채, 미래에 황제처럼 군림할 자 곁에 일부러 자리를 잡는다',
      '전생에 외면했던 어린 동생(혹은 친구)을 이번엔 지키기로, 그의 곁을 떠나지 않기로 한다',
      '망해 가던 가문(혹은 회사)을 일으킬 사업 아이템을, 미래 트렌드에서 거꾸로 골라 둔다',
      '미래의 명곡·시나리오·기획을 머릿속에서 꺼내, 누가 빼앗기 전에 자기 이름으로 선점한다',
      '회귀 전 자신을 토사구팽한 협회(혹은 길드)에 들어가지 않고, 자신만의 세력을 차리기로 한다',
      '전생의 실패를 복기해, 같은 분기점에서 이번엔 정반대의 선택을 하기로 마음먹는다',
      '미래에 닥칠 경제 위기를 디딤돌 삼아, 폭락장에서 거꾸로 부를 쌓을 계획을 세운다',
      '자신을 무시하던 자들 앞에서 실력을 감춘 채, 결정적 무대에서 한 번에 뒤집기로 한다',
      '회귀 전 죽은 동료를 살리기 위해, 그가 죽는 그 게이트 공략을 통째로 다시 설계한다',
      '미래의 대형 게이트(혹은 재난)에 대비해, 사람들 몰래 자원과 정보를 비축하기 시작한다',
      '전생에 자신을 모함한 자의 약점을 가장 먼저 손에 쥐어, 협박이 아닌 보험으로 둔다',
      '회귀 직후 가장 먼저 도망갈 길부터 확보해, 전생의 죽음을 되풀이하지 않기로 한다',
      '미래에 대박 날 IP·콘텐츠를 머릿속 목록에서 꺼내, 작은 한 편부터 차근차근 키운다',
      '자신의 능력 등급을 일부러 낮게 판정받아, 약자로 위장한 채 판을 관찰하기로 한다',
      '전생의 원수가 아직 약자일 때, 싸우기 전에 그의 자금줄부터 조용히 끊어 두기로 한다',
      '미래의 정·재계 인맥을 미리 다지기 위해, 아직 무명인 그들에게 작은 은혜부터 베푼다',
      '회귀 전 자신을 살려 준 익명의 은인을 찾아, 이번엔 먼저 손을 내밀기로 한다',
      '미래에 일어날 사고를 미리 막아 영웅이 되는 것으로, 단숨에 신망을 얻을 첫 수를 둔다',
      '전생에 빚더미에 앉게 한 함정을 기억해, 이번엔 그 계약서에 도장을 찍지 않기로 한다',
      '자신만 아는 미래 정보를 팔아, 능력 없이도 부와 영향력을 쌓을 정보상의 길을 연다',
      '회귀 전 자신을 처형한 자의 죄를, 이번엔 그가 손쓰기 전에 먼저 만천하에 고발하기로 한다',
      '미래의 톱스타가 될 연습생들을 한 팀으로 모으는 것을, 두 번째 인생의 첫 사업으로 삼는다',
      '전생에 지키지 못한 약속을 적은 쪽지를 품에 넣고, 그것부터 하나씩 지워 나가기로 한다',
      '회귀 능력(되감기·세이브)을 검증하는 것이 우선 — 위험 없이 한 번 시험해 보기로 한다',
      '미래에 자신을 노릴 회귀자·예지자의 존재를 경계하며, 정보를 흘리지 않을 규칙부터 정한다',
      '전생의 자신과 다르게, 이번엔 가장 먼저 믿을 수 있는 단 한 명의 동료부터 만든다',
      '회귀 직후 거울 속 젊어진 자신을 보며, 남은 시간을 무엇에 쓸지 우선순위를 다시 짠다',
      '미래에 폭락할 자산을 미리 정리하는 것부터 — 전생의 빚을 이번엔 만들지 않기로 한다',
      '회귀 전 자신을 살리려다 죽은 호위(혹은 동료)의 마지막을, 이번엔 반드시 막기로 한다',
      '전생에 자신이 외면해 무너진 사람을, 이번엔 손을 내밀어 든든한 우군으로 만들기로 한다',
      '미래의 대형 게이트를 공략할 최강 파티를, 멤버들이 무명일 때부터 미리 모으기로 한다',
      '회귀 전 자신을 가둔 함정(계약·누명)의 설계자를 가장 먼저 알아보고, 거리를 두기로 한다',
      '전생에 빼앗긴 자신의 발명(곡·기획·특허)을, 이번엔 누구보다 먼저 등록하기로 한다',
      '미래에 일어날 역병(혹은 재난)에 대비해, 약초·물자·정보를 조용히 모으기 시작한다',
      '회귀 전 자신을 처형한 권력의 정점을, 그가 정상에 오르기 전에 끌어내리기로 한다',
      '전생의 마지막에 들은 "거짓말"의 진위를, 이번 생에 직접 확인하기로 마음먹는다',
      '미래의 쿠데타(혹은 사내 반란)의 날짜를 기억해, 그 전에 판을 뒤집을 준비를 한다',
      '회귀 직후 가장 먼저 자신의 건강과 몸부터 단련해, 전생의 병사(病死)를 막기로 한다',
      '전생에 놓친 기회의 목록을 적어, 이번엔 같은 문을 절대 닫지 않기로 다짐한다',
      '미래에 자신을 배신할 자를 알기에, 그를 곁에 두되 결정적 권한만은 주지 않기로 한다',
      '회귀했음을 단 한 사람에게도 들키지 않을 것 — 그 원칙을 첫 번째 규칙으로 삼는다',
    ],
  },
  {
    key: 'enemy', label: '적대 세력', icon: '🛡️', beat: '맞설 거대',
    faces: [
      '회귀 전 자신을 배신하고 버린 그 동료들이, 아직은 신뢰받는 동료로 곁에 있다',
      '협회를 사조직처럼 주무르며 각성자들을 도구로 부리는 부패한 헌터협회장',
      '게이트와 결탁해 인류를 제물로 바치려는 광신 집단 "심연의 사도들"',
      '시장을 조작해 개미들을 학살하는 거대 작전 세력과 그 배후의 사모펀드',
      '가문 후계를 독차지하려 형제마저 제거하는 재벌가의 이복 형',
      '소속 연예인을 노예처럼 착취하고 신인을 짓밟는 거대 기획사 회장',
      '국가 위에 군림하며 각성자를 비밀리에 실험하는 정부 산하 검은 조직',
      '도시 하나를 통째로 삼키려는 S급 괴수와 그것을 숭배하는 던전 컬트',
      '미래 지식을 독점하려 회귀자만 노려 사냥하는 또 다른 회귀자 집단',
      '약소 길드를 흡수하며 헌터 업계를 독점하려는 초거대 길드 "단(壇)"',
      '주가를 띄웠다 무너뜨리는 작전으로 회사를 통째로 빼앗는 기업 사냥꾼',
      '연예계 캐스팅을 좌우하며 뒷돈과 협박으로 군림하는 방송계 실세',
      '게이트 이권을 둘러싸고 정·재계와 유착한 정경유착의 거대 카르텔',
      '인간을 각성시켜 병기로 만드는 비밀 결사 "프로젝트 제로"',
      '회귀 전 자신을 처형한 그 인물 — 지금은 모두의 신망을 받는 영웅 행세를 한다',
      '던전 깊은 곳에서 깨어나려는 고대의 마왕과 그 부활을 돕는 내부 배신자들',
      '신약·특허를 독점해 환자를 볼모로 폭리를 취하는 제약 마피아',
      '리그를 조작하고 선수를 협박하는 e스포츠계의 검은 베팅 조직',
      '게이트 정보를 사고팔며 헌터들을 죽음으로 내모는 정보 브로커 길드',
      '회귀 전 세계를 멸망시킨 최종 흑막 — 지금은 무명의 청년으로 숨어 있다',
      '재개발 이권을 위해 사람을 내쫓는 건설 재벌과 그 뒤의 폭력 조직',
      '각성자 인신매매로 부를 쌓는 국제 범죄 조직 "노예 시장"',
      '여론을 조작해 영웅을 매장하고 가짜 영웅을 띄우는 언론 권력',
      '미래에 도시를 삼킬 대형 게이트 — 그날을 아는 건 회귀한 자신뿐이다',
      '천재 신인을 시기해 짓밟으려는, 한때의 정상이었던 늙은 권력자들',
      '회사를 빼앗고 창업자를 내쫓은 투자자 연합과 그들의 변호인단',
      '게이트 너머에서 현대로 침공하려는 이세계의 정복 군단',
      '각성 능력을 약물로 위조해 가짜 헌터를 양산하는 지하 제약 조직',
      '미래의 대스타를 미리 망가뜨려 싹을 자르려는 경쟁 기획사의 음모',
      '국가 비상사태를 빌미로 각성자를 통제·징집하려는 군부 강경파',
      '회귀자의 존재를 감지하고 "원래 미래"로 되돌리려는 수수께끼의 관리자',
      '도박판으로 헌터들을 빚더미에 앉히고 노예로 부리는 지하 베팅장의 큰손',
      '가문의 비자금과 비리를 쥔 채 후계를 협박하는 늙은 가신 세력',
      '인기를 등에 업고 약자를 짓밟는, 모두가 떠받드는 가짜 인성의 톱스타',
      '게이트 폐쇄를 막아 이권을 유지하려는 헌터·정치인의 검은 동맹',
      '미래 기술을 베껴 시장을 선점하려는 글로벌 빅테크의 산업 스파이망',
      '회귀 전 자신의 모든 것을 빼앗아 간, 지금은 무릎 꿇릴 수 있는 옛 원수',
      '도시 지하에 둥지를 튼 변종 마수 군체와 그것을 키우는 비밀 연구소',
      '게이트 공략 정보를 독점해 약소 헌터의 목숨값으로 배를 불리는 대형 클리어 길드',
      '회귀 전 자신을 노예처럼 부린 소속사 — 지금은 신인을 갈아 넣는 작은 기획사다',
      '국가 자산을 빼돌려 비자금을 굴리는 정치인과 그 돈줄을 쥔 그림자 재벌',
      '각성 능력을 인위적으로 발현시키려다 폭주체를 양산하는 미친 연구 집단',
      '리그·대회를 뒤에서 조작해 신인의 길을 막는 e스포츠계의 카르텔',
      '게이트 너머의 차원을 열어 마계와 거래하려는 흑마법 결사',
      '회귀자만을 추적해 그 미래 지식을 강탈하려는 정체불명의 추적자 조직',
      '도시 전체를 인질 삼아 헌터협회를 협박하는 S급 변절자',
      '의료를 무기로 환자를 볼모 잡는, 병원 재단과 결탁한 거대 보험 자본',
      '신약을 빙자해 사람을 실험체로 쓰는, 정부가 묵인하는 비밀 제약소',
      '연예계 캐스팅과 광고를 좌우하며 신인을 협박하는 방송계의 큰손',
      '게이트 사태를 빌미로 권력을 독차지하려는 비상대책위원회의 수장',
      '회귀 전 세계를 무너뜨린 그 재앙의 씨앗 — 아직은 작은 균열에 불과하다',
      '도박과 사채로 헌터들을 빚의 노예로 만드는 지하 경제의 큰손',
    ],
  },
  {
    key: 'munchkin', label: '먼치킨 전개', icon: '🚀', beat: '사이다·역전',
    faces: [
      '미래에 폭등할 종목을 종잣돈 전부로 사들여, 단숨에 첫 거금을 손에 쥔다',
      '아무도 못 깬 게이트를 최약체로 위장한 채 홀로 클리어해 세상을 놀라게 한다',
      '무명 시절의 미래 톱스타들을 미리 끌어모아, 단숨에 최강 데뷔조를 꾸린다',
      '회귀 전 기억한 정답으로 던전 보스를 약점만 노려 일격에 베어 넘긴다',
      '재능을 숨긴 채 평가전에 나가, 모두를 압도하며 등급을 단번에 뒤집는다',
      '미래의 대박 게임을 먼저 출시해, 작은 사무실을 글로벌 기업으로 키운다',
      '면접·오디션·시험에서 미래 지식으로 완벽한 답을 내놓아 단숨에 발탁된다',
      '저평가된 부동산·기술·인재를 선점해, 경쟁자들이 손쓰기 전에 판을 장악한다',
      '협회의 음모를 미리 알고 함정을 거꾸로 파, 적의 수괴를 자기 발로 걸어 들어오게 한다',
      '미래의 명곡을 먼저 발표해, 무명이던 자신을 하루아침에 차트 1위로 올린다',
      '곧 터질 사건을 미리 막아 영웅이 되고, 단숨에 세간의 신망을 거머쥔다',
      '약점이 보이는 눈으로 강적의 빈틈을 찔러, 격이 다른 상대를 무너뜨린다',
      '미래의 천만 영화 시나리오를 먼저 손에 쥐어, 망해 가던 회사를 일으킨다',
      '경쟁사가 미래에 낼 신제품을 한발 먼저 출시해, 시장을 통째로 선점한다',
      '회귀 전 알던 비리를 폭로해, 자신을 짓밟던 권력자를 단숨에 끌어내린다',
      '아무도 못 본 게이트 공략 루트로, 최단 시간·무사상 클리어 기록을 갈아치운다',
      '미래의 트렌드를 먼저 읽어, 한물간 가게를 줄 서는 맛집으로 탈바꿈시킨다',
      '실력을 감춘 신인이 결승에서 정체를 드러내, 모두를 경악시키며 우승한다',
      '미래의 유망주를 헐값에 영입해, 꼴찌 팀을 단숨에 우승 후보로 만든다',
      '적이 파놓은 함정을 미리 알고 역이용해, 배신자를 그 자리에서 가려낸다',
      '미래에 대박 날 스타트업에 선투자해, 가만히 앉아 천문학적 수익을 거둔다',
      '재벌가 회의에서 미래의 흥망을 근거로 형제들을 압도하며 후계를 거머쥔다',
      '미래 의학 지식으로 불치병 환자를 살려내, 단숨에 의료계의 전설이 된다',
      '경쟁 기획사가 노리던 신인을 한발 먼저 데려와, 적의 계획을 통째로 무너뜨린다',
      '회귀 전 동료들의 능력을 다 알기에, 그들이 미처 각성하기 전에 먼저 포섭한다',
      '미래의 폭락을 알고 공매도로 작전 세력의 돈을 거꾸로 빨아들인다',
      '강등 위기의 길드를 미래 지식으로 재편해, 단숨에 정상권으로 끌어올린다',
      '아직 무명인 미래의 거물을 알아보고 미리 손을 내밀어, 평생의 우군으로 삼는다',
      '미래의 특허를 먼저 출원해, 거대 기업이 자기 앞에 무릎 꿇게 만든다',
      '죽음의 위기를 되감기 능력으로 무르고, 같은 함정을 거꾸로 적에게 돌려준다',
      '협회 평가에서 일부러 약자로 위장하다, 결정적 순간 압도적 실력을 터뜨린다',
      '미래의 히트 IP를 먼저 만들어, 작은 웹툰 한 편을 거대 프랜차이즈로 키운다',
      '회귀 전 기억한 정·재계 인맥을 미리 다져, 결정적일 때 든든한 뒷배로 쓴다',
      '적의 자금줄을 미리 끊어, 거대 세력을 싸우기도 전에 안에서부터 무너뜨린다',
      '미래의 게이트 출현 일정을 팔아, 정보만으로 막대한 부와 영향력을 쌓는다',
      '강적과의 대결을 미래 지식으로 완벽히 시뮬레이션해, 한 수도 어긋남 없이 제압한다',
      '몰락 직전의 가문 사업을 미래 트렌드로 재편해, 업계 1위로 끌어올린다',
      '무명의 자신을 무시하던 자들 앞에서, 숨겼던 진짜 실력을 한순간에 폭발시킨다',
      '미래의 흥행작 캐스팅을 모두 알기에, 단역으로 시작한 자신이 차례차례 인생작을 거머쥔다',
      '회귀 전 죽은 동료를 그가 죽을 그 순간에 정확히 구해, 운명을 한 줄기 비틀어 놓는다',
      '미래의 신기술을 먼저 구현해, 거대 기업이 자신의 특허에 로열티를 바치게 만든다',
      '아무도 모르는 던전의 숨겨진 보스룸을 알기에, 전설급 보상을 홀로 독식한다',
      '미래의 환율·금리 변동을 알고 환차익으로, 회사의 자금난을 하룻밤에 해결한다',
      '경쟁자가 미래에 칠 한 수를 미리 알고, 그 수를 두기도 전에 길을 막아 무력화한다',
      '회귀 전 알던 미제 사건의 진범을, 증거가 만들어지기도 전에 미리 옭아맨다',
      '미래의 국민 예능 포맷을 먼저 기획해, 변두리 방송국을 단숨에 최고 시청률로 올린다',
      '아직 무명인 미래의 슈퍼루키들을 헐값에 묶어, 꼴찌 팀을 우승 후보로 탈바꿈시킨다',
      '미래의 트렌드를 읽어 망해 가던 브랜드를, 한 시즌 만에 완판 신화로 되살린다',
      '적의 비자금 장부를 미리 손에 쥐고, 결정적 순간 한 장으로 거대 세력을 침몰시킨다',
      '미래의 폭락을 알고 공매도로, 자신을 짓밟던 작전 세력의 돈을 통째로 빨아들인다',
      '회귀 전 익힌 최강의 공략 루트로, 데뷔전에서부터 베테랑들의 기록을 갈아치운다',
      '미래의 대형 인수합병을 알고 선수를 쳐, 적이 노리던 회사를 먼저 손에 넣는다',
    ],
  },
  {
    key: 'twist', label: '반전·숨은 진실', icon: '🔮', beat: '운명 전복',
    faces: [
      '자신의 개입으로 미래가 뒤틀려, 더 이상 "내가 아는 미래"가 통하지 않게 된다',
      '자신을 죽인 줄 알았던 그 동료가, 실은 자신을 살리려 누명을 쓴 것이었다',
      '적의 수괴 역시 회귀자였고, 둘은 같은 미래를 두고 정보전을 벌이고 있었다',
      '회귀의 대가로 잃은 줄 알았던 능력이, 결정적 순간 더 강한 힘으로 깨어난다',
      '"원래 미래"로 되돌리려는 관리자의 존재가 드러나, 회귀 자체가 위협받는다',
      '평범한 줄 알았던 자신의 능력이, 실은 모든 시스템을 무효화하는 절대 권능이었다',
      '회귀 전 세계를 멸망시킨 흑막이, 사실은 또 다른 회귀자가 막으려다 실패한 비극이었다',
      '자신을 버린 가족이, 실은 더 큰 위험으로부터 지키려 일부러 밀어낸 것이었다',
      '미래 지식이 통하지 않는 진짜 위기 앞에서, 회귀 후 스스로 쌓은 실력만이 답이 된다',
      '죽은 줄 알았던 회귀 전의 그 사람이, 사실 살아서 자신을 줄곧 지켜보고 있었다',
      '자신이 바꾼 미래가, 더 큰 비극을 막은 단 하나의 올바른 분기였음이 밝혀진다',
      '적이라 믿었던 거대 세력이, 실은 인류를 지키려던 마지막 방패였다',
      '회귀가 한 번이 아니라, 이미 여러 번 반복된 루프의 한 회차였음을 깨닫는다',
      '자신을 노린 암살의 배후가, 가장 믿었던 사람이었음이 드러난다',
      '시스템 음성의 정체가, 미래의 자신이 남긴 마지막 유산이었다',
      '회귀 전 자신을 처형한 명령서가, 사실은 위조된 것이었다',
      '게이트 너머의 적이, 실은 멸망한 또 다른 세계의 마지막 생존자들이었다',
      '자신만 회귀한 줄 알았으나, 동료들 중에도 기억을 가진 회귀자가 숨어 있었다',
      '"원작 강제력"처럼 미래를 정해진 비극으로 끌어당기는 힘의 정체가 드러난다',
      '자신의 회귀가 우연이 아니라, 이 세계가 구원자로 불러낸 필연이었다',
      '적의 집착이 복수가 아니라, 전생의 약속을 지키려는 헌신이었음이 밝혀진다',
      '미래 지식이 무효화된 순간, 그동안 키운 동료들이 빈자리를 채워 준다',
      '천대받던 자신의 핏줄이, 실은 사라진 고대 각성자 가문의 마지막 후예였다',
      '회귀 전 자신을 배신한 줄 알았던 친구가, 끝까지 편이었음이 드러난다',
      '죽음마다 강해진 자신이, 사실 세계의 균형을 위해 설계된 변수였다',
      '적의 최종 병기가, 회귀 전 자신이 구하지 못한 그 사람의 몸이었다',
      '미래를 바꾼 대가로, 사랑하는 누군가의 운명이 자신에게로 옮겨 왔다',
      '자신이 선점한 모든 것이, 사실 적이 미래에 노리던 함정의 미끼였다',
      '회귀 전 마지막 기억이, 누군가의 "다시 만나자"는 약속이었음을 떠올린다',
      '게이트의 근원이, 회귀를 가능케 한 바로 그 힘과 같은 뿌리였다',
      '자신을 끝까지 도운 조력자가, 미래에서 온 또 다른 자신이었다',
      '"미래를 안다"는 우위가 사라진 자리에, 두 인생의 합으로서의 진짜 실력이 선다',
      '적의 진짜 목적이 세계 정복이 아니라, 무한 반복되는 회귀의 고리를 끊는 것이었다',
      '회귀 전 구하지 못한 단 한 사람이, 이번 생의 모든 운명을 바꿀 열쇠가 된다',
      '자신의 미래 지식이 적에게 흘러 들어가, 이제 적도 미래를 알게 되었다',
      '몰락한 줄 알았던 가문의 빚이, 사실 자신을 옭아매려 꾸며진 함정이었다',
      '회귀의 진짜 대가가, 같은 죽음을 무한히 되풀이하는 형벌이었음이 드러난다',
      '자신이 바꾼 미래가, 결국 모두를 구하는 단 하나의 결말로 이어진다',
      '미래 지식을 잃은 진짜 위기 앞에서, 회귀 전엔 없던 동료들의 힘이 새 미래를 연다',
      '상태창의 정체가, 회귀를 가능케 한 게이트 너머 미지의 존재가 보내는 신호였다',
      '자신이 사들인 종목·자산이, 사실 적이 미래에 자신을 옭아매려 깔아 둔 덫이었다',
      '회귀 전 자신을 가장 미워한 자가, 알고 보면 같은 비극을 막으려던 또 다른 자신의 그림자였다',
      '바뀐 미래에서 죽었어야 할 사람이 살아남자, 그 대가로 다른 누군가의 운명이 어긋난다',
      '자신을 끝까지 따른 동료가, 실은 "원래 미래"의 기억을 가진 마지막 회귀자였다',
      '게이트가 처음 열린 이유가, 누군가의 회귀가 세계의 균형을 깨뜨린 결과였음이 밝혀진다',
      '회귀 전 자신이 구하지 못한 그 사람이, 이번 생엔 적의 가장 깊은 약점으로 나타난다',
      '미래 지식이 통하지 않게 된 건, 자신 말고도 판을 흔드는 회귀자가 둘 더 있기 때문이었다',
      '자신의 성공 하나하나가, 사실 더 큰 비극을 막기 위한 보이지 않는 손의 인도였다',
      '회귀의 능력이 자신의 것이 아니라, 죽어 가며 자신에게 미래를 맡긴 누군가의 유산이었다',
      '적의 최종 목적이 세계 정복이 아니라, 끝없이 반복되는 회귀의 고리를 끊는 것이었다',
      '두 번째 인생의 끝에서, 미래 지식이 아니라 두 인생을 함께 산 자신만이 답임을 깨닫는다',
      '자신이 막은 줄 알았던 비극이, 형태만 바꿔 더 큰 모습으로 되돌아오려 한다',
    ],
  },
]

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

// 천 단위 콤마(한국어 로캘)
const fmt = (n: number) => n.toLocaleString('ko-KR')

// 전체(모든 슬롯) 조합수 — "총 조합" 표기용. 도시에 목표: 1조+ 지향.
const TOTAL_COMBOS = SLOTS.reduce((acc, s) => acc * s.faces.length, 1)

// 큰 수를 한국어 단위(조/억/만)로 읽기 쉽게.
function humanCount(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(n >= 1e13 ? 0 : 1).replace(/\.0$/, '') + '조+'
  if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, '') + '억+'
  if (n >= 1e4) return (n / 1e4).toFixed(0) + '만+'
  return fmt(n)
}

// 활성 슬롯들의 조합 가짓수.
function comboCount(activeKeys: string[]): number {
  return activeKeys.reduce((acc, k) => {
    const s = SLOTS.find((x) => x.key === k)
    return acc * (s ? s.faces.length : 1)
  }, 1)
}

// 굴린 결과들을 "프롤로그 → 회귀/각성 → 미래지식 행사 → 세력 대결 사이다 → 메타지식 위기 → 자력 반전" 흐름의 전개 단락으로 엮는다.
function compose(by: Record<string, string>): string {
  const trigger = by.trigger, power = by.power, stage = by.stage
  const goal = by.goal, enemy = by.enemy, munchkin = by.munchkin, twist = by.twist
  const parts: string[] = []
  if (trigger) parts.push(`${trigger}`)
  if (power) parts.push(`이번 생의 무기는 ${power}`)
  if (stage) parts.push(`그가 두 번째 인생을 거는 판은 — ${stage}`)
  if (goal) parts.push(`회귀하자마자 그는 마음먹는다 — ${goal}`)
  if (enemy) parts.push(`그 앞을 가로막는 것은 ${enemy}`)
  if (munchkin) parts.push(`그러나 그는 ${munchkin}`)
  if (twist) parts.push(`그리고 마침내 ${twist}`)
  if (!parts.length) return ''
  return parts.map((p) => p.replace(/[.。]$/, '')).join('. ') + '.'
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface Saved { id: string; text: string; note: string; slots: string; rows: string }

export default function ModfanSignature({ payload }: { payload?: Record<string, unknown> }) {
  // 활성 슬롯(기본 전부) — 저장/복원
  const [active, setActive] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':active')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length) {
          const valid = arr.filter((k: string) => SLOTS.some((s) => s.key === k))
          if (valid.length) return valid
        }
      }
    } catch { /* ignore */ }
    return SLOTS.map((s) => s.key)
  })
  const [results, setResults] = useState<Record<string, string>>({})
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)

  // 보관함 — 저장/복원
  const [saved, setSaved] = useState<Saved[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':saved')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          return arr.filter((s) => s && typeof s.text === 'string').map((s, i) => ({
            id: typeof s.id === 'string' ? s.id : 'sv_' + i,
            text: String(s.text),
            note: typeof s.note === 'string' ? s.note : '',
            slots: typeof s.slots === 'string' ? s.slots : '',
            rows: typeof s.rows === 'string' ? s.rows : '',
          }))
        }
      }
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
      const valid = want.filter((k): k is string => typeof k === 'string' && SLOTS.some((s) => s.key === k))
      if (valid.length) setActive(SLOTS.filter((s) => valid.includes(s.key)).map((s) => s.key))
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

  // 토스트 자동 해제 + 언마운트 정리
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 2000)
    return () => window.clearTimeout(t)
  }, [toast])

  // 복사 피드백 자동 해제 + 정리
  useEffect(() => {
    if (!copiedKey) return
    const t = window.setTimeout(() => { if (mounted.current) setCopiedKey('') }, 1500)
    return () => window.clearTimeout(t)
  }, [copiedKey])

  // 굴림 애니메이션 자동 해제 + 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 380)
    return () => window.clearTimeout(t)
  }, [rolling, results])

  const generate = () => {
    const my = ++nonce.current
    setRolling(true)
    setResults((prev) => {
      if (my !== nonce.current) return prev
      const next: Record<string, string> = { ...prev }
      active.forEach((k) => {
        if (locked[k] && prev[k]) return // 잠긴 슬롯 유지
        const s = SLOTS.find((x) => x.key === k)
        if (!s) return
        let f = pick(s.faces)
        if (f === prev[k] && s.faces.length > 1) f = pick(s.faces) // 연속 중복 완화
        next[k] = f
      })
      return next
    })
  }

  const toggleSlot = (key: string) => {
    setActive((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev // 최소 1개 유지
        return prev.filter((k) => k !== key)
      }
      return SLOTS.filter((s) => prev.includes(s.key) || s.key === key).map((s) => s.key)
    })
  }

  const toggleLock = (key: string) => setLocked((prev) => ({ ...prev, [key]: !prev[key] }))

  const rolledList = active
    .map((k) => ({ slot: SLOTS.find((s) => s.key === k)!, face: results[k] }))
    .filter((r) => r.slot && r.face) as { slot: Slot; face: string }[]

  const by: Record<string, string> = {}
  rolledList.forEach((r) => { by[r.slot.key] = r.face })
  const story = compose(by)
  const hasResults = rolledList.length > 0
  const activeCombos = comboCount(active)

  const slotsLine = () => rolledList.map((r) => r.face).join(' · ')
  const rowsText = () => rolledList.map((r) => `${r.slot.icon} ${r.slot.label}: ${r.face}`).join('\n')

  const copy = (key: string, text: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text)
      .then(() => setCopiedKey(key))
      .catch(() => setToast('이 환경에서는 복사가 지원되지 않습니다.'))
  }

  // 스니펫 라이브러리 저장 — 글감 라이브러리에 현판 회귀 전개를 스니펫으로(여러 도구 공유).
  const saveSnippet = () => {
    if (!story) return
    addToLibrary('snippets', {
      text: `[현판 회귀 전개] ${story}`,
      source: '현판 회귀 시그니처 생성기',
      tags: ['글감', '현대판타지', '회귀', '전개', ...rolledList.map((r) => r.slot.label)],
    })
    setToast('글감 라이브러리(스니펫)에 저장했습니다.')
  }

  // 프로젝트 자료에 추가 — 현판 회귀 전개 한 편을 〈현판 회귀 전개〉 폴더 메모로.
  const toProject = () => {
    if (!story) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const rows = rolledList
      .map((r) => `<p><b>${escHtml(r.slot.icon)} ${escHtml(r.slot.label)} <span style="color:#999;">(${escHtml(r.slot.beat)})</span>:</b> ${escHtml(r.face)}</p>`)
      .join('')
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.8;"><b>⏳ ${escHtml(story)}</b></p>`,
      `<hr/>`,
      rows,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '현판 회귀 전개',
      title: `⏳ ${slotsLine().slice(0, 48) || '현판 회귀 전개'}`,
      bodyHtml,
      synopsis: story.slice(0, 120),
      meta: { 장르: '현대판타지·회귀', 슬롯: rolledList.map((r) => r.slot.label).join(', ') },
    })
    setToast(id ? '프로젝트 자료 〈현판 회귀 전개〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 보관함에 담기
  const stash = () => {
    if (!story) return
    setSaved((prev) => [{
      id: 'sv_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4).toString(36),
      text: story, note: '', slots: slotsLine(), rows: rowsText(),
    }, ...prev])
    setToast('보관함에 담았습니다.')
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
  // 보관 항목을 프로젝트 자료로
  const savedToProject = (s: Saved) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const rows = s.rows.split('\n').filter(Boolean).map((line) => `<p>${escHtml(line)}</p>`).join('')
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.8;"><b>⏳ ${escHtml(s.text)}</b></p>`,
      s.note ? `<p>📝 ${escHtml(s.note)}</p>` : '',
      `<hr/>`, rows,
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '현판 회귀 전개',
      title: `⏳ ${s.slots.slice(0, 48) || '현판 회귀 전개'}`,
      bodyHtml, synopsis: s.text.slice(0, 120), meta: { 장르: '현대판타지·회귀' },
    })
    setToast(id ? '프로젝트 자료 〈현판 회귀 전개〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }
  const tabBtn = (on: boolean): React.CSSProperties => ({ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' })

  return (
    <div style={wrap}>
      <div style={hint}>
        <Emoji e="⏳" /> <b>회귀/각성 계기 · 능력/시스템 · 현대 무대 · 회귀 직후 목표 · 적대 세력 · 먼치킨 전개 · 반전</b>을 무작위로 조합해
        〈프롤로그(죽음·배신·후회) → 회귀/각성 자각 → 할 일 목록(체크리스트) → 첫 미래지식 행사 → 세력 대결·먼치킨 사이다 → 메타지식 무효화 위기 → 자력 청산·반전〉의
        현대판타지 회귀 전개 한 편을 만듭니다. 마음에 드는 슬롯은 <Emoji e="🔒" />로 고정하고 나머지만 다시 생성하세요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'} style={tabBtn(tab === 'forge')}><Emoji e="⏳" /> 생성기</button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'} style={tabBtn(tab === 'saved')}><Emoji e="⭐" /> 보관함 ({saved.length})</button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>
          총 조합 약 <b style={{ color: 'var(--accent)' }}>{humanCount(TOTAL_COMBOS)}</b>
        </span>
      </div>

      {tab === 'forge' && (
        <>
          {/* 슬롯 on/off 칩 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SLOTS.map((s) => {
              const on = active.includes(s.key)
              return (
                <button key={s.key} className="minibtn" onClick={() => toggleSlot(s.key)} aria-pressed={on}
                  title={`${s.label} — 비트: ${s.beat}`}
                  style={{ opacity: on ? 1 : 0.5, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                  <Emoji e={s.icon} /> {s.label}{on ? '' : ' +'}
                </button>
              )
            })}
          </div>

          {/* 슬롯 결과들 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {active.map((k) => {
              const s = SLOTS.find((x) => x.key === k)!
              const face = results[k]
              const isLocked = !!locked[k]
              return (
                <div key={k} style={{ ...card, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-10deg) scale(1.15)' : 'none' }}><Emoji e={s.icon} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {s.label} <span style={{ opacity: 0.7 }}>· {s.beat}</span>
                      <span style={{ marginLeft: 6, opacity: 0.6 }}>({s.faces.length}종)</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: face ? 'var(--text)' : 'var(--muted)' }}>
                      {face ? (rolling && !isLocked ? '…' : face) : '— 생성해 주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => face && copy('row-' + k, `${s.label}: ${face}`)} disabled={!face} title="이 슬롯 복사" style={{ flexShrink: 0 }}>
                    {copiedKey === 'row-' + k ? <>✓</> : <Emoji e="📋" />}
                  </button>
                  <button className="minibtn" onClick={() => toggleLock(k)} title={isLocked ? '고정 해제' : '이 슬롯 고정'} style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 조합 전개 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Emoji e="⏳" /> 현판 회귀 전개
              <span style={{ flex: 1 }} />
              <button className="minibtn" onClick={() => copy('story', story)} disabled={!hasResults} title="전개 복사">{copiedKey === 'story' ? <>✓ 복사됨</> : <Emoji e="📋" />}</button>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.65, color: hasResults ? 'var(--text)' : 'var(--muted)' }}>{story || '슬롯을 생성하면 한 편의 현판 회귀 전개로 엮어 드립니다.'}</div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 140 }} onClick={generate}><Emoji e="⏳" /> 생성 / 다시 굴리기</button>
            <button className="minibtn" onClick={stash} disabled={!hasResults}><Emoji e="⭐" /> 보관</button>
            <button className="minibtn" onClick={saveSnippet} disabled={!hasResults}><Emoji e="📚" /> 글감 저장</button>
          </div>

          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            선택한 슬롯 조합 약 <b style={{ color: 'var(--accent)' }}>{humanCount(activeCombos)}</b>가지 ({fmt(activeCombos)}). 🔒로 고정한 슬롯은 다시 굴려도 유지됩니다.
          </div>

          {/* 연계 */}
          <div className="linkbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
            <button className="linkbtn" onClick={toProject} disabled={!hasResults || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '현재 현판 회귀 전개를 프로젝트 자료 〈현판 회귀 전개〉 폴더에 추가'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('character-forge', { genre: '현대판타지·회귀' })} title="주인공·조력자·빌런 인물 빚기"><Emoji e="🧬" /> 인물 빚기</button>
            <button className="linkbtn" onClick={() => openToolLinked('cliffhanger-forge', { genre: '현대판타지·회귀' })} title="회차 끝 클리프행어 단조"><Emoji e="🪝" /> 클리프행어</button>
            <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck', { genre: '현대판타지·회귀' })} title="메타지식을 흔들 반전 카드 뽑기"><Emoji e="🃏" /> 반전 카드덱</button>
            <button className="linkbtn" onClick={() => openToolLinked('betrayal-gen', { genre: '현대판타지·회귀' })} title="배신 전개 단조"><Emoji e="🗡️" /> 배신 생성기</button>
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐" /></div>
              보관한 전개가 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성기에서 ⭐ 보관을 눌러 마음에 드는 현판 회귀 전개를 모아 보세요.</span>
            </div>
          )}
          {saved.map((s, i) => (
            <div key={s.id} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.slots}</span>
                <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">▼</button>
                <button className="minibtn" onClick={() => copy('sv-' + s.id, s.text + (s.note ? `\n📝 ${s.note}` : ''))} title="복사">{copiedKey === 'sv-' + s.id ? <>✓</> : <Emoji e="📋" />}</button>
                <button className="linkbtn" onClick={() => savedToProject(s)} disabled={!hasProjectBridge()} title="프로젝트 자료에 추가"><Emoji e="📄" /></button>
                <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑" /></button>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.6 }}>{s.text}</div>
              <textarea value={s.note} onChange={(e) => setNote(s.id, e.target.value)} placeholder="이 전개를 내 작품에 어떻게 쓸지 메모…" rows={2}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }} />
            </div>
          ))}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>조합은 출발점일 뿐입니다. 같은 전개라도 내 주인공의 능력(미래 지식·상태창·시스템)·무대(헌터/재벌/연예/주식/스포츠)·"전생의 나" 대비 성장에 맞춰 자유롭게 비틀어 보세요. 고구마는 짧게, 사이다는 누적되게. 1화에 회귀와 첫 사이다를 반드시.</div>
    </div>
  )
}
