// 액션·전쟁 장르 지식·소재 사전 — 세트피스/장치, 군사 편제·전술, 화기·장비, 무협 초식·내공,
//  헌터·게임판타지, 감각·동작 어휘, 부상·대가, 톤 프리셋, 클리셰 경고를 카테고리로 모은 로컬 사전.
//  자급식: 외부 네트워크·라이브러리 없음. react 와 './linkbus' 만 import.
//  Math.random + localStorage(즐겨찾기·펼침·마지막 카테고리)만 사용. 펼침+검색+무작위+클릭복사.
//  + 소재 조합기(3슬롯, 잠금/재생성, 조합수 표시)로 즉석 액션 시드를 굴린다.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, TOOL_RELATIONS, Emoji, emojify } from './linkbus'

export const meta = { id: 'awk-action-knowledge', name: '액션·전쟁 지식 사전', icon: '⚔️', group: '지식 사전', genre: '액션·전쟁', intro: '세트피스·전술·화기·무협 초식·헌터·감각어휘·클리셰 경고까지, 액션/전쟁 집필 소재를 한곳에', w: 680, h: 620 }

interface Entry {
  name: string            // 소재/장치/어휘 이름
  concept: string         // 개념·정의(무엇인가)
  use: string             // 집필 활용(어떻게 쓰는가 — 장면·플롯 훅)
  caution: string         // 주의·클리셰 경고(흔한 실패·과용)
  tags?: string[]         // 검색 보조 태그
}
interface CatDef { key: string; label: string; icon: string; items: Entry[] }

