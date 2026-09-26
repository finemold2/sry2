// 로맨스 개요(아웃라인) 빌더 — 로맨스 장르 표준 매크로 구조(장편 감정곡선 11비트 ·
// 웹소설 회차형 · 로판 회귀/빙의형)에 맞춰 장/막 개요 템플릿을 채운다. 각 단계마다 로맨스 특화
// 슬롯 풀(주인공·관계 트로프·강제 밀착 장치·갈등·블랙모먼트·그랜드 제스처 등)을 무작위로 굴려
// (🔒 잠금/부분 재생성, 조합수 표시) 한 줄 로그라인을 자동 생성·삽입할 수 있고, 항목 추가/삭제/
// 순서 이동/인라인 편집을 지원한다. HEA/HFN 결말 약속·감정 곡선 우선 원칙을 단계 힌트에 반영.
// 데이터는 localStorage 'sry:tool:romance-outline' 에 자동 저장/복원. 언마운트 정리.
// 연계(linkbus): 완성 개요를 프로젝트 원고 '개요' 폴더 문서로 추가(addToProject),
//   생성한 로그라인 글감을 라이브러리 스니펫에 저장(addToLibrary), 관련 로맨스 도구 열기(openToolLinked).
// react 와 './linkbus' 외 import 금지.
import { useState, useEffect, useRef, useMemo } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'romance-outline', name: '로맨스 개요 빌더', icon: '💞', group: '구조', genre: '로맨스', intro: '로맨스 표준 구조(감정곡선 11비트·웹소설 회차형·로판 회귀/빙의형)로 장·막 개요를 짜고 로그라인을 굴려 채우세요', w: 740, h: 670 }

// ── 유틸 ────────────────────────────────────────────────────────────
const LS_KEY = 'sry:tool:romance-outline'
function ri(n: number) { return Math.floor(Math.random() * n) }
function pick<T>(a: T[]): T { return a[ri(a.length)] }
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
// 받침 유무 판정(한글 음절의 종성 존재 여부). 마지막 글자 기준.
function hasBatchim(s: string): boolean {
  const t = (s || '').trim()
  if (!t) return false
  const ch = t[t.length - 1]
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false // 한글 음절이 아니면 받침 없음으로 처리
  return (code - 0xac00) % 28 !== 0
}
// 조사 자동 선택 헬퍼 — 앞 글자 받침을 보고 실제 하나만 골라 붙인다("을(를)" 같은 노출 금지).
function withJosa(word: string, withB: string, noB: string): string {
  return word + (hasBatchim(word) ? withB : noB)
}
const gwa = (w: string) => withJosa(w, '과', '와')     // 과/와
const eg  = (w: string) => withJosa(w, '이', '가')     // 이/가
const eun = (w: string) => withJosa(w, '은', '는')     // 은/는
const eul = (w: string) => withJosa(w, '을', '를')     // 을/를
const ro  = (w: string) => {                            // 으로/로 (받침 ㄹ 예외 포함)
  const t = (w || '').trim()
  const ch = t[t.length - 1]
  const code = ch ? ch.charCodeAt(0) : 0
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28
    if (jong === 0 || jong === 8) return w + '로' // 받침 없음 또는 ㄹ받침 → '로'
    return w + '으로'
  }
  return w + '로'
}
// 큰 조합수를 한국어 단위(억/조/경)로.
function fmtBig(n: number): string {
  if (!isFinite(n)) return '무한'
  const u = [['경', 1e16], ['조', 1e12], ['억', 1e8], ['만', 1e4]] as const
  for (const [name, val] of u) {
    if (n >= val) { const q = n / val; return (q >= 100 ? Math.round(q).toLocaleString() : q.toFixed(q >= 10 ? 0 : 1)) + name + ' 가지' }
  }
  return Math.round(n).toLocaleString() + ' 가지'
}

