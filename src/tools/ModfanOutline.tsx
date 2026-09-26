// 현대판타지·회귀 개요(아웃라인) 빌더 — 이 장르 표준 구조에 맞춘 장·막 개요 템플릿을 채우는 도구.
// 현판 회귀의 4대 구조(① 종합 표준 3막형 ② 헌터·게이트 회귀형 ③ 경제·재벌 회귀형 ④ 연예·콘텐츠 회귀형)를
// 골라 그 결에 맞는 막·비트를 펼치고, 각 비트에 내용을 적고(자동저장), 비트를 추가·삭제·순서변경·완료체크한다.
// "현판 회귀 비트 영감 굴리기"로 장르 특화 슬롯(회귀 트리거·시점·미래지식·선점·전생대비·사이다·나비효과·들킴긴장·절단마공)을
// 무작위 조합해 빈칸을 채울 글감을 만든다(슬롯 잠금/재굴림 · 조합수 표시 · 1조 이상).
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크 없음(전부 로컬·자작 데이터). 언마운트 시 타이머 정리.
// 데이터: localStorage 'sry:tool:modfan-outline' (템플릿별 비트 내용·작품 메타·순서·완료 보관).
// 연계: addToProject(root:'draft', folder:'개요') 로 바인더 원고에 개요 문서 추가, addToLibrary('snippets', ...) 로 굴린 영감 보관,
//       openToolLinked 로 관련 도구(플롯 피라미드·장면 목록·인물 시트·관계도·세계관 위키·감정 곡선) 열기.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked } from './linkbus'
import { Emoji, emojify } from './linkbus'

export const meta = {
  id: 'modfan-outline',
  name: '현판 회귀 개요 빌더',
  icon: '⏳',
  group: '구조',
  genre: '현대판타지·회귀',
  intro: '현대판타지·회귀 표준 구조(종합 3막·헌터게이트·경제재벌·연예콘텐츠)에 맞춰 장·막 개요를 채우고 회귀 비트 영감을 굴리세요',
  w: 740,
  h: 690,
}

const LS = 'sry:tool:modfan-outline'
const GENRE = '현대판타지·회귀'

// ──────────────────────────────────────────────────────────────────────────
// 비트(개요 항목) 모델 — 막(act) 라벨로 묶이는 고정 비트 + 사용자가 더한 자유 비트
// ──────────────────────────────────────────────────────────────────────────
interface BeatDef {
  key: string
  act: string        // 막/구간 라벨
  title: string      // 비트 이름
  hint: string       // 이 비트에 무엇을 쓸지 안내(현판 회귀 특화)
}
interface TemplateDef {
  key: string
  label: string
  icon: string
  tag: string        // 하위유형 한 줄 설명
  blurb: string      // 어떤 작품에 맞는지(레퍼런스/근거 포함)
  beats: BeatDef[]
}

// ── 1) 종합 표준 3막형 — 현판 회귀의 보편 골격(각성→세력화→메타지식 붕괴·청산) ─────
const T_STANDARD: BeatDef[] = [
  { key: 'st_death', act: '프롤로그 · 비극의 끝', title: '전생의 죽음·배신·후회', hint: '주인공이 죽거나 모든 것을 잃는 마지막 순간을 먼저 제시. 배신자·실패·못 지킨 사람을 각인해 회귀의 무게를 만든다. "두 번째 기회"의 동기 부여.' },
  { key: 'st_wake', act: '1막 · 회귀 각성(~30화)', title: '다시 눈을 뜨다 — 시점 자각', hint: '"익숙한 천장이다." 젊어진 몸·거울·살아있는 가족을 보며 회귀를 자각. "왜 하필 이 시점인가"(중요 분기 직전)를 명확히 의미화한다.' },
  { key: 'st_first', act: '1막 · 회귀 각성(~30화)', title: '첫 미래지식 행사 + 작은 승리', hint: '1화~초반 안에 미래를 안다는 사실의 첫 활용을 반드시 보여준다(종목·로또·면접·사건 예측). 막힘 없는 첫 사이다로 후킹.' },
  { key: 'st_check', act: '1막 · 회귀 각성(~30화)', title: '이번 생의 체크리스트 선언', hint: '①가족 살리기 ②그놈 응징 ③이것 선점… 회귀 직후 할 일 목록으로 챕터 단위 추진력을 깐다. 단기 떡밥과 거대 미래 사건(원거리 떡밥)을 병렬로 예고.' },
  { key: 'st_base', act: '1막 · 회귀 각성(~30화)', title: '종잣돈·명성·기반 확보', hint: '첫 성공으로 자금·지위·핵심 인맥을 마련. 전생의 무능했던 자아와 대비되는 처리(같은 상황, 다른 결과)로 성장을 입증.' },
  { key: 'st_expand', act: '2막 · 확장·세력화', title: '사업/세력/팀의 성장', hint: '회사·길드·팀·소속을 키운다. 레벨·랭킹·재산·인지도 등 수치/등급 성장 지표를 주기적으로 갱신해 진척감을 준다.' },
  { key: 'st_recruit', act: '2막 · 확장·세력화', title: '미래의 거물 선점·포섭', hint: '아직 무명인 미래의 대스타·천재·핵심 인재를 알아보고 미리 잡는다. 선점 모티프. "쟤가 미래의 그 사람"을 아는 자만의 우위.' },
  { key: 'st_rival', act: '2막 · 라이벌·중간 빌런', title: '중간 빌런·전생 원수와의 첫 충돌', hint: '한때 나를 짓밟던 존재가 아직은 우위. 작은 응징과 더 큰 청산을 분리 배치. 통쾌함을 누적시키는 계단의 첫 칸.' },
  { key: 'st_suspect', act: '2막 · 정보 누설 긴장', title: '"어떻게 알았지?" 의심 관리', hint: '미래를 안다는 게 들킬 위험. 예지력·천재성·우연으로 위장. 주변의 "넌 왜 이렇게 변했어?"를 적당히 둘러대는 긴장 장치.' },
  { key: 'st_butterfly', act: '3막 · 메타지식 붕괴', title: '나비효과 — 미래가 바뀌기 시작', hint: '주인공의 개입으로 "내가 아는 미래가 더 이상 안 통한다." 메타지식 무효화로 중반 이후 긴장을 회복. 진짜 위기의 서막.' },
  { key: 'st_crisis', act: '3막 · 진짜 위기', title: '근원 빌런·다른 회귀자의 역습', hint: '예지가 통하지 않는 적(또 다른 회귀자/예지자/시스템)이 등장. "너도 회귀자냐"식 정보전이거나, 바뀐 미래가 부른 최악의 국면.' },
  { key: 'st_self', act: '절정 · 자력 승리', title: '쌓아온 실력·인맥으로 돌파', hint: '치트만으로 끝내지 않는다. 회귀 후 스스로 쌓은 실력·동료·기반으로 이긴다(장르의 도덕). 전생의 한 + 현생의 성취가 한 점에 모인다.' },
  { key: 'st_reckon', act: '절정 · 청산', title: '근원 빌런 압도적 청산', hint: '나를 죽인/배신한 근원과 망친 조직을 최종장에서 압도적으로 청산. 한때 거대했던 존재를 내려다보는 체급 역전의 시각화.' },
  { key: 'st_end', act: '결말 · 안정엔딩', title: '두 번째 인생의 행복 + 후일담', hint: '못 지킨 사람을 이번엔 지킨 정서적 정점. 가족·제국·일상의 완성. 현판 회귀는 비극보다 성취·안정 엔딩을 선호.' },
]

