// 액션·전쟁 개요 빌더 — 이 장르의 표준 구조(액션 영웅 곡선·전쟁 환멸 곡선·무협 성장형·헌터 각성형·
// 밀리터리 작전형·세트피스 점층형)에 맞춘 장/막 개요 템플릿을 제공한다. 템플릿을 고르면 각 막·비트가
// 자동으로 깔리고, 항목은 인라인 편집·추가·순서 이동·삭제·완료 체크가 가능하다. 한 챕터에 끼워 넣을
// "세트피스(set-piece) 한 컷"은 슬롯 풀에서 무작위 조합(잠금/재생성, 조합수 표시 — 1조 이상)으로 만든다.
// 작성한 개요는 프로젝트 원고 '개요' 폴더에 문서로 추가하고, 세트피스 한 줄은 글감(snippets) 라이브러리에 담는다.
// 자급식: react 와 './linkbus' 외 import 없음. 100% 로컬(외부 API 없음). 데이터는 localStorage 영속.
import { useState, useEffect, useRef, useMemo } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = { id: 'action-outline', name: '액션·전쟁 개요 빌더', icon: '⚔️', group: '구조', genre: '액션·전쟁', intro: '액션 영웅 곡선·전쟁 환멸 곡선·무협 성장·헌터 각성·밀리터리 작전 등 표준 구조에 맞춰 장/막 개요를 채우고 세트피스를 끼워 넣습니다', w: 680, h: 720 }

// ── 데이터 모델 ─────────────────────────────────────────────
type Kind = 'act' | 'beat'          // act: 막/장 머리, beat: 그 아래 세부 비트
interface Item {
  id: string
  kind: Kind
  text: string
  note: string                       // 작법 가이드/메모(접어둠)
  done: boolean
}
interface Saved {
  templateId: string
  items: Item[]
  selectedId: string | null
}

const LS_KEY = 'sry:tool:action-outline'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return 'ao_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ── 구조 템플릿(이 장르 도시에 근거) ─────────────────────────
interface TemplateRow { kind: Kind; text: string; note?: string }
interface Template {
  id: string
  name: string
  sub: string                        // 하위 장르/톤 프리셋
  icon: string
  desc: string
  rows: TemplateRow[]
}

