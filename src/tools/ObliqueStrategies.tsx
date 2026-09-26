// 막힘 돌파 카드 — 창작이 막혔을 때 무작위 '전략 카드'를 뽑아 사고의 방향을 강제로 비튼다.
//   브라이언 이노·피터 슈미트의 '오블리크 전략'에서 발상만 빌린, 전적으로 자작한 한국어 카드 120+장.
// 자급식: 외부 네트워크·라이브러리 없음. Math.random + localStorage(보관·스니펫)만 사용.
// 연계(linkbus): 뽑은 전략 카드 + "지금 글에 적용" 답안/스니펫을 자료('research')/'영감 메모' 폴더에 메모로 추가한다.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'oblique-strategies', name: '막힘 돌파 카드', icon: '🎴', group: '영감·발상', intro: '창작이 막힐 때 전략 카드를 뽑아 "지금 글에 적용한다면?"으로 길을 비트세요', w: 520, h: 600 }

const LS = 'sry:tool:oblique-strategies'

interface Strat { id: number; cat: string; text: string; q: string }

// 카테고리별 색/이모지(전략의 결 구분용)
const CATS: Record<string, { icon: string; color: string }> = {
  제약: { icon: '🔗', color: 'var(--accent)' },
  반전: { icon: '🔄', color: '#9b7ede' },
  축소: { icon: '🔬', color: '#6ab0e0' },
  파괴: { icon: '🔨', color: 'var(--warn)' },
  관점: { icon: '👁️', color: '#5fc9a3' },
  우연: { icon: '🎲', color: '#e0a96a' },
  감각: { icon: '🌿', color: '#e06c9f' },
  멈춤: { icon: '🌙', color: 'var(--muted)' },
}

