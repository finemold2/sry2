// 로맨스 갈등·딜레마 단조기 — 로맨스 장르 도시에에 근거한 "관계 갈등" 슬롯 조합 생성기.
//  두 사람(주인공/상대) · 끌림의 불씨 · 가까워지지 못하는 장벽 · 둘을 묶는 강제 장치(forced proximity)
//  · 밀당의 박자 · 사랑의 딜레마(둘 다 가질 수 없는 가치) · Black Moment(파국의 씨앗)
//  · 비틀기(반전) · 무대(로맨스 하위유형). 슬롯별 🔒 잠금 + 부분 재생성, 전체 조합수 표시(1조 이상).
//  로맨스 계약(HEA/HFN)에 맞춰 "사건이 아니라 관계를 시험하는" 갈등을 한 줄 문장으로 조립.
//  연계: addToProject(folder:'갈등') 문서 추가 · addToLibrary('snippets') 글감 저장 · 관련 도구 열기.
//  자급식: react · './linkbus' 외 import 없음. 전부 로컬. localStorage 'sry:tool:romance-conflictforge'.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'romance-conflictforge', name: '로맨스 갈등 단조기', icon: '💔', group: '생성기', genre: '로맨스', intro: '밀당·강제동거·신분차·오해·후회로 로맨스다운 관계 갈등과 사랑의 딜레마를 무작위 단조', w: 600, h: 700 }

// ── 로맨스 도시에 기반 슬롯 풀(장르 특화·구체) ──
// 1) 주인공(POV) — 로맨스 관습의 시점 인물 원형(여주/남주/책빙의 등)
const HERO = [
  '사랑을 한 번도 믿어본 적 없는 워커홀릭 변호사',
  '재벌가 비서로 위장 취업한 잠입 기자',
  '소설 속 비운의 악역 영애에 빙의한 회사원',
  '버림받은 황비로 회귀해 두 번째 삶을 사는 공녀',
  '첫사랑에게 차인 뒤 연애를 끊은 파티시에',
  '집안의 빚을 떠안고 계약 결혼에 내몰린 가장',
  '죽은 줄 알았던 약혼자가 돌아온 미망인 백작부인',
  '연적의 결혼식 사회를 맡게 된 짝사랑 9년차',
  '상사의 가짜 연인 노릇을 떠맡은 신입사원',
  '원작 결말을 아는 채 파멸 플래그를 피하려는 조연 영애',
  '이혼 도장만 남겨두고 별거 중인 톱스타의 아내',
  '한 침대만 남은 산장에 갇힌 라이벌 회사 팀장',
  '죽은 언니의 아이를 떠맡고 정략결혼한 막내딸',
  '상처를 들킬까 늘 웃는 가면을 쓴 호텔리어',
  '전 남자친구가 새 직장 상사로 부임한 디자이너',
  '하룻밤 실수가 평생의 인연이 된 평범한 회사원',
  '연애 금지 계약을 어긴 아이돌 멤버',
  '소꿉친구를 10년째 짝사랑하는 동네 의사',
  '결혼정보회사에 마지막 희망을 건 노처녀 교수',
  '신분을 숨기고 평민 마을에 숨어든 황태자',
  '돈 때문에 늙은 공작과 정략혼을 앞둔 몰락 귀족 영애',
  '전쟁에서 돌아오지 않을 줄 알았던 남편을 다시 맞은 후작부인',
  '죽기 전으로 회귀해 이번엔 그를 외면하기로 한 황녀',
  '연인의 장례식에서 그를 빼닮은 쌍둥이를 만난 화가',
]

