// 판타지 트로프·관습 체크리스트 — 판타지 장르 고유의 독자 기대(Reader Contract)·필수 요소·흔한 함정(트랩)·
//   클리셰(+비틀기 변주)를 펼침형 카테고리 + 검색 + 체크리스트로 점검한다. 클리셰는 슬롯 무작위 '비틀기 생성기'로
//   신선한 변주(조합수 표시, 1조 이상)를 즉석 생성하고, 마음에 드는 변주는 글감(snippets)으로 저장하거나
//   프로젝트 '기획' 폴더 문서로 추가한다.
// 모든 상태(체크 여부·메모·사용자 항목·접힘·슬롯 잠금)는 localStorage('sry:tool:genre-tropes')에 자동 저장/복원.
// 자급식: react 와 './linkbus' 외 import 없음. localStorage 미지원/차단/손상 시 메모리만 사용(throw 금지). 언마운트 정리.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked } from './linkbus'
import { Emoji } from './linkbus'

export const meta = { id: 'genre-tropes', name: '판타지 트로프·관습 체크리스트', icon: '🐉', group: '구상·정리', genre: '판타지', intro: '판타지 독자 기대·필수 요소·함정·클리셰(+비틀기)를 점검하고 신선한 변주를 만드세요', w: 660, h: 640 }

const LS_KEY = 'sry:tool:genre-tropes'

