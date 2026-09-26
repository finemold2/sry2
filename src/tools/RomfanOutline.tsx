// 로맨스판타지(로판) 개요 빌더 — 로판 표준 구조에 맞춘 장·막 개요 템플릿을 채우는 도구.
// 회판 5대 결(① 회귀 복수·재혼형, ② 악역영애 빙의·파멸 플래그 회피형, ③ 계약·정략결혼형,
// ④ 육아·힐링형, ⑤ 다크·집착형)을 골라 그 결에 맞는 막·비트를 펼치고, 각 비트에 내용을 적고(자동저장),
// 비트를 추가·삭제·순서변경한다. "로판 비트 영감 굴리기"로 로판 특화 슬롯(무대·여주·고구마·사이다·남주반응·심쿵·떡밥)을
// 무작위 조합해 빈칸을 채울 글감을 만든다(슬롯 잠금/재굴림 · 조합수 표시 · 1조 이상).
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크 없음(전부 로컬·자작 데이터). 언마운트 시 타이머 정리.
// 데이터: localStorage 'sry:tool:romfan-outline' (템플릿별 비트 내용·작품 메타·순서 보관).
// 연계: addToProject(root:'draft', folder:'개요') 로 바인더 원고에 개요 문서 추가, addToLibrary('snippets', ...) 로 굴린 영감 보관,
//       openToolLinked 로 관련 로판 도구(인물 단조·갈등 설계·장면 단조·플롯 피라미드·세계관 위키) 열기.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'romfan-outline',
  name: '로판 개요 빌더',
  icon: '👑',
  group: '구조',
  genre: '로맨스판타지',
  intro: '로판 표준 구조(회귀복수·악역영애 빙의·계약결혼·육아힐링·다크집착)에 맞춰 장·막 개요를 채우고 로판 비트 영감을 굴리세요',
  w: 740,
  h: 680,
}

const LS = 'sry:tool:romfan-outline'

// ──────────────────────────────────────────────────────────────────────────
// 비트(개요 항목) 모델 — 막(act) 라벨로 묶이는 고정 비트 + 사용자가 더한 자유 비트
// ──────────────────────────────────────────────────────────────────────────
interface BeatDef {
  key: string
  act: string        // 막/구간 라벨
  title: string      // 비트 이름
  hint: string       // 이 비트에 무엇을 쓸지 안내(로판 특화)
}
interface TemplateDef {
  key: string
  label: string
  icon: string
  tag: string        // 하위유형 한 줄 설명
  blurb: string      // 어떤 작품에 맞는지(레퍼런스 포함)
  beats: BeatDef[]
}

// ── 1) 회귀 복수·재혼형 — 『재혼 황후』식 정치 복수 + 재혼 ─────────────────────
const T_REGRESS: BeatDef[] = [
  { key: 'rg_prologue', act: '프롤로그 · 비극의 끝', title: '전생의 파멸(처형·이혼·배신)', hint: '여주가 죽음·폐위·이혼으로 무너지는 마지막 장면을 먼저 제시. "내가 죽고 나서야 그는 후회했다"식 충격 후킹.' },
  { key: 'rg_return', act: '1막 · 회귀 각성', title: '결혼 전·즉위 전으로 회귀', hint: '눈을 뜨니 비극 이전. 미래를 아는 자만의 정보 비대칭을 선언. 목표 설정: 생존·이혼·복수·자유 중 무엇인가.' },
  { key: 'rg_plan', act: '1막 · 회귀 각성', title: '복수·선점 설계', hint: '미래 지식으로 재산·인맥·증거·황궁 인사를 선점. 전생에 당했던 함정을 역이용할 첫 포석을 깐다.' },
  { key: 'rg_cider1', act: '1막 · 회귀 각성', title: '첫 사이다 — 가해자 손절', hint: '무시하던 남편·정부(情婦)·정적을 초반에 통쾌하게 역전. 차갑고 우아한 거절로 독자에게 사이다 약속.' },
  { key: 'rg_court', act: '2막 · 정치 포석', title: '황궁·사교계 권력 재편', hint: '파벌·계승·신전·재정을 둘러싼 수싸움. 전생의 적을 동맹으로, 동맹을 무기로 재배치한다.' },
  { key: 'rg_newman', act: '2막 · 정치 포석', title: '재혼 상대(넘버원 남주) 등장', hint: '이웃 제국 황제·대공 등 진짜 내 편이 될 남주. 전 남편과 대비되는 "온리 유"의 헌신을 예고.' },
  { key: 'rg_jealous', act: '2막 · 밀당과 질투', title: '전 남편의 뒤늦은 집착·후회', hint: '여주가 빛날수록 버렸던 남자가 후회·집착한다. 사이다의 핵심 연료. 그러나 여주는 흔들리지 않는다.' },
  { key: 'rg_crisis', act: '3막 · 음모와 위기', title: '정부·정적의 반격(누명·독·납치)', hint: '전생의 흑막이 다시 칼을 빼든다. 누명·독살·후계 위협 등 가장 큰 고구마 구간(짧고 분명하게).' },
  { key: 'rg_reckon', act: '4막 · 공개 단죄', title: '만인 앞 공개 망신 역전', hint: '연회·재판·대관식에서 죄가 폭로되고 여주가 공인받는 사이다의 정점(Public Reckoning).' },
  { key: 'rg_choose', act: '4막 · 공개 단죄', title: '남주의 공개 선택·선언', hint: '정치적 손해를 감수하고 "이 사람이 내 사람"이라 공표. 황후 지목·재혼 선언으로 운명 전복 확정.' },
  { key: 'rg_happy', act: '결말 · 해피엔딩', title: '재혼·즉위 + 외전 떡밥', hint: '전생과 정반대의 위상(황후·여제). 외전에서 달달한 후일담·육아·질투 코미디로 보상.' },
]

// ── 2) 악역영애 빙의·파멸 플래그 회피형 — はめふら·『상수리나무 아래』식 ──────────
const T_VILLAINESS: BeatDef[] = [
  { key: 'vl_isekai', act: '발단 · 빙의 자각', title: '읽던 소설/게임 속 악역영애로 빙의', hint: '현대인이 즐기던 작품의 "처형·추방당할 악역영애" 몸에 들어옴을 자각. 원작 지식이 무기이자 족쇄.' },
  { key: 'vl_flag', act: '발단 · 빙의 자각', title: '파멸 플래그·데드라인 파악', hint: '원작대로면 언제 어떻게 죽는가(파혼→유폐→처형). 회피할 분기점과 호감도·평판을 재설계할 표를 짠다.' },
  { key: 'vl_redesign', act: '1막 · 평판 재설계', title: '악행 취소·관계 재배치', hint: '원작 악녀의 괴롭힘을 멈추고, 진짜 여주인공·하인·가족과의 관계를 손본다. 첫 호감도 상승 사이다.' },
  { key: 'vl_meet', act: '1막 · 평판 재설계', title: '원작 공략남(남주)과 예상 밖 접점', hint: '원작에선 진짜 여주의 차지였던 남자. 파멸을 피하려 거리 두려는데, 어긋난 행동이 오히려 호감을 산다.' },
  { key: 'vl_force', act: '2막 · 원작 강제력', title: '"원작대로"로 끌고 가려는 세계', hint: '비틀어도 다시 제자리로 돌아오려는 강제력. 정해진 사건(무도회·사고·약혼)이 데드라인을 다시 세운다.' },
  { key: 'vl_skill', act: '2막 · 능력 각성', title: '여주만의 무기(원작 지식·마법·경영)', hint: '전생 지식·숨은 신성력·전생 사업감각 등으로 위기를 정면 돌파. 민폐 아닌 주체적 해결을 보여준다.' },
  { key: 'vl_pull', act: '2막 · 밀당과 오해', title: '끌림과 거리두기 · 정보 격차', hint: '여주는 "그가 날 싫어한다"고 믿지만 실제론 빠졌다. 남주 독백 삽입으로 독자만 진실을 아는 아이러니.' },
  { key: 'vl_villain', act: '3막 · 진짜 흑막', title: '원작 여주·진짜 흑막의 함정', hint: '원작 주인공 보정·흑마법사·정적이 파멸 플래그를 부활시킨다. 누명·독·정체 발각 위기.' },
  { key: 'vl_reveal', act: '3막 · 비밀 폭로', title: '빙의/회귀 사실 또는 출생 비밀 노출', hint: '비밀이 남주에게 드러나는 시험대. 거부가 아닌 포용으로 귀결되며 집착·헌신이 강화된다.' },
  { key: 'vl_break', act: '절정 · 운명 전복', title: '강제력 분쇄 · 플래그 완전 회피', hint: '증거·동맹·각성 능력으로 흑막을 무너뜨리고 "정해진 죽음"을 뒤집는다. 운명 전복의 카타르시스.' },
  { key: 'vl_happy', act: '결말 · 해피엔딩', title: '숨겨진 고귀함 + 새 엔딩', hint: '천대받던 악역영애가 사실 고귀한 혈통이었음이 밝혀지거나, 원작을 갈아엎은 행복한 새 엔딩을 쟁취.' },
]

