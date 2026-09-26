// 호러·공포 특수 어휘·표현 사전 — 이 장르 특유의 단어·관용표현·말투·상투구·전문용어를 카테고리로 모은 로컬 사전.
// 도시에(분위기 어휘/서사 장치/하위장르/클리셰/정서 키워드)에 근거한 자작 데이터. 외부 네트워크·라이브러리 없음.
// 펼쳐보기(카테고리)+검색+무작위+클릭복사+우클릭 스니펫 저장 / 보조: 슬롯 조합형 "공포 한 줄" 생성기(잠금·재생성·조합수).
// import 는 react 와 './linkbus' 만 사용.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'horror-lexicon',
  name: '호러 어휘·표현 사전',
  icon: '🕯️',
  group: '어휘·표현',
  genre: '호러·공포',
  intro: '공포 장르 특유의 감각 어휘·관용표현·상투구·전문용어·말투를 펼쳐보거나 무작위로',
  w: 600,
  h: 660,
}

// ───────────────────────── 데이터 ─────────────────────────
interface Term { t: string; d: string }
interface Cat { key: string; label: string; icon: string; items: Term[] }

// 12개 카테고리 · 합계 340+ 항목. 전부 호러·공포 특화(일반론 배제).
const CATS: Cat[] = [
  {
    key: 'sound', label: '청각 어휘 (소리)', icon: '👂', items: [
      { t: '삐걱이는 마룻바닥', d: '아무도 없어야 할 위층에서 한 발 한 발 내려오는 듯한 마루 울림.' },
      { t: '벅벅 긁는 소리', d: '벽 안쪽이나 천장에서 손톱으로 긁는 듯한, 출처를 알 수 없는 소리.' },
      { t: '맨발 발소리', d: '카펫 위를 걷는 축축한 맨발의 철벅임. 점점 가까워진다.' },
      { t: '가쁜 숨소리', d: '귓가 바로 뒤에서 들리는, 내 것이 아닌 숨.' },
      { t: '정적(을 깨는)', d: '시계 초침마저 멈춘 듯한 무음. 그 정적이 곧 깨질 것을 안다.' },
      { t: '라디오 잡음(static)', d: '꺼둔 라디오에서 새어 나오는 치직거림, 그 사이로 섞이는 말소리.' },
      { t: '멀리서 들리는 동요', d: '아이 하나 없는 집에서 흘러나오는 느린 자장가.' },
      { t: '똑, 똑, 똑', d: '세 번씩 끊어 두드리는 노크. 문밖엔 아무도 없다.' },
      { t: '벽 너머 속삭임', d: '단어는 알아들을 수 없지만 분명 내 이름을 부르는 음색.' },
      { t: '젖은 천 끄는 소리', d: '복도를 가로질러 무언가 무거운 것을 질질 끄는 소리.' },
      { t: '뼈 어긋나는 소리', d: '관절이 잘못된 방향으로 꺾이는 둔탁한 우드득.' },
      { t: '파리 떼 소리', d: '아무것도 없는 방을 가득 채우는 낮은 윙윙거림.' },
      { t: '수화기 너머 숨소리', d: '받았는데 말은 없고, 천천히 들이쉬는 숨만 들린다.' },
      { t: '계단 삐걱임의 카운트', d: '열세 칸짜리 계단에서 열네 번째 삐걱임이 들린다.' },
      { t: '문 손잡이 돌아가는 소리', d: '잠가둔 문의 손잡이가 안쪽에서 천천히 돌아간다.' },
      { t: '웃음의 잔향', d: '웃음이 멎은 뒤에도 한 박자 더 이어지는 메아리.' },
      { t: '심장 박동의 외화(外化)', d: '내 심장 소리가 방 전체를 울릴 만큼 커진 듯한 착청.' },
      { t: '물 떨어지는 소리', d: '잠근 수도꼭지에서 어둠 속으로 일정하게 떨어지는 물방울.' },
      { t: '이갈이 소리', d: '옆방에서 밤새 들려오는, 단단한 무언가를 가는 소리.' },
      { t: '합창 같은 중얼거림', d: '여러 입이 한 문장을 박자 어긋나게 외는 소리.' },
    ],
  },
  {
    key: 'sight', label: '시각 어휘 (그림자·형상)', icon: '👁️', items: [
      { t: '문틈의 실루엣', d: '반쯤 열린 문 사이로, 빛을 등진 채 미동도 없이 선 형체.' },
      { t: '깜빡이는 형광등', d: '꺼졌다 켜질 때마다 위치가 미세하게 바뀌어 있는 그것.' },
      { t: '거울 속의 어긋남', d: '내가 멈췄는데 거울 속의 나는 0.5초 늦게 멈춘다.' },
      { t: '창밖의 얼굴', d: '3층 창밖, 사다리도 없는 허공에 떠 있는 창백한 얼굴.' },
      { t: '벽을 타는 그림자', d: '광원과 무관하게, 제 의지로 천장을 기어가는 그림자.' },
      { t: '어둠 속 두 점의 빛', d: '복도 끝 어둠 속에서 깜빡이지 않는 두 개의 안광.' },
      { t: '비스듬한 미소', d: '얼굴 근육으로는 불가능한 각도로 찢어진 입꼬리.' },
      { t: '핏자국의 궤적', d: '벽 높은 곳까지 끌려 올라간, 손톱이 긁은 핏빛 자국.' },
      { t: '항상 같은 자리의 인형', d: '치워도 다음 날이면 침대 발치를 보고 앉아 있는 인형.' },
      { t: '주변시(周邊視)의 무언가', d: '정면으로 보면 사라지고, 곁눈으로만 잡히는 형체.' },
      { t: '천장에 붙은 형체', d: '거꾸로 매달려 사람을 내려다보는, 사지가 긴 그것.' },
      { t: '사진 속 늘어난 인영', d: '인화할 때마다 가족 뒤에 한 사람씩 늘어나는 그림자.' },
      { t: '닫혔다 열리는 옷장', d: '아무도 건드리지 않았는데 천천히 입을 벌리는 문짝.' },
      { t: '바닥에 번진 검은 물', d: '천장 모서리에서 스며 나와 형체를 이루는 액체.' },
      { t: '표정 없는 가족', d: '똑같이 생겼지만 눈만 마주치지 않는, 미소가 늦는 식구.' },
      { t: '복도 끝의 정지 화면', d: '몇 시간을 봐도 1픽셀도 움직이지 않는 끝의 형체.' },
      { t: '빛을 빨아들이는 어둠', d: '손전등을 비춰도 안으로 빛이 빨려 들어가는 구멍.' },
      { t: '손가락 자국', d: '안쪽에서 김 서린 유리를 긁어 만든 가느다란 다섯 줄.' },
      { t: '없어진 거울 속 나', d: '거울 앞에 섰는데 비치는 방만 있고 내가 없다.' },
      { t: '뒤돌아 선 사람', d: '말을 걸면 천천히 고개부터 돌아오는, 등을 보인 형체.' },
    ],
  },
  {
    key: 'body', label: '체감·생리 반응', icon: '🥶', items: [
      { t: '등골이 서늘하다', d: '척추를 따라 위에서 아래로 얼음이 미끄러지는 감각.' },
      { t: '소름이 돋다', d: '팔뚝의 솜털이 일제히 곤두서며 살갗이 좁아드는 느낌.' },
      { t: '목덜미가 곤두서다', d: '누군가 뒤에서 목덜미에 입김을 부는 듯한 직감.' },
      { t: '공기가 무거워지다', d: '방 안 공기가 끈끈하게 굳어 숨쉬기 버거워지는 압박.' },
      { t: '공기가 차가워지다', d: '한여름인데 입김이 보일 만큼 갑자기 떨어지는 온도.' },
      { t: '시선의 무게', d: '아무도 없는데 분명 누군가 나를 보고 있다는 확신.' },
      { t: '심장이 쿵 내려앉다', d: '발밑이 꺼지듯 명치가 차게 비워지는 순간의 추락감.' },
      { t: '손발이 굳다', d: '비명조차 나오지 않게 온몸이 납처럼 잠겨버린 마비.' },
      { t: '입안이 마르다', d: '침을 삼키려 해도 목구멍이 사포처럼 들러붙는 갈증.' },
      { t: '귀가 먹먹해지다', d: '소리가 한순간 멀어지며 제 맥박만 크게 들리는 압통.' },
      { t: '식은땀이 흐르다', d: '등줄기를 타고 흐르는 차갑고 끈적한 땀.' },
      { t: '머리카락이 쭈뼛', d: '두피가 좁아들며 머리카락 한 올 한 올이 서는 감각.' },
      { t: '가위눌림', d: '깨어 있는데 손끝 하나 까딱 못 하고 가슴이 짓눌리는 압박.' },
      { t: '구역질이 치밀다', d: '본능이 먼저 알아챈 위험에 위장이 뒤틀리는 거부 반응.' },
      { t: '무릎이 풀리다', d: '다리에서 힘이 빠져 그 자리에 주저앉을 것 같은 와해.' },
      { t: '귓속이 윙', d: '정적이 너무 깊어 귀 안쪽에서 고음이 울리는 이명.' },
      { t: '피부가 따끔거리다', d: '보이지 않는 시선이 살갗을 바늘처럼 훑고 지나는 감각.' },
      { t: '숨이 막히다', d: '들이쉰 공기가 폐까지 닿지 않고 목에 걸리는 압박.' },
    ],
  },
  {
    key: 'smell', label: '후각 어휘 (냄새)', icon: '👃', items: [
      { t: '피비린내', d: '금속을 핥은 듯 혀끝까지 비릿하게 번지는 쇳내.' },
      { t: '썩은 내', d: '닫힌 방문 틈으로 새어 나오는, 달큼하고 역한 부패취.' },
      { t: '흙냄새', d: '갓 파낸 무덤처럼 축축하고 차가운 흙의 냄새.' },
      { t: '곰팡이·축축한 냄새', d: '오래 닫힌 지하실 특유의 눅눅하고 검은 곰팡이내.' },
      { t: '향(線香) 냄새', d: '아무도 피우지 않은 제사 향이 복도에 떠도는 냄새.' },
      { t: '촛농 냄새', d: '꺼진 초의 그을음과 녹은 밀랍이 섞인 오컬트적 냄새.' },
      { t: '쇠 비린 물내', d: '오래 고인 핏물처럼 비릿하고 차가운 물 냄새.' },
      { t: '탄내', d: '연기는 없는데 무언가 천천히 타들어 가는 그을음 냄새.' },
      { t: '내장 냄새', d: '도축장처럼 비리고 따뜻한, 갓 갈라진 살의 냄새.' },
      { t: '소독약·병원 냄새', d: '죽음을 닦아낸 자리에 남은 알코올과 약품의 냄새.' },
      { t: '꽃이 썩는 냄새', d: '장례식 화환이 시들며 풍기는, 달콤함과 부패의 경계.' },
      { t: '오존 냄새', d: '벼락 직전처럼 코를 찌르는, 무언가 나타나기 직전의 냄새.' },
      { t: '낯선 체취', d: '집 안에 배어버린, 식구 누구의 것도 아닌 사람 냄새.' },
      { t: '젖은 짐승 냄새', d: '비에 젖은 큰 짐승의 누린내가 방 안에서 풍긴다.' },
    ],
  },
  {
    key: 'device', label: '서사 장치·기법', icon: '🎬', items: [
      { t: '드레드(dread)의 축적', d: '사건이 아니라 “곧 무언가 일어난다”는 예감을 길게 끄는 것.' },
      { t: '언캐니(두려운 낯섦)', d: '익숙한 것이 미세하게 잘못된 상태가 주는 본능적 거부감.' },
      { t: '오프스크린 호러', d: '괴물을 끝까지 안 보여주고 소리·그림자·일부만 보이는 기법.' },
      { t: '신뢰할 수 없는 화자', d: '화자가 미쳤는지·거짓인지·이미 죽었는지 모르게 하는 시점.' },
      { t: '잘못된 안도(false scare)', d: '위협인 줄 알았던 게 고양이였다 → 안심 직후 진짜 공격.' },
      { t: '금지된 지식의 처벌', d: '열지 말라는 문을 연 자가 알아버려서 파멸하는 구조.' },
      { t: '저주의 전염 구조', d: '저주가 사람에서 사람으로 옮겨가는 룰(『링』의 복사 전파).' },
      { t: '격리·고립 장치', d: '통신 두절·정전·폭설로 외부 도움을 차단해 무력화.' },
      { t: '공간의 인격화', d: '집·호텔·숲 자체가 적대적 의지를 가진 존재가 되는 것.' },
      { t: '신체의 배신', d: '감염·빙의·기생·변형으로 제 몸을 통제할 수 없게 됨.' },
      { t: '시간·기억의 왜곡', d: '같은 날이 반복되거나, 기억이 지워지거나, 시간이 멈춘다.' },
      { t: '매체를 통한 침투', d: '거울·사진·비디오·전화·인형 같은 일상 사물이 위협 매개가 됨.' },
      { t: '목격의 비대칭', d: '주인공만 본다 → 아무도 안 믿어준다 → 고립이 심화된다.' },
      { t: '카운트다운(타임리밋)', d: '“7일 후”·“해 뜨기 전까지” 시한으로 긴장을 조이는 장치.' },
      { t: '규칙의 제시와 위반', d: '“밤에 나온다”·“이름을 부르면 안 된다” 같은 룰과 그 위반=처벌.' },
      { t: '취약한 인물 이입', d: '무력·고립된 인물에 감정이입시켜 “내가 저 상황이면”을 자극.' },
      { t: '불확실성의 유지', d: '초자연인가 정신병인가의 모호함을 가능한 오래 끄는 것.' },
      { t: '챕터 끝 클리프행어', d: '각 장 끝을 작은 충격·불길한 암시로 끊어 다음 장을 넘기게.' },
      { t: '정보의 적하(滴下)', d: '괴물의 정체·기원을 한 번에 풀지 않고 조금씩 흘리는 것.' },
      { t: '슬로 빌드업 + 가속', d: '전반부는 분위기로 천천히, 후반부는 쉴 틈 없이 몰아치는 페이싱.' },
      { t: '거짓 승리 후 재공격', d: '이긴 줄 알았는데 괴물이 다시 일어나는 슬래셔의 정석.' },
      { t: '데우스 엑스 마키나 회피', d: '클라이맥스의 약점·해법을 빌드업에서 미리 복선으로 심기.' },
    ],
  },
  {
    key: 'subgenre', label: '하위장르·전문용어', icon: '🩸', items: [
      { t: '코스믹 호러(우주적 공포)', d: '인간의 이해를 넘어선 존재 앞의 무력함. 러브크래프트적 공포.' },
      { t: '포크 호러', d: '고립된 시골 공동체의 이교 의식·인신공양. 『위커맨』·『미드소마』.' },
      { t: '바디 호러', d: '신체변형·감염·기생·변형을 통한 자아 상실의 공포.' },
      { t: '고딕 호러', d: '폐허·저주받은 가문·초자연이 깃든 음울한 저택의 미학.' },
      { t: '슬래셔', d: '가면 쓴 살인마와 차례로 죽는 인물들, 마지막 생존자의 반격.' },
      { t: '하운티드 하우스', d: '과거의 비극(살인·자살)을 품은, 사람을 안에 가두는 집.' },
      { t: '오컬트·엑소시즘', d: '악마·빙의·흑마술·사이비를 다루는 종교적 공포.' },
      { t: '사이코로지컬 호러', d: '내면의 붕괴·편집증·신뢰불가 화자 중심의 심리 공포.' },
      { t: '서바이벌·아포칼립스', d: '좀비·감염병으로 무너진 세계에서의 생존 호러.' },
      { t: '크리처·몬스터', d: '미지의 생명체·괴수가 주체가 되는 공포.' },
      { t: 'J-호러', d: '축축하고 끈질긴 원혼, 기술 매체를 통한 저주 전파. 『링』·『주온』.' },
      { t: '파이널 걸(final girl)', d: '가장 무력했던 인물이 마지막에 맞서 싸워 살아남는 인물형.' },
      { t: '점프 스케어', d: '갑작스러운 등장·굉음으로 일으키는 표면적 충격.' },
      { t: '고어(gore)', d: '유혈·신체훼손을 직접 보여주는 시각적 충격의 강도.' },
      { t: '드레드(dread)', d: '사건 전에 깔리는 지속적 불안. 공포의 두 번째 층위.' },
      { t: '바디 스내처', d: '겉모습은 그대로지만 내용물이 바뀐 “가짜 사람” 모티프.' },
      { t: '리미널 스페이스', d: '텅 빈 복도·폐쇄된 수영장처럼 익숙하지만 비어 있는 공간의 불안.' },
      { t: '크립티드', d: '목격담만 있고 실체는 모호한 정체불명의 생물.' },
      { t: '하그(hag)·노파', d: '가위눌림과 결부된, 가슴을 짓누르는 노파 형상의 존재.' },
      { t: '도플갱어', d: '나와 똑같이 생긴 존재. 마주치면 죽음의 전조라는 룰.' },
      { t: '원혼(怨魂)', d: '한(恨)을 풀지 못해 이승에 붙들린, 끈질긴 한국·동아시아의 귀신.' },
      { t: '엔티티(entity)', d: '정체·기원을 알 수 없는, 이름 붙이기 어려운 존재의 총칭.' },
    ],
  },
  {
    key: 'cliche', label: '상투구·클리셰', icon: '🎭', items: [
      { t: '이상한 지하실/다락방', d: '이사 온 새 집의 절대 내려가면 안 되는 공간.' },
      { t: '“잠깐 보고 올게”', d: '혼자 떨어진 인물은 다음 장면에 시신으로 발견된다.' },
      { t: '안 터지는 휴대폰', d: '결정적 순간에 신호가 끊기고 배터리가 1%로 떨어진다.' },
      { t: '고장 난 차', d: '하필 외딴 도로 한복판에서 시동이 걸리지 않는다.' },
      { t: '깜빡이다 꺼지는 전등', d: '전등이 꺼지는 순간 그것이 코앞에 와 있다.' },
      { t: '저절로 켜지는 TV', d: '꺼둔 화면이 새벽 3시에 백색 잡음으로 켜진다.' },
      { t: '거울 뒤의 무언가', d: '거울을 보면 등 뒤에 형체가 있고, 돌아보면 없다.' },
      { t: '아이의 보이지 않는 친구', d: '“그 사람이 자기랑 놀재”라고 말하는 아이.' },
      { t: '먼저 이상해지는 동물', d: '개·고양이가 빈 구석을 보고 으르렁거리며 위험을 감지.' },
      { t: '“여긴 오면 안 됐어”', d: '주유소 직원·노인이 마을을 경고하는 장면.' },
      { t: '마지막의 불쑥 손', d: '다 끝난 줄 알았는데 화면 밖에서 손이 튀어나온다.' },
      { t: '“다들 날 미쳤다고 해”', d: '진실을 본 주인공이 아무에게도 믿어지지 않는다.' },
      { t: '봉인을 어기는 호기심', d: '읽지 말라는 책·열지 말라는 상자를 기어이 건드린다.' },
      { t: '폭풍우와 동시 정전', d: '천둥이 치는 밤, 사건과 함께 모든 불이 나간다.' },
      { t: '버려진 병원·정신병원', d: '낡은 의무기록과 묶인 침대가 남은 폐건물.' },
      { t: '우물·낡은 인형', d: '마당의 메워진 우물, 눈이 텅 빈 골동 인형.' },
      { t: '새벽 3시(악마의 시간)', d: '괴현상이 어김없이 반복되는 정해진 시각.' },
      { t: '“돌아보지 마”', d: '뒤를 보면 안 된다는 경고와, 끝내 돌아보는 인물.' },
      { t: '히치하이커·낯선 손님', d: '비 오는 밤 태워준 사람이 사라지고 좌석만 젖어 있다.' },
      { t: '오래된 일기·녹음테이프', d: '전(前) 거주자가 남긴, 끝까지 듣지 말았어야 할 기록.' },
    ],
  },
  {
    key: 'emotion', label: '정서·심리 키워드', icon: '😱', items: [
      { t: '공포(terror)', d: '곧 닥칠 위협에 대한, 사건 이전의 떨림.' },
      { t: '경악(horror)', d: '끔찍한 것을 목격한 직후의 얼어붙는 충격.' },
      { t: '혐오(disgust)', d: '부패·훼손·점액에 대한 본능적 거부 반응.' },
      { t: '불안(dread)', d: '명확한 대상 없이 깔리는, 무언가 잘못됐다는 예감.' },
      { t: '편집증(paranoia)', d: '모두가 적이고 누군가 늘 지켜본다는 의심.' },
      { t: '무력감', d: '저항해도 소용없다는, 운명에 짓눌리는 감각.' },
      { t: '고립감', d: '아무도 도와줄 수 없고 아무도 믿어주지 않는 단절.' },
      { t: '절망', d: '탈출구가 없음을 깨달은 자의 텅 빈 체념.' },
      { t: '광기', d: '현실과 환각의 경계가 무너지며 자아가 풀려나는 상태.' },
      { t: '불길함(ominous)', d: '아직 일어나지 않았으나 분명히 다가오는 재앙의 기운.' },
      { t: '오싹함(eerie)', d: '딱 짚을 수 없으나 등이 서늘해지는 위화감.' },
      { t: '섬뜩함(uncanny)', d: '익숙한 것이 미세하게 어긋나 주는 본능적 불쾌.' },
      { t: '존재론적 불안', d: '“세계가 안전하지 않다”는, 작품이 끝난 뒤 남는 여운.' },
      { t: '죄책감', d: '내가 그것을 불러들였다는, 인물을 갉아먹는 자책.' },
      { t: '체념적 수용', d: '맞설 수 없음을 알고 운명에 몸을 내맡기는 정조.' },
      { t: '망상적 확신', d: '증거 없이도 진실을 알아버린 자의 위태로운 신념.' },
    ],
  },
  {
    key: 'space', label: '공간·배경 어휘', icon: '🏚️', items: [
      { t: '외딴 산장', d: '눈에 갇혀 외부와 끊긴, 탈출 불가의 폐쇄 공간.' },
      { t: '귀신 들린 저택', d: '과거의 비극을 벽 속에 품은, 역사가 곧 공포인 집.' },
      { t: '등대', d: '바다 한가운데 홀로 선, 빛이 닿지 않는 나선 계단의 탑.' },
      { t: '버려진 병원', d: '약품 냄새와 묶인 침대가 남은, 죽음이 배인 복도.' },
      { t: '폐교', d: '낡은 책상과 멈춘 시계가 있는, 웃음소리가 남은 교실.' },
      { t: '저주받은 마을', d: '외부인을 친절히 맞이하나 보내주지 않는 폐쇄 공동체.' },
      { t: '지하 벙커', d: '문이 안에서 잠기는, 빛도 신호도 없는 콘크리트 무덤.' },
      { t: '눈에 갇힌 호텔', d: '폐장한 오버룩처럼, 손님 없는 긴 복도를 가진 건물.' },
      { t: '안개 낀 늪지', d: '발이 빠지고 시야가 막히는, 무언가 숨어 있는 습지.' },
      { t: '잠수함·심해', d: '수압이 짓누르고 도망갈 곳이 없는 강철 관(棺).' },
      { t: '메워진 우물', d: '마당 아래 봉인된, 무언가를 가둬둔 어두운 구멍.' },
      { t: '다락방', d: '집의 가장 높고 잊힌 곳, 전(前) 거주자의 물건이 쌓인 공간.' },
      { t: '교차로·삼거리', d: '한밤 인적 끊긴, 무언가와 거래가 이뤄진다는 갈림길.' },
      { t: '폐터널', d: '끝이 보이지 않고 메아리가 한 박자 늦게 돌아오는 굴.' },
      { t: '한밤의 병실', d: '옆 침대 커튼 너머에서 누군가 일어나 앉는 어두운 방.' },
      { t: '지하 주차장', d: '형광등이 점점이 꺼지고 차 사이에 그림자가 깃든 공간.' },
      { t: '낡은 아파트 복도', d: '센서등이 한 칸씩 켜지며 끝까지 누군가 따라오는 통로.' },
      { t: '숲속 빈터', d: '나무가 동그랗게 비켜선, 의식이 치러진 듯한 공터.' },
    ],
  },
  {
    key: 'entity', label: '괴물·존재 묘사', icon: '👻', items: [
      { t: '처녀귀신', d: '풀어헤친 머리로 얼굴을 가린 채 고개를 늘어뜨린 한국의 원혼.' },
      { t: '구미호', d: '아홉 꼬리로 사람을 홀려 간을 노리는 변신 요괴.' },
      { t: '사다코형 원귀', d: '젖은 머리카락으로 얼굴을 가린 채 기어 나오는 저주의 화신.' },
      { t: '관절 꺾인 형체', d: '사지가 반대로 꺾인 채 거미처럼 기어 다니는 존재.' },
      { t: '입이 없는 얼굴', d: '이목구비가 뭉개진, 표정을 읽을 수 없는 매끈한 면.' },
      { t: '키 큰 그림자 인간', d: '비정상적으로 길고 가는, 윤곽뿐인 검은 형체.' },
      { t: '바꿔친 아이(체인질링)', d: '겉은 내 아이지만 눈빛만 다른, 무언가로 바뀐 존재.' },
      { t: '형체 없는 안개', d: '의지를 가지고 스며들며 닿은 것을 부패시키는 검은 안개.' },
      { t: '거꾸로 매달린 존재', d: '천장에 붙어 거꾸로 사람을 내려다보는 그것.' },
      { t: '미소만 남은 것', d: '어둠 속에서 입꼬리 곡선만 둥실 떠 있는 형상.' },
      { t: '벽 속의 손', d: '벽지를 안에서 밀어내며 윤곽을 드러내는 다섯 손가락.' },
      { t: '무리 지은 눈동자', d: '천장에 별처럼 박혀 일제히 깜빡이는 수십 개의 눈.' },
      { t: '기어 다니는 살덩이', d: '얼굴도 사지도 분간되지 않는, 꿈틀거리는 육체.' },
      { t: '복제된 가족', d: '식탁에 똑같은 모습으로 앉아 일제히 나를 보는 가짜들.' },
      { t: '이름을 아는 존재', d: '나만 아는 이름·기억을 속삭이며 다가오는 것.' },
      { t: '얼굴 없는 추적자', d: '천천히 걷지만 어느새 늘 같은 거리를 유지하는 그것.' },
      { t: '인형이 된 사람', d: '관절에 경첩이 박힌 채 부자연스럽게 움직이는 형체.' },
      { t: '물에서 나오는 손', d: '욕조·수면 아래에서 천천히 솟아오르는 창백한 팔.' },
    ],
  },
  {
    key: 'curse', label: '저주·금기·규칙', icon: '⛧', items: [
      { t: '“이름을 부르지 마라”', d: '이름을 부르는 순간 존재가 권리를 얻어 다가온다.' },
      { t: '“돌아보지 마라”', d: '뒤를 보는 순간 눈이 마주치고 끌려간다.' },
      { t: '7일의 시한', d: '비디오를 본 자는 이레 뒤 정해진 방식으로 죽는다.' },
      { t: '복사하면 전이된다', d: '저주를 다른 이에게 옮기면 자신은 유예받는 룰.' },
      { t: '문지방을 넘지 못한다', d: '초대받지 못하면 경계를 넘지 못하는 존재의 규칙.' },
      { t: '소금·팥의 결계', d: '문턱에 뿌리면 그것이 넘어오지 못한다는 전통적 방비.' },
      { t: '거울을 가려라', d: '상중(喪中)엔 거울을 덮어 혼이 갇히지 않게 한다는 금기.' },
      { t: '“보름달엔 나가지 마라”', d: '달이 차면 변하는 자가 깨어난다는 경고.' },
      { t: '세 번 부르면 온다', d: '이름이나 주문을 세 번 외면 불려 나오는 호출의 룰.' },
      { t: '13번째 종', d: '자정의 종이 한 번 더 울리면 시간이 그것의 것이 된다.' },
      { t: '음식을 먹지 마라', d: '저편의 음식을 입에 대면 돌아올 수 없다는 금기.' },
      { t: '약속의 대가', d: '거래에는 반드시 같은 무게의 대가가 따른다는 계약의 법칙.' },
      { t: '문을 잠그지 마라', d: '잠그면 안에 갇히고, 열어두면 들어온다는 딜레마형 규칙.' },
      { t: '시선을 끊지 마라', d: '한순간이라도 눈을 떼면 거리가 좁혀지는 추적의 룰.' },
      { t: '“대답하지 마라”', d: '네 이름을 부르는 목소리에 답하면 따라가게 된다.' },
      { t: '해 뜨기 전까지', d: '아침 햇살이 닿으면 효력이 사라진다는 시한부 저주.' },
      { t: '계약의 서명', d: '제 피로 이름을 적는 순간 혼의 소유권이 넘어간다.' },
      { t: '읽으면 옮는 글', d: '끝까지 읽은 자에게 다음 차례가 넘어가는 텍스트 저주.' },
    ],
  },
  {
    key: 'voice', label: '말투·대사 톤', icon: '🗣️', items: [
      { t: '단조로운 평서', d: '감정 없이 사실만 읊는, 더 무서운 무표정한 진술.' },
      { t: '어린아이 화법', d: '어린아이 말투로 어른의 끔찍한 진실을 말하는 부조화.' },
      { t: '반복 강박 대사', d: '같은 문장을 박자 어긋나게 되풀이하는 망가진 화법.' },
      { t: '존댓말의 위협', d: '깍듯한 경어로 더 섬뜩하게 다가오는, 정중한 협박.' },
      { t: '미완성 문장', d: '말끝이 “…” 으로 끊겨 상상에 맡기는, 흐려지는 진술.' },
      { t: '메아리치는 동어', d: '내 말을 한 박자 늦게 똑같이 따라 하는 목소리.' },
      { t: '예언조 경고', d: '“넌 곧 알게 될 거야” 식의, 운명을 통보하는 어조.' },
      { t: '속삭이는 권유', d: '귓가에서 부드럽게 끔찍한 행동을 권하는 유혹조.' },
      { t: '복수(複數)의 한 목소리', d: '여러 입이 “우리는”이라고 하나로 말하는 합창체.' },
      { t: '뒤집힌 인사', d: '“잘 가”를 만났을 때, “어서 와”를 헤어질 때 하는 어긋남.' },
      { t: '무미건조한 카운트', d: '“셋… 둘… 하나…” 감정 없이 세어 내려가는 시한 통보.' },
      { t: '자장가 톤', d: '잠재우려는 듯 느리고 다정한, 죽음을 부르는 노래조.' },
      { t: '“기억 안 나?”', d: '내가 모르는 과거를 당연하다는 듯 들이미는 친밀한 압박.' },
      { t: '거꾸로 된 말', d: '거꾸로 재생한 듯 음절이 뒤틀려 들리는 발화.' },
      { t: '“우리 만난 적 있잖아”', d: '초면인데 오랜 사이인 양 말을 거는 익숙함의 공포.' },
      { t: '웃음 섞인 협박', d: '농담처럼 웃으며 끔찍한 예고를 흘리는 어조.' },
    ],
  },
]