const TEMPLATES: Template[] = [
  {
    id: 'hero',
    name: '액션 영웅 곡선형',
    sub: '영웅·카타르시스 (액션)',
    icon: '🦾',
    desc: '개인·소규모의 신체적 우월성을 과시하는 위기-탈출 펄스. 콜드 오픈 소규모 액션으로 능력을 입증하고, 세트피스를 점층시켜 최종 1대1로 수렴한다.',
    rows: [
      { kind: 'act', text: '1막 — 능력 입증 + 위협 제시(발단)', note: '콜드 오픈: 본 사건과 무관한 소규모 액션으로 주인공의 강함·스타일·시그니처 무브를 "보여준다". 이어 메인 위협과 이해관계(stakes)를 설치.' },
      { kind: 'beat', text: '콜드 오픈 — 소규모 액션으로 실력 과시', note: '말보다 동작으로 캐릭터를 규정한다(존 윅의 재장전, 저격수의 호흡). 시그니처 무브를 여기서 각인시켜 클라이맥스 회수의 복선으로.' },
      { kind: 'beat', text: '평온 → 거짓 안전지대를 깨는 사건', note: '안전해 보이는 일상/휴식 직후의 기습으로 사건을 점화. 들숨-날숨 페이싱의 첫 날숨.' },
      { kind: 'beat', text: '이해관계(stakes) 설치 — 무엇을/누구를 잃는가', note: '죽지 않을 주인공이라도 잃을 것(동료·시간·도덕·임무·고향)을 명시. 싸우는 이유를 독자에게 못 박는다.' },
      { kind: 'act', text: '2막 — 능력 강화·아군 규합·세트피스 점층(전개)', note: '작은 충돌 → 중간 보스 → 더 큰 세트피스. 각 세트피스는 고유한 장소·제약·목표·합병증을 갖고 앞 것보다 규모/위험이 커진다.' },
      { kind: 'beat', text: '의식·준비 몽타주(gear-up/loadout)', note: '무장 점검·작전 브리핑·"규칙 정하기" 장면. 긴장 적재 + 능력의 사전 공개(나중에 쓸 도구를 미리 보여줌).' },
      { kind: 'beat', text: '중간 세트피스 — 거리의 변주(원→중→근접)', note: '독립 설계된 대형 액션 단위. 명료한 공간 지리(누가 어디, 출구·엄폐물·고지·시간제한)를 먼저 깐 뒤 거리를 좁혀 친밀도·잔혹도를 높인다.' },
      { kind: 'beat', text: '체호프의 무기/환경 심기', note: '샹들리에·가스 밸브·절벽·강물·차량 등 1막 환경 요소를 무심히 보여둔다. 클라이맥스에서 회수할 카드를 미리 배치.' },
      { kind: 'act', text: '3막 — 중간 패배·최저점', note: '주인공 무력화: 부상·무장 해제·아군 이탈·시그니처 무브 봉인. "잃을 것이 명확해진 순간"을 만든다.' },
      { kind: 'beat', text: '능력 격차의 벽 — 빌런이 명백히 위', note: '주인공이 정공법으로는 못 이기는 지점. 무에서 솟는 새 힘(데우스 엑스 마키나) 금지, 대신 약점·도구·희생을 탐색하게 한다.' },
      { kind: 'beat', text: '대가의 적립 — 부상 시계 작동', note: '출혈·골절·탄약 고갈을 카운트다운으로. 무손상 승리의 반복을 끊고 무게를 부여.' },
      { kind: 'act', text: '4막 — 최종 세트피스·역전(절정)', note: '규모는 가장 크되 초점은 가장 좁게(개인 대 개인으로 수렴). 설치한 시계가 마지막 순간에 멎고 복선이 동시 발화.' },
      { kind: 'beat', text: '약점 회수·복선 폭발', note: '1~2막의 빌런 약점, 환경 요소(체호프), 시그니처 무브 변주가 한꺼번에 터진다. 머리/준비/약점공략으로 이기게 한다.' },
      { kind: 'beat', text: '마지막 한 발/마지막 힘으로 역전', note: '자원 고갈 직전(탄약 1발, 부서진 무기)에서 의지로 반전. 운빨 승리는 독자가 사기로 인식하니 금지.' },
      { kind: 'act', text: '5막 — 여파(aftermath)', note: '짧은 정산: 부상 수습·빌런 최후·세계 변화 확인. 너무 길면 늘어지고 없으면 공허하다.' },
    ],
  },
  {
    id: 'war',
    name: '전쟁 환멸 곡선형',
    sub: '반전·환멸 (전쟁)',
    icon: '🎖️',
    desc: '집단·전략·체제·소모를 다루며 개인 무력보다 "대가와 의미"를 묻는다. 순진함 → 첫 전투의 환멸 → 전우애 → 대작전 → 상실 → 생존자의 의미 묻기.',
    rows: [
      { kind: 'act', text: '1막 — 동원/입대(순진함)', note: '전쟁 이전의 인물·이상·동기. 후방·민간인의 시점도 함께 깔아 "왜 싸우는가"를 미리 묻는다.' },
      { kind: 'beat', text: '입대 동기와 명분 — 애국/생존/도피', note: '인물이 믿는 명분을 제시(나중에 환멸로 깨질 것). 계급·편제(분대·소대·중대)와 명령체계를 자연스럽게 노출.' },
      { kind: 'beat', text: '무게의 물건들(팀 오브라이언식)', note: '병사가 지고 다니는 것 — 편지·부적·사진·죄책감. 추상적 전쟁을 구체적 무게로 환원해 인물을 각인.' },
      { kind: 'act', text: '2막 — 첫 전투(환멸·세례)', note: '전장의 핍진성: 소리(총성·금속음)·냄새(화약·피·흙)·신체감각(반동·심박)·시간왜곡. 이상이 처음으로 깨진다.' },
      { kind: 'beat', text: '첫 교전 — 제압 사격·엄호·돌격', note: '명료한 전장 지리(고지·참호·엄폐·종심)를 먼저 깐다. 전술 어휘(측면 우회·각개격파)로 그럴듯함 확보.' },
      { kind: 'beat', text: '첫 죽음과 환멸', note: '동료/적의 죽음으로 명분이 흔들린다. 부조리(캐치-22식)·공포·무감각 중 톤을 정해 일관되게.' },
      { kind: 'act', text: '3막 — 소모와 전우애(중반)', note: '대기-공포-짧은 광기의 반복. 명령부(전략)와 현장 병사(생존)의 시점을 교차해 "결정과 그 인간적 비용"을 함께 보여준다.' },
      { kind: 'beat', text: '병참·정보의 비대칭 — 머리 싸움', note: '보급선·첩보·기만(거짓 무전·위장)이 승패를 가른다. 후방의 무능/관료주의가 전선의 비극을 키운다.' },
      { kind: 'beat', text: '전우애의 형성과 거짓 안전지대', note: '참호 속 농담·나눔으로 인간미를 적립. 안전해 보이는 휴식 직후 기습으로 들숨-날숨을 설계.' },
      { kind: 'act', text: '4막 — 대규모 작전(전략적 정점)', note: '공성/돌파/방어전. 한 인물의 분투가 전선 전체의 분기점이 되도록 미시-거시를 동조.' },
      { kind: 'beat', text: '작전 개시 — 거점 사수/돌파', note: '시계 장치(증원 도착·일출·만조)로 긴장 증폭. 희생적 후위(누군가 남아 막고 본대를 보낸다)를 배치.' },
      { kind: 'beat', text: '파국과 상실 — 대가 있는 승리(Pyrrhic)', note: '이기되 무언가를 영구히 잃는다(동료·신념·고향·자기 일부). 무손상 승리는 김이 샌다.' },
      { kind: 'act', text: '5막 — 생존자의 의미 묻기(대단원)', note: '반전(진짜 적은 아군 지휘부/체제였다) 또는 비장. 살아남은 자의 시선으로 전쟁의 의미를 정산.' },
      { kind: 'beat', text: '귀환/전사자 호명', note: '전사자를 한 명씩 호명하거나 "무게의 물건"을 회수해 정서를 닫는다. 환멸/추모/분노 중 마지막 음을 고른다.' },
    ],
  },
  {
    id: 'wuxia',
    name: '무협 성장형',
    sub: '무협·초식 (성장)',
    icon: '🗡️',
    desc: '약함 → 기연/각성 → 비무·서열전 반복(무력 인플레) → 문파전 → 천하 위협 최종전. 초식 파훼·비기 완성을 누적 수련의 결실로 회수한다.',
    rows: [
      { kind: 'act', text: '1막 — 약자의 출발(발단)', note: '멸문·복수·천대 등 출발 동기. 내공·심법의 규칙(자원으로서의 진기)을 제시해 카타르시스의 토대를 깐다.' },
      { kind: 'beat', text: '굴욕과 동기 — 멸문/패배/천대', note: '주인공이 명백히 약한 지점에서 시작. 잃을 것(가문·스승·연인)을 못 박아 성장의 연료로 삼는다.' },
      { kind: 'beat', text: '기연/비급/사부와의 인연', note: '내공·심법·절기의 발판. 단 "갑툭튀"가 아니라 대가(주화입마 위험·시간·금기)를 건 성장으로 설계.' },
      { kind: 'act', text: '2막 — 비무·서열전 반복(무력 인플레)', note: '한 사이클 = 더 강한 적 → 초식 파훼/신경지 돌파 → 서열 상승. 강함의 규칙을 일관되게 지킨다.' },
      { kind: 'beat', text: '초식 파훼 — 적의 절기를 읽고 깬다', note: '운빨이 아닌 "관찰→약점→파훼"로 승부. 시그니처 절기를 각인시켜 후반 변주의 복선으로.' },
      { kind: 'beat', text: '운기·수련 몽타주와 대가', note: '내공 축적·심법 연성. 탄약처럼 진기에도 한계를 둬 "마지막 한 줌의 내공" 역전을 가능케 한다.' },
      { kind: 'act', text: '3막 — 문파전·정사대전(중반)', note: '개인 비무가 집단전(문파전·정파/사파)으로 확대. 진법·합공 등 집단 전술을 도입.' },
      { kind: 'beat', text: '배신·음모 — 정파의 그늘', note: '사파만 악이 아니다. 명문정파의 위선·배후 음모로 입체화. 정보전이 서스펜스 축.' },
      { kind: 'beat', text: '중간 패배 — 비기 봉인/주화입마', note: '최저점: 무공 손상·주화입마·동료 상실. "잃을 것이 명확해진 순간"을 만든다.' },
      { kind: 'act', text: '4막 — 천하 위협과 최종 비무(절정)', note: '비기의 완성·신경지 해방을 최종전에 배치. 누적 수련/복선의 결실이어야 한다.' },
      { kind: 'beat', text: '비기 완성·복선 폭발', note: '봉인했던 절기, 사부의 유진, 깨달은 검리(劍理)가 동시 발화. 머리·수련·희생으로 최강자를 꺾는다.' },
      { kind: 'act', text: '5막 — 강호의 안정(대단원)', note: '복수의 완성과 무림 질서 재편. 승자의 그늘과 다음 갈등의 씨앗을 남긴다.' },
    ],
  },
  {
    id: 'hunter',
    name: '헌터 각성·레이드형',
    sub: '헌터·각성 (웹소설)',
    icon: '🌀',
    desc: '약한 각성자 → 기연/시스템 → 던전·레이드 반복(스킬·등급 인플레) → 길드전/PvP → 세계 위협 최종 레이드. 회차 단위 사이다와 클리프행어가 전투 설계를 지배.',
    rows: [
      { kind: 'act', text: '1막 — 각성 + 강력한 후크(1~5화)', note: '약하거나 망한 각성자에서 시작. 첫 화 내 강한 위기(죽음 직전·꼴찌·버림받음) + 작은 사이다로 후크 완성.' },
      { kind: 'beat', text: '바닥에서의 각성/시스템 획득', note: '회귀·시스템·기연으로 전환점. 스킬·쿨타임·버프/디버프의 규칙(자원)을 제시해 인플레의 토대를 만든다.' },
      { kind: 'beat', text: '첫 던전/위기와 작은 사이다', note: '즉각적 위기를 기지+신스킬로 작게 역전. 명료한 공간 지리(보스방·트랩·시간제한)를 먼저 깐다.' },
      { kind: 'act', text: '2막 — 던전·레이드 반복(등급 인플레)', note: '한 사이클 = 더 높은 등급 게이트 → 공략 → 보상·등급 상승. 탱커/딜러/힐러 역할 분담으로 합을 짠다.' },
      { kind: 'beat', text: '레이드 공략 — 패턴 파훼', note: '보스 패턴을 관찰→약점→파훼로 깬다(운빨 금지). 거리의 변주(원거리 딜→근접 탱)와 쿨타임 관리가 긴장 축.' },
      { kind: 'beat', text: '동료·길드 규합과 사이다 주기', note: '3~5화당 1회 명확한 응징/역전. 너무 잦으면 가벼워지고 드물면 고구마로 이탈.' },
      { kind: 'act', text: '3막 — 길드전·PvP·랭킹전(중반)', note: '협력에서 경쟁으로. 견제·배신·정보전. 회차 끝 클리프행어로 다음 화 유인.' },
      { kind: 'beat', text: '강적/랭커와의 PvP — 능력 격차', note: '명백히 위인 상대. 스킬 조합·환경 이용·심리전으로 격차를 메운다. 시그니처 스킬을 각인.' },
      { kind: 'beat', text: '중간 패배 — 디버프/봉인/동료 상실', note: '최저점: 스킬 봉인·치명상·배신. 회복할 자원과 의지를 남겨둔다.' },
      { kind: 'act', text: '4막 — 세계 위협 최종 레이드(절정)', note: '각성 폼 해방·신스킬 완성을 최종전에 배치. 누적 성장/복선의 결실이어야 한다(갑툭튀 금지).' },
      { kind: 'beat', text: '각성 해방·복선 폭발', note: '봉인 스킬·숨겨진 직업·동료의 버프가 동시 발화. 설치한 시계(레이드 제한시간)가 마지막에 멎는다.' },
      { kind: 'act', text: '5막 — 정산과 다음 위협(대단원)', note: '보상·랭킹·세계 변화 확인. 더 큰 차원/게이트의 떡밥으로 다음 권을 연다.' },
    ],
  },
  {
    id: 'military',
    name: '밀리터리 작전형',
    sub: '전략·작전 (테크노스릴러)',
    icon: '🪖',
    desc: '톰 클랜시·매튜 라일리식. 임무 브리핑 → 침투 → 합병증 → 시계 장치 폭발 → 탈출. 전술·병참·장비 고증과 초고속 페이싱이 핵심.',
    rows: [
      { kind: 'act', text: '1막 — 위협 발생·임무 브리핑(발단)', note: '인질·폭탄·핵·정보 탈취 등 위협을 제시하고 작전 목표·제약·시간제한을 브리핑으로 명확히 한다.' },
      { kind: 'beat', text: '인사이팅 — 위협의 정체와 시한', note: '시계 장치(폭탄 타이머·인질 처형 시한·증원 도착) 설치. 무엇을 잃는가를 못 박는다.' },
      { kind: 'beat', text: '브리핑 + 장비 점검(loadout)', note: '작전 계획·역할 분담·화기/장비(구경·탄창·근접신관) 점검. 능력 사전 공개 + 긴장 적재. "계획은 첫 교전에서 깨진다"를 암시.' },
      { kind: 'act', text: '2막 — 침투와 첫 합병증(전개)', note: '잠입 → 들킴/오작동/배신 등 합병증으로 계획 붕괴. 제압 사격·엄호·후퇴로 즉흥 대응.' },
      { kind: 'beat', text: '은밀 침투 — 명료한 공간 지리', note: '평면도·경비 동선·출구를 독자 머릿속에 그려준다. 소음/시야/거리 제약을 규칙으로 작동시킨다.' },
      { kind: 'beat', text: '계획의 붕괴 — 합병증 발생', note: '경보·내통자·장비 고장. 들숨-날숨: 짧은 위기 해소 후 더 큰 위기로 페이스를 올린다.' },
      { kind: 'act', text: '3막 — 추격·고립·시계 가속(절정 전)', note: '거짓 안전지대 → 기습. 부상 시계·탄약 고갈이 카운트다운으로 겹친다. 수적 열세/최후의 저항.' },
      { kind: 'beat', text: '수적 열세 속 거점 사수/돌파', note: '1대 다수. 환경(체호프의 무기)·즉석 함정·기만으로 머리 싸움. 희생적 후위로 정서 정점.' },
      { kind: 'act', text: '4막 — 시계 정지·목표 달성(절정)', note: '00:01에서 해제되는 식으로 설치한 카운트다운을 마지막 순간에 멎게 한다. 두뇌·약점공략으로 승리.' },
      { kind: 'beat', text: '최종 대결·복선 폭발', note: '진짜 흑막(아군 지휘부/체제 폭로형도 가능) 제거. 1~2막 복선·장비·정보가 동시 발화.' },
      { kind: 'act', text: '5막 — 탈출·여파(대단원)', note: '추출/철수와 대가 정산. 무손상 승리를 피하고 영구적 상실 한 가지를 남긴다.' },
    ],
  },
  {
    id: 'setpiece',
    name: '세트피스 점층형(범용)',
    sub: '장면 설계 (범용)',
    icon: '💥',
    desc: '서사 구조보다 "전투/추격 세트피스의 연속 설계"에 집중하는 골격. 각 세트피스마다 장소·제약·목표·합병증·여파를 채운다. 액션 비중이 높은 모든 하위장르에 범용.',
    rows: [
      { kind: 'act', text: '세트피스 0 — 콜드 오픈(소규모)', note: '본 사건과 분리된 소규모 액션으로 캐릭터·세계 규칙·시그니처 무브를 보여준다(scene, not summary).' },
      { kind: 'beat', text: '장소·제약·목표·합병증·여파', note: '5요소 체크: ① 어디서(공간 지리) ② 무슨 제약(시간·자원·규칙) ③ 무엇을 노리는가 ④ 무엇이 꼬이는가 ⑤ 끝난 뒤 무엇이 바뀌나.' },
      { kind: 'act', text: '세트피스 1 — 첫 본격 충돌(중간)', note: '앞 것보다 규모/위험이 한 단계 위. 거리의 변주(원→중→근접)와 들숨-날숨 리듬을 적용.' },
      { kind: 'beat', text: '체호프의 무기 심기', note: '이 세트피스에서 무심히 보여둔 환경 요소를 다음/최종 세트피스에서 회수할 카드로 적립.' },
      { kind: 'act', text: '세트피스 2 — 시계 장치 동반(고조)', note: '폭탄·증원·일출·만조 등 카운트다운을 얹는다. 부상 시계와 겹쳐 압박을 이중화.' },
      { kind: 'beat', text: '거짓 안전지대 → 기습', note: '안전해 보이는 휴식 직후의 기습으로 페이스를 다시 끌어올린다.' },
      { kind: 'act', text: '세트피스 3 — 중간 패배(최저점)', note: '주인공 무력화: 부상·무장 해제·시그니처 봉인·아군 이탈. 잃을 것을 명확히.' },
      { kind: 'beat', text: '대가 적립 — 무손상 승리 금지', note: '여기까지의 부상·탄약 소모·트라우마를 누적해 무게를 만든다.' },
      { kind: 'act', text: '세트피스 4 — 최종전(절정)', note: '규모 최대, 초점 최소(개인 대 개인). 시계 정지 + 복선 동시 발화 + 마지막 한 발 역전.' },
      { kind: 'beat', text: '약점 회수·복선 폭발·역전', note: '심어둔 모든 카드(약점·체호프의 무기·시그니처 변주)를 한꺼번에 회수해 머리/희생으로 승리.' },
      { kind: 'act', text: '여파(aftermath)', note: '부상 수습·전사자 호명·빌런 최후·세계 변화. 짧고 명료하게 정산.' },
    ],
  },
]

