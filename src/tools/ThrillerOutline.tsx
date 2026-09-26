// 스릴러 개요 빌더 — 스릴러·서스펜스 장르의 표준 구조(3막+위협 점증/카운트다운 절차형/도메스틱 심리/
// 스파이·정치/리걸 법정/액션 추적/연쇄살인 수사)에 맞춘 장/막 개요 템플릿을 제공한다. 템플릿을 고르면
// 각 막·비트가 작법 가이드와 함께 자동으로 깔린다. 항목은 인라인 편집·추가·순서 이동·완료 체크·삭제 가능.
// "위협 비트(긴장 마일스톤)"는 슬롯 풀에서 무작위 조합(잠금/재생성, 조합수 표시, 1조↑)해 한 챕터의
// 긴장 비트로 끼워 넣을 수 있다. 작성한 개요는 프로젝트 원고 '개요' 폴더에 문서로 추가하고, 위협 비트
// 한 줄은 글감(snippets) 라이브러리에 담을 수 있다.
// 자급식: react 와 './linkbus' 외 import 없음. 100% 로컬(외부 API 없음). 데이터는 localStorage 영속.
import { useState, useEffect, useRef, useMemo } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'thriller-outline', name: '스릴러 개요 빌더', icon: '🕵️', group: '구조', genre: '스릴러·서스펜스', intro: '3막 위협 점증·카운트다운·도메스틱·스파이·리걸 등 스릴러 표준 구조로 장/막 개요를 채우고 위협 비트를 끼워 넣습니다', w: 680, h: 720 }

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

const LS_KEY = 'sry:tool:thriller-outline'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return 'to_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ── 구조 템플릿(스릴러 도시에 근거) ─────────────────────────
interface TemplateRow { kind: Kind; text: string; note?: string }
interface Template {
  id: string
  name: string
  sub: string                        // 하위 장르
  icon: string
  desc: string
  rows: TemplateRow[]
}

