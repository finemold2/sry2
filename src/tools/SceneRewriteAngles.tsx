// 장면 다시쓰기 관점 — 한 장면(원고 조각)을 다섯 축으로 비틀어 다시 써 보게 돕는 도구.
//   ① POV(시점) 교체  ② 시제 변경  ③ 서술 거리  ④ 감각 초점  ⑤ 시작 지점(인 미디어스 레스 등)
// 각 축마다 풍부한 카드(정의·효과·전환 가이드·체크리스트·예시 before/after)를 제공하고,
// '관점 조합 생성기'가 슬롯을 무작위로 섞어(잠금/재생성, 조합수 표시) 한 가지 변형 처방을 뽑아 준다.
// 자작 텍스트만 사용(저작권 안전). react·linkbus 외 import 없음. 전부 로컬. 외부 네트워크/미디어/키 불필요.
// 저장: localStorage 'sry:tool:scene-rewrite-angles' (원장면 메모 + 잠금 + 마지막 탭/조합).
// 연계: 📎 수집함 · 📄 프로젝트에 추가 · 📚 스니펫 라이브러리 · 🔗 서술 거리 가이드 도구 열기.
import { useEffect, useRef, useState } from 'react'
import { addToStash, hasStash, addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'scene-rewrite-angles',
  name: '장면 다시쓰기 관점',
  icon: '🔄',
  group: '교정·언어',
  intro: '한 장면을 시점·시제·서술 거리·감각 초점·시작 지점을 바꿔 다시 써 보세요',
  w: 760,
  h: 640,
}

const LS_KEY = 'sry:tool:scene-rewrite-angles'

// ───────────────────────── 데이터 모델(축 = Axis, 옵션 = Angle) ─────────────────────────
interface Angle {
  id: string
  label: string          // 짧은 라벨(생성기 슬롯·칩 표시용)
  short: string          // 한 줄 요약
  def: string            // 정의/설명
  effect: string         // 이 선택이 독자에게 주는 효과
  steps: string[]        // 전환 가이드(이 관점으로 다시 쓸 때의 절차)
  checks: string[]       // 점검 항목(흔한 실수 방지)
  ex?: { before: string; after: string }  // 자작 예시(원문 → 변형)
}
interface Axis {
  id: string
  icon: string
  name: string
  blurb: string          // 이 축이 무엇을 바꾸는가
  prompt: string         // 다시쓰기 한 줄 지시(처방 카드용)
  angles: Angle[]
}

