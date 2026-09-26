// 징조·상징 생성기(조합형) — 사물/자연현상 × 상징 의미 × 등장 방식 × 회수(回收) 방식 × 감각 채널 × 정서 색조
//   슬롯을 무작위로 굴려, 복선이 되는 '징조·상징' 한 벌을 만든다(심을 곳 → 의미 → 어떻게 등장 → 어떻게 거두기).
// 작법 원리: 상징은 '심기(setup) → 반복/변주 → 회수(payoff)'로 완성된다. 진부한 조합은 경고로 표시.
// 자급식: 외부 네트워크·라이브러리·미디어 없음. Math.random + localStorage(잠금/모드/보관함)만 사용.
// 연계(linkbus): 생성물을 스니펫 라이브러리 + 프로젝트 자료 〈영감 메모〉 폴더 문서로 추가.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, Emoji } from './linkbus'

export const meta = { id: 'omen-symbol-gen', name: '징조·상징 생성기', icon: '🔮', group: '영감·발상', intro: '사물·의미·등장·회수·감각·색조 슬롯을 굴려 복선이 될 징조·상징을 만드세요', w: 560, h: 700 }

const LS = 'sry:tool:omen-symbol-gen'

// ---------- 한국어 조사 헬퍼 ----------
// 앞 글자(마지막 음절)의 받침 유무를 보고 올바른 조사를 하나만 골라 출력한다. "을(를)" 같은 이중표기 금지.
const hasJong = (w: string): boolean => {
  if (!w) return false
  const ch = w[w.length - 1]
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false // 한글 음절이 아니면 받침 없음으로 처리
  return (code - 0xac00) % 28 !== 0
}
// '을/를'
const eul = (w: string) => w + (hasJong(w) ? '을' : '를')
// '은/는'
const eun = (w: string) => w + (hasJong(w) ? '은' : '는')
// '이/가'
const iga = (w: string) => w + (hasJong(w) ? '이' : '가')
// '으로/로' (단, 받침 ㄹ이면 '로')
const euro = (w: string) => {
  if (!w) return w
  const ch = w[w.length - 1]
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return w + '로'
  const jong = (code - 0xac00) % 28
  return w + (jong === 0 || jong === 8 ? '로' : '으로') // 받침 없음 또는 ㄹ(8) → '로'
}

// ---------- 모드(징조 / 상징 / 모티프) ----------
// 결이 다른 세 가지: 다가올 일을 예고하는 '징조', 주제를 응축하는 '상징', 반복돼 의미가 쌓이는 '모티프'.
type ModeKey = 'omen' | 'symbol' | 'motif'
interface TplParts { obj: string; mean: string; enter: string; recover: string; sense: string; tone: string }
interface Mode {
  key: ModeKey
  label: string
  icon: string
  desc: string
  // 한 줄 요약을 엮는 템플릿. 조사는 헬퍼로 받침에 맞춰 출력.
  template: (p: TplParts) => string
}
const MODES: Mode[] = [
  {
    key: 'omen', label: '징조', icon: '🌫️', desc: '다가올 사건을 미리 예고하는 불길하거나 길한 신호',
    // sense(감각 채널) = 부사적 수식, tone(정서 색조) = 관형 수식. 모두 다른 슬롯과 독립적으로 성립.
    template: (p) =>
      `${p.tone} ${p.obj} — ${p.enter} ${p.sense} 다가와, 그것은 「${p.mean}」의 징조다. 훗날 ${p.recover} 그 예고가 맞아떨어진다.`,
  },
  {
    key: 'symbol', label: '상징', icon: '🕯️', desc: '주제·인물의 내면을 한 사물에 응축한 의미의 그릇',
    template: (p) =>
      `${p.tone} ${eun(p.obj)} ${p.sense} ${eul(p.mean)} 상징한다. ${p.enter} 자리하다가, 마침내 ${p.recover} 그 의미가 완성된다.`,
  },
  {
    key: 'motif', label: '모티프', icon: '🔁', desc: '작품 전체에 반복 등장하며 의미가 쌓이는 변주 이미지',
    template: (p) =>
      `반복되는 ${p.tone} ${p.obj}. ${p.enter} ${p.sense} ${eul(p.mean)} 환기하다가, ${p.recover} 마지막 변주로 갈무리된다.`,
  },
]

// ---------- 슬롯 정의 ----------
type SlotKey = 'obj' | 'mean' | 'enter' | 'recover' | 'sense' | 'tone'
interface SlotDef { key: SlotKey; label: string; icon: string; hint: string }
const SLOTS: SlotDef[] = [
  { key: 'tone', label: '정서 색조', icon: '🎨', hint: '대상에 입히는 분위기·감정의 결(관형 수식)' },
  { key: 'obj', label: '사물·자연현상', icon: '🍂', hint: '징조/상징을 실어 나를 구체적 대상' },
  { key: 'sense', label: '감각 채널', icon: '👁', hint: '독자에게 어떤 감각으로 와닿는가' },
  { key: 'mean', label: '상징 의미', icon: '💠', hint: '그 사물이 환기할 주제·감정·예고' },
  { key: 'enter', label: '등장 방식', icon: '🚪', hint: '독자에게 처음 심기는(setup) 방법' },
  { key: 'recover', label: '회수 방식', icon: '🎯', hint: '결말에서 의미가 거둬지는(payoff) 방법' },
]

