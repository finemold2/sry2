// 시대상 레퍼런스 — 사극·역사물 고증을 위한 로컬 자작 자료집.
//  시대(고대/중세/근세/근대/현대)·문화권별 의식주·기술·계급·화폐·통신·이동수단·일상 디테일을 표로 정리.
//  자급식: react 와 './linkbus' 외 import 없음. 외부 API 없음(전부 로컬 자작 데이터).
//  카테고리(시대) 펼침 + 검색 + 무작위 + 클릭복사 + 수집함·스니펫·프로젝트 연계.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, addToStash, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'historical-era-ref',
  name: '시대상 레퍼런스',
  icon: '🏺',
  group: '리서치·자료',
  intro: '고대~현대 문화권별 의식주·기술·계급·화폐·통신·이동수단·일상 디테일을 표로 정리한 사극·역사물 고증 자료',
  w: 720,
  h: 700,
}

// ---------- 항목 형(型) ----------
// 한 '항목'은 특정 시대·문화권의 한 단면을 표 형태로 담는다. 모든 텍스트는 자작 요약(백과 베끼기 금지).
interface Era {
  id: string            // 고유 키
  name: string          // 항목명(예: '신라·통일신라', '에도 시대 일본')
  region: string        // 문화권
  span: string          // 대략 연대(서사용)
  blurb: string         // 한 줄 분위기 요약
  food: string          // 의식주 — 식(食)
  clothing: string      // 의식주 — 의(衣)
  housing: string       // 의식주 — 주(住)
  tech: string          // 기술·도구
  classOrder: string    // 계급·신분 질서
  money: string         // 화폐·경제
  comms: string         // 통신·기록
  travel: string        // 이동수단
  daily: string         // 일상 디테일(시간·식사·놀이·관습)
  pitfall: string       // 고증 함정(작가가 자주 틀리는 점)
}
interface EraCat { key: string; label: string; icon: string; note: string; items: Era[] }