// 모든 텍스트는 자작. 예시는 동일한 가상의 한 장면("도윤이 빗속에서 닫힌 가게 문 앞에 선다")을
// 여러 관점으로 변형한 것이라, 축을 넘나들며 같은 소재를 비교 학습할 수 있다.
const AXES: Axis[] = [
  {
    id: 'pov',
    icon: '🎭',
    name: '시점(POV) 교체',
    blurb: '같은 사건을 누구의 눈으로, 얼마나 안으로 들어가 보느냐.',
    prompt: '시점을 바꿔, 다른 인물의 인식·정보 한계 안에서 다시 쓴다',
    angles: [
      {
        id: 'first',
        label: '1인칭',
        short: '‘나’가 직접 겪고 말한다',
        def: '서술자가 곧 이야기 속 인물. ‘나’의 목소리·편견·정보 한계가 곧 서술의 한계가 된다.',
        effect: '몰입과 친밀감이 크고 목소리가 또렷하다. 다만 ‘내’가 보지 못한 것은 쓸 수 없다.',
        steps: [
          '서술 인물을 정하고 모든 묘사를 그 인물이 실제로 인지할 수 있는 것으로 제한한다.',
          '제3자 묘사를 ‘나’의 감각·해석으로 바꾼다(예: ‘그녀는 화났다’ → ‘나는 그녀가 화났다고 느꼈다’).',
          '인물 고유의 어휘·말투·관심사를 문장 결에 입힌다.',
        ],
        checks: [
          '서술자가 모를 정보를 슬쩍 흘리지 않았는가(시점 누수).',
          '‘나는 ~했다’의 반복으로 단조롭지 않은가.',
          '서술자의 편향이 독자에게 ‘신뢰할 수 있는가’라는 질문을 남기는가.',
        ],
        ex: {
          before: '도윤은 빗속에서 닫힌 가게 문 앞에 섰다. 셔터는 내려가 있었다.',
          after: '나는 빗속에 서서 내려간 셔터를 올려다봤다. 분명 어제까지 열려 있었는데.',
        },
      },
      {
        id: 'third-limited',
        label: '3인칭 제한',
        short: '한 인물의 어깨 너머에서',
        def: '‘그/그녀’로 부르되 한 인물의 인식 안에만 머문다. 현대 소설에서 가장 흔한 시점.',
        effect: '1인칭의 밀착과 3인칭의 유연함을 절충. 그 인물이 모르는 것은 서술하지 않는다.',
        steps: [
          '초점 인물을 고정하고, 그 인물 머릿속으로만 들어간다.',
          '다른 인물의 속마음은 ‘겉으로 드러난 단서’로만 추론하게 한다.',
          '장면 중간에 다른 인물 머릿속으로 미끄러지지 않게 한다(헤드 호핑 금지).',
        ],
        checks: [
          '초점 인물이 자리에 없는 장면을 서술하고 있지 않은가.',
          '‘그는 ~라고 느꼈다’ 같은 군더더기 필터를 줄였는가.',
        ],
        ex: {
          before: '나는 빗속에 서서 내려간 셔터를 올려다봤다.',
          after: '도윤은 빗속에 서서 내려간 셔터를 올려다봤다. 어제까지 열려 있던 가게였다.',
        },
      },
      {
        id: 'third-omni',
        label: '3인칭 전지',
        short: '모든 것을 아는 서술자',
        def: '서술자가 여러 인물의 속마음·과거·미래까지 넘나든다. 고전·대하소설에서 자주 쓰인다.',
        effect: '넓은 조망과 아이러니가 가능하다. 다만 거리감이 커져 몰입이 옅어질 수 있다.',
        steps: [
          '한 인물에 갇히지 말고, 장면을 위에서 내려다보는 시야를 확보한다.',
          '여러 인물의 내면을 ‘의도적으로’ 오갈 때 전환 신호를 둔다.',
          '서술자만 아는 정보·논평을 절제해서 배치한다.',
        ],
        checks: [
          '전지 시점이 ‘아무나 다 보여주기’로 흐트러지지 않았는가.',
          '서술자 논평이 인물의 행동을 대신 설명해 버리지 않는가.',
        ],
        ex: {
          before: '도윤은 빗속에 서서 내려간 셔터를 올려다봤다.',
          after: '도윤이 셔터를 올려다보는 동안, 가게 안에서는 노인이 숨죽인 채 그 그림자를 지켜보고 있었다. 둘 다 서로를 알아보지 못했다.',
        },
      },
      {
        id: 'second',
        label: '2인칭',
        short: '‘너’/‘당신’을 끌어들인다',
        def: '서술자가 독자(또는 특정 ‘너’)를 인물 자리에 세운다. 실험적·몰입형에서 강력하다.',
        effect: '강렬한 즉시성과 불안감. 길어지면 피로하므로 짧은 구간이나 특정 효과에 쓴다.',
        steps: [
          '주어를 ‘너/당신’으로 바꾸고 행동을 현재형으로 끌어온다.',
          '독자에게 명령·예언하듯 말하는 리듬을 만든다.',
          '독자가 ‘나라면?’을 떠올리게 감각·선택지를 직접 들이민다.',
        ],
        checks: [
          '‘너’가 독자인지 특정 인물인지 시종 일관된가.',
          '장치가 내용을 잡아먹어 거북하지 않은가(분량 절제).',
        ],
        ex: {
          before: '도윤은 빗속에 서서 내려간 셔터를 올려다봤다.',
          after: '너는 빗속에 서서 내려간 셔터를 올려다본다. 어제까지 열려 있었다는 걸 너만 안다. 안으로 들어갈지, 돌아설지 너는 아직 정하지 못했다.',
        },
      },
      {
        id: 'epistolary',
        label: '서간·기록체',
        short: '편지·일지·보고서의 형식으로',
        def: '편지, 일기, 메신저, 진술서, 사건 보고서 등 ‘기록물’의 형식을 빌려 장면을 전한다.',
        effect: '화자의 의도·은폐·시간차가 드러나 신뢰성 게임이 가능하다. 형식 자체가 분위기를 만든다.',
        steps: [
          '어떤 기록물인지 정한다(날짜·수신자·문체가 따라온다).',
          '사건을 ‘그 기록물이 담을 법한 범위’로만 보여준다(빠진 정보가 오히려 긴장).',
          '기록자의 어조·격식·맞춤법까지 인물화한다.',
        ],
        checks: [
          '형식의 관습(머리말·날짜·서명)이 자연스러운가.',
          '기록자가 ‘왜 이걸 적는가’라는 동기가 느껴지는가.',
        ],
        ex: {
          before: '도윤은 빗속에 서서 내려간 셔터를 올려다봤다.',
          after: '6월 12일, 비. 가게에 갔지만 셔터가 내려가 있었다. 어제까지 분명 열려 있었다고 적어 둔다. 누군가 나보다 먼저 다녀간 모양이다.',
        },
      },
    ],
  },
  {
    id: 'tense',
    icon: '⏳',
    name: '시제 변경',
    blurb: '사건을 언제의 일로 들려주느냐 — 흐름의 속도와 운명감이 달라진다.',
    prompt: '시제를 바꿔, 사건과 서술 사이의 시간 거리를 다시 조율한다',
    angles: [
      {
        id: 'past',
        label: '과거형',
        short: '이미 끝난 일을 회고하듯',
        def: '한국어·영어 소설의 기본값. 사건이 ‘지나간 일’로 정돈되어 들린다.',
        effect: '안정감과 신뢰감. 서술자가 결말을 알고 들려준다는 회고의 음영이 깔린다.',
        steps: [
          '서술 동사를 모두 과거형으로 통일한다.',
          '회상·대과거가 필요한 곳은 ‘~했었다/~한 뒤였다’로 층위를 둔다.',
          '결말을 아는 서술자의 거리감을 살릴지(논평) 숨길지 정한다.',
        ],
        checks: [
          '현재형이 섞여 시제가 흔들리지 않는가.',
          '대과거 남발로 문장이 늘어지지 않는가.',
        ],
        ex: {
          before: '도윤은 빗속에 서서 내려간 셔터를 올려다본다.',
          after: '도윤은 빗속에 서서 내려간 셔터를 올려다봤다. 그게 그 가게를 본 마지막이었다.',
        },
      },
      {
        id: 'present',
        label: '현재형',
        short: '지금 눈앞에서 벌어지듯',
        def: '사건이 서술과 동시에 진행된다. 영화의 ‘실시간’ 같은 감각.',
        effect: '즉시성·긴박감이 강하고 결말을 모르는 불확실성이 커진다. 장편 전체로 끌면 피로할 수 있다.',
        steps: [
          '서술 동사를 현재형으로 바꾼다(‘~한다/~하고 있다’).',
          '과거 회상은 현재 속 짧은 삽입으로만 처리한다.',
          '문장을 짧게 끊어 ‘지금성’을 강조한다.',
        ],
        checks: [
          '습관적 과거형이 무심코 끼어들지 않는가.',
          '긴박감이 필요 없는 대목까지 숨 가쁘지 않은가.',
        ],
        ex: {
          before: '도윤은 빗속에 서서 내려간 셔터를 올려다봤다.',
          after: '도윤이 빗속에 선다. 셔터는 내려가 있다. 빗물이 목덜미로 흘러든다. 어제까지 열려 있던 가게다.',
        },
      },
      {
        id: 'future',
        label: '미래·예언형',
        short: '아직 오지 않은 일을 말하듯',
        def: '‘~할 것이다/~하게 된다’로 사건을 예고·예언한다. 전체보다 부분 강조에 효과적.',
        effect: '운명감·불가피함. 독자에게 ‘어떻게 그렇게 되는가’라는 호기심을 심는다.',
        steps: [
          '핵심 사건을 미래형으로 미리 던진다.',
          '예고와 실제 전개 사이에 긴장 간극을 둔다.',
          '짧게 쓴다(미래형 장면 전체는 거의 없다).',
        ],
        checks: [
          '예언이 스포일러가 아니라 기대를 만드는가.',
          '미래형이 모호한 추측으로 흐려지지 않는가.',
        ],
        ex: {
          before: '도윤은 빗속에 서서 내려간 셔터를 올려다봤다.',
          after: '도윤은 곧 알게 될 것이다. 내려간 저 셔터가 무엇을 가두고 있었는지. 지금은 그저 빗속에 서서 올려다볼 뿐이지만.',
        },
      },
      {
        id: 'historical-present',
        label: '역사적 현재(혼합)',
        short: '과거 흐름 속 절정만 현재형으로',
        def: '기본은 과거형이되, 긴장의 정점만 현재형으로 끌어올리는 부분 전환 기법.',
        effect: '평소엔 안정, 결정적 순간엔 즉시성. 강약 대비로 절정이 도드라진다.',
        steps: [
          '장면 대부분을 과거형으로 둔다.',
          '가장 긴박한 한두 문장만 현재형으로 바꿔 시간을 ‘정지’시킨다.',
          '곧바로 과거형으로 복귀해 전환을 자연스럽게 닫는다.',
        ],
        checks: [
          '전환 지점이 의도적이며 한 장면에 한두 번뿐인가.',
          '독자가 시제 오류로 오해하지 않을 만큼 또렷한가.',
        ],
        ex: {
          before: '도윤은 빗속에 서서 내려간 셔터를 올려다봤다.',
          after: '도윤은 빗속에 서 있었다. 그가 셔터에 손을 댄다. 차갑다. 그리고 그것이 안에서부터 천천히 흔들리기 시작했다.',
        },
      },
    ],
  },
  {
    id: 'distance',
    icon: '🔬',
    name: '서술 거리',
    blurb: '카메라가 인물 마음에서 얼마나 떨어져 있느냐(심리적 줌).',
    prompt: '서술 거리를 바꿔, 인물 내면과 독자 사이의 줌 배율을 다시 맞춘다',
    angles: [
      {
        id: 'far',
        label: '먼 거리(파노라마)',
        short: '높은 데서 내려다보듯',
        def: '인물을 풍경의 일부로 멀리서 본다. 내면 접근 없이 외형·배치·맥락 위주.',
        effect: '조망과 객관성, 시작·전환·요약에 좋다. 오래 끌면 차갑게 느껴진다.',
        steps: [
          '내면 묘사를 걷어내고 보이는 것만 적는다.',
          '인물을 공간·시간 속 한 점으로 위치시킨다.',
          '광각 렌즈처럼 전체 → 부분으로 좁혀 들어간다.',
        ],
        checks: ['감정 단어 없이도 분위기가 서는가.', '독자가 ‘누구를 따라가는가’를 곧 알 수 있는가.'],
        ex: {
          before: '도윤은 셔터에 손을 댔다. 차가웠다. 두려웠다.',
          after: '비 내리는 골목 끝, 한 사람이 닫힌 가게 앞에 서 있었다. 셔터는 내려가 있고, 그 위로 빗줄기가 비스듬히 그어졌다.',
        },
      },
      {
        id: 'mid',
        label: '중간 거리',
        short: '인물 곁에 서서',
        def: '인물의 행동·표정·말과 가벼운 내면을 함께 본다. 가장 두루 쓰이는 기본 거리.',
        effect: '관찰과 공감의 균형. 장면을 끌고 가는 기본 모드로 안정적이다.',
        steps: [
          '행동·감각을 보여주되 한두 줄의 내면을 곁들인다.',
          '필터(‘~라고 생각했다’)는 꼭 필요할 때만 남긴다.',
          '대사와 동작 사이에 작은 심리 단서를 끼운다.',
        ],
        checks: ['외면과 내면의 비율이 한쪽으로 쏠리지 않았는가.', '필터 동사가 과하지 않은가.'],
        ex: {
          before: '비 내리는 골목 끝, 한 사람이 닫힌 가게 앞에 서 있었다.',
          after: '도윤은 셔터에 손을 댔다. 손끝이 시렸다. 어제까지 열려 있던 가게였는데, 하고 그는 생각했다.',
        },
      },
      {
        id: 'close',
        label: '근접(밀착)',
        short: '인물 머릿속으로 들어가',
        def: '자유간접화법 등으로 서술과 인물 의식이 거의 포개진다. 필터가 사라진다.',
        effect: '강한 몰입과 즉시성. 인물의 어휘·논리·왜곡이 곧 문장이 된다.',
        steps: [
          '‘~라고 생각했다’ 같은 필터를 지우고 생각을 그대로 서술에 녹인다.',
          '문장 결을 인물의 말투·관심사에 맞춘다.',
          '감각을 인물이 느끼는 순서·강도대로 배치한다.',
        ],
        checks: [
          '필터 동사를 충분히 걷어냈는가.',
          '서술 어휘가 인물의 것과 어긋나지 않는가.',
        ],
        ex: {
          before: '도윤은 셔터에 손을 댔다. 어제까지 열려 있던 가게였는데, 하고 그는 생각했다.',
          after: '셔터가 차다. 어제까지 열려 있었잖아. 그새 무슨 일이 난 거야. 도윤은 손바닥을 떼지 못한다.',
        },
      },
      {
        id: 'interior',
        label: '의식의 흐름',
        short: '걸러지지 않은 생각의 급류',
        def: '논리·문법보다 연상·감각·기억이 흘러가는 대로 옮긴다. 가장 깊은 내면 거리.',
        effect: '날것의 심리, 불안·혼란의 질감. 다만 가독성을 위해 짧게 쓰는 게 안전하다.',
        steps: [
          '문장을 잇거나 끊는 규칙을 의식의 리듬에 맡긴다.',
          '연상으로 시점을 옮긴다(셔터 → 작년 → 그 사람).',
          '구두점·접속을 최소화해 흐름을 끊지 않는다.',
        ],
        checks: ['독자가 따라올 최소한의 단서는 남겼는가.', '기법이 길어져 피로하지 않은가.'],
        ex: {
          before: '셔터가 차다. 어제까지 열려 있었잖아.',
          after: '차다 셔터 어제는 분명 열려 있었는데 그 노인 손이 떨리던 거 그게 마지막이었나 비 비가 자꾸 목으로 들어와 돌아서야 하나 아니 두드려야',
        },
      },
    ],
  },
  {
    id: 'sense',
    icon: '👃',
    name: '감각 초점',
    blurb: '어느 감각을 앞세워 장면을 빚느냐 — 같은 사건도 질감이 달라진다.',
    prompt: '주된 감각을 바꿔, 그 감각을 통과시켜 장면을 다시 묘사한다',
    angles: [
      {
        id: 'sight',
        label: '시각 중심',
        short: '빛·색·형태·움직임',
        def: '보이는 것으로 장면을 세운다. 가장 익숙하지만 그래서 진부해지기 쉽다.',
        effect: '공간감·규모·구도를 빠르게 전한다. 다른 감각 없이 시각만 쌓으면 평면적이 된다.',
        steps: [
          '빛의 방향·세기, 색의 온도, 형태의 윤곽을 먼저 잡는다.',
          '정지된 그림이 아니라 ‘움직임’을 한 가지 넣는다.',
          '진부한 시각어(아름다운/멋진) 대신 구체적 형상으로 보여준다.',
        ],
        checks: ['시각만 과적되지 않았는가.', '‘무엇이 움직이는가’가 있는가.'],
        ex: {
          before: '도윤은 가게 앞에 섰다. 비가 왔다.',
          after: '회색 셔터 위로 가로등 불빛이 번졌다. 빗줄기가 그 빛을 비스듬히 그으며 떨어졌고, 도윤의 발치에 작은 웅덩이가 점점 번졌다.',
        },
      },
      {
        id: 'sound',
        label: '청각 중심',
        short: '소리·정적·리듬',
        def: '들리는 것과 들리지 않는 것으로 장면을 짓는다. 긴장·고요를 다루는 데 강하다.',
        effect: '보이지 않는 공간감, 임박·부재의 감각. 정적을 ‘쓰는’ 데 특히 효과적.',
        steps: [
          '지배적인 소리 하나와 그 아래 깔린 소리들을 층으로 둔다.',
          '소리의 ‘멈춤’을 의도적으로 배치한다.',
          '의성어보다 소리의 출처·성질을 그린다.',
        ],
        checks: ['정적을 ‘아무 소리도’로 뭉뚱그리지 않았는가.', '소리에 출처가 있는가.'],
        ex: {
          before: '회색 셔터 위로 가로등 불빛이 번졌다.',
          after: '빗소리만 골목을 채웠다. 처마에서 떨어지는 물방울이 셔터를 둔탁하게 두드렸다. 그러다 한순간, 그 모든 소리 아래에서 무언가 긁히는 소리가 안에서 났다.',
        },
      },
      {
        id: 'touch',
        label: '촉각·체감',
        short: '온도·질감·무게·통증',
        def: '피부와 몸이 받는 감각으로 장면을 세운다. 즉각적 신체성·불쾌·친밀에 강하다.',
        effect: '독자 몸에 직접 닿는 생생함. 추상적 감정을 신체 감각으로 번역해 준다.',
        steps: [
          '온도·습기·질감을 인물의 피부 기준으로 적는다.',
          '무게·압력·통증 등 ‘부담’을 한 가지 넣는다.',
          '감정을 신체 반응으로 치환한다(두려움 → 손끝의 마비).',
        ],
        checks: ['촉각이 ‘차가웠다’류 상투어에 머물지 않는가.', '몸의 반응이 감정을 대신 말하는가.'],
        ex: {
          before: '도윤은 두려웠다. 셔터에 손을 댔다.',
          after: '셔터의 금속은 빗물에 젖어 얼음처럼 미끌거렸다. 손바닥이 그 차가움에 들러붙는 듯했고, 목덜미를 타고 흘러든 빗물이 등줄기에서 식은땀과 뒤섞였다.',
        },
      },
      {
        id: 'smell',
        label: '후각·미각',
        short: '냄새·맛·기억의 방아쇠',
        def: '가장 적게 쓰이지만 기억·감정과 가장 강하게 결합하는 감각.',
        effect: '단번에 분위기와 과거를 불러온다. 한 줄로도 장면의 시간을 바꿀 수 있다.',
        steps: [
          '공간의 지배적 냄새 하나를 고른다(젖은 콘크리트, 쇠, 기름).',
          '그 냄새가 인물에게 불러오는 기억·연상을 짧게 잇는다.',
          '미각이 있다면 ‘입안’의 감각으로 마무리한다.',
        ],
        checks: ['냄새가 기억·감정과 연결되는가.', '한두 줄로 절제했는가.'],
        ex: {
          before: '도윤은 가게 앞에 섰다.',
          after: '젖은 콘크리트와 녹슨 셔터의 쇠 냄새가 코를 찔렀다. 그 비릿한 냄새는 어김없이 작년 그 골목을, 그날의 입안 가득하던 쇳내를 불러왔다.',
        },
      },
      {
        id: 'kinesthetic',
        label: '신체 운동·균형',
        short: '자세·움직임·공간 속 몸',
        def: '몸이 공간에서 움직이고 버티는 감각(고유수용감각). 행동 장면·불안에 강하다.',
        effect: '독자가 인물의 몸으로 ‘움직이는’ 느낌. 긴장·망설임을 동작으로 보여준다.',
        steps: [
          '인물의 자세·무게중심·발의 위치를 의식한다.',
          '망설임·결심을 멈춤·기울임·떨림 같은 미세 동작으로 옮긴다.',
          '공간과 몸의 거리(한 발, 손 뻗으면 닿을)를 구체화한다.',
        ],
        checks: ['감정을 설명 대신 동작으로 보여줬는가.', '동작이 공간 속에 정확히 놓였는가.'],
        ex: {
          before: '도윤은 망설였다. 들어갈지 말지.',
          after: '도윤은 한 발을 셔터 쪽으로 내디뎠다가, 무게중심을 다시 뒤꿈치로 옮겼다. 손은 반쯤 올라가다 멈췄다. 빗물에 신발이 미끄러질 듯해 발가락에 힘이 들어갔다.',
        },
      },
    ],
  },
  {
    id: 'start',
    icon: '🚪',
    name: '시작 지점',
    blurb: '장면을 ‘어디서부터’ 열어 보여주느냐 — 같은 사건도 인상이 뒤바뀐다.',
    prompt: '시작 지점을 바꿔, 장면을 다른 순간부터 열어 펼친다',
    angles: [
      {
        id: 'in-medias-res',
        label: '한복판부터(인 미디어스 레스)',
        short: '이미 벌어지는 중간으로',
        def: '도입·배경 설명을 건너뛰고 사건이 진행 중인 한복판으로 바로 들어간다.',
        effect: '즉시 긴장과 호기심. 독자가 상황을 ‘따라잡으며’ 읽게 만든다.',
        steps: [
          '가장 긴장이 높은 순간을 첫 문장으로 끌어온다.',
          '필요한 배경은 ‘뒤에서’ 조금씩 흘린다.',
          '독자가 모르는 것을 견디게 두되 핵심 한 가지는 곧 드러낸다.',
        ],
        checks: ['첫 문장에 ‘움직임’이나 ‘문제’가 있는가.', '배경 설명을 앞에 쌓지 않았는가.'],
        ex: {
          before: '비가 오는 날이었다. 도윤은 늘 가던 가게로 향했다. 골목을 걸어 가게 앞에 도착했다.',
          after: '셔터는 이미 내려가 있었다. 도윤은 빗속에서 그것을 두드렸다. 안에서는 아무 대답도 없었다.',
        },
      },
      {
        id: 'before',
        label: '한참 전부터(완만한 도입)',
        short: '평온에서 시작해 서서히',
        def: '사건 이전의 일상·맥락에서 출발해 점차 긴장으로 끌고 간다.',
        effect: '인물·세계에 정 들 시간을 준다. 평온과 사건의 낙차가 충격을 키운다.',
        steps: [
          '사건 전의 ‘정상’을 한 컷 보여준다.',
          '일상 속에 작은 불길한 단서를 한 가지 심는다.',
          '평온 → 균열 → 사건의 기울기를 만든다.',
        ],
        checks: ['도입이 늘어져 지루하지 않은가.', '평온 안에 불씨가 있는가.'],
        ex: {
          before: '셔터는 이미 내려가 있었다.',
          after: '도윤은 매일 같은 시간에 그 가게에 들렀다. 노인이 끓여 주는 차 한 잔. 그날도 우산을 챙겨 골목으로 들어섰다. 다만 그날은, 멀리서부터 가게 불이 꺼져 있었다.',
        },
      },
      {
        id: 'flashforward',
        label: '결말 먼저(역순 도입)',
        short: '끝을 보여주고 거슬러 오른다',
        def: '장면의 결과·종착을 먼저 보여주고, 그곳에 ‘어떻게’ 닿았는지로 되돌아간다.',
        effect: '‘왜·어떻게’의 호기심. 결과를 알아도 과정에서 긴장이 유지된다.',
        steps: [
          '결말의 한 장면을 짧게 먼저 제시한다.',
          '‘그날 아침으로 돌아가’ 식으로 명확히 시간을 되돌린다.',
          '아는 결말로 가는 과정에 새 정보·아이러니를 둔다.',
        ],
        checks: ['결말 노출이 긴장을 죽이지 않고 키우는가.', '시간 이동이 또렷한가.'],
        ex: {
          before: '도윤은 빗속에서 셔터를 두드렸다.',
          after: '나중에 경찰은 닫힌 셔터 앞 빗물에 찍힌 발자국을 발견하게 된다. 그러나 그 비 오던 저녁, 도윤은 아직 아무것도 몰랐다. 그저 늘 가던 가게로 향했을 뿐이다.',
        },
      },
      {
        id: 'detail',
        label: '작은 디테일부터',
        short: '사소한 한 점에서 출발',
        def: '큰 상황 대신 사소한 사물·감각 하나로 열고, 거기서 카메라를 넓혀 간다.',
        effect: '구체성으로 신뢰를 얻고, 작은 것이 큰 의미가 되는 확대의 쾌감을 준다.',
        steps: [
          '장면에서 가장 ‘작고 구체적인’ 것을 첫 줄로.',
          '그 디테일에서 인물·상황으로 자연스럽게 넓힌다.',
          '그 디테일이 장면의 의미와 연결되게 한다.',
        ],
        checks: ['첫 디테일이 장면 전체와 닿아 있는가.', '‘넓혀 가기’가 매끄러운가.'],
        ex: {
          before: '도윤은 빗속에서 닫힌 가게 앞에 섰다.',
          after: '셔터 손잡이에 빗방울 하나가 맺혀 떨리고 있었다. 도윤의 손이 그 방울을 향해 다가가다, 닿기 직전 멈췄다. 그제야 그는 가게가 닫혀 있다는 걸 깨달았다.',
        },
      },
    ],
  },
]

