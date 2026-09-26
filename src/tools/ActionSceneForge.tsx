// 액션·전쟁 장면 생성기(ActionSceneForge) — 액션·전쟁 장르 특화 '장면' 생성 도구.
//   도시에의 서사 장치(세트피스·시계장치·수적 열세·능력 격차 사다리·체호프의 환경·부상 시계·
//   희생적 후위·명령의 시점 교차·시그니처 무브·거짓 안전지대·마지막 한 발 등)를 '전개 의도(beat)'로 슬롯화하고,
//   무대(전장 지리) × 시각·기상 × 시점 인물(개인 무력 ↔ 집단 지휘) × 전개 의도 × 적·위협 ×
//   이해관계(잃을 것) × 충돌·합병증 × 전환·결정타 × 시계장치(시간제한)
//   단일 슬롯에 '동작·교전 디테일' 다중 슬롯(2개) + '감각 디테일' 다중 슬롯(2개)을 곱해 한 '장면 글감'을 만든다.
//   마음에 드는 칸은 🔒로 잠그고 나머지만 🎲 재생성. 조합수 1조 이상(핵심 생성기 지향).
// 자급식: react 와 './linkbus' 만 import. 외부 API·네트워크 없음(전부 로컬 자작 데이터).
//   Math.random + localStorage('sry:tool:action-sceneforge') 만 사용. 언마운트 정리.
// 연계: 공유 스니펫 라이브러리(addToLibrary('snippets')) + 장소 라이브러리(addToLibrary('places'))
//   + 프로젝트 원고(addToProject kind:text, root:draft, folder:'장면') + 관련 도구 열기(openToolLinked). payload.genre 맥락 배지.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'action-sceneforge',
  name: '액션·전쟁 장면 생성기(1조+ 조합)',
  icon: '💥',
  group: '생성기',
  genre: '액션·전쟁',
  intro: '전장 지리·시점·전개 의도·위협·이해관계·결정타·시계장치·교전 합을 조합해 액션·전쟁 장면 글감을 1조+ 가지로 만드세요',
  w: 600,
  h: 720,
}

const LS_KEY = 'sry:tool:action-sceneforge'

// ── 슬롯 풀(전부 자작·액션/전쟁 특화·구체적, 도시에 근거) ──────────────────
// 단일 슬롯: place / weather / pov / beat / foe / stakes / obstacle / turn / clock
// 다중 슬롯: combat(동작·교전 디테일 2개), sensory(감각 디테일 2개) — 조합수를 1조 이상으로 키운다.

// 무대(전장 지리) — '머릿속 지도가 그려지는' 명료한 공간(밀폐·고지·시가·해상·공중·참호 등)
const PLACES = [
  '엘리베이터가 멈춘 32층 마천루, 깨진 통유리 너머로 도시가 발밑에 펼쳐진 곳',
  '폭파 장치가 설치된 4차선 현수교 한복판, 양끝에서 차량이 조여 오는 위',
  '폐쇄된 공항 활주로, 줄지어 선 격납고와 멈춰 선 여객기 사이',
  '무너진 시가지의 십자로, 사방 건물 창문마다 저격 사선이 걸린 킬존',
  '능선을 따라 참호가 파인 무명 고지(高地), 철조망과 지뢰밭이 비탈을 덮은 자리',
  '안개가 깔린 해안 상륙 지점, 방벽과 토치카가 백사장을 굽어보는 새벽 바다',
  '지하 3층 주차장, 콘크리트 기둥이 엄폐물이자 사각을 만드는 미로',
  '열차가 시속 100km로 달리는 객차 지붕과 객차 사이 연결부',
  '함교가 피탄된 구축함 갑판, 기울어진 철판 위로 파도가 넘치는 침몰 직전',
  '교전이 한창인 시가전 골목, 무너진 담벼락이 양측의 엄폐선을 이룬 곳',
  '협곡 사이로 난 외길, 매복하기 좋은 절벽과 도주로가 막힌 병목',
  '버려진 제철소 용광로 통로, 녹슨 크레인과 쇳물 레일이 머리 위로 걸린 곳',
  '봉쇄된 국경 검문소, 차단봉과 토치카·서치라이트가 도주를 가로막는 야간',
  '폭설이 길을 끊은 산악 초소, 보급도 증원도 끊긴 고립된 벙커',
  '적 점령지 한복판의 안전가옥, 창밖으로 순찰대가 지나가는 잠입 거점',
  '화염에 휩싸인 유조선 갑판, 갈라진 파이프에서 불길이 치솟는 해상 플랫폼',
  '시민이 흩어진 도심 광장, 분수대와 차량이 임시 바리케이드가 된 한복판',
  '저공으로 강하한 수송기 화물칸, 램프가 열리고 강하 등이 켜진 직전',
  '포격으로 패인 무인지대(No Man\'s Land), 철조망과 시체 사이를 기어가는 진창',
  '적의 사령부로 통하는 환기 덕트와 배선실, 경보가 울리기 직전의 좁은 통로',
  '강 한가운데 모래톱, 양안의 화력이 교차하는 도하(渡河) 지점',
  '항만 컨테이너 야적장, 색색의 컨테이너가 미로 같은 엄폐선을 이룬 부두',
  '지하철 승강장과 선로, 다음 열차의 헤드라이트가 터널 끝에 밝혀진 순간',
  '사막 한복판의 보급 차량 행렬, 모래폭풍이 시야를 지운 호송 작전 중',
  '무장 헬기가 선회하는 옥상 헬리패드, 로터 바람에 옷자락이 찢기는 탈출 지점',
  '농성 중인 경찰서 로비, 깨진 유리문 너머로 적이 진입하려는 최후의 방어선',
]

