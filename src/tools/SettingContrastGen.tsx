// 배경 대비 생성기(조합형) — 한 공간(장소)에 상반된 두 분위기(축의 양극)를 동시에 심어,
//   '평면적 배경'이 아니라 긴장이 흐르는 '입체적 배경'을 만든다.
//   원리: 좋은 배경은 단일 인상이 아니라 모순을 품는다. 안전해 보이지만 위협이 깔려 있고,
//         화려하지만 공허하다. 두 극(極)을 한 공간에 겹쳐 '불편한 깊이'를 만든다.
// 슬롯: 공간(무대) × 대비 축(양극 쌍) × 표면 인상(겉) × 이면 균열(속) × 감각 디테일 × 대비 장치(겹치는 방법).
//   대비 축을 고르면 표면/이면 풀이 그 축의 양극으로 갈리고, 한쪽씩 뽑아 모순을 짝짓는다.
// 자급식: 외부 네트워크·라이브러리·미디어 없음. react + './linkbus' + Math.random + localStorage 만.
// 연계(linkbus): 생성물을 수집함·스니펫 라이브러리에 담고, 프로젝트 자료에 'setting' 카드로 추가,
//   설정 바이블(setting-bible)로 이어 열 수 있다.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, addToStash, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'setting-contrast-gen', name: '배경 대비 생성기', icon: '🌗', group: '영감·발상', intro: '한 공간에 상반된 분위기를 겹쳐 입체적 배경을 만드세요', w: 580, h: 700 }

const LS = 'sry:tool:setting-contrast-gen'

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const fmt = (n: number) => n.toLocaleString('ko-KR')

// ---------- 한국어 조사 헬퍼 ----------
// 앞 글자의 받침 유무를 보고 실제 조사 하나를 골라 붙인다. "을(를)" 같은 이중표기를 출력에 절대 노출하지 않는다.
const hasJongseong = (word: string): boolean => {
  if (!word) return false
  const ch = word[word.length - 1]
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false // 한글 음절이 아니면 받침 없음으로 간주
  return (code - 0xac00) % 28 !== 0
}
// 'ㄹ' 받침 여부(으로/로 판단용 — ㄹ 받침은 '로'를 쓴다).
const endsWithRieul = (word: string): boolean => {
  if (!word) return false
  const ch = word[word.length - 1]
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false
  return (code - 0xac00) % 28 === 8 // 8 = 종성 'ㄹ'
}
const josaEunNeun = (w: string): string => w + (hasJongseong(w) ? '은' : '는')
const josaIGa = (w: string): string => w + (hasJongseong(w) ? '이' : '가')
const josaEulReul = (w: string): string => w + (hasJongseong(w) ? '을' : '를')
const josaEuroRo = (w: string): string => w + (hasJongseong(w) && !endsWithRieul(w) ? '으로' : '로')

// ---------- 공간(무대) 풀 ----------
// 구체적이고 장면을 떠올리기 쉬운 무대. 어떤 대비 축과도 겹칠 수 있도록 중립적으로 고른다.
const SPACES = [
  '겉보기엔 단란한 저택의 응접실', '문 닫기 직전의 한적한 카페', '한낮의 텅 빈 놀이공원',
  '오래된 종합병원의 입원 병동', '폭설에 고립된 산장', '손님 없는 고급 레스토랑',
  '폐장을 앞둔 백화점', '학기 말의 텅 빈 기숙사', '명절 끝 무렵의 시골 본가',
  '리모델링 중인 미술관', '새벽의 24시 편의점', '관람객 없는 수족관',
  '입주가 끝나가는 신축 아파트 단지', '비수기의 해변 리조트', '폐선 직전의 막차 열차 칸',
  '문상객이 빠져나간 장례식장', '개장 전 이른 아침의 동물원', '낡은 등대지기의 숙소',
  '재개발 고시가 붙은 골목 상가', '눈 그친 새벽의 고속도로 휴게소',
  '결혼식이 끝난 뒤의 연회장', '한밤의 24시간 무인 빨래방', '관객이 다 떠난 극장 객석',
  '성수기가 지난 온천 여관', '문 닫은 학원이 즐비한 상가 건물', '관리인이 없는 도심 옥상정원',
  '리허설만 끝낸 공연장 무대 뒤', '버려지다시피 한 시골 간이역', '입원실 가득한 요양원의 휴게실',
  '한겨울 문을 연 야외 수영장', '경매를 앞둔 골동품 창고', '철거 직전의 오래된 목욕탕',
  '연말 마지막 영업일의 은행 객장', '주말 오후의 텅 빈 사무실', '인적 끊긴 심야의 지하상가',
  '시즌 오프 직전의 스키 리조트 로비', '예약이 끊긴 산속 펜션', '관객을 받지 않는 사설 천문대',
  '문 닫은 시장 골목의 오래된 한약방', '입학식이 끝난 뒤의 빈 강의동', '손님 끊긴 변두리 사진관',
  '폐허가 된 옛 방직 공장의 사무동', '관리가 멈춘 도심 실내 식물원', '운항을 멈춘 항구의 여객 터미널',
  '철수 직전의 산골 분교 교실', '비워진 회사 사택 단지의 관리실', '경기가 끝난 새벽의 야구장 관중석',
]

