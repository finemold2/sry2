// 반전·진범 공개 설계기 — 미스터리·추리의 클라이맥스(반전/진범 공개) 장면을 설계한다.
//  ① 반전 유형(의외의 범인/서술트릭/이중반전/공범)을 고르면, 각 유형에 맞는 설계 가이드·체크리스트가 펼쳐진다.
//  ② 복선 회수 점검표: 진범을 가리킨 단서(복선)를 적고, 공정한가/회수했는가를 표로 점검한다(미회수 경고).
//  ③ 클라이맥스 설계 생성기: 공개 계기 × 방식 × 무대 × 진범 반응 × 탐정 결정타 × 마지막 한 방 × 폭로 시점 × 진짜 동기를
//     슬롯 조합으로 굴려 폭로 장면 골자를 대량 생성한다(잠금/재생성, 조합 수 110억 가지 — 18^8). 조사는 받침을 보고 자동 선택.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 API 안 씀(전부 로컬, 자작 데이터). localStorage 자동 저장.
// 연계(linkbus): 완성한 클라이맥스 설계를 자료('research')/'구조' 폴더 문서로 추가(addToProject),
//   폭로 한 줄을 글감 스니펫으로 저장(addToLibrary), 복선·회수 추적기 등 관련 도구를 연다(openToolLinked).
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'mystery-twist-designer',
  name: '반전·진범 공개 설계기',
  icon: '🕵️',
  group: '구조',
  genre: '미스터리·추리',
  intro: '반전 유형(의외의 범인·서술트릭·이중반전·공범)을 고르고 복선 회수를 점검해 진범 공개 클라이맥스를 설계하세요',
  w: 760,
  h: 680,
}

const LS = 'sry:tool:mystery-twist-designer'

// ───────────────────────── 반전 유형 정의 ─────────────────────────
interface TwistType {
  key: string
  label: string
  icon: string
  tagline: string
  // 이 유형으로 설계할 때 미리 던지는 핵심 설계 질문(클라이맥스 직조용)
  prompts: string[]
  // 공정성·완성도 체크리스트(직접 점검)
  checks: string[]
  // 흔한 함정(피해야 할 것)
  pitfalls: string[]
}

const TWISTS: TwistType[] = [
  {
    key: 'unexpected',
    label: '의외의 범인',
    icon: '🎭',
    tagline: '가장 의심하지 않던 자가 진범 — "그 사람만은 아닐 거야"의 배신',
    prompts: [
      '진범은 왜 독자의 용의선상에서 벗어나 있었는가(직업·약자 위장·피해자 행세·확고한 알리바이)?',
      '진범에게 일찍부터 심어 둔, 돌이켜보면 결정적인 단서는 무엇인가?',
      '진범을 보호해 준 "이 사람일 리 없다"는 심리적 안전장치는 무엇이었나?',
      '가장 유력했던 가짜 용의자(레드 헤링)는 어떻게 혐의를 벗는가?',
      '진범의 진짜 동기는 표면적 사건과 어떻게 다른가?',
    ],
    checks: [
      '진범을 가리키는 단서가 최소 3개 이상, 모두 공개 전에 독자에게 노출되었다',
      '진범이 사건 초·중반에 충분히 등장해 "있었다는 사실"이 인지된다',
      '알리바이/위장이 깨지는 논리가 비약 없이 성립한다',
      '레드 헤링이 억지가 아니라 자연스러운 의심으로 작동했다',
      '동기가 진범의 성격·과거와 일관된다',
    ],
    pitfalls: [
      '공개 직전에 처음 등장한 인물을 범인으로 내세우기(반칙)',
      '단서를 하나도 깔지 않고 "사실은 이 사람"이라 선언하기',
      '의외성만 좇다 동기가 비논리적이 되는 것',
    ],
  },
  {
    key: 'narrative',
    label: '서술 트릭',
    icon: '📖',
    tagline: '서술 자체가 독자를 속였다 — 시점·시간·정체의 착시',
    prompts: [
      '독자가 당연하게 가정한 전제(성별·생사·1인=1인·시간순서)는 무엇이며 그것을 어떻게 흔드는가?',
      '거짓말을 하지 않으면서 오해를 유도한 문장·호칭·장면 배치는 무엇인가?',
      '재독(再讀) 시 "아, 그래서!" 하고 맞아떨어질 복선 문장은 어디에 있는가?',
      '트릭이 풀리는 순간, 독자의 그림 전체가 어떻게 재배열되는가?',
      '서술자(시점인물)는 신뢰할 수 없는 자였는가, 아니면 정직했는데 독자가 오독한 것인가?',
    ],
    checks: [
      '거짓 서술 없이 "독자의 추측"만으로 속였다(작가가 직접 거짓말하지 않음)',
      '진실을 다시 읽으면 모든 문장이 모순 없이 성립한다',
      '착시를 떠받친 핵심 문장/단서가 본문에 실제로 존재한다',
      '트릭이 풀린 뒤 사건의 인과가 새롭게, 그러나 일관되게 재구성된다',
      '트릭이 단순 말장난이 아니라 주제·감정과 맞물린다',
    ],
    pitfalls: [
      '서술자가 본문에서 대놓고 거짓 정보를 진술해 놓고 트릭이라 우기기',
      '다시 읽으면 앞뒤가 안 맞는 "사후 정당화"',
      '트릭을 위한 트릭 — 폭로 외에 이야기에 기여가 없음',
    ],
  },
  {
    key: 'double',
    label: '이중 반전',
    icon: '🔄',
    tagline: '범인이 밝혀진 뒤 또 한 번 뒤집힌다 — 진짜 진실은 그 너머',
    prompts: [
      '1차 반전(거짓 해결)은 무엇이며, 왜 그것이 그럴듯해 보이는가?',
      '1차 해결을 의도적으로 흐트러뜨리는 "마지막 위화감" 한 조각은 무엇인가?',
      '2차 반전(진짜 진실)은 1차와 어떤 단서를 공유하며 어떻게 재해석되는가?',
      '누가 1차 반전을 연출했는가(가짜 자백/희생양/조작된 증거)?',
      '두 번째 뒤집기가 첫 번째보다 더 무겁고 의미 있는 충격을 주는가?',
    ],
    checks: [
      '1차 해결도 단서로 뒷받침되어 독자가 일단 납득한다',
      '2차 반전의 단서가 1차 반전 이전에 이미 깔려 있다',
      '두 반전이 같은 사실을 다르게 해석하는 구조(정보 추가가 아니라 재해석)',
      '2차 반전이 더 강한 감정·주제적 무게를 가진다(단순 횟수 늘리기가 아님)',
      '진짜 진실이 모든 미해결을 닫는다(또 다른 구멍을 만들지 않음)',
    ],
    pitfalls: [
      '반전을 위한 반전 — 매번 새 정보를 추가해 독자가 추리할 수 없게 만들기',
      '2차가 1차보다 김빠지는 안티클라이맥스',
      '뒤집기를 너무 많이 해 신뢰를 잃는 것(피로한 "또?")',
    ],
  },
  {
    key: 'accomplice',
    label: '공범 / 협력자',
    icon: '🤝',
    tagline: '단독범이 아니었다 — 조력자·협력자·또 다른 손이 숨어 있었다',
    prompts: [
      '겉으로 단독범처럼 보이게 한 분업(실행/은폐/알리바이 조작)은 어떻게 나뉘었나?',
      '공범은 어떤 신뢰의 위치(조력자·목격자·수사 협력자·피해자 측)에 있었는가?',
      '두 사람을 잇는 관계·약점·이해관계는 무엇인가?',
      '공범의 존재를 일찍 암시하면서도 단독범으로 오인하게 한 단서는?',
      '공범 관계는 어떻게 균열·배신·자백으로 드러나는가?',
    ],
    checks: [
      '"혼자서는 불가능했다"는 물리적/시간적 모순이 단서로 제시된다',
      '공범의 협력 행위가 사건 중에 실제로 목격·기록되었다(돌이켜보면 수상)',
      '단독범 가설로는 닫히지 않는 빈틈이 명확히 존재한다',
      '공범의 동기·관계가 설득력 있게 그려진다',
      '공범이 드러나는 계기(균열·증언·물증)가 논리적이다',
    ],
    pitfalls: [
      '아무 암시 없던 인물을 막판에 "사실 공범"으로 투입',
      '공범을 단지 트릭 메우기용 도구로만 쓰기(동기 부재)',
      '분업이 비현실적이라 협력 자체가 성립하지 않는 것',
    ],
  },
]

