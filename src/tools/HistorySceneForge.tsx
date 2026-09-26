// 역사·사극 장면 생성기(HistorySceneForge) — 이 장르 전형 장면을 슬롯 조합으로 무작위 생성.
// 도시에 근거: 어전 설전·반정/역모·간택/정략혼·미래지식 발휘·상소 대결·비극적 운명·암행/잠행 등.
// 슬롯별 🔒 잠금 + 🎲 부분 재생성. 조합수 표시(1조 이상). 전개법(장면형) 프리셋으로 슬롯 풀을 가변.
// 연계(linkbus): addToProject(folder:"장면")·스니펫(snippets)·장소(places)·관련 도구 열기. 외부 API 미사용(완전 로컬).
// react 와 './linkbus' 외 import 없음. localStorage 'sry:tool:history-sceneforge' 에 즐겨찾기 보관.
import { useMemo, useState, useEffect, useRef } from 'react'
import { addToLibrary, openToolLinked, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = {
  id: 'history-sceneforge',
  name: '사극 장면 생성기(1조+ 조합)',
  icon: '🏯',
  group: '생성기',
  genre: '역사·사극',
  intro: '어전 설전·반정·간택·미래지식 등 사극 전형 장면을 1조 가지 이상으로 자아냅니다',
  w: 520,
  h: 660,
}

const LS_KEY = 'sry:tool:history-sceneforge'

// ── 장면형(전개법) 프리셋 ─────────────────────────────
// 각 장면형은 도시에의 '서사 장치/클라이맥스 관습'에 대응. 슬롯 풀(특히 사건축·결정타)을 가변 노출.
type SceneKind =
  | 'court'     // 어전회의·상소 설전(말의 전쟁)
  | 'coup'      // 반정·역모(거사 모의→정변)
  | 'marriage'  // 간택·정략혼(동맹 재편)
  | 'future'    // 미래지식 발휘(회귀·빙의)
  | 'tragedy'   // 비극적 운명(드라마틱 아이러니)
  | 'covert'    // 암행·잠행·신분 위장
  | 'battle'    // 결전(임진·병자형)
  | 'palace'    // 궁중암투(후궁·외척)

interface KindMeta { id: SceneKind; label: string; icon: string; hint: string }
const KINDS: KindMeta[] = [
  { id: 'court', label: '어전 설전', icon: '🗣', hint: '상소·어전회의에서 명분과 논리로 정적을 무너뜨리는 말의 전쟁' },
  { id: 'coup', label: '반정·역모', icon: '⚔️', hint: '거사 모의·포섭·거병으로 이어지는 정변 서스펜스' },
  { id: 'marriage', label: '간택·정략혼', icon: '🎎', hint: '후궁 간택·정략혼으로 동맹과 권력도가 재편되는 장면' },
  { id: 'future', label: '미래지식', icon: '💡', hint: '회귀·빙의자가 미래 지식으로 신임을 얻되 제약과 부딪히는 장면' },
  { id: 'tragedy', label: '비극적 운명', icon: '🕯', hint: '결말을 아는 독자만의 비애 — 드라마틱 아이러니' },
  { id: 'covert', label: '암행·잠행', icon: '🥷', hint: '신분 위장·미행·정체 탄로의 긴장' },
  { id: 'battle', label: '결전', icon: '🏹', hint: '열세를 뒤집는 전술·진법·신무기의 결전' },
  { id: 'palace', label: '궁중암투', icon: '🏮', hint: '후궁·외척·환관이 얽힌 내전(內殿)의 음모' },
]

interface Slot { key: string; label: string; options: string[] }

// ── 공통 슬롯(모든 장면형) ────────────────────────────
const PLACE: Slot = { key: 'place', label: '장소', options: [
  '편전 어전(御殿)', '정전의 조회(朝會)', '대비전 내실', '중궁전 침소', '동궁(세자궁) 서연장',
  '경연(經筵)이 열린 강당', '의금부 국문장', '사헌부 대청', '홍문관 옥당', '승정원 입직 처소',
  '비변사 회의청', '규장각 서고', '내의원 약방', '상의원 침방', '내수사 곳간',
  '한양 도성 육조 거리', '저잣거리 객주', '주막 봉놋방', '관아 동헌', '향교 명륜당',
  '서원의 사당', '변방 진(鎭)의 망루', '봉수대 위', '강가 나루의 파발막', '사대부가 사랑채',
  '후원 정자', '궐 밖 외척의 별저', '능침(陵寢) 앞', '교외 사냥터', '폐궁의 빈 전각',
  '한겨울 압록강 나루', '남한산성 행궁', '명나라 사신을 맞는 모화관', '왜관(倭館) 객사', '청 사신 영접 도중의 객관',
] }

const ERA: Slot = { key: 'era', label: '시대·왕대', options: [
  '태조 개국 직후의 어수선한 조정', '태종의 왕권 강화기', '세종 치세의 집현전 전성기', '세조 즉위 직후의 살얼음판',
  '성종대 사림이 막 진출하던 무렵', '연산군의 폭정이 짙어가던 때', '중종반정 직후의 혼란', '명종대 외척 윤원형 세도기',
  '선조 즉위 후 동서 분당의 기운', '임진왜란 한가운데', '광해군 중립외교의 시절', '인조반정 뒤 서인 집권기',
  '병자호란 전야의 주화·척화 논쟁', '효종 북벌론이 끓던 때', '현종대 예송(禮訟)의 와중', '숙종 환국(換局)의 격랑',
  '경종대 노소론 대립의 절정', '영조 탕평의 한복판', '사도세자 비극의 전후', '정조 개혁의 친정기',
  '순조 즉위 후 세도정치의 시작', '가상 왕조 대월(大月)의 전성기', '가상 조선풍 왕국의 권력 공백기',
] }

const TIME: Slot = { key: 'time', label: '때·기상', options: [
  '닭이 우는 인시(寅時) 새벽', '조회를 알리는 묘시(卯時)', '한낮의 오시(午時)', '해 기우는 신시(申時)',
  '통금을 알리는 인정(人定) 무렵', '파루(罷漏)가 울리는 첫새벽', '장맛비 쏟아지는 한밤', '첫서리 내린 이른 아침',
  '함박눈이 전각을 덮는 저녁', '삭풍이 휘몰아치는 동짓달', '보름달이 후원을 비추는 밤', '안개가 도성을 휘감은 새벽',
  '뙤약볕이 내리쬐는 삼복', '천둥이 종묘를 흔드는 야밤', '제삿날의 정갈한 새벽', '동지 차례를 앞둔 저물녘',
  '단오 명절의 한낮', '대보름 달집이 타오르는 밤', '일식이 해를 가린 대낮', '혜성이 꼬리를 끄는 깊은 밤',
] }

const SUBJECT: Slot = { key: 'subject', label: '시점 인물', options: [
  '갓 즉위한 어린 임금', '노회한 영의정', '강직한 사헌부 대사헌', '날 선 사간원 정언',
  '미래에서 빙의한 세자', '몰락한 가문의 서자', '권세를 노리는 외척 대감', '음흉한 환관 우두머리',
  '간택을 앞둔 처녀', '총애를 다투는 후궁', '대비전을 지키는 상궁', '대의를 품은 젊은 무관',
  '북변을 지키는 절도사', '암행에 나선 어사', '저잣거리의 보부상 행수', '내의원의 어의(御醫)',
  '회귀한 폐세자', '귀양에서 풀려난 노대신', '명나라 사신을 응대하는 역관', '척화를 외치는 산림(山林) 처사',
  '왜군과 맞선 수군 장수', '반정을 도모하는 훈련대장', '경연을 이끄는 시강원 빈객', '잠행 나온 임금',
] }

const STAKE: Slot = { key: 'stake', label: '판돈·동기', options: [
  '왕권을 지키려', '신권(臣權)을 세우려', '가문의 멸문을 막으려', '삼족(三族)을 살리려',
  '대의명분을 세우려', '충(忠)과 효(孝) 사이에서', '억울한 옥사를 뒤집으려', '잃은 옥새의 정통을 회복하려',
  '백성의 굶주림을 구하려', '외침의 위기를 넘기려', '폐위의 음모를 막으려', '세자의 자리를 지키려',
  '사약을 면하려', '연좌의 화를 끊으려', '당파의 명운을 걸고', '선왕의 유지(遺志)를 받들려',
  '개혁의 명분을 얻으려', '정적의 무고를 벗기려', '북벌의 대업을 위하여', '강화(講和)의 길을 트려',
] }

// ── 장면형별 사건축(turn)·결정타(climax) — 도시에 장치에 대응 ──
const TURN_BY_KIND: Record<SceneKind, string[]> = {
  court: [
    '상소가 어전에 올라 정전이 술렁인다', '대간(臺諫)이 합사(合辭)로 탄핵을 외친다',
    '왕이 침묵 끝에 윤허 여부를 묻는다', '정적이 고사(故事)를 인용해 반박한다',
    '숨겨둔 장계 한 통이 펼쳐진다', '예법을 들어 상대의 발언을 봉쇄한다',
    '거짓 상소의 필체가 들통난다', '삼사(三司)가 일제히 대궐 뜰에 엎드린다',
    '왕이 붓을 들어 비답(批答)을 내리려 한다', '대신이 관을 벗고 사직을 청한다',
  ],
  coup: [
    '한밤 거사의 군호(軍號)가 정해진다', '포섭한 군관이 막판에 망설인다',
    '돈화문이 안에서 열린다', '대비의 교지가 거사의 명분이 된다',
    '내응(內應)하기로 한 자가 보이지 않는다', '횃불이 궐문에 닿자 북소리가 울린다',
    '거사 명단이 적힌 밀지가 발각될 위기에 놓인다', '옥새를 손에 넣은 자가 즉위를 선포한다',
    '폐위될 임금이 군졸의 발소리를 듣는다', '한발 늦은 파발이 변고를 알린다',
  ],
  marriage: [
    '삼간택의 마지막 처녀가 들어선다', '대비가 점찍은 가문이 뒤바뀐다',
    '정략혼의 사주단자가 오간다', '간택의 자리에서 한 처녀가 직언을 한다',
    '외척이 될 가문의 세력도가 요동친다', '폐서인된 후궁의 자리가 비어 다툼이 인다',
    '혼사의 이면에 숨은 거래가 드러난다', '왕이 뜻밖의 처녀를 마음에 둔다',
    '국혼(國婚)을 빌미로 당파가 결탁한다', '정략혼을 거부한 대가가 가문에 닥친다',
  ],
  future: [
    '머릿속에 떠오른 미래의 지식을 시험한다', '화약 배합·이앙법의 비책을 꺼내든다',
    '다가올 환국(換局)을 미리 읽어낸다', '낯선 처방(종두법)이 의심을 산다',
    '"왜 지금 그것이 가능한가"를 추궁당한다', '재물·장인·정치 반발이 발목을 잡는다',
    '미래에 일어날 변고를 막으려 선수를 친다', '현대의 사고가 고풍 어투와 부딪쳐 웃음을 산다',
    '작은 발명(비누·증류주)이 뜻밖의 신임을 부른다', '바꿔버린 역사의 나비효과가 되돌아온다',
  ],
  tragedy: [
    '독자만 아는 비극의 그림자가 드리운다', '돌이킬 수 없는 어명이 떨어진다',
    '사약이 담긴 사발이 놓인다', '삼배구고두(三拜九叩頭)의 치욕이 다가온다',
    '단종처럼 어린 임금이 영월로 떠난다', '충신의 마지막 장계가 도착한다',
    '이미 모든 것이 끝난 뒤임을 깨닫는다', '운명을 알면서도 그 길을 택한다',
    '장렬한 패배가 도리어 절정이 된다', '훗날 신원(伸冤)될 죽음을 향해 걷는다',
  ],
  covert: [
    '암행어사가 마패를 품은 채 신분을 숨긴다', '잠행 나온 임금이 백성의 원성을 듣는다',
    '위장한 정체가 탄로 날 위기에 처한다', '미행하던 자가 도리어 미행당한다',
    '봉인된 밀지를 몰래 베껴 적는다', '저잣거리에서 정적의 첩자를 알아본다',
    '"암행어사 출도(出道)요!"가 터져 나온다', '변복한 무관이 적진에 잠입한다',
    '암호가 적힌 간찰을 가까스로 삼킨다', '신분 위장이 뜻밖의 인연을 만든다',
  ],
  battle: [
    '열세의 진(陣)을 학익진으로 바꾼다', '봉수가 끊겨 원군이 오지 않는다',
    '화포의 사거리를 미래지식으로 끌어올린다', '적장의 허를 찌르는 야습을 감행한다',
    '강을 등진 배수진(背水陣)을 친다', '거짓 후퇴로 적을 매복으로 끌어들인다',
    '성문이 안에서 열려 내통이 드러난다', '마지막 한 척의 배로 길목을 막아선다',
    '눈보라가 적의 진군을 멈춘다', '"나의 죽음을 알리지 말라"는 명이 내린다',
  ],
  palace: [
    '후궁의 처소에서 저주의 물건이 나온다', '대비전과 중궁전의 신경전이 날카로워진다',
    '환관이 은밀한 교지를 위조한다', '독이 든 탕약이 수라간을 거친다',
    '총애를 잃은 후궁이 역공을 꾀한다', '외척이 내명부(內命婦)를 손에 넣으려 한다',
    '왕자의 출생을 둘러싼 비밀이 새어 나온다', '상궁 하나가 양쪽을 오가며 정보를 판다',
    '폐비(廢妃)의 옛 일이 다시 들춰진다', '국문 끝에 내전의 음모가 실토된다',
  ],
}

const CLIMAX_BY_KIND: Record<SceneKind, string[]> = {
  court: [
    '왕이 마침내 "윤허하노라" 한마디로 판을 가른다', '결정적 증좌 한 장이 정적을 무너뜨린다',
    '"통촉하여 주시옵소서"가 정전을 가득 메운다', '정적이 관을 벗어 던지며 물러난다',
    '비답이 내려 상소가 받아들여진다', '명분 싸움의 승패가 단 한 줄로 갈린다',
  ],
  coup: [
    '옥새가 새 주인의 손에 들린다', '폐위 교서가 어전에 낭독된다',
    '거병이 성공해 새 임금이 즉위한다', '거사가 발각되어 모두 의금부로 끌려간다',
    '동이 트며 궐의 주인이 바뀐다', '한 사람의 배신으로 모든 것이 뒤집힌다',
  ],
  marriage: [
    '간택의 낙점이 떨어져 권력도가 재편된다', '국혼으로 한 가문이 외척의 정점에 오른다',
    '정략혼이 깨지며 동맹이 와해된다', '뜻밖의 처녀가 중전의 자리에 오른다',
    '혼사를 빌미로 한 거래가 백일하에 드러난다', '거절의 대가로 가문에 화가 미친다',
  ],
  future: [
    '미래지식이 적중해 단번에 신임을 얻는다', '제약을 이기지 못해 절반의 성공에 그친다',
    '바꾼 역사가 새로운 위기를 부른다', '작은 발명이 부와 권세의 토대가 된다',
    '"네가 어찌 이를 아느냐"는 의심이 정체를 위협한다', '예측한 변고가 그대로 들어맞아 좌중이 얼어붙는다',
  ],
  tragedy: [
    '사약을 받들며 의연히 마지막을 맞는다', '어린 임금이 끝내 사사(賜死)된다',
    '항복의 예를 올리며 치욕을 삼킨다', '충신의 죽음이 훗날 신원의 씨앗이 된다',
    '장렬한 최후가 전설로 남는다', '운명을 받아들이는 한 마디가 좌중을 적신다',
  ],
  covert: [
    '"암행어사 출도요!"와 함께 탐관이 무너진다', '위장이 끝내 탄로 나 쫓기는 신세가 된다',
    '잠입에 성공해 결정적 정보를 빼낸다', '정체가 밝혀지나 도리어 명분을 얻는다',
    '미행 끝에 배후의 거물을 잡아낸다', '변복한 임금이 정체를 드러내 민심을 사로잡는다',
  ],
  battle: [
    '열세를 뒤집어 대승을 거둔다', '승리의 순간 장수가 적탄에 쓰러진다',
    '신무기가 전세를 단숨에 바꾼다', '간발의 차로 성을 지켜낸다',
    '값비싼 희생 끝에 길목을 사수한다', '패배 속에서도 적에게 깊은 상처를 남긴다',
  ],
  palace: [
    '국문 끝에 내전의 음모가 모두 실토된다', '폐위와 함께 한 세력이 몰락한다',
    '후궁이 사사되고 외척이 숙청된다', '왕자의 비밀이 권력도를 송두리째 뒤집는다',
    '저주의 진상이 드러나 좌중이 경악한다', '음모를 꾸민 자가 도리어 그 덫에 걸린다',
  ],
}

const DETAIL: Slot = { key: 'detail', label: '시대 감각', options: [
  '곤룡포 자락에 스치는 향내', '먹을 가는 벼루 소리', '교지를 봉인하는 인주 냄새',
  '관복 흉배의 학과 호랑이 무늬', '머리 위로 늘어진 발(簾) 너머의 그림자', '향로에서 피어오르는 침향',
  '댓돌 위에 가지런한 목화(木靴)', '파발마의 다급한 말발굽 소리', '봉수의 연기가 다섯 줄로 오른다',
  '호패를 매만지는 거친 손끝', '간찰을 봉하는 밀랍의 미끈함', '편전 처마 끝 풍경(風磬) 소리',
  '내관의 나직한 헛기침', '상소 두루마리가 풀리는 소리', '국문장에 도는 피비린내',
  '익선관 위에 내려앉는 첫눈', '대청마루의 서늘한 한기', '저잣거리 엿장수의 가위 소리',
  '청자 찻잔에 도는 작설차의 김', '곤장이 살을 때리는 둔탁한 소리',
] }

const LINE: Slot = { key: 'line', label: '대사·결정구', options: [
  '"전하, 통촉하여 주시옵소서."', '"성은이 망극하옵니다."', '"아니 되옵니다, 전하."',
  '"신을 믿어 주시옵소서."', '"역모이옵니다, 전하!"', '"저자의 목을 쳐라."',
  '"분부 거행하겠나이다."', '"황공하여 몸 둘 바를 모르겠나이다."', '"과인이 그대를 믿겠노라."',
  '"이미 모든 것이 끝난 뒤였다."', '"여기가… 조선인가."', '"이 몸의 기억이 흘러드는구나."',
  '"대의(大義) 앞에 사사로움은 없소이다."', '"가문의 명운이 이 한 수에 달렸소."', '"내 죽음을 적에게 알리지 말라."',
  '"신원될 날이 반드시 오리이다."', '"전하의 뜻이 곧 하늘의 뜻이옵니다."', '"이 또한 천명(天命)이라면."',
] }

// 슬롯 풀(공통). turn/climax 는 장면형에 따라 동적으로 끼워 넣는다.
const BASE_SLOTS: Slot[] = [PLACE, ERA, TIME, SUBJECT, STAKE]
const TAIL_SLOTS: Slot[] = [DETAIL, LINE]

function slotsFor(kind: SceneKind): Slot[] {
  return [
    ...BASE_SLOTS,
    { key: 'turn', label: '사건·전개', options: TURN_BY_KIND[kind] },
    { key: 'climax', label: '결정타', options: CLIMAX_BY_KIND[kind] },
    ...TAIL_SLOTS,
  ]
}

// 조합수: 장면형별 슬롯 풀의 곱을 모두 합산(장면형 선택도 변주이므로 합).
function combosFor(kind: SceneKind): number {
  return slotsFor(kind).reduce((n, s) => n * s.options.length, 1)
}
const TOTAL_COMBOS = (Object.keys(TURN_BY_KIND) as SceneKind[]).reduce((sum, k) => sum + combosFor(k), 0)

function randIdx(n: number) { return Math.floor(Math.random() * n) }

interface Fav { id: string; kind: SceneKind; text: string; title: string }
function loadFavs(): Fav[] {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw) as Fav[] } catch { /* noop */ }
  return []
}

