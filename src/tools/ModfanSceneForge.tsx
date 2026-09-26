// 현대판타지·회귀 장면 생성기(ModfanSceneForge) — 이 장르 특화 '장면' 생성 도구.
//   도시에의 서사 장치(회귀 자각·미래지식 행사·선점·정체 은닉·전생 대비·나비효과·전생 청산·체크리스트 추진 등)를
//   '전개 의도(beat)' 슬롯으로 두고, 무대(현실 시스템) × 시간 좌표 × 시점 인물(회귀자 처지) × 전개 의도
//   × 미래지식(메타정보) × 충돌·장애 × 전환·한 수 + '디테일(업계·감각) 다중 슬롯(2개)'을 곱해 한 '장면 글감'을 만든다.
//   마음에 드는 칸은 🔒로 잠그고 나머지만 🎲 재생성. 조합수 1조 이상.
// 자급식: react 와 './linkbus' 만 import. 외부 API·네트워크 없음(전부 로컬 자작 데이터).
//   Math.random + localStorage('sry:tool:modfan-sceneforge') 만 사용. 언마운트 정리.
// 연계: 공유 스니펫 라이브러리(addToLibrary('snippets')) + 장소 라이브러리(addToLibrary('places'))
//   + 프로젝트 원고(addToProject kind:text, root:draft, folder:'장면') + 관련 도구 열기(openToolLinked). payload.genre 맥락 배지.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'modfan-sceneforge',
  name: '현판 회귀 장면 생성기',
  icon: '⏳',
  group: '생성기',
  genre: '현대판타지·회귀',
  intro: '회귀 무대·시간 좌표·처지·전개 의도·미래지식·충돌·한 수를 조합해 현판 회귀 장면 글감을 만드세요',
  w: 600,
  h: 700,
}

const LS_KEY = 'sry:tool:modfan-sceneforge'

// ── 슬롯 풀(전부 자작·현대판타지 회귀 특화·구체적, 도시에 근거) ──────────────
// 단일 슬롯: place / time / pov / beat / future / obstacle / turn
// 다중 슬롯: detail(업계·세계관 디테일 2개), sensory(감각 디테일 2개) — 조합수를 1조 이상으로 키운다.

// 무대(현실 시스템 = 장르의 진짜 무대) — 경제·연예·헌터·스포츠·기업·일상의 구체 공간(도시에의 '현실 규칙' 무대)
const PLACES = [
  '회귀 직후 눈을 뜬, 십수 년 전 그대로인 반지하 자취방 천장 아래',
  '아직 폭등 전인 코인·종목 시세가 떠 있는 새벽의 노트북 화면 앞',
  '전생엔 떨어졌던 대기업 최종 면접의 유리벽 회의실',
  '아직 무명인 미래의 톱스타가 노래하는 좁은 연습실 한구석',
  '데뷔조 발표를 앞둔 기획사 지하 연습실의 거울 벽 앞',
  '게이트가 처음 열리기 직전, 아직 평범한 도심 한복판 사거리',
  '각성자 등급 측정기가 놓인 헌터협회 신규 등록 창구',
  'C급으로 분류됐던 첫 던전, 입구의 푸른 차원문 앞',
  '아직 상장 전인 스타트업의 컴퓨터 두 대뿐인 옥탑 사무실',
  '전생에 휴지 조각이 됐던 주식 객장의 붉고 푸른 전광판 아래',
  '회귀 전 부도가 났던 아버지 공장의 기름때 묻은 작업장',
  '아직 살아 있는 동생이 잠든, 익숙한 옛집 작은방 문 앞',
  '망하기 직전 인수할 수 있는 저평가 강남 변두리 상가 앞',
  '미래의 대박 웹툰 작가가 알바하는 편의점 카운터 너머',
  '전생의 라이벌이 아직 신입사원인 회사 탕비실',
  '회귀자만 아는 대형 사고가 일어나기 직전의 지하철 승강장',
  '아직 떡잎인 천재 운동선수가 뛰는 동네 운동장 스탠드',
  '망할 운명의 게임 회사가 차기작을 발표하는 쇼케이스 무대 뒤',
  '전생에 나를 잘랐던 부장이 상석에 앉은 회식 자리',
  '아직 평범한 PC방, 미래의 프로게이머가 솔로랭크를 도는 자리',
  '회귀 후 처음 들른, 시세가 박혀 있는 동네 부동산 사무소',
  '폭락 직전의 부동산 모델하우스, 분양 줄이 늘어선 입구',
  '연예계 시상식 백스테이지, 아직 상을 못 받은 무명들 사이',
  '미래의 유니콘이 될 회사의 첫 투자 IR 발표장 객석',
  '전생에 폭발했던 화학공장의 야간 당직실 모니터 앞',
  '아직 평범한 고등학교 교실, 미래의 거물들이 같은 반인 자리',
  '회귀자 감별이 소문난 점집의 향 냄새 짙은 좁은 방',
  '게이트 균열이 번지는 와중에도 영업 중인 24시 카페 창가',
  '전생의 마지막 기억이 멈췄던 응급실 침상 위, 다시 뜬 두 눈',
  '미래에 천정부지로 뛸 한정판이 매대에 깔린 마트 코너',
  '대형 기획사 오디션장, 번호표를 든 지망생들 사이의 대기 의자',
  '아직 데이터센터 한 칸뿐인, 곧 시대를 뒤바꿀 IT 기업 서버실',
  '회귀 전 사기당했던 투자 설명회의 화려한 호텔 연회장',
  '던전 브레이크 경보가 울리는 헌터 길드 상황실의 대형 스크린 앞',
  '전생엔 못 지킨 어머니의 병실, 아직 초기 진단만 받은 침대 곁',
]