// 전체 항목 수
const TOTAL = CATS.reduce((n, c) => n + c.items.length, 0)
const ALL: { t: string; d: string; cat: string; icon: string }[] = CATS.flatMap((c) =>
  c.items.map((i) => ({ t: i.t, d: i.d, cat: c.label, icon: c.icon })),
)

// ───────── 보조: 슬롯 조합형 "공포 한 줄" 생성기(8슬롯 · 조합수 1조 이상) ─────────
// 시간(40) × 장소(38) × 분위기(36) × 감각징후(34) × 존재(32) × 행동(30) × 규칙·금기(28) × 여운(26)
//   = 1,300,252,262,400 ≈ 1.30조 가지. 전부 호러·공포 특화 슬롯 풀.
const TIME = [
  '새벽 3시,', '자정이 막 지난 시각,', '해가 진 직후,', '폭풍우가 몰아치던 밤,', '정전이 된 그 순간,',
  '13번째 종이 울리자,', '눈에 갇힌 사흘째 밤,', '장례를 치른 그날 밤,', '보름달이 차던 밤,', '시계가 멈춘 채,',
  '안개가 짙게 낀 새벽,', '모두가 잠든 사이,', '비가 그치지 않던 밤,', '제삿날 자정,', '해 뜨기 직전,',
  '첫눈이 내리던 밤,', '이사 온 첫날 밤,', '전화가 끊긴 직후,', '마지막 손님이 떠난 뒤,', '불을 끄려던 찰나,',
  '추모식이 끝난 밤,', '달도 없는 그믐밤,', '천둥이 친 직후,', '신호가 끊긴 깊은 밤,', '꿈에서 깬 새벽,',
  '제야의 종이 멎자,', '아무도 없어야 할 시각,', '문을 잠그자마자,', '거울을 가린 그날,', '향이 다 타들어 가자,',
  '일곱째 날 밤,', '집들이 다음 날,', '동이 트기 전,', '잠들기 직전,', '폭설로 길이 막힌 밤,',
  '한낮인데 어두워진 순간,', '벨이 세 번 울린 뒤,', '촛불이 꺼지자,', '백색 잡음이 시작되자,', '모두 떠난 새벽,',
]
const PLACE = [
  '복도 끝에서', '거울 속에서', '닫힌 옷장 안에서', '천장 위에서', '침대 밑에서',
  '잠긴 문 너머에서', '꺼진 TV 화면에서', '욕실 배수구에서', '벽지 안쪽에서', '안개 낀 마당에서',
  '낡은 사진 속에서', '수화기 너머에서', '계단참에서', '커튼 뒤에서', '지하실 어둠 속에서',
  '아이 방에서', '창밖 허공에서', '메워진 우물에서', '병실 옆 침대에서', '엘리베이터 안에서',
  '다락방에서', '주차장 어둠 속에서', '폐교 교실에서', '버려진 병원 복도에서', '등대 나선 계단에서',
  '욕조 수면 아래에서', '벽시계 뒤에서', '문틈으로', '냉장고 안에서', '낡은 일기장 갈피에서',
  '교차로 한가운데에서', '폐터널 끝에서', '센서등이 꺼진 복도에서', '숲속 빈터에서', '지하 벙커에서',
  '늪지 안개 속에서', '오래된 라디오에서', '봉인된 상자 속에서',
]
const ATMOS = [
  '정적을 깨고', '입김이 보일 만큼 차가운 공기 속에', '곰팡이 냄새와 함께',
  '깜빡이는 형광등 아래', '라디오 잡음에 섞여', '피비린내를 풍기며',
  '한 박자 늦은 메아리처럼', '향 냄새를 끌고', '소름이 돋는 가운데',
  '폭풍우 소리에 묻혀', '먹먹한 이명 속에', '식은땀을 부르며',
  '시선의 무게와 함께', '썩은 단내를 흘리며', '머리카락이 쭈뼛 서는 채로',
  '오존 냄새를 풍기며', '먼 동요 소리에 섞여', '파리 떼 소리와 함께',
  '검은 안개를 끌며', '한기가 스미는 가운데', '젖은 발소리와 함께',
  '촛농 냄새를 흘리며', '바닥을 적시며', '숨 막히는 적막 속에',
  '벽 긁는 소리에 맞춰', '흙냄새를 끌고', '귓속이 윙 울리는 가운데',
  '벽시계가 멎은 채', '낮은 중얼거림과 함께', '온기가 빠져나간 자리에',
  '비릿한 물내를 풍기며', '천장에서 물이 떨어지는 가운데', '제 그림자가 길어지는 채로',
  '문이 저절로 열리며', '연기 없는 탄내를 끌고', '귀가 먹먹해진 채로',
]
const SIGN = [
  '내 곁눈으로만 잡히던 것이', '아무도 없어야 할 그곳에서', '거울 속에서만 다르게 움직이며',
  '주변시 끝에 어른거리던 형체가', '사진을 인화할 때마다 늘어나던 그림자가', '개가 으르렁대던 빈 구석에서',
  '닫아둔 문이 천천히 열리며', '꺼둔 화면이 저절로 켜지더니', '잠가둔 손잡이가 안에서 돌아가며',
  '항상 같은 자리에 서 있던 것이', '표정이 0.5초 늦던 그 식구가', '벽지를 안에서 밀어내며',
  '유리에 김 서린 손자국을 남기더니', '계단이 한 칸 더 삐걱이며', '천장에 별처럼 박힌 눈동자가',
  '복도 끝의 정지한 형체가', '거꾸로 천장에 붙어 있던 것이', '내 이름을 아는 목소리로',
  '센서등을 한 칸씩 꺼뜨리며', '거울 속에 내가 사라진 자리에서', '벽 너머에서 속삭이던 것이',
  '문지방 앞에 멈춰 서 있던 것이', '소금 결계 바로 밖에서', '돌아보지 말라던 그 뒤에서',
  '한낮에도 그늘만 골라 디디며', '내 그림자보다 한 박자 늦게', '수면 아래에서 천천히 솟아오르며',
  '늘 같은 거리를 유지하던 추적자가', '아무에게도 보이지 않던 그것이', '복제된 가족 사이에서',
  '바닥에 번진 검은 물에서', '관절을 거꾸로 꺾으며', '입김 없이 거울만 흐리며',
]
const ENTITY = [
  '관절이 꺾인 형체가', '얼굴 없는 그것이', '젖은 머리의 원귀가', '미소만 남은 무언가가',
  '바꿔친 아이가', '키 큰 그림자가', '복제된 나 자신이', '벽 속의 손이',
  '이름을 아는 존재가', '거꾸로 매달린 것이', '표정 없는 노파가', '입이 없는 사람이',
  '무리 지은 눈동자가', '기어 다니는 살덩이가', '얼굴 없는 추적자가', '인형이 된 사람이',
  '처녀귀신이', '아홉 꼬리의 그것이', '도플갱어가', '형체 없는 검은 안개가',
  '가슴을 짓누르는 노파가', '경첩 박힌 사지의 형체가', '물에서 솟은 창백한 팔이', '뒤돌아 선 사람이',
  '이름 없는 엔티티가', '눈만 텅 빈 광대가', '메아리처럼 따라 하던 목소리가', '나와 똑같은 얼굴이',
  '그림자 인간이', '한(恨) 맺힌 원혼이', '천장의 거미 같은 것이', '미소가 찢어진 그것이',
]
const ACT = [
  '천천히 고개를 돌렸다', '내 이름을 세 번 불렀다', '한 칸씩 가까워졌다',
  '거꾸로 기어 나왔다', '미소가 0.5초 늦게 번졌다', '“돌아보지 마”라고 속삭였다',
  '나와 똑같이 멈춰 섰다', '벽을 긁기 시작했다', '문 손잡이를 안에서 돌렸다',
  '숨소리를 내 귀에 불어넣었다', '“기억 안 나?”라고 물었다', '카운트를 세기 시작했다',
  '내 쪽으로 손을 뻗었다', '거울에서 한 발짝 걸어 나왔다',
  '내 자장가를 똑같이 흥얼거렸다', '“우리 만난 적 있잖아”라고 했다', '제 머리를 거꾸로 꺾었다',
  '내 그림자를 밟고 섰다', '핏빛 손자국을 천장까지 남겼다', '“대답하지 마”라고 경고했다',
  '입꼬리만 어둠 속에 띄웠다', '내 침대 발치에 앉았다', '거꾸로 된 말로 중얼거렸다',
  '복도를 가로질러 다가왔다', '내 뒤에서 같은 보폭으로 걸었다', '벽 안에서 손을 내밀었다',
  '눈을 마주친 채 미소 지었다', '내 이름을 제 것처럼 불렀다', '문을 안에서 잠갔다',
  '천천히 일어나 앉았다',
]
const RULE = [
  '— 이름을 불러선 안 됐다.', '— 돌아보지 말았어야 했다.', '— 시한은 이레 남았다.',
  '— 세 번 부르면 온다고 했다.', '— 시선을 끊지 말았어야 했다.', '— 문을 잠그면 안 됐다.',
  '— 대답하지 말았어야 했다.', '— 그 음식을 먹지 말았어야 했다.', '— 거울을 가렸어야 했다.',
  '— 보름달엔 나가면 안 됐다.', '— 그 책을 끝까지 읽은 탓이었다.', '— 소금 결계가 끊긴 자리였다.',
  '— 약속의 대가가 시작됐다.', '— 초대한 적 없는데 들어와 있었다.', '— 13번째 종이 울린 뒤였다.',
  '— 거래의 서명은 이미 끝나 있었다.', '— 복사하지 않으면 내 차례였다.', '— 해 뜨기 전엔 멈추지 않았다.',
  '— 문지방을 넘어버린 것이다.', '— 읽은 자에게 옮는 글이었다.', '— 그 비디오를 본 지 이레째였다.',
  '— 새벽 3시면 어김없이 반복됐다.', '— 눈을 뗀 사이 거리가 좁혀졌다.', '— 이름을 들킨 것이 화근이었다.',
  '— 봉인을 어긴 호기심의 값이었다.', '— 그날 밤 거울을 안 가린 탓이었다.', '— 우물을 메우지 말았어야 했다.',
  '— 그 인사를 받지 말았어야 했다.',
]
const CODA = [
  '그리고 불이 나갔다.', '아무도 내 말을 믿지 않았다.', '휴대폰은 1%에서 꺼졌다.',
  '해가 뜨려면 아직 멀었다.', '이번엔 도망칠 곳이 없었다.', '끝난 게 아니었다.',
  '그것은 내 얼굴을 하고 있었다.', '나만 그것을 볼 수 있었다.', '집 안엔 한 명이 더 있었다.',
  '저주는 다음 사람에게 옮겨갔다.', '거래의 대가가 시작됐다.', '거울 속의 나는 웃고 있었다.',
  '문은 안에서 잠겨 있었다.', '발소리는 멈추지 않았다.', '아침이 와도 그것은 남아 있었다.',
  '내 이름이 명단에 적혀 있었다.', '그날 이후 거울을 보지 않는다.', '아무도 그 집에서 나오지 못했다.',
  '다음은 너라고 속삭였다.', '나는 아직도 그 소리를 듣는다.', '시계는 영영 3시에 멈췄다.',
  '사진 속 사람이 한 명 늘어 있었다.', '집은 그날부터 나를 가두었다.', '그 아이는 내 아이가 아니었다.',
  '여전히 누군가 나를 보고 있다.', '그것은 내 안으로 들어왔다.',
]
const SLOTS = [
  { key: 'time', label: '시간', pool: TIME },
  { key: 'place', label: '장소', pool: PLACE },
  { key: 'atmos', label: '분위기', pool: ATMOS },
  { key: 'sign', label: '징후', pool: SIGN },
  { key: 'entity', label: '존재', pool: ENTITY },
  { key: 'act', label: '행동', pool: ACT },
  { key: 'rule', label: '규칙·금기', pool: RULE },
  { key: 'coda', label: '여운', pool: CODA },
] as const
const COMBOS = SLOTS.reduce((n, s) => n * s.pool.length, 1) // 40·38·36·34·32·30·28·26 ≈ 1.30조

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const pick = (n: number) => Math.floor(Math.random() * n)