// ---------- 로컬 액션·전쟁 지식 사전 ----------
const CATS: CatDef[] = [
  {
    key: 'setpiece', label: '세트피스·서사 장치', icon: '💥', items: [
      { name: '시계 장치(ticking clock)', concept: '폭탄 타이머·증원 도착·인질 처형 시한·만조·일출처럼, 정해진 시각이 다가올수록 긴장이 증폭되는 카운트다운 구조.', use: '전투 전반에 시한을 깔고 장면마다 남은 시간을 환기하라. 클라이맥스에서 00:01에 해제해 "시계의 정지"로 카타르시스를 완성한다. 두 개의 시한이 충돌하면(폭탄 vs 인질) 선택의 딜레마가 생긴다.', caution: '깔아놓은 시한을 중간에 잊어버리면 독자가 사기로 느낀다. 시간이 늘 정확히 0초에 해제되면 식상하니, 가끔은 시한을 넘겨 진짜 대가를 치르게 하라.', tags: ['타이머', '카운트다운', '폭탄', '시한', 'tension'] },
      { name: '최후의 저항(last stand)', concept: '소수가 압도적 다수를 막아서는 알라모식 농성·고립 방어. 1 대 다수의 수적 열세를 정면으로 받아들인다.', use: '약자 응원 심리를 동원하고, 엄폐물·탄약·동료 수를 하나씩 깎아 절망을 점층하라. 한 명씩 쓰러질 때마다 남은 자의 무게가 커진다. 증원이 "온다/안 온다"의 불확실성으로 변주.', caution: '주인공이 끝내 무손상으로 다 막아내면 열세가 거짓이 된다. 최소한 동료·진지·시간 중 무언가는 영구히 잃어야 긴장이 산다.', tags: ['알라모', '농성', '수적열세', 'outnumbered', '방어전'] },
      { name: '체호프의 환경 무기', concept: '1막에서 무심히 보여준 환경 요소(샹들리에·가스 밸브·절벽·강물·지뢰밭·크레인)를 전투에서 회수해 결정타로 활용한다.', use: '브리핑·정찰 장면에서 환경을 "그냥 묘사"하듯 심어두고, 능력 격차가 가장 클 때 그것으로 역전하라. 적도 같은 환경을 쓸 수 있게 해 머리 싸움으로 만든다.', caution: '전투 직전에 처음 등장한 환경 요소로 이기면 "갑툭튀"다. 반드시 사전에, 가급적 두 번 이상 노출해 둘 것.', tags: ['복선', '환경', '체호프', '회수', 'foreshadow'] },
      { name: '준비 몽타주(gear-up/loadout)', concept: '무장 점검·작전 브리핑·"규칙 정하기" 장면. 전투 전에 긴장을 적재하고 능력·자원을 사전 공개하는 의식.', use: '무엇을 챙기는지로 캐릭터를 드러내고(부적·여분 탄창·칼), 작전 계획을 보여줘 나중에 그것이 어긋날 때 긴장을 만든다. 로드아웃은 곧 "쓸 수 있는 카드"의 사전 선언.', caution: '준비 장면이 길어지면 추진력이 죽는다. 보여준 장비는 반드시 회수(사용)하고, 한 번도 안 쓴 화려한 장비는 군더더기.', tags: ['브리핑', '로드아웃', '준비', '의식', 'montage'] },
      { name: '거짓 안전지대(false sanctuary)', concept: '안전해 보이는 휴식·은신·귀환 직후에 터지는 기습. 페이싱의 들숨 직후 날숨을 끊는 설계.', use: '전투 사이 호흡 구간(부상 점검·농담·재회)에서 독자를 방심시킨 뒤 기습하라. 안전의 기호(따뜻한 불·식사·잠)를 깔수록 반전이 매섭다.', caution: '매번 휴식 = 기습이 되면 독자가 학습해 긴장이 죽는다. 진짜 안전한 휴식도 가끔 줘서 패턴을 깨야 다음 기습이 산다.', tags: ['기습', '반전', '휴식', '페이싱', 'ambush'] },
      { name: '마지막 한 발/마지막 힘', concept: '자원 고갈 직전의 역전. 탄약 한 발, 내공 한 줌, 부서진 무기, 꺼져가는 의식으로 결판을 낸다.', use: '전투 내내 자원을 가시적으로 소모시켜라(탄창 수를 세게 하라). 0에 수렴한 순간 "잃을 것이 명확해진" 의지로 마지막 자원을 쥐어짜는 역전을 배치.', caution: '"어디선가 솟아난 새 힘"은 배신(데우스 엑스 마키나)이다. 마지막 한 발은 미리 보여준 규칙 안에서 나와야 정당하다.', tags: ['탄약', '고갈', '역전', '클라이맥스', 'last bullet'] },
      { name: '희생적 후위(sacrificial rearguard)', concept: '동료가 남아 적을 막고 주인공·민간인을 탈출시키는 장치. 집단 액션·전쟁의 감정 정점.', use: '남는 자에게 미리 동기·관계·미완의 약속을 부여하라. "먼저 가" 한 마디가 무게를 가지려면 그 인물의 서사가 충분히 깔려 있어야 한다.', caution: '관계 빌드업 없는 인물의 희생은 신파일 뿐 감정이 안 산다. 또 매번 조연만 죽으면 안전망이 노출되니 가끔은 핵심 인물을 위협하라.', tags: ['희생', '후위', '동료', '탈출', 'heroic sacrifice'] },
      { name: '시그니처 무브/무기', concept: '인물 정체성을 압축한 반복 기술·무기(존 윅의 재장전, 무협의 절기, 저격수의 호흡 정지).', use: '초반에 시그니처를 각인시키고, 위기에서 봉인(못 쓰게)했다가 클라이맥스에서 변주·해방하라. 적이 그것을 파훼하는 순간이 최저점이 된다.', caution: '같은 기술을 같은 방식으로 매번 쓰면 둔감해진다. 봉인·진화·역이용의 변주 없이 반복하면 무게를 잃는다.', tags: ['시그니처', '절기', '필살기', '무기', 'signature move'] },
      { name: '명령의 시점 교차(전쟁)', concept: '지휘부(전략)와 현장 병사(전술·생존)의 시점을 교차해 "결정과 그 인간적 비용"을 동시에 보여준다. 『킬러 엔젤스』 방식.', use: '지휘관이 지도 위에서 내린 한 줄 명령이, 다음 장면에서 진창의 병사에게 어떤 피로 환산되는지 연결하라. 미시-거시의 동조가 전쟁물의 깊이를 만든다.', caution: '시점이 너무 자주 바뀌면 누가 어디 있는지 길을 잃는다. 시점 전환은 정보·감정의 대비가 명확할 때만.', tags: ['시점', '지휘부', '전략', '병사', 'pov'] },
      { name: '병참·정보의 비대칭(전쟁)', concept: '보급선·첩보·기만(거짓 무전·위장·양동)이 무력보다 승패를 가르는 "머리 싸움" 장치.', use: '"누가 더 잘 아는가/덜 굶는가"로 전세를 뒤집어라. 보급선 절단, 가짜 정보 흘리기, 위장 부대로 무력 열세를 지략으로 메우는 정당한 승리를 설계.', caution: '주인공만 늘 정보 우위에 서면 적이 멍청해 보인다. 적도 기만을 쓰게 해 정보전을 쌍방향으로.', tags: ['병참', '보급', '첩보', '기만', '양동작전'] },
      { name: '능력 격차 사다리', concept: '주인공이 적보다 명백히 약한 지점에서 시작해, 약점 발견·도구·희생·각성으로 격차를 좁혀 역전하는 점층 구조.', use: '작은 충돌→중간 보스→최종전으로 위험과 규모를 키우되, 각 단계마다 "어떻게 이겼는가"의 방식을 다르게 하라. 무협의 초식 파훼, 헌터의 각성, 전쟁의 전술 기만이 같은 기능.', caution: '모든 전투를 같은 규모·같은 승리 방식으로 풀면 액션이 평탄해진다. 무력 인플레만 반복하면 긴장이 마비된다.', tags: ['성장', '격차', '점층', '보스', 'power gap'] },
      { name: '부상 시계(injury as clock)', concept: '출혈·골절·중독을 시간제한으로 작동시켜 액션에 카운트다운을 부여하는 장치.', use: '주인공이 다친 채로 시한 안에 임무를 끝내야 하게 만들어라. 통증·시야 흐림·움직임 제약을 점증시켜 "이대로면 죽는다"의 압박을 신체로 환산.', caution: '치명상을 입고도 멀쩡히 싸우면 부상이 장식이 된다. 부상은 반드시 행동을 제약해야 시계로 작동한다.', tags: ['부상', '출혈', '시한', '대가', 'injury'] },
    ],
  },
  {
    key: 'military', label: '군사 편제·전술', icon: '🎖️', items: [
      { name: '편제(분대~사단)', concept: '분대(8~12)·소대(3~4분대)·중대·대대·연대·여단·사단으로 올라가는 부대 단위. 위로 갈수록 지휘 계층과 규모가 커진다.', use: '주인공의 소속 단위를 정하면 "그가 책임지는 사람 수"와 시야 범위가 결정된다. 분대장 시점은 동료 전원의 죽음을 체감하고, 사단장 시점은 숫자로 추상화된 손실을 다룬다.', caution: '계급·편제를 틀리게 쓰면 군사 독자가 즉시 이탈한다. 한국군/미군/가상군 중 어느 체계인지 통일하라.', tags: ['분대', '소대', '중대', '대대', '편제'] },
      { name: '측면 우회(flanking)', concept: '적의 정면이 아닌 옆구리·후방을 치는 기동. 적의 화력이 집중된 정면을 피해 약한 측면을 노린다.', use: '정면 교착 상태에서 한 부대가 우회해 측면을 찌르는 순간을 전세의 전환점으로 삼아라. "고정(정면 견제)과 기동(우회)"의 망치-모루 구조가 고전적 승리 공식.', caution: '우회에는 시간·은밀성이 들고 발각되면 역포위당한다. 우회가 늘 성공하면 긴장이 없으니 발각 위험을 함께 그려라.', tags: ['우회', '측면', '망치모루', 'flanking', '기동'] },
      { name: '포위 섬멸·각개격파', concept: '포위 섬멸은 적을 에워싸 퇴로를 끊고 전멸시키는 것, 각개격파는 분산된 적을 하나씩 따로 격파하는 것.', use: '수적 우위를 살릴 땐 포위, 열세일 땐 적을 분리해 각개격파하는 전술적 사고를 인물에게 부여하라. "뭉치면 못 이기지만 나눠지면 이긴다"가 약자의 정석.', caution: '포위는 완전 포위(섬멸)와 어설픈 반포위(역공 허용)의 차이가 크다. 전술 용어를 분위기로만 쓰면 핍진성이 깨진다.', tags: ['포위', '섬멸', '각개격파', 'encirclement'] },
      { name: '제압 사격·엄호', concept: '명중보다 적의 머리를 숙이게 해 움직임을 막는 사격(제압). 그 틈에 아군이 이동·돌격(엄호 기동).', use: '"쏘는 자"와 "움직이는 자"의 역할 분담으로 전진을 묘사하면 총격전이 입체적이 된다. 탄약은 명중이 아니라 시간을 사는 데 쓰인다는 감각.', caution: '모두가 정확히 명중시키며 전진하면 비현실적이다. 실제 교전의 대부분은 제압 사격이며 명중률은 낮다.', tags: ['제압사격', '엄호', '기동', 'suppressive fire'] },
      { name: '거점 사수·종심 방어', concept: '거점 사수는 핵심 지점을 끝까지 지키는 것, 종심 방어는 전방을 일부러 내주며 여러 겹의 방어선으로 적을 소모시키는 것.', use: '"여기서 한 발도 못 물러난다"의 거점 사수는 비장미, 종심 방어는 "내주고 끌어들여 친다"의 지략. 어느 쪽을 택하느냐로 지휘관 성격이 드러난다.', caution: '종심 방어를 단순 후퇴와 혼동하지 말 것. 계획된 후퇴와 붕괴는 전혀 다른 장면이다.', tags: ['거점', '사수', '종심방어', 'defense in depth'] },
      { name: '양동작전·기만', concept: '진짜 공격 지점을 숨기기 위해 다른 곳을 치는 척하는 견제. 적의 예비대를 엉뚱한 곳으로 유인한다.', use: '독자에게도 양동을 진짜처럼 보여줬다가 본대의 진짜 노림수를 드러내면 반전의 쾌감이 크다. 기만은 정보 비대칭을 만드는 핵심 도구.', caution: '양동이 너무 빤하면 적도 독자도 속지 않는다. 양동에도 진짜 피해가 따라야 설득력이 생긴다.', tags: ['양동', '기만', '견제', 'feint', '유인'] },
      { name: '척후·정찰', concept: '본대보다 앞서 적 위치·규모·지형을 살피는 소수 정찰. 전투 전 "지도를 그리는" 단계.', use: '정찰 장면으로 독자에게 전장 지리(누가 어디, 출구·고지·거리)를 미리 심어라. 이게 곧 액션의 "공간 지리" 설치다. 정찰 실패·발각은 작전 전체를 비튼다.', caution: '정찰로 알아낸 정보를 인포덤프로 한꺼번에 쏟지 말 것. 필요한 만큼 흘리고 나머지는 전투 중에 회수.', tags: ['척후', '정찰', '지형', 'recon', '첩보'] },
      { name: '돌격·백병전', concept: '엄폐를 버리고 적진으로 달려드는 최후의 근접 돌입. 총검·삽·주먹까지 동원되는 근거리 난전(백병전).', use: '거리(원거리→근접)가 좁혀지며 잔혹도·친밀도가 상승하는 페이싱에서 돌격을 클라이맥스로. 적의 얼굴이 보이는 거리에서 전쟁의 진짜 얼굴이 드러난다.', caution: '현대전에서 무모한 돌격은 자살에 가깝다. 돌격에는 반드시 명분(탄약 고갈·시한·퇴로 차단)이 있어야 한다.', tags: ['돌격', '백병전', '총검', '근접', 'charge'] },
      { name: '참호·공성·농성', concept: '참호는 땅을 파 몸을 숨긴 진지전, 공성은 요새·성을 공격, 농성은 안에서 버티는 수성. 소모와 인내의 전투.', use: '참호전은 진흙·쥐·포격·기다림의 환멸을 그리기 좋다(레마르크식). 공성·농성은 "안과 밖"의 자원 시계(식량·물·증원)를 카운트다운으로 활용.', caution: '진지전·공성은 자칫 지루해진다. 큰 정적 사이에 짧고 격렬한 충돌을 배치해 들숨-날숨을 만들 것.', tags: ['참호', '공성', '농성', '진지전', 'siege'] },
      { name: '제공권·포격(곡사/직사)', concept: '하늘을 장악하는 제공권, 그리고 곡사(포물선으로 엄폐물 너머)·직사(직선으로 눈앞 표적) 포격. 전장을 위에서 짓누르는 힘.', use: '"하늘에서 무언가 온다"의 공포로 지상 인물을 무력화하라. 근접 항공 지원·포격 좌표 호출은 현장과 지휘부를 잇는 긴박한 무전 장면을 만든다.', caution: '아군 오폭(프렌들리 파이어)은 강력한 비극 장치지만 남발하면 작위적이다. 포격 좌표·시한의 사실성에 주의.', tags: ['제공권', '포격', '곡사', '직사', '항공지원'] },
    ],
  },
  {
    key: 'gear', label: '화기·장비·교전', icon: '🔫', items: [
      { name: '탄창·약실·재장전', concept: '탄창(탄약 묶음)을 갈아끼우고, 약실(총알이 발사되는 자리)에 한 발을 장전하는 일련의 동작. 재장전은 전투 중 가장 취약한 순간.', use: '재장전을 "비어버린 총"의 긴장으로 활용하라. 적과 동시에 빈 탄창을 떨구는 순간, 누가 더 빠르냐가 생사를 가른다. 탄창 수 세기로 자원 시계를 만든다.', caution: '권총·소총의 장탄수를 무시하고 끝없이 쏘면 핍진성이 무너진다. "탄피가 비처럼" 같은 묘사 전에 실제 장탄수를 점검하라.', tags: ['탄창', '약실', '재장전', 'reload', '장탄수'] },
      { name: '반동·조준선·탄착', concept: '발사 시 총이 뒤로 밀리는 반동, 가늠자-가늠쇠를 잇는 조준선, 총알이 떨어지는 지점인 탄착. 사격의 물리.', use: '반동으로 어깨가 들리고, 연사하면 총구가 위로 튀어 탄착이 흩어지는 감각을 넣어라. "조준선을 정렬하고 숨을 멈춘다"는 저격의 시그니처 리듬.', caution: '연발로 정확히 헤드샷을 연발하는 건 반동을 모르는 묘사다. 거리·반동·이동 표적은 명중률을 급격히 떨어뜨린다.', tags: ['반동', '조준선', '탄착', 'recoil', '명중'] },
      { name: '연발·점사·단발', concept: '방아쇠를 당기는 동안 계속 나가는 연발(풀오토), 2~3발씩 끊어 쏘는 점사(버스트), 한 발씩 쏘는 단발. 사격 모드.', use: '"점사로 끊어 쏜다"는 노련함, "연발로 갈긴다"는 절박함·제압을 드러낸다. 모드 전환 자체를 인물의 판단·숙련도로 보여줄 수 있다.', caution: '연발은 탄약을 순식간에 소모하고 명중률이 낮다. 영화처럼 풀오토로 정밀 사격하는 건 비현실적.', tags: ['연발', '점사', '단발', 'burst', 'full auto'] },
      { name: '근접신관·곡사화기(수류탄/박격포)', concept: '일정 거리·시간·접촉에서 터지는 신관을 가진 폭발물. 수류탄·박격포·유탄은 엄폐물 너머나 밀집한 적을 노린다.', use: '"안전핀을 뽑고 3초를 센 뒤 던진다"는 수류탄의 시계 장치. 좁은 실내에서 굴러온 수류탄 한 발이 만드는 절체절명의 선택(되던지기·몸으로 덮기).', caution: '수류탄 폭발 반경·살상 범위를 무시하면 안 된다. 영화식으로 폭발 옆에서 멀쩡한 건 핍진성을 해친다.', tags: ['수류탄', '박격포', '유탄', '신관', 'grenade'] },
      { name: '저격·관측수', concept: '원거리에서 단 한 발로 표적을 제거하는 저격수와, 거리·풍속·표적을 읽어주는 관측수의 2인 1조 운용.', use: '바람·중력 낙차·심박을 계산하는 "한 발의 수학"을 슬로우로 묘사하라. 저격은 인내(며칠의 잠복)와 찰나(0.5초)의 극단적 대비가 매력. 관측수와의 무전 호흡이 케미.', caution: '저격을 만능 즉살기로 쓰면 긴장이 죽는다. 빗맞음·위치 노출·이동 표적의 변수로 한 발의 무게를 지켜라.', tags: ['저격', '관측수', '풍속', 'sniper', '잠복'] },
      { name: '냉병기(검·창·둔기)', concept: '검·도·창·도끼·둔기 등 날·무게로 베고 찌르고 부수는 무기. 거리·중량·살상 방식이 제각각.', use: '무기의 길이=교전 거리다. 창은 거리를 지키고, 단검은 파고들어야 한다. 무기의 무게·관성(휘두른 뒤의 빈틈)을 안무에 반영하면 검극이 입체적이 된다.', caution: '검을 깃털처럼 휘두르는 묘사는 무게를 무시한 것. 베인 상처의 출혈·둔기의 골절 등 실제 살상 결과를 외면하면 가벼워진다.', tags: ['검', '창', '둔기', '냉병기', '검극'] },
      { name: '엄폐·은폐·교전 거리', concept: '엄폐(총알을 막는 벽·콘크리트)와 은폐(몸을 가리지만 못 막는 수풀·연막)의 구분. 그리고 원·중·근거리의 교전 양상.', use: '"저건 은폐일 뿐 엄폐가 아니다"는 노련함의 신호. 엄폐물을 하나씩 부수며 좁혀오는 적은 공간 지리를 압박으로 바꾼다. 거리가 좁혀질수록 잔혹·친밀도 상승.', caution: '수풀·나무문 뒤에 숨어 총알을 막는 묘사는 은폐/엄폐 혼동이다. 무엇이 무엇을 막는지 일관성을 지켜라.', tags: ['엄폐', '은폐', '교전거리', 'cover', '연막'] },
      { name: '폭파·매복(IED/지뢰)', concept: '도로변 급조 폭발물(IED)·지뢰·부비트랩 등 보이지 않는 위협. 적이 거기 없어도 죽일 수 있는 공포.', use: '"발을 떼면 터진다"의 지뢰는 정지된 시계 장치(움직일 수 없는 인물)를 만든다. 매복·폭파의 공포는 "안전한 길"이 없다는 만성 불안으로 분위기를 잠식.', caution: '폭발물 처리·탐지 절차를 너무 손쉽게 그리면 긴장이 죽는다. 전선을 자르는 색깔 선택 같은 진부한 연출은 피할 것.', tags: ['IED', '지뢰', '부비트랩', '폭파', 'mine'] },
      { name: '통신·무전·교란', concept: '무전기로 명령·좌표·구조 요청을 주고받는 통신. 그리고 전파 교란(재밍)·도청·암호로 그것을 끊고 듣는 정보전.', use: '"응답이 없다"의 통신 두절은 고립의 공포를, 도청당한 무전은 함정을 만든다. 마지막 구조 요청, 끊기는 무전 한 마디가 강력한 감정 장치.', caution: '무전이 늘 잘 통하면 긴장이 없다. 잡음·전파 두절·암호 오류 같은 마찰을 넣어야 통신이 드라마가 된다.', tags: ['무전', '통신', '교란', 'comms', '도청'] },
    ],
  },
  {
    key: 'wuxia', label: '무협·초식·내공', icon: '🥋', items: [
      { name: '내공·진기·운기', concept: '단전에 쌓는 생명·무력 에너지(내공/진기)와, 그것을 경맥을 따라 돌려 쓰는 운기 행공. 무협 무력의 자원 시스템.', use: '내공을 "탄약"처럼 소모 자원으로 다뤄라. 운기로 회복하는 데 시간이 필요하면, 회복 중 무방비라는 취약점이 긴장을 만든다. 내공의 양·순수도가 곧 격차의 척도.', caution: '내공이 무한하거나 필요할 때마다 솟으면 데우스 엑스 마키나다. 회복 속도·총량의 규칙을 정해 일관되게 지켜라.', tags: ['내공', '진기', '운기', '단전', '심법'] },
      { name: '초식·절기·검기', concept: '정해진 동작·이치를 가진 무공의 한 수(초식), 문파를 대표하는 비기(절기), 검에 내공을 실어 뿜는 검기. 무협 액션의 "기술 카드".', use: '초식에 이름·이치·약점을 부여하라. 적의 초식을 "파훼"하는 과정이 무협판 머리 싸움이다. 봉인된 절기를 클라이맥스에서 해방하는 점층이 정석.', caution: '"○○검법 제3초식!"을 외치는 안무 나열은 지루하다. 결정적 3~5초식만 슬로우로, 나머지는 요약. 갑툭튀 신초식은 금물.', tags: ['초식', '절기', '검기', '비기', '파훼'] },
      { name: '경공·신법', concept: '몸을 가볍게 해 벽을 달리고 물 위를 밟으며 빠르게 이동하는 경공, 그 보법·움직임 체계인 신법.', use: '경공으로 추격·도주·기습의 공간을 입체화하라(지붕 위, 절벽, 대숲). 속도·고도 차이가 곧 전술적 우위. 신법의 보법이 시그니처 무브가 될 수 있다.', caution: '경공으로 모든 위기를 회피하면 긴장이 없다. 내공 소모·착지 빈틈 같은 대가를 붙여 무한 도주를 막아라.', tags: ['경공', '신법', '보법', '추격', '경신술'] },
      { name: '점혈·금나수', concept: '혈도를 짚어 상대를 마비·봉쇄하는 점혈, 관절·급소를 꺾고 잡는 근접 제압술(금나수).', use: '"움직일 수 없게 된" 무력화는 살상 없이 긴장을 만든다. 점혈당한 채 시간 안에 풀어야 하는 부상 시계로도 활용. 금나수는 거리가 0이 된 친밀한 폭력.', caution: '점혈이 만능 무력화면 모든 싸움이 점혈 한 방으로 끝난다. 명중 난이도·고수의 저항이라는 변수를 둘 것.', tags: ['점혈', '금나수', '혈도', '제압', '마비'] },
      { name: '비무·서열·문파전', concept: '규칙 있는 대결(비무), 무림의 강자 순위(서열), 문파 대 문파의 집단 충돌(문파전). 무협 갈등의 무대.', use: '비무는 "규칙 안의 1대1"로 인물의 무력을 정직하게 보여준다. 서열전 반복으로 성장을 측정하고, 문파전을 권/시즌 단위의 대규모 클라이맥스로.', caution: '서열전·비무가 무력 인플레만 반복하면 마비된다. 매 대결의 "방식"(약점 공략·지략·희생)을 다르게 해야 평탄화를 피한다.', tags: ['비무', '서열', '문파전', '무림', '대결'] },
      { name: '기연·주화입마', concept: '우연히 얻는 비급·영약·기인의 가르침(기연), 그리고 무리한 수련·내공 폭주로 심신이 망가지는 주화입마. 성장의 빛과 그림자.', use: '기연으로 격차를 좁히되 "공짜"가 아니게 하라(시련·대가·봉인 해제 조건). 주화입마는 능력에 붙는 강력한 리스크 시계—폭주의 위험이 곧 긴장.', caution: '기연으로만 강해지면 노력 없는 사이다가 된다. 기연은 누적된 수련의 결실로 회수돼야 정당하다. 주화입마를 잊고 무한 흡공하면 규칙 붕괴.', tags: ['기연', '주화입마', '비급', '영약', '흡성'] },
      { name: '정파·사파·마교', concept: '협의를 표방하는 정파, 수단을 가리지 않는 사파, 금단의 무공을 쓰는 마교. 무협 세계의 진영 구도.', use: '진영으로 윤리축(명분 vs 실리)을 깔고, 진짜 적이 아군 정파 내부였다는 반전 클라이맥스도 가능. 사파/마교 무공의 "빠른 강함·큰 대가"가 유혹의 서사.', caution: '정파=선, 마교=악의 단순 도식은 진부하다. 정파의 위선, 사파의 의리처럼 진영을 비틀어야 입체적.', tags: ['정파', '사파', '마교', '진영', '협의'] },
    ],
  },
  {
    key: 'hunter', label: '헌터·게임판타지', icon: '🗡️', items: [
      { name: '각성·등급·재능', concept: '평범한 자가 초인적 힘을 얻는 각성, 그 강함을 매기는 등급(F~SS·1~10성), 타고난 적성·고유 능력(재능). 헌터물 성장의 출발선.', use: '낮은 등급에서 시작해 각성·기연으로 도약하는 사이다 곡선을 설계하라. "등급은 낮지만 재능은 비범"한 격차 역전이 한국 웹소설의 단골. 등급은 곧 독자가 체감하는 무력 척도.', caution: '각성 한 번에 최강이 되면 이후 긴장이 없다. 등급 인플레만 반복하면 숫자만 커지고 위기가 사라진다. 더 강한 위협을 함께 키워라.', tags: ['각성', '등급', '재능', '헌터', 'rank'] },
      { name: '스킬·쿨타임·자원(MP)', concept: '발동형 능력(스킬)과 재사용 대기시간(쿨타임), 스킬을 쓰는 데 드는 마나·스태미나 같은 자원. 능력의 규칙 시스템.', use: '쿨타임·자원을 "탄약 시계"로 활용하라. 강한 스킬일수록 쿨·소모가 커서, 한 방을 언제 쓰느냐가 전술이 된다. 자원 고갈 직전의 마지막 스킬이 클라이맥스.', caution: '필요할 때마다 쿨이 다 돌고 자원이 충분하면 규칙이 무의미하다. 한계를 일관되게 지켜야 카타르시스가 정당해진다.', tags: ['스킬', '쿨타임', 'MP', '마나', '스태미나'] },
      { name: '버프·디버프·상태이상', concept: '능력을 올리는 버프, 낮추는 디버프, 중독·기절·출혈 같은 상태이상. 전투를 수치·조건으로 다루는 게임식 변수.', use: '"디버프를 먼저 거느냐"가 승부를 가르는 두뇌전을 만들어라. 상태이상(중독·출혈)은 게임판 부상 시계. 버프 중첩·해제 타이밍이 곧 전술 깊이.', caution: '버프·디버프를 수치 나열로만 쓰면 스프레드시트 전투가 된다. 수치 뒤의 신체 감각·긴장을 함께 묘사할 것.', tags: ['버프', '디버프', '상태이상', '중독', 'status'] },
      { name: '역할(탱커·딜러·힐러)', concept: '적의 공격을 받아내는 탱커, 피해를 주는 딜러, 회복·지원하는 힐러로 나뉜 파티 역할 분담(트라이앵글).', use: '레이드·길드전에서 역할 조합·붕괴로 긴장을 만들어라. "힐러가 죽으면 파티가 무너진다"는 우선 표적의 논리. 역할을 깨는 만능 주인공의 의외성도 사이다.', caution: '역할 클리셰를 기계적으로 따르면 전투가 예측 가능해진다. 역할 전환·파괴로 변주를 줘야 신선하다.', tags: ['탱커', '딜러', '힐러', '파티', 'raid'] },
      { name: '던전·레이드·게이트', concept: '몬스터가 출몰하는 폐쇄 공간(던전), 다수가 거대 보스에 도전하는 협동전(레이드), 이세계로 통하는 균열(게이트·차원문).', use: '던전은 "출구·시간제한·자원"이 명확한 천연 세트피스다. 레이드 보스는 패턴·페이즈로 능력 격차 사다리를 구현. 게이트는 일상 침범의 공포를 연다.', caution: '던전이 단순 몹 사냥의 반복이면 평탄해진다. 각 던전·레이드에 고유한 제약·합병증(함정·환경·페이즈 전환)을 줄 것.', tags: ['던전', '레이드', '게이트', '보스', 'dungeon'] },
      { name: '시스템·상태창·퀘스트', concept: '주인공에게만 보이는 게임식 인터페이스(시스템 메시지·상태창)와, 목표·보상을 제시하는 퀘스트. 메타적 능력 표시 장치.', use: '상태창으로 능력의 규칙을 독자에게 투명하게 공개해 카타르시스를 정당화하라. 시스템의 의도·정체에 대한 미스터리를 장기 떡밥으로 깔 수 있다.', caution: '상태창 수치 나열이 액션을 끊어먹지 않게 하라. 시스템이 모든 답을 주면 위기가 사라지니, 정보의 공백·오류를 둘 것.', tags: ['시스템', '상태창', '퀘스트', 'status window', '메시지'] },
      { name: '회귀·전직·고유능력', concept: '죽거나 망한 뒤 과거로 돌아가 다시 사는 회귀, 직업·계열을 바꾸는 전직, 단 하나뿐인 비대칭 능력(고유 스킬). 한국 웹소설 핵심 장치.', use: '회귀자는 "미래 정보"라는 압도적 정보 우위로 사이다를 만든다. 고유능력은 시그니처 무브—약점·조건을 붙여 만능이 되지 않게 설계하라. 전직으로 성장의 방향을 트는 전환점.', caution: '회귀의 정보 우위가 무한하면 긴장이 사라진다. "미래가 바뀌어 정보가 안 통하는" 변수를 넣어야 회귀물이 산다. 고유능력 만능화 경계.', tags: ['회귀', '전직', '고유능력', '회귀자', 'regression'] },
    ],
  },
  {
    key: 'sense', label: '감각·동작 어휘', icon: '🩸', items: [
      { name: '타격·속도 동사', concept: '파고들다·비틀다·꿰뚫다·후려치다·내리꽂다·짓이기다·스치다·빗나가다 — 액션을 추진하는 강한 동사군.', use: '격렬 구간은 짧은 문장·동사 중심으로 속도를 올려라. "막고-비틀고-찌른다"식 과잉 나열 대신 결정적 동작 하나를 골라 꽂는다(한 동작=한 비트).', caution: '같은 강한 동사를 반복하면 둔감해진다. 약한 동사(있다·하다)로 액션을 묘사하면 추진력이 죽는다.', tags: ['동사', '타격', '속도', '비트', 'verb'] },
      { name: '신체감각 어휘', concept: '반동·심장이 터질 듯·폐가 타들어가다·식은땀·아드레날린·시야가 좁아지다·귀가 먹먹·통증이 번지다 — 전투의 내부 감각.', use: '외부 동작만이 아니라 인물의 몸 안에서 일어나는 일을 넣어 핍진성을 높여라. 시야 협착·이명·심박 같은 생리 반응이 "위기의 실감"을 만든다.', caution: '매 장면 "심장이 터질 듯"을 반복하면 클리셰다. 감각 묘사도 과하면 액션의 속도를 늦추니 결정적 순간에만.', tags: ['신체감각', '아드레날린', '심박', '통증', 'sensation'] },
      { name: '소리·냄새 어휘', concept: '총성이 갈라지다·금속이 맞부딪치다·화약 냄새·피비린내·흙먼지·살이 찢기는 소리·정적 — 전장의 청각·후각.', use: '시각에 치우친 액션에 소리·냄새를 더해 입체화하라. 격전 직후의 "정적"이 가장 강한 소리일 수 있다. 화약·피 냄새는 전장의 인장.', caution: '효과음 의성어("탕! 쾅!")의 남발은 유치해 보일 수 있다. 소리를 동사·비유로 풀어내는 편이 문학적이다.', tags: ['소리', '냄새', '총성', '화약', '정적'] },
      { name: '시간왜곡·슬로모션', concept: '위기의 찰나가 길게 늘어나는 체감(슬로모션), "찰나·순식간에·단숨에" 같은 시간 압축/팽창 표현.', use: '결정적 3~5비트만 슬로우로 늘여 클로즈업하고, 나머지는 "순식간에"로 압축 요약하라(scene vs summary). 슬로우는 독자의 시선을 멈추는 줌인 효과.', caution: '모든 순간을 슬로모션으로 늘이면 긴장이 풀어진다. 슬로우는 희소해야 무게가 산다.', tags: ['슬로모션', '찰나', '시간왜곡', '비트', 'slowmo'] },
      { name: '문장 길이=속도계', concept: '격렬 구간은 단문·행 바꿈 잦게, 준비·여파 구간은 만연체 허용. 문장의 호흡이 곧 액션의 속도.', use: '전투 절정에서 문장을 짧게 끊고 단락(=카메라 컷)을 자주 나눠 영상적 리듬을 만들어라. 여파 장면에선 문장을 늘여 숨을 고르게 한다.', caution: '전투 장면인데 평균 문장이 길고 만연하면 속도가 죽는다(분석 도구의 경고 대상). 반대로 모든 문장이 단문이면 단조롭다.', tags: ['문장길이', '단문', '페이싱', '리듬', '단락'] },
      { name: '들숨-날숨 리듬', concept: '액션 폭발 → 짧은 호흡(부상 점검·한 마디·다음 계획) → 더 큰 액션의 파동 구조. 쉼 없는 액션은 역설적으로 둔감해진다.', use: '큰 세트피스 사이에 짧은 정적·농담·관계 장면을 끼워 독자의 감정을 재충전하라. 호흡 구간에서 다음 액션의 이해관계를 다시 끌어올린다.', caution: '전투를 쉼 없이 이어 붙이면 독자가 무뎌진다(감정 둔감화). 반대로 호흡이 너무 길면 추진력을 잃는다.', tags: ['리듬', '호흡', '페이싱', '들숨날숨', 'pacing'] },
    ],
  },
  {
    key: 'tone', label: '톤 프리셋·정서', icon: '🎭', items: [
      { name: '반전·환멸(anti-war)', concept: '전쟁의 영광을 벗기고 참호의 진창·무의미한 죽음·환멸을 그리는 톤. 레마르크·헬러·보니것 계보.', use: '"왜 싸우는가"에 환멸로 답하라. 영웅적 기대를 세웠다가 무너뜨리는 구조, 부조리·블랙코미디(캐치-22), 후방·민간인 시점으로 전쟁의 허위를 폭로.', caution: '환멸을 설교조로 직접 외치면 메시지가 떠 보인다. 구체적 디테일(병사가 지고 다닌 물건)로 보여줄 것.', tags: ['반전', '환멸', '참호', '부조리', 'antiwar'] },
      { name: '영웅·카타르시스', concept: '개인의 무력·기교를 시청각적으로 과시하며 위기-탈출의 펄스를 반복하는 통쾌한 톤. 펄프·존 윅·헌터물 계보.', use: '명확한 악당, 점층되는 세트피스, 시그니처 무브, 사이다(통쾌한 응징)를 배치하라. 이기되 "머리·준비·희생·약점공략"으로 이겨 정당성을 확보.', caution: '무손상·운빨 승리의 반복은 긴장 붕괴다. 카타르시스에도 대가(부상·상실)를 섞어야 무게가 산다.', tags: ['영웅', '카타르시스', '사이다', '펄프', 'catharsis'] },
      { name: '전략·정치', concept: '개인 무력보다 함대전·전략·체제·음모를 다루는 지적인 톤. 『은하영웅전설』·톰 클랜시·『유녀전기』 계보.', use: '병참·정보·기만의 머리 싸움을 전면에 세우고, 지휘부 시점으로 "결정의 비용"을 다뤄라. 진짜 적이 아군 지휘부·체제라는 반전 클라이맥스가 어울린다.', caution: '전략 설명(인포덤프)이 길어지면 추진력이 죽는다. 전략은 현장의 결과로 환산해 보여줘야 체감된다.', tags: ['전략', '정치', '함대전', '음모', 'strategy'] },
      { name: '무협·초식(동양 군담)', concept: '내공·초식·문파·협의를 축으로 한 동양적 무력 미학. 김용·신무협·『화산귀환』·『나노마신』 계보.', use: '비무·서열전으로 성장을 측정하고, 초식 파훼의 두뇌전, 봉인된 절기의 클라이맥스 해방을 설계하라. 협(俠)의 윤리축이 갈등의 깊이를 만든다.', caution: '무력 인플레와 초식 외치기 나열을 경계. 기연은 수련의 결실로, 신경지는 누적 복선으로 회수돼야 한다.', tags: ['무협', '초식', '협의', '신무협', 'wuxia'] },
      { name: '헌터·각성(현대 판타지)', concept: '평범한 현대인이 시스템·각성으로 초인이 되는 한국 웹소설 주류 톤. 회차 클리프행어·사이다/고구마 회로 지배.', use: '회차 끝을 전투 절정 직전·반전 직후의 클리프행어로 끊고, 한 회 안에 작은 위기-해소(사이다) 1회 이상을 배치하라. 시스템으로 능력 규칙을 투명하게.', caution: '"고구마(답답함)"가 길면 독자가 이탈한다. 무력 인플레 숫자놀음만 반복하면 위기가 사라지니 위협을 함께 키워라.', tags: ['헌터', '각성', '웹소설', '클리프행어', '사이다'] },
    ],
  },
  {
    key: 'cliche', label: '클리셰·경고', icon: '⚠️', items: [
      { name: '데우스 엑스 마키나(갑툭튀 힘)', concept: '위기에서 아무 복선 없이 솟아나는 새 힘·새 기술·우연한 구원으로 문제를 해결하는 것. 능력 규칙의 배신.', use: '대신: 위기에서 쓰일 힘·도구·약점을 1~2막에 반드시 미리 심어라. "각성"조차 누적된 수련·복선의 결실이어야 정당하다.', caution: '독자는 갑툭튀 승리를 즉시 "사기"로 인식한다. 승부는 머리·준비·희생·약점공략으로 나야 카타르시스가 산다.', tags: ['데우스엑스마키나', '갑툭튀', '복선', '배신', 'deus ex machina'] },
      { name: '무손상 승리의 반복', concept: '주인공이 매번 다치지도, 잃지도 않고 깔끔하게 이기는 것. 물리적 대가의 부재로 긴장이 붕괴한다.', use: '대신: 부상·피로·트라우마·탄약 소모·동료의 상실 중 무언가를 매 전투에서 치르게 하라. "무엇을 잃는가"가 위태로워야 이해관계가 산다.', caution: '죽을 수 없는 주인공이라도 잃을 것은 있어야 한다. 무손상 연승은 다음 위기의 긴장을 미리 죽인다.', tags: ['무손상', '대가', '이해관계', 'stakes', 'cost'] },
      { name: '공간 혼란(geography 붕괴)', concept: '누가 어디 있고, 출구·엄폐물·거리·시한이 무엇인지 독자가 머릿속에 그릴 수 없는 상태. 액션 최대의 실패.', use: '대신: 전투 전 정찰·브리핑으로 전장 지리를 심고, 교전 중에도 위치·거리를 주기적으로 환기하라. "약함"보다 "혼란"이 액션을 망친다.', caution: '안무를 화려하게 쓸수록 위치 감각을 더 자주 잡아줘야 한다. 시점 난립·과잉 동작 나열이 혼란의 주범.', tags: ['공간지리', '혼란', '명료성', 'geography', '엄폐'] },
      { name: '액션의 평탄화', concept: '모든 전투가 같은 규모·같은 승리 방식으로 반복되어 긴장이 우상향하지 않는 상태.', use: '대신: 세트피스마다 고유한 장소·제약·목표·합병증을 부여하고, 매번 다른 방식(약점 공략·지략·환경·희생)으로 이기게 하라. 뒤로 갈수록 규모·위험을 키운다.', caution: '무력 인플레만 반복하면 숫자만 커지고 체감 위기는 줄어든다. 적의 위협도 함께 진화해야 한다.', tags: ['평탄화', '세트피스', '점층', '인플레', 'escalation'] },
      { name: '호흡 부재(둔감화)', concept: '전투를 쉼 없이 이어 붙여 독자의 감정이 무뎌지는 것. 역설적으로 너무 많은 액션이 액션을 죽인다.', use: '대신: 큰 액션 사이에 짧은 호흡(부상 점검·농담·관계·계획)을 끼워 들숨-날숨을 만들어라. 호흡 구간에서 다음 위기의 이해관계를 재장전한다.', caution: '거짓 안전지대로 활용하되 매번 휴식=기습이 되면 패턴이 읽힌다. 진짜 쉼도 가끔 줘야 한다.', tags: ['호흡', '둔감화', '페이싱', '들숨날숨', 'pacing'] },
      { name: '전투 직전 인포덤프', concept: '전투 직전에 룰·지리·설정 설명을 한꺼번에 몰아넣어 추진력을 잃는 것.', use: '대신: 설정·지리는 정찰·준비 몽타주 등에 분산해 미리, 조금씩 흘려라. 전투가 시작되면 정보가 아니라 행동으로 보여준다.', caution: '"여기서 잠깐 설명하자면"식 끼어들기는 긴장을 깬다. 필요한 규칙은 전투 전에, 나머지는 전투 중 행동으로 회수.', tags: ['인포덤프', '설명', '추진력', 'infodump', '몰입'] },
      { name: '운빨·우연 승리', concept: '준비·실력·희생이 아니라 운·우연·적의 자멸로 이기는 것. 독자가 "사기"로 인식하는 부당한 승리.', use: '대신: 이김의 근거(미리 깐 약점·환경·동료의 선물·인물의 결단)를 클라이맥스에 동시 발화시켜라. 운이 작용하더라도 그 운을 "준비된 자만 잡을 수 있게" 설계.', caution: '적이 갑자기 멍청해지는 것도 운빨 승리의 변종이다. 적의 유능함을 끝까지 지켜야 승리가 값지다.', tags: ['운빨', '우연', '정당성', '약점회수', 'luck'] },
    ],
  },
]

