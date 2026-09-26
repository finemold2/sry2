// 현대판타지·회귀 플롯·진행곡선(로직) 템플릿 — 도시에에 근거한 "현판 회귀 표준 13비트 매크로 구조 + 웹소설 페이싱"을 단계 입력 시트로.
//  핵심 명제(도시에 §1·§3): 현판 회귀의 동력은 (1) 미래 지식(메타지식) = 정보 비대칭 = 무기, (2) 한 화 1쾌감(사이다)·고구마 최소화, (3) 수치화된 성장 곡선의 가시성, (4) 전생 청산 + 두 번 사는 자의 정서, (5) 중반 이후 '메타지식 무효화'로 긴장 회복.
//  · 13비트(회귀 전 파멸~정점 청산·에필로그)에 내용 입력 + 완료 체크 + 진행률.
//  · 비트마다 4개 슬라이더 → 4개 곡선: 사이다 게이지(고구마↔통쾌), 메타지식 우위(미래 정보의 유효도), 성장 지표(재산·랭킹·지위 등 수치 체감), 위기·긴장. 정보 비대칭의 흥망 가시화.
//  · 하위유형 프리셋(경제·재벌 / 헌터·게이트 / 연예계 / 스포츠·프로게이머 / 전문직(작가·셰프·의사) / 복수·청산형)으로 비트 가이드·곡선 권장값 자동 세팅(도시에 §1·§2).
//  · "비트 발상 시드" — 각 비트의 슬롯 풀(회귀 시점/미래 정보/선점 자산/사이다 종류/위협/반전)을 무작위 조합으로 굴려 막힌 비트의 글감을 던짐(잠금/재생성, 조합수 55억+ 표시).
//  · 페이싱 자가진단(1화 첫 사이다 누락·미래지식 미활용·고구마 과다·성장 수치 정체·메타지식 무효화 부재·전생 청산 미정산 등 도시에 §3·§5·§9 함정 기반).
//  · localStorage 'sry:tool:modfan-plotlogic' 자동 저장/복원. addToProject(folder:"구조"). 글감(snippets) 저장. 연계 도구 열기.
// 자급식: react/linkbus 외 import 없음. 전부 로컬.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'modfan-plotlogic', name: '현판 회귀 플롯 로직', icon: '⏪', group: '플롯', genre: '현대판타지·회귀', intro: '현판 회귀 표준 13비트 구조·고구마↔사이다 진자·메타지식 우위·수치 성장 곡선으로 미래를 아는 자의 두 번째 인생을 설계하세요', w: 720, h: 680 }

const LS_KEY = 'sry:tool:modfan-plotlogic'

// ── 현판 회귀 표준 13비트 매크로 구조(도시에 §3 관습 + §4 장치 + §5 페이싱 + §6 클라이맥스) ─────
// pos: 전체 분량 대비 권장 위치 구간(%).
// cida: 사이다 게이지(0=억울함·고구마 최저 … 10=통쾌·정산 최고). meta: 메타지식 우위(0=정보 무용 … 10=완전한 미래 정보 비대칭). growth: 성장 지표(0=무일푼·무명 … 10=정점·제국). risk: 위기·긴장(0=안전 … 10=절체절명).
interface BeatDef {
  key: string
  title: string
  sub: string
  pos: [number, number]
  cida: number
  meta: number
  growth: number
  risk: number
  func: string   // 현판 회귀에서 이 비트의 기능(도시에 근거)
  tip: string    // 작법 팁
  ex: string[]   // 하위유형/클리셰 변주
}

