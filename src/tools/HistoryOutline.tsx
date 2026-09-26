// 사극 개요 빌더 — 역사·사극 장르의 표준 구조(정통/대하형·웹소설 회빙환형·대체역사·궁중암투·궁중로맨스)에
// 맞춘 장/막 개요 템플릿을 제공한다. 템플릿을 고르면 각 막·장이 자동으로 깔린다. 항목은 인라인 편집·추가·
// 순서 이동·삭제·체크 가능. 역사적 분기점(사화·반정·전쟁) 마일스톤은 슬롯 풀에서 무작위 생성(잠금/재생성,
// 조합수 표시)해 한 챕터 마일스톤으로 끼워 넣을 수 있다. 작성한 개요는 프로젝트 원고 '개요' 폴더에 문서로
// 추가하고, 마일스톤 한 줄은 글감(snippets) 라이브러리에 담을 수 있다.
// 자급식: react 와 './linkbus' 외 import 없음. 100% 로컬(외부 API 없음). 데이터는 localStorage 영속.
import { useState, useEffect, useRef, useMemo } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'history-outline', name: '사극 개요 빌더', icon: '📜', group: '구조', genre: '역사·사극', intro: '정통 대하·회빙환·대체역사·궁중암투 등 사극 표준 구조에 맞춰 장/막 개요를 채우고 역사적 분기점을 끼워 넣습니다', w: 660, h: 700 }

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

