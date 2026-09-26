// 복식 사전 — 시대·문화·계급·상황별 의복·장신구·머리모양·소재·색을 '묘사 요소'로 정리한 로컬 자료집.
//  창작 묘사용 참고 자료(자작 텍스트). react 와 './linkbus' 외 import 없음. 외부 API/미디어/네트워크 불필요.
//  카테고리 펼침 + 검색 + 무작위 + 클릭복사 + 수집함 + 스니펫 저장 + 프로젝트 연계.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToStash, hasStash, addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'period-clothing-ref',
  name: '복식 사전',
  icon: '👘',
  group: '리서치·자료',
  intro: '시대·문화·계급·상황별 의복·장신구·머리모양·소재·색을 인물 묘사에 바로 쓰도록 정리한 참고 자료',
  w: 660,
  h: 680,
}

// ---------- 항목 형(型) ----------
// 모든 텍스트는 '묘사를 돕는 단서'. 각 의상은 어떤 인물·장면에 입히면 좋은지까지 함께 적는다.
interface Entry {
  name: string          // 명칭
  aka?: string          // 이칭·구성요소
  era?: string          // 시대·배경
  rank?: string         // 계급·신분·상황(누가 입는가)
  garment?: string      // 의복의 형태·실루엣 묘사
  fabric?: string       // 소재·직물
  color?: string        // 색·문양
  accessory?: string    // 장신구·소품
  hair?: string         // 머리모양·관모(冠帽)
  vibe?: string         // 인상·분위기(어떤 캐릭터에)
  caution?: string      // 고증·작가 유의(흔한 오류)
}
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ---------- 로컬 대량 자료집(자작 요약·표현) ----------
const CATS: CatDef[] = [
  {
    key: 'hanbok', label: '한국 전통·한복', icon: '🇰🇷',
    note: '저고리·치마·바지·포(袍)를 기본으로, 신분과 의례에 따라 색·문양·장신구가 엄격히 갈렸다. 사극·시대극 인물 묘사의 토대.',
    items: [
      { name: '왕의 곤룡포', aka: '익선관·옥대', era: '조선', rank: '국왕(집무·평상 정복)', garment: '둥근 깃에 발끝까지 떨어지는 두루마기형 포. 가슴·등·양어깨에 둥근 보(補)를 단다.', fabric: '비단·금사로 짠 두꺼운 견직', color: '붉은빛(강사포는 더 진한 적색), 가슴의 오조룡 보가 핵심', accessory: '옥대(옥 장식 허리띠), 흑화(검은 가죽신)', hair: '익선관(매미 날개 모양 뿔이 솟은 관)', vibe: '권위의 무게가 그대로 어깨에 얹힌, 함부로 다가설 수 없는 군주', caution: '용 발톱 수(오조룡=다섯)는 위계를 뜻하므로 신분에 맞게. 평상복과 의례복을 뒤섞지 말 것.' },
      { name: '사대부 도포', aka: '갓·세조대', era: '조선', rank: '양반·선비(외출·의례)', garment: '넉넉한 소매와 뒤트임이 있는 겉옷(포). 걸을 때 자락이 크게 흔들린다.', fabric: '명주·모시(여름)·무명', color: '흰빛·옥색·연한 회청. 절제된 무채에 가까운 담색', accessory: '세조대(허리에 매는 술 달린 띠), 부채, 갓끈에 단 호박·대모 구슬', hair: '상투에 망건, 그 위에 갓(흑립)', vibe: '느리고 단정한 걸음, 말보다 침묵이 무거운 학식 있는 인물', caution: '갓은 신분·외출의 표지. 실내·노동 장면에서 갓을 씌운 채 두는 묘사는 어색하다.' },
      { name: '내명부 당의', aka: '당의·첩지', era: '조선', rank: '왕실 여성·상류층(소례복)', garment: '저고리 위에 덧입는, 옆선이 길게 트이고 도련이 둥글게 흐르는 짧은 예복.', fabric: '얇고 광택 있는 견(사·라), 안에 받친 색이 비친다', color: '연두·자주가 흔하고, 금박 문양(봉황·꽃)을 찍기도', accessory: '노리개(삼작노리개), 가락지, 떨잠', hair: '쪽 찐 머리에 첩지·떨잠, 큰머리(가체)', vibe: '겹겹의 색이 은은히 비치는, 절제 속에 화려함을 감춘 귀부인', caution: '가체(큰머리)는 시기·신분에 따라 규제가 오갔다. 한 시대로 뭉뚱그리지 말 것.' },
      { name: '평민 여인 치마저고리', aka: '짧은 저고리·풍성한 치마', era: '조선 후기', rank: '서민 여성(일상)', garment: '가슴 바로 아래에서 여민 짧은 저고리, 그 아래로 넉넉히 부푼 치마.', fabric: '무명·삼베, 형편 따라 물들이지 않은 생색(生色)', color: '바래고 물 빠진 쪽빛·흙빛, 옷고름만 다른 색으로 포인트', accessory: '치마 속 단속곳, 짚신·미투리, 머릿수건', hair: '쪽 찐 머리에 비녀, 일할 땐 수건으로 동인다', vibe: '소맷자락 걷어붙이고 일하는, 생활의 결이 옷에 밴 사람', caution: '귀한 색(자주·다홍)은 신분 규제 대상이었다. 평민에게 너무 화려한 색을 입히면 시대감이 깨진다.' },
      { name: '무관 융복·구군복', aka: '전립·동개', era: '조선', rank: '무관·장수(군복)', garment: '활동성 있게 품을 줄인 포에 전대(허리띠)를 동이고, 어깨와 가슴을 끈으로 여민다.', fabric: '질긴 무명·견, 겉에 가죽·쇠 장식', color: '검붉은 적색·남색이 주조, 위계에 따라 흉배', accessory: '전립(벙거지형 군모)에 깃·정자, 환도(허리칼), 동개(활집)', hair: '상투에 전립, 끈을 턱밑으로 맨다', vibe: '말 위에서도 흐트러지지 않는, 절도와 긴장이 밴 군인', caution: '전립과 갓을 혼동하지 말 것. 의례용 융복과 실전용 구군복은 형태가 다르다.' },
      { name: '상복(喪服)·소복', aka: '굴건제복·흰옷', era: '조선~근대', rank: '상주·문상(상례)', garment: '거칠게 짠 삼베로 지은 헐거운 옷. 상주는 머리에 굴건을 쓰고 지팡이를 짚는다.', fabric: '생삼베(올이 굵고 빳빳), 다듬지 않은 거친 직물', color: '바래지 않은 누런 삼베빛, 혹은 정갈한 소복(흰빛)', accessory: '짚으로 엮은 수질·요질, 짚신', hair: '풀어 헝클거나 굴건 아래로 단정히', vibe: '슬픔을 옷의 거칢으로 드러내는, 말을 잃은 애도의 인물', caution: '상복의 거친 정도는 망자와의 촌수에 따라 등급이 있었다(오복제). 모두 같게 그리면 단조롭다.' },
      { name: '기녀의 차림', aka: '치마말기·옥색 끝동', era: '조선', rank: '기녀·예인(연회·접객)', garment: '허리를 강조해 동여맨 치마, 끝동과 깃에 다른 색을 댄 화사한 저고리.', fabric: '얇은 사·라, 비치는 견직', color: '다홍·연두·자주의 대담한 배색, 금박 끝동', accessory: '큼직한 노리개, 가체와 떨잠, 손에 든 부채·장구', hair: '높이 얹은 가체에 화려한 떨잠·뒤꽂이', vibe: '시선을 모으는 화려함 뒤에, 직업이 새긴 그늘이 비치는 인물', caution: '기녀의 화려함은 ‘허용된 일탈’이었다. 양반가 여인과 같은 절제로 그리면 직업의 결이 사라진다.' },
    ],
  },
  {
    key: 'east_asia', label: '동아시아 전통', icon: '🏮',
    note: '중국 한푸·일본 기모노·몽골 델 등. 한복과 비슷해 보여도 깃·여밈·실루엣이 다르다. 혼동을 피해 묘사하는 것이 고증의 핵심.',
    items: [
      { name: '한푸 곡거심의', aka: '교령(交領)·우임(右袵)', era: '고대 중국', rank: '귀족·문인', garment: '몸을 비스듬히 휘감아 내려오는 자락(곡거)에, 깃을 오른쪽으로 여민 긴 겉옷.', fabric: '비단·견, 넓은 소매가 바닥에 끌릴 듯', color: '검정·진홍·짙은 청, 깃과 소맷부리에 다른 색 선', accessory: '옥패(허리에 늘인 옥 장식), 넓은 띠, 관(冠)', hair: '머리를 틀어 올려 관을 쓰거나 비녀로 고정', vibe: '느리고 유장한 동작, 한 걸음에 천이 강물처럼 따라 흐르는 사람', caution: '깃은 반드시 오른쪽으로 여민다(좌임은 이민족·죽은 자의 상징). 좌우 혼동은 큰 결례로 읽힌다.' },
      { name: '명대 관복·보자', aka: '오사모·흉배', era: '명', rank: '문무 관리', garment: '둥근 깃의 긴 단령포, 가슴과 등에 직급을 나타내는 네모난 흉배(보자)를 단다.', fabric: '두꺼운 견·금사', color: '직급별 색과 흉배 문양(문관은 새, 무관은 짐승)', accessory: '품계에 따른 띠(옥·서각·금), 홀(笏)', hair: '오사모(검은 비단 날개 모자)', vibe: '문양 하나로 서열이 읽히는, 관료제의 위계를 입은 사람', caution: '흉배의 새·짐승 종류가 곧 품계다. 아무 무늬나 넣으면 ‘무엇을 입은지 모르는’ 옷이 된다.' },
      { name: '기모노(여성 예장)', aka: '오비·하오리', era: '일본 근세~근대', rank: '계층 폭넓음(예장은 상류)', garment: '직선 재단의 옷을 몸에 감고 넓은 띠(오비)로 등 뒤에 매듭을 짓는다.', fabric: '견(정장)·면(평상), 계절 따라 두께가 다르다', color: '계절 문양(벚꽃·단풍·눈)을 색과 무늬로 표현', accessory: '오비, 부채, 간자시(머리꽂이), 조리·게다(신)', hair: '틀어 올린 일본식 결발에 간자시', vibe: '직선의 정갈함과 등 뒤 매듭의 무게가 균형을 이루는 사람', caution: '깃은 왼쪽 위로 여민다(오른쪽 위 여밈은 시신용). 오비 매듭의 위치·크기는 미혼/기혼·격식을 가른다.' },
      { name: '하카마 차림(남성)', aka: '하오리·하카마', era: '일본 근세', rank: '무사·서생', garment: '기모노 위에 주름 잡힌 통 넓은 하의(하카마)와 짧은 겉옷(하오리)을 겹친다.', fabric: '견·마, 단정한 무지나 잔잔한 줄무늬', color: '먹빛·감색·회색의 절제된 색', accessory: '허리의 두 자루 칼(무사), 부채', hair: '정수리를 밀고 묶은 촌마게(무사)', vibe: '각진 어깨선과 주름의 절도가 곧 규율인 인물', caution: '두 자루 칼은 무사 계급의 표지였다. 평민에게 칼을 채우면 신분이 어긋난다.' },
      { name: '몽골 델', aka: '델·허리띠', era: '유목 시대', rank: '초원 유목민', garment: '앞을 깊게 여며 단추로 잠그고 긴 천 띠로 허리를 칭칭 감는 두루마기형 겉옷.', fabric: '양모·가죽·면, 겨울엔 안에 모피', color: '선명한 청·홍·황, 깃과 자락에 대비색 선', accessory: '허리띠에 찬 칼·부싯돌·코담배병, 가죽장화', hair: '땋아 늘이거나 모자(말가이) 아래로', vibe: '말과 바람에 단련된, 어디서든 자고 일어날 수 있는 사람', caution: '깊은 여밈과 허리띠는 ‘말 타기·추위’에 맞춘 기능. 도시 예복처럼 헐겁게 그리면 삶의 맥락이 빠진다.' },
      { name: '치파오', aka: '입깃·트임', era: '근대 중국(20세기)', rank: '도시 여성', garment: '몸에 붙는 한 장짜리 원피스. 목을 감싼 선 깃과 옆선의 깊은 트임이 특징.', fabric: '견·새틴, 비치는 광택', color: '진홍·옥색·흑, 자수 꽃문양', accessory: '천으로 꼰 매듭단추(반쿠), 굽 있는 구두, 부채', hair: '단발 웨이브 또는 쪽', vibe: '근대 도시의 세련과 옛 양식이 한 벌에 겹친, 경계에 선 여성', caution: '몸에 붙는 현대형 치파오는 20세기 도시에서 굳어진 양식. 고대 배경에 입히면 시대착오다.' },
    ],
  },
  {
    key: 'euro_med', label: '서양 중세·르네상스', icon: '🏰',
    note: '신분 규제(사치 금지법)와 종교가 옷을 규정한 시대. 천의 양·색·모피가 곧 권력이었다. 판타지·역사물 배경의 단골.',
    items: [
      { name: '기사의 갑주', aka: '판금·체인메일', era: '중세 후기', rank: '기사·귀족 전사', garment: '강철 판을 관절마다 이어 붙인 전신 갑옷. 그 아래 사슬갑옷과 누비옷을 받친다.', fabric: '강철판·사슬·두꺼운 누비(갬비슨)', color: '닦은 강철의 은빛, 가문 문장을 새긴 겉옷(서코트)', accessory: '투구(바이저), 방패, 장검·랜스, 박차', hair: '투구 속에 눌린 머리, 벗으면 땀에 젖어', vibe: '걸음마다 금속이 맞물리는 소리, 무게 자체가 위압인 전사', caution: '판금 전신갑은 후기에야 완성됐다. 초기 중세에 풀플레이트를 입히면 수백 년을 건너뛰는 오류.' },
      { name: '귀부인의 우플랑드', aka: '긴 자락·넓은 소매', era: '중세 말~르네상스', rank: '귀족 여성', garment: '바닥에 끌리는 긴 드레스에 부푼 소매, 허리를 높이 잡아 가슴 아래에서 흐른다.', fabric: '벨벳·다마스크 견, 안감에 모피', color: '값비싼 진홍·군청·금사 문양(귀할수록 짙고 선명)', accessory: '에냉(원뿔형 머리장식)에 늘어진 베일, 보석 박힌 띠', hair: '머리를 가려 올리고 에냉·베일로 덮는다', vibe: '천을 아낌없이 쓴 자락이 부(富) 그 자체를 끄는 사람', caution: '짙은 청·진홍은 염료가 비싸 신분의 표지였다. 농민에게 그 색을 입히면 사치 금지법이 무색해진다.' },
      { name: '평민·농민의 튜닉', aka: '튜닉·호스·후드', era: '중세', rank: '농민·노동자', garment: '무릎 길이의 헐거운 윗옷(튜닉)에 다리를 감싼 호스, 머리·어깨를 덮는 후드.', fabric: '거친 모직·리넨, 직접 짠 천', color: '물들이지 않은 갈색·잿빛·바랜 황토, 약한 식물 염색', accessory: '허리에 두른 가죽끈, 가죽 주머니, 나막신·가죽신', hair: '단발에 후드, 손질 안 된 자연스러움', vibe: '흙과 햇볕에 절은, 옷이 곧 노동의 기록인 사람', caution: '값싼 약한 염료는 금세 바랜다. 평민 옷을 선명하게 칠하면 ‘새 옷 같은 가난’이 되어 어색하다.' },
      { name: '성직자의 수도복', aka: '카술·코울', era: '중세', rank: '수도사·사제', garment: '발끝까지 떨어지는 헐거운 통옷에 두건(코울), 허리를 끈으로 묶는다.', fabric: '거친 모직(고행)·예복은 고운 견', color: '수도회별 색(검정·갈색·흰색), 의례 때 자주·금', accessory: '허리의 매듭끈, 묵주, 십자가', hair: '정수리를 동그랗게 민 삭발(톤슈어)', vibe: '말수 적고 시선 낮은, 옷의 거칢으로 청빈을 말하는 인물', caution: '수도회마다 색·형태가 달랐다. ‘수도사=다 검은 옷’으로 뭉뚱그리면 디테일이 죽는다.' },
      { name: '르네상스 신사의 더블릿', aka: '더블릿·호즈·러프', era: '16세기', rank: '도시 귀족·부유 상인', garment: '몸에 붙는 누빈 윗옷(더블릿)에 부푼 반바지(트렁크호즈), 목에 주름 깃(러프).', fabric: '벨벳·견·자수, 안에 솜·말총 채움', color: '검정(권위)·진홍·금, 트임 사이로 다른 색 안감', accessory: '깃털 단 베레, 가는 칼(레이피어), 어깨걸이', hair: '짧게 다듬은 머리에 다듬은 수염', vibe: '몸의 선을 과시하는 재단, 칼과 깃털로 신분을 두른 멋쟁이', caution: '러프의 크기는 시기에 따라 변했다. 한 가지 크기로 16세기 전체를 그리면 단조롭다.' },
      { name: '농촌 여인의 키르틀', aka: '키르틀·앞치마·코이프', era: '중세~근세', rank: '서민 여성', garment: '몸판을 끈으로 조인 긴 치마(키르틀) 위에 앞치마, 머리에 흰 두건(코이프).', fabric: '모직·리넨, 빨아 쓰는 실용 천', color: '바랜 적갈색·녹색·회색, 앞치마는 표백 안 한 흰빛', accessory: '허리에 매단 열쇠꾸러미·바느질 주머니', hair: '코이프 안으로 모아 넣은 머리', vibe: '집안과 들일을 오가는, 손이 거칠고 동작이 빠른 사람', caution: '머리를 가리는 두건은 기혼·정숙의 표지였다. 맨머리로 그리면 그 시대의 사회적 신호가 빠진다.' },
    ],
  },
  {
    key: 'modern_west', label: '근대 서양·양장', icon: '🎩',
    note: '바로크부터 빅토리아·20세기 초까지. 코르셋·실루엣·예복의 격식이 시대를 가른다. 로맨스·시대극의 핵심 무대.',
    items: [
      { name: '바로크 궁정 드레스', aka: '망토·파니에', era: '17~18세기', rank: '귀족 여성(궁정)', garment: '옆으로 넓게 부푼 치마(파니에 받침)에 가슴을 조인 보디스, 깊게 파인 목선.', fabric: '광택 나는 새틴·브로케이드, 레이스 층', color: '파스텔(연분홍·하늘색)과 금실 자수', accessory: '부채, 보석 목걸이, 점(붙이는 애교점), 굽 있는 비단신', hair: '높이 부풀려 가루를 뿌린 가발, 깃털·리본 장식', vibe: '인공의 극치—천도 머리도 부풀어, 살롱의 빛 속에 떠 있는 사람', caution: '머리에 가루(파우더)와 거대 가발은 특정 시기 유행. 모든 ‘옛 귀족’에 씌우면 시대가 뭉개진다.' },
      { name: '빅토리아 숙녀의 외출복', aka: '버슬·보닛·장갑', era: '19세기', rank: '중·상류 여성', garment: '코르셋으로 허리를 조이고 뒤를 부풀린(버슬) 긴 치마, 목까지 잠근 단정한 상의.', fabric: '모직·실크, 검소한 광택', color: '짙은 청·자주·갈색의 무게 있는 색, 상복은 검정', accessory: '보닛(턱끈 모자), 레이스 장갑, 양산, 카메오 브로치', hair: '가운데 가르마로 단정히 빗어 뒤로 묶음', vibe: '단정함이 곧 미덕인, 감정조차 코르셋처럼 조여 둔 사람', caution: '실루엣(크리놀린→버슬→S라인)은 십수 년 단위로 바뀌었다. ‘빅토리아풍’ 한 덩어리로 그리지 말 것.' },
      { name: '신사의 프록코트', aka: '프록코트·실크해트', era: '19세기', rank: '신사·전문직 남성', garment: '무릎까지 떨어지는 정장 상의에 조끼와 셔츠, 목에 크라바트(넥타이 전신).', fabric: '고급 모직, 조끼는 실크', color: '검정·짙은 회색, 조끼만 다른 색으로 변화', accessory: '실크해트, 회중시계와 줄, 지팡이, 가죽장갑', hair: '단정히 빗어 넘기고 구레나룻·콧수염', vibe: '격식의 갑옷을 입은, 체면이 곧 신분인 도시 남성', caution: '연미복(이브닝)과 프록코트(주간)는 용도가 다르다. 낮·밤 예복을 섞으면 격식 감각이 무너진다.' },
      { name: '플래퍼의 드레스', aka: '드롭웨이스트·클로슈', era: '1920년대', rank: '도시 신여성', garment: '허리선을 엉덩이까지 내린 직선형 짧은 원피스, 무릎이 드러나는 과감한 단.', fabric: '시폰·새틴, 술(프린지)과 비즈 장식', color: '검정·금·은의 반짝임, 대담한 단색', accessory: '클로슈(종 모양 모자), 긴 진주목걸이, 깃털 머리띠, 담배 파이프', hair: '귀밑까지 짧게 자른 보브 단발', vibe: '코르셋을 벗어던진, 재즈와 함께 움직이는 해방의 아이콘', caution: '드롭웨이스트·짧은 단은 20년대의 급변. 그 직전(코르셋 시대)과 섞으면 단 10년의 단절이 사라진다.' },
      { name: '리젠시 엠파이어 가운', aka: '하이웨이스트·스펜서', era: '19세기 초', rank: '상류 여성', garment: '가슴 바로 아래에서 띠로 묶어 발끝까지 곧게 떨어지는 하늘하늘한 드레스.', fabric: '얇은 모슬린·고운 면, 비치듯 가벼움', color: '흰빛·연한 파스텔, 자수 단', accessory: '짧은 겉옷(스펜서), 긴 장갑, 망사 숄(레티큘), 손가방', hair: '고대풍으로 올려 잔머리 컬을 늘어뜨림', vibe: '고전 조각 같은 곧은 선, 절제된 우아함의 여성', caution: '얇은 흰 모슬린이 유행한 짧은 시기. 빅토리아의 무거운 색·코르셋과 혼동하면 안 된다.' },
      { name: '노동자의 작업복', aka: '멜빵바지·플랫캡', era: '산업화 시대', rank: '공장·부두 노동자', garment: '튼튼한 멜빵바지나 거친 셔츠와 조끼, 소매를 걷어 올린 차림.', fabric: '두꺼운 면(데님 전신)·코듀로이, 기운 자국', color: '바랜 청·갈색·회색, 때와 기름이 밴 색', accessory: '납작한 천 모자(플랫캡), 가죽 멜빵, 손수건', hair: '짧게 깎거나 모자 아래로 눌린 머리', vibe: '기름과 땀이 밴, 도시의 기계를 돌리는 손의 사람', caution: '같은 시대라도 계급이 천양지차. 신사의 프록코트와 같은 화면에 두면 그 대비 자체가 묘사가 된다.' },
    ],
  },
  {
    key: 'uniform', label: '제복·군복·직역(職役)', icon: '🎖️',
    note: '직업과 소속을 한눈에 드러내는 옷. 휘장·계급장·색의 ‘규칙’이 곧 정보다. 단추 하나, 견장 하나가 인물의 위치를 말한다.',
    items: [
      { name: '근대 정규군 군복', aka: '견장·계급장·휘장', era: '근대~현대', rank: '군인(계급별)', garment: '재단이 각진 상의에 단추를 채우고, 어깨엔 견장, 가슴엔 약장(리본)을 단다.', fabric: '두꺼운 모직(정복)·기능성 면(전투복)', color: '소속별 단색(국방색·감색·카키), 정복은 짙고 무게 있게', accessory: '정모(챙모자)·베레, 벨트와 버클, 군화, 계급장', hair: '짧게 정돈한 머리, 규율의 표지', vibe: '단추 하나까지 정렬된, 흐트러짐을 허락하지 않는 사람', caution: '계급장·휘장은 규칙. 자리를 멋대로 배치하면 군 경험자에게 즉시 어색하게 읽힌다.' },
      { name: '전투복·야전 복장', aka: '위장무늬·전술조끼', era: '현대', rank: '병사(작전)', garment: '몸을 옥죄지 않는 활동형 상하의에 주머니가 많고, 위에 장비를 단 조끼를 겹친다.', fabric: '질긴 합성·면 혼방, 방수·내화 가공', color: '지형에 맞춘 위장무늬(숲·사막·도시)', accessory: '헬멧, 무전기, 탄입대, 군화, 무릎보호대', hair: '헬멧에 눌린, 땀에 젖은 짧은 머리', vibe: '장비의 무게로 어깨가 처진, 긴장이 몸에 밴 현장의 사람', caution: '위장무늬는 지형·부대마다 다르다. 사막 무늬를 숲 작전에 입히면 ‘틀린 곳에 온 군인’이 된다.' },
      { name: '간호사·의료 복장', aka: '간호모·앞치마(근대)/스크럽(현대)', era: '근대~현대', rank: '간호사·의료진', garment: '근대엔 흰 원피스에 앞치마와 두건, 현대엔 헐렁한 상하의(스크럽).', fabric: '표백 면(근대)·세탁이 쉬운 혼방(현대)', color: '흰빛(청결의 상징)·연파랑·연두', accessory: '근대 간호모, 회중시계, 현대 청진기·명찰·장갑', hair: '단정히 묶거나 모자 안으로', vibe: '분주함 속에서도 손끝이 차분한, 직업이 몸에 밴 사람', caution: '흰 간호모·망토는 근대의 상징이고 현대 병원에선 거의 사라졌다. 시대를 섞지 말 것.' },
      { name: '경찰 정복', aka: '정모·계급장·경광장비', era: '근대~현대', rank: '경찰관', garment: '단추를 채운 각진 정복 상의에 정모, 허리엔 장비 벨트.', fabric: '모직(정복)·기능성 혼방(근무복)', color: '감색·검정·짙은 청, 반사 표지', accessory: '경모·배지, 수갑·경봉·무전기, 호각, 가죽 벨트', hair: '단정히 정돈', vibe: '시선을 살피는 직업적 경계심이 자세에 밴 사람', caution: '나라·시대마다 색과 모자가 다르다. 한 이미지로 ‘경찰’을 그리면 배경의 고유성이 사라진다.' },
      { name: '교복·학생복', aka: '세일러칼라·블레이저·교표', era: '근대~현대', rank: '학생', garment: '근대엔 세운 깃의 검정 학생복, 이후 블레이저·세일러복·체크 치마 등 학교별 양식.', fabric: '모직·혼방, 빳빳이 다린 천', color: '검정·감색 바탕에 학교 색 라인, 넥타이·리본', accessory: '교표(학교 배지), 명찰, 책가방, 학생모(근대)', hair: '교칙에 맞춘 길이, 단정함이 곧 규율', vibe: '획일 속에서 미묘하게 어긋나려는, 청춘의 긴장을 입은 사람', caution: '교복 양식은 나라·시대 차가 크다. 세운깃 검정 학생복과 블레이저를 같은 시기로 섞지 말 것.' },
      { name: '성직 예복', aka: '카속·스톨·미사복', era: '근현대', rank: '사제·목회자', garment: '발끝까지 떨어지는 통옷(카속) 위에, 의례 때 색 띠(스톨)와 겉옷을 겹친다.', fabric: '고운 모직·견, 자수 장식', color: '평상은 검정, 의례 색(흰·자주·녹·붉음)이 절기를 표시', accessory: '로만칼라(흰 깃), 십자가, 묵주', hair: '단정히 빗은 머리', vibe: '말과 침묵이 모두 무게를 갖는, 공동체의 중심에 선 인물', caution: '의례 색은 교회력에 따라 정해진 규칙이다. 아무 색이나 입히면 종교 고증이 무너진다.' },
    ],
  },
  {
    key: 'fantasy', label: '판타지·이세계 의상', icon: '🐉',
    note: '자작 세계관용 의상 설계 묘사 요소. 현실 양식을 비틀되, ‘기능과 신분의 논리’를 지키면 설득력이 산다.',
    items: [
      { name: '대마법사의 로브', aka: '룬 자수·후드', era: '판타지', rank: '마법사·현자', garment: '바닥에 끌리는 헐거운 로브에 깊은 후드, 넓은 소매 안으로 손이 사라진다.', fabric: '별빛 같은 광택의 천, 가장자리에 룬 자수', color: '심해 같은 군청·자주, 은실 별자리 무늬', accessory: '룬을 새긴 지팡이, 목에 건 부적, 가죽 장정 책', hair: '길게 기른 머리·수염, 혹은 빡빡 민 정수리', vibe: '천 속에 깊이를 감춘, 나이를 가늠할 수 없는 지식의 인물', caution: '“로브=마법사”의 클리셰를 비틀려면 소재·룬에 ‘이 세계만의 규칙’을 부여하라.' },
      { name: '도적·밀정의 경장', aka: '후드·가죽·복면', era: '판타지', rank: '도적·암살자·정보원', garment: '몸에 붙는 가죽·천 경갑, 소리 안 나는 부드러운 신, 얼굴을 가린 복면.', fabric: '무두질한 가죽·두꺼운 천, 군데군데 덧댄 보강', color: '그림자에 섞이는 짙은 회색·먹빛·암녹', accessory: '여러 단검과 도구 벨트, 자물쇠 따개, 손목 암기', hair: '후드 속에 감춘, 짧게 친 머리', vibe: '벽과 그림자에 녹아드는, 발소리조차 지운 사람', caution: '전신 검은 가죽은 과한 클리셰. ‘직물과 어둠의 결합’으로 자연스러운 은신 논리를 짜면 신선하다.' },
      { name: '엘프 귀족의 의상', aka: '잎맥 자수·은세공', era: '판타지(숲의 종족)', rank: '장수 종족 귀족', garment: '몸을 따라 흐르는 자연스러운 자락, 어깨에서 흘러내리는 가벼운 망토.', fabric: '비단보다 얇고 질긴 식물 섬유, 이슬 같은 광택', color: '숲·은·달빛 톤(연녹·은회·청은)', accessory: '잎·덩굴 모양 은세공 관, 정교한 활, 룬 펜던트', hair: '길게 늘어뜨려 가는 땋음을 섞은 은발·금발', vibe: '시간이 다르게 흐르는 듯한, 서두름 없는 우아함의 존재', caution: '“엘프=뾰족 귀+초록”의 도식 대신, 그 종족의 ‘자연관’이 옷의 소재·문양에 드러나게 하라.' },
      { name: '용병·전사의 혼합 갑옷', aka: '짜깁기 방어구·전리품', era: '판타지', rank: '용병·모험가', garment: '여기저기서 얻은 가죽·금속을 짜 맞춘 실용 갑옷, 한쪽 어깨만 보강한 비대칭.', fabric: '가죽·사슬·판금 조각, 모피 깃', color: '닦지 않은 금속의 흐린 빛, 가죽의 갈색, 핏자국 흔적', accessory: '큰 검·도끼, 전리품 목걸이, 술 가죽부대', hair: '땋거나 헝클린, 흉터 위로 흘러내린 머리', vibe: '정규군의 정연함과 정반대—생존이 곧 미학인 거친 인물', caution: '비대칭·짜깁기는 ‘돈 없는 실용’의 논리. 깔끔히 갖춰 입히면 용병의 신분이 흐려진다.' },
      { name: '여신관·사제의 성의', aka: '베일·성표·향로', era: '판타지(신전)', rank: '신관·사제', garment: '몸을 휘감아 어깨에 고정한 긴 천에, 머리를 덮는 얇은 베일.', fabric: '표백한 고운 천, 금·은 테두리', color: '신성을 뜻하는 흰빛·금, 신별 상징색', accessory: '신의 문장이 새겨진 펜던트, 향로, 의례 단검', hair: '단정히 올려 베일로 감춤', vibe: '세속과 거리를 둔, 목소리에 의식(儀式)의 울림이 밴 인물', caution: '신마다 상징색·문장이 다르게 설계되면 세계관이 깊어진다. 모든 신전을 흰옷으로 통일하지 말 것.' },
      { name: '증기문명 기사·기술자', aka: '고글·황동 장치·코르셋 벨트', era: '스팀펑크', rank: '발명가·비행사', garment: '가죽 코트와 조끼에 황동 장치를 달고, 팔다리엔 기계 보조구를 덧댄다.', fabric: '가죽·두꺼운 면·황동·기름 먹인 천', color: '갈색·황동빛·먹빛, 그을음과 기름 자국', accessory: '비행 고글, 회중시계 장치, 기계 의수, 가죽 가방', hair: '바람·기름에 흐트러진, 한쪽만 정돈된 머리', vibe: '낡음과 첨단이 한 몸에 붙은, 손에 기름때가 가시지 않는 인물', caution: '“황동+고글”만 붙이면 표면적 스팀펑크. 그 장치가 ‘무엇을 하는가’의 논리가 있어야 옷이 산다.' },
    ],
  },
  {
    key: 'material', label: '소재·직물·색·가공', icon: '🧵',
    note: '의상 묘사의 ‘질감’을 만드는 사전. 같은 옷도 무엇으로 짜고 어떻게 물들였는지에 따라 빛·소리·무게가 달라진다.',
    items: [
      { name: '비단·견(絹)', aka: '실크', rank: '귀함의 상징', fabric: '누에고치 실로 짠 부드럽고 광택 나는 직물', color: '염료를 잘 머금어 색이 깊고 선명', vibe: '빛을 매끄럽게 흘리고, 움직일 때 사락이는 소리가 난다. 부와 격식의 신호.', caution: '비단은 어느 시대·문화에서나 귀했다. 평민에게 흔히 입히면 신분 감각이 무너진다.' },
      { name: '모시·삼베', aka: '저포·마포', rank: '여름·상례·서민', fabric: '식물 줄기 섬유로 짠 까슬하고 시원한 직물', color: '바래지 않은 누런빛·미색, 표백하면 흰빛', vibe: '빳빳하고 서늘해 여름과 잘 맞고, 거칠수록 상복·노동복의 결을 낸다.', caution: '고운 모시는 의외로 값나갔다. ‘마=무조건 거친 천’으로만 쓰면 단조롭다.' },
      { name: '무명·면', aka: '목면·코튼', rank: '서민 일상', fabric: '목화 솜에서 자은 실로 짠 부드럽고 흡습성 좋은 직물', color: '물들이기 쉬우나 약한 염색은 금세 바램', vibe: '따뜻하고 친근하며, 빨아 입을수록 부드러워지는 생활의 천.', caution: '면이 대중화된 시기는 지역마다 다르다. 너무 이른 시대에 흔한 면옷을 입히면 시대착오.' },
      { name: '모직·울', aka: '양모', rank: '추위·서양 일상', fabric: '양털을 자아 짠 보온성 높은 직물, 두께가 다양', color: '천연 갈색·회색·검정, 염색하면 깊은 색', vibe: '따뜻하고 무거우며, 젖으면 특유의 냄새. 중세 서양 의복의 근간.', caution: '거친 모직과 고운 모직의 격차가 크다. 같은 ‘울’로 귀족과 농민을 뭉뚱그리지 말 것.' },
      { name: '벨벳·브로케이드', aka: '우단·금란', rank: '귀족 예복', fabric: '한쪽에 짧은 보풀이 선 두껍고 묵직한 직물(벨벳), 금·은실 무늬를 짜 넣은 직물(브로케이드)', color: '빛을 머금어 짙고 풍부한 발색, 보는 각도로 명암', vibe: '묵직이 떨어지며 그림자를 깊게 만든다. 권위·사치의 정점.', caution: '직조가 까다로워 매우 비쌌다. 권력·부의 표지로만 신중히 쓸 것.' },
      { name: '가죽·모피', aka: '피혁·퍼', rank: '방한·전투·유목', fabric: '무두질한 짐승 가죽, 털을 남긴 모피', color: '갈색·검정·짐승 본연의 무늬', vibe: '질기고 거칠며, 모피는 부드럽고 따뜻해 추운 무대·전투복에 어울린다.', caution: '값진 모피(담비 등)는 귀족의 표지였다. 평민의 방한과 귀족의 사치 모피를 구분해 묘사.' },
      { name: '천연 염색의 색', aka: '쪽·홍화·치자·먹', rank: '색의 위계', color: '쪽=깊은 청, 홍화=다홍, 치자=노랑, 소목=자주, 먹·오배자=검정·회색', vibe: '식물·광물에서 얻은 색은 은은하고 바래며, 진하고 균일한 색일수록 손이 많이 간 ‘비싼 색’.', caution: '선명한 자주·진홍은 염료가 비싸 신분 규제 대상인 경우가 많았다. 색이 곧 계급임을 기억하라.' },
      { name: '문양·자수·금박', aka: '보(補)·흉배·당초·운문', rank: '신분·길상의 표지', color: '바탕색 위에 금실·색실로 새긴 상징', vibe: '용·봉황·꽃·구름·길상 글자 등 ‘무엇을 새겼는가’가 입은 이의 신분과 소망을 말한다.', caution: '문양은 함부로 쓸 수 없는 ‘권리’인 경우가 많았다(용·봉황 등). 신분에 맞지 않는 문양은 큰 오류.' },
    ],
  },
  {
    key: 'accessory', label: '장신구·관모·머리모양', icon: '💍',
    note: '옷 못지않게 신분과 상황을 말하는 디테일. 머리에 무엇을 쓰고, 어떻게 묶고, 무엇을 걸었는가가 인물을 완성한다.',
    items: [
      { name: '관모(冠帽)의 세계', aka: '갓·익선관·사모·면류관', rank: '신분·의례의 표지', accessory: '동아시아의 머리쓰개—평민의 패랭이, 선비의 갓, 관리의 사모, 왕의 면류관·익선관', hair: '상투·쪽 위에 신분에 맞는 관모를 얹는다', vibe: '머리 위 한 점으로 그 사람의 자리가 단번에 읽힌다.', caution: '관모는 가장 엄격한 신분 표지였다. 아무 모자나 씌우면 계급 고증이 무너진다.' },
      { name: '노리개·패물', aka: '삼작노리개·향낭·매듭', rank: '여성의 장신', accessory: '저고리 고름이나 치마말기에 매다는 매듭+술+보석 장식. 향낭·은장도를 달기도', color: '산호·옥·금·진주에 오색 매듭과 술', vibe: '걸음마다 흔들리며 사락이는, 절제된 한복에 더해진 화려함의 한 점.', caution: '재료(옥·산호·금)와 개수가 신분을 드러냈다. 평민에게 값진 패물을 과하게 달지 말 것.' },
      { name: '비녀·떨잠·뒤꽂이', aka: '머리 장식', rank: '기혼·예장', accessory: '쪽 찐 머리를 고정하는 비녀, 흔들리는 장식(떨잠), 뒤에 꽂는 뒤꽂이', color: '금·은·옥·산호, 떨잠은 보석이 떨려 빛난다', hair: '쪽·가체를 장식으로 마무리', vibe: '미세한 떨림으로 빛을 잘게 부수는, 정중동(靜中動)의 우아함.', caution: '비녀 재료는 신분의 표지. 금비녀를 아무에게나 꽂으면 어긋난다.' },
      { name: '서양의 모자', aka: '실크해트·보닛·클로슈·플랫캡', rank: '계급·시대의 표지', accessory: '신사의 실크해트, 숙녀의 보닛, 20년대 클로슈, 노동자의 플랫캡', vibe: '“모자를 벗어 인사한다”—쓰고 벗는 예법까지 인물의 격을 말한다.', caution: '모자 양식은 시대를 강하게 못박는다. 시대가 틀린 모자는 즉시 위화감을 준다.' },
      { name: '반지·목걸이·브로치', aka: '보석 장신', rank: '부·약속의 표지', accessory: '약혼·결혼반지, 가문 인장반지, 카메오 브로치, 보석 목걸이', color: '금·은·보석의 광택, 카메오는 조각된 음영', vibe: '손끝과 가슴에서 빛나는 작은 신호—부, 약속, 가문을 말없이 드러낸다.', caution: '인장반지·가문 보석은 ‘소속’을 뜻한다. 출신을 드러내는 단서로 쓰면 서사가 깊어진다.' },
      { name: '허리띠·벨트·전대', aka: '옥대·세조대·가죽벨트·전대', rank: '격식·기능의 분기', accessory: '왕의 옥대, 선비의 세조대, 무관의 전대, 서양의 가죽벨트와 버클', vibe: '허리를 어떻게 동였는가가 ‘일하는 옷/예복’을 가른다.', caution: '예복의 띠와 노동·전투의 띠는 기능이 다르다. 장면의 목적에 맞춰 고를 것.' },
      { name: '신발', aka: '짚신·미투리·태사혜·가죽화·게다', rank: '신분·상황의 바닥', accessory: '서민의 짚신·미투리, 양반의 가죽신(태사혜), 무관의 흑화, 일본의 게다·조리, 서양의 굽 구두·장화', vibe: '가장 낮은 곳에서 신분을 드러내는 디테일—발끝까지 일관되어야 묘사가 완성된다.', caution: '발을 잊은 묘사가 흔하다. 비단옷에 짚신을 신기면 오히려 강한 ‘반전 단서’가 될 수도 있다.' },
      { name: '얼굴·손의 가림과 드러냄', aka: '면사·장옷·부채·장갑', rank: '정숙·격식의 표지', accessory: '여성의 장옷·쓰개치마·면사, 손에 든 부채, 서양 숙녀의 레이스 장갑', vibe: '무엇을 가리고 무엇을 드러내는가가 그 시대의 ‘몸에 대한 규범’을 말한다.', caution: '가림의 관습은 시대·문화마다 다르다. 현대 감각으로 함부로 벗기거나 가리면 시대감이 깨진다.' },
    ],
  },
]

