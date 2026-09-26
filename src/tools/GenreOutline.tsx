// 판타지 개요(아웃라인) 빌더 — 판타지 장르 표준 구조(영웅의 여정/회귀·각성 연재형/로맨스판타지 회빙환/
// 그림다크 정치극/헌터·게이트 시스템물)에 맞춘 장·막 개요 템플릿을 채우는 도구.
// 템플릿을 고르면 그 결에 맞는 막·비트가 펼쳐지고, 각 비트에 내용을 적고(자동저장), 비트를 추가·삭제·순서변경한다.
// "비트 영감 굴리기"로 판타지 특화 슬롯(사건축·마법대가·종족정치·떡밥·전환장치)을 무작위 조합해 빈칸을 채울 글감을 만든다(잠금/재생성·조합수 표시, 1조+).
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크 없음(전부 로컬·자작 데이터). 언마운트 시 타이머 정리.
// 데이터: localStorage 'sry:tool:genre-outline' (템플릿별 비트 내용·작품 메타 보관).
// 연계: addToProject(root:'draft', folder:'개요') 로 바인더 원고에 개요 문서 추가, addToLibrary('snippets', ...) 로 굴린 영감을 글감 보관,
//       openToolLinked 로 관련 구조 도구(영웅의 여정·플롯 피라미드·장면 목록·세계관 위키) 열기.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'genre-outline',
  name: '판타지 개요 빌더',
  icon: '🏰',
  group: '구조',
  genre: '판타지',
  intro: '판타지 표준 구조(영웅서사·회귀각성·로판 회빙환·그림다크·헌터물)에 맞춘 장·막 개요를 채우고 비트 영감을 굴리세요',
  w: 720,
  h: 660,
}

const LS = 'sry:tool:genre-outline'

// ──────────────────────────────────────────────────────────────────────────
// 비트(개요 항목) 모델 — 막(act) 라벨로 묶이는 고정 비트 + 사용자가 더한 자유 비트
// ──────────────────────────────────────────────────────────────────────────
interface BeatDef {
  key: string
  act: string        // 막/구간 라벨
  title: string      // 비트 이름
  hint: string       // 이 비트에 무엇을 쓸지 안내(판타지 특화)
}
interface TemplateDef {
  key: string
  label: string
  icon: string
  tag: string        // 하위유형 한 줄 설명
  blurb: string      // 어떤 작품에 맞는지
  beats: BeatDef[]
}

// ── 1) 정통 하이판타지 — 영웅의 여정(12+막) ─────────────────────────────────
const T_HERO: BeatDef[] = [
  { key: 'h_world', act: '1막 · 출발', title: '일상 세계 · 결핍', hint: '주인공의 평범한 출신지(변경 마을·고아원·몰락 가문)와 결핍·꿈을 보여준다. 아직 마법·운명을 모른다.' },
  { key: 'h_call', act: '1막 · 출발', title: '모험의 부름 · 각성의 징조', hint: '예언·표식·습격·발견된 혈통. 일상을 깨는 사건. 첫 마법/이종족과의 조우로 경이감을 연출.' },
  { key: 'h_refuse', act: '1막 · 출발', title: '거부와 멘토', hint: '두려움으로 망설인다 → 현자·마법사·노기사 멘토가 등장해 진명·규칙·도구를 건넨다.' },
  { key: 'h_threshold', act: '1막 · 출발', title: '첫 관문 통과', hint: '고향을 떠나 미지의 세계로. 국경·마법 결계·던전 입구를 넘는 결단의 장면.' },
  { key: 'h_tests', act: '2막 · 입문', title: '시험 · 동료 · 적', hint: '일행(party) 결성: 엘프·드워프·도적·기사. 마법 체계의 규칙·비용을 실전으로 배운다.' },
  { key: 'h_magic', act: '2막 · 입문', title: '마법의 규칙과 한계 확립', hint: '하드 매직이면 비용·금기·약점을, 소프트 매직이면 경이·신비를 명확히 각인(이후 복선 회수의 토대).' },
  { key: 'h_approach', act: '2막 · 심화', title: '가장 깊은 동굴로 접근', hint: '봉인된 악·고대 유적·적의 본거지로 다가간다. 일행 내부 갈등·배신의 씨앗.' },
  { key: 'h_ordeal', act: '2막 · 심화', title: '시련의 핵심 · 멘토의 희생', hint: '죽음에 가까운 최대 위기. 흔히 멘토가 여기서 퇴장(죽음)해 주인공을 자립시킨다.' },
  { key: 'h_reward', act: '2막 · 심화', title: '보상 · 아티팩트 획득', hint: '시련의 대가로 마법 아이템·진실·각성을 얻는다. 의지·중독성을 가진 보물이면 깊어진다.' },
  { key: 'h_road', act: '3막 · 귀환', title: '귀환의 길 · 적의 역습', hint: '추격·반격. 봉인 해제 카운트다운. 스케일이 마을→왕국→대륙→세계로 확장된다.' },
  { key: 'h_climax', act: '3막 · 귀환', title: '최종 결전 · 복선 일괄 회수', hint: '마왕/대마법사/신과의 대결. 앞서 심은 규칙·아이템·예언이 결정타로 회수(샌더슨식 카타르시스).' },
  { key: 'h_return', act: '3막 · 귀환', title: '대가와 귀환 · 변화한 세계', hint: '승리의 비용(상실·후유증·세계의 변모)을 치른다. 변화한 주인공이 영약을 안고 돌아온다.' },
]