// ── 3) 계약·정략결혼형 — "처음엔 계약, 나중엔 진심" ─────────────────────────────
const T_CONTRACT: BeatDef[] = [
  { key: 'ct_setup', act: '발단 · 거래 성립', title: '계약/정략결혼의 동기', hint: '가문 구제·신분 위장·정치 동맹·저주 해제 등 둘 다 거부할 수 없는 거래 조건과 기한을 명확히 세운다.' },
  { key: 'ct_terms', act: '발단 · 거래 성립', title: '계약 조항·선 긋기', hint: '"사랑은 없다·기간 한정·서로 간섭 금지" 같은 조항. 나중에 깨질 규칙일수록 좋다(긴장 장치).' },
  { key: 'ct_cold', act: '1막 · 거리감', title: '차가운 동거·탐색전', hint: '서로의 비밀과 의도를 재는 초반. 차갑지만 나에게만 묘하게 다정한 균열의 순간을 심는다.' },
  { key: 'ct_share', act: '1막 · 사건 공유', title: '함께 넘는 첫 위기', hint: '암살·음모·가문 위기를 함께 막으며 거리가 좁혀진다. 위기 순간 공주님 안기·벽치기 등 첫 심쿵.' },
  { key: 'ct_thaw', act: '2막 · 해빙', title: '온도 변화 — 진심의 싹', hint: '"차가운 줄 알았던 손끝의 온기" 묘사. 계약을 넘어선 행동(질투·보호·배려)이 둘을 흔든다.' },
  { key: 'ct_rival', act: '2막 · 방해', title: '라이벌·과거 인연의 개입', hint: '약혼 방해자·과거 정혼자·집안 압력이 끼어든다. 단, 남주의 "온리 유"는 흔들리지 않게.' },
  { key: 'ct_doubt', act: '3막 · 오해', title: '계약 만료·진심 의심', hint: '"이게 계약일 뿐일까?" 오해와 정보 격차로 멀어진다. 만료 기한이 다가오며 이별 위기가 고조.' },
  { key: 'ct_confess', act: '절정 · 진심 확정', title: '계약을 깨는 고백·선택', hint: '한쪽이 계약 조항을 스스로 깨며 진심을 선언. 신분·정치 손해를 감수한 공개 선택으로 확정.' },
  { key: 'ct_resolve', act: '절정 · 진심 확정', title: '방해·음모의 청산', hint: '거래를 강요했던 가문·흑막을 함께 정리. 누명·압력을 벗고 두 사람의 관계를 공인받는다.' },
  { key: 'ct_happy', act: '결말 · 해피엔딩', title: '계약 → 진짜 결혼 + 후일담', hint: '형식뿐이던 결혼이 진짜가 된다. 외전에서 신혼·질투·육아의 달달함으로 보상.' },
]

// ── 4) 육아·힐링형 — 딸바보/아빠물 (『외동딸로 다시 태어났습니다』식) ──────────────
const T_NURTURE: BeatDef[] = [
  { key: 'nt_reborn', act: '발단 · 새 생', title: '어린 여주로 환생/회귀', hint: '죽음·고생 끝에 사랑받는(혹은 학대받는) 아이로 다시 태어남. 전생 기억을 가진 어른의 내면 + 아이의 몸.' },
  { key: 'nt_guardian', act: '발단 · 새 생', title: '보호자(딸바보 후보) 등장', hint: '냉혹하기로 소문난 대공·황제·기사단장 등. 이 아이만은 못 이기는 약점이 될 어른들을 배치.' },
  { key: 'nt_melt', act: '1막 · 함락', title: '혀 짧은 말투·작은 행동으로 함락', hint: '"아빠… 시쪄" 같은 결정타. 어린 여주의 영특함·다정함이 차가운 보호자를 무장해제시키는 첫 사이다.' },
  { key: 'nt_family', act: '1막 · 함락', title: '가족·식솔의 마음 얻기', hint: '하인·기사·형제까지 차례로 함락. "우리 아가씨"를 떠받드는 든든한 울타리(꽃받침)를 쌓는다.' },
  { key: 'nt_threat', act: '2막 · 그림자', title: '출생의 비밀·노리는 자', hint: '여주의 혈통·재산·신성력을 노리는 친척·정적. 평온 속에 스며든 위협의 그림자를 드리운다.' },
  { key: 'nt_gift', act: '2막 · 특별함', title: '숨은 능력·예언의 아이', hint: '신성력·정령 친화·예언이 지목한 아이임이 드러난다. 여주의 특별함을 제도(신전·예언서)가 공인.' },
  { key: 'nt_danger', act: '3막 · 위기', title: '납치·암살 — 보호자 폭주', hint: '아이가 위협받자 평소 냉정하던 보호자가 모든 걸 불태운다. 부성·헌신의 폭발로 감정 정점.' },
  { key: 'nt_save', act: '절정 · 구원', title: '구출과 응징', hint: '여주의 기지 + 보호자들의 힘으로 위기를 돌파하고 흑막을 단죄. 가족의 결속이 증명된다.' },
  { key: 'nt_truth', act: '절정 · 인정', title: '고귀한 신분 공인', hint: '버려졌던/천대받던 아이가 사실 황녀·신의 자손임이 공표되어 정당한 자리를 되찾는다.' },
  { key: 'nt_happy', act: '결말 · 힐링엔딩', title: '따뜻한 일상 + 성장 외전', hint: '사랑받는 일상의 행복. (선택)성장한 여주의 로맨스를 외전 떡밥으로 남겨 다음 권을 잇는다.' },
]

