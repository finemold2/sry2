// 로맨스판타지(로판) 특수 어휘·표현 사전 — 이 장르 특유의 단어·관용표현·말투·상투구·전문용어를
//   카테고리(신분·호칭 / 회빙환·메타 / 서사 장치 / 로판 밈·은어 / 심쿵·집착 대사 / 사이다·고구마 /
//   말투·어조 / 감정·신체 묘사 / 공간·소품 / 클리셰·전복)로 모은 로컬 사전.
//   로판 도시에(§3 서사 장치, §5 클라이맥스, §6 어휘·표현·클리셰, §7 세계관)에 근거한 자작 데이터.
//   카테고리 펼침·검색·무작위·클릭복사 + 스니펫 저장 + 프로젝트 메모 추가 + 관련 도구 연계.
//   자급식: 외부 네트워크·라이브러리 없음. react + './linkbus' 만 import. localStorage 영속·언마운트 정리.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'romfan-lexicon', name: '로판 어휘·표현 사전', icon: '👑', group: '어휘·표현', genre: '로맨스판타지', intro: '로맨스판타지 특유의 신분어·회빙환·심쿵 대사·밈·상투구를 찾아 클릭 복사·스니펫 저장', w: 680, h: 640 }

interface Term { word: string; read?: string; gloss: string; use?: string }
interface CatDef { key: string; label: string; icon: string; desc: string; items: Term[] }

