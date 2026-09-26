// 스릴러 시그니처 — 위협·추격 시퀀스 대형 생성기(조합 1조+).
// 여섯 개의 장르 축을 굴려 "위협이 임박한 추격 한 장면"을 조립한다:
//   ① 위협 주체(정체 × 수식) ② 시간 압박(티킹 클락) ③ 주인공의 치명적 약점
//   ④ 추격 무대(압박 공간 × 환경 조건) ⑤ 판을 뒤집는 반전 ⑥ 승리/생존의 대가
// 여덟 개의 로컬 풀을 곱해 가능한 조합이 1조(10^12)를 훌쩍 넘는다(아래 COMBOS).
// 슬롯별 잠금(🔒)·개별 재생성, 총 조합수 표시, 한 문단 장면 요약 자동 생성.
// 자급식: react·linkbus 외 import 없음. 전부 로컬(외부 API 불필요).
// 연계(linkbus): 만든 시퀀스를 프로젝트 자료('research')/'장면' 폴더 문서로 추가,
//   스니펫 라이브러리에 글감 저장, 관련 스릴러 도구로 점프.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, TOOL_RELATIONS, Emoji } from './linkbus'

export const meta = {
  id: 'thriller-signature',
  name: '스릴러 시그니처',
  icon: '🩸',
  group: '생성기',
  genre: '스릴러·서스펜스',
  intro: '위협 주체·시간 압박·약점·추격 무대·반전·대가를 굴려 임박한 위협의 한 장면을 조립하세요',
  w: 500,
  h: 660,
}

const LS = 'sry:tool:thriller-signature'

