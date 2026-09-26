// 호러·공포 배경·현장 생성기(HorrorSettingForge) — 호러 장르 특화 '무대(현장)' 생성 도구.
//   고립된 현장 × 시각·기상 × 공포 유형(하위장르) × 균열(첫 이상징후) × 분위기(드레드)
//   × 위협의 정체(off-screen) × 규칙·금기 단일 슬롯에 '감각 디테일' 다중 슬롯(4개)을 곱해
//   하나의 '배경 묘사 글감(공포 현장)'을 만든다. 마음에 드는 칸은 🔒로 잠그고 나머지만 🎲 재생성.
//   조합수 1조 이상(핵심 생성기 지향).
// 자급식: react 와 './linkbus' 만 import. 외부 API·네트워크 없음(전부 로컬 자작·호러 특화 데이터).
//   Math.random + localStorage('sry:tool:horror-settingforge') 만 사용. 언마운트 정리.
// 연계: 공유 장소 라이브러리(addToLibrary('places')) + 글감 스니펫(addToLibrary('snippets'))
//   + 프로젝트(addToProject kind:setting, folder:'장소') + 관련 도구 열기(openToolLinked). payload.genre 맥락 배지.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'horror-settingforge',
  name: '호러 배경·현장 생성기',
  icon: '🏚️',
  group: '배경',
  genre: '호러·공포',
  intro: '고립된 현장·기상·공포 유형·이상징후·위협·금기·감각 디테일을 조합해 공포 무대 글감을 만드세요',
  w: 580,
  h: 700,
}

const LS_KEY = 'sry:tool:horror-settingforge'

// ── 슬롯 풀(전부 자작·호러 특화·구체적. 도시에의 공간/장치/어휘에 근거) ───────────
// 단일 슬롯: place / weather / subgenre / crack / mood / threat / rule
// 다중 슬롯: detail(감각 디테일 4개) — 조합수를 1조 이상으로 키운다.

// 장소(현장) — 고립된 폐쇄공간 · 귀신 들린 집 · 저주받은 마을 · 일상의 침범
const PLACES = [
  '폭설에 갇혀 전화가 끊긴 외딴 산장', '등대지기가 사라진 안개 낀 곶의 등대', '유일한 출구가 무너진 폐광 갱도 막장',
  '과거 일가족이 몰살당한 언덕 위의 빈 저택', '환자 절반이 사라진 채 폐쇄된 정신병원 병동', '입주민이 한 층씩 사라지는 낡은 아파트 7층',
  '외부인을 환대하는 듯 적대하는 골짜기 끝 마을', '해마다 한 명을 제물로 바치는 섬마을의 당집', '수십 년째 같은 영화만 트는 폐극장 영사실',
  '관객 없이 음악만 도는 버려진 놀이공원 회전목마', '아이들 웃음소리가 새어 나오는 폐원된 초등학교 4반', '시신 보관실 문이 안에서 잠긴 시골 병원 지하 영안실',
  '신도가 떠난 뒤 촛불만 켜져 있는 산속 기도원', '눈보라에 통신이 두절된 남극 관측기지 격리동', '구조 신호가 끊긴 표류하는 화물선 화물칸',
  '승객이 한 명도 내리지 않은 막차 지하철 마지막 칸', '입원 첫날 옆 침대가 매일 바뀌는 6인실 병동', '이사 첫날 지하실 문이 안쪽으로 잠겨 있던 단독주택',
  '벽지 뒤에서 긁는 소리가 나는 신혼집 안방', '가족사진 속 한 사람이 매일 지워지는 거실', '거울마다 천이 덮여 있던 상가(喪家)의 안채',
  '제사상이 매일 새로 차려지는 빈 종갓집', '구미호 전설이 전해지는 폐사지(廢寺址)의 무너진 탑', '처녀귀신이 나온다는 학교 별관 화장실 끝 칸',
  '한밤중에만 정원에 그네가 흔들리는 고아원 본관', '저주받은 비디오테이프가 발견된 폐가전 수리점 창고', '입소자 명단이 한 줄씩 늘어나는 요양원 야간 병동',
  '엘리베이터가 13층에서만 멈추는 폐업한 백화점', '물이 천장까지 차오르는 침수된 지하주차장', '한 번 들어가면 같은 복도가 반복되는 미로 같은 모텔',
  '관 뚜껑이 미세하게 열려 있던 가족 납골당', '폭우에 다리가 끊겨 고립된 강 한가운데 펜션', '환풍구에서 숨소리가 들리는 무인 편의점 새벽 근무대',
  '계기판이 전부 멈춘 정전된 지하 벙커 통제실', '실종자 벽보로 도배된 휴게소 화장실', '바닷물이 핏빛으로 변한 외딴 양식장의 수조 창고',
  '폐쇄된 노선 끝, 막차가 끊긴 무인역 대합실', '안내 방송만 반복되는 손님 없는 심야 라디오 부스',
  '수술 기록이 모두 지워진 폐업 병원 수술실', '제때 멈추지 않는 컨베이어만 도는 폐공장 가공동',
]