// ──────────────────────────────────────────────────────────────────────────
// 카테고리별 점검 항목 — 판타지 도시에에 근거한 구체·특화 데이터(일반론 배제).
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
    desc: '판타지 독자가 기본으로 기대하는 계약',
    items: [
      { t: '세계관의 내적 일관성 — 마법·정치·경제가 자기 규칙을 어기지 않는다', note: '규칙 위반은 "치트"로 느껴져 몰입을 깬다' },
      { t: '경이감(Sense of Wonder) — 처음 보는 마법·생물·풍경의 첫 등장에 연출을 쏟았다', note: '드래곤·마법진·이종족의 "첫 컷"이 평범하면 안 된다' },
      { t: '약→강, 무지→각성의 성장 서사가 명확하다', note: '특히 웹소설은 성장의 가시화(레벨·스탯·서열)를 강하게 요구' },
      { t: '마법의 성격(하드/소프트)을 독자가 일관되게 신뢰할 수 있다', note: '하드는 복선 회수형 해결, 소프트는 분위기·경이 — 혼동하면 불만' },
      { t: '개인의 위기가 결국 세계/왕국/질서의 운명으로 확대된다', note: '스케일 상승: 마을 → 도시 → 왕국 → 대륙 → 신' },
      { t: '선택받은 자/잠재력의 동력이 작동한다(클리셰여도 핵심)', note: '평범한 주인공이 특별한 운명·혈통·능력을 가짐' },
      { t: '(웹소설) 회차당 최소 1회의 사이다(카타르시스)가 있다', note: '고구마를 쌓고 시원한 응징·역전으로 해소' },
      { t: '(웹소설) 떡밥-회수 주기가 짧다 — 거대 복선보다 회차 단위 보상 우선', note: '연재 호흡상 즉각적 보상이 먼저' },
      { t: '(로판) 회빙환 정보 우위 + 황실/귀족 정치 + 로맨스의 삼박자', note: '파멸 플래그 회피의 긴장감' },
    ],
  },
  // ── 필수 세계관 요소(Worldbuilding) ──
  {
    id: 'magic', name: '마법 체계', icon: '✨', kind: 'must',
    desc: '판타지의 가장 핵심적 장치',
    items: [
      { t: '마법의 원천이 정해졌다(신/자연/혈통/계약/마나·오드·에테르)', note: '서클(1~9), 마력 회로, 영창·룬·마법진 등 습득법' },
      { t: '하드/소프트 노선을 의식적으로 선택했다', note: '샌더슨 제1법칙: 마법으로 갈등을 해결하는 능력은 독자가 그 마법을 이해한 정도에 비례한다' },
      { t: '마법의 비용·한계·약점·금기가 능력보다 흥미롭게 설계됐다', note: '샌더슨 제2법칙: 한계가 능력보다 흥미롭다(마나 고갈·부작용·정신 침식)' },
      { t: '새 시스템을 추가하기 전 기존 시스템을 확장했다', note: '샌더슨 제3법칙' },
      { t: '마법사의 사회적 위상(마탑·교단·길드)이 정해졌다' },
      { t: '(웹소설) 시스템·스테이터스 창의 규칙(레벨/스탯/스킬/상점)이 일관되다', note: '성장의 수치화·즉각 보상' },
    ],
  },
  {
    id: 'world', name: '세계관 구축', icon: '🗺️', kind: 'must',
    desc: '지리·종족·정치·신화·역사',
    items: [
      { t: '지리·지도 — 대륙·왕국·산맥·미지의 땅이 그려진다', note: '판타지 관습상 지도 첨부가 흔함' },
      { t: '종족과 문화 — 외형·수명·가치관·갈등사가 있다', note: '엘프/드워프/오크/하플링 — 클리셰 전복 여지' },
      { t: '정치·권력 구조 — 왕국·제국·교단·길드·마탑의 계승·음모·전쟁' },
      { t: '종교·신화·창세 — 신·판테온이 마법·정치와 얽힌다' },
      { t: '경제·기술 수준 — 보통 중세 베이스, 마법이 기술·경제를 어떻게 왜곡하는가(마도공학)' },
      { t: '역사·연표 — 고대 대전쟁·왕조 흥망·봉인의 기원이 현재 위협을 설명한다', note: '"과거가 현재의 위협을 설명"' },
      { t: '언어·명명 규칙 — 종족·지명·인명의 음운이 통일된다' },
    ],
  },
  {
    id: 'devices', name: '서사 장치', icon: '🧭', kind: 'must',
    desc: '판타지 고유의 플롯 엔진',
    items: [
      { t: '예언(Prophecy) — 정공법 vs 비틀기(자기실현/오역/반전)', note: '남용 시 긴장 소실' },
      { t: '퀘스트/여정 — 맥거핀을 찾거나 파괴, 일행(party) 결성' },
      { t: '멘토 — 흔히 중반 퇴장(죽음)으로 주인공을 자립시킨다', note: '간달프·덤블도어·오비완' },
      { t: '봉인된 악·고대의 위협 — 잠든 마왕·봉인 해제 카운트다운' },
      { t: '마법 아이템·아티팩트 — 의지·대가·중독성을 부여하면 깊어진다', note: '절대반지·엑스칼리버형' },
      { t: '(웹소설) 회빙환 — 미래 지식·전생 기억의 정보 우위', note: '한국 웹소설 3대 엔진' },
    ],
  },
  // ── 흔한 함정(Pitfalls) ──
  {
    id: 'traps', name: '피해야 할 함정', icon: '🕳️', kind: 'trap',
    desc: '몰입을 깨는 대표적 실수',
    items: [
      { t: '데우스 엑스 마키나 — 마지막에 새 능력을 갑툭튀시켜 해결한다', note: '판타지 최대 금기 — 클라이맥스는 앞서 심은 규칙·아이템의 회수여야 한다' },
      { t: '소프트 매직으로 플롯을 해결한다', note: '규칙 모르는 힘으로 위기를 풀면 데우스 엑스 마키나가 됨' },
      { t: '초반 인포덤프 — 세계관 설명을 한 곳에 쏟아붓는다', note: '"보여주되 설명하지 말 것" — 필요할 때 점진 공개' },
      { t: '파워 인플레이션 폭주 — 강해짐의 벽과 돌파 리듬이 없다', note: '주인공이 강해지면 적도 강해지되 긴장 유지' },
      { t: '예언 남용 — 결말이 예언으로 정해져 긴장이 사라진다' },
      { t: '종족 클리셰 무비판 사용 — 오크=무지성 악, 엘프=완전무결' },
      { t: '치트 능력에 대가가 없다 — 승리에 비용(상실·후유증·세계 변화)이 없다', note: '대가를 부과하면 깊이가 생김' },
      { t: '(웹소설) 골든타임 실패 — 3~5화 안에 세계관·차별점·첫 사이다를 못 준다' },
      { t: '(웹소설) 회차 후킹 부재 — 매 화 끝에 다음을 부르는 긴장이 없다' },
      { t: '이름 혼란 — 비슷한 판타지 인명·지명이 헷갈린다' },
    ],
  },
  // ── 클리셰 + 비틀기 ──
  {
    id: 'cliches', name: '클리셰 → 비틀기', icon: '♻️', kind: 'cliche',
    desc: '인지하고 변주할 정석 클리셰',
    items: [
      { t: '평범한 시골 소년/고아가 사실 왕족·용사의 후예', twist: '혈통은 가짜였고, 평범함 자체가 진짜 무기다 — 선택받은 자가 아니라 "선택을 만드는 자"' },
      { t: '현명한 노(老)멘토가 중반에 사망', twist: '멘토가 죽지 않고 살아남아 주인공의 그늘이자 짐이 된다 / 멘토가 사실 흑막' },
      { t: '봉인된 마왕·어둠의 군주의 부활', twist: '봉인된 것은 악이 아니라 진실이었다 — 마왕은 세계의 거짓을 막던 자' },
      { t: '엘프=미형·고결, 드워프=술·도끼·구두쇠, 오크=무지성 악역', twist: '오크가 가장 정교한 문명을 가졌고 "야만"은 인간의 프로파간다였다' },
      { t: '여관·선술집의 퀘스트 의뢰, 모험가 길드', twist: '길드는 각성자를 착취하는 거대 기업이고, 의뢰는 정보 조작의 도구' },
      { t: '"너에게는 특별한 재능이 있다"는 선언', twist: '재능은 없었다 — 모두가 재능이라 믿게 만든 주인공의 연출·노력이었다' },
      { t: '(웹) 무시당하던 약자가 각성/회귀로 최강이 됨', twist: '회귀해도 결국 같은 함정에 빠지며, 정보 우위가 오만의 독이 된다' },
      { t: '(웹) 가족·문파에 버림받았다가 복수', twist: '복수를 완수하자 자신이 버린 쪽과 똑같아져 있었다 — 복수의 공허' },
      { t: '(로판) "원작에선 죽는 악역이었다"', twist: '원작 자체가 신뢰할 수 없는 서술 — 내가 아는 결말이 거짓 정보' },
      { t: '(로판) 차갑지만 나에게만 다정한 황태자/공작', twist: '그 다정함이 계산된 정략이었음을 알게 되는 순간의 역전' },
      { t: '예언이 주인공을 "세계의 구원자"로 지목', twist: '예언은 자기실현적 — 모두가 믿어서 그가 구원자가 "되어버린다"' },
      { t: '최종 결전에서 우정·동료애로 새 힘 각성', twist: '동료의 힘을 빌리는 것이 곧 그들의 생명을 태우는 대가였다' },
    ],
  },
]