// ── 여덟 개의 로컬 풀(전부 스릴러·서스펜스 도시에 근거한 구체 데이터) ──
// 위협 주체 = 정체(threatId) × 수식어(threatMod) 로 합성 → 빌런의 질이 곧 스릴러의 질.
const THREAT_ID = [
  '한발 앞서가는 연쇄살인범', '냉정한 청부 살인자', '신원을 지운 정부 요원', '부패한 강력계 형사',
  '광신 집단의 처형인', '실험에서 탈주한 변종', '복수에 미친 옛 파트너', '얼굴 없는 협박범',
  '죽은 줄 알았던 형제', '주인공을 빼닮은 도플갱어', '내부를 꿰뚫는 이중첩자', '집요한 사립탐정',
  '권력을 쥔 정치 브로커', '아동을 노리는 유괴범', '증거를 지우는 청소부', '독을 다루는 암살자',
  '해킹으로 일상을 장악한 스토커', '교도소에서 막 출소한 살인범', '법망을 빠져나온 무죄 판결자',
  '카르텔의 회계사를 쫓는 추적자', '실종 사건의 진짜 설계자', '가면을 쓴 모방범',
  '주인공의 비밀을 쥔 정보원', '조직을 배신하고 도망친 내부자', '완전범죄를 자부하는 외과의',
  '아내를 잃고 폭주한 자경단원', '컬트 교주를 자처하는 사기꾼', '경비를 매수한 내통자',
  '시한폭탄을 설치한 테러범', '인질을 협상 카드로 쥔 납치범', '뇌물로 배심을 산 변호인',
  '잠입을 들킨 위장 잠복 수사관', '국경을 넘나드는 밀수 조직의 행동대장', '증인을 입막음하는 청부 해결사',
  '딥페이크로 누명을 씌운 조작자', '실종된 딸을 찾는 광기의 아버지', '한 도시를 손에 쥔 부동산 재벌',
  '의뢰인을 차례로 죽이는 보험 설계자',
]
const THREAT_MOD = [
  '주인공의 동선을 미리 읽는', '경찰 무전을 도청하는', '한 번도 얼굴을 보인 적 없는',
  '실수란 모르는', '인질을 방패로 쓰는', '시신을 흔적도 없이 처리하는',
  '법 위에서 움직이는', '아군 속에 숨어 있는', '카메라마다 흔적을 지우는',
  '협상을 가장해 시간을 버는', '주인공의 약점을 정확히 아는', '동정심이라곤 없는',
  '두 수 앞을 내다보는', '죽음을 두려워하지 않는', '정의를 자처하는',
  '과거의 빚을 받아내려는', '거짓 알리바이로 무장한', '주변인부터 하나씩 노리는',
  '추적을 즐기는', '제3자에게 조종당하는', '한 도시를 손에 쥔',
  '내부 정보를 손에 넣은', '닥쳐올 마감을 역이용하는', '증거를 거꾸로 심는',
  '연민을 미끼로 던지는', '늘 한 발 물러서서 지켜보는', '예고 메시지를 보내오는',
  '신뢰를 무기로 삼는', '추격을 함정으로 바꾸는', '자백을 협박으로 되돌리는',
  '죽은 자의 이름으로 움직이는', '경계를 자유로이 넘나드는', '약효가 떨어지길 기다리는',
  '밤이 오기만을 노리는',
]
// 시간 압박(티킹 클락) — 명시 타이머/자연 마감/사회적 마감을 두루.
const CLOCK = [
  '폭탄 타이머가 19분을 가리킨다', '동이 트면 증거가 인양된다', '약효가 한 시간 뒤 끊긴다',
  '막차가 끊기기 전에 닿아야 한다', '밀물이 통로를 삼키기 직전이다', '재판 선고가 정오에 내려진다',
  '인질의 산소가 바닥나고 있다', '출항 30분 전, 배를 놓치면 끝이다', '경매 낙찰까지 단 10분',
  '경찰 비상선이 곧 좁혀온다', '독이 퍼지기 전 해독제를 찾아야 한다', '투표 마감 전 진실을 터뜨려야 한다',
  '눈보라가 길을 완전히 막기 직전이다', '발신 추적이 끝나기 전 통화를 끊어야 한다', '수혈 가능 시간이 얼마 남지 않았다',
  '생방송이 끝나면 폭로의 기회도 사라진다', '댐 수문이 자정에 열린다', '연료 게이지가 바닥을 친다',
  '백업이 덮어쓰기 되기 전 복사해야 한다', '교도소 점호까지 카운트다운이 돈다', '협박범이 정한 시한이 다가온다',
  '비행기 게이트가 곧 닫힌다', '정전 복구 전 금고를 열어야 한다', '증인이 비행기로 사라지기 직전이다',
  '해가 지면 수색대가 철수한다', '심장이 멎기 전 자백을 받아야 한다', '서버가 자동 포맷되기까지 분초 단위다',
  '교각 폭파 예정 시각이 코앞이다', '약속한 인질 교환 시각이 다가온다', '바이러스 배포까지 카운트가 멈추지 않는다',
  '공소시효가 자정에 만료된다', '구조 헬기가 마지막 한 번만 더 온다', '경보 해제 코드를 입력할 시간이 줄어든다',
  '범인이 다음 희생자를 고르기 직전이다', '폭설로 활주로가 곧 폐쇄된다',
  '자정이 지나면 송금이 영영 회수 불가능해진다',
]
// 주인공의 치명적 약점 — 유능하지만 취약해야 긴장이 산다.
const WEAKNESS = [
  '한쪽 다리를 절뚝인다', '총알이 단 한 발 남았다', '믿었던 정보가 조작된 것이었다',
  '품에 안긴 아이를 떼어놓을 수 없다', '심장 약을 집에 두고 왔다', '낯선 도시라 지리를 모른다',
  '과거의 트라우마가 결정적 순간 발목을 잡는다', '동료에게 위치가 새어 나갔다', '손목의 옛 상처가 다시 벌어진다',
  '휴대폰 배터리가 거의 없다', '거짓말이 곧 들통날 참이다', '경찰에 쫓기는 누명을 쓰고 있다',
  '한쪽 귀가 들리지 않는다', '결정적 증거를 빗속에 떨어뜨렸다', '술을 끊은 지 사흘째라 손이 떨린다',
  '가족이 인질로 잡혀 손발이 묶였다', '추격자가 자신의 약점을 정확히 안다', '잠을 못 자 판단이 흐려진다',
  '예전 부상으로 오래 달릴 수 없다', '진통제 약효가 떨어져 간다', '신분이 발각되면 모두가 위험해진다',
  '믿을 사람이 단 한 명도 없다', '거짓 알리바이가 무너지기 직전이다', '시력이 어둠 속에서 급격히 나빠진다',
  '한 번의 실수로 이미 동료를 잃었다', '협박 영상이 인질로 잡혀 있다', '천식 발작이 호흡을 조인다',
  '돈도 차도 무기도 없는 빈손이다', '추적당하는 줄 모른 채 단서를 흘렸다', '딸의 목소리에 판단력을 잃는다',
  '옛 동료를 차마 쏘지 못한다', '결정적 비밀번호를 기억하지 못한다', '부상으로 피가 멈추지 않는다',
  '경찰 무전을 엿듣는 적에게 동선이 읽힌다', '한 손에 수갑이 채워져 있다', '거짓 진술이 발목을 잡는다',
  '고소공포증이 옥상으로 내몰린 그를 얼어붙게 한다',
]
// 추격 무대 = 장소(PLACE) × 환경 조건(ENV) — 배경 자체가 압박 장치(폐쇄·고립·감시·탈출 불가).
const PLACE = [
  '비에 젖은 밤의 뒷골목', '멈춰 선 만원 지하철', '정전된 고층 빌딩 계단', '폭설에 고립된 산장',
  '물이 차오르는 지하 주차장', '폐선된 야간열차 객실', '안개에 잠긴 부두', '버려진 정신병원 병동',
  '관제 카메라로 뒤덮인 환승역', '붐비는 새벽 수산시장', '불 꺼진 대형 쇼핑몰', '무너지는 다리 위',
  '범람 직전의 하수도', '옥상에서 옥상으로 이어진 비좁은 난간', '카니발 행렬 한가운데',
  '잠긴 채 멈춘 엘리베이터', '연기가 자욱한 카지노 플로어', '국경 검문소의 차량 행렬',
  '안전가옥으로 위장한 외딴 별장', '법원 지하 구치 통로', '눈 덮인 고속도로 휴게소',
  '컨테이너가 쌓인 야간 항만', '관객으로 들어찬 극장 무대 뒤', '폐쇄된 지하 벙커',
  '도청 장치가 깔린 호텔 스위트룸', '교통 정체에 갇힌 터널 안', '얼어붙은 호수 한복판',
  '환자가 비운 야간 응급실', '경비가 순찰 도는 사설 묘지', '낡은 등대로 이어진 절벽 계단',
  '셔터 내린 24시 무인 세탁소', '비상등만 켜진 지하 데이터센터', '여객선의 텅 빈 갑판',
  '주차 타워의 나선형 경사로', '폐업한 놀이공원의 거울의 방', '교외 신도시의 똑같은 단독주택가',
]
const ENV = [
  '깜빡이는 형광등 아래', '천둥이 발소리를 지운다', '사이렌이 점점 가까워진다',
  '시야를 가리는 짙은 안개 속', '발밑이 미끄러운 빙판 위', '비상벨이 끊임없이 울린다',
  '정전으로 비상등만 깜빡인다', '군중이 길을 가로막는 혼잡 속', '한 치 앞도 안 보이는 어둠 속',
  '폭우로 빗소리가 모든 걸 삼킨다', '연기로 숨쉬기조차 어렵다', '바닥이 흔들리는 진동 속',
  '감시 카메라가 사방을 비춘다', '확성기 안내방송이 울려 퍼진다', '폭설로 발자국이 곧 지워진다',
  '비명이 군중 속에 묻힌다', '얼음이 갈라지는 소리가 번진다', '경보 해제까지 모든 문이 잠긴다',
  '단 하나의 출구만 열려 있다', '신호가 잡히지 않는 사각지대다', '물이 발목까지 차올랐다',
  '바람에 간판이 떨어져 내린다', '깨진 유리가 발밑에 깔려 있다', '한밤의 정적이 발소리를 키운다',
  '불빛 하나 없는 정전 상태다', '뒤따르는 헤드라이트가 백미러를 채운다', '드론 한 대가 머리 위를 맴돈다',
  '낯선 발소리가 메아리친다', '울리지 않던 전화가 갑자기 울린다', '천장에서 물이 새어 떨어진다',
  '경광등 불빛이 벽을 붉게 물들인다', '확성기가 이름을 부르며 다가온다', '폭발음이 멀리서 땅을 울린다',
  '계단마다 센서등이 차례로 켜진다', '환풍구로 가스 냄새가 스며든다', '비상구 표시등만 외로이 빛난다',
]
// 판을 뒤집는 반전 — 공정해야 한다(복선 회수형으로 쓰기 좋게).
const TWIST = [
  '도와주던 행인이 추격자의 일당이었다', '쫓기던 자가 실은 함정을 판 쪽이었다',
  '믿었던 동료가 처음부터 흑막이었다', '추격자와 주인공은 같은 진실을 쫓고 있었다',
  '인질이 사실 자발적인 공범이었다', '추격은 더 큰 위협으로부터 그를 지키려는 것이었다',
  '결정적 증거가 통째로 조작된 것이었다', '두 사람 다 제3자에게 조종당하고 있었다',
  '죽은 줄 안 인물이 다른 이름으로 곁에 있었다', '추격자의 정체가 가장 가까운 사람이었다',
  '주인공이 좇던 표적이 미래의 자신이었다', '구해준 사람이 모든 일을 꾸민 자였다',
  '신뢰할 수 없는 화자였음이 드러난다', '진범으로 지목된 자가 유일한 무고였다',
  '주인공의 희생이 적의 계획에 꼭 필요한 조각이었다', '평화 협상이 학살을 위한 미끼였다',
  '쫓기던 길이 처음부터 원을 그리고 있었다', '추격자가 일부러 놓아주려 한다',
  '잃어버린 줄 안 무기를 줄곧 쥐고 있었다', '내부 고발자가 진짜 우두머리였다',
  '체호프의 총—초반의 사소한 단서가 결정타가 된다', '목격자의 증언이 가장 큰 거짓이었다',
  '범인의 자백이 또 다른 함정이었다', '구출의 목표가 이미 오래전에 죽은 사람이었다',
  '주인공이 무의식 중에 적을 직접 불러들였다', '추격자의 무기가 처음부터 비어 있었다',
  '딥페이크로 누명이 씌워진 것이었다', '주인공이 막은 사건은 이미 일어난 뒤였다',
  '경찰 내부에서 정보가 새고 있었다', '협박 영상 속 인물이 주인공 자신이었다',
  '두 사건이 사실 같은 시각의 한 사건이었다', '멘토가 처음부터 주인공을 이용할 작정이었다',
  '도망자가 노린 건 바로 이 추격이었다', '맥거핀이 가짜였고 진짜는 따로 있었다',
  '용의선상에서 가장 먼저 지운 인물이 진범이었다', '추격의 진짜 표적은 그가 쥔 비밀이었다',
  '갑작스러운 재난이 추격의 판을 통째로 뒤엎는다', '죽음을 위장한 인물이 모든 걸 설계했다',
  '가장 안전하다 믿은 집 안에 적이 이미 들어와 있었다', '구원자라 믿은 존재가 시스템의 일부였다',
  '위협을 알려온 익명의 제보자가 사건의 진짜 범인이었다',
]
// 승리/생존의 대가 — 무손실 승리는 싱겁다(도덕적 대가·여진·스팅어).
const COST = [
  '간발의 차로 탈출하지만 동료 하나를 잃는다', '붙잡히는 대신 뜻밖의 거래가 시작된다',
  '진실은 밝혀지나 주인공은 누명을 끝내 못 벗는다', '적은 쓰러뜨렸으나 더 깊은 함정에 들어선다',
  '살아남았지만 다시는 예전으로 돌아갈 수 없다', '승리의 순간 마지막 위협이 한 번 더 솟구친다',
  '진실의 대가로 사랑하는 사람이 떠난다', '적을 막았으나 그 자리를 이을 자가 이미 있다',
  '간신히 숨었지만 곧 발각될 위기가 남는다', '추격은 끝났으나 주인공은 변해버렸다',
  '한 사람을 살리려 다수를 포기해야 했다', '범인은 잡혔지만 배후는 그림자 속으로 사라진다',
  '결정적 증거를 손에 넣지만 자신의 죄도 드러난다', '복수는 이뤘으나 텅 빈 마음만 남는다',
  '탈출했지만 돌아가야 할 이유가 생긴다', '마지막 한 줄, 적이 살아 있었음이 암시된다',
  '구한 사람은 더 이상 그를 믿지 않는다', '진실을 폭로하자 더 큰 거짓이 필요해진다',
  '승리하지만 손에 피를 묻혀야 했다', '적의 비밀을 알게 된 대가로 표적이 된다',
  '간신히 막았지만 다음 표적은 자신이 된다', '둘 다 살아남았으나 우정은 끝났다',
  '진범을 잡았으나 법은 그를 풀어준다', '카운트다운은 멈췄지만 다른 시계가 돌기 시작한다',
  '목숨은 건졌으나 평생 도망자로 살아야 한다', '구원의 대가로 가장 소중한 비밀이 새어 나간다',
  '적을 무너뜨렸지만 자신도 같은 괴물이 되어간다', '사건은 종결되나 한 사람의 행방은 영영 묘연하다',
  '진실을 안 자는 침묵을 강요당한다', '승리의 증거가 곧 다음 협박의 빌미가 된다',
  '아이는 구했으나 그 대가를 평생 갚아야 한다', '적은 자백했으나 그 말이 새로운 의혹을 남긴다',
  '도시는 지켰지만 주인공의 이름은 악인으로 기록된다', '마지막에 울린 전화가 모든 게 끝나지 않았음을 알린다',
  '살아남은 자는 살아남았다는 죄책감에 짓눌린다', '진실은 묻히고 거짓이 영웅담으로 남는다',
  '추격은 끝났지만 지켜야 할 비밀이 하나 더 늘어난다',
]