// ── 세트피스(set-piece) 생성기(슬롯 풀) ───────────────────────
// 한 챕터에 끼워 넣을 "세트피스 한 컷"을 무작위 조합해 만든다.
// 조합수 = 각 풀 길이의 곱. 핵심 생성기이므로 1조(1e12) 이상을 지향.
interface Slot { key: string; label: string; pool: string[] }
const SLOTS: Slot[] = [
  {
    key: 'arena', label: '무대(공간 지리)',
    pool: [
      '폭우 쏟아지는 고가도로 위', '무너지는 공성 성벽과 해자', '연기 자욱한 좁은 참호선',
      '엘리베이터가 멈춘 고층 빌딩 계단', '폭발 직전의 정유 시설', '눈보라 치는 산악 고지',
      '암초로 둘러싸인 침몰하는 함선 갑판', '미로 같은 지하 벙커', '인파로 막힌 야시장 골목',
      '활주로의 이륙 직전 수송기', '안개 낀 늪지의 부서진 다리', '폐허가 된 시가지 십자로',
      '천장 낮은 던전 보스방', '낭떠러지에 걸친 흔들 구름다리', '봉쇄된 국경 검문소',
      '회전하는 거대 톱니바퀴 공장', '모래폭풍이 삼키는 사막 협곡', '무중력 우주 정거장 통로',
      '얼어붙은 호수 위 갈라지는 빙판', '불타는 대나무 숲 객잔',
      '무너지는 댐 수문 위 통로', '폭격으로 갈라진 시청 광장', '해무 짙은 등대 절벽',
      '지하철 멈춘 어두운 승강장', '협곡을 가로지르는 화물 열차 지붕', '버려진 야전 병원 복도',
      '용암이 흐르는 화산 분화구 가장자리', '적 기지 한복판 격납고',
    ],
  },
  {
    key: 'force', label: '교전 양상·전력 구도',
    pool: [
      '1대 다수의 최후의 저항', '소대가 사단을 막는 거점 사수', '저격수 대 저격수의 인내전',
      '추격하는 자와 쫓기는 자의 역전극', '포위된 본대의 탈출 돌파', '잠입 암살 대 경계망',
      '공성측의 돌격 대 농성측의 방어', '백병전으로 무너진 전열', '기갑·중화기 대 보병의 비대칭',
      '비무대 위 일대일 정점 대결', '레이드 공대 대 던전 보스', '게릴라 매복 대 정규군 행군',
      '인질극 대 진입조의 동시 제압', '공중전과 지상전의 동시 전개', '내통자가 섞인 아군 속 적',
      '두 군세가 격돌하는 회전(會戰)', '소수 정예의 참수 작전', '시한 폭탄 해체와 적의 방해',
      '추격 차량 대 바리케이드 돌파', '함대 포격 대 상륙 강행', '근접 호위 대 군중 속 암살자',
      '엄폐물 없는 개활지 돌파', '봉쇄선 돌파 대 차단조', '단신 침투 대 자동 방어 포탑',
    ],
  },
  {
    key: 'clock', label: '시계 장치(카운트다운)',
    pool: [
      '폭탄 타이머가 0을 향해 내려간다', '적 증원이 분 단위로 다가온다', '일출까지만 엄폐가 유효하다',
      '만조가 차오르며 퇴로가 잠긴다', '인질 처형 시한이 임박했다', '독·출혈로 주인공의 시간이 깎인다',
      '연료/탄약이 한 줌만 남았다', '폭발까지 구조물이 무너져 내린다', '추출 헬기 도착까지 버텨야 한다',
      '독가스가 통로를 채워 온다', '댐 방류로 수위가 급상승한다', '결계/봉인이 풀리기 직전이다',
      '레이드 제한시간이 깜빡인다', '아군 포격이 좌표로 떨어질 시각이다', '엔진 과열로 폭주가 임박했다',
      '눈사태가 비탈을 타고 내려온다',
      '밀물에 잠기는 갯벌 퇴로', '적 야간 투시 정찰 교대까지의 틈', '폭주하는 열차가 종착역으로 돌진한다',
      '구조물 폭파 카운트가 시작됐다', '해가 떨어지면 야수가 깨어난다', '산소 잔량이 빨갛게 깜빡인다',
    ],
  },
  {
    key: 'comp', label: '합병증(꼬이는 변수)',
    pool: [
      '시그니처 무기가 부서진다', '믿었던 동료가 배신한다', '무전·통신이 두절된다',
      '민간인이 사선에 들어온다', '주인공이 치명상을 입는다', '탄약이 떨어져 백병전이 된다',
      '예상보다 강한 숨은 적이 등장한다', '엄폐물이 통째로 붕괴한다', '함정이 발동해 고립된다',
      '아군 부상자를 버릴 수 없다', '적이 인질을 방패로 쓴다', '장비/스킬이 봉인된다',
      '지원 부대가 길을 잃거나 늦는다', '폭우/모래폭풍으로 시야가 사라진다', '내공/마나가 바닥난다',
      '적이 이쪽 작전을 미리 알고 있다',
      '폭발물이 불발/오작동한다', '구해야 할 대상이 명령을 거부한다', '적 지휘관이 예상 밖 인물이다',
      '퇴로가 무너져 앞으로 갈 수밖에 없다', '아군 저격수가 사선을 확보하지 못한다', '시민이 패닉으로 흩어진다',
      '두 번째 부대가 측면을 친다', '날씨가 급변해 작전이 어그러진다',
    ],
  },
  {
    key: 'turn', label: '판을 뒤집는 한 수',
    pool: [
      '체호프의 환경(샹들리에·가스밸브·강물)을 회수한다', '적의 절기/패턴을 읽고 파훼한다', '미끼로 적을 유인해 함정에 빠뜨린다',
      '마지막 한 발/마지막 내공으로 급소를 친다', '봉인했던 시그니처 기술을 해방한다', '거짓 정보로 적의 지휘를 교란한다',
      '희생적 후위가 시간을 벌어준다', '지형을 무너뜨려 적을 쓸어버린다', '약점이 드러난 순간을 노려 제압한다',
      '아군의 신호탄/지원을 정확한 타이밍에 부른다', '적의 무기를 빼앗아 되돌려준다', '심리전으로 적의 전열을 흔든다',
      '복선으로 깔아둔 동료의 선물을 꺼낸다', '두 적을 서로 싸우게 만든다', '예상 밖 경로(환풍구·하수도·절벽)로 우회한다',
      '시계가 멎는 그 1초에 목표를 달성한다',
      '부서진 무기를 즉석 함정으로 개조한다', '연막·섬광으로 시야를 빼앗고 파고든다', '적 통신을 가로채 가짜 명령을 흘린다',
      '높은 곳을 선점해 사선을 장악한다', '적의 자만을 유도해 빈틈을 만든다', '폭발 반동을 이용해 거리를 좁힌다',
      '인질을 먼저 빼돌려 협상 카드를 무력화한다', '누적된 부상을 역이용한 기만으로 허를 찌른다',
    ],
  },
  {
    key: 'goal', label: '목표(무엇을 노리는가)',
    pool: [
      '인질을 살려서 빼낸다', '폭탄/장치를 시한 내 해제한다', '거점을 끝까지 사수한다',
      '봉쇄선을 돌파해 탈출한다', '적 지휘관을 제거한다', '핵심 정보/기밀을 탈취한다',
      '다리/보급선을 폭파해 끊는다', '부상자를 안전지대로 후송한다', '증인을 적보다 먼저 확보한다',
      '추출 지점까지 살아서 도달한다', '적의 의식/봉인을 저지한다', '동료의 시신을 회수한다',
      '게이트/던전 보스를 시간 내 처치한다', '항복/협상을 끌어낸다', '적의 추격을 따돌린다',
      '잃어버린 무기/유물을 되찾는다', '아군 본대가 빠질 시간을 번다', '적의 진짜 흑막 정체를 밝힌다',
      '민간인을 사선 밖으로 대피시킨다', '기지를 점령해 거점화한다',
    ],
  },
  {
    key: 'foe', label: '맞서는 적(빌런 구도)',
    pool: [
      '압도적 수의 정규군', '주인공보다 강한 숙적', '냉혹한 청부 암살자',
      '광기 어린 컬트/광신 집단', '비정한 용병단', '거대 기갑/괴수 병기',
      '같은 부대 출신 배신자', '얼굴 없는 저격수', '무자비한 군벌 지휘관',
      '초인적 각성 빌런', '비급을 훔친 사파 고수', '체제를 등에 업은 부패 권력',
      '인질을 방패로 쓰는 협박범', '한때 스승이었던 자', '자동 방어 시스템과 드론 떼',
      '광역 마법을 쓰는 흑막', '시간을 다투는 자연 재해', '국경을 넘어온 침공군',
    ],
  },
  {
    key: 'cost', label: '대가·여파(잃는 것)',
    pool: [
      '동료 한 명을 잃는다', '시그니처 무기를 영영 못 쓴다', '평생 남을 부상을 얻는다',
      '지켜야 할 거점/마을이 불탄다', '신념에 금이 가는 선택을 한다', '적이지만 존경하던 자를 베어야 한다',
      '승리하지만 진짜 흑막을 놓친다', '아군의 신뢰를 일부 잃는다', '구하려던 인질 중 하나를 잃는다',
      '돌이킬 수 없는 트라우마가 새겨진다', '비밀/정체가 탄로 날 위기에 처한다', '다음 전투를 위한 자원을 모두 소진한다',
      '상관의 명령을 어겨 군법에 회부될 처지다', '구원자라는 명성에 금이 간다', '적에게 약점을 들켜버린다',
      '오랜 동맹과 등을 돌리게 된다', '복수의 명분을 잃는다', '몸의 일부를 영영 잃는다',
    ],
  },
  {
    key: 'sense', label: '핍진성 감각 한 줄(소리·냄새·신체)',
    pool: [
      '화약 냄새와 귀가 먹먹한 정적이 교차한다', '금속이 맞부딪치는 비명과 피비린내', '폐가 타들어가고 심장이 터질 듯하다',
      '반동이 어깨를 때리고 손끝 감각이 무뎌진다', '식은땀과 함께 시야가 좁아진다(터널 비전)', '흙먼지가 입안에 씹히고 살이 찢기는 소리',
      '아드레날린에 시간이 슬로모션처럼 늘어진다', '총성이 공기를 가르며 갈라진다', '통증이 옆구리에서 번지며 숨이 짧아진다',
      '땀에 젖은 손이 무기 자루를 미끄러뜨린다', '귀울림 너머로 동료의 외침이 멀게 들린다', '차가운 빗물과 뜨거운 피가 뒤섞인다',
      '엔진음·포성·비명이 한 덩어리로 짓누른다', '연기 사이로 적의 실루엣만 어른거린다',
      '입안에 비릿한 쇳내가 고인다', '발밑에서 탄피가 미끄럽게 굴러간다', '뜨거운 총열이 손바닥을 지진다',
      '폭압이 가슴을 후려쳐 숨이 막힌다', '땀이 눈에 들어가 시야가 흐려진다', '멀리서 다가오는 군화 소리가 땅을 울린다',
    ],
  },
]