// 2) 상대역(Love Interest) — 알파/상처입은/집착/후회/계약 상대 등 로맨스 남주·상대 원형
const LOVE_INTEREST = [
  '냉혹하다 소문난 재벌 3세 사장',
  '비밀을 품고 늘 거리를 두는 어둠의 공작',
  '한 번 정한 사람은 놓지 않는 집착성 황제',
  '과거 그녀를 버리고 뒤늦게 후회하는 전 약혼자',
  '겉으론 다정하지만 속을 알 수 없는 주치의',
  '원수 가문의 유일한 후계자',
  '회귀 전 자신을 죽음으로 몰았던 차가운 황태자',
  '연애엔 무심한 천재 외과의',
  '계약 연인을 자처한 까칠한 옆집 소설가',
  '첫사랑을 잊지 못하는 듯한 동창회의 그 사람',
  '말없이 그녀의 곁을 지켜온 호위 기사',
  '신분을 숨긴 채 평민 행세를 하는 제국의 대공',
  '이혼만은 못 한다며 매달리는 별거 중인 남편',
  '경쟁 회사에서 스카우트 제안을 들고 온 라이벌 CEO',
  '죽은 언니의 약혼자였던 차분한 검사',
  '소설 속에서 여주의 파멸을 설계한 흑막 황자',
  '술김에 청혼해 놓고 시치미를 떼는 무심한 친구',
  '전 여자친구를 닮은 그녀에게 자꾸 끌리는 사진작가',
  '연하라는 이유로 늘 무시당하던 비서',
  '복수를 위해 그녀에게 접근한 재벌가 사생아',
  '겉은 다정한 신사, 속은 광기 어린 후작',
  '죽음 직전 그녀를 살리고 사라진 정체불명의 기사',
  '학창시절 그녀를 괴롭히던 일진, 지금은 톱스타',
  '평생 한 번도 마음을 준 적 없다는 얼음장 같은 검술 교관',
]

// 3) 끌림의 불씨 — 왜 하필 이 사람인가(감정의 정당화). 첫 끌림의 계기
const SPARK = [
  '아무도 모르는 약점을 들켰는데 비밀로 지켜준 순간',
  '늘 차갑던 사람이 자신에게만 보인 서툰 다정함',
  '위험한 순간 가장 먼저 자신을 감싼 그의 등',
  '자신을 한 사람으로 똑바로 바라봐 준 첫 시선',
  '취한 밤 무심코 흘린 진심 어린 한마디',
  '버려진 강아지를 몰래 거두던 의외의 뒷모습',
  '모두가 등 돌렸을 때 홀로 자신을 믿어준 일',
  '닿을 듯 닿지 않던 손끝이 처음으로 포개진 순간',
  '서로의 상처가 거울처럼 닮아 있다는 자각',
  '말다툼 끝에 터져 나온, 숨겨온 걱정',
  '잠든 자신에게 조용히 담요를 덮어준 새벽',
  '비 오는 날 말없이 내밀어 준 우산 하나',
  '자신의 글/그림/요리를 진심으로 알아봐 준 첫 사람',
  '거짓 미소를 단번에 꿰뚫어 본 눈빛',
  '아픈 과거를 캐묻지 않고 그저 곁에 있어 준 침묵',
  '연적 앞에서 무심코 드러난 질투의 떨림',
  '죽기 전으로 돌아온 그가 이번엔 다르게 구는 낯섦',
  '예상과 달리 약자에게 한없이 부드러운 면모',
  '자신을 위해 자존심을 굽힌, 그답지 않은 행동',
  '오래전 받은 친절을 아직도 기억하고 있던 사실',
]

// 4) 가까워지지 못하는 장벽 — 관계를 가로막는 로맨스 특화 외적·내적 장벽
const BARRIER = [
  '하늘과 땅 차이의 신분(평민과 황족)',
  '서로의 집안이 원수지간이라는 사실',
  '한쪽이 곧 다른 사람과 정략결혼을 앞두고 있는 것',
  '상대가 자신의 가족을 망하게 한 장본인이라는 과거',
  '사랑하면 안 되는 사이라는 직업적 규율(상사·부하, 의사·환자)',
  '한쪽이 시한부 선고를 숨기고 있는 것',
  '계약 관계라는 명분이 진심을 자꾸 가로막는 것',
  '회귀/빙의로 알게 된 "이 사람이 나를 파멸시킨다"는 결말',
  '연인을 잃은 트라우마로 사랑을 거부하는 마음의 빗장',
  '상대에게 이미 약혼자/연인이 있다는 사실',
  '복수를 위해 접근했다는, 들키면 끝장날 비밀',
  '한쪽이 신분/정체/성별을 속이고 있다는 것',
  '오해로 쌓인 깊은 미움이 진심을 가리고 있는 것',
  '가족(아이·부모)을 지키려면 사랑을 포기해야 하는 처지',
  '과거의 배신이 남긴, 다시는 못 믿겠다는 상처',
  '세상의 시선과 추문이 두 사람을 떼어놓으려는 압력',
  '한쪽이 곧 멀리 떠나야(유학·전장·왕위) 하는 운명',
  '서로를 라이벌로 만든 자존심과 경쟁심',
  '"너는 나를 가질 자격이 없다"는 신분/계급의 자기검열',
  '첫사랑/죽은 사람의 그림자가 둘 사이에 드리운 것',
  '권력을 쥔 제3자가 두 사람의 관계를 금지한 것',
  '한쪽이 기억을 잃어 함께한 시간을 송두리째 잊은 것',
]