const AXIS_BY_ID: Record<string, Axis> = Object.fromEntries(AXES.map((a) => [a.id, a]))

// ───────────────────────── 유틸 ─────────────────────────
// 조합수 = 각 축 옵션 수의 곱(생성기가 뽑을 수 있는 처방의 총 가짓수).
const TOTAL_COMBOS = AXES.reduce((n, a) => n * a.angles.length, 1)

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function str(v: unknown): string { return typeof v === 'string' ? v : v == null ? '' : String(v) }

// 제어문자 차단(저장/표시 안전). 일반 줄바꿈·탭은 보존.
function clean(s: string): string {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c === 9 || c === 10 || c === 13 || c >= 32) out += s[i]
  }
  return out
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 안전 주입.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function htmlBreaks(s: string): string { return escHtml(s.trim()).replace(/\n/g, '<br>') }

type Recipe = Record<string, string>   // axisId -> angleId

// 저장 상태
interface SavedState {
  scene: string
  tab: string                 // 현재 탭(축 id 또는 'mix')
  recipe: Recipe
  locks: Record<string, boolean>
  expanded: string            // 현재 펼친 축에서 열린 angle id(축별로 하나만)
  expandedAxis: string
}

function defaultRecipe(): Recipe {
  const r: Recipe = {}
  AXES.forEach((a) => { r[a.id] = a.angles[0].id })
  return r
}

