// 로맨스 장르 지식·소재 사전 — 대표작 계보·하위장르·트로프·서사 장치·밀당/비트·관능도·로판 특화·
//  캐릭터 유형·클리셰(변주)·고증/세계관·웹소설 관습을 카테고리로 묶은 로컬 사전.
// 자급식: 외부 네트워크·라이브러리 없음. react + './linkbus' 만 사용. localStorage 로 펼침/즐겨찾기/마지막 카테고리 영속.
import { useState, useEffect, useMemo, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = { id: 'romance-knowledge', name: '로맨스 지식 사전', icon: '💞', group: '지식 사전', genre: '로맨스', intro: '로맨스에서 자주 쓰는 트로프·서사 장치·관습·고증 지식을 카테고리로 찾아 장면에 심으세요', w: 660, h: 640 }

interface Entry { name: string; desc: string; tip?: string }
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ─────────────────────────────────────────────────────────────────────────────
// 로맨스 도시에 기반 자작 지식 사전 — 12개 카테고리, 합계 300+ 항목.
// 데이터는 전부 로맨스 장르에 특화·구체적. 일반론·범용 글쓰기 조언은 배제.
// ─────────────────────────────────────────────────────────────────────────────
const CATS: CatDef[] = [
  {
    key: 'contract', label: '장르 규약', icon: '🤝', note: '로맨스를 다른 장르와 구분하는 "독자와의 계약". 어기면 별점 테러로 직결되는 필수 약속들.',
    items: [
      { name: 'HEA(영원히 행복하게)', desc: '두 주인공이 끝내 맺어지는 결말. 결혼·약혼·평생의 약속으로 봉인된다. 로맨스의 가장 강한 계약.', tip: '죽음·영영 이별로 끝내면 그건 "멜로/러브 스토리"지 로맨스가 아니다 — 표지·소개에서 미리 분위기를 고지하라.' },
      { name: 'HFN(지금은 행복)', desc: '결혼까지는 아니어도 "둘이 함께할 것"이라는 안도를 주는 열린 행복. 시리즈물·뉴어덜트에서 흔하다.', tip: '확정 결혼이 부담스러운 현대물·시리즈에선 HFN으로 다음 권의 여지를 남겨라.' },
      { name: '관계가 곧 플롯의 중심축', desc: '살인사건·전쟁·제국 정치가 있어도 "이 사건이 둘 사이를 어떻게 바꾸는가"가 항상 우선한다.', tip: '외부 사건마다 "이게 두 사람의 거리를 좁히나 벌리나?"를 자문하라. 관계와 무관한 사건은 곁가지로.' },
      { name: '정서적 카타르시스(emotional payoff)', desc: '두근거림·설렘·애절함·질투·화해의 안도까지 정서 롤러코스터를 제공하는 것이 핵심 상품.', tip: '사건 논리보다 정서 곡선을 우선하라. "논리는 맞는데 안 설렘"은 로맨스에선 실패.' },
      { name: '관능도(heat level) 사전 합의', desc: 'clean/sweet(키스까지) ↔ steamy ↔ explicit(노골적 정사)까지 단계가 있고, 표지·태그로 미리 고지된다.', tip: '본문이 태그와 어긋나면(클린인 줄 알았는데 수위가 높음 등) 강한 반발. 첫 정사 장면 전에 톤을 일관되게.' },
      { name: '감정의 정당화("왜 하필 이 사람")', desc: '사랑에 빠지는 이유가 장면으로 증명되어야 한다. 설득 실패 = "케미 없음" 평가.', tip: '둘만 아는 농담, 약점을 본 순간, 가치관이 겹친 사건 — 구체적 "끌림의 근거"를 심어라.' },
      { name: 'POV 친밀성·남주 시점 외전', desc: '주인공 내면(특히 1인칭/근접 3인칭)에 깊이 들어가고, 상대의 속마음은 "남주 시점 특별편"으로 보상하는 관습.', tip: '본편은 한 시점으로 갈증을 쌓고, 외전에서 "그때 그가 무슨 생각이었는지"를 풀어 재독을 유도하라.' },
      { name: '관계 진척의 가시성', desc: '첫 만남→인식→끌림→갈등→고백→위기→결합. 단계가 독자에게 체감되어야 한다.', tip: '진척이 정체되면 "고구마". 매 장(또는 매 회차)마다 둘의 거리에 +1이든 −1이든 변화를 새겨라.' },
      { name: '회차당 보상(웹소설 특화)', desc: '매 회차·매 5,000자마다 작은 설렘·반전·다음 화 궁금증(클리프행어)이 있어야 연독률이 유지된다.', tip: '회차 마지막 문장을 "설렘 포인트 or 떡밥"으로 끝내라. 무난하게 끝내면 이탈한다.' },
      { name: '첫인상 = 연독률(초반 1~10화)', desc: '도입부에서 두 주인공의 강렬한 케미와 이 작품의 핵심 트로프를 명확히 노출해야 한다.', tip: '"이 작품이 무슨 맛인지"를 5화 안에 보여줘라. 빌드업한다고 케미를 10화 뒤로 미루면 늦다.' },
      { name: '상호성(reciprocity)의 약속', desc: '한쪽의 일방적 희생이 아니라 둘 다 무언가를 내려놓고 다가가야 만족도가 높다.', tip: '남주만 매달리거나 여주만 희생하면 한쪽이 "을질"로 읽힌다. 클라이맥스에서 양쪽이 각자 장벽을 부숴라.' },
    ],
  },
  {
    key: 'subgenre', label: '하위 장르', icon: '🗂️', note: '무대와 독자 기대가 갈라지는 1차 분기. 어느 갈래인지 정하면 관습·관능도·페이싱이 따라온다.',
    items: [
      { name: '현대 로맨스(컨템퍼러리)', desc: '현대 도시 배경. 재벌·계약연애·사내연애가 주력. 노라 로버츠가 대중화한 베스트셀러 표준.', tip: '독자는 "내 일상에 일어났으면" 하는 판타지를 원한다. 직업·일상 디테일의 핍진성이 몰입을 만든다.' },
      { name: '로맨스 판타지(로판)', desc: '서구풍 가상 제국/귀족 사회 배경. 한국 웹소설이 독자적으로 키운 거대 하위장르. 회귀·빙의·환생이 엔진.', tip: '악역영애/회귀·빙의/정통 연애/육아·힐링으로 2차 분기. 갈래마다 트로프 셋이 다르다.' },
      { name: '악역 영애물(로판)', desc: '원작에서 파멸·처형당하는 악역으로 빙의/환생한 여주가 죽음의 플래그를 피한다. 『상수리나무 아래』 계보.', tip: '"내가 아는 결말"을 뒤집는 능동성이 동력. 파멸 회피→예상 밖 호감→로맨스 순서로 쌓아라.' },
      { name: '히스토리컬(리젠시·시대극)', desc: '섭정시대 영국 사교계 등 과거를 무대로. 줄리아 퀸 『브리저튼』이 현대 부흥, 영상화로 글로벌 확산.', tip: '무도회·사교철(season)·평판·결혼시장이라는 시대 규칙 자체가 갈등 엔진이 된다. 고증과 환상의 균형이 관건.' },
      { name: '패러노멀 로맨스', desc: '뱀파이어·늑대인간·유령 등 초자연 존재와의 사랑. 『트와일라잇』이 삼각관계+선택받는 평범한 여주를 정립.', tip: '"운명의 짝(mate bond)"·불멸과 필멸의 격차 같은 종족 설정이 곧 정서적 갈등이 된다.' },
      { name: '로맨틱 판타지(Romantasy)', desc: '본격 판타지 세계관 + 로맨스의 비중이 동등. 사라 J. 마스 『ACOTAR』가 현재 표준.', tip: '세계관 구축과 관계 빌드업을 모두 만족시켜야 한다 — 어느 한쪽이 들러리가 되면 양쪽 독자 모두 불만.' },
      { name: '로맨틱 서스펜스', desc: '스릴러·범죄 수사 + 로맨스. 위험이 둘을 묶고, 생존이 신뢰를 시험한다.', tip: '"목숨을 맡길 수 있는가"가 사랑의 시험대. 사건의 긴장과 관계의 긴장을 같은 곡선에 얹어라.' },
      { name: '에로티카·다크 로맨스', desc: '관능·집착·금기를 전면화. 『그레이의 50가지 그림자』가 BDSM·억만장자 트로프를 대중화.', tip: '동의·안전장치(safe word)·심리적 개연성을 명확히. "위험한 매력"과 "실제 학대"의 선을 작가가 통제하라.' },
      { name: '뉴어덜트·이슈 드리븐', desc: '20대 초중반, 트라우마·관계폭력·치유 등 무거운 소재. 콜린 후버가 대표.', tip: '아픈 소재일수록 결말의 안도(HEA/HFN)가 더 절실하다. 고통은 카타르시스를 위한 빌드업이어야 한다.' },
      { name: '학원물·하이틴(인터넷소설 계보)', desc: '학교 배경, 나쁜 남자 길들이기. 귀여니 『그놈은 멋있었다』 등 1세대 인터넷소설.', tip: '풋풋한 첫사랑·또래 집단·삼각관계가 자산. 현대 감성으로 "오글거림" 클리셰는 비틀어 쓰라.' },
      { name: '육아물·힐링물(로판)', desc: '어린 주인공/조카 키우기, 따뜻한 일상. 격렬한 갈등보다 정서적 안정이 상품.', tip: '아이를 매개로 차가운 남주가 녹는 구도가 백미. 큰 사건 없이도 매 화 "심쿵"으로 끌고 가라.' },
      { name: 'BL·GL(별도 관습 공유)', desc: '보이즈 러브·걸스 러브. 로맨스 서사 규약(HEA·관계 중심)은 공유하되 별도 관습 체계를 갖는다.', tip: '트로프는 호환되지만 공수(攻受)·관계 역학 등 고유 코드가 있다. 헤테로 로맨스 문법을 그대로 복붙하지 말 것.' },
      { name: '오피스 로맨스(사내연애)', desc: '직장 상하관계·동료·라이벌 사이의 비밀 연애. 현대 로맨스의 인기 무대.', tip: '"들키면 안 된다"는 강제적 비밀 + 위장 + 강제 밀착이 결합되는 트로프 보고. 권력차의 윤리에 주의.' },
    ],
  },
  {
    key: 'trope', label: '핵심 트로프', icon: '🎀', note: '로맨스의 "맛"을 결정하는 관계 설정. 표지·소개·태그로 독자를 모으는 상품 그 자체. 클리셰가 아니라 약속이다.',
    items: [
      { name: '적에서 연인으로(enemies to lovers)', desc: '서로를 싫어/적대하던 둘이 끌림을 자각. 『오만과 편견』의 다아시-엘리자베스가 원형.', tip: '적대의 "정당한 이유"가 깊을수록 전환의 카타르시스가 크다. 증오와 끌림은 동전의 양면 — 거리를 못 견디게 하라.' },
      { name: '친구에서 연인으로(friends to lovers)', desc: '오랜 친구가 어느 순간 이성으로 보이는 전환. 안정감과 "망치면 다 잃는다"는 두려움의 긴장.', tip: '"선을 넘는 한 순간"의 묘사가 백미. 익숙함 속에서 처음 본 낯선 얼굴을 포착하라.' },
      { name: '계약 결혼·계약 연애', desc: '이해관계로 시작한 가짜 관계가 진짜가 된다. "가짜인데 진짜가 되어버린" 전환점이 핵심.', tip: '계약 조항(데드라인·금지사항)이 곧 긴장 장치. "이건 계약일 뿐"이라는 자기최면이 무너지는 순간을 노려라.' },
      { name: '가짜 연인(fake dating)', desc: '집안·평판·복수를 위해 연인인 척 연기하다 진심이 된다. 연기와 진심의 경계가 흐려지는 재미.', tip: '"남들 앞에서만"이라던 스킨십이 둘만 있을 때도 나오는 순간이 전환점이다.' },
      { name: '신분 격차(재벌남×평범녀 등)', desc: '권력·재산·계급 차이를 넘는 사랑. 신데렐라 서사의 현대적 변주.', tip: '격차 자체를 갈등으로(주변의 반대·열등감·이용 의심). 신분이 사랑을 시험하되 사랑이 신분을 이기게.' },
      { name: '강제 동거·밀착(forced proximity)', desc: '한 침대만 남은 여관(one bed!), 폭설로 갇힘, 위장 부부, 같은 프로젝트. 물리적으로 둘을 묶어 감정을 강제.', tip: '"한 침대" 같은 단일 장면 트로프는 짧고 강하게 — 텐션을 끝까지 끌었다가 살짝만 풀어라.' },
      { name: '집착남주(얀데레)', desc: '과도한 독점욕·소유욕. 로판·다크 로맨스의 강력한 정서 연료.', tip: '집착이 매력이려면 "그녀의 안전·의사"는 지켜야 한다. 폭력·통제로 넘어가는 선을 작가가 통제하라.' },
      { name: '후회남주(후회물)', desc: '여주를 버리거나 박대한 뒤 뒤늦게 후회하며 매달린다. "내가 잘못했다"의 권력 역전 카타르시스.', tip: '핵심은 "회수 불가"의 안도감 — 여주가 이미 떠났거나 변했고, 남주가 절절히 갚는 구도여야 사이다.' },
      { name: '첫눈에 반함(insta-love)', desc: '첫 만남에 강렬히 끌린다. 단편·카테고리물·운명적 사랑(mate bond)에 적합.', tip: '장편에선 "끌림"까지만 첫눈에, "사랑"은 빌드업으로. 인스타러브를 운명·전생·각인으로 정당화하라.' },
      { name: '슬로우번(slow burn)', desc: '느린 빌드업, 긴장의 누적. 로판·현대 장편의 주력. 닿을 듯 닿지 않는 갈증이 상품.', tip: '"아직 아니야"를 반복하되 매번 조금씩 가까워져라. 정체 = 고구마, 진척 = 명품 슬로우번.' },
      { name: '삼각관계(love triangle)', desc: '두 후보 사이의 선택. 『트와일라잇』의 에드워드-제이콥처럼 팬덤 분열을 부른다.', tip: '진짜 매력적인 "2번 후보"를 만들되, 누구와 맺어질지는 정서적으로 일찍 암시해 배신감을 피하라.' },
      { name: '소꿉친구·짝사랑(childhood/pining)', desc: '오래 마음에 둔 상대. 드러내지 못한 갈망(yearning)이 정서의 핵심 연료.', tip: '말 못 한 세월의 무게를 디테일로 — 늘 같은 자리, 모아둔 사소한 것, 닿지 못한 손끝.' },
      { name: '권력자×보호 대상(보디가드·주종)', desc: '황제×시녀, 경호원×의뢰인, 상사×부하. 권력차와 직무 규범이 금기를 만든다.', tip: '"지켜야 할 의무"와 "넘으면 안 될 선"의 충돌이 긴장. 직무가 사랑의 알리바이이자 장벽이다.' },
      { name: '회귀·빙의·환생(로판 엔진)', desc: '주인공만 미래/원작 결말을 안다. "비극을 알면서 다시 그를 만남"의 애절함과 결말 변경의 능동성.', tip: '정보 비대칭을 최대한 활용 — 독자는 "이번엔 다를까"를 기대한다. 회귀 전후의 같은 장면을 대비시켜라.' },
      { name: '복수극·원수의 자식', desc: '집안의 원수, 복수를 위한 접근이 사랑으로 변질. 『폭풍의 언덕』식 파괴적 정념의 계보.', tip: '복수 동기와 사랑이 충돌하는 순간이 클라이맥스. "널 무너뜨리려 했는데"의 모순이 절정의 동력.' },
      { name: '둔감남·철벽녀', desc: '한쪽이 자기/상대 감정을 끝내 자각 못 함. 답답함과 폭발의 카타르시스를 설계.', tip: '둔감/철벽은 "고구마"가 되기 쉽다 — 자각의 트리거(질투·이별 위기)를 적시에 던져 폭발시켜라.' },
      { name: '연상연하·나이차', desc: '연상녀×연하남, 노련한 남주×어린 여주 등 나이·경험 격차의 긴장.', tip: '나이차 자체보다 "성숙도·세상 경험의 비대칭"이 갈등을 만든다. 권력차와 동의에 주의.' },
      { name: '병약·시한부·기억상실', desc: '병·죽음·기억의 위기를 사랑이 견딘다. 애절함을 극대화하는 멜로 장치.', tip: '로맨스 규약상 결국 HEA/HFN로 가야 한다 — 시한부도 "기적·치유·함께한 시간"으로 봉합하라.' },
    ],
  },
  {
    key: 'device', label: '서사 장치', icon: '🎭', note: '로맨스를 "로맨스답게" 굴리는 엔진들. 장면 단위로 꺼내 쓰는 핵심 자산.',
    items: [
      { name: '밀당(push-pull)', desc: '끌림과 회피의 진자 운동. 가까워지면 한쪽이 물러서고, 멀어지면 다른 쪽이 끌림을 자각.', tip: '"한 발 다가가면 두 발 물러서기" 박자. 이 진자가 멈추면 텐션이 죽는다.' },
      { name: '절망의 순간(Black Moment)', desc: '클라이맥스 직전, 관계가 끝장난 듯한 최저점. 오해의 폭발·비밀의 폭로·외부 압력의 정점.', tip: '로맨스의 필수 구조 비트. "정말 헤어질 것 같다"는 공포를 독자에게 줘야 재결합이 카타르시스가 된다.' },
      { name: '대형 고백·증명 행위(Grand Gesture)', desc: '절망 이후 한쪽이 자존심·지위·목숨을 걸고 사랑을 증명. 공개 고백, 권력 포기, 추격.', tip: '평소 캐릭터가 "절대 안 할 행동"일수록 효과가 크다. 차가운 남주의 공개 고백처럼 캐릭터를 깨뜨려라.' },
      { name: '애틋한 갈망(yearning/pining)', desc: '드러내지 못하는 마음. 닿을 듯 닿지 않는 손끝, 시선, 독백. 로맨스 정서의 핵심 연료.', tip: '직접 말하지 못해 사물·행동으로 새어 나오는 마음을 그려라 — 보고도 못 본 척, 챙기고도 아닌 척.' },
      { name: '니어 키스(almost-kiss)', desc: '입맞춤 직전에 방해받음. 텐션을 끌어올리고 보상을 미루는 페이싱 도구.', tip: '방해 요소(누가 부름·전화·정전)는 우연이되 적시에. 두세 번 미뤘다가 결정적 순간에 터뜨려라.' },
      { name: '고백과 응답(다단계)', desc: '고백→회피/거절→재고백→응답의 다단계 구조. 단발 이벤트로 끝내지 않는 것이 정석.', tip: '첫 고백은 일부러 어긋나게 — "왜 지금?", "거짓말", "받아줄 수 없어"로 한 번 튕긴 뒤 더 절실한 재고백을.' },
      { name: '질투 유발(jealousy plot)', desc: '연적·과거 연인·약혼자의 등장으로 주인공의 진심을 자각시키는 촉매.', tip: '"내 것이 아니었구나"를 깨닫는 순간 본심이 터진다. 질투를 폭력이 아닌 "자각의 거울"로 써라.' },
      { name: '접촉의 단계적 고조(touch escalation)', desc: '우연한 손 스침→의도적 접촉→포옹→키스→그 이상. 신체 거리의 점층이 감정 거리를 가시화.', tip: '단계를 건너뛰지 마라. 첫 손 스침의 전류 같은 감각을 정사보다 더 공들여 묘사하면 슬로우번이 산다.' },
      { name: '오해·소통 부재(misunderstanding)', desc: '갈등 엔진. 단, 한마디면 풀릴 오해(idiot plot)는 함정. 좋은 오해는 인물의 상처·세계관에서 필연.', tip: '"왜 말 안 해?"가 안 나오게 — 그 인물이라면 절대 못 묻는 이유(자존심·트라우마·신분)를 깔아라.' },
      { name: '운명의 짝·각인(mate bond)', desc: '패러노멀/로맨틱 판타지의 "거역할 수 없는 끌림". 종족 설정으로 인스타러브를 정당화.', tip: '운명을 거부하려는 발버둥과 거기에 굴복하는 과정이 드라마 — "원치 않는데 끌린다"의 모순을 활용.' },
      { name: '비밀·정체 숨기기', desc: '신분·과거·초자연 정체를 숨긴 채 가까워진다. 폭로의 순간이 Black Moment의 단골 트리거.', tip: '독자만 아는 비밀(극적 아이러니)을 깔면 매 장면에 "들킬까" 긴장이 깔린다.' },
      { name: '정보 비대칭(회귀물)', desc: '주인공만 결말을 안다. 능동적으로 운명을 바꾸려는 행동이 곧 로맨스의 추진력.', tip: '회귀 지식으로 남주를 일부러 피하려다 더 엮이는 아이러니가 로판의 단골 재미다.' },
      { name: '첫 "사랑해"(진심의 언어화)', desc: '감정의 명시적 선언. 미루고 미루다 터뜨릴수록 무게가 실린다.', tip: '말로 못 하다 행동/위기 상황에서 튀어나오게 하라. "죽지 마"가 사실상의 고백이 되는 식.' },
      { name: '키스 신·정사 신의 의미화', desc: '단순 스킨십이 아니라 관계의 전환점·항복·화해의 상징으로 배치.', tip: '"왜 지금 이 키스인가"를 정서적으로 정당화하라. 분노의 키스, 작별의 키스, 화해의 키스는 다 다르다.' },
      { name: '대비되는 커플(B커플·서브)', desc: '주연 관계를 비추는 거울로서의 조연 커플. 다른 속도·다른 트로프로 주제를 변주.', tip: 'B커플로 주커플이 못 가는 "빠른 결합"이나 "정반대 결말"을 보여 주제를 입체화하라.' },
    ],
  },
  {
    key: 'beat', label: '비트 시트·구조', icon: '📈', note: '장편 로맨스의 표준 흐름. 감정 곡선이 사건 곡선보다 우선한다는 원칙으로 배치한다.',
    items: [
      { name: '1. 도입·일상(Setup)', desc: '주인공의 결핍·상처·사랑에 대한 방어기제를 제시. "이 사람이 왜 사랑을 못 하는가"를 깔아둔다.', tip: '결핍이 곧 성장 곡선의 출발점. 결말의 "변화"가 여기서 약속된다.' },
      { name: '2. 첫 만남(Meet-Cute)', desc: '운명적·우스꽝스럽·적대적 첫 조우. 좋든 나쁘든 강렬한 첫인상.', tip: '첫 만남에서 두 사람의 "관계 트로프"를 한 장면으로 각인시켜라(적대인지 운명인지).' },
      { name: '3. 발단(Inciting Incident)', desc: '둘을 계속 엮는 사건. 계약·동거·같은 임무·빙의 후 첫 대면.', tip: '"이제 떨어질 수 없다"는 강제 장치를 걸어 둘이 부딪치는 무대를 만든다.' },
      { name: '4. 거부 단계(No Way)', desc: '"절대 안 될 사이"라는 명분과 끌림의 충돌. 밀당 시작.', tip: '끌림을 부정하는 합리화의 대사·독백을 쌓아라 — 부정이 강할수록 무너질 때 카타르시스.' },
      { name: '5. 점화·행복(Fun and Games)', desc: '함께하는 시간 누적, 케미 폭발, 접촉 고조, 첫 키스. 행복의 정점.', tip: '독자에게 "이대로 행복했으면"을 심어라 — 그래야 다음 추락이 아프다.' },
      { name: '6. 심화 + 외부 위협', desc: '비밀·연적·과거·신분 격차·정치적 압력이 수면 위로 올라온다.', tip: '행복의 절정 직후 그림자를 드리워라. 위협은 둘의 관계가 가장 단단해 보일 때 등장해야 효과적.' },
      { name: '7. 중간점 전환(Midpoint)', desc: '관계가 한 단계 깊어지거나(첫 동침·진심 자각) 결정적 정보가 폭로된다.', tip: '중간점은 "되돌아갈 수 없는 선"을 넘는 지점. 여기서 관계의 무게가 질적으로 달라진다.' },
      { name: '8. 파국(Black Moment)', desc: '오해·비밀·희생으로 관계 붕괴. 최저점. 장편은 8부 능선쯤에 배치.', tip: '둘 다 진심인데 헤어질 수밖에 없는 "구조적 비극"이 가장 강하다 — 단순 오해보다 가치관 충돌로.' },
      { name: '9. 영혼의 어두운 밤', desc: '떨어진 채 각자 진심을 깨닫는 성찰 구간. 결핍(1번)을 마주하고 변한다.', tip: '여기서 주인공이 "사랑을 위해 버려야 할 것"을 깨달아야 Grand Gesture의 동력이 생긴다.' },
      { name: '10. 재결합(Grand Gesture)', desc: '증명 행위→오해 해소→화해→결합. 상호성이 핵심.', tip: '한쪽만 달려오게 하지 마라. 양쪽이 각자 한 발씩 내디뎌 중간에서 만나야 만족도가 높다.' },
      { name: '11. 결말·HEA(Resolution)', desc: '결혼·미래 약속. 모든 떡밥과 정서를 봉인한다.', tip: '결핍이 어떻게 채워졌는지를 보여라 — "사랑을 못 하던 사람"이 사랑하는 모습으로 수미상관.' },
      { name: '12. 외전·후일담(웹소설 필수)', desc: '본편 이후의 일상·결혼·육아·남주 시점. 보너스 설렘으로 재독·충성도를 만든다.', tip: '본편에서 못 푼 갈증(남주 속마음·19금·일상 알콩달콩)을 외전에서 보상하라.' },
    ],
  },
  {
    key: 'pacing', label: '페이싱·연재', icon: '⏱️', note: '특히 웹소설 연재에서 연독률을 좌우하는 리듬 원칙들. 감정의 진자와 회차 설계.',
    items: [
      { name: '감정 곡선 우선 원칙', desc: '액션이 격해도 매 장면에 두 사람의 정서적 거리 변화가 새겨져야 한다.', tip: '"이 장면이 끝났을 때 둘 사이가 어떻게 달라졌나"를 항상 점검하라. 변화 없는 장면은 잘라라.' },
      { name: '상승-하강의 진자', desc: '설렘(상승) 뒤엔 반드시 작은 좌절(하강). 단조로운 행복도, 사이다 무한도 긴장을 죽인다.', tip: '심쿵 다음 화엔 작은 엇갈림을. "행복→불안→행복"의 파동이 연독을 만든다.' },
      { name: '클리프행어(회차 끝)', desc: '매 화 끝을 다음 화 궁금증으로 닫는다. 등장·고백 직전·반전·위기.', tip: '"다음 화 안 보면 못 견디는" 문장으로 끊어라. 사건 한복판이나 대사 직전이 명당.' },
      { name: '고구마와 사이다', desc: '답답함(고구마)과 통쾌함(사이다)의 배합. 고구마가 길면 이탈, 사이다만 있으면 긴장 소멸.', tip: '고구마는 짧고 명분 있게, 사이다는 쌓은 만큼 크게. "참은 만큼 갚는다"의 회계가 맞아야 한다.' },
      { name: '심쿵 포인트(설렘 적립)', desc: '회차마다 작은 설렘 한 방. 사소한 챙김·시선·스킨십.', tip: '큰 이벤트가 없는 화에도 "오늘의 심쿵" 하나는 박아라. 설렘의 규칙적 보상이 충성 독자를 만든다.' },
      { name: '분량별 점화 속도', desc: '단편/카테고리는 인스타러브·빠른 결합, 장편/대하는 슬로우번·다층 갈등.', tip: '연재 호흡에 맞춰 점화 속도를 정하라 — 100화 갈 작품에서 10화에 결혼하면 동력이 꺼진다.' },
      { name: '초반 트로프 명시(1~10화)', desc: '"이 작품의 맛(핵심 트로프)"을 도입부에 분명히 드러내 독자를 모은다.', tip: '제목·소개·1화가 같은 약속을 해야 한다. 빌드업한다고 핵심을 뒤로 미루면 초반 이탈.' },
      { name: '회차당 한 사건 원칙', desc: '한 회차에 핵심 사건 하나(+설렘 하나)로 집중. 정보 과부하를 피한다.', tip: '5,000자에 사건 셋을 욱여넣으면 흐려진다. 하나를 깊게, 끝에 떡밥 하나.' },
      { name: '떡밥의 회수 리듬', desc: '심은 복선(과거·비밀·예언)을 적절한 간격으로 회수해 신뢰를 쌓는다.', tip: '떡밥은 "심을 때 잊지 않게, 회수할 때 통쾌하게". 회수 없는 떡밥은 독자 신뢰를 깎는다.' },
      { name: '권태기 방지(중반 슬럼프)', desc: '관계가 안정되는 중반에 새 갈등(연적·비밀·외부 위협)을 투입해 텐션을 재점화.', tip: '"이미 사귀는데 뭘 더?"가 중반의 위기. 사귄 뒤에도 "잃을까 봐" 두려운 새 판돈을 걸어라.' },
    ],
  },
  {
    key: 'climax', label: '클라이맥스·고백', icon: '💍', note: '로맨스의 절정은 외부 사건 해결이 아니라 "관계의 최종 결정"이다. 형태와 변주.',
    items: [
      { name: '관계의 최종 선택 = 절정', desc: '악당을 처치해도 두 사람이 서로를 선택하지 않으면 클라이맥스가 아니다.', tip: '플롯의 정점과 관계의 정점을 같은 장면에 겹쳐라 — 위기 한복판에서 선택이 이뤄지게.' },
      { name: '공항 추격·결정적 만류', desc: '떠나려는 상대를 막는 현대물의 고전. 시간 제약(비행기·기차)이 긴박감을 만든다.', tip: '진부함을 피하려면 "왜 하필 지금 못 보내는가"의 절박한 이유를 새로 만들어라.' },
      { name: '공개 프러포즈·만인 앞 고백', desc: '체면·평판을 버리고 모두 앞에서 마음을 선언. 사적 감정의 공적 증명.', tip: '평소 사생활을 철저히 숨기던 인물일수록 효과가 폭발적이다.' },
      { name: '권력·지위·재산 포기', desc: '왕위·황위·정략혼·후계 자리를 사랑을 위해 내려놓는다. 히스토리컬/로판의 단골.', tip: '"가진 것이 많은 자가 다 버린다"의 무게. 포기의 대가를 구체적으로 보여줘야 진정성이 산다.' },
      { name: '후회남의 완전한 무릎 꿇기', desc: '가해자였던 쪽이 속죄하고 매달린다. 권력 역전의 카타르시스(후회물 절정).', tip: '용서는 쉽게 주지 마라 — "이미 늦었다"의 통쾌함과 그럼에도 흔들리는 마음의 줄다리기가 백미.' },
      { name: '황제·권력자가 권력으로 지킴', desc: '로판에서 남주가 가진 권력을 총동원해 여주를 위협에서 구한다.', tip: '권력의 "비용"을 치르게 하라 — 정적과의 정면충돌, 정치적 파국을 감수해야 사랑의 무게가 산다.' },
      { name: '오해의 해소·진실 폭로', desc: 'Black Moment를 만든 비밀/오해가 풀리며 장벽이 제거된다.', tip: '진실은 "우연히"가 아니라 한쪽의 능동적 행동으로 밝혀져야 캐릭터가 산다.' },
      { name: '희생의 철회·맞교환', desc: '"널 위해 떠난다"던 자기희생이 "함께 싸우자"로 바뀐다.', tip: '일방적 희생은 로맨스에선 미완성 — "혼자 짊어지지 마"가 더 큰 사랑임을 클라이맥스에서 증명하라.' },
      { name: '상호 항복(둘 다 내려놓기)', desc: '한쪽의 일방적 굴복이 아니라 양쪽이 각자의 벽(자존심·두려움·과거)을 부순다.', tip: '"나도 잘못했어"가 양쪽에서 나와야 대등한 사랑이 된다. 만족도의 핵심은 상호성.' },
      { name: '첫 "사랑해"의 절정 배치', desc: '미뤄온 진심의 언어화를 클라이맥스의 정점에 둔다.', tip: '말로 못 하던 인물이 끝내 말하는 순간을 절정에 — 그 전까지는 행동으로만 사랑하게 하라.' },
    ],
  },
  {
    key: 'character', label: '캐릭터 유형', icon: '🧑‍🤝‍🧑', note: '로맨스 독자가 기대하는 인물 원형. 그대로 쓰기보다 결함·이면을 더해 입체화하는 출발점.',
    items: [
      { name: '알파 남주(다아시형)', desc: '오만·유능·지배적이지만 그녀에게만 약해지는 남자. 거의 모든 현대 알파남주의 조상이 다아시.', tip: '오만함의 "근거"(상처·책임감)를 깔고, 그녀 앞에서 무너지는 순간을 아껴 써라.' },
      { name: '차가운데 나에게만 다정', desc: '세상엔 얼음, 그녀에게만 온기. 로판·현대물의 최강 인기 유형.', tip: '"남에겐 어떻게 하는지"를 먼저 보여줘야 "나에게만"의 특별함이 산다.' },
      { name: '상처 입은 남주(tortured hero)', desc: '과거의 트라우마·죄책감을 품은 어두운 남자. 로체스터(『제인 에어』)의 계보.', tip: '상처가 사랑을 거부하는 방어기제로 작동하게. 치유가 곧 로맨스의 성장 곡선.' },
      { name: '집착·소유형(얀데레)', desc: '독점욕이 강한 남주. 매력과 위험의 경계에 선다.', tip: '"그녀의 의사·안전"을 침해하지 않는 선에서만 매력. 통제·폭력으로 넘으면 호러가 된다.' },
      { name: '능글·바람둥이(겉바속촉)', desc: '가벼워 보이지만 한 사람에게 진심. 농담 뒤에 진심을 숨긴다.', tip: '진심이 새어 나오는 "정색하는 한순간"을 명장면으로 만들어라.' },
      { name: '순정·해바라기 남주', desc: '한결같이 한 사람만 바라본다. 짝사랑·기다림의 정서.', tip: '"왜 그렇게까지"가 설득되는 결정적 과거 한 장면을 깔아라 — 맹목은 설명이 필요하다.' },
      { name: '연하·강아지상 남주', desc: '솔직하고 직진하는 어린 남자. 연상녀물·힐링물의 인기 유형.', tip: '"순수한 직진"과 "의외의 남자다움"의 갭이 매력. 어리지만 결정적 순간엔 듬직하게.' },
      { name: '주체적 여주(현대 표준)', desc: '구원을 기다리지 않고 자기 삶·목표를 가진 여주. 수동적 신데렐라의 현대적 갱신.', tip: '"남주가 없어도 살아갈 사람"이 사랑을 선택할 때 관계가 대등해진다. 직업·야망·신념을 줘라.' },
      { name: '빙의 악역영애', desc: '원작의 파멸을 아는 채로 살아남으려는 여주. 원작 지식이 능동성의 무기.', tip: '"원작과 다른 선택"의 누적이 캐릭터를 만든다. 죽음 회피→예상 밖 호감→로맨스 순.' },
      { name: '철벽·무뚝뚝 여주', desc: '감정 표현이 서툴거나 사랑을 경계하는 여주. 남주의 직진과 대비된다.', tip: '철벽의 균열을 아주 천천히 — 무심한 척 챙기는 사소한 행동으로 마음을 흘려라.' },
      { name: '연적·라이벌', desc: '삼각관계의 한 축, 혹은 질투 유발 장치. 진심을 자각시키는 촉매.', tip: '매력 없는 연적은 긴장을 못 만든다 — "저 사람도 괜찮은데" 싶어야 선택의 무게가 산다.' },
      { name: '서브 남주(만년 2번)', desc: '여주를 사랑하지만 이뤄지지 않는 헌신적 조연. 팬덤의 애정과 안타까움을 받는다.', tip: '서브남에게 독립적 매력과 존엄을 줘라 — 들러리로 소모하면 그의 팬이 등을 돌린다.' },
      { name: '조력자·절친', desc: '주인공의 속마음을 끌어내는 거울. 객관적 조언과 코믹 릴리프.', tip: '주인공이 혼자 못 깨닫는 진심을 대신 짚어주는 역할 — "너 걔 좋아하잖아"를 대신 말한다.' },
      { name: '방해꾼·시어머니·약혼자', desc: '관계를 가로막는 외부 압력. 신분·집안·정략혼의 의인화.', tip: '단순 악역보다 "그 나름의 논리"가 있으면 갈등이 입체적. 사회 규범 자체를 의인화하라.' },
    ],
  },
  {
    key: 'cliche', label: '클리셰(변주)', icon: '🔄', note: '닳도록 쓰인 장면·설정. 알고 비틀어야 차별화된다. 각 항목에 전복 포인트를 함께 적었다.',
    items: [
      { name: '우연히 넘어져 안기기', desc: '발을 헛디뎌 남주 품에 안기는 첫 스킨십.', tip: '전복: 여주가 일부러 안 넘어지려 버티거나, 오히려 남주가 넘어지게 만들어 역할을 뒤집어라.' },
      { name: '술 취해 본심 토로·다음날 기억 상실', desc: '취중진담 후 "기억 안 나"로 시치미.', tip: '전복: 사실 또렷이 기억하면서 모른 척하는 쪽을 독자만 알게 해 극적 아이러니로.' },
      { name: '비 맞고 우산 씌워주기', desc: '비 오는 날 말없이 우산을 기울여 준다.', tip: '전복: 우산을 줬는데 정작 본인은 다른 이유로 비를 맞고 있었다는 사연을 붙여라.' },
      { name: '벽치기(쿵)·손목 잡아끌기', desc: '벽에 몰아세우거나 손목을 낚아채는 강압적 스킨십.', tip: '전복: 강압의 순간 상대가 더 침착하게 받아쳐 권력 구도를 역전시켜라. 동의 없는 강압은 시대상 주의.' },
      { name: '계약서에 "연애 금지" 조항', desc: '계약 관계에서 감정 금지를 못 박지만 결국 어긴다.', tip: '전복: 조항을 어긴 쪽이 의외로 냉정한 쪽이게 — 가장 "프로"라던 사람이 먼저 무너진다.' },
      { name: '재벌 2세·실장님', desc: '비밀스러운 부자 남주의 정체 폭로.', tip: '전복: 부의 출처가 떳떳지 않거나, 재벌이 짐이 되는 인물로. "가진 것"을 갈등으로 전환.' },
      { name: '오해로 인한 따귀·이별 선언', desc: '결정적 오해로 관계가 폭발하는 Black Moment.', tip: '전복: 오해가 "한마디면 풀릴 것"이 아니라 가치관 충돌에서 비롯되게 해 깊이를 더하라.' },
      { name: '아픈 여주를 밤새 간호', desc: '열나는 여주를 남주가 헌신적으로 돌본다.', tip: '전복: 간호받는 쪽이 부담스러워하거나, 간호하는 행위 자체가 남주에겐 큰 결단이게 만들어라.' },
      { name: '"너 따위" 츤데레 대사', desc: '걱정하면서 퉁명스럽게 내뱉는 부정형 애정 표현.', tip: '전복: 츤데레를 자각하고 스스로 부끄러워하게 — 메타적 자의식으로 진부함을 갱신.' },
      { name: '운명적 첫눈에 반함', desc: '눈이 마주친 순간 세상이 멈춘다.', tip: '전복: 첫눈에 반한 줄 알았는데 사람을 착각했거나, 운명이라 믿었다가 깨지는 반전으로.' },
      { name: '약혼자 있는데 다른 사람과 사랑', desc: '정략혼 상대 외의 진짜 사랑.', tip: '전복: 정략 상대가 의외로 좋은 사람이라 죄책감이 생기게 — 단순 악역으로 비우지 마라.' },
      { name: '기억상실로 처음부터 다시', desc: '사고로 기억을 잃고 관계를 재구축.', tip: '전복: 기억을 잃은 쪽이 "예전의 나"와 전혀 다른 사람이 되어 다시 사랑할지 묻게 하라.' },
      { name: '신데렐라(평범녀의 신분 상승)', desc: '평범한 여주가 부·지위를 가진 남주로 인생 역전.', tip: '전복: 여주가 신분 상승을 거부하거나, 자기 힘으로 올라서고 남주는 동반자가 되게 하라.' },
      { name: '남주의 전 연인 등장', desc: '과거 연인이 나타나 질투·불안을 유발.', tip: '전복: 전 연인이 적이 아니라 조력자거나, 헤어진 데 둘 다 책임이 있었음을 드러내라.' },
      { name: '비밀을 들킨 직후 폭우 속 고백', desc: '정체 폭로 → 빗속 절규 고백 콤보.', tip: '전복: 날씨·배경의 클리셰를 의도적으로 비워라 — 평범한 대낮·일상 공간의 고백이 오히려 신선하다.' },
    ],
  },
  {
    key: 'setting', label: '무대·장면', icon: '🏙️', note: '로맨스의 감정이 피어나는 무대와 명장면 공간. 트로프와 결합해 쓰는 배경 카드.',
    items: [
      { name: '무도회·연회(히스토리컬/로판)', desc: '사교계 데뷔·첫 춤·소문이 오가는 공적 무대. 평판과 결혼시장의 압력이 작동.', tip: '"첫 왈츠" 장면은 접촉 고조와 공개 시선이 겹치는 명당 — 모두가 보는데 둘만의 대화를 끼워라.' },
      { name: '좁은 공간(엘리베이터·마차·옷장)', desc: '강제 밀착을 만드는 폐쇄 공간. 호흡·체온·거리가 의식된다.', tip: '물리적 거리를 0으로 만든 뒤 정전·고장으로 시간을 늘려 텐션을 끝까지 끌어라.' },
      { name: '비 오는 날·우산', desc: '감정이 고조되는 단골 날씨. 정화·슬픔·고백의 무대.', tip: '비는 너무 닳았다 — 쓰려면 "왜 굳이 이 비인가"의 사연(추억·약속)을 붙여 의미화하라.' },
      { name: '서재·집무실(권력자 공간)', desc: '남주의 영역에 여주가 들어서는 긴장. 권력차가 공간으로 가시화된다.', tip: '그의 공간에서 그가 흐트러지는 순간이 백미 — 통제의 영역에서 통제를 잃게 하라.' },
      { name: '주방·식탁(힐링·일상)', desc: '함께 요리하고 먹는 일상의 친밀함. 육아·힐링물의 핵심 무대.', tip: '"같이 밥 먹는 사이"의 무게를 그려라 — 사소한 식사 장면이 가족이 되어가는 과정.' },
      { name: '병실·간호(취약함의 노출)', desc: '아픈 순간의 돌봄. 방어기제가 무너지고 본심이 드러난다.', tip: '간호하는 쪽의 "안 자고 지킨 흔적"을 디테일로 — 말 못 한 마음이 행동에 남는다.' },
      { name: '한밤의 정원·발코니', desc: '연회를 빠져나온 둘만의 은밀한 대화 공간. 달빛·고요가 고백을 부른다.', tip: '소란(연회)에서 정적(정원)으로 이동하는 대비가 친밀감의 전환을 만든다.' },
      { name: '여행·출장(일상 탈출)', desc: '낯선 곳에서 둘만의 시간. 일상 규칙이 느슨해지며 관계가 진전된다.', tip: '"여기선 평소의 우리가 아니어도 돼"라는 해방감이 선을 넘게 만든다 — one bed 트로프의 단골.' },
      { name: '옥상·계단참(학원물)', desc: '아무도 없는 학교의 틈새 공간. 풋풋한 고백과 비밀의 무대.', tip: '"종 치기 전 5분" 같은 시간 제약을 걸면 풋사랑의 조급함이 산다.' },
      { name: '눈 내리는 날·첫눈', desc: '시간이 멈춘 듯한 정적과 순수. 약속·재회의 상징.', tip: '"첫눈 오는 날 만나자"는 약속을 깔고 그 날을 클라이맥스로 — 날씨를 플롯 장치로 써라.' },
      { name: '재회의 공간(같은 장소, 다른 시간)', desc: '헤어졌던 곳에서 다시 만남. 회귀·후회물의 정서적 정점.', tip: '"처음 만난 그 자리"를 결말에 다시 쓰면 수미상관의 여운이 깊다.' },
      { name: '결혼식·약혼식(공적 선언)', desc: '관계가 공식화되거나, 막판에 뒤집히는 극적 무대.', tip: '"신부 입장" 직전의 탈주, 혼인 서약 중의 진실 폭로 등 공적 의례를 반전의 무대로.' },
    ],
  },
  {
    key: 'lore', label: '고증·세계관', icon: '📜', note: '시대극·로판·현대물의 핍진성을 받치는 배경 지식. 사실에 한 스푼의 환상을 더하는 출발점.',
    items: [
      { name: '리젠시 사교계(season)', desc: '봄~여름 런던 사교철에 미혼 남녀가 결혼 상대를 찾던 시기. 무도회·티파티·산책이 만남의 장.', tip: '사교철 자체가 시한(deadline) — "이번 시즌에 짝을 못 찾으면" 압박이 곧 플롯 엔진.' },
      { name: '데뷔탕트·후견인', desc: '사교계에 처음 나서는 미혼 여성(데뷔탕트)과 그녀를 후견하는 기혼 여성. 평판이 결혼을 좌우.', tip: '후견인의 시선·잔소리를 감시 장치로 — 둘이 단둘이 못 있게 막는 사회적 벽.' },
      { name: '신분·작위 체계(공작~남작)', desc: '공작·후작·백작·자작·남작의 위계. 작위가 결혼·상속·호칭을 규율한다.', tip: '로판에선 작위가 권력·정략혼의 단위. 신분 격차의 "정확한 거리"를 작위로 수치화하라.' },
      { name: '정략혼·약혼 파기', desc: '집안의 이해로 맺어지는 혼인. 파혼은 여성 평판에 치명적이었다.', tip: '"파혼당한 여주"의 사회적 추락을 출발점으로 삼으면 회복 서사의 카타르시스가 크다.' },
      { name: '평판·스캔들·소문', desc: '특히 여성에게 가혹했던 정조·체면의 규범. 단둘이 있는 것만으로도 추문.', tip: '소문은 보이지 않는 적 — "들키면 끝"이라는 사회적 긴장이 강제 결혼·위장 연애의 명분이 된다.' },
      { name: '편지·전언·하인 네트워크', desc: '직접 만나기 어려운 시대의 소통 수단. 편지의 오배달·가로채기가 오해를 만든다.', tip: '편지를 "정보 비대칭" 장치로 — 한 통의 편지가 안 닿아 벌어지는 비극은 시대극의 단골.' },
      { name: '현대 직업 핍진성', desc: '의사·변호사·기획자·셰프 등 직업 디테일이 현대 로맨스의 몰입을 만든다.', tip: '직업의 "진짜 같은 한 장면"(야근·실수·성취)을 넣어라 — 직업이 배경이 아니라 캐릭터가 되게.' },
      { name: '재벌·기업 권력 구조', desc: '후계 다툼·이사회·혼맥. 현대판 "왕가"로서의 재벌가.', tip: '재벌 설정을 정략혼·후계 갈등의 현대적 번안으로 — 히스토리컬의 작위를 지분·후계로 치환.' },
      { name: '연애 금기(직장 내·사제·주종)', desc: '사회적·직업적 규범이 만드는 금지된 사랑의 장벽.', tip: '"넘으면 안 될 선"이 명확할수록 넘는 순간이 짜릿하다. 단, 권력차와 동의의 윤리에 유의.' },
      { name: '결혼·약혼 풍습(동서)', desc: '약혼반지·결혼 서약·예단·상견례 등 의례. 관계의 단계를 가시화한다.', tip: '문화별 의례를 관계의 마일스톤으로 — 반지·서약 같은 사물에 둘만의 의미를 부여하라.' },
      { name: '신데렐라·미녀와 야수 원형', desc: '신분 상승·구원·내면 변화 등 로맨스의 뿌리가 된 설화 구조.', tip: '원형을 알고 비틀어라 — "구원받는 여주"를 "서로를 구원하는 둘"로 갱신하면 현대성이 산다.' },
      { name: '동양 배경(궁중·후궁·정략)', desc: '동양풍 궁중 로맨스의 후궁 암투·간택·정략. 로판의 또 다른 갈래.', tip: '간택·승은·중전 자리 다툼 등 동양 궁중의 규칙을 정략·신분 갈등의 무대로 활용하라.' },
    ],
  },
]

// 관련 도구(연계) — 로맨스 인물·관계·장면·정서 설계 도구로 잇는다(존재하는 도구 위주).
const RELATED: { id: string; label: string }[] = [
  { id: 'character-forge', label: '🧬 캐릭터 생성기' },
  { id: 'relationship-map', label: '🕸️ 관계도' },
  { id: 'emotion-arc', label: '📈 감정 곡선' },
  { id: 'scene-forge', label: '🎬 장면 대장간' },
  { id: 'conflict-builder', label: '⚔️ 갈등 설계기' },
  { id: 'plot-twist-deck', label: '🃏 반전 덱' },
  { id: 'name-mixer', label: '🔤 이름 믹서' },
  { id: 'sensory-palette', label: '🎨 감각 팔레트' },
]

const LS = 'sry:tool:romance-knowledge:'
const ALL_KEY = '__all__'
const flatAll = (): { cat: CatDef; item: Entry }[] =>
  CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (str: string) =>
  String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function RomanceKnowledge({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 활용: 다른 장르 컨텍스트로 열려도 로맨스 사전임을 안내(이 도구는 로맨스 전용).
  const ctxGenre = typeof payload?.genre === 'string' ? (payload.genre as string) : undefined

  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 펼친 항목 키 집합 ("catKey::name")
  const [open, setOpen] = useState<Record<string, boolean>>({})
  // 즐겨찾기 ("catKey::name")
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<{ cat: CatDef; item: Entry } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])
  // 언마운트 정리: 토스트/복사표시 상태 리셋
  useEffect(() => () => { setToast(null); setCopiedKey(null) }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  const key = (catKey: string, name: string) => `${catKey}::${name}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[key(c.key, item.name)])
    if (q) base = base.filter(({ cat: c, item }) =>
      item.name.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q) ||
      (item.tip || '').toLowerCase().includes(q) ||
      c.label.toLowerCase().includes(q))
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    const pool = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.name === prev.item.name && pick.cat.key === prev.cat.key)
        pick = pool[Math.floor(Math.random() * pool.length)]
      // 무작위로 뽑은 항목은 펼쳐 둔다
      setOpen((o) => ({ ...o, [key(pick.cat.key, pick.item.name)]: true }))
      return pick
    })
  }, [cat])

  const toggleOpen = (catKey: string, name: string) => {
    const k = key(catKey, name)
    setOpen((o) => ({ ...o, [k]: !o[k] }))
  }
  const toggleFav = (catKey: string, name: string) => {
    const k = key(catKey, name)
    setFavs((p) => { const n = { ...p }; if (n[k]) delete n[k]; else n[k] = true; return n })
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* graceful */ })
  }
  const itemText = (c: CatDef, item: Entry) =>
    `${c.icon} ${c.label} · ${item.name}\n${item.desc}` + (item.tip ? `\n[활용] ${item.tip}` : '')

  // 연계: 현재 항목을 글감 스니펫으로 공유 라이브러리에 저장(다른 도구에서 재사용).
  const saveSnippet = (c: CatDef, item: Entry) => {
    addToLibrary('snippets', {
      text: itemText(c, item),
      source: '로맨스 지식 사전 · ' + c.label,
      tags: ['로맨스', c.label],
    })
    setToast(`스니펫 라이브러리에 ‘${item.name}’을(를) 저장했습니다.`)
    window.setTimeout(() => setToast((t) => (t && t.includes(item.name) ? null : t)), 2200)
  }

  // 연계: 현재(무작위 또는 펼친) 항목을 프로젝트 자료 〈로맨스 지식〉 폴더에 메모로 추가.
  const addItemToProject = (c: CatDef, item: Entry) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(c.icon + ' ' + c.label)} · ${escapeHtml(item.name)}</b></p>`,
      `<p>${escapeHtml(item.desc)}</p>`,
      item.tip ? `<p><b>💡 활용</b><br>${escapeHtml(item.tip)}</p>` : '',
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '로맨스 지식',
      title: `${item.name} (${c.label})`, bodyHtml,
      meta: { 장르: '로맨스', 분류: c.label },
    })
    if (id) {
      setToast(`프로젝트 자료 〈로맨스 지식〉에 ‘${item.name}’을(를) 추가했습니다.`)
      window.setTimeout(() => setToast((t) => (t && t.includes(item.name) ? null : t)), 2200)
    }
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px' }

  const curCatNote = cat !== ALL_KEY ? CATS.find((c) => c.key === cat)?.note : undefined

  return (
    <div style={wrap}>
      <div style={hint}>
        로맨스 장르에서 자주 쓰는 트로프·서사 장치·관습·고증 지식 <b>{total}개</b>를 <b>{CATS.length}개</b> 카테고리로 모았습니다.
        검색·펼침·무작위로 찾고, 마음에 드는 항목을 장면에 심어 보세요.
        {ctxGenre && ctxGenre !== '로맨스' && (
          <span style={{ color: 'var(--accent)' }}> (현재 ‘{ctxGenre}’ 컨텍스트 — 이 사전은 로맨스 전용입니다)</span>
        )}
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름·설명·활용으로 검색 (예: 계약결혼, 밀당, 후회, 회귀, 고백)"
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
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 소재</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {curCatNote && (
        <div style={{ ...hint, fontStyle: 'italic', borderLeft: '3px solid var(--accent)', paddingLeft: 8 }}>{curCatNote}</div>
      )}

      {/* 무작위 결과 강조 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{random.item.name}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0' }}>{random.item.desc}</div>
          {random.item.tip && (
            <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--accent)' }}><Emoji e="💡" /> {random.item.tip}</div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(itemText(random.cat, random.item), 'rnd')}>
              {copiedKey === 'rnd' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
            </button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>
              {favs[key(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
            <button className="minibtn" onClick={() => saveSnippet(random.cat, random.item)} title="이 항목을 글감 스니펫으로 저장"><Emoji e="💾" /> 글감 저장</button>
          </div>
          {/* 연계: 프로젝트에 추가 */}
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => addItemToProject(random.cat, random.item)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 소재를 프로젝트 자료 〈로맨스 지식〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
          </div>
        </div>
      )}

      {/* 추가 성공 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록 (펼침형) */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 소재가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const k = key(c.key, item.name)
            const isOpen = !!open[k]
            const isFav = !!favs[k]
            const copyId = 'it:' + k
            return (
              <div key={k} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => toggleOpen(c.key, item.name)}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /> {c.label}</span>
                  <span style={{ fontSize: 14.5, fontWeight: 700 }}>{item.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{isOpen ? '▲ 접기' : '▼ 펼치기'}</span>
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                    onClick={(e) => { e.stopPropagation(); toggleFav(c.key, item.name) }}
                    style={{ flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                {!isOpen && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 4, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.desc}</div>
                )}
                {isOpen && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 13, lineHeight: 1.55 }}>{item.desc}</div>
                    {item.tip && (
                      <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 5, color: 'var(--accent)' }}><Emoji e="💡" /> {item.tip}</div>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      <button className="minibtn" onClick={() => copy(itemText(c, item), copyId)}>
                        {copiedKey === copyId ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
                      </button>
                      <button className="minibtn" onClick={() => setRandom({ cat: c, item })} title="이 소재를 강조 보기"><Emoji e="🔎" /> 강조 보기</button>
                      <button className="minibtn" onClick={() => saveSnippet(c, item)} title="이 항목을 글감 스니펫으로 저장"><Emoji e="💾" /> 글감 저장</button>
                      <button className="linkbtn" onClick={() => addItemToProject(c, item)} disabled={!hasProjectBridge()}
                        title={hasProjectBridge() ? '이 소재를 프로젝트 자료 〈로맨스 지식〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
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

      {/* 관련 도구 연계 */}
      <div className="linkbar">
        <span className="linkbar-label">관련 도구:</span>
        {RELATED.map((r) => (
          <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: '로맨스' })} title={`${r.label} 열기`}>
            {emojify(r.label)}
          </button>
        ))}
      </div>

      <div style={hint}>지식은 정답이 아니라 출발점입니다. 트로프는 알고 비틀고, 클리셰는 전복 포인트로 갱신해 인물·장면에 슬쩍 심어 보세요.</div>
    </div>
  )
}
