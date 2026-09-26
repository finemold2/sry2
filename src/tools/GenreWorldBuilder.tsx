// 판타지 세계관 빌더 (판타지 / 세계관) — 도시에(dossier)에 근거해 판타지 세계 한 편을 항목별로 구조화하는 설정 빌더.
//  좌측: 세계 목록(선택·검색·추가·삭제·순서이동). 우측: 선택 세계 편집.
//  설계 축(도시에 §8 Worldbuilding Checklist + §4 서사 장치): 분기·지리·마법체계·종족·정치·종교/신화·경제/기술·역사/연표·고대위협·언어명명·서사장치.
//  각 섹션마다 도시에에 뿌리내린 "설계 질문"을 두어 빈칸을 메우게 하고, 슬롯 풀 무작위 영감(잠금/재생성, 조합수 표시 — 19조 이상)도 제공.
//  사전류(어휘/클리셰): 카테고리 펼침 + 검색 + 무작위 + 클릭복사.
//  모든 데이터는 localStorage('sry:tool:genre-worldbuilder')에 JSON 자동 저장/복원. 언마운트 정리.
//  연계: addToProject(root:research, folder:'세계관' setting 카드) · hasProjectBridge · addToLibrary('places'|'snippets') · openToolLinked.
//  import 는 react 와 './linkbus' 만 사용한다(다른 모듈 금지).
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'genre-worldbuilder',
  name: '판타지 세계관 빌더',
  icon: '🏰',
  group: '세계관',
  genre: '판타지',
  intro: '분기·지리·마법체계·종족·정치·종교·경제·역사·고대위협·명명까지 판타지 세계 한 편을 설계하는 빌더',
  w: 780,
  h: 660,
}

const LS_KEY = 'sry:tool:genre-worldbuilder'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const norm = (s: string) => s.trim().toLowerCase()
function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

// 받침 유무에 따라 조사 한쪽을 골라 붙인다(이중표기 "을(를)" 노출 방지).
function hasJong(word: string): boolean {
  const m = (word || '').trim()
  if (!m) return false
  const ch = m[m.length - 1]
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false // 한글 음절이 아니면 받침 없음으로 간주
  return (code - 0xac00) % 28 !== 0
}
// 조사 부착: josa(단어,'을','를') → 받침 있으면 '을', 없으면 '를'
function josa(word: string, withJong: string, withoutJong: string): string {
  return (word || '') + (hasJong(word) ? withJong : withoutJong)
}

function fmtBig(n: number): string {
  if (n >= 1e16) return (n / 1e16).toFixed(2).replace(/\.?0+$/, '') + '경'
  if (n >= 1e12) return (n / 1e12).toFixed(2).replace(/\.?0+$/, '') + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(2).replace(/\.?0+$/, '') + '만'
  return n.toLocaleString('ko-KR')
}

function fmtDate(ms: number): string {
  try {
    const d = new Date(ms)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  } catch { return '' }
}

// ───────────────────────── 선택형 축(도시에 §1 분기, §4 마법 분류) ─────────────────────────
const SUBGENRES = [
  { v: '하이 판타지 (독립 세계)', d: '지구와 무관한 2차 세계. 세계관 자체가 주인공. 톨킨·마틴·로스퍼스 계보.' },
  { v: '로우 판타지', d: '현실 세계에 마법·이종족이 침투. 도시 판타지의 모태.' },
  { v: '어반 판타지 (현대 도시)', d: '현대 도시 배경의 마법. 드레스덴 파일·해리 포터 계열.' },
  { v: '이세계 전이·전생 (이고깽·환생)', d: '현실 인물이 다른 세계로. 스테이터스 창·길드·모험가 등급 관습.' },
  { v: '헌터물·게이트물', d: '현실에 던전·게이트가 열리고 각성자 등장. 시스템 메시지 UI 차용.' },
  { v: '다크 판타지 (그림다크)', d: '도덕적 회색지대·폭력·정치. 애버크롬비·말라잔 계열.' },
  { v: '로맨스 판타지 (로판)', d: '회귀·빙의·환생 + 귀족/황실 정치 + 로맨스. 재혼황후·악역영애.' },
  { v: '소드 앤 소서리', d: '영웅 개인의 모험 중심. 코난·드리즈트.' },
] as const

const MAGIC_HARDNESS = [
  { v: '하드 매직 (명시적 규칙)', d: '규칙·비용·한계가 분명해 플롯 해결 도구로 쓸 수 있다(샌더슨식). 복선 회수형 카타르시스.' },
  { v: '소프트 매직 (신비·분위기)', d: '규칙 불명·경이 연출용(톨킨식). 플롯 해결에 쓰면 데우스 엑스 마키나 위험.' },
  { v: '하이브리드 (혼합)', d: '주인공 능력은 하드하게, 배경의 고대 마법은 소프트하게 운용.' },
  { v: '시스템·스테이터스형', d: '레벨/스탯/스킬/퀘스트로 수치화. 성장의 가시화·즉각 보상(웹소설).' },
] as const

const TECH_LEVEL = [
  '석기·부족 시대', '청동기 도시국가', '고전 고대(그리스·로마풍)', '암흑기 초기 중세',
  '전성기 중세(검·갑옷·성)', '르네상스·화약 도입기', '마도공학(마법-산업 융합)', '근현대 + 마법 잔존',
] as const