// 시각·기상 — 폭풍우·정전·고립을 만드는 기상, 일상의 미세한 어긋남
const WEATHERS = [
  '정전이 들이닥친 폭풍우 치는 자정', '눈보라에 한 치 앞도 안 보이는 새벽 세 시', '안개가 무릎까지 차오른 회색 여명',
  '해가 지고 가로등이 하나씩 꺼지는 황혼', '장맛비가 사흘째 그치지 않는 흐린 오후', '보름달이 유난히 붉게 떠오른 밤',
  '시계가 모두 같은 시각에 멈춰버린 정적의 오전', '매미 소리마저 뚝 끊긴 한낮의 폭염', '진눈깨비가 살갗을 저릿하게 하는 늦은 저녁',
  '정전과 함께 라디오가 잡음만 토해내는 밤', '안개비에 발자국이 곧바로 지워지는 새벽', '천둥이 친 직후 찾아온 부자연스러운 무풍의 침묵',
  '서리가 창 안쪽에서부터 번지는 한겨울 자정', '해무가 밀려와 등대 불빛이 닿지 않는 정오', '낙엽 한 장 흔들리지 않는 바람 없는 가을밤',
  '동이 틀 듯 말 듯 새벽이 오지 않는 끝없는 어둠', '눈이 발목까지 쌓였는데 발자국이 하나도 없는 아침', '비가 그쳤는데도 처마에서 물방울이 계속 떨어지는 밤',
  '괘종시계가 열세 번 울린 직후의 자정', '평소보다 30분 일찍 캄캄해진 부자연스러운 저녁',
]

// 공포 유형(하위장르) — 도시에의 하위장르 지도
const SUBGENRES = [
  '귀신/고딕(원혼이 떠도는 흉가)', '악마·오컬트(엑소시즘·흑마술·사이비)', '슬래셔(가면 쓴 살인마와 마지막 생존자)',
  '바디 호러(감염·기생·신체 변형)', '크리처/몬스터(정체 모를 거대 생물)', '포크 호러(고립된 시골 공동체의 이교 의식)',
  '우주적 공포(인간의 이해를 넘어선 존재)', '사이코로지컬(신뢰할 수 없는 화자·내면 붕괴)', '서바이벌/아포칼립스(감염 좀비 떼)',
  '저주의 전염(사람에서 사람으로 옮는 룰)', '도시괴담(현대 매체를 통한 저주 전파)', '빙의·강신(누군가의 몸을 빌린 존재)',
  '분석적/미스터리 호러(초자연인가 정신병인가)', '한(恨) 서린 원귀(처녀귀신·자살한 자의 복수)', '구미호·요괴(전통 괴담의 변신 괴물)',
  '인형·매체 빙의(인형·거울·사진에 깃든 것)', '시간·기억 왜곡(같은 하루가 반복되는 루프)', '집의 인격화(적대적 의지를 가진 건물)',
]

// 균열(첫 이상징후) — 5단 구조의 'The First Sign'. 설명 가능할 법한 작은 어긋남
const CRACKS = [
  '잠근 기억이 없는 문이 매일 아침 열려 있다', '가족이 똑같이 생겼지만 표정이 0.5초 늦게 따라온다',
  '벽 안쪽에서 손톱으로 긁는 소리가 밤마다 같은 시각에 들린다', '집 안의 모든 거울이 누군가에 의해 천으로 덮여 있다',
  '아이가 ‘보이지 않는 친구’와 매일 같은 자리에서 논다', '가족사진 속 인물이 하루에 한 명씩 흐릿하게 지워진다',
  '먹이를 준 적 없는데 개가 빈 복도를 향해 으르렁거린다', '전화기에서 자신의 목소리로 녹음된 메시지가 흘러나온다',
  '늘 같은 자리에 서 있던 인형이 아침마다 조금씩 가까워져 있다', '시계 초침이 13시 13분에서 멈췄다 다시 가기를 반복한다',
  '천장에서 발소리가 들리는데 위층엔 아무도 살지 않는다', '욕실 배수구에서 머리카락이 매일 한 움큼씩 올라온다',
  '창밖에 서 있는 사람이 비를 맞으면서도 미동조차 없다', '냉장고 안의 음식이 하나씩 사라지는데 문은 안에서 잠긴다',
  '잠들 때마다 누군가 침대 발치에 앉았다 일어선 자국이 남는다', '읽은 적 없는 일기장에 오늘 일이 미리 적혀 있다',
  '아이의 그림에 가족이 한 명 더 그려져 있다', '제사상을 치웠는데 다음 날 다시 정갈하게 차려져 있다',
  '계단의 칸 수가 올라갈 때와 내려갈 때 다르다', '욕조 물에서 흙냄새와 함께 검붉은 거품이 떠오른다',
  '문틈으로 들여다보는 두 눈이 불을 켜면 사라진다', '핸드폰 사진첩에 자신이 자는 모습이 찍혀 있다',
  '벽지 무늬가 매일 사람 얼굴에 조금씩 가까워진다', '한밤중에 텅 빈 거실 TV가 저절로 켜져 잡음만 흘린다',
]