// ──────────────────────────────────────────────────────────────────────────
// 클리셰 '비틀기 생성기' 슬롯 풀 — 판타지 특화(구체·자작). 8슬롯 조합으로 신선한 변주 한 줄을 만든다.
//   조합수 = 각 풀 길이의 곱. 풀 크기 34·34·32·32·32·30·30·30 → 약 1.02조(1e12) 초과(핵심 생성기 목표).
// ──────────────────────────────────────────────────────────────────────────
const SLOTS = {
  who: {
    label: '주체', items: [ // 34
      '버림받은 막내 왕자', '몰락한 마탑의 견습생', '예언에 지목된 고아', '랭킹 꼴찌 각성자', '원작 속 악역영애',
      '회귀한 검성', '봉인을 지키던 늙은 사제', '용을 죽인 평민 병사', '기억을 잃은 대마법사', '계약을 어긴 소환사',
      '신탁을 받은 시골 약초꾼', '폐위된 황녀', '길드에서 추방된 도굴꾼', '신을 죽이려는 성기사', '저주받은 혈통의 사생아',
      '환생한 마왕의 부하', '시스템에 선택된 회사원', '죽었다 살아난 용사', '정령과 계약한 떠돌이', '금주(禁呪)를 훔친 학자',
      '진명(眞名)을 잃은 마법사', '드래곤의 마지막 후예', '추방된 엘프 궁수', '지하 왕국의 드워프 장인', '신성력을 잃은 성녀',
      '시간을 거슬러 온 망령', '교단에 배신당한 이단심문관', '마수를 길들이는 짐승조련사', '죽은 황제의 그림자 대역', '봉인 해제를 명받은 간수',
      '게이트 너머에서 돌아온 귀환자', '저주를 대물림한 명문가 후계', '신탁기관의 말단 서기', '마탑주의 숨겨진 사생아',
    ],
  },
  trope: {
    label: '클리셰', items: [ // 34
      '선택받은 자', '봉인된 마왕의 부활', '현명한 멘토의 죽음', '예언의 성취', '약자의 최강 각성',
      '회귀 후 복수', '종족 간 전쟁', '전설의 아티팩트 쟁탈', '마왕성 공략', '용사 파티 결성',
      '왕위 계승 음모', '금단의 마법 봉인', '신의 시험', '고대 던전 탐사', '운명의 짝(소울메이트)',
      '천재의 등장', '버림받은 핏줄의 귀환', '세계를 건 최종 결전', '드래곤 토벌 원정', '잃어버린 제국의 부흥',
      '마검(魔劍)과의 계약', '성좌·시나리오의 개입', '악역영애의 파멸 플래그', '시스템 창과 레벨업', '소환된 이세계 용사',
      '봉인된 고대 신의 강림', '신물(神物)을 노린 추격', '왕국을 멸한 흑마법사', '마나 고갈의 종말', '성배·성유물 탐색',
      '환생한 폭군의 갱생', '엘프 여왕의 청혼', '금지된 네크로맨시', '진명 마법의 각성',
    ],
  },
  twistAxis: {
    label: '비트는 축', items: [ // 32
      '사실은 정반대였다', '대가가 너무 컸다', '진짜 흑막은 조력자였다', '예언이 오역되어 있었다', '구원이 곧 파괴였다',
      '약점이 유일한 무기였다', '믿음이 현실을 만들었다', '승리가 가장 큰 패배였다', '적의 논리가 더 옳았다', '기억이 조작되어 있었다',
      '선택의 자유는 처음부터 없었다', '봉인된 것은 악이 아니라 진실이었다', '능력에 끔찍한 부작용이 있었다', '정보 우위가 오만의 독이 되었다', '동료가 곧 제물이었다',
      '예언은 자기실현적이었다', '구원자라는 칭호가 저주였다', '회귀해도 같은 함정에 빠졌다', '복수의 끝에 적과 똑같아졌다', '신은 이미 죽어 있었다',
      '주인공이 진짜 마왕이었다', '세계 자체가 거짓이었다', '재능은 없고 연출만 있었다', '대가를 치른 건 무고한 자였다', '힘을 쓸수록 인간성을 잃었다',
      '구한 세계가 구할 가치가 없었다', '운명을 거스르려는 행동이 운명을 완성했다', '멘토가 마지막 시험을 위해 죽음을 연기했다', '봉인의 열쇠는 주인공 자신이었다', '아군의 승리가 다른 종족의 멸절이었다',
      '진실을 아는 순간 모두가 그를 적으로 돌렸다', '되돌린 시간 속에서 사랑하는 이가 사라졌다',
    ],
  },
  stake: {
    label: '판돈', items: [ // 32
      '왕국의 존망', '잊힌 진실의 폭로', '죽은 자의 부활', '세계의 균형(에퀼리브리엄)', '금기의 봉인',
      '혈통의 정통성', '신들의 권좌', '마나의 고갈', '한 종족의 멸절', '시간선의 붕괴',
      '계약의 파기', '대륙의 지배권', '예언의 결말', '영혼의 거래', '성좌들의 베팅',
      '고대 봉인의 해제 카운트다운', '마탑의 패권', '교단의 정통 교리', '드래곤의 둥지', '세계수의 생사',
      '잃어버린 진명의 회수', '차원문(게이트)의 개폐', '죽은 신의 유산', '왕가의 비밀 핏줄', '금주서(禁呪書)의 행방',
      '인간과 마족의 휴전', '저주의 대물림 단절', '정령계와의 균형', '회귀 전 기억의 진위', '최후의 마검 소유권',
      '신탁의 해석권', '세계를 떠받친 거짓의 유지',
    ],
  },
  flavor: {
    label: '결', items: [ // 32
      '그림다크(도덕적 회색)', '하드 매직(규칙 회수)', '소프트 매직(신비·경이)', '궁정 정치 모략', '사이다 역전',
      '비극적 희생', '메타픽션(서사 자각)', '로맨스 판타지', '서사시(다중 POV)', '소드 앤 소서리(개인 모험)',
      '코즈믹 호러', '잔혹동화', '느와르', '성장담', '하이 판타지(독립 세계)',
      '어반 판타지(현대 도시)', '이세계 전이·전생', '헌터·게이트물', '회빙환(회귀·빙의·환생)', '능력 배틀물',
      '정통 영웅서사', '풍자·메타 판타지', '신화·전설 재해석', '느린 미스터리 빌드업', '권선징악 사이다',
      '아련한 회한·노스탤지어', '광기·집착의 다크', '동료애·연대의 따뜻함', '비정한 생존극', '운명론적 숙명극',
      '아이러니·블랙코미디', '서정적 미문(美文)',
    ],
  },
  setting: {
    label: '무대', items: [ // 30
      '하늘에 떠 있는 부유 도시', '마나가 고갈된 잿빛 황무지', '시간이 멈춘 봉인된 숲', '지하 깊은 드워프 왕국', '안개에 잠긴 저주받은 왕도',
      '게이트가 열린 현대 대도시', '얼음에 갇힌 고대 제국', '용이 잠든 화산 협곡', '신들이 떠난 폐허 신전', '마탑이 늘어선 학원 도시',
      '바다 위를 떠도는 선상 길드', '죽은 자가 걷는 안식의 늪', '정령이 깃든 세계수 아래', '국경의 마수 출몰 변경', '하루마다 미로가 바뀌는 던전',
      '두 달이 뜨는 마법 사막', '계급이 마력으로 갈리는 황실', '봉인 균열이 번지는 변경 요새', '잊힌 신화가 새겨진 유적 도시', '회귀가 반복되는 운명의 성',
      '교단이 지배하는 신정 도시', '엘프와 인간이 공존하는 자유시', '검은 비가 내리는 마계 접경', '기억을 사고파는 환몽의 시장', '예언이 새겨진 천문 첨탑',
      '버려진 광산 속 지저 도시', '꿈과 현실이 겹치는 경계의 마을', '천 년 전쟁의 폐허 전장', '신탁이 울리는 성산(聖山)', '차원이 겹친 틈새의 항구',
    ],
  },
  foe: {
    label: '적·장애', items: [ // 30
      '부활을 앞둔 봉인된 마왕', '대륙을 노리는 흑마법사', '미쳐버린 고대 용', '교단을 장악한 거짓 성자', '왕좌를 노리는 섭정',
      '주인공을 만든 진짜 창조주', '회귀 전의 자기 자신', '계약을 강요하는 마검의 의지', '인간을 사냥하는 정령왕', '예언을 집행하는 운명의 신',
      '세계를 리셋하려는 시스템', '몰락을 부르는 가문의 저주', '죽음을 거부하는 리치 군주', '진실을 은폐하는 비밀 결사', '동족을 배신한 엘프 장로',
      '먹이를 찾는 차원의 포식자', '광신에 사로잡힌 이단심문관', '봉인을 풀려는 사이비 교단', '대를 이은 숙적 가문', '주인공의 힘을 탐하는 마탑주',
      '인류를 심판하려는 잠든 신', '거짓 평화를 강요하는 제국', '기억을 먹는 망령 군단', '성좌들의 잔혹한 시나리오', '주인공을 시험하는 멘토 자신',
      '돌이킬 수 없는 시간의 한계', '치르지 못할 마법의 대가', '점점 강해지는 파워 인플레이션', '아군 속에 숨은 배신자', '주인공 안에서 깨어나는 마성(魔性)',
    ],
  },
  hook: {
    label: '한 줄 후크', items: [ // 30
      '첫 화부터 모든 것을 잃은 채 시작한다', '독자만 아는 비밀을 깔고 간다', '가장 약한 자가 가장 위험한 진실을 쥔다',
      '구원자가 되기를 거부한다', '예언을 깨뜨리려 예언을 따른다', '적을 이해할수록 싸울 이유가 사라진다',
      '능력을 쓸 때마다 소중한 것을 잃는다', '죽음으로만 다음 단계가 열린다', '세계가 거짓이라는 단서가 쌓여간다',
      '복수를 완수할수록 괴물이 되어간다', '운명을 받아들이는 척 운명을 속인다', '신을 믿는 자가 신을 죽이려 한다',
      '회차마다 작은 사이다, 그 아래 거대한 떡밥', '약점이 드러날수록 강해 보이는 역설', '구한 자들이 그를 두려워하기 시작한다',
      '봉인을 지킬수록 봉인이 풀려간다', '믿었던 멘토의 말이 하나씩 어긋난다', '미래를 알기에 더 깊은 절망에 빠진다',
      '선택받은 자가 사실은 가짜라는 의심', '되돌린 시간마다 잃는 사람이 달라진다', '적의 일기가 주인공보다 더 설득력 있다',
      '신탁의 마지막 줄이 찢겨 사라졌다', '강해질수록 인간이었던 기억이 흐려진다', '동료의 미소 뒤에 칼이 보인다',
      '세계를 구하려면 자신을 지워야 한다', '예언의 영웅과 예언의 재앙이 같은 이름', '치트 능력에 매번 청구되는 잔혹한 청구서',
      '평범함이 유일하게 통하지 않는 함정', '구원의 끝에서 진실이 그를 무너뜨린다', '마지막 페이지가 첫 페이지로 이어진다',
    ],
  },
} as const
type SlotKey = keyof typeof SLOTS
const SLOT_KEYS = Object.keys(SLOTS) as SlotKey[]
const COMBO = SLOT_KEYS.reduce((a, k) => a * SLOTS[k].items.length, 1) // 34*34*32*32*32*30*30*30 ≈ 1.02e12 (1조 초과)

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

