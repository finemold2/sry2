// 사후세계·신화적 장소 사전 — 판타지/호러 세계관 설계를 위한 로컬 자료집.
//  세계 신화의 사후세계·낙원·지옥·연옥·경계 공간·심판 관념·강·문·안내자를 직접 작성한 요약으로 정리한다.
//  자급식: react 와 './linkbus' 외 import 없음. 외부 API/네트워크/미디어 없음(전부 로컬 자작 데이터).
//  카테고리 펼침 + 검색 + 무작위 + 클릭복사 + 수집함/스니펫/프로젝트 연계 + 세계관 위키 열기.
//  ※ 백과 베끼기 없이 직접 작성한 요약·표현. 서사용 영감의 출발점이지 종교·신화 고증 매뉴얼이 아니다.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, addToStash, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'afterlife-myth-ref',
  name: '사후세계·신화 장소 사전',
  icon: '⚰️',
  group: '리서치·자료',
  intro: '세계 신화의 사후세계·낙원·지옥·연옥·경계 공간·심판 관념을 정리해 판타지·호러 세계관 설계에 활용',
  w: 700,
  h: 720,
}

// ---------- 항목 형(型) ----------
interface Entry {
  name: string          // 장소·관념 이름
  aka?: string          // 원어·별칭·동의어
  origin?: string       // 어느 신화·전승에서 왔는가
  vibe?: string         // 분위기·심상(한 줄 인상)
  who?: string          // 누가 머무는가(어떤 영혼이 가는가)
  geography?: string    // 지형·구조·경계
  ruler?: string        // 다스리는 신·존재
  entry?: string        // 들어가는 길·관문·통과 조건
  detail?: string       // 묘사 디테일·작가 메모
  twist?: string        // 비틀기·서사 활용 아이디어
}
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ---------- 로컬 대량 자료집(직접 작성) ----------
const CATS: CatDef[] = [
  {
    key: 'underworld', label: '저승·죽음의 나라', icon: '🌑',
    note: '죽은 자가 모두 모이는 지하·서쪽의 나라. 선악을 가리기 전, 혹은 가린 뒤의 거대한 머무름.',
    items: [
      {
        name: '하데스(저승)', aka: '하이데스·명부(冥府)',
        origin: '그리스 신화',
        vibe: '햇빛 한 점 없는 잿빛 평원. 죽은 자들의 그림자가 박쥐떼처럼 속삭인다.',
        who: '선악을 막론하고 거의 모든 죽은 자의 혼령. 영웅·악인·평범한 자가 한데 섞인다.',
        geography: '다섯 강(스틱스·아케론·코키토스·플레게톤·레테)이 둘러싼 지하. 아스포델 들판, 엘리시온, 타르타로스로 갈린다.',
        ruler: '하데스(플루톤)와 왕비 페르세포네. 심판관 미노스·라다만티스·아이아코스.',
        entry: '카론의 나룻배로 강을 건너야 한다. 뱃삯(오볼로스) 동전을 입에 물려야 통과.',
        detail: '망자는 레테의 물을 마시면 생전 기억을 잃는다. 머리 셋 달린 케르베로스가 출구를 지킨다.',
        twist: '동전을 못 받은 자는 강가에 백 년을 떠돈다—매장 못 한 시신의 원혼이 산 자에게 매달리는 이야기로.',
      },
      {
        name: '두아트', aka: '두아트(Duat)·서쪽 나라',
        origin: '이집트 신화',
        vibe: '밤마다 태양선이 가로지르는 강과 사막의 지하 세계. 별빛과 위협이 교차한다.',
        who: '시신을 보존(미라)하고 의례를 갖춘 자. 심장 무게 심판을 통과한 영혼.',
        geography: '열두 시간(밤)으로 나뉜 통로. 강·문·불의 호수·뱀 아펩이 도사린 위험 지대를 지난다.',
        ruler: '오시리스가 다스린다. 아누비스가 인도하고 토트가 기록한다.',
        entry: '“사자의 서”에 적힌 주문과 길안내를 알아야 관문(문지기)을 통과한다.',
        detail: '심장을 마아트의 깃털과 저울에 단다. 무거우면 괴물 암무트가 삼켜 두 번째 죽음(완전 소멸)에 이른다.',
        twist: '주문 한 줄을 잘못 외우면 문이 닫힌다—기억을 잃은 망자가 통과 암호를 더듬는 추리극.',
      },
      {
        name: '헬', aka: '헬헤임(Helheim)',
        origin: '북유럽 신화',
        vibe: '안개와 서리가 낀 어둑한 북쪽 땅. 굶주림과 권태가 공기처럼 무겁다.',
        who: '전장에서 죽지 못한 자—병들어, 늙어, 사고로 죽은 ‘평범한 죽음’의 혼.',
        geography: '아홉 세계의 가장 낮은 곳. 갸들 강과 메아리치는 다리(이른 다리)를 건너야 닿는다.',
        ruler: '반은 산 사람, 반은 시체의 얼굴을 한 여신 헬.',
        entry: '굘 다리(황금 지붕)를 건너 시신의 문(나그라인드)을 지난다. 지옥의 개 가름이 짖는다.',
        detail: '헬의 식탁 이름은 ‘굶주림’, 칼은 ‘기근’, 침상은 ‘병상’. 모든 것이 결핍의 이름을 가졌다.',
        twist: '전사가 아니어서 발할라에 못 간 영웅—명예 없는 죽음을 받아들이는 비극의 무대로.',
      },
      {
        name: '황천(黃泉)', aka: '요미노쿠니(黄泉の国)',
        origin: '일본 신화',
        vibe: '한번 그곳의 음식을 먹으면 돌아올 수 없는, 부패와 어둠의 지하.',
        who: '죽은 모든 자. 산 자가 따라 내려가면 영영 갇힐 위험이 있다.',
        geography: '평탄한 비탈(요모쓰히라사카)을 내려가 거대한 바위로 막힌 경계 너머의 땅.',
        ruler: '죽음으로 변모한 여신 이자나미.',
        entry: '비탈을 내려가면 닿지만, 그곳 음식을 먹으면 산 자의 세계로 못 돌아온다.',
        detail: '뒤돌아보지 말라는 금기—이자나기는 아내의 썩어가는 모습을 보고 달아나 바위로 입구를 막았다.',
        twist: '“돌아보지 마라”의 금기 파기—연인을 데려오려다 영원히 잃는 한국적 변주(오르페우스 신화의 동아시아판).',
      },
      {
        name: '디위(地獄)·황천길', aka: '저승·명부(冥府)',
        origin: '한국·동아시아 무속/불교 습합',
        vibe: '안개 낀 강과 들을 지나 시왕(十王) 앞에 서는, 절차와 기다림의 나라.',
        who: '죽은 모든 자. 사십구일 동안 일곱 관문을 차례로 통과한다.',
        geography: '저승 강(삼도천)·들·열 개의 법정. 망자는 차사(저승사자)에게 이끌려 시왕전을 차례로 거친다.',
        ruler: '염라대왕을 비롯한 시왕(열 명의 왕). 인도자는 저승사자.',
        entry: '저승사자 셋(일직·월직·강림)이 명부를 들고 데리러 온다. 망자는 차례로 재판을 받는다.',
        detail: '업경대(業鏡臺)라는 거울에 생전 행적이 그대로 비친다. 거짓말이 통하지 않는다.',
        twist: '명부에 이름이 잘못 올라 ‘아직 죽을 때가 아닌’ 자가 끌려온다—저승의 행정 착오 코미디/스릴러.',
      },
      {
        name: '쿠르(불귀의 나라)', aka: '이르칼라·“돌아올 수 없는 땅”',
        origin: '메소포타미아(수메르·아카드) 신화',
        vibe: '먼지와 진흙을 먹고 사는 어둠의 집. 빛도 물도 없는 메마른 영원.',
        who: '신분 고하 막론 모든 죽은 자. 왕도 거지도 진흙 옷을 입는다.',
        geography: '일곱 개의 성문으로 둘러싸인 지하 도시. 들어갈 때마다 옷과 장신구를 하나씩 벗어야 한다.',
        ruler: '여신 에레쉬키갈과 그 배우자 네르갈.',
        entry: '일곱 문을 차례로 지나며 왕관·귀걸이·목걸이·가슴장식·허리띠·팔찌·옷을 차례로 빼앗긴다.',
        detail: '망자는 새처럼 깃털 옷을 입고 어둠 속에서 진흙을 먹는다. 산 자의 제사 음식만이 위안.',
        twist: '문마다 무언가를 내놓아야 하는 강하(降下)—주인공이 ‘자아의 일곱 겹’을 차례로 벗는 내면 여정의 알레고리.',
      },
      {
        name: '미크틀란', aka: '미크틀란(아홉 층 지하)',
        origin: '아즈텍 신화',
        vibe: '아홉 단계의 시련을 사 년에 걸쳐 통과해야 하는, 인내의 지하 여정.',
        who: '평범한 죽음(병·노환)을 맞은 영혼. 특별한 죽음은 다른 사후세계로 간다.',
        geography: '아홉 층. 부딪치는 산, 흑요석 칼날 바람, 화살의 들, 심장을 먹는 짐승 등 단계마다 시험.',
        ruler: '죽음의 신 믹틀란테쿠틀리와 여신 믹테카시우아틀.',
        entry: '죽은 자는 개(쇼로이츠쿠인틀리)의 인도로 강을 건너 아홉 시련을 차례로 통과한다.',
        detail: '사 년의 여정 끝에 영혼은 마침내 소멸하여 안식한다. 부장품이 시련을 돕는다.',
        twist: '죽은 이를 돕도록 함께 묻힌 개—저승길의 충직한 동반자라는 모티프를 판타지 영혼 안내수(獸)로.',
      },
    ],
  },
  {
    key: 'paradise', label: '낙원·영웅의 안식처', icon: '🌅',
    note: '선택받은 자, 용감한 자, 의로운 자가 가는 빛과 풍요의 땅. 보상으로서의 영원.',
    items: [
      {
        name: '엘리시온', aka: '엘리시움·축복받은 들판',
        origin: '그리스 신화',
        vibe: '늘 봄인 들판. 부드러운 서풍이 불고 음악과 경기와 향연이 끝없이 이어진다.',
        who: '신들에게 사랑받은 영웅, 의롭게 산 자, 선택받은 혼.',
        geography: '저승의 한 구역, 혹은 세상 서쪽 끝 ‘축복받은 자들의 섬’. 햇빛과 초원이 가득하다.',
        ruler: '크로노스 혹은 라다만티스가 다스린다는 전승.',
        entry: '심판에서 의로움이 인정되거나 신의 총애를 받아야 한다.',
        detail: '레테 강물을 마시고 세 번 의롭게 환생하면 ‘축복받은 자들의 섬’으로 영영 옮겨간다는 변형.',
        twist: '낙원의 영웅이 권태에 빠진다—완벽한 안식이 오히려 형벌인 ‘영원의 지루함’ 테마.',
      },
      {
        name: '발할라', aka: '발홀(Valhöll)·전사자의 전당',
        origin: '북유럽 신화',
        vibe: '방패로 지붕을 인 황금 전당. 매일 싸우고 매일 부활하며 밤마다 잔치한다.',
        who: '전장에서 용맹히 죽은 전사(에인헤랴르)의 절반. 발키리가 골라 데려온다.',
        geography: '아스가르드의 거대한 전당. 540개의 문, 각 문으로 800명의 전사가 동시에 출진할 수 있다.',
        ruler: '주신 오딘.',
        entry: '발키리가 전장에서 가장 용맹한 자를 선택해 데려온다.',
        detail: '낮엔 서로 베고 죽지만 밤이면 상처가 아물어 멧돼지 고기와 벌꿀술로 향연. 라그나로크를 대비한 영원한 훈련.',
        twist: '명예로운 죽음을 위해 일부러 무모하게 싸우는 전사—‘죽어야 보상받는’ 비뚤어진 영광의 논리.',
      },
      {
        name: '플라네크 알라르(서쪽 낙원)', aka: '아아루(Aaru)·갈대밭',
        origin: '이집트 신화',
        vibe: '나일강처럼 풍요로운 영원의 농토. 노동조차 평화로운 풍년의 땅.',
        who: '심장 무게 심판을 통과한 의로운 영혼.',
        geography: '동쪽에 자리한 갈대의 들판. 생전과 똑같은 강·밭·집이 이상화되어 펼쳐진다.',
        ruler: '오시리스의 왕국.',
        entry: '마아트의 깃털보다 가벼운 심장—거짓 없는 삶을 산 자만 들어간다.',
        detail: '망자가 직접 밭을 갈아야 하므로, 대신 일해줄 작은 인형(우샤브티)을 함께 묻었다.',
        twist: '낙원에서도 노동이 필요하다—‘일하지 않는 자는 천국에서도 굶는다’는 역설적 세계 규칙.',
      },
      {
        name: '티르 너 노그', aka: '티르 너 노그(Tír na nÓg)·청춘의 땅',
        origin: '아일랜드(켈트) 신화',
        vibe: '늙음도 병도 죽음도 없는 영원한 젊음의 섬. 시간이 흐르지 않는다.',
        who: '요정족(투어허 데 다넌)과 그들에게 초대받은 드문 인간.',
        geography: '서쪽 바다 너머, 혹은 안개 속 호수 아래의 숨겨진 섬.',
        ruler: '요정 왕가.',
        entry: '요정의 인도나 마법의 말을 타고 바다를 건너야 닿는다.',
        detail: '그곳의 하루가 인간 세상의 백 년. 돌아온 자가 땅에 발을 디디면 순식간에 늙어 재가 된다.',
        twist: '연인을 만나러 잠깐 고향에 돌아온 사이 수백 년이 흘러—시간 격차가 빚는 비극의 귀향(우라시마 효과).',
      },
      {
        name: '아발론', aka: '사과의 섬·“축복의 섬”',
        origin: '아서왕 전설(브리튼)',
        vibe: '안개에 싸인 사과나무의 섬. 상처를 치유하고 왕을 기다리게 하는 신비의 안식처.',
        who: '치명상을 입은 영웅, 마법사·여신의 비호를 받는 자.',
        geography: '호수 혹은 바다 너머 안개 속의 섬. 인간의 길로는 닿을 수 없다.',
        ruler: '치유의 여신·요정 자매(모건 등).',
        entry: '죽음 직전, 마법의 배에 실려 강이나 호수를 건너야 한다.',
        detail: '아서왕은 죽지 않고 이곳에서 잠들어 ‘언젠가 돌아올 왕’이 되었다고 전한다.',
        twist: '죽음과 잠의 경계—‘완전히 죽지 않은’ 영웅을 깨우러 가는 탐색(퀘스트)의 목적지로.',
      },
      {
        name: '톨란(꽃의 땅·태양의 집)', aka: '토난친틀라·전사의 태양 동행',
        origin: '아즈텍 신화',
        vibe: '전사와 출산 중 죽은 여인이 태양을 호위하며 노래하는, 빛으로 가득한 하늘.',
        who: '전장에서 죽은 전사, 제물로 바쳐진 자, 출산 중 숨진 여인.',
        geography: '태양이 지나는 하늘길. 동쪽은 전사, 서쪽은 여전사(시우아테테오)가 호위한다.',
        ruler: '태양신 토나티우.',
        entry: '명예로운 죽음(전사·제물·출산)으로만 들어간다.',
        detail: '사 년 뒤 전사들은 벌새·나비로 환생해 꽃 사이를 난다. 가장 영광스러운 사후.',
        twist: '“좋은 죽음”의 기준이 산 자를 폭력으로 내모는 신앙—명예사를 강요하는 사회의 어두운 동력.',
      },
    ],
  },
  {
    key: 'hell', label: '지옥·형벌의 심연', icon: '🔥',
    note: '죄지은 자가 떨어지는 고통과 응보의 자리. 형벌은 대개 죄의 거울상이다.',
    items: [
      {
        name: '타르타로스', aka: '심연(Abyss)',
        origin: '그리스 신화',
        vibe: '하늘에서 모루를 떨어뜨려 아흐레를 떨어져야 닿는, 저승보다 더 깊은 어둠의 감옥.',
        who: '신에게 도전한 거인(티탄), 신을 모독한 대죄인.',
        geography: '청동 벽과 세 겹 밤으로 둘러싸인 가장 깊은 구덩이. 하데스 아래에 있다.',
        ruler: '본디 원초적 심연 자체. 후엔 제우스가 티탄을 가둔 감옥.',
        entry: '신의 심판으로 떨어진다. 살아 돌아온 자는 거의 없다.',
        detail: '시시포스의 바위, 탄탈로스의 갈증, 익시온의 불수레—죄에 꼭 맞는 영원한 형벌이 유명하다.',
        twist: '형벌이 곧 죄의 메타포—‘끝없이 같은 일을 반복하는’ 저주를 현대 직장·관계의 알레고리로.',
      },
      {
        name: '나라카(지옥)', aka: '나락(奈落)·여러 층의 지옥',
        origin: '인도·불교 신화',
        vibe: '얼음과 불, 칼날과 가마솥으로 채워진 여러 층. 헤아릴 수 없이 긴 수명의 고통.',
        who: '악업을 쌓은 영혼. 죄질에 따라 머무는 층과 기간이 달라진다.',
        geography: '여덟 뜨거운 지옥, 여덟 차가운 지옥 등 수많은 층. 가장 아래는 무간(無間)지옥.',
        ruler: '염마(야마)왕이 죄를 심판한다.',
        entry: '생전의 업(業)에 따라 자동으로 떨어진다. 신의 변덕이 아니라 인과의 법칙.',
        detail: '영원한 형벌이 아니다—업이 다하면 벗어나 다시 윤회한다. 지옥조차 임시 거처.',
        twist: '“영원하지 않은 지옥”—형기를 마치면 나오는 응보의 세계가 오히려 더 무섭다(끝없는 환생의 굴레).',
      },
      {
        name: '게헨나', aka: '게엔나·“불의 골짜기”',
        origin: '유대·기독교 전승(힌놈 골짜기 유래)',
        vibe: '꺼지지 않는 불과 들끓는 쓰레기 더미. 도시 밖 저주받은 골짜기의 심상.',
        who: '회개 없이 죽은 죄인, 신을 저버린 자.',
        geography: '예루살렘 밖 실제 골짜기(쓰레기 소각지)에서 비롯된, 영원한 형벌의 상징적 장소.',
        ruler: '전승에 따라 다름—심판의 신, 혹은 타락한 천사.',
        entry: '최후의 심판으로 가려진 자가 던져진다.',
        detail: '“구더기도 죽지 않고 불도 꺼지지 않는” 곳—소멸이 아닌 영속하는 고통의 이미지.',
        twist: '실재했던 더러운 골짜기가 ‘지옥’이 된 과정—세속의 장소가 신화로 굳는 ‘장소 신성화’를 세계관에 차용.',
      },
      {
        name: '디스의 도시(하下지옥)', aka: '단테 지옥의 하부',
        origin: '단테 “신곡”(중세 문학)',
        vibe: '불타는 성벽 도시. 위쪽은 욕정·탐식, 아래로 갈수록 폭력·기만·배신의 죄인이 갇힌다.',
        who: '죄질에 따라 아홉 동심원에 나뉘어 갇힌 영혼.',
        geography: '깔때기 모양의 아홉 원. 가장 깊은 바닥엔 얼음 호수(코키토스)와 루키페르가 있다.',
        ruler: '얼음에 갇힌 사탄(루키페르).',
        entry: '“여기 들어오는 자, 모든 희망을 버려라”—지옥문을 지나 카론의 배로 강을 건넌다.',
        detail: '바닥은 불이 아니라 얼음이다—가장 큰 죄(배신)는 사랑의 부재, 곧 차가움으로 그려진다.',
        twist: '죄마다 형벌이 ‘반사(콘트라파소)’된다—분열을 일으킨 자는 몸이 갈라지는 식. 형벌 설계의 황금률.',
      },
      {
        name: '디 디위(地獄)·시왕의 형옥', aka: '불교 시왕 지옥',
        origin: '동아시아 불교·무속 습합',
        vibe: '열 명의 왕 앞을 차례로 지나며 죄를 묻는, 절차적이고 관료적인 형벌의 법정.',
        who: '사십구일 재판 끝에 악업이 가려진 영혼.',
        geography: '열 개의 법정과 그 아래 여러 형옥(끓는 솥·칼산·얼음·혀 뽑는 곳 등).',
        ruler: '시왕(十王)—진광왕부터 오도전륜왕까지 열 명.',
        entry: '저승사자에게 끌려와 이레마다 한 왕씩, 모두 열 번의 심판을 받는다.',
        detail: '거짓을 말한 혀, 훔친 손—생전 죄지은 신체 부위에 맞춰 형벌이 내려진다.',
        twist: '저승의 관료제—뇌물·청탁·서류 누락이 통하는 ‘부패한 명부’를 풍자/스릴러로.',
      },
    ],
  },
  {
    key: 'limbo', label: '연옥·중간 세계·경계', icon: '🌫️',
    note: '천국도 지옥도 아닌 사이의 땅. 정화·대기·표류, 혹은 산 자와 죽은 자의 경계.',
    items: [
      {
        name: '연옥', aka: '푸르가토리오(Purgatorio)·정죄계',
        origin: '가톨릭 신학·단테 “신곡”',
        vibe: '죄를 씻으며 천국을 향해 오르는 일곱 단(테라스)의 산. 고통이되 희망이 있는 곳.',
        who: '구원받았으나 아직 정화가 필요한 영혼.',
        geography: '바다 한가운데 솟은 일곱 단의 산(칠죄종에 대응). 정상엔 지상 낙원(에덴).',
        ruler: '천사들이 단마다 문을 지킨다.',
        entry: '구원의 자격은 갖췄으되 죄의 때를 정화해야 통과한다. 산 자의 기도가 기간을 줄인다.',
        detail: '지옥과 달리 형벌엔 ‘끝’이 있다—오를수록 가벼워지고 마침내 천국으로 향한다.',
        twist: '산 자의 기도가 죽은 자의 형기를 줄인다—이승과 저승이 ‘거래’로 이어진 세계 설정.',
      },
      {
        name: '림보', aka: '림보(Limbus)·변옥(邊獄)',
        origin: '중세 기독교 신학',
        vibe: '벌도 보상도 없는 어스름한 변두리. 잘못은 없으나 천국엔 못 드는 자들의 영원한 유보.',
        who: '세례받지 못한 채 죽은 아기, 그리스도 이전의 의인.',
        geography: '지옥의 가장자리, 어둠 없는 어스름의 평원. 고통은 없으나 천국의 빛도 없다.',
        ruler: '명확한 지배자 없음—‘부재’ 자체가 형벌.',
        entry: '죄가 아니라 ‘때를 놓친’ 사정으로 머문다.',
        detail: '단테는 이곳에 호메로스·소크라테스 등 고결한 이교도를 두었다—존경하나 구원하지 못하는 영역.',
        twist: '‘잘못이 없는데 갇힌’ 자들—제도의 사각지대에 떨어진 무고한 영혼의 항변을 주제로.',
      },
      {
        name: '바르도', aka: '중음(中陰)·티베트 중간 상태',
        origin: '티베트 불교',
        vibe: '죽음과 다음 생 사이를 떠도는 환영과 빛의 49일. 마주하는 모든 것이 마음의 투영.',
        who: '죽은 직후부터 환생 전까지의 모든 의식(意識).',
        geography: '실재하는 장소라기보다 ‘상태’. 평화로운 신과 분노한 신의 환영이 차례로 나타난다.',
        ruler: '외부의 지배자가 아닌, 죽은 자 자신의 업과 마음.',
        entry: '숨이 멎는 순간 자동으로 진입한다.',
        detail: '나타나는 빛과 형상이 곧 자기 마음—두려워 달아나면 더 낮은 환생으로, 알아보면 해탈한다.',
        twist: '‘보이는 모든 것이 내 마음의 거울’—주인공이 자기 공포와 욕망의 환영을 통과하는 내면 던전.',
      },
      {
        name: '삼도천(三途川)', aka: '사이노카와라(어린아이의 강가)',
        origin: '일본 불교·민간신앙',
        vibe: '저승 입구의 강. 생전의 업에 따라 건너는 길(여울·다리·급류)이 갈린다.',
        who: '죽어 저승으로 향하는 모든 자. 강가엔 부모보다 먼저 죽은 아이들이 머문다.',
        geography: '저승 어귀를 흐르는 강. 죄가 가벼우면 다리로, 무거우면 깊고 거센 물을 건넌다.',
        ruler: '강가의 노파 ‘다쓰에바’가 옷을 빼앗아 죄의 무게를 단다.',
        entry: '강을 건너면 비로소 저승 본토로 들어선다. 뱃삯(육문전)이 필요하다는 변형.',
        detail: '먼저 죽은 아이들은 강가에서 부모를 그리며 돌탑을 쌓는다. 지장보살이 이들을 거둔다.',
        twist: '건너는 길이 죄에 따라 달라지는 강—같은 강을 두고 인물마다 전혀 다른 풍경을 보는 다중 시점.',
      },
      {
        name: '경계의 황혼(트와일라잇)', aka: '“두 세계의 사이”',
        origin: '범신화적 경계 모티프(직접 구성)',
        vibe: '낮도 밤도 아닌 영원한 땅거미. 산 자도 죽은 자도 아닌 것들이 스치는 회색의 길목.',
        who: '죽음을 받아들이지 못한 혼, 길을 잃은 영, 산 자가 우연히 흘러든다.',
        geography: '안개와 갈대, 끊긴 다리와 꺼진 등불. 익숙한 거리가 비틀린 채 펼쳐진다.',
        ruler: '없거나, 길잡이를 자처하는 수상한 안내자.',
        entry: '깊은 잠·임사·짙은 안개 속에서 무심코 발을 들인다.',
        detail: '시간이 고여 있다. 같은 길을 돌고 돌아 출구를 찾지 못한다.',
        twist: '도시 괴담·호러의 무대—멀쩡한 동네가 한밤에 ‘경계’로 변하는 한국형 도시 전설로 변주.',
      },
      {
        name: '아스포델 들판', aka: '무미(無味)의 평원',
        origin: '그리스 신화',
        vibe: '선하지도 악하지도 않은 ‘그저 평범했던’ 다수가 흐릿하게 떠도는 회색 들판.',
        who: '특별히 의롭지도 죄짓지도 않은, 대다수의 평범한 망자.',
        geography: '하데스의 가장 넓은 구역. 창백한 수선화(아스포델)가 끝없이 핀 들.',
        ruler: '하데스의 영역.',
        entry: '심판에서 ‘이도 저도 아니’라 판정된 혼이 머문다.',
        detail: '엘리시온의 환희도 타르타로스의 고통도 없다—기억은 흐려지고 욕망도 식은 무위의 영원.',
        twist: '가장 무서운 사후가 ‘아무것도 아닌 것’—극적 보상도 처벌도 없는 ‘무관심한 영원’의 공포.',
      },
    ],
  },
  {
    key: 'judgment', label: '심판·저울·강·문', icon: '⚖️',
    note: '죽음과 사후를 잇는 장치들. 심판자·저울·기록·통과의례·경계의 안내자.',
    items: [
      {
        name: '심장의 저울(마아트)', aka: '“두 진리의 전당”',
        origin: '이집트 신화',
        vibe: '깃털 하나와 심장을 마주 놓는 침묵의 저울. 거짓이 무게가 되어 드러나는 순간.',
        who: '두아트를 통과하려는 모든 영혼.',
        geography: '오시리스의 법정. 마흔두 신 앞에서 ‘부정 고백’을 외운다.',
        ruler: '심판자 오시리스, 저울지기 아누비스, 기록자 토트, 삼키는 자 암무트.',
        entry: '망자는 “나는 ~하지 않았다”를 마흔두 번 선언해 결백을 주장한다.',
        detail: '심장이 깃털보다 무거우면 암무트가 삼켜 ‘두 번째 죽음(완전 소멸)’에 든다.',
        twist: '거짓말이 물리적 무게가 되는 세계—죄책감이 곧 질량으로 측정되는 판타지 규칙.',
      },
      {
        name: '업경대(業鏡臺)', aka: '죄를 비추는 거울',
        origin: '동아시아 불교',
        vibe: '저승 법정에 놓인 거대한 거울. 변명도 망각도 통하지 않고 생전 행적이 그대로 비친다.',
        who: '시왕 앞에 선 모든 망자.',
        geography: '명부의 각 법정에 놓인 거울대.',
        ruler: '시왕이 거울을 증거 삼아 판결한다.',
        entry: '재판마다 거울 앞에 세워진다.',
        detail: '거울은 선행과 악행을 가리지 않고 ‘있는 그대로’ 재생한다. 감춘 죄가 만천하에 드러난다.',
        twist: '잊고 싶은 기억이 강제 재생되는 거울—주인공이 가장 숨기고픈 과거와 대면하는 클라이맥스 장치.',
      },
      {
        name: '스틱스 강', aka: '“증오의 강”·서약의 강',
        origin: '그리스 신화',
        vibe: '이승과 저승을 가르는 검은 물. 신들조차 이 강을 두고 한 맹세는 어길 수 없다.',
        who: '저승으로 향하는 모든 망자가 건너야 한다.',
        geography: '하데스를 아홉 굽이로 둘러싼 강. 나머지 네 강이 여기로 흘러든다.',
        ruler: '뱃사공 카론이 망자를 실어 나른다.',
        entry: '뱃삯(오볼로스)이 있어야 카론의 배에 오른다. 못 내면 강가를 떠돈다.',
        detail: '강물에 몸을 담그면 불사가 된다는 전승(아킬레우스의 발뒤꿈치)도 여기서 비롯됐다.',
        twist: '신도 못 어기는 ‘강에 건 맹세’—약속을 어기면 신성을 잃는 마법적 서약 규칙으로 차용.',
      },
      {
        name: '레테 강', aka: '망각의 강',
        origin: '그리스 신화',
        vibe: '한 모금 마시면 생전의 모든 기억이 지워지는 고요한 강.',
        who: '환생을 앞두거나 안식에 들 망자.',
        geography: '하데스의 다섯 강 중 하나. 망각의 들판을 흐른다.',
        ruler: '하데스의 영역.',
        entry: '망자가 안식·환생 전에 그 물을 마신다.',
        detail: '이 물을 마셔야 비로소 슬픔과 미련에서 풀려난다. 마시지 않으면 기억에 사로잡혀 떠돈다.',
        twist: '일부러 레테를 마시지 않은 혼—기억을 붙든 채 산 자에게 돌아오는 ‘원한 어린 귀신’의 동기.',
      },
      {
        name: '기메(천국의 문)', aka: '진주문(Pearly Gates)',
        origin: '서구 기독교 대중 전승',
        vibe: '구름 위에 선 빛나는 관문. 명부(생명책)를 들고 들고남을 가리는 문지기가 지킨다.',
        who: '구원받아 천국에 드는 영혼.',
        geography: '천상의 입구. 진주로 된 열두 문이라는 묘사가 흔하다.',
        ruler: '문지기(전승상 베드로)와 생명책.',
        entry: '생명책에 이름이 올라야 들어간다.',
        detail: '대중문화에서 ‘심판대 농담’의 단골 무대—생전 행적을 따져 입장 여부를 가린다.',
        twist: '생명책의 행정 오류·이름 동명이인—천국 입국 심사를 관료 풍자/법정극으로.',
      },
      {
        name: '비프로스트', aka: '무지개 다리',
        origin: '북유럽 신화',
        vibe: '하늘과 땅(신계와 인간계)을 잇는 불타는 무지개. 라그나로크 때 무너질 운명의 다리.',
        who: '신들이 오가는 통로. 인간은 함부로 건너지 못한다.',
        geography: '아스가르드와 미드가르드(인간계)를 잇는 삼색의 다리.',
        ruler: '잠들지 않는 파수꾼 헤임달이 지킨다.',
        entry: '신들만 건널 수 있다. 종말의 날 거인들이 밟고 올라오며 무너진다.',
        detail: '한쪽 색은 불이라 함부로 디디면 타 죽는다—신성한 길이자 최후의 방어선.',
        twist: '‘무너질 줄 아는 다리’—세계의 종말이 예정된 세계관에서, 건너는 행위 자체가 종말을 앞당기는 긴장.',
      },
      {
        name: '저승사자·안내자', aka: '차사(差使)·사이코폼프(영혼 인도자)',
        origin: '범신화(이집트 아누비스·그리스 헤르메스·한국 저승사자 등)',
        vibe: '죽음의 순간 나타나 영혼을 저승길로 데려가는 존재. 두렵되 길잡이.',
        who: '갓 숨을 거둔 모든 망자.',
        geography: '이승과 저승 사이의 길을 함께 걷는다.',
        ruler: '죽음의 신·명부의 왕을 섬기는 사자(使者).',
        entry: '정해진 명부에 따라 망자를 데리러 온다.',
        detail: '한국 저승사자는 검은 도포에 패랭이, 명부를 들고 셋이 함께 온다. 대접(사잣밥)으로 달래기도.',
        twist: '인도자가 망자에게 정이 드는 이야기—직무와 연민 사이에서 갈등하는 저승사자 주인공.',
      },
    ],
  },
]

