// 액션·전쟁 장치·전개법 사전 — 액션·전쟁 장르 고유의 서사 장치와 전개/구조·페이싱·클라이맥스 관습을
// 정의 + 사용법 + 예시 + 비틀기(변주)로 묶은 로컬 사전. 도시에(장르 통념·대표작 분석)에 근거한 자작 데이터.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(즐겨찾기·마지막 카테고리·검색)만 사용.
// 연계: 항목을 프로젝트 자료(액션·전쟁 장치) 폴더 메모로 추가 / 글감 스니펫 라이브러리로 보관 / 관련 도구 열기.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'action-devices',
  name: '액션·전쟁 장치·전개법 사전',
  icon: '💥',
  group: '장치·전개',
  genre: '액션·전쟁',
  intro: '세트피스·시계장치·능력 격차 사다리·최후의 저항 등 액션·전쟁 관습을 정의·사용법·예시·비틀기로 찾아 전투 장면에 심으세요',
  w: 660,
  h: 620,
}

const LS = 'sry:tool:action-devices:'

interface Device {
  name: string        // 장치/패턴 이름
  alias?: string      // 영문/통용 표기
  def: string         // 정의
  use: string         // 사용법(실무 지침)
  ex: string          // 예시(대표작·장면)
  twist: string       // 비틀기(변주·주의)
}
interface CatDef { key: string; label: string; icon: string; desc: string; items: Device[] }

