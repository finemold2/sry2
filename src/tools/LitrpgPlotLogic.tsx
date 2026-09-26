// 게임판타지·LitRPG 플롯·진행곡선(로직) 템플릿 — 도시에에 근거한 "LitRPG 표준 성장-나선 매크로 구조 + 웹소설 코어루프 페이싱"을 단계 입력 시트로.
//  핵심 명제(도시에 §2·§4): LitRPG의 동력은 (1) 성장의 가시화(레벨/스탯/스킬을 '숫자'로 확인), (2) 시스템의 일관성·공정성, (3) 사이다(무시→압도)의 보상 리듬,
//   (4) 단·중·장기 목표 위계의 동시 가동, (5) 사냥→경험치/드랍→레벨업/강화→더 센 사냥의 코어 루프.
//  · 13비트(억울한 일상~시스템 배후·새 차원)에 내용 입력 + 완료 체크 + 진행률.
//  · 비트마다 4개 슬라이더 → 4개 곡선: 주인공 파워(수치 성장), 보상 밀도(루팅·해금), 긴장도(데스/페널티), 목표 스케일(개인↔우주). 성장 나선·파워 인플레 가시화.
//  · 4분기 프리셋(VR 다이브 / 갇힘·데스게임 / 이세계 전이+시스템 / 현실 침공·시스템 아포칼립스)으로 비트 가이드·곡선 권장값 자동 세팅(도시에 §0·§1).
//  · "비트 발상 시드" — 각 비트의 슬롯 풀(무대/시스템 이벤트/퀘스트/보상/적/특별함 등)을 무작위 조합으로 굴려 막힌 비트의 글감을 던짐(잠금/재생성, 조합수 1조+ 표시).
//  · 페이싱 자가진단(첫 특별함 누락·파워 인플레·보상 둔감·시스템 일관성·데스 긴장·코어루프 변주·배후 떡밥 등 도시에 §4·§9 함정 기반).
//  · localStorage 'sry:tool:litrpg-plotlogic' 자동 저장/복원. addToProject(folder:"구조"). 글감(snippets) 저장. 연계 도구 열기.
// 자급식: react/linkbus 외 import 없음. 전부 로컬.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = { id: 'litrpg-plotlogic', name: 'LitRPG 플롯 로직', icon: '📈', group: '플롯', genre: '게임판타지·LitRPG', intro: 'LitRPG 표준 성장-나선 13비트 구조·파워/보상/긴장/스케일 곡선·코어루프 페이싱으로 레벨업 서사의 진행을 설계하세요', w: 720, h: 680 }

const LS_KEY = 'sry:tool:litrpg-plotlogic'

// ── LitRPG 표준 성장-나선 13비트 매크로 구조(도시에 §4 전체 흐름 + §3 장치 + §5 클라이맥스) ───────────────
// pos: 전체 분량 대비 권장 위치 구간(%).
// power: 주인공 파워(0=F급·쪼렙 … 10=먼치킨·최상위 랭커). reward: 보상 밀도(루팅·레벨업·해금·강화). tension: 긴장도(죽음·페널티·전멸 위기). scale: 목표 스케일(0=개인 생존 … 10=세계·차원·시스템 배후).
interface BeatDef {
  key: string
  title: string
  sub: string
  pos: [number, number]
  power: number
  reward: number
  tension: number
  scale: number
  func: string   // LitRPG에서 이 비트의 기능(도시에 근거)
  tip: string    // 작법 팁
  ex: string[]   // 분기/관습 변주
}

