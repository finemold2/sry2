// 스릴러·서스펜스 장면 생성기(ThrillerSceneForge) — 이 장르의 전형 장면을, 도시에(dossier)에 근거한
//  요소 슬롯(압박 공간·시각/날씨·시점 인물·위협/적대자·티킹 클락·정보 비대칭·전환/반전·감각 디테일·전개법)으로 조합 생성한다.
//  심리/도메스틱·리걸·스파이/정치·법의학/수사·액션/추적·테크노/생존 등 하위유형을 '전개법' 슬롯으로 적용해,
//  같은 무대라도 서스펜스(독자>인물)·카운트다운·언리라이어블 내레이터·클리프행어 등 장르 관습에 맞춰
//  한 편의 장면 설계로 엮는다(완전 로컬, 외부 API 없음).
//  슬롯별 🔒 잠금 + 🎲 부분 재생성. 가능한 조합 1조(1,000,000,000,000) 이상.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(보관함)만 사용.
// 연계(linkbus): addToProject(folder:'장면')·장면 목록(scene-list)·배경/스니펫 라이브러리·관련 도구 열기.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = { id: 'thriller-sceneforge', name: '스릴러 장면 생성기(1조+ 조합)', icon: '🕵️', group: '생성기', genre: '스릴러·서스펜스', intro: '압박 공간·위협·티킹 클락·정보 비대칭·반전과 하위유형 전개법을 굴려 스릴러 전형 장면을 1조+ 조합으로 설계하세요', w: 600, h: 720 }

const LS = 'sry:tool:thriller-sceneforge'