// 사물·자연현상(공용 풀) — 구체적이고 감각적인 대상 위주. 고유 항목 150개.
const OBJECTS = [
  '깨진 손거울', '멈춰 선 괘종시계', '한쪽만 남은 장갑', '시들어가는 화분의 꽃', '녹슨 열쇠',
  '계절을 잊고 핀 꽃', '둥지에서 떨어진 새', '말라붙은 우물', '금이 간 찻잔', '꺼지지 않는 촛불',
  '철 지난 매미 울음', '문턱을 넘지 못하는 고양이', '거꾸로 걸린 액자', '풀리지 않는 매듭', '닳아 흐려진 동전',
  '한밤에 우는 까마귀', '제 꼬리를 무는 뱀의 문양', '낡은 회중시계', '봉인된 편지', '실밥이 풀린 인형',
  '서리 낀 창문', '뒤집힌 찻잔', '눈먼 물고기', '두 갈래로 자란 나무', '재만 남은 모닥불',
  '끝없이 내리는 잿빛 비', '바닥난 모래시계', '울리지 않는 종', '얼어붙은 강', '제때 피지 않는 등불',
  '깃털 빠진 부채', '날짜가 멈춘 달력', '소리 없는 풍경(風磬)', '주인 잃은 신발 한 켤레', '곰팡이 핀 지도',
  '꽃잎을 닫은 우산', '한 글자가 지워진 비석', '녹아내리는 양초 인형', '뿌리째 뽑힌 나무', '깨어나지 않는 메아리',
  '한쪽 날개가 부러진 풍차', '바늘이 휜 나침반', '봉인이 뜯긴 항아리', '심지가 다 탄 등잔', '물이 새는 물시계',
  '문이 잠긴 빈 새장', '잉크가 마른 만년필', '줄이 끊어진 가야금', '주름이 깊게 팬 가면', '빛바랜 혼인 사진',
  '한 짝만 남은 비녀', '구멍 난 그물', '녹이 슨 닻', '바람 빠진 풍선', '얼룩이 번진 손수건',
  '날이 무뎌진 칼', '깨진 항아리 조각', '말라 비틀어진 화환', '제자리를 잃은 장기 말', '닳아 빠진 문고리',
  '먼지 쌓인 오르골', '소금에 절은 밧줄', '갈라진 가뭄의 논바닥', '한밤의 도깨비불', '안개에 잠긴 다리',
  '썰물에 드러난 난파선', '꺼진 등대', '서서히 차오르는 만조', '달무리 진 보름달', '핏빛으로 물든 노을',
  '때 이른 첫눈', '녹지 않는 마지막 잔설', '소용돌이치는 강물', '제비 없는 처마', '꽃가루처럼 날리는 재',
  '거미줄 친 문패', '벌어진 마룻널 틈', '삐걱이는 흔들의자', '먹다 만 사과', '시든 화관(花冠)',
  '한 칸 모자란 계단', '물에 번진 잉크 편지', '타다 만 향(香)', '깨진 약속의 반지', '잃어버린 한쪽 귀고리',
  '주인을 기다리는 빈 의자', '낡은 자장가 가락', '바닥에 떨어진 단추', '엉킨 실타래', '식어버린 찻물',
  '저절로 열린 대문', '닫히지 않는 서랍', '깜빡이는 가로등', '멈춘 회전목마', '버려진 우체통',
  '말없이 자라는 담쟁이', '벽에 박힌 못자국', '지워지지 않는 얼룩', '오래 닫힌 다락방', '먼지 낀 샹들리에',
  '한밤에 핀 박꽃', '비에 젖은 깃발', '물수제비 뜬 잔물결', '돌탑 위 마지막 돌', '주워온 길고양이',
  '바람에 뒤집힌 우산', '낡은 회전판 음반', '실금이 간 유리창', '녹슨 그네', '문틈으로 새는 빛',
  '꺼져가는 화롯불', '강가에 떠내려온 신', '주인 없는 무덤', '하얗게 센 머리카락 한 올', '빛을 잃은 보석',
  '한밤의 종소리', '아무도 안 사는 빈집', '말라가는 잉크병', '쪼개진 호두', '날아간 종이비행기',
  '시계 반대로 도는 바람개비', '벗겨진 칠', '말라붙은 잉크 자국', '식물원의 시든 난', '낡은 군화 한 켤레',
  '바스러지는 마른 잎', '한밤에 들리는 발소리', '버려진 그림자놀이 인형', '빛바랜 지폐 한 장', '깨진 도자기 인형',
  '물에 젖은 성냥', '엇갈린 두 기차 선로', '닫힌 커튼 사이 빛줄기', '주인 잃은 목줄', '말라 죽은 화분의 흙',
  '한밤의 부엉이 소리', '오래된 우물 두레박', '깜박이는 네온 간판', '벽에 걸린 멈춘 추시계', '바람에 흩어지는 민들레 홀씨',
  '검게 그을린 문지방', '낡은 흑백 가족사진', '한쪽이 닳은 신발 밑창', '얼어붙은 빨랫줄', '비 맞은 종이 등(燈)',
  '말라붙은 봉숭아 물', '주인을 잃은 안경', '한밤에 떨어진 별똥별', '시든 봉헌화', '낡은 가죽 일기장',
]