// ---------- 대비 축(양극 쌍) ----------
// 각 축은 'A 인상'과 'B 인상'의 풀을 가진다. 보통 A=겉(표면), B=속(이면)으로 짝지어 모순을 만든다.
interface ContrastAxis {
  key: string
  label: string            // 예: '안전 ↔ 위협'
  icon: string
  poleA: string            // 표면(겉)으로 자주 쓰일 극의 이름
  poleB: string            // 이면(속)으로 자주 쓰일 극의 이름
  surface: string[]        // A극(겉) 표면 인상 풀
  fracture: string[]       // B극(속) 이면 균열 풀
  desc: string
}
const AXES: ContrastAxis[] = [
  {
    key: 'safe-threat', label: '안전 ↔ 위협', icon: '🛡️', poleA: '안전', poleB: '위협',
    desc: '아늑하고 보호받는 듯한 표면 아래로 위험·악의의 기척이 스며든다.',
    surface: [
      '두툼한 커튼과 따뜻한 조명이 바깥을 완전히 차단해 더없이 안락하다',
      '잘 정돈된 가구와 은은한 향이 어떤 위험도 없을 듯 평온하다',
      '두꺼운 벽과 단단한 문이 모든 소음을 막아 고요하기만 하다',
      '훈훈한 난로와 푹신한 소파가 손님을 마냥 환대하는 듯하다',
      '햇살이 가득 들어 먼지 한 톨까지 다정하게 비추는 듯하다',
      '익숙한 살림살이가 제자리에 놓여 더없이 친숙하고 안전해 보인다',
      '문턱마다 두꺼운 깔개가 깔려 발소리조차 포근하게 잦아든다',
    ],
    fracture: [
      '그러나 모든 문이 안에서 잠기지 않고 바깥에서만 잠긴다는 걸 뒤늦게 깨닫는다',
      '아늑한 깔개를 들추자, 그 밑에 누군가 끌려간 듯 길게 긁힌 자국이 드러난다',
      '한구석의 의자 다리가 바닥을 긁은 자국이, 누군가 자주 끌어다 앉았음을 말한다',
      '벽에 걸린 가족사진 속 한 사람만 얼굴이 긁혀 지워져 있다',
      '따뜻한 공기 속에 미세하게 비릿한 냄새가 섞여 코끝을 거스른다',
      '평온한 적막을 깨고, 벽 너머에서 규칙적인 발소리가 멈췄다 다시 들린다',
      '창밖이 아니라 천장 쪽에서 누군가 내려다보는 듯한 시선이 느껴진다',
    ],
  },
  {
    key: 'lavish-empty', label: '화려 ↔ 공허', icon: '💎', poleA: '화려', poleB: '공허',
    desc: '눈부신 호화로움이 오히려 텅 빈 적막과 결핍을 도드라지게 한다.',
    surface: [
      '샹들리에와 금박 장식이 천장까지 화려하게 빛난다',
      '값비싼 그림과 골동품이 벽마다 빈틈없이 걸려 있다',
      '대리석 바닥이 거울처럼 반들거리며 불빛을 되쏜다',
      '진수성찬이 식지 않게 정성껏 차려져 김을 올린다',
      '비단 휘장과 자수 방석이 손길마다 사치를 자랑한다',
      '값을 매길 수 없는 장식품들이 진열장마다 빼곡하다',
      '천장까지 닿는 금장 거울이 공간을 두 배로 넓혀 보이게 한다',
    ],
    fracture: [
      '그러나 그 넓은 공간을 채우는 사람은 단 한 명도 없다',
      '두 배로 넓어 보이던 거울 속에는, 정작 비칠 사람이 아무도 없다',
      '차려진 음식에 손댄 흔적이 전혀 없어, 오래 식어 굳어 간다',
      '화려한 액자들 사이, 가장 잘 보이는 자리만 비어 못 자국만 남았다',
      '메아리가 길게 울려, 이 모든 사치가 얼마나 텅 비었는지 드러낸다',
      '먼지 한 톨 없이 닦인 의자들이, 누구도 앉지 않은 채 정렬돼 있다',
      '값비싼 시계는 멈춰 있고, 아무도 그것을 고칠 생각이 없어 보인다',
    ],
  },
  {
    key: 'lively-decay', label: '생기 ↔ 쇠락', icon: '🌱', poleA: '생기', poleB: '쇠락',
    desc: '활기 도는 표면 아래로 부패·소멸이 천천히 진행된다.',
    surface: [
      '화분마다 잎이 무성하고 물기를 머금어 싱싱하다',
      '갓 칠한 페인트 냄새와 환한 색이 새 출발처럼 들뜬다',
      '음악과 웃음소리가 흘러 공간 전체가 들썩이는 듯하다',
      '창마다 햇볕이 들어 먼지조차 반짝이며 떠다닌다',
      '갓 구운 빵 냄새가 번져 입에 군침이 돌게 한다',
      '아이들 그림과 알록달록한 장식이 벽을 가득 메운다',
      '새로 들인 화초와 깨끗한 화분이 줄지어 봄을 옮겨 온 듯하다',
    ],
    fracture: [
      '그러나 가까이 보면 무성한 잎 아래 줄기는 이미 검게 썩어 있다',
      '줄지어 선 새 화분들 밑동에만, 까닭 모를 날벌레가 들끓는다',
      '갓 칠한 페인트가 가린 자리에서 곰팡이 냄새가 새어 나온다',
      '웃음소리는 어딘가 녹음된 듯 똑같은 박자로 되풀이된다',
      '햇볕이 비추는 바닥 한 귀퉁이만 물러 푹 꺼져 있다',
      '빵 냄새 너머로, 오래 방치된 무언가의 단내가 깔려 있다',
      '벽의 그림들은 모두 빛이 바래, 몇 해째 새것이 더해지지 않았다',
    ],
  },
  {
    key: 'order-collapse', label: '질서 ↔ 붕괴', icon: '📐', poleA: '질서', poleB: '붕괴',
    desc: '완벽한 정돈 아래로 통제 불능의 균열이 번진다.',
    surface: [
      '모든 물건이 각을 맞춰 정렬돼 흐트러짐 하나 없다',
      '일과표와 규칙이 벽마다 붙어 빈틈없이 작동하는 듯하다',
      '바닥 타일과 가구 배치가 자로 잰 듯 대칭을 이룬다',
      '먼지 하나 없이 닦인 표면이 강박적으로 반들거린다',
      '서류와 물품이 색·번호 순으로 완벽하게 분류돼 있다',
      '시계마다 초까지 맞춰져 일제히 같은 시각을 가리킨다',
      '의자 간격까지 줄자로 잰 듯, 한 치의 오차도 허락하지 않는다',
    ],
    fracture: [
      '그러나 벽 한구석에 난 가는 금이, 천장까지 소리 없이 뻗어 있다',
      '완벽히 맞춰진 의자 간격이, 누가 다녀갈 때마다 한 칸씩 좁아져 있다',
      '완벽히 정렬된 줄 끝 하나가, 매일 조금씩 어긋나 간다',
      '규칙을 적은 종이의 잉크가 번져, 마지막 항목만 읽을 수 없다',
      '대칭의 한가운데, 누군가 일부러 비틀어 놓은 의자 하나가 있다',
      '닦인 바닥 위로, 지울 수 없는 발자국 하나가 매번 같은 자리에 남는다',
      '모든 시계가 멈출 듯 흔들리며, 한 대만 거꾸로 돌기 시작한다',
    ],
  },
  {
    key: 'warm-cold', label: '온기 ↔ 냉기', icon: '🔥', poleA: '온기', poleB: '냉기',
    desc: '따뜻한 환대의 표면과, 정서적으로 얼어붙은 냉기가 공존한다.',
    surface: [
      '난로가 활활 타올라 방 안 가득 온기가 돈다',
      '담요와 따뜻한 차가 손님마다 살뜰히 건네진다',
      '벽난로 불빛이 모두의 얼굴을 부드럽게 물들인다',
      '김이 오르는 음식과 다정한 인사가 끊이지 않는다',
      '두툼한 양탄자와 포근한 조명이 발끝까지 데운다',
      '오래된 가족의 손때 묻은 물건들이 정겹게 놓여 있다',
      '뜨끈한 아랫목과 갓 지은 밥 냄새가 온 집안을 데운다',
    ],
    fracture: [
      '그러나 누구의 눈도 마주치지 않고, 말끝마다 묘하게 데인다',
      '갓 지은 밥은 한 그릇도 줄지 않고, 모두 식을 때까지 수저를 들지 않는다',
      '따뜻한 차를 건네는 손끝은 차갑고, 미소는 입가에서만 멈춘다',
      '벽난로 불빛 아래서도 모두의 어깨엔 한기가 서려 있다',
      '다정한 인사 사이로, 누구도 진짜 이름을 부르지 않는다',
      '온기 도는 방 한가운데, 단 한 자리만 차갑게 비어 있다',
      '난로는 타는데, 유리창 안쪽으로 성에가 거꾸로 끼어 간다',
    ],
  },
  {
    key: 'holy-defile', label: '신성 ↔ 불경', icon: '⛪', poleA: '신성', poleB: '불경',
    desc: '경건하고 성스러운 표면 아래로 모독·타락의 흔적이 깔린다.',
    surface: [
      '향과 촛불이 은은하게 번져 절로 고개를 숙이게 한다',
      '스테인드글라스를 통과한 빛이 바닥에 성스러운 무늬를 그린다',
      '낮은 성가와 기도 소리가 공간을 경건하게 채운다',
      '오래된 제단과 성물이 한 점 흐트러짐 없이 모셔져 있다',
      '높은 천장과 긴 회랑이 발소리마저 숙연하게 만든다',
      '하얀 제의와 정갈한 백합이 순결한 인상을 드리운다',
      '맑은 종소리가 일정한 간격으로 울려 마음을 가라앉힌다',
    ],
    fracture: [
      '그러나 제단 뒤편 벽에, 누군가 손톱으로 새긴 저주의 글자가 있다',
      '맑던 종소리가 한 번씩, 음이 어긋난 둔탁한 소리로 잘못 울린다',
      '성스러운 빛이 닿지 않는 구석에서, 향과 다른 비릿한 냄새가 새어 나온다',
      '기도 소리에 섞여, 가사가 거꾸로 뒤집힌 한 구절이 스쳐 간다',
      '성물 하나가 미세하게 거꾸로 놓여, 아무도 바로잡지 않는다',
      '백합의 줄기 끝이 검게 짓물러, 정갈함 아래 부패를 감춘다',
      '회랑 끝 문 너머에서, 경건함과 어울리지 않는 웃음이 새어 든다',
    ],
  },
  {
    key: 'free-trap', label: '자유 ↔ 구속', icon: '🕊️', poleA: '자유', poleB: '구속',
    desc: '드넓고 열린 듯한 표면이 실은 빠져나갈 수 없는 덫임이 드러난다.',
    surface: [
      '사방이 탁 트여 어디로든 갈 수 있을 듯 광활하다',
      '문도 벽도 없이 열린 구조가 거리낌 없는 자유를 약속한다',
      '창밖으로 끝없는 지평선이 펼쳐져 가슴이 트인다',
      '아무런 규칙도, 감시도 없는 듯 누구나 마음껏 머문다',
      '드나드는 길이 여럿이라 갇힐 일이 없어 보인다',
      '바람이 자유로이 통해 어떤 답답함도 느껴지지 않는다',
      '머무는 시간도 떠날 때도 마음대로라며, 아무도 시간을 묻지 않는다',
    ],
    fracture: [
      '그러나 어느 길로 나가도 결국 같은 자리로 되돌아오게 된다',
      '시간을 묻지 않는다던 이곳에서, 떠나겠다는 말만 꺼내면 모두 입을 다문다',
      '활짝 열린 문틀에는, 보이지 않는 선이 그어져 발이 떨어지지 않는다',
      '끝없어 보이던 지평선이, 실은 정교하게 그려진 벽임을 알아챈다',
      '감시는 없다지만, 모든 행동이 어딘가에 기록되고 있음을 직감한다',
      '드나드는 길마다 끝에서 똑같은 안내판이 반복돼 출구가 없다',
      '통하던 바람이 어느 순간 멎고, 공간 전체가 서서히 좁아져 온다',
    ],
  },
  {
    key: 'familiar-strange', label: '친숙 ↔ 낯섦', icon: '🪞', poleA: '친숙', poleB: '낯섦',
    desc: '익숙하기 그지없는 공간에 미세한 어긋남이 끼어들어 불안을 깨운다.',
    surface: [
      '어릴 적부터 드나든 듯 모든 것이 손에 익고 편안하다',
      '늘 그 자리에 있던 가구와 물건이 어김없이 제자리다',
      '익숙한 벽지 무늬와 낡은 손잡이가 옛 기억을 부른다',
      '몸이 먼저 길을 아는 듯, 눈 감고도 돌아다닐 수 있다',
      '가족의 목소리와 생활 소음이 평소처럼 흘러나온다',
      '오래 써 온 식기와 가구가 정겹게 자리를 지킨다',
      '늘 걸려 있던 달력과 가족의 메모가 어김없이 그 자리에 붙어 있다',
    ],
    fracture: [
      '그러나 익숙한 복도가 어제보다 한 걸음 더 길어진 듯하다',
      '벽에 붙은 달력은 익숙한데, 적힌 연도가 한 해 뒤거나 한 해 앞이다',
      '늘 왼쪽이던 문이 오늘은 오른쪽에 있는데, 아무도 이상해하지 않는다',
      '벽지 무늬 한 칸이, 들여다볼수록 미묘하게 다르게 반복된다',
      '눈 감고 돌던 길 한가운데, 전에 없던 문 하나가 닫혀 있다',
      '가족의 목소리는 들리는데, 정작 부른 이름이 내 것이 아니다',
      '늘 쓰던 식기 하나만, 어딘가 낯선 글자가 새겨져 돌아와 있다',
    ],
  },
  {
    key: 'bright-shadow', label: '밝음 ↔ 그늘', icon: '🌓', poleA: '밝음', poleB: '그늘',
    desc: '환한 빛이 가득할수록, 그 빛이 닿지 못하는 그늘이 또렷해진다.',
    surface: [
      '천장 가득 조명이 켜져 그림자 하나 없이 환하다',
      '하얀 벽과 밝은 바닥이 빛을 사방으로 반사한다',
      '큰 창으로 한낮의 빛이 쏟아져 눈이 부실 정도다',
      '구석구석까지 불을 밝혀 어둠이 들어설 틈이 없다',
      '거울과 유리가 빛을 거듭 되쏘아 공간을 키운다',
      '환한 빛 속에 먼지마저 보석처럼 반짝이며 떠다닌다',
      '어느 시각에 와도 똑같은 밝기를 유지해, 밤낮의 경계가 사라진다',
    ],
    fracture: [
      '그러나 그 환함 속에서, 단 한 곳만 빛이 닿지 않아 검게 고여 있다',
      '밤낮 없이 같은 밝기인 탓에, 사람들은 자신이 며칠을 머물렀는지 세지 못한다',
      '모든 그림자가 사라졌는데, 한 사람의 그림자만 길게 남아 있다',
      '쏟아지는 빛 아래, 누구도 보지 않으려는 어두운 문 하나가 있다',
      '불을 밝힐수록, 그 환함이 무언가를 비추지 않으려는 노력처럼 보인다',
      '거울이 되쏜 빛 사이, 실제로는 없는 그림자가 어른거린다',
      '빛이 가장 밝은 자리 바로 아래, 바닥이 까맣게 그을려 있다',
    ],
  },
]