const BEATS: BeatDef[] = [
  {
    key: 'death', title: '0. 회귀 전 파멸 · 죽음/배신', sub: 'The Fall', pos: [0, 3], cida: 1, meta: 1, growth: 2, risk: 10,
    func: '전생의 죽음(배신·자살·전사·병사)·절망적 결말을 먼저 제시(도시에 §4 회귀 트리거). "이게 내 마지막이구나" — 강렬한 후회·각오가 회귀의 동기이자 사이다의 채권이 된다.',
    tip: '독자가 주인공의 억울함·후회를 공유하도록 파멸을 짧고 강렬하게. 누가 나를 망쳤는지(원수·조직)와 무엇을 못 지켰는지(가족)를 각인시켜라. 이 장면이 복수와 정서의 두 축을 동시에 깐다.',
    ex: ['배신당한 채 죽는 순간', '코인·주식 폭락으로 파산·자살', '게이트 안에서 동료의 배신으로 사망'],
  },
  {
    key: 'awaken', title: '1. 회귀 자각 · 익숙한 천장', sub: 'Awakening', pos: [1, 5], cida: 3, meta: 7, growth: 2, risk: 4,
    func: '"다시 눈을 떴다 — 익숙한 천장이다." 과거의 특정 시점으로 의식·기억을 가진 채 회귀했음을 자각(도시에 §4·§7). 거울/창문에 비친 젊어진 몸, 아직 살아있는 가족에 울컥.',
    tip: '회귀 자각은 1화 안에 압축. "왜 하필 이 시점인가"(중요한 분기 직전)에 서사적 의미를 부여하라. 미래를 안다는 사실과 그 무게를 독백으로 명확히 깔아라("나는 미래를 알고 있다").',
    ex: ['거울 속 젊어진 얼굴 자각', '죽은 줄 알았던 부모·동생이 살아있음', '"그래, 이 날이었지" — 시간 좌표 확인'],
  },
  {
    key: 'firstuse', title: '2. 첫 미래지식 행사 · 첫 사이다', sub: 'First Edge', pos: [3, 8], cida: 8, meta: 9, growth: 3, risk: 3,
    func: '회귀 직후 미래 정보를 즉시 행사해 작은 승리를 거두는 1화 후킹의 핵심(도시에 §3 필수 관습). "회귀해놓고 정보를 안 쓰면 계약 위반" — 첫 화에 반드시 첫 사이다를 담는다.',
    tip: '거창할 필요 없는 즉각적 보상(로또·종목·면접·경매·정보 선점)으로 "미래를 아는 자의 우위"를 즉시 증명하라. 1화에 회귀+첫 사이다는 현대 웹소설 절대 규칙.',
    ex: ['아는 종목/코인 저점 매수', '미래의 대박 콘텐츠·아이템 선점', '곧 닥칠 사고·음모를 미리 회피'],
  },
  {
    key: 'checklist', title: '3. 목표 선언 · 할 일 목록', sub: 'The Checklist', pos: [5, 12], cida: 5, meta: 9, growth: 3, risk: 3,
    func: '"이번엔 ①가족 살리기 ②그놈 응징 ③이 종목 매수…" 회귀 직후 할 일 목록이 챕터 단위 추진력을 제공(도시에 §4 체크리스트형 서사). 단기·장기 목표를 병렬로 못박는다.',
    tip: '거대 미래 사건(원거리 떡밥)과 당장 회수할 단기 떡밥을 동시에 굴려라. 목표를 한 문장으로 선언("같은 실수는 반복하지 않는다"). 복수와 수성(가족·자산)의 두 트랙을 분리 설계.',
    ex: ['응징 대상 리스트업', '선점할 종목·인재·부동산 메모', '예고된 거시 이벤트(폭락·재해·게이트일) 표시'],
  },
  {
    key: 'seed', title: '4. 종잣돈·기반 확보', sub: 'Seed Capital', pos: [8, 18], cida: 7, meta: 9, growth: 4, risk: 4,
    func: '첫 성공으로 종잣돈·명성·지위·각성 등급의 발판을 마련(도시에 §5-1막). 미래지식을 자본·실력으로 환전해 "스스로 굴러가는 기반"을 만든다.',
    tip: '초반 30화 = 정착선. 미래지식 활용 + 성장 지표(재산·랭킹) 가시화 + 핵심 인맥 떡밥을 무료분 안에 보여줘 연독률 확보. 수치(첫 1억·랭킹·구독)를 독자가 체감하게.',
    ex: ['선점한 자산이 떡상해 종잣돈 확보', '면접·오디션·각성으로 지위 진입', '저평가 인재·기술·매물 선점'],
  },
  {
    key: 'recruit', title: '5. 떡잎 거물 포섭 · 인맥 선점', sub: 'Foreknown Allies', pos: [14, 26], cida: 6, meta: 8, growth: 5, risk: 4,
    func: '아직 무명인 미래의 거물(대스타·천재·실력자)을 알아보고 미리 포섭(도시에 §4 선점 모티프). 미래지식이 "사람"에도 적용됨을 보여주는 핵심 비트.',
    tip: '"쟤가 미래의 대물"임을 아는 우위로 충성·동맹을 선점하라. 동시에 "넌 왜 이렇게 변했어?"라는 주변의 의심을 관리(천재성·우연·예지로 위장). 후반 자력 승리의 인적 자산을 여기서 쌓는다.',
    ex: ['무명 천재를 미리 영입', '미래의 배신자를 알고 거리두기', '곧 흥할 회사/길드/기획사에 선투자'],
  },
  {
    key: 'expand', title: '6. 확장 · 세력화', sub: 'Scaling Up', pos: [22, 42], cida: 7, meta: 8, growth: 6, risk: 5,
    func: '사업·길드·팀·소속을 키워 체급을 올림(도시에 §5-2막). 에피소드 사이클([목표→미래지식 발동→방해→해결→보상 수치화→다음 떡밥])을 3~10화 단위로 반복.',
    tip: '매 화 작은 승리/정보/떡밥 중 하나 이상(한 화 1쾌감). 성장 지표를 주기적으로 갱신(재산·랭킹·구독·레벨 보고)해 진척감 유지. 라이벌·중간 빌런을 등판시켜라.',
    ex: ['회사·길드·팀 규모 확장', '시리즈 사이다로 계단식 성장', '중간 빌런·경쟁자와 첫 격돌'],
  },
  {
    key: 'reckon1', title: '7. 1차 청산 · 전생 원수 응징', sub: 'First Reckoning', pos: [35, 52], cida: 9, meta: 7, growth: 6, risk: 5,
    func: '전생에서 나를 망친 인물/조직 중 일부를 통쾌하게 응징(도시에 §3·§5 복수 카타르시스). "초반 통쾌함과 후반 대형 청산을 분리 배치" — 1차 청산으로 채권의 일부를 회수.',
    tip: '쌓아둔 고구마를 확실히 정산하되, 최종 빌런은 남겨라. 자업자득식 자멸·체급 역전을 활용. 전생의 무능했던 자아 대비 현재의 압도를 시각화(성장 입증).',
    ex: ['초반 가해자에게 인과응보', '체급 역전(짓밟던 자를 내려다봄)', '전생의 실패를 이번엔 승리로 뒤집음'],
  },
  {
    key: 'butterfly', title: '8. 중간점 · 나비효과 시작', sub: 'Butterfly Midpoint', pos: [48, 60], cida: 6, meta: 6, growth: 7, risk: 6,
    func: '주인공의 개입으로 미래가 바뀌기 시작 — "내가 아는 미래가 조금씩 안 맞는다"(도시에 §4 나비효과). 두 타임라인(원래 미래 vs 새 미래)의 분기가 가시화되는 전환점.',
    tip: '거짓 승리(절정 같은 호황) 또는 거짓 패배(미래가 어긋나는 첫 위기)로 판을 뒤집어라. 메타지식이 절대무기에서 "유효기간이 있는 무기"로 바뀌는 신호를 깔아 후반 긴장을 예고.',
    ex: ['예지한 사건이 빗나가기 시작', '개입으로 새 변수·새 인물 등장', '"이건 내가 아는 전개가 아니야"'],
  },
  {
    key: 'rival', title: '9. 회귀자 인식 · 강적 등장', sub: 'Rival Returner', pos: [56, 70], cida: 5, meta: 5, growth: 7, risk: 7,
    func: '다른 회귀자·예지자·시스템이 "너도 회귀자냐"를 감지 → 회귀자 간 정보전(도시에 §4 고급 장치). 미래지식만으로는 안 통하는 대등한 빌런이 수면 위로.',
    tip: '정보 비대칭이 적에게도 있는 구도로 긴장을 회복하라. 빌런 역시 미래를 알거나 미래를 더 크게 바꾼 존재로 설계. "내 정보가 새고 있다"는 누설 긴장도 활용.',
    ex: ['또 다른 회귀자/예지자 빌런', '시스템·관리자의 개입', '내 미래지식을 역이용하는 적'],
  },
  {
    key: 'collapse', title: '10. 메타지식 붕괴 · 최저점', sub: 'Knowledge Collapse', pos: [68, 82], cida: 2, meta: 1, growth: 6, risk: 10,
    func: '현판 회귀 클라이맥스의 정석 — "미래를 아는 이점이 완전히 사라진다"(도시에 §4·§6). 적도 회귀자이거나 미래가 완전히 어긋나, 치트가 무효화된 진짜 위기에 직면.',
    tip: '한 줄이면 풀릴 위기(idiot plot) 금지. 그동안 쌓은 자산·동료·실력만 남은 상태로 몰아넣어라. "치트만으로 끝내지 않는다"는 장르의 도덕 — 자력 승리의 무대를 여기서 만든다.',
    ex: ['미래지식이 완전히 무용지물', '동료·기반이 위협받는 절체절명', '아는 미래가 사라진 미지의 영역'],
  },
  {
    key: 'climax', title: '11. 클라이맥스 · 자력 승리·대청산', sub: 'Self-Made Triumph', pos: [80, 94], cida: 10, meta: 3, growth: 9, risk: 9,
    func: '사이다의 정점 — 미래지식이 아닌 "회귀 후 스스로 쌓은 실력·동료·기반"으로 최종 빌런/근원을 청산(도시에 §6). 전생에서 못 갚은 큰 빚을 압도적으로 정산.',
    tip: '깔아둔 고구마를 전부 청산하라(인과적 정산). 전생의 한 + 현생의 성취가 한 점에 모이는 정서적 정점(못 지킨 사람을 이번엔 지킴). 체급 역전을 최대치로 시각화.',
    ex: ['치트 없이 실력·인맥으로 역전승', '최종 빌런·근원 조직 대청산', '못 지킨 가족·사람을 이번엔 지킴'],
  },
  {
    key: 'epilogue', title: '12. 에필로그 · 두 번째 인생', sub: 'Second Life Settled', pos: [94, 100], cida: 9, meta: 2, growth: 10, risk: 1,
    func: '안정된 일상·가족·제국 완성·후일담(도시에 §6). 현판 회귀는 비극보다 성취·안정 엔딩 선호 — "두 번째 인생은 행복했다"류 정서적 마침표.',
    tip: '예고했던 거대 미래 사건(원거리 떡밥)을 전부 회수했는지 점검(setup-payoff). 전생의 무능했던 자아와 정반대의 결말(성공·가족·평안)을 쟁취해 주제를 정산하라.',
    ex: ['제국·재벌·길드 정점에서의 일상', '다시 만난 가족과의 평온', '후일담·외전(동료·후계의 미래)'],
  },
]
const BEAT_KEYS = BEATS.map((b) => b.key)