const TEMPLATES: Template[] = [
  {
    id: 'escalate',
    name: '3막 + 위협 점증형',
    sub: '범용 스릴러',
    icon: '📈',
    desc: '스릴러 표준 골격. 1막 25% 개입사건→되돌아갈 수 없는 선, 중간점 판세 역전, 75% 절망, 3막 직접 대면. 매 시퀀스 위험을 한 단씩 올린다.',
    rows: [
      { kind: 'act', text: '1막 — 평온의 균열 (0~25%)', note: '평범한 일상을 짧게 보여주되 첫 페이지부터 "뭔가 잘못될 수 있다"는 압력을 깐다. 유능하지만 취약한 주인공을 세운다.' },
      { kind: 'beat', text: '콜드 오픈 / 위협의 그림자', note: '시체 발견·미래 위기 선공개("○시간 전")·평화로운 가정의 균열 암시 중 택1. 첫 훅으로 페이지를 넘기게 만든다.' },
      { kind: 'beat', text: '주인공의 일상과 결핍', note: '능력·약점·트라우마·관계를 빠르게 제시. 약점(중독·불신·과거의 실패)이 곧 클라이맥스의 취약점이 된다(체호프의 총).' },
      { kind: 'beat', text: '개입 사건(Inciting Incident)', note: '주인공을 위협에 끌어들이는 사건(실종·살인 목격·누명·협박 전화). 이해관계(stakes)를 개인적 위험으로 명확히 건다.' },
      { kind: 'beat', text: '되돌아갈 수 없는 선(Point of No Return)', note: '1막 끝. 주인공이 능동적으로 발을 들여 더 이상 물러설 수 없게 만든다. 빌런(혹은 그 윤곽)을 처음 체감.' },
      { kind: 'act', text: '2막 전반 — 대응과 추적 (25~50%)', note: '주인공이 조사·대응하며 적의 윤곽이 드러난다. 레드 헤링과 진짜 단서를 섞어 정보를 통제한다.' },
      { kind: 'beat', text: '조사 / 단서와 레드 헤링', note: '같은 사실이 1회독엔 무해, 재독엔 결정적이 되도록 단서를 이중 기능으로 배치. 의심을 엉뚱한 곳으로 한 번 유도한다.' },
      { kind: 'beat', text: '적의 한 수 — 첫 반격', note: '빌런이 주인공보다 한발 앞섬을 보여준다. "스릴러의 질은 빌런의 질에 비례한다." 위험을 가까운 이에게로 한 단 올린다.' },
      { kind: 'beat', text: '중간점(Midpoint) — 판세 역전', note: '가짜 승리 또는 진짜 위협의 실체 노출. 큰 반전으로 판을 뒤집고 후반을 위쪽으로 가속한다.' },
      { kind: 'act', text: '2막 후반 — 적의 우위 (50~75%)', note: '적이 우위에 선다. 조력자 상실·신뢰 붕괴·편집증("믿을 사람이 없다"). 위협을 다수/공동체로 확장.' },
      { kind: 'beat', text: '잘못된 신뢰 / 배신', note: '조력자가 배신자, 권위자가 흑막. False Ally로 "믿을 사람이 없다"는 편집증을 조성한다.' },
      { kind: 'beat', text: '추격·은신·함정 시퀀스', note: '물리적 긴장 3종(추격/은신/함정) 중 하나로 호흡을 올린다. 고강도 뒤엔 짧은 숨 고르기로 완급을 준다.' },
      { kind: 'beat', text: '모든 것을 잃은 순간(All Is Lost) — 75%', note: '가장 밑바닥. 무언가/누군가를 잃고 무장 해제·고립·부상 상태로 떨어진다. 티킹 클락은 거의 0에 근접.' },
      { kind: 'act', text: '3막 — 직접 대면과 해소 (75~100%)', note: '마지막 정보 퍼즐을 맞추고 주인공의 능동적 선택으로 정면 충돌. 카운트다운 0초와 클라이맥스를 겹친다.' },
      { kind: 'beat', text: '마지막 퍼즐 / 진실의 재배열', note: '체호프의 총·복선·진짜 정체가 여기서 회수된다. "그래서 그게 그거였구나"의 공정한 반전.' },
      { kind: 'beat', text: '직접 대면(Confrontation)', note: '가장 불리한 조건에서 주인공이 빌런과 정면으로 맞선다. 중간자·우연이 아닌 능동적 선택으로 해결해야 만족도가 높다.' },
      { kind: 'beat', text: '거짓 결말 / 막판 부활', note: '위협이 끝난 듯하다가 한 번 더 솟구치는 "마지막 한 방". 슬래셔·액션 스릴러에서 특히 효과적.' },
      { kind: 'beat', text: '해소 + 여진(스팅어)', note: '도덕적 대가가 따르는 승리(무손실 승리는 싱겁다). 마지막 한 줄 반전(stinger)으로 불안의 여운을 남길 수 있다.' },
    ],
  },
  {
    id: 'countdown',
    name: '카운트다운·절차형',
    sub: '액션/테크노 스릴러',
    icon: '⏱️',
    desc: '포사이스 『자칼의 날』식 명시 타이머. 위협과 추격이 시계와 함께 조여온다. 절차의 디테일과 시간 압박이 긴장의 축.',
    rows: [
      { kind: 'act', text: '1막 — 시한의 점화', note: '명시적 마감(폭탄 타이머·재판일·출항·약효 소진)을 무대에 올린다. 무엇이 0이 되면 무엇을 잃는가를 못박는다.' },
      { kind: 'beat', text: '위협의 정체와 마감 제시', note: '계획·표적·D-day를 보여준다. 독자 > 인물의 정보 비대칭(서스펜스)을 설계: 폭탄이 있다는 걸 독자만 알게.' },
      { kind: 'beat', text: '주인공/저지자의 투입', note: '시한을 막을 자가 사건에 투입된다. 한발 늦은 출발로 처음부터 시간에 쫓기게 만든다.' },
      { kind: 'act', text: '2막 전반 — 추적과 단서의 경주', note: '양측의 절차가 교차 편집된다(가해자 준비 vs 저지자 추적). 시계가 줄어들수록 챕터를 짧게.' },
      { kind: 'beat', text: '교차 편집 / 카운트 표시', note: '챕터 머리에 "D-3" "06:00" 같은 시간 라벨. 두 시간선의 거리가 좁혀지는 긴장을 시각화한다.' },
      { kind: 'beat', text: '절차의 디테일과 변수', note: '위조 여권·무기 입수·침투 경로 등 실감 나는 절차. 예상치 못한 변수(검문·고장·배신)로 일정이 틀어진다.' },
      { kind: 'beat', text: '중간점 — 시간 단축/판 뒤집기', note: '마감이 앞당겨지거나 표적이 바뀐다. 가용 시간이 급감해 압박이 폭증.' },
      { kind: 'act', text: '2막 후반 — 시계와의 사투', note: '연속된 차질로 여유가 사라진다. 저지자는 한 박자 뒤처지고, 가해자는 마지막 위치로 이동.' },
      { kind: 'beat', text: '연속 차질 / 거의 따라잡음', note: '아슬아슬하게 놓치는 "거의" 시퀀스로 좌절과 긴장을 교차. All Is Lost: 막을 수 없을 듯한 순간.' },
      { kind: 'act', text: '3막 — 0초의 대면', note: '타이머 만료점과 클라이맥스를 겹친다. 마지막 순간의 한 수로 승부.' },
      { kind: 'beat', text: '최후의 저지 / 폭발 직전', note: '가장 불리한 조건(고립·부상·정보 부족)에서 마지막 1초 역전. 거짓 해제→진짜 위협 한 번 더의 변주.' },
      { kind: 'beat', text: '해소와 대가', note: '막아냈으되 흔적이 남는다. 다음 위협의 씨앗(스팅어)을 마지막 줄에 심을 수 있다.' },
    ],
  },
  {
    id: 'domestic',
    name: '도메스틱·심리형',
    sub: '심리/가정 스릴러',
    icon: '🏠',
    desc: '플린 『나를 찾아줘』식. 안전해야 할 집·결혼·이웃이 위협의 근원. 신뢰할 수 없는 화자와 중간 반전, 이중 시점·시간선 분절이 무기.',
    rows: [
      { kind: 'act', text: '1막 — 완벽한 표면의 균열', note: '겉보기 평온한 가정/결혼/이웃을 세우되 작은 불일치(거짓말·이상한 문자·사라진 물건)를 흘린다.' },
      { kind: 'beat', text: '신뢰할 수 없는 화자 셋업', note: '기억상실·음주·정신질환·선택적 서술 중 화자의 결함을 심는다. 독자가 화자의 말을 의심하게 만들 단서를 깐다.' },
      { kind: 'beat', text: '균열의 첫 신호', note: '"누군가 집에 있었다", 물건의 위치 이동, 울리지 않는(혹은 갑자기 울리는) 전화. 위장된 일상의 섬뜩함(Domestic Uncanny).' },
      { kind: 'beat', text: '실종/사건 발생', note: '배우자 실종·이웃의 죽음·아이 관련 위협 등. 가장 안전해야 할 영역이 위협의 무대가 된다.' },
      { kind: 'act', text: '2막 전반 — 이중 시점 / 시간선 교차', note: '"지금"과 "그때"를, 혹은 두 인물의 시점을 교차해 정보를 통제·지연한다. 챕터 머리에 시점/시간 라벨.' },
      { kind: 'beat', text: '엇갈리는 두 진술', note: '같은 사건에 대한 두 시점의 모순. 독자는 누구를 믿어야 할지 흔들린다. 가짜 용의자(레드 헤링) 배치.' },
      { kind: 'beat', text: '주인공의 의심과 고립', note: '주변(경찰·가족·친구)이 주인공을 믿지 않거나, 주인공 자신이 가해자로 의심받는다.' },
      { kind: 'beat', text: '중간 반전 — 화자의 진짜 얼굴', note: '도메스틱 스릴러의 핵: 절반 지점에서 화자/관계의 진실이 뒤집힌다(예: 피해자인 줄 알았던 자가 설계자).' },
      { kind: 'act', text: '2막 후반 — 통제 불능', note: '진실이 드러날수록 위험이 커진다. 믿었던 사람의 정체, 더 깊은 비밀이 연쇄로 노출.' },
      { kind: 'beat', text: '더 깊은 비밀의 연쇄', note: '한 거짓을 덮으려 더 큰 거짓이 필요해진다. 가까운 사람("범인은 가장 가까운 사람")의 그림자가 짙어진다.' },
      { kind: 'beat', text: '폭로 직전의 위기', note: '진실을 쥔 자가 위험에 처한다. All Is Lost: 빠져나갈 수 없을 듯한 막다른 골목.' },
      { kind: 'act', text: '3막 — 대면과 (어두운) 해소', note: '집/관계의 무대 위에서 정면 대면. 다크/오픈 엔딩 옵션 — 승리를 박탈하거나 불안을 남긴다.' },
      { kind: 'beat', text: '진실의 정면 충돌', note: '심어둔 복선이 회수되며 관계의 진실이 완전히 드러난다. 공정한 반전(재독 시 단서가 보이도록).' },
      { kind: 'beat', text: '결말 — 다크 엔딩 / 막판 반전', note: '악이 이기거나, "끝나지 않은" 불안을 남기는 마지막 한 줄. 표면적 평온 아래의 균열을 다시 비춘다.' },
    ],
  },
  {
    id: 'spy',
    name: '스파이·정치형',
    sub: '첩보/정치 스릴러',
    icon: '🕶️',
    desc: '르카레식 도덕적 회색. 맥거핀(서류·코드)을 쫓는 정보전, 안전가옥·환승·이중 첩자. 누구도 믿을 수 없는 편집증과 배신.',
    rows: [
      { kind: 'act', text: '1막 — 임무의 부여', note: '국경·기관 내부 권력 다툼의 공기. 주인공에게 임무(추적·회수·암살 저지)와 맥거핀을 건다.' },
      { kind: 'beat', text: '맥거핀과 임무 제시', note: '모두가 쫓는 물건/정보(서류·디스크·핵코드). 그 자체보다 그것이 일으키는 추격이 동력이다.' },
      { kind: 'beat', text: '내부의 균열 암시', note: '기관 내 두더지(mole)·파벌 다툼의 그림자. "믿을 사람이 없다"는 편집증의 씨앗.' },
      { kind: 'beat', text: '되돌아갈 수 없는 첫 작전', note: '첫 접선·침투. 작전이 어긋나며 주인공이 깊숙이 끌려 들어간다.' },
      { kind: 'act', text: '2막 전반 — 정보전과 미행', note: '미행·도청·접선·안전가옥. 정보의 진위가 흔들리고 이중·삼중 첩자의 가능성이 드러난다.' },
      { kind: 'beat', text: '접선 / 안전가옥 / 미행', note: '교환·신원 확인·꼬리 따돌리기의 절차적 긴장. 환승역·공항·국경의 폐쇄적 압박을 활용.' },
      { kind: 'beat', text: '이중 첩자의 의심', note: '아군이 적의 첩자일 가능성. 정보 출처마다 진위를 의심하게 만들어 독자도 함께 편집증에 빠지게.' },
      { kind: 'beat', text: '중간점 — 배신의 폭로', note: '믿었던 핸들러/동료/상부의 배신이 드러난다. 임무의 진짜 목적이 처음과 다름을 알게 된다.' },
      { kind: 'act', text: '2막 후반 — 버려진 자', note: '주인공이 기관에서 버림받거나 누명을 쓴다(burned). 홀로 적과 아군 모두를 상대.' },
      { kind: 'beat', text: '소각(Burned) / 단독 행동', note: '지원이 끊기고 추격당한다. 누명 쓴 도주의 변주. 남은 인맥/단서만으로 진실에 접근.' },
      { kind: 'beat', text: '도덕적 회색의 대가', note: '대의를 위해 누군가를 희생/배신해야 하는 선택. 르카레식 "깨끗한 승리는 없다"의 무게.' },
      { kind: 'act', text: '3막 — 정체와의 대면', note: '흑막(두더지·배후 권력)과의 정면 충돌. 맥거핀의 향방이 결정된다.' },
      { kind: 'beat', text: '흑막 대면 / 맥거핀의 행방', note: '심어둔 단서로 배후를 무너뜨린다. 그러나 체제·기관은 그대로 남는 씁쓸함.' },
      { kind: 'beat', text: '쓴 승리 / 회색 엔딩', note: '이겼으되 잃은 것이 많다. 다음 게임이 이미 시작됐음을 암시하는 스팅어.' },
    ],
  },
  {
    id: 'legal',
    name: '리걸·법정형',
    sub: '리걸 스릴러',
    icon: '⚖️',
    desc: '그리샴·터로우식. 공판 일정이 곧 티킹 클락. 증거개시·배심·반대신문이 클라이맥스 단위. 누명·내부고발·거대 음모와 결합.',
    rows: [
      { kind: 'act', text: '1막 — 사건의 수임', note: '변호사/검사 주인공이 위험한 사건을 맡는다. 공판일(D-day)이 시한으로 설정된다.' },
      { kind: 'beat', text: '의뢰인과 사건의 무게', note: '누명·억울한 피고·내부고발 등. 이기지 못하면 무엇을 잃는가(생명·자유·진실)를 못박는다.' },
      { kind: 'beat', text: '거대한 적의 윤곽', note: '대기업·로펌·권력자·조직 등 만만찮은 적대 세력. 주인공보다 자원·권력에서 압도적임을 보여준다.' },
      { kind: 'beat', text: '되돌아갈 수 없는 선 — 위협의 시작', note: '협박·미행·자료 탈취. 사건을 파고들수록 신변이 위험해진다.' },
      { kind: 'act', text: '2막 전반 — 증거개시와 조사', note: '증거 수집·증인 확보·디스커버리. 진짜 단서와 함정(조작 증거)이 섞인다.' },
      { kind: 'beat', text: '핵심 증거 / 조작된 단서', note: '결정적 문서·증인. 일부는 조작·은폐돼 있다(같은 사실의 이중 기능). 레드 헤링 용의자 배치.' },
      { kind: 'beat', text: '증인의 위협과 이탈', note: '증인이 매수·협박당하거나 사라진다. 정보전·배신이 긴장의 축.' },
      { kind: 'beat', text: '중간점 — 판세 역전', note: '결정적 증거 입수 또는 상실. 사건의 진짜 배후가 예상 밖 인물임을 암시.' },
      { kind: 'act', text: '2막 후반 — 코너에 몰림', note: '징계·해임·고립·신변 위협. 믿었던 동료/판사/조력자의 배신.' },
      { kind: 'beat', text: '잘못된 신뢰 / 내부의 적', note: '같은 편인 줄 알았던 인물이 상대편. "믿을 사람이 없다"의 법정판.' },
      { kind: 'beat', text: 'All Is Lost — 공판 전야', note: '증거가 막히고 주인공이 궁지에. 마지막 카드 하나만 남은 상태.' },
      { kind: 'act', text: '3막 — 법정 클라이맥스', note: '반대신문·결정적 증거 제시·배심 평결. 말의 전쟁이 클라이맥스로 기능.' },
      { kind: 'beat', text: '결정타 반대신문 / 폭로', note: '심어둔 복선이 증언대에서 터진다. 증인의 위증을 무너뜨리는 한 방.' },
      { kind: 'beat', text: '평결과 그 너머의 대가', note: '승소/패소 너머의 진짜 결말. 정의가 실현돼도 상처가 남거나, 더 큰 음모가 살아남는 여운.' },
    ],
  },
  {
    id: 'manhunt',
    name: '연쇄·수사 추적형',
    sub: '법의학/수사 스릴러',
    icon: '🔪',
    desc: '해리스 『양들의 침묵』·디버식. 연쇄살인범 vs 프로파일러/수사관. 함정-반전형 플롯, 캣앤마우스, 다음 희생 전 막아야 하는 시한.',
    rows: [
      { kind: 'act', text: '1막 — 첫 범행과 투입', note: '연쇄의 첫(또는 다음) 범행. 수사관/프로파일러가 사건에 투입된다. 다음 희생까지의 시한을 건다.' },
      { kind: 'beat', text: '범죄 현장 / 시그니처', note: '범인의 수법·서명(signature)을 통해 빌런의 지능과 광기를 체감하게. 독자에게 단서를 한 조각씩 흘린다.' },
      { kind: 'beat', text: '수사관의 능력과 상처', note: '유능하나 트라우마/과거 실패를 안은 주인공. 그 약점이 빌런에게 이용당할 여지를 심는다.' },
      { kind: 'beat', text: '캣앤마우스의 개시', note: '범인이 수사관을 인지하고 게임을 건다. 빌런이 한발 앞섬을 보여 "만만찮은 적"을 확립.' },
      { kind: 'act', text: '2막 전반 — 프로파일링과 추적', note: '단서 분석·프로파일·용의자 압축. 레드 헤링 용의자와 진범의 그림자를 교차.' },
      { kind: 'beat', text: '프로파일 / 다음 표적 예측', note: '범행 패턴으로 다음을 예측한다. 거의 막을 뻔하다 놓치는 "거의" 시퀀스로 긴장.' },
      { kind: 'beat', text: '함정과 미스디렉션', note: '범인이 깐 함정 또는 수사진의 오판. 같은 단서가 재독 시 결정적이 되도록 이중 배치(디버식 함정-반전).' },
      { kind: 'beat', text: '중간점 — 다음 희생 / 판 뒤집기', note: '한 발 늦어 희생이 발생하거나, 범인의 진짜 정체/규모가 드러나며 판이 커진다.' },
      { kind: 'act', text: '2막 후반 — 표적이 된 수사관', note: '빌런이 수사관(혹은 그가 아끼는 이)을 직접 노린다. 위험이 개인으로 응축.' },
      { kind: 'beat', text: '개인적 위협으로의 응축', note: '범인이 주인공의 가족/조력자를 표적으로. "이 한 사람을 살리는 게 곧 전부"로 stakes 응축.' },
      { kind: 'beat', text: 'All Is Lost — 함정에 빠짐', note: '주인공이 고립·무장 해제된 채 범인의 영역에 들어선다. 시한은 거의 만료.' },
      { kind: 'act', text: '3막 — 범인과의 대면', note: '범인의 은신처/마지막 무대에서 정면 충돌. 다음 희생 시한과 클라이맥스를 겹친다.' },
      { kind: 'beat', text: '정면 충돌 / 마지막 단서 회수', note: '체호프의 총(흉터·약·습관)이 결정타가 된다. 가장 불리한 조건에서 능동적으로 제압.' },
      { kind: 'beat', text: '거짓 결말 / 여진', note: '죽은 줄 알았던 범인의 막판 부활, 또는 또 다른 모방범의 암시. 끝나지 않은 불안의 스팅어.' },
    ],
  },
]

