// 액션·전쟁 트로프·관습 체크리스트 — 이 장르의 독자 기대·필수 요소·흔한 함정·클리셰(+비틀기)를
// 카테고리(접힘/검색)별 체크리스트로 점검한다. 톤 프리셋(반전·환멸 / 영웅·카타르시스 / 전략·정치 /
// 무협·초식 / 헌터·각성)으로 관점을 전환하고, 클리셰→비틀기 아이디어 생성기(슬롯 잠금/재생성·조합수 표시)로
// 상투적 장면을 신선하게 비틀 단서를 만든다. 모든 상태(체크·접힘·검색·프리셋·메모·생성 결과)는
// localStorage('sry:tool:action-tropes')에 자동 저장/복원.
// 자급식: react·linkbus 외 import 없음. 전부 로컬(외부 API 없음). 언마운트 정리. localStorage 차단/손상 시 graceful.
// 연계(linkbus): 점검표를 프로젝트 자료('기획' 폴더) 문서로 추가, 생성한 비틀기 아이디어를 글감(snippets) 라이브러리에 담기,
//   관련 도구(갈등 설계기·플롯 피라미드 등) 열기. payload.genre 활용.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'action-tropes', name: '액션·전쟁 트로프 점검표', icon: '⚔️', group: '구상·정리', genre: '액션·전쟁', intro: '액션·전쟁의 독자 기대·필수 요소·함정·클리셰(+비틀기)를 체크하고 상투성을 비틀어 보세요', w: 660, h: 640 }

const LS_KEY = 'sry:tool:action-tropes'

// ─────────────────────────────────────────────────────────────────────────────
// 톤 프리셋 — 대표작 계보를 5개 톤으로 묶어 관점/강조 항목을 전환한다.
// ─────────────────────────────────────────────────────────────────────────────
type ToneKey = 'all' | 'disillusion' | 'catharsis' | 'strategy' | 'martial' | 'hunter'
interface ToneDef { key: ToneKey; label: string; icon: string; blurb: string; refs: string }
const TONES: ToneDef[] = [
  { key: 'all', label: '전체', icon: '🎛️', blurb: '모든 항목 표시. 개인 무력 ↔ 집단 전략, 카타르시스 ↔ 비극의 양축을 함께 점검합니다.', refs: '' },
  { key: 'disillusion', label: '반전·환멸', icon: '🕯️', blurb: '전쟁의 대가와 무의미를 묻는 톤. 무손상 승리·영웅 미화를 경계하고 상실·트라우마를 전면에.', refs: '서부 전선 이상 없다 · 캐치-22 · 그들이 가지고 다닌 것들 · 제5도살장' },
  { key: 'catharsis', label: '영웅·카타르시스', icon: '🔥', blurb: '개인 무력의 통쾌한 과시. 세트피스 점층·시그니처 무브·사이다 응징의 펄스를 설계합니다.', refs: '존 윅 · 다이하드 · 잭 리처 · 매튜 라일리 · 매드맥스' },
  { key: 'strategy', label: '전략·정치', icon: '♟️', blurb: '병참·정보·기만·지휘부의 머리싸움. 전술의 그럴듯함과 결정의 인간적 비용을 동조시킵니다.', refs: '은하영웅전설 · 킹덤 · 킬러 엔젤스 · 유녀전기 · 톰 클랜시' },
  { key: 'martial', label: '무협·초식', icon: '🗡️', blurb: '내공·초식·비무·문파전. 초식 파훼와 비기 완성을 누적된 수련의 결실로 회수합니다.', refs: '화산귀환 · 나노마신 · 검술명가 막내아들 · 바가본드 · 베르세르크' },
  { key: 'hunter', label: '헌터·각성', icon: '🌀', blurb: '각성·스킬·레이드·길드전. 능력 규칙(쿨타임·자원)의 일관성 위에서 무력 인플레를 통제합니다.', refs: '나 혼자만 레벨업 · 전지적 독자 시점 · 회귀/게임판타지 PvP·공성' },
]
function toneDef(k: ToneKey): ToneDef { return TONES.find((t) => t.key === k) || TONES[0] }

// ─────────────────────────────────────────────────────────────────────────────
// 점검 항목 — 카테고리 6종. 각 항목은 kind(기대/필수/함정/클리셰)와 tones(해당 톤) 태그를 가진다.
//   kind: 'expect'(독자 기대) · 'must'(필수 관습/장치) · 'pitfall'(흔한 함정) · 'cliche'(클리셰 + 비틀기 trick)
// id 는 카테고리+index 로 안정 파생. tones 가 비면 모든 톤에 표시.
// ─────────────────────────────────────────────────────────────────────────────
type Kind = 'expect' | 'must' | 'pitfall' | 'cliche'
interface Item { q: string; kind: Kind; tones?: ToneKey[]; trick?: string } // trick: 클리셰 비틀기 제안
interface Cat { id: string; name: string; icon: string; desc: string; items: Item[] }