// ── 로그라인 생성용 로맨스 특화 슬롯 풀(장르 도시에 근거) ───────────────────
// 10슬롯 조합 → 곱셈으로 조합수 약 2.77조(핵심 생성기, 1조 이상). 전부 로맨스 특화·구체적.
const POOL = {
  // 여주(또는 주인공A) 출발점 — 결핍·방어기제
  heroine: [
    '사랑 따윈 믿지 않는 워커홀릭 편집장', '파혼당하고 회사까지 잃은 디자이너', '연애 세포가 멸종한 까칠한 변호사',
    '재벌가에 들어간 가난한 계약직 비서', '첫사랑에게 차이고 시골로 내려온 파티시에', '연애 리얼리티 작가지만 모태솔로인 PD',
    '몰락한 자작가의 영애로 정략혼만 기다리는 신세', '원작 소설 속 죽을 운명의 악역 영애로 빙의한 회사원',
    '버림받은 황비였다가 처형 직전으로 회귀한 여인', '독약에 내성을 가진 채 후궁에 팔려온 소녀',
    '북부 변경백에게 팔려가듯 시집온 마탑의 마법사', '소설 속 단역 시녀로 빙의해 살아남으려는 대학생',
    '용병단을 이끄는 무뚝뚝한 여기사', '저주받은 가문의 마지막 영애',
    '연애엔 무관심한 채 마감에 쫓기는 웹툰 작가', '이혼 전문 변호사면서 정작 자기 사랑은 못 믿는 여자',
    '집안 빚 때문에 재벌가 가짜 며느리가 된 간호사', '남주에게 처형당했던 기억을 안고 다시 황녀로 깨어난 여인',
    '신전에 바쳐진 제물 신분의 신녀', '약혼자에게 누명을 쓰고 수녀원에 유폐됐던 백작 영애',
    '돈만 보고 정략혼에 응한 몰락 귀족의 셋째 딸', '아카데미 수석을 노리는 평민 출신 마법 영재',
    '죽은 언니 대신 그의 약혼녀가 된 동생',
  ],
  // 남주(또는 주인공B) — 끌림의 대상, 상처/지위
  hero: [
    '냉혈한 재벌 3세 본부장', '비밀을 품은 연하의 톱스타', '겉은 다정하지만 속은 집착하는 황태자',
    '여주를 죽였다가 회귀해 후회하는 대공', '얼음 같은 북부의 변경백', '저주에 걸려 밤마다 짐승이 되는 공작',
    '여주의 첫사랑이었던 라이벌 회사 대표', '무심한 척하지만 다 챙겨주는 동료 형사', '소꿉친구였다가 떠났던 군인',
    '냉정한 황제이자 그녀의 정략혼 상대', '마탑주이자 인간을 경멸하는 대마법사', '검을 든 호위기사이자 신분을 숨긴 왕자',
    '연적이 셋이나 되는 인기 절정의 아이돌', '계약 결혼을 제안한 의문의 사업가',
    '완벽주의로 악명 높은 셰프', '냉소적이지만 환자에겐 다정한 외과의', '과거를 숨긴 채 그녀의 경호를 맡은 보디가드',
    '폭군이라 불리지만 그녀에게만 약한 황제', '인간 여인을 사랑하게 된 용족(드래곤)', '죽은 줄 알았던 그녀의 전남편',
    '집착에 가까운 독점욕을 숨긴 공작', '겉은 망나니, 속은 다친 어린아이 같은 후작', '신성력을 잃어가는 비운의 성기사',
    '평민이라 무시당하던 천재 검사(劍士)', '그녀의 복수 대상이자 첫사랑인 가문의 적자',
  ],
  // 첫 만남 정황(Meet-Cute) — 강렬한 첫인상
  meet: [
    '비 오는 날 한 우산을 나눠 쓰며 처음 마주친', '사고로 음료를 쏟아 옷을 망치며 시비가 붙은',
    '면접관과 지원자로 최악의 첫인상을 남긴', '무도회에서 가면을 쓴 채 한 번 춤춘', '술집에서 모르는 사이로 위장 고백을 부탁한',
    '교통사고 직전 그가 끌어당겨 구해 준', '엘리베이터 고장으로 갇혀 처음 말을 튼', '오해로 도둑으로 몰려 멱살을 잡힌',
    '소개팅 자리에서 서로 "절대 아니다" 싶었던', '암살 위기의 그를 우연히 구해 준', '시장통에서 소매치기로 오해해 붙잡은',
    '연회에서 와인잔을 부딪치며 눈이 마주친', '폐허에서 길을 잃고 같은 은신처로 숨어든', '계약서를 던지듯 내밀며 처음 만난',
  ],
  // 관계 시작 트로프(핵심 동력) — 전부 '관계 유형' 명사구로 통일(끝이 명사).
  // buildLogline 이 '두 사람은 ○○(으)로 얽힌 사이.'로 연결하므로 명사형이어야 비문이 안 난다.
  // 영어 괄호·양자택일 슬래시·문장 종결/연결 어미 금지.
  trope: [
    '서로를 죽일 듯 미워하던 앙숙', '겉으로만 사귀는 가짜 연인',
    '이해관계로 맺은 계약 결혼', '한 침대만 남은 여관에 갇힌 사이', '연인이 되어 버린 소꿉친구',
    '신분을 숨긴 채 만난 사이', '원수의 자식과 빠진 금지된 사랑', '상사와 부하라는 사내연애 금기',
    '이혼 직전 다시 불붙은 부부', '서로의 비밀을 쥔 협박 관계', '운명처럼 엮인 정략혼 상대',
    '한쪽만 결말을 아는 정보 비대칭', '죽고 못 살다 재회한 옛 연인',
    '한쪽만 애태우는 외사랑', '신분을 뛰어넘는 신데렐라식 사랑',
    '버렸다가 뒤늦게 매달리는 후회남주', '소울메이트 표식으로 묶인 운명',
    '원수 가문끼리 맺어진 정략혼', '나이 차를 둔 연상연하',
    '연적의 약혼자를 사이에 둔 삼각관계', '죽음을 앞둔 시한부 사랑',
  ],
  // 강제 밀착 장치(forced proximity 등)
  proximity: [
    '같은 집에 동거하게 되면서', '폭설로 산장에 단둘이 고립되면서', '위장 부부 행세를 하게 되면서',
    '한 회사 같은 프로젝트에 묶이면서', '한 저택에서 매일 마주치면서', '서로의 가짜 연인을 연기하면서',
    '같은 비밀 임무를 떠맡으면서', '병상에서 24시간 간병하게 되면서', '계약서에 명시된 신혼여행을 떠나면서',
    '같은 스승 밑에서 검술을 수련하면서', '운명의 끈(소울메이트 표식)으로 강제로 이어지면서',
    '서로의 약혼 파기를 돕기로 거래하면서', '한 마차에 갇혀 며칠을 이동하면서',
    '아카데미 같은 기숙 방을 배정받으면서', '엘리베이터에 함께 갇히면서', '한 아이를 같이 키우게 되면서',
    '신분을 감추고 그의 시녀로 들어가면서', '전쟁터에서 같은 막사를 쓰게 되면서',
    '계약 연애의 가짜 데이트를 반복하면서', '서로의 집에 번갈아 머무는 룸메이트가 되면서',
  ],
  // 갈등·장벽(둘을 가로막는 외부/내부)
  obstacle: [
    '집안의 정략혼 압박과', '신분 격차라는 벽과', '서로를 오해하게 만든 거짓 소문과',
    '여주를 노리는 정적(政敵)의 음모와', '남주의 약혼녀라는 연적의 견제와', '과거의 트라우마가 만든 마음의 빗장과',
    '원작 결말대로 닥쳐올 비극의 예고와', '둘 사이를 갈라놓으려는 가문의 반대와',
    '잊고 있던 첫사랑의 재등장과', '직장에서 들통나면 끝장인 사내연애 금기와', '저주가 풀리지 않으면 죽는다는 시한과',
    '서로가 서로의 복수 대상이라는 비밀과',
    '종족·인간이라는 넘을 수 없는 차이와', '황실 후계 다툼이라는 정치적 풍랑과',
    '여주를 향한 누명과 사교계의 따돌림과', '남주가 숨긴 시한부라는 진실과',
    '두 가문의 오래된 원한과', '가짜 연인이 들통날까 봐 조마조마한 거짓말과',
    '죽은 약혼녀를 닮은 그녀라는 그림자와', '돈에 팔려 왔다는 출신의 콤플렉스와',
  ],
  // 미드포인트/심화(관계가 한 단계 깊어지는 전환)
  midpoint: [
    '한순간의 입맞춤으로 선을 넘어버린 뒤', '서로의 진심을 처음으로 확인한 뒤', '질투를 못 이겨 본심을 들켜버린 뒤',
    '목숨을 걸고 서로를 구한 뒤', '숨겨온 비밀이 절반쯤 드러난 뒤', '하룻밤을 함께 보낸 다음 날',
    '가짜였던 관계가 진짜가 되어버린 순간', '회귀의 비밀을 한쪽이 눈치챈 뒤',
    '연적 앞에서 처음으로 사랑을 인정한 뒤', '결코 닿을 수 없다 여겼던 마음이 맞닿은 뒤',
    '니어 키스를 방해받고 더 애가 탄 뒤', '서로의 상처를 처음으로 보듬어 준 밤이 지나고',
    '한쪽이 먼저 "좋아한다"고 고백해 버린 뒤', '소울메이트 표식이 동시에 빛나며 운명을 확인한 뒤',
    '위기에서 무심코 이름을 부르며 달려온 그를 본 뒤', '돌아가야 할 이유와 머물고 싶은 마음이 충돌한 순간',
  ],
  // 블랙모먼트(절망의 최저점)
  black: [
    '치명적인 오해로 모든 것이 끝장난 듯 보이지만', '숨겨온 비밀이 최악의 순간에 폭로되어 등을 돌리지만',
    '집안의 강요로 다른 사람과의 혼약이 발표되지만', '서로를 위한 거짓말이 배신으로 오해받지만',
    '한쪽이 상대를 지키려 일부러 밀어내지만', '원작대로 비극이 닥쳐 둘이 갈라서지만',
    '죽음의 위기 앞에서 마음을 끝내 숨기지만', '과거의 죄가 드러나 모든 신뢰가 무너지지만',
    '오해를 풀 기회를 놓친 채 멀어지지만', '권력·복수와 사랑 사이에서 사랑을 포기하려 하지만',
    '연적의 모함으로 사교계에서 매장당하지만', '회귀의 진실이 들통나 괴물 취급을 받지만',
    '한쪽이 기억을 잃어 둘의 시간이 통째로 지워지지만', '가짜 연인 계약이 끝나 헤어질 명분만 남지만',
    '둘을 살리려 한쪽이 홀로 떠나기로 결심하지만', '거짓 죽음을 꾸며 영영 이별한 듯 보이지만',
  ],
  // 그랜드 제스처·결말(HEA/HFN 약속)
  grand: [
    '만인 앞에서 모든 것을 내려놓고 고백하며 끝내 맺어진다', '지위와 재산을 포기하고 그녀에게 달려가 결합한다',
    '무릎 꿇고 진심으로 속죄하며 마침내 마음을 되돌린다', '정략혼과 왕위를 거부하고 그녀를 선택해 함께한다',
    '바뀐 운명을 함께 써 내려가며 비극을 뒤집고 행복해진다', '서로의 비밀을 끌어안고 새로운 미래를 약속한다',
    '공항으로 달려가 떠나려는 그 사람을 붙잡고 사랑을 이룬다', '저주를 함께 깨뜨리고 진정한 부부가 된다',
    '연적과 음모를 모두 물리치고 둘만의 행복(후일담)을 맞는다', '모든 오해를 풀고 재고백 끝에 평생을 맹세한다',
    '황제의 자리에서 그녀를 황후로 세우며 천하에 사랑을 선포한다', '권력으로 그녀를 노린 모든 적을 쳐내고 곁을 지킨다',
    '신성력을 모두 쏟아 그녀를 살리고 인간이 되어 함께 산다', '잃었던 기억을 되찾고 처음 마음으로 다시 청혼한다',
    '계약서를 찢고 "진짜로 결혼하자"며 손을 내민다', '목숨을 던져 그녀를 구하고 기적처럼 함께 살아남는다',
  ],
  // 무대·배경(독립 슬롯 — 다른 슬롯을 전제하지 않는 공간/세계의 톤). 현대~로판~시대극~패러노멀 폭넓게 호환.
  backdrop: [
    '야근 불빛이 꺼지지 않는 도심의 마천루 사무실', '계절이 바뀌는 한적한 바닷가 소도시', '화려함 뒤에 음모가 흐르는 가상 제국의 황궁',
    '눈에 갇힌 북부 변경의 외딴 성', '무도회의 샹들리에가 빛나는 사교계의 저택', '마법과 검술을 가르치는 명문 아카데미',
    '오래된 비밀을 품은 깊은 숲속의 신전', '재벌가의 위세가 짓누르는 고풍스러운 대저택', '낡은 골목과 단골 카페가 정겨운 동네',
    '안개가 자욱한 항구의 부둣가', '시간이 멈춘 듯한 산속 고립된 산장', '계약과 거래가 오가는 차가운 법률 사무소',
    '향신료 냄새가 가득한 번화한 왕도의 시장통', '달빛 아래 비밀이 깨어나는 고성(古城)', '눈보라가 몰아치는 변경의 전장(戰場)',
    '꽃이 만발한 황실 정원의 미로', '파도 소리만 들리는 외딴 등대지기의 섬',
  ],
  // 정서적 여운·후일담 한 줄(HEA 뒤 보너스 설렘 — 웹소설 외전 관습)
  epilogue: [
    '그리고 남주 시점 외전에서 그의 첫눈에 반한 순간이 밝혀진다', '몇 년 뒤, 둘을 닮은 아이가 같은 사랑을 시작한다',
    '소박한 신혼의 일상이 가장 큰 행복임을 보여 주며 막을 내린다', '여전히 티격태격하지만 누구보다 애틋한 노년을 약속한다',
    '바뀐 운명 위에 둘만의 새 이야기가 펼쳐지며 끝난다', '온 세상이 인정하는 부부가 되어 첫 만남의 자리를 다시 찾는다',
    '서로의 상처가 완전히 아문 자리에 평온한 사랑이 남는다', '못다 한 고백을 매일 새로 건네며 행복을 이어 간다',
    '연적·정적조차 축복하는 결혼식으로 후일담을 닫는다', '"다시 태어나도 너"라는 맹세로 여운을 남긴다',
  ],
}
type PoolKey = keyof typeof POOL
const SLOT_ORDER: PoolKey[] = ['backdrop', 'heroine', 'hero', 'meet', 'trope', 'proximity', 'obstacle', 'midpoint', 'black', 'grand', 'epilogue']
const SLOT_LABEL: Record<PoolKey, string> = {
  backdrop: '무대·배경', heroine: '주인공A(여주)', hero: '주인공B(남주)', meet: '첫 만남', trope: '시작 트로프', proximity: '밀착 장치',
  obstacle: '갈등·장벽', midpoint: '심화 전환', black: '블랙모먼트', grand: '그랜드 제스처·결말', epilogue: '후일담 여운',
}
const COMBO = SLOT_ORDER.reduce((acc, k) => acc * POOL[k].length, 1)