const LS = 'sry:tool:period-clothing-ref:'
const ALL = '__all__'

type Flat = { cat: CatDef; item: Entry }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 항목 → 묘사 요소 묶음(필드 라벨 포함)
const FIELDS: { k: keyof Entry; label: string }[] = [
  { k: 'aka', label: '구성·이칭' },
  { k: 'era', label: '시대·배경' },
  { k: 'rank', label: '계급·상황' },
  { k: 'garment', label: '의복·실루엣' },
  { k: 'fabric', label: '소재·직물' },
  { k: 'color', label: '색·문양' },
  { k: 'accessory', label: '장신구·소품' },
  { k: 'hair', label: '머리·관모' },
  { k: 'vibe', label: '인상·분위기' },
  { k: 'caution', label: '고증·유의' },
]

function plainText(f: Flat): string {
  const lines = [`👘 ${f.item.name}  (${f.cat.label})`]
  for (const fd of FIELDS) {
    const v = f.item[fd.k]
    if (v) lines.push(`· ${fd.label}: ${v}`)
  }
  return lines.join('\n')
}

function bodyHtml(f: Flat): string {
  const rows = FIELDS
    .filter((fd) => f.item[fd.k])
    .map((fd) => `<p><b>${escapeHtml(fd.label)}</b>: ${escapeHtml(String(f.item[fd.k]))}</p>`)
    .join('')
  return [
    `<p><b>${escapeHtml(f.cat.icon + ' ' + f.cat.label)} · ${escapeHtml(f.item.name)}</b></p>`,
    rows,
    `<p><i>※ 복식 묘사 참고 자료(자작 요약). 시대·문화 고증은 작품 설정에 맞춰 각색해 쓰세요.</i></p>`,
  ].join('')
}