// ── 5) 다크·집착형 — 집착광공·다크로판 (『상수리나무 아래』 분위기) ───────────────
const T_DARK: BeatDef[] = [
  { key: 'dk_cage', act: '1막 · 갇힌 세계', title: '억압·소유의 상황 제시', hint: '포로·노예·정략·감금 등 여주가 자유롭지 못한 어두운 상황. 톤 경고가 필요한 다크로판 무대.' },
  { key: 'dk_man', act: '1막 · 갇힌 세계', title: '집착 남주와의 위태로운 첫 접촉', hint: '강하고 위험하며 오직 여주에게만 집착하는 남주. 다정함과 광기가 위태롭게 공존하는 첫 장면.' },
  { key: 'dk_agency', act: '2막 · 주체성', title: '여주의 생존 전략·주도권 확보', hint: '구원만 기다리지 않는다. 정보·지략·능력으로 자기 운명을 흔들기 시작(민폐 여주 금지).' },
  { key: 'dk_pull', act: '2막 · 위험한 끌림', title: '두려움과 끌림의 공존', hint: '집착이 무서우면서도 그 헌신에 흔들린다. 체온·시선·손의 떨림 등 신체 반응 클로즈업으로 긴장.' },
  { key: 'dk_secret', act: '2막 · 비밀', title: '남주의 상처·집착의 기원', hint: '집착이 단순 광기가 아닌 트라우마·저주·과거에서 비롯됨을 밝혀 입체화. 동정과 위험이 교차.' },
  { key: 'dk_break', act: '3막 · 균열', title: '신뢰의 시험·이별 시도', hint: '여주가 벗어나려 하거나 큰 오해가 터진다. 집착 남주의 가장 어두운 면이 드러나는 위기.' },
  { key: 'dk_threat', act: '3막 · 외부 위협', title: '진짜 적·외부 음모의 부상', hint: '둘을 갈라놓으려는(혹은 여주를 노리는) 외부 흑막이 진짜 적으로 떠오른다. 공동의 위기로 전환.' },
  { key: 'dk_sacrifice', act: '절정 · 희생', title: '목숨 건 구원 · 감정 확정', hint: '한쪽이 목숨을 걸고 다른 쪽을 구한다. 집착이 헌신으로 승화되며 감정의 결정타가 터진다.' },
  { key: 'dk_choice', act: '절정 · 선택', title: '대등한 관계로의 재계약', hint: '소유가 아닌 선택으로. 여주가 동등한 주체로서 관계를 다시 정의하며 어두운 굴레를 끊는다.' },
  { key: 'dk_happy', act: '결말 · 구원엔딩', title: '치유된 결합 + 여운 외전', hint: '상처가 치유된 둘의 결합. 달콤하되 여운 있는 후일담으로 다크로판의 카타르시스를 마무리.' },
]

const TEMPLATES: TemplateDef[] = [
  { key: 'regress', label: '회귀 복수·재혼형', icon: '👑', tag: '회귀 · 정치 복수 · 재혼', blurb: '『재혼 황후』식. 비극→회귀→정보 비대칭으로 복수·선점, 공개 단죄와 재혼 해피엔딩.', beats: T_REGRESS },
  { key: 'villainess', label: '악역영애 빙의형', icon: '🥀', tag: '빙의 · 파멸 플래그 회피', blurb: 'はめふら·『상수리나무 아래』식. 악역영애로 빙의 → 원작 강제력에 맞서 파멸 회피·운명 전복.', beats: T_VILLAINESS },
  { key: 'contract', label: '계약·정략결혼형', icon: '💍', tag: '계약 → 진심', blurb: '"처음엔 계약, 나중엔 진심." 거래로 맺어진 둘이 사건 공유로 진짜 사랑에 이르는 점진 구조.', beats: T_CONTRACT },
  { key: 'nurture', label: '육아·힐링형', icon: '🍼', tag: '환생 · 딸바보 · 힐링', blurb: '『외동딸로 다시 태어났습니다』식. 어린 여주 + 딸바보 보호자들. 함락·보호·숨은 고귀함.', beats: T_NURTURE },
  { key: 'dark', label: '다크·집착형', icon: '🖤', tag: '집착광공 · 다크로판', blurb: '『상수리나무 아래』 분위기. 억압·집착의 위태로운 관계 → 주체성과 구원으로 승화(톤 경고 권장).', beats: T_DARK },
]
function tplDef(k: string): TemplateDef { return TEMPLATES.find((t) => t.key === k) || TEMPLATES[0] }

