// 로맨스판타지(로판) 장르 지식·소재 사전 — 하위장르·서사장치(회빙환)·신분/호칭·세계관 시스템·관용 표현/밈·클리셰(변주)·감정 묘사 톤·페이싱/사이다·클라이맥스 관습·공간·대표작 계보·함정 체크리스트.
// 자급식: 외부 네트워크·라이브러리 없음. react + './linkbus' 만 사용. localStorage 로 펼침/즐겨찾기/마지막 카테고리·탭 영속. 도시에(로판 도시에) 근거 자작 데이터.
import { useState, useEffect, useMemo, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = { id: 'romfan-knowledge', name: '로판 지식 사전', icon: '👑', group: '지식 사전', genre: '로맨스판타지', intro: '로맨스판타지에서 자주 쓰는 소재·설정·고증을 카테고리로 찾고, 소재를 무작위로 조합해 장면에 심으세요', w: 660, h: 660 }

interface Entry { name: string; desc: string; tip?: string }
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ─────────────────────────────────────────────────────────────────────────────
// 로판 도시에 기반 자작 지식 사전 — 14개 카테고리, 합계 300+ 항목.
// ─────────────────────────────────────────────────────────────────────────────
const CATS: CatDef[] = [
  {
    key: 'subgenre', label: '하위 분류(○○물)', icon: '🏷️', note: '저자들은 작품을 "○○물"로 호명한다. 어느 갈래인지부터 정하면 독자 기대와 관습이 명확해진다.',
    items: [
      { name: '회귀물', desc: '죽거나 파멸한 시점에서 과거로 돌아온다. 미래 정보의 비대칭이 무기. 『재혼 황후』가 정점.', tip: '"이번 생엔 다르게 산다"는 목표 선언을 1~3화에. 회귀 전 트라우마가 현재 판단을 지배하게 하면 입체감이 산다.' },
      { name: '악역영애 빙의물', desc: '내가 읽던 소설/게임 속 처형·추방당할 악역으로 빙의. 원작 지식이 무기이자 족쇄. 『はめふら』 계보의 한국적 변주.', tip: '"원작대로면 나는 죽는다" → 호감도·평판·관계를 재설계하는 파멸 플래그 회피가 핵심 엔진.' },
      { name: '엑스트라·조연 빙의물', desc: '주인공이 아니라 이름 없는 단역/조연으로 빙의. 원작 주연과 거리 두며 생존·자유를 노린다.', tip: '"주인공 곁을 비켜 살려다 오히려 남주에게 걸린다"는 역설을 활용. 원작 강제력에 끌려가는 긴장.' },
      { name: '환생물', desc: '아예 다른 생으로 다시 태어남. 전생 기억·지식을 품고 새 삶을 산다. 육아물과 결합 빈번.', tip: '갓난아기·유아 시점의 전생 어른이라는 간극(혀 짧은 말투 vs 노련한 속내)이 독특한 코미디·심쿵을 만든다.' },
      { name: '육아물(딸바보·아빠물)', desc: '어린 여주 + 어른 보호자들의 보호·함락 구도. 『외동딸로 다시 태어났습니다』 류.', tip: '냉혹한 권력자가 아이 하나에 무너지는 낙차가 사이다. "아빠… 시쪄" 같은 함락 트리거를 절제해서 배치.' },
      { name: '계약결혼물', desc: '처음엔 이해관계로 맺은 계약 → 점차 진심으로 이행. "처음엔 계약, 나중엔 진심" 공식.', tip: '계약 조항(기한·거리·이혼 조건)을 명문화해 두고, 그 조항이 하나씩 무너지는 과정을 설렘 게이지로 써라.' },
      { name: '정략결혼물', desc: '가문·정치 논리로 강제된 혼인. 신분·이해의 벽이 고구마의 원천이자 사이다의 무대.', tip: '둘 다 원치 않던 결합에서 시작해, 정치적 동맹이 정서적 동맹으로 바뀌는 전환점을 분명히.' },
      { name: '황궁·제국물', desc: '가상 제국/왕국의 황궁·사교계·작위 정치. 로판의 기본값 무대.', tip: '작위 체계와 가문 관계도를 먼저 짜 두면 음모·연회·서열 다툼이 자동으로 굴러간다.' },
      { name: '동양풍(후궁·세가물)', desc: '후궁 암투·황실·무가(武家) 세가를 무대로. 무협 요소 결합.', tip: '품계(귀비·소의 등)와 총애의 경제학을 갈등 엔진으로. 독·자수·다과·서신이 무기가 된다.' },
      { name: '소설·게임 속 세계물', desc: '여주가 원작을 아는 메타 세계. 호감도 게이지·엔딩 분기·상태창이 세계 법칙.', tip: '"원작 지식 vs 원작 강제력"의 줄다리기가 핵심. 알던 전개가 어긋나기 시작하는 순간이 최고의 후킹.' },
      { name: '성좌·신물(神物)물', desc: '신·성좌·신전이 여주를 점지하거나 권능을 부여. 신탁·예언이 특별함을 공인.', tip: '"예언 속 그 아이"를 남발하면 식상. 권능에는 반드시 대가·제약을 붙여 긴장을 유지.' },
      { name: '다크로판·집착물', desc: '집착광공·감금·정념의 어두운 색채. 『상수리나무 아래』 분위기. 강한 사전 태그 필요.', tip: '집착은 일관성이 생명. "오직 너에게만"이 흔들리면 독자 신뢰가 무너진다. 폭력·감금은 정념의 은유로 통제.' },
      { name: '힐링로판', desc: '큰 음모보다 일상·치유·잔잔한 행복에 집중. 저자극 독자층 공략.', tip: '갈등은 작게, 보상은 자주. 디저트·정원·티타임 같은 안온한 디테일을 전면에.' },
      { name: '여주 경영·전생지식물', desc: '전생 지식으로 영지 개발·상단·요리·향수·미용 사업을 일군다. 최근 강세.', tip: '"전생의 레시피/지식"이 이 세계에선 혁신이 되는 낙차가 사이다. 사업 성공을 신분 상승·복수와 연동.' },
    ],
  },
  {
    key: 'device', label: '서사 장치(회빙환·메타)', icon: '🌀', note: '로판을 굴리는 핵심 엔진들. 정보의 비대칭과 운명의 줄다리기로 긴장을 만든다.',
    items: [
      { name: '회귀(回歸)', desc: '죽거나 파멸한 시점에서 과거로 회귀. 여주만 아는 미래로 복수·예방·선점.', tip: '회귀 직후 "달라진 첫 선택" 한 가지를 강하게 보여 줘 미래가 흔들리기 시작했음을 알려라.' },
      { name: '빙의(憑依)', desc: '현대인(또는 타인)이 소설·게임 속 인물 몸에 들어감. 원작 지식이 무기이자 족쇄.', tip: '빙의 자각 장면에서 "내가 아는 그 장면이 눈앞에"라는 메타 인식을 활용해 독자와 공모하라.' },
      { name: '환생(還生)', desc: '전생의 죽음 뒤 다른 생으로 다시 태어남. 전생 기억·인격을 유지.', tip: '전생과 현생의 관계(원수가 가족이 됨 등)를 비틀면 즉각적인 드라마가 생긴다.' },
      { name: '원작 강제력 / 정해진 결말', desc: '"원작대로면 나는 죽는다." 운명을 비트는 시도에 세계가 저항. 강력한 긴장 엔진.', tip: '강제력을 "사건의 결과는 같되 과정/원인이 바뀐다"는 식으로 설계하면 회피와 충돌을 오래 끌 수 있다.' },
      { name: '파멸 플래그 회피', desc: '자신이 처형·추방당할 악역임을 알고 호감도·평판·관계를 미리 재설계.', tip: '플래그를 하나 꺾을 때마다 새로운 플래그가 돋는 구조로 중반 긴장을 유지.' },
      { name: '미래 정보의 비대칭', desc: '여주만 아는 미래(사건·인물의 본색·재난). 선점·예방·역공의 근거.', tip: '정보 우위를 "남들 눈엔 비범한 예지력"으로 비쳐 평판·권력을 얻는 데 써라.' },
      { name: '스테이터스 창·호감도 게이지', desc: '게임 UI식 상태창·호감도 수치·퀘스트가 세계 법칙으로 작동.', tip: '"호감도가… 왜 오르는 거지?"식 자각 코미디. 수치가 거짓말을 하거나 오작동하면 반전 장치가 된다.' },
      { name: '신탁·예언·꿈', desc: '신전·예언서·예지몽이 여주의 특별함을 외부 권위로 공인.', tip: '예언은 중의적으로 써라. 결말에서 "그 예언이 사실 이런 뜻이었다"는 재해석이 카타르시스를 준다.' },
      { name: '이중 시점(남주 독백 삽입)', desc: '여주 시점으로 가다 결정적 순간 남주 독백을 끼워 "그가 얼마나 빠졌는지"를 폭로.', tip: '여주는 "그가 날 싫어한다"고 믿는 장면 바로 뒤에 남주 독백을 붙여 아이러니의 낙차를 극대화.' },
      { name: '오해와 정보 격차', desc: '독자만 진실(그가 사실은 사랑함)을 알고 여주는 모른다. 극적 아이러니.', tip: '오해는 "작은 오해를 빨리 풀고, 큰 오해는 클라이맥스용으로 아껴라". 질질 끌면 고구마.' },
      { name: '회귀 트라우마(PTSD)', desc: '전생의 죽음·배신 기억이 현재의 불신·과민 반응으로 발현.', tip: '특정 인물·장소·말에 대한 반사적 공포를 심어 두면 회복 서사가 곧 로맨스의 진전이 된다.' },
      { name: '버려진 출신 → 숨겨진 고귀함', desc: '천대받던 서출·고아가 사실 황녀·신의 자손·고대 혈통.', tip: '복선(징표·꿈·반응)을 깔아 두고, 발각 장면을 공개 망신 역전과 겹쳐 사이다를 두 배로.' },
      { name: '계약 관계의 점진적 균열', desc: '계약 결혼·계약 연인·주종 계약이 거리감에서 진심으로 이행.', tip: '"이건 계약일 뿐"이라는 자기 최면이 깨지는 순간(질투·걱정의 발현)을 설렘 포인트로.' },
      { name: '엔딩 분기 인식', desc: '여주가 "해피/배드/노멀 엔딩"을 알고 분기를 의식적으로 고른다.', tip: '원하던 분기로 가는 줄 알았는데 변수(남주의 자유의지)로 미지의 루트가 열리게 하면 신선하다.' },
    ],
  },
  {
    key: 'rank', label: '신분·호칭·세계 용어', icon: '👑', note: '서양 제국풍 기본값 + 동양풍 변주. 작위·관직·호칭은 갈등의 무대이자 사이다의 단위.',
    items: [
      { name: '황제 / 황후 / 황태자 / 황녀', desc: '제국 최상위. 황궁·만조백관·즉위·책봉이 권력 서사의 정점.', tip: '"만조백관 앞에서 황후로 지목" 같은 공개 선언은 클라이맥스용 최강 카드.' },
      { name: '대공(大公)', desc: '황족·준왕급 최고위 귀족. 냉혹·유능·고독한 "넘버원 남주"의 단골 작위.', tip: '대공은 권력은 막강하나 정치적 고립·후사 압박을 안고 있어 "나에게만 다정"의 낙차가 크다.' },
      { name: '공작 / 후작 / 백작 / 자작 / 남작', desc: '오등작 위계. 가문 서열·영지 규모·사교계 영향력의 척도.', tip: '약혼·정략의 등가 교환에 작위차를 활용하라. 신분차가 곧 고구마이자 역전의 사이다.' },
      { name: '영애(令愛) / 영식 / 공녀', desc: '귀족가의 딸·아들·공작가 딸. "악역영애"의 그 영애.', tip: '영애의 평판은 사교계 화폐. 다과회·무도회에서의 한마디가 가문 흥망을 가른다.' },
      { name: '가주(家主) / 세가 / 종가', desc: '가문의 수장·무가(武家)·본가. 동양풍에서 권력 단위.', tip: '가문의 명예·후계·혼사가 개인의 사랑과 충돌하는 지점을 갈등으로.' },
      { name: '후궁 / 귀비 / 소의 / 숙원', desc: '동양 황실 품계. 총애와 자리를 둘러싼 후궁 암투의 등급.', tip: '품계 상승=권력. 승은·회임·중전 책봉을 단계별 사이다 마디로 설계.' },
      { name: '기사단장 / 근위기사 / 성기사', desc: '무력의 상징. 충성 서약·호위·검의 맹세가 헌신 코드와 맞닿는다.', tip: '"검을 바친다"는 기사의 맹세를 사랑 고백의 은유로 쓰면 장르적 설렘이 산다.' },
      { name: '신관 / 대신관 / 성녀(聖女)', desc: '신전 권력. 치유·신탁·축복을 관장. 성녀는 여주의 특별함 보증 장치.', tip: '"가짜 성녀 vs 진짜 성녀" 구도는 공개 망신 역전의 단골 무대.' },
      { name: '마탑 / 마탑주 / 궁정마법사', desc: '마법 권력의 본산. 마탑주는 괴짜·은둔·절대강자 캐릭터의 자리.', tip: '마탑의 중립성·금기 연구를 정치 갈등 밖의 변수로 활용하라.' },
      { name: '정령 / 정령왕 / 정령사', desc: '속성 정령과의 계약. 여주의 희귀 재능·혈통을 드러내는 장치.', tip: '"누구도 못 본 상위 정령이 여주에게만 모습을 보인다"는 선택받음의 클리셰.' },
      { name: '영지(領地) / 영주 / 영지 경영', desc: '귀족의 통치 단위. 개발·세수·기근·반란이 경영물의 무대.', tip: '전생 지식으로 영지를 부흥시키는 과정을 신분 상승·남주 인정과 엮어라.' },
      { name: '호칭: 폐하·전하·각하·레이디·공녀님·아가씨·도련님', desc: '관계와 서열을 드러내는 경칭. 호칭의 변화가 곧 관계의 변화.', tip: '남주가 "영애"에서 이름으로, 다시 애칭으로 부르는 호칭의 사다리를 설렘 게이지로 써라.' },
    ],
  },
  {
    key: 'system', label: '세계관·마법·시스템', icon: '✨', note: '로판의 세계는 감정 갈등을 증폭시키는 무대 장치. 마법·신성력·시스템은 여주의 주체성을 뒷받침한다.',
    items: [
      { name: '마나·속성 마법', desc: '불·물·바람·땅·빛·어둠 등 속성 체계. 재능·혈통으로 위계가 갈린다.', tip: '여주의 마법은 "약하지만 영리하게" 또는 "희귀 속성"으로. 화력보다 응용·지혜를 강조하면 동일시가 쉽다.' },
      { name: '신성력·치유·성녀', desc: '신에게서 빌린 힘. 치유·정화·결계. 성녀 제도와 직결.', tip: '치유 능력은 "구원받는 여주"가 아니라 "구원하는 여주"로 주체성을 세우는 데 써라.' },
      { name: '정령 계약', desc: '정령과 계약해 권능을 빌린다. 계약 정령의 격이 곧 위상.', tip: '정령의 변덕·성격을 캐릭터화하면 마법이 관계 드라마로 확장된다.' },
      { name: '마탑·마법 아카데미', desc: '마법 연구·교육 기관. 학원물·경쟁·금기 연구의 무대.', tip: '아카데미는 신분 섞임이 자연스러운 공간 → 평민/서출 여주의 능력 증명 무대로 좋다.' },
      { name: '창세신화·다신/일신 체계', desc: '세계의 기원과 신들의 위계. 신전 권력의 근거.', tip: '신화 한 토막을 1~2화에 흘려 두고, 그게 결말의 운명 전복과 호응하게 설계.' },
      { name: '신전·종교 권력', desc: '신탁·성녀 임명·면죄·파문을 쥔 제3의 권력.', tip: '황권 vs 신권의 긴장을 여주가 중재·이용하는 정치 카드로.' },
      { name: '성좌·별자리·운명 시스템', desc: '별·성좌가 인물의 운명·권능을 좌우. 점성·신탁과 결합.', tip: '"별이 정한 짝(운명의 상대)" 코드를 쓰되, 자유의지로 그것을 선택/거부하는 갈등을 더하라.' },
      { name: '게임 UI·상태창·퀘스트', desc: '레벨·스탯·호감도·퀘스트·상점이 세계 법칙으로 작동(소설/게임 속 세계).', tip: 'UI는 정보 우위의 시각화. "메인 퀘스트=원작 줄거리"로 두면 강제력을 가시화할 수 있다.' },
      { name: '신분제·서출 차별', desc: '귀족/평민, 적자/서자의 차별 구조. 고구마의 핵심 원천.', tip: '차별은 "억울함은 짧게, 청산은 분명히". 차별의 가해자를 공개 망신 역전으로 응징하라.' },
      { name: '계급·노예·예속 제도', desc: '노예·하인·예속민. 신분 격차 로맨스의 극단적 변주.', tip: '예속 관계의 권력 비대칭을 다룰 땐 여주의 주체성·동의를 확보해 민폐/피해자화로 빠지지 않게 하라.' },
      { name: '경제·상단·사업', desc: '상단·무역·영지 개발·디저트/향수/미용 사업. 전생 지식 경영물의 토대.', tip: '"전생의 평범한 지식이 이 세계의 혁신"이 되는 구체 디테일(레시피·경영 기법)을 풍부하게.' },
      { name: '저주·축복·계약 마법', desc: '저주받은 혈통·축복·맹약 마법. 운명적 굴레와 해방의 장치.', tip: '"저주를 풀 단 하나의 조건"이 사랑·희생과 연결되면 강력한 클라이맥스 동력.' },
      { name: '마수·마물·마법 생물', desc: '드래곤·정령수·환수 등. 위협이자 동료·탈것·계약 대상.', tip: '거대 마수가 여주에게만 순종하는 장면은 "선택받음"과 "보호자 함락"을 동시에 충족.' },
    ],
  },
  {
    key: 'jargon', label: '관용 표현·밈(은어)', icon: '🗯️', note: '저자·독자가 공유하는 장르 은어. 작품 소개·태그·기획서에 그대로 쓰인다.',
    items: [
      { name: '사이다 / 고구마', desc: '통쾌한 역전(사이다)과 답답한 억울함·정체(고구마). 만족도의 핵심 비율.', tip: '고구마 대비 사이다 비율을 관리하라. 억울함은 짧게 쌓고, 청산은 확실하게.' },
      { name: '회빙환', desc: '회귀·빙의·환생의 줄임말. 로판 3대 진입 장치의 총칭.', tip: '기획 단계에서 "어떤 회빙환 + 어떤 ○○물"인지 한 줄로 정의하면 방향이 선다.' },
      { name: '절단마공(절단신공)', desc: '편 끝에서 결제를 유도하는 강력한 끊기. 떡밥·반전·심쿵 한 방.', tip: '매 편 마지막 한 문장을 "다음이 궁금해 미치게" 설계. 대사·등장·폭로로 끊어라.' },
      { name: '원작 강제력', desc: '원작 줄거리대로 흐르려는 세계의 관성. 회피물의 적대 시스템.', tip: '강제력의 "규칙"을 독자에게 명확히 공유해야 회피의 긴장이 성립한다.' },
      { name: '넘버원 / 넘버투 남주', desc: '엔드게임(최종 짝)이 넘버원, 강력한 경쟁자가 넘버투(서브남주).', tip: '넘버원은 양다리·과거 여자 그림자에 민감. 서브남주는 매력적이되 선을 넘지 않게 관리.' },
      { name: '서브남주(서브공)', desc: '여주를 사랑하나 이루지 못하는 매력적 조연. 독자 인기 변수.', tip: '서브남주의 짝사랑을 비극이 아니라 "성장·우정·다른 인연"으로 마무리하면 호감이 산다.' },
      { name: '집착광공', desc: '오직 여주에게 광적으로 집착·헌신하는 남주 유형.', tip: '집착은 "위협"이 아니라 "안전한 독점욕"의 선에서. 동의·존중이 깔려야 매력이 된다.' },
      { name: '딸바보 / 아빠물', desc: '어른 보호자가 어린 여주에게 무력하게 함락되는 육아물 코드.', tip: '냉혈한일수록 함락의 낙차가 크다. 함락 트리거(작은 손·서툰 말)는 절제해서.' },
      { name: '역하렘 / 꽃받침', desc: '여주를 떠받드는 미남들. 다만 로판 주류는 결국 한 명에게 수렴.', tip: '꽃받침은 초반 흥미용. 중반부터 넘버원으로 정념을 집중시켜야 신뢰가 쌓인다.' },
      { name: '악녀 / 악역영애', desc: '원작의 악역. 빙의·회귀로 그 자리에 들어가 운명을 바꾼다.', tip: '"악녀 연기"와 "진짜 선의" 사이의 오해를 코미디·심쿵으로 활용.' },
      { name: '엑스트라 / 조연 빙의', desc: '주연이 아닌 단역으로 빙의. 주인공 서사를 비켜 살려는 동기.', tip: '"눈에 띄지 않게 살려다 더 눈에 띈다"는 역설로 남주와 엮어라.' },
      { name: '온리 유(Only You)', desc: '"강하고 유능하되 오직 너에게만 약해진다"는 남주의 절대 명제.', tip: '다른 여성에게 흔들리는 묘사는 강한 금기. 일관성이 곧 캐릭터 신뢰.' },
      { name: '고구마 too much / 별점 테러', desc: '답답함 과다로 인한 이탈·낮은 평점. 페이싱 경고 신호.', tip: '댓글·별점의 "고구마" 호소는 즉시 사이다 투입 신호로 읽어라.' },
      { name: '연독률 / 유료 전환', desc: '다음 편으로 이어 읽는 비율·무료→유료 결제율. 생존 지표.', tip: '무료분(보통 1~25화) 안에 여주 능력+남주 떡밥+세계관 후킹을 다 보여 줘야 한다.' },
    ],
  },
  {
    key: 'cliche', label: '클리셰(변주 포인트)', icon: '🎭', note: '독자가 기다리는 정형. 그대로 쓰되 한 번 비틀면 신선해진다. 비틀 지점을 함께 적었다.',
    items: [
      { name: '"내가 죽고 나서야 그는 후회했다"', desc: '프롤로그 정형. 여주의 비극적 죽음/파멸과 남주의 뒤늦은 후회로 회귀 동기를 점화.', tip: '후회의 대상을 살짝 비틀어라(후회한 게 그가 아니라 제3자, 혹은 후회조차 안 함)로 의외성.' },
      { name: '"원작에선 이 남자는 여주인공의 차지였다"', desc: '빙의 여주가 원작 지식으로 거리를 두려는 동기. 그러나 끌림은 막을 수 없다.', tip: '"원작 여주를 도와 이어 주려다 정작 본인이 걸린다"는 자업자득 코미디.' },
      { name: '"그저 조용히 이혼당하고 싶을 뿐이었는데"', desc: '여주는 도망/이혼을 원하나, 그럴수록 남주가 더 집착·매달린다.', tip: '여주의 무심함이 진짜일 때 남주의 동요가 가장 크다. 연기가 아닌 진심의 거리감을.' },
      { name: '"호감도가… 왜 오르는 거지?"', desc: '여주의 무의식적 언행에 남주 호감도가 의도와 반대로 상승.', tip: '여주가 "악평을 쌓으려는 행동"이 도리어 매력으로 읽히는 어긋남을 반복 코미디로.' },
      { name: '차가운 남주의 체온/온도 변화', desc: '"차가운 줄 알았던 손끝에서 온기가…" 신체 접촉의 온도 묘사로 빙벽이 녹는 신호.', tip: '온도를 일관된 모티프로 깔아 두면, 마지막 포옹의 따스함이 서사적 결산처럼 읽힌다.' },
      { name: '보라/금색 눈동자, 은발/흑발 절대미남', desc: '"신이 빚은 듯한" 비현실적 외모. 색채로 신분·혈통·신성을 암시.', tip: '눈동자 색에 세계관적 의미(황가의 금안, 저주받은 적안)를 부여하면 외모가 복선이 된다.' },
      { name: '공주님 안기·벽치기·손목 잡아끌기', desc: '위기·갈등 순간의 정형 스킨십. 신체 우위로 보호·소유를 표현.', tip: '클리셰일수록 "직전의 맥락"을 새로 짜라. 같은 동작도 이유가 다르면 새 장면이 된다.' },
      { name: '"내 것", "도망치지 마"', desc: '집착·소유의 대표 대사. 정념의 임계점에서 터진다.', tip: '대사 자체보다 "그가 그 말을 하기까지 무너진 과정"을 보여 줘야 위협이 아닌 설렘이 된다.' },
      { name: '"아빠… 시쪄"(혀 짧은 함락)', desc: '육아물의 보호자 함락 트리거. 어린 여주의 서툰 말·행동.', tip: '남발하면 느끼하다. 결정적 한 번을 위해 평소엔 의젓한 면을 보여 두는 대비가 효과적.' },
      { name: '약혼 파기·공개 모욕', desc: '연회에서 약혼자가 여주를 버리고 라이벌을 택하는 모욕 장면. 사이다의 도화선.', tip: '"파기당하는 순간 오히려 여주가 웃는다" — 이미 더 나은 선택지를 쥐고 있음을 암시.' },
      { name: '"예언 속 그 아이"', desc: '신전·예언서가 여주를 점지. 외부 권위의 특별함 인증.', tip: '예언을 곧이곧대로 쓰지 말고, 해석의 반전(그 아이가 사실 둘이다 등)을 남겨 둬라.' },
      { name: '숨겨진 황녀/신의 자손', desc: '천대받던 출신이 사실 고귀한 혈통으로 밝혀짐.', tip: '발각 타이밍을 공개 망신 역전과 겹쳐 사이다를 극대화. 징표·복선을 미리 심어라.' },
      { name: '"실수인 척" 도와주는 츤데레', desc: '남주가 무심한 척하며 결정적 순간 여주를 돕는다.', tip: '도움의 흔적을 여주는 모르고 독자만 알게 하면 아이러니가 쌓여 폭로 시 카타르시스.' },
      { name: '계약 키스·정략 첫날밤의 거리감', desc: '계약/정략으로 맺어졌으나 마음의 거리가 또렷한 친밀 장면.', tip: '신체적 가까움과 정서적 멂의 간극이 클수록, 그것이 좁혀지는 순간의 설렘이 크다.' },
    ],
  },
  {
    key: 'emotion', label: '감정 묘사·심쿵 톤', icon: '💓', note: '로판은 신체 반응 클로즈업과 내적 독백의 장르. 심쿵은 일정 간격으로 분배한다.',
    items: [
      { name: '심장 박동·고동', desc: '"심장이 쿵 내려앉았다", "박동이 귓가까지 울렸다" — 동요의 1차 신호.', tip: '심장 묘사는 흔하니, "왜 지금 뛰는지 본인도 모른다"는 자각 거부와 묶어 신선화.' },
      { name: '얼굴 열기·홍조', desc: '뺨이 달아오름, 귀까지 붉어짐. 들킬까 봐 고개를 숙이는 후속 동작.', tip: '홍조를 "상대가 알아채는 시선"과 교차하면 들킴의 긴장이 더해진다.' },
      { name: '시선 회피·마주침', desc: '눈을 피하다 무심결에 마주치는 순간. 시선의 줄다리기.', tip: '"피하려다 들킨 시선"은 짧게. 한 줄의 정적이 백 마디 대사보다 설렌다.' },
      { name: '손·손끝의 떨림', desc: '쥔 옷자락, 떨리는 손끝, 무심코 닿은 손. 절제된 욕망의 표지.', tip: '큰 스킨십보다 "닿을 듯 말 듯한 손끝"의 미세 묘사가 로판 독자에겐 더 강하다.' },
      { name: '체온·온기의 대비', desc: '차가운 공기 속 따뜻한 손, 망토 속 온기. 보호·친밀의 감각.', tip: '온도 모티프를 캐릭터별로 부여(그는 늘 차갑다 → 너에게만 따뜻)하면 일관성이 산다.' },
      { name: '숨결·목소리의 떨림', desc: '낮아진 목소리, 멈칫한 숨, 귓가에 닿는 숨결. 친밀거리의 긴장.', tip: '청각·근접 감각을 활용하면 시각 묘사에만 의존한 진부함을 피할 수 있다.' },
      { name: '내적 독백(계산·결심·자기비하)', desc: '1인칭 독백 비중이 높다. 결심·복수 계획·자기 비하가 교차.', tip: '독백은 "겉 대사와 속내의 불일치"로. 말은 차갑게, 속은 흔들리게 하면 입체감.' },
      { name: '남주 독백의 어조 급변', desc: '냉정한 외면과 격렬한 내면의 대비. 이중 시점 삽입 시 정점.', tip: '평소 남주 시점은 아끼다가 결정적 순간에 단 한 번 열어 충격을 극대화.' },
      { name: '질투의 신체화', desc: '미간 찌푸림, 잔을 쥔 손마디, 낮게 가라앉은 음성. 말하지 않는 질투.', tip: '"질투한다"고 쓰지 말고 행동·생리 반응으로만 보여 줘라(show, don\'t tell).' },
      { name: '눈물·울먹임의 절제', desc: '참다 터지는 눈물, 떨리는 입술. 강한 여주일수록 우는 순간이 강력.', tip: '평소 단단한 여주가 단 한 번 무너질 때, 그 한 장면에 회차의 무게를 실어라.' },
      { name: '미소의 종류 구분', desc: '비웃음·차가운 미소·무방비한 미소. 미소 하나로 관계의 단계를 표시.', tip: '"처음 보는 그의 무방비한 웃음"처럼 희소성을 부여하면 미소가 사건이 된다.' },
      { name: '향기·체취의 기억', desc: '비누·꽃·서늘한 향. 후각 기억으로 그리움·친밀을 환기.', tip: '특정 향을 인물의 시그니처로 심어 두면, 향만으로 등장 예고·그리움을 연출할 수 있다.' },
    ],
  },
  {
    key: 'structure', label: '구조·페이싱·사이다', icon: '📈', note: '편당 5,000~5,500자, 1편 1훅. 고구마는 짧게 쌓고 사이다는 확실히 청산한다.',
    items: [
      { name: '프롤로그(전생·죽음·파멸)', desc: '비극적 결말 또는 충격적 현재를 먼저 제시해 "왜 이 상황인지" 던진다.', tip: '프롤로그는 결말의 미리보기. 회수할 떡밥을 한두 개 심어 두면 완결성이 높아진다.' },
      { name: '회귀·빙의 각성과 목표 선언', desc: '"다시 시작이다" — 생존/복수/이혼/자유의 목표를 1~3화에 명시.', tip: '목표가 구체적일수록 독자가 응원할 대상이 분명해진다. "행복해지겠다"보다 "이혼하고 영지로 돌아가겠다".' },
      { name: '초반 셋업(1~30화)', desc: '세계관·인물·여주의 무기(미래 지식·능력)·남주 첫 접촉을 소개.', tip: '설정 정보는 사건에 녹여 흘려라. 설명문 덤프는 이탈의 지름길.' },
      { name: '관계 형성기', desc: '적대·계약·무관심에서 시작해 사건 공유로 거리를 좁힌다.', tip: '"함께 위기를 넘긴다"는 공동 경험이 가장 빠른 거리 좁히기 장치.' },
      { name: '중반 갈등(질투·라이벌·정치음모)', desc: '라이벌 여캐, 약혼 방해, 가문/정치 음모, 오해 누적.', tip: '갈등은 여러 겹으로(외부 음모 + 내부 오해)를 동시에 굴려 단조로움을 피하라.' },
      { name: '위기·이별 위기', desc: '큰 오해, 정체 발각, 죽음 위협, 회귀/빙의 비밀 폭로 위기.', tip: '최대 위기는 "관계가 가장 가까워진 직후"에 배치해야 낙차가 크다.' },
      { name: '클라이맥스(응징+감정 확정)', desc: '악역 응징과 고백·구원·선택이 한 장면에서 정산된다.', tip: '사이다(응징)와 로맨스(확정)를 같은 무대(연회·재판)에서 겹치면 카타르시스가 배가.' },
      { name: '결말·후일담(외전)', desc: '결혼·즉위·육아·일상 행복을 외전(번외)으로 달달하게 보상.', tip: '본편은 갈등 해소로, 외전은 보상으로 명확히 분리. 외전 떡밥(임신·질투 코미디)을 예고해 두라.' },
      { name: '1편 1훅(절단마공)', desc: '매 편 끝에 떡밥·반전·심쿵 한 방을 배치해 다음 편 결제를 유도.', tip: '편의 마지막 문장은 "질문/위협/폭로"로. 평탄한 마무리는 금물.' },
      { name: '3·3·3 리듬(긴장-환기)', desc: '고구마(긴장)를 쌓되 3~5편 내 작은 사이다로 환기, 큰 사이다는 아크 단위.', tip: '작은 사이다(통쾌한 한마디)와 큰 사이다(구조적 역전)를 층위로 구분해 배치.' },
      { name: '초반 25화 = 생존선', desc: '무료분 안에 핵심 매력(여주 능력+남주 떡밥+세계관 후킹)을 다 보여 줘야 한다.', tip: '"이 작품이 무엇을 보장하는가"를 25화 안에 증명. 늦은 첫 설렘은 이탈 요인.' },
      { name: '심쿵 빈도 관리', desc: '설렘 포인트(스킨십·달달 대사·남주 독백)를 일정 간격으로 분배.', tip: '갈등이 길어질 땐 의도적으로 "달달 막간"을 끼워 정서적 환기를 줘라.' },
      { name: '고구마 총량 통제', desc: '억울함이 길어지면 별점 테러. "억울함은 짧게, 청산은 분명히".', tip: '고구마 장면을 쓸 땐 "몇 화 안에 어떻게 청산할지"를 먼저 정해 두라.' },
    ],
  },
  {
    key: 'climax', label: '클라이맥스 관습', icon: '🎆', note: '사이다의 정점. 공개 역전과 감정의 확정을 한 무대에 겹친다.',
    items: [
      { name: '공개 망신 역전(Public Reckoning)', desc: '무도회·연회·재판에서 만인 앞에 악역의 죄가 폭로되고 여주가 공인받는다.', tip: '폭로의 증거를 미리(복선으로) 깔아 둬야 "준비된 역전"의 쾌감이 산다.' },
      { name: '남주의 공개 선택·선언', desc: '신분·정치 손해를 감수하고 "이 사람이 내 사람"이라 공표.', tip: '"황제가 만조백관 앞에서 황후로 지목" 류. 손해가 클수록 선언의 무게가 크다.' },
      { name: '희생·구원의 교차', desc: '한쪽이 위기에 처하고 다른 쪽이 목숨 걸고 구한다. 감정 확정의 결정타.', tip: '"늘 구해지던 여주가 이번엔 남주를 구한다"는 역전 구원이 주체성과 사이다를 동시 충족.' },
      { name: '비밀 폭로의 포용', desc: '회귀/빙의/정체 비밀이 남주에게 밝혀지나 거부가 아닌 포용으로 귀결.', tip: '"이미 알고 있었다"는 반전을 더하면 집착·헌신의 깊이가 폭발적으로 커진다.' },
      { name: '악역의 인과응보', desc: '응징은 통쾌하되, 최근 트렌드는 과하지 않은 자업자득식 자멸 선호.', tip: '악역의 몰락을 여주의 직접 보복보다 "스스로 판 함정"으로 그리면 격이 산다.' },
      { name: '운명 전복 확정', desc: '"원작대로면 죽었을 나"가 정반대 결말(황후·여신·행복)을 쟁취. 주제 정산.', tip: '프롤로그의 비극 장면과 거울처럼 대비되는 클라이맥스 장면을 의도적으로 배치.' },
      { name: '후일담의 달달함', desc: '클라이맥스 직후 외전에서 결혼·임신·육아·질투 코미디로 보상.', tip: '본편의 긴장이 클수록 외전의 안온함이 보상으로 강하게 작동한다.' },
      { name: '저주·예언의 해소', desc: '걸려 있던 저주·정해진 결말이 사랑·희생·선택으로 풀린다.', tip: '"저주를 풀 조건"을 초반에 제시해 두면 해소 장면이 약속의 이행처럼 읽힌다.' },
    ],
  },
  {
    key: 'place', label: '공간·무대 클리셰', icon: '🏰', note: '로판의 무대는 감정을 증폭한다. 같은 사건도 어디서 벌어지느냐로 정서가 달라진다.',
    items: [
      { name: '무도회장·연회', desc: '사교·음모·공개 역전의 정점 무대. 춤·드레스·시선이 권력 게임.', tip: '"첫 춤의 상대"가 곧 정치 선언. 연회를 클라이맥스용 공개 역전 무대로 아껴 둬라.' },
      { name: '황궁 정원·온실', desc: '밀회·고백·산책의 사적 공간. 꽃·온도·향기가 정서를 거든다.', tip: '온실의 닫힌 따뜻함은 두 사람만의 거리감을 좁히는 데 최적.' },
      { name: '도서관·서고', desc: '지식·비밀·우연한 마주침의 공간. 조용한 친밀.', tip: '"같은 책을 향해 뻗은 손"류 우연을 도서관의 정적과 함께 연출.' },
      { name: '티타임·다과회', desc: '여성 사교의 무대. 우아한 말 속에 칼날 같은 견제.', tip: '다과회의 예법·찻잔·간식 디테일에 권력 다툼을 숨겨라(누가 누구의 잔을 먼저 채우나).' },
      { name: '마차 안', desc: '닫힌 둘만의 공간. 좁은 거리·흔들림이 우연한 접촉을 만든다.', tip: '마차의 덜컹임을 신체 접촉·정적의 긴장 장치로. 도착 전까지의 유예된 시간.' },
      { name: '아카데미·기숙학교', desc: '신분 섞임·경쟁·우정·첫사랑의 무대. 평민/서출 여주의 증명 공간.', tip: '시험·실기·축제 같은 학원 이벤트를 능력 증명과 관계 진전의 마디로 활용.' },
      { name: '신전·성소', desc: '신탁·성녀 임명·축복·맹세의 신성 공간. 권위가 작동.', tip: '신전의 권위 앞에서 진실/거짓이 가려지는 장면(가짜 성녀 폭로 등)을 배치.' },
      { name: '영지·시골 별장', desc: '도망·은거·치유·경영의 무대. 황궁의 음모에서 벗어난 안식.', tip: '영지의 소박함과 황궁의 화려함을 대비해, 여주가 진짜 원하는 행복의 형태를 보여 줘라.' },
      { name: '감옥·탑·유폐 공간', desc: '다크로판·집착물의 무대. 갇힘과 구원, 정념의 임계.', tip: '갇힘을 다룰 땐 여주의 주체적 탈출 의지·계략을 함께 그려 무력한 피해자화를 피하라.' },
      { name: '발코니·테라스', desc: '연회장 밖 밤공기 속 단둘. 소란에서 빠져나온 솔직함의 공간.', tip: '"연회의 소음을 등진 발코니"는 가면을 벗고 진심을 말하기에 좋은 무대.' },
    ],
  },
  {
    key: 'lineage', label: '대표작·계보(레퍼런스)', icon: '📚', note: '독자의 기대치는 이 계보에서 형성됐다. 비교·차별화의 좌표로 삼아라.',
    items: [
      { name: '할리퀸·리젠시 로맨스', desc: '오스틴→헤이어. 사교계·무도회·신분차·오해와 화해. 서양 귀족물의 원형.', tip: '리젠시의 예법·구애 문법을 빌려 오면 서양풍 사교계의 디테일이 탄탄해진다.' },
      { name: '고전 동화(신데렐라·미녀와 야수)', desc: '신분 상승·야수적 남주의 교화 모티프. 로판 정서의 동화적 뿌리.', tip: '동화 구조를 의식적으로 비틀면("교화되지 않는 야수") 신선한 변주가 된다.' },
      { name: '악역 영애 라이트노벨(はめふら 등)', desc: '"파멸 플래그 회피" 코드의 직접 수입원. 오토메 게임 메타.', tip: '게임 메타(공략 대상·호감도·엔딩)를 차용하되 한국식 정치·사이다로 무게를 더하라.' },
      { name: '『재혼 황후』', desc: '회귀·정치 복수·재혼. "고구마 끝 사이다" 구조의 교과서.', tip: '"품위 있는 복수"의 모범. 감정 폭발 대신 정치적·논리적 응징의 쾌감을 배워라.' },
      { name: '『상수리나무 아래』', desc: '정통 로맨스 색이 강한 다크로판 분위기. 전쟁·트라우마·치유.', tip: '느린 감정선과 깊은 내면 묘사의 레퍼런스. 자극보다 정서의 밀도로 승부.' },
      { name: '『어느 날 공주가 되어버렸다』', desc: '육아·아빠물의 노블코믹스 대표. 어린 여주+냉혹한 아버지.', tip: '웹툰화로 표준이 된 "딸바보 함락" 비주얼 코드를 텍스트로 재현할 때의 기준점.' },
      { name: '『외동딸로 다시 태어났습니다』 류', desc: '환생+육아 힐링. 어른들의 보호 속 성장.', tip: '갈등을 작게, 보호와 일상의 따뜻함을 전면에 둔 저자극 힐링의 본보기.' },
      { name: '『버림받은 황비』·악녀 소설 속 빙의류', desc: '소설 속 세계·악역/엑스트라 빙의·원작 강제력의 대중화.', tip: '"원작 지식 vs 강제력" 줄다리기의 표준 문법을 참고해 차별 변수를 더하라.' },
      { name: '『시한부 황녀입니다』', desc: '시한부·연민·반전 생존. 동정에서 사랑으로의 전환.', tip: '"죽을 운명"을 동력으로 쓰되, 생존/치유의 길을 열어 희망을 남겨라.' },
      { name: '계약결혼 모티프 다수', desc: '"처음엔 계약, 나중엔 진심" 공식의 광범위한 변주군.', tip: '계약의 "조건"을 독창적으로 설계할수록(기한·금기·벌칙) 차별화가 쉽다.' },
    ],
  },
  {
    key: 'reader', label: '독자 기대·필수 관습', icon: '✅', note: '어기면 이탈. 로판 독자가 결제로 보상하는 약속들이다.',
    items: [
      { name: '여주 중심 시점·감정 동일시', desc: '독자는 여주에 빙의해 "내가 사랑받고 인정받는" 대리만족을 원한다.', tip: '여주의 무력감 장기화는 금기. 시점은 여주에 밀착시켜라.' },
      { name: '사이다 보장', desc: '모욕·억울함(고구마)을 깔되 반드시 통쾌한 역전(사이다)으로 청산.', tip: '고구마:사이다 비율이 만족도를 좌우. 청산 없는 억울함은 배신으로 읽힌다.' },
      { name: '남주의 "온리 유"', desc: '강하고 유능하되 오직 여주에게만 약해지고 집착·헌신한다.', tip: '다른 여성에게 흔들림은 강한 금기. 특히 넘버원은 과거 여자 그림자에 민감.' },
      { name: '여주의 주체성', desc: '구원 대상이 아니라 스스로 문제를 푸는 능력(마법·정치·경영·지식)을 가진다.', tip: '"민폐 여주"는 비판 1순위. 위기 해결의 주체로 여주를 세워라.' },
      { name: '명확한 보상 서사', desc: '노력·고생에 비례한 인정·신분 상승·사랑 쟁취·악역 응징의 인과적 정산.', tip: '뿌린 고생은 반드시 거둬라. 보상이 모호하면 카타르시스가 증발한다.' },
      { name: '해피엔딩 기본값', desc: '비극·새드엔딩은 강한 사전 경고(태그) 없이는 배신으로 간주.', tip: '엔딩 톤은 초반 태그·분위기로 약속하고, 그 약속을 지켜라.' },
      { name: '첫 화의 강한 후킹', desc: '회귀·빙의 선언, 충격적 처형/이혼/배신 장면으로 1~3화 안에 상황을 던진다.', tip: '"왜 이 상황인지"를 빠르게. 잔잔한 도입은 로판에선 위험하다.' },
    ],
  },
  {
    key: 'pitfall', label: '함정 체크리스트', icon: '⚠️', note: '저자 자가 점검용. 하나라도 걸리면 이탈·별점 테러의 위험 신호다.',
    items: [
      { name: '고구마 과다', desc: '억울함·오해를 너무 오래 끌면 즉시 이탈. 별점 테러의 1순위.', tip: '점검: 지금 고구마가 몇 화째인가? 청산 시점이 정해져 있는가?' },
      { name: '수동적·민폐 여주', desc: '능력·결단 없이 구원만 기다리는 여주는 동일시 실패·비판 대상.', tip: '점검: 최근 5화에서 여주가 스스로 결정/해결한 사건이 있는가?' },
      { name: '남주의 일관성 붕괴', desc: '집착·헌신을 표방하다 갑자기 냉담/양다리/과거 여자에 흔들림.', tip: '점검: 남주의 행동이 "온리 유" 명제와 충돌하지 않는가?' },
      { name: '늦은 첫 설렘', desc: '심쿵 포인트가 너무 늦으면 무료분 안에 매력 증명 실패.', tip: '점검: 25화 안에 분명한 설렘 장면과 남주 떡밥이 있는가?' },
      { name: '설정 정보 덤프', desc: '세계관·마법 설명을 한꺼번에 쏟으면 가독성·몰입이 붕괴.', tip: '점검: 설정이 사건·대사에 녹아 있는가, 설명문으로 나열돼 있는가?' },
      { name: '보상 없는 고생', desc: '뿌린 갈등·억울함을 회수하지 않으면 카타르시스가 사라진다.', tip: '점검: 초반에 심은 떡밥·억울함이 결말까지 정산되는가?' },
      { name: '경고 없는 새드/배드 요소', desc: '비극·집착·폭력 요소를 사전 태그 없이 투입하면 배신감.', tip: '점검: 작품의 톤·수위가 태그·소개와 일치하는가?' },
      { name: '라이벌·서브남주 과몰입', desc: '경쟁자에 분량·매력을 과하게 줘 넘버원 서사가 흐려진다.', tip: '점검: 중반 이후에도 정념이 넘버원에게 집중되고 있는가?' },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// 소재 조합기 — 사전 항목을 슬롯으로 무작위 조합해 "장면/설정 씨앗"을 만든다(잠금/재생성, 조합수 표시).
// ─────────────────────────────────────────────────────────────────────────────
const byKey = (k: string) => CATS.find((c) => c.key === k)!.items
const SLOTS: { key: string; label: string; icon: string; pool: Entry[] }[] = [
  { key: 'subgenre', label: '하위 분류', icon: '🏷️', pool: byKey('subgenre') },
  { key: 'device', label: '서사 장치', icon: '🌀', pool: byKey('device') },
  { key: 'rank', label: '신분·역할', icon: '👑', pool: byKey('rank') },
  { key: 'system', label: '세계관 시스템', icon: '✨', pool: byKey('system') },
  { key: 'cliche', label: '핵심 클리셰', icon: '🎭', pool: byKey('cliche') },
  { key: 'emotion', label: '심쿵 톤', icon: '💓', pool: byKey('emotion') },
  { key: 'place', label: '무대', icon: '🏰', pool: byKey('place') },
  { key: 'climax', label: '클라이맥스', icon: '🎆', pool: byKey('climax') },
]
// 조합수 = 각 슬롯 풀 크기의 곱.
const COMBOS = SLOTS.reduce((n, s) => n * s.pool.length, 1)
const fmtCombos = (n: number) => {
  if (n >= 1e16) return (n / 1e16).toFixed(2).replace(/\.?0+$/, '') + '경'
  if (n >= 1e12) return (n / 1e12).toFixed(2).replace(/\.?0+$/, '') + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(2).replace(/\.?0+$/, '') + '만'
  return n.toLocaleString()
}

const LS = 'sry:tool:romfan-knowledge:'
const ALL_KEY = '__all__'
const flatAll = (): { cat: CatDef; item: Entry }[] =>
  CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (str: string) =>
  String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

type Mode = 'browse' | 'combine'
type Combo = Record<string, Entry> // slotKey -> Entry

export default function RomfanKnowledge({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 활용: 다른 장르 컨텍스트로 열려도 로판 전용 사전임을 안내.
  const ctxGenre = typeof payload?.genre === 'string' ? (payload.genre as string) : undefined
  // payload.cat / payload.q 로 초기 카테고리·검색어 지정(연계 진입).
  const initialCat = typeof payload?.cat === 'string' && CATS.some((c) => c.key === payload!.cat) ? (payload!.cat as string) : null
  const initialQ = typeof payload?.q === 'string' ? (payload!.q as string) : ''

  const [mode, setMode] = useState<Mode>(() => {
    try { const m = localStorage.getItem(LS + 'mode'); if (m === 'combine' || m === 'browse') return m } catch { /* ignore */ }
    return 'browse'
  })
  const [query, setQuery] = useState(initialQ)
  const [cat, setCat] = useState<string>(() => {
    if (initialCat) return initialCat
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

  // 조합기 상태
  const [combo, setCombo] = useState<Combo>(() => {
    const c: Combo = {}
    for (const s of SLOTS) c[s.key] = pick(s.pool)
    return c
  })
  const [locks, setLocks] = useState<Record<string, boolean>>({})

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'mode', mode) } catch { /* ignore */ } }, [mode])
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])
  // 언마운트 정리: 토스트/복사표시 타이머 상태 리셋
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
      let p = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && p.item.name === prev.item.name && p.cat.key === prev.cat.key)
        p = pool[Math.floor(Math.random() * pool.length)]
      setOpen((o) => ({ ...o, [key(p.cat.key, p.item.name)]: true }))
      return p
    })
  }, [cat])

  const reroll = useCallback(() => {
    setCombo((prev) => {
      const next: Combo = { ...prev }
      for (const s of SLOTS) if (!locks[s.key]) next[s.key] = pick(s.pool)
      return next
    })
  }, [locks])

  const toggleLock = (slotKey: string) => setLocks((l) => ({ ...l, [slotKey]: !l[slotKey] }))
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
    const done = () => { setCopiedKey(id); window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500) }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
    else fallbackCopy(text, done)
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done() } catch { /* graceful */ }
  }
  const itemText = (c: CatDef, item: Entry) =>
    `${c.icon} ${c.label} · ${item.name}\n${item.desc}` + (item.tip ? `\n[활용] ${item.tip}` : '')

  // 조합 결과 → 한 줄 로그라인풍 텍스트
  const comboText = () =>
    SLOTS.map((s) => `${s.icon} ${s.label}: ${combo[s.key].name}`).join('\n') +
    '\n\n' + SLOTS.map((s) => `· ${combo[s.key].name} — ${combo[s.key].desc}`).join('\n')

  // 연계: 사전 항목을 프로젝트 자료 〈로판 지식〉 폴더에 메모로 추가.
  const addItemToProject = (c: CatDef, item: Entry) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(c.icon + ' ' + c.label)} · ${escapeHtml(item.name)}</b></p>`,
      `<p>${escapeHtml(item.desc)}</p>`,
      item.tip ? `<p><b>💡 활용</b><br>${escapeHtml(item.tip)}</p>` : '',
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '로판 지식',
      title: `${item.name} (${c.label})`, bodyHtml,
      meta: { 장르: '로맨스판타지', 분류: c.label },
    })
    if (id) {
      setToast(`프로젝트 자료 〈로판 지식〉에 ‘${item.name}’을(를) 추가했습니다.`)
      window.setTimeout(() => setToast((t) => (t && t.includes(item.name) ? null : t)), 2200)
    }
  }

  // 연계: 사전 항목을 공유 라이브러리 스니펫으로 저장.
  const saveItemSnippet = (c: CatDef, item: Entry) => {
    addToLibrary('snippets', { text: itemText(c, item), source: '로판 지식 사전 · ' + c.label, tags: ['로맨스판타지', c.label] })
    setToast(`스니펫으로 저장: ‘${item.name}’`)
    window.setTimeout(() => setToast((t) => (t && t.includes(item.name) ? null : t)), 1600)
  }

  // 연계: 조합 결과를 프로젝트 자료 〈로판 소재 조합〉 폴더에 메모로 추가.
  const addComboToProject = () => {
    if (!hasProjectBridge()) return
    const bodyHtml =
      `<p><b>로판 소재 조합 (1/${fmtCombos(COMBOS)} 확률의 한 조합)</b></p>` +
      SLOTS.map((s) =>
        `<p><b>${escapeHtml(s.icon + ' ' + s.label)}</b> — ${escapeHtml(combo[s.key].name)}<br>` +
        `${escapeHtml(combo[s.key].desc)}</p>`,
      ).join('')
    const title = `로판 소재 — ${combo['subgenre'].name} × ${combo['device'].name}`
    const id = addToProject({
      kind: 'text', root: 'research', folder: '로판 소재 조합', title, bodyHtml,
      meta: { 장르: '로맨스판타지', 하위분류: combo['subgenre'].name, 장치: combo['device'].name },
    })
    if (id) {
      setToast('프로젝트 자료 〈로판 소재 조합〉에 현재 조합을 추가했습니다.')
      window.setTimeout(() => setToast((t) => (t && t.includes('조합')) ? null : t), 2200)
    }
  }

  // 연계: 조합 결과를 스니펫으로 저장.
  const saveComboSnippet = () => {
    addToLibrary('snippets', { text: comboText(), source: '로판 소재 조합', tags: ['로맨스판타지', '소재조합', combo['subgenre'].name] })
    setToast('조합을 스니펫으로 저장했습니다.')
    window.setTimeout(() => setToast((t) => (t && t.includes('조합')) ? null : t), 1800)
  }

  // 관련 도구(연계) — 로판 세계관·인물·플롯·작명·갈등 도구로 잇는다.
  const RELATED: { id: string; label: string }[] = [
    { id: 'character-forge', label: '🧬 캐릭터 생성기' },
    { id: 'character-sheet', label: '🪪 인물 시트' },
    { id: 'relationship-map', label: '🕸 관계도' },
    { id: 'setting-bible', label: '📔 배경 설정집' },
    { id: 'world-wiki', label: '🌐 세계관 위키' },
    { id: 'name-mixer', label: '🔤 이름 조합기' },
    { id: 'plot-pyramid', label: '🔺 플롯 피라미드' },
    { id: 'emotion-arc', label: '📉 감정 곡선' },
    { id: 'logline-forge', label: '🎯 로그라인 대장간' },
    { id: 'writing-dictionary', label: '📚 만능 단어 사전' },
  ]

  // ── 스타일 헬퍼 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  const RelatedBar = (
    <div className="linkbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>관련 도구:</span>
      {RELATED.map((r) => (
        <button key={r.id} className="minibtn" onClick={() => openToolLinked(r.id, { genre: '로맨스판타지' })}>{emojify(r.label)}</button>
      ))}
    </div>
  )

  return (
    <div style={wrap}>
      <div style={hint}>
        로맨스판타지(로판)에서 자주 쓰는 <b>소재·설정·고증</b>을 <b>{total}개</b> 항목으로 모았습니다.
        카테고리로 찾고, <b>소재 조합</b> 탭에서 무작위로 장면 씨앗을 뽑아 보세요.
        {ctxGenre && ctxGenre !== '로맨스판타지' && (
          <span style={{ color: 'var(--accent)' }}> (연 도구는 ‘{ctxGenre}’ 맥락이지만, 이 사전은 로판 전용입니다.)</span>
        )}
      </div>

      {/* 모드 탭 */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className={'minibtn' + (mode === 'browse' ? ' active' : '')} aria-pressed={mode === 'browse'}
          onClick={() => setMode('browse')}
          style={{ borderColor: mode === 'browse' ? 'var(--accent)' : 'var(--border)' }}><Emoji e="📂" /> 펼쳐보기</button>
        <button className={'minibtn' + (mode === 'combine' ? ' active' : '')} aria-pressed={mode === 'combine'}
          onClick={() => setMode('combine')}
          style={{ borderColor: mode === 'combine' ? 'var(--accent)' : 'var(--border)' }}><Emoji e="🎲" /> 소재 조합</button>
        <span style={{ ...hint, marginLeft: 'auto' }}>
          {mode === 'browse' ? `${total}개 항목 · ${CATS.length}개 분류` : `조합 ${fmtCombos(COMBOS)}가지`}
        </span>
      </div>

      {mode === 'browse' && (
        <>
          {/* 검색 */}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="소재 이름·설명·활용으로 검색 (예: 회귀, 집착, 사이다, 무도회)"
            style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
          />

          {/* 카테고리 필터 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY}
              style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}><Emoji e="✨" /> 전체</button>
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

          {/* 무작위 결과 강조 카드 */}
          {random && (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
                <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
                <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0 6px' }}>{random.item.desc}</div>
              {random.item.tip && (
                <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--muted)' }}><Emoji e="💡" /> {random.item.tip}</div>
              )}
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <button className="minibtn" onClick={() => copy(itemText(random.cat, random.item), 'rand')}>{copiedKey === 'rand' ? '✓ 복사됨' : emojify('📋 복사')}</button>
                <button className="minibtn" onClick={() => saveItemSnippet(random.cat, random.item)}><Emoji e="📌" /> 스니펫 저장</button>
                <button className="linkbtn" onClick={() => addItemToProject(random.cat, random.item)} disabled={!hasProjectBridge()}
                  title={hasProjectBridge() ? '프로젝트 자료 〈로판 지식〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
              </div>
            </div>
          )}

          {/* 목록 (펼침) */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {filtered.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
                {onlyFav ? '☆ 아직 즐겨찾기한 소재가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
              </div>
            ) : (
              filtered.map(({ cat: c, item }) => {
                const fk = key(c.key, item.name)
                const isFav = !!favs[fk]
                const isOpen = !!open[fk] || !!query.trim()
                const copyId = 'item:' + fk
                return (
                  <div key={fk} style={card}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, cursor: 'pointer' }} onClick={() => toggleOpen(c.key, item.name)}>
                      <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /> {c.label}</span>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</span>
                      <span style={{ color: 'var(--muted)', marginLeft: 'auto', fontSize: 12 }}>{isOpen ? '▾' : '▸'}</span>
                      <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={(e) => { e.stopPropagation(); toggleFav(c.key, item.name) }}
                        style={{ flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>{isFav ? '★' : '☆'}</button>
                    </div>
                    {isOpen && (
                      <>
                        <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>{item.desc}</div>
                        {item.tip && <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--muted)', marginTop: 4 }}><Emoji e="💡" /> {item.tip}</div>}
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                          <button className="minibtn" onClick={() => copy(itemText(c, item), copyId)}>{copiedKey === copyId ? '✓ 복사됨' : emojify('📋 복사')}</button>
                          <button className="minibtn" onClick={() => saveItemSnippet(c, item)}><Emoji e="📌" /> 스니펫</button>
                          <button className="linkbtn" onClick={() => addItemToProject(c, item)} disabled={!hasProjectBridge()}
                            title={hasProjectBridge() ? '프로젝트 자료 〈로판 지식〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {mode === 'combine' && (
        <>
          <div style={hint}>
            {SLOTS.length}개 슬롯을 무작위로 조합해 <b>장면/설정 씨앗</b>을 만듭니다. 마음에 드는 슬롯은 <Emoji e="🔒" /> 잠그고 나머지만 다시 굴리세요.
            총 <b>{fmtCombos(COMBOS)}가지</b> 조합({COMBOS.toLocaleString()}).
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={reroll}><Emoji e="🎲" /> 다시 굴리기</button>
            <button className="minibtn" onClick={() => copy(comboText(), 'combo')}>{copiedKey === 'combo' ? '✓ 복사됨' : emojify('📋 조합 복사')}</button>
            <button className="minibtn" onClick={saveComboSnippet}><Emoji e="📌" /> 스니펫 저장</button>
            <button className="linkbtn" onClick={addComboToProject} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '프로젝트 자료 〈로판 소재 조합〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {SLOTS.map((s) => {
              const e = combo[s.key]
              const locked = !!locks[s.key]
              return (
                <div key={s.key} style={{ ...card, borderColor: locked ? 'var(--accent)' : 'var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={s.icon} /> {s.label}</span>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{e.name}</span>
                    <button className="minibtn" onClick={() => toggleLock(s.key)} title={locked ? '잠금 해제' : '이 슬롯 잠그기'}
                      style={{ marginLeft: 'auto', flexShrink: 0, borderColor: locked ? 'var(--accent)' : 'var(--border)' }}>
                      {locked ? emojify('🔒 잠김') : emojify('🔓 잠그기')}
                    </button>
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--muted)', marginTop: 5 }}>{e.desc}</div>
                </div>
              )
            })}
            {/* 조합 요약 카드 */}
            <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}><Emoji e="🌱" /> 한 줄 씨앗</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <b>{combo['subgenre'].name}</b> · <b>{combo['device'].name}</b>를 동력으로,
                {' '}<b>{combo['rank'].name}</b>인 여주(혹은 그 곁의 인물)가
                {' '}<b>{combo['system'].name}</b>(이)라는 세계 법칙 속에서
                {' '}<b>{combo['place'].name}</b>를 무대로 ‘{combo['cliche'].name}’ 클리셰를 변주하고,
                {' '}<b>{combo['emotion'].name}</b> 톤으로 설렘을 빚다가
                {' '}<b>{combo['climax'].name}</b>(으)로 정산되는 이야기.
              </div>
            </div>
          </div>
        </>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>
          ✓ {toast}
        </div>
      )}

      {RelatedBar}
      <div style={hint}>소재는 정답이 아니라 출발점입니다. 클리셰는 그대로 쓰되 한 번 비틀면 신선해집니다.</div>
    </div>
  )
}
