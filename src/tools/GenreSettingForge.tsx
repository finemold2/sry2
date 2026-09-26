// 판타지 배경·현장 생성기(GenreSettingForge) — 판타지 장르 특화 무대 생성 도구.
//   장소(권역) × 시각·기상 × 마법 기운 × 분위기 × 권력·세력 × 위협의 기척 단일 슬롯에
//   '감각 디테일' 다중 슬롯(3개)을 곱해 하나의 '배경 묘사 글감'을 만든다.
//   마음에 드는 칸은 🔒로 잠그고 나머지만 🎲 재생성. 조합수 1조 이상.
// 자급식: react 와 './linkbus' 만 import. 외부 API·네트워크 없음(전부 로컬 자작 데이터).
//   Math.random + localStorage('sry:tool:genre-settingforge') 만 사용. 언마운트 정리.
// 연계: 공유 장소 라이브러리(addToLibrary('places')) + 프로젝트(addToProject kind:setting, folder:'장소')
//   + 글감 스니펫(addToLibrary('snippets')) + 관련 도구 열기(openToolLinked). payload.genre 맥락 배지.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'genre-settingforge',
  name: '판타지 배경·현장 생성기',
  icon: '🏰',
  group: '배경',
  genre: '판타지',
  intro: '권역·기상·마법 기운·세력·위협·감각 디테일을 조합해 판타지 무대 글감을 만드세요',
  w: 580,
  h: 680,
}

const LS_KEY = 'sry:tool:genre-settingforge'

// ── 슬롯 풀(전부 자작·판타지 특화·구체적) ────────────────────────────────
// 단일 슬롯: place / weather / mana / mood / power / threat
// 다중 슬롯: detail(감각 디테일 3개) — 조합수를 폭발적으로 키운다.

// 장소(권역) — 하이/로우/어반/헌터·게이트/로판 무대를 두루 포괄
const PLACES = [
  '세계수 뿌리에 매달린 엘프의 부유도시', '마탑 꼭대기 봉인된 천문 관측실', '용이 잠든 화산 분화구 안 보물 무덤',
  '서리 거인의 얼어붙은 옥좌의 전당', '드워프 지하왕국의 용광로 대장간', '안개로 봉인된 정령 숲의 사당',
  '폐허가 된 옛 왕도의 무너진 성벽 위', '마나가 고갈된 죽은 땅의 결정 사막', '바닷속으로 가라앉은 수정 신전',
  '제국 황궁의 알현실, 일곱 기둥의 대전', '국경의 마물 토벌 전초 요새', '모험가 길드 본부의 의뢰 게시판 앞',
  '뒷골목 비밀 술집 〈갈라진 방패〉', '리치의 지하 묘소, 검은 룬이 빛나는 봉인실', '하늘섬으로 오르는 부유 계단의 끝',
  '균열이 벌어진 차원문(게이트) 너머 던전 1층', '서울 한복판에 솟아난 A급 던전 입구', '각성자 협회 랭킹 발표 대전당',
  '회귀 전 처형당했던 그 황궁 정원', '악역 영애가 파혼당한 무도회장 한가운데', '공작가 장미 미궁 깊은 곳의 온실',
  '용병 시장이 선 변경 도시의 흙먼지 광장', '세 강이 합류하는 마법 학원의 첨탑 회랑', '신탁을 받는 신전 지하의 예언실',
  '폭풍에 갇힌 비공정의 갑판', '저주받은 늪지 한가운데 마녀의 오두막', '금지된 도서관, 사슬에 묶인 마도서의 서가',
  '봉인이 풀리기 직전인 마왕성의 옥좌실', '연금술사 길드의 폭발 자국이 남은 실험실', '성수(聖樹)가 시들어가는 신성 제국의 대성당',
  '소환진이 그려진 폐교회 제단 앞', '드래곤 라이더 기사단의 둥지 절벽', '망령들이 떠도는 옛 전장의 안개 평원',
  '시간이 거꾸로 흐르는 봉인된 회랑', '정령왕의 알현을 기다리는 무지개 폭포 뒤편', '노예 검투장 지하 대기 우리',
  '별자리를 짜 맞추는 천공 도서탑의 회전 서고', '마수의 뼈로 세운 야만족 부족의 토템 신단',
  '조류가 갈라지며 드러나는 해저 신전으로 가는 모래길', '대륙을 잇는 거대 세계수의 속 빈 줄기 안 마을',
]

