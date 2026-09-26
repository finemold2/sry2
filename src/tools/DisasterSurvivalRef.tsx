// 재난·생존 고증 사전 — 재난물·서바이벌물 창작 참고용 로컬 자료집.
//  ⚠ 실제 재난 대응 지침이 아니라, 재난의 '전개·생존·심리'를 납득되게 묘사하기 위한 창작 단서다.
//  자급식: react 와 './linkbus' 외 import 없음. 외부 API/미디어/네트워크 없음(전부 로컬 자작 데이터).
//  카테고리 펼침 + 검색 + 무작위 뽑기 + 클릭 복사 + 스니펫 저장 + 수집함 + 프로젝트 연계.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, addToStash, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'disaster-survival-ref',
  name: '재난·생존 고증 사전',
  icon: '🌪️',
  group: '리서치·자료',
  intro: '화재·홍수·지진·조난·기아·혹한 등 재난의 전개·생존 기술·심리·위험을 재난/생존물 고증용으로 정리',
  w: 680,
  h: 700,
}

// ---------- 항목 형(型) ----------
// 모든 텍스트는 '창작 묘사용 단서'이지 실제 재난 대응 지침이 아니다.
interface Entry {
  name: string          // 명칭
  aka?: string          // 이칭·범주
  threat?: string        // 위협 강도(서사용 척도)
  onset?: string        // 전개·발생 양상(징후·속도)
  danger?: string       // 진짜 위험(흔히 간과되는 치명 요인)
  survival?: string     // 생존 기술·행동(개념 수준, 묘사용)
  psych?: string        // 심리·집단 반응(공황·터널비전 등)
  timeline?: string     // 시간 흐름·경과(분초/시간/일 단위)
  myth?: string         // 흔한 오류·클리셰 주의
}
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ---------- 로컬 대량 자료집 (전부 직접 작성한 요약·표현) ----------
const CATS: CatDef[] = [
  {
    key: 'fire', label: '화재·연기·폭발', icon: '🔥',
    note: '불은 빠르고, 사람을 죽이는 건 대개 불꽃이 아니라 연기와 열이다. 시야·산소·시간이 핵심.',
    items: [
      { name: '실내 화재 확산', aka: '건물 화재', threat: '치명적', onset: '불씨에서 ‘플래시오버’까지 단 몇 분 — 한 방이 통째로 발화점에 닿으면 순식간에 전실(全室) 화염.', danger: '불꽃보다 연기·유독가스. 검은 연기가 천장에 깔리며 시야 0, 한 모금에 정신을 잃기도.', survival: '낮게 기어 신선한 공기층으로, 젖은 천으로 입코 가리고, 문 손잡이가 뜨거우면 열지 않는다. 등 뒤로 문을 닫아 산소·확산 차단.', psych: '연기로 방향 감각을 잃고 ‘들어온 길’로만 되돌아가려는 본능 — 익숙한 출구가 막히면 얼어붙는다.', timeline: '발화 2~3분 내 대피 골든타임, 5분이면 전실 화염·생존 급감.', myth: '“불길을 뚫고 영웅적으로 질주”는 비현실 — 보통 연기 한두 모금에 쓰러진다.' },
      { name: '연기·유독가스 흡입', aka: '질식', threat: '치명적', onset: '겉은 멀쩡한데 의식이 흐려진다. 일산화탄소·시안화물은 무색무취로 판단력부터 앗아간다.', danger: '도망쳐야 한다는 ‘판단’ 자체가 흐려지는 것. 졸음·두통을 ‘피곤’으로 오해하다 그대로 잠든다.', survival: '바닥에 깨끗한 공기층(약 30cm)으로 낮게 이동, 호흡을 얕고 짧게. 창문 깨기 전 연기 역류 위험 판단.', psych: '취한 듯 멍해지며 비현실감 — 위기인데 ‘조금만 쉬자’는 치명적 안도감이 든다.', timeline: '짙은 연기 속에선 수십 초~수 분 내 의식 저하.', myth: '“불에 타 죽는다”보다 화재 사망의 다수는 연기·질식 — 불꽃이 닿기 전에 이미 위험하다.' },
      { name: '플래시오버·백드래프트', aka: '폭발적 발화', threat: '치명적', onset: '플래시오버: 실내 전체가 발화점에 달해 순간 화염. 백드래프트: 산소가 부족하던 방에 문을 여는 순간 역화 폭발.', danger: '연기가 노랗게 소용돌이치고 창에 기름때가 끼면 백드래프트 전조 — 모르고 문을 열면 불덩이가 덮친다.', survival: '뜨거운 문은 열지 않는다. 환기 전 ‘산소가 굶주린’ 방인지 살핀다(개념). 천장 근처 고온 가스층 주의.', psych: '베테랑조차 ‘조용한 방’에 방심하다 당하는 위협 — 정적이 오히려 경고.', timeline: '전조에서 폭발까지 수 초 — 사실상 ‘판단의 순간’만 존재.', myth: '문을 벌컥 여는 진입 묘사는 노련한 인물일수록 안 한다 — 손등으로 문을 짚어 열을 먼저 읽는다.' },
      { name: '산불·들불', aka: '산림 화재', threat: '중상~치명적', onset: '바람을 타고 분당 수십~수백 미터로 번진다. 비탈 위쪽으로 갈수록 가속(상향 연소).', danger: '불티가 바람에 날아 ‘앞질러’ 불을 놓는 비화(飛火) — 안전하다 믿은 등 뒤에서 새 불길이 솟는다.', survival: '불은 비탈을 빠르게 오른다 — 위가 아닌 옆·아래로, 이미 탄 땅·하천·바위지대로. 바람 방향과 직각으로 피한다.', psych: '연기로 해가 흐려지고 방향을 잃는 공포, ‘차로 도망’이 막히면 극심한 패닉.', timeline: '풍속 따라 수 분 만에 진로가 바뀜 — 안전지대가 순식간에 함정이 된다.', myth: '“불보다 빨리 위로 뛴다”는 자살행위 — 불은 오르막에서 더 빠르다.' },
      { name: '화상·열복사', aka: '복사열 손상', threat: '중등~치명적', onset: '불에 닿지 않아도 복사열만으로 피부가 익고 옷이 발화한다. 가까울수록 급격히.', danger: '뜨거운 공기를 들이마시면 기도가 부어 숨길이 막힌다(흡입 화상) — 겉상처 없이 치명적.', survival: '열원과의 거리·차폐가 전부. 합성섬유 옷은 녹아 들러붙으니 면·젖은 천이 낫다.', psych: '통증과 열에 사고가 마비되어 ‘그 자리에 멈추는’ 동결 반응이 흔하다.', timeline: '고온 노출 수 초에 화상, 기도 부종은 시차를 두고 악화.', myth: '“불 속에서 멀쩡히 대화”는 비현실 — 뜨거운 공기는 목부터 태운다.' },
    ],
  },
  {
    key: 'flood', label: '홍수·해일·익수', icon: '🌊',
    note: '물은 부드러워 보여 사람을 속인다. 얕고 느려 보이는 흐름조차 사람을 쓰러뜨리고 차를 띄운다.',
    items: [
      { name: '돌발 홍수', aka: '계곡·도심 침수', threat: '치명적', onset: '상류의 비 한 번에 맑던 하천이 ‘벽처럼’ 불어난다 — 내 머리 위 하늘이 맑아도.', danger: '발목 깊이 흐름이 사람을 넘어뜨리고, 무릎 깊이면 차를 떠밀어 휩쓴다 — ‘얕다’는 착각이 죽인다.', survival: '물을 건너지 않는다, 흙탕물 깊이·바닥을 못 믿는다. 차가 잠기기 시작하면 즉시 버리고 높은 곳으로.', psych: '익숙한 길·차에 대한 과신 — ‘이 정도쯤’ 하다 발이 떠밀린다. 재물(차·짐) 미련이 판단을 늦춘다.', timeline: '맑은 하늘에도 상류 강우로 수 분 만에 급류 — 골든타임이 가장 짧은 재난 중 하나.', myth: '“잠긴 도로를 천천히 통과”는 치명적 — 60cm 흐름이면 대부분의 차가 뜬다.' },
      { name: '익수·물에 빠짐', aka: '익사 과정', threat: '치명적', onset: '실제 익사는 조용하다 — 팔 흔들고 소리치는 영화 장면과 달리, 본능적 반응으로 말도 손짓도 못 한다.', danger: '주변에 사람이 있어도 ‘조용히’ 가라앉아 아무도 못 알아챈다. 구조하러 뛰어든 사람이 함께 빠지는 2차 사고.', survival: '몸의 힘을 빼고 누워 뜨기(생존 수영), 옷·신발이 부력을 돕기도. 직접 뛰어들기보다 막대·줄·부유물을 던진다.', psych: '본능적 익수 반응(IDR)으로 이성적 판단 불가 — 옆에서 보면 그저 ‘물에서 노는 것’ 같다.', timeline: '수면 위 발버둥은 20~60초, 그 뒤 가라앉는다 — 구조의 창이 매우 짧다.', myth: '“살려달라 외치며 손 흔든다”는 클리셰 — 진짜 익수자는 소리칠 숨도 없다.' },
      { name: '이안류·역조류', aka: '리프 커런트', threat: '중상~치명적', onset: '해변에서 바다 쪽으로 빨려 나가는 띠 모양 흐름 — 거품·모래가 바깥으로 흘러가는 통로처럼 보인다.', danger: '맞서 헤엄치면 아무리 헤엄을 쳐도 끌려 나가며 탈진 — 익사 원인의 큰 비중.', survival: '흐름을 거슬러 ‘해안으로’가 아니라, 해안과 ‘나란히’ 옆으로 빠져나온 뒤 비스듬히 들어온다.', psych: '해변이 빤히 보이는데 닿지 못하는 공포가 패닉·과호흡을 부르고 탈진을 앞당긴다.', timeline: '맞서 싸우면 수 분 내 탈진 — 침착하게 옆으로 빠지면 보통 살아남는다.', myth: '“곧장 해변으로 전력 수영”이 가장 위험 — 흐름과 싸우지 말고 옆으로.' },
      { name: '쓰나미·지진해일', aka: '해일', threat: '치명적', onset: '큰 지진 뒤 바닷물이 ‘비정상적으로 빠지며’ 갯벌이 드러나면 곧 거대한 물벽이 온다 — 종종 여러 차례.', danger: '첫 파도가 가장 크지 않을 수 있어, 한 번 지나갔다 안심하고 돌아갔다가 더 큰 파도에 휩쓸린다.', survival: '진동을 느끼거나 물이 빠지면 경보를 기다리지 말고 즉시 고지대·고층으로. 물 빠짐을 ‘구경’하지 않는다.', psych: '드러난 갯벌·물고기를 구경하러 바다로 다가가는 치명적 호기심 — 경보를 ‘과장’으로 여기는 정상화 편향.', timeline: '근해 지진이면 수 분, 원거리면 수십 분~시간 — 1차 후 2·3차 파도가 더 클 수 있다.', myth: '“파도 한 번 지나면 끝”은 위험한 오해 — 후속 파도가 더 크고 멀리 밀려든다.' },
      { name: '저체온·젖은 추위', aka: '수중 한랭', threat: '중상~치명적', onset: '찬물에 빠지면 첫 ‘냉수 충격’에 헐떡이며 물을 들이마시고, 곧 손발이 굳어 헤엄조차 못 친다.', danger: '구조될 때까지 버티는 게 관건인데, 의외로 ‘차가워서’가 아니라 헤엄 능력 상실·헐떡임으로 먼저 죽는다.', survival: '첫 1분은 호흡을 가다듬어 충격을 넘기고, 10분 안에 의미 있는 동작, 이후 체온 유지에 집중(웅크려 H.E.L.P 자세).', psych: '냉수 충격의 비자발적 헐떡임으로 ‘정신을 차리려 해도 안 되는’ 무력감과 공포.', timeline: '1분(호흡 충격)·10분(유효 동작)·1시간(저체온) — 생각보다 시간은 있으나 첫 1분이 고비.', myth: '“찬물에 빠지면 곧장 얼어 죽는다”는 과장 — 대개 익수·헐떡임이 더 빠른 사인.' },
    ],
  },
  {
    key: 'quake', label: '지진·붕괴·매몰', icon: '🏚️',
    note: '흔들림 자체보다 ‘무너지고 떨어지는 것’이 사람을 다치게 한다. 그 다음은 갇힘·여진·화재.',
    items: [
      { name: '지진 흔들림 대응', aka: '본진', threat: '중상~치명적', onset: '약한 진동(P파) 뒤 강한 흔들림(S파)이 몰려온다 — 서 있기 힘들고 물건이 날아다닌다.', danger: '낙하물(천장·유리·가구)과 도주 중 넘어짐이 대부분의 부상 원인 — 흔들림 자체보다 ‘떨어지는 것’.', survival: '흔들리는 동안 무리하게 뛰지 않고 튼튼한 책상 아래로(엎드려·가려·붙잡기), 진정되면 신발 신고 침착히 대피.', psych: '비현실감과 함께 ‘일단 밖으로’ 뛰쳐나가려는 충동 — 정작 출입구·계단에서 압사·낙하 사고가 난다.', timeline: '강한 흔들림은 보통 수십 초, 체감은 영원 같다. 직후 여진이 잇따른다.', myth: '“문틀 아래가 가장 안전”은 옛 통념 — 현대 건물에선 견고한 가구 아래·곁이 낫다.' },
      { name: '건물 붕괴·매몰', aka: '잔해 갇힘', threat: '치명적', onset: '한 층이 아래층을 짓누르며 차곡차곡 붕괴(팬케이크), 또는 부분 붕괴로 빈 공간(보이드)이 생긴다.', danger: '먼지로 인한 질식, 보이지 않는 출혈·압좌, 그리고 ‘구조될 때까지 버티는’ 탈수·저체온.', survival: '움직임을 최소화해 산소·체력 보존, 옷으로 입코 가려 먼지 차단, 소리 대신 ‘두드림’으로 위치 신호(목 보호).', psych: '어둠·정적·고립의 극한 공포 속에서 ‘소리 질러 체력을 소진’하는 함정 — 규칙적 두드림이 더 오래 간다.', timeline: '먼지 질식은 수 분, 이후 탈수·저체온이 수 시간~수 일의 생존을 좌우.', myth: '“쉴 새 없이 소리쳐 구조 요청”은 체력·산소를 빨리 소모 — 일정 간격의 타격음이 현실적.' },
      { name: '압좌 증후군', aka: '깔림 손상', threat: '치명적', onset: '오래 깔린 팔다리는 멀쩡해 보여도, 짓눌린 근육에서 독성 물질이 쌓인다.', danger: '구조되어 눌림이 ‘풀리는 순간’ 쌓인 독소가 온몸으로 퍼져 급사할 수 있다 — 살았다 안심한 직후의 역설.', survival: '장시간 깔림은 함부로 빼지 않고 의료와 함께 — ‘구하는 그 순간’이 가장 위험할 수 있다(개념).', psych: '구조자도, 피해자도 ‘이제 살았다’는 안도가 방심을 부르는 가장 위험한 장면.', timeline: '수 시간 이상 깔리면 위험 누적, 압박 해제 직후 수 분이 고비.', myth: '“깔린 사람을 무조건 빨리 빼낸다”가 늘 옳지는 않다 — 갑작스런 해제가 독이 될 때가 있다.' },
      { name: '여진·2차 붕괴', aka: '애프터쇼크', threat: '중상~치명적', onset: '본진 뒤 수 분~수 일에 걸쳐 작은 지진이 반복 — 이미 약해진 구조물을 마저 무너뜨린다.', danger: '본진을 버틴 건물이 여진에 무너지고, 구조하러 들어간 사람이 함께 매몰되는 2차 사고.', survival: '손상 건물에 다시 들어가지 않는다, 대피 후에도 한동안 여진을 가정하고 머문다.', psych: '“이제 끝났다”는 정상화 편향으로 위험한 건물에 물건을 가지러 들어가는 충동.', timeline: '여진은 본진 직후 가장 잦고, 며칠~몇 주 줄어들며 이어진다.', myth: '“한 번 흔들렸으니 당분간 안전”은 오해 — 직후가 여진이 가장 빈번하다.' },
      { name: '화산 분화·화쇄류', aka: '분연·용암', threat: '치명적', onset: '지진·이상 가스·부풀어 오름 등 전조 뒤 폭발. 화산재가 하늘을 덮고, 화쇄류(뜨거운 가스·재)가 산을 타고 내려온다.', danger: '용암보다 빠르고 치명적인 건 화쇄류(시속 수백 km, 수백 도)와 화산재 — 폐를 굳히고 지붕을 무너뜨린다.', survival: '바람 위·계곡 바깥으로 멀리, 마스크·젖은 천으로 재 흡입 차단, 강·계곡은 이류(라하르) 통로라 피한다.', psych: '느린 용암만 떠올려 ‘피할 수 있다’ 방심 — 정작 빠른 화쇄류·재에 당한다.', timeline: '화쇄류는 분화 후 수 분 내 산기슭 도달, 화산재 피해는 수 시간~수 일 지속.', myth: '“용암을 달려서 피한다”는 가능해도, 화쇄류는 인간이 결코 앞지를 수 없다.' },
    ],
  },
  {
    key: 'lost', label: '조난·길잃음·표류', icon: '🧭',
    note: '서바이벌의 핵심. 구조될 때까지의 ‘우선순위’ — 보온·물·신호·식량 순서가 생사를 가른다.',
    items: [
      { name: '산악 조난', aka: '길 잃음', threat: '중등~치명적', onset: '한 번 길을 놓치면 ‘조금만 더’ 가다 더 깊이 헤맨다 — 해가 지고 기온이 떨어지며 급변.', danger: '저체온·탈진·추락. 어두워지면 이동 자체가 위험 — 헤매다 절벽·계곡으로 떨어진다.', survival: '길을 잃었다 판단하면 ‘멈춰서(STOP)’ 생각, 능선·물길을 따르되 무리한 야간 이동 금지, 눈에 띄는 곳에서 신호.', psych: '‘되돌아가면 진다’는 비합리적 고집과 자존심이 조난을 키운다 — 인정하고 멈추는 게 가장 어렵다.', timeline: '길 잃은 직후 30분의 판단이 운명을 가른다 — 헤맬수록 수색 범위가 넓어진다.', myth: '“계속 걸으면 언젠가 길이 나온다”는 위험 — 보통 한자리에서 신호하는 편이 구조에 유리하다.' },
      { name: '생존 우선순위', aka: '3의 법칙', threat: '—', onset: '재난 직후 무엇부터 할지의 ‘순서’ — 패닉 속에서 엉뚱한 것에 매달리면 죽는다.', danger: '목마름이 급해 보여도 보통은 추위·노출이 먼저 죽인다 — 우선순위를 착각하는 것 자체가 위험.', survival: '대략 공기 3분·체온/은신 3시간·물 3일·식량 3주 — ‘오래 못 버티는 것부터’ 해결한다(개념적 척도).', psych: '식량을 가장 먼저 걱정하지만, 실제로는 보온·물이 훨씬 급하다 — 본능과 우선순위의 어긋남.', timeline: '분(호흡)·시간(체온)·일(물)·주(식량) — 위협의 시계가 전혀 다르다.', myth: '“일단 먹을 것부터”는 흔한 오판 — 굶주림보다 추위·탈수가 먼저 무너뜨린다.' },
      { name: '표류·해상 조난', aka: '바다 표류', threat: '중상~치명적', onset: '배가 가라앉거나 길을 잃고 망망대해에 — 햇볕·갈증·저체온·상어보다 ‘탈수와 노출’이 진짜 적.', danger: '바닷물을 마시면 갈증·탈수가 가속(역효과). 한낮 햇볕 노출과 밤의 한기가 번갈아 체력을 깎는다.', survival: '바닷물은 마시지 않는다, 빗물·이슬을 모은다, 그늘·보온을 만들고 체력을 아끼며 표류물·구조선을 기다린다.', psych: '망망대해의 고립감·시간 감각 상실, 환각·희망과 절망의 반복이 판단을 흔든다.', timeline: '물 없이는 며칠, 바닷물을 마시면 도리어 단축 — 그늘·보온이 수명을 늘린다.', myth: '“목마르면 바닷물이라도”는 치명적 — 염분이 탈수를 가속해 더 빨리 죽는다.' },
      { name: '신호·구조 요청', aka: '구조 신호', threat: '—', onset: '구조는 ‘찾아질 때’ 온다 — 보이지 않으면 코앞을 지나친다. 신호는 생존만큼 중요하다.', danger: '체력을 다 써 신호할 힘조차 없는 상태, 또는 엉뚱한 곳에서 기다려 수색대와 어긋남.', survival: '셋(3)의 규칙으로 신호(불 3개·호각 3번·거울 반사), 눈에 띄는 높은 곳·개활지, 땅에 큰 표식. 헬기 소리에 즉시 반응할 준비.', psych: '구조가 늦어질수록 ‘아무도 안 온다’는 절망 — 신호를 포기하는 순간이 진짜 위기.', timeline: '낮의 거울·연기, 밤의 불빛 — 시간대별로 가장 잘 보이는 신호가 다르다.', myth: '“가만히 있으면 알아서 찾는다”는 수동적 오판 — 적극적·반복적 신호가 구조율을 높인다.' },
      { name: '방향·길찾기', aka: '내비게이션', threat: '—', onset: '나침반·지도 없이 방향을 잃으면 인간은 무의식적으로 ‘원을 그리며’ 같은 곳을 맴돈다.', danger: '해·별·지형을 잘못 읽어 엉뚱한 방향으로 — 한 번의 오판이 며칠의 헛걸음이 된다.', survival: '물길은 대개 사람 사는 곳으로 이어진다(하류로), 해·그림자·별로 대강의 방위, 능선에서 지형을 읽는다(개념).', psych: '‘이쪽이 맞다’는 근거 없는 확신과, 그 확신이 틀렸을 때의 무너짐.', timeline: '낮의 태양 이동·밤의 별자리 — 시간이 곧 방향의 단서가 된다.', myth: '“이끼는 항상 북쪽에 낀다”는 부정확한 통념 — 습도·그늘에 좌우되어 못 믿는다.' },
    ],
  },
  {
    key: 'cold', label: '혹한·눈·동상', icon: '❄️',
    note: '추위는 조용히 판단력부터 앗아간다. 젖음·바람·탈진이 겹치면 체온은 가파르게 무너진다.',
    items: [
      { name: '저체온증 진행', aka: '한랭 노출', threat: '중상~치명적', onset: '심한 떨림 → 떨림이 멎고 말이 어눌·동작 둔화 → ‘역설적 탈의’(더운 줄 착각해 옷을 벗음) → 혼수.', danger: '떨림이 멈추면 ‘괜찮아졌다’가 아니라 더 위험한 단계 — 판단력이 사라져 스스로를 못 구한다.', survival: '젖은 옷을 마른 것으로, 바람을 막고 몸통부터 보온, 따뜻한 단 음료, 거칠게 흔들거나 뛰게 하지 않는다.', psych: '판단력 저하로 비합리적 행동(옷 벗기·엉뚱한 곳에 굴 파기), 본인은 위기를 자각 못 한다.', timeline: '젖고 바람 부는 곳이면 수십 분 만에 위험, 마른 보온이면 훨씬 오래 버틴다.', myth: '“떨림이 멈췄으니 적응했다”는 정반대 — 떨림 정지는 악화의 신호다.' },
      { name: '동상·조직 결빙', aka: '한랭 손상', threat: '중등~중상', onset: '손발끝·귀·코가 먼저 하얗게 굳고 감각이 사라진다 — 본인은 ‘시린’ 단계를 지나 ‘아무 느낌 없는’ 상태로.', danger: '녹였다 다시 어는 ‘재동결’이 한 번에 어는 것보다 훨씬 손상이 크다 — 어설픈 가온이 더 해롭다.', survival: '체온의 미지근한 물에 서서히 녹이되, 다시 얼 위험이 있으면 녹이지 않고 그대로 보호하며 이동.', psych: '감각이 없어 ‘괜찮다’ 여기고 계속 노출 — 통증이 없는 게 오히려 위험 신호다.', timeline: '강추위·바람이면 노출 살갗이 수 분 내 동상, 심부 동상은 녹인 뒤에야 손상 정도가 드러난다.', myth: '“언 손발을 불·눈으로 문지른다”는 손상을 키운다 — 미지근한 물이 정석.' },
      { name: '눈사태', aka: '설붕', threat: '치명적', onset: '경사·적설·기온 변화가 겹친 비탈에서 ‘쩍’ 갈라지는 소리와 함께 눈덩이가 통째로 미끄러진다.', danger: '쏟아진 눈에 묻히면 콘크리트처럼 굳어 스스로 못 움직인다 — 질식·저체온이 분 단위로 진행.', survival: '휩쓸리면 ‘헤엄치듯’ 위로 떠오르려 애쓰고, 멈추기 직전 입 앞에 공기 공간을 만든다(개념). 동료의 신속한 수색이 관건.', psych: '묻힌 직후 어느 쪽이 위인지조차 모르는 방향 상실, 굳은 눈 속의 극한 폐소공포.', timeline: '매몰 15분 내 구조가 생존율을 크게 가른다 — 그 뒤로 급락한다.', myth: '“침을 흘려 위쪽을 가늠한다”는 묘사가 있으나, 현실은 즉각 동료 수색·장비가 생존을 좌우한다.' },
      { name: '눈보라·화이트아웃', aka: '시야 상실', threat: '중상~치명적', onset: '바람에 날린 눈으로 하늘과 땅의 경계가 사라져 ‘하얀 무(無)’ 속에 갇힌다 — 한 걸음 앞도 안 보인다.', danger: '방향·거리 감각이 통째로 사라져, 코앞의 대피소를 못 찾고 제자리를 맴돌다 탈진·동사.', survival: '무리한 이동을 멈추고 바람을 피할 은신처(눈 구덩이·바위 뒤)를 만들어 체온을 지키며 시야 회복을 기다린다.', psych: '온통 흰 공간의 비현실감과 고립이 패닉을 부르고, 가만히 못 있어 헤매다 더 위험해진다.', timeline: '화이트아웃은 수 분~수 시간 지속 — 그치기를 기다리는 인내가 생존을 가른다.', myth: '“익숙한 길이니 감으로 간다”가 가장 위험 — 화이트아웃에선 베테랑도 방향을 잃는다.' },
      { name: '얼음 붕괴·빠짐', aka: '결빙수 추락', threat: '치명적', onset: '얼어붙은 호수·강을 건너다 얇은 곳에서 ‘쩍’ 하며 얼음이 깨져 찬물에 빠진다.', danger: '냉수 충격·얼음 가장자리를 붙잡고도 못 올라오는 무력감, 빠진 구멍을 다시 못 찾는 것.', survival: '몸을 수평으로 눕혀 얼음 위로 ‘기어 오르듯’ 빠져나오고, 일어서지 말고 들어온 쪽(단단했던 길)으로 굴러 멀어진다.', psych: '냉수 충격의 비자발적 헐떡임과 ‘얼음이 또 깨질까’ 하는 공포로 동작이 굳는다.', timeline: '냉수에서 유효한 동작은 약 10분, 그 안에 빠져나오지 못하면 급격히 어려워진다.', myth: '“일어서서 단번에 뛰어 오른다”는 위험 — 체중이 집중돼 얼음이 더 깨진다, 눕혀서 분산해야 한다.' },
    ],
  },
  {
    key: 'famine', label: '기아·갈증·결핍', icon: '🥖',
    note: '굶주림·목마름은 느린 재난. 몸과 정신이 단계적으로 무너지며 사회의 규범까지 시험한다.',
    items: [
      { name: '굶주림의 진행', aka: '기아', threat: '중등~치명적', onset: '며칠은 ‘배고픔’이지만, 이후 몸이 근육까지 태우며 추위·무기력·집중력 붕괴가 온다.', danger: '오래 굶은 사람에게 갑자기 많이 먹이면 ‘재급식 증후군’으로 도리어 위험 — 조금씩 회복해야 한다(개념).', survival: '에너지 소비를 줄이고(이동·노출 최소화) 보온, 음식이 생기면 조금씩 자주 — 한꺼번에 폭식하지 않는다.', psych: '머릿속이 온통 음식 생각, 무기력·우울·짜증, 후반엔 무관심·환각까지 — 윤리 판단도 흐려진다.', timeline: '물만 있으면 수 주까지 — 다만 추위·노동이 겹치면 훨씬 빨리 무너진다.', myth: '“굶다 음식을 보면 실컷 먹는다”가 위험 — 갑작스런 과식이 회복을 해친다.' },
      { name: '갈증·탈수', aka: '수분 결핍', threat: '중상~치명적', onset: '갈증·입마름 → 소변 감소·진한 색 → 두통·어지럼·무기력 → 혼미·환각.', danger: '깨끗한 물에 대한 집착으로 더러운 물·바닷물·오줌을 마셔 도리어 탈수·감염을 가속하는 것.', survival: '땀·활동을 줄이고 그늘·서늘함으로 수분 보존, 빗물·이슬·식물 수분을 모은다(개념). 오염수는 끓이거나 거른다.', psych: '환각·집착, ‘조금만 더 가면 물이 있다’는 헛된 희망에 체력을 소진.', timeline: '물 없이는 대체로 며칠 — 더위·노동이면 하루 만에도 위험해진다.', myth: '“목마르면 무슨 물이든 마신다”는 치명적 — 오염수·바닷물은 결국 더 빨리 죽인다.' },
      { name: '식수 확보·정수', aka: '물 만들기', threat: '—', onset: '주변에 물이 보여도 그대로 마시면 병원체·기생충으로 설사·탈수 — 도리어 물을 더 잃는다.', danger: '맑아 보이는 계곡물도 상류의 동물 사체·배설물로 오염될 수 있다 — 외관으로 안전을 판단 못 한다.', survival: '끓이기가 가장 확실, 천·모래로 거른 뒤 끓이거나 햇볕(투명병)·증류로(개념). 고인 물보다 흐르는 물.', psych: '갈증의 압박에 ‘설마 괜찮겠지’ 하고 정수를 생략하는 유혹 — 그 한 모금이 며칠을 망친다.', timeline: '오염수 섭취 후 수 시간~며칠 내 설사·탈수가 생존을 위협.', myth: '“흐르는 맑은 물은 안전하다”는 오해 — 보이지 않는 오염은 끓여야 사라진다.' },
      { name: '먹을 수 있는 것·독성', aka: '야생 식량', threat: '중등~치명적', onset: '굶주림에 아무거나 먹으려는 충동 — 그러나 ‘아는 것만’이 철칙이다.', danger: '독버섯·독초는 멀쩡히 먹다 몇 시간 뒤 장기 부전 — 맛·외관으로 독성을 가릴 수 없다.', survival: '확실히 아는 것만, 모르는 식물·버섯은 굶더라도 피한다(굶주림보다 중독이 빠르다). 동물성은 익혀서.', psych: '극한 굶주림이 판단을 마비시켜 평소라면 안 먹을 것에 손을 댄다 — 그 절박함 자체가 위험.', timeline: '독성 발현은 즉시~수 시간 — 증상이 늦게 오는 독일수록 치명적이다.', myth: '“동물이 먹으면 사람도 안전”은 거짓 — 동물에게 무해해도 사람에겐 치명적인 게 많다.' },
      { name: '결핍 속 사회 붕괴', aka: '집단 행동', threat: '—', onset: '식량·물이 바닥나면 협력하던 무리가 ‘각자도생’으로 갈라지고, 사재기·약탈·서열 다툼이 번진다.', danger: '재난 자체보다 ‘무너진 질서’가 더 많은 피해를 — 공포·소문이 약탈과 폭력을 부추긴다.', survival: '신뢰할 소규모 협력, 자원 은닉과 공유의 균형, 정보·소문의 검증 — 인간관계가 곧 생존 자원이 된다.', psych: '결핍이 길어지면 이타심과 이기심이 충돌, 평범한 사람도 극단적 선택으로 — 재난 서사의 핵심 갈등.', timeline: '결핍 며칠~몇 주에 걸쳐 협력→불신→붕괴로 — 회복은 그보다 훨씬 더디다.', myth: '“재난엔 다들 패닉·약탈”은 과장 — 실제론 의외로 많은 이가 서로 돕는다(재난 유토피아).' },
    ],
  },
  {
    key: 'psych', label: '재난 심리·집단 반응', icon: '🧠',
    note: '재난물의 진짜 무대는 사람의 마음. 공황·동결·정상화 편향이 ‘왜 그렇게 행동했는가’를 설명한다.',
    items: [
      { name: '정상화 편향', aka: '설마의 심리', threat: '—', onset: '경보가 울려도 ‘설마, 별일 아니겠지’ 하며 평소처럼 행동을 이어가는 무의식적 부정.', danger: '대피해야 할 골든타임을 ‘짐을 챙기고·확인하고·남을 기다리며’ 흘려보낸다 — 가장 흔한 사망 원인 중 하나.', survival: '경보를 ‘과민’으로 깎지 않고 일단 움직이는 훈련, 미리 정한 행동 규칙을 ‘생각 없이’ 따르는 것.', psych: '“여태 괜찮았으니 이번에도”라는 경험의 함정 — 주변이 안 움직이면 나도 안 움직인다(동조).', timeline: '경보~행동까지의 지체가 수 분~수십 분 — 그 지체가 생사를 가른다.', myth: '“위험하면 사람들은 즉시 도망친다”는 오해 — 실제론 한참 머뭇거리다 늦는다.' },
      { name: '공황·터널 비전', aka: '패닉', threat: '—', onset: '극한 공포에 시야·사고가 좁아져 ‘한 가지’에만 매달리거나, 비명·도주·동결로 폭발한다.', danger: '출구가 빤히 있어도 못 보고, 한 문에 몰려 압사(군중 쇄도)하거나, 엉뚱한 행동을 반복한다.', survival: '호흡을 의식적으로 늦추고, ‘다음 한 가지’만 정해 행동(인지 부하 낮추기), 명확한 지시·역할이 패닉을 가라앉힌다.', psych: '집단 공황은 전염된다 — 한 사람의 침착함 혹은 비명이 무리 전체를 좌우한다.', timeline: '패닉은 수 초 만에 번지고, 한 번 군중 쇄도가 시작되면 멈추기 어렵다.', myth: '“재난엔 모두가 비명 지르며 미친 듯 도망”은 영화적 과장 — 오히려 굳어버리는(동결) 사람이 많다.' },
      { name: '동결 반응', aka: '얼어붙음', threat: '—', onset: '싸움도 도망도 못 하고 ‘그 자리에 굳는’ 반응 — 위기 앞 다수가 보이는 자동 반응이다.', danger: '대피할 시간이 있는데도 자리에 앉아 멍하니 있다 휩쓸린다 — 본인은 ‘몸이 안 움직인다’고 느낀다.', survival: '구체적·단순한 지시(“너, 이 문으로 나가”)가 동결을 푼다 — 막연한 “도망쳐”는 잘 안 먹힌다.', psych: '비현실감·해리, ‘이게 진짜일 리 없다’는 인지부조화 속에 행동이 멈춘다.', timeline: '동결은 수 초~수 분, 누군가의 명확한 지시나 충격으로 풀린다.', myth: '“위기엔 본능적으로 도망간다”와 달리, 멈춰 서는 사람이 더 많다는 점이 재난 묘사의 묘미.' },
      { name: '영웅·이타 행동', aka: '재난 유토피아', threat: '—', onset: '대혼란 속에서도 낯선 이를 끌어내고 자원을 나누는 협력이 자연발생 — 의외로 흔하다.', danger: '구하러 뛰어든 사람이 2차 피해를 입거나(과욕), 영웅심이 무모한 위험을 부르기도.', survival: '냉정한 이타심 — 자기 안전을 먼저 확보한 뒤 돕는다(“산 사람이 구한다”). 역할 분담과 리더십.', psych: '공동의 위기가 평소의 벽을 허물고 강한 연대감을, 그러나 자원이 마르면 다시 갈라진다.', timeline: '재난 직후 며칠은 협력이 정점, 장기화되면 피로·결핍으로 약해진다.', myth: '“재난이면 인간은 짐승이 된다”는 통념과 반대 — 다수는 서로 돕고, 약탈은 예외적이다.' },
      { name: '생존자의 그림자', aka: '외상후 반응', threat: '—', onset: '위기를 넘긴 뒤가 진짜 시작 — 악몽·플래시백·놀람 반응·죄책감이 한참 뒤에 찾아온다.', danger: '“나만 살았다”는 생존자 죄책감, 무감각·고립, 일상 복귀의 어려움 — 보이지 않는 후유.', survival: '안전감의 회복, 말로 풀어내기, 일상 루틴의 재건, 같은 경험을 한 이들과의 연대(개념).', psych: '겉으론 멀쩡해 보여도 사소한 소리·냄새에 그날로 돌아간다 — 트리거의 무게.', timeline: '직후의 충격·마비 → 수 주~수 개월의 반응 → 회복 혹은 만성화로 갈린다.', myth: '“살아남았으니 다행, 곧 괜찮아진다”는 단순화 — 마음의 회복은 몸보다 더디고 복잡하다.' },
    ],
  },
  {
    key: 'storm', label: '폭풍·낙뢰·이상기상', icon: '⛈️',
    note: '하늘의 재난. 바람·번개·우박·폭염이 빠르게 닥치며, 잘못된 ‘피난처’가 더 위험할 때가 많다.',
    items: [
      { name: '태풍·허리케인', aka: '열대성 폭풍', threat: '중상~치명적', onset: '며칠에 걸쳐 다가오며 바람·폭우가 점점 거세진다 — 눈(eye)이 지날 땐 거짓 고요가 잠시.', danger: '바람보다 ‘물’이 더 많이 죽인다 — 폭우 침수와 해안 폭풍해일. 날아오는 파편도 흉기가 된다.', survival: '미리 대피·창문 보강, 폭풍 중 외출 금지, ‘눈’의 고요에 속아 나가지 않는다(곧 반대편 강풍).', psych: '오래 다가오는 만큼 ‘아직 멀었다’는 방심과, 막상 닥치면 갇힌 무력감.', timeline: '예보~상륙까지 며칠의 준비 시간, 본체 통과는 수 시간, 침수 피해는 그 뒤로도.', myth: '“태풍의 눈에 들면 끝났다”는 오해 — 고요 뒤 반대 방향 강풍이 다시 몰아친다.' },
      { name: '토네이도·돌풍', aka: '회오리', threat: '치명적', onset: '시커먼 구름 아래 깔때기가 내려오고, ‘화물열차 같은’ 굉음과 함께 순식간에 덮친다.', danger: '날아다니는 파편이 진짜 흉기 — 풍속보다 ‘무엇이 날아오느냐’가 생사를 가른다. 차·창가가 가장 위험.', survival: '창에서 멀리, 건물 중심부·지하·튼튼한 작은 방에 낮게 엎드려 머리·목을 가린다. 차로 도망치지 않는다.', psych: '워낙 빨라 ‘판단할 새도 없는’ 급습 — 굉음을 듣고서야 깨닫는 경우가 많다.', timeline: '깔때기 형성에서 통과까지 수 분 — 사실상 즉시 은신만이 답이다.', myth: '“창문을 열어 기압을 맞춘다”는 낡은 통념 — 시간 낭비에 파편 위험만 키운다.' },
      { name: '낙뢰', aka: '벼락', threat: '중등~치명적', onset: '천둥과 번개의 간격이 좁아지면 머리 위로 다가온 것 — ‘번쩍’과 ‘우르릉’이 거의 동시면 코앞이다.', danger: '높은 곳·나무·물가·금속이 위험. 직접 맞지 않아도 땅을 타고 흐르는 전류·측면 섬락에 당한다.', survival: '높은 나무·개활지·물에서 벗어나 낮은 자세(웅크려 발 모으기), 금속 멀리. 천둥 멎고도 30분은 대기.', psych: '천둥소리에 패닉해 나무 밑으로 뛰어드는 ‘가장 위험한 곳’으로의 본능적 오판.', timeline: '번개~천둥 3초당 약 1km — 간격이 짧아지면 즉시 대피, 멀어진 뒤에도 한동안 위험.', myth: '“번개는 같은 곳에 두 번 안 친다”는 거짓 — 높은 지점엔 거듭 떨어진다.' },
      { name: '폭염·열돔', aka: '극한 더위', threat: '중상~치명적', onset: '며칠씩 식지 않는 더위가 누적 — 밤에도 안 식어 몸이 회복할 틈이 없다.', danger: '땀이 멎고 피부가 뜨겁고 마르며 혼란이 오면 열사병(응급) — 노약자·실내 고립자가 조용히 쓰러진다.', survival: '한낮 활동·노출 줄이고 그늘·통풍·수분, 의식 저하·마른 피부는 즉시 적극 냉각(물·바람). 차 안에 사람·동물 방치 금물.', psych: '“이 정도 더위쯤” 하는 과소평가, 무기력에 대처 자체를 미루는 위험.', timeline: '며칠 누적되며 위험이 쌓이고, 열사병은 발병 후 빠른 냉각이 생사를 가른다.', myth: '“땀 흘리니 괜찮다”와 반대 — 땀이 멎고 마른 피부가 더 위험한 신호다.' },
      { name: '우박·번개폭풍 동반', aka: '뇌우 복합', threat: '중등~중상', onset: '검푸른 구름·갑작스런 한기·바람 방향 급변이 강한 뇌우의 전조 — 우박·돌풍·낙뢰가 한꺼번에.', danger: '큰 우박은 차·지붕을 부수고 사람을 다치게, 동반된 돌풍·침수·낙뢰가 위험을 겹겹이 쌓는다.', survival: '튼튼한 실내로, 창에서 멀리. 야외·차 안이면 머리를 가리고 우박이 그칠 때까지 대기.', psych: '갑작스런 굉음·타격에 패닉, 차로 무리하게 이동하려다 침수·낙뢰에 노출.', timeline: '강한 뇌우는 수십 분~수 시간, 우박은 대개 짧지만 격렬하다.', myth: '“소나기쯤이야”라며 야외 활동을 강행하다 낙뢰·돌풍에 당하는 경우가 흔하다.' },
    ],
  },
]

