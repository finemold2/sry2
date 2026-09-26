// 사극 플롯·진행곡선(로직) — 역사·사극 장르 전용 구조/비트·페이싱 템플릿 도구.
// 하위유형(정통 대하 / 회귀빙의 웹소설 / 대체역사 분기 / 궁중암투 정변)별로
// 도시에에 근거한 "표준 비트 시트"를 제공한다. 각 비트는: 권장 위치(%)·긴장도·페이싱·고증/사이다 가이드를 갖는다.
// 사용자는 각 비트에 사건 메모를 적고(스텝 입력 시트), 완료 체크로 진행률을 본다.
// 비트들의 긴장도로 진행곡선(SVG)을 그린다. "비트 영감 뽑기"는 슬롯 풀 무작위(잠금/재생성)+조합수(1조 이상).
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크 없음. localStorage 자동 저장/복원. 미지원 환경 graceful.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, openToolLinked, addToLibrary, Emoji } from './linkbus'

export const meta = {
  id: 'history-plotlogic',
  name: '사극 플롯·진행곡선',
  icon: '📜',
  group: '플롯',
  genre: '역사·사극',
  intro: '하위유형별 사극 표준 구조·비트·페이싱을 단계 시트로 채우고 진행곡선을 그립니다',
  w: 760,
  h: 660,
}

const LS_KEY = 'sry:tool:history-plotlogic'

// ── 하위유형(템플릿) 정의 ────────────────────────────────────────────────────
type TplKey = 'epic' | 'regress' | 'althist' | 'palace'

interface BeatDef {
  key: string
  title: string         // 비트 이름(역사·사극 고유 표현)
  pos: [number, number] // 권장 위치(전체 대비 % 구간)
  tension: number       // 권장 긴장도(1~10) — 진행곡선 기본값
  pace: '느림' | '보통' | '빠름' | '폭발'  // 페이싱
  desc: string          // 도시에 근거 설명(무슨 일이 일어나나)
  guide: string         // 고증/사이다/장치 가이드(경고·요령)
  hook: string          // 이 비트에 어울리는 장르 장치
}

interface TemplateDef {
  key: TplKey
  name: string
  tag: string           // 한 줄 정체성
  color: string
  daeexample: string    // 대표작 계보
  fidelity: number      // 권장 고증 강도(0 가상왕조 ~ 100 정통고증)
  future: boolean       // 미래지식 사용 장르인가
  beats: BeatDef[]
}