// ── 2) 헌터·게이트 회귀형 — 각성·시스템·게이트 출현 타임라인을 메타지식으로 ─────────
const T_HUNTER: BeatDef[] = [
  { key: 'hu_death', act: '프롤로그 · 최후의 전선', title: '최종 던전·대균열에서의 전사', hint: '인류 최후의 방어선이 무너지고 주인공이 전사하거나 모두를 잃는다. 막지 못한 멸망·배신한 길드를 각인. 회귀 동력을 만든다.' },
  { key: 'hu_wake', act: '1막 · 각성 이전', title: '각성 전·게이트 초기로 회귀', hint: '시스템이 막 깔리던/게이트가 처음 열리던 그 시점으로 회귀. 헌터협회·등급제·던전 공략법을 미리 아는 절대적 정보 비대칭.' },
  { key: 'hu_awaken', act: '1막 · 재각성', title: '의도된 재각성 — 최적 루트', hint: '전생엔 F급이었지만, 각성 조건·히든 클래스·스탯 분배를 알기에 최적의 각성을 설계. 시스템 창·스킬·등급으로 성장 가시화.' },
  { key: 'hu_first', act: '1막 · 첫 공략', title: '첫 게이트 — 미래지식 솔플', hint: '함정·패턴·드랍을 다 아는 던전을 압도적으로 클리어. 숨은 보상·EX급 아이템 선점. 막힘 없는 첫 사이다.' },
  { key: 'hu_hide', act: '1막 · 실력 은폐', title: '재능 숨기기·등급 위장', hint: '실력을 감추고 낮은 등급으로 위장(나중에 폭발할 떡밥). "어떻게 던전 구조를 알지?"라는 의심을 우연·관찰력으로 둘러댄다.' },
  { key: 'hu_guild', act: '2막 · 세력화', title: '길드 창설·미래의 S급 영입', hint: '전생에 죽거나 적이 됐던 떡잎 천재들을 미리 포섭해 길드를 꾸린다. 미래의 강자 선점 모티프. 랭킹·전력 수치로 성장 표시.' },
  { key: 'hu_event', act: '2막 · 예고된 사건', title: '게이트 브레이크·재해 선제 대응', hint: '몇 월 며칠 어느 도시에 어떤 등급 게이트가 터지는지 안다. 예고된 미래 사건을 미리 막아 명성·신뢰를 쌓는다(setup-payoff).' },
  { key: 'hu_assoc', act: '2막 · 협회 정치', title: '헌터협회·랭커 권력 구도 재편', hint: '부패한 협회 간부·기득권 랭커와의 수싸움. 전생의 적을 무기로, 동맹을 재배치. 던전 이권·등급 심사를 둘러싼 견제.' },
  { key: 'hu_butterfly', act: '3막 · 분기 변동', title: '바뀐 미래 — 없던 게이트·없던 적', hint: '주인공의 개입으로 원래 없던 변수 등장(앞당겨진 대균열, 변종 마수). "내가 아는 미래가 깨졌다." 메타지식 무효화.' },
  { key: 'hu_other', act: '3막 · 회귀자 인식', title: '또 다른 회귀자/예지자 빌런', hint: '"너도 돌아왔구나." 미래를 아는 또 다른 존재와의 정보전. 시스템의 진짜 정체·세계의 근원 비밀이 드러나기 시작.' },
  { key: 'hu_self', act: '절정 · 자력 돌파', title: '쌓아온 길드·실력으로 정면 격파', hint: '예지가 안 통하는 최종 국면을 회귀 후 스스로 키운 동료·스탯·전략으로 돌파. 전생의 한과 현생의 힘이 한 점에 모인다.' },
  { key: 'hu_reckon', act: '절정 · 근원 청산', title: '게이트의 근원·배신자 단죄', hint: '게이트를 부른 근원(차원·신·흑막)과 전생의 배신자를 압도적으로 청산. 인류 멸망의 타임라인을 갈아엎는다.' },
  { key: 'hu_end', act: '결말 · 평온', title: '게이트 닫힌 세계 + 후일담', hint: '균열이 닫히고 평범한 일상이 돌아온다. 지켜낸 동료·가족과의 안정엔딩. (선택)새 차원·외전 떡밥을 남긴다.' },
]