export default function HistorySceneForge({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 활용: 역사·사극이 아니면 안내만 살짝(기능은 그대로). payload.kind 로 장면형 프리셋 가능.
  const initialKind: SceneKind = (() => {
    const k = payload?.kind
    if (typeof k === 'string' && (KINDS as KindMeta[]).some((m) => m.id === k)) return k as SceneKind
    return 'court'
  })()

  const [kind, setKind] = useState<SceneKind>(initialKind)
  const slots = useMemo(() => slotsFor(kind), [kind])

  const [picks, setPicks] = useState<Record<string, number>>(() =>
    Object.fromEntries(slotsFor(initialKind).map((s) => [s.key, randIdx(s.options.length)])),
  )
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState('')
  const [favs, setFavs] = useState<Fav[]>(() => loadFavs())
  const flashTimer = useRef<number | null>(null)
  const copyTimer = useRef<number | null>(null)

  // 언마운트 정리
  useEffect(() => () => {
    if (flashTimer.current != null) clearTimeout(flashTimer.current)
    if (copyTimer.current != null) clearTimeout(copyTimer.current)
  }, [])

  // 장면형 변경 시 turn/climax 인덱스가 새 풀 길이를 넘지 않도록 보정(잠금된 공통 슬롯은 유지).
  const changeKind = (k: SceneKind) => {
    setKind(k)
    const ns = slotsFor(k)
    setPicks((p) => Object.fromEntries(ns.map((s) => {
      const cur = p[s.key]
      if (locked[s.key] && typeof cur === 'number' && cur < s.options.length) return [s.key, cur]
      return [s.key, randIdx(s.options.length)]
    })))
  }

  const rollAll = () => setPicks((p) => Object.fromEntries(slots.map((s) => [s.key, locked[s.key] ? p[s.key] : randIdx(s.options.length)])))
  const rollOne = (k: string) => { if (locked[k]) return; setPicks((p) => ({ ...p, [k]: randIdx(slots.find((s) => s.key === k)!.options.length) })) }
  const toggleLock = (k: string) => setLocked((l) => ({ ...l, [k]: !l[k] }))

  const val = (k: string) => { const s = slots.find((x) => x.key === k)!; return s.options[picks[k]] }

  const kindMeta = KINDS.find((m) => m.id === kind)!
  const title = useMemo(() => `[${kindMeta.label}] ${val('subject')} · ${val('place')}`, [kind, picks])

  const sceneText = useMemo(() => {
    return (
      `${val('era')}. ${val('place')}, ${val('time')}.\n` +
      `${val('subject')}은(는) ${val('stake')} 나선다. ${val('turn')}.\n` +
      `${val('line')} ${val('climax')}.\n` +
      `(감각: ${val('detail')})`
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, picks])

  const flash = (m: string) => {
    setSaved(m)
    if (flashTimer.current != null) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setSaved(''), 1600)
  }

  const copy = () => {
    const doFallback = () => {
      try {
        const ta = document.createElement('textarea')
        ta.value = sceneText; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      } catch { /* noop */ }
    }
    const after = () => { setCopied(true); if (copyTimer.current != null) clearTimeout(copyTimer.current); copyTimer.current = window.setTimeout(() => setCopied(false), 1400) }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(sceneText).then(after).catch(() => { doFallback(); after() })
    else { doFallback(); after() }
  }

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const toProject = () => {
    const bodyHtml = sceneText.split('\n').map((l) => `<p>${esc(l)}</p>`).join('')
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '장면',
      title,
      bodyHtml,
      synopsis: `${kindMeta.label} 장면 — ${val('subject')}, ${val('place')}`,
      icon: meta.icon,
      meta: { 장면형: kindMeta.label, 시대: val('era'), 장소: val('place'), POV: val('subject'), 판돈: val('stake') },
    })
    flash(id ? '프로젝트 원고 「장면」에 추가됨' : '프로젝트에 연결되어 있지 않습니다')
  }

  const toSnippet = () => { addToLibrary('snippets', { text: sceneText, source: '사극 장면 생성기', tags: ['장면', '역사·사극', kindMeta.label] }); flash('스니펫으로 저장됨') }
  const toPlace = () => { addToLibrary('places', { name: val('place'), kind: '사극 배경', mood: kindMeta.label, history: val('era'), sensory: val('detail'), notes: sceneText, source: '사극 장면 생성기', fields: { name: val('place'), kind: '사극 배경', atmosphere: kindMeta.label, history: val('era'), sensory: val('detail'), notes: sceneText } }); flash('배경 라이브러리에 장소 저장됨') }

  const addFav = () => {
    const f: Fav = { id: 'f_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4).toString(36), kind, text: sceneText, title }
    const next = [f, ...favs].slice(0, 50)
    setFavs(next)
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch { /* noop */ }
    flash('즐겨찾기에 보관됨')
  }
  const delFav = (id: string) => {
    const next = favs.filter((f) => f.id !== id)
    setFavs(next)
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch { /* noop */ }
  }
  const copyFav = (t: string) => {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(t).catch(() => {})
    flash('복사됨')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const note: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const kindRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const kindBtn = (active: boolean): React.CSSProperties => ({
    fontSize: 12, padding: '5px 10px', borderRadius: 999, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'var(--chrome-2)', color: active ? '#fff' : 'var(--text)',
  })
  const sceneBox: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 14.5, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
  const slotRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }

  return (
    <div style={wrap}>
      <div style={note}>
        조합 가능 장면 <b style={{ color: 'var(--accent)' }}>{TOTAL_COMBOS.toLocaleString()}</b>가지(현재 장면형 <b>{combosFor(kind).toLocaleString()}</b>). 장면형을 고르고, 슬롯을 <Emoji e="🔒" /> 잠근 뒤 나머지만 <Emoji e="🎲" /> 돌려 원하는 장면을 빚으세요.
      </div>

      <div style={kindRow}>
        {KINDS.map((m) => (
          <span key={m.id} style={kindBtn(kind === m.id)} onClick={() => changeKind(m.id)} role="button" tabIndex={0} title={m.hint}>
            <Emoji e={m.icon} /> {m.label}
          </span>
        ))}
      </div>
      <div style={{ ...note, fontSize: 11.5 }}>· {kindMeta.hint}</div>

      <div style={sceneBox}>{sceneText}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {slots.map((s) => (
          <div key={s.key} style={slotRow}>
            <span style={{ fontSize: 11, color: 'var(--muted)', width: 70, flexShrink: 0 }}>{s.label}</span>
            <span style={{ flex: 1, fontSize: 13, lineHeight: 1.45 }}>{s.options[picks[s.key]]}</span>
            <button className="minibtn" title={locked[s.key] ? '잠금 해제' : '이 슬롯 잠금'} onClick={() => toggleLock(s.key)} style={{ color: locked[s.key] ? 'var(--accent)' : 'var(--muted)' }}>{locked[s.key] ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
            <button className="minibtn" title="이 슬롯만 다시" onClick={() => rollOne(s.key)} disabled={!!locked[s.key]}><Emoji e="🎲" /></button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={rollAll}><Emoji e="🎲" /> 장면 생성</button>
        <button className="minibtn" onClick={copy}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
        <button className="minibtn" onClick={addFav}><Emoji e="⭐" /> 즐겨찾기</button>
      </div>

      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '현재 장면을 프로젝트 원고 「장면」에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={toSnippet}><Emoji e="📥" /> 스니펫 저장</button>
        <button className="linkbtn" onClick={toPlace}><Emoji e="🏞" /> 배경 저장</button>
        <button className="linkbtn" onClick={() => openToolLinked('anachronism-checker', { text: sceneText })}><Emoji e="🏺" /> 시대착오 점검</button>
        <button className="linkbtn" onClick={() => openToolLinked('scene-forge')}><Emoji e="🎬" /> 일반 장면 생성기</button>
        <button className="linkbtn" onClick={() => openToolLinked('character-forge')}><Emoji e="🪪" /> 인물 생성기</button>
      </div>
      {saved && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>✓ {saved}</div>}

      {favs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}><Emoji e="⭐" /> 즐겨찾기 ({favs.length})</div>
          {favs.map((f) => (
            <div key={f.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</span>
                <button className="minibtn" title="복사" onClick={() => copyFav(f.text)}><Emoji e="📋" /></button>
                <button className="minibtn danger" title="삭제" onClick={() => delFav(f.id)}><Emoji e="🗑" /></button>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{f.text}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...note, fontSize: 11, marginTop: 2 }}>전부 로컬 자작 데이터로 생성합니다(외부 API 미사용). 장면형별 사건·결정타 슬롯이 도시에의 서사 장치(어전 설전·반정·간택·미래지식·비극·암행·결전·궁중암투)에 대응합니다.</div>
    </div>
  )
}