interface Flat { cat: CatDef; item: Entry }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const LS = 'sry:tool:awk-action-knowledge:'
const ALL_KEY = '__all__'

const escapeHtml = (str: string) =>
  String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ---------- 소재 조합기(3슬롯) 풀 — 액션/전쟁 특화, 무작위 시드 ----------
const PLACE_POOL = [
  '폭우 쏟아지는 야간 고가도로', '함락 직전의 성벽 위', '봉쇄된 지하 주차장', '안개 낀 참호와 무인지대', '추락하는 수송기 화물칸',
  '인질이 잡힌 만조의 항만 창고', '눈보라 치는 산악 고지의 벙커', '정전된 초고층 빌딩 계단실', '폐쇄된 던전 3층 함정 구역', '대숲 사이 무너진 사찰',
  '증원이 끊긴 국경 검문소', '연막에 잠긴 시가지 사거리', '침수되는 잠수함 기관실', '불타는 보급 차량 행렬', '균열(게이트)이 열린 도심 광장',
  '협곡을 가로지른 흔들다리', '폭약이 설치된 댐 내부', '서열전이 열리는 무림 비무대', '레이드 보스의 옥좌가 있는 홀', '저격수가 노리는 옥상 헬기 패드',
  '모래폭풍이 휘몰아치는 사막 전초기지', '탄광 갱도가 무너지는 지하 막장', '얼어붙은 호수 위 빙판 전장', '용암이 흐르는 화산 동굴', '폭풍우 속 좌초된 화물선 갑판',
  '폐허가 된 지하철 승강장', '독가스가 퍼지는 화학 공장', '회랑이 미로처럼 얽힌 고성 내부', '눈사태 위험이 도사린 설산 능선', '버려진 군 비행장 격납고',
  '밀림 한가운데 적 기지 외곽', '하수도로 이어진 도시 지하 통로', '폭발물이 깔린 다리 진입로', '시한폭탄이 도는 방송국 부조정실', '결계가 쳐진 봉인된 던전 최하층',
  '난기류에 흔들리는 비행선 위', '교전이 한창인 항구 부두', '진흙탕으로 변한 우기의 정글', '폐쇄된 연구소의 격리 구역', '고지를 두고 다투는 능선 참호선',
  '암초 사이 좌초된 등대 섬', '폭동이 번진 교도소 운동장', '눈 덮인 국경 철책 너머', '몬스터가 들끓는 균열 너머 이세계', '봉쇄선이 좁혀오는 구시가지 골목',
  '천장이 무너지는 고대 유적 신전', '강풍이 부는 송전탑 정상', '안개 자욱한 늪지 통나무길', '폭격으로 갈라진 시가지 광장', '결전이 예고된 황혼의 평원',
]
const FORCE_POOL = [
  '탄약이 한 탄창 남은 고립된 분대', '내공이 바닥난 검객', '쿨타임이 도는 저등급 헌터', '수적으로 열 배 열세인 후위대', '부상으로 한 팔을 못 쓰는 주인공',
  '회귀해 미래를 아는 신참 병사', '점혈당해 반신을 못 움직이는 고수', '연료가 떨어진 기갑 1개 소대', '힐러를 잃은 레이드 파티', '위장 잠입한 적진의 첩보원',
  '시그니처 무기를 빼앗긴 영웅', '주화입마 직전까지 몰린 무인', '제압 사격에 머리를 못 드는 돌격조', '암호가 해독당한 지휘부', '디버프에 중독된 딜러',
  '항복을 거부한 농성 수비대', '명령을 어기고 진격한 소대장', '마지막 수류탄 한 발을 쥔 공병', '봉인된 절기를 막 푼 검수', '관측수와 무전이 끊긴 저격수',
  '보급이 사흘째 끊긴 척후조', '독에 중독돼 시야가 흐려진 자객', '마나가 고갈된 채 싸우는 마법사', '동상으로 손가락이 굳은 산악 정찰병', '방패가 부서진 최전선 탱커',
  '각성한 지 하루밖에 안 된 신입 헌터', '내상을 숨기고 출진한 문파 장로', '연막 속에서 동료를 놓친 돌입조', '레이드 도중 부활석을 다 쓴 파티장', '퇴로가 막힌 채 고립된 정예 소대',
  '기연으로 막 힘을 얻은 무명 무사', '탈진해 의식이 흐려지는 구조대원', '아군에게 배신당한 별동대', '장비 점검을 못 하고 출동한 신병', '최후의 비기 하나만 남은 노검객',
  '통신이 두절된 채 명령을 기다리는 초소병', '쿨타임 없는 즉사기를 가진 암살자', '고유능력이 봉인당한 회귀자', '탄막에 갇혀 전진 못 하는 보병 분대', '체력 한 줄 남은 만신창이 딜러',
  '적진 한복판에 떨어진 강하 부대', '내공을 빌려 버티는 부상당한 사형', '디버프 해제를 못 하는 지원형 헌터', '마지막 화살 한 통을 아끼는 궁수', '진형이 무너진 채 흩어진 창병대',
  '함정에 빠져 분리된 정찰 듀오', '약점을 들킨 최강의 검귀', '회복 스킬을 잃은 단신 돌격병', '폭주 직전인 각성형 광전사', '명예를 걸고 물러설 수 없는 기사단원',
]
const TWIST_POOL = [
  '00:30 뒤 댐이 무너진다는 시한', '안전해 보였던 후방이 사실 함정', '진짜 적은 아군 지휘부였다는 폭로', '1막에 보인 가스 밸브가 유일한 활로', '동료 하나가 남아 막겠다고 자청',
  '적이 같은 환경 무기를 먼저 노린다', '증원이 온다던 무전이 적의 기만', '탄약·내공이 동시에 0에 수렴', '부상 시계가 임무 시한보다 짧다', '회귀로 알던 미래가 어긋나기 시작',
  '인질과 폭탄, 둘 다 구할 수 없는 선택', '아군 오폭 좌표가 자기 위치였다', '봉인을 풀면 주화입마, 안 풀면 패배', '보스가 페이즈 전환으로 약점을 봉인', '저격 한 발만 남았는데 표적이 둘',
  '퇴로의 다리가 등 뒤에서 끊긴다', '시스템 메시지가 거짓 정보를 띄운다', '믿었던 회귀 동료가 다른 회차의 적', '연막이 걷히자 포위가 완성돼 있다', '일출과 함께 적의 증원이 도착한다',
  '구하러 온 인질이 적의 미끼였다', '믿었던 비급의 마지막 장이 찢겨 있다', '아군 저격수가 적에게 매수당했다', '독을 해독할 약이 적의 손에 있다', '탈출로 끝에 더 강한 적이 기다린다',
  '폭탄 해체 코드가 죽은 동료의 머릿속에', '구조 헬기가 적의 대공포 사정권 안', '약점을 노린 일격이 적의 유도였다', '봉쇄 해제 키를 든 자가 배신자', '회복 포션이 사실 디버프 함정',
  '적장이 인질의 가족이라는 사실', '시한 안에 둘 중 하나만 구할 수 있다', '보스가 죽으면 던전 전체가 붕괴한다', '믿던 시스템이 적의 통제 아래 있었다', '아군 증원이 적으로 위장한 부대',
  '단 하나뿐인 활로가 지뢰밭을 지난다', '적의 본대가 이미 후방을 점령했다', '내공을 다 쓰면 평생 무공을 잃는다', '구원 신호가 적에게 위치를 알린다', '동료를 구하면 임무가 실패한다',
  '적이 아군의 작전을 통째로 알고 있다', '최강의 비기가 단 한 번뿐인 양날검', '인질이 사실 폭탄의 기폭 장치', '퇴각 명령이 적의 위조 무전이었다', '승리의 순간 더 큰 위협이 깨어난다',
  '믿은 지도가 적이 흘린 가짜였다', '동료의 각성이 통제를 벗어나 폭주', '봉인된 문 너머에 아군 포로가 있다', '적의 약점이 곧 아군의 약점이다', '마지막 한 발이 불발일 확률 절반',
]
// 목표·임무: 명사구(임무 목표). 다른 슬롯을 전제하지 않는 독립 항목.
const MISSION_POOL = [
  '핵심 인질 구출', '폭파 시한 전 기폭 장치 해체', '봉쇄선 돌파와 탈출', '적 지휘관 제거', '보급선 사수',
  '기밀 정보의 회수', '레이드 보스 토벌', '봉인된 던전 코어 파괴', '아군 부상자 후송', '교두보 확보',
  '적 통신망 마비', '핵심 거점 점령', '증원 도착까지 시간 끌기', '실종된 정찰조 수색', '적 보급 창고 파괴',
  '협상 타결까지 현장 통제', '봉인 결계의 재가동', '게이트 폐쇄', '민간인 대피로 개척', '적 저격 진지 무력화',
  '문파 비급의 탈환', '포로 전원의 석방', '적 함대의 항로 차단', '독가스 확산 저지', '무너지는 다리 위 마지막 후퇴',
  '적장과의 비무 승리', '폭주하는 동료의 진정', '시스템 오류의 복구', '적의 회귀 정보 차단', '최종 병기 가동 저지',
  '고지 탈환', '봉쇄된 통로의 개방', '암호 해독 장치 회수', '적 기갑 부대 격퇴', '왕성 옥좌실 진입',
  '추락 직전 수송기 착륙', '오염원의 봉인', '핵심 증인 호위', '결전장으로의 진로 개척', '최후의 방어선 유지',
]
// 적·위협: 명사구(적/위협의 정체). 독립 항목.
const ENEMY_POOL = [
  '수적으로 압도하는 정예 중대', '봉인을 깬 마교의 고수', '패턴이 진화하는 레이드 보스', '얼굴 없는 정예 저격수', '지치지 않는 언데드 군세',
  '회귀 정보를 가진 미래의 적', '아군으로 위장한 첩보 부대', '하늘을 뒤덮은 무인 폭격기', '균열에서 쏟아진 이종족 무리', '독과 함정을 쓰는 사파 자객단',
  '약점을 모르는 강철 골렘', '심리전에 능한 적 지휘관', '주화입마로 폭주한 옛 사형', '시스템을 장악한 미지의 존재', '연막 속 침묵의 암살자',
  '포위망을 좁히는 기갑 종대', '불사에 가까운 광전사 무리', '결계를 부수는 공성 거인', '아군 무전을 도청하는 정보 부대', '봉인 해제를 노리는 마인',
  '인질을 방패로 쓰는 테러 조직', '시한폭탄을 든 자폭 돌격병', '환각을 거는 마술사 군단', '쇠뇌로 무장한 고지의 수비대', '디버프를 퍼붓는 흑마법 사단',
  '약점이 봉인된 최종 보스', '바다에서 상륙하는 적 함대', '땅속에서 솟는 매복 부대', '하수도를 장악한 변종 무리', '협곡을 막아선 거대 수문장',
  '한 번도 진 적 없는 검성', '전선을 갈라놓는 포병 화망', '아군 진형을 흩는 기병 돌격대', '독무를 퍼뜨리는 사교 집단', '회복을 무력화하는 저주술사',
]
// 분위기·기조: 명사구(톤). 독립 항목.
const TONE_POOL = [
  '비장하고 처절한', '통쾌하고 시원한', '음울하고 절망적인', '냉혹하고 건조한', '긴박하고 숨막히는',
  '비정하고 잔혹한', '장엄하고 웅장한', '쓸쓸하고 허무한', '광기 어린 폭주의', '침착하고 계산적인',
  '비장미가 흐르는 최후의', '환멸과 부조리의', '영웅적이고 카타르시스 넘치는', '서늘하고 고요한', '처참하고 아비규환의',
  '복수심에 불타는', '담담하지만 묵직한', '아슬아슬하게 위태로운', '경건하고 비장한', '혼돈과 아수라장의',
  '냉소적이고 씁쓸한', '결연하고 강인한', '애절하고 비통한', '날카롭고 팽팽한', '광활하고 압도적인',
  '음산하고 불길한', '뜨겁고 격정적인', '잔잔하다 폭발하는', '비극적이고 숙연한', '집요하고 끈질긴',
]
const SLOTS = [
  { key: 'place', label: '장소·전장', icon: '🗺️', pool: PLACE_POOL },
  { key: 'force', label: '아군 상황', icon: '🪖', pool: FORCE_POOL },
  { key: 'twist', label: '합병증·반전', icon: '🌀', pool: TWIST_POOL },
  { key: 'mission', label: '목표·임무', icon: '🎯', pool: MISSION_POOL },
  { key: 'enemy', label: '적·위협', icon: '☠️', pool: ENEMY_POOL },
  { key: 'tone', label: '분위기·기조', icon: '🎭', pool: TONE_POOL },
] as const
type SlotKey = typeof SLOTS[number]['key']

