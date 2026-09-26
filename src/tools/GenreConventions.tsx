// 장르 관습 체크리스트 — 로맨스/미스터리/스릴러/판타지/SF/호러/성장/무협/웹소설 등 장르별
//   ① 독자 기대 ② 필수 요소 ③ 흔한 함정 을 체크리스트로 점검한다. 자급식(react + linkbus 만).
//  장르 선택 → 카테고리별 항목 점검(체크), 검색 필터, 항목 클릭 복사, 사용자 항목 추가/삭제,
//  진행률 표시, '기획' 폴더로 프로젝트 문서 추가, 스니펫 저장. 모든 상태는 localStorage 자동 저장/복원.
//  localStorage 미지원/차단/손상 시에도 throw 없이 메모리만으로 동작(graceful).
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, Emoji } from './linkbus'

export const meta = { id: 'genre-conventions', name: '장르 관습 체크리스트', icon: '📐', group: '구상·정리', intro: '장르별 독자 기대·필수 요소·흔한 함정을 점검하며 관습을 충족·전복하세요', w: 660, h: 640 }

const LS_KEY = 'sry:tool:genre-conventions'

// 카테고리 3종 — 독자 기대 / 필수 요소 / 흔한 함정.
type CatKey = 'expect' | 'must' | 'pitfall'
interface Category { key: CatKey; name: string; icon: string; desc: string }
const CATEGORIES: Category[] = [
  { key: 'expect', name: '독자 기대', icon: '🎯', desc: '이 장르를 펼친 독자가 당연히 바라는 것' },
  { key: 'must', name: '필수 요소', icon: '✅', desc: '빠지면 장르로 성립하지 않는 약속(컨벤션)' },
  { key: 'pitfall', name: '흔한 함정', icon: '⚠️', desc: '초보·숙련 모두 빠지기 쉬운 실수(피하거나 의도적으로 전복)' },
]

interface Genre {
  id: string
  name: string
  icon: string
  tagline: string
  expect: string[]
  must: string[]
  pitfall: string[]
}