// ──────────────────────────────────────────────────────────────────────────
// 로판 비트 영감 굴리기 — 로판 특화 슬롯 풀(잠금/재굴림, 조합수 표시)
//   문장 골격: [분위기]의 [무대]에서, [여주]가 [고구마/위기]를 맞닥뜨리고,
//              [여주 무기]로 [사이다/역전]을 끌어낸다. [남주]는 [남주 반응]하고,
//              [심쿵 장치]가 둘을 흔드는 사이, [떡밥·반전]이 다음 회차를 연다.
// 조합수 = 9개 풀 길이의 곱(아래에서 자동 계산·표시) → 1조 이상.
// ──────────────────────────────────────────────────────────────────────────
const SLOT_STAGE = [ // 28
  '샹들리에가 빛나는 황궁 대연회장', '장미가 만발한 궁정 온실', '달빛이 스민 황실 도서관', '가면무도회가 한창인 공작가 홀',
  '티타임이 차려진 정원 다과회장', '눈 내리는 황궁 발코니', '마차가 멈춘 비 오는 저택 현관', '대관식이 거행되는 대성당',
  '검술 훈련이 한창인 기사단 연무장', '서출이 갇힌 별궁의 차가운 방', '신탁이 내려지는 신전 제단 앞', '마탑 꼭대기의 별 관측실',
  '약혼 발표가 예정된 귀족원 회의장', '폐위된 황후의 유폐 탑', '정령이 깃든 호숫가 신목 아래', '회귀 후 처음 눈뜬 새벽의 침실',
  '독약 향이 감도는 황후궁 다실', '사교계 데뷔탕트 무도회장', '재판이 열리는 황실 법정', '국경을 넘는 호화 열차 특실',
  '저주가 서린 고성(古城)의 회랑', '아카데미 기숙사 옥상 정원', '상단 계약이 오가는 항구 저택', '겨울 사냥 대회가 열리는 설원 영지',
  '비밀 통로가 숨겨진 서재', '신년 무도회를 앞둔 황제의 집무실', '용이 잠든 봉인의 탑 아래', '버려진 신전의 달빛 회랑',
]
const SLOT_HEROINE = [ // 26
  '처형 직전 회귀한 폐황후', '읽던 소설에 빙의한 악역영애', '버림받았다 돌아온 공작 영애', '서출로 천대받던 백작가 딸',
  '계약결혼으로 황실에 들어온 영애', '전생 기억을 가진 어린 황녀', '숨은 신성력을 지닌 성녀 후보', '정략의 패로 팔려온 변경백 딸',
  '원작에선 죽는 엑스트라 시녀', '몰락 가문을 일으키려는 막내딸', '예언이 지목한 신탁의 아이', '저주받은 혈통의 마지막 후예',
  '전생의 사업감각을 지닌 상단 영애', '이혼만을 바라는 대공비', '쌍둥이와 뒤바뀐 진짜 황녀', '회귀로 가족의 멸문을 막으려는 영애',
  '독에 면역인 비밀을 숨긴 황태자비', '정령과 계약한 변방의 아가씨', '기억을 잃고 깨어난 전대 성녀', '복수를 결심한 재혼 황후',
  '아카데미 수석을 노리는 평민 영애', '집착에서 벗어나려는 포로 공녀', '죽은 줄 알려진 황실의 적녀', '치유 마법을 숨긴 시한부 황녀',
  '원작 강제력에 맞서는 빙의자', '딸바보 아빠를 함락한 어린 영애',
]
const SLOT_KUGUMA = [ // 24 (고구마·억울·위기)
  '누명을 쓰고 사교계에서 매장당할 위기에 처하고', '독이 든 차를 권하는 정적의 미소 앞에 서며', '약혼을 일방적으로 파기당해 모욕을 받고',
  '진짜 여주인공에게 모든 공을 빼앗기며', '원작대로의 파멸 플래그가 눈앞에 닥치고', '전 남편의 정부(情婦)가 자리를 위협하며',
  '서출이라는 이유로 만찬에서 배제당하고', '회귀 전의 흑막이 똑같은 함정을 다시 파며', '가문의 빚을 떠안고 팔려갈 처지에 놓이고',
  '신성력을 의심받아 신전 심문대에 서며', '암살자가 침실로 스며드는 밤을 맞고', '거짓 소문이 무도회장 전체에 퍼지며',
  '계약 기한이 끝나 버려질 두려움에 떨고', '출생의 비밀을 빌미로 협박당하며', '소중한 하인이 대신 벌을 받게 되고',
  '황제의 눈 밖에 나 유폐를 명받으며', '라이벌 영애가 면전에서 망신을 주고', '믿었던 가족이 등을 돌리는 순간을 맞으며',
  '전생의 죽음을 떠올리게 하는 인물과 마주치고', '거짓 증거로 반역죄를 뒤집어쓰며', '아끼던 동생이 인질로 잡히고',
  '평판을 떨어뜨리려는 음모에 휘말리며', '정략의 패로 원치 않는 혼담에 묶이고', '버려진 별궁에 홀로 갇히는 처지가 되며',
]
const SLOT_WEAPON = [ // 28 (여주의 무기·주체성)
  '원작 지식으로 함정을 미리 간파하고', '미래를 아는 정보 비대칭을 무기 삼아', '숨겨둔 신성력을 결정적 순간에 개방하며',
  '전생의 사업감각으로 재산과 인맥을 선점하고', '차갑고 우아한 한마디로 상대를 침묵시키며', '증거를 미리 확보해 단숨에 판을 뒤집고',
  '정령과의 계약으로 위기를 정면 돌파하며', '독에 대한 면역을 비장의 패로 드러내고', '예언서의 구절을 역이용해 명분을 쥐며',
  '치유 마법으로 누구도 못 한 일을 해내고', '냉철한 정치 감각으로 파벌을 재배치하며', '소문을 역으로 퍼뜨려 여론을 장악하고',
  '회귀 전 적의 약점을 정확히 찔러', '신탁의 권위를 빌려 정통성을 확보하며', '계약 조항의 허점을 거꾸로 활용하고',
  '검술 실력을 숨겼다가 결정적으로 보여주며', '상단 네트워크로 정보망을 장악하고', '아카데미 수석의 지략으로 흑막을 함정에 빠뜨리며',
  '진짜 혈통의 증거를 만천하에 공개하고', '적의 자만을 유도해 스스로 자멸하게 만들며', '숨겨진 후원자의 패를 적시에 꺼내 들고',
  '독설 대신 침착한 논리로 좌중을 설득하며', '버려진 자들의 충성을 모아 세력을 일구고', '전생의 기억으로 재난을 미리 막아내며',
  '숨겨둔 가문의 보물로 빚의 사슬을 끊어내고', '암호로 적힌 옛 서신을 해독해 진실을 들이밀며',
  '잊힌 고대 계약의 효력을 되살려 명분을 세우고', '적의 측근을 포섭해 안에서부터 판을 흔들며',
]
const SLOT_MANREACT = [ // 26 (남주 반응)
  '차가운 줄 알았던 황태자가 그녀에게만 온기를 보이고', '냉혹한 대공이 처음으로 흔들린 눈빛을 들키며', '무심하던 기사단장이 위기 순간 몸을 던지고',
  '집착하던 남주가 다정함과 광기 사이에서 흔들리며', '전 남편이 뒤늦은 후회로 매달리기 시작하고', '딸바보 보호자가 그녀를 위해 모든 걸 불태우며',
  '원작 공략남이 정해진 결말을 거스르려 하고', '냉정한 황제가 만조백관 앞에서 그녀를 지목하며', '서브 남주가 조용히 한발 물러나 그녀를 지키고',
  '계약 상대가 조항을 스스로 깨고 진심을 내비치며', '무뚝뚝한 공작이 서툰 방식으로 질투를 드러내고', '얼음 같던 황태자가 그녀의 미소에 무너지며',
  '집착 남주가 트라우마의 근원을 처음으로 털어놓고', '냉랭하던 남주가 그녀의 손끝에 닿자 굳어버리며', '강대한 남주가 그녀 앞에서만 약해지는 자신을 깨닫고',
  '과묵한 남주가 편지로 마음을 대신 전하며', '경계하던 남주가 그녀의 진심에 방어를 풀고', '오만하던 황자가 그녀에게 처음으로 고개를 숙이며',
  '무관심하던 남주가 그녀의 위기에 폭주하듯 달려오고', '냉소적이던 남주가 그녀 때문에 처음 웃으며', '강철 같던 남주가 그녀를 잃을까 두려워하기 시작하고',
  '정중하던 남주가 선을 넘는 시선을 들키며',
  '냉혹한 황제가 그녀를 위해 오랜 원칙을 스스로 꺾고', '데면데면하던 남주가 그녀의 빈자리를 견디지 못하며',
  '강인한 기사가 그녀 앞에서만 무릎을 꿇는 자신을 보고', '거만하던 대공이 그녀의 한마디에 말문이 막히며',
]
const SLOT_KILSHOOK = [ // 26 (심쿵 장치)
  '위기의 순간 그가 그녀를 가로로 안아 들어 올리고', '벽에 손을 짚어 도망갈 곳을 막은 채 시선을 맞추며', '차가운 손끝이 닿자 의외의 온기가 번지고',
  '흐트러진 머리칼을 말없이 귀 뒤로 넘겨주며', '"내 것"이라는 낮은 속삭임이 귓가에 닿고', '쓰러지는 그녀를 한 팔로 받아 안으며',
  '외투를 벗어 어깨에 둘러주는 손길이 머물고', '"도망치지 마"라는 말과 함께 손목이 붙잡히며', '눈물을 닦아주려던 손이 뺨에서 멈추고',
  '무도회에서 그가 단 한 사람, 그녀에게만 손을 내밀며', '심장 박동이 들킬 만큼 가까이 다가서고', '그녀를 감싸 안아 칼날 대신 등을 내어주며',
  '잠든 그녀의 머리맡을 밤새 지키고', '"다친 데는 없어?"라며 온몸을 살피는 시선이 닿으며', '손을 잡아끌어 인파 속에서 빼내고',
  '반지를 끼워주는 손가락이 미세하게 떨리며', '귓가에 닿을 듯한 거리에서 이름을 부르고', '비를 막아주려 그녀 위로 몸을 기울이며',
  '말없이 그녀의 손을 제 심장 위에 가져다 대고', '떠나려는 그녀의 등 뒤에서 조용히 끌어안으며',
  '추위에 언 그녀의 손을 제 두 손으로 감싸 녹여주고', '쓰러질 듯한 그녀를 부축하며 어깨를 내어주며',
  '흩날리는 머리칼 사이로 가만히 이마를 맞대고', '위험을 막아서며 그녀를 제 등 뒤로 숨기며',
  '달빛 아래에서 처음으로 진심 어린 미소를 보이고', '말끝을 삼킨 채 차마 떨어지지 않는 손을 거두며',
]
const SLOT_TWIST = [ // 26 (떡밥·반전)
  '믿었던 조력자가 흑막의 끄나풀이었음이 드러나고', '여주의 출생이 사실 잃어버린 황녀임이 밝혀지며', '원작 여주인공이 실은 진짜 흑막이었음이 드러나고',
  '남주의 집착이 전생의 인연에서 비롯됐음이 밝혀지며', '회귀가 여주 혼자만의 일이 아니었음이 드러나고', '죽은 줄 알았던 전 남편이 멀쩡히 돌아오며',
  '예언이 정반대로 해석되어야 했음이 밝혀지고', '계약결혼의 진짜 목적이 따로 있었음이 드러나며', '서브 남주가 사실 모든 걸 알고 움직였음이 밝혀지고',
  '여주의 신성력이 세계의 봉인을 쥐고 있었음이 드러나며', '원작 강제력의 정체가 누군가의 의도였음이 밝혀지고', '쌍둥이 자매와 운명이 뒤바뀌어 있었음이 드러나며',
  '남주가 이미 여러 번의 회귀를 겪었음이 밝혀지고', '독을 권한 자가 가장 가까운 사람이었음이 드러나며', '여주를 노린 진짜 이유가 혈통의 권능 때문이었음이 밝혀지고',
  '죽음의 데드라인이 앞당겨져 있었음이 드러나며', '신탁의 아이가 둘이었음이 밝혀지고', '버려진 이유가 사실 그녀를 지키기 위함이었음이 드러나며',
  '흑막이 노린 것은 여주가 아니라 남주였음이 밝혀지고', '해피엔딩 직전, 원작에 없던 새 변수가 등장하며',
  '죽었다던 어머니가 살아 다른 이름으로 숨어 있었음이 드러나고', '여주가 맺은 계약에 숨은 대가가 따로 있었음이 밝혀지며',
  '구원자로 믿었던 신전이 실은 비밀을 은폐해 왔음이 드러나고', '회귀의 횟수에 정해진 한계가 있었음이 밝혀지며',
  '남주의 가문이 여주 가문의 몰락에 얽혀 있었음이 드러나고', '예언서의 마지막 장이 통째로 찢겨 있었음이 밝혀지며',
]
const SLOT_MOOD = [ // 24
  '달콤하고 위태로운 밀당이 감도는', '우아한 가식 아래 칼끝이 번뜩이는', '서늘한 음모가 스며든', '눈부신 화려함이 넘실대는',
  '쓸쓸한 그리움이 내려앉은', '심장이 두근거리는 설렘이 번지는', '냉랭한 긴장이 팽팽한', '몽환적인 마법의 빛이 어른거리는',
  '비통한 회한이 깔린', '들뜬 축제의 열기가 가득한', '숨 막히는 권력 다툼이 끓는', '아련한 첫 끌림이 피어나는',
  '음습한 집착이 스며든', '따스한 위로가 감도는', '폭풍 전야의 무거운 고요가 깔린', '신성한 경외가 깃든',
  '눈물 어린 화해의 온기가 번지는', '운명을 거스르는 결의가 차오르는',
  '은은한 촛불이 흔들리는', '서걱이는 적의가 칼날처럼 스친', '아찔한 비밀이 감춰진', '나른한 오후의 권태가 흐르는',
  '차오르는 복수심이 들끓는', '애틋한 재회의 떨림이 번지는',
]
const SLOT_TURN = [ // 22 (전환 장치 / 절단마공)
  '회차 끝 클리프행어로 다음 화를 견인한다', '남주 시점 독백을 삽입해 진심을 폭로한다', '사이다 직전 고구마로 낙차를 키운다',
  '오해를 한 겹 더 쌓아 긴장을 끌어올린다', '예고된 비밀이 곧 터질 듯 암시한다', '라이벌의 등장으로 판을 뒤흔든다',
  '심쿵 한 방으로 회차를 달콤하게 닫는다', '흑막의 시점으로 장을 마무리한다', '파멸 데드라인을 한 칸 앞당긴다',
  '새 조력자의 합류로 세력을 넓힌다', '스케일을 가문→황실→제국으로 확장한다', '거짓 이별로 독자의 가슴을 졸이게 한다',
  '숨은 능력의 첫 발현으로 반전을 예고한다', '남주의 인간적 사연을 드러내 입체화한다', '관계의 결정적 진전을 끼워 넣는다',
  '세계의 큰 비밀 한 조각을 공개한다',
  '두 사람의 첫 동맹을 맺어 판세를 뒤집는다', '잊혔던 과거의 진실 한 자락을 들춰낸다',
  '여주의 평판을 단숨에 끌어올려 반전을 만든다', '적의 다음 수를 미리 흘려 긴장을 깐다',
  '회차의 마지막 대사를 던져 여운을 남긴다', '숨겨둔 조력자의 정체를 살짝 내비친다',
]
const SLOTS: { key: string; label: string; pool: string[] }[] = [
  { key: 'mood', label: '분위기', pool: SLOT_MOOD },
  { key: 'stage', label: '무대', pool: SLOT_STAGE },
  { key: 'heroine', label: '여주', pool: SLOT_HEROINE },
  { key: 'kuguma', label: '고구마·위기', pool: SLOT_KUGUMA },
  { key: 'weapon', label: '여주의 무기', pool: SLOT_WEAPON },
  { key: 'manreact', label: '남주 반응', pool: SLOT_MANREACT },
  { key: 'kilshook', label: '심쿵 장치', pool: SLOT_KILSHOOK },
  { key: 'twist', label: '떡밥·반전', pool: SLOT_TWIST },
  { key: 'turn', label: '전환 장치', pool: SLOT_TURN },
]
// 조합수: 각 풀 길이의 곱(고유 항목만). 24·28·26·24·28·26·26·26·22 → 약 4.5조(중복 없이 곱집합).
const COMBOS = SLOTS.reduce((n, s) => n * s.pool.length, 1)
function fmtCombos(n: number): string {
  if (n >= 1e16) return (n / 1e16).toFixed(n >= 1e17 ? 0 : 1).replace(/\.0$/, '') + '경'
  if (n >= 1e12) return (n / 1e12).toFixed(n >= 1e13 ? 0 : 1).replace(/\.0$/, '') + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, '') + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, '') + '만'
  return n.toLocaleString('ko-KR')
}
function rndIdx(len: number): number { return Math.floor(Math.random() * len) }
// 받침 유무로 조사를 골라 붙인다(이/가, 을/를, 은/는, 으로/로). "이(가)" 같은 이중표기 노출 금지.
function hasBatchim(word: string): boolean {
  const ch = word.charCodeAt(word.length - 1)
  if (ch < 0xac00 || ch > 0xd7a3) return false // 한글 음절이 아니면 받침 없음으로 처리
  return (ch - 0xac00) % 28 !== 0
}
function withJosa(word: string, withB: string, woB: string): string {
  return word + (hasBatchim(word) ? withB : woB)
}