// 시간 좌표(시점·시각) — 회귀물은 '몇 년 전, 언제'가 핵심. 구체적 시간 정조 + 회귀 직후 감각
const TIMES = [
  '회귀를 자각한 첫 새벽, 익숙한 알람이 울리기 직전의 정적',
  '미래의 대사건이 터지기 정확히 사흘 전인 늦은 밤',
  '거대 호재 발표 한 시간 전, 장 시작을 기다리는 아침 8시 반',
  '데뷔/상장/공개를 코앞에 둔 디데이 전날 밤',
  '전생에 모든 게 무너지기 시작한 그날, 운명의 분기점 당일 오전',
  '월급날 직전, 통장 잔고가 바닥인 회귀 직후의 늦은 저녁',
  '게이트 출현 예정일을 며칠 앞둔 평범해 보이는 한낮',
  '졸업·입사·계약을 앞둔, 인생이 갈리는 봄날의 이른 아침',
  '미래의 폭락이 시작되기 몇 시간 전, 모두가 들떠 있는 정오',
  '회귀 전 사고가 났던 그 시각을 향해 시계가 다가가는 한밤중',
  '연말 시상식 시즌, 한 해의 판도가 정해지는 12월의 저녁',
  '신학기 첫날, 미래의 거물들과 처음 마주치는 아침',
  '명절 연휴, 온 가족이 아직 모여 있는 따뜻한 거실의 한낮',
  '장 마감 직전 5분, 매수 버튼 위에 손가락을 올린 오후 3시 25분',
  '오디션 합격 발표가 뜨기 직전, 새로고침을 반복하는 자정',
  '미래에 대박 날 콘텐츠가 세상에 나오기 하루 전의 늦은 밤',
  '회귀 후 처음 맞는 생일, 아직 어린 몸으로 깨어난 아침',
  '경보가 울리기 직전, 폭우가 쏟아지는 새벽 3시의 도심',
  '폭염 속 휴장을 앞둔 한여름 오후의 텅 빈 사무실',
  '첫눈이 내리는 연말, 한 해의 회수가 마무리되는 저녁 무렵',
]

// 시점 인물(회귀자의 처지·정체) — 도시에의 '전생의 나 vs 현생의 나' 대비, 직업군별 변주
const POVS = [
  '모든 걸 잃고 죽기 직전, 미래 기억을 안은 채 약자 시절로 돌아온 회귀자',
  '전생에 만년 과장이었으나 이번엔 미래를 아는 평범한 회사원',
  '데뷔도 못 하고 묻혔던 연습생 시절로 돌아온 미래의 슈퍼스타',
  'F급으로 시작해 죽었던 과거로 회귀한, 미래를 아는 헌터',
  '깡통 찼던 개미 시절로 돌아온, 시세 차트를 통째로 외운 투자자',
  '망한 사업의 첫 단추를 다시 끼우러 돌아온 전직 대표',
  '못 지킨 가족이 아직 살아 있는 시점으로 돌아온 형/누나',
  '재능을 숨긴 채 떡잎부터 다시 시작하는 미래의 거장',
  '전생의 원수가 아직 약자일 때로 돌아온 복수의 회귀자',
  '대박 콘텐츠를 통째로 기억하는, 무명 시절의 작가/PD',
  '프로 데뷔에 실패했던 시절로 돌아온, 메타를 다 아는 게이머',
  '부도난 가업을 살리려 학생 신분으로 회귀한 막내',
  '전생의 동료들이 아직 풋내기일 때로 돌아온 베테랑',
  '미래 사고를 막을 단 한 번의 기회를 쥔, 그 현장의 생존자',
  '회귀 사실을 들키지 않으려 천재인 척 위장하는 평범했던 사람',
  '두 번째 인생만큼은 다르게 살기로 한, 한 많은 가장',
  '미래의 거물이 될 무명을 알아본, 안목만 회귀한 기획자',
  '전생에 버림받았던, 이번엔 먼저 손을 놓기로 한 사람',
  '죽기 직전 시스템 메시지와 함께 과거로 던져진 첫 각성자',
  '나 말고 또 다른 회귀자가 있음을 직감한, 경계심 가득한 회귀자',
]