// 120+ 자작 전략 카드. (text = 전략 한 줄, q = 지금 글에 적용 질문)
const RAW: [string, string, string][] = [
  // 제약 (constraints)
  ['제약', '제약을 하나 더 추가하라.', '지금 장면에 금지 규칙 하나를 더 걸면 인물은 무엇을 못 하게 되는가?'],
  ['제약', '가장 중요한 도구를 빼앗아라.', '주인공이 의지하던 능력·물건·사람을 지금 없앤다면 그는 어떻게 버틸까?'],
  ['제약', '단 한 문장으로만 말하게 하라.', '이 장면을 한 문장으로 압축한다면 무엇이 살아남고 무엇이 사라지는가?'],
  ['제약', '시간을 절반으로 줄여라.', '주어진 시간이 갑자기 반으로 줄면 무엇을 포기해야 하는가?'],
  ['제약', '한 가지 색만 남겨라.', '이 장면을 한 가지 색의 빛 아래 둔다면 무엇이 가장 또렷이 보일까?'],
  ['제약', '말하지 못하게 하라.', '인물이 침묵해야만 한다면, 말 대신 무엇으로 그 마음을 드러낼까?'],
  ['제약', '한 공간을 절대 벗어나지 못하게 하라.', '이 장면을 단 하나의 방 안에서 끝내야 한다면 긴장은 어디서 올까?'],
  ['제약', '돈도, 힘도, 시간도 없다고 가정하라.', '모든 자원이 0이라면 주인공은 무엇 하나로 길을 찾을까?'],
  ['제약', '딱 세 사람만 등장시켜라.', '지금 장면에 인물을 셋으로 줄이면 누가 남고 누가 사라지는가?'],
  ['제약', '거짓말을 단 한 번도 못 하게 하라.', '모두가 진실만 말해야 하는 규칙을 걸면 어떤 비밀이 폭발하는가?'],
  ['제약', '같은 단어를 두 번 쓰지 마라.', '이 문단에서 반복되는 단어를 모두 다른 말로 바꾸면 무엇이 새로워지는가?'],
  ['제약', '대사 없이 한 장면을 써라.', '말 한마디 없이 이 장면을 끝낸다면 무엇이 행동으로 옮겨질까?'],
  ['제약', '주인공에게서 이름을 빼앗아라.', '인물을 이름 없이 호칭으로만 부르면 그는 누구로 보이게 되는가?'],
  ['제약', '한 번의 호흡 안에 끝내라.', '이 사건이 단 몇 초 안에 벌어진다면 무엇이 잘려 나가는가?'],
  ['제약', '결말을 먼저 정하고 거기로 몰아가라.', '이 이야기의 마지막 한 줄을 먼저 정한다면 지금 장면은 어디로 향해야 하나?'],

  // 반전 (reversal)
  ['반전', '정반대로 해보라.', '지금 인물이 내린 결정을 정반대로 뒤집으면 이야기는 어디로 가는가?'],
  ['반전', '약점을 무기로 바꿔라.', '주인공의 가장 큰 결함을 이번엔 해결책으로 쓰게 한다면?'],
  ['반전', '돕는 자를 방해하는 자로 만들어라.', '지금 조력자가 슬며시 발목을 잡기 시작한다면 무엇이 어긋날까?'],
  ['반전', '승리를 패배처럼, 패배를 승리처럼 써라.', '이 장면의 결과를 겉과 속이 반대가 되게 한다면?'],
  ['반전', '원인과 결과를 뒤집어라.', '지금 일어난 결과를 먼저 보여주고 원인을 뒤늦게 밝힌다면?'],
  ['반전', '가장 안전한 곳을 가장 위험하게 만들어라.', '주인공이 안심하는 장소에 위협을 숨기면 어떤 장면이 생기는가?'],
  ['반전', '강자를 약자의 위치로 끌어내려라.', '지금 우위에 선 인물을 갑자기 무력하게 만들면 무엇이 드러날까?'],
  ['반전', '질문을 답으로, 답을 질문으로 바꿔라.', '주인공이 찾던 해답이 실은 새로운 질문이었다면?'],
  ['반전', '사랑을 두려움의 얼굴로 그려라.', '애정의 장면을 공포처럼 연출하면 그 마음의 어떤 면이 보이는가?'],
  ['반전', '가장 작은 인물에게 결정권을 줘라.', '지금 가장 힘없는 단역이 이 장면의 운명을 쥐게 한다면?'],
  ['반전', '목표를 손에 쥔 순간 빼앗아라.', '주인공이 원하던 것을 얻는 바로 그 순간 잃게 한다면?'],
  ['반전', '도망치던 자를 추격자로 만들어라.', '쫓기던 인물이 갑자기 뒤돌아 쫓기 시작한다면?'],
  ['반전', '농담을 비극으로 데려가라.', '가벼웠던 이 장면의 웃음 끝에 무거운 진실을 두면?'],
  ['반전', '구원을 거절하게 하라.', '주인공이 내미는 도움의 손길을 끝내 뿌리친다면 그 이유는 무엇일까?'],

  // 축소 (focus / smallest thing)
  ['축소', '가장 사소한 것에 집중하라.', '이 장면에서 가장 하찮아 보이는 디테일 하나를 클로즈업하면?'],
  ['축소', '큰 사건 대신 그 여파만 보여줘라.', '거대한 사건을 직접 그리지 말고 그 뒤의 작은 흔적만 남긴다면?'],
  ['축소', '한 사물에 모든 감정을 담아라.', '인물의 마음을 한 가지 물건으로 대신 말한다면 그것은 무엇인가?'],
  ['축소', '손의 움직임만으로 마음을 드러내라.', '얼굴을 보여주지 않고 손동작만으로 이 감정을 전한다면?'],
  ['축소', '하루가 아니라 한순간을 써라.', '긴 시간을 압축하지 말고 단 한순간을 늘려 쓰면 무엇이 보이는가?'],
  ['축소', '소리 하나에 집중하라.', '이 장면에서 들리는 단 하나의 소리에 모든 주의를 기울이면?'],
  ['축소', '배경의 단역을 주인공처럼 보라.', '스쳐 지나간 인물의 시선으로 이 장면을 다시 본다면?'],
  ['축소', '결정적 대사 한 줄만 남겨라.', '이 대화에서 단 한 문장만 살린다면 어느 줄을 남길까?'],
  ['축소', '냄새 하나로 과거를 불러와라.', '한 가지 냄새가 인물을 어떤 기억으로 끌고 가는가?'],
  ['축소', '아주 천천히, 한 동작씩 묘사하라.', '이 행동을 슬로모션처럼 한 단계씩 쪼개 쓰면 무엇이 길어지는가?'],
  ['축소', '먼지 한 톨의 시점으로 바라보라.', '가장 작은 것의 눈높이에서 이 공간은 어떻게 보이는가?'],
  ['축소', '대답 대신 침묵의 길이를 써라.', '질문에 답하는 대신 그 사이의 정적을 묘사하면?'],

  // 파괴 (destroy / break)
  ['파괴', '가장 아끼는 문장을 지워라.', '이 글에서 가장 잘 썼다고 믿는 문장을 버린다면 무엇이 남는가?'],
  ['파괴', '계획을 찢고 즉흥으로 가라.', '준비한 개요를 무시하고 지금 떠오르는 대로 쓰면 어디로 흘러가는가?'],
  ['파괴', '안전한 선택을 모두 불태워라.', '가장 무난한 전개를 지우면 남는 선택지는 무엇인가?'],
  ['파괴', '첫 문장을 버리고 두 번째부터 시작하라.', '도입부를 통째로 잘라내면 이야기는 어디서 시작되는가?'],
  ['파괴', '주인공을 한 번 완전히 무너뜨려라.', '인물이 가진 모든 것을 잃는 바닥을 지금 만든다면?'],
  ['파괴', '익숙한 결말을 부숴라.', '예상되는 마무리를 깨뜨리면 독자는 어디로 떨어지는가?'],
  ['파괴', '설명을 전부 들어내라.', '친절한 설명을 모두 지우고 장면만 남기면 무엇이 강해지는가?'],
  ['파괴', '완벽한 인물에게 흠집을 내라.', '빈틈없던 인물에게 치명적 약점 하나를 심으면?'],
  ['파괴', '가장 긴 문단을 반으로 쪼개라.', '이 글에서 가장 긴 문단을 둘로 나누면 호흡이 어떻게 달라지는가?'],
  ['파괴', '규칙을 일부러 어겨라.', '내가 정한 세계의 규칙 하나를 깨면 어떤 대가가 따르는가?'],
  ['파괴', '시작과 끝의 자리를 바꿔라.', '이 장면의 처음과 마지막을 맞바꾸면 의미가 어떻게 변하는가?'],

  // 관점 (perspective)
  ['관점', '적의 눈으로 이 장면을 다시 써라.', '지금 장면을 대립하는 인물의 시점으로 옮기면 누가 옳아 보이는가?'],
  ['관점', '10년 뒤의 인물에게 지금을 회상시켜라.', '먼 미래의 인물이 이 순간을 돌아본다면 무엇을 가장 기억할까?'],
  ['관점', '벽이 되어 방을 지켜보라.', '이 공간 자체가 화자라면 어떤 일들을 봐 왔다고 말할까?'],
  ['관점', '아이의 눈높이로 내려가라.', '어린아이가 이 장면을 본다면 무엇을 이해하고 무엇을 놓치는가?'],
  ['관점', '사랑하지 않는 인물을 변호하라.', '내가 악인으로 그린 인물의 입장을 진심으로 옹호한다면?'],
  ['관점', '죽은 자의 시선으로 살아남은 자를 보라.', '떠난 인물이 남은 이들을 본다면 무엇을 말하고 싶을까?'],
  ['관점', '카메라를 천장에 매달아라.', '위에서 내려다보는 시점으로 이 장면을 보면 무엇이 새로 보이는가?'],
  ['관점', '동물의 감각으로 공간을 느껴라.', '이 방을 인간이 아닌 짐승의 후각·청각으로 그린다면?'],
  ['관점', '독자가 인물보다 더 많이 알게 하라.', '인물은 모르지만 독자는 아는 사실 하나를 심으면 긴장은 어떻게 자라는가?'],
  ['관점', '신문 기사처럼 건조하게 써라.', '이 격정의 장면을 무미건조한 보도문으로 쓰면 어떤 아이러니가 생기는가?'],
  ['관점', '미래에서 보낸 편지로 이 장을 써라.', '이 사건을 훗날 누군가에게 보내는 편지 형식으로 바꾸면?'],
  ['관점', '두 사람의 기억이 어긋나게 하라.', '같은 사건을 두 인물이 다르게 기억한다면 진실은 어디에 있는가?'],

  // 우연 (chance / accident)
  ['우연', '예정에 없던 인물을 난입시켜라.', '계획에 없던 누군가가 지금 문을 열고 들어온다면 누구일까?'],
  ['우연', '날씨를 갑자기 뒤집어라.', '맑던 하늘에 폭우가 쏟아진다면 이 장면의 분위기는 어떻게 변하는가?'],
  ['우연', '주사위를 굴리듯 다음을 정하라.', '지금 결정에 동전을 던진다면, 뒷면이 나왔을 때의 전개는?'],
  ['우연', '잘못 걸려온 전화처럼 사건을 끼워라.', '전혀 무관한 우연이 이야기에 끼어든다면 무엇이 어긋나는가?'],
  ['우연', '실수가 진실을 드러내게 하라.', '인물의 사소한 실수 하나가 숨긴 비밀을 새어 나가게 한다면?'],
  ['우연', '관계없는 두 가지를 억지로 이어라.', '지금 글과 무관한 단어 하나(예: 등대, 사과)를 끌어와 엮으면?'],
  ['우연', '버스를 놓치게 하라.', '인물이 사소한 일정을 놓치면서 모든 것이 틀어진다면?'],
  ['우연', '엉뚱한 물건을 손에 쥐여줘라.', '이 장면에 어울리지 않는 물건 하나를 인물 손에 쥐여주면?'],
  ['우연', '소문이 사실을 앞지르게 하라.', '진실보다 소문이 먼저 퍼진다면 인물은 어떤 오해를 사는가?'],
  ['우연', '잃어버린 물건을 다시 등장시켜라.', '오래전 사라졌던 무언가가 엉뚱한 곳에서 나타난다면?'],

  // 감각 (sensory / body)
  ['감각', '눈을 감고 소리·냄새로만 써라.', '시각을 지우고 청각과 후각만으로 이 장면을 그리면 무엇이 살아나는가?'],
  ['감각', '몸의 감각으로 감정을 번역하라.', '인물의 불안을 마음이 아니라 몸의 어디에서 어떻게 느끼게 할까?'],
  ['감각', '온도를 장면에 입혀라.', '이 공간의 차고 더움이 인물의 마음과 어떻게 맞물리는가?'],
  ['감각', '맛 하나로 기억을 깨워라.', '한 입의 맛이 인물을 어떤 시간으로 데려가는가?'],
  ['감각', '촉감을 클로즈업하라.', '인물이 지금 만지고 있는 것의 질감을 세밀히 그리면?'],
  ['감각', '침묵의 질감을 묘사하라.', '이 장면의 고요함은 어떤 무게와 색을 가지고 있는가?'],
  ['감각', '빛과 그림자만으로 분위기를 잡아라.', '이 공간의 명암을 먼저 그리면 어떤 정서가 깔리는가?'],
  ['감각', '몸의 통증으로 시간을 재라.', '인물이 견디는 통증의 변화로 시간의 흐름을 보여주면?'],
  ['감각', '리듬을 먼저, 뜻을 나중에 두어라.', '문장의 소리·박자를 먼저 맞추고 의미를 채우면 어떻게 읽히는가?'],
  ['감각', '냄새로 위험을 예고하라.', '눈에 보이기 전에 코로 먼저 느껴지는 위협을 심으면?'],

  // 멈춤 (pause / let go)
  ['멈춤', '아무것도 하지 마라, 잠깐.', '지금 이 장면에서 인물이 그저 멈춰 서 있게 한다면 무엇이 떠오르는가?'],
  ['멈춤', '한 발 물러나 전체를 보라.', '이 장면을 이야기 전체 안에 놓으면 정말 필요한 장면인가?'],
  ['멈춤', '쓰지 말고 인물에게 물어보라.', '지금 인물에게 "왜?"라고 묻는다면 그는 뭐라 답할까?'],
  ['멈춤', '가장 먼저 떠오른 답을 의심하라.', '지금 떠오른 전개가 너무 익숙하지는 않은가? 두 번째 답은 무엇인가?'],
  ['멈춤', '문제를 풀지 말고 더 키워라.', '이 갈등을 해결하려 하지 말고 한층 더 꼬아 본다면?'],
  ['멈춤', '쉬운 길을 의도적으로 피하라.', '지금 가장 편한 전개를 금지한다면 어떤 길이 남는가?'],
  ['멈춤', '독자에게 빈칸을 남겨라.', '굳이 다 설명하지 말고 독자가 상상할 여백을 어디에 둘까?'],
  ['멈춤', '지금 두려운 장면을 먼저 써라.', '쓰기 가장 겁나는 장면이 무엇인가? 그것부터 쓴다면?'],
  ['멈춤', '완성하려 하지 말고 망쳐도 좋다고 하라.', '이 장면을 일부러 엉망으로 빠르게 쏟아 내면 무엇이 발견되는가?'],
  ['멈춤', '어제 쓴 것을 오늘 의심하라.', '지난번 결정이 정말 최선이었나? 다시 고른다면 무엇을 바꿀까?'],

  // ── 확장 카드 ──
  // 제약
  ['제약', '한 글자도 고치지 못한다고 가정하라.', '이 문장이 영영 고칠 수 없다면, 그래도 내보낼 수 있는 문장인가?'],
  ['제약', '주인공의 기억을 하루치만 남겨라.', '인물이 어제 일을 모두 잊었다면 지금 어떻게 행동할까?'],
  ['제약', '딱 한 번의 기회만 줘라.', '되돌릴 수 없는 단 한 번의 선택이라면 인물은 무엇을 거는가?'],
  ['제약', '빛이 사라진 어둠 속에서 쓰라.', '시야가 완전히 막힌 상태로 이 장면을 진행하면 무엇에 의지할까?'],
  ['제약', '숫자 셋 안에 사건을 끝내라.', '세 동작·세 대사 안에 이 장면을 닫는다면 무엇만 남기는가?'],
  // 반전
  ['반전', '믿었던 진실을 거짓으로 만들어라.', '인물(또는 독자)이 굳게 믿어온 사실이 거짓이었다면?'],
  ['반전', '구하러 간 자가 도리어 갇히게 하라.', '구출하러 들어간 인물이 거꾸로 갇힌다면 누가 그를 구하는가?'],
  ['반전', '기쁜 소식을 불행의 씨앗으로 만들어라.', '지금의 좋은 소식이 훗날 재앙의 시작이라면?'],
  ['반전', '가장 오래된 적을 유일한 아군으로 바꿔라.', '오래 미워한 인물과 손잡아야만 한다면 어떤 거래가 필요한가?'],
  // 축소
  ['축소', '시계 초침 하나에 긴장을 걸어라.', '한 박자, 한 초의 흐름만으로 이 장면의 긴장을 만든다면?'],
  ['축소', '한 번의 눈맞춤만으로 관계를 보여줘라.', '말 없이 시선 한 번으로 두 인물의 관계를 드러낸다면?'],
  ['축소', '버려진 물건 하나로 인물의 과거를 말하라.', '구석의 낡은 사물 하나가 인물의 어떤 시절을 증언하는가?'],
  ['축소', '한 단어를 반복해 리듬을 만들어라.', '핵심 단어 하나를 의도적으로 되울리면 어떤 정서가 쌓이는가?'],
  // 파괴
  ['파괴', '두 번째로 좋아하는 인물을 위험에 빠뜨려라.', '안전지대에 둔 인물을 흔들면 이야기의 무게중심이 어디로 가는가?'],
  ['파괴', '도입의 친절함을 모두 걷어내라.', '독자를 안내하던 설명을 지우고 곧장 사건으로 던지면?'],
  ['파괴', '한 챕터를 통째로 들어내라.', '이 장면(또는 챕터)이 사라져도 이야기가 굴러간다면, 정말 필요한가?'],
  ['파괴', '결말을 두 번 뒤집어라.', '마무리에 도달한 듯한 순간을 한 번 더 무너뜨리면?'],
  // 관점
  ['관점', '사물의 입장에서 사건을 증언하게 하라.', '문·거울·시계 같은 사물이 이 장면을 봤다면 무엇을 말할까?'],
  ['관점', '가해자를 동정하게 만들어라.', '잘못한 인물의 사연을 들려주면 독자의 마음은 어디로 기우는가?'],
  ['관점', '먼 훗날의 역사가가 평가하게 하라.', '백 년 뒤 누군가 이 사건을 기록한다면 어떻게 요약할까?'],
  ['관점', '들리지 않는 속마음만 따로 적어라.', '겉말과 속마음을 나란히 두면 어떤 균열이 보이는가?'],
  // 우연
  ['우연', '엉뚱한 시각에 누군가 깨어 있게 하라.', '아무도 없어야 할 시간에 한 사람이 깨어 있다면 무엇을 보는가?'],
  ['우연', '오래된 사진 한 장이 떨어지게 하라.', '예기치 못한 옛 사진 한 장이 지금 사건을 어떻게 흔드는가?'],
  ['우연', '날짜·숫자의 우연을 의미로 만들어라.', '겹치는 날짜나 숫자가 인물에게 어떤 징조로 읽히는가?'],
  ['우연', '낯선 이의 한마디가 길을 바꾸게 하라.', '스쳐 간 사람의 한마디가 인물의 결심을 어떻게 돌려놓는가?'],
  // 감각
  ['감각', '심장 박동의 속도로 문장을 조절하라.', '인물의 맥박에 맞춰 문장을 길고 짧게 바꾸면 긴장이 어떻게 변하는가?'],
  ['감각', '한 가지 소음이 점점 커지게 하라.', '배경의 작은 소리가 서서히 커진다면 무엇을 예고하는가?'],
  ['감각', '계절의 냄새로 시간을 알려라.', '공기에서 어떤 계절의 냄새가 나는가, 그것이 무엇을 환기하는가?'],
  ['감각', '입안의 마름·갈증으로 두려움을 써라.', '공포를 설명하는 대신 몸의 메마름으로 보여준다면?'],
  // 멈춤
  ['멈춤', '한 장면을 하루 묵혀 두라.', '지금 멈추고 내일 다시 본다면, 무엇이 달라 보일 것 같은가?'],
  ['멈춤', '쓰던 손을 멈추고 산책하듯 떠올려라.', '키보드에서 손을 떼고 인물을 그저 따라가 보면 어디로 가는가?'],
  ['멈춤', '"그래서?"를 다섯 번 물어라.', '이 장면에 "그래서?"를 거듭 물으면 진짜 핵심에 닿는가?'],
  ['멈춤', '독자가 졸 만한 부분을 찾아 지워라.', '솔직히 지루한 대목은 어디인가? 그곳을 들어내면 무엇이 빨라지는가?'],
]