// 모드별 풀: 의미 / 등장 방식 / 회수 방식 (고유 항목)
const POOLS: Record<ModeKey, { mean: string[]; enter: string[]; recover: string[] }> = {
  omen: {
    mean: [
      '머지않은 이별', '돌이킬 수 없는 배신', '잊고 있던 죄의 청구', '무너질 신뢰', '곧 찾아올 죽음',
      '거짓 위에 세운 평화의 종말', '되돌아오는 과거', '깨어날 봉인된 진실', '예정된 추락', '시작될 복수',
      '잃게 될 소중한 것', '다가오는 시험', '무르익은 파국', '끊어질 인연', '닥쳐올 시련의 계절',
      '곧 드러날 비밀', '저물어가는 시대', '예고된 재회', '치러야 할 대가', '깨질 약속',
      '다가오는 전란', '무너질 가문', '엇나갈 운명', '돌아올 탕아', '예고된 화해',
      '들이닥칠 재앙', '식어버릴 정', '뒤바뀔 처지', '드러날 출생의 비밀', '치솟을 의심',
      '꺼져갈 희망', '들통날 거짓말', '되살아날 원한', '뒤늦게 닿을 진심', '예고된 만남의 끝',
    ],
    enter: [
      '아무도 눈치채지 못한 채 첫 장면 한구석에 놓여',
      '인물이 무심코 스쳐 지나가며',
      '평범한 일상의 풍경 속에 슬쩍 끼어들어',
      '한 인물만이 불길함을 느끼지만 말하지 못한 채',
      '대수롭지 않은 농담거리로 가볍게 언급되어',
      '꿈이나 환상의 형태로 어렴풋이',
      '어린아이의 입을 통해 무심코 발설되어',
      '낡은 전설·민담의 한 구절로 인용되어',
      '날씨나 계절의 변화처럼 배경에 스며들어',
      '반복되는 사소한 사고로 거듭 나타나',
      '노점상·행인의 지나가는 말로 흘려져',
      '오래된 기록·일기의 한 줄로 남아',
      '동물의 이상한 행동으로 먼저 감지되어',
      '미신을 믿는 노인의 경고로 전해져',
      '잡음 섞인 방송·소문의 형태로 떠돌아',
      '인물의 사소한 실수나 불운으로 예고되어',
      '낯선 손님이 남긴 한마디로 슬며시',
      '들뜬 축제의 한복판에 불쑥 끼어들어',
      '버려진 물건에 얽힌 사연으로 따라붙어',
      '두 인물의 사소한 말다툼 속에 숨어',
    ],
    recover: [
      '예고했던 사건이 정확히 그 형태로 닥쳐와',
      '잊고 있던 독자가 뒤늦게 무릎을 치게',
      '예상과 정반대로 비틀린 채 실현되어',
      '인물이 비로소 그 신호의 의미를 깨달으며',
      '한발 늦은 후회와 함께 들어맞아',
      '징조를 무시한 대가가 고스란히 돌아와',
      '겉뜻이 아닌 숨은 뜻으로 적중하며',
      '징조를 막으려던 행동이 도리어 그것을 불러',
      '여러 작은 신호가 한 장면에서 한꺼번에 회수되며',
      '마지막에 누군가의 입으로 다시 호명되어',
      '믿지 않던 인물이 끝내 그 앞에 무릎 꿇으며',
      '엉뚱한 인물에게 대신 들어맞는 아이러니로',
      '예고보다 더 가혹한 형태로 부풀어 닥쳐와',
      '한 박자 빗나간 듯하다 결국 적중하며',
      '징조를 알아챈 자만이 화를 피하는 결말로',
      '오래 잊혔다가 마지막 장에서 되살아나',
      '대물림되어 다음 세대에게 다시 드리워지며',
      '징조의 주인이 뒤바뀌며 의미가 전복되어',
      '막으려던 자가 곧 그 원인이었음이 드러나며',
      '예고와 회수 사이의 시차가 비극을 키운 채',
    ],
  },
  symbol: {
    mean: [
      '잃어버린 순수', '구속과 자유의 갈등', '시간의 무상함', '닿을 수 없는 그리움', '감춰진 죄책감',
      '깨어지기 쉬운 신뢰', '억눌린 욕망', '대물림되는 상처', '소외와 고독', '되찾고 싶은 정체성',
      '권력의 허망함', '사랑의 양면성', '성장의 통증', '진실과 위선의 경계', '희생의 무게',
      '용서의 가능성', '기억의 왜곡', '자유의지와 운명', '소속을 향한 갈망', '죽음과 재생',
      '버림받음의 공포', '책임의 무게', '순응과 저항의 줄다리기', '회복되지 않는 신의', '욕망의 대가',
      '진정성을 향한 갈증', '세대 간의 단절', '구원에의 희구', '집착의 그림자', '존엄을 지키려는 안간힘',
      '연민과 잔혹의 공존', '잊히는 것에 대한 두려움', '약속과 배신의 경계', '자기 기만', '돌아갈 수 없는 고향',
    ],
    enter: [
      '인물의 일상 소품으로 자연스럽게 손에 쥐어져',
      '대비되는 두 인물이 각기 다르게 대하며',
      '제목·장 제목과 호응하는 핵심 이미지로',
      '인물의 결정적 선택의 순간마다 곁에 놓여',
      '시점에 따라 다르게 보이도록 거듭 묘사되어',
      '한 인물에게는 보물, 다른 인물에게는 짐으로',
      '색·소리·냄새 같은 감각과 묶여 각인되어',
      '계절·시간대의 변화와 함께 모습을 바꾸며',
      '서두에 무심한 듯 한 번 클로즈업되어',
      '인물의 대사가 아닌 행동·습관으로만 드러나',
      '인물이 끝내 버리지 못하는 미련의 형태로',
      '한 공간을 지키는 붙박이 사물로 자리 잡아',
      '주고받는 선물로 인물 사이를 오가며',
      '회상 장면에서만 또렷이 떠오르도록',
      '인물이 의식하지 못하는 무의식의 표상으로',
      '한 가문·집단의 표지(標識)로 대물림되어',
      '인물의 직업·신분을 말없이 드러내는 표식으로',
      '카메라가 머무는 마지막 한 컷처럼 남겨져',
      '말로 설명되지 않고 오직 행위로만 환기되어',
      '두 시대·두 장소를 잇는 매개로 거듭 등장해',
    ],
    recover: [
      '결말에서 그 의미가 정반대로 뒤집히며',
      '인물이 그것을 버리거나 부수는 선택으로',
      '처음과 똑같은 장면이 전혀 다른 무게로 반복되어',
      '다음 세대에게 물려지며 의미가 확장되어',
      '인물의 내적 변화를 말없이 증명하며',
      '두 인물의 화해(혹은 결별)의 매개가 되어',
      '오랫동안 가렸던 진짜 의미가 드러나며',
      '상징을 손에서 놓는 순간 인물이 비로소 자유로워지며',
      '독자만 알고 인물은 끝내 모르는 아이러니로',
      '마지막 한 줄에서 단 한 단어로 호명되어',
      '잃어버린 그것을 되찾는 결말의 보상으로',
      '닳고 부서진 모습으로 세월의 무게를 증언하며',
      '전혀 다른 사물로 대체되며 변화를 못 박아',
      '인물이 그것에 새 의미를 부여하는 행위로',
      '모두가 떠난 자리에 홀로 남아 주제를 응축하며',
      '복제·모방되며 본래의 가치가 되물어지고',
      '한 인물의 유언·유품으로 의미가 봉인되어',
      '독자가 첫 장면을 다시 읽게 만드는 열쇠로',
      '두 갈래 해석을 동시에 허락하는 여백으로',
      '상징과 인물이 끝내 하나로 포개지며',
    ],
  },
  motif: {
    mean: [
      '점점 다가오는 파국의 카운트다운', '인물의 심리 변화의 온도계', '벗어날 수 없는 굴레',
      '세계관의 균열', '되풀이되는 역사', '치유되지 않는 트라우마', '경계를 넘나드는 긴장',
      '거짓의 누적', '잊히지 않는 약속', '커져가는 의심', '식어가는 사랑', '깊어지는 고립',
      '서서히 드러나는 정체', '쌓여가는 빚(대가)', '흐려지는 선과 악의 경계', '되살아나는 기억',
      '무너져가는 일상', '다가오는 변화의 예감', '반복되는 실패의 학습', '회복되어 가는 관계',
      '쌓여가는 침묵의 무게', '번져가는 불안', '굳어가는 결심', '엷어지는 죄의식', '되감기는 시간의 감각',
      '깊어지는 중독', '메말라가는 인정(人情)', '단단해지는 복수심', '느슨해지는 경계심', '짙어지는 향수(鄕愁)',
      '벌어지는 세대의 골', '쌓이는 거짓 위의 거짓', '되살아나는 오랜 습관', '커져가는 죄책의 그림자', '회복되는 자존',
    ],
    enter: [
      '각 장(章)의 첫 문장마다 형태를 달리해 등장하며',
      '인물이 위기에 처할 때마다 어김없이 나타나',
      '같은 대사·후렴이 상황에 따라 다른 뜻으로 변주되어',
      '챕터가 넘어갈 때마다 색·상태가 조금씩 변하며',
      '세 번의 등장에서 점점 강도가 커지도록 배치되어',
      '서로 다른 인물의 시점에서 각기 다르게 비치며',
      '낮과 밤, 과거와 현재를 잇는 다리로 거듭 쓰여',
      '소소한 배경음·풍경으로 흩뿌려져 누적되며',
      '인물의 습관적 동작으로 무의식 중에 반복되어',
      '같은 장소를 다시 찾을 때마다 변한 모습으로',
      '계절이 한 바퀴 돌 때마다 같은 자리에 돌아와',
      '서로 다른 인물이 같은 행위를 되풀이하며',
      '점점 짧아지는 간격으로 조여들듯 나타나',
      '꿈과 현실의 경계에서 거듭 어른거리며',
      '인물의 나이대마다 다른 의미로 다시 찾아와',
      '같은 노래·구절이 화자만 바뀌어 되울리며',
      '한 사물에서 다른 사물로 옮겨가며 형태를 바꿔',
      '매 등장마다 한 가지 디테일만 살짝 어긋나게',
      '클로즈업과 롱숏을 오가며 거리감을 달리해',
      '잊을 만하면 한 번씩 불쑥 끼어들어',
    ],
    recover: [
      '마지막 변주에서 첫 등장과 정반대로 뒤집히며',
      '쌓인 의미가 절정에서 한 번에 폭발하며',
      '반복이 마침내 끊기는 그 순간으로',
      '가장 약했던 첫 등장이 가장 강하게 회귀하며',
      '인물이 그 패턴을 스스로 깨뜨리는 선택으로',
      '독자가 횟수를 세어왔음을 보상하는 결정타로',
      '모티프의 의미가 통째로 재해석되며',
      '처음과 마지막을 수미상관으로 맞물리며',
      '반복의 주인이 다른 인물로 넘어가며',
      '끝내 사라짐(부재)으로써 존재를 증명하며',
      '쌓아온 모든 변주가 한 장면에 겹쳐지며',
      '반복을 멈추는 대신 영원히 이어질 암시로',
      '가장 사소했던 변주가 결정적 단서로 밝혀지며',
      '인물이 그 의미를 비로소 말로 발설하는 순간으로',
      '되풀이의 고리가 다음 세대로 넘겨지며',
      '한 번의 침묵(부재)이 모든 반복을 압도하며',
      '첫 변주의 진짜 뜻이 뒤늦게 해명되며',
      '독자와 인물의 해석이 마지막에 엇갈리며',
      '반복의 리듬 자체가 결말의 형식이 되어',
      '변주의 폭이 좁아지다 끝내 한 점으로 수렴하며',
    ],
  },
}