// 분위기(드레드) — 도시에의 정서 키워드. 사건보다 '곧 일어난다'는 예감
const MOODS = [
  '곧 무언가 일어난다는 숨 막히는 예감(드레드)', '익숙한 것이 미세하게 잘못된 두려운 낯섦(언캐니)',
  '누군가 줄곧 지켜보고 있다는 편집증', '아무도 믿어주지 않는 데서 오는 고립감', '도망칠 곳이 없다는 절망',
  '폭풍 직전의 부자연스러운 고요', '등골이 서늘해지는 원초적 공포', '시신을 마주한 듯한 깊은 혐오',
  '광기로 무너져가는 자아의 불안', '잘못된 안도 뒤에 도사린 불길함', '제 몸이 통제되지 않는 무력감',
  '시간이 멈춘 듯한 인지적 현기증', '경건함을 가장한 마을의 섬뜩한 친절', '구원자가 곧 가해자일지 모른다는 의심',
  '한(恨)이 응어리진 음습한 적막', '죽음이 천천히 좁혀오는 카운트다운의 긴장', '끝난 줄 알았는데 아직 끝나지 않은 찝찝함',
  '봉인이 풀리기 직전의 떨림', '오싹하게 텅 빈 공간이 주는 결핍감', '돌이킬 수 없다는 체념 어린 절망',
]

// 위협의 정체(off-screen) — 끝까지 안 보여주거나 일부만. 상상이 묘사보다 무섭다
const THREATS = [
  '발소리와 그림자만 남기고 모습은 끝내 드러내지 않는 무언가', '문틈 사이로 반쯤 보이는, 사람 형상이라기엔 너무 긴 실루엣',
  '7일째 되는 밤 정확히 자정에 찾아온다는 저주받은 존재', '머리카락으로 얼굴을 가린 채 천천히 기어오는 축축한 원혼',
  '이름을 부르면 한 발짝씩 가까워지는, 부르면 안 될 그것', '제물이 채워지지 않으면 마을 전체를 데려간다는 산신',
  '거울 속에서만 다르게 움직이는, 나와 똑같이 생긴 무엇', '숙주의 몸을 안에서부터 갉아 다른 것으로 바꿔놓는 기생체',
  '인간의 언어로는 형용할 수 없어 본 자는 미쳐버리는 존재', '죽은 가족의 얼굴과 목소리를 흉내 내며 문을 두드리는 것',
  '한 사람을 죽이면 다음 목격자에게 옮겨가는 전염되는 저주', '복도 끝에서 가면을 쓴 채 칼을 끌며 다가오는 살인마',
  '천장과 벽을 타고 다니며 인기척이 끊긴 곳에만 나타나는 괴물', '신도들이 ‘재림’을 기다리며 산 채로 봉헌하려는 어떤 신격',
  '잠든 사이 한 명씩 데려가, 깨어보면 인원이 줄어 있게 만드는 것', '폐비디오테이프를 본 자에게만 보이기 시작하는 사다코 같은 형상',
  '집 자체가 적의를 품고 출구를 매번 다른 곳으로 옮긴다', '아이의 모습으로 손을 내밀지만 손이 너무 차가운 무엇',
  '인형 속에 깃들어 밤마다 자리를 옮겨 다니는 존재', '죽은 자들이 한 줄로 서서 산 자의 자리를 기다리는 행렬',
]

// 규칙·금기 — 괴물·저주의 작동 룰. 위반 = 처벌(클라이맥스 복선)
const RULES = [
  '밤 12시부터 새벽 3시 사이엔 절대 거울을 보지 말 것', '이름을 세 번 부르면 안 되고, 부르면 그것이 응답한다',
  '비디오를 본 자는 7일 안에 누군가에게 다시 보여줘야 산다', '뒤에서 부르는 소리가 들려도 절대 돌아보지 말 것',
  '해가 뜨기 전까지 문지방을 넘어 밖으로 나가서는 안 된다', '집 안의 소금 선을 넘어 들어오게 두면 안 된다',
  '제삿날 밤엔 빈 의자 하나를 반드시 비워둘 것', '지하실 문은 어떤 소리가 나도 해뜨기 전엔 열지 말 것',
  '대답 없는 노크엔 절대 ‘누구세요’라고 묻지 말 것', '복도의 13번째 방엔 들어가지도, 들여다보지도 말 것',
  '식사 때 숟가락을 하나 더 놓되 그 자리를 쳐다보지 말 것', '한밤중 우는 소리가 들려도 아이 방을 들여다보지 말 것',
  '거울에 천이 덮여 있으면 절대 걷지 말 것', '“같이 가자”는 말에 절대 “응”이라고 답하지 말 것',
  '향이 다 타기 전엔 누구도 방을 나가서는 안 된다', '그것과 눈이 마주치면 눈을 깜빡이지 말고 천천히 물러설 것',
  '벽에서 노래가 들리면 따라 부르지도, 멈춰 서지도 말 것', '시계가 열세 번 울리면 그 자리에서 숨을 죽일 것',
  '문을 두드린 횟수만큼만 답하고, 한 번이라도 더 답하면 안 된다', '죽은 이의 이름을 산 사람이 먼저 입에 올려서는 안 된다',
]

