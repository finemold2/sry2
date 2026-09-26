// 액션·전쟁 플롯·진행곡선(로직) 템플릿 — 이 장르의 표준 구조·비트·페이싱을 "단계 입력 시트"로 설계하는 도구.
//  · 톤 프리셋(반전·환멸 / 영웅·카타르시스 / 전략·정치 / 무협·초식 / 헌터·각성)에 따라 단계 라벨·힌트·체크리스트가 바뀐다.
//  · 각 단계는 [입력칸 + 체크리스트(클리셰·관습 점검) + 페이싱 강도 슬라이더 + 메모]로 구성. 진행률·강도 곡선(긴장 그래프)을 표시.
//  · 페이싱 안티패턴(평탄화·호흡 부재·인포덤프) 자동 경고. 모든 데이터 localStorage 영속.
//  · 연계: 프로젝트 자료(구조)에 문서 추가, 관련 도구(장면 생성기·플롯 피라미드 등) 열기.
// react 와 './linkbus' 외 import 없음. 전부 로컬(외부 API 미사용). UI 한국어.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'action-plotlogic',
  name: '액션·전쟁 플롯·진행곡선',
  icon: '💥',
  group: '플롯',
  genre: '액션·전쟁',
  intro: '액션·전쟁 장르의 표준 구조·비트·페이싱을 톤 프리셋별 단계 시트로 설계하고, 긴장 곡선·클리셰 점검·진행률까지 관리하세요',
  w: 680,
  h: 720,
}

const LS_KEY = 'sry:tool:action-plotlogic'

// ───────────────────────────── 타입 ─────────────────────────────
type ToneKey = 'cathartic' | 'disillusion' | 'strategy' | 'martial' | 'awaken'

interface StageDef {
  key: string                 // 단계 고유 키
  title: string               // 단계명(한국어)
  phase: '도입' | '상승' | '위기' | '클라이맥스' | '여파'  // 거시 구간
  emoji: string
  hint: string                // 작성 힌트(도시에 근거)
  target: number              // 권장 페이싱 강도(0~100) — 곡선의 이상선
  checks: string[]            // 이 단계에서 점검할 관습/체크리스트
  beats?: string[]            // 미시 비트 예시(선택)
}

interface ToneDef {
  key: ToneKey
  name: string
  emoji: string
  blurb: string               // 톤 설명
  axis: string                // 개인무력↔집단전략 / 카타르시스↔비극 위치
  stages: StageDef[]
}

interface StageState {
  text: string
  note: string
  done: boolean
  intensity: number           // 사용자가 설계한 실제 페이싱 강도(0~100)
  ticks: Record<number, boolean> // 체크리스트 인덱스별 체크 여부
}
type StageStore = Record<string, StageState>
interface Store {
  tone: ToneKey
  title: string
  byTone: Record<string, StageStore>  // 톤별로 입력 보존
}

// ───────────────────────────── 데이터(도시에 근거) ─────────────────────────────
// 공통 체크리스트 후보(도시에의 "독자 기대·서사 장치"에서 추출) — 단계별로 골라 배치.
const CHK = {
  geography: '공간 지리(geography of action): 누가 어디 있고 출구·엄폐물·고지·거리·시간제한이 머릿속 지도로 그려지는가',
  stakes: '이해관계(stakes) 사전 설치: 무엇을/누구를 잃을 수 있는지 싸움 전에 명시했는가',
  rules: '능력의 규칙·자원(탄약·체력·내공·마나)이 일관되게 작동하는가 (데우스 엑스 마키나 금지)',
  cost: '물리적 대가: 부상·피로·트라우마·탄약 소모로 무게를 얻었는가 (무손상 승리 반복 경계)',
  ticking: '시계 장치(ticking clock): 타이머·증원·만조·일출 등 카운트다운이 작동하는가',
  chekhov: '체호프의 무기/환경: 앞서 보인 환경 요소(밸브·절벽·강물·지뢰밭)를 회수했는가',
  signature: '시그니처 무브/무기: 인물 정체성을 압축한 반복 기술을 심거나 변주했는가',
  setpiece: '세트피스 설계: 고유한 장소·제약·목표·합병증을 가졌고 앞 것보다 규모/위험이 큰가',
  earned: '승부의 정당성: 머리·준비·희생·약점공략으로 이겼는가 (운빨·우연 승리 금지)',
  sensory: '감각의 핍진성: 소리(총성·금속음)·냄새(화약·피)·신체감각(반동·심박·통증)을 새겼는가',
  injury: '부상 시계: 출혈·골절이 시간제한으로 작동해 카운트다운을 더하는가',
  breath: '들숨-날숨: 액션 폭발 뒤 짧은 호흡(부상 점검·농담·다음 계획)을 두었는가',
  ladder: '능력 격차 사다리: 약한 지점→약점/도구/희생/각성으로 역전하는 과정을 깔았는가',
  outnumber: '수적 열세/최후의 저항(last stand): 약자 응원 심리를 동원했는가',
  // 전쟁/전략 전용
  why: '왜 싸우는가에 대한 입장(애국/환멸/생존)을 인물의 시점으로 보여줬는가',
  logistics: '병참·정보의 비대칭: 보급선·첩보·기만(거짓 무전·위장)이 승패를 가르는가',
  povcross: '명령 시점 교차: 지휘부(전략)↔현장 병사(전술/생존)의 비용을 동시에 보여줬는가',
  weight: '무게의 물건: 병사가 지고 다니는 편지·부적·시신·죄책감으로 추상을 구체화했는가',
  rearguard: '희생적 후위: 동료가 남아 막고 주인공을 보내는 감정 정점을 설계했는가',
  pyrrhic: '대가 있는 승리(Pyrrhic): 이기되 동료·신념·고향·자기 일부를 영구히 잃는가',
  // 무협/헌터 전용
  cultivate: '누적된 수련/복선의 결실: 비기(秘技) 완성·신경지 돌파가 갑툭튀가 아닌가',
  parry: '초식 파훼/약점 공략: 상대 절기의 허점을 머리로 깨뜨렸는가',
  inflation: '무력 인플레 관리: 서열전·비무가 평탄하지 않게 새 변수를 더했는가',
  awakenRule: '각성/스킬의 규칙: 쿨타임·버프/디버프·약점이 규칙으로 작동하는가',
  cliffhang: '회차 페이싱: 회 끝 = 절정 직전 또는 반전 직후 클리프행어, 회당 사이다 1회 이상',
}