// 시각·기상 — 마법적 천체·이상 기상 포함
const WEATHERS = [
  '두 개의 달이 겹쳐 핏빛으로 물든 밤', '마나의 오로라가 하늘을 가르는 새벽', '잿빛 재가 눈처럼 내리는 한낮',
  '별이 비처럼 쏟아지던 유성의 밤', '안개가 사람 키만큼 깔린 회색 여명', '용의 숨결 같은 열풍이 부는 정오',
  '서리정령이 모든 것을 얼리는 한겨울 자정', '예언의 일식이 태양을 삼키던 순간', '마법 폭풍이 번개를 흩뿌리는 황혼',
  '천 년 만의 마나 만조가 차오르는 보름', '죽은 자의 안개가 늪에서 피어오르는 밤', '결계가 흔들려 시간이 늦게 흐르는 정적의 오후',
  '봉인이 약해지는 그믐의 칠흑', '성수의 빛이 황금빛으로 번지는 축일 아침', '차원 균열에서 새어 나온 빛이 깜빡이는 밤',
  '얼음꽃이 공중에 떠 반짝이는 새벽', '재앙의 붉은 혜성이 머리 위를 지나던 밤', '마력 진눈깨비가 살갗을 저릿하게 하는 저녁',
  '신탁의 종이 울려 퍼지는 정오', '세계가 숨을 멈춘 듯 바람 한 점 없는 무풍의 자정',
  '세 개의 태양이 하늘에 나란히 걸린 한낮', '마나 안개가 무릎까지 차올라 발소리를 삼키는 새벽',
  '검은 눈이 거꾸로 하늘로 솟구쳐 오르는 황혼', '별들이 일제히 한 방향으로 흘러가는 예언의 밤',
]

// 마법 기운(마나·체계) — 하드/소프트 매직 어휘
const MANAS = [
  '공기 중에 마나가 결정처럼 떠다녀 손을 대면 저릿하다', '오래된 마법진이 바닥에 새겨져 희미하게 맥동한다',
  '봉인된 금주(禁呪)의 잔향이 귀를 윙윙 울린다', '정령들이 눈에 보일 듯 말 듯 일렁이며 떠다닌다',
  '마나가 메말라 주문이 절반밖에 발동되지 않는 죽은 영역이다', '룬 문자가 벽을 따라 푸르게 흘러내린다',
  '7서클 대마법의 잔재가 공기를 무겁게 짓누른다', '죽음의 마나(네크로)가 살갗에 닿아 한기를 부른다',
  '계약의 마력선이 거미줄처럼 천장에 얽혀 있다', '오드(생명력)가 짙어 작은 상처도 빠르게 아문다',
  '에테르가 옅은 무지갯빛 아지랑이로 피어오른다', '시스템 창처럼 푸른 마법 문양이 허공에 떠올랐다 사라진다',
  '금속별 마법의 흔적이 쇠붙이를 미세하게 떨리게 한다', '소환수의 기척이 사역마의 형태로 그림자에 어른거린다',
  '성스러운 결계가 어둠의 존재를 밀어내며 은은히 빛난다', '마탑의 마나 회로가 과부하로 불꽃을 튀긴다',
  '봉인구에서 새어 나온 마기(魔氣)가 검은 안개로 고여 있다', '진명(眞名)을 부르면 메아리치는 균형의 침묵이 흐른다',
  '드래곤의 마력 잔해가 비늘 가루처럼 반짝이며 가라앉는다', '시간 역행 마법의 잔류 마나가 풍경을 두 겹으로 보이게 한다',
  '별의 마나가 흘러 별자리 문양이 바닥에 그림자로 드리운다', '망자의 원념이 푸른 도깨비불로 곳곳에 떠다닌다',
  '대지의 정맥(레이라인)이 발밑에서 금빛 강처럼 흐른다', '깨진 봉인의 마기가 거울처럼 풍경을 반대로 비춘다',
]

// 분위기 — 경이감/그림다크/사이다 전후의 긴장 등
const MOODS = [
  '숨이 멎을 듯한 경이(경탄)', '불길한 봉인 해제의 예감', '쓸쓸한 멸망 직전의 적막',
  '피가 끓는 결전의 긴장', '음습한 그림다크의 잔혹함', '아련한 회귀 전 기억의 그리움',
  '경건한 신탁 앞의 침묵', '광기 어린 마력 폭주의 흥분', '서늘한 마물의 살기',
  '들뜬 첫 각성·레벨업의 고양', '체념과 결연이 뒤섞인 비장함', '음모가 도사린 황궁의 서늘함',
  '몽환적인 정령계의 황홀', '응징을 앞둔 통쾌한 역전의 예열', '폐허에 깃든 고대의 위엄',
  '금기를 어기기 직전의 떨림', '잃은 왕국을 향한 한(恨)', '운명을 거스르려는 오기',
  '소외받던 자의 차오르는 자긍', '봉인된 악이 깨어나는 원초적 공포',
  '고요한 폭풍 전야의 팽팽한 침묵', '오래 묻힌 비밀이 드러나기 직전의 서늘함',
  '낯선 세계에 떨어진 이방인의 막막함', '약속의 재회를 앞둔 벅찬 설렘',
]

