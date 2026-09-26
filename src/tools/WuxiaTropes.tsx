// 무협(武俠) 트로프·관습 체크리스트 — 무협 장르 고유의 독자 기대(은원·기연·강호 질서·무공 성장 곡선)·필수 요소·
//   흔한 함정(파워 인플레이션·기연 남발·초식 작명 공허화)·클리셰(+비틀기 변주)를 펼침형 카테고리 + 검색 +
//   체크리스트로 점검한다. 클리셰는 슬롯 무작위 '비틀기 생성기'로 신선한 변주(조합수 표시, 1조 이상)를 즉석 생성하고,
//   마음에 드는 변주는 글감(snippets)으로 저장하거나 프로젝트 '기획' 폴더 문서로 추가한다.
// 모든 상태(체크 여부·메모·사용자 항목·접힘·슬롯 잠금)는 localStorage('sry:tool:wuxia-tropes')에 자동 저장/복원.
// 자급식: react 와 './linkbus' 외 import 없음. localStorage 미지원/차단/손상 시 메모리만 사용(throw 금지). 언마운트 정리.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'wuxia-tropes', name: '무협 트로프·관습 체크리스트', icon: '⚔️', group: '구상·정리', genre: '무협', intro: '무협 독자 기대(은원·기연·강호 질서)·필수 요소·함정·클리셰(+비틀기)를 점검하고 신선한 변주를 만드세요', w: 680, h: 660 }

const LS_KEY = 'sry:tool:wuxia-tropes'

// ──────────────────────────────────────────────────────────────────────────
// 카테고리별 점검 항목 — 무협 도시에에 근거한 구체·특화 데이터(일반론 배제).
//   kind: 'expect'(독자 기대) | 'must'(필수 요소) | 'trap'(흔한 함정) | 'cliche'(클리셰+비틀기)
// ──────────────────────────────────────────────────────────────────────────
interface CatItem { t: string; note?: string; twist?: string }
interface Category { id: string; name: string; icon: string; kind: 'expect' | 'must' | 'trap' | 'cliche'; desc: string; items: CatItem[] }

const KIND_META: Record<Category['kind'], { label: string; color: string; mark: string }> = {
  expect: { label: '독자 기대', color: 'var(--accent)', mark: '✔' },
  must: { label: '필수 요소', color: 'var(--ok)', mark: '◆' },
  trap: { label: '흔한 함정', color: 'var(--warn)', mark: '⚠' },
  cliche: { label: '클리셰 · 비틀기', color: 'var(--muted)', mark: '↻' },
}