const ALL: Strat[] = RAW.map((r, i) => ({ id: i, cat: r[0], text: r[1], q: r[2] }))

// Fisher-Yates 셔플
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 프로젝트 '영감 메모' 본문(HTML) — 뽑은 전략 카드(들) + 적용 답안/질문을 단락 HTML 로.
function drawnBodyHtml(cards: Strat[], notes: Record<number, string>): string {
  return cards.map((c) => {
    const note = (notes[c.id] || '').trim()
    return (
      `<p><strong>🎴 [${escHtml(c.cat)}] ${escHtml(c.text)}</strong></p>` +
      `<p>❓ 지금 글에 적용한다면? ${escHtml(c.q)}</p>` +
      (note ? `<p>📝 ${escHtml(note)}</p>` : '')
    )
  }).join('')
}

interface Saved { id: number; cat: string; text: string; q: string; note: string }

export default function ObliqueStrategies({ payload }: { payload?: Record<string, unknown> }) {
  const [drawCount, setDrawCount] = useState(1)
  const [drawn, setDrawn] = useState<Strat[]>([])
  // 뽑은 카드별 "지금 글에 적용" 임시 답안(보관/프로젝트 추가 전 작업칸)
  const [applyNotes, setApplyNotes] = useState<Record<number, string>>({})
  const [saved, setSaved] = useState<Saved[]>(() => {
    try {
      const raw = localStorage.getItem(LS)
      if (raw) {
        const obj = JSON.parse(raw)
        const arr = Array.isArray(obj) ? obj : (obj && Array.isArray(obj.saved) ? obj.saved : null)
        if (Array.isArray(arr)) {
          return arr.filter((s) => s && typeof s.text === 'string').map((s) => ({
            id: typeof s.id === 'number' ? s.id : -1,
            cat: typeof s.cat === 'string' ? s.cat : '전략',
            text: String(s.text),
            q: typeof s.q === 'string' ? s.q : '',
            note: typeof s.note === 'string' ? s.note : '',
          }))
        }
      }
    } catch { /* ignore */ }
    return []
  })
  const [tab, setTab] = useState<'deck' | 'saved'>('deck')
  const [copied, setCopied] = useState('')
  const nonce = useRef(0)

  // 보관 카드 저장(자동)
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify({ saved })) } catch { /* 저장 실패 graceful */ }
  }, [saved])

  // payload.draw 가 오면(연계 진입 등) 자동으로 한 장 뽑기
  useEffect(() => {
    if (payload && payload.draw) draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 복사/상태 피드백 타이머 정리(언마운트/재설정)
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(''), 1800)
    return () => window.clearTimeout(t)
  }, [copied])

  const draw = () => {
    const my = ++nonce.current
    const n = Math.min(Math.max(1, drawCount), Math.min(6, ALL.length))
    const picked = shuffle(ALL).slice(0, n)
    if (my === nonce.current) {
      setDrawn(picked)
      setApplyNotes({})
      setTab('deck')
    }
  }

  const savedHas = (id: number) => saved.some((s) => s.id === id)

  const toggleSave = (c: Strat) => {
    setSaved((prev) => {
      if (prev.some((s) => s.id === c.id)) return prev.filter((s) => s.id !== c.id)
      return [{ id: c.id, cat: c.cat, text: c.text, q: c.q, note: (applyNotes[c.id] || '').trim() }, ...prev]
    })
  }

  const removeSaved = (id: number) => setSaved((prev) => prev.filter((s) => s.id !== id))

  const setSavedNote = (id: number, note: string) =>
    setSaved((prev) => prev.map((s) => (s.id === id ? { ...s, note } : s)))

  const setApplyNote = (id: number, note: string) =>
    setApplyNotes((prev) => ({ ...prev, [id]: note }))

  const moveSaved = (id: number, dir: -1 | 1) => {
    setSaved((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      const ni = idx + dir
      if (ni < 0 || ni >= prev.length) return prev
      const a = prev.slice()
      ;[a[idx], a[ni]] = [a[ni], a[idx]]
      return a
    })
  }

  const copyText = (key: string, text: string) => {
    if (!navigator.clipboard) { setCopied('unsupported:' + key); return }
    navigator.clipboard.writeText(text)
      .then(() => setCopied(key))
      .catch(() => setCopied('fail:' + key))
  }

  const cardToText = (c: { cat: string; text: string; q: string; note?: string }) =>
    `🎴 [${c.cat}] ${c.text}\n❓ 지금 글에 적용한다면? ${c.q}` + (c.note && c.note.trim() ? `\n📝 ${c.note.trim()}` : '')

  const copyAllDrawn = () => {
    if (!drawn.length) return
    copyText('all', drawn.map((c) => cardToText({ ...c, note: applyNotes[c.id] })).join('\n\n'))
  }

  // 프로젝트 연동 — 현재 뽑은 전략 카드(들) + 적용 답안을 자료(research)/'영감 메모' 폴더에 메모로 추가.
  const toProject = () => {
    if (!drawn.length) return
    if (!hasProjectBridge()) { setCopied('project:unlinked'); return }
    const cats = Array.from(new Set(drawn.map((c) => c.cat)))
    const title = drawn.length === 1
      ? `돌파 메모 — ${drawn[0].text}`
      : `돌파 메모 — ${drawn.length}장 (${cats.join('·')})`
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '영감 메모',
      title,
      bodyHtml: drawnBodyHtml(drawn, applyNotes),
      synopsis: drawn.map((c) => `[${c.cat}] ${c.text}`).join(' / '),
      meta: { 카테고리: cats.join(', '), 카드수: String(drawn.length) },
    })
    setCopied(id ? 'project:ok' : 'project:fail')
  }

  const catColor = (cat: string) => CATS[cat]?.color || 'var(--accent)'
  const catIcon = (cat: string) => CATS[cat]?.icon || '🎴'

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const cardBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }
  const noteArea: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', resize: 'vertical',
    background: 'var(--paper)', color: 'var(--text)',
    border: '1px solid var(--border)', borderRadius: 8,
    padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit',
  }

  const Badge = ({ cat }: { cat: string }) => (
    <span style={{ fontSize: 11, fontWeight: 700, color: catColor(cat), border: `1px solid ${catColor(cat)}`, borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap' }}>
      <Emoji e={catIcon(cat)} /> {cat}
    </span>
  )

  return (
    <div style={wrap}>
      <div style={hint}>
        창작이 막힐 때 <b>전략 카드</b>를 뽑아 사고의 방향을 강제로 비트세요. 카드 아래 칸에 <b>"지금 글에 적용한다면?"</b> 답을 적고, 마음에 들면 <b>보관</b>하거나 프로젝트 메모로 남길 수 있습니다.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('deck')} aria-pressed={tab === 'deck'}
          style={{ borderColor: tab === 'deck' ? 'var(--accent)' : 'var(--border)', color: tab === 'deck' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🎴" /> 덱 ({ALL.length})
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐" /> 보관함 ({saved.length})
        </button>
      </div>

      {tab === 'deck' && (
        <>
          {/* 뽑기 개수 조절 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>한 번에</span>
            {[1, 2, 3].map((n) => (
              <button key={n} className="minibtn" onClick={() => setDrawCount(n)} aria-pressed={drawCount === n}
                style={{ borderColor: drawCount === n ? 'var(--accent)' : 'var(--border)', color: drawCount === n ? 'var(--text)' : 'var(--muted)', minWidth: 36 }}>
                {n}장
              </button>
            ))}
            <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={draw}><Emoji e="🔀" /> 카드 뽑기 / 다시 섞기</button>
          </div>

          {/* 뽑은 카드 목록 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
            {drawn.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="🎴" /></div>
                덱을 섞어 카드를 뽑아보세요.<br />
                <span style={{ fontSize: 12 }}>총 {ALL.length}장의 돌파 전략이 기다립니다.</span>
              </div>
            )}
            {drawn.map((c) => {
              const sv = savedHas(c.id)
              const k = 'd' + c.id
              return (
                <div key={c.id} style={cardBox}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Badge cat={c.cat} />
                    <span style={{ flex: 1 }} />
                    <button className="minibtn" onClick={() => toggleSave(c)} title={sv ? '보관 해제' : '보관(작성한 답안 포함)'}
                      style={{ borderColor: sv ? 'var(--accent)' : 'var(--border)' }}>
                      {sv ? <><Emoji e="⭐" /> 보관됨</> : '☆ 보관'}
                    </button>
                    <button className="minibtn" onClick={() => copyText(k, cardToText({ ...c, note: applyNotes[c.id] }))} title="복사">
                      {copied === k ? '✓' : <Emoji e="📋" />}
                    </button>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.45 }}>{c.text}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--muted)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                    <span style={{ color: catColor(c.cat), fontWeight: 700 }}>지금 글에 적용한다면? </span>{c.q}
                  </div>
                  <textarea
                    value={applyNotes[c.id] || ''}
                    onChange={(e) => setApplyNote(c.id, e.target.value)}
                    placeholder="여기에 답을 적어보세요 — 이 전략을 지금 쓰는 글에 어떻게 적용할지…"
                    rows={2}
                    style={noteArea}
                  />
                </div>
              )
            })}
          </div>

          {drawn.length > 1 && (
            <button className="minibtn" onClick={copyAllDrawn}>{copied === 'all' ? '✓ 전체 복사됨' : <><Emoji e="📋" /> 뽑은 {drawn.length}장 모두 복사</>}</button>
          )}

          {/* 프로젝트 연계 — 현재 뽑은 카드(들) + 적용 답안을 '영감 메모'로 저장 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button
              className="linkbtn"
              onClick={toProject}
              disabled={!drawn.length || !hasProjectBridge()}
              title={
                !hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다'
                : !drawn.length ? '먼저 카드를 뽑아주세요'
                : '뽑은 전략 카드와 적용 답안을 프로젝트 자료(영감 메모 폴더)에 추가'
              }
            >
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
          </div>

          {copied === 'project:ok' && <div style={{ ...hint, color: 'var(--ok)' }}>✓ 프로젝트 자료(영감 메모)에 추가했어요.</div>}
          {copied === 'project:unlinked' && <div style={hint}>프로젝트에 연결되어 있지 않습니다.</div>}
          {copied === 'project:fail' && <div style={hint}>프로젝트 추가에 실패했어요.</div>}
          {copied.startsWith('unsupported') && <div style={hint}>이 환경에서는 클립보드 복사가 지원되지 않습니다.</div>}
          {copied.startsWith('fail') && <div style={hint}>복사에 실패했습니다. 직접 선택해 복사해 주세요.</div>}
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐" /></div>
              보관한 카드가 없습니다.<br />
              <span style={{ fontSize: 12 }}>덱에서 ☆ 보관을 눌러 마음에 드는 전략과 답안(스니펫)을 모아보세요.</span>
            </div>
          )}
          {saved.map((s, i) => {
            const k = 's' + s.id
            return (
              <div key={s.id + '-' + i} style={cardBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Badge cat={s.cat} />
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                  <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">▼</button>
                  <button className="minibtn" onClick={() => copyText(k, cardToText(s))} title="복사">
                    {copied === k ? '✓' : <Emoji e="📋" />}
                  </button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제"
                    style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑" /></button>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.45 }}>{s.text}</div>
                <div style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--muted)' }}><Emoji e="❓" /> {s.q}</div>
                <textarea
                  value={s.note}
                  onChange={(e) => setSavedNote(s.id, e.target.value)}
                  placeholder="이 전략을 내 글에 어떻게 적용할지 스니펫으로 적어두세요…"
                  rows={2}
                  style={noteArea}
                />
              </div>
            )
          })}
        </div>
      )}

      <div style={hint}>카드는 출발점일 뿐입니다. 전략을 그대로 따르지 말고 지금 쓰는 글에 맞게 비틀어 보세요.</div>
      <div className="license-note">
        영감 출처: 브라이언 이노·피터 슈미트의 <i>오블리크 전략(Oblique Strategies)</i> 발상에서 착안. 카드 문구는 모두 본 도구의 자작(自作) 한국어 텍스트입니다.
      </div>
    </div>
  )
}