// ── 도시에 근거 장치/전개 데이터 (장르 특화·구체적) ──────────────────────────
const CATS: CatDef[] = [
  {
    key: 'device', label: '핵심 서사 장치', icon: '🧰',
    desc: '액션·전쟁을 그 장르로 만드는 고유 무기들. 위기-탈출의 펄스와 전투의 의미·대가를 설계하는 도구.',
    items: [
      {
        name: '세트피스', alias: 'Set-piece',
        def: '독립적으로 설계된 대형 액션 단위(공항 추격, 다리 폭파, 공성전, 옥상 격투). 각 세트피스는 고유한 장소·제약·목표·합병증(complication)을 갖는다.',
        use: '세트피스마다 "장소(어디)·제약(무엇이 막는가)·목표(무엇을 따내야 하나)·합병증(예상 밖의 악재)"을 한 줄씩 못 박아라. 그리고 앞 것보다 규모/위험이 커지도록 사다리로 배치하라.',
        ex: '『매트릭스』 로비 총격전, 미션임파서블의 절벽·열차 시퀀스, 『킹덤』의 대규모 공성. 존 윅의 클럽·도서관 연쇄 세트피스.',
        twist: '규모를 키우는 대신 "초점을 좁혀" 클라이맥스 세트피스를 작은 방 하나, 단둘의 대결로 응축하라. 거대한 전장 속 한 평짜리 참호가 더 절박하다.',
      },
      {
        name: '시계 장치(시간 압박)', alias: 'Ticking Clock',
        def: '폭탄 타이머·증원 도착·인질 처형 시한·만조·일출·산소 잔량 등으로 "시간이 없다"는 압력을 거는 장치. 액션 긴장의 가장 흔하고 강력한 증폭기.',
        use: '카운트다운을 가시화하라(타이머, 무전으로 들리는 증원 ETA, 차오르는 물, 떨어지는 연료). 클라이맥스가 0초와 겹치도록 역산해 배치하고, 마지막 순간 00:01에서 멎게 하라.',
        ex: '다이하드의 시한, 매튜 라일리식 분 단위 카운트다운, 전쟁물의 "증원이 30분 뒤 도착한다, 그때까지 고지를 지켜라".',
        twist: '시계를 두 개 겹쳐라(생존 시한 + 도덕 시한: 살리면 임무 실패, 임무 성공하면 누가 죽는다). 또는 "시간이 충분하다"고 안심시킨 뒤 마감을 앞당겨 가속하라.',
      },
      {
        name: '수적 열세·최후의 저항', alias: 'Outnumbered / Last Stand',
        def: '1 대 다수, 알라모식 최후의 저항. 압도적 열세 속에서 버티며 약자 응원 심리를 동원하는 장치.',
        use: '열세를 숫자로만 두지 말고 "왜 도망치지 않는가"(지켜야 할 것·시간 벌기·후퇴 엄호)를 박아라. 적을 한 명씩 쓰러뜨릴 때마다 아군의 자원(탄약·체력·동료)도 줄여 출구를 좁혀라.',
        ex: '300의 테르모필레, 다이하드의 1인 vs 다수, 존 윅의 군중 격투, 전쟁물의 거점 사수 농성.',
        twist: '최후의 저항이 "버티기"가 아니라 "미끼"였다고 뒤집어라. 죽기로 막는 줄 알았던 진지가 실은 적을 한곳에 모으는 함정이었다.',
      },
      {
        name: '능력 격차 사다리', alias: 'Power-gap Ladder',
        def: '주인공이 빌런보다 명백히 약한 지점에서 시작 → 약점 발견·도구·희생·각성으로 역전하는 점층 구조. 무협의 "초식 파훼", 헌터물의 "각성/스킬", 전쟁물의 "전술적 기만"이 같은 기능.',
        use: '최종 빌런과의 격차를 1막에 명확히 보여 패배를 각인시켜라. 그 격차를 "운"이 아니라 약점 공략·도구·머리·희생으로 메우는 과정을 단계적으로 깔아 카타르시스를 정당화하라.',
        ex: '무협의 비무 서열전·초식 파훼, 헌터물의 각성·스킬 해방, 록키식 훈련 몽타주 후의 재대결.',
        twist: '격차를 끝내 메우지 못하게 하라. 정면으론 영원히 못 이기는 적을 "이기지 않고" 무력화한다(가두기·설득·자멸 유도·도덕적 패배 안기기).',
      },
      {
        name: '체호프의 무기/환경', alias: "Chekhov's Gun / Environment",
        def: '1막에 무심히 보인 환경 요소(샹들리에, 가스 밸브, 절벽, 강물, 지뢰밭, 도르래)를 전투에서 결정적으로 회수해 활용하는 원칙. 액션 카타르시스의 정석 메커니즘.',
        use: '클라이맥스에 필요한 도구·지형·약점을 전투 전에 "생활/지형 소품"으로 자연스럽게 심어라. 너무 강조하면 복선임이 들통난다. 전장은 무기고다 — 의자, 못, 유리, 고도차까지.',
        ex: '존 윅의 연필·도서관 책, 다이하드의 환풍구·소화호스, 매드맥스의 차량 부품, 무협의 지형을 이용한 매복.',
        twist: '환경 무기를 보여주고도 끝내 쓰지 않아 기대를 배신하거나, 적이 같은 환경을 먼저 역이용해 주인공의 "필승 카드"를 무력화하게 하라.',
      },
      {
        name: '의식·준비 몽타주(로드아웃)', alias: 'Gear-up / Loadout',
        def: '무장 점검·작전 브리핑·"규칙 정하기" 장면. 전투 전 긴장을 적재하고 인물의 능력·무기를 사전 공개하는 장치.',
        use: '로드아웃에서 보여준 무기·장비·계획이 전투에서 반드시 쓰이거나(회수) 어긋나게(계획 붕괴) 하라. 무엇을 챙기느냐로 인물을 말하라(부적·편지·여분 탄창).',
        ex: '존 윅의 호텔 무기 거래, 군사물의 작전 브리핑·장비 점검 컷, 무협의 출진 전 병기 손질.',
        twist: '완벽한 준비를 1초 만에 무너뜨려라. 챙긴 장비가 결정적 순간 고장나거나 못 쓰게 되어, 인물이 맨몸의 기지로 돌파하게 하라.',
      },
      {
        name: '시그니처 무브/무기', alias: 'Signature Move',
        def: '인물 정체성을 압축한 반복 기술(존 윅의 재장전, 무협의 절기, 저격수의 호흡, 특정 콜사인). 클라이맥스에서 변주·봉인·극복으로 회수한다.',
        use: '초중반에 시그니처를 두세 번 각인시켜 "그 사람=그 기술"이 되게 하라. 클라이맥스에서는 그대로 쓰지 말고 봉인당하거나(못 쓰는 상황) 진화시켜 의미를 더하라.',
        ex: '존 윅의 빠른 재장전·CQC, 무협 주인공의 절초, 콘웰 샤프의 일제사격 호령, 베르세르크 가츠의 대검.',
        twist: '시그니처를 적이 먼저 간파하고 카운터를 준비하게 하라. 주인공은 자신의 상징을 "버려야" 이긴다.',
      },
      {
        name: '부상 시계', alias: 'Injury as Clock',
        def: '출혈·골절·중독·체력 고갈이 시간제한으로 작동해 액션에 카운트다운을 부여하는 장치. 무게와 핍진성을 동시에 얻는다.',
        use: '부상을 입힌 뒤 잊지 마라 — 점점 느려지는 동작, 흐려지는 시야, 멈춰야 하는 순간으로 누적시켜라. "이 출혈로 앞으로 몇 분"이라는 암묵적 시계를 독자 머릿속에 심어라.',
        ex: '저격으로 다리를 맞은 채 절뚝이며 도주, 독에 중독된 채 해독까지 버티는 무협 주인공, 과다출혈과 싸우는 병사.',
        twist: '부상을 위장으로 써라. 절뚝이던 주인공이 사실 멀쩡했고, 방심한 적을 그 틈에 친다(거짓 약점).',
      },
      {
        name: '거짓 안전지대', alias: 'False Sanctuary',
        def: '안전해 보이는 휴식·구조·귀환 직후의 기습. 페이싱의 들숨-날숨을 설계하고 방심을 처벌하는 장치.',
        use: '전투 뒤 안전가옥·병원·귀향의 정적을 충분히 깔아 독자를 안심시킨 다음, 가장 무방비한 순간에 위협을 되살려라. 안전의 디테일이 풍부할수록 기습이 아프다.',
        ex: '구출 직후 헬기가 격추됨, 점령한 줄 안 진지의 잔존병, 무사 귀환한 집에 숨어 있던 자객.',
        twist: '안전지대 자체가 함정이게 하라. 구해준 사람이 적이었고, 안식처가 처음부터 처형장이었다.',
      },
      {
        name: '마지막 한 발 / 마지막 힘', alias: 'Last Round',
        def: '자원 고갈 직전의 역전(탄약 1발, 내공 한 줌, 부서진 무기, 마지막 수류탄). 결핍을 카타르시스로 전환하는 장치.',
        use: '클라이맥스 전에 자원을 의도적으로 바닥내라(탄창을 세게 만들어라). 마지막 한 발은 "운"이 아니라 정확한 조준·결단·희생으로 명중해야 한다.',
        ex: '탄약 한 발 남은 저격수의 결정타, 내공이 바닥난 채 펼치는 마지막 절초, 부러진 검으로 찌르는 일격.',
        twist: '마지막 한 발이 빗나가게 하라. 그리고 진짜 무기는 총이 아니라 적의 자만·환경·동료였음이 드러난다.',
      },
      {
        name: '희생적 후위', alias: 'Sacrificial Rearguard',
        def: '동료가 남아 막고 주인공을 보내는 장치. 전쟁·집단 액션의 감정 정점. "너희는 가, 내가 막는다."',
        use: '남는 자에게 충분한 관계·사연을 먼저 부여하라(무게의 물건·약속). 그가 마지막에 무엇을 지키는지, 보내는 자가 무엇을 짊어지는지를 동시에 새겨라.',
        ex: '다리를 끊으며 적을 막는 분대원, 후퇴 엄호하다 산화하는 기관총 사수, 문파를 위해 홀로 막는 사형(師兄).',
        twist: '희생이 헛되게 하라(혹은 헛되어 보이게). 막아낸 시간이 무의미했음이 드러날 때, 또는 남은 자가 끝내 살아 돌아올 때 감정의 결이 달라진다.',
      },
      {
        name: '병참·정보의 비대칭', alias: 'Logistics & Intel Asymmetry',
        def: '보급선·첩보·기만(거짓 무전, 위장, 양동)이 승패를 가르는 전쟁물의 "머리 싸움" 장치. 무력이 아닌 정보·보급이 전선을 움직인다.',
        use: '전투의 승패를 주먹이 아니라 정보·보급·기만으로 결정하라. "누가 무엇을 아는가/무엇이 떨어졌는가"를 전장의 지도에 그려 넣고, 적의 오판을 유도하는 한 수를 설계하라.',
        ex: '은하영웅전설의 함대 보급·기만, 유녀전기의 병참 계산, 킬러 엔젤스의 정찰 정보, 노르망디 기만작전.',
        twist: '정보 우위를 미끼로 써라. 적이 흘린 거짓 첩보를 믿고 짠 완벽한 작전이 곧 함정이었다.',
      },
      {
        name: '무게의 물건', alias: 'The Things They Carried',
        def: '팀 오브라이언식 "병사가 지고 다니는 것들" — 편지·부적·사진·시신·죄책감. 추상적 전쟁을 구체적 무게로 환원하는 전쟁물의 장치.',
        use: '인물이 무엇을 지고 다니는지를 물리적 무게(킬로그램)와 정서적 무게로 함께 적어라. 전투 중 그것을 잃거나 버리는 순간이 곧 인물의 전환점이다.',
        ex: '오브라이언 『그들이 가지고 다닌 것들』의 편지·부적, 전우의 인식표를 모으는 병사.',
        twist: '가장 무거운 짐을 "버리지 못하는 마음"으로 두어라. 물건을 버려도 죄책감은 남고, 그 무게가 생존의 발목을 잡는다.',
      },
      {
        name: '명령의 시점 교차', alias: 'Command / Field Cross-cut',
        def: '지휘부(전략)↔현장 병사(전술·생존)의 시점을 교차해 "결정과 그 인간적 비용"을 동시에 보여주는 전쟁물 장치(킬러 엔젤스 방식).',
        use: '지도 위 한 줄의 명령("저 고지를 점령하라")이 현장에서 어떤 피로 치러지는지 교차해 보여라. 거시의 숫자와 미시의 얼굴을 충돌시켜야 전쟁의 무게가 산다.',
        ex: '킬러 엔젤스의 다중 지휘관 시점, 은영전의 사령부-함교 교차, 전쟁과 평화의 전략-개인 교직.',
        twist: '명령권자와 현장을 같은 인물로 합쳐라. 자기가 내린 명령으로 자기 부하를 죽이는 지휘관의 시점이 가장 잔혹하다.',
      },
      {
        name: '거리의 변주', alias: 'Engagement Distance Shift',
        def: '원거리(저격·포격)→중거리(총격)→근접(격투·검)로 교전 거리를 좁히며 친밀도·잔혹도·긴장을 끌어올리는 장치.',
        use: '한 전투 안에서 거리를 단계적으로 좁혀라. 멀리서는 비인격적 숫자였던 적이 가까워질수록 얼굴을 갖고, 마지막 근접전에서 가장 인간적이고 잔혹해진다.',
        ex: '포격 → 시가전 총격 → 백병전으로 좁혀지는 전쟁 시퀀스, 저격 대치에서 칼부림으로 끝나는 결투.',
        twist: '거리를 거꾸로 벌려라. 멱살 잡던 근접전이 한쪽의 후퇴로 원거리 대치가 되며, 가까이서 본 적의 얼굴이 방아쇠를 망설이게 한다.',
      },
    ],
  },
  {
    key: 'open', label: '오프닝·훅', icon: '🎬',
    desc: '첫 페이지에서 능력과 위협을 동시에 거는 도입 패턴. 콜드 오픈 소규모 액션으로 펄스를 시작한다.',
    items: [
      {
        name: '콜드 오픈 소규모 액션', alias: 'Cold Open Skirmish',
        def: '서론 없이 곧장 소규모 전투·추격에 던져 주인공의 능력을 행동으로 증명하는 도입. 설명 대신 시범.',
        use: '첫 장면에서 주인공이 "어떻게" 싸우는지 보여 능력의 규칙을 예고하라(이게 곧 능력 사전공개다). 본 임무보다 작은 충돌로 펄스를 켜고, 인물 설명은 액션 뒤로 미뤄라.',
        ex: '007의 오프닝 액션, 잭 리처가 술집에서 즉시 제압하는 도입, 매튜 라일리의 1쪽 추격.',
        twist: '콜드 오픈에서 주인공이 "지게" 하라. 첫 장면의 패배가 약점을 노출하고, 그 약점이 클라이맥스 역전의 복선이 된다.',
      },
      {
        name: '인 메디아스 레스 + "○○시간 전"', alias: 'Flash-forward Frame',
        def: '미래의 전투 절정을 먼저 보여준 뒤 "○○시간 전"으로 회귀해 그 지점까지 끌고 가는 액자 구조.',
        use: '앞에 보여준 절정 이미지(불타는 다리 위의 주인공)를 독자가 계속 기다리게 하라. 다만 회귀 후 도착점이 예상과 어긋나야 보람이 있다.',
        ex: '상업 액션·전쟁 영화의 단골. "포연 속에서 그는 마지막 탄창을 끼웠다. — 18시간 전, 모든 게 평범했다."',
        twist: '먼저 보여준 절정의 "총을 든 자"가 알고 보니 주인공이 아니라 그가 막으려던 적이었다고 회수하라.',
      },
      {
        name: '동원·입대(순진함)', alias: 'Enlistment / Naïveté',
        def: '전쟁물의 표준 1장. 영광·애국·모험에 들떠 전선으로 향하는 순진함을 세워, 첫 전투의 환멸과 대비시키는 도입.',
        use: '입대 전 일상의 평온·이상(理想)을 풍부히 깔아라. 그 순진함이 클수록 첫 전투의 세례가 아프다. 무엇을 위해 가는지를 인물 입으로 천명하게 하라(나중에 부서질 신념).',
        ex: '레마르크 『서부 전선 이상 없다』의 교실 입대, 풀 메탈 자켓의 신병 훈련소.',
        twist: '순진함을 끝까지 부수지 않게 하라. 환멸의 전장에서도 신념을 지키는 인물이 오히려 가장 비극적이고 위험하다.',
      },
    ],
  },
  {
    key: 'structure', label: '구조·전개 패턴', icon: '🏗️',
    desc: '권/시즌 거시 곡선과 전투 장면 내부의 미시 페이싱. 들숨-날숨 리듬과 세트피스 사다리.',
    items: [
      {
        name: '액션 영웅 곡선', alias: 'Action Hero Arc',
        def: '능력 입증(콜드 오픈) → 임무/위협 제시 → 능력 강화·아군 규합 → 중간 패배(무력화·최저점) → 약점/희생을 통한 반격 → 클라이맥스 세트피스 → 짧은 대가 정산의 거시 구조.',
        use: '중간 패배를 반드시 넣어라 — 주인공이 한 번 무력화돼야 역전이 값지다. 세트피스를 작은 충돌→중간 보스→최종전으로 점층하고, 마지막 정산은 짧게.',
        ex: '다이하드, 매드맥스: 분노의 도로, 존 윅 1편의 상승-추락-역전.',
        twist: '곡선을 압축하거나 반복하라. 한 권에 "입증-패배-역전"을 세 번 돌리는 웹소설식 회차 리듬으로 사이다를 잦게 터뜨려라.',
      },
      {
        name: '전쟁 환멸 곡선', alias: 'War Disillusion Arc',
        def: '동원/입대(순진함) → 첫 전투(환멸·세례) → 소모·전우애 형성 → 대규모 작전(전략적 정점) → 파국/상실 → 생존자의 의미 묻기(반전 또는 비장)의 거시 구조.',
        use: '전투 횟수가 아니라 "잃음의 누적"으로 진행하라. 전우애를 충분히 쌓은 뒤 한 명씩 떨궈, 마지막 생존자가 "왜 싸웠나"를 묻게 하라.',
        ex: '서부 전선 이상 없다, 플래툰, 밴드 오브 브라더스.',
        twist: '환멸 끝에 허무가 아니라 작은 의미를 건지게 하라. 혹은 반대로, 살아남은 자가 다음 전쟁을 부르는 순환을 암시하라.',
      },
      {
        name: '성장형 무력 인플레', alias: 'Power Inflation Arc',
        def: '약함 → 기연/각성 → 비무·서열전 반복(무력 상승) → 문파전/길드전 → 천하/세계 위협 최종전. 무협·헌터·게임판타지의 성장 곡선.',
        use: '무력 상승에 "규칙과 대가"를 붙여라(수련·기연·부작용). 매 단계 더 강한 적을 배치하되, 인플레가 긴장을 죽이지 않도록 "강함=새 약점·새 책임"으로 균형 잡아라.',
        ex: '화산귀환·검술명가 막내아들의 서열전 상승, 나 혼자만 레벨업의 각성 단계, 무협의 경지 돌파.',
        twist: '인플레의 함정을 노출하라. 강해질수록 지킬 게 늘어 약점이 되거나, 정점에 선 순간 "더 이상 오를 곳이 없는" 공허가 진짜 적이 된다.',
      },
      {
        name: '세트피스 에스컬레이션 사다리', alias: 'Set-piece Escalation',
        def: '같은 규모 전투의 반복은 평탄화. 매 세트피스가 앞 것보다 규모·위험·이해관계를 한 단 올리는 점층 원칙(작은 충돌→중간 보스→최종전).',
        use: '세트피스마다 "이번엔 무엇이 더 걸렸나/무엇이 더 위험한가"를 명시하라. 규모(몇 명/얼마나 넓은가) 또는 임박성(언제) 중 하나는 반드시 상승시켜라.',
        ex: '존 윅 시리즈의 점증하는 전투 규모, 미션임파서블의 갈수록 커지는 스턴트, 킹덤의 소규모 교전→대회전.',
        twist: '마지막 세트피스에서 규모를 키우는 대신 초점을 좁혀라(거대 전장 속 단둘의 결투). 가장 크되 가장 친밀하게.',
      },
      {
        name: '들숨-날숨 페이싱', alias: 'Action-Rest Rhythm',
        def: '액션 폭발 → 짧은 호흡(부상 점검·한 마디 농담·다음 계획) → 더 큰 액션. 쉼 없는 액션은 역설적으로 둔감화된다.',
        use: '큰 액션 직후 반 박자 쉬며 부상·감정·다음 위협의 그림자를 정리하라. 다만 휴식이 늘어지면 추진력이 꺼지니, 호흡 장면 끝에 다음 위협의 씨앗을 심어라.',
        ex: '추격 시퀀스 → 차 안의 짧은 대화 → 더 큰 충돌. 전투 뒤 참호의 담배 한 대 → 포성 재개.',
        twist: '숨 고르기 장면 자체에 위협을 숨겨라(거짓 안전지대와 결합). 안심하는 순간이 가장 무방비하다.',
      },
      {
        name: '문장 길이 = 속도계', alias: 'Sentence Length as Speedometer',
        def: '격렬 구간은 짧은 문장·단문·동사 중심·잦은 행 바꿈, 준비/여파 구간은 만연체 허용. 문장 리듬으로 체감 속도를 조절하는 미시 페이싱.',
        use: '전투 절정에서는 문장을 짧게 끊고 동사를 앞세워라. 한 동작=한 비트로, 결정적 3~5비트만 슬로우로 펼치고 나머지는 요약(scene vs summary)하라.',
        ex: '"막는다. 비튼다. 찌른다." 식 단문 연쇄 vs 작전 브리핑의 긴 설명문.',
        twist: '절정에서 일부러 한 번 긴 문장을 넣어 시간을 늘려라(슬로모션 체감). 격렬함 속 단 한 줄의 만연체가 시간을 정지시킨다.',
      },
      {
        name: '단락 = 카메라 컷', alias: 'Paragraph as Cut',
        def: '시점 전환·타격 순간마다 단락을 끊어 영상적 리듬을 부여하는 기법. 한 단락=한 컷.',
        use: '결정타·시점 이동·반전 순간에 단락을 끊어 "컷"을 만들어라. 긴 안무 나열을 한 단락에 몰아넣지 말고, 카메라를 옮기듯 분절하라.',
        ex: '교차 편집되는 두 전선, 타격마다 행을 바꿔 박진감을 주는 격투 묘사.',
        twist: '의도적으로 컷 없이 한 호흡에 길게 끌어, 끊김 없는 롱테이크 액션의 압박감을 만들어라(올드보이 복도신 식).',
      },
      {
        name: '웹소설 회차 페이싱', alias: 'Webnovel Episode Pacing',
        def: '회차 끝 = 전투 절정 직전 또는 반전 직후의 클리프행어. 한 회 안에 작은 위기-해소(사이다) 1회 이상 배치. 장기전은 "이번 회차 미니 승리 + 다음 회차 더 큰 위협"으로 분절.',
        use: '매 회차에 사이다 한 모금(작은 응징·승리)을 넣어 고구마를 풀고, 회차 끝은 절정 직전 또는 반전 직후에서 끊어라. 장기 전투는 회차 단위 미니 목표로 쪼개라.',
        ex: '전지적 독자 시점·나 혼자만 레벨업의 회차 단위 각성·역전, 무협 웹소설의 비무 회차 클리프행어.',
        twist: '사이다 직후를 고구마로 뒤집어, 통쾌한 승리가 더 큰 위협을 부른 자업자득이 되게 하라(독자의 카타르시스를 인질로).',
      },
    ],
  },
  {
    key: 'climax', label: '클라이맥스·결말', icon: '💥',
    desc: '최종 대결의 관습과 대가 있는 승리. 약점 회수·최저점 역전·시계의 정지.',
    items: [
      {
        name: '최강 빌런과의 최종 대결', alias: 'Final Boss Duel',
        def: '잡몹·중간 보스를 거쳐 도달하는 최강 빌런과의 최종 1대1(또는 핵심 대결). 규모는 가장 크되 초점은 가장 좁게(개인 대 개인의 의미로 수렴).',
        use: '최종전의 마지막 일격은 반드시 주인공의 능동적 선택·기지·희생에서 나오게 하라. 외부 구원(증원 도착·우연)은 카타르시스를 죽인다. 거대한 전장이라도 카메라는 단둘에 맞춰라.',
        ex: '베르세르크의 숙적 대결, 무협의 천하제일 비무, 다이하드의 최종 대치.',
        twist: '물리적 승리 대신 의미의 승리로 끝내라. 적을 죽이지 않고 그의 논리·대의를 무너뜨려 무장 해제시킨다.',
      },
      {
        name: '복선 폭발·약점 회수', alias: 'Payoff Convergence',
        def: '1~2막에 깔린 적의 약점·환경 요소·시그니처 기술·동료의 선물이 클라이맥스에서 동시에 발화하며 "그게 그거였구나"의 재배열이 일어나는 지점.',
        use: '회수는 카운트다운 만료·대면과 겹치게 몰아쳐라. 흩어진 복선(체호프의 무기, 적의 손 떨림, 동료가 준 도구)이 한 번에 의미를 갖는 순간이 카타르시스다.',
        ex: '초반에 본 지형·소품·약점이 최종전에서 연쇄로 회수되는 액션 클라이맥스.',
        twist: '회수 직후 한 겹 더 벗겨라(이중 리빌). 약점이라 믿고 노린 것이 적의 함정이었고, 진짜 약점은 따로 있었다.',
      },
      {
        name: '최저점 직후 역전', alias: 'All Is Lost Reversal',
        def: '주인공이 패배 직전(무장 해제·중상·아군 전멸)에서 "잃을 것이 명확해진 순간" 마지막 자원/의지로 반전하는 관습.',
        use: '역전 직전 주인공의 자산을 최대한 박탈하라(무기·동료·체력·시간). 가장 낮은 곳에서 솟는 의지가, 새로 생긴 힘이 아니라 누적된 수련·복선·관계의 결실이어야 한다.',
        ex: '무장 해제된 채 맨몸으로 맞서는 결전, 내공 바닥에서 펼치는 마지막 절초, 전멸 직전의 반격.',
        twist: '최저점에서 "잃었다고 믿은 것"이 위장(거짓 죽음·숨긴 자원)이라 3막에 부활하게 하되, 그 순간엔 진짜로 절망하게 하라.',
      },
      {
        name: '대가 있는 승리', alias: 'Pyrrhic Victory',
        def: '승리에 영구적 상실이 따르는 관습(동료·신념·고향·자기 일부). 특히 전쟁물. 무손상 승리는 액션에서도 김이 빠진다.',
        use: '주인공이 무엇을 잃고 이겼는지를 결말에 새겨라. 부상·전사자 호명·돌이킬 수 없는 변화. 상처가 클수록 승리가 무겁다.',
        ex: '르카레식 회색 승리, 이겼으나 전우를 모두 잃은 전쟁물 결말, 적을 닮아버린 채 이긴 액션 영웅.',
        twist: '승리의 대가를 "남이 아닌 자신의 변화"로 두어라. 주인공이 적을 닮아버린 채 이겨, 승리가 곧 패배처럼 보이게 하라.',
      },
      {
        name: '시계의 정지', alias: 'The Clock Stops',
        def: '설치한 카운트다운(타이머·증원·만조)이 마지막 순간에 멎는 관습(00:01에서 해제). 시한을 잊으면 긴장이 사기로 인식된다.',
        use: '깔아둔 모든 시계를 클라이맥스에서 반드시 정산하라. 아슬아슬한 해제(또는 1초 차이의 실패)로 카운트다운을 매듭짓고, 잊힌 타이머를 남기지 마라.',
        ex: '00:01에서 멎는 폭탄 해체, 증원 도착 직전의 결착, 만조 한 뼘 전의 탈출.',
        twist: '시계를 일부러 "터지게" 하라. 해제에 실패하지만 그 폭발 자체가 주인공의 계획이었다(예상된 희생·환경 무기화).',
      },
      {
        name: '개인 무력 ↔ 집단 운명의 동조', alias: 'Micro-Macro Sync',
        def: '전쟁물 클라이맥스에서 한 인물의 분투가 전선 전체의 분기점이 되도록 미시(개인)와 거시(전황)를 동조시키는 관습.',
        use: '한 병사의 거점 사수가 전군의 후퇴/승리를 가르도록 인과를 연결하라. 지도 위 숫자의 변화를 한 사람의 얼굴로 치환해 거시-미시를 같은 박자로 뛰게 하라.',
        ex: '킬러 엔젤스의 작은 언덕 방어가 전투의 분수령, 한 다리 사수가 사단의 운명을 가르는 전쟁물.',
        twist: '개인의 영웅적 분투가 거시적으론 무의미했음을 드러내라. 그가 지킨 고지는 전략상 이미 버려진 곳이었다.',
      },
      {
        name: '반전 클라이맥스(진짜 적은 아군)', alias: 'Twist Climax',
        def: '진짜 적은 외부가 아니라 아군 지휘부·체제·대의였다는 폭로형 절정. 전쟁·밀리터리 스릴러의 관습.',
        use: '아군 내부의 부패·기만을 초중반에 공정하게 복선으로 깔아라(재독 시 보이도록). 외부의 적을 물리친 직후 진짜 적이 등 뒤에 있었음을 드러내 카타르시스를 재정의하라.',
        ex: '명령이 곧 학살이었던 전쟁물, 진짜 적이 자국 사령부였던 음모형 절정, 유녀전기식 체제 비판.',
        twist: '폭로 후에도 주인공이 그 체제 안에 남아야 하게 하라. 적이 시스템 자체라면, 이겨도 빠져나갈 곳이 없다.',
      },
      {
        name: '카타르시스 정산(여파)', alias: 'Aftermath',
        def: '액션 직후의 짧은 "여파" — 부상 수습, 전사자 호명, 빌런 최후, 세계 변화 확인. 너무 길면 늘어지고, 없으면 공허하다.',
        use: '클라이맥스 직후 짧게 숨을 내쉬게 하라. 살아남은 자들의 표정·빈자리·바뀐 풍경 한 컷으로 무게를 정산하되, 설명으로 늘어뜨리지 마라.',
        ex: '전투 후의 전우 호명, 폐허가 된 전장 위의 새벽, 무협의 비무 후 정파/사파의 판도 변화.',
        twist: '여파를 다음 위협의 씨앗으로 삼아라. 정산 장면 마지막 한 컷에 다음 전쟁·다음 적의 그림자를 심어 여운을 남겨라.',
      },
    ],
  },
]