// 도시에 §5(전개·구조), §4(서사 장치), §6(클라이맥스)에 근거한 풍부한 자작 비트 시트.
const TEMPLATES: TemplateDef[] = [
  {
    key: 'epic',
    name: '정통 대하·역사소설',
    tag: '실존 인물·사건 중심. 느린 호흡과 비애의 미학, 운명의 완성.',
    color: '#8a5a2c',
    daeexample: '『칼의 노래』 · 『남한산성』 · 『토지』 · 『용의 눈물』 · 『태조 왕건』',
    fidelity: 90,
    future: false,
    beats: [
      { key: 'e1', title: '시대의 공기 — 도입', pos: [0, 6], tension: 2, pace: '느림',
        desc: '왕대·정치 지형·신분 규범을 풍속으로 깔고 주인공의 위치(가문·관직·당색)를 제시한다. 의식주·언어·시진(時辰)으로 시대감을 세운다.',
        guide: '시대착오 금물 — 작물(고추·고구마)·물건(상평통보·안경)·호칭(폐하/전하)의 도입 연대를 확인. 첫 장면부터 고증으로 몰입을 건다.',
        hook: '실록·장계 인용으로 장 도입(○년 ○월 기사)' },
      { key: 'e2', title: '사건의 씨앗 — 전조', pos: [6, 18], tension: 4, pace: '느림',
        desc: '사화·전쟁·반정의 전조가 어른거린다. 당쟁의 균열, 외척의 부상, 변방의 첩보. 주인공은 아직 거대 사건의 가장자리에 있다.',
        guide: '독자는 결말을 이미 안다(드라마틱 아이러니). 인물만 모르는 비극을 깔아 긴장을 적립하라.',
        hook: '봉수·파발의 지연으로 정보 비대칭' },
      { key: 'e3', title: '명분과 의리의 갈림 — 1차 부침', pos: [18, 36], tension: 5, pace: '보통',
        desc: '충(忠)·효·의(義)·대의명분이 충돌한다. 주인공은 상소·어전 설전에서 명분을 다투며 처음으로 상승하거나 좌천된다.',
        guide: '왕은 만능 독재자가 아니다 — 신권·언관(삼사)·예법의 견제를 보여라. 갈등을 "말의 전쟁"으로 시각화.',
        hook: '어전회의·상소 설전, 고사(故事) 인용 화법' },
      { key: 'e4', title: '몰락과 시련 — 깊은 골', pos: [36, 54], tension: 6, pace: '보통',
        desc: '정쟁에 휘말려 삭탈관직·유배·국문(鞫問)·연좌의 위협. 가문 단위로 판돈이 오른다("지면 삼족이 멸한다").',
        guide: '신분제의 무게를 잊지 마라 — 서얼·여성·천민이라면 제약을 극복 과제로. 패배의 비용(사약·위리안치)을 구체화.',
        hook: '연좌·삼족·사사(賜死)로 판돈 상승' },
      { key: 'e5', title: '거대 사건과의 교차 — 전환', pos: [54, 72], tension: 8, pace: '빠름',
        desc: '임진왜란·병자호란·반정·사화 같은 실제 사건에 주인공의 운명이 정면으로 얽힌다. 개인사와 국사(國史)가 한 점에서 만난다.',
        guide: '실제 사건의 연대·결과를 존중하되 "어떻게 그 결말에 이르는가"의 과정미로 승부. 사료를 인용해 사실감을 보강.',
        hook: '교지·밀지·옥새를 둘러싼 정당성 다툼' },
      { key: 'e6', title: '결전 혹은 어전의 끝장 — 절정', pos: [72, 88], tension: 10, pace: '폭발',
        desc: '열세를 무릅쓴 결전(이순신형 해전), 또는 정적을 명분·증거로 무너뜨리는 어전 설전의 끝장. 결정타 한 줄(왕의 윤허·결정적 증거).',
        guide: '정통형 절정은 승리보다 "장렬한 패배·죽음"이 카타르시스인 경우가 많다. 비애로 절정을 처리해도 좋다.',
        hook: '결전 명장면 · 결정적 한 줄 대사' },
      { key: 'e7', title: '운명의 완성 — 대단원', pos: [88, 100], tension: 4, pace: '느림',
        desc: '죽음·승리·몰락으로 운명이 완성된다. 살아남은 자들의 회한과 시대의 다음 장(章)을 암시한다. "이미 모든 것이 끝난 뒤였다".',
        guide: '독자가 결말을 알았더라도 "과정"으로 울려야 한다. 마지막 사료/독백으로 여운을 남겨라.',
        hook: '내면 독백 · 사료체 후일담' },
    ],
  },
  {
    key: 'regress',
    name: '회귀·빙의 사극(웹소설)',
    tag: '미래지식이 무기. 3~5화당 사이다 1회. 생존→기반→상승→대업.',
    color: '#4a76d4',
    daeexample: '『조선 셰프 강주방』 · 『철혈대공』류 · 회귀빙의 출세·개혁물',
    fidelity: 55,
    future: true,
    beats: [
      { key: 'r1', title: '빙의/회귀 + 강력한 후크', pos: [0, 4], tension: 7, pace: '폭발',
        desc: '현대인이 과거 인물에 떨어진다("여기가… 조선?"). 신분·상황을 파악하기도 전에 첫 화 내 강력한 위기(누명·하옥·암살 위협)와 작은 사이다.',
        guide: '1화 후크가 생명. 미래지식 "보유 자각"을 빠르게 주되, 곧바로 만능이 아님을 암시(원료·인력·정치반발).',
        hook: '"이 몸의 기억이 흘러든다" · 첫 화 위기+소(小)사이다' },
      { key: 'r2', title: '생존과 신분 파악 — 기반 1', pos: [4, 14], tension: 4, pace: '빠름',
        desc: '내가 누구인지(양반/서얼/중인/천민), 어느 왕대인지, 누가 적인지 파악. 첫 미래지식을 작게 실험(요리·의술·상업·간단한 발명).',
        guide: '미래지식 만능주의 경계 — "왜 지금 가능한가"의 제약을 걸어라. 신분의 족쇄가 행동을 제한해야 긴장이 산다.',
        hook: '비누·설탕·증류주·고추장 등 작은 기술로 첫 신뢰' },
      { key: 'r3', title: '후원자 확보 — 기반 2', pos: [14, 26], tension: 5, pace: '보통',
        desc: '미래지식의 성과로 신뢰를 얻어 후원자(왕·대감·상단)를 확보한다. 출세의 사다리 첫 칸. 작은 관직·재물·인정.',
        guide: '후원자에게도 정치적 동기를 줘라(그가 왜 너를 쓰는가). 사다리를 한 번에 오르면 개연성이 무너진다.',
        hook: '잠행하는 왕과의 만남 · 후원자 포섭' },
      { key: 'r4', title: '공을 세울수록 견제 — 상승/사이클', pos: [26, 50], tension: 6, pace: '빠름',
        desc: '공을 세울수록 외척·당파가 견제한다. 한 사이클 = 위기(모함·정쟁) → 미래지식+기지로 역전 → 보상(관직·재물). 3~5화당 명확한 응징.',
        guide: '사이다 주기 관리 — 너무 잦으면 가벼워지고 드물면 이탈. 매 사이클 적의 격을 키워라.',
        hook: '모함→증거 역전, 적 1인 응징' },
      { key: 'r5', title: '중간점의 거짓 승리/패배 — 판 전환', pos: [50, 56], tension: 8, pace: '폭발',
        desc: '큰 공(전공·재정개혁·역병 진압)으로 거짓 승리, 혹은 함정에 걸려 거짓 패배. 적의 정체·배후가 드러나며 판이 국가 단위로 커진다.',
        guide: '여기서부터 나비효과를 관리하라 — 역사를 바꾼 이상 이후 사건이 원래대로면 모순. 분기 일관성을 메모.',
        hook: '밀지·옥새 위조, 배후 폭로' },
      { key: 'r6', title: '국정 개혁·대업 착수 — 상승 후반', pos: [56, 78], tension: 7, pace: '빠름',
        desc: '화폐개혁·군제개편·신무기·종두법·이앙법 등 국가급 개혁에 착수. 적폐와 정면충돌. 거사·반정·전쟁의 명분을 축적한다.',
        guide: '개혁엔 자본·장인·정치 반발의 3중 제약을 걸어 사이다와 개연성을 줄다리기. 반정 플롯이면 정보전·포섭을 깔아라.',
        hook: '신무기·진법 · 반정 모의(명분 축적→포섭)' },
      { key: 'r7', title: '결전/정변 당일 — 절정', pos: [78, 92], tension: 10, pace: '폭발',
        desc: '신무기·전술로 결전을 역전하거나, 거병→궁궐 장악→옥새 확보→즉위/폐위. 시간 압박형 서스펜스로 적폐를 응징한다.',
        guide: '미래지식 신무기는 "이미 깔아둔 제약"을 보상받는 형태여야 통쾌하다. 정변은 타이밍·배신·정보전이 축.',
        hook: '결전 신무기 역전 · 정변 당일 옥새 확보' },
      { key: 'r8', title: '대업 완수·즉위/정점 — 대단원', pos: [92, 100], tension: 5, pace: '보통',
        desc: '주인공이 권력 정점에 올라 적폐 청산을 공표하거나, 바뀐 역사의 새 질서를 선포한다. 다음 시즌(전쟁·외정)의 씨앗을 남긴다.',
        guide: '대업 후의 "통치 난이도"를 살짝 보여 후속 동력을 확보. 현대적 사고와 고풍 어투의 충돌을 유머로 마무리해도 좋다.',
        hook: '즉위 교서 · 적폐 청산 공표' },
    ],
  },
  {
    key: 'althist',
    name: '대체역사 분기형',
    tag: '"만약 그때 ~했다면". 분기점 → 나비효과 일관성 관리가 생명.',
    color: '#0f9d58',
    daeexample: '『비명을 찾아서』 · 임진 승전/병자 방어/조선 근대화 분기물',
    fidelity: 70,
    future: true,
    beats: [
      { key: 'a1', title: '원역사의 제시 — 기준선', pos: [0, 8], tension: 3, pace: '느림',
        desc: '바꾸려는 "원래 역사"의 결말을 독자에게 분명히 각인시킨다(패배·치욕·멸망). 무엇이 잘못되었는지가 분기의 동기다.',
        guide: '원역사 고증은 단단히. 독자가 기준선을 알아야 "분기의 쾌감"이 산다.',
        hook: '실록·연표로 원역사 결말 못박기' },
      { key: 'a2', title: '분기점(POD) — 결정적 개입', pos: [8, 20], tension: 7, pace: '빠름',
        desc: 'Point of Divergence — 한 번의 결정·발명·승전·암살로 역사가 갈라진다. 임진 해전 대승, 삼전도 회피, 화약·총통의 조기 보급 등.',
        guide: '분기는 "단 하나"로 명확히. 여러 개를 동시에 바꾸면 인과가 흐려진다. 개입의 자원·우연도 통제하라.',
        hook: '결정적 장계·교지로 역사가 갈라지는 순간' },
      { key: 'a3', title: '즉각적 파장 — 1차 나비효과', pos: [20, 36], tension: 6, pace: '보통',
        desc: '분기 직후 가까운 사건들이 줄줄이 바뀐다. 동맹·적의 재편, 인물의 생사 변경. 원역사를 아는 독자는 "이제 이게 어떻게 되지?" 기대.',
        guide: '나비효과 일관성 표를 머릿속에 둬라 — 바꾼 결과가 이후에 반드시 반영돼야 모순이 없다.',
        hook: '간지·연호 어긋남, 사라진/살아난 인물' },
      { key: 'a4', title: '새 질서의 마찰 — 반발', pos: [36, 54], tension: 6, pace: '보통',
        desc: '바뀐 역사가 기존 권력 구조(사대 관계·당파·신분제)와 충돌한다. 명·청·왜·여진의 대외 반응, 내부 보수파의 저항.',
        guide: '대외관계(사대·조공·국서)를 빠뜨리지 마라 — 한 나라만 바뀌어도 주변국이 반응한다.',
        hook: '국서·사신·조공 질서의 재협상' },
      { key: 'a5', title: '연쇄 분기 가속 — 중반 전환', pos: [54, 72], tension: 8, pace: '빠름',
        desc: '1차 분기가 2차·3차 분기를 낳는다. 새 전쟁·새 제도·새 인물이 등장하며 세계가 원역사에서 멀어진다. 판이 동아시아 규모로.',
        guide: '여기서 "원역사 의존"을 버려라 — 더는 교과서를 베낄 수 없다. 자작 인과로 굴러가야 한다.',
        hook: '가상 전역(戰役)·가상 조약의 창설' },
      { key: 'a6', title: '대분기의 결전 — 절정', pos: [72, 90], tension: 10, pace: '폭발',
        desc: '바뀐 역사의 운명을 가르는 최대 결전(국경 결전·왕조의 향방을 건 정변). 원역사라면 졌을 싸움을 분기의 힘으로 뒤집거나, 새 비극을 맞는다.',
        guide: '결전의 승패는 앞서 쌓은 분기들의 "누적 결과"여야 설득력. 깜짝 신무기 한 방으로 끝내지 마라.',
        hook: '진법·신무기 + 누적 분기의 보상' },
      { key: 'a7', title: '새 역사의 선포 — 대단원', pos: [90, 100], tension: 5, pace: '느림',
        desc: '원역사와 갈라진 세계의 새 질서를 매듭짓는다. 바뀐 연표·새 왕조·새 국경. 또 다른 분기의 씨앗(다음 권)을 남긴다.',
        guide: '"원래는 ~였으나 이제는 ~다"의 대조로 분기의 무게를 마지막에 한 번 더 각인하라.',
        hook: '새 연표·새 국호 선포, 후세 사관의 평' },
    ],
  },
  {
    key: 'palace',
    name: '궁중암투·정변형',
    tag: '권력의 작동 원리가 엔진. 간택·외척·당쟁·반정의 정보전.',
    color: '#a64ca6',
    daeexample: '『여인천하』 · 『정도전』 · 『랑야방』 · 『견환전』(궁투)',
    fidelity: 65,
    future: false,
    beats: [
      { key: 'p1', title: '권력 지형 제시 — 도입', pos: [0, 8], tension: 3, pace: '느림',
        desc: '왕권 vs 신권, 동인/서인·노론/소론, 외척·환관·후궁의 세력도를 깐다. 주인공의 신분·동맹·약점을 명확히.',
        guide: '권력의 견제 메커니즘(언관·예법·대비)을 반드시 보여라. 왕을 만능으로 그리면 시대감이 붕괴한다.',
        hook: '세력도·당색 소개, 궁궐 공간(정전·편전·내전·후원)' },
      { key: 'p2', title: '간택·정략혼 — 판의 재편', pos: [8, 20], tension: 5, pace: '보통',
        desc: '후궁 간택·세자빈 책봉·정략혼으로 동맹이 재편된다. 외척의 부상으로 권력도가 흔들리고 새 갈등선이 그어진다.',
        guide: '간택은 단순 로맨스가 아니라 "권력 배치"다. 누가 부상하고 누가 밀려나는지의 정치 셈을 보여라.',
        hook: '간택·책봉 교지, 외척의 등장' },
      { key: 'p3', title: '첫 음모와 모함 — 상승 1', pos: [20, 38], tension: 6, pace: '보통',
        desc: '정적이 모함·투서·독살 시도로 선공한다. 주인공은 첫 위기를 명분과 기지로 막아내며 적의 윤곽을 파악한다.',
        guide: '음모는 "증거와 명분"의 게임이다. 감정싸움이 아니라 논리·기록(상소·간찰)으로 다투게 하라.',
        hook: '투서·익명서·독살, 사헌부 탄핵' },
      { key: 'p4', title: '밀지와 정보전 — 상승 2', pos: [38, 54], tension: 7, pace: '빠름',
        desc: '밀지·옥새·교지의 위조·탈취·해석을 둘러싼 정보전. 첩자·내통·이중첩자가 얽힌다. 신분 위장·암행으로 진상에 접근.',
        guide: '정보 전달의 지연(파발·봉수)과 거짓 보고를 서스펜스로 활용. 누가 무엇을 언제 아는가를 통제하라.',
        hook: '밀지·옥새 MacGuffin, 첩자·암행' },
      { key: 'p5', title: '거사 모의 — 반정 엔진 점화', pos: [54, 70], tension: 8, pace: '빠름',
        desc: '반정·역모의 명분을 축적하고 동조자를 포섭한다(거병 전야). 배신의 위험, 타이밍 조율, 정보 누설의 긴장.',
        guide: '반정 플롯엔진: 명분 축적→포섭→거병→정변. 한 단계라도 비면 거사가 허술해 보인다.',
        hook: '"역모입니다, 전하!" · 포섭과 배신' },
      { key: 'p6', title: '어전 설전의 끝장 — 클라이맥스 A', pos: [70, 84], tension: 9, pace: '폭발',
        desc: '결정적 증거를 들고 어전·국청에서 정적을 무너뜨린다. 명분·고사·증거로 상대를 제압하는 "말의 클라이맥스". 왕의 윤허가 결정타.',
        guide: '결정타 한 줄(증거 제시·왕의 윤허)을 위해 앞 비트에서 단서를 충분히 깔아라. 설전은 논리의 칼싸움이다.',
        hook: '국문·친국, 결정적 증거 한 장' },
      { key: 'p7', title: '정변 당일 — 클라이맥스 B', pos: [84, 94], tension: 10, pace: '폭발',
        desc: '거병→궁궐 장악→옥새 확보→즉위/폐위. 시간 압박과 변수(누설·배신·외부 개입) 속에서 권력의 향방이 하룻밤에 결정된다.',
        guide: '정변은 시간 단위 서스펜스. 봉수·궁문·금군(禁軍)의 분 단위 움직임으로 긴장을 조여라.',
        hook: '옥새 확보, 즉위/폐위 교서' },
      { key: 'p8', title: '권력도 재편 — 대단원', pos: [94, 100], tension: 5, pace: '보통',
        desc: '정체·출생의 폭로로 권력도가 재편된다. 승자의 통치, 패자의 연좌·사사(賜死). 새 외척·새 당파의 씨앗을 남긴다.',
        guide: '"이긴 자도 곧 견제받는다"의 여운으로 권력의 무상함을 남겨라. 다음 암투의 불씨를 심어 후속을 연다.',
        hook: '연좌·사사, 새 세력의 부상' },
    ],
  },
]
const TPL_MAP: Record<TplKey, TemplateDef> = TEMPLATES.reduce((m, t) => { m[t.key] = t; return m }, {} as Record<TplKey, TemplateDef>)
const isTplKey = (v: unknown): v is TplKey => typeof v === 'string' && v in TPL_MAP