// 5) 둘을 묶는 강제 장치(Forced Proximity) — 감정 발생을 강제하는 로맨스 최강 장치
const PROXIMITY = [
  '한 침대만 남은 산장에 둘이 갇힌다(one bed!)',
  '폭설로 외딴 별장에 단둘이 고립된다',
  '세상을 속이기 위한 위장 부부 생활을 시작한다',
  '한집에서 동거하는 룸메이트가 된다',
  '같은 프로젝트의 파트너로 묶여 매일 붙어 일한다',
  '가짜 연인 노릇(fake dating)을 떠맡는다',
  '계약 결혼으로 한 지붕 아래 살게 된다',
  '상사와 부하로 출장에 단둘이 동행한다',
  '아이를 함께 키우는 임시 보호자가 된다',
  '신분을 숨긴 채 같은 마을에 숨어 지낸다',
  '서로의 약점을 쥔 채 어쩔 수 없이 협력한다',
  '같은 병실/같은 셰어하우스에 배정된다',
  '경쟁 관계인데도 한 팀으로 임무를 수행해야 한다',
  '회귀/빙의로 매일 마주칠 수밖에 없는 운명에 놓인다',
  '결혼식 준비를 위해 몇 주간 한집에 머문다',
  '난파/조난으로 둘만 살아남아 의지하게 된다',
  '서로를 감시·경호하는 임무로 24시간 밀착한다',
  '같은 작은 가게(카페·서점)를 공동 운영하게 된다',
]

// 6) 밀당의 박자(push-pull) — 도시에: 끌림과 회피의 진자가 멈추면 텐션이 죽는다
const PUSHPULL = [
  '한 발 다가가면 두 발 물러서는 끝없는 진자 운동',
  '낮엔 차갑게 밀어내고 밤엔 무심코 챙기는 이중성',
  '질투를 들킬까 일부러 더 매몰차게 구는 어긋남',
  '먼저 손 내민 쪽이 번번이 거절당하는 역할 교대',
  '고백 직전마다 방해받는 니어 키스의 반복',
  '서로 좋아하면서 "절대 아니다"라고 우기는 부정',
  '한쪽의 적극적 구애와 다른 쪽의 완강한 거리두기',
  '가까워질 만하면 과거의 상처가 끼어들어 후퇴',
  '농담과 진심 사이를 오가며 마음을 떠보는 줄다리기',
  '도망치는 쪽을 끝까지 쫓아가 붙잡는 추격의 박자',
  '연적의 등장으로 비로소 자각하는 뒤늦은 끌림',
  '서로의 진심을 알면서도 자존심에 먼저 말 못 하는 교착',
  '"이번이 마지막"이라며 매번 다시 끌려가는 모순',
  '닿을 듯 닿지 않게 거리를 재며 서로를 시험하는 탐색전',
]

