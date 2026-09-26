// 판타지 플롯·진행곡선(로직) — 판타지 장르의 표준 구조/비트와 페이싱을 "단계 입력 시트"로 채우는 도구.
//   - 4가지 판타지 전용 플롯 템플릿(하이판타지 영웅서사 / 하이판타지 다중POV 서사시 / 웹소설 연재형 사이다곡선 / 로판 회빙환)
//   - 각 비트에 도시에 근거한 판타지 특화 안내(마법 규칙·예언·봉인된 악·시스템창·사이다/고구마·악역영애 등)
//   - 비트마다 내용 작성 + 긴장도(0~10) 조절 → 진행곡선(SVG) 자동 갱신 + 진행률 표시
//   - 템플릿/비트 배치 조합수 표시(1조 이상)
//   - 프로젝트 연동: 자료 › "구조" 폴더에 플롯 설계 문서로 추가, 관련 도구(영웅의 여정/플롯 피라미드 등) 열기
// 자급식: react / './linkbus' 외 import 없음. 전부 로컬. localStorage 'sry:tool:genre-plotlogic' 자동 저장/복원.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = { id: 'genre-plotlogic', name: '판타지 플롯·진행곡선', icon: '🐉', group: '플롯', genre: '판타지', intro: '판타지 표준 구조와 비트·페이싱을 단계 시트로 채우고 긴장 곡선을 그려보세요', w: 720, h: 640 }

const LS_KEY = 'sry:tool:genre-plotlogic'

// ── 타입 ─────────────────────────────────────────────────
interface BeatDef {
  key: string
  no: number
  title: string
  act: string          // 막/구획 라벨
  emoji: string
  hint: string         // 도시에 근거한 판타지 특화 작성 안내(placeholder/툴팁)
  pace: string         // 페이싱 지침
  curve: number        // 기본 긴장도 0~10 (진행곡선 기준선)
}
interface TemplateDef {
  id: string
  name: string
  branch: string       // 하위 분기
  desc: string
  beats: BeatDef[]
}
interface BeatData { text: string; note: string; tension: number; done: boolean }
type BeatStore = Record<string, BeatData>            // beatKey -> data
type AllStore = Record<string, BeatStore>            // templateId -> beatStore

// ── 막 색상(공통) ──────────────────────────────────────────
const ACT_COLORS: string[] = ['#5b8def', '#3fb27f', '#e0533d', '#d99a2b', '#8b6fc4', '#e06c9f']
function actColor(label: string, order: string[]): string {
  const i = order.indexOf(label)
  return ACT_COLORS[(i < 0 ? 0 : i) % ACT_COLORS.length]
}

