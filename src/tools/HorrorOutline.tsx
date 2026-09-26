// 호러·공포 개요(아웃라인) 빌더 — 공포 장르 표준 구조(고딕·유령의 집 / 슬래셔 5단 / 우주적·포크 호러 /
// 악마·오컬트 빙의 / 서바이벌·아포칼립스 + 웹소설 도시괴담 연재형)에 맞춘 장·막 개요 템플릿을 채우는 도구.
// 템플릿을 고르면 그 결에 맞는 막(일상→균열→상승→포위→대면)과 비트가 펼쳐지고, 각 비트에 내용을 적고(자동저장),
// 비트를 추가·삭제·순서변경한다. "비트 영감 굴리기"로 호러 특화 슬롯(고립 공간·이상징후·괴물 규칙·금기 매개·시한·반전)을
// 무작위 조합해 빈칸을 채울 글감을 만든다(잠금/재생성·조합수 표시, 1조+).
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크 없음(전부 로컬·자작 데이터). 언마운트 시 타이머 정리.
// 데이터: localStorage 'sry:tool:horror-outline' (템플릿별 비트 내용·작품 메타 보관).
// 연계: addToProject(root:'draft', folder:'개요') 로 바인더 원고에 개요 문서 추가, addToLibrary('snippets', ...) 로 굴린 영감을 글감 보관,
//       openToolLinked 로 관련 구조·발상 도구(플롯 피라미드·장면 목록·클리프행어·세계관 위키 등) 열기.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'horror-outline',
  name: '호러 개요 빌더',
  icon: '🏚️',
  group: '구조',
  genre: '호러·공포',
  intro: '호러 표준 구조(고딕 유령의 집·슬래셔·우주적/포크 호러·빙의 오컬트·서바이벌)에 맞춘 일상→균열→상승→포위→대면 개요를 채우고 공포 비트 영감을 굴리세요',
  w: 720,
  h: 660,
}

const LS = 'sry:tool:horror-outline'

// ──────────────────────────────────────────────────────────────────────────
// 비트(개요 항목) 모델 — 막(act) 라벨로 묶이는 고정 비트 + 사용자가 더한 자유 비트
// 호러 표준 5단(일상→균열→상승→포위→대면)을 골격으로 하위장르별 결을 입힌다.
// ──────────────────────────────────────────────────────────────────────────
interface BeatDef {
  key: string
  act: string        // 막/구간 라벨
  title: string      // 비트 이름
  hint: string       // 이 비트에 무엇을 쓸지 안내(호러 특화)
}
interface TemplateDef {
  key: string
  label: string
  icon: string
  tag: string        // 하위유형 한 줄 설명
  blurb: string      // 어떤 작품에 맞는지
  beats: BeatDef[]
}

// ── 1) 고딕·유령의 집 — 힐 하우스·샤이닝식 심리적 헌티드 하우스 ───────────────
const T_HAUNT: BeatDef[] = [
  { key: 'gh_normal', act: '1막 · 일상(잃을 것)', title: '이사·정착 — 평범한 안전', hint: '인물과 관계, 새 집/저택을 정상 상태로 각인. "이 집만 있으면 다시 시작할 수 있다"는 희망과 잃으면 안 될 것(가족·아이·재기)을 심는다.' },
  { key: 'gh_house', act: '1막 · 일상(잃을 것)', title: '집의 내력 한 조각', hint: '싸게 나온 이유, 전 주인의 비극(살인·자살·매장), 봉인된 방·지하실·다락·우물. 동네 사람·부동산의 의미심장한 한마디로 불길함을 깐다.' },
  { key: 'gh_sign', act: '2막 · 균열(독자만 안다)', title: '첫 이상징후 — 설명 가능한 수준', hint: '문이 저절로 닫힘, 새벽 3시의 발소리, 차가워지는 방, 거울 속 잔상. 아직 "낡은 집·착각·바람"으로 합리화 가능. 주인공만 어렴풋이 느낀다.' },
  { key: 'gh_only', act: '2막 · 균열(독자만 안다)', title: '목격의 비대칭 — 나만 본다', hint: '아이/반려동물이 먼저 반응(보이지 않는 친구, 빈 곳을 향한 으르렁). 배우자·이웃은 "예민한 탓"이라며 안 믿어준다. 사회적 고립 시작.' },
  { key: 'gh_esc', act: '3막 · 상승(합리화 붕괴)', title: '강도·빈도의 상승', hint: '징후가 잦고 세진다. 물건의 위치가 바뀌고, 벽에 글씨가, 가족의 표정이 0.5초 늦게 바뀐다(언캐니). 합리적 설명이 무너지기 시작.' },
  { key: 'gh_dig', act: '3막 · 상승(합리화 붕괴)', title: '집의 과거 파헤치기', hint: '옛 일기·신문·교회 기록·지역 노인을 통해 비극의 전모와 원혼의 규칙("그날 시각", "이름을 부르면 안 된다")을 정보 적하(滴下)로 발견.' },
  { key: 'gh_rule', act: '3막 · 상승(합리화 붕괴)', title: '규칙·약점의 발견(복선 심기)', hint: '원혼을 묶거나 달랠 조건, 넘으면 안 될 선, 미완의 장례·억울한 죽음의 미스터리. 이후 클라이맥스에서 회수할 카드를 미리 깐다.' },
  { key: 'gh_trap', act: '4막 · 포위(안전지대 붕괴)', title: '고립 확정 — 빠져나갈 수 없다', hint: '집이 보내주지 않는다(문이 안 열림·폭설·정전·끊긴 전화). 공간 자체가 적대적 의지를 띤다. 첫 사상자 또는 결정적 위해.' },
  { key: 'gh_poss', act: '4막 · 포위(안전지대 붕괴)', title: '가족의 침식 — 안에서 무너진다', hint: '집이 가장 약한 가족을 잠식(샤이닝식). 사랑하던 이가 위협이 된다. 신뢰의 붕괴와 "누가 아직 그 사람인가"의 의심.' },
  { key: 'gh_face', act: '5막 · 대면·결말', title: '진실과의 대면 · 규칙의 사용', hint: '원혼의 정체·원한의 근원과 정면으로 마주한다. 앞서 심은 규칙(장례·이름·불·진실 밝히기)으로 맞선다. 데우스 엑스 마키나 금지.' },
  { key: 'gh_cost', act: '5막 · 대면·결말', title: '대가와 여운(열린 결말 권장)', hint: '탈출/진혼에 치른 값(상실·트라우마·신체손상). 마지막 컷의 불길한 징조(집은 다음 주인을 기다린다)로 찝찝한 여운을 남긴다.' },
]

