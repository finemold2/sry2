// 한국어 말단계·존비 사전 — 해라/하게/하오/하십시오체 등 종결어미의 6단계 체계,
// 문장 유형(평서·의문·명령·청유)별 어미, 상황·관계별 사용 지침, 사극 말투(군신·반가·서민·내간),
// 반말↔존댓말 변환 예문 은행, 대사 톤 설정기를 한데 모은 로컬 대량 레퍼런스.
// 자급식: 외부 네트워크·미디어·라이브러리 없음. react + './linkbus' 만 import.
// 모든 단계 풀이·어미·예문은 직접 작성한 자작 데이터(백과 베끼기 금지). 제어문자 없음.
// localStorage(탭·펼친 항목·즐겨찾기·톤 설정) 영속, Math.random 무작위, 클립보드 복사, 언마운트 타이머 정리.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToStash, addToLibrary, addToProject, hasProjectBridge, hasStash, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = { id: 'speech-level-ref', name: '말단계·존비 사전', icon: '🎚️', group: '언어·어휘', intro: '해라/하게/하오/해요/합쇼체 등 한국어 말단계·존댓말·반말·사극 말투를 단계·상황별로 찾아 대사 톤을 정하세요', w: 680, h: 680 }

// ---------- 데이터 모델 ----------
interface Ending { type: string; form: string; example: string }   // 문장 유형별 어미·예문
interface LevelDef {
  key: string
  label: string        // 한국어 명칭
  alias: string        // 별칭/등급명
  icon: string
  formality: '격식체' | '비격식체'
  rank: number         // 1(가장 높임) ~ 6(가장 낮춤)
  summary: string      // 한 줄 요약
  who: string[]        // 누가 누구에게 쓰는가
  feel: string[]       // 말맛·인상
  cautions: string[]   // 주의·오해
  endings: Ending[]    // 평서/의문/명령/청유 어미 + 예문
  scene: string        // 어울리는 장면
}