// ── 2) 웹소설 연재형 — 회귀·각성 사이다 누적 ────────────────────────────────
const T_WEB: BeatDef[] = [
  { key: 'w_hook', act: '도입 · 골든타임(1~3화)', title: '회귀/각성 트리거', hint: '죽음·바닥·굴욕 직후 회귀하거나 시스템에 각성. 첫 화에서 차별점과 후킹을 즉시 제시.' },
  { key: 'w_advantage', act: '도입 · 골든타임(1~3화)', title: '정보 우위 선언', hint: '미래 지식·전생 기억·시스템 안내로 "이번 생은 다르다". 독자에게 줄 사이다의 약속.' },
  { key: 'w_firstcider', act: '도입 · 골든타임(1~3화)', title: '첫 사이다', hint: '무시하던 자·가족·문파를 초반에 통쾌하게 역전. 회차 끝 클리프행어로 다음 화 견인.' },
  { key: 'w_system', act: '전개 · 성장 1부', title: '시스템·스테이터스 정립', hint: '레벨·스탯·스킬·등급(F~SSS)·상점·퀘스트 UI 규칙을 세운다. 성장의 가시화·즉각 보상.' },
  { key: 'w_episode', act: '전개 · 성장 1부', title: '단위 에피소드(던전·시험)', hint: '던전 공략·토너먼트·길드 의뢰의 연쇄. 회차당 최소 1회 카타르시스, 회차마다 떡밥-회수.' },
  { key: 'w_wall', act: '전개 · 성장 2부', title: '벽과 돌파 · 파워 인플레 관리', hint: '주인공 강화에 맞춰 더 강한 적·서열을 배치. "벽→각성→돌파" 리듬으로 인플레를 통제.' },
  { key: 'w_arc', act: '전개 · 성장 2부', title: '거대 떡밥 본격화', hint: '회귀의 원인·세계의 비밀·흑막의 정체 등 메인 서사를 가속. 단위 보상 위에 큰 미스터리를 얹는다.' },
  { key: 'w_lowest', act: '위기 · 전환', title: '최대 위기 · 소중한 것 상실', hint: '동료·근거지·힘을 잃는 고구마 구간. 다음 사이다의 낙차를 위해 굴욕·답답함을 축적.' },
  { key: 'w_break', act: '위기 · 전환', title: '진각성 · 숨은 패 개방', hint: '진명 해방·봉인 해제·히든 클래스 등 진짜 힘을 연다. 앞서 심은 설정의 회수로 정당화.' },
  { key: 'w_finalcider', act: '결말 · 최강의 사이다', title: '최강 역전 · 응징·등극', hint: '그동안 쌓인 모든 굴욕·떡밥을 한 번에 응징·회수. 랭킹 1위·세계 최강 등극의 압도적 카타르시스.' },
  { key: 'w_after', act: '결말 · 최강의 사이다', title: '후일담 · 다음 시즌 떡밥', hint: '보상받은 일상·관계 정리. 차기 흑막/신세계의 떡밥으로 연재 동력을 잇는다.' },
]

// ── 3) 로맨스 판타지 — 회빙환 + 황실 정치 + 로맨스 ──────────────────────────
const T_ROFAN: BeatDef[] = [
  { key: 'r_isekai', act: '발단 · 빙의/회귀', title: '원작 빙의·회귀 자각', hint: '소설/게임 속 악역영애·버림받은 황비 등으로 빙의/회귀. "원작에선 파멸하는 인물"임을 자각.' },
  { key: 'r_flag', act: '발단 · 빙의/회귀', title: '파멸 플래그 파악', hint: '죽음·파혼·유폐로 이어질 원작 전개와 데드라인을 정리. 회피·역행 목표를 세운다.' },
  { key: 'r_plan', act: '발단 · 빙의/회귀', title: '생존 전략 가동', hint: '미래 지식으로 가문·재산·인맥을 선점. 첫 사이다(무례한 약혼자 손절·악녀 응징).' },
  { key: 'r_meet', act: '전개 · 관계 형성', title: '남주와의 (재)만남', hint: '차갑지만 나에게만 다정한 황태자/공작/기사단장. 원작과 어긋나는 첫 호감·오해.' },
  { key: 'r_court', act: '전개 · 관계 형성', title: '황실·귀족 정치 진입', hint: '계승·파벌·신전·마탑의 권력 다툼. 사교계·연회에서의 기싸움과 동맹 구축.' },
  { key: 'r_pull', act: '전개 · 밀당', title: '끌림과 거리두기', hint: '서로의 비밀(저주·혈통·예언)이 둘을 묶고 또 가른다. 질투·보호·계약결혼 등 긴장 장치.' },
  { key: 'r_villain', act: '위기 · 음모', title: '원작 악역·흑막의 반격', hint: '진짜 여주인공·정적·흑마법사가 파멸 플래그를 다시 세운다. 누명·독살·납치의 위기.' },
  { key: 'r_truth', act: '위기 · 음모', title: '비밀 폭로 · 마음 시험', hint: '빙의/회귀 사실 혹은 출생의 비밀이 드러난다. 남주의 진심과 선택이 시험대에 오른다.' },
  { key: 'r_resolve', act: '절정 · 역전', title: '정치적·마법적 역전', hint: '증거·동맹·각성한 능력으로 흑막을 무너뜨린다. 누명 벗고 지위·명예를 되찾는 사이다.' },
  { key: 'r_happy', act: '결말 · 해피엔딩', title: '결합 · 새로운 위상', hint: '파혼·이혼 후 더 잘되거나, 황후·공작부인 등극. 원작을 완전히 갈아엎은 해피엔딩.' },
]