export default function ActionKnowledge({ payload }: { payload?: Record<string, unknown> }) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 즐겨찾기: "catKey::name" → true
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) {
        const obj = JSON.parse(raw)
        if (obj && typeof obj === 'object') return obj as Record<string, boolean>
      }
    } catch { /* ignore */ }
    return {}
  })
  // 펼침 상태: "catKey::name" → true
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<Flat | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 소재 조합기 상태(3슬롯 + 슬롯별 잠금)
  const [combo, setCombo] = useState<Record<SlotKey, string>>(() => ({
    place: PLACE_POOL[Math.floor(Math.random() * PLACE_POOL.length)],
    force: FORCE_POOL[Math.floor(Math.random() * FORCE_POOL.length)],
    twist: TWIST_POOL[Math.floor(Math.random() * TWIST_POOL.length)],
    mission: MISSION_POOL[Math.floor(Math.random() * MISSION_POOL.length)],
    enemy: ENEMY_POOL[Math.floor(Math.random() * ENEMY_POOL.length)],
    tone: TONE_POOL[Math.floor(Math.random() * TONE_POOL.length)],
  }))
  const [locks, setLocks] = useState<Record<SlotKey, boolean>>({ place: false, force: false, twist: false, mission: false, enemy: false, tone: false })

  const copyTimer = useRef<number | undefined>(undefined)
  const toastTimer = useRef<number | undefined>(undefined)

  // payload.genre 표시용(연계 안내)
  const genreHint = typeof payload?.genre === 'string' ? (payload.genre as string) : meta.genre

  // 영속 저장
  useEffect(() => {
    try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ }
  }, [cat])
  useEffect(() => {
    try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ }
  }, [favs])

  // 언마운트 정리: 보류된 타이머 제거
  useEffect(() => {
    return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    }
  }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  // 조합기 조합수 = 슬롯 풀 곱(잠금 무시). 표기용.
  const comboCount = useMemo(() => SLOTS.reduce((n, s) => n * s.pool.length, 1), [])
  const favKey = (catKey: string, name: string) => `${catKey}::${name}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[favKey(c.key, item.name)])
    if (q) {
      base = base.filter(({ item }) =>
        item.name.toLowerCase().includes(q) ||
        item.concept.toLowerCase().includes(q) ||
        item.use.toLowerCase().includes(q) ||
        item.caution.toLowerCase().includes(q) ||
        (item.tags || []).some((t) => t.toLowerCase().includes(q)))
    }
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    const pool = cat === ALL_KEY
      ? flatAll()
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

  // 소재 조합기: 잠기지 않은 슬롯만 새로 굴린다.
  const rollCombo = useCallback(() => {
    setCombo((prev) => {
      const next = { ...prev }
      for (const s of SLOTS) {
        if (locks[s.key]) continue
        let pick = s.pool[Math.floor(Math.random() * s.pool.length)]
        if (s.pool.length > 1 && pick === prev[s.key]) pick = s.pool[Math.floor(Math.random() * s.pool.length)]
        next[s.key] = pick
      }
      return next
    })
  }, [locks])

  const toggleLock = (k: SlotKey) => setLocks((p) => ({ ...p, [k]: !p[k] }))

  const toggleFav = (catKey: string, name: string) => {
    const k = favKey(catKey, name)
    setFavs((prev) => {
      const next = { ...prev }
      if (next[k]) delete next[k]
      else next[k] = true
      return next
    })
  }
  const toggleOpen = (catKey: string, name: string) => {
    const k = favKey(catKey, name)
    setOpen((prev) => ({ ...prev, [k]: !prev[k] }))
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2400)
  }

  const plainText = (s: Flat) =>
    `${s.cat.icon} ${s.item.name} (${s.cat.label})\n` +
    `[개념] ${s.item.concept}\n[집필 활용] ${s.item.use}\n[주의·경고] ${s.item.caution}`

  const comboText = () =>
    `🗺️ 장소·전장: ${combo.place}\n🪖 아군 상황: ${combo.force}\n🎯 목표·임무: ${combo.mission}\n☠️ 적·위협: ${combo.enemy}\n🌀 합병증·반전: ${combo.twist}\n🎭 분위기·기조: ${combo.tone}`

  // 사전 항목을 프로젝트 자료 〈설정자료〉 폴더에 메모로 추가.
  const addEntryToProject = (s: Flat) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(s.cat.icon + ' ' + s.item.name)}</b> <i>(${escapeHtml(s.cat.label)} · ${escapeHtml(meta.genre)})</i></p>`,
      `<p><b>개념</b> ${escapeHtml(s.item.concept)}</p>`,
      `<p><b>집필 활용</b> ${escapeHtml(s.item.use)}</p>`,
      `<p><b>주의·경고</b> ${escapeHtml(s.item.caution)}</p>`,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '설정자료',
      title: `${s.item.name} (${s.cat.label})`,
      bodyHtml,
      meta: { 장르: meta.genre, 분류: s.cat.label },
    })
    if (id) flash(`프로젝트 자료 〈설정자료〉에 ‘${s.item.name}’ 항목을 추가했습니다.`)
  }

  // 소재 조합 결과를 프로젝트 자료 〈소재〉 폴더에 장면 시드로 추가.
  const addComboToProject = () => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>⚔️ 액션 장면 시드</b> <i>(${escapeHtml(meta.genre)})</i></p>`,
      `<p><b>🗺️ 장소·전장</b> ${escapeHtml(combo.place)}</p>`,
      `<p><b>🪖 아군 상황</b> ${escapeHtml(combo.force)}</p>`,
      `<p><b>🎯 목표·임무</b> ${escapeHtml(combo.mission)}</p>`,
      `<p><b>☠️ 적·위협</b> ${escapeHtml(combo.enemy)}</p>`,
      `<p><b>🌀 합병증·반전</b> ${escapeHtml(combo.twist)}</p>`,
      `<p><b>🎭 분위기·기조</b> ${escapeHtml(combo.tone)}</p>`,
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '소재',
      title: `액션 시드 — ${combo.place}`,
      bodyHtml, meta: { 장르: meta.genre, 분류: '액션 장면 시드' },
    })
    if (id) flash('프로젝트 자료 〈소재〉에 액션 장면 시드를 추가했습니다.')
  }

  // 소재 조합 결과를 공유 라이브러리(글감)에 저장.
  const saveComboToLibrary = () => {
    addToLibrary('snippets', {
      text: comboText(),
      source: '액션·전쟁 지식 사전 · 소재 조합',
      tags: ['액션', '전쟁', '장면시드', meta.genre],
    })
    flash('스니펫 라이브러리에 액션 장면 시드를 저장했습니다.')
  }

  // 관련 도구(연계) — 등록되어 있으면 표시
  const relatedIds = (TOOL_RELATIONS[meta.id] || []) as string[]

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const label: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', marginRight: 5 }

  const renderDetail = (s: Flat) => (
    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12.5, lineHeight: 1.55 }}>
      <div><span style={label}>개념</span>{emojify(s.item.concept)}</div>
      <div><span style={label}>집필 활용</span>{emojify(s.item.use)}</div>
      <div><span style={{ ...label, color: 'var(--danger, #d9534f)' }}>주의·경고</span>{emojify(s.item.caution)}</div>
      {s.item.tags && s.item.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
          {s.item.tags.map((t) => (
            <span key={t} style={{ fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>#{t}</span>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div style={wrap}>
      <div style={hint}>
        <Emoji e="⚔️" /> <b>{genreHint}</b>의 세트피스·전술·화기·무협 초식·헌터·감각어휘·클리셰 경고 <b>{total}개</b>를 개념·집필 활용·주의로 정리했습니다. 펼쳐 보고, 검색·무작위로 영감을 얻고, 아래 <b>소재 조합기</b>로 즉석 장면 시드를 굴려 보세요.
      </div>

      {/* 소재 조합기(3슬롯 · 잠금/재생성 · 조합수) */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent)' }}><Emoji e="🎲" /> 액션 장면 시드 조합기</span>
          <span style={{ ...hint, marginLeft: 'auto' }}>조합수 {comboCount.toLocaleString('ko-KR')}가지</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {SLOTS.map((s) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0, width: 78 }}><Emoji e={s.icon} /> {s.label}</span>
              <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45 }}>{emojify(combo[s.key])}</span>
              <button
                className="minibtn"
                onClick={() => toggleLock(s.key)}
                aria-pressed={locks[s.key]}
                title={locks[s.key] ? '잠금 해제(재생성 대상)' : '잠금(재생성에서 제외)'}
                style={{ flexShrink: 0, borderColor: locks[s.key] ? 'var(--accent)' : 'var(--border)' }}
              >
                {locks[s.key] ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={rollCombo}><Emoji e="🎲" /> 굴리기(잠금 제외)</button>
          <button className="minibtn" onClick={() => copy(comboText(), 'combo')}>
            {copiedKey === 'combo' ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}
          </button>
          <button className="linkbtn" onClick={saveComboToLibrary}><Emoji e="📥" /> 글감 저장</button>
          <button
            className="linkbtn"
            onClick={addComboToProject}
            disabled={!hasProjectBridge()}
            title={hasProjectBridge() ? '이 장면 시드를 프로젝트 자료 〈소재〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}
          >
            <Emoji e="📄" /> 프로젝트에 추가
          </button>
        </div>
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="소재·전술·무기·어휘로 검색 (예: 시계 장치, 측면 우회, 재장전, 초식, 각성)"
        style={{
          padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none',
        }}
      />

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button
          className="minibtn"
          onClick={() => setCat(ALL_KEY)}
          aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}
        >
          <Emoji e="✨" /> 전체
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button
              key={c.key}
              className="minibtn"
              onClick={() => setCat(c.key)}
              aria-pressed={on}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}
            >
              <Emoji e={c.icon} /> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 소재</button>
        <button
          className="minibtn"
          onClick={() => setOnlyFav((v) => !v)}
          aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}
        >
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 무작위 결과 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{emojify(random.item.name)}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          {renderDetail(random)}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(plainText(random), 'rand')}>
              {copiedKey === 'rand' ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}
            </button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>
              {favs[favKey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
            <button className="minibtn" onClick={rollRandom}><Emoji e="🎲" /> 다시</button>
          </div>
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button
              className="linkbtn"
              onClick={() => addEntryToProject(random)}
              disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '현재 소재를 프로젝트 자료 〈설정자료〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}
            >
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            {relatedIds.map((rid) => (
              <button key={rid} className="linkbtn" onClick={() => openToolLinked(rid, { genre: meta.genre })}>
                <Emoji e="🔗" /> {rid}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 추가 성공 토스트 */}
      {toast && (
        <div style={{
          background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8,
          padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)',
        }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록(펼침형) */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav
              ? '☆ 아직 즐겨찾기한 소재가 없습니다. 항목의 별을 눌러 모아 보세요.'
              : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const fk = favKey(c.key, item.name)
            const isFav = !!favs[fk]
            const isOpen = !!open[fk]
            const copyId = 'item:' + fk
            return (
              <div key={fk} style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <button
                    className="minibtn"
                    onClick={() => toggleOpen(c.key, item.name)}
                    title={isOpen ? '접기' : '펼치기'}
                    style={{ flexShrink: 0, borderColor: 'var(--border)' }}
                  >
                    {isOpen ? '▾' : '▸'}
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /> {c.label}</span>
                  <span
                    style={{ fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
                    onClick={() => toggleOpen(c.key, item.name)}
                  >{emojify(item.name)}</span>
                  <button
                    className="minibtn"
                    title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                    onClick={() => toggleFav(c.key, item.name)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}
                  >
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                {!isOpen && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {emojify(item.concept)}
                  </div>
                )}
                {isOpen && renderDetail({ cat: c, item })}
                {isOpen && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <button className="minibtn" onClick={() => copy(plainText({ cat: c, item }), copyId)}>
                      {copiedKey === copyId ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}
                    </button>
                    <button className="minibtn" onClick={() => setRandom({ cat: c, item })}><Emoji e="🔎" /> 크게 보기</button>
                    <button
                      className="linkbtn"
                      onClick={() => addEntryToProject({ cat: c, item })}
                      disabled={!hasProjectBridge()}
                      title={hasProjectBridge() ? '이 소재를 프로젝트 자료 〈설정자료〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}
                    >
                      <Emoji e="📄" /> 프로젝트에 추가
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>액션은 ‘얼마나 센가’보다 ‘무엇을 잃는가·어디서 싸우는가’에서 긴장이 태어납니다. 주의·경고 칸을 클리셰 점검표로 삼아 보세요.</div>
    </div>
  )
}