// 장르별 관습 데이터(로컬). 각 항목 id 는 genreId:catKey:index 로 안정적으로 파생.
const GENRES: Genre[] = [
  {
    id: 'romance',
    name: '로맨스',
    icon: '💕',
    tagline: '두 사람의 감정선과 정서적 보상이 핵심',
    expect: [
      '주인공 둘의 감정이 서서히 깊어지는 과정을 따라가고 싶다',
      '설렘·긴장(밀당)과 감정적 카타르시스를 맛보고 싶다',
      '두 사람이 서로에게 끌릴 만한 분명한 이유가 보이길 바란다',
      '관계를 가로막는 장애물(내적·외적)이 납득되길 바란다',
      '결말의 정서적 보상(HEA/HFN)을 기대한다',
    ],
    must: [
      '두 주인공(또는 관계의 두 축)이 이야기의 중심이다',
      '관계의 진전이 곧 플롯이다(만남→끌림→갈등→위기→화해)',
      '관계를 시험하는 핵심 갈등(오해·신분·과거·가치관 등)이 있다',
      '감정의 전환점("이 사람이구나" 순간, 첫 고백, 결별, 재회)이 분명하다',
      '결말은 HEA(완전한 해피엔딩) 또는 HFN(지금은 행복) — 장르 약속',
      '두 사람의 케미(대사·시선·접촉)가 장면으로 보여진다',
    ],
    pitfall: [
      '한쪽만 사랑하고 다른 쪽은 끌릴 이유가 안 보임(짝사랑 서술 과다)',
      '오해 하나로 끝까지 끌기 — 대화 한 번이면 풀릴 갈등(빈약한 장애물)',
      '"운명"으로 퉁치고 끌림의 구체적 근거를 안 보여줌',
      '제3자(연적)를 도구로만 소비하고 인격을 안 줌',
      '동의·존중 없는 집착·강압을 로맨틱하게 미화',
      '결말에서 갑작스러운 화해 — 감정 변화의 비트가 생략됨',
    ],
  },
  {
    id: 'mystery',
    name: '미스터리·추리',
    icon: '🕵️',
    tagline: '공정한 단서와 논리적 해결이 생명',
    expect: [
      '범인·진상을 함께 추리할 수 있는 공정한 단서를 원한다',
      '"그래서 그랬구나!" 하는 통쾌한 해결의 카타르시스를 기대한다',
      '탐정(주인공)의 관찰·추론 과정을 따라가는 재미를 바란다',
      '의외이되 돌아보면 필연인 범인을 원한다',
    ],
    must: [
      '풀어야 할 분명한 수수께끼(살인·실종·도난 등)가 초반에 제시된다',
      '진상에 이르는 단서가 독자에게 공정하게 노출된다(페어플레이)',
      '레드 헤링(눈속임 단서)과 진짜 단서가 섞여 있다',
      '용의자가 복수이고 각자 동기·기회·수단이 검토된다',
      '결말에서 단서들이 하나의 논리로 수렴해 해결된다',
      '범인의 동기가 인물·상황으로 납득된다',
    ],
    pitfall: [
      '진범의 단서를 독자에게 숨겼다가 결말에 갑툭튀(언페어)',
      '탐정만 아는 정보로 해결 — 독자는 추리할 기회가 없었음',
      '우연·자백으로 사건이 풀림(추론의 쾌감 증발)',
      '레드 헤링 없이 일직선 — 의외성 부족',
      '범인의 동기가 빈약하거나 결말에만 급조됨',
      '트릭이 현실적으로 불가능하거나 검증되지 않음',
    ],
  },
  {
    id: 'thriller',
    name: '스릴러·서스펜스',
    icon: '🔪',
    tagline: '긴장과 위협, 멈출 수 없는 페이스',
    expect: [
      '쉬지 않고 조여드는 긴장과 빠른 페이스를 원한다',
      '주인공이 처한 위협이 손에 잡힐 듯 절박하길 바란다',
      '"다음 장이 궁금해" — 페이지터너의 흡인력을 기대한다',
      '대치하는 적대자(빌런)의 위협감이 실감나길 바란다',
    ],
    must: [
      '명확하고 임박한 위협(시간 제한·생명·비밀)이 판돈을 건다',
      '주인공이 끊임없이 쫓기거나 몰리며 긴장이 고조된다',
      '능력 있고 위협적인 적대자가 주인공을 압박한다',
      '챕터·장면이 클리프행어·반전으로 다음을 견인한다',
      '판돈(스테이크)이 갈수록 커진다(개인→다수)',
      '주인공의 실패 위험이 현실적으로 느껴진다',
    ],
    pitfall: [
      '주인공이 무적이라 긴장이 안 생김(위험이 가짜)',
      '늘어지는 설명·회상으로 페이스가 죽음',
      '빌런이 멍청해서 위협감이 사라짐(주인공을 안 죽이는 이유 없음)',
      '데우스 엑스 마키나 — 위기를 우연·갑작스런 도움으로 해결',
      '반전을 위한 반전 — 복선 없이 충격만 노림',
      '주변 인물이 위험 앞에서 비현실적으로 둔감함',
    ],
  },
  {
    id: 'fantasy',
    name: '판타지',
    icon: '🐉',
    tagline: '일관된 세계관과 마법의 규칙·대가',
    expect: [
      '몰입할 수 있는 낯설고도 일관된 세계를 원한다',
      '경이감(센스 오브 원더)과 모험의 스케일을 기대한다',
      '마법·이능에 분명한 규칙과 대가가 있길 바란다',
      '세계의 역사·문화가 살아 있다는 느낌을 바란다',
    ],
    must: [
      '내적으로 일관된 세계관(지리·역사·세력·문화)이 있다',
      '마법/이능 체계에 규칙·한계·대가가 정의된다',
      '세계관이 인포덤프가 아니라 이야기·행동으로 드러난다',
      '판돈이 큰 갈등(세계·왕국·종족의 운명 등)이 있다',
      '낯선 용어·고유명사가 맥락으로 이해 가능하다',
      '주인공의 성장·여정이 세계와 맞물린다',
    ],
    pitfall: [
      '규칙 없는 만능 마법 — 위기를 새 능력으로 즉석 해결',
      '도입부 대량 설정 투하(인포덤프)로 진입장벽',
      '발음 불가·구별 안 되는 이름 남발',
      '중세 유럽 클리셰 복붙(엘프·드워프·"선택받은 자")만',
      '거대 세계관에 비해 인물·이야기가 빈약함',
      '편의적 예언으로 플롯을 강제 진행',
    ],
  },
  {
    id: 'scifi',
    name: 'SF',
    icon: '🚀',
    tagline: '과학적 개연성과 "만약에"의 사고실험',
    expect: [
      '과학·기술이 그럴듯한 개연성으로 설계되길 원한다',
      '"만약 …라면?"의 사고실험과 아이디어의 신선함을 기대한다',
      '기술·설정이 인간·사회에 끼치는 영향을 보고 싶다',
      '세계관의 논리적 일관성을 바란다',
    ],
    must: [
      '중심이 되는 SF 아이디어(노붐)가 분명하다',
      '기술·과학 설정이 작품 내 규칙으로 일관된다',
      '그 설정이 인물·사회·윤리에 미치는 파장을 탐구한다',
      '설명(엑스포지션)이 이야기 흐름에 녹아든다',
      '주제(인간성·기술·문명 등)와 플롯이 맞물린다',
      '세계의 디테일이 핍진성(그럴듯함)을 만든다',
    ],
    pitfall: [
      '설정만 화려하고 인물·이야기가 비어 있음',
      '과학 용어 나열·강의식 인포덤프',
      '기술이 필요할 때만 만능으로 작동(테크노바블)',
      '설정의 사회적·윤리적 함의를 외면',
      '현재 클리셰(로봇 반란·AI 각성)를 무비판 답습',
      '내부 규칙을 스스로 어겨 일관성 붕괴',
    ],
  },
  {
    id: 'horror',
    name: '호러·공포',
    icon: '👻',
    tagline: '두려움의 정서와 분위기·서스펜스',
    expect: [
      '서서히 스며드는 불안과 등골 오싹한 공포를 원한다',
      '안전이 무너지는 감각, 통제 불능의 위협을 기대한다',
      '분위기·긴장의 빌드업과 적절한 카타르시스를 바란다',
      '공포의 대상이 미지·금기를 건드리길 바란다',
    ],
    must: [
      '두려움을 일으키는 위협(초자연·인간·심리)이 있다',
      '분위기(감각 묘사·정적·예감)로 불안을 쌓는다',
      '안전한 일상이 잠식·전복되는 과정이 있다',
      '공포의 빌드업과 해소(또는 공포의 잔존)의 리듬이 있다',
      '인물이 위협 앞에 취약하다(통제력 상실)',
      '미지·설명되지 않는 영역이 두려움을 유지한다',
    ],
    pitfall: [
      '점프스케어 남발 — 분위기·긴장 빌드업 없이 놀래키기만',
      '괴물·악령의 정체를 과다 설명해 공포가 증발',
      '인물이 비상식적 선택만 함("왜 거길 가?")',
      '피·고어로 충격만 노리고 정서적 공포 부재',
      '위협의 규칙이 들쭉날쭉(언제 죽고 언제 안 죽는지 모호)',
      '클리셰(다락방·전화 끊김)를 비틀지 않고 반복',
    ],
  },
  {
    id: 'coming-of-age',
    name: '성장 서사',
    icon: '🌱',
    tagline: '인물의 내적 변화와 정체성의 발견',
    expect: [
      '주인공이 미숙함에서 성숙으로 변하는 여정을 보고 싶다',
      '정체성·소속·가치의 발견에 공감하고 싶다',
      '시행착오와 상실을 통한 진짜 성장을 기대한다',
      '공감 가능한 주인공의 내면을 따라가고 싶다',
    ],
    must: [
      '주인공의 출발점(결핍·미성숙·거짓 믿음)이 분명하다',
      '성장을 강제하는 사건·관계·상실이 있다',
      '내적 변화(아크)가 행동의 변화로 드러난다',
      '멘토·또래·가족 등 성장에 영향을 주는 관계가 있다',
      '결말에서 인물이 출발점과 달라져 있다',
      '성장의 대가(잃은 것·포기한 것)가 보인다',
    ],
    pitfall: [
      '깨달음을 설교·요약으로 말해버림(보여주기 부재)',
      '성장이 사건 없이 갑자기 일어남(개연성 부족)',
      '주인공이 수동적이라 변화가 외부에서 주어짐',
      '교훈을 위해 인물·갈등을 도구화',
      '나이만 들고 내면은 그대로(성장 없는 성장담)',
      '어른·세상을 일방적 악역으로만 그림',
    ],
  },
  {
    id: 'wuxia',
    name: '무협',
    icon: '⚔️',
    tagline: '무공·강호·협의(俠義)와 은원의 세계',
    expect: [
      '독창적 무공과 박진감 넘치는 대결을 원한다',
      '강호(江湖)의 질서·문파·은원 관계의 세계를 기대한다',
      '협(俠)의 정신 — 의리·정의·복수의 서사를 바란다',
      '주인공의 무공 성장과 경지 돌파의 쾌감을 바란다',
    ],
    must: [
      '강호·무림의 세계관(문파·정사·서열)이 설정된다',
      '주인공의 무공 성장·기연·경지 단계가 있다',
      '협의·은원(恩怨)·복수 등 무협적 동기가 작동한다',
      '무공·초식이 구체적이고 대결이 장면으로 그려진다',
      '강호의 규율·도의(道義)가 갈등의 축이 된다',
      '내공·심법 등 작품 내 무공 체계가 일관된다',
    ],
    pitfall: [
      '무공 명칭만 화려하고 대결 묘사가 추상적',
      '주인공이 너무 빨리 천하제일(긴장 소멸)',
      '기연(우연한 비급·영약)에만 의존한 성장',
      '협의 명분 없이 학살을 정당화',
      '문파·인물이 많아 관계가 혼란스러움',
      '무공 체계가 들쭉날쭉(설정 붕괴)',
    ],
  },
  {
    id: 'webnovel',
    name: '웹소설',
    icon: '📱',
    tagline: '회차 단위 흡인력과 사이다·고구마의 리듬',
    expect: [
      '매 회차 빠르게 읽히고 다음 화가 궁금하길 원한다',
      '주인공의 시원한 성취·복수("사이다")를 기대한다',
      '초반(1~3화)에 강한 후킹·세계관 제시를 바란다',
      '명확한 목표·성장·보상의 사이클을 바란다',
    ],
    must: [
      '1화에서 강력한 후킹(상황·떡밥·반전)으로 끌어들인다',
      '회차마다 클리프행어로 다음 화 결제를 유도한다',
      '주인공의 목표·성장·보상 사이클이 반복·상승한다',
      '"고구마(답답함)"와 "사이다(통쾌함)"의 리듬을 관리한다',
      '회차 분량(약 5천 자 내외)에 기승전결 호흡을 담는다',
      '키워드·장르 코드(회귀·빙의·환생·헌터 등)가 분명하다',
    ],
    pitfall: [
      '도입이 느려 1~3화에서 독자 이탈',
      '고구마 구간이 너무 길어 답답함만 남음',
      '주인공이 무적이라 긴장·성장감 소실',
      '클리프행어 남발로 매 화 미끼만 던지고 회수 안 함',
      '설정·세계관 인포덤프로 회차 흐름이 끊김',
      '키워드(코드)만 차용하고 차별점이 없음',
    ],
  },
  {
    id: 'historical',
    name: '역사·시대물',
    icon: '🏯',
    tagline: '시대 고증과 당대의 정서·제약',
    expect: [
      '시대의 풍속·언어·제도가 그럴듯하게 재현되길 원한다',
      '당대 인물의 사고방식·제약에 몰입하고 싶다',
      '역사적 사실과 허구의 균형을 기대한다',
      '시대 특유의 분위기·디테일을 바란다',
    ],
    must: [
      '시대 배경(연대·지역·제도)이 구체적으로 설정된다',
      '의복·음식·언어·예법 등 시대 고증이 반영된다',
      '인물이 당대의 가치관·제약 안에서 행동한다',
      '실제 사건·인물과 허구의 경계가 의도적으로 관리된다',
      '현대적 시각·언어의 침범을 최소화한다',
      '시대의 사회적 갈등(신분·성별·체제)이 작동한다',
    ],
    pitfall: [
      '현대어·현대 사고방식이 시대를 깨뜨림(시대착오)',
      '고증 과시로 이야기보다 설명이 앞섬',
      '시대 배경이 무대장치일 뿐 플롯과 무관',
      '역사 왜곡을 사실처럼 단정(민감 사안 무신경)',
      '신분·성별 제약을 편의적으로 무시',
      '현대 가치관을 과거 인물에게 그대로 이식',
    ],
  },
  {
    id: 'literary',
    name: '문학·순문학',
    icon: '🖋️',
    tagline: '주제·문체·인물 내면의 밀도',
    expect: [
      '문장·문체의 밀도와 미학을 음미하고 싶다',
      '인물 내면과 주제의 깊이에 공감하고 싶다',
      '여운·해석의 여지가 남는 결말을 기대한다',
      '삶의 진실을 새롭게 비추는 통찰을 바란다',
    ],
    must: [
      '뚜렷한 주제 의식·문제의식이 작품을 관통한다',
      '인물의 내면·심리가 섬세하게 그려진다',
      '문체·이미지·상징이 의미를 만든다',
      '갈등이 외적 사건보다 내적·관계적 차원에 있다',
      '결말이 단정보다 여운·해석을 남긴다',
      '디테일(감각·묘사)이 주제로 수렴한다',
    ],
    pitfall: [
      '아름다운 문장에 취해 이야기·긴장이 사라짐',
      '주제를 직접 설교·진술해 여운을 죽임',
      '모호함을 깊이로 착각(읽히지 않음)',
      '상징을 위한 상징 — 작위적 장치',
      '인물이 작가의 대변인으로 전락',
      '아무 일도 일어나지 않아 독자가 이탈',
    ],
  },
  {
    id: 'comedy',
    name: '코미디·유머',
    icon: '😂',
    tagline: '웃음의 설계와 캐릭터·상황의 코미디',
    expect: [
      '진짜로 웃기길 원한다(스스로 웃기다고 믿는 것 말고)',
      '캐릭터·상황에서 자연스럽게 터지는 유머를 기대한다',
      '리듬감 있는 대사·타이밍을 바란다',
      '웃음 속에서도 인물에게 정이 가길 바란다',
    ],
    must: [
      '웃음의 원천(상황·캐릭터·말장난·아이러니)이 설계된다',
      '코미디에도 인물의 목표·갈등이 있다(개그만 나열 X)',
      '셋업→펀치라인의 리듬·타이밍이 있다',
      '캐릭터의 일관된 코믹 페르소나가 있다',
      '과장·반전·기대 위반이 웃음을 만든다',
      '유머가 인물·이야기에 봉사한다',
    ],
    pitfall: [
      '작가만 웃긴 자기만족 개그(독자는 안 웃김)',
      '개그 나열로 이야기·감정선이 실종',
      '같은 패턴 반복으로 신선함 소진',
      '약자 비하·혐오로 손쉬운 웃음',
      '진지한 순간이 전혀 없어 깊이가 없음',
      '타이밍·리듬 무시(설명하면 웃음 죽음)',
    ],
  },
  {
    id: 'children',
    name: '아동·청소년(YA)',
    icon: '🧒',
    tagline: '연령에 맞는 눈높이와 주인공의 주도성',
    expect: [
      '주인공이 또래 독자가 공감할 수 있는 나이·고민을 가지길 원한다',
      '명확하고 따라가기 쉬운 이야기를 기대한다',
      '주인공이 스스로 문제를 해결하는 주도성을 바란다',
      '연령에 맞는 어휘·주제·정서를 바란다',
    ],
    must: [
      '주인공이 독자 연령대(또는 약간 위)다',
      '주인공이 어른에게 의존하지 않고 스스로 행동한다',
      '주제·갈등이 연령에 맞되 진지하게 다뤄진다',
      '눈높이에 맞는 어휘·문장·분량이다',
      '희망·성장의 메시지가 깔린다(절망으로 끝내지 않음)',
      '명료한 플롯과 또렷한 감정선이 있다',
    ],
    pitfall: [
      '어른이 문제를 다 해결해 주인공이 들러리가 됨',
      '훈계·교훈을 노골적으로 설교',
      '어린 독자를 얕봐 갈등·주제를 무르게 처리',
      '연령에 안 맞는 어휘·소재(과도한 폭력·선정)',
      '주인공이 수동적이라 주도성 부재',
      '어른의 향수로 쓴 이야기(정작 또래 독자와 괴리)',
    ],
  },
]

