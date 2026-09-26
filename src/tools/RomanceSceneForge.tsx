// 로맨스 장면 생성기(RomanceSceneForge) — 로맨스 장르의 전형 장면을, 도시에(dossier)에 근거한
//  요소 슬롯(무대·시각/분위기·두 사람 관계 단계·장면을 묶는 로맨스 장치·끌림/긴장의 결·관계를 흔드는 갈등·
//  판을 뒤집는 전환·설렘을 살리는 감각·전개법(하위유형))으로 조합 생성한다.
//  현대 로맨스 / 로맨스판타지(악역영애·회빙환·정통연애·육아힐링) / 후회물·집착물 등 하위유형을
//  '전개법' 슬롯으로 적용해, 같은 무대라도 밀당·블랙모먼트·그랜드 제스처·슬로우번·사이다 등
//  장르 관습에 맞춰 한 편의 장면 설계로 엮는다(완전 로컬, 외부 API 없음).
//  슬롯별 🔒 잠금 + 🎲 부분 재생성. 가능한 조합 1조(1,000,000,000,000) 이상.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(보관함)만 사용.
// 연계(linkbus): addToProject(folder:'장면')·장면 목록(scene-list)·배경/스니펫 라이브러리·관련 도구 열기.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'romance-sceneforge', name: '로맨스 장면 생성기(1조+ 조합)', icon: '💞', group: '생성기', genre: '로맨스', intro: '무대·관계 단계·로맨스 장치·갈등·전환·감각과 하위유형 전개법을 굴려 로맨스 전형 장면을 1조+ 조합으로 설계하세요', w: 600, h: 700 }

const LS = 'sry:tool:romance-sceneforge'