const CATEGORIES: Category[] = [
  // ── 독자 기대(Reader Contract) ──
  {
    id: 'contract', name: '독자와의 약속', icon: '🤝', kind: 'expect',
    desc: '무협 독자가 기본으로 기대하는 장르 계약',
    items: [
      { t: '약자→강자의 무공 성장 곡선이 선명하다 — "어떤 무공을, 어떤 기연으로, 어떤 대가로 얻는가"', note: '성장 없는 무협은 계약 위반. 폐인·막내제자·무재(無才)에서 출발해야 카타르시스가 산다' },
      { t: '은원(恩怨)이 분명하다 — "은혜는 반드시 갚고, 원한도 반드시 갚는다(有恩必報·有仇必報)"', note: '협의 윤리의 핵심. 빚을 갚고 원수를 베는 동선이 플롯 엔진' },
      { t: '강호(江湖)의 위치 감각이 선다 — 이 인물이 정·사·마 어디에, 서열 어디쯤인가', note: '독자는 항상 "이자가 강호에서 어느 위치인가"를 가늠한다' },
      { t: '결투의 디테일 — 초식 이름·내공 운용·병기 묘사로 합(合)을 주고받는다', note: '"이 한 수를 받아라"식 합 묘사 없이는 무협이 아니다' },
      { t: '기연(奇緣)에 대한 기대와 진부함 경계를 동시에 만족시킨다', note: '독자는 절벽 추락·비동 비급을 기대하면서도 식상함을 경계 — 변주가 관건' },
      { t: '개인 복수에서 천하대의(大義)로 스케일이 확장된다', note: '사문·가족 몰살의 사적 복수 → 정사대전·마교 침공의 강호 운명으로' },
      { t: '협(俠)의 윤리 — 의리·신의·약자 보호가 인물의 행동을 규율한다', note: '협의 대자(俠之大者), 위국위민(爲國爲民) — 김용형 정통 협의 격상' },
      { t: '(웹소설) 회차당 1 사이다 — 무시→증명→응징을 한 회 안에 닫는다', note: '도발받음→얕보임→압도적 반격→주변의 경악(리액션)' },
      { t: '(웹소설) 회귀(回歸)의 정보 우위 — "미래를 아는 강자"의 더블 어드밴티지', note: '화산귀환형. 전생 기억으로 기연·함정을 선점' },
      { t: '(웹소설) 먼치킨의 카타르시스 — 압도적 격차의 확인사살과 적의 경악', note: '마지막 "경악 리액션"이 통쾌함의 핵심' },
    ],
  },
  // ── 필수 요소: 무공 메커니즘 ──
  {
    id: 'martial', name: '무공·내공 메커니즘', icon: '🥋', kind: 'must',
    desc: '무협의 가장 핵심적 장치 — 강함의 정량화',
    items: [
      { t: '내공(內功)·진기(眞氣) 메커니즘 — 단전(丹田) 축적, 운기조식(運氣調息), 경맥·기경팔맥 운용', note: '무공 위계를 정량화하는 엔진. 웹소설은 상태창/수치로 명시화하기도' },
      { t: '심법(心法)이 무공의 근본 — 어떤 심법 계열인가(불가·도가·마공·사공)', note: '심법의 성격이 위력·부작용·도덕색을 결정' },
      { t: '기(氣)→강(罡)의 위계가 일관된다 — 검기(劍氣)→검강(劍罡), 도기→도강', note: '경지의 가시적 척도. 검기 발현 = 절정 진입 신호' },
      { t: '경지 위계가 고정됐다 — 삼류·이류·일류·절정·초절정·화경(현경·생사경)', note: '천하제일인·무림지존까지의 사다리를 미리 설계' },
      { t: '초식(招式)·보법(步法)·신법(身法)·경공(輕功)의 역할이 구분된다', note: '답설무흔·이형환위 등 경공, 보법으로 위치 선점' },
      { t: '무공에 원리·약점·상성이 있다 — 강(剛) vs 유(柔), 쾌(快) vs 중(重)', note: '멋진 이름만이 아니라 어떻게 이기고 지는지의 인과' },
      { t: '주화입마(走火入魔)·심마(心魔) — 무리한 수련/마공의 리스크 비용', note: '성장의 대가이자 긴장 장치. 단전 폐쇄·발광·폐인' },
      { t: '(웹소설) 상태창·수치 시스템의 규칙이 일관되다 — 공력 수치/경지/스킬', note: '성장의 수치화로 즉각 보상감 제공' },
    ],
  },
  // ── 필수 요소: 강호 세력 구도 ──
  {
    id: 'jianghu', name: '강호 세력 구도', icon: '🏯', kind: 'must',
    desc: '정·사·마와 문파 정치의 지형',
    items: [
      { t: '정파-사파-마교의 삼분 구도가 잡혔다', note: '정파(구파일방·세가), 사파(흑도·녹림), 마교(천마신교·일월신교)' },
      { t: '구파일방(九派一幇)의 구성을 정했다 — 소림·무당·화산·아미·곤륜·점창·청성·종남·공동 + 개방', note: '작품마다 구성 변동. 본작의 "정통 권위"를 누가 쥐는가' },
      { t: '오대세가(五大世家) — 남궁(검)·사천당문(암기·독)·모용·황보·제갈(지략·진법)', note: '세가별 특화 무공/가풍이 캐릭터성을 만든다' },
      { t: '무림맹(武林盟)·맹주의 권력 구조 vs 마교의 대척', note: '정파 연합의 정치·내분이 음모 플롯의 토대' },
      { t: '새외(塞外)·서장·북해 외부 위협 세력을 배치했다', note: '밀교·라마승·빙공 등 강호 바깥의 변수' },
      { t: '사문(師門)·문파 시스템 — 사부-제자 관계가 도덕·플롯의 축', note: '사문의 원수 = 복수 동기, 문파 간 정치' },
      { t: '관무불가침(官武不可侵) 룰 — 관(官)·황실과 강호의 긴장 처리', note: '관은 강호 일에 개입 않는다는 암묵 룰을 따르거나 깨거나' },
      { t: '직업·경제 — 표국(鏢局)·살수조직·개방 정보망·의원/독인·신병 대장장이', note: '강호의 생계와 정보 유통 구조' },
    ],
  },
  // ── 필수 요소: 서사 장치 ──
  {
    id: 'devices', name: '서사 장치(기연·비급)', icon: '📜', kind: 'must',
    desc: '무협 고유의 플롯 엔진',
    items: [
      { t: '기연(奇緣) 설계 — 절벽 추락→비동(秘洞)→전대고수 유해·심법서', note: '서사적 레벨업 장치. 반드시 대가·제약을 동반시켜라' },
      { t: '영약(靈藥)·내단(內丹) — 만년하수오·공청석유·영물 내단으로 내공 급상승', note: '복용에 위험/부작용/희소성을 부여하면 무게가 산다' },
      { t: '전인(傳人) 지목 — 절대고수가 죽기 전 무공·유지를 물려줌', note: '주화입마 직전·단전 폐인 직전 등 위기와 결합' },
      { t: '상승무공(上乘武功)·신공(神功) 비급 쟁탈전이 플롯 엔진', note: '천하제일을 가르는 단 하나의 신공 — 쟁탈전이 동력' },
      { t: '신분 위장·정체 은닉 — 명문 후예/마교 후계/폐인인 척', note: '후반 반전의 떡밥으로 심어둔다' },
      { t: '비무(比武)·논검(論劍) 이벤트 — 화산논검식 공식 대결', note: '서열 재편·등장인물 무대화 장치' },
      { t: '독·암기·기문진(奇門陣)·기관(機關) — 정면 무력 외의 변수', note: '당문의 암기·독, 진법으로 다수가 고수를 제압' },
      { t: '마공의 트레이드오프 — 흡성대법·화공으로 강해지되 인간성·수명·이성을 잃는다', note: '도덕적 딜레마 장치. 강함의 윤리적 비용' },
      { t: '(웹소설) 회귀·환생·빙의 — 전생 기억의 정보 우위', note: '한무 4세대 표준 엔진' },
    ],
  },
  // ── 흔한 함정(Pitfalls) ──
  {
    id: 'traps', name: '피해야 할 함정', icon: '🕳️', kind: 'trap',
    desc: '무협 특유의 몰입을 깨는 실수',
    items: [
      { t: '파워 인플레이션 — 경지를 끝없이 올려 후반 긴장·스케일이 통제 불능', note: '위계 상한과 "강함의 대가"를 미리 설계할 것' },
      { t: '기연 남발 — 위기마다 새 비급·영약으로 해결해 성취의 무게가 소실된다', note: '기연엔 반드시 대가·제약을. 공짜 성장은 카타르시스를 죽인다' },
      { t: '초식 작명 공허화 — 멋진 한자 이름만 나열, 실제 묘사·전술·인과가 없다', note: '무공은 원리·약점·상성으로 보여줘야 한다' },
      { t: '내공 수치 인플레 — "공력 몇 갑자(甲子)"가 의미를 잃을 만큼 남발', note: '한 갑자(60년)의 무게를 지키지 않으면 척도가 붕괴' },
      { t: '(정통형) 초반 수련 묘사 과다로 페이싱이 늘어진다', note: '운기조식·심법 해설에 발이 묶이면 출도가 늦어진다' },
      { t: '(웹소설) 사이다 남발로 긴장이 소실된다', note: '응징만 반복되면 위협이 사라지고 통쾌함도 마비된다' },
      { t: '회귀 정보 우위의 만능화 — 미래 지식으로 모든 위기를 즉답', note: '미래가 바뀌는 나비효과·정보의 한계를 부과해야 긴장 유지' },
      { t: '강호 지리·서열의 비일관 — 같은 인물의 위상이 장면마다 달라진다', note: '정·사·마 세력도와 고수 랭킹을 표로 관리' },
      { t: '여성 인물의 도구화 — 미녀의 호위/하룻밤 인연만으로 소비', note: '통속 무협의 낡은 관습. 독립적 동기를 부여' },
      { t: '관(官)·시대 고증의 충돌 — 무국적 강호와 실제 왕조 디테일이 엇갈린다', note: '사실계/선협계, 시대 특정/흐릿함을 초기에 고정' },
    ],
  },
  // ── 클리셰 + 비틀기 ──
  {
    id: 'cliches', name: '클리셰 → 비틀기', icon: '♻️', kind: 'cliche',
    desc: '인지하고 변주할 무협 정석 클리셰',
    items: [
      { t: '절벽에서 떨어졌는데 안 죽고 비동에서 기연을 얻는다', twist: '비동의 비급은 미끼였다 — 전대고수가 후인을 시험·이용하려 친 함정이고, 진짜 기연은 그것을 간파하는 안목이다' },
      { t: '폐기 취급/무재(無才) 막내가 알고 보니 천재·특이체질(천맥·구음절맥·만독불침)', twist: '특이체질은 축복이 아니라 시한부 저주였다 — 강해질수록 수명을 태우는 몸' },
      { t: '죽어가는 절대고수가 주인공을 전인으로 지목해 무공을 전수', twist: '전수받은 신공은 사실 마공이었고, 노고수는 자기 심마를 후인에게 떠넘긴 것이었다' },
      { t: '객잔(客棧)에서 시비가 붙고 거기서 정체·실력이 드러난다', twist: '주인공이 일부러 무명을 가장해 시비를 유도 — 적의 정보망을 역이용하는 함정 수사' },
      { t: '비무대회 우승 → 미녀·세력의 주목을 받는다', twist: '우승은 자충수였다 — 천하에 실력을 드러낸 순간 모든 비급 도둑·살막의 표적이 된다' },
      { t: '알고 보니 사부/최종보스가 부모·혈육·은인이었다', twist: '혈연 반전을 주인공이 먼저 안다 — 그래서 칼을 들 수 없는 자가 어떻게 협(俠)을 지키는가의 비극' },
      { t: '천마신교·마교는 절대악, 정파는 정의의 수호자', twist: '마교의 율법이 더 정의롭고, 정파 무림맹이야말로 위선과 권력욕의 카르텔이었다' },
      { t: '복수를 위해 강해져 결국 사문의 원수를 벤다', twist: '복수를 완수하자 자신이 원수와 똑같은 자가 되어 있었다 — 은원의 공허(서효원형 비극)' },
      { t: '금기무공·반탄지력으로 강적을 이기고 천하제일이 된다', twist: '이기되 단전이 파괴되고 수명이 소진된다 — "이기고도 모든 것을 잃는" 정점(대가 지불형 승리)' },
      { t: '(웹) 회귀한 절대고수가 약자 시절로 돌아가 모든 걸 갈아엎는다', twist: '회귀했지만 강호의 흐름이 미세하게 바뀌어, 알던 미래가 더는 통하지 않는 더 깊은 절망' },
      { t: '(웹) 무시당하던 폐인이 각성해 무시한 자들을 응징한다', twist: '응징의 쾌감에 취해갈수록, 한때 자신을 짓밟던 자들의 논리를 그대로 닮아간다' },
      { t: '천하대전(정사대전·마교 침공)으로 강호의 운명이 갈린다', twist: '천하제일이 된 주인공이 모든 것을 버리고 귀은(歸隱) — 강호의 정점에서 강호를 떠나는 무협 특유의 엔딩' },
    ],
  },
]