// 7) 사랑의 딜레마 — 둘 다 가질 수 없는 가치 사이의 선택(상호성·희생의 도시에)
const DILEMMA = [
  '사랑을 택하면 가문이, 가문을 택하면 사랑이 무너진다',
  '그의 곁에 남으려면 자신의 꿈/커리어를 포기해야 한다',
  '진실을 고백하면 사랑을, 숨기면 양심을 잃는다',
  '복수를 완성하면 사랑하는 그 사람이 파멸한다',
  '회귀로 그를 살리면 자신이 다시 죽어야 한다',
  '그를 지키려면 그가 가장 미워하는 사람이 되어야 한다',
  '아이(가족)를 지키려면 사랑을 떠나보내야 한다',
  '왕위/권력을 포기해야만 그 사람과 함께할 수 있다',
  '그의 정략혼을 막으면 두 나라가 전쟁에 빠진다',
  '첫사랑의 추억을 버려야 새 사랑을 받아들일 수 있다',
  '그를 자유롭게 놓아주는 것이 가장 그를 사랑하는 길이다',
  '신분을 밝히면 사랑이, 숨기면 그와의 미래가 거짓이 된다',
  '그의 비밀을 폭로하면 정의가, 덮으면 사랑이 지켜진다',
  '죽어가는 자신을 곁에 두는 건 그에게 더 깊은 상처가 된다',
  '그를 믿으면 또 배신당할지 모르고, 안 믿으면 영영 잃는다',
  '세상의 인정을 얻으려면 사랑을 숨겨야 하고, 사랑하면 모든 걸 잃는다',
  '그의 행복을 위해 연적에게 그를 양보해야 할지 모른다',
  '진심을 말하면 관계가 깨지고, 침묵하면 평생 후회한다',
]

// 8) Black Moment(파국의 씨앗) — 클라이맥스 직전, 관계가 끝장난 듯한 최저점의 방아쇠
const BLACKMOMENT = [
  '숨겨온 비밀(복수·신분·계약)이 최악의 순간에 폭로된다',
  '오해가 폭발해 "다 끝났다"며 서로 등을 돌린다',
  '연적/약혼자의 등장으로 그가 떠나는 것처럼 보인다',
  '그를 지키려 한 거짓말이 배신으로 오해받는다',
  '가족/세상의 압력에 못 이겨 이별을 통보한다',
  '회귀 전 결말이 또 반복되려는 듯한 절망의 순간',
  '한쪽이 상대를 위해 일부러 차갑게 밀어내고 사라진다',
  '죽음/시한부/사고로 영영 헤어질 위기에 몰린다',
  '진심 어린 고백이 최악의 타이밍에 거절당한다',
  '신뢰를 깨뜨린 결정적 장면을 우연히 목격당한다',
  '"널 사랑한 적 없다"는 마음에도 없는 말로 관계를 끊는다',
  '과거의 상처가 되살아나 스스로 사랑할 자격이 없다 믿는다',
  '권력자가 두 사람을 떼어놓으려 결정적 수를 쓴다',
  '기억을 잃거나 멀리 떠나보내져 함께한 모든 것이 지워진다',
]

// 9) 비틀기(반전 씨앗) — 로맨스 클리셰 전복(도시에: 변주 포인트)
const TWIST = [
  '냉혹한 그가 사실 오래전부터 그녀를 짝사랑해 왔다',
  '복수의 대상이 알고 보니 자신을 구해준 은인이었다',
  '그를 파멸시킨다던 원작 결말은 누군가 조작한 거짓이었다',
  '계약 연인이 사실 첫사랑이 자라난 그 사람이었다',
  '차갑게 밀어내던 그 행동이 그녀를 지키기 위한 희생이었다',
  '죽은 줄 알았던 연인이 신분을 바꾼 채 곁에 있었다',
  '연적이라 여긴 사람이 실은 두 사람을 이어준 조력자였다',
  '회귀한 사람은 그녀가 아니라 그였다는 사실',
  '그가 잊은 줄 알았던 첫 만남을 평생 기억하고 있었다',
  '정략혼 상대가 바로 그토록 찾던 운명의 그 사람이었다',
  '"사랑하지 않는다"던 말이 그의 가장 큰 거짓말이었다',
  '두 사람의 만남 자체가 누군가 오래전부터 설계한 인연이었다',
  '집착으로 보였던 모든 행동에 가슴 아픈 사연이 있었다',
  '그녀가 미워한 과거의 그는 사실 다른 사람의 죄를 뒤집어쓴 것이었다',
  '평민으로 위장한 그가 알고 보니 가장 높은 자리의 사람이었다',
  '그를 떠나보낸 선택이 결국 두 사람을 더 단단히 이어주었다',
]