const PACE_COLOR: Record<BeatDef['pace'], string> = { 느림: '#6b7178', 보통: '#4a76d4', 빠름: '#d99a2b', 폭발: '#db4437' }

// ── "비트 영감 뽑기" 슬롯 풀(도시에 §4 서사 장치 / §7 어휘 근거) ─────────────
// 조합수: 사건 × 장치 × 판돈 × 전환 × 인물장치 — 1조 이상 지향.
const SLOT_SITUATION = [ // 사건의 씨앗 (94)
  '실록에 한 줄로만 남은 의문의 죽음', '변방에서 올라온 거짓 장계', '간택 명단에서 사라진 이름',
  '위조된 밀지가 도성에 돈다', '사라진 옥새를 둘러싼 소문', '역병이 도성 문턱까지 번진다',
  '암행 중인 왕이 저잣거리에서 진실을 목격', '서얼 출신이 장원으로 급제', '환관이 쥔 비밀 장부',
  '대비전에서 흘러나온 한마디', '봉수가 사흘째 오르지 않는다', '국청에 올려진 익명의 투서',
  '사신 행렬에 섞여든 첩자', '폐세자의 유서가 발견된다', '훈구와 사림이 한 사건으로 충돌',
  '외척이 군량 장부를 손에 넣는다', '명·청의 국서가 당도하다', '여진의 기병이 국경을 넘본다',
  '상단(商團)이 왕실에 거금을 빌려준다', '금군(禁軍) 교대 명부가 위조되다',
  '선왕의 어진(御眞)이 훼손된 채 발견되다', '과거 시험지에서 부정의 흔적이 나오다',
  '지방 관아의 곡식이 텅 비어 있다', '한밤 궁궐에 불이 났다', '왕의 수라에서 독이 검출되다',
  '폐비의 사사(賜死) 교지가 다시 거론되다', '망명한 역관이 비밀을 들고 돌아오다',
  '왜선(倭船)이 부산포 앞바다에 나타나다', '청의 칙사가 무리한 공물을 요구하다',
  '전염병으로 한 고을이 통째로 비다', '암행어사의 마패가 위조로 풀려나다',
  '세자가 대리청정 중 큰 실책을 저지르다', '왕의 친필 비망기가 도난당하다',
  '사화(士禍)의 명단이 미리 새어 나오다', '도성에 흉흉한 참요(讖謠)가 돌다',
  '변방 장수가 군량을 빼돌렸다는 고변', '대비가 수렴청정을 선언하다',
  '명문가 자제가 노비와 정분이 났다', '실종된 공주의 행방이 드러나다',
  '저잣거리에 가짜 왕족이 나타나다', '상소문이 어전에서 불태워지다',
  '국혼(國婚)을 둘러싸고 두 가문이 다투다', '광산에서 은맥이 발견되다',
  '청에 끌려간 환향녀(還鄕女)가 돌아오다', '전대 권신의 비밀 무덤이 파헤쳐지다',
  '왕이 미행 중 자객의 습격을 받다', '암자에 숨은 폐세손의 소문', '북벌(北伐)의 밀계가 새어 나가다',
  '대간(臺諫)이 집단 사직 상소를 올리다', '왕의 병세가 위중하다는 비밀',
  '책봉을 앞둔 세자빈이 의문의 병을 얻다', '둔전(屯田)의 장부가 두 벌로 작성되다',
  '천주학 서책이 사대부가에서 나오다', '봉화대 봉수군이 모두 사라지다',
  '왕실 종친이 역모로 고변당하다', '한양 도성문이 닫힌 채 열리지 않다',
  '거상의 객주에서 위조 어음이 발견되다', '선대왕의 유언이 두 가지로 전해지다',
  '암행어사가 죽은 채 발견되다', '궁녀가 비밀 서찰을 품고 도망치다',
  '변방의 진(鎭)이 하룻밤에 함락되다', '왕의 종기가 낫지 않아 어의가 잡혀가다',
  '과부가 된 군부인이 재가(再嫁)를 청하다', '사초(史草)가 통째로 사라지다',
  '청병(淸兵)을 빌리자는 차병(借兵) 논의', '진상품 인삼이 가짜로 바뀌다',
  '폐위된 왕비의 친정이 복권을 노리다', '역병 치료법을 안다는 의원이 나타나다',
  '국경 너머에서 망명을 청하는 명의 유민', '왕세제(王世弟) 책봉을 둘러싼 분란',
  '몰락한 양반이 공명첩(空名帖)을 사들이다', '잠행하던 왕자가 정인을 만나다',
  '대동법 시행을 둘러싼 향촌의 반발', '도성 한복판에서 살인이 벌어지다',
  '환관이 후궁과 내통한 정황', '선비들이 서원에 모여 통문을 돌리다',
  '거란·여진 혼혈 출신이 무과에 급제하다', '왕이 폐세자에게 보낸 밀서가 발견되다',
  '관상감이 불길한 천변(天變)을 보고하다', '의주의 만상(灣商)이 밀무역을 벌이다',
  '세곡선(稅穀船)이 통째로 침몰하다', '내명부의 위계가 하룻밤에 뒤집히다',
  '북관(北關)에 가뭄과 함께 민란이 일다', '사은사(謝恩使)가 청에서 돌아오지 않다',
  '병조판서의 인사 청탁 장부가 폭로되다', '귀양 간 죄인이 사면 직전 독살되다',
  '향리(鄕吏)가 양안(量案)을 조작하다', '왕대비의 친필 언문 교지가 나돌다',
  '국상(國喪) 중 복제(服制)를 둘러싼 예송', '한 가문이 세 명의 정승을 배출하다',
  '폐궁(廢宮)에서 옛 궁인의 백골이 나오다', '암행어사의 봉서(封書)가 중도에 바뀌다',
  '능침(陵寢)의 풍수가 흉하다는 상소가 올라오다', '사신단이 가져온 청의 비밀 국서가 둘로 나뉘다',
]
const SLOT_DEVICE = [ // 장르 장치 (60)
  '어전 설전으로 시각화', '상소·간찰(편지) 인용으로 사실감', '드라마틱 아이러니(독자만 아는 비극)',
  '미래지식을 무기로(제약 동반)', '밀지·교지·옥새를 MacGuffin으로', '파발·봉수의 지연으로 정보 비대칭',
  '신분 위장·암행으로 잠입', '고사(故事)·경전 인용 화법으로 제압', '사료(실록 기사) 도입부 삽입',
  '국문·친국 장면으로 압박', '반정 모의(명분→포섭→거병)', '간택·정략혼으로 동맹 재편',
  '장계·치계로 전황을 보고', '연좌·삼족으로 판돈 상승', '복선(伏線)을 사초에 숨겨둠',
  '회상으로 빙의 전 기억을 교차', '두 인물의 같은 사건 다른 증언', '독백으로 내면의 명분 갈등',
  '편지의 행간으로 진심을 감춤', '시(詩)·시조에 암호를 숨김', '점·해몽으로 운명을 암시',
  '관복 색·장신구로 신분 변화 표시', '시진(時辰)·통금으로 시간 압박', '봉서(封書)의 봉인 훼손 여부로 단서',
  '대비·중전의 막후 정치로 전환', '환관·상궁의 정보망 활용', '암행어사 출도로 반전',
  '잠행하는 왕의 시점 교차', '역모 고변과 역(逆)고변의 진실게임', '예송(禮訟) 논쟁으로 권력다툼 대리전',
  '과거(科擧) 시험 장면으로 인물 부상', '연회·하례에서 벌어지는 암투', '의궤(儀軌)·등록(謄錄)으로 사실 보강',
  '실명 인물과 가상 인물의 교차(팩션)', '거짓 죽음과 부활', '쌍둥이·대역(代役)의 정체 트릭',
  '독약·고문으로 자백을 강요', '서얼 차별을 극복 과제로 배치', '여성 인물의 제약을 긴장의 축으로',
  '미래의 사건을 예언처럼 흘림', '책략가의 바둑·장기로 정세 비유', '간자(間者)의 이중 보고',
  '국경 너머 정보의 시차(時差)', '실록·야사의 기록 충돌을 미스터리로', '권력자의 사소한 습관으로 정체 폭로',
  '명분 없는 살생의 업보(業報) 장치', '귀신·무속으로 민심을 흔듦', '천문(天文)·일식을 정치에 이용',
  '상소의 연명(聯名) 숫자로 세력 과시', '비변사(備邊司) 회의로 국정 결정', '밀무역 장부로 비리 추적',
  '족보·서계(書啓)로 출생의 비밀', '어보(御寶)·전국새의 진위 감별', '복명(復命) 보고의 누락으로 의심',
  '유배지 위리안치의 폐쇄 공간 활용', '교지 전달 행렬의 매복', '사약을 둘러싼 마지막 협상',
  '간택 단자(單子)에 숨긴 정치적 계산', '봉수·파발의 거짓 신호로 적을 유인', '내명부 위계의 미묘한 호칭 차이로 긴장',
  '실록 사관(史官)의 직필(直筆)이 권력을 위협', '왕의 미행 중 신분 탄로의 아슬함', '국혼(國婚) 절차를 정쟁의 무대로',
  '향약(鄕約)·통문(通文)으로 여론 동원', '사은·진하 사행(使行) 길의 외교 첩보전', '능행(陵幸) 행렬을 노린 거사',
  '암구호·표신(標信)으로 궁문 출입 통제',
]
const SLOT_STAKE = [ // 판돈(지면 무엇을 잃나) (50)
  '지면 삼족이 멸한다(연좌)', '가문이 삭탈관직·몰락', '주인공에게 사약이 내린다',
  '왕조의 향방이 갈린다', '전쟁의 승패가 걸린다', '신분이 천민으로 추락',
  '사랑하는 이가 후궁/볼모로', '개혁의 운명이 좌초', '도성이 함락된다', '세자의 폐위가 결정된다',
  '왕의 목숨이 위태롭다', '북방 영토를 잃는다', '대비의 신임을 잃는다',
  '평생의 정적에게 무릎 꿇는다', '비밀 출생이 폭로되어 멸문', '청에 볼모로 끌려간다',
  '과거 급제가 무효 처리된다', '집안의 노비·전답을 몰수당한다', '유배지에서 죽음을 맞는다',
  '백성 수만이 굶주린다', '역병이 도성 전체로 번진다', '신무기 비법이 적의 손에 넘어간다',
  '충신이 역적으로 몰린다', '세곡·군량이 바닥난다', '명·청 사대 관계가 파탄난다',
  '왕통(王統)의 정당성이 무너진다', '사화로 사림이 몰살된다', '가문의 딸이 정략의 제물이 된다',
  '서얼의 신분 상승 길이 막힌다', '미래를 바꿀 단 한 번의 기회를 놓친다',
  '동지들이 하나씩 처형된다', '종묘사직이 위태롭다', '어진 군주가 폐위될 위기',
  '국경 백성이 노략질에 휩쓸린다', '사초·실록의 진실이 영영 묻힌다',
  '왕의 후사(後嗣)가 끊긴다', '개혁 동지의 가족이 인질로 잡힌다', '한 고을이 통째로 도륙된다',
  '평생 쌓은 명망과 의리가 무너진다', '진실을 아는 마지막 증인이 사라진다',
  '왕세자빈 책봉이 무산된다', '북벌의 대업이 영원히 좌절된다', '정인이 적의 가문으로 시집간다',
  '전대(前代)의 누명을 끝내 벗지 못한다', '외척이 국정을 완전히 장악한다',
  '천주교도가 대대적으로 박해받는다', '의병의 거점이 발각된다', '왕의 비밀 친위세력이 와해된다',
  '실각하면 위리안치로 산 채 잊힌다',
]
const SLOT_TURN = [ // 전환(어떻게 뒤집나) (55)
  '결정적 증거 한 장으로 역전', '왕의 윤허가 결정타', '숨겨온 출생·정체의 폭로',
  '미래지식 신무기로 결전 역전', '배신자의 자백', '거사 타이밍을 한발 앞당겨', '뜻밖의 동맹의 배신',
  '잠행하던 왕의 직접 개입', '위조 문서의 진위가 드러나', '봉수가 늦어 거짓 보고가 들통',
  '대비의 한마디로 판이 뒤집힌다', '죽은 줄 알았던 인물의 귀환', '적의 첩자가 실은 아군이었다',
  '상소 연명에 백관이 합세', '천변(天變)을 민심 반전에 이용', '미래 사건을 예측해 선수를 친다',
  '적장(敵將)을 명분으로 회유', '비밀 장부가 어전에 제출되다', '국문에서 적이 스스로 자멸',
  '암행어사 출도로 일거에 평정', '사초(史草)의 기록이 결백을 입증', '독을 미리 알고 역이용',
  '의병·상단의 자금이 때맞춰 도착', '청·명의 정세 변화를 활용', '정적의 가족이 등을 돌리다',
  '결정적 순간 옥새를 손에 넣는다', '거짓 패배로 적을 방심시켜 역공', '예송 논쟁에서 명분을 선점',
  '몰래 길러둔 사병(私兵)이 나타난다', '폐세자의 생존이 증명된다', '왕의 친필 밀지가 공개된다',
  '적의 비리를 역으로 고변', '결혼 동맹으로 세력을 합친다', '민란을 명분으로 거병',
  '신무기 시연으로 조정을 설득', '뇌물 장부로 정적 일망타진', '잠입한 궁녀의 증언',
  '봉인된 유서가 진상을 밝힌다', '적의 내분을 부추겨 자중지란', '천문 예측이 적중해 신망을 얻다',
  '명분 있는 자결로 대세를 돌린다', '역관의 통역 조작을 역이용', '미래 지식으로 역병을 잡아 민심 장악',
  '북벌 명분으로 군권을 장악', '사면 교지를 가까스로 받아낸다', '정인의 희생으로 진실이 드러난다',
  '두 당파를 이간해 어부지리', '왕의 병환을 틈타 대리청정 장악', '거상의 자본으로 판을 뒤엎는다',
  '비밀 통로로 궁궐을 장악', '복위(復位) 명분을 끝내 세운다', '적의 거짓 장계를 가로채 폭로',
  '마지막 증인을 지켜내 결정타로 삼는다',
]
const SLOT_PERSONA = [ // 인물 장치(악역·조력 클리셰를 비틀어) (55)
  '음흉한 외척(겉은 충신)', '대의를 빙자한 당파 영수', '요녀형 후궁(실은 정치 전략가)',
  '간신처럼 보이나 충직한 환관', '잠행하는 어진 왕', '서얼 출신 책사', '몰락 양반가의 여식',
  '이중첩자인 역관(譯官)', '강직한 사헌부 대간', '재력으로 판을 흔드는 거상(巨商)',
  '미래에서 회귀한 폐세자', '수렴청정하는 노회한 대비', '실권 없는 허수아비 왕',
  '병권을 쥔 변방의 맹장', '독살에 능한 어의(御醫)', '천기를 읽는 관상감 관원',
  '복수를 품은 환향녀(還鄕女)', '글을 아는 천출(賤出) 책사', '명에서 망명한 화약 장인',
  '겉은 한량, 속은 책략가인 왕자', '대를 위해 가문을 버린 정승', '왕을 사모하는 무수리',
  '역모를 꿈꾸는 종친', '청에 빌붙은 친청파 대신', '북벌을 꿈꾸는 노장(老將)',
  '실학에 눈뜬 젊은 관료', '서원을 장악한 산림(山林)', '암행어사로 잠행하는 청백리',
  '가문을 일으키려는 중인 역관', '권력 앞에 변절한 옛 동지', '무예에 능한 궁녀',
  '천주학에 빠진 사대부', '백성 편에 선 고을 현감', '뇌물로 출세한 향리(鄕吏)',
  '대비의 양자가 된 종실', '폐비의 복수를 잇는 딸', '거짓 충성으로 신임을 산 첩자',
  '의병을 일으킨 몰락 무관', '왕세자의 스승인 강직한 사부', '대동법을 밀어붙이는 개혁 정승',
  '뒤에서 조종하는 막후의 부원군', '신분을 숨긴 왕족의 핏줄', '책봉을 노리는 야심찬 후궁',
  '충(忠)과 효(孝) 사이에서 갈등하는 무장', '간택을 거부한 사대부가 규수',
  '비변사를 쥐락펴락하는 노대신', '무과 급제한 천민 출신 장수', '왕의 밀명을 받든 비밀 내관',
  '복위를 도모하는 폐주의 충신', '두 임금을 섬긴 노련한 처세가', '여진어에 능한 변방 통사(通事)',
  '명분 없는 권력을 경멸하는 은둔 선비', '사약을 받고도 의연한 충신', '미래를 아는 자를 의심하는 책사',
]
const SLOT_ERA = [ // 시대 배경(왕대·정세) — 도시에 §8: 왕대가 분위기·사건을 결정 (40)
  '태조~태종: 개국과 왕자의 난', '세종: 성세(盛世)와 집현전', '세조: 계유정난 직후의 공포정치',
  '성종: 사림의 등장과 경국대전', '연산군: 무오·갑자사화의 폭정', '중종: 반정 직후와 조광조의 개혁',
  '명종: 외척 윤원형과 을사사화', '선조: 동서 분당과 임진왜란', '광해군: 중립외교와 폐모살제',
  '인조: 반정과 병자호란·삼전도', '효종: 북벌론의 시대', '현종: 두 차례 예송논쟁',
  '숙종: 환국(換局)의 정치', '경종: 노론·소론의 신임옥사', '영조: 탕평책과 사도세자',
  '정조: 규장각과 화성 건설', '순조: 세도정치의 시작', '헌종~철종: 외척 세도의 절정',
  '고종 초: 흥선대원군의 개혁', '대한제국기: 칭제건원과 격변',
  '고려 말: 위화도 회군 전야', '삼국 통일 전쟁기(신라·백제·고구려)', '발해·통일신라의 남북국',
  '고려 무신정권기', '몽골 침입과 강화 천도기', '가상 왕조(고증 부담을 던 퓨전 사극)',
  '중원 배경 가상 왕조(궁투·랑야방형)', '구한말 개화기의 혼돈',
  '단종: 어린 왕과 수양대군의 야망', '인종: 짧은 치세와 외척의 발호',
  '태종: 왕권 강화와 외척 숙청', '선조 말: 광해 vs 영창대군의 후계 다툼',
  '인조 초: 이괄의 난과 친명배금', '숙종 중: 장희빈과 인현왕후의 갈등',
  '영조 말: 사도세자의 비극과 정순왕후', '정조 사후: 신유박해의 칼바람',
  '고려 광종: 노비안검·과거제 도입', '백제 의자왕: 멸망 직전의 사비성',
  '고구려 연개소문 집권기', '조선 후기 실학과 천주교 유입기',
]
const SLOT_FACTION = [ // 정치 세력·당파 구도 — 도시에 §1, §8: 권력의 작동 원리 (32)
  '훈구 대 사림의 대결', '동인 대 서인의 분당', '남인 대 북인(대북·소북)',
  '노론 대 소론의 사생결단', '외척이 왕권을 잠식', '환관·내관이 막후를 장악',
  '대비의 수렴청정 대 친정파', '왕권 강화 대 신권(臣權)의 견제', '삼사(三司) 언관의 집단행동',
  '척신(戚臣)과 청류(淸流)의 대립', '산림(山林)이 재야에서 조정을 흔듦', '세도 가문의 국정 독점',
  '친명파 대 친청파', '주화파(主和派) 대 척화파(斥和派)', '북벌파 대 현실론자',
  '실학파 대 성리학 정통파', '개화파 대 위정척사파', '공신(功臣) 세력 대 왕의 친위세력',
  '왕실 종친 대 외척 가문', '향촌 사족(士族) 대 중앙 관료', '무반(武班) 대 문반(文班)의 알력',
  '서얼 허통(許通) 찬반 양론', '대동법 찬성파 대 반대파', '예송에서 기년설 대 삼년설',
  '탕평파 대 붕당 강경파', '의병·재야 세력의 부상', '상단(商團)·자본 세력의 정치 개입',
  '천주교 신자 대 박해 세력', '변방 군벌 대 중앙 조정', '왕의 비선(秘線) 대 공식 조정',
  '대국(명·청) 사대파 대 자주파', '두 임금 사이 양다리 처세 세력',
]
const SLOTS = [
  { key: 'era', label: '시대', icon: '🏯', pool: SLOT_ERA },
  { key: 'faction', label: '구도', icon: '⚔️', pool: SLOT_FACTION },
  { key: 'situation', label: '사건', icon: '📜', pool: SLOT_SITUATION },
  { key: 'device', label: '장치', icon: '🎭', pool: SLOT_DEVICE },
  { key: 'stake', label: '판돈', icon: '⚖️', pool: SLOT_STAKE },
  { key: 'turn', label: '전환', icon: '🔄', pool: SLOT_TURN },
  { key: 'persona', label: '인물', icon: '👤', pool: SLOT_PERSONA },
] as const
type SlotKey = typeof SLOTS[number]['key']
// 시대 × 사건 × 장치 × 판돈 × 전환 × 인물 = 핵심 생성기(1조 이상)
const COMBOS = SLOTS.reduce((n, s) => n * s.pool.length, 1)