const CATS: Cat[] = [
  {
    id: 'geo', name: '공간·지리·이해관계', icon: '🗺️', desc: '전장 지도·출구·시간제한·무엇을 잃는가',
    items: [
      { q: '독자가 전장 지도를 머릿속에 그릴 수 있는가 — 누가 어디에, 출구·엄폐물·고지·거리·시간제한은?', kind: 'expect' },
      { q: '액션 최대 실패는 "약함"이 아니라 "혼란"이다 — 공간이 매 순간 명료한가?', kind: 'expect' },
      { q: '싸움 전에 무엇을/누구를 잃을 수 있는지(이해관계)를 미리 설치했는가?', kind: 'expect' },
      { q: '죽지 않을 주인공이라도 부상·동료·시간·도덕·임무 실패 중 무엇이 위태로운가?', kind: 'expect' },
      { q: '시계 장치(ticking clock): 타이머·증원 도착·인질 시한·만조·일출이 긴장을 증폭하는가?', kind: 'must' },
      { q: '체호프의 환경: 1막에 보인 환경 요소(샹들리에·가스밸브·절벽·강물·지뢰밭)를 전투에서 회수하는가?', kind: 'must' },
      { q: '거리의 변주가 있는가 — 원거리(저격/포격)→중거리(총격)→근접(격투/검)으로 좁혀지며 잔혹도 상승?', kind: 'must' },
      { q: '전장 지리를 전투 직전 인포덤프로 몰아넣어 추진력을 잃지 않았는가?', kind: 'pitfall' },
      { q: '설치한 카운트다운을 클라이맥스에서 잊지 않고 멎게 했는가(00:01 해제)?', kind: 'pitfall' },
      { q: '클리셰: "마지막 1초에 폭탄 해제" — 차라리 해제 실패 후 그 폭발을 역이용하거나, 진짜 폭탄은 다른 곳에.', kind: 'cliche', trick: '타이머가 멎는 게 아니라, 타이머가 가짜였음이 드러난다' },
    ],
  },
  {
    id: 'power', name: '능력 규칙·대가·무력 격차', icon: '⚙️', desc: '강함의 규칙·자원·부상 시계·격차 사다리',
    items: [
      { q: '주인공/적의 강함·약점·자원(탄약·체력·내공·마나)이 규칙으로 일관되게 작동하는가?', kind: 'expect' },
      { q: '카타르시스가 정당해지도록 능력의 한계와 비용이 분명한가?', kind: 'expect' },
      { q: '물리적 대가: 부상·피로·트라우마·탄약 소모로 액션에 무게가 실리는가?', kind: 'expect' },
      { q: '능력 격차 사다리: 주인공이 명백히 약한 지점에서 시작해 약점/도구/희생/각성으로 역전하는가?', kind: 'must' },
      { q: '부상 시계: 출혈·골절이 시간제한으로 작동해 카운트다운을 부여하는가?', kind: 'must' },
      { q: '마지막 한 발/마지막 힘: 자원 고갈 직전(탄약 1발·내공 한 줌·부서진 무기)의 역전이 있는가?', kind: 'must' },
      { q: '무에서 솟는 새 힘(데우스 엑스 마키나)으로 위기를 해결해 독자를 배신하지 않는가?', kind: 'pitfall' },
      { q: '무손상 승리의 반복으로 긴장이 붕괴되지 않는가?', kind: 'pitfall' },
      { q: '무력 인플레가 통제 불능이 되어 이전 위협이 시시해지지 않는가(헌터/무협 주의)?', kind: 'pitfall', tones: ['hunter', 'martial'] },
      { q: '클리셰: "위기에서 갑툭튀 신각성/신초식" — 복선·수련을 1~2막에 깔아 결실로 만들었는가?', kind: 'cliche', trick: '각성은 새 힘이 아니라, 이미 배운 기술의 금기였던 사용법을 푸는 것' },
      { q: '클리셰: "주인공만 멀쩡, 적은 우르르" — 적에게도 학습·전술·통신을 줘서 한 번에 안 덤비게.', kind: 'cliche', tones: ['catharsis', 'hunter'], trick: '잡몹이 영리해져 주인공의 시그니처 무브를 역이용한다' },
    ],
  },
  {
    id: 'setpiece', name: '세트피스·페이싱·리듬', icon: '🎬', desc: '들숨-날숨·문장 속도·비트·세트피스 점층',
    items: [
      { q: '세트피스마다 고유한 장소·제약·목표·합병증이 있고, 앞 것보다 규모/위험이 커지는가?', kind: 'must' },
      { q: '점층되는 세트피스(작은 충돌→중간 보스→최종전)로 기대치를 쌓는가?', kind: 'expect', tones: ['catharsis', 'hunter', 'martial'] },
      { q: '들숨-날숨 리듬: 액션 폭발 → 짧은 호흡(부상 점검·농담·다음 계획) → 더 큰 액션인가?', kind: 'must' },
      { q: '문장 길이=속도계: 격렬 구간은 단문·동사 중심·잦은 행갈이, 준비/여파는 만연체 허용?', kind: 'must' },
      { q: '비트 단위 안무: 결정적 3~5비트만 슬로우, 나머지는 요약(scene vs summary)으로 처리했는가?', kind: 'must' },
      { q: '단락=카메라 컷: 시점 전환·타격 순간마다 단락을 끊어 영상적 리듬을 주는가?', kind: 'must' },
      { q: '거짓 안전지대: 안전해 보이는 휴식 직후의 기습으로 들숨-날숨을 설계했는가?', kind: 'must' },
      { q: '모든 전투가 같은 규모·같은 승리 방식으로 평탄화되지 않았는가?', kind: 'pitfall' },
      { q: '쉼 없는 액션의 연속으로 감정이 둔감화되지 않았는가(역설적으로 둔해진다)?', kind: 'pitfall' },
      { q: '"막고-비틀고-찌른다"식 과잉 안무 나열로 지루해지지 않았는가?', kind: 'pitfall' },
      { q: '웹소설: 회차 끝을 전투 절정 직전/반전 직후 클리프행어로, 회차 안에 미니 위기-해소(사이다) 1회 이상?', kind: 'must', tones: ['hunter', 'martial'] },
      { q: '클리셰: "느린 모션 + 등 뒤 폭발 걸음" — 카메라 자랑 대신 그 순간 인물이 무엇을 잃었는지로 채우기.', kind: 'cliche', tones: ['catharsis'], trick: '폭발을 등지고 걷는 건 멋이 아니라, 뒤를 못 돌아보는 죄책감이다' },
    ],
  },
  {
    id: 'war', name: '전쟁물 — 전술·병참·대의', icon: '🎖️', desc: '편제·고증·왜 싸우는가·후방·무게의 물건',
    items: [
      { q: '전술·병참·계급·명령체계의 그럴듯함(군사 고증)이 확보되었는가?', kind: 'expect', tones: ['disillusion', 'strategy'] },
      { q: '"왜 싸우는가"(애국/환멸/생존)에 대한 작품의 입장이 분명한가?', kind: 'expect', tones: ['disillusion', 'strategy'] },
      { q: '개인과 대의의 충돌, 후방·민간인의 시점이 들어 있는가?', kind: 'expect', tones: ['disillusion', 'strategy'] },
      { q: '병참·정보의 비대칭: 보급선·첩보·기만(거짓 무전·위장)이 승패를 가르는 머리싸움이 있는가?', kind: 'must', tones: ['strategy'] },
      { q: '명령의 시점 교차: 지휘부(전략) ↔ 현장 병사(전술/생존)를 교차해 결정과 인간적 비용을 동시에?', kind: 'must', tones: ['disillusion', 'strategy'] },
      { q: '무게의 물건: 병사가 지고 다니는 것들(편지·부적·시신·죄책감)로 추상을 구체적 무게로 환원했는가?', kind: 'must', tones: ['disillusion'] },
      { q: '희생적 후위: 동료가 남아 막고 주인공을 보내는 감정 정점을 활용했는가?', kind: 'must', tones: ['disillusion', 'strategy'] },
      { q: '불리한 수적 열세/최후의 저항(알라모식 last stand)으로 약자 응원 심리를 동원했는가?', kind: 'must' },
      { q: '전투를 게임 스코어처럼 다뤄 죽음의 무게가 사라지지 않았는가?', kind: 'pitfall', tones: ['disillusion', 'strategy'] },
      { q: '전술이 "그냥 돌격"으로 단순화되어 머리싸움이 실종되지 않았는가?', kind: 'pitfall', tones: ['strategy'] },
      { q: '클리셰: "정의로운 아군 vs 순수 악 적군" — 적에게도 타당한 논리·두려움·집을 줘서 거울로 만들기.', kind: 'cliche', tones: ['disillusion', 'strategy'], trick: '적 병사의 주머니에서 우리 편과 똑같은 가족사진이 나온다' },
      { q: '클리셰: "전사 직전 긴 유언" — 말은 끊기고, 못 한 말이 동료의 손에 남은 물건으로 전해지게.', kind: 'cliche', tones: ['disillusion'], trick: '유언 대신, 평소 농담 한마디가 마지막 말이 된다' },
    ],
  },
  {
    id: 'climax', name: '클라이맥스·복선 회수', icon: '🏔️', desc: '최저점 역전·약점 폭발·대가 있는 승리',
    items: [
      { q: '잡몹·중간보스를 거쳐 최강 빌런과의 최종 1대1(또는 핵심 대결)에 도달하는가?', kind: 'must' },
      { q: '규모는 가장 크되 초점은 가장 좁게(개인 대 개인의 의미로) 수렴하는가?', kind: 'expect' },
      { q: '약점 회수·복선 폭발: 깔아둔 적의 약점·환경 요소·시그니처 기술·동료의 선물이 동시 발화하는가?', kind: 'must' },
      { q: '최저점 직후 역전: 패배 직전 "잃을 것이 명확해진 순간" 마지막 자원/의지로 뒤집는가?', kind: 'must' },
      { q: '대가 있는 승리(Pyrrhic): 이기되 무언가(동료·신념·고향·자기 일부)를 영구히 잃는가?', kind: 'expect' },
      { q: '개인 무력 ↔ 집단 운명의 동조: 한 인물의 분투가 전선 전체의 분기점이 되는가(전쟁물)?', kind: 'must', tones: ['strategy', 'disillusion'] },
      { q: '카타르시스 정산(aftermath): 부상 수습·전사자 호명·빌런 최후·세계 변화 확인을 짧게 넣었는가?', kind: 'must' },
      { q: '무협/헌터: 비기 완성·신경지 돌파·각성 폼 해방이 누적된 수련·복선의 결실인가?', kind: 'must', tones: ['martial', 'hunter'] },
      { q: '반전 절정: 진짜 적이 외부가 아니라 아군 지휘부/체제였다는 폭로형 결말도 검토했는가?', kind: 'must', tones: ['strategy', 'disillusion'] },
      { q: '여파 장면이 너무 길어 늘어지거나, 아예 없어 공허하지 않은가?', kind: 'pitfall' },
      { q: '클라이맥스 승리가 운빨·우연이라 독자가 사기로 인식하지 않는가?', kind: 'pitfall' },
      { q: '클리셰: "빌런의 일장연설 동안 주인공 회복" — 빌런이 말을 아끼게 하거나, 연설을 미끼로 역공하기.', kind: 'cliche', trick: '주인공이 빌런의 연설을 끊고, 그 허영을 약점으로 찌른다' },
    ],
  },
  {
    id: 'sense', name: '감각·핍진성·승부의 정당성', icon: '👂', desc: '소리·냄새·신체감각·머리로 이긴 승리',
    items: [
      { q: '감각 핍진성: 소리(총성·금속음)·냄새(화약·피·흙)·신체감각(반동·심박·통증)·시간왜곡을 담았는가?', kind: 'expect' },
      { q: '시그니처 무브/무기: 인물 정체성을 압축한 반복 기술(재장전·절기·저격 호흡)을 클라이맥스에서 변주/봉인/극복하는가?', kind: 'must' },
      { q: '의식·준비 몽타주(gear-up/loadout): 무장 점검·작전 브리핑·"규칙 정하기"로 긴장 적재 + 능력 사전공개?', kind: 'must' },
      { q: '승부의 정당성: 머리/준비/희생/약점공략으로 이기는가(운빨·우연 승리 금지)?', kind: 'expect' },
      { q: '감정을 직접 진술 대신 행동·신체 반응(식은땀·좁아진 시야·먹먹한 귀)으로 드러내는가?', kind: 'must' },
      { q: '같은 타격 동사(후려치다·내리꽂다 등)만 반복해 묘사가 단조로워지지 않았는가?', kind: 'pitfall' },
      { q: '감각 과부하로 정작 무슨 일이 벌어지는지 흐려지지 않았는가(명료성 > 화려함)?', kind: 'pitfall' },
      { q: '클리셰: "주인공 무쌍, 적은 허수아비" — 승리에 구체적 준비/약점공략의 과정을 보이게.', kind: 'cliche', tones: ['catharsis', 'hunter'], trick: '무쌍처럼 보이지만 사실은 사전에 깔아둔 함정의 작동이었다' },
      { q: '클리셰: "탄약 무한·재장전 없음" — 탄창 관리·재장전 타이밍을 시계 장치로 활용하기.', kind: 'cliche', tones: ['catharsis'], trick: '마지막 탄창을 누구에게 쓰느냐가 곧 주제의 선택이 된다' },
    ],
  },
]

// ─── kind 메타(라벨/색/아이콘) ───────────────────────────────────────────────
const KIND_META: Record<Kind, { label: string; icon: string; color: string }> = {
  expect: { label: '독자 기대', icon: '👁️', color: 'var(--accent)' },
  must: { label: '필수 관습', icon: '✅', color: 'var(--ok)' },
  pitfall: { label: '흔한 함정', icon: '⚠️', color: 'var(--warn)' },
  cliche: { label: '클리셰+비틀기', icon: '♻️', color: '#a06bd4' },
}
const KIND_ORDER: Kind[] = ['expect', 'must', 'pitfall', 'cliche']