// ── 3) 경제·재벌 회귀형 — 『재벌집 막내아들』식 자본·정보 비대칭 ────────────────────
const T_TYCOON: BeatDef[] = [
  { key: 'ty_death', act: '프롤로그 · 몰락', title: '전생의 파산·토사구팽·억울한 죽음', hint: '충성을 바친 가문/회사에 버려지거나 누명으로 모든 것을 잃는 마지막. 나를 짓밟은 자본 권력을 각인해 복수·성공의 동력을 만든다.' },
  { key: 'ty_wake', act: '1막 · 회귀 각성', title: '구체 연도로 회귀 — IMF/닷컴 직전', hint: '"20○○년 ○월이군." 외환위기·닷컴버블·코인 폭등 등 거대 경제 분기 직전으로 회귀. 실제 트렌드를 가공한 디테일이 리얼리티의 핵심.' },
  { key: 'ty_seed', act: '1막 · 회귀 각성', title: '종잣돈 마련 — 저점 매수·선물', hint: '폭등할 종목·환율·코인·부동산을 안다. 첫 베팅으로 종잣돈을 만든다. "이 종목, 이 날짜… 전부 기억하고 있다." 첫 사이다.' },
  { key: 'ty_target', act: '1막 · 회귀 각성', title: '목표 설정 — 복수와 인수 리스트', hint: '①가족 빚 청산 ②나를 버린 자 응징 ③저평가 알짜 기업 선점… 인수합병·상장 타임라인을 표로 깐다(단기·장기 떡밥 병렬).' },
  { key: 'ty_buy', act: '2막 · 선점·확장', title: '저평가 자산·인재 선점', hint: '미래의 대기업이 될 스타트업, 떡잎 천재 경영자, 헐값 부동산을 남보다 먼저 확보. 선점 모티프로 자본을 굴린다.' },
  { key: 'ty_corp', act: '2막 · 선점·확장', title: '기업 인수·경영권 장악', hint: '미래를 아는 의사결정으로 사업을 키운다. 매출·시총·지분 등 수치 성장을 주기적으로 보고해 진척감을 준다.' },
  { key: 'ty_jealous', act: '2막 · 권력 다툼', title: '전생 가해자의 견제·뒤늦은 후회', hint: '나를 버렸던 자본 권력이 견제하기 시작. 무시했던 자가 후회·집착한다. 작은 응징을 통쾌하게 배치(큰 청산은 후반으로).' },
  { key: 'ty_suspect', act: '2막 · 정보 누설 긴장', title: '"저 어린놈이 어떻게?" 의심 관리', hint: '미래를 아는 듯한 정확한 베팅이 의심을 산다. 천재성·정보망·우연으로 위장. 들킬 위험을 긴장 장치로 운용.' },
  { key: 'ty_butterfly', act: '3막 · 분기 변동', title: '나비효과 — 빗나가는 시장', hint: '주인공의 개입으로 시장이 원래 미래와 달라진다. "내가 아는 차트가 안 통한다." 메타지식 무효화로 진짜 경영 실력의 시험대.' },
  { key: 'ty_war', act: '3막 · 자본 전쟁', title: '적대적 인수·다른 회귀자 자본', hint: '근원 빌런(거대 자본/정·재계 카르텔)의 적대적 M&A, 혹은 또 다른 회귀자의 자본이 부딪친다. 누명·검찰·경영권 분쟁의 위기.' },
  { key: 'ty_self', act: '절정 · 자력 승리', title: '쌓아온 제국·인맥으로 역전', hint: '미래지식이 무력화된 국면을, 회귀 후 스스로 쌓은 기업·인맥·신뢰로 돌파. 정공법 경영과 한 수 위의 판단으로 이긴다.' },
  { key: 'ty_reckon', act: '절정 · 청산', title: '근원 자본·배신자 공개 단죄', hint: '나를 버린 가문/카르텔을 만천하에 무너뜨리는 공개 단죄(이사회·청문회·언론). 한때 올려다보던 거대 권력을 내려다보는 역전.' },
  { key: 'ty_end', act: '결말 · 제국 완성', title: '자본 제국 + 지켜낸 가족', hint: '전생과 정반대의 위상. 못 지킨 가족·사람을 이번엔 지켜낸 안정엔딩. 외전에서 후계·일상의 여유를 보상으로.' },
]

// ── 4) 연예·콘텐츠 회귀형 — 데뷔 직전 회귀·미래 히트작 선점 ──────────────────────
const T_STAR: BeatDef[] = [
  { key: 'sr_death', act: '프롤로그 · 무대의 끝', title: '망한 연예인/창작자의 마지막', hint: '데뷔 실패·계약 노예·표절 누명·번아웃으로 무너지는 마지막. 빼앗긴 곡/배역, 나를 짓밟은 기획사를 각인해 회귀 동력을 만든다.' },
  { key: 'sr_wake', act: '1막 · 회귀 각성', title: '데뷔/오디션 직전으로 회귀', hint: '데뷔조 탈락 전, 오디션 직전, 연습생 시절로 회귀. 어떤 곡·드라마·웹툰·게임이 대박날지 안다는 콘텐츠 메타지식이 무기.' },
  { key: 'sr_first', act: '1막 · 회귀 각성', title: '미래 히트 콘텐츠 선점', hint: '아직 세상에 없는(혹은 묻힐) 명곡·시나리오·연출을 본인이 먼저 선보인다. 첫 무대/오디션에서 압도적 반응으로 후킹.' },
  { key: 'sr_scout', act: '1막 · 회귀 각성', title: '미래의 거장·동료 포섭', hint: '아직 무명인 미래의 천재 작곡가·연출가·라이벌 스타를 알아보고 미리 합류시킨다. 선점 모티프. 데뷔조·팀을 재설계.' },
  { key: 'sr_rise', act: '2막 · 떡상·세력화', title: '음원 올킬·역주행·인지도 급상승', hint: '차트 순위·구독·팬덤·인지도 등 수치 성장을 주기적으로 갱신. 미래 트렌드를 선점해 매 활동마다 우상향 곡선을 그린다.' },
  { key: 'sr_agency', act: '2막 · 업계 정치', title: '기획사·방송가 권력과의 수싸움', hint: '노예계약·끼워팔기·갑질하는 업계 기득권과의 대립. 전생의 적을 무기로, 미래 정보를 협상 카드로 판을 뒤집는다.' },
  { key: 'sr_rival', act: '2막 · 라이벌', title: '전생 표절자·라이벌과의 충돌', hint: '내 곡/배역을 빼앗았던 자가 아직은 우위. 진짜 원작자가 누구인지 증명할 포석을 깐다. 작은 응징과 큰 청산을 분리.' },
  { key: 'sr_suspect', act: '2막 · 정보 누설 긴장', title: '"어떻게 이런 곡을?" 의심 관리', hint: '시대를 앞선 감각이 의심·시기를 부른다. 천재성·우연·영감으로 위장. 표절 의혹 역공의 위험을 긴장 장치로 운용.' },
  { key: 'sr_butterfly', act: '3막 · 분기 변동', title: '나비효과 — 바뀐 트렌드', hint: '주인공의 활동으로 시장이 원래 미래와 달라진다. "내가 아는 히트 공식이 안 통한다." 메타지식 무효화로 진짜 실력의 시험대.' },
  { key: 'sr_war', act: '3막 · 진짜 위기', title: '대형 음모·다른 회귀자 라이벌', hint: '근원 빌런(거대 기획사/언론)의 매장 시도, 혹은 또 다른 회귀자가 같은 미래 콘텐츠를 선점하려 든다. 논란·계약·여론 위기.' },
  { key: 'sr_self', act: '절정 · 자력 승리', title: '쌓아온 실력·팬덤으로 정면 돌파', hint: '미래지식이 무력화된 국면을, 회귀 후 갈고닦은 진짜 실력·자작 역량·팬덤으로 이긴다. 빌린 미래가 아닌 자신의 작품으로 증명.' },
  { key: 'sr_reckon', act: '절정 · 청산', title: '표절자·악덕 기획사 공개 청산', hint: '내 것을 빼앗고 짓밟은 자들을 만천하에 단죄(시상식·생방송·법정). 한때 올려다보던 정상을 내려다보는 체급 역전.' },
  { key: 'sr_end', act: '결말 · 정점', title: '정상의 자리 + 후일담', hint: '전생에 닿지 못한 무대를 이번엔 손에 넣는다. 지켜낸 동료·팬과의 안정엔딩. 외전에서 차기작·일상의 여유를 보상으로.' },
]