// 전개 의도(beat) — '이 장면이 무엇을 하는가'(도시에의 서사 장치·전개 패턴을 의도화)
const BEATS = [
  { tag: '회귀자각', text: '익숙한 천장 아래 다시 눈을 떠, 젊어진 몸과 살아 있는 사람들에 회귀를 자각하는' },
  { tag: '첫사이다', text: '미래 지식을 처음으로 행사해 작은 승리를 거두고 두 번째 인생의 첫발을 떼는' },
  { tag: '선점', text: '저평가 종목·인재·기술·부동산을 남보다 먼저 알아보고 미리 손에 넣는' },
  { tag: '미래경고', text: '곧 닥칠 대사건(폭락·사고·게이트)을 알기에 미리 손을 써 피해를 막는' },
  { tag: '정체은닉', text: '미래를 안다는 걸 들키지 않으려 천재성·우연·예감으로 둘러대는' },
  { tag: '전생대비', text: '전생엔 무력하게 당했던 바로 그 상황을 이번엔 전혀 다르게 받아치는' },
  { tag: '재회', text: '전생에 잃었던 가족·친구·연인을 아직 살아 있는 모습으로 다시 마주치는' },
  { tag: '복수착수', text: '나를 망친 원수가 아직 약자일 때, 그 흥망을 쥔 첫 수를 두는' },
  { tag: '포섭', text: '아직 무명인 미래의 거물을 알아보고 먼저 다가가 제 사람으로 끌어들이는' },
  { tag: '의심관리', text: '“너 왜 이렇게 변했어?”라는 주변의 의심을 적당히 넘기며 위기를 봉합하는' },
  { tag: '체급역전', text: '한때 자신을 짓밟던 거대 존재를 이제는 내려다보는 위치로 올라서는' },
  { tag: '나비효과', text: '제 개입으로 미래가 어긋나기 시작해 아는 정보가 통하지 않는 첫 균열이 드러나는' },
  { tag: '메타무효', text: '믿었던 미래 지식이 더 이상 맞지 않아 순전히 제 실력으로 돌파해야 하는' },
  { tag: '회귀자전', text: '또 다른 회귀자·예지자가 “너도 돌아왔구나”를 감지해 정보전이 벌어지는' },
  { tag: '청산', text: '전생에서 못 갚은 거대한 빚을, 쌓아 올린 실력과 인맥으로 압도적으로 청산하는' },
  { tag: '수치성장', text: '재산·랭킹·등급·인지도가 한 단계 도약했음을 수치로 확인하며 진척을 체감하는' },
  { tag: '딜레마', text: '미래를 바꾸면 다른 누군가가 위험해지는, 두 인생 사이의 선택에 갈등하는' },
  { tag: '각성', text: '평범했던 자신에게 시스템·재능·힘이 깨어나며 새로운 판이 열리는' },
  { tag: '체크리스트', text: '“이번 생엔 ①가족 ②복수 ③이 종목…” 회귀 직후 할 일 목록을 세우고 첫 항목을 지우는' },
  { tag: '결의', text: '두 번째 기회의 무게를 새기며 같은 실수는 반복하지 않겠다 다짐하는' },
]

// 미래지식(메타정보) — 회귀물의 핵심 엔진. 거시이벤트·인물정보·콘텐츠메타 망라
const FUTURES = [
  '이 종목이 다음 주 호재 공시로 떡상한다는 것을 정확히 기억한다',
  '몇 달 뒤 코인 시장이 폭등했다가 한순간에 무너진다는 것을 안다',
  '곧 거대한 경제 위기가 닥쳐 자산이 반토막 난다는 미래를 안다',
  '저 평범한 사거리에 머지않아 첫 게이트가 열린다는 날짜를 안다',
  '이 던전의 보스 패턴과 숨겨진 보상 위치를 통째로 외우고 있다',
  '저 무명 연습생이 몇 년 뒤 시대를 휩쓰는 톱스타가 됨을 안다',
  '이 노래/시나리오/웹툰이 훗날 대박 콘텐츠가 됨을 미리 알고 있다',
  '지금 헐값인 저 회사가 미래의 거대 기업이 됨을 안다',
  '저자가 회사를 무너뜨릴 배신자라는 사실을 이미 알고 있다',
  '곧 일어날 대형 사고의 날짜와 장소를 정확히 기억하고 있다',
  '이 부동산이 몇 년 안에 몇 배로 뛴다는 것을 안다',
  '저 신인의 치명적 약점과 미래의 추문까지 전부 알고 있다',
  '다가올 게이트의 등급과 출현 순서가 머릿속에 줄지어 있다',
  '저 풋내기가 미래의 천재 선수가 됨을 한눈에 알아본다',
  '회사의 차기작이 처참하게 망할 운명임을 미리 알고 있다',
  '이 신기술이 업계 표준이 되기 직전이라는 흐름을 읽고 있다',
  '저 사람이 전생에서 나를 마지막에 구해준 은인임을 기억한다',
  '곧 풀릴 게임 메타와 사기 조합을 모조리 외우고 있다',
  '저 거물의 몰락 시점과 그 빈자리를 누가 차지할지 안다',
  '전생의 나를 죽음으로 몬 그 결정적 선택의 정답을 알고 있다',
]