function loadState(): SavedState {
  const base: SavedState = { scene: '', tab: AXES[0].id, recipe: defaultRecipe(), locks: {}, expanded: '', expandedAxis: '' }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return base
    const p = JSON.parse(raw)
    const recipe = defaultRecipe()
    if (p && typeof p.recipe === 'object') {
      AXES.forEach((a) => {
        const v = str(p.recipe[a.id])
        if (a.angles.some((g) => g.id === v)) recipe[a.id] = v
      })
    }
    const locks: Record<string, boolean> = {}
    if (p && typeof p.locks === 'object') AXES.forEach((a) => { if (p.locks[a.id]) locks[a.id] = true })
    const tab = (p && (p.tab === 'mix' || AXIS_BY_ID[str(p.tab)])) ? str(p.tab) : base.tab
    return {
      scene: clean(str(p?.scene)).slice(0, 4000),
      tab,
      recipe,
      locks,
      expanded: str(p?.expanded),
      expandedAxis: str(p?.expandedAxis),
    }
  } catch { return base }
}

// 처방 → 텍스트(복사·프로젝트·수집함 공용)
function recipeText(recipe: Recipe, scene: string): string {
  const lines: string[] = ['[장면 다시쓰기 — 관점 처방]']
  if (scene.trim()) {
    lines.push('', '· 원장면:', scene.trim())
  }
  lines.push('', '· 적용할 관점:')
  AXES.forEach((a) => {
    const g = a.angles.find((x) => x.id === recipe[a.id]) || a.angles[0]
    lines.push(`  ${a.icon} ${a.name}: ${g.label} — ${g.short}`)
  })
  lines.push('', '· 다시쓰기 지시:')
  AXES.forEach((a) => {
    const g = a.angles.find((x) => x.id === recipe[a.id]) || a.angles[0]
    lines.push(`  · ${a.prompt} (${g.label})`)
  })
  return lines.join('\n')
}

