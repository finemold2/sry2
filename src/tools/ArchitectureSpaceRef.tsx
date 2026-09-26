// 건축·공간 묘사 사전 — 배경 묘사를 위한 로컬 자작 자료집.
//  시대·용도별(궁궐/저택/시장/감옥/성채/현대빌딩 등) 공간을 구조·재료·소리·냄새·빛·동선·디테일 관점으로 정리.
//  자급식: react 와 './linkbus' 외 import 없음. 외부 API·미디어·네트워크 없음(전부 로컬 자작 텍스트).
//  카테고리 펼침/접기 + 검색 + 무작위 뽑기 + 클릭 복사 + 수집함/스니펫/프로젝트 연계.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToStash, addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'architecture-space-ref',
  name: '건축·공간 묘사 사전',
  icon: '🏛️',
  group: '리서치·자료',
  intro: '궁궐·저택·시장·감옥·성채·현대빌딩 등 공간을 구조·재료·소리·냄새·빛·동선 묘사 요소로 정리한 배경 묘사 자료',
  w: 660,
  h: 680,
}

// ---------- 항목 형(型) ----------
// 모든 텍스트는 '묘사 영감'을 위한 감각 단서 모음이다. 사실 고증이 아니라 분위기 스케치로 쓴다.
interface Entry {
  name: string          // 공간 이름
  era?: string          // 시대·맥락
  structure?: string    // 구조·평면·동선의 골격
  material?: string     // 재료·질감·표면
  light?: string        // 빛·그림자·색온도
  sound?: string        // 소리·울림·정적
  smell?: string        // 냄새·공기
  flow?: string         // 동선·사람의 움직임
  detail?: string       // 작은 디테일·소품
  mood?: string         // 분위기·정서 한 줄
}
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ---------- 로컬 대량 자료집 (자작 묘사 데이터) ----------
const CATS: CatDef[] = [
  {
    key: 'palace', label: '궁궐·권력의 공간', icon: '👑',
    note: '위계가 곧 평면이 되는 곳. 깊이 들어갈수록 권력이 짙어지고, 빈 공간 자체가 권위가 된다.',
    items: [
      { name: '정전(正殿)·알현실', era: '왕조·전근대', structure: '축선을 따라 켜켜이 놓인 문과 마당을 지나, 가장 깊은 곳에 단을 높여 옥좌를 둔다. 신하는 좌우로 도열하고 중앙 통로는 비워 둔다.', material: '닳아 윤이 나는 돌바닥, 붉은 기둥, 천장의 금박 단청, 발 아래 깔린 두꺼운 깔개.', light: '높은 창에서 비스듬히 떨어지는 빛이 먼지 기둥을 만들고, 옥좌 뒤는 어둑하게 남겨 사람을 작아 보이게 한다.', sound: '발소리가 천장까지 길게 메아리치고, 기침 하나가 온 방을 가로지른다. 그 뒤에 오는 정적이 더 크다.', smell: '오래된 목재, 향(香) 연기, 차갑게 식은 돌의 냄새.', flow: '아무도 옥좌를 등지지 않는다. 물러날 때조차 뒷걸음으로 나가며, 중앙선은 오직 가장 높은 자만 밟는다.', detail: '바닥의 품계석, 옥좌 손잡이만 유독 손때로 검게 닳은 자국, 도열한 신하의 그림자가 만드는 두 줄.', mood: '거대한 침묵이 사람을 짓누르는, 비어 있어서 더 위압적인 공간.' },
      { name: '편전·집무 공간', era: '왕조·전근대', structure: '정전보다 작고 낮으나 더 은밀하다. 칸막이와 병풍으로 시선을 끊고, 작은 마당이 딸려 빠른 보고가 오간다.', material: '나무 마루의 삐걱임, 종이 바른 문, 먹과 벼루, 서안(書案) 위 정돈된 문서 더미.', light: '문살을 통과한 빛이 바닥에 격자무늬를 깔고, 저녁이면 등잔 하나가 얼굴 절반만 비춘다.', sound: '붓이 종이를 긁는 소리, 낮게 주고받는 말, 문밖에서 대기하는 자의 헛기침.', smell: '먹 갈린 냄새, 묵은 종이, 식어 가는 차.', flow: '보고하는 자는 문턱을 넘지 못하고 무릎걸음으로 다가간다. 결정은 짧고, 사람은 빠르게 드나든다.', detail: '아무렇게나 접힌 상소문, 식은 찻잔의 둥근 자국, 병풍 뒤에서 새어 나오는 또 다른 그림자.', mood: '겉은 차분하지만 한 마디에 운명이 갈리는, 팽팽한 실무의 공간.' },
      { name: '후궁·내전(內殿)', era: '왕조·전근대', structure: '담장에 담장이 겹쳐 미로 같은 안뜰의 연속. 작은 정원과 회랑이 칸칸이 이어지고 바깥 시선은 철저히 차단된다.', material: '곱게 다듬은 마루, 비단 휘장, 자개 박힌 가구, 화초 심긴 화분과 연못의 돌.', light: '회랑 그늘과 뜰의 햇빛이 번갈아 들어 걸음마다 명암이 바뀐다. 밤엔 등롱이 길을 점점이 밝힌다.', sound: '비단 스치는 소리, 멀리서 들리는 웃음과 그보다 더 멀리서 끊기는 울음, 새장 속 새소리.', smell: '분 냄새, 꽃향, 향낭(香囊), 그 아래 깔린 약 달이는 냄새.', flow: '복도는 좁고 굽어 누가 오는지 늦게 보인다. 시중드는 이들이 소리 없이 미끄러지듯 움직인다.', detail: '담 모서리마다 다른 꽃, 잠긴 작은 문, 휘장 사이로 잠깐 마주치는 눈빛.', mood: '아름답지만 갇힌, 화려한 새장 같은 은밀함.' },
      { name: '궁궐 부엌·수라간', era: '왕조·전근대', structure: '여러 칸의 아궁이와 큰 솥이 늘어선 열기의 공간. 식재료 창고, 우물, 배선(配膳) 통로가 거미줄처럼 연결된다.', material: '검댕 묻은 벽, 무쇠 솥, 나무 도마와 떡살, 차곡차곡 쌓인 그릇과 짚으로 싼 항아리.', light: '아궁이 불빛이 천장을 붉게 흔들고, 김이 빛을 흐려 모든 것이 어렴풋하다.', sound: '끓는 물, 칼이 도마를 두드리는 박자, 고함 같은 지시, 그릇 부딪는 쇳소리.', smell: '장작 연기, 끓는 국물, 마늘과 파, 갓 찐 떡과 누룽지.', flow: '음식은 정해진 동선으로만 흐른다 — 만든 손과 나르는 손이 다르고, 맛보는 자가 중간에 있다.', detail: '솥마다 붙은 이름표, 독에 새긴 표시, 바닥에 흘린 물기와 미끄러지지 않으려 깐 짚.', mood: '열기와 긴장이 뒤섞인, 한 끼에 목숨을 거는 분주함.' },
    ],
  },
  {
    key: 'mansion', label: '저택·부유한 거주', icon: '🏚️',
    note: '돈과 취향이 벽지·계단·문고리에까지 스민 곳. 화려한 앞면 뒤에 일하는 자들의 어두운 통로가 숨는다.',
    items: [
      { name: '대저택 현관·홀', era: '근대·계급사회', structure: '문을 열면 천장이 위층까지 트인 홀이 펼쳐지고, 양쪽으로 휘어 올라가는 계단이 손님을 맞는다.', material: '대리석 바닥의 차가운 윤기, 마호가니 난간, 두꺼운 카펫, 벽을 채운 초상화와 거울.', light: '높은 창과 천장 샹들리에가 만드는 환한 무대 — 들어서는 사람이 곧 구경거리가 된다.', sound: '구두 굽이 돌바닥을 또각이는 소리, 멀리 닫히는 문, 시계의 묵직한 추 소리.', smell: '밀랍 광택제, 갓 자른 꽃, 오래된 책과 가죽.', flow: '주인과 손님은 정면 계단으로, 하인은 벽 뒤 좁은 문으로 — 두 세계가 한 벽을 사이에 두고 흐른다.', detail: '먼지 한 톨 없는 거울, 방문객 명함을 받는 은쟁반, 계단 끝에서 내려다보는 초상화의 시선.', mood: '환대 같지만 평가받는, 첫인상이 곧 신분 심사인 공간.' },
      { name: '서재·집무실', era: '근대·부르주아', structure: '벽을 가득 채운 책장과 묵직한 책상이 권위를 만든다. 안락의자와 벽난로가 한쪽에서 사적인 대화를 부른다.', material: '가죽 장정 책의 등, 녹색 갓 램프, 가죽 의자의 갈라진 결, 마룻널과 양탄자.', light: '낮엔 창가 한 자리만 밝고, 밤엔 램프 한 점이 책상을 섬처럼 띄운다. 책장 깊은 곳은 늘 그늘.', sound: '책장을 넘기는 소리, 벽난로 장작의 탁탁임, 펜촉의 사각거림, 시계추.', smell: '오래된 종이와 잉크, 가죽, 파이프 담배의 잔향, 식은 위스키.', flow: '주인은 책상 뒤에 앉고 방문자는 그 앞에 선다 — 책상이 곧 경계선이자 권력의 자리.', detail: '특정 책 한 권만 자주 빼낸 흔적, 잠긴 서랍, 벽난로 위 액자, 양탄자에 닳은 발자국 길.', mood: '지식과 비밀이 함께 갇힌, 사적이고 묵직한 밀실.' },
      { name: '하인 구역·뒤편 계단', era: '근대·계급사회', structure: '화려한 본채 뒤에 숨은 좁고 가파른 통로. 부엌·세탁실·하인 침실이 빛 없는 복도로 이어진다.', material: '거친 회벽, 칠 벗겨진 나무 계단, 맨바닥, 못에 걸린 앞치마와 청소도구.', light: '창이 작거나 없어 늘 어둑하고, 한 층마다 약한 등 하나로 버틴다.', sound: '뛰어다니는 발소리, 종(벨) 울림과 그에 따른 분주함, 낮은 불평, 그릇 부딪는 소리.', smell: '비누와 잿물, 삶는 빨래, 음식 냄새, 습기와 곰팡이의 밑냄새.', flow: '호출 벨이 울리면 누군가 즉시 본채로 사라진다. 두 세계를 잇는 문은 늘 살짝 열려 긴장 상태.', detail: '벨이 어느 방에서 울렸는지 알려주는 표시판, 줄 세운 신발, 벽에 적은 일과표.', mood: '화려함을 떠받치는 보이지 않는 노동의, 분주하고 서늘한 이면.' },
      { name: '온실·정원 별채', era: '근대·낭만', structure: '유리와 철골로 짜인 투명한 방. 식물이 천장까지 자라고, 본채에서 회랑이나 정원길로 이어진다.', material: '김 서린 유리, 녹슨 철 프레임, 젖은 흙과 화분, 이끼 낀 분수 가장자리.', light: '사방이 빛이라 그림자가 옅고, 흐린 날엔 우윳빛으로 모든 것이 부드러워진다.', sound: '유리에 듣는 빗방울, 물 흐르는 분수, 멀리 닫힌 본채의 소음, 벌레의 잔음.', smell: '젖은 흙, 짙은 꽃향, 더운 습기, 거름의 비릿함.', flow: '본채에서 멀어 밀회·은신에 어울린다. 들어오는 사람은 늦게 보이고, 소리가 잘 새어 나가지 않는다.', detail: '이름표 단 희귀 식물, 깨진 화분, 의자 두 개가 마주 놓인 구석.', mood: '안과 밖의 경계가 흐려진, 비밀스럽고 나른한 별세계.' },
    ],
  },
  {
    key: 'market', label: '시장·거리·생활', icon: '🏪',
    note: '소리와 냄새가 먼저 도착하는 곳. 사람과 물건이 부딪히며 도시의 맥박이 가장 빠르게 뛴다.',
    items: [
      { name: '재래시장·장터', era: '시대 무관', structure: '좁은 골목 양쪽으로 좌판과 천막이 빽빽이 늘어서고, 통로는 사람과 짐수레가 함께 다투며 흐른다.', material: '천막 차양, 나무 좌판, 쌓인 채소 더미와 생선 함지, 비닐과 노끈, 흙바닥 위 깐 판자.', light: '차양 사이로 쪼개진 햇빛, 백열등과 전구가 만드는 따뜻한 점들, 저녁이면 좌판마다 다른 색의 불빛.', sound: '호객하는 외침, 흥정의 실랑이, 도마질, 짐수레 바퀴, 라디오와 웃음이 뒤엉킨 소음의 벽.', smell: '생선 비린내, 기름 튀기는 냄새, 과일의 단내, 젖은 흙과 향신료가 한꺼번에.', flow: '인파는 강물처럼 밀려가다 좌판 앞에서 소용돌이친다. 멈춰 서면 곧 등을 떠밀린다.', detail: '눌러쓴 가격표, 단골에게만 슬쩍 얹어 주는 덤, 좌판 밑에 숨긴 현금통, 발에 밟히는 채소 잎.', mood: '활기와 피로가 뒤섞인, 살아 있는 도시의 위장(胃腸).' },
      { name: '선술집·주점', era: '시대 무관', structure: '낮은 천장 아래 탁자가 빼곡하고, 한쪽 끝에 술을 따르는 자리(바)가 중심을 잡는다. 구석엔 늘 가장 어두운 자리가 있다.', material: '끈적이는 나무 탁자, 긁힌 잔, 통과 술병이 늘어선 선반, 톱밥이나 닳은 바닥.', light: '흐릿한 등불과 촛불, 담배 연기에 번진 불빛, 문이 열릴 때만 잠깐 들이치는 바깥빛.', sound: '잔 부딪는 소리, 떠드는 웃음과 노래, 갑자기 멎는 정적, 동전이 탁자에 구르는 소리.', smell: '엎질러진 술, 땀과 연기, 끓는 안주, 젖은 나무의 쉰내.', flow: '낯선 자가 들어오면 잠깐 모든 시선이 쏠렸다가 흩어진다. 정보와 소문이 잔과 함께 오간다.', detail: '외상값을 적은 벽, 늘 같은 자리의 단골, 카운터 밑 몽둥이, 닫히지 않는 문틈의 바람.', mood: '경계와 친밀이 술기운에 뒤섞인, 비밀과 싸움이 함께 자라는 곳.' },
      { name: '뒷골목·달동네 길', era: '근현대', structure: '한 사람 겨우 지날 좁은 길이 계단과 굽이로 얽히고, 집들이 어깨를 맞댄 채 위로 쌓인다.', material: '금 간 시멘트, 녹슨 철문과 양철 지붕, 얽힌 전선, 담벼락에 기댄 세간.', light: '낮엔 빨래 그림자가 길을 덮고, 밤엔 띄엄띄엄한 가로등 하나가 길을 점으로만 밝힌다.', sound: '집집의 TV 소리, 아이들 발소리, 멀리 개 짖음, 골목을 타고 부푸는 말소리.', smell: '저녁 짓는 냄새, 하수구의 밑냄새, 연탄·기름 난방, 빨래 세제.', flow: '길이 미로 같아 모르는 사람은 헤매고, 사는 사람은 지름길을 안다. 모든 창이 골목을 내려다본다.', detail: '계단마다 다른 화분, 공동 수도, 담에 분필로 그은 낙서, 누구의 것인지 모를 신발 한 짝.', mood: '가난과 정(情)이 한데 엉킨, 좁아서 더 가까운 삶.' },
      { name: '항구·부두', era: '시대 무관', structure: '바다와 육지가 만나는 긴 선. 창고가 줄지어 서고, 배가 닿는 잔교(棧橋)와 짐을 옮기는 너른 마당이 펼쳐진다.', material: '소금기에 삭은 나무, 녹슨 쇠고리와 사슬, 젖은 밧줄, 쌓인 나무 상자와 그물.', light: '물에 반사돼 흔들리는 빛, 안개에 번진 등대 불빛, 새벽이면 차갑고 푸른 기운.', sound: '뱃고동, 갈매기, 출렁이는 물과 부두에 부딪는 배, 짐 부리는 인부들의 구령.', smell: '짠 바다, 비린 생선, 기름과 타르, 젖은 밧줄과 나무의 냄새.', flow: '짐과 사람이 배와 창고 사이를 끊임없이 오간다. 밀물·썰물과 배의 시간에 모든 일이 맞춰진다.', detail: '배마다 다른 깃발, 창고 문에 찍힌 화물 표시, 밧줄 묶는 매듭, 부두 끝에서 바다만 보는 사람.', mood: '떠남과 도착이 늘 교차하는, 소금기 밴 기다림의 공간.' },
    ],
  },
  {
    key: 'prison', label: '감옥·수용·구금', icon: '⛓️',
    note: '자유를 빼앗는 공간은 모든 감각을 좁힌다. 빛도 소리도 시간도 통제되며, 단조로움이 가장 무거운 형벌이 된다.',
    items: [
      { name: '석조 지하 감옥', era: '전근대·중세', structure: '햇빛이 닿지 않는 지하의 좁은 굴방. 두꺼운 벽과 철창문, 한 사람 누우면 꽉 차는 크기.', material: '축축한 돌, 녹슨 철창과 사슬, 짚 더미, 벽에 박힌 고리.', light: '복도 횃불이 철창 사이로 줄무늬 빛만 던지고, 방 안쪽은 늘 어둠. 시간의 흐름을 알 수 없다.', sound: '물방울 떨어지는 소리, 멀리서 끌리는 사슬, 다른 방의 신음, 그리고 견디기 힘든 정적.', smell: '곰팡이와 습기, 썩은 짚, 배설물, 차갑고 무거운 돌의 냄새.', flow: '간수의 발소리가 가까워지면 모두 멈춘다. 음식은 철창 아래 구멍으로만 들어온다.', detail: '벽에 새긴 날짜 표시, 손톱으로 판 글자, 짚 사이에 숨긴 작은 물건, 닳아 반들거리는 고리.', mood: '시간이 멈춘 듯한, 빛과 희망을 함께 빼앗긴 무덤 같은 곳.' },
      { name: '현대 교도소', era: '현대', structure: '철문이 켜켜이 닫히는 회랑과 층층이 쌓인 감방. 중앙 통제실에서 모든 문과 시선이 한곳으로 모인다.', material: '회색 콘크리트와 도색된 철문, 강화유리, 형광등, 스테인리스 변기와 철제 침상.', light: '하루 종일 균일한 형광등 빛 — 밤에도 완전한 어둠은 없다. 창은 손바닥만 하거나 없다.', sound: '철문이 잠기는 금속성 굉음, 호각, 멀리 울리는 방송, 끊임없는 웅성거림과 갑작스러운 침묵.', smell: '소독약과 표백제, 식판의 음식 냄새, 갇힌 공기의 쉰내.', flow: '모든 이동은 점호와 허가로만. 정해진 시간에 문이 열리고, 발은 노란 선을 따라 움직인다.', detail: '벽에 붙은 일과표, 감방 번호, CCTV 적색등, 손때 묻은 면회실 유리.', mood: '감시당한다는 자각이 공기처럼 깔린, 단조롭고 차가운 통제의 세계.' },
      { name: '독방·징벌방', era: '근현대', structure: '창도 가구도 없는 작은 상자. 문은 두껍고 안에서 열 수 없으며, 바깥과 모든 접촉이 끊긴다.', material: '매끈한 벽, 차가운 바닥, 문에 난 작은 감시구, 고정된 침상 외엔 아무것도 없음.', light: '빛을 켜고 끄는 권한이 바깥에 있다 — 강제된 어둠 혹은 잠들 수 없는 밝음.', sound: '자기 숨소리와 심장 박동, 멀리서 닫히는 문, 그 외엔 압도적인 무음.', smell: '소독약, 갇힌 공기, 자신의 체취만 짙어진다.', flow: '아무도 들어오지 않고 아무 데도 갈 수 없다. 식판이 들어오는 구멍이 유일한 바깥.', detail: '벽을 두드려 세는 시간, 감시구로 잠깐 비치는 눈, 손톱으로 그은 흔적.', mood: '감각이 굶주리는, 고요함 자체가 형벌이 되는 극한의 고립.' },
      { name: '포로·수용소 막사', era: '전시·근현대', structure: '철조망에 둘러싸인 너른 공터와 길게 늘어선 나무 막사. 망루가 사방을 내려다본다.', material: '얇은 판자벽, 이층 나무 침상, 진흙 길, 철조망과 망루의 탐조등.', light: '낮엔 가릴 것 없는 땡볕, 밤엔 탐조등이 일정한 간격으로 막사를 훑는다.', sound: '점호 호각, 군화 발소리, 멀리 짖는 개, 막사 안의 낮은 속삭임.', smell: '진흙과 비, 묽은 수프, 소독약, 사람이 많이 모인 공기.', flow: '점호로 하루가 시작되고 끝난다. 줄을 서고 번호를 외치며, 철조망은 늘 시야 끝에 있다.', detail: '침상 밑에 숨긴 물건, 막사 벽의 옹이구멍, 진흙에 남은 무수한 발자국, 철조망 너머의 들판.', mood: '집단 속의 외로움과 통제, 바깥을 늘 바라보게 만드는 박탈의 공간.' },
    ],
  },
  {
    key: 'castle', label: '성채·요새·전장 건축', icon: '🏰',
    note: '방어가 곧 형태가 되는 건축. 두께·높이·시야가 모든 설계의 이유이며, 평화 때조차 전쟁을 기억한다.',
    items: [
      { name: '성벽·망루', era: '중세·전근대', structure: '두꺼운 돌벽 위 좁은 통로(흉벽)가 성을 두르고, 일정 간격마다 망루가 솟아 사방을 감시한다.', material: '거대한 석재, 화살 쏘는 좁은 총안(銃眼), 나무 발판과 사다리, 비바람에 깎인 이끼.', light: '낮엔 멀리까지 트인 시야, 밤엔 횃불이 점점이 벽을 따라 흐른다. 망루 안은 늘 그늘.', sound: '바람이 총안을 지나며 내는 휘파람, 보초의 발소리, 멀리서 울리는 종이나 뿔나팔.', smell: '젖은 돌과 이끼, 횃불 연기, 차가운 바람에 실린 흙과 풀.', flow: '보초는 정해진 구간을 끝없이 왕복한다. 적이 보이면 신호가 망루에서 망루로 번진다.', detail: '닳은 계단, 총안 옆에 쌓인 화살, 벽에 새긴 보초들의 표시, 멀리 보이는 봉화대.', mood: '광활한 시야와 외로운 경계, 평화 속에서도 긴장을 놓지 못하는 높이.' },
      { name: '성문·도개교(跳開橋)', era: '중세·전근대', structure: '해자 위로 내려지는 다리와 그 뒤를 막는 무거운 살문(쇠창살)·이중문. 머리 위엔 함정 구멍이 뚫려 있다.', material: '굵은 사슬과 도르래, 철 박은 나무문, 쇠 살문, 다리 아래 검은 해자 물.', light: '문 안쪽 통로는 어둑한 터널이라, 들어서는 순간 시야가 좁아지고 갇힌 느낌이 든다.', sound: '사슬 감기는 쇳소리, 다리 내려지는 둔중한 충격, 살문이 떨어지는 굉음, 해자 물의 찰랑임.', smell: '고인 해자 물의 비린내, 쇠 녹, 젖은 나무와 돌.', flow: '드나드는 모든 것이 한 곳으로 좁혀진다 — 통과하는 동안 사방·머리 위에서 감시당한다.', detail: '도르래 옆 보초실, 살문의 닳은 홈, 다리 끝에 멈춰 신원을 확인받는 자, 함정 구멍의 검은 입.', mood: '환영과 위협이 겹친, 한 발짝마다 통제되는 좁은 길목.' },
      { name: '천수각·아성(牙城)', era: '중세·전근대', structure: '성의 가장 높고 안쪽에 선 마지막 보루. 좁은 나선 계단으로 층층이 오르며, 꼭대기에서 전체를 내려다본다.', material: '두꺼운 석벽, 좁은 나선 계단, 작은 방들, 무기고와 식량 창고.', light: '아래층은 어둡고 창이 작으며, 위로 오를수록 빛과 시야가 트인다. 꼭대기엔 사방 창.', sound: '계단을 오르는 메아리, 좁은 방에 갇힌 목소리, 꼭대기의 바람 소리.', smell: '오래된 돌과 먼지, 무기고의 기름과 쇠, 아래층 식량고의 곡물 냄새.', flow: '나선 계단은 한 사람씩만 오르내리게 해 방어에 유리하다. 마지막까지 버티는 자리.', detail: '벽감에 둔 무기, 좁은 창으로 보이는 영지 전경, 비상 식량의 표시, 닳은 손잡이 밧줄.', mood: '최후의 보루다운 폐쇄감과, 정상에서만 허락되는 권력의 조망.' },
      { name: '병영·연병장', era: '전근대~근대', structure: '막사가 줄지어 선 직선의 공간과 그 가운데 너른 흙마당. 무기고와 마구간이 한쪽에 모인다.', material: '다져진 흙바닥, 줄 맞춘 막사, 세워 둔 창과 방패, 말뚝과 깃대.', light: '가릴 것 없는 너른 햇빛, 저녁이면 막사마다 켜지는 불, 새벽 점호의 푸른 빛.', sound: '구령과 발맞춘 행군, 무기 부딪는 소리, 말 울음, 대장간의 망치질.', smell: '흙먼지와 땀, 말과 마구간, 가죽과 기름, 막사의 연기.', flow: '모든 움직임이 줄과 구령에 맞춰진다. 개인은 무리에 녹아들고, 시간은 나팔로 끊긴다.', detail: '연병장 가장자리의 닳은 길, 깃발의 색, 막사 번호, 대장간 옆에 쌓인 부러진 무기.', mood: '규율과 긴장, 출정을 앞둔 자들의 억눌린 활기.' },
    ],
  },
  {
    key: 'modern', label: '현대 도시·건축', icon: '🏙️',
    note: '유리와 철과 빛으로 짜인 풍경. 효율과 감시, 익명성과 군중이 한 공간에 겹친다.',
    items: [
      { name: '고층 오피스 빌딩', era: '현대', structure: '균일한 층이 위로 반복되고, 중앙 코어에 엘리베이터와 계단이 모인다. 외벽 전체가 유리.', material: '유리 커튼월, 강철과 콘크리트, 카펫 타일, 파티션과 모니터의 바다.', light: '천장 형광등의 균질한 빛과 통유리로 들어오는 도시 풍경. 밤엔 켜진 창들이 도시의 점이 된다.', sound: '에어컨의 백색소음, 키보드 소리, 멀리 울리는 전화, 엘리베이터 도착음, 회의실의 닫힌 말소리.', smell: '재순환된 건조한 공기, 커피, 복사기의 토너, 카펫의 합성 냄새.', flow: '출근 시간엔 로비와 엘리베이터로 인파가 몰렸다가, 층마다 흩어진다. 카드 한 장이 모든 문을 가른다.', detail: '책상마다 다른 사물, 창가 자리의 위계, 비상계단의 적막, 야경을 보며 남은 한 사람의 불빛.', mood: '효율과 익명성, 함께 있어도 혼자인 유리 상자의 도시.' },
      { name: '지하철역·승강장', era: '현대', structure: '계단과 에스컬레이터로 지하 깊이 내려가, 긴 승강장이 선로를 끼고 펼쳐진다. 통로가 미로처럼 갈린다.', material: '타일 벽, 스테인리스 손잡이, 노란 안전선, 광고판과 전광판, 콘크리트 천장.', light: '인공조명만으로 시간 감각이 사라진다. 열차 헤드라이트가 어둠 속에서 먼저 도착한다.', sound: '열차가 들어오며 부푸는 바람과 굉음, 안내 방송, 발소리의 물결, 멀어지는 레일 소리.', smell: '쇠와 먼지, 브레이크의 탄내, 지하의 미지근한 공기, 사람들의 향과 음식 냄새.', flow: '열차가 오면 인파가 동시에 밀려들고 빠진다. 흐름에 거스르면 곧 떠밀린다. 환승 통로마다 발걸음이 갈린다.', detail: '바닥에 닳은 줄 선 자리, 누군가 두고 간 물건, 벽 광고의 찢긴 모서리, 승강장 끝 어두운 터널 입구.', mood: '익명의 군중과 빠른 리듬, 잠시 스쳤다 흩어지는 도시의 혈관.' },
      { name: '편의점·24시간 가게', era: '현대', structure: '작고 환한 사각의 공간. 진열대가 좁은 통로를 만들고, 계산대가 입구를 지킨다. 늘 열려 있다.', material: '형광등 천장, 냉장 진열대의 유리문, 플라스틱 포장의 광택, 잡지 가판과 온장고.', light: '바깥이 아무리 어두워도 안은 한낮처럼 환하다 — 밤거리에서 가장 밝은 섬.', sound: '입구 차임벨, 냉장고의 낮은 모터음, 바코드 삑 소리, 라디오나 안내 방송, 거리에서 새어 든 소음.', smell: '데운 음식과 커피, 냉장고의 찬 공기, 새 잡지의 종이, 세제와 포장 냄새.', flow: '잠깐 들렀다 나가는 사람들의 짧은 동선. 새벽엔 손님이 끊기고 점원 혼자 환한 빛 속에 남는다.', detail: '계산대 옆 작은 물건들, 창에 붙은 영업 표시, 쓰레기통 위 컵라면 자국, 유리문에 비친 거리.', mood: '도시의 불 꺼지지 않는 양심 같은, 밝지만 외로운 새벽의 정거장.' },
      { name: '병원 복도', era: '현대', structure: '직선의 긴 복도가 병실과 처치실을 꿰고, 색 선이나 표지판이 길을 안내한다. 모든 문에 번호가 있다.', material: '광택 나는 바닥, 흰 벽과 손잡이 난간, 스테인리스 카트, 자동문, 청결한 표면.', light: '균일하고 그림자 없는 형광등 빛. 밤엔 일부만 켜져 복도 끝이 어둠으로 사라진다.', sound: '바퀴 달린 침대·카트 소리, 멀리 울리는 호출 방송, 기계의 규칙적 신호음, 슬리퍼 끄는 발소리.', smell: '소독약과 알코올, 약품, 미지근한 식사 카트, 그 아래 깔린 옅은 불안의 냄새.', flow: '의료진은 빠르게, 가족은 천천히 — 같은 복도에서 두 속도가 엇갈린다. 밤이면 인적이 끊긴다.', detail: '벽의 손소독제, 병실 문 앞 명패, 대기 의자에 앉은 사람, 깜빡이는 비상등, 창밖의 주차장 불빛.', mood: '청결함 뒤에 깔린 긴장과 기다림, 삶과 죽음이 같은 복도를 지나는 곳.' },
    ],
  },
  {
    key: 'sacred', label: '종교·성스러운 공간', icon: '⛪',
    note: '인간을 작게, 그러나 무언가에 연결된 듯 느끼게 만드는 건축. 빛과 높이와 정적으로 경외를 빚는다.',
    items: [
      { name: '대성당·예배당', era: '중세~현대', structure: '높은 천장을 향해 솟은 기둥들이 시선을 위로 끌고, 긴 신랑(身廊)이 제단을 향해 곧게 뻗는다.', material: '거대한 석재, 색유리(스테인드글라스), 나무 의자, 닳은 돌바닥, 금속 촛대.', light: '색유리를 통과한 빛이 바닥에 색의 웅덩이를 만들고, 높은 곳일수록 어둑해 신비를 더한다.', sound: '작은 소리도 천장까지 길게 울려 퍼진다. 발소리, 기침, 멀리서의 성가와 오르간이 공간을 채운다.', smell: '향과 촛농, 오래된 돌과 나무, 차갑고 정결한 공기.', flow: '사람들은 자연히 목소리를 낮추고 걸음을 늦춘다. 중앙 통로는 비워 두고 양옆으로 앉는다.', detail: '촛불의 흔들림, 닳은 무릎 받침대, 벽감의 조각상, 색유리에 비친 빛이 시간 따라 옮겨 가는 자국.', mood: '높이와 정적이 만드는 경외, 인간을 작게 하지만 위로하는 공간.' },
      { name: '산사(山寺)·암자', era: '시대 무관', structure: '산비탈을 따라 건물이 층층이 앉고, 돌계단과 마당이 이들을 잇는다. 자연이 곧 담장이다.', material: '나무 기둥과 기와, 단청, 돌계단과 석탑, 풍경(風磬)과 종, 닳은 마루.', light: '숲 사이로 비치는 부드러운 빛, 처마 그늘과 마당 햇살의 대비, 새벽안개에 잠긴 윤곽.', sound: '바람에 우는 풍경, 멀리 울리는 종소리, 새소리와 물소리, 그 사이의 깊은 정적.', smell: '향과 나무, 젖은 흙과 이끼, 산의 차고 맑은 공기, 멀리 공양간의 밥 냄새.', flow: '계단을 오르며 속세를 한 단씩 벗는 듯한 동선. 걸음이 절로 느려지고 말수가 준다.', detail: '돌탑에 얹은 작은 돌, 처마 끝 풍경, 마당의 빗자루 자국, 댓돌에 가지런한 신발.', mood: '비움과 고요, 산에 안겨 시간이 천천히 흐르는 정적.' },
      { name: '폐허가 된 신전', era: '고대·환상', structure: '지붕이 무너지고 기둥만 남아 하늘이 천장이 된 공간. 무너진 돌 사이로 식물이 자라 자연이 되찾는 중.', material: '깨진 석주, 이끼와 덩굴, 흩어진 조각상의 파편, 풀에 묻힌 바닥 무늬.', light: '천장이 없어 빛과 비가 그대로 들이친다. 기둥 그림자가 하루 종일 천천히 회전한다.', sound: '바람이 빈 기둥 사이를 지나는 소리, 새와 벌레, 무너진 돌에 부딪는 메아리, 압도적인 적막.', smell: '젖은 돌과 흙, 풀과 이끼, 오래 묵은 먼지, 비 온 뒤의 흙냄새.', flow: '정해진 길이 없어 무너진 돌을 넘고 돌아 걷는다. 한때의 동선은 잡초에 지워졌다.', detail: '반쯤 묻힌 부조, 글자가 닳은 비석, 기둥에 새긴 흔적, 제단이 있던 자리의 빈 공간.', mood: '영광의 잔해와 자연의 귀환, 시간의 무게가 고스란히 쌓인 쓸쓸함.' },
    ],
  },
  {
    key: 'industrial', label: '산업·노동·기계', icon: '🏭',
    note: '인간보다 기계의 리듬이 지배하는 공간. 규모·소음·반복이 사람을 부품처럼 배치한다.',
    items: [
      { name: '공장·작업장', era: '산업화 이후', structure: '천장 높은 너른 홀에 기계와 컨베이어가 줄지어 흐르고, 사람은 그 사이 정해진 자리에 선다.', material: '철골과 콘크리트, 기름 묻은 기계, 컨베이어 벨트, 안전선이 그어진 바닥, 매달린 호이스트.', light: '천장의 강한 작업등과 기계가 튀기는 불꽃, 창이 높아 바깥 빛은 멀고 인공조명이 주인.', sound: '쉴 새 없는 기계음의 벽, 금속 부딪는 소리, 경고음, 호각, 말소리는 소음에 묻혀 손짓이 대신한다.', smell: '기계 기름과 쇳가루, 땀, 가열된 금속, 화학약품의 매캐함.', flow: '제품은 한 방향으로만 흐르고 사람은 제자리에서 같은 동작을 반복한다. 교대 시간에만 흐름이 바뀐다.', detail: '작업등 옆 안전 수칙, 기름때 묻은 장갑, 라인 끝의 검수대, 벽시계와 교대 명단, 멈춤 버튼의 붉은색.', mood: '기계의 리듬에 맞춰진 반복, 인간이 작아지는 거대한 규모.' },
      { name: '창고·물류 센터', era: '근현대', structure: '천장 닿는 높은 선반이 격자로 늘어서 미로를 이루고, 통로마다 번호가 붙는다. 끝이 안 보일 만큼 넓다.', material: '강철 선반, 쌓인 상자와 팔레트, 콘크리트 바닥의 통로선, 지게차와 카트.', light: '천장 등이 줄줄이 켜지지만 선반 사이 통로는 늘 어둑하다. 끝쪽은 불을 꺼 둔 어둠.', sound: '지게차 경고음, 굴러가는 카트, 멀리서 떨어지는 상자, 스캐너의 삑 소리, 텅 빈 공간의 메아리.', smell: '판지와 비닐, 먼지, 콘크리트, 보관품에 따라 달라지는 잡다한 냄새.', flow: '물건은 번호와 좌표로 움직인다. 사람도 목록을 따라 통로를 누비며, 길을 잃기 쉽다.', detail: '선반의 위치 표시, 바닥에 떨어진 라벨, 잊힌 구석의 먼지 쌓인 상자, 높은 선반 위의 어둠.', mood: '거대한 질서와 그 속의 미로감, 비인격적인 효율의 공간.' },
      { name: '폐공장·버려진 시설', era: '근현대', structure: '가동을 멈춘 기계가 녹슨 채 멈춰 서고, 깨진 창으로 비바람이 든다. 한때의 동선만 바닥에 남았다.', material: '녹슨 철골과 기계, 깨진 유리, 부서진 콘크리트, 바닥의 기름 얼룩, 자라난 잡초.', light: '깨진 천창과 창으로 들이친 빛이 먼지 속에 기둥을 세우고, 안쪽은 깊은 어둠으로 남는다.', sound: '바람이 깨진 창을 울리는 소리, 떨어지는 물방울, 멀리 무너지는 작은 파편, 발밑 유리 밟는 소리.', smell: '녹과 곰팡이, 고인 물, 기름의 잔향, 먼지와 젖은 콘크리트.', flow: '바닥에 남은 기계 자국과 통로선이 사라진 노동을 더듬게 한다. 곳곳이 무너져 길이 막힌다.', detail: '벽에 남은 작업 표시, 멈춘 시계, 버려진 장갑 한 짝, 녹슨 사물함, 깨진 안전등.', mood: '번성의 잔해와 정적, 사람이 떠난 뒤 시간만 흐른 폐허.' },
    ],
  },
  {
    key: 'underground', label: '지하·은밀·이행 공간', icon: '🕳️',
    note: '빛과 방향 감각을 빼앗는 공간. 통과하기 위한 곳이거나, 숨기 위한 곳 — 둘 다 사람을 불안하게 한다.',
    items: [
      { name: '지하 통로·하수도', era: '근현대', structure: '아치형 벽돌 터널이 끝없이 이어지고, 갈래마다 다른 방향으로 갈린다. 발밑엔 좁은 길과 흐르는 물.', material: '이끼 낀 벽돌, 녹슨 철 사다리와 격자(맨홀), 흐르는 물과 고인 웅덩이, 매달린 파이프.', light: '맨홀과 환기구로 떨어지는 점점의 빛 외엔 어둠. 들고 간 불빛만큼만 세상이 존재한다.', sound: '물 흐르는 메아리, 떨어지는 물방울이 만드는 가짜 발소리, 멀리서 울리는 도시의 둔음.', smell: '하수와 곰팡이, 고인 물의 비린내, 차고 습한 공기, 쇠 녹.', flow: '방향을 잃기 쉽고, 갈림길마다 선택을 강요한다. 추격·도주·은신의 무대로 긴장이 끊이지 않는다.', detail: '벽에 분필로 그은 표시, 물에 떠내려온 잡동사니, 사다리 위 동그란 빛, 갈림길에 붙은 번호.', mood: '방향을 잃는 폐소공포와, 도시 아래 숨은 또 다른 세계의 음습함.' },
      { name: '밀실·비밀 방', era: '시대 무관', structure: '책장·벽난로·옷장 뒤에 숨겨진 작은 방. 들어가는 길이 하나뿐이고 안에서만 잠글 수 있다.', material: '먼지 쌓인 가구, 비밀 문의 매끄러운 이음새, 숨겨진 경첩, 한정된 가구와 보관품.', light: '창이 없어 켜는 불빛이 전부. 끄면 완전한 어둠과 침묵이 동시에 닫힌다.', sound: '바깥 소리가 벽에 막혀 멀고 둔하게만 들린다. 안의 작은 소리는 크게 울린다.', smell: '오래 갇힌 먼지와 묵은 공기, 보관된 물건의 냄새(종이·금속·천).', flow: '비밀을 아는 자만 드나든다. 들어가면 바깥과 단절되고, 발견되면 도망갈 곳이 없다.', detail: '책장에서 당기면 열리는 책 한 권, 바닥의 닳은 흔적, 숨긴 물건의 위치, 환기구의 가는 빛줄기.', mood: '안전과 함정이 한 몸인, 숨었으나 갇힌 긴장의 공간.' },
      { name: '동굴·자연 지하', era: '시대 무관', structure: '입구는 좁다가 안에서 넓어지거나, 좁은 통로가 깊이 이어진다. 천연의 기둥(종유석)과 웅덩이가 길을 막거나 연다.', material: '젖은 바위, 종유석과 석순, 미끄러운 진흙, 차가운 지하수 웅덩이.', light: '입구의 빛이 몇 걸음 만에 사라지고, 그 너머는 한 번도 빛을 본 적 없는 절대 어둠.', sound: '물방울이 끝없이 떨어지는 소리, 작은 소리도 깊게 울리는 메아리, 멀리 흐르는 물.', smell: '젖은 돌과 흙, 광물의 차가운 냄새, 고인 물, 바깥과 다른 무거운 공기.', flow: '천장이 낮아 몸을 굽히고, 좁은 곳에선 기어야 한다. 빛이 없으면 한 걸음도 나아갈 수 없다.', detail: '벽에 남은 물의 흔적, 바닥의 발자국, 천장에서 자란 종유석, 어둠 속에서 들리는 정체 모를 소리.', mood: '원초적 어둠과 적막, 빛 없이 인간이 가장 무력해지는 공간.' },
    ],
  },
  {
    key: 'transit', label: '탈것·이동하는 공간', icon: '🚆',
    note: '움직이는 동안만 존재하는 작은 세계. 흔들림·진동·창밖 풍경이 머무름과 떠남을 동시에 안긴다.',
    items: [
      { name: '기차 객실·통로', era: '근현대', structure: '좁고 긴 통로 양옆으로 좌석이나 칸막이 객실이 늘어선다. 창은 길게 이어지고, 칸과 칸이 연결 통로로 이어진다.', material: '천을 댄 좌석, 나무나 금속 손잡이, 접이식 탁자, 짐 선반, 흔들리는 연결 통로의 철판.', light: '창으로 풍경과 빛이 끊임없이 흘러간다 — 터널마다 갑작스러운 어둠, 다시 밝음의 반복.', sound: '레일을 두드리는 규칙적 박자, 흔들리는 차체, 연결부의 삐걱임, 안내 방송, 낮은 대화.', smell: '천 좌석과 먼지, 도시락과 커피, 기름과 쇠, 창틈으로 든 바깥 공기.', flow: '통로는 좁아 한 사람씩 비켜 가고, 흔들림에 손잡이를 잡는다. 정차역마다 사람이 갈린다.', detail: '창에 비친 자기 얼굴과 풍경의 겹침, 좌석 번호, 선반에 둔 가방, 통로 끝 흔들리는 문.', mood: '머무름과 떠남이 겹친, 풍경이 흐르는 동안만 이어지는 시간.' },
      { name: '배·선실', era: '시대 무관', structure: '갑판 아래로 좁은 복도와 작은 선실이 미로처럼 얽힌다. 둥근 창(현창)과 가파른 사다리 계단이 층을 잇는다.', material: '철판 벽과 리벳, 둥근 현창, 고정된 침상과 가구, 젖은 밧줄과 쇠고리.', light: '현창으로 든 빛이 파도에 따라 흔들리고, 아래층은 인공조명뿐. 밤바다 위 선실은 작은 등불의 섬.', sound: '선체에 부딪는 파도, 엔진의 진동음, 삐걱이는 철판, 갑판 위 발소리와 멀리 갈매기.', smell: '소금기와 기름, 젖은 쇠, 좁은 공간의 묵은 공기, 멀미를 부르는 둔한 흔들림.', flow: '복도가 좁고 사다리가 가팔라 한 사람씩만 오간다. 폭풍이면 모두가 안으로 갇힌다.', detail: '벽에 고정된 가구, 흔들리는 등, 현창 너머 출렁이는 수평선, 구명조끼 보관함.', mood: '망망대해 위 고립된 작은 세계, 흔들림이 끊이지 않는 불안과 모험.' },
      { name: '비행기 객실', era: '현대', structure: '좁은 통로 양옆으로 좌석이 빼곡히 줄지어 서고, 머리 위엔 짐칸, 앞뒤로 칸막이가 구역을 나눈다.', material: '플라스틱 마감, 천 좌석, 접이 탁자, 작은 창, 머리 위 수납칸과 안전벨트.', light: '작은 창으로 든 강렬한 고도의 빛 혹은 닫힌 블라인드 속 어둠. 천장의 은은한 간접등.', sound: '엔진의 끊임없는 굉음 같은 백색소음, 안내 방송, 카트 굴러가는 소리, 안전벨트 신호음.', smell: '재순환된 건조한 공기, 기내식, 커피, 플라스틱과 좌석 천.', flow: '좌석에 묶인 채 거의 움직이지 못한다. 통로 이동은 신호에 따라 제한되고, 모두가 같은 시간을 공유한다.', detail: '창밖의 구름 바다, 좌석 앞 주머니의 물건, 깜빡이는 신호등, 옆 사람과의 좁은 거리.', mood: '낯선 이들과 강제로 가까워진, 하늘에 떠 있는 임시의 공동체.' },
    ],
  },
]