// 시각·기상 — 페이싱·시야·시계장치에 영향을 주는 시각/날씨/조도
const WEATHERS = [
  '동이 트기 직전, 푸르스름한 박명이 윤곽만 드러내는 시각',
  '한낮의 폭염, 아지랑이가 조준선을 흔드는 메마른 정오',
  '땅거미가 깔려 적아 식별이 흐려지는 박명 무렵',
  '폭우가 총성을 삼키고 시야를 지우는 한밤',
  '함박눈이 발소리를 묻고 발자국을 남기는 한겨울 새벽',
  '짙은 해무가 십 보 앞을 가리는 잿빛 새벽 바다',
  '모래폭풍이 시야와 통신을 동시에 끊은 사막의 한낮',
  '서리가 총열을 얼리는 살을 에는 이른 아침',
  '검은 연기가 하늘을 덮어 한낮에도 어스름한 화재 현장',
  '천둥 번개가 섬광처럼 사물을 비추는 폭풍의 자정',
  '달도 없는 그믐의 칠흑, 야시경(暗視鏡)만이 길을 여는 밤',
  '진눈깨비가 손끝을 곱게 만드는 고갯마루의 저물녘',
  '노을이 핏빛으로 타올라 그림자가 길게 늘어진 황혼',
  '안개비가 추적추적 내려 화약 연기와 뒤엉키는 흐린 오후',
  '열대야의 후텁지근한 정적, 매미 소리마저 끊긴 한밤',
  '강 위로 물안개가 자욱이 피어오르는 도하 직전의 새벽',
  '삭풍이 능선을 할퀴어 입김마저 얼어붙는 설산의 밤',
  '폭염이 가라앉고 별이 쏟아지는, 교전과 교전 사이의 청명한 한밤',
]

// 시점 인물 — 개인 무력 ↔ 집단 지휘의 양축(낭인·요원·병사·지휘관·민간인·후위 등)
const POVS = [
  '탄약과 체력이 바닥나 한 발 한 발을 아끼는 고독한 1인 생존자',
  '동료를 모두 잃고 마지막 진지를 홀로 사수하는 분대원',
  '작전 시한에 쫓기며 적진 깊숙이 잠입한 단독 요원',
  '부하들의 목숨을 저울질하며 명령을 내려야 하는 현장 지휘관',
  '후방 지휘부의 결정과 전선의 현실 사이에 낀 일선 소대장',
  '무력은 없으나 전장 한복판에 휩쓸린 민간인·종군기자',
  '한 수에 승부를 보는, 시그니처 기술을 지닌 노련한 격투가',
  '부상으로 한쪽 팔을 쓰지 못한 채 싸우는 베테랑 저격수',
  '증원을 끌고 와야 하는, 전령(傳令)으로 사선을 가로지르는 병사',
  '동료를 보내기 위해 길목을 막기로 한 희생적 후위(後衛)',
  '적보다 명백히 약하지만 지형과 머리로 격차를 메우는 신참',
  '전향한 적, 옛 전우에게 총구를 겨눠야 하는 이중의 위치',
  '인질이 된 가족을 곁에 둔 채 적의 명령을 따르는 척하는 협상가',
  '폭발물 해체 시한과 싸우는, 손끝의 떨림이 곧 죽음인 공병',
  '드론·관제 화면 너머로 부대를 지휘하는 원격 관제관',
  '적진에서 빠져나가야 하는, 기밀을 머릿속에 담은 도주자',
  '명령을 어기고 동료를 구하러 돌아온 항명(抗命)의 군인',
  '전장에 처음 선, 첫 교전의 공포에 굳어버린 신병',
  '전선 전체의 분기점이 자신의 한 수에 걸린 특수전 대원',
  '무너진 방어선의 마지막 거점을 지휘하는, 물러설 곳 없는 대장',
]

// 전개 의도(beat) — '이 장면이 무엇을 하는가'(도시에의 서사 장치·전개 패턴을 의도화)
const BEATS = [
  { tag: '세트피스', text: '고유한 장소·제약·목표·합병증을 갖춘 대형 액션 단위가 펼쳐지는' },
  { tag: '시계장치', text: '폭탄 타이머·증원 도착·처형 시한이 카운트다운을 조여 오는' },
  { tag: '수적열세', text: '1 대 다수, 물러설 곳 없는 알라모식 최후의 저항을 벌이는' },
  { tag: '격차역전', text: '명백히 약한 처지에서 약점·도구·지형을 찾아 강적을 역전하는' },
  { tag: '환경회수', text: '1막에 보였던 환경 요소(가스 밸브·샹들리에·강물)를 무기로 회수하는' },
  { tag: '준비몽타주', text: '무장 점검·작전 브리핑으로 규칙과 능력을 사전 공개하며 긴장을 적재하는' },
  { tag: '거짓안전', text: '안전해 보이는 휴식 직후, 거짓 안전지대가 기습으로 무너지는' },
  { tag: '마지막한발', text: '탄약·체력·자원이 고갈된 직전, 마지막 한 수로 판을 뒤집는' },
  { tag: '희생후위', text: '동료가 길목을 막고 남아 주인공을 살려 보내는 결단을 내리는' },
  { tag: '시점교차', text: '지휘부의 전략과 현장 병사의 생존을 교차해 결정의 비용을 보여주는' },
  { tag: '시그니처', text: '인물의 정체성을 압축한 반복 기술을 클라이맥스에서 변주·해방하는' },
  { tag: '추격', text: '엄폐와 도주로를 계산하며 쫓고 쫓기는 숨 막히는 추격이 이어지는' },
  { tag: '잠입', text: '경보가 울리기 직전, 적진 한복판을 들키지 않고 통과하는' },
  { tag: '구출', text: '인질·부상자를 적진 깊숙이 들어가 시한 안에 빼내오는' },
  { tag: '농성', text: '증원이 올 때까지 거점을 사수하며 파상공세를 막아내는' },
  { tag: '돌파', text: '제압 사격과 엄호 속에 포위망의 한 점을 뚫고 활로를 여는' },
  { tag: '기만', text: '거짓 무전·양동작전·위장으로 적의 판단을 흐려 승기를 잡는' },
  { tag: '부상시계', text: '출혈·골절이 시간제한이 되어, 쓰러지기 전에 임무를 끝내야 하는' },
  { tag: '배신폭로', text: '진짜 적이 외부가 아니라 아군 지휘부·체제였음이 드러나는' },
  { tag: '대가정산', text: '전투가 끝난 직후, 전사자를 호명하고 잃은 것을 헤아리는 여파(餘波)의' },
  { tag: '첫교전', text: '순진함이 환멸로 바뀌는, 전장의 첫 세례를 치르는' },
  { tag: '최저점', text: '무장 해제·부상·아군 전멸로 패배 직전에 몰린, 의지만 남은' },
]