// ── 하위유형 프리셋(도시에 §1 현판 직업+회귀 무한 파생) ───────────────────────
interface Preset {
  key: string
  name: string
  desc: string
  notes: Partial<Record<string, string>>           // 비트별 강조 메모
  curve?: Partial<Record<string, Partial<Pick<BeatDef, 'cida' | 'meta' | 'growth' | 'risk'>>>>  // 비트별 권장 곡선 덮어쓰기
}
const PRESETS: Preset[] = [
  {
    key: 'tycoon', name: '경제·재벌', desc: '미래 지식으로 주식·코인·부동산·기업을 굴려 자본을 쌓는 성공·복수 서사(재벌집 막내아들 결). 성장 지표 = 재산.',
    notes: {
      firstuse: '아는 종목·코인의 저점 매수, 곧 터질 호재 선점으로 첫 종잣돈을 잡아라.',
      seed: '종잣돈→레버리지→인수합병의 자본 증식 곡선. "첫 1억→100억"식 수치 갱신이 곧 사이다.',
      expand: '저평가 기업 선점·상장·M&A로 그룹화. 업계 절차(IPO·지분·이사회)의 디테일로 리얼리티.',
      climax: '전생의 나를 망친 그룹/오너를 자본력으로 압도·인수. 체급 역전을 재무 수치로 시각화.',
    },
    curve: { firstuse: { cida: 9, growth: 4 }, seed: { growth: 5 }, climax: { growth: 10 } },
  },
  {
    key: 'hunter', name: '헌터·게이트', desc: '각성 이후의 현대 + 게이트/던전. 회귀자가 미래의 게이트 출현일·등급·아이템을 알고 선점(나혼렙 결의 시스템물). 성장 지표 = 랭킹·스탯.',
    notes: {
      awaken: '각성 전/약자 시절로 회귀. 미래의 S급·EX급 정보가 무기. 시스템 창·등급 설정을 깔아라.',
      firstuse: '곧 열릴 저난도 게이트·숨은 보상을 선점해 빠르게 각성·레벨업.',
      seed: '미래에 나올 던전·아이템·스킬을 선점. 랭킹·스탯의 수치 성장이 곧 사이다.',
      rival: '또 다른 회귀 헌터·각성 빌런 등장. 미래에 일어날 대형 게이트(레이드)를 빌런과 경쟁.',
    },
    curve: { awaken: { meta: 9, growth: 2 }, seed: { growth: 5, risk: 5 }, collapse: { risk: 10 } },
  },
  {
    key: 'idol', name: '연예계', desc: '망한 연예인/연습생이 데뷔 직전으로 회귀. 어떤 노래·드라마·예능이 대박날지 알고 선점(데뷔 못하면 죽는병 결). 성장 지표 = 인지도·차트.',
    notes: {
      awaken: '데뷔조 탈락·해체 직전으로 회귀. 미래의 히트 콘텐츠 메타지식이 무기.',
      firstuse: '미래의 명곡·시나리오·콘셉트를 선점해 첫 주목. 콘텐츠 메타지식이 핵심.',
      recruit: '미래의 대스타가 될 무명 멤버·작곡가·배우를 미리 포섭.',
      climax: '음원 차트 올킬·역주행·시상식 대상으로 정점. 전생에 무시한 기획사·악플러에게 인과응보.',
    },
    curve: { firstuse: { cida: 9, meta: 9 }, recruit: { growth: 5 }, climax: { growth: 10, cida: 10 } },
  },
  {
    key: 'sports', name: '스포츠·프로게이머', desc: '은퇴/실패한 선수가 유망주 시절로 회귀. 미래의 전술·메타·상대 약점을 알고 정상에 오름. 성장 지표 = 기록·랭킹.',
    notes: {
      awaken: '부상·은퇴·전성기 직전으로 회귀. 미래의 경기·메타·상대 분석이 무기.',
      firstuse: '미래에 통할 기술·전략을 미리 연마/구사해 첫 승리·발탁.',
      expand: '리그·대회를 단계적으로 제패. 기록·승률의 수치 성장이 곧 사이다.',
      collapse: '미래 메타가 바뀌거나 상대도 회귀자라 분석이 무용 — 순수 실력의 무대.',
    },
    curve: { firstuse: { cida: 8 }, expand: { growth: 7 }, collapse: { meta: 1, risk: 9 } },
  },
  {
    key: 'pro', name: '전문직(작가·셰프·의사)', desc: '망한/평범한 전문가가 회귀해 미래의 명작·기술·증례를 선점. 전문성+미래지식의 디테일 경쟁(3세대 분화). 성장 지표 = 명성·실적.',
    notes: {
      firstuse: '미래의 대박 작품·레시피·치료법을 선점해 단숨에 인정.',
      recruit: '미래의 거장이 될 무명 동료·후배를 알아보고 협업.',
      expand: '작품·점포·병원을 키우며 업계 디테일(절차·용어·성공 경로)로 리얼리티 확보.',
      reckon1: '전생에 나를 짓밟던 권위자·경쟁자를 실력으로 추월.',
    },
    curve: { firstuse: { cida: 8, growth: 4 }, expand: { growth: 7 }, climax: { growth: 9 } },
  },
  {
    key: 'revenge', name: '복수·청산형', desc: '배신·억울한 죽음 후 회귀. 응징이 최우선 동력. 고구마는 짧게 깔고 사이다로 계단식 청산. 성장 지표 = 영향력.',
    notes: {
      death: '복수의 채권을 크게 — 배신·억울함이 강렬할수록 청산이 통쾌하다.',
      checklist: '응징 대상과 순서를 명확히 리스트업. 1차 청산과 대청산을 분리 배치.',
      reckon1: '미래 정보로 초반 가해자의 약점·범죄를 선제 폭로해 1차 청산.',
      climax: '최종 흑막(나를 죽인 근원)을 자력으로 압도 청산. 자업자득 자멸도 효과적.',
    },
    curve: { death: { cida: 0, risk: 10 }, reckon1: { cida: 9 }, climax: { cida: 10 } },
  },
]

// ── 분량 단위 ────────────────────────────────────────────────────────────
type Unit = 'episode' | 'won고' | 'page'
const UNIT_LABEL: Record<Unit, string> = { episode: '회차', 'won고': '원고지(매)', page: '페이지' }
const UNIT_SHORT: Record<Unit, string> = { episode: '화', 'won고': '매', page: 'p' }