// 톤별 단계 시트 — 도시에 "전개·구조 패턴"의 거시 구조에서 각 곡선을 재구성.
const TONES: ToneDef[] = [
  {
    key: 'cathartic',
    name: '영웅·카타르시스',
    emoji: '🦸',
    blurb: '개인/소규모의 신체적 우월성·기교를 과시하며 "위기-탈출" 펄스를 반복하는 액션 영웅 곡선. 점층되는 세트피스로 카타르시스에 도달.',
    axis: '개인 무력 우세 · 카타르시스 지향',
    stages: [
      { key: 'cold', title: '콜드 오픈 — 능력 입증', phase: '도입', emoji: '⚡', target: 55,
        hint: '소규모 액션으로 주인공의 강함·시그니처 무브·약점의 윤곽을 즉시 보여준다. 본 줄거리와 무관해도 좋다. 첫 비트부터 영상적 리듬.',
        checks: [CHK.signature, CHK.geography, CHK.sensory, CHK.rules],
        beats: ['결정적 3~5비트만 슬로우, 나머지는 요약', '단문·동사 중심·행 바꿈 잦게'] },
      { key: 'mission', title: '임무/위협 제시', phase: '도입', emoji: '🎯', target: 35,
        hint: '한 단계 위 빌런·임무가 등장. 무엇을/누구를 잃을 수 있는지(이해관계)를 명확히 설치한다. 능력 격차를 독자가 체감.',
        checks: [CHK.stakes, CHK.ladder, CHK.ticking] },
      { key: 'gearup', title: '준비·무장 점검(gear-up)', phase: '상승', emoji: '🎒', target: 30,
        hint: '작전 브리핑·규칙 정하기·로드아웃. 전투 전 긴장을 적재하고 능력/자원을 사전 공개한다. 거짓 안전지대도 여기서.',
        checks: [CHK.rules, CHK.chekhov, CHK.breath] },
      { key: 'set1', title: '1차 세트피스(작은 충돌)', phase: '상승', emoji: '💥', target: 65,
        hint: '독립적으로 설계된 첫 대형 액션 단위. 고유한 장소·제약·목표·합병증. 작은 위기-해소(사이다)를 한 번 안긴다.',
        checks: [CHK.setpiece, CHK.geography, CHK.cost, CHK.chekhov, CHK.earned] },
      { key: 'breath', title: '호흡 — 들숨/날숨', phase: '상승', emoji: '😮‍💨', target: 25,
        hint: '부상 점검·한 마디 농담·다음 계획. 쉼 없는 액션은 둔감화된다. 만연체 허용 구간. 관계·정보가 깊어진다.',
        checks: [CHK.breath, CHK.cost, CHK.injury] },
      { key: 'set2', title: '2차 세트피스(중간 보스)', phase: '상승', emoji: '🔥', target: 78,
        hint: '앞보다 규모·위험이 커진 세트피스. 거리의 변주(원거리→근접)로 잔혹도/친밀도 상승. 새 변수로 평탄화 방지.',
        checks: [CHK.setpiece, CHK.signature, CHK.cost, CHK.ticking, CHK.sensory] },
      { key: 'lowpoint', title: '중간 패배 — 최저점', phase: '위기', emoji: '🩸', target: 88,
        hint: '주인공 무력화·부상·아군 이탈. 시그니처 무기가 봉인되거나 부서진다. "잃을 것이 명확해지는" 지점.',
        checks: [CHK.cost, CHK.injury, CHK.stakes, CHK.outnumber] },
      { key: 'counter', title: '약점/희생을 통한 반격', phase: '클라이맥스', emoji: '🗡️', target: 70,
        hint: '데우스 엑스 마키나 금지. 1~2막에 깔린 적의 약점·환경·동료의 선물·시그니처 변주를 회수해 다시 일어선다.',
        checks: [CHK.earned, CHK.chekhov, CHK.ladder, CHK.signature] },
      { key: 'finale', title: '클라이맥스 세트피스', phase: '클라이맥스', emoji: '🌋', target: 100,
        hint: '규모는 가장 크되 초점은 가장 좁게(개인 대 개인). 설치한 시계가 00:01에 멎는다. 복선 동시 발화.',
        checks: [CHK.setpiece, CHK.ticking, CHK.earned, CHK.chekhov, CHK.signature] },
      { key: 'after', title: '여파(aftermath) 정산', phase: '여파', emoji: '🌅', target: 18,
        hint: '짧은 여파 — 부상 수습, 빌런 최후, 세계 변화 확인. 너무 길면 늘어지고 없으면 공허. 다음 위협의 씨앗.',
        checks: [CHK.cost, CHK.breath] },
    ],
  },
  {
    key: 'disillusion',
    name: '반전·환멸',
    emoji: '🕯️',
    blurb: '집단·소모·체제를 다루며 개인 무력보다 "대가와 의미"를 묻는 전쟁 곡선. 순진함→세례→상실→의미 묻기(비장).',
    axis: '집단 전략 우세 · 비극 지향',
    stages: [
      { key: 'mobilize', title: '동원/입대 — 순진함', phase: '도입', emoji: '🪖', target: 30,
        hint: '입대·동원의 들뜸과 명분(애국/생존). 곧 무너질 환상을 정성껏 쌓는다. 병사가 무엇을 지고 다니는지(무게의 물건) 깔기.',
        checks: [CHK.why, CHK.weight, CHK.povcross] },
      { key: 'firstblood', title: '첫 전투 — 환멸·세례', phase: '상승', emoji: '🔥', target: 75,
        hint: '레마르크식 참호·환멸의 원형. 영광의 환상이 화약 냄새·피비린내·시신 앞에서 깨진다. 감각의 핍진성 최대.',
        checks: [CHK.sensory, CHK.cost, CHK.geography, CHK.stakes] },
      { key: 'attrition', title: '소모·전우애', phase: '상승', emoji: '🤝', target: 40,
        hint: '후방·휴식·전우애가 형성되는 구간(들숨). 죽음의 일상화, 농담과 의식(ritual). 거짓 안전지대를 깐다.',
        checks: [CHK.breath, CHK.weight, CHK.povcross] },
      { key: 'operation', title: '대규모 작전 — 전략적 정점', phase: '위기', emoji: '🗺️', target: 85,
        hint: '명령 시점 교차(지휘부↔병사). 병참·정보·기만이 승패를 가른다. 한 인물의 분투가 전선의 분기점이 되도록 미시-거시 동조.',
        checks: [CHK.logistics, CHK.povcross, CHK.geography, CHK.setpiece] },
      { key: 'loss', title: '파국/상실', phase: '클라이맥스', emoji: '⚰️', target: 95,
        hint: '희생적 후위 — 동료가 남아 막고 보낸다. 가장 가까운 것을 잃는 최저점. 무게의 물건이 시신·유품으로 회수된다.',
        checks: [CHK.rearguard, CHK.cost, CHK.weight, CHK.outnumber] },
      { key: 'meaning', title: '생존자의 의미 묻기', phase: '여파', emoji: '🕊️', target: 25,
        hint: '대가 있는 승리(Pyrrhic) 또는 비장한 패배. 이기되 신념·고향·자기 일부를 영구히 잃는다. "왜 싸웠는가"에 답하거나 답을 거부.',
        checks: [CHK.pyrrhic, CHK.why, CHK.weight] },
    ],
  },
  {
    key: 'strategy',
    name: '전략·정치',
    emoji: '♟️',
    blurb: '함대전·병법·정치가 얽힌 머리 싸움. 은하영웅전설·킹덤·유녀전기 계열. 정보 비대칭과 기만이 핵심 무기.',
    axis: '집단 전략 우세 · 카타르시스↔비극 중립',
    stages: [
      { key: 'board', title: '판 깔기 — 세력·명분', phase: '도입', emoji: '🏛️', target: 30,
        hint: '세력 구도·계급·명령체계·대의를 제시. 각 진영의 목표와 약점을 독자에게 카드로 보여준다(체호프의 배치).',
        checks: [CHK.why, CHK.chekhov, CHK.geography] },
      { key: 'intel', title: '정보·첩보·기만 설계', phase: '상승', emoji: '🕵️', target: 45,
        hint: '병참·정보의 비대칭이 승패를 가른다. 거짓 무전·위장·이중첩자. 독자에게 어떤 패를 숨길지(서술 트릭) 결정.',
        checks: [CHK.logistics, CHK.rules, CHK.povcross] },
      { key: 'skirmish', title: '국지전 — 가설 검증', phase: '상승', emoji: '⚔️', target: 60,
        hint: '소규모 교전으로 적장의 성향·전술을 떠본다. 양동·각개격파·측면 우회 중 하나를 시험. 작은 승리 또는 의도된 패배.',
        checks: [CHK.setpiece, CHK.earned, CHK.geography] },
      { key: 'reversal', title: '판세 역전 — 중간점', phase: '위기', emoji: '🔄', target: 72,
        hint: '거짓 승리/거짓 패배로 판이 뒤집힌다. 숨겨둔 정보가 부분 공개. 양 진영의 자원·사기·시간이 재계산된다.',
        checks: [CHK.logistics, CHK.ladder, CHK.ticking] },
      { key: 'grand', title: '결전 — 대회전', phase: '클라이맥스', emoji: '🌩️', target: 95,
        hint: '포위 섬멸·종심 방어·거점 사수가 충돌. 기만의 회수: 깔아둔 정보 비대칭이 결정타로 발화. 시계가 마지막에 멎는다.',
        checks: [CHK.logistics, CHK.chekhov, CHK.earned, CHK.ticking, CHK.setpiece] },
      { key: 'betray', title: '진짜 적의 폭로(선택)', phase: '클라이맥스', emoji: '🐍', target: 80,
        hint: '반전 클라이맥스: 진짜 적은 외부가 아니라 아군 지휘부·체제였다는 폭로형 절정. 앞서 깐 단서들이 재해석된다.',
        checks: [CHK.chekhov, CHK.earned, CHK.povcross] },
      { key: 'settle', title: '정산 — 새 질서', phase: '여파', emoji: '👑', target: 22,
        hint: '승전의 대가·정치적 후폭풍·다음 불씨. 전사자 호명, 세력도 변화. 대가 있는 승리로 여운을 남긴다.',
        checks: [CHK.pyrrhic, CHK.why, CHK.breath] },
    ],
  },
  {
    key: 'martial',
    name: '무협·초식',
    emoji: '🥋',
    blurb: '내공·초식·비무·문파전의 토착 액션. 약함→기연→서열전 반복(무력 인플레)→문파전→천하 최종전. 사이다/고구마 회로.',
    axis: '개인 무력 우세 · 카타르시스 지향',
    stages: [
      { key: 'weak', title: '약함 — 출발점', phase: '도입', emoji: '🌱', target: 35,
        hint: '주인공이 명백히 약한 지점. 멸시·설움(고구마)을 깔고, 시그니처가 될 무공의 떡밥과 약점을 함께 심는다.',
        checks: [CHK.ladder, CHK.stakes, CHK.cliffhang] },
      { key: 'fortune', title: '기연/각성 — 심법 입수', phase: '상승', emoji: '✨', target: 50,
        hint: '비급·영약·기인과의 인연. 단, 누적될 수련·복선의 결실로 설계(갑툭튀 금지). 운기·심법의 규칙을 정한다.',
        checks: [CHK.cultivate, CHK.rules, CHK.signature] },
      { key: 'rank', title: '비무·서열전 반복', phase: '상승', emoji: '🏯', target: 62,
        hint: '한 단계씩 위를 꺾으며 무력 인플레. 평탄화를 막으려 매 비무에 새 변수(독·진법·심리·약속의 제약)를 더한다. 회당 사이다.',
        checks: [CHK.inflation, CHK.parry, CHK.signature, CHK.cliffhang] },
      { key: 'clan', title: '문파전/혈겁 — 위기', phase: '위기', emoji: '🔥', target: 80,
        hint: '정파/사파·문파의 충돌로 판이 커진다. 주화입마·동료의 죽음 등 큰 대가. 시그니처 절기가 봉인되거나 한계에 부딪힌다.',
        checks: [CHK.cost, CHK.outnumber, CHK.rearguard, CHK.injury] },
      { key: 'breakthrough', title: '신경지 돌파 — 비기 완성', phase: '클라이맥스', emoji: '🐉', target: 90,
        hint: '최저점 직후, 깨달음으로 절정 무공을 완성한다. 적 절기의 허점을 머리로 파훼. 수련·복선이 동시 발화하는 결실.',
        checks: [CHK.cultivate, CHK.parry, CHK.earned, CHK.signature] },
      { key: 'apex', title: '천하 최종 비무', phase: '클라이맥스', emoji: '🌪️', target: 100,
        hint: '최강과의 1대1. 규모는 최대, 초점은 개인 대 개인의 의미로 수렴. 시그니처의 변주/극복. 카타르시스 정점.',
        checks: [CHK.earned, CHK.signature, CHK.chekhov, CHK.sensory] },
      { key: 'tianxia', title: '천하 정리 — 여파', phase: '여파', emoji: '🏔️', target: 20,
        hint: '강호의 새 질서·은원 정산·떠남. 짧고 여운 있게. 대가(잃은 동료·바뀐 자신)를 확인한다.',
        checks: [CHK.pyrrhic, CHK.breath] },
    ],
  },
  {
    key: 'awaken',
    name: '헌터·각성',
    emoji: '🩸',
    blurb: '각성·스킬·레이드·길드전의 현대 액션. 전지적 독자·나 혼자만 레벨업 계열. 회차 클리프행어와 사이다가 전투 설계를 지배.',
    axis: '개인 무력 우세 · 카타르시스 지향',
    stages: [
      { key: 'awaken', title: '각성 — 약자의 스킬', phase: '도입', emoji: '🌀', target: 45,
        hint: '최약체로 시작해 남다른 각성/스킬을 얻는다. 쿨타임·버프/디버프·약점 등 규칙을 즉시 못박는다. 첫 사이다.',
        checks: [CHK.awakenRule, CHK.ladder, CHK.cliffhang] },
      { key: 'lowraid', title: '저층 레이드 — 능력 검증', phase: '상승', emoji: '🚪', target: 60,
        hint: '게이트/던전에서 스킬을 시험. 탱커·딜러·힐러 역할 분담, 자원(MP·포션·쿨)의 규칙적 소모로 긴장.',
        checks: [CHK.awakenRule, CHK.geography, CHK.cost, CHK.setpiece] },
      { key: 'boss', title: '필드 보스 — 패턴 공략', phase: '상승', emoji: '👹', target: 74,
        hint: '보스의 패턴·약점을 머리로 공략(운빨 금지). 앞보다 규모 큰 세트피스. 회 끝 클리프행어를 절정 직전에 건다.',
        checks: [CHK.earned, CHK.setpiece, CHK.ticking, CHK.cliffhang] },
      { key: 'guild', title: '길드전/PvP — 정치', phase: '위기', emoji: '⚔️', target: 82,
        hint: '인간 적(길드·헌터)과의 충돌, 배신·정보전. 동료의 위기·자원 고갈로 최저점에 접근. 시그니처 봉인.',
        checks: [CHK.outnumber, CHK.cost, CHK.logistics, CHK.rearguard] },
      { key: 'rebirth', title: '한계 돌파 — 폼 해방', phase: '클라이맥스', emoji: '🔱', target: 92,
        hint: '최저점 직후 각성 폼/히든 스킬 해방. 단, 누적 성장·복선의 결실이어야 함. 마지막 한 발/마지막 힘.',
        checks: [CHK.cultivate, CHK.awakenRule, CHK.earned, CHK.signature] },
      { key: 'worldend', title: '세계 위협 최종전', phase: '클라이맥스', emoji: '🌍', target: 100,
        hint: '세계급 위협과의 결전. 규모 최대·초점은 개인의 선택으로 수렴. 설치한 카운트다운이 00:01에 멎는다.',
        checks: [CHK.setpiece, CHK.ticking, CHK.chekhov, CHK.earned] },
      { key: 'aftermath', title: '정산 — 다음 시즌', phase: '여파', emoji: '🌌', target: 22,
        hint: '랭킹 변동·동료 수습·더 큰 위협 예고. 짧은 여파 + 다음 회차의 더 큰 위협으로 분절(연재 페이싱).',
        checks: [CHK.pyrrhic, CHK.breath, CHK.cliffhang] },
    ],
  },
]