function buildLogline(slots: Record<PoolKey, string>): string {
  // trope 는 '관계 유형' 명사구 → '○○(으)로 얽힌 사이'로 연결(받침 따라 으로/로 자동).
  // proximity 는 '-면서' 연결어미 → 뒤의 '밀고 당긴다'가 종결을 책임진다.
  return `${eul(slots.backdrop)} 무대로, ${gwa(slots.heroine)} ${slots.hero}. ${slots.meet} 두 사람은 ${ro(slots.trope)} 얽힌 사이. ${slots.proximity}, ${slots.obstacle} 밀고 당긴다. ${slots.midpoint}, ${slots.black}, 끝내 ${slots.grand}. ${slots.epilogue}.`
}

// ── 단계 템플릿(매크로 구조) ─────────────────────────────────────────
interface StageDef { title: string; hint: string }
type Mode = 'emo' | 'web' | 'ropan'

// 장편 감정곡선 11비트(도시에 §4 표준 로맨스 비트 시트)
const EMO: StageDef[] = [
  { title: '1. 도입 — 결핍과 방어기제', hint: '주인공의 상처·세계관·"사랑은 됐다"는 방어기제를 보여 감정 곡선의 출발점을 깐다. 왜 이 사람이 사랑을 막아두는지 설득.' },
  { title: '2. 첫 만남(Meet-Cute)', hint: '운명적·우스꽝스럽·적대적 첫 조우. 좋든 나쁘든 강렬한 첫인상으로 케미의 불씨를 심는다. 트로프를 여기서 노출.' },
  { title: '3. 발단 — 계속 엮이는 사건', hint: '계약·동거·같은 임무 등 둘을 떼어놓을 수 없게 묶는 발화 사건(강제 밀착). "절대 안 될 사이"라는 명분 확립.' },
  { title: '4. 거부와 밀당', hint: '끌림과 회피의 진자 운동 시작. 한 발 다가가면 두 발 물러서기. 우연한 접촉·니어 키스로 텐션을 쌓되 보상은 미룬다.' },
  { title: '5. 점화 — Fun & Games', hint: '함께하는 시간 누적, 케미 폭발, 접촉 고조, 첫 키스. 이 작품이 약속한 설렘을 마음껏 펼치는 행복의 정점.' },
  { title: '6. 심화 + 외부 위협 등장', hint: '비밀·연적·과거·신분 격차·정치적 압력이 수면 위로. 행복 뒤에 그림자를 드리워 하강의 진자를 준비한다.' },
  { title: '7. 미드포인트 전환', hint: '관계가 한 단계 깊어지거나(첫 동침/진심 자각) 결정적 정보가 폭로된다. 되돌릴 수 없는 선을 넘는 지점.' },
  { title: '8. 블랙모먼트(파국)', hint: '오해·비밀·희생으로 관계가 끝장난 듯한 최저점. 로맨스의 필수 비트. 한 마디면 풀릴 오해 금지 — 상처에서 필연적으로.' },
  { title: '9. 영혼의 어두운 밤', hint: '떨어진 채 각자 진심을 깨닫는 성찰 구간. "왜 하필 그 사람이었나"를 둘 다 절감한다. 애틋한 갈망(pining)의 절정.' },
  { title: '10. 그랜드 제스처 — 재결합', hint: '한쪽(또는 둘 다)이 자존심·지위·목숨을 걸고 사랑을 증명한다. 오해 해소·장벽 제거. 상호성이 만족도의 핵심.' },
  { title: '11. HEA/HFN + 후일담', hint: '결혼·미래 약속으로 행복한 결말을 약속(장르 계약). 웹소설은 외전(후일담)으로 보너스 설렘을 반드시 얹는다.' },
]