// 조합수(곱) — 28·24·22·24·24·20·18·18·20 ≈ 1.1조 (1e12 이상, 핵심 생성기)
const COMBO = SLOTS.reduce((n, s) => n * s.pool.length, 1)
function fmtNum(n: number): string {
  // 억/조 단위 한국어 근사 표기 + 정확 콤마
  if (n >= 1e12) return `약 ${(n / 1e12).toFixed(2)}조 (${n.toLocaleString('en-US')})`
  if (n >= 1e8) return `약 ${(n / 1e8).toFixed(2)}억 (${n.toLocaleString('en-US')})`
  return n.toLocaleString('en-US')
}

// 직전과 다른 값을 뽑는다(연속 중복 회피).
function pick(pool: string[], prev?: string): string {
  if (pool.length <= 1) return pool[0] ?? ''
  let v = pool[Math.floor(Math.random() * pool.length)]
  let guard = 0
  while (v === prev && guard++ < 8) v = pool[Math.floor(Math.random() * pool.length)]
  return v
}

type SetPiece = Record<string, string>
function setPieceLine(s: SetPiece): string {
  return `【${s.arena}】 ${s.force} (적: ${s.foe}) — 목표: ${s.goal}. 시계: ${s.clock}. 합병증: ${s.comp}. 역전: ${s.turn}. (대가: ${s.cost} / 감각: ${s.sense})`
}