// ── 2) 슬래셔 — 가면 살인마·final girl·인과응보 ─────────────────────────────
const T_SLASH: BeatDef[] = [
  { key: 'sl_cold', act: '프롤로그 · 콜드오픈', title: '과거의 비극(기원 사건)', hint: '수년 전 그 장소에서 벌어진 잔혹한 사건·죽음. 살인마 탄생의 씨앗(저주·복수·억울한 죽음·괴담). 첫 충격으로 톤을 박는다.' },
  { key: 'sl_group', act: '1막 · 일상', title: '청춘 무리의 나들이', hint: '캠프·산장·졸업여행으로 떠나는 또래 집단. 인물 유형(바람둥이·허세남·순수한 주인공)과 관계·죄(방종·오만)를 빠르게 각인.' },
  { key: 'sl_warn', act: '1막 · 일상', title: '경고와 무시', hint: '"그곳엔 가면 안 돼"라는 노인·주유소 직원·미친 전도사. 인물들은 비웃고 진입한다. 금기 위반의 도덕적 셋업.' },
  { key: 'sl_iso', act: '2막 · 고립', title: '고립 — 외부 차단', hint: '고장난 차, 안 터지는 휴대폰, 끊긴 도로·폭우. 무리는 세상에서 격리된다. 안전했던 공간이 덫으로 바뀐다.' },
  { key: 'sl_first', act: '2막 · 고립', title: '첫 희생 — 떨어진 자', hint: '"잠깐 나갔다 올게" 하고 혼자 떨어진 인물이 사라진다/죽는다. 보이지 않는 위협(그림자·발소리·부분 노출)으로 살인마를 암시.' },
  { key: 'sl_rule', act: '3막 · 사냥', title: '규칙·패턴 인지 + 한 명씩', hint: '죄지은 자부터 차례로(인과응보). 생존자들이 살인마의 정체·동기·약점의 단서를 모은다. 가짜 안도(false scare) 한 번 끼우기.' },
  { key: 'sl_reveal', act: '3막 · 사냥', title: '정체·동기의 폭로', hint: '가면 뒤의 진실(과거 사건과의 연결, 내부자였음, 죽은 줄 알았던 자). 미스터리의 핵심을 적하해 두었다가 여기서 회수.' },
  { key: 'sl_alone', act: '4막 · final girl', title: '마지막 생존자 홀로 남다', hint: '동료가 모두 쓰러지고 가장 무력했던 인물(흔히 순수·기지의 주인공)만 남는다. 수동 → 능동으로의 전환점.' },
  { key: 'sl_fight', act: '4막 · final girl', title: '추격·반격·즉석 무장', hint: '도망에서 맞섬으로. 지형·도구·살인마의 약점을 이용한 즉석 전투. final girl의 기지와 의지가 빛난다.' },
  { key: 'sl_kill', act: '5막 · 대면·결말', title: '결정적 일격 — 거짓 죽음', hint: '쓰러뜨렸다고 믿는 순간. 잠깐의 안도. 슬래셔의 정석은 여기서 한 번 더 일어나게 두는 것.' },
  { key: 'sl_last', act: '5막 · 대면·결말', title: '최후의 점프스케어·열린 결말', hint: '시신이 사라졌다, 마지막에 손이 불쑥, 살인마는 끝내 안 죽었다. 속편의 씨앗과 존재론적 찝찝함을 남긴다.' },
]

