// 액션 시퀀스 시그니처 생성기(대형 조합·1조 이상) — 액션·전쟁 장르의 심장인 '하나의 액션 세트피스'를 통째로 빚어내는 생성기.
//   8개 슬롯(무대·공간 지리 · 무기/전술 · 적 유형/규모 · 장애물·변수 · 시계장치(제한) · 반전 · 대가/부상 · 시그니처 무브) ×
//   톤 프리셋 5종(반전·환멸 / 영웅·카타르시스 / 전략·정치 / 무협·초식 / 헌터·각성) → 잠금(🔒)/부분 재생성(🎲) + 총 조합수 표시(1조 이상).
//   액션·전쟁 도시에(공간 지리·이해관계·물리적 대가·세트피스·시계장치·체호프의 환경·시그니처 무브·반전 클라이맥스)에 근거.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(잠금/마지막 결과)만 사용. 언마운트 정리.
// 연계(linkbus): 빚어낸 액션 시퀀스를 프로젝트 자료 〈액션 시퀀스〉 폴더에 메모로 추가 · 스니펫 라이브러리 저장 · 관련 도구 열기.
import { useState, useEffect, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'action-signature', name: '액션 시퀀스 시그니처 생성기', icon: '💥', group: '생성기', genre: '액션·전쟁', intro: '무대·무기/전술·적·장애물·시계장치·반전·대가/부상·시그니처 무브까지 액션 세트피스 한 벌을 통째로 빚어냅니다', w: 600, h: 720 }

const LS = 'sry:tool:action-signature'

// ---------- 슬롯 풀(로컬·액션/전쟁 특화) ----------
// 각 슬롯은 충분히 다양하게(도시에 2항 '공간 지리/이해관계/대가' · 3항 '서사 장치' · 4항 '페이싱' · 6항 '용어/클리셰' 근거).
// 조합수 = 모든 슬롯 풀 길이의 곱 × 톤 수 → 1조(10^12) 이상 보장.
interface Slot { key: string; label: string; icon: string; hint: string; pool: string[] }