const LS_KEY = 'sry:tool:history-outline'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return 'ho_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ── 구조 템플릿(이 장르 도시에 근거) ─────────────────────────
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
    id: 'epic',
    name: '정통·대하 역사형',
    sub: '정통 역사소설',
    icon: '🏛️',
    desc: '실존 인물·사건 중심, 느린 호흡과 풍속·내면·정치 묘사. 승리보다 장렬한 패배·죽음이 절정인 경우가 많다.',
    rows: [
      { kind: 'act', text: '1막 — 시대의 공기(발단)', note: '왕대·당파·신분 지형을 제시. 주인공의 위치(가문·관직·신분의 족쇄)를 시대 규범 안에서 보여준다.' },
      { kind: 'beat', text: '도입: 왕대·정치 지형 제시', note: '훈구/사림·동인/서인 등 붕당 구도와 왕권 강도를 풍속 묘사에 녹여 제시. 사료체 도입부(○년 ○월 실록 기사) 기법 검토.' },
      { kind: 'beat', text: '주인공의 신분·처지 확립', note: '양반/중인/서얼/여성 등 신분의 족쇄를 명확히. 그 족쇄가 곧 갈등의 엔진이 된다.' },
      { kind: 'beat', text: '사건의 씨앗(사화·전쟁의 전조)', note: '거대 사건의 복선. 독자는 결말을 알지만 인물은 모르는 드라마틱 아이러니를 심어둔다.' },
      { kind: 'act', text: '2막 — 부침의 연속(전개)', note: '상승과 몰락의 반복. 어전 설전·상소 대결, 외척·환관·당쟁의 파고.' },
      { kind: 'beat', text: '명분과 의리의 충돌', note: '충(忠)·효(孝)·의(義)·대의명분으로 행동을 정당화하거나 그것과 충돌시켜 설득력 확보.' },
      { kind: 'beat', text: '상소·어전회의 설전', note: '갈등을 "말의 전쟁"으로 시각화. 고사(故事)·경전 인용으로 상대를 제압.' },
      { kind: 'beat', text: '몰락의 비용(연좌·유배·삭탈관직)', note: '지면 죽는 것이 아니라 가문이 멸한다. 판돈을 삼족·사약으로 끌어올린다.' },
      { kind: 'act', text: '3막 — 거대 사건과의 충돌(절정)', note: '임진·병자·사화·반정 등 실제 사건에 주인공이 얽혀 정면 충돌.' },
      { kind: 'beat', text: '결전 혹은 정변의 당일', note: '시간 압박형 서스펜스. 열세 극복·전술 역전, 혹은 거병→궁궐 장악→옥새 확보.' },
      { kind: 'act', text: '4막 — 운명의 완성(대단원)', note: '죽음·승리·몰락. 정통형은 비애로 카타르시스를 처리(이순신 전사·단종 사사형).' },
      { kind: 'beat', text: '운명의 수용과 비극의 완성', note: '독자가 이미 아는 결말로 "어떻게 그곳에 이르렀는가"의 과정미로 마무리.' },
    ],
  },
  {
    id: 'regress',
    name: '회귀·빙의 사극형(웹소설)',
    sub: '회귀·빙의 사극',
    icon: '🔄',
    desc: '현대인이 과거 인물에 빙의/회귀해 미래지식으로 출세·개혁. 3~5화당 1회 사이다 주기, 빠른 단문 페이싱.',
    rows: [
      { kind: 'act', text: '1막 — 빙의/회귀 + 후크(1~5화)', note: '현대인이 과거에 떨어짐. 첫 화 내 강력한 위기(누명·하옥·암살 위협) + 작은 사이다.' },
      { kind: 'beat', text: '빙의 직후, 신분·상황 파악', note: '"여기가… 조선?" 식 충격. 이 몸의 기억이 흘러들고, 미래지식 보유를 자각. 단 현대어 누수 주의.' },
      { kind: 'beat', text: '첫 위기와 작은 사이다', note: '누명·하옥·암살 위협 등 즉각적 위기. 미래지식·기지로 작게 역전해 첫 후크 완성.' },
      { kind: 'act', text: '2막 — 생존·기반(초반)', note: '미래지식으로 작은 성과 → 신뢰 획득 → 후원자(왕·대감) 확보.' },
      { kind: 'beat', text: '미래지식의 첫 성과', note: '요리·의술·상업·발명(비누·설탕·증류주·화약·종두법 등). 단 "왜 지금 가능한가"의 제약(원료·장인·자본·정치반발)을 반드시 건다.' },
      { kind: 'beat', text: '후원자 확보', note: '왕·대감 등 권력자의 신임을 얻어 출세의 발판을 마련.' },
      { kind: 'act', text: '3막 — 상승·견제(중반)', note: '공을 세울수록 적(외척·당파)이 견제. 한 사이클 = 위기 → 미래지식+기지 역전 → 보상.' },
      { kind: 'beat', text: '모함·정쟁의 파고', note: '음흉한 외척·당파 영수·요녀형 후궁의 견제. 정보전·배신이 서스펜스 축.' },
      { kind: 'beat', text: '미래지식+기지로 역전(사이다)', note: '3~5화당 1회 명확한 응징/역전. 너무 잦으면 가벼워지고 드물면 이탈.' },
      { kind: 'beat', text: '보상: 관직·재물·인정', note: '역전 뒤 확실한 보상으로 상승 곡선을 그린다.' },
      { kind: 'act', text: '4막 — 개혁·대업(후반)', note: '국정 개혁·전쟁 승리로 판이 국가 단위로 확대.' },
      { kind: 'beat', text: '국가 단위의 개혁 추진', note: '화폐개혁·이앙법·신무기 등. 나비효과로 이후 사건의 일관성 관리 필수.' },
      { kind: 'beat', text: '클라이맥스: 즉위/개혁 완수', note: '주인공이 권력 정점에 올라 적폐 청산을 공표하는 통쾌한 마무리.' },
    ],
  },
  {
    id: 'alt',
    name: '대체역사형',
    sub: '대체역사',
    icon: '🗺️',
    desc: '"만약 그때 ~했다면" 분기. 임진왜란 승전·조선 근대화·병자호란 방어 등. 분기 이후 일관성 관리가 핵심.',
    rows: [
      { kind: 'act', text: '1막 — 분기점 이전(현실 제시)', note: '실제 역사의 압박을 먼저 보여준다. 무엇이 잘못되어 가는가를 명확히.' },
      { kind: 'beat', text: '역사적 현실의 압박', note: '병자호란 직전·임진 직전 등. 패배가 예정된 듯한 무게(드라마틱 아이러니)를 심는다.' },
      { kind: 'beat', text: '분기 동력의 도입', note: '미래지식·우연·결단 등 역사를 바꿀 단 하나의 변수를 설정. 그 개연성을 확보.' },
      { kind: 'act', text: '2막 — 분기와 나비효과(전개)', note: '바뀐 한 수가 연쇄 변화를 일으킨다. 원래 사건과의 어긋남을 일관되게 추적.' },
      { kind: 'beat', text: '첫 번째 분기 사건', note: '실제와 다른 결과(승전·생존·즉위 등). 즉시 반작용(외세·정적의 견제)이 따라붙는다.' },
      { kind: 'beat', text: '나비효과의 연쇄', note: '바꾼 역사가 이후 사건을 어떻게 비트는가. 원래대로 진행되는 모순을 절대 두지 않는다.' },
      { kind: 'act', text: '3막 — 새로운 위기(절정)', note: '바뀐 역사가 낳은 새 적·새 전쟁. 원래 역사에 없던 도전.' },
      { kind: 'beat', text: '대체 역사 특유의 결전', note: '신무기·신전술·신동맹으로 맞서는, 원본 역사엔 없던 전투/정변.' },
      { kind: 'act', text: '4막 — 새 역사의 정착(대단원)', note: '바뀐 세계가 어떤 모습으로 안착하는가. 대가와 비용도 함께 보여준다.' },
      { kind: 'beat', text: '바뀐 세계의 그림', note: '근대화·강성국·통일 등 새 질서. 잃은 것(희생·왜곡)도 함께 제시해 입체화.' },
    ],
  },
  {
    id: 'court',
    name: '궁중암투·정쟁형',
    sub: '사극(궁중물)',
    icon: '🏯',
    desc: '권력투쟁·당쟁·궁중암투가 핵심. 간택·외척의 부상으로 권력도가 바뀌고, 어전 설전이 클라이맥스 단위로 기능.',
    rows: [
      { kind: 'act', text: '1막 — 권력 지형 제시(발단)', note: '왕권 vs 신권, 당파·외척·환관의 세력도를 한눈에. 주인공의 위치와 야망을 심는다.' },
      { kind: 'beat', text: '세력도와 주인공의 위치', note: '훈구/사림·노론/소론 등 당파 구도. 주인공은 어느 줄에 서 있고 무엇을 노리는가.' },
      { kind: 'beat', text: '간택·정략혼의 카드', note: '후궁 간택·정략혼으로 동맹이 재편된다. 인물 배치 장치로 활용.' },
      { kind: 'act', text: '2막 — 모의와 포섭(전개)', note: '거사 모의 → 명분 축적 → 포섭. 정보전·밀지·옥새가 판돈.' },
      { kind: 'beat', text: '밀지·교지·옥새의 다툼', note: '권력의 정당성을 상징하는 물건(맥거핀). 위조·탈취·해석 다툼으로 긴장.' },
      { kind: 'beat', text: '배신과 정보전', note: '장계·파발의 지연, 거짓 보고. 누가 누구를 배신하는가의 서스펜스.' },
      { kind: 'act', text: '3막 — 어전 설전의 끝장(절정)', note: '정적을 명분·증거로 무너뜨리는 "말의 클라이맥스". 결정타 한 줄(왕의 윤허).' },
      { kind: 'beat', text: '결정적 증거 제시', note: '상소·증인·문서로 정적을 코너에. 고사 인용으로 명분까지 장악.' },
      { kind: 'beat', text: '왕의 윤허 혹은 친국', note: '"역모입니다, 전하!" 식 클리셰는 비틀어 사용. 친국·국문으로 승부를 가른다.' },
      { kind: 'act', text: '4막 — 권력도의 재편(대단원)', note: '정변/숙청 이후 새 권력 질서. 승자의 그늘과 다음 갈등의 씨앗.' },
      { kind: 'beat', text: '숙청과 새 질서', note: '연좌·삭탈관직·유배로 패자를 정리. 그러나 새 외척·신권이 다시 고개를 든다.' },
    ],
  },
  {
    id: 'romance',
    name: '궁중 로맨스형',
    sub: '로맨스 사극',
    icon: '💞',
    desc: '왕/세자/무관과의 로맨스. 신분 격차·후궁 간택·정략혼이 장애물. 멜로와 정치 음모가 결합.',
    rows: [
      { kind: 'act', text: '1막 — 운명적 만남(발단)', note: '신분 격차를 둔 두 사람의 첫 대면. 시대 규범이 곧 사랑의 장애물.' },
      { kind: 'beat', text: '신분 격차의 첫 대면', note: '왕/세자/무관 vs 궁녀/규수/천민 등. 만남의 장면에 시대 공기(궁궐 구조·예법)를 입힌다.' },
      { kind: 'beat', text: '엇갈림의 씨앗', note: '오해·신분 위장·정략혼 예고 등. 멜로의 긴장을 정치 음모와 엮는다.' },
      { kind: 'act', text: '2막 — 끌림과 장애물(전개)', note: '간택·외척·정략혼의 압박이 사랑을 가로막는다. 정치가 멜로를 흔든다.' },
      { kind: 'beat', text: '간택·정략혼의 압박', note: '후궁 간택·가문 간 혼사. 사랑이 권력 재편의 도구로 이용당하는 갈등.' },
      { kind: 'beat', text: '신분 위장·암행의 긴장', note: '정체를 숨긴 만남, 잠행하는 왕. 탄로의 위험이 로맨스 서스펜스로.' },
      { kind: 'act', text: '3막 — 정체·출생의 폭로(절정)', note: '숨겨온 출생·정체가 공개되며 멜로와 권력도가 동시에 재편.' },
      { kind: 'beat', text: '비밀의 공개', note: '출생의 비밀·정체 탄로. 사랑을 지킬 것인가, 명분을 따를 것인가의 선택.' },
      { kind: 'act', text: '4막 — 사랑의 완성/희생(대단원)', note: '신분의 벽을 넘는 결합, 혹은 시대의 무게에 굴복하는 희생.' },
      { kind: 'beat', text: '결합 혹은 비극', note: '벽을 넘어 맺어지거나, 시대 제약 앞에 갈라선다. 어느 쪽이든 시대감을 지킨다.' },
    ],
  },
  {
    id: 'wuxia',
    name: '무협·역사 혼합형',
    sub: '무협·역사 혼합',
    icon: '⚔️',
    desc: '조선/중원 배경 무림. 역사적 사건을 무림 음모로 재해석. 문파·비급·복수와 정치 음모가 얽힌다.',
    rows: [
      { kind: 'act', text: '1막 — 강호 입문(발단)', note: '주인공이 무림에 발을 들인다. 멸문·복수·비급 등 출발 동기를 심는다.' },
      { kind: 'beat', text: '멸문·복수의 동기', note: '가문의 몰락이나 스승의 죽음. 그 배후에 역사적 사건/권력의 그림자를 둔다.' },
      { kind: 'beat', text: '비급·사부와의 인연', note: '무공의 발판. 비급/사부를 통해 성장의 토대를 마련한다.' },
      { kind: 'act', text: '2막 — 무림과 조정의 얽힘(전개)', note: '문파 간 분쟁이 실제 정치(당쟁·역모)와 연결됨을 깨닫는다.' },
      { kind: 'beat', text: '문파 분쟁의 이면', note: '정파/사파의 다툼 뒤에 조정의 음모(외척·역모)가 도사린다.' },
      { kind: 'beat', text: '역사적 사건의 무림식 재해석', note: '사화·반정·전쟁을 무림 세력의 개입으로 재구성. 고증과 환상의 균형.' },
      { kind: 'act', text: '3막 — 결전(절정)', note: '무공 대결과 정치 음모의 클라이맥스가 한 무대에서 충돌.' },
      { kind: 'beat', text: '비무·진법의 대결', note: '신무공·진법으로 최강 적을 격파. 동시에 배후 권력의 실체를 드러낸다.' },
      { kind: 'act', text: '4막 — 강호의 안정(대단원)', note: '복수의 완성과 무림 질서의 재편. 역사의 향방에 남긴 흔적.' },
      { kind: 'beat', text: '복수 완성과 새 질서', note: '원수를 갚고 강호를 안정시킨다. 바뀐 역사/권력의 결말을 함께 매듭짓는다.' },
    ],
  },
]