const BEATS: BeatDef[] = [
  {
    key: 'mundane', title: '0. 억울한 일상 · 약자 셋업', sub: 'The Underdog', pos: [0, 3], power: 1, reward: 1, tension: 3, scale: 1,
    func: '시스템 이전의 무력한 현실 — F급 각성자·말단 직장인·하위 랭커·노예. "왜 응원하게 되는가"의 채권을 깐다(도시에 §4-1 ①). 무시·차별·생존 압박을 강렬하게.',
    tip: '독자가 주인공의 억울함을 공유하도록 약자성을 분명히. 이 결핍이 곧 사이다의 채권이자 성장 동기다. 단, 고구마는 짧게.',
    ex: ['E·F급으로 멸시당하는 각성자', '게임 폐인이 된 무직·하층민', '회귀 전 비참하게 죽은 약자의 회상'],
  },
  {
    key: 'incite', title: '1. 인사이팅 인시던트 · 접속/각성/전이', sub: 'Inciting Incident', pos: [1, 6], power: 1, reward: 2, tension: 5, scale: 2,
    func: '게임 접속·시스템 각성·이세계 전이·현실 침공(게이트·상태창 출현) — 더는 돌아갈 수 없는 방아쇠(도시에 §0 4분기·§4-1 ②). 룰이 깔리는 순간.',
    tip: '4분기 중 무엇인지를 1~3화 안에 명확히. 데스게임이면 "죽으면 진짜 죽음"의 규칙을, 침공형이면 "현실이 바뀌었다"의 충격을 못박아라.',
    ex: ['VR 캡슐 접속 / 로그인', '[튜토리얼이 시작됩니다] 시스템 메시지', '눈앞에 던전·게이트가 열림', '이세계 눈뜨니 상태창'],
  },
  {
    key: 'tutorial', title: '2. 튜토리얼 · 규칙 학습', sub: 'Tutorial / Onboarding', pos: [4, 14], power: 2, reward: 3, tension: 6, scale: 2,
    func: '시스템의 규칙(레벨·스탯·스킬·HP/MP·페널티)을 배우는 구간 = 독자 온보딩(도시에 §3 상태창·§4-1 ③). 안내자 AI/도깨비/관리자가 룰을 설명.',
    tip: '룰 공개 = 독자와의 공정성 계약. 여기서 정한 규칙은 끝까지 지켜라(임의로 어기면 반발). 첫 상태창은 보상감 있게 연출.',
    ex: ['시스템(의인화) AI의 안내', '첫 상태창·스탯 분배 화면', '튜토리얼 던전·첫 퀘스트', '죽음/페널티 규칙의 첫 경고'],
  },
  {
    key: 'unique', title: '3. 첫 특별함 획득 · 차별화', sub: 'The Edge', pos: [8, 18], power: 3, reward: 6, tension: 4, scale: 2,
    func: '주인공만의 무기 — 히든 클래스·유니크 스킬·단독 보유 시스템·회귀/원작 지식. "남들 못 가진 것"이 서사의 엔진(도시에 §2 희귀/유니크·§3).',
    tip: '특별함은 "사기여도 규칙 안에서 사기"여야 한다. 성장 잠재력(스노볼)을 남겨두고, 당장은 약하지만 독보적인 가능성으로 설계.',
    ex: ['히든·유니크 클래스 전직', '성장형/복제형 단독 스킬', '나만 보이는 시스템 창', '회귀자·원작 독자의 미래 지식'],
  },
  {
    key: 'firstcida', title: '4. 첫 사이다 · 무시 갚기', sub: 'First Payoff', pos: [14, 28], power: 4, reward: 7, tension: 5, scale: 3,
    func: '깐 고구마(무시·차별)를 처음 청산. 무시하던 자·길드·랭커를 압도하는 축소판 사이다(도시에 §2 사이다·§4-1 ⑤). 레벨업·스킬·드랍이 공인되는 첫 통쾌.',
    tip: '사이다는 확실히, 고구마는 짧게(3·3·3 리듬). 너무 늦은 첫 사이다는 초반 이탈 요인. 수치 상승이 곧 갚음의 증거가 되게 하라.',
    ex: ['무시하던 파티/랭커를 솔로로 압도', '첫 보스/네임드 단독 처치', '히든 퀘스트 최초 클리어 보너스', '미래 지식으로 음모 선제 분쇄'],
  },
  {
    key: 'coreloop', title: '5. 코어 루프 · 사냥-성장 가동', sub: 'The Grind Loop', pos: [22, 42], power: 5, reward: 7, tension: 5, scale: 3,
    func: '사냥→경험치/드랍→레벨업/강화→더 센 사냥의 핵심 보상 루프 가동(도시에 §4 코어 루프). 빌드·스탯 분배·스킬 시너지의 최적화 쾌감.',
    tip: '루프가 지루해지지 않게 변주(신지역·신시스템·라이벌·신 드랍)를 주기적으로 투입. 빌드 정체성(근접/마법/잠입)을 분명히 잡아라.',
    ex: ['파밍·강화·인챈트·옵션 뽑기', '스킬 진화/각성/콤보 개발', '랭킹·길드 입성·평판 상승', '레이드 파티 합류, 경제/생산직 운용'],
  },
  {
    key: 'gate', title: '6. 파워 게이팅 · 자격의 벽', sub: 'Power Gate', pos: [38, 54], power: 6, reward: 5, tension: 6, scale: 4,
    func: '다음 구획(상위 지역·던전·탑 층·랭킹전) 진입의 자격 벽(레벨/아이템/퀘스트 게이트)(도시에 §4 파워 게이팅). 성장 동기를 재충전.',
    tip: '벽을 넘기 위한 "특수 조건"이 작은 아크가 된다(전직 퀘스트·재료 수집·연계 퀘). 게이트 앞 좌절을 한 번 깔아 돌파의 쾌감을 키워라.',
    ex: ['전직/상위 직업 퀘스트', '히든·연계 퀘스트의 분기점', '랭킹전·길드전·탑 층 도전', '레이드 입장 자격 충족'],
  },
  {
    key: 'rival', title: '7. 라이벌·경쟁 · 외부 위협 상승', sub: 'Rising Conflict', pos: [48, 64], power: 6, reward: 5, tension: 7, scale: 5,
    func: '라이벌 랭커·적대 길드·PK·운영진/관리자·다른 각성자의 견제가 수면 위로(도시에 §2 랭킹·경쟁·§4 변주). 정보전·빌드 카운터의 머리싸움.',
    tip: '위협은 시스템 규칙 안에서 필연적으로 자라야(랭킹·자원·이권). 라이벌은 주인공의 약점/빌드를 노려 긴장을 만든다. 고구마 총량 통제.',
    ex: ['최상위 랭커·천재의 견제', '적대 길드/세력의 압박', 'PK·약탈·아이템 강탈 위협', '운영진/관리자의 개입·밸런스 패치'],
  },
  {
    key: 'midpoint', title: '8. 중간점 전환 · 판 뒤집기', sub: 'Midpoint Twist', pos: [50, 62], power: 7, reward: 7, tension: 7, scale: 6,
    func: '거짓 승리 또는 거짓 패배로 판이 뒤집힘 — 새 시스템 해금, 숨은 진실 폭로, 단위 리셋(차원/등급 개편)의 단서(도시에 §3 시스템 의도·§4 인플레 관리).',
    tip: '"이 시스템은 왜 존재하나"의 메인 떡밥을 본격 가동. A스토리(파워업)와 B스토리(배후 음모)가 교차하며 스케일이 한 단계 점프한다.',
    ex: ['숨겨진 시스템/2차 각성 해금', '시스템 배후·관리자의 의도 단서', '단위 리셋(차원·등급 개편) 예고', '거짓 승리 직후 더 큰 적 등장'],
  },
  {
    key: 'badtide', title: '9. 적의 역습 · 균열', sub: 'Bad Guys Close In', pos: [62, 76], power: 7, reward: 4, tension: 8, scale: 6,
    func: '강해진 적·내부 분열·페널티의 압박이 조여온다(도시에 §4-2 적의 역습). 동료의 죽음·배신·강화 실패(장비 파괴) 등 RNG의 잔혹함.',
    tip: '확률(RNG)을 서사적 긴장 장치로(강화 실패·드랍 실패·치명적 디버프). 데스게임/침공형이면 "죽으면 끝"의 무게를 여기서 최대로.',
    ex: ['동료의 영구사망/배신', '강화 실패로 핵심 장비 파괴', '치명적 상태이상·디버프의 누적', '안전지대 붕괴·세이브 불가 구간'],
  },
  {
    key: 'allislost', title: '10. 절망의 순간 · 전멸 위기', sub: 'All Is Lost', pos: [74, 86], power: 6, reward: 2, tension: 10, scale: 7,
    func: '가장 밑바닥 — 보스/네임드에게 전멸 직전, 시스템마저 등을 돌린 듯한 최저점(도시에 §5 클라이맥스 3박자 ②). "죽음의 냄새".',
    tip: '먼치킨이라도 한 번은 진짜로 몰려야 카타르시스가 산다. 기존 빌드·아이템·전략이 통하지 않는 "벽"으로 설계하라.',
    ex: ['패턴 파악 실패 → 파티 전멸 위기', '시스템 페널티/저주의 폭발', '믿었던 능력의 봉인·무력화', '데스게임: 죽음이 코앞에 닥침'],
  },
  {
    key: 'limitbreak', title: '11. 한계 돌파 · 각성', sub: 'Limit Break', pos: [82, 92], power: 9, reward: 8, tension: 8, scale: 7,
    func: '죽기 직전 새 스킬 각성·잠재력 개방·히든 변수 발동(도시에 §5 한계 돌파). "조건 충족: [○○] 발동" 시스템 메시지로 역전을 정당화.',
    tip: '역전 변수는 미리 깔아둔 떡밥(복선)이어야 공정하다. 데우스엑스마키나 금지 — 누적된 빌드·관계·퀘스트가 열매 맺는 순간으로.',
    ex: ['[조건 충족] 히든 스킬/2차 각성', '봉인 해제·진명/진각성', '동료의 희생이 만든 한 수', '깔아둔 떡밥(아이템·칭호) 발동'],
  },
  {
    key: 'bossclear', title: '12. 클라이맥스 · 보스 레이드 클리어', sub: 'Boss Clear / Reckoning', pos: [88, 96], power: 10, reward: 10, tension: 9, scale: 8,
    func: '사이다의 정점 — 네임드/레이드 보스 처치, 최초 클리어(First Clear) 보너스, 만인 앞 랭킹·평판 역전(도시에 §5·§2). 깔아둔 모든 채권의 인과적 정산.',
    tip: '노력·고생에 비례한 보상으로 정산하라(루팅 개봉의 쾌감 + 칭호 + 랭킹 상승). 다음 게이트/스케일업의 갈고리를 함께 심어라.',
    ex: ['보스 레이드 최초 클리어 + 보너스', '랭킹·길드·세계 차원의 평판 역전', '유니크/레전더리 드랍 개봉', '관리자/시스템 배후로의 한 걸음'],
  },
  {
    key: 'beyond', title: '13. 다음 차원 · 시스템 배후', sub: 'New Tier / Behind the System', pos: [94, 100], power: 9, reward: 8, tension: 6, scale: 10,
    func: '단위 리셋·새 차원·탑의 상층·시스템의 진짜 정체(신/관리자/외계존재/탑의 주인)로의 스케일업(도시에 §3 시스템 의도·§4 인플레 관리). 다음 시즌의 더 큰 목표.',
    tip: '파워 인플레 둔감화를 단위 리셋·상대평가(랭킹)·질적 보상(고유 능력)으로 보완. "게임"에서 "우주적 음모"로 격을 올려라.',
    ex: ['차원/등급 개편 후 새 출발점', '탑의 상층·새 대륙·차원문', '시스템을 만든 존재와의 조우', '현실↔게임 환율·연동의 본격화'],
  },
]
const BEAT_KEYS = BEATS.map((b) => b.key)