// ───────────────────────── 무작위 영감 슬롯 풀(도시에 §7 어휘·§8 체크리스트 근거 자작) ─────────────────────────
// 조합수 = 모든 풀 길이의 곱 → 19조 이상(시대상 슬롯 추가로 확장).
const POOLS = {
  지형: ['끝없이 떠 있는 부유 군도', '잿빛 화산재가 덮인 흑요석 평원', '거대 세계수가 떠받치는 대륙', '얼어붙은 영구 황혼의 설원', '안개에 잠긴 늪지 미궁', '하늘을 찌르는 수정 첨봉 산맥', '바다가 위로 흐르는 역류 해안', '버섯 숲이 빛나는 지하 동공', '사막 아래 잠든 유리 도시', '천 개의 폭포가 갈라 놓은 협곡', '소금 바다 위 산호 군락', '뒤집힌 산이 매달린 협만', '거인의 유골 위에 세운 도시', '백 년에 한 번 갈라지는 마(魔)의 장벽', '시간이 느리게 흐르는 안개 분지', '용암 강이 흐르는 검은 화산 군도'],
  마나원천: ['죽은 신의 심장에서 새어 나오는 신력', '대지 정맥을 흐르는 영맥(靈脈)', '별빛을 응축한 천공의 에테르', '망자의 영혼을 태우는 흑마력', '계약으로 빌리는 정령의 권능', '핏줄에 새겨진 고대 혈통 마법', '진명(眞名)을 부르는 언어의 힘', '세계의 균형에서 빌려 쓰는 등가교환', '심연에서 속삭이는 금단의 권속', '룬 문자에 봉인된 응축 마력', '꿈과 무의식에서 길어 올리는 환력', '신앙의 기도가 응결된 성력(聖力)', '대지에 박힌 운석의 마정석', '계절의 순환에서 빌리는 자연력'],
  마나대가: ['수명을 깎아 쓴다', '기억이 하나씩 지워진다', '쓸수록 인간성을 잃고 괴물화한다', '세계의 균형이 그만큼 무너진다', '시전자의 감정을 제물로 바친다', '마력 고갈 시 며칠을 혼수 상태로', '대가로 신체 일부가 굳거나 변형된다', '쓴 만큼 광기·환청이 침식한다', '주변 생명력을 빨아들여 시든다', '금기를 어기면 권속이 영혼을 회수한다', '쓸 때마다 진짜 이름을 한 글자씩 잃는다', '대가로 가장 소중한 기억을 바친다'],
  종족: ['숲의 노래로 대화하는 장수 엘프', '지하 용광로의 룬 대장장이 드워프', '비늘과 독을 지닌 냉혈의 나가', '바람을 읽는 깃털 수인 하피', '돌의 기억을 가진 거석 골렘족', '달빛에 변신하는 늑대 부족', '물 위 도시를 짓는 어인족', '소박하나 끈질긴 반인족', '잿더미에서 부활하는 불사 종족', '꿈을 먹고 사는 그림자 정령', '하늘 고래를 타는 유목 비행민', '거짓을 말 못 하는 수정 인간', '명예 문화를 지닌 오크 전사 부족', '뿔과 계약 마법을 쓰는 마족', '두 영혼을 한 몸에 지닌 쌍생 종족', '나무와 한 몸으로 자라는 식물인'],
  정치체제: ['아홉 마탑이 분할 통치하는 마법사 과두정', '용과 계약한 황실의 절대 군주정', '죽은 왕을 강령해 자문하는 망령 의회', '길드 연합이 실권을 쥔 상인 공화국', '신탁으로 다스리는 신정 교단국', '계절마다 수도가 바뀌는 유랑 왕국', '대귀족 가문들의 끝없는 권력 암투', '각성자 길드가 국가를 대신하는 헌터 사회', '봉인된 마왕을 감시하는 수도기사단 연맹', '핏줄 서열로 결정되는 엄격한 카스트 제국', '선출된 현자가 한 세대만 다스리는 합의제', '용병단·자유도시들의 느슨한 동맹', '예언자의 말이 곧 법인 신정 부족 연합'],
  종교: ['빛과 어둠 쌍신을 섬기는 균형 신앙', '죽은 별을 애도하는 침묵 교단', '용을 창조주로 여기는 비늘 신앙', '윤회와 진명을 믿는 영혼교', '봉인된 마왕을 신으로 숭배하는 이단', '대지모신과 풍요의 다신교', '운명의 실을 짜는 세 자매 여신', '인간을 시험하는 무관심한 옛 신들', '순교와 정화의 불꽃 교단', '금지된 심연의 권속 숭배', '조상의 혼을 모시는 가문 제사 신앙', '신은 죽었다 선언한 이성주의 교단'],
  고대위협: ['천 년의 봉인이 풀려 가는 잠든 마왕', '하늘에서 천천히 내려오는 붕괴의 달', '기억을 먹어 치우는 회색 역병', '대륙을 삼키는 끝없는 마(魔)의 숲', '죽은 자를 일으키는 영맥의 부패', '예언된 별들의 정렬과 차원 균열', '신들이 버리고 간 텅 빈 옥좌', '바다 밑에서 깨어나는 태초의 거신', '문명을 정체시키는 마력의 고갈', '세계의 기억을 지우는 망각의 안개', '계절을 멈춰 버린 영원한 겨울', '세계를 다시 쓰려는 창조신의 귀환'],
  마법물품: ['소원을 들어주되 대가를 요구하는 반지', '주인의 죄를 비추는 거울 검', '한 번만 죽음을 되돌리는 모래시계', '진명을 가두는 봉인의 책', '피를 먹고 강해지는 굶주린 도끼', '길 잃은 자에게만 길을 여는 등불', '거짓말을 베지 못하는 정직의 창', '주인의 수명을 연료로 쓰는 비행 망토', '봉인된 정령이 깃든 호박 목걸이', '미래의 한 장면을 보여주는 수정구', '쓴 자의 죄책감을 먹는 면류관', '두 세계를 잇는 부서진 열쇠'],
  대표생물: ['하늘을 가르는 고대 화염룡', '영맥을 수호하는 수정 와이번', '안개 속에 숨은 그림자 늑대', '죽은 도시를 떠도는 강철 골렘', '노래로 뱃사람을 홀리는 세이렌', '비늘이 갑옷인 늪지의 거대 도롱뇽', '별빛을 먹고 빛나는 천공 고래', '봉인을 지키는 머리 셋 달린 케르베로스', '재로 둥지를 짓는 불사조', '땅속을 헤엄치는 거대 석충(石蟲)', '거짓말을 알아채는 일각수', '인간의 얼굴을 한 수수께끼의 스핑크스', '얼음 숨결의 설원 거신', '꿈에만 나타나는 몽마(夢魔)'],
  갈등축: ['왕좌를 둘러싼 형제·가문의 내전', '인간과 이종족의 오랜 종족 전쟁', '마법사 계급과 평민의 신분 갈등', '봉인 유지파 대 해방파의 신학 분쟁', '제국의 변방 식민과 토착민 저항', '두 신앙 간 성전(聖戰)', '길드·상단의 자원·교역로 쟁탈', '예언의 아이를 둘러싼 추격과 보호', '마도공학 발전이 부른 구·신 질서 충돌', '봉인된 옛 동맹의 배신과 귀환', '회귀자가 바꾸려는 정해진 비극', '신이 정한 운명에 맞서는 반역'],
  분위기: ['경이와 동화 같은 밝은 모험극', '잔혹하고 정치적인 회색 서사', '쓸쓸하고 장엄한 황혼의 비가', '음울하고 고딕한 공포의 결', '유쾌하고 풍자적인 활극', '신화적이고 경건한 서사시', '냉혹한 생존과 약육강식', '향수 어린 잃어버린 황금기', '통쾌한 역전과 사이다의 성장담', '몽환적이고 초현실적인 신비'],
  시대상: ['오랜 전란이 끝나고 불안한 평화가 깔린 종전 직후', '낡은 왕조가 무너지고 새 질서가 다투어 들어서는 격변기', '풍요와 사치가 절정에 이른 황금기의 끝자락', '대재앙으로 문명 절반이 무너진 잿더미의 재건기', '오랜 고립이 깨지고 미지의 대륙과 처음 교류하는 대항해기', '낡은 신앙이 흔들리고 새 사상이 퍼지는 각성의 시대', '마도공학의 발명이 옛 질서를 송두리째 뒤엎는 격동의 산업기', '예언된 종말을 앞두고 두려움이 번지는 카운트다운의 말세', '오래 잠들었던 영웅·유물이 깨어나기 시작한 부활의 여명', '강대국의 그늘 아래 작은 나라들이 숨죽인 패권의 시대', '국경이 굳게 닫히고 서로를 의심하는 단절과 봉쇄의 시대', '잊혔던 고대 문명의 유적이 곳곳에서 발굴되는 탐험의 전성기'],
} as const
type PoolKey = keyof typeof POOLS

const COMBO_COUNT = (Object.keys(POOLS) as PoolKey[]).reduce((acc, k) => acc * POOLS[k].length, 1)