// 로판 도시에 §6(특수 어휘·표현·클리셰), §3(서사 장치), §5(클라이맥스), §7(세계관)에 근거.
// 일반 로맨스/판타지가 아니라 "로맨스판타지" 장르에 구체적·특화된 항목만 수록.
const CATS: CatDef[] = [
  {
    key: 'rank', label: '신분·호칭·세계 용어', icon: '👑', desc: '황궁·사교계·작위 등 로판 무대를 부르는 신분어와 호칭',
    items: [
      { word: '황제·황후', read: '皇帝·皇后', gloss: '제국 최고 권력. 로판에선 정략·복수·재혼의 정점에 선 자리로, 황후 책봉이 곧 사이다의 무대가 된다.', use: '“황제 폐하께서, 만조백관 앞에서 그녀를 황후로 지목하셨다.”' },
      { word: '황태자·황녀', read: '皇太子·皇女', gloss: '제위 계승자와 황실의 딸. 차가운 황태자 남주, 시한부·버림받은 황녀 여주가 단골.', use: '“원작에서 이 황태자는, 다른 여자의 차지였다.”' },
      { word: '대공', read: '大公', gloss: '황족에 준하는 최고위 작위. ‘북부 대공’처럼 변경의 절대 권력자 남주로 자주 등장.', use: '“얼음 같은 북부 대공이, 그녀에게만은 외투를 벗어 덮어 주었다.”' },
      { word: '공작·공녀', read: '公爵·公女', gloss: '왕족에 버금가는 대귀족과 그 딸. 악역영애·고고한 여주의 출신 단골.', use: '“공작가의 영애가 파혼당했다는 소문이, 사교계를 발칵 뒤집었다.”' },
      { word: '영애', read: '令愛', gloss: '귀족 가문의 미혼 딸을 높여 부르는 말. ‘악역 영애’로 빙의물의 핵심 신분이 된다.', use: '“하필이면, 원작에서 처형당하는 악역 영애에게 빙의했다.”' },
      { word: '영식', read: '令息', gloss: '귀족 가문의 아들을 높여 부르는 말. 영애의 짝패 호칭.', use: '“후작가의 영식이 그녀에게 첫 춤을 청했다.”' },
      { word: '가주·세가', read: '家主·世家', gloss: '가문을 대표·통솔하는 수장과, 대를 잇는 명문가. 동양풍 로판에서 권력 단위.', use: '“열다섯에 가주 자리를 물려받은 그녀를, 가신들은 인정하지 않았다.”' },
      { word: '서녀·서출', read: '庶女·庶出', gloss: '정실이 아닌 어머니에게서 난 자식. 차별과 설움(고구마)의 출발점, 숨은 고귀함의 복선.', use: '“서녀라는 이유로, 그녀의 자리는 늘 식탁 끝이었다.”' },
      { word: '후궁·귀비·소의', read: '後宮·貴妃·昭儀', gloss: '동양풍 후궁물의 품계. 총애를 두고 벌이는 암투가 갈등의 엔진.', use: '“소의에서 귀비로 — 그녀는 단 한 계절 만에 후궁의 정점에 올랐다.”' },
      { word: '성녀·대신관', read: '聖女·大神官', gloss: '신성력으로 치유·신탁을 행하는 여성과 신전의 수장. 여주의 ‘특별함’을 제도적으로 공인.', use: '“신탁이 그녀를 성녀로 지목하자, 신전이 술렁였다.”' },
      { word: '근위기사·기사단장', read: '近衛騎士·騎士團長', gloss: '황실·귀족을 호위하는 무력. 충직한 서브남주·집착 호위 단골 직군.', use: '“근위기사는 검을 든 채, 그녀의 그림자처럼 따라붙었다.”' },
      { word: '마탑주', read: '魔塔主', gloss: '마법사들의 탑 정점에 선 자. 괴짜·은둔형 천재 남주로 비틀어 쓰기 좋다.', use: '“백 년 만에 마탑을 나선 마탑주가, 그녀의 손을 잡아끌었다.”' },
      { word: '레이디·각하·전하·폐하', gloss: '로판 호칭의 기본기. 레이디(귀부인·영애)/각하(공작·고위)/전하(왕족)/폐하(황제)로 위계를 표시.', use: '“‘레이디.’ 그가 부른 그 한 단어에, 무도회장의 시선이 모였다.”' },
      { word: '공녀님·아가씨·도련님', gloss: '시종·하인이 주인을 부르는 호칭. 육아·저택물에서 위계와 다정함을 동시에 드러낸다.', use: '“‘아가씨, 이제 그만 우셔요.’ 늙은 유모가 손수건을 내밀었다.”' },
      { word: '영지·영주', read: '領地·領主', gloss: '귀족이 다스리는 땅과 그 주인. 전생 지식으로 영지를 개발하는 ‘경영 로판’의 무대.', use: '“버려진 영지를 물려받은 그녀는, 전생의 지식으로 황무지에 밀을 심었다.”' },
      { word: '상단·가주', read: '商團', gloss: '상업 조직과 그 수장. 전생 지식으로 사업·디저트·향수에 성공하는 ‘경영 로판’의 핵심 세력.', use: '“그녀가 차린 상단의 디저트가, 한 계절 만에 황궁 다과회를 점령했다.”' },
    ],
  },
  {
    key: 'meta', label: '회빙환·원작 메타', icon: '🔄', desc: '회귀·빙의·환생과 ‘원작 속 세계’를 부르는 로판의 핵심 메타 용어',
    items: [
      { word: '회귀', read: '回歸', gloss: '죽거나 파멸한 시점에서 과거로 돌아옴. 여주만 아는 ‘미래 정보의 비대칭’이 복수·선점의 무기가 된다.', use: '“처형대에 목을 올린 순간, 나는 결혼 전 그날로 돌아와 있었다.”' },
      { word: '빙의', read: '憑依', gloss: '현대인(또는 타인)이 소설·게임 속 인물의 몸에 들어감. 흔히 ‘내가 읽던 소설의 악역/엑스트라’가 된다.', use: '“눈을 떠 보니, 내가 어젯밤 읽다 만 로판의 악녀가 되어 있었다.”' },
      { word: '환생', read: '還生', gloss: '죽어 아예 다른 생으로 다시 태어남. 육아물과 결합해 ‘어른 정신의 아기’ 구도를 만든다.', use: '“다시 태어난 나는, 이번 생에선 사랑받는 외동딸이었다.”' },
      { word: '회빙환', gloss: '회귀·빙의·환생을 묶어 부르는 로판/웹소설 3대 시작 장치. 작품 소개에 그대로 쓰인다.', use: '“회빙환 클리셰를 비틀어, 이번엔 ‘악역의 어머니’로 빙의했다.”' },
      { word: '원작', read: '原作', gloss: '빙의한 인물이 알고 있는 ‘이미 쓰인 이야기’. 미래를 아는 치트이자, 따라야 할 족쇄.', use: '“원작대로라면, 나는 3년 뒤 이 정원에서 독살당한다.”' },
      { word: '원작 강제력', gloss: '운명을 비틀려 해도 세계가 정해진 결말로 끌고 가려는 힘. 로판 최강의 긴장 엔진.', use: '“약혼을 깨도, 강제력은 기어이 우리를 같은 무도회장에 세웠다.”' },
      { word: '파멸 플래그', gloss: '악역영애가 처형·추방당하게 되는 정해진 사건의 깃발. 회피가 곧 생존 목표.', use: '“여주인공에게 물을 끼얹는 순간이 첫 번째 파멸 플래그였다. 나는 컵을 내려놓았다.”' },
      { word: '엑스트라·조연 빙의', gloss: '주연이 아닌 단역·조연에게 빙의하는 변주. ‘눈에 띄지 않고 살아남기’가 목표가 된다.', use: '“이름 한 줄짜리 시녀에 빙의했으니, 조용히 월급이나 받자고 다짐했다.”' },
      { word: '호감도', gloss: '(게임·시스템 빙의) 남주가 여주에게 품은 마음의 수치. 오르고 내림이 생존·엔딩과 직결된다.', use: '“[남주 호감도 +15] …왜, 도망치려는데 호감도가 오르는 거지?”' },
      { word: '엔딩 분기', gloss: '원작 게임/소설의 결말 갈래(해피·노멀·배드·히든). 어느 분기로 가느냐가 곧 운명.', use: '“이대로면 배드 엔딩. 그렇다면, 원작에 없던 히든 루트를 직접 만들면 된다.”' },
      { word: '미래 지식', gloss: '회귀·빙의자가 가진 앞날에 대한 정보. 사업 선점·재난 회피·악역 응징의 만능 카드.', use: '“삼 년 뒤 터질 역병을 나는 안다. 지금부터 약초를 사 모으면 된다.”' },
      { word: '회귀 트라우마', gloss: '전생의 죽음·배신 기억이 현재 판단을 지배하는 상태. 특정 인물 불신·PTSD적 반응으로 나타난다.', use: '“그가 손을 내밀자, 마지막 생에서 그 손이 나를 밀어 떨어뜨린 기억이 먼저 떠올랐다.”' },
      { word: '여러 번의 회귀(N회차)', gloss: '같은 시점으로 몇 번이고 돌아오는 반복 회귀. ‘몇 회차인지’가 절박함과 능숙함을 동시에 보여준다.', use: '“스물세 번째 회귀. 이번엔, 그를 살리는 법을 안다.”' },
      { word: '원작 붕괴(루트 이탈)', gloss: '여주의 행동으로 원작 줄거리가 어긋나, 더는 미래 지식이 통하지 않게 되는 전환점. 긴장이 재점화된다.', use: '“원작에서 그는 여주인공을 봤어야 했다. 그런데 그의 눈이, 나를 향했다.”' },
      { word: '원작 등장인물', gloss: '빙의자가 ‘이미 아는’ 책 속 인물들. 만남마다 ‘아, 이 사람이…’ 하는 인식의 묘미가 있다.', use: '“소설에서 백 번은 읽은 그 얼굴이, 지금 내 앞에서 차를 따르고 있었다.”' },
      { word: '미래의 적·미래의 아군', gloss: '회귀·빙의자가 결말을 알기에 미리 분류하는 인물. 선점·포섭·제거 전략의 근거.', use: '“원작에서 나를 배신할 그를, 이번엔 적이 되기 전에 내 사람으로 만들겠다.”' },
    ],
  },
  {
    key: 'device', label: '서사 장치·전개', icon: '🎴', desc: '로판이 즐겨 쓰는 관계·정보 장치와 전개 도구',
    items: [
      { word: '계약 결혼', gloss: '이해관계로 맺은 형식상의 결혼. ‘처음엔 계약, 나중엔 진심’으로 이행하는 점진 로맨스의 공식.', use: '“계약서 11조: 서로를 사랑하지 않는다. ─ 그 조항이 가장 먼저 깨졌다.”' },
      { word: '정략결혼', gloss: '가문·정치의 거래로 성사되는 혼인. 신분차·강요(고구마)에서 출발해 진심으로 뒤집는다.', use: '“얼굴도 모르는 대공에게 시집가라니. 도망칠 방법부터 궁리했다.”' },
      { word: '이중 시점(남주 독백 삽입)', gloss: '여주 시점으로 가다 결정적 순간 남주의 속마음을 폭로하는 장치. 독자만 아는 카타르시스.', use: '‘그녀는 모른다. 내가 이미, 돌이킬 수 없을 만큼 빠졌다는 걸.’' },
      { word: '오해·정보 격차', gloss: '여주는 ‘그가 날 싫어한다’ 믿지만 실은 사랑인 극적 아이러니. 독자만 진실을 안다.', use: '“그가 차갑게 등을 돌렸다. 나는 미움받았다 여겼지만 ─ 그건 얼굴을 붉힌 그가 숨으려는 몸짓이었다.”' },
      { word: '신탁·예언', read: '神託·豫言', gloss: '여주의 특별함을 외부 권위가 공인하는 장치. ‘예언 속 그 아이’ 클리셰.', use: '“예언서에 적힌 ‘붉은 달의 아이’가, 바로 그녀였다.”' },
      { word: '스테이터스 창·시스템', gloss: '호감도·퀘스트·상태창 같은 게임 UI를 세계 법칙으로 채택. 로판에선 ‘공략 시스템’으로 변주.', use: '“[메인 퀘스트: 황태자의 약혼녀 자리를 지켜라. 실패 시 사형.]”' },
      { word: '주종 계약', gloss: '계약으로 묶인 주인-종속(기사·악마·정령) 관계. 거리감에서 헌신으로 이행하는 구조.', use: '“계약으로 묶인 그는, 명령 없이도 그녀 앞에서 검을 들었다.”' },
      { word: '비밀 폭로의 해소', gloss: '회귀·빙의·정체 비밀이 남주에게 밝혀지지만, 거부가 아닌 포용으로 귀결되는 전개.', use: '“‘나, 사실 이 세계 사람이 아니야.’ 그는 한참을 침묵하다, 더 꼭 끌어안았다.”' },
      { word: '약혼·파혼', read: '約婚·破婚', gloss: '맺고 깨지는 정혼. 공개 파혼 굴욕(고구마) → 더 나은 상대의 선택(사이다)이 정석 리듬.', use: '“연회 한복판에서 파혼을 선언당한 그날, 나는 처음으로 자유로웠다.”' },
      { word: '신분 위장·정체 숨기기', gloss: '여주(또는 남주)가 신분을 감추고 섞여 드는 장치. 발각 위기가 중반 긴장을 만든다.', use: '“시녀로 위장한 그녀가, 사실은 폐위된 황녀라는 걸 그는 아직 몰랐다.”' },
      { word: '숨겨진 고귀한 혈통', gloss: '천대받던 출신이 사실 황녀·신의 자손·고대 혈통으로 밝혀지는 반전. 신분 상승의 정당화.', use: '“그녀의 등에 떠오른 문장은, 멸문한 황가의 것이었다.”' },
      { word: '딸바보·아빠물 구도', gloss: '어린 여주를 둘러싼 어른 보호자들이 함락되는 육아물의 핵심 구도.', use: '“냉혈한 대공이, 작은 손에 옷자락을 잡힌 채 어쩔 줄 몰라 했다.”' },
      { word: '전생 지식 사업', gloss: '현대 지식(요리·디저트·향수·미용·경영)으로 부와 입지를 쌓는 ‘경영 로판’의 동력. 여주 주체성의 무기.', use: '“커피라는 걸 처음 본 귀족들이, 그녀의 찻집 앞에 줄을 섰다.”' },
      { word: '거짓 약혼·가짜 연인', gloss: '이해관계로 잠시 연인 행세를 하는 장치. 연기하다 진심이 스며드는 점진 로맨스.', use: '“가짜 약혼자 행세만 하기로 했는데, 그의 손을 잡은 채 심장이 멋대로 뛰었다.”' },
      { word: '구원·치유의 교환', gloss: '상처 입은 두 사람이 서로를 회복시키는 구조. 힐링 로판·상처남주물의 핵심 관계 역학.', use: '“망가진 그를 고친 건 그녀였고, 무너진 그녀를 일으킨 건 그였다.”' },
      { word: '재회·엇갈림', gloss: '한 번 헤어졌던 두 사람이 신분·시간을 건너 다시 만나는 장치. 회귀와 결합해 절절함을 키운다.', use: '“몇 해가 지나 무도회장에서 마주친 순간, 두 사람 다 숨을 멈췄다.”' },
    ],
  },
  {
    key: 'meme', label: '로판 밈·은어', icon: '🍠', desc: '독자·작가가 작품을 호명하는 장르 은어와 밈',
    items: [
      { word: '사이다', gloss: '억울함·모욕을 통쾌하게 청산하는 역전·반격. 로판 만족도의 핵심 지표.', use: '“그녀가 증거를 내던지자, 사교계가 침묵했다 ─ 완벽한 사이다였다.”' },
      { word: '고구마', gloss: '답답하고 억울한 전개. 깔되 짧게, 반드시 사이다로 청산해야 한다(고구마 too much = 별점 테러).', use: '“오해가 풀리지 않는 이 고구마 구간만 넘기면, 다음 화에서 터진다.”' },
      { word: '절단마공', gloss: '매 편 끝에 떡밥·반전·심쿵을 배치해 다음 편 결제를 유도하는 끊기 기법.', use: '“그가 무릎을 꿇은 그 순간 ─ ‘다음 화에 계속.’ 절단마공의 정석이었다.”' },
      { word: '넘버원·넘버투 남주', gloss: '결말의 주인이 될 남주(넘버원)와 그를 위협하는 강력한 라이벌(넘버투).', use: '“넘버투 남주가 더 다정해도, 결국 여주는 넘버원에게 간다 ─ 그게 로판의 법칙.”' },
      { word: '서브남주(서브공)', gloss: '여주를 사랑하지만 끝내 이어지지 못하는 매력적 조연. ‘서브병’을 앓게 만드는 존재.', use: '“이번엔 제발 서브남주가 행복했으면, 하고 독자들이 빌었다.”' },
      { word: '집착광공', gloss: '여주에게 병적으로 집착·헌신하는 남주 유형. 다크로판·집착물의 간판.', use: '“‘도망쳐 봐. 어디든 찾아내서, 더 깊이 가둘 테니까.’ ─ 전형적인 집착광공이었다.”' },
      { word: '딸바보', gloss: '어린 여주(딸)에게 한없이 약해지는 보호자. 육아 로판의 함락 포인트.', use: '“제국 최고의 검사라던 그가, 딸바보가 되는 데에는 하루면 충분했다.”' },
      { word: '꽃받침', gloss: '여주(주인공)를 떠받드는 미남 군상. 역하렘 구도의 ‘떠받치는 꽃잎들’ 비유.', use: '“그녀를 둘러싼 네 명의 미남이, 말 그대로 꽃받침이었다.”' },
      { word: '역하렘', gloss: '한 여주를 여러 미남이 둘러싸는 구도. 다인공략·꽃받침과 함께 쓰인다.', use: '“역하렘은 좋지만, 결국 한 사람만 고르는 게 로판의 룰이다.”' },
      { word: '악녀·악역영애', gloss: '원작에서 여주를 괴롭히는 악역. 빙의의 단골 자리이자, 재해석·갱생의 무대.', use: '“악역영애로 빙의했지만, 나는 악녀 노릇을 그만두기로 했다.”' },
      { word: '온리 유', read: 'Only You', gloss: '남주가 오직 여주에게만 약해지고 헌신한다는 로판의 절대 코드. 양다리·과거 여자 그림자는 금기.', use: '“세상 모두에게 차가운 그가, 오직 그녀 앞에서만 무너졌다.”' },
      { word: '다정남·순정남', gloss: '집착광공의 반대편. 처음부터 일관되게 다정·헌신하는 ‘힐링’ 남주 유형.', use: '“상처투성이 그녀에게 그가 준 건, 자극이 아니라 한결같은 다정함이었다.”' },
      { word: '서브병', gloss: '이어지지 못할 서브남주에게 마음이 가 앓는 독자 상태. ‘서브남주 행복 외전’을 갈망하게 만든다.', use: '“또 서브병에 걸렸다. 제발 이번 서브남주는 행복해지길.”' },
      { word: '먼치킨 여주', gloss: '마법·정치·전생 지식으로 압도적 능력을 지닌 주체적 여주. 민폐 여주의 정반대.', use: '“그녀가 펜 한 자루로 가문 하나를 무너뜨리는 데엔, 사흘이면 충분했다.”' },
      { word: '갱생·재해석 악녀', gloss: '원작의 악녀가 빙의 후 선행·자립으로 노선을 바꾸는 인기 코드. ‘악녀 그만두기’가 목표.', use: '“악역영애답게 굴라고? 미안하지만, 나는 살아남는 쪽을 택하겠어.”' },
      { word: '회귀 사이다', gloss: '회귀로 얻은 미래 지식으로 과거의 굴욕을 통째로 되갚는 통쾌함. 로판 회귀물의 간판 쾌감.', use: '“지난 생에 나를 비웃던 이들이, 이번엔 내 발밑에서 머리를 조아렸다.”' },
    ],
  },
  {
    key: 'line', label: '심쿵·집착 대사', icon: '💗', desc: '설렘 포인트를 만드는 정형 대사와 집착·헌신의 한 줄',
    items: [
      { word: '“내 거야.”', gloss: '소유욕을 직설로 드러내는 집착 대사의 대표. 짧을수록 강하다.', use: '“‘내 거야.’ 그가 그녀의 손목을 끌어 품에 가두며 낮게 말했다.”' },
      { word: '“도망치지 마.”', gloss: '벗어나려는 여주를 붙드는 집착의 정형. 위협과 애원의 경계.', use: '“‘도망치지 마.’ 명령 같던 말끝이, 미세하게 떨렸다.”' },
      { word: '“당신만 보여.”', gloss: '온리 유 코드를 한 줄로 압축한 헌신 대사.', use: '“수많은 영애들 사이에서, 그의 눈에는 오직 그녀만 보였다.”' },
      { word: '“네가 원한다면, 제국이라도 주지.”', gloss: '권력자 남주가 사랑을 위해 모든 것을 내거는 과장된 헌신 선언.', use: '“‘네가 원한다면, 이 제국이라도 발밑에 깔아 주마.’”' },
      { word: '“두 번은 못 보내.”', gloss: '회귀·재회 구도에서 한 번 잃은 여주를 다시는 놓지 않겠다는 다짐.', use: '“지난 생에서 너를 잃었어. 두 번은 못 보내.”' },
      { word: '“울지 마. 내가 다 해결할게.”', gloss: '보호·구원의 다정 대사. 다정남·아빠물에서 함락의 한 방.', use: '“작은 어깨가 들썩이자, 그가 무릎을 굽혀 눈을 맞췄다. ‘울지 마. 내가 다 해결할게.’”' },
      { word: '“그 손, 다른 남자에게 잡히게 두지 않아.”', gloss: '질투·독점욕을 행동 선언으로 드러내는 집착 대사.', use: '“그가 다가오는 약혼자를 막아서며 말했다. ‘그 손은, 내 거다.’”' },
      { word: '“처음부터, 너였어.”', gloss: '오해가 풀리는 순간의 고백 정형. ‘사실 줄곧 사랑했다’의 폭로.', use: '“냉정한 줄 알았던 그가 고백했다. ‘처음부터, 너였어. 단 한 번도 아닌 적이 없었어.’”' },
      { word: '“다치면, 다친 만큼 돌려주겠어.”', gloss: '여주를 해친 자에 대한 보복 선언. 헌신과 사이다를 겸한다.', use: '“그녀의 뺨에 멍을 본 순간, 그의 목소리가 얼어붙었다.”' },
      { word: '“레이디, 이 춤을 청해도 될까요?”', gloss: '무도회 첫 만남·재회의 정형. 첫 춤 신청이 관계의 시작을 알린다.', use: '“모두가 그녀를 외면한 무도회에서, 단 한 사람이 손을 내밀었다.”' },
      { word: '“네 곁이 내 자리야.”', gloss: '신분·정치적 손해를 감수하고 여주 곁을 택하는 공개 선택의 대사.', use: '“황좌도 약혼도 버리고, 그가 그녀 옆에 섰다. ‘네 곁이 내 자리야.’”' },
      { word: '“내가 지켜줄게.”', gloss: '보호 서약의 기본형. 위기 구원 직전에 던져 감정을 확정한다.', use: '“검을 뽑아 그녀 앞을 막아서며, 그가 말했다. ‘내가 지켜줄게. 무슨 일이 있어도.’”' },
      { word: '“이름을 불러도 될까.”', gloss: '신분의 벽을 넘어 거리를 좁히려는 정중한 청. 호칭에서 이름으로의 이행이 관계 진전을 표시한다.', use: '“‘공녀님’ 대신, 그가 처음으로 그녀의 이름을 입에 담아도 되겠냐 물었다.”' },
      { word: '“네가 웃으면, 그걸로 됐어.”', gloss: '대가 없는 헌신을 드러내는 다정 대사. 보상보다 상대의 행복을 앞세운다.', use: '“무엇을 원하느냐는 물음에, 그는 답했다. ‘네가 웃으면, 그걸로 됐어.’”' },
      { word: '“다시는, 너를 혼자 두지 않아.”', gloss: '외로웠던 여주에게 건네는 동행의 서약. 버려진 과거를 가진 여주에게 함락의 한 방.', use: '“텅 빈 저택에 익숙하던 그녀에게, 그가 말했다. ‘다시는, 너를 혼자 두지 않아.’”' },
      { word: '“그 입에서 다른 남자 이름을 듣고 싶지 않아.”', gloss: '질투를 직설로 드러내는 집착 대사. 소유욕과 유치함이 묘하게 설렘을 만든다.', use: '“약혼자 이야기를 꺼내자, 그가 낮게 끊었다. ‘그 이름, 더는 듣고 싶지 않은데.’”' },
    ],
  },
  {
    key: 'pacing', label: '사이다·고구마·페이싱', icon: '⚖️', desc: '감정 리듬·연독을 좌우하는 전개 운용 용어',
    items: [
      { word: '공개 망신 역전', gloss: '무도회·연회·재판 등 만인 앞에서 악역의 죄가 폭로되고 여주가 공인받는 사이다의 정점.', use: '“연회장 한복판에서 그녀가 증거를 펼치자, 악녀의 가면이 산산이 부서졌다.”' },
      { word: '공개 선택·선언', gloss: '남주가 신분·정치 손해를 감수하고 만인 앞에서 ‘이 사람이 내 사람’이라 공표하는 클라이맥스.', use: '“황제가 만조백관 앞에서 그녀를 황후로 호명한 순간, 누구도 입을 열지 못했다.”' },
      { word: '자업자득식 자멸', gloss: '악역이 과한 응징 없이 스스로의 악행으로 무너지는 결말. 최근 트렌드의 ‘과하지 않은 결말’.', use: '“그녀는 손 하나 대지 않았다. 악녀는 제 거짓말의 무게에 깔려 무너졌다.”' },
      { word: '운명 전복 확정', gloss: '‘원작대로면 죽었어야 할 나’가 정반대의 결말(황후·여신·행복)을 쟁취하는 주제 정산.', use: '“원작에서 처형당한 그녀는, 이번 생에선 제국의 황후가 되었다.”' },
      { word: '첫 화 후킹', gloss: '회귀·빙의 선언, 충격적 처형·이혼·배신 장면으로 1~3화 안에 ‘왜 이 상황인지’를 던지는 도입.', use: '“1화 첫 문장은 늘 처형대거나 이혼장이다. 그래야 독자가 멈춘다.”' },
      { word: '심쿵 빈도 관리', gloss: '스킨십·달달 대사·남주 독백 같은 설렘 포인트를 일정 간격으로 분배하는 운용. 첫 설렘이 늦으면 이탈.', use: '“3화까지 심쿵이 없으면 위험하다. 적어도 손이라도 한 번 스쳐야 한다.”' },
      { word: '고구마 총량 통제', gloss: '답답함을 길게 끌지 않도록 관리하는 원칙. ‘고구마는 짧게, 사이다는 확실히.’', use: '“억울함은 두 화면 충분하다. 세 화를 넘기면 별점이 떨어진다.”' },
      { word: '초반 25화 생존선', gloss: '무료분(보통 1~25/30화) 안에 여주 능력·남주 떡밥·세계관 후킹을 다 보여줘야 유료 전환·연독이 잡힌다.', use: '“25화 안에 매력을 다 못 보여주면, 그 작품은 거기서 끝이다.”' },
      { word: '편당 5천 자·1편 1훅', gloss: '웹소설 한 편(약 5,000~5,500자)마다 떡밥·반전·심쿵 한 방을 배치하는 페이싱 단위.', use: '“5,200자 끝에 반전 한 줄. 그게 한 편의 완성이다.”' },
      { word: '후일담·외전', read: '後日譚·外傳', gloss: '본편 클라이맥스 직후 결혼·임신·육아·질투 코미디로 달달함을 보너스로 주는 번외.', use: '“본편은 즉위로, 외전은 첫아이의 백일잔치로 끝났다.”' },
      { word: '희생·구원 교차', gloss: '여주가 위기에 처하고 남주가(혹은 그 반대로) 목숨 걸고 구해 감정을 확정하는 결정타.', use: '“화살이 날아든 순간, 그가 제 몸으로 그녀를 덮었다.”' },
      { word: '인과적 정산', gloss: '노력·고생에 비례한 인정·신분 상승·사랑 쟁취·악역 응징을 명확히 결산하는 보상 서사.', use: '“흘린 눈물만큼, 그녀는 정확히 돌려받았다 ─ 사랑도, 자리도, 복수도.”' },
      { word: '3·3·3 리듬', gloss: '고구마(긴장)를 쌓되 3~5편 내에 작은 사이다로 환기하고, 큰 사이다는 아크 단위로 터뜨리는 감각적 페이싱.', use: '“작은 통쾌함으로 숨통을 틔워 주다, 한 권 끝에서 크게 한 방 터뜨린다.”' },
      { word: '비밀 폭로 위기', gloss: '회귀·빙의·정체가 들킬 뻔한 6단계 위기. 큰 오해·죽음 위협과 함께 중후반 긴장의 정점.', use: '“그가 내 일기장을 집어 든 순간 ─ 거기엔, 일어나지도 않은 미래가 적혀 있었다.”' },
      { word: '해피엔딩 기본값', gloss: '로판의 암묵적 약속. 비극·새드엔딩은 강한 사전 경고(태그) 없이는 배신으로 간주된다.', use: '“태그 없는 새드엔딩은, 독자에 대한 배신이다 ─ 로판의 불문율이다.”' },
      { word: '대리만족·감정 동일시', gloss: '독자가 여주에 빙의해 ‘내가 사랑받고 인정받는’ 만족을 얻는 장르의 근간. 여주 무력감의 장기화는 금기.', use: '“독자는 그녀가 되어 사랑받고 싶은 것이다 ─ 그 마음을 배신하면 안 된다.”' },
    ],
  },
  {
    key: 'tone', label: '말투·어조', icon: '🎭', desc: '신분·상황별 말씨와 로판 특유의 문체·어조',
    items: [
      { word: '귀족·궁중 어투(로판체)', gloss: '우아하고 절제된 존대. 가시 돋친 정중함으로 사교계 권력 다툼을 그린다.', use: '“‘공작님께서는 참으로 자비로우시군요. 소문과는 달리.’”' },
      { word: '여주 1인칭 내적 독백', gloss: '자기 비하·결심·계산이 교차하는 밀착 시점. 로판 정서 동일시의 핵심 문체.', use: '‘진정하자. 원작에선 여기서 내가 실수했어. 같은 함정에 두 번 빠질 순 없지.’' },
      { word: '남주 독백체(어조 급변)', gloss: '냉정한 외면과 격렬한 내면이 갈라지는 1인칭. 이중 시점 삽입에서 카타르시스를 만든다.', use: '겉: “관심 없다.” / 속: ‘심장이 미쳐 날뛴다. 제발 들키지 마라.’' },
      { word: '회귀자의 우위 독백', gloss: '미래를 아는 자의 차분한 우위·씁쓸함이 밴 내레이션. ‘이번엔 안다’의 어조.', use: '‘이번엔 안다. 저 미소 뒤에 무엇이 숨어 있는지.’' },
      { word: '집착광공의 낮은 어조', gloss: '낮게 깔리며 부드러우나 위협적인 말씨. 다정함과 광기가 한 문장에 공존한다.', use: '“‘어디 가려고? …괜찮아. 어디든, 내가 따라갈 테니까.’”' },
      { word: '혀 짧은 아기 말투(육아물)', gloss: '어린 여주의 “아빠… 시쪄” 식 발음. 보호자 함락의 결정적 한 방.', use: '“‘아빠, 시쪄어….’ 그 한마디에, 대공의 철벽이 무너졌다.”' },
      { word: '신탁·예언 어조', gloss: '운율·은유·모호함을 섞은 경구체. 해석의 여지를 남겨 긴장을 만든다.', use: '“붉은 달이 차오를 때, 잿더미에서 황후가 일어나리라.”' },
      { word: '시종·하인 공손체', gloss: '“아가씨/도련님”을 붙이는 깍듯한 말씨. 위계와 충직함, 때로 음모를 가린다.', use: '“‘아가씨, 차를 새로 우려 올릴까요?’ ─ 그 미소 뒤를, 그녀는 의심했다.”' },
      { word: '사교계 험담·뒷말체', gloss: '부채 뒤에서 속닥이는 우아한 험담. 고구마의 자잘한 원천이자 분위기 묘사.', use: '“‘들었어요? 그 영애, 파혼당했대요.’ 부채 너머로 웃음이 번졌다.”' },
      { word: '냉정→다정 톤 전환', gloss: '여주에게만 어조가 풀리는 차이. ‘차갑지만 나에게만 다정한 남주’를 말투로 구현.', use: '신하에겐 “물러가라.” / 그녀에겐 “…손이 차네. 이리 와.”' },
      { word: '시스템 메시지체', gloss: '(시스템 빙의) 대괄호·기계적 통보. 감정 없는 안내가 도리어 긴장을 준다.', use: '“[호감도가 임계치에 도달했습니다. 강제 이벤트가 발생합니다.]”' },
      { word: '현대인 빙의자의 갭 말투', gloss: '몸은 영애인데 속은 현대인이라 튀어나오는 능청·드립. 시대 어긋남이 웃음과 매력을 만든다.', use: '‘…이거, 21세기 기준으론 명백한 갑질인데.’ 그녀는 우아하게 미소만 지었다.' },
      { word: '독설·가시 돋친 우아체', gloss: '겉은 정중한 존대, 속은 칼날인 사교계 화법. 악녀·여주의 반격에서 사이다를 만든다.', use: '“‘어머, 그런 드레스도 용기가 있으시네요. 저라면 못 입을 텐데.’”' },
      { word: '아이의 직설·천진체', gloss: '(육아물) 사정을 모르는 아이의 솔직한 한마디가 어른들의 위선을 꿰뚫는 어조.', use: '“‘근데 아빠, 저 아줌마는 왜 거짓말해?’ 연회장이 순식간에 얼어붙었다.”' },
      { word: '냉혹한 황제 칙령체', gloss: '장중하고 단정적인 명령 어투. 권력의 무게와 비정함을 한 문장으로 누른다.', use: '“‘짐의 이름으로 명하노라.’ 그 한마디에 대신들의 고개가 일제히 숙여졌다.”' },
      { word: '편지·서신체', gloss: '봉인된 편지의 정중하고 절제된 문어체. 직접 못 한 말을 담아 떡밥·고백을 전한다.', use: '“‘…부디 몸 상하지 마십시오. 회신은 바라지 않습니다.’ ─ 발신인은 없었다.”' },
    ],
  },
  {
    key: 'desc', label: '감정·신체 묘사', icon: '🌹', desc: '심쿵을 빚는 신체 반응·외모·온도 묘사의 정형',
    items: [
      { word: '심장 박동·얼굴 열기', gloss: '심쿵의 신체 클로즈업 기본기. 두근거림·달아오름으로 감정을 ‘보여준다’.', use: '“그의 입김이 귓가에 닿자, 심장이 제멋대로 뛰기 시작했다.”' },
      { word: '시선 회피·손의 떨림', gloss: '말로 못 하는 마음을 몸짓으로 누설하는 묘사. 부끄러움·동요의 신호.', use: '“그는 눈을 마주치지 못하고, 찻잔을 든 손끝을 미세하게 떨었다.”' },
      { word: '체온·온도 변화', gloss: '“차가운 줄 알았던 그의 손끝에 온기가…” 식. 냉남주의 마음이 녹는 정형 묘사.', use: '“얼음 같다던 그의 손이, 그녀의 뺨에 닿자 거짓말처럼 따뜻했다.”' },
      { word: '보라·금빛 눈동자', gloss: '로판 미남의 비현실적 눈 색. 보라·금·붉은 눈동자가 ‘특별함’의 표식이 된다.', use: '“달빛 아래, 그의 보랏빛 눈동자가 그녀를 가두듯 응시했다.”' },
      { word: '은발·흑발의 절대미남', gloss: '‘신이 빚은 듯한 외모’의 정형. 은발=차가움·고귀, 흑발=서늘함·신비의 코드.', use: '“은발이 달빛에 흩어졌다. 인간이라기엔 지나치게 완벽한 얼굴이었다.”' },
      { word: '공주님 안기(가로안기)', gloss: '위기·기절 순간 남주가 여주를 가로로 안아 드는 정형 스킨십. 보호·설렘의 한 컷.', use: '“다리가 풀려 주저앉으려는 그녀를, 그가 가뿐히 안아 들었다.”' },
      { word: '벽치기(벽쿵)', gloss: '벽으로 몰아 가두는 근접 스킨십. 긴장과 설렘이 정점에 닿는 구도.', use: '“퇴로를 막듯, 그가 그녀의 머리 옆 벽을 짚었다.”' },
      { word: '손목 잡아끌기', gloss: '급박하게 손목을 붙들어 끄는 동작. 독점·구원·강요의 정서를 동시에 전한다.', use: '“말없이 손목을 잡아끈 그를, 그녀는 끝내 뿌리치지 못했다.”' },
      { word: '귓가의 속삭임', gloss: '귀 가까이 낮게 말하는 묘사. 거리와 온도를 좁혀 심쿵을 만든다.', use: '“그가 몸을 기울여, 오직 그녀만 듣게 속삭였다.”' },
      { word: '눈물·붉어진 눈가', gloss: '억눌렸던 감정이 터지는 클로즈업. 사이다·고백 직전의 정서적 방아쇠.', use: '“참았던 눈물이 끝내 차올라, 그녀의 눈가가 붉게 물들었다.”' },
      { word: '머리카락 쓸어 넘기기', gloss: '얼굴에 흘러내린 머리를 넘겨 주는 다정한 손짓. 거리를 좁히는 정형 묘사.', use: '“그가 그녀의 흐트러진 머리카락을, 손끝으로 천천히 귀 뒤로 넘겨 주었다.”' },
      { word: '내려다보는 시선·키 차이', gloss: '남주가 여주를 내려다보는 구도. 보호·압도·설렘의 권력 거리를 시각화.', use: '“한 뼘은 더 큰 그가 그녀를 내려다보자, 그늘이 두 사람을 감쌌다.”' },
      { word: '숨이 멎는·말문이 막히는', gloss: '상대의 미모·고백에 압도되는 순간의 정형. 시간이 멈춘 듯한 정지의 묘사.', use: '“달빛 아래 돌아본 그의 얼굴에, 그녀는 잠시 숨 쉬는 법을 잊었다.”' },
      { word: '귓불·목덜미가 붉어짐', gloss: '얼굴 외의 부위로 동요를 누설하는 클로즈업. 숨기려 할수록 들통나는 설렘.', use: '“아무렇지 않은 척했지만, 그의 귓불이 천천히 붉게 물들고 있었다.”' },
      { word: '맞닿은 손·얽힌 손가락', gloss: '손에서 시작되는 접촉의 정형. 깍지·맞잡음으로 거리와 마음이 좁혀진다.', use: '“그가 그녀의 손가락 사이로, 천천히 제 손가락을 끼워 넣었다.”' },
      { word: '향기·체취의 기억', gloss: '후각으로 각인되는 끌림. 특정 향이 곧 그 사람을 떠올리게 하는 정서적 장치.', use: '“스치는 바람에 익숙한 향이 묻어났다 ─ 그가 가까이 왔다는 뜻이었다.”' },
    ],
  },
  {
    key: 'place', label: '공간·소품', icon: '🏰', desc: '로판 장면을 짓는 단골 무대와 소품',
    items: [
      { word: '무도회장', gloss: '사교·정치·로맨스가 교차하는 핵심 무대. 첫 춤·공개 망신 역전이 벌어지는 곳.', use: '“샹들리에 불빛 아래, 모든 시선이 계단을 내려오는 그녀에게 쏠렸다.”' },
      { word: '황궁 정원·온실', gloss: '밀담·고백·독대의 무대. 장미·온실 화초가 감정의 은유로 쓰인다.', use: '“달빛 정원, 장미 덩굴 아래에서 그가 처음으로 마음을 내비쳤다.”' },
      { word: '도서관·서재', gloss: '비밀·정보·우연한 독대의 공간. 책장 사이에서의 가까운 거리가 설렘을 만든다.', use: '“높은 책장 사이, 같은 책으로 뻗은 두 손이 닿았다.”' },
      { word: '다과회·티타임', gloss: '귀부인들의 사교 의례. 우아한 험담과 정보전, 견제가 오가는 작은 전장.', use: '“찻잔이 부딪는 소리 사이로, 영애들의 눈치 싸움이 시작됐다.”' },
      { word: '마차', read: '馬車', gloss: '이동 중 단둘이 갇히는 밀폐 공간. 강제 동석·고백·습격이 벌어지는 단골 무대.', use: '“흔들리는 마차 안, 좁은 자리에 마주 앉은 둘 사이로 침묵이 흘렀다.”' },
      { word: '아카데미·기숙학교', gloss: '또래 관계·라이벌·로맨스가 얽히는 학원물 무대. 신분 너머의 만남이 가능해진다.', use: '“아카데미 입학식 날, 그녀는 원작의 모든 등장인물과 한자리에 섰다.”' },
      { word: '연회·만찬', read: '宴會·晩餐', gloss: '권력과 음모가 얽히는 공식 자리. 독살·폭로·공개 선언의 클라이맥스 무대.', use: '“황제의 만찬에서, 누군가의 잔에 독이 들었다는 걸 그녀만 알았다.”' },
      { word: '신전·예배당', gloss: '신탁·성녀 책봉·서약의 성소. 여주의 특별함이 공인되는 신성한 무대.', use: '“성녀 책봉식 날, 신상 앞의 빛이 오직 그녀에게로 모였다.”' },
      { word: '약혼반지·가문 문장', gloss: '관계·신분을 증명하는 소품. 반지의 수락·반환이 곧 관계의 전환점.', use: '“그가 내민 가문의 인장 반지를, 그녀는 한참을 바라보았다.”' },
      { word: '손수건·편지', gloss: '마음을 전하는 고전적 소품. 흘린 손수건·밀봉된 편지가 떡밥과 오해를 만든다.', use: '“그가 건넨 손수건 귀퉁이엔, 그의 가문 문장이 곱게 수놓여 있었다.”' },
      { word: '독·해독제', gloss: '암투·정략의 무기. 미래 지식으로 독을 간파·예방하는 여주의 활약 소재.', use: '“찻잔에서 풍기는 희미한 단내 ─ 회귀 전, 나를 죽인 바로 그 독이었다.”' },
      { word: '드레스·예복', gloss: '신분·상황을 드러내는 의상 소품. 갈아입는 장면이 변신·신분 전환을 시각화한다.', use: '“낡은 외출복을 벗고 황후의 예복을 두르자, 거울 속 그녀는 다른 사람 같았다.”' },
      { word: '발코니·테라스', gloss: '무도회장에서 빠져나와 단둘이 마주하는 반(半)밀폐 공간. 고백·밀담·달빛 키스의 무대.', use: '“시끄러운 연회장을 등지고 나선 발코니, 그곳엔 먼저 나온 그가 있었다.”' },
      { word: '집무실·황제의 서재', gloss: '권력자 남주의 영역. 결재 서류 더미 사이로 여주가 찾아드는 독대·긴장의 공간.', use: '“밤늦은 집무실, 산더미 같은 서류 너머로 그가 처음으로 미소 지었다.”' },
      { word: '회중시계·목걸이(증표)', gloss: '인연·언약을 담은 휴대 소품. 주고받음·되돌려줌이 관계의 결정적 전환을 만든다.', use: '“그가 늘 지니던 회중시계 안에, 빛바랜 그녀의 초상이 들어 있었다.”' },
      { word: '계약서·혼인 서약서', gloss: '계약 결혼·정략혼을 명문화한 소품. 조항 하나하나가 깨지며 진심으로 가는 이정표가 된다.', use: '“‘서로에게 간섭하지 않는다’던 계약서 한 줄을, 가장 먼저 어긴 건 그였다.”' },
    ],
  },
  {
    key: 'cliche', label: '클리셰·전복', icon: '🔁', desc: '인지하고 변주할 단골 설정 — 그대로 쓰거나, 비틀거나',
    items: [
      { word: '“내가 죽고 나서야 그는 후회했다”', gloss: '프롤로그의 정형. 비극적 과거를 먼저 던져 회귀·복수의 동력을 깐다.', use: '전복: 후회조차 하지 않은 무심함이 더 큰 동력이 되게 한다.' },
      { word: '“그저 조용히 이혼당하고 싶었을 뿐인데”', gloss: '소박한 목표가 거대한 사건으로 번지는 도입 정형. 이혼·도망이 역설적 후킹.', use: '전복: 이혼하려 할수록 남주의 집착이 깊어지는 역방향 전개.' },
      { word: '차갑지만 나에게만 다정한 남주', gloss: '얼음 공작·황태자가 여주에게만 빗장을 푸는 로판 최고 인기 코드.', use: '전복: 그 다정함이 처음엔 철저히 계산된 연기였다 ─ 진심이 되기 전까지.' },
      { word: '원작에서 죽는 악역에 빙의', gloss: '파멸 플래그 회피가 목표가 되는 빙의물 공식.', use: '전복: 원작 자체가 거짓이거나, 빙의 시점부터 줄거리가 어긋나 미래 지식이 통하지 않는다.' },
      { word: '“호감도가… 왜 오르는 거지?”', gloss: '거리를 두려는데 도리어 남주 마음이 올라가는 시스템·빙의물 정형.', use: '전복: 호감도가 오를수록 위험해지는(폭주·집착 트리거) 역설 설계.' },
      { word: '버려진 출신 → 숨겨진 황녀·신의 자손', gloss: '천대받던 여주가 사실 고귀한 혈통이었다는 신분 상승 반전.', use: '전복: 혈통은 가짜였고, 여주가 ‘스스로’ 자리를 쟁취해 정당화한다.' },
      { word: '계약 결혼 → 진심', gloss: '형식상 결혼이 점차 진짜 사랑으로 이행하는 정석 구조.', use: '전복: 계약이 끝나도 서로 모른 척하다, 잃을 뻔한 뒤에야 진심을 깨닫는다.' },
      { word: '라이벌 악녀의 물 끼얹기·모함', gloss: '연회·다과회에서 여주를 망신 주는 단골 고구마 장치.', use: '전복: 모함이 도리어 여주의 무고함을 공개적으로 증명하는 사이다로 뒤집힌다.' },
      { word: '예언 속 ‘그 아이’', gloss: '신탁·예언서가 여주를 특별한 존재로 지목하는 정당화 장치.', use: '전복: 예언이 오역·조작이었거나, 여주가 예언을 ‘거부’해 운명을 직접 쓴다.' },
      { word: '회귀했더니 모두가 나를 사랑한다', gloss: '회귀 후 과거의 적·무심하던 이들이 돌변해 헌신하는 사이다 정형.', use: '전복: 회귀로도 바뀌지 않는 한 사람이 있어, 그 이유가 핵심 미스터리가 된다.' },
      { word: '집착광공의 감금·독점', gloss: '다크로판의 강한 코드. 매혹과 위험의 경계를 오간다(태그 경고 필수).', use: '전복: 감금하려던 남주가 여주의 자유를 끝내 존중하며 자기 욕망과 싸운다.' },
      { word: '갑자기 각성하는 새 힘(데우스 엑스 마키나)', gloss: '클라이맥스에서 복선 없이 튀어나오는 힘 ─ 로판/판타지 공통 최대 금기.', use: '대안: 결정적 힘·정보는 초반에 떡밥으로 심어 두고 회수한다.' },
      { word: '민폐·수동적 여주', gloss: '능력·결단 없이 구원만 기다리는 여주. 독자 비판 1순위(동일시 실패).', use: '대안: 마법·정치·경영·전생 지식 등 ‘여주가 직접 푸는’ 해결 수단을 쥐여 준다.' },
      { word: '남주의 일관성 붕괴(양다리·과거 여자)', gloss: '집착·헌신을 표방하다 다른 여성에게 흔들리는 전개 ─ 강한 금기.', use: '대안: 과거 인연은 ‘완전히 정리된 것’으로 못 박고, 온리 유 코드를 흔들지 않는다.' },
      { word: '시한부·저주 선고', gloss: '여주(또는 남주)가 시한부·저주에 걸려 절절함을 키우는 다크/비극 코드. 해소·반전이 카타르시스를 만든다.', use: '전복: 시한부 선고 자체가 적의 조작이었거나, 사랑이 저주를 푸는 열쇠가 된다.' },
      { word: '기억상실', gloss: '한쪽이 기억을 잃어 관계를 처음부터 다시 쌓는 단골 장치. 남용하면 작위적이라는 비판.', use: '대안: 기억을 잃어도 몸·감정이 먼저 상대를 알아보게 해, 운명적 끌림으로 정당화한다.' },
    ],
  },
]