// ---------- 감각 디테일(공용) ----------
// 두 극을 잇는 '한 줄 감각'. 모순을 코끝·귀끝에서 체감하게 만든다.
const SENSES = [
  '코끝을 스치는 두 냄새 — 다정한 향과, 그 밑에 깔린 비릿함이 번갈아 든다',
  '소리 하나 — 정적 속에서 규칙적으로 무언가가 똑, 똑 떨어진다',
  '온도의 어긋남 — 손끝은 따뜻한데 등줄기로만 한기가 타고 오른다',
  '빛의 결 — 한쪽은 노랗게 데워졌는데, 반대쪽은 푸르게 식어 있다',
  '발밑의 감촉 — 푹신한 양탄자 아래로 단단하고 차가운 무언가가 만져진다',
  '귀에 남는 잔향 — 말소리가 끊긴 뒤에도, 같은 음높이의 울림이 길게 맴돈다',
  '공기의 무게 — 숨 쉬기 편한데도, 가슴 한가운데가 눌리듯 답답하다',
  '시야의 끝 — 정면은 또렷한데, 시야 가장자리에서만 무언가가 흐른다',
  '맛의 뒤끝 — 달고 따뜻한데, 삼킨 뒤 혀끝에 쇠 맛이 살짝 남는다',
  '손에 닿는 먼지 — 깨끗해 보이던 표면을 쓸면, 검은 가루가 손끝에 묻어난다',
  '바람의 방향 — 창은 닫혀 있는데, 어디선가 머리카락만 살짝 흔들린다',
  '그림자의 길이 — 빛은 한 방향인데, 그림자들이 제각각 다른 쪽으로 누워 있다',
  '습기의 결 — 공기는 보송한데, 벽을 짚으면 손바닥에만 축축함이 옮아 온다',
  '소리의 거리 — 분명 가까이서 난 소리인데, 메아리는 아주 먼 곳에서 돌아온다',
  '냄새의 시차 — 들어설 땐 없던 향이, 돌아 나오는 길에야 짙게 코를 찌른다',
  '촉감의 배신 — 매끈해 보이던 표면이, 손끝에 닿는 순간 거칠게 끌어당긴다',
  '빛의 떨림 — 흔들릴 것 없는 실내인데, 조명만 일정한 간격으로 미세하게 깜빡인다',
  '맛의 잔상 — 입에 넣은 것이 없는데도, 혀끝에 단맛과 쓴맛이 번갈아 맴돈다',
]

// ---------- 대비 장치(겹치는 방법) ----------
// 표면과 이면을 '어떻게 한 공간에 공존시킬지'에 대한 연출 지침.
const DEVICES = [
  '시점 인물은 표면만 보고 안심하지만, 독자는 이면의 단서를 먼저 알아채도록 배치한다',
  '한 인물에겐 이곳이 천국, 다른 인물에겐 지옥이 되도록 같은 공간을 다르게 묘사한다',
  '장면 초반엔 표면 인상만 길게 깔고, 마지막 한 줄에서 이면을 들춰 분위기를 뒤집는다',
  '표면 묘사 사이사이에 이면 단서를 한 문장씩 끼워, 읽을수록 불안이 누적되게 한다',
  '같은 공간을 두 번 다시 찾게 해, 처음의 표면과 두 번째의 이면을 대비시킨다',
  '시간대(낮↔밤)나 계절을 바꿔, 표면이 이면으로 서서히 미끄러지는 변화를 보여준다',
  '한 사물(거울·시계·문 등)을 표면과 이면이 만나는 접점으로 삼아 거듭 클로즈업한다',
  '인물의 대사는 표면을, 행동·습관은 이면을 드러내도록 어긋나게 쓴다',
  '이면을 끝내 설명하지 않고 암시로만 남겨, 독자 스스로 불편함을 완성하게 한다',
  '표면의 아름다움을 정점까지 끌어올린 직후 이면을 터뜨려, 낙차를 최대로 만든다',
  '공간을 처음 소개하는 인물의 자랑과, 그가 애써 피해 가는 화제를 나란히 보여 이면을 암시한다',
  '표면은 시각으로, 이면은 청각·후각으로만 흘려, 보이는 것과 느껴지는 것을 어긋나게 한다',
  '같은 공간을 두 인물의 시선으로 번갈아 묘사해, 한쪽이 못 본 이면을 다른 쪽이 보게 한다',
  '표면의 질서가 무너지는 작은 사고 하나를 장면 중간에 끼워, 이면이 새어 나올 틈을 낸다',
]