// ── 4분기 프리셋(도시에 §0 핵심 분기 4종) ─────────────────────────────────────
interface Preset {
  key: string
  name: string
  desc: string
  notes: Partial<Record<string, string>>           // 비트별 강조 메모
  curve?: Partial<Record<string, Partial<Pick<BeatDef, 'power' | 'reward' | 'tension' | 'scale'>>>>  // 비트별 권장 곡선 덮어쓰기
}
const PRESETS: Preset[] = [
  {
    key: 'vrdive', name: 'VR 다이브형', desc: '현실의 인간이 VRMMORPG에 접속(달빛조각사·로열로드 계열). 로그아웃·현실 생활·현실↔게임 환율 묘사 존재. 경제·생산·일확천금 서사가 강함.',
    notes: {
      incite: 'VR 캡슐 접속/로그인으로 시작. "이건 게임이다"의 안전감 — 죽어도 부활(경험치·아이템 손실)이 기본 톤.',
      coreloop: '사냥뿐 아니라 생산직·경제·노가다·일확천금 루프를 적극 활용(달빛조각사형의 표준). 현실 지위와의 연동을 깐다.',
      bossclear: '랭킹·길드·서버 차원의 평판 역전 + 현실 재화화/현실 지위 상승의 연동.',
      beyond: '게임 성과가 현실 권력·부로 환전되는 환율 구조를 본격화. 현실-게임 이중 구조의 정산.',
    },
    curve: { incite: { tension: 3 }, allislost: { tension: 7 }, coreloop: { reward: 8 } },
  },
  {
    key: 'deathgame', name: '갇힘·데스게임형', desc: '게임에서 못 나옴, 죽으면 진짜 죽음(소드 아트 온라인). 로그아웃·안전지대 없음. 긴장도 최상. 사회·생존·신뢰의 드라마.',
    notes: {
      incite: '"로그아웃 불가 · 죽으면 진짜 죽음"의 규칙을 충격적으로 선언. 안전지대 개념을 지워라.',
      tutorial: '규칙이 곧 생사. "죽음 페널티 = 영구사망"의 무게를 튜토리얼에서 각인.',
      badtide: '동료의 영구사망·PK의 공포를 최대로. 신뢰·배신·생존 윤리의 드라마가 핵심.',
      allislost: '전멸=전원 사망. 되돌릴 수 없는 무게로 절망을 설계(부활 안전망 금지).',
      bossclear: '플로어/보스 공략은 곧 탈출의 한 걸음. 클리어가 생존과 직결.',
    },
    curve: { incite: { tension: 8 }, badtide: { tension: 9 }, allislost: { tension: 10 }, bossclear: { tension: 10 } },
  },
  {
    key: 'isekai', name: '이세계 전이+시스템형', desc: '다른 세계로 넘어갔는데 그 세계에 게임 시스템이 깔림(나 혼자만 레벨업·다수 웹소설). 로그아웃 개념 없음. 시스템=현실.',
    notes: {
      incite: '눈뜨니 이세계 + 상태창. "이곳이 곧 나의 현실"이라 로그아웃이 없다 — 모든 선택이 진짜.',
      unique: '단독 보유 시스템·히든 클래스가 차별화의 핵심(나만의 시스템 창·성장형 스킬).',
      midpoint: '"이 세계의 시스템은 왜 존재하나"의 떡밥을 본격화. 신/관리자 떡밥으로 스케일업.',
      beyond: '탑/차원/세계의 진실로 격상. 시스템을 만든 존재와의 대결로 향한다.',
    },
    curve: { unique: { reward: 7 }, midpoint: { scale: 6 }, beyond: { scale: 10 } },
  },
  {
    key: 'invasion', name: '현실 침공·시스템 아포칼립스', desc: '어느 날 현실에 상태창·던전·게이트가 생김(전지적 독자 시점·나 혼자만 레벨업). 헌터물과 강하게 겹침. 현실 능력=현실 권력.',
    notes: {
      mundane: '시스템 이전의 평범한 현실을 깔아라 — 침공의 충격이 클수록 좋다(헌터물 셋업).',
      incite: '게이트·던전·상태창이 현실에 출현. 세계의 룰이 통째로 바뀌는 재난적 충격.',
      rival: '국가·길드·재벌·각성자 협회 등 현실 권력 구도가 시스템과 얽힌다(헌터물 정치).',
      bossclear: '게이트 브레이크/네임드 처치가 곧 현실(도시·국가) 구원. 게임 능력=현실 권력.',
      beyond: '시나리오·도깨비·관리자 등 침공의 배후로. 세계 멸망/구원의 우주적 스케일.',
    },
    curve: { mundane: { tension: 2 }, incite: { tension: 7, scale: 3 }, rival: { scale: 6 }, bossclear: { scale: 9 } },
  },
]