const LS = 'sry:tool:disaster-survival-ref:'
const ALL = '__all__'

type Flat = { cat: CatDef; item: Entry }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))
const flatOf = (catKey: string): Flat[] =>
  catKey === ALL ? flatAll() : CATS.filter((c) => c.key === catKey).flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 항목 → 필드 라벨 묶음
const FIELDS: { k: keyof Entry; label: string }[] = [
  { k: 'aka', label: '범주·이칭' },
  { k: 'threat', label: '위협 강도' },
  { k: 'onset', label: '전개·발생' },
  { k: 'danger', label: '진짜 위험' },
  { k: 'survival', label: '생존 행동' },
  { k: 'psych', label: '심리·집단 반응' },
  { k: 'timeline', label: '시간 흐름' },
  { k: 'myth', label: '흔한 오류·유의' },
]

function plainText(f: Flat): string {
  const lines = [`🌪️ ${f.item.name}  (${f.cat.label})`]
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
    `<p><i>※ 재난·서바이벌 창작 고증용 참고 자료입니다. 실제 재난 대응·안전 지침이 아닙니다.</i></p>`,
  ].join('')
}

export default function DisasterSurvivalRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 가 오면 안내 힌트로 활용(맥락 활용)
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

  const total = CATS.reduce((n, c) => n + c.items.length, 0)
  const favKey = (catKey: string, name: string) => `${catKey}::${name}`

  const q = query.trim().toLowerCase()
  let filtered: Flat[] = flatOf(cat)
  if (onlyFav) filtered = filtered.filter(({ cat: c, item }) => favs[favKey(c.key, item.name)])
  if (q) {
    filtered = filtered.filter(({ cat: c, item }) => {
      if (c.label.toLowerCase().includes(q)) return true
      if (item.name.toLowerCase().includes(q)) return true
      return FIELDS.some((fd) => String(item[fd.k] || '').toLowerCase().includes(q))
    })
  }

  const rollRandom = () => {
    const pool = flatOf(cat)
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.name === prev.item.name && pick.cat.key === prev.cat.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return pick
    })
  }

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

  // 스니펫 라이브러리 저장(글감)
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: `[재난 자료] ${plainText(f)}`,
      source: '재난·생존 고증 사전',
      tags: ['재난', '생존', '고증', f.cat.label, f.item.name],
    })
    flash(`스니펫 라이브러리에 ‘${f.item.name}’ 자료를 저장했습니다.`)
  }

  // 수집함에 담기
  const toStash = (f: Flat) => {
    if (!hasStash()) { flash('수집함에 연결되어 있지 않습니다.'); return }
    addToStash({ kind: 'note', label: `${f.item.name} (${f.cat.label})`, text: plainText(f) })
    flash(`수집함에 ‘${f.item.name}’을(를) 담았습니다.`)
  }

  // 프로젝트 자료에 추가
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '재난·생존 자료',
      title: `${f.item.name} (${f.cat.label})`,
      bodyHtml: bodyHtml(f),
      meta: { 분류: f.cat.label, 위협강도: f.item.threat || '', 시간흐름: f.item.timeline ? '경과 있음' : '' },
    })
    if (id) flash(`프로젝트 자료 〈재난·생존 자료〉에 ‘${f.item.name}’을(를) 추가했습니다.`)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  const threatColor = (t?: string) => {
    if (!t) return 'var(--muted)'
    if (t.includes('치명')) return 'var(--accent)'
    if (t.includes('중상')) return 'var(--accent)'
    if (t === '—') return 'var(--muted)'
    return 'var(--ok)'
  }

  const renderFields = (item: Entry) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
      {FIELDS.filter((fd) => item[fd.k]).map((fd) => (
        <div key={fd.k} style={{ fontSize: 12.5, lineHeight: 1.55 }}>
          <span style={{ color: fd.k === 'threat' ? threatColor(item.threat) : 'var(--accent)', fontWeight: 600, marginRight: 6 }}>{fd.label}</span>
          <span>{String(item[fd.k])}</span>
        </div>
      ))}
    </div>
  )

  return (
    <div style={wrap}>
      {/* 창작 참고용 명시 — 가장 위에 고정 */}
      <div style={{
        background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)',
        borderRadius: 8, padding: '8px 11px', fontSize: 12, lineHeight: 1.55, color: 'var(--muted)',
      }}>
        <Emoji e="⚠️" /> <b style={{ color: 'var(--text)' }}>창작 고증 참고 자료</b>입니다. 재난·서바이벌 묘사의 개연성을 돕는 서사용 단서이며,
        <b style={{ color: 'var(--text)' }}> 실제 재난 대응·안전 지침이 아닙니다.</b> 실제 상황에서는 공식 재난 안전 안내에 따르세요.
      </div>

      <div style={hint}>
        화재·홍수·지진·조난·혹한·기아·재난 심리·이상기상 등 <b>{total}개</b> 항목을 카테고리로 정리했습니다.
        검색·펼침으로 찾고, 무작위로 영감을 얻고, 클릭해 복사하거나 수집함·스니펫·프로젝트로 보내세요.
        {genreHint ? <>  (전달된 맥락: <b>{genreHint}</b>)</> : null}
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름·전개·위험·심리로 검색 (예: 연기, 급류, 저체온, 패닉, 정상화)"
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

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 뽑기</button>
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
              {copiedKey === 'rnd' ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}
            </button>
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="💾" /> 스니펫 저장</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>
              {favs[favKey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
          <div className="linkbar" style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
            <button className="linkbtn" onClick={() => toStash(random)} disabled={!hasStash()}
              title={hasStash() ? '이 자료를 수집함에 담기' : '수집함에 연결되어 있지 않습니다'}>
              <Emoji e="📎" /> 수집함
            </button>
            <button className="linkbtn" onClick={() => toProject(random)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '프로젝트 자료 〈재난·생존 자료〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('injury-recovery-ref', { genre: genreHint })} title="부상·회복 리얼리즘 사전 열기(재난으로 인한 부상·후유 묘사로 확장)"><Emoji e="🩹" /> 부상·회복 사전</button>
            <button className="linkbtn" onClick={() => openToolLinked('scene-forge')} title="장면 단조기 열기(재난 장면 묘사로 확장)"><Emoji e="🎬" /> 장면 단조기</button>
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
            {onlyFav ? '☆ 아직 즐겨찾기한 자료가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const fk = favKey(c.key, item.name)
            const open = !!expanded[fk]
            const isFav = !!favs[fk]
            return (
              <div key={fk} style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /> {c.label}</span>
                  <button onClick={() => toggleExpand(fk)} title={open ? '접기' : '펼치기'}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', fontSize: 15, fontWeight: 700, textAlign: 'left' }}>
                    {open ? '▾' : '▸'} {item.name}
                  </button>
                  {item.threat && (
                    <span style={{ fontSize: 10.5, color: threatColor(item.threat), border: `1px solid ${threatColor(item.threat)}`, borderRadius: 6, padding: '1px 5px', flexShrink: 0 }}>
                      {item.threat}
                    </span>
                  )}
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(c.key, item.name)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                {!open && item.onset && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.onset}
                  </div>
                )}
                {open && renderFields(item)}
                {open && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
                    <button className="minibtn" onClick={() => copy(plainText({ cat: c, item }), 'item:' + fk)}>
                      {copiedKey === 'item:' + fk ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}
                    </button>
                    <button className="minibtn" onClick={() => saveSnippet({ cat: c, item })}><Emoji e="💾" /> 스니펫 저장</button>
                    <button className="linkbtn" onClick={() => toStash({ cat: c, item })} disabled={!hasStash()}
                      title={hasStash() ? '수집함에 담기' : '수집함에 연결되어 있지 않습니다'}>
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

      <div style={hint}>재난의 리얼리즘은 ‘무서운 장면’이 아니라 ‘납득되는 전개와 선택’입니다. 위협의 시계와 사람의 심리를 함께 그려 인물의 결정에 무게를 더하세요.</div>
    </div>
  )
}