// ── 4) 다크 판타지(그림다크) — 정치·도덕적 회색지대 ─────────────────────────
const T_GRIM: BeatDef[] = [
  { key: 'g_world', act: '1부 · 잿빛 세계', title: '부패한 세계 제시', hint: '전쟁·역병·기근의 잔혹한 무대. 영웅도 악당도 없는 회색지대. 마법은 대가가 크고 불길하다.' },
  { key: 'g_pov', act: '1부 · 잿빛 세계', title: '다중 POV 진영 배치', hint: '대립 진영(왕가·반란·교단·용병)을 각자의 논리로 세운다. "안전한 인물은 없다".' },
  { key: 'g_spark', act: '1부 · 잿빛 세계', title: '불씨 사건', hint: '암살·배신·국경 충돌 등 모든 진영을 끌어들일 발화점. 음모의 실타래가 풀리기 시작.' },
  { key: 'g_scheme', act: '2부 · 음모', title: '정치 모략 가속', hint: '동맹과 배신이 교차한다. 도덕적 타협·고문·학살. 승리에 반드시 추한 비용이 따른다.' },
  { key: 'g_cost', act: '2부 · 음모', title: '마법·권력의 대가', hint: '금주(禁呪)·악마계약·인신공양의 부작용. 힘을 쓸수록 인간성을 잃는 침식의 묘사.' },
  { key: 'g_shock', act: '2부 · 음모', title: '충격적 죽음·반전', hint: '주연급의 죽음이나 신뢰의 붕괴로 판을 뒤엎는다(마틴식). 독자의 안전감을 깨뜨린다.' },
  { key: 'g_brink', act: '3부 · 파국', title: '벼랑 끝 · 고대 위협 대두', hint: '내전에 골몰한 사이 봉인된 악·이종족·종말의 군세가 진짜 위협으로 닥쳐온다.' },
  { key: 'g_battle', act: '3부 · 파국', title: '잔혹한 결전', hint: '명예 없는 진흙탕 전투. 승자도 만신창이. 누가 옳았는지조차 모호하게 남긴다.' },
  { key: 'g_price', act: '결말 · 잿더미', title: '값비싼 결말', hint: '구한 것보다 잃은 것이 무겁다. 권력은 손을 바꿨을 뿐. 씁쓸한 여운과 다음 비극의 씨앗.' },
]

// ── 5) 헌터·게이트 시스템물 — 현실 침투형 ───────────────────────────────────
const T_HUNTER: BeatDef[] = [
  { key: 'u_gate', act: '도입 · 각성', title: '게이트·던전 출현', hint: '현실에 게이트·던전·몬스터가 열린 세계관 전제. 각성자(헌터)와 등급 체계를 소개.' },
  { key: 'u_weak', act: '도입 · 각성', title: '약자 주인공의 굴욕', hint: 'E·F급 최약체로 무시·착취당하는 처지. 사이다를 위한 고구마 바닥을 깐다.' },
  { key: 'u_awake', act: '도입 · 각성', title: '특수 각성 · 시스템 획득', hint: '히든 클래스·전용 시스템·레벨업 능력을 홀로 얻는다. "나만의 치트"로 판을 뒤집을 토대.' },
  { key: 'u_grind', act: '전개 · 레이드', title: '던전 공략·레벨업', hint: '단위 던전·보스 레이드의 연쇄로 급성장. 스탯·스킬·아이템 보상을 가시적으로 쌓는다.' },
  { key: 'u_guild', act: '전개 · 레이드', title: '길드·랭커 사회 진입', hint: '길드·협회·세계 랭커의 권력 구도. 동료·라이벌·흑막 헌터를 배치한다.' },
  { key: 'u_secret', act: '전개 · 비밀', title: '게이트의 진실 떡밥', hint: '게이트의 기원·시스템의 정체·다가오는 대균열(종말) 등 메인 미스터리를 가속.' },
  { key: 'u_crisis', act: '위기 · 대균열', title: 'S급 재난·동료 상실', hint: '도시·국가를 위협하는 최상위 던전 브레이크. 소중한 것을 잃는 최대 위기 구간.' },
  { key: 'u_limit', act: '위기 · 대균열', title: '한계 돌파 · 진명 개방', hint: '히든 피스·전직·각성 2차로 진짜 힘을 연다. 앞선 시스템 설정의 회수로 정당화.' },
  { key: 'u_apex', act: '결말 · 정점', title: '최종 보스·세계 최강 등극', hint: '마왕급·시스템의 주인과의 결전. 모든 떡밥을 회수하며 세계 1위 헌터로 등극하는 카타르시스.' },
]