// ───────────────────────────────────────────────────────────
//  템플릿 1: 하이판타지 영웅 서사 (정통 3막 + 영웅의 여정 판타지 변주)
// ───────────────────────────────────────────────────────────
const T_HERO: TemplateDef = {
  id: 'hero',
  name: '하이판타지 영웅 서사',
  branch: 'High Fantasy · 정통 장편',
  desc: '독립 세계관(Secondary World)에서 평범한 자가 운명·혈통·예언을 짊어지고 세계의 위협에 맞서는 정통 3막 구조. 마법 규칙·멘토·봉인된 악·복선 회수가 핵심.',
  beats: [
    { key: 'h-ordinary', no: 1, title: '결핍의 일상 세계', act: '1막·출발', emoji: '🏡', curve: 2,
      hint: '주인공의 평범한 변방/마을과 결핍(가난·천대·잃은 가족)을 보여주세요. 세계관 정보는 쏟지 말고 생활 속에 한 방울씩(World-building drip).',
      pace: '느리게. 단, 첫 1~2장 안에 "이 세계의 결이 다르다"는 경이감(마법·이종족·풍경)을 한 번 슬쩍 보일 것.' },
    { key: 'h-spark', no: 2, title: '경이의 균열 · 모험의 부름', act: '1막·출발', emoji: '✨', curve: 4,
      hint: '일상을 깨는 초자연적 사건(마법 발현·괴물 습격·전령·예언서). 첫 마법/생물 등장은 연출에 공을 들여 "경이감(Sense of Wonder)"을 줄 것.',
      pace: '여기서 후크가 걸려야 함. 거부(망설임)는 짧게.' },
    { key: 'h-mentor', no: 3, title: '멘토와 마법의 규칙', act: '1막·출발', emoji: '🧙', curve: 4,
      hint: '간달프/덤블도어형 조력자가 등장해 세계와 "마법의 규칙(원천·비용·한계·금기)"을 가르칩니다. 하드매직이라면 여기서 규칙을 명시 — 나중의 복선 회수 기반.',
      pace: '정보 밀도 높음. 강의가 아니라 사건 속에서 배우게 할 것.' },
    { key: 'h-threshold', no: 4, title: '첫 관문 통과', act: '1막·출발', emoji: '🌉', curve: 5,
      hint: '결심하고 미지의 세계(왕도·마탑·국경·던전 입구)로 첫발. 돌아갈 수 없는 선을 넘게 만드세요.',
      pace: '1막 종료. 스케일이 마을→도시/왕국으로 한 단계 확장.' },
    { key: 'h-tests', no: 5, title: '시험·동료·적 · 일행 결성', act: '2막·시련', emoji: '⚔️', curve: 5,
      hint: '퀘스트 여정 속 시험을 거치며 파티(동료)를 모으고 적을 만납니다. 이종족 동료(엘프/드워프/하플링)는 클리셰를 한 번 비틀어 차별화.',
      pace: '에피소드 누적. 작은 승리/패배의 리듬으로 주인공·동료를 입체화.' },
    { key: 'h-power', no: 6, title: '힘의 각성 · 아티팩트 획득', act: '2막·시련', emoji: '🔮', curve: 6,
      hint: '잠재력 개화/진명 습득/마법 아이템 획득. 단, 새 힘에는 반드시 대가·약점·중독성을 부여(샌더슨 제2법칙: 한계가 능력보다 흥미롭다).',
      pace: '성장의 가시화. 다만 너무 빨리 강해지면 긴장이 죽음 — "벽"을 남겨둘 것.' },
    { key: 'h-midpoint', no: 7, title: '중간점 반전 · 적의 실체', act: '2막·시련', emoji: '🌀', curve: 7,
      hint: '봉인된 악/고대의 위협의 정체와 규모가 드러나거나, 멘토·동료의 비밀이 폭로됩니다. 가짜 승리 또는 가짜 패배로 방향 전환.',
      pace: '판을 키우는 지점. 개인의 위기가 왕국/세계의 운명으로 확대되기 시작.' },
    { key: 'h-mentorloss', no: 8, title: '멘토의 퇴장 · 가장 깊은 동굴', act: '2막·시련', emoji: '🕯️', curve: 8,
      hint: '멘토의 죽음/부재로 주인공이 홀로 서야 합니다. 가장 위험한 곳(마왕성·봉인지·심연)으로 접근.',
      pace: '암전 구간. 동료 상실·배신·신뢰 붕괴로 바닥을 찍게.' },
    { key: 'h-ordeal', no: 9, title: '시련의 핵심 · 죽음 같은 패배', act: '2막·시련', emoji: '🔥', curve: 9,
      hint: '죽음에 가장 가까운 최대 위기. 주인공의 본질·신념이 시험받고, 가진 힘이 통하지 않거나 대가를 치릅니다.',
      pace: '2막의 절벽. 여기서 모든 것을 잃은 듯 보여야 부활이 빛남.' },
    { key: 'h-climax', no: 10, title: '최종 결전 · 복선의 일괄 회수', act: '3막·귀환', emoji: '🐲', curve: 10,
      hint: '마왕/대마법사/신과의 최종 대결. 앞서 심은 마법 규칙·아이템·정보·동료가 한꺼번에 회수되어 결정타가 되어야 카타르시스가 큼. 갑툭튀 능력(데우스 엑스 마키나)은 최대 금기.',
      pace: '최고조. 개인 능력+동료 연계+세계관 규칙의 총동원.' },
    { key: 'h-sacrifice', no: 11, title: '희생과 대가 · 부활', act: '3막·귀환', emoji: '⚖️', curve: 7,
      hint: '승리에는 비용을 부과(동료·멘토·힘·세계의 일부 상실). 주인공이 한계를 넘어 거듭나는 변신의 순간.',
      pace: '절정 직후 짧은 하강. 승리의 무게를 느끼게.' },
    { key: 'h-return', no: 12, title: '변화한 귀환 · 새 질서', act: '3막·귀환', emoji: '🌅', curve: 3,
      hint: '변모한 모습으로 돌아와 세계에 이로움(영약)을 가져옵니다. 예언이 예상과 다른 방식으로 성취/전복되면 여운이 깊어집니다.',
      pace: '대단원. 남은 떡밥/세계의 변화로 후속 여지를 남길 수 있음.' },
  ],
}