const SLOTS: Slot[] = [
  {
    key: 'stage', label: '무대·공간 지리', icon: '🗺️', hint: '독자가 전장 지도를 그릴 수 있는 무대(도시에 2항: 명료한 공간 지리)',
    pool: [
      '비좁은 고가도로 — 양옆은 난간, 출구는 양 끝 두 곳뿐, 차들이 엄폐물이 된다',
      '무너지는 다리 위 — 발밑 철근이 끊기고 강은 30미터 아래, 시간이 곧 발판',
      '폐쇄된 야간 화물열차 — 객차 사이 연결부가 좁은 외길, 천장은 낮고 흔들린다',
      '눈보라 속 산악 고지 — 시야 10미터, 능선이 사선(射線)을 가르고 추위가 적이다',
      '항구 컨테이너 야적장 — 미로 같은 강철 협곡, 위에서 내려다보는 자가 유리하다',
      '폭우 쏟아지는 옥상 — 미끄러운 바닥, 가장자리 너머는 추락, 헬기 소리가 다가온다',
      '지하 주차장 B3 — 콘크리트 기둥뿐인 평탄지, 엔진음이 위치를 누설한다',
      '불타는 고층 빌딩 계단실 — 연기로 시야 봉쇄, 위로도 아래로도 막힌 외길',
      '국경의 참호선 — 진흙·철조망·조명탄, 머리를 드는 순간이 곧 죽음',
      '폐허가 된 시가지 교차로 — 무너진 벽들이 엄폐물, 저격수가 어느 창문엔가 있다',
      '협곡을 가로지르는 흔들다리 — 한 번에 한 명, 등 뒤도 앞도 적',
      '만조가 차오르는 갯벌 — 발이 빠지고 물이 무릎까지, 도주로가 사라지고 있다',
      '심야의 24시 주유소 — 사방이 인화물, 한 발의 불꽃이 모두를 태운다',
      '얼어붙은 호수 위 — 발밑 얼음이 갈라지는 소리, 무게가 곧 위협',
      '좁은 골목과 옥상을 잇는 미로 — 추격엔 지리를 아는 자가 이긴다',
      '카지노 환풍 덕트 속 — 기어야 하는 외길, 아래로는 적의 머리 위',
      '사막 한가운데 고립된 전초기지 — 사방이 개활지, 엄폐물은 모래자루뿐',
      '여객기 기내 통로 — 한 줄 외길, 좌석이 방패, 기압과 고도가 변수',
      '폐광 갱도 — 어둠과 무너지는 갱목, 헤드램프 불빛만이 사선을 만든다',
      '강을 거슬러 오르는 상륙정 위 — 흔들리는 발판, 강변 양쪽에서 십자포화',
      '문 닫힌 백화점 에스컬레이터 홀 — 층층이 시야가 트인 수직 전장',
      '안개 자욱한 새벽 들판 — 30미터 앞이 보이지 않아 청각이 곧 눈',
      '회전하는 대관람차 곤돌라 — 칸칸이 분리된 밀실, 발밑은 허공',
      '무너진 성벽 위 공성전 — 사다리가 오르고 화살이 쏟아지는 농성의 최전선',
      '수술실처럼 환한 데이터센터 — 서버 랙이 미로를 이루고 소음이 발소리를 지운다',
      '심야의 도살장/냉동창고 — 갈고리와 고깃덩이 사이, 입김이 위치를 누설한다',
      '좌초된 화물선 기관실 — 기울어진 바닥, 새어 드는 바닷물과 증기관',
      '지하철 승강장과 선로 — 다가오는 전동차의 헤드라이트가 곧 시계장치',
      '눈 덮인 산장 한 채 — 사방이 막힌 밀폐공간(다이하드형), 출구는 단 하나',
      '고가 수조가 늘어선 수족관 — 푸른 빛과 유리벽, 깨지면 물이 모두를 삼킨다',
    ],
  },
  {
    key: 'weapon', label: '무기·전술', icon: '⚔️', hint: '거리·자원의 규칙(도시에 6항: 화기/전술/백병 용어)',
    pool: [
      '탄창 한 개뿐인 권총 — 매 발이 회계장부, 마지막 한 발을 누구에게 쓸지가 문제',
      '근접 격투 — 맨손과 주변 사물, 반동도 탄약도 없지만 한 대 맞을 때마다 무게가 쌓인다',
      '저격총 한 자루 — 호흡과 바람을 읽는 원거리, 들키는 순간 위치가 곧 죽음',
      '쌍권총 건푸(존 윅식) — 재장전이 곧 춤, 거리·각도·동선이 안무가 된다',
      '검 한 자루 — 베기보다 찌름, 사이를 파고드는 한 합의 승부',
      '연막·섬광탄 같은 보조 장비 — 시야를 지우고 빈틈을 만든 뒤 파고든다',
      '제압 사격과 엄호 — 한 명이 쏘는 동안 한 명이 전진하는 2인 조의 호흡',
      '백병전용 단검과 와이어 — 소리 없이, 한 사람씩, 어둠 속에서',
      '경기관총으로 통로 봉쇄 — 화력으로 길을 막되 탄띠가 줄어드는 카운트다운',
      '폭약과 기폭장치 — 설치할 시간 vs 적이 도달할 시간의 경주',
      '활과 화살 — 소리 없는 한 발, 회수해야 하는 유한한 화살촉',
      '주변 환경을 무기로 — 가스 밸브·샹들리에·전선·차량(체호프의 환경 회수)',
      '내공을 실은 검기(劍氣) — 한 호흡에 끌어올려 격공으로 베는 무협식 발현',
      '각성 스킬과 쿨타임 — 강력한 한 방, 그러나 다시 쓰려면 시간이 필요한 헌터식 운용',
      '소총 점사와 수류탄 — 거점을 두고 벌이는 정석 보병 교전',
      '도검 없이 주짓수식 관절기 — 제압하되 죽이지 않는, 의도가 담긴 무력',
      '화염방사기 — 압도적이나 연료가 줄고 자신도 태울 수 있는 양날',
      '무전과 기만 — 거짓 명령·위장으로 적을 움직이는 머리싸움(병참·정보 비대칭)',
      '한 자루 도(刀)의 발도술 — 보이지 않는 빠르기, 단 한 합에 승부를 거는 일섬',
      '드론 정찰 + 유도 — 눈을 하늘에 두고 적의 사각을 지워가는 현대전술',
      '쇠파이프·벽돌 같은 즉석 무기 — 잡히는 대로, 한 번 휘두르면 부서지는 일회성',
      '쌍절곤·삼절곤류 연병기 — 궤도를 읽기 힘든 변칙, 그러나 좁은 곳에선 제 발등',
      '투척용 단검·표창 — 소리 없는 원거리, 그러나 한정된 수와 회수의 문제',
      '석궁/쇠뇌 — 장전이 느린 대신 한 발의 관통력, 재장전 사이가 곧 위기',
      '전기 충격기·테이저 — 비살상 제압, 그러나 거리와 한 번뿐인 카트리지',
      '대물 저격총 — 엄폐물째 꿰뚫는 화력, 그러나 무겁고 반동이 위치를 노출',
      '기관단총 근접 소사 — 좁은 통로를 쓸어버리되 탄을 순식간에 소모',
      '쇠사슬과 도리깨 — 거리를 만들고 휘감는 제압, 그러나 회수에 한 박자가 든다',
      '점혈/혈도 제압술 — 한 손가락으로 움직임을 멈추되, 빗나가면 빈틈을 내준다',
      '버프·디버프 지원형 운용 — 직접 치기보다 아군을 강화하고 적을 약화시키는 헌터식 조율',
    ],
  },
  {
    key: 'enemy', label: '적 유형·규모', icon: '👤', hint: '능력 격차의 사다리(도시에 3항: 수적 열세·격차 사다리)',
    pool: [
      '수적으로 압도하는 잡병 떼 — 하나하나는 약하나 끝없이 밀려드는 알라모식 열세',
      '주인공보다 명백히 강한 한 명의 고수 — 정면으론 못 이기는, 약점을 찾아야 할 벽',
      '훈련된 정예 분대(4~6명) — 서로 엄호하며 전술적으로 좁혀오는 프로들',
      '얼굴 없는 저격수 한 명 — 보이지 않는 곳에서 한 발씩, 위치 파악이 곧 생존',
      '배신한 옛 동료 — 내 패와 약점을 모두 아는, 가장 위험한 적',
      '거대한 중장갑 상대 — 화력으론 못 뚫는, 관절·이음새 같은 빈틈을 노려야 하는 보스',
      '인질을 방패로 삼은 적 — 쏠 수도 없고 다가갈 수도 없게 묶어둔 도덕적 족쇄',
      '광기에 잠식된 마인/각성 폭주체 — 고통도 두려움도 없이 달려드는 비인간적 위협',
      '체계적으로 지휘되는 적 부대 — 측면 우회·각개격파로 그물을 좁히는 지휘관이 배후에',
      '내 정체를 들킨 잠입 상황 — 사방이 적, 무력보다 은신과 기만이 승부처',
      '동수(同數)의 라이벌 팀 — 거울 같은 실력, 결국 머리와 의지로 가르는 호각의 적',
      '몸은 약하나 환경을 장악한 책략가 — 함정·증원·시간을 무기로 쓰는 흑막',
      '한때 스승이었던 자 — 내 모든 초식을 가르친, 시작이자 마지막이 될 상대',
      '미래/과거의 자기 자신 — 약점도 수도 똑같이 아는, 거울 같은 적(회귀물 변종)',
      '무리를 이룬 야수/괴수 — 본능과 후각으로 사냥하는, 협상 불가능한 위협',
      '항복을 모르는 광신 집단 — 죽음을 두려워 않기에 더 무서운 다수',
      '한 명의 암살자 — 단 한 번의 기회를 노리고 평생 단련한, 침묵의 전문가',
      '아군으로 위장한 첩자 — 결정적 순간에 등을 보이는, 신뢰가 곧 함정',
      '나를 흠모하다 적이 된 자 — 사랑이 동기인, 가장 예측 불가능한 위협',
      '얼굴을 가린 복면의 무리 — 누가 누구인지 모를, 정체가 곧 공포인 다수',
      '기계/사이보그 병기 — 통증도 협상도 없는, 약점 회로를 찾아야 할 상대',
      '나를 인질로 잡으려는 생포조 — 죽이지 않으려 하기에 더 끈질긴 추격',
      '전향한 정의의 폭로자 — 명분은 옳으나 칼끝은 나를 향한, 회색의 적',
      '동귀어진을 각오한 적 — 자기 목숨을 버려서라도 나를 끌고 가려는 광기',
      '소년/소녀 병사 — 차마 베기 어려운, 도덕이 무기를 묶는 적',
      '한 부대를 지휘하는 노련한 지휘관 — 정면이 아니라 판 전체로 나를 가두는 머리',
      '봉인이 풀린 옛 괴수 — 규칙도 약점도 알 수 없는, 미지 그 자체의 위협',
      '내 작전을 미리 읽은 적 — 한 수 앞서 함정을 깔아둔, 정보전의 강자',
    ],
  },
  {
    key: 'obstacle', label: '장애물·변수', icon: '🌀', hint: '싸움을 꼬는 합병증(도시에 3항: 거짓 안전지대·부상 시계)',
    pool: [
      '지켜야 할 비전투원이 곁에 있다 — 부상자·아이·동료, 두 손이 묶인 채 싸워야 한다',
      '한쪽 팔/다리를 이미 다쳤다 — 출혈이 시간을 깎는 부상 시계가 돌아간다',
      '탄약/내공/자원이 거의 바닥 — 한 번의 실수가 곧 마지막',
      '시야를 빼앗기는 환경 — 연기·어둠·폭우로 청각과 직감에만 의지',
      '발밑이 무너지거나 미끄럽다 — 균형 자체가 적, 한 걸음이 추락',
      '아군 중 누군가 부상해 옮겨야 한다 — 전진 속도가 절반으로 떨어진다',
      '증원이 시시각각 도착 중 — 지금 안 끝내면 수적 열세가 더 벌어진다',
      '폭발물/인화물이 사방에 — 화력을 쓰는 순간 나도 휩쓸린다',
      '소리를 내면 안 되는 잠입 구간 — 한 번의 총성이 모든 적을 부른다',
      '통신/지원이 끊겼다 — 혼자, 외부의 도움 없이 버텨야 하는 고립',
      '거짓 안전지대의 기습 — 숨 돌린 직후 등 뒤에서 터지는 두 번째 파도',
      '체호프의 환경이 양날 — 쓸 수 있는 장치(가스·전선)가 적에게도 무기가 된다',
      '맞서 싸울지 도망칠지의 분기 — 이기는 것보다 빠져나가는 게 임무일 수 있다',
      '날씨/조류가 변하고 있다 — 만조·일출·폭풍이 판 자체를 바꾼다',
      '적이 내 약점/트라우마를 정확히 찌른다 — 몸보다 마음이 먼저 흔들린다',
      '오인사격의 위험 — 어둠 속에서 아군과 적이 뒤섞여 방아쇠가 도박이 된다',
      '시간제한과 거리의 모순 — 목표 지점까지의 거리가 남은 시간보다 멀다',
      '무기가 망가졌다 — 부러진 검·고장 난 총, 가진 것을 즉석에서 개조해야 한다',
      '독/약물에 당해 감각이 흐려진다 — 몸이 마음대로 움직이지 않는다',
      '폭음으로 청력을 잃었다 — 소리 없는 세상에서 시각과 진동에만 의지',
      '두 곳에서 동시에 위기가 — 한쪽을 구하면 한쪽을 잃는, 분할된 전선',
      '적이 인질의 가면을 쓰고 섞여 있다 — 쏘기 전에 가려내야 하는 한순간',
      '내가 지켜야 할 목표가 스스로 도망친다 — 통제 불능의 비협조',
      '바닥이 함정/지뢰밭 — 한 걸음마다 발밑을 의심해야 한다',
      '한정된 출구를 적이 봉쇄하고 있다 — 정면 돌파 외엔 길이 없다',
      '아군의 명령과 현장의 판단이 충돌한다 — 따를지 어길지가 곧 생사',
      '극한의 추위/더위가 체력을 갉는다 — 적보다 환경이 먼저 무너뜨린다',
      '카메라/목격자가 있다 — 함부로 죽일 수 없게 손을 묶는 시선',
    ],
  },
  {
    key: 'clock', label: '시계장치·제한', icon: '⏱️', hint: '긴장의 증폭기(도시에 3항: 시계장치 / 5항: 시계의 정지)',
    pool: [
      '폭탄 타이머 — 숫자가 줄어드는 동안 적을 뚫고 기폭장치까지 가야 한다',
      '증원 도착까지 ○분 — 그 전에 끝내지 못하면 수적 열세가 절망이 된다',
      '인질 처형 시한 — 협상이 결렬되는 순간, 한 사람의 목숨이 카운트다운',
      '만조/일출/해넘이 — 자연의 시계가 도주로를 닫거나 엄폐를 빼앗는다',
      '출혈로 인한 의식 한계 — 쓰러지기 전에 끝내야 하는 자기 몸의 카운트다운',
      '연료/산소/배터리 잔량 — 멈추는 순간 추락·질식·암전이 기다린다',
      '무너지는 구조물 — 천장·다리·갱도가 버틸 수 있는 시간이 곧 제한',
      '독/주화입마의 발현까지 — 몸 안에서 째깍이는, 보이지 않는 시한',
      '아군의 작전 개시 시각 — 그 순간에 맞춰 적의 시선을 끌어야 하는 동기화된 시계',
      '추격자가 거리를 좁히는 시간 — 뒤를 돌아볼 여유가 점점 사라진다',
      '스킬 쿨타임/재장전 시간 — 다시 쓸 수 있게 되기까지의 공백이 곧 위기',
      '불길이 번지는 속도 — 출구가 화염에 삼켜지기 전에 빠져나가야 한다',
      '명시적 시한은 없으나, 한 합 한 합 체력이 한계로 — 길어질수록 진다',
      '구원/탈출 헬기의 마지막 편 — 놓치면 다음은 없다는 단 한 번의 창',
      '폭격/포격 예정 시각 — 그 전에 빠져나가지 못하면 아군 화력에 휩쓸린다',
      '인질이 들고 있는 사구 장치 — 손을 놓는 순간 모든 게 끝난다',
      '봉인/결계가 풀리기까지 — 그 안에 적을 제압해야 하는 마법적 카운트다운',
      '열차/배/비행기의 도착 시각 — 그 전에 끝내고 빠져나가야 하는 이동 무대',
      '날이 밝기 전까지 — 어둠이라는 엄폐가 사라지면 잠입은 불가능해진다',
      '구조물 붕괴까지의 잔여 진동 — 흔들림이 커질수록 무대 자체가 사라진다',
      '적 증원 차량의 헤드라이트가 다가온다 — 빛이 닿기 전에 흔적을 지워야 한다',
      '전력/방어막 재가동까지 — 시스템이 복구되면 침투 경로가 모두 막힌다',
    ],
  },
  {
    key: 'twist', label: '반전·전환점', icon: '🔀', hint: '국면을 뒤집는 한 수(도시에 5항: 약점 회수·최저점 직후 역전)',
    pool: [
      '믿었던 아군이 적의 첩자였음이 한복판에서 드러난다',
      '주인공이 무장 해제·부상으로 최저점에 몰린 직후, 잃을 것이 명확해지며 반격이 시작된다',
      '1막에 무심코 보였던 환경 요소(밸브·전선·구조물)가 결정타로 회수된다',
      '적의 압도적 강함에 숨은 약점/패턴이 마지막 순간에 간파된다',
      '진짜 적은 눈앞의 상대가 아니라 배후의 아군 지휘부/체제였다는 폭로',
      '동료가 남아 후위를 막고, 주인공만 통로를 빠져나간다(희생적 후위)',
      '시계장치가 마지막 1초, 혹은 마지막 한 발 직전에 멎거나 해제된다',
      '적을 죽이려던 손이 멈추고, 죽이지 않는 선택이 판을 뒤집는다',
      '동료가 건넨 작은 물건/한마디가 결정적 순간에 의미를 발한다(무게의 물건)',
      '주인공이 일부러 진 척하며 적을 함정 한가운데로 끌어들였음이 드러난다',
      '구하러 온 인질/대상이 사실 자발적 공범이었다',
      '봉인했던 시그니처 무브/금기의 힘을 대가를 각오하고 마침내 해방한다',
      '적의 무전을 가로채 거짓 명령을 흘려 적 부대가 자기들끼리 어긋난다',
      '죽은 줄 알았던 인물이 다른 위치에서 한 발을 쏘아 전세를 가른다',
      '이기는 길이 곧 가장 사랑하는 것을 잃는 길임이 드러나는 잔혹한 분기',
      '마지막 한 발/한 줌의 내공/부서진 무기로, 자원 고갈 직전에 역전한다',
      '적이 인간적인 사연을 드러내며, 싸움의 의미 자체가 흔들린다',
      '주인공의 약점이라 여겨진 것(연민·망설임)이 오히려 승부수가 된다',
      '적의 무기/능력이 사실 주인공의 것을 복제한 것이었음이 드러난다',
      '비전투원이라 여긴 인물이 결정적 한 수를 쥐고 있었다',
      '무대 자체가 함정이었다 — 적이 이곳으로 유인한 것이 진짜 작전',
      '주인공이 쏘지 않은 한 발이, 더 큰 것을 살리는 선택이 된다',
      '적의 시계장치(폭탄·증원)를 거꾸로 적에게 돌려놓는다',
      '쓰러진 줄 알았던 적이 마지막 발악으로 판을 다시 뒤집는다',
      '주인공이 적의 정체(가족·옛 전우)를 알아보며 손이 멎는다',
      '아군의 작전이 처음부터 주인공을 미끼로 쓰는 것이었음이 드러난다',
      '환경의 변화(붕괴·침수·정전)가 양쪽 모두의 계획을 백지로 만든다',
      '주인공이 죽음을 각오한 순간, 적이 먼저 물러서며 의외의 결말로',
    ],
  },
  {
    key: 'cost', label: '대가·부상', icon: '🩸', hint: '액션에 무게를 주는 값(도시에 2항: 물리적 대가 / 5항: 대가 있는 승리)',
    pool: [
      '이기되 동료 한 사람을 그 자리에서 잃는다 — 피로스의 승리',
      '갈비뼈가 부러지고 한쪽 귀가 먹먹해진 채로, 다음 싸움을 안고 나아간다',
      '약속을 지키지 못한다 — 누군가를 구하느라 다른 누군가를 놓친다',
      '시그니처 무기가 부러지거나 영영 잃는다 — 정체성의 일부가 깎인다',
      '심마/트라우마가 깊어진다 — 이긴 뒤에도 그날의 소리가 귀에 남는다',
      '임무엔 성공했으나 도덕적 선을 하나 넘는다 — 돌이킬 수 없는 자기 일부',
      '관통상으로 며칠은 움직이지 못한다 — 다음 위기를 부상한 채 맞아야 한다',
      '적을 살려보냈고, 그 자비가 훗날의 비극을 심는다',
      '쓴 금기/각성의 대가로 수명/내공/스킬 일부를 영구히 잃는다',
      '아군의 신뢰를 잃는다 — 이겼지만 혼자가 된다',
      '고향/거점/은신처가 불탄다 — 돌아갈 곳을 대가로 치른다',
      '손에 쥐었던 목표물/증거가 싸움 중에 파괴된다 — 이기고도 빈손',
      '주인공은 살았으나, 그를 살린 누군가의 이름을 평생 호명하게 된다',
      '한쪽 시력/청력/손의 감각을 잃는다 — 몸에 새겨지는 영구한 흔적',
      '승리의 대가로 더 큰 적의 주의를 끌어, 다음 표적이 자신이 된다',
      '무손상처럼 보였으나, 진짜 상처는 그날 이후 마음에 남는다',
      '함께 싸운 동료가 불구가 되어, 평생 그 빚을 안고 산다',
      '적을 막느라 무고한 누군가가 휘말린다 — 지키려던 것을 스스로 부순다',
      '이긴 대가로 비밀/정체가 세상에 드러나, 평온한 일상이 끝난다',
      '결정적 순간 망설인 자신을 평생 의심하게 된다 — 마음의 흉터',
      '아꼈던 부하/제자를 잃고, 그 빈자리를 메우지 못한 채 다음으로',
      '구한 사람에게 끝내 미움을 산다 — 옳았으나 보답받지 못하는 승리',
      '체력의 한계를 넘어, 며칠 뒤 후유증이 결정적 약점으로 돌아온다',
      '쓴 힘의 부작용으로 한동안 능력을 봉인당한 채 다음 위기를 맞는다',
      '적을 죽인 손의 감각이 떠나지 않아, 다시는 같은 사람이 되지 못한다',
      '승리가 더 큰 전쟁의 방아쇠가 되어, 평화 대신 확전을 부른다',
    ],
  },
  {
    key: 'signature', label: '시그니처 무브·한 줄', icon: '✨', hint: '인물을 압축한 반복 기술/한 문장(도시에 3항: 시그니처 무브)',
    pool: [
      '“숨을 멈추고, 셋을 센다. 그리고 방아쇠.”',
      '“탄창을 비우고 나서야, 진짜 싸움이 시작된다.”',
      '“한 합. 그 한 합으로 끝낸다.”',
      '“가장 약해 보이는 순간이, 내가 가장 위험할 때다.”',
      '“이 검은 사람을 베지 않는다 — 마음을 벤다.”',
      '“달아나는 게 아니다. 더 좋은 자리로 가는 거다.”',
      '“마지막 한 발은, 늘 나를 위해 남겨둔다.”',
      '“너희가 셋이라면, 난 셋을 동시에 상대하지 않는다 — 한 명씩 지운다.”',
      '“부서진 칼이라도, 손에 쥐면 무기가 된다.”',
      '“증원이 오기 전에. 그게 내 시간표다.”',
      '“나는 강하지 않다. 다만 너보다 먼저 약점을 찾을 뿐.”',
      '“이기려고 싸우지 않는다. 살아남으려고 싸운다.”',
      '“총성이 갈라지는 순간, 세상이 느려진다.”',
      '“한 걸음 물러서는 건, 두 걸음 파고들기 위해서다.”',
      '“오늘 또 한 명을 잃었다. 그래서 내일도 싸운다.”',
      '“방아쇠를 당기기 전, 늘 그가 떠난 자리를 한 번 본다.”',
      '“쿨타임은 끝났다 — 다음은 내 차례다.”',
      '“내공이 한 줌 남았다. 충분하다.”',
      '“화약 냄새가 가시기 전에 끝낸다.”',
      '“네가 방아쇠를 당기는 데 1초, 내가 거리를 좁히는 데 0.5초.”',
      '“엄폐물은 영원하지 않다 — 그러니 먼저 움직인다.”',
      '“나는 영웅이 아니다. 그냥 마지막까지 서 있는 사람일 뿐이다.”',
      '“이 한 칼에 십 년의 수련을 건다.”',
      '“출구는 내가 정한다.”',
      '“숨을 죽여라. 다음 한 발이 모든 걸 가른다.”',
      '“지키지 못한 이름만큼, 나는 강해진다.”',
      '“물러설 곳이 없을 때, 나는 가장 강하다.”',
      '“계획은 첫 총성과 함께 사라진다 — 그래서 즉흥이 곧 실력이다.”',
    ],
  },
]