const TEMPLATES: TemplateDef[] = [
  { key: 'standard', label: '종합 표준 3막형', icon: '⏳', tag: '각성→세력화→메타지식 붕괴·청산', blurb: '현판 회귀의 보편 골격. 비극→회귀 각성→첫 사이다→세력화→나비효과로 미래지식 무효화→자력 청산→안정엔딩. 직업·소재 무관 범용 구조.', beats: T_STANDARD },
  { key: 'hunter', label: '헌터·게이트 회귀형', icon: '🌀', tag: '각성·시스템·게이트 타임라인', blurb: '『나 혼자만 레벨업』식 현대+각성 문법 + 회귀. 게이트 출현일·등급·공략법을 미리 아는 정보 비대칭. 시스템 창·등급·길드·협회 정치.', beats: T_HUNTER },
  { key: 'tycoon', label: '경제·재벌 회귀형', icon: '💰', tag: '자본·정보 비대칭 · 선점', blurb: '『재벌집 막내아들』식. 구체 연도로 회귀해 종잣돈→선점→인수합병으로 자본 제국 건설, 나를 버린 권력을 공개 단죄.', beats: T_TYCOON },
  { key: 'star', label: '연예·콘텐츠 회귀형', icon: '🎤', tag: '데뷔 직전 회귀 · 히트작 선점', blurb: '아이돌·작가·창작자 회귀물. 데뷔/오디션 직전으로 돌아가 미래 히트 콘텐츠를 선점, 차트·팬덤을 우상향시키고 표절자를 청산.', beats: T_STAR },
]
function tplDef(k: string): TemplateDef { return TEMPLATES.find((t) => t.key === k) || TEMPLATES[0] }

