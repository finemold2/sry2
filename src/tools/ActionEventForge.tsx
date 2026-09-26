// 액션·전쟁 사건·소재 대형 생성기 — 액션·전쟁 장르의 한 '사건'을 슬롯 조합으로 대량 생성한다.
//   콜드 오픈(소규모 액션 개입) × 적대 세력 × 이해관계(잃을 것) × 시계 장치(시한) ×
//   세트피스 공간(지리·제약) × 능력 격차/역전축 × 서사 장치 × 체호프의 환경요소 ×
//   대가 있는 결말(여파) × 다음 화 후크(클리프행어) 열 슬롯.
//   각 슬롯의 로컬 표에서 한 조각씩 뽑아 "무엇이 터지고, 누가 막아서며, 무엇을 잃을 수 있고,
//   시한은 언제이며, 어디서 어떤 제약 아래 싸우고, 어떻게 격차를 뒤집으며, 어떤 장치로 조이고,
//   1막의 무엇이 회수되며, 무엇을 치르고 이기고, 다음 화는 어떻게 끊기는가"를 한 사건으로 엮는다.
//   마음에 드는 슬롯은 🔒로 고정하고 나머지만 다시 굴려 변주(잠금/재생성). 가능 조합 1조+ 표시.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(보관함)만 사용. 외부 API 불필요.
// 연계(linkbus): 현재 사건을 자료('research')/'사건' 폴더 문서로 추가하고, 스니펫 라이브러리에도 저장.
//   관련 도구(추격 장면·클리프행어·갈등 설계·장면 생성 등) openToolLinked 로 이어 열기.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'action-eventforge', name: '액션·전쟁 사건 단조기', icon: '💥', group: '생성기', genre: '액션·전쟁', intro: '콜드 오픈·적대 세력·시한·세트피스·능력 격차·대가를 조합해 액션·전쟁 한 사건을 대량 생성', w: 600, h: 720 }

const LS = 'sry:tool:action-eventforge'