// ---------- 시간대·기상 정합성 태그 ----------
// 모순(한밤중+햇빛, 여름 장마+눈, 봄아침+별빛)을 막기 위해 시간대/기상에 '계절'과 '명암(낮/밤)' 태그를 단다.
//   - season: 그 항목과 어울리는 계절들의 집합. 두 항목이 한 계절이라도 겹쳐야 결합 가능.
//   - light : 'day'(해가 떠 있는 시간) | 'night'(해가 없는 시간) | 'any'(무관).
//   기상의 light 가 'day'(예: 쏟아지는 햇빛)면 밤 시간대와, 'night'(예: 별빛)면 낮 시간대와 결합하지 않는다.
type Season = 'spring' | 'summer' | 'autumn' | 'winter'
type Light = 'day' | 'night' | 'any'
interface TimeItem { text: string; season: Season[]; light: Light }
interface WeatherItem { text: string; season: Season[]; light: Light }
const ALL_SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

// 시간대/기상의 결합 가능 여부: 계절이 하나라도 겹치고, 명암이 충돌하지 않으면 OK.
const lightOk = (a: Light, b: Light): boolean => a === 'any' || b === 'any' || a === b
const seasonOverlap = (a: Season[], b: Season[]): boolean => a.some((s) => b.includes(s))
const timeWeatherCompatible = (t: TimeItem, w: WeatherItem): boolean =>
  seasonOverlap(t.season, w.season) && lightOk(t.light, w.light)

// ---------- 시간대(때) ----------
// 배경의 '언제'. 문장 맨 앞 부사구로 쓰인다. season/light 로 기상과의 모순을 차단한다.
const TIMES: TimeItem[] = [
  { text: '해가 막 넘어가는 늦가을 저물녘', season: ['autumn'], light: 'day' },
  { text: '첫눈이 내리던 한겨울 새벽', season: ['winter'], light: 'night' },
  { text: '장마가 시작된 한여름 오후', season: ['summer'], light: 'day' },
  { text: '안개가 채 걷히지 않은 이른 봄 아침', season: ['spring'], light: 'day' },
  { text: '매미 소리가 뚝 끊긴 늦여름 한낮', season: ['summer'], light: 'day' },
  { text: '가로등이 막 켜지는 초저녁', season: ALL_SEASONS, light: 'night' },
  { text: '동이 트기 직전, 가장 어두운 새벽녘', season: ALL_SEASONS, light: 'night' },
  { text: '낙엽이 한꺼번에 지던 늦가을 한낮', season: ['autumn'], light: 'day' },
  { text: '눈이 그친 직후의 고요한 한밤중', season: ['winter'], light: 'night' },
  { text: '해넘이가 길어진 한여름 저녁 무렵', season: ['summer'], light: 'day' },
  { text: '서리가 내려앉은 초겨울 아침', season: ['winter'], light: 'day' },
  { text: '벚꽃이 다 진 늦봄의 흐린 오후', season: ['spring'], light: 'day' },
  { text: '폭염이 한풀 꺾인 늦여름 해 질 녘', season: ['summer'], light: 'day' },
  { text: '비가 갠 직후의 늦봄 한낮', season: ['spring'], light: 'day' },
  { text: '한 해의 마지막 날, 자정을 앞둔 밤', season: ['winter'], light: 'night' },
  { text: '장마가 끝나갈 무렵의 후텁지근한 새벽', season: ['summer'], light: 'night' },
  { text: '꽃샘추위가 가시지 않은 이른 봄 한낮', season: ['spring'], light: 'day' },
  { text: '소나기가 지나간 한여름 늦은 밤', season: ['summer'], light: 'night' },
  { text: '단풍이 절정에 이른 가을 늦은 오후', season: ['autumn'], light: 'day' },
  { text: '추수가 끝난 늦가을 으슥한 밤', season: ['autumn'], light: 'night' },
  { text: '함박눈이 내리는 한겨울 한낮', season: ['winter'], light: 'day' },
  { text: '신록이 우거진 늦봄 이른 저녁', season: ['spring'], light: 'night' },
  { text: '열대야가 이어지는 한여름 자정 무렵', season: ['summer'], light: 'night' },
  { text: '낮달이 걸린 초가을 한낮', season: ['autumn'], light: 'day' },
]

// ---------- 기상·정황(날씨) ----------
// 공간을 감싸는 외부 기상. season/light 태그로 시간대와 모순되지 않게 게이팅한다.
const WEATHERS: WeatherItem[] = [
  // 비 — 봄/여름/가을, 명암 무관.
  { text: '창밖에는 굵은 빗줄기가 유리를 두드리며 흘러내린다', season: ['spring', 'summer', 'autumn'], light: 'any' },
  // 눈 — 겨울만, 명암 무관.
  { text: '바깥은 눈발이 소리 없이 쌓여 세상을 하얗게 지운다', season: ['winter'], light: 'any' },
  // 안개 — 사계절, 명암 무관.
  { text: '짙은 안개가 건물을 에워싸 바깥 풍경을 모두 삼켰다', season: ALL_SEASONS, light: 'any' },
  // 바람 — 사계절, 명암 무관.
  { text: '거센 바람이 처마와 창틀을 쉼 없이 흔들어 댄다', season: ALL_SEASONS, light: 'any' },
  // 쨍한 햇빛 — 낮 전용(밤에 햇빛 금지). 한겨울 강설기엔 어색해 봄/여름/가을.
  { text: '구름 한 점 없이 맑아, 햇빛이 유난히 날카롭게 떨어진다', season: ['spring', 'summer', 'autumn'], light: 'day' },
  // 잿빛 흐림 — 사계절, 명암 무관.
  { text: '잿빛 하늘이 낮게 내려앉아 곧 무언가 쏟아질 듯하다', season: ALL_SEASONS, light: 'any' },
  // 천둥 — 주로 여름/봄/가을 뇌우, 명암 무관.
  { text: '천둥이 멀리서 울리며 이따금 창을 희게 밝힌다', season: ['spring', 'summer', 'autumn'], light: 'any' },
  // 끈끈한 습기 — 여름 전용, 명암 무관.
  { text: '습기를 잔뜩 머금은 공기가 살갗에 끈끈하게 들러붙는다', season: ['summer'], light: 'any' },
  // 마른 바람·흙먼지 — 봄/가을, 명암 무관.
  { text: '마른 바람에 흙먼지가 일어 시야가 부옇게 흐려진다', season: ['spring', 'autumn'], light: 'any' },
  // 진눈깨비 — 겨울/초봄·늦가을 환절기, 명암 무관.
  { text: '진눈깨비가 흩날려 창에 닿자마자 물방울로 녹아내린다', season: ['winter', 'spring', 'autumn'], light: 'any' },
  // 무풍의 고요 — 사계절, 명암 무관.
  { text: '바깥은 숨 막히게 고요해, 바람 한 점 불지 않는다', season: ALL_SEASONS, light: 'any' },
  // 서늘한 빗기운 — 봄/가을, 명암 무관.
  { text: '서늘한 빗기운이 문틈으로 스며 실내까지 눅눅하게 한다', season: ['spring', 'autumn'], light: 'any' },
  // 한낮 먹구름 — 낮 전용(한낮 명시), 사계절.
  { text: '한낮인데도 먹구름에 가려 사위가 어스름하다', season: ALL_SEASONS, light: 'day' },
  // 시린 별빛 — 밤 전용(별빛=밤), 눈 그친 겨울.
  { text: '눈 그친 하늘이 차갑게 개어, 별빛이 시리도록 또렷하다', season: ['winter'], light: 'night' },
  // 폭염의 열기 — 여름 낮.
  { text: '아지랑이가 일렁일 만큼 한낮의 열기가 바깥을 달군다', season: ['summer'], light: 'day' },
  // 보름달 — 밤 전용, 사계절.
  { text: '구름 사이로 보름달이 떠올라 바깥을 푸르게 적신다', season: ALL_SEASONS, light: 'night' },
  // 꽃잎·꽃가루 흩날림 — 봄 전용, 낮.
  { text: '바람결에 꽃잎이 흩날려 창틀에 소복이 내려앉는다', season: ['spring'], light: 'day' },
  // 낙엽 흩날림 — 가을 전용, 명암 무관.
  { text: '마른 낙엽이 바닥을 구르며 쉼 없이 바스락거린다', season: ['autumn'], light: 'any' },
  // 성에·살얼음 — 겨울 전용, 명암 무관.
  { text: '바깥 유리마다 성에가 두껍게 끼어 풍경을 흐린다', season: ['winter'], light: 'any' },
  // 노을 — 해 질 녘이므로 낮 범주, 사계절.
  { text: '저무는 노을이 하늘을 붉게 물들이며 길게 번진다', season: ALL_SEASONS, light: 'day' },
]