// ──────────────────────────────────────────────────────────────────────────
// 현판 회귀 비트 영감 굴리기 — 장르 특화 슬롯 풀(잠금/재굴림, 조합수 표시)
//   문장 골격: [회귀 트리거]로 [회귀 시점]에서 다시 눈을 뜬 주인공이,
//              [미래지식]을 무기로 [선점 행동]에 나선다. [전생 대비]하며 [사이다·역전]을 끌어내지만,
//              [나비효과·변수]가 닥치고 [들킴·긴장]이 조여드는 사이, [절단마공]으로 다음 화를 연다.
// 조합수 = 9개 풀 길이의 곱(아래에서 자동 계산·표시) → 1조 이상 지향(핵심 생성기).
// ──────────────────────────────────────────────────────────────────────────
// 정합성: 슬롯 항목마다 장르 태그를 붙여 같은 세계관끼리만 결합한다.
//   g=''  → 장르 중립(어느 계열에도 모순 없음. 종합 3막형 포함 전 계열 공용)
//   g='h' → 헌터·게이트 / g='t' → 경제·재벌 / g='s' → 연예·콘텐츠
// 굴리기는 먼저 한 계열(h/t/s/중립전용)을 고르고, 각 슬롯은 (중립 ∪ 그 계열) 항목만 뽑는다.
// → 히든클래스 각성(헌터)과 곡 발표 무대(연예)가 한 로그라인에 섞이는 세계관 모순이 구조적으로 불가능.
type Slottable = readonly [string, '' | 'h' | 't' | 's']
const SLOT_TRIGGER: Slottable[] = [ // 회귀 트리거
  ['믿었던 동료의 배신에 등을 찔리고 죽은 순간', ''], ['인류 최후의 방어선이 무너지며 전사한 순간', 'h'], ['충성을 바친 가문에 토사구팽당해 버려진 순간', 't'],
  ['누명을 쓰고 옥중에서 숨을 거둔 순간', ''], ['빼앗긴 곡이 1위에 오르는 걸 병상에서 지켜본 순간', 's'], ['파산 통지서를 손에 쥔 채 옥상에 선 순간', 't'],
  ['대균열에 삼켜지며 모든 동료를 잃은 순간', 'h'], ['계약 노예로 무대 뒤에서 잊혀 죽은 순간', 's'], ['나를 버린 회사의 성공 뉴스를 보다 쓰러진 순간', 't'],
  ['복수도 못 한 채 병으로 스러진 순간', ''], ['지키지 못한 가족의 묘 앞에서 무너진 순간', ''], ['마지막 던전에서 길드장에게 버림받은 순간', 'h'],
  ['표절 누명으로 업계에서 매장당해 사라진 순간', 's'], ['정적의 독이 든 잔을 비운 순간', ''], ['몰락한 가문의 빚더미에 깔려 끝난 순간', 't'],
  ['데뷔조에서 밀려나 무명으로 늙어버린 자신을 본 순간', 's'], ['세계의 멸망을 막지 못하고 눈을 감은 순간', 'h'], ['평생 충성한 보스의 칼에 베인 순간', ''],
  ['내 아이디어로 떡상한 회사를 멀리서 바라본 순간', 't'], ['최종 보스에게 동료를 미끼로 버려진 순간', 'h'], ['억울함을 풀지 못한 채 사형대에 선 순간', ''],
  ['사고로 모든 걸 잃고 후회만 남은 순간', ''], ['평생의 라이벌에게 무릎 꿇은 순간', ''], ['믿었던 스승이 흑막이었음을 알고 죽은 순간', ''],
  ['회귀자인 적에게 미래를 빼앗기고 진 순간', ''], ['내가 키운 후배에게 자리를 뺏기고 잊혀진 순간', ''], ['재난을 막지 못해 도시와 함께 사라진 순간', 'h'],
  ['마지막 숨에 "다시 한번만"을 빌며 눈을 감은 순간', ''],
  ['내 손으로 키운 제국이 통째로 적의 손에 넘어가는 걸 지켜본 순간', 't'], ['단 한 사람도 지키지 못하고 빈손으로 무너진 순간', ''],
]
const SLOT_WHEN: Slottable[] = [ // 회귀 시점 (구체·분기 직전)
  ['각성도 시스템도 없던 게이트 첫 출현 직전으로', 'h'], ['외환위기가 터지기 직전의 그해 가을로', 't'], ['데뷔조 발표를 사흘 앞둔 연습생 시절로', 's'],
  ['코인·닷컴 광풍이 시작되기 직전으로', 't'], ['가족이 아직 모두 살아있던 고등학생 시절로', ''], ['첫 던전이 열리던 운명의 그날 새벽으로', 'h'],
  ['나를 버릴 회사에 입사하기 직전으로', 't'], ['대형 오디션 본선 전날 밤으로', 's'], ['아버지의 사업이 무너지기 한 달 전으로', 't'],
  ['대균열이 터지기 정확히 100일 전으로', 'h'], ['내 곡을 빼앗길 작업실에 들어가기 직전으로', 's'], ['치명적 선택을 했던 그 갈림길 바로 앞으로', ''],
  ['협회가 부패하기 전, 헌터제도 초창기로', 'h'], ['첫 주식 계좌를 트던 스무 살 그 봄으로', 't'], ['동생이 사고를 당하기 일주일 전으로', ''],
  ['재능을 묻어버린 첫 무대 직전으로', 's'], ['배신자가 입사 면접을 보던 그날로', ''], ['세계 최초의 게이트 브레이크 직전으로', 'h'],
  ['집안이 몰락의 첫발을 떼던 그 계약일로', 't'], ['내 인생 최고의 기회를 놓쳤던 그 순간 직전으로', ''], ['시스템이 인류에게 막 내려오던 그 밤으로', 'h'],
  ['모든 것이 어긋나기 시작한 운명의 분기점 직전으로', ''],
  ['회사가 세상을 뒤집을 신기술을 발표하기 직전의 그 분기로', 't'], ['모든 것을 걸었던 첫 계약서에 서명하기 직전으로', ''],
  ['모든 비극의 방아쇠가 당겨지기 직전으로', ''], ['되돌리고 싶던 그 하루의 아침으로', ''], ['아직 아무것도 늦지 않은 그 시절로', ''],
  ['전생의 파국이 시작된 바로 그 계절로', ''], ['운명이 갈리기 직전의 결정적 하루로', ''],
]
const SLOT_KNOW: Slottable[] = [ // 미래지식·메타지식
  ['게이트의 출현일과 등급을 정확히 아는', 'h'], ['폭등할 종목과 코인의 차트를 통째로 기억하는', 't'], ['대박날 곡과 시나리오를 머릿속에 담아둔', 's'],
  ['누가 배신자이고 누가 떡잎 천재인지 아는', ''], ['히든 클래스와 최적 각성 루트를 꿰뚫은', 'h'], ['다가올 대지진·재해의 날짜를 아는', ''],
  ['저평가된 알짜 기업과 부동산을 점찍어둔', 't'], ['전생에 겪은 사건 전개를 통째로 아는', ''], ['적의 약점과 미래의 범죄를 미리 아는', ''],
  ['EX급 아이템의 위치와 획득 조건을 아는', 'h'], ['미래의 대스타가 될 무명을 알아보는', 's'], ['시장과 트렌드가 어떻게 흐를지 아는', 't'],
  ['던전의 함정과 보스 패턴을 전부 외운', 'h'], ['정·재계 권력의 흥망 타임라인을 쥔', 't'], ['예언과 신탁의 진짜 해석을 아는', ''],
  ['인수합병과 상장의 시점을 정확히 아는', 't'], ['전생의 함정을 역이용할 수를 아는', ''], ['회귀 전 적들의 다음 수를 읽는', ''],
  ['아직 세상에 없는 명곡·연출을 기억하는', 's'], ['세계의 근원 비밀 한 조각을 엿본', ''], ['누가 회귀자인지 한눈에 감지하는', ''],
  ['재난을 미리 막을 골든타임을 아는', ''], ['미래의 기술·설계도를 머릿속에 둔', ''], ['전생에서 죽을 사람과 살 사람을 가르는', ''],
  ['전생에 놓친 결정적 선택의 정답을 아는', ''], ['적이 다음에 둘 수를 한발 먼저 읽는', ''], ['누구를 믿고 누구를 끊어야 할지 아는', ''],
  ['전생의 모든 후회를 곱씹어 외워둔', ''], ['승부를 가른 단 한 번의 분기점을 아는', ''],
]
const SLOT_SEIZE: Slottable[] = [ // 선점·행동
  ['폭등 직전의 종목을 전 재산으로 매수하고', 't'], ['아직 무명인 미래의 거장을 먼저 영입하며', 's'], ['헐값에 나온 알짜 기업을 통째로 사들이고', 't'],
  ['히든 클래스로 의도된 재각성을 설계하며', 'h'], ['첫 게이트를 함정까지 다 알고 솔플로 클리어하고', 'h'], ['대박날 곡을 본인 이름으로 먼저 발표하며', 's'],
  ['떡잎 천재들을 미리 모아 길드를 꾸리고', 'h'], ['예고된 재해 전에 사람들을 대피시키며', ''], ['전생의 배신자를 미리 손절·고립시키고', ''],
  ['저평가 부동산을 분기 전에 쓸어 담으며', 't'], ['EX급 아이템을 누구보다 먼저 회수하고', 'h'], ['미래의 인수 리스트대로 지분을 모으며', 't'],
  ['오디션에서 시대를 앞선 무대를 선보이고', 's'], ['전생에 놓친 기회를 정확히 잡아채며', ''], ['적의 자만을 유도해 스스로 자멸하게 만들고', ''],
  ['실력을 숨긴 채 결정적 순간을 노리며', ''], ['미래의 핵심 인맥을 한발 먼저 포섭하고', ''], ['코인 광풍의 저점에서 베팅을 거머쥐며', 't'],
  ['죽을 운명의 동료를 미리 살려두고', ''], ['협회의 약점을 미리 확보하며', 'h'], ['기획사의 약점을 미리 확보하며', 's'],
  ['재난을 막아 단숨에 명성을 쌓고', ''],
  ['전생의 명작을 세상에 먼저 내놓으며', 's'], ['경영권을 조용히 한 손에 모으고', 't'], ['다음 분기의 판도를 미리 설계하며', ''],
  ['전생의 패착을 정반대로 두며', ''], ['놓쳤던 기회를 이번엔 정확히 낚아채고', ''], ['믿을 사람만 곁에 미리 모으며', ''],
  ['전생의 적이 자만하도록 판을 깔고', ''], ['결정적 한 수를 위해 조용히 힘을 모으며', ''],
]
const SLOT_CONTRAST: Slottable[] = [ // 전생의 나 vs 현생의 나 대비 (전부 장르 중립)
  ['전생의 무능했던 자신과 정반대로 처리하고', ''], ['같은 함정을 이번엔 한눈에 간파하며', ''], ['전에는 당했던 일을 역으로 이용하고', ''],
  ['두 번째 인생의 여유로 침착하게 판단하며', ''], ['전생에 못 했던 결단을 단숨에 내리고', ''], ['같은 상황을 전혀 다른 결과로 끝내며', ''],
  ['전생의 실수를 교본 삼아 한 수 앞서고', ''], ['못 지켰던 사람을 이번엔 먼저 지키며', ''], ['전에는 몰랐던 진실을 처음부터 쥐고', ''],
  ['예전의 자신이라면 놓쳤을 기회를 잡으며', ''], ['같은 적을 이번엔 손쉽게 제압하고', ''], ['전생의 한을 동력으로 더 멀리 나아가며', ''],
  ['두 인생의 경험을 한 점에 모아 돌파하고', ''], ['전에는 두려웠던 상대를 담담히 마주하며', ''], ['같은 무대를 전혀 다른 실력으로 채우고', ''],
  ['전생의 후회를 발판으로 더 높이 오르며', ''], ['예전의 비겁함을 버리고 정면으로 맞서고', ''], ['두 번 사는 자의 무게로 판을 뒤집으며', ''],
]
const SLOT_CIDER: Slottable[] = [ // 사이다·역전 (전부 장르 중립)
  ['무시하던 자들을 단숨에 역전시키는 통쾌함을 터뜨리고', ''], ['나를 버린 자가 후회하며 매달리게 만들며', ''], ['한 수 위의 판단으로 좌중을 압도하고', ''],
  ['전생의 가해자를 만인 앞에서 무너뜨리며', ''], ['아무도 못 본 기회를 혼자 거머쥐는 쾌감을 주고', ''], ['얕보던 상대가 진짜 실력을 보고 굳어버리게 하며', ''],
  ['빼앗긴 것을 몇 배로 되찾는 카타르시스를 터뜨리고', ''], ['판을 통째로 뒤집는 한 방을 꽂으며', ''], ['의심하던 자들이 결과 앞에 입을 다물게 하고', ''],
  ['거대 권력을 내려다보는 위치 역전을 그리며', ''], ['예고된 위기를 미리 막아 영웅이 되고', ''], ['라이벌을 압도하며 진짜 주인을 증명하며', ''],
  ['버려졌던 자가 정점에 서는 통쾌함을 주고', ''], ['적의 함정을 역이용해 자멸시키며', ''], ['냉소하던 이들이 인정할 수밖에 없게 만들고', ''],
  ['수치화된 성장 지표가 폭발적으로 치솟으며', ''], ['한때 굽실대던 자리에서 이제 호령하게 되고', ''], ['약속한 미래 사건이 적중해 신뢰를 굳히며', ''],
  ['전생의 실패를 화려하게 갈아엎고', ''], ['못 지킨 사람을 이번엔 지켜내는 정점을 찍으며', ''], ['바닥에서 정상까지의 계단을 한 칸 더 올라서고', ''],
]
const SLOT_BUTTERFLY: Slottable[] = [ // 나비효과·변수
  ['내 개입으로 미래가 바뀌어 아는 정보가 빗나가기 시작하고', ''], ['원래 없던 변수와 적이 새로 등장하며', ''], ['게이트의 시점이 앞당겨져 닥치고', 'h'],
  ['"내가 아는 미래가 더는 안 통한다"는 위기가 오고', ''], ['또 다른 회귀자가 같은 미래를 노리며 부딪치고', ''], ['"너도 돌아왔구나"식 정보전이 시작되며', ''],
  ['바뀐 미래가 부른 최악의 국면이 펼쳐지고', ''], ['메타지식이 무효화되어 진짜 실력의 시험대에 서며', ''], ['예지가 통하지 않는 새 빌런이 부상하고', ''],
  ['선점이 도리어 거대 권력의 견제를 부르며', ''], ['나비효과로 소중한 사람이 위험에 처하고', ''], ['시스템이 예상 밖으로 뒤틀리며', 'h'],
  ['근원 빌런이 미래를 아는 자를 역으로 노리고', ''], ['바꾼 과거가 전혀 다른 재앙을 불러오며', ''], ['아는 적이 전혀 다른 수로 나와 허를 찌르고', ''],
  ['미래가 두 갈래로 갈라져 선택을 강요하며', ''], ['믿었던 변수가 거꾸로 작동해 위기를 키우고', ''], ['세계의 근원 비밀이 드러나며 판이 커지고', ''],
  ['예고했던 사건이 통제 불능으로 번지며', ''], ['회귀의 진짜 대가가 청구되기 시작하고', ''], ['시장이 예상 밖으로 뒤틀리며', 't'],
  ['아는 미래가 한 꺼풀씩 어긋나기 시작하고', ''], ['앞당겨진 위기가 준비도 전에 들이닥치며', ''], ['지키려던 사람이 도리어 표적이 되고', ''],
  ['바뀐 흐름이 통제를 벗어나 폭주하며', ''], ['선점의 대가로 거대한 적의가 돌아오고', ''],
]
const SLOT_RISK: Slottable[] = [ // 들킴·긴장 (정보 누설 관리)
  ['"어떻게 알았지?"라는 주변의 의심이 조여들고', ''], ['미래를 안다는 사실이 들킬 위기에 처하며', ''], ['천재성·우연으로 위장하며 의심을 흘려보내고', ''],
  ['"넌 왜 이렇게 변했어?"라는 질문에 둘러대며', ''], ['정확한 예측이 도리어 시기와 견제를 부르고', ''], ['실력을 숨긴 가면이 벗겨질 뻔하며', ''],
  ['회귀자라는 정체가 적에게 노출될 위험에 놓이고', ''], ['아는 척하다 결정적 단서를 흘릴 뻔하며', ''], ['데자뷔처럼 반복되는 상황에 들킬세라 긴장하고', ''],
  ['예지력으로 포장해 위기를 모면하며', ''], ['가족·동료에게조차 비밀을 숨겨야 하는 부담을 지고', ''], ['"우연치고는 너무 정확하다"는 추궁에 시달리며', ''],
  ['미래 정보가 새어 나가 적의 손에 들어갈 뻔하고', ''], ['회귀를 감지하는 자의 시선을 피해 다니며', ''], ['거짓 변명이 한 겹씩 쌓여 들킬 위험이 커지고', ''],
  ['시대를 앞선 감각이 표절·반칙 의혹을 부르며', 's'], ['한 번의 실언이 모든 위장을 무너뜨릴 뻔하고', ''], ['미래를 아는 대가로 고독과 의심을 떠안으며', ''],
  ['"그걸 어떻게 미리 알았냐"는 추궁이 따라붙고', ''], ['앞선 판단이 도리어 견제와 질시를 부르며', ''], ['숨겨온 정체가 들통날 위기에 몰리고', ''],
  ['믿었던 이의 작은 의심이 싹트기 시작하며', ''],
]
const SLOT_TURN: Slottable[] = [ // 절단마공·전환 장치 (종결문으로 끝남 — 문장 마침 자리에 맞음)
  ['회차 끝 클리프행어로 다음 화를 견인한다', ''], ['수치화된 성장 지표를 갱신해 진척감을 준다', ''], ['거대 미래 사건의 원거리 떡밥을 한 번 더 던진다', ''],
  ['사이다 직전 짧은 고구마로 낙차를 키운다', ''], ['"이 날이었지"식 회상으로 정보 우위를 각인한다', ''], ['숨은 적의 시점 독백으로 장을 닫는다', ''],
  ['예고된 재난의 데드라인을 한 칸 앞당긴다', ''], ['새 동료·미래의 거물 합류로 세력을 넓힌다', ''], ['스케일을 개인에서 세계로 단숨에 확장한다', ''],
  ['"내가 아는 미래가 깨졌다"는 한 줄로 긴장을 회복한다', ''], ['숨긴 실력의 첫 발현으로 반전을 예고한다', ''], ['근원 빌런의 정체를 한 조각 흘린다', ''],
  ['못 지킨 사람을 다시 만나는 감정선을 끼워 넣는다', ''], ['체크리스트의 한 항목을 통쾌하게 완수한다', ''], ['들킬 뻔한 위기로 다음 화의 긴장을 건다', ''],
  ['두 타임라인(원래 미래 vs 새 미래)의 어긋남을 드러낸다', ''],
  ['다음 분기의 판도를 미리 설계한 한 수를 슬쩍 예고한다', ''], ['선점해 둔 카드 한 장을 결정적 순간에 꺼내 반전을 만든다', ''],
  ['다음 화 첫 줄에 던질 강력한 한 문장을 남긴다', ''], ['승리의 여운 끝에 새 위협의 그림자를 비춘다', ''], ['전생의 한 장면을 오버랩해 감정을 끌어올린다', ''],
]
const GENRES = ['h', 't', 's'] as const
type Genre = (typeof GENRES)[number]
const GENRE_LABEL: Record<Genre, string> = { h: '헌터·게이트', t: '경제·재벌', s: '연예·콘텐츠' }
const SLOTS: { key: string; label: string; pool: Slottable[] }[] = [
  { key: 'trigger', label: '회귀 트리거', pool: SLOT_TRIGGER },
  { key: 'when', label: '회귀 시점', pool: SLOT_WHEN },
  { key: 'know', label: '미래지식', pool: SLOT_KNOW },
  { key: 'seize', label: '선점·행동', pool: SLOT_SEIZE },
  { key: 'contrast', label: '전생 대비', pool: SLOT_CONTRAST },
  { key: 'cider', label: '사이다·역전', pool: SLOT_CIDER },
  { key: 'butterfly', label: '나비효과·변수', pool: SLOT_BUTTERFLY },
  { key: 'risk', label: '들킴·긴장', pool: SLOT_RISK },
  { key: 'turn', label: '절단마공', pool: SLOT_TURN },
]
// 한 계열(g)에서 이 슬롯이 뽑을 수 있는 항목(중립 ∪ 그 계열). '0'(중립 전용)은 중립만.
function eligible(pool: Slottable[], g: Genre | '0'): Slottable[] {
  return pool.filter(([, t]) => t === '' || (g !== '0' && t === g))
}
// 조합수: 계열별(중립전용·헌터·경제·연예) 결합수의 합. 같은 계열끼리만 결합하므로
// 단순 곱이 아니라 4계열의 곱의 합 — 세계관 모순을 없애면서도 옛 곱(약 1조)보다 훨씬 큼.
const COMBOS = (['0', ...GENRES] as (Genre | '0')[]).reduce(
  (sum, g) => sum + SLOTS.reduce((n, s) => n * eligible(s.pool, g).length, 1),
  0,
)
function fmtCombos(n: number): string {
  if (n >= 1e16) return (n / 1e16).toFixed(n >= 1e17 ? 0 : 1).replace(/\.0$/, '') + '경'
  if (n >= 1e12) return (n / 1e12).toFixed(n >= 1e13 ? 0 : 1).replace(/\.0$/, '') + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, '') + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, '') + '만'
  return n.toLocaleString('ko-KR')
}
function rndIdx(len: number): number { return Math.floor(Math.random() * len) }