// ── 슬롯 정의(8개 풀, 화면에는 6개 개념 슬롯으로 묶어 표시) ──
interface Pool { key: string; pool: string[] }
const POOLS: Pool[] = [
  { key: 'threatId', pool: THREAT_ID },
  { key: 'threatMod', pool: THREAT_MOD },
  { key: 'clock', pool: CLOCK },
  { key: 'weakness', pool: WEAKNESS },
  { key: 'place', pool: PLACE },
  { key: 'env', pool: ENV },
  { key: 'twist', pool: TWIST },
  { key: 'cost', pool: COST },
]

// 화면 슬롯(잠금/개별 재생성 단위) — 일부는 두 풀을 합성한다.
interface Slot { key: string; label: string; icon: string; pools: string[] }
const SLOTS: Slot[] = [
  { key: 'threat', label: '위협 주체', icon: '🩸', pools: ['threatMod', 'threatId'] },
  { key: 'clock', label: '시간 압박', icon: '⏱️', pools: ['clock'] },
  { key: 'weakness', label: '치명적 약점', icon: '🩹', pools: ['weakness'] },
  { key: 'stage', label: '추격 무대', icon: '🌆', pools: ['place', 'env'] },
  { key: 'twist', label: '반전', icon: '🌀', pools: ['twist'] },
  { key: 'cost', label: '대가', icon: '⚰️', pools: ['cost'] },
]

