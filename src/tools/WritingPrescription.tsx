// 집필 처방전(연결 허브) — 지금 막힌 "증상"을 고르면, 증상에 맞춘 글쓰기 연습 처방을 내주고,
//   그 증상을 풀어줄 관련 도구들을 openToolLinked 로 바로 띄운다. 처방 복용(연습 수행) 기록을 남긴다.
// 자급식: react 외엔 './linkbus' 만 import. 외부 네트워크·라이브러리 없음.
//   타이머는 setInterval(언마운트 정리), 영속은 localStorage('sry:tool:writing-prescription').
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  openToolLinked,
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  Emoji, emojify,
} from './linkbus'

export const meta = { id: 'writing-prescription', name: '집필 처방전', icon: '🩺', group: '집중·생산성', intro: '지금 막힌 증상을 고르면 맞춤 연습 처방과 도구를 바로 띄워줍니다', w: 560, h: 680 }

const LS_KEY = 'sry:tool:writing-prescription'

// ---------- 처방 데이터 모델 ----------
interface Remedy { text: string; mins?: number }          // 처방(연습) 한 줄 + 권장 시간(분)
interface ToolRx { id: string; name: string; why: string } // 띄울 도구 + 이유
interface Symptom {
  key: string
  icon: string
  label: string                // 증상 이름
  blurb: string                // 증상 한 줄 설명(사용자가 고를 때 보이는)
  diagnosis: string            // "진단" — 왜 이런 일이 생기는지 한 문단
  remedies: Remedy[]           // 즉시 해볼 연습 처방(3~6개)
  tools: ToolRx[]              // 이 증상에 듣는 관련 도구들
  mantra: string               // 처방전 하단에 붙는 한 줄 격려/원칙
}