// ---------- 로컬 대량 자료집 (시대 5분기 × 문화권) ----------
const CATS: EraCat[] = [
  {
    key: 'ancient', label: '고대', icon: '🏛️',
    note: '문자·도시·국가가 막 자리 잡던 시기. 신화와 정치가 뒤섞이고, 청동·철의 도입이 세상을 바꾼다. 노예·신관·왕의 세계.',
    items: [
      {
        id: 'gojoseon', name: '고조선·삼한', region: '한반도', span: '대략 기원전 ~ 기원후 초',
        blurb: '청동에서 철로 넘어가는 부족연맹·소국의 세계. 제천 행사와 농경이 삶의 중심.',
        food: '조·기장·보리 같은 잡곡이 주식, 콩·팥. 토기에 끓이거나 시루에 쪄 먹었고, 사냥·채집·물고기로 단백질을 보탰다. 소금은 귀한 교역품.',
        clothing: '삼베·모시 같은 마직, 짐승 가죽. 머리를 틀어 올리거나 상투를 틀었고, 청동 장식·옥 구슬로 신분을 드러냈다.',
        housing: '땅을 파 내려간 움집(수혈주거)에 기둥과 짚지붕. 마을은 환호(둥근 도랑)나 목책으로 둘렀고, 화덕이 집의 중심.',
        tech: '청동 의기(거울·검·방울)에서 철제 농기구·무기로 이행. 고인돌·옹관 같은 거석·매장 기술. 토기 제작.',
        classOrder: '군장(족장)·천군(제사장)이 위, 일반 읍락민, 그 아래 노비. 제정(祭政)이 아직 덜 분리됨.',
        money: '화폐 이전의 물물교환이 기본. 곡식·포(베)·철 덩이가 가치 척도. 명도전 같은 외래 화폐가 교역로에 흘러듦.',
        comms: '문자 기록은 매우 제한적(한자가 들어오기 전·초기). 구전·제의·바위그림으로 기억을 전했다.',
        travel: '도보가 기본, 우마차와 나룻배. 강과 해안을 따라 교역. 말은 귀하고 군사·지배층의 것.',
        daily: '하늘에 제사 지내는 제천 행사(영고·동맹·무천 류)가 큰 마을 행사. 농사 절기에 삶이 묶임. 점복으로 길흉을 물었다.',
        pitfall: '이 시기에 갑옷 입은 ‘장군’, 화폐 시장, 한자 문서를 흔히 그리면 시대 착오. 통일된 단일 왕국으로 단순화하지 말 것.',
      },
      {
        id: 'rome', name: '로마 공화정·제정', region: '지중해', span: '대략 기원전 5세기 ~ 기원후 5세기',
        blurb: '도로·수도·법으로 묶인 도시 제국. 시민과 노예, 빵과 검투의 세계.',
        food: '밀로 만든 빵·죽(풀스)이 주식, 올리브유·포도주·생선젓(가룸). 부자는 다과상 연회, 서민은 노점·간이식당에서 끼니. 향신료는 사치.',
        clothing: '시민은 토가(겉옷)와 튜닉, 여성은 스톨라. 신분·관직에 따라 자주색 띠. 가죽 샌들. 보석·금팔찌로 부를 과시.',
        housing: '부유층은 안뜰 있는 도무스·교외 별장(빌라), 서민은 다층 공동주택(인술라)에 세입. 도시엔 공중목욕탕·수도교.',
        tech: '아치·콘크리트·수도교·포장도로. 수차·기중기, 정교한 측량. 군단의 공성 병기.',
        classOrder: '시민(상층 원로원·기사 계급 / 평민)과 비시민, 그 아래 방대한 노예. 해방노예라는 중간층도 존재.',
        money: '금화(아우레우스)·은화(데나리우스)·동화로 이뤄진 정교한 주화 경제. 세금·군 급료가 화폐로 돌았다.',
        comms: '밀랍판·파피루스 두루마리에 라틴어. 제국 역참(쿠르수스 푸블리쿠스)으로 공문 전달. 비문·포고문으로 공지.',
        travel: '잘 닦인 군용 도로망과 이정표, 노새·말·가마, 지중해 항해. 부자는 가마꾼이 든 가마로 이동.',
        daily: '낮을 12시간으로 나눠 해시계로 가늠. 아침 인사(클리엔테스)·목욕탕 사교·원형경기장 관람. 노예 노동이 일상을 떠받침.',
        pitfall: '감자·토마토·옥수수는 신대륙 작물이라 등장 불가. 모두가 토가를 일상복으로 입은 것도 아님(주로 공적 자리).',
      },
      {
        id: 'egypt', name: '고대 이집트', region: '나일강', span: '대략 기원전 3000년대 ~ 기원전 후반',
        blurb: '나일의 범람에 맞춰 도는 신정 사회. 파라오는 신, 서기는 권력.',
        food: '엠머밀·보리로 만든 납작빵과 맥주가 주식. 나일의 물고기·새, 무화과·대추야자·렌틸콩. 맥주는 어른·아이 모두의 일상 음료.',
        clothing: '더위에 맞춘 흰 아마포 옷, 남녀 모두 눈가에 콜(검은 화장)로 햇빛·벌레를 막음. 가발·향유. 신분 높을수록 보석·금장신구.',
        housing: '햇볕에 말린 진흙벽돌집, 평평한 지붕에서 자기도 함. 부자는 안뜰·연못이 있는 저택. 신전·무덤은 돌로.',
        tech: '측량·기하로 세운 거대 석조 건축, 파피루스 제지, 청동 도구, 관개 수로와 샤두프(물 푸는 장대). 정교한 미라 방부.',
        classOrder: '파라오 — 신관·서기·귀족 — 장인·농민 — 노예. 글을 아는 ‘서기’가 출세의 사다리.',
        money: '주화 이전엔 곡식·금속 무게(데벤)로 값을 매긴 물물·신용 경제. 신전·왕실 창고가 부의 중심.',
        comms: '신성문자·신관문자를 파피루스·비석에 기록. 서기가 문서·세금·재고를 관리. 전령이 왕명을 전달.',
        travel: '나일강을 오르내리는 갈대·나무 배가 대동맥(상류는 바람, 하류는 물길). 육로는 당나귀·도보, 후대엔 말·전차.',
        daily: '범람기·파종기·수확기 3계절로 농사 시간이 짜임. 사후 세계 신앙이 강해 무덤·부장품에 정성. 가정 신상에 매일 기도.',
        pitfall: '피라미드를 ‘노예가 채찍 맞으며’ 지었다는 묘사는 단순화. 낙타는 후대에 흔해짐. 모든 시기를 한 ‘이집트’로 뭉뚱그리지 말 것.',
      },
      {
        id: 'china-han', name: '진·한 중국', region: '중원', span: '대략 기원전 3세기 ~ 기원후 3세기',
        blurb: '문자·도량형·법을 통일한 거대 관료 제국. 비단길이 열리던 시대.',
        food: '북쪽은 조·기장, 남쪽은 쌀. 콩으로 장(醬)을 담그고, 국수·만두의 원형이 등장. 차는 아직 약·기호의 초기 단계.',
        clothing: '교차로 여미는 긴 포(袍)와 심의, 허리띠. 비단은 귀족·관리, 서민은 삼베. 관모·인끈으로 관직을 표시.',
        housing: '흙다짐 담장 안의 목조 기와집, 마당 중심의 합원 구조. 서민은 흙벽·초가. 도성은 격자 가로망.',
        tech: '제지술의 발명, 청동·철 주조, 쇠뇌(노)·전차, 해시계·물시계, 지진계의 원형. 운하·관개 토목.',
        classOrder: '황제 아래 관료(사·대부)·지주, 농민·공인·상인(사농공상의 신분 관념), 노비. 추천·후엔 시험으로 관리 선발의 싹.',
        money: '둥근 구멍 뚫린 동전(반량전·오수전)을 끈에 꿰어 사용. 비단·곡식도 가치 척도. 소금·철의 국가 전매.',
        comms: '죽간·목간에 붓글씨, 후엔 종이. 역참망으로 공문·세금 장부 유통. 봉화로 변경 경보.',
        travel: '잘 정비된 역로와 역참, 우마차·말, 운하의 배. 변경엔 장성과 봉수. 사신·상단이 비단길로.',
        daily: '하루를 십이시(時)로 나눔. 농경 절기·역법이 삶을 규율. 효(孝)와 조상 제사가 가정의 축. 시장은 정해진 구역·시간에.',
        pitfall: '이 시기 ‘과거제’는 아직 본격화 전(수·당 이후). 의자에 앉는 입식 생활은 후대(당·송), 한대엔 자리에 앉는 좌식이 기본.',
      },
    ],
  },
  {
    key: 'medieval', label: '중세', icon: '🏰',
    note: '봉건·신분·종교가 삶을 규정하던 시기. 성과 사찰, 기사와 무사, 길드와 장원의 세계. 도시가 다시 자라난다.',
    items: [
      {
        id: 'goryeo', name: '고려', region: '한반도', span: '대략 10세기 ~ 14세기',
        blurb: '불교가 국교처럼 융성하고 청자·인쇄가 빛나던 귀족·문벌의 시대.',
        food: '쌀밥과 잡곡, 채소·장아찌, 된장·간장. 불교의 영향으로 채식·차 문화가 발달, 떡·한과. 후기엔 소·말 도살이 늘고 향신료가 들어옴.',
        clothing: '저고리와 치마·바지의 한복 원형, 관리는 관복·복두. 비단·모시는 귀족, 서민은 삼베. 몽골 영향기엔 변발·호복도.',
        housing: '기와집(귀족)과 초가(서민), 온돌과 마루의 결합이 자리 잡아감. 사찰·궁궐은 단청 목조. 도성 개경은 시전 거리.',
        tech: '세계적 수준의 상감청자, 금속활자·목판(대장경) 인쇄, 화약 무기의 도입, 제지·먹. 수리시설.',
        classOrder: '왕 — 문벌 귀족·관리 — 향리·중간층 — 양인 농민 — 천민(노비·향·소·부곡). 음서와 과거로 관직.',
        money: '주로 쌀·베가 화폐 구실, 건원중보·해동통보 등 동전과 은병(활구)도 발행됐으나 유통은 제한적. 시전 상업.',
        comms: '한문 문서·이두, 관청 문서 행정. 역참·파발로 공문. 불경·서적의 인쇄 보급. 외교 문서.',
        travel: '역참제와 조운(세곡을 배로 운반), 우마·도보, 가마. 벽란도를 통한 송·아라비아 상인과의 해상 교역.',
        daily: '연등회·팔관회 같은 큰 국가 불교 행사. 차 마시는 풍습, 격구·투호 같은 놀이. 절기와 불교 의례가 일상을 짠다.',
        pitfall: '고려를 ‘조선식 유교 사회’로 그리면 오류 — 불교·풍수·다원적 신앙이 강했다. 여성의 재가·재산 상속이 조선보다 자유로웠다.',
      },
      {
        id: 'joseon-early', name: '조선 전기', region: '한반도', span: '대략 14세기 말 ~ 16세기',
        blurb: '성리학을 국시로 삼은 양반 관료 사회. 한글 창제와 농서·예법의 시대.',
        food: '쌀·보리 등 곡물 위주, 김치·장·젓갈, 나물. 고추는 아직 들어오기 전이라 김치가 ‘붉지 않았다’. 술·떡·약과. 육류는 귀해 잔치 음식.',
        clothing: '저고리·치마(여), 바지·저고리·도포(남), 갓·망건. 신분·격식에 따라 옷감·색이 엄격. 백색 옷을 즐겨 입음.',
        housing: '온돌과 마루를 갖춘 한옥, 사대부는 사랑채·안채로 남녀 공간 분리. 서민은 초가. 마을엔 서당·정자.',
        tech: '측우기·해시계·물시계 등 천문·역법 기기, 금속활자, 거북선 등 조선술, 농서·의서 편찬. 화약 무기.',
        classOrder: '양반 — 중인(역관·의관·서리) — 상민(농·공·상) — 천민(노비·백정·광대). 과거가 양반의 출셋길.',
        money: '쌀·면포가 실질 화폐. 조선통보 등 동전 발행됐으나 보급은 더뎠다(상평통보 본격 유통은 후기). 장시(5일장)가 서기 시작.',
        comms: '한문 공문서와 1443년 창제된 한글(언문). 봉수·파발로 변경 소식. 승정원·관청 문서 행정. 방(榜)으로 공지.',
        travel: '역원제(역참·여관), 조운, 가마·말·도보, 나룻배. 양반은 가마·말, 서민은 도보. 도로 사정은 열악.',
        daily: '유교 예법(관혼상제)이 삶을 규율, 제사·차례. 하루를 십이시·경(更)으로 나눔. 서당 교육, 향약·두레로 공동체 운영.',
        pitfall: '전기에 ‘빨간 김치·고춧가루’, 담배, 감자·고구마는 없음(모두 후대 전래). 상평통보로 물건값을 치르는 장면도 시대 착오.',
      },
      {
        id: 'feudal-europe', name: '중세 서유럽', region: '서유럽', span: '대략 5세기 ~ 15세기',
        blurb: '봉건 영주·기사·농노와 교회가 얽힌 장원의 세계. 성·수도원·길드.',
        food: '검은 호밀·보리 빵과 죽(포타주), 콩·양배추·순무, 에일 맥주·묽은 포도주. 고기는 귀족의 사냥감·축일 음식. 향신료는 부의 상징.',
        clothing: '튜닉과 망토, 모직·리넨. 여성은 긴 드레스와 두건, 남성은 호스(다리옷). 사치 규제법으로 신분별 옷감·색 제한.',
        housing: '영주는 돌로 쌓은 성·장원 저택, 농민은 흙·나무·초가의 단칸 오두막(가축과 한 지붕). 도시엔 목골조 다층집.',
        tech: '무거운 쟁기·삼포식 농법·물레방아·풍차, 등자와 판금 갑옷, 고딕 성당의 첨두아치·플라잉 버트레스. 후기 화약.',
        classOrder: '왕 — 영주·기사(귀족) — 성직자 — 자유민·도시민 — 농노. ‘기도하는 자·싸우는 자·일하는 자’의 삼분 관념.',
        money: '은화(페니·데나리우스) 중심, 금화는 후기. 장원은 노동·현물 지대, 도시는 길드·시장의 화폐 경제. 환전상·초기 은행.',
        comms: '라틴어 필사본(수도원 스크립토리움), 양피지. 글을 아는 이는 주로 성직자. 전령·순례자·상인이 소식을 옮김.',
        travel: '말·노새·소달구지, 도보 순례, 강배. 로마 도로의 잔재와 진창길. 여관·수도원이 숙소. 통행세·관문이 많음.',
        daily: '교회 종소리(성무일과)가 시간을 알림. 축일·시장·순례가 큰 행사. 길드가 도시 생업을 규율. 농사 절기와 영주의 부역.',
        pitfall: '‘초야권’ 등 근거 약한 통념, 누구나 칼 찬 기사라는 오해 주의. 감자·옥수수·토마토·담배·차는 모두 후대 전래라 등장 불가.',
      },
      {
        id: 'kamakura', name: '가마쿠라·무로마치 일본', region: '일본', span: '대략 12세기 ~ 16세기',
        blurb: '무사(사무라이)가 권력을 쥔 막부의 세계. 선종·차·정원의 미의식.',
        food: '현미·잡곡밥, 된장국, 절임채소, 생선. 불교의 영향으로 육식을 꺼림. 차(말차)와 정진요리, 후기엔 다도가 발달.',
        clothing: '기모노의 원형(고소데), 무사는 활동성 있는 히타타레·갑주. 신분에 따라 옷감·문양 제한. 짚신·게다.',
        housing: '목조에 다다미·미닫이(후스마/쇼지)가 자리 잡아감. 무사의 저택, 농민의 초가. 선종 사원과 마른 정원(가레산스이).',
        tech: '뛰어난 일본도 단조, 활(유미)과 기마, 목조 건축·정원, 화지(和紙)·먹. 16세기엔 화승총(뎃포) 전래.',
        classOrder: '천황(권위)과 쇼군·막부(실권), 무사(사무라이) — 농민 — 공인·상인 — 천민. 주종 관계(고온과 호코).',
        money: '자국 화폐가 약해 송·명의 동전(송전)을 수입·유통. 쌀이 가치 기준. 좌(座)라는 동업 조합, 장시·환전.',
        comms: '한문·가나 문서, 군기·서장. 사찰이 학문·기록의 거점. 전령(히캬쿠)과 봉화. 와카·렌가 같은 문예.',
        travel: '도보와 말, 가마(가고), 연안 항해. 관문(세키쇼)과 역참. 순례·참배 길. 도로는 정비가 더뎠다.',
        daily: '무가의 예법과 충(忠), 절기 행사·마쓰리. 다도·노(能)·렌가 같은 미의식. 사찰 종이 시간을 알림. 농촌은 절기 노동.',
        pitfall: '‘무사도’를 이 시기에 완성된 윤리로 그리면 과장(후대 정립). 초밥·간장·튀김 등 익숙한 일식은 대개 에도 이후. 닌자 과장 주의.',
      },
    ],
  },
  {
    key: 'earlymodern', label: '근세', icon: '⛵',
    note: '대항해·인쇄·화약이 세계를 잇던 전환기. 절대왕정·상업도시·식민이 얽히고, 신대륙 작물이 식탁을 바꾼다.',
    items: [
      {
        id: 'joseon-late', name: '조선 후기', region: '한반도', span: '대략 17세기 ~ 19세기',
        blurb: '상품화폐 경제와 서민 문화가 피어나고 신분제가 흔들리던 시대.',
        food: '고추 전래로 붉은 김치·고추장 등장, 감자·고구마·옥수수가 구황작물로 정착. 담배가 널리 퍼짐. 장시 발달로 외식·주막 음식.',
        clothing: '저고리가 짧아지는 등 한복 양식 변화, 갓·도포. 신분 혼효로 평민도 양반 차림을 흉내. 무명(면)이 대중화.',
        housing: '온돌·마루 한옥의 완성형, 양반은 솟을대문 기와집, 서민은 초가. 장시·포구에 상업 거리. 서원·정자.',
        tech: '상평통보의 전국 유통, 모내기(이앙법) 보급, 실학의 농서·지리서·기기, 거중기 등 토목 기술. 인쇄·지도.',
        classOrder: '양반의 수가 늘고 공명첩·납속으로 신분 상승, 중인·부농·상인 성장, 노비 해방의 흐름. 신분제가 동요.',
        money: '상평통보가 본격 유통되며 화폐 경제 정착, 5일장 장시망과 보부상, 객주·여각의 상업 자본. 환·어음의 싹.',
        comms: '한문·한글 문서 공존, 한글소설·판소리 사설 유통, 방각본(상업 출판). 봉수·파발, 통문·격문으로 여론.',
        travel: '역원·주막, 가마·말·소달구지, 조운·포구 해운. 청·일과의 사행·통신사 왕래. 도로·교량은 여전히 열악.',
        daily: '판소리·탈춤·민화 등 서민 문화 융성, 5일장·주막이 사교 무대. 세시풍속(설·단오·추석)과 제사. 서당 교육 확대.',
        pitfall: '후기인데도 ‘고추 없는 흰 김치만’ 그리거나, 반대로 전기 배경에 고추장을 넣는 혼동 주의. 신분이 칼같이 고정됐다는 묘사도 과장.',
      },
      {
        id: 'edo', name: '에도 시대 일본', region: '일본', span: '대략 17세기 ~ 19세기 중반',
        blurb: '오랜 평화 속 조닌(상인) 문화와 도시가 만개한 쇄국의 시대.',
        food: '흰쌀밥·된장국·절임, 생선. 이 시기 초밥·소바·덴푸라·간장 등 ‘오늘의 일식’이 도시 노점에서 자리 잡음. 차·과자.',
        clothing: '기모노와 오비(허리띠), 신분·계절·유행에 따른 문양. 사치 규제로 조닌은 화려함을 안감·소품에 숨김. 게다·조리.',
        housing: '목조 연립(나가야)에 다다미, 미닫이. 화재가 잦아 ‘에도의 꽃’이라 불릴 정도. 다이묘 저택, 상가(町家).',
        tech: '높은 문해율과 목판 인쇄(우키요에·서적), 정교한 수공예·도검, 치수·간척, 화폐 주조. 측량·지도.',
        classOrder: '쇼군·다이묘 — 무사(사무라이) — 농민 — 공인 — 상인(사농공상), 그 아래 천민. 신분 이동이 엄격.',
        money: '금·은·동의 삼화제(고반·은화·동전)와 환전상, 쌀을 담보로 한 어음·선물 거래(오사카 도지마). 상업 자본 성장.',
        comms: '데라코야(서당)로 높은 문해율, 가나·한문. 우키요에·요미혼 출판, 가와라반(낱장 소식지). 비각(파발)·봉화.',
        travel: '도카이도 등 정비된 가도와 역참(슈쿠바), 도보·가마·말, 연안 회선(海運). 산킨코타이로 다이묘 행렬이 가도를 오감.',
        daily: '가부키·분라쿠·요시와라 같은 도시 유흥, 마쓰리·하나미. 정해진 시간·관문, 신분별 복식·예법. 데라코야 교육.',
        pitfall: '에도기엔 사무라이가 곧잘 가난한 봉급생활자였다는 점, 칼부림이 일상이 아니라는 점에 유의. 쇄국이라도 나가사키(데지마) 교역은 존재.',
      },
      {
        id: 'renaissance', name: '르네상스·대항해 유럽', region: '서·남유럽', span: '대략 15세기 ~ 17세기',
        blurb: '인쇄술과 신항로가 세계를 잇고, 예술·과학이 폭발한 도시 상인의 시대.',
        food: '신대륙에서 감자·토마토·옥수수·고추·초콜릿이 들어오기 시작(정착엔 시간이 걸림). 빵·고기·포도주, 향신료 무역이 부의 원천.',
        clothing: '러프(주름 깃)·더블릿·코르셋, 벨벳·실크와 보석. 사치 규제법과 신분별 복식. 부르주아의 화려한 의상.',
        housing: '석조 저택·팔라초, 도시의 다층 상가. 농촌은 여전히 목조·초가. 궁정·은행가의 호화 저택과 예술 후원.',
        tech: '구텐베르크 활판 인쇄, 나침반·캐러벨선·항해술, 화약 대포, 원근법·해부학, 망원경의 등장. 시계 제작.',
        classOrder: '왕·귀족 — 성직자 — 부르주아(상인·은행가) — 장인·도시민 — 농민. 상업 자본가가 새 권력으로 부상.',
        money: '금·은화와 환어음, 복식부기, 메디치 같은 은행 가문. 신대륙 은의 유입으로 물가 혁명. 보험·합자의 싹.',
        comms: '인쇄된 책·팸플릿의 폭발적 확산, 라틴어와 속어. 우편망의 발달, 상인 서신망. 대학·아카데미.',
        travel: '대양 항해(범선)와 무역항, 마차·말·강배. 도로·여관망 확충. 그랜드 투어의 시작. 통행세·해적의 위험.',
        daily: '시계탑이 도시 시간을 통일, 카니발·시장. 길드와 도제 제도, 살롱·궁정 사교. 종교 갈등(개혁·반개혁)이 일상에 그림자.',
        pitfall: '신대륙 작물이 ‘바로’ 유럽 식탁에 올랐다고 보면 오류 — 토마토·감자는 한참 뒤에야 일반화. 모두가 글을 읽었다는 과장도 금물.',
      },
      {
        id: 'ottoman', name: '오스만 제국', region: '서아시아·발칸', span: '대략 14세기 ~ 19세기',
        blurb: '세 대륙을 잇는 다종교·다민족 제국. 시장·모스크·궁정의 세계.',
        food: '밀·쌀(필라프), 양고기·요구르트, 가지·콩·과일, 커피와 셔벗. 향신료와 단과자(바클라바 류). 커피하우스가 사교의 장.',
        clothing: '카프탄(긴 겉옷)·터번, 비단·면. 종교·신분·직업에 따른 복식 규정. 여성은 베일·차도르 류. 화려한 자수.',
        housing: '안뜰·하렘(여성 공간)·셀람륵(남성 공간)으로 나뉜 저택, 목조·석조. 모스크와 시장(바자르)·캐러밴서라이(대상 숙소).',
        tech: '거대 모스크 돔 건축, 화약·대포(공성), 정교한 직물·도자·금속공예, 천문·역법, 관개. 인쇄는 늦게 도입.',
        classOrder: '술탄 — 관료·군인(예니체리) — 울라마(법학자) — 상인·장인 — 농민. 종교 공동체(밀레트)별 자치. 노예가 출세하기도.',
        money: '은화(아크체)·금화, 환전과 신용, 길드와 시장 규제. 대상 무역(비단·향신료)이 부의 동맥. 와크프(종교 기금).',
        comms: '아랍 문자 오스만어 문서, 술탄의 칙령(페르만). 역참·전령, 모스크·시장의 구두 전파. 필사 위주.',
        travel: '대상로와 캐러밴서라이, 낙타·말·당나귀, 지중해·흑해 항해. 순례(하지) 행렬. 도로·교량 정비.',
        daily: '하루 다섯 번 기도와 모스크 종교 생활, 커피하우스 사교, 시장과 길드. 라마단·축제. 다종교 공존의 일상.',
        pitfall: '제국을 단일 ‘이슬람 사회’로 단순화하면 오류 — 기독교·유대교 공동체가 광범위했다. 인쇄·근대화 시점도 지역마다 다름.',
      },
    ],
  },
  {
    key: 'modern', label: '근대', icon: '🚂',
    note: '산업혁명·국민국가·제국주의의 시대. 증기·전신·철도가 거리를 좁히고, 도시 노동자와 시민 계급이 등장한다.',
    items: [
      {
        id: 'korea-modern', name: '개항기·일제강점기 한국', region: '한반도', span: '대략 1876년 ~ 1945년',
        blurb: '근대 문물과 식민 지배가 충돌하던 격변기. 전차·신문·양복과 저항의 시대.',
        food: '쌀밥·김치에 더해 일본·서양 음식이 도시로 유입(우동·단팥빵·커피·맥주). 배급·공출로 식량난도. 설탕·조미료의 보급.',
        clothing: '한복과 양복·교복·기모노가 뒤섞임. 단발령 이후 짧은 머리, 모던보이·모던걸의 양장·구두·모자. 고무신의 등장.',
        housing: '전통 한옥과 함께 일식 가옥·문화주택·적산가옥, 도시엔 셋방·하숙. 신작로변 상점가, 백화점.',
        tech: '철도·전차·전등·전화·전신, 인쇄·신문·라디오, 사진·활동사진(영화). 근대 의료·학교. 공장 기계.',
        classOrder: '무너진 신분제 위에 식민 관료·지주·자본가와 노동자·소작농, 식민지 차별 구조. 신지식인·학생층 부상.',
        money: '조선은행권 등 근대 지폐와 은행, 우편저금, 회사·공장. 5일장과 함께 근대 상점·백화점. 화폐 정리·인플레.',
        comms: '신문·잡지·라디오의 등장, 우편·전신·전화, 한글 인쇄물 확산. 검열과 선전. 학교·야학의 문해 교육.',
        travel: '경인·경부선 등 철도, 전차·인력거·자전거·자동차, 기선. 도보·우마차도 병존. 신작로 건설.',
        daily: '근대 시간표(학교·공장·기차)가 삶을 규율, 다방·극장·백화점 같은 도시 문화. 양력·음력 혼용. 일제의 통제와 저항.',
        pitfall: '전 국민이 곧바로 양복·전차를 누린 건 아님 — 농촌·도시 격차가 컸다. 시기별(1900년대 vs 1930년대) 풍경 차이를 뭉뚱그리지 말 것.',
      },
      {
        id: 'victorian', name: '빅토리아 시대 영국', region: '영국', span: '대략 1837년 ~ 1901년',
        blurb: '증기와 석탄, 제국과 격식의 시대. 신사·하녀·공장 노동자의 세계.',
        food: '계급차가 큰 식탁 — 상류층의 다코스 정찬과 애프터눈 티, 노동자의 빵·차·감자·절인 청어. 통조림·설탕·홍차의 대중화.',
        clothing: '코르셋·크리놀린·버슬의 여성복, 프록코트·실크해트·조끼의 남성복. 상복(블랙)의 격식. 기성복·재봉틀의 보급.',
        housing: '교외의 테라스 하우스·저택과 하인용 공간, 도시 빈민의 셋방·슬럼. 가스등·실내 배관이 점차 보급. 벽난로.',
        tech: '증기기관·철도·증기선, 전신·전화, 가스·초기 전등, 사진, 공장 기계와 대량생산. 위생·상하수도 개선.',
        classOrder: '귀족·젠트리 — 중산층(전문직·상인) — 노동계급 — 빈민. 격식·예절(에티켓)과 ‘체면’이 계급을 가름. 하인 계층.',
        money: '파운드·실링·펜스의 화폐, 은행·주식·보험의 금융, 우편환. 산업 자본가의 부와 노동자의 저임금이 공존.',
        comms: '값싼 우편(페니 포스트)과 전신, 신문·잡지의 대중화, 전화의 등장. 명함·편지의 격식. 문해율 상승.',
        travel: '철도망과 역, 합승마차·전세마차(핸섬캡), 증기선, 자전거. 도시 내 도보. 철도 시각표가 표준시를 낳음.',
        daily: '엄격한 시간·예절, 애프터눈 티와 클럽 사교, 일요 예배. 공장 노동의 장시간. 가정성(家庭性) 이상과 빈부 격차.',
        pitfall: '모두가 신사·숙녀로 우아하게 산 게 아니라 빈곤·아동노동이 심각했다. 자동차·전기는 말기에야 등장 — 초·중기엔 마차·가스등.',
      },
      {
        id: 'us-frontier', name: '미국 서부 개척기', region: '북미', span: '대략 1860년대 ~ 1890년대',
        blurb: '철도·목장·금광이 뻗어가던 변경. 카우보이·보안관·이주민의 세계.',
        food: '콩·베이컨·비스킷·커피의 트레일 식단, 소고기, 옥수수빵. 통조림의 보급. 마을엔 살룬과 잡화점. 사냥·텃밭.',
        clothing: '작업용 데님·체크셔츠·부츠·챙모자, 권총 벨트. 여성은 실용적 드레스·앞치마. 도시엔 정장·코르셋도.',
        housing: '통나무집·판잣집·소드 하우스(흙벽돌), 천막, 목장 본채. 새 마을엔 살룬·교회·잡화점이 늘어선 메인 스트리트.',
        tech: '대륙횡단철도와 전신, 콜트 권총·윈체스터 소총, 가시철조망(목장 경계), 풍차 양수기, 증기·초기 농기계.',
        classOrder: '이주 정착민·목장주·광부·상인과 노동자, 원주민과의 충돌, 흑인·이민자·중국인 노동자. 느슨하지만 인종·계급 위계.',
        money: '금·은화와 지폐, 사금·은광의 채굴, 은행과 강도. 목장·철도·토지 투기. 외상 장부와 잡화점 신용.',
        comms: '전신과 우편(역마차·포니 익스프레스의 짧은 시대), 지역 신문, 수배 전단. 구두 소문과 살룬 정보망.',
        travel: '포장마차·역마차, 말, 대륙횡단철도, 증기선. 트레일(오리건·산타페)을 따른 장거리 이주. 철도가 마을의 운명을 좌우.',
        daily: '목장 일·계절 가축몰이(드라이브), 살룬·도박·결투의 신화, 교회·댄스. 보안관과 자경단의 불안정한 치안. 개척 노동.',
        pitfall: '영화식 ‘대낮 결투’는 과장된 신화 — 실제 총격은 드물고 어수선했다. 모두 카우보이가 아니며, 도시·농민·이민자 공동체가 다수.',
      },
      {
        id: 'meiji', name: '메이지 일본', region: '일본', span: '대략 1868년 ~ 1912년',
        blurb: '급격한 서구화와 부국강병의 시대. 사무라이가 사라지고 양복·철도가 들어선다.',
        food: '전통 일식에 서양식(돈가스·카레·맥주)이 가미되는 화양절충, 육식 해금(스키야키). 흰쌀밥과 된장국은 여전히 일상.',
        clothing: '관리·군인·학생의 양복·제복과 일상의 기모노가 공존. 단발(단발령), 양산·구두·모자. 서양식 교복.',
        housing: '전통 목조 가옥에 서양관·벽돌 관청이 더해짐. 도시엔 가스등·전등, 양관(洋館). 농촌은 전통 그대로.',
        tech: '철도·전신·전화·우편, 방적·제철 공장, 신문·인쇄, 근대 군함·무기, 서양 의학·과학. 가스·전기.',
        classOrder: '사농공상 폐지·사민평등 명분 아래 화족(귀족)·사족(옛 무사)·평민, 신흥 관료·군인·자본가. 빈부·도농 격차.',
        money: '엔(円) 도입과 근대 은행·지폐, 주식회사, 우편저금. 지조개정(토지세 금납). 재벌의 성장과 농민 부담.',
        comms: '근대 우편·전신·전화, 신문·잡지의 폭발, 학교의 의무교육으로 문해율 급상승. 관보·포고. 번역서 유행.',
        travel: '철도와 인력거·자전거·노면전차, 기선, 마차. 도보도 여전. 철도 시각표가 표준시를 보급.',
        daily: '근대 학교·군대·공장이 시간을 규율, 양력 채택, 신문·연설회. 전통 마쓰리와 서양 문물이 뒤섞인 도시 풍경.',
        pitfall: '서구화가 ‘하루아침에’ 전 국민에게 퍼진 게 아님 — 농촌은 전통적이었다. 사무라이가 칼 차고 다니는 건 폐도령(1876) 이후 불가.',
      },
    ],
  },
  {
    key: 'contemporary', label: '현대', icon: '🌆',
    note: '전기·자동차·통신이 일상이 되고, 전쟁과 대중문화·디지털이 세계를 재편한 시기. 도시·미디어·소비의 세계.',
    items: [
      {
        id: 'korea-postwar', name: '광복 후~산업화기 한국', region: '한반도', span: '대략 1945년 ~ 1980년대',
        blurb: '전쟁의 폐허에서 압축 성장으로 치달은 격동기. 라디오·흑백TV·연탄의 시대.',
        food: '쌀 부족에 보리·밀가루 혼분식 장려, 미국 원조 밀가루로 수제비·국수·라면. 김치·된장은 여전, 점차 외식·분식·통조림.',
        clothing: '한복에서 양장·기성복으로 빠르게 이동, 교복·작업복. 미제·일제 물품 선호. 후기엔 청바지·미니스커트 등 유행.',
        housing: '판잣집·하꼬방에서 한옥·문화주택, 1970년대 이후 아파트·연립의 등장. 연탄아궁이·공동수도, 점차 입식 부엌·수세식.',
        tech: '라디오에서 흑백·컬러TV, 유선전화, 트랜지스터·선풍기·냉장고의 보급. 공장·중화학공업, 고속도로 건설.',
        classOrder: '신분제는 사라졌으나 학력·재산·지역에 따른 격차, 도시 노동자·농민·자영업·신흥 중산층. 도시화로 이농.',
        money: '원(圜→원) 화폐개혁, 은행·예금·계(契), 월급·일당 노동. 인플레와 저축 장려. 시장·구멍가게와 백화점.',
        comms: '라디오·신문에서 TV로, 유선전화와 우편·전보, 공중전화. 검열과 관제 방송. 학교 교육 확대로 문해율 급상승.',
        travel: '도보·자전거·버스·기차에서 자가용·고속버스·지하철(1974 서울)로. 시발택시, 경부고속도로. 우마차의 퇴장.',
        daily: '통금(야간 통행금지)·반상회·국기 하강식 등 통제, 라디오 드라마·극장·다방. 새마을운동, 입시 경쟁. 연탄·도시락.',
        pitfall: '1950년대와 1980년대를 한 ‘옛날’로 뭉뚱그리면 오류 — 변화가 극심했다. 스마트폰·인터넷·편의점은 이 시기에 없음.',
      },
      {
        id: 'belle-epoque', name: '벨 에포크~1920년대 서구', region: '서유럽·미국', span: '대략 1900년 ~ 1930년',
        blurb: '전기·자동차·영화가 일상에 들어온 화려한 도시의 시대. 재즈와 모더니즘.',
        food: '레스토랑·카페 문화, 통조림·냉장 유통으로 다양해진 식탁, 칵테일(금주법기 미국의 비밀 술집). 가공식품의 보급.',
        clothing: '코르셋을 벗은 플래퍼 드레스·짧은 머리(보브), 남성의 정장·중절모. 기성복·백화점 쇼핑. 스포츠웨어의 등장.',
        housing: '전기·실내 배관·중앙난방이 보급된 도시 아파트·주택, 교외 단독주택. 엘리베이터 있는 고층 건물. 가전의 등장.',
        tech: '전등·전화·축음기·라디오, 자동차의 대중화(포드), 영화(무성→유성), 비행기, 가전제품. 대량생산·조립라인.',
        classOrder: '귀족의 쇠퇴와 중산층·신흥 부자, 도시 노동자, 사무직(화이트칼라)의 부상. 여성 참정권·사회 진출 확대.',
        money: '은행·주식·소비자 금융, 할부 구매, 광고와 소비문화. 1920년대 호황과 1929년 대공황의 그림자. 지폐·수표.',
        comms: '전화·전보의 보편화, 라디오 방송의 시작, 대중지·잡지·광고, 무성·유성 영화. 우편의 절정. 사진·뉴스릴.',
        travel: '자동차·전차·지하철·버스, 대양 정기선, 철도, 초기 여객기. 도시 교외화와 통근. 교통신호·운전면허의 등장.',
        daily: '영화관·댄스홀·라디오·스포츠 관람의 대중오락, 백화점 쇼핑, 카페. 8시간 노동 운동, 주말. 자동차가 데이트·여행을 바꿈.',
        pitfall: 'TV·항생제·고속도로·신용카드는 아직 없음(후대). 전 계층이 자동차를 누린 건 아니며, 지역·계급차가 컸다.',
      },
      {
        id: 'cold-war', name: '냉전기 서구', region: '미국·서유럽', span: '대략 1945년 ~ 1991년',
        blurb: '교외·자동차·텔레비전의 대중 소비사회와 핵 그림자가 공존한 시대.',
        food: '슈퍼마켓·냉동식품·패스트푸드·전자레인지 식, 통조림과 가공식품. 외식·배달의 확산. 가정의 냉장고가 식문화를 바꿈.',
        clothing: '기성복의 완전한 일상화, 청바지·티셔츠의 대중화, 10년 단위로 바뀌는 패션(50s~80s). 청년·하위문화 스타일.',
        housing: '교외의 대량 공급 단독주택과 도시 아파트, 가전(세탁기·냉장고·TV)으로 채워진 가정. 자동차 중심 교외화.',
        tech: '텔레비전·트랜지스터·컴퓨터(대형→PC 말기), 전화의 보편화, 제트 여객기, 우주·핵 기술, 가전. 후기엔 비디오·워크맨.',
        classOrder: '두터운 중산층과 노동조합, 화이트칼라·블루칼라, 소수자·여성의 권리 운동. 소비 능력이 지위를 표현.',
        money: '신용카드의 등장과 소비자 신용, 은행·주택담보대출, 연금·보험. 대량 소비·광고 경제. 인플레와 호·불황.',
        comms: '전화의 보편화와 TV의 지배, 신문·라디오, 우편. 말기엔 팩스·삐삐(페이저)·초기 PC통신. 위성 방송.',
        travel: '자가용과 고속도로(인터스테이트), 제트 여객기의 대중 항공여행, 버스·지하철. 자동차 중심 생활. 주유소·모텔.',
        daily: 'TV가 거실의 중심, 쇼핑몰·드라이브인, 주 5일 근무와 교외 생활. 냉전의 핵 공포·민방위 훈련. 청년문화·록·반전.',
        pitfall: '시기 폭이 넓어 1950년대(흑백TV)와 1980년대(컬러TV·VCR·PC 초기)가 전혀 다름. 스마트폰·인터넷의 일상화는 이 시기 이후.',
      },
      {
        id: 'digital', name: '정보화·디지털 현대', region: '전 지구(도시)', span: '대략 1990년대 ~ 현재',
        blurb: '인터넷·휴대폰·스마트폰이 일상을 재편한 연결의 시대. 글로벌·온라인의 세계.',
        food: '배달앱·편의점·밀키트·글로벌 외식, 카페 문화. 영양·다이어트·비건 등 식의 다양화. 냉장·물류망으로 사철 식재료.',
        clothing: '패스트패션과 온라인 쇼핑, 스트리트·캐주얼의 일상화, SNS가 유행을 주도. 운동화·기능성 의류. 개성·서브컬처.',
        housing: '아파트·오피스텔·원룸과 1인 가구의 증가, 스마트홈·가전. 도시 집중과 주거비 부담. 재택근무 공간.',
        tech: '인터넷·스마트폰·SNS·클라우드·AI, 와이파이·LTE/5G, 전자결제, 스트리밍, 전기차·드론. 가전의 스마트화.',
        classOrder: '신분제 부재, 학력·자산·디지털 역량과 플랫폼 노동, 정규/비정규, 글로벌 격차. 능력·네트워크 중심의 유동적 위계.',
        money: '신용·체크카드와 모바일·간편결제, 인터넷뱅킹, 주식·암호화폐·핀테크. 현금 사용 급감. 구독 경제.',
        comms: '스마트폰·메신저·이메일·SNS·영상통화, 검색·위키·유튜브. 24시간 연결과 정보 과잉, 가짜뉴스. 실시간 글로벌 소통.',
        travel: '자가용·대중교통·고속철도(KTX 등)·저가항공, 내비게이션·차량공유·전동킥보드. 글로벌 여행의 일상화. 전기차 확산.',
        daily: '스마트폰이 시계·지갑·카메라·매체를 통합, 재택·플랫폼 노동, 온라인 쇼핑·스트리밍. 1인 가구·SNS 자아. 24시간 사회.',
        pitfall: '연도별 기술차가 큼 — 2000년대(피처폰·PC)와 2010년대(스마트폰·SNS)는 전혀 다른 풍경. 특정 앱·브랜드명은 빠르게 낡으니 주의.',
      },
    ],
  },
]