// 감각 디테일(다중 슬롯) — 호러 오감(청각·시각·체감·후각) 묘사
const DETAILS = [
  '누가 밟지도 않았는데 삐걱이는 마룻바닥', '멀리서 들렸다 끊기는 어린아이의 동요',
  '혀끝에 도는 비릿한 쇠 맛', '깜빡이다 결국 꺼지는 복도 끝 형광등', '목덜미가 곤두서며 누군가 보는 느낌',
  '벽 너머에서 손톱으로 긁는 규칙적인 소리', '코를 찌르는 피비린내와 흙냄새', '천장에서 한 방울씩 떨어지는 검붉은 물',
  '반쯤 열린 문틈에서 새어 나오는 가느다란 숨소리', '발밑에서 부서지는 깨진 유리와 마른 낙엽', '곰팡내와 축축한 지하실 냄새',
  '거울 속에서 0.5초 늦게 따라오는 자신의 움직임', '라디오에서 흘러나오는 사람 목소리 섞인 잡음', '심장이 쿵 내려앉는 갑작스러운 정적',
  '창밖에 잠깐 비쳤다 사라지는 창백한 얼굴', '향(線香)이 타들어가며 번지는 매캐한 단내', '귓가에 바짝 붙어 속삭이는 알아들을 수 없는 말',
  '얼어붙은 손가락 끝의 무감각한 한기', '어둠 속에서 깜빡이지 않는 두 개의 눈', '발소리가 멈춘 뒤에도 한 박자 더 들리는 발소리',
  '문을 두드리는 똑, 똑, 똑 세 번의 노크', '오래된 인형의 유리 눈동자가 도는 미세한 소리', '방 안 공기가 갑자기 차갑고 무거워지는 압박',
  '썩은 내와 향초 냄새가 뒤섞인 역한 공기', '멀리서 짐승이 우는 듯한 길게 끄는 울음', '살갗을 스치는, 바람이라기엔 끈적한 손길',
  '핏자국이 복도를 따라 한 방향으로 끌린 흔적', '낡은 일기장 종이의 눅눅한 곰팡내', '한밤중 텅 빈 집에서 저절로 돌아가는 수도꼭지 소리',
  '뒤통수에 와 닿는 누군가의 식은 입김', '벽시계 초침이 불규칙하게 멈췄다 튀는 소리',
  '잠긴 방 안에서 새어 나오는 낮고 단조로운 자장가', '발끝에 닿는, 바닥을 적신 미지근하고 끈끈한 물기',
]

// 한 번에 뽑을 감각 디테일 개수(고정 4) — 다중 슬롯으로 조합수를 1조 이상으로 키운다.
const DETAIL_COUNT = 4

// ── 유틸 ──────────────────────────────────────────────────────────────
const rid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ── 조사 헬퍼: 앞말 마지막 '한글' 음절의 받침 유무로 조사 하나를 실제로 골라 출력 ──
//   (괄호 이중표기 "을(를)" 절대 노출 금지)
// 문자열 끝의 따옴표·괄호·구두점은 건너뛰고 마지막 한글 음절을 찾는다.
function lastHangul(word: string): string | null {
  for (let i = word.length - 1; i >= 0; i--) {
    const ch = word[i]
    if (ch >= '가' && ch <= '힣') return ch
  }
  return null
}
// 받침 있음 = true. 받침 없음(모음 끝) = false. 한글이 없으면 받침 있는 것으로 간주(보수적).
function hasBatchim(word: string): boolean {
  const ch = lastHangul(word)
  if (ch == null) return true
  return (ch.charCodeAt(0) - 0xac00) % 28 !== 0
}
// 을/를, 이/가, 은/는, 과/와 — 받침 보고 하나만 출력. (으)로는 'ㄹ' 받침 예외 처리.
const josaEul = (w: string) => (hasBatchim(w) ? '을' : '를')
const josaI = (w: string) => (hasBatchim(w) ? '이' : '가')
const josaEun = (w: string) => (hasBatchim(w) ? '은' : '는')
function josaRo(w: string): string {
  const ch = lastHangul(w)
  if (ch == null) return '로'
  const jong = (ch.charCodeAt(0) - 0xac00) % 28
  // 받침 없음(0) 또는 'ㄹ'받침(8) → '로', 그 외 받침 → '으로'
  return jong === 0 || jong === 8 ? '로' : '으로'
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

// nCk 조합수(순서 무관) — 감각 디테일 4개 조합수 계산용
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  return Math.round(r)
}