// 6단계(격식 4 + 비격식 2) — 자작 풀이/어미/예문
const LEVELS: LevelDef[] = [
  {
    key: 'hapsosa', label: '하십시오체', alias: '합쇼체 · 아주높임(극존칭)', icon: '🎩',
    formality: '격식체', rank: 1,
    summary: '가장 정중하고 격식 있는 높임. 공적·공식 자리, 처음 만난 어른·고객·청중에게.',
    who: ['직원이 손님·고객에게', '발표자가 청중에게', '아랫사람이 지위 높은 윗사람에게', '뉴스·안내 방송의 공적 화법'],
    feel: ['딱딱하고 거리감이 있지만 흠잡을 데 없이 예의 바르다.', '감정을 절제하고 형식을 갖춘 인상.'],
    cautions: ['사적인 사이에서 계속 쓰면 차갑거나 비꼬는 느낌을 줄 수 있다.', '친밀한 가족에게는 과하게 들린다.'],
    endings: [
      { type: '평서', form: '-(스)ㅂ니다', example: '제가 모시고 가겠습니다.' },
      { type: '의문', form: '-(스)ㅂ니까', example: '무엇을 도와드릴까요 → 어떻게 오셨습니까?' },
      { type: '명령', form: '-(으)십시오', example: '이쪽으로 앉으십시오.' },
      { type: '청유', form: '-(으)십시다 / -시지요', example: '함께 가시지요.' },
    ],
    scene: '공식 행사, 면접, 법정, 격식 차린 첫 대면, 윗사람께 보고하는 장면.',
  },
  {
    key: 'hao', label: '하오체', alias: '예사높임(중간높임)', icon: '🎭',
    formality: '격식체', rank: 2,
    summary: '상대를 어느 정도 높이되 위엄·거리를 두는 옛 어조. 현대 일상에선 거의 사라졌고 사극·고전에 살아 있다.',
    who: ['지위가 비슷하거나 약간 아랫사람을 점잖게 대접할 때', '나이 든 화자가 위엄을 갖춰 말할 때', '사극에서 양반·관리끼리'],
    feel: ['점잖고 의젓하나 다소 고풍스럽고 권위적.', '현대 대사에 쓰면 일부러 옛스럽게 만든 효과.'],
    cautions: ['현대 일상 대사에 쓰면 어색하거나 농담처럼 들린다.', '시대극·판타지·노년 인물의 개성으로는 강력하다.'],
    endings: [
      { type: '평서', form: '-(으)오 / -소', example: '내 그대를 믿소.' },
      { type: '의문', form: '-(으)오 / -소', example: '어디로 가려 하오?' },
      { type: '명령', form: '-(으)오 / -구려', example: '그만 물러가오. / 어서 드시구려.' },
      { type: '청유', form: '-(으)ㅂ시다', example: '함께 길을 떠납시다.' },
    ],
    scene: '사극의 대신·장수, 점잖은 노신사, 옛 정취를 입힌 판타지 군주의 말.',
  },
  {
    key: 'hage', label: '하게체', alias: '예사낮춤(약한 낮춤)', icon: '🪑',
    formality: '격식체', rank: 3,
    summary: '나이 든 사람이 다 자란 아랫사람을 점잖게 낮춰 부르는 어조. 장인이 사위에게, 스승이 제자에게.',
    who: ['장인·장모가 사위에게', '나이 든 스승이 장성한 제자에게', '상사가 부하 직원을 정중히 낮출 때', '노인이 젊은이를 점잖게 대할 때'],
    feel: ['낮추되 함부로가 아니라 어른의 품위가 묻어난다.', '하대지만 정이 깃든, 거리 있는 다정함.'],
    cautions: ['젊은 화자가 쓰면 건방지거나 우스꽝스럽다.', '대상이 어린아이면 어색하다(해라체가 자연스럽다).'],
    endings: [
      { type: '평서', form: '-네 / -(으)ㄹ세', example: '오늘은 일찍 들어가게나. 자네가 애썼네.' },
      { type: '의문', form: '-(는)가 / -나', example: '요즘 지내기는 어떤가?' },
      { type: '명령', form: '-게', example: '이리 와서 좀 앉게.' },
      { type: '청유', form: '-세', example: '한잔 하세.' },
    ],
    scene: '사위를 맞은 장인, 노스승과 제자, 오래된 다방의 노신사들 대화.',
  },
  {
    key: 'haera', label: '해라체', alias: '아주낮춤(예사 반말의 격식형)', icon: '✏️',
    formality: '격식체', rank: 4,
    summary: '아주 낮추는 격식형. 어른이 어린이에게, 글말(서술체), 보편 진술에 두루 쓰인다.',
    who: ['어른이 아이·손아래에게', '책·기사·일기의 서술(독자 일반을 상대)', '혼잣말·속내', '명령조의 단호한 지시'],
    feel: ['단정하고 권위가 있으며 글의 기본 어조.', '구어로 아이에게 쓰면 다정하거나 단호하다.'],
    cautions: ['윗사람·낯선 어른에게는 무례하다.', '글말의 -다는 무례가 아니라 중립적 서술임을 구분.'],
    endings: [
      { type: '평서', form: '-(ㄴ/는)다 / -다', example: '비가 온다. 나는 너를 믿는다.' },
      { type: '의문', form: '-(느)냐 / -니', example: '어디 가니? 밥은 먹었느냐?' },
      { type: '명령', form: '-(아/어)라', example: '어서 자라. 손을 씻어라.' },
      { type: '청유', form: '-자', example: '같이 가자.' },
    ],
    scene: '동화의 서술, 부모가 아이에게, 단호한 지시, 비장한 다짐("반드시 이긴다").',
  },
  {
    key: 'haeyo', label: '해요체', alias: '두루높임(비격식 높임)', icon: '☕',
    formality: '비격식체', rank: 2,
    summary: '부드럽게 높이는 일상 존댓말. 어미 -요로 맺어 따뜻하고 친근하면서도 예의 바르다.',
    who: ['일상에서 윗사람·낯선 이를 편하게 높일 때', '가까운 어른·선배에게', '친절한 가게·서비스 응대', '연인·친구 사이의 부드러운 존대'],
    feel: ['정중하되 다정하고 말랑하다.', '합쇼체보다 거리가 가깝고 인간적이다.'],
    cautions: ['아주 공식적인 자리에선 가벼워 보일 수 있다(합쇼체가 안전).', '-요를 빼면 곧장 반말이 되니 상대에 주의.'],
    endings: [
      { type: '평서', form: '-아요/어요/예요', example: '저는 먼저 갈게요. 오늘 날씨가 좋아요.' },
      { type: '의문', form: '-아요/어요?', example: '같이 갈래요? 이거 맞아요?' },
      { type: '명령', form: '-아요/어요 / -(으)세요', example: '여기 앉으세요. 천천히 와요.' },
      { type: '청유', form: '-아요/어요 / -(으)ㄹ까요', example: '같이 갈까요? 잠깐 쉬어요.' },
    ],
    scene: '카페 응대, 다정한 선후배, 막 가까워진 사이, 따뜻한 일상 대화.',
  },
  {
    key: 'hae', label: '해체', alias: '두루낮춤(반말)', icon: '💬',
    formality: '비격식체', rank: 5,
    summary: '가장 흔한 반말. 친구·연인·손아래에게 쓰는 편하고 친밀한 어조. 어미 -요가 빠진 형태.',
    who: ['친한 친구 사이', '연인 사이', '윗사람이 아랫사람에게 편하게', '혼잣말·감탄'],
    feel: ['편하고 친밀하며 감정이 직접 드러난다.', '가까움의 표시이자, 상황에 따라 무례의 표시.'],
    cautions: ['처음 보는 사람·윗사람에게 쓰면 큰 무례.', '갑자기 존댓말→반말로 바꾸면 거리·감정의 변화를 강하게 드러낸다(연출 포인트).'],
    endings: [
      { type: '평서', form: '-아/어 / -지', example: '나 먼저 갈게. 오늘 진짜 좋아.' },
      { type: '의문', form: '-아/어? / -지?', example: '같이 갈래? 이거 맞지?' },
      { type: '명령', form: '-아/어', example: '여기 앉아. 천천히 와.' },
      { type: '청유', form: '-아/어 / -자', example: '같이 가. 우리 이제 그만하자.' },
    ],
    scene: '절친한 친구, 연인의 속삭임, 형제자매, 화가 나 거리를 좁히거나 무너뜨리는 순간.',
  },
]