type Mode = 'browse' | 'random' | 'gen'

export default function HorrorLexicon({ payload }: { payload?: Record<string, unknown> }) {
  const genreHint = typeof payload?.genre === 'string' ? (payload.genre as string) : ''
  const [mode, setMode] = useState<Mode>('browse')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({ [CATS[0].key]: true })
  const [rand, setRand] = useState(() => sampleRandom(24))
  const [toast, setToast] = useState('')
  // 생성기 슬롯 상태(인덱스) + 잠금
  const [idx, setIdx] = useState<number[]>(() => SLOTS.map((s) => pick(s.pool.length)))
  const [locks, setLocks] = useState<boolean[]>(() => SLOTS.map(() => false))
  const toastTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }
  }, [])

  const flash = useCallback((msg: string, ms = 1300) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), ms)
  }, [])

  function sampleRandomMemo() { return sampleRandom(24) }

  const ql = q.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!ql) return CATS
    return CATS
      .map((c) => ({ ...c, items: c.items.filter((i) => i.t.toLowerCase().includes(ql) || i.d.toLowerCase().includes(ql)) }))
      .filter((c) => c.items.length || c.label.toLowerCase().includes(ql))
  }, [ql])

  const copyText = useCallback((text: string) => {
    const done = () => flash('복사됨: ' + text)
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
    else fallbackCopy(text, done)
  }, [flash])
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.focus(); ta.select()
      document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { flash('복사 실패 — 직접 선택하세요', 1500) }
  }

  const saveSnippet = useCallback((text: string, source: string, tag: string) => {
    addToLibrary('snippets', { text, source, tags: ['호러·공포', tag] })
    flash('스니펫 저장: ' + text)
  }, [flash])

  // 생성기: 한 줄 문장 — 시간 · 장소 · 분위기 · 징후 · 존재 · 행동 · 규칙 · 여운
  const genLine = useMemo(() => {
    const [time, place, atmos, sign, entity, act, rule, coda] = SLOTS.map((sl, i) => sl.pool[idx[i]])
    return `${time} ${place} ${atmos} ${sign} ${entity} ${act}. ${rule} ${coda}`
  }, [idx])

  const roll = useCallback(() => {
    setIdx((cur) => cur.map((v, i) => (locks[i] ? v : pick(SLOTS[i].pool.length))))
  }, [locks])
  const toggleLock = (i: number) => setLocks((l) => l.map((v, j) => (j === i ? !v : v)))

  // 현재 보이는 항목 묶음(프로젝트 추가용)
  const visibleGroups = useMemo(() => {
    type G = { cat: string; icon: string; items: { t: string; d: string }[] }
    if (mode === 'random') {
      const map = new Map<string, G>()
      for (const r of rand) {
        const g = map.get(r.cat) || { cat: r.cat, icon: r.icon, items: [] }
        if (!g.items.some((x) => x.t === r.t)) g.items.push({ t: r.t, d: r.d })
        map.set(r.cat, g)
      }
      return [...map.values()]
    }
    if (mode === 'gen') return []
    const out: G[] = []
    for (const c of filtered) {
      const isOpen = !!open[c.key] || !!ql
      if (!isOpen || !c.items.length) continue
      out.push({ cat: c.label, icon: c.icon, items: c.items.map((i) => ({ t: i.t, d: i.d })) })
    }
    return out
  }, [mode, rand, filtered, open, ql])
  const visibleCount = useMemo(() => visibleGroups.reduce((n, g) => n + g.items.length, 0), [visibleGroups])

  // 프로젝트 자료에 현재 보이는 어휘 묶음 추가
  const addCurrentToProject = useCallback(() => {
    if (!hasProjectBridge()) return
    if (mode === 'gen') {
      const bodyHtml = `<p>${escapeHtml(genLine)}</p>` +
        `<p style="color:#888">조합 가능 수 ${COMBOS.toLocaleString()}가지 중 한 줄 · 호러 어휘 사전</p>`
      const id = addToProject({ kind: 'text', root: 'research', folder: '호러 표현 모음', title: '공포 한 줄 — ' + genLine.slice(0, 18) + '…', bodyHtml })
      if (id) flash('프로젝트 자료 〈호러 표현 모음〉에 추가했습니다.', 2200)
      return
    }
    if (!visibleGroups.length) return
    const when = mode === 'random' ? '무작위로 모은' : (ql ? `“${q.trim()}” 검색` : '펼쳐본')
    const bodyHtml = `<p>${escapeHtml(when)} 호러 어휘·표현 ${visibleCount}개입니다.</p>` +
      visibleGroups.map((g) =>
        `<p><b>${escapeHtml(g.icon + ' ' + g.cat)}</b></p>` +
        g.items.map((i) => `<p><b>${escapeHtml(i.t)}</b> — ${escapeHtml(i.d)}</p>`).join(''),
      ).join('')
    const title = mode === 'random'
      ? `호러 어휘 — 무작위 ${visibleCount}개`
      : (ql ? `호러 어휘 — “${q.trim()}” ${visibleCount}개` : `호러 어휘 — ${visibleCount}개`)
    const id = addToProject({ kind: 'text', root: 'research', folder: '호러 표현 모음', title, bodyHtml })
    if (id) flash(`프로젝트 자료 〈호러 표현 모음〉에 ${visibleCount}개를 추가했습니다.`, 2200)
  }, [mode, genLine, visibleGroups, visibleCount, ql, q, flash])

  const projDisabled = !hasProjectBridge() || (mode !== 'gen' && visibleCount === 0)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)', overflow: 'hidden' }}>
      {/* 모드 탭 */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className={'minibtn' + (mode === 'browse' ? ' active' : '')} onClick={() => setMode('browse')}><Emoji e="📂"/> 펼쳐보기</button>
        <button className={'minibtn' + (mode === 'random' ? ' active' : '')} onClick={() => setMode('random')}><Emoji e="🎲"/> 무작위</button>
        <button className={'minibtn' + (mode === 'gen' ? ' active' : '')} onClick={() => setMode('gen')}><Emoji e="🕯️"/> 공포 한 줄</button>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
          {TOTAL.toLocaleString()}개 표현 · {CATS.length}개 분야{genreHint ? ` · ${genreHint}` : ''}
        </span>
      </div>

      {mode === 'browse' && (
        <input className="field" placeholder="공포 어휘·표현 검색 (예: 그림자, 저주, 발소리)…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%' }} />
      )}

      {/* 본문 */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {mode === 'browse' && filtered.map((c) => {
          const isOpen = !!open[c.key] || !!ql
          return (
            <div key={c.key} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <button onClick={() => setOpen((o) => ({ ...o, [c.key]: !o[c.key] }))}
                style={{ width: '100%', textAlign: 'left', padding: '8px 10px', background: 'var(--panel)', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                <span><Emoji e={c.icon}/> {c.label} <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 11 }}>({c.items.length})</span></span>
                <span style={{ color: 'var(--muted)' }}>{isOpen ? '▾' : '▸'}</span>
              </button>
              {isOpen && (
                <div style={{ padding: '6px 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {c.items.map((i) => (
                    <div key={i.t}
                      onClick={() => copyText(i.t)}
                      onContextMenu={(e) => { e.preventDefault(); saveSnippet(i.t + ' — ' + i.d, '호러 어휘 사전 · ' + c.label, c.key) }}
                      title="클릭 복사 · 우클릭 스니펫 저장"
                      style={{ cursor: 'pointer', padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--chrome-2, transparent)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{i.t}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>{i.d}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {mode === 'browse' && filtered.length === 0 && (
          <div style={{ color: 'var(--muted)', padding: 16, textAlign: 'center' }}>“{q}” 결과가 없습니다.</div>
        )}

        {mode === 'random' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {rand.map((r, i) => (
              <span key={i} className="wd-chip"
                onClick={() => copyText(r.t)}
                onContextMenu={(e) => { e.preventDefault(); saveSnippet(r.t + ' — ' + r.d, '호러 어휘 사전 · ' + r.cat, 'random') }}
                title={r.cat + ' · ' + r.d + ' · 클릭 복사 · 우클릭 저장'}>
                <Emoji e={r.icon}/> {r.t}
              </span>
            ))}
          </div>
        )}

        {mode === 'gen' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ padding: '14px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--panel)', fontSize: 15, lineHeight: 1.7, fontWeight: 600 }}>
              {genLine}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SLOTS.map((sl, i) => (
                <button key={sl.key} className={'minibtn' + (locks[i] ? ' active' : '')}
                  onClick={() => toggleLock(i)}
                  title={locks[i] ? '잠금 해제(재생성 시 바뀜)' : '잠금(재생성해도 고정)'}>
                  {locks[i] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>} {sl.label}: {sl.pool[idx[i]].length > 10 ? sl.pool[idx[i]].slice(0, 9) + '…' : sl.pool[idx[i]]}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              슬롯을 잠그고 나머지만 재생성하세요 · 조합 가능 수 <b>{COMBOS.toLocaleString()}</b>가지
            </div>
          </div>
        )}
      </div>

      {/* 하단 액션 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {mode === 'random' && <button className="btn-primary" onClick={() => setRand(sampleRandomMemo())}><Emoji e="🎲"/> 다시 섞기</button>}
        {mode === 'gen' && <button className="btn-primary" onClick={roll}><Emoji e="🎲"/> 재생성</button>}
        {mode === 'gen' && <button className="minibtn" onClick={() => copyText(genLine)}><Emoji e="📋"/> 한 줄 복사</button>}
        {mode === 'gen' && <button className="minibtn" onClick={() => saveSnippet(genLine, '호러 어휘 사전 · 공포 한 줄', 'gen')}><Emoji e="💾"/> 스니펫 저장</button>}
        <button className="minibtn" onClick={() => openToolLinked('symbolism-dict', genreHint ? { genre: genreHint } : undefined)}><Emoji e="🔮"/> 상징 사전</button>
        <button className="minibtn" onClick={() => openToolLinked('sensory-palette', genreHint ? { genre: genreHint } : undefined)}><Emoji e="🎨"/> 감각 팔레트</button>
        <button className="linkbtn" onClick={addCurrentToProject} disabled={projDisabled}
          title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : (projDisabled ? '추가할 표현이 없습니다' : '프로젝트 자료 〈호러 표현 모음〉에 추가')}>
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
        {toast || '클릭=복사 · 우클릭=스니펫 저장 · 모든 데이터는 로컬에 저장됩니다.'}
      </div>
    </div>
  )
}

// 무작위 표본(중복 없이 n개)
function sampleRandom(n: number) {
  const out: typeof ALL = []
  const used = new Set<number>()
  let guard = 0
  while (out.length < n && guard++ < n * 30 && used.size < ALL.length) {
    const i = Math.floor(Math.random() * ALL.length)
    if (used.has(i)) continue
    used.add(i); out.push(ALL[i])
  }
  return out
}