const ALL_KEY = '__all__'
const FAV_KEY = '__fav__'

const flatAll = (): { cat: CatDef; item: Device }[] =>
  CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 한 장치를 텍스트(복사·스니펫)로 직렬화.
function deviceToText(c: CatDef, d: Device): string {
  return [
    `💥 [${c.label}] ${d.name}${d.alias ? ` (${d.alias})` : ''}`,
    `· 정의: ${d.def}`,
    `· 사용법: ${d.use}`,
    `· 예시: ${d.ex}`,
    `· 비틀기: ${d.twist}`,
  ].join('\n')
}

// 한 장치를 프로젝트 본문(HTML)으로.
function deviceToHtml(c: CatDef, d: Device): string {
  return [
    `<p><b>💥 [${escHtml(c.label)}] ${escHtml(d.name)}${d.alias ? ` (${escHtml(d.alias)})` : ''}</b></p>`,
    `<p><b>정의</b> · ${escHtml(d.def)}</p>`,
    `<p><b>사용법</b> · ${escHtml(d.use)}</p>`,
    `<p><b>예시</b> · ${escHtml(d.ex)}</p>`,
    `<p><b>비틀기</b> · ${escHtml(d.twist)}</p>`,
  ].join('')
}

// ── 전투 장면 설계 조합기: 슬롯 풀 ─────────────────────────────────────────
// 사전의 장치를 실제 한 전투 장면으로 조립하도록 9개 슬롯을 무작위 조합(잠금/재생성). 도시에 근거 자작 풀.
// 조합수 = 슬롯 풀 곱 ≈ 1조 이상(핵심 생성기 지향).
interface SlotDef { key: string; label: string; icon: string; pool: string[] }
const SLOTS: SlotDef[] = [
  {
    key: 'setpiece', label: '세트피스(무대)', icon: '🎬', pool: [
      '공항·터미널 추격', '무너지는 다리 위', '공성전(성벽·성문 돌파)', '참호 사이 무인지대 돌격',
      '옥상에서 옥상으로의 추격', '좁은 복도의 연쇄 격투', '폭우 속 시가전', '눈보라 속 산악 고지 사수',
      '컨테이너 야적장 총격', '폐공장·제철소 격투', '달리는 열차 지붕 위', '해상 함대전(포격 교환)',
      '잠수함 내부 백병전', '사막 차량 추격', '폭격당하는 도심 한복판', '지하 벙커 진입전',
      '정글 매복 교전', '협곡의 매복·역매복', '불타는 건물 탈출 전투', '얼어붙은 호수 위 결투',
      '난민 행렬을 끼고 벌어지는 엄호전', '함락 직전의 시가 골목', '거대 다목적 댐 시설 공방',
      '폭설 산장 고립전', '항만 부두의 화물선 점거', '협소한 엘리베이터 격투',
    ],
  },
  {
    key: 'objective', label: '전투 목표', icon: '🎯', pool: [
      '인질을 무사히 빼낸다', '폭탄을 해체한다', '다리를 끊어 추격을 막는다', '고지를 점령·사수한다',
      '증원이 올 때까지 버틴다', '핵심 정보(서류·코드)를 탈취한다', 'VIP를 호위해 빠져나간다', '적 지휘관을 제거한다',
      '아군의 후퇴를 엄호한다', '보급선을 차단한다', '포위망을 돌파한다', '함정을 역이용해 적을 가둔다',
      '통신을 복구해 구조를 부른다', '독·역병의 확산을 막는다', '약속한 시각까지 적을 묶어둔다', '잡힌 동료를 구출한다',
      '거짓 정보를 적에게 흘려 오판시킨다', '관문을 열어 본대를 진입시킨다', '적의 슈퍼웨폰을 무력화한다', '민간인을 대피시킨다',
      '복수 대상에게 도달한다', '맞서지 않고 빠져나간다(탈출이 곧 승리)', '적장의 항복을 받아낸다',
    ],
  },
  {
    key: 'clock', label: '시계 장치(시한)', icon: '⏱️', pool: [
      '폭탄 타이머 카운트다운', '증원 도착 ETA(적이든 아군이든)', '인질 처형 시한', '만조·밀물이 차오른다',
      '일출 전까지(어둠의 엄호 소멸)', '약효·해독제 소진', '연료·산소 잔량 고갈', '출혈로 인한 의식 한계',
      '무너지는 구조물의 붕괴 시각', '출항·이륙 시각 임박', '포격 개시 예정 시각', '전력·통신이 끊기기까지',
      '독가스·화재의 확산 속도', '약속한 휴전 종료 시각', '탄약이 바닥나기까지', '두 개의 시계(생존 시한 + 도덕 시한)',
      '겨울 폭풍이 닥치기까지', '본대 진격까지 버틸 시간', '적 증원이 합류하기 전의 공백',
      '구조 헬기의 회수 윈도', '내공·진기가 고갈되기까지', '댐·수문이 열리기까지', '체온 저하(저체온증) 한계',
    ],
  },
  {
    key: 'disadvantage', label: '주인공 불리 조건', icon: '🩹', pool: [
      '압도적 수적 열세(1 대 다수)', '무장 해제·맨몸', '중상·출혈(부상 시계)', '탄약이 거의 없음',
      '내공·체력이 바닥남', '아군이 전멸했거나 분리됨', '지형·고지를 적이 선점', '시야 차단(연막·정전·안개)',
      '믿었던 동료의 배신 직후', '시간이 거의 없음', '인질·민간인을 끼고 있어 화력 제약', '적의 함정 한복판에 들어섬',
      '시그니처 무기를 빼앗긴 채', '계획·장비가 막 무너진 직후', '독·부상으로 동작이 느려짐', '퇴로가 차단됨',
      '적이 주인공의 수를 이미 간파함', '비무장 약자를 보호해야 함', '익숙한 전술이 통하지 않는 적',
      '보급선이 끊겨 고립됨', '신원을 숨겨야 해 정체를 못 드러냄', '주화입마·부작용이 도지는 중',
    ],
  },
  {
    key: 'antagonist', label: '적대 세력', icon: '🕷️', pool: [
      '한 수 위의 천재 검객·격투가', '얼굴 없는 정예 부대', '냉혹한 청부 프로', '수적으로 압도하는 잡병 무리',
      '주인공의 옛 스승·전우', '체제·지휘부 자체(아군이 적)', '광신적 추종을 거느린 교주·군벌', '병참·정보로 앞서는 군세',
      '주인공의 시그니처를 간파한 카운터형 적', '거대 병기·요새', '복수에 사로잡힌 유족', '학대로 비틀린 피해자형 가해자',
      '쌍둥이·대역으로 혼란을 주는 적', '항복을 모르는 결사대', '주인공이 풀어준 죄수', '미래에서 온(혹은 미래의) 자신',
      '거짓 깃발 아래 움직이는 흑막', '주인공보다 약하나 인질을 쥔 적', '환경·자연 자체가 적(설산·해류)', '같은 대의를 믿는 적(둘 다 옳다)',
    ],
  },
  {
    key: 'leverage', label: '역전의 지렛대', icon: '🔧',
    pool: [
      '체호프의 환경 무기 회수(샹들리에·가스·고도차)', '적의 약점 공략(손 떨림·맹점)', '시그니처 무브의 진화·변주', '마지막 한 발·마지막 힘',
      '동료의 희생적 후위', '기만·양동으로 적을 오판시킴', '부상 위장으로 만든 틈', '누적된 수련·각성의 결실',
      '병참·보급 차단으로 무너뜨림', '거짓 무전·위장 첩보', '지형을 미끼로 한 매복', '적의 자만·방심을 유도',
      '동료가 남긴 도구·정보의 회수', '시계를 역이용(폭발 자체를 무기로)', '적의 대의·논리를 무너뜨리는 한마디', '시그니처 무기를 버리고 얻은 자유',
      '인질·민간인을 방패가 아닌 변수로 전환', '두 적을 서로 싸우게 만듦', '예상된 희생(자기 한 팔을 내주고 급소를 친다)',
      '적의 초식·전술을 간파해 파훼', '한 줌 남은 내공을 한 점에 집중', '고지·고도차를 역으로 빼앗아 차지',
    ],
  },
  {
    key: 'beat', label: '구조 위치', icon: '📐', pool: [
      '콜드 오픈 소규모 액션(능력 입증)', '임무·위협 제시', '능력 강화·아군 규합', '첫 대규모 충돌(세례·환멸)',
      '중간 보스전', '중간 패배·무력화(최저점)', '거짓 안전지대 직후의 기습', '약점 발견·반격 준비',
      '세트피스 한 단 상승', '최강 빌런과의 최종 대결', '최저점 직후 역전', '복선 폭발·약점 회수',
      '시계의 정지(카운트다운 매듭)', '대가 있는 승리(여파 정산)', '반전 클라이맥스(진짜 적은 아군)', '들숨-날숨 짧은 호흡',
      '비무·서열전(무력 입증)', '희생적 후위로 본대 탈출', '병참·정보전의 한 수', '회차 끝 클리프행어(절정 직전)',
    ],
  },
  {
    key: 'distance', label: '교전 거리·감각', icon: '🎚️', pool: [
      '원거리 저격 대치(호흡·풍속)', '포격·곡사로 시작', '중거리 총격전(엄폐물 사이)', '근접 CQC·백병전',
      '검·도의 칼날 거리', '맨손 격투(타격·관절기)', '원거리→근접으로 좁혀짐', '근접→원거리로 벌어짐',
      '화약 냄새·총성이 갈라지는 소리', '금속이 맞부딪치는 칼소리', '피비린내·흙먼지의 근접감', '귀가 먹먹한 폭음 직후의 정적',
      '심장이 터질 듯한 추격', '슬로모션처럼 늘어지는 찰나', '반동과 손끝 감각의 사격', '통증이 번지는 와중의 격투',
      '시야가 좁아지는 아드레날린', '폐가 타들어가는 전력 질주', '내공·기파가 부딪치는 진동', '식은땀과 떨리는 손끝의 대치',
      '살이 찢기는 소리와 비명', '정적 속 심박만 들리는 매복',
    ],
  },
  {
    key: 'cost', label: '대가·여파', icon: '⚖️', pool: [
      '동료 한 명을 영영 잃는다', '시그니처 무기가 부서진다', '신념·대의가 무너진다', '적을 닮아버린 채 이긴다',
      '돌이킬 수 없는 부상을 얻는다', '구하려던 대상의 일부만 구한다', '승리가 더 큰 위협을 불러온다', '고향·거점이 잿더미가 된다',
      '인질·민간인의 희생을 막지 못한다', '적의 진짜 의도를 너무 늦게 안다', '이겼으나 전략적으론 무의미했다', '자기 손으로 옛 전우를 친다',
      '비밀·죄책감이 평생의 짐이 된다', '무손상 같지만 무언가 내면이 죽는다', '다음 전쟁의 씨앗이 심긴다', '살아남은 죄책감(생존자의 부채)',
      '주화입마·후유증을 떠안는다', '한쪽 팔·눈을 잃고 이긴다', '약속을 지키려다 더 큰 약속을 깬다', '승리의 공을 빼앗기고 누명을 쓴다',
    ],
  },
]