// ---------------------------------------------------------------------------
// 슬롯 정의 — 각 슬롯은 스릴러 장면의 한 축. faces 는 도시에에 근거한 자작 로컬 풀(장르 특화·구체적).
//  도시에 §7 "배경 자체가 압박 장치"(폐쇄·고립·감시·탈출 불가), §3 서사 장치(티킹 클락·정보 비대칭·
//  레드 헤링·체호프의 총·맥거핀·언리라이어블 내레이터·추격/은신/함정·잘못된 신뢰), §5 클라이맥스 관습을 반영.
//  풀을 크게 잡아 9개 슬롯 조합이 1조(10^12)를 가뿐히 넘도록 설계.
// ---------------------------------------------------------------------------
interface Slot { key: string; label: string; icon: string; desc: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'place', label: '압박 공간', icon: '🏚️', desc: '배경 자체가 압박 장치 — 폐쇄·고립·감시·탈출 불가의 무대',
    faces: [
      '폭설로 고립된 외딴 산장, 전화선이 끊긴 거실',
      '정전된 고층 빌딩의 비상계단, 비상등만 깜빡이는',
      '두 층 사이에 멈춰 선 엘리베이터 안',
      '승객이 모두 잠든 야간 침대 열차의 좁은 복도',
      '난기류를 만난 여객기의 어두운 기내',
      '잠수함 깊은 곳, 압력 경보가 울리는 기관실',
      '인적 끊긴 새벽 지하 주차장, 형광등이 점멸하는',
      '환자가 사라진 폐쇄 병동의 긴 복도',
      '도청 장치가 깔린 안전가옥의 거실',
      '배심원이 퇴장한 텅 빈 법정',
      '증거물 보관실의 잠긴 철문 앞',
      '비 내리는 새벽 부두, 컨테이너가 늘어선 항만',
      '교외 주택가의 완벽해 보이는 2층집 부엌',
      'CCTV가 사방을 비추는 스마트홈 거실',
      '눈보라에 갇힌 고속도로 휴게소',
      '취조실, 한쪽 면이 매직미러인 좁은 방',
      '폐업한 놀이공원의 멈춘 회전목마 앞',
      '지하 벙커의 봉인된 격벽 안쪽',
      '국경 검문소, 줄지어 선 차량 사이',
      '안개에 잠긴 외딴 섬의 유일한 등대',
      '도심 한복판 옥상, 난간 너머로 도로가 까마득한',
      '환승 시간이 빠듯한 새벽 공항 터미널',
      '지하철 막차가 끊긴 텅 빈 승강장',
      '범행 현장이 보존된 채 봉인된 아파트',
      '약물에 취한 듯 깨어난 낯선 호텔 방',
      '도주 중 숨어든 폐교의 어두운 교실',
      '수사본부, 화이트보드에 사진이 빼곡한 회의실',
      '용의자의 차에 동승한 채 달리는 한밤의 국도',
      '비밀번호로 잠긴 서재, 누군가 다녀간 흔적이 있는',
      '인질이 갇힌 창고, 환풍구만 빛이 드는',
      '재판 전야의 구치소 접견실',
      '도청이 의심되는 회사 임원실',
      '눈 위에 발자국 하나만 찍힌 외딴 별장 진입로',
      '정전된 데이터센터의 서버랙 사이 통로',
      '실종자의 방, 시계만 멈춰 선 채 그대로인',
      '폭우로 다리가 끊긴 산골 마을의 단 한 채 집',
      '해체 직전의 폐건물, 비상구가 막힌',
      '감시 카메라가 꺼진 단 3분, 텅 빈 로비',
      '한밤의 응급실, 환자가 한 명도 없는',
      '대피 사이렌이 울리는 무인 공장 단지',
    ],
  },
  {
    key: 'time', label: '시각·날씨', icon: '🌧️', desc: '시각과 날씨 — 긴장과 고립을 빚는 배경',
    faces: [
      '해 뜨기 직전, 모두가 가장 깊이 잠든 새벽',
      '폭우가 증거를 씻어 내리는 자정 무렵',
      '안개가 시야를 한 치 앞으로 좁힌 이른 아침',
      '눈보라가 길과 발자국을 지우는 한밤중',
      '정전으로 도시 전체가 어둠에 잠긴 한여름 밤',
      '천둥이 비명을 삼켜 버리는 폭풍의 밤',
      '땅거미가 지며 그림자가 길어지는 저녁',
      '열대야로 잠 못 드는 끈적한 새벽 두 시',
      '첫차가 끊기고 막차도 떠난 텅 빈 시각',
      '백미러 속 미행 차량의 헤드라이트만 또렷한 밤',
      '약효가 떨어지기 시작하는 새벽녘',
      '재판 개정을 몇 시간 앞둔 잿빛 아침',
      '진눈깨비가 흩날려 카메라가 흐려지는 저물녘',
      '사이렌이 멀어졌다 다시 가까워지는 자정',
      '눈이 그치고 세상이 비현실적으로 고요한 새벽',
      '교대 근무자가 자리를 비운 단 한 시간',
      '폭염 속 아지랑이로 거리가 일렁이는 한낮',
      '통신이 끊긴 채 시간만 흐르는 깊은 밤',
      '마지막 비행기가 이륙하기 직전의 활주로 끝',
      '비상등마저 깜빡이다 꺼지기 직전의 순간',
      '서리가 창에 핀 채 입김이 보이는 이른 아침',
      '도청기의 배터리가 다해 가는 늦은 밤',
      '해가 수평선에 걸려 길게 늘어진 그림자의 황혼',
      '폭우가 천장을 두드려 발소리를 가려 주는 밤',
      '도시의 불이 하나둘 꺼져 가는 통금의 시각',
      '안개경보가 내린 부두의 동트기 전',
      '정각이 되기 1분 전, 초침만 들리는 정적',
      '폭염주의보 속 에어컨마저 멎은 한낮의 사무실',
      '눈 덮인 산길에 차 한 대 다니지 않는 새벽',
      '제보 전화가 걸려 오는 늦은 밤 열한 시',
    ],
  },
  {
    key: 'pov', label: '시점 인물', icon: '🔦', desc: '이 장면을 살아내는 주인공(유능하지만 취약한 POV)',
    faces: [
      '한 건만 더 하고 은퇴하려는 트라우마에 시달리는 형사',
      '의뢰인의 무죄를 의심하기 시작한 야심 찬 변호사',
      '내부 고발을 준비하다 정체가 탄로 난 첩보 요원',
      '연쇄살인범의 다음 표적을 추적하는 프로파일러',
      '시신의 사인을 두고 상부와 충돌하는 법의관',
      '누명을 쓰고 도주 중인 평범한 회사원',
      '기억을 잃은 채 손에 피를 묻히고 깨어난 여자',
      '딸을 찾으려 모든 규칙을 어기는 아버지',
      '완벽한 결혼 뒤 남편의 비밀을 발견한 아내',
      '죽은 언니의 흔적을 좇는 신참 기자',
      '이중 첩자로 의심받는 안전가옥 관리인',
      '재판 하루 전 결정적 증거를 손에 쥔 검사',
      '환자의 죽음에 의문을 품은 야간 당직 간호사',
      '아내가 사라진 날의 알리바이가 없는 남자',
      '협박 메일을 받기 시작한 인기 작가',
      '잠입 수사 중 정체가 흔들리는 위장 경찰',
      '목격한 살인을 아무도 믿어 주지 않는 노인',
      '인질이 된 채 범인의 약점을 읽어 가는 협상가',
      '회사의 회계 조작을 우연히 발견한 신입 사원',
      '실종된 아이의 마지막 목격자로 지목된 보모',
      '죽었다 살아 돌아온 줄 알았던 옛 파트너',
      '알코올에 의존하며 사건을 재수사하는 퇴직 형사',
      '거짓말을 들킬까 두려운 신뢰할 수 없는 화자',
      '증인 보호 프로그램 속에서 다시 쫓기는 증인',
      '약물에 취해 기억이 토막 난 채 진술하는 용의자',
      '해커에게 모든 사생활을 장악당한 직장인',
      '딸의 SNS에서 낯선 위협을 발견한 어머니',
      '의문의 자살 사건을 타살로 보는 보험 조사관',
      '죽은 약혼자의 휴대폰 잠금을 푼 약혼녀',
      '동료가 흑막일지 모른다 의심하기 시작한 수사관',
      '한밤의 제보 전화를 받은 사회부 기자',
      '폐쇄된 마을에서 유일하게 진실을 의심하는 외지인',
      '국경을 넘으려는 망명자를 호송하는 요원',
      '판결을 뒤집을 증언을 망설이는 유일한 목격자',
      '자신의 결백을 증명할 시간이 줄어드는 도망자',
      '아버지의 죽음을 우연으로 받아들이지 못하는 딸',
    ],
  },
  {
    key: 'threat', label: '위협·적대자', icon: '🔪', desc: '주인공을 압박하는 만만찮은 적대자·임박한 위험(스릴러의 질은 빌런의 질에 비례)',
    faces: [
      '한발 앞서 모든 동선을 읽고 있는 지능형 살인범',
      '경찰 내부에 심어 둔 끄나풀을 가진 조직',
      '증거를 차례로 인멸하며 주인공을 옭아매는 진범',
      '주인공의 가족을 인질로 삼겠다 협박하는 목소리',
      '법망의 허점을 완벽히 아는 부패한 권력자',
      '피해자를 가장한 채 곁에 머무는 가해자',
      '미행 차량 한 대가 거리를 둔 채 따라붙는다',
      '익명의 협박 메시지가 실시간으로 도착한다',
      '도청으로 모든 대화가 새어 나가고 있다',
      '신뢰하던 상관이 사건의 설계자임이 의심된다',
      '카운트다운이 걸린 폭발물이 어딘가에 있다',
      '주인공의 정체를 폭로하겠다는 협박자',
      '범인이 다음 희생자를 예고하며 게임을 건다',
      '내부 정보를 쥔 채 침묵을 강요하는 회사',
      '죽은 줄 알았던 숙적이 더 치밀해져 돌아왔다',
      '주인공의 알리바이를 조작해 누명을 씌우는 자',
      '약물로 주인공의 판단을 흐리게 만드는 누군가',
      '얼굴 없는 스토커가 집 안 물건을 옮겨 놓는다',
      '권력층을 등에 업은 청부 살인 조직',
      '주인공보다 사건을 더 잘 아는 자가 단서를 흘린다',
      '인질의 목숨을 협상 카드로 쥔 냉정한 범인',
      '거짓 증거로 재판을 좌우하려는 거대 로펌',
      '주인공의 모든 통화를 엿듣는 정보기관',
      '국경을 넘기 전에 입을 막으려는 추격조',
      '병원 안에서 환자를 조용히 제거하는 내부자',
      '진실을 아는 증인을 차례로 침묵시키는 손길',
      '주인공의 과거 비밀을 미끼로 협박하는 자',
      '시스템을 장악해 알리바이를 지워 버린 해커',
      '가장 가까운 사람이 사실 흑막이었다',
      '폐쇄된 공간의 출구를 하나씩 봉쇄하는 적',
      '주인공을 미끼로 더 큰 표적을 노리는 배후',
      '경찰과 범인 양쪽에게 동시에 쫓기는 상황',
    ],
  },
  {
    key: 'clock', label: '티킹 클락', icon: '⏳', desc: '시간 압박 — 명시 타이머/자연 마감/사회적 마감(도시에 §3 핵심 장치)',
    faces: [
      '폭탄 타이머가 단 47분을 남기고 줄어든다',
      '재판 개정까지 결정적 증거를 찾을 시간이 없다',
      '약효가 떨어지면 진실을 말할 수 없게 된다',
      '날이 밝으면 호송 차량이 떠나 버린다',
      '마지막 비행기가 30분 뒤 이륙한다',
      '인질의 산소가 바닥나기까지 한 시간 남았다',
      '다음 희생자의 예고된 시각이 다가온다',
      '증인이 자정에 사라지기로 되어 있다',
      '서버 로그가 정시에 자동 삭제된다',
      '밀물이 차오르면 갇힌 공간이 잠긴다',
      '배심원 평결이 한 시간 뒤 내려진다',
      '추격자가 도착하기 전에 흔적을 지워야 한다',
      '제보자의 연락이 끊기기 전 위치를 알아내야 한다',
      '교대 근무자가 돌아오기 전 방을 빠져나가야 한다',
      'CCTV가 다시 켜지기까지 단 3분뿐이다',
      '약속한 송금 시각이 지나면 인질이 위험하다',
      '눈보라가 길을 완전히 막기 전에 내려가야 한다',
      '범인이 알리바이를 굳히기 전에 자백을 받아야 한다',
      '기차가 다음 역에서 멈추기 전이 마지막 기회다',
      '협박범이 정한 데드라인이 점점 가까워진다',
      '수술이 시작되면 환자의 증언을 들을 수 없다',
      '폭로 기사가 인쇄에 들어가기 전 진실을 막아야 한다',
      '국경 검문이 강화되는 새벽이 오기 전에 넘어야 한다',
      '독이 퍼지기 전 해독제를 찾아야 한다',
      '범인이 도시를 떠나는 막차 시각이 임박했다',
      '구조대가 도착하기 전 범인이 먼저 닿을 것이다',
      '통화 추적이 끝나기 전에 끊어야 한다',
      '시한부 협상이 결렬되면 모든 것이 무너진다',
      '자백의 효력이 사라지는 마감 시한이 다가온다',
      '전원이 완전히 나가기 전 문을 열어야 한다',
    ],
  },
  {
    key: 'irony', label: '정보 비대칭', icon: '🎭', desc: '누가 무엇을 아는가 — 서스펜스(독자>인물)·동행·반전을 가르는 핵심(도시에 §3)',
    faces: [
      '독자만 위협의 정체를 알고, 인물은 모른 채 다가간다(서스펜스)',
      '독자만 폭탄의 존재를 알고 인물은 평온히 대화한다(히치콕식)',
      '독자가 배신자가 누구인지 아는데 주인공만 그를 믿는다',
      '독자와 인물이 같은 단서를 동시에 마주한다(동행)',
      '인물은 진실을 알지만 독자에게는 결정적 한 조각이 가려진다',
      '주인공이 거짓말하고 있음을 독자만 눈치챈다',
      '레드 헤링이 독자와 인물 모두를 엉뚱한 용의자로 이끈다',
      '인물의 기억이 신뢰할 수 없어 독자도 진위를 의심한다',
      '두 시점이 교차하며 한쪽만 아는 사실이 긴장을 만든다',
      '같은 사실이 1회독엔 무해, 재독엔 결정적이 되도록 배치된다',
      '주변 인물 모두가 아는 비밀을 주인공만 모른다',
      '독자는 알리바이가 거짓임을 아는데 수사관은 믿는다',
      '범인이 독자를 향해 거의 다 알려 주되 정체만 숨긴다',
      '신뢰할 수 없는 화자가 의도적으로 사실을 누락한다',
      '관객만 함정의 위치를 알고 인물은 그쪽으로 걸어간다',
      '주인공의 조력자가 사실 적임을 독자만 안다',
      '거의 다 풀린 진실에서 단 한 조각만 끝까지 가려진다',
      '인물이 안다고 믿는 것이 사실 조작된 정보다',
      '독자는 두 인물의 진짜 관계를 알고 둘은 서로 속인다',
      '카메라(서술)가 보여 준 것과 인물의 진술이 어긋난다',
      '독자만 시한이 임박했음을 알고 인물은 여유를 부린다',
      '진범이 수사 회의에 태연히 앉아 있음을 독자만 안다',
      '주인공의 선의가 사실 적의 계획에 이용되고 있다',
      '같은 장면을 다른 시점으로 다시 보여 주며 진실을 뒤집는다',
    ],
  },
  {
    key: 'turn', label: '전환·반전', icon: '🌀', desc: '판을 뒤집는 결정적 한 수·복선 회수(공정한 반전)',
    faces: [
      '믿었던 조력자가 사실 모든 일의 배후였다',
      '죽은 줄 알았던 인물이 살아서 나타난다',
      '편지 한 통(녹음 한 줄)이 모든 진술을 뒤집는다',
      '범인이 가장 가까운 사람이었음이 드러난다',
      '주인공의 기억이 조작된 것이었음이 밝혀진다',
      '초반에 무심히 보여 준 흉터/약/비밀번호가 결정타가 된다',
      '피해자가 사실 가해자였음이 폭로된다',
      '두 사건이 사실 한 사람의 소행이었다',
      '알리바이의 빈틈이 거꾸로 범인을 지목한다',
      '신뢰할 수 없던 화자의 진실이 마지막에 드러난다',
      '레드 헤링이 걷히고 진짜 단서가 처음부터 거기 있었다',
      '주인공이 쫓던 자가 사실 그를 보호하고 있었다',
      '맥거핀 속에 진짜 비밀이 들어 있지 않았다',
      '인질이 사실 공범이었음이 밝혀진다',
      '경찰 내부의 끄나풀이 누구인지 폭로된다',
      '위협이 끝난 듯한 순간 마지막 한 방이 솟구친다',
      '진범이 자백 도중 탈출을 시도한다',
      '주인공의 정체가 추격자에게 드러난다',
      '죽음의 진짜 사인이 사고가 아닌 살인으로 뒤집힌다',
      '구원자라 믿었던 자가 비극의 설계자였다',
      '쌍둥이/형제 관계가 모든 알리바이를 무너뜨린다',
      '마지막 한 줄이 평온한 결말을 다시 뒤집는다(스팅어)',
      '주인공 자신이 무의식중에 진범이었다',
      '복선으로 깔린 사진 한 장이 진실을 한꺼번에 재배열한다',
      '시간선이 어긋나 있었고 사건의 순서가 뒤바뀐다',
      '협박범의 목소리가 사실 주인공이 아는 사람이었다',
      '증거를 인멸한 사람이 피해자의 가족이었다',
      '도주를 도운 조력자가 추격조의 일원이었다',
      '진짜 표적은 주인공이 아니라 그가 지키려던 사람이었다',
      '마지막 문이 열리자 추격자가 먼저 와 기다리고 있다',
    ],
  },
  {
    key: 'sensory', label: '감각 디테일', icon: '🫀', desc: '긴장을 살리는 한 줄의 감각 — 청각·촉각 강조(도시에 §6)',
    faces: [
      '등줄기를 타고 흐르는 식은땀의 차가운 감촉',
      '어둠 속 어디선가 다가오는 발소리',
      '울리지 않던 전화가 갑자기 정적을 찢는다',
      '백미러 속에서 거리를 좁히는 헤드라이트',
      '깜빡이는 형광등이 만드는 불규칙한 그림자',
      '잠긴 문손잡이가 안에서 천천히 돌아간다',
      '심장 박동이 귓속에서 북처럼 울린다',
      '혀끝에 도는 피 맛, 깨문 입술의 통증',
      '목덜미에 닿는 누군가의 숨결 같은 찬 기운',
      '복도 끝에서 멎었다 다시 이어지는 발소리',
      '빗방울이 창을 두드려 다른 소리를 삼킨다',
      '손끝에 닿는 차가운 권총의 금속 감촉',
      '천장에서 똑, 똑 떨어지는 물방울 소리',
      '낯익은 향수 냄새가 빈방에 남아 있다',
      '카운트다운하는 타이머의 붉은 숫자',
      '발밑에서 바스러지는 깨진 유리 조각',
      '숨을 멈춘 채 들리는 자신의 맥박 소리',
      '문틈으로 새어 드는 가느다란 손전등 불빛',
      '입안이 바짝 마르고 침이 넘어가지 않는다',
      '멀리서 가까워지는 사이렌의 도플러',
      '사라진 물건이 미묘하게 다른 자리에 놓여 있다',
      '식은 커피잔에 남은 누군가의 온기',
      '휴대폰 화면이 어둠 속에서 홀로 밝혀진다',
      '발자국 하나가 눈 위에 더 찍혀 있다',
      '닫히는 엘리베이터 문틈으로 마주친 시선',
      '귀를 막아도 파고드는 초침의 째깍임',
      '손가락이 떨려 열쇠가 자물쇠에 들어가지 않는다',
      '벽 너머에서 멈춘 누군가의 그림자',
      '비릿한 철 냄새가 코끝을 스친다',
      '경보음이 울리다 갑자기 뚝 끊긴 정적',
    ],
  },
  {
    key: 'mode', label: '전개법(하위유형)', icon: '📑', desc: '하위유형 관습으로 장면을 엮는 전개 틀(도시에 §1·§3·§4·§5)',
    faces: [
      '심리·도메스틱: 안전해야 할 일상(집·결혼·이웃)을 위협의 근원으로 전도시킨다',
      '서스펜스 우위: 독자에게 위협을 먼저 보여 주고(폭탄 정의) 긴장을 길게 끈다',
      '언리라이어블 내레이터: 화자의 거짓·기억 공백으로 독자의 판단을 흔든다',
      '리걸 스릴러: 공판 일정·증거개시·배심을 티킹 클락으로 삼아 법정에서 결판낸다',
      '스파이·정치: 도덕적 회색지대에서 신뢰가 무너지고 누구도 믿을 수 없게 한다',
      '법의학·수사: 단서를 한 조각씩 흘려(슬로 리빌) 프로파일링으로 윤곽을 좁힌다',
      '액션·추적: 추격·은신·함정의 물리적 긴장을 짧은 장면으로 끊어 가속한다',
      '테크노·생존: 폐쇄·고립 공간에서 자원과 시간을 두고 생존을 다툰다',
      '카운트다운 절차물: 명시 타이머를 걸고 0초와 클라이맥스를 일치시킨다',
      '클리프행어 챕터: 결정·폭로·역전 직전에서 장을 끊어 다음을 부른다',
      '레드 헤링 설계: 의심을 엉뚱한 용의자로 유도해 진짜 단서를 가린다',
      '체호프의 총 회수: 초반에 심은 무해한 요소를 클라이맥스에서 결정타로 거둔다',
      '캣 앤 마우스: 주인공과 적대자가 한발씩 앞서거니 뒤서거니 두뇌 싸움을 벌인다',
      '이중 시점·시간선 분절: 「지금」과 「그때」를 교차해 정보를 통제·지연한다',
      '잘못된 신뢰: 조력자를 배신자로, 권위자를 흑막으로 두어 편집증을 조성한다',
      '위협 에스컬레이션: 매 시퀀스 위험을 한 단 올린다(개인→가까운 이→다수)',
      '가치 전환 장면: 장면을 +에서 −(또는 그 반대)로 반드시 뒤집어 정체를 막는다',
      '올 이즈 로스트: 조력자 상실·신뢰 붕괴로 모든 것을 잃은 바닥을 찍는다',
      '직접 대면 클라이맥스: 주인공의 능동적 선택으로 적과 정면 충돌하게 한다',
      '최악의 조건 결전: 무장 해제·고립·부상·시간 부족의 가장 불리한 상태로 몬다',
      '거짓 결말·막판 부활: 끝난 듯한 위협이 한 번 더 솟구치게 한다',
      '도덕적 대가: 승리에 반드시 희생·상처를 비용으로 부과한다(무손실 승리 금지)',
      '다크·오픈 엔딩: 승리를 박탈하거나 끝나지 않은 불안을 남기고 한 줄 스팅어로 닫는다',
      '콜드 오픈: 시체 발견/미래 위기를 먼저 던지고 「○○시간 전」으로 회귀시킨다',
    ],
  },
]

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const fmt = (n: number) => n.toLocaleString('ko-KR')