const LS = 'sry:tool:historical-era-ref:'
const ALL = '__all__'

type Flat = { cat: EraCat; item: Era }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 항목의 '표 행' 정의 — 의식주·기술·계급·화폐·통신·이동·일상·함정
const FIELDS: { k: keyof Era; label: string; icon: string }[] = [
  { k: 'food', label: '식(食)', icon: '🍚' },
  { k: 'clothing', label: '의(衣)', icon: '👘' },
  { k: 'housing', label: '주(住)', icon: '🏠' },
  { k: 'tech', label: '기술·도구', icon: '⚙️' },
  { k: 'classOrder', label: '계급·신분', icon: '⚖️' },
  { k: 'money', label: '화폐·경제', icon: '🪙' },
  { k: 'comms', label: '통신·기록', icon: '✉️' },
  { k: 'travel', label: '이동수단', icon: '🛤️' },
  { k: 'daily', label: '일상 디테일', icon: '🕰️' },
  { k: 'pitfall', label: '고증 함정', icon: '⚠️' },
]

function plainText(f: Flat): string {
  const lines = [
    `🏺 ${f.item.name}  (${f.cat.label} · ${f.item.region})`,
    `· 연대: ${f.item.span}`,
    `· 분위기: ${f.item.blurb}`,
  ]
  for (const fd of FIELDS) {
    const v = f.item[fd.k]
    if (v) lines.push(`· ${fd.label}: ${v}`)
  }
  return lines.join('\n')
}

