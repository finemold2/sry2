// 현대판타지·회귀 트로프·관습 체크리스트 — 이 장르의 독자 기대·필수 요소·흔한 함정·클리셰(+비틀기)를
// 카테고리별 체크리스트로 점검한다. 각 항목엔 '왜 중요한가/주의' 해설을 펼쳐볼 수 있고, 검색·무작위 점프,
// 사용자 항목 CRUD, 카테고리별·전체 진행률, 텍스트 내보내기, 프로젝트 '기획' 폴더 문서 추가를 지원한다.
// 보너스: 클리셰×비틀기 조합 생성기(슬롯 잠금/재생성, 조합수 표시)로 회귀물 한 장면 아이디어를 뽑는다.
// 자급식: react 와 './linkbus' 외 import 없음. 전부 로컬(외부 네트워크 없음).
// 모든 상태(체크/펼침/접힘/사용자 항목/삭제한 기본 항목/조합 잠금)는 localStorage 에 자동 저장·복원.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'modfan-tropes',
  name: '현판·회귀 트로프 체크',
  icon: '⏳',
  group: '구상·정리',
  genre: '현대판타지·회귀',
  intro: '현대판타지·회귀의 독자 기대·필수 요소·흔한 함정·클리셰(+비틀기)를 체크리스트로 점검하세요',
  w: 700,
  h: 640,
}

const LS_KEY = 'sry:tool:modfan-tropes'

// ── 항목 구조 ──
// must: 어기면 이탈하는 필수 관습 / trap: 빠지기 쉬운 함정 / cliche: 클리셰(비틀기 제안 동반)
type Kind = 'must' | 'trap' | 'cliche'
interface BaseItem {
  text: string        // 체크 항목 본문(질문형 — "예"일수록 좋음)
  why?: string        // 해설: 왜 중요한가 / 어떻게 점검하나
  twist?: string      // (cliche 한정) 비틀기 제안
}
interface Cat {
  id: string
  name: string
  icon: string
  kind: Kind
  desc: string
  items: BaseItem[]
}

