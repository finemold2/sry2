// 현대판타지·회귀 서사 장치·전개법 사전 — 이 장르 고유의 서사 장치(회귀 트리거·메타지식 우위·
//  전생 대비·데자뷔 누설·나비효과·선점·회귀자 인식·체크리스트 서사…)와 전개/구조 패턴·페이싱·
//  클라이맥스 관습(메타지식 무효화→자력 승리·전생 청산·두 인생의 합·체급 역전…)을
//  ① 정의 ② 사용법 ③ 예시 ④ 비틀기 로 정리한 로컬 사전. 도시에(사이다/고구마·초반 골든타임·
//  미래지식 우위·나비효과·두 타임라인 관리·헌터/주식/연예 직업 코드 등)에 근거한 자작 데이터.
//  펼침/접힘 + 카테고리 + 검색 + 무작위(중복 회피) + 즐겨찾기 + 클릭복사.
//  연계: 항목/현재 보기를 프로젝트 자료 〈회귀 장치〉 폴더 문서로 추가, 글감 스니펫 저장, 관련 도구 열기.
//  자급식 — react 와 './linkbus' 외 import 없음. 외부 API 없음. 상태는 localStorage 자동 저장/복원(graceful).
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'modfan-devices', name: '현대판타지·회귀 서사 장치·전개 사전', icon: '🌀', group: '장치·전개', genre: '현대판타지·회귀', intro: '회귀 트리거·메타지식 우위·나비효과·선점·전생 청산·메타지식 무효화… 현대판타지/회귀 고유의 서사 장치와 전개·페이싱·클라이맥스 관습을 정의·사용법·예시·비틀기로', w: 680, h: 680 }

const LS = 'sry:tool:modfan-devices:'
const ALL_KEY = '__all__'

// ── 데이터 모델: 한 항목 = 현대판타지·회귀 서사 장치/전개 관습 ──
interface Device {
  name: string         // 한국어 명칭
  aka?: string         // 원어/별칭
  def: string          // 정의 — 이 장치가 무엇인가(도시에 근거)
  how: string          // 사용법 — 어떻게 쓰는가(작법)
  example: string      // 예시 — 전형 장면/결의 묘사
  twist: string        // 비틀기 — 클리셰를 전복하는 변주
}
interface CatDef { key: string; label: string; icon: string; blurb: string; items: Device[] }