// 감각 채널(공용) — 징조·상징이 독자에게 와닿는 감각의 통로. 어떤 사물·의미와도 독립적으로 성립.
// 부사적 수식으로 쓰이므로 항상 '~게/~듯이/~로' 형태로 다른 슬롯과 충돌 없이 결합한다.
const SENSES = [
  '눈에 먼저 들어오게', '귓가에 맴도는 소리로', '코끝에 스미는 냄새로', '손끝에 닿는 감촉으로',
  '혀끝에 남는 맛처럼', '서늘한 한기로', '낯익은 듯 낯선 기척으로', '흐릿한 잔상으로',
  '메아리처럼 되울리며', '문득 떠오르는 기시감으로', '시야의 가장자리에서', '정적을 깨는 소리로',
  '온몸을 훑는 소름으로', '아련한 옛 냄새로', '눈에 띄지 않는 그림자로', '귓전을 스치는 속삭임으로',
  '발밑에서 전해오는 진동으로', '숨결처럼 가까이', '빛과 그늘의 어른거림으로', '계절의 공기로',
  '닿을 듯 닿지 않는 거리에서', '꿈결처럼 어렴풋이', '손에 잡힐 듯한 무게로', '먼 천둥처럼',
  '입속의 쓴맛으로', '살갗을 스치는 바람으로', '두 눈을 똑바로 마주하듯', '귓속말처럼 은밀히',
  '잔향처럼 길게 끌며', '눈 깜짝할 섬광으로', '오래 머무는 잔내음으로', '맥박처럼 규칙적으로',
  '한 박자 늦은 울림으로', '안개처럼 번지며', '돌연한 정적으로', '오감을 동시에 두드리며',
  '체온처럼 은근히', '날카로운 비명처럼', '나직한 한숨처럼', '물결처럼 일렁이며',
  '명치를 누르는 답답함으로', '코끝이 시린 찬 공기로', '귓속을 파고드는 이명처럼', '입안이 마르는 긴장으로',
  '뒷목이 곤두서는 기척으로', '눈앞이 흐려지는 현기증으로', '손바닥에 밴 땀처럼', '발끝이 저리는 예감으로',
  '가슴이 내려앉는 무게로', '숨이 턱 막히는 정적으로',
]