interface UserItem { id: string; text: string }
interface Persisted {
  genreId: string
  checked: Record<string, boolean>        // 항목 id -> 체크
  userItems: Record<string, UserItem[]>   // `${genreId}:${catKey}` -> 사용자 항목
  removed: string[]                        // 삭제한 기본 항목 id
  collapsed: Record<CatKey, boolean>       // 카테고리 접힘
}

function emptyState(): Persisted {
  return { genreId: GENRES[0].id, checked: {}, userItems: {}, removed: [], collapsed: { expect: false, must: false, pitfall: false } }
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// localStorage 복원 — 미지원/차단/손상 시 빈 상태. 누락 필드 보강, 사라진 장르 id 는 기본값으로.
function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return emptyState()
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return emptyState()
    const genreId = GENRES.some((g) => g.id === p.genreId) ? p.genreId : GENRES[0].id
    const checked: Record<string, boolean> = {}
    if (p.checked && typeof p.checked === 'object') for (const k of Object.keys(p.checked)) checked[k] = !!p.checked[k]
    const userItems: Record<string, UserItem[]> = {}
    if (p.userItems && typeof p.userItems === 'object') {
      for (const k of Object.keys(p.userItems)) {
        const arr = p.userItems[k]
        if (Array.isArray(arr)) {
          userItems[k] = arr.filter((x: any) => x && typeof x.text === 'string').map((x: any) => ({ id: String(x.id || newId()), text: String(x.text) }))
        }
      }
    }
    const removed = Array.isArray(p.removed) ? p.removed.filter((x: any) => typeof x === 'string') : []
    const collapsed = { expect: !!p?.collapsed?.expect, must: !!p?.collapsed?.must, pitfall: !!p?.collapsed?.pitfall }
    return { genreId, checked, userItems, removed, collapsed }
  } catch {
    return emptyState()
  }
}