// ─────────────────────────────────────────────────────────────────────────────
// 클리셰 → 비틀기 아이디어 생성기 슬롯 풀(장르 특화·구체). 5슬롯 조합.
//   조합수 = 클리셰 131 × 비틀기 93 × 페이싱 85 × 걸린 것 73 × 감각 69 = 5,216,090,535(약 52억).
//   (이전 62×48×43×38×30 = 145,883,520 → 약 50.7억 확대.) 풀 길이를 코드에서 곱하므로 데이터만 키우면 자동 반영.
// ─────────────────────────────────────────────────────────────────────────────
const CLICHE_POOL: string[] = [
  '혼자 수십 명을 베는 무쌍 학살극',
  '폭발을 등지고 슬로모션으로 걷는 영웅',
  '마지막 1초에 해제되는 폭탄 타이머',
  '죽기 직전 길고 비장한 유언',
  '빌런의 장황한 일장연설 동안 회복하는 주인공',
  '훈련 한 번 없이 각성으로 솟는 신기술',
  '아군은 정의, 적군은 순수 악',
  '탄약이 무한하고 재장전이 없는 총격전',
  '비 내리는 옥상에서의 최종 결투',
  '주인공만 멀쩡하고 동료는 줄줄이 전사',
  '"넌 날 못 죽여" 직후 봐주다 역습당하는 장면',
  '죽은 줄 알았던 동료의 극적 생환',
  '스승의 죽음으로 각성하는 제자',
  '적 보스의 비밀 약점을 우연히 발견',
  '인질을 방패로 세우는 비겁한 악당',
  '카운트다운을 잊고 흘려보내는 작전',
  '무한 증원되는 졸개 웨이브',
  '단 한 발 남은 총알로 정확히 명중',
  '부상 입고도 끝까지 멀쩡히 싸우는 몸',
  '"이게 마지막 임무야"라고 말하는 베테랑',
  '비무대회 결승에서 만나는 숙명의 라이벌',
  '봉인된 금단의 무공/스킬 해방',
  '회귀로 미리 아는 적의 작전을 그대로 파훼',
  '지휘부의 무능한 명령에 희생되는 병사들',
  '폐허가 된 고향 앞에서 복수를 다짐',
  '적의 본거지에 홀로 잠입하는 작전',
  '무전기 너머로 들리는 동료의 마지막 교신',
  '훈장 수여식으로 닫히는 전쟁의 끝',
  '"날 두고 가"라며 자폭하는 후위',
  '주인공을 살리려 총알을 대신 맞는 조연',
  '적에게 둘러싸여 등을 맞대는 두 주인공',
  '"이 무기는 너에게 안 통해"라며 비웃는 빌런',
  '벼랑 끝에서 한 손으로 매달린 적을 구할지 말지',
  '폭발 직전 슬라이딩으로 문을 빠져나가는 탈출',
  '거울처럼 똑같이 싸우는 도플갱어/형제 대결',
  '"내가 진짜 보스다"라며 정체를 드러내는 중간보스',
  '주인공의 분노 폭발로 한순간 압도하는 광폭화',
  '무릎 꿇은 적을 끝내 베지 못하는 망설임',
  '전우의 군번줄을 손에 쥐고 오열하는 장면',
  '"명령이다"로 부당한 작전을 강행하는 상관',
  '적의 칼을 맨손으로 잡아 멈추는 신기',
  '한 명씩 쓰러뜨리며 복도를 돌파하는 원테이크',
  '죽기 전 사진 한 장을 꺼내 보는 병사',
  '"넌 변했어"라며 옛 동료와 맞서는 배신 대결',
  '폭우 속 진흙탕에서 뒹구는 육탄전',
  '마지막에 등장해 판을 뒤엎는 숨은 강자',
  '인질극에서 "나를 쏴"라고 외치는 협상',
  '훈련소 신병이 첫 실전에서 얼어붙는 순간',
  '"이번 한 번만"이라며 은퇴를 번복하는 노병',
  '적 본진에 깃발을 꽂으며 끝나는 점령',
  '무기를 버리고 맨주먹으로 정정당당 승부',
  '시한폭탄의 전선 색깔로 고민하는 해체',
  '"너도 한때는 좋은 사람이었지"라는 설득',
  '동귀어진(同歸於盡)으로 적과 함께 추락',
  '주인공의 각성을 알아본 적의 "흥미롭군"',
  '전장 한복판에서 적과 나누는 짧은 휴전·담배',
  '"내 뒤는 네가 맡아"라며 등을 맡기는 신뢰',
  '봉인구 해제로 폭주하는 금지된 힘',
  '죽은 스승의 환영이 마지막 한 수를 일러줌',
  '무전 너머 "지원은 없다"는 통보 후의 사투',
  '적장의 목을 들어 보이며 사기를 올리는 장면',
  '"이게 전쟁이야"라며 신참을 가르치는 고참',
  '폭발의 화염 속을 천천히 걸어 나오는 무상한 주인공',
  '"다 끝났어"라는 말 직후 다시 일어서는 적',
  '죽기 직전 자식·연인의 이름을 부르는 병사',
  '주인공이 도착하자마자 기다렸다는 듯 멈추는 적들',
  '난전 속에서도 주인공에게만 비껴가는 총탄',
  '결정적 순간 고장 났다가 한 번에 작동하는 무기',
  '"내가 신호를 보내면 쏴"라는 약속과 그 신호',
  '적의 본진을 통째로 날리는 단 한 발의 포격',
  '계단을 천천히 올라오는 보스를 기다리는 정적',
  '"넌 내가 누군지 모르지"라며 정체를 까는 거물',
  '함정인 줄 알면서도 동료를 위해 걸어 들어가는 선택',
  '쓰러진 적이 마지막 힘으로 방아쇠를 당기는 반전',
  '"우리에겐 시간이 없어"를 반복하는 다급한 작전실',
  '주인공의 등 뒤에서 조용히 총을 겨누는 배신자',
  '폐허 속에서 살아남은 아이를 안고 걷는 군인',
  '"널 이렇게 만든 건 나야"라는 스승의 고백',
  '적의 심장부에서 자폭 스위치를 손에 쥔 대치',
  '죽은 동료의 무기를 이어받아 드는 계승의 순간',
  '"항복하면 살려주마"라는 거짓 약속',
  '비 오는 거리에서 우산도 없이 마주 선 두 사람',
  '전세를 단숨에 뒤엎는 지원군의 때맞춘 등장',
  '"이번엔 다르다"라며 같은 실수를 반복하는 지휘관',
  '적의 미사일을 맨몸으로 끌어안고 사라지는 희생',
  '주인공을 알아본 적이 부하들을 물리는 일대일 예우',
  '죽음을 각오한 듯 군장을 천천히 챙기는 출격 전',
  '"가족에게 전해줘"라며 편지를 건네는 전우',
  '연막 속에서 갑자기 튀어나오는 적의 칼날',
  '버려진 줄 알았던 기지에서 울리는 통신 신호',
  '"이 손으로 끝내겠다"라며 무기를 버리는 결투',
  '폭풍 전야처럼 고요한 결전 직전의 새벽',
  '한 발의 총성으로 시작되는 대규모 교전',
  '적의 함정을 역이용해 그대로 되돌려주는 한 수',
  '"네 차례야"라며 후계자에게 자리를 넘기는 노장',
  '무너지는 건물 속에서 손을 맞잡는 마지막 인사',
  '죽은 줄 알았던 적이 거울 앞에 다시 서는 부활',
  '주인공의 이름을 외치며 달려드는 광신적 추종자',
  '"명령을 어기겠습니다"라며 돌아서는 부하',
  '한 줄기 햇빛 아래 드러나는 전장의 시신들',
  '적의 거점에 단신으로 걸어 들어가는 선전포고',
  '"내가 미끼가 되지"라며 적을 끌어내는 자원',
  '쓰러진 주인공을 둘러싸고 호위하는 동료들의 원진',
  '폭약을 몸에 두르고 적 한가운데로 뛰어드는 결사',
  '"넌 아직 약해"라며 등을 돌리는 강자',
  '전투의 소음이 멎고 들려오는 단 한 사람의 숨소리',
  '적의 대장을 베자 와르르 무너지는 진영',
  '"내 검을 받아라"라며 마지막 일격을 준비하는 자세',
  '잿더미가 된 마을에 홀로 꽂힌 부러진 깃발',
  '주인공의 분노가 폭발하며 뒤바뀌는 전세',
  '"우리가 진 게 아니야"라며 후퇴를 명하는 사령관',
  '적과 동료를 동시에 구할 수 없는 마지막 선택',
  '죽기 직전 적과 나누는 짧은 인정의 눈빛',
  '"여기서 죽을 순 없어"라며 이를 악무는 부상병',
  '거대한 적 앞에 선 작은 주인공의 뒷모습',
  '한순간에 십수 명을 제압하는 압도적 무위',
  '"내가 막을 테니 가"라며 다리를 무너뜨리는 후위',
  '적의 본거지에서 울려 퍼지는 동료의 비명',
  '폭우 속 진창에서 끝까지 기어가는 전령',
  '"이 전쟁은 끝나지 않아"라는 노병의 예언',
  '죽은 자의 이름을 한 명씩 부르는 점호',
  '적의 칼이 멎고 둘 사이로 떨어지는 빗방울',
  '주인공의 첫 패배를 지켜보는 어린 제자',
  '"날 믿어"라는 한마디에 무기를 내리는 인질',
  '불타는 본부에서 마지막 명령을 타전하는 통신병',
  '적장과 단둘이 마주한 텅 빈 결전장',
  '"끝까지 함께 간다"라며 손을 포개는 동료들',
  '쓰러진 주인공이 흙을 움켜쥐며 다시 일어서는 순간',
  '적의 증원이 끊긴 틈을 노린 단 한 번의 돌파',
  '"미안하다"라는 말과 함께 방아쇠를 당기는 손',
  '전장에 홀로 남아 무기를 내려놓는 마지막 생존자',
]