// ── 위협 비트(긴장 마일스톤) 생성기(슬롯 풀) ─────────────────────
// 한 챕터의 긴장 비트 한 줄을 무작위 조합해 만든다.
// 조합수 = 각 풀 길이의 곱. 핵심 생성기이므로 1조(1e12) 이상을 지향.
interface Slot { key: string; label: string; pool: string[] }
const SLOTS: Slot[] = [
  {
    key: 'place', label: '압박 공간(배경)',
    pool: [
      '폭설로 고립된 산장', '외딴 섬의 별장', '정전된 고층 빌딩', '멈춰 선 엘리베이터',
      '탈선 직전의 야간열차', '난기류 속 비행기', '잠항 중인 잠수함', '폐쇄된 정신병원',
      '지하 벙커', '교외의 완벽해 보이는 주택가', '스마트홈 한가운데', '비 내리는 항만 창고',
      '인적 끊긴 지하주차장', '깜빡이는 형광등의 폐병동 복도', '한밤의 무인 휴게소', '잠긴 방(로크드 룸)',
      '안개 낀 국경 검문소', '환승 대기 중인 공항 라운지', '도청이 의심되는 안전가옥', '재판을 앞둔 텅 빈 법정',
      '봉쇄된 지하철 터널', '눈보라 치는 외딴 등대', '폐장한 놀이공원', '범람 직전의 댐 통제실',
      '엘리베이터가 끊긴 정전된 병원', '한밤중 텅 빈 사무용 빌딩', '폭풍에 갇힌 외딴 모텔', '도청 장치가 깔린 호텔 스위트',
      '눈에 갇힌 산악 연구기지', '인적 없는 새벽 고속도로 휴게소', '봉쇄된 구치소 면회실', '연기가 차오르는 지하 주차장',
      '전파가 끊긴 산속 캠핑장', '문이 잠긴 야간 데이터센터',
    ],
  },
  {
    key: 'trigger', label: '긴장 점화 사건',
    pool: [
      '울리지 않아야 할 전화가 울린다', '잠갔던 문이 열려 있다', '물건이 있던 자리에서 사라졌다',
      '백미러 속 같은 차가 계속 따라온다', '낯선 발소리가 어둠 속에서 가까워진다', '집에 누군가 다녀간 흔적이 있다',
      '받은 적 없는 메시지가 휴대폰에 떠 있다', '시신이 발견된다', '믿었던 사람의 거짓말이 들통난다',
      '카운트다운 타이머가 줄어들기 시작한다', '증인이 사라졌다', '아이/가족과 연락이 끊긴다',
      '조작된 증거가 자신을 범인으로 가리킨다', 'CCTV에 있을 수 없는 인물이 찍혔다', '약효(혹은 배터리·연료)가 바닥나간다',
      '안전가옥 위치가 적에게 새어 나갔다', '죽은 줄 알았던 사람이 나타난다', '경보가 울리고 출구가 봉쇄된다',
      '도청기/추적기가 몸에서 발견된다', '협박 편지가 도착한다', '믿었던 동료가 무전에 응답하지 않는다',
      '예고된 다음 범행 시각이 다가온다', '계좌에서 거액이 빠져나갔다', '집 앞에 낯선 차가 밤새 서 있다',
      '지운 줄 알았던 파일이 되살아나 있다', '알리바이가 거짓으로 드러난다', '인질의 영상이 도착한다',
      '추적 중이던 신호가 갑자기 끊긴다', '문 밑으로 사진 한 장이 밀려 들어온다', '경찰이 영장을 들고 찾아온다',
      '믿었던 증인의 진술이 뒤집힌다', '잠긴 방에서 시체가 발견된다(로크드 룸)',
    ],
  },
  {
    key: 'asym', label: '정보 비대칭(누가 무엇을 아는가)',
    pool: [
      '독자만 위협의 존재를 알고 주인공은 모른다', '주인공만 진실을 알고 주변은 믿지 않는다', '빌런이 주인공의 모든 동선을 안다',
      '독자는 배신자가 누구인지 이미 안다', '주인공은 적이 곁에 있다는 걸 모른다', '두 시점의 진술이 서로 어긋난다',
      '독자는 결정적 1조각이 가짜임을 짐작한다', '아무도 곧 닥칠 시한을 모른다', '화자가 무언가를 숨기고 있다(신뢰 불가)',
      '주인공이 쫓는 단서가 함정임을 독자만 안다', '빌런은 수사망이 좁혀온 줄 모른다', '조력자가 적의 첩자임을 독자만 안다',
      '주인공의 기억에 결정적 공백이 있다', '같은 사건을 두 인물이 정반대로 기억한다', '독자는 다음 희생자가 누구일지 안다',
      '주인공은 자신이 용의자로 몰린 줄 모른다', '독자는 알리바이가 거짓임을 안다', '빌런만 폭탄의 위치를 안다',
      '주인공은 동료가 이미 죽은 줄 모른다', '독자는 두 사건이 같은 시각임을 안다', '진실을 아는 유일한 증인이 곧 위험에 빠진다',
      '독자는 회상이 사실 미래임을 짐작한다',
    ],
  },
  {
    key: 'clock', label: '시간 압박(티킹 클락)',
    pool: [
      '폭탄이 터지기까지 시간이 없다', '다음 희생이 자정 전에 일어난다', '약효가 떨어지면 정체가 드러난다',
      '밤이 오면 추적자가 들이닥친다', '공판이 내일 아침 열린다', '구조 헬기는 폭풍이 멎어야 온다',
      '배가 출항하면 표적을 놓친다', '전력이 끊기면 보안문이 잠긴다', '추적기 배터리가 곧 방전된다',
      '인질의 산소가 줄어들고 있다', '국경이 곧 봉쇄된다', '거사는 단 한 번의 기회뿐이다',
      '제보 마감까지 몇 시간 남지 않았다', '독이 퍼지기 전에 해독해야 한다', '눈사태로 길이 끊기기 직전이다',
      '밀물이 차오르고 있다', '비행기 탑승 마감이 임박했다', '증거가 파쇄되기 전에 확보해야 한다',
      '연료가 바닥나기 직전이다', '수사 공조 시한이 끝나간다', '날이 밝으면 거래가 성사된다',
      '발신 위치 추적까지 90초뿐이다',
    ],
  },
  {
    key: 'stake', label: '판돈·이해관계(stakes)',
    pool: [
      '실패하면 자신이 누명을 쓴다', '실패하면 가족이 다음 표적이 된다', '실패하면 무고한 다수가 죽는다',
      '실패하면 진실이 영원히 묻힌다', '믿었던 사람을 잃을 위기에 처한다', '한 사람만은 반드시 살려야 한다',
      '실패하면 거대 음모가 완성된다', '잡지 못하면 연쇄가 계속된다', '들키면 평생 쌓은 모든 것을 잃는다',
      '실패하면 조직 전체가 무너진다', '구하지 못하면 자신도 함께 끝난다', '실패하면 적이 권력을 손에 넣는다',
      '실패하면 무고한 사람이 사형당한다', '들키면 아이의 안전이 위태로워진다', '놓치면 증거가 영원히 사라진다',
      '실패하면 도시가 마비된다', '지면 주인공의 결백을 증명할 길이 끊긴다', '구하지 못하면 마지막 가족을 잃는다',
    ],
  },
  {
    key: 'device', label: '서사 장치(이번 비트의 무기)',
    pool: [
      '레드 헤링 — 의심을 엉뚱한 곳으로', '체호프의 총 — 앞서 심은 요소를 회수', '클리프행어 — 폭로/위협 직전에서 끊기',
      '맥거핀 — 모두가 쫓는 물건/정보', '잘못된 신뢰 — 조력자의 배신', '미스디렉션 — 시선을 다른 쪽으로',
      '이중 기능 단서 — 재독 시 결정적', '캣앤마우스 — 쫓고 쫓기는 두뇌 싸움', '신뢰할 수 없는 서술 — 화자의 거짓',
      '추격 시퀀스', '은신 시퀀스', '함정 시퀀스', '거짓 결말 후 막판 부활', '정보 카운트-인(한 조각씩만 공개)',
      '교차 편집 — 두 시간선의 거리 좁히기', '도메스틱 언캐니 — 일상의 섬뜩한 전도',
      '콜드 오픈 — 위기 장면 선공개', '시간선 분절 — "지금"과 "그때" 교차', '이중 시점 — 엇갈리는 두 진술',
      '드라마틱 아이러니 — 독자가 더 많이 알게', '스팅어 — 마지막 한 줄 반전', '카운트다운 — 명시 타이머의 압박',
    ],
  },
  {
    key: 'shift', label: '장면 가치 전환(끝의 상태)',
    pool: [
      '안전 → 위험(추적이 시작된다)', '확신 → 의심(믿음이 흔들린다)', '우위 → 열세(적이 한발 앞선다)',
      '거짓 승리 → 진짜 위협 노출', '고립 심화(조력자를 잃는다)', '희망 → 절망(막다른 골목)',
      '진실에 한 걸음, 그러나 더 큰 위협', '구출 직전 → 함정임이 드러남', '신뢰 회복 → 곧이은 배신',
      '단서 획득 → 동시에 표적이 됨', '추격 따돌림 → 더 큰 적의 등장', '위협 무력화 → 막판 한 방',
      '결백 입증 → 더 깊은 의심을 사다', '동맹 결성 → 곧 드러난 흑막', '탈출 성공 → 더 큰 함정 속으로',
      '평온 회복 → 마지막 줄의 불안(스팅어)', '정보 입수 → 그 대가로 정체 노출', '시간 확보 → 곧이은 시한 단축',
    ],
  },
  {
    key: 'state', label: '주인공의 처지(취약점)',
    pool: [
      '무장 해제된 채 고립되었다', '부상을 입고 쫓기고 있다', '믿을 사람이 아무도 없다',
      '시간에 한참 뒤처져 있다', '적에게 약점을 잡혔다', '누명을 쓰고 도주 중이다',
      '기억의 공백에 갇혀 있다', '가족을 인질로 빼앗겼다', '조력자를 방금 잃었다',
      '중독·금단으로 판단이 흐려졌다', '정보가 거의 없는 채로 움직인다', '신분이 곧 탄로 날 위기다',
      '함정인 줄 알면서도 들어가야 한다', '마지막 카드 하나만 남았다', '추적당하며 동시에 추적해야 한다',
      '거짓을 들킬까 매 순간 조마조마하다', '퇴로가 모두 막혔다', '도움을 청할 통신 수단이 끊겼다',
      '시간을 벌수록 의심만 짙어진다', '믿었던 증거가 손에서 빠져나갔다',
    ],
  },
  {
    key: 'antag', label: '적대자의 한 수',
    pool: [
      '주인공의 다음 행동을 미리 읽는다', '곁의 사람을 매수해 등 뒤에 둔다', '거짓 단서로 시선을 돌린다',
      '인질을 잡아 주도권을 쥔다', '주인공을 범인으로 몰아간다', '시한을 앞당겨 압박한다',
      '안전지대를 무너뜨려 도망칠 곳을 없앤다', '주인공의 약점을 정확히 찌른다', '증인을 차례로 제거한다',
      '함정으로 유인해 고립시킨다', '내부에 심어둔 첩자로 정보를 빼낸다', '주인공의 가족을 표적으로 삼는다',
      '결정적 증거를 먼저 손에 넣는다', '여론·권력을 동원해 길을 막는다', '주인공의 과거 비밀을 폭로하겠다 협박한다',
      '추적 경로를 미리 끊어 막다른 곳으로 몬다',
    ],
  },
]