// 웹소설 회차형(도시에 §4 회차 단위 페이싱 — 매 화 설렘/클리프행어)
const WEB: StageDef[] = [
  { title: '1화 — 강렬한 첫인상', hint: '1~10화 안에 두 주인공의 케미와 핵심 트로프를 명확히 노출(첫인상=연독률). 마지막 줄에 다음 화 궁금증(클리프행어).' },
  { title: '발단 — 떼어놓을 수 없는 계기', hint: '계약·동거·빙의 후 첫 대면 등으로 강제로 엮는다. "이 작품이 무슨 설렘을 줄지"를 독자에게 약속한다.' },
  { title: '밀당 루프 — 설렘+작은 좌절', hint: '회차마다 설렘 포인트(접촉·대사·질투) → 작은 좌절을 반복. 단조로운 행복도 무한 사이다도 텐션을 죽인다.' },
  { title: '떡밥 회수 — 남주 속마음 노출', hint: '남주 시점/독백을 짧게 끼워 "사실 그도 흔들린다"를 보여주고, 다음 떡밥을 던진다. 연독률을 끌어올리는 핵심.' },
  { title: '관계 진척 — 고백/첫 키스', hint: '고백→회피/거절→재고백의 다단계로 진척을 가시화. 정체되면 "고구마"라 비판받으니 박자를 지킨다.' },
  { title: '연적·위기 투입', hint: '약혼자·과거 연인·정적 등장으로 질투를 유발해 진심을 자각시킨다. 위기의 회차 끝마다 강한 클리프행어.' },
  { title: '블랙모먼트 — 최대 위기', hint: '오해·비밀 폭로·강제 혼약 등으로 최저점. 독자의 애간장을 태우되 HEA 약속은 흔들지 않는다.' },
  { title: '사이다 재결합', hint: '그랜드 제스처·후회·구원으로 단숨에 해소. 마지막 "리액션 한 방"으로 카타르시스를 닫는다.' },
  { title: '완결 + 외전', hint: '본편 HEA 후 외전(신혼·육아·남주 시점 특별편)으로 보너스 설렘을 제공. 웹소설 외전 문화는 사실상 필수 관습.' },
]