// ──────────────────────────────────────────────────────────────────────────
// 클리셰 '비틀기 생성기' 슬롯 풀 — 무협 특화(구체·자작). 8슬롯 조합으로 신선한 변주 한 줄을 만든다.
//   조합수 = 각 풀 길이의 곱. 36·36·34·34·32·32·30·30 → 1,380,719,001,600 ≈ 1.38조 > 1조(핵심 생성기 목표 초과).
// ──────────────────────────────────────────────────────────────────────────
const SLOTS = {
  who: {
    label: '주인공', items: [ // 36
      '몰락한 명문세가의 막내', '폐인 취급받던 문파의 잡일꾼', '사문이 멸문당한 마지막 제자', '단전이 폐쇄된 무재(無才)의 자제', '회귀한 전대 천하제일인',
      '천마신교 교주의 숨겨진 자식', '구음절맥(九陰絶脈)을 타고난 소녀', '만독불침의 체질을 지닌 약초꾼', '기억을 잃고 비동에서 깨어난 검객', '개방의 말단 거지',
      '표국의 어린 표사(鏢師)', '살막에서 길러진 어린 살수', '비급을 훔쳐 달아난 좀도둑', '강호를 등지고 은거하던 노고수', '사천당문에서 추방된 독인(毒人)',
      '환생한 마교의 호법', '주화입마로 폐인이 된 검성', '신분을 숨긴 황실의 후예', '소림 속가제자 출신의 떠돌이', '무당파에서 파문당한 도사',
      '비무에서 평생 패한 적 없는 광검', '얼굴을 천으로 가린 정체불명의 낭인', '천형(天刑)의 체질로 무공을 못 익히던 자', '강호 정보상의 어린 견습', '죽었다 살아 돌아온 명문의 후계',
      '가문의 원수에게 거둬진 양자', '신병이기(神兵利器)를 품고 도망친 대장장이의 딸', '점창파의 검술 천재', '아미파에 의탁한 비구니', '백 년 묵은 영물의 내단을 삼킨 사냥꾼',
      '천하제일 비급의 마지막 조각을 쥔 자', '심마에 사로잡힌 마도(魔道)의 후계', '복수만을 위해 살아온 자객', '강호를 모르고 자란 산골 소년', '전대 무림맹주의 유일한 혈육',
      '정체를 숨긴 채 객잔을 떠도는 술꾼',
    ],
  },
  trope: {
    label: '무협 클리셰', items: [ // 36
      '절벽 추락 후 비동 기연', '절대고수의 전인 지목', '폐인이 천재로 각성', '멸문당한 사문의 복수', '천하제일 신공 비급 쟁탈',
      '정사대전(正邪大戰)의 발발', '마교의 강호 침공', '비무대회·논검 우승', '회귀 후 강호 재편', '신분을 숨긴 명문 후예',
      '구파일방의 권력 다툼', '오대세가 간의 혼사·음모', '주화입마와 심마의 위기', '영약·내단으로 내공 급상승', '사부가 사실 흑막',
      '최종보스가 혈육이었다', '관(官)과 강호의 충돌', '새외 세력의 중원 침입', '독·암기·기문진의 함정', '흡성대법·마공의 유혹',
      '천마신교 교주의 후계 다툼', '무림맹주 선출과 내분', '살막의 청부 살인', '표국의 위험한 호송', '강호 은원의 대물림',
      '미녀와의 운명적 인연', '비급을 노린 추격전', '천형 체질의 운명', '귀은(歸隱)한 노고수의 출도', '강호 서열의 재편',
      '독고구검·무애신공류 절학의 전승', '점혈(點穴)과 해혈의 대결', '검기에서 검강으로의 돌파', '무림 칠대 금지(禁地)의 봉인', '천하제일인의 자리 다툼',
      '협의(俠義)와 사사로운 정 사이의 갈등',
    ],
  },
  twistAxis: {
    label: '비트는 축', items: [ // 34
      '사실은 정반대였다', '대가가 너무 컸다', '진짜 흑막은 조력자였다', '기연이 곧 함정이었다', '복수의 끝에 적과 똑같아졌다',
      '약점이 유일한 무기였다', '신공이 사실 마공이었다', '승리가 가장 큰 패배였다', '적의 협(俠)이 더 올발랐다', '기억이 조작되어 있었다',
      '회귀해도 미래가 통하지 않았다', '봉인된 것은 악이 아니라 진실이었다', '특이체질이 시한부 저주였다', '정보 우위가 오만의 독이 되었다', '동료가 곧 제물이었다',
      '정파가 위선의 카르텔이었다', '천하제일이 곧 모든 것의 상실이었다', '은혜를 갚자 더 큰 빚이 생겼다', '원수가 사실 은인이었다', '강해질수록 인간성을 잃었다',
      '구한 강호가 구할 가치가 없었다', '운명을 거스르려는 행동이 운명을 완성했다', '사부가 마지막 시험을 위해 죽음을 가장했다', '비급의 마지막 장이 찢겨 있었다', '귀은(歸隱)이 곧 새로운 시작이었다',
      '주화입마가 더 높은 경지의 관문이었다', '점혈된 것은 몸이 아니라 마음이었다', '천마(天魔)는 강호를 지키던 자였다', '협의를 지킬수록 사람을 잃었다', '한 수의 양보가 천하를 바꿨다',
      '진실을 아는 순간 모두가 그를 적으로 돌렸다', '되돌린 시간 속에서 사랑하던 이가 사라졌다', '무공을 버려야만 이길 수 있었다', '복수의 대상은 이미 죽어 있었다',
    ],
  },
  stake: {
    label: '판돈', items: [ // 34
      '천하제일의 자리', '사문의 존망', '잊힌 은원의 진실', '강호의 정사 균형', '천하제일 신공의 행방',
      '혈통의 정통성', '무림맹주의 자리', '한 문파의 멸문 여부', '회귀 전 기억의 진위', '단전과 무공의 보전',
      '비급의 마지막 조각', '중원과 새외의 휴전', '마교와 정파의 휴전', '천마신교의 후계', '강호 칠대 금지의 봉인',
      '점혈된 절대고수의 해혈', '관무불가침의 균열', '오대세가의 가문 비밀', '독·암기의 천하무적 비방', '주화입마에 빠진 사부의 목숨',
      '무림 서열의 재편', '협(俠)이라는 이름의 정의', '미녀가 쥔 가문의 운명', '살막의 흑막 명부(名簿)', '신병이기의 소유권',
      '구파일방의 정통 권위', '천하대전의 승패', '대물림된 저주의 단절', '강호 정보망의 장악', '귀은한 노고수의 출도 여부',
      '심마에 잠식된 자아의 보전', '내공 한 갑자(甲子)의 향방', '복수 완수와 협의 사이의 선택', '강호 전체의 운명',
    ],
  },
  lineage: {
    label: '계보·결', items: [ // 32
      '김용형 정통 대협(위국위민)', '고룡형 낭인 추리(찰나의 한 수)', '한무 신무협(좌백·용대운류 내면·문체)', '웹소설 회귀 먼치킨(화산귀환형)', '서효원형 비운의 천재 비극',
      '선협(仙俠)·검선(劍仙) 환상계', '대본소 통속·낭만 무협', '복수극(은원의 무게)', '천하대하 장편 서사', '비정한 강호 생존극',
      '권선징악 사이다', '도덕적 회색(정·사 경계의 흐림)', '풍종호류 기상천외한 무공 상상', '사파·흑도 안티히어로', '협의(俠義) 성장담',
      '미스터리 강호 음모극', '코믹·해학 무협', '아련한 회한·귀은의 노스탤지어', '광기·심마의 다크 무협', '동료애·의기(義氣)의 따뜻함',
      '먼치킨 무쌍·경악 리액션', '느린 수련·기연의 정공법', '여성 관점 무협(진산류)', '운명론적 숙명극', '관(官)과 강호의 정치 스릴러',
      '새외·이민족 색채의 변경 무협', '비무·논검 토너먼트물', '시스템·상태창 결합 무협', '독·암기·기관술의 두뇌 대결', '비극적 희생의 정점',
      '아이러니·블랙코미디 강호', '서정적 미문(美文)의 검(劍)',
    ],
  },
  setting: {
    label: '무대', items: [ // 32
      '안개에 잠긴 천 길 절벽의 비동(秘洞)', '시비가 끊이지 않는 강호의 객잔(客棧)', '눈 덮인 새외(塞外)의 설산', '검향(劍香)이 감도는 무당산 도관', '향화(香火) 자욱한 소림사 경내',
      '암기와 독이 도사린 사천당문', '거지들이 모이는 개방의 분타(分舵)', '비무가 벌어지는 화산논검의 봉우리', '청루(靑樓)와 도박장이 즐비한 변경 도시', '표물을 호송하는 험준한 산길',
      '천마신교가 웅거한 마교 총단', '무림맹이 소집된 영웅대회의 연무장', '기문진(奇門陣)이 깔린 폐허의 고묘(古墓)', '장강(長江)을 오르내리는 거룻배 위', '낙양·항주의 번화한 저잣거리',
      '살수들이 깃든 살막(殺幕)의 지하', '백 년 봉인이 풀려가는 무림 금지(禁地)', '독무(毒霧)가 피어오르는 만독곡(萬毒谷)', '얼음 검을 쓰는 북해빙궁', '서장 밀교의 라마 사원',
      '강호 정보가 거래되는 정보상의 밀실', '폐문(廢門)이 된 옛 문파의 잔해', '비급 한 권에 피바람 부는 강호 전체', '회귀가 되풀이되는 운명의 그날', '협곡 사이 외나무다리의 결투장',
      '대장간의 화로가 신병(神兵)을 벼리는 야장', '의원(醫員)과 독인이 공존하는 약초 마을', '황실과 강호가 부딪히는 금의위 관아', '천하제일을 가리는 비무대(比武臺)', '심마(心魔)가 깨어나는 폐관 수련의 동굴',
      '두 달이 뜨는 가상 왕조의 변방', '강호를 등진 노고수의 외딴 초막',
    ],
  },
  foe: {
    label: '적·장애', items: [ // 30
      '강호 침공을 노리는 천마신교 교주', '위선으로 무림을 쥔 무림맹주', '주화입마로 미쳐버린 전대 검성', '흡성대법으로 내공을 빨아들이는 마두', '사문을 멸한 원수이자 옛 사형',
      '주인공을 키운 진짜 흑막인 사부', '회귀 전의 자기 자신', '의지를 지닌 마검(魔劍)의 사념', '중원을 노리는 새외의 라마 고수', '협(俠)을 빙자한 살수 조직 살막',
      '강호를 리셋하려는 봉인된 고대 마인', '대를 이은 가문의 숙적', '죽음을 거부하고 사술을 익힌 노마(老魔)', '진실을 은폐하는 정파 장로 회의', '독·암기로 무적인 사천당문의 배신자',
      '점혈로 고수들을 무력화하는 점혈수(點穴手)', '광신에 사로잡힌 사이비 교주', '봉인을 풀려는 마교의 호법단', '관무불가침을 깨려는 금의위 수장', '주인공의 비급을 탐하는 비급 도둑들',
      '강호를 심판하려는 은거 노고수', '거짓 평화를 강요하는 황실의 음모', '기억을 조작하는 환술(幻術)의 마녀', '천하제일을 두고 평생 겨룬 호적수', '주인공을 시험하는 멘토 사부 자신',
      '돌이킬 수 없는 수명의 한계', '치르지 못할 마공의 대가', '끝없이 강해지는 파워 인플레이션', '아군 속에 숨은 마교의 첩자', '주인공 안에서 깨어나는 심마(心魔)',
    ],
  },
  hook: {
    label: '한 줄 후크', items: [ // 30
      '첫 합(合)에 모든 것을 잃은 채 강호에 선다', '독자만 아는 비급의 비밀을 깔고 간다', '가장 약한 자가 가장 위험한 신공을 쥔다',
      '천하제일이 되기를 스스로 거부한다', '복수하지 않기 위해 더 강해진다', '적을 이해할수록 칼을 들 이유가 사라진다',
      '무공을 쓸 때마다 수명이 줄어든다', '주화입마의 문턱에서만 다음 경지가 열린다', '정파가 거짓이라는 단서가 한 합씩 쌓여간다',
      '복수를 완수할수록 원수를 닮아간다', '운명을 받아들이는 척 강호를 속인다', '천마를 믿는 자가 천마를 베려 한다',
      '회차마다 작은 사이다, 그 아래 거대한 은원', '약점이 드러날수록 강해 보이는 역설', '구한 강호가 그를 두려워하기 시작한다',
      '봉인을 지킬수록 봉인이 풀려간다', '믿었던 사부의 가르침이 하나씩 어긋난다', '미래를 알기에 더 깊은 절망에 빠진다',
      '명문 후예라는 정체가 사실은 가짜라는 의심', '되돌린 시간마다 잃는 사람이 달라진다', '원수의 유서가 주인공보다 더 협(俠)답다',
      '비급의 마지막 장이 찢겨 사라졌다', '강해질수록 인간이었던 기억이 흐려진다', '의형제의 미소 뒤에 칼이 보인다',
      '강호를 구하려면 무공을 버려야 한다', '천하제일의 영웅과 천하제일의 마인이 같은 이름', '치트 무공에 매번 청구되는 잔혹한 대가',
      '평범함이 유일하게 통하지 않는 함정', '복수의 끝에서 진실이 그를 무너뜨린다', '비무대 위 마지막 한 수가 강호의 운명을 가른다',
    ],
  },
} as const
type SlotKey = keyof typeof SLOTS
const SLOT_KEYS = Object.keys(SLOTS) as SlotKey[]
const COMBO = SLOT_KEYS.reduce((a, k) => a * SLOTS[k].items.length, 1) // 36*36*34*34*32*32*30*30 = 1,380,719,001,600 ≈ 1.38조 (1조 초과)