// 조합수(곱)
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

type Threat = Record<string, string>
function threatLine(m: Threat): string {
  return `[${m.place}] ${m.trigger}. (시한: ${m.clock} / 판돈: ${m.stake}) — 주인공: ${m.state} · 적대자: ${m.antag} · 정보 비대칭: ${m.asym} · 장치: ${m.device} · 전환: ${m.shift}`
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
export default function ThrillerOutline({ payload }: { payload?: Record<string, unknown> }) {
  const genreCtx = typeof payload?.genre === 'string' ? (payload!.genre as string) : '스릴러·서스펜스'

  const init = useRef<Saved>()
  if (!init.current) init.current = load()

  const [templateId, setTemplateId] = useState<string>(init.current.templateId)
  const [items, setItems] = useState<Item[]>(init.current.items)
  const [selectedId, setSelectedId] = useState<string | null>(init.current.selectedId)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [openNote, setOpenNote] = useState<string | null>(null)
  const [note, setNote] = useState('')

  // 위협 비트 생성기 상태
  const [showGen, setShowGen] = useState(false)
  const [threat, setThreat] = useState<Threat>(() => {
    const m: Threat = {}; SLOTS.forEach((s) => { m[s.key] = pick(s.pool) }); return m
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

  // ── 위협 비트 생성기 ──
  const rollAll = () => {
    setRolling(true)
    setThreat((prev) => {
      const next: Threat = { ...prev }
      SLOTS.forEach((s) => { if (!locked[s.key]) next[s.key] = pick(s.pool, prev[s.key]) })
      return next
    })
  }
  const rollOne = (key: string) => {
    const s = SLOTS.find((x) => x.key === key); if (!s) return
    setThreat((prev) => ({ ...prev, [key]: pick(s.pool, prev[key]) }))
  }
  const toggleLock = (key: string) => setLocked((l) => ({ ...l, [key]: !l[key] }))

  // 생성한 위협 비트를 개요에 비트로 삽입(선택 항목 아래 또는 끝).
  const insertThreat = () => {
    const node: Item = {
      id: newId(), kind: 'beat',
      text: '⚠ 위협 비트 — ' + threat.trigger + ' (' + threat.place + ')',
      note: threatLine(threat),
      done: false,
    }
    setItems((prev) => {
      if (!selectedId) return [...prev, node]
      const idx = prev.findIndex((x) => x.id === selectedId)
      if (idx < 0) return [...prev, node]
      const next = [...prev]; next.splice(idx + 1, 0, node); return next
    })
    setSelectedId(node.id)
    flash('위협 비트를 개요에 끼워 넣었어요.')
  }

  // 위협 비트 한 줄을 글감(snippets) 라이브러리에 담기.
  const threatToLibrary = () => {
    addToLibrary('snippets', { text: threatLine(threat), source: '스릴러 개요 빌더', tags: ['스릴러·서스펜스', '위협 비트', threat.device] })
    flash('위협 비트를 글감 라이브러리(snippets)에 담았어요.')
  }

  // ── 프로젝트 연동: 개요를 원고 '개요' 폴더에 문서로 추가 ──
  const addOutlineToProject = () => {
    if (!items.length) { flash('내보낼 개요가 없어요.'); return }
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = toHtml(items)
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '개요',
      title: `스릴러 개요 — ${tpl.name}`,
      bodyHtml,
      meta: { 장르: '스릴러·서스펜스', 구조: tpl.name, 하위장르: tpl.sub, 항목수: String(items.length), 막수: String(items.filter((i) => i.kind === 'act').length) },
    })
    flash(id ? '프로젝트 원고 "개요" 폴더에 개요 문서를 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }

  // 개요 전체를 한 글감으로 라이브러리에 담기.
  const outlineToLibrary = () => {
    if (!items.length) { flash('담을 개요가 없어요.'); return }
    addToLibrary('snippets', { text: `[스릴러 개요 · ${tpl.name}]\n` + toText(items), source: '스릴러 개요 빌더', tags: ['스릴러·서스펜스', '개요', tpl.sub] })
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
          <span style={{ fontSize: 16 }}><Emoji e="🕵️"/></span>
          <strong style={{ fontSize: 14 }}>스릴러 개요 빌더</strong>
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
        <button className="minibtn" onClick={() => setShowGen((v) => !v)} title="위협 비트(긴장 마일스톤) 생성기"><Emoji e="⚠"/> 위협 비트 생성{showGen ? ' ▴' : ' ▾'}</button>
      </div>

      {note && <div style={noteBar}>{note}</div>}

      {/* 위협 비트 생성기 */}
      {showGen && (
        <ThreatGen
          threat={threat} locked={locked} rolling={rolling}
          onRollAll={rollAll} onRollOne={rollOne} onToggleLock={toggleLock}
          onInsert={insertThreat} onToLibrary={threatToLibrary}
        />
      )}

      {/* 본문: 개요 목록 */}
      <div style={body}>
        {items.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, gap: 12, padding: 20 }}>
            <div style={{ fontSize: 40 }}><Emoji e="🕵️"/></div>
            <div>개요가 비어 있어요.<br />위에서 <strong>구조 템플릿</strong>을 고르면 스릴러 표준 막/장이 자동으로 깔립니다.</div>
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
        <button className="linkbtn" onClick={() => openToolLinked('outline-tree', { genre: genreCtx })} title="계층형 개요 트리 열기"><Emoji e="🌳"/> 개요 트리</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck', { genre: genreCtx })} title="반전 카드덱 열기"><Emoji e="🃏"/> 반전 카드덱</button>
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
            {item.text || '(빈 항목 — 더블클릭하여 입력)'}
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
      {props.noteOpen && item.note && <div style={noteText}>{item.note}</div>}
    </div>
  )
}

// ── 위협 비트 생성기 패널 ─────────────────────────────────────
interface GenProps {
  threat: Threat
  locked: Record<string, boolean>
  rolling: boolean
  onRollAll: () => void
  onRollOne: (key: string) => void
  onToggleLock: (key: string) => void
  onInsert: () => void
  onToLibrary: () => void
}
function ThreatGen(props: GenProps) {
  const { threat, locked, rolling } = props
  const panel: React.CSSProperties = { borderBottom: '1px solid var(--border)', background: 'var(--paper)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '50%', overflow: 'auto' }
  const headRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
  const combo: React.CSSProperties = { fontSize: 11, color: 'var(--muted)' }
  const slotRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 0', borderTop: '1px solid var(--border)' }
  const slotLabel: React.CSSProperties = { flexShrink: 0, width: 150, fontSize: 11, color: 'var(--muted)', paddingTop: 3, lineHeight: 1.4 }
  const slotVal = (rolling: boolean): React.CSSProperties => ({ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.5, opacity: rolling ? 0.4 : 1, transition: 'opacity 0.15s' })
  const lockBtn = (on: boolean): React.CSSProperties => ({ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, padding: '2px 4px', opacity: on ? 1 : 0.45 })

  return (
    <div style={panel}>
      <div style={headRow}>
        <strong style={{ fontSize: 13 }}><Emoji e="⚠"/> 위협 비트(긴장 마일스톤) 생성기</strong>
        <span style={{ flex: 1 }} />
        <button className="btn-primary" onClick={props.onRollAll}><Emoji e="🎲"/> 전체 재생성</button>
      </div>
      <div style={combo}>슬롯 무작위 조합 · 가능한 조합수 <strong style={{ color: 'var(--accent)' }}>{fmtNum(COMBO)}</strong> 가지 (잠금된 칸은 고정)</div>

      {SLOTS.map((s) => (
        <div key={s.key} style={slotRow}>
          <span style={slotLabel}>{s.label}</span>
          <span style={slotVal(rolling && !locked[s.key])}>{threat[s.key]}</span>
          <button style={lockBtn(!!locked[s.key])} className="minibtn" onClick={() => props.onToggleLock(s.key)} title={locked[s.key] ? '잠금 해제' : '잠금(고정)'}>{locked[s.key] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
          <button className="minibtn" style={{ fontSize: 11, padding: '2px 6px' }} onClick={() => props.onRollOne(s.key)} title="이 칸만 재생성" disabled={!!locked[s.key]}>↻</button>
        </div>
      ))}

      <div style={{ marginTop: 4, padding: '8px 10px', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, color: 'var(--text)', lineHeight: 1.6 }}>
        {threatLine(threat)}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={props.onInsert} title="이 위협 비트를 개요에 비트로 끼워 넣기">↳ 개요에 끼워 넣기</button>
        <button className="linkbtn" onClick={props.onToLibrary} title="이 위협 비트 한 줄을 글감 라이브러리에 담기"><Emoji e="🗂"/> 글감으로 담기</button>
      </div>
    </div>
  )
}