// ── 직렬화/저장 ──────────────────────────────────────────────
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function normItem(x: any): Item | null {
  if (!x || typeof x !== 'object') return null
  const kind: Kind = x.kind === 'act' ? 'act' : 'beat'
  return {
    id: String(x.id || newId()),
    kind,
    text: typeof x.text === 'string' ? x.text : '',
    note: typeof x.note === 'string' ? x.note : '',
    done: !!x.done,
  }
}
function buildFromTemplate(t: Template): Item[] {
  return t.rows.map((r) => ({ id: newId(), kind: r.kind, text: r.text, note: r.note || '', done: false }))
}
function load(): Saved {
  const fallback = (): Saved => {
    const t = TEMPLATES[0]
    return { templateId: t.id, items: buildFromTemplate(t), selectedId: null }
  }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback()
    const p = JSON.parse(raw)
    if (!p || !Array.isArray(p.items)) return fallback()
    const items = p.items.map(normItem).filter((i: Item | null): i is Item => i !== null)
    if (items.length === 0) return fallback()
    return {
      templateId: typeof p.templateId === 'string' ? p.templateId : TEMPLATES[0].id,
      items,
      selectedId: typeof p.selectedId === 'string' ? p.selectedId : null,
    }
  } catch { return fallback() }
}

// 들여쓴 텍스트로 직렬화(act 머리, beat 들여씀).
function toText(items: Item[]): string {
  return items
    .map((it) => (it.kind === 'act' ? '' : '    ') + (it.text || '(빈 항목)') + (it.done ? ' ✓' : ''))
    .join('\n')
}
// 프로젝트 본문용 HTML(act = 굵은 단락 + 메모, beat = 목록).
function toHtml(items: Item[]): string {
  let out = ''
  let inList = false
  const closeList = () => { if (inList) { out += '</ul>'; inList = false } }
  for (const it of items) {
    const text = escHtml(it.text || '(빈 항목)')
    const note = it.note ? `<br><span style="color:#888;font-size:0.9em">${escHtml(it.note)}</span>` : ''
    if (it.kind === 'act') {
      closeList()
      out += `<p><strong>${text}</strong>${note}</p>`
    } else {
      if (!inList) { out += '<ul>'; inList = true }
      out += `<li>${it.done ? '✓ ' : ''}${text}${note}</li>`
    }
  }
  closeList()
  return out || '<p>(빈 개요)</p>'
}