// ---------- 상황·관계별 사용 지침(자작) ----------
interface SituationDef { key: string; label: string; icon: string; rows: { rel: string; use: string; tip: string }[] }
const SITUATIONS: SituationDef[] = [
  {
    key: 'family', label: '가족·친족', icon: '🏠', rows: [
      { rel: '자녀 → 부모', use: '해요체(또는 합쇼체)', tip: '한국에서는 부모께 반말을 쓰기도 하나, 거리를 둔 인물·예의 바른 집안일수록 해요체가 자연스럽다.' },
      { rel: '부모 → 어린 자녀', use: '해체/해라체', tip: '"밥 먹어라", "어서 자". 다정함과 단호함을 어미로 조절.' },
      { rel: '며느리/사위 → 시부모·장인', use: '합쇼체·해요체', tip: '가장 깍듯한 높임이 기본. 갈등 장면에서 어미가 흔들리면 관계 변화를 암시.' },
      { rel: '장인 → 사위', use: '하게체', tip: '"자네 왔는가?" 점잖게 낮추는 어른의 품위.' },
      { rel: '형/누나 → 동생', use: '해체', tip: '편한 반말. 다만 다투면 또박또박 존대로 비꼬기도.' },
    ],
  },
  {
    key: 'work', label: '직장·공적', icon: '🏢', rows: [
      { rel: '신입 → 상사', use: '합쇼체 기본 + 해요체 보조', tip: '보고·회의는 합쇼체, 사담은 해요체로 자연스럽게 오간다.' },
      { rel: '상사 → 부하', use: '해요체(또는 하게체)', tip: '요즘은 부하에게도 해요체로 예의를 지키는 추세. 권위형 인물은 하게체/해라체.' },
      { rel: '직원 → 고객', use: '합쇼체', tip: '"무엇을 도와드릴까요" 대신 "어떻게 오셨습니까". 가장 안전한 격식.' },
      { rel: '동료 ↔ 동료(동기)', use: '해요체→해체', tip: '친해질수록 해요체에서 반말로 이행. 그 전환 시점이 관계 서사.' },
    ],
  },
  {
    key: 'social', label: '사회·낯선 사이', icon: '🤝', rows: [
      { rel: '처음 만난 또래', use: '해요체', tip: '나이를 모를 땐 해요체가 가장 무난. 통성명 후 합의로 말을 놓는다.' },
      { rel: '낯선 어른에게', use: '합쇼체·해요체', tip: '길을 묻거나 부탁할 때. "실례합니다" + 합쇼체.' },
      { rel: '가게 손님 → 점원', use: '해요체', tip: '예의 있는 손님. 반말로 응대하면 무례·갑질의 신호로 읽힌다.' },
      { rel: '연인 사이', use: '해요체→해체', tip: '존댓말을 유지하는 연인은 거리·격식의 캐릭터, 반말 전환은 친밀의 표지.' },
    ],
  },
  {
    key: 'narration', label: '글말·서술', icon: '📜', rows: [
      { rel: '소설 서술(3인칭)', use: '해라체(-다)', tip: '"그는 문을 열었다." -다는 무례가 아니라 중립적 서술 어조.' },
      { rel: '일기·수기', use: '해라체/해체', tip: '"오늘은 비가 왔다." 혹은 "정말 힘들었어." 화자의 거리감에 따라.' },
      { rel: '편지·독자에게 말걸기', use: '해요체/합쇼체', tip: '"여러분, 안녕하세요." 독자를 직접 높이는 다정한 어조.' },
      { rel: '격언·진리 진술', use: '해라체', tip: '"시간은 흐른다." 보편 진술의 단정한 -다.' },
    ],
  },
]