const LS = 'sry:tool:romfan-lexicon:'
const ALL_KEY = '__all__'
type Flat = { cat: CatDef; item: Term }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 한 항목을 한 덩이 텍스트로(복사·스니펫·프로젝트 공통)
const termText = (f: Flat): string => {
  const head = `${f.cat.icon} [${f.cat.label}] ${f.item.word}${f.item.read ? ` (${f.item.read})` : ''}`
  const lines = [head, f.item.gloss]
  if (f.item.use) lines.push(`예) ${f.item.use}`)
  return lines.join('\n')
}

export default function RomfanLexicon({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 활용: 다른 도구가 장르를 넘겨주면 안내에 반영(이 사전은 로맨스판타지 전용).
  const incomingGenre = typeof payload?.genre === 'string' ? (payload.genre as string) : ''
  // payload.q / payload.search: 외부 도구가 검색어를 넘기면 첫 진입 시 적용.
  const incomingQuery = typeof payload?.q === 'string' ? (payload.q as string)
    : typeof payload?.search === 'string' ? (payload.search as string) : ''

  const [query, setQuery] = useState(incomingQuery)
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 즐겨찾기: "catKey::word"
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<Flat | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)
  const copyTimer = useRef<number | null>(null)

  // 영속
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])
  // 언마운트 정리
  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
  }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])

  // 조합수: 어휘 사전에서 "한 장면에 심을 어휘 팔레트 조합"의 경우의 수.
  //  - 카테고리 10개에서 각각 한 항목씩 ‘뽑거나 안 뽑거나’ → ∏(items_i + 1) - 1 (최소 1개).
  //  - 각 카테고리 12~15개 × 10개 분류 → 13^10 규모 ≈ 1조를 가뿐히 넘는다(핵심 생성형 사전).
  const comboCount = useMemo(() => {
    let p = 1
    for (const c of CATS) p *= (c.items.length + 1)
    return p - 1
  }, [])
  const comboText = useMemo(() => {
    const n = comboCount
    if (n >= 1e16) return `${(n / 1e16).toFixed(1)}경 가지 이상`
    if (n >= 1e12) return `${(n / 1e12).toFixed(2)}조 가지 이상`
    if (n >= 1e8) return `${(n / 1e8).toFixed(2)}억 가지 이상`
    if (n >= 1e4) return `${(n / 1e4).toFixed(0)}만 가지`
    return `${n.toLocaleString()}가지`
  }, [comboCount])

  const favKey = (catKey: string, word: string) => `${catKey}::${word}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base: Flat[] = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[favKey(c.key, item.word)])
    if (q) {
      base = base.filter(({ cat: c, item }) =>
        item.word.toLowerCase().includes(q) ||
        (item.read || '').toLowerCase().includes(q) ||
        item.gloss.toLowerCase().includes(q) ||
        (item.use || '').toLowerCase().includes(q) ||
        c.label.toLowerCase().includes(q))
    }
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    const pool: Flat[] = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.word === prev.item.word && pick.cat.key === prev.cat.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return pick
    })
  }, [cat])

  const toggleFav = (catKey: string, word: string) => {
    const k = favKey(catKey, word)
    setFavs((prev) => { const next = { ...prev }; if (next[k]) delete next[k]; else next[k] = true; return next })
  }

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* graceful */ })
  }

  // 스니펫 저장(생성 글감)
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: termText(f),
      source: '로판 어휘·표현 사전',
      tags: ['로맨스판타지', '어휘', f.cat.label, f.item.word],
    })
    flash(`‘${f.item.word}’을(를) 스니펫으로 저장했습니다.`)
  }

  // 프로젝트 자료 〈설정/어휘〉 폴더에 메모 추가
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(f.cat.icon + ' ' + f.cat.label)} · ${escapeHtml(f.item.word)}${f.item.read ? ' (' + escapeHtml(f.item.read) + ')' : ''}</b></p>`,
      `<p>${escapeHtml(f.item.gloss)}</p>`,
      f.item.use ? `<p style="color:#888"><i>예) ${escapeHtml(f.item.use)}</i></p>` : '',
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '설정/어휘',
      title: `${f.item.word} (로판 어휘)`,
      bodyHtml,
      meta: { 장르: '로맨스판타지', 분류: f.cat.label },
    })
    if (id) flash(`프로젝트 자료 〈설정/어휘〉에 ‘${f.item.word}’을(를) 추가했습니다.`)
  }

  // 현재 화면의 항목 전부를 한 문서로 묶어 프로젝트에 추가
  const allToProject = () => {
    if (!hasProjectBridge() || filtered.length === 0) return
    const body = filtered.map((f) =>
      `<p><b>${escapeHtml(f.cat.icon + ' ' + f.item.word)}${f.item.read ? ' (' + escapeHtml(f.item.read) + ')' : ''}</b> — ${escapeHtml(f.item.gloss)}` +
      (f.item.use ? `<br/><span style="color:#888"><i>예) ${escapeHtml(f.item.use)}</i></span>` : '') + '</p>'
    ).join('')
    const where = cat === ALL_KEY ? '전체' : (CATS.find((c) => c.key === cat)?.label || '')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '설정/어휘',
      title: `로판 어휘집 — ${where}${query ? ` · ‘${query}’` : ''} (${filtered.length}개)`,
      bodyHtml: body, meta: { 장르: '로맨스판타지', 분류: where },
    })
    if (id) flash(`현재 목록 ${filtered.length}개를 프로젝트 〈설정/어휘〉에 추가했습니다.`)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>로맨스판타지(로판)</b> 특유의 신분어·회빙환·심쿵 대사·밈·상투구 <b>{total}개</b>를 10개 분류로 모았습니다.
        검색·무작위로 찾아 클릭 복사하고, 마음에 들면 스니펫·프로젝트에 담으세요.
        {incomingGenre && incomingGenre !== '로맨스판타지' && (
          <span style={{ color: 'var(--accent)' }}> (요청 장르 ‘{incomingGenre}’ — 이 사전은 로맨스판타지 전용입니다.)</span>
        )}
        <br /><Emoji e="🎲"/> 한 장면의 어휘 팔레트 조합은 <b>{comboText}</b> ({comboCount.toLocaleString()})로 짤 수 있습니다.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="단어·뜻·예문으로 검색 (예: 회귀, 빙의, 집착, 사이다, 황후)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 펼침 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="✨"/> 전체
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on}
              title={c.desc}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={c.icon}/> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 무작위 어휘</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 무작위 결과 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon}/> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.word}</span>
            {random.item.read && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{random.item.read}</span>}
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0 4px' }}>{random.item.gloss}</div>
          {random.item.use && <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--muted)', fontStyle: 'italic' }}>예) {random.item.use}</div>}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(termText(random), 'rand')}>{copiedKey === 'rand' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
            <button className="minibtn" onClick={() => copy(random.item.word, 'rand-w')}>{copiedKey === 'rand-w' ? <>✓ 복사됨</> : <><Emoji e="🔤"/> 단어만</>}</button>
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="💾"/> 스니펫</button>
            <button className="linkbtn" onClick={() => toProject(random)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 어휘를 프로젝트 자료 〈설정/어휘〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.word)}>
              {favs[favKey(random.cat.key, random.item.word)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
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

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 어휘가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const fk = favKey(c.key, item.word)
            const isFav = !!favs[fk]
            const copyId = 'item:' + fk
            return (
              <div key={fk} style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon}/> {c.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
                    title="클릭하면 단어를 복사합니다"
                    onClick={() => copy(item.word, copyId + ':w')}>{item.word}</span>
                  {item.read && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{item.read}</span>}
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                    onClick={() => toggleFav(c.key, item.word)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 5 }}>{item.gloss}</div>
                {item.use && <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--muted)', fontStyle: 'italic', marginTop: 4 }}>예) {item.use}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <button className="minibtn" onClick={() => copy(termText({ cat: c, item }), copyId)}>
                    {copiedKey === copyId ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
                  </button>
                  <button className="minibtn" onClick={() => saveSnippet({ cat: c, item })}><Emoji e="💾"/> 스니펫</button>
                  <button className="linkbtn" onClick={() => toProject({ cat: c, item })} disabled={!hasProjectBridge()}
                    title={hasProjectBridge() ? '이 어휘를 프로젝트 자료 〈설정/어휘〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                    <Emoji e="📄"/> 프로젝트에 추가
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 하단: 일괄 동작 + 연계 */}
      <div className="linkbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
        <button className="linkbtn" onClick={allToProject} disabled={!hasProjectBridge() || filtered.length === 0}
          title={hasProjectBridge() ? '현재 목록 전체를 한 문서로 프로젝트 〈설정/어휘〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
          <Emoji e="📄"/> 목록 전체 프로젝트에 추가
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('romfan-devices', { genre: '로맨스판타지' })}
          title="로판 서사 장치·전개 사전 열기"><Emoji e="🎴"/> 서사 장치</button>
        <button className="linkbtn" onClick={() => openToolLinked('romfan-tropes', { genre: '로맨스판타지' })}
          title="로판 트로프·관습 체크리스트 열기"><Emoji e="📐"/> 트로프·관습</button>
        <button className="linkbtn" onClick={() => openToolLinked('romfan-charforge', { genre: '로맨스판타지' })}
          title="로판 캐릭터 생성기 열기"><Emoji e="👤"/> 캐릭터 생성</button>
        <button className="linkbtn" onClick={() => openToolLinked('name-mixer', { genre: '로맨스판타지' })}
          title="이름 조합기 열기"><Emoji e="🔤"/> 이름 조합기</button>
        <span style={{ ...hint, marginLeft: 'auto' }}>
          어휘는 정답이 아니라 출발점입니다. 클리셰는 그대로 쓰거나, 비틀어 보세요.
        </span>
      </div>
    </div>
  )
}