// ───────────────────────────────────────────────────────────
//  템플릿 2: 하이판타지 다중 POV 서사시 (마틴·조던식)
// ───────────────────────────────────────────────────────────
const T_EPIC: TemplateDef = {
  id: 'epic',
  name: '다중 POV 서사시',
  branch: 'Epic · 정치·전쟁 대하',
  desc: '여러 시점(POV)이 독립 긴장을 갖고 교차하며 수렴하는 대하 서사. "안전한 캐릭터는 없다", 정치 모략·왕좌·예언·상승하는 스케일이 동력.',
  beats: [
    { key: 'e-tapestry', no: 1, title: '세계의 직조 · POV 분산', act: '발단', emoji: '🧵', curve: 3,
      hint: '서로 떨어진 지역의 POV 인물들을 각자의 결핍·야망과 함께 세웁니다. 각 시점이 독자적 이야기로 읽히도록.',
      pace: '느리지만 각 챕터 말미마다 작은 후크. 가계도·왕국·세력 관계를 점진 공개.' },
    { key: 'e-omen', no: 2, title: '불길한 징조 · 고대의 위협', act: '발단', emoji: '🌑', curve: 4,
      hint: '북쪽의 한기/봉인의 균열/오래된 예언 등 "세계를 건 위협"의 씨앗. 정작 인물들은 눈앞의 정치에 매여 이를 무시합니다.',
      pace: '독자만 아는 거대 떡밥. 인물들의 무관심으로 아이러니한 긴장.' },
    { key: 'e-spark', no: 3, title: '발화점 · 질서의 붕괴', act: '상승', emoji: '🗡️', curve: 6,
      hint: '왕의 죽음/배신/계승 분쟁 등 한 사건이 모든 POV를 뒤흔듭니다. 안전해 보이던 인물을 과감히 죽여 "규칙 없음"을 선언.',
      pace: '판이 깨지는 지점. 각 POV가 새 처지로 흩어짐.' },
    { key: 'e-rise', no: 4, title: '세력 다툼 · 동맹과 모략', act: '상승', emoji: '👑', curve: 6,
      hint: '왕국·교단·길드·마탑의 권력 다툼. 결혼동맹·배신·암살·전쟁이 교차합니다. 각 POV의 도덕적 회색지대를 부각.',
      pace: '교차 편집. POV마다 클리프행어를 걸어 페이지터너 유지.' },
    { key: 'e-magic', no: 5, title: '마법/이종족의 귀환', act: '상승', emoji: '🐉', curve: 7,
      hint: '죽었다던 마법·드래곤·이종족·죽은 신이 돌아옵니다. 정치극에 초자연이 끼어들며 판도가 흔들립니다.',
      pace: '경이감 분출 구간. 한 POV를 통해 "세계가 변하고 있다"를 보여줄 것.' },
    { key: 'e-converge', no: 6, title: '시점의 수렴 시작', act: '상승', emoji: '🧲', curve: 8,
      hint: '흩어진 POV들의 운명선이 한 장소/사건으로 모이기 시작. 떨어져 있던 인물이 만나며 전율을 줍니다.',
      pace: '가속. 독자가 줄곧 기다린 교차가 일어나는 보상의 구간.' },
    { key: 'e-crucible', no: 7, title: '대회전 · 도가니', act: '절정', emoji: '⚔️', curve: 10,
      hint: '대전투/대공성/대의식이 모든 진영을 갈아 넣습니다. 외부의 고대 위협과 내부 정치가 충돌하며 다수 POV의 운명이 결판납니다.',
      pace: '최고조. 여러 POV의 절정을 교차로 엮어 합주처럼.' },
    { key: 'e-cost', no: 8, title: '값비싼 대가 · 권좌의 향방', act: '하강', emoji: '🥀', curve: 6,
      hint: '승자도 잃는 것이 많습니다. 권좌·영토·신념의 재편. 살아남은 POV들의 변화를 정리.',
      pace: '긴장 완화. 그러나 한 POV에는 다음 막의 불씨를 남김.' },
    { key: 'e-newworld', no: 9, title: '새로운 세계 질서 · 미회수 떡밥', act: '대단원', emoji: '🌍', curve: 4,
      hint: '재편된 세계와 변모한 인물들. 거대 떡밥의 일부만 회수하고 나머지는 다음 권으로. 예언의 진의가 새롭게 비틀립니다.',
      pace: '대하 특성상 완전 종결보다 "한 막의 마침". 다음을 부르는 여운.' },
  ],
}

// ───────────────────────────────────────────────────────────
//  템플릿 3: 웹소설 연재형 사이다 곡선 (헌터·이세계·시스템물)
// ───────────────────────────────────────────────────────────
const T_WEB: TemplateDef = {
  id: 'web',
  name: '웹소설 연재형 사이다 곡선',
  branch: 'Web Novel · 헌터/이세계/시스템',
  desc: '게이트·던전·시스템창과 회빙환(회귀·빙의·환생)을 엔진으로, 회차 단위의 고구마(답답함)→사이다(역전)를 반복해 누적 성장으로 최강에 이르는 연재형 곡선.',
  beats: [
    { key: 'w-bottom', no: 1, title: '바닥 · 무시당하는 약자', act: '도입·골든타임', emoji: '🪨', curve: 3,
      hint: '최약체 각성자/버림받은 막내/E급 헌터 등 천대받는 처지(고구마)를 빠르게 제시. 차별점(전생기억·숨은 재능)도 함께 깔아둘 것.',
      pace: '초반 1~5화 골든타임. 늘어지면 이탈. 결핍과 무시를 압축적으로.' },
    { key: 'w-trigger', no: 2, title: '트리거 · 회귀/각성/시스템 개안', act: '도입·골든타임', emoji: '🌀', curve: 6,
      hint: '죽음 직전 회귀/빙의/시스템 메시지 각성. "이번 생은 다르게 살겠다"는 선언과 함께 정보 우위(미래지식·유니크 스킬)를 획득.',
      pace: '3~5화 내 첫 후크의 핵심. 즉시 변화의 약속을 보여줄 것.' },
    { key: 'w-firstcider', no: 3, title: '첫 사이다 · 통쾌한 역전', act: '도입·골든타임', emoji: '🥤', curve: 7,
      hint: '자신을 무시하던 자(가족·길드·동기) 앞에서 첫 실력 입증/응징. 독자에게 "이 작품은 시원하다"를 각인.',
      pace: '5화 안에 최소 1회의 카타르시스. 이게 연독률을 좌우.' },
    { key: 'w-system', no: 4, title: '성장 루프 정착 · 스탯/스킬/등급', act: '전개·누적', emoji: '📊', curve: 5,
      hint: '시스템창(레벨·스탯·스킬·퀘스트·상점)으로 성장을 수치화. 사냥/던전/시험으로 가시적 보상 루프를 만듭니다.',
      pace: '회차마다 작은 성취. 성장의 가시화가 곧 보상.' },
    { key: 'w-episode', no: 5, title: '에피소드 누적 · 던전/토너먼트', act: '전개·누적', emoji: '🏟️', curve: 6,
      hint: '레이드·게이트 공략·랭킹전·토너먼트 등 단위 에피소드의 연쇄. 각 에피소드 안에 작은 고구마→사이다를 내장.',
      pace: '매 화 끝 클리프행어. 위에 거대 떡밥(흑막·세계 위기)을 천천히 적층.' },
    { key: 'w-rival', no: 6, title: '벽과 라이벌 · 첫 큰 패배/굴욕', act: '위기·고구마', emoji: '🧱', curve: 8,
      hint: '파워 인플레 관리: 더 강한 적/세력/규격 외 존재 앞에서 처음으로 막힙니다(큰 고구마). 소중한 것을 잃을 수도.',
      pace: '의도적 답답함 축적. 다음 사이다의 낙폭을 키우는 구간.' },
    { key: 'w-breakthrough', no: 7, title: '돌파 · 히든피스/각성2', act: '위기·고구마', emoji: '💥', curve: 7,
      hint: '히든 클래스/봉인 해제/2차 각성/숨겨둔 떡밥 회수로 벽을 깹니다. 회빙환의 정보 우위가 결정적으로 작동.',
      pace: '눌렸던 만큼 시원하게. 단, 새 힘에도 다음 벽을 예고.' },
    { key: 'w-bigcider', no: 8, title: '대형 사이다 · 흑막 응징', act: '절정', emoji: '⚡', curve: 10,
      hint: '그동안 쌓인 모든 굴욕·떡밥을 한 번에 응징·회수하는 압도적 역전. 흑막/거대 세력을 박살내고 위상이 도약합니다.',
      pace: '아크 최고조. 누적된 카타르시스의 폭발.' },
    { key: 'w-apex', no: 9, title: '정점 · 랭킹/세계 최강 등극', act: '귀결', emoji: '👑', curve: 5,
      hint: '세계 1위·최강·전설 반열에 오르며 위상이 재정의됩니다. 다음 아크의 더 큰 무대(차원·신·외신)를 예고.',
      pace: '아크 종결 + 다음 떡밥. 연재 동력 유지를 위해 새 목표를 던질 것.' },
  ],
}