// ---------- 사극·시대극 말투(자작) ----------
interface SageukDef { key: string; label: string; icon: string; note: string; lines: { who: string; line: string; gloss: string }[] }
const SAGEUK: SageukDef[] = [
  {
    key: 'king', label: '군신(임금·신하)', icon: '👑',
    note: '임금은 자신을 과인·짐, 신하는 소신·신으로 칭하고 임금을 전하·상감마마로 부른다. 명령은 -(으)라/하라, 윤허·하명의 격식.',
    lines: [
      { who: '신하 → 임금', line: '전하, 통촉하여 주시옵소서.', gloss: '깊이 헤아려 주십시오 — 극존대 -옵소서.' },
      { who: '신하 → 임금', line: '아뢰옵기 황송하오나, 아니 되옵니다.', gloss: '말씀드리기 송구하나 안 됩니다 — -옵-/-나이다 계열.' },
      { who: '임금 → 신하', line: '경의 뜻이 정녕 그러하다면, 윤허하노라.', gloss: '그대(경)의 뜻이 그렇다면 허락한다 — -노라.' },
      { who: '임금 → 신하', line: '여봐라, 당장 그자를 잡아들이라!', gloss: '하인을 부르고(여봐라) 명령(-라).' },
    ],
  },
  {
    key: 'yangban', label: '반가·양반', icon: '🪭',
    note: '양반끼리는 하오체로 위엄을 갖추고, 아랫것에게는 해라체. 자신을 이 사람·소생, 상대를 대감·나리·어르신으로.',
    lines: [
      { who: '양반 ↔ 양반', line: '대감, 그 말씀 과연 지당하시오.', gloss: '지당합니다 — 하오체로 점잖게 동의.' },
      { who: '선비 → 벗', line: '자네, 오랜만에 한잔 하세나.', gloss: '하게체로 다정히 권함.' },
      { who: '양반 → 하인', line: '게 누구 없느냐, 어서 손님을 모셔라.', gloss: '하인 호출(게 누구 없느냐) + 해라체 명령.' },
      { who: '선비 혼잣말', line: '허, 세상인심 야박하기 그지없구나.', gloss: '-구나 감탄, 옛스러운 탄식.' },
    ],
  },
  {
    key: 'commoner', label: '서민·하인', icon: '🧺',
    note: '아랫것은 윗전에게 극존대(-시옵-, 쇤네·소인), 저들끼리는 거친 반말과 사투리. 굽실대는 말투가 신분을 드러낸다.',
    lines: [
      { who: '하인 → 주인', line: '나리, 쇤네가 당장 다녀오겠사옵니다.', gloss: '소인(쇤네) + -겠사옵니다 극존대.' },
      { who: '하인 → 주인', line: '아이고, 마님. 그저 죽을죄를 지었습니다요.', gloss: '-습니다요로 굽실대는 비굴한 높임.' },
      { who: '장사치 ↔ 장사치', line: '이보게, 오늘 장사 영 글러먹었네그려.', gloss: '저들끼리 하게체·해체로 푸념.' },
      { who: '주모 → 손님', line: '어서 오시구려, 막걸리 한 사발 받으시려오?', gloss: '하오체로 손님을 점잖게 맞음.' },
    ],
  },
  {
    key: 'inner', label: '내간·여인', icon: '🏮',
    note: '안방·궁중 여인의 말. 중전·마마님께는 극존대, 시앗·아랫사람에겐 위엄. 부드러우나 격식이 칼 같다.',
    lines: [
      { who: '나인 → 중전', line: '마마, 침수 드시옵소서.', gloss: '주무십시오(침수) — -옵소서 극존대.' },
      { who: '마님 → 여종', line: '얘야, 어서 차를 들이거라.', gloss: '여종을 다정히 부르고(얘야) 해라체.' },
      { who: '부인 → 남편', line: '서방님, 이 일을 어찌하면 좋사옵니까.', gloss: '남편을 높여(서방님) -사옵니까.' },
      { who: '여인 혼잣말', line: '이 한 몸 어이 견디리오….', gloss: '-리오 옛 영탄, 한 서린 혼잣말.' },
    ],
  },
]

// ---------- 반말 ↔ 존댓말 변환 예문 은행(자작) ----------
interface ConvDef { key: string; label: string; icon: string; pairs: { ban: string; jon: string; hap?: string; note?: string }[] }
const CONVERT: ConvDef[] = [
  {
    key: 'greet', label: '인사·안부', icon: '👋', pairs: [
      { ban: '안녕? 잘 지냈어?', jon: '안녕하세요? 잘 지내셨어요?', hap: '안녕하십니까? 그동안 잘 지내셨습니까?', note: '존대는 주체 높임 -시-가 함께 붙는다.' },
      { ban: '밥 먹었어?', jon: '식사하셨어요?', hap: '진지 드셨습니까?', note: '먹다→드시다/잡수시다, 밥→진지로 어휘까지 높임.' },
      { ban: '오랜만이야.', jon: '오랜만이에요.', hap: '오랜만에 뵙습니다.', note: '보다→뵙다(겸양).' },
      { ban: '잘 가.', jon: '잘 가요. / 안녕히 가세요.', hap: '안녕히 가십시오.' },
    ],
  },
  {
    key: 'ask', label: '부탁·질문', icon: '🙏', pairs: [
      { ban: '이거 좀 도와줘.', jon: '이거 좀 도와줄래요?', hap: '이것 좀 도와주시겠습니까?', note: '명령→청유·의문으로 부드럽게.' },
      { ban: '여기 앉아.', jon: '여기 앉으세요.', hap: '이쪽에 앉으십시오.' },
      { ban: '이름이 뭐야?', jon: '이름이 어떻게 되세요?', hap: '성함이 어떻게 되십니까?', note: '이름→성함, 묻는 틀도 완곡하게.' },
      { ban: '몇 살이야?', jon: '나이가 어떻게 되세요?', hap: '연세가 어떻게 되십니까?', note: '나이→연세(어른께).' },
      { ban: '뭐라고?', jon: '뭐라고요? / 다시 말씀해 주세요.', hap: '다시 한번 말씀해 주시겠습니까?' },
    ],
  },
  {
    key: 'feel', label: '감정·반응', icon: '😊', pairs: [
      { ban: '고마워.', jon: '고마워요. / 감사해요.', hap: '감사합니다.' },
      { ban: '미안해.', jon: '미안해요. / 죄송해요.', hap: '죄송합니다.', note: '미안→죄송으로 격이 오른다.' },
      { ban: '진짜 좋아!', jon: '정말 좋아요!', hap: '정말 좋습니다.' },
      { ban: '괜찮아?', jon: '괜찮아요? / 괜찮으세요?', hap: '괜찮으십니까?' },
      { ban: '축하해!', jon: '축하해요!', hap: '축하드립니다.', note: '주다→드리다(겸양)로 -드립니다.' },
    ],
  },
  {
    key: 'tell', label: '전달·서술', icon: '🗣️', pairs: [
      { ban: '나 먼저 갈게.', jon: '저 먼저 갈게요.', hap: '제가 먼저 가 보겠습니다.', note: '나→저(겸양 1인칭).' },
      { ban: '내가 할게.', jon: '제가 할게요.', hap: '제가 하겠습니다.' },
      { ban: '그 사람이 그랬어.', jon: '그분이 그러셨어요.', hap: '그분께서 그러셨습니다.', note: '사람→분, 이/가→께서.' },
      { ban: '집에 있어.', jon: '집에 있어요. / 계세요.', hap: '댁에 계십니다.', note: '있다→계시다, 집→댁(주체가 윗사람일 때).' },
      { ban: '줄게.', jon: '드릴게요.', hap: '드리겠습니다.', note: '주다→드리다(겸양).' },
    ],
  },
]