// 총 조합수 = 여덟 풀의 곱 → 1조(10^12) 초과.
const COMBOS = POOLS.reduce((n, p) => n * p.pool.length, 1)
const COMBO_JO = COMBOS / 1e12 // '조' 단위 환산

const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]
function pickFresh(a: string[], prev?: string): string {
  if (a.length <= 1) return a[0]
  let v = pick(a)
  if (v === prev) v = pick(a)
  return v
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 풀 결과 → 슬롯 표시 텍스트(합성 슬롯은 풀들을 엮는다).
function slotText(slot: Slot, r: Record<string, string>): string {
  if (slot.key === 'threat') {
    const mod = r.threatMod, id = r.threatId
    if (!mod || !id) return ''
    return `${mod} ${id}`
  }
  if (slot.key === 'stage') {
    const pl = r.place, en = r.env
    if (!pl || !en) return ''
    return `${pl}, ${en}`
  }
  return r[slot.pools[0]] || ''
}

const stripEnd = (s: string) => s.replace(/[.。]\s*$/, '')

// 조립된 시퀀스 한 문단 — 여섯 축을 임박한 긴장의 한국어로 엮는다.
function compose(r: Record<string, string>): string {
  const threat = slotText(SLOTS[0], r)
  const clock = r.clock, weakness = r.weakness
  const stage = slotText(SLOTS[3], r)
  const twist = r.twist, cost = r.cost
  if (!threat || !clock || !weakness || !stage || !twist || !cost) {
    return '여섯 축을 굴려 임박한 위협의 한 장면을 만들어 보세요.'
  }
  return (
    `${stage}. ${stripEnd(clock)}. ` +
    `주인공은 ${threat}에게 쫓긴다. ` +
    `하필 ${stripEnd(weakness)}. ` +
    `그 순간—${stripEnd(twist)}. ` +
    `끝내 ${stripEnd(cost)}.`
  )
}

// 슬롯 결과를 줄글(복사/스니펫/메모 공용)로.
function plainText(r: Record<string, string>): string {
  const lines = SLOTS.map((s) => `${s.icon} ${s.label}: ${slotText(s, r)}`)
  return `${lines.join('\n')}\n\n🩸 ${compose(r)}`
}

interface Saved { id: string; text: string; scene: string; threat: string; at: number }

function newId(): string {
  return 'ts_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function loadSaved(): Saved[] {
  try {
    const raw = localStorage.getItem(LS + ':saved')
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter((s) => s && typeof s.text === 'string').map((s) => ({
      id: typeof s.id === 'string' ? s.id : newId(),
      text: String(s.text),
      scene: typeof s.scene === 'string' ? s.scene : '',
      threat: typeof s.threat === 'string' ? s.threat : '',
      at: Number(s.at) || Date.now(),
    }))
  } catch { return [] }
}

export default function ThrillerSignature({ payload }: { payload?: Record<string, unknown> }) {
  const [results, setResults] = useState<Record<string, string>>({})
  const [locked, setLocked] = useState<Record<string, boolean>>({}) // 슬롯 단위 잠금
  const [rolling, setRolling] = useState(false)
  const [tab, setTab] = useState<'gen' | 'saved'>('gen')
  const [saved, setSaved] = useState<Saved[]>(loadSaved)
  const [toast, setToast] = useState('')
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 보관 목록 저장 — 차단/용량초과 graceful.
  useEffect(() => {
    try { localStorage.setItem(LS + ':saved', JSON.stringify(saved)) } catch { /* ignore */ }
  }, [saved])

  // 토스트 자동 소거 + 언마운트 정리.
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1900)
    return () => window.clearTimeout(t)
  }, [toast])

  // 굴림 애니메이션 자동 해제 + 언마운트 정리.
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 380)
    return () => window.clearTimeout(t)
  }, [rolling])

  // 한 슬롯이 묶은 풀 전부를 다시 뽑는다(잠금이면 보존).
  const rollSlotPools = (slot: Slot, prev: Record<string, string>): Record<string, string> => {
    const out: Record<string, string> = {}
    slot.pools.forEach((pk) => {
      const pool = POOLS.find((p) => p.key === pk)
      if (pool) out[pk] = pickFresh(pool.pool, prev[pk])
    })
    return out
  }

  // 전부(잠금 슬롯 제외) 다시 굴리기.
  const rollAll = useCallback(() => {
    setRolling(true)
    setResults((prev) => {
      const next: Record<string, string> = { ...prev }
      SLOTS.forEach((s) => {
        if (locked[s.key] && s.pools.every((pk) => prev[pk])) return
        Object.assign(next, rollSlotPools(s, prev))
      })
      return next
    })
  }, [locked])

  // 한 슬롯만 다시 굴리기.
  const rollOne = (slot: Slot) => {
    setRolling(true)
    setResults((prev) => ({ ...prev, ...rollSlotPools(slot, prev) }))
  }

  const toggleLock = (key: string) =>
    setLocked((prev) => ({ ...prev, [key]: !prev[key] }))

  // 첫 진입 자동 1회 굴림(빈 화면 방지). payload.genre 등은 향후 확장용으로 받아만 둔다.
  const inited = useRef(false)
  useEffect(() => {
    if (inited.current) return
    inited.current = true
    rollAll()
    void payload
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ready = SLOTS.every((s) => s.pools.every((pk) => results[pk]))
  const scene = compose(results)

  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setToast('복사에 실패했습니다.') }
  }
  const doCopy = (text: string) => {
    const done = () => { if (mounted.current) setToast('복사했습니다.') }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }

  const copyText = () => { if (ready) doCopy(plainText(results)) }

  // 스니펫 라이브러리에 글감 저장(다른 도구와 공유).
  const saveSnippet = () => {
    if (!ready) return
    addToLibrary('snippets', {
      text: plainText(results),
      source: '스릴러 시그니처',
      tags: ['글감', '스릴러', '위협', '추격', '장면'],
    })
    setToast('스니펫 라이브러리에 저장했습니다.')
  }

  // 보관함에 담기(이 도구 내부 localStorage).
  const keep = () => {
    if (!ready) return
    setSaved((prev) => [{ id: newId(), text: plainText(results), scene, threat: slotText(SLOTS[0], results), at: Date.now() }, ...prev].slice(0, 100))
    setToast('보관함에 담았습니다.')
  }
  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))

  // 프로젝트 연동 — 만든 위협·추격 시퀀스를 자료(research)/'장면' 폴더 문서로 추가.
  const toProject = () => {
    if (!ready) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const rows = SLOTS.map((s) => `<p><strong>${escHtml(s.icon)} ${escHtml(s.label)}:</strong> ${escHtml(slotText(s, results))}</p>`).join('')
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.7;"><strong>🩸 ${escHtml(scene)}</strong></p>`,
      '<hr/>',
      rows,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '장면',
      title: `스릴러 시퀀스 — ${slotText(SLOTS[0], results)}`,
      bodyHtml,
      synopsis: scene,
      meta: {
        장르: '스릴러·서스펜스',
        위협주체: slotText(SLOTS[0], results),
        시간압박: results.clock || '',
        무대: slotText(SLOTS[3], results),
      },
    })
    setToast(id ? '프로젝트 자료 〈장면〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 관련 스릴러 도구로 점프(있으면).
  const related = TOOL_RELATIONS[meta.id] || []

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  const comboLabel = COMBO_JO >= 1
    ? `약 ${COMBO_JO.toFixed(2)}조가지`
    : `약 ${COMBOS.toLocaleString('ko-KR')}가지`

  return (
    <div style={wrap}>
      <div style={hint}>
        여섯 축(<b>위협 주체·시간 압박·치명적 약점·추격 무대·반전·대가</b>)을 굴려
        <b> 임박한 위협의 한 장면</b>을 조립하세요. 마음에 드는 슬롯은 <Emoji e="🔒" />로 고정하고 나머지만 다시 굴릴 수 있어요.
      </div>

      {/* 탭 + 조합수 */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={() => setTab('gen')} aria-pressed={tab === 'gen'}
          style={{ borderColor: tab === 'gen' ? 'var(--accent)' : 'var(--border)', color: tab === 'gen' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🩸" /> 생성기
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐" /> 보관함 ({saved.length})
        </button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--muted)' }} title={`여덟 풀의 조합 가짓수: ${COMBOS.toLocaleString('ko-KR')}`}>
          가능한 조합 {comboLabel}
        </span>
      </div>

      {tab === 'gen' && (
        <>
          {/* 슬롯들 */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {SLOTS.map((s) => {
              const val = slotText(s, results)
              const isLocked = !!locked[s.key]
              return (
                <div key={s.key}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 22, width: 28, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-12deg) scale(1.15)' : 'none' }}>
                    <Emoji e={s.icon} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35, color: val ? 'var(--text)' : 'var(--muted)' }}>
                      {val ? (rolling && !isLocked ? '…' : val) : '— 굴려주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => rollOne(s)} title="이 슬롯만 다시 굴리기" style={{ flexShrink: 0 }}><Emoji e="🎲" /></button>
                  <button className="minibtn" onClick={() => toggleLock(s.key)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 조립된 시퀀스 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🩸" /> 위협·추격 시퀀스</div>
            <div style={{ fontSize: 14, lineHeight: 1.65, color: ready ? 'var(--text)' : 'var(--muted)' }}>{scene}</div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 130 }} onClick={rollAll}><Emoji e="🎲" /> 시퀀스 생성 / 다시 굴리기</button>
            <button className="minibtn" onClick={keep} disabled={!ready} title="이 시퀀스를 보관함에 담기"><Emoji e="⭐" /> 보관</button>
            <button className="minibtn" onClick={copyText} disabled={!ready} title="시퀀스 글감 복사"><Emoji e="📋" /> 복사</button>
            <button className="minibtn" onClick={saveSnippet} disabled={!ready} title="스니펫 라이브러리에 저장(다른 도구와 공유)"><Emoji e="🧩" /> 스니펫</button>
          </div>

          {/* 프로젝트 연계 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={toProject} disabled={!ready || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !ready ? '먼저 시퀀스를 굴려주세요' : '현재 시퀀스를 프로젝트 자료 〈장면〉 폴더에 추가'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            {related.map((rid) => (
              <button key={rid} className="linkbtn" onClick={() => openToolLinked(rid, { genre: '스릴러·서스펜스' })} title={`관련 도구 열기: ${rid}`}>
                <Emoji e="🔗" /> {rid}
              </button>
            ))}
          </div>

          <div style={hint}>고정된 슬롯은 그대로 두고 나머지만 다시 굴립니다. 조합은 출발점일 뿐, 인물·상황에 맞춰 자유롭게 비틀어 보세요. 빌런이 한 수 앞서고, 시계가 0을 향할수록 긴장은 커집니다.</div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐" /></div>
              보관한 시퀀스가 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성기에서 <Emoji e="⭐" /> 보관을 눌러 마음에 드는 위협·추격 시퀀스를 모아보세요.</span>
            </div>
          )}
          {saved.map((s) => (
            <div key={s.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.6 }}>{s.scene}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ flex: 1 }} />
                <button className="minibtn" onClick={() => doCopy(s.text)} title="복사"><Emoji e="📋" /></button>
                <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--ok)', textAlign: 'center' }}>{toast}</div>}
    </div>
  )
}