// ── 비트 발상 시드 슬롯 풀(막힌 비트의 글감) — 조합수 55억+ (도시에 §4·§7·§8) ─────
// 6개 축을 무작위 조합. 각 축의 풀 길이 곱이 총 조합수.
const SEED_AXES: { key: string; label: string; pool: string[] }[] = [
  {
    key: 'when', label: '회귀 시점',
    pool: [
      '데뷔조 탈락 직전', '각성 전 무명 헌터 시절', '대학 입학 직전', '첫 창업 직전', '코인 폭락 전날', '대형 게이트 출현 1년 전',
      '결혼 직전', '입사 면접 전날', '부모님이 돌아가시기 직전', '동생이 사고당하기 전', '회사 부도 직전', '전성기 부상 직전',
      '데뷔 무대 직전', '상장 직전', '첫 배신을 당하기 직전', '고시 합격 직전', '연재 시작 직전', '오디션 전날',
      '스무 살 생일 아침', '군 전역 직후', '첫 직장 출근 첫날', '대형 사기를 당하기 전', 'IMF·금융위기 직전', '닷컴 버블 직전',
      '인생 최고의 기회를 놓친 그날', '가족이 흩어지기 직전', '라이벌에게 추월당하기 전', '병을 얻기 직전',
      '계약서에 도장을 찍기 직전', '첫 투자 유치 직전', '신인상 시상식 전날', '폐업 신고를 하기 전날',
      '스승을 처음 만나기 직전', '집을 처분하기 직전', '대형 프로젝트가 엎어지기 전', '경기 출전 명단 발표 전날',
      '회사를 떠나기로 결심한 날', '첫 단독 콘서트 직전', '소송에서 패소하기 직전', '가장 빛나던 시절의 한복판',
      '운명의 선택을 앞둔 새벽', '데뷔 10주년을 앞둔 시점', '마지막 기회의 오디션 직전',
    ],
  },
  {
    key: 'foreknow', label: '미래 정보(메타지식)',
    pool: [
      '특정 종목의 떡상 시점', '코인 폭등·폭락 일정', '곧 터질 대형 게이트 등급', '미래의 히트곡·드라마', '대박 날 게임·웹툰',
      '누가 미래의 대스타가 될지', '누가 배신자인지', '저평가 부동산·매물', '곧 상장할 유망 기업', '미래의 신기술·특허',
      '다가올 자연재해·사고', '경제 위기의 정확한 시점', '미래의 인수합병 소식', '숨겨진 천재 인재', '미래의 명작 시나리오',
      '게이트 안 숨은 보상·아이템', '상대 팀의 전술·약점', '미래의 메타·트렌드 변화', '특정 인물의 미래 범죄·약점', '미래의 우승팀·결과',
      '곧 발견될 던전·자원', '미래에 통할 사업 아이템', '경쟁자의 미래 몰락', '잊힌 명반·명저의 부활', '미래의 정책·규제 변화',
      '곧 일어날 정치·사회 사건', '미래의 전염병·재난', '특정 시점의 환율·금리', '미래의 스포츠 이변',
      '곧 무너질 거품 시장', '미래의 빅히트 광고·캠페인', '숨겨진 유망 신인의 데뷔 시점', '곧 터질 대형 스캔들',
      '미래의 대박 프랜차이즈', '경쟁사의 다음 한 수', '미래에 표준이 될 기술 규격', '곧 품귀가 올 원자재',
      '미래의 흥행 영화·시리즈', '특정 경매품의 낙찰가', '곧 발표될 정부 지원 사업', '미래의 베스트셀러 작가',
    ],
  },
  {
    key: 'asset', label: '선점할 자산·기회',
    pool: [
      '저점의 우량주', '초기 코인', '무명 천재 영입', '저평가 부동산', '초기 스타트업 지분', '미래의 명곡 판권',
      '곧 흥할 기획사·구단', '숨은 보상의 던전', '미래의 베스트셀러 IP', '잊힌 특허·기술', '미래의 대박 레시피',
      '곧 발탁될 유망주', '저평가 영지·상권', '미래의 인기 콘텐츠 포맷', 'EX급 아이템의 좌표', '미래의 황금 노선·상권',
      '곧 가치 폭등할 수집품', '미래의 핵심 인맥', '경매에 나올 보물', '곧 뜰 신생 리그·대회', '미래의 신약·치료법',
      '저평가된 자신의 재능', '곧 풀릴 규제 수혜주', '미래의 우승 전력', '잊힌 가문의 유산', '초기 시장의 독점 기회',
      '곧 떡상할 신생 코인', '미래의 국민 캐릭터 판권', '저평가된 알짜 자회사', '곧 발탁될 천재 코치',
      '미래의 명품 브랜드 초기 지분', '잊힌 노포의 비법', '곧 부활할 추억의 IP', '미래의 핵심 부품 공급망',
      '저평가된 변두리 상가', '곧 뜰 신규 플랫폼의 초기 슬롯', '미래의 인기 작곡가 계약', '희귀 한정판 굿즈',
      '곧 재평가될 폐광·유휴 부지', '미래의 인기 캐릭터 디자인', '저평가된 명문가의 인맥', '곧 표준이 될 신규 특허군',
    ],
  },
  {
    key: 'cidaType', label: '사이다 종류',
    pool: [
      '미래 지식으로 음모 선제 분쇄', '만인 앞 공개 역전', '실력·재능의 공인', '권력·지위 역전', '악역의 자업자득 자멸',
      '경제력·자본력 압도', '배신자 색출·단죄', '체급 역전(짓밟던 자를 내려다봄)', '결정적 증거로 무고함 입증', '대중·여론의 전복',
      '랭킹·기록 경신', '차트 올킬·역주행', '인수·합병으로 적을 흡수', '계약·협박 카드 되돌려주기', '잊지 못할 명대사 한 줄',
      '무시하던 자의 사과', '동맹 세력 규합', '전생의 실패를 승리로 뒤집음', '못 지킨 사람을 이번엔 지킴', '예고한 미래를 적중시켜 신뢰 획득',
      '적의 약점·범죄 폭로', '재산·지위 회수', '경쟁자의 거짓 들통', '자력으로 미지의 위기 돌파', '근원 흑막의 대청산',
      '무리한 베팅이 정확히 적중', '얕보던 신인의 압도적 데뷔', '거대 자본의 인수 제안 거절', '실력으로 평론가를 침묵시킴',
      '버려졌던 사람들의 결집', '판세를 단숨에 뒤집는 한 수', '오만한 권위자의 무릎 꿇림', '불가능하다던 기록의 경신',
      '배신자의 뒤통수를 되돌려줌', '대중 앞에서의 화려한 컴백', '경쟁사를 단숨에 추월한 신제품', '잊혔던 명예의 회복',
      '비웃던 전문가들의 인정', '단 한 번의 협상으로 판세 장악', '무명에서 단숨에 정상으로', '예고한 일이 그대로 적중',
      '거대 권력의 사과와 보상', '실력으로 증명한 진짜 천재성', '버림받은 자리의 화려한 귀환',
    ],
  },
  {
    key: 'threat', label: '위협·장애물',
    pool: [
      '또 다른 회귀자·예지자', '미래가 어긋나는 나비효과', '미래지식 누설의 위험', '"어떻게 알았지?" 의심', '전생의 원수·조직',
      '대등한 강적 빌런', '시스템·관리자의 개입', '경제 위기·시장 붕괴', '대형 게이트·재난', '내부 배신자',
      '가족·동료를 노리는 위협', '미래에 없던 새 변수', '권력·자본의 압박', '여론·평판의 추락', '정보를 역이용하는 적',
      '메타·트렌드의 변화', '시한부·저주의 운명', '과거 인연의 그림자', '법적·제도적 함정', '강적의 선제 공격',
      '아는 미래가 사라진 미지의 영역', '동료의 흔들리는 충성', '치명적 오판·실수', '적이 더 크게 바꾼 미래', '회귀의 부작용·대가',
      '거대 자본의 적대적 인수', '실력을 의심하는 여론 검증', '과거를 캐는 집요한 추적자', '예상보다 빠르게 닥친 위기',
      '믿었던 협력자의 변심', '규제 당국의 강도 높은 조사', '소문으로 번지는 음해', '한계에 부딪힌 성장 정체',
      '되살아난 전생의 트라우마', '경쟁자의 똑같은 미래지식', '지키려던 사람의 위험', '예측을 비웃는 천재 라이벌',
      '내부 정보 유출의 정황', '갑작스러운 자금줄의 차단', '여론의 급격한 등 돌림', '뒤바뀐 규칙에 무력해진 강점',
      '동맹의 이해관계 충돌', '한발 앞선 적의 선수', '예상 못 한 천재지변', '쌓아둔 기반을 노리는 거대 세력',
    ],
  },
  {
    key: 'twist', label: '반전·떡밥',
    pool: [
      '빌런도 회귀자였다', '미래가 이미 바뀌어 있었다', '회귀의 대가·부작용', '두 번째 회귀의 진실', '시스템·신적 존재의 의도',
      '죽은 줄 알았던 인물의 생존', '진짜 흑막은 따로 있었다', '아군의 숨겨진 배신', '적의 진짜 동기는 다른 곳에', '전생 기억의 일부 오류',
      '나만 회귀한 게 아니었다', '예고한 미래가 함정이었다', '가족·인연에 얽힌 비밀', '회귀 전후로 바뀐 진실', '미래지식이 거짓 정보였다',
      '세계 자체에 숨은 규칙', '나를 회귀시킨 존재의 정체', '전생의 선택이 부른 나비효과', '잊고 있던 결정적 단서', '두 타임라인의 충돌',
      '적이 미래를 더 잘 안다', '회귀로 사라진 누군가', '운명을 비튼 대가', '예지의 진짜 한계', '근원 사건의 숨은 진실',
      '조력자가 사실은 또 다른 회귀자', '전생의 죽음에 숨은 진짜 원인', '예언을 가장한 누군가의 설계',
      '회귀가 처음이 아니었다', '가장 믿은 사람이 흑막', '바뀐 미래가 더 큰 비극의 시작', '잃은 줄 알았던 능력의 각성',
      '전생의 적이 사실은 아군', '세계를 지배하는 숨은 손', '회귀를 노린 거대한 음모', '두 번 산 자만 아는 비밀',
      '미래를 바꾼 진짜 주체는 따로', '되풀이된 운명의 고리',
    ],
  },
]
const SEED_TOTAL = SEED_AXES.reduce((n, a) => n * a.pool.length, 1)

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function clamp(n: unknown, lo: number, hi: number, dflt: number): number {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return dflt
  return Math.min(hi, Math.max(lo, v))
}
function fmtBig(n: number): string {
  // 한국어 만/억/조 단위 표기
  if (n >= 1e12) return `${(n / 1e12).toFixed(n >= 1e13 ? 0 : 1)}조`
  if (n >= 1e8) return `${(n / 1e8).toFixed(n >= 1e9 ? 0 : 1)}억`
  if (n >= 1e4) return `${(n / 1e4).toFixed(n >= 1e5 ? 0 : 1)}만`
  return n.toLocaleString('ko-KR')
}
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