// ───────────────────────── 섹션 정의 + 설계 질문(도시에 근거) ─────────────────────────
interface SectionDef { key: keyof WorldFields; label: string; icon: string; ph: string; questions: string[] }
const SECTIONS: SectionDef[] = [
  {
    key: 'geography', label: '지리·지도', icon: '🗺️',
    ph: '대륙·왕국·산맥·바다·미지의 땅, 지역 간 거리와 경계, 자연이 빚은 문명…',
    questions: [
      '주 무대가 되는 대륙·왕국·도시는 어디이며 서로 얼마나 떨어져 있는가?',
      '넘기 어려운 자연 경계(산맥·바다·사막·숲)는 무엇이고 무엇을 가로막는가?',
      '"미지의 땅"(아무도 돌아오지 못한 곳)이 어디 있으며 왜 위험한가?',
      '기후·지형이 그곳 사람들의 삶·성격·산업을 어떻게 빚었는가? (보여주되 설명하지 말 것)',
      '스케일이 마을→도시→왕국→대륙→세계로 어떻게 확대될 수 있는가?',
    ],
  },
  {
    key: 'magic', label: '마법 체계', icon: '✨',
    ph: '마력의 원천·습득법·규칙·비용·한계·금기·사회적 위상…',
    questions: [
      '마법의 원천은 무엇인가? (신·자연·혈통·계약·진명·영맥)',
      '누가 어떻게 마법을 얻고 익히는가? 아무나 쓰는가, 선택받은 자만 쓰는가?',
      '【샌더슨 제2법칙】 능력보다 "한계·약점·비용"이 무엇인가? (마나 고갈·부작용·금기·정신 침식)',
      '하드(규칙형)인가 소프트(신비형)인가? 플롯 해결에 쓸 셈인가, 경이 연출용인가?',
      '마법사는 사회에서 어떤 지위에 있는가? (경외·탄압·지배·천대)',
    ],
  },
  {
    key: 'races', label: '종족·문화', icon: '🧝',
    ph: '이종족의 외형·수명·가치관, 종족 간 역사와 갈등, 클리셰를 비트는 지점…',
    questions: [
      '어떤 종족들이 있고 외형·수명·가치관은 어떻게 다른가?',
      '엘프=고결, 드워프=구두쇠 같은 클리셰를 어떻게 비틀어 차별화할 것인가?',
      '종족 간 과거의 전쟁·동맹·원한은 무엇인가?',
      '각 종족이 인간(또는 주인공)을 어떻게 바라보는가?',
      '한 종족만의 번역 불가능한 핵심 가치·금기가 있다면?',
    ],
  },
  {
    key: 'politics', label: '정치·권력', icon: '👑',
    ph: '왕국·제국·교단·길드·마탑의 구조, 계승·음모·전쟁, 권력의 정당화…',
    questions: [
      '권력은 누구에게 있으며 어떻게 정당화되는가? (혈통·신탁·힘·부)',
      '주요 세력(왕실·교단·길드·마탑·귀족)은 무엇을 두고 다투는가?',
      '왕위·가주 계승은 어떻게 이뤄지고 어떤 음모가 끼어드는가?',
      '지금 전쟁·내전·긴장이 어디서 끓고 있는가?',
      '평민·노예·이방인은 이 질서 안에서 어떤 위치인가?',
    ],
  },
  {
    key: 'religion', label: '종교·신화', icon: '⛩️',
    ph: '신·판테온·창세 신화·교리·의례·금기, 신앙이 마법·정치와 얽히는 방식…',
    questions: [
      '무엇을(누구를) 숭배하며 신은 실재하는가, 침묵하는가?',
      '창세 신화의 핵심 한 줄은? 세상은 어떻게 시작되고 끝난다고 믿는가?',
      '신앙이 마법·정치·전쟁을 어떻게 정당화하거나 제약하는가?',
      '가장 큰 금기와 이단은 무엇이며 어기면 어떻게 되는가?',
      '죽음·내세·운명을 사람들은 어떻게 받아들이는가?',
    ],
  },
  {
    key: 'economy', label: '경제·기술', icon: '⚙️',
    ph: '기술 수준, 화폐·교역로·산업·희소 자원, 마법이 경제·기술을 대체/왜곡하는 방식…',
    questions: [
      '기술 수준은 어느 정도인가? 무엇을 만들고 무엇을 못 만드는가?',
      '마법이 기술·노동·전쟁·경제를 어떻게 대체하거나 왜곡하는가? (마도공학 등)',
      '화폐·교역로·주요 산업과, 누구나 탐내는 희소 자원은 무엇인가?',
      '빈부·계급은 어떻게 갈리고 그것이 갈등의 씨앗이 되는가?',
      '길드·상단·장인 조합은 어떤 힘을 가지는가?',
    ],
  },
  {
    key: 'history', label: '역사·연표', icon: '📜',
    ph: '고대 대전쟁·왕조 흥망·봉인의 기원 — "과거가 현재의 위협을 설명한다"…',
    questions: [
      '이 세계의 흐름을 바꾼 고대의 대전쟁·재앙은 무엇인가?',
      '현재 왕조·질서는 어떻게 세워졌고 무엇 위에 서 있는가?',
      '봉인·예언·저주의 기원은 언제, 왜 생겼는가?',
      '"잊혀진 진실"(역사책이 거짓말하는 부분)은 무엇인가?',
      '과거의 어떤 빚이 현재의 위협으로 돌아오는가?',
    ],
  },
  {
    key: 'threat', label: '고대 위협·예언', icon: '🐉',
    ph: '봉인된 악·잠든 마왕·고대의 위협, 예언, 다가오는 종말의 카운트다운…',
    questions: [
      '세계를 위협하는 봉인된 악·고대의 존재는 무엇인가?',
      '봉인은 무엇으로 유지되며 어떻게, 왜 풀려 가고 있는가?',
      '핵심 예언 한 줄은? 정공법(예언대로)인가 비틀기(오역·자기실현·반전)인가?',
      '"선택받은 자"는 무엇으로 정당화되며, 그 클리셰를 어떻게 변주할 것인가?',
      '클라이맥스에서 어떤 복선·규칙·아이템이 결정타로 회수될 수 있는가?',
    ],
  },
  {
    key: 'naming', label: '언어·명명 규칙', icon: '🔤',
    ph: '지명·인명·주문의 명명 규칙, 고유 언어·문자, 호칭 체계…',
    questions: [
      '인명·지명에 일관된 소리·접사 규칙이 있는가? (예: 엘프어풍 모음, 드워프풍 경음)',
      '주문·마법은 어떤 언어·형식으로 영창되는가?',
      '신분·종족·직업에 따른 호칭·경칭 체계가 있는가?',
      '번역 불가능한 핵심 개념어가 하나 있다면 무엇인가?',
      '기록(문자·룬·구전)은 어떤 형태로 남는가?',
    ],
  },
  {
    key: 'devices', label: '핵심 서사 장치', icon: '🎴',
    ph: '이 세계로 펼칠 퀘스트·멘토·아티팩트·회빙환·시스템창 등 서사 장치 메모…',
    questions: [
      '주된 여정(퀘스트)의 맥거핀·목표는 무엇인가?',
      '멘토는 누구이며 언제 퇴장(자립의 계기)하는가?',
      '핵심 마법 아이템·아티팩트와 그 대가·중독성은?',
      '(웹소설) 회귀·빙의·환생, 시스템·스테이터스 창을 쓸 것인가? 어떻게?',
      '독자에게 매 회/장 보장할 사이다(카타르시스)의 리듬은?',
    ],
  },
] as const

interface WorldFields {
  geography: string; magic: string; races: string; politics: string; religion: string
  economy: string; history: string; threat: string; naming: string; devices: string
}
// 사용자 정의 항목(자유 추가): 라벨 + 값. 미리 만든 데이터 없음 → 사용자가 직접 입력.
interface CustomField { id: string; label: string; value: string }

interface World {
  id: string
  name: string          // 세계 이름
  summary: string       // 한 줄 소개(로그라인)
  subgenre: string      // 하위 분기
  hardness: string      // 마법 경도
  tech: string          // 기술 수준
  fields: WorldFields
  custom?: CustomField[] // 사용자 정의 항목(이름은 유지, 값만 비울 수 있음)
  etc?: string           // 고정 '기타' 자유 입력
  createdAt: number
  updatedAt: number
}

const emptyFields = (): WorldFields => ({
  geography: '', magic: '', races: '', politics: '', religion: '',
  economy: '', history: '', threat: '', naming: '', devices: '',
})

function makeWorld(name = ''): World {
  return {
    id: newId(), name, summary: '',
    subgenre: SUBGENRES[0].v, hardness: MAGIC_HARDNESS[0].v, tech: TECH_LEVEL[4],
    fields: emptyFields(), custom: [], etc: '', createdAt: Date.now(), updatedAt: Date.now(),
  }
}

function filledCount(w: World): number {
  return SECTIONS.reduce((n, s) => n + ((w.fields[s.key] || '').trim() ? 1 : 0), 0)
}