// ───────────── 클라이맥스(폭로 장면) 설계 생성기 슬롯 ─────────────
interface Slot { key: string; label: string; icon: string; desc: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'trigger', label: '공개 계기', icon: '⚡', desc: '무엇이 진실의 봉인을 푸는가',
    faces: [
      '사라진 줄 알았던 결정적 물증이 엉뚱한 곳에서 나타난다',
      '죽어 가던 목격자가 마지막 숨으로 한마디를 남긴다',
      '진범이 알 리 없는 사실을 무심코 입에 올린다',
      '맞아떨어지지 않던 시간표의 1분이 끝내 들어맞는다',
      '봉인된 편지·유언이 약속된 날에 개봉된다',
      '되살아난 기억 한 조각이 거꾸로 모든 것을 비춘다',
      '두 번째 시체(또는 두 번째 사건)가 가설을 무너뜨린다',
      '거울처럼 반복된 과거 사건의 패턴이 포개진다',
      '용의자 전원을 한자리에 모은 자리에서 함정이 닫힌다',
      '버려진 줄 알았던 흉기에서 뜻밖의 흔적이 검출된다',
      '알리바이를 떠받치던 증인이 거짓을 자백한다',
      '진범이 보낸 협박장의 글씨·습관이 정체를 누설한다',
      '피해자가 남긴 다잉 메시지가 비로소 해독된다',
      '진범만 알 수 있는 위치에서 분실물이 발견된다',
      '폐쇄됐던 현장이 재개방되며 숨은 통로가 드러난다',
      '오래전 찍힌 사진 한 장이 거짓 진술을 무너뜨린다',
      '한 번도 어긋난 적 없던 진범의 습관이 처음으로 흐트러진다',
      '닫혀 있던 금고가 열리며 감춰 둔 장부가 모습을 드러낸다',
    ],
  },
  {
    key: 'mode', label: '공개 방식', icon: '🎬', desc: '진실이 어떤 형식으로 드러나는가',
    faces: [
      '탐정이 용의자 전원 앞에서 추리를 한 단계씩 재구성한다',
      '진범 스스로 무너져 자백을 토해 낸다',
      '결정적 물증을 탁자에 내려놓으며 침묵으로 압박한다',
      '거짓 해결을 먼저 제시해 진범을 방심시킨 뒤 뒤집는다',
      '제3자의 폭로 증언이 모두를 얼어붙게 한다',
      '재현 실험으로 "그날 그 시각"을 눈앞에서 되살린다',
      '진범에게만 통하는 덫을 놓아 자기 입으로 자백하게 한다',
      '편지·녹음·일기의 형태로 진실이 낭독된다',
      '두 갈래 가설을 나란히 놓고 단 하나만 모순 없음을 증명한다',
      '진범이 던진 반박이 도리어 자신을 옭아맨다',
      '피해자 시점으로 그날의 진실이 회상으로 펼쳐진다',
      '말없이 한 사람을 향해 손가락이 멈춘다',
      '숨겨진 공범이 먼저 입을 열어 판이 깨진다',
      '탐정이 일부러 틀린 척하다 결정적 한 수로 역전한다',
      '법정·심문실에서 교차신문으로 거짓이 벗겨진다',
      '진실을 아는 자가 마지막에야 침묵을 깨고 나선다',
      '모아 둔 단서를 시간순으로 펼쳐 하나의 그림으로 잇는다',
      '진범에게 빠져나갈 거짓 핑계를 일부러 내주고 그 말꼬리를 잡는다',
    ],
  },
  {
    key: 'stage', label: '폭로 무대', icon: '🏛️', desc: '어디에서 막이 오르는가',
    faces: [
      '눈보라에 갇힌 산장의 거실, 모두가 모인 밤',
      '사건이 시작된 바로 그 현장으로의 귀환',
      '폭풍에 발이 묶인 외딴섬 저택',
      '마지막 정차역을 앞둔 야간 침대열차의 식당칸',
      '법정의 증인석, 정적이 흐르는 한순간',
      '비 내리는 한밤의 경찰 심문실',
      '관계자만 초대된 호화 만찬의 식탁',
      '불 꺼진 극장의 무대 위, 막이 오르기 직전',
      '낡은 등대의 꼭대기, 회전하는 불빛 아래',
      '장례식이 끝난 뒤 텅 빈 저택의 서재',
      '안개 자욱한 부두, 떠나려는 배를 앞두고',
      '정전된 병원의 비상등이 깜빡이는 복도',
      '추모 모임으로 다시 모인 동창들의 별장',
      '폐관 직전 박물관의 어두운 전시실',
      '눈 덮인 산정의 케이블카, 멈춰 선 채 흔들리는 공중',
      '진범의 거짓 알리바이가 만들어진 바로 그 방',
      '강이 내려다보이는 낡은 다리 위, 마지막 가로등 아래',
      '사건의 모든 단서가 핀으로 꽂힌 수사본부의 화이트보드 앞',
    ],
  },
  {
    key: 'reaction', label: '진범 반응', icon: '😶', desc: '정체가 드러난 자는 어떻게 반응하는가',
    faces: [
      '소름 끼치도록 차분하게 모든 것을 인정한다',
      '끝까지 결백을 주장하다 사소한 모순에 무너진다',
      '도리어 비웃으며 자신의 완벽함을 자랑한다',
      '눈물로 동기를 토로하며 동정을 호소한다',
      '도주를 시도하다 미리 깔린 덫에 걸린다',
      '"증거가 어디 있느냐"며 마지막까지 버틴다',
      '체념한 듯 옅게 웃으며 진실을 술술 풀어놓는다',
      '광기에 사로잡혀 또 다른 범행을 시도한다',
      '침묵으로 일관하다 결정적 물증 앞에 고개를 떨군다',
      '공범을 끌어들여 책임을 떠넘기려 한다',
      '자신이 옳았다며 범행을 정의라 강변한다',
      '오히려 안도한 표정으로 무거운 짐을 내려놓는다',
      '탐정의 추리에서 단 하나의 허점을 파고들어 반격한다',
      '진실이 밝혀지자 스스로 목숨을 끊으려 한다',
      '"이제야 끝났다"며 모든 것을 담담히 받아들인다',
      '거짓 자백으로 진짜 진실을 한 겹 더 숨기려 든다',
      '아무 일도 없었다는 듯 태연히 자리를 뜨려다 발이 묶인다',
      '모든 것을 부정하다 자신의 이름이 불리자 그대로 굳어 버린다',
    ],
  },
  {
    key: 'clincher', label: '탐정의 결정타', icon: '🔑', desc: '논리를 봉인하는 마지막 한 수',
    faces: [
      '진범만이 알 수 있었던 정보의 출처를 짚어 낸다',
      '물리적으로 불가능한 동선의 1분을 메워 보인다',
      '위장된 알리바이의 시계가 조작됐음을 증명한다',
      '필적·습관·말버릇의 일치로 익명의 가면을 벗긴다',
      '현장에 남은 미세한 흔적의 주인을 특정한다',
      '거짓 증언들 사이의 단 하나의 모순을 끄집어낸다',
      '진범이 흘린 사소한 말실수를 되짚어 함정을 닫는다',
      '두 사건을 잇는 공통의 서명(수법)을 드러낸다',
      '피해자의 다잉 메시지를 올바로 재해석한다',
      '숨겨진 동기를 과거의 한 사건과 연결 짓는다',
      '공범의 존재로만 설명되는 빈틈을 메운다',
      '서술의 착시를 깨는 단 한 줄의 사실을 제시한다',
      '진범이 결코 모를 수 없는 "그 자리에 있었음"을 입증한다',
      '거짓 해결을 뒤집는 마지막 위화감의 정체를 밝힌다',
      '심어 둔 가짜 정보에 진범만 반응했음을 들춘다',
      '동기·기회·수단 셋이 단 한 사람에게서만 만난다고 못 박는다',
      '누구도 눈치채지 못한 사소한 순서의 어긋남을 짚어 낸다',
      '진범이 스스로 만든 알리바이가 도리어 그를 범행에 묶어 둠을 보여 준다',
    ],
  },
  {
    key: 'closer', label: '마지막 한 방', icon: '🌑', desc: '폭로 뒤에 남는 여운·후일담',
    faces: [
      '진실은 밝혀졌으나 정의는 끝내 비껴간다',
      '범인을 단죄한 탐정의 마음에 무거운 그림자가 남는다',
      '피해자도 결백하지만은 않았다는 또 다른 진실이 드러난다',
      '모두가 조금씩 공모했음을 깨닫고 침묵이 흐른다',
      '진범의 동기에 누구도 돌을 던지지 못한다',
      '한 사람을 살리기 위해 진실의 일부가 묻힌다',
      '사건은 닫혔으나 더 큰 어둠의 그림자가 어른거린다',
      '탐정은 알면서도 진실을 세상에 밝히지 않기로 한다',
      '용서와 단죄 사이에서 누구도 답을 내리지 못한다',
      '진범의 마지막 한마디가 모두의 가슴에 못으로 박힌다',
      '진실을 안 대가로 탐정은 소중한 것을 잃는다',
      '다음 사건의 씨앗이 마지막 장면에 조용히 심긴다',
      '구원받은 줄 알았던 자가 가장 깊이 무너진다',
      '진실은 한 사람의 비밀로 남아 무덤까지 따라간다',
      '닫힌 사건이 남긴 질문이 독자에게 되돌아온다',
      '모든 것이 제자리로 돌아갔지만, 아무것도 예전 같지 않다',
      '진실을 마주한 자리에 누구도 입을 떼지 못하는 긴 침묵이 내려앉는다',
      '단 한 사람만이 모든 진실을 끝까지 모른 채 남겨진다',
    ],
  },
  {
    key: 'timing', label: '폭로 시점', icon: '🕰️', desc: '진실이 드러나는 시간대·순간',
    faces: [
      '자정을 넘긴 깊은 새벽',
      '마지막 노을이 스러지는 저물녘',
      '동이 트기 직전 가장 어두운 시각',
      '폭풍이 절정에 이른 한밤중',
      '모두가 떠나려던 작별의 순간',
      '시계가 정각을 알리는 종소리 끝에',
      '첫눈이 소리 없이 내려앉는 밤',
      '장례의 마지막 조문이 끝난 직후',
      '정전으로 모든 불이 꺼진 찰나',
      '기차의 출발을 알리는 기적이 울리기 직전',
      '안개가 가장 짙게 깔린 이른 아침',
      '오랜 비가 그치고 정적이 찾아든 순간',
      '축제의 불꽃이 마지막으로 터지는 동안',
      '약속된 재회의 그 날, 정해진 시각에',
      '모두가 잠든 사이 홀로 깨어 있던 한 사람의 시간에',
      '사건이 일어난 그날과 똑같은 시각에',
      '마지막 손님이 문을 나선 뒤 가게가 텅 빈 시간에',
      '해가 완전히 저문 뒤 마지막 불빛마저 꺼질 무렵',
    ],
  },
  {
    key: 'motive', label: '진짜 동기', icon: '💔', desc: '폭로가 드러낸 범행의 뿌리(명사)',
    faces: [
      '오래 묵은 복수심',
      '감출 수 없던 죄책감',
      '뒤틀린 사랑',
      '버림받은 자의 분노',
      '지키려 한 비밀',
      '가눌 수 없는 질투',
      '돈을 향한 끝없는 탐욕',
      '잃어버린 명예에 대한 집착',
      '오해에서 비롯된 증오',
      '누군가를 대신 살리려는 희생',
      '세상을 향한 비뚤어진 정의감',
      '두려움이 부른 충동',
      '가족을 지키려는 절박함',
      '오래 감춰 온 열등감',
      '돌이킬 수 없는 한순간의 실수',
      '이루지 못한 꿈에 대한 미련',
      '배신당한 신뢰',
      '끝내 인정받지 못한 외로움',
    ],
  },
]