interface BeatState { text: string; done: boolean; cida: number; meta: number; growth: number; risk: number }
interface Store {
  title: string
  unit: Unit
  total: string
  preset: string
  beats: Record<string, BeatState>
}

function emptyBeat(b: BeatDef): BeatState { return { text: '', done: false, cida: b.cida, meta: b.meta, growth: b.growth, risk: b.risk } }
function defaultStore(): Store {
  const beats: Record<string, BeatState> = {}
  for (const b of BEATS) beats[b.key] = emptyBeat(b)
  return { title: '', unit: 'episode', total: '', preset: 'tycoon', beats }
}
function loadStore(): Store {
  const base = defaultStore()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return base
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return base
    const s: Store = {
      title: typeof p.title === 'string' ? p.title : '',
      unit: (p.unit === 'won고' || p.unit === 'page') ? p.unit : 'episode',
      total: typeof p.total === 'string' ? p.total : (typeof p.total === 'number' ? String(p.total) : ''),
      preset: PRESETS.some((x) => x.key === p.preset) ? p.preset : 'tycoon',
      beats: base.beats,
    }
    const pb = p.beats && typeof p.beats === 'object' ? p.beats : {}
    for (const b of BEATS) {
      const v = pb[b.key]
      if (v && typeof v === 'object') {
        s.beats[b.key] = {
          text: typeof v.text === 'string' ? v.text : '',
          done: !!v.done,
          cida: clamp(v.cida, 0, 10, b.cida),
          meta: clamp(v.meta, 0, 10, b.meta),
          growth: clamp(v.growth, 0, 10, b.growth),
          risk: clamp(v.risk, 0, 10, b.risk),
        }
      }
    }
    return s
  } catch { return base }
}