// 충돌·장애 — 회귀물 특유의 위기·딜레마(들킬 위험·자원 부족·나비효과·도덕 등)
const OBSTACLES = [
  '아직 종잣돈이 한 푼도 없어 아는 종목을 사들일 수가 없다',
  '미래를 안다는 걸 들키면 회귀자 사냥꾼/감별자의 표적이 된다',
  '아무도 어린/무명인 제 말을 믿어주지 않는다',
  '제 개입으로 미래가 이미 어긋나 기억과 현실이 맞지 않는다',
  '신분도 인맥도 없어 정보가 있어도 실행할 통로가 없다',
  '이번 생을 바꾸려면 전생의 은인을 먼저 등져야 하는 상황이다',
  '또 다른 회귀자가 한발 앞서 같은 기회를 노리고 있다',
  '미래를 막으면 살릴 수 있지만 다른 누군가가 대신 위험해진다',
  '주변의 “어떻게 그걸 알았지?”라는 의심이 턱밑까지 차올랐다',
  '시간이 촉박해 다음 분기점 전에 손쓸 여유가 없다',
  '아직 몸이 약하고 각성도 안 돼 실력이 지식을 못 따라간다',
  '원수가 지금은 권력의 우위에 있어 정면으로는 승산이 없다',
  '계약·등급·자격이 없어 알아도 시장에 진입할 수가 없다',
  '가족에게 진실을 말할 수 없어 홀로 모든 걸 감당해야 한다',
  '큰 호재를 안다 해도 증명할 길이 없어 모두가 비웃는다',
  '미래 지식이 통하던 영역을 벗어나 처음 보는 변수에 부딪힌다',
  '한 번의 선택으로 두 인생 중 하나를 버려야 하는 기로에 섰다',
  '들키지 않으려 실력을 숨기다 보니 결정적 순간에 발이 묶인다',
]

// 전환·한 수(절정·반전·사건) — 회귀물의 결정적 한 수, 떡밥, 폭로
const TURNS = [
  '망설이던 손가락이 마침내 매수 버튼을 누르고, 며칠 뒤 시세가 정확히 그가 아는 대로 치솟는다',
  '아무도 안 믿던 그의 경고가 현실이 되며, 그 한 사람의 말을 들은 자만 살아남는다',
  '무명의 연습생에게 건넨 한마디가, 훗날 시대를 바꿀 스타의 시작점이 된다',
  '평범한 사거리의 허공이 갈라지며, 그가 예고했던 첫 게이트가 정확히 열린다',
  '“어떻게 알았냐”는 추궁에, 그는 천재인 척 미소로 위기를 비껴간다',
  '죽은 줄 알았던 가족이 멀쩡히 문을 열고 들어서고, 그의 목이 메어온다',
  '전생의 원수가 아직 머리를 조아리는 위치에 있음을 확인하고, 그가 첫 수를 둔다',
  '한 통의 전화/공시가 그가 아는 미래의 시작을 알린다',
  '익숙했던 미래가 처음으로 어긋나며, “이건 내가 아는 전개가 아니야”라는 한기가 스친다',
  '맞은편의 누군가가 그만 아는 미래를 똑같이 입에 올리며, 또 다른 회귀자임을 드러낸다',
  '그가 쌓아온 실력과 인맥이 한 점에 모여, 한때 거대했던 적을 단숨에 무너뜨린다',
  '미래 지식이 통하지 않는 순간, 회귀 후 스스로 단련한 진짜 실력이 빛을 발한다',
  '계좌 잔고/랭킹/등급의 숫자가 한 자릿수 더 늘어, 그의 진척이 눈앞에 증명된다',
  '못 지켰던 그 사람을, 이번 생에서는 단 한 발 앞서 지켜낸다',
  '봉인된 듯했던 첫 각성/시스템 창이 그의 눈앞에 깜빡이며 떠오른다',
  '전생의 마지막 후회가 떠오르며, 막혔던 다음 한 수의 답이 선명해진다',
  '예고했던 대사건이 정확히 그 시각에 터지고, 미리 손쓴 그만이 무사하다',
  '오래 숨겨온 실력을, 얕보던 자들 앞에서 마침내 한순간에 폭발시킨다',
  '바꾸려던 미래가 더 큰 대가를 요구함을 깨닫고, 그가 다른 길을 선택한다',
  '체크리스트의 첫 항목에 그가 줄을 긋고, 다음 목표로 시선을 옮긴다',
]