// 증상 사전 — 충분히 풍부하게(연습·도구·진단·만트라 모두 한국어).
const SYMPTOMS: Symptom[] = [
  {
    key: 'no-idea',
    icon: '💡',
    label: '아이디어가 없다',
    blurb: '쓸 거리가 떠오르지 않아 빈 화면만 본다',
    diagnosis: '아이디어는 무에서 나오지 않고 충돌에서 나옵니다. 머릿속이 비어 보이는 건 재료가 없어서가 아니라, 익숙한 조합만 떠올려 "이건 시시해"라며 곧장 버리기 때문입니다. 의도적으로 낯선 것들을 부딪혀 평가를 잠시 미루면, 쓸 만한 씨앗은 반드시 나옵니다.',
    remedies: [
      { text: '관계없어 보이는 단어 두 개를 무작위로 골라, 그 둘이 한 문장 안에서 만나는 장면을 써보세요.', mins: 5 },
      { text: '"만약 ___라면?" 질문을 10개 빠르게 적으세요. 말이 되는지는 따지지 말고 개수만 채웁니다.', mins: 5 },
      { text: '좋아하는 이야기 하나를 떠올려, 그 핵심 설정 하나만 정반대로 뒤집어 보세요.', mins: 4 },
      { text: '오늘 본 사물 3개를 적고, 각각이 "사실은 무엇을 숨기고 있었다"로 이어 써보세요.', mins: 6 },
    ],
    tools: [
      { id: 'story-dice', name: '스토리 주사위', why: '인물·장소·사물·사건·감정을 무작위로 굴려 강제로 조합을 만든다' },
      { id: 'two-word-collision', name: '두 단어 충돌', why: '관계없는 두 단어를 부딪혀 새 발상의 불꽃을 낸다' },
      { id: 'premise-generator', name: '전제 생성기', why: '"만약 ~라면" 식 이야기 전제를 즉석에서 뽑아준다' },
      { id: 'imagination-gallery', name: '상상력 갤러리', why: '이미지 한 장에서 장면·인물·이야기를 끌어낸다' },
      { id: 'random-wiki-spark', name: '랜덤 위키 불씨', why: '예상 못 한 지식 한 토막이 발상의 도화선이 된다' },
    ],
    mantra: '나쁜 아이디어 10개가 좋은 아이디어 1개를 데려옵니다. 우선 양을 채우세요.',
  },
  {
    key: 'scene-stuck',
    icon: '🎬',
    label: '장면이 안 풀린다',
    blurb: '이 장면을 어떻게 써야 할지 막혔다',
    diagnosis: '장면이 안 풀릴 땐 대개 "누가 무엇을 원하는데 무엇이 막고 있는지"가 흐릿한 경우입니다. 멋진 문장을 짜내려 하기 전에, 이 장면의 욕구·장애물·판돈부터 한 줄로 못 박으면 글은 다시 굴러갑니다. 장면은 작은 시도-실패의 단위로 쪼갤 때 살아납니다.',
    remedies: [
      { text: '이 장면을 한 줄로: "[인물]은 [목표]를 원하지만 [장애물] 때문에 못 한다." 빈칸을 채우세요.', mins: 4 },
      { text: '장면 끝에서 상황이 더 나빠지게(또는 돌이킬 수 없게) 만들 사건 하나를 정하세요.', mins: 3 },
      { text: '인물이 이 장면에서 "절대 말하지 않을 한마디"를 적고, 그 침묵을 행동으로 드러내 보세요.', mins: 5 },
      { text: '시점 인물을 바꿔, 같은 장면을 다른 사람의 눈으로 세 문장만 써보세요.', mins: 5 },
    ],
    tools: [
      { id: 'scene-forge', name: '장면 단조', why: '장면의 목표·갈등·전환을 구조적으로 짜준다' },
      { id: 'try-fail-cycle', name: '시도-실패 사이클', why: '장면을 시도와 좌절의 단위로 분해해 추진력을 만든다' },
      { id: 'scene-sequel', name: '장면-시퀄', why: '액션 뒤의 반응(시퀄)으로 장면을 자연스럽게 잇는다' },
      { id: 'sensory-palette', name: '감각 팔레트', why: '오감 디테일을 더해 장면에 공기를 채운다' },
      { id: 'scene-list', name: '장면 목록', why: '장면을 전체 흐름 속에서 위치시켜 막힌 곳을 본다' },
    ],
    mantra: '장면은 예쁘게 쓰는 게 아니라 "무언가 변하게" 쓰는 것입니다.',
  },
  {
    key: 'flat-character',
    icon: '🧍',
    label: '인물이 밋밋하다',
    blurb: '캐릭터가 살아 움직이지 않고 종이처럼 느껴진다',
    diagnosis: '밋밋한 인물은 욕망이 약하거나 모순이 없는 인물입니다. 사람을 입체로 만드는 것은 장점 목록이 아니라, 겉으로 원하는 것과 속으로 필요한 것의 어긋남, 그리고 말과 행동의 모순입니다. 인물에게 비밀 하나와 약점 하나를 주면 즉시 숨을 쉬기 시작합니다.',
    remedies: [
      { text: '인물이 겉으로 원하는 것 1개, 속으로 진짜 필요한 것 1개를 적고 둘을 충돌시키세요.', mins: 5 },
      { text: '이 인물의 모순을 한 문장으로: "그는 ___하면서도 ___한다."', mins: 3 },
      { text: '인물에게 아무에게도 말 못 한 비밀 하나를 주고, 그게 드러나는 작은 단서를 심어보세요.', mins: 5 },
      { text: '인물의 말버릇·금기어를 정해, 대사 세 줄을 그 입버릇대로만 써보세요.', mins: 5 },
    ],
    tools: [
      { id: 'character-contradiction', name: '인물 모순', why: '인물 안의 모순을 설계해 입체감을 만든다' },
      { id: 'inner-arc', name: '내적 아크', why: '겉 목표와 속 욕구의 어긋남(변화 곡선)을 그린다' },
      { id: 'character-interview', name: '인물 인터뷰', why: '질문 공세로 인물의 속내를 끌어낸다' },
      { id: 'character-voice-board', name: '인물 목소리', why: '인물마다 다른 말투·어휘를 잡아준다' },
      { id: 'proust-sheet', name: '프루스트 설문', why: '깊은 질문으로 인물의 내면을 발굴한다' },
    ],
    mantra: '완벽한 인물은 지루합니다. 흠과 비밀이 인물을 사람으로 만듭니다.',
  },
  {
    key: 'sentence-stuck',
    icon: '✒️',
    label: '문장이 막힌다',
    blurb: '머릿속 생각이 문장으로 떨어지지 않는다',
    diagnosis: '문장이 막히는 가장 큰 원인은 "잘 쓰려는 마음"입니다. 첫 문장에서 완성도를 요구하면 손이 얼어붙습니다. 일부러 못 쓰겠다고 허락하고, 비문이든 메모든 일단 뱉어낸 뒤 고치면 됩니다. 초고는 모래를 퍼 담는 일이고, 조각은 그 다음입니다.',
    remedies: [
      { text: '"지금 내가 쓰려는 건…"으로 시작해, 떠오르는 내용을 문장 아닌 메모로 마구 적으세요.', mins: 5 },
      { text: '같은 한 문장을 일부러 세 가지 다른 방식으로(짧게/길게/뒤집어) 써보세요.', mins: 5 },
      { text: '형용사·부사를 다 빼고 동사와 명사만으로 한 문단을 써보세요.', mins: 5 },
      { text: '쓴 문장을 소리 내어 읽고, 숨이 막히는 자리에서 끊어 보세요.', mins: 4 },
    ],
    tools: [
      { id: 'thesaurus-panel', name: '유의어 사전', why: '딱 맞는 단어가 안 떠오를 때 대안을 펼쳐준다' },
      { id: 'synonym-variety', name: '유의어 다양성', why: '같은 단어 반복을 잡아 문장을 환기한다' },
      { id: 'sentence-length-viz', name: '문장 길이 시각화', why: '문장 리듬(장단 변화)을 눈으로 점검한다' },
      { id: 'show-dont-tell', name: '보여주기/말하기', why: '설명을 장면으로 바꾸는 법을 짚어준다' },
      { id: 'read-aloud-tts', name: '소리내어 읽기', why: '귀로 들으면 막힌 문장의 어색함이 드러난다' },
    ],
    mantra: '나쁜 초고는 고칠 수 있지만, 빈 화면은 고칠 수 없습니다.',
  },
  {
    key: 'no-conflict',
    icon: '⚔️',
    label: '갈등·긴장이 없다',
    blurb: '이야기가 밋밋하게 흘러가고 긴장감이 안 산다',
    diagnosis: '긴장은 "원하는 사람"과 "막는 힘"이 팽팽할 때 생깁니다. 모두가 사이좋고 모든 일이 술술 풀리면 독자는 멈춥니다. 인물에게서 무언가를 빼앗을 위협을 만들고, 선택마다 대가를 붙이세요. 갈등은 외부(사람·환경)와 내부(가치관) 양쪽에서 옵니다.',
    remedies: [
      { text: '주인공이 잃을까 두려워하는 것 하나를 정하고, 그것을 위협하는 사건을 넣으세요.', mins: 5 },
      { text: '인물에게 "둘 다 가질 수 없는" 선택지 두 개를 주세요(둘 다 옳거나 둘 다 나쁘게).', mins: 5 },
      { text: '장면마다 작은 판돈을 한 단계씩 키워 "더 나빠짐"의 사다리를 그리세요.', mins: 6 },
      { text: '주인공의 목표를 가장 효과적으로 방해할 적대자의 "정당한 이유"를 한 줄 적으세요.', mins: 4 },
    ],
    tools: [
      { id: 'conflict-builder', name: '갈등 빌더', why: '욕구 대 장애물 구조로 갈등을 설계한다' },
      { id: 'stakes-escalator', name: '판돈 상승기', why: '장면마다 위험을 단계적으로 키운다' },
      { id: 'conflict-web', name: '갈등 관계망', why: '인물들 사이 갈등의 그물을 시각화한다' },
      { id: 'try-fail-cycle', name: '시도-실패 사이클', why: '연속된 실패로 긴장을 누적시킨다' },
      { id: 'plot-twist-deck', name: '반전 카드', why: '예상을 뒤엎어 긴장에 충격을 더한다' },
    ],
    mantra: '독자는 인물이 고생할 때 책을 놓지 못합니다. 친절을 잠시 미루세요.',
  },
  {
    key: 'cant-focus',
    icon: '🌀',
    label: '집중이 안 된다',
    blurb: '딴짓·알림·잡생각에 자꾸 글에서 멀어진다',
    diagnosis: '집중은 의지가 아니라 환경과 구조의 문제입니다. 뇌는 한 번에 하나만 깊이 다룰 수 있는데, 우리는 끊임없이 전환합니다. 시간을 작게 잘라 "이 25분만"이라는 한계를 두고, 방해 요소를 물리적으로 치우면 몰입은 따라옵니다. 시작의 마찰만 넘기면 됩니다.',
    remedies: [
      { text: '딱 한 문장만 쓴다는 마음으로 타이머를 켜고 25분 집중을 시작하세요(끝나면 보상).', mins: 25 },
      { text: '책상 위·화면에서 글과 무관한 것을 전부 치우고, 알림을 끄세요.', mins: 3 },
      { text: '지금 머릿속 잡생각을 메모지에 다 쏟아낸 뒤, "나중에 처리" 표시하고 덮으세요.', mins: 4 },
      { text: '백색소음/빗소리를 틀고 호흡 4-7-8을 세 번 한 뒤 첫 문장으로 들어가세요.', mins: 3 },
    ],
    tools: [
      { id: 'pomodoro-timer', name: '뽀모도로 타이머', why: '25분 집중-5분 휴식 리듬으로 몰입을 만든다' },
      { id: 'focus-lock', name: '집중 잠금', why: '딴짓을 막고 글에만 머물게 한다' },
      { id: 'ambient-sound', name: '환경음', why: '잡음을 덮어줄 배경 소리를 깐다' },
      { id: 'breathing-timer', name: '호흡 타이머', why: '호흡을 가다듬어 산만함을 가라앉힌다' },
      { id: 'session-goal', name: '세션 목표', why: '이번 시간의 작은 목표를 못 박는다' },
    ],
    mantra: '몰입은 의지로 켜는 게 아니라, 시작의 마찰을 줄여 흘러드는 것입니다.',
  },
  {
    key: 'boring',
    icon: '🥱',
    label: '내 글이 지루하다',
    blurb: '쓰고 있는데 스스로도 재미가 없다',
    diagnosis: '글이 지루하면 보통 "예측 가능"하거나 "구체성이 없는" 경우입니다. 독자가 다음 문장을 미리 알면 흥미는 식습니다. 의외의 디테일, 작은 반전, 감각의 구체성을 넣어 예측을 깨면 살아납니다. 또 너무 설명만 하고 보여주지 않으면 밋밋해집니다.',
    remedies: [
      { text: '가장 지루한 단락에 예상 밖의 구체적 디테일 하나(이상한 사물·습관·소리)를 심으세요.', mins: 5 },
      { text: '설명 문장 하나를 골라 장면(행동·대사·감각)으로 바꿔 보세요.', mins: 6 },
      { text: '독자가 예상할 다음 전개를 적고, 그 반대 또는 비스듬한 방향으로 틀어 보세요.', mins: 5 },
      { text: '한 단락에 오감 중 평소 안 쓰던 감각(냄새·촉각)을 일부러 넣으세요.', mins: 4 },
    ],
    tools: [
      { id: 'plot-twist-deck', name: '반전 카드', why: '예측을 깨는 전환 아이디어를 던져준다' },
      { id: 'sensory-palette', name: '감각 팔레트', why: '구체적 감각 디테일로 생기를 불어넣는다' },
      { id: 'show-dont-tell', name: '보여주기/말하기', why: '설명을 장면으로 바꿔 몰입을 높인다' },
      { id: 'tarot-story', name: '타로 스토리', why: '카드 상징에서 의외의 전개를 끌어온다' },
      { id: 'card-draw-story', name: '카드 뽑기 이야기', why: '무작위 카드로 새 방향을 강제한다' },
    ],
    mantra: '내가 쓰며 지루하면 독자는 더 지루합니다. 한 군데만 의외로 만드세요.',
  },
  {
    key: 'fear',
    icon: '😨',
    label: '시작이 두렵다',
    blurb: '완벽하게 못 쓸까 봐 손도 못 댄다',
    diagnosis: '시작의 두려움은 대개 완벽주의와 자기검열의 가면입니다. "걸작이어야 한다"는 기준이 첫 문장을 무겁게 만들죠. 누구도 보지 않을 엉터리 버전을 일부러 쓰겠다고 허락하면 두려움이 줄어듭니다. 양으로 승부하는 워밍업이 가장 빠른 해독제입니다.',
    remedies: [
      { text: '"이건 아무도 안 본다, 일부러 못 쓰겠다"고 선언하고 5분 자유쓰기를 하세요.', mins: 5 },
      { text: '제목·구성 다 무시하고, 가장 쓰고 싶은 한 장면(또는 한 문장)부터 쓰세요.', mins: 5 },
      { text: '오늘의 목표를 우습게 작게(예: "세 문장") 잡고 그것만 끝내세요.', mins: 4 },
      { text: '쓰기 전에 "지금 두려운 것"을 메모로 적어 밖으로 꺼내 두세요.', mins: 3 },
    ],
    tools: [
      { id: 'warmup-prompt', name: '글쓰기 워밍업', why: '무작위 프롬프트로 5분 자유쓰기 워밍업을 한다' },
      { id: 'word-sprint-game', name: '단어 스프린트', why: '게임처럼 멈추지 않고 양을 쏟아내게 한다' },
      { id: 'ruthless-mode', name: '무자비 모드', why: '멈추면 글이 사라져 자기검열을 끈다' },
      { id: 'session-goal', name: '세션 목표', why: '작은 목표로 시작 문턱을 낮춘다' },
      { id: 'oblique-strategies', name: '우회 전략 카드', why: '막힘을 비스듬히 돌파할 한마디를 준다' },
    ],
    mantra: '걸작을 쓰려 하지 마세요. 오늘은 그냥 "한 줄"만 쓰면 됩니다.',
  },
  {
    key: 'middle-sag',
    icon: '📉',
    label: '중반이 늘어진다',
    blurb: '도입은 좋았는데 가운데서 이야기가 처진다',
    diagnosis: '중반 처짐은 목표가 흐려지고 판돈이 멈췄을 때 옵니다. 주인공이 더 이상 절박하게 무언가를 좇지 않으면 이야기는 제자리를 맴돕니다. 새 정보·새 적·새 시한을 넣어 방향을 다시 세우고, 서브플롯을 본플롯과 엮어 밀도를 올리세요.',
    remedies: [
      { text: '중반에 "판을 뒤집는" 새 정보나 배신을 하나 투입하세요.', mins: 5 },
      { text: '주인공의 목표가 지금도 절박한지 점검하고, 시한(데드라인)을 걸어 보세요.', mins: 5 },
      { text: '잠자던 서브플롯 하나를 본 줄거리와 충돌·연결시키세요.', mins: 6 },
      { text: '중반 한 장면의 결과로 인물이 "되돌릴 수 없는 선택"을 하게 만드세요.', mins: 5 },
    ],
    tools: [
      { id: 'plot-twist-deck', name: '반전 카드', why: '중반을 흔들 전환을 공급한다' },
      { id: 'stakes-escalator', name: '판돈 상승기', why: '멈춘 긴장을 다시 끌어올린다' },
      { id: 'scene-list', name: '장면 목록', why: '늘어진 구간을 한눈에 보고 잘라낸다' },
      { id: 'conflict-builder', name: '갈등 빌더', why: '새 갈등 축을 세워 추진력을 만든다' },
      { id: 'betrayal-gen', name: '배신 생성기', why: '관계를 뒤집을 배신 시드를 던진다' },
    ],
    mantra: '중반이 처지면 "더 나빠지게" 하세요. 정체는 죽음입니다.',
  },
  {
    key: 'overwhelmed',
    icon: '🧶',
    label: '할 일이 너무 많다',
    blurb: '쓸 것·고칠 것이 산더미라 어디부터 손댈지 모르겠다',
    diagnosis: '압도감은 머릿속에 모든 일이 한꺼번에 떠 있을 때 생깁니다. 뇌는 정리되지 않은 목록을 계속 굴리느라 정작 한 가지에 손대지 못하죠. 전부 꺼내 적어 외부에 맡기고, 그중 "딱 다음 한 가지"만 골라 작은 단위로 시작하면 길이 보입니다.',
    remedies: [
      { text: '머릿속 할 일을 전부 메모로 쏟아낸 뒤, "오늘 단 하나"만 동그라미 치세요.', mins: 5 },
      { text: '그 하나를 15분 안에 끝낼 수 있는 더 작은 조각으로 쪼개세요.', mins: 4 },
      { text: '나머지는 "오늘 안 함" 칸으로 옮겨 시야에서 치우세요.', mins: 2 },
      { text: '타이머 한 판(25분) 동안 그 작은 조각 하나에만 손대세요.', mins: 25 },
    ],
    tools: [
      { id: 'session-goal', name: '세션 목표', why: '이번 시간의 단 하나를 정한다' },
      { id: 'todo-checklist', name: '할 일 체크리스트', why: '머릿속 짐을 밖으로 꺼내 정리한다' },
      { id: 'pomodoro-timer', name: '뽀모도로 타이머', why: '한 조각씩 시간을 끊어 처리한다' },
      { id: 'kanban-writing', name: '집필 칸반', why: '할 일/진행/완료로 흐름을 본다' },
      { id: 'revision-checklist', name: '퇴고 체크리스트', why: '고칠 거리를 단계로 나눠 압도감을 줄인다' },
    ],
    mantra: '모든 걸 한 번에 할 순 없습니다. "다음 한 가지"만 하면 됩니다.',
  },
  {
    key: 'lost-motivation',
    icon: '🔋',
    label: '의욕이 안 난다',
    blurb: '왜 쓰는지 모르겠고 동기가 바닥났다',
    diagnosis: '의욕은 결과가 아니라 행동에서 따라옵니다. "동기가 생기면 쓰겠다"고 기다리면 영영 오지 않죠. 아주 작게라도 한 줄 쓰고 나면 뇌가 작은 성취감을 보상으로 줍니다. 또 "왜 이 이야기를 쓰고 싶었는가"라는 처음의 불씨를 다시 꺼내 보면 연료가 됩니다.',
    remedies: [
      { text: '이 이야기를 처음 쓰고 싶었던 이유·한 장면을 다시 떠올려 한 문단 적으세요.', mins: 5 },
      { text: '2분만 쓰겠다고 약속하고 타이머를 켜세요(끝나도 더 쓰고 싶으면 계속).', mins: 2 },
      { text: '이번 글을 끝내면 줄 자신만의 작은 보상을 정하세요.', mins: 2 },
      { text: '오늘 쓴 분량을 기록해 "했다"는 흔적을 남기세요(스트릭/달력).', mins: 2 },
    ],
    tools: [
      { id: 'streak-tracker', name: '집필 스트릭', why: '매일의 흔적을 쌓아 동력을 만든다' },
      { id: 'word-sprint-game', name: '단어 스프린트', why: '짧고 가볍게 시작해 시동을 건다' },
      { id: 'session-goal', name: '세션 목표', why: '달성 가능한 작은 목표로 성취감을 준다' },
      { id: 'oblique-strategies', name: '우회 전략 카드', why: '관점을 바꿔 다시 흥미를 깨운다' },
      { id: 'warmup-prompt', name: '글쓰기 워밍업', why: '부담 없는 자유쓰기로 손을 푼다' },
    ],
    mantra: '동기를 기다리지 마세요. 한 줄을 쓰면 동기가 따라옵니다.',
  },
  {
    key: 'cant-revise',
    icon: '🔧',
    label: '고치질 못하겠다',
    blurb: '초고는 있는데 어떻게 다듬어야 할지 막막하다',
    diagnosis: '퇴고가 막막한 건 "전부 한 번에 좋게 만들려" 하기 때문입니다. 구조·장면·문장·맞춤법을 동시에 보려면 누구라도 마비됩니다. 한 번에 한 층(layer)씩 패스를 나눠, 큰 것부터 작은 것 순으로 훑으면 길이 보입니다. 거리를 두고 소리 내어 읽는 것도 강력합니다.',
    remedies: [
      { text: '이번 패스는 "구조만" 본다고 정하고, 문장·맞춤법은 일부러 무시하세요.', mins: 8 },
      { text: '한 단락을 소리 내어 읽고, 걸리는 자리에만 표시하세요(지금은 고치지 말고).', mins: 5 },
      { text: '반복되는 단어·군더더기 표현을 찾아 한 종류만 골라 정리하세요.', mins: 6 },
      { text: '"이 장면이 없으면 이야기가 무너지는가?" 한 장면에 물어보세요.', mins: 4 },
    ],
    tools: [
      { id: 'revision-checklist', name: '퇴고 체크리스트', why: '단계별로 무엇을 볼지 안내한다' },
      { id: 'repeated-word-finder', name: '반복어 찾기', why: '무심코 반복한 단어를 잡아준다' },
      { id: 'sentence-length-viz', name: '문장 길이 시각화', why: '단조로운 리듬을 눈으로 점검한다' },
      { id: 'read-aloud-tts', name: '소리내어 읽기', why: '귀로 들으면 어색함이 또렷해진다' },
      { id: 'draft-compare', name: '초고 비교', why: '고치기 전후를 나란히 본다' },
    ],
    mantra: '한 번에 한 층만. 구조 먼저, 문장은 그 다음입니다.',
  },
]