function load(): { worlds: World[]; activeId: string | null } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { worlds: [], activeId: null }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.worlds) ? p.worlds : Array.isArray(p) ? p : []
    const worlds: World[] = arr.filter((x: any) => x && typeof x === 'object').map((x: any) => {
      const base = makeWorld()
      const fields = emptyFields()
      if (x.fields && typeof x.fields === 'object') {
        for (const s of SECTIONS) if (typeof x.fields[s.key] === 'string') fields[s.key] = x.fields[s.key]
      }
      const custom: CustomField[] = Array.isArray(x.custom)
        ? x.custom
            .filter((c: any) => c && typeof c === 'object' && typeof c.label === 'string')
            .map((c: any) => ({ id: String(c.id || newId()), label: c.label, value: typeof c.value === 'string' ? c.value : '' }))
        : []
      return {
        ...base, ...x, id: String(x.id || newId()), fields,
        name: typeof x.name === 'string' ? x.name : '',
        summary: typeof x.summary === 'string' ? x.summary : '',
        subgenre: typeof x.subgenre === 'string' ? x.subgenre : base.subgenre,
        hardness: typeof x.hardness === 'string' ? x.hardness : base.hardness,
        tech: typeof x.tech === 'string' ? x.tech : base.tech,
        custom,
        etc: typeof x.etc === 'string' ? x.etc : '',
        createdAt: Number(x.createdAt) || Date.now(),
        updatedAt: Number(x.updatedAt) || Date.now(),
      } as World
    })
    const ids = new Set(worlds.map((w) => w.id))
    const activeId = typeof p?.activeId === 'string' && ids.has(p.activeId) ? p.activeId : (worlds[0]?.id ?? null)
    return { worlds, activeId }
  } catch { return { worlds: [], activeId: null } }
}

// ───────────────────────── 어휘·클리셰 사전(도시에 §7, 카테고리/검색/무작위/복사) ─────────────────────────
const LEXICON: { cat: string; icon: string; items: string[] }[] = [
  { cat: '마력·시전', icon: '✨', items: ['마나(Mana)', '오드(Od)', '에테르(Aether)', '마력 회로', '서클(1~9서클)', '영창·캐스팅', '룬·인챈트', '마법진', '금주(禁呪)', '흑마법/백마법', '마나 고갈', '진명(眞名)', '영맥(靈脈)', '등가교환'] },
  { cat: '존재·종족', icon: '🧝', items: ['엘프', '드워프', '오크', '하플링/호빗', '나가', '도깨비', '레콘', '정령', '소환수·사역마', '언데드', '리치', '네크로맨서', '드래곤', '와이번', '골렘', '수인'] },
  { cat: '직위·역할', icon: '👑', items: ['마왕', '용사', '현자', '성녀', '대마법사', '소드마스터', '기사단장', '대공', '황태자', '교황', '길드마스터', '랭커', '각성자', '검성(劍聖)'] },
  { cat: '모험·체계', icon: '🗡️', items: ['길드', '모험가 등급(F~SSS)', '던전', '게이트', '보스 레이드', '퀘스트', '의뢰·현상금', '선술집·여관', '용병단', '시험·승급', '파티(일행)', '맵핑'] },
  { cat: '전투·능력', icon: '⚔️', items: ['검기(劍氣)', '오러(Aura)', '소드마스터의 경지', '스킬·패시브', '버프/디버프', '광역 마법', '결계·배리어', '치유술', '소환술', '강령술', '환영술', '예지'] },
  { cat: '물품·유물', icon: '🏺', items: ['아티팩트', '매직아이템', '인챈트 장비', '성검·마검', '현자의 돌', '봉인구', '마정석', '엘릭서', '두루마리(스크롤)', '저주받은 물건', '신물(神物)', '계약서'] },
  { cat: '세계·질서', icon: '🌍', items: ['마탑', '제국·왕국', '교단', '봉인', '예언', '신탁', '판테온', '창세 신화', '대전쟁', '연호·달력', '미지의 땅', '세계수', '차원 균열', '심연'] },
]

const CLICHES: { trope: string; twist: string }[] = [
  { trope: '평범한 시골 소년이 사실 왕족·용사의 후예다', twist: '혈통이 가짜였고, 평범함 자체가 그를 진짜 영웅으로 만든다' },
  { trope: '현명한 노(老)멘토가 중반에 죽어 주인공을 자립시킨다', twist: '멘토가 죽지 않고, 그의 생존이 주인공의 더 깊은 약점이 된다' },
  { trope: '봉인된 어둠의 군주(마왕)가 부활한다', twist: '마왕은 봉인을 원치 않았고, 진짜 악은 봉인을 강요한 신들이다' },
  { trope: '엘프=미형·고결, 드워프=구두쇠, 오크=무지성 악역', twist: '오크에게 정교한 명예 문화가 있고, 엘프가 가장 잔혹한 종족이다' },
  { trope: '여관·선술집에서 모험가 길드의 퀘스트를 의뢰받는다', twist: '길드가 의뢰를 조작해 모험가들을 소모품으로 쓰는 거대 음모' },
  { trope: '"너에게는 특별한 재능이 있다"는 선언', twist: '그 재능이 축복이 아니라 세계를 무너뜨릴 저주임이 드러난다' },
  { trope: '예언된 선택받은 자가 세계를 구한다', twist: '예언이 오역되었고, "구원"이 곧 세계의 종말을 뜻했다' },
  { trope: '(웹소설) 무시당하던 약자가 각성·회귀로 최강이 된다', twist: '최강이 된 대가로 인간성을 잃어 가는 것이 진짜 갈등이 된다' },
  { trope: '(웹소설) 가족·문파에 버림받았다가 돌아와 복수한다', twist: '복수를 이룬 뒤에도 채워지지 않는 공허가 다음 비극을 부른다' },
  { trope: '(로판) 원작에서 죽는 악역에 빙의해 파멸을 피한다', twist: '원작 자체가 거짓이었고, 진짜 악역은 "선역"으로 적힌 인물' },
  { trope: '차갑지만 나에게만 다정한 황태자·공작', twist: '그 다정함이 통제와 소유욕의 가면임을 뒤늦게 깨닫는다' },
  { trope: '마법으로 위기를 단번에 해결한다', twist: '【금기】 미리 보여준 규칙 없이 즉석에서 쓰면 데우스 엑스 마키나 — 반드시 복선으로 심어 둘 것' },
]