const TWIST_POOL: string[] = [
  '겉보기엔 클리셰지만 사실은 정교한 함정의 작동이었다',
  '성공이 아니라 처참한 실패로 끝나 대가를 치른다',
  '시점을 적/조연/민간인에게 넘겨 다르게 보이게 한다',
  '그 순간 인물이 무엇을 영구히 잃는지를 전면에 둔다',
  '능력이 아니라 약점·결함이 승부를 가르게 만든다',
  '관객이 기대하는 타이밍을 한 박자 비틀어 어긋나게 한다',
  '같은 행동의 동기를 정반대(영웅심 → 죄책감)로 뒤집는다',
  '환경/지형이 주인공이 아니라 적에게 유리하게 작동한다',
  '말 대신 침묵·물건·몸짓으로만 전하게 한다',
  '승리의 순간을 빌런의 진짜 의도가 드러나는 순간으로 겹친다',
  '주인공이 "옳은 선택" 대신 더러운 선택을 하게 만든다',
  '클리셰를 등장인물이 자각하고 의식적으로 거부한다',
  '구원자가 도착하지만 이미 늦어 의미가 변질된다',
  '약자/배경 인물의 작은 결정이 전선 전체를 바꾼다',
  '시간 제한이 가짜였거나 다른 곳에 진짜가 있었다',
  '복수가 이루어져도 텅 빈 공허만 남는다',
  '아군이라 믿은 쪽이 진짜 적(지휘부/체제)이었다',
  '한 번 통한 시그니처 무브를 적이 학습해 역이용한다',
  '"무한"처럼 보이던 자원이 갑자기 바닥나 판이 뒤집힌다',
  '희생이 미화되지 않고 부조리하고 헛되게 그려진다',
  '주인공이 이기지만 그 승리가 더 큰 비극의 씨앗이 된다',
  '카메라가 자랑하던 멋의 대가를 바로 다음 장면이 청구한다',
  '강해진 능력이 오히려 인물을 고립시키는 저주가 된다',
  '구하려던 대상이 실은 구원받기를 원치 않는다',
  '클리셰가 한 번 통한 뒤 두 번째엔 정반대로 작동한다',
  '관객만 아는 정보와 인물이 모르는 정보를 어긋나게 둔다',
  '액션의 책임을 끝까지 추적해 후일담으로 청구한다',
  '영웅적 행동이 사실 더 큰 피해를 막지 못한 변명이었다',
  '무력이 아니라 협상·후퇴가 더 어려운 선택임을 보인다',
  '복선이 회수되지만 의미가 처음과 정반대로 뒤집힌다',
  '주인공의 트라우마가 강점인 동시에 치명적 약점이 된다',
  '승자와 패자의 위치를 마지막 한 컷에서 뒤바꾼다',
  '동료의 희생이 사실 불필요했음이 나중에 드러난다',
  '적의 잔혹함에 우리 편도 똑같이 물들어 가는 과정을 보인다',
  '한 장면을 두 인물의 모순된 기억으로 두 번 보여준다',
  '시그니처 무기를 잃고서야 진짜 실력이 드러난다',
  '"이겼다"는 확신의 순간을 가장 위험한 순간으로 만든다',
  '거대한 전투를 단 한 사람의 작은 시야로만 그린다',
  '구원자가 적이고, 적이 유일한 구원자였음을 밝힌다',
  '주인공이 클리셰대로 행동하려다 스스로를 비웃고 멈춘다',
  '액션의 소음을 지우고 침묵·정적으로만 절정을 친다',
  '승리의 환호 속에서 한 인물만 무너지는 표정을 잡는다',
  '"강해지면 지킬 수 있다"는 전제 자체가 틀렸음을 드러낸다',
  '복수의 대상이 이미 다른 이유로 망가져 있었다',
  '결정적 순간 무기가 아니라 말 한마디가 승부를 가른다',
  '같은 작전을 적 시점에서 보면 우리가 빌런이 된다',
  '주인공이 약점을 숨기는 대신 일부러 드러내 함정을 판다',
  '영웅 서사가 누군가의 선전·프로파간다였음이 폭로된다',
  '승리의 대가가 다음 세대에게 고스란히 떠넘겨진다',
  '구원받은 자가 구원자를 끝내 원망하게 된다',
  '용맹이라 불린 행동이 사실은 도피였음이 드러난다',
  '아군의 환호가 패배한 적의 침묵과 교차되어 무겁게 가라앉는다',
  '한 사람의 영웅화가 다른 희생자들을 지워버린다',
  '복수를 끝낸 자리에 남는 것은 또 다른 원한뿐이다',
  '결정적 한 발이 엉뚱한 사람을 맞히며 모든 게 어긋난다',
  '강함을 증명하려던 싸움이 오히려 약점을 드러낸다',
  '명령에 따른 자와 거부한 자의 운명이 뒤바뀐다',
  '살아남은 죄책감이 죽음보다 무겁게 인물을 짓누른다',
  '적을 이해하게 된 순간 더는 방아쇠를 당길 수 없게 된다',
  '승전보가 전선의 진실을 가리는 거짓이었음이 밝혀진다',
  '구하려던 대상이 이미 적의 편이 되어 있었다',
  '영웅의 귀환을 아무도 기억하지 못하는 결말로 끝난다',
  '작은 친절 하나가 거대한 비극의 도화선이 된다',
  '이긴 쪽과 진 쪽 모두 잃기만 한 싸움으로 귀결된다',
  '무기를 내려놓는 선택이 가장 큰 용기였음을 보인다',
  '복선이던 우정이 마지막에 배신으로 회수된다',
  '주인공의 신념이 적의 신념과 정확히 거울처럼 겹친다',
  '이긴 전투가 진짜 전쟁에서는 무의미했음이 드러난다',
  '희생한 자의 이름이 시간이 지나 잊히는 것으로 끝난다',
  '정의의 이름으로 한 일이 누군가에겐 학살이었다',
  '되찾은 고향이 더는 돌아갈 곳이 아니게 변해 있다',
  '적의 마지막 말이 평생 인물을 따라다니는 저주가 된다',
  '구원의 손길이 한 박자 늦어 모든 의미를 잃는다',
  '강해진 대가로 인간적인 무언가를 영영 잃어버린다',
  '승리의 주역이 실은 가장 비겁했던 자로 밝혀진다',
  '같은 전장을 두 세대가 반복하는 순환으로 닫힌다',
  '도움을 거절당한 손이 결국 적의 손을 잡게 된다',
  '영광의 순간을 지켜보던 인물만 홀로 무너져 내린다',
  '끝까지 지킨 약속이 정작 지킬 가치가 없었음을 드러낸다',
  '적의 잔혹함을 비난하던 입으로 같은 일을 저지른다',
  '살리려던 한 사람 때문에 더 많은 이를 잃게 된다',
  '평화 협정이 다음 전쟁을 위한 휴전에 불과했음이 드러난다',
  '용서를 구한 자가 정작 용서받지 못한 채 사라진다',
  '주인공이 지킨 비밀이 모두를 위험에 빠뜨린 원인이었다',
  '전설로 남은 승리가 사실은 운 좋은 우연이었다',
  '적의 자리에 서 보고서야 자신의 잔혹함을 깨닫는다',
  '구한 미래가 구한 자가 바라던 미래와는 정반대였다',
  '마지막까지 믿은 대의가 텅 빈 구호였음이 폭로된다',
  '한 번의 망설임이 모두의 운명을 바꿔놓는다',
  '승자의 기록에서 패자의 용기가 통째로 삭제된다',
  '복수가 완성된 순간 살아갈 이유마저 함께 사라진다',
  '지휘관의 영웅적 결단이 부하들에겐 사형선고였다',
  '끝났다고 믿은 싸움이 더 큰 싸움의 서막일 뿐이었다',
]