// 로판 회귀/빙의형(도시에 §3 정보 비대칭·악역영애·후회물 특화)
const ROPAN: StageDef[] = [
  { title: '회귀·빙의의 발단', hint: '처형/파혼/죽음 직전으로 회귀하거나 원작 속 악역 영애로 빙의. 한쪽만 미래/원작 결말을 아는 정보 비대칭을 깐다.' },
  { title: '생존 전략 — 결말 뒤집기', hint: '"내가 아는 비극"을 피하려는 능동적 행동(파혼 요구·이혼 준비·도주 계획). 원작 파괴가 서사 동력이 된다.' },
  { title: '예상 밖의 끌림', hint: '비극을 알면서도 그를 다시 만나는 애절함. 차갑던/적이던 남주가 달라진 그녀에게 예상 밖으로 끌리기 시작.' },
  { title: '강제 밀착 — 황궁/공작저', hint: '정략혼·계약결혼·후궁 등으로 매일 마주친다. 거리 두려는 그녀와 다가오는 그의 진자 운동이 본격화.' },
  { title: '진심 자각 + 정보 비대칭의 긴장', hint: '"원작과 다르게 그가 날 사랑한다?" 혼란과 자각. 결말을 알기에 마음을 주기 두려운 갈등이 핵심 연료.' },
  { title: '정적·음모의 상승', hint: '황실 정치·악녀·정적의 모함이 조여온다. 외부 사건은 항상 "둘 사이를 어떻게 바꾸는가"에 종속된다.' },
  { title: '블랙모먼트 — 원작의 비극 재림', hint: '회귀 전 비극이 다른 얼굴로 닥치거나, 비밀(회귀·정체)이 폭로되어 파국. 후회물이면 남주의 과오가 정점.' },
  { title: '후회·속죄 또는 권력으로 지키기', hint: '후회남주의 무릎 꿇기(권력 역전 카타르시스), 또는 황제가 권력으로 그녀를 지킨다. 정략혼·왕위를 거부.' },
  { title: '결말 — 바뀐 운명 + 외전', hint: '원작 비극을 끝내 뒤집고 HEA. 황후 즉위·진짜 부부 등으로 약속을 완성하고, 외전으로 후일담 설렘을 더한다.' },
]
const TEMPLATES: Record<Mode, StageDef[]> = { emo: EMO, web: WEB, ropan: ROPAN }
const MODE_LABEL: Record<Mode, string> = { emo: '장편 감정곡선(11비트)', web: '웹소설 회차형(9비트)', ropan: '로판 회귀/빙의형(9비트)' }

// 하위유형 모드(도시에 §1 — 톤·관습이 갈림). 로그라인/메모에 톤 힌트를 덧붙인다.
type SubGenre = 'contemp' | 'ropan' | 'histrom' | 'paranormal' | 'newadult'
const SUB: Record<SubGenre, { label: string; tone: string }> = {
  contemp: { label: 'A 현대 로맨스', tone: '재벌·계약연애·사내연애. 도시적 일상, 빠른 케미와 현실 갈등(직장·집안).' },
  ropan: { label: 'B 로맨스판타지', tone: '가상 제국·귀족 사회. 악역영애/회귀·빙의/정략혼·정치, 정보 비대칭의 애절함.' },
  histrom: { label: 'C 히스토리컬(리젠시 등)', tone: '시대극 무도회·신분·예법. 브리저튼·오만과 편견 계보의 격조 있는 밀당.' },
  paranormal: { label: 'D 패러노멀/로맨틱 판타지', tone: '소울메이트·저주·이종족. 운명적 끌림과 초자연 설정이 관계를 강제·시험.' },
  newadult: { label: 'E 뉴어덜트/이슈 드리븐', tone: '트라우마·관계 회복 소재. 감정의 밀도와 치유 서사(콜린 후버 계보).' },
}