// 10) 무대(하위유형) — 갈등이 펼쳐지는 로맨스 무대(현대/로판/시대극 등)
const STAGE = [
  '재벌가의 차가운 펜트하우스와 사옥(현대 재벌물)',
  '음모가 들끓는 황실과 사교계의 무도회장(로맨스판타지)',
  '계약과 야근이 교차하는 도심의 사무실(사내연애)',
  '원작 소설 속 파멸이 예정된 귀족 영애의 저택(책빙의)',
  '회귀 전 비극이 벌어졌던 그 운명의 황궁(회귀물)',
  '폭설에 갇힌 외딴 산장과 별장(강제 동거)',
  '한 지붕 아래 시작된 위장 부부의 신혼집(계약 결혼)',
  '첫사랑의 기억이 잠든 작은 동네와 골목(힐링 로맨스)',
  '신분을 숨긴 황태자가 머무는 평민 마을(신분 위장)',
  '톱스타와 일반인이 숨어 만나는 비밀의 도시(셀럽 로맨스)',
  '전쟁과 이별이 교차하는 시대의 격변기(시대극 로맨스)',
  '아이를 함께 키우게 된 따뜻한 가정집(육아 로맨스)',
  '라이벌 회사가 맞붙는 비즈니스 전쟁터(오피스 로맨스)',
  '동창회와 옛 추억이 되살아나는 모교(재회 로맨스)',
  '죽음과 회귀가 반복되는 저주받은 가문의 성(다크 로맨스)',
  '결혼식 준비로 북적이는 화려한 호텔과 웨딩홀',
]

interface Slot { key: string; label: string; icon: string; pool: string[] }
const SLOTS: Slot[] = [
  { key: 'hero', label: '주인공(POV)', icon: '💗', pool: HERO },
  { key: 'lover', label: '상대역', icon: '🖤', pool: LOVE_INTEREST },
  { key: 'spark', label: '끌림의 불씨', icon: '✨', pool: SPARK },
  { key: 'barrier', label: '가로막는 장벽', icon: '🧱', pool: BARRIER },
  { key: 'proximity', label: '강제 동거 장치', icon: '🏠', pool: PROXIMITY },
  { key: 'pushpull', label: '밀당의 박자', icon: '↔️', pool: PUSHPULL },
  { key: 'dilemma', label: '사랑의 딜레마', icon: '⚖️', pool: DILEMMA },
  { key: 'black', label: '파국의 순간', icon: '💔', pool: BLACKMOMENT },
  { key: 'twist', label: '비틀기(반전)', icon: '🔮', pool: TWIST },
  { key: 'stage', label: '무대', icon: '🗺️', pool: STAGE },
]

// 조합수 = 각 슬롯 풀 크기의 곱(핵심 생성기 — 1조 이상 지향)
const COMBOS = SLOTS.reduce((acc, s) => acc * s.pool.length, 1)

const LS_KEY = 'sry:tool:romance-conflictforge'
const ri = (n: number) => Math.floor(Math.random() * n)
const pick = (a: string[], avoid?: string) => {
  if (a.length <= 1) return a[0]
  let v = a[ri(a.length)]
  if (avoid !== undefined && v === avoid) v = a[ri(a.length)]
  return v
}

type Result = Record<string, string>

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 한 줄 관계 갈등 문장 조립 — 슬롯들을 로맨스다운 갈등 구문으로(관계가 중심, 사건은 종속).
function summarize(r: Result): string {
  const hero = (r.hero || '주인공').replace(/[.。]$/, '')
  const lover = (r.lover || '상대').replace(/[.。]$/, '')
  const spark = (r.spark || '').replace(/[.。]$/, '')
  const barrier = (r.barrier || '').replace(/[.。]$/, '')
  const proximity = (r.proximity || '').replace(/[.。]$/, '')
  const pushpull = (r.pushpull || '').replace(/[.。]$/, '')
  const dilemma = (r.dilemma || '').replace(/[.。]$/, '')
  const black = (r.black || '').replace(/[.。]$/, '')
  const stage = (r.stage || '').replace(/[.。]$/, '')
  let s = `${stage ? stage + '. ' : ''}${hero}는 ${lover}에게 끌린다`
  if (spark) s += ` — ${spark}이(가) 마음을 흔든 탓이다`
  s += '.'
  if (proximity) s += ` 하지만 ${proximity}, 두 사람은 매일 부딪칠 수밖에 없다.`
  if (barrier) s += ` 둘 사이엔 ${barrier}(이)라는 장벽이 가로놓여 있다.`
  if (pushpull) s += ` 그래서 ${pushpull}이 이어진다.`
  if (dilemma) s += ` 끝내 그는 선택을 강요받는다 — ${dilemma}.`
  if (black) s += ` 그리고 ${black}, 관계는 끝장난 듯 보인다.`
  return s
}