const FOCUS_POOL: string[] = [
  '공간 지리를 단 세 개의 랜드마크로만 그린다',
  '시계 장치(타이머/증원/만조)를 카운트다운으로 깐다',
  '거리를 원거리→근접으로 좁히며 잔혹도를 올린다',
  '체호프의 환경 요소를 1막에 미리 보여둔다',
  '들숨-날숨: 액션 사이에 짧은 농담/점검을 끼운다',
  '결정적 3비트만 슬로우, 나머지는 한 문장 요약',
  '단문·동사 중심으로 속도를 끌어올린다',
  '부상 시계(출혈/골절)를 또 하나의 카운트다운으로',
  '시그니처 무브를 변주/봉인/극복으로 회수한다',
  '준비 몽타주로 능력과 규칙을 사전 공개한다',
  '지휘부와 현장 병사의 시점을 교차한다',
  '"무게의 물건"(편지/부적/사진)을 클로즈업한다',
  '거짓 안전지대 직후의 기습을 배치한다',
  '소리·냄새(화약/피/흙)로 감각을 채운다',
  '마지막 한 발/한 줌을 누구에게 쓰는지로 주제화',
  '약점공략·준비의 과정을 보여 승부를 정당화',
  '여파(전사자 호명/부상 수습)를 짧게 정산한다',
  '수적 열세(1 대 다수)로 약자 응원 심리를 켠다',
  '심박·호흡·통증 같은 신체 내부 감각으로 긴장을 잰다',
  '고지·엄폐물·사선(射線)으로 공간 우열을 시각화한다',
  '탄창 수·내공 잔량을 명시해 자원 카운트다운을 건다',
  '시점을 빌런으로 잠깐 넘겨 위협을 입체화한다',
  '병참·보급선의 끊김을 위기의 시계로 활용한다',
  '한 줄짜리 농담으로 들숨의 호흡을 끼워 넣는다',
  '거짓 승리 직후 반전을 배치해 방심을 응징한다',
  '동료의 시선으로 주인공의 광기를 비춘다',
  '날씨·지형(진흙·눈·모래)을 추가 적으로 삼는다',
  '무기의 무게·반동·소음을 손끝 감각으로 묘사한다',
  '명령 한 줄이 수백 명의 생사를 가르게 무게를 둔다',
  '클라이맥스를 1대1로 좁혀 사적인 의미로 수렴시킨다',
  '준비 단계의 "규칙 정하기"로 능력을 사전 공개한다',
  '최후의 저항(last stand)으로 패배 속 존엄을 그린다',
  '시간을 슬로모션과 점프컷으로 늘였다 줄인다',
  '한 인물의 작은 결정이 전선 전체를 바꾸게 동조한다',
  '부상의 누적을 장면마다 추적해 한계를 압박한다',
  '무전·신호의 비대칭(아는 자/모르는 자)으로 서스펜스',
  '"무게의 물건"(편지·부적·사진)을 결정적 순간에 회수',
  '적의 학습을 보여 같은 수가 두 번 안 통하게 한다',
  '민간인·피난민의 눈높이로 전쟁의 비용을 환산한다',
  '시그니처 무브의 봉인·과부하로 절정의 대가를 만든다',
  '승리의 환호를 끊고 침묵의 여파로 마무리한다',
  '복선으로 깔아둔 약점을 클라이맥스에서 동시 발화시킨다',
  '주인공의 결함이 갈등을 스스로 악화시키게 둔다',
  '전투 직전의 침묵으로 폭발할 긴장을 한껏 눌러 둔다',
  '한 인물의 손동작만 클로즈업해 결정의 무게를 보인다',
  '시야 밖의 위협을 소리만으로 먼저 들리게 한다',
  '아군과 적의 거리를 한 걸음씩 좁히며 긴장을 조인다',
  '결정타 직전에 한 박자 멈춰 독자의 숨을 멎게 한다',
  '부상한 다리를 끄는 발소리로 한계를 청각화한다',
  '무기를 고쳐 쥐는 손끝으로 각오를 압축한다',
  '교전 사이의 적막에 떨어지는 물방울 소리를 둔다',
  '시점을 신참 병사로 낮춰 전장의 공포를 새로 그린다',
  '지휘관의 한 줄 명령과 그 결과를 곧장 붙여 보여 준다',
  '죽음의 순간을 슬로모션 대신 단 한 줄로 끊어낸다',
  '폭발의 빛과 소리 사이의 짧은 시차를 묘사한다',
  '엄폐물 뒤에서 숨을 고르는 단 몇 초에 시간을 들인다',
  '적의 발소리가 점점 가까워지는 카운트로 압박한다',
  '동료의 표정 변화만으로 전황의 악화를 알린다',
  '재장전하는 손의 떨림으로 자원 고갈을 시각화한다',
  '연기와 먼지로 시야를 가려 불확실성을 키운다',
  '한 발 한 발의 탄착을 세어 마지막 한 발을 강조한다',
  '전령의 헐떡임으로 소식의 다급함을 전한다',
  '적과 눈이 마주친 찰나에 시간을 멈춰 세운다',
  '전장 한복판의 작은 일상(빵 한 조각)으로 대비를 준다',
  '무전 너머 끊기는 목소리로 거리와 위기를 환기한다',
  '검을 맞댄 두 사람의 호흡만으로 우열을 드러낸다',
  '쓰러진 자의 시점에서 올려다본 하늘로 마무리한다',
  '명중과 빗나감을 한 문장 안에서 교차시켜 긴박감을 준다',
  '적의 그림자가 벽을 타고 다가오는 예고로 서스펜스를 건다',
  '병사의 손에 쥔 물건(부적·사진)을 결정적 순간에 비춘다',
  '폭음 직후의 이명으로 잠시 소리를 지워 충격을 그린다',
  '돌격 명령 전의 깊은 들숨 하나로 결단을 압축한다',
  '적 진영의 불빛 수를 세며 수적 열세를 체감시킨다',
  '주인공의 시선이 출구를 더듬는 동선으로 탈출을 설계한다',
  '한 사람의 비명으로 전체 대오의 붕괴를 알린다',
  '피로 미끄러운 손잡이를 고쳐 쥐는 감각으로 사투를 그린다',
  '결전장에 부는 바람과 깃발만으로 정적의 긴장을 채운다',
  '적의 학습된 대응으로 같은 수가 막히는 좌절을 보인다',
  '구출 시한을 알리는 시계 소리를 장면 내내 깔아 둔다',
  '동료의 마지막 눈빛을 단 한 컷으로 박제한다',
  '전투 후의 정적 속 까마귀 울음으로 여운을 남긴다',
  '주인공이 무기를 내려놓는 동작에 가장 긴 호흡을 준다',
  '적장의 망설임을 포착해 승부의 균열을 만든다',
  '한 줄 농담으로 죽음의 무게를 잠시 덜었다가 되돌린다',
  '승리의 환호 한가운데 빈 군화 한 켤레를 비춘다',
]

const STAKE_POOL: string[] = [
  '동료의 목숨',
  '주인공의 한쪽 팔/눈/다리',
  '지켜야 할 민간인/피난민',
  '남은 마지막 탄약·내공·자원',
  '작전 전체의 성패와 전선의 운명',
  '주인공이 끝까지 지키려던 신념',
  '돌아갈 고향/근거지',
  '시한 안에 구해야 할 인질',
  '동료들에게 한 약속',
  '주인공의 정체(들키면 끝나는 위장)',
  '복수의 명분 혹은 그 무의미함',
  '다음 세대에게 물려줄 미래',
  '한 번 쓰면 봉인되는 비기·각성',
  '지휘 계통에 대한 마지막 신뢰',
  '주인공이 지켜 온 인간성·도덕의 선',
  '한 번 무너지면 회복 불가능한 전선의 거점',
  '시한 안에 전해야 할 결정적 정보·암호',
  '무너지면 끝인 부대의 사기',
  '주인공만 아는 적의 약점이라는 비밀',
  '구출 대상의 신뢰(배신하면 영영 잃는다)',
  '다친 동료를 후송할 마지막 기회',
  '주인공의 이름·명예에 걸린 무게',
  '봉인하면 다시는 못 만날 스승의 가르침',
  '폭파로 끊길 유일한 퇴로(다리·통로)',
  '아군 전체를 노출시킬 무전 침묵의 한계',
  '한 번뿐인 기습의 타이밍',
  '인질이 된 가족 혹은 옛 연인',
  '주인공이 평생 추적해 온 원수',
  '점령당하면 학살이 시작될 도시',
  '쓰면 폭주하는 금단의 무기·약물',
  '주인공의 두 다리(이 전투 후 못 걸을 수도)',
  '동료가 마지막으로 남긴 부탁의 이행',
  '전향한 적 협력자의 목숨',
  '한 발 남은 진통제/탄/물자',
  '무너지면 전쟁의 명분이 사라지는 진실',
  '주인공이 키워 온 신참의 첫 생존',
  '되돌릴 수 없는 한 번의 선택(둘 중 하나만 구한다)',
  '항복하면 지킬 수 있는 목숨 vs 싸우면 지킬 수 있는 긍지',
  '무너지면 후방이 뚫리는 마지막 방어선',
  '적에게 넘어가면 안 되는 작전 지도',
  '한 번뿐인 탈출용 헬기의 이륙 시각',
  '부대원 전원의 귀환을 건 약속',
  '주인공이 평생 모신 주군의 목숨',
  '아군 진영의 위치를 숨길 무전 침묵',
  '폭파되면 도시가 잠기는 댐의 수문',
  '적의 추격을 따돌릴 단 한 번의 우회로',
  '구조 신호를 보낼 마지막 발전기',
  '아이들을 대피시킬 짧은 시간',
  '주인공이 키운 후배의 목숨과 미래',
  '되찾아야 할 빼앗긴 군기(軍旗)',
  '항복 문서에 서명하지 않을 자존심',
  '전향한 동료를 향한 마지막 신뢰',
  '한 발이면 끝나는 적장의 목숨',
  '무너지면 협상이 결렬되는 휴전의 조건',
  '주인공만 아는 적의 진격 시각',
  '동료의 시신을 데려올 한 번의 기회',
  '폭주를 막을 봉인의 마지막 힘',
  '적의 손에 넘어간 통신 암호의 회수',
  '주인공이 지켜온 부대의 명예',
  '한 사람만 통과시킬 좁은 퇴로',
  '전장에 남겨진 부상병들의 후송',
  '적의 본진을 무너뜨릴 단 한 번의 기습',
  '주인공이 가슴에 품은 전사한 전우의 유품',
  '되돌릴 수 없는 발사 명령의 취소',
  '아군 전선 전체를 지탱하는 보급로',
  '주인공이 지키기로 한 항복한 포로들',
  '한 줌 남은 부대의 사기와 의지',
  '적에게 들키면 끝인 잠입 신분',
  '구해야 할 인질과 막아야 할 폭발 사이의 선택',
  '주인공이 마지막까지 붙든 인간으로서의 양심',
  '무너지면 전쟁의 명분이 사라지는 한 줄의 진실',
  '다시는 못 만날 스승과의 마지막 비무',
  '살아 돌아가 전해야 할 동료들의 죽음',
]