const TONE_MAP: Record<ToneKey, ToneDef> = Object.fromEntries(TONES.map((t) => [t.key, t])) as Record<ToneKey, ToneDef>

const PHASE_COLOR: Record<StageDef['phase'], string> = {
  도입: 'var(--muted)', 상승: 'var(--accent)', 위기: 'var(--warn)', 클라이맥스: '#e0497b', 여파: 'var(--ok)',
}

// ───────────────────────────── 저장/복원 ─────────────────────────────
function emptyStageStore(tone: ToneDef): StageStore {
  const o: StageStore = {}
  for (const s of tone.stages) o[s.key] = { text: '', note: '', done: false, intensity: s.target, ticks: {} }
  return o
}
function defaultStore(): Store {
  const byTone: Record<string, StageStore> = {}
  for (const t of TONES) byTone[t.key] = emptyStageStore(t)
  return { tone: 'cathartic', title: '', byTone }
}
function loadStore(): Store {
  const base = defaultStore()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return base
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return base
    if (p.tone && TONE_MAP[p.tone as ToneKey]) base.tone = p.tone
    if (typeof p.title === 'string') base.title = p.title
    const pb = p.byTone && typeof p.byTone === 'object' ? p.byTone : {}
    for (const t of TONES) {
      const src = pb[t.key]
      if (!src || typeof src !== 'object') continue
      for (const s of t.stages) {
        const v = src[s.key]
        if (v && typeof v === 'object') {
          const ticks: Record<number, boolean> = {}
          if (v.ticks && typeof v.ticks === 'object') {
            for (let i = 0; i < s.checks.length; i++) if (v.ticks[i]) ticks[i] = true
          }
          const inten = typeof v.intensity === 'number' && isFinite(v.intensity)
            ? Math.max(0, Math.min(100, Math.round(v.intensity))) : s.target
          base.byTone[t.key][s.key] = {
            text: typeof v.text === 'string' ? v.text : '',
            note: typeof v.note === 'string' ? v.note : '',
            done: !!v.done, intensity: inten, ticks,
          }
        }
      }
    }
    return base
  } catch { return base }
}