interface SceneCombo { [slotKey: string]: string }
function comboToText(combo: SceneCombo): string {
  return ['💥 액션·전쟁 전투 장면 설계', ...SLOTS.map((s) => `${s.icon} ${s.label}: ${combo[s.key]}`)].join('\n')
}
function comboToHtml(combo: SceneCombo): string {
  return ['<p><b>💥 액션·전쟁 전투 장면 설계</b></p>',
    ...SLOTS.map((s) => `<p><b>${escHtml(s.icon + ' ' + s.label)}</b> · ${escHtml(combo[s.key] || '')}</p>`)].join('')
}

export default function ActionDevices({ payload }: { payload?: Record<string, unknown> }) {
  const genre = typeof payload?.genre === 'string' ? (payload.genre as string) : '액션·전쟁'

  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || raw === FAV_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  const [random, setRandom] = useState<{ cat: CatDef; item: Device } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)
  const copyTimer = useRef<number | null>(null)

  // ── 모드(사전 / 전투 장면 설계 조합기) ──
  const [mode, setMode] = useState<'dict' | 'gen'>('dict')
  // 조합기: 현재 뽑힌 슬롯 값 + 잠금 상태
  const [combo, setCombo] = useState<SceneCombo>(() => {
    const o: SceneCombo = {}
    SLOTS.forEach((s) => { o[s.key] = s.pool[Math.floor(Math.random() * s.pool.length)] })
    return o
  })
  const [locks, setLocks] = useState<Record<string, boolean>>({})

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  // 언마운트 정리(타이머)
  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
  }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  const favKey = (catKey: string, name: string) => `${catKey}::${name}`

  // 전투 장면 설계 조합기의 슬롯 풀 곱 = 만들 수 있는 서로 다른 장면 설계 수(핵심 생성기 → 1조+ 지향).
  const comboCount = useMemo(() => SLOTS.reduce((acc, s) => acc * s.pool.length, 1), [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base: { cat: CatDef; item: Device }[]
    if (cat === ALL_KEY) base = flatAll()
    else if (cat === FAV_KEY) base = flatAll().filter(({ cat: c, item }) => favs[favKey(c.key, item.name)])
    else base = CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (q) {
      base = base.filter(({ item }) =>
        item.name.toLowerCase().includes(q) ||
        (item.alias || '').toLowerCase().includes(q) ||
        item.def.toLowerCase().includes(q) ||
        item.use.toLowerCase().includes(q) ||
        item.ex.toLowerCase().includes(q) ||
        item.twist.toLowerCase().includes(q))
    }
    return base
  }, [query, cat, favs])

  const rollRandom = useCallback(() => {
    // 현재 카테고리 풀에서 무작위 1개(검색어 무시). 잠금 없는 단순 재생성.
    let pool: { cat: CatDef; item: Device }[]
    if (cat === ALL_KEY) pool = flatAll()
    else if (cat === FAV_KEY) pool = flatAll().filter(({ cat: c, item }) => favs[favKey(c.key, item.name)])
    else pool = CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.name === prev.item.name && pick.cat.key === prev.cat.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return pick
    })
  }, [cat, favs])

  const toggleFav = (catKey: string, name: string) => {
    const k = favKey(catKey, name)
    setFavs((prev) => {
      const next = { ...prev }
      if (next[k]) delete next[k]; else next[k] = true
      return next
    })
  }

  // ── 조합기: 잠금 안 된 슬롯만 재생성(직전 값과 다르게) ──
  const pickFresh = (s: SlotDef, prev?: string): string => {
    if (s.pool.length <= 1) return s.pool[0]
    let v = s.pool[Math.floor(Math.random() * s.pool.length)]
    if (prev !== undefined && v === prev) v = s.pool[Math.floor(Math.random() * s.pool.length)]
    return v
  }
  const regenerate = () => {
    setCombo((prev) => {
      const next: SceneCombo = { ...prev }
      SLOTS.forEach((s) => { if (!locks[s.key]) next[s.key] = pickFresh(s, prev[s.key]) })
      return next
    })
  }
  const regenSlot = (s: SlotDef) => setCombo((prev) => ({ ...prev, [s.key]: pickFresh(s, prev[s.key]) }))
  const toggleLock = (key: string) => setLocks((prev) => ({ ...prev, [key]: !prev[key] }))

  // 조합기 연계: 프로젝트 자료 〈액션·전쟁 장치〉 폴더에 전투 장면 설계 메모 추가.
  const comboToProj = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '액션·전쟁 장치',
      title: `전투 장면 설계 — ${combo.setpiece}`,
      bodyHtml: comboToHtml(combo),
      synopsis: `${combo.objective} / ${combo.antagonist} / ${combo.beat}`,
      icon: '💥',
      meta: { 장르: genre, 세트피스: combo.setpiece, 목표: combo.objective, 구조위치: combo.beat },
    })
    flash(id ? '프로젝트 자료 〈액션·전쟁 장치〉에 전투 장면 설계를 추가했습니다.' : '프로젝트 추가에 실패했어요.')
  }
  // 조합기 연계: 글감 스니펫 보관함에 담기.
  const comboToStash = () => {
    addToLibrary('snippets', {
      text: comboToText(combo),
      source: '액션·전쟁 장치 사전 · 전투 장면 설계 조합기',
      tags: ['액션·전쟁', '전투장면설계', combo.setpiece, combo.antagonist],
    })
    flash('글감 보관함에 전투 장면 설계를 담았습니다.')
  }

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    if (!navigator.clipboard) { flash('이 환경에서는 클립보드 복사가 지원되지 않습니다.'); return }
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(id)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => flash('복사에 실패했습니다. 직접 선택해 복사해 주세요.'))
  }

  // 연계 — 프로젝트 자료 〈액션·전쟁 장치〉 폴더에 메모로 추가.
  const addToProj = (c: CatDef, d: Device) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '액션·전쟁 장치',
      title: `${d.name} (${c.label})`,
      bodyHtml: deviceToHtml(c, d),
      synopsis: d.def,
      icon: '💥',
      meta: { 장르: genre, 분류: c.label, 영문: d.alias || '' },
    })
    flash(id ? `프로젝트 자료 〈액션·전쟁 장치〉에 ‘${d.name}’을(를) 추가했습니다.` : '프로젝트 추가에 실패했어요.')
  }

  // 연계 — 글감 스니펫 라이브러리에 보관.
  const stash = (c: CatDef, d: Device) => {
    addToLibrary('snippets', {
      text: deviceToText(c, d),
      source: `액션·전쟁 장치 사전 · ${c.label}`,
      tags: ['액션·전쟁', c.label, d.name, ...(d.alias ? [d.alias] : [])],
    })
    flash(`글감 보관함에 ‘${d.name}’을(를) 담았습니다.`)
  }

  // 관련 도구(같은 장르군 또는 전개 도구)로 데이터와 함께 이동.
  const RELATED: { id: string; label: string; icon: string }[] = [
    { id: 'chase-scene-gen', label: '추격 장면 생성기', icon: '🏃' },
    { id: 'stakes-escalator', label: '이해관계 점증기', icon: '📈' },
    { id: 'scene-list', label: '장면 목록', icon: '🎞️' },
    { id: 'plot-pyramid', label: '플롯 피라미드', icon: '🔺' },
    { id: 'tension-curve-editor', label: '긴장 곡선', icon: '📉' },
  ]
  const openRelated = (id: string, c?: CatDef, d?: Device) => {
    openToolLinked(id, d ? { genre, device: d.name, note: c ? `${c.label} · ${d.name}` : d.name } : { genre })
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const facetLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginRight: 4 }
  const facetRow: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.6, marginTop: 5 }

  const DeviceBody = ({ c, d }: { c: CatDef; d: Device }) => (
    <>
      <div style={facetRow}><span style={facetLabel}>정의</span>{d.def}</div>
      <div style={facetRow}><span style={facetLabel}>사용법</span>{d.use}</div>
      <div style={facetRow}><span style={facetLabel}>예시</span>{d.ex}</div>
      <div style={{ ...facetRow, color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px', marginTop: 7 }}>
        <span style={{ ...facetLabel, color: 'var(--warn)' }}>비틀기</span>{d.twist}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={() => copy(deviceToText(c, d), 'item:' + favKey(c.key, d.name))}>
          {copiedKey === 'item:' + favKey(c.key, d.name) ? '✓ 복사됨' : <><Emoji e="📋"/> 복사</>}
        </button>
        <button className="minibtn" onClick={() => toggleFav(c.key, d.name)} style={{ borderColor: favs[favKey(c.key, d.name)] ? 'var(--accent)' : 'var(--border)' }}>
          {favs[favKey(c.key, d.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
        </button>
        <button className="minibtn" onClick={() => stash(c, d)} title="글감 보관함에 담기"><Emoji e="📥"/> 글감 보관</button>
      </div>
      {/* 연계 줄 */}
      <div className="linkbar" style={{ marginTop: 8, flexWrap: 'wrap' }}>
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={() => addToProj(c, d)} disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? '이 장치를 프로젝트 자료 〈액션·전쟁 장치〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
        {RELATED.map((r) => (
          <button key={r.id} className="linkbtn" onClick={() => openRelated(r.id, c, d)} title={`${r.label} 열기`}>
            <Emoji e={r.icon}/> {r.label}
          </button>
        ))}
      </div>
    </>
  )

  return (
    <div style={wrap}>
      {/* 모드 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setMode('dict')} aria-pressed={mode === 'dict'}
          style={{ flex: 1, borderColor: mode === 'dict' ? 'var(--accent)' : 'var(--border)', color: mode === 'dict' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="📖"/> 장치 사전 ({total})
        </button>
        <button className="minibtn" onClick={() => setMode('gen')} aria-pressed={mode === 'gen'}
          style={{ flex: 1, borderColor: mode === 'gen' ? 'var(--accent)' : 'var(--border)', color: mode === 'gen' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🎰"/> 전투 장면 설계 조합기
        </button>
      </div>

      {/* 토스트(공통) */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>
          ✓ {toast}
        </div>
      )}

      {mode === 'dict' && (
        <>
          <div style={hint}>
            <b>액션·전쟁</b> 고유의 서사 장치와 전개·페이싱·클라이맥스 관습 <b>{total}항목</b>을 정의·사용법·예시·비틀기로 묶었습니다.
            검색·펼침으로 찾고, 무작위로 영감을 얻으세요.
          </div>

          {/* 검색 */}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="장치·전개법 검색 (예: 세트피스, 시계, 최후의 저항, 대가 있는 승리)"
            style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
          />

          {/* 카테고리 펼침 필터 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY}
              style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e="✨"/> 전체
            </button>
            {CATS.map((c) => {
              const on = cat === c.key
              return (
                <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on} title={c.desc}
                  style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                  <Emoji e={c.icon}/> {c.label}
                </button>
              )
            })}
            <button className="minibtn" onClick={() => setCat(FAV_KEY)} aria-pressed={cat === FAV_KEY}
              style={{ borderColor: cat === FAV_KEY ? 'var(--accent)' : 'var(--border)', color: cat === FAV_KEY ? 'var(--text)' : 'var(--muted)' }}>
              ★ 즐겨찾기
            </button>
          </div>

          {/* 동작 줄 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 무작위 장치</button>
            <span style={hint}>{filtered.length}개 표시</span>
          </div>

          {/* 무작위 결과 */}
          {random && (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon}/> {random.cat.label}</span>
                <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
                {random.item.alias && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{random.item.alias}</span>}
                <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={rollRandom} title="다시 뽑기"><Emoji e="🔁"/></button>
                <button className="minibtn" onClick={() => setRandom(null)} title="닫기">✕</button>
              </div>
              <DeviceBody c={random.cat} d={random.item} />
            </div>
          )}

          {/* 목록 (펼침/접힘) */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {filtered.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
                {cat === FAV_KEY ? '★ 아직 즐겨찾기한 장치가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
              </div>
            ) : (
              filtered.map(({ cat: c, item }) => {
                const fk = favKey(c.key, item.name)
                const open = !!expanded[fk] || !!query.trim() || cat === FAV_KEY
                return (
                  <div key={fk} style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                      onClick={() => setExpanded((p) => ({ ...p, [fk]: !open }))}>
                      <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon}/> {c.label}</span>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</span>
                      {item.alias && <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{item.alias}</span>}
                      <span style={{ marginLeft: 'auto', flexShrink: 0, color: 'var(--muted)', fontSize: 13 }}>{open ? '▾' : '▸'}</span>
                    </div>
                    {!open && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginTop: 4 }}>{item.def}</div>}
                    {open && <DeviceBody c={c} d={item} />}
                  </div>
                )
              })
            )}
          </div>

          <div style={hint}>관습은 정답이 아니라 출발점입니다. 정의대로 쓰기보다 <b>비틀기</b>로 독자의 예측을 배신하세요.</div>
        </>
      )}

      {mode === 'gen' && (
        <>
          <div style={hint}>
            9개 슬롯을 무작위로 조합해 <b>액션·전쟁 전투 장면 한 컷</b>을 설계합니다. 마음에 드는 슬롯은 <Emoji e="🔒"/> <b>잠금</b>하고 나머지만 다시 굴리세요.
          </div>

          {/* 조작 줄 + 조합수 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={regenerate} style={{ flex: '0 0 auto' }}><Emoji e="🎰"/> 조합 굴리기</button>
            <button className="minibtn" onClick={() => setLocks({})} title="모든 잠금 해제"><Emoji e="🔓"/> 잠금 해제</button>
            <span style={{ ...hint, marginLeft: 'auto' }} title="9개 슬롯 풀의 곱 = 만들 수 있는 서로 다른 전투 장면 설계 수">
              <Emoji e="🧮"/> 조합수 <b style={{ color: 'var(--accent)' }}>{comboCount.toLocaleString('ko-KR')}</b>가지
            </span>
          </div>

          {/* 슬롯 목록 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {SLOTS.map((s) => {
              const locked = !!locks[s.key]
              return (
                <div key={s.key} style={{ ...card, borderColor: locked ? 'var(--accent)' : 'var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0, width: 92 }}><Emoji e={s.icon}/> {s.label}</span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{emojify(combo[s.key])}</span>
                    <button className="minibtn" onClick={() => toggleLock(s.key)} title={locked ? '잠금 해제' : '이 슬롯 잠금'}
                      style={{ flexShrink: 0, borderColor: locked ? 'var(--accent)' : 'var(--border)' }}>
                      {locked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                    </button>
                    <button className="minibtn" onClick={() => regenSlot(s)} title="이 슬롯만 다시" style={{ flexShrink: 0 }}><Emoji e="🔁"/></button>
                    <button className="minibtn" onClick={() => copy(combo[s.key], 'slot:' + s.key)} title="복사" style={{ flexShrink: 0 }}>
                      {copiedKey === 'slot:' + s.key ? '✓' : <Emoji e="📋"/>}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 조합 결과 동작 */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(comboToText(combo), 'combo:all')}>
              {copiedKey === 'combo:all' ? '✓ 전체 복사됨' : <><Emoji e="📋"/> 전투 장면 설계 전체 복사</>}
            </button>
            <button className="minibtn" onClick={comboToStash} title="글감 보관함에 담기"><Emoji e="📥"/> 글감 보관</button>
          </div>

          {/* 연계 줄 */}
          <div className="linkbar" style={{ flexWrap: 'wrap' }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={comboToProj} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 전투 장면 설계를 프로젝트 자료 〈액션·전쟁 장치〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            {RELATED.map((r) => (
              <button key={r.id} className="linkbtn" onClick={() => openRelated(r.id)} title={`${r.label} 열기`}>
                <Emoji e={r.icon}/> {r.label}
              </button>
            ))}
          </div>

          <div style={hint}>조합은 출발점입니다. 슬롯 간 충돌(목표↔불리 조건, 적↔지렛대)이 흥미롭다면 그 모순에서 장면이 살아납니다.</div>
        </>
      )}
    </div>
  )
}