// ───────────────────────────────────────────────────────────
//  템플릿 4: 로맨스 판타지 회빙환 (악역영애·원작 빙의)
// ───────────────────────────────────────────────────────────
const T_ROFAN: TemplateDef = {
  id: 'rofan',
  name: '로판 회빙환 곡선',
  branch: 'Romance Fantasy · 황실/귀족',
  desc: '소설·게임 속 악역/조연으로 회귀·빙의·환생해, 정해진 파멸 플래그를 회피하며 황실·귀족 정치와 로맨스를 함께 풀어가는 여성향 곡선.',
  beats: [
    { key: 'r-awaken', no: 1, title: '빙의/회귀 자각 · 원작 인지', act: '도입', emoji: '📖', curve: 4,
      hint: '"원작에선 죽는 악역영애였다" — 빙의/회귀를 자각하고 자신의 처지와 정해진 파멸 결말(파혼·처형·몰락)을 파악합니다.',
      pace: '메타 인지를 빠르게. 독자가 "어떻게 운명을 바꿀까"를 궁금해하게.' },
    { key: 'r-flag', no: 2, title: '파멸 플래그 회피 전략', act: '도입', emoji: '🚩', curve: 5,
      hint: '원작 지식을 무기로 파멸을 피할 계획을 세웁니다(약혼 파기 유도·후원자 확보·사업/마법 재능 활용). 정보 우위가 매력의 핵심.',
      pace: '주도권을 쥔 영리한 행동으로 첫 사이다. 수동적이지 않게.' },
    { key: 'r-male', no: 3, title: '남주 등장 · 차갑지만 나에게만', act: '전개', emoji: '🌹', curve: 6,
      hint: '냉정한 황태자/공작/기사단장 등 남주와 얽힙니다. "남에겐 차갑지만 나에게만 다정"의 균열을 서서히. 첫 접점은 오해/사건으로.',
      pace: '설렘 비트 삽입. 정치 라인과 로맨스 라인을 교차.' },
    { key: 'r-court', no: 4, title: '황실/사교계 정치 · 견제', act: '전개', emoji: '🏛️', curve: 6,
      hint: '원작 여주·악녀·정적·가문의 견제와 음모. 사교계·황실 권력 구도 안에서 위기를 영리하게 받아칩니다.',
      pace: '고구마(모함)→사이다(반박/역공)의 리듬. 회차마다 통쾌한 한 방.' },
    { key: 'r-deepen', no: 5, title: '관계 심화 · 진심의 확인', act: '전개', emoji: '💞', curve: 7,
      hint: '남주와의 신뢰·애정이 깊어지고, 변해버린 원작 전개에 마음이 흔들립니다. 빙의 사실/비밀에 대한 갈등이 싹틉니다.',
      pace: '감정 고조. 관계의 장애물(신분·약혼·오해)을 하나 세울 것.' },
    { key: 'r-crisis', no: 6, title: '최대 위기 · 정체 폭로/배신', act: '위기', emoji: '🥀', curve: 9,
      hint: '비밀(빙의·과거·혈통) 폭로, 누명, 정략 결혼 강요, 남주와의 오해 등 가장 깊은 위기. 파멸 플래그가 다른 모습으로 되살아납니다.',
      pace: '암전 구간. 의도적 고구마를 길게 쌓아 절정의 해소를 키움.' },
    { key: 'r-turn', no: 7, title: '반격 · 정적 응징/누명 해소', act: '절정', emoji: '⚖️', curve: 10,
      hint: '쌓인 음모와 정적을 한 번에 무너뜨리고 누명을 벗습니다. 남주와의 오해도 풀리며 관계가 결정적으로 도약.',
      pace: '대형 사이다 + 로맨스 절정의 동시 해소.' },
    { key: 'r-ending', no: 8, title: '해피엔딩 · 새 운명', act: '대단원', emoji: '👑', curve: 4,
      hint: '원작과 전혀 다른 결말 — 파혼/이혼 후 더 잘되거나, 남주와 맺어져 자신만의 운명을 완성합니다.',
      pace: '여운 있는 마무리. 후일담/번외 떡밥을 남길 수 있음.' },
  ],
}