// 조합을 한 번 더 갈래내는 '톤 프리셋'(같은 슬롯 조합도 톤에 따라 결이 달라진다 → 조합수에 포함).
// 도시에 1항: 대표작을 톤 프리셋으로 묶어 사용자가 고르게 하라.
interface Tone { key: string; label: string; desc: string }
const TONES: Tone[] = [
  { key: 'tragic', label: '반전·환멸', desc: '레마르크·헬러 계보 — 영웅담을 의심하고, 이기고도 무엇을 잃는지 묻는 비장·부조리의 결.' },
  { key: 'hero', label: '영웅·카타르시스', desc: '다이하드·존 윅 계보 — 위기-탈출의 펄스와 통쾌한 응징, 점층되는 세트피스의 결.' },
  { key: 'strategy', label: '전략·정치', desc: '은하영웅전설·킬러 엔젤스 계보 — 지휘부와 현장의 시점 교차, 병참·기만·결정의 인간적 비용.' },
  { key: 'wuxia', label: '무협·초식', desc: '베르세르크·화산귀환 계보 — 초식 파훼·내공·비무, 한 합의 미학과 대가 있는 성장.' },
  { key: 'hunter', label: '헌터·각성', desc: '나 혼자만 레벨업 계보 — 각성·스킬·쿨타임·레이드, 사이다 리듬과 무력 인플레의 결.' },
]