function bodyHtml(f: Flat): string {
  const rows = FIELDS
    .filter((fd) => f.item[fd.k])
    .map((fd) => `<tr><td><b>${escapeHtml(fd.label)}</b></td><td>${escapeHtml(String(f.item[fd.k]))}</td></tr>`)
    .join('')
  return [
    `<p><b>${escapeHtml(f.item.name)}</b> — ${escapeHtml(f.cat.label)} · ${escapeHtml(f.item.region)} (${escapeHtml(f.item.span)})</p>`,
    `<p><i>${escapeHtml(f.item.blurb)}</i></p>`,
    `<table border="1" cellpadding="4" cellspacing="0"><tbody>${rows}</tbody></table>`,
    `<p><i>※ 사극·역사물 고증 참고용 자작 요약입니다. 세부는 사료·연도에 맞춰 검증해 쓰세요.</i></p>`,
  ].join('')
}

export default function HistoricalEraRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.era / payload.region 이 오면 검색 힌트로 활용
  const hint0 = typeof payload?.era === 'string' ? (payload.era as string)
    : typeof payload?.region === 'string' ? (payload.region as string) : ''

  const [query, setQuery] = useState(hint0)
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
  const favKey = (catKey: string, id: string) => `${catKey}::${id}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base: Flat[] = cat === ALL ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[favKey(c.key, item.id)])
    if (q) {
      base = base.filter(({ cat: c, item }) => {
        if (c.label.toLowerCase().includes(q)) return true
        if (item.name.toLowerCase().includes(q)) return true
        if (item.region.toLowerCase().includes(q)) return true
        if (item.span.toLowerCase().includes(q)) return true
        if (item.blurb.toLowerCase().includes(q)) return true
        return FIELDS.some((fd) => String(item[fd.k] || '').toLowerCase().includes(q))
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
      if (prev && pool.length > 1 && pick.item.id === prev.item.id) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return pick
    })
  }, [cat])

  const toggleFav = (catKey: string, id: string) => {
    const k = favKey(catKey, id)
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
    addToStash({ kind: 'note', label: `${f.item.name} (${f.cat.label})`, text: plainText(f) })
    flash(`수집함에 ‘${f.item.name}’ 시대 자료를 담았습니다.`)
  }

  // 스니펫 저장(글감) — addToLibrary('snippets', ...)
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: `[시대 자료] ${plainText(f)}`,
      source: '시대상 레퍼런스',
      tags: ['역사', '고증', '시대상', f.cat.label, f.item.region, f.item.name],
    })
    flash(`스니펫 라이브러리에 ‘${f.item.name}’ 자료를 저장했습니다.`)
  }

  // 프로젝트 자료에 추가 — addToProject(root:'research', folder:'세계관')
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '세계관',
      title: `${f.item.name} (${f.cat.label})`,
      bodyHtml: bodyHtml(f),
      meta: { 시대: f.cat.label, 문화권: f.item.region, 연대: f.item.span },
    })
    if (id) flash(`프로젝트 자료 〈세계관〉에 ‘${f.item.name}’을(를) 추가했습니다.`)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  // 표 형식 렌더(의식주·기술·… 행)
  const renderTable = (item: Era) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 8, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      {FIELDS.filter((fd) => item[fd.k]).map((fd, i) => (
        <div key={fd.k} style={{ display: 'flex', gap: 0, background: i % 2 ? 'var(--paper)' : 'var(--panel)' }}>
          <div style={{ flex: '0 0 96px', padding: '7px 9px', fontSize: 12, fontWeight: 600, color: fd.k === 'pitfall' ? 'var(--ok)' : 'var(--accent)', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 4 }}>
            <span aria-hidden><Emoji e={fd.icon} /></span><span>{fd.label}</span>
          </div>
          <div style={{ flex: 1, padding: '7px 10px', fontSize: 12.5, lineHeight: 1.55 }}>{String(item[fd.k])}</div>
        </div>
      ))}
    </div>
  )

  return (
    <div style={wrap}>
      {/* 안내 — 고증 참고용 명시 */}
      <div style={{
        background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)',
        borderRadius: 8, padding: '8px 11px', fontSize: 12, lineHeight: 1.55, color: 'var(--muted)',
      }}>
        <Emoji e="🏺" /> <b style={{ color: 'var(--text)' }}>사극·역사물 고증 자료</b>입니다. 고대~현대의 문화권별 의식주·기술·계급·화폐·통신·이동·일상 디테일을
        한눈에 보는 자작 요약이며, 세부 연대·지역차는 사료로 다시 확인해 쓰세요.
      </div>

      <div style={hint}>
        다섯 시대 · 문화권별 <b>{total}개</b> 시대상을 표로 정리했습니다. 검색·펼침으로 찾고, 무작위로 영감을 얻고,
        클릭해 복사하거나 수집함·스니펫·프로젝트 〈세계관〉으로 보내세요. 각 항목 끝의 <b>고증 함정</b>이 흔한 실수를 짚어 줍니다.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="시대·문화권·키워드로 검색 (예: 온돌, 철도, 김치, 화폐, 사무라이, 통신)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 시대(카테고리) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL)} aria-pressed={cat === ALL}
          style={{ borderColor: cat === ALL ? 'var(--accent)' : 'var(--border)', color: cat === ALL ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🗂️" /> 전체
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on}
              title={c.note}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={c.icon} /> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 시대</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('world-wiki')} title="세계관 위키 열기"><Emoji e="🌐" /> 세계관 위키</button>
        <button className="linkbtn" onClick={() => openToolLinked('setting-bible')} title="배경 설정집 열기"><Emoji e="🗺️" /> 배경 설정집</button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 시대 선택 시 한 줄 설명 */}
      {cat !== ALL && (
        <div style={{ ...hint, fontStyle: 'italic' }}>
          <Emoji e={CATS.find((c) => c.key === cat)?.icon || ''} /> {CATS.find((c) => c.key === cat)?.note}
        </div>
      )}

      {/* 무작위 결과 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label} · {random.item.region}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{random.item.span}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>{random.item.blurb}</div>
          {renderTable(random.item)}
          <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(plainText(random), 'rnd')}>
              {copiedKey === 'rnd' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
            </button>
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="💾" /> 스니펫 저장</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.id)}>
              {favs[favKey(random.cat.key, random.item.id)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => toStash(random)} disabled={!hasStash()}
              title={hasStash() ? '이 자료를 플로팅 수집함에 담기' : '수집함에 연결되어 있지 않습니다'}>
              <Emoji e="📎" /> 수집함
            </button>
            <button className="linkbtn" onClick={() => toProject(random)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 자료를 프로젝트 자료 〈세계관〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('world-wiki')} title="세계관 위키 열기"><Emoji e="🌐" /> 세계관 위키</button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5 }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록(펼침형 표) */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 시대가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const fk = favKey(c.key, item.id)
            const open = !!expanded[fk]
            const isFav = !!favs[fk]
            return (
              <div key={fk} style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /> {c.label} · {item.region}</span>
                  <button onClick={() => toggleExpand(fk)} title={open ? '접기' : '펼치기'}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', fontSize: 15, fontWeight: 700, textAlign: 'left' }}>
                    {open ? '▾' : '▸'} {item.name}
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{item.span}</span>
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(c.key, item.id)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)', fontStyle: 'italic' }}>
                  {item.blurb}
                </div>
                {open && renderTable(item)}
                {open && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button className="minibtn" onClick={() => copy(plainText({ cat: c, item }), 'item:' + fk)}>
                      {copiedKey === 'item:' + fk ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
                    </button>
                    <button className="minibtn" onClick={() => saveSnippet({ cat: c, item })}><Emoji e="💾" /> 스니펫 저장</button>
                    <button className="linkbtn" onClick={() => toStash({ cat: c, item })} disabled={!hasStash()}
                      title={hasStash() ? '수집함에 담기' : '수집함에 연결되어 있지 않습니다'}>
                      <Emoji e="📎" /> 수집함
                    </button>
                    <button className="linkbtn" onClick={() => toProject({ cat: c, item })} disabled={!hasProjectBridge()}
                      title={hasProjectBridge() ? '프로젝트 자료 〈세계관〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                      <Emoji e="📄" /> 프로젝트에 추가
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>같은 ‘조선’이라도 전기와 후기는 식탁(고추)·화폐(상평통보)·문물이 전혀 다릅니다. 시대상은 출발점일 뿐, 정확한 연도에 맞춰 디테일을 골라 쓰세요.</div>
    </div>
  )
}