// ---- 슬롯 정의 ----
// 각 슬롯은 액션·전쟁 사건의 한 축. faces = 그 축의 후보(로컬 표, 장르 특화·구체적).
// 10개 슬롯 × 평균 ~20면 → 조합 10^13(약 10조) 이상.
interface Slot { key: string; label: string; icon: string; desc: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'open', label: '콜드 오픈', icon: '🩸', desc: '능력을 입증하며 평온을 깨는 소규모 액션 개입',
    faces: [
      '검문소를 통과하던 호송 차량이 노변 폭발물에 앞바퀴를 잃고 도랑으로 굴러떨어진다',
      '새벽 정찰 중 무전이 끊기고, 능선 너머에서 조명탄 세 발이 연달아 솟는다',
      '평범한 환승역 인파 속에서 누군가 주인공의 손목을 잡고 "지금 뛰어"라고 속삭인다',
      '협상 테이블 위로 첫 총성이 갈라지고, 양측 경호원이 동시에 권총을 뽑아 든다',
      '비무 시범 도중 목검이 부러지고, 상대가 진검을 빼 든 채 다시 자세를 잡는다',
      '레이드 게이트가 예정보다 한 시간 일찍 열리며 등급 외 마수가 거리로 쏟아진다',
      '훈련용 모의전이라던 작전에서, 첫 발이 공포탄이 아니라 실탄이었음을 깨닫는다',
      '국경 마을 장터 한복판으로 장갑차 한 대가 굉음을 내며 밀고 들어온다',
      '경호 대상이 연단에 오르는 순간, 옥상 난간에서 햇빛에 조준경이 번뜩인다',
      '추격하던 용의자가 막다른 골목 끝에서 돌아서며 칼 대신 수류탄 핀을 뽑는다',
      '야간 매복 중 적 척후 둘이 손 닿는 거리까지 다가오고, 한 명이 무전기를 든다',
      '문파 비무대회 예선, 잡졸인 줄 알았던 상대가 첫 합에 주인공의 검을 두 동강 낸다',
      '구조 헬기가 착륙장에 닿기 직전, 기수 아래로 견착식 미사일의 연기가 곧게 솟는다',
      '시가지 순찰 중 골목마다 셔터가 일제히 내려가고, 거리에 우리 편만 남는다',
      '인질로 잡혀 있던 동료가 갑자기 결박을 풀고 경비병 둘을 쓰러뜨리며 무기를 던진다',
      '평화협정 조인식장, 상대 대표가 악수를 청한 손에 격발 직전의 격침이 만져진다',
      '각성 직후 첫 사냥, 약체 마수인 줄 알았던 개체가 갑자기 두 번째 입을 벌린다',
      '잠입한 적 보급창에서 시계를 보던 순간, 머리 위 스피커가 주인공의 가명을 호출한다',
      '국지 도발로 시작된 포격이 십 분 만에 전선 전체로 번지며 후방까지 흔든다',
      '결투 신청을 받아들인 객잔 마당, 상대 뒤로 매복한 궁수 다섯이 시위를 당긴다',
      '시범 비행이라던 출격에서, 관제탑이 갑자기 "교전 허가"를 통보해 온다',
      '뒷골목에서 한 아이를 구한 직후, 사방 옥상에서 동시에 발소리가 떨어져 내린다',
    ],
  },
  {
    key: 'enemy', label: '적대 세력', icon: '🎯', desc: '한 단계 위 빌런/적군(격차의 출발점)',
    faces: [
      '주인공보다 한 수 위의 무력을 지닌, 같은 사문 출신의 배교자',
      '병참과 정보에서 압도적 우위에 선 정규군 정예 대대',
      '얼굴을 드러내지 않고 대리인만 보내는 초국적 청부 군벌',
      '국가의 비호를 받으며 법 위에서 움직이는 비공식 처리반',
      '전선을 좀먹는 부패한 지휘부와, 그 명령을 맹종하는 직속 친위대',
      '같은 던전을 노리는, 서열 한 단계 위의 경쟁 길드',
      '쓰러뜨릴수록 더 강해져 돌아오는, 학습형 마수 군체',
      '주인공의 전술을 모두 꿰뚫고 있는 옛 스승이자 현 적장',
      '수적으로 압도하는 정예 용병단과 그들을 부리는 냉정한 단장',
      '아군으로 위장해 작전 한복판에서 등을 노리는 이중첩자 분대',
      '도시 하나를 통째로 봉쇄한, 사파 연합의 절정고수 셋',
      '회복·증원이 무한해 소모전으로 끌고 가려는 거대 제국 군단',
      '인질을 방패로 삼아 정면 교전을 강요하는 테러 조직',
      '하늘을 장악해 제공권으로 지상을 짓누르는 적 항공 전력',
      '내공·자원을 빨아들여 시간이 갈수록 불리해지는 흡정의 마두',
      '주인공의 약점만 정확히 노리도록 설계된 대인 병기',
      '기만과 거짓 무전으로 아군을 서로 쏘게 만드는 심리전 부대',
      '한 명 한 명이 보스급인, 봉인에서 풀려난 옛 시대의 무신들',
      '정의를 자처하며 사적 제재로 사람을 심판하는 무장 자경 집단',
      '주인공을 시험하듯 매번 더 강한 자객을 보내는 그림자 종주',
      '전 병력을 자폭 병기로 개조해 동귀어진을 노리는 광신 군대',
      '협상으로 시간을 끌며 뒤로 포위망을 좁혀 오는 노련한 적 지휘관',
    ],
  },
  {
    key: 'stake', label: '이해관계', icon: '⚖️', desc: '싸움 전에 설치하는, 잃을 수 있는 것',
    faces: [
      '엄호 사격으로 다리를 건너야 하는, 등 뒤의 부상병 열두 명',
      '함락되면 후방 보급선 전체가 끊기는 마지막 거점 하나',
      '주인공만 위치를 아는, 적진에 고립된 정찰조',
      '무너지면 수만 피란민이 갇히는 단 하나의 도하 다리',
      '동귀어진을 각오한 사형(師兄)의 목숨과, 그가 지키려는 사문의 명예',
      '게이트가 닫히기 전에 빼내야 하는, 안에 갇힌 비각성 민간인들',
      '폭로되면 부대 전체가 군법에 회부될, 묻어 둔 작전의 진실',
      '한 번 더 다치면 다시는 검을 못 쥐게 될 주인공 자신의 검수(劍手)',
      '인질로 잡힌, 적장이 노리는 마지막 생존 증인',
      '탈환하지 못하면 적의 손에 넘어갈 도시의 식수원과 발전소',
      '주인공을 믿고 따라나선 신병들의 첫 전투이자 마지막이 될 수도 있는 하루',
      '되찾으면 전세를 뒤집을, 적이 탈취해 간 작전 기밀과 암호',
      '주인공이 옳다고 믿어 온 대의(大義), 그 정당성 자체',
      '협정이 깨지면 다시 불붙을, 간신히 멈춘 휴전선의 평화',
      '여기서 물러서면 사파에 넘어갈 정파 무림 전체의 사기',
      '아직 작전 종료를 모른 채 사지로 향하는 우군 본대',
      '한 명이라도 살리려 남은, 무너지는 갱도 속 광부와 아이들',
      '주인공의 손에 달린, 적의 자폭 신호를 끊을 단 하나의 회선',
      '되돌릴 수 없게 작동한 발사 명령, 그 표적이 된 아군 진지',
      '주인공이 지키겠다 약속한, 전사한 전우의 유가족',
      '봉인이 풀리면 대륙을 삼킬 마기(魔氣)와, 그것을 누르는 마지막 진법',
      '항복하면 학살당할, 백기를 든 채 갇힌 적군 포로들',
    ],
  },
  {
    key: 'clock', label: '시계 장치', icon: '⏳', desc: '명시·자연·전술적 시한(긴장 증폭기)',
    faces: [
      '적 증원이 도착하기까지 남은 17분',
      '폭파 장약의 타이머가 0으로 향하는 4분 30초 안에',
      '밀물이 도하 지점을 삼키기 전까지',
      '내공이 바닥나 운기가 멎기 전, 단 세 호흡 안에',
      '게이트가 영구 폐쇄되는 자정의 카운트다운',
      '동이 트면 적 항공기가 엄폐물 없는 평원을 휩쓸기에, 날이 밝기 전까지',
      '탄약이 한 탄창, 마지막 서른 발이 떨어지기 전에',
      '포격 좌표가 우군 진지로 갱신되기까지 남은 10분',
      '부상으로 흐르는 피가 의식을 앗아 가기 전, 길어야 한 시간',
      '적의 자폭 장치가 무전 신호를 받기까지 남은 시간만큼',
      '구조 헬기의 연료가 회항점을 넘기 전 마지막 한 번의 강하',
      '봄눈이 녹아 매복 진지가 드러나기 전까지',
      '인질 처형이 예고된 정오, 종이 울리기 전에',
      '진법의 등불이 다 꺼지면 봉인이 풀리니, 남은 일곱 개의 불이 꺼지기 전에',
      '적 함대가 항만 사거리에 들기까지 남은 두 시간',
      '독무(毒霧)가 갱도를 채우기 전, 산소가 남은 만큼',
      '교량 폭파 명령이 철회 불가가 되는 정시까지',
      '버프 지속 시간이 끝나 스탯이 원래대로 돌아가기 전 90초',
      '눈보라가 길을 완전히 막아 철수로가 사라지기 전까지',
      '적이 협정 위반의 명분을 잡기까지, 단 한 발도 더 쏘면 안 되는 그 순간까지',
      '예비대가 전멸해 전선이 무너지기까지 버텨야 할 마지막 30분',
      '일몰과 함께 적의 야간 시야 우위가 시작되기 전, 해가 지기까지',
    ],
  },
  {
    key: 'place', label: '세트피스 공간', icon: '🏯', desc: '지리·출구·엄폐물이 압박이 되는 전장',
    faces: [
      '엄폐물 하나 없이 사거리에 노출된, 좁고 긴 협곡의 외길',
      '무너지는 댐과 차오르는 물 사이, 점점 짧아지는 둑길',
      '엘리베이터가 멈춘 고층 빌딩의 비상계단, 층마다 매복',
      '안개 낀 운무 속 절벽 잔도(棧道), 발 한 번 헛디디면 천 길 아래',
      '시야가 막힌 시가지의 폐허, 창문마다 적의 총구가 있을 수 있는 미로',
      '단 하나의 도하 다리, 양안에서 교차하는 십자포화',
      '천장이 무너져 내리는 던전의 마지막 봉인의 방',
      '바람이 미친 듯 부는 비행장 활주로, 엄폐물은 멈춘 항공기뿐',
      '함교가 기울어진 채 가라앉는 군함의 침수된 격실',
      '사방이 뚫린 사막의 분지, 모래언덕 너머가 보이지 않는 사선',
      '문파 본산으로 오르는 천 개의 계단, 단마다 진법의 함정',
      '참호와 철조망이 끝없이 이어진, 무인지대를 사이에 둔 두 전선',
      '정전된 데이터센터의 냉기 어린 통로, 비상등만 명멸하는 어둠',
      '눈사태 위험을 품은 설산 고개, 큰 소리 한 번이면 산이 무너진다',
      '인질이 곳곳에 흩어진 만석의 경기장, 오발 한 발이 참사가 되는 곳',
      '불길이 번지는 적 보급창, 탄약고가 연쇄로 터지는 화염의 미로',
      '조류가 미친 듯 휘도는 해협, 엔진이 멈추면 암초로 밀려가는 좁은 수로',
      '천장이 낮아 검을 휘두를 수 없는 갱도, 단검과 맨손만 허락되는 어둠',
      '관제탑과 교신이 끊긴 고립된 전초기지, 사방의 능선이 모두 적의 고지',
      '폭우로 시야가 닫힌 정글, 발밑 어디에 지뢰가 있을지 모르는 진창',
      '회전문처럼 통로가 바뀌는 적의 미궁 요새, 같은 방이 두 번 나오지 않는다',
      '얼어붙은 강 위의 빙판, 총성 한 번에 얼음이 갈라지는 살얼음판',
    ],
  },
  {
    key: 'ladder', label: '능력 격차/역전축', icon: '🪜', desc: '약점·도구·희생·각성으로 격차를 뒤집는 방법',
    faces: [
      '적의 절기에 단 하나 있는 빈틈을, 세 번 맞아 가며 알아낸 파훼의 한 수',
      '지형을 역이용해 적의 수적 우위를 한 줄로 좁히는 한 명씩 상대 전술',
      '동료의 목숨을 건 양동(陽動)이 만든, 단 한 번의 측면 진입로',
      '바닥난 내공 대신 몸을 던지는, 검수(劍手)를 버린 동귀어진의 결의',
      '적이 학습하지 못한 변초(變招) 하나를 끝까지 숨겨 둔 마지막 패',
      '환경의 위험(가스·물·낙석)을 무기로 돌려 화력 격차를 메우는 한 수',
      '버프·스킬의 쿨타임을 초 단위로 계산해 빈틈에 모든 화력을 몰아넣는 운용',
      '항복을 가장한 접근으로 적 지휘관과의 거리를 0으로 만드는 도박',
      '저격수의 단 한 발을 위해 분대 전체가 미끼가 되는 합',
      '적의 보급선을 끊어, 시간이 적의 편이 아니게 만드는 병참 역전',
      '부상 입은 다리를 묶어 고통을 잊고, 마지막 돌격에 모든 것을 거는 의지',
      '기만 무전으로 적 두 부대가 서로를 치게 만드는 정보전 한 수',
      '폐기된 옛 무기·옛 무공을 회수해 적의 신무기를 무력화하는 역발상',
      '적의 자만을 미끼로, 일부러 진 척하며 끌어들인 함정',
      '각성의 마지막 단계를 전투 한복판에서 강제로 개방하는 위험한 돌파',
      '단 한 발 남은 탄환과 단 한 줌 남은 내공을, 가장 결정적인 순간까지 아끼는 인내',
      '적장의 명예심을 자극해 일대일 결투로 끌어내, 군세를 무력화하는 한 수',
      '아군 전멸 직전, 적이 절대 예상 못 한 후방의 비밀 통로 기습',
      '약점을 가리려는 적의 허세를 읽고, 일부러 그 약점을 정면으로 노리는 담대함',
      '시그니처 무기를 봉인하고 맨손·맨몸으로 적의 경계를 풀어 버린 역설',
      '죽은 전우가 남긴 한마디·물건이 만든, 절체절명의 한 수',
      '수련의 결실인 신경지(新境地)를, 누적된 복선대로 마지막 합에서 개화시킨 일격',
    ],
  },
  {
    key: 'device', label: '서사 장치', icon: '🃏', desc: '이 장르 고유의 긴장 장치',
    faces: [
      '1 대 다수의 최후의 저항(라스트 스탠드)으로 약자 응원 심리를 동원',
      '안전해 보이는 휴식 직후의 기습(거짓 안전지대)으로 들숨-날숨 리듬을 설계',
      '무장 점검·작전 브리핑으로 능력을 사전 공개하고 긴장을 적재(기어업 몽타주)',
      '지휘부(전략)와 현장 병사(생존)의 시점을 교차해 결정의 인간적 비용을 보여줌',
      '병사가 지고 다니는 물건(편지·부적·유품)으로 추상적 전쟁을 구체적 무게로 환원',
      '시한이 0으로 향하는 명시적 카운트다운(티킹 클락)으로 긴장을 조임',
      '원거리(저격)→중거리(총격)→근접(백병)으로 거리를 좁혀 잔혹도와 친밀도를 높임',
      '동료가 남아 길을 막고 주인공을 보내는 희생적 후위(殿軍)로 감정 정점을 만듦',
      '거짓 무전·위장으로 적을 속이는 정보·병참의 비대칭(머리 싸움)',
      '시그니처 무브/무기(절기·재장전·호흡)를 반복 노출했다가 클라이맥스에서 변주',
      '자원 고갈 직전의 역전(마지막 한 발·내공 한 줌·부서진 무기)',
      '믿었던 아군 지휘부가 진짜 적이었던 반전형 절정의 씨앗',
      '부상(출혈·골절)이 또 하나의 시계로 작동하는 부상 시계',
      '앞 세트피스보다 규모·위험이 커지는 점층(작은 충돌→중간 보스→최종전)',
      '독자는 적의 매복을 알지만 주인공은 모르는 정보 비대칭(서스펜스)',
      '능력의 규칙(탄약·체력·내공·쿨타임)을 먼저 못 박아 카타르시스를 정당화',
      '회차 끝 미니 승리(사이다)와 다음 회 더 큰 위협을 한 묶음으로 분절',
      '짧은 문장·동사 중심·잦은 행갈이로 격렬 구간의 속도를 끌어올림',
      '결정적 3~5비트만 슬로우로, 나머지 동작은 요약(scene vs summary)',
      '무손상 승리를 거부하고 부상·피로·트라우마로 액션에 무게를 더함',
      '체호프의 무기—1막에 보인 환경 요소를 전투에서 회수해 활용',
      '명령과 양심의 충돌(쏠 것인가 말 것인가)로 도덕적 긴장을 적재',
    ],
  },
  {
    key: 'gun', label: '체호프의 환경요소', icon: '🔧', desc: '1막에 보였다가 전투에서 회수될 무기/지형',
    faces: [
      '초반에 무심히 지나친, 폭파하면 협곡을 막을 낡은 갱도 지지대',
      '벽에 걸려 있던 작살총과, 천장에 매달린 무거운 샹들리에',
      '버려진 줄 알았던, 연료가 반쯤 남은 유조차',
      '문파 사당 깊이 봉인돼 있던, 손잡이 없는 폐기된 절기서(絶技書)',
      '전투 전 보여 준, 둑 안쪽에 가득 찬 댐의 수문 개폐 장치',
      '늘 차고 다니던 부싯돌과, 사방에 깔린 마른 갈대밭',
      '적 보급창 한가운데 쌓여 있던, 신관만 끼우면 되는 포탄 더미',
      '주인공이 정찰 때 표시해 둔, 지도에 없는 비밀 배수로',
      '아이가 건네준, 작아 보였던 호루라기 하나(증원 신호용)',
      '낡아 못 쓴다던, 정밀 조정만 하면 한 발은 나가는 노후 박격포',
      '전우의 유품인 라이터와, 천장을 가득 메운 가연성 가스',
      '경공으로만 닿는 절벽 위, 굴리면 길을 덮을 거대한 바위',
      '적이 자랑하던, 역으로 해킹하면 통제권을 빼앗을 수 있는 자동 포탑',
      '시범 때 보여 준, 진기를 모으면 한 번 폭발하는 봉인된 검',
      '늘 막혀 있던 갑문과, 그 너머 차오르는 강물의 수위',
      '동료가 챙겨 둔, 한 번만 쓸 수 있는 연막탄 단 두 발',
      '관제탑 옥상의 녹슨 신호탄 발사기(아군 호출용)',
      '적 미궁 곳곳에 깔린, 신호를 보내면 일제히 터지는 적의 자체 함정',
      '주인공의 부서진 검 조각과, 그것을 던질 단 한 번의 거리',
      '광장 중앙의 거대한 종(鐘)과, 그 진동으로 무너질 천장의 균열',
      '전투 전 챙겨 둔 갈고리 밧줄과, 적이 방심한 고지의 측면 절벽',
      '초반에 등장한 길들지 않은 군마(軍馬)와, 적 진영을 가로지를 단 한 번의 돌파로',
    ],
  },
  {
    key: 'cost', label: '대가 있는 결말', icon: '🎖️', desc: '이기되 영구히 무언가를 잃는 여파(aftermath)',
    faces: [
      '거점은 지켰으나, 끝까지 남아 길을 막은 사형(師兄)을 잃는다',
      '적장을 베었지만, 주인공의 검수(劍手)는 다시 검을 쥘 수 없게 된다',
      '다리는 끝내 무너뜨려 적을 막았으나, 건너지 못한 정찰조가 함께 사라진다',
      '작전은 성공했으나, 그 대가로 묻은 진실이 주인공의 평생을 짓누른다',
      '게이트는 닫혔지만, 마지막까지 안에 남은 신병 하나를 빼내지 못한다',
      '도시는 구했으나, 그 결정으로 적 포로들이 학살당하는 것을 막지 못한다',
      '봉인은 다시 채워졌지만, 그 힘을 누르느라 주인공의 내공 절반이 영영 흩어진다',
      '승리했으나, 믿었던 지휘부가 적이었음을 알게 되어 돌아갈 곳을 잃는다',
      '전선은 지켰으되, 주인공을 믿고 따라온 신병 분대 절반이 돌아오지 못한다',
      '인질은 모두 살렸지만, 그 과정에서 주인공 자신이 적의 표적 명단 맨 위에 오른다',
      '적은 물러갔으나, 시그니처 무기가 부러져 두 번 다시 같은 절기를 쓸 수 없다',
      '평화는 지켜졌으나, 그것을 위해 주인공이 직접 쏜 한 발의 무게가 남는다',
      '마수는 토벌됐지만, 가장 가까운 동료가 그 자리에서 각성을 잃고 비각성자로 돌아간다',
      '임무는 완수했으나, 주인공이 지키겠다 약속한 유가족 앞에 또 하나의 빈손으로 선다',
      '적군은 항복했지만, 주인공은 자신이 옳다 믿어 온 대의의 근거에 금이 가는 것을 본다',
      '거점 탈환은 성공했으나, 살아남은 자들 사이에 남은 것은 침묵과 트라우마뿐이다',
      '전투에서 이겼으나, 그 승리가 더 큰 전쟁의 명분이 되어 돌아온다',
      '적은 섬멸했지만, 주인공은 그 과정에서 자신이 적과 다를 바 없어졌음을 깨닫는다',
      '동료는 모두 살렸으되, 주인공 홀로 평생 가시지 않을 부상을 안고 돌아온다',
      '작전 목표는 달성했으나, 그 좌표가 한 마을을 통째로 지워 버린 뒤다',
      '비기(秘技)는 완성됐지만, 그것을 가르쳐 준 스승을 자기 손으로 보내야 했다',
      '모두를 구한 영웅이 되었으나, 정작 자신을 기다리던 이는 끝내 만나지 못한다',
    ],
  },
  {
    key: 'hook', label: '클리프행어', icon: '📉', desc: '전투의 절정 직전·반전 직후에서 끊는 다음 화 후크',
    faces: [
      '— 그리고 능선 너머에서, 새로운 깃발이 끝없이 올라오기 시작했다.',
      '— 마지막 탄창이 빈 채로, 적의 발소리는 점점 가까워졌다.',
      '— 쓰러진 적장이 마지막으로 웃으며 말했다. "이건… 미끼였어."',
      '— 부러진 검을 쥔 손 위로, 더 강한 기파가 천천히 내려앉았다.',
      '— 게이트가 닫히는 순간, 그 안에서 주인공의 이름이 들렸다.',
      '— 무전기 너머의 목소리는, 분명 전사했어야 할 사람의 것이었다.',
      '— 시계는 0을 가리켰지만, 폭발은 일어나지 않았다. 아직은.',
      '— 구원군의 깃발에 그려진 문장은, 적의 것과 똑같았다.',
      '— 항복 깃발을 든 적 진영 한복판에서, 단 한 사람만 자세를 풀지 않았다.',
      '— 살아남은 신병이 떨리는 손으로 가리킨 곳에, 두 번째 군세가 있었다.',
      '— 명령서의 직인을 다시 본 순간, 그것이 위조임을 깨달았다.',
      '— 봉인이 다시 채워졌다. 그런데 등불 하나가, 저절로 다시 켜졌다.',
      '— 적의 자폭 신호는 끊겼다. 그러나 그것은 신호가 아니라, 시작이었다.',
      '— 안개가 걷히자, 지켜 낸 다리 너머로 적의 본대가 모습을 드러냈다.',
      '— 그제야 깨달았다. 진짜 표적은 이 거점이 아니라, 텅 빈 후방이었다.',
      '— 죽은 줄 알았던 스승이, 적의 군기(軍旗) 아래 말을 몰아 나왔다.',
      '— "수고했다." 등 뒤에서 들려온 아군의 목소리가, 방아쇠를 당기고 있었다.',
      '— 마지막 한 발을 아껴 둔 그 순간, 적은 인질을 앞세워 걸어 나왔다.',
      '— 전선은 지켰다. 그러나 무전은 일제히 같은 말을 반복했다. "전군, 후퇴."',
      '— 승리의 환호 속에서, 주인공만이 하늘을 가득 메운 적기를 보았다.',
      '— 그가 벤 것은 적이 아니었다. 적의 옷을 입은, 잃어버린 동료였다.',
      '— 다음 전장의 좌표가 적혀 있었다. 그곳은, 주인공의 고향이었다.',
    ],
  },
]

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