// 적·위협 — 개인 빌런부터 집단·체제·환경까지(능력 격차의 '윗 단계')
const FOES = [
  '주인공보다 한 수 위의, 같은 기술을 더 능숙하게 쓰는 거울상(鏡像) 적수',
  '얼굴 없는 다수 — 끝없이 밀려오는 무장 병력의 파상공세',
  '냉정하게 사선을 계산하는, 위치를 들키지 않는 적 저격수',
  '두꺼운 장갑과 화력으로 정면을 봉쇄하는 중장갑 적(기갑·중화기)',
  '시한 안에 터지는 폭발물, 협상도 통하지 않는 무정한 기계 같은 위협',
  '아군 속에 숨어 정보를 흘리는 내부의 배신자·이중 첩자',
  '지형과 기상 그 자체 — 무너지는 다리, 차오르는 물, 번지는 불길',
  '냉혹한 명령으로 부하를 소모품처럼 쓰는 적 지휘관',
  '소리 없이 다가와 한 명씩 제거하는 정예 침투조(沈透組)',
  '인질을 방패 삼아 주인공의 손발을 묶는 비열한 협박자',
  '한때 전우였으나 적으로 돌아선, 약점을 훤히 아는 옛 동료',
  '제압 사격으로 머리를 들지 못하게 만드는, 화망(火網)을 친 분대',
  '드론·감시망으로 도주로를 하나씩 지워 가는 보이지 않는 관제',
  '광기에 사로잡혀 동귀어진을 노리는, 잃을 것이 없는 광신적 적',
  '협상 테이블 뒤에서 작전을 조종하는, 정작 전장엔 없는 흑막',
  '독가스·화재·붕괴 — 시간이 갈수록 좁혀 오는 환경적 데드라인',
  '겉은 아군, 속은 적인 위장한 우군 부대',
  '주인공의 시그니처 기술을 이미 파훼당해 통하지 않게 만든 노련한 강적',
]

// 이해관계(잃을 것) — 싸움 전에 설치되는 stakes(목숨·동료·시간·도덕·임무·정체)
const STAKES = [
  '한 발만 더 늦으면 인질로 잡힌 동료가 처형된다',
  '이 거점이 뚫리면 후방의 피란민 행렬이 그대로 노출된다',
  '시한 안에 폭발물을 막지 못하면 다리와 함께 모두가 가라앉는다',
  '여기서 정체가 들통나면 그동안의 잠입이 전부 물거품이 된다',
  '이 작전이 실패하면 전선 전체가 무너지는 분기점이다',
  '한 명을 구하려면 다른 한 명을 포기해야 하는 선택이 코앞이다',
  '증원이 도착하기 전까지 단 몇 분을 더 버텨야 한다',
  '머릿속의 기밀이 적의 손에 들어가면 수많은 동료가 죽는다',
  '명령을 따르면 양민이, 어기면 부대가 죽는 도덕적 외통수에 몰렸다',
  '여기서 물러서면 다시는 가족에게 돌아갈 길이 끊긴다',
  '마지막 탄창·마지막 진통제가 떨어지는 순간 모든 것이 끝난다',
  '주인공이 무너지면 그를 믿고 따라온 신참들이 함께 스러진다',
  '이 한 수가 빗나가면 적이 거꾸로 아군의 위치를 모두 알게 된다',
  '구해야 할 사람이, 하필 베어야 할 적의 곁에 서 있다',
  '신의를 지키자니 목숨을, 살자니 신념을 버려야 한다',
  '여기서 들키면 동시에 진입한 다른 조가 전멸한다',
  '이 다리를 끊으면 적의 진격은 멈추지만 아군 정찰조도 갇힌다',
  '실패하면 작전의 책임이 무고한 부하에게 뒤집어씌워진다',
]

// 충돌·합병증 — 전투를 꼬이게 하는 변수(자원·부상·규칙·정보·지형)
const OBSTACLES = [
  '탄약이 한 탄창도 채 남지 않아 한 발 한 발을 셈해야 한다',
  '부상으로 한쪽 다리를 끌어 엄폐물 사이를 옮기기조차 버겁다',
  '무전이 두절되어 증원도 후퇴 명령도 닿지 않는다',
  '적이 이쪽의 패턴을 읽어 같은 수가 두 번 통하지 않는다',
  '시야가 연막·어둠에 막혀 적아(敵我)를 구분하기 어렵다',
  '도주로가 단 하나뿐인데 그곳에 적의 화망이 걸려 있다',
  '시간이 없어 부상을 응급처치할 틈조차 나지 않는다',
  '엄폐물이 빈약해 머리를 드는 순간 사선에 노출된다',
  '동료가 다쳐 혼자만 빠져나갈 수가 없게 됐다',
  '규칙(교전수칙·인질의 존재)이 결정적 한 방을 묶어 둔다',
  '폭발·붕괴로 지형이 시시각각 바뀌어 계획이 무너진다',
  '수적으로 절대 열세라 정면으로는 승산이 전무하다',
  '주무기가 고장 나 보조 수단으로 버텨야 한다',
  '적이 시그니처 기술을 간파해 평소의 결정타가 막혔다',
  '체력·집중이 한계라 손끝과 시야가 떨리기 시작한다',
  '아군의 오인 사격·잘못된 정보가 위치를 노출시켰다',
  '시계는 흐르는데 임무 목표와 생존이 정반대 방향을 가리킨다',
  '한 수만 잘못 두면 인질·민간인이 휩쓸린다',
]