// 복선 회수 점검 항목
type ClueStatus = 'fair' | 'weak' | 'missing'
interface Clue {
  id: string
  text: string      // 단서/복선 내용
  where: string     // 심은 위치
  status: ClueStatus
}

interface SaveShape {
  title: string
  twist: string                       // 선택한 반전 유형 key
  notes: Record<string, string>       // 유형별 설계 메모(프롬프트 답)
  clues: Clue[]
  active: string[]                     // 활성 슬롯
}

// ───────────────────────── 유틸 ─────────────────────────
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
// 받침 유무 판정(한글 음절만, 그 외/숫자는 가장 가까운 한글로 폴백)
function hasJong(word: string): boolean {
  const w = (word || '').trim()
  if (!w) return false
  const ch = w[w.length - 1]
  const code = ch.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0
  // 숫자/영문 끝: 받침 있는 것으로 흔히 발음되는 경우(0,1,3,6,7,8 등)는 단순화—여기선 한글 데이터만 다루므로 기본 false
  return false
}
// 종성이 ㄹ인지(으로/로 판정용)
function jongIsRieul(word: string): boolean {
  const w = (word || '').trim()
  if (!w) return false
  const ch = w[w.length - 1]
  const code = ch.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 === 8
  return false
}
// 조사 자동 선택(괄호 이중표기 없이 실제 하나를 골라 붙임)
const josaEulReul = (w: string) => w + (hasJong(w) ? '을' : '를')
const josaIGa = (w: string) => w + (hasJong(w) ? '이' : '가')
const josaEunNeun = (w: string) => w + (hasJong(w) ? '은' : '는')
const josaEuro = (w: string) => w + (!hasJong(w) || jongIsRieul(w) ? '로' : '으로')
const fmt = (n: number) => n.toLocaleString('ko-KR')
function isClueStatus(s: unknown): s is ClueStatus { return s === 'fair' || s === 'weak' || s === 'missing' }
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 활성 슬롯들의 조합 가짓수(수십억~수백억 가지 목표)
function comboCount(activeKeys: string[]): number {
  return activeKeys.reduce((acc, k) => {
    const s = SLOTS.find((x) => x.key === k)
    return acc * (s ? s.faces.length : 1)
  }, 1)
}
// 전체 조합 수(고정 표시용) — 8슬롯 × 각 18면 = 18^8 = 11,007,531,648
const TOTAL_COMBOS = SLOTS.reduce((a, s) => a * s.faces.length, 1)