// 천 단위 콤마(한국어 로캘)
const fmtN = (n: number) => n.toLocaleString('ko-KR')

// 큰 수를 사람이 읽기 좋은 한국어 단위(억/조)로 — 조합수 강조용.
function fmtCombos(n: number): string {
  if (n >= 1e12) return `약 ${(n / 1e12).toFixed(n >= 1e13 ? 0 : 1)}조`
  if (n >= 1e8) return `약 ${(n / 1e8).toFixed(n >= 1e9 ? 0 : 1)}억`
  if (n >= 1e4) return `약 ${(n / 1e4).toFixed(0)}만`
  return fmtN(n)
}

// 활성 슬롯들의 조합 가짓수.
function comboCount(activeKeys: string[]): number {
  return activeKeys.reduce((acc, k) => {
    const s = SLOTS.find((x) => x.key === k)
    return acc * (s ? s.faces.length : 1)
  }, 1)
}

// 굴린 결과를 자연스러운 액션·전쟁 사건 단락으로 엮는다(슬롯 순서 무관, 의미 단위 조립).
function compose(by: Record<string, string>): string {
  const { open, enemy, stake, clock, place, ladder, device, gun, cost, hook } = by
  const parts: string[] = []
  if (open) parts.push(open)
  if (place) parts.push(`전장은 ${place}`)
  if (enemy) parts.push(`맞서는 것은 ${enemy}`)
  if (stake) parts.push(`여기서 잃을 수 있는 것은 ${stake}`)
  if (clock) parts.push(`시한은 ${clock}`)
  if (gun) parts.push(`1막의 ${gun}가 전투에서 회수된다`)
  if (ladder) parts.push(`격차를 뒤집는 한 수는 〈${ladder}〉`)
  if (device) parts.push(`긴장은 〈${device}〉로 설계된다`)
  if (cost) parts.push(`그리고 승리의 대가 — ${cost}`)
  if (!parts.length) return ''
  let body = parts.map((p) => p.replace(/[.。]$/, '')).join('. ') + '.'
  if (hook) body += `\n${hook}`
  return body
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 관련 도구(있으면 이어 열기) — 도시에 근거: 추격·갈등·클리프행어·장면 등.
const RELATED: { id: string; label: string; icon: string }[] = [
  { id: 'chase-scene-gen', label: '추격·탈출 장면', icon: '🏃' },
  { id: 'conflict-builder', label: '갈등 설계기', icon: '⚔️' },
  { id: 'cliffhanger-forge', label: '클리프행어', icon: '📉' },
  { id: 'stakes-escalator', label: '판돈 상승', icon: '📈' },
  { id: 'scene-forge', label: '장면 생성', icon: '🎬' },
]

interface Saved { id: string; text: string; note: string; slots: string; rows: string }

export default function ActionEventForge({ payload }: { payload?: Record<string, unknown> }) {
  // 활성 슬롯(기본 전부) — 저장/복원
  const [active, setActive] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':active')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length) {
          const valid = arr.filter((k: string) => SLOTS.some((s) => s.key === k))
          if (valid.length) return valid
        }
      }
    } catch { /* ignore */ }
    return SLOTS.map((s) => s.key)
  })
  const [results, setResults] = useState<Record<string, string>>({})
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)

  // 보관함 — 저장/복원
  const [saved, setSaved] = useState<Saved[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':saved')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          return arr.filter((s) => s && typeof s.text === 'string').map((s, i) => ({
            id: typeof s.id === 'string' ? s.id : 'sv_' + i,
            text: String(s.text),
            note: typeof s.note === 'string' ? s.note : '',
            slots: typeof s.slots === 'string' ? s.slots : '',
            rows: typeof s.rows === 'string' ? s.rows : '',
          }))
        }
      }
    } catch { /* ignore */ }
    return []
  })

  const [tab, setTab] = useState<'forge' | 'saved'>('forge')
  const [toast, setToast] = useState('')
  const [copiedKey, setCopiedKey] = useState('')
  const nonce = useRef(0)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 페이로드로 슬롯 프리셋이 넘어오면 적용(연계 진입). 1회.
  useEffect(() => {
    const want = payload?.slots
    if (Array.isArray(want)) {
      const valid = want.filter((k): k is string => typeof k === 'string' && SLOTS.some((s) => s.key === k))
      if (valid.length) setActive(SLOTS.filter((s) => valid.includes(s.key)).map((s) => s.key))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 저장
  useEffect(() => { try { localStorage.setItem(LS + ':active', JSON.stringify(active)) } catch { /* ignore */ } }, [active])
  useEffect(() => { try { localStorage.setItem(LS + ':saved', JSON.stringify(saved)) } catch { /* ignore */ } }, [saved])

  // 비활성 슬롯의 결과/잠금 정리
  useEffect(() => {
    setResults((prev) => {
      const next: Record<string, string> = {}
      active.forEach((k) => { if (prev[k]) next[k] = prev[k] })
      return next
    })
    setLocked((prev) => {
      const next: Record<string, boolean> = {}
      active.forEach((k) => { if (prev[k]) next[k] = true })
      return next
    })
  }, [active])

  // 굴림 애니메이션 자동 해제 + 언마운트 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 320)
    return () => window.clearTimeout(t)
  }, [rolling])

  // 복사/토스트 피드백 정리(언마운트 포함)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1800)
    return () => window.clearTimeout(t)
  }, [toast])
  useEffect(() => {
    if (!copiedKey) return
    const t = window.setTimeout(() => { if (mounted.current) setCopiedKey('') }, 1500)
    return () => window.clearTimeout(t)
  }, [copiedKey])

  const toggleSlot = (key: string) => {
    setActive((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev // 최소 1개
        return prev.filter((k) => k !== key)
      }
      return SLOTS.filter((s) => prev.includes(s.key) || s.key === key).map((s) => s.key)
    })
  }

  const forge = useCallback(() => {
    const my = ++nonce.current
    setRolling(true)
    setResults((prev) => {
      if (my !== nonce.current) return prev
      const next: Record<string, string> = { ...prev }
      active.forEach((k) => {
        if (locked[k] && prev[k]) return // 잠긴 슬롯 유지
        const slot = SLOTS.find((s) => s.key === k)
        if (!slot) return
        let f = pick(slot.faces)
        if (f === prev[k] && slot.faces.length > 1) f = pick(slot.faces) // 연속 중복 완화
        next[k] = f
      })
      return next
    })
  }, [active, locked])

  const toggleLock = (key: string) => setLocked((prev) => ({ ...prev, [key]: !prev[key] }))

  const allLocked = active.length > 0 && active.every((k) => locked[k])
  const setAllLock = (v: boolean) => setLocked(() => {
    const next: Record<string, boolean> = {}
    if (v) active.forEach((k) => { next[k] = true })
    return next
  })

  const rolledList = active
    .map((k) => ({ slot: SLOTS.find((s) => s.key === k)!, face: results[k] }))
    .filter((r) => r.slot && r.face) as { slot: Slot; face: string }[]

  const hasResults = rolledList.length > 0
  const byKey: Record<string, string> = {}
  rolledList.forEach((r) => { byKey[r.slot.key] = r.face })
  const story = hasResults ? compose(byKey) : ''
  const combos = comboCount(active)
  const slotLabelLine = active.map((k) => SLOTS.find((s) => s.key === k)?.label || k).join('·')
  const rowsText = () => rolledList.map((r) => `${r.slot.icon} ${r.slot.label}: ${r.face}`).join('\n')

  const saveCurrent = () => {
    if (!hasResults) return
    setSaved((prev) => {
      if (prev.some((s) => s.text === story)) { setToast('이미 보관함에 있습니다.'); return prev }
      const rec: Saved = {
        id: 'sv_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4).toString(36),
        text: story,
        note: '',
        slots: slotLabelLine,
        rows: rowsText(),
      }
      setToast('보관함에 저장했습니다.')
      return [rec, ...prev]
    })
  }

  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))
  const setNote = (id: string, note: string) => setSaved((prev) => prev.map((s) => (s.id === id ? { ...s, note } : s)))
  const moveSaved = (id: string, dir: -1 | 1) => {
    setSaved((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      const ni = idx + dir
      if (ni < 0 || ni >= prev.length) return prev
      const a = prev.slice()
      ;[a[idx], a[ni]] = [a[ni], a[idx]]
      return a
    })
  }

  const copy = (key: string, text: string) => {
    const done = () => { if (mounted.current) setCopiedKey(key) }
    try {
      if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done)) }
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setToast('복사에 실패했습니다.') }
  }

  // 프로젝트 본문(HTML) — 완성 사건 + 슬롯별 분해.
  const bodyHtmlFor = (text: string, rows: string, slots: string) => {
    const paras = text.split('\n').filter(Boolean).map((ln) => `<p style="font-size:15px;line-height:1.8;"><b>${escHtml(ln)}</b></p>`).join('')
    const rowLines = rows
      ? rows.split('\n').filter(Boolean).map((ln) => `<p>${escHtml(ln)}</p>`).join('')
      : ''
    return [
      paras,
      `<hr/>`,
      slots ? `<p><b>슬롯 조합:</b> ${escHtml(slots)}</p>` : '',
      rowLines,
    ].join('')
  }

  // 프로젝트 연동 — 현재 사건을 자료(research)/'사건' 폴더에 문서로 추가.
  const addStoryToProject = () => {
    if (!hasResults) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const head = story.split('\n')[0] || story
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '사건',
      title: `💥 액션·전쟁 사건 — ${head.slice(0, 24)}${head.length > 24 ? '…' : ''}`,
      bodyHtml: bodyHtmlFor(story, rowsText(), slotLabelLine),
      synopsis: story.replace(/\n/g, ' '),
      meta: {
        장르: '액션·전쟁',
        적대세력: byKey.enemy || '—',
        이해관계: byKey.stake || '—',
        시계장치: byKey.clock || '—',
        역전축: byKey.ladder || '—',
        대가: byKey.cost || '—',
      },
    })
    setToast(id ? '프로젝트 자료 〈사건〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 스니펫 저장 — 글감 라이브러리에 사건을 스니펫으로 추가(여러 도구가 공유).
  const saveSnippet = (text: string, slots: string) => {
    if (!text) return
    addToLibrary('snippets', {
      text: `[액션·전쟁 사건] ${text}`,
      source: '액션·전쟁 사건 단조기',
      tags: ['글감', '사건', '액션·전쟁', ...slots.split('·').filter(Boolean)],
    })
    setToast('스니펫 라이브러리에 저장했습니다.')
  }

  // 보관 항목 하나를 프로젝트에 추가
  const addSavedToProject = (s: Saved) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const head = s.text.split('\n')[0] || s.text
    const id = addToProject({
      kind: 'text', root: 'research', folder: '사건',
      title: `💥 액션·전쟁 사건 — ${head.slice(0, 24)}${head.length > 24 ? '…' : ''}`,
      bodyHtml: bodyHtmlFor(s.text, s.rows, s.slots) + (s.note ? `<p style="color:#888;">📝 ${escHtml(s.note)}</p>` : ''),
      synopsis: s.text.replace(/\n/g, ' '),
      meta: { 장르: '액션·전쟁' },
    })
    setToast(id ? '프로젝트 〈사건〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const cardBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>콜드 오픈·적대 세력·이해관계·시계 장치·세트피스 공간·능력 격차/역전축·서사 장치·체호프의 환경요소·대가 있는 결말·클리프행어</b> 슬롯을 골라 굴리면, 액션·전쟁 한 사건이 한 단락으로 엮입니다. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴리세요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'}
          style={{ borderColor: tab === 'forge' ? 'var(--accent)' : 'var(--border)', color: tab === 'forge' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="💥"/> 생성
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐"/> 보관함 ({saved.length})
        </button>
      </div>

      {tab === 'forge' && (
        <>
          {/* 슬롯 선택 */}
          <div style={chipRow}>
            {SLOTS.map((s) => {
              const on = active.includes(s.key)
              return (
                <button key={s.key} className="minibtn" onClick={() => toggleSlot(s.key)} aria-pressed={on}
                  title={s.desc}
                  style={{ opacity: on ? 1 : 0.5, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                  <Emoji e={s.icon}/> {s.label}{on ? '' : ' +'}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmtCombos(combos)}</b>가지 ({fmtN(combos)})
            </span>
            <span style={{ flex: 1 }} />
            <button className="minibtn" onClick={() => setAllLock(!allLocked)} disabled={!hasResults}
              title={allLocked ? '전체 잠금 해제' : '전체 슬롯 잠금'}>
              {allLocked ? <><Emoji e="🔓"/> 전체 해제</> : <><Emoji e="🔒"/> 전체 고정</>}
            </button>
          </div>

          {/* 슬롯별 굴림 결과 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {active.map((k) => {
              const slot = SLOTS.find((s) => s.key === k)!
              const face = results[k]
              const isLocked = !!locked[k]
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 22, width: 28, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-12deg) scale(1.15)' : 'none' }}>
                    <Emoji e={slot.icon}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{slot.label} <span style={{ opacity: 0.7 }}>· {slot.faces.length}면</span></div>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.45, color: face ? 'var(--text)' : 'var(--muted)' }}>
                      {face ? (rolling && !isLocked ? '…' : face) : '— 굴려주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => face && copy('row_' + k, face)} disabled={!face} title="이 슬롯 복사"
                    style={{ flexShrink: 0 }}>
                    {copiedKey === 'row_' + k ? '✓' : <Emoji e="📋"/>}
                  </button>
                  <button className="minibtn" onClick={() => toggleLock(k)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 완성 사건 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="💥"/> 액션·전쟁 사건</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: hasResults ? 'var(--text)' : 'var(--muted)', whiteSpace: 'pre-wrap' }}>
              {story || '슬롯을 골라 굴리면, 한 편의 액션·전쟁 사건이 만들어집니다.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 130 }} onClick={forge}><Emoji e="💥"/> 생성 / 다시 굴리기</button>
            <button className="minibtn" onClick={() => copy('story', `${story}\n\n${rowsText()}`)} disabled={!hasResults}>
              {copiedKey === 'story' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={saveCurrent} disabled={!hasResults}><Emoji e="⭐"/> 보관</button>
            <button className="minibtn" onClick={() => saveSnippet(story, slotLabelLine)} disabled={!hasResults} title="글감 스니펫 라이브러리에 저장"><Emoji e="✂️"/> 스니펫</button>
          </div>

          {/* 프로젝트 연계 + 관련 도구 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={addStoryToProject} disabled={!hasResults || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !hasResults ? '먼저 사건을 굴려주세요' : '현재 사건을 프로젝트 자료 〈사건〉 폴더에 문서로 추가'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            {RELATED.map((r) => (
              <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: '액션·전쟁' })}
                title={`${r.label} 도구 열기`}>
                <Emoji e={r.icon}/> {r.label}
              </button>
            ))}
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐"/></div>
              보관한 사건이 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성 탭에서 <Emoji e="⭐"/> 보관을 눌러 마음에 드는 액션·전쟁 사건을 모아보세요.</span>
            </div>
          )}
          {saved.map((s, i) => {
            const k = 'sv' + s.id
            return (
              <div key={s.id} style={cardBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {s.slots && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{s.slots}</span>}
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                  <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">▼</button>
                  <button className="minibtn" onClick={() => copy(k, s.text + (s.rows ? `\n\n${s.rows}` : '') + (s.note ? `\n📝 ${s.note}` : ''))} title="복사">
                    {copiedKey === k ? '✓' : <Emoji e="📋"/>}
                  </button>
                  <button className="minibtn" onClick={() => saveSnippet(s.text, s.slots)} title="스니펫 라이브러리에 저장"><Emoji e="✂️"/></button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑"/></button>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{s.text}</div>
                {s.rows && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{s.rows}</div>
                )}
                <textarea
                  value={s.note}
                  onChange={(e) => setNote(s.id, e.target.value)}
                  placeholder="이 사건을 어느 인물·국면·세트피스에 쓸지 메모…"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
                <div className="linkbar">
                  <span className="linkbar-label">연계:</span>
                  <button className="linkbtn" onClick={() => addSavedToProject(s)} disabled={!hasProjectBridge()}
                    title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 사건을 프로젝트 자료 〈사건〉 폴더에 추가'}>
                    <Emoji e="📄"/> 프로젝트에 추가
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>사건은 출발점일 뿐입니다. 이기더라도 머리·준비·희생으로 이기고, 무손상 승리는 피하세요. 같은 조합이라도 내 인물·전장·대의에 맞춰 비틀어 보세요.</div>
    </div>
  )
}