// 전환·결정타(절정·반전·복선 폭발) — 마지막 한 수, 약점 회수, 시계의 정지
const TURNS = [
  '00:01에서 멎은 타이머, 마지막 선을 끊자 카운트다운이 정지한다',
  '1막에 봐 둔 가스 밸브를 열어젖히자 적의 진형이 불길에 휩싸인다',
  '죽은 줄 알았던 동료가 굉음과 함께 측면을 때려 포위를 깨뜨린다',
  '단 한 발 남은 탄을 호흡을 멈추고 적의 급소에 꽂아 넣는다',
  '간파당했던 시그니처 기술을 미끼로 흘려 진짜 한 수를 숨긴다',
  '무너지던 다리가 적의 추격조와 함께 강 아래로 떨어진다',
  '거짓 무전에 속은 적 증원이 엉뚱한 방향으로 빠져나간다',
  '엄폐물 뒤에서 마지막 수류탄의 안전핀을 이로 뽑아 던진다',
  '적의 화망에 틈이 생기는 단 3초, 그 순간 활로로 몸을 던진다',
  '쓰러지기 직전, 출혈로 흐려지는 의식 속에서 마지막 명령을 내린다',
  '아군 지휘부가 진짜 흑막이었다는 무전이 끊긴 채널에서 흘러나온다',
  '희생을 자청한 후위가 마지막으로 손을 들어 보이며 통로를 무너뜨린다',
  '적 저격수의 사선을 역으로 읽어, 반사된 빛 한 점으로 위치를 잡는다',
  '인질의 결박이 풀린 찰나, 둘의 호흡이 맞아 동시에 적을 제압한다',
  '증원의 엔진 소리가 능선 너머에서 들려오며 전세가 단숨에 기운다',
  '주무기를 버리고 맨손으로 파고들어 적의 무기를 비틀어 빼앗는다',
  '거울상 적수의 단 하나의 버릇을 읽어 내고, 반 박자 먼저 움직인다',
  '폭우가 적의 발자국을 지우는 대신, 이쪽의 매복 흔적도 함께 씻어 준다',
  '최후의 거점에서 마지막 탄약을 나눠 쥔 분대가 동시에 일어선다',
  '빗나간 한 수 대신, 적이 스스로 무기를 내리고 항복의 손을 든다',
]

// 시계장치(시간제한) — 액션 긴장의 증폭기(타이머·증원·만조·일출 등)
const CLOCKS = [
  '폭발물 타이머가 4분 12초에서 거꾸로 흐른다',
  '적 증원 차량이 능선을 넘어오기까지 채 3분이 남지 않았다',
  '만조가 차올라 퇴로가 30분이면 물에 잠긴다',
  '일출까지 어둠의 엄폐가 남은 시간은 단 한 시간',
  '인질 처형 시한이 무전기 너머로 째깍째깍 줄어든다',
  '연료가 바닥나기 전 활주로 끝에 닿아야 한다',
  '출혈을 멈추지 못하면 의식이 몇 분 안에 끊긴다',
  '독가스가 환기구를 타고 거점 전체로 퍼지는 중이다',
  '다음 열차가 터널 끝에서 헤드라이트를 밝히기까지 몇 초뿐이다',
  '무너지는 건물의 균열이 천장을 따라 빠르게 번져 간다',
  '구조 헬기의 연료가 호버링을 버틸 수 있는 시간은 한정돼 있다',
  '적의 포격 좌표가 잡히기까지 노출된 채로 버틸 시간이 줄어든다',
  '교량 폭파 명령이 내려진 시각이 코앞으로 다가왔다',
  '통신 재밍이 풀리기 전에 좌표를 전송해야 한다',
  '불길이 유조탱크에 닿기까지 번지는 속도가 빨라진다',
  '교대 순찰이 이 구역을 다시 돌기까지의 짧은 공백뿐이다',
  '항만 갑문이 닫히면 배는 영영 빠져나가지 못한다',
  '백병전이 시작되면 더는 시간을 셀 여유조차 없다',
]

// 동작·교전 디테일(다중 슬롯) — 동사 중심·비트 단위의 구체적 교전 묘사(원리·약점 곁들임)
const COMBATS = [
  '엄폐물 사이를 낮은 자세로 미끄러져 다음 기둥 뒤로 파고든다',
  '제압 사격으로 적의 머리를 숙이게 한 사이 측면으로 우회한다',
  '한 호흡을 멈추고 반동을 죽인 채 점사(點射)로 두 발을 쏜다',
  '탄창을 갈아 끼우는 짧은 틈, 보조 권총을 뽑아 빈자리를 메운다',
  '근접 거리에서 총열을 비틀어 적의 사선을 빗나가게 하고 무릎을 친다',
  '수류탄을 굴려 보낸 뒤 폭압이 가시기 전 그 연기를 엄폐로 삼아 전진한다',
  '난간을 박차고 한 층 아래로 떨어지며 낙법으로 충격을 흘린다',
  '적의 팔을 꺾어 잡은 무기를 그대로 빼앗아 등 뒤의 다음 적을 겨눈다',
  '연막을 터뜨려 시야를 끊고, 그 안에서 발소리만으로 적의 위치를 읽는다',
  '저격경의 십자선을 호흡 사이의 정지점에 멈춰 두고 격발한다',
  '백병전으로 파고들어 개머리판으로 턱을 올려치고 대검으로 마무리한다',
  '엄호 사격을 받으며 부상자를 끌어 안전선까지 질질 끌고 나온다',
  '폭발의 충격파에 몸을 던져 그 힘으로 사각으로 굴러 들어간다',
  '적의 화망이 재장전으로 끊기는 반 박자를 노려 일제히 돌격한다',
  '벽을 끼고 모서리를 슬라이스(slice the pie)하며 방을 한 칸씩 청소한다',
  '도주 차량의 핸들을 꺾어 드리프트로 추격조의 사선을 흐트러뜨린다',
  '지형의 고저를 이용해 위에서 아래로 사선을 잡아 화력 우위를 만든다',
  '폭약을 문틀에 부착하고 폭파(breach) 직후의 혼란을 틈타 진입한다',
  '단검을 역수로 쥐고 적의 손목 안쪽 동맥을 노려 무기를 떨어뜨린다',
  '쓰러진 적의 무기를 발끝으로 차 멀리 보내며 다음 목표로 총구를 옮긴다',
  '능선 너머로 박격포의 곡사 좌표를 불러 적 진지 한복판에 떨어뜨린다',
  '맨손으로 적의 멱살을 잡아 자신의 몸을 회전축 삼아 바닥에 내리꽂는다',
  '엄폐물이 부서지기 직전, 그 잔해째로 적을 향해 밀어붙이며 전진한다',
  '한 발도 헛되이 쓰지 않으려 표적을 호흡으로 세며 차례로 무력화한다',
]