// ── 컴포넌트 ─────────────────────────────────────────────────
export default function ActionOutline({ payload }: { payload?: Record<string, unknown> }) {
  const genreCtx = typeof payload?.genre === 'string' ? (payload!.genre as string) : '액션·전쟁'

  const init = useRef<Saved>()
  if (!init.current) init.current = load()

  const [templateId, setTemplateId] = useState<string>(init.current.templateId)
  const [items, setItems] = useState<Item[]>(init.current.items)
  const [selectedId, setSelectedId] = useState<string | null>(init.current.selectedId)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [openNote, setOpenNote] = useState<string | null>(null)
  const [note, setNote] = useState('')

  // 세트피스 생성기 상태
  const [showGen, setShowGen] = useState(false)
  const [piece, setPiece] = useState<SetPiece>(() => {
    const m: SetPiece = {}; SLOTS.forEach((s) => { m[s.key] = pick(s.pool) }); return m
  })
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)

  const mounted = useRef(true)
  const editRef = useRef<HTMLTextAreaElement | null>(null)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingNewId = useRef<string | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; if (noteTimer.current) clearTimeout(noteTimer.current) }
  }, [])

  // 자동 저장 — 차단/용량초과 graceful
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ templateId, items, selectedId })) }
    catch { flash('이 브라우저에서 저장이 막혀 있어 새로고침하면 개요가 사라질 수 있어요.') }
  }, [templateId, items, selectedId])

  // 굴림 애니메이션 자동 해제
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 320)
    return () => window.clearTimeout(t)
  }, [rolling])

  // 편집 시작 시 포커스
  useEffect(() => {
    if (editingId && editRef.current) {
      const el = editRef.current
      el.focus()
      const len = el.value.length
      try { el.setSelectionRange(len, len) } catch { /* noop */ }
      el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'
    }
  }, [editingId])

  function flash(msg: string) {
    if (!mounted.current) return
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 3200)
  }

  const tpl = useMemo(() => TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0], [templateId])

  // ── 템플릿 적용 ──
  const applyTemplate = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id)
    if (!t) return
    if (items.length > 0 && !window.confirm(`'${t.name}' 템플릿으로 개요를 새로 채울까요? 현재 개요는 대체됩니다.`)) return
    setTemplateId(id)
    setItems(buildFromTemplate(t))
    setSelectedId(null)
    cancelEdit()
    flash(`'${t.name}' 구조 템플릿을 적용했어요.`)
  }

  // ── 편집 ──
  const beginEdit = (id: string) => {
    const it = items.find((x) => x.id === id)
    if (!it) return
    setSelectedId(id); setEditingId(id); setDraft(it.text)
  }
  const commitEdit = () => {
    if (!editingId) return
    const id = editingId; const text = draft
    if (pendingNewId.current === id && text.trim() === '') {
      setItems((prev) => prev.filter((x) => x.id !== id))
      if (selectedId === id) setSelectedId(null)
      pendingNewId.current = null; setEditingId(null); setDraft(''); return
    }
    pendingNewId.current = null
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, text } : x)))
    setEditingId(null); setDraft('')
  }
  const cancelEdit = () => {
    const id = editingId
    if (id && pendingNewId.current === id && draft.trim() === '') {
      setItems((prev) => prev.filter((x) => x.id !== id))
      if (selectedId === id) setSelectedId(null)
    }
    pendingNewId.current = null; setEditingId(null); setDraft('')
  }

  // ── 추가 ──
  const addItem = (kind: Kind) => {
    const node: Item = { id: newId(), kind, text: kind === 'act' ? '새 막/장' : '새 비트', note: '', done: false }
    setItems((prev) => {
      if (!selectedId) return [...prev, node]
      const idx = prev.findIndex((x) => x.id === selectedId)
      if (idx < 0) return [...prev, node]
      const next = [...prev]; next.splice(idx + 1, 0, node); return next
    })
    setSelectedId(node.id); setEditingId(node.id); setDraft(node.text); pendingNewId.current = node.id
  }

  // ── 삭제 ──
  const del = (id: string) => {
    const it = items.find((x) => x.id === id)
    if (!it) return
    if (!window.confirm(`'${(it.text || '(빈 항목)').slice(0, 30)}' 항목을 삭제할까요?`)) return
    setItems((prev) => prev.filter((x) => x.id !== id))
    if (selectedId === id) setSelectedId(null)
    if (editingId === id) cancelEdit()
  }

  // ── 이동 ──
  const move = (id: string, dir: -1 | 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === id)
      const t = idx + dir
      if (idx < 0 || t < 0 || t >= prev.length) { flash(dir < 0 ? '이미 맨 위입니다.' : '이미 맨 아래입니다.'); return prev }
      const next = [...prev]; const [m] = next.splice(idx, 1); next.splice(t, 0, m); return next
    })
  }

  const toggleDone = (id: string) => setItems((prev) => prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x)))

  const clearAll = () => {
    if (!items.length) return
    if (!window.confirm('개요 전체를 비울까요? 모든 항목이 삭제됩니다.')) return
    setItems([]); setSelectedId(null); cancelEdit()
  }

  // ── 세트피스 생성기 ──
  const rollAll = () => {
    setRolling(true)
    setPiece((prev) => {
      const next: SetPiece = { ...prev }
      SLOTS.forEach((s) => { if (!locked[s.key]) next[s.key] = pick(s.pool, prev[s.key]) })
      return next
    })
  }
  const rollOne = (key: string) => {
    const s = SLOTS.find((x) => x.key === key); if (!s) return
    setPiece((prev) => ({ ...prev, [key]: pick(s.pool, prev[key]) }))
  }
  const toggleLock = (key: string) => setLocked((l) => ({ ...l, [key]: !l[key] }))

  // 생성한 세트피스를 개요에 비트로 삽입(선택 항목 아래 또는 끝).
  const insertSetPiece = () => {
    const node: Item = {
      id: newId(), kind: 'beat',
      text: '💥 세트피스 — ' + piece.arena + ': ' + piece.force + ' / 목표: ' + piece.goal,
      note: setPieceLine(piece),
      done: false,
    }
    setItems((prev) => {
      if (!selectedId) return [...prev, node]
      const idx = prev.findIndex((x) => x.id === selectedId)
      if (idx < 0) return [...prev, node]
      const next = [...prev]; next.splice(idx + 1, 0, node); return next
    })
    setSelectedId(node.id)
    flash('세트피스를 개요에 비트로 끼워 넣었어요.')
  }

  // 세트피스 한 줄을 글감(snippets) 라이브러리에 담기.
  const setPieceToLibrary = () => {
    addToLibrary('snippets', { text: setPieceLine(piece), source: '액션·전쟁 개요 빌더', tags: ['액션·전쟁', '세트피스', piece.arena] })
    flash('세트피스를 글감 라이브러리(snippets)에 담았어요.')
  }

  // ── 프로젝트 연동: 개요를 원고 '개요' 폴더에 문서로 추가 ──
  const addOutlineToProject = () => {
    if (!items.length) { flash('내보낼 개요가 없어요.'); return }
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = toHtml(items)
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '개요',
      title: `액션·전쟁 개요 — ${tpl.name}`,
      bodyHtml,
      meta: { 장르: '액션·전쟁', 구조: tpl.name, 하위장르: tpl.sub, 항목수: String(items.length), 막수: String(items.filter((i) => i.kind === 'act').length) },
    })
    flash(id ? '프로젝트 원고 "개요" 폴더에 개요 문서를 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }

  // 개요 전체를 한 글감으로 라이브러리에 담기.
  const outlineToLibrary = () => {
    if (!items.length) { flash('담을 개요가 없어요.'); return }
    addToLibrary('snippets', { text: `[액션·전쟁 개요 · ${tpl.name}]\n` + toText(items), source: '액션·전쟁 개요 빌더', tags: ['액션·전쟁', '개요', tpl.sub] })
    flash('개요 전체를 글감 라이브러리(snippets)에 담았어요.')
  }

  // 편집 키 처리
  const onEditKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() }
    else if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
  }

  const actCount = items.filter((i) => i.kind === 'act').length
  const doneCount = items.filter((i) => i.done).length

  // ── 스타일 ─────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' }
  const head: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', display: 'flex', flexDirection: 'column', gap: 8 }
  const titleRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
  const tplRow: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap' }
  const tplBtn = (active: boolean): React.CSSProperties => ({
    fontSize: 12, padding: '5px 10px', borderRadius: 999, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'var(--chrome-2)', color: active ? 'var(--paper)' : 'var(--text)',
  })
  const descBox: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const toolbar: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--border)' }
  const sep: React.CSSProperties = { width: 1, alignSelf: 'stretch', background: 'var(--border)', margin: '2px 4px' }
  const noteBar: React.CSSProperties = { padding: '6px 12px', fontSize: 12, color: 'var(--warn)', background: 'var(--paper)', borderBottom: '1px solid var(--border)', lineHeight: 1.5 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: '8px 8px 14px' }
  const footer: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--chrome-2)', fontSize: 12, color: 'var(--muted)' }
  const linkbar: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--chrome-2)' }

  return (
    <div style={wrap}>
      {/* 헤더: 제목 + 구조 템플릿 선택 */}
      <div style={head}>
        <div style={titleRow}>
          <span style={{ fontSize: 16 }}><Emoji e="⚔️"/></span>
          <strong style={{ fontSize: 14 }}>액션·전쟁 개요 빌더</strong>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {genreCtx}</span>
        </div>
        <div style={tplRow}>
          {TEMPLATES.map((t) => (
            <span key={t.id} style={tplBtn(t.id === templateId)} onClick={() => applyTemplate(t.id)} role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyTemplate(t.id) } }}
              title={t.desc}><Emoji e={t.icon}/> {t.name}</span>
          ))}
        </div>
        <div style={descBox}><Emoji e={tpl.icon}/> <strong style={{ color: 'var(--text)' }}>{tpl.sub}</strong> — {tpl.desc}</div>
      </div>

      {/* 툴바 */}
      <div style={toolbar}>
        <button className="btn-primary" onClick={() => addItem('act')} title="막/장 머리 추가">＋ 막/장</button>
        <button className="minibtn" onClick={() => addItem('beat')} title="세부 비트 추가">＋ 비트</button>
        <div style={sep} />
        <button className="minibtn" onClick={() => selectedId && move(selectedId, -1)} disabled={!selectedId} title="위로 이동">↑</button>
        <button className="minibtn" onClick={() => selectedId && move(selectedId, 1)} disabled={!selectedId} title="아래로 이동">↓</button>
        <button className="minibtn" onClick={() => selectedId && beginEdit(selectedId)} disabled={!selectedId} title="선택 항목 편집"><Emoji e="✏️"/> 편집</button>
        <div style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => setShowGen((v) => !v)} title="세트피스(set-piece) 생성기"><Emoji e="💥"/> 세트피스 생성{showGen ? ' ▴' : ' ▾'}</button>
      </div>

      {note && <div style={noteBar}>{note}</div>}

      {/* 세트피스 생성기 */}
      {showGen && (
        <SetPieceGen
          piece={piece} locked={locked} rolling={rolling}
          onRollAll={rollAll} onRollOne={rollOne} onToggleLock={toggleLock}
          onInsert={insertSetPiece} onToLibrary={setPieceToLibrary}
        />
      )}

      {/* 본문: 개요 목록 */}
      <div style={body}>
        {items.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, gap: 12, padding: 20 }}>
            <div style={{ fontSize: 40 }}><Emoji e="⚔️"/></div>
            <div>개요가 비어 있어요.<br />위에서 <strong>구조 템플릿</strong>을 고르면 액션·전쟁 표준 막/비트가 자동으로 깔립니다.</div>
            <button className="btn-primary" onClick={() => applyTemplate(templateId)}><Emoji e={tpl.icon}/> '{tpl.name}' 템플릿 채우기</button>
          </div>
        ) : (
          <div>
            {items.map((it, i) => (
              <ItemRow
                key={it.id} item={it} index={i} count={items.length}
                selected={selectedId === it.id} editing={editingId === it.id}
                draft={draft} editRef={editRef} noteOpen={openNote === it.id}
                onSelect={(id) => { setSelectedId(id); if (editingId && editingId !== id) commitEdit() }}
                onBeginEdit={beginEdit} onDraft={setDraft} onCommit={commitEdit} onEditKey={onEditKey}
                onMove={move} onDelete={del} onToggleDone={toggleDone}
                onToggleNote={(id) => setOpenNote((p) => (p === id ? null : id))}
              />
            ))}
          </div>
        )}
      </div>

      {/* 연계 바 */}
      <div className="linkbar" style={linkbar}>
        <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
        <button className="linkbtn" onClick={addOutlineToProject} disabled={!items.length || !hasProjectBridge()}
          title={hasProjectBridge() ? '개요를 프로젝트 원고 "개요" 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={outlineToLibrary} disabled={!items.length} title="개요 전체를 글감 라이브러리에 담기"><Emoji e="🗂"/> 글감으로 담기</button>
        <span style={{ flex: 1 }} />
        <button className="linkbtn" onClick={() => openToolLinked('chase-scene-gen', { genre: genreCtx })} title="추격·탈출 생성기 열기"><Emoji e="🏃"/> 추격 생성기</button>
        <button className="linkbtn" onClick={() => openToolLinked('outline-tree', { genre: genreCtx })} title="계층형 개요 트리 열기"><Emoji e="🌳"/> 개요 트리</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre: genreCtx })} title="플롯 피라미드 열기"><Emoji e="🔺"/> 플롯 피라미드</button>
      </div>

      {/* 푸터 통계 */}
      <div style={footer}>
        <span>
          막/장 <strong style={{ color: 'var(--text)' }}>{actCount}</strong> · 항목 <strong style={{ color: 'var(--text)' }}>{items.length}</strong> · 완료 <strong style={{ color: 'var(--ok)' }}>{doneCount}</strong>
        </span>
        <button className="minibtn" onClick={clearAll} disabled={!items.length}>전체 비우기</button>
      </div>
    </div>
  )
}