const LS = 'sry:tool:architecture-space-ref:'
const ALL = '__all__'

type Flat = { cat: CatDef; item: Entry }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 항목 → 묘사 단서 묶음(필드 라벨 포함)
const FIELDS: { k: keyof Entry; label: string }[] = [
  { k: 'era', label: '시대·맥락' },
  { k: 'structure', label: '구조·동선의 골격' },
  { k: 'material', label: '재료·질감' },
  { k: 'light', label: '빛·그림자' },
  { k: 'sound', label: '소리·울림' },
  { k: 'smell', label: '냄새·공기' },
  { k: 'flow', label: '동선·사람의 움직임' },
  { k: 'detail', label: '작은 디테일' },
  { k: 'mood', label: '분위기 한 줄' },
]

function plainText(f: Flat): string {
  const lines = [`🏛️ ${f.item.name}  (${f.cat.label})`]
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
    `<p><i>※ 배경 묘사 참고 자료. 분위기 스케치이니 작품의 시대·정서에 맞춰 각색해 쓰세요.</i></p>`,
  ].join('')
}

export default function ArchitectureSpaceRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.q 가 오면 초기 검색어로 활용(맥락 활용)
  const initialQuery = typeof payload?.q === 'string' ? (payload.q as string) : ''

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

  // 수집함에 담기 — addToStash(...)
  const toStash = (f: Flat) => {
    addToStash({
      kind: 'note',
      label: `${f.item.name} (${f.cat.label})`,
      text: plainText(f),
    })
    flash(`수집함에 ‘${f.item.name}’ 묘사 자료를 담았습니다.`)
  }

  // 스니펫 저장(글감) — addToLibrary('snippets', ...)
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: `[공간 묘사] ${plainText(f)}`,
      source: '건축·공간 묘사 사전',
      tags: ['배경', '공간묘사', f.cat.label, f.item.name],
    })
    flash(`스니펫 라이브러리에 ‘${f.item.name}’ 묘사를 저장했습니다.`)
  }

  // 프로젝트 자료에 추가 — addToProject(...)
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'setting',
      root: 'research',
      folder: '공간·배경 묘사',
      title: `${f.item.name} (${f.cat.label})`,
      bodyHtml: bodyHtml(f),
      synopsis: f.item.mood || '',
      meta: { 분류: f.cat.label, 시대: f.item.era || '', 분위기: f.item.mood || '' },
    })
    if (id) flash(`프로젝트 자료 〈공간·배경 묘사〉에 ‘${f.item.name}’을(를) 추가했습니다.`)
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
      {/* 안내 — 가장 위에 고정 */}
      <div style={{
        background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)',
        borderRadius: 8, padding: '8px 11px', fontSize: 12, lineHeight: 1.55, color: 'var(--muted)',
      }}>
        <Emoji e="🏛️" /> <b style={{ color: 'var(--text)' }}>배경 묘사 자료</b>입니다. 공간을 구조·재료·빛·소리·냄새·동선으로 쪼개
        ‘분위기 스케치’를 모았습니다. 사실 고증이 아니니 작품의 시대·정서에 맞춰 자유롭게 각색해 쓰세요.
      </div>

      <div style={hint}>
        궁궐·저택·시장·감옥·성채·현대빌딩 등 <b>{total}개</b> 공간을 카테고리로 정리했습니다.
        검색·펼침으로 찾고, 무작위로 묘사 영감을 얻고, 클릭해 복사하거나 수집함·스니펫·프로젝트로 보내세요.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="공간·감각으로 검색 (예: 어둠, 메아리, 냄새, 좁은 통로, 형광등)"
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
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 공간</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('setting-bible')} title="배경 설정집 열기(이 묘사를 장소 설정으로 정리)">
          <Emoji e="🗺️" /> 배경 설정집 열기
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
            <button className="minibtn" onClick={() => toStash(random)}><Emoji e="📎" /> 수집함</button>
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="💾" /> 스니펫 저장</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>
              {favs[favKey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => toProject(random)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 자료를 프로젝트 자료 〈공간·배경 묘사〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('setting-bible')} title="배경 설정집 열기"><Emoji e="🗺️" /> 배경 설정집</button>
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
            {onlyFav ? '☆ 아직 즐겨찾기한 공간이 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
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
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(c.key, item.name)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                {!open && item.mood && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.mood}
                  </div>
                )}
                {open && renderFields(item)}
                {open && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
                    <button className="minibtn" onClick={() => copy(plainText({ cat: c, item }), 'item:' + fk)}>
                      {copiedKey === 'item:' + fk ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
                    </button>
                    <button className="minibtn" onClick={() => toStash({ cat: c, item })}><Emoji e="📎" /> 수집함</button>
                    <button className="minibtn" onClick={() => saveSnippet({ cat: c, item })}><Emoji e="💾" /> 스니펫 저장</button>
                    <button className="linkbtn" onClick={() => toProject({ cat: c, item })} disabled={!hasProjectBridge()}
                      title={hasProjectBridge() ? '프로젝트 자료에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                      <Emoji e="📄" /> 프로젝트에 추가
                    </button>
                    <button className="linkbtn" onClick={() => openToolLinked('setting-bible')} title="배경 설정집 열기"><Emoji e="🗺️" /> 배경 설정집</button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>공간 묘사는 나열이 아니라 ‘선택’입니다. 장면의 감정에 맞는 감각 한둘만 골라 쓰면 배경이 살아납니다.</div>
    </div>
  )
}