// 카테고리 5종(도시에 §4 서사 장치 / §5 전개·구조 / §6 클라이맥스 / §3 관습 / 직업·무대 코드)
const CATS: CatDef[] = [
  {
    key: 'core', label: '회귀 핵심·메타지식', icon: '🌀',
    blurb: '회귀의 심장 — 회귀 트리거, 미래 지식 우위, 전생 대비, 회귀자 인식. 정보 비대칭이 곧 무기다.',
    items: [
      {
        name: '회귀 트리거', aka: 'Regression Trigger',
        def: '주인공이 죽거나 절망적 결말(배신·자살·전사·병사)을 맞은 직후, 인생의 특정 과거 시점으로 의식·기억을 가진 채 되돌아가는 발단 장치. "두 번째 기회"의 무게를 각인하는 1화 후킹의 핵심.',
        how: '죽음의 순간을 강렬한 후회·각오로 압축한 뒤 곧바로 회귀를 발동하라. 프롤로그(절망적 미래) → 1화(회귀 자각 + 첫 미래지식 행사 + 작은 승리) 사이클을 골든타임 안에 끝내라. "익숙한 천장이다", "다시 눈을 떴다", "젊어진 손" 같은 자각 클리셰로 독자가 즉시 상황을 이해하게 하라.',
        example: '회장 자리에서 일가에 독살당하고 눈을 떠 보니 가난한 막내로 돌아간 그날 아침 — "그래, 이 날이었지" 하고 손을 쥐어 본다.',
        twist: '회귀의 "왜"를 미스터리로 — 누가, 무엇이 그를 돌려보냈는가가 후반 빌런·진실과 직결되게 하라. 혹은 회귀 시점이 "원하던 분기"가 아니라 더 나쁜 시점이어서, 먼저 그 시점부터 탈출해야 하는 역설.',
      },
      {
        name: '미래 지식(메타지식) 우위', aka: 'Future Knowledge / Meta-Knowledge',
        def: '주인공만 아는 미래 정보(거시 이벤트·인물 정보·콘텐츠 메타)로 정보 비대칭을 무기 삼는 장르의 엔진. 현대판타지·회귀의 모든 사이다는 결국 여기서 나온다.',
        how: '미래지식을 종류별로 설계하라 — ①거시(경제 위기·코인/주가·재해·게이트 출현일) ②인물(배신자·떡잎 천재·약점) ③콘텐츠(대박 날 노래·시나리오·종목). 1화 안에 "안다는 사실"과 "그 첫 활용"을 반드시 보여라(안 쓰면 계약 위반). 다만 전지(全知)가 긴장을 죽이지 않게 변수를 심어라.',
        example: '"이 종목, 이 사람, 이 날짜… 전부 기억하고 있다." 폭락 전날 전 재산을 빼고, 무명일 때의 미래 거장을 헐값에 영입한다.',
        twist: '미래지식이 "절반만" 맞게 하라 — 큰 줄기는 알지만 세부가 어긋나 매번 도박이 된다. 혹은 지식의 출처(전생)에 거짓·왜곡이 섞여 있어, 믿었던 정보가 함정이 되게 하라.',
      },
      {
        name: '전생의 나 vs 현생의 나', aka: 'Past Self Contrast',
        def: '과거의 무능·실패한 자아와, 회귀로 각성한 현재의 자아를 대비해 성장을 입증하는 구조. 같은 상황을 "다르게" 처리하며 변화의 폭을 시각화한다.',
        how: '전생에서 당한 굴욕·실수를 또렷한 장면으로 남겨 두고, 현생에서 같은 상황을 정반대로 돌파하게 하라. "전생의 나라면 몰랐겠지만" 같은 독백으로 낙차를 강조하라. 외형(말투·시선·태도)의 변화로도 각성을 보여라.',
        example: '전생엔 상사의 폭언에 고개 숙였던 그 회의실에서, 이번엔 데이터를 던지며 정면으로 받아친다 — "그 결정, 3년 뒤 회사를 무너뜨립니다."',
        twist: '"각성한 현재의 나"가 사실 전생의 나보다 더 비열해졌음을 천천히 드러내라(복수에 잠식된 자아). 혹은 전생의 무능했던 선택이 사실 옳았음을 뒤늦게 깨닫는 역설.',
      },
      {
        name: '데자뷔·지식 누설 긴장', aka: 'Knowledge Leak Tension',
        def: '주인공이 미래를 안다는 사실을 들킬 위험에서 오는 서스펜스. 주변의 "어떻게 알았지?", "넌 왜 이렇게 변했어?"라는 의심을 관리하는 장치.',
        how: '미래지식을 그대로 발설하지 말고 예지력·천재성·우연·"감(感)"으로 위장하게 하라. 너무 정확하면 의심을 사니, 가끔 일부러 틀리거나 근거를 꾸며 대게 하라. 누설 위기 자체를 한 화의 긴장 비트로 활용하라.',
        example: '"네가 그걸 어떻게 알아?" 날카로운 시선에, 주인공은 태연히 답한다 — "운이 좋았을 뿐입니다." 등에 식은땀이 흐른다.',
        twist: '상대가 사실 "네가 회귀자인 걸 안다"며 먼저 패를 까게 하라(회귀자 인식). 혹은 누설을 일부러 흘려, 자신을 예언자·신탁으로 신비화하는 역이용 전략.',
      },
      {
        name: '회귀자 인식·회귀자 간 정보전', aka: 'Regressor Detection',
        def: '다른 회귀자·예지자·시스템이 "너도 회귀자냐"를 감지하면서 벌어지는 고급 장치. 정보 우위를 공유한 자들끼리의 두뇌 싸움으로, 후반 빌런 설계의 단골.',
        how: '"나만 회귀한 게 아니었다"는 충격을 중·후반 전환점으로 배치하라. 같은 미래를 아는 적은 주인공의 지식을 무력화하므로, 둘 다 아는 미래에서 누가 한 수 더 읽느냐의 수싸움으로 긴장을 갱신하라. 회귀 횟수·시점 차이를 전력 격차로 설계하라.',
        example: '주인공이 선점하려던 종목을 누군가 먼저 쓸어 갔다. 그 손에 든 메모엔 자신만 알 미래의 날짜가 적혀 있다 — "또 다른 회귀자."',
        twist: '진짜 적이 회귀자가 아니라 "회귀를 일으킨 존재"이거나, 무수히 반복 회귀해 미래를 외운 "루프자"여서 주인공의 모든 수를 이미 봤게 하라. 정보 우위의 완전한 역전.',
      },
      {
        name: '두 번 사는 자의 정서', aka: 'Second Life Sentiment',
        def: '이미 죽은 가족·친구를 다시 만나는 회한, 못 지킨 것을 이번엔 지키려는 동기. 액션 쾌감과 별개로 흐르는 감정선의 축이자, 회귀가 단순 치트가 아닌 이유.',
        how: '회귀 직후 "아직 살아 있는" 소중한 사람(부모·동생)과의 재회에 한 박자 머물러라 — 울컥하는 한 장면이 이후 모든 분투의 연료가 된다. 복수·성공 서사 사이사이에 "이번엔 지킨다"는 사적 동기를 닻으로 박아라.',
        example: '현관문을 열자 전생에 일찍 떠난 어머니가 멀쩡히 저녁상을 차리고 있다. 주인공은 신발도 못 벗고 그 자리에 멈춰 선다.',
        twist: '다시 만난 사람이 전생의 그 사람과 미묘하게 다르게 흘러가(나비효과) 더 큰 상실을 예고하게 하라. 혹은 "지키려는 집착"이 오히려 그 사람의 운명을 망치는 비극.',
      },
      {
        name: '체크리스트형 목표 서사', aka: 'To-Do List Narrative',
        def: '"이번엔 ①가족 살리기 ②그놈 응징 ③이 종목 매수…" 회귀 직후 할 일 목록이 챕터 단위 추진력을 제공하는 구조. 독자에게 명확한 단기 목표와 진척감을 준다.',
        how: '회귀 초반에 구체적 목표 리스트를 명시(독백·메모)하고, 한 항목씩 통쾌하게 지워 나가게 하라. 각 항목을 1~5화 단위 에피소드로 만들어 "한 화 1성취"를 보장하라. 장기 목표(거대 미래 사건)는 리스트 맨 아래 떡밥으로 깔아 두라.',
        example: '수첩에 적힌 목록 — "1. 사채 빚 청산 2. 배신할 동업자 손절 3. 7월 상장주 매수." 첫 항목에 줄을 긋는다.',
        twist: '목록을 지워 갈수록 미래가 바뀌어, 아래 항목이 무의미해지거나 새 위협이 추가되게 하라(나비효과로 리스트 자체가 흔들림). 혹은 "리스트를 다 이루면 무엇이 남는가"의 공허를 결말 주제로.',
      },
    ],
  },
  {
    key: 'device', label: '서사 장치', icon: '🗝️',
    blurb: '선점·나비효과·인재 발굴·복수 청산·각성/시스템 — 회귀 미래지식을 굴리는 동력 장치들.',
    items: [
      {
        name: '선점(先占) 모티프', aka: 'First-Mover Advantage',
        def: '저평가 자산·인재·기술·부동산·종목·아이템을 남보다 먼저 확보하는 회귀물의 대표 행동. "쟤가 미래의 대스타/대박 종목"임을 알고 미리 잡는 쾌감.',
        how: '선점 대상을 "지금은 무가치해 보이지만 미래엔 폭등할 것"으로 설정해, 주변의 비웃음 → 훗날 압도적 역전의 낙차를 만들어라. 선점에 종잣돈·인맥 같은 현실적 제약을 걸어, 단순 줍기가 아니라 "어떻게 확보하느냐"의 영리함을 보여라.',
        example: '아무도 거들떠보지 않는 변두리 땅과 무명 가수 지망생 — "10년 뒤, 이 땅엔 신도시가, 저 아이는 월드스타가 된다." 전 재산을 건다.',
        twist: '선점하려던 미래의 대박이 "주인공이 개입한 탓에" 일어나지 않게 하라(관측이 결과를 바꿈). 혹은 모두가 같은 미래를 알아 선점 경쟁이 과열되는 "정보 인플레" 세계.',
      },
      {
        name: '나비효과·분기 변동', aka: 'Butterfly Effect',
        def: '주인공의 개입으로 원래 미래가 바뀌기 시작하는 장치. 후반 "내가 아는 미래가 더는 안 통한다"는 위기로 전환되어, 메타지식 의존을 끊고 긴장을 회복시키는 정석.',
        how: '초반엔 미래지식이 척척 맞다가, 개입이 누적될수록 어긋나는 징조를 점진적으로 흩뿌려라. "분명 이날 일어났어야 할 사건이… 안 일어난다." 작은 변주부터 시작해 중반에 큰 변동으로 키워라. 바뀐 미래를 새 떡밥으로 재활용하라.',
        example: '전생의 기억대로라면 오늘 터졌어야 할 대형 스캔들이 잠잠하다. 주인공이 무심코 바꾼 한 통의 전화가 역사를 비틀어 놓았다.',
        twist: '주인공이 "좋게" 바꾼 미래가 더 끔찍한 결말로 수렴하게 하라(개악). 혹은 아무리 바꿔도 큰 비극은 형태만 달리해 반드시 일어나는 "운명의 관성".',
      },
      {
        name: '미래의 거물 인재 발굴·포섭', aka: 'Talent Scouting',
        def: '아직 무명인 미래의 천재·거물을 알아보고 미리 곁에 두는 장치. 회귀자가 키운 세력·인맥의 핵심이 된다(연예·스포츠·기업·헌터물 공통).',
        how: '발굴 대상이 "지금은 별 볼 일 없거나 망가져 있는" 상태에서 출발하게 해, 주인공의 안목을 극적으로 보여라. 단순 영입이 아니라 그 인물의 결핍·상처를 회귀자가 채워 주는 관계 서사로 깊이를 더하라. 발굴한 인재가 훗날 결정적 순간에 보답하게 하라.',
        example: '술집에서 노래하다 쫓겨난 무명 청년에게 명함을 건넨다 — "5년만 나를 믿어. 너는 이 나라 최고의 보컬이 된다." 청년은 코웃음을 친다.',
        twist: '미래의 거물이 회귀자의 개입으로 "거물이 되지 못한" 평범한 사람으로 남게 하라. 혹은 영입한 천재가 사실 또 다른 회귀자거나, 미래에 주인공을 배신할 자임을 알면서도 곁에 둬야 하는 딜레마.',
      },
      {
        name: '복수·청산의 분할 배치', aka: 'Staged Vengeance',
        def: '전생에서 나를 망친 인물·조직에 대한 응징. 초반의 작은 통쾌함과 후반의 대형 청산을 분리 배치해 카타르시스를 계단처럼 쌓는 장치.',
        how: '원수를 한 번에 끝내지 말고 "작은 응징 → 중간 견제 → 최종 청산"의 단계로 나눠라. 초반엔 원수가 우위에 있다가 서서히 역전되게 해 독자의 분노를 차곡차곡 장전하라. 응징의 대상·방식·타이밍을 구체적으로(법·돈·폭로·실력으로) 설계하라.',
        example: '전생에 자신을 짓밟은 회장 앞에, 이번엔 인수자가 되어 나타난다 — "당신 회사, 오늘부로 제 겁니다." 작은 응징들의 끝에 선 한 방.',
        twist: '청산의 순간 원수가 이미 몰락해 "응징할 가치조차 없어진" 허무를 그려라. 혹은 복수를 완성하고 보니 진짜 원흉은 따로 있었고, 그동안 응징한 자들은 또 다른 피해자였음을 폭로.',
      },
      {
        name: '재능·실력 은닉(회칼)', aka: 'Hidden Talent',
        def: '회귀로 얻은 압도적 실력을 일부러 감추다 결정적 순간에 폭발시키는 장치. "재능을 숨김"은 현대판타지의 빈출 클리셰이자 사이다의 장전.',
        how: '평범·무능을 가장하며 주변의 무시를 쌓되, 독자에겐 진짜 실력을 슬쩍슬쩍 흘려 우월감을 공유하라. 은닉이 풀리는 "폭로의 순간"을 가장 굴욕적인 무대(평가전·오디션·면접) 위에 설계해 반전 효과를 극대화하라.',
        example: '신입 취급당하던 말단이, 모두가 못 푼 위기 앞에서 처음으로 진짜 실력을 드러낸다 — 회의실이 일순 정적에 휩싸인다.',
        twist: '은닉이 너무 길어 "진짜 무능한 줄 알았던" 결정적 기회를 놓치게 하라(과한 겸양의 대가). 혹은 숨긴 실력의 정체가 사실 떳떳지 못한 것(전생의 죄·금기)이라 드러낼수록 자신이 위태로워지는 구조.',
      },
      {
        name: '각성·시스템 결합(헌터형)', aka: 'Awakening + System',
        def: '회귀에 더해 각성·게이트·시스템 창(레벨·스탯·스킬)을 얹어, 미래지식 우위 + 수치화된 성장을 동시에 굴리는 결합형 장치. 헌터물 회귀의 핵심.',
        how: '회귀자가 "게이트 출현일·등급·공략법"을 미리 알아 남들보다 빠르게 각성·성장하게 하라. 시스템 창은 성장의 눈금자로 써서 레벨업·스킬 획득을 회차 보상 비트로 배치하라. 미래지식(어디에 무엇이)과 시스템(얼마나 강한가)을 양 축으로 교차시켜라.',
        example: '"3일 뒤, 강남에 S급 게이트가 열린다. 전생엔 수백이 죽었지." 아무도 모를 그 자리에서 홀로 첫 보스를 잡고 [레벨 업] 알림을 본다.',
        twist: '회귀했더니 시스템 규칙·게이트 일정이 전부 바뀌어 미래지식이 무용해지게 하라. 혹은 시스템이 "회귀자를 감시·통제하려는" 의지를 가진 존재임을 폭로.',
      },
      {
        name: '미래 사건 예고·약속 이행', aka: 'Setup & Payoff',
        def: '미래의 거대 사건(대재해·코인 폭등·특정 인물의 흥망·게이트 발생일)을 예고했다가 반드시 회수하는 장치. 예고한 약속을 지켜야 회귀물의 신뢰가 산다.',
        how: '회귀 직후 원거리 떡밥(거대 미래 사건)과 단기 회수 떡밥을 병렬로 깔아, 장단기 동력을 동시에 굴려라. 예고한 날짜·사건은 카운트다운처럼 긴장을 누적시키다 정확히 회수하라. 회수 장면을 "그날이 왔다"의 카타르시스로 연출하라.',
        example: '"올여름, 폭우로 그 강이 범람한다. 전생엔 손쓸 새도 없었지." 달력에 동그라미를 친 그날, 주인공은 모두를 미리 대피시키고 둑 위에 선다.',
        twist: '예고한 대사건이 주인공의 개입으로 "일어나지 않아" 아무도 그의 경고를 믿지 않게 하라(예언자의 저주). 혹은 사건은 일어나되 예상과 전혀 다른 형태로 와, 미래지식이 오히려 방심을 부른 함정이 되게 하라.',
      },
      {
        name: '시간 좌표의 명시성', aka: 'Explicit Timeline',
        def: '"20○○년 ○월"처럼 구체 연도·시점을 명시해 미래지식의 디테일과 리얼리티를 떠받치는 장치. 현실 트렌드·사건의 정교한 모사가 회귀물 몰입의 핵심.',
        how: '회귀 시점과 주요 미래 사건의 날짜를 구체적으로 박아, 독자가 "그 시절"을 또렷이 떠올리게 하라(실명·실제 기업은 변형·가공해 법적 함정을 피하라). 시점을 명시할수록 선점·예고의 긴장이 살아난다.',
        example: '"2007년 3월. 아직 그 회사는 차고에서 시제품을 만들고 있다." 주인공은 정확히 그 시점에 찾아가 지분을 사들인다.',
        twist: '회귀한 시점의 "정확한 날짜"를 주인공이 모르게 하라 — 며칠 차이로 선점 타이밍이 어긋나는 긴장. 혹은 회귀로 도착한 세계가 전생과 미세하게 다른 "평행 연표"여서 날짜가 어긋나는 구조.',
      },
    ],
  },
  {
    key: 'structure', label: '전개·구조', icon: '🧭',
    blurb: '3막 골격·에피소드 사이클·수치 성장·두 타임라인 관리·세력화 — 회귀 장편의 페이싱.',
    items: [
      {
        name: '회귀물 3막 골격', aka: 'Three-Act (Regression)',
        def: '1막(각성·정착: 회귀 자각→첫 성공으로 종잣돈·명성·기반 확보)→2막(확장·세력화: 사업/팀/소속을 키우며 미래지식이 점차 변동)→3막(정점·청산: 메타지식 무효화된 진짜 위기→자력 돌파→최종 청산)으로 이어지는 웹소설 변형 3막.',
        how: '1막에서 미래지식으로 빠른 기반을 닦아 "이 작품의 맛"을 증명하고, 2막에서 세력을 키우며 나비효과로 긴장을 갱신하라. 3막에선 미래지식이 안 통하게 만들어, 그동안 쌓은 본인 실력·인맥으로 이기게 하라(치트만으로 끝내지 않는다).',
        example: '1막: 종잣돈으로 회사를 세운다 → 2막: 라이벌 기업·중간 빌런과 인수전 → 3막: 아무도 예측 못 한 위기에서 키운 사람들과 함께 정상에 선다.',
        twist: '막의 순서를 비틀어 "이미 모든 걸 이룬 정점"에서 시작해 거꾸로 무너뜨려라. 혹은 1막의 빠른 성공이 사실 함정이어서, 2막이 통째로 추락·재건이 되게 하라.',
      },
      {
        name: '에피소드 단위 사이클', aka: 'Episode Cycle',
        def: '[목표 제시→미래지식/실력 발동→방해·위기→통쾌한 해결→보상 수치화→다음 떡밥]을 3~10화 단위로 반복하는 회귀물의 기본 회전. "한 화 1쾌감"을 보장한다.',
        how: '매 사이클마다 명확한 단기 목표(종목 매수·인재 영입·게이트 공략)를 걸고, 미래지식이나 숨긴 실력으로 통쾌하게 해결하라. 끝마다 보상을 수치(재산·랭킹·구독·레벨)로 갱신하고, 다음 사이클의 떡밥을 한 조각 남겨라.',
        example: '이번 회차: 부실주를 미리 손절(목표) → 폭락 직전 전량 매도(발동) → 작전 세력의 방해(위기) → 역이용해 두 배 수익(해결) → "통장 잔고 23억"(보상) → "다음은 그 사람을 만날 차례"(떡밥).',
        twist: '사이클을 의도적으로 "실패"시켜 미래지식이 안 통하는 충격을 줘라(나비효과 도입부). 혹은 단위 에피소드들이 사실 누군가 설계한 거대한 판이었음을 후반에 폭로.',
      },
      {
        name: '수치 성장의 주기적 갱신', aka: 'Quantified Growth',
        def: '레벨·랭킹·재산·인지도·소속·직급 등 수치/등급화된 성장 지표를 주기적으로 보고해, 독자가 진척감을 체감하게 하는 페이싱 장치.',
        how: '성장 지표를 한 가지가 아니라 여러 축(돈·명성·실력·세력)으로 두고, 사이클마다 한 축씩 갱신하라. 작은 승리→중간 승리→대형 청산의 계단으로 수치를 누적시켜라. 단, 수치 인플레가 긴장을 죽이면 "돈으로 못 푸는 위기"로 종류를 갱신하라.',
        example: '"무명 → 신인상 → 음원 차트 진입 → 첫 1위 → 올킬." 회차마다 갱신되는 차트 순위가 곧 성장의 카타르시스가 된다.',
        twist: '수치가 최고점을 찍는 순간 그 모든 것이 무의미해지는 사건(상실·폭락·몰락)을 배치해, "숫자로 환원되지 않는 것"을 주제로 끌어올려라.',
      },
      {
        name: '두 타임라인 관리', aka: 'Dual Timeline',
        def: '①전생에서 실제로 벌어진 "원래 미래"와 ②주인공 개입으로 변해 가는 "새 미래"를 분리해 추적하는 구조. 작가가 둘을 따로 관리해야 설정 모순이 안 생긴다.',
        how: '원래 미래(주인공만 아는 기준선)와 새 미래(독자가 보는 현재)를 명확히 구분해 서술하라. 나비효과로 둘이 갈라지는 지점을 의식적으로 표시하고, "원래라면 ~했을 텐데 이번엔" 식으로 낙차를 보여라. 변동 누적을 메모처럼 관리해 일관성을 지켜라.',
        example: '주인공의 머릿속엔 두 개의 연표가 겹쳐 있다 — 회사가 망했던 원래 미래, 그리고 그가 살려 낸 새 미래. 두 선이 점점 멀어진다.',
        twist: '주인공조차 "원래 미래"를 점점 잊거나 헷갈리게 해(기억의 마모) 정보 우위가 자연 소멸하게 하라. 혹은 두 타임라인이 어느 순간 충돌·합류해 "어느 쪽이 진짜인가"의 혼란을 만들어라.',
      },
      {
        name: '세력화·기반 확장', aka: 'Faction Building',
        def: '회귀자가 사업/길드/팀/기획사/구단/가문을 키워 개인 무력에서 조직 영향력으로 스케일을 확장하는 2막의 핵심 전개. 미래지식이 작동할 무대(세력 지도)를 직접 짓는다.',
        how: '발굴한 인재·확보한 자산을 하나의 세력으로 묶고, 그 세력의 흥망 타임라인을 미래지식과 결합하라. 라이벌 세력·중간 빌런과의 대결을 단계적 판돈 상승으로 배치하라. 주인공이 "혼자"에서 "함께"로 이동하며 감정 닻을 만들어라.',
        example: '뒷골목 무명들을 모아 차린 작은 기획사가, 미래의 히트곡들을 선점하며 어느새 업계를 흔드는 거대 레이블로 자란다.',
        twist: '키운 세력이 너무 커져 주인공의 통제를 벗어나거나, 내부에서 또 다른 야심가가 자라 새 위협이 되게 하라. 혹은 세력을 키울수록 전생의 적들이 결집하는 역효과.',
      },
      {
        name: '초반 골든타임', aka: 'Opening Golden Time',
        def: '연재 1~5화 안에 회귀 트리거·미래지식·차별점·첫 사이다를 즉시 제시해야 한다는 진입 규칙. 회귀물은 "이미 답을 아는 자"이므로 답답함이 더 치명적이다.',
        how: '1화에 회귀 자각 + 첫 미래지식 행사 + 작은 승리를 압축하라(프롤로그+1~2화 내). 도입부 인포덤프를 피하고, "이번엔 다르다"는 목표·차별화를 빠르게 선언하라. 초반에 작은 사이다를 한 번 터뜨려 맛을 증명하라.',
        example: '프롤로그에서 비참하게 죽고, 1화 첫 장면에서 과거로 돌아와 곧장 로또 번호·종목·면접 답을 손에 쥔다. 5화 안에 첫 통장 잔고를 찍는다.',
        twist: '의도적 "저점 출발"로 1화의 주인공을 철저히 바닥에 두어, 미래지식조차 당장은 못 쓰는 무력함에서 상승 폭을 극대화하라(단, 1화 내 반전 약속은 분명히).',
      },
      {
        name: '회차 클리프행어', aka: 'Per-Episode Hook',
        def: '매 회차(약 5천 자) 끝에 다음 화를 부르는 반전·도발·결정의 순간을 거는 연재형 후킹. 단기·장기 떡밥을 병렬로 굴린다.',
        how: '회차 끝마다 또렷한 미끼 질문(누가? 왜? 어떻게?)을 남기되, 회귀물답게 "주인공이 아는 미래 vs 독자가 모르는 전개"의 낙차를 미끼로 써라. 폭로·등장 직전에서 끊고, 던진 미끼는 반드시 회수하라.',
        example: '"엘리베이터 문이 닫히기 직전, 전생에 나를 죽인 그 얼굴이 웃으며 들어섰다 —" 회차가 끝나며 다음 화 결제를 부른다.',
        twist: '클리프행어를 의도적으로 김빠지게 해소해 과장된 기대를 비틀거나, 한 회차를 완결감 있게 닫아 호흡을 환기하는 역설적 후킹.',
      },
    ],
  },
  {
    key: 'climax', label: '클라이맥스·페이싱', icon: '⚔️',
    blurb: '메타지식 무효화→자력 승리, 전생 청산, 두 인생의 합, 체급 역전 — 절정의 카타르시스 관습.',
    items: [
      {
        name: '메타지식 붕괴 후의 자력 승리', aka: 'Earned Victory',
        def: '최종 국면에서 "미래를 아는 이점"이 사라지거나(나비효과 누적·적도 회귀자) 무효화된 뒤, 회귀 후 스스로 쌓은 실력·동료·기반으로 이기는 장르의 도덕. 치트만으로 끝내지 않는다.',
        how: '3막 진입 전 미래지식을 점진적으로 무력화하라(아는 미래가 다 어긋남). 그 위기를 1막부터 쌓은 본인의 진짜 실력·인맥·경험으로 돌파하게 해, 회귀가 "출발선"이었을 뿐 승리는 "노력의 결과"임을 증명하라.',
        example: '"이제 내가 아는 미래는 없다." 미래지식이 통하지 않는 마지막 결전, 주인공은 회귀 후 두 번째 인생 내내 단련한 진짜 실력으로 적을 무너뜨린다.',
        twist: '미래지식이 끝까지 유효하지만, 그것을 "쓰지 않기로" 선택하고 자력으로 이기게 하라(치트 포기). 혹은 자력 승리조차 사실 더 큰 존재가 짜 둔 각본이었음을 폭로해 자유의지 주제로 끌어올려라.',
      },
      {
        name: '전생 청산의 완결', aka: 'Final Reckoning',
        def: '1막에서 못 갚은 큰 빚(나를 죽인/배신한 근원 빌런, 망친 기업/조직)을 최종장에서 압도적으로 청산하는 관습. 분할 배치한 복수의 종착점.',
        how: '근원 빌런의 강함·악행을 미리 충분히 증명해 둬야 청산이 값지다. 청산을 단순 폭력이 아니라 "그동안 쌓은 모든 것(돈·실력·인맥·증거)"이 한 점에 모이는 장면으로 설계하라. 전생의 굴욕 장면과 대구를 이루게 연출하라.',
        example: '전생에 자신을 독살한 일가가, 이번엔 자신이 인수한 회사의 법정에서 주인공이 모은 증거 앞에 무너진다 — "이번엔 내가 끝냅니다."',
        twist: '청산의 순간 빌런이 "사과·전향"해 응징의 명분이 흔들리게 하라. 혹은 근원 빌런이 사실 또 다른 회귀자/피해자였음을 드러내, 청산을 비극으로 전환.',
      },
      {
        name: '두 인생의 합으로서의 승리', aka: 'Sum of Two Lives',
        def: '전생의 한(恨) + 현생의 성취가 한 점에 모이는 정서적 정점. 못 지킨 사람을 이번엔 지켜 내는, 액션과 별개의 감정선 클라이맥스.',
        how: '전생에서 잃은 것(사람·기회·존엄)을 현생의 마지막 국면에서 되찾거나 지켜 내게 하라. 두 인생의 기억이 겹치는 순간(같은 장소·같은 인물)을 정점에 배치해, 회귀가 단순 성공이 아닌 "구원"이었음을 보여라.',
        example: '전생엔 눈앞에서 잃었던 동생을, 이번엔 같은 자리에서 끝내 끌어안는다. 두 번의 인생이 그 한 장면에서 비로소 하나로 합쳐진다.',
        twist: '아무리 애써도 끝내 못 지키는 단 한 사람을 남겨, 회귀로도 바꿀 수 없는 것의 무게를 그려라. 혹은 "지킨 것"이 사실 그 사람을 더 불행하게 만들었음을 결말에서 드러내라.',
      },
      {
        name: '체급 역전·위치 역전', aka: 'Status Reversal',
        def: '한때 자신을 짓밟던 거대 존재(회장·재벌·강자)를 이제는 내려다보는 위치로 뒤집는 시각적 카타르시스. 회귀물의 가장 직관적인 사이다.',
        how: '전생의 "올려다보던" 구도와 현생의 "내려다보는" 구도를 또렷한 대구로 연출하라(같은 사무실·같은 식탁·같은 무대). 역전의 순간을 길게 끌지 말고, 충분히 장전한 분노를 짧고 통쾌하게 터뜨려라.',
        example: '전생엔 명함도 못 내밀던 그 회장실에, 이번엔 새 주인이 되어 들어선다. 회장이 앉던 의자에 천천히 등을 기댄다.',
        twist: '역전의 정점에서 "올라선 자리"가 사실 텅 빈 것이었음을 깨닫게 하라(정상의 공허). 혹은 짓밟던 자를 내려다보는 순간, 자신이 전생의 그 가해자와 똑 닮아 있음을 발견.',
      },
      {
        name: '사이다·고구마 리듬', aka: 'Catharsis Pacing',
        def: '답답함(고구마)을 쌓고 시원한 응징·역전(사이다)으로 해소하는 정서 리듬. 회귀물은 "이미 답을 아는 자"이므로 고구마가 더 치명적이라 특히 짧아야 한다.',
        how: '고구마는 "사이다를 위한 장전"일 뿐, 너무 길면 회귀물에선 즉시 이탈한다. 굴욕·억울함을 또렷이 쌓되 빠르게 통쾌하게 되갚아라. 미래지식이 있는 만큼, 답답함의 원인은 "능력 부족"이 아니라 "아직 못 밝히는 사정"으로 설계하라.',
        example: '무시당하던 막내가 회의 끝에 단 한마디로 판을 뒤집는다 — 쌓였던 고구마가 단번에 사이다로 내려간다.',
        twist: '사이다 끝에 공허·대가를 남겨 단순 응징을 넘어서라. 혹은 고구마를 끝내 사이다로 갚지 않고 용서·초탈로 승화해 기대를 비튼다.',
      },
      {
        name: '성취·안정형 엔딩', aka: 'Stable Ending',
        def: '안정된 일상·가족·제국 완성·후일담으로 닫는 마침표. "두 번째 인생은 행복했다"류 정서적 안착으로, 현대판타지·회귀는 비극보다 성취·안정 엔딩을 선호한다.',
        how: '거대 청산을 끝낸 뒤 에필로그에서 회귀 직후 못 지킨 것들이 모두 제자리를 찾은 풍경을 그려라. 처음 회귀하던 그 아침(익숙한 천장)과 대구를 이루는 평온한 일상으로 닫아 "두 인생의 합"을 정서적으로 봉인하라.',
        example: '오랜 세월이 흐른 뒤, 늙지 않은 가족과 둘러앉은 저녁상. 주인공은 처음 회귀하던 그날의 천장을 올려다보며 조용히 웃는다.',
        twist: '평온한 엔딩 끝에 "다시 눈을 떴다"를 한 줄 더해, 또 한 번의 회귀(혹은 루프)를 암시하라. 혹은 모든 걸 이룬 자가 "이젠 무엇을 위해 살지" 묻는 여운으로 닫아라.',
      },
      {
        name: '파워·정보 인플레 관리', aka: 'Power & Info Creep',
        def: '주인공이 미래지식+실력으로 너무 강해져 긴장이 빠지는 문제를, 위협의 "종류"를 갱신해 관리하는 페이싱 기법.',
        how: '주인공이 무적이 되면 적을 더 세게 만드는 대신 "미래지식이 안 통하는 위협"으로 갱신하라(나비효과·또 다른 회귀자·돈으로 못 푸는 딜레마). 물리→경제→정치→내면·관계로 위기의 결을 바꿔, 강함이 무의미해지는 새 전장을 열어라.',
        example: '천하의 재력가가 된 주인공 앞에, 돈으로도 미래지식으로도 어쩌지 못하는 단 하나의 문제 — 끝내 마음을 못 돌리는 한 사람이 놓인다.',
        twist: '강함의 정점에서 주인공을 추락시켜라(파산·능력 봉인·기억 상실). 미래지식을 잃은 회귀자가 맨몸으로 다시 오르는 구조로 긴장을 재점화한다.',
      },
    ],
  },
  {
    key: 'job', label: '직업·무대 코드', icon: '🏙️',
    blurb: '주식·연예·헌터·스포츠·재벌·작가 — 현실 시스템을 무대로 미래지식이 빛나는 직업군 코드.',
    items: [
      {
        name: '경제·재벌·주식 코드', aka: 'Finance / Chaebol',
        def: '종잣돈→상장→떡상→인수합병으로 자본을 굴려 복수와 성공을 동시에 이루는 회귀 경제물의 코드. "미래 지식으로 자본을 굴린다"의 대표 무대.',
        how: '주식시장·IPO·M&A·부동산의 현실 규칙을 정확히 그려야 미래지식 우위가 빛난다. 저점 매수·작전·공매도 같은 구체적 수법과, 그 돈으로 무엇을(가족·복수·세력) 이루는지를 묶어라. 종잣돈 마련 과정에 현실적 제약을 걸어 첫 성공을 값지게 하라.',
        example: '회귀 직후 전 재산을 끌어모아 폭등 직전 종목에 몰빵, 그 종잣돈으로 전생에 자신을 버린 회사를 거꾸로 인수한다.',
        twist: '미래의 주가가 "주인공의 매수 자체로" 바뀌어 예상이 빗나가게 하라(시장에 영향을 주는 거물의 역설). 혹은 돈을 다 모았더니 정작 지키려던 사람이 곁에 없는 공허.',
      },
      {
        name: '연예계·아이돌 코드', aka: 'Entertainment / Idol',
        def: '망한 연예인·연습생이 데뷔 직전으로 회귀해, 미래의 히트곡·드라마·예능을 선점하는 거대 하위 클러스터. "데뷔조·역주행·차트 올킬"의 무대.',
        how: '연습생 시스템·기획사·음원 차트·오디션의 절차를 사실적으로 그려라. 미래에 대박 날 콘텐츠(노래·시나리오·웹툰)를 본인이 선점하고, 무명 시절의 미래 스타들을 발굴·포섭하라. 무대·차트 순위를 수치 성장 지표로 갱신하라.',
        example: '데뷔도 못 하고 잊힌 연습생이 그 시절로 돌아와, 5년 뒤 세상을 뒤흔들 곡을 지금 무대에 올린다 — "이번엔 데뷔 못 하면 죽는다."',
        twist: '선점한 미래의 히트곡이 "주인공이 부르니" 망하게 하라(작품은 부르는 이가 만든다). 혹은 발굴한 미래 스타가 회귀자의 개입으로 무대 공포증을 얻어 데뷔조차 못 하는 나비효과.',
      },
      {
        name: '헌터·게이트 코드', aka: 'Hunter / Gate',
        def: '평범한 현대 일상과 게이트/던전이 공존하는 "각성 이후의 현대"를 무대로, 게이트 출현일·등급·공략법을 미리 아는 회귀 헌터물 코드. 시스템·협회·길드가 세계관 뼈대.',
        how: '게이트 발생일·마수 약점·히든 던전 위치 같은 미래지식을 헌터협회·길드 구조와 결합하라. S급/EX급 등급제와 스탯·스킬·시스템 창으로 성장을 수치화하고, 전생에 죽은 동료를 이번엔 살리는 감정선을 얹어라.',
        example: '"내일 정오, 명동에 첫 던전 브레이크가 일어난다. 전생엔 늦었지." 아직 각성자조차 드문 그날, 홀로 게이트 앞에 서서 카운트를 센다.',
        twist: '회귀로 도착한 세계의 게이트 규칙·일정이 전부 바뀌어 미래지식이 무용해지게 하라. 혹은 게이트·시스템 자체가 회귀를 일으킨 배후이며, 회귀자를 시험·통제하는 장치였음을 폭로.',
      },
      {
        name: '스포츠·프로게이머 코드', aka: 'Sports / E-Sports',
        def: '은퇴·실패한 선수가 전성기 직전 또는 유망주 시절로 회귀해, 미래의 전술·메타·대진을 미리 아는 채로 정상을 노리는 코드. "전문성+미래지식" 디테일 경쟁의 무대.',
        how: '종목의 규칙·훈련 체계·리그 구조·메타 변화를 사실적으로 그려라. 미래에 유행할 전술·빌드·기용을 선취하고, 미래의 스타 선수·감독을 발굴하라. 랭킹·전적·연봉을 성장 지표로 갱신하며 라이벌과의 대결을 단계적으로 키워라.',
        example: '부상으로 은퇴했던 선수가 데뷔 직전으로 돌아와, 몇 년 뒤에야 정립될 전술을 지금 코트에서 펼친다 — 해설진이 경악한다.',
        twist: '미래의 메타가 "주인공이 선보인 탓에" 앞당겨져, 곧 모두가 따라 하며 우위가 사라지게 하라. 혹은 회귀로도 못 고치는 몸의 한계(고질적 부상)가 끝내 발목을 잡는 구조.',
      },
      {
        name: '전문직·창작 코드', aka: 'Pro / Creator',
        def: '작가·셰프·의사·교사·기획자·구단주 등 현대 전문 직업에 회귀를 결합해, "전문성+미래지식"으로 세분화한 3세대 코드. 직업군별 사실 디테일이 경쟁력.',
        how: '해당 직업의 업계 용어·절차·성공 경로를 정확히 고증하라. 미래에 흥할 트렌드·작품·기술을 선점하되, 단순 베끼기가 아니라 회귀자의 안목·노력으로 재해석하게 하라. 직업 특유의 성취 지표(베스트셀러·미슐랭·시청률)를 성장 곡선으로.',
        example: '연재 끊긴 무명 작가가 데뷔 전으로 돌아와, 미래에 대박 날 장르의 문법을 누구보다 먼저 펼쳐 보인다 — "이번엔 안다, 독자가 무엇을 원하는지."',
        twist: '선점한 미래의 명작을 "내 것으로" 쓰는 데서 오는 표절 죄책감을 정면으로 다뤄라. 혹은 미래지식으로 만든 작품이 정작 회귀로 바뀐 세상에선 시대에 안 맞아 외면받게 하라.',
      },
      {
        name: '현실 시스템=무대', aka: 'Reality as Arena',
        def: '주식시장·연예계·스포츠리그·대기업·고시·창업 생태계 등 "현실 규칙"을 정확히 그려야 미래지식의 우위가 빛난다는 현대판타지의 대원칙. 마법적 고풍보다 "현실 위 한 스푼의 비현실".',
        how: '무대가 되는 현실 시스템의 절차·권력 블록·흥망 타임라인을 자료로 받쳐라. 미래지식은 그 정교한 현실 위에서만 무기가 된다 — 시스템을 대충 그리면 우위가 설득력을 잃는다. 도시적·동시대적·실리적 분위기를 유지하라.',
        example: '면접·계약·상장·평가전 같은 "현실의 관문"을 정확히 묘사하고, 그 안에서 미래를 아는 주인공이 규칙을 합법적으로 최적화한다.',
        twist: '현실 시스템에 단 하나의 비현실(각성·시스템·회귀자 감지)만 박아, 일상과 초현실의 경계를 흐려라. 혹은 그 "현실"이 사실 누군가 설계한 시뮬레이션·게임이었음을 폭로.',
      },
    ],
  },
]

