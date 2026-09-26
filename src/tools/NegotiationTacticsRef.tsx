// 협상·설득·말싸움 전술 사전 — 설득 원리·협상 기법·논쟁 술수·심리 압박·역공을
// 자작 텍스트로 정리한 로컬 레퍼런스. 대화 갈등·심리전·법정·정치·흥정 장면을 쓸 때
// "이 인물은 어떤 수를 쓰는가 / 어떻게 받아치는가"를 빠르게 찾아 심는다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크/미디어/키 불필요.
// 데이터는 백과를 베끼지 않고 일반 상식·창작 노하우를 직접 요약·표현한 자작 데이터다.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToStash, hasStash, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = { id: 'negotiation-tactics-ref', name: '협상·설득·말싸움 전술 사전', icon: '🤝', group: '리서치·자료', intro: '설득 원리·협상 기법·논쟁 술수·심리 압박·역공을 찾아 대화 갈등 장면에 활용', w: 680, h: 620 }

// ---------- 데이터 타입 ----------
type Stance = 'win' | 'foul' | 'pressure' | 'defend' | 'principle'
// win=정당한 설득/협상 기법, foul=비열한 논쟁 술수(궤변), pressure=심리 압박,
// defend=역공·방어법, principle=바탕이 되는 설득 원리

interface Tactic {
  name: string            // 전술 이름
  stance: Stance
  body: string            // 핵심 작동 원리(자작)
  line?: string           // 대사 예시(장면에 바로 쓸 한 줄)
  counter?: string        // 역공·받아치는 법
  tags?: string[]         // 검색 보조 태그
}
interface Group {
  key: string
  label: string
  icon: string
  intro: string
  tactics: Tactic[]
}

const STANCE_LABEL: Record<Stance, { label: string; icon: string; color: string }> = {
  principle: { label: '설득 원리', icon: '🧠', color: 'var(--accent)' },
  win: { label: '정당한 기법', icon: '✅', color: 'var(--ok)' },
  pressure: { label: '심리 압박', icon: '🔥', color: '#e0935a' },
  foul: { label: '궤변·술수', icon: '⚠️', color: '#e06c6c' },
  defend: { label: '역공·방어', icon: '🛡️', color: '#5aa0e0' },
}