// 감각 신호어/연출 디테일 슬롯 — 도시에의 감각 어휘(소리·냄새·신체감각·시간왜곡)에서 한 줄을 더해
// 장면에 핍진성을 입힌다. 5번째 슬롯으로 조합수를 1억+로 끌어올린다.
const SENSE_POOL: string[] = [
  '화약 냄새와 흙먼지가 목구멍을 메운다',
  '총성이 갈라지고 한순간 귀가 먹먹해진다',
  '금속이 맞부딪치는 날카로운 마찰음',
  '피비린내가 코를 찌르고 손이 미끄럽다',
  '심장이 터질 듯 뛰고 폐가 타들어간다',
  '아드레날린에 시야가 좁아지고 시간이 늘어진다',
  '반동이 어깨를 때리고 손끝이 저릿하다',
  '식은땀이 눈으로 흘러들어 시야가 흐려진다',
  '통증이 옆구리에서 번지며 숨이 가빠진다',
  '살이 찢기는 소리와 뒤이은 짧은 정적',
  '비에 젖은 화약 냄새와 진흙의 미끈함',
  '귓전을 스치는 탄환의 파공음',
  '멀리서 다가오는 군화 소리·전차 캐터필러',
  '연막 너머로 번지는 흐릿한 실루엣',
  '손에 쥔 군번줄의 차가운 금속 감촉',
  '입안에 고이는 피와 흙의 비릿한 맛',
  '폭발의 충격파가 가슴을 한 번 밀어낸다',
  '재장전하는 손가락이 떨려 탄창이 걸린다',
  '검을 맞댄 순간 손목으로 전해지는 진동',
  '눈발/모래가 시야를 가리고 발이 미끄러진다',
  '먼 포성의 진동이 발바닥으로 올라온다',
  '숨을 죽인 매복 속, 자신의 심박만 크게 들린다',
  '내공이 단전에서 끌어올려져 손끝으로 모인다',
  '경고음·쿨타임 알림이 시야 한쪽에 깜빡인다',
  '땀과 피로 미끄러운 손잡이를 고쳐 쥔다',
  '화염의 열기가 얼굴을 익히듯 달아오른다',
  '정적 속에 떨어지는 탄피 소리 하나',
  '무전기의 잡음 사이로 끊기는 목소리',
  '굳어가는 상처의 욱신거림이 박자를 센다',
  '마지막 숨을 고르는 들숨 한 번의 길이',
  '귓속에서 윙윙대는 이명이 모든 소리를 삼킨다',
  '입속에 번지는 쇠비린내가 혀끝을 마비시킨다',
  '땀이 등줄기를 타고 흘러 군복이 달라붙는다',
  '먼 폭발의 섬광이 한순간 시야를 하얗게 태운다',
  '진흙에 빠진 군화가 발을 붙잡아 끌어당긴다',
  '손가락 끝이 추위와 긴장으로 곱아 감각이 없다',
  '화염의 열기가 눈썹을 그을릴 듯 가까이 닥친다',
  '발밑에서 깨지는 유리·자갈 소리가 신경을 긁는다',
  '연기를 들이마셔 폐가 타들고 기침이 터진다',
  '심장 박동이 관자놀이까지 쿵쿵 울려 퍼진다',
  '식은땀에 젖은 손이 방아쇠 위에서 미끄러진다',
  '멀리서 울리는 사이렌이 점점 가까워진다',
  '피 묻은 흙냄새가 콧속 깊이 들러붙어 떨어지지 않는다',
  '관통상의 통증이 뒤늦게 불처럼 번져 온다',
  '귓전을 때리는 포성에 가슴속이 한 번 울린다',
  '입김이 차가운 공기 속에 하얗게 흩어진다',
  '눈꺼풀로 흘러든 피가 시야를 붉게 물들인다',
  '맨살을 스치는 탄피의 뜨거운 열기가 따끔하다',
  '진동하는 땅이 무릎으로 그 떨림을 전해 온다',
  '목이 타들어 침을 삼켜도 모래만 씹히는 듯하다',
  '검을 휘두른 팔이 저릿하게 마비되어 온다',
  '젖은 화약 냄새가 비 내음에 섞여 가라앉는다',
  '귀를 막아도 새어 드는 비명이 머릿속을 맴돈다',
  '손바닥에 박힌 파편이 움직일 때마다 쑤신다',
  '숨을 죽인 정적 속 자신의 심장 소리가 너무 크다',
  '시야 가장자리가 어두워지며 정신이 아득해진다',
  '뜨거운 피가 손가락 사이로 미끄럽게 흘러내린다',
  '귓가를 스친 총탄의 바람이 머리카락을 흩뜨린다',
  '발목까지 차오른 흙탕물이 걸음을 무겁게 한다',
  '폭압이 가슴을 한 번 짓누르고 귀를 먹먹하게 한다',
  '얼어붙은 손가락이 탄창을 놓쳐 바닥에 떨어뜨린다',
  '매캐한 연막이 목구멍을 긁어 숨이 막혀 온다',
  '땀과 먼지가 눈에 들어가 따갑게 시야를 흐린다',
  '멀어지는 발소리가 점점 작아져 정적에 묻힌다',
  '무거운 군장이 어깨를 짓눌러 숨이 가빠진다',
  '쇳내 섞인 바람이 상처를 스칠 때마다 시리다',
  '터지는 화염의 굉음이 한 박자 늦게 가슴을 친다',
  '굳은 핏자국이 손등에 들러붙어 뻣뻣하게 마른다',
  '멎은 듯한 시간 속에 빗방울 떨어지는 소리만 또렷하다',
]

// 생성기 슬롯 정의(단일 출처) — 라벨/아이콘/풀. 슬롯을 추가/제거하면 조합수·UI·복원이 자동 반영된다.
interface SlotDef { label: string; icon: string; pool: string[] }
const SLOT_DEFS: SlotDef[] = [
  { label: '클리셰 상황', icon: '🎭', pool: CLICHE_POOL },
  { label: '비틀기 렌즈', icon: '🔄', pool: TWIST_POOL },
  { label: '페이싱 초점', icon: '🎬', pool: FOCUS_POOL },
  { label: '걸린 것', icon: '💥', pool: STAKE_POOL },
  { label: '감각 디테일', icon: '👂', pool: SENSE_POOL },
]

// 조합수: 클리셰(상황) × 비틀기 렌즈 × 페이싱 초점 × 위태로운 것 × 감각 디테일. 풀 길이 곱으로 계산.
// 실제 길이를 코드에서 곱하므로 데이터만 키우면 자동 반영(현재 1억+).
function fmtCount(n: number): string {
  // 한국어 만/억/조 표기
  if (n >= 1e12) return (n / 1e12).toFixed(n >= 1e13 ? 0 : 1).replace(/\.0$/, '') + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, '') + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(0) + '만'
  return n.toLocaleString('ko-KR')
}

// ─── 조사 헬퍼 ────────────────────────────────────────────────────────────────
// 단어의 마지막 한글 음절 받침 유무를 보고 올바른 조사 하나만 골라 붙인다.
// (괄호 이중표기 "을(를)" 같은 표기를 절대 노출하지 않기 위함)
function hasBatchim(word: string): boolean {
  // 끝의 인용부호/괄호/공백/문장부호를 건너뛰고 마지막 한글 음절을 찾는다.
  for (let i = word.length - 1; i >= 0; i--) {
    const code = word.charCodeAt(i)
    if (code >= 0xac00 && code <= 0xd7a3) {
      const finalConsonant = (code - 0xac00) % 28
      return finalConsonant !== 0
    }
  }
  return false // 한글이 없으면(영문·기호) 받침 없음으로 처리
}
function withJosa(word: string, withBatchim: string, withoutBatchim: string): string {
  return word + (hasBatchim(word) ? withBatchim : withoutBatchim)
}
const eul = (w: string) => withJosa(w, '을', '를') // 을/를
const eun = (w: string) => withJosa(w, '은', '는') // 은/는

// ─── 영속 상태 ────────────────────────────────────────────────────────────────
interface Persisted {
  checked: Record<string, boolean>
  collapsed: Record<string, boolean>
  tone: ToneKey
  search: string
  notes: Record<string, string> // 항목 id -> 메모
  gen: { slots: number[]; locks: boolean[] } | null
}
function emptyState(): Persisted {
  return { checked: {}, collapsed: {}, tone: 'all', search: '', notes: {}, gen: null }
}
const itemId = (catId: string, idx: number) => `${catId}:${idx}`

function loadState(payloadTone?: ToneKey): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) { const s = emptyState(); if (payloadTone) s.tone = payloadTone; return s }
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return emptyState()
    const s = emptyState()
    if (p.checked && typeof p.checked === 'object') for (const k of Object.keys(p.checked)) s.checked[k] = !!p.checked[k]
    if (p.collapsed && typeof p.collapsed === 'object') for (const k of Object.keys(p.collapsed)) s.collapsed[k] = !!p.collapsed[k]
    if (p.notes && typeof p.notes === 'object') for (const k of Object.keys(p.notes)) s.notes[k] = String(p.notes[k] || '')
    if (TONES.some((t) => t.key === p.tone)) s.tone = p.tone
    if (typeof p.search === 'string') s.search = p.search
    if (p.gen && Array.isArray(p.gen.slots) && Array.isArray(p.gen.locks)) {
      // 슬롯 수가 바뀌어도(예: 4→5) graceful: 길이를 SLOT_DEFS 에 맞춰 보정
      const slots = SLOT_DEFS.map((_, i) => Number(p.gen.slots[i]) || 0)
      const locks = SLOT_DEFS.map((_, i) => !!p.gen.locks[i])
      s.gen = { slots, locks }
    }
    if (payloadTone && !p.tone) s.tone = payloadTone
    return s
  } catch { return emptyState() }
}