// 업계·세계관 디테일(다중 슬롯) — 직업군·시스템의 구체 묘사(현실 규칙/절차/용어 곁들임)
const DETAILS = [
  '호가창의 매도벽이 한순간에 걷히며 상한가에 매수 잔량만 쌓여간다(주식·떡상)',
  '장 시작 동시호가에 미리 걸어둔 주문이 시초가에 전량 체결된다(주식·선점)',
  '코인 김치프리미엄이 벌어지는 틈을 정확히 노려 차익을 챙긴다(코인·차익)',
  '미공개 호재 공시가 뜨기 전, 합법적 흐름으로 미리 자리를 잡아둔다(경제·정보우위)',
  '저평가 상가의 권리금을 후려쳐 미래의 노른자위를 헐값에 잡는다(부동산·선점)',
  '헌터협회 등급 측정구가 예상보다 높은 등급을 토해내며 경보음을 울린다(헌터·각성)',
  '던전 안전구역의 마정석을 회수하며 보스방으로 향하는 최단 동선을 탄다(헌터·공략)',
  '시스템 창이 떠오르며 스탯·스킬·경험치 수치가 눈앞에 정렬된다(시스템·성장)',
  '게이트 균열에서 새어 나온 마기가 측정기 바늘을 끝까지 밀어 올린다(헌터·전조)',
  '기획사 데뷔조 명단이 발표되는 순간, 그의 이름이 가장 위에 박힌다(연예·데뷔)',
  '음원 차트가 발매 직후 역주행으로 1위까지 올킬을 찍는다(연예·올킬)',
  '무대 위 카메라 워크와 동선을 미리 짠 듯 완벽하게 소화한다(연예·실연)',
  '오디션 심사위원들이 서로 눈빛을 주고받으며 합격 도장을 꺼낸다(연예·오디션)',
  '스타트업 IR 자료의 한 줄이 투자자들의 펜을 동시에 멈춰 세운다(IT·투자유치)',
  '서버 트래픽 그래프가 출시 첫날부터 수직으로 치솟는다(IT·흥행)',
  '인수합병 계약서의 마지막 서명란에 잉크가 마른다(기업·M&A)',
  '경쟁사보다 한 분기 앞서 신기술 특허를 먼저 출원해 둔다(기술·선점)',
  '회의실 화이트보드의 매출 곡선이 전생의 그것을 한참 웃돈다(기업·실적)',
  '프로 스카우터의 수첩에 아직 무명인 선수의 이름이 처음 적힌다(스포츠·발굴)',
  '솔로랭크 점수가 시즌 최고치를 갱신하며 프로팀 연락이 닿는다(e스포츠·랭킹)',
  '드래프트 지명 순번이 호명되는 순간, 전생과 전혀 다른 구단이 그를 부른다(스포츠·드래프트)',
  '연봉 협상 테이블 위 계약서의 숫자가 전생의 몇 배로 적혀 있다(직업·보상)',
  '웹툰/소설 조회수 그래프가 연재 초반부터 떡상 곡선을 그린다(콘텐츠·흥행)',
  '거래소 알림이 “체결 완료”를 연달아 띄우며 잔고가 불어난다(경제·수익)',
]