// 조합수: 각 항목을 [정의·사용법·예시·비틀기] 4개의 독립 "관점 슬롯"으로 보면,
// 무작위 영감은 (항목 × 항목 × 항목)의 서로 다른 3장 뽑기 + 슬롯 배정으로 막대한 조합을 만든다.
const ALL_ITEMS = (): { cat: CatDef; item: Device }[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))
const TOTAL = CATS.reduce((n, c) => n + c.items.length, 0)
// 영감 조합수: 서로 다른 3항목 순열(P(N,3)) × 4개 관점 슬롯 배정(4^3) — 표기용 추정치.
const combos = (() => {
  const N = TOTAL
  const perm3 = N * (N - 1) * (N - 2)
  return perm3 * 4 * 4 * 4
})()
const fmtCombos = (n: number): string => {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(2) + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(1) + '만'
  return String(n)
}

// ── 한글 조사 자동 선택 헬퍼 ──────────────────────────────────────────────
// 앞 글자의 받침 유무를 보고 실제 조사를 하나 골라 붙인다("을(를)" 같은 이중표기 금지).
const hasJong = (s: string): boolean => {
  const ch = (s || '').trim()
  if (!ch) return false
  const last = ch[ch.length - 1]
  const code = last.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false // 한글 음절이 아니면 받침 없음으로 간주
  return (code - 0xac00) % 28 !== 0
}
// 'ㄹ' 받침은 '으로'가 아니라 '로'를 쓰는 특례 포함('로/으로').
const hasJongExceptRieul = (s: string): boolean => {
  const ch = (s || '').trim()
  if (!ch) return false
  const last = ch[ch.length - 1]
  const code = last.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false
  const jong = (code - 0xac00) % 28
  return jong !== 0 && jong !== 8 // 8 = ㄹ
}
const josaEunNeun = (s: string) => s + (hasJong(s) ? '은' : '는')
const josaEulReul = (s: string) => s + (hasJong(s) ? '을' : '를')
const josaIGa = (s: string) => s + (hasJong(s) ? '이' : '가')
const josaUro = (s: string) => s + (hasJongExceptRieul(s) ? '으로' : '로')