// ── 분량 단위 ────────────────────────────────────────────────────────────
type Unit = 'episode' | 'won고' | 'page'
const UNIT_LABEL: Record<Unit, string> = { episode: '회차', 'won고': '원고지(매)', page: '페이지' }
const UNIT_SHORT: Record<Unit, string> = { episode: '화', 'won고': '매', page: 'p' }

// ── 비트 발상 시드 슬롯 풀(막힌 비트의 글감) — 조합수 1조+ 지향(도시에 §3·§5·§6·§7) ─────
// 6개 축을 무작위 조합. 각 축의 풀 길이 곱이 총 조합수.
const SEED_AXES: { key: string; label: string; pool: string[] }[] = [
  {
    key: 'place', label: '무대',
    pool: [
      '초보자 사냥터(슬라임 평원)', '시작의 마을 광장', '튜토리얼 던전 1층', '저주받은 지하 미궁', '균열이 열린 도심 한복판',
      '바벨의 탑 중층', '용암 동굴 레이드 던전', '얼어붙은 설산 필드', '망자의 늪지대', '버려진 신전 보스룸',
      '랭커들이 모인 중앙 광장', '길드 본부 회의실', 'PVP 콜로세움', '경매장·아이템 거래소', '히든 피스의 봉인된 방',
      '차원의 틈(차원문 앞)', '관리자의 영역(시스템 공간)', '안전지대가 사라진 필드', '심해 던전', '하늘섬 부유성',
      '폐광 깊은 갱도', '왕도의 모험가 길드', '시간이 멈춘 유적', '거대 보스의 둥지', '게이트 너머 미지의 차원',
      '독무가 깔린 늪 던전', '기계 문명 폐허', '지옥문 입구', '엘프의 신성림', '드래곤의 둥지',
      '모래 폭풍의 사막 유적', '망령이 떠도는 폐성', '거대 미궁의 미로층', '천공의 시련장', '봉인된 결계 안',
      '몬스터 웨이브 방어전 성벽', '히든 보스의 비밀 제단', '플레이어 사망 시 떨군 무덤터',
      '봉인된 던전 최심부', '필드 보스가 군림하는 협곡',
    ],
  },
  {
    key: 'sysevent', label: '시스템 이벤트',
    pool: [
      '[레벨 업!] 능력치 포인트 획득', '[히든 클래스 전직 조건 충족]', '[칭호 획득: 최초의 클리어자]', '[퀘스트 발생] 알림',
      '[경고: 강화 실패 — 장비 파괴]', '[치명타!] 데미지 폭발', '[상태이상: 중독/출혈/기절]', '[2차 각성이 시작됩니다]',
      '[히든 피스를 발견했습니다]', '[랭킹이 갱신되었습니다]', '[스킬 진화: 상위 스킬 획득]', '[페널티 적용: 경험치 손실]',
      '[시스템 점검/밸런스 패치 공지]', '[전직 퀘스트가 시작됩니다]', '[세트 효과 발동]', '[봉인이 해제됩니다]',
      '[메인 시나리오가 갱신됩니다]', '[던전 보스 리스폰까지 남은 시간]', '[연계 퀘스트 해금]', '[고유 능력이 각성합니다]',
      '[차원 등급이 개편됩니다]', '[안내자 AI의 메시지]', '[데스 카운트다운 시작]', '[최초 클리어 보너스 지급]',
      '[숨겨진 진실에 접근했습니다]', '[관리자가 당신을 주시합니다]', '[스탯 한계 돌파 가능]', '[저주가 발동합니다]',
      '[히든 직업이 해방됩니다]', '[전직 가능: 상위 클래스]', '[돌발 퀘스트가 발생했습니다]', '[버프: 광폭화/각성 모드]',
      '[경험치 대폭 증폭 적용]', '[세계 선포: 시나리오 종료까지]', '[랜덤 박스 보상 추첨]', '[히든 스토리가 갱신됩니다]',
    ],
  },
  {
    key: 'quest', label: '퀘스트·목표',
    pool: [
      '튜토리얼 클리어(생존)', '네임드 몬스터 단독 처치', '히든 클래스 전직 조건 달성', '연계 퀘스트의 분기 선택',
      '레이드 보스 공략', '랭킹 1위 탈환', '동료의 복수·구출', '봉인된 유물 회수', '강화 재료 파밍',
      '길드 창설·세력 규합', '배신자 색출', '안전지대 사수', '탑 다음 층 돌파', '시스템 배후의 진실 추적',
      '저주·디버프 해제 방법 탐색', '경제력으로 영지/상단 장악', '히든 피스 최초 발견', '데스게임 탈출구 모색',
      '게이트 브레이크 저지', '예언/시나리오 분기 이탈', '잃어버린 스킬북 회수', '라이벌과의 정식 결투',
      '봉인된 동료/소환수 해방', '차원문 너머 정찰', '관리자와의 거래', '최초 클리어 선점 경쟁',
      '랭킹전 우승', '히든 클래스 스승 찾기', '봉인 마법 해제', '대규모 몬스터 웨이브 방어',
      '경쟁자보다 먼저 보스 선점', '저주받은 아이템의 비밀 해명', '잠긴 스킬의 각성 조건 충족', '세력 간 동맹 협상',
      '시스템 페널티 구간 생존', '히든 엔딩 분기 달성',
    ],
  },
  {
    key: 'reward', label: '보상·획득',
    pool: [
      '유니크 등급 무기 드랍', '레전더리 방어구 세트', '히든 클래스 전직서', '성장형(진화형) 스킬', '단독 보유 패시브',
      '칭호 + 영구 버프', '레어 펫/소환수', '봉인된 고대 유물', '대량의 경험치·레벨 점프', '능력치 영구 증가 물약',
      '스킬 진화/각성 재료', '인챈트 스크롤(고확률)', '소켓·옵션이 박힌 장비', '맵 전체 공개 아이템', '부활/생환의 비약',
      '최초 클리어 보너스', '랭킹 상승·명성', '히든 피스(설정·떡밥)', '시스템 권한 일부', '고유 능력(유일무이)',
      '차원 이동 키', '봉인 해제 열쇠', '관리자의 특별 보상', '세트 완성 보너스', '저주받았지만 강력한 장비',
      '전설 등급 레시피(생산)', '경매 최고가 아이템', '히든 스탯 해금', '진명/진각성', '상위 직업 전직권',
    ],
  },
  {
    key: 'enemy', label: '적·위협',
    pool: [
      '필드 보스(네임드)', '레이드 보스(패턴형)', '적대 랭커(천재형)', '적대 길드/세력', 'PK·약탈자',
      '배신한 동료', '운영진/관리자의 개입', '또 다른 회귀자/각성자', '저주·디버프의 화신', '시스템 자체의 페널티',
      '버그/이레귤러 몬스터', '봉인에서 풀려난 마왕', '게이트 너머 침공군', '시나리오 강제력(원작 사건)', '심연의 군주',
      '같은 히든 클래스 보유자', '국가·협회의 권력', '경쟁 상단/세력', '데스게임 운영자', '관리자급 존재(도깨비)',
      '용족/고대종', '기계 군단', '언데드 웨이브', '암살 길드', '차원의 균열에서 나온 존재',
      '시스템이 보낸 시험관(보스)', '버그를 악용하는 핵 유저', '봉인 해제된 고대 신', '주인공을 노리는 현상금 사냥꾼',
      '데우스급 히든 보스', '탑을 관리하는 수호자', '주인공의 빌드를 카운터하는 라이벌',
    ],
  },
  {
    key: 'edge', label: '특별함·변수',
    pool: [
      '나만 보이는 시스템 창', '히든·유니크 클래스', '성장형/복제형 스킬', '회귀자의 미래 지식', '원작 독자의 정보',
      '버그를 합법적으로 악용', '그림자 군단(소환계)', '극단 빌드(올인 스탯)', '봉인된 잠재력 개방', '두 번째 직업/이중 클래스',
      '동료의 희생이 만든 한 수', '깔아둔 떡밥 아이템 발동', '시스템 허점 간파', '치명적 약점 카운터 빌드', '히든 스탯의 각성',
      '예언/시나리오 이탈 선택', '시스템과의 거래', '잠긴 능력의 강제 해제', '경험치 폭식 특성', '디버프를 버프로 전환',
      '최초 클리어 선점', '관리자의 비호(혹은 적의)', '진명/진각성 해방', '루팅 운(RNG) 극대화', '정보 비대칭의 활용',
      '환경/지형을 무기로 활용', '아이템 합성의 묘수', '쿨다운·자원관리의 한 수', '상태이상 면역 트릭', '소환수와의 합격기',
    ],
  },
  {
    key: 'foreshadow', label: '복선·떡밥',
    pool: [
      '시스템이 사실 누군가 만든 것', '주인공의 고유 능력에 얽힌 비밀', '관리자/도깨비의 숨은 의도', '죽은 줄 알았던 인물의 생존',
      '아이템에 깃든 고대의 인격', '튜토리얼 NPC의 진짜 정체', '예언서가 가리키는 "그 자"', '시스템 메시지의 오역/조작',
      '봉인된 또 하나의 직업', '랭킹 1위의 정체에 얽힌 진실', '세계 자체가 게임/시뮬레이션', '두 번째 회귀/루프의 흔적',
      '히든 피스가 여는 진엔딩', '동료 중 숨은 배신자', '주인공만 받는 특별 알림', '탑 꼭대기의 주인',
      '저주의 진짜 발동 조건', '잃어버린 고대 클래스의 계승자', '게이트 너머 침공의 배후', '현실↔게임을 잇는 환율의 비밀',
      '관리자도 모르는 시스템의 버그', '신/외계존재의 시선', '잊힌 첫 번째 클리어어자', '소환수에 봉인된 또 다른 존재',
      '주인공의 죽음이 만든 분기', '시나리오가 노리는 진짜 결말', '한 번 더 회귀할 수 있는 조건', '시스템의 균열에서 새어나온 진실',
      '예고된 멸망의 카운트다운', '봉인된 신물(神物)의 각성 시점',
    ],
  },
  {
    key: 'mood', label: '분위기·연출',
    pool: [
      '담담한 사무처럼 뜨는 상태창', '피와 모래가 뒤섞인 사투', '루팅 개봉의 두근거림(언박싱)', '시스템 메시지가 끊어내는 호흡',
      '카운트다운이 조이는 긴박감', '랭킹 갱신의 짜릿한 환기', '동료를 잃은 무거운 정적', '먼치킨의 압도적 무력감(상대편)',
      '치밀한 빌드·전략의 머리싸움', '데스 페널티가 깔린 서늘함', '회귀자의 정보 우위가 주는 여유', '전멸 직전의 절망과 침묵',
      '한계 돌파 각성의 폭발적 카타르시스', '딜미터·전투 로그의 박진감', '음모가 드러나는 서스펜스', '코어 루프의 중독적 리듬',
      '경매장의 욕망과 술수', '튜토리얼의 낯선 긴장', '보스룸 문 앞의 정적', '시스템 배후를 직감하는 오싹함',
      '강화 실패의 허탈함', '최초 클리어의 벅찬 성취', '안전지대 상실의 공포', '랭커들 사이의 팽팽한 견제',
      '소소한 생산·경제의 따뜻함', '차원이 개편되는 압도적 스케일', '예언이 실현되는 운명감', '관리자의 무심한 잔혹함',
      '동료애가 빛나는 합격기', '먼치킨이 처음 몰리는 위기감',
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

interface BeatState { text: string; done: boolean; power: number; reward: number; tension: number; scale: number }
interface Store {
  title: string
  unit: Unit
  total: string
  preset: string
  beats: Record<string, BeatState>
}

function emptyBeat(b: BeatDef): BeatState { return { text: '', done: false, power: b.power, reward: b.reward, tension: b.tension, scale: b.scale } }
function defaultStore(): Store {
  const beats: Record<string, BeatState> = {}
  for (const b of BEATS) beats[b.key] = emptyBeat(b)
  return { title: '', unit: 'episode', total: '', preset: 'isekai', beats }
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
      preset: PRESETS.some((x) => x.key === p.preset) ? p.preset : 'isekai',
      beats: base.beats,
    }
    const pb = p.beats && typeof p.beats === 'object' ? p.beats : {}
    for (const b of BEATS) {
      const v = pb[b.key]
      if (v && typeof v === 'object') {
        s.beats[b.key] = {
          text: typeof v.text === 'string' ? v.text : '',
          done: !!v.done,
          power: clamp(v.power, 0, 10, b.power),
          reward: clamp(v.reward, 0, 10, b.reward),
          tension: clamp(v.tension, 0, 10, b.tension),
          scale: clamp(v.scale, 0, 10, b.scale),
        }
      }
    }
    return s
  } catch { return base }
}

export default function LitrpgPlotLogic({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [openKey, setOpenKey] = useState<Record<string, boolean>>({})
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  // 비트별 발상 시드 + 잠금
  const [seeds, setSeeds] = useState<Record<string, Record<string, string>>>({})
  const [locks, setLocks] = useState<Record<string, Record<string, boolean>>>({})
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload.genre 활용 — LitRPG 외 장르로 열리면 안내(동작은 그대로)
  useEffect(() => {
    const g = payload && typeof payload.genre === 'string' ? payload.genre : ''
    if (g && g !== '게임판타지·LitRPG' && mounted.current) {
      setNote(`이 도구는 게임판타지·LitRPG 전용입니다(현재 장르: ${g}). 비트 가이드는 LitRPG 관습 기준이에요.`)
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
        beats[b.key] = { ...beats[b.key], power: ov.power ?? base.power, reward: ov.reward ?? base.reward, tension: ov.tension ?? base.tension, scale: ov.scale ?? base.scale }
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

  // ── 4개 곡선(파워 / 보상 / 긴장 / 스케일) ───────────────────
  const CW = 660, CH = 178, PADX = 30, PADY = 18
  const xAt = (i: number) => PADX + (i / (BEATS.length - 1)) * (CW - PADX * 2)
  const y10 = (v: number) => PADY + (1 - v / 10) * (CH - PADY * 2) // 0~10
  const C_POWER = '#e0a93d'  // 파워(금색) — 성장 나선의 주축
  const C_REWARD = '#3fb27f' // 보상 밀도(초록)
  const C_TENSION = '#e0533d' // 긴장도(빨강)
  const C_SCALE = 'var(--accent)' // 목표 스케일(강조색)
  type Curve = { key: keyof BeatState; color: string; label: string; dash?: string; w: number }
  const CURVES: Curve[] = [
    { key: 'power', color: C_POWER, label: '주인공 파워(수치 성장)', w: 2.8 },
    { key: 'reward', color: C_REWARD, label: '보상 밀도', dash: '2 3', w: 2 },
    { key: 'tension', color: C_TENSION, label: '긴장도(데스/페널티)', dash: '5 4', w: 1.9 },
    { key: 'scale', color: C_SCALE, label: '목표 스케일', dash: '1 4', w: 1.9 },
  ]
  const pathOf = (c: Curve) =>
    BEATS.map((b, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${y10(store.beats[b.key][c.key] as number).toFixed(1)}`).join(' ')

  // ── 페이싱 자가진단(도시에 §2·§4·§5·§9 함정) ──────────────────
  const diagnostics: { ok: boolean; msg: string }[] = (() => {
    const out: { ok: boolean; msg: string }[] = []
    // 첫 특별함: '첫 특별함 획득' 비트가 작성되어 있어야(장르 핵심 — 남들 못 가진 것)
    const edge = store.beats['unique']
    out.push({ ok: !!edge.text.trim(), msg: edge.text.trim() ? '첫 특별함(히든 클래스/유니크 스킬/단독 시스템)이 설계되어 있어요 — 장르 차별화 핵심' : '첫 특별함이 비었어요 — "남들 못 가진 것"이 없으면 LitRPG의 추진력이 약해져요(히든 클래스·유니크 스킬·단독 시스템)' })
    // 성장 나선: 파워가 단조 증가하는가(엔딩 파워 > 시작 파워, 큰 역전 없이 우상향)
    let monotone = true
    for (let i = 1; i < BEATS.length - 1; i++) { // 마지막(단위 리셋)은 예외
      if (store.beats[BEAT_KEYS[i]].power < store.beats[BEAT_KEYS[i - 1]].power) { monotone = false; break }
    }
    out.push({ ok: monotone, msg: monotone ? '파워 곡선이 우상향(성장 나선)이에요 — 매 비트 "조금 더 강해짐"의 미세 보상' : '파워가 중간에 꺾여요 — LitRPG는 단계적 강화의 나선형이 기본(절망 구간 외엔 우하향 금지)' })
    // 보상 둔감 방지: 초반(코어루프)과 중후반에 보상 봉우리가 둘 이상
    const peaks = BEATS.filter((b) => store.beats[b.key].reward >= 7).length
    out.push({ ok: peaks >= 3, msg: peaks >= 3 ? `보상 봉우리가 충분해요(${peaks}개) — 루팅·레벨업·해금의 보상 리듬` : `보상 봉우리가 적어요(${peaks}개) — 보상이 드물면 연독률이 떨어져요(첫 사이다·코어루프·클라이맥스에 분배)` })
    // 데스/긴장: 절망의 순간 긴장도가 충분히 높아야(전멸 위기)
    out.push({ ok: store.beats['allislost'].tension >= 8, msg: store.beats['allislost'].tension >= 8 ? '절망의 순간 긴장도가 충분해요 — 한 번은 진짜로 몰려야 카타르시스가 산다' : '절망 구간 긴장이 약해요 — 먼치킨이라도 전멸 위기 한 번은 필요(기존 빌드가 안 통하는 벽)' })
    // 한계 돌파 정당화: 한계 돌파 파워가 절망 파워보다 충분히 높아야(역전 변수)
    const lbDelta = store.beats['limitbreak'].power - store.beats['allislost'].power
    out.push({ ok: lbDelta >= 2, msg: lbDelta >= 2 ? `한계 돌파의 역전 폭이 충분해요(+${lbDelta}) — 깔아둔 떡밥의 발동` : `한계 돌파 역전이 약해요(+${lbDelta}) — 죽기 직전 각성/히든 변수로 분명한 역전을(단, 데우스엑스마키나 금지·복선 필수)` })
    // 사이다 정산: 클라이맥스 보상이 첫 사이다보다 커야(인과적 정산)
    out.push({ ok: store.beats['bossclear'].reward >= store.beats['firstcida'].reward, msg: store.beats['bossclear'].reward >= store.beats['firstcida'].reward ? '클라이맥스 보상이 첫 사이다 이상이에요 — 채권을 크게 정산' : '클라이맥스 보상이 첫 사이다보다 약해요 — 깔아둔 고생만큼 크게 갚아야 만족도가 올라요' })
    // 스케일업 + 인플레 관리: 엔딩 스케일이 충분히 커야(우주적 음모/단위 리셋)
    out.push({ ok: store.beats['beyond'].scale >= 8, msg: store.beats['beyond'].scale >= 8 ? '목표 스케일이 개인→세계/시스템 배후로 점프해요 — 파워 인플레를 스케일·질적 보상으로 보완' : '엔딩 스케일이 작아요 — "왜 시스템이 존재하나"의 떡밥/단위 리셋으로 격을 올려 인플레 둔감화를 막으세요' })
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
    L.push(`[LitRPG 플롯 로직]${store.title ? ` ${store.title}` : ''}`)
    L.push(`분기: ${preset.name} — ${preset.desc}`)
    if (totalNum > 0) L.push(`총 분량: ${totalDigits} ${UNIT_LABEL[store.unit]}`)
    L.push(`진행률: ${doneCount}/${BEATS.length} (${pct}%) · 페이싱 점검 ${diagOk}/${diagnostics.length}`)
    L.push('')
    for (const b of BEATS) {
      const st = store.beats[b.key]
      L.push(`${st.done ? '[v]' : '[ ]'} ${b.title} 〈${fmtPos(b.pos)}〉`)
      L.push(`   곡선: 파워 ${st.power}/10 · 보상 ${st.reward}/10 · 긴장 ${st.tension}/10 · 스케일 ${st.scale}/10`)
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
    parts.push(`<p><strong>분기:</strong> ${esc(preset.name)} — ${esc(preset.desc)}</p>`)
    parts.push(`<p><strong>진행률:</strong> ${doneCount}/${BEATS.length} (${pct}%) · <strong>페이싱 점검:</strong> ${diagOk}/${diagnostics.length}</p>`)
    for (const b of BEATS) {
      const st = store.beats[b.key]
      parts.push(`<h3>${esc(b.title)} <span>〈${esc(fmtPos(b.pos))}〉</span></h3>`)
      parts.push(`<p><em>곡선: 파워 ${st.power}/10 · 보상 ${st.reward}/10 · 긴장 ${st.tension}/10 · 스케일 ${st.scale}/10</em></p>`)
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
      title: store.title.trim() ? `LitRPG 플롯 — ${store.title.trim()}` : 'LitRPG 플롯 로직',
      bodyHtml: buildBodyHtml(),
      meta: {
        장르: '게임판타지·LitRPG',
        분기: preset.name,
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
    addToLibrary('snippets', { text, source: `LitRPG 플롯 로직${store.title ? ` · ${store.title}` : ''}`, tags: ['게임판타지·LitRPG', '플롯', '구조', preset.name] })
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
  const card = (done: boolean): React.CSSProperties => ({ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', borderLeft: `4px solid ${done ? 'var(--ok)' : C_POWER}`, overflow: 'hidden' })
  const cHead: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px' }
  const cTitle: React.CSSProperties = { fontSize: 14, fontWeight: 700, lineHeight: 1.35 }
  const posLine: React.CSSProperties = { fontSize: 11.5, color: C_POWER, marginTop: 3, fontWeight: 600 }
  const chk: React.CSSProperties = { flexShrink: 0, width: 18, height: 18, marginTop: 1, cursor: 'pointer', accentColor: 'var(--ok)' }
  const ta: React.CSSProperties = { width: '100%', minHeight: 64, resize: 'vertical', padding: '8px 10px', fontSize: 13.5, lineHeight: 1.5, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const section: React.CSSProperties = { padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 9 }
  const subLabel: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }
  const funcBox: React.CSSProperties = { fontSize: 12.5, color: 'var(--text)', lineHeight: 1.55, background: 'var(--chrome-2)', borderRadius: 8, padding: '7px 9px' }
  const presetNote: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.55, background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }
  const sliderRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 }
  const foot: React.CSSProperties = { borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--chrome-2)' }
  const exTag: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 7, padding: '3px 8px' }
  const seedChip = (locked: boolean): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, padding: '3px 7px', borderRadius: 7, cursor: 'pointer', border: `1px solid ${locked ? C_POWER : 'var(--border)'}`, background: locked ? 'color-mix(in srgb, ' + C_POWER + ' 16%, transparent)' : 'var(--chrome-2)' })

  const RELATED: { id: string; label: string }[] = [
    { id: 'litrpg-tropes', label: '🏷️ LitRPG 트로프' },
    { id: 'litrpg-devices', label: '⚙️ 시스템 장치' },
    { id: 'litrpg-signature', label: '🎲 시스템·퀘스트 생성기' },
    { id: 'litrpg-synopsis', label: '📝 LitRPG 시놉시스' },
    { id: 'litrpg-outline', label: '🗂️ LitRPG 개요' },
    { id: 'litrpg-eventforge', label: '⚔️ 사건 생성기' },
    { id: 'litrpg-sceneforge', label: '🎬 장면 생성기' },
  ]

  // 슬라이더 정의(비트 카드 내부)
  const SLIDERS: { key: keyof BeatState; label: string; color: string; loTxt: string; hiTxt: string }[] = [
    { key: 'power', label: '파워(성장)', color: C_POWER, loTxt: '쪼렙', hiTxt: '먼치킨' },
    { key: 'reward', label: '보상 밀도', color: C_REWARD, loTxt: '없음', hiTxt: '폭발' },
    { key: 'tension', label: '긴장도', color: C_TENSION, loTxt: '안전', hiTxt: '전멸' },
    { key: 'scale', label: '목표 스케일', color: C_SCALE, loTxt: '개인', hiTxt: '우주' },
  ]

  return (
    <div style={wrap}>
      <div style={head}>
        <div style={row}>
          <span style={{ fontSize: 18 }}><Emoji e="📈" /></span>
          <input style={{ ...input, flex: '2 1 170px' }} value={store.title} onChange={(e) => setMeta({ title: e.target.value })} placeholder="작품 제목 (선택)" maxLength={120} aria-label="작품 제목" />
          <input style={{ ...input, flex: '0 1 90px', width: 90 }} value={store.total} onChange={(e) => setMeta({ total: e.target.value.replace(/[^\d.]/g, '') })} placeholder="총 분량" inputMode="decimal" aria-label="총 분량" />
          <select style={select} value={store.unit} onChange={(e) => setMeta({ unit: e.target.value as Unit })} aria-label="분량 단위">
            <option value="episode">회차</option>
            <option value="won고">원고지(매)</option>
            <option value="page">페이지</option>
          </select>
        </div>
        <div style={row}>
          <label style={{ ...subLabel, alignSelf: 'center' }}>분기</label>
          <select style={{ ...select, flex: '1 1 200px' }} value={store.preset} onChange={(e) => applyPreset(e.target.value)} aria-label="4분기 프리셋">
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
        {/* ── 4개 곡선: 파워 · 보상 · 긴장 · 스케일 ── */}
        <div style={panel}>
          <div style={sectionTitle}>4개 곡선 · 억울한 일상→시스템 배후 (성장 나선 + 보상·긴장·스케일)</div>
          <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" style={{ display: 'block', maxHeight: 196 }} role="img" aria-label="LitRPG 진행 곡선">
            {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
              const y = PADY + g * (CH - PADY * 2)
              return <line key={i} x1={PADX} y1={y} x2={CW - PADX} y2={y} stroke="var(--border)" strokeWidth={1} strokeDasharray="2 4" opacity={0.55} />
            })}
            {CURVES.map((c) => (
              <path key={c.key as string} d={pathOf(c)} fill="none" stroke={c.color} strokeWidth={c.w} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={c.dash} opacity={0.9} />
            ))}
            {/* 파워 곡선 점(주축) */}
            {BEATS.map((b, i) => (
              <circle key={'c' + i} cx={xAt(i)} cy={y10(store.beats[b.key].power)} r={3.4} fill={C_POWER} stroke="var(--paper)" strokeWidth={1.4}>
                <title>{`${b.title} · 파워 ${store.beats[b.key].power}/10`}</title>
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
          <div style={{ ...hint, fontSize: 11.5, marginTop: 4 }}>파워는 절망 구간(10번)을 빼면 우상향(성장 나선)으로. 긴장은 절망에서 정점, 보상은 첫 사이다·클라이맥스에 봉우리, 스케일은 개인→세계로 점프.</div>
        </div>

        {/* ── 페이싱 자가진단 ── */}
        <div style={panel}>
          <div style={sectionTitle}>페이싱 자가진단 · {diagOk}/{diagnostics.length} 충족 (도시에 함정 기반)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {diagnostics.map((d, i) => (
              <div key={i} style={{ fontSize: 12.5, lineHeight: 1.5, color: d.ok ? 'var(--text)' : 'var(--warn)' }}>
                <span style={{ marginRight: 6 }}><Emoji e={d.ok ? '✅' : '⚠️'} /></span>{d.msg}
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
                  <div style={posLine}>권장: {fmtPos(b.pos)} · 파워 {st.power} · 보상 {st.reward} · 긴장 {st.tension} · 스케일 {st.scale}</div>
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
                  <textarea style={ta} value={st.text} onChange={(e) => patchBeat(b.key, { text: e.target.value })} placeholder="장면·사건·시스템 메시지·드랍·레벨업·다음 목표를 자유롭게…" />

                  {/* 4개 슬라이더 */}
                  {SLIDERS.map((sl) => (
                    <div key={sl.key as string} style={sliderRow}>
                      <span style={{ ...subLabel, width: 70, flexShrink: 0 }}>{sl.label}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--muted)', width: 34, flexShrink: 0, textAlign: 'right' }}>{sl.loTxt}</span>
                      <input type="range" min={0} max={10} value={st[sl.key] as number} onChange={(e) => patchBeat(b.key, { [sl.key]: Number(e.target.value) } as Partial<BeatState>)} style={{ flex: 1, accentColor: sl.color }} aria-label={`${b.title} ${sl.label}`} />
                      <span style={{ fontSize: 10.5, color: 'var(--muted)', width: 36, flexShrink: 0 }}>{sl.hiTxt}</span>
                      <strong style={{ fontSize: 13, width: 30, textAlign: 'right', color: sl.color }}>{st[sl.key] as number}</strong>
                    </div>
                  ))}

                  {/* 발상 시드(슬롯 풀 무작위, 잠금/재생성) */}
                  <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 9, marginTop: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}>
                      <span style={{ ...subLabel, color: C_POWER }}><Emoji e="💡" /> 비트 발상 시드</span>
                      <button className="minibtn" onClick={() => rollSeed(b.key)} title="슬롯 풀에서 무작위 조합(잠금은 유지)">{seed ? <><Emoji e="🎲" /> 다시 굴리기</> : <><Emoji e="🎲" /> 굴리기</>}</button>
                      {seed && <button className="minibtn" onClick={() => seedToText(b.key)} title="시드를 위 내용에 추가">⬆️ 내용에 넣기</button>}
                      <span style={{ ...hint, fontSize: 11, marginLeft: 'auto' }}>조합수 {fmtBig(SEED_TOTAL)}가지</span>
                    </div>
                    {seed ? (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {SEED_AXES.map((a) => (
                          <span key={a.key} style={seedChip(!!lk[a.key])} onClick={() => toggleSeedLock(b.key, a.key)} title={lk[a.key] ? '잠금 해제(다음 굴리기에 바뀜)' : '잠금(다음 굴리기에 고정)'}>
                            <span style={{ opacity: 0.7 }}><Emoji e={lk[a.key] ? '🔒' : '🔓'} /></span>
                            <span style={{ color: 'var(--muted)' }}>{a.label}:</span>
                            <strong>{seed[a.key]}</strong>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ ...hint, fontSize: 11.5 }}>막힌 비트라면 굴려서 무대·시스템 이벤트·퀘스트·보상·적·특별함을 무작위로 받아보세요. 칩을 눌러 잠그면 그 축만 고정됩니다.</div>
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
            <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: '게임판타지·LitRPG' })} title={`${r.label} 열기`}>{emojify(r.label)}</button>
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