// 권력·세력 — 정치·종족·길드·교단 구조
const POWERS = [
  '아홉 마탑을 다스리는 대마법사 의회', '용의 피를 잇는 황가의 친위 기사단', '지하를 장악한 드워프 장인 길드',
  '숲의 균형을 지키는 엘프 장로회', '신탁으로 왕을 세우는 성광 교단', '랭킹 1위 길드의 SSS급 길드 마스터',
  '게이트를 관리하는 각성자 협회 집행부', '회귀자만 아는 미래의 멸망을 막으려는 비밀 결사', '악역 영애의 파멸을 설계한 원작의 황태자',
  '노예 상인과 결탁한 변경백의 사병', '암살 길드 〈검은 손〉의 그림자 단원들', '봉인을 지켜온 망각된 수호 기사단',
  '마물과 손잡은 배교한 흑사제단', '여러 종족의 동맹을 중재하는 모험가 길드 연합', '마탑에서 추방된 금주 연구회의 잔당',
  '정령과 계약한 떠돌이 소환술사 일족', '제국에 맞서는 변방 반란군의 의병', '예언의 아이를 노리는 마왕의 사도들',
  '용병 시장을 쥐고 흔드는 상인 연합', '대성당을 좌지우지하는 부패한 추기경단',
  '바다를 지배하는 인어 왕국의 심해 의회', '용을 섬기는 비룡 산악 부족의 대족장',
  '죽음을 거래하는 망자의 도시 사령술사 길드', '예언서를 독점한 별점술사들의 천문 협회',
]

// 위협의 기척 — 봉인된 악·고대 위협·파워 인플레 적
const THREATS = [
  '봉인이 한 줄씩 풀려가는 고대 마왕의 기척', '머리를 베면 둘이 돋는 늪의 히드라가 도사린다',
  '잠들지 않는 백두룡이 보물 위에서 한쪽 눈을 뜬다', '죽은 자를 일으키는 리치의 군세가 지평선을 검게 메운다',
  '예언이 가리킨 재앙의 날이 사흘 앞으로 다가왔다', '벽 너머에서 스테이터스로도 측정 안 되는 보스의 기운이 새어 든다',
  '소드마스터의 오러가 공기를 베어 가르며 다가온다', '서리 거인의 발소리가 산맥을 울리며 가까워진다',
  '균열에서 차원 밖 마물이 한 마리씩 기어 나오기 시작한다', '저주가 가문의 장자를 하나씩 데려가는 시한이 임박했다',
  '용을 부리는 적 기사단이 하늘을 까맣게 덮으며 진군한다', '봉인된 흑마법서가 스스로 페이지를 넘기며 술자를 찾는다',
  '회귀 전 자신을 죽인 그 검이 다시 칼집에서 울고 있다', '신탁이 멈추고 성수가 하룻밤 새 시들기 시작했다',
  '마기에 잠식된 동료가 서서히 적의 편으로 돌아서고 있다', '랭커들이 차례로 실종되며 정체불명의 사냥꾼이 좁혀 온다',
  '봉인구의 사슬이 한 사람의 비명마다 한 칸씩 끊어진다', '잠든 정령왕의 분노가 대지를 갈라지게 한다',
  '금기를 어긴 대가가 술자의 그림자부터 잠식해 온다', '예언의 제물로 지목된 이름이 신전 벽에 핏빛으로 떠올랐다',
  '땅속에서 잠든 거대 마수의 등뼈가 산맥째 들썩이기 시작한다', '하늘에서 떨어진 별이 닿는 곳마다 마물의 알을 퍼뜨린다',
  '죽은 줄 알았던 옛 영웅이 마기에 물든 채 적으로 돌아온다', '세계를 떠받치던 기둥에 금이 가며 붕괴의 초읽기가 시작됐다',
]

// 감각 디테일(다중 슬롯) — 판타지적 오감 묘사
const DETAILS = [
  '코끝을 찌르는 유황과 식은 재의 냄새', '멀리서 울리는 마탑의 종소리', '혀끝에 감도는 쇠와 마나의 떫은 맛',
  '발밑에서 푸르게 빛나는 마법진의 잔열', '바람에 실려오는 정령들의 속삭임', '목덜미를 스치는 봉인된 냉기',
  '손끝에 닿는 룬이 새겨진 차가운 돌결', '허공을 떠도는 마나의 미세한 떨림', '귓가에 맴도는 죽은 자의 한숨',
  '발치를 핥는 보랏빛 마기의 안개', '코를 막는 시든 성수의 단내', '입안에 도는 회복약의 쓴맛',
  '갑옷 사이로 스미는 던전의 축축한 곰팡내', '천장에서 떨어지는 마력 응결의 물방울', '심장을 울리는 용의 낮은 숨소리',
  '낡은 마도서의 양피지 냄새', '얼어붙은 손가락 끝의 무감각', '멀리서 끊겼다 이어지는 늑대인간의 울부짖음',
  '살갗에 와 닿는 결계의 따끔한 정전기', '재가 된 금주문(禁呪文)의 매캐한 잔향', '발끝에 차이는 깨진 마정석 파편',
  '망토 자락을 잡아끄는 차원 균열의 미풍', '입김이 허옇게 어는 서리정령의 입김', '코끝에 스치는 향유와 봉랍의 냄새',
  '귀를 먹먹하게 하는 봉인 결계의 저주파', '혀에 닿는 성수(聖水)의 차고 맑은 기운', '손바닥에 배는 검자루의 미끈한 땀',
  '발밑을 기어가는 사역마의 비늘 소리', '코를 찌르는 연금술 약품의 시큼한 증기', '먼 천둥처럼 울리는 봉인구의 맥동',
  '뺨을 스치는 마법등의 미지근한 불빛', '발바닥으로 전해지는 지하 마력로의 둔중한 진동',
  '코끝에 맴도는 마른 약초와 묵은 두루마리의 냄새', '귓가를 간질이는 요정의 날갯짓 소리',
  '손등에 내려앉는 차가운 마나 이슬의 감촉', '입안을 맴도는 마정석 가루의 쇠비린 단맛',
]