const TEMPLATES: TemplateDef[] = [
  { key: 'hero', label: '정통 하이판타지', icon: '⚔️', tag: '영웅의 여정 · 3막', blurb: '반지의 제왕·바람의 이름식 정통 영웅서사. 세계관 점진 공개, 복선 회수형 클라이맥스.', beats: T_HERO },
  { key: 'web', label: '웹소설 연재형', icon: '📱', tag: '회귀·각성 · 사이다 누적', blurb: '나혼렙·전독시식 연재형. 골든타임·회차 후킹·파워 인플레 관리·최강의 사이다.', beats: T_WEB },
  { key: 'rofan', label: '로맨스 판타지', icon: '👑', tag: '회빙환 · 황실 정치 · 로맨스', blurb: '재혼황후·상수리식 로판. 빙의/회귀 + 파멸 플래그 회피 + 황실 정치 + 로맨스.', beats: T_ROFAN },
  { key: 'grim', label: '다크 판타지', icon: '🗡️', tag: '그림다크 · 다중 POV · 정치', blurb: '얼불노·첫 번째 법칙식 그림다크. 도덕적 회색지대, 충격적 죽음, 값비싼 결말.', beats: T_GRIM },
  { key: 'hunter', label: '헌터·게이트물', icon: '🌀', tag: '현실 침투 · 시스템·레이드', blurb: '게이트·던전·각성자. 약자→최강, 시스템 성장, 대균열과 세계 최강 등극.', beats: T_HUNTER },
]
function tplDef(k: string): TemplateDef { return TEMPLATES.find((t) => t.key === k) || TEMPLATES[0] }

