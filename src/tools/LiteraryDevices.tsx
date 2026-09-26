// 문학 장치 사전 — 복선·맥거핀·액자식 구성·의식의 흐름·믿을 수 없는 화자·상징·아이러니·플래시백 등
// 50+개의 서사·문체 장치를 정의·예시·쓰는 법과 함께 모은 로컬 사전.
// 자급식: react 와 './linkbus' 외 의존 없음. Math.random + localStorage(펼침 상태·즐겨찾기·마지막 카테고리)만 사용.
import { useState, useEffect, useMemo, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, Emoji } from './linkbus'

export const meta = { id: 'literary-devices', name: '문학 장치 사전', icon: '🎭', group: '언어·어휘', intro: '복선·맥거핀·액자식 구성·의식의 흐름·믿을 수 없는 화자… 서사·문체 장치 50+를 정의·예시·쓰는 법으로', w: 640, h: 660 }

interface Device { name: string; aka?: string; def: string; example: string; how: string }
interface CatDef { key: string; label: string; icon: string; items: Device[] }

// 로컬 문학 장치 사전 — 6개 카테고리, 합계 50+ 항목.
const CATS: CatDef[] = [
  {
    key: 'structure', label: '구성·플롯', icon: '🏗️', items: [
      {
        name: '복선', aka: 'Foreshadowing',
        def: '뒤에 일어날 사건이나 결말을 미리 슬쩍 암시해 두는 장치. 독자가 나중에 “아, 그래서!” 하고 무릎을 치게 만든다.',
        example: '첫 장면에서 벽난로 위에 걸린 사냥총이 클로즈업된다. 후반부, 바로 그 총이 발사된다.',
        how: '핵심 단서를 무심한 디테일·대사·사물에 숨겨라. 너무 노골적이면 김이 새고, 너무 흐리면 회수해도 독자가 못 알아챈다. 회수 지점을 먼저 정하고 거꾸로 심어라.',
      },
      {
        name: '체호프의 총', aka: "Chekhov's Gun",
        def: '이야기에 등장시킨 요소는 반드시 쓰여야 한다는 원칙. “1막에 총을 걸었다면 3막에 쏴라.”',
        example: '주인공이 무심코 챙긴 낡은 라이터가 결말의 탈출에서 결정적 역할을 한다.',
        how: '의미 있게 강조한 사물·능력·정보는 반드시 회수하라. 반대로, 쓰지 않을 거면 강조하지 마라. 미회수 복선은 독자에게 빚으로 남는다.',
      },
      {
        name: '맥거핀', aka: 'MacGuffin',
        def: '인물들이 필사적으로 좇지만 정작 그 자체의 정체는 중요하지 않은 대상. 이야기를 굴리는 동기 장치일 뿐이다.',
        example: '“말타의 매” 조각상, 펄프 픽션의 빛나는 서류가방 — 내용물은 끝내 안 밝혀진다.',
        how: '인물의 욕망과 갈등을 점화하는 “미끼”로 써라. 독자의 관심은 맥거핀 자체가 아니라 그것을 둘러싼 인물의 변화에 쏠리게 하라.',
      },
      {
        name: '액자식 구성', aka: '액자소설 / Frame Story',
        def: '바깥 이야기(액자) 안에 또 다른 이야기를 끼워 넣는 구조. 누군가 이야기를 들려주는 형식이 흔하다.',
        example: '“폭풍의 언덕” — 록우드가 듣는 넬리의 회상이 본 줄거리를 이룬다. “천일야화”도 대표적.',
        how: '안 이야기에 거리감·신빙성·중층 의미를 부여하고 싶을 때 써라. 바깥 화자의 편견·목적이 안 이야기의 해석을 비틀게 설계하면 더 깊어진다.',
      },
      {
        name: '인 메디아스 레스', aka: 'In Medias Res',
        def: '사건의 한복판에서 이야기를 시작하는 기법. 배경 설명은 나중에 흘려 보낸다.',
        example: '“일리아스”는 전쟁 9년차의 분노에서 시작한다. 영화도 흔히 추격전 한가운데서 연다.',
        how: '도입의 늘어짐을 건너뛰고 즉시 긴장을 걸 때 효과적. 빠진 배경은 회상·대사·단서로 자연스럽게 채워라.',
      },
      {
        name: '플래시백', aka: '회상 / Flashback',
        def: '현재 시점에서 과거의 장면으로 거슬러 올라가 보여주는 장치. 인물의 과거·동기를 드러낸다.',
        example: '형사가 사건 현장에서 문득 어린 시절의 사고를 떠올리며 장면이 과거로 전환된다.',
        how: '꼭 필요한 정보만, 현재의 긴장과 맞물릴 때 넣어라. 잦은 회상은 흐름을 끊는다. 전환은 감각 신호(냄새·소리)로 매끄럽게.',
      },
      {
        name: '플래시포워드', aka: '미래 예시 / Flash-forward',
        def: '미래의 한 장면을 앞당겨 보여주는 기법. 결말의 긴장을 예고하거나 운명감을 자아낸다.',
        example: '첫머리에 법정에 선 주인공을 보여준 뒤, “6개월 전”으로 돌아가 사건을 따라간다.',
        how: '“어떻게 저기까지 갔나?”라는 궁금증을 동력으로 삼아라. 보여준 미래와 실제 결말 사이에 반전의 여지를 남겨도 좋다.',
      },
      {
        name: '인물·사건의 평행 구성', aka: '병치 / Parallelism · Foil Plot',
        def: '두 인물이나 줄거리를 나란히 두어 서로를 비추게 하는 구성. 대조나 메아리로 주제를 부각한다.',
        example: '한 인물은 복수를 택하고 다른 인물은 용서를 택해, 같은 상처의 두 갈래 길을 보여준다.',
        how: '대비할 축(가치관·선택·결말)을 분명히 하라. 두 선을 같은 모티프로 묶으면 “거울 효과”가 강해진다.',
      },
      {
        name: '데우스 엑스 마키나', aka: 'Deus ex Machina',
        def: '해결 불가능해 보이던 갈등을 갑작스럽고 작위적인 외부 힘으로 단번에 풀어버리는 결말 장치(주로 결함으로 지적됨).',
        example: '절체절명의 순간, 아무 복선 없이 신·구조대·뜻밖의 유산이 등장해 모든 걸 해결한다.',
        how: '대개 피하는 게 낫다. 굳이 쓴다면 미리 복선을 심거나, 의도적 풍자·메타 장치로 비틀어라. 인물의 선택이 해결을 이끌게 하는 편이 정석.',
      },
      {
        name: '클리프행어', aka: 'Cliffhanger',
        def: '긴장이 최고조인 순간에 장·회차를 끊어 독자가 다음을 갈망하게 만드는 장치.',
        example: '“그때, 닫히던 문틈으로 익숙한 그림자가 비쳤다 —” 하고 챕터가 끝난다.',
        how: '연재·장편의 장 끝에 효과적. 남발하면 피로하니 진짜 결정적 순간에 아껴 써라. 미끼 질문(누가? 왜? 어떻게?)을 또렷이 남겨라.',
      },
      {
        name: '수미상관', aka: '액자 회귀 / Bookending',
        def: '이야기의 처음과 끝을 같은 이미지·문장·상황으로 맞물리게 해 완결감과 변화를 동시에 주는 구성.',
        example: '같은 창가 장면으로 열고 닫되, 끝에서는 인물의 마음이 정반대로 바뀌어 있다.',
        how: '반복하되 “무엇이 달라졌는가”를 보여줘라. 같은 표면, 다른 의미 — 그 낙차가 주제를 각인시킨다.',
      },
      {
        name: '붉은 청어', aka: '레드 헤링 / Red Herring',
        def: '독자(또는 인물)의 주의를 진짜 단서에서 딴 데로 돌리는 거짓 단서. 추리물의 필수 장치.',
        example: '모든 정황이 집사를 범인으로 가리키지만, 진범은 의외의 인물이다.',
        how: '공정하게 속여라 — 진짜 단서도 함께 깔아 두어 재독 시 “다 있었네” 하게 만들면 명품 미스터리가 된다.',
      },
    ],
  },
  {
    key: 'narration', label: '화자·시점', icon: '👁️', items: [
      {
        name: '믿을 수 없는 화자', aka: 'Unreliable Narrator',
        def: '거짓·착각·편견·정신 상태 때문에 진술을 곧이곧대로 믿을 수 없는 서술자. 진실은 행간에서 재구성된다.',
        example: '“그 살인의 추억” 류 — 화자가 자기에게 유리하게 사건을 윤색하다 마지막에 본색이 드러난다.',
        how: '화자의 진술과 객관적 단서 사이에 균열을 심어라. 독자가 “이상한데?”를 누적하다 결정적 순간에 진실을 깨닫게 하라.',
      },
      {
        name: '의식의 흐름', aka: 'Stream of Consciousness',
        def: '인물의 머릿속 생각·인상·기억이 논리적 정리 없이 흐르는 대로 옮긴 서술 기법.',
        example: '제임스 조이스 “율리시스”, 버지니아 울프 “댈러웨이 부인”의 끊임없는 내면 독백.',
        how: '구두점·문법을 느슨히 풀고 연상으로 이어 붙여라. 너무 길면 난해해지니 핵심 정서를 가리키는 “닻”을 군데군데 박아라.',
      },
      {
        name: '내적 독백', aka: 'Interior Monologue',
        def: '인물이 속으로 하는 말을 그대로 드러내는 서술. 의식의 흐름보다 정돈된 “마음속 대사”에 가깝다.',
        example: "'그가 거짓말을 하고 있어. 알면서도 나는 왜 고개를 끄덕이고 있지?'",
        how: '대사로는 못 할 속내·갈등을 드러낼 때 써라. 외면의 행동과 내면의 말이 엇갈릴 때 인물이 입체화된다.',
      },
      {
        name: '전지적 시점', aka: 'Omniscient POV',
        def: '모든 인물의 마음과 사건의 전모를 다 아는 신과 같은 서술자의 시점.',
        example: '“전쟁과 평화”처럼 한 장면 안에서 여러 인물의 속내를 자유로이 넘나든다.',
        how: '폭넓은 조망·논평이 필요한 대하 서사에 적합. 다만 한 장면 안 잦은 시점 이동(헤드호핑)은 몰입을 깨니 절제하라.',
      },
      {
        name: '제한적 3인칭', aka: 'Close Third Person',
        def: '한 인물의 어깨 너머에서, 그 인물이 보고 느끼는 것만 따라가는 3인칭 시점.',
        example: '“해리 포터”는 대체로 해리가 아는 것만 독자에게 보여준다.',
        how: '인물과의 밀착과 객관 묘사의 균형을 원할 때 기본값으로 좋다. 시점 인물이 모르는 정보는 새 나가지 않게 통제하라.',
      },
      {
        name: '2인칭 시점', aka: 'Second Person',
        def: "독자(혹은 ‘너’)를 주인공으로 끌어들여 ‘너는 …한다’로 서술하는 드문 시점.",
        example: '“너는 문을 연다. 차가운 공기가 너의 목덜미를 스친다.” (게임북·실험 소설에서 흔함)',
        how: '몰입감·불편한 친밀감·보편성을 노릴 때 써라. 긴 분량엔 부담스러우니 단편·특정 장면에 한정하는 게 안전하다.',
      },
      {
        name: '복수 시점', aka: 'Multiple POV',
        def: '여러 인물의 시점을 번갈아 가며 같은 세계를 다각도로 보여주는 구성.',
        example: '“왕좌의 게임”은 챕터마다 시점 인물이 바뀌며 퍼즐을 맞춰 간다.',
        how: '시점 전환은 장·챕터 단위로 명확히. 각 시점이 “그 인물만 아는 정보”를 쥐게 해 독자에게는 전모를, 인물에게는 한계를 주어라.',
      },
      {
        name: '극적 아이러니', aka: 'Dramatic Irony',
        def: '독자는 아는 진실을 작중 인물은 모를 때 생기는 긴장. 시점·정보 통제에서 비롯한다.',
        example: '관객은 그 잔에 독이 들었음을 아는데, 인물은 웃으며 잔을 든다.',
        how: '“알면서 못 막는” 무력감으로 서스펜스를 만들어라. 정보를 누구에게 언제 줄지(독자 먼저? 인물 먼저?)를 설계하는 게 핵심.',
      },
    ],
  },
  {
    key: 'figurative', label: '비유·심상', icon: '🌅', items: [
      {
        name: '은유', aka: 'Metaphor',
        def: "‘…처럼/같이’ 없이 한 대상을 다른 대상이라고 단정해 빗대는 비유. ‘A는 B다.’",
        example: '“내 마음은 호수요.” / “그 도시는 거대한 짐승의 위장이었다.”',
        how: '추상을 구체로 옮겨 한 방에 보여줘라. 진부한 은유는 피하고, 작품 전체를 관통하는 “확장 은유”로 키우면 깊어진다.',
      },
      {
        name: '직유', aka: 'Simile',
        def: "‘…처럼·같이·듯이’로 두 대상을 견주는 비유.",
        example: '“그녀는 얼음처럼 차가웠다.” / “심장이 북처럼 쿵쿵 뛰었다.”',
        how: '낯선 두 대상을 신선하게 이어 감각을 깨워라. 상투적 직유(눈처럼 희다)는 비틀거나 버려라.',
      },
      {
        name: '의인법', aka: 'Personification',
        def: '사물·자연·추상에 사람의 감정·행동을 부여하는 비유.',
        example: '“바람이 창문을 두드리며 흐느꼈다.” / “시간이 우리를 비웃었다.”',
        how: '배경·자연을 인물의 감정에 공명시켜 분위기를 빚어라. 과하면 유치해지니 정서의 정점에서만 절제해 써라.',
      },
      {
        name: '상징', aka: 'Symbol',
        def: '구체적 사물·이미지로 그 너머의 추상적 의미(주제·감정·관념)를 대신 드러내는 장치.',
        example: '“위대한 개츠비”의 초록 불빛 = 닿을 수 없는 꿈. 비둘기 = 평화.',
        how: '반복 등장과 맥락으로 의미를 쌓아라. 처음과 끝에서 같은 상징의 의미를 뒤집으면 강렬해진다. 설명하지 말고 보여줘라.',
      },
      {
        name: '심상(이미지즘)', aka: 'Imagery',
        def: '오감을 자극하는 구체적 묘사로 독자의 머릿속에 생생한 그림을 그리는 기법.',
        example: '“젖은 흙냄새, 멀리서 들려오는 개 짖는 소리, 손끝에 닿는 거친 벽돌.”',
        how: '추상어(아름답다, 무섭다) 대신 감각 디테일로 보여줘라. 한 장면에 한두 감각을 또렷이 — 모든 감각을 한꺼번에 쏟지 마라.',
      },
      {
        name: '환유', aka: 'Metonymy',
        def: '대상을 그것과 밀접히 연관된 다른 것의 이름으로 바꿔 부르는 비유.',
        example: '“청와대가 발표했다”(=정부), “펜은 칼보다 강하다”(=글/무력).',
        how: '간결하고 함축적인 표현이 필요할 때. 관념을 손에 잡히는 대용물로 치환해 문장에 무게와 리듬을 더하라.',
      },
      {
        name: '제유', aka: 'Synecdoche',
        def: '부분으로 전체를, 혹은 전체로 부분을 대신 가리키는 비유(환유의 한 갈래).',
        example: '“일손이 부족하다”(=일하는 사람), “빵을 벌다”(=생계).',
        how: '구체적 일부를 클로즈업해 전체를 환기시켜라. 시·간결한 산문에서 이미지의 밀도를 높인다.',
      },
      {
        name: '과장법', aka: 'Hyperbole',
        def: '실제보다 훨씬 부풀려 표현해 강조·해학·정서를 키우는 수사.',
        example: '“천 번을 말해도 못 알아듣는다.” / “눈물이 강을 이뤘다.”',
        how: '감정의 크기를 단번에 전하거나 유머를 줄 때. 진지한 묘사와 섞을 땐 톤이 깨지지 않게 의도적으로 다뤄라.',
      },
      {
        name: '대조법', aka: 'Antithesis',
        def: '상반된 개념·이미지를 나란히 놓아 의미를 선명하게 부딪치게 하는 수사.',
        example: '“최고의 시절이자 최악의 시절이었다.”(두 도시 이야기)',
        how: '대구(對句) 구조로 균형을 맞춰 리듬과 긴장을 만들어라. 주제의 핵심 갈등을 한 문장에 압축할 때 강력하다.',
      },
      {
        name: '공감각', aka: 'Synesthesia',
        def: '한 감각을 다른 감각의 언어로 표현해 인상을 증폭하는 기법.',
        example: '“푸른 휘파람 소리” / “향기로운 음악” / “뜨거운 침묵.”',
        how: '평범한 묘사를 단숨에 신선하게 만든다. 시·서정적 산문에서 정서의 정점에 한 번씩 박아 넣어라.',
      },
      {
        name: '객관적 상관물', aka: 'Objective Correlative',
        def: '감정을 직접 말하는 대신, 그 감정을 불러일으키는 구체적 사물·상황·이미지로 대신 환기하는 기법.',
        example: '슬픔을 “슬프다”라 쓰지 않고, 식어 버린 두 잔의 찻잔과 빈 의자로 보여준다.',
        how: '“말하지 말고 보여줘라”의 정수. 정서와 등가인 외부 대상을 찾아 장면에 배치하라.',
      },
    ],
  },
  {
    key: 'irony', label: '아이러니·대비', icon: '🎭', items: [
      {
        name: '언어적 아이러니', aka: 'Verbal Irony',
        def: '말의 표면적 뜻과 실제 의도가 반대인 표현. 빈정거림·풍자의 토대.',
        example: '폭우 속에서 “날씨 한번 끝내주네.”',
        how: '인물의 태도·관계를 드러내거나 웃음을 줄 때. 맥락이 분명해야 빈정거림이 “진심”으로 오독되지 않는다.',
      },
      {
        name: '상황적 아이러니', aka: 'Situational Irony',
        def: '기대했던 결과와 정반대의 일이 벌어지는 아이러니.',
        example: '소방서에 불이 난다. 평생 모은 돈으로 산 집이 입주 첫날 무너진다.',
        how: '운명의 장난·주제의 풍자를 담을 때. 우연이 아니라 “필연처럼 보이는 역설”로 설계하면 묵직해진다.',
      },
      {
        name: '풍자', aka: 'Satire',
        def: '아이러니·과장·해학으로 인간·사회의 어리석음과 악덕을 비판하는 기법.',
        example: '스위프트 “겸손한 제안” — 아일랜드 기아의 해법으로 아기를 먹자고 능청스레 제안한다.',
        how: '비판 대상을 정조준하고, 웃음 뒤에 칼날을 숨겨라. 톤(가벼운 호러스적 vs 신랄한 유베날리스적)을 일관되게 유지하라.',
      },
      {
        name: '역설', aka: 'Paradox',
        def: '겉보기엔 모순되지만 곱씹으면 진실을 품은 표현.',
        example: '“지는 것이 이기는 것이다.” / “나는 아무것도 모른다는 것을 안다.”',
        how: '주제의 깊이·통찰을 압축할 때. 단순한 말장난에 그치지 않도록 그 안의 진실이 작품에서 입증되게 하라.',
      },
      {
        name: '병치·대비', aka: 'Juxtaposition',
        def: '성격이 다른 두 대상을 바짝 붙여 놓아 차이를 도드라지게 하는 기법.',
        example: '호화로운 연회 장면 바로 다음에 굶주리는 빈민가를 잇대어 보여준다.',
        how: '장면·문장·이미지를 의도적으로 충돌시켜 주제를 부각하라. 전환의 “편집점”이 곧 의미가 된다.',
      },
      {
        name: '대조 인물', aka: 'Foil',
        def: '주인공과 대비되는 성격을 지녀, 대조로 주인공의 특질을 부각시키는 인물.',
        example: '셜록 홈즈의 냉철함을 돋보이게 하는 따뜻한 왓슨. 햄릿 곁의 결단력 있는 레어티즈.',
        how: '주인공의 핵심 자질을 거꾸로 비추는 인물을 배치하라. 적이 아니어도 된다 — 차이가 거울이 된다.',
      },
      {
        name: '비극적 결함', aka: '하마르티아 / Tragic Flaw (Hamartia)',
        def: '주인공을 파멸로 이끄는 치명적 성격적 결함이나 판단 착오.',
        example: '오셀로의 질투, 맥베스의 야망, 오이디푸스의 오만.',
        how: '인물의 미덕이 곧 결함이 되게 설계하면 비극이 깊어진다. 결함이 결정적 선택을 낳고, 그 선택이 파국을 부르게 하라.',
      },
      {
        name: '카타르시스', aka: 'Catharsis',
        def: '비극을 통해 독자·관객이 쌓인 연민과 공포를 토해내며 정서적으로 정화되는 경험.',
        example: '주인공의 몰락 앞에서 눈물 흘린 뒤 묘하게 후련해지는 감정.',
        how: '긴장을 충분히 쌓은 뒤 결정적 순간에 터뜨려라. 감정의 “방출”이 있으려면 그만큼의 “억압·축적”이 선행돼야 한다.',
      },
    ],
  },
  {
    key: 'sound', label: '소리·리듬', icon: '🎵', items: [
      {
        name: '두운', aka: 'Alliteration',
        def: '잇따른 단어들의 첫소리(자음)를 반복해 리듬과 음악성을 주는 기법.',
        example: '“소리 없이 스며드는 슬픔.” / “bold, brave, brilliant.”',
        how: '강조·암기성·운율이 필요한 제목·시·구호에 효과적. 과하면 유치해지니 핵심 구절에만.',
      },
      {
        name: '모음운(유운)', aka: 'Assonance',
        def: '인접한 단어들의 모음 소리를 반복해 내적 운율을 만드는 기법.',
        example: '“그 깊은 어둠의 늪.” / “the rain in Spain.”',
        how: '두운보다 은근하게 음악성을 깐다. 행 안에서 정서의 색조(밝은 ㅣ/ㅔ, 무거운 ㅜ/ㅓ)를 조율하라.',
      },
      {
        name: '의성어', aka: 'Onomatopoeia',
        def: '소리를 흉내 낸 말로 청각적 생생함을 주는 표현.',
        example: '“쏴아—”, “쾅!”, “바스락바스락”, “buzz”, “crash”.',
        how: '한국어는 의성·의태어가 풍부하니 적극 활용하되, 묘사를 대신하지는 마라 — 양념이지 본 재료가 아니다.',
      },
      {
        name: '의태어', aka: 'Mimetic Words',
        def: '모양·움직임·상태를 흉내 낸 말로 시각·동작을 감각화하는 표현(한국어 특유).',
        example: '“느릿느릿”, “반짝반짝”, “휘청휘청”, “꾸물꾸물”.',
        how: '동작과 질감을 단숨에 전한다. 같은 의태어 반복은 피하고, 인물·장면의 “리듬”에 맞춰 골라 써라.',
      },
      {
        name: '반복법', aka: 'Repetition',
        def: '단어·구절·구조를 의도적으로 되풀이해 강조·리듬·정서를 누적하는 기법.',
        example: '“나에게는 꿈이 있습니다”를 거듭하는 마틴 루서 킹의 연설.',
        how: '핵심을 못 박거나 점층적으로 고조시킬 때. 무의식적 반복(실수)과 구별되게, 분명한 의도로 “덩어리”를 만들어라.',
      },
      {
        name: '점층법', aka: 'Climax (Gradation)',
        def: '약→강, 작→큰 순으로 의미·정서·규모를 점점 키워 절정으로 몰아가는 배열.',
        example: '“한 사람을, 한 마을을, 한 나라를 움직였다.”',
        how: '문장·문단·플롯 모두에 적용 가능. 마지막 항목이 가장 강하도록 순서를 설계해 클라이맥스를 만들어라.',
      },
      {
        name: '돈호법', aka: 'Apostrophe',
        def: '그 자리에 없는 사람·죽은 이·사물·추상 개념을 직접 부르며 말을 거는 수사.',
        example: '“오, 죽음이여, 너의 승리가 어디 있느냐!” / “달아, 너는 알고 있겠지.”',
        how: '고양된 감정·탄식·기원을 토로할 때. 시·독백·연설에서 정서의 극점을 만든다. 산문에선 절제해 한 번만.',
      },
      {
        name: '설의법', aka: 'Rhetorical Question',
        def: '답을 구하기 위해서가 아니라 강조·환기를 위해 던지는 물음.',
        example: '“이보다 더 슬픈 일이 어디 있겠는가?” / “누가 그를 비난할 수 있겠는가?”',
        how: '독자의 동의를 끌어내거나 단정을 부드럽게 강조할 때. 연발하면 효과가 닳으니 결정적 대목에 아껴 써라.',
      },
      {
        name: '도치법', aka: 'Inversion / Anastrophe',
        def: '정상적인 어순을 뒤집어 특정 성분을 강조하거나 운율을 살리는 기법.',
        example: '“보고 싶다, 너의 그 웃음이.” (목적어 도치)',
        how: '강조하고 싶은 말을 앞·뒤로 빼라. 시·감정의 절정에서 효과적이지만, 남용하면 번역투처럼 어색해진다.',
      },
    ],
  },
  {
    key: 'meta', label: '문체·메타', icon: '🪞', items: [
      {
        name: '암시·인유', aka: '알루전 / Allusion',
        def: '잘 알려진 작품·인물·사건·신화를 직접 설명 없이 슬쩍 끌어다 함축을 더하는 기법.',
        example: '“그는 자기만의 십자가를 지고 있었다.”(성경) / “그녀의 판도라 상자가 열렸다.”',
        how: '독자가 아는 코드를 빌려 한마디로 깊이를 더하라. 다만 너무 전문적인 인유는 독자를 소외시킬 수 있으니 균형을.',
      },
      {
        name: '메타픽션', aka: 'Metafiction',
        def: '“이것이 허구”임을 작품 스스로 의식하고 드러내는 기법. 소설이 소설임을 폭로한다.',
        example: '서술자가 “지금 이 장면은 내가 지어낸 것이다”라고 독자에게 말을 건다.',
        how: '서사의 관습을 비틀거나 진실·허구의 경계를 묻고 싶을 때. 거리두기로 주제를 돌출시키되, 몰입을 통째로 깨지 않게 조절하라.',
      },
      {
        name: '제4의 벽 허물기', aka: 'Breaking the Fourth Wall',
        def: '인물·화자가 관객/독자의 존재를 인지하고 직접 말을 거는 장치.',
        example: '“데드풀”이 카메라를 보고 관객에게 농담을 던진다.',
        how: '유머·공모감·논평을 위해. 메타픽션의 한 형태. 톤(코미디/실험)에 맞춰 일관되게 쓰고, 진지한 리얼리즘과는 충돌함을 유의.',
      },
      {
        name: '몽타주', aka: 'Montage',
        def: '짧은 장면·이미지들을 빠르게 이어 붙여 시간 경과·정서·주제를 압축적으로 전하는 기법(영화에서 유래).',
        example: '훈련 장면들이 음악과 함께 빠르게 스쳐 지나가며 몇 달의 성장을 보여준다.',
        how: '긴 과정(여행·성장·몰락)을 건너뛰어 요약할 때. 산문에서는 단문의 나열·시점 컷으로 “편집 리듬”을 흉내 내라.',
      },
      {
        name: '의식적 모호성', aka: '열린 결말 / Ambiguity',
        def: '둘 이상의 해석이 공존하도록 의도적으로 결말·의미를 열어 두는 기법.',
        example: '“인셉션”의 마지막, 멈출 듯 멈추지 않는 팽이.',
        how: '독자에게 해석의 몫을 넘겨 여운을 남길 때. 단, “아무거나”가 아니라 “여러 갈래가 다 말이 되도록” 단서를 정교히 깔아라.',
      },
      {
        name: '미장아빔', aka: 'Mise en abyme',
        def: '작품 안에 그 작품의 축소판(이야기 속 이야기, 그림 속 그림, 극중극)을 끼워 넣어 메아리치게 하는 기법.',
        example: '“햄릿”의 극중극 “쥐덫”이 본 줄거리의 범죄를 재연한다.',
        how: '주제를 거울처럼 반사·증폭하거나 인물의 진실을 폭로할 때. 안과 밖의 이야기가 서로를 비추도록 의미를 포개라.',
      },
      {
        name: '에피그래프(제사)', aka: 'Epigraph',
        def: '본문 앞(또는 장 머리)에 다른 글에서 인용한 짧은 구절을 붙여 주제·분위기를 예고하는 장치.',
        example: '장 첫머리에 시 한 구절·격언·가상의 문헌 인용을 배치한다.',
        how: '작품 전체나 각 장의 “렌즈”를 미리 끼워 줄 때. 본문과 반어적으로 충돌시키면 의미가 한층 입체적이 된다.',
      },
      {
        name: '병렬 구문', aka: '대구법 / Parallel Structure',
        def: '같은 문법 구조를 반복해 균형·리듬·강조를 만드는 기법.',
        example: '“말하기는 쉽고, 행하기는 어렵고, 견디기는 더 어렵다.”',
        how: '대조·열거·연설에서 강력하다. 구조를 일관되게 맞추면 문장에 음악성과 설득력이 붙는다.',
      },
      {
        name: '결말 반전', aka: '트위스트 엔딩 / Twist Ending',
        def: '결말에서 그동안의 전제를 뒤집는 충격적 정보를 제시해 이야기 전체의 의미를 재배열하는 장치.',
        example: '“식스 센스” — 마지막 한 장면이 영화 전부를 다시 보게 만든다.',
        how: '반전은 공정해야 한다 — 재독·재관람 시 “단서가 다 있었다” 싶게 복선을 미리 깔아라. 충격만을 위한 반전은 배신감을 준다.',
      },
    ],
  },
]

