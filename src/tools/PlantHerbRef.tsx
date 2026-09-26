// 식물·약초 사전 — 미스터리·판타지·사극 창작 참고용 로컬 자료집.
//  외형·서식지·효능·독성·상징·계절을 '서사용 단서'로 정리한다(실제 약용·채집 지침이 아님).
//  자급식: react 와 './linkbus' 외 import 없음. 외부 API 없음(전부 로컬 자작 데이터).
//  카테고리 펼침 + 검색 + 무작위 + 클릭복사 + 수집함/스니펫/프로젝트 연계 + 관련 도구 열기.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, addToStash, hasStash, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'plant-herb-ref',
  name: '식물·약초 사전',
  icon: '🌿',
  group: '리서치·자료',
  intro: '식물·약초를 외형·서식지·효능·독성·상징·계절로 정리한 창작 참고 자료 — 미스터리·판타지·사극 소재',
  w: 640,
  h: 680,
}

// ---------- 항목 형(型) ----------
// 모든 텍스트는 '창작 묘사용 단서'다. 효능·독성은 옛 통념·서사 설정 수준으로만 적고, 복용·채집 지침은 적지 않는다.
interface Entry {
  name: string          // 명칭
  aka?: string          // 이칭·별칭·한자명
  look?: string         // 외형 묘사
  habitat?: string      // 서식지·자라는 곳
  season?: string       // 꽃피거나 거두는 계절
  virtue?: string       // 효능(옛 통념·민간전승 수준)
  poison?: string       // 독성 주의(있을 때만)
  symbol?: string       // 상징·꽃말·민속
  story?: string        // 이야기 활용·연상
}
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ---------- 로컬 대량 자료집(전부 자작 요약·표현) ----------
const CATS: CatDef[] = [
  {
    key: 'medicinal', label: '약초·약용 식물', icon: '🌱',
    note: '사극·치유담의 단골. 약방·산골 의원·궁중 내의원의 약장(藥欌)을 채우는 풀들. 효능은 옛 통념 수준으로만.',
    items: [
      { name: '쑥', aka: '애엽(艾葉)·약쑥', look: '잎 뒷면이 흰 솜털로 덮여 은빛이 돌고, 손에 비비면 알싸한 향이 번진다.', habitat: '들판·밭둑·길섶 어디에나 무성하게 퍼진다.', season: '봄에 어린순, 단오 무렵 거둬 말린다.', virtue: '예부터 몸을 데우고 배앓이를 달랜다 여겨, 뜸과 떡·국에 두루 썼다.', symbol: '단오·정화·악귀 쫓기. 문에 걸어 액을 물리치는 풀.', story: '“단옷날 새벽에 벤 쑥이라야 효험이 있다”는 식의 민속 규칙을 사극 약초 장면에 깔기 좋다.' },
      { name: '감초', aka: '국로(國老)·단풀뿌리', look: '땅속으로 길게 뻗는 노란 속살의 뿌리, 씹으면 단맛이 돈다.', habitat: '메마른 모래땅·약초밭에서 재배.', season: '가을에 뿌리를 캐 말린다.', virtue: '“약방의 감초” — 여러 약의 성질을 누그러뜨려 어느 처방에나 섞었다는 통념.', symbol: '없어서는 안 될 조연, 화합과 중재.', story: '“약방의 감초처럼 어디나 끼어드는 인물” 비유로 캐릭터를 소개하는 데 쓸 수 있다.' },
      { name: '인삼', aka: '심(蔘)·산삼/장뇌', look: '사람 모양으로 갈라진 흰 뿌리, 잎은 다섯 갈래 손바닥꼴. 붉은 열매가 맺힌다.', habitat: '깊은 산 그늘, 활엽수 아래 부엽토.', season: '여름에 붉은 열매, 가을에 뿌리를 캔다.', virtue: '기력을 돋운다 하여 가장 귀히 친 약재. 산삼은 값을 매길 수 없다 여겼다.', symbol: '생명력·귀함·횡재. 심마니의 ‘심봤다’ 외침.', story: '산삼을 둘러싼 다툼·심마니의 금기(부정 타면 못 찾는다)는 사극·전설의 좋은 갈등 소재.' },
      { name: '당귀', aka: '승검초·신감채', look: '미나리처럼 갈라진 잎, 줄기 끝에 우산살 같은 흰 꽃이 핀다. 뿌리에서 짙은 향.', habitat: '서늘한 산골짜기·약초밭.', season: '늦가을 뿌리를 캐 말린다.', virtue: '피를 다스리고 산모를 돕는다 여겨 부인 약에 즐겨 썼다는 통념.', symbol: '돌아옴(當歸)·재회. ‘마땅히 돌아오라’는 이름 풀이.', story: '이름 뜻(“마땅히 돌아오다”)을 떠난 이를 기다리는 사연에 겹쳐 쓰면 여운이 깊다.' },
      { name: '구기자', aka: '지선(地仙)·괴좃나무 열매', look: '가는 가지에 붉고 길쭉한 작은 열매가 다닥다닥 맺힌다.', habitat: '돌담가·밭둑·마을 어귀.', season: '여름 보랏빛 꽃, 가을에 붉은 열매.', virtue: '눈을 밝히고 노화를 늦춘다는 ‘신선의 약’ 통념.', symbol: '장수·맑은 눈.', story: '“구기자 우물물을 마신 마을 사람들이 백 살을 넘겼다”는 식의 장수 전설에 좋다.' },
      { name: '도라지', aka: '길경(桔梗)·백도라지', look: '별 모양으로 벌어진 보랏빛(혹은 흰) 꽃, 풍선처럼 부푸는 꽃봉오리. 희고 곧은 뿌리.', habitat: '볕 드는 산기슭·언덕.', season: '여름에 꽃, 가을·봄에 뿌리.', virtue: '목과 기침을 다스린다 하여 즐겨 달이고 무쳤다.', symbol: '영원한 사랑·한(恨). 민요 〈도라지〉의 정서.', story: '“도라지꽃이 풍선처럼 부풀었다 톡 터지는” 외형은 인내·폭발의 은유로 쓰기 좋다.' },
      { name: '결명자', aka: '초결명·긴강남차', look: '콩과의 풀, 활처럼 휜 가느다란 꼬투리에 모난 씨가 줄지어 든다.', habitat: '밭·둑의 양지.', season: '여름 노란 꽃, 가을 씨앗.', virtue: '눈을 밝힌다(決明) 하여 볶아 차로 끓였다는 통념.', symbol: '밝은 눈·또렷함.', story: '이름 그대로 ‘눈을 밝히는 씨’ — 진실을 보는 능력의 상징으로 비틀 수 있다.' },
      { name: '백출', aka: '삽주 뿌리', look: '거친 잎에 엉겅퀴 닮은 꽃, 울퉁불퉁한 향 짙은 뿌리줄기.', habitat: '산기슭 풀밭.', season: '가을 뿌리.', virtue: '비위를 든든히 한다 여겨 보약에 흔히 넣었다는 통념.', symbol: '튼튼함·중심 잡기.', story: '약장 서랍을 더듬는 장면에서 향으로 약재를 구별하는 노의원 묘사에 어울린다.' },
    ],
  },
  {
    key: 'poison', label: '독초·유독 식물', icon: '☠️',
    note: '⚠ 독성 식물 — 아래는 창작 설정용 모호한 단서일 뿐, 실제 식별·취급·복용 지침이 아닙니다. 만지거나 먹지 마세요.',
    items: [
      { name: '투구꽃', aka: '바곳·초오(草烏)·몽크스후드', look: '투구(혹은 수도자의 두건)를 닮은 짙은 보랏빛 꽃이 줄기 끝에 줄지어 핀다.', habitat: '서늘한 깊은 산골짜기·그늘진 비탈.', season: '늦여름~가을에 꽃.', virtue: '옛 의서엔 극소량을 법제해 썼다는 기록이 있으나, 다루기가 가장 까다로운 약재로 꼽혔다.', poison: '⚠ 매우 강한 독초. 뿌리·풀 전체가 위험하다는 통념이 강하다. 미스터리·사극에서 ‘우아한 독’의 대명사.', symbol: '기사도·경계·치명적 아름다움.', story: '“정원의 보랏빛 투구꽃”은 무해해 보이는 인물의 정체를 암시하는 복선으로 즐겨 쓰인다.' },
      { name: '독미나리', aka: '독근(毒芹)·워터헴록', look: '식용 미나리와 쏙 빼닮은 갈라진 잎, 작은 흰 꽃이 우산살처럼 모여 핀다.', habitat: '도랑·습지·물가.', season: '여름에 꽃.', poison: '⚠ 미나리로 착각하기 쉬운 맹독초. ‘닮은꼴 사고’ 설정의 단골.', symbol: '닮은꼴의 함정·치명적 오인.', story: '“바구니 속 미나리에 독미나리 한 줄기가 섞였다”는 한 줄로 시골 미스터리의 사고/타살 모호함을 만든다.' },
      { name: '협죽도', aka: '유도화·올레안더', look: '버드나무 같은 좁고 긴 잎, 분홍·흰 꽃이 화사하게 무리 진다.', habitat: '따뜻한 바닷가·가로수·정원.', season: '여름~가을 내내 꽃.', poison: '⚠ 잎·꽃·가지 모두 위험하다는 통념이 강한 관상독초. ‘아름다운데 위험한’ 대비가 인상적.', symbol: '겉과 속의 불일치·치명적 매혹.', story: '화려한 정원수가 사실 독을 품었다는 아이러니로 무대 분위기를 비튼다.' },
      { name: '디기탈리스', aka: '폭스글러브·심산초롱', look: '키 큰 줄기를 따라 골무·종 모양 점박이 꽃이 한쪽으로 줄지어 핀다.', habitat: '서늘한 숲 가장자리·정원.', season: '초여름에 꽃.', virtue: '옛 약초가가 심장을 다스리는 풀로 조심스레 다뤘다는 통념.', poison: '⚠ 심장에 작용하는 강한 풀. ‘약이자 독’의 양면을 지닌 식물로 그려진다.', symbol: '치유와 파멸의 경계.', story: '“약으로도 독으로도 쓰이는 풀”이라는 양면성이 약초사 캐릭터의 도덕적 회색지대를 만든다.' },
      { name: '벨라도나', aka: '가짓과 미녀풀·디들리 나이트셰이드', look: '윤기 도는 검은 열매와 자줏빛 도는 종 모양 꽃.', habitat: '그늘진 숲·폐허·돌담 틈.', season: '여름 꽃, 늦여름 검은 열매.', poison: '⚠ 강한 독초. 검은 열매가 먹음직스러워 보이는 ‘유혹의 함정’으로 그려진다.', symbol: '마녀·치명적 아름다움(이름이 ‘아름다운 여인’).', story: '고딕·마녀 서사에서 약장 가장 깊은 서랍에 든 풀. 폐가 정원에 자란 검은 열매로 분위기를 만든다.' },
      { name: '주목', aka: '적목(赤木)·서양주목', look: '짙은 상록 바늘잎, 가지마다 붉고 말랑한 컵 모양 열매(가종피).', habitat: '오래된 정원·묘지·고산.', season: '늦가을 붉은 열매.', poison: '⚠ 붉은 과육을 뺀 부위가 위험하다는 통념. 정원·교회 묘지의 음산한 상록수로 그려진다.', symbol: '죽음과 영생·고요. 묘지를 지키는 나무.', story: '“수백 년 묵은 주목 아래 묻힌 비밀”처럼 시간과 죽음을 품은 무대 장치로 쓰기 좋다.' },
      { name: '미치광이풀', aka: '낭탕(莨菪)·사리풀류', look: '끈적한 솜털과 칙칙한 보랏빛 줄무늬 꽃, 역한 냄새.', habitat: '산기슭 그늘·돌밭.', season: '봄~여름 꽃.', poison: '⚠ 환각·섬망을 일으킨다는 통념의 독초. 이름 자체가 ‘미치게 하는 풀’.', symbol: '광기·환영·점술.', story: '“미치광이풀을 태운 연기” 같은 설정은 환각·예언 장면의 분위기를 만든다(서사 장치로만).' },
      { name: '천남성', aka: '남성(南星)·호장초', look: '뱀머리 두건 같은 꽃집(불염포)이 솟고, 가을엔 옥수수처럼 붉은 열매가 뭉친다.', habitat: '습한 숲 그늘.', season: '봄 꽃, 가을 붉은 열매.', poison: '⚠ 강한 자극·독성의 통념을 가진 풀. 옛이야기에 사약 재료로 등장하곤 한다.', symbol: '형벌·금단. 으스스한 숲의 표지.', story: '사극에서 ‘사약’을 짓는 음습한 장면의 재료로 곧잘 호출된다(설정 수준으로만).' },
    ],
  },
  {
    key: 'flower', label: '꽃·관상 식물', icon: '🌸',
    note: '계절감과 감정을 입히는 풀들. 꽃말·민속을 곁들이면 장면의 정서가 또렷해진다.',
    items: [
      { name: '매화', aka: '매(梅)·설중매', look: '잎보다 먼저 가지에 붙어 피는 희거나 분홍빛 다섯 잎 꽃, 맑은 향.', habitat: '뜰·산기슭·매화밭.', season: '이른 봄, 눈 속에서 가장 먼저.', symbol: '지조·고고함·선비. 사군자(매란국죽)의 으뜸.', story: '추위를 뚫고 먼저 피는 절개의 상징 — 굽히지 않는 인물의 시·서화 장면에 어울린다.' },
      { name: '연꽃', aka: '하화(荷花)·부용', look: '진흙 위로 솟은 큰 잎과 분홍·흰 겹꽃, 가운데 벌집 같은 연밥.', habitat: '연못·늪.', season: '한여름에 핀다.', symbol: '청정·깨달음·진흙 속의 군자. 불교의 꽃.', story: '“진흙에서 피어도 더럽혀지지 않는다”는 함의로 타락한 환경 속 고결한 인물을 그린다.' },
      { name: '국화', aka: '황화(黃花)·감국', look: '촘촘한 가는 꽃잎이 둥글게 모인 노랗고 흰 꽃, 서늘한 향.', habitat: '뜰·산기슭.', season: '서리 내릴 무렵 늦가을.', symbol: '은일·장수·절개. 서리를 견디는 꽃.', story: '“서리를 이기고 피는 국화”는 만년·노년의 기개나 은둔 선비의 정취에 맞는다.' },
      { name: '동백', aka: '산다(山茶)·춘백', look: '두껍고 윤기 나는 짙은 잎, 붉은 꽃이 통째로 툭 떨어진다.', habitat: '남쪽 바닷가·섬.', season: '한겨울~이른 봄.', symbol: '한결같음·애틋함, 그러나 ‘목이 꺾이듯’ 지는 비장미.', story: '꽃송이가 통째로 떨어지는 모습은 비극적 죽음·이별의 시각적 은유로 강렬하다.' },
      { name: '진달래', aka: '참꽃·두견화', look: '잎보다 먼저 가지를 뒤덮는 연분홍 꽃, 화전으로도 부친다.', habitat: '볕 드는 산비탈.', season: '이른 봄.', symbol: '봄의 전령·그리움. 두견새 전설과 얽힌다.', story: '온 산을 분홍으로 물들이는 진달래는 향수·고향·첫사랑의 정서를 한 컷에 담는다.' },
      { name: '수선화', aka: '나르키소스·금잔은대', look: '가는 잎 사이로 솟은 줄기 끝에 노란 잔을 흰 꽃잎이 받친 모양.', habitat: '양지바른 뜰·바닷가.', season: '늦겨울~이른 봄.', symbol: '자기애·고독한 아름다움(물에 비친 자신을 사랑한 신화).', story: '물가에 피는 수선화는 ‘자기 그림자에 갇힌 인물’의 상징으로 비틀기 좋다.' },
      { name: '백합', aka: '나리·산나리', look: '나팔처럼 벌어진 큰 흰(혹은 주황 점박이) 꽃, 진한 향과 긴 수술.', habitat: '산기슭·뜰.', season: '초여름.', symbol: '순결·위엄. 짙은 향이 양면적으로 쓰인다.', story: '장례·결혼 양쪽에 놓이는 꽃 — 향이 너무 짙어 ‘아름다움의 과잉’을 암시하는 장치로도.' },
      { name: '맨드라미', aka: '계관화(鷄冠花)', look: '닭 볏을 빼닮은 붉은 주름 꽃이 뭉쳐 핀다.', habitat: '뜰·울타리 가.', season: '여름~가을.', symbol: '벽사(辟邪)·기개. 닭 볏 모양이 액을 막는다 여겼다.', story: '담장 밑 붉은 맨드라미는 토속·민속 분위기를 단번에 깐다.' },
      { name: '능소화', aka: '금등화·양반꽃', look: '담을 타고 오르며 주황빛 나팔 꽃을 매단다.', habitat: '담장·고택 마당.', season: '한여름.', symbol: '기다림·그리움. 옛이야기 속 궁녀의 한.', story: '담을 넘겨다보듯 피는 능소화는 ‘오지 않는 이를 기다리는’ 사연에 안성맞춤이다.' },
    ],
  },
  {
    key: 'tree', label: '나무·목본', icon: '🌳',
    note: '오래 살아 마을과 시간을 굽어보는 존재. 당산나무·정원수·과실수가 무대의 ‘기둥’이 된다.',
    items: [
      { name: '느티나무', aka: '괴목(槐木)·정자나무', look: '넓게 퍼진 우산 같은 수관, 두꺼운 회색 줄기, 가을엔 붉게 물든다.', habitat: '마을 어귀·정자·당산.', season: '봄 새잎, 가을 단풍.', symbol: '마을의 수호·세월·모임의 중심.', story: '“마을 어귀 오백 년 느티나무”는 공동체의 기억과 비밀을 품은 무대 장치로 완벽하다.' },
      { name: '소나무', aka: '송(松)·적송', look: '굽이치는 붉은 줄기와 늘 푸른 바늘잎, 솔방울.', habitat: '산등성이·바위틈·바닷가.', season: '사철 푸르다.', symbol: '지조·장수·불변. 세한(歲寒)의 절개.', story: '“추워진 뒤에야 소나무의 푸름을 안다”는 정서로 시련 속 인물의 진가를 드러낸다.' },
      { name: '대나무', aka: '죽(竹)·왕대', look: '곧고 마디진 푸른 줄기, 바람에 서걱이는 가는 잎.', habitat: '따뜻한 죽림·뒤뜰.', season: '사철 푸르고 봄에 죽순.', symbol: '곧음·청렴·비움(속이 비어 있다). 사군자의 하나.', story: '“속을 비우고도 꺾이지 않는” 대나무는 청렴한 인물·은자의 거처를 그릴 때 쓴다.' },
      { name: '버드나무', aka: '수양버들·유(柳)', look: '늘어진 가는 가지가 물 위로 드리우고, 봄엔 보송한 꽃(버들개지).', habitat: '냇가·연못가·우물가.', season: '이른 봄 새순.', symbol: '이별·유연함·여인. 옛 이별가의 무대.', story: '물가의 버드나무는 떠나보냄·재회의 정서, 우물가 만남 같은 장면을 받쳐 준다.' },
      { name: '은행나무', aka: '행자목·압각수', look: '부채꼴 잎이 가을에 온통 노랗게, 고약한 냄새의 노란 열매.', habitat: '향교·절·고택 마당.', season: '가을 황금빛.', symbol: '학문·장수(천 년을 산다). 향교·서원의 나무.', story: '“천 년 묵은 은행나무”는 오랜 학맥·가문의 시간을 상징하는 배경으로 좋다.' },
      { name: '회화나무', aka: '괴화(槐花)·학자수', look: '연노란 꽃이 여름에 무리 지고, 잘 휜 가지에 콩꼬투리 열매.', habitat: '서원·고택·관아 앞.', season: '여름 꽃.', symbol: '학자·출세·길상. 선비의 집에 심던 나무.', story: '벼슬·학문을 염원해 심던 나무라는 민속을 가문 서사의 디테일로 넣을 수 있다.' },
      { name: '매실나무', aka: '매목(梅木)', look: '이른 봄 매화가 진 자리에 푸른 매실이 맺힌다.', habitat: '뜰·과수원.', season: '봄 꽃, 초여름 풋매실.', symbol: '인내의 결실·정갈함.', story: '꽃(매화)과 열매(매실)를 한 나무의 다른 계절로 엮어 시간의 흐름을 보여줄 수 있다.' },
    ],
  },
  {
    key: 'fantasy', label: '판타지·상상 약초', icon: '✨',
    note: '실재하지 않는 자작 식물들. 약초 체계가 있는 세계관에 바로 끼워 넣을 ‘출발 설정’.',
    items: [
      { name: '월령초(月靈草)', aka: '달이슬풀', look: '달빛을 받아야 은청색으로 빛나는 다섯 잎, 낮엔 잿빛으로 시들어 보인다.', habitat: '달이 잘 드는 북향 절벽·폐허의 그늘.', season: '보름 전후 사흘만 피어난다.', virtue: '꿈을 또렷이 하고 잃은 기억을 잠시 비춘다는 설정.', poison: '⚠ 달이 기운 그믐에 거두면 ‘되레 기억을 갉아먹는다’는 금기를 둘 수 있다.', symbol: '기억·달·덧없음.', story: '“보름에만 피는 풀”이라는 채집 제약이 곧 플롯의 시간 압박이 된다.' },
      { name: '불꽃이끼', aka: '화린태(火鱗苔)', look: '바위에 들러붙은 주황 비늘 같은 이끼, 건드리면 잠깐 온기가 돈다.', habitat: '화산 지대 갈라진 바위틈·온천 가장자리.', season: '사철, 추울수록 더 붉게 핀다.', virtue: '얼어붙은 몸을 데우고 동상을 막는 화톳불 대용이라는 설정.', symbol: '온기·생존·꺼지지 않는 불씨.', story: '설원 여정에서 ‘불을 피울 수 없을 때 의지하는 풀’로 생존 긴장을 만든다.' },
      { name: '침묵의 종꽃', aka: '함구화(緘口花)', look: '소리 없이 흔들리는 잿빛 종 모양 꽃, 주변의 소리를 빨아들이는 듯하다.', habitat: '바람도 메아리도 없는 깊은 동굴·고요한 늪.', season: '소리가 끊긴 곳에서만 돋는다는 설정.', virtue: '가루를 뿌리면 한동안 소리가 새지 않는다는 잠행용 설정.', poison: '⚠ 오래 곁에 두면 ‘제 목소리마저 잃는다’는 대가를 붙일 수 있다.', symbol: '비밀·잠행·잃어버린 목소리.', story: '암살·잠입 장면의 도구이자, ‘말을 잃는 저주’의 씨앗으로 양면 활용.' },
      { name: '피눈물꽃', aka: '혈루초(血淚草)', look: '흰 꽃잎 끝에서 붉은 진액이 이슬처럼 맺혀 떨어진다.', habitat: '오래된 전장·무덤가·피가 스민 땅.', season: '비 온 다음 날 새벽에만.', virtue: '깊은 상처를 봉합한다는 귀한 약풀 설정.', poison: '⚠ 산 사람의 슬픔을 ‘대가’로 가져간다는 설정으로 비극성을 더할 수 있다.', symbol: '희생·치유의 대가·전쟁의 기억.', story: '“상처를 낫게 하려면 누군가의 눈물이 필요하다”는 교환 규칙이 도덕적 딜레마를 만든다.' },
      { name: '거울뿌리', aka: '경근(鏡根)', look: '땅을 파면 거울처럼 빛나는 은빛 뿌리가 보는 이의 얼굴을 비춘다.', habitat: '한 번도 빛이 들지 않은 동굴 바닥.', season: '계절을 타지 않는다.', virtue: '진실을 비춰 거짓말을 못 하게 한다는 심문·신탁용 설정.', poison: '⚠ 제 안의 가장 감추고 싶은 것까지 비춰 ‘미치게 한다’는 위험을 둘 수 있다.', symbol: '진실·자기직시·심판.', story: '재판·맹세 장면에 두면 ‘거짓을 가릴 수 없다’는 규칙이 긴장을 만든다.' },
      { name: '꿈가시', aka: '몽자(夢刺)', look: '잠든 듯 늘어진 덩굴에 부드러운 솜털 가시, 찔리면 따끔함 대신 졸음이 온다.', habitat: '오래 잠든 자가 누운 폐원·잊힌 침실.', season: '밤에만 잎을 펼친다.', virtue: '불면을 달래고 악몽을 거둔다는 설정.', poison: '⚠ 깊이 찔리면 ‘영영 깨어나지 못한다’는 잠의 함정으로 쓸 수 있다.', symbol: '잠·망각·달콤한 함정.', story: '“찌르면 잠드는 가시 울타리”는 잠자는 성(城) 모티프의 자작 변주에 알맞다.' },
      { name: '별빛버섯', aka: '성광이(星光茸)', look: '갓 아래에서 작은 별처럼 푸르게 깜빡이는 점이 돋은 버섯.', habitat: '빛 한 점 없는 깊은 갱도·지하 호숫가.', season: '사철, 어두울수록 또렷이 빛난다.', virtue: '어둠 속 길잡이가 되고, 가루는 잠깐 동안 ‘앞이 환히 보이게’ 한다는 설정.', poison: '⚠ 너무 많이 먹으면 ‘눈이 빛에만 끌려 현실을 못 본다’는 부작용을 둘 수 있다.', symbol: '길잡이·희망·지하의 별.', story: '지하 미궁 탐험의 유일한 빛 — 다 떨어져 가는 별빛버섯이 곧 생존 시계가 된다.' },
    ],
  },
]