// ── 로그라인 생성기: 문법 역할이 고정된 독립 슬롯들의 곱집합 ──────────────
// 각 슬롯은 서로를 전제하지 않는 독립 항목(모두 고유)이며, 한 슬롯의 문법 역할이 일정하다
//   ① 주인공(명사구·주어)  ② 회귀 계기(부사절)  ③ 무대(명사구, '에서')
//   ④ 목표(명사구, 목적어)  ⑤ 첫 행동(연결형 동사구)  ⑥ 위기(명사구·주어)  ⑦ 결말(종결문)
// 템플릿: {주인공}은/는 {계기}, {무대}에서 {목표}을/를 노리고 {행동}. 그러나 {위기}이/가 {결말}
const LG_HERO: string[] = [ // 명사구 — 주어 자리(받침 다양). 모두 '회귀자'라는 한 범주.
  '몰락한 재벌가의 막내', '독살당한 그룹 회장', '은퇴한 국가대표 공격수', '데뷔도 못 한 연습생',
  '파산한 개인 투자자', '전사한 S급 헌터', '연재가 끊긴 무명 작가', '버림받은 서자 출신 경영자',
  '배신당한 길드 마스터', '누명을 쓴 천재 외과의', '잊힌 1세대 프로게이머', '폐업한 노포의 셰프',
  '권좌에서 끌려 내려온 황태자', '사고로 손을 잃은 피아니스트', '뒷방으로 밀려난 베테랑 형사',
  '실패한 스타트업 대표', '제명당한 변호사', '추락한 톱스타', '말단으로 좌천된 기획자',
  '빚더미에 앉은 가장', '무대 공포증에 시달린 배우', '재능을 의심받던 신예 감독',
  '계약을 사기당한 인디 밴드 보컬', '하청에 갈려 나간 게임 개발자', '학계에서 매장당한 연구자',
  '구단에서 방출된 포수', '부도난 건설사 후계자', '낙선을 거듭한 정치 신인',
  '연구비를 가로채인 공학도', '실연으로 무너진 천재 셰프',
]
const LG_TRIGGER: string[] = [ // 부사절 — '~ 채/~ 돌아와/~ 서서' 형태로 항상 끝맺음(주절과 충돌 없음). '채'는 한 절에 한 번만.
  '죽음의 문턱에서 인생의 가장 빛나던 그날로 되돌아와',
  '모든 기억을 고스란히 간직한 채 십 년 전으로 떨어져',
  '낯선 천장을 올려다보며 젊어진 손을 쥐어 본 채',
  '미래의 결말을 전부 외운 채 다시 첫 출발선에 서서',
  '두 번째 인생이라는 자각만을 무기로 눈을 뜬 채',
  '배신의 칼끝을 기억한 채 그 일이 벌어지기 전으로 돌아와',
  '폐허가 된 미래를 두 눈에 담고 평온하던 과거로 돌아온 채',
  '데자뷔처럼 익숙한 풍경 속에서 회귀를 깨달은 채',
  '잃었던 사람들이 아직 살아 있는 시점으로 돌아온 채',
  '전생의 마지막 후회를 가슴에 새긴 채 다시 시작점에 서서',
  '시스템 창의 첫 알림과 함께 과거로 돌아온 채',
  '코앞에 닥칠 거대 사건의 날짜를 손금처럼 외운 채',
  '한 번 겪은 실패의 매뉴얼을 통째로 기억한 채',
  '아무도 모르는 내일을 혼자만 아는 채 어제로 돌아와',
  '심장이 멎던 순간의 결심만 또렷이 남긴 채 회귀하여',
  '몰락 직전의 영광스러운 시절로 의식만 돌아온 채',
  '되돌릴 수 없던 선택의 갈림길 바로 앞으로 돌아온 채',
  '두 개의 연표를 머릿속에 겹쳐 둔 채 과거에 도착하여',
  '끝내 못 지킨 약속을 기억한 채 그 약속 이전으로 돌아와',
  '전생의 원수 얼굴을 똑똑히 새긴 채 첫 만남 전으로 돌아와',
  '무너진 제국의 잔해를 본 채 그 제국이 서기 전으로 돌아와',
  '마지막 숨과 함께 빌었던 단 하나의 소원만 안고 회귀하여',
]
const LG_ARENA: string[] = [ // 명사구 — '에서'가 붙는 무대(직업·시스템 세계). 모두 현실+한 스푼 무대.
  '폭락을 앞둔 주식시장', '데뷔조를 가리는 기획사 연습실', '첫 게이트가 열릴 도심 한복판',
  '판도가 뒤집힐 프로 리그', '인수전이 벌어질 대기업 이사회', '메타가 굳기 전의 e스포츠 무대',
  '신도시가 들어설 변두리 땅', '시청률 전쟁이 한창인 방송국', '히트작이 쏟아질 웹소설 플랫폼',
  '미슐랭 별이 걸린 주방', '재건축을 앞둔 낡은 상권', '신약 특허가 갈릴 연구소',
  '코인 광풍 직전의 거래소', '오디션 생방송 무대', '스카우트 전쟁이 벌어질 유망주 시장',
  '협회 권력이 재편될 헌터 길드', '상장을 앞둔 차고 속 스타트업', '대형 스캔들이 터질 정치판',
  '드래프트가 임박한 신인 선수단', '판권이 거래될 영화 시장', '차트 올킬을 노리는 음원 전쟁터',
  '던전 브레이크가 시작될 명동', '재벌가의 후계 구도가 정해질 가문',
  '신기술 표준이 결정될 개발자 컨퍼런스',
]
const LG_GOAL: string[] = [ // 명사구 — 목적어('을/를'). 모두 회귀자의 정당한 단기/장기 목표.
  '저평가된 미래의 대박 종목', '무명 시절의 미래 거장', '가족을 무너뜨릴 빚의 청산',
  '아직 무가치해 보이는 노른자 땅', '훗날 세상을 흔들 히트곡의 선점', '전생에 놓친 첫 우승',
  '배신자를 도려낼 결정적 증거', '미래에 떡상할 신기술의 지분', '데뷔조 막차 자리',
  '협회를 손에 넣을 첫 게이트 공략권', '몰락한 가문을 일으킬 종잣돈', '메타를 앞서갈 비밀 전술',
  '못 지킨 동생의 목숨', '미래의 베스트셀러가 될 원고', '거장이 될 무명 가수의 마음',
  '전생의 원수가 앉은 회장의 자리', '재해를 막을 단 한 번의 경고', '히든 던전의 첫 입장권',
  '시장을 선점할 IPO의 타이밍', '잊힌 명작의 판권', '리그를 지배할 유망주 영입',
  '두 번째 인생의 평온한 일상',
]
const LG_ACTION: string[] = [ // 연결형 동사구 — '-며/-고/-채로'로 끝남. 목표({goal})를 목적어로 받는 타동사이거나 부사적 표현이라, 새 목적어(을/를)를 따로 만들지 않는다(이중목적어 방지).
  '전 재산을 건 한 수로 단번에 거머쥐며', '아무도 모르게 판을 깔아 선점하고', '비웃음을 등진 채 한 발 먼저 차지하며',
  '진짜 실력은 끝까지 감춘 채로', '달력 위 그날을 노려 조용히 손에 넣으며', '한 수 앞을 읽고 남보다 먼저 가로채며',
  '낡은 연줄을 새로 엮어 끌어당기며', '작은 승부를 차곡차곡 쌓아 키워 가며', '의심의 눈을 우연으로 덮어 가며',
  '체크리스트의 한 줄로 또렷이 새기며', '두 연표 사이에서 정확히 짚어내며', '바닥부터 한 걸음씩 일궈 올리며',
  '마지막까지 패를 아낀 채로', '예고된 위기를 피해 미리 틀어쥐며', '전생의 실수를 거울삼아 정반대로 움켜쥐며',
  '헐값일 때 남몰래 쓸어 담으며', '굴욕을 연료 삼아 끝내 되찾으며', '시스템 창을 눈금자 삼아 차지해 가며',
  '믿을 자와 버릴 자를 가린 끝에 손에 쥐며', '소문보다 빠르게 선점하며', '판돈을 키워 가듯 단계마다 거머쥐며',
  '아는 미래를 천재성으로 위장한 채로',
]
const LG_MEANS: string[] = [ // 명사구 — 수단('으로/로'). 회귀자가 동원하는 무기/자원.
  '오직 자신만 아는 미래의 정보', '전생에 단련한 진짜 실력', '바닥부터 다시 쌓은 인맥',
  '한 푼까지 끌어모은 종잣돈', '남보다 한 발 빠른 선점', '천재성으로 위장한 메타지식',
  '두 인생이 겹쳐 보이는 통찰', '예고된 사건의 정확한 날짜', '숨겨 둔 결정적 패',
  '시스템 창이 알려 주는 공략', '발굴해 둔 미래의 거물', '단계마다 키워 온 세력',
  '치밀하게 깔아 둔 복수의 판', '한 수 앞을 읽는 수싸움', '값싸게 사 모은 미래의 자산',
  '굴욕을 장전한 인내', '회귀로 얻은 두 번째 기회',
]
const LG_CRISIS: string[] = [ // 명사구 — 최종문 주어('이/가'). 메타지식을 위협하는 독립 변수.
  '뒤틀리기 시작한 나비효과', '같은 미래를 외운 또 다른 회귀자', '한 발 늦게 드러난 진짜 원흉',
  '돈으로도 풀리지 않는 단 하나의 마음', '예상보다 빨리 따라붙은 경쟁자', '규칙이 통째로 바뀐 시스템',
  '믿었던 정보 속의 치명적 왜곡', '통제를 벗어나 자라 버린 세력', '아무도 믿어 주지 않는 경고',
  '미세하게 어긋난 운명의 톱니', '회귀를 일으킨 정체불명의 존재', '선점 경쟁에 불붙은 정보 인플레',
  '두 인생의 기억이 충돌하는 균열', '되돌릴수록 더 끔찍해지는 결말', '주인공조차 잊어 가는 원래 미래',
  '응징할 가치조차 잃은 허무한 원수', '강해질수록 사라지는 긴장의 빈자리', '약속을 비튼 예언자의 저주',
  '회귀자를 감시하려는 시스템의 의지', '바뀐 세상에 더는 안 맞는 미래의 명작', '집착이 오히려 망친 소중한 사람',
]
const LG_ENDING: string[] = [ // 종결문 — 완결된 한 문장(주어 자리에 넣지 않음).
  '두 번째 인생의 진짜 시험대를 펼친다.', '치트가 통하지 않는 마지막 결전을 부른다.',
  '쌓아 올린 모든 것을 한 점에서 시험한다.', '미래지식이 멈춘 자리에서 자력의 승부를 강요한다.',
  '전생의 굴욕과 정확히 대구를 이루며 되돌아온다.', '회귀가 치트가 아니라 구원이었음을 증명하게 만든다.',
  '아는 미래의 끝에서 새로운 미지를 연다.', '체급의 역전을 가장 통쾌한 한 장면으로 폭발시킨다.',
  '두 인생의 합이 비로소 하나로 모이게 한다.', '정상에 오른 자에게 정상의 공허를 묻는다.',
  '사이다 끝에 남은 대가를 조용히 청구한다.', '다시 눈을 뜨는 또 한 번의 회귀를 암시한다.',
  '못 지킨 단 한 사람의 무게를 끝내 남긴다.', '메타지식의 붕괴를 성장의 진짜 출발선으로 바꾼다.',
  '응징과 용서 사이에서 마지막 선택을 들이민다.', '키운 사람들과 함께 정상에 서는 결말로 향한다.',
  '평온한 일상이라는 가장 어려운 승리를 약속한다.', '두 타임라인이 충돌하는 진실의 문을 연다.',
  '자력으로 일군 승리조차 누군가의 각본은 아닌지 되묻는다.', '강함이 무의미해지는 새로운 전장을 연다.',
]