const LS = 'sry:tool:afterlife-myth-ref:'
const ALL = '__all__'

type Flat = { cat: CatDef; item: Entry }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 항목 → 표시 필드(라벨 포함). 정의된 안전 키만 노출.
const TEXT_FIELDS: { k: keyof Entry; label: string }[] = [
  { k: 'aka', label: '원어·별칭' },
  { k: 'origin', label: '신화·전승' },
  { k: 'vibe', label: '분위기' },
  { k: 'who', label: '누가 머무는가' },
  { k: 'geography', label: '지형·구조' },
  { k: 'ruler', label: '다스리는 자' },
  { k: 'entry', label: '들어가는 길' },
  { k: 'detail', label: '묘사 디테일' },
  { k: 'twist', label: '서사 비틀기' },
]

function fieldToString(item: Entry, k: keyof Entry): string {
  const v = item[k]
  return v ? String(v) : ''
}

function plainText(f: Flat): string {
  const lines = [`⚰️ ${f.item.name}  (${f.cat.label})`]
  for (const fd of TEXT_FIELDS) {
    const v = fieldToString(f.item, fd.k)
    if (v) lines.push(`· ${fd.label}: ${v}`)
  }
  return lines.join('\n')
}

function bodyHtml(f: Flat): string {
  const rows = TEXT_FIELDS
    .map((fd) => ({ fd, v: fieldToString(f.item, fd.k) }))
    .filter((x) => x.v)
    .map(({ fd, v }) => `<p><b>${escapeHtml(fd.label)}</b>: ${escapeHtml(v)}</p>`)
    .join('')
  return [
    `<p><b>${escapeHtml(f.cat.icon + ' ' + f.cat.label)} · ${escapeHtml(f.item.name)}</b></p>`,
    rows,
    `<p><i>※ 판타지·호러 세계관 설계를 위한 창작 참고 자료. 신화 고증이 아니라 영감의 출발점입니다. 세계관에 맞게 비틀어 쓰세요.</i></p>`,
  ].join('')
}

