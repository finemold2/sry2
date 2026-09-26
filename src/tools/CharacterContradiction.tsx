// 인물 모순 생성기 — 인물에게 입체성을 부여하는 '겉모습/태도 vs 속마음/진실'의 모순 쌍과,
//   그 모순이 드러나는 순간·뿌리(까닭)를 로컬 조합으로 대량 생성한다.
//   슬롯별 🔒 잠금 + 부분 재생성, 조합수(만+) 표시, 보관함(localStorage 자동 저장/복원).
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage 만 사용.
// 연계(linkbus): 만든 모순을 인물 시트로 보내거나, 프로젝트 자료('인물 메모')에 카드/메모로 추가한다.
import { useEffect, useMemo, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = { id: 'character-contradiction', name: '인물 모순 생성기', icon: '🎭', group: '영감·발상', intro: '겉모습/태도 vs 속마음/진실의 모순 쌍과 그것이 드러나는 순간으로 입체적 인물을 빚으세요', w: 560, h: 660 }

const LS = 'sry:tool:character-contradiction'

// ── 모순 쌍(겉 vs 속). 의미 있는 대비가 되도록 직접 큐레이션한 쌍들. ──
// [겉모습/태도(남들이 보는 면), 속마음/진실(숨긴 면), 한 줄 라벨]
type Pair = { face: string; truth: string; label: string }
const PAIRS: Pair[] = [
  { face: '늘 냉정하고 무심해 보인다', truth: '사실은 누구보다 정이 많아 남몰래 챙긴다', label: '냉정한 척하지만 정 많은' },
  { face: '용감하고 거침없는 척한다', truth: '속으로는 겁이 많아 늘 떨고 있다', label: '용감한 척하는 겁쟁이' },
  { face: '모두에게 다정하고 친절하다', truth: '진심으로 가까이 둔 사람은 하나도 없다', label: '다정하지만 외로운' },
  { face: '자신만만하고 당당해 보인다', truth: '실은 자기 자신을 가장 믿지 못한다', label: '자신감 뒤의 자기불신' },
  { face: '농담을 던지며 늘 웃고 다닌다', truth: '웃음으로 깊은 슬픔과 상처를 가린다', label: '웃음 뒤에 우는' },
  { face: '원칙을 철저히 지키는 정직한 사람', truth: '단 하나, 평생 숨긴 거짓말이 있다', label: '정직함 속의 거짓' },
  { face: '돈과 출세에 관심 없는 척한다', truth: '누구보다 인정받고 싶어 안달한다', label: '초연한 척하는 야심가' },
  { face: '강하고 독립적이어서 도움을 거절한다', truth: '실은 기댈 사람이 절실히 필요하다', label: '강한 척하는 외톨이' },
  { face: '느긋하고 게을러 보인다', truth: '남몰래 누구보다 치밀하게 준비한다', label: '게으른 척하는 완벽주의자' },
  { face: '신앙심 깊고 도덕을 설파한다', truth: '스스로 그 계율을 가장 많이 어겼다', label: '경건함 뒤의 위선' },
  { face: '겁쟁이에 소심해 보인다', truth: '결정적 순간엔 누구보다 대담해진다', label: '소심한 척하는 대담함' },
  { face: '늘 화가 나 있고 까칠하다', truth: '상처받지 않으려 일부러 가시를 세운다', label: '분노로 두른 약함' },
  { face: '모든 일에 무관심한 냉소가', truth: '세상을 너무 사랑해서 실망이 두려울 뿐', label: '냉소 뒤의 이상주의자' },
  { face: '완벽하고 흠 없는 모범생', truth: '들키면 끝장날 비밀을 품고 산다', label: '완벽함 아래의 비밀' },
  { face: '거칠고 험상궂은 외모와 말투', truth: '여린 마음에 작은 생명도 못 해친다', label: '험한 겉모습의 여린 속' },
  { face: '늘 베풀고 희생하는 성인 같은 사람', truth: '그 친절로 사람들을 통제하려 한다', label: '선의로 위장한 지배욕' },
  { face: '명랑하고 긍정적인 분위기 메이커', truth: '혼자 있으면 끝없는 공허에 잠긴다', label: '밝음 뒤의 공허' },
  { face: '규칙과 질서를 사랑하는 보수적인 사람', truth: '마음속엔 모든 걸 부수고 싶은 충동이 있다', label: '질서 아래의 파괴 충동' },
  { face: '누구에게나 솔직하고 거침없다', truth: '정작 자기 진짜 감정은 한 번도 말한 적 없다', label: '솔직함 뒤의 침묵' },
  { face: '약자를 돕는 정의로운 영웅', truth: '인정받고 싶은 허영이 진짜 동기다', label: '정의 뒤의 허영' },
  { face: '늘 평온하고 화를 내지 않는다', truth: '속에 폭발 직전의 분노를 눌러 담고 있다', label: '평온 아래의 화산' },
  { face: '돈에 인색하고 구두쇠처럼 군다', truth: '몰래 더 어려운 이들에게 다 내준다', label: '구두쇠로 위장한 자선가' },
  { face: '자유분방하고 얽매이기 싫어한다', truth: '실은 누군가에게 단단히 속하고 싶다', label: '자유 뒤의 소속 갈망' },
  { face: '똑똑하고 박식함을 자랑한다', truth: '가장 중요한 것 하나를 끝내 이해 못 한다', label: '지식 뒤의 무지' },
  { face: '과거 따위 신경 안 쓴다고 한다', truth: '매일 밤 그 과거에 발목 잡혀 있다', label: '초연한 척하는 과거의 포로' },
  { face: '누구보다 충성스럽고 헌신적이다', truth: '결정적 순간에 배신할 이유를 품고 있다', label: '충성 뒤의 배신' },
  { face: '겸손하게 자신을 낮춘다', truth: '속으로는 모두를 내려다본다', label: '겸손으로 가린 오만' },
  { face: '두려움이 없는 듯 행동한다', truth: '단 하나, 결코 마주할 수 없는 공포가 있다', label: '담대함 속의 단 하나의 공포' },
  { face: '타인을 잘 믿고 순진해 보인다', truth: '모든 사람을 계산하고 의심하고 있다', label: '순진함으로 위장한 계산' },
  { face: '엄격하고 무뚝뚝한 어른', truth: '서툴러서 표현을 못 할 뿐 깊이 사랑한다', label: '무뚝뚝함 뒤의 사랑' },
  { face: '늘 옳은 말만 하는 도덕가', truth: '정작 자기 삶은 무너져 있다', label: '말과 삶의 모순' },
  { face: '강철 같은 멘탈의 리더', truth: '아무도 모르게 매일 무너지고 다시 세운다', label: '강철 멘탈 뒤의 균열' },
  { face: '세상 물정에 밝은 현실주의자', truth: '마음 한구석에 이룰 수 없는 꿈을 숨긴다', label: '현실주의자의 비밀스러운 꿈' },
  { face: '거짓말을 일삼는 사기꾼', truth: '단 한 사람에게만은 끝까지 진실하다', label: '거짓말쟁이의 단 하나의 진실' },
  { face: '복수심에 불타는 무서운 사람', truth: '정작 원수를 마주하면 미워하지 못한다', label: '복수자의 마주할 수 없는 미움' },
  { face: '모든 책임을 회피하는 무책임한 사람', truth: '남몰래 가장 큰 짐을 혼자 지고 있다', label: '무책임함으로 가린 책임' },
  { face: '늘 침착하고 빈틈없는 전문가다', truth: '실은 한 가지 일에선 손도 못 댈 만큼 서툴다', label: '완벽함 속의 서투름' },
  { face: '누구의 칭찬에도 흔들리지 않는다', truth: '단 한마디 칭찬을 평생 기다려 왔다', label: '무덤덤함 뒤의 갈망' },
  { face: '과묵해서 속을 알 수 없는 사람', truth: '머릿속은 한순간도 쉬지 않고 떠들고 있다', label: '침묵 뒤의 소란' },
  { face: '늘 남을 먼저 챙기는 헌신적인 사람', truth: '정작 자신은 어떻게 돌보는지 모른다', label: '헌신 뒤의 자기방치' },
  { face: '냉철하게 손익만 따지는 사람', truth: '단 한 번 손해 보는 선택에 모든 걸 건다', label: '계산 속의 한 번의 무모함' },
  { face: '늘 웃으며 갈등을 피하는 평화주의자', truth: '마음속엔 누구보다 강한 승부욕이 끓는다', label: '온화함 아래의 승부욕' },
  { face: '예의 바르고 격식을 차리는 사람', truth: '그 예의로 사람과의 거리를 단단히 지킨다', label: '예의로 친 울타리' },
  { face: '모험을 즐기는 자유로운 영혼', truth: '실은 변화가 두려워 늘 같은 길로 돌아온다', label: '모험가의 숨은 두려움' },
  { face: '아무것도 바라지 않는 듯 담백하다', truth: '사실 누구보다 많은 것을 원하고 있다', label: '담백함 뒤의 욕심' },
  { face: '늘 바쁘게 무언가에 몰두한다', truth: '멈추면 떠오를 생각이 무서워 도망치는 것이다', label: '분주함으로 가린 회피' },
  { face: '단호하게 선을 긋는 차가운 사람', truth: '거절할 때마다 속으로 더 아파한다', label: '단호함 뒤의 죄책감' },
  { face: '낙천적으로 모든 걸 웃어넘긴다', truth: '진지하게 받아들이면 무너질까 두려워서다', label: '낙천 뒤의 두려움' },
  { face: '남의 시선 따위 신경 쓰지 않는다', truth: '실은 단 한 사람의 시선에 모든 게 흔들린다', label: '무신경 속의 단 하나의 시선' },
  { face: '늘 옳은 선택만 하는 신중한 사람', truth: '평생 단 한 번의 충동을 후회하며 산다', label: '신중함 뒤의 후회' },
  { face: '모두와 두루 잘 지내는 사교가다', truth: '집에 돌아오면 사람에 지쳐 텅 비어 버린다', label: '사교성 뒤의 소진' },
  { face: '강한 신념으로 한길만 걷는다', truth: '그 신념이 옳은지 매일 밤 의심한다', label: '신념 아래의 의심' },
  { face: '늘 베푸는 너그러운 사람', truth: '받기만 하면 빚처럼 마음이 무거워서다', label: '너그러움 뒤의 부채감' },
  { face: '감정을 드러내지 않는 이성적인 사람', truth: '한번 무너지면 누구보다 격하게 운다', label: '이성 아래의 격정' },
  { face: '실패를 두려워하지 않는 도전가', truth: '실은 성공한 뒤가 더 두려운 사람이다', label: '도전 뒤의 성공 공포' },
  { face: '늘 어른스럽고 의젓한 사람', truth: '마음 한편엔 자라지 못한 아이가 운다', label: '어른 뒤의 어린아이' },
  { face: '누구의 부탁도 거절 못 하는 사람', truth: '거절당하는 게 두려워 먼저 다 들어준다', label: '친절 뒤의 거절 공포' },
  { face: '세상을 다 아는 듯 초연한 노장', truth: '아직 풀지 못한 단 하나의 물음에 매여 있다', label: '초연함 속의 미련' },
  { face: '늘 정답을 알려 주는 똑 부러진 사람', truth: '정작 자기 마음의 답은 한 번도 못 찾았다', label: '명쾌함 뒤의 미궁' },
  { face: '겉으론 모두를 용서한 듯 평화롭다', truth: '단 한 사람만은 끝내 용서하지 못했다', label: '용서 뒤의 단 하나의 원한' },
  { face: '돈을 펑펑 쓰는 호탕한 사람', truth: '텅 빈 마음을 물건으로 채우려는 것이다', label: '풍요 뒤의 결핍' },
  { face: '늘 새로운 사람을 반기는 열린 사람', truth: '정작 오래된 인연 하나를 끝내 못 놓는다', label: '개방성 뒤의 집착' },
  { face: '약속을 철석같이 지키는 사람', truth: '자기 자신과의 약속만은 늘 어긴다', label: '신의 속의 자기배신' },
  { face: '모든 것을 통제하려는 완고한 사람', truth: '단 하나 자기 감정만은 통제하지 못한다', label: '통제 뒤의 무력' },
]

// ── 모순이 드러나는 순간(상황 트리거) ──
const MOMENTS: string[] = [
  '가장 사랑하는 사람이 위험에 처했을 때',
  '아무도 보지 않는다고 생각한 순간',
  '술에 취해 경계가 무너졌을 때',
  '아이나 약한 존재 앞에 섰을 때',
  '오랜 적과 단둘이 마주쳤을 때',
  '죽음을 눈앞에 둔 마지막 순간',
  '과거의 상처를 건드리는 말을 들었을 때',
  '예상치 못한 친절을 받았을 때',
  '모든 것을 잃고 무너진 순간',
  '비밀이 들통날 위기에 처했을 때',
  '한밤중 홀로 거울 앞에 섰을 때',
  '믿었던 사람에게 배신당했을 때',
  '갑작스러운 재회로 옛 감정이 되살아났을 때',
  '큰 성공을 거둔 바로 그 순간',
  '누군가 진심으로 자기를 알아봐 주었을 때',
  '거짓 가면을 더는 쓸 수 없게 된 순간',
  '오랜 목표를 코앞에 두고 망설일 때',
  '낯선 이의 죽음을 목격했을 때',
  '평소라면 절대 하지 않을 선택을 강요받을 때',
  '술자리·장례식처럼 감정이 풀어지는 자리에서',
  '편지나 유품을 우연히 발견했을 때',
  '자신과 똑 닮은 사람을 만났을 때',
  '한순간의 방심으로 본심이 새어 나올 때',
  '극한의 피로와 압박에 무너진 새벽',
  '오랜 라이벌이 먼저 손을 내밀었을 때',
  '자신이 가장 숨기고 싶던 약점을 들켰을 때',
  '책임이 자기 한 사람에게 모두 쏠렸을 때',
  '아무 대가 없는 호의를 처음 받았을 때',
  '닮고 싶지 않던 사람을 그대로 닮아 가고 있음을 깨달았을 때',
  '한순간의 선택이 누군가의 운명을 가른 직후',
  '오래 미뤄 둔 진실을 더는 미룰 수 없게 된 순간',
  '익숙한 일상이 한순간에 무너져 내렸을 때',
  '누군가 자신의 거짓을 알면서도 모른 척해 주었을 때',
  '돌이킬 수 없는 말을 내뱉고 만 직후',
  '오랜 침묵 끝에 누군가 먼저 안부를 물어 왔을 때',
  '자기 손으로 키운 결과와 정면으로 마주했을 때',
  '도움을 청해야만 살아남을 수 있게 된 순간',
  '잊고 지내던 옛 약속이 불쑥 되돌아왔을 때',
  '모두가 떠난 텅 빈 자리에 홀로 남았을 때',
]

// ── 모순의 뿌리(왜 이런 모순이 생겼나) ──
const ROOTS: string[] = [
  '어린 시절 약함을 보였다가 크게 다친 적이 있어서',
  '소중한 사람을 지키지 못했다는 죄책감 때문에',
  '한 번의 큰 실패가 평생의 두려움이 되어서',
  '가족에게 끝내 인정받지 못한 결핍 때문에',
  '믿었던 이에게 깊이 배신당한 기억 때문에',
  '살아남기 위해 진짜 자신을 버려야 했기에',
  '사랑을 받아본 적이 없어 줄 줄도 모르기에',
  '되고 싶었던 사람이 끝내 되지 못해서',
  '한때의 잘못을 평생 속죄하려 해서',
  '강해 보여야만 살아남는 환경에서 자라서',
  '가장 약한 모습을 들켰을 때의 수치 때문에',
  '지키고 싶은 것이 너무 많아 두려운 탓에',
  '진심이 늘 비웃음으로 돌아온 경험 때문에',
  '자신을 미워하는 마음을 숨기고 싶어서',
  '한 사람을 잃은 상실이 아직 끝나지 않아서',
  '기대를 저버릴까 봐 차라리 거리를 두려고',
  '늘 비교당하며 자라 진짜 자신을 잃어버려서',
  '한 번 받은 도움을 평생의 빚으로 여겨서',
  '약속을 어긴 부모를 보며 자라 신뢰를 잃어서',
  '울면 안 된다는 말을 들으며 감정을 묻어 와서',
  '가진 것을 빼앗긴 기억이 결핍으로 남아서',
  '완벽해야만 사랑받는다고 믿으며 자라서',
  '누구에게도 속을 보이면 안 되는 환경에서 살아서',
  '한 번의 칭찬이 평생의 기준이 되어 버려서',
  '책임을 떠넘기는 어른들 틈에서 혼자 견뎌서',
  '진심을 말했다가 비웃음만 산 기억 때문에',
  '떠나간 사람을 붙잡지 못한 후회가 남아서',
  '실수가 곧 처벌이던 시절을 통과해 와서',
  '돌봐 줄 사람 없이 스스로를 키워야 했기에',
  '오래 감춰 온 진짜 모습을 잃어버릴까 두려워서',
  '한때 가졌던 믿음이 산산이 부서진 적이 있어서',
  '늘 누군가의 그늘에 가려 자기 자리를 못 찾아서',
]

// ── 무심코 본심이 새어 나오는 작은 신호(들키는 버릇) — 명사구 ──
//   "무심코 ~로 본심이 새어 나온다" 형태로 쓰인다. 다른 슬롯과 독립적인 행동 단서.
const TELLS: string[] = [
  '긴장하면 한쪽 손가락을 쉴 새 없이 매만지는 버릇',
  '거짓말을 할 때 미세하게 떨리는 목소리 끝',
  '들키기 싫은 감정 앞에서 괜히 화제를 돌리는 말투',
  '아무렇지 않은 척할수록 빨라지는 말 속도',
  '진심을 들켰을 때 순간 굳어 버리는 표정',
  '동요할 때 자기도 모르게 시선을 피하는 눈',
  '애써 웃을 때 끝까지 펴지지 않는 입꼬리',
  '마음이 흔들리면 무의식적으로 만지는 낡은 물건',
  '약한 소리를 들을 때 잠깐 멎는 듯한 숨',
  '속내를 감추려 평소보다 길어지는 침묵',
  '당황하면 같은 말을 반복하는 입버릇',
  '아픈 곳을 찔리면 도리어 농담으로 받아치는 반사',
  '정곡을 찔렸을 때 살짝 떨리는 손끝',
  '진심을 묻는 질문 앞에서 헛기침을 하는 습관',
  '감정을 숨길수록 또박또박해지는 말씨',
  '들통날까 두려울 때 자꾸 문 쪽을 살피는 눈길',
  '속상할수록 더 무뚝뚝해지는 말투',
  '마음을 들켰을 때 괜히 옷매무새를 고치는 손',
  '거짓을 말하기 직전 한 박자 늦어지는 대답',
  '약속을 떠올릴 때 잠시 어두워지는 낯빛',
  '진심에 가까워질수록 작아지는 목소리',
  '불안할 때 무심코 발끝을 까딱이는 버릇',
  '들키고 싶지 않은 이름 앞에서 멈칫하는 호흡',
  '감추고 싶을수록 과장되게 밝아지는 웃음',
  '핵심을 피할 때 빙 둘러 가는 말버릇',
  '마음이 동할 때 슬며시 주먹을 쥐는 손',
  '본심을 들켰을 때 화부터 내고 보는 성미',
  '진실 앞에서 한참을 망설이다 삼키는 말',
]

// ── 속이 진짜 바라는 것(겉으론 부정하는 욕망) — 명사구(목적어) ──
//   "정작 마음 깊은 곳에서는 ~을/를 바란다" 형태. 조사는 받침으로 자동 선택.
const DESIRES: string[] = [
  '있는 그대로의 자신을 인정받는 것',
  '단 한 사람만이라도 끝까지 곁에 남는 것',
  '무너져도 괜찮다는 말 한마디',
  '아무 조건 없이 받아들여지는 안식',
  '한 번쯤 마음 놓고 약해질 수 있는 자리',
  '지나간 잘못을 용서받는 순간',
  '누군가의 자랑이 되는 것',
  '두려움 없이 사랑하고 사랑받는 것',
  '제 손으로 무언가를 끝까지 지켜내는 것',
  '잃어버린 그 시절로 단 하루만 돌아가는 것',
  '아무에게도 들키지 않은 진심을 알아봐 주는 눈',
  '오래 미뤄 둔 꿈을 마침내 좇는 자유',
  '누구의 기대도 짊어지지 않은 하루',
  '진심을 말해도 비웃음 사지 않는 안전',
  '떠나간 사람에게 끝내 못 한 말 한마디',
  '자기 자신과 화해하는 것',
  '쓸모로 증명하지 않아도 머무를 수 있는 곳',
  '한 번쯤 마음껏 울 수 있는 시간',
  '평범하고 조용한 보통의 행복',
  '제 안의 어린아이를 다독여 주는 손길',
  '누군가에게 정말로 필요한 사람이 되는 것',
  '실패해도 다시 시작할 수 있다는 믿음',
  '오래 미워한 마음을 내려놓는 가벼움',
  '거짓 가면을 벗고도 사랑받는 것',
  '먼저 손을 내밀어도 거절당하지 않는 용기',
  '자신의 선택을 스스로 떳떳하게 여기는 것',
  '아무 이유 없이 기댈 수 있는 어깨',
  '끝내 인정받지 못한 노력을 알아주는 한 사람',
]

// ── 그 가면을 지키느라 치르는 대가 — 명사구(목적어) ──
//   "그 가면을 지키느라 ~을/를 치르고 있다" 형태.
const COSTS: string[] = [
  '아무도 진짜 자신을 모른다는 외로움',
  '늘 연기하느라 점점 지워지는 진짜 얼굴',
  '가까워질 만하면 스스로 끊어 내는 인연',
  '쉴 새 없이 긴장한 탓에 마르지 않는 피로',
  '진심을 말할 기회를 매번 놓치는 후회',
  '곁을 내주지 못해 텅 비어 가는 마음',
  '들킬까 봐 잠 못 드는 수많은 밤',
  '도움을 청하지 못해 혼자 짊어지는 무게',
  '웃는 가면 아래 곪아 가는 상처',
  '누구와도 깊어지지 못하는 얕은 관계들',
  '제 감정을 자기조차 알 수 없게 된 혼란',
  '한 번도 온전히 쉬어 본 적 없는 마음',
  '자기 편을 끝내 만들지 못한 고립',
  '진짜로 원하는 것을 외면해 온 세월',
  '사소한 호의에도 의심부터 드는 마음의 굳은살',
  '늘 강해 보여야 한다는 끝없는 압박',
  '솔직해질 용기를 잃어버린 자신',
  '사랑하면서도 끝내 다가가지 못하는 거리',
  '자신을 속이는 데 익숙해진 무뎌짐',
  '진심이 통할 거라는 믿음의 상실',
  '들키지 않으려 점점 좁아지는 세계',
  '겉과 속의 틈에서 흔들리는 자기 확신',
  '누군가를 온전히 믿어 본 기억의 부재',
  '돌아갈 진짜 자신을 잃어버릴지 모른다는 불안',
  '가면이 곧 자신이 되어 버릴지 모른다는 두려움',
  '끝내 아무에게도 닿지 못하는 진심',
]

// ── 가면이 벗겨질 때 가장 두려워하는 결과 — 명사구(목적어) ──
//   "들통나는 순간 ~을/를 가장 두려워한다" 형태.
const FEARS: string[] = [
  '실망한 눈빛으로 등을 돌리는 사람들',
  '여태 쌓아 온 모든 것이 무너지는 것',
  '약하다는 사실이 만천하에 드러나는 것',
  '더는 필요 없는 사람으로 버려지는 것',
  '겨우 얻은 신뢰를 한순간에 잃는 것',
  '혼자라는 진실과 정면으로 마주하는 것',
  '비웃음거리가 되어 자리를 잃는 것',
  '소중한 사람이 진짜 자신을 보고 떠나는 것',
  '지금껏 한 모든 것이 거짓이었다고 여겨지는 것',
  '용서받을 자격조차 없다는 선고',
  '연민의 눈길을 받는 처지가 되는 것',
  '다시는 강한 사람으로 보이지 못하는 것',
  '곁에 남은 단 한 사람마저 잃는 것',
  '오래 숨긴 진심이 비웃음으로 돌아오는 것',
  '스스로 세운 자신이 거짓이었음을 인정하는 것',
  '아무도 자신을 변호해 주지 않는 침묵',
  '돌이킬 수 없이 멀어지는 관계',
  '쌓아 온 평판이 하루아침에 무너지는 것',
  '진짜 모습이 사랑받지 못한다는 확인',
  '약점을 빌미로 휘둘리게 되는 것',
  '믿어 준 사람들을 배신한 사람이 되는 것',
  '다시 그 옛날의 무력한 자신으로 돌아가는 것',
  '가까스로 덮어 둔 과거가 다시 들춰지는 것',
  '끝내 이해받지 못한 채 홀로 남는 것',
]

// ── 한국어 조사 자동 선택 헬퍼(받침 유무로 실제 형태 하나만 출력) ──
//   결과에 "을(를)" 같은 괄호 이중표기를 절대 노출하지 않기 위함.
function hasJong(word: string): boolean {
  // 마지막 '글자'(한글 음절)의 받침 유무. 한글이 아니면 받침 있는 것으로 보아 자음형 조사 사용.
  const m = word.match(/[가-힣](?=[^가-힣]*$)/)
  if (!m) return true
  const code = m[0].charCodeAt(0) - 0xac00
  return code % 28 !== 0
}
// 받침 있으면 withJong, 없으면 noJong.
function josa(word: string, withJong: string, noJong: string): string {
  return word + (hasJong(word) ? withJong : noJong)
}
const eunNeun = (w: string) => josa(w, '은', '는')   // 은/는
const iGa = (w: string) => josa(w, '이', '가')        // 이/가
const eulReul = (w: string) => josa(w, '을', '를')    // 을/를
// 으로/로: 받침 없거나 'ㄹ' 받침이면 '로', 그 외 받침이면 '으로'
function euroRo(word: string): string {
  const m = word.match(/[가-힣](?=[^가-힣]*$)/)
  if (!m) return word + '로'
  const code = m[0].charCodeAt(0) - 0xac00
  const jong = code % 28
  return word + (jong === 0 || jong === 8 ? '로' : '으로')
}

// ── 인물 한 줄 묘사용 어휘(이름·역할 후보) ──
const ROLES = ['주인공', '조력자', '적대자', '멘토', '라이벌', '연인', '가족', '동료', '관찰자']

function ri(n: number) { return Math.floor(Math.random() * n) }
function pick<T>(a: T[]): T { return a[ri(a.length)] }

interface Gen {
  pairIdx: number
  moment: string
  root: string
  tell: string
  desire: string
  cost: string
  fear: string
}
type SlotKey = keyof Gen

function genOne(): Gen {
  return {
    pairIdx: ri(PAIRS.length),
    moment: pick(MOMENTS),
    root: pick(ROOTS),
    tell: pick(TELLS),
    desire: pick(DESIRES),
    cost: pick(COSTS),
    fear: pick(FEARS),
  }
}

// 조합수: (모순쌍) × (드러나는 순간) × (뿌리) × (들키는 신호) × (진짜 욕망) × (가면의 대가) × (들킬 때 두려움)
const COMBOS = PAIRS.length * MOMENTS.length * ROOTS.length * TELLS.length * DESIRES.length * COSTS.length * FEARS.length

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface Saved {
  id: string
  pairIdx: number
  label: string
  face: string
  truth: string
  moment: string
  root: string
  tell: string
  desire: string
  cost: string
  fear: string
  name: string
  note: string
}

function uid(): string {
  return 'cc_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
}

function loadSaved(): Saved[] {
  try {
    const raw = localStorage.getItem(LS)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
      .filter((s) => s && typeof s.face === 'string' && typeof s.truth === 'string')
      .map((s) => ({
        id: typeof s.id === 'string' ? s.id : uid(),
        pairIdx: typeof s.pairIdx === 'number' ? s.pairIdx : -1,
        label: typeof s.label === 'string' ? s.label : '모순',
        face: String(s.face),
        truth: String(s.truth),
        moment: typeof s.moment === 'string' ? s.moment : '',
        root: typeof s.root === 'string' ? s.root : '',
        tell: typeof s.tell === 'string' ? s.tell : '',
        desire: typeof s.desire === 'string' ? s.desire : '',
        cost: typeof s.cost === 'string' ? s.cost : '',
        fear: typeof s.fear === 'string' ? s.fear : '',
        name: typeof s.name === 'string' ? s.name : '',
        note: typeof s.note === 'string' ? s.note : '',
      }))
  } catch { return [] }
}

// 모순 한 묶음을 텍스트로 (복사·라이브러리용)
function genToText(g: Gen, name: string): string {
  const p = PAIRS[g.pairIdx]
  const who = name.trim() ? name.trim() : '이 인물'
  return (
    `🎭 [${p.label}]\n` +
    `· 겉(남들이 보는 면): ${eunNeun(who)} ${p.face}.\n` +
    `· 속(숨긴 진실): 그러나 ${p.truth}.\n` +
    `· 드러나는 순간: ${g.moment}.\n` +
    `· 까닭(뿌리): ${g.root}.\n` +
    `· 들키는 신호: 무심코 ${euroRo(g.tell)} 본심이 새어 나온다.\n` +
    `· 진짜 바라는 것: 정작 마음 깊은 곳에서는 ${eulReul(g.desire)} 바란다.\n` +
    `· 가면의 대가: 그 가면을 지키느라 ${eulReul(g.cost)} 치르고 있다.\n` +
    `· 들킬 때 두려움: 들통나는 순간 ${eulReul(g.fear)} 가장 두려워한다.`
  )
}

// 프로젝트 본문(HTML)
function genToBodyHtml(g: Gen, name: string): string {
  const p = PAIRS[g.pairIdx]
  const who = name.trim() ? name.trim() : '이 인물'
  return (
    `<p><strong>🎭 ${escHtml(p.label)}</strong></p>` +
    `<p><strong>겉(남들이 보는 면):</strong> ${escHtml(eunNeun(who))} ${escHtml(p.face)}.</p>` +
    `<p><strong>속(숨긴 진실):</strong> 그러나 ${escHtml(p.truth)}.</p>` +
    `<p><strong>모순이 드러나는 순간:</strong> ${escHtml(g.moment)}.</p>` +
    `<p><strong>까닭(뿌리):</strong> ${escHtml(g.root)}.</p>` +
    `<p><strong>들키는 신호:</strong> 무심코 ${escHtml(euroRo(g.tell))} 본심이 새어 나온다.</p>` +
    `<p><strong>진짜 바라는 것:</strong> 정작 마음 깊은 곳에서는 ${escHtml(eulReul(g.desire))} 바란다.</p>` +
    `<p><strong>가면의 대가:</strong> 그 가면을 지키느라 ${escHtml(eulReul(g.cost))} 치르고 있다.</p>` +
    `<p><strong>들킬 때 두려움:</strong> 들통나는 순간 ${escHtml(eulReul(g.fear))} 가장 두려워한다.</p>`
  )
}

const SLOT_ROWS: { k: SlotKey; label: string; icon: string }[] = [
  { k: 'pairIdx', label: '모순 쌍 (겉 vs 속)', icon: '🎭' },
  { k: 'moment', label: '드러나는 순간', icon: '⚡' },
  { k: 'root', label: '까닭 (뿌리)', icon: '🌱' },
  { k: 'tell', label: '들키는 신호', icon: '👀' },
  { k: 'desire', label: '진짜 바라는 것', icon: '💗' },
  { k: 'cost', label: '가면의 대가', icon: '⛓' },
  { k: 'fear', label: '들킬 때 두려움', icon: '😨' },
]

export default function CharacterContradiction({ payload }: { payload?: Record<string, unknown> }) {
  const [g, setG] = useState<Gen>(() => genOne())
  const [locked, setLocked] = useState<Partial<Record<SlotKey, boolean>>>({})
  const [name, setName] = useState('')
  const [role, setRole] = useState<string>(ROLES[0])
  const [saved, setSaved] = useState<Saved[]>(() => loadSaved())
  const [tab, setTab] = useState<'gen' | 'saved'>('gen')
  const [toast, setToast] = useState('')
  const nonce = useRef(0)

  // 외부 payload(이름·역할)로 시작값 반영(선택적, 마운트 1회)
  useMemo(() => {
    if (payload && typeof payload.name === 'string') setName(payload.name)
    if (payload && typeof payload.role === 'string' && ROLES.includes(payload.role)) setRole(payload.role)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 보관함 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify(saved)) } catch { /* 저장 실패 graceful */ }
  }, [saved])

  // 토스트 정리(언마운트/재설정)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 1800)
    return () => window.clearTimeout(t)
  }, [toast])

  const flash = (m: string) => { nonce.current++; setToast(m) }

  // 전체 생성(잠긴 슬롯 유지)
  const rollAll = () => {
    setG((prev) => {
      const next = genOne()
      for (const r of SLOT_ROWS) {
        if (locked[r.k]) (next as unknown as Record<string, unknown>)[r.k] = (prev as unknown as Record<string, unknown>)[r.k]
      }
      return next
    })
  }
  // 항목만 다시
  const rollOne = (k: SlotKey) => {
    if (locked[k]) return
    setG((prev) => {
      const fresh = genOne()
      return { ...prev, [k]: (fresh as unknown as Record<string, unknown>)[k] } as Gen
    })
  }
  const toggleLock = (k: SlotKey) => setLocked((l) => ({ ...l, [k]: !l[k] }))

  const cur = PAIRS[g.pairIdx]
  const who = name.trim() ? name.trim() : '이 인물'

  const copyCur = () => {
    const text = genToText(g, name)
    if (!navigator.clipboard) { flash('이 환경에선 복사가 안 돼요'); return }
    navigator.clipboard.writeText(text).then(() => flash('복사했어요')).catch(() => flash('복사 실패'))
  }

  const saveCur = () => {
    const rec: Saved = {
      id: uid(), pairIdx: g.pairIdx, label: cur.label, face: cur.face, truth: cur.truth,
      moment: g.moment, root: g.root, tell: g.tell, desire: g.desire, cost: g.cost, fear: g.fear,
      name: name.trim(), note: '',
    }
    setSaved((prev) => [rec, ...prev])
    flash('보관함에 저장했어요')
  }

  // 인물 시트로 보내기 — 모순을 성격/내적갈등 필드로 매핑
  const toSheet = () => {
    const fields: Record<string, string> = {
      name: name.trim() || '(이름 미정)',
      role,
      personality: `겉: ${cur.face}`,
      secret: `속(진실): ${cur.truth}`,
      conflict: `모순(${cur.label}) · 드러나는 순간: ${g.moment} · 까닭: ${g.root} · 들키는 신호: 무심코 ${euroRo(g.tell)} · 진짜 바라는 것: ${g.desire} · 가면의 대가: ${g.cost} · 들킬 때 두려움: ${g.fear}`,
    }
    // 정규 키 fields — 받는 인물 시트가 기본 칸에 바로 채울 수 있도록 표준 키로 1:1 매핑
    const normFields: Record<string, string> = {
      name: name.trim() || '(이름 미정)',
      role,
      personality: cur.face,
      secret: cur.truth,
      flaw: cur.label,
      background: g.root,
      desire: g.desire,
      notes: `모순(${cur.label}): 겉은 ${cur.face}, 그러나 속은 ${cur.truth}. 드러나는 순간: ${g.moment}. 까닭(뿌리): ${g.root}. 들키는 신호: 무심코 ${euroRo(g.tell)} 본심이 새어 나온다. 정작 마음 깊은 곳에서는 ${eulReul(g.desire)} 바란다. 그 가면을 지키느라 ${eulReul(g.cost)} 치르고 있다. 들통나는 순간 ${eulReul(g.fear)} 가장 두려워한다.`,
    }
    openToolLinked('character-sheet', { character: { ...fields, fields: normFields } })
    flash('인물 시트로 보냈어요')
  }

  // 프로젝트 자료('인물 메모')에 모순 메모 추가
  const toProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않아요'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '인물 메모',
      title: `인물 모순 — ${name.trim() ? name.trim() + ': ' : ''}${cur.label}`,
      bodyHtml: genToBodyHtml(g, name),
      synopsis: `${cur.face} ↔ ${cur.truth}`,
      meta: { 인물: name.trim() || '미정', 역할: role, 모순: cur.label },
    })
    flash(id ? '프로젝트 자료(인물 메모)에 추가했어요' : '프로젝트 추가에 실패했어요')
  }

  // 보관함 조작
  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))
  const setNote = (id: string, note: string) => setSaved((prev) => prev.map((s) => (s.id === id ? { ...s, note } : s)))
  const loadToGen = (s: Saved) => {
    if (s.pairIdx >= 0 && s.pairIdx < PAIRS.length) {
      setG({
        pairIdx: s.pairIdx,
        moment: s.moment || pick(MOMENTS),
        root: s.root || pick(ROOTS),
        tell: s.tell || pick(TELLS),
        desire: s.desire || pick(DESIRES),
        cost: s.cost || pick(COSTS),
        fear: s.fear || pick(FEARS),
      })
      if (s.name) setName(s.name)
      setTab('gen')
      flash('생성기로 불러왔어요')
    }
  }
  const copySaved = (s: Saved) => {
    const g2: Gen = {
      pairIdx: s.pairIdx, moment: s.moment, root: s.root,
      tell: s.tell || pick(TELLS), desire: s.desire || pick(DESIRES),
      cost: s.cost || pick(COSTS), fear: s.fear || pick(FEARS),
    }
    const text = genToText(g2, s.name) + (s.note ? `\n📝 ${s.note}` : '')
    if (!navigator.clipboard) { flash('이 환경에선 복사가 안 돼요'); return }
    navigator.clipboard.writeText(text).then(() => flash('복사했어요')).catch(() => flash('복사 실패'))
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const inputStyle: React.CSSProperties = { background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 9px', fontSize: 13, fontFamily: 'inherit' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>겉모습/태도</b>와 <b>속마음/진실</b>의 <b>모순</b>으로 입체적 인물을 빚으세요. 모순이 <b>드러나는 순간</b>과 그 <b>까닭(뿌리)</b>까지 함께 생성합니다.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('gen')} aria-pressed={tab === 'gen'}
          style={{ borderColor: tab === 'gen' ? 'var(--accent)' : 'var(--border)', color: tab === 'gen' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🎭"/> 생성기
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐"/> 보관함 ({saved.length})
        </button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>약 {COMBOS.toLocaleString()}+ 조합</span>
      </div>

      {tab === 'gen' && (
        <>
          {/* 인물 정보(선택) */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="인물 이름(선택)"
              style={{ ...inputStyle, flex: 1, minWidth: 120 }}
            />
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ ...inputStyle, minWidth: 90 }}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* 결과 카드 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '2px 10px' }}>
                  <Emoji e="🎭"/> {cur.label}
                </span>
              </div>

              {/* 겉 vs 속 대비 */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 140, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}><Emoji e="🙂"/> 겉 — 남들이 보는 면</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.45 }}><b>{who}</b>{hasJong(who) ? '은' : '는'} {cur.face}.</div>
                </div>
                <div style={{ flex: 1, minWidth: 140, background: 'var(--paper)', border: '1px solid var(--warn)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 11, color: 'var(--warn)', marginBottom: 3 }}><Emoji e="🎭"/> 속 — 숨긴 진실</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>그러나 {cur.truth}.</div>
                </div>
              </div>

              {/* 드러나는 순간 + 까닭 + 신호·욕망·대가·두려움 */}
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <div><span style={{ color: 'var(--accent)', fontWeight: 700 }}><Emoji e="⚡"/> 드러나는 순간 — </span>{g.moment}.</div>
                <div style={{ marginTop: 2 }}><span style={{ color: 'var(--accent)', fontWeight: 700 }}><Emoji e="🌱"/> 까닭(뿌리) — </span>{g.root}.</div>
                <div style={{ marginTop: 2 }}><span style={{ color: 'var(--accent)', fontWeight: 700 }}><Emoji e="👀"/> 들키는 신호 — </span>무심코 {euroRo(g.tell)} 본심이 새어 나온다.</div>
                <div style={{ marginTop: 2 }}><span style={{ color: 'var(--accent)', fontWeight: 700 }}><Emoji e="💗"/> 진짜 바라는 것 — </span>정작 마음 깊은 곳에서는 {eulReul(g.desire)} 바란다.</div>
                <div style={{ marginTop: 2 }}><span style={{ color: 'var(--accent)', fontWeight: 700 }}><Emoji e="⛓"/> 가면의 대가 — </span>그 가면을 지키느라 {eulReul(g.cost)} 치르고 있다.</div>
                <div style={{ marginTop: 2 }}><span style={{ color: 'var(--accent)', fontWeight: 700 }}><Emoji e="😨"/> 들킬 때 두려움 — </span>들통나는 순간 {eulReul(g.fear)} 가장 두려워한다.</div>
              </div>
            </div>

            {/* 슬롯(잠금/부분 재생성) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {SLOT_ROWS.map((r) => {
                const val = r.k === 'pairIdx' ? cur.label : (g[r.k] as string)
                return (
                  <div key={r.k} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 8px' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', width: 130, flexShrink: 0 }}><Emoji e={r.icon}/> {r.label}</span>
                    <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={val}>{val}</span>
                    <button className="minibtn" title={locked[r.k] ? '잠금해제' : '잠금'} onClick={() => toggleLock(r.k)}
                      style={{ padding: '0 5px', color: locked[r.k] ? 'var(--accent)' : 'var(--muted)' }}>{locked[r.k] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
                    <button className="minibtn" title="이 항목만 다시" onClick={() => rollOne(r.k)} disabled={!!locked[r.k]} style={{ padding: '0 5px' }}><Emoji e="🎲"/></button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 생성/복사/저장 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 130 }} onClick={rollAll}><Emoji e="🎲"/> 모순 생성 / 다시 섞기</button>
            <button className="minibtn" onClick={copyCur}><Emoji e="📋"/> 복사</button>
            <button className="minibtn" onClick={saveCur}><Emoji e="⭐"/> 보관</button>
          </div>

          {/* 연계 */}
          <div className="linkbar">
            <span className="linkbar-label">연동:</span>
            <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 모순을 프로젝트 자료(인물 메모)에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={toSheet} title="이 모순을 인물 시트의 성격·비밀·내적 갈등으로 보내기"><Emoji e="🪪"/> 인물 시트로</button>
          </div>

          <div style={{ ...hint, color: toast ? 'var(--ok)' : 'var(--muted)' }}>
            {toast || emojify('모순은 인물을 살아 있게 합니다. 슬롯을 🔒 잠그고 마음에 드는 조각을 남긴 채 나머지만 다시 굴려보세요.')}
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐"/></div>
              보관한 모순이 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성기에서 <Emoji e="⭐"/> 보관을 눌러 마음에 드는 인물 모순을 모아보세요.</span>
            </div>
          )}
          {saved.map((s) => (
            <div key={s.id} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px' }}><Emoji e="🎭"/> {s.label}</span>
                {s.name && <span style={{ fontSize: 12, color: 'var(--muted)' }}>· {s.name}</span>}
                <span style={{ flex: 1 }} />
                <button className="minibtn" onClick={() => loadToGen(s)} title="생성기로 불러오기" style={{ padding: '0 6px' }}>↩</button>
                <button className="minibtn" onClick={() => copySaved(s)} title="복사" style={{ padding: '0 6px' }}><Emoji e="📋"/></button>
                <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ padding: '0 6px', borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑"/></button>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                <div><span style={{ color: 'var(--muted)' }}>겉:</span> {s.face}.</div>
                <div><span style={{ color: 'var(--warn)' }}>속:</span> 그러나 {s.truth}.</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}><Emoji e="⚡"/> {s.moment}.</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}><Emoji e="🌱"/> {s.root}.</div>
                {s.tell && <div style={{ fontSize: 12, color: 'var(--muted)' }}><Emoji e="👀"/> 무심코 {euroRo(s.tell)} 본심이 새어 나온다.</div>}
                {s.desire && <div style={{ fontSize: 12, color: 'var(--muted)' }}><Emoji e="💗"/> 정작 {eulReul(s.desire)} 바란다.</div>}
                {s.cost && <div style={{ fontSize: 12, color: 'var(--muted)' }}><Emoji e="⛓"/> 가면을 지키느라 {eulReul(s.cost)} 치른다.</div>}
                {s.fear && <div style={{ fontSize: 12, color: 'var(--muted)' }}><Emoji e="😨"/> 들통나는 순간 {eulReul(s.fear)} 두려워한다.</div>}
              </div>
              <textarea
                value={s.note}
                onChange={(e) => setNote(s.id, e.target.value)}
                placeholder="이 모순을 내 인물에게 어떻게 쓸지 메모…"
                rows={2}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
              />
            </div>
          ))}
          {saved.length > 0 && <div style={hint}>보관한 모순은 자동 저장됩니다. ↩ 로 생성기에 다시 불러와 슬롯을 잠그고 변주할 수 있어요.</div>}
        </div>
      )}
    </div>
  )
}