// ──────────────────────────────────────────────────────────────────────────
// 저장 모델
// ──────────────────────────────────────────────────────────────────────────
interface UserBeat { id: string; act: string; title: string; hint?: string }
interface Store {
  title: string                                   // 작품 제목
  logline: string                                 // 한 줄 로그라인
  tpl: string                                     // 선택 템플릿 key
  texts: Record<string, Record<string, string>>   // 템플릿별: 비트 key → 내용 텍스트
  extra: Record<string, UserBeat[]>               // 템플릿별: 사용자가 더한 자유 비트
  order: Record<string, string[]>                 // 템플릿별: 비트 표시 순서(키 배열)
  done: Record<string, Record<string, boolean>>   // 비트 완료 체크
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return 'rb_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function emptyStore(): Store {
  return { title: '', logline: '', tpl: 'regress', texts: {}, extra: {}, order: {}, done: {} }
}

function loadStore(): Store {
  const base = emptyStore()
  try {
    const raw = localStorage.getItem(LS)
    if (!raw) return base
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return base
    base.title = typeof p.title === 'string' ? p.title : ''
    base.logline = typeof p.logline === 'string' ? p.logline : ''
    base.tpl = TEMPLATES.some((t) => t.key === p.tpl) ? p.tpl : 'regress'
    if (p.texts && typeof p.texts === 'object') {
      for (const tk of Object.keys(p.texts)) {
        const m = p.texts[tk]
        if (m && typeof m === 'object') {
          base.texts[tk] = {}
          for (const bk of Object.keys(m)) if (typeof m[bk] === 'string') base.texts[tk][bk] = m[bk]
        }
      }
    }
    if (p.done && typeof p.done === 'object') {
      for (const tk of Object.keys(p.done)) {
        const m = p.done[tk]
        if (m && typeof m === 'object') {
          base.done[tk] = {}
          for (const bk of Object.keys(m)) base.done[tk][bk] = !!m[bk]
        }
      }
    }
    if (p.extra && typeof p.extra === 'object') {
      for (const tk of Object.keys(p.extra)) {
        if (Array.isArray(p.extra[tk])) {
          base.extra[tk] = p.extra[tk]
            .filter((b: any) => b && typeof b === 'object' && typeof b.title === 'string')
            .map((b: any) => ({ id: String(b.id || newId()), act: typeof b.act === 'string' ? b.act : '추가', title: String(b.title), hint: typeof b.hint === 'string' ? b.hint : '' }))
        }
      }
    }
    if (p.order && typeof p.order === 'object') {
      for (const tk of Object.keys(p.order)) if (Array.isArray(p.order[tk])) base.order[tk] = p.order[tk].filter((x: any) => typeof x === 'string')
    }
    return base
  } catch {
    return base
  }
}