// 감각 디테일(다중 슬롯) — 핍진성을 위한 오감(소리·냄새·신체감각·시간왜곡)
const SENSORIES = [
  '귀를 찢는 총성과 그 뒤에 남는 먹먹한 이명',
  '코를 찌르는 화약 냄새와 그을린 금속의 매캐함',
  '입안에 도는 비릿한 쇠와 피의 맛',
  '방아쇠를 쥔 손바닥에 배어드는 미끈한 식은땀',
  '심장이 갈비뼈를 두드리는 듯한 미친 박동 소리',
  '아드레날린에 시야가 좁아져 표적 외에는 흐려지는 터널 시야',
  '폐가 타들어가는 듯한 숨 가쁨과 들끓는 호흡',
  '발밑에 밟히는 깨진 유리와 탄피의 짤그랑거림',
  '목덜미를 스치고 지나간 탄환의 서늘한 바람',
  '진동이 손목까지 타고 오르는 묵직한 반동',
  '슬로모션처럼 늘어지는, 찰나가 영겁이 되는 시간 왜곡',
  '흙먼지와 콘크리트 가루가 입안과 눈에 들러붙는 까끌거림',
  '상처에서 번지는 둔탁한 통증과 점점 무거워지는 팔다리',
  '먼 곳에서 다가오는 헬기 로터의 두근거리는 저음',
  '비에 젖은 군복이 살갗에 차갑게 들러붙는 감각',
  '피와 빗물이 뒤섞여 발밑을 미끄럽게 만드는 끈적임',
  '귓가에 끊겼다 이어지는 무전의 잡음과 지직거림',
  '연막 너머로 흐릿하게 번지는 적의 그림자',
  '추위에 감각을 잃어 방아쇠가 제대로 당겨지는지조차 모를 손끝',
  '폭발 직후 찾아오는, 모든 소리가 사라진 한순간의 정적',
  '땀과 흙이 섞여 눈으로 흘러들어 따가운 시야',
  '재장전 손놀림에 닿는 차갑고 매끄러운 탄창의 금속결',
  '멀리서 끊겼다 이어지는 누군가의 비명과 신음',
  '입김이 허옇게 어는 설산의, 총열마저 얼리는 한기',
]

// 다중 슬롯에서 한 번에 뽑을 개수
const COMBAT_COUNT = 2
const SENSORY_COUNT = 2

// ── 유틸 ──────────────────────────────────────────────────────────────
const rid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// n개를 중복 없이 뽑는다.
function pickN<T>(arr: T[], n: number): T[] {
  const pool = arr.slice()
  const out: T[] = []
  for (let i = 0; i < n && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    out.push(pool[idx])
    pool.splice(idx, 1)
  }
  return out
}

// nCk 조합수(순서 무관)
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  return Math.round(r)
}

// 전체 조합수: 단일 슬롯 곱 × (교전 디테일 2개 조합) × (감각 디테일 2개 조합)
function totalCombos(): number {
  const combatCombos = choose(COMBATS.length, COMBAT_COUNT)
  const sensoryCombos = choose(SENSORIES.length, SENSORY_COUNT)
  return (
    PLACES.length * WEATHERS.length * POVS.length * BEATS.length *
    FOES.length * STAKES.length * OBSTACLES.length * TURNS.length * CLOCKS.length *
    combatCombos * sensoryCombos
  )
}

// ── 슬롯 모델 ──────────────────────────────────────────────────────────
type SlotKey = 'place' | 'weather' | 'pov' | 'beat' | 'foe' | 'stakes' | 'obstacle' | 'turn' | 'clock' | 'combat' | 'sensory'
interface SlotDef { key: SlotKey; label: string; icon: string }
const SLOTS: SlotDef[] = [
  { key: 'place', label: '전장 지리(무대)', icon: '🗺️' },
  { key: 'weather', label: '시각·기상', icon: '🌫️' },
  { key: 'pov', label: '시점 인물', icon: '🎯' },
  { key: 'beat', label: '전개 의도', icon: '🎬' },
  { key: 'foe', label: '적·위협', icon: '☠️' },
  { key: 'stakes', label: '이해관계(잃을 것)', icon: '⚖️' },
  { key: 'obstacle', label: '충돌·합병증', icon: '⛓️' },
  { key: 'turn', label: '전환·결정타', icon: '⚡' },
  { key: 'clock', label: '시계장치(시간제한)', icon: '⏱️' },
  { key: 'combat', label: '동작·교전 디테일(2)', icon: '🥷' },
  { key: 'sensory', label: '감각 디테일(2)', icon: '👂' },
]

interface Beat { tag: string; text: string }
interface Scene {
  place: string
  weather: string
  pov: string
  beat: Beat
  foe: string
  stakes: string
  obstacle: string
  turn: string
  clock: string
  combat: string[]
  sensory: string[]
}