// ──────────────────────────────────────────────────────────────────────────
// 비트 영감 굴리기 — 판타지 특화 슬롯 풀(잠금/재생성, 조합수 표시)
//   문장 골격: [무대]의 [분위기] 속, [주인공]이 [사건축]을 맞닥뜨리고, [마법대가/규칙]이 발동하며,
//              [종족·세력]의 이해가 [걸린 것]을 두고 충돌한다. [복선·복병]이 끼어들고, 끝에 [전환장치]로 다음 비트를 연다.
// 조합수 = 9개 풀 길이의 곱(아래에서 자동 계산·표시) → 약 1.35조(26·20·26·24·24·22·22·20·18).
//   조사(이/가·을/를)는 josa() 헬퍼로 앞 글자 받침을 보고 실제 형태 하나만 출력(괄호 이중표기 금지).
// ──────────────────────────────────────────────────────────────────────────
const SLOT_STAGE = [ // 26
  '안개 낀 변경의 폐성', '서클 마법사들의 백색 마탑', '드워프 광맥 도시의 용광로 구역', '엘프 숲의 봉인된 신목 앞',
  '왕도의 지하 모험가 길드', '용의 둥지가 내려다보이는 협곡', '죽은 신을 모시는 폐허 신전', '얼어붙은 북방 성벽의 망루',
  '게이트가 열린 도심 한복판', '심연 던전 50층의 보스룸', '황실 대관식이 열리는 대성당', '바다 위를 떠다니는 마도 비공정',
  '망자가 잠들지 않는 저주받은 늪', '시간이 뒤틀린 회귀의 첫 새벽', '정령들이 깃든 고대 유적 회랑', '연회가 한창인 공작가 대연회장',
  '봉인석이 박힌 세계수의 뿌리', '용암이 흐르는 화산 요새의 알현실', '별이 떨어진 운석 분화구의 마나 호수', '국경을 가르는 대마법 결계 앞',
  '죽은 자의 이름을 새긴 지하 납골 미궁', '하늘에 떠 있는 부유 섬의 마탑', '몬스터 웨이브가 밀려오는 성벽 위', '귀족 사교계의 가면무도회장',
  '시간이 멈춘 고대 드래곤의 무덤', '저주받은 거울의 방',
]
const SLOT_HERO = [ // 26
  '버림받았다 회귀한 막내', '진명을 잃은 어린 마법사', '각성한 최약체 E급 헌터', '몰락 가문의 검술 천재',
  '원작 악역영애에 빙의한 자', '봉인된 마왕의 그릇이 된 소녀', '용의 피를 이은 사생아', '예언이 지목한 평범한 시골 소년',
  '죽음에서 돌아온 전대 용사', '계약으로 정령왕을 부리는 소환사', '신탁을 거부한 타락 성기사', '시스템만이 동료인 외톨이 랭커',
  '기억을 잃은 채 깨어난 리치', '금기를 어겨 추방된 궁정 마도사', '용을 죽이러 떠난 평민 출신 기사', '신을 잃은 마지막 사제',
  '환생을 거듭하는 영혼의 검사', '계약 결혼으로 황실에 들어간 영애', '저주에 걸린 짐승 인간', '히든 클래스를 각성한 무명 모험가',
  '예언을 위조하려는 음모가', '드워프 대장장이의 사생아 후계자', '엘프 의회에 잠입한 인간 첩자', '망령에 씐 어린 무녀',
  '회귀 전 자신을 죽인 자를 쫓는 복수자', '용병단을 이끄는 늙은 용살자',
]
const SLOT_EVENT = [ // 24
  '봉인된 고대 악의 균열이 벌어지고', '예언서의 한 구절이 눈앞에서 실현되며', '멘토가 마지막 비밀을 남기고 쓰러지고',
  '믿었던 동료의 배신이 드러나며', '던전 브레이크로 몬스터가 쏟아지고', '잊혔던 혈통의 표식이 피부에 떠오르며',
  '회귀 전 기억과 다른 미래가 분기하고', '황위 계승을 둘러싼 음모가 터지며', '금지된 유물의 봉인이 풀리고',
  '이종족 간 오랜 휴전이 깨지며', '죽었어야 할 인물이 멀쩡히 살아 돌아오고', '시스템이 숨겨둔 히든 퀘스트를 개방하며',
  '하늘에서 별이 떨어져 마나 폭풍이 일고', '오랜 가뭄 끝에 용이 잠에서 깨어나며', '왕이 독살당해 권력 공백이 생기고',
  '잃어버린 진명을 누군가 먼저 부르고', '정령과의 계약이 일방적으로 파기되며', '대규모 마물 사냥 대회가 열리고',
  '죽은 신의 권능이 부활의 조짐을 보이며', '국경 도시 전체가 하룻밤 새 사라지고', '금기의 네크로맨시가 망자 군세를 일으키며',
  '예언된 혜성이 백 년 만에 다시 떠오르고', '주인공의 목에 노예 계약 마법진이 새겨지며', '봉인을 지키던 마지막 수호자가 무너지고',
]
const SLOT_MAGIC = [ // 24
  '마나가 역류해 시전자의 수명을 갉아먹고', '진명을 부르는 대가로 기억 한 조각을 내주며', '금주(禁呪)의 반동이 주변을 침식하고',
  '계약한 정령이 더 큰 제물을 요구하며', '레벨업의 환희 뒤에 시스템의 함정이 도사리고', '저주가 한 세대를 건너 발현하며',
  '오러를 끌어올린 만큼 인간성이 마모되고', '소환수가 시전자의 통제를 벗어나려 하며', '봉인을 풀수록 마왕의 의식이 스며들고',
  '신성력이 신앙의 흔들림에 응답을 거두며', '시간을 되감은 만큼 인과의 빚이 쌓이고', '아티팩트가 사용자에게 중독과 광기를 속삭이며',
  '서클을 넘는 영창이 시전자의 감각을 하나씩 앗아가고', '흑마법의 대가로 그림자가 점점 옅어지며', '치유 마법이 시전자의 상처로 고스란히 옮겨오고',
  '용의 피를 각성할수록 이성을 잃어가며', '룬을 새길 때마다 피로 값을 치러야 하고', '예언의 힘은 한 번 입에 담으면 되돌릴 수 없으며',
  '환생의 권능이 사랑하는 이의 기억을 지워가고', '정령왕의 가호가 신앙의 배신에 등을 돌리며', '봉인 해제의 진언이 시전자를 그릇으로 삼으려 하고',
  '시스템의 버프 뒤에 숨은 디버프가 누적되며', '금단의 연금술이 시전자의 인간성을 재료로 요구하고', '마검의 갈증이 주인의 피를 탐하며',
]
const SLOT_FACTION = [ // 22
  '백마탑과 흑마법사 결사', '계승을 다투는 두 황자파', '인간 왕국과 엘프 의회', '헌터 협회와 비밀 길드',
  '교단의 광신도와 이단 심문관', '드워프 장인조합과 용병단', '신전 세력과 마탑 마법사', '회귀 전의 적이자 지금의 동맹',
  '용족과 그를 사냥하는 기사단', '망자의 군세와 살아남은 변경백', '상단 연합과 부패한 귀족원', '원작 여주인공파와 빙의자',
  '황실 근위대와 반역 공작가', '정령 부족과 개척 식민지', '암살자 길드와 정보 상인', '교회의 성기사단과 타락한 추기경',
  '랭커 연합과 신흥 길드의 신예', '고대 종족과 신생 인류 제국', '마도공학 기술자와 정통 마법사파', '회귀자를 노리는 운명의 관리자들',
  '봉인을 지키려는 수호 가문과 풀려는 광신도', '계약 정령들과 그들을 부리려는 소환사 협회',
]
const SLOT_STAKE = [ // 22
  '봉인 해제까지 남은 사흘', '주인공의 정체를 쥔 한 통의 편지', '왕국의 명운이 걸린 단 한 번의 결전',
  '되돌릴 수 없는 한 사람의 죽음', '랭킹 1위 자리와 세계의 인정', '파혼 플래그를 막을 마지막 기회',
  '잃어버린 진명을 되찾을 실마리', '대륙을 가를 예언의 진위', '동료를 살릴 단 하나의 제물',
  '흑막의 가면을 벗길 결정적 증거', '인플레된 적을 넘어설 숨은 패', '다음 회차로 이어질 거대한 떡밥',
  '봉인된 마왕을 다시 가둘 마지막 열쇠', '황위를 가를 한 표의 지지', '용의 둥지에 잠든 세계 최강의 아티팩트',
  '회귀 전 비극을 막을 단 한 번의 분기점', '신의 권능을 이을 후계자의 자격', '저주를 풀 잊힌 고대 의식의 진언',
  '몰락한 가문을 일으킬 마지막 마정석', '대균열을 막을 영웅 한 명의 희생', '진짜 흑막을 가린 가짜 범인의 자백',
  '연인의 목숨과 세계 사이의 선택',
]
const SLOT_MOOD = [ // 20
  '경이와 신비가 감도는', '불길한 예감이 짙게 깔린', '잿빛 절망이 무겁게 내려앉은', '음모와 가식이 번뜩이는',
  '피와 화약 냄새가 자욱한', '쓸쓸한 폐허의 정적이 흐르는', '축제의 들뜬 광기가 넘치는', '서늘한 살의가 스며든',
  '장엄한 신성함이 깃든', '뒤틀린 시간의 어지러움이 감도는', '숨 막히는 긴장이 팽팽한', '비통한 애도가 가득한',
  '냉혹한 권력 다툼이 끓는', '몽환적인 마법의 빛이 어른거리는', '야만적 생존 본능이 들끓는', '고고한 엘프적 우아함이 흐르는',
  '용암 같은 분노가 차오르는', '달콤하고 위태로운 밀당이 오가는', '망자의 한이 서린 음습한', '폭풍 전야의 무거운 고요가 깔린',
]
const SLOT_TWIST = [ // 20
  '믿었던 조력자가 흑막의 끄나풀이었음이 드러나고', '예언이 정반대로 해석되어야 했음이 밝혀지며', '주인공이 회귀자가 아니라 빙의된 자였음이 드러나고',
  '죽은 줄 알았던 멘토가 적으로 돌아오며', '구원의 아티팩트가 사실 봉인을 푸는 열쇠였고', '동료 중 하나가 진짜 마왕의 그릇임이 밝혀지며',
  '시스템 자체가 주인공을 시험하는 적이었음이 드러나고', '구한 줄 알았던 사람이 이미 바꿔치기 당했으며', '원작 악역이 실은 유일한 아군이었음이 드러나고',
  '진명을 부른 자가 자기 자신의 미래였고', '봉인된 악이 사실 세계를 지탱하는 기둥이었음이 밝혀지며', '용을 죽이면 더 큰 재앙이 풀리는 구조였고',
  '예언의 선택받은 자가 두 명이었음이 드러나고', '복수의 대상이 사실 자신을 지킨 은인이었으며', '회귀의 대가로 다른 세계 하나가 멸망하고 있었고',
  '신의 부활이 곧 인류의 종말을 뜻했음이 밝혀지며', '아군 진영 전체가 적의 긴 계략의 일부였고', '주인공의 각성이 곧 봉인 해제의 마지막 조건이었음이 드러나며',
  '죽은 신을 섬기던 교단이 사실 그 신을 봉인한 감시자였음이 밝혀지며', '대륙을 구한다던 예언서가 후대에 위조된 가짜였음이 드러나고',
]
const SLOT_TURN = [ // 18
  '클리프행어로 다음 비트를 연다', '거짓 승리로 판을 뒤집는다', '복선 한 줄을 슬쩍 심어 둔다',
  '예언을 비틀어 반전을 예고한다', '진각성의 징조로 끝맺는다', '멘토·동료의 희생으로 무게를 더한다',
  '사이다 직전 고구마로 낙차를 키운다', '흑막의 시점으로 장을 닫는다', '봉인 카운트다운을 한 칸 줄인다',
  '새 동료의 합류로 일행을 확장한다', '스케일을 한 단계 끌어올린다(마을→왕국)', '거짓 패배로 독자의 가슴을 졸이게 한다',
  '아티팩트의 숨은 능력을 처음 발현한다', '적의 인간적 사연을 드러내 입체화한다', '로맨스의 결정적 진전을 끼워 넣는다',
  '세계관의 큰 비밀 한 조각을 공개한다', '주인공의 숨겨진 과거 한 토막을 흘려 둔다', '다음 막의 무대가 될 새 지역을 예고한다',
]
const SLOTS: { key: string; label: string; pool: string[] }[] = [
  { key: 'stage', label: '무대', pool: SLOT_STAGE },
  { key: 'mood', label: '분위기', pool: SLOT_MOOD },
  { key: 'hero', label: '주인공', pool: SLOT_HERO },
  { key: 'event', label: '사건축', pool: SLOT_EVENT },
  { key: 'magic', label: '마법 대가·규칙', pool: SLOT_MAGIC },
  { key: 'faction', label: '종족·세력', pool: SLOT_FACTION },
  { key: 'stake', label: '걸린 것', pool: SLOT_STAKE },
  { key: 'twist', label: '복선·복병', pool: SLOT_TWIST },
  { key: 'turn', label: '전환 장치', pool: SLOT_TURN },
]
// 조합수: 각 풀 길이의 곱.
const COMBOS = SLOTS.reduce((n, s) => n * s.pool.length, 1)
function fmtCombos(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(n >= 1e13 ? 0 : 1).replace(/\.0$/, '') + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, '') + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, '') + '만'
  return n.toLocaleString('ko-KR')
}
function rndIdx(len: number): number { return Math.floor(Math.random() * len) }