// 활성 슬롯들의 조합 가짓수.
function comboCount(activeKeys: string[]): number {
  return activeKeys.reduce((acc, k) => {
    const s = SLOTS.find((x) => x.key === k)
    return acc * (s ? s.faces.length : 1)
  }, 1)
}
// 전체 풀 기준 최대 조합(타이틀·표시용) — 1조 초과 검증.
const MAX_COMBOS = SLOTS.reduce((n, s) => n * s.faces.length, 1)

// 굴린 조각들을 한 편의 스릴러 장면 설계로 엮는다.
function compose(by: Record<string, string>): string {
  const narr: string[] = []
  if (by.place && by.time) narr.push(`${by.place}, ${by.time}.`)
  else if (by.place) narr.push(`${by.place}.`)
  else if (by.time) narr.push(`${by.time}.`)
  if (by.pov) narr.push(`${by.pov}이(가) 그 한가운데 있다.`)
  if (by.threat) narr.push(`위협: ${by.threat}.`)
  if (by.clock) narr.push(`시한 — ${by.clock}.`)
  if (by.irony) narr.push(`정보 비대칭: ${by.irony}.`)
  if (by.turn) narr.push(`그리고 결정적 전환, ${by.turn}.`)
  if (by.sensory) narr.push(`(감각: ${by.sensory}.)`)
  let out = narr.join(' ')
  if (by.mode) out += `\n\n▷ 전개법 — ${by.mode}`
  return out.trim()
}