// ── 상태 영속 ──
interface UserItem { id: string; text: string }
interface Persisted {
  checked: Record<string, boolean>
  removedDefaults: string[]
  userItems: Record<string, UserItem[]> // catId -> 사용자 항목
  collapsed: Record<string, boolean>
  notes: Record<string, string> // catId -> 메모
  locks: Partial<Record<SlotKey, boolean>>
  slot: Partial<Record<SlotKey, number>> // 현재 슬롯 인덱스(잠금 유지용)
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function emptyState(): Persisted {
  return { checked: {}, removedDefaults: [], userItems: {}, collapsed: {}, notes: {}, locks: {}, slot: {} }
}
function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return emptyState()
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return emptyState()
    const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? v as Record<string, unknown> : {})
    const checked: Record<string, boolean> = {}
    for (const k of Object.keys(obj(p.checked))) checked[k] = !!(p.checked as Record<string, unknown>)[k]
    const collapsed: Record<string, boolean> = {}
    for (const k of Object.keys(obj(p.collapsed))) collapsed[k] = !!(p.collapsed as Record<string, unknown>)[k]
    const notes: Record<string, string> = {}
    for (const k of Object.keys(obj(p.notes))) notes[k] = String((p.notes as Record<string, unknown>)[k] ?? '')
    const userItems: Record<string, UserItem[]> = {}
    const ui = obj(p.userItems)
    for (const k of Object.keys(ui)) {
      const arr = ui[k]
      if (Array.isArray(arr)) userItems[k] = arr.filter((x: any) => x && typeof x.text === 'string').map((x: any) => ({ id: String(x.id || newId()), text: String(x.text) }))
    }
    const removedDefaults = Array.isArray(p.removedDefaults) ? p.removedDefaults.filter((x: any) => typeof x === 'string') : []
    const locks: Partial<Record<SlotKey, boolean>> = {}
    for (const k of SLOT_KEYS) locks[k] = !!obj(p.locks)[k]
    const slot: Partial<Record<SlotKey, number>> = {}
    for (const k of SLOT_KEYS) { const v = obj(p.slot)[k]; if (typeof v === 'number' && v >= 0 && v < SLOTS[k].items.length) slot[k] = v }
    return { checked, removedDefaults, userItems, collapsed, notes, locks, slot }
  } catch { return emptyState() }
}