const LS = 'sry:tool:literary-devices:'
const ALL_KEY = '__all__'
const flatAll = (): { cat: CatDef; item: Device }[] =>
  CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (str: string) =>
  String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const plain = (s: { cat: CatDef; item: Device }): string =>
  `${s.item.name}${s.item.aka ? ` (${s.item.aka})` : ''}\n` +
  `[정의] ${s.item.def}\n` +
  `[예시] ${s.item.example}\n` +
  `[쓰는 법] ${s.item.how}`

export default function LiteraryDevices() {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 펼친 항목: "catKey::name" 집합
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'open')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  // 즐겨찾기
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<{ cat: CatDef; item: Device } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'open', JSON.stringify(open)) } catch { /* ignore */ } }, [open])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])
  // 복사/토스트 타이머 정리(언마운트 시)
  useEffect(() => () => { setCopiedKey(null); setToast(null) }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  const itemKey = (catKey: string, name: string) => `${catKey}::${name}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[itemKey(c.key, item.name)])
    if (q) {
      base = base.filter(({ item }) =>
        item.name.toLowerCase().includes(q) ||
        (item.aka ? item.aka.toLowerCase().includes(q) : false) ||
        item.def.toLowerCase().includes(q) ||
        item.example.toLowerCase().includes(q) ||
        item.how.toLowerCase().includes(q))
    }
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    const pool = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.name === prev.item.name && pick.cat.key === prev.cat.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return pick
    })
  }, [cat])

  const toggleOpen = (catKey: string, name: string) => {
    const k = itemKey(catKey, name)
    setOpen((prev) => { const n = { ...prev }; if (n[k]) delete n[k]; else n[k] = true; return n })
  }
  const toggleFav = (catKey: string, name: string) => {
    const k = itemKey(catKey, name)
    setFavs((prev) => { const n = { ...prev }; if (n[k]) delete n[k]; else n[k] = true; return n })
  }
  const expandAll = () => {
    const n: Record<string, boolean> = {}
    filtered.forEach(({ cat: c, item }) => { n[itemKey(c.key, item.name)] = true })
    setOpen((prev) => ({ ...prev, ...n }))
  }
  const collapseAll = () => setOpen({})

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }

  // 현재 장치를 글감 스니펫으로 라이브러리에 저장
  const saveSnippet = (s: { cat: CatDef; item: Device }) => {
    addToLibrary('snippets', {
      text: plain(s),
      source: '문학 장치 사전',
      tags: ['문학장치', s.cat.label, s.item.name],
    })
    setToast(`스니펫 보관함에 ‘${s.item.name}’을(를) 저장했습니다.`)
    window.setTimeout(() => setToast((t) => (t && t.includes(s.item.name) ? null : t)), 2200)
  }

  // 현재 장치를 프로젝트 자료 〈문학 장치〉 폴더에 메모로 추가
  const addCurrentToProject = (s: { cat: CatDef; item: Device }) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(s.cat.icon + ' ' + s.cat.label)} · ${escapeHtml(s.item.name)}${s.item.aka ? ` <i>(${escapeHtml(s.item.aka)})</i>` : ''}</b></p>`,
      `<p><b>정의</b> · ${escapeHtml(s.item.def)}</p>`,
      `<p><b>예시</b> · ${escapeHtml(s.item.example)}</p>`,
      `<p><b>쓰는 법</b> · ${escapeHtml(s.item.how)}</p>`,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '문학 장치',
      title: `${s.item.name}${s.item.aka ? ` (${s.item.aka})` : ''}`,
      bodyHtml,
    })
    if (id) {
      setToast(`프로젝트 자료 〈문학 장치〉에 ‘${s.item.name}’을(를) 추가했습니다.`)
      window.setTimeout(() => setToast((t) => (t && t.includes(s.item.name) ? null : t)), 2200)
    }
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginRight: 6 }
  const lineStyle: React.CSSProperties = { fontSize: 13, lineHeight: 1.6, marginTop: 6 }

  const renderDetail = (item: Device) => (
    <>
      <div style={lineStyle}><span style={labelStyle}>정의</span>{item.def}</div>
      <div style={lineStyle}><span style={labelStyle}>예시</span>{item.example}</div>
      <div style={lineStyle}><span style={labelStyle}>쓰는 법</span>{item.how}</div>
    </>
  )

  return (
    <div style={wrap}>
      <div style={hint}>
        복선·맥거핀·액자식 구성·의식의 흐름·믿을 수 없는 화자·상징·아이러니·플래시백 등 <b>{total}개</b> 문학 장치를 정의·예시·쓰는 법으로 모았습니다. 펼쳐 보고, 검색하고, 무작위로 영감을 얻으세요.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="장치 이름·영문·정의·예시로 검색 (예: 복선, irony, 시점, 반전)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="✨" /> 전체
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={c.icon} /> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 장치</button>
        <button className="minibtn" onClick={expandAll}>⊕ 모두 펼치기</button>
        <button className="minibtn" onClick={collapseAll}>⊖ 모두 접기</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 무작위 결과 카드 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            {random.item.aka && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{random.item.aka}</span>}
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          {renderDetail(random.item)}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(plain(random), 'rand')}>
              {copiedKey === 'rand' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
            </button>
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="📌" /> 스니펫 저장</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>
              {favs[itemKey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
          {/* 연계: 현재 장치를 프로젝트 자료 〈문학 장치〉 폴더에 메모로 추가 */}
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => addCurrentToProject(random)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '현재 장치를 프로젝트 자료 〈문학 장치〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록(펼침형) */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 장치가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const k = itemKey(c.key, item.name)
            const isOpen = !!open[k]
            const isFav = !!favs[k]
            const copyId = 'item:' + k
            return (
              <div key={k} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                  onClick={() => toggleOpen(c.key, item.name)}
                  role="button" aria-expanded={isOpen}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', width: 14, flexShrink: 0 }}>{isOpen ? '▾' : '▸'}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /></span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</span>
                  {item.aka && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{item.aka}</span>}
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                    onClick={(e) => { e.stopPropagation(); toggleFav(c.key, item.name) }}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                {!isOpen && (
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 5, marginLeft: 22, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.def}
                  </div>
                )}
                {isOpen && (
                  <div style={{ marginLeft: 22 }}>
                    {renderDetail(item)}
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      <button className="minibtn" onClick={(e) => { e.stopPropagation(); copy(plain({ cat: c, item }), copyId) }}>
                        {copiedKey === copyId ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
                      </button>
                      <button className="minibtn" onClick={(e) => { e.stopPropagation(); saveSnippet({ cat: c, item }) }}><Emoji e="📌" /> 스니펫 저장</button>
                      <button className="linkbtn" onClick={(e) => { e.stopPropagation(); addCurrentToProject({ cat: c, item }) }} disabled={!hasProjectBridge()}
                        title={hasProjectBridge() ? '이 장치를 프로젝트 자료 〈문학 장치〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                        <Emoji e="📄" /> 프로젝트에 추가
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>장치는 목적이 아니라 도구입니다. 이야기의 정서·주제에 봉사할 때만 슬쩍 끼워 넣으세요.</div>
    </div>
  )
}