// 관능도(heat level) — 도시에 §2 사전 합의된 약속. 메타/본문 톤에 표기.
type Heat = 'clean' | 'sweet' | 'steamy' | 'explicit'
const HEAT: Record<Heat, string> = {
  clean: '클린(키스 없음·암시만)', sweet: '스위트(키스까지)', steamy: '스티미(정사 암시·문 닫기)', explicit: '익스플리싯(노골적 묘사)',
}

// ── 데이터 모델 ─────────────────────────────────────────────────────
interface Item { id: string; title: string; body: string; done: boolean }
interface Saved { mode: Mode; sub: SubGenre; heat: Heat; title: string; items: Item[] }

function buildFromTemplate(mode: Mode): Item[] {
  return TEMPLATES[mode].map((s) => ({ id: newId(), title: s.title, body: '', done: false }))
}

function load(): Saved {
  const fallback: Saved = { mode: 'emo', sub: 'contemp', heat: 'sweet', title: '', items: buildFromTemplate('emo') }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return fallback
    const mode: Mode = p.mode === 'web' ? 'web' : p.mode === 'ropan' ? 'ropan' : 'emo'
    const sub: SubGenre = (['contemp', 'ropan', 'histrom', 'paranormal', 'newadult'] as SubGenre[]).includes(p.sub) ? p.sub : 'contemp'
    const heat: Heat = (['clean', 'sweet', 'steamy', 'explicit'] as Heat[]).includes(p.heat) ? p.heat : 'sweet'
    const items: Item[] = Array.isArray(p.items)
      ? p.items.filter((x: any) => x && typeof x === 'object').map((x: any) => ({
          id: String(x.id || newId()),
          title: typeof x.title === 'string' ? x.title : '(제목 없음)',
          body: typeof x.body === 'string' ? x.body : '',
          done: !!x.done,
        }))
      : buildFromTemplate(mode)
    return { mode, sub, heat, title: typeof p.title === 'string' ? p.title : '', items: items.length ? items : buildFromTemplate(mode) }
  } catch { return fallback }
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────
export default function RomanceOutline({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef<Saved>()
  if (!init.current) init.current = load()

  const [mode, setMode] = useState<Mode>(init.current.mode)
  const [sub, setSub] = useState<SubGenre>(init.current.sub)
  const [heat, setHeat] = useState<Heat>(init.current.heat)
  const [title, setTitle] = useState(init.current.title)
  const [items, setItems] = useState<Item[]>(init.current.items)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [showLogline, setShowLogline] = useState(true)

  // 로그라인 생성기 슬롯 상태(잠금 포함)
  const [slots, setSlots] = useState<Record<PoolKey, string>>(() => {
    const s = {} as Record<PoolKey, string>
    SLOT_ORDER.forEach((k) => { s[k] = pick(POOL[k]) })
    return s
  })
  const [locked, setLocked] = useState<Record<PoolKey, boolean>>(() => {
    const l = {} as Record<PoolKey, boolean>
    SLOT_ORDER.forEach((k) => { l[k] = false }); return l
  })

  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; if (noteTimer.current) clearTimeout(noteTimer.current) }
  }, [])

  // payload.genre 가 로맨스면 안내(연계로 열렸을 때 톤 자동 추천). 시드 슬롯 반영.
  useEffect(() => {
    if (payload && payload.genre === '로맨스') flash('로맨스 장르로 연계되어 열렸어요. 하위유형·관능도를 고르고 개요를 시작하세요.')
    if (payload && typeof payload.heroine === 'string') setSlots((p) => ({ ...p, heroine: String(payload.heroine) }))
    if (payload && typeof payload.hero === 'string') setSlots((p) => ({ ...p, hero: String(payload.hero) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ mode, sub, heat, title, items })) }
    catch { flash('이 브라우저에서 저장이 막혀 새로고침 시 개요가 사라질 수 있어요.') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sub, heat, title, items])

  function flash(msg: string) {
    if (!mounted.current) return
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 3400)
  }

  const logline = useMemo(() => buildLogline(slots), [slots])

  // ── 단계 템플릿 전환 ──
  const applyTemplate = (m: Mode) => {
    const hasContent = items.some((i) => i.body.trim() || i.done)
    if (hasContent && !window.confirm(`${MODE_LABEL[m]} 템플릿으로 바꾸면 현재 작성한 단계 내용이 초기화됩니다. 계속할까요?`)) return
    setMode(m)
    setItems(buildFromTemplate(m))
    setEditingId(null)
    flash(`${MODE_LABEL[m]} 템플릿을 적용했어요.`)
  }

  // ── 로그라인 굴리기(잠금 슬롯 보존) ──
  const reroll = () => {
    setSlots((prev) => {
      const next = { ...prev }
      SLOT_ORDER.forEach((k) => { if (!locked[k]) next[k] = pick(POOL[k]) })
      return next
    })
  }
  const rerollOne = (k: PoolKey) => setSlots((prev) => ({ ...prev, [k]: pick(POOL[k]) }))
  const toggleLock = (k: PoolKey) => setLocked((prev) => ({ ...prev, [k]: !prev[k] }))

  // 로그라인을 특정 단계 본문에 삽입
  const insertLogline = (id: string) => {
    setItems((prev) => prev.map((it) => it.id === id
      ? { ...it, body: it.body.trim() ? it.body.trim() + '\n' + logline : logline }
      : it))
    flash('생성한 로그라인을 해당 단계에 넣었어요.')
  }

  // 로그라인을 라이브러리 스니펫으로 저장
  const saveLoglineSnippet = () => {
    addToLibrary('snippets', { text: logline, source: '로맨스 개요 빌더', tags: ['로맨스', '로그라인', SLOT_LABEL.trope + ':' + slots.trope] })
    flash('로그라인을 글감 라이브러리(스니펫)에 저장했어요.')
  }

  // ── 항목 CRUD/이동 ──
  const editItem = (id: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  const addItem = () => {
    const it: Item = { id: newId(), title: '새 단계', body: '', done: false }
    setItems((prev) => [...prev, it]); setEditingId(it.id)
  }
  const delItem = (id: string) => {
    const it = items.find((x) => x.id === id)
    if (it && (it.body.trim()) && !window.confirm(`'${it.title}' 단계를 삭제할까요?`)) return
    setItems((prev) => prev.filter((x) => x.id !== id))
    if (editingId === id) setEditingId(null)
  }
  const move = (id: string, dir: -1 | 1) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) { flash(dir < 0 ? '이미 맨 위입니다.' : '이미 맨 아래입니다.'); return prev }
      const next = [...prev]; const [it] = next.splice(i, 1); next.splice(j, 0, it); return next
    })
  }
  const resetTemplate = () => {
    if (!window.confirm('현재 템플릿으로 모든 단계를 초기화할까요? 작성 내용이 사라집니다.')) return
    setItems(buildFromTemplate(mode)); setEditingId(null); flash('템플릿을 초기 상태로 되돌렸어요.')
  }

  // ── HTML 직렬화(프로젝트 본문) ──
  const toBodyHtml = (): string => {
    let out = ''
    if (title.trim()) out += `<p><strong>${escHtml(title.trim())}</strong></p>`
    out += `<p><em>구조: ${escHtml(MODE_LABEL[mode])} · 하위유형: ${escHtml(SUB[sub].label)} · 관능도: ${escHtml(HEAT[heat])}</em></p>`
    out += `<p><em>톤: ${escHtml(SUB[sub].tone)}</em></p>`
    out += `<p><em>※ 로맨스 장르 계약: HEA/HFN(행복한 결말) 약속 · 감정 곡선이 사건 곡선에 우선</em></p>`
    out += '<ol>'
    for (const it of items) {
      const head = escHtml(it.title) + (it.done ? ' ✓' : '')
      const body = it.body.trim() ? '<br>' + escHtml(it.body.trim()).replace(/\n/g, '<br>') : ''
      out += `<li><strong>${head}</strong>${body}</li>`
    }
    out += '</ol>'
    return out
  }

  // ── 프로젝트 연동 ──
  const addOutlineToProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '개요',
      title: title.trim() || '로맨스 개요',
      bodyHtml: toBodyHtml(),
      meta: {
        장르: '로맨스', 구조: MODE_LABEL[mode], 하위유형: SUB[sub].label, 관능도: HEAT[heat],
        단계수: String(items.length), 완료: String(items.filter((i) => i.done).length),
      },
    })
    flash(id ? '프로젝트 원고 "개요" 폴더에 로맨스 개요 문서를 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }

  // ── 텍스트 복사 ──
  const copyToClipboard = async (text: string, okMsg: string) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      flash(okMsg)
    } catch { flash('복사에 실패했어요.') }
  }
  const copyText = () => {
    let out = (title.trim() ? title.trim() + '\n' : '') + `[${MODE_LABEL[mode]} · ${SUB[sub].label} · 관능도 ${HEAT[heat]}]\n\n`
    items.forEach((it, i) => {
      out += `${it.title}${it.done ? ' ✓' : ''}\n`
      if (it.body.trim()) out += it.body.trim().split('\n').map((l) => '   ' + l).join('\n') + '\n'
      out += '\n'
    })
    copyToClipboard(out.trim(), '개요 전체를 클립보드에 복사했어요.')
  }
  const copyLogline = () => copyToClipboard(logline, '로그라인을 복사했어요.')

  const doneCount = items.filter((i) => i.done).length

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' }
  const bar: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: '10px 12px 16px' }
  const sel: React.CSSProperties = { padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13 }
  const titleInput: React.CSSProperties = { flex: 1, minWidth: 140, padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14 }
  const card: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 10, background: 'var(--paper)', padding: 10, marginBottom: 10 }
  const noteBar: React.CSSProperties = { padding: '6px 12px', fontSize: 12, color: 'var(--warn)', background: 'var(--paper)', borderBottom: '1px solid var(--border)', lineHeight: 1.5 }
  const gen: React.CSSProperties = { border: '1px solid color-mix(in srgb, var(--accent) 40%, var(--border))', borderRadius: 10, background: 'color-mix(in srgb, var(--accent) 7%, var(--paper))', padding: 12, marginBottom: 12 }
  const slotRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 13 }
  const taStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', minHeight: 64, resize: 'vertical', padding: 8, fontSize: 13, lineHeight: 1.6, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--chrome-2)', color: 'var(--text)', font: 'inherit' }

  return (
    <div style={wrap}>
      {/* 상단: 구조/하위유형/관능도/제목 */}
      <div style={bar}>
        <select style={sel} value={mode} onChange={(e) => applyTemplate(e.target.value as Mode)} title="매크로 구조 선택">
          {(Object.keys(MODE_LABEL) as Mode[]).map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
        </select>
        <select style={sel} value={sub} onChange={(e) => setSub(e.target.value as SubGenre)} title="하위유형(톤) 선택">
          {(Object.keys(SUB) as SubGenre[]).map((s) => <option key={s} value={s}>{SUB[s].label}</option>)}
        </select>
        <select style={sel} value={heat} onChange={(e) => setHeat(e.target.value as Heat)} title="관능도(heat level) — 독자와의 사전 약속">
          {(Object.keys(HEAT) as Heat[]).map((h) => <option key={h} value={h}>{HEAT[h]}</option>)}
        </select>
        <input style={titleInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="작품 제목(예: 계약 결혼한 본부장님이 변했다)" />
      </div>

      {note && <div style={noteBar}>{note}</div>}

      <div style={body}>
        {/* 하위유형 톤 + 장르 계약 안내 */}
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--accent)' }}>톤</strong> · {SUB[sub].tone}<br />
          <strong style={{ color: 'var(--accent)' }}>장르 계약</strong> · HEA/HFN(행복한 결말) 약속 · 감정 곡선이 사건 곡선에 우선 · 관능도 사전 고지
        </div>

        {/* 로그라인 생성기(슬롯 풀 무작위·잠금·조합수) */}
        {showLogline && (
          <div style={gen}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 14 }}><Emoji e="🎲"/> 로맨스 로그라인 굴리기</strong>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>가능한 조합 <strong style={{ color: 'var(--accent)' }}>{fmtBig(COMBO)}</strong> (정확히 {COMBO.toLocaleString()})</span>
              <div style={{ flex: 1 }} />
              <button className="btn-primary" onClick={reroll} title="잠그지 않은 슬롯만 다시 굴리기"><Emoji e="🎲"/> 굴리기</button>
              <button className="minibtn" onClick={() => setShowLogline(false)}>접기</button>
            </div>
            <div style={{ marginBottom: 8 }}>
              {SLOT_ORDER.map((k) => (
                <div key={k} style={slotRow}>
                  <button className="minibtn" onClick={() => toggleLock(k)} title={locked[k] ? '잠금 해제' : '이 슬롯 잠그기'} style={{ width: 30 }}>{locked[k] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
                  <span style={{ width: 92, color: 'var(--muted)', flexShrink: 0 }}>{SLOT_LABEL[k]}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>{slots[k]}</span>
                  <button className="minibtn" onClick={() => rerollOne(k)} title="이 슬롯만 굴리기">↻</button>
                </div>
              ))}
            </div>
            <div style={{ padding: 10, borderRadius: 8, background: 'var(--paper)', border: '1px solid var(--border)', fontSize: 13.5, lineHeight: 1.7, marginBottom: 8 }}>
              {logline}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="minibtn" onClick={copyLogline} title="로그라인 복사"><Emoji e="📋"/> 복사</button>
              <button className="minibtn" onClick={saveLoglineSnippet} title="글감 라이브러리에 저장">＋ 글감 저장</button>
              {items.length > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>→ 넣을 단계:</span>
                  <select style={sel} defaultValue="" onChange={(e) => { if (e.target.value) { insertLogline(e.target.value); e.target.value = '' } }}>
                    <option value="">단계 선택…</option>
                    {items.map((it, i) => <option key={it.id} value={it.id}>{i + 1}. {it.title}</option>)}
                  </select>
                </span>
              )}
            </div>
          </div>
        )}
        {!showLogline && (
          <button className="minibtn" onClick={() => setShowLogline(true)} style={{ marginBottom: 12 }}><Emoji e="🎲"/> 로그라인 굴리기 펼치기</button>
        )}

        {/* 단계(장/막) 목록 */}
        {items.map((it, i) => {
          const def = TEMPLATES[mode][i]
          const editing = editingId === it.id
          return (
            <div key={it.id} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={it.done} onChange={(e) => editItem(it.id, { done: e.target.checked })} title="이 단계 완료 표시" />
                <span style={{ fontSize: 12, color: 'var(--muted)', width: 20, textAlign: 'right' }}>{i + 1}</span>
                {editing ? (
                  <input style={{ ...titleInput, flex: 1 }} value={it.title} onChange={(e) => editItem(it.id, { title: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') setEditingId(null) }} autoFocus />
                ) : (
                  <strong style={{ flex: 1, fontSize: 14, textDecoration: it.done ? 'line-through' : 'none', color: it.done ? 'var(--muted)' : 'var(--text)' }}>{it.title}</strong>
                )}
                <button className="minibtn" onClick={() => move(it.id, -1)} disabled={i === 0} title="위로">↑</button>
                <button className="minibtn" onClick={() => move(it.id, 1)} disabled={i === items.length - 1} title="아래로">↓</button>
                <button className="minibtn" onClick={() => setEditingId(editing ? null : it.id)} title="제목 편집">{editing ? <>✓</> : <Emoji e="✏️"/>}</button>
                <button className="minibtn" onClick={() => delItem(it.id)} title="삭제"><Emoji e="🗑️"/></button>
              </div>
              {def && <div style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 6px 28px', lineHeight: 1.6 }}>{def.hint}</div>}
              <textarea style={{ ...taStyle, marginTop: 4 }} value={it.body} placeholder="이 단계의 줄거리·설렘 포인트를 적거나, 위에서 굴린 로그라인을 넣으세요."
                onChange={(e) => editItem(it.id, { body: e.target.value })} />
            </div>
          )
        })}

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
          <button className="minibtn" onClick={addItem}>＋ 단계 추가</button>
          <button className="minibtn" onClick={resetTemplate}>↺ 템플릿 초기화</button>
        </div>
      </div>

      {/* 연계 */}
      <div className="linkbar" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--chrome-2)' }}>
        <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
        <button className="linkbtn" onClick={addOutlineToProject} disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? '로맨스 개요를 프로젝트 원고 "개요" 폴더 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={copyText} title="개요 전체를 텍스트로 복사"><Emoji e="📋"/> 전체 복사</button>
        <button className="linkbtn" onClick={() => openToolLinked('scene-list', { genre: '로맨스' })} title="장면 목록 도구 열기"><Emoji e="🎬"/> 장면 목록</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre: '로맨스' })} title="플롯 피라미드 도구 열기"><Emoji e="⛰️"/> 플롯 피라미드</button>
        <button className="linkbtn" onClick={() => openToolLinked('character-forge', { genre: '로맨스', heroine: slots.heroine, hero: slots.hero })} title="캐릭터 생성기 열기"><Emoji e="🧬"/> 인물 만들기</button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>단계 {items.length} · 완료 {doneCount}</span>
      </div>
    </div>
  )
}