// ──────────────────────────────────────────────────────────────────────────
export default function RomfanOutline({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [note, setNote] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [showSpark, setShowSpark] = useState(false)
  const [picks, setPicks] = useState<Record<string, number>>(() => {
    const o: Record<string, number> = {}
    for (const s of SLOTS) o[s.key] = rndIdx(s.pool.length)
    return o
  })
  const [locks, setLocks] = useState<Record<string, boolean>>({})
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // payload.genre 활용 — 로판 외 장르로 열려도 동작하되 안내.
  const payloadGenre = typeof payload?.genre === 'string' ? (payload!.genre as string) : ''

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
  }, [])

  // payload 로 템플릿 지정해 열 수 있게(예: 다른 도구에서 tpl 전달).
  useEffect(() => {
    const t = typeof payload?.tpl === 'string' ? (payload!.tpl as string) : ''
    if (t && TEMPLATES.some((x) => x.key === t)) setStore((s) => ({ ...s, tpl: t }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동 저장.
  useEffect(() => {
    try {
      localStorage.setItem(LS, JSON.stringify(store))
    } catch {
      if (mounted.current) flash('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.', true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store])

  const flash = (msg: string, warn = false) => {
    if (!mounted.current) return
    setNote((warn ? '⚠️ ' : '') + msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2600)
  }

  const tkey = store.tpl
  const def = tplDef(tkey)

  // 현재 템플릿의 전체 비트(기본 + 사용자 추가)를 order 에 맞춰 정렬.
  const buildBeats = (): BeatDef[] => {
    const base = def.beats
    const extra = (store.extra[tkey] || []).map((b) => ({ key: b.id, act: b.act, title: b.title, hint: b.hint || '' }))
    const all = [...base, ...extra]
    const ord = store.order[tkey]
    if (ord && ord.length) {
      const map = new Map(all.map((b) => [b.key, b]))
      const sorted: BeatDef[] = []
      for (const k of ord) { const b = map.get(k); if (b) { sorted.push(b); map.delete(k) } }
      for (const b of all) if (map.has(b.key)) sorted.push(b) // 신규(순서 미기재)는 뒤에
      return sorted
    }
    return all
  }
  const beats = buildBeats()

  const getText = (bk: string) => store.texts[tkey]?.[bk] || ''
  const isDone = (bk: string) => !!store.done[tkey]?.[bk]

  const setText = (bk: string, v: string) => {
    setStore((s) => ({ ...s, texts: { ...s.texts, [tkey]: { ...(s.texts[tkey] || {}), [bk]: v } } }))
  }
  const toggleDone = (bk: string) => {
    setStore((s) => ({ ...s, done: { ...s.done, [tkey]: { ...(s.done[tkey] || {}), [bk]: !(s.done[tkey]?.[bk]) } } }))
  }
  const toggleOpen = (bk: string) => setOpen((o) => ({ ...o, [bk]: !o[bk] }))

  // 순서 보장: 현재 비트 키 배열을 order 에 반영하고 dir 방향 이동.
  const moveBeat = (bk: string, dir: -1 | 1) => {
    const keys = beats.map((b) => b.key)
    const i = keys.indexOf(bk)
    const j = i + dir
    if (i < 0 || j < 0 || j >= keys.length) return
    ;[keys[i], keys[j]] = [keys[j], keys[i]]
    setStore((s) => ({ ...s, order: { ...s.order, [tkey]: keys } }))
  }

  // 자유 비트 추가(현재 마지막 막 라벨로).
  const addBeat = () => {
    const lastAct = beats.length ? beats[beats.length - 1].act : '추가'
    const nb: UserBeat = { id: newId(), act: lastAct, title: '새 비트', hint: '' }
    setStore((s) => {
      const extra = [...(s.extra[tkey] || []), nb]
      const order = (s.order[tkey] && s.order[tkey].length) ? [...s.order[tkey], nb.id] : [...beats.map((b) => b.key), nb.id]
      return { ...s, extra: { ...s.extra, [tkey]: extra }, order: { ...s.order, [tkey]: order } }
    })
    setOpen((o) => ({ ...o, [nb.id]: true }))
    flash('새 비트를 추가했어요. 제목과 내용을 채워보세요.')
  }
  const isExtra = (bk: string) => (store.extra[tkey] || []).some((b) => b.id === bk)
  const renameBeat = (bk: string, title: string) => {
    setStore((s) => ({ ...s, extra: { ...s.extra, [tkey]: (s.extra[tkey] || []).map((b) => (b.id === bk ? { ...b, title } : b)) } }))
  }
  const removeBeat = (bk: string) => {
    if (!window.confirm('이 비트와 내용을 삭제할까요?')) return
    setStore((s) => {
      const extra = (s.extra[tkey] || []).filter((b) => b.id !== bk)
      const texts = { ...(s.texts[tkey] || {}) }; delete texts[bk]
      const done = { ...(s.done[tkey] || {}) }; delete done[bk]
      const order = (s.order[tkey] || beats.map((b) => b.key)).filter((k) => k !== bk)
      return { ...s, extra: { ...s.extra, [tkey]: extra }, texts: { ...s.texts, [tkey]: texts }, done: { ...s.done, [tkey]: done }, order: { ...s.order, [tkey]: order } }
    })
  }

  // ── 진행률 ───────────────────────────────────────────────────────────────
  const filled = beats.filter((b) => getText(b.key).trim()).length
  const doneCount = beats.filter((b) => isDone(b.key)).length
  const pct = beats.length ? Math.round((filled / beats.length) * 100) : 0

  // ── 영감 굴리기 ─────────────────────────────────────────────────────────
  const roll = () => {
    setPicks((prev) => {
      const next = { ...prev }
      for (const s of SLOTS) if (!locks[s.key]) next[s.key] = rndIdx(s.pool.length)
      return next
    })
  }
  const toggleLock = (k: string) => setLocks((l) => ({ ...l, [k]: !l[k] }))
  const sparkText = (): string => {
    const v = (k: string) => SLOTS.find((s) => s.key === k)!.pool[picks[k]]
    const heroine = withJosa(v('heroine'), '이', '가') // 받침 따라 이/가 자동 선택
    return `${v('mood')} ${v('stage')}에서, ${heroine} ${v('kuguma')}, ${v('weapon')} 사이다를 끌어낸다. ${v('manreact')}, ${v('kilshook')}. 그러나 ${v('twist')}, 끝내 ${v('turn')}.`
  }
  const sparkToLibrary = () => {
    const item = addToLibrary('snippets', { text: sparkText(), source: '로판 개요 빌더 · 비트 영감', tags: ['로맨스판타지', def.label] })
    flash(item ? '굴린 비트 영감을 글감(스니펫)에 보관했어요.' : '글감 보관에 실패했어요.', !item)
  }
  const sparkToCopy = async () => {
    const text = sparkText()
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); flash('비트 영감을 복사했어요.'); return }
    } catch {}
    try {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.focus(); ta.select(); const ok = document.execCommand('copy'); document.body.removeChild(ta)
      flash(ok ? '비트 영감을 복사했어요.' : '복사에 실패했어요.', !ok)
    } catch { flash('복사에 실패했어요.', true) }
  }
  // 굴린 영감의 내용으로 끼워넣기 — 첫 빈 비트 또는 첫 비트에.
  const sparkInto = () => {
    const target = beats.find((b) => !getText(b.key).trim()) || beats[0]
    if (!target) return
    const cur = getText(target.key)
    setText(target.key, cur ? cur + '\n' + sparkText() : sparkText())
    setOpen((o) => ({ ...o, [target.key]: true }))
    flash(`'${target.title}' 비트에 영감을 넣었어요.`)
  }

  // ── 텍스트/HTML 내보내기 ─────────────────────────────────────────────────
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const escMl = (s: string) => esc(s).replace(/\n/g, '<br/>')

  const buildText = (): string => {
    const lines: string[] = []
    lines.push(`# 로판 개요 — ${def.label}${store.title ? ` · ${store.title}` : ''}`)
    if (store.logline.trim()) lines.push(`로그라인: ${store.logline.trim()}`)
    lines.push(`채운 비트 ${filled}/${beats.length} · 완료 ${doneCount} (${pct}%)`)
    lines.push('')
    let lastAct = ''
    for (const b of beats) {
      if (b.act !== lastAct) { lines.push(`## ${b.act}`); lastAct = b.act }
      lines.push(`${isDone(b.key) ? '[v]' : '[ ]'} ${b.title}`)
      const t = getText(b.key).trim()
      lines.push(t ? t.split('\n').map((l) => '   ' + l).join('\n') : '   (미작성)')
      lines.push('')
    }
    return lines.join('\n').trimEnd() + '\n'
  }
  const buildHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><strong>로판 개요 · ${esc(def.label)}</strong>${store.title ? ` — ${esc(store.title)}` : ''}</p>`)
    if (store.logline.trim()) parts.push(`<p><em>로그라인: ${esc(store.logline.trim())}</em></p>`)
    parts.push(`<p>채운 비트 ${filled}/${beats.length} · 완료 ${doneCount} (${pct}%)</p>`)
    let lastAct = ''
    for (const b of beats) {
      if (b.act !== lastAct) { parts.push(`<h2>${esc(b.act)}</h2>`); lastAct = b.act }
      parts.push(`<h3>${isDone(b.key) ? '✅ ' : ''}${esc(b.title)}</h3>`)
      const t = getText(b.key).trim()
      parts.push(`<p>${t ? escMl(t) : '<em>(미작성)</em>'}</p>`)
    }
    return parts.join('')
  }

  const copyAll = async () => {
    const text = buildText()
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); flash('개요 전체를 복사했어요.'); return }
    } catch {}
    try {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.focus(); ta.select(); const ok = document.execCommand('copy'); document.body.removeChild(ta)
      flash(ok ? '개요 전체를 복사했어요.' : '복사에 실패했어요. 직접 선택해 복사하세요.', !ok)
    } catch { flash('복사에 실패했어요.', true) }
  }
  const exportTxt = () => {
    try {
      const blob = new Blob([buildText()], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (store.title ? store.title.replace(/[\\/:*?"<>|]/g, '_') : 'romfan-outline') + '-개요.txt'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1200)
      flash('개요를 .txt 로 내보냈어요.')
    } catch { flash('내보내기가 지원되지 않는 환경이에요.', true) }
  }

  // 프로젝트(원고 › 개요 폴더)에 개요 문서로 추가.
  const toProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.', true); return }
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '개요',
      title: `개요 · ${store.title || def.label}`,
      bodyHtml: buildHtml(),
      synopsis: store.logline.trim() || def.blurb,
      icon: meta.icon,
      meta: {
        장르: '로맨스판타지',
        구조: def.label,
        로그라인: store.logline.trim() || '(없음)',
        진행: `${filled}/${beats.length} (${pct}%)`,
      },
    })
    flash(id ? '원고(개요)에 개요 문서를 추가했어요.' : '프로젝트에 연결되지 않았습니다.', !id)
  }

  // 템플릿 전환.
  const switchTpl = (k: string) => { setStore((s) => ({ ...s, tpl: k })); setOpen({}) }

  // 현재 템플릿 내용 비우기.
  const resetTpl = () => {
    if (!window.confirm(`'${def.label}' 구조의 모든 비트 내용·추가 비트·순서를 비웁니다. 계속할까요?`)) return
    setStore((s) => ({
      ...s,
      texts: { ...s.texts, [tkey]: {} },
      done: { ...s.done, [tkey]: {} },
      extra: { ...s.extra, [tkey]: [] },
      order: { ...s.order, [tkey]: [] },
    }))
    setOpen({})
    flash('현재 구조의 내용을 비웠어요.')
  }

  const relatedTools = ['plot-pyramid', 'scene-list', 'character-sheet', 'relationship-map', 'world-wiki', 'emotion-arc']
  const relatedNames: Record<string, string> = {
    'plot-pyramid': '⛰️ 플롯 피라미드', 'scene-list': '🎬 장면 목록', 'character-sheet': '👤 인물 시트',
    'relationship-map': '🕸️ 관계도', 'world-wiki': '📚 세계관 위키', 'emotion-arc': '💗 감정 곡선',
  }

  // ── 스타일 ─────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0 }
  const head: React.CSSProperties = { padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--chrome-2)' }
  const input: React.CSSProperties = { padding: '8px 10px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', minWidth: 0 }
  const tplRow: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap' }
  const tplBtn = (active: boolean): React.CSSProperties => ({
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '7px 10px', borderRadius: 10, cursor: 'pointer',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'), background: active ? 'var(--accent)' : 'var(--panel)',
    color: active ? '#fff' : 'var(--text)', fontSize: 12.5, lineHeight: 1.3,
  })
  const barWrap: React.CSSProperties = { height: 9, borderRadius: 99, background: 'var(--paper)', border: '1px solid var(--border)', overflow: 'hidden' }
  const barFill: React.CSSProperties = { height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--ok))', transition: 'width .25s ease' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }
  const actLabel: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: 'var(--accent)', margin: '8px 0 2px', display: 'flex', alignItems: 'center', gap: 6 }
  const card = (done: boolean): React.CSSProperties => ({ border: '1px solid var(--border)', borderRadius: 11, background: 'var(--panel)', borderLeft: `4px solid ${done ? 'var(--ok)' : 'var(--accent)'}`, overflow: 'hidden' })
  const cHead: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 9, padding: '9px 11px' }
  const cTitle: React.CSSProperties = { fontSize: 14, fontWeight: 700, lineHeight: 1.35, flex: 1, minWidth: 0 }
  const chk: React.CSSProperties = { flexShrink: 0, width: 17, height: 17, marginTop: 2, cursor: 'pointer', accentColor: 'var(--ok)' }
  const iconBtn: React.CSSProperties = { flexShrink: 0, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 3 }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, padding: '0 11px 6px' }
  const ta: React.CSSProperties = { width: '100%', minHeight: 64, resize: 'vertical', padding: '8px 10px', fontSize: 13.5, lineHeight: 1.55, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const foot: React.CSSProperties = { borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--chrome-2)' }
  const sparkBox: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }
  const slotRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }
  const slotChip: React.CSSProperties = { flex: 1, minWidth: 0, padding: '6px 9px', borderRadius: 8, background: 'var(--chrome-2)', border: '1px solid var(--border)', lineHeight: 1.4 }

  let lastAct = ''

  return (
    <div style={wrap}>
      <div style={head}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input style={{ ...input, flex: '2 1 200px' }} value={store.title} onChange={(e) => setStore((s) => ({ ...s, title: e.target.value }))} placeholder="작품 제목 (선택)" maxLength={120} aria-label="작품 제목" />
          <input style={{ ...input, flex: '3 1 260px' }} value={store.logline} onChange={(e) => setStore((s) => ({ ...s, logline: e.target.value }))} placeholder="로그라인 한 줄 (예: 처형당한 황후가 회귀해 모든 것을 되갚는다)" maxLength={200} aria-label="로그라인" />
        </div>

        <div style={tplRow}>
          {TEMPLATES.map((t) => (
            <button key={t.key} style={tplBtn(t.key === tkey)} onClick={() => switchTpl(t.key)} title={t.blurb}>
              <span style={{ fontWeight: 800 }}><Emoji e={t.icon} /> {t.label}</span>
              <span style={{ fontSize: 11, opacity: t.key === tkey ? 0.9 : 0.7 }}>{t.tag}</span>
            </button>
          ))}
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>{def.blurb}</div>

        <div style={barWrap}><div style={barFill} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, color: 'var(--muted)', gap: 10 }}>
          <span>채운 비트 <strong style={{ color: 'var(--text)' }}>{filled}</strong>/{beats.length} · 완료 <strong style={{ color: 'var(--ok)' }}>{doneCount}</strong> · <strong style={{ color: 'var(--accent)' }}>{pct}%</strong></span>
          <button className="minibtn" onClick={() => setShowSpark((v) => !v)} title="로판 특화 슬롯으로 비트 영감을 무작위 조합">{showSpark ? <><Emoji e="🎲" /> 영감 닫기</> : <><Emoji e="🎲" /> 로판 비트 영감 굴리기</>}</button>
        </div>

        {payloadGenre && payloadGenre !== '로맨스판타지' && (
          <div style={{ fontSize: 11.5, color: 'var(--warn)', lineHeight: 1.5 }}>이 도구는 로맨스판타지(로판) 전용이에요. (요청 장르: {payloadGenre})</div>
        )}
        {note && <div style={{ fontSize: 12, lineHeight: 1.5, color: note.startsWith('⚠️') ? 'var(--warn)' : 'var(--ok)' }}>{note}</div>}
      </div>

      {/* 영감 패널 */}
      {showSpark && (
        <div style={{ padding: '10px 14px 0' }}>
          <div style={sparkBox}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 13 }}><Emoji e="🎲" /> 로판 비트 영감</strong>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>조합 가능 수 <strong style={{ color: 'var(--accent)' }}>{fmtCombos(COMBOS)}</strong>가지 ({COMBOS.toLocaleString('ko-KR')})</span>
              <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={roll}><Emoji e="🎲" /> 굴리기</button>
            </div>
            {SLOTS.map((s) => (
              <div key={s.key} style={slotRow}>
                <span style={{ width: 78, flexShrink: 0, color: 'var(--muted)', fontWeight: 600 }}>{s.label}</span>
                <span style={slotChip}>{s.pool[picks[s.key]]}</span>
                <button style={{ ...iconBtn, color: locks[s.key] ? 'var(--accent)' : 'var(--muted)' }} onClick={() => toggleLock(s.key)} title={locks[s.key] ? '잠금 해제' : '이 슬롯 잠그기(재굴림 제외)'} aria-label="슬롯 잠금">{locks[s.key] ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
              </div>
            ))}
            <div style={{ fontSize: 13, lineHeight: 1.6, padding: '8px 10px', background: 'var(--chrome-2)', borderRadius: 8, border: '1px dashed var(--border)' }}>{sparkText()}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="minibtn" onClick={sparkInto} disabled={!beats.length}>↩ 빈 비트에 넣기</button>
              <button className="linkbtn" onClick={sparkToLibrary}><Emoji e="📌" /> 글감으로 보관</button>
              <button className="minibtn" onClick={sparkToCopy}><Emoji e="📋" /> 복사</button>
            </div>
          </div>
        </div>
      )}

      {/* 비트 목록 */}
      <div style={body}>
        {beats.map((b, i) => {
          const showAct = b.act !== lastAct
          lastAct = b.act
          const isOpen = !!open[b.key]
          const txt = getText(b.key)
          const done = isDone(b.key)
          const extra = isExtra(b.key)
          return (
            <div key={b.key}>
              {showAct && <div style={actLabel}><span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--accent)', display: 'inline-block' }} />{b.act}</div>}
              <div style={card(done)}>
                <div style={cHead}>
                  <input type="checkbox" style={chk} checked={done} onChange={() => toggleDone(b.key)} aria-label={`${b.title} 완료`} />
                  {extra ? (
                    <input
                      style={{ ...input, flex: 1, padding: '4px 8px', fontSize: 14, fontWeight: 700 }}
                      value={b.title}
                      onChange={(e) => renameBeat(b.key, e.target.value)}
                      aria-label="비트 제목"
                      maxLength={80}
                    />
                  ) : (
                    <div style={cTitle}>{b.title}{txt.trim() && !isOpen ? <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · 작성됨</span> : ''}</div>
                  )}
                  <button style={iconBtn} onClick={() => moveBeat(b.key, -1)} disabled={i === 0} title="위로" aria-label="위로">▲</button>
                  <button style={iconBtn} onClick={() => moveBeat(b.key, 1)} disabled={i === beats.length - 1} title="아래로" aria-label="아래로">▼</button>
                  {extra && <button style={iconBtn} onClick={() => removeBeat(b.key)} title="삭제" aria-label="삭제"><Emoji e="🗑️" /></button>}
                  <button className="minibtn" style={{ flexShrink: 0 }} onClick={() => toggleOpen(b.key)} aria-expanded={isOpen}>{isOpen ? '접기 ▲' : '펼치기 ▼'}</button>
                </div>
                {isOpen && (
                  <>
                    {b.hint && <div style={hint}><Emoji e="💡" /> {b.hint}</div>}
                    <div style={{ padding: '0 11px 11px' }}>
                      <textarea style={ta} value={txt} onChange={(e) => setText(b.key, e.target.value)} placeholder="이 비트에서 일어나는 일·장면·심쿵·전환을 적어보세요…" />
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
        <button className="minibtn" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={addBeat}>＋ 비트 추가</button>
      </div>

      {/* 연계 바 */}
      <div style={{ ...foot, paddingBottom: 0 }} className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '원고 › 개요 폴더에 개요 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
        {relatedTools.map((id) => (
          <button key={id} className="linkbtn" onClick={() => openToolLinked(id, { genre: '로맨스판타지' })} title={`${relatedNames[id]} 열기`}>{emojify(relatedNames[id])}</button>
        ))}
      </div>

      {/* 하단 액션 */}
      <div style={foot}>
        <button className="btn-primary" onClick={copyAll}><Emoji e="📋" /> 전체 복사</button>
        <button className="minibtn" onClick={exportTxt}>⬇️ .txt 내보내기</button>
        <button className="minibtn" onClick={() => setOpen(Object.fromEntries(beats.map((b) => [b.key, true])))}>모두 펼치기</button>
        <button className="minibtn" onClick={() => setOpen({})}>모두 접기</button>
        <span style={{ flex: 1 }} />
        <button className="minibtn" style={{ color: 'var(--warn)' }} onClick={resetTpl}>이 구조 비우기</button>
      </div>
    </div>
  )
}