// 정서 색조(공용) — 대상에 입히는 분위기·감정의 결. 관형(꾸미는) 수식이라 어떤 사물에도 무리 없이 붙는다.
const TONES = [
  '서늘한', '아련한', '불온한', '쓸쓸한', '음습한', '나른한', '애틋한', '섬뜩한',
  '고즈넉한', '메마른', '아득한', '서글픈', '음울한', '청량한', '처연한', '아릿한',
  '괴괴한', '아찔한', '담담한', '쓸쓸하도록 고요한', '불길한', '애잔한', '서먹한', '서슬 푸른',
  '먹먹한', '아스라한', '스산한', '나직한', '희뿌연', '핏기 가신', '오싹한', '울적한',
  '아릿하게 달콤한', '서늘하게 아름다운', '낡고 정겨운', '음전한', '소슬한', '애처로운', '으스스한', '먼지 낀',
  '바스라질 듯 여린', '서리처럼 차가운', '잿빛으로 가라앉은', '햇살처럼 따스한', '꿈결 같은',
  '아릿하게 그리운', '날 선', '고요히 들끓는', '빛바랜', '아련하게 환한',
]

const SLOT_VALUES = (mode: ModeKey, key: SlotKey): string[] => {
  if (key === 'obj') return OBJECTS
  if (key === 'sense') return SENSES
  if (key === 'tone') return TONES
  return POOLS[mode][key]
}