const TEMPLATES: TemplateDef[] = [T_HERO, T_EPIC, T_WEB, T_ROFAN]
const TPL_MAP: Record<string, TemplateDef> = TEMPLATES.reduce((m, t) => { m[t.id] = t; return m }, {} as Record<string, TemplateDef>)

// 조합수(표시용): 각 비트는 [채움여부 × 긴장도 11단계 × 완료여부] = 비트당 약 2×11×2 = 44 상태.
// 가장 큰 템플릿(영웅 12비트)의 설계 상태수 = 44^12 ≈ 1.3 × 10^19 (1300경) — 1조를 크게 상회.
function combinationsOf(t: TemplateDef): number {
  return Math.pow(44, t.beats.length)
}
function fmtBig(n: number): string {
  // 한국식 큰 단위 근사 표기
  const units: [number, string][] = [
    [1e16, '경'], [1e12, '조'], [1e8, '억'], [1e4, '만'],
  ]
  for (const [v, u] of units) {
    if (n >= v) {
      const q = n / v
      return (q >= 100 ? Math.round(q).toLocaleString() : q.toFixed(1)) + u + ' 가지'
    }
  }
  return Math.round(n).toLocaleString() + ' 가지'
}

// ── 저장/복원 ──────────────────────────────────────────────
function emptyBeatStore(t: TemplateDef): BeatStore {
  const o: BeatStore = {}
  for (const b of t.beats) o[b.key] = { text: '', note: '', tension: b.curve, done: false }
  return o
}
function emptyAll(): AllStore {
  const o: AllStore = {}
  for (const t of TEMPLATES) o[t.id] = emptyBeatStore(t)
  return o
}
function clampT(n: unknown, fallback: number): number {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return fallback
  return Math.min(10, Math.max(0, v))
}
function loadAll(): { store: AllStore; tpl: string } {
  const base = emptyAll()
  let tpl = TEMPLATES[0].id
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { store: base, tpl }
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      if (typeof parsed.tpl === 'string' && TPL_MAP[parsed.tpl]) tpl = parsed.tpl
      const ps = parsed.store
      if (ps && typeof ps === 'object') {
        for (const t of TEMPLATES) {
          const tb = ps[t.id]
          if (tb && typeof tb === 'object') {
            for (const b of t.beats) {
              const v = tb[b.key]
              if (v && typeof v === 'object') {
                base[t.id][b.key] = {
                  text: typeof v.text === 'string' ? v.text : '',
                  note: typeof v.note === 'string' ? v.note : '',
                  tension: clampT(v.tension, b.curve),
                  done: !!v.done,
                }
              }
            }
          }
        }
      }
    }
  } catch { /* noop */ }
  return { store: base, tpl }
}