// ───────────────────────── 기본 데이터(장르 특화·구체) ─────────────────────────
const CATS: Cat[] = [
  // 1) 독자 기대 · 필수 관습 (must)
  {
    id: 'hook',
    name: '초반 후킹(1~5화)',
    icon: '🪝',
    kind: 'must',
    desc: '회귀 자각 → 첫 미래지식 행사 → 작은 승리의 사이클',
    items: [
      { text: '1화(혹은 프롤로그+1화) 안에 “회귀했고 미래를 안다”는 사실을 명확히 드러냈는가', why: '현대 웹소설 1화 후킹 절대 규칙. 회귀 사실을 늦게 까면 “회귀물 보러 왔는데 회귀가 없다”는 이탈을 부른다.' },
      { text: '회귀 트리거(죽음·배신·후회)를 짧고 강렬하게 보여줬는가', why: '“두 번째 기회”의 무게가 트리거의 절실함에서 나온다. 길게 늘이면 고구마가 된다.' },
      { text: '1화 안에 미래지식의 “첫 활용”과 그로 인한 작은 승리가 있는가', why: '회귀해놓고 정보를 안 쓰면 독자 계약 위반. 첫 승리는 작아도 즉시 보여줘야 한다.' },
      { text: '왜 “하필 그 시점”으로 돌아왔는지가 서사적으로 의미 있는가', why: '중요한 분기 직전이어야 동력이 산다. 무의미한 시점은 “굳이?”라는 의문만 남긴다.' },
      { text: '매 화 끝에 다음화 클릭을 부르는 훅(반전·도발·결정의 순간)이 있는가', why: '매일 연재·1화 5,000자 환경에서 “다음화” 전환율이 곧 생명선이다.' },
      { text: '주인공의 “이번 생 목표 체크리스트”(가족·복수·선점)가 초반에 제시됐는가', why: '회귀 직후 할 일 목록이 챕터 단위 추진력을 만든다. 목표가 흐릿하면 표류한다.' },
    ],
  },
  {
    id: 'cida',
    name: '사이다 · 보상',
    icon: '🥤',
    kind: 'must',
    desc: '막힘 없는 해결·응징, 고구마 최소화',
    items: [
      { text: '회귀자인데도 답답하게 헤매는(고구마) 구간이 길게 늘어지지 않는가', why: '이미 답을 아는 자이므로 답답함이 더 치명적이다. 고구마는 짧게, 사이다는 누적되게.' },
      { text: '매 화 “작은 승리·정보·떡밥” 중 하나 이상의 보상이 있는가', why: '“한 화 1쾌감” 원칙. 보상 없는 화가 연속되면 연독률이 무너진다.' },
      { text: '응징/복수가 통쾌하되, 초반 소형 응징과 후반 대형 청산으로 분리 배치됐는가', why: '카타르시스를 한 번에 소진하면 후반 동력이 사라진다. 계단식으로 쌓아라.' },
      { text: '주인공의 우위가 “미래를 알아서”라고 독자에게 납득되게 연출됐는가', why: '정보 비대칭이 이 장르의 엔진. 우위의 근거가 흐리면 사이다가 “먼치킨 떼쓰기”로 보인다.' },
      { text: '승리 뒤 손해·반작용 없이 너무 쉽게 이겨 긴장이 증발하지 않는가', why: '무손실 승리는 사이다의 약효를 떨어뜨린다. 작은 대가나 새 위협을 곁들여라.' },
    ],
  },
  {
    id: 'meta',
    name: '미래지식(메타지식) 운용',
    icon: '🔮',
    kind: 'must',
    desc: '정보 비대칭 = 무기. 거시이벤트·인물정보·콘텐츠메타',
    items: [
      { text: '활용하는 미래지식의 “종류”가 구체적인가(거시 이벤트/인물 정보/콘텐츠 메타)', why: '코인·게이트 출현일 같은 거시, 배신자·떡잎천재 같은 인물, 대박 노래·시나리오 같은 콘텐츠 — 종류가 또렷할수록 디테일이 산다.' },
      { text: '예고한 미래 사건(대지진·코인 폭등·게이트 발생일·인물 흥망)을 반드시 회수하는가', why: 'setup-payoff. 예고만 하고 안 거두면 “약속 위반”으로 신뢰가 깨진다.' },
      { text: '저평가 자산·인재·기술을 남보다 먼저 잡는 “선점” 장면이 있는가', why: '“쟤가 미래의 대스타/대박 종목”을 알고 미리 확보하는 선점 모티프가 회귀물의 핵심 쾌감.' },
      { text: '미래지식이 “언젠가 무효화”될 복선을 깔아두었는가', why: '주인공 개입의 나비효과로 미래가 변하면 중반 긴장이 회복된다. 무효화는 미리 예고돼야 자연스럽다.' },
      { text: '실명·실제기업·실제사건은 변형/가공해 법적 함정을 피했는가', why: '리얼리티를 위해 실제 트렌드를 모사하되, 직접 실명은 위험. 가공명으로 우회하라.' },
      { text: '시간 좌표(“20○○년 ○월”)를 명시해 미래지식의 디테일을 받쳐주는가', why: '구체 연도·시점이 메타지식 리얼리티의 핵심. 모호한 “과거 어느 날”은 우위를 흐린다.' },
    ],
  },
  {
    id: 'growth',
    name: '성장 곡선 · 수치화',
    icon: '📈',
    kind: 'must',
    desc: '레벨·랭킹·재산·인지도 등 체감되는 성장 지표',
    items: [
      { text: '성장이 수치/등급(재산·랭킹·구독·레벨·직급·소속)으로 가시화되는가', why: '독자가 진척을 “숫자로” 체감해야 한다. 추상적 “강해졌다”는 약하다.' },
      { text: '성장 지표를 주기적으로 갱신·보고하는 장치가 있는가', why: '주가 그래프·랭킹표·정산 내역처럼 주기적 갱신이 진척감을 유지한다.' },
      { text: '성장이 계단식(작은 승리→중간 승리→대형 청산)으로 누적되는가', why: '평평한 성장은 지루하다. 단계마다 체급이 한 칸씩 올라야 한다.' },
      { text: '직업/분야의 “사실 디테일”(업계 용어·절차·성공 경로)이 정확한가', why: '현실 시스템이 무대. 주식·연예·스포츠·헌터협회의 규칙이 정확해야 미래지식 우위가 빛난다.' },
    ],
  },
  {
    id: 'emotion',
    name: '두 번 사는 자의 정서',
    icon: '💔',
    kind: 'must',
    desc: '못 지킨 것을 지키려는 동기, 회한의 감정선',
    items: [
      { text: '이미 죽었던 가족·친구를 다시 만나는 회한이 동기로 작동하는가', why: '액션 쾌감과 별개의 감정선 축. 정서가 없으면 성공기가 공허해진다.' },
      { text: '“전생의 나(무능·실패)” vs “현생의 나(각성)” 대비가 성장을 입증하는가', why: '같은 상황을 다르게 처리하며 성장을 보여주는 것이 회귀물의 정체성.' },
      { text: '“못 지킨 사람을 이번엔 지킨다”는 약속이 결말에서 회수되는가', why: '전생의 한 + 현생의 성취가 한 점에 모이는 정서적 정점이 클라이맥스의 무게를 만든다.' },
    ],
  },

  // 2) 클라이맥스 관습 (must)
  {
    id: 'climax',
    name: '클라이맥스 · 청산',
    icon: '⚔️',
    kind: 'must',
    desc: '메타지식 붕괴 후 자력 승리, 전생 청산의 완결',
    items: [
      { text: '최종 국면에서 미래지식이 무효화(적도 회귀자/예지자 등)되며 진짜 위기가 오는가', why: '치트만으로 끝내지 않는 것이 장르의 도덕. 무효화가 후반 긴장의 정석.' },
      { text: '결국 “회귀 후 스스로 쌓은 실력·동료·기반”으로 이기는가', why: '두 인생의 합으로서의 승리. 미래지식이 사라져도 이겨야 성장이 완성된다.' },
      { text: '1막에서 못 갚은 큰 빚(근원 빌런·망친 조직)을 최종장에서 압도적으로 청산하는가', why: '전생 청산의 완결이 회귀물의 약속. 흐지부지하면 카타르시스가 증발한다.' },
      { text: '한때 짓밟던 거대 존재를 내려다보는 “체급 역전”이 시각화되는가', why: '위치 역전의 쾌감이 회귀 성공기의 정점.' },
      { text: '에필로그가 성취·안정(가족·제국 완성·후일담)으로 마무리되는가', why: '현판 회귀는 비극보다 “두 번째 인생은 행복했다”류 안정 엔딩을 선호.' },
    ],
  },

  // 3) 흔한 함정 (trap)
  {
    id: 'trap-info',
    name: '함정 · 미래지식 운용 실수',
    icon: '⚠️',
    kind: 'trap',
    desc: '메타지식이 만능치트로 변질되는 구간',
    items: [
      { text: '주인공이 모든 걸 다 알아 갈등·실패가 사라지지 않았는가', why: '전지(全知)는 긴장의 적. 일부러 “모르는 영역”과 변동된 미래를 남겨라.' },
      { text: '미래지식만으로 모든 걸 해결해 본인 실력 성장이 없지 않은가', why: '치트 의존형은 후반 무효화 때 무너진다. 지식+자력 성장을 병행시켜라.' },
      { text: '예고한 미래 사건을 잊고 회수하지 않은 떡밥이 쌓이지 않았는가', why: '두 타임라인(원래 미래/변한 미래) 관리 실패의 전형. 추적표가 필요하다.' },
      { text: '주인공 개입으로 미래가 바뀌었는데도 “여전히 다 안다”는 모순이 없는가', why: '나비효과가 시작됐다면 옛 지식이 점점 안 통해야 정합적이다.' },
      { text: '미래지식을 너무 대놓고 써서 “어떻게 알았지?” 의심을 방치하지 않았는가', why: '지식 누설 긴장을 천재성·예지력·우연으로 위장해 관리해야 한다.' },
    ],
  },
  {
    id: 'trap-pace',
    name: '함정 · 페이싱/구조',
    icon: '🐌',
    kind: 'trap',
    desc: '늘어짐·고구마·후킹 실패',
    items: [
      { text: '회귀 자각 전 도입(전생 묘사)이 지나치게 길지 않은가', why: '전생 비극을 길게 끌면 1화 후킹을 놓친다. 트리거는 압축하라.' },
      { text: '2막(세력화)에서 비슷한 에피소드 반복으로 늘어지지 않는가', why: '“목표→발동→방해→해결→보상→떡밥” 사이클이 변주 없이 반복되면 권태.' },
      { text: '수치 성장 보고가 끊겨 진척감이 사라진 구간이 없는가', why: '주기적 갱신을 잊으면 “성장하는 느낌”이 증발한다.' },
      { text: '단기 떡밥 없이 원거리 떡밥(거대 미래사건)만 굴리고 있지 않은가', why: '장기·단기 떡밥을 병렬로 굴려야 매 화 동력이 산다.' },
    ],
  },
  {
    id: 'trap-logic',
    name: '함정 · 설정 정합성',
    icon: '🧩',
    kind: 'trap',
    desc: '두 타임라인·세계관 모순',
    items: [
      { text: '“원래 미래”와 “주인공이 바꾼 미래” 두 타임라인을 분리 관리하는가', why: '둘을 섞으면 “전생엔 죽었는데 왜 살아있지?” 같은 모순이 터진다.' },
      { text: '나비효과로 변한 사건의 결과(연쇄 변화)가 일관되게 반영되는가', why: '한 사건만 바꾸고 그 파급은 무시하면 설정이 헐거워진다.' },
      { text: '(헌터 혼합) 시스템·등급·협회·길드 규칙이 처음 정한 대로 일관되는가', why: '시스템 창·S급/EX급 규칙이 편의대로 흔들리면 세계관 신뢰가 깨진다.' },
      { text: '회귀 시점의 사회·기술 상황(연도)과 미래지식의 디테일이 어긋나지 않는가', why: '“그 시점엔 없던 기술/사건”을 주인공이 미리 아는 건 OK지만, 배경 묘사는 그 시점에 맞아야 한다.' },
    ],
  },
  {
    id: 'trap-char',
    name: '함정 · 인물/감정',
    icon: '🫥',
    kind: 'trap',
    desc: '평면적 빌런·증발한 감정선',
    items: [
      { text: '전생의 원수/빌런이 “그냥 나쁜 놈”을 넘어 나름의 논리가 있는가', why: '평면적 빌런은 청산의 무게를 떨어뜨린다. 안타고니스트의 타당성을 줘라.' },
      { text: '주변인의 “넌 왜 이렇게 변했어?” 의심이 무시되지 않고 관리되는가', why: '갑작스런 인격 변화를 방치하면 리얼리티가 깨진다. 둘러대기·점진적 노출로 처리.' },
      { text: '성공기에 매몰돼 가족·관계의 정서선이 증발하지 않았는가', why: '쾌감만 남고 감정이 비면 “재미는 있는데 마음엔 안 남는” 글이 된다.' },
    ],
  },

  // 4) 클리셰 + 비틀기 (cliche)
  {
    id: 'cliche-open',
    name: '클리셰 · 회귀 도입',
    icon: '🌀',
    kind: 'cliche',
    desc: '익숙한 첫 장면 — 그대로 쓰거나 비틀거나',
    items: [
      { text: '“다시 눈을 떴다 / 익숙한 천장이다”로 회귀를 자각', why: '회귀물의 상징적 첫 문장. 안전하지만 식상할 수 있다.', twist: '천장이 “익숙하지 않게” 바뀌어 있다(미세하게 다른 분기) → 첫 화부터 나비효과를 암시.' },
      { text: '거울/창문을 보며 “젊어진 몸”을 자각', why: '회귀 시각화의 정석.', twist: '젊어졌는데 전생에 없던 흉터/문신/상태가 있다 → “완전히 같은 과거”가 아님을 던진다.' },
      { text: '아직 살아있는 가족(부모/동생)에 울컥 → 동기 부여', why: '감정선 점화의 클리셰.', twist: '가족이 “전생과 다르게” 행동/상태다 → 내가 아는 과거가 이미 틀렸다는 불안.' },
      { text: '첫 행동으로 즉시 돈/정보 확보(로또·종목·경매·면접)', why: '회귀 직후 사이다.', twist: '확보에 “실패”한다 — 미래가 미묘하게 달라 첫 패를 잃고, 그제야 방심을 버린다.' },
    ],
  },
  {
    id: 'cliche-power',
    name: '클리셰 · 능력/전개',
    icon: '🎭',
    kind: 'cliche',
    desc: '재능 숨김·선점·역전의 단골',
    items: [
      { text: '“재능을 숨긴다/실력을 감춘다” → 나중에 폭발', why: '카타르시스 적립의 단골.', twist: '숨긴 게 들켜 “과소평가”가 아니라 “과대 경계” 대상이 된다 → 숨기기 전략이 역효과.' },
      { text: '미래의 거물(아직 무명)을 알아보고 미리 포섭', why: '선점 모티프.', twist: '포섭하려던 거물이 “이미 다른 회귀자”에게 잡혔거나, 포섭이 그를 망친다(나비효과).' },
      { text: '전생의 원수가 초반 우위 → 서서히 역전', why: '복수 서사의 골격.', twist: '원수도 회귀자였다 — 같은 미래를 알고 있어 정보전이 된다.' },
      { text: '“이번엔 다르다 / 같은 실수는 반복 안 한다” 다짐 독백', why: '각오의 클리셰 대사.', twist: '“다르게” 한 선택이 더 나쁜 결과를 부른다 → 다짐의 오만을 깨는 반전.' },
      { text: '“전생의 나라면 몰랐겠지만…” 미래지식 해설 독백', why: '내적 독백으로 정보 전달.', twist: '독백한 지식이 “틀린 기억”으로 판명 → 회귀자의 기억도 완전하지 않음을 드러낸다.' },
    ],
  },
  {
    id: 'cliche-villain',
    name: '클리셰 · 회귀자 빌런/후반',
    icon: '👁️',
    kind: 'cliche',
    desc: '회귀자 인식·정보전의 고급 장치',
    items: [
      { text: '다른 회귀자/예지자/시스템이 “너도 회귀자냐”를 감지', why: '후반 빌런 설계의 단골.', twist: '감지당한 게 함정 — 상대가 “회귀자인 척”하는 일반인이라 정보를 역으로 흘린다.' },
      { text: '회귀자 간 “미래를 누가 더 아느냐” 정보전', why: '메타지식 대 메타지식.', twist: '둘 다 “바뀐 미래”에선 무력 — 결국 회귀 후 쌓은 실력 싸움으로 귀결.' },
      { text: '최종 빌런이 “세계를 원래대로 되돌리려는” 또 다른 회귀자', why: '근원 빌런의 정당성 부여.', twist: '주인공이 바꾼 미래가 “더 나쁜 세계”였음이 드러나며 도덕적 딜레마로 전환.' },
    ],
  },
]