// ---------- 톤 설정기용 어조 옵션 ----------
const TONE_OPTS = LEVELS.map((l) => ({ key: l.key, label: `${l.icon} ${l.label}`, sample: l.endings.find((e) => e.type === '평서')?.example || '' }))

const LS = 'sry:tool:speech-level-ref:'
type Tab = 'level' | 'situation' | 'sageuk' | 'convert' | 'tone'
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'level', label: '말단계', icon: '🎚️' },
  { key: 'situation', label: '상황·관계', icon: '🧭' },
  { key: 'sageuk', label: '사극 말투', icon: '👑' },
  { key: 'convert', label: '반말↔존댓말', icon: '🔁' },
  { key: 'tone', label: '대사 톤 설정', icon: '🎙️' },
]

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function SpeechLevelRef({ payload }: { payload?: Record<string, unknown> }) {
  const [tab, setTab] = useState<Tab>(() => {
    try { const r = localStorage.getItem(LS + 'tab'); if (r && TABS.some((t) => t.key === r)) return r as Tab } catch { /* noop */ }
    return 'level'
  })
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try { const r = localStorage.getItem(LS + 'open'); if (r) { const o = JSON.parse(r); if (o && typeof o === 'object') return o } } catch { /* noop */ }
    return {}
  })
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try { const r = localStorage.getItem(LS + 'favs'); if (r) { const o = JSON.parse(r); if (o && typeof o === 'object') return o } } catch { /* noop */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [random, setRandom] = useState<{ level: LevelDef; e: Ending } | null>(null)

  // 대사 톤 설정 상태
  const [tone, setTone] = useState<{ name: string; base: string; banAllowed: boolean; calls: string; quirks: string }>(() => {
    try { const r = localStorage.getItem(LS + 'tone'); if (r) { const o = JSON.parse(r); if (o && typeof o === 'object') return { name: '', base: 'haeyo', banAllowed: false, calls: '', quirks: '', ...o } } } catch { /* noop */ }
    return { name: '', base: 'haeyo', banAllowed: false, calls: '', quirks: '' }
  })

  const timers = useRef<number[]>([])
  const after = useCallback((fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); timers.current.push(id) }, [])
  useEffect(() => () => { timers.current.forEach((id) => window.clearTimeout(id)); timers.current = [] }, [])

  // 페이로드로 탭/검색어 진입(연계에서 열렸을 때)
  useEffect(() => {
    if (!payload) return
    const t = payload.tab
    if (typeof t === 'string' && TABS.some((x) => x.key === t)) setTab(t as Tab)
    const q = payload.query
    if (typeof q === 'string') setQuery(q)
  }, [payload])

  useEffect(() => { try { localStorage.setItem(LS + 'tab', tab) } catch { /* noop */ } }, [tab])
  useEffect(() => { try { localStorage.setItem(LS + 'open', JSON.stringify(open)) } catch { /* noop */ } }, [open])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* noop */ } }, [favs])
  useEffect(() => { try { localStorage.setItem(LS + 'tone', JSON.stringify(tone)) } catch { /* noop */ } }, [tone])

  const toggleOpen = (k: string) => setOpen((p) => ({ ...p, [k]: !p[k] }))
  const toggleFav = (k: string) => setFavs((p) => { const n = { ...p }; if (n[k]) delete n[k]; else n[k] = true; return n })

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(id); after(() => setCopied((c) => (c === id ? null : c)), 1400)
    }).catch(() => { /* graceful */ })
  }
  const showToast = (msg: string) => { setToast(msg); after(() => setToast((t) => (t === msg ? null : t)), 2200) }

  const q = query.trim().toLowerCase()
  const match = (...parts: (string | undefined)[]) => !q || parts.some((p) => p && p.toLowerCase().includes(q))

  // 말단계 필터
  const levels = useMemo(() => {
    let base = LEVELS
    if (onlyFav) base = base.filter((l) => favs['level::' + l.key])
    if (q) base = base.filter((l) => match(l.label, l.alias, l.summary, l.formality,
      ...l.who, ...l.feel, ...l.endings.flatMap((e) => [e.type, e.form, e.example]), l.scene))
    return base
  }, [q, onlyFav, favs])

  const totalEndings = useMemo(() => LEVELS.reduce((n, l) => n + l.endings.length, 0), [])

  // 무작위 어미 예문
  const rollRandom = useCallback(() => {
    const pool = LEVELS.flatMap((l) => l.endings.map((e) => ({ level: l, e })))
    if (!pool.length) return
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.e.example === prev.e.example) pick = pool[Math.floor(Math.random() * pool.length)]
      return pick
    })
    setTab('level')
  }, [])

  // ---------- 연계 헬퍼 ----------
  const stashLine = (label: string, text: string) => { addToStash({ kind: 'note', label, text }); showToast(`수집함에 담았습니다 — ${label}`) }
  const snippet = (text: string) => { addToLibrary('snippets', { text }); showToast('스니펫 라이브러리에 저장했습니다.') }

  const addLevelToProject = (l: LevelDef) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(l.icon + ' ' + l.label)} (${escapeHtml(l.alias)}) · ${escapeHtml(l.formality)}</b></p>`,
      `<p>${escapeHtml(l.summary)}</p>`,
      `<p><b>누가 쓰나</b></p><ul>${l.who.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>`,
      `<p><b>말맛</b></p><ul>${l.feel.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>`,
      `<p><b>어미·예문</b></p><ul>${l.endings.map((e) => `<li>${escapeHtml(`${e.type}: ${e.form} — “${e.example}”`)}</li>`).join('')}</ul>`,
      `<p><b>주의</b></p><ul>${l.cautions.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul>`,
      `<p><b>어울리는 장면</b>: ${escapeHtml(l.scene)}</p>`,
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '말투·어조', title: `말단계 — ${l.label}`, bodyHtml })
    if (id) showToast(`프로젝트 자료 〈말투·어조〉에 ‘${l.label}’ 메모를 추가했습니다.`)
  }

  const addToneToProject = () => {
    if (!hasProjectBridge()) return
    const baseLabel = TONE_OPTS.find((o) => o.key === tone.base)?.label || tone.base
    const bodyHtml = [
      `<p><b>🎙️ 대사 톤 카드${tone.name ? ` — ${escapeHtml(tone.name)}` : ''}</b></p>`,
      `<ul>`,
      `<li><b>기본 어조</b>: ${escapeHtml(baseLabel)}</li>`,
      `<li><b>반말 허용</b>: ${tone.banAllowed ? '예(친한 사이엔 반말)' : '아니오(기본 어조 유지)'}</li>`,
      tone.calls ? `<li><b>호칭</b>: ${escapeHtml(tone.calls)}</li>` : '',
      tone.quirks ? `<li><b>말버릇</b>: ${escapeHtml(tone.quirks)}</li>` : '',
      `</ul>`,
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '말투·어조', title: `대사 톤${tone.name ? ` — ${tone.name}` : ''}`, bodyHtml })
    if (id) showToast('프로젝트 자료 〈말투·어조〉에 대사 톤 카드를 추가했습니다.')
  }

  const toneText = () => {
    const baseLabel = TONE_OPTS.find((o) => o.key === tone.base)?.label || tone.base
    return [
      `🎙️ 대사 톤${tone.name ? ` — ${tone.name}` : ''}`,
      `· 기본 어조: ${baseLabel}`,
      `· 반말 허용: ${tone.banAllowed ? '예' : '아니오'}`,
      tone.calls ? `· 호칭: ${tone.calls}` : '',
      tone.quirks ? `· 말버릇: ${tone.quirks}` : '',
    ].filter(Boolean).join('\n')
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const chip: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 999, padding: '1px 8px' }
  const input: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }

  return (
    <div style={wrap}>
      {/* 탭 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {TABS.map((t) => {
          const on = tab === t.key
          return (
            <button key={t.key} className="minibtn" aria-pressed={on}
              onClick={() => setTab(t.key)}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={t.icon} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* 검색(톤 설정 탭 제외) */}
      {tab !== 'tone' && (
        <input value={query} onChange={(e) => setQuery(e.target.value)} style={input}
          placeholder="어미·예문·상황으로 검색 (예: 합니다, 하게, 통촉, 진지, 반말)" />
      )}

      {/* 동작 줄 */}
      {tab === 'level' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 어미 예문</button>
          <button className="minibtn" aria-pressed={onlyFav} onClick={() => setOnlyFav((v) => !v)}
            style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
            {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
          </button>
          <span style={{ ...hint, marginLeft: 'auto' }}>단계 {levels.length} · 어미 {totalEndings}개</span>
        </div>
      )}

      {/* 무작위 결과 */}
      {tab === 'level' && random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.level.icon} /> {random.level.label} · {random.e.type}</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{random.e.form}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.55, margin: '8px 0' }}>“{random.e.example}”</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(random.e.example, 'rnd')}>{copied === 'rnd' ? '✓ 복사됨' : <><Emoji e="📋" /> 예문 복사</>}</button>
            <button className="minibtn" onClick={() => snippet(random.e.example)}><Emoji e="✂️" /> 스니펫</button>
            {hasStash() && <button className="minibtn" onClick={() => stashLine(`${random.level.label} ${random.e.type}`, `${random.e.form} — “${random.e.example}”`)}><Emoji e="📎" /> 수집함</button>}
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--ok, var(--accent))', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5 }}>✓ {toast}</div>
      )}

      {/* 본문 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>

        {/* ===== 말단계 ===== */}
        {tab === 'level' && (levels.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 즐겨찾기한 말단계가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : levels.map((l) => {
          const ok = 'level::' + l.key
          const isOpen = open[ok] !== false ? (open[ok] || q.length > 0) : false
          const isFav = !!favs[ok]
          return (
            <div key={l.key} style={card}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', cursor: 'pointer' }} onClick={() => toggleOpen(ok)}>
                <span style={{ fontSize: 17 }}><Emoji e={l.icon} /></span>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{l.label}</span>
                <span style={chip}>{l.formality}</span>
                <span style={{ ...chip, borderColor: 'var(--accent)' }}>높임도 {l.rank}/6</span>
                <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                  onClick={(e) => { e.stopPropagation(); toggleFav(ok) }}
                  style={{ marginLeft: 'auto', borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>{isFav ? '★' : '☆'}</button>
                <button className="minibtn" onClick={(e) => { e.stopPropagation(); toggleOpen(ok) }}>{isOpen ? '접기 ▲' : '펼치기 ▼'}</button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{l.alias}</div>
              <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 5 }}>{l.summary}</div>
              {isOpen && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Section title="누가 누구에게" items={l.who} />
                  <Section title="말맛·인상" items={l.feel} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>문장 유형별 어미 · 예문</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {l.endings.map((e, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 12.5, lineHeight: 1.5 }}>
                          <span style={{ ...chip, flexShrink: 0 }}>{e.type}</span>
                          <span style={{ flexShrink: 0, color: 'var(--muted)' }}>{e.form}</span>
                          <span style={{ flex: 1 }}>“{e.example}”</span>
                          <button className="minibtn" style={{ flexShrink: 0 }} onClick={() => copy(e.example, `${l.key}:${i}`)}>{copied === `${l.key}:${i}` ? '✓' : <Emoji e="📋" />}</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Section title="주의·오해" items={l.cautions} danger />
                  <div style={{ fontSize: 12.5, lineHeight: 1.5 }}><b style={{ color: 'var(--accent)' }}>어울리는 장면</b> · {l.scene}</div>
                  <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 2 }}>
                    <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
                    <button className="linkbtn" disabled={!hasProjectBridge()} onClick={() => addLevelToProject(l)}
                      title={hasProjectBridge() ? '이 말단계 풀이를 프로젝트 자료 〈말투·어조〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
                    {hasStash() && <button className="linkbtn" onClick={() => stashLine(l.label, `${l.label}(${l.alias}) — ${l.summary}`)}><Emoji e="📎" /> 수집함</button>}
                    <button className="linkbtn" onClick={() => { setTone((t) => ({ ...t, base: l.key })); setTab('tone'); showToast(`대사 톤 기본 어조를 ‘${l.label}’로 설정했습니다.`) }}><Emoji e="🎙️" /> 톤으로 보내기</button>
                    <button className="linkbtn" onClick={() => openToolLinked('character-voice', { suggestedLevel: l.key })}><Emoji e="🗣️" /> 인물 목소리 열기</button>
                  </div>
                </div>
              )}
            </div>
          )
        }))}

        {/* ===== 상황·관계 ===== */}
        {tab === 'situation' && SITUATIONS.map((s) => {
          const rows = q ? s.rows.filter((r) => match(r.rel, r.use, r.tip)) : s.rows
          if (q && rows.length === 0) return null
          return (
            <div key={s.key} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}><Emoji e={s.icon} /></span>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{s.label}</span>
                <span style={{ ...hint, marginLeft: 'auto' }}>{rows.length}쌍</span>
              </div>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {rows.map((r, i) => (
                  <div key={i} style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 9 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{r.rel}</span>
                      <span style={{ ...chip, borderColor: 'var(--accent)', color: 'var(--text)' }}>{r.use}</span>
                      <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => copy(`${r.rel} → ${r.use}: ${r.tip}`, `${s.key}:${i}`)}>{copied === `${s.key}:${i}` ? '✓' : <Emoji e="📋" />}</button>
                    </div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--muted)', marginTop: 3 }}>{r.tip}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* ===== 사극 말투 ===== */}
        {tab === 'sageuk' && SAGEUK.map((s) => {
          const lines = q ? s.lines.filter((l) => match(l.who, l.line, l.gloss)) : s.lines
          if (q && lines.length === 0 && !match(s.label, s.note)) return null
          return (
            <div key={s.key} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}><Emoji e={s.icon} /></span>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--muted)', marginTop: 5 }}>{s.note}</div>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {(q ? lines : s.lines).map((l, i) => (
                  <div key={i} style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <span style={chip}>{l.who}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>“{l.line}”</span>
                      <button className="minibtn" onClick={() => copy(l.line, `${s.key}:${i}`)}>{copied === `${s.key}:${i}` ? '✓' : <Emoji e="📋" />}</button>
                      {hasStash() && <button className="minibtn" onClick={() => stashLine(`${s.label} 대사`, `${l.who}: “${l.line}” (${l.gloss})`)}><Emoji e="📎" /></button>}
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--muted)', marginTop: 3 }}>↳ {l.gloss}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* ===== 반말↔존댓말 변환 ===== */}
        {tab === 'convert' && CONVERT.map((c) => {
          const pairs = q ? c.pairs.filter((p) => match(p.ban, p.jon, p.hap, p.note)) : c.pairs
          if (q && pairs.length === 0) return null
          return (
            <div key={c.key} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}><Emoji e={c.icon} /></span>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{c.label}</span>
                <span style={{ ...hint, marginLeft: 'auto' }}>{pairs.length}쌍</span>
              </div>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pairs.map((p, i) => (
                  <div key={i} style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                    <Row label="반말(해체)" icon="💬" text={p.ban} onCopy={() => copy(p.ban, `${c.key}:b:${i}`)} copied={copied === `${c.key}:b:${i}`} />
                    <Row label="존댓말(해요체)" icon="☕" text={p.jon} onCopy={() => copy(p.jon, `${c.key}:j:${i}`)} copied={copied === `${c.key}:j:${i}`} accent />
                    {p.hap && <Row label="합쇼체(극존)" icon="🎩" text={p.hap} onCopy={() => copy(p.hap!, `${c.key}:h:${i}`)} copied={copied === `${c.key}:h:${i}`} />}
                    {p.note && <div style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--muted)', marginTop: 4 }}>※ {p.note}</div>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      <button className="minibtn" onClick={() => copy([p.ban, p.jon, p.hap].filter(Boolean).join('  /  '), `${c.key}:all:${i}`)}>{copied === `${c.key}:all:${i}` ? '✓ 한 줄 복사됨' : <><Emoji e="📋" /> 한 줄로 복사</>}</button>
                      {hasStash() && <button className="minibtn" onClick={() => stashLine(`변환 — ${c.label}`, [`반말: ${p.ban}`, `존댓말: ${p.jon}`, p.hap ? `합쇼체: ${p.hap}` : ''].filter(Boolean).join('\n'))}><Emoji e="📎" /> 수집함</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* ===== 대사 톤 설정 ===== */}
        {tab === 'tone' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={hint}>인물의 기본 어조와 호칭·말버릇을 정해 일관된 대사 톤을 만들고, 프로젝트 자료에 톤 카드로 남기세요.</div>
            <div style={card}>
              <Label>인물 이름(선택)</Label>
              <input style={input} value={tone.name} onChange={(e) => setTone((t) => ({ ...t, name: e.target.value }))} placeholder="예: 김 노인, 세자 저하, 주모" />
            </div>
            <div style={card}>
              <Label>기본 어조</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {TONE_OPTS.map((o) => {
                  const on = tone.base === o.key
                  return (
                    <button key={o.key} className="minibtn" aria-pressed={on} onClick={() => setTone((t) => ({ ...t, base: o.key }))}
                      style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>{emojify(o.label)}</button>
                  )
                })}
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--muted)', marginTop: 8, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }}>
                예문 미리보기 · “{TONE_OPTS.find((o) => o.key === tone.base)?.sample}”
              </div>
            </div>
            <div style={card}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={tone.banAllowed} onChange={(e) => setTone((t) => ({ ...t, banAllowed: e.target.checked }))} />
                친한 사이엔 반말 허용(존댓말↔반말 전환을 연출 포인트로 사용)
              </label>
            </div>
            <div style={card}>
              <Label>자주 쓰는 호칭(상대를 부르는 말)</Label>
              <input style={input} value={tone.calls} onChange={(e) => setTone((t) => ({ ...t, calls: e.target.value }))} placeholder="예: 자네 / 나리 / 선배님 / 너" />
            </div>
            <div style={card}>
              <Label>말버릇·어미 특징</Label>
              <input style={input} value={tone.quirks} onChange={(e) => setTone((t) => ({ ...t, quirks: e.target.value }))} placeholder="예: 문장 끝에 ‘그려’를 붙임 / 말끝을 흐림 / ‘참으로’를 자주 씀" />
            </div>
            <div style={card}>
              <Label>완성된 톤 카드</Label>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12.5, lineHeight: 1.6, margin: '6px 0 0', fontFamily: 'inherit', color: 'var(--text)' }}>{toneText()}</pre>
              <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
                <button className="minibtn" onClick={() => copy(toneText(), 'tone')}>{copied === 'tone' ? '✓ 복사됨' : <><Emoji e="📋" /> 톤 카드 복사</>}</button>
                <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
                <button className="linkbtn" disabled={!hasProjectBridge()} onClick={addToneToProject}
                  title={hasProjectBridge() ? '대사 톤 카드를 프로젝트 자료 〈말투·어조〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
                {hasStash() && <button className="linkbtn" onClick={() => stashLine(tone.name ? `대사 톤 — ${tone.name}` : '대사 톤', toneText())}><Emoji e="📎" /> 수집함</button>}
                <button className="linkbtn" onClick={() => openToolLinked('character-voice', { tone })}><Emoji e="🗣️" /> 인물 목소리 열기</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={hint}>말단계는 인물의 신분·관계·감정을 드러내는 가장 강력한 장치입니다. 같은 말도 어미 하나로 거리가 달라집니다.</div>
    </div>
  )
}

// ---------- 작은 보조 컴포넌트 ----------
function Section({ title, items, danger }: { title: string; items: string[]; danger?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: danger ? 'var(--muted)' : 'var(--accent)', marginBottom: 4 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6 }}>
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{children}</div>
}

function Row({ label, icon, text, onCopy, copied, accent }: { label: string; icon: string; text: string; onCopy: () => void; copied: boolean; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '2px 0' }}>
      <span style={{ fontSize: 10.5, color: 'var(--muted)', flexShrink: 0, width: 92 }}><Emoji e={icon} /> {label}</span>
      <span style={{ flex: 1, fontSize: 13.5, lineHeight: 1.5, fontWeight: accent ? 600 : 400, color: accent ? 'var(--text)' : 'var(--text)' }}>“{text}”</span>
      <button className="minibtn" style={{ flexShrink: 0 }} onClick={onCopy}>{copied ? '✓' : <Emoji e="📋" />}</button>
    </div>
  )
}