// 각 시간대와 결합 가능한 기상 풀.
const compatibleWeathers = (t: TimeItem): WeatherItem[] => WEATHERS.filter((w) => timeWeatherCompatible(t, w))
// 각 기상과 결합 가능한 시간대 풀.
const compatibleTimes = (w: WeatherItem): TimeItem[] => TIMES.filter((t) => timeWeatherCompatible(t, w))
// 정합한 (시간대, 기상) 쌍의 총수 — 조합수 계산과 모순 차단의 기준.
const VALID_TW_PAIRS: number = TIMES.reduce((acc, t) => acc + compatibleWeathers(t).length, 0)

// ---------- 내력·소문(이 공간을 떠도는 말) ----------
// 공간에 깊이를 더하는 한 줄 배경 이야기. 대비 축과 독립적으로, 어떤 분위기에도 얹을 수 있게 중립적으로 쓴다.
const LORES = [
  '한때 이곳을 지키던 사람이 어느 날 흔적도 없이 사라졌다는 이야기가 전해진다',
  '오래전 큰 사고가 있었지만 끝내 원인이 밝혀지지 않았다는 소문이 돈다',
  '밤이 깊으면 비어 있어야 할 방에서 인기척이 든다는 말이 떠돈다',
  '이곳을 거쳐 간 사람들은 하나같이 같은 꿈을 꾼다는 이야기가 있다',
  '벽 어딘가에 옛 주인이 숨겨 둔 것이 아직 그대로라는 전설이 남아 있다',
  '한 해의 같은 날만 되면 시계가 일제히 멈춘다는 소문이 따라다닌다',
  '오래된 사진 속 인물 하나가 매년 조금씩 늙어 간다는 이야기가 돈다',
  '이 자리에 서면 떠난 사람의 목소리가 들린다는 말이 오래 전해 온다',
  '한 번 들어온 물건은 결코 밖으로 나가지 못한다는 이상한 규칙이 전해진다',
  '예전 이곳의 도면이 실제 구조와 한 칸씩 어긋난다는 소문이 있다',
  '문을 잠근 사람이 정작 누구였는지 아무도 기억하지 못한다는 이야기가 있다',
  '이곳에서 찍힌 사진에는 늘 한 사람이 더 찍혀 있다는 말이 떠돈다',
  '오래전 떠난 단골손님이 여전히 자기 자리를 비워 두라 했다는 이야기가 남아 있다',
  '깊은 밤이면 어딘가에서 옛 노랫가락이 끊겼다 이어진다는 소문이 돈다',
]

// ---------- 조합수 계산 ----------
// 공간 × 축 × (해당 축의 표면 × 이면) × 감각 × 장치 × (정합한 시간대·날씨 쌍) × 내력.
//   시간대·날씨는 독립 곱(TIMES×WEATHERS)이 아니라 '계절·명암이 모순되지 않는 쌍'만 세어, 한밤중+햇빛 같은 불가능 조합을 조합수에서 배제한다.
//   풀을 넉넉히 늘려 정합 쌍 수가 옛 16×14=224 이상이 되게 했으므로 전체 조합수는 줄지 않는다.
function totalCombos(): number {
  const axisSum = AXES.reduce((acc, a) => acc + a.surface.length * a.fracture.length, 0)
  return SPACES.length * axisSum * SENSES.length * DEVICES.length * VALID_TW_PAIRS * LORES.length
}
const TOTAL = totalCombos()

// ---------- 슬롯 상태 ----------
type SlotKey = 'space' | 'time' | 'weather' | 'axis' | 'surface' | 'fracture' | 'sense' | 'lore' | 'device'
const SLOT_KEYS: SlotKey[] = ['space', 'time', 'weather', 'axis', 'surface', 'fracture', 'sense', 'lore', 'device']
interface SlotMeta { key: SlotKey; label: string; icon: string; hint: string }
const SLOT_META: SlotMeta[] = [
  { key: 'space', label: '공간(무대)', icon: '🏛️', hint: '대비가 펼쳐질 구체적 장소' },
  { key: 'time', label: '시간대(때)', icon: '🕰️', hint: '배경의 언제 — 시각·계절' },
  { key: 'weather', label: '기상·정황', icon: '🌦️', hint: '공간을 감싸는 바깥 날씨' },
  { key: 'axis', label: '대비 축', icon: '⚖️', hint: '한 공간에 겹칠 상반된 두 극' },
  { key: 'surface', label: '표면 인상(겉)', icon: '✨', hint: '먼저 눈에 들어오는 인상' },
  { key: 'fracture', label: '이면 균열(속)', icon: '🩹', hint: '표면을 배신하는 숨은 단서' },
  { key: 'sense', label: '감각 디테일', icon: '👃', hint: '모순을 몸으로 체감시키는 한 줄' },
  { key: 'lore', label: '내력·소문', icon: '📜', hint: '이 공간을 떠도는 한 줄 이야기' },
  { key: 'device', label: '대비 장치', icon: '🎬', hint: '두 극을 한 공간에 공존시키는 연출' },
]

interface SlotState {
  space: string
  time: string
  weather: string
  axisKey: string        // 축은 key 로 저장
  surface: string
  fracture: string
  sense: string
  lore: string
  device: string
}
const emptySlots = (): SlotState => ({ space: '', time: '', weather: '', axisKey: '', surface: '', fracture: '', sense: '', lore: '', device: '' })

const axisOf = (key: string): ContrastAxis | undefined => AXES.find((a) => a.key === key)

// 한 축에서 표면/이면 풀을 얻는다.
const surfacePool = (axisKey: string): string[] => axisOf(axisKey)?.surface ?? []
const fracturePool = (axisKey: string): string[] => axisOf(axisKey)?.fracture ?? []

// 텍스트로 시간대/기상 항목을 되찾는다(슬롯은 문자열로 보관하므로).
const timeOf = (text: string): TimeItem | undefined => TIMES.find((t) => t.text === text)
const weatherOf = (text: string): WeatherItem | undefined => WEATHERS.find((w) => w.text === text)

// 시간대를 새로 뽑는다(직전 값과 가급적 다르게). 결과 텍스트 반환.
const pickTime = (prev: string): string => {
  let v = pick(TIMES)
  if (v.text === prev && TIMES.length > 1) v = pick(TIMES)
  return v.text
}
// 주어진 시간대와 '정합한' 기상만 뽑는다(한밤중+햇빛·여름장마+눈·봄아침+별빛 등 모순 차단). 직전 값과 가급적 다르게.
const pickWeatherFor = (timeText: string, prev: string): string => {
  const t = timeOf(timeText)
  const pool = t ? compatibleWeathers(t) : WEATHERS
  const usable = pool.length ? pool : WEATHERS // 안전망: 정합 풀이 비면 전체에서.
  let v = pick(usable)
  if (v.text === prev && usable.length > 1) v = pick(usable)
  return v.text
}
// 주어진 기상과 정합한 시간대만 뽑는다(기상이 잠겼을 때 시간대 재추출용).
const pickTimeFor = (weatherText: string, prev: string): string => {
  const w = weatherOf(weatherText)
  const pool = w ? compatibleTimes(w) : TIMES
  const usable = pool.length ? pool : TIMES
  let v = pick(usable)
  if (v.text === prev && usable.length > 1) v = pick(usable)
  return v.text
}