// ───────────────────────── 조합 생성기 풀(클리셰×비틀기 장면 아이디어) ─────────────────────────
// 슬롯: [회귀 시점]×[트리거]×[첫 미래지식 활용]×[숨은 위협/반전]×[정서적 닻]×[이번 생 첫 결심]×[곁에 둘 사람]
// 조합수 = 각 풀 길이의 곱. 모든 항목은 고유하며, 각 슬롯은 서로 독립적(다른 슬롯을 전제하는 표현 금지)이라
//          7개 슬롯을 곱집합으로 섞어도 의미 충돌이 없게 설계했다. 슬롯 출력엔 조사를 붙이지 않으므로
//          (각 항목이 자체로 완결된 명사구/절) "을(를)" 같은 이중표기 문제도 발생하지 않는다.
const SLOTS: { key: string; label: string; icon: string; pool: string[] }[] = [
  {
    key: 'when', label: '회귀 시점', icon: '🕰️',
    pool: [
      '대학 입학 직전, 첫 게이트가 열리기 3일 전',
      '부모 회사가 부도나기 한 달 전 새벽',
      '아이돌 데뷔조 발표 전날 밤',
      '코인 광풍이 시작되기 직전 군 제대일',
      '동생이 사고를 당하기 일주일 전',
      '대형 IPO 청약 마감 하루 전',
      '각성 시험(헌터 등급 판정) 당일 아침',
      '첫 직장 면접에서 광탈하기 바로 전날',
      '스승이 배신당해 쓰러지기 직전의 도장',
      '프로게이머 데뷔전 패배 후 은퇴를 선언하기 직전',
      '대지진과 대형 화재가 잇따르기 바로 전날',
      '전생의 첫 투자에서 물렸던 그 종목을 사기 직전',
      '명문 길드 입단 테스트를 보러 가던 지하철 안',
      '집안이 빚보증으로 무너지기 보름 전 저녁',
      '국가대표 선발전 명단이 발표되기 하루 전',
      '신약 임상 결과가 공개되기 사흘 전 새벽',
      '재개발 보상 발표가 나기 한 주 전 골목',
      '동기들과 함께 떠난 신입 연수 첫째 날 아침',
      '첫 단독 콘서트 매진이 갈리던 예매 오픈 직전',
      '대형 게임 서버가 오픈하기 자정 직전',
      '회사가 상장 폐지를 통보받기 사흘 전',
      '전국 모의고사 성적표가 나오기 전날 밤',
      '소속 팀이 강등 위기에 몰린 시즌 개막 전날',
      '몬스터 웨이브 경보가 발령되기 두 시간 전',
      '가족 여행을 떠나기로 한, 그 사고의 아침',
      '스타트업 첫 투자 유치 미팅이 잡힌 날 새벽',
      '졸업 작품 전시가 열리기 일주일 전 작업실',
      '경매장에 미공개 유물이 풀리기 전날 밤',
      '연재 첫 화를 올리기로 한 마감 직전의 새벽',
      '병원에서 어머니의 진단 결과를 기다리던 오후',
    ],
  },
  {
    key: 'trigger', label: '회귀 트리거', icon: '💥',
    pool: [
      '믿었던 동료의 칼에 등을 찔리며',
      '게이트 브레이크 속에서 가족을 못 지키고 죽으며',
      '파산한 빚더미 위에서 옥상 난간을 넘으며',
      '소속사에 버려져 무대 뒤에서 쓰러지며',
      'S급 마수 앞에 동료들의 방패가 되어 산화하며',
      '누명을 쓰고 감옥에서 늙어 죽으며',
      '복수에 성공한 직후 허무하게 암살당하며',
      '마지막 한 수를 두지 못한 채 시스템 메시지를 보며',
      '소중한 사람의 장례식장에서 심장이 멎으며',
      '전쟁 같은 정산 자리에서 모든 걸 잃고 무너지며',
      '폭주한 던전이 무너지는 잔해에 깔리며',
      '내부 고발 끝에 조직에 쫓기다 다리 위에서 떨어지며',
      '평생을 바친 회사에서 정리해고 통보를 받은 그날 밤 쓰러지며',
      '오랜 투병 끝에 병상에서 마지막 숨을 내쉬며',
      '내가 키운 후배의 배신으로 모든 자리를 빼앗기고 무너지며',
      '대형 화재 현장에서 사람을 구하다 연기에 갇히며',
      '약속을 지키지 못한 죄책감 속에 술에 잠겨 쓰러지며',
      '결승전 마지막 라운드를 망친 뒤 무대 뒤에서 무너지며',
      '사기당한 전 재산을 좇다 절벽 끝에서 발을 헛디디며',
      '전장의 한복판에서 동료를 등진 채 화살을 맞으며',
      '폭발하는 연구소에서 데이터를 지키려다 휩쓸리며',
      '폭우 속 빗길에서 핸들을 꺾지 못한 채 충돌하며',
      '믿었던 가족에게 등을 떠밀려 차가운 물속으로 가라앉으며',
      '마지막 승부수가 빗나간 객장에서 모니터 앞에 엎어지며',
      '구조 신호를 보내지 못한 채 무너진 갱도에 갇히며',
      '독이 든 축배를 든 줄도 모르고 잔을 비우며',
      '평생의 라이벌에게 마지막 자리를 빼앗기고 절망하며',
      '내 손으로 만든 함정에 거꾸로 걸려들며',
    ],
  },
  {
    key: 'use', label: '첫 미래지식 활용', icon: '🔮',
    pool: [
      '곧 폭등할 저평가 종목을 종잣돈 전부로 매수',
      '아직 무명인 미래의 대스타를 먼저 포섭',
      '사흘 뒤 열릴 게이트의 위치·등급을 선점 공략',
      '대박날 노래·시나리오·웹툰을 본인 이름으로 선점',
      '배신자의 약점·범죄 증거를 미리 확보',
      '폐기될 줄 알았던 유물·아이템을 헐값에 입수',
      '곧 떡잎을 틔울 천재 후배를 자기 팀으로 영입',
      '망할 회사를 피하고 흥할 자리로 이직·창업',
      '재해 발생일을 알고 사람들을 미리 대피시킴',
      '전생에 놓친 스킬·특성을 가장 먼저 각성',
      '곧 사라질 한정판 매물을 시세보다 싸게 선점',
      '미래에 천정부지로 오를 작은 가게의 자리를 미리 임대',
      '대박 특허로 이어질 아이디어를 가장 먼저 출원',
      '폭락 직전의 위험 자산을 손절해 손실을 차단',
      '미래의 핵심 인맥에게 결정적 도움을 미리 베풂',
      '곧 터질 사고의 부품 결함을 사전에 신고',
      '아직 평범한 신인 감독의 데뷔작에 미리 투자',
      '버려질 던전의 숨은 보스방 좌표를 선점 등록',
      '곧 개정될 규칙의 허점을 합법적으로 미리 활용',
      '전생의 은인을 위기에서 한발 먼저 구함',
      '미래의 베스트셀러가 될 원고를 가장 먼저 계약',
      '곧 부상할 신생 길드에 창립 멤버로 합류',
      '대형 리콜로 이어질 제품을 사두지 않고 회피',
      '미래의 우승마·우승팀에 소액으로 미리 베팅',
      '곧 가치가 뛸 폐광·폐건물을 헐값에 매입',
      '전생에 적이었던 인재를 먼저 손 내밀어 동료로',
      '아직 알려지지 않은 던전 공략법을 가장 먼저 정립',
      '곧 품절될 핵심 재료를 대량으로 미리 비축',
    ],
  },
  {
    key: 'threat', label: '숨은 위협/반전', icon: '🩻',
    pool: [
      '그런데 미래가 미묘하게 달라져 있다(나비효과 시작)',
      '상대도 회귀자였다 — 같은 미래를 알고 있다',
      '내 개입이 더 나쁜 미래를 부르고 있었다',
      '“너 어떻게 알았지?” 주변의 의심이 조여온다',
      '내 기억(미래지식)에 결정적 오류가 있었다',
      '바꾼 미래의 대가를 다른 누군가가 치르고 있다',
      '시스템·협회가 회귀의 흔적을 감지하기 시작했다',
      '구한 사람이 원래 미래의 빌런이 될 운명이었다',
      '나를 회귀시킨 존재가 대가를 요구하기 시작했다',
      '바뀐 미래에선 내가 알던 동료가 적으로 돌아섰다',
      '미래지식이 통하는 기한이 정해져 있었다',
      '나 말고도 같은 시점으로 돌아온 자가 여럿 있었다',
      '선점한 자산에 누군가 똑같이 손을 뻗고 있었다',
      '내가 막은 사고가 더 큰 재앙의 방아쇠였다',
      '미래를 바꿀 때마다 몸에 알 수 없는 부작용이 쌓인다',
      '예고했던 미래 사건이 예정보다 빨리 닥쳐온다',
      '나를 지켜보던 조직이 회귀의 비밀을 노리고 있었다',
      '전생의 원수가 이미 더 멀리까지 미래를 알고 있었다',
      '구하려던 사람이 정작 회귀를 원치 않았다',
      '바꾼 미래의 균열이 내 가족부터 덮치기 시작했다',
      '내가 믿은 미래지식 자체가 누군가의 함정이었다',
      '되돌린 시간만큼 잊어버린 기억이 늘어간다',
      '같은 미래를 아는 자들 사이에 정보 전쟁이 시작됐다',
      '나비효과가 엉뚱한 곳에서 먼저 터지고 있었다',
    ],
  },
  {
    key: 'anchor', label: '정서적 닻', icon: '🫀',
    pool: [
      '이번엔 반드시 살릴 동생의 웃는 얼굴',
      '전생에 끝내 못 갚은 어머니의 빚',
      '버려졌던 그 무대에 다시 서겠다는 다짐',
      '못 지킨 동료에게 남긴 마지막 약속',
      '두 번째 인생에선 평범한 행복을 지키겠다는 바람',
      '나를 믿어준 단 한 사람에게 보답하려는 마음',
      '같은 실수로 또 잃지 않겠다는 두려움 섞인 각오',
      '전생의 원수에게 “이번엔 내가 위”임을 증명하려는 의지',
      '전생엔 외면했던 아버지의 굽은 등',
      '끝내 전하지 못한 한마디를 이번엔 꼭 하겠다는 마음',
      '나 때문에 무너졌던 가족을 다시 세우겠다는 책임감',
      '함께 꿈을 꾸다 흩어진 동료들을 다시 모으려는 열망',
      '이번 생에선 비겁하지 않겠다는 스스로에 대한 약속',
      '먼저 떠난 친구의 못다 이룬 꿈을 대신 이루려는 다짐',
      '평생 그늘에 있던 자신을 햇빛 아래 세우겠다는 갈망',
      '나를 키워준 스승의 명예를 되찾아 주려는 결심',
      '두 번 다시 누구의 도구도 되지 않겠다는 결의',
      '잃어버린 시간만큼 곁의 사람을 더 아끼겠다는 마음',
      '전생의 후회를 발판 삼아 끝까지 가보겠다는 오기',
      '소중한 이의 마지막 미소를 이번엔 지켜주려는 간절함',
      '거짓 위에 세운 성공이 아닌, 떳떳한 길을 걷겠다는 바람',
      '나를 무시한 세상에 실력으로 답하겠다는 조용한 분노',
      '한 번 더 주어진 시간을 헛되이 쓰지 않겠다는 다짐',
      '사랑하는 이에게 부끄럽지 않은 사람이 되겠다는 소망',
    ],
  },
  {
    key: 'vow', label: '이번 생의 첫 결심', icon: '✊',
    pool: [
      '이번엔 절대 먼저 손을 내밀어 약점을 보이지 않기로',
      '실력을 끝까지 숨겨 결정적 순간에만 드러내기로',
      '돈보다 사람을 먼저 챙겨 진짜 내 편을 만들기로',
      '복수는 뒤로 미루고 우선 기반부터 단단히 다지기로',
      '미래지식에만 기대지 않고 스스로의 실력을 키우기로',
      '한 번에 다 갖기보다 한 걸음씩 확실히 쌓아가기로',
      '전생의 적이라도 쓸모가 있다면 손을 잡기로',
      '가족에게만은 끝까지 진실을 숨겨 평범하게 지켜주기로',
      '작은 약속 하나도 어기지 않는 사람이 되기로',
      '눈앞의 이득보다 멀리 보는 판을 짜기로',
      '누구에게도 휘둘리지 않을 만큼 빠르게 강해지기로',
      '이번 생만큼은 후회를 남기지 않을 선택만 하기로',
      '믿을 사람과 버릴 사람을 처음부터 분명히 가르기로',
      '나서야 할 때와 물러설 때를 냉정하게 구분하기로',
      '명성보다 실속을 택해 조용히 영향력을 키우기로',
      '한 분야에서 누구도 넘볼 수 없는 일인자가 되기로',
      '약자를 외면하지 않되 감정에 발목 잡히지 않기로',
      '전생의 패턴을 의심하며 매번 다시 검증하기로',
      '적을 만들기보다 빚을 지우는 쪽을 택하기로',
      '결과만큼 과정의 명분도 끝까지 지키기로',
      '도움받은 만큼 반드시 두 배로 갚는 사람이 되기로',
      '한순간의 통쾌함보다 끝까지 살아남는 길을 고르기로',
    ],
  },
  {
    key: 'ally', label: '곁에 둘 사람', icon: '🤝',
    pool: [
      '아직 빛을 못 본, 훗날 최고가 될 무명의 천재',
      '전생엔 적이었지만 누구보다 의리 있는 라이벌',
      '세상이 외면한, 묵묵히 실력을 갈고닦는 외골수',
      '정보망이 넓어 무엇이든 알아내는 발 빠른 정보상',
      '돈과 인맥을 쥐었으나 사람에 목마른 늙은 거상',
      '버려진 재능을 알아봐 줄 사람을 기다리던 폐인',
      '원칙을 목숨처럼 지키는, 융통성 없는 곧은 동료',
      '뒤를 봐줄 힘은 있으나 명분이 없던 몰락한 명문가의 후계',
      '약하지만 끝까지 등을 맡길 수 있는 어릴 적 친구',
      '냉정한 머리로 판을 읽어내는 과묵한 책사형 조력자',
      '거칠지만 한번 정하면 배신하지 않는 뒷골목의 의형',
      '전생에 나를 구하고 사라졌던 정체불명의 은인',
      '말은 없지만 위기마다 곁을 지키는 충직한 호위',
      '세상 물정에 밝아 협상이라면 지지 않는 능구렁이 상인',
      '실력은 최고지만 사람을 못 믿어 홀로였던 은둔 고수',
      '아직 어리지만 될성부른, 가르칠 가치가 있는 떡잎',
      '권력의 중심에 있으나 개혁을 꿈꾸던 젊은 실세',
      '소문에 밝아 어떤 비밀도 캐내는 발 넓은 기자',
      '돈 대신 의리로 움직이는, 손이 큰 옛 동업자',
      '냉철하되 약자에겐 따뜻한, 원칙주의 의사',
    ],
  },
]