// ───────────────────────── 컴포넌트 ─────────────────────────
export default function GenreWorldBuilder({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState(() => load())
  const [query, setQuery] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [openGuide, setOpenGuide] = useState<keyof WorldFields | null>(null)
  const [note, setNote] = useState('')
  // 사전 패널
  const [showRef, setShowRef] = useState(false)
  const [refTab, setRefTab] = useState<'lex' | 'cliche'>('lex')
  const [refQuery, setRefQuery] = useState('')
  const [openCat, setOpenCat] = useState<string | null>(LEXICON[0]?.cat ?? null)

  // 영감 슬롯
  const [slots, setSlots] = useState<Record<PoolKey, string>>(() => {
    const o = {} as Record<PoolKey, string>
    ;(Object.keys(POOLS) as PoolKey[]).forEach((k) => { o[k] = pick(POOLS[k]) })
    return o
  })
  const [locks, setLocks] = useState<Record<PoolKey, boolean>>(() => {
    const o = {} as Record<PoolKey, boolean>
    ;(Object.keys(POOLS) as PoolKey[]).forEach((k) => { o[k] = false })
    return o
  })

  const mounted = useRef(true)
  const noteTimer = useRef<number | null>(null)
  const seeded = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) { clearTimeout(noteTimer.current); noteTimer.current = null }
    }
  }, [])

  // 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)) }
    catch { if (mounted.current) flash('이 브라우저에서 저장이 막혀 있어 새로고침 시 사라질 수 있어요.') }
  }, [store])

  // payload 진입(연계) — 이름/장르 초안 1회 반영
  useEffect(() => {
    if (seeded.current || !payload) return
    seeded.current = true
    const nm = typeof payload.name === 'string' ? payload.name : (typeof payload.title === 'string' ? payload.title : '')
    if (nm) {
      const w = makeWorld(nm.trim())
      const g = typeof payload.genre === 'string' ? payload.genre : ''
      if (g) { const m = SUBGENRES.find((s) => s.v.includes(g)); if (m) w.subgenre = m.v }
      setStore((s) => ({ worlds: [w, ...s.worlds], activeId: w.id }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const { worlds, activeId } = store
  const active = worlds.find((w) => w.id === activeId) || null

  function flash(msg: string, ms = 3600) {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => { if (mounted.current) setNote('') }, ms)
  }

  const setActive = (id: string | null) => { setConfirmDel(null); setOpenGuide(null); setStore((s) => ({ ...s, activeId: id })) }

  const onNew = () => {
    const w = makeWorld(`새 세계 ${worlds.length + 1}`)
    setStore((s) => ({ worlds: [w, ...s.worlds], activeId: w.id }))
    setQuery(''); setConfirmDel(null); setOpenGuide(null)
  }

  const patch = (p: Partial<World>) => {
    if (!active) return
    setStore((s) => ({ ...s, worlds: s.worlds.map((w) => (w.id === active.id ? { ...w, ...p, updatedAt: Date.now() } : w)) }))
  }
  const patchField = (key: keyof WorldFields, value: string) => {
    if (!active) return
    setStore((s) => ({ ...s, worlds: s.worlds.map((w) => (w.id === active.id ? { ...w, fields: { ...w.fields, [key]: value }, updatedAt: Date.now() } : w)) }))
  }

  // ── 사용자 정의 항목(자유 추가) + 고정 '기타' ──
  const patchCustom = (next: CustomField[]) => {
    if (!active) return
    setStore((s) => ({ ...s, worlds: s.worlds.map((w) => (w.id === active.id ? { ...w, custom: next, updatedAt: Date.now() } : w)) }))
  }
  const addCustom = () => {
    if (!active) { flash('먼저 세계를 선택하거나 만들어 주세요.'); return }
    let label = ''
    try { label = (window.prompt('추가할 항목 이름을 입력하세요 (예: 화폐 단위, 명절, 금기 음식)') || '').trim() } catch { label = '' }
    if (!label) return
    patchCustom([...(active.custom || []), { id: newId(), label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) => {
    if (!active) return
    patchCustom((active.custom || []).map((c) => (c.id === id ? { ...c, value } : c)))
  }
  const removeCustom = (id: string) => {
    if (!active) return
    patchCustom((active.custom || []).filter((c) => c.id !== id))
  }
  const setEtc = (value: string) => {
    if (!active) return
    setStore((s) => ({ ...s, worlds: s.worlds.map((w) => (w.id === active.id ? { ...w, etc: value, updatedAt: Date.now() } : w)) }))
  }

  const removeWorld = (id: string) => {
    setStore((s) => {
      const idx = s.worlds.findIndex((w) => w.id === id)
      const next = s.worlds.filter((w) => w.id !== id)
      let nextActive = s.activeId
      if (s.activeId === id) nextActive = next[Math.min(idx, next.length - 1)]?.id ?? null
      return { worlds: next, activeId: nextActive }
    })
    setConfirmDel(null)
  }

  const move = (id: string, dir: -1 | 1) => {
    setStore((s) => {
      const i = s.worlds.findIndex((w) => w.id === id)
      if (i < 0) return s
      const j = i + dir
      if (j < 0 || j >= s.worlds.length) return s
      const next = s.worlds.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return { ...s, worlds: next }
    })
  }

  // 질문을 섹션 텍스트 끝에 "Q) … → " 형태로 추가
  const appendQuestion = (key: keyof WorldFields, q: string) => {
    if (!active) return
    const cur = active.fields[key] || ''
    const sep = cur.trim() ? (cur.endsWith('\n') ? '' : '\n') : ''
    patchField(key, cur + sep + `Q) ${q}\n→ `)
  }

  // 영감 재생성/잠금
  const roll = () => {
    setSlots((prev) => {
      const next = { ...prev }
      ;(Object.keys(POOLS) as PoolKey[]).forEach((k) => { if (!locks[k]) next[k] = pick(POOLS[k]) })
      return next
    })
  }
  const toggleLock = (k: PoolKey) => setLocks((l) => ({ ...l, [k]: !l[k] }))

  // 영감 → 새 세계 초안 생성(빈 칸 채움)
  const applyInspiration = () => {
    const w = makeWorld(`새 세계 ${worlds.length + 1}`)
    w.summary = `${slots.시대상}, ${slots.분위기} · ${josa(slots.고대위협, '이', '가')} 다가오는 세계`
    w.fields.geography = `대표 지형: ${slots.지형}.`
    w.fields.history = `현재 시대상: ${slots.시대상}.`
    w.fields.magic = `마력 원천: ${slots.마나원천}.\n대가·한계: ${slots.마나대가}.`
    w.fields.races = `대표 종족: ${slots.종족}.\n대표 생물: ${slots.대표생물}.`
    w.fields.politics = `정치 체제: ${slots.정치체제}.\n핵심 갈등: ${slots.갈등축}.`
    w.fields.religion = `주요 신앙: ${slots.종교}.`
    w.fields.threat = `고대 위협: ${slots.고대위협}.`
    w.fields.devices = `핵심 아티팩트: ${slots.마법물품}.`
    setStore((s) => ({ worlds: [w, ...s.worlds], activeId: w.id }))
    setOpenGuide(null)
    flash('영감 슬롯으로 새 세계 초안을 만들었어요. 설계 질문에 답하며 채워 보세요.')
  }

  // 단일 슬롯 → 현재 세계 필드에 덧붙이기
  const SLOT_FIELD: Record<PoolKey, keyof WorldFields> = {
    지형: 'geography', 마나원천: 'magic', 마나대가: 'magic', 종족: 'races',
    정치체제: 'politics', 종교: 'religion', 고대위협: 'threat', 마법물품: 'devices',
    갈등축: 'politics', 분위기: 'devices', 대표생물: 'races', 시대상: 'history',
  }
  const appendSlotToActive = (k: PoolKey) => {
    if (!active) { flash('먼저 세계를 선택하거나 만들어 주세요.'); return }
    const field = SLOT_FIELD[k]
    const cur = active.fields[field] || ''
    const val = cur.trim() ? `${cur}\n${k}: ${slots[k]}` : `${k}: ${slots[k]}`
    patchField(field, val)
    flash(`‘${k}: ${slots[k]}’ 를 현재 세계에 반영했어요.`)
  }

  // ── 내보내기/연계 ──
  function buildText(w: World): string {
    const L: string[] = []
    L.push(`# ${w.name || '이름 없는 세계'}`)
    if (w.summary.trim()) L.push(w.summary.trim())
    L.push('', `· 분기: ${w.subgenre}`, `· 마법 경도: ${w.hardness}`, `· 기술 수준: ${w.tech}`)
    for (const s of SECTIONS) {
      const v = (w.fields[s.key] || '').trim()
      if (v) { L.push('', `## ${s.icon} ${s.label}`, v) }
    }
    for (const c of (w.custom || [])) {
      const v = (c.value || '').trim()
      if (v) { L.push('', `## ${c.label.trim() || '항목'}`, v) }
    }
    const etcV = (w.etc || '').trim()
    if (etcV) { L.push('', '## 기타', etcV) }
    return L.join('\n')
  }
  function buildHtml(w: World): string {
    const p: string[] = []
    if (w.summary.trim()) p.push(`<p><i>${esc(w.summary.trim())}</i></p>`)
    p.push(`<p><b>분기</b>: ${esc(w.subgenre)}<br><b>마법 경도</b>: ${esc(w.hardness)}<br><b>기술 수준</b>: ${esc(w.tech)}</p>`)
    for (const s of SECTIONS) {
      const v = (w.fields[s.key] || '').trim()
      if (!v) continue
      p.push(`<p><b>${esc(s.icon + ' ' + s.label)}</b><br>${esc(v).replace(/\r\n|\r|\n/g, '<br>')}</p>`)
    }
    for (const c of (w.custom || [])) {
      const v = (c.value || '').trim()
      if (!v) continue
      p.push(`<p><b>${esc(c.label.trim() || '항목')}</b><br>${esc(v).replace(/\r\n|\r|\n/g, '<br>')}</p>`)
    }
    const etcV = (w.etc || '').trim()
    if (etcV) p.push(`<p><b>${esc('기타')}</b><br>${esc(etcV).replace(/\r\n|\r|\n/g, '<br>')}</p>`)
    if (p.length <= 1) p.push('<p><span style="color:#888">(내용 없음)</span></p>')
    return p.join('')
  }

  const copyText = (text: string, label = '복사됨') => {
    const done = () => { if (mounted.current) flash(label) }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) flash('복사 실패') }
  }

  // 세계(장소) → 받는 허브(배경 설정집)의 정규(canonical) 장소 키로 정렬한 fields 생성
  // 정규 장소 키: name, kind, atmosphere, appearance, sensory, geography, climate,
  //   history, culture, inhabitants, rules, dangers, landmarks, secrets, notes
  function placeFields(w: World): Record<string, string> {
    const title = (w.name || '이름 없는 세계').trim()
    const f: Record<string, string> = {}
    const set = (k: string, v: string) => { const t = (v || '').trim(); if (t) f[k] = t }
    set('name', title)
    set('kind', `판타지 세계관 (${w.subgenre})`)
    set('atmosphere', w.summary.trim() || w.subgenre)
    set('geography', w.fields.geography)
    set('history', w.fields.history)
    // 마법 체계 = 세계의 작동 규칙 → rules
    set('rules', [`마법 경도: ${w.hardness}`, (w.fields.magic || '').trim()].filter(Boolean).join('\n'))
    // 종족·문화 → 거주민
    set('inhabitants', w.fields.races)
    // 고대 위협·예언 → 위험
    set('dangers', w.fields.threat)
    // 정치·종교·경제·명명 = 사회·문화 묶음 → culture(라벨 분리 보존)
    set('culture', [
      (w.fields.politics || '').trim() && `정치·권력: ${(w.fields.politics || '').trim()}`,
      (w.fields.religion || '').trim() && `종교·신화: ${(w.fields.religion || '').trim()}`,
      (w.fields.economy || '').trim() && `경제·기술: ${(w.fields.economy || '').trim()}`,
      (w.fields.naming || '').trim() && `언어·명명: ${(w.fields.naming || '').trim()}`,
    ].filter(Boolean).join('\n\n'))
    // 핵심 서사 장치 + 기술 수준 → notes
    set('notes', [`기술 수준: ${w.tech}`, (w.fields.devices || '').trim() && `핵심 서사 장치: ${(w.fields.devices || '').trim()}`].filter(Boolean).join('\n'))
    // 사용자 정의 항목(라벨 그대로 키) + 고정 '기타' → 받는 도구에 그대로 노출
    for (const c of (w.custom || [])) {
      const key = (c.label || '').trim()
      const val = (c.value || '').trim()
      if (key && val) set(key, val)
    }
    set('etc', w.etc || '')
    return f
  }

  // 프로젝트 자료(세계관)에 setting 카드로 추가
  const toProject = (w: World) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않아요.'); return }
    const title = (w.name || '이름 없는 세계').trim()
    // setting 카드 필드를 정규(canonical) 장소 키로 정렬해, 받는 허브(배경 설정집)에서
    // 항목이 제자리(기본 칸)에 들어가게 한다. 기존 분기/마법경도/기술수준은 추가로 보존.
    const character: Record<string, string> = {
      ...placeFields(w), 분기: w.subgenre, 마법경도: w.hardness, 기술수준: w.tech,
    }
    const id = addToProject({
      kind: 'setting', root: 'research', folder: '세계관', title, icon: '🏰',
      synopsis: w.summary.trim() || `${w.subgenre} · ${w.hardness}`,
      bodyHtml: buildHtml(w), character,
      meta: { 유형: '판타지 세계관', 분기: w.subgenre, 마법: w.hardness, '채운 항목': `${filledCount(w)}/${SECTIONS.length}` },
    })
    flash(id ? `‘${title}’을(를) 프로젝트 ‘자료 › 세계관’에 카드로 추가했어요.` : '프로젝트에 추가하지 못했어요.')
  }

  // 공유 라이브러리(장소)로 추가 — 다른 도구(배경 설정집 등)와 연계
  const toLibrary = (w: World) => {
    const title = (w.name || '이름 없는 세계').trim()
    addToLibrary('places', {
      name: title, kind: '판타지 세계관', mood: w.summary.trim() || w.subgenre,
      history: (w.fields.history || '').trim() || undefined,
      rules: [`마법 경도: ${w.hardness}`, (w.fields.magic || '').trim()].filter(Boolean).join('\n') || undefined,
      notes: buildText(w), fields: placeFields(w), source: '판타지 세계관 빌더',
    })
    flash(`‘${title}’을(를) 공유 라이브러리(장소)에 저장했어요. 배경 설정집 등에서 불러올 수 있어요.`)
  }

  const filtered = worlds.filter((w) => {
    const q = norm(query)
    if (!q) return true
    if (norm(w.name).includes(q) || norm(w.summary).includes(q) || norm(w.subgenre).includes(q)) return true
    return SECTIONS.some((s) => norm(w.fields[s.key] || '').includes(q))
  })

  const linked = hasProjectBridge()

  // 사전 검색 필터
  const lexFiltered = LEXICON.map((g) => ({
    ...g, items: refQuery.trim() ? g.items.filter((it) => norm(it).includes(norm(refQuery))) : g.items,
  })).filter((g) => g.items.length > 0)
  const clicheFiltered = refQuery.trim()
    ? CLICHES.filter((c) => norm(c.trope).includes(norm(refQuery)) || norm(c.twist).includes(norm(refQuery)))
    : CLICHES

  // ───────────────────────── 스타일 ─────────────────────────
  const C: Record<string, React.CSSProperties> = {
    wrap: { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0, background: 'var(--paper)', fontSize: 14 },
    topbar: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 },
    title: { fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 },
    spacer: { flex: 1 },
    note: { fontSize: 12, color: 'var(--accent)', padding: '6px 14px', flexShrink: 0, lineHeight: 1.5, borderBottom: '1px solid var(--border)' },
    main: { flex: 1, minHeight: 0, display: 'flex' },
    side: { width: 224, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--chrome-2)' },
    sideHead: { padding: 10, display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--border)', flexShrink: 0 },
    search: { width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' },
    list: { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 },
    content: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 },
    body: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 },
    label: { fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 5 },
    input: { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' },
    select: { width: '100%', padding: '9px 11px', fontSize: 13.5, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' },
    textarea: { width: '100%', minHeight: 74, padding: '9px 11px', fontSize: 13.5, lineHeight: 1.6, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' },
    panel: { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 },
    secTitle: { fontSize: 13.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 },
    row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
    empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, padding: 24, gap: 14 },
    editBar: { display: 'flex', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)', flexShrink: 0, alignItems: 'center', flexWrap: 'wrap', background: 'var(--chrome-2)' },
    slotGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 },
    tinyBtn: { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, lineHeight: 1, padding: '3px 7px', borderRadius: 6 },
    chip: { textAlign: 'left', border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', cursor: 'pointer', fontSize: 12.5, lineHeight: 1.4, padding: '5px 9px', borderRadius: 999 },
  }

  const slotCardStyle = (locked: boolean): React.CSSProperties => ({
    border: '1px solid ' + (locked ? 'var(--accent)' : 'var(--border)'),
    borderRadius: 9, padding: '8px 10px', background: 'var(--paper)', display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer',
  })

  return (
    <div style={C.wrap}>
      <div style={C.topbar}>
        <div style={C.title}><span aria-hidden><Emoji e="🏰"/></span> 판타지 세계관 빌더</div>
        <div style={C.spacer} />
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{worlds.length}개 세계</span>
        <button className="minibtn" onClick={() => setShowRef((v) => !v)} title="어휘·클리셰 사전 열기">{showRef ? <><Emoji e="📖"/> 사전 닫기</> : <><Emoji e="📖"/> 사전</>}</button>
        <button className="minibtn" onClick={() => openToolLinked('magic-system-designer')} title="마법 체계 설계기 열기"><Emoji e="✨"/> 마법 체계</button>
        <button className="btn-primary" onClick={onNew}>+ 새 세계</button>
      </div>

      {note && <div style={C.note}>{note}</div>}

      <div style={C.main}>
        {/* 좌측: 세계 목록 */}
        <div style={C.side}>
          <div style={C.sideHead}>
            <button className="btn-primary" onClick={onNew} style={{ width: '100%' }}>+ 새 세계</button>
            <input style={C.search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍 이름·내용 검색" aria-label="세계 검색" />
          </div>
          {worlds.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.7, padding: 14, textAlign: 'center' }}>
              아직 세계가 없어요.<br /><b>+ 새 세계</b> 또는 아래<br />영감 생성기로 시작하세요.
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 12.5, padding: 14, textAlign: 'center' }}>‘{query}’에 맞는 세계가 없어요.</div>
          ) : (
            <div style={C.list}>
              {filtered.map((w) => {
                const realIdx = worlds.findIndex((x) => x.id === w.id)
                const isActive = w.id === activeId
                const cnt = filledCount(w)
                return (
                  <div
                    key={w.id}
                    onClick={() => setActive(w.id)}
                    role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(w.id) } }}
                    style={{
                      border: '1px solid ' + (isActive ? 'var(--accent)' : 'var(--border)'),
                      background: isActive ? 'var(--paper)' : 'var(--panel)',
                      borderRadius: 10, padding: '9px 10px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', gap: 4,
                      boxShadow: isActive ? '0 0 0 1px var(--accent)' : 'none',
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: w.name ? 'var(--text)' : 'var(--muted)' }}>
                      <Emoji e="🏰"/> {w.name || '(이름 없는 세계)'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.summary.trim() || w.subgenre}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: cnt === SECTIONS.length ? 'var(--ok)' : 'var(--muted)' }}>항목 {cnt}/{SECTIONS.length}</span>
                      <span style={{ flex: 1 }} />
                      <button style={C.tinyBtn} title="위로" disabled={!!query.trim() || realIdx <= 0} onClick={(e) => { e.stopPropagation(); move(w.id, -1) }}>↑</button>
                      <button style={C.tinyBtn} title="아래로" disabled={!!query.trim() || realIdx >= worlds.length - 1} onClick={(e) => { e.stopPropagation(); move(w.id, 1) }}>↓</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {!!query.trim() && filtered.length > 0 && (
            <div style={{ padding: '6px 10px', fontSize: 11, color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>검색 중에는 순서 이동이 잠깁니다.</div>
          )}
        </div>

        {/* 우측: 사전 패널 또는 편집/안내 */}
        <div style={C.content}>
          {showRef ? (
            <div style={C.body}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={C.secTitle}><span aria-hidden><Emoji e="📖"/></span> 판타지 어휘·클리셰 사전</div>
                <div style={C.spacer} />
                <button className={refTab === 'lex' ? 'btn-primary' : 'minibtn'} onClick={() => setRefTab('lex')}>세계관 어휘</button>
                <button className={refTab === 'cliche' ? 'btn-primary' : 'minibtn'} onClick={() => setRefTab('cliche')}>클리셰·변주</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...C.input, flex: 1 }} value={refQuery} onChange={(e) => setRefQuery(e.target.value)} placeholder="🔍 사전 검색" aria-label="사전 검색" />
                {refTab === 'lex' ? (
                  <button className="minibtn" onClick={() => { const all = LEXICON.flatMap((g) => g.items); copyText(pick(all), `‘${'복사됨'}’`) }} title="무작위 어휘 복사"><Emoji e="🎲"/> 무작위</button>
                ) : (
                  <button className="minibtn" onClick={() => { const c = pick(CLICHES); copyText(`${c.trope}\n→ 변주: ${c.twist}`, '무작위 클리셰를 복사했어요') }} title="무작위 클리셰 복사"><Emoji e="🎲"/> 무작위</button>
                )}
              </div>

              {refTab === 'lex' ? (
                lexFiltered.length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: 13, padding: 12, textAlign: 'center' }}>‘{refQuery}’에 맞는 어휘가 없어요.</div>
                ) : lexFiltered.map((g) => {
                  const open = refQuery.trim() ? true : openCat === g.cat
                  return (
                    <div key={g.cat} style={C.panel}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => setOpenCat(open ? null : g.cat)}>
                        <span style={C.secTitle}><Emoji e={g.icon}/> {g.cat}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{g.items.length}</span>
                        <span style={C.spacer} />
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{open ? '▲' : '▼'}</span>
                      </div>
                      {open && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {g.items.map((it) => (
                            <button key={it} style={C.chip} onClick={() => copyText(it, `‘${it}’ 복사됨`)} title="클릭하면 복사돼요">{it}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                clicheFiltered.length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: 13, padding: 12, textAlign: 'center' }}>‘{refQuery}’에 맞는 항목이 없어요.</div>
                ) : (
                  <>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>흔한 클리셰 ↔ 비트는 변주(도시에 §7). 항목을 누르면 복사됩니다.</div>
                    {clicheFiltered.map((c, i) => (
                      <div key={i} style={{ ...C.panel, cursor: 'pointer' }} onClick={() => copyText(`${c.trope}\n→ 변주: ${c.twist}`, '복사됨')} title="클릭하면 복사돼요">
                        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}><Emoji e="🔁"/> {c.trope}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--accent)', lineHeight: 1.55 }}>↳ 변주: {c.twist}</div>
                      </div>
                    ))}
                  </>
                )
              )}
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>상단 ‘<Emoji e="📖"/> 사전 닫기’를 누르면 세계 편집으로 돌아갑니다.</div>
            </div>
          ) : !active ? (
            <div style={C.body}>
              <div style={C.empty}>
                <div style={{ fontSize: 34 }} aria-hidden><Emoji e="🏰"/></div>
                <div>
                  판타지 세계 한 편을 분기·지리·마법체계·종족·정치·종교·경제·역사·고대위협·명명까지<br />
                  설계 질문을 따라 또렷하게 빚어 보세요.<br />
                  <b>+ 새 세계</b>로 시작하거나, 아래 <strong style={{ color: 'var(--accent)' }}>세계 영감 생성기</strong>로 초안을 굴려 보세요.
                </div>
                <button className="btn-primary" onClick={onNew}>+ 첫 세계 만들기</button>
              </div>
              <Inspiration />
            </div>
          ) : (
            <>
              <div style={C.body}>
                {/* 기본 정보 */}
                <div style={C.panel}>
                  <div>
                    <label style={C.label}>세계 이름</label>
                    <input style={C.input} value={active.name} onChange={(e) => patch({ name: e.target.value })} placeholder="예: 일곱 마탑의 대륙 ‘아르카니아’" maxLength={80} aria-label="세계 이름" />
                  </div>
                  <div>
                    <label style={C.label}>한 줄 소개 (로그라인)</label>
                    <input style={C.input} value={active.summary} onChange={(e) => patch({ summary: e.target.value })} placeholder="이 세계를 한 문장으로… 예: 죽은 신의 심장이 마력의 원천인, 봉인이 풀려 가는 황혼의 대륙" maxLength={160} aria-label="한 줄 소개" />
                  </div>
                  <div style={C.row2}>
                    <div>
                      <label style={C.label}>하위 분기</label>
                      <select style={C.select} value={active.subgenre} onChange={(e) => patch({ subgenre: e.target.value })}>
                        {SUBGENRES.map((s) => <option key={s.v} value={s.v}>{s.v}</option>)}
                      </select>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>{SUBGENRES.find((s) => s.v === active.subgenre)?.d}</div>
                    </div>
                    <div>
                      <label style={C.label}>마법 경도</label>
                      <select style={C.select} value={active.hardness} onChange={(e) => patch({ hardness: e.target.value })}>
                        {MAGIC_HARDNESS.map((m) => <option key={m.v} value={m.v}>{m.v}</option>)}
                      </select>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>{MAGIC_HARDNESS.find((m) => m.v === active.hardness)?.d}</div>
                    </div>
                  </div>
                  <div>
                    <label style={C.label}>기술 수준</label>
                    <select style={C.select} value={active.tech} onChange={(e) => patch({ tech: e.target.value })}>
                      {TECH_LEVEL.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 2 }}>
                    <span style={{ fontSize: 12, color: filledCount(active) === SECTIONS.length ? 'var(--ok)' : 'var(--muted)' }}>채운 항목 {filledCount(active)}/{SECTIONS.length}</span>
                  </div>
                </div>

                {/* 섹션 + 설계 질문 가이드 */}
                {SECTIONS.map((s) => {
                  const val = active.fields[s.key] || ''
                  const guideOpen = openGuide === s.key
                  return (
                    <div key={s.key} style={C.panel}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={C.secTitle}><Emoji e={s.icon}/> {s.label}</span>
                        {val.trim() && <span style={{ fontSize: 11, color: 'var(--ok)' }}>✓</span>}
                        <span style={C.spacer} />
                        <button
                          style={{ ...C.tinyBtn, color: guideOpen ? 'var(--accent)' : 'var(--muted)', borderColor: guideOpen ? 'var(--accent)' : 'var(--border)' }}
                          onClick={() => setOpenGuide(guideOpen ? null : s.key)}
                          title="이 항목을 채우는 설계 질문 보기"
                        ><Emoji e="💡"/> 설계 질문 {guideOpen ? '▲' : '▼'}</button>
                      </div>
                      {guideOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, borderRadius: 9, background: 'var(--chrome-2)', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>질문을 누르면 아래 칸에 답할 자리가 추가됩니다.</div>
                          {s.questions.map((q, i) => (
                            <button
                              key={i}
                              onClick={() => appendQuestion(s.key, q)}
                              style={{ textAlign: 'left', border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', cursor: 'pointer', fontSize: 12, lineHeight: 1.5, padding: '6px 9px', borderRadius: 7 }}
                              title="이 질문을 입력칸에 추가"
                            >＋ {q}</button>
                          ))}
                        </div>
                      )}
                      <textarea
                        style={C.textarea}
                        value={val}
                        onChange={(e) => patchField(s.key, e.target.value)}
                        placeholder={s.ph}
                        aria-label={s.label}
                      />
                    </div>
                  )
                })}

                {/* 사용자 정의 항목(자유 추가) */}
                <div style={C.panel}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={C.secTitle}><span aria-hidden><Emoji e="➕"/></span> 사용자 정의 항목</span>
                    <span style={C.spacer} />
                    <button className="minibtn" onClick={addCustom} title="원하는 항목을 직접 추가합니다">＋ 항목 추가</button>
                  </div>
                  {(active.custom || []).length === 0 ? (
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>
                      필요한 항목이 더 있으면 <b>＋ 항목 추가</b>로 직접 만들어 채우세요. (내용은 직접 입력합니다)
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(active.custom || []).map((c) => (
                        <div key={c.id}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={C.label as React.CSSProperties}>{c.label || '항목'}</span>
                            <span style={C.spacer} />
                            <button
                              style={{ ...C.tinyBtn, color: 'var(--warn)' }}
                              onClick={() => removeCustom(c.id)}
                              title="이 항목 삭제"
                              aria-label={`${c.label || '항목'} 삭제`}
                            >✕</button>
                          </div>
                          <textarea
                            style={C.textarea}
                            value={c.value}
                            onChange={(e) => setCustomValue(c.id, e.target.value)}
                            placeholder={`${c.label || '항목'} 내용을 직접 적어 보세요…`}
                            aria-label={c.label || '사용자 정의 항목'}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 고정 '기타' 자유 입력 */}
                <div style={C.panel}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={C.secTitle}><span aria-hidden><Emoji e="📝"/></span> 기타</span>
                    {(active.etc || '').trim() && <span style={{ fontSize: 11, color: 'var(--ok)' }}>✓</span>}
                  </div>
                  <textarea
                    style={{ ...C.textarea, minHeight: 110 }}
                    value={active.etc || ''}
                    onChange={(e) => setEtc(e.target.value)}
                    placeholder="어디에도 들어가지 않는 메모·아이디어·설정을 자유롭게 적어 두세요. (분량 제한 없음)"
                    aria-label="기타"
                  />
                </div>

                <div style={{ fontSize: 11, color: 'var(--muted)' }}>모든 변경은 이 브라우저에 자동 저장됩니다. 수정 {fmtDate(active.updatedAt)}</div>

                {/* 영감 생성기 */}
                <Inspiration />
              </div>

              <div style={C.editBar}>
                <button className="minibtn" onClick={() => copyText(buildText(active), '이 세계를 복사했어요')}><Emoji e="📋"/> 복사</button>
                <button className="linkbtn" onClick={() => toProject(active)} disabled={!linked} title={linked ? '이 세계를 프로젝트 자료(세계관)에 카드로 추가' : '프로젝트에 연결되어 있지 않아요'}><Emoji e="📄"/> 프로젝트에 추가</button>
                <button className="minibtn" onClick={() => toLibrary(active)} title="공유 라이브러리(장소)에 저장해 배경 설정집 등에서 활용"><Emoji e="🗂️"/> 라이브러리에 저장</button>
                <div style={C.spacer} />
                {confirmDel === active.id ? (
                  <>
                    <span style={{ fontSize: 12.5, color: 'var(--warn)', marginRight: 4 }}>삭제할까요?</span>
                    <button className="minibtn" onClick={() => setConfirmDel(null)}>취소</button>
                    <button className="minibtn" style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={() => removeWorld(active.id)}>삭제 확정</button>
                  </>
                ) : (
                  <button className="minibtn" style={{ color: 'var(--warn)' }} onClick={() => setConfirmDel(active.id)}><Emoji e="🗑️"/> 삭제</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )

  // 영감 생성기(렌더 헬퍼 — 별도 컴포넌트로 두면 입력 포커스 유실 우려)
  function Inspiration() {
    return (
      <div style={{ ...C.panel, background: 'var(--paper)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={C.secTitle}><span aria-hidden><Emoji e="🎲"/></span> 세계 영감 생성기</div>
          <div style={C.spacer} />
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>조합수 약 {fmtBig(COMBO_COUNT)}가지 ({COMBO_COUNT.toLocaleString('ko-KR')})</span>
        </div>
        <div style={C.slotGrid}>
          {(Object.keys(POOLS) as PoolKey[]).map((k) => (
            <div
              key={k}
              style={slotCardStyle(locks[k])}
              onClick={() => toggleLock(k)}
              title={locks[k] ? '잠금 해제(재생성 대상에 포함)' : '잠금(재생성에서 제외)'}
              role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleLock(k) } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)' }}>{k}</span>
                <span style={{ fontSize: 11 }} aria-hidden>{locks[k] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</span>
                <div style={C.spacer} />
                <button
                  className="minibtn"
                  style={{ padding: '1px 6px', fontSize: 10.5 }}
                  onClick={(e) => { e.stopPropagation(); appendSlotToActive(k) }}
                  title="이 항목을 현재 세계의 해당 필드에 반영"
                >＋</button>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, wordBreak: 'keep-all' }}>{slots[k]}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn-primary" onClick={roll}><Emoji e="🎲"/> 재생성</button>
          <button className="minibtn" onClick={applyInspiration}>이 조합으로 새 세계 만들기</button>
          <button className="minibtn" onClick={() => { const t = (Object.keys(POOLS) as PoolKey[]).map((k) => `${k}: ${slots[k]}`).join('\n'); copyText(t, '영감 조합을 복사했어요') }}><Emoji e="📋"/> 조합 복사</button>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>카드를 눌러 잠그면 재생성에서 제외돼요.</span>
        </div>
      </div>
    )
  }
}