// 저장된 즐겨찾기(고정 조합) 항목
interface Saved { id: string; result: Result; createdAt: number }

function loadSaved(): Saved[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.saved) ? p.saved : Array.isArray(p) ? p : []
    return arr
      .filter((x: any) => x && typeof x === 'object' && x.result && typeof x.result === 'object')
      .map((x: any) => ({ id: String(x.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7))), result: x.result as Result, createdAt: Number(x.createdAt) || Date.now() }))
  } catch { return [] }
}

export default function RomanceConflictForge({ payload }: { payload?: Record<string, unknown> }) {
  const genreLabel = typeof payload?.genre === 'string' ? (payload.genre as string) : '로맨스'

  const [result, setResult] = useState<Result>(() => {
    const r: Result = {}
    SLOTS.forEach((s) => { r[s.key] = pick(s.pool) })
    return r
  })
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)
  const [toast, setToast] = useState('')
  const [saved, setSaved] = useState<Saved[]>(() => loadSaved())
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 저장 목록 영속화 — 차단/용량초과 graceful
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ saved })) }
    catch { if (mounted.current) setToast('이 브라우저에서 저장이 막혀 있어요.') }
  }, [saved])

  // 토스트 자동 소거 + 언마운트 정리
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1900)
    return () => window.clearTimeout(t)
  }, [toast])

  // 굴림 애니메이션 자동 해제 + 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 360)
    return () => window.clearTimeout(t)
  }, [rolling])

  const rollAll = useCallback(() => {
    setRolling(true)
    setResult((prev) => {
      const next: Result = { ...prev }
      SLOTS.forEach((s) => { if (!locked[s.key]) next[s.key] = pick(s.pool, prev[s.key]) })
      return next
    })
  }, [locked])

  const rollOne = (key: string) => {
    const slot = SLOTS.find((s) => s.key === key)
    if (!slot) return
    setResult((prev) => ({ ...prev, [key]: pick(slot.pool, prev[key]) }))
  }
  const toggleLock = (key: string) => setLocked((l) => ({ ...l, [key]: !l[key] }))

  const summary = summarize(result)

  const plainText = () => {
    const lines = SLOTS.map((s) => `${s.icon} ${s.label}: ${result[s.key]}`).join('\n')
    return `[로맨스 갈등]\n${lines}\n\n✍️ ${summary}`
  }

  const copy = () => {
    const text = plainText()
    const done = () => { if (mounted.current) setToast('복사했습니다') }
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
    } catch { if (mounted.current) setToast('복사 실패') }
  }

  // 즐겨찾기 저장(현재 조합 고정)
  const star = () => {
    setSaved((prev) => [{ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), result: { ...result }, createdAt: Date.now() }, ...prev].slice(0, 40))
    setToast('즐겨찾기에 저장했습니다')
  }
  const loadSavedItem = (s: Saved) => { setResult({ ...s.result }); setLocked({}); setToast('불러왔습니다') }
  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))

  // 연계: 갈등 글감을 라이브러리 스니펫으로
  const toSnippet = () => {
    addToLibrary('snippets', { text: summary, source: '로맨스 갈등 단조기', tags: ['로맨스', '갈등', result.hero || ''].filter(Boolean) })
    setToast('글감 라이브러리(스니펫)에 저장했습니다')
  }

  // 연계: 프로젝트 자료 〈갈등〉 폴더에 문서로
  const toProject = () => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다'); return }
    const rows = SLOTS.map((s) => `<p><b>${escHtml(s.icon)} ${escHtml(s.label)}</b><br>${escHtml(result[s.key])}</p>`).join('')
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.7;"><b>✍️ ${escHtml(summary)}</b></p>`,
      `<hr/>`,
      rows,
    ].join('')
    const title = `로맨스 갈등 — ${(result.hero || '주인공').slice(0, 16)} ✕ ${(result.lover || '상대').slice(0, 16)}`
    const id = addToProject({
      kind: 'text', root: 'research', folder: '갈등',
      title, bodyHtml, synopsis: summary,
      meta: { 장르: genreLabel, 무대: result.stage || '—', 장벽: (result.barrier || '—').slice(0, 40), 딜레마: (result.dilemma || '—').slice(0, 40) },
    })
    setToast(id ? '프로젝트 자료 〈갈등〉 폴더에 추가했습니다 (바인더·DB 확인)' : '프로젝트에 추가하지 못했습니다')
  }

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 8, padding: 12, boxSizing: 'border-box', color: 'var(--text)', background: 'var(--paper)', overflow: 'auto' }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
  const slotRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="💔"/></span>
        <strong style={{ fontSize: 14 }}>로맨스 갈등 단조기</strong>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }} title="모든 슬롯 풀 조합의 경우의 수">
          약 {COMBOS.toLocaleString()} 조합
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
        밀당·강제 동거·신분차·오해·후회 등 로맨스 도시에에 근거한 <b>관계 갈등</b> 슬롯을 굴립니다. 사건이 아니라 <b>두 사람의 관계</b>를 시험하는 갈등에 초점을 맞췄어요. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 단조하세요.
      </div>

      {/* 슬롯 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {SLOTS.map((s) => {
          const isLocked = !!locked[s.key]
          return (
            <div key={s.key} style={slotRow}>
              <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-10deg) scale(1.15)' : 'none' }}><Emoji e={s.icon}/></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{s.label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
                  {rolling && !isLocked ? '…' : result[s.key]}
                </div>
              </div>
              <button className="minibtn" title={isLocked ? '고정 해제' : '이 슬롯 고정'} onClick={() => toggleLock(s.key)} style={{ flexShrink: 0, padding: '2px 6px', borderColor: isLocked ? 'var(--accent)' : 'var(--border)', color: isLocked ? 'var(--accent)' : 'var(--muted)' }}>{isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
              <button className="minibtn" title="이 슬롯만 다시" onClick={() => rollOne(s.key)} disabled={isLocked} style={{ flexShrink: 0, padding: '2px 6px' }}><Emoji e="🎲"/></button>
            </div>
          )
        })}
      </div>

      {/* 조합 한 줄 요약 */}
      <div style={{ background: 'var(--chrome-2)', border: '1px solid var(--accent)', borderRadius: 10, padding: '11px 13px' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}><Emoji e="📝"/> 관계 갈등 한 줄 요약</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.65 }}>{summary}</div>
      </div>

      {/* 조작 버튼 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, minWidth: 130 }} onClick={rollAll}><Emoji e="💞"/> 갈등 단조하기</button>
        <button className="minibtn" onClick={copy}><Emoji e="📋"/> 복사</button>
        <button className="minibtn" onClick={star} title="현재 조합을 즐겨찾기에 저장"><Emoji e="⭐"/> 저장</button>
      </div>

      {/* 연계 */}
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '이 갈등을 프로젝트 자료 〈갈등〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={toSnippet}><Emoji e="📥"/> 글감 라이브러리</button>
        <button className="linkbtn" onClick={() => openToolLinked('conflict-builder', { character: result.hero, desire: `${result.lover}와(과) 맺어지는 것`, obstacle: result.barrier, stakes: result.black })} title="갈등 설계기로 보내 더 다듬기"><Emoji e="⚔️"/> 갈등 설계기</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck')} title="반전 카드 더 보기"><Emoji e="🔮"/> 반전 카드</button>
        <button className="linkbtn" onClick={() => openToolLinked('emotion-arc')} title="감정 곡선으로 관계 진척 설계"><Emoji e="📈"/> 감정 곡선</button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--ok)', textAlign: 'center' }}>{toast}</div>}

      {/* 즐겨찾기 목록 */}
      {saved.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5, fontWeight: 600 }}><Emoji e="⭐"/> 저장된 갈등 {saved.length}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {saved.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 9px' }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={summarize(s.result)}>{summarize(s.result)}</span>
                <button className="minibtn" style={{ flexShrink: 0, padding: '2px 6px', fontSize: 11 }} onClick={() => loadSavedItem(s)} title="불러오기">↻</button>
                <button className="minibtn" style={{ flexShrink: 0, padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={() => removeSaved(s.id)} title="삭제"><Emoji e="🗑️"/></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