function buildScene(): Scene {
  return {
    place: pick(PLACES),
    weather: pick(WEATHERS),
    pov: pick(POVS),
    beat: pick(BEATS),
    foe: pick(FOES),
    stakes: pick(STAKES),
    obstacle: pick(OBSTACLES),
    turn: pick(TURNS),
    clock: pick(CLOCKS),
    combat: pickN(COMBATS, COMBAT_COUNT),
    sensory: pickN(SENSORIES, SENSORY_COUNT),
  }
}

// 장면 글감 한 단락으로 엮기(액션 전개 패턴: 무대·시각 → 인물·의도 → 적·이해관계 → 합병증 → 시계 → 교전 합 → 결정타 → 감각)
function compose(s: Scene): string {
  const combatText = s.combat.join(' 이어서 ')
  const sensoryText = s.sensory.map((d) => `‘${d}’`).join(', ')
  return (
    `${s.place}. ${s.weather}. ` +
    `${s.pov}이(가) ${s.beat.text} 장면. ` +
    `맞은편에는 ${s.foe}이(가) 버티고, ${s.stakes}. ` +
    `그러나 ${s.obstacle}. — ${s.clock}. ` +
    `${combatText}. ` +
    `그 순간 — ${s.turn}. ` +
    `(감각: ${sensoryText})`
  )
}

// 짧은 제목용
function titleOf(s: Scene): string {
  return `[${s.beat.tag}] ${s.pov.slice(0, 12)}… · ${s.place.slice(0, 14)}…`
}

// ── 영속 ──────────────────────────────────────────────────────────────
interface SavedScene { id: string; scene: Scene; note: string }
interface Persist { scene: Scene | null; locks: Partial<Record<SlotKey, boolean>>; saved: SavedScene[] }

function isBeat(x: any): x is Beat {
  return x && typeof x.tag === 'string' && typeof x.text === 'string'
}
function isScene(x: any): x is Scene {
  return x && typeof x.place === 'string' && typeof x.weather === 'string' &&
    typeof x.pov === 'string' && isBeat(x.beat) && typeof x.foe === 'string' &&
    typeof x.stakes === 'string' && typeof x.obstacle === 'string' &&
    typeof x.turn === 'string' && typeof x.clock === 'string' &&
    Array.isArray(x.combat) && Array.isArray(x.sensory)
}

function load(): Persist {
  const fallback: Persist = { scene: null, locks: {}, saved: [] }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback
    const p = JSON.parse(raw)
    const scene = isScene(p?.scene) ? p.scene : null
    const locks: Partial<Record<SlotKey, boolean>> = {}
    if (p?.locks && typeof p.locks === 'object') {
      SLOTS.forEach((sl) => { if (p.locks[sl.key]) locks[sl.key] = true })
    }
    const saved: SavedScene[] = Array.isArray(p?.saved)
      ? p.saved
          .filter((x: any) => x && isScene(x.scene))
          .map((x: any) => ({ id: typeof x.id === 'string' ? x.id : rid(), scene: x.scene, note: typeof x.note === 'string' ? x.note : '' }))
      : []
    return { scene, locks, saved }
  } catch {
    return fallback
  }
}