// 전체 조합수: 장소×기상×하위장르×균열×분위기×위협×규칙×(감각 디테일 4개 조합)
function totalCombos(): number {
  const detailCombos = choose(DETAILS.length, DETAIL_COUNT)
  return PLACES.length * WEATHERS.length * SUBGENRES.length * CRACKS.length * MOODS.length * THREATS.length * RULES.length * detailCombos
}

// ── 슬롯 모델 ──────────────────────────────────────────────────────────
type SlotKey = 'place' | 'weather' | 'subgenre' | 'crack' | 'mood' | 'threat' | 'rule' | 'detail'
interface SlotDef { key: SlotKey; label: string; icon: string }
const SLOTS: SlotDef[] = [
  { key: 'place', label: '현장(고립된 공간)', icon: '🏚️' },
  { key: 'weather', label: '시각·기상', icon: '🌧️' },
  { key: 'subgenre', label: '공포 유형', icon: '👻' },
  { key: 'crack', label: '균열(첫 이상징후)', icon: '🩸' },
  { key: 'mood', label: '분위기(드레드)', icon: '🕯️' },
  { key: 'threat', label: '위협의 정체', icon: '🌑' },
  { key: 'rule', label: '규칙·금기', icon: '🚫' },
  { key: 'detail', label: '감각 디테일(4)', icon: '🌫️' },
]

interface Setting {
  place: string
  weather: string
  subgenre: string
  crack: string
  mood: string
  threat: string
  rule: string
  detail: string[]
}

function buildSetting(): Setting {
  return {
    place: pick(PLACES),
    weather: pick(WEATHERS),
    subgenre: pick(SUBGENRES),
    crack: pick(CRACKS),
    mood: pick(MOODS),
    threat: pick(THREATS),
    rule: pick(RULES),
    detail: pickDetails(),
  }
}

// 배경 묘사 한 단락으로 엮기(공포 현장)
function compose(s: Setting): string {
  const detailText = s.detail.map((d) => `‘${d}’`).join(', ')
  // detailText 는 '’'(닫는 따옴표)로 끝나므로, lastHangul 이 그 앞 한글 음절의 받침을 보고 이/가 선택.
  return (
    `${s.place}. ${s.weather}. ` +
    `처음엔 사소했다 — ${s.crack}. ` +
    `${detailText}${josaI(detailText)} 감각의 가장자리를 갉는다. ` +
    `공기를 채우는 것은 ${s.mood}. ` +
    `이곳엔 지켜야 할 금기가 있다: ${s.rule}. ` +
    `그러나 어둠 속에 도사린 것은 — ${s.threat}. ` +
    `[유형: ${s.subgenre}]`
  )
}

// ── 영속 ──────────────────────────────────────────────────────────────
interface SavedSetting { id: string; setting: Setting; note: string }
interface Persist { setting: Setting | null; locks: Partial<Record<SlotKey, boolean>>; saved: SavedSetting[] }