function load(): SaveShape {
  const empty: SaveShape = { title: '', twist: 'unexpected', notes: {}, clues: [], active: SLOTS.map((s) => s.key) }
  try {
    const raw = localStorage.getItem(LS)
    if (!raw) return empty
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return empty
    const twist = TWISTS.some((t) => t.key === p.twist) ? p.twist : 'unexpected'
    const notes: Record<string, string> = {}
    if (p.notes && typeof p.notes === 'object') {
      for (const k of Object.keys(p.notes)) notes[k] = str(p.notes[k])
    }
    const clues: Clue[] = Array.isArray(p.clues)
      ? p.clues
          .filter((c: unknown) => c && typeof c === 'object' && typeof (c as Clue).text === 'string')
          .map((c: Record<string, unknown>) => ({
            id: String(c.id || newId()),
            text: str(c.text),
            where: str(c.where),
            status: isClueStatus(c.status) ? c.status : 'fair',
          }))
      : []
    let active: string[] = Array.isArray(p.active)
      ? p.active.filter((k: unknown): k is string => typeof k === 'string' && SLOTS.some((s) => s.key === k))
      : []
    if (!active.length) active = SLOTS.map((s) => s.key)
    return { title: str(p.title), twist, notes, clues, active }
  } catch { return empty }
}