const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]
const fmt = (n: number) => {
  // 1조 이상은 한국어 '조/억' 단위로 가독성 있게 표기
  if (n >= 1e12) return (n / 1e12).toFixed(2).replace(/\.?0+$/, '') + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + '억'
  return n.toLocaleString('ko-KR')
}

// 총 조합수 = 모든 슬롯 풀 길이의 곱 × 톤 수. (곱만 계산해 부동소수 영향 최소화)
const COMBOS = SLOTS.reduce((acc, s) => acc * s.pool.length, 1) * TONES.length

// HTML 이스케이프(프로젝트 본문 안전화 — & < > 필수)
const escHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

type Picks = Record<string, string>

export default function ActionSignature({ payload }: { payload?: Record<string, unknown> }) {
  const [picks, setPicks] = useState<Picks>({})
  const [toneKey, setToneKey] = useState<string>(TONES[0].key)
  const [toneLocked, setToneLocked] = useState(false)
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [spinning, setSpinning] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | null>(null)

  // payload.genre / payload.tone 활용 — 다른 도구에서 컨텍스트를 넘겨받으면 톤 기본값을 맞춰 준다.
  useEffect(() => {
    const g = String(payload?.genre ?? '') + ' ' + String(payload?.tone ?? '')
    if (/헌터|각성|레이드|시스템|게임판타지|던전/.test(g)) setToneKey('hunter')
    else if (/무협|무공|초식|내공|강호|검/.test(g)) setToneKey('wuxia')
    else if (/전쟁|전략|군사|밀리터리|지휘|작전|병참/.test(g)) setToneKey('strategy')
    else if (/반전|환멸|비극|반전|반전·환멸|참호/.test(g)) setToneKey('tragic')
    else if (/영웅|카타르시스|히어로|액션/.test(g)) setToneKey('hero')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 마지막 결과/잠금 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS)
      if (raw) {
        const p = JSON.parse(raw) as { picks?: Picks; toneKey?: string; locked?: Record<string, boolean>; toneLocked?: boolean }
        if (p.picks && typeof p.picks === 'object') {
          const valid: Picks = {}
          SLOTS.forEach((s) => { if (typeof p.picks![s.key] === 'string') valid[s.key] = p.picks![s.key] })
          if (Object.keys(valid).length) setPicks(valid)
        }
        if (typeof p.toneKey === 'string' && TONES.some((t) => t.key === p.toneKey)) setToneKey(p.toneKey)
        if (p.locked && typeof p.locked === 'object') setLocked(p.locked)
        if (typeof p.toneLocked === 'boolean') setToneLocked(p.toneLocked)
      }
    } catch { /* ignore */ }
  }, [])

  // 결과/잠금 저장
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify({ picks, toneKey, locked, toneLocked })) } catch { /* ignore */ }
  }, [picks, toneKey, locked, toneLocked])

  // 첫 진입 시 한 번 굴려 빈 상태 방지
  useEffect(() => {
    if (Object.keys(picks).length === 0) {
      const next: Picks = {}
      SLOTS.forEach((s) => { next[s.key] = pick(s.pool) })
      setPicks(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 굴림 애니메이션 자동 해제 + 언마운트 정리
  useEffect(() => {
    if (!spinning) return
    const t = window.setTimeout(() => setSpinning(false), 380)
    return () => window.clearTimeout(t)
  }, [spinning, picks])

  // 언마운트 시 토스트 타이머 정리
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }, [])

  const generate = useCallback(() => {
    setCopied(false); setSaved(false)
    setSpinning(true)
    setPicks((prev) => {
      const next: Picks = { ...prev }
      SLOTS.forEach((s) => {
        if (locked[s.key] && prev[s.key]) return // 잠긴 슬롯 유지
        let v = pick(s.pool)
        if (v === prev[s.key] && s.pool.length > 1) v = pick(s.pool) // 연속 동일 완화
        next[s.key] = v
      })
      return next
    })
    if (!toneLocked) {
      setToneKey((cur) => {
        let t = pick(TONES.map((x) => x.key))
        if (t === cur && TONES.length > 1) t = pick(TONES.map((x) => x.key))
        return t
      })
    }
  }, [locked, toneLocked])

  const rollOne = (key: string) => {
    setCopied(false); setSaved(false)
    setPicks((prev) => {
      const s = SLOTS.find((x) => x.key === key)!
      let v = pick(s.pool)
      if (v === prev[key] && s.pool.length > 1) v = pick(s.pool)
      return { ...prev, [key]: v }
    })
  }

  const toggleLock = (key: string) => setLocked((p) => ({ ...p, [key]: !p[key] }))

  const ready = SLOTS.every((s) => picks[s.key])
  const tone = TONES.find((t) => t.key === toneKey) || TONES[0]

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2200)
  }

  // 텍스트 요약(복사·스니펫용)
  const summaryText = () => {
    if (!ready) return ''
    const lines = SLOTS.map((s) => `${s.icon} ${s.label}: ${picks[s.key]}`)
    return [
      `【액션 시퀀스 시그니처】 (톤: ${tone.label})`,
      ...lines,
      ``,
      `${picks.signature}`,
      `※ ${tone.desc}`,
    ].join('\n')
  }

  const copy = () => {
    if (!ready) return
    navigator.clipboard?.writeText(summaryText()).then(() => {
      setCopied(true); window.setTimeout(() => setCopied(false), 1500)
    }).catch(() => flash('클립보드 복사가 지원되지 않습니다.'))
  }

  // 스니펫 라이브러리 저장(영감 메모로 재사용)
  const saveSnippet = () => {
    if (!ready) return
    addToLibrary('snippets', {
      text: summaryText(),
      source: '액션 시퀀스 시그니처 생성기',
      tags: ['액션·전쟁', '액션 시퀀스', '세트피스', tone.label],
    })
    setSaved(true); window.setTimeout(() => setSaved(false), 1500)
    flash('스니펫 라이브러리에 액션 시퀀스를 저장했습니다.')
  }

  // 프로젝트 자료 〈액션 시퀀스〉 폴더에 메모로 추가 — 시그니처 + 슬롯 분해(장면 설계용)
  const toProject = () => {
    if (!ready) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const rows = SLOTS
      .map((s) => `<p><b>${escHtml(s.icon)} ${escHtml(s.label)}</b> <span style="color:#888;">(${escHtml(s.hint)})</span><br/>${escHtml(picks[s.key])}</p>`)
      .join('')
    const bodyHtml = [
      `<p style="font-size:18px;"><b>💥 액션 세트피스 — ${escHtml(picks.stage.split(' — ')[0])}</b></p>`,
      `<p style="font-size:14px;color:#666;font-style:italic;">${escHtml(picks.signature)}</p>`,
      `<p style="color:#888;">톤 프리셋 — <b>${escHtml(tone.label)}</b> · ${escHtml(tone.desc)}</p>`,
      `<hr/>`,
      rows,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '액션 시퀀스',
      title: `💥 ${picks.stage.split(' — ')[0]} (${tone.label})`,
      bodyHtml,
      synopsis: `적: ${picks.enemy.split(' — ')[0]} · 변수: ${picks.obstacle.split(' — ')[0]} · 시계: ${picks.clock.split(' — ')[0]}`.slice(0, 140),
      meta: {
        톤: tone.label,
        무대: picks.stage.split(' — ')[0],
        '무기·전술': picks.weapon.split(' — ')[0],
        적: picks.enemy.split(' — ')[0],
        장애물: picks.obstacle.split(' — ')[0],
        시계장치: picks.clock.split(' — ')[0],
        반전: picks.twist,
        대가: picks.cost,
      },
    })
    flash(id ? '프로젝트 자료 〈액션 시퀀스〉 폴더에 추가했습니다.' : '프로젝트 추가에 실패했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <div style={hint}>
        이 작품만의 <b>액션 세트피스 한 벌</b>을 <b>무대·무기/전술·적·장애물·시계장치·반전·대가/부상·시그니처 무브</b>까지 통째로 빚어냅니다.
        마음에 드는 슬롯은 🔒로 고정하고 나머지만 다시 굴리세요. 좋은 액션은 화려함보다 <b>명료한 공간·이해관계·대가</b>가 핵심입니다.
      </div>

      {/* 조합수 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, border: '1px solid var(--accent)', borderRadius: 999, padding: '2px 9px' }}>
          <Emoji e="🎲"/> {fmt(COMBOS)}가지 조합
        </span>
        <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>({COMBOS.toLocaleString('ko-KR')})</span>
      </div>

      {/* 톤 프리셋 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>톤 프리셋</span>
        {TONES.map((t) => {
          const on = t.key === toneKey
          return (
            <button key={t.key} className="minibtn" onClick={() => { setToneKey(t.key); setCopied(false); setSaved(false) }}
              aria-pressed={on} title={t.desc}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              {t.label}
            </button>
          )
        })}
        <button className="minibtn" onClick={() => setToneLocked((v) => !v)} title={toneLocked ? '톤 고정 해제' : '톤 고정'}
          style={{ borderColor: toneLocked ? 'var(--accent)' : 'var(--border)' }}>
          {toneLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
        </button>
      </div>

      {/* 시그니처 헤더 카드 */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginBottom: 4 }}><Emoji e="💥"/> 이 작품의 액션 세트피스</div>
        <div style={{
          fontSize: 20, fontWeight: 700, lineHeight: 1.35,
          color: ready ? 'var(--text)' : 'var(--muted)',
          transition: 'opacity .2s', opacity: spinning ? 0.5 : 1,
        }}>
          {ready ? (spinning ? '…세트피스를 빚어내는 중…' : (picks.stage.split(' — ')[0])) : '생성해 보세요.'}
        </div>
        {ready && !spinning && (
          <>
            <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', marginTop: 6, lineHeight: 1.5 }}>
              {picks.signature}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, marginTop: 6 }}>
              <b style={{ color: 'var(--ok)' }}>{tone.label}</b> · {tone.desc}
            </div>
          </>
        )}
      </div>

      {/* 슬롯 분해(잠금/부분 재생성 단위) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SLOTS.map((s) => {
          if (s.key === 'signature') return null // 헤더 카드에서 이미 표시
          const v = picks[s.key]
          const isLocked = !!locked[s.key]
          return (
            <div key={s.key} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '8px 11px',
            }}>
              <div style={{
                fontSize: 19, width: 24, textAlign: 'center', flexShrink: 0,
                transition: 'transform .25s',
                transform: spinning && !isLocked ? 'rotate(14deg) scale(1.15)' : 'none',
              }}><Emoji e={s.icon}/></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                  {s.label} <span style={{ opacity: 0.6 }}>({s.pool.length})</span> · {s.hint}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, color: v ? 'var(--text)' : 'var(--muted)' }}>
                  {v ? (spinning && !isLocked ? '…' : v) : '— 생성해 주세요 —'}
                </div>
              </div>
              <button className="minibtn" onClick={() => rollOne(s.key)} disabled={isLocked} title="이 슬롯만 다시"
                style={{ flexShrink: 0, padding: '0 6px' }}><Emoji e="🎲"/></button>
              <button className="minibtn" onClick={() => toggleLock(s.key)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                style={{ flexShrink: 0, padding: '0 6px', borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
              </button>
            </div>
          )
        })}
      </div>

      {/* 시그니처 한 줄도 개별 재생성/잠금 가능하게 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>시그니처 한 줄만:</span>
        <button className="minibtn" onClick={() => rollOne('signature')} disabled={!!locked.signature} title="시그니처 한 줄만 다시"><Emoji e="🎲"/> 한 줄</button>
        <button className="minibtn" onClick={() => toggleLock('signature')} style={{ borderColor: locked.signature ? 'var(--accent)' : 'var(--border)' }}>{locked.signature ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
      </div>

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={generate}><Emoji e="💥"/> 시퀀스 생성 / 다시 굴리기</button>
        <button className="minibtn" onClick={copy} disabled={!ready}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
        <button className="minibtn" onClick={saveSnippet} disabled={!ready} title="스니펫 라이브러리에 저장">
          {saved ? <>✓ 저장됨</> : <><Emoji e="⭐"/> 스니펫</>}
        </button>
      </div>

      {/* 프로젝트 연계 + 관련 도구 */}
      <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!ready || !hasProjectBridge()}
          title={
            !hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다'
            : !ready ? '먼저 시퀀스를 생성해주세요'
            : '생성한 액션 시퀀스와 슬롯 분해를 프로젝트 자료 〈액션 시퀀스〉 폴더에 추가'
          }
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('scene-forge', { genre: '액션·전쟁', tone: tone.label })} title="장면 단조기로 이 세트피스를 한 씬으로">
          <Emoji e="🎬"/> 장면 단조기
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('chase-scene-gen', { genre: '액션·전쟁' })} title="추격·탈출 생성기로 변주">
          <Emoji e="🏃"/> 추격·탈출 생성기
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('cliffhanger-forge', { genre: '액션·전쟁' })} title="회차 끝 클리프행어로 마무리">
          <Emoji e="🪝"/> 클리프행어 단조기
        </button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>
        설계 점검: <b>시계장치</b>는 마지막 1초/한 발 직전에 멎어야 하고, <b>반전</b>은 1막에 깔린 환경·약점·물건의 회수여야 합니다(갑툭튀 금지).
        무손상 승리의 반복은 긴장을 무너뜨립니다 — <b>대가</b>를 반드시 치르게 하세요.
      </div>
    </div>
  )
}