// ---------------------------------------------------------------------------
// 슬롯 정의 — 각 슬롯은 로맨스 장면의 한 축. faces 는 도시에에 근거한 자작 로컬 풀(장르 특화·구체적).
//  풀을 크게 잡아 9개 슬롯 조합이 1조(10^12)를 가뿐히 넘도록 설계.
//  도시에 핵심 장치 반영: 밀당(push-pull)·블랙모먼트·그랜드 제스처·forced proximity·yearning·
//  almost-kiss·고백 다단계·질투·접촉 고조·오해·회빙환 정보 비대칭·집착/후회·계약→진심.
// ---------------------------------------------------------------------------
interface Slot { key: string; label: string; icon: string; desc: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'stage', label: '무대', icon: '🌃', desc: '두 사람의 감정이 부딪치는 로맨스 무대',
    faces: [
      '빗물에 젖은 채 한 우산 아래 갇힌 골목',
      '단 하나 남은 방, 침대 하나뿐인 산장(one bed!)',
      '눈보라로 발이 묶인 외딴 별장 거실',
      '야근 끝 둘만 남은 사무실, 꺼져 가는 형광등 아래',
      '결혼식 하객석, 신부 대기실 옆 빈 복도',
      '회사 옥상, 도시의 야경이 펼쳐진 난간 앞',
      '비행기 옆자리, 난기류로 흔들리는 기내',
      '엘리베이터가 멈춰 버린 좁은 철제 상자 안',
      '계약 결혼한 부부의 첫날밤, 어색한 침실',
      '황태자 약혼식이 파혼으로 끝난 황실 정원',
      '회귀 직후 눈뜬, 그가 아직 다정했던 그날의 방',
      '책 속 악역 영애로 빙의한 직후의 무도회장',
      '공작저의 차가운 응접실, 정략결혼 첫 대면',
      '재벌가 비밀 별장, 가짜 연인 행세를 시작하는 자리',
      '병실 보호자 침대, 밤새 곁을 지킨 새벽',
      '대학 도서관 같은 책상, 마주 앉은 시험 기간',
      '포장마차 한구석, 비를 피해 들어온 두 사람',
      '폐장 직전 놀이공원, 멈춘 회전목마 앞',
      '바닷가 펜션 테라스, 파도 소리만 남은 밤',
      '연회장 발코니, 음악이 새어 나오는 커튼 뒤',
      '눈 내리는 버스 정류장, 막차를 놓친 자리',
      '꽃집 안쪽 작업대, 마감 후 둘만 남은 시간',
      '촬영장 대기 텐트, 스캔들이 터진 직후',
      '한밤의 편의점, 우연히 마주친 단골 자리',
      '오래된 LP 바, 같은 노래를 신청한 두 사람',
      '연적의 결혼 발표가 흐르는 호텔 로비',
      '눈 덮인 황궁 회랑, 외투를 벗어 덮어 주는 순간',
      '계약서가 놓인 변호사 사무실, 위장 부부의 시작',
      '응급실 복도, 그가 다쳤다는 소식을 들은 자리',
      '귀가길 택시 뒷좌석, 서로 잠든 척하는 어깨',
      '문화재 복원실, 먼지 쌓인 유물을 사이에 둔 작업대',
      '동거 첫날, 짐을 풀다 손이 닿은 좁은 부엌',
      '졸업식 강당, 마지막일지 모를 작별의 자리',
      '폭우로 끊긴 다리 앞, 차 안에 갇힌 두 사람',
      '황제의 침전, 정적뿐인 첫 합방의 밤',
      '연말 파티, 카운트다운 직전의 옥상',
      '재회의 카페, 헤어진 연인이 마주 앉은 창가',
      '학원 옥상 철망 앞, 종례 후 둘만 남은 방과 후',
      '오래된 한옥 마루, 비 새는 처마 아래 나란히 앉아',
      '심야 영화관 맨 뒷줄, 텅 빈 상영관',
    ],
  },
  {
    key: 'time', label: '시각·분위기', icon: '🌙', desc: '설렘을 빚어내는 시각과 공기의 결',
    faces: [
      '첫눈이 소리 없이 내려앉는 늦은 밤',
      '노을이 두 사람의 옆얼굴을 붉게 물들이는 저녁',
      '여름 소나기가 갑자기 쏟아지는 한낮',
      '벚꽃잎이 바람에 흩날리는 봄날 오후',
      '가로등만 켜진 인적 끊긴 자정 무렵',
      '동이 트기 직전, 모두 잠든 새벽의 정적',
      '크리스마스 캐럴이 멀리서 들려오는 겨울밤',
      '장맛비가 창을 두드리는 눅눅한 오후',
      '별이 유난히 쏟아지는 무월(無月)의 밤',
      '함박눈에 도시의 소음이 묻힌 한겨울 저녁',
      '땀이 식어 가는 폭염의 한여름 밤',
      '안개가 무릎까지 차오른 흐린 새벽',
      '단풍이 붉게 타는 늦가을 황혼',
      '폭죽이 터지는 연말 카운트다운의 한순간',
      '비 갠 뒤 무지개가 걸린 오후',
      '에어컨 바람만 도는 텅 빈 사무실의 늦은 밤',
      '벽난로 장작이 타닥이는 눈 갇힌 산장의 밤',
      '파도 소리뿐인 새벽 바닷가',
      '시험 끝난 해방감으로 들뜬 봄의 정오',
      '서리꽃이 창에 핀 한파의 이른 아침',
      '술기운이 살짝 오른 회식 끝 자정',
      '매미 소리가 절정에 달한 한여름 정오',
      '낙엽이 발밑에서 바스러지는 가을 새벽',
      '연회의 음악이 새어 나오는 발코니의 밤',
      '눈이 그친 직후, 세상이 하얗게 멎은 아침',
      '비행운이 길게 갈라지는 맑은 한낮',
      '향초만 켜진 어둑한 실내의 늦은 저녁',
      '첫 출근의 긴장이 도는 이른 아침',
      '소나기 끝 젖은 아스팔트 냄새가 오르는 저녁',
      '달빛이 황궁 회랑을 은빛으로 적시는 깊은 밤',
    ],
  },
  {
    key: 'stagePair', label: '관계 단계', icon: '💗', desc: '두 사람이 지금 서 있는 관계의 좌표(첫 만남→결합)',
    faces: [
      '서로를 최악으로 오해한 적대적 첫 만남(meet-cute, 적→연인의 씨앗)',
      '강제로 한 공간에 묶여 어색함만 흐르는 동거 초반',
      '계약 관계로 시작해 아직 선을 긋는 가짜 연인 단계',
      '끌림을 인정 못 해 일부러 더 쏘아붙이는 부정 단계',
      '함께한 시간이 쌓여 케미가 폭발하는 "달콤한 한때"',
      '서로의 상처를 처음 들여다본, 거리가 한 뼘 좁혀진 밤',
      '닿을 듯 닿지 않는 손끝—짝사랑하는 쪽의 애틋한 갈망(pining)',
      '첫 키스 직전까지 갔다가 방해받은 니어 키스(almost-kiss)',
      '진심을 자각했으나 차마 말하지 못하는 고백 직전',
      '고백했다가 거절당해 도망치듯 물러선 직후',
      '거절 뒤 재고백을 준비하며 마음을 다잡는 단계',
      '연적의 등장으로 처음 질투를 느끼는 자각의 순간',
      '비밀·신분·과거가 수면 위로 떠올라 흔들리는 관계',
      '오해가 폭발해 최악으로 어긋난 블랙모먼트의 한복판',
      '떨어진 채 각자 진심을 깨닫는 다크 나이트(성찰 구간)',
      '그랜드 제스처로 모든 걸 걸고 마음을 증명하는 재결합',
      '서로를 선택한 직후, 처음으로 "사랑한다"를 말하는 순간',
      '맺어진 뒤의 달콤한 후일담(외전)—일상 속 설렘',
      '회귀로 미래를 아는 한쪽이 비극을 알면서 다시 마주한 재회',
      '버렸던 쪽이 뒤늦게 후회하며 매달리는 후회의 순간',
      '집착이 깊어진 한쪽이 상대를 독점하려 드는 위태로운 단계',
      '권력·신분 차이를 사이에 두고 선을 넘을지 망설이는 경계',
      '오랜 친구에서 이성으로 보이기 시작한 흔들리는 우정',
      '헤어진 연인이 우연히 재회해 옛 감정이 되살아나는 단계',
    ],
  },
  {
    key: 'device', label: '로맨스 장치', icon: '🔗', desc: '두 사람을 묶고 감정을 끌어올리는 장르 고유 장치',
    faces: [
      '강제 동거(forced proximity)로 사적 공간을 공유하게 된다',
      '계약 결혼·계약 연애로 가짜인데 진짜가 되어 간다',
      '가짜 연인(fake dating) 행세를 하다 연기가 진심이 된다',
      '한 침대만 남아 어쩔 수 없이 등을 맞대고 눕는다(one bed)',
      '우연한 손 스침이 의도적 접촉으로 한 단계 고조된다(touch escalation)',
      '술기운·고열·잠결에 무심코 본심이 흘러나온다',
      '연적의 접근에 자기도 모르게 상대를 끌어당겨 질투를 드러낸다',
      '비밀을 들킬 위기에 둘이 한 편이 되어 거짓말을 맞춘다',
      '상대가 위험에 빠지자 망설임 없이 몸을 던져 감싼다',
      '닿을 듯 다가갔다가 한 발 물러서는 밀당(push-pull)이 작동한다',
      '입맞춤 직전 누군가 방해해 텐션만 끌어올리고 보상을 미룬다',
      '낡은 외투·담요를 말없이 어깨에 덮어 주는 무뚝뚝한 다정함',
      '서로의 상처(트라우마)를 처음으로 털어놓으며 거리가 무너진다',
      '한쪽이 기억을 잃거나 정체를 숨겨 정보 비대칭이 긴장을 만든다',
      '회귀·빙의로 미래를 아는 쪽이 결말을 알면서 다시 그를 택한다',
      '오해 한 줄이 풀릴 듯 풀리지 않아 감정을 더 깊게 후벼 판다',
      '편지·일기·미공개 메시지로 숨겨 둔 진심이 뒤늦게 전해진다',
      '병간호·돌봄으로 무방비한 모습을 처음 마주하게 된다',
      '둘만 아는 비밀과 추억이 쌓여 "우리만의 것"이 생긴다',
      '신분·권력 격차를 넘어 한쪽이 가진 것을 내려놓으려 한다',
      '집착하는 쪽이 상대의 모든 것을 알고 곁을 지키려 든다',
      '후회하는 쪽이 자존심을 버리고 먼저 무릎을 굽힌다',
      '경쟁·라이벌 관계가 어느새 서로를 의식하는 끌림으로 바뀐다',
      '운명처럼 자꾸 마주치는 우연이 인연으로 굳어진다',
      '약혼자·정혼자의 존재가 두 사람 사이를 가로막는 벽이 된다',
      '아이(조카·피후견인)를 함께 돌보며 유사 가족의 온기가 싹튼다',
    ],
  },
  {
    key: 'tension', label: '끌림·긴장의 결', icon: '🔥', desc: '이 장면에 흐르는 감정의 온도와 긴장',
    faces: [
      '눈이 마주친 순간 시간이 멎은 듯한 정적',
      '심장 박동이 들킬까 봐 숨을 죽이는 떨림',
      '닿을 듯 말 듯한 손끝의 미세한 거리',
      '말로는 쏘아붙이면서 시선은 떼지 못하는 모순',
      '서로의 숨결이 닿을 만큼 가까워진 위험한 거리',
      '질투에 목소리가 한 톤 낮아지는 독점욕',
      '아무렇지 않은 척하지만 손이 떨리는 동요',
      '오래 참아 온 마음이 한순간 무너질 듯한 긴장',
      '다정한 말 한마디에 무장이 풀려 버리는 무방비',
      '닿고 싶은 충동을 억지로 누르는 절제된 갈망',
      '상대의 향기에 정신이 아득해지는 현기증',
      '눈물을 들키지 않으려 고개를 돌리는 애틋함',
      '농담 뒤에 숨긴 진심이 새어 나올 듯한 위태로움',
      '체념한 척하지만 미련이 묻어나는 쓸쓸함',
      '서로의 진심을 시험하듯 던지는 날 선 말',
      '한 발만 다가가면 모든 게 바뀔 것 같은 예감',
      '오랜 그리움이 재회로 한꺼번에 차오르는 격정',
      '미안함과 그리움이 뒤엉킨 후회의 떨림',
      '지켜 주고 싶다는 충동이 처음 솟구치는 보호 본능',
      '들킨 마음에 얼굴이 달아올라 시선을 피하는 수줍음',
      '서로만 모르는 두 사람을 지켜보는 듯한 묘한 공기',
      '닿은 손을 차마 놓지 못하는 미련의 1초',
    ],
  },
  {
    key: 'conflict', label: '갈등·장애', icon: '⚡', desc: '두 사람을 갈라놓으려는 대립과 위기',
    faces: [
      '한 마디면 풀릴 오해가 자존심 탓에 엇갈린다',
      '비밀(정체·과거·신분)이 들통날 위기에 몰린다',
      '연적·약혼자·옛 연인이 끼어들어 사이를 흔든다',
      '집안·신분·권력의 격차가 둘을 갈라놓으려 한다',
      '한쪽이 상대를 위한다며 일부러 밀어내려 한다',
      '회귀로 안 미래(파혼·죽음·배신)가 다가오고 있다',
      '계약 기간이 끝나 가짜 관계를 끝내야 할 때가 왔다',
      '가족·주변의 반대가 관계를 압박해 온다',
      '과거의 상처(트라우마)가 마음을 다시 닫게 만든다',
      '한쪽이 떠나야 하는 이별의 시한이 정해져 있다',
      '오해의 증거가 하필 본인을 가장 불리하게 가리킨다',
      '진심을 말하면 상대가 위험해지는 상황에 묶인다',
      '스캔들·소문이 두 사람의 평판을 위협한다',
      '상대가 다른 사람과 정략혼·약혼을 진행 중이다',
      '자존심과 진심 사이에서 끝내 말을 삼키게 된다',
      '버림받은 기억 때문에 다가오는 마음을 의심한다',
      '둘 다 서로가 자기를 좋아할 리 없다고 단정해 버린다',
      '한쪽의 거짓말이 결정적인 순간에 들통난다',
      '시간·거리·바쁜 일상이 둘을 자꾸 어긋나게 한다',
      '상대를 지키려면 자신의 마음을 포기해야 한다',
      '집착하는 쪽의 도가 지나친 행동이 상대를 겁먹게 한다',
      '후회로 매달리는 쪽을 상대가 쉽게 받아 주지 않는다',
      '오랜 친구라는 관계가 고백을 망설이게 하는 벽이 된다',
      '한쪽의 희생이 상대에게 죄책감과 거리를 만든다',
      '진실을 밝히면 한 사람이, 침묵하면 다른 사람이 다친다',
      '서로의 꿈·진로가 정반대 방향을 가리킨다',
    ],
  },
  {
    key: 'turn', label: '전환·사건', icon: '🌀', desc: '관계를 한순간에 뒤바꾸는 결정적 한 수·반전',
    faces: [
      '참던 마음이 터져 처음으로 "사랑한다"를 내뱉는다',
      '입맞춤이 방해 없이 끝까지 닿는다(첫 키스)',
      '도망치는 상대를 붙잡아 손목을 끌어당긴다',
      '오해가 한순간에 풀리며 진실이 드러난다',
      '비밀(정체·과거)이 폭로되어 모든 게 뒤집힌다',
      '연적의 고백을 가로채며 자신의 마음을 선언한다',
      '권력·지위·재산을 포기하고 그 사람을 택한다(그랜드 제스처)',
      '공항·역에서 떠나는 상대를 마지막에 붙잡는다',
      '만인 앞에서 공개적으로 마음을 고백한다',
      '약혼·정략혼을 깨고 진심 쪽으로 돌아선다',
      '위험에 빠진 상대를 몸을 던져 구한다',
      '회귀로 알던 비극의 플래그가 한순간에 꺾인다',
      '버렸던 쪽이 자존심을 버리고 완전히 무릎 꿇는다(후회)',
      '편지·일기로 숨겨 둔 진심이 뒤늦게 전해진다',
      '닫혀 있던 상대가 처음으로 자기 상처를 털어놓는다',
      '계약 관계를 끝내려다 진짜 감정을 들켜 버린다',
      '재회한 옛 연인이 다시 손을 내민다',
      '죽은 줄 알았던·떠난 줄 알았던 그 사람이 돌아온다',
      '질투를 들킨 순간 두 사람의 진심이 동시에 드러난다',
      '대형 위기 앞에서 둘이 서로를 먼저 끌어안는다',
      '"내가 잘못했다"는 한 마디로 권력 관계가 역전된다',
      '결혼·동행·미래를 약속하는 프러포즈가 이뤄진다',
      '서로의 비밀을 알면서도 받아들이기로 한다',
      '한쪽의 희생을 다른 쪽이 끝내 막아서며 함께 남는다',
      '오랜 친구 사이의 선을, 둘 중 하나가 먼저 넘는다',
      '둘만 아는 추억의 장소에서 모든 오해가 녹아내린다',
    ],
  },
  {
    key: 'sensory', label: '감각 디테일', icon: '🌸', desc: '설렘을 살리는 한 줄의 감각',
    faces: [
      '맞닿은 손끝에서 번지는 따뜻한 체온',
      '귓가에 닿을 듯 낮아진 숨소리',
      '상대에게서 풍기는 은은한 비누·향수 냄새',
      '빗방울이 어깨를 적시는 차가운 감촉',
      '심장이 귀까지 울리는 제 박동 소리',
      '뺨에 닿은 손바닥의 거칠고 따뜻한 결',
      '첫눈이 속눈썹에 내려앉아 녹는 서늘함',
      '맞잡은 손에 배어 나오는 미세한 땀',
      '커피잔 너머로 마주친 시선의 온도',
      '어깨에 덮인 외투에서 나는 익숙한 체취',
      '입술이 닿기 직전의 팽팽한 공기',
      '머리카락을 쓸어 넘기는 손길의 떨림',
      '벚꽃잎이 머리 위로 떨어지는 가벼운 무게',
      '담요 속에서 닿은 발끝의 온기',
      '울먹임이 새어 나오는 잠긴 목소리',
      '품에 안겼을 때 들리는 옷깃 스치는 소리',
      '식어 가는 손을 감싸 쥐는 두 손의 온도',
      '머뭇거리다 깍지 낀 손가락의 빈틈',
      '귓불까지 붉어진 얼굴의 열기',
      '눈물이 뺨을 타고 흐르는 따뜻한 자국',
      '늦은 밤 통화 너머 숨죽인 웃음소리',
      '이마에 닿은 입술의 가벼운 무게',
      '비 갠 뒤 젖은 흙과 풀 냄새 속의 침묵',
      '품을 파고드는 어깨의 떨림',
      '손등에 떨어진 첫눈의 차가운 점',
      '맞닿은 등 너머로 전해지는 상대의 심장박동',
    ],
  },
  {
    key: 'mode', label: '전개법(하위유형)', icon: '📜', desc: '하위유형 관습으로 장면을 엮는 전개 틀(도시에 근거)',
    faces: [
      '현대 로맨스: 일상의 결을 살리되 매 장면 두 사람의 거리 변화를 새긴다',
      '슬로우번: 점화를 서두르지 않고 긴장을 켜켜이 누적해 끓는점을 미룬다',
      '인스타러브: 첫눈에 끌린 강렬함으로 빠르게 감정을 점화한다(단편·카테고리)',
      '밀당 진자: 한 발 다가가면 두 발 물러서는 박자로 텐션을 살아 있게 둔다',
      '블랙모먼트 설계: 관계가 끝장난 듯한 최저점으로 떨어뜨려 절정을 예비한다',
      '그랜드 제스처: 자존심·지위·목숨을 건 증명 행위로 마음을 입증한다',
      '상호성의 결말: 한쪽의 일방적 희생이 아니라 둘 다 내려놓고 다가서게 한다',
      '회차 후킹: 마지막 한 줄을 다음 화를 부르는 설렘·클리프행어로 끊는다',
      '회차 보상: 매 장면 작은 설렘·반전·다음 화 궁금증을 반드시 심는다',
      'POV 친밀성: 한 사람의 내면에 깊이 들어가 두근거림을 1인칭처럼 체감시킨다',
      '남주 시점 외전: 상대의 속마음을 별도 시점으로 뒤늦게 보여 줘 재미를 더한다',
      '로맨스판타지 정통연애: 황실·귀족 사회의 격식 위에 다정한 호감을 얹는다',
      '악역영애물: 파멸 플래그를 알고 능동적으로 결말을 비틀며 호감을 산다',
      '회빙환 정보 비대칭: 주인공만 미래를 알아 애절함과 능동성을 동시에 만든다',
      '후회물: 가해/이별했던 쪽의 완전한 속죄로 권력 역전의 카타르시스를 준다',
      '집착물(얀데레): 과도한 독점욕을 위태롭되 매혹적인 선에서 연출한다',
      '계약→진심: 가짜 관계가 진짜로 전환되는 분기점을 백미로 살린다',
      '육아·힐링: 아이를 매개로 한 유사 가족의 온기로 설렘을 천천히 데운다',
      '질투 촉매: 연적의 등장으로 미뤄 둔 진심을 자각하게 만든다',
      '오해의 정당화: 한 마디면 풀릴 오해 대신, 인물의 상처에서 필연인 오해를 쓴다',
      '접촉 고조: 손 스침→포옹→키스로 신체 거리의 점층으로 감정을 가시화한다',
      '고백의 다단계: 고백→회피/거절→재고백→응답의 구조로 보상을 설계한다',
      '관능도 합의(clean): 키스까지의 설렘에 집중해 여백으로 긴장을 남긴다',
      '관능도 합의(steamy): 사전 고지된 수위 안에서 감정의 절정을 몸으로 그린다',
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

// 굴린 조각들을 한 편의 로맨스 장면 설계로 엮는다.
function compose(by: Record<string, string>): string {
  const narr: string[] = []
  if (by.stage && by.time) narr.push(`${by.stage}, ${by.time}.`)
  else if (by.stage) narr.push(`${by.stage}.`)
  else if (by.time) narr.push(`${by.time}.`)
  if (by.stagePair) narr.push(`두 사람은 ${by.stagePair}.`)
  if (by.device) narr.push(`이 장면에서는 ${by.device}.`)
  if (by.tension) narr.push(`그 사이로 흐르는 건 ${by.tension}.`)
  if (by.conflict) narr.push(`그러나 ${by.conflict}.`)
  if (by.turn) narr.push(`바로 그 순간, ${by.turn}.`)
  if (by.sensory) narr.push(`(설렘의 감각: ${by.sensory}.)`)
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

export default function RomanceSceneForge({ payload }: { payload?: Record<string, unknown> }) {
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
    // 다른 도구에서 '로맨스' 장르로 진입 시 안내 토스트(payload.genre 활용)
    if (typeof payload?.genre === 'string' && payload.genre.includes('로맨스')) {
      setToast('로맨스 장면 설계를 시작합니다. 🎲 굴려 보세요.')
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
  const sceneTitle = `${byKey.stagePair ? byKey.stagePair.split(/[(（]/)[0].trim().slice(0, 16) : '로맨스 장면'}${byKey.stage ? ' · ' + byKey.stage.slice(0, 16) : ''}`
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
      title: `💞 ${sceneTitle}`,
      bodyHtml: bodyHtmlFor(sceneTitle, story, rowsText(), slotLabelLine),
      synopsis: story.split('\n')[0] || sceneTitle,
      meta: {
        장르: '로맨스',
        무대: byKey.stage ? byKey.stage.slice(0, 30) : '—',
        관계단계: byKey.stagePair ? byKey.stagePair.split(/[(（]/)[0].trim().slice(0, 30) : '—',
        로맨스장치: byKey.device ? byKey.device.split(/[(（]/)[0].trim().slice(0, 30) : '—',
        전개법: byKey.mode ? byKey.mode.split(':')[0] : '—',
      },
    })
    setToast(id ? '프로젝트 원고 〈장면〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }
  const addSavedToProject = (s: Saved) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '장면',
      title: `💞 ${s.title || '로맨스 장면'}`,
      bodyHtml: bodyHtmlFor(s.title || '로맨스 장면', s.text, s.rows, s.slots) + (s.note ? `<p style="color:#888;">📝 ${escHtml(s.note)}</p>` : ''),
      synopsis: s.text.split('\n')[0] || s.title,
      meta: { 장르: '로맨스' },
    })
    setToast(id ? '프로젝트 〈장면〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 장면 목록 도구로 보내기(연계)
  const toSceneList = () => {
    if (!hasResults) return
    openToolLinked('scene-list', {
      scene: {
        title: sceneTitle, summary: story.split('\n')[0] || story,
        pov: byKey.stagePair || '', place: byKey.stage || '',
        goal: byKey.device || '', conflict: byKey.conflict || '', mood: byKey.tension || byKey.time || '',
      },
      genre: '로맨스',
    })
    setToast('장면 목록으로 보냈습니다.')
  }
  // 배경 라이브러리에 무대 저장
  const toLibPlace = () => {
    if (!byKey.stage) return
    const placeAtmosphere = byKey.tension || byKey.time || ''
    addToLibrary('places', {
      name: byKey.stage, kind: '로맨스 무대', mood: placeAtmosphere,
      sensory: byKey.sensory || '', notes: story, source: '로맨스 장면 생성기',
      // 표준(정규) 키 — 받는 허브(배경 설정집)에서 항목이 제자리에 들어가도록 1:1 매핑 추가.
      fields: {
        name: byKey.stage,
        kind: '로맨스 무대',
        appearance: byKey.stage,
        atmosphere: placeAtmosphere,
        sensory: byKey.sensory || '',
        notes: story,
      },
    })
    setToast('배경 라이브러리에 무대를 저장했습니다.')
  }
  // 스니펫(글감) 저장
  const saveSnippet = (text: string, slots: string) => {
    if (!text) return
    addToLibrary('snippets', {
      text: `[로맨스 장면] ${text}`,
      source: '로맨스 장면 생성기',
      tags: ['글감', '로맨스', '장면', ...slots.split('·').filter(Boolean)],
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
        <b>무대·시각·관계 단계·로맨스 장치·끌림/긴장·갈등·전환·감각·전개법</b> 슬롯을 굴려, 로맨스 전형 장면을 한 편의 설계로 엮습니다. 슬롯은 <Emoji e="🔒" />로 고정하고 나머지만 다시 <Emoji e="🎲" /> 굴리세요. <b>전개법</b> 슬롯이 현대·로판·회빙환·후회물·집착물 등 하위유형 관습(밀당·블랙모먼트·그랜드 제스처·슬로우번)을 적용합니다.
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'}
          style={{ borderColor: tab === 'forge' ? 'var(--accent)' : 'var(--border)', color: tab === 'forge' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="💞" /> 생성
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐" /> 보관함 ({saved.length})
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
                  <Emoji e={s.icon} /> {s.label}{on ? '' : ' +'}
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
                    <Emoji e={slot.icon} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{slot.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5, color: face ? 'var(--text)' : 'var(--muted)' }}>
                      {face ? (rolling && !isLocked ? '…' : face) : '— 굴려주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => rollOne(k)} disabled={isLocked} title="이 슬롯만 다시" style={{ flexShrink: 0 }}><Emoji e="🎲" /></button>
                  <button className="minibtn" onClick={() => toggleLock(k)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
                  </button>
                </div>
              )
            })}
          </div>

          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', maxHeight: 200, overflowY: 'auto' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="💞" /> 로맨스 장면 설계</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: hasResults ? 'var(--text)' : 'var(--muted)', whiteSpace: 'pre-wrap' }}>
              {story || '슬롯을 굴리면 로맨스 전형 장면이 한 편의 설계로 엮입니다.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={forgeAll}><Emoji e="💞" /> 장면 생성 / 다시 굴리기</button>
            <button className="minibtn" onClick={() => copy('story', `${story}\n\n${rowsText()}`)} disabled={!hasResults}>
              {copiedKey === 'story' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
            </button>
            <button className="minibtn" onClick={saveCurrent} disabled={!hasResults}><Emoji e="⭐" /> 보관</button>
            <button className="minibtn" onClick={() => saveSnippet(story, slotLabelLine)} disabled={!hasResults} title="글감 스니펫 라이브러리에 저장"><Emoji e="✂️" /> 스니펫</button>
          </div>

          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={addStoryToProject} disabled={!hasResults || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !hasResults ? '먼저 장면을 굴려주세요' : '현재 장면을 프로젝트 원고 〈장면〉 폴더에 추가'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={toSceneList} disabled={!hasResults}><Emoji e="📋" /> 장면 목록으로</button>
            <button className="linkbtn" onClick={toLibPlace} disabled={!byKey.stage}><Emoji e="🏞" /> 무대 저장</button>
            <button className="linkbtn" onClick={() => openToolLinked('setting-bible', { genre: '로맨스' })}><Emoji e="🌃" /> 배경 설정집</button>
            <button className="linkbtn" onClick={() => openToolLinked('character-sheet', { genre: '로맨스' })}><Emoji e="🪪" /> 인물 시트</button>
            <button className="linkbtn" onClick={() => openToolLinked('relationship-map', { genre: '로맨스' })}><Emoji e="💗" /> 관계도</button>
            <button className="linkbtn" onClick={() => openToolLinked('emotion-arc', { genre: '로맨스' })}><Emoji e="📈" /> 감정 곡선</button>
            <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre: '로맨스' })}><Emoji e="🔺" /> 플롯 피라미드</button>
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐" /></div>
              보관한 장면이 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성 탭에서 <Emoji e="⭐" /> 보관을 눌러 마음에 드는 로맨스 장면을 모아보세요.</span>
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
                    {copiedKey === k ? <>✓</> : <Emoji e="📋" />}
                  </button>
                  <button className="minibtn" onClick={() => saveSnippet(s.text, s.slots)} title="스니펫 라이브러리에 저장"><Emoji e="✂️" /></button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑" /></button>
                </div>
                {s.title && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}><Emoji e="💞" /> {s.title}</div>}
                <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{s.text}</div>
                {s.rows && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{s.rows}</div>
                )}
                <textarea
                  value={s.note}
                  onChange={(e) => setNote(s.id, e.target.value)}
                  placeholder="이 장면을 어느 작품·회차에 쓸지 메모…"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
                <div className="linkbar">
                  <span className="linkbar-label">연계:</span>
                  <button className="linkbtn" onClick={() => addSavedToProject(s)} disabled={!hasProjectBridge()}
                    title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 장면을 프로젝트 원고 〈장면〉 폴더에 추가'}>
                    <Emoji e="📄" /> 프로젝트에 추가
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>장면은 출발점일 뿐입니다. 같은 조합이라도 내 인물의 상처·관계 좌표·관능도 약속에 맞춰 자유롭게 비틀어 보세요. 로맨스의 핵심은 사건이 아니라 매 장면 좁혀지거나 벌어지는 <b>두 사람의 거리</b>입니다.</div>
    </div>
  )
}