// ── 3) 우주적·포크 호러 — 러브크래프트·위커맨·미드소마식 ─────────────────────
const T_COSMIC: BeatDef[] = [
  { key: 'cf_arrive', act: '1막 · 진입(외부인)', title: '외부인의 도착 — 합리의 세계', hint: '학자·기자·여행자 등 합리적 주인공이 외딴 마을/유적/연구지에 도착. 도시의 상식과 일상을 잣대로 가져온다(잃을 인식 틀).' },
  { key: 'cf_warm', act: '1막 · 진입(외부인)', title: '과도한 친절·어긋난 풍습', hint: '지나치게 환대하는 주민, 미소가 늦는 사람, 외부 통신 두절. "친절함이 더 무섭다". 미세하게 잘못된 일상(언캐니)을 깐다.' },
  { key: 'cf_clue', act: '2막 · 호기심', title: '금지된 지식의 단서', hint: '읽지 말라는 고서, 가지 말라는 숲·신전, 봉인된 기록. 주인공의 학구열·호기심이 발동한다. 판도라 구조의 셋업.' },
  { key: 'cf_dig', act: '2막 · 호기심', title: '조사 — 의식의 달력', hint: '벽화·문헌·노래에서 주기적 의식(하지·수확제·백 년 주기)과 인신공양·제물의 규칙을 해독. 정해진 날이 다가온다는 카운트다운.' },
  { key: 'cf_glimpse', act: '3막 · 침식', title: '존재의 일부만 — off-screen 공포', hint: '괴물/신을 끝까지 보여주지 말 것. 그림자·실루엣·물 위의 윤곽·미쳐버린 목격자의 횡설수설로만 암시. 상상이 묘사보다 무섭다.' },
  { key: 'cf_mad', act: '3막 · 침식', title: '인식의 붕괴 — 알아버린 자의 처벌', hint: '진실의 파편을 안 자가 미쳐가거나 사라진다. 화자의 신뢰성이 흔들린다(꿈인가 현실인가). 무력함·왜소함의 공포.' },
  { key: 'cf_trap', act: '4막 · 포위', title: '공동체의 포획 — 도망갈 곳 없음', hint: '마을 전체가 한통속이었다(위커맨식). 도주로가 막히고, 친절했던 이들이 제관(祭官)이 된다. 주인공이 제물로 점지된다.' },
  { key: 'cf_ritual', act: '4막 · 포위', title: '의식의 본격 진행', hint: '불·노래·가면·행렬의 의식. 무력한 주인공의 저항이 의식의 일부로 흡수된다. 인간의 척도가 무의미함을 체감.' },
  { key: 'cf_unveil', act: '5막 · 대면·결말', title: '거대한 진실의 (부분) 현현', hint: '신/존재가 부분적으로 드러나거나, 의식이 완성된다. 승리 같은 건 없다 — 이해를 넘어선 것 앞의 절대적 무력.' },
  { key: 'cf_seed', act: '5막 · 대면·결말', title: '집어삼켜짐 또는 미친 생존(열린 결말)', hint: '주인공은 제물이 되거나, 정신이 부서진 채 살아남아 아무도 안 믿는 진실을 안고 있다. 세계는 변함없이 굴러가고 그것은 여전히 거기 있다.' },
]

// ── 4) 악마·오컬트 — 빙의·엑소시즘·사이비 ───────────────────────────────────
const T_OCCULT: BeatDef[] = [
  { key: 'oc_normal', act: '1막 · 일상', title: '평범한 가정/공동체', hint: '신앙이 옅거나 회의적인 가족·신부·조사자. 사랑하는 대상(아이·자매·신도)을 정상 상태로 보여준다. 잃을 영혼을 만든다.' },
  { key: 'oc_open', act: '1막 · 일상', title: '문이 열린 계기 — 부지불식의 위반', hint: '위자보드·폐가 답사·금지된 기도·저주받은 물건 입수. 무심코 건드린 금기로 무언가가 들어온다. 본인은 아직 모른다.' },
  { key: 'oc_symp', act: '2막 · 균열', title: '증상의 시작 — 의학적 의심', hint: '대상의 인격 변화·실신·낯선 언어·몸의 이상. 처음엔 정신과·내과로 설명하려 한다. "초자연인가 정신병인가"의 모호함 유지.' },
  { key: 'oc_esc', act: '2막 · 균열', title: '초자연의 명백화', hint: '의학으로 설명 안 되는 현상(부유·괴력·미래 발설·성물 거부). 회의적이던 인물이 흔들린다. 빙의의 규칙을 관찰하기 시작.' },
  { key: 'oc_lore', act: '3막 · 상승', title: '정체 규명 — 악령의 이름·규칙', hint: '구마사제·민속학자·옛 문헌을 통해 악령의 정체·이름·계약 조건·약점(성수·소금·진명 호명)을 적하로 밝힌다. 클라이맥스 카드 심기.' },
  { key: 'oc_doubt', act: '3막 · 상승', title: '믿음의 시험 · 거짓 회복', hint: '악령이 가족을 이간하고 조사자의 죄책감·과거를 파고든다. 잠깐 나아진 듯한 거짓 회복(false relief) 뒤 더 큰 발현.' },
  { key: 'oc_seal', act: '4막 · 포위', title: '고립과 사상자 — 퇴로 차단', hint: '폭풍·정전 속 의식 강행. 조력자의 죽음/타락. 악령이 더 깊이 장악하고 숙주의 목숨이 카운트다운에 들어간다.' },
  { key: 'oc_rite', act: '4막 · 포위', title: '구마 의식의 사투', hint: '엑소시즘의 직접 충돌. 악령의 거짓말·환영·도발. 시전자의 신앙·죄·트라우마가 무기이자 약점으로 작동한다.' },
  { key: 'oc_face', act: '5막 · 대면·결말', title: '진명 호명·희생을 통한 추방', hint: '심어둔 규칙(진명·신앙·자기희생)을 사용해 악령을 몰아낸다. 핵심 인물의 희생으로 판돈을 올린다.' },
  { key: 'oc_jump', act: '5막 · 대면·결말', title: '옮겨간 저주(열린 결말)', hint: '구한 듯하지만 악령은 다른 숙주·물건으로 옮겨갔다. 전염 구조의 잔존. 마지막 시선·미소로 불길함을 남긴다.' },
]