// ── 컴포넌트 ───────────────────────────────────────────────
export default function GenrePlotLogic({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadAll())
  const [store, setStore] = useState<AllStore>(init.current.store)
  const [tplId, setTplId] = useState<string>(init.current.tpl)
  const [active, setActive] = useState<string | null>(null)   // 편집 중 beatKey
  const [note, setNote] = useState('')
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editRef = useRef<HTMLTextAreaElement>(null)

  // payload.genre 맥락(장르 도구함에서 열림) — 배지로만 활용
  const genreCtx = payload && typeof payload.genre === 'string' ? String(payload.genre).trim() : ''
  // payload.template 로 특정 템플릿 지정 가능(연계 진입)
  useEffect(() => {
    const pt = payload && typeof payload.template === 'string' ? String(payload.template) : ''
    if (pt && TPL_MAP[pt]) setTplId(pt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
  }, [])

  // 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ store, tpl: tplId }))
    } catch {
      if (mounted.current) flash('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.', true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, tplId])

  // 편집 패널 포커스
  useEffect(() => {
    if (active && editRef.current) { try { editRef.current.focus() } catch { /* noop */ } }
  }, [active])

  const flash = (msg: string, warn = false) => {
    if (!mounted.current) return
    setNote((warn ? '⚠️ ' : '') + msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2800)
  }

  const tpl = TPL_MAP[tplId]
  const beats = tpl.beats
  const bstore = store[tplId]
  const actOrder = Array.from(new Set(beats.map((b) => b.act)))

  const setField = (key: string, field: keyof BeatData, value: string | boolean | number) => {
    setStore((prev) => ({
      ...prev,
      [tplId]: { ...prev[tplId], [key]: { ...prev[tplId][key], [field]: value } },
    }))
  }
  const toggleDone = (key: string) => setField(key, 'done', !bstore[key].done)
  const clearBeat = (key: string) => {
    const def = beats.find((b) => b.key === key)!
    setStore((prev) => ({
      ...prev,
      [tplId]: { ...prev[tplId], [key]: { text: '', note: '', tension: def.curve, done: false } },
    }))
  }
  const resetTpl = () => {
    if (filled === 0 && doneCount === 0) return
    if (typeof window !== 'undefined' && !window.confirm(`'${tpl.name}' 템플릿의 모든 비트 내용을 비웁니다. 계속할까요?`)) return
    setStore((prev) => ({ ...prev, [tplId]: emptyBeatStore(tpl) }))
    setActive(null)
    flash('이 템플릿의 모든 비트를 비웠습니다.')
  }

  const filled = beats.filter((b) => bstore[b.key].text.trim()).length
  const doneCount = beats.filter((b) => bstore[b.key].done).length
  const pct = Math.round((filled / beats.length) * 100)

  // ── 내보내기 텍스트/HTML ───────────────────────────────────
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const escMl = (s: string) => esc(s).replace(/\n/g, '<br/>')

  const buildText = () => {
    const lines: string[] = [
      `# 판타지 플롯·진행곡선 — ${tpl.name}`,
      `분기: ${tpl.branch}`,
      `진행: ${filled}/${beats.length} 비트 작성 · 완료 ${doneCount}개`,
      '', tpl.desc, '',
    ]
    let lastAct = ''
    for (const b of beats) {
      if (b.act !== lastAct) { lines.push(`## ${b.act}`); lastAct = b.act }
      const d = bstore[b.key]
      lines.push(`${d.done ? '✅' : '⬜'} ${b.no}. ${b.title}  [긴장도 ${d.tension}/10]`)
      lines.push(`   - 내용: ${d.text.trim() || '(미작성)'}`)
      lines.push(`   - 페이싱: ${b.pace}`)
      if (d.note.trim()) lines.push(`   - 메모: ${d.note.trim()}`)
      lines.push('')
    }
    return lines.join('\n').trimEnd() + '\n'
  }
  const buildHtml = () => {
    const parts: string[] = [
      `<p><strong>판타지 플롯·진행곡선 — ${esc(tpl.name)}</strong></p>`,
      `<p>분기: ${esc(tpl.branch)} · 작성 ${filled}/${beats.length} 비트 · 완료 ${doneCount}개</p>`,
      `<p><em>${esc(tpl.desc)}</em></p>`,
    ]
    let lastAct = ''
    for (const b of beats) {
      if (b.act !== lastAct) { parts.push(`<h2>${esc(b.act)}</h2>`); lastAct = b.act }
      const d = bstore[b.key]
      parts.push(`<h3>${d.done ? '✅ ' : ''}${b.no}. ${esc(b.title)} <small>[긴장도 ${d.tension}/10]</small></h3>`)
      const txt = d.text.trim()
      parts.push(`<p>${txt ? escMl(txt) : '<em>(미작성)</em>'}</p>`)
      parts.push(`<p>⏱️ <em>${esc(b.pace)}</em></p>`)
      if (d.note.trim()) parts.push(`<p>📝 ${escMl(d.note.trim())}</p>`)
    }
    return parts.join('')
  }

  const copyAll = async () => {
    const text = buildText()
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text); flash('전체 내용을 클립보드에 복사했어요.'); return
      }
    } catch { /* noop */ }
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.focus(); ta.select()
      const ok = document.execCommand('copy'); document.body.removeChild(ta)
      flash(ok ? '전체 내용을 복사했어요.' : '복사에 실패했어요. 직접 선택해 복사하세요.', !ok)
    } catch { flash('복사에 실패했어요. 직접 선택해 복사하세요.', true) }
  }

  const toProject = () => {
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: `플롯 설계 · ${tpl.name}`,
      bodyHtml: buildHtml(),
      meta: { 템플릿: tpl.name, 분기: tpl.branch, 작성비트: `${filled}/${beats.length}`, 완료: String(doneCount) },
    })
    flash(id ? '프로젝트 자료(구조)에 플롯 설계 문서를 추가했어요.' : '프로젝트에 연결되지 않았습니다.', !id)
  }

  const activeDef = active ? beats.find((b) => b.key === active) || null : null

  // ── 스타일 ─────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 8px', flexWrap: 'wrap' }
  const title: React.CSSProperties = { fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7, marginRight: 'auto' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 14px 14px' }
  const footer: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }
  const progressBar: React.CSSProperties = { height: 8, borderRadius: 99, background: 'var(--chrome-2)', overflow: 'hidden', border: '1px solid var(--border)' }
  const progressFill: React.CSSProperties = { height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--ok))', transition: 'width .25s ease' }

  return (
    <div style={wrap}>
      <div style={head}>
        <div style={title}><Emoji e="🐉"/> 판타지 플롯·진행곡선
          {genreCtx && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 99, padding: '2px 8px' }}>{genreCtx}</span>}
        </div>
      </div>

      {/* 템플릿 선택 */}
      <div style={{ display: 'flex', gap: 6, padding: '0 14px 8px', flexWrap: 'wrap' }}>
        {TEMPLATES.map((t) => {
          const on = t.id === tplId
          return (
            <button
              key={t.id}
              className={'minibtn' + (on ? ' active' : '')}
              style={on ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' } : {}}
              onClick={() => { setTplId(t.id); setActive(null) }}
              title={t.desc}
            >{t.name}</button>
          )
        })}
      </div>

      {/* 템플릿 설명 + 조합수 */}
      <div style={{ margin: '0 14px 8px', padding: '8px 11px', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 12, lineHeight: 1.55, color: 'var(--muted)' }}>
        <div style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 2 }}>{tpl.branch}</div>
        {tpl.desc}
        <div style={{ marginTop: 6, fontSize: 11.5 }}><Emoji e="🎲"/> 이 템플릿으로 설계 가능한 진행곡선 상태수: <strong style={{ color: 'var(--accent)' }}>{fmtBig(combinationsOf(tpl))}</strong> (비트 {beats.length}개 × 작성·긴장도·완료 조합)</div>
      </div>

      {/* 진행률 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--muted)', padding: '0 14px 6px', gap: 10 }}>
        <span>작성 비트 <strong style={{ color: 'var(--text)' }}>{filled}</strong>/{beats.length} · 완료 <strong style={{ color: 'var(--ok)' }}>{doneCount}</strong></span>
        <span>{pct}%</span>
      </div>
      <div style={{ padding: '0 14px 8px' }}>
        <div style={progressBar}><div style={progressFill} /></div>
      </div>

      {/* 진행곡선 */}
      <div style={{ padding: '0 14px 4px' }}>
        <CurveView beats={beats} bstore={bstore} active={active} onPick={setActive} actOrder={actOrder} />
      </div>

      {note && (
        <div style={{ margin: '4px 14px 0', padding: '7px 10px', borderRadius: 8, fontSize: 12.5, background: 'var(--chrome-2)', border: '1px solid var(--border)', color: note.startsWith('⚠️') ? 'var(--warn)' : 'var(--ok)' }}>{note}</div>
      )}

      {/* 비트 목록 */}
      <div style={body}>
        <BeatList beats={beats} bstore={bstore} active={active} onPick={setActive} onToggle={toggleDone} actOrder={actOrder} />
      </div>

      {/* 편집 패널 */}
      {activeDef && (
        <BeatEditor
          def={activeDef}
          data={bstore[activeDef.key]}
          editRef={editRef}
          actOrder={actOrder}
          onText={(v) => setField(activeDef.key, 'text', v)}
          onNote={(v) => setField(activeDef.key, 'note', v)}
          onTension={(v) => setField(activeDef.key, 'tension', v)}
          onToggle={() => toggleDone(activeDef.key)}
          onClear={() => clearBeat(activeDef.key)}
          onClose={() => setActive(null)}
          onPrev={() => setActive(beats[(activeDef.no - 2 + beats.length) % beats.length].key)}
          onNext={() => setActive(beats[activeDef.no % beats.length].key)}
        />
      )}

      <div style={footer}>
        <button className="btn-primary" onClick={copyAll}><Emoji e="📋"/> 전체 복사</button>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? '자료 › 구조 폴더에 플롯 설계 문서로 추가' : '프로젝트에 연결되지 않았습니다'}
        ><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={() => openToolLinked('hero-journey-map', { genre: genreCtx || '판타지' })} title="영웅의 여정 지도 열기"><Emoji e="🗺️"/> 영웅의 여정</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre: genreCtx || '판타지' })} title="플롯 피라미드 열기"><Emoji e="🔺"/> 플롯 피라미드</button>
        <button className="minibtn" style={{ marginLeft: 'auto', color: 'var(--warn)' }} onClick={resetTpl} disabled={filled === 0 && doneCount === 0}><Emoji e="🗑️"/> 이 템플릿 비우기</button>
      </div>
    </div>
  )
}