// 조합수: 각 단계의 상태 자유도를 곱해 "설계 가능한 진행 형태의 수"를 보여준다.
//  단계당: 강도 구간(101) × 작성 여부(2) × 완료 여부(2) × 체크리스트 부분집합(2^checks)
//  → 톤 전체 단계를 곱하면 천문학적(액션 핵심 생성기 기준 1조+ 초과).
function comboCount(tone: ToneDef): number {
  let log10 = 0
  for (const s of tone.stages) {
    const per = 101 * 2 * 2 * Math.pow(2, s.checks.length)
    log10 += Math.log10(per)
  }
  return log10 // log10(전체 조합수) 반환
}
function fmtCombo(log10: number): string {
  // 한국어 단위(만/억/조/경/해)로 근사 표기.
  const units = [
    { e: 20, n: '해' }, { e: 16, n: '경' }, { e: 12, n: '조' }, { e: 8, n: '억' }, { e: 4, n: '만' },
  ]
  for (const u of units) {
    if (log10 >= u.e) {
      const mant = Math.pow(10, log10 - u.e)
      const head = mant >= 100 ? Math.round(mant).toLocaleString() : mant.toFixed(1)
      return `${head}${u.n} 가지 이상`
    }
  }
  return `${Math.round(Math.pow(10, log10)).toLocaleString()}가지`
}