export default function PeriodClothingRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.era / payload.q 가 오면 초기 검색어로 활용(맥락 활용)
  const initialQuery = typeof payload?.q === 'string' ? (payload.q as string)
    : typeof payload?.era === 'string' ? (payload.era as string) : ''

  const [query, setQuery] = useState(initialQuery)
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
    if (!hasStash()) { flash('수집함을 사용할 수 없습니다.'); return }
    addToStash({ kind: 'note', label: `복식: ${f.item.name} (${f.cat.label})`, text: plainText(f) })
    flash(`수집함에 ‘${f.item.name}’ 묘사 요소를 담았습니다.`)
  }

  // 스니펫 라이브러리에 저장 — addToLibrary('snippets', ...)
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: `[복식 묘사] ${plainText(f)}`,
      source: '복식 사전',
      tags: ['복식', '의상', '묘사', f.cat.label, f.item.name],
    })
    flash(`스니펫 라이브러리에 ‘${f.item.name}’ 묘사를 저장했습니다.`)
  }

  // 프로젝트 자료에 추가 — addToProject(...)
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '복식·의상 자료',
      title: `${f.item.name} (${f.cat.label})`,
      bodyHtml: bodyHtml(f),
      meta: { 분류: f.cat.label, 시대: f.item.era || '', 계급상황: f.item.rank || '' },
    })
    if (id) flash(`프로젝트 자료 〈복식·의상 자료〉에 ‘${f.item.name}’을(를) 추가했습니다.`)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  const renderFields = (item: Entry) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
      {FIELDS.filter((fd) => item[fd.k]).map((fd) => (
        <div key={fd.k} style={{ fontSize: 12.5, lineHeight: 1.55 }}>
          <span style={{ color: 'var(--accent)', fontWeight: 600, marginRight: 6 }}>{fd.label}</span>
          <span>{String(item[fd.k])}</span>
        </div>
      ))}
    </div>
  )

  return (
    <div style={wrap}>
      {/* 자료 성격 안내 — 가장 위에 고정 */}
      <div style={{
        background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)',
        borderRadius: 8, padding: '8px 11px', fontSize: 12, lineHeight: 1.55, color: 'var(--muted)',
      }}>
        <Emoji e="👘" /> <b style={{ color: 'var(--text)' }}>복식 묘사 참고 자료</b>입니다. 시대·문화·계급·상황별 의복·소재·색·장신구·머리모양을
        인물 묘사에 바로 쓰도록 자작 요약했습니다. 고증의 세부는 작품 설정에 맞춰 각색하세요.
      </div>

      <div style={hint}>
        한복·동아시아·서양 중세/근대·제복·판타지·소재·장신구 등 <b>{total}개</b> 항목을 카테고리로 정리했습니다.
        검색·펼침으로 찾고, 무작위로 영감을 얻고, 클릭해 복사하거나 수집함·스니펫·프로젝트로 보내세요.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름·시대·계급·소재·색으로 검색 (예: 조선, 귀족, 비단, 군복)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL)} aria-pressed={cat === ALL}
          style={{ borderColor: cat === ALL ? 'var(--accent)' : 'var(--border)', color: cat === ALL ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🗂️" /> 전체
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

      {/* 카테고리 안내 */}
      {cat !== ALL && (() => {
        const c = CATS.find((x) => x.key === cat)
        return c?.note ? (
          <div style={{ ...hint, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>
            <Emoji e={c.icon} /> {c.note}
          </div>
        ) : null
      })()}

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 의상</button>
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
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          {renderFields(random.item)}
          <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(plainText(random), 'rnd')}>
              {copiedKey === 'rnd' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
            </button>
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="💾" /> 스니펫 저장</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>
              {favs[favKey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => toStash(random)} disabled={!hasStash()}
              title={hasStash() ? '이 묘사 요소를 수집함에 담기' : '수집함을 사용할 수 없습니다'}>
              <Emoji e="📎" /> 수집함
            </button>
            <button className="linkbtn" onClick={() => toProject(random)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 자료를 프로젝트 자료 〈복식·의상 자료〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('character-sheet')} title="인물 시트 열기(복식을 외형 설정에 반영)"><Emoji e="🪪" /> 인물 시트</button>
            <button className="linkbtn" onClick={() => openToolLinked('setting-bible')} title="배경 설정집 열기(시대·문화 설정과 연계)"><Emoji e="🗺️" /> 배경 설정집</button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5 }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록(펼침형) */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 의상이 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const fk = favKey(c.key, item.name)
            const open = !!expanded[fk]
            const isFav = !!favs[fk]
            const preview = item.garment || item.vibe || item.accessory || ''
            return (
              <div key={fk} style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /> {c.label}</span>
                  <button onClick={() => toggleExpand(fk)} title={open ? '접기' : '펼치기'}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', fontSize: 15, fontWeight: 700, textAlign: 'left' }}>
                    {open ? '▾' : '▸'} {item.name}
                  </button>
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(c.key, item.name)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                {!open && preview && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {preview}
                  </div>
                )}
                {open && renderFields(item)}
                {open && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
                    <button className="minibtn" onClick={() => copy(plainText({ cat: c, item }), 'item:' + fk)}>
                      {copiedKey === 'item:' + fk ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
                    </button>
                    <button className="minibtn" onClick={() => saveSnippet({ cat: c, item })}><Emoji e="💾" /> 스니펫 저장</button>
                    <button className="linkbtn" onClick={() => toStash({ cat: c, item })} disabled={!hasStash()}
                      title={hasStash() ? '수집함에 담기' : '수집함을 사용할 수 없습니다'}>
                      <Emoji e="📎" /> 수집함
                    </button>
                    <button className="linkbtn" onClick={() => toProject({ cat: c, item })} disabled={!hasProjectBridge()}
                      title={hasProjectBridge() ? '프로젝트 자료에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                      <Emoji e="📄" /> 프로젝트에 추가
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>옷은 인물의 ‘말 없는 대사’입니다. 시대·계급·상황의 논리에 맞춰 소재·색·장신구를 골라 인물을 입히세요.</div>
    </div>
  )
}