const LS = 'sry:tool:plant-herb-ref:'
const ALL = '__all__'

type Flat = { cat: CatDef; item: Entry }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 항목 → 단서 묶음(필드 라벨 포함)
const FIELDS: { k: keyof Entry; label: string }[] = [
  { k: 'aka', label: '이칭·별칭' },
  { k: 'look', label: '외형' },
  { k: 'habitat', label: '서식지' },
  { k: 'season', label: '계절' },
  { k: 'virtue', label: '효능(통념)' },
  { k: 'poison', label: '독성 주의' },
  { k: 'symbol', label: '상징·꽃말' },
  { k: 'story', label: '이야기 활용' },
]

function plainText(f: Flat): string {
  const lines = [`🌿 ${f.item.name}  (${f.cat.label})`]
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
    `<p><i>※ 식물·약초 사전(창작 참고 자료). 효능·독성은 옛 통념·서사 설정 수준이며 실제 약용·채집 지침이 아닙니다.</i></p>`,
  ].join('')
}

export default function PlantHerbRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 가 오면 검색 힌트로 활용(맥락 활용)
  const genreHint = typeof payload?.genre === 'string' ? (payload.genre as string) : ''

  const [query, setQuery] = useState('')
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

  // 수집함에 담기 — addToStash({kind:'note',...})
  const toStash = (f: Flat) => {
    if (!hasStash()) { flash('수집함에 연결되어 있지 않습니다.'); return }
    addToStash({ kind: 'note', label: `${f.item.name} (${f.cat.label})`, text: plainText(f) })
    flash(`수집함에 ‘${f.item.name}’ 자료를 담았습니다.`)
  }

  // 스니펫 저장(글감) — addToLibrary('snippets', ...)
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: `[식물 자료] ${plainText(f)}`,
      source: '식물·약초 사전',
      tags: ['식물', '약초', f.cat.label, f.item.name],
    })
    flash(`스니펫 라이브러리에 ‘${f.item.name}’ 자료를 저장했습니다.`)
  }

  // 프로젝트 자료에 추가 — addToProject(...)
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '식물·약초 자료',
      title: `${f.item.name} (${f.cat.label})`,
      bodyHtml: bodyHtml(f),
      meta: { 분류: f.cat.label, 계절: f.item.season || '', 독성: f.item.poison ? '주의' : '' },
    })
    if (id) flash(`프로젝트 자료 〈식물·약초 자료〉에 ‘${f.item.name}’을(를) 추가했습니다.`)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  const renderFields = (item: Entry) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
      {FIELDS.filter((fd) => item[fd.k]).map((fd) => {
        const danger = fd.k === 'poison'
        return (
          <div key={fd.k} style={{ fontSize: 12.5, lineHeight: 1.55 }}>
            <span style={{ color: danger ? 'var(--paper)' : 'var(--accent)', background: danger ? '#b4452f' : 'transparent', borderRadius: danger ? 4 : 0, padding: danger ? '1px 6px' : 0, fontWeight: 600, marginRight: 6 }}>{fd.label}</span>
            <span>{emojify(String(item[fd.k]))}</span>
          </div>
        )
      })}
    </div>
  )

  return (
    <div style={wrap}>
      {/* 창작 참고용 + 독성 명시 — 가장 위에 고정 */}
      <div style={{
        background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)',
        borderRadius: 8, padding: '8px 11px', fontSize: 12, lineHeight: 1.55, color: 'var(--muted)',
      }}>
        <Emoji e="🌿"/> <b style={{ color: 'var(--text)' }}>창작 참고 자료</b>입니다. 미스터리·판타지·사극의 묘사·소재를 위한 서사용 단서이며,
        효능·독성은 옛 통념·설정 수준입니다. <b style={{ color: 'var(--text)' }}><Emoji e="⚠️"/> 독초는 실제로 만지거나 먹지 마세요</b> — 식별·채집·복용 지침이 아닙니다.
      </div>

      <div style={hint}>
        약초·독초·꽃·나무·상상 약초 등 <b>{total}개</b> 식물을 카테고리로 정리했습니다.
        검색·펼침으로 찾고, 무작위로 영감을 얻고, 클릭해 복사하거나 수집함·스니펫·프로젝트로 보내세요.
        {genreHint ? <>  (전달된 맥락: <b>{genreHint}</b>)</> : null}
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름·외형·상징으로 검색 (예: 보랏빛, 묘지, 그리움, 독)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL)} aria-pressed={cat === ALL}
          style={{ borderColor: cat === ALL ? 'var(--accent)' : 'var(--border)', color: cat === ALL ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🗂️"/> 전체
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={c.icon}/> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 무작위 식물</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('mystery-poison-ref')} title="독극물·살해수법 사전 열기"><Emoji e="☠️"/> 독극물·살해수법 사전</button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 무작위 결과 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon}/> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          {renderFields(random.item)}
          <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(plainText(random), 'rnd')}>
              {copiedKey === 'rnd' ? '✓ 복사됨' : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="💾"/> 스니펫 저장</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>
              {favs[favKey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => toStash(random)} disabled={!hasStash()}
              title={hasStash() ? '이 자료를 플로팅 수집함에 담기' : '수집함에 연결되어 있지 않습니다'}>
              <Emoji e="📎"/> 수집함
            </button>
            <button className="linkbtn" onClick={() => toProject(random)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 자료를 프로젝트 자료 〈식물·약초 자료〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('mystery-poison-ref')} title="독극물·살해수법 사전 열기"><Emoji e="☠️"/> 독극물·살해수법 사전</button>
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
            {onlyFav ? '☆ 아직 즐겨찾기한 식물이 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const fk = favKey(c.key, item.name)
            const open = !!expanded[fk]
            const isFav = !!favs[fk]
            const hasPoison = !!item.poison
            return (
              <div key={fk} style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon}/> {c.label}</span>
                  <button onClick={() => toggleExpand(fk)} title={open ? '접기' : '펼치기'}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', fontSize: 15, fontWeight: 700, textAlign: 'left' }}>
                    {open ? '▾' : '▸'} {item.name}{hasPoison ? <> <Emoji e="☠️"/></> : ''}
                  </button>
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(c.key, item.name)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                {!open && item.look && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {emojify(item.look)}
                  </div>
                )}
                {open && renderFields(item)}
                {open && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
                    <button className="minibtn" onClick={() => copy(plainText({ cat: c, item }), 'item:' + fk)}>
                      {copiedKey === 'item:' + fk ? '✓ 복사됨' : <><Emoji e="📋"/> 복사</>}
                    </button>
                    <button className="minibtn" onClick={() => saveSnippet({ cat: c, item })}><Emoji e="💾"/> 스니펫 저장</button>
                    <button className="linkbtn" onClick={() => toStash({ cat: c, item })} disabled={!hasStash()}
                      title={hasStash() ? '플로팅 수집함에 담기' : '수집함에 연결되어 있지 않습니다'}>
                      <Emoji e="📎"/> 수집함
                    </button>
                    <button className="linkbtn" onClick={() => toProject({ cat: c, item })} disabled={!hasProjectBridge()}
                      title={hasProjectBridge() ? '프로젝트 자료에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                      <Emoji e="📄"/> 프로젝트에 추가
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>자료는 정답이 아니라 출발점입니다. 외형·서식지·상징을 비틀어 세계관과 인물에 맞는 ‘이야기 속 식물’로 각색해 쓰세요.</div>
    </div>
  )
}