const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]

// 조합수: 정서 색조 × 사물 × 감각 채널 × 의미 × 등장 × 회수
function combos(mode: ModeKey): number {
  const p = POOLS[mode]
  return TONES.length * OBJECTS.length * SENSES.length * p.mean.length * p.enter.length * p.recover.length
}
const fmt = (n: number) => n.toLocaleString('ko-KR')

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ---------- 진부함(클리셰) 경고 ----------
// 너무 닳은 '사물↔의미' 짝, 혹은 누구나 떠올리는 뻔한 의미를 가볍게 짚어 비틀기를 권한다.
const CLICHE_OBJ_MEAN: { obj: string; mean: string; note: string }[] = [
  { obj: '깨진 손거울', mean: '잃어버린 순수', note: '깨진 거울=불행/분열은 거의 관용구입니다.' },
  { obj: '멈춰 선 괘종시계', mean: '시간의 무상함', note: '멈춘 시계=죽음/정지는 매우 흔한 짝입니다.' },
  { obj: '바닥난 모래시계', mean: '곧 찾아올 죽음', note: '모래시계=남은 수명은 직설적이라 새롭지 않습니다.' },
  { obj: '한밤에 우는 까마귀', mean: '곧 찾아올 죽음', note: '까마귀=불길/죽음은 가장 닳은 징조입니다.' },
  { obj: '제 꼬리를 무는 뱀의 문양', mean: '죽음과 재생', note: '우로보로스=순환은 상징사전 1번 항목입니다.' },
  { obj: '시들어가는 화분의 꽃', mean: '시간의 무상함', note: '시든 꽃=쇠락은 너무 곧이곧대로입니다.' },
  { obj: '얼어붙은 강', mean: '깊어지는 고립', note: '얼음=차가움/단절은 일대일로 뻔합니다.' },
  { obj: '꺼지지 않는 촛불', mean: '되살아나는 기억', note: '촛불=생명/기억은 추모 클리셰에 가깝습니다.' },
]
const CLICHE_MEANS = new Set([
  '곧 찾아올 죽음', '시간의 무상함', '죽음과 재생',
])

interface ClicheHit { kind: 'pair' | 'mean'; note: string }
function clicheCheck(obj: string, mean: string): ClicheHit | null {
  if (!obj || !mean) return null
  const pair = CLICHE_OBJ_MEAN.find((c) => c.obj === obj && c.mean === mean)
  if (pair) return { kind: 'pair', note: pair.note }
  if (CLICHE_MEANS.has(mean)) return { kind: 'mean', note: `「${mean}」(은)는 흔히 쓰이는 의미라 식상해지기 쉽습니다.`.replace('(은)는', hasJong(mean) ? '은' : '는') }
  return null
}

interface SlotState { obj: string; mean: string; enter: string; recover: string; sense: string; tone: string }
const emptySlots = (): SlotState => ({ obj: '', mean: '', enter: '', recover: '', sense: '', tone: '' })
const SLOT_KEYS: SlotKey[] = ['obj', 'mean', 'enter', 'recover', 'sense', 'tone']

const composeText = (mode: Mode, s: SlotState): string =>
  mode.template({ obj: s.obj, mean: s.mean, enter: s.enter, recover: s.recover, sense: s.sense, tone: s.tone })

interface Fav { id: string; mode: ModeKey; slots: SlotState; text: string }