// ──────────────────────────────────────────────────────────────────────────
// 저장 모델
// ──────────────────────────────────────────────────────────────────────────
interface UserBeat { id: string; act: string; title: string; hint?: string }
interface Store {
  title: string                                   // 작품 제목
  logline: string                                 // 한 줄 로그라인
  tpl: string                                     // 선택 템플릿 key
  texts: Record<string, Record<string, string>>   // 템플릿별: 비트 key → 내용 텍스트
  extra: Record<string, UserBeat[]>               // 템플릿별: 사용자가 더한 자유 비트
  order: Record<string, string[]>                 // 템플릿별: 비트 표시 순서(키 배열)
  done: Record<string, Record<string, boolean>>   // 비트 완료 체크
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return 'mb_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function emptyStore(): Store {
  return { title: '', logline: '', tpl: 'standard', texts: {}, extra: {}, order: {}, done: {} }
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
    base.tpl = TEMPLATES.some((t) => t.key === p.tpl) ? p.tpl : 'standard'
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
export default function ModfanOutline({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [note, setNote] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [showSpark, setShowSpark] = useState(false)
  // 굴림은 한 계열을 정한 뒤 그 계열의 항목만 뽑는다(세계관 모순 방지). picks 는 슬롯별 선택된 문자열.
  const pickGenre = (): Genre => GENRES[rndIdx(GENRES.length)]
  const rollPicks = (g: Genre, prev?: Record<string, string>, locks?: Record<string, boolean>): Record<string, string> => {
    const o: Record<string, string> = {}
    for (const s of SLOTS) {
      const elig = eligible(s.pool, g)
      const kept = prev && locks?.[s.key] ? prev[s.key] : ''
      // 잠긴 값이 새 계열에서도 유효하면 유지, 아니면 재추첨
      o[s.key] = kept && elig.some(([t]) => t === kept) ? kept : elig[rndIdx(elig.length)][0]
    }
    return o
  }
  const [sparkGenre, setSparkGenre] = useState<Genre>(() => pickGenre())
  const [picks, setPicks] = useState<Record<string, string>>(() => rollPicks(sparkGenre))
  const [locks, setLocks] = useState<Record<string, boolean>>({})
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // payload.genre 활용 — 현판 회귀 외 장르로 열려도 동작하되 안내.
  const payloadGenre = typeof payload?.genre === 'string' ? (payload!.genre as string) : ''

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
  }, [])