export default function MysteryTwistDesigner({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef<SaveShape>(load())
  const [title, setTitle] = useState(init.current.title)
  const [twist, setTwist] = useState(init.current.twist)
  const [notes, setNotes] = useState<Record<string, string>>(init.current.notes)
  const [clues, setClues] = useState<Clue[]>(init.current.clues)
  const [active, setActive] = useState<string[]>(init.current.active)

  // 단서 입력
  const [cText, setCText] = useState('')
  const [cWhere, setCWhere] = useState('')

  // 생성기 상태
  const [results, setResults] = useState<Record<string, string>>({})
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)

  // 탭
  const [tab, setTab] = useState<'design' | 'clues' | 'climax'>('design')
  const [toast, setToast] = useState('')
  const [copied, setCopied] = useState('')
  const nonce = useRef(0)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload.genre / payload.twist 활용(연계 진입) — 1회
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    if (!payload || typeof payload !== 'object') return
    const wantTwist = str((payload as Record<string, unknown>).twist)
    if (wantTwist && TWISTS.some((t) => t.key === wantTwist)) setTwist(wantTwist)
    const wantTitle = str((payload as Record<string, unknown>).title)
    if (wantTitle && !init.current.title) setTitle(wantTitle)
    // payload.genre 가 와도 본 도구는 미스터리 전용이라 맥락만 참고(특별 분기 불필요)
  }, [payload])

  // 저장
  useEffect(() => {
    const shape: SaveShape = { title, twist, notes, clues, active }
    try { localStorage.setItem(LS, JSON.stringify(shape)) }
    catch { if (mounted.current) setToast('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [title, twist, notes, clues, active])

  // 토스트/복사 피드백 정리(언마운트 포함)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 2000)
    return () => window.clearTimeout(t)
  }, [toast])
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => { if (mounted.current) setCopied('') }, 1500)
    return () => window.clearTimeout(t)
  }, [copied])

  // 굴림 애니메이션 자동 해제 + 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 320)
    return () => window.clearTimeout(t)
  }, [rolling])

  const currentTwist = TWISTS.find((t) => t.key === twist) || TWISTS[0]

  // ── 설계 메모 ──
  const setNote = (key: string, v: string) => setNotes((prev) => ({ ...prev, [key]: v }))

  // ── 단서 CRUD ──
  const addClue = () => {
    const t = cText.trim()
    if (!t) return
    setClues((prev) => [...prev, { id: newId(), text: t, where: cWhere.trim(), status: 'fair' }])
    setCText(''); setCWhere('')
  }
  const onClueKey = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addClue() } }
  const removeClue = (id: string) => setClues((prev) => prev.filter((c) => c.id !== id))
  const cycleStatus = (id: string) => setClues((prev) => prev.map((c) => {
    if (c.id !== id) return c
    const order: ClueStatus[] = ['fair', 'weak', 'missing']
    const next = order[(order.indexOf(c.status) + 1) % order.length]
    return { ...c, status: next }
  }))
  const moveClue = (id: string, dir: -1 | 1) => setClues((prev) => {
    const i = prev.findIndex((c) => c.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= prev.length) return prev
    const a = prev.slice()
    ;[a[i], a[j]] = [a[j], a[i]]
    return a
  })

  const fairCount = clues.filter((c) => c.status === 'fair').length
  const weakCount = clues.filter((c) => c.status === 'weak').length
  const missingCount = clues.filter((c) => c.status === 'missing').length
  // 공정성 점수: 공정한 단서(fair) 기준. 3개 이상이면 합격선.
  const fairnessOk = fairCount >= 3 && missingCount === 0

  // ── 생성기 ──
  const toggleSlot = (key: string) => {
    setActive((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev
        return prev.filter((k) => k !== key)
      }
      return SLOTS.filter((s) => prev.includes(s.key) || s.key === key).map((s) => s.key)
    })
  }
  // 비활성 슬롯 결과/잠금 정리
  useEffect(() => {
    setResults((prev) => {
      const next: Record<string, string> = {}
      active.forEach((k) => { if (prev[k]) next[k] = prev[k] })
      return next
    })
    setLocked((prev) => {
      const next: Record<string, boolean> = {}
      active.forEach((k) => { if (prev[k]) next[k] = true })
      return next
    })
  }, [active])

  const forge = useCallback(() => {
    const my = ++nonce.current
    setRolling(true)
    setResults((prev) => {
      if (my !== nonce.current) return prev
      const next: Record<string, string> = { ...prev }
      active.forEach((k) => {
        if (locked[k] && prev[k]) return
        const slot = SLOTS.find((s) => s.key === k)
        if (!slot) return
        let f = pick(slot.faces)
        if (f === prev[k] && slot.faces.length > 1) f = pick(slot.faces)
        next[k] = f
      })
      return next
    })
  }, [active, locked])

  const toggleLock = (key: string) => setLocked((prev) => ({ ...prev, [key]: !prev[key] }))

  const rolledList = active
    .map((k) => ({ slot: SLOTS.find((s) => s.key === k)!, face: results[k] }))
    .filter((r) => r.slot && r.face) as { slot: Slot; face: string }[]
  const hasResults = rolledList.length > 0
  const byKey: Record<string, string> = {}
  rolledList.forEach((r) => { byKey[r.slot.key] = r.face })
  const combos = comboCount(active)

  // 폭로 장면 골자 문장으로 엮기
  const composeClimax = (): string => {
    const parts: string[] = []
    // 무대(장소) + 시점(시간) — 둘 다 명사구라 자연스럽게 한 문장으로 엮는다
    if (byKey.timing && byKey.stage) parts.push(`${byKey.timing}, ${byKey.stage}에서`)
    else if (byKey.stage) parts.push(`${byKey.stage}에서`)
    else if (byKey.timing) parts.push(`${byKey.timing}`)
    if (byKey.trigger) parts.push(`${byKey.trigger}`)
    if (byKey.mode) parts.push(`그리고 ${byKey.mode}`)
    if (byKey.clincher) parts.push(`결정타로 ${byKey.clincher}`)
    if (byKey.reaction) parts.push(`드러난 진범은 ${byKey.reaction}`)
    // 동기(명사)에 받침 따라 이/가를 골라 붙인다(괄호 이중표기 없이)
    if (byKey.motive) parts.push(`그 모든 일의 뿌리에는 ${josaIGa(byKey.motive)} 있었다`)
    if (byKey.closer) parts.push(`그리고 마지막으로 ${byKey.closer}`)
    if (!parts.length) return ''
    return parts.map((p) => p.replace(/[.。]$/, '')).join('. ') + '.'
  }
  const climaxLine = hasResults ? composeClimax() : ''

  // ── 복사 ──
  const doCopy = (key: string, text: string) => {
    const done = () => { if (mounted.current) setCopied(key) }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fb(text, done))
      else fb(text, done)
    } catch { fb(text, done) }
  }
  const fb = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setToast('복사에 실패했습니다.') }
  }

  // ── 종합 텍스트(전체 설계) ──
  const statusLabel = (s: ClueStatus) => s === 'fair' ? '공정' : s === 'weak' ? '약함' : '미회수'
  const buildText = (): string => {
    const L: string[] = []
    L.push(title.trim() ? `[반전·진범 공개 설계] ${title.trim()}` : '[반전·진범 공개 설계]')
    L.push(`반전 유형: ${currentTwist.icon} ${currentTwist.label} — ${currentTwist.tagline}`)
    L.push('')
    L.push('■ 설계 메모')
    currentTwist.prompts.forEach((q, i) => {
      const a = str(notes[`${twist}:${i}`]).trim()
      L.push(`${i + 1}. ${q}`)
      if (a) L.push(`   → ${a}`)
    })
    L.push('')
    L.push(`■ 복선 회수 점검 (공정 ${fairCount} · 약함 ${weakCount} · 미회수 ${missingCount})`)
    if (clues.length === 0) L.push('(등록된 단서 없음)')
    clues.forEach((c, i) => {
      L.push(`${i + 1}. [${statusLabel(c.status)}] ${c.text}${c.where ? ` (심은 곳: ${c.where})` : ''}`)
    })
    if (!fairnessOk) {
      L.push('')
      L.push(`⚠ 공정성 점검: 진범을 가리키는 공정한 단서가 ${fairCount}개${missingCount > 0 ? `, 미회수 단서 ${missingCount}개` : ''}. 공정한 단서 3개 이상·미회수 0을 권장합니다.`)
    }
    if (climaxLine) {
      L.push('')
      L.push('■ 클라이맥스(폭로 장면) 골자')
      L.push(climaxLine)
    }
    return L.join('\n')
  }

  // ── 프로젝트 본문(HTML) ──
  const buildBodyHtml = (): string => {
    const P: string[] = []
    P.push(`<p><b>반전 유형:</b> ${escHtml(currentTwist.label)} — ${escHtml(currentTwist.tagline)}</p>`)
    P.push('<h4>설계 메모</h4>')
    currentTwist.prompts.forEach((q, i) => {
      const a = str(notes[`${twist}:${i}`]).trim()
      P.push(`<p><b>${i + 1}. ${escHtml(q)}</b>${a ? `<br/>→ ${escHtml(a)}` : ''}</p>`)
    })
    P.push(`<h4>복선 회수 점검 (공정 ${fairCount} · 약함 ${weakCount} · 미회수 ${missingCount})</h4>`)
    if (clues.length === 0) P.push('<p>(등록된 단서 없음)</p>')
    else {
      P.push('<table border="1" cellspacing="0" cellpadding="4"><thead><tr><th>상태</th><th>단서·복선</th><th>심은 위치</th></tr></thead><tbody>')
      clues.forEach((c) => {
        P.push(`<tr><td>${escHtml(statusLabel(c.status))}</td><td>${escHtml(c.text)}</td><td>${escHtml(c.where || '-')}</td></tr>`)
      })
      P.push('</tbody></table>')
    }
    if (!fairnessOk) P.push(`<p>⚠ 공정성: 공정 단서 ${fairCount}개${missingCount > 0 ? `, 미회수 ${missingCount}개` : ''} — 공정 단서 3개 이상·미회수 0 권장.</p>`)
    if (climaxLine) {
      P.push('<h4>클라이맥스(폭로 장면) 골자</h4>')
      P.push(`<p style="font-size:15px;line-height:1.8;">${escHtml(climaxLine)}</p>`)
      P.push('<ul>')
      rolledList.forEach((r) => P.push(`<li><b>${escHtml(r.slot.label)}:</b> ${escHtml(r.face)}</li>`))
      P.push('</ul>')
    }
    return P.join('')
  }

  // ── 프로젝트 추가(구조 폴더) ──
  const toProject = () => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '구조',
      title: title.trim() ? `🕵️ 반전 설계 — ${title.trim()}` : `🕵️ 반전 설계 — ${currentTwist.label}`,
      bodyHtml: buildBodyHtml(),
      synopsis: climaxLine || currentTwist.tagline,
      meta: {
        반전유형: currentTwist.label,
        공정단서: String(fairCount),
        미회수단서: String(missingCount),
        클라이맥스: climaxLine ? '설계됨' : '미설계',
      },
    })
    setToast(id ? '프로젝트 자료 〈구조〉 폴더에 반전 설계를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ── 스니펫 저장(폭로 한 줄) ──
  const saveSnippet = () => {
    if (!climaxLine) { setToast('먼저 클라이맥스를 굴려 주세요.'); return }
    addToLibrary('snippets', {
      text: `[폭로 장면] ${climaxLine}`,
      source: '반전·진범 공개 설계기',
      tags: ['글감', '미스터리', '반전', '클라이맥스', currentTwist.label],
    })
    setToast('스니펫 라이브러리에 폭로 장면을 저장했습니다.')
  }

  // ───────────────────────── 스타일 ─────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' }
  const head: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', padding: '12px 14px 8px', borderBottom: '1px solid var(--border)' }
  const titleInput: React.CSSProperties = { flex: 1, minWidth: 0, padding: '8px 11px', fontSize: 14, fontWeight: 600, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const tabRow: React.CSSProperties = { display: 'flex', gap: 6, padding: '8px 14px 0' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }
  const input: React.CSSProperties = { flex: 1, minWidth: 0, padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const smallInput: React.CSSProperties = { ...input, fontSize: 13, padding: '7px 9px' }
  const ta: React.CSSProperties = { width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.55, fontFamily: 'inherit' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.55 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, padding: '20px 8px' }

  const tabBtn = (k: typeof tab, label: string): React.CSSProperties => ({
    padding: '7px 13px', fontSize: 13, fontWeight: 600, borderRadius: '9px 9px 0 0', cursor: 'pointer',
    border: '1px solid var(--border)', borderBottom: tab === k ? '1px solid var(--panel)' : '1px solid var(--border)',
    background: tab === k ? 'var(--panel)' : 'var(--chrome-2)',
    color: tab === k ? 'var(--text)' : 'var(--muted)',
  })
  const twistBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, minWidth: 130, textAlign: 'left', padding: '10px 12px', borderRadius: 11, cursor: 'pointer',
    border: active ? '2px solid var(--accent)' : '1px solid var(--border)',
    background: active ? 'var(--chrome-2)' : 'var(--paper)', color: 'var(--text)',
  })
  const statChip = (color: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
    padding: '4px 10px', borderRadius: 999, background: 'var(--chrome-2)', border: `1px solid ${color}`, color: 'var(--text)',
  })
  const statusBadge = (s: ClueStatus): React.CSSProperties => ({
    flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#fff', borderRadius: 7, padding: '3px 9px', cursor: 'pointer', whiteSpace: 'nowrap', border: 'none',
    background: s === 'fair' ? 'var(--ok)' : s === 'weak' ? 'var(--warn)' : 'var(--err, #d9534f)',
  })

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="🕵️"/></span>
        <input style={titleInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="작품 제목 (선택)" maxLength={80} aria-label="작품 제목" />
        <button className="minibtn" onClick={() => doCopy('all', buildText())} title="전체 설계를 텍스트로 복사">{copied === 'all' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 전체 복사</>}</button>
      </div>

      <div style={tabRow}>
        <button style={tabBtn('design', '')} onClick={() => setTab('design')}><Emoji e="🎭"/> 반전 설계</button>
        <button style={tabBtn('clues', '')} onClick={() => setTab('clues')}><Emoji e="🧩"/> 복선 점검 ({clues.length})</button>
        <button style={tabBtn('climax', '')} onClick={() => setTab('climax')}><Emoji e="🎬"/> 클라이맥스</button>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', marginTop: -1 }} />

      <div style={body}>
        {toast && <div style={{ ...hint, color: 'var(--accent)' }}>{toast}</div>}

        {/* ───────── 탭 1: 반전 설계 ───────── */}
        {tab === 'design' && (
          <>
            <div style={hint}>
              <b style={{ color: 'var(--text)' }}>반전 유형</b>을 고르면 그 유형에 맞춘 설계 질문·공정성 체크리스트·함정 경고가 펼쳐집니다. 답을 채우며 진범 공개를 설계하세요.
            </div>

            {/* 반전 유형 선택 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TWISTS.map((t) => {
                const on = t.key === twist
                return (
                  <button key={t.key} style={twistBtn(on)} onClick={() => setTwist(t.key)} aria-pressed={on}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}><Emoji e={t.icon}/> {t.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.4 }}>{t.tagline}</div>
                  </button>
                )
              })}
            </div>

            {/* 설계 질문 */}
            <div style={panel}>
              <div style={sectionTitle}><Emoji e={currentTwist.icon}/> {currentTwist.label} — 클라이맥스 설계 질문</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {currentTwist.prompts.map((q, i) => {
                  const nk = `${twist}:${i}`
                  return (
                    <div key={nk}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 5, lineHeight: 1.5 }}>{i + 1}. {q}</div>
                      <textarea style={ta} rows={2} value={str(notes[nk])} onChange={(e) => setNote(nk, e.target.value)} placeholder="여기에 설계 답을 적으세요…" />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 공정성 체크리스트 */}
            <div style={panel}>
              <div style={sectionTitle}><Emoji e="✅"/> 공정성·완성도 체크리스트</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {currentTwist.checks.map((c, i) => (
                  <li key={i} style={{ fontSize: 13, lineHeight: 1.55 }}>{c}</li>
                ))}
              </ul>
            </div>

            {/* 함정 경고 */}
            <div style={{ ...panel, borderColor: 'var(--warn)' }}>
              <div style={{ ...sectionTitle, color: 'var(--warn)' }}><Emoji e="⚠"/> 흔한 함정(피하세요)</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {currentTwist.pitfalls.map((p, i) => (
                  <li key={i} style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text)' }}>{p}</li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* ───────── 탭 2: 복선 회수 점검 ───────── */}
        {tab === 'clues' && (
          <>
            <div style={hint}>
              진범을 가리키는 <b style={{ color: 'var(--text)' }}>단서(복선)</b>를 모두 적고, 각 단서가 독자에게 <b>공정</b>하게 제시됐는지 점검하세요. 상태를 눌러 <b>공정 → 약함 → 미회수</b>로 순환합니다. <b>공정한 단서 3개 이상·미회수 0</b>이 후더닛 공정성의 기본선입니다.
            </div>

            {/* 통계 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <span style={statChip('var(--ok)')}>✓ 공정 {fairCount}</span>
              <span style={statChip('var(--warn)')}>△ 약함 {weakCount}</span>
              <span style={statChip('var(--err, #d9534f)')}>● 미회수 {missingCount}</span>
            </div>
            {!fairnessOk ? (
              <div style={{ background: 'var(--chrome-2)', border: '1px solid var(--warn)', borderRadius: 10, padding: '9px 12px', fontSize: 13, lineHeight: 1.55 }}>
                <Emoji e="⚠"/> 공정한 단서가 {fairCount}개입니다{missingCount > 0 ? `, 미회수 단서 ${missingCount}개가 남아 있습니다` : ''}. 진범을 가리키는 <b>공정한 단서 3개 이상</b>을 깔고 <b>미회수를 0</b>으로 만들어 "다시 읽으면 보이는" 공정한 반전을 완성하세요.
              </div>
            ) : (
              <div style={{ background: 'var(--chrome-2)', border: '1px solid var(--ok)', borderRadius: 10, padding: '9px 12px', fontSize: 13, lineHeight: 1.55 }}>
                ✓ 공정성 기본선 충족 — 공정한 단서 {fairCount}개, 미회수 0. 재독 시 진실이 드러나는 구조입니다.
              </div>
            )}

            {/* 단서 추가 */}
            <div style={panel}>
              <div style={sectionTitle}>단서·복선 추가</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input style={input} value={cText} onChange={(e) => setCText(e.target.value)} onKeyDown={onClueKey} placeholder="단서 내용 — 진범을 가리키는 것 (예: 진범만 알 수 있던 시계 멈춤)" maxLength={300} aria-label="단서 내용" />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={smallInput} value={cWhere} onChange={(e) => setCWhere(e.target.value)} onKeyDown={onClueKey} placeholder="심은 위치 (예: 2장 / 도입부)" maxLength={120} aria-label="심은 위치" />
                  <button className="btn-primary" onClick={addClue} disabled={!cText.trim()} style={{ flexShrink: 0 }}>추가</button>
                </div>
              </div>
            </div>

            {/* 단서 목록 */}
            <div style={panel}>
              {clues.length === 0 ? (
                <div style={empty}>아직 등록된 단서가 없어요.<br />진범을 가리키는 첫 복선을 심어 보세요.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {clues.map((c, i) => (
                    <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                      <button style={{ ...statusBadge(c.status), width: 58, flexShrink: 0 }} onClick={() => cycleStatus(c.id)} title="공정 → 약함 → 미회수 순환" aria-label="단서 상태 전환">
                        {c.status === 'fair' ? '✓공정' : c.status === 'weak' ? '△약함' : '●미회수'}
                      </button>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.45, wordBreak: 'break-word' }}>
                        {c.text}
                        {c.where.trim() && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}><Emoji e="📍"/> {c.where}</span>}
                      </span>
                      <div style={{ flexShrink: 0, display: 'flex', gap: 2 }}>
                        <button className="minibtn" style={{ padding: '0 6px' }} onClick={() => moveClue(c.id, -1)} disabled={i === 0} title="위로">▲</button>
                        <button className="minibtn" style={{ padding: '0 6px' }} onClick={() => moveClue(c.id, 1)} disabled={i === clues.length - 1} title="아래로">▼</button>
                        <button className="minibtn" style={{ padding: '0 6px' }} onClick={() => removeClue(c.id)} title="삭제"><Emoji e="🗑️"/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="linkbar">
              <span className="linkbar-label">관련 도구:</span>
              <button className="linkbtn" onClick={() => openToolLinked('setup-payoff', { title })} title="복선·회수 추적기를 엽니다"><Emoji e="🔫"/> 복선·회수 추적기</button>
              <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck')} title="플롯 반전 카드덱을 엽니다"><Emoji e="🃏"/> 플롯 반전 카드</button>
            </div>
          </>
        )}

        {/* ───────── 탭 3: 클라이맥스 생성기 ───────── */}
        {tab === 'climax' && (
          <>
            <div style={hint}>
              <b style={{ color: 'var(--text)' }}>공개 계기·방식·무대·진범 반응·결정타·마지막 한 방</b>을 슬롯 조합으로 굴려 진범 공개 장면의 골자를 만드세요. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴립니다.
            </div>

            {/* 슬롯 선택 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SLOTS.map((s) => {
                const on = active.includes(s.key)
                return (
                  <button key={s.key} className="minibtn" onClick={() => toggleSlot(s.key)} aria-pressed={on} title={s.desc}
                    style={{ opacity: on ? 1 : 0.5, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                    <Emoji e={s.icon}/> {s.label}{on ? '' : ' +'}
                  </button>
                )
              })}
            </div>

            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmt(combos)}</b>가지 {combos >= 100000000 ? '(수억~수백억 이상)' : combos >= 1000000 ? '(수백만 이상)' : ''} · 전체 슬롯 사용 시 <b>{fmt(TOTAL_COMBOS)}</b>가지
            </div>

            {/* 슬롯별 결과 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {active.map((k) => {
                const slot = SLOTS.find((s) => s.key === k)!
                const face = results[k]
                const isLocked = !!locked[k]
                return (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 22, width: 28, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-12deg) scale(1.15)' : 'none' }}><Emoji e={slot.icon}/></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{slot.label}</div>
                      <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.45, color: face ? 'var(--text)' : 'var(--muted)' }}>
                        {face ? (rolling && !isLocked ? '…' : face) : '— 굴려주세요 —'}
                      </div>
                    </div>
                    <button className="minibtn" onClick={() => toggleLock(k)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                      style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                      {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* 완성 골자 */}
            <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🎬"/> 폭로 장면 골자</div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: hasResults ? 'var(--text)' : 'var(--muted)' }}>
                {climaxLine || '슬롯을 골라 굴리면, 진범 공개 클라이맥스의 골자가 만들어집니다.'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn-primary" style={{ flex: 1, minWidth: 130 }} onClick={forge}><Emoji e="🎬"/> 생성 / 다시 굴리기</button>
              <button className="minibtn" onClick={() => doCopy('climax', climaxLine + '\n\n' + rolledList.map((r) => `${r.slot.icon} ${r.slot.label}: ${r.face}`).join('\n'))} disabled={!hasResults}>
                {copied === 'climax' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
              </button>
              <button className="minibtn" onClick={saveSnippet} disabled={!hasResults} title="글감 스니펫 라이브러리에 저장"><Emoji e="✂️"/> 스니펫</button>
            </div>
          </>
        )}

        {/* ───────── 공통: 프로젝트 연계 ───────── */}
        <div className="linkbar">
          <span className="linkbar-label">연계:</span>
          <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()}
            title={hasProjectBridge() ? '반전 설계·복선표·클라이맥스를 프로젝트 자료 〈구조〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
            <Emoji e="📄"/> 프로젝트에 추가
          </button>
        </div>

        <div className="license-note" style={{ ...hint, marginTop: 2 }}>
          이 도구는 외부 데이터를 불러오지 않으며, 입력·설계 내용만 이 브라우저(localStorage)에 자동 저장됩니다. 반전은 출발점일 뿐 — 내 인물·동기·세계에 맞춰 비틀어 완성하세요.
        </div>
      </div>
    </div>
  )
}