// 로그라인 슬롯 묶음(렌더·복사·조합수 계산 공용). 모든 슬롯 항목은 고유.
const LG_SLOTS = { hero: LG_HERO, trigger: LG_TRIGGER, arena: LG_ARENA, goal: LG_GOAL, means: LG_MEANS, action: LG_ACTION, crisis: LG_CRISIS, ending: LG_ENDING }
// 로그라인 조합수 = 슬롯 풀 크기의 곱(독립 슬롯의 곱집합).
const loglineCombos = Object.values(LG_SLOTS).reduce((p, arr) => p * arr.length, 1)
// 화면 표기 총 조합수: 기존 영감 3연(combos) + 로그라인 곱집합. 곱집합이 압도적이다.
const combosTotal = combos + loglineCombos

interface Logline { hero: string; trigger: string; arena: string; goal: string; means: string; action: string; crisis: string; ending: string }
const pickIdx = (n: number) => Math.floor(Math.random() * n)
const rollLogline = (): Logline => ({
  hero: LG_HERO[pickIdx(LG_HERO.length)], trigger: LG_TRIGGER[pickIdx(LG_TRIGGER.length)],
  arena: LG_ARENA[pickIdx(LG_ARENA.length)], goal: LG_GOAL[pickIdx(LG_GOAL.length)],
  means: LG_MEANS[pickIdx(LG_MEANS.length)], action: LG_ACTION[pickIdx(LG_ACTION.length)],
  crisis: LG_CRISIS[pickIdx(LG_CRISIS.length)], ending: LG_ENDING[pickIdx(LG_ENDING.length)],
})
// 조사를 받침에 맞게 골라 붙여 완성된 한 줄을 만든다(괄호 이중표기 없음).
//  {주인공}은/는 {계기}, {무대}에서 {목표}을/를 {수단}으로/로 {행동}. 그러나 {위기}이/가 {결말}
const loglineText = (l: Logline): string =>
  `${josaEunNeun(l.hero)} ${l.trigger}, ${l.arena}에서 ${josaEulReul(l.goal)} ${josaUro(l.means)} ${l.action}. ` +
  `그러나 ${josaIGa(l.crisis)} ${l.ending}`

const escapeHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const plain = (s: { cat: CatDef; item: Device }): string =>
  `${s.item.name}${s.item.aka ? ` (${s.item.aka})` : ''}  [${s.cat.icon} ${s.cat.label}]\n` +
  `[정의] ${s.item.def}\n` +
  `[사용법] ${s.item.how}\n` +
  `[예시] ${s.item.example}\n` +
  `[비틀기] ${s.item.twist}`

// 관련 도구(연계) — 회귀 장치 사전에서 자연히 이어지는 도구들
const RELATED: { id: string; label: string; icon: string }[] = [
  { id: 'event-timeline', label: '사건 연대표', icon: '🕰️' },
  { id: 'plot-twist-deck', label: '반전 카드덱', icon: '🃏' },
  { id: 'betrayal-gen', label: '배신 시나리오 생성기', icon: '🗡️' },
  { id: 'cliffhanger-forge', label: '클리프행어 단조기', icon: '🪝' },
  { id: 'character-sheet', label: '인물 시트', icon: '🪪' },
  { id: 'genre-conventions', label: '장르 관습 체크리스트', icon: '📐' },
]

export default function ModfanDevices({ payload }: { payload?: Record<string, unknown> }) {
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
  const [spark, setSpark] = useState<{ cat: CatDef; item: Device }[] | null>(null) // 무작위 영감(3장)
  const [logline, setLogline] = useState<Logline | null>(null) // 무작위 로그라인(곱집합)
  const [random, setRandom] = useState<{ cat: CatDef; item: Device } | null>(null) // 무작위 1개
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const mounted = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // payload.cat 로 초기 카테고리 지정(연계 진입). payload.genre 는 컨텍스트로 받되 동작은 동일.
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
    setLogline(null)
  }, [filtered])

  // 무작위 영감: 서로 다른 3장(전체 풀) 뽑기 → 충돌·교배 발상용
  const rollSpark = useCallback(() => {
    const pool = ALL_ITEMS()
    if (pool.length < 3) { setSpark(null); return }
    const idx = new Set<number>()
    while (idx.size < 3) idx.add(Math.floor(Math.random() * pool.length))
    setSpark(Array.from(idx).map((i) => pool[i]))
    setRandom(null)
    setLogline(null)
  }, [])

  // 무작위 로그라인: 8개 독립 슬롯의 곱집합에서 한 줄을 뽑아 조사까지 맞춰 완성
  const rollLog = useCallback(() => {
    setLogline(rollLogline())
    setSpark(null)
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
    addToLibrary('snippets', { text: plain(s), source: '현대판타지·회귀 서사 장치 사전', tags: ['현대판타지', '회귀', '서사장치', s.cat.label, s.item.name] })
    showToast(`스니펫 보관함에 ‘${s.item.name}’을(를) 저장했습니다.`)
  }

  // 프로젝트 자료 〈회귀 장치〉 폴더에 단일 항목 문서로 추가
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
      kind: 'text', root: 'research', folder: '회귀 장치',
      title: `${s.item.name}${s.item.aka ? ` (${s.item.aka})` : ''}`,
      bodyHtml,
      meta: { 장르: '현대판타지·회귀', 분류: s.cat.label, 장치: s.item.name },
    })
    showToast(id ? `프로젝트 자료 〈회귀 장치〉에 ‘${s.item.name}’을(를) 추가했습니다.` : '프로젝트에 추가하지 못했습니다.')
  }

  // 현재 보기(필터된 전체)를 한 편의 문서로 프로젝트에 추가
  const addViewToProject = () => {
    if (!hasProjectBridge()) { showToast('프로젝트에 연결되어 있지 않습니다.'); return }
    if (filtered.length === 0) { showToast('추가할 항목이 없습니다.'); return }
    const catLabel = cat === ALL_KEY ? '전체' : (CATS.find((c) => c.key === cat)?.label || '전체')
    const parts: string[] = [`<p><b>🌀 현대판타지·회귀 서사 장치·전개 — ${escapeHtml(catLabel)} (${filtered.length}개)</b></p>`]
    filtered.forEach(({ cat: c, item }) => {
      parts.push(`<h3>${escapeHtml(c.icon + ' ' + item.name)}${item.aka ? ` (${escapeHtml(item.aka)})` : ''}</h3>`)
      parts.push(`<p><b>정의</b> · ${escapeHtml(item.def)}</p>`)
      parts.push(`<p><b>사용법</b> · ${escapeHtml(item.how)}</p>`)
      parts.push(`<p><b>예시</b> · ${escapeHtml(item.example)}</p>`)
      parts.push(`<p><b>비틀기</b> · ${escapeHtml(item.twist)}</p>`)
    })
    const id = addToProject({ kind: 'text', root: 'research', folder: '회귀 장치', title: `현대판타지·회귀 서사 장치 — ${catLabel} (${filtered.length})`, bodyHtml: parts.join(''), meta: { 장르: '현대판타지·회귀', 분류: catLabel, 항목수: String(filtered.length) } })
    showToast(id ? `프로젝트 자료 〈회귀 장치〉에 ${filtered.length}개 항목 문서를 추가했습니다.` : '프로젝트에 추가하지 못했습니다.')
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
        <b>현대판타지·회귀</b> 고유의 서사 장치(회귀 트리거·메타지식 우위·전생 대비·데자뷔 누설·나비효과·선점·회귀자 인식·체크리스트 서사…)와 전개·페이싱·클라이맥스 관습(메타지식 무효화→자력 승리·전생 청산·두 인생의 합·체급 역전…) <b>{TOTAL}개</b>를 <b>정의·사용법·예시·비틀기</b>로 정리했습니다. 무작위 영감·로그라인 조합 <b>약 {fmtCombos(combosTotal)}가지</b>.
      </div>

      {/* 검색 */}
      <input value={query} onChange={(e) => setQuery(e.target.value)} style={input}
        placeholder="장치·전개 검색 (예: 회귀, 미래지식, 나비효과, 선점, 사이다, 청산, 헌터, 차트)" aria-label="검색" />

      {/* 카테고리 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}><Emoji e="🌀"/> 전체</button>
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
        <button className="minibtn" onClick={rollSpark} title="서로 다른 장치 3개를 뽑아 교배·충돌 발상"><Emoji e="🃏"/> 영감 3연</button>
        <button className="minibtn" onClick={rollLog} title={`독립 슬롯 곱집합에서 회귀물 로그라인 한 줄을 생성(약 ${fmtCombos(loglineCombos)}가지)`}><Emoji e="✨"/> 로그라인</button>
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
          title={hasProjectBridge() ? `현재 보기(${catLabel} ${filtered.length}개)를 프로젝트 자료 〈회귀 장치〉 폴더에 한 문서로 추가` : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        {RELATED.map((r) => (
          <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: '현대판타지·회귀' })} title={`${r.label} 열기`}><Emoji e={r.icon}/> {r.label}</button>
        ))}
      </div>

      {/* 무작위 로그라인(곱집합) */}
      {logline && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}><Emoji e="✨"/> 회귀물 로그라인 — 독립 슬롯 곱집합 (약 {fmtCombos(loglineCombos)}가지)</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={rollLog}>↻ 다시</button>
            <button className="minibtn" onClick={() => setLogline(null)}>✕</button>
          </div>
          <div style={{ fontSize: 14.5, lineHeight: 1.7 }}>{loglineText(logline)}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(loglineText(logline), 'logline')}>{copiedKey === 'logline' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
            <button className="minibtn" onClick={() => addToLibrary('snippets', { text: loglineText(logline), source: '현대판타지·회귀 서사 장치 사전', tags: ['현대판타지', '회귀', '로그라인'] }) || showToast('로그라인을 스니펫으로 저장했습니다.')}><Emoji e="📌"/> 스니펫 저장</button>
          </div>
        </div>
      )}

      {/* 무작위 영감 3연 */}
      {spark && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}><Emoji e="🃏"/> 영감 3연 — 충돌·교배해 새 전개를 빚어 보세요</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={rollSpark}>↻ 다시</button>
            <button className="minibtn" onClick={() => setSpark(null)}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {spark.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
                <span style={{ fontSize: 11, color: 'var(--accent)', flexShrink: 0 }}><Emoji e={s.cat.icon}/> {s.cat.label}</span>
                <b>{s.item.name}</b>
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>{s.item.def}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(spark.map((s) => `• ${s.item.name} — ${s.item.def}`).join('\n'), 'spark')}>{copiedKey === 'spark' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
            <button className="minibtn" onClick={() => addToLibrary('snippets', { text: '회귀 장치 교배 영감\n' + spark.map((s) => `• ${s.item.name} (${s.cat.label}) — ${s.item.def}`).join('\n'), source: '현대판타지·회귀 서사 장치 사전', tags: ['현대판타지', '회귀', '영감', '교배'] }) || showToast('영감 3연을 스니펫으로 저장했습니다.')}><Emoji e="📌"/> 스니펫 저장</button>
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
            <button className="linkbtn" onClick={() => addItemToProject(random)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '이 장치를 프로젝트 자료 〈회귀 장치〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
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
                        title={hasProjectBridge() ? '이 장치를 프로젝트 자료 〈회귀 장치〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>장치는 목적이 아니라 도구입니다. <b>관습(정의·사용법)</b>은 독자와의 약속으로 충실히 지키되, <b>비틀기</b>로 클리셰를 전복해 신선함을 만드세요. 특히 회귀물은 <b>미래지식의 첫 활용(1화)</b>과 <b>메타지식 무효화 후의 자력 승리</b>가 카타르시스를 만듭니다.</div>
    </div>
  )
}