const defaultItemId = (catId: string, idx: number) => `d:${catId}:${idx}`
interface MergedItem { id: string; text: string; note?: string; twist?: string; user: boolean }
function catItems(cat: Category, state: Persisted): MergedItem[] {
  const out: MergedItem[] = []
  cat.items.forEach((it, idx) => {
    const id = defaultItemId(cat.id, idx)
    if (state.removedDefaults.includes(id)) return
    out.push({ id, text: it.t, note: it.note, twist: it.twist, user: false })
  })
  ;(state.userItems[cat.id] || []).forEach((u) => out.push({ id: u.id, text: u.text, user: true }))
  return out
}

const fmt = (n: number) => {
  if (n >= 1e12) return (n / 1e12).toFixed(2).replace(/\.?0+$/, '') + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.?0+$/, '') + '만'
  return n.toLocaleString('ko-KR')
}
const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function WuxiaTropes({ payload }: { payload?: Record<string, unknown> }) {
  const genreLabel = (payload && typeof payload.genre === 'string' && payload.genre) || '무협'
  const [state, setState] = useState<Persisted>(() => loadState())
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [tab, setTab] = useState<'check' | 'twist' | 'dict'>('check')
  const [query, setQuery] = useState('')
  const [flashMsg, setFlashMsg] = useState('')
  const [note, setNote] = useState('')
  const mounted = useRef(true)
  const flashTimer = useRef<number | null>(null)

  // 슬롯: 잠금 슬롯은 저장된 인덱스 유지, 나머지는 무작위
  const [slotIdx, setSlotIdx] = useState<Record<SlotKey, number>>(() => {
    const init = {} as Record<SlotKey, number>
    for (const k of SLOT_KEYS) {
      const saved = (loadState().slot)[k]
      init[k] = typeof saved === 'number' ? saved : Math.floor(Math.random() * SLOTS[k].items.length)
    }
    return init
  })

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; if (flashTimer.current) { clearTimeout(flashTimer.current); flashTimer.current = null } }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ ...state, slot: slotIdx })) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 진행 상황이 사라질 수 있어요.') }
  }, [state, slotIdx])

  const flash = (m: string) => {
    setFlashMsg(m)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { if (mounted.current) setFlashMsg('') }, 1800)
  }
  const copyText = async (text: string, ok: string) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      flash(ok)
    } catch { flash('복사에 실패했어요. 직접 선택해 복사하세요.') }
  }

  // ── 체크리스트 동작 ──
  const toggle = (id: string) => setState((s) => ({ ...s, checked: { ...s.checked, [id]: !s.checked[id] } }))
  const toggleCollapse = (id: string) => setState((s) => ({ ...s, collapsed: { ...s.collapsed, [id]: !s.collapsed[id] } }))
  const setCatNote = (id: string, v: string) => setState((s) => ({ ...s, notes: { ...s.notes, [id]: v } }))
  const addUserItem = (catId: string) => {
    const text = (drafts[catId] || '').trim(); if (!text) return
    setState((s) => ({ ...s, userItems: { ...s.userItems, [catId]: [...(s.userItems[catId] || []), { id: newId(), text }] } }))
    setDrafts((d) => ({ ...d, [catId]: '' }))
  }
  const removeItem = (catId: string, id: string, isUser: boolean) => setState((s) => {
    const checked = { ...s.checked }; delete checked[id]
    if (isUser) return { ...s, checked, userItems: { ...s.userItems, [catId]: (s.userItems[catId] || []).filter((u) => u.id !== id) } }
    return { ...s, checked, removedDefaults: [...s.removedDefaults, id] }
  })
  const saveEdit = () => {
    if (!editing) return
    const text = editing.text.trim(); const target = editing; setEditing(null); if (!text) return
    setState((s) => {
      for (const catId of Object.keys(s.userItems)) {
        const arr = s.userItems[catId] || []
        if (arr.some((u) => u.id === target.id)) return { ...s, userItems: { ...s.userItems, [catId]: arr.map((u) => u.id === target.id ? { ...u, text } : u) } }
      }
      const m = /^d:([^:]+):/.exec(target.id)
      if (m) {
        const catId = m[1]; const repl: UserItem = { id: newId(), text }
        const wasChecked = !!s.checked[target.id]; const checked = { ...s.checked }; delete checked[target.id]; if (wasChecked) checked[repl.id] = true
        return { ...s, checked, removedDefaults: s.removedDefaults.includes(target.id) ? s.removedDefaults : [...s.removedDefaults, target.id], userItems: { ...s.userItems, [catId]: [...(s.userItems[catId] || []), repl] } }
      }
      return s
    })
  }
  const resetAll = () => setState((s) => ({ ...s, checked: {} }))

  // ── 진행률 ──
  const perCat = CATEGORIES.map((c) => {
    const items = catItems(c, state)
    return { cat: c, items, total: items.length, done: items.filter((it) => state.checked[it.id]).length }
  })
  const totalItems = perCat.reduce((a, p) => a + p.total, 0)
  const totalDone = perCat.reduce((a, p) => a + p.done, 0)
  const totalPct = totalItems ? Math.round((totalDone / totalItems) * 100) : 0

  // ── 비틀기 생성기 ──
  const reroll = () => setSlotIdx((cur) => {
    const next = { ...cur }
    for (const k of SLOT_KEYS) {
      if (state.locks[k]) continue
      let r = Math.floor(Math.random() * SLOTS[k].items.length)
      if (SLOTS[k].items.length > 1 && r === cur[k]) r = (r + 1) % SLOTS[k].items.length
      next[k] = r
    }
    return next
  })
  const rerollOne = (k: SlotKey) => setSlotIdx((cur) => {
    if (SLOTS[k].items.length <= 1) return cur
    let r = Math.floor(Math.random() * SLOTS[k].items.length); if (r === cur[k]) r = (r + 1) % SLOTS[k].items.length
    return { ...cur, [k]: r }
  })
  const toggleLock = (k: SlotKey) => setState((s) => ({ ...s, locks: { ...s.locks, [k]: !s.locks[k] } }))
  useEffect(() => { setState((s) => ({ ...s, slot: slotIdx })) }, [slotIdx]) // 잠금용으로 현재 인덱스 보존

  const cur = (k: SlotKey) => SLOTS[k].items[slotIdx[k]]
  const twistLine = `[${cur('who')}]가 「${cur('trope')}」 클리셰를 만나지만 — ${cur('twistAxis')}. 무대는 ${cur('setting')}, 맞서는 것은 ${cur('foe')}. 판돈은 ${cur('stake')}, 결은 ${cur('lineage')}.`
  const twistHook = cur('hook')
  const twistFull = `${twistLine}\n후크: ${twistHook}`

  const saveTwistSnippet = () => {
    addToLibrary('snippets', { text: twistFull, source: '무협 트로프 비틀기', tags: ['무협', '비틀기', cur('lineage')] })
    flash('비틀기 변주를 글감(스니펫)으로 저장했어요')
  }
  const twistToProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '기획',
      title: `비틀기: ${cur('trope')} → ${cur('twistAxis')}`,
      bodyHtml: `<p><strong>${escHtml(twistLine)}</strong></p><p>후크: ${escHtml(twistHook)}</p>`,
      meta: { 주인공: cur('who'), 클리셰: cur('trope'), 비트는축: cur('twistAxis'), 무대: cur('setting'), 적: cur('foe'), 판돈: cur('stake'), 계보: cur('lineage') },
    })
    flash(id ? "프로젝트 '기획' 폴더에 비틀기를 추가했어요" : '프로젝트에 연결되지 않았습니다')
  }

  // ── 체크리스트 → 프로젝트 ──
  const toBodyHtml = (): string => {
    const parts: string[] = [`<p><strong>장르: ${escHtml(genreLabel)} · 진행률 ${totalDone}/${totalItems} (${totalPct}%)</strong></p>`]
    perCat.forEach((p) => {
      const km = KIND_META[p.cat.kind]
      parts.push(`<h3>${escHtml(p.cat.icon + ' ' + p.cat.name)} · ${escHtml(km.label)} [${p.done}/${p.total}]</h3>`)
      if (!p.items.length) parts.push('<p>(항목 없음)</p>')
      else p.items.forEach((it) => {
        const mark = state.checked[it.id] ? '☑' : '☐'
        let line = `${mark} ${escHtml(it.text)}`
        if (it.twist) line += ` <span>↻ 비틀기: ${escHtml(it.twist)}</span>`
        parts.push(`<p>${line}</p>`)
      })
      const n = (state.notes[p.cat.id] || '').trim()
      if (n) parts.push(`<p><em>메모: ${escHtml(n)}</em></p>`)
    })
    return parts.join('')
  }
  const checklistToProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '기획',
      title: `${genreLabel} 트로프 점검 (${totalDone}/${totalItems})`,
      bodyHtml: toBodyHtml(),
      meta: { 장르: genreLabel, 진행률: `${totalDone}/${totalItems} (${totalPct}%)`, ...Object.fromEntries(perCat.map((p) => [p.cat.name, `${p.done}/${p.total}`])) },
    })
    flash(id ? "프로젝트 '기획' 폴더에 점검표를 추가했어요" : '프로젝트에 연결되지 않았습니다')
  }
  const exportText = () => {
    const lines: string[] = [`# ${genreLabel} 트로프·관습 점검`, `진행률: ${totalDone}/${totalItems} (${totalPct}%)`, '']
    perCat.forEach((p) => {
      lines.push(`## ${p.cat.icon} ${p.cat.name} · ${KIND_META[p.cat.kind].label} [${p.done}/${p.total}]`)
      p.items.forEach((it) => { lines.push(`- [${state.checked[it.id] ? 'x' : ' '}] ${it.text}`); if (it.twist) lines.push(`    ↻ ${it.twist}`) })
      const n = (state.notes[p.cat.id] || '').trim(); if (n) lines.push(`  메모: ${n}`)
      lines.push('')
    })
    copyText(lines.join('\n').trim(), `점검표를 복사했어요 (${totalDone}/${totalItems})`)
  }

  // ── 사전(검색·무작위·클릭복사) ──
  const ql = query.trim().toLowerCase()
  const dictCats = CATEGORIES.map((c) => ({
    cat: c,
    items: c.items.filter((it) => !ql || (it.t + ' ' + (it.note || '') + ' ' + (it.twist || '')).toLowerCase().includes(ql)),
  })).filter((x) => x.items.length > 0)
  const randomPick = () => {
    const all = CATEGORIES.flatMap((c) => c.items.map((it) => ({ c, it })))
    const pick = all[Math.floor(Math.random() * all.length)]
    const text = pick.it.twist ? `${pick.it.t}\n↻ 비틀기: ${pick.it.twist}` : (pick.it.note ? `${pick.it.t}\n— ${pick.it.note}` : pick.it.t)
    copyText(text, `무작위 항목 복사 · ${pick.c.name}`)
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', fontSize: 14 }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }
  const headTitle: React.CSSProperties = { fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }
  const tabRow: React.CSSProperties = { display: 'flex', gap: 6, padding: '8px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }
  const tabBtn = (on: boolean): React.CSSProperties => ({ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: on ? 700 : 500, border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'), background: on ? 'var(--accent)' : 'var(--paper)', color: on ? '#fff' : 'var(--text)' })
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const bar = (h = 8): React.CSSProperties => ({ height: h, borderRadius: 99, background: 'var(--chrome-2)', border: '1px solid var(--border)', overflow: 'hidden', flex: 1, minWidth: 0 })
  const fill = (pct: number): React.CSSProperties => ({ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--ok)' : 'var(--accent)', transition: 'width .25s ease' })
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }
  const cHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', userSelect: 'none', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }
  const itemRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 12px' }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 13.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const tinyBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '3px 6px', borderRadius: 6, flexShrink: 0 }
  const badge = (color: string): React.CSSProperties => ({ fontSize: 10.5, color, border: '1px solid var(--border)', borderRadius: 5, padding: '1px 5px', flexShrink: 0, fontWeight: 700 })

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={headTitle}><Emoji e="⚔️"/> {genreLabel} 트로프·관습</span>
        <span style={{ flex: 1 }} />
        {flashMsg && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{flashMsg}</span>}
        <button className="linkbtn" onClick={() => openToolLinked('setting-bible', { genre: genreLabel })} title="배경 설정집 열기 (강호 세계관 구축)"><Emoji e="🏯"/> 설정집</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre: genreLabel })} title="플롯 피라미드 열기"><Emoji e="🎢"/> 플롯</button>
      </div>

      <div style={tabRow}>
        <button style={tabBtn(tab === 'check')} onClick={() => setTab('check')}><Emoji e="✅"/> 점검표</button>
        <button style={tabBtn(tab === 'twist')} onClick={() => setTab('twist')}><Emoji e="♻️"/> 비틀기 생성기</button>
        <button style={tabBtn(tab === 'dict')} onClick={() => setTab('dict')}><Emoji e="📖"/> 트로프 사전</button>
      </div>

      {note && <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--warn)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      {/* ───────── 점검표 탭 ───────── */}
      {tab === 'check' && (
        <>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>전체</span>
            <div style={bar()}><div style={fill(totalPct)} /></div>
            <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, color: totalPct >= 100 ? 'var(--ok)' : 'var(--text)' }}>{totalDone}/{totalItems} · {totalPct}%</span>
            <button className="linkbtn" onClick={checklistToProject} disabled={!hasProjectBridge() || totalItems === 0} title="현재 점검표를 프로젝트 '기획' 폴더 문서로 추가"><Emoji e="📄"/> 프로젝트에 추가</button>
            <button className="minibtn" onClick={exportText} disabled={totalItems === 0} title="텍스트로 복사"><Emoji e="📋"/> 내보내기</button>
            <button className="minibtn" onClick={resetAll} disabled={totalDone === 0} title="모든 체크 해제">↺ 전체 해제</button>
          </div>

          <div style={body}>
            {perCat.map(({ cat, items, total, done }) => {
              const pct = total ? Math.round((done / total) * 100) : 0
              const open = !state.collapsed[cat.id]
              const draft = drafts[cat.id] || ''
              const km = KIND_META[cat.kind]
              return (
                <div key={cat.id} style={card}>
                  <div style={cHead} onClick={() => toggleCollapse(cat.id)}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', width: 12, flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
                    <span style={{ fontSize: 16, flexShrink: 0 }}><Emoji e={cat.icon}/></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>{cat.name}<span style={badge(km.color)}>{km.label}</span></div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.desc}</div>
                    </div>
                    <div style={{ width: 80, flexShrink: 0 }}><div style={bar(6)}><div style={fill(pct)} /></div></div>
                    <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, width: 52, textAlign: 'right', color: pct >= 100 && total > 0 ? 'var(--ok)' : 'var(--muted)' }}>{done}/{total}</span>
                  </div>

                  {open && (
                    <div>
                      {items.map((it) => {
                        const isEditing = editing && editing.id === it.id
                        const checked = !!state.checked[it.id]
                        return (
                          <div key={it.id} style={{ ...itemRow, borderTop: '1px solid var(--border)' }}>
                            {isEditing ? (
                              <>
                                <input style={{ ...input, flex: 1 }} value={editing!.text} autoFocus onChange={(e) => setEditing({ id: it.id, text: e.target.value })}
                                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit() } if (e.key === 'Escape') { e.preventDefault(); setEditing(null) } }} aria-label="항목 수정" />
                                <button style={tinyBtn} onClick={saveEdit}>저장</button>
                                <button style={tinyBtn} onClick={() => setEditing(null)}>취소</button>
                              </>
                            ) : (
                              <>
                                <input type="checkbox" checked={checked} onChange={() => toggle(it.id)} style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, cursor: 'pointer', accentColor: 'var(--accent)' }} aria-label={it.text} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <span onClick={() => toggle(it.id)} style={{ display: 'block', fontSize: 13.5, lineHeight: 1.5, cursor: 'pointer', wordBreak: 'break-word', color: checked ? 'var(--muted)' : 'var(--text)', textDecoration: checked ? 'line-through' : 'none' }}>
                                    {it.text}{it.user && <span style={{ marginLeft: 6 }}><span style={badge('var(--muted)')}>내 항목</span></span>}
                                  </span>
                                  {it.note && <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 2 }}>— {it.note}</div>}
                                  {it.twist && <div style={{ fontSize: 11.5, color: 'var(--accent)', lineHeight: 1.5, marginTop: 2 }}>↻ 비틀기: {it.twist}</div>}
                                </div>
                                <button style={tinyBtn} title="수정" onClick={() => setEditing({ id: it.id, text: it.text })}>✎</button>
                                <button style={{ ...tinyBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeItem(cat.id, it.id, it.user)}>✕</button>
                              </>
                            )}
                          </div>
                        )
                      })}

                      <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
                        <input style={{ ...input, flex: 1 }} value={draft} onChange={(e) => setDrafts((d) => ({ ...d, [cat.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUserItem(cat.id) } }} placeholder={`${cat.name}에 항목 추가…`} maxLength={200} aria-label={`${cat.name} 항목 추가`} />
                        <button className="minibtn" onClick={() => addUserItem(cat.id)} disabled={!draft.trim()}>＋ 추가</button>
                      </div>
                      <div style={{ padding: '0 12px 12px' }}>
                        <input style={input} value={state.notes[cat.id] || ''} onChange={(e) => setCatNote(cat.id, e.target.value)} placeholder="이 카테고리에 대한 작품 메모…" maxLength={400} aria-label={`${cat.name} 메모`} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6, paddingBottom: 4 }}>
              항목을 눌러 체크하고, 머리글을 눌러 펼치거나 접으세요. 기본 항목도 수정·삭제하고 내 항목·메모를 더할 수 있어요. 모든 진행 상황은 이 브라우저에 자동 저장됩니다.
            </div>
          </div>
        </>
      )}

      {/* ───────── 비틀기 생성기 탭 ───────── */}
      {tab === 'twist' && (
        <div style={body}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            슬롯을 무작위로 굴려 무협 클리셰 비틀기 변주를 만드세요. 슬롯을 잠그면 그 칸은 고정됩니다. 가능한 조합 <strong style={{ color: 'var(--text)' }}>{fmt(COMBO)}</strong>가지 ({COMBO.toLocaleString('ko-KR')}).
          </div>

          <div style={{ ...card, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 15, lineHeight: 1.7, fontWeight: 600 }}>{twistLine}</div>
            <div style={{ fontSize: 13, color: 'var(--accent)', lineHeight: 1.6 }}>후크: {twistHook}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
              <button className="btn-primary" onClick={reroll} title="잠그지 않은 슬롯을 모두 다시 굴림"><Emoji e="🎲"/> 다시 굴리기</button>
              <button className="minibtn" onClick={() => copyText(twistFull, '비틀기 변주를 복사했어요')}><Emoji e="📋"/> 복사</button>
              <button className="minibtn" onClick={saveTwistSnippet} title="글감(스니펫)으로 저장">＋ 글감 저장</button>
              <button className="linkbtn" onClick={twistToProject} disabled={!hasProjectBridge()} title="프로젝트 '기획' 폴더 문서로 추가"><Emoji e="📄"/> 프로젝트에 추가</button>
              <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck', { genre: genreLabel })} title="플롯 트위스트 덱 열기">↗ 트위스트 덱</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SLOT_KEYS.map((k) => {
              const locked = !!state.locks[k]
              return (
                <div key={k} style={{ ...card, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', width: 64, flexShrink: 0 }}>{SLOTS[k].label}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, wordBreak: 'break-word' }}>{cur(k)}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{SLOTS[k].items.length}종</span>
                  <button style={{ ...tinyBtn, color: locked ? 'var(--accent)' : 'var(--muted)' }} title={locked ? '잠금 해제' : '이 칸 잠그기'} onClick={() => toggleLock(k)}>{locked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
                  <button style={tinyBtn} title="이 칸만 다시 굴리기" disabled={locked} onClick={() => rerollOne(k)}><Emoji e="🎲"/></button>
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>
            무협 클리셰는 피하는 게 아니라 "비트는" 것입니다. 절벽 기연·전인 지목·은원 복수 같은 익숙한 트로프에 예상 밖의 축을 더해, 친숙함과 신선함을 동시에 잡으세요. 비틀기엔 반드시 "강함의 대가"를 함께 설계하세요.
          </div>
        </div>
      )}

      {/* ───────── 사전 탭 ───────── */}
      {tab === 'dict' && (
        <>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
            <input style={{ ...input, flex: 1 }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="트로프·클리셰·함정 검색(예: 기연·내공·마교)…" aria-label="검색" />
            <button className="minibtn" onClick={randomPick} title="무작위 항목 복사"><Emoji e="🎲"/> 무작위</button>
          </div>
          <div style={body}>
            {dictCats.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', padding: 8 }}>검색 결과가 없어요.</div>}
            {dictCats.map(({ cat, items }) => {
              const km = KIND_META[cat.kind]
              return (
                <div key={cat.id} style={card}>
                  <div style={{ ...cHead, cursor: 'default' }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}><Emoji e={cat.icon}/></span>
                    <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>{cat.name}<span style={badge(km.color)}>{km.label}</span></div>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{items.length}개</span>
                  </div>
                  <div>
                    {items.map((it, i) => {
                      const text = it.twist ? `${it.t}\n↻ 비틀기: ${it.twist}` : (it.note ? `${it.t}\n— ${it.note}` : it.t)
                      return (
                        <div key={i} style={{ ...itemRow, borderTop: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => copyText(text, '클릭한 항목을 복사했어요')} title="클릭하면 복사됩니다">
                          <span style={{ fontSize: 13, color: km.color, flexShrink: 0, marginTop: 1 }}>{km.mark}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, lineHeight: 1.5, wordBreak: 'break-word' }}>{it.t}</div>
                            {it.note && <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 2 }}>— {it.note}</div>}
                            {it.twist && <div style={{ fontSize: 11.5, color: 'var(--accent)', lineHeight: 1.5, marginTop: 2 }}>↻ 비틀기: {it.twist}</div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