// 감각 디테일(다중 슬롯) — 현대 일상 + 회귀 정조의 오감 묘사
const SENSORIES = [
  '익숙한 알람 소리와 함께 코끝에 스미는 옛 자취방의 곰팡내',
  '손끝에 닿는 낡은 폴더폰/구형 키보드의 둔탁한 감촉',
  '심장이 한 박자 멎었다 거세게 뛰는, 회귀를 자각한 순간의 고동',
  '화면 불빛에 비친, 거짓말처럼 젊어진 제 얼굴',
  '코를 찌르는 식은 편의점 커피와 컵라면의 비릿한 냄새',
  '거리에서 흘러나오는, 다시 듣는 그 시절의 유행가 한 소절',
  '목덜미를 스치는 새벽 공기와 모니터의 미지근한 열기',
  '오랜만에 듣는, 아직 살아 있는 가족의 목소리에 메는 목',
  '손바닥에 배어드는, 매수 버튼 위 식은땀',
  '게이트가 열리기 직전 살갗을 따끔하게 누르는 마나의 압력',
  '시스템 알림음이 귓가에 또렷이 울리는 전자음',
  '오래전 잃어버린 줄 알았던 익숙한 향수/비누 냄새',
  '계좌 잔고 숫자를 확인하는 순간 손끝이 떨리는 감각',
  '연습실 거울에 비친, 아직 풋내 나는 무명의 얼굴들',
  '무대 조명 아래 쏟아지는 열기와 관객의 함성',
  '회식 자리 데운 소주의 알싸한 김과 상사의 거슬리는 웃음소리',
  '지하철 승강장으로 밀려오는 바람과 멀리서 다가오는 전동음',
  '병실 특유의 소독약 냄새와 규칙적인 심전도 기계음',
  '서류 더미와 새 명함에서 나는 빳빳한 종이 냄새',
  '비 갠 도심의 젖은 아스팔트와 네온사인이 번지는 물웅덩이',
  '키보드를 두드리는 손끝의 리듬과 서버실의 낮은 팬 소음',
  '오래 쥐고 있던 휴대폰의 따끈한 열기와 진동 알림',
  '면접 대기실의 숨 막히는 정적과 마른침 삼키는 소리',
  '첫눈이 내리는 거리에서 입김이 허옇게 어는 한기',
]

// 다중 슬롯에서 한 번에 뽑을 개수
const DETAIL_COUNT = 2
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

// 전체 조합수: 단일 슬롯 곱 × (업계 디테일 2개 조합) × (감각 디테일 2개 조합)
function totalCombos(): number {
  const detailCombos = choose(DETAILS.length, DETAIL_COUNT)
  const sensoryCombos = choose(SENSORIES.length, SENSORY_COUNT)
  return (
    PLACES.length * TIMES.length * POVS.length * BEATS.length *
    FUTURES.length * OBSTACLES.length * TURNS.length *
    detailCombos * sensoryCombos
  )
}

// ── 슬롯 모델 ──────────────────────────────────────────────────────────
type SlotKey = 'place' | 'time' | 'pov' | 'beat' | 'future' | 'obstacle' | 'turn' | 'detail' | 'sensory'
interface SlotDef { key: SlotKey; label: string; icon: string }
const SLOTS: SlotDef[] = [
  { key: 'place', label: '회귀 무대(현실 시스템)', icon: '🏙️' },
  { key: 'time', label: '시간 좌표', icon: '⏰' },
  { key: 'pov', label: '시점 인물(처지)', icon: '🧑‍💼' },
  { key: 'beat', label: '전개 의도', icon: '🎯' },
  { key: 'future', label: '미래지식(메타정보)', icon: '🔮' },
  { key: 'obstacle', label: '충돌·장애', icon: '⛓️' },
  { key: 'turn', label: '전환·한 수', icon: '⚡' },
  { key: 'detail', label: '업계·세계관 디테일(2)', icon: '📈' },
  { key: 'sensory', label: '감각 디테일(2)', icon: '👂' },
]

interface Beat { tag: string; text: string }
interface Scene {
  place: string
  time: string
  pov: string
  beat: Beat
  future: string
  obstacle: string
  turn: string
  detail: string[]
  sensory: string[]
}

function buildScene(): Scene {
  return {
    place: pick(PLACES),
    time: pick(TIMES),
    pov: pick(POVS),
    beat: pick(BEATS),
    future: pick(FUTURES),
    obstacle: pick(OBSTACLES),
    turn: pick(TURNS),
    detail: pickN(DETAILS, DETAIL_COUNT),
    sensory: pickN(SENSORIES, SENSORY_COUNT),
  }
}

// 장면 글감 한 단락으로 엮기(회귀물 전개 패턴 적용: 무대·시간 → 처지·의도 → 미래지식 → 충돌 → 디테일 → 한 수 → 감각)
function compose(s: Scene): string {
  const detailText = s.detail.join(' 그리고 ')
  const sensoryText = s.sensory.map((d) => `‘${d}’`).join(', ')
  return (
    `${s.place}. ${s.time}. ` +
    `${s.pov}이(가) ${s.beat.text} 장면. ` +
    `그는 ${s.future}. 하지만 ${s.obstacle}. ` +
    `${detailText}. ` +
    `그 순간 — ${s.turn}. ` +
    `(감각: ${sensoryText})`
  )
}

// 짧은 제목용
function titleOf(s: Scene): string {
  return `[${s.beat.tag}] ${s.pov.slice(0, 14)}… · ${s.place.slice(0, 14)}…`
}

// ── 영속 ──────────────────────────────────────────────────────────────
interface SavedScene { id: string; scene: Scene; note: string }
interface Persist { scene: Scene | null; locks: Partial<Record<SlotKey, boolean>>; saved: SavedScene[] }