// 한 번에 뽑을 감각 디테일 개수(고정 4) — 다중 슬롯으로 조합수를 1조 이상으로 키운다.
const DETAIL_COUNT = 4

// ── 유틸 ──────────────────────────────────────────────────────────────
const rid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 한국어 조사 자동 선택 — 앞 글자의 받침 유무를 보고 올바른 조사 하나만 출력한다.
//   "을(를)" 같은 괄호 이중표기를 절대 노출하지 않기 위함.
//   끝이 한글이 아니면(영문·숫자·기호) 보수적으로 받침 있는 형태를 택한다.
function hasFinalConsonant(word: string): boolean {
  if (!word) return false
  const ch = word[word.length - 1]
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return true // 한글 음절이 아니면 받침 있는 형태로
  return (code - 0xac00) % 28 !== 0
}
// 조사 형태만 고른다(앞 글자 받침 기준). base 는 받침 판정에 쓸 원래 단어(따옴표 등 비한글 꾸밈 제외).
// type: 'object'(을/를) | 'subject'(이/가) | 'topic'(은/는) | 'means'(으로/로)
function josaForm(base: string, type: 'object' | 'subject' | 'topic' | 'means'): string {
  const last = base ? base[base.length - 1] : ''
  const code = last.charCodeAt(0)
  const isHangul = code >= 0xac00 && code <= 0xd7a3
  const jong = isHangul ? (code - 0xac00) % 28 : -1
  const final = hasFinalConsonant(base)
  switch (type) {
    case 'object': return final ? '을' : '를'
    case 'subject': return final ? '이' : '가'
    case 'topic': return final ? '은' : '는'
    case 'means': return (!final || jong === 8) ? '로' : '으로'
  }
}
// 단어 뒤에 알맞은 조사를 붙여 출력한다.
function josa(word: string, type: 'object' | 'subject' | 'topic' | 'means'): string {
  return word + josaForm(word, type)
}

// 감각 디테일 n개를 중복 없이 뽑는다.
function pickDetails(n = DETAIL_COUNT): string[] {
  const poolArr = DETAILS.slice()
  const out: string[] = []
  for (let i = 0; i < n && poolArr.length; i++) {
    const idx = Math.floor(Math.random() * poolArr.length)
    out.push(poolArr[idx])
    poolArr.splice(idx, 1)
  }
  return out
}

// nCk 조합수(순서 무관) — 감각 디테일 3개 조합수 계산용
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  return Math.round(r)
}

// 전체 조합수: 장소×기상×마나×분위기×세력×위협×(감각 디테일 3개 조합)
function totalCombos(): number {
  const detailCombos = choose(DETAILS.length, DETAIL_COUNT)
  return PLACES.length * WEATHERS.length * MANAS.length * MOODS.length * POWERS.length * THREATS.length * detailCombos
}

// ── 슬롯 모델 ──────────────────────────────────────────────────────────
type SlotKey = 'place' | 'weather' | 'mana' | 'mood' | 'power' | 'threat' | 'detail'
interface SlotDef { key: SlotKey; label: string; icon: string }
const SLOTS: SlotDef[] = [
  { key: 'place', label: '장소(권역)', icon: '🏰' },
  { key: 'weather', label: '시각·기상', icon: '🌌' },
  { key: 'mana', label: '마법 기운', icon: '✨' },
  { key: 'mood', label: '분위기', icon: '🎭' },
  { key: 'power', label: '권력·세력', icon: '⚔️' },
  { key: 'threat', label: '위협의 기척', icon: '🐉' },
  { key: 'detail', label: '감각 디테일(4)', icon: '🌫️' },
]

interface Setting {
  place: string
  weather: string
  mana: string
  mood: string
  power: string
  threat: string
  detail: string[]
}

function buildSetting(): Setting {
  return {
    place: pick(PLACES),
    weather: pick(WEATHERS),
    mana: pick(MANAS),
    mood: pick(MOODS),
    power: pick(POWERS),
    threat: pick(THREATS),
    detail: pickDetails(),
  }
}