// ───────────────────────────── 컴포넌트 ─────────────────────────────
export default function ActionPlotLogic({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState('')
  const [warn, setWarn] = useState('')
  const mounted = useRef(true)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  // payload.genre 가 액션·전쟁이 아니어도 이 도구는 액션·전쟁 전용 — 정보용으로만 참조. 미사용 경고 방지.
  useEffect(() => { void payload }, [payload])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)) }
    catch { if (mounted.current) setWarn('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [store])

  const flash = (msg: string) => {
    if (!mounted.current) return
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { if (mounted.current) setToast('') }, 2200)
  }

  const tone = TONE_MAP[store.tone]
  const sstore = store.byTone[store.tone]

  const patchStage = (key: string, patch: Partial<StageState>) =>
    setStore((s) => ({
      ...s,
      byTone: { ...s.byTone, [s.tone]: { ...s.byTone[s.tone], [key]: { ...s.byTone[s.tone][key], ...patch } } },
    }))

  const setTone = (t: ToneKey) => setStore((s) => ({ ...s, tone: t }))
  const toggleOpen = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }))
  const toggleTick = (key: string, i: number) =>
    patchStage(key, { ticks: { ...sstore[key].ticks, [i]: !sstore[key].ticks[i] } })

  // ── 진행률·통계 ──
  const stages = tone.stages
  const doneCount = stages.filter((s) => sstore[s.key].done).length
  const filledCount = stages.filter((s) => sstore[s.key].text.trim()).length
  const totalChecks = stages.reduce((a, s) => a + s.checks.length, 0)
  const checkedCount = stages.reduce((a, s) => a + s.checks.filter((_, i) => sstore[s.key].ticks[i]).length, 0)
  const pct = Math.round((doneCount / stages.length) * 100)
  const chkPct = totalChecks ? Math.round((checkedCount / totalChecks) * 100) : 0

  // ── 페이싱 안티패턴 경고(도시에) ──
  const pacingWarnings = (): string[] => {
    const out: string[] = []
    const inten = stages.map((s) => sstore[s.key].intensity)
    // 1) 평탄화: 도입/여파를 제외한 본편 강도의 분산이 작으면 경고
    const core = stages.filter((s) => s.phase !== '여파').map((s) => sstore[s.key].intensity)
    if (core.length >= 3) {
      const mean = core.reduce((a, b) => a + b, 0) / core.length
      const variance = core.reduce((a, b) => a + (b - mean) * (b - mean), 0) / core.length
      if (variance < 110) out.push('⚠️ 액션의 평탄화 위험: 본편 단계의 강도가 거의 비슷해요. 세트피스마다 규모/승리방식/변수를 달리해 굴곡을 주세요.')
    }
    // 2) 호흡 부재: 연속 3단계 강도가 모두 70 이상이면 들숨 부족
    for (let i = 0; i + 2 < inten.length; i++) {
      if (inten[i] >= 70 && inten[i + 1] >= 70 && inten[i + 2] >= 70) {
        out.push('⚠️ 호흡 부재: 고강도 액션이 3단계 연속돼요. 사이에 들숨(부상 점검·농담·다음 계획)을 끼워 둔감화를 막으세요.')
        break
      }
    }
    // 3) 클라이맥스가 정점이 아님: 클라이맥스 평균 < 직전 상승/위기 최댓값
    const climax = stages.filter((s) => s.phase === '클라이맥스').map((s) => sstore[s.key].intensity)
    const before = stages.filter((s) => s.phase === '상승' || s.phase === '위기').map((s) => sstore[s.key].intensity)
    if (climax.length && before.length) {
      const cMax = Math.max(...climax), bMax = Math.max(...before)
      if (cMax < bMax) out.push('⚠️ 클라이맥스가 정점이 아니에요: 클라이맥스 강도가 앞 구간보다 낮아요. 가장 큰 위험을 마지막에 배치하세요.')
    }
    // 4) 위기(최저점) 부재: 위기 단계 강도가 80 미만이면 중간 패배가 약함
    const crisis = stages.filter((s) => s.phase === '위기').map((s) => sstore[s.key].intensity)
    if (crisis.length && Math.max(...crisis) < 80) out.push('⚠️ 최저점이 약해요: 중간 패배(주인공 무력화·상실)를 더 깊게 파야 반전의 카타르시스가 커집니다.')
    // 5) 시계장치 미점검: ticking 체크가 한 번도 안 됐으면
    let tickingUsed = false
    stages.forEach((s) => s.checks.forEach((c, i) => { if (c === CHK.ticking && sstore[s.key].ticks[i]) tickingUsed = true }))
    const hasTicking = stages.some((s) => s.checks.includes(CHK.ticking))
    if (hasTicking && !tickingUsed && doneCount >= 2) out.push('💡 시계 장치(ticking clock)를 아직 점검하지 않았어요. 타이머·증원·만조 같은 카운트다운은 긴장의 가장 강력한 증폭기입니다.')
    return out
  }
  const warnings = pacingWarnings()

  // ── 복사/내보내기 텍스트 ──
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const escMl = (s: string) => esc(s).replace(/\n/g, '<br/>')

  const buildText = (): string => {
    const lines: string[] = []
    lines.push(`# 액션·전쟁 플롯·진행곡선${store.title ? ` — ${store.title}` : ''}`)
    lines.push(`톤: ${tone.name} (${tone.axis})`)
    lines.push(`진행: ${doneCount}/${stages.length} 완료 (${pct}%) · 관습 점검 ${checkedCount}/${totalChecks} (${chkPct}%)`)
    lines.push('')
    stages.forEach((s, idx) => {
      const st = sstore[s.key]
      lines.push(`${st.done ? '[v]' : '[ ]'} ${idx + 1}. ${s.title}  〈${s.phase} · 강도 ${st.intensity}/권장 ${s.target}〉`)
      if (st.text.trim()) lines.push(st.text.trim().split('\n').map((l) => '   ' + l).join('\n'))
      s.checks.forEach((c, i) => lines.push(`   ${st.ticks[i] ? '☑' : '☐'} ${c}`))
      if (st.note.trim()) lines.push(`   ※ 메모: ${st.note.trim()}`)
      lines.push('')
    })
    if (warnings.length) {
      lines.push('— 페이싱 점검 —')
      warnings.forEach((w) => lines.push(w))
    }
    return lines.join('\n').trimEnd() + '\n'
  }

  const buildHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><strong>액션·전쟁 플롯·진행곡선</strong> · 톤: ${esc(tone.name)} (${esc(tone.axis)})</p>`)
    parts.push(`<p>진행 ${doneCount}/${stages.length} (${pct}%) · 관습 점검 ${checkedCount}/${totalChecks} (${chkPct}%)</p>`)
    stages.forEach((s, idx) => {
      const st = sstore[s.key]
      parts.push(`<h3>${st.done ? '✅ ' : ''}${idx + 1}. ${esc(s.title)} <em>(${esc(s.phase)} · 강도 ${st.intensity}/권장 ${s.target})</em></h3>`)
      const txt = st.text.trim()
      parts.push(`<p>${txt ? escMl(txt) : '<em>(미작성)</em>'}</p>`)
      const ticked = s.checks.map((c, i) => `${st.ticks[i] ? '☑' : '☐'} ${esc(c)}`).join('<br/>')
      parts.push(`<p style="font-size:0.92em;color:#888">${ticked}</p>`)
      if (st.note.trim()) parts.push(`<p>※ ${escMl(st.note.trim())}</p>`)
    })
    return parts.join('')
  }

  const copyAll = async () => {
    const text = buildText()
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); flash('전체 시트를 복사했어요'); return }
      throw new Error('no clipboard')
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.focus(); ta.select()
        document.execCommand('copy'); document.body.removeChild(ta)
        flash('전체 시트를 복사했어요')
      } catch { setWarn('복사가 지원되지 않는 환경이에요. 직접 선택해 복사해 주세요.') }
    }
  }

  const exportFile = () => {
    try {
      const blob = new Blob([buildText()], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (store.title ? store.title.replace(/[\\/:*?"<>|]/g, '_') : 'action-plotlogic') + '.txt'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      flash('파일로 내보냈어요')
    } catch { setWarn('내보내기가 지원되지 않는 환경이에요.') }
  }

  // ── 프로젝트 연동: 자료 › 구조 폴더 ──
  const toProject = () => {
    if (!hasProjectBridge()) { setWarn('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: `액션·전쟁 진행곡선 — ${tone.name}`,
      bodyHtml: buildHtml(),
      meta: {
        작품: store.title || '(제목 없음)',
        톤: tone.name,
        진행률: `${doneCount}/${stages.length} (${pct}%)`,
        관습점검: `${checkedCount}/${totalChecks}`,
        장르: '액션·전쟁',
      },
    })
    flash(id ? '프로젝트 자료(구조)에 진행곡선 문서를 추가했어요' : '프로젝트에 연결되지 않았습니다')
  }

  const resetTone = () => {
    if (typeof window !== 'undefined' && !window.confirm(`현재 톤(${tone.name})의 모든 단계 내용을 비웁니다. 계속할까요?`)) return
    setStore((s) => ({ ...s, byTone: { ...s.byTone, [s.tone]: emptyStageStore(tone) } }))
    flash('현재 톤을 초기화했어요')
  }
  const resetIntensity = () => {
    setStore((s) => {
      const cur = { ...s.byTone[s.tone] }
      for (const st of tone.stages) cur[st.key] = { ...cur[st.key], intensity: st.target }
      return { ...s, byTone: { ...s.byTone, [s.tone]: cur } }
    })
    flash('강도를 권장 곡선으로 되돌렸어요')
  }

  const combo = fmtCombo(comboCount(tone))

  // ───────────────────────────── 스타일 ─────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0 }
  const head: React.CSSProperties = { padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 9, background: 'var(--chrome-2)' }
  const input: React.CSSProperties = { padding: '8px 10px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', minWidth: 0 }
  const toneRow: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap' }
  const barWrap: React.CSSProperties = { height: 9, borderRadius: 6, background: 'var(--paper)', border: '1px solid var(--border)', overflow: 'hidden' }
  const statRow: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }
  const ta: React.CSSProperties = { width: '100%', minHeight: 60, resize: 'vertical', padding: '8px 10px', fontSize: 13.5, lineHeight: 1.55, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const foot: React.CSSProperties = { borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--chrome-2)' }

  return (
    <div style={wrap}>
      <div style={head}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Emoji e="💥" /> 액션·전쟁 진행곡선</div>
          <input
            style={{ ...input, flex: '1 1 160px' }}
            value={store.title}
            onChange={(e) => setStore((s) => ({ ...s, title: e.target.value }))}
            placeholder="작품 제목 (선택)"
            maxLength={120}
            aria-label="작품 제목"
          />
        </div>

        <div style={toneRow}>
          {TONES.map((t) => {
            const on = store.tone === t.key
            return (
              <button
                key={t.key}
                className={'minibtn' + (on ? ' active' : '')}
                style={on ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' } : {}}
                onClick={() => setTone(t.key)}
                title={t.blurb}
              ><Emoji e={t.emoji} /> {t.name}</button>
            )
          })}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}><Emoji e={tone.emoji} /> {tone.blurb}</div>

        <div style={barWrap}><div style={{ height: '100%', width: `${pct}%`, background: 'var(--ok)', transition: 'width .25s ease' }} /></div>
        <div style={statRow}>
          <span>완료 <strong style={{ color: 'var(--ok)' }}>{doneCount}</strong>/{stages.length} · 작성 <strong style={{ color: 'var(--text)' }}>{filledCount}</strong> · 관습 점검 <strong style={{ color: 'var(--accent)' }}>{checkedCount}/{totalChecks}</strong> ({chkPct}%)</span>
          <span title="이 톤의 단계 상태(강도×작성×완료×체크리스트 부분집합) 조합 자유도"><Emoji e="🎲" /> 진행 형태 {combo}</span>
        </div>
      </div>

      {/* 긴장 곡선(설계 강도 vs 권장선) */}
      <IntensityCurve stages={stages} sstore={sstore} />

      {warn && <div style={{ margin: '6px 14px 0', padding: '7px 10px', borderRadius: 8, fontSize: 12.5, background: 'var(--chrome-2)', border: '1px solid var(--warn)', color: 'var(--warn)' }}>{warn}</div>}
      {warnings.length > 0 && (
        <div style={{ margin: '6px 14px 0', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {warnings.map((w, i) => (
            <div key={i} style={{ padding: '7px 10px', borderRadius: 8, fontSize: 12.5, lineHeight: 1.5, background: 'var(--chrome-2)', border: '1px solid ' + (w.startsWith('💡') ? 'var(--accent)' : 'var(--warn)'), color: w.startsWith('💡') ? 'var(--accent)' : 'var(--warn)' }}>{emojify(w)}</div>
          ))}
        </div>
      )}

      <div style={body}>
        {stages.map((s, idx) => {
          const st = sstore[s.key]
          const isOpen = !!open[s.key]
          const stChk = s.checks.filter((_, i) => st.ticks[i]).length
          const pc = PHASE_COLOR[s.phase]
          return (
            <div key={s.key} style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', borderLeft: `4px solid ${st.done ? 'var(--ok)' : pc}`, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px' }}>
                <input type="checkbox" checked={st.done} onChange={() => patchStage(s.key, { done: !st.done })} style={{ flexShrink: 0, width: 18, height: 18, marginTop: 2, cursor: 'pointer', accentColor: 'var(--ok)' }} aria-label={`${s.title} 완료`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span><Emoji e={s.emoji} /></span>
                    <span style={{ color: 'var(--muted)' }}>{idx + 1}.</span> {s.title}
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', background: pc, borderRadius: 99, padding: '1px 7px' }}>{s.phase}</span>
                    {st.text.trim() && !isOpen && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted)' }}>· 작성됨</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>강도 {st.intensity} / 권장 {s.target} · 점검 {stChk}/{s.checks.length}</div>
                </div>
                <button className="minibtn" style={{ flexShrink: 0 }} onClick={() => toggleOpen(s.key)} aria-expanded={isOpen}>{isOpen ? '접기 ▲' : '펼치기 ▼'}</button>
              </div>

              {isOpen && (
                <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, padding: '7px 9px', background: 'var(--chrome-2)', borderRadius: 8 }}><Emoji e="💡" /> {s.hint}</div>

                  {s.beats && s.beats.length > 0 && (
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>
                      <span style={{ fontWeight: 700 }}>미시 비트:</span> {s.beats.join(' · ')}
                    </div>
                  )}

                  <textarea
                    style={ta}
                    value={st.text}
                    onChange={(e) => patchStage(s.key, { text: e.target.value })}
                    placeholder="이 단계에서 일어나는 일 — 장소·제약·목표·합병증·감각을 적어 보세요…"
                  />

                  {/* 페이싱 강도 슬라이더 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, width: 70, flexShrink: 0 }}>페이싱 강도</span>
                    <input
                      type="range" min={0} max={100} step={1} value={st.intensity}
                      onChange={(e) => patchStage(s.key, { intensity: parseInt(e.target.value, 10) })}
                      style={{ flex: 1, accentColor: pc, cursor: 'pointer' }}
                      aria-label={`${s.title} 페이싱 강도`}
                    />
                    <span style={{ fontSize: 13, fontWeight: 700, width: 34, textAlign: 'right', color: pc }}>{st.intensity}</span>
                  </div>

                  {/* 관습/클리셰 점검 체크리스트 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>이 단계의 관습·클리셰 점검</div>
                    {s.checks.map((c, i) => (
                      <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12.5, lineHeight: 1.45, cursor: 'pointer', padding: '4px 7px', borderRadius: 7, background: st.ticks[i] ? 'var(--chrome-2)' : 'transparent' }}>
                        <input type="checkbox" checked={!!st.ticks[i]} onChange={() => toggleTick(s.key, i)} style={{ flexShrink: 0, width: 15, height: 15, marginTop: 1, cursor: 'pointer', accentColor: 'var(--accent)' }} />
                        <span style={{ color: st.ticks[i] ? 'var(--text)' : 'var(--muted)' }}>{c}</span>
                      </label>
                    ))}
                  </div>

                  <textarea
                    style={{ ...ta, minHeight: 42 }}
                    value={st.note}
                    onChange={(e) => patchStage(s.key, { note: e.target.value })}
                    placeholder="복선·소품·시점·회차 끊을 지점 등 메모…"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 연계 바 */}
      <div style={{ ...foot, paddingBottom: 0 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '자료 › 구조 폴더에 진행곡선 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre: '액션·전쟁' })} title="플롯 피라미드 열기"><Emoji e="🔺" /> 플롯 피라미드</button>
        <button className="linkbtn" onClick={() => openToolLinked('scene-list', { genre: '액션·전쟁' })} title="장면 목록 열기"><Emoji e="🎬" /> 장면 목록</button>
        <button className="linkbtn" onClick={() => openToolLinked('action-signature', { genre: '액션·전쟁' })} title="액션 시퀀스 시그니처 생성기 열기"><Emoji e="💥" /> 시퀀스 생성기</button>
        <button className="linkbtn" onClick={() => openToolLinked('action-eventforge', { genre: '액션·전쟁' })} title="액션·전쟁 사건 단조기 열기"><Emoji e="⚔️" /> 사건 단조기</button>
        <button className="linkbtn" onClick={() => openToolLinked('action-tropes', { genre: '액션·전쟁' })} title="액션·전쟁 트로프 점검표 열기"><Emoji e="🧪" /> 트로프 점검</button>
      </div>

      <div style={foot}>
        <button className="btn-primary" onClick={copyAll}><Emoji e="📋" /> 전체 복사</button>
        <button className="minibtn" onClick={exportFile}><Emoji e="⬇️" /> .txt 내보내기</button>
        <button className="minibtn" onClick={() => setOpen(Object.fromEntries(stages.map((s) => [s.key, true])))}>모두 펼치기</button>
        <button className="minibtn" onClick={() => setOpen({})}>모두 접기</button>
        <button className="minibtn" onClick={resetIntensity} title="강도를 권장 곡선으로 되돌리기"><Emoji e="📈" /> 권장곡선</button>
        <span style={{ flex: 1 }} />
        {toast && <span style={{ fontSize: 12.5, color: 'var(--ok)', fontWeight: 600 }}>{toast}</span>}
        <button className="minibtn" onClick={resetTone} style={{ color: 'var(--warn)' }}>톤 초기화</button>
      </div>
    </div>
  )
}

// ───────────────────────────── 긴장 곡선 그래프 ─────────────────────────────
function IntensityCurve({ stages, sstore }: { stages: StageDef[]; sstore: StageStore }) {
  const W = 100, H = 100 // viewBox 비율(반응형) — 실제 폭은 100%
  const n = stages.length
  if (n < 2) return null
  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * (W - 8) + 4)
  const y = (v: number) => H - 6 - (v / 100) * (H - 14)
  const path = (vals: number[]) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(' ')
  const target = stages.map((s) => s.target)
  const actual = stages.map((s) => sstore[s.key].intensity)

  return (
    <div style={{ padding: '8px 14px 0' }}>
      <div style={{ position: 'relative', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--panel)', padding: '6px 6px 2px' }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 96, display: 'block' }} role="img" aria-label="긴장(페이싱 강도) 곡선">
          {/* 가로 그리드(25/50/75) */}
          {[25, 50, 75].map((g) => (
            <line key={g} x1={4} y1={y(g)} x2={W - 4} y2={y(g)} stroke="var(--border)" strokeWidth={0.3} strokeDasharray="1 2" />
          ))}
          {/* 권장 곡선 */}
          <path d={path(target)} fill="none" stroke="var(--muted)" strokeWidth={0.8} strokeDasharray="2 2" opacity={0.7} vectorEffect="non-scaling-stroke" />
          {/* 설계 곡선(채움) */}
          <path d={`${path(actual)} L ${x(n - 1).toFixed(2)} ${H - 6} L ${x(0).toFixed(2)} ${H - 6} Z`} fill="var(--accent)" opacity={0.12} />
          <path d={path(actual)} fill="none" stroke="var(--accent)" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
          {/* 단계 점 */}
          {stages.map((s, i) => (
            <circle key={s.key} cx={x(i)} cy={y(sstore[s.key].intensity)} r={1.6} fill={PHASE_COLOR[s.phase]} stroke="var(--panel)" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginTop: 3, gap: 4 }}>
        <span><Emoji e={stages[0].emoji} /> 도입</span>
        <span style={{ color: 'var(--accent)' }}>━ 설계 곡선</span>
        <span style={{ color: 'var(--muted)' }}>┄ 권장(이상)선</span>
        <span>여파 <Emoji e={stages[stages.length - 1].emoji} /></span>
      </div>
    </div>
  )
}