const ready = (s: SlotState): boolean =>
  !!(s.space && s.time && s.weather && s.axisKey && s.surface && s.fracture && s.sense && s.lore && s.device)

// 완성된 배경 한 단락(때→공간→표면→이면→날씨→감각→내력).
// 조사는 헬퍼로 받침을 보고 골라 붙여 "을(를)" 같은 이중표기가 나오지 않게 한다.
function composeText(s: SlotState): string {
  if (!ready(s)) return ''
  // 공간 이름 뒤 주격 조사(은/는)는 받침에 맞춰 하나만 출력한다.
  const spaceSubj = josaEunNeun(s.space)
  return `${s.time}, ${spaceSubj} 이렇다. ${s.surface}. ${s.fracture}. ${s.weather}. ${s.sense}. ${s.lore}.`
}

interface Fav { id: string; slots: SlotState; text: string }

export default function SettingContrastGen({ payload }: { payload?: Record<string, unknown> }) {
  // 초기 축: payload.axis → 저장값 → 첫 번째.
  const initAxis: string =
    payload && typeof payload.axis === 'string' && AXES.some((a) => a.key === payload.axis)
      ? (payload.axis as string)
      : (() => {
          try {
            const raw = localStorage.getItem(LS + ':axis')
            if (raw && AXES.some((a) => a.key === raw)) return raw
          } catch { /* ignore */ }
          return AXES[0].key
        })()

  const [slots, setSlots] = useState<SlotState>(() => ({ ...emptySlots(), axisKey: initAxis }))
  // 사용자 정의 항목(라벨은 유지, 값만 무작위 생성 시 비움) + 고정 '기타' 자유 입력.
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')
  const [locked, setLocked] = useState<Record<SlotKey, boolean>>({ space: false, time: false, weather: false, axis: false, surface: false, fracture: false, sense: false, lore: false, device: false })
  const [rolling, setRolling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')
  const [tab, setTab] = useState<'gen' | 'fav'>('gen')
  const [favs, setFavs] = useState<Fav[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':favs')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          return arr
            .filter((f) => f && typeof f.text === 'string')
            .map((f) => ({
              id: typeof f.id === 'string' ? f.id : 'f_' + Math.random().toString(36).slice(2),
              slots: { ...emptySlots(), ...(f.slots || {}) },
              text: String(f.text),
            }))
        }
      }
    } catch { /* ignore */ }
    return []
  })
  const toastTimer = useRef<number | null>(null)

  // 축 저장
  useEffect(() => {
    if (slots.axisKey) {
      try { localStorage.setItem(LS + ':axis', slots.axisKey) } catch { /* ignore */ }
    }
  }, [slots.axisKey])

  // 보관함 저장
  useEffect(() => {
    try { localStorage.setItem(LS + ':favs', JSON.stringify(favs)) } catch { /* ignore */ }
  }, [favs])

  // 토스트 자동 해제 + 언마운트 정리
  const flash = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1900)
  }, [])
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }, [])

  // 굴림 애니메이션 자동 해제 + 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => setRolling(false), 380)
    return () => window.clearTimeout(t)
  }, [rolling])

  const pickSurface = (axisKey: string, prev: string): string => {
    const pool = surfacePool(axisKey)
    if (!pool.length) return ''
    let v = pick(pool)
    if (v === prev && pool.length > 1) v = pick(pool)
    return v
  }
  const pickFracture = (axisKey: string, prev: string): string => {
    const pool = fracturePool(axisKey)
    if (!pool.length) return ''
    let v = pick(pool)
    if (v === prev && pool.length > 1) v = pick(pool)
    return v
  }

  // 무작위 생성 시 사용자 정의 항목의 '값'과 '기타'를 비운다(라벨/항목 정의는 유지).
  const clearUserInputs = useCallback(() => {
    setCustom((prev) => prev.map((c) => ({ ...c, value: '' })))
    setEtc('')
  }, [])

  // 사용자 정의 항목 추가/변경/삭제.
  const addCustom = () => {
    const label = (window.prompt('추가할 항목 이름을 입력하세요 (예: 출입 통제, 소문, 역사)') || '').trim()
    if (!label) return
    setCustom((prev) => [...prev, { id: 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) =>
    setCustom((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
  const removeCustom = (id: string) => setCustom((prev) => prev.filter((c) => c.id !== id))

  // 전체 굴리기 — 잠긴 칸 유지. 축이 잠겨 있지 않으면 새 축을 뽑고, 그에 맞춰 표면/이면을 그 축에서 다시 뽑는다.
  const roll = useCallback(() => {
    setCopied(false)
    setRolling(true)
    clearUserInputs()
    setSlots((prev) => {
      const next: SlotState = { ...prev }
      // 공간
      if (!(locked.space && prev.space)) {
        let v = pick(SPACES)
        if (v === prev.space && SPACES.length > 1) v = pick(SPACES)
        next.space = v
      }
      // 시간대·기상 — 계절·명암 정합성을 지켜 함께 뽑는다(모순 조합 차단).
      const timeLocked = locked.time && !!prev.time
      const weatherLocked = locked.weather && !!prev.weather
      if (!timeLocked && !weatherLocked) {
        // 둘 다 자유: 시간대를 먼저 뽑고, 그에 정합한 기상만 뽑는다.
        next.time = pickTime(prev.time)
        next.weather = pickWeatherFor(next.time, prev.weather)
      } else if (timeLocked && !weatherLocked) {
        // 시간대 고정: 그 시간대에 정합한 기상만 다시 뽑는다.
        next.weather = pickWeatherFor(prev.time, prev.weather)
      } else if (!timeLocked && weatherLocked) {
        // 기상 고정: 그 기상에 정합한 시간대만 다시 뽑는다.
        next.time = pickTimeFor(prev.weather, prev.time)
      } // 둘 다 고정이면 그대로 둔다(이미 정합한 쌍).
      // 축
      let axisKey = prev.axisKey
      if (!(locked.axis && prev.axisKey)) {
        let a = pick(AXES).key
        if (a === prev.axisKey && AXES.length > 1) a = pick(AXES).key
        axisKey = a
        next.axisKey = axisKey
      }
      // 표면 — 축이 바뀌었으면(또는 자기 칸이 잠기지 않았으면) 현재 축에서 다시 뽑는다.
      const axisChanged = axisKey !== prev.axisKey
      if (axisChanged || !(locked.surface && prev.surface)) {
        next.surface = pickSurface(axisKey, prev.surface)
      }
      if (axisChanged || !(locked.fracture && prev.fracture)) {
        next.fracture = pickFracture(axisKey, prev.fracture)
      }
      // 감각
      if (!(locked.sense && prev.sense)) {
        let v = pick(SENSES)
        if (v === prev.sense && SENSES.length > 1) v = pick(SENSES)
        next.sense = v
      }
      // 내력
      if (!(locked.lore && prev.lore)) {
        let v = pick(LORES)
        if (v === prev.lore && LORES.length > 1) v = pick(LORES)
        next.lore = v
      }
      // 장치
      if (!(locked.device && prev.device)) {
        let v = pick(DEVICES)
        if (v === prev.device && DEVICES.length > 1) v = pick(DEVICES)
        next.device = v
      }
      return next
    })
  }, [locked, clearUserInputs])

  // 한 칸만 다시 굴리기.
  const rerollOne = (k: SlotKey) => {
    setCopied(false)
    setRolling(true)
    setSlots((prev) => {
      if (k === 'space') {
        let v = pick(SPACES); if (v === prev.space && SPACES.length > 1) v = pick(SPACES)
        return { ...prev, space: v }
      }
      if (k === 'time') {
        // 기상이 고정돼 있으면 그 기상에 정합한 시간대만, 아니면 새 시간대를 뽑고 기상을 정합하게 다시 맞춘다.
        if (locked.weather && prev.weather) {
          return { ...prev, time: pickTimeFor(prev.weather, prev.time) }
        }
        const time = pickTime(prev.time)
        // 새 시간대와 현재 기상이 모순되면(또는 기상이 비었으면) 기상도 정합하게 다시 뽑는다.
        const w = weatherOf(prev.weather)
        const stillOk = w ? timeWeatherCompatible(timeOf(time)!, w) : false
        return { ...prev, time, weather: stillOk ? prev.weather : pickWeatherFor(time, prev.weather) }
      }
      if (k === 'weather') {
        // 시간대가 고정돼 있으면 그 시간대에 정합한 기상만, 아니면 현재 시간대에 정합한 기상을 뽑는다.
        if (prev.time) return { ...prev, weather: pickWeatherFor(prev.time, prev.weather) }
        // 시간대가 아직 없으면 기상을 자유로이 뽑되, 정합한 시간대도 함께 채운다.
        const weather = pick(WEATHERS).text
        return { ...prev, weather, time: pickTimeFor(weather, prev.time) }
      }
      if (k === 'axis') {
        let a = pick(AXES).key; if (a === prev.axisKey && AXES.length > 1) a = pick(AXES).key
        // 축이 바뀌면 표면/이면을 새 축에서 다시 뽑는다(다른 축의 잔여값이 섞이지 않도록).
        return { ...prev, axisKey: a, surface: pickSurface(a, ''), fracture: pickFracture(a, '') }
      }
      if (k === 'surface') return { ...prev, surface: pickSurface(prev.axisKey, prev.surface) }
      if (k === 'fracture') return { ...prev, fracture: pickFracture(prev.axisKey, prev.fracture) }
      if (k === 'sense') {
        let v = pick(SENSES); if (v === prev.sense && SENSES.length > 1) v = pick(SENSES)
        return { ...prev, sense: v }
      }
      if (k === 'lore') {
        let v = pick(LORES); if (v === prev.lore && LORES.length > 1) v = pick(LORES)
        return { ...prev, lore: v }
      }
      // device
      let v = pick(DEVICES); if (v === prev.device && DEVICES.length > 1) v = pick(DEVICES)
      return { ...prev, device: v }
    })
  }

  // 축을 직접 고르기(셀렉트) — 잠긴 표면/이면이 아니면 새 축에서 다시 뽑는다.
  const chooseAxis = (axisKey: string) => {
    setCopied(false)
    setSlots((prev) => ({
      ...prev,
      axisKey,
      surface: locked.surface && prev.surface ? prev.surface : pickSurface(axisKey, ''),
      fracture: locked.fracture && prev.fracture ? prev.fracture : pickFracture(axisKey, ''),
    }))
  }

  const toggleLock = (k: SlotKey) => setLocked((prev) => ({ ...prev, [k]: !prev[k] }))

  const axis = axisOf(slots.axisKey)
  const isReady = ready(slots)
  const text = composeText(slots)

  const slotValue = (k: SlotKey): string => {
    if (k === 'axis') return axis ? `${axis.icon} ${axis.label}` : ''
    if (k === 'space') return slots.space
    if (k === 'time') return slots.time
    if (k === 'weather') return slots.weather
    if (k === 'surface') return slots.surface
    if (k === 'fracture') return slots.fracture
    if (k === 'sense') return slots.sense
    if (k === 'lore') return slots.lore
    return slots.device
  }

  // 사용자 정의 항목 중 값이 채워진 것만(라벨→값) 모은다.
  const filledCustom = (): { label: string; value: string }[] =>
    custom.map((c) => ({ label: c.label.trim(), value: c.value.trim() })).filter((c) => c.label && c.value)

  // 평문 블록(복사·수집함용).
  const plainBlock = (): string => {
    const extra: string[] = []
    for (const c of filledCustom()) extra.push(`• ${c.label}: ${c.value}`)
    if (etc.trim()) extra.push(`📝 기타: ${etc.trim()}`)
    return [
      `🌗 배경 대비 — ${axis ? axis.label : ''}`,
      `🏛️ 공간: ${slots.space}`,
      `🕰️ 시간대: ${slots.time}`,
      `🌦️ 기상: ${slots.weather}`,
      `✨ 표면(겉): ${slots.surface}`,
      `🩹 이면(속): ${slots.fracture}`,
      `👃 감각: ${slots.sense}`,
      `📜 내력: ${slots.lore}`,
      `🎬 대비 장치: ${slots.device}`,
      ...extra,
      '',
      `▶ ${text}`,
    ].join('\n')
  }

  const copy = () => {
    if (!isReady) return
    navigator.clipboard?.writeText(plainBlock())
      .then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500) })
      .catch(() => flash('이 환경에서는 복사가 지원되지 않습니다.'))
  }

  // 보관함
  const addFav = () => {
    if (!isReady) return
    setFavs((prev) => [
      { id: 'f_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), slots: { ...slots }, text },
      ...prev,
    ])
    flash('보관함에 담았습니다.')
  }
  const removeFav = (id: string) => setFavs((prev) => prev.filter((f) => f.id !== id))
  const restoreFav = (f: Fav) => {
    setSlots({ ...emptySlots(), ...f.slots })
    setLocked({ space: false, time: false, weather: false, axis: false, surface: false, fracture: false, sense: false, lore: false, device: false })
    setTab('gen')
    setCopied(false)
  }

  // 수집함
  const toStash = () => {
    if (!isReady) return
    if (!hasStash()) { flash('수집함에 연결되어 있지 않습니다.'); return }
    addToStash({ kind: 'note', label: `🌗 배경 대비 — ${slots.space.slice(0, 16)}`, text: plainBlock() })
    flash('수집함에 담았습니다.')
  }

  // 스니펫 라이브러리
  const saveSnippet = () => {
    if (!isReady) return
    addToLibrary('snippets', {
      text: `[배경 대비/${axis ? axis.label : ''}] ${text}`,
      source: '배경 대비 생성기',
      tags: ['배경', '설정', '대비', axis ? axis.label : ''].filter(Boolean),
    })
    flash('스니펫 라이브러리에 저장했습니다.')
  }

  // 프로젝트 자료에 'setting' 카드로 추가.
  const toProject = () => {
    if (!isReady) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const axisLabel = axis ? axis.label : ''
    const character: Record<string, string> = {
      name: slots.space,
      시간대: slots.time,
      기상: slots.weather,
      대비축: axisLabel,
      표면: slots.surface,
      이면: slots.fracture,
      감각: slots.sense,
      내력: slots.lore,
      연출: slots.device,
      // 정규 장소 키(받는 허브가 기본 칸에 매핑) — 기존 키는 유지하고 정규 키를 1:1로 추가.
      //   표면=눈에 먼저 드는 외관, 이면=숨은 비밀, 감각=오감 디테일, 대비 축+연출=분위기/비고.
      atmosphere: axisLabel ? `${axisLabel} — ${slots.surface} / ${slots.fracture}` : `${slots.surface} / ${slots.fracture}`,
      appearance: slots.surface,
      sensory: slots.sense,
      secrets: slots.fracture,
      // 시간대/날씨/내력을 비고에 합쳐 둔다. 조사는 받침에 맞춰 골라 붙인다(예: '저물녘을', '오후를').
      notes: [
        `${josaEulReul(slots.time)} 배경으로 삼는다`,
        `기상: ${slots.weather}`,
        axisLabel ? `대비 축: ${axisLabel}` : '',
        `연출: ${slots.device}`,
        `내력: ${slots.lore}`,
      ].filter(Boolean).join(' · '),
    }
    // 사용자 정의 항목(키 = 라벨 그대로) + 기타를 fields 맵에 더해, 다른 도구(설정 시트·갤러리 등)에 그대로 나타나게 한다.
    for (const c of filledCustom()) character[c.label] = c.value
    if (etc.trim()) character.etc = etc.trim()
    const id = addToProject({
      kind: 'setting',
      root: 'research',
      folder: '장소',
      title: `🌗 ${slots.space}`,
      character,
      synopsis: text,
      meta: { 대비축: axisLabel, 표면: slots.surface.slice(0, 40), 이면: slots.fracture.slice(0, 40) },
    })
    flash(id ? '프로젝트 자료 〈장소〉 폴더에 배경 카드를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 설정 바이블로 이어 열기(공간 이름과 분위기를 payload 로 넘긴다).
  const openBible = () => {
    openToolLinked('setting-bible', isReady
      ? { name: slots.space, mood: `${axis ? axis.label : ''} — ${slots.surface} / ${slots.fracture}` }
      : undefined)
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hintS: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <div style={hintS}>
        한 공간에 <b>상반된 두 분위기</b>를 겹쳐 <b>입체적 배경</b>을 만드세요. 좋은 배경은 단일 인상이 아니라 <b>모순</b>을 품습니다 — 안전해 보이나 위협이 깔리고, 화려하나 공허합니다. 마음에 드는 칸은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴리세요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('gen')} aria-pressed={tab === 'gen'}
          style={{ borderColor: tab === 'gen' ? 'var(--accent)' : 'var(--border)', color: tab === 'gen' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🌗"/> 생성
        </button>
        <button className="minibtn" onClick={() => setTab('fav')} aria-pressed={tab === 'fav'}
          style={{ borderColor: tab === 'fav' ? 'var(--accent)' : 'var(--border)', color: tab === 'fav' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐"/> 보관함 ({favs.length})
        </button>
      </div>

      {tab === 'gen' && (
        <>
          {/* 대비 축 선택 */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>대비 축(두 극을 겹칠 방향)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {AXES.map((a) => {
                const on = a.key === slots.axisKey
                return (
                  <button key={a.key} className="minibtn" onClick={() => chooseAxis(a.key)} aria-pressed={on} title={a.desc}
                    style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)', fontWeight: on ? 700 : 400 }}>
                    <Emoji e={a.icon}/> {a.label}
                  </button>
                )
              })}
            </div>
            {axis && <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4, marginTop: 4 }}>{axis.desc}</div>}
          </div>

          {/* 조합수 */}
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            가능한 배경 대비 조합: <b style={{ color: 'var(--accent)' }}>{fmt(TOTAL)}</b>가지
          </div>

          {/* 슬롯들 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {SLOT_META.map((sl) => {
              const isLocked = !!locked[sl.key]
              const val = slotValue(sl.key)
              // 표면/이면은 어느 극인지 라벨에 함께 표기.
              const poleTag =
                sl.key === 'surface' && axis ? `(${axis.poleA})` :
                sl.key === 'fracture' && axis ? `(${axis.poleB})` : ''
              return (
                <div key={sl.key} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-10deg) scale(1.12)' : 'none' }}>
                    <Emoji e={sl.icon}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }} title={sl.hint}>
                      {sl.label}{poleTag && <span style={{ color: 'var(--accent)' }}> {poleTag}</span>}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.45, color: val ? 'var(--text)' : 'var(--muted)' }}>
                      {val ? (rolling && !isLocked ? '…' : val) : '— 굴려주세요 —'}
                    </div>
                  </div>
                  {sl.key !== 'axis' && (
                    <button className="minibtn" onClick={() => rerollOne(sl.key)} title="이 칸만 다시 굴리기" style={{ flexShrink: 0 }}><Emoji e="🎲"/></button>
                  )}
                  {sl.key === 'axis' && (
                    <button className="minibtn" onClick={() => rerollOne('axis')} title="축 무작위" style={{ flexShrink: 0 }}><Emoji e="🎲"/></button>
                  )}
                  <button className="minibtn" onClick={() => toggleLock(sl.key)} title={isLocked ? '고정 해제' : '이 칸 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                  </button>
                </div>
              )
            })}

            {/* 사용자 정의 항목 — 무작위 데이터가 없으므로 직접 입력. 재생성 시 값만 비우고 항목은 유지. */}
            {custom.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px dashed var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0 }}><Emoji e="📝"/></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.label}</div>
                  <input
                    value={c.value}
                    onChange={(e) => setCustomValue(c.id, e.target.value)}
                    placeholder="직접 입력하세요"
                    style={{ width: '100%', marginTop: 2, fontSize: 13, fontWeight: 600, lineHeight: 1.45, color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', boxSizing: 'border-box' }}
                  />
                </div>
                <button className="minibtn" onClick={() => removeCustom(c.id)} title="이 항목 삭제" style={{ flexShrink: 0, borderColor: 'var(--warn)', color: 'var(--warn)' }}>✕</button>
              </div>
            ))}

            {/* 항목 추가 */}
            <button className="minibtn" onClick={addCustom} title="이름을 입력해 직접 채울 새 항목을 추가합니다" style={{ alignSelf: 'flex-start' }}>＋ 항목 추가</button>

            {/* 고정 기타 자유 입력 */}
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}><Emoji e="📝"/> 기타 (자유 입력)</div>
              <textarea
                value={etc}
                onChange={(e) => setEtc(e.target.value)}
                placeholder="추가로 적어둘 내용을 자유롭게 입력하세요"
                rows={3}
                style={{ width: '100%', fontSize: 13, lineHeight: 1.55, color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          {/* 완성된 배경 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}>
              <Emoji e="🌗"/> 입체적 배경 한 단락 {axis && <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· {axis.label}</span>}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: isReady ? 'var(--text)' : 'var(--muted)' }}>
              {isReady ? text : '슬롯을 굴려 표면과 이면이 충돌하는 배경을 완성하세요.'}
            </div>
            {isReady && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
<Emoji e="🎬"/> <b>연출</b>: {slots.device}
              </div>
            )}
          </div>

          {/* 동작 버튼 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={roll}><Emoji e="🎲"/> 굴리기 / 다시 섞기</button>
            <button className="minibtn" onClick={copy} disabled={!isReady}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={addFav} disabled={!isReady} style={{ flex: 1 }}><Emoji e="⭐"/> 보관함에 담기</button>
            <button className="minibtn" onClick={saveSnippet} disabled={!isReady} style={{ flex: 1 }} title="스니펫 라이브러리에 저장"><Emoji e="🧷"/> 스니펫 저장</button>
          </div>

          {/* 연계 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={toStash} disabled={!isReady || !hasStash()}
              title={!hasStash() ? '수집함에 연결되어 있지 않습니다' : !isReady ? '먼저 배경을 완성하세요' : '수집함에 메모로 담기'}>
              <Emoji e="📎"/> 수집함
            </button>
            <button className="linkbtn" onClick={toProject} disabled={!isReady || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !isReady ? '먼저 배경을 완성하세요' : '프로젝트 자료(장소 폴더)에 배경 카드로 추가'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={openBible} title="이 배경을 설정 바이블에서 이어 다듬기">
              <Emoji e="📖"/> 설정 바이블 열기
            </button>
          </div>

          {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
          <div style={hintS}>표면은 넉넉히 보여주고, 이면은 한 줄로 비틀 때 낙차가 커집니다. 이면을 너무 빨리 다 까지 말고, 감각 한 줄로 먼저 흘리세요.</div>
        </>
      )}

      {tab === 'fav' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {favs.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐"/></div>
              보관한 배경이 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성 탭에서 <Emoji e="⭐"/> 보관함에 담기를 눌러 모아보세요.</span>
            </div>
          )}
          {favs.map((f) => {
            const a = axisOf(f.slots.axisKey)
            return (
              <div key={f.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap' }}>
                    {a ? <><Emoji e={a.icon}/> {a.label}</> : <><Emoji e="🌗"/> 배경</>}
                  </span>
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => restoreFav(f)} title="생성 탭으로 불러오기">↩ 불러오기</button>
                  <button className="minibtn" onClick={() => { navigator.clipboard?.writeText(f.text).catch(() => { /* graceful */ }); flash('복사했습니다.') }} title="복사"><Emoji e="📋"/></button>
                  <button className="minibtn" onClick={() => removeFav(f.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑"/></button>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.65 }}>{f.text}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="🏛️"/> {f.slots.space}</div>
              </div>
            )
          })}
          {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
        </div>
      )}
    </div>
  )
}