// ── 유틸 ──
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
const escHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
function fmtBig(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(2).replace(/\.?0+$/, '') + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(2).replace(/\.?0+$/, '') + '만'
  return String(n)
}
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

const defId = (catId: string, idx: number) => `d:${catId}:${idx}`

interface UserItem { id: string; text: string; why?: string }
interface Persisted {
  checked: Record<string, boolean>
  removedDefaults: string[]
  userItems: Record<string, UserItem[]>   // catId -> 사용자 항목
  collapsed: Record<string, boolean>       // catId -> 접힘
  expanded: Record<string, boolean>        // 항목 id -> 해설 펼침
  kindFilter: Kind | 'all'
  // 조합기
  combo: Record<string, string>            // slotKey -> 현재 텍스트
  locks: Record<string, boolean>           // slotKey -> 잠금
}

function emptyState(): Persisted {
  return { checked: {}, removedDefaults: [], userItems: {}, collapsed: {}, expanded: {}, kindFilter: 'all', combo: {}, locks: {} }
}

function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return emptyState()
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return emptyState()
    const pickObj = (o: unknown): Record<string, boolean> => {
      const r: Record<string, boolean> = {}
      if (o && typeof o === 'object') for (const k of Object.keys(o as object)) r[k] = !!(o as Record<string, unknown>)[k]
      return r
    }
    const userItems: Record<string, UserItem[]> = {}
    if (p.userItems && typeof p.userItems === 'object') {
      for (const k of Object.keys(p.userItems)) {
        const arr = p.userItems[k]
        if (Array.isArray(arr)) {
          userItems[k] = arr.filter((x: unknown) => x && typeof (x as UserItem).text === 'string')
            .map((x: UserItem) => ({ id: String(x.id || newId()), text: String(x.text), why: x.why ? String(x.why) : undefined }))
        }
      }
    }
    const combo: Record<string, string> = {}
    if (p.combo && typeof p.combo === 'object') for (const k of Object.keys(p.combo)) combo[k] = String((p.combo as Record<string, unknown>)[k] ?? '')
    const kf = (['all', 'must', 'trap', 'cliche'] as const).includes(p.kindFilter) ? p.kindFilter : 'all'
    return {
      checked: pickObj(p.checked),
      removedDefaults: Array.isArray(p.removedDefaults) ? p.removedDefaults.filter((x: unknown) => typeof x === 'string') : [],
      userItems,
      collapsed: pickObj(p.collapsed),
      expanded: pickObj(p.expanded),
      kindFilter: kf,
      combo,
      locks: pickObj(p.locks),
    }
  } catch {
    return emptyState()
  }
}