// 슬롯별 분해 라인(복사/저장/프로젝트용)
function rowsTextOf(by: Record<string, string>, keys: string[]): string {
  return keys
    .map((k) => {
      const s = SLOTS.find((x) => x.key === k)
      return s && by[k] ? `${s.icon} ${s.label}: ${by[k]}` : ''
    })
    .filter(Boolean)
    .join('\n')
}

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface Saved { id: string; text: string; note: string; slots: string; rows: string; title: string }

export default function ThrillerSceneForge({ payload }: { payload?: Record<string, unknown> }) {
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
  const [results, setResults] = useState<Record<string, string>>(() =>
    Object.fromEntries(SLOTS.map((s) => [s.key, pick(s.faces)])))
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)

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
            title: typeof s.title === 'string' ? s.title : '',
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

  // 페이로드로 슬롯 프리셋/장르 진입 처리(연계). 1회.
  useEffect(() => {
    const want = payload?.slots
    if (Array.isArray(want)) {
      const valid = want.filter((k): k is string => typeof k === 'string' && SLOTS.some((s) => s.key === k))
      if (valid.length) setActive(SLOTS.filter((s) => valid.includes(s.key)).map((s) => s.key))
    }
    // 다른 도구에서 '스릴러·서스펜스' 장르로 진입 시 안내 토스트(payload.genre 활용)
    if (typeof payload?.genre === 'string' && (payload.genre.includes('스릴러') || payload.genre.includes('서스펜스'))) {
      setToast('스릴러 장면 설계를 시작합니다. 🎲 굴려 보세요.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { try { localStorage.setItem(LS + ':active', JSON.stringify(active)) } catch { /* ignore */ } }, [active])
  useEffect(() => { try { localStorage.setItem(LS + ':saved', JSON.stringify(saved)) } catch { /* ignore */ } }, [saved])

  // 비활성 슬롯의 잠금 정리(결과는 보존해 재활성 시 즉시 표시)
  useEffect(() => {
    setLocked((prev) => {
      const next: Record<string, boolean> = {}
      active.forEach((k) => { if (prev[k]) next[k] = true })
      return next
    })
  }, [active])

  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 320)
    return () => window.clearTimeout(t)
  }, [rolling])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1900)
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
        if (prev.length <= 1) return prev
        return prev.filter((k) => k !== key)
      }
      return SLOTS.filter((s) => prev.includes(s.key) || s.key === key).map((s) => s.key)
    })
  }

  const forgeAll = useCallback(() => {
    const my = ++nonce.current
    setRolling(true)
    setResults((prev) => {
      if (my !== nonce.current) return prev
      const next: Record<string, string> = { ...prev }
      active.forEach((k) => {
        if (locked[k]) return
        const slot = SLOTS.find((s) => s.key === k)
        if (!slot) return
        let f = pick(slot.faces)
        if (f === prev[k] && slot.faces.length > 1) f = pick(slot.faces)
        next[k] = f
      })
      return next
    })
  }, [active, locked])

  const rollOne = (key: string) => {
    if (locked[key]) return
    setRolling(true)
    setResults((prev) => {
      const slot = SLOTS.find((s) => s.key === key)
      if (!slot) return prev
      let f = pick(slot.faces)
      if (f === prev[key] && slot.faces.length > 1) f = pick(slot.faces)
      return { ...prev, [key]: f }
    })
  }

  const toggleLock = (key: string) => setLocked((prev) => ({ ...prev, [key]: !prev[key] }))

  const byKey: Record<string, string> = {}
  active.forEach((k) => { if (results[k]) byKey[k] = results[k] })
  const hasResults = Object.keys(byKey).length > 0
  const story = hasResults ? compose(byKey) : ''
  const combos = comboCount(active)
  const slotLabelLine = active.map((k) => SLOTS.find((s) => s.key === k)?.label || k).join('·')
  const sceneTitle = `${byKey.pov ? byKey.pov.slice(0, 14) : '스릴러 장면'} · ${byKey.place ? byKey.place.slice(0, 16) : ''}`.replace(/ · $/, '')
  const rowsText = () => rowsTextOf(byKey, active)

  const saveCurrent = () => {
    if (!hasResults) return
    setSaved((prev) => {
      if (prev.some((s) => s.text === story)) { setToast('이미 보관함에 있습니다.'); return prev }
      const rec: Saved = {
        id: 'sv_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4).toString(36),
        text: story, note: '', slots: slotLabelLine, rows: rowsText(), title: sceneTitle,
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

  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setToast('복사에 실패했습니다.') }
  }
  const copy = (key: string, text: string) => {
    const done = () => { if (mounted.current) setCopiedKey(key) }
    try {
      if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done)) }
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }

  // 프로젝트 본문(HTML)
  const bodyHtmlFor = (title: string, text: string, rows: string, slots: string) => {
    const paras = text.split('\n').filter(Boolean).map((ln) => `<p style="line-height:1.8;">${escHtml(ln)}</p>`).join('')
    const rowLines = rows ? rows.split('\n').filter(Boolean).map((ln) => `<p>${escHtml(ln)}</p>`).join('') : ''
    return [
      `<p style="font-size:15px;"><b>${escHtml(title)}</b></p>`,
      paras, `<hr/>`,
      slots ? `<p><b>슬롯 조합:</b> ${escHtml(slots)}</p>` : '',
      rowLines,
    ].join('')
  }

  // 프로젝트 연동 — 현재 장면을 원고(draft)/'장면' 폴더에 문서로 추가.
  const addStoryToProject = () => {
    if (!hasResults) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '장면',
      title: `🕵️ ${sceneTitle}`,
      bodyHtml: bodyHtmlFor(sceneTitle, story, rowsText(), slotLabelLine),
      synopsis: story.split('\n')[0] || sceneTitle,
      meta: {
        장르: '스릴러·서스펜스',
        압박공간: byKey.place ? byKey.place.slice(0, 30) : '—',
        시점인물: byKey.pov ? byKey.pov.slice(0, 30) : '—',
        티킹클락: byKey.clock ? byKey.clock.slice(0, 30) : '—',
        전개법: byKey.mode ? byKey.mode.split(':')[0] : '—',
      },
    })
    setToast(id ? '프로젝트 원고 〈장면〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }
  const addSavedToProject = (s: Saved) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '장면',
      title: `🕵️ ${s.title || '스릴러 장면'}`,
      bodyHtml: bodyHtmlFor(s.title || '스릴러 장면', s.text, s.rows, s.slots) + (s.note ? `<p style="color:#888;">📝 ${escHtml(s.note)}</p>` : ''),
      synopsis: s.text.split('\n')[0] || s.title,
      meta: { 장르: '스릴러·서스펜스' },
    })
    setToast(id ? '프로젝트 〈장면〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 장면 목록 도구로 보내기(연계)
  const toSceneList = () => {
    if (!hasResults) return
    openToolLinked('scene-list', {
      scene: {
        title: sceneTitle, summary: story.split('\n')[0] || story,
        pov: byKey.pov || '', place: byKey.place || '',
        goal: byKey.clock || '', conflict: byKey.threat || '', mood: byKey.time || '',
      },
      genre: '스릴러·서스펜스',
    })
    setToast('장면 목록으로 보냈습니다.')
  }
  // 배경 라이브러리에 압박 공간 저장
  const toLibPlace = () => {
    if (!byKey.place) return
    addToLibrary('places', {
      name: byKey.place, kind: '스릴러 압박 공간', mood: byKey.time || '',
      sensory: byKey.sensory || '', notes: story, source: '스릴러 장면 생성기',
      fields: {
        name: byKey.place || '',
        kind: '스릴러 압박 공간',
        atmosphere: byKey.time || '',
        sensory: byKey.sensory || '',
        notes: story || '',
      },
    })
    setToast('배경 라이브러리에 압박 공간을 저장했습니다.')
  }
  // 스니펫(글감) 저장
  const saveSnippet = (text: string, slots: string) => {
    if (!text) return
    addToLibrary('snippets', {
      text: `[스릴러 장면] ${text}`,
      source: '스릴러 장면 생성기',
      tags: ['글감', '스릴러', '서스펜스', '장면', ...slots.split('·').filter(Boolean)],
    })
    setToast('스니펫 라이브러리에 저장했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const cardBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>압박 공간·시각/날씨·시점 인물·위협/적대자·티킹 클락·정보 비대칭·전환/반전·감각·전개법</b> 슬롯을 굴려, 스릴러 전형 장면을 한 편의 설계로 엮습니다. 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 <Emoji e="🎲"/> 굴리세요. <b>전개법</b> 슬롯이 심리·도메스틱·리걸·스파이·법의학·액션 추적 등 하위유형 관습을 적용합니다.
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'}
          style={{ borderColor: tab === 'forge' ? 'var(--accent)' : 'var(--border)', color: tab === 'forge' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🕵️"/> 생성
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐"/> 보관함 ({saved.length})
        </button>
      </div>

      {tab === 'forge' && (
        <>
          <div style={chipRow}>
            {SLOTS.map((s) => {
              const on = active.includes(s.key)
              return (
                <button key={s.key} className="minibtn" onClick={() => toggleSlot(s.key)} aria-pressed={on} title={s.desc}
                  style={{ opacity: on ? 1 : 0.5, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                  <Emoji e={s.icon}/> {s.label}{on ? '' : ' +'}
                </button>
              )
            })}
          </div>

          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmt(combos)}</b>가지
            {combos >= 1_000_000_000_000 ? ' (1조+ 이상)' : combos >= 100_000_000 ? ' (1억+ 이상)' : combos >= 1_000_000 ? ' (백만+ )' : ''}
            <span style={{ marginLeft: 6, opacity: 0.7 }}>· 전체 풀 기준 최대 {fmt(MAX_COMBOS)}가지</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {active.map((k) => {
              const slot = SLOTS.find((s) => s.key === k)!
              const face = results[k]
              const isLocked = !!locked[k]
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 22, width: 28, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-12deg) scale(1.15)' : 'none' }}>
                    <Emoji e={slot.icon}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{slot.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5, color: face ? 'var(--text)' : 'var(--muted)' }}>
                      {face ? (rolling && !isLocked ? '…' : face) : '— 굴려주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => rollOne(k)} disabled={isLocked} title="이 슬롯만 다시" style={{ flexShrink: 0 }}><Emoji e="🎲"/></button>
                  <button className="minibtn" onClick={() => toggleLock(k)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                  </button>
                </div>
              )
            })}
          </div>

          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', maxHeight: 200, overflowY: 'auto' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🕵️"/> 스릴러 장면 설계</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: hasResults ? 'var(--text)' : 'var(--muted)', whiteSpace: 'pre-wrap' }}>
              {story || '슬롯을 굴리면 스릴러 전형 장면이 한 편의 설계로 엮입니다.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={forgeAll}><Emoji e="🕵️"/> 장면 생성 / 다시 굴리기</button>
            <button className="minibtn" onClick={() => copy('story', `${story}\n\n${rowsText()}`)} disabled={!hasResults}>
              {copiedKey === 'story' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={saveCurrent} disabled={!hasResults}><Emoji e="⭐"/> 보관</button>
            <button className="minibtn" onClick={() => saveSnippet(story, slotLabelLine)} disabled={!hasResults} title="글감 스니펫 라이브러리에 저장"><Emoji e="✂️"/> 스니펫</button>
          </div>

          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={addStoryToProject} disabled={!hasResults || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !hasResults ? '먼저 장면을 굴려주세요' : '현재 장면을 프로젝트 원고 〈장면〉 폴더에 추가'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={toSceneList} disabled={!hasResults}><Emoji e="📋"/> 장면 목록으로</button>
            <button className="linkbtn" onClick={toLibPlace} disabled={!byKey.place}><Emoji e="🏚️"/> 압박 공간 저장</button>
            <button className="linkbtn" onClick={() => openToolLinked('setting-bible', { genre: '스릴러·서스펜스' })}><Emoji e="🗺"/> 배경 설정집</button>
            <button className="linkbtn" onClick={() => openToolLinked('character-sheet', { genre: '스릴러·서스펜스' })}><Emoji e="🪪"/> 인물 시트</button>
            <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre: '스릴러·서스펜스' })}><Emoji e="🔺"/> 플롯 피라미드</button>
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐"/></div>
              보관한 장면이 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성 탭에서 <Emoji e="⭐"/> 보관을 눌러 마음에 드는 스릴러 장면을 모아보세요.</span>
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
                    {copiedKey === k ? <>✓</> : <Emoji e="📋"/>}
                  </button>
                  <button className="minibtn" onClick={() => saveSnippet(s.text, s.slots)} title="스니펫 라이브러리에 저장"><Emoji e="✂️"/></button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑"/></button>
                </div>
                {s.title && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}><Emoji e="🕵️"/> {s.title}</div>}
                <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{s.text}</div>
                {s.rows && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{s.rows}</div>
                )}
                <textarea
                  value={s.note}
                  onChange={(e) => setNote(s.id, e.target.value)}
                  placeholder="이 장면을 어느 작품·챕터에 쓸지 메모…"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
                <div className="linkbar">
                  <span className="linkbar-label">연계:</span>
                  <button className="linkbtn" onClick={() => addSavedToProject(s)} disabled={!hasProjectBridge()}
                    title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 장면을 프로젝트 원고 〈장면〉 폴더에 추가'}>
                    <Emoji e="📄"/> 프로젝트에 추가
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{emojify(toast)}</div>}
      <div style={hint}>장면은 출발점일 뿐입니다. 같은 조합이라도 내 사건·인물·반전 설계에 맞춰 비틀어 보세요. 반전은 「공정하게」 — 결정타로 회수할 단서(체호프의 총)를 장면 안에 미리 심어 두세요.</div>
    </div>
  )
}