function escHtml(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

// 항목이 현재 톤에서 보이는지
function itemVisible(it: Item, tone: ToneKey): boolean {
  if (tone === 'all') return true
  if (!it.tones || it.tones.length === 0) return true
  return it.tones.includes(tone)
}

export default function ActionTropes({ payload }: { payload?: Record<string, unknown> }) {
  const payloadTone = (() => {
    const g = payload?.genre
    // payload.genre 가 우리 장르일 때만 기본 톤 추정에 활용(여기선 전체 유지가 무난)
    return typeof g === 'string' && g.includes('전쟁') ? 'all' as ToneKey : undefined
  })()
  const init = useRef(loadState(payloadTone))
  const [state, setState] = useState<Persisted>(init.current)
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const [editNote, setEditNote] = useState<string | null>(null) // 메모 펼친 항목 id
  const mounted = useRef(true)
  const flashTimer = useRef<number | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; if (flashTimer.current) { clearTimeout(flashTimer.current); flashTimer.current = null } }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 진행 상황이 사라질 수 있어요.') }
  }, [state])

  const toast = (msg: string) => {
    setFlash(msg)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { if (mounted.current) setFlash('') }, 1800)
  }

  const tone = state.tone
  const td = toneDef(tone)
  const search = state.search.trim().toLowerCase()

  // 현재 보이는 항목(톤 + 검색) 계산
  const view = CATS.map((cat) => {
    const items = cat.items
      .map((it, idx) => ({ it, id: itemId(cat.id, idx) }))
      .filter(({ it }) => itemVisible(it, tone))
      .filter(({ it }) => !search || it.q.toLowerCase().includes(search) || (it.trick || '').toLowerCase().includes(search) || KIND_META[it.kind].label.includes(search))
    const done = items.filter(({ id }) => state.checked[id]).length
    return { cat, items, total: items.length, done }
  })
  const totalItems = view.reduce((a, v) => a + v.total, 0)
  const totalDone = view.reduce((a, v) => a + v.done, 0)
  const totalPct = totalItems ? Math.round((totalDone / totalItems) * 100) : 0

  // kind 별 카운트(보이는 항목 기준)
  const kindCount: Record<Kind, { total: number; done: number }> = { expect: { total: 0, done: 0 }, must: { total: 0, done: 0 }, pitfall: { total: 0, done: 0 }, cliche: { total: 0, done: 0 } }
  view.forEach((v) => v.items.forEach(({ it, id }) => { kindCount[it.kind].total++; if (state.checked[id]) kindCount[it.kind].done++ }))

  const setS = (patch: Partial<Persisted>) => setState((s) => ({ ...s, ...patch }))
  const toggle = (id: string) => setState((s) => ({ ...s, checked: { ...s.checked, [id]: !s.checked[id] } }))
  const toggleCollapse = (catId: string) => setState((s) => ({ ...s, collapsed: { ...s.collapsed, [catId]: !s.collapsed[catId] } }))
  const setItemNote = (id: string, val: string) => setState((s) => ({ ...s, notes: { ...s.notes, [id]: val } }))
  const resetAll = () => setState((s) => ({ ...s, checked: {} }))

  // ── 클리셰 비틀기 생성기 (SLOT_DEFS 기반: 슬롯/풀을 바꾸면 자동 반영) ──
  const combos = SLOT_DEFS.reduce((a, d) => a * d.pool.length, 1)
  const ensureGen = (s: Persisted): NonNullable<Persisted['gen']> => s.gen || { slots: SLOT_DEFS.map(() => 0), locks: SLOT_DEFS.map(() => false) }
  const rng = (max: number) => Math.floor(Math.random() * max)
  const regen = () => setState((s) => {
    const gg = ensureGen(s)
    const slots = SLOT_DEFS.map((d, i) => (gg.locks[i] ? (gg.slots[i] || 0) : rng(d.pool.length)))
    return { ...s, gen: { slots, locks: gg.locks } }
  })
  const toggleLock = (i: number) => setState((s) => {
    const gg = ensureGen(s)
    const locks = gg.locks.slice()
    locks[i] = !locks[i]
    return { ...s, gen: { slots: gg.slots, locks } }
  })
  const g = state.gen
  const slotVal = (i: number): string => (g ? (SLOT_DEFS[i].pool[g.slots[i]] || '') : '')
  const genText = (): string => {
    if (!g) return ''
    return SLOT_DEFS.map((d, i) => `${d.label}: ${slotVal(i)}`).join('\n')
  }
  const genSnippetText = (): string => {
    if (!g) return ''
    // 조사 을/를·은/는 은 앞 글자 받침을 보고 헬퍼로 하나만 골라 붙인다(괄호 이중표기 금지).
    return `[액션·전쟁 비틀기] ${eun('"' + slotVal(0) + '"')} 이렇게 비튼다 — ${slotVal(1)}. ${slotVal(2)}. 이때 걸린 것은 "${slotVal(3)}". 감각: ${slotVal(4)}.`
  }

  // ── 복사 ──
  const copyText = (text: string, okMsg: string) => {
    const done = () => { if (mounted.current) toast(okMsg) }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) toast('복사 실패') }
  }

  // ── 내보내기(텍스트) ──
  const exportText = (): string => {
    const lines: string[] = ['# 액션·전쟁 트로프 점검표', `톤: ${td.label}`, `진행률: ${totalDone}/${totalItems} (${totalPct}%)`, '']
    view.forEach((v) => {
      if (v.total === 0) return
      lines.push(`## ${v.cat.icon} ${v.cat.name}  [${v.done}/${v.total}]`)
      v.items.forEach(({ it, id }) => {
        const km = KIND_META[it.kind]
        lines.push(`- [${state.checked[id] ? 'x' : ' '}] (${km.label}) ${it.q}`)
        if (it.trick) lines.push(`    ↳ 비틀기: ${it.trick}`)
        const n = (state.notes[id] || '').trim()
        if (n) lines.push(`    ✎ ${n}`)
      })
      lines.push('')
    })
    if (g) { lines.push('## ♻️ 생성된 비틀기 아이디어', genText(), '') }
    return lines.join('\n').trim()
  }

  // ── 프로젝트 연계: '기획' 폴더 문서로 추가 ──
  const toBodyHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><strong>톤:</strong> ${escHtml(td.icon + ' ' + td.label)} — ${escHtml(td.blurb)}</p>`)
    parts.push(`<p><strong>진행률:</strong> ${totalDone}/${totalItems} (${totalPct}%)</p>`)
    KIND_ORDER.forEach((k) => { const c = kindCount[k]; if (c.total) parts.push(`<p>${escHtml(KIND_META[k].icon + ' ' + KIND_META[k].label)}: ${c.done}/${c.total}</p>`) })
    view.forEach((v) => {
      if (v.total === 0) return
      parts.push(`<h3>${escHtml(v.cat.icon + ' ' + v.cat.name)} [${v.done}/${v.total}]</h3>`)
      v.items.forEach(({ it, id }) => {
        const mark = state.checked[id] ? '☑' : '☐'
        parts.push(`<p>${mark} <b>[${escHtml(KIND_META[it.kind].label)}]</b> ${escHtml(it.q)}</p>`)
        if (it.trick) parts.push(`<p style="margin-left:16px;color:#888">↳ 비틀기: ${escHtml(it.trick)}</p>`)
        const n = (state.notes[id] || '').trim()
        if (n) parts.push(`<p style="margin-left:16px">✎ ${escHtml(n)}</p>`)
      })
    })
    if (g) {
      parts.push('<h3>♻️ 생성된 비틀기 아이디어</h3>')
      parts.push(`<p>${escHtml(genSnippetText())}</p>`)
    }
    return parts.join('')
  }
  const toProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '기획',
      title: `액션·전쟁 트로프 점검 (${totalDone}/${totalItems})`,
      bodyHtml: toBodyHtml(),
      synopsis: `톤: ${td.label} · 진행률 ${totalDone}/${totalItems} (${totalPct}%)`,
      meta: { 장르: '액션·전쟁', 톤: td.label, 진행률: `${totalDone}/${totalItems} (${totalPct}%)`, ...Object.fromEntries(KIND_ORDER.map((k) => [KIND_META[k].label, `${kindCount[k].done}/${kindCount[k].total}`])) },
    })
    toast(id ? `프로젝트 '기획' 폴더에 점검표를 추가했어요 (${totalDone}/${totalItems})` : '프로젝트에 연결되지 않았습니다')
  }
  const genToLibrary = () => {
    if (!g) return
    addToLibrary('snippets', { text: genSnippetText(), source: '액션·전쟁 트로프 점검표', tags: ['액션·전쟁', '비틀기', '글감'] })
    toast('글감 라이브러리에 비틀기 아이디어를 담았어요')
  }
  const genToProject = () => {
    if (!g) return
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '기획',
      title: `비틀기 아이디어 — ${slotVal(0)}`,
      bodyHtml: `<p>${escHtml(genSnippetText())}</p>`,
      synopsis: genSnippetText().slice(0, 80),
      meta: { 장르: '액션·전쟁', 종류: '클리셰 비틀기' },
    })
    toast(id ? "프로젝트 '기획' 폴더에 비틀기 아이디어를 추가했어요" : '프로젝트에 연결되지 않았습니다')
  }

  // ─── 스타일 ───
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)', fontSize: 14 }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const bar = (h = 8): React.CSSProperties => ({ height: h, borderRadius: 99, background: 'var(--chrome-2)', border: '1px solid var(--border)', overflow: 'hidden', flex: 1, minWidth: 0 })
  const fill = (pct: number): React.CSSProperties => ({ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--ok)' : 'var(--accent)', transition: 'width .25s ease' })
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }
  const stHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', userSelect: 'none', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }
  const input: React.CSSProperties = { width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const pill = (active: boolean): React.CSSProperties => ({ borderColor: active ? 'var(--accent)' : 'var(--border)', background: active ? 'var(--accent)' : undefined, color: active ? '#fff' : undefined })

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }}><Emoji e="⚔️" /> 액션·전쟁 트로프 점검표</span>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{flash}</span>}
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge() || totalItems === 0} title={hasProjectBridge() ? "현재 점검 상태를 프로젝트 '기획' 폴더 문서로 추가" : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
        <button className="minibtn" onClick={() => copyText(exportText(), `점검표를 복사했어요 (${totalDone}/${totalItems})`)} disabled={totalItems === 0} title="점검표를 텍스트로 복사"><Emoji e="📋" /> 내보내기</button>
        <button className="minibtn" onClick={resetAll} disabled={totalDone === 0} title="모든 체크 해제">↺ 전체 해제</button>
      </div>

      {/* 톤 프리셋 */}
      <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, color: 'var(--muted)', marginRight: 2 }}>톤 프리셋</span>
          {TONES.map((t) => (
            <button key={t.key} className="minibtn" style={pill(tone === t.key)} onClick={() => setS({ tone: t.key })} title={t.blurb}><Emoji e={t.icon} /> {t.label}</button>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6, lineHeight: 1.55 }}>
          {td.blurb}{td.refs && <span style={{ display: 'block', marginTop: 2, opacity: 0.85 }}>계보: {td.refs}</span>}
        </div>
      </div>

      {/* 검색 + 전체 진행률 */}
      <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
        <input style={{ ...input, width: 180, flex: '0 1 200px' }} value={state.search} onChange={(e) => setS({ search: e.target.value })} placeholder="🔍 항목 검색…" aria-label="항목 검색" />
        <div style={bar()}><div style={fill(totalPct)} /></div>
        <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, color: totalPct >= 100 && totalItems > 0 ? 'var(--ok)' : 'var(--text)' }}>{totalDone}/{totalItems} · {totalPct}%</span>
      </div>

      {/* kind 요약 칩 */}
      <div style={{ padding: '6px 14px 0', display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
        {KIND_ORDER.map((k) => {
          const c = kindCount[k]; const m = KIND_META[k]
          return (
            <span key={k} style={{ fontSize: 11.5, padding: '2px 8px', borderRadius: 99, border: `1px solid ${m.color}`, color: m.color, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
              <Emoji e={m.icon} /> {m.label} {c.done}/{c.total}
            </span>
          )
        })}
      </div>

      {note && <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--warn)' }}>{note}</div>}

      <div style={body}>
        {totalItems === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: 24 }}>
            검색·톤 조건에 맞는 항목이 없어요.<br />검색어를 지우거나 톤을 <b>전체</b>로 바꿔 보세요.
          </div>
        )}

        {view.map(({ cat, items, total, done }) => {
          if (total === 0) return null
          const pct = total ? Math.round((done / total) * 100) : 0
          const open = !state.collapsed[cat.id]
          return (
            <div key={cat.id} style={card}>
              <div style={stHead} onClick={() => toggleCollapse(cat.id)}>
                <span style={{ fontSize: 11, color: 'var(--muted)', width: 12, flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
                <span style={{ fontSize: 16, flexShrink: 0 }}><Emoji e={cat.icon} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{cat.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.desc}</div>
                </div>
                <div style={{ width: 84, flexShrink: 0 }}><div style={bar(6)}><div style={fill(pct)} /></div></div>
                <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, width: 52, textAlign: 'right', color: pct >= 100 ? 'var(--ok)' : 'var(--muted)' }}>{done}/{total}</span>
              </div>

              {open && (
                <div>
                  {items.map(({ it, id }) => {
                    const checked = !!state.checked[id]
                    const km = KIND_META[it.kind]
                    const noteVal = state.notes[id] || ''
                    const noteOpen = editNote === id
                    return (
                      <div key={id} style={{ borderTop: '1px solid var(--border)', padding: '9px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                          <input type="checkbox" checked={checked} onChange={() => toggle(id)} style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, cursor: 'pointer', accentColor: km.color }} aria-label={it.q} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 10.5, padding: '1px 6px', borderRadius: 99, border: `1px solid ${km.color}`, color: km.color, flexShrink: 0 }}><Emoji e={km.icon} /> {km.label}</span>
                            </div>
                            <span onClick={() => toggle(id)} style={{ fontSize: 13.5, lineHeight: 1.5, cursor: 'pointer', wordBreak: 'break-word', display: 'block', color: checked ? 'var(--muted)' : 'var(--text)', textDecoration: checked ? 'line-through' : 'none' }}>{it.q}</span>
                            {it.trick && (
                              <div style={{ marginTop: 5, padding: '6px 9px', borderRadius: 8, background: 'var(--chrome-2)', borderLeft: '3px solid #a06bd4', fontSize: 12, lineHeight: 1.5, color: 'var(--text)' }}>
                                <b style={{ color: '#a06bd4' }}>비틀기</b> {it.trick}
                              </div>
                            )}
                            {noteOpen ? (
                              <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                                <input style={{ ...input, flex: 1 }} value={noteVal} autoFocus onChange={(e) => setItemNote(id, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditNote(null) }} placeholder="이 항목에 대한 내 메모…" maxLength={300} />
                                <button className="minibtn" onClick={() => setEditNote(null)}>완료</button>
                              </div>
                            ) : noteVal.trim() ? (
                              <div onClick={() => setEditNote(id)} style={{ marginTop: 5, fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }} title="메모 수정">✎ {noteVal}</div>
                            ) : null}
                          </div>
                          {!noteOpen && (
                            <button className="minibtn" style={{ padding: '2px 7px', fontSize: 11, flexShrink: 0 }} onClick={() => setEditNote(id)} title="메모">✎</button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* ── 클리셰 비틀기 생성기 ── */}
        <div style={card}>
          <div style={{ ...stHead, cursor: 'default' }}>
            <span style={{ fontSize: 16 }}><Emoji e="♻️" /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>클리셰 → 비틀기 생성기</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>슬롯을 잠그고 재생성 · 조합 <b style={{ color: 'var(--accent)' }}>{fmtCount(combos)}</b>가지 ({combos.toLocaleString('ko-KR')})</div>
            </div>
            <button className="btn-primary" onClick={regen}><Emoji e="🎲" /> 생성</button>
          </div>
          <div style={{ padding: 12 }}>
            {!g ? (
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, textAlign: 'center', padding: '14px 8px' }}>
                상투적 액션·전쟁 장면을 신선하게 비틀 단서를 만듭니다.<br />
                위 <b><Emoji e="🎲" /> 생성</b>을 눌러 클리셰·비틀기·페이싱 초점·걸린 것을 조합해 보세요.
              </div>
            ) : (
              <>
                {SLOT_DEFS.map((d, i) => (
                  <GenSlot key={i} label={d.label} icon={d.icon} value={slotVal(i)} locked={!!g.locks[i]} onLock={() => toggleLock(i)} />
                ))}
                <div style={{ marginTop: 8, padding: '9px 11px', borderRadius: 9, background: 'var(--chrome-2)', border: '1px solid var(--accent)', fontSize: 12.5, lineHeight: 1.6 }}>
                  {genSnippetText()}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <button className="minibtn" onClick={regen}><Emoji e="🎲" /> 재생성</button>
                  <button className="minibtn" onClick={() => copyText(genSnippetText(), '비틀기 아이디어 복사됨')}><Emoji e="📋" /> 복사</button>
                  <span style={{ flex: 1 }} />
                  <button className="linkbtn" onClick={genToLibrary} title="비틀기 아이디어를 글감 라이브러리에 담기"><Emoji e="📥" /> 글감에 담기</button>
                  <button className="linkbtn" onClick={genToProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? "프로젝트 '기획' 폴더에 추가" : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 관련 도구 연계 */}
        <div className="linkbar" style={{ paddingTop: 2 }}>
          <span className="linkbar-label">관련 도구:</span>
          <button className="linkbtn" onClick={() => openToolLinked('conflict-builder', { genre: '액션·전쟁' })} title="갈등 설계기 열기"><Emoji e="⚔️" /> 갈등 설계기</button>
          <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre: '액션·전쟁' })} title="플롯 피라미드 열기"><Emoji e="🎢" /> 플롯 피라미드</button>
          <button className="linkbtn" onClick={() => openToolLinked('scene-forge', { genre: '액션·전쟁' })} title="장면 설계 열기"><Emoji e="🎬" /> 장면 설계</button>
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.65, paddingBottom: 6 }}>
          항목을 눌러 체크하고 머리글로 펼치거나 접으세요. 톤 프리셋을 바꾸면 해당 톤에 중요한 항목만 보여요.
          답이 망설여지는 함정·클리셰 항목이 곧 보강할 지점입니다. 모든 상태는 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}

// ── 생성기 슬롯 한 줄 ──
function GenSlot(props: { label: string; icon: string; value: string; locked: boolean; onLock: () => void }) {
  const { label, icon, value, locked, onLock } = props
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0' }}>
      <button
        className="minibtn"
        onClick={onLock}
        title={locked ? '잠금 해제(재생성에 포함)' : '잠금(재생성해도 고정)'}
        style={{ flexShrink: 0, padding: '3px 8px', borderColor: locked ? 'var(--accent)' : 'var(--border)', background: locked ? 'var(--accent)' : undefined, color: locked ? '#fff' : undefined }}
      >{locked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, color: 'var(--muted)', marginBottom: 2 }}><Emoji e={icon} /> {label}</div>
        <div style={{ fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word' }}>{value}</div>
      </div>
    </div>
  )
}