// 배경 묘사 한 단락으로 엮기
function compose(s: Setting): string {
  // 감각 디테일은 명사구 목록 — 마지막 항목에만 주격 조사를 붙여 자연스럽게 잇는다.
  const last = s.detail.length ? s.detail[s.detail.length - 1] : ''
  const lead = s.detail.slice(0, -1).map((d) => `‘${d}’`).join(', ')
  const lastQuoted = `‘${last}’` + josaForm(last, 'subject')
  const detailSubject = lead ? `${lead}, ${lastQuoted}` : lastQuoted
  return (
    `${s.place}. ${s.weather}. ` +
    `${s.mana}. 이곳을 둘러싼 것은 ${s.power}이며, ${detailSubject} 감각을 채운다. ` +
    `공기에 감도는 분위기는 ${s.mood}. ` +
    `그러나 무엇보다 — ${s.threat}.`
  )
}

// ── 영속 ──────────────────────────────────────────────────────────────
interface SavedSetting { id: string; setting: Setting; note: string }
interface Persist { setting: Setting | null; locks: Partial<Record<SlotKey, boolean>>; saved: SavedSetting[] }

function isSetting(x: any): x is Setting {
  return x && typeof x.place === 'string' && typeof x.weather === 'string' &&
    typeof x.mana === 'string' && typeof x.mood === 'string' &&
    typeof x.power === 'string' && typeof x.threat === 'string' && Array.isArray(x.detail)
}

function load(): Persist {
  const fallback: Persist = { setting: null, locks: {}, saved: [] }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback
    const p = JSON.parse(raw)
    const setting = isSetting(p?.setting) ? p.setting : null
    const locks: Partial<Record<SlotKey, boolean>> = {}
    if (p?.locks && typeof p.locks === 'object') {
      SLOTS.forEach((sl) => { if (p.locks[sl.key]) locks[sl.key] = true })
    }
    const saved: SavedSetting[] = Array.isArray(p?.saved)
      ? p.saved
          .filter((x: any) => x && isSetting(x.setting))
          .map((x: any) => ({ id: typeof x.id === 'string' ? x.id : rid(), setting: x.setting, note: typeof x.note === 'string' ? x.note : '' }))
      : []
    return { setting, locks, saved }
  } catch {
    return fallback
  }
}