export default function ModfanPlotLogic({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [openKey, setOpenKey] = useState<Record<string, boolean>>({})
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  // 비트별 발상 시드 + 잠금
  const [seeds, setSeeds] = useState<Record<string, Record<string, string>>>({})
  const [locks, setLocks] = useState<Record<string, Record<string, boolean>>>({})
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload.genre 활용 — 현판 회귀 외 장르로 열리면 안내(동작은 그대로)
  useEffect(() => {
    const g = payload && typeof payload.genre === 'string' ? payload.genre : ''
    if (g && g !== '현대판타지·회귀' && mounted.current) {
      setNote(`이 도구는 현대판타지·회귀 전용입니다(현재 장르: ${g}). 비트 가이드는 현판 회귀 관습 기준이에요.`)
    }
  }, [payload])

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [store])

  const flashMsg = (m: string) => { setFlash(m); window.setTimeout(() => { if (mounted.current) setFlash('') }, 1800) }

  const preset = PRESETS.find((p) => p.key === store.preset) || PRESETS[0]

  // ── 변경 헬퍼 ──────────────────────────────────────────────
  const setMeta = (patch: Partial<Pick<Store, 'title' | 'unit' | 'total'>>) => setStore((s) => ({ ...s, ...patch }))
  const patchBeat = (key: string, patch: Partial<BeatState>) =>
    setStore((s) => ({ ...s, beats: { ...s.beats, [key]: { ...s.beats[key], ...patch } } }))
  const toggleOpen = (key: string) => setOpenKey((o) => ({ ...o, [key]: !o[key] }))

  const applyPreset = (key: string) => {
    const p = PRESETS.find((x) => x.key === key)
    if (!p) return
    setStore((s) => {
      const beats = { ...s.beats }
      // 권장 곡선 덮어쓰기(작성하지 않은 비트도 곡선만 권장값으로 맞춤)
      for (const b of BEATS) {
        const base = emptyBeat(b)
        const ov = p.curve?.[b.key] || {}
        beats[b.key] = { ...beats[b.key], cida: ov.cida ?? base.cida, meta: ov.meta ?? base.meta, growth: ov.growth ?? base.growth, risk: ov.risk ?? base.risk }
      }
      return { ...s, preset: key, beats }
    })
    flashMsg(`'${p.name}' 프리셋 적용 — 4개 곡선을 권장값으로 맞췄어요`)
  }

  // ── 권장 위치 환산 ─────────────────────────────────────────
  const totalNum = (() => { const n = parseFloat(store.total); return isFinite(n) && n > 0 ? n : 0 })()
  const totalDigits = store.total.replace(/[^\d.]/g, '')
  const fmtPos = (r: [number, number]): string => {
    if (totalNum > 0) {
      const a = Math.max(1, Math.round((r[0] / 100) * totalNum))
      const b = Math.max(a, Math.round((r[1] / 100) * totalNum))
      return `${a}~${b}${UNIT_SHORT[store.unit]} (${r[0]}~${r[1]}%)`
    }
    return `전체의 ${r[0]}~${r[1]}% 구간`
  }

  // ── 진행률 ─────────────────────────────────────────────────
  const doneCount = BEATS.filter((b) => store.beats[b.key].done).length
  const filledCount = BEATS.filter((b) => store.beats[b.key].text.trim()).length
  const pct = Math.round((doneCount / BEATS.length) * 100)

  // ── 4개 곡선(사이다 / 메타지식 우위 / 성장 지표 / 위기) ───────
  const CW = 660, CH = 178, PADX = 30, PADY = 18
  const xAt = (i: number) => PADX + (i / (BEATS.length - 1)) * (CW - PADX * 2)
  const y10 = (v: number) => PADY + (1 - v / 10) * (CH - PADY * 2)        // 0~10
  const C_CIDA = '#e0a93d'   // 사이다(금색)
  const C_META = 'var(--accent)'
  const C_GROW = '#3fb27f'
  const C_RISK = '#e0533d'
  type Curve = { key: keyof BeatState; color: string; label: string; dash?: string; w: number }
  const CURVES: Curve[] = [
    { key: 'cida', color: C_CIDA, label: '사이다 게이지', w: 2.8 },
    { key: 'meta', color: C_META, label: '메타지식 우위', dash: '5 4', w: 2.2 },
    { key: 'growth', color: C_GROW, label: '성장 지표', dash: '2 3', w: 1.9 },
    { key: 'risk', color: C_RISK, label: '위기·긴장', dash: '1 4', w: 1.9 },
  ]
  const pathOf = (c: Curve) =>
    BEATS.map((b, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${y10(store.beats[b.key][c.key] as number).toFixed(1)}`).join(' ')

  // ── 페이싱 자가진단(도시에 §3·§5·§6·§9 함정) ──────────────────
  const diagnostics: { ok: boolean; msg: string }[] = (() => {
    const out: { ok: boolean; msg: string }[] = []
    // 1화 첫 사이다: 첫 미래지식 행사 비트의 사이다가 충분(현대 웹소설 절대 규칙)
    out.push({ ok: store.beats['firstuse'].cida >= 7, msg: store.beats['firstuse'].cida >= 7 ? '1화 첫 미래지식 행사가 충분히 통쾌해요 — 현판 회귀 1화 후킹 충족' : '첫 미래지식 행사(첫 사이다)가 약해요 — 1화에 회귀+첫 사이다를 못 담으면 이탈 1순위예요' })
    // 미래지식 활용: 초반(자각~기반)의 평균 메타 우위가 높아야(정보 비대칭 = 무기)
    const earlyMeta = (store.beats['awaken'].meta + store.beats['firstuse'].meta + store.beats['seed'].meta) / 3
    out.push({ ok: earlyMeta >= 7, msg: earlyMeta >= 7 ? '초반 메타지식 우위가 충분해요 — 정보 비대칭이 무기로 작동' : '초반 미래지식 우위가 낮아요 — 회귀해놓고 정보를 안 쓰면 장르 계약 위반이에요' })
    // 고구마→사이다 낙차: 클라이맥스 사이다가 파멸(고구마)보다 충분히 높아야
    const cidaDelta = store.beats['climax'].cida - store.beats['death'].cida
    out.push({ ok: cidaDelta >= 7, msg: cidaDelta >= 7 ? `고구마→사이다 낙차가 충분해요(+${cidaDelta}) — 깔아둔 억울함의 인과적 정산` : `고구마→사이다 낙차가 약해요(+${cidaDelta}) — 전생의 파멸만큼 통쾌하게 청산해야 만족도가 올라요` })
    // 수치 성장 가시성: 성장 지표가 단조 증가(정체 구간이 없도록)
    const growSeq = BEATS.map((b) => store.beats[b.key].growth)
    let dips = 0
    for (let i = 1; i < growSeq.length; i++) { if (growSeq[i] < growSeq[i - 1]) dips++ }
    out.push({ ok: dips <= 1, msg: dips <= 1 ? '성장 지표가 꾸준히 우상향해요 — 진척감(재산·랭킹·인지도)이 체감됨' : `성장 지표가 ${dips}곳에서 후퇴해요 — 수치 성장이 정체되면 진척감이 죽어요(주기적 갱신 권장)` })
    // 나비효과 전환: 중간점에서 메타 우위가 초반보다 떨어지기 시작해야(미래가 변동)
    out.push({ ok: store.beats['butterfly'].meta < store.beats['firstuse'].meta, msg: store.beats['butterfly'].meta < store.beats['firstuse'].meta ? '중반에 메타지식 우위가 하락해요 — 나비효과로 미래가 변동(긴장 회복)' : '중반에도 메타지식이 그대로예요 — 미래가 안 바뀌면 후반이 단조로워요(나비효과 도입 권장)' })
    // 메타지식 붕괴: 최저점 비트에서 메타 우위가 바닥(치트 무효화 → 자력 승리 무대)
    out.push({ ok: store.beats['collapse'].meta <= 3, msg: store.beats['collapse'].meta <= 3 ? '메타지식 붕괴가 설계되어 있어요 — 치트 무효화 후 자력 승리의 무대' : '메타지식이 끝까지 만능이에요 — "치트만으로 끝내지 않는다"는 장르 도덕에 어긋나요(붕괴 비트 권장)' })
    // 클라이맥스 자력 승리: 정점에서 메타가 낮고 성장이 높아야(실력·기반으로 이김)
    out.push({ ok: store.beats['climax'].meta <= 4 && store.beats['climax'].growth >= 8, msg: (store.beats['climax'].meta <= 4 && store.beats['climax'].growth >= 8) ? '클라이맥스가 자력 승리예요 — 미래지식이 아닌 쌓아온 실력·기반으로 청산' : '클라이맥스가 여전히 미래지식 의존이에요 — 회귀 후 스스로 쌓은 것으로 이겨야 카타르시스가 커요' })
    return out
  })()
  const diagOk = diagnostics.filter((d) => d.ok).length

  // ── 비트 발상 시드(슬롯 풀 무작위, 잠금/재생성) ──────────────
  const rollSeed = (beatKey: string) => {
    setSeeds((prev) => {
      const cur = prev[beatKey] || {}
      const lk = locks[beatKey] || {}
      const next: Record<string, string> = {}
      for (const a of SEED_AXES) next[a.key] = lk[a.key] && cur[a.key] ? cur[a.key] : pick(a.pool)
      return { ...prev, [beatKey]: next }
    })
  }
  const toggleSeedLock = (beatKey: string, axis: string) =>
    setLocks((prev) => ({ ...prev, [beatKey]: { ...(prev[beatKey] || {}), [axis]: !(prev[beatKey]?.[axis]) } }))
  const seedToText = (beatKey: string) => {
    const s = seeds[beatKey]
    if (!s) return
    const line = SEED_AXES.map((a) => `${a.label}: ${s[a.key]}`).join(' / ')
    setStore((st) => {
      const prevText = st.beats[beatKey].text
      const merged = prevText.trim() ? `${prevText.trim()}\n· (시드) ${line}` : `(시드) ${line}`
      return { ...st, beats: { ...st.beats, [beatKey]: { ...st.beats[beatKey], text: merged } } }
    })
    flashMsg('발상 시드를 비트 내용에 넣었어요')
  }

  // ── 텍스트/HTML 빌드 ───────────────────────────────────────
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const buildText = (): string => {
    const L: string[] = []
    L.push(`[현판 회귀 플롯 로직]${store.title ? ` ${store.title}` : ''}`)
    L.push(`하위유형: ${preset.name} — ${preset.desc}`)
    if (totalNum > 0) L.push(`총 분량: ${totalDigits} ${UNIT_LABEL[store.unit]}`)
    L.push(`진행률: ${doneCount}/${BEATS.length} (${pct}%) · 페이싱 점검 ${diagOk}/${diagnostics.length}`)
    L.push('')
    for (const b of BEATS) {
      const st = store.beats[b.key]
      L.push(`${st.done ? '[v]' : '[ ]'} ${b.title} 〈${fmtPos(b.pos)}〉`)
      L.push(`   곡선: 사이다 ${st.cida}/10 · 메타지식 ${st.meta}/10 · 성장 ${st.growth}/10 · 위기 ${st.risk}/10`)
      L.push(`   기능: ${b.func}`)
      const pn = preset.notes[b.key]
      if (pn) L.push(`   [${preset.name}] ${pn}`)
      if (st.text.trim()) st.text.trim().split('\n').forEach((l) => L.push(`   · ${l}`))
      L.push('')
    }
    return L.join('\n').trimEnd() + '\n'
  }
  const buildBodyHtml = (): string => {
    const parts: string[] = []
    if (store.title.trim()) parts.push(`<p><em>${esc(store.title.trim())}</em></p>`)
    parts.push(`<p><strong>하위유형:</strong> ${esc(preset.name)} — ${esc(preset.desc)}</p>`)
    parts.push(`<p><strong>진행률:</strong> ${doneCount}/${BEATS.length} (${pct}%) · <strong>페이싱 점검:</strong> ${diagOk}/${diagnostics.length}</p>`)
    for (const b of BEATS) {
      const st = store.beats[b.key]
      parts.push(`<h3>${esc(b.title)} <span>〈${esc(fmtPos(b.pos))}〉</span></h3>`)
      parts.push(`<p><em>곡선: 사이다 ${st.cida}/10 · 메타지식 ${st.meta}/10 · 성장 ${st.growth}/10 · 위기 ${st.risk}/10</em></p>`)
      parts.push(`<p><em>기능: ${esc(b.func)}</em></p>`)
      const pn = preset.notes[b.key]
      if (pn) parts.push(`<p><em>[${esc(preset.name)}] ${esc(pn)}</em></p>`)
      if (st.text.trim()) st.text.trim().split('\n').forEach((l) => parts.push(`<p>${esc(l) || '&nbsp;'}</p>`))
      else parts.push('<p>&nbsp;</p>')
    }
    return parts.join('')
  }

  const copyAll = async () => {
    const text = buildText()
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      flashMsg('전체 플롯을 복사했어요')
    } catch { setNote('복사가 지원되지 않는 환경이에요. 텍스트를 직접 선택해 복사해 주세요.') }
  }

  const toProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: store.title.trim() ? `현판 회귀 플롯 — ${store.title.trim()}` : '현판 회귀 플롯 로직',
      bodyHtml: buildBodyHtml(),
      meta: {
        장르: '현대판타지·회귀',
        하위유형: preset.name,
        진행률: `${doneCount}/${BEATS.length} (${pct}%)`,
        페이싱점검: `${diagOk}/${diagnostics.length}`,
        ...(totalNum > 0 ? { 총분량: `${totalDigits} ${UNIT_LABEL[store.unit]}` } : {}),
      },
    })
    flashMsg(id ? '프로젝트 자료(구조)에 플롯 문서를 추가했어요' : '프로젝트에 연결되지 않았습니다')
  }

  const toSnippet = () => {
    const filled = BEATS.filter((b) => store.beats[b.key].text.trim())
    if (filled.length === 0) { setNote('저장할 비트 내용이 없어요. 비트를 펼쳐 내용을 적어 보세요.'); return }
    const text = filled.map((b) => `[${b.title}] ${store.beats[b.key].text.trim()}`).join('\n')
    addToLibrary('snippets', { text, source: `현판 회귀 플롯 로직${store.title ? ` · ${store.title}` : ''}`, tags: ['현대판타지·회귀', '플롯', '구조', preset.name] })
    flashMsg('작성한 비트를 글감(스니펫)으로 저장했어요')
  }

  const resetAll = () => {
    if (!window.confirm('모든 비트 내용·진행 상태·곡선을 초기화할까요?')) return
    setStore(defaultStore()); setOpenKey({}); setSeeds({}); setLocks({})
    flashMsg('모두 초기화했어요')
  }

  // ── 스타일 ─────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0 }
  const head: React.CSSProperties = { padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--chrome-2)' }
  const row: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }
  const input: React.CSSProperties = { padding: '8px 10px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', minWidth: 0 }
  const select: React.CSSProperties = { ...input, cursor: 'pointer' }
  const barWrap: React.CSSProperties = { height: 10, borderRadius: 6, background: 'var(--paper)', border: '1px solid var(--border)', overflow: 'hidden' }
  const barFill: React.CSSProperties = { height: '100%', width: `${pct}%`, background: 'var(--ok)', transition: 'width .25s ease' }
  const statRow: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 12.5, color: 'var(--muted)', flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.55 }
  const card = (done: boolean): React.CSSProperties => ({ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', borderLeft: `4px solid ${done ? 'var(--ok)' : C_CIDA}`, overflow: 'hidden' })
  const cHead: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px' }
  const cTitle: React.CSSProperties = { fontSize: 14, fontWeight: 700, lineHeight: 1.35 }
  const posLine: React.CSSProperties = { fontSize: 11.5, color: C_CIDA, marginTop: 3, fontWeight: 600 }
  const chk: React.CSSProperties = { flexShrink: 0, width: 18, height: 18, marginTop: 1, cursor: 'pointer', accentColor: 'var(--ok)' }
  const ta: React.CSSProperties = { width: '100%', minHeight: 64, resize: 'vertical', padding: '8px 10px', fontSize: 13.5, lineHeight: 1.5, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const section: React.CSSProperties = { padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 9 }
  const subLabel: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }
  const funcBox: React.CSSProperties = { fontSize: 12.5, color: 'var(--text)', lineHeight: 1.55, background: 'var(--chrome-2)', borderRadius: 8, padding: '7px 9px' }
  const presetNote: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.55, background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }
  const sliderRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 }
  const foot: React.CSSProperties = { borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--chrome-2)' }
  const exTag: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 7, padding: '3px 8px' }
  const seedChip = (locked: boolean): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, padding: '3px 7px', borderRadius: 7, cursor: 'pointer', border: `1px solid ${locked ? C_CIDA : 'var(--border)'}`, background: locked ? 'color-mix(in srgb, ' + C_CIDA + ' 16%, transparent)' : 'var(--chrome-2)' })

  const RELATED: { id: string; icon: string; label: string }[] = [
    { id: 'modfan-tropes', icon: '🏷️', label: '현판 회귀 트로프' },
    { id: 'modfan-synopsis', icon: '📝', label: '현판 회귀 시놉시스' },
    { id: 'modfan-outline', icon: '🗂️', label: '현판 회귀 개요' },
    { id: 'modfan-eventforge', icon: '🎲', label: '현판 회귀 사건 생성기' },
    { id: 'modfan-sceneforge', icon: '🎬', label: '현판 회귀 장면 생성기' },
    { id: 'modfan-charforge', icon: '🧬', label: '현판 회귀 인물 생성기' },
    { id: 'litrpg-plotlogic', icon: '📈', label: 'LitRPG 플롯 로직' },
  ]

  // 슬라이더 정의(비트 카드 내부)
  const SLIDERS: { key: keyof BeatState; label: string; color: string; lo: number; loTxt: string; hiTxt: string }[] = [
    { key: 'cida', label: '사이다', color: C_CIDA, lo: 0, loTxt: '고구마', hiTxt: '통쾌' },
    { key: 'meta', label: '메타지식', color: C_META, lo: 0, loTxt: '무용', hiTxt: '완전우위' },
    { key: 'growth', label: '성장 지표', color: C_GROW, lo: 0, loTxt: '무일푼', hiTxt: '정점' },
    { key: 'risk', label: '위기·긴장', color: C_RISK, lo: 0, loTxt: '안전', hiTxt: '절체절명' },
  ]

  return (
    <div style={wrap}>
      <div style={head}>
        <div style={row}>
          <span style={{ fontSize: 18 }}><Emoji e="⏪" /></span>
          <input style={{ ...input, flex: '2 1 170px' }} value={store.title} onChange={(e) => setMeta({ title: e.target.value })} placeholder="작품 제목 (선택)" maxLength={120} aria-label="작품 제목" />
          <input style={{ ...input, flex: '0 1 90px', width: 90 }} value={store.total} onChange={(e) => setMeta({ total: e.target.value.replace(/[^\d.]/g, '') })} placeholder="총 분량" inputMode="decimal" aria-label="총 분량" />
          <select style={select} value={store.unit} onChange={(e) => setMeta({ unit: e.target.value as Unit })} aria-label="분량 단위">
            <option value="episode">회차</option>
            <option value="won고">원고지(매)</option>
            <option value="page">페이지</option>
          </select>
        </div>
        <div style={row}>
          <label style={{ ...subLabel, alignSelf: 'center' }}>하위유형</label>
          <select style={{ ...select, flex: '1 1 200px' }} value={store.preset} onChange={(e) => applyPreset(e.target.value)} aria-label="하위유형 프리셋">
            {PRESETS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
          </select>
          <span style={{ ...hint, flex: '1 1 220px', fontSize: 11.5 }}>{preset.desc}</span>
        </div>
        <div style={barWrap}><div style={barFill} /></div>
        <div style={statRow}>
          <span>완료 <strong style={{ color: 'var(--ok)' }}>{doneCount}</strong> / {BEATS.length} · 작성 <strong style={{ color: 'var(--text)' }}>{filledCount}</strong> · <strong style={{ color: 'var(--accent)' }}>{pct}%</strong> · 페이싱 <strong style={{ color: diagOk === diagnostics.length ? 'var(--ok)' : 'var(--warn)' }}>{diagOk}/{diagnostics.length}</strong></span>
          {totalNum > 0 ? <span>총 {totalDigits} {UNIT_LABEL[store.unit]} 기준 환산</span> : <span>총 분량을 넣으면 권장 위치를 환산해요</span>}
        </div>
        {note && <div style={{ fontSize: 12, color: 'var(--warn)', lineHeight: 1.5 }}>{note}</div>}
      </div>

      <div style={body}>
        {/* ── 4개 곡선: 사이다 · 메타지식 우위 · 성장 지표 · 위기 ── */}
        <div style={panel}>
          <div style={sectionTitle}>4개 곡선 · 파멸→두 번째 인생 (고구마↔사이다 진자 + 메타지식 흥망 + 수치 성장 + 위기)</div>
          <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" style={{ display: 'block', maxHeight: 196 }} role="img" aria-label="현판 회귀 진행 곡선">
            {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
              const y = PADY + g * (CH - PADY * 2)
              return <line key={i} x1={PADX} y1={y} x2={CW - PADX} y2={y} stroke="var(--border)" strokeWidth={1} strokeDasharray="2 4" opacity={0.55} />
            })}
            {CURVES.map((c) => (
              <path key={c.key as string} d={pathOf(c)} fill="none" stroke={c.color} strokeWidth={c.w} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={c.dash} opacity={0.9} />
            ))}
            {/* 사이다 곡선 점(주축) */}
            {BEATS.map((b, i) => (
              <circle key={'c' + i} cx={xAt(i)} cy={y10(store.beats[b.key].cida)} r={3.4} fill={C_CIDA} stroke="var(--paper)" strokeWidth={1.4}>
                <title>{`${b.title} · 사이다 ${store.beats[b.key].cida}/10`}</title>
              </circle>
            ))}
          </svg>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
            {CURVES.map((c) => (
              <span key={c.key as string} style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                <span style={{ display: 'inline-block', width: 14, height: 3, background: c.color, verticalAlign: 'middle', marginRight: 5 }} />{c.label}
              </span>
            ))}
          </div>
          <div style={{ ...hint, fontSize: 11.5, marginTop: 4 }}>메타지식은 1화에서 정점→중반 나비효과로 하락→10번(붕괴)에서 바닥. 사이다는 2번(첫 행사)·11번(자력 청산)에서 정점으로. 미래지식이 사라진 뒤 스스로 쌓은 것으로 이기세요.</div>
        </div>

        {/* ── 페이싱 자가진단 ── */}
        <div style={panel}>
          <div style={sectionTitle}>페이싱 자가진단 · {diagOk}/{diagnostics.length} 충족 (도시에 함정 기반)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {diagnostics.map((d, i) => (
              <div key={i} style={{ fontSize: 12.5, lineHeight: 1.5, color: d.ok ? 'var(--text)' : 'var(--warn)' }}>
                <span style={{ marginRight: 6 }}>{d.ok ? <Emoji e="✅" /> : <Emoji e="⚠️" />}</span>{d.msg}
              </div>
            ))}
          </div>
        </div>

        {/* ── 13비트 입력 ── */}
        {BEATS.map((b) => {
          const st = store.beats[b.key]
          const isOpen = !!openKey[b.key]
          const hasContent = !!st.text.trim()
          const pn = preset.notes[b.key]
          const seed = seeds[b.key]
          const lk = locks[b.key] || {}
          return (
            <div key={b.key} style={card(st.done)}>
              <div style={cHead}>
                <input type="checkbox" style={chk} checked={st.done} onChange={() => patchBeat(b.key, { done: !st.done })} aria-label={`${b.title} 완료`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={cTitle}>{b.title}{hasContent && !isOpen ? <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · 작성됨</span> : ''}</div>
                  <div style={posLine}>권장: {fmtPos(b.pos)} · 사이다 {st.cida} · 메타 {st.meta} · 성장 {st.growth} · 위기 {st.risk}</div>
                </div>
                <button className="minibtn" style={{ flexShrink: 0 }} onClick={() => toggleOpen(b.key)} aria-expanded={isOpen}>{isOpen ? '접기 ▲' : '펼치기 ▼'}</button>
              </div>

              {isOpen && (
                <div style={section}>
                  <div style={funcBox}><strong style={{ color: 'var(--accent-2)' }}>{b.sub} · 기능</strong> — {b.func}</div>
                  <div style={hint}><strong>작법 팁:</strong> {b.tip}</div>
                  {pn && <div style={presetNote}><strong>[{preset.name}]</strong> {pn}</div>}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {b.ex.map((e, i) => <span key={i} style={exTag}>{e}</span>)}
                  </div>

                  <div style={subLabel}>이 비트에서 무슨 일이 일어나나요?</div>
                  <textarea style={ta} value={st.text} onChange={(e) => patchBeat(b.key, { text: e.target.value })} placeholder="장면·사건·미래지식 활용·사이다 포인트·성장 수치를 자유롭게…" />

                  {/* 4개 슬라이더 */}
                  {SLIDERS.map((sl) => (
                    <div key={sl.key as string} style={sliderRow}>
                      <span style={{ ...subLabel, width: 70, flexShrink: 0 }}>{sl.label}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--muted)', width: 42, flexShrink: 0, textAlign: 'right' }}>{sl.loTxt}</span>
                      <input type="range" min={sl.lo} max={10} value={st[sl.key] as number} onChange={(e) => patchBeat(b.key, { [sl.key]: Number(e.target.value) } as Partial<BeatState>)} style={{ flex: 1, accentColor: sl.color }} aria-label={`${b.title} ${sl.label}`} />
                      <span style={{ fontSize: 10.5, color: 'var(--muted)', width: 44, flexShrink: 0 }}>{sl.hiTxt}</span>
                      <strong style={{ fontSize: 13, width: 30, textAlign: 'right', color: sl.color }}>{st[sl.key] as number}</strong>
                    </div>
                  ))}

                  {/* 발상 시드(슬롯 풀 무작위, 잠금/재생성) */}
                  <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 9, marginTop: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}>
                      <span style={{ ...subLabel, color: C_CIDA }}><Emoji e="💡" /> 비트 발상 시드</span>
                      <button className="minibtn" onClick={() => rollSeed(b.key)} title="슬롯 풀에서 무작위 조합(잠금은 유지)">{seed ? <><Emoji e="🎲" /> 다시 굴리기</> : <><Emoji e="🎲" /> 굴리기</>}</button>
                      {seed && <button className="minibtn" onClick={() => seedToText(b.key)} title="시드를 위 내용에 추가"><Emoji e="⬆️" /> 내용에 넣기</button>}
                      <span style={{ ...hint, fontSize: 11, marginLeft: 'auto' }}>조합수 {fmtBig(SEED_TOTAL)}가지</span>
                    </div>
                    {seed ? (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {SEED_AXES.map((a) => (
                          <span key={a.key} style={seedChip(!!lk[a.key])} onClick={() => toggleSeedLock(b.key, a.key)} title={lk[a.key] ? '잠금 해제(다음 굴리기에 바뀜)' : '잠금(다음 굴리기에 고정)'}>
                            <span style={{ opacity: 0.7 }}>{lk[a.key] ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</span>
                            <span style={{ color: 'var(--muted)' }}>{a.label}:</span>
                            <strong>{seed[a.key]}</strong>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ ...hint, fontSize: 11.5 }}>막힌 비트라면 굴려서 회귀 시점·미래 정보·선점 자산·사이다 종류·위협·반전을 무작위로 받아보세요. 칩을 눌러 잠그면 그 축만 고정됩니다.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* ── 연계 도구 ── */}
        <div className="linkbar">
          <span className="linkbar-label">연계:</span>
          {RELATED.map((r) => (
            <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: '현대판타지·회귀' })} title={`${r.label} 열기`}><Emoji e={r.icon} /> {r.label}</button>
          ))}
        </div>
      </div>

      <div style={{ ...foot, borderBottom: '1px solid var(--border)' }} className="linkbar">
        <span className="linkbar-label">프로젝트:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '13비트 플롯을 프로젝트 자료(구조)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={toSnippet} title="작성한 비트를 글감(스니펫) 라이브러리에 저장"><Emoji e="💾" /> 글감으로 저장</button>
      </div>

      <div style={foot}>
        <button className="btn-primary" onClick={copyAll}><Emoji e="📋" /> 전체 복사</button>
        <button className="minibtn" onClick={() => setOpenKey(Object.fromEntries(BEAT_KEYS.map((k) => [k, true])))}>모두 펼치기</button>
        <button className="minibtn" onClick={() => setOpenKey({})}>모두 접기</button>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12.5, color: 'var(--ok)', fontWeight: 600 }}>{flash}</span>}
        <button className="minibtn" onClick={resetAll} style={{ color: 'var(--warn)' }}>초기화</button>
      </div>
    </div>
  )
}