export default function AfterlifeMythRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.title / payload.q 로 검색 힌트가 오면 활용(다른 도구에서 키워드를 갖고 열릴 수 있음)
  const hint = typeof payload?.title === 'string' ? (payload.title as string)
    : typeof payload?.q === 'string' ? (payload.q as string) : ''

  const [query, setQuery] = useState(hint)
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL
  })
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [random, setRandom] = useState<Flat | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const copyTimer = useRef<number | null>(null)
  const toastTimer = useRef<number | null>(null)

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  // 언마운트 정리: 복사·토스트 타이머 취소
  useEffect(() => () => {
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
  }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  const favKey = (catKey: string, name: string) => `${catKey}::${name}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base: Flat[] = cat === ALL ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[favKey(c.key, item.name)])
    if (q) {
      base = base.filter(({ cat: c, item }) => {
        if (c.label.toLowerCase().includes(q)) return true
        if (item.name.toLowerCase().includes(q)) return true
        return TEXT_FIELDS.some((fd) => fieldToString(item, fd.k).toLowerCase().includes(q))
      })
    }
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    const pool: Flat[] = cat === ALL ? flatAll()
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

  const toggleFav = (catKey: string, name: string) => {
    const k = favKey(catKey, name)
    setFavs((prev) => { const next = { ...prev }; if (next[k]) delete next[k]; else next[k] = true; return next })
  }
  const toggleExpand = (k: string) => setExpanded((prev) => ({ ...prev, [k]: !prev[k] }))

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* graceful */ })
  }

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2400)
  }

  // 수집함에 담기 — addToStash({kind:'note', ...})
  const toStash = (f: Flat) => {
    if (!hasStash()) { flash('수집함에 연결되어 있지 않습니다.'); return }
    addToStash({ kind: 'note', label: `사후세계: ${f.item.name}`, text: plainText(f) })
    flash(`수집함에 ‘${f.item.name}’ 자료를 담았습니다.`)
  }

  // 스니펫 저장(글감) — addToLibrary('snippets', ...)
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: `[사후세계 자료] ${plainText(f)}`,
      source: '사후세계·신화 장소 사전',
      tags: ['사후세계', f.cat.label, f.item.name],
    })
    flash(`스니펫 라이브러리에 ‘${f.item.name}’ 자료를 저장했습니다.`)
  }

  // 프로젝트 자료에 추가 — addToProject(...)
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '사후세계·신화 장소',
      title: `${f.item.name} (${f.cat.label})`,
      bodyHtml: bodyHtml(f),
      meta: { 분류: f.cat.label, 전승: f.item.origin || '', 지배자: f.item.ruler || '' },
    })
    if (id) flash(`프로젝트 자료 〈사후세계·신화 장소〉에 ‘${f.item.name}’을(를) 추가했습니다.`)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hintStyle: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  const renderFields = (item: Entry) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 7 }}>
      {TEXT_FIELDS.map((fd) => {
        const v = fieldToString(item, fd.k)
        if (!v) return null
        const isTwist = fd.k === 'twist'
        return (
          <div key={fd.k} style={{ fontSize: 12.5, lineHeight: 1.55 }}>
            <span style={{ color: isTwist ? 'var(--ok)' : 'var(--accent)', fontWeight: 600, marginRight: 6 }}>
              {isTwist ? <><Emoji e="✍" /> </> : ''}{fd.label}
            </span>
            <span>{v}</span>
          </div>
        )
      })}
    </div>
  )

  const renderCard = (f: Flat, keyPrefix: string) => {
    const { cat: c, item } = f
    const fk = favKey(c.key, item.name)
    const isFav = !!favs[fk]
    const exKey = keyPrefix + ':' + fk
    const isOpen = !!expanded[exKey]
    const copyId = keyPrefix + ':copy:' + fk
    return (
      <div key={exKey} style={card}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /> {c.label}</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</span>
          <button
            className="minibtn"
            title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
            onClick={() => toggleFav(c.key, item.name)}
            style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}
          >
            {isFav ? '★' : '☆'}
          </button>
        </div>
        {item.vibe && <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)' }}>{item.vibe}</div>}

        {isOpen && renderFields(item)}

        <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
          <button className="minibtn" onClick={() => toggleExpand(exKey)}>
            {isOpen ? '▲ 접기' : '▼ 자세히'}
          </button>
          <button className="minibtn" onClick={() => copy(plainText(f), copyId)}>
            {copiedKey === copyId ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}
          </button>
        </div>

        {/* 연계 버튼 묶음 */}
        <div className="linkbar" style={{ marginTop: 8 }}>
          <span className="linkbar-label">연계:</span>
          <button className="linkbtn" onClick={() => toStash(f)} disabled={!hasStash()}
            title={hasStash() ? '이 자료를 플로팅 수집함에 담기' : '수집함에 연결되어 있지 않습니다'}>
            <Emoji e="📎" /> 수집함
          </button>
          <button className="linkbtn" onClick={() => saveSnippet(f)}
            title="스니펫 라이브러리에 글감으로 저장">
            <Emoji e="🧩" /> 스니펫
          </button>
          <button className="linkbtn" onClick={() => toProject(f)} disabled={!hasProjectBridge()}
            title={hasProjectBridge() ? '프로젝트 자료 〈사후세계·신화 장소〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
            <Emoji e="📄" /> 프로젝트에 추가
          </button>
          <button className="linkbtn" onClick={() => openToolLinked('world-wiki', { title: item.name, q: item.name })}
            title="세계관 위키를 이 항목 이름으로 열기">
            <Emoji e="🌐" /> 세계관 위키
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={hintStyle}>
        세계 신화의 사후세계·낙원·지옥·연옥·경계 공간·심판 관념 <b>{total}개</b>를 직접 작성한 요약으로 모았습니다.
        검색·필터로 찾고, ‘서사 비틀기’를 단서 삼아 나만의 사후세계를 설계하세요.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="장소·신화·관념으로 검색 (예: 강, 심판, 저울, 북유럽, 환생)"
        style={{
          padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none',
        }}
      />

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button
          className="minibtn"
          onClick={() => setCat(ALL)}
          aria-pressed={cat === ALL}
          style={{ borderColor: cat === ALL ? 'var(--accent)' : 'var(--border)', color: cat === ALL ? 'var(--text)' : 'var(--muted)' }}
        >
          <Emoji e="🌍" /> 전체
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button
              key={c.key}
              className="minibtn"
              onClick={() => setCat(c.key)}
              aria-pressed={on}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}
            >
              <Emoji e={c.icon} /> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 장소</button>
        <button
          className="minibtn"
          onClick={() => setOnlyFav((v) => !v)}
          aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}
        >
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <span style={{ ...hintStyle, marginLeft: 'auto' }}>{filtered.length}개 표시 / 총 {total}개</span>
      </div>

      {/* 무작위 결과(펼친 상태로) */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={rollRandom} title="다시 뽑기"><Emoji e="🎲" /> 다시</button>
            <button className="minibtn" onClick={() => setRandom(null)} title="닫기">✕</button>
          </div>
          {renderFields(random.item)}
          <div className="linkbar" style={{ marginTop: 9 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => copy(plainText(random), 'rand:copy')}>
              {copiedKey === 'rand:copy' ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}
            </button>
            <button className="linkbtn" onClick={() => toStash(random)} disabled={!hasStash()}><Emoji e="📎" /> 수집함</button>
            <button className="linkbtn" onClick={() => saveSnippet(random)}><Emoji e="🧩" /> 스니펫</button>
            <button className="linkbtn" onClick={() => toProject(random)} disabled={!hasProjectBridge()}><Emoji e="📄" /> 프로젝트에 추가</button>
            <button className="linkbtn" onClick={() => openToolLinked('world-wiki', { title: random.item.name, q: random.item.name })}><Emoji e="🌐" /> 세계관 위키</button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{
          background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8,
          padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)',
        }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav
              ? '☆ 아직 즐겨찾기한 항목이 없습니다. 별을 눌러 모아 보세요.'
              : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map((f) => renderCard(f, 'list'))
        )}
      </div>

      <div style={hintStyle}>
        <Emoji e="⚠" /> 신화 고증 매뉴얼이 아니라 창작을 위한 영감의 출발점입니다. 전승은 지역·시대마다 갈리니, 세계관에 맞게 비틀고 섞어 쓰세요.
      </div>
    </div>
  )
}