const KIND_META: Record<Kind, { label: string; color: string; tag: string }> = {
  must: { label: '필수 관습', color: 'var(--accent)', tag: '필수' },
  trap: { label: '흔한 함정', color: 'var(--warn)', tag: '함정' },
  cliche: { label: '클리셰+비틀기', color: 'var(--ok)', tag: '클리셰' },
}

interface MergedItem extends BaseItem { id: string; user: boolean }
function catItems(cat: Cat, st: Persisted): MergedItem[] {
  const out: MergedItem[] = []
  cat.items.forEach((it, idx) => {
    const id = defId(cat.id, idx)
    if (st.removedDefaults.includes(id)) return
    out.push({ ...it, id, user: false })
  })
  ;(st.userItems[cat.id] || []).forEach((u) => out.push({ id: u.id, text: u.text, why: u.why, user: true }))
  return out
}

export default function ModfanTropes({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [state, setState] = useState<Persisted>(init.current)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [query, setQuery] = useState('')
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')
  const mounted = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // payload.genre 참고(연계로 열렸을 때) — 다른 장르로 열려도 동작하지만 안내만 남긴다.
  const payloadGenre = typeof payload?.genre === 'string' ? (payload.genre as string) : ''

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
  }, [])

  // 첫 마운트 시 조합 슬롯이 비어 있으면 한 번 채운다.
  useEffect(() => {
    setState((s) => {
      if (Object.keys(s.combo).length >= SLOTS.length) return s
      const combo = { ...s.combo }
      SLOTS.forEach((sl) => { if (!combo[sl.key]) combo[sl.key] = pick(sl.pool) })
      return { ...s, combo }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)) }
    catch { if (mounted.current) flashNote('이 브라우저에서 저장이 막혀 새로고침 시 진행 상황이 사라질 수 있어요.') }
  }, [state])

  const flashNote = (msg: string) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2600)
  }
  const flashCopy = (tag: string) => {
    setCopied(tag)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => { if (mounted.current) setCopied('') }, 1400)
  }
  const copy = async (text: string, tag: string) => {
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      flashCopy(tag)
    } catch { flashNote('복사에 실패했어요. 직접 선택해 복사하세요.') }
  }

  // ── 체크/펼침 동작 ──
  const toggle = (id: string) => setState((s) => ({ ...s, checked: { ...s.checked, [id]: !s.checked[id] } }))
  const toggleExpand = (id: string) => setState((s) => ({ ...s, expanded: { ...s.expanded, [id]: !s.expanded[id] } }))
  const toggleCollapse = (catId: string) => setState((s) => ({ ...s, collapsed: { ...s.collapsed, [catId]: !s.collapsed[catId] } }))
  const setFilter = (k: Kind | 'all') => setState((s) => ({ ...s, kindFilter: k }))

  const addUserItem = (catId: string) => {
    const text = (drafts[catId] || '').trim()
    if (!text) return
    const item: UserItem = { id: newId(), text }
    setState((s) => ({ ...s, userItems: { ...s.userItems, [catId]: [...(s.userItems[catId] || []), item] } }))
    setDrafts((d) => ({ ...d, [catId]: '' }))
  }
  const removeItem = (catId: string, id: string, isUser: boolean) => {
    setState((s) => {
      const checked = { ...s.checked }; delete checked[id]
      const expanded = { ...s.expanded }; delete expanded[id]
      if (isUser) {
        const arr = (s.userItems[catId] || []).filter((u) => u.id !== id)
        return { ...s, checked, expanded, userItems: { ...s.userItems, [catId]: arr } }
      }
      return { ...s, checked, expanded, removedDefaults: [...s.removedDefaults, id] }
    })
  }
  const saveEdit = () => {
    if (!editing) return
    const text = editing.text.trim(); const target = editing
    setEditing(null)
    if (!text) return
    setState((s) => {
      for (const catId of Object.keys(s.userItems)) {
        const arr = s.userItems[catId] || []
        if (arr.some((u) => u.id === target.id)) {
          return { ...s, userItems: { ...s.userItems, [catId]: arr.map((u) => (u.id === target.id ? { ...u, text } : u)) } }
        }
      }
      const m = /^d:([^:]+):/.exec(target.id)
      if (m) {
        const catId = m[1]; const repl: UserItem = { id: newId(), text }
        const wasChecked = !!s.checked[target.id]
        const checked = { ...s.checked }; delete checked[target.id]
        if (wasChecked) checked[repl.id] = true
        return {
          ...s, checked,
          removedDefaults: s.removedDefaults.includes(target.id) ? s.removedDefaults : [...s.removedDefaults, target.id],
          userItems: { ...s.userItems, [catId]: [...(s.userItems[catId] || []), repl] },
        }
      }
      return s
    })
  }
  const resetAll = () => setState((s) => ({ ...s, checked: {} }))

  // ── 무작위 점프(검색·필터 무시하고 미체크 항목 하나 펼치기) ──
  const jumpRandom = () => {
    const pool: { catId: string; id: string }[] = []
    CATS.forEach((c) => catItems(c, state).forEach((it) => { if (!state.checked[it.id]) pool.push({ catId: c.id, id: it.id }) }))
    if (!pool.length) { flashNote('모든 항목을 점검했어요! 🎉'); return }
    const t = pick(pool)
    setState((s) => ({ ...s, collapsed: { ...s.collapsed, [t.catId]: false }, expanded: { ...s.expanded, [t.id]: true } }))
    flashNote('아직 점검 안 한 항목으로 이동했어요.')
  }

  // ── 진행률 계산 ──
  const per = CATS.map((c) => {
    const items = catItems(c, state)
    const done = items.filter((it) => state.checked[it.id]).length
    return { cat: c, items, total: items.length, done }
  })
  const visible = per.filter((p) => state.kindFilter === 'all' || p.cat.kind === state.kindFilter)
  const totalItems = per.reduce((a, p) => a + p.total, 0)
  const totalDone = per.reduce((a, p) => a + p.done, 0)
  const totalPct = totalItems ? Math.round((totalDone / totalItems) * 100) : 0
  const q = query.trim().toLowerCase()
  const matches = (it: MergedItem) =>
    !q || it.text.toLowerCase().includes(q) || (it.why || '').toLowerCase().includes(q) || (it.twist || '').toLowerCase().includes(q)

  // ── 내보내기 / 프로젝트 ──
  const exportText = () => {
    const lines: string[] = ['# 현대판타지·회귀 트로프 체크리스트', `진행률: ${totalDone}/${totalItems} (${totalPct}%)`, '']
    per.forEach((p) => {
      lines.push(`## ${p.cat.icon} ${p.cat.name} [${KIND_META[p.cat.kind].tag}] (${p.done}/${p.total})`)
      p.items.forEach((it) => {
        lines.push(`- [${state.checked[it.id] ? 'x' : ' '}] ${it.text}`)
        if (it.why) lines.push(`    ▷ ${it.why}`)
        if (it.twist) lines.push(`    ↻ 비틀기: ${it.twist}`)
      })
      lines.push('')
    })
    copy(lines.join('\n').trim(), 'export')
    flashNote(`체크리스트를 텍스트로 복사했어요 (${totalDone}/${totalItems}).`)
  }
  const toProject = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.'); return }
    const parts: string[] = [
      `<p><b>장르:</b> 현대판타지·회귀</p>`,
      `<p><b>진행률:</b> ${totalDone}/${totalItems} (${totalPct}%)</p>`,
    ]
    per.forEach((p) => {
      parts.push(`<h3>${escHtml(p.cat.icon + ' ' + p.cat.name)} 〔${escHtml(KIND_META[p.cat.kind].tag)}〕 [${p.done}/${p.total}]</h3>`)
      p.items.forEach((it) => {
        parts.push(`<p>${state.checked[it.id] ? '☑' : '☐'} ${escHtml(it.text)}</p>`)
        if (it.why) parts.push(`<p style="margin-left:14px;color:#888;">▷ ${escHtml(it.why)}</p>`)
        if (it.twist) parts.push(`<p style="margin-left:14px;color:#888;">↻ 비틀기: ${escHtml(it.twist)}</p>`)
      })
    })
    const id = addToProject({
      kind: 'text', root: 'research', folder: '기획',
      title: `현판·회귀 트로프 체크 (${totalDone}/${totalItems})`,
      bodyHtml: parts.join(''),
      meta: {
        장르: '현대판타지·회귀',
        진행률: `${totalDone}/${totalItems} (${totalPct}%)`,
        ...Object.fromEntries(per.map((p) => [p.cat.name, `${p.done}/${p.total}`])),
      },
    })
    flashNote(id ? `프로젝트 '기획' 폴더에 트로프 체크 문서를 추가했어요.` : '프로젝트에 추가하지 못했습니다.')
  }

  // ───────── 조합 생성기 ─────────
  const comboCount = SLOTS.reduce((a, s) => a * s.pool.length, 1)
  const reroll = () => setState((s) => {
    const combo = { ...s.combo }
    SLOTS.forEach((sl) => { if (!s.locks[sl.key]) combo[sl.key] = pick(sl.pool) })
    return { ...s, combo }
  })
  const rerollOne = (key: string) => setState((s) => ({ ...s, combo: { ...s.combo, [key]: pick(SLOTS.find((x) => x.key === key)!.pool) } }))
  const toggleLock = (key: string) => setState((s) => ({ ...s, locks: { ...s.locks, [key]: !s.locks[key] } }))

  const comboText = (): string => {
    const get = (k: string) => state.combo[k] || ''
    return [
      `[회귀 시점] ${get('when')}`,
      `[트리거] ${get('trigger')} 회귀했다.`,
      `[첫 행동] 눈을 뜨자마자 ${get('use')}.`,
      `[첫 결심] ${get('vow')} 마음먹는다.`,
      `[곁에 둘 사람] 가장 먼저 떠올린 건 — ${get('ally')}.`,
      `[숨은 위협] ${get('threat')}`,
      `[정서적 닻] 그 모든 동력의 중심엔 — ${get('anchor')}.`,
    ].join('\n')
  }
  const comboTitle = (): string => {
    const w = (state.combo['when'] || '').split(',')[0]
    return `회귀 한 컷 — ${w || '미정'}`
  }
  const copyCombo = () => { copy(comboText(), 'combo'); flashNote('조합 장면 아이디어를 복사했어요.') }
  const comboToLibrary = () => {
    addToLibrary('snippets', { text: comboText(), source: '현판·회귀 트로프 체크', tags: ['현대판타지·회귀', '회귀', '장면아이디어'] })
    flashNote('글감 보관함(스니펫)에 조합 장면을 담았어요.')
  }
  const comboToProject = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = comboText().split('\n').map((l) => `<p>${escHtml(l)}</p>`).join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '기획', title: comboTitle(), bodyHtml, meta: { 장르: '현대판타지·회귀', 종류: '회귀 장면 아이디어' } })
    flashNote(id ? "프로젝트 '기획' 폴더에 회귀 장면 아이디어를 추가했어요." : '프로젝트에 추가하지 못했습니다.')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', fontSize: 14 }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }
  const bar = (h = 8): React.CSSProperties => ({ height: h, borderRadius: 99, background: 'var(--chrome-2)', border: '1px solid var(--border)', overflow: 'hidden', flex: 1, minWidth: 0 })
  const fill = (pct: number): React.CSSProperties => ({ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--ok)' : 'var(--accent)', transition: 'width .25s ease' })
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }
  const catHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', userSelect: 'none', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }
  const itemRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 12px' }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 13.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const tinyBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '3px 6px', borderRadius: 6, flexShrink: 0 }
  const chip = (active: boolean, color = 'var(--accent)'): React.CSSProperties => ({
    padding: '5px 11px', fontSize: 12.5, borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
    border: '1px solid ' + (active ? color : 'var(--border)'),
    background: active ? color : 'var(--chrome-2)', color: active ? '#fff' : 'var(--text)',
  })
  const tag = (kind: Kind): React.CSSProperties => ({
    fontSize: 10.5, fontWeight: 700, color: '#fff', background: KIND_META[kind].color,
    borderRadius: 6, padding: '1px 6px', flexShrink: 0,
  })

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }}><Emoji e="⏳"/> 현판·회귀 트로프 체크</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>현대판타지·회귀</span>
        <span style={{ flex: 1 }} />
        {copied === 'export' ? <span style={{ fontSize: 12, color: 'var(--ok)' }}>✓ 복사됨</span> : null}
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge() || totalItems === 0}
          title={hasProjectBridge() ? "현재 체크 상태를 프로젝트 '기획' 폴더 문서로 추가" : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="minibtn" onClick={exportText} disabled={totalItems === 0} title="체크리스트를 텍스트로 복사"><Emoji e="📋"/> 내보내기</button>
        <button className="minibtn" onClick={resetAll} disabled={totalDone === 0} title="모든 체크 해제">↺ 전체 해제</button>
      </div>

      {/* 전체 진행률 + 필터 + 검색 */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 9, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>전체</span>
          <div style={bar()}><div style={fill(totalPct)} /></div>
          <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, color: totalPct >= 100 ? 'var(--ok)' : 'var(--text)' }}>{totalDone}/{totalItems} · {totalPct}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <button onClick={() => setFilter('all')} style={chip(state.kindFilter === 'all', 'var(--text)')}>전체</button>
          <button onClick={() => setFilter('must')} style={chip(state.kindFilter === 'must', KIND_META.must.color)}>필수 관습</button>
          <button onClick={() => setFilter('trap')} style={chip(state.kindFilter === 'trap', KIND_META.trap.color)}>흔한 함정</button>
          <button onClick={() => setFilter('cliche')} style={chip(state.kindFilter === 'cliche', KIND_META.cliche.color)}>클리셰+비틀기</button>
          <span style={{ flex: 1 }} />
          <input style={{ ...input, width: 150, flex: '0 0 auto' }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍 항목 검색…" maxLength={40} />
          <button className="minibtn" onClick={jumpRandom} title="아직 점검 안 한 항목으로 이동"><Emoji e="🎲"/> 무작위 점검</button>
        </div>
      </div>

      {note && <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--warn)', borderBottom: '1px solid var(--border)' }}>{note}</div>}
      {payloadGenre && payloadGenre !== '현대판타지·회귀' && (
        <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
          연계로 전달된 장르: {payloadGenre} — 이 도구는 현대판타지·회귀에 특화돼 있어요.
        </div>
      )}

      <div style={body}>
        {/* 카테고리별 체크리스트 */}
        {visible.map(({ cat, items, total, done }) => {
          const pct = total ? Math.round((done / total) * 100) : 0
          const open = !state.collapsed[cat.id]
          const draft = drafts[cat.id] || ''
          const shown = items.filter(matches)
          if (q && shown.length === 0) return null
          return (
            <div key={cat.id} style={card}>
              <div style={catHead} onClick={() => toggleCollapse(cat.id)}>
                <span style={{ fontSize: 11, color: 'var(--muted)', width: 12, flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
                <span style={{ fontSize: 16, flexShrink: 0 }}><Emoji e={cat.icon}/></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {cat.name}<span style={tag(cat.kind)}>{KIND_META[cat.kind].tag}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.desc}</div>
                </div>
                <div style={{ width: 80, flexShrink: 0 }}><div style={bar(6)}><div style={fill(pct)} /></div></div>
                <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, width: 52, textAlign: 'right', color: pct >= 100 && total > 0 ? 'var(--ok)' : 'var(--muted)' }}>{done}/{total}</span>
              </div>

              {open && (
                <div>
                  {shown.length === 0 ? (
                    <div style={{ padding: '14px 12px', fontSize: 12.5, color: 'var(--muted)' }}>표시할 항목이 없어요. 아래에서 점검 항목을 추가하세요.</div>
                  ) : (
                    shown.map((it) => {
                      const isEditing = editing && editing.id === it.id
                      const checked = !!state.checked[it.id]
                      const exp = !!state.expanded[it.id]
                      const hasDetail = !!(it.why || it.twist)
                      return (
                        <div key={it.id} style={{ borderTop: '1px solid var(--border)' }}>
                          <div style={itemRow}>
                            {isEditing ? (
                              <>
                                <input style={{ ...input, flex: 1 }} value={editing!.text} autoFocus
                                  onChange={(e) => setEditing({ id: it.id, text: e.target.value })}
                                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit() } if (e.key === 'Escape') { e.preventDefault(); setEditing(null) } }}
                                  aria-label="항목 수정" />
                                <button style={tinyBtn} onClick={saveEdit}>저장</button>
                                <button style={tinyBtn} onClick={() => setEditing(null)}>취소</button>
                              </>
                            ) : (
                              <>
                                <input type="checkbox" checked={checked} onChange={() => toggle(it.id)}
                                  style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, cursor: 'pointer', accentColor: 'var(--accent)' }} aria-label={it.text} />
                                <span onClick={() => toggle(it.id)}
                                  style={{ flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.5, cursor: 'pointer', wordBreak: 'keep-all', color: checked ? 'var(--muted)' : 'var(--text)', textDecoration: checked ? 'line-through' : 'none' }}>
                                  {it.text}
                                  {it.user && <span style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 5, padding: '0 4px' }}>내 항목</span>}
                                </span>
                                {hasDetail && <button style={tinyBtn} title={exp ? '해설 접기' : '해설 보기'} onClick={() => toggleExpand(it.id)}>{exp ? '▴ 해설' : '▾ 해설'}</button>}
                                <button style={tinyBtn} title="수정" onClick={() => setEditing({ id: it.id, text: it.text })}>✎</button>
                                <button style={{ ...tinyBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeItem(cat.id, it.id, it.user)}>✕</button>
                              </>
                            )}
                          </div>
                          {exp && hasDetail && (
                            <div style={{ padding: '0 12px 10px 37px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {it.why && <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--muted)', wordBreak: 'keep-all' }}><b style={{ color: 'var(--text)' }}>왜 중요한가 </b>{it.why}</div>}
                              {it.twist && (
                                <div style={{ fontSize: 12.5, lineHeight: 1.6, background: 'var(--chrome-2)', border: '1px dashed var(--ok)', borderRadius: 8, padding: '7px 9px', wordBreak: 'keep-all', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                                  <span style={{ flexShrink: 0 }}>↻</span>
                                  <span><b style={{ color: 'var(--ok)' }}>비틀기 </b>{it.twist}</span>
                                  <button style={{ ...tinyBtn, marginLeft: 'auto' }} title="비틀기 복사" onClick={() => copy(it.twist!, 'tw' + it.id)}>{copied === 'tw' + it.id ? '✓' : '복사'}</button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}

                  <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
                    <input style={{ ...input, flex: 1 }} value={draft}
                      onChange={(e) => setDrafts((d) => ({ ...d, [cat.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUserItem(cat.id) } }}
                      placeholder={`${cat.name}에 점검 항목 추가…`} maxLength={160} aria-label={`${cat.name} 항목 추가`} />
                    <button className="minibtn" onClick={() => addUserItem(cat.id)} disabled={!draft.trim()}>＋ 추가</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* 보너스: 클리셰×비틀기 조합 생성기 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 16 }}><Emoji e="🎰"/></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>회귀 한 컷 — 조합 생성기</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>슬롯을 잠그고 재생성해 회귀 도입 장면 아이디어를 뽑으세요</div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>조합수 약 <b style={{ color: 'var(--accent)' }}>{fmtBig(comboCount)}</b> ({comboCount.toLocaleString()})</span>
          </div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SLOTS.map((sl) => {
              const locked = !!state.locks[sl.key]
              return (
                <div key={sl.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <button style={{ ...tinyBtn, background: locked ? 'var(--accent)' : 'var(--paper)', color: locked ? '#fff' : 'var(--muted)', marginTop: 1 }}
                    title={locked ? '잠금 해제' : '이 슬롯 잠금(재생성 시 고정)'} onClick={() => toggleLock(sl.key)}>{locked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
                  <div style={{ flex: 1, minWidth: 0, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', marginBottom: 2 }}><Emoji e={sl.icon}/> {sl.label}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, wordBreak: 'keep-all' }}>{state.combo[sl.key] || '—'}</div>
                  </div>
                  <button style={{ ...tinyBtn, marginTop: 1 }} title="이 슬롯만 다시" onClick={() => rerollOne(sl.key)}><Emoji e="🎲"/></button>
                </div>
              )
            })}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
              <button className="btn-primary" onClick={reroll}><Emoji e="🎲"/> 다시 굴리기(잠금 제외)</button>
              <button className="minibtn" onClick={copyCombo}>{copied === 'combo' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 장면 복사</>}</button>
            </div>
            {/* 연계 */}
            <div className="linkbar" style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginTop: 4 }}>
              <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
              <button className="linkbtn" onClick={comboToProject} disabled={!hasProjectBridge()}
                title={hasProjectBridge() ? "프로젝트 '기획' 폴더에 장면 아이디어 추가" : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
              <button className="linkbtn" onClick={comboToLibrary} title="글감 보관함(스니펫)에 담기"><Emoji e="📥"/> 글감으로 담기</button>
              <button className="linkbtn" onClick={() => openToolLinked('logline-forge', { genre: '현대판타지·회귀', seed: comboText() })} title="로그라인 빌더 열기"><Emoji e="🧲"/> 로그라인 빌더</button>
              <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck', { genre: '현대판타지·회귀' })} title="반전 카드 덱 열기"><Emoji e="🃏"/> 반전 카드</button>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6, paddingBottom: 4 }}>
          항목을 눌러 체크하고, <b>▾ 해설</b>로 “왜 중요한가/비틀기”를 펼치세요. 기본 항목도 수정·삭제할 수 있고 내 항목을 추가할 수 있어요.
          상단 필터(필수/함정/클리셰)와 검색, 🎲 무작위 점검으로 빠르게 훑을 수 있습니다. 모든 진행 상황은 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