function recipeBodyHtml(recipe: Recipe, scene: string): string {
  const parts: string[] = []
  if (scene.trim()) parts.push(`<p><b>원장면</b><br>${htmlBreaks(scene)}</p>`)
  parts.push('<p><b>적용할 관점</b></p>')
  AXES.forEach((a) => {
    const g = a.angles.find((x) => x.id === recipe[a.id]) || a.angles[0]
    parts.push(`<p>${a.icon} <b>${escHtml(a.name)}</b>: ${escHtml(g.label)} <span style="color:#888">— ${escHtml(g.short)}</span></p>`)
  })
  parts.push('<p><b>다시쓰기 지시</b></p>')
  AXES.forEach((a) => {
    const g = a.angles.find((x) => x.id === recipe[a.id]) || a.angles[0]
    parts.push(`<p>· ${escHtml(a.prompt)} <span style="color:#888">(${escHtml(g.label)})</span></p>`)
  })
  return parts.join('')
}

// 한 angle 카드 → 텍스트(복사·수집함 공용)
function angleText(axis: Axis, g: Angle): string {
  const lines: string[] = [`[${axis.name}] ${g.label} — ${g.short}`, '', `정의: ${g.def}`, `효과: ${g.effect}`, '', '전환 가이드:']
  g.steps.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`))
  lines.push('', '점검:')
  g.checks.forEach((s) => lines.push(`  · ${s}`))
  if (g.ex) {
    lines.push('', '예시(원문 → 변형):', `  before) ${g.ex.before}`, `  after)  ${g.ex.after}`)
  }
  return lines.join('\n')
}

// ───────────────────────── 컴포넌트 ─────────────────────────
export default function SceneRewriteAngles({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [scene, setScene] = useState(init.current.scene)
  const [tab, setTab] = useState(init.current.tab)
  const [recipe, setRecipe] = useState<Recipe>(init.current.recipe)
  const [locks, setLocks] = useState<Record<string, boolean>>(init.current.locks)
  const [expanded, setExpanded] = useState(init.current.expanded)
  const [expandedAxis, setExpandedAxis] = useState(init.current.expandedAxis)
  const [query, setQuery] = useState('')
  const [flash, setFlash] = useState('')

  const mounted = useRef(true)
  const flashNonce = useRef(0)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; flashNonce.current++ } }, [])

  // payload 로 들어온 장면 텍스트 미리 채우기(연계 진입). 1회만.
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current || !payload) return
    seeded.current = true
    const t = clean(str(payload.scene) || str(payload.text) || str(payload.body)).slice(0, 4000)
    if (t && mounted.current) setScene(t)
  }, [payload])

  // 자동 저장 — 차단/용량초과 시 무시(언마운트 후 setState 방지).
  useEffect(() => {
    const data: SavedState = { scene, tab, recipe, locks, expanded, expandedAxis }
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)) } catch { /* noop */ }
  }, [scene, tab, recipe, locks, expanded, expandedAxis])

  const showFlash = (msg: string) => {
    setFlash(msg)
    const n = ++flashNonce.current
    window.setTimeout(() => { if (mounted.current && flashNonce.current === n) setFlash('') }, 1700)
  }

  // ── 복사(클립보드 + 폴백) ──
  const copyText = (text: string, label = '복사됨') => {
    const safe = clean(text)
    const done = () => showFlash(label)
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(safe).then(done).catch(() => fallbackCopy(safe, done))
      else fallbackCopy(safe, done)
    } catch { fallbackCopy(safe, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { showFlash('복사 실패') }
  }

  // ── 생성기: 잠그지 않은 축만 무작위 재생성 ──
  const regenerate = () => {
    setRecipe((prev) => {
      const next: Recipe = { ...prev }
      AXES.forEach((a) => { if (!locks[a.id]) next[a.id] = pick(a.angles).id })
      return next
    })
    showFlash('잠그지 않은 축을 새로 뽑았어요')
  }
  const toggleLock = (axisId: string) => setLocks((p) => ({ ...p, [axisId]: !p[axisId] }))
  const setAngle = (axisId: string, angleId: string) => setRecipe((p) => ({ ...p, [axisId]: angleId }))

  // ── 펼침(축별로 한 angle만 열림) ──
  const toggleExpand = (axisId: string, angleId: string) => {
    if (expandedAxis === axisId && expanded === angleId) { setExpanded(''); setExpandedAxis('') }
    else { setExpanded(angleId); setExpandedAxis(axisId) }
  }

  // ── 연계 ──
  const stashRecipe = () => {
    if (!hasStash()) { showFlash('수집함에 연결되어 있지 않습니다'); return }
    addToStash({ kind: 'note', label: '장면 다시쓰기 처방', text: clean(recipeText(recipe, scene)) })
    showFlash('수집함에 담았어요')
  }
  const stashAngle = (axis: Axis, g: Angle) => {
    if (!hasStash()) { showFlash('수집함에 연결되어 있지 않습니다'); return }
    addToStash({ kind: 'note', label: `${axis.name}: ${g.label}`, text: clean(angleText(axis, g)) })
    showFlash('수집함에 담았어요')
  }
  const projectRecipe = () => {
    if (!hasProjectBridge()) { showFlash('프로젝트에 연결되어 있지 않습니다'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '다시쓰기',
      title: scene.trim() ? `다시쓰기 관점 — ${scene.trim().slice(0, 24)}` : '다시쓰기 관점 처방',
      bodyHtml: recipeBodyHtml(recipe, scene),
      synopsis: AXES.map((a) => (a.angles.find((g) => g.id === recipe[a.id]) || a.angles[0]).label).join(' · '),
      icon: '🔄',
    })
    showFlash(id ? '프로젝트 자료(다시쓰기 폴더)에 추가됨' : '프로젝트 추가에 실패했어요')
  }
  const libExample = (axis: Axis, g: Angle) => {
    if (!g.ex) return
    addToLibrary('snippets', {
      text: clean(`(${g.label}) ${g.ex.after}`),
      source: `장면 다시쓰기 — ${axis.name}`,
      tags: ['다시쓰기', axis.id, g.id],
    })
    showFlash('스니펫 라이브러리에 저장됨')
  }

  // ── 검색(현재 탭이 축일 때 angle 필터) ──
  const q = query.trim().toLowerCase()
  const matchAngle = (g: Angle) => {
    if (!q) return true
    const hay = [g.label, g.short, g.def, g.effect, ...g.steps, ...g.checks, g.ex?.before || '', g.ex?.after || ''].join(' ').toLowerCase()
    return hay.includes(q)
  }

  const linkedStash = hasStash()
  const linkedProject = hasProjectBridge()
  const curAxis = tab !== 'mix' ? AXIS_BY_ID[tab] : null

  // ───────── styles ─────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', background: 'var(--paper)', boxSizing: 'border-box' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const tabbar: React.CSSProperties = { display: 'flex', gap: 4, padding: '8px 12px 0', borderBottom: '1px solid var(--border)', background: 'var(--panel)', flexShrink: 0, flexWrap: 'wrap' }
  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '6px 11px', fontSize: 12.5, fontWeight: active ? 700 : 500, cursor: 'pointer',
    border: '1px solid ' + (active ? 'var(--accent)' : 'transparent'), borderBottom: 'none',
    borderTopLeftRadius: 8, borderTopRightRadius: 8,
    background: active ? 'var(--paper)' : 'transparent', color: active ? 'var(--accent)' : 'var(--muted)',
    marginBottom: -1,
  })
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14 }
  const sceneBox: React.CSSProperties = { width: '100%', boxSizing: 'border-box', minHeight: 58, resize: 'vertical', padding: '8px 10px', fontSize: 13, lineHeight: 1.55, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontFamily: 'inherit' }
  const label: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="🔄" /></span>
        <strong style={{ fontSize: 15 }}>장면 다시쓰기 관점</strong>
        <span style={{ color: 'var(--muted)', fontSize: 11.5 }}>{AXES.length}개 축 · 조합 {TOTAL_COMBOS.toLocaleString()}가지</span>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{flash}</span>}
        <button className="linkbtn" onClick={() => openToolLinked('narrative-distance')} title="서술 거리 가이드 도구 열기"><Emoji e="🔗" /> 서술 거리 가이드</button>
      </div>

      {/* 원장면 입력(모든 탭 공통) */}
      <div style={{ padding: '10px 14px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={label}><Emoji e="✍️" /> 다시 쓸 원장면 (선택 — 처방·내보내기에 함께 담깁니다)</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{scene.length}/4000</span>
          {scene && <button className="minibtn" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => setScene('')} title="지우기">✕</button>}
        </div>
        <textarea
          style={sceneBox}
          value={scene}
          onChange={(e) => setScene(clean(e.target.value).slice(0, 4000))}
          placeholder="다시 써 볼 장면을 붙여 넣으세요. (예: 도윤은 빗속에서 닫힌 가게 문 앞에 섰다…)"
        />
      </div>

      {/* 탭바: 다섯 축 + 조합 생성기 */}
      <div style={tabbar}>
        {AXES.map((a) => (
          <div key={a.id} style={tabBtn(tab === a.id)} onClick={() => { setTab(a.id); setQuery('') }} title={a.blurb}>
            <Emoji e={a.icon} /> {a.name}
          </div>
        ))}
        <div style={tabBtn(tab === 'mix')} onClick={() => { setTab('mix'); setQuery('') }} title="다섯 축을 무작위로 섞어 한 가지 처방을 뽑습니다">
          <Emoji e="🎲" /> 조합 생성기
        </div>
      </div>

      <div style={body}>
        {tab === 'mix' ? (
          <MixView
            recipe={recipe} locks={locks} scene={scene}
            onRegen={regenerate} onToggleLock={toggleLock} onSetAngle={setAngle}
            onCopy={() => copyText(recipeText(recipe, scene), '처방 복사됨')}
            onStash={stashRecipe} onProject={projectRecipe}
            linkedStash={linkedStash} linkedProject={linkedProject}
          />
        ) : curAxis ? (
          <AxisView
            axis={curAxis}
            query={query} setQuery={setQuery} matchAngle={matchAngle}
            chosen={recipe[curAxis.id]}
            expanded={expandedAxis === curAxis.id ? expanded : ''}
            onToggleExpand={(angleId) => toggleExpand(curAxis.id, angleId)}
            onChoose={(angleId) => { setAngle(curAxis.id, angleId); showFlash('조합 생성기에 반영됨') }}
            onCopyAngle={(g) => copyText(angleText(curAxis, g), '관점 카드 복사됨')}
            onStashAngle={(g) => stashAngle(curAxis, g)}
            onLibExample={(g) => libExample(curAxis, g)}
            linkedStash={linkedStash}
          />
        ) : null}
      </div>
    </div>
  )
}

// ───────────────────────── 축 보기(관점 카드 목록) ─────────────────────────
function AxisView(props: {
  axis: Axis
  query: string; setQuery: (s: string) => void; matchAngle: (g: Angle) => boolean
  chosen: string
  expanded: string
  onToggleExpand: (angleId: string) => void
  onChoose: (angleId: string) => void
  onCopyAngle: (g: Angle) => void
  onStashAngle: (g: Angle) => void
  onLibExample: (g: Angle) => void
  linkedStash: boolean
}) {
  const { axis, query, setQuery, matchAngle, chosen, expanded, onToggleExpand, onChoose, onCopyAngle, onStashAngle, onLibExample, linkedStash } = props
  const visible = axis.angles.filter(matchAngle)

  const searchInput: React.CSSProperties = { flex: 1, minWidth: 100, padding: '6px 9px', fontSize: 12.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const exBox: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.6, padding: '7px 9px', borderRadius: 7, background: 'var(--paper)', border: '1px solid var(--border)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{axis.blurb}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
        <input style={searchInput} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`${axis.name} 안에서 검색 (정의·예시·점검까지)`} />
        {query && <button className="minibtn" onClick={() => setQuery('')}>지우기</button>}
        <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{visible.length}/{axis.angles.length}</span>
      </div>

      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 30 }}>검색 결과가 없어요.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.map((g) => {
            const open = expanded === g.id
            const isChosen = chosen === g.id
            return (
              <div key={g.id} style={{ border: '1px solid ' + (isChosen ? 'var(--accent)' : 'var(--border)'), borderRadius: 11, background: 'var(--panel)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer' }} onClick={() => onToggleExpand(g.id)}>
                  <span style={{ fontSize: 13, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .12s', color: 'var(--muted)' }}>▶</span>
                  <strong style={{ fontSize: 14 }}>{g.label}</strong>
                  <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.short}</span>
                  <span style={{ flex: 1 }} />
                  {isChosen && <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>★ 선택됨</span>}
                </div>

                {open && (
                  <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.65 }}>
                      <p style={{ margin: '0 0 6px' }}><b>정의</b> · {g.def}</p>
                      <p style={{ margin: '0 0 10px', color: 'var(--muted)' }}><b style={{ color: 'var(--text)' }}>효과</b> · {g.effect}</p>

                      <div style={{ fontSize: 12, fontWeight: 700, margin: '8px 0 4px' }}><Emoji e="🔧" /> 전환 가이드</div>
                      <ol style={{ margin: '0 0 8px', paddingLeft: 20, lineHeight: 1.6 }}>
                        {g.steps.map((s, i) => <li key={i} style={{ marginBottom: 2 }}>{s}</li>)}
                      </ol>

                      <div style={{ fontSize: 12, fontWeight: 700, margin: '8px 0 4px' }}><Emoji e="✅" /> 점검</div>
                      <ul style={{ margin: '0 0 10px', paddingLeft: 20, lineHeight: 1.6 }}>
                        {g.checks.map((s, i) => <li key={i} style={{ marginBottom: 2 }}>{s}</li>)}
                      </ul>

                      {g.ex && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, margin: '0 0 5px' }}><Emoji e="📝" /> 예시 (원문 → 변형)</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={exBox}><span style={{ color: 'var(--muted)', fontSize: 11 }}>before</span><br />{g.ex.before}</div>
                            <div style={{ ...exBox, borderColor: 'var(--accent)' }}><span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 700 }}>after</span><br />{g.ex.after}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="linkbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                      <button className="minibtn" onClick={() => onChoose(g.id)} disabled={isChosen} title="이 관점을 조합 생성기 슬롯에 넣습니다">{isChosen ? '★ 선택됨' : '＋ 조합에 넣기'}</button>
                      <button className="minibtn" onClick={() => onCopyAngle(g)} title="이 관점 카드를 텍스트로 복사">복사</button>
                      <span style={{ flex: 1 }} />
                      <button className="linkbtn" onClick={() => onStashAngle(g)} disabled={!linkedStash} title={linkedStash ? '이 관점 카드를 수집함에 담기' : '수집함에 연결되어 있지 않습니다'}><Emoji e="📎" /> 수집함</button>
                      {g.ex && <button className="linkbtn" onClick={() => onLibExample(g)} title="변형 예시 문장을 스니펫 라이브러리에 저장"><Emoji e="📚" /> 예시 저장</button>}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ───────────────────────── 조합 생성기 보기 ─────────────────────────
function MixView(props: {
  recipe: Recipe
  locks: Record<string, boolean>
  scene: string
  onRegen: () => void
  onToggleLock: (axisId: string) => void
  onSetAngle: (axisId: string, angleId: string) => void
  onCopy: () => void
  onStash: () => void
  onProject: () => void
  linkedStash: boolean
  linkedProject: boolean
}) {
  const { recipe, locks, scene, onRegen, onToggleLock, onSetAngle, onCopy, onStash, onProject, linkedStash, linkedProject } = props
  const lockedCount = AXES.filter((a) => locks[a.id]).length

  const slot: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 11, background: 'var(--panel)', padding: '10px 12px' }
  const sel: React.CSSProperties = { width: '100%', boxSizing: 'border-box', marginTop: 6, padding: '6px 8px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={onRegen} title="잠그지 않은 축만 무작위로 다시 뽑습니다"><Emoji e="🎲" /> 무작위 재생성</button>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>잠금 {lockedCount}/{AXES.length} · 총 조합 {TOTAL_COMBOS.toLocaleString()}가지</span>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={onCopy} title="처방을 텍스트로 복사">복사</button>
      </div>

      <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 12 }}>
        마음에 드는 축은 <Emoji e="🔒" /> <b>잠금</b>해 두고 나머지만 다시 뽑아 보세요. 슬롯을 직접 골라도 됩니다.
        이 처방대로 위 원장면을 다섯 축에 맞춰 다시 써 보는 게 핵심입니다.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 14 }}>
        {AXES.map((a) => {
          const g = a.angles.find((x) => x.id === recipe[a.id]) || a.angles[0]
          const locked = !!locks[a.id]
          return (
            <div key={a.id} style={{ ...slot, borderColor: locked ? 'var(--accent)' : 'var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}><Emoji e={a.icon} /></span>
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                <button
                  className="minibtn"
                  style={{ padding: '2px 7px', fontSize: 11, color: locked ? 'var(--accent)' : 'var(--muted)', borderColor: locked ? 'var(--accent)' : 'var(--border)' }}
                  onClick={() => onToggleLock(a.id)}
                  title={locked ? '잠금 해제(재생성 대상에 포함)' : '잠금(재생성 시 고정)'}
                >
                  {locked ? <><Emoji e="🔒" /> 잠김</> : <><Emoji e="🔓" /> 잠금</>}
                </button>
              </div>
              <select style={sel} value={recipe[a.id]} onChange={(e) => onSetAngle(a.id, e.target.value)}>
                {a.angles.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 6 }}>{g.short}</div>
            </div>
          )
        })}
      </div>

      {/* 처방 카드(다시쓰기 지시) */}
      <div style={{ border: '1px solid var(--accent)', borderRadius: 12, background: 'var(--panel)', padding: 14, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}><Emoji e="📋" /> 이 조합으로 다시 쓰기</div>
        {scene.trim() && (
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 10, padding: '7px 9px', background: 'var(--paper)', borderRadius: 8, border: '1px solid var(--border)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            <b style={{ color: 'var(--text)' }}>원장면</b><br />{scene.trim()}
          </div>
        )}
        <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7, fontSize: 13 }}>
          {AXES.map((a) => {
            const g = a.angles.find((x) => x.id === recipe[a.id]) || a.angles[0]
            return (
              <li key={a.id} style={{ marginBottom: 4 }}>
                <b><Emoji e={a.icon} /> {a.name}</b> → <span style={{ color: 'var(--accent)' }}>{g.label}</span>
                <br /><span style={{ fontSize: 12, color: 'var(--muted)' }}>{a.prompt}</span>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="linkbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
        <button className="linkbtn" onClick={onStash} disabled={!linkedStash} title={linkedStash ? '이 처방을 수집함에 담기' : '수집함에 연결되어 있지 않습니다'}><Emoji e="📎" /> 수집함</button>
        <button className="linkbtn" onClick={onProject} disabled={!linkedProject} title={linkedProject ? '이 처방을 프로젝트 자료(다시쓰기 폴더)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
      </div>

      <div className="license-note" style={{ marginTop: 14, fontSize: 11, color: 'var(--muted)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        모든 설명·예시는 본 도구의 자작 텍스트입니다(저작권 안전). 예시는 동일한 가상의 장면을 여러 관점으로 변형한 것이라 축을 넘나들며 비교 학습할 수 있습니다.
      </div>
    </div>
  )
}