function isSetting(x: any): x is Setting {
  return x && typeof x.place === 'string' && typeof x.weather === 'string' &&
    typeof x.subgenre === 'string' && typeof x.crack === 'string' &&
    typeof x.mood === 'string' && typeof x.threat === 'string' &&
    typeof x.rule === 'string' && Array.isArray(x.detail)
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

export default function HorrorSettingForge({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<Persist>(load())
  const [setting, setSetting] = useState<Setting | null>(initial.current.setting)
  const [locks, setLocks] = useState<Partial<Record<SlotKey, boolean>>>(initial.current.locks)
  const [saved, setSaved] = useState<SavedSetting[]>(initial.current.saved)
  const [copied, setCopied] = useState(false)
  const [editId, setEditId] = useState('')
  const [editText, setEditText] = useState('')
  const [toast, setToast] = useState('')
  const [rolling, setRolling] = useState(false)
  // 사용자 정의 항목(추가만) — 무작위 생성하지 않고 사용자가 직접 적는다.
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  // 고정 '기타' 자유 입력
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
    // 무작위 생성 시 사용자 정의 항목의 '값'과 '기타'는 비우되 항목(이름)은 유지한다.
    setCustom((prev) => prev.map((c) => ({ ...c, value: '' })))
    setEtc('')
    setSetting((prev) => {
      const fresh = buildSetting()
      if (!prev) return fresh
      const next: Setting = { ...fresh }
      if (locks.place) next.place = prev.place
      if (locks.weather) next.weather = prev.weather
      if (locks.subgenre) next.subgenre = prev.subgenre
      if (locks.crack) next.crack = prev.crack
      if (locks.mood) next.mood = prev.mood
      if (locks.threat) next.threat = prev.threat
      if (locks.rule) next.rule = prev.rule
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

  // ── 사용자 정의 항목 ──
  const addCustom = () => {
    const label = window.prompt('추가할 항목 이름을 입력하세요 (예: 시대 배경, 결말 톤 등)')
    if (label == null) return
    const t = label.trim()
    if (!t) return
    setCustom((prev) => [...prev, { id: rid(), label: t, value: '' }])
  }
  const setCustomValue = (id: string, value: string) =>
    setCustom((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
  const removeCustom = (id: string) => setCustom((prev) => prev.filter((c) => c.id !== id))

  const slotValue = (k: SlotKey): string => {
    if (!setting) return ''
    if (k === 'detail') return setting.detail.join(' · ')
    return setting[k] as string
  }

  const fullText = setting ? compose(setting) : ''
  const lockedCount = SLOTS.filter((sl) => locks[sl.key]).length
  const combos = totalCombos()

  // 복사 텍스트: 조합 글감 + 사용자 정의 항목(값 있는 것만) + 기타(비어있지 않을 때만)
  const copyComposed = (): string => {
    let out = fullText
    const exLines = custom
      .filter((c) => c.label.trim() && c.value.trim())
      .map((c) => `${c.label.trim()}: ${c.value.trim()}`)
    if (exLines.length) out += `\n${exLines.join('\n')}`
    if (etc.trim()) out += `\n기타: ${etc.trim()}`
    return out
  }

  const copyText = () => {
    if (!setting || !navigator.clipboard) { if (!navigator.clipboard) flashToast('이 환경에서는 복사를 지원하지 않습니다.'); return }
    navigator.clipboard.writeText(copyComposed()).then(() => {
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
    flashToast('현장을 즐겨찾기에 저장했어요')
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
  const loadSaved = (s: SavedSetting) => { setSetting(s.setting); setLocks({}); setCopied(false); flashToast('현장을 불러왔어요') }

  // 사용자 정의 항목(값 있는 것만) + 기타(비어있지 않을 때만)를 fields/character 맵에 합칠 추가 항목
  const extraFields = (): Record<string, string> => {
    const ex: Record<string, string> = {}
    custom.forEach((c) => { const v = c.value.trim(); if (c.label.trim() && v) ex[c.label.trim()] = v })
    if (etc.trim()) ex.etc = etc.trim()
    return ex
  }

  // ── 연계: 공유 장소 라이브러리 ──
  const toLibrary = (st: Setting, note?: string) => {
    const sensory = [
      `시각·기상: ${st.weather}`,
      `공포 유형: ${st.subgenre}`,
      `균열(첫 이상징후): ${st.crack}`,
      `위협의 정체: ${st.threat}`,
      `규칙·금기: ${st.rule}`,
      `감각 디테일: ${st.detail.join(' / ')}`,
    ].join('\n')
    addToLibrary('places', {
      name: st.place,
      kind: '호러 현장',
      mood: st.mood,
      rules: st.rule,
      sensory,
      notes: note || compose(st),
      source: '호러 배경·현장 생성기',
      // 정규(표준) 장소 키로 1:1 매핑한 fields — 받는 허브가 기본 칸에 정확히 채우도록 추가
      fields: {
        name: st.place,
        kind: '호러 현장',
        atmosphere: st.mood,
        sensory: st.detail.join(' / '),
        climate: st.weather,
        rules: st.rule,
        dangers: st.threat,
        secrets: st.crack,
        notes: note ? `${note}\n공포 유형: ${st.subgenre}` : `공포 유형: ${st.subgenre}`,
        ...extraFields(),
      },
    })
    flashToast(`현장 ‘${st.place.slice(0, 16)}…’을 공유 라이브러리에 추가했어요`)
  }

  // ── 연계: 글감 스니펫 ──
  const toSnippet = (st: Setting) => {
    addToLibrary('snippets', {
      text: compose(st),
      source: '호러 배경·현장 생성기',
      tags: ['호러·공포', '배경', '현장', '글감'],
    })
    flashToast('공포 현장 글감을 스니펫으로 저장했어요')
  }

  // ── 연계: 프로젝트(설정 카드, 자료 › 장소) ──
  const linked = hasProjectBridge()
  const toProject = (st: Setting, note?: string) => {
    if (!linked) { flashToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = [
      `<p><b>🏚️ 현장(고립된 공간):</b> ${esc(st.place)}</p>`,
      `<p><b>🌧️ 시각·기상:</b> ${esc(st.weather)}</p>`,
      `<p><b>👻 공포 유형:</b> ${esc(st.subgenre)}</p>`,
      `<p><b>🩸 균열(첫 이상징후):</b> ${esc(st.crack)}</p>`,
      `<p><b>🕯️ 분위기(드레드):</b> ${esc(st.mood)}</p>`,
      `<p><b>🚫 규칙·금기:</b> ${esc(st.rule)}</p>`,
      `<p><b>🌑 위협의 정체:</b> ${esc(st.threat)}</p>`,
      `<p><b>🌫️ 감각 디테일:</b></p><ul>${st.detail.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>`,
      note ? `<hr/><p><b>메모:</b> ${esc(note)}</p>` : '',
      `<hr/><p style="line-height:1.7;">${esc(compose(st))}</p>`,
    ].filter(Boolean).join('')
    // 정규(표준) 장소 키로 1:1 매핑 — 받는 허브(배경 설정집)가 기본 칸에 정확히 채우도록 캐릭터 맵을 정규 키 우선으로 구성.
    // 기존 키는 호환을 위해 유지(추가/리네임만, 삭제 없음).
    const character: Record<string, string> = {
      name: st.place,                       // 정규: name
      kind: '호러 현장',                     // 정규: kind (장소 종류/유형)
      atmosphere: st.mood,                  // 정규: atmosphere (분위기)
      sensory: st.detail.join(' / '),       // 정규: sensory (오감/감각)
      climate: st.weather,                  // 정규: climate (기상)
      rules: st.rule,                       // 정규: rules (규칙·금기)
      dangers: st.threat,                   // 정규: dangers (위협의 정체)
      secrets: st.crack,                    // 정규: secrets (첫 이상징후)
      notes: `공포 유형: ${st.subgenre}`,    // 정규: notes (하위장르 맥락)
      // ── 기존(비정규) 키 유지: 하위 호환 ──
      type: '호러 현장',
      mood: st.mood,
      weather: st.weather,
      subgenre: st.subgenre,
      crack: st.crack,
      threat: st.threat,
    }
    if (note) character.notes = `${note}\n공포 유형: ${st.subgenre}`
    Object.assign(character, extraFields())
    const id = addToProject({
      kind: 'setting',
      root: 'research',
      folder: '장소',
      title: `공포 현장 · ${st.place.slice(0, 18)}`,
      icon: '🏚️',
      bodyHtml,
      character,
      meta: { 유형: '호러 현장', 공포유형: st.subgenre, 분위기: st.mood, 출처: '호러 배경·현장 생성기' },
    })
    flashToast(id ? '공포 현장을 프로젝트(자료 › 장소)에 추가했어요' : '프로젝트에 추가하지 못했습니다.')
  }

  // payload.genre 맥락 배지
  const ctxGenre = payload && typeof (payload as any).genre === 'string' ? String((payload as any).genre).trim() : ''

  // 관련 도구
  const RELATED: { id: string; icon: string; label: string }[] = [
    { id: 'setting-bible', icon: '🗺️', label: '배경 설정집' },
    { id: 'sensory-palette', icon: '🎨', label: '감각 팔레트' },
    { id: 'scene-forge', icon: '🎬', label: '장면 생성기' },
    { id: 'scene-list', icon: '📋', label: '장면 목록' },
    { id: 'moodboard-grid', icon: '🖼️', label: '무드보드' },
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
        <b>고립된 현장·기상·공포 유형·첫 이상징후·분위기·위협·금기·감각 디테일</b>을 무작위로 엮어
        하나의 <b>공포 무대(현장)</b>를 만듭니다. 마음에 드는 칸은 <Emoji e="🔒"/>로 잠그고 나머지만 다시 굴리세요.
      </div>

      {ctxGenre && (
        <div style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 9px' }}>
          <Emoji e="🧭"/> 맥락: {emojify(ctxGenre)}
        </div>
      )}

      {/* 생성 도구바 + 조합수 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={generate}><Emoji e="🎲"/> {lockedCount ? '나머지 다시 생성' : '공포 현장 생성'}</button>
        {lockedCount > 0 && <span style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="🔒"/> {lockedCount}개 잠금</span>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>
          약 <b style={{ color: 'var(--accent)' }}>{combos.toLocaleString('ko-KR')}</b>가지 조합
        </span>
      </div>

      {toast && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--ok)', color: 'var(--ok)', borderRadius: 8, padding: '7px 10px', fontSize: 12 }}>
          <Emoji e="✅"/> {emojify(toast)}
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
                <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0 }}><Emoji e={sl.icon}/></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{sl.label}</div>
                  {sl.key === 'detail' && setting && setting.detail.length ? (
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.45, color: dim ? 'var(--muted)' : 'var(--text)' }}>
                      {setting.detail.map((d, i) => <li key={i}>{dim ? '…' : emojify(d)}</li>)}
                    </ul>
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, overflowWrap: 'anywhere', color: val ? (dim ? 'var(--muted)' : 'var(--text)') : 'var(--muted)' }}>
                      {val ? (dim ? '…' : emojify(val)) : '— 생성해 주세요 —'}
                    </div>
                  )}
                </div>
                <button
                  className="minibtn"
                  onClick={() => toggleLock(sl.key)}
                  title={isLocked ? '잠금 해제' : '이 칸 잠그기'}
                  style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}
                >{isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
              </div>
            )
          })}
        </div>

        {/* 사용자 정의 항목 + 기타(자유 입력) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ ...secTitle }}>
            <span><Emoji e="➕"/> 사용자 정의 항목</span>
            <button className="minibtn" onClick={addCustom} title="직접 항목을 추가합니다(내용은 자유 입력)">＋ 항목 추가</button>
          </div>
          {custom.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {custom.map((c) => (
                <div key={c.id} style={{ ...slotCard, alignItems: 'center', padding: '7px 10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>{emojify(c.label)}</div>
                    <input
                      value={c.value}
                      onChange={(e) => setCustomValue(c.id, e.target.value)}
                      placeholder="직접 입력하세요"
                      style={noteInput}
                    />
                  </div>
                  <button className="minibtn" onClick={() => removeCustom(c.id)} title="이 항목 삭제" style={{ flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ ...slotCard, flexDirection: 'column', alignItems: 'stretch', gap: 5 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="📝"/> 기타 (자유롭게 메모)</div>
            <textarea
              value={etc}
              onChange={(e) => setEtc(e.target.value)}
              placeholder="여기에 자유롭게 적으세요 — 추가 설정·아이디어·메모 등"
              rows={4}
              style={{ ...noteInput, resize: 'vertical', minHeight: 76, lineHeight: 1.55 }}
            />
          </div>
        </div>

        {/* 조합 글감 */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🏚️"/> 공포 현장 묘사 글감</div>
          <div style={{ fontSize: 14, lineHeight: 1.7, color: setting ? 'var(--text)' : 'var(--muted)' }}>
            {fullText || '〈공포 현장 생성〉을 눌러 무대를 만들어 보세요.'}
          </div>
        </div>

        {/* 산출물 도구바 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="minibtn" onClick={copyText} disabled={!setting}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 글쓰기에 활용</>}</button>
          <button className="minibtn" onClick={saveSetting} disabled={!setting}>☆ 즐겨찾기</button>
          <button className="linkbtn" onClick={() => setting && toLibrary(setting)} disabled={!setting} title="이 현장을 공유 장소 라이브러리에 추가"><Emoji e="📥"/> 장소 라이브러리</button>
          <button className="linkbtn" onClick={() => setting && toSnippet(setting)} disabled={!setting} title="이 현장 글감을 스니펫으로 저장"><Emoji e="📝"/> 스니펫 저장</button>
          <button
            className="linkbtn"
            onClick={() => setting && toProject(setting)}
            disabled={!setting || !linked}
            title={linked ? '이 현장을 프로젝트 설정(자료 › 장소 폴더)에 추가' : '프로젝트에 연결되어 있지 않습니다'}
          ><Emoji e="📄"/> 프로젝트에 추가</button>
        </div>

        {/* 즐겨찾기 */}
        <div>
          <div style={{ ...secTitle, marginBottom: 6 }}>
            <span><Emoji e="⭐"/> 저장한 현장 {saved.length ? `(${saved.length})` : ''}</span>
          </div>
          {!saved.length ? (
            <div style={{ color: 'var(--muted)', fontSize: 12, padding: '8px 2px' }}>아직 저장한 현장이 없습니다. ☆로 마음에 드는 무대를 모아보세요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {saved.map((s) => (
                <div key={s.id} style={savedRow}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}><Emoji e="🏚️"/> {emojify(s.setting.place)}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}><Emoji e="👻"/> {emojify(s.setting.subgenre)}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>{compose(s.setting)}</div>
                  {editId === s.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditId(''); setEditText('') } }}
                        placeholder="메모 (등장 장면·페이싱·복선 등)"
                        style={noteInput}
                      />
                      <button className="minibtn" onClick={commitEdit}>저장</button>
                      <button className="minibtn" onClick={() => { setEditId(''); setEditText('') }}>취소</button>
                    </div>
                  ) : (
                    <>
                      {s.note && <div style={{ fontSize: 11.5, color: 'var(--accent)' }}><Emoji e="📝"/> {emojify(s.note)}</div>}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="minibtn" onClick={() => loadSaved(s)} title="이 현장을 위에 불러오기">↩ 불러오기</button>
                        <button className="linkbtn" onClick={() => toLibrary(s.setting, s.note || undefined)} title="공유 장소 라이브러리에 추가"><Emoji e="📥"/> 장소</button>
                        <button className="linkbtn" onClick={() => toSnippet(s.setting)} title="스니펫으로 저장"><Emoji e="📝"/> 스니펫</button>
                        <button className="linkbtn" onClick={() => toProject(s.setting, s.note || undefined)} disabled={!linked} title={linked ? '프로젝트(자료 › 장소)로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트</button>
                        <button className="minibtn" onClick={() => startEdit(s)} title="메모 편집"><Emoji e="✏️"/></button>
                        <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제"><Emoji e="🗑️"/></button>
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
          <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: ctxGenre || '호러·공포' })} title={`${r.label} 열기`}>
            <Emoji e={r.icon}/> {r.label}
          </button>
        ))}
      </div>

      <div className="license-note" style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'right' }}>
        로컬 자작 데이터 · 외부 네트워크 없음 · 생성 현장은 출발점일 뿐 자유롭게 비틀어 보세요
      </div>
    </div>
  )
}