// ── 역사적 분기점 마일스톤 생성기(슬롯 풀) ─────────────────────
// 한 챕터의 마일스톤(역사적 분기점) 한 줄을 무작위 조합해 만든다.
// 조합수 = 각 풀 길이의 곱. 1억(1e8) 이상을 지향.
interface Slot { key: string; label: string; pool: string[] }
const SLOTS: Slot[] = [
  {
    key: 'era', label: '왕대·시대',
    pool: [
      '연산군 폭정기', '중종반정 직후', '명종·문정왕후 수렴청정기', '선조·임진왜란 전야',
      '광해군 중립외교기', '인조반정 직후', '병자호란 전야', '효종 북벌 추진기',
      '현종 예송 논쟁기', '숙종 환국기', '경종·신임옥사기', '영조 탕평·사도세자기',
      '정조 개혁기', '순조 세도정치기', '철종 안동김씨 세도기', '고려 무신정권기',
      '고려 말 위화도 회군 전야', '조선 개국 직후', '세종 치세', '단종·계유정난기',
    ],
  },
  {
    key: 'event', label: '역사적 분기점(사건)',
    pool: [
      '사화(士禍)의 발발', '반정(反正)의 거병', '왜란의 첫 침공', '호란의 남한산성 농성',
      '환국(換局)으로 정권 교체', '역모 고변과 친국', '세자 폐위·복위 다툼', '대비의 수렴청정 개시',
      '북벌 군비 확충', '예송 논쟁의 격화', '탕평책 시행', '신해통공·금난전권 혁파',
      '천주교 박해(사옥)', '민란·농민 봉기', '통신사 파견', '국혼(왕실 혼례)과 외척 부상',
      '실록·국서의 위조 사건', '봉수·파발의 거짓 보고', '암행어사의 출도', '공명첩 남발과 신분 동요',
    ],
  },
  {
    key: 'turn', label: '판을 뒤집는 한 수',
    pool: [
      '미래지식으로 신무기를 구현하다', '결정적 상소로 정적을 무너뜨리다', '밀지를 가로채 음모를 폭로하다',
      '옥새를 선점해 정통성을 장악하다', '간택을 역이용해 동맹을 재편하다', '거짓 장계로 적을 유인하다',
      '연좌의 칼을 거꾸로 적에게 돌리다', '암행으로 비리의 증거를 손에 넣다', '화폐·조세 개혁으로 민심을 얻다',
      '전술 역전으로 열세를 승세로 바꾸다', '배신자를 역으로 포섭하다', '왕의 윤허를 단 한 줄로 끌어내다',
      '신분을 위장해 적진에 침투하다', '예법·고사로 상대의 명분을 빼앗다', '비급/신지식으로 최강자를 꺾다',
      '나비효과를 예측해 선수를 치다',
    ],
  },
  {
    key: 'cost', label: '판돈·대가',
    pool: [
      '지면 삼족이 멸한다', '지면 위리안치·유배가 기다린다', '지면 사약이 내려진다',
      '지면 가문이 역적으로 낙인찍힌다', '왕의 신임을 통째로 잃을 위기', '사랑하는 이를 정략의 제물로 바쳐야 한다',
      '나비효과로 더 큰 전란이 닥칠 수 있다', '미래지식의 출처를 들키면 요사로 몰린다', '동지의 배신으로 모든 게 무너질 판',
      '신분이 탄로 나면 천민으로 추락한다', '거짓 보고가 들통나면 군법에 처해진다', '정변이 하루만 어긋나도 거사가 실패한다',
    ],
  },
  {
    key: 'irony', label: '드라마틱 아이러니(독자만 아는 것)',
    pool: [
      '독자는 이 전쟁의 패배를 이미 안다', '독자는 이 인물의 비극적 죽음을 안다', '독자는 이 개혁이 좌절될 운명임을 안다',
      '독자는 믿는 후원자가 곧 배신할 것을 안다', '독자는 이 왕대가 곧 반정으로 무너질 것을 안다', '독자는 바뀐 역사의 더 큰 대가를 짐작한다',
      '독자는 숨겨진 출생의 비밀을 먼저 안다', '독자는 이 동맹이 허상임을 안다', '독자는 미래지식이 통하지 않을 변수를 안다',
      '독자는 승리 뒤에 더 큰 함정이 있음을 안다',
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

type Milestone = Record<string, string>
function milestoneLine(m: Milestone): string {
  return `[${m.era}] ${m.event} — ${m.turn}. (대가: ${m.cost} / 아이러니: ${m.irony})`
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
export default function HistoryOutline({ payload }: { payload?: Record<string, unknown> }) {
  const genreCtx = typeof payload?.genre === 'string' ? (payload!.genre as string) : '역사·사극'

  const init = useRef<Saved>()
  if (!init.current) init.current = load()

  const [templateId, setTemplateId] = useState<string>(init.current.templateId)
  const [items, setItems] = useState<Item[]>(init.current.items)
  const [selectedId, setSelectedId] = useState<string | null>(init.current.selectedId)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [openNote, setOpenNote] = useState<string | null>(null)
  const [note, setNote] = useState('')

  // 마일스톤 생성기 상태
  const [showGen, setShowGen] = useState(false)
  const [mile, setMile] = useState<Milestone>(() => {
    const m: Milestone = {}; SLOTS.forEach((s) => { m[s.key] = pick(s.pool) }); return m
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

  // ── 마일스톤 생성기 ──
  const rollAll = () => {
    setRolling(true)
    setMile((prev) => {
      const next: Milestone = { ...prev }
      SLOTS.forEach((s) => { if (!locked[s.key]) next[s.key] = pick(s.pool, prev[s.key]) })
      return next
    })
  }
  const rollOne = (key: string) => {
    const s = SLOTS.find((x) => x.key === key); if (!s) return
    setMile((prev) => ({ ...prev, [key]: pick(s.pool, prev[key]) }))
  }
  const toggleLock = (key: string) => setLocked((l) => ({ ...l, [key]: !l[key] }))

  // 생성한 마일스톤을 개요에 비트로 삽입(선택 항목 아래 또는 끝).
  const insertMilestone = () => {
    const node: Item = {
      id: newId(), kind: 'beat',
      text: '⚔ 역사적 분기점 — ' + mile.event + ': ' + mile.turn,
      note: milestoneLine(mile),
      done: false,
    }
    setItems((prev) => {
      if (!selectedId) return [...prev, node]
      const idx = prev.findIndex((x) => x.id === selectedId)
      if (idx < 0) return [...prev, node]
      const next = [...prev]; next.splice(idx + 1, 0, node); return next
    })
    setSelectedId(node.id)
    flash('역사적 분기점 마일스톤을 개요에 끼워 넣었어요.')
  }

  // 마일스톤 한 줄을 글감(snippets) 라이브러리에 담기.
  const milestoneToLibrary = () => {
    addToLibrary('snippets', { text: milestoneLine(mile), source: '사극 개요 빌더', tags: ['역사·사극', '분기점', mile.era] })
    flash('역사적 분기점을 글감 라이브러리(snippets)에 담았어요.')
  }

  // ── 프로젝트 연동: 개요를 원고 '개요' 폴더에 문서로 추가 ──
  const addOutlineToProject = () => {
    if (!items.length) { flash('내보낼 개요가 없어요.'); return }
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = toHtml(items)
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '개요',
      title: `사극 개요 — ${tpl.name}`,
      bodyHtml,
      meta: { 장르: '역사·사극', 구조: tpl.name, 하위장르: tpl.sub, 항목수: String(items.length), 막수: String(items.filter((i) => i.kind === 'act').length) },
    })
    flash(id ? '프로젝트 원고 "개요" 폴더에 개요 문서를 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }

  // 개요 전체를 한 글감으로 라이브러리에 담기.
  const outlineToLibrary = () => {
    if (!items.length) { flash('담을 개요가 없어요.'); return }
    addToLibrary('snippets', { text: `[사극 개요 · ${tpl.name}]\n` + toText(items), source: '사극 개요 빌더', tags: ['역사·사극', '개요', tpl.sub] })
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
          <span style={{ fontSize: 16 }}><Emoji e="📜"/></span>
          <strong style={{ fontSize: 14 }}>사극 개요 빌더</strong>
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
        <button className="minibtn" onClick={() => setShowGen((v) => !v)} title="역사적 분기점 마일스톤 생성기"><Emoji e="⚔"/> 분기점 생성{showGen ? ' ▴' : ' ▾'}</button>
      </div>

      {note && <div style={noteBar}>{note}</div>}

      {/* 마일스톤 생성기 */}
      {showGen && (
        <MilestoneGen
          mile={mile} locked={locked} rolling={rolling}
          onRollAll={rollAll} onRollOne={rollOne} onToggleLock={toggleLock}
          onInsert={insertMilestone} onToLibrary={milestoneToLibrary}
        />
      )}

      {/* 본문: 개요 목록 */}
      <div style={body}>
        {items.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, gap: 12, padding: 20 }}>
            <div style={{ fontSize: 40 }}><Emoji e="📜"/></div>
            <div>개요가 비어 있어요.<br />위에서 <strong>구조 템플릿</strong>을 고르면 사극 표준 막/장이 자동으로 깔립니다.</div>
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
        <button className="linkbtn" onClick={() => openToolLinked('anachronism-checker', { genre: genreCtx })} title="시대착오 점검 열기"><Emoji e="🏺"/> 시대착오 점검</button>
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

// ── 마일스톤 생성기 패널 ─────────────────────────────────────
interface GenProps {
  mile: Milestone
  locked: Record<string, boolean>
  rolling: boolean
  onRollAll: () => void
  onRollOne: (key: string) => void
  onToggleLock: (key: string) => void
  onInsert: () => void
  onToLibrary: () => void
}
function MilestoneGen(props: GenProps) {
  const { mile, locked, rolling } = props
  const panel: React.CSSProperties = { borderBottom: '1px solid var(--border)', background: 'var(--paper)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '50%', overflow: 'auto' }
  const headRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
  const combo: React.CSSProperties = { fontSize: 11, color: 'var(--muted)' }
  const slotRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 0', borderTop: '1px solid var(--border)' }
  const slotLabel: React.CSSProperties = { flexShrink: 0, width: 132, fontSize: 11, color: 'var(--muted)', paddingTop: 3, lineHeight: 1.4 }
  const slotVal = (rolling: boolean): React.CSSProperties => ({ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.5, opacity: rolling ? 0.4 : 1, transition: 'opacity 0.15s' })
  const lockBtn = (on: boolean): React.CSSProperties => ({ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, padding: '2px 4px', opacity: on ? 1 : 0.45 })

  return (
    <div style={panel}>
      <div style={headRow}>
        <strong style={{ fontSize: 13 }}><Emoji e="⚔"/> 역사적 분기점 마일스톤 생성기</strong>
        <span style={{ flex: 1 }} />
        <button className="btn-primary" onClick={props.onRollAll}><Emoji e="🎲"/> 전체 재생성</button>
      </div>
      <div style={combo}>슬롯 무작위 조합 · 가능한 조합수 <strong style={{ color: 'var(--accent)' }}>{fmtNum(COMBO)}</strong> 가지 (잠금된 칸은 고정)</div>

      {SLOTS.map((s) => (
        <div key={s.key} style={slotRow}>
          <span style={slotLabel}>{s.label}</span>
          <span style={slotVal(rolling && !locked[s.key])}>{mile[s.key]}</span>
          <button style={lockBtn(!!locked[s.key])} className="minibtn" onClick={() => props.onToggleLock(s.key)} title={locked[s.key] ? '잠금 해제' : '잠금(고정)'}>{locked[s.key] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
          <button className="minibtn" style={{ fontSize: 11, padding: '2px 6px' }} onClick={() => props.onRollOne(s.key)} title="이 칸만 재생성" disabled={!!locked[s.key]}>↻</button>
        </div>
      ))}

      <div style={{ marginTop: 4, padding: '8px 10px', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, color: 'var(--text)', lineHeight: 1.6 }}>
        {milestoneLine(mile)}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={props.onInsert} title="이 분기점을 개요에 비트로 끼워 넣기">↳ 개요에 끼워 넣기</button>
        <button className="linkbtn" onClick={props.onToLibrary} title="이 분기점 한 줄을 글감 라이브러리에 담기"><Emoji e="🗂"/> 글감으로 담기</button>
      </div>
    </div>
  )
}