export default function GenreSettingForge({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<Persist>(load())
  const [setting, setSetting] = useState<Setting | null>(initial.current.setting)
  const [locks, setLocks] = useState<Partial<Record<SlotKey, boolean>>>(initial.current.locks)
  const [saved, setSaved] = useState<SavedSetting[]>(initial.current.saved)
  const [copied, setCopied] = useState(false)
  const [editId, setEditId] = useState('')
  const [editText, setEditText] = useState('')
  const [toast, setToast] = useState('')
  const [rolling, setRolling] = useState(false)
  // 사용자 정의 항목(직접 입력) + 고정 '기타' 자유 입력 — 미리 만든 데이터가 없으므로 값은 사용자가 직접 적습니다.
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')

  const alive = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 영속 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ setting, locks, saved } as Persist)) } catch { /* 용량 초과 등 무시 */ }
  }, [setting, locks, saved])

  // 언마운트 정리
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (rollTimer.current) clearTimeout(rollTimer.current)
    }
  }, [])

  const flashToast = (msg: string) => {
    if (!alive.current) return
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => alive.current && setToast(''), 2200)
  }

  // 생성: 잠긴 슬롯은 유지, 나머지만 새로 뽑는다.
  const generate = useCallback(() => {
    setCopied(false)
    // 무작위 재생성 시 사용자 정의 항목의 '값'과 '기타'는 비운다(항목 정의·라벨은 유지).
    setCustom((prev) => prev.map((c) => ({ ...c, value: '' })))
    setEtc('')
    setSetting((prev) => {
      const fresh = buildSetting()
      if (!prev) return fresh
      const next: Setting = { ...fresh }
      if (locks.place) next.place = prev.place
      if (locks.weather) next.weather = prev.weather
      if (locks.mana) next.mana = prev.mana
      if (locks.mood) next.mood = prev.mood
      if (locks.power) next.power = prev.power
      if (locks.threat) next.threat = prev.threat
      if (locks.detail) next.detail = prev.detail
      return next
    })
    setRolling(true)
    if (rollTimer.current) clearTimeout(rollTimer.current)
    rollTimer.current = setTimeout(() => alive.current && setRolling(false), 320)
  }, [locks])

  // 최초 진입 시 1회 생성
  useEffect(() => {
    if (!setting) generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleLock = (k: SlotKey) => setLocks((prev) => ({ ...prev, [k]: !prev[k] }))

  // 사용자 정의 항목 추가/수정/삭제
  const addCustom = () => {
    const label = (window.prompt('추가할 항목 이름을 입력하세요 (예: 통화 단위, 종교, 역사적 사건)') || '').trim()
    if (!label) return
    setCustom((prev) => [...prev, { id: rid(), label, value: '' }])
  }
  const changeCustom = (id: string, value: string) =>
    setCustom((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
  const removeCustom = (id: string) => setCustom((prev) => prev.filter((c) => c.id !== id))

  // 사용자 정의 항목 + 기타를 fields 맵에 합치는 헬퍼(값이 비어있지 않을 때만).
  const mergeExtras = <T extends Record<string, string>>(base: T): T => {
    const out: Record<string, string> = { ...base }
    custom.forEach((c) => {
      const k = c.label.trim()
      const v = c.value.trim()
      if (k && v) out[k] = v
    })
    if (etc.trim()) out.etc = etc.trim()
    return out as T
  }
  // 복사/요약 텍스트용 추가 항목 라인.
  const extrasText = (): string => {
    const lines: string[] = []
    custom.forEach((c) => {
      const k = c.label.trim()
      const v = c.value.trim()
      if (k && v) lines.push(`${k}: ${v}`)
    })
    if (etc.trim()) lines.push(`기타: ${etc.trim()}`)
    return lines.length ? '\n' + lines.join('\n') : ''
  }

  const slotValue = (k: SlotKey): string => {
    if (!setting) return ''
    if (k === 'detail') return setting.detail.join(' · ')
    return setting[k] as string
  }

  const fullText = setting ? compose(setting) : ''
  const lockedCount = SLOTS.filter((sl) => locks[sl.key]).length
  const combos = totalCombos()

  const copyText = () => {
    if (!setting || !navigator.clipboard) { if (!navigator.clipboard) flashToast('이 환경에서는 복사를 지원하지 않습니다.'); return }
    navigator.clipboard.writeText(fullText + extrasText()).then(() => {
      if (!alive.current) return
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => alive.current && setCopied(false), 1500)
    }).catch(() => flashToast('복사에 실패했습니다.'))
  }

  // 즐겨찾기 저장
  const saveSetting = () => {
    if (!setting) return
    setSaved((prev) => [{ id: rid(), setting, note: '' }, ...prev])
    flashToast('배경을 즐겨찾기에 저장했어요')
  }
  const removeSaved = (id: string) => {
    setSaved((prev) => prev.filter((s) => s.id !== id))
    if (editId === id) { setEditId(''); setEditText('') }
  }
  const startEdit = (s: SavedSetting) => { setEditId(s.id); setEditText(s.note) }
  const commitEdit = () => {
    const t = editText.trim()
    setSaved((prev) => prev.map((s) => (s.id === editId ? { ...s, note: t } : s)))
    setEditId(''); setEditText('')
  }
  const loadSaved = (s: SavedSetting) => { setSetting(s.setting); setLocks({}); setCopied(false); flashToast('배경을 불러왔어요') }

  // ── 연계: 공유 장소 라이브러리 ──
  const toLibrary = (st: Setting, note?: string) => {
    const sensory = [
      `시각·기상: ${st.weather}`,
      `마법 기운: ${st.mana}`,
      `권력·세력: ${st.power}`,
      `위협의 기척: ${st.threat}`,
      `감각 디테일: ${st.detail.join(' / ')}`,
    ].join('\n')
    addToLibrary('places', {
      name: st.place,
      kind: '판타지 무대',
      mood: st.mood,
      sensory,
      notes: note || compose(st),
      source: '판타지 배경·현장 생성기',
      // 정규(정규화) 키 — 받는 허브(배경 설정집)에서 항목이 제자리에 들어가도록 1:1 매핑(추가).
      fields: mergeExtras({
        name: st.place,                       // 장소명
        kind: '판타지 무대',                   // 종류/유형
        atmosphere: st.mood,                  // 분위기
        appearance: st.mana,                  // 마법 기운(시각적 마법 묘사)
        sensory: st.detail.join(' / '),       // 감각 디테일(오감)
        climate: st.weather,                  // 시각·기상
        inhabitants: st.power,                // 권력·세력
        dangers: st.threat,                   // 위협의 기척
        ...(note ? { notes: note } : {}),     // 메모
      }),
    })
    flashToast(`장소 ‘${st.place}’를 공유 라이브러리에 추가했어요`)
  }

  // ── 연계: 글감 스니펫 ──
  const toSnippet = (st: Setting) => {
    addToLibrary('snippets', {
      text: compose(st) + extrasText(),
      source: '판타지 배경·현장 생성기',
      tags: ['판타지', '배경', '글감'],
    })
    flashToast('배경 글감을 스니펫으로 저장했어요')
  }

  // ── 연계: 프로젝트(설정 카드, 자료 › 장소) ──
  const linked = hasProjectBridge()
  const toProject = (st: Setting, note?: string) => {
    if (!linked) { flashToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = [
      `<p><b>🏰 장소(권역):</b> ${esc(st.place)}</p>`,
      `<p><b>🌌 시각·기상:</b> ${esc(st.weather)}</p>`,
      `<p><b>✨ 마법 기운:</b> ${esc(st.mana)}</p>`,
      `<p><b>🎭 분위기:</b> ${esc(st.mood)}</p>`,
      `<p><b>⚔️ 권력·세력:</b> ${esc(st.power)}</p>`,
      `<p><b>🐉 위협의 기척:</b> ${esc(st.threat)}</p>`,
      `<p><b>🌫️ 감각 디테일:</b></p><ul>${st.detail.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>`,
      // 사용자 정의 항목(값이 있는 것만) — 라벨 그대로 표시.
      ...custom.filter((c) => c.label.trim() && c.value.trim()).map((c) => `<p><b>${esc(c.label.trim())}:</b> ${esc(c.value.trim())}</p>`),
      etc.trim() ? `<p><b>기타:</b> ${esc(etc.trim())}</p>` : '',
      note ? `<hr/><p><b>메모:</b> ${esc(note)}</p>` : '',
      `<hr/><p style="line-height:1.7;">${esc(compose(st))}</p>`,
    ].filter(Boolean).join('')
    const character: Record<string, string> = {
      name: st.place,
      type: '판타지 무대',
      mood: st.mood,
      weather: st.weather,
      mana: st.mana,
      power: st.power,
      threat: st.threat,
      sensory: st.detail.join(' / '),
      // 정규(정규화) 키 — 받는 허브에서 제자리 정렬되도록 1:1 매핑(추가, 기존 키는 유지).
      kind: '판타지 무대',          // 종류/유형
      atmosphere: st.mood,         // 분위기
      appearance: st.mana,         // 마법 기운(시각적 마법 묘사)
      climate: st.weather,         // 시각·기상
      inhabitants: st.power,       // 권력·세력
      dangers: st.threat,          // 위협의 기척
    }
    if (note) character.notes = note
    const id = addToProject({
      kind: 'setting',
      root: 'research',
      folder: '장소',
      title: `무대 · ${st.place}`,
      bodyHtml,
      character: mergeExtras(character),
      meta: { 유형: '판타지 무대', 분위기: st.mood, 출처: '판타지 배경·현장 생성기' },
    })
    flashToast(id ? `‘${st.place}’ 무대를 프로젝트(자료 › 장소)에 추가했어요` : '프로젝트에 추가하지 못했습니다.')
  }

  // payload.genre 맥락 배지
  const ctxGenre = payload && typeof (payload as any).genre === 'string' ? String((payload as any).genre).trim() : ''

  // 관련 도구
  const RELATED: { id: string; icon: string; label: string }[] = [
    { id: 'setting-bible', icon: '🗺️', label: '배경 설정집' },
    { id: 'world-wiki', icon: '📚', label: '세계관 위키' },
    { id: 'scene-list', icon: '🎬', label: '장면 목록' },
    { id: 'sensory-palette', icon: '🎨', label: '감각 팔레트' },
    { id: 'myth-creature', icon: '🐉', label: '신화 생물 사전' },
  ]

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 12, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const introStyle: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 2 }
  const slotCard: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px' }
  const secTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
  const savedRow: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }
  const noteInput: React.CSSProperties = { flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 12, outline: 'none' }

  return (
    <div style={wrap}>
      <div style={introStyle}>
        <b>장소·기상·마법 기운·세력·위협·감각 디테일</b>을 무작위로 엮어 하나의 <b>판타지 무대</b>를 만듭니다.
        마음에 드는 칸은 <Emoji e="🔒" />로 잠그고 나머지만 다시 굴리세요.
      </div>

      {ctxGenre && (
        <div style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 9px' }}>
          <Emoji e="🧭" /> 맥락: {emojify(ctxGenre)}
        </div>
      )}

      {/* 생성 도구바 + 조합수 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={generate}><Emoji e="🎲" /> {lockedCount ? '나머지 다시 생성' : '무대 생성'}</button>
        {lockedCount > 0 && <span style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="🔒" /> {lockedCount}개 잠금</span>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>
          약 <b style={{ color: 'var(--accent)' }}>{combos.toLocaleString('ko-KR')}</b>가지 조합
        </span>
      </div>

      {toast && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--ok)', color: 'var(--ok)', borderRadius: 8, padding: '7px 10px', fontSize: 12 }}>
          <Emoji e="✅" /> {emojify(toast)}
        </div>
      )}

      <div style={body}>
        {/* 슬롯들 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SLOTS.map((sl) => {
            const isLocked = !!locks[sl.key]
            const val = slotValue(sl.key)
            const dim = rolling && !isLocked
            return (
              <div key={sl.key} style={{ ...slotCard, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0 }}><Emoji e={sl.icon} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{sl.label}</div>
                  {sl.key === 'detail' && setting && setting.detail.length ? (
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.45, color: dim ? 'var(--muted)' : 'var(--text)' }}>
                      {setting.detail.map((d, i) => <li key={i}>{dim ? '…' : d}</li>)}
                    </ul>
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, overflowWrap: 'anywhere', color: val ? (dim ? 'var(--muted)' : 'var(--text)') : 'var(--muted)' }}>
                      {val ? (dim ? '…' : val) : '— 생성해 주세요 —'}
                    </div>
                  )}
                </div>
                <button
                  className="minibtn"
                  onClick={() => toggleLock(sl.key)}
                  title={isLocked ? '잠금 해제' : '이 칸 잠그기'}
                  style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}
                >{isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
              </div>
            )
          })}
        </div>

        {/* 사용자 정의 항목 + 기타 (직접 입력) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ ...secTitle }}>
            <span><Emoji e="✍️" /> 직접 입력 항목</span>
            <button className="minibtn" onClick={addCustom} title="원하는 항목을 직접 추가합니다(내용은 직접 작성)">＋ 항목 추가</button>
          </div>
          {custom.map((c) => (
            <div key={c.id} style={{ ...slotCard, alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{emojify(c.label)}</div>
                <input
                  value={c.value}
                  onChange={(e) => changeCustom(c.id, e.target.value)}
                  placeholder="내용을 직접 적어 주세요"
                  style={{ ...noteInput, width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <button className="minibtn" onClick={() => removeCustom(c.id)} title="이 항목 삭제" style={{ flexShrink: 0 }}>✕</button>
            </div>
          ))}
          <div style={{ ...slotCard, alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="🗒️" /> 기타</div>
            <textarea
              value={etc}
              onChange={(e) => setEtc(e.target.value)}
              placeholder="자유롭게 적어 주세요 (위 항목에 없는 설정·메모·아이디어 등)"
              rows={4}
              style={{ ...noteInput, width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 72, lineHeight: 1.5 }}
            />
          </div>
        </div>

        {/* 조합 글감 */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🏰" /> 배경 묘사 글감</div>
          <div style={{ fontSize: 14, lineHeight: 1.65, color: setting ? 'var(--text)' : 'var(--muted)' }}>
            {fullText || '〈무대 생성〉을 눌러 배경을 만들어 보세요.'}
          </div>
        </div>

        {/* 산출물 도구바 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="minibtn" onClick={copyText} disabled={!setting}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 글쓰기에 활용</>}</button>
          <button className="minibtn" onClick={saveSetting} disabled={!setting}>☆ 즐겨찾기</button>
          <button className="linkbtn" onClick={() => setting && toLibrary(setting)} disabled={!setting} title="이 무대의 장소를 공유 장소 라이브러리에 추가"><Emoji e="📥" /> 장소 라이브러리</button>
          <button className="linkbtn" onClick={() => setting && toSnippet(setting)} disabled={!setting} title="이 배경 글감을 스니펫으로 저장"><Emoji e="📝" /> 스니펫 저장</button>
          <button
            className="linkbtn"
            onClick={() => setting && toProject(setting)}
            disabled={!setting || !linked}
            title={linked ? '이 무대를 프로젝트 설정(자료 › 장소 폴더)에 추가' : '프로젝트에 연결되어 있지 않습니다'}
          ><Emoji e="📄" /> 프로젝트에 추가</button>
        </div>

        {/* 즐겨찾기 */}
        <div>
          <div style={{ ...secTitle, marginBottom: 6 }}>
            <span><Emoji e="⭐" /> 저장한 무대 {saved.length ? `(${saved.length})` : ''}</span>
          </div>
          {!saved.length ? (
            <div style={{ color: 'var(--muted)', fontSize: 12, padding: '8px 2px' }}>아직 저장한 무대가 없습니다. ☆로 마음에 드는 배경을 모아보세요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {saved.map((s) => (
                <div key={s.id} style={savedRow}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}><Emoji e="🏰" /> {s.setting.place}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{compose(s.setting)}</div>
                  {editId === s.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditId(''); setEditText('') } }}
                        placeholder="메모 (등장 장면·세력·복선 등)"
                        style={noteInput}
                      />
                      <button className="minibtn" onClick={commitEdit}>저장</button>
                      <button className="minibtn" onClick={() => { setEditId(''); setEditText('') }}>취소</button>
                    </div>
                  ) : (
                    <>
                      {s.note && <div style={{ fontSize: 11.5, color: 'var(--accent)' }}><Emoji e="📝" /> {emojify(s.note)}</div>}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="minibtn" onClick={() => loadSaved(s)} title="이 무대를 위에 불러오기">↩ 불러오기</button>
                        <button className="linkbtn" onClick={() => toLibrary(s.setting, s.note || undefined)} title="공유 장소 라이브러리에 추가"><Emoji e="📥" /> 장소</button>
                        <button className="linkbtn" onClick={() => toSnippet(s.setting)} title="스니펫으로 저장"><Emoji e="📝" /> 스니펫</button>
                        <button className="linkbtn" onClick={() => toProject(s.setting, s.note || undefined)} disabled={!linked} title={linked ? '프로젝트(자료 › 장소)로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트</button>
                        <button className="minibtn" onClick={() => startEdit(s)} title="메모 편집"><Emoji e="✏️" /></button>
                        <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제"><Emoji e="🗑️" /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 관련 도구 연계 바 */}
      <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
        {RELATED.map((r) => (
          <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, ctxGenre ? { genre: ctxGenre } : { genre: '판타지' })} title={`${r.label} 열기`}>
            <Emoji e={r.icon} /> {r.label}
          </button>
        ))}
      </div>

      <div className="license-note" style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'right' }}>
        로컬 자작 데이터 · 외부 네트워크 없음 · 생성 무대는 출발점일 뿐 자유롭게 비틀어 보세요
      </div>
    </div>
  )
}