export default function OmenSymbolGen({ payload }: { payload?: Record<string, unknown> }) {
  const initMode: ModeKey =
    payload && typeof payload.mode === 'string' && MODES.some((m) => m.key === payload.mode)
      ? (payload.mode as ModeKey)
      : (() => {
          try {
            const raw = localStorage.getItem(LS + ':mode')
            if (raw && MODES.some((m) => m.key === raw)) return raw as ModeKey
          } catch { /* ignore */ }
          return 'omen'
        })()

  const [mode, setMode] = useState<ModeKey>(initMode)
  const [slots, setSlots] = useState<SlotState>(emptySlots)
  const [locked, setLocked] = useState<Record<SlotKey, boolean>>({ obj: false, mean: false, enter: false, recover: false, sense: false, tone: false })
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
          return arr.filter((f) => f && typeof f.text === 'string').map((f) => ({
            id: typeof f.id === 'string' ? f.id : 'f_' + Math.random().toString(36).slice(2),
            mode: MODES.some((m) => m.key === f.mode) ? f.mode : 'omen',
            slots: { obj: '', mean: '', enter: '', recover: '', sense: '', tone: '', ...(f.slots || {}) },
            text: String(f.text),
          }))
        }
      }
    } catch { /* ignore */ }
    return []
  })
  const toastTimer = useRef<number | null>(null)

  // 모드 저장
  useEffect(() => {
    try { localStorage.setItem(LS + ':mode', mode) } catch { /* ignore */ }
  }, [mode])

  // 보관함 저장
  useEffect(() => {
    try { localStorage.setItem(LS + ':favs', JSON.stringify(favs)) } catch { /* ignore */ }
  }, [favs])

  // 토스트 자동 해제 + 언마운트 정리
  const flash = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1800)
  }, [])
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }, [])

  // 굴림 애니메이션 자동 해제 + 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => setRolling(false), 360)
    return () => window.clearTimeout(t)
  }, [rolling])

  // 모드를 바꾸면 의미/등장/회수 풀이 달라지므로 잠기지 않은 칸은 비운다(사물·감각·색조는 공용이라 유지).
  const switchMode = (m: ModeKey) => {
    if (m === mode) return
    setMode(m)
    setSlots((prev) => ({
      obj: prev.obj,
      sense: prev.sense,
      tone: prev.tone,
      mean: locked.mean ? prev.mean : '',
      enter: locked.enter ? prev.enter : '',
      recover: locked.recover ? prev.recover : '',
    }))
    setCopied(false)
  }

  const roll = useCallback(() => {
    setCopied(false)
    setRolling(true)
    setSlots((prev) => {
      const next: SlotState = { ...prev }
      SLOT_KEYS.forEach((k) => {
        if (locked[k] && prev[k]) return // 잠긴 칸은 유지
        const pool = SLOT_VALUES(mode, k)
        let v = pick(pool)
        if (v === prev[k] && pool.length > 1) v = pick(pool) // 같은 값 연속 방지
        next[k] = v
      })
      return next
    })
  }, [mode, locked])

  const rerollOne = (k: SlotKey) => {
    setCopied(false)
    setRolling(true)
    setSlots((prev) => {
      const pool = SLOT_VALUES(mode, k)
      let v = pick(pool)
      if (v === prev[k] && pool.length > 1) v = pick(pool)
      return { ...prev, [k]: v }
    })
  }

  const toggleLock = (k: SlotKey) => setLocked((prev) => ({ ...prev, [k]: !prev[k] }))

  const modeObj = MODES.find((m) => m.key === mode)!
  const ready = !!(slots.obj && slots.mean && slots.enter && slots.recover && slots.sense && slots.tone)
  const text = ready ? composeText(modeObj, slots) : ''
  const cliche = clicheCheck(slots.obj, slots.mean)

  const plainBlock = () =>
    [
      `${modeObj.icon} ${modeObj.label}`,
      `🎨 정서 색조: ${slots.tone}`,
      `🍂 사물·자연현상: ${slots.obj}`,
      `👁 감각 채널: ${slots.sense}`,
      `💠 상징 의미: ${slots.mean}`,
      `🚪 등장 방식: ${slots.enter}`,
      `🎯 회수 방식: ${slots.recover}`,
      '',
      `🔮 ${text}`,
      cliche ? `\n⚠ 진부함 주의: ${cliche.note}` : '',
    ].filter(Boolean).join('\n')

  const copy = () => {
    if (!ready) return
    navigator.clipboard?.writeText(plainBlock()).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    }).catch(() => flash('이 환경에서는 복사가 지원되지 않습니다.'))
  }

  // 스니펫 라이브러리 저장 — 영감 메모로 재사용.
  const saveSnippet = () => {
    if (!ready) return
    addToLibrary('snippets', {
      text: `[${modeObj.label}] ${text}`,
      source: '징조·상징 생성기',
      tags: ['글감', '복선', '상징', modeObj.label],
    })
    flash('스니펫 라이브러리에 저장했습니다.')
  }

  // 보관함 추가
  const addFav = () => {
    if (!ready) return
    setFavs((prev) => [
      { id: 'f_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), mode, slots: { ...slots }, text },
      ...prev,
    ])
    flash('보관함에 추가했습니다.')
  }
  const removeFav = (id: string) => setFavs((prev) => prev.filter((f) => f.id !== id))
  const restoreFav = (f: Fav) => {
    setMode(f.mode)
    setSlots({ ...f.slots })
    setLocked({ obj: false, mean: false, enter: false, recover: false, sense: false, tone: false })
    setTab('gen')
    setCopied(false)
  }

  // 프로젝트 연동 — 생성한 징조·상징을 자료(research)/〈영감 메모〉 폴더에 문서로 추가.
  const bodyHtml = (m: Mode, s: SlotState, t: string, c: ClicheHit | null) =>
    [
      `<p style="font-size:15px;line-height:1.7;"><b>${esc(m.icon)} ${esc(t)}</b></p>`,
      `<hr/>`,
      `<p><b>🎨 정서 색조:</b> ${esc(s.tone)}</p>`,
      `<p><b>🍂 사물·자연현상:</b> ${esc(s.obj)}</p>`,
      `<p><b>👁 감각 채널:</b> ${esc(s.sense)}</p>`,
      `<p><b>💠 상징 의미:</b> ${esc(s.mean)}</p>`,
      `<p><b>🚪 등장 방식(심기):</b> ${esc(s.enter)}</p>`,
      `<p><b>🎯 회수 방식(거두기):</b> ${esc(s.recover)}</p>`,
      c ? `<p style="color:#b26a00;"><b>⚠ 진부함 주의:</b> ${esc(c.note)} 한 단계 비틀어 보세요.</p>` : '',
    ].filter(Boolean).join('')

  const toProject = () => {
    if (!ready) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '영감 메모',
      title: `${modeObj.icon} ${modeObj.label} — ${slots.obj}`,
      bodyHtml: bodyHtml(modeObj, slots, text, cliche),
      synopsis: text,
      meta: { 유형: modeObj.label, 사물: slots.obj, 의미: slots.mean },
    })
    flash(id ? '프로젝트 자료 〈영감 메모〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  const total = combos(mode)

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>색조·사물·감각·의미·등장·회수</b> 슬롯을 굴려 복선이 될 <b>징조·상징</b>을 만드세요. 작법상 좋은 상징은 <b>심기(등장) → 회수(거두기)</b>가 짝을 이룹니다. 마음에 드는 칸은 <Emoji e="🔒" />로 고정하고 나머지만 다시 굴리세요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('gen')} aria-pressed={tab === 'gen'}
          style={{ borderColor: tab === 'gen' ? 'var(--accent)' : 'var(--border)', color: tab === 'gen' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🔮" /> 생성
        </button>
        <button className="minibtn" onClick={() => setTab('fav')} aria-pressed={tab === 'fav'}
          style={{ borderColor: tab === 'fav' ? 'var(--accent)' : 'var(--border)', color: tab === 'fav' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐" /> 보관함 ({favs.length})
        </button>
      </div>

      {tab === 'gen' && (
        <>
          {/* 모드 선택 */}
          <div style={{ display: 'flex', gap: 6 }}>
            {MODES.map((m) => {
              const on = m.key === mode
              return (
                <button key={m.key} className="minibtn" onClick={() => switchMode(m.key)} aria-pressed={on} title={m.desc}
                  style={{ flex: 1, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)', fontWeight: on ? 700 : 400 }}>
                  <Emoji e={m.icon} /> {m.label}
                </button>
              )
            })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>{modeObj.desc}</div>

          {/* 조합수 */}
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            가능한 {modeObj.label} 조합: <b style={{ color: 'var(--accent)' }}>{fmt(total)}</b>가지
          </div>

          {/* 슬롯들 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {SLOTS.map((sl) => {
              const isLocked = !!locked[sl.key]
              const val = slots[sl.key]
              return (
                <div key={sl.key} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-10deg) scale(1.12)' : 'none' }}>
                    <Emoji e={sl.icon} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }} title={sl.hint}>{sl.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: val ? 'var(--text)' : 'var(--muted)' }}>
                      {val ? (rolling && !isLocked ? '…' : val) : '— 굴려주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => rerollOne(sl.key)} title="이 칸만 다시 굴리기" style={{ flexShrink: 0 }}><Emoji e="🎲" /></button>
                  <button className="minibtn" onClick={() => toggleLock(sl.key)} title={isLocked ? '고정 해제' : '이 칸 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 진부함 경고 */}
          {ready && cliche && (
            <div style={{ background: 'var(--panel)', border: '1px solid var(--warn)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: 'var(--warn)', lineHeight: 1.5 }}>
              <Emoji e="⚠" /> <b>진부함 주의</b> — {cliche.note} 같은 사물에 <b>예상 밖의 의미</b>를 얹거나, 의미를 그대로 두되 <b>등장·회수 방식을 비틀어</b> 신선하게 만들어 보세요.
            </div>
          )}

          {/* 완성된 징조·상징 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🔮" /> {modeObj.label} 한 벌</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: ready ? 'var(--text)' : 'var(--muted)' }}>
              {ready ? text : '슬롯을 굴려 징조·상징을 완성하세요.'}
            </div>
          </div>

          {/* 동작 버튼 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={roll}><Emoji e="🎲" /> 굴리기 / 다시 섞기</button>
            <button className="minibtn" onClick={copy} disabled={!ready}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={addFav} disabled={!ready} style={{ flex: 1 }}><Emoji e="⭐" /> 보관함에 담기</button>
            <button className="minibtn" onClick={saveSnippet} disabled={!ready} style={{ flex: 1 }} title="스니펫 라이브러리에 저장"><Emoji e="🧷" /> 스니펫 저장</button>
          </div>

          {/* 프로젝트 연계 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={toProject} disabled={!ready || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !ready ? '먼저 징조·상징을 완성하세요' : '생성물을 프로젝트 자료(영감 메모 폴더)에 문서로 추가'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
          </div>

          {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
          <div style={hint}>이 조합은 출발점입니다. 등장은 눈에 띄지 않게 심고, 회수는 독자가 무릎을 치도록 — 심은 만큼만 거두세요.</div>
        </>
      )}

      {tab === 'fav' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {favs.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐" /></div>
              보관한 징조·상징이 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성 탭에서 <Emoji e="⭐" /> 보관함에 담기를 눌러 모아보세요.</span>
            </div>
          )}
          {favs.map((f) => {
            const m = MODES.find((x) => x.key === f.mode)!
            return (
              <div key={f.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap' }}>
                    <Emoji e={m.icon} /> {m.label}
                  </span>
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => restoreFav(f)} title="생성 탭으로 불러오기">↩ 불러오기</button>
                  <button className="minibtn" onClick={() => { navigator.clipboard?.writeText(`[${m.label}] ${f.text}`).catch(() => { /* graceful */ }); flash('복사했습니다.') }} title="복사"><Emoji e="📋" /></button>
                  <button className="minibtn" onClick={() => removeFav(f.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑" /></button>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6 }}>{f.text}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="🍂" /> {f.slots.obj} · <Emoji e="💠" /> {f.slots.mean}</div>
              </div>
            )
          })}
          {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
        </div>
      )}
    </div>
  )
}