// ===================== 자작 데이터: 전술 묶음 =====================
const GROUPS: Group[] = [
  {
    key: 'principle', label: '설득의 기본 원리', icon: '🧠',
    intro: '사람의 마음이 움직이는 보편 법칙. 어떤 술수든 결국 이 원리 위에서 돈다.',
    tactics: [
      { name: '상호성(빚진 마음)', stance: 'principle', body: '먼저 호의·양보·정보를 주면 상대는 갚아야 한다는 부담을 진다. 작은 선물 뒤에 본 요청을 둔다.', line: '먼저 이만큼 양보했습니다. 그쪽도 성의는 보여 주셔야지요.', counter: '“호의는 감사하나 거래와는 별개입니다.” 받은 것과 결정을 분리해 말한다.', tags: ['상호성', '호의', '빚'] },
      { name: '일관성·약속의 덫', stance: 'principle', body: '작은 동의를 먼저 받아 두면, 사람은 자기 말과 어긋나지 않으려 큰 동의도 따라온다.', line: '아까 “좋은 게 좋은 거”라고 하셨잖아요. 그럼 이것도 같은 얘기죠.', counter: '“그 말과 이 사안은 다릅니다. 따로 보겠습니다.” 과거 발언에 묶이길 거부한다.', tags: ['일관성', '약속', '문간발'] },
      { name: '사회적 증거', stance: 'principle', body: '“다들 그렇게 한다”는 다수의 그림을 보여 주면 망설이던 사람도 흐름에 올라탄다.', line: '같은 조건에 이미 세 곳이 사인했습니다. 흔치 않은 기회예요.', counter: '“남들 기준 말고 제 기준으로 보겠습니다. 그 셋의 사정은 제 사정이 아니죠.”', tags: ['다수', '대세', '동조'] },
      { name: '희소성·마감', stance: 'principle', body: '곧 사라진다·한정이다라는 압박은 손실 회피 심리를 자극해 즉답을 끌어낸다.', line: '이 가격은 오늘까지입니다. 내일이면 없는 조건이에요.', counter: '“그렇게 급한 거래라면 더 신중해야겠군요. 사라지면 인연이 아닌 거고요.”', tags: ['희소', '마감', '손실회피'] },
      { name: '권위의 후광', stance: 'principle', body: '직함·전문가·수치·인용을 앞세우면 내용 검증 없이 신뢰가 따라붙는다.', line: '이 분야 20년 전문가로서 말씀드리는데, 이게 정답입니다.', counter: '“경력은 존중합니다만, 근거는 따로 듣고 싶습니다.” 권위와 논거를 분리한다.', tags: ['권위', '전문가', '직함'] },
      { name: '호감·동질감', stance: 'principle', body: '닮은 점·칭찬·웃음으로 “우리 편”이라는 느낌을 만들면 경계가 풀리고 부탁이 쉬워진다.', line: '저도 그 동네 출신이에요. 고향 사람끼리 뭘 그렇게 따집니까.', counter: '“반갑네요. 그건 그거고 조건은 조건대로 보죠.” 따뜻함은 받되 판단은 지킨다.', tags: ['호감', '동질감', '라포'] },
      { name: '프레이밍(틀 짓기)', stance: 'principle', body: '같은 사실도 어떤 틀로 말하느냐가 결정을 가른다. “할인” 대 “위약금”, “이득” 대 “손실”.', line: '비용이 아니라 투자라고 생각하세요. 안 하면 그만큼 잃는 겁니다.', counter: '“말의 틀 말고 숫자만 봅시다. 들어오는 돈, 나가는 돈.”', tags: ['프레임', '관점', '표현'] },
      { name: '앵커링(기준점)', stance: 'principle', body: '먼저 던진 숫자가 협상 전체의 기준점이 된다. 극단값으로 시작해 “양보”의 폭을 키운다.', line: '시작은 1억으로 보죠. (속으론 6천이면 충분)', counter: '맞앵커를 던진다. “저는 3천으로 보는데요. 그 사이 어디겠죠.”', tags: ['앵커', '기준점', '첫제안'] },
    ],
  },
  {
    key: 'deal', label: '협상·흥정 기법', icon: '⚖️',
    intro: '값과 조건을 다투는 자리. 양보의 순서와 모양이 결과를 만든다.',
    tactics: [
      { name: '닻 내리고 천천히 양보', stance: 'win', body: '높게 시작해 작게, 점점 더 작게 양보한다. 줄어드는 양보 폭이 “한계에 왔다”는 신호를 준다.', line: '500은 안 되고… 480까지. 거기서 5만 더, 정말 마지막입니다.', counter: '양보 폭이 줄어드는 패턴을 읽고 “그 마지막이 진짜 마지막인가요?”로 한 번 더 민다.', tags: ['양보', '닻', '흥정'] },
      { name: '결렬 카드(BATNA)', stance: 'win', body: '협상이 깨져도 좋은 대안이 있음을 보일 때 가장 강하다. 떠날 수 있는 자가 조건을 정한다.', line: '여기 아니어도 살 곳은 많습니다. 다만 당신과 하고 싶을 뿐이죠.', counter: '상대 대안이 정말 있는지 떠본다. “그 다른 곳, 정말 이 조건을 줍니까?”', tags: ['배트나', '대안', '결렬'] },
      { name: '미끼(디코이) 옵션', stance: 'win', body: '일부러 나쁜 선택지를 끼워, 진짜 팔고 싶은 안을 “합리적”으로 보이게 만든다.', line: 'A는 비싸고, C는 부실하죠. 그래서 다들 B를 고릅니다.', counter: '제시된 셋을 무시하고 “제가 원하는 D는 왜 없죠?”로 판을 다시 짠다.', tags: ['미끼', '디코이', '옵션'] },
      { name: '살라미(쪼개기)', stance: 'win', body: '큰 요구를 한 번에 안 내고 얇게 썰어 하나씩 받아낸다. 작은 양보는 거절하기 어렵다.', line: '우선 이것만요. (받고 나서) 그럼 여기까지도 같이 가시죠.', counter: '“오늘 항목 전부를 한 번에 봅시다.” 전체 패키지로 묶어 쪼개기를 막는다.', tags: ['살라미', '쪼개기', '단계'] },
      { name: '끼워팔기·묶기', stance: 'win', body: '얻고 싶은 것과 양보할 것을 한 묶음으로 거래해, 개별로 따지면 불리한 항목을 통과시킨다.', line: '납기를 당겨 드릴 테니, 단가는 이 선으로 묶어서 가시죠.', counter: '“좋은 건 좋은 거고, 단가는 따로 봅시다.” 묶음을 풀어 항목별로 협상한다.', tags: ['묶기', '패키지', '교환'] },
      { name: '상위 결재자 핑계', stance: 'win', body: '“나는 OK인데 윗선이…”로 자신을 좋은 사람에 두고, 보이지 않는 결재자에게 거절을 떠넘긴다.', line: '저야 드리고 싶죠. 그런데 본사 승인이 안 떨어집니다.', counter: '“그럼 그 결정권자와 직접 얘기하죠.” 핑계 뒤의 실체를 끌어낸다.', tags: ['결재자', '핑계', '권한'] },
      { name: '막판 흔들기(니블)', stance: 'foul', body: '거의 합의된 순간, 작은 추가 요구를 슬쩍 끼운다. 다 된 거래를 깨기 싫어 상대가 양보한다.', line: '거의 다 됐네요. 아, 운송비는 그쪽이 내는 거 맞죠?', counter: '“그건 처음 듣는 조건이군요. 그럼 다른 것도 다시 열겠습니다.” 추가엔 추가로 맞선다.', tags: ['니블', '막판', '추가요구'] },
      { name: '의도된 침묵', stance: 'win', body: '제안 뒤 말없이 기다린다. 침묵을 못 견딘 쪽이 먼저 양보하거나 패를 흘린다.', line: '(제안 후 아무 말 없이 상대를 본다)', counter: '맞침묵으로 견딘다. 먼저 입을 여는 쪽이 진다는 걸 알고 기다린다.', tags: ['침묵', '기다림', '여백'] },
      { name: '굿캅·배드캅', stance: 'pressure', body: '둘이 짜고 한 명은 몰아붙이고 한 명은 달랜다. 상대는 “착한 쪽”에 안도해 양보한다.', line: '(강경) 이대로면 끝입니다! / (온화) 자자, 우리 좋게 풀어 봅시다…', counter: '“두 분 입을 맞추고 오세요. 한 사람하고만 얘기하겠습니다.”', tags: ['굿캅', '배드캅', '역할극'] },
    ],
  },
  {
    key: 'foul', label: '논쟁 궤변·술수', icon: '⚠️',
    intro: '이기기 위해 논리를 비트는 더러운 수. 인물의 비열함을 드러내거나, 함정을 깔 때 쓴다.',
    tactics: [
      { name: '허수아비 치기', stance: 'foul', body: '상대 주장을 과장·왜곡한 ‘쉬운 표적’으로 바꿔 그걸 때린다. 진짜 주장은 건드리지 않는다.', line: '그러니까 다 갈아엎고 처음부터 다시 하자, 이 말씀이죠?', counter: '“제가 한 말은 그게 아닙니다. 한 부분만 고치자는 거죠.” 즉시 원래 주장을 복원한다.', tags: ['허수아비', '왜곡', '과장'] },
      { name: '인신공격(사람 치기)', stance: 'foul', body: '주장 대신 말한 사람을 깎아내려 발언 전체를 무효처럼 보이게 만든다.', line: '당신 같은 사람 말을 누가 믿겠어요?', counter: '“제 인격이 아니라 제 근거를 반박하세요. 못 하시면 인정하는 겁니다.”', tags: ['인신공격', '애드호미넴'] },
      { name: '논점 흐리기(미꾸라지)', stance: 'foul', body: '불리해지면 곁가지 화제로 빠지거나 되묻기로 시간을 끌어 핵심을 흐린다.', line: '그건 그렇고, 당신은 그동안 뭘 했는데요?', counter: '“그 얘긴 나중에. 지금 질문에 먼저 답하시죠.” 원래 논점으로 못 박는다.', tags: ['논점일탈', '회피', '딴소리'] },
      { name: '거짓 양자택일', stance: 'foul', body: '선택지를 둘로만 좁혀 “이게 싫으면 저거”라며 중간·제3의 길을 지운다.', line: '내 편이 아니면 적이라는 거지.', counter: '“그 둘 말고도 길이 있습니다.” 숨겨진 선택지를 꺼내 이분법을 깬다.', tags: ['이분법', '양자택일', '흑백'] },
      { name: '미끄러운 비탈', stance: 'foul', body: '작은 양보가 곧 파국으로 이어진다며, 근거 없는 연쇄로 공포를 부풀린다.', line: '이거 하나 봐주면, 결국 다 무너집니다.', counter: '“그 사이 단계들이 정말 일어납니까? 한 발씩 따로 봅시다.”', tags: ['미끄럼틀', '연쇄', '과장공포'] },
      { name: '순환논법', stance: 'foul', body: '결론을 근거로 다시 쓰며 같은 자리를 빙빙 돈다. 증명한 척만 한다.', line: '그게 맞는 이유요? 원래 맞으니까 맞는 거죠.', counter: '“결론 말고 결론 바깥의 근거를 주세요.” 같은 말의 반복을 끊는다.', tags: ['순환', '동어반복', '논점선취'] },
      { name: '무지에 호소', stance: 'foul', body: '“반증이 없으니 사실”이라며 입증 책임을 상대에게 떠넘긴다.', line: '아니라는 증거 있어요? 없으면 맞는 겁니다.', counter: '“주장하는 쪽이 증명합니다. 제가 없음을 증명할 의무는 없죠.”', tags: ['입증책임', '무지', '전가'] },
      { name: '감정·공포·연민에 호소', stance: 'foul', body: '논거 대신 눈물·분노·동정을 자극해 판단을 흐린다. 사실은 그대로인데 분위기만 바꾼다.', line: '저희 식구가 길에 나앉게 생겼습니다… 한 번만 봐주세요.', counter: '“사정은 딱합니다. 그래도 사실은 사실대로 봐야죠.” 감정과 사실을 분리한다.', tags: ['감정호소', '연민', '공포'] },
      { name: '말꼬리·정의 바꾸기', stance: 'foul', body: '같은 단어의 뜻을 도중에 슬쩍 바꿔 모순을 숨기거나 책임을 회피한다.', line: '제가 “돕겠다”고 했지, “책임지겠다”곤 안 했죠.', counter: '“그 말을 처음 어떤 뜻으로 썼는지 못 박고 갑시다.” 정의를 고정한다.', tags: ['애매어', '말바꾸기', '정의'] },
      { name: '물타기(피장파장)', stance: 'foul', body: '“너도 그러잖아”로 자기 잘못을 상대 잘못과 맞바꿔 흐린다.', line: '나만 그랬나? 당신도 똑같이 했잖아.', counter: '“제 일은 따로 책임지죠. 지금은 그쪽 일을 보는 중입니다.”', tags: ['피장파장', '투쿼키', '물타기'] },
    ],
  },
  {
    key: 'pressure', label: '심리 압박·기선 제압', icon: '🔥',
    intro: '논리 이전에 기세로 누른다. 시간·공간·시선·말투로 상대의 평정을 흔든다.',
    tactics: [
      { name: '시간 압박(데드라인)', stance: 'pressure', body: '“지금 결정하라”며 생각할 틈을 빼앗아, 충분히 따지면 안 했을 결정을 끌어낸다.', line: '5분 드리죠. 그 안에 사인 안 하면 없던 일입니다.', counter: '“급할수록 멈춥니다. 시간 안 주시면 거래도 없습니다.” 데드라인을 거부한다.', tags: ['데드라인', '시간', '재촉'] },
      { name: '기선 제압(첫 한 방)', stance: 'pressure', body: '문을 열자마자 강한 한마디·자료·금액을 던져 상대를 수세로 몰고 판의 주도권을 쥔다.', line: '본론부터. 당신 쪽 손해가 얼마인지 아십니까?', counter: '동요하지 않고 “좋습니다. 천천히 하나씩 보죠.”로 속도를 내 쪽으로 가져온다.', tags: ['기선', '선공', '주도권'] },
      { name: '냉담·무관심 연기', stance: 'pressure', body: '“있어도 그만”인 태도로 상대의 조바심을 키운다. 더 원하는 쪽이 약자가 된다.', line: '뭐, 안 되면 마는 거고요. (서류를 덮는다)', counter: '맞무관심으로 받는다. 매달리는 순간 값이 오른다는 걸 알고 거리를 둔다.', tags: ['냉담', '무관심', '여유'] },
      { name: '공간·자리의 기세', stance: 'pressure', body: '상석·높은 의자·해를 등진 자리·문 가까운 출구 등 물리적 배치로 우위를 만든다.', line: '(상대를 낮고 햇빛 드는 자리에 앉히고, 자신은 등지고 선다)', counter: '자리 배치를 바꿔 달라 요청하거나, 일어서서 시선을 맞춘다.', tags: ['공간', '자리', '상석'] },
      { name: '기록·증인 흔들기', stance: 'pressure', body: '“이거 녹음/메모합니다”로 상대의 말을 조심스럽게 만들어 공세를 무디게 한다.', line: '방금 그 말, 기록해 두겠습니다. 책임지실 수 있죠?', counter: '“네, 기록하세요. 한 말 그대로 책임집니다.” 떳떳함으로 무력화한다.', tags: ['기록', '녹음', '증인'] },
      { name: '의도된 분노 연출', stance: 'pressure', body: '터질 듯 화를 내 보여 “더 자극하면 위험하다”는 두려움으로 양보를 끌어낸다(연기일 수 있음).', line: '(탁자를 치며) 더는 못 참아! 이게 사람 대접이야?!', counter: '“진정하시죠. 화로 결정하지 맙시다.” 휘말리지 않고 분노의 진위를 가린다.', tags: ['분노', '위협', '연출'] },
      { name: '침묵·시선 압박', stance: 'pressure', body: '대답 대신 길게 응시하거나 답을 미뤄, 침묵의 무게로 상대를 불안하게 만든다.', line: '(질문에 답하지 않고 가만히 눈만 마주친다)', counter: '같은 침묵으로 버티거나 “답을 기다리겠습니다.”로 압박을 되돌린다.', tags: ['침묵', '시선', '응시'] },
      { name: '낮은 공·작은 양보의 덫', stance: 'pressure', body: '먼저 거절당할 큰 요구를 던져 거절을 받아낸 뒤, 작아 보이는 ‘진짜 요구’를 꺼낸다(면전박대).', line: '한 달은 무리겠죠? 그럼 사흘만이라도. (사흘이 본 목표)', counter: '“두 요구는 별개입니다.” 첫 거절에 미안해 두 번째를 받지 않도록 끊는다.', tags: ['면전박대', '대조', '양보'] },
    ],
  },
  {
    key: 'defend', label: '역공·받아치기·방어', icon: '🛡️',
    intro: '몰리는 인물이 판을 뒤집는 수. 술수를 이름 붙여 무력화하고, 칼끝을 되돌린다.',
    tactics: [
      { name: '술수에 이름 붙이기', stance: 'defend', body: '상대가 쓰는 수를 또박또박 명명하면 효력이 깨진다. “지금 화제를 돌리시는군요.”', line: '그건 논점 흐리기죠. 다시 본론으로 가시죠.', counter: '(이것 자체가 역공) 상대가 “그게 아니다” 발뺌하면 “그럼 답을 해 보시죠.”', tags: ['명명', '메타', '폭로'] },
      { name: '되묻기로 부담 떠넘기기', stance: 'defend', body: '공세에 답하는 대신 질문으로 돌려, 입증·설명의 짐을 상대에게 다시 지운다.', line: '왜 그렇게 생각하시는지, 근거부터 들어 볼까요?', counter: '상대가 같은 되묻기로 받으면 먼저 한 발 답하고 다시 공을 넘긴다.', tags: ['되묻기', '질문', '입증책임'] },
      { name: '인정하고 넘어서기(예스, 앤드)', stance: 'defend', body: '일부를 흔쾌히 인정해 공격 동력을 빼고, “그렇지만 핵심은…”으로 판을 본론으로 옮긴다.', line: '맞습니다, 제 실수였죠. 그래서 본질을 어떻게 풀지가 중요합니다.', counter: '상대가 인정에 매달려 더 파면 “그건 이미 인정했습니다.”로 닫는다.', tags: ['인정', '예스앤드', '재구성'] },
      { name: '극단으로 밀어 보이기(귀류)', stance: 'defend', body: '상대 논리를 그대로 끝까지 밀어 터무니없는 결론에 이르게 해 스스로 무너뜨린다.', line: '그 말대로면 결국 아무도 책임 안 진다는 거네요. 정말 그걸 원하세요?', counter: '상대가 “그건 극단이다”라면 “그럼 그 논리의 한계를 정해 주시죠.”', tags: ['귀류', '극단', '반증'] },
      { name: '구체·숫자로 못 박기', stance: 'defend', body: '두루뭉술한 공세에 구체적 사실·숫자·날짜를 들이대면 감정 프레임이 깨진다.', line: '“늘 늦었다”고요? 지난 10번 중 9번은 정시였습니다. 날짜 드릴까요?', counter: '상대가 다른 사례로 옮기면 “그 건도 숫자로 봅시다.”로 같은 방식을 유지한다.', tags: ['구체', '숫자', '사실'] },
      { name: '프레임 되돌리기(리프레임)', stance: 'defend', body: '상대가 깐 틀을 받지 않고 더 유리한 틀로 바꿔 같은 사실을 다르게 보이게 한다.', line: '“비용”이 아니라 “안 하면 더 큰 손해”입니다. 그쪽이 따져야 할 건 그거죠.', counter: '상대가 또 틀을 바꾸면 “말의 틀 말고 사실로 정하죠.”로 메타로 올린다.', tags: ['리프레임', '틀바꾸기', '관점'] },
      { name: '냉정 유지·미끼 무시', stance: 'defend', body: '도발·조롱에 반응하지 않는 것 자체가 최강의 방어다. 휘말리는 순간 진다.', line: '(도발을 흘려보내며) 흥미롭네요. 그럼 본론으로.', counter: '상대가 도발 수위를 높이면 “감정 빼고 사안만 보죠.”로 한 번 더 못 박는다.', tags: ['냉정', '무시', '도발'] },
      { name: '제3의 길 제시', stance: 'defend', body: '둘로 좁혀진 판에 모두가 체면을 지킬 제3안을 꺼내 교착을 깬다.', line: '제 안도 그쪽 안도 아닌, 둘 다 사는 길이 하나 있습니다.', counter: '상대가 제3안을 거부하면 “거부하는 이유”를 물어 진짜 속내를 드러낸다.', tags: ['제3안', '윈윈', '교착'] },
      { name: '시간 벌기·재검토 요청', stance: 'defend', body: '즉답 압박을 “검토 후 답”으로 돌려 평정과 정보를 회복한다. 급할수록 멈춘다.', line: '중요한 사안이니 하루만 검토하고 답드리겠습니다.', counter: '상대가 “지금 아니면 없다”면 “그럼 없는 걸로.”라며 데드라인을 되받아친다.', tags: ['시간벌기', '재검토', '보류'] },
    ],
  },
  {
    key: 'rhetoric', label: '말의 기술·수사', icon: '🎤',
    intro: '같은 내용도 어떻게 말하느냐가 승부다. 인물의 입에 무게와 리듬을 실어 준다.',
    tactics: [
      { name: '에토스·파토스·로고스', stance: 'principle', body: '신뢰(사람됨)·감정(마음)·논리(근거) 셋을 섞어야 설득이 선다. 어느 하나만으론 약하다.', line: '저를 믿어 주시고(에토스), 이 사람들 처지를 보시고(파토스), 숫자를 보세요(로고스).', counter: '“셋 중 어느 게 진짜 근거죠? 신뢰·감정 말고 논리만 봅시다.”', tags: ['에토스', '파토스', '로고스'] },
      { name: '세 번 반복(삼단의 리듬)', stance: 'win', body: '핵심을 세 박자로 묶으면 기억에 박히고 단호하게 들린다. “하나, 둘, 셋.”', line: '우리는 멈추지 않고, 물러서지 않고, 끝내 이깁니다.', counter: '리듬에 취하지 말고 “그 셋 중 실제로 가능한 건 몇입니까?”로 내용을 친다.', tags: ['반복', '삼단', '리듬'] },
      { name: '수사적 질문', stance: 'win', body: '답이 정해진 질문을 던져 상대가 스스로 결론에 닿게 한다. 강요 없이 동의를 유도한다.', line: '누가 손해 보는 거래를 하고 싶겠습니까?', counter: '“그 질문엔 함정이 있군요. 답은 ‘경우에 따라’입니다.”로 전제를 깬다.', tags: ['수사의문', '유도', '동의'] },
      { name: '대조·대구', stance: 'win', body: '상반된 두 그림을 나란히 두면 선택이 선명해진다. “이쪽은 어둠, 이쪽은 빛.”', line: '망설이면 잃고, 결단하면 얻습니다. 어느 쪽에 서시겠습니까.', counter: '“그 둘 사이가 진짜 세상입니다.”로 흑백 대조를 회색으로 되돌린다.', tags: ['대조', '대구', '병치'] },
      { name: '이야기·일화로 말하기', stance: 'win', body: '추상적 주장 대신 한 사람의 구체적 이야기를 들면 숫자보다 마음이 먼저 움직인다.', line: '통계는 잊으세요. 어제 그 아이 눈을 봤다면 다르게 말하실 겁니다.', counter: '“한 사람의 이야기는 압니다. 전체 그림은 어떻습니까?”로 일반화를 견제한다.', tags: ['스토리', '일화', '서사'] },
      { name: '여백·뜸 들이기', stance: 'win', body: '결정적 말 앞에서 잠깐 멈추면 그 한마디의 무게가 배가된다. 침묵이 강조다.', line: '제가 원하는 건… (한 박자) …진실, 그것뿐입니다.', counter: '뜸에 끌려가지 않고 “결론부터 듣겠습니다.”로 속도를 가져온다.', tags: ['여백', '포즈', '강조'] },
      { name: '명분·대의 씌우기', stance: 'win', body: '사적 요구를 ‘정의·공동선·미래’ 같은 큰 명분으로 감싸 거절을 어렵게 만든다.', line: '이건 저 한 사람이 아니라, 우리 모두를 위한 일입니다.', counter: '“대의는 좋습니다. 그 안에서 누가 무엇을 얻는지부터 봅시다.”', tags: ['명분', '대의', '정당화'] },
      { name: '상대 말 인용해 되치기', stance: 'defend', body: '상대가 한 말을 그대로 따와 그 말로 상대를 묶는다. 자기 말을 부정하긴 어렵다.', line: '“원칙대로 하자”고 하셨죠. 그럼 이 원칙도 똑같이 적용하시죠.', counter: '“그건 다른 맥락이었습니다.”로 인용의 전제를 분리해 빠져나간다.', tags: ['인용', '되치기', '말묶기'] },
    ],
  },
]