// ── 5) 서바이벌·아포칼립스 — 감염·좀비·괴물 종말물(웹소설형 포함) ───────────────
const T_SURV: BeatDef[] = [
  { key: 'sv_normal', act: '1막 · 발단(초반 후킹)', title: '평범한 하루 — 곧 끝날 세계', hint: '주인공의 일상과 관계(지킬 사람·일터·집). 웹소설형이면 회귀/예지로 "이번엔 안다"는 정보 우위를 1~3화 내 제시.' },
  { key: 'sv_outbreak', act: '1막 · 발단(초반 후킹)', title: '발발 — 첫 감염/출현', hint: '뉴스의 이상 보도, 거리의 비명, 첫 감염자/괴물의 등장. 평범한 도시가 순식간에 지옥이 된다. 초반 3화 내 첫 공포 사건.' },
  { key: 'sv_flee', act: '2막 · 탈출·생존', title: '필사의 탈출 + 첫 상실', hint: '안전지대를 향한 도주. 인파·붕괴·차단된 길. 가까운 한 사람을 잃으며 "이건 진짜다"를 각인. 생존의 잔혹한 룰을 학습.' },
  { key: 'sv_rule', act: '2막 · 탈출·생존', title: '괴물의 규칙 파악', hint: '소리에 반응, 빛을 싫어함, 무는 순간 전염, 밤에만 활동 등 작동 규칙을 관찰·정립. 규칙 위반 = 죽음. 독자에게 긴장의 룰을 준다.' },
  { key: 'sv_band', act: '3막 · 무리·거점', title: '생존자 규합 + 인간 위협', hint: '낯선 생존자들과의 동행. 괴물보다 무서운 인간(약탈·배신·통제). 신뢰와 자원 분배의 갈등. 진짜 적은 누구인가.' },
  { key: 'sv_grow', act: '3막 · 무리·거점', title: '거점 구축 · (웹소설) 성장·사이다', hint: '안전가옥·바리케이드 구축, 보급 확보. 웹소설형이면 능력·정보 우위로 위협을 통쾌하게 역전하는 단위 카타르시스를 회차마다.' },
  { key: 'sv_break', act: '4막 · 포위(거점 붕괴)', title: '거점 붕괴 · 대규모 습격', hint: '벽이 뚫리고 무리가 흩어진다. 내부 배신 또는 변종(進化)의 등장. 안전이 환상이었음이 드러나며 최대 위기.' },
  { key: 'sv_sac', act: '4막 · 포위(거점 붕괴)', title: '핵심 인물의 희생', hint: '누군가 문을 닫고 남거나 감염을 숨기다 변한다. 판돈을 끝까지 올리는 죽음. "다음은 누구라도 죽을 수 있다".' },
  { key: 'sv_face', act: '5막 · 대면·결말', title: '최후의 돌파·근원과의 대면', hint: '괴물의 근원(0번 환자·여왕·연구소)이나 마지막 관문과 맞선다. 앞서 정립한 규칙을 역이용한 돌파. 생존자의 반격.' },
  { key: 'sv_after', act: '5막 · 대면·결말', title: '생존의 대가 · 끝나지 않은 종말', hint: '살아남아도 세계는 폐허, 일행은 줄었다. 변종의 잔존·새 발발 조짐(열린 결말). 웹소설형이면 다음 시즌 떡밥으로 동력 유지.' },
]

const TEMPLATES: TemplateDef[] = [
  { key: 'haunt', label: '고딕·유령의 집', icon: '🏚️', tag: '헌티드 하우스 · 심리적 원혼', blurb: '힐 하우스·샤이닝식 심리 헌티드 하우스. 집의 내력=공포의 근원, 합리화 붕괴, 안에서 무너지는 가족, 찝찝한 열린 결말.', beats: T_HAUNT },
  { key: 'slash', label: '슬래셔', icon: '🔪', tag: '가면 살인마 · final girl', blurb: '13일의 금요일·스크림식 슬래셔. 콜드오픈→고립→한 명씩(인과응보)→정체 폭로→final girl 반격→거짓 죽음·점프스케어.', beats: T_SLASH },
  { key: 'cosmic', label: '우주적·포크 호러', icon: '🐙', tag: '러브크래프트 · 위커맨·미드소마', blurb: '외부인의 진입, 금지된 지식, off-screen 공포, 마을 전체의 의식·인신공양, 이해 너머의 무력함. 승리 없는 결말.', beats: T_COSMIC },
  { key: 'occult', label: '악마·오컬트', icon: '😈', tag: '빙의 · 엑소시즘 · 사이비', blurb: '엑소시스트식 빙의·구마물. 무심코 연 문, 의학적 의심→초자연, 악령의 이름·규칙, 신앙의 시험, 옮겨가는 저주.', beats: T_OCCULT },
  { key: 'surv', label: '서바이벌·아포칼립스', icon: '🧟', tag: '감염·좀비·괴물 종말 (웹소설형)', blurb: '발발→탈출→무리·거점→붕괴→돌파. 괴물의 규칙, 괴물보다 무서운 인간, 거점 함락. 웹소설형 회귀·사이다 옵션 포함.', beats: T_SURV },
]
function tplDef(k: string): TemplateDef { return TEMPLATES.find((t) => t.key === k) || TEMPLATES[0] }