// ── 진행곡선 SVG ───────────────────────────────────────────
function CurveView({ beats, bstore, active, onPick, actOrder }: {
  beats: BeatDef[]; bstore: BeatStore; active: string | null; onPick: (k: string) => void; actOrder: string[]
}) {
  const W = 680, H = 150, padL = 26, padR = 12, padT = 10, padB = 22
  const innerW = W - padL - padR, innerH = H - padT - padB
  const n = beats.length
  const x = (i: number) => padL + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1))
  const y = (t: number) => padT + innerH - (innerH * t) / 10

  const pts = beats.map((b, i) => ({ x: x(i), y: y(bstore[b.key].tension), b, i }))
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ')
  const area = path + ` L ${pts[pts.length - 1].x.toFixed(1)},${(padT + innerH).toFixed(1)} L ${pts[0].x.toFixed(1)},${(padT + innerH).toFixed(1)} Z`

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', maxWidth: '100%' }} role="img" aria-label="진행 긴장 곡선">
        {/* 가로 격자 */}
        {[0, 2, 4, 6, 8, 10].map((t) => (
          <g key={t}>
            <line x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} stroke="var(--border)" strokeWidth={0.6} opacity={0.5} />
            <text x={padL - 4} y={y(t) + 3} textAnchor="end" fontSize={8} fill="var(--muted)">{t}</text>
          </g>
        ))}
        {/* 면적 + 선 */}
        <path d={area} fill="var(--accent)" opacity={0.12} />
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
        {/* 비트 점 */}
        {pts.map((p) => {
          const d = bstore[p.b.key]
          const on = active === p.b.key
          const col = d.done ? 'var(--ok)' : d.text.trim() ? 'var(--accent)' : 'var(--paper)'
          return (
            <g key={p.b.key} style={{ cursor: 'pointer' }} onClick={() => onPick(p.b.key)}>
              <circle cx={p.x} cy={p.y} r={on ? 6 : 4.5} fill={col} stroke={on ? 'var(--text)' : actColor(p.b.act, actOrder)} strokeWidth={on ? 2.5 : 1.6} />
              <text x={p.x} y={H - 8} textAnchor="middle" fontSize={8.5} fill={on ? 'var(--text)' : 'var(--muted)'} fontWeight={on ? 700 : 400}>{p.b.no}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── 비트 목록 ──────────────────────────────────────────────
function BeatList({ beats, bstore, active, onPick, onToggle, actOrder }: {
  beats: BeatDef[]; bstore: BeatStore; active: string | null; onPick: (k: string) => void; onToggle: (k: string) => void; actOrder: string[]
}) {
  let lastAct = ''
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {beats.map((b) => {
        const d = bstore[b.key]
        const hasText = !!d.text.trim()
        const on = active === b.key
        const header = b.act !== lastAct
        lastAct = b.act
        const ac = actColor(b.act, actOrder)
        return (
          <div key={b.key}>
            {header && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 4px', fontSize: 12, fontWeight: 700, color: ac }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: ac, display: 'inline-block' }} />{b.act}
              </div>
            )}
            <div
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 11,
                background: on ? 'var(--chrome-2)' : 'var(--panel)',
                border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'),
                cursor: 'pointer', borderLeft: `4px solid ${d.done ? 'var(--ok)' : hasText ? 'var(--accent)' : 'var(--border)'}`,
              }}
              onClick={() => onPick(b.key)}
            >
              <input
                type="checkbox" checked={d.done}
                onClick={(e) => e.stopPropagation()} onChange={() => onToggle(b.key)}
                style={{ flexShrink: 0, width: 16, height: 16, marginTop: 2, cursor: 'pointer', accentColor: 'var(--ok)' }}
                aria-label={`${b.title} 완료`}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span><Emoji e={b.emoji}/></span><span style={{ color: 'var(--muted)' }}>{b.no}.</span> {emojify(b.title)}
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: ac, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 99, padding: '1px 7px' }}>긴장 {d.tension}</span>
                </div>
                <div style={{ fontSize: 12.5, marginTop: 3, lineHeight: 1.5, color: hasText ? 'var(--text)' : 'var(--muted)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {hasText ? emojify(d.text) : '(눌러서 내용 작성)'}
                </div>
                {d.note.trim() && (
                  <div style={{ fontSize: 11.5, marginTop: 4, color: 'var(--muted)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}><Emoji e="📝"/> {emojify(d.note)}</div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── 비트 편집 패널 ─────────────────────────────────────────
function BeatEditor({
  def, data, editRef, actOrder, onText, onNote, onTension, onToggle, onClear, onClose, onPrev, onNext,
}: {
  def: BeatDef
  data: BeatData
  editRef: React.RefObject<HTMLTextAreaElement>
  actOrder: string[]
  onText: (v: string) => void
  onNote: (v: string) => void
  onTension: (v: number) => void
  onToggle: () => void
  onClear: () => void
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const ac = actColor(def.act, actOrder)
  const panel: React.CSSProperties = {
    borderTop: '1px solid var(--border)', background: 'var(--panel)', padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 9, maxHeight: '54%', overflowY: 'auto', boxSizing: 'border-box',
  }
  const fieldLabel: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }
  const ta: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 11px', fontSize: 13.5, lineHeight: 1.55,
    borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)',
    resize: 'vertical', fontFamily: 'inherit',
  }
  return (
    <div style={panel}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}><Emoji e={def.emoji}/></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ color: ac }}>{def.no}.</span> {emojify(def.title)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{def.act}</div>
        </div>
        <button className="minibtn" onClick={onPrev} title="이전 비트" aria-label="이전 비트">←</button>
        <button className="minibtn" onClick={onNext} title="다음 비트" aria-label="다음 비트">→</button>
        <button className="minibtn" onClick={onClose} title="닫기" aria-label="닫기">✕</button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, padding: '6px 9px', background: 'var(--chrome-2)', borderRadius: 8 }}><Emoji e="💡"/> {emojify(def.hint)}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, padding: '6px 9px', background: 'var(--chrome-2)', borderRadius: 8 }}><Emoji e="⏱️"/> 페이싱: {emojify(def.pace)}</div>

      <div>
        <div style={fieldLabel}>이 비트의 내용</div>
        <textarea
          ref={editRef}
          style={{ ...ta, marginTop: 4, minHeight: 68 }}
          value={data.text}
          onChange={(e) => onText(e.target.value)}
          placeholder="이 비트에서 일어나는 일을 적어보세요…"
        />
      </div>

      <div>
        <div style={{ ...fieldLabel, display: 'flex', justifyContent: 'space-between' }}>
          <span>긴장도(진행곡선에 반영)</span><span style={{ color: 'var(--accent)', fontWeight: 700 }}>{data.tension}/10</span>
        </div>
        <input
          type="range" min={0} max={10} step={1} value={data.tension}
          onChange={(e) => onTension(clampT(e.target.value, def.curve))}
          style={{ width: '100%', marginTop: 4, accentColor: 'var(--accent)', cursor: 'pointer' }}
          aria-label="긴장도"
        />
      </div>

      <div>
        <div style={fieldLabel}>메모(선택) — 복선·마법규칙·인물·소품</div>
        <textarea
          style={{ ...ta, marginTop: 4, minHeight: 42 }}
          value={data.note}
          onChange={(e) => onNote(e.target.value)}
          placeholder="복선·마법의 대가·예언·시스템창 메시지 등 메모…"
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={data.done} onChange={onToggle} style={{ width: 16, height: 16, accentColor: 'var(--ok)', cursor: 'pointer' }} />
          이 비트 완료
        </label>
        <button
          className="minibtn" style={{ marginLeft: 'auto', color: 'var(--warn)' }}
          onClick={onClear}
          disabled={!data.text.trim() && !data.note.trim() && !data.done}
          title="이 비트 내용 비우기"
        >비트 비우기</button>
      </div>
    </div>
  )
}