// ── 데이터 모델 ──────────────────────────────────────────────────────────────
interface BeatState { text: string; done: boolean; tension: number }
interface Store {
  tpl: TplKey
  title: string
  beats: Record<string, BeatState> // beat.key -> state (템플릿 전환해도 유지)
}

function clampT(n: unknown, def = 5): number {
  const v = Math.round(Number(n)); if (!Number.isFinite(v)) return def
  return Math.min(10, Math.max(1, v))
}
function defaultStore(tpl: TplKey = 'regress'): Store {
  return { tpl, title: '', beats: {} }
}
function loadStore(): Store {
  const base = defaultStore()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return base
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return base
    const s: Store = {
      tpl: isTplKey(p.tpl) ? p.tpl : 'regress',
      title: typeof p.title === 'string' ? p.title : '',
      beats: {},
    }
    if (p.beats && typeof p.beats === 'object') {
      for (const k of Object.keys(p.beats)) {
        const v = p.beats[k]
        if (v && typeof v === 'object') {
          s.beats[k] = { text: typeof v.text === 'string' ? v.text : '', done: !!v.done, tension: clampT(v.tension) }
        }
      }
    }
    return s
  } catch { return base }
}
function beatState(store: Store, key: string, def: number): BeatState {
  return store.beats[key] || { text: '', done: false, tension: def }
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
export default function HistoryPlotLogic({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<Store>()
  if (!initial.current) initial.current = loadStore()

  const [store, setStore] = useState<Store>(initial.current)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const [copied, setCopied] = useState(false)

  // 영감 뽑기 상태
  const [slots, setSlots] = useState<Record<SlotKey, number>>(() => Object.fromEntries(SLOTS.map((s) => [s.key, Math.floor(Math.random() * s.pool.length)])) as Record<SlotKey, number>)
  const [locked, setLocked] = useState<Record<SlotKey, boolean>>(() => Object.fromEntries(SLOTS.map((s) => [s.key, false])) as Record<SlotKey, boolean>)

  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload.genre 활용 + 하위유형 사전 선택(연계 진입)
  const consumed = useRef(false)
  useEffect(() => {
    if (consumed.current || !payload) return
    consumed.current = true
    const t = payload.template ?? payload.tpl ?? payload.subgenre
    if (isTplKey(t)) setStore((s) => ({ ...s, tpl: t }))
    const g = typeof payload.genre === 'string' ? payload.genre : ''
    if (g && g !== '역사·사극') setNote(`현재 작품 장르: ${g} — 이 도구는 역사·사극 구조에 최적화되어 있어요.`)
    const title = typeof payload.title === 'string' ? payload.title : ''
    if (title) setStore((s) => ({ ...s, title }))
  }, [payload])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [store])

  const tpl = TPL_MAP[store.tpl]
  const beats = tpl.beats

  const flashMsg = (m: string) => { setFlash(m); window.setTimeout(() => { if (mounted.current) setFlash('') }, 1700) }

  // ── 비트 편집 ──────────────────────────────────────────────────────────────
  const patchBeat = (key: string, patch: Partial<BeatState>, def: number) =>
    setStore((s) => ({ ...s, beats: { ...s.beats, [key]: { ...beatState(s, key, def), ...patch } } }))

  const toggleDone = (b: BeatDef) => patchBeat(b.key, { done: !beatState(store, b.key, b.tension).done }, b.tension)
  const setText = (b: BeatDef, text: string) => patchBeat(b.key, { text }, b.tension)
  const setTension = (b: BeatDef, t: number) => patchBeat(b.key, { tension: clampT(t) }, b.tension)
  const toggleOpen = (key: string) => setOpen((o) => ({ ...o, [key]: !o[key] }))

  const setTpl = (t: TplKey) => setStore((s) => ({ ...s, tpl: t }))
  const setTitle = (title: string) => setStore((s) => ({ ...s, title }))

  // ── 진행률 ──────────────────────────────────────────────────────────────────
  const doneCount = beats.filter((b) => beatState(store, b.key, b.tension).done).length
  const filledCount = beats.filter((b) => beatState(store, b.key, b.tension).text.trim()).length
  const pct = beats.length ? Math.round((doneCount / beats.length) * 100) : 0

  // ── 진행곡선 SVG ─────────────────────────────────────────────────────────────
  const CW = 700, CH = 150, PADX = 28, PADY = 18
  const pts = beats.map((b, i) => {
    const st = beatState(store, b.key, b.tension)
    const x = beats.length <= 1 ? CW / 2 : PADX + (i / (beats.length - 1)) * (CW - PADX * 2)
    const y = PADY + (1 - (st.tension - 1) / 9) * (CH - PADY * 2)
    return { x, y, b, st }
  })
  const curvePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = pts.length
    ? `M${pts[0].x.toFixed(1)},${(CH - PADY).toFixed(1)} ` + pts.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ` L${pts[pts.length - 1].x.toFixed(1)},${(CH - PADY).toFixed(1)} Z`
    : ''

  // ── 복사/내보내기 텍스트 ─────────────────────────────────────────────────────
  const fmtPos = (r: [number, number]) => (r[0] === r[1] ? `약 ${r[0]}% 지점` : `${r[0]}~${r[1]}%`)
  const buildText = (): string => {
    const L: string[] = []
    L.push(`# 사극 플롯·진행곡선 — ${tpl.name}${store.title ? ` : ${store.title}` : ''}`)
    L.push(`# ${tpl.tag}`)
    L.push(`# 권장 고증 강도 ${tpl.fidelity}/100 · 미래지식 ${tpl.future ? '사용' : '미사용'} · 계보: ${tpl.daeexample}`)
    L.push(`# 진행률 ${doneCount}/${beats.length} (${pct}%)`)
    L.push('')
    beats.forEach((b, i) => {
      const st = beatState(store, b.key, b.tension)
      L.push(`${st.done ? '[v]' : '[ ]'} ${i + 1}. ${b.title}  〈위치 ${fmtPos(b.pos)} · 긴장 ${st.tension}/10 · 페이싱 ${b.pace}〉`)
      L.push(`    · ${b.desc}`)
      L.push(`    · 가이드: ${b.guide}`)
      L.push(`    · 장치: ${b.hook}`)
      if (st.text.trim()) st.text.trim().split('\n').forEach((ln) => L.push(`    > ${ln}`))
      L.push('')
    })
    return L.join('\n').trimEnd() + '\n'
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
      if (mounted.current) { setCopied(true); window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1500) }
    } catch { setNote('복사가 지원되지 않는 환경이에요. 텍스트를 직접 선택해 복사하세요.') }
  }

  // ── 프로젝트 연동: 구조 문서로 추가(folder:"구조") ───────────────────────────
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const buildBodyHtml = (): string => {
    const P: string[] = []
    P.push(`<p><em>${esc(tpl.name)} — ${esc(tpl.tag)}</em></p>`)
    P.push(`<p>권장 고증 강도 ${tpl.fidelity}/100 · 미래지식 ${tpl.future ? '사용' : '미사용'}</p>`)
    P.push(`<p>진행률 ${doneCount}/${beats.length} (${pct}%) · 계보: ${esc(tpl.daeexample)}</p>`)
    beats.forEach((b, i) => {
      const st = beatState(store, b.key, b.tension)
      P.push(`<h3>${i + 1}. ${esc(b.title)} ${st.done ? '✓' : ''}</h3>`)
      P.push(`<p><em>위치 ${fmtPos(b.pos)} · 긴장 ${st.tension}/10 · 페이싱 ${b.pace}</em></p>`)
      P.push(`<p>${esc(b.desc)}</p>`)
      P.push(`<p>가이드: ${esc(b.guide)}</p>`)
      P.push(`<p>장치: ${esc(b.hook)}</p>`)
      if (st.text.trim()) for (const ln of st.text.trim().split('\n')) P.push(`<p>${esc(ln) || '&nbsp;'}</p>`)
    })
    return P.join('')
  }
  const toProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: `사극 플롯 — ${tpl.name}${store.title ? ` (${store.title})` : ''}`,
      bodyHtml: buildBodyHtml(),
      meta: {
        장르: '역사·사극', 하위유형: tpl.name,
        진행률: `${doneCount}/${beats.length} (${pct}%)`,
        고증강도: `${tpl.fidelity}/100`, 미래지식: tpl.future ? '사용' : '미사용',
      },
    })
    flashMsg(id ? '✓ 프로젝트 자료 「구조」에 플롯 문서를 추가했어요' : '프로젝트에 연결되지 않았습니다')
  }

  // ── 영감 뽑기 ────────────────────────────────────────────────────────────────
  const roll = () => setSlots((prev) => {
    const next = { ...prev }
    for (const s of SLOTS) {
      if (locked[s.key]) continue
      if (s.pool.length <= 1) { next[s.key] = 0; continue }
      let r = Math.floor(Math.random() * s.pool.length)
      if (r === prev[s.key]) r = (r + 1) % s.pool.length // 같은 값 연속 방지
      next[s.key] = r
    }
    return next
  })
  const toggleLock = (k: SlotKey) => setLocked((l) => ({ ...l, [k]: !l[k] }))
  const ideaText = (): string => {
    const parts = SLOTS.map((s) => `${s.label}: ${s.pool[slots[s.key]]}`)
    return parts.join(' / ')
  }
  const copyIdea = async () => {
    const t = `[사극 비트 영감] ${ideaText()}`
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(t)
      flashMsg('영감을 복사했어요')
    } catch { setNote('복사가 지원되지 않는 환경이에요.') }
  }
  const ideaToLibrary = () => {
    const text = `[사극 비트 영감] ${ideaText()}`
    addToLibrary('snippets', { text, source: '사극 플롯·진행곡선', tags: ['역사·사극', tpl.name, '비트영감'] })
    flashMsg('글감 서랍(스니펫)에 담았어요')
  }
  // 활성 슬롯 영감을 가장 가까운 빈 비트의 메모에 붙여넣기(빠른 적용)
  const ideaToBeat = () => {
    const target = beats.find((b) => !beatState(store, b.key, b.tension).text.trim())
    const b = target || beats[0]
    const prev = beatState(store, b.key, b.tension).text
    const line = `· ${ideaText()}`
    setText(b, prev ? prev + '\n' + line : line)
    setOpen((o) => ({ ...o, [b.key]: true }))
    flashMsg(`「${b.title}」 비트에 영감을 넣었어요`)
  }

  // ── 초기화 ───────────────────────────────────────────────────────────────────
  const resetTpl = () => {
    if (!window.confirm('현재 하위유형의 모든 비트 메모·완료·긴장 조정을 초기화할까요?')) return
    setStore((s) => {
      const beatsCopy = { ...s.beats }
      for (const b of beats) delete beatsCopy[b.key]
      return { ...s, beats: beatsCopy }
    })
    flashMsg('이 하위유형을 초기화했어요')
  }

  // ── 스타일 ───────────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0 }
  const head: React.CSSProperties = { padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--chrome-2)' }
  const input: React.CSSProperties = { padding: '8px 10px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', minWidth: 0 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.55 }
  const barWrap: React.CSSProperties = { height: 10, borderRadius: 6, background: 'var(--paper)', border: '1px solid var(--border)', overflow: 'hidden' }
  const barFill: React.CSSProperties = { height: '100%', width: `${pct}%`, background: 'var(--ok)', transition: 'width .25s ease' }
  const ta: React.CSSProperties = { width: '100%', minHeight: 56, resize: 'vertical', padding: '8px 10px', fontSize: 13.5, lineHeight: 1.5, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const chk: React.CSSProperties = { flexShrink: 0, width: 18, height: 18, marginTop: 1, cursor: 'pointer', accentColor: 'var(--ok)' }
  const tplBtn = (t: TemplateDef): React.CSSProperties => ({
    flex: '1 1 150px', textAlign: 'left', cursor: 'pointer', padding: '9px 11px', borderRadius: 10,
    border: store.tpl === t.key ? `2px solid ${t.color}` : '1px solid var(--border)',
    background: store.tpl === t.key ? 'var(--paper)' : 'var(--chrome-2)', color: 'var(--text)',
  })
  const slotChip: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 9, padding: '7px 9px', display: 'flex', alignItems: 'center', gap: 8 }
  const foot: React.CSSProperties = { borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--chrome-2)' }

  return (
    <div style={wrap}>
      {/* 헤더: 제목 + 진행 */}
      <div style={head}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 18 }}><Emoji e="📜"/></span>
          <input style={{ ...input, flex: 1 }} value={store.title} onChange={(e) => setTitle(e.target.value)} placeholder="작품/플롯 제목 (선택)" maxLength={120} aria-label="작품 제목" />
          <button className="minibtn" onClick={copyAll} title="전체 시트를 텍스트로 복사">{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
        </div>
        <div style={barWrap}><div style={barFill} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, color: 'var(--muted)' }}>
          <span>완료 <strong style={{ color: 'var(--ok)' }}>{doneCount}</strong>/{beats.length} · 작성 <strong style={{ color: 'var(--text)' }}>{filledCount}</strong> · <strong style={{ color: tpl.color }}>{pct}%</strong></span>
          <span>고증 {tpl.fidelity}/100 · 미래지식 {tpl.future ? '사용' : '미사용'}</span>
        </div>
        {note && <div style={{ fontSize: 12, color: 'var(--warn)', lineHeight: 1.5 }}>{note}</div>}
      </div>

      <div style={body}>
        {/* ── 하위유형(템플릿) 선택 ── */}
        <div style={panel}>
          <div style={sectionTitle}>① 하위유형 — 구조의 1차 분기 축</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TEMPLATES.map((t) => (
              <button key={t.key} style={tplBtn(t)} onClick={() => setTpl(t.key)} aria-pressed={store.tpl === t.key}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: t.color }}>{t.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.45, marginTop: 3 }}>{t.tag}</div>
              </button>
            ))}
          </div>
          <div style={{ ...hint, marginTop: 8 }}>계보: {tpl.daeexample}</div>
        </div>

        {/* ── 진행곡선 ── */}
        <div style={panel}>
          <div style={sectionTitle}>② 진행곡선 — 비트별 긴장도(슬라이더로 조절)</div>
          <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" style={{ display: 'block', maxHeight: 170 }} role="img" aria-label="진행곡선">
            {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
              const y = PADY + g * (CH - PADY * 2)
              return <line key={i} x1={PADX} y1={y} x2={CW - PADX} y2={y} stroke="var(--border)" strokeWidth={1} strokeDasharray="2 4" opacity={0.6} />
            })}
            {areaPath && <path d={areaPath} fill={tpl.color} opacity={0.12} />}
            <path d={curvePath} fill="none" stroke={tpl.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {pts.map((p) => (
              <g key={p.b.key}>
                <circle cx={p.x} cy={p.y} r={4.5} fill={PACE_COLOR[p.b.pace]} stroke="var(--paper)" strokeWidth={1.5}>
                  <title>{`${p.b.title} (긴장 ${p.st.tension}/10 · ${p.b.pace})`}</title>
                </circle>
              </g>
            ))}
          </svg>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
            {(['느림', '보통', '빠름', '폭발'] as BeatDef['pace'][]).map((p) => (
              <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: PACE_COLOR[p] }} />페이싱 {p}
              </span>
            ))}
          </div>
        </div>

        {/* ── 비트 영감 뽑기(슬롯 풀 무작위) ── */}
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={sectionTitle as React.CSSProperties}>③ 비트 영감 뽑기</div>
            <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>조합수 <strong style={{ color: 'var(--text)' }}>{COMBOS.toLocaleString('ko-KR')}</strong>가지</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SLOTS.map((s) => (
              <div key={s.key} style={slotChip}>
                <span style={{ fontSize: 13, flexShrink: 0 }}><Emoji e={s.icon}/></span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', width: 30, flexShrink: 0 }}>{s.label}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.4 }}>{s.pool[slots[s.key]]}</span>
                <button className="minibtn" style={{ flexShrink: 0, opacity: locked[s.key] ? 1 : 0.55 }} onClick={() => toggleLock(s.key)} title={locked[s.key] ? '잠금 해제' : '이 슬롯 잠그기'} aria-pressed={locked[s.key]}>{locked[s.key] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <button className="btn-primary" onClick={roll}><Emoji e="🎲"/> 다시 뽑기</button>
            <button className="minibtn" onClick={ideaToBeat}>↧ 비트에 넣기</button>
            <button className="minibtn" onClick={copyIdea}><Emoji e="📋"/> 복사</button>
            <button className="minibtn" onClick={ideaToLibrary} title="글감 서랍(스니펫)에 저장"><Emoji e="📥"/> 글감 담기</button>
          </div>
          <div style={{ ...hint, marginTop: 8 }}>슬롯을 <Emoji e="🔒"/>로 잠그고 나머지만 재생성하세요. 사건×장치×판돈×전환×인물 조합으로 비트의 씨앗을 만듭니다.</div>
        </div>

        {/* ── 비트 스텝 시트 ── */}
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={sectionTitle as React.CSSProperties} >④ 비트 시트 — {tpl.name}</div>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setOpen(Object.fromEntries(beats.map((b) => [b.key, true])))}>모두 펼치기</button>
            <button className="minibtn" onClick={() => setOpen({})}>모두 접기</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {beats.map((b, i) => {
              const st = beatState(store, b.key, b.tension)
              const isOpen = !!open[b.key]
              const hasContent = !!st.text.trim()
              return (
                <div key={b.key} style={{ border: '1px solid var(--border)', borderRadius: 11, background: 'var(--chrome-2)', borderLeft: `4px solid ${st.done ? 'var(--ok)' : PACE_COLOR[b.pace]}`, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px' }}>
                    <input type="checkbox" style={chk} checked={st.done} onChange={() => toggleDone(b)} aria-label={`${b.title} 완료`} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>
                        {i + 1}. {b.title}
                        {hasContent && !isOpen && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · 작성됨</span>}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span>위치 {fmtPos(b.pos)}</span>
                        <span style={{ color: PACE_COLOR[b.pace], fontWeight: 700 }}>페이싱 {b.pace}</span>
                        <span>긴장 {st.tension}/10</span>
                      </div>
                    </div>
                    <button className="minibtn" style={{ flexShrink: 0 }} onClick={() => toggleOpen(b.key)} aria-expanded={isOpen}>{isOpen ? '접기 ▲' : '펼치기 ▼'}</button>
                  </div>
                  {isOpen && (
                    <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>{b.desc}</div>
                      <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--warn)' }}><Emoji e="⚠"/> {b.guide}</div>
                      <div style={{ fontSize: 12, lineHeight: 1.6, color: tpl.color }}><Emoji e="🎭"/> 어울리는 장치: {b.hook}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11.5, color: 'var(--muted)', flexShrink: 0 }}>긴장도</span>
                        <input type="range" min={1} max={10} value={st.tension} onChange={(e) => setTension(b, Number(e.target.value))} style={{ flex: 1, accentColor: tpl.color }} aria-label={`${b.title} 긴장도`} />
                        <strong style={{ fontSize: 12.5, width: 40, textAlign: 'right', color: tpl.color }}>{st.tension}/10</strong>
                      </div>
                      <textarea style={ta} value={st.text} onChange={(e) => setText(b, e.target.value)} placeholder="이 비트에서 일어날 사건·장면·대사를 적어 보세요…" aria-label={`${b.title} 메모`} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 10 }}>
            <button className="minibtn" onClick={resetTpl} style={{ color: 'var(--warn)' }}>이 하위유형 초기화</button>
          </div>
        </div>

        {/* ── 프로젝트 연동 ── */}
        <div className="linkbar" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="linkbar-label">연계:</span>
          <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()}
            title={hasProjectBridge() ? '비트 시트 전체를 프로젝트 자료 「구조」 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
          <button className="linkbtn" onClick={() => openToolLinked('save-the-cat-beats', { title: store.title })} title="Save the Cat 비트 시트 열기"><Emoji e="🐱"/> 비트 시트</button>
          <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { title: store.title })} title="플롯 피라미드 열기"><Emoji e="🔺"/> 플롯 피라미드</button>
          <button className="linkbtn" onClick={() => openToolLinked('chapter-planner', { title: store.title })} title="장 개요 플래너 열기"><Emoji e="📖"/> 장 개요</button>
          <button className="linkbtn" onClick={() => openToolLinked('anachronism-checker')} title="시대착오 점검 열기"><Emoji e="🏺"/> 시대착오 점검</button>
        </div>
        {flash && <div style={{ fontSize: 11.5, color: 'var(--ok)', fontWeight: 600 }}>{flash}</div>}

        <div style={hint}>각 비트를 펼쳐 사건을 적고 완료를 체크하세요. 긴장도 슬라이더로 진행곡선을 다듬을 수 있어요. 내용은 이 브라우저에 자동 저장됩니다.</div>
      </div>
    </div>
  )
}