export default function ActionSceneForge({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<Persist>(load())
  const [scene, setScene] = useState<Scene | null>(initial.current.scene)
  const [locks, setLocks] = useState<Partial<Record<SlotKey, boolean>>>(initial.current.locks)
  const [saved, setSaved] = useState<SavedScene[]>(initial.current.saved)
  const [copied, setCopied] = useState(false)
  const [editId, setEditId] = useState('')
  const [editText, setEditText] = useState('')
  const [toast, setToast] = useState('')
  const [rolling, setRolling] = useState(false)

  const alive = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 영속 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ scene, locks, saved } as Persist)) } catch { /* 용량 초과 등 무시 */ }
  }, [scene, locks, saved])

  // 언마운트 정리
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (rollTimer.current) clearTimeout(rollTimer.current)
    }
  }, [])

  const flashToast = (msg: string) => {
    if (!alive.current) return
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => alive.current && setToast(''), 2200)
  }

  // 생성: 잠긴 슬롯은 유지, 나머지만 새로 뽑는다.
  const generate = useCallback(() => {
    setCopied(false)
    setScene((prev) => {
      const fresh = buildScene()
      if (!prev) return fresh
      const next: Scene = { ...fresh }
      if (locks.place) next.place = prev.place
      if (locks.weather) next.weather = prev.weather
      if (locks.pov) next.pov = prev.pov
      if (locks.beat) next.beat = prev.beat
      if (locks.foe) next.foe = prev.foe
      if (locks.stakes) next.stakes = prev.stakes
      if (locks.obstacle) next.obstacle = prev.obstacle
      if (locks.turn) next.turn = prev.turn
      if (locks.clock) next.clock = prev.clock
      if (locks.combat) next.combat = prev.combat
      if (locks.sensory) next.sensory = prev.sensory
      return next
    })
    setRolling(true)
    if (rollTimer.current) clearTimeout(rollTimer.current)
    rollTimer.current = setTimeout(() => alive.current && setRolling(false), 320)
  }, [locks])

  // 최초 진입 시 1회 생성
  useEffect(() => {
    if (!scene) generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleLock = (k: SlotKey) => setLocks((prev) => ({ ...prev, [k]: !prev[k] }))

  const fullText = scene ? compose(scene) : ''
  const lockedCount = SLOTS.filter((sl) => locks[sl.key]).length
  const combos = totalCombos()

  const copyText = () => {
    if (!scene || !navigator.clipboard) { if (!navigator.clipboard) flashToast('이 환경에서는 복사를 지원하지 않습니다.'); return }
    navigator.clipboard.writeText(fullText).then(() => {
      if (!alive.current) return
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => alive.current && setCopied(false), 1500)
    }).catch(() => flashToast('복사에 실패했습니다.'))
  }

  // 즐겨찾기 저장
  const saveScene = () => {
    if (!scene) return
    setSaved((prev) => [{ id: rid(), scene, note: '' }, ...prev])
    flashToast('장면을 즐겨찾기에 저장했어요')
  }
  const removeSaved = (id: string) => {
    setSaved((prev) => prev.filter((s) => s.id !== id))
    if (editId === id) { setEditId(''); setEditText('') }
  }
  const startEdit = (s: SavedScene) => { setEditId(s.id); setEditText(s.note) }
  const commitEdit = () => {
    const t = editText.trim()
    setSaved((prev) => prev.map((s) => (s.id === editId ? { ...s, note: t } : s)))
    setEditId(''); setEditText('')
  }
  const loadSaved = (s: SavedScene) => { setScene(s.scene); setLocks({}); setCopied(false); flashToast('장면을 불러왔어요') }

  // ── 연계: 글감 스니펫 ──
  const toSnippet = (s: Scene) => {
    addToLibrary('snippets', {
      text: compose(s),
      source: '액션·전쟁 장면 생성기',
      tags: ['액션·전쟁', '장면', s.beat.tag],
    })
    flashToast('장면 글감을 스니펫으로 저장했어요')
  }

  // ── 연계: 공유 장소 라이브러리(이 장면의 무대를 장소로) ──
  const toLibPlace = (s: Scene) => {
    addToLibrary('places', {
      name: s.place,
      kind: '전장·액션 무대',
      mood: s.beat.tag,
      sensory: s.sensory.join(' / '),
      notes: compose(s),
      // 정규 키 매핑(받는 허브의 기본 칸에 제자리로 들어가게): 분위기→atmosphere, 종류→kind, 감각→sensory, 시각·기상→climate, 적·위협→dangers
      fields: {
        name: s.place,
        kind: '전장·액션 무대',
        atmosphere: s.beat.tag,
        sensory: s.sensory.join(' / '),
        climate: s.weather,
        dangers: s.foe,
        notes: compose(s),
      },
      source: '액션·전쟁 장면 생성기',
    })
    flashToast(`무대 ‘${s.place.slice(0, 16)}…’를 공유 장소 라이브러리에 추가했어요`)
  }

  // ── 연계: 프로젝트 원고(원고 › 장면 폴더) ──
  const linked = hasProjectBridge()
  const toProject = (s: Scene, note?: string) => {
    if (!linked) { flashToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = [
      `<p><b>🗺️ 전장 지리:</b> ${esc(s.place)}</p>`,
      `<p><b>🌫️ 시각·기상:</b> ${esc(s.weather)}</p>`,
      `<p><b>🎯 시점 인물:</b> ${esc(s.pov)}</p>`,
      `<p><b>🎬 전개 의도:</b> [${esc(s.beat.tag)}] ${esc(s.beat.text)} 장면</p>`,
      `<p><b>☠️ 적·위협:</b> ${esc(s.foe)}</p>`,
      `<p><b>⚖️ 이해관계:</b> ${esc(s.stakes)}</p>`,
      `<p><b>⛓️ 충돌·합병증:</b> ${esc(s.obstacle)}</p>`,
      `<p><b>⏱️ 시계장치:</b> ${esc(s.clock)}</p>`,
      `<p><b>🥷 동작·교전 합:</b></p><ul>${s.combat.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>`,
      `<p><b>⚡ 전환·결정타:</b> ${esc(s.turn)}</p>`,
      `<p><b>👂 감각 디테일:</b></p><ul>${s.sensory.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>`,
      note ? `<hr/><p><b>메모:</b> ${esc(note)}</p>` : '',
      `<hr/><p style="line-height:1.8;">${esc(compose(s))}</p>`,
    ].filter(Boolean).join('')
    const id = addToProject({
      kind: 'text',
      root: 'draft',
      folder: '장면',
      title: titleOf(s),
      bodyHtml,
      synopsis: compose(s),
      meta: { 전개의도: s.beat.tag, 무대: s.place, 시점인물: s.pov, 시계장치: s.clock, 출처: '액션·전쟁 장면 생성기' },
    })
    flashToast(id ? '프로젝트 원고(장면 폴더)에 장면을 추가했어요' : '프로젝트에 추가하지 못했습니다.')
  }

  // payload.genre 맥락 배지
  const ctxGenre = payload && typeof (payload as any).genre === 'string' ? String((payload as any).genre).trim() : ''

  // 관련 도구
  const RELATED: { id: string; icon: string; label: string }[] = [
    { id: 'chase-scene-gen', icon: '🏃', label: '추격·탈출 생성기' },
    { id: 'scene-list', icon: '📋', label: '장면 목록' },
    { id: 'setting-bible', icon: '🗺️', label: '배경 설정집' },
    { id: 'character-sheet', icon: '🪪', label: '인물 시트' },
    { id: 'plot-pyramid', icon: '🔺', label: '플롯 피라미드' },
    { id: 'sensory-palette', icon: '🎨', label: '감각 팔레트' },
  ]

  // 슬롯 값 표시(다중 슬롯은 배열)
  const slotIsMulti = (k: SlotKey) => k === 'combat' || k === 'sensory'
  const slotMultiArr = (k: SlotKey): string[] => {
    if (!scene) return []
    if (k === 'combat') return scene.combat
    if (k === 'sensory') return scene.sensory
    return []
  }
  const slotSingle = (k: SlotKey): string => {
    if (!scene) return ''
    if (k === 'beat') return `[${scene.beat.tag}] ${scene.beat.text} 장면`
    if (slotIsMulti(k)) return ''
    return (scene as any)[k] as string
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 12, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const introStyle: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 2 }
  const slotCard: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px' }
  const secTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
  const savedRow: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }
  const noteInput: React.CSSProperties = { flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 12, outline: 'none' }

  return (
    <div style={wrap}>
      <div style={introStyle}>
        <b>전장 지리·시각·시점·전개 의도·위협·이해관계·합병증·결정타·시계장치·교전 합·감각</b>을 무작위로 엮어 하나의 <b>액션·전쟁 장면</b>을 만듭니다.
        마음에 드는 칸은 <Emoji e="🔒" />로 잠그고 나머지만 다시 굴리세요.
      </div>

      {ctxGenre && (
        <div style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 9px' }}>
          <Emoji e="🧭" /> 맥락: {ctxGenre}
        </div>
      )}

      {/* 생성 도구바 + 조합수 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={generate}><Emoji e="🎲" /> {lockedCount ? '나머지 다시 생성' : '장면 생성'}</button>
        {lockedCount > 0 && <span style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="🔒" /> {lockedCount}개 잠금</span>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>
          약 <b style={{ color: 'var(--accent)' }}>{combos.toLocaleString('ko-KR')}</b>가지 조합
        </span>
      </div>

      {toast && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--ok)', color: 'var(--ok)', borderRadius: 8, padding: '7px 10px', fontSize: 12 }}>
          <Emoji e="✅" /> {toast}
        </div>
      )}

      <div style={body}>
        {/* 슬롯들 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SLOTS.map((sl) => {
            const isLocked = !!locks[sl.key]
            const multi = slotIsMulti(sl.key)
            const arr = slotMultiArr(sl.key)
            const single = slotSingle(sl.key)
            const dim = rolling && !isLocked
            return (
              <div key={sl.key} style={{ ...slotCard, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0 }}><Emoji e={sl.icon} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{sl.label}</div>
                  {multi && scene && arr.length ? (
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.5, color: dim ? 'var(--muted)' : 'var(--text)' }}>
                      {arr.map((d, i) => <li key={i}>{dim ? '…' : d}</li>)}
                    </ul>
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.45, overflowWrap: 'anywhere', color: single ? (dim ? 'var(--muted)' : 'var(--text)') : 'var(--muted)' }}>
                      {single ? (dim ? '…' : single) : '— 생성해 주세요 —'}
                    </div>
                  )}
                </div>
                <button
                  className="minibtn"
                  onClick={() => toggleLock(sl.key)}
                  title={isLocked ? '잠금 해제' : '이 칸 잠그기'}
                  style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}
                >{isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
              </div>
            )
          })}
        </div>

        {/* 조합 글감 */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--accent)', fontSize: 13 }}><Emoji e="💥" /> 액션·전쟁 장면 글감</div>
          <div style={{ fontSize: 14, lineHeight: 1.7, color: scene ? 'var(--text)' : 'var(--muted)' }}>
            {fullText || '〈장면 생성〉을 눌러 액션·전쟁 장면을 만들어 보세요.'}
          </div>
        </div>

        {/* 산출물 도구바 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="minibtn" onClick={copyText} disabled={!scene}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 글쓰기에 활용</>}</button>
          <button className="minibtn" onClick={saveScene} disabled={!scene}>☆ 즐겨찾기</button>
          <button className="linkbtn" onClick={() => scene && toSnippet(scene)} disabled={!scene} title="이 장면 글감을 스니펫으로 저장"><Emoji e="📝" /> 스니펫 저장</button>
          <button className="linkbtn" onClick={() => scene && toLibPlace(scene)} disabled={!scene} title="이 장면의 무대를 공유 장소 라이브러리에 추가"><Emoji e="📥" /> 장소 라이브러리</button>
          <button
            className="linkbtn"
            onClick={() => scene && toProject(scene)}
            disabled={!scene || !linked}
            title={linked ? '이 장면을 프로젝트 원고(장면 폴더)에 추가' : '프로젝트에 연결되어 있지 않습니다'}
          ><Emoji e="📄" /> 프로젝트에 추가</button>
        </div>

        {/* 즐겨찾기 */}
        <div>
          <div style={{ ...secTitle, marginBottom: 6 }}>
            <span><Emoji e="⭐" /> 저장한 장면 {saved.length ? `(${saved.length})` : ''}</span>
          </div>
          {!saved.length ? (
            <div style={{ color: 'var(--muted)', fontSize: 12, padding: '8px 2px' }}>아직 저장한 장면이 없습니다. ☆로 마음에 드는 장면을 모아보세요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {saved.map((s) => (
                <div key={s.id} style={savedRow}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}><Emoji e="💥" /> {emojify(titleOf(s.scene))}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>{compose(s.scene)}</div>
                  {editId === s.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditId(''); setEditText('') } }}
                        placeholder="메모 (등장 회차·복선·세트피스 규모 등)"
                        style={noteInput}
                      />
                      <button className="minibtn" onClick={commitEdit}>저장</button>
                      <button className="minibtn" onClick={() => { setEditId(''); setEditText('') }}>취소</button>
                    </div>
                  ) : (
                    <>
                      {s.note && <div style={{ fontSize: 11.5, color: 'var(--accent)' }}><Emoji e="📝" /> {emojify(s.note)}</div>}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="minibtn" onClick={() => loadSaved(s)} title="이 장면을 위에 불러오기">↩ 불러오기</button>
                        <button className="linkbtn" onClick={() => toSnippet(s.scene)} title="스니펫으로 저장"><Emoji e="📝" /> 스니펫</button>
                        <button className="linkbtn" onClick={() => toLibPlace(s.scene)} title="공유 장소 라이브러리에 추가"><Emoji e="📥" /> 장소</button>
                        <button className="linkbtn" onClick={() => toProject(s.scene, s.note || undefined)} disabled={!linked} title={linked ? '프로젝트 원고(장면 폴더)로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트</button>
                        <button className="minibtn" onClick={() => startEdit(s)} title="메모 편집"><Emoji e="✏️" /></button>
                        <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제"><Emoji e="🗑️" /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 관련 도구 연계 바 */}
      <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
        {RELATED.map((r) => (
          <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, ctxGenre ? { genre: ctxGenre } : { genre: '액션·전쟁' })} title={`${r.label} 열기`}>
            <Emoji e={r.icon} /> {r.label}
          </button>
        ))}
      </div>

      <div className="license-note" style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'right' }}>
        로컬 자작 데이터 · 외부 네트워크 없음 · 생성 장면은 출발점일 뿐 자유롭게 비틀어 보세요
      </div>
    </div>
  )
}