function isBeat(x: any): x is Beat {
  return x && typeof x.tag === 'string' && typeof x.text === 'string'
}
function isScene(x: any): x is Scene {
  return x && typeof x.place === 'string' && typeof x.time === 'string' &&
    typeof x.pov === 'string' && isBeat(x.beat) && typeof x.future === 'string' &&
    typeof x.obstacle === 'string' && typeof x.turn === 'string' &&
    Array.isArray(x.detail) && Array.isArray(x.sensory)
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

export default function ModfanSceneForge({ payload }: { payload?: Record<string, unknown> }) {
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
      if (locks.time) next.time = prev.time
      if (locks.pov) next.pov = prev.pov
      if (locks.beat) next.beat = prev.beat
      if (locks.future) next.future = prev.future
      if (locks.obstacle) next.obstacle = prev.obstacle
      if (locks.turn) next.turn = prev.turn
      if (locks.detail) next.detail = prev.detail
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
      source: '현판 회귀 장면 생성기',
      tags: ['현대판타지·회귀', '장면', s.beat.tag],
    })
    flashToast('장면 글감을 스니펫으로 저장했어요')
  }

  // ── 연계: 공유 장소 라이브러리(이 장면의 무대를 장소로) ──
  const toLibPlace = (s: Scene) => {
    addToLibrary('places', {
      name: s.place,
      kind: '현판 회귀 무대',
      mood: s.beat.tag,
      sensory: s.sensory.join(' / '),
      notes: compose(s),
      source: '현판 회귀 장면 생성기',
      // 받는 허브(배경 설정집)에서 항목이 기본 칸에 들어가도록 정규(정규화) 키로 매핑한 fields 동봉
      fields: {
        name: s.place,
        kind: '현판 회귀 무대',
        atmosphere: s.beat.tag,
        sensory: s.sensory.join(' / '),
        notes: compose(s),
      },
    })
    flashToast(`무대 ‘${s.place.slice(0, 16)}…’를 공유 장소 라이브러리에 추가했어요`)
  }

  // ── 연계: 프로젝트 원고(원고 › 장면 폴더) ──
  const linked = hasProjectBridge()
  const toProject = (s: Scene, note?: string) => {
    if (!linked) { flashToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = [
      `<p><b>🏙️ 회귀 무대:</b> ${esc(s.place)}</p>`,
      `<p><b>⏰ 시간 좌표:</b> ${esc(s.time)}</p>`,
      `<p><b>🧑‍💼 시점 인물:</b> ${esc(s.pov)}</p>`,
      `<p><b>🎯 전개 의도:</b> [${esc(s.beat.tag)}] ${esc(s.beat.text)} 장면</p>`,
      `<p><b>🔮 미래지식:</b> ${esc(s.future)}</p>`,
      `<p><b>⛓️ 충돌·장애:</b> ${esc(s.obstacle)}</p>`,
      `<p><b>📈 업계·세계관 디테일:</b></p><ul>${s.detail.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>`,
      `<p><b>⚡ 전환·한 수:</b> ${esc(s.turn)}</p>`,
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
      meta: { 전개의도: s.beat.tag, 무대: s.place, 시점인물: s.pov, 미래지식: s.future, 출처: '현판 회귀 장면 생성기' },
    })
    flashToast(id ? '프로젝트 원고(장면 폴더)에 장면을 추가했어요' : '프로젝트에 추가하지 못했습니다.')
  }

  // payload.genre 맥락 배지
  const ctxGenre = payload && typeof (payload as any).genre === 'string' ? String((payload as any).genre).trim() : ''

  // 관련 도구
  const RELATED: { id: string; icon: string; label: string }[] = [
    { id: 'scene-list', icon: '📋', label: '장면 목록' },
    { id: 'setting-bible', icon: '🗺️', label: '배경 설정집' },
    { id: 'character-sheet', icon: '🪪', label: '인물 시트' },
    { id: 'plot-pyramid', icon: '🔺', label: '플롯 피라미드' },
    { id: 'sensory-palette', icon: '🎨', label: '감각 팔레트' },
  ]

  // 슬롯 값 표시(다중 슬롯은 배열)
  const slotIsMulti = (k: SlotKey) => k === 'detail' || k === 'sensory'
  const slotMultiArr = (k: SlotKey): string[] => {
    if (!scene) return []
    if (k === 'detail') return scene.detail
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
        <b>회귀 무대·시간 좌표·처지·전개 의도·미래지식·충돌·한 수·업계 디테일·감각</b>을 무작위로 엮어 하나의 <b>현판 회귀 장면</b>을 만듭니다.
        마음에 드는 칸은 <Emoji e="🔒"/>로 잠그고 나머지만 다시 굴리세요.
      </div>

      {ctxGenre && (
        <div style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 9px' }}>
          <Emoji e="🧭"/> 맥락: {ctxGenre}
        </div>
      )}

      {/* 생성 도구바 + 조합수 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={generate}><Emoji e="🎲"/> {lockedCount ? '나머지 다시 생성' : '장면 생성'}</button>
        {lockedCount > 0 && <span style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="🔒"/> {lockedCount}개 잠금</span>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>
          약 <b style={{ color: 'var(--accent)' }}>{combos.toLocaleString('ko-KR')}</b>가지 조합
        </span>
      </div>

      {toast && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--ok)', color: 'var(--ok)', borderRadius: 8, padding: '7px 10px', fontSize: 12 }}>
          <Emoji e="✅"/> {toast}
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
                <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0 }}><Emoji e={sl.icon}/></div>
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
                >{isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
              </div>
            )
          })}
        </div>

        {/* 조합 글감 */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--accent)', fontSize: 13 }}><Emoji e="⏳"/> 현판 회귀 장면 글감</div>
          <div style={{ fontSize: 14, lineHeight: 1.7, color: scene ? 'var(--text)' : 'var(--muted)' }}>
            {fullText || '〈장면 생성〉을 눌러 현판 회귀 장면을 만들어 보세요.'}
          </div>
        </div>

        {/* 산출물 도구바 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="minibtn" onClick={copyText} disabled={!scene}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 글쓰기에 활용</>}</button>
          <button className="minibtn" onClick={saveScene} disabled={!scene}>☆ 즐겨찾기</button>
          <button className="linkbtn" onClick={() => scene && toSnippet(scene)} disabled={!scene} title="이 장면 글감을 스니펫으로 저장"><Emoji e="📝"/> 스니펫 저장</button>
          <button className="linkbtn" onClick={() => scene && toLibPlace(scene)} disabled={!scene} title="이 장면의 무대를 공유 장소 라이브러리에 추가"><Emoji e="📥"/> 장소 라이브러리</button>
          <button
            className="linkbtn"
            onClick={() => scene && toProject(scene)}
            disabled={!scene || !linked}
            title={linked ? '이 장면을 프로젝트 원고(장면 폴더)에 추가' : '프로젝트에 연결되어 있지 않습니다'}
          ><Emoji e="📄"/> 프로젝트에 추가</button>
        </div>

        {/* 즐겨찾기 */}
        <div>
          <div style={{ ...secTitle, marginBottom: 6 }}>
            <span><Emoji e="⭐"/> 저장한 장면 {saved.length ? `(${saved.length})` : ''}</span>
          </div>
          {!saved.length ? (
            <div style={{ color: 'var(--muted)', fontSize: 12, padding: '8px 2px' }}>아직 저장한 장면이 없습니다. ☆로 마음에 드는 장면을 모아보세요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {saved.map((s) => (
                <div key={s.id} style={savedRow}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}><Emoji e="⏳"/> {titleOf(s.scene)}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>{compose(s.scene)}</div>
                  {editId === s.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditId(''); setEditText('') } }}
                        placeholder="메모 (등장 회차·복선·회수 시점 등)"
                        style={noteInput}
                      />
                      <button className="minibtn" onClick={commitEdit}>저장</button>
                      <button className="minibtn" onClick={() => { setEditId(''); setEditText('') }}>취소</button>
                    </div>
                  ) : (
                    <>
                      {s.note && <div style={{ fontSize: 11.5, color: 'var(--accent)' }}><Emoji e="📝"/> {s.note}</div>}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="minibtn" onClick={() => loadSaved(s)} title="이 장면을 위에 불러오기">↩ 불러오기</button>
                        <button className="linkbtn" onClick={() => toSnippet(s.scene)} title="스니펫으로 저장"><Emoji e="📝"/> 스니펫</button>
                        <button className="linkbtn" onClick={() => toLibPlace(s.scene)} title="공유 장소 라이브러리에 추가"><Emoji e="📥"/> 장소</button>
                        <button className="linkbtn" onClick={() => toProject(s.scene, s.note || undefined)} disabled={!linked} title={linked ? '프로젝트 원고(장면 폴더)로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트</button>
                        <button className="minibtn" onClick={() => startEdit(s)} title="메모 편집"><Emoji e="✏️"/></button>
                        <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제"><Emoji e="🗑️"/></button>
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
          <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, ctxGenre ? { genre: ctxGenre } : { genre: '현대판타지·회귀' })} title={`${r.label} 열기`}>
            <Emoji e={r.icon}/> {r.label}
          </button>
        ))}
      </div>

      <div className="license-note" style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'right' }}>
        로컬 자작 데이터 · 외부 네트워크 없음 · 생성 장면은 출발점일 뿐 자유롭게 비틀어 보세요
      </div>
    </div>
  )
}