// 한국어 조사 자동 선택 — 앞 글자의 받침 유무를 보고 실제 형태 하나만 출력(괄호 이중표기 금지).
// hasBatchim: 마지막 글자가 받침으로 끝나는지(완성형 한글 기준). 한글이 아니면 받침 없는 것으로 처리.
function hasBatchim(word: string): boolean {
  if (!word) return false
  const ch = word[word.length - 1]
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false // 한글 음절 아님 → 받침 없음 취급
  return (code - 0xac00) % 28 !== 0
}
// 받침 유 → withB, 받침 무 → noB. 예: josa(w,'을','를'), josa(w,'이','가'), josa(w,'은','는')
function josa(word: string, withB: string, noB: string): string { return word + (hasBatchim(word) ? withB : noB) }

// ──────────────────────────────────────────────────────────────────────────
// 저장 모델
// ──────────────────────────────────────────────────────────────────────────
interface UserBeat { id: string; act: string; title: string; hint?: string }
interface Store {
  title: string                                   // 작품 제목
  logline: string                                 // 한 줄 로그라인
  tpl: string                                     // 선택 템플릿 key
  // 템플릿별: 비트 key → 내용 텍스트
  texts: Record<string, Record<string, string>>
  // 템플릿별: 사용자가 더한 자유 비트
  extra: Record<string, UserBeat[]>
  // 템플릿별: 비트 표시 순서(키 배열). 없으면 기본 정의 순서.
  order: Record<string, string[]>
  done: Record<string, Record<string, boolean>>   // 비트 완료 체크
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return 'b_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function emptyStore(): Store {
  return { title: '', logline: '', tpl: 'hero', texts: {}, extra: {}, order: {}, done: {} }
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
    base.tpl = TEMPLATES.some((t) => t.key === p.tpl) ? p.tpl : 'hero'
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
export default function GenreOutline({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [note, setNote] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [showSpark, setShowSpark] = useState(false)
  // 영감 슬롯 현재 선택 인덱스 + 잠금
  const [picks, setPicks] = useState<Record<string, number>>(() => {
    const o: Record<string, number> = {}
    for (const s of SLOTS) o[s.key] = rndIdx(s.pool.length)
    return o
  })
  const [locks, setLocks] = useState<Record<string, boolean>>({})
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // payload.genre 활용 — 판타지 외 장르로 열려도 동작하되 안내.
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
    const hero = v('hero'); const stake = v('stake')
    return `${v('mood')} ${v('stage')}에서, ${josa(hero, '이', '가')} ${v('event')}, ${v('magic')}, ${v('faction')}의 이해가 ${josa(stake, '을', '를')} 두고 충돌하는 가운데, ${v('twist')}, 끝내 ${v('turn')}.`
  }
  const sparkToLibrary = () => {
    const item = addToLibrary('snippets', { text: sparkText(), source: '판타지 개요 빌더 · 비트 영감', tags: ['판타지', def.label] })
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
    lines.push(`# 판타지 개요 — ${def.label}${store.title ? ` · ${store.title}` : ''}`)
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
    parts.push(`<p><strong>판타지 개요 · ${esc(def.label)}</strong>${store.title ? ` — ${esc(store.title)}` : ''}</p>`)
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
      a.download = (store.title ? store.title.replace(/[\\/:*?"<>|]/g, '_') : 'fantasy-outline') + '-개요.txt'
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
        장르: '판타지',
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

  const relatedTools = ['hero-journey-map', 'plot-pyramid', 'scene-list', 'world-wiki', 'save-the-cat-beats']
  const relatedNames: Record<string, string> = {
    'hero-journey-map': '🗺️ 영웅의 여정', 'plot-pyramid': '⛰️ 플롯 피라미드', 'scene-list': '🎬 장면 목록',
    'world-wiki': '📚 세계관 위키', 'save-the-cat-beats': '🐱 비트 시트',
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
          <input style={{ ...input, flex: '3 1 260px' }} value={store.logline} onChange={(e) => setStore((s) => ({ ...s, logline: e.target.value }))} placeholder="로그라인 한 줄 (예: 회귀한 막내가 가문의 멸망을 되돌린다)" maxLength={200} aria-label="로그라인" />
        </div>

        <div style={tplRow}>
          {TEMPLATES.map((t) => (
            <button key={t.key} style={tplBtn(t.key === tkey)} onClick={() => switchTpl(t.key)} title={t.blurb}>
              <span style={{ fontWeight: 800 }}><Emoji e={t.icon}/> {t.label}</span>
              <span style={{ fontSize: 11, opacity: t.key === tkey ? 0.9 : 0.7 }}>{t.tag}</span>
            </button>
          ))}
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>{def.blurb}</div>

        <div style={barWrap}><div style={barFill} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, color: 'var(--muted)', gap: 10 }}>
          <span>채운 비트 <strong style={{ color: 'var(--text)' }}>{filled}</strong>/{beats.length} · 완료 <strong style={{ color: 'var(--ok)' }}>{doneCount}</strong> · <strong style={{ color: 'var(--accent)' }}>{pct}%</strong></span>
          <button className="minibtn" onClick={() => setShowSpark((v) => !v)} title="판타지 특화 슬롯으로 비트 영감을 무작위 조합">{showSpark ? <><Emoji e="🎲"/> 영감 닫기</> : <><Emoji e="🎲"/> 비트 영감 굴리기</>}</button>
        </div>

        {payloadGenre && payloadGenre !== '판타지' && (
          <div style={{ fontSize: 11.5, color: 'var(--warn)', lineHeight: 1.5 }}>이 도구는 판타지 전용이에요. (요청 장르: {payloadGenre})</div>
        )}
        {note && <div style={{ fontSize: 12, lineHeight: 1.5, color: note.startsWith('⚠️') ? 'var(--warn)' : 'var(--ok)' }}>{note}</div>}
      </div>

      {/* 영감 패널 */}
      {showSpark && (
        <div style={{ padding: '10px 14px 0' }}>
          <div style={sparkBox}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 13 }}><Emoji e="🎲"/> 판타지 비트 영감</strong>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>조합 가능 수 <strong style={{ color: 'var(--accent)' }}>{fmtCombos(COMBOS)}</strong>가지 ({COMBOS.toLocaleString('ko-KR')})</span>
              <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={roll}><Emoji e="🎲"/> 굴리기</button>
            </div>
            {SLOTS.map((s) => (
              <div key={s.key} style={slotRow}>
                <span style={{ width: 86, flexShrink: 0, color: 'var(--muted)', fontWeight: 600 }}>{s.label}</span>
                <span style={slotChip}>{s.pool[picks[s.key]]}</span>
                <button style={{ ...iconBtn, color: locks[s.key] ? 'var(--accent)' : 'var(--muted)' }} onClick={() => toggleLock(s.key)} title={locks[s.key] ? '잠금 해제' : '이 슬롯 잠그기(재굴림 제외)'} aria-label="슬롯 잠금">{locks[s.key] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
              </div>
            ))}
            <div style={{ fontSize: 13, lineHeight: 1.6, padding: '8px 10px', background: 'var(--chrome-2)', borderRadius: 8, border: '1px dashed var(--border)' }}>{sparkText()}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="minibtn" onClick={sparkInto} disabled={!beats.length}>↩ 빈 비트에 넣기</button>
              <button className="linkbtn" onClick={sparkToLibrary}><Emoji e="📌"/> 글감으로 보관</button>
              <button className="minibtn" onClick={sparkToCopy}><Emoji e="📋"/> 복사</button>
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
                  {extra && <button style={iconBtn} onClick={() => removeBeat(b.key)} title="삭제" aria-label="삭제"><Emoji e="🗑️"/></button>}
                  <button className="minibtn" style={{ flexShrink: 0 }} onClick={() => toggleOpen(b.key)} aria-expanded={isOpen}>{isOpen ? '접기 ▲' : '펼치기 ▼'}</button>
                </div>
                {isOpen && (
                  <>
                    {b.hint && <div style={hint}><Emoji e="💡"/> {b.hint}</div>}
                    <div style={{ padding: '0 11px 11px' }}>
                      <textarea style={ta} value={txt} onChange={(e) => setText(b.key, e.target.value)} placeholder="이 비트에서 일어나는 일·장면·전환을 적어보세요…" />
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
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '원고 › 개요 폴더에 개요 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        {relatedTools.map((id) => (
          <button key={id} className="linkbtn" onClick={() => openToolLinked(id, { genre: '판타지' })} title={`${relatedNames[id]} 열기`}>{emojify(relatedNames[id])}</button>
        ))}
      </div>

      {/* 하단 액션 */}
      <div style={foot}>
        <button className="btn-primary" onClick={copyAll}><Emoji e="📋"/> 전체 복사</button>
        <button className="minibtn" onClick={exportTxt}><Emoji e="⬇️"/> .txt 내보내기</button>
        <button className="minibtn" onClick={() => setOpen(Object.fromEntries(beats.map((b) => [b.key, true])))}>모두 펼치기</button>
        <button className="minibtn" onClick={() => setOpen({})}>모두 접기</button>
        <span style={{ flex: 1 }} />
        <button className="minibtn" style={{ color: 'var(--warn)' }} onClick={resetTpl}>이 구조 비우기</button>
      </div>
    </div>
  )
}