  // payload 로 템플릿 지정해 열 수 있게(예: 다른 도구에서 tpl 전달).
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

  // 현재 템플릿의 전체 비트(기본 + 사용자 추가)를 order 에 맞춰 정렬.
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
    // 잠긴 슬롯의 계열 항목이 있으면 그 계열을 유지(모순 방지), 없으면 새 계열을 추첨.
    const lockedGenres = new Set<Genre>()
    for (const s of SLOTS) {
      if (!locks[s.key]) continue
      const it = s.pool.find(([t]) => t === picks[s.key])
      if (it && it[1] !== '') lockedGenres.add(it[1] as Genre)
    }
    const g: Genre = lockedGenres.size === 1 ? [...lockedGenres][0] : pickGenre()
    setSparkGenre(g)
    setPicks((prev) => rollPicks(g, prev, locks))
  }
  const toggleLock = (k: string) => setLocks((l) => ({ ...l, [k]: !l[k] }))
  const sparkText = (): string => {
    const v = (k: string) => picks[k] || ''
    return `${v('trigger')} 회귀해 ${v('when')} 다시 눈을 뜬 주인공이, ${v('know')} 미래지식을 무기로 ${v('seize')}. ${v('contrast')} ${v('cider')}. 그러나 ${v('butterfly')}, ${v('risk')}. 그리고 ${v('turn')}.`
  }
  const sparkToLibrary = () => {
    const item = addToLibrary('snippets', { text: sparkText(), source: '현판 회귀 개요 빌더 · 비트 영감', tags: [GENRE, def.label] })
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
  // 굴린 영감의 내용으로 끼워넣기 — 첫 빈 비트 또는 첫 비트에.
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
    lines.push(`# 현판 회귀 개요 — ${def.label}${store.title ? ` · ${store.title}` : ''}`)
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
    parts.push(`<p><strong>현판 회귀 개요 · ${esc(def.label)}</strong>${store.title ? ` — ${esc(store.title)}` : ''}</p>`)
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
      a.download = (store.title ? store.title.replace(/[\\/:*?"<>|]/g, '_') : 'modfan-outline') + '-개요.txt'
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
        장르: GENRE,
        구조: def.label,
        로그라인: store.logline.trim() || '(없음)',
        진행: `${filled}/${beats.length} (${pct}%)`,
      },
    })
    flash(id ? '원고(개요)에 개요 문서를 추가했어요.' : '프로젝트에 연결되지 않았습니다.', !id)
  }

  // 템플릿 전환.
  const switchTpl = (k: string) => { setStore((s) => ({ ...s, tpl: k })); setOpen({}) }

  // 현재 템플릿 내용 비우기.
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

  const relatedTools = ['plot-pyramid', 'scene-list', 'character-sheet', 'relationship-map', 'world-wiki', 'emotion-arc']
  const relatedNames: Record<string, string> = {
    'plot-pyramid': '⛰️ 플롯 피라미드', 'scene-list': '🎬 장면 목록', 'character-sheet': '👤 인물 시트',
    'relationship-map': '🕸️ 관계도', 'world-wiki': '📚 세계관 위키', 'emotion-arc': '💗 감정 곡선',
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
          <input style={{ ...input, flex: '3 1 260px' }} value={store.logline} onChange={(e) => setStore((s) => ({ ...s, logline: e.target.value }))} placeholder="로그라인 한 줄 (예: 배신당해 죽은 S급 헌터가 각성 직전으로 회귀해 모든 것을 되돌린다)" maxLength={200} aria-label="로그라인" />
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
          <button className="minibtn" onClick={() => setShowSpark((v) => !v)} title="현판 회귀 특화 슬롯으로 비트 영감을 무작위 조합">{showSpark ? <><Emoji e="🎲"/> 영감 닫기</> : <><Emoji e="🎲"/> 회귀 비트 영감 굴리기</>}</button>
        </div>

        {payloadGenre && payloadGenre !== GENRE && (
          <div style={{ fontSize: 11.5, color: 'var(--warn)', lineHeight: 1.5 }}>이 도구는 현대판타지·회귀 전용이에요. (요청 장르: {payloadGenre})</div>
        )}
        {note && <div style={{ fontSize: 12, lineHeight: 1.5, color: note.startsWith('⚠️') ? 'var(--warn)' : 'var(--ok)' }}>{note}</div>}
      </div>

      {/* 영감 패널 */}
      {showSpark && (
        <div style={{ padding: '10px 14px 0' }}>
          <div style={sparkBox}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 13 }}><Emoji e="🎲"/> 현판 회귀 비트 영감</strong>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 99, padding: '1px 8px' }}>{GENRE_LABEL[sparkGenre]} 계열</span>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>조합 가능 수 <strong style={{ color: 'var(--accent)' }}>{fmtCombos(COMBOS)}</strong>가지 ({COMBOS.toLocaleString('ko-KR')})</span>
              <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={roll}><Emoji e="🎲"/> 굴리기</button>
            </div>
            {SLOTS.map((s) => (
              <div key={s.key} style={slotRow}>
                <span style={{ width: 78, flexShrink: 0, color: 'var(--muted)', fontWeight: 600 }}>{s.label}</span>
                <span style={slotChip}>{picks[s.key]}</span>
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
                    {b.hint && <div style={hint}><Emoji e="💡"/> {b.hint}</div>}
                    <div style={{ padding: '0 11px 11px' }}>
                      <textarea style={ta} value={txt} onChange={(e) => setText(b.key, e.target.value)} placeholder="이 비트에서 일어나는 일·미래지식·사이다·전환을 적어보세요…" />
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
          <button key={id} className="linkbtn" onClick={() => openToolLinked(id, { genre: GENRE })} title={`${relatedNames[id]} 열기`}>{emojify(relatedNames[id])}</button>
        ))}
      </div>

      {/* 하단 액션 */}
      <div style={foot}>
        <button className="btn-primary" onClick={copyAll}><Emoji e="📋"/> 전체 복사</button>
        <button className="minibtn" onClick={exportTxt}>⬇️ .txt 내보내기</button>
        <button className="minibtn" onClick={() => setOpen(Object.fromEntries(beats.map((b) => [b.key, true])))}>모두 펼치기</button>
        <button className="minibtn" onClick={() => setOpen({})}>모두 접기</button>
        <span style={{ flex: 1 }} />
        <button className="minibtn" style={{ color: 'var(--warn)' }} onClick={resetTpl}>이 구조 비우기</button>
      </div>
    </div>
  )
}