// ── 개요 행 ──────────────────────────────────────────────────
interface RowProps {
  item: Item
  index: number
  count: number
  selected: boolean
  editing: boolean
  draft: string
  editRef: React.RefObject<HTMLTextAreaElement>
  noteOpen: boolean
  onSelect: (id: string) => void
  onBeginEdit: (id: string) => void
  onDraft: (s: string) => void
  onCommit: () => void
  onEditKey: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onMove: (id: string, dir: -1 | 1) => void
  onDelete: (id: string) => void
  onToggleDone: (id: string) => void
  onToggleNote: (id: string) => void
}
function ItemRow(props: RowProps) {
  const { item, index, count, selected, editing } = props
  const [hover, setHover] = useState(false)
  const isAct = item.kind === 'act'

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'flex-start', gap: 6,
    padding: isAct ? '8px 8px' : '5px 8px',
    paddingLeft: isAct ? 10 : 30,
    marginTop: isAct ? 6 : 0,
    borderRadius: 8,
    background: selected ? 'color-mix(in srgb, var(--accent) 16%, transparent)' : hover ? 'var(--chrome-2)' : 'transparent',
    border: selected ? '1px solid color-mix(in srgb, var(--accent) 45%, transparent)' : '1px solid transparent',
    cursor: 'default', transition: 'background 0.12s',
  }
  const bullet: React.CSSProperties = {
    flexShrink: 0, width: 16, textAlign: 'center', userSelect: 'none',
    color: isAct ? 'var(--accent)' : 'var(--muted)', fontSize: isAct ? 12 : 9, marginTop: 3,
  }
  const label: React.CSSProperties = {
    flex: 1, minWidth: 0, lineHeight: 1.5, padding: '1px 2px', wordBreak: 'break-word', whiteSpace: 'pre-wrap',
    fontSize: isAct ? 14 : 13, fontWeight: isAct ? 700 : 400,
    color: item.done ? 'var(--muted)' : 'var(--text)', textDecoration: item.done ? 'line-through' : 'none',
  }
  const editBox: React.CSSProperties = {
    flex: 1, minWidth: 0, fontSize: isAct ? 14 : 13, lineHeight: 1.5, padding: '2px 6px', resize: 'none', overflow: 'hidden',
    border: '1px solid var(--accent)', borderRadius: 6, background: 'var(--paper)', color: 'var(--text)', font: 'inherit', boxSizing: 'border-box',
  }
  const actions: React.CSSProperties = { flexShrink: 0, display: 'flex', gap: 1, alignItems: 'center', opacity: hover || selected ? 1 : 0, transition: 'opacity 0.12s' }
  const act: React.CSSProperties = { border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '3px 4px', borderRadius: 5 }
  const noteText: React.CSSProperties = { marginLeft: 30, marginRight: 8, marginBottom: 4, padding: '6px 10px', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }

  const onInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; props.onDraft(el.value)
  }

  return (
    <div>
      <div style={rowStyle} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={() => props.onSelect(item.id)}>
        <span style={bullet} onClick={(e) => { e.stopPropagation(); props.onToggleDone(item.id) }} title={item.done ? '완료 해제' : '완료 표시'}>
          {item.done ? '✓' : isAct ? '◆' : '○'}
        </span>
        {editing ? (
          <textarea ref={props.editRef} style={editBox} value={props.draft} rows={1}
            onChange={onInput} onInput={onInput} onKeyDown={props.onEditKey} onBlur={props.onCommit}
            onClick={(e) => e.stopPropagation()}
            placeholder="내용 (Enter 저장 · Shift+Enter 줄바꿈 · Esc 취소)" aria-label="항목 편집" />
        ) : (
          <span style={label} onDoubleClick={(e) => { e.stopPropagation(); props.onBeginEdit(item.id) }} title="더블클릭하여 편집">
            {emojify(item.text) || '(빈 항목 — 더블클릭하여 입력)'}
          </span>
        )}
        {!editing && (
          <span style={actions} onClick={(e) => e.stopPropagation()}>
            {item.note && <button style={{ ...act, color: props.noteOpen ? 'var(--accent)' : 'var(--muted)' }} className="minibtn" title="작법 가이드 보기" onClick={() => props.onToggleNote(item.id)}><Emoji e="💡"/></button>}
            <button style={act} className="minibtn" title="편집" onClick={() => props.onBeginEdit(item.id)}><Emoji e="✏️"/></button>
            <button style={act} className="minibtn" title="위로" onClick={() => props.onMove(item.id, -1)} disabled={index === 0}>↑</button>
            <button style={act} className="minibtn" title="아래로" onClick={() => props.onMove(item.id, 1)} disabled={index === count - 1}>↓</button>
            <button style={act} className="minibtn" title="삭제" onClick={() => props.onDelete(item.id)}><Emoji e="🗑️"/></button>
          </span>
        )}
      </div>
      {props.noteOpen && item.note && <div style={noteText}>{emojify(item.note)}</div>}
    </div>
  )
}