// ──────────────────────────────────────────────────────────────────────────
// 비트 영감 굴리기 — 호러 특화 슬롯 풀(잠금/재생성, 조합수 표시)
//   문장 골격: [분위기] 깔린 [고립 공간]에서, [취약한 인물]이 [이상징후]를 마주하고,
//              [괴물·위협]은 [작동 규칙]으로 다가오며, [금기·매개]를 건드린 대가로 [시한·걸린 것]에 몰린다.
//              [반전]이 드러나고, 끝내 [전환 장치]로 다음 비트를 연다.
// 조합수 = 10개 풀 길이의 곱(아래에서 자동 계산·표시) → 38조 이상.
// ──────────────────────────────────────────────────────────────────────────
const SLOT_PLACE = [ // 28
  '눈에 갇혀 고립된 산장', '전 주인이 목을 맨 낡은 저택', '새벽이면 발소리가 도는 다락방',
  '물이 차오르는 지하 보일러실', '안개에 잠긴 외딴 등대', '폐쇄된 정신병원의 격리동',
  '신호가 끊긴 심해 잠수함', '백 년째 의식을 치르는 외딴 섬 마을', '환자가 사라진 새벽의 응급병동',
  '아무도 내리지 않는 막차 지하철', '거울만 가득한 폐백화점 분장실', '문이 하나뿐인 지하 벙커',
  '인형으로 가득 찬 골동품 가게', '관이 늘어선 시골 교회 지하 납골당', '전등이 깜빡이는 야간 주차타워',
  '눈 덮인 남극 연구기지', '저주받은 비디오가 도는 옛 집의 거실', '제물의 흔적이 남은 수확제 마을',
  '폐광으로 이어지는 갱도 막장', '아이의 그림이 벽을 채운 빈 유치원', '정전된 고층 아파트의 비상계단',
  '시신을 닦는 장례식장 안치실', '한밤의 무인 휴게소 화장실', '봉인된 우물이 있는 시골 본가 뒤뜰',
  '환풍기 소리만 도는 새벽 편의점', '폭우에 갇힌 산속 폐교', '귀가 멍해지는 무향실(無響室)',
  '시계가 모두 3시에 멈춘 빈집',
]
const SLOT_MOOD = [ // 22
  '숨 막히는 정적이 깔린', '곧 무언가 일어날 듯 불길한', '축축하고 곰팡내 나는', '피비린내가 옅게 감도는',
  '등골이 서늘해지는', '누군가 지켜보는 느낌이 드는', '시간이 멈춘 듯 고요한', '광기가 스멀스멀 차오르는',
  '향내와 촛농 냄새가 떠도는', '뒤틀린 꿈처럼 어지러운', '서늘한 살의가 스며든', '망자의 한이 서린',
  '편집증이 번지는', '잿빛 절망이 내려앉은', '익숙한데 미세하게 잘못된 언캐니한', '비명조차 삼키는 무거운',
  '폭풍 전야의 팽팽한', '인간의 척도가 무의미해지는', '온기가 빠르게 사라지는', '웃음소리가 더 섬뜩한',
  '곰팡이와 쇳내가 뒤엉킨', '귓속을 파고드는 이명이 도는',
]
const SLOT_VICTIM = [ // 26
  '이사 온 지 사흘 된 어린 자매', '아무도 믿어주지 않는 예민한 엄마', '회의적인 젊은 신부',
  '졸업여행 온 또래 무리의 막내', '진실을 캐려는 호기심 많은 기자', '딸을 잃고 무너진 형사',
  '아이의 보이지 않는 친구를 본 보모', '폐가를 답사하던 영상 유튜버', '야간 당직만 도는 신참 간호사',
  '회귀해 종말을 미리 아는 평범한 직장인', '정전된 건물에 홀로 남은 경비원', '치매 노모를 돌보는 외동딸',
  '죽은 쌍둥이의 흔적을 쫓는 동생', '마을의 환대가 거북한 외지 학자', '저주받은 물건을 산 골동품상',
  '실종된 친구를 찾아온 대학생', '신앙을 잃은 늙은 구마사제', '괴담을 취재하는 라디오 PD',
  '거울 속 자신이 달리 움직임을 본 화가', '막차에 홀로 탄 야근 노동자', '연구기지에 고립된 막내 대원',
  '아이를 지키려는 임신부', '약을 끊은 뒤 헛것이 보이는 청년', '비디오를 본 뒤 이레가 남은 주인공',
  '제물로 점지된 줄 모르는 여행자', '동료가 하나씩 변해가는 걸 지켜보는 생존자',
]
const SLOT_SIGN = [ // 24
  '새벽 3시마다 같은 발소리가 나고', '거울 속 자신이 0.5초 늦게 따라 움직이며', '아이가 빈 곳을 향해 웃고',
  '방 안 공기가 갑자기 차가워지며', '문이 저절로 천천히 열리고', '벽에서 긁는 소리가 새어 나오며',
  '반려동물이 한구석을 향해 으르렁대고', '사진 속 인물의 위치가 매번 바뀌며', '라디오에서 지직거리는 속삭임이 끼어들고',
  '복도 끝 그림자가 사라지지 않으며', '가족의 표정이 미세하게 늦게 바뀌고', '같은 하루가 자꾸 반복되며',
  '전등이 깜빡이다 두 눈처럼 빛나고', '벽지 아래에서 무언가 기어 다니는 소리가 나며', '냉장고 안에서 노랫소리가 들리고',
  '인형의 시선이 늘 자신을 향해 있으며', '욕실 거울에 김 서린 손자국이 생기고', '시계가 모두 같은 시각에 멈추며',
  '문틈으로 들여다보는 눈이 스치고', '집 안의 모든 문이 한밤에 활짝 열리며', '아이 방에서 어른 발소리가 나고',
  '창밖에 있을 리 없는 얼굴이 비치며', '녹음테이프에 없던 숨소리가 섞이고', '벽 너머에서 자기 이름을 부르는 소리가 들리며',
]
const SLOT_THREAT = [ // 24
  '목매 죽은 전 주인의 원혼', '가면을 쓴 정체불명의 살인마', '이름을 부르면 다가오는 무언가',
  '인형에 깃든 악령', '비디오를 본 자를 이레 뒤 데려가는 저주', '숙주를 갈아타는 고대 악령',
  '이해를 넘어선 심해의 존재', '마을 전체가 섬기는 잿빛 신', '물린 자를 동족으로 바꾸는 감염체',
  '빛이 닿지 않는 곳에서만 움직이는 그림자', '거울 너머에서 건너오려는 도플갱어', '아이의 모습을 한 굶주린 것',
  '죽은 자의 이름을 새기는 망령', '소리에 반응해 달려드는 변종', '꿈속에서 사람을 죽이는 존재',
  '제물을 기다리는 우물 속 무언가', '산 자를 흉내 내는 흉물', '신도를 늘리는 사이비 교주와 그 신',
  '밤마다 한 명씩 데려가는 숲의 것', '피를 탐하는 늙은 흡혈괴', '기억을 먹고 자라는 기생체',
  '얼굴이 없는 추격자', '죽은 줄 알았던, 결코 죽지 않는 자', '벽 속에 봉인됐다 풀려난 존재',
]
const SLOT_RULE = [ // 22
  '밤에만, 불이 꺼진 곳에서만 나타나고', '이름을 세 번 부르면 곧장 다가오며', '눈을 마주치면 따라붙고',
  '소리를 내는 자를 먼저 노리며', '거울·반사면을 통해서만 건너오고', '물린 자는 정해진 시간 뒤 같은 것이 되며',
  '집 밖으로는 결코 나오지 못하고', '정해진 시각(3시)에만 힘을 얻으며', '규칙을 어긴 자만 처벌하고',
  '제물이 채워질 때까지 멈추지 않으며', '본 사람을 다른 사람에게 옮겨 붙고', '진명을 알아야만 쫓아낼 수 있으며',
  '성수·소금·불에 잠시 물러나고', '믿지 않는 자에게는 보이지 않으며', '약속·계약을 어긴 대가로 발동하고',
  '해가 뜨면 힘을 잃으며', '죄지은 자부터 차례로 노리고', '기록·사진에 찍히지 않으며',
  '한 번 들인 자는 절대 내보내지 않고', '같은 비극을 반복하게 만들며', '죽음의 순간을 흉내 내야 봉인되고',
  '봉인을 풀면 그릇이 된 자를 데려간다',
]
const SLOT_TABOO = [ // 22
  '열지 말라던 지하실 문을 열고', '읽지 말라던 고서의 구절을 소리 내 읽으며', '봉인된 우물의 뚜껑을 들추고',
  '위자보드로 말을 걸며', '버려진 인형을 집에 들이고', '죽은 자의 이름을 함부로 부르며',
  '저주받은 비디오를 끝까지 보고', '가지 말라던 숲으로 들어서며', '제단의 촛불을 꺼뜨리고',
  '거울을 천으로 덮지 않은 채 잠들며', '낯선 자의 초대를 받아들이고', '금지된 기도문을 외우며',
  '시신을 제대로 묻지 않고', '약속한 제물을 바치지 않으며', '봉인의 부적을 떼어 내고',
  '한밤에 거울을 깊이 들여다보며', '들으면 안 될 노랫소리를 따라 부르고', '문지방을 넘지 말라는 금기를 어기며',
  '죽은 이의 유품을 함부로 태우고', '폐가에서 사진을 찍어 가져오며', '"괜찮아, 미신일 뿐"이라며 경고를 무시하고',
  '호기심에 의식의 마지막 절차를 따라 한',
]
const SLOT_STAKE = [ // 22
  '해가 뜨기 전까지 남은 한 시간', '저주가 발동할 이레째 자정', '봉인이 풀리기까지 남은 사흘',
  '아직 변하지 않은 막내의 목숨', '거점이 무너지기 직전의 마지막 밤', '의식이 완성될 수확제의 새벽',
  '아무도 믿어주지 않는 단 한 사람의 증언', '구마 의식을 끝낼 마지막 진명', '탈출구로 통하는 단 하나의 열쇠',
  '아이를 데려가기 전 막을 마지막 기회', '저주를 다음 사람에게 떠넘기지 않을 양심', '진실을 기록한 마지막 테이프',
  '변해가는 동료를 멈출 단 한 발', '제물 명단에서 이름을 지울 유일한 길', '문이 다시 닫히기 전의 몇 초',
  '구조대가 닿기까지 버텨야 할 하룻밤', '원혼을 진혼할 미완의 장례', '거울이 깨지기 전 건너오지 못하게 막을 순간',
  '감염이 도시를 삼키기 전의 골든타임', '가족을 다시 사람으로 되돌릴 마지막 의식', '괴물의 약점을 증명할 단 한 번의 실험',
  '연인의 목숨과 마을 전체 사이의 선택',
]
const SLOT_TWIST = [ // 22
  '구해준 사람이 사실 제관(祭官)이었음이 드러나고', '화자가 이미 첫 장면에서 죽어 있었음이 밝혀지며', '괴물이 실은 주인공 자신이었고',
  '저주는 끊긴 게 아니라 다음 사람에게 옮겨갔으며', '죽은 줄 알았던 살인마가 멀쩡히 일어나고', '믿었던 가족이 진작 그것에 잠식돼 있었음이 드러나며',
  '모든 게 약을 끊은 주인공의 환각이었을 수도 있고', '마을 전체가 처음부터 한통속이었음이 밝혀지며', '봉인된 존재가 실은 더 큰 악을 막고 있었고',
  '구원자로 믿은 사제가 진짜 그릇이었으며', '아이의 보이지 않는 친구가 유일한 진실이었고', '거울 속의 자신이 이미 바깥으로 나와 있었음이 드러나며',
  '0번 환자가 가장 가까운 동료였고', '경고하던 노인이 사실 그것의 화신이었으며', '탈출에 성공한 줄 알았는데 같은 집 안이었고',
  '제물은 외부인이 아니라 처음부터 그들 자신이었음이 드러나며', '죽인 줄 알았던 것이 모습만 바꿔 곁에 있었고', '반복되던 하루가 이미 사후세계였음이 밝혀지며',
  '구해낸 아이가 더 이상 그 아이가 아니었고', '저주를 푼 대가로 더 오래된 무언가가 깨어났음이 드러나며',
  '유일한 생존자의 증언이 처음부터 거짓이었음이 밝혀지고', '안전했던 바깥세상이 이미 같은 것에 삼켜졌음이 드러나며',
]
const SLOT_TURN = [ // 18
  '점프스케어로 장을 끊는다', '거짓 안도 직후 진짜 공격으로 뒤집는다', '복선 한 줄을 슬쩍 심어 둔다',
  '규칙의 첫 위반과 처벌로 끝맺는다', '목격의 비대칭(나만 봤다)으로 고립을 심화한다', '핵심 인물의 죽음으로 무게를 더한다',
  'off-screen으로 존재를 일부만 흘린다', '카운트다운을 한 칸 줄여 시한을 조인다', '신뢰할 수 없는 화자의 의심을 남긴다',
  '거짓 승리로 독자의 가슴을 졸이게 한다', '괴물 시점으로 장을 닫아 위협을 키운다', '드레드(곧 일어날 예감)를 길게 끌어 둔다',
  '안전지대가 무너지는 첫 신호를 보인다', '괴물의 규칙 한 조각을 새로 드러낸다', '잘못된 안도(false scare)로 호흡을 푼다',
  '마지막 컷의 불길한 징조로 여운을 남긴다', '구조 신호가 끊기는 소리로 장을 닫는다', '평온한 일상 컷을 끼워 다음 충격을 위해 방심시킨다',
]
const SLOTS: { key: string; label: string; pool: string[] }[] = [
  { key: 'mood', label: '분위기', pool: SLOT_MOOD },
  { key: 'place', label: '고립 공간', pool: SLOT_PLACE },
  { key: 'victim', label: '취약한 인물', pool: SLOT_VICTIM },
  { key: 'sign', label: '이상징후', pool: SLOT_SIGN },
  { key: 'threat', label: '괴물·위협', pool: SLOT_THREAT },
  { key: 'rule', label: '작동 규칙', pool: SLOT_RULE },
  { key: 'taboo', label: '금기·매개', pool: SLOT_TABOO },
  { key: 'stake', label: '시한·걸린 것', pool: SLOT_STAKE },
  { key: 'twist', label: '반전', pool: SLOT_TWIST },
  { key: 'turn', label: '전환 장치', pool: SLOT_TURN },
]
// 조합수: 각 풀 길이의 곱. (22·28·26·24·24·22·22·22·22·18 ≈ 3.89×10^13 → 약 38조)
const COMBOS = SLOTS.reduce((n, s) => n * s.pool.length, 1)
function fmtCombos(n: number): string {
  if (n >= 1e16) return (n / 1e16).toFixed(n >= 1e17 ? 0 : 1).replace(/\.0$/, '') + '경'
  if (n >= 1e12) return (n / 1e12).toFixed(n >= 1e13 ? 0 : 1).replace(/\.0$/, '') + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, '') + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, '') + '만'
  return n.toLocaleString('ko-KR')
}
function rndIdx(len: number): number { return Math.floor(Math.random() * len) }