export default function GenreTropes({ payload }: { payload?: Record<string, unknown> }) {
  const genreLabel = (payload && typeof payload.genre === 'string' && payload.genre) || '판타지'
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
  const twistLine = `[${cur('who')}]가 「${cur('trope')}」 클리셰를 만나지만 — ${cur('twistAxis')}. 무대는 ${cur('setting')}, 맞서는 것은 ${cur('foe')}. 판돈은 ${cur('stake')}, 결은 ${cur('flavor')}.`
  const twistHook = cur('hook')
  const twistFull = `${twistLine}\n후크: ${twistHook}`

  const saveTwistSnippet = () => {
    addToLibrary('snippets', { text: twistFull, source: '판타지 트로프 비틀기', tags: ['판타지', '비틀기', cur('flavor')] })
    flash('비틀기 변주를 글감(스니펫)으로 저장했어요')
  }
  const twistToProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '기획',
      title: `비틀기: ${cur('trope')} → ${cur('twistAxis')}`,
      bodyHtml: `<p><strong>${escHtml(twistLine)}</strong></p><p>후크: ${escHtml(twistHook)}</p>`,
      meta: { 주체: cur('who'), 클리셰: cur('trope'), 비트는축: cur('twistAxis'), 무대: cur('setting'), 적: cur('foe'), 판돈: cur('stake'), 결: cur('flavor') },
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
        <span style={headTitle}><Emoji e="🐉"/> {genreLabel} 트로프·관습</span>
        <span style={{ flex: 1 }} />
        {flashMsg && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{flashMsg}</span>}
        <button className="linkbtn" onClick={() => openToolLinked('setting-bible')} title="배경 설정집 열기 (세계관 구축)"><Emoji e="🗺️"/> 설정집</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid')} title="플롯 피라미드 열기"><Emoji e="🎢"/> 플롯</button>
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
            슬롯을 무작위로 굴려 클리셰 비틀기 변주를 만드세요. 슬롯을 잠그면 그 칸은 고정됩니다. 가능한 조합 <strong style={{ color: 'var(--text)' }}>{fmt(COMBO)}</strong>가지 ({COMBO.toLocaleString('ko-KR')}).
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
            클리셰는 피하는 게 아니라 "비트는" 것입니다. 익숙한 트로프에 예상 밖의 축을 더해 신선함과 친숙함을 동시에 잡으세요.
          </div>
        </div>
      )}

      {/* ───────── 사전 탭 ───────── */}
      {tab === 'dict' && (
        <>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
            <input style={{ ...input, flex: 1 }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="트로프·클리셰·함정 검색…" aria-label="검색" />
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
                          <span style={{ fontSize: 13, color: km.color, flexShrink: 0, marginTop: 1 }}><Emoji e={km.mark}/></span>
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