// ── 세트피스 생성기 패널 ─────────────────────────────────────
interface GenProps {
  piece: SetPiece
  locked: Record<string, boolean>
  rolling: boolean
  onRollAll: () => void
  onRollOne: (key: string) => void
  onToggleLock: (key: string) => void
  onInsert: () => void
  onToLibrary: () => void
}
function SetPieceGen(props: GenProps) {
  const { piece, locked, rolling } = props
  const panel: React.CSSProperties = { borderBottom: '1px solid var(--border)', background: 'var(--paper)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '52%', overflow: 'auto' }
  const headRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
  const combo: React.CSSProperties = { fontSize: 11, color: 'var(--muted)' }
  const slotRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 0', borderTop: '1px solid var(--border)' }
  const slotLabel: React.CSSProperties = { flexShrink: 0, width: 150, fontSize: 11, color: 'var(--muted)', paddingTop: 3, lineHeight: 1.4 }
  const slotVal = (dim: boolean): React.CSSProperties => ({ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.5, opacity: dim ? 0.4 : 1, transition: 'opacity 0.15s' })
  const lockBtn = (on: boolean): React.CSSProperties => ({ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, padding: '2px 4px', opacity: on ? 1 : 0.45 })

  return (
    <div style={panel}>
      <div style={headRow}>
        <strong style={{ fontSize: 13 }}><Emoji e="💥"/> 세트피스(set-piece) 생성기</strong>
        <span style={{ flex: 1 }} />
        <button className="btn-primary" onClick={props.onRollAll}><Emoji e="🎲"/> 전체 재생성</button>
      </div>
      <div style={combo}>슬롯 무작위 조합 · 가능한 조합수 <strong style={{ color: 'var(--accent)' }}>{fmtNum(COMBO)}</strong> 가지 (잠금된 칸은 고정)</div>

      {SLOTS.map((s) => (
        <div key={s.key} style={slotRow}>
          <span style={slotLabel}>{s.label}</span>
          <span style={slotVal(rolling && !locked[s.key])}>{piece[s.key]}</span>
          <button style={lockBtn(!!locked[s.key])} className="minibtn" onClick={() => props.onToggleLock(s.key)} title={locked[s.key] ? '잠금 해제' : '잠금(고정)'}>{locked[s.key] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
          <button className="minibtn" style={{ fontSize: 11, padding: '2px 6px' }} onClick={() => props.onRollOne(s.key)} title="이 칸만 재생성" disabled={!!locked[s.key]}>↻</button>
        </div>
      ))}

      <div style={{ marginTop: 4, padding: '8px 10px', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, color: 'var(--text)', lineHeight: 1.6 }}>
        {setPieceLine(piece)}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={props.onInsert} title="이 세트피스를 개요에 비트로 끼워 넣기">↳ 개요에 끼워 넣기</button>
        <button className="linkbtn" onClick={props.onToLibrary} title="이 세트피스 한 줄을 글감 라이브러리에 담기"><Emoji e="🗂"/> 글감으로 담기</button>
      </div>
    </div>
  )
}