// 한글 받침 유무로 조사 자동 선택(괄호 이중표기 금지). 마지막 한글 음절 기준,
// 받침 없으면 후자(모음형), 있으면 전자(자음형). ㄹ 받침은 '로/으로'에서 예외 처리.
function lastSyl(w: string): number {
  const m = w.match(/[가-힣](?=[^가-힣]*$)/) // 끝쪽 마지막 한글 음절
  return m ? m[0].charCodeAt(0) : -1
}
function jong(w: string): number { // 받침 코드(0=없음), 한글 아니면 -1
  const c = lastSyl(w)
  if (c < 0) return -1
  return (c - 0xac00) % 28
}
function josaEunNeun(w: string): string { const j = jong(w); return w + (j > 0 ? '은' : '는') }
function josaIGa(w: string): string { const j = jong(w); return w + (j > 0 ? '이' : '가') }

// ──────────────────────────────────────────────────────────────────────────
// 저장 모델
// ──────────────────────────────────────────────────────────────────────────
interface UserBeat { id: string; act: string; title: string; hint?: string }
interface Store {
  title: string                                   // 작품 제목
  logline: string                                 // 한 줄 로그라인
  tpl: string                                     // 선택 템플릿 key
  texts: Record<string, Record<string, string>>  // 템플릿별: 비트 key → 내용 텍스트
  extra: Record<string, UserBeat[]>              // 템플릿별: 사용자가 더한 자유 비트
  order: Record<string, string[]>                // 템플릿별: 비트 표시 순서(키 배열)
  done: Record<string, Record<string, boolean>>   // 비트 완료 체크
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return 'hb_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function emptyStore(): Store {
  return { title: '', logline: '', tpl: 'haunt', texts: {}, extra: {}, order: {}, done: {} }
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
    base.tpl = TEMPLATES.some((t) => t.key === p.tpl) ? p.tpl : 'haunt'
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
export default function HorrorOutline({ payload }: { payload?: Record<string, unknown> }) {
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

  // payload.genre 활용 — 호러 외 장르로 열려도 동작하되 안내.
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
    return `${v('mood')} ${v('place')}에서, ${josaIGa(v('victim'))} ${v('sign')}. ${josaEunNeun(v('threat'))} ${v('rule')}, ${v('taboo')} 대가로 ${v('stake')}에 몰린다. 그러다 ${v('twist')}, 끝내 ${v('turn')}.`
  }
  const sparkToLibrary = () => {
    const item = addToLibrary('snippets', { text: sparkText(), source: '호러 개요 빌더 · 공포 비트 영감', tags: ['호러·공포', def.label] })
    flash(item ? '굴린 공포 비트 영감을 글감(스니펫)에 보관했어요.' : '글감 보관에 실패했어요.', !item)
  }
  const sparkToCopy = async () => {
    const text = sparkText()
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); flash('공포 비트 영감을 복사했어요.'); return }
    } catch {}
    try {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.focus(); ta.select(); const ok = document.execCommand('copy'); document.body.removeChild(ta)
      flash(ok ? '공포 비트 영감을 복사했어요.' : '복사에 실패했어요.', !ok)
    } catch { flash('복사에 실패했어요.', true) }
  }
  // 선택한 비트의 내용으로 끼워넣기 — 첫 빈 비트 또는 첫 비트에.
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
    lines.push(`# 호러 개요 — ${def.label}${store.title ? ` · ${store.title}` : ''}`)
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
    parts.push(`<p><strong>호러 개요 · ${esc(def.label)}</strong>${store.title ? ` — ${esc(store.title)}` : ''}</p>`)
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
      a.download = (store.title ? store.title.replace(/[\\/:*?"<>|]/g, '_') : 'horror-outline') + '-개요.txt'
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
        장르: '호러·공포',
        구조: def.label,
        로그라인: store.logline.trim() || '(없음)',
        진행: `${filled}/${beats.length} (${pct}%)`,
      },
    })
    flash(id ? '원고(개요)에 호러 개요 문서를 추가했어요.' : '프로젝트에 연결되지 않았습니다.', !id)
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

  const relatedTools = ['plot-pyramid', 'scene-list', 'cliffhanger-forge', 'sensory-palette', 'creature-designer', 'world-wiki']
  const relatedNames: Record<string, string> = {
    'plot-pyramid': '⛰️ 플롯 피라미드', 'scene-list': '🎬 장면 목록', 'cliffhanger-forge': '🪝 클리프행어 단조기',
    'sensory-palette': '🎨 감각 팔레트', 'creature-designer': '🦎 창작 생물 설계기', 'world-wiki': '📚 세계관 위키',
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
          <input style={{ ...input, flex: '3 1 260px' }} value={store.logline} onChange={(e) => setStore((s) => ({ ...s, logline: e.target.value }))} placeholder="로그라인 한 줄 (예: 이사 온 집의 지하실이 가족을 하나씩 삼킨다)" maxLength={200} aria-label="로그라인" />
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
          <button className="minibtn" onClick={() => setShowSpark((v) => !v)} title="호러 특화 슬롯으로 공포 비트 영감을 무작위 조합">{showSpark ? <><Emoji e="🎲" /> 영감 닫기</> : <><Emoji e="🎲" /> 공포 비트 영감 굴리기</>}</button>
        </div>

        {payloadGenre && payloadGenre !== '호러·공포' && (
          <div style={{ fontSize: 11.5, color: 'var(--warn)', lineHeight: 1.5 }}>이 도구는 호러·공포 전용이에요. (요청 장르: {payloadGenre})</div>
        )}
        {note && <div style={{ fontSize: 12, lineHeight: 1.5, color: note.startsWith('⚠️') ? 'var(--warn)' : 'var(--ok)' }}>{emojify(note)}</div>}
      </div>

      {/* 영감 패널 */}
      {showSpark && (
        <div style={{ padding: '10px 14px 0' }}>
          <div style={sparkBox}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 13 }}><Emoji e="🎲" /> 공포 비트 영감</strong>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>조합 가능 수 <strong style={{ color: 'var(--accent)' }}>{fmtCombos(COMBOS)}</strong>가지 ({COMBOS.toLocaleString('ko-KR')})</span>
              <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={roll}><Emoji e="🎲" /> 굴리기</button>
            </div>
            {SLOTS.map((s) => (
              <div key={s.key} style={slotRow}>
                <span style={{ width: 92, flexShrink: 0, color: 'var(--muted)', fontWeight: 600 }}>{s.label}</span>
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
                      <textarea style={ta} value={txt} onChange={(e) => setText(b.key, e.target.value)} placeholder="이 비트에서 일어나는 공포·균열·전환을 적어보세요…" />
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
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '원고 › 개요 폴더에 호러 개요 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
        {relatedTools.map((id) => (
          <button key={id} className="linkbtn" onClick={() => openToolLinked(id, { genre: '호러·공포' })} title={`${relatedNames[id]} 열기`}><Emoji e={relatedNames[id]} /></button>
        ))}
      </div>

      {/* 하단 액션 */}
      <div style={foot}>
        <button className="btn-primary" onClick={copyAll}><Emoji e="📋" /> 전체 복사</button>
        <button className="minibtn" onClick={exportTxt}><Emoji e="⬇️" /> .txt 내보내기</button>
        <button className="minibtn" onClick={() => setOpen(Object.fromEntries(beats.map((b) => [b.key, true])))}>모두 펼치기</button>
        <button className="minibtn" onClick={() => setOpen({})}>모두 접기</button>
        <span style={{ flex: 1 }} />
        <button className="minibtn" style={{ color: 'var(--warn)' }} onClick={resetTpl}>이 구조 비우기</button>
      </div>
    </div>
  )
}