// ---------- 기록 모델 ----------
interface DoseEntry {
  id: string
  symptomKey: string
  symptomLabel: string
  symptomIcon: string
  at: number
  severity: number          // 1~5 (처방 시작 시 막힌 정도)
  doneCount: number         // 수행한 처방 개수
  totalCount: number        // 처방 총 개수
  note?: string             // 끝낸 뒤 메모
  relief?: number           // 1~5 (끝낸 뒤 나아진 정도, 선택)
}

interface Persisted {
  history: DoseEntry[]
}

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Persisted>
      return { history: Array.isArray(p.history) ? p.history : [] }
    }
  } catch { /* 미지원/차단 — 무시 */ }
  return { history: [] }
}
function savePersisted(p: Persisted) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)) } catch { /* 무시 */ }
}

function uid(): string {
  return 'rx_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m}:${ss < 10 ? '0' : ''}${ss}`
}

function fmtDate(ts: number): string {
  const d = new Date(ts)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${d.getFullYear()}.${mm}.${dd} ${hh}:${mi}`
}

type View = 'pick' | 'rx' | 'history'

export default function WritingPrescription({ payload }: { payload?: Record<string, unknown> }) {
  const [view, setView] = useState<View>('pick')
  const [history, setHistory] = useState<DoseEntry[]>(() => loadPersisted().history)

  // 현재 처방 세션 상태
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [severity, setSeverity] = useState(3)
  const [done, setDone] = useState<Record<number, boolean>>({})   // 처방 index → 수행 여부
  const [note, setNote] = useState('')
  const [relief, setRelief] = useState(0)                          // 0=미평가
  const [logged, setLogged] = useState(false)                     // 이번 세션 기록 저장 여부
  const [toast, setToast] = useState('')

  // 처방 타이머(권장 시간 카운트다운)
  const [timerIdx, setTimerIdx] = useState<number | null>(null)
  const [timerLeft, setTimerLeft] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const intervalRef = useRef<number | null>(null)
  const toastRef = useRef<number | null>(null)

  const active = useMemo(() => SYMPTOMS.find((s) => s.key === activeKey) || null, [activeKey])

  // payload 로 증상 직접 지정(다른 도구가 openToolLinked('writing-prescription', { symptom:'no-idea' }) 로 띄울 때)
  const payloadDone = useRef(false)
  useEffect(() => {
    if (payloadDone.current) return
    payloadDone.current = true
    const want = payload && (payload['symptom'] || payload['symptomKey'])
    if (typeof want === 'string') {
      const found = SYMPTOMS.find((s) => s.key === want)
      if (found) { startRx(found.key) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const showToast = useCallback((m: string) => {
    setToast(m)
    if (toastRef.current !== null) window.clearTimeout(toastRef.current)
    toastRef.current = window.setTimeout(() => setToast(''), 1800)
  }, [])

  // 처방 타이머 — running 동안 1초씩 감소, 0이면 정지+알림
  useEffect(() => {
    if (!timerRunning) return
    intervalRef.current = window.setInterval(() => {
      setTimerLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false)
          showToast('⏰ 권장 시간 종료 — 이 처방을 완료로 표시해 보세요.')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [timerRunning, showToast])

  // 언마운트 정리(타이머·토스트)
  useEffect(() => () => {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    if (toastRef.current !== null) window.clearTimeout(toastRef.current)
  }, [])

  // 새 처방 시작(증상 선택)
  function startRx(key: string) {
    setActiveKey(key)
    setSeverity(3)
    setDone({})
    setNote('')
    setRelief(0)
    setLogged(false)
    setTimerIdx(null)
    setTimerRunning(false)
    setTimerLeft(0)
    setView('rx')
  }

  function toggleDone(i: number) {
    setDone((prev) => ({ ...prev, [i]: !prev[i] }))
  }

  function startTimer(i: number, mins?: number) {
    if (!mins) return
    setTimerIdx(i)
    setTimerLeft(mins * 60)
    setTimerRunning(true)
  }
  function toggleTimer() { setTimerRunning((r) => !r) }
  function stopTimer() { setTimerRunning(false); setTimerIdx(null); setTimerLeft(0) }

  const doneCount = useMemo(() => Object.values(done).filter(Boolean).length, [done])
  const totalCount = active?.remedies.length ?? 0

  // 처방 기록 저장(복용 기록)
  function logDose() {
    if (!active) return
    const entry: DoseEntry = {
      id: uid(),
      symptomKey: active.key,
      symptomLabel: active.label,
      symptomIcon: active.icon,
      at: Date.now(),
      severity,
      doneCount,
      totalCount,
      note: note.trim() || undefined,
      relief: relief || undefined,
    }
    const next = [entry, ...history].slice(0, 200)
    setHistory(next)
    savePersisted({ history: next })
    setLogged(true)
    showToast('처방 기록을 남겼습니다.')
  }

  function deleteEntry(id: string) {
    const next = history.filter((h) => h.id !== id)
    setHistory(next)
    savePersisted({ history: next })
  }
  function clearHistory() {
    setHistory([])
    savePersisted({ history: [] })
    showToast('기록을 모두 비웠습니다.')
  }

  // 수집함에 처방 담기
  function stashRx() {
    if (!active || !hasStash()) { showToast('수집함을 사용할 수 없습니다.'); return }
    const lines = active.remedies.map((r, i) => `${i + 1}. ${r.text}${r.mins ? ` (${r.mins}분)` : ''}`).join('\n')
    addToStash({ kind: 'note', label: `집필 처방 · ${active.label}`, text: `[${active.label}] 처방\n${lines}\n\n— ${active.mantra}` })
    showToast('수집함에 담았습니다.')
  }

  // 프로젝트 자료에 처방전 추가
  function rxToProject() {
    if (!active || !hasProjectBridge()) return
    const remediesHtml = active.remedies
      .map((r) => `<li>${esc(r.text)}${r.mins ? ` <em>(${r.mins}분)</em>` : ''}</li>`)
      .join('')
    const bodyHtml =
      `<p><strong>증상:</strong> ${active.icon} ${esc(active.label)}</p>` +
      `<p><em>${esc(active.diagnosis)}</em></p>` +
      `<p><strong>처방(연습):</strong></p><ol>${remediesHtml}</ol>` +
      `<p><strong>권장 도구:</strong> ${active.tools.map((t) => esc(t.name)).join(', ')}</p>` +
      `<p>— ${esc(active.mantra)}</p>`
    const id = addToProject({
      kind: 'text', root: 'research', folder: '집필 처방전',
      title: `처방전 — ${active.label}`,
      bodyHtml,
      synopsis: active.blurb,
      icon: '🩺',
      meta: { 출처: '집필 처방전', 증상: active.label },
    })
    showToast(id ? '프로젝트 자료에 추가됨' : '프로젝트에 연결되지 않았습니다')
  }

  // 통계(요약)
  const stats = useMemo(() => {
    const total = history.length
    const counts: Record<string, number> = {}
    for (const h of history) counts[h.symptomKey] = (counts[h.symptomKey] || 0) + 1
    let topKey = ''
    let topN = 0
    for (const k of Object.keys(counts)) if (counts[k] > topN) { topN = counts[k]; topKey = k }
    const top = SYMPTOMS.find((s) => s.key === topKey) || null
    return { total, top, topN }
  }, [history])

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' }
  const tabBar: React.CSSProperties = { display: 'flex', gap: 6, padding: '10px 12px 0', borderBottom: '1px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const tab = (on: boolean): React.CSSProperties => ({
    padding: '7px 12px', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontSize: 13, fontWeight: on ? 700 : 500,
    border: '1px solid var(--border)', borderBottom: on ? '1px solid var(--paper)' : '1px solid var(--border)',
    background: on ? 'var(--paper)' : 'var(--chrome-2)', color: on ? 'var(--accent)' : 'var(--muted)', marginBottom: -1,
  })
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const card: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }

  // ---------- 렌더: 증상 선택 ----------
  const renderPick = () => (
    <div style={body}>
      <div style={{ textAlign: 'center', marginTop: 4 }}>
        <div style={{ fontSize: 30 }}><Emoji e="🩺"/></div>
        <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>지금 어디가 막혔나요?</div>
        <div style={{ ...hint, marginTop: 4 }}>증상을 고르면 맞춤 연습 처방과, 그 증상에 듣는 도구를 바로 띄워 드립니다.</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
        {SYMPTOMS.map((s) => (
          <button
            key={s.key}
            onClick={() => startRx(s.key)}
            style={{
              textAlign: 'left', cursor: 'pointer', background: 'var(--paper)', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 4,
              transition: 'border-color .15s, transform .05s',
            }}
            onMouseEnter={(e) => { (e.currentTarget.style.borderColor = 'var(--accent)') }}
            onMouseLeave={(e) => { (e.currentTarget.style.borderColor = 'var(--border)') }}
          >
            <div style={{ fontSize: 22 }}><Emoji e={s.icon}/></div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{s.label}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.45, wordBreak: 'keep-all' }}>{s.blurb}</div>
          </button>
        ))}
      </div>
      {stats.total > 0 && (
        <div style={{ ...hint, textAlign: 'center', marginTop: 4 }}>
          지금까지 처방 {stats.total}회
          {stats.top ? emojify(` · 자주 막히는 곳: ${stats.top.icon} ${stats.top.label}(${stats.topN}회)`) : ''}
        </div>
      )}
    </div>
  )

  // ---------- 렌더: 처방전 ----------
  const renderRx = () => {
    if (!active) return null
    const sevLabels = ['', '조금 막힘', '막힘', '꽤 막힘', '많이 막힘', '완전히 막힘']
    const reliefLabels = ['평가 안 함', '그대로', '조금 나아짐', '나아짐', '꽤 풀림', '확 뚫림']
    return (
      <div style={body}>
        {/* 헤더: 증상 + 진단 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 28 }}><Emoji e={active.icon}/></div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>진단</div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>{active.label}</div>
            </div>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setView('pick')}>↩ 다른 증상</button>
          </div>
          <p style={{ ...hint, marginTop: 10, marginBottom: 0, color: 'var(--text)' }}>{active.diagnosis}</p>
        </div>

        {/* 막힌 정도(처방 시작 시) */}
        <div style={card}>
          <div style={sectionTitle}>지금 막힌 정도</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setSeverity(n)}
                title={sevLabels[n]}
                style={{
                  flex: 1, cursor: 'pointer', padding: '8px 0', borderRadius: 8, fontSize: 16,
                  border: '1px solid var(--border)',
                  background: n <= severity ? 'var(--accent)' : 'var(--chrome-2)',
                  color: n <= severity ? '#fff' : 'var(--muted)', fontWeight: 700,
                }}
              >{n}</button>
            ))}
          </div>
          <div style={{ ...hint, marginTop: 6 }}>{sevLabels[severity]}</div>
        </div>

        {/* 처방(연습) 체크리스트 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={sectionTitle}><Emoji e="📋"/> 오늘의 처방</span>
            <span style={{ ...hint, marginLeft: 'auto' }}>{doneCount}/{totalCount} 완료</span>
          </div>
          <div style={{ height: 6, background: 'var(--chrome-2)', borderRadius: 4, overflow: 'hidden', margin: '8px 0 4px' }}>
            <div style={{ width: totalCount ? `${(doneCount / totalCount) * 100}%` : '0%', height: '100%', background: 'var(--ok)', transition: 'width .25s' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
            {active.remedies.map((r, i) => {
              const checked = !!done[i]
              const onTimer = timerIdx === i
              return (
                <div key={i} style={{
                  border: '1px solid var(--border)', borderRadius: 10, padding: 10,
                  background: checked ? 'color-mix(in srgb, var(--ok) 12%, var(--paper))' : 'var(--paper)',
                }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <button
                      onClick={() => toggleDone(i)}
                      aria-label={checked ? '완료 취소' : '완료 표시'}
                      style={{
                        flexShrink: 0, width: 22, height: 22, borderRadius: 6, cursor: 'pointer', marginTop: 1,
                        border: '1px solid ' + (checked ? 'var(--ok)' : 'var(--border-dark)'),
                        background: checked ? 'var(--ok)' : 'var(--paper)', color: '#fff', fontSize: 13, lineHeight: 1, fontWeight: 800,
                      }}
                    >{checked ? '✓' : ''}</button>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--text)', textDecoration: checked ? 'line-through' : 'none', opacity: checked ? 0.7 : 1, wordBreak: 'keep-all' }}>
                        {r.text}
                      </div>
                      {r.mins != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                          {onTimer ? (
                            <>
                              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: timerLeft === 0 ? 'var(--ok)' : 'var(--accent)', fontSize: 15 }}>
                                <Emoji e="⏱"/> {fmtTime(timerLeft)}
                              </span>
                              <button className="minibtn" onClick={toggleTimer}><>{timerRunning ? <Emoji e="⏸"/> : '▶'}</></button>
                              <button className="minibtn" onClick={stopTimer}>■</button>
                            </>
                          ) : (
                            <button className="minibtn" onClick={() => startTimer(i, r.mins)}><Emoji e="⏱"/> {r.mins}분 타이머</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 이 증상에 듣는 도구 — 바로 띄우기 */}
        <div style={card}>
          <div style={sectionTitle}><Emoji e="🧰"/> 이 증상에 듣는 도구</div>
          <div style={{ ...hint, marginTop: 2 }}>버튼을 누르면 해당 도구가 새 창으로 열립니다.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {active.tools.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{t.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4, wordBreak: 'keep-all' }}>{t.why}</div>
                </div>
                <button
                  className="btn-primary"
                  style={{ flexShrink: 0, fontSize: 12.5 }}
                  onClick={() => { openToolLinked(t.id); showToast(`${t.name} 열기`) }}
                >열기 ↗</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            <button
              className="btn-primary"
              onClick={() => {
                active.tools.slice(0, 2).forEach((t) => openToolLinked(t.id))
                showToast('추천 도구 2개를 띄웠습니다.')
              }}
            ><Emoji e="⚡"/> 추천 2개 한 번에 열기</button>
          </div>
        </div>

        {/* 만트라 */}
        <div style={{ ...card, background: 'color-mix(in srgb, var(--accent) 10%, var(--paper))', borderColor: 'var(--accent)' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--accent-2)', lineHeight: 1.5, wordBreak: 'keep-all' }}><Emoji e="💬"/> {active.mantra}</div>
        </div>

        {/* 복용 기록(연습 후 정리) */}
        <div style={card}>
          <div style={sectionTitle}><Emoji e="📝"/> 처방 기록</div>
          <div style={{ ...hint, marginTop: 2 }}>연습을 해본 뒤, 얼마나 풀렸는지와 메모를 남기면 기록됩니다.</div>
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>지금은 좀 풀렸나요?</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRelief((cur) => (cur === n ? 0 : n))}
                  title={reliefLabels[n]}
                  style={{
                    flex: 1, cursor: 'pointer', padding: '8px 0', borderRadius: 8, fontSize: 16,
                    border: '1px solid var(--border)',
                    background: n <= relief ? 'var(--ok)' : 'var(--chrome-2)',
                    color: n <= relief ? '#fff' : 'var(--muted)', fontWeight: 700,
                  }}
                ><Emoji e={['😣', '😕', '😐', '🙂', '😄'][n - 1]}/></button>
              ))}
            </div>
            <div style={{ ...hint, marginTop: 6 }}>{reliefLabels[relief]}</div>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="무엇이 도움이 됐는지, 어디가 여전히 막히는지 메모해 두세요(선택)."
            spellCheck={false}
            style={{
              width: '100%', boxSizing: 'border-box', marginTop: 10, minHeight: 64, resize: 'vertical',
              padding: 10, fontSize: 13, lineHeight: 1.55, color: 'var(--text)', background: 'var(--paper)',
              border: '1px solid var(--border)', borderRadius: 10, outline: 'none', fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            <button className="btn-primary" onClick={logDose}><>{logged ? '✓ 기록됨 (다시 저장)' : <><Emoji e="💾"/> 이 처방 기록하기</>}</></button>
            <button className="minibtn" onClick={stashRx} disabled={!hasStash()} title={!hasStash() ? '수집함을 사용할 수 없습니다' : '처방을 수집함에 담기'}><Emoji e="🧺"/> 수집함</button>
            <button className="minibtn" onClick={rxToProject} disabled={!hasProjectBridge()} title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '처방전을 프로젝트 자료에 추가'}><Emoji e="📄"/> 프로젝트에 추가</button>
          </div>
        </div>

        <div style={hint}>처방은 정답이 아니라 시동 장치입니다. 한 가지만 해봐도 충분합니다.</div>
      </div>
    )
  }

  // ---------- 렌더: 기록 ----------
  const renderHistory = () => (
    <div style={body}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={sectionTitle}>처방 기록</span>
        <span style={{ ...hint, marginLeft: 'auto' }}>{history.length}건</span>
        {history.length > 0 && <button className="minibtn" onClick={clearHistory}><Emoji e="🗑"/> 모두 비우기</button>}
      </div>

      {stats.total > 0 && (
        <div style={{ ...card, display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>{stats.total}</div>
            <div style={hint}>총 처방</div>
          </div>
          <div style={{ flex: 1.4, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{stats.top ? emojify(`${stats.top.icon} ${stats.top.label}`) : '-'}</div>
            <div style={hint}>가장 자주 막히는 곳{stats.top ? ` (${stats.topN}회)` : ''}</div>
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: 28 }}>
          아직 기록이 없습니다.<br />증상을 골라 처방을 받고 "기록하기"를 눌러보세요.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {history.map((h) => (
            <div key={h.id} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}><Emoji e={h.symptomIcon}/></span>
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{h.symptomLabel}</span>
                <span style={{ ...hint, marginLeft: 'auto' }}>{fmtDate(h.at)}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                <span style={chip}>막힘 {h.severity}/5</span>
                <span style={chip}>처방 {h.doneCount}/{h.totalCount} 완료</span>
                {h.relief != null && <span style={{ ...chip, borderColor: 'var(--ok)', color: 'var(--ok)' }}><Emoji e={['', '😣', '😕', '😐', '🙂', '😄'][h.relief]}/> 효과 {h.relief}/5</span>}
              </div>
              {h.note && <div style={{ ...hint, marginTop: 8, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>“{h.note}”</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="linkbtn" onClick={() => startRx(h.symptomKey)}><Emoji e="🔁"/> 같은 처방 다시</button>
                <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => deleteEntry(h.id)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const chip: React.CSSProperties = { fontSize: 11.5, padding: '3px 8px', borderRadius: 999, border: '1px solid var(--border)', color: 'var(--muted)', background: 'var(--chrome-2)' }

  return (
    <div style={wrap}>
      <div style={tabBar}>
        <span style={{ fontSize: 15, fontWeight: 800, marginRight: 6 }}><Emoji e="🩺"/> 집필 처방전</span>
        <div style={tab(view === 'pick' || view === 'rx')} onClick={() => setView(active ? 'rx' : 'pick')}>처방</div>
        <div style={tab(view === 'history')} onClick={() => setView('history')}>기록{history.length ? ` (${history.length})` : ''}</div>
      </div>

      {view === 'history' ? renderHistory() : view === 'rx' ? renderRx() : renderPick()}

      {toast && (
        <div style={{
          position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)',
          background: 'var(--text)', color: 'var(--bg)', padding: '8px 14px', borderRadius: 999,
          fontSize: 12.5, fontWeight: 600, boxShadow: '0 4px 14px rgba(0,0,0,.25)', maxWidth: '90%', textAlign: 'center', zIndex: 5,
        }}>{emojify(toast)}</div>
      )}
    </div>
  )
}