const defId = (genreId: string, cat: CatKey, idx: number) => `${genreId}:${cat}:${idx}`
const uiKey = (genreId: string, cat: CatKey) => `${genreId}:${cat}`

interface MergedItem { id: string; text: string; user: boolean }
function catItems(genre: Genre, cat: CatKey, state: Persisted): MergedItem[] {
  const out: MergedItem[] = []
  const base = genre[cat]
  base.forEach((text, idx) => {
    const id = defId(genre.id, cat, idx)
    if (state.removed.includes(id)) return
    out.push({ id, text, user: false })
  })
  const ui = state.userItems[uiKey(genre.id, cat)] || []
  ui.forEach((u) => out.push({ id: u.id, text: u.text, user: true }))
  return out
}

export default function GenreConventions({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [state, setState] = useState<Persisted>(init.current)
  const [query, setQuery] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({}) // catKey -> 입력 중
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const mounted = useRef(true)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // payload.genre 로 초기 장르 지정 가능(연계 진입).
  useEffect(() => {
    const g = payload && typeof payload.genre === 'string' ? payload.genre : ''
    if (g) {
      const hit = GENRES.find((x) => x.id === g || x.name === g)
      if (hit) setState((s) => ({ ...s, genreId: hit.id }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (flashTimer.current) clearTimeout(flashTimer.current)
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
  }, [])

  // 변경 시 자동 저장 — 차단/용량초과 시 안내만, 동작 유지.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state))
    } catch {
      if (mounted.current) showNote('이 브라우저에서 저장이 막혀 새로고침 시 진행 상황이 사라질 수 있어요.')
    }
  }, [state])

  const showFlash = (msg: string) => {
    setFlash(msg)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => { if (mounted.current) setFlash('') }, 1600)
  }
  const showNote = (msg: string) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2800)
  }

  const genre = GENRES.find((g) => g.id === state.genreId) || GENRES[0]

  const copyText = async (text: string, okMsg: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      showFlash(okMsg)
    } catch {
      showFlash('복사 실패 — 직접 선택해 복사하세요.')
    }
  }

  const setGenre = (id: string) => setState((s) => ({ ...s, genreId: id }))
  const toggle = (id: string) => setState((s) => ({ ...s, checked: { ...s.checked, [id]: !s.checked[id] } }))
  const toggleCat = (cat: CatKey) => setState((s) => ({ ...s, collapsed: { ...s.collapsed, [cat]: !s.collapsed[cat] } }))

  const addUserItem = (cat: CatKey) => {
    const text = (drafts[cat] || '').trim()
    if (!text) return
    const key = uiKey(genre.id, cat)
    const item: UserItem = { id: newId(), text }
    setState((s) => ({ ...s, userItems: { ...s.userItems, [key]: [...(s.userItems[key] || []), item] } }))
    setDrafts((d) => ({ ...d, [cat]: '' }))
  }

  const removeItem = (cat: CatKey, itemId: string, isUser: boolean) => {
    setState((s) => {
      const checked = { ...s.checked }; delete checked[itemId]
      if (isUser) {
        const key = uiKey(genre.id, cat)
        const arr = (s.userItems[key] || []).filter((u) => u.id !== itemId)
        return { ...s, checked, userItems: { ...s.userItems, [key]: arr } }
      }
      return { ...s, checked, removed: [...s.removed, itemId] }
    })
  }

  const resetGenre = () => {
    setState((s) => {
      const checked = { ...s.checked }
      for (const cat of CATEGORIES) {
        catItems(genre, cat.key, s).forEach((it) => { delete checked[it.id] })
      }
      return { ...s, checked }
    })
    showFlash('이 장르 체크를 모두 해제했어요.')
  }

  // 진행률(현재 장르)
  const per = CATEGORIES.map((c) => {
    const items = catItems(genre, c.key, state)
    const done = items.filter((it) => state.checked[it.id]).length
    return { cat: c, items, total: items.length, done }
  })
  const totalItems = per.reduce((a, p) => a + p.total, 0)
  const totalDone = per.reduce((a, p) => a + p.done, 0)
  const totalPct = totalItems ? Math.round((totalDone / totalItems) * 100) : 0

  const q = query.trim().toLowerCase()
  const matches = (text: string) => !q || text.toLowerCase().includes(q)

  // 텍스트/HTML 내보내기 공용
  const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const buildText = (): string => {
    const lines: string[] = [`# ${genre.icon} ${genre.name} 장르 관습 체크리스트`, genre.tagline, `진행률: ${totalDone}/${totalItems} (${totalPct}%)`, '']
    per.forEach((p) => {
      lines.push(`## ${p.cat.icon} ${p.cat.name}  [${p.done}/${p.total}]`)
      lines.push(`(${p.cat.desc})`)
      p.items.forEach((it) => lines.push(`- [${state.checked[it.id] ? 'x' : ' '}] ${it.text}`))
      lines.push('')
    })
    return lines.join('\n').trim()
  }

  const buildHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><strong>${escHtml(genre.icon + ' ' + genre.name)}</strong> — ${escHtml(genre.tagline)}</p>`)
    parts.push(`<p><strong>진행률: ${totalDone}/${totalItems} (${totalPct}%)</strong></p>`)
    per.forEach((p) => {
      parts.push(`<h3>${escHtml(p.cat.icon + ' ' + p.cat.name)} [${p.done}/${p.total}]</h3>`)
      parts.push(`<p><em>${escHtml(p.cat.desc)}</em></p>`)
      if (p.items.length === 0) parts.push('<p>(항목 없음)</p>')
      else p.items.forEach((it) => parts.push(`<p>${state.checked[it.id] ? '☑' : '☐'} ${escHtml(it.text)}</p>`))
    })
    return parts.join('')
  }

  const exportText = () => { copyText(buildText(), `체크리스트 복사 (${totalDone}/${totalItems})`) }

  const toProject = () => {
    if (!hasProjectBridge()) { showNote('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '기획',
      title: `장르 관습 — ${genre.name} (${totalDone}/${totalItems})`,
      bodyHtml: buildHtml(),
      meta: {
        장르: genre.name,
        한줄: genre.tagline,
        진행률: `${totalDone}/${totalItems} (${totalPct}%)`,
        ...Object.fromEntries(per.map((p) => [p.cat.name, `${p.done}/${p.total}`])),
      },
    })
    showNote(id ? `프로젝트 '기획' 폴더에 ${genre.name} 체크리스트를 추가했어요.` : '프로젝트에 추가하지 못했어요.')
  }

  const saveSnippet = () => {
    addToLibrary('snippets', { text: buildText(), source: `장르 관습 · ${genre.name}`, tags: ['장르', genre.name] })
    showFlash('스니펫으로 저장했어요.')
  }

  // 항목 클릭 복사
  const copyItem = (text: string) => copyText(`${genre.name} — ${text}`, '항목을 복사했어요.')

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', fontSize: 14 }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }
  const headTitle: React.CSSProperties = { fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 13.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }
  const catHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', userSelect: 'none', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }
  const itemRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 12px', borderTop: '1px solid var(--border)' }
  const tinyBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '3px 6px', borderRadius: 6, flexShrink: 0 }
  const bar = (h = 8): React.CSSProperties => ({ height: h, borderRadius: 99, background: 'var(--chrome-2)', border: '1px solid var(--border)', overflow: 'hidden', flex: 1, minWidth: 0 })
  const fill = (pct: number, ok = false): React.CSSProperties => ({ height: '100%', width: `${pct}%`, background: ok && pct >= 100 ? 'var(--ok)' : 'var(--accent)', transition: 'width .25s ease' })
  const genreChip = (active: boolean): React.CSSProperties => ({
    padding: '7px 11px', fontSize: 12.5, borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'var(--accent)' : 'var(--chrome-2)', color: active ? '#fff' : 'var(--text)',
    display: 'inline-flex', alignItems: 'center', gap: 5,
  })

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={headTitle}><Emoji e="📐" /> 장르 관습 체크리스트</span>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{flash}</span>}
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge() || totalItems === 0}
          title={hasProjectBridge() ? "현재 장르 체크리스트를 프로젝트 '기획' 폴더 문서로 추가" : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
        <button className="minibtn" onClick={saveSnippet} disabled={totalItems === 0} title="체크리스트를 스니펫으로 저장"><Emoji e="💾" /> 스니펫</button>
        <button className="minibtn" onClick={exportText} disabled={totalItems === 0} title="텍스트로 복사"><Emoji e="📋" /> 내보내기</button>
        <button className="minibtn" onClick={resetGenre} disabled={totalDone === 0} title="이 장르 체크 해제">↺ 해제</button>
      </div>

      {/* 장르 선택 */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 7, flexWrap: 'wrap', flexShrink: 0 }}>
        {GENRES.map((g) => (
          <button key={g.id} onClick={() => setGenre(g.id)} style={genreChip(g.id === genre.id)} title={g.tagline}>
            <span><Emoji e={g.icon} /></span>{g.name}
          </button>
        ))}
      </div>

      {/* 선택 장르 헤더 + 진행률 + 검색 */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 9, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 18 }}><Emoji e={genre.icon} /></span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{genre.name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{genre.tagline}</div>
          </div>
          <span style={{ flex: 1 }} />
          <div style={{ width: 120 }}><div style={bar(7)}><div style={fill(totalPct, true)} /></div></div>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: totalPct >= 100 ? 'var(--ok)' : 'var(--text)', flexShrink: 0 }}>{totalDone}/{totalItems} · {totalPct}%</span>
        </div>
        <input style={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔎 항목 검색 (예: 클리프행어, 동기, 인포덤프…)" />
      </div>

      {note && <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--warn)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {per.map(({ cat, items, total, done }) => {
          const open = !state.collapsed[cat.key]
          const draft = drafts[cat.key] || ''
          const pct = total ? Math.round((done / total) * 100) : 0
          const shown = items.filter((it) => matches(it.text))
          const hiddenByQ = q && shown.length < items.length
          return (
            <div key={cat.key} style={card}>
              <div style={catHead} onClick={() => toggleCat(cat.key)}>
                <span style={{ fontSize: 11, color: 'var(--muted)', width: 12, flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
                <span style={{ fontSize: 16, flexShrink: 0 }}><Emoji e={cat.icon} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{cat.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.desc}</div>
                </div>
                <div style={{ width: 80, flexShrink: 0 }}><div style={bar(6)}><div style={fill(pct, true)} /></div></div>
                <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, width: 50, textAlign: 'right', color: pct >= 100 && total > 0 ? 'var(--ok)' : 'var(--muted)' }}>{done}/{total}</span>
              </div>

              {open && (
                <div>
                  {items.length === 0 ? (
                    <div style={{ padding: '14px 12px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>항목이 없어요. 아래에서 추가하세요.</div>
                  ) : shown.length === 0 ? (
                    <div style={{ padding: '14px 12px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>'{query}' 와(과) 일치하는 항목이 없어요.</div>
                  ) : (
                    shown.map((it) => {
                      const checked = !!state.checked[it.id]
                      return (
                        <div key={it.id} style={itemRow}>
                          <input type="checkbox" checked={checked} onChange={() => toggle(it.id)}
                            style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, cursor: 'pointer', accentColor: 'var(--accent)' }} aria-label={it.text} />
                          <span onClick={() => toggle(it.id)}
                            style={{ flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.5, cursor: 'pointer', wordBreak: 'break-word', color: checked ? 'var(--muted)' : 'var(--text)', textDecoration: checked ? 'line-through' : 'none' }}>
                            {it.text}
                            {it.user && <span style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 5, padding: '0 4px', verticalAlign: 'middle' }}>내 항목</span>}
                          </span>
                          <button style={tinyBtn} title="이 항목 복사" onClick={() => copyItem(it.text)}>복사</button>
                          {it.user && <button style={{ ...tinyBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeItem(cat.key, it.id, true)}>✕</button>}
                          {!it.user && <button style={tinyBtn} title="이 기본 항목 숨기기" onClick={() => removeItem(cat.key, it.id, false)}>✕</button>}
                        </div>
                      )
                    })
                  )}
                  {hiddenByQ && shown.length > 0 && (
                    <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>검색어로 {items.length - shown.length}개 항목이 숨겨졌어요.</div>
                  )}

                  {/* 항목 추가 */}
                  <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
                    <input style={{ ...input, flex: 1 }} value={draft}
                      onChange={(e) => setDrafts((d) => ({ ...d, [cat.key]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUserItem(cat.key) } }}
                      placeholder={`${cat.name}에 점검 항목 추가…`} maxLength={160} aria-label={`${cat.name} 항목 추가`} />
                    <button className="minibtn" onClick={() => addUserItem(cat.key)} disabled={!draft.trim()}>＋ 추가</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.7, paddingBottom: 4 }}>
          장르 관습은 <b>지켜야 할 약속</b>이면서 동시에 <b>의도적으로 전복</b>할 수 있는 기대치예요. 독자 기대·필수 요소는 충족하되, 흔한 함정은 피하거나 비틀어 신선함을 만드세요.
          항목을 눌러 체크하고, 검색으로 빠르게 찾고, '복사'로 메모에 옮길 수 있어요. 기본 항목도 숨기거나 내 항목을 더할 수 있고, 모든 진행 상황은 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