// ---------- 영속(localStorage) ----------
const LS = 'sry:tool:negotiation-tactics-ref:'
const ALL_KEY = '__all__'

function escapeHtml(str: string): string {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export default function NegotiationTacticsRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.group 으로 특정 묶음을 열 수 있게(연계 진입)
  const initialGroup = typeof payload?.group === 'string' && GROUPS.some((g) => g.key === payload.group)
    ? (payload.group as string)
    : ALL_KEY

  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<string>(() => {
    if (initialGroup !== ALL_KEY) return initialGroup
    try {
      const raw = localStorage.getItem(LS + 'group')
      if (raw && (raw === ALL_KEY || GROUPS.some((g) => g.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 성격 필터: principle/win/pressure/foul/defend (빈 선택 = 전체)
  const [stanceFilter, setStanceFilter] = useState<Record<Stance, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'stances')
      if (raw) {
        const o = JSON.parse(raw)
        if (o && typeof o === 'object') return { principle: false, win: false, pressure: false, foul: false, defend: false, ...o } as Record<Stance, boolean>
      }
    } catch { /* ignore */ }
    return { principle: false, win: false, pressure: false, foul: false, defend: false }
  })
  // 펼친 묶음(아코디언). 검색/필터 중엔 자동 펼침.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'open')
      if (raw) {
        const o = JSON.parse(raw)
        if (o && typeof o === 'object') return o as Record<string, boolean>
      }
    } catch { /* ignore */ }
    return {}
  })
  const [random, setRandom] = useState<{ group: Group; tactic: Tactic } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 토스트/복사 타이머 정리용
  const timers = useRef<number[]>([])
  const pushTimer = useCallback((id: number) => { timers.current.push(id) }, [])
  useEffect(() => {
    // 언마운트 정리: 남은 모든 타이머 해제
    return () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = [] }
  }, [])

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'group', group) } catch { /* ignore */ } }, [group])
  useEffect(() => { try { localStorage.setItem(LS + 'stances', JSON.stringify(stanceFilter)) } catch { /* ignore */ } }, [stanceFilter])
  useEffect(() => { try { localStorage.setItem(LS + 'open', JSON.stringify(openGroups)) } catch { /* ignore */ } }, [openGroups])

  const total = useMemo(() => GROUPS.reduce((n, g) => n + g.tactics.length, 0), [])
  const anyStance = useMemo(() => Object.values(stanceFilter).some(Boolean), [stanceFilter])
  const matchStance = useCallback((s: Stance) => !anyStance || stanceFilter[s], [anyStance, stanceFilter])

  // 검색 + 성격 필터를 거친 (묶음→전술). 화면은 묶음별 아코디언.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pool = group === ALL_KEY ? GROUPS : GROUPS.filter((g) => g.key === group)
    return pool.map((g) => {
      const tactics = g.tactics.filter((t) => {
        if (!matchStance(t.stance)) return false
        if (!q) return true
        const hay = (t.name + ' ' + t.body + ' ' + (t.line || '') + ' ' + (t.counter || '') + ' ' + (t.tags || []).join(' ') + ' ' + g.label).toLowerCase()
        return hay.includes(q)
      })
      return { group: g, tactics }
    }).filter((x) => x.tactics.length > 0)
  }, [query, group, matchStance])

  const shownCount = useMemo(() => groups.reduce((n, x) => n + x.tactics.length, 0), [groups])

  const searching = query.trim().length > 0 || anyStance
  const isOpen = useCallback((key: string) => {
    if (searching) return true
    return !!openGroups[key]
  }, [searching, openGroups])

  const toggleGroup = useCallback((key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const toggleStance = useCallback((s: Stance) => {
    setStanceFilter((prev) => ({ ...prev, [s]: !prev[s] }))
  }, [])

  const rollRandom = useCallback(() => {
    const pool: { group: Group; tactic: Tactic }[] = (group === ALL_KEY ? GROUPS : GROUPS.filter((g) => g.key === group))
      .flatMap((g) => g.tactics.filter((t) => matchStance(t.stance)).map((tactic) => ({ group: g, tactic })))
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.tactic.name === prev.tactic.name && pick.group.key === prev.group.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return pick
    })
  }, [group, matchStance])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    const id = window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2300)
    pushTimer(id)
  }, [pushTimer])

  const copy = useCallback((text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      const t = window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
      pushTimer(t)
    }).catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }, [pushTimer])

  // 한 전술을 한 줄(여러 줄) 텍스트로
  const tacticText = (g: Group, t: Tactic) => {
    const sl = STANCE_LABEL[t.stance]
    const parts = [
      `[${g.icon} ${g.label}] ${sl.icon} ${sl.label} · ${t.name}`,
      `· 원리: ${t.body}`,
    ]
    if (t.line) parts.push(`· 대사: ${t.line}`)
    if (t.counter) parts.push(`· 역공: ${t.counter}`)
    return parts.join('\n')
  }

  // ----- 연계 1: 프로젝트 자료(research) 〈협상·설득 전술〉 폴더에 항목 추가 -----
  const addTacticToProject = useCallback((g: Group, t: Tactic) => {
    if (!hasProjectBridge()) return
    const sl = STANCE_LABEL[t.stance]
    const bodyHtml = [
      `<p><b>${escapeHtml(g.icon + ' ' + g.label)}</b></p>`,
      `<p><b>${escapeHtml(sl.icon + ' ' + sl.label)}</b> — ${escapeHtml(t.name)}</p>`,
      `<p>${escapeHtml(t.body)}</p>`,
      t.line ? `<p>💬 <b>대사 예시</b>: ${escapeHtml(t.line)}</p>` : '',
      t.counter ? `<p>🛡️ <b>역공·받아치기</b>: ${escapeHtml(t.counter)}</p>` : '',
      t.tags && t.tags.length ? `<p style="color:#888">태그: ${escapeHtml(t.tags.join(', '))}</p>` : '',
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '협상·설득 전술',
      title: `${t.name} (${g.label} · ${sl.label})`,
      bodyHtml,
    })
    if (id) showToast(`프로젝트 자료 〈협상·설득 전술〉에 ‘${t.name}’을(를) 추가했습니다.`)
  }, [showToast])

  // 한 묶음 전체를 프로젝트에 한 문서로 추가
  const addGroupToProject = useCallback((g: Group, tactics: Tactic[]) => {
    if (!hasProjectBridge()) return
    const lines = tactics.map((t) => {
      const sl = STANCE_LABEL[t.stance]
      const extra = [t.line ? `<br/>💬 ${escapeHtml(t.line)}` : '', t.counter ? `<br/>🛡️ ${escapeHtml(t.counter)}` : ''].join('')
      return `<li><b>${escapeHtml(sl.icon + ' ' + sl.label)} · ${escapeHtml(t.name)}</b> — ${escapeHtml(t.body)}${extra}</li>`
    }).join('')
    const bodyHtml = [
      `<p><b>${escapeHtml(g.icon + ' ' + g.label)}</b></p>`,
      `<p>${escapeHtml(g.intro)}</p>`,
      `<ul>${lines}</ul>`,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '협상·설득 전술',
      title: `${g.label} 전술 정리 (${tactics.length}수)`,
      bodyHtml,
    })
    if (id) showToast(`〈${g.label}〉 전술 ${tactics.length}수를 프로젝트 자료에 추가했습니다.`)
  }, [showToast])

  // ----- 연계 2: 수집함에 담기 -----
  const stashTactic = useCallback((g: Group, t: Tactic) => {
    if (!hasStash()) return
    addToStash({ kind: 'note', label: `${g.label}·${t.name}`, text: tacticText(g, t) })
    showToast(`수집함에 ‘${t.name}’을(를) 담았습니다.`)
  }, [showToast])

  // ----- 연계 3: 스니펫 라이브러리에 저장 -----
  const snippetTactic = useCallback((g: Group, t: Tactic) => {
    addToLibrary('snippets', { text: tacticText(g, t), source: '협상·설득·말싸움 전술 사전', tags: [g.label, STANCE_LABEL[t.stance].label] })
    showToast(`스니펫으로 ‘${t.name}’을(를) 저장했습니다.`)
  }, [showToast])

  // 대사만 따로 복사(장면에 바로)
  const copyLine = useCallback((t: Tactic, id: string) => {
    if (!t.line) return
    copy(t.line, id)
  }, [copy])

  // ----- 연계 4: 관련 도구 열기 -----
  const RELATED: { id: string; label: string }[] = [
    { id: 'dialogue-subtext', label: '대화 서브텍스트' },
    { id: 'relationship-map', label: '관계도' },
    { id: 'character-sheet', label: '인물 시트' },
  ]

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const chip = (on: boolean): React.CSSProperties => ({ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' })

  const stanceBadge = (s: Stance): React.CSSProperties => ({
    fontSize: 10.5, fontWeight: 700, color: STANCE_LABEL[s].color,
    border: `1px solid ${STANCE_LABEL[s].color}`, borderRadius: 6, padding: '1px 6px', flexShrink: 0,
  })

  const lineBox: React.CSSProperties = { fontSize: 12, lineHeight: 1.5, marginTop: 5, padding: '5px 8px', background: 'var(--panel)', borderRadius: 6, borderLeft: '3px solid var(--accent)' }
  const counterBox: React.CSSProperties = { fontSize: 12, lineHeight: 1.5, marginTop: 5, padding: '5px 8px', background: 'var(--panel)', borderRadius: 6, borderLeft: '3px solid #5aa0e0' }

  return (
    <div style={wrap}>
      <div style={hint}>
        설득 원리·협상 기법·논쟁 술수·심리 압박·역공까지 <b>{GROUPS.length}개 묶음</b>의 전술 <b>{total}수</b>를 모았습니다.
        각 수에는 <b>대사 예시</b>와 <b>받아치는 법</b>이 함께 있어, 대화 갈등·심리전 장면에 바로 심을 수 있습니다.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="전술·대사·역공 검색 (예: 침묵, 데드라인, 허수아비, 명분, 프레임)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 묶음 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setGroup(ALL_KEY)} aria-pressed={group === ALL_KEY} style={chip(group === ALL_KEY)}><Emoji e="✨" /> 전체</button>
        {GROUPS.map((g) => (
          <button key={g.key} className="minibtn" onClick={() => setGroup(g.key)} aria-pressed={group === g.key} style={chip(group === g.key)} title={g.intro}>
            <Emoji e={g.icon} /> {g.label}
          </button>
        ))}
      </div>

      {/* 성격 필터 + 무작위 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 한 수</button>
        {(Object.keys(STANCE_LABEL) as Stance[]).map((s) => (
          <button key={s} className="minibtn" onClick={() => toggleStance(s)} aria-pressed={!!stanceFilter[s]} style={chip(!!stanceFilter[s])} title={`${STANCE_LABEL[s].label}만 보기`}>
            <Emoji e={STANCE_LABEL[s].icon} /> {STANCE_LABEL[s].label}
          </button>
        ))}
        <span style={{ ...hint, marginLeft: 'auto' }}>{shownCount}수 표시</span>
      </div>

      {/* 관련 도구 열기(연계) */}
      <div className="linkbar">
        <span className="linkbar-label">관련 도구:</span>
        {RELATED.map((t) => (
          <button key={t.id} className="linkbtn" onClick={() => openToolLinked(t.id)} title={`${t.label} 열기`}><Emoji e="🔗" /> {t.label}</button>
        ))}
      </div>

      {/* 무작위 결과 카드 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.group.icon} /> {random.group.label}</span>
            <span style={stanceBadge(random.tactic.stance)}><Emoji e={STANCE_LABEL[random.tactic.stance].icon} /> {STANCE_LABEL[random.tactic.stance].label}</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{random.tactic.name}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0 0' }}>{random.tactic.body}</div>
          {random.tactic.line && <div style={lineBox}><Emoji e="💬" /> <b>대사</b> — {random.tactic.line}</div>}
          {random.tactic.counter && <div style={counterBox}><Emoji e="🛡️" /> <b>역공</b> — {random.tactic.counter}</div>}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>
            <button className="minibtn" onClick={() => copy(tacticText(random.group, random.tactic), 'rand')}>{copiedKey === 'rand' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
            {random.tactic.line && <button className="minibtn" onClick={() => copyLine(random.tactic, 'rand-line')}>{copiedKey === 'rand-line' ? <>✓ 복사됨</> : <><Emoji e="💬" /> 대사만</>}</button>}
            <button className="linkbtn" onClick={() => addTacticToProject(random.group, random.tactic)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈협상·설득 전술〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
            <button className="linkbtn" onClick={() => stashTactic(random.group, random.tactic)} disabled={!hasStash()} title={hasStash() ? '수집함에 담기' : '수집함을 사용할 수 없습니다'}><Emoji e="📎" /> 수집함</button>
            <button className="linkbtn" onClick={() => snippetTactic(random.group, random.tactic)} title="스니펫 라이브러리에 저장"><Emoji e="🧷" /> 스니펫</button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>✓ {emojify(toast)}</div>
      )}

      {/* 묶음별 아코디언 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {groups.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            검색·필터 결과가 없습니다. 다른 말로 찾거나 필터를 해제해 보세요.
          </div>
        ) : (
          groups.map(({ group: g, tactics }) => {
            const open = isOpen(g.key)
            return (
              <div key={g.key} style={card}>
                {/* 묶음 헤더(펼침/접기) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    className="minibtn"
                    onClick={() => toggleGroup(g.key)}
                    aria-expanded={open}
                    title={open ? '접기' : '펼치기'}
                    style={{ flexShrink: 0 }}
                  >
                    {open ? '▾' : '▸'}
                  </button>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={() => toggleGroup(g.key)}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}><Emoji e={g.icon} /> {g.label}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>{g.intro}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{tactics.length}수</span>
                  <button
                    className="linkbtn"
                    onClick={() => addGroupToProject(g, tactics)}
                    disabled={!hasProjectBridge()}
                    title={hasProjectBridge() ? '이 묶음 전체를 한 문서로 프로젝트에 추가' : '프로젝트에 연결되어 있지 않습니다'}
                    style={{ flexShrink: 0 }}
                  >
                    <Emoji e="📄" /> 전체 추가
                  </button>
                </div>

                {/* 전술 목록 */}
                {open && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    {tactics.map((t, i) => {
                      const tid = g.key + '::' + t.name + '::' + i
                      return (
                        <div key={tid} style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
                            <span style={stanceBadge(t.stance)}><Emoji e={STANCE_LABEL[t.stance].icon} /> {STANCE_LABEL[t.stance].label}</span>
                            <span style={{ fontSize: 13.5, fontWeight: 700 }}>{t.name}</span>
                          </div>
                          <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 4 }}>{t.body}</div>
                          {t.line && <div style={lineBox}><Emoji e="💬" /> <b>대사</b> — {t.line}</div>}
                          {t.counter && <div style={counterBox}><Emoji e="🛡️" /> <b>역공</b> — {t.counter}</div>}
                          {t.tags && t.tags.length > 0 && (
                            <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 4 }}>{t.tags.map((x) => '#' + x).join(' ')}</div>
                          )}
                          <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
                            <button className="minibtn" onClick={() => copy(tacticText(g, t), tid)}>{copiedKey === tid ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
                            {t.line && <button className="minibtn" onClick={() => copyLine(t, tid + '-line')}>{copiedKey === tid + '-line' ? <>✓ 복사됨</> : <><Emoji e="💬" /> 대사만</>}</button>}
                            <button className="linkbtn" onClick={() => addTacticToProject(g, t)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈협상·설득 전술〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
                            <button className="linkbtn" onClick={() => stashTactic(g, t)} disabled={!hasStash()} title={hasStash() ? '수집함에 담기' : '수집함을 사용할 수 없습니다'}><Emoji e="📎" /> 수집함</button>
                            <button className="linkbtn" onClick={() => snippetTactic(g, t)} title="스니펫 라이브러리에 저장"><Emoji e="🧷" /> 스니펫</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>
        <Emoji e="⚖️" /> 궤변·압박 전술은 ‘쓰는 법’이 아니라 <b>인물의 비열함을 그리고, 독자가 그 수를 알아채게</b> 하기 위한 창작 자료입니다.
        대화 장면의 숨은 의도는 <span className="linkbtn" style={{ cursor: 'pointer' }} onClick={() => openToolLinked('dialogue-subtext')}><Emoji e="🔗" /> 대화 서브텍스트</span> 도구와 함께 다듬어 보세요.
      </div>
    </div>
  )
}
