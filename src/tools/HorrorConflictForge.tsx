// 호러·공포 갈등·딜레마 도가니(坩堝) — 호러 장르 도시에에 근거한 갈등 구도 슬롯 조합 생성기.
//  취약한 주체 · 공포의 정체(off-screen) · 절박한 욕망 · 호러적 장애물 · 저주의 규칙(금기) ·
//  고립 장치 · 위기에 걸린 것(금기 침범) · 도덕적 딜레마(생존 vs 인간성) · 비틀기(비카타르시스 씨앗) · 무대(하위장르)
//  슬롯별 🔒 잠금 + 부분 재생성, 전체 조합수 표시(1조 이상). 결과를 한 단락 갈등 문장으로 조립(드레드 빌드업).
//  연계: addToProject(folder:'갈등') 문서 추가 · addToLibrary('snippets') 글감 저장 · 관련 도구 열기.
//  자급식: react · './linkbus' 외 import 없음. 전부 로컬. localStorage 'sry:tool:horror-conflictforge'.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'horror-conflictforge', name: '호러 갈등 도가니', icon: '🩸', group: '생성기', genre: '호러·공포', intro: '저주의 규칙·고립·금기 침범·off-screen 공포로 호러다운 갈등과 비카타르시스 딜레마를 무작위 단조', w: 600, h: 700 }

// ── 호러 도시에 기반 슬롯 풀(장르 특화·구체) ──
// 1) 취약한 주체: 누구의 공포인가 — 이입할 무력·고립된 인물(도시에 §2 '취약한 인물')
const SUBJECT = [
  '이사 온 낡은 집의 지하실이 자꾸 신경 쓰이는 신혼부부',
  '폭설로 외딴 산장에 갇힌 마지막 투숙객',
  '죽은 동생의 일기를 발견한 불면증의 누나',
  '아무도 자기 말을 믿어주지 않는 신경쇠약의 목격자',
  '7일 전 저주받은 영상을 본 야간 편집 알바생',
  '오래된 등대를 홀로 지키게 된 신참 등대지기',
  '시신을 닦는 일을 막 시작한 장례지도사 수습',
  '보이지 않는 친구와 대화하는 딸을 둔 싱글맘',
  '폐가 체험 방송을 켠 채 연락이 끊긴 인터넷 방송인',
  '마을 전체가 너무 친절해서 떠날 수 없는 외지에서 온 교사',
  '병원 야간 당직을 혼자 도는 신참 간호사',
  '실종된 아내의 마지막 통화를 추적하는 형사',
  '거울 속 자신이 0.5초 늦게 웃는 걸 알아챈 미술학도',
  '가족이 어느 날부터 표정이 사라진 걸 느끼는 막내',
  '낡은 비디오테이프를 물려받은 영상자료 수집가',
  '치매에 걸린 어머니가 매일 같은 경고를 반복하는 아들',
  '실험을 위해 수면 박탈 연구에 자원한 대학원생',
  '교통사고 뒤 자기 장례식을 본 기억이 있는 회복기 환자',
  '폐교된 모교에 돌아온 마지막 졸업생',
  '입양된 집의 다락방 출입만은 금지당한 위탁 아동',
  '한밤중 라디오 잡음에서 자기 이름을 들은 택시 기사',
  '깊은 산 펜션에 워크숍을 온 신생 스타트업 팀',
  '봉인된 우물이 있는 종갓집에 제사를 지내러 온 종손',
  '잠수정 심해 탐사에서 통신이 끊긴 연구원',
  '환자들이 같은 악몽을 호소하는 정신병동의 신임 의사',
  '죽은 쌍둥이 형의 방을 그대로 쓰게 된 동생',
  '낯선 아이가 자꾸 "엄마"라 부르는 임신부',
  '한 번 들어가면 층수가 매번 달라지는 아파트의 신규 입주자',
  '교회 지하에서 옛 의식 도구를 발견한 신학생',
  '죽은 자의 사진만 찍히는 카메라를 산 사진가',
  '매일 밤 같은 시각 문 두드리는 소리에 시달리는 자취생',
  '폐쇄된 지하철역에서 막차를 놓친 야근 직장인',
]

// 2) 공포의 정체(off-screen) — 끝까지 다 보이지 않는 위협(도시에 §3 '보이지 않는 것의 공포')
const HORROR = [
  '벽 안에서 긁는 소리를 내며 천천히 형체를 갖춰가는 무언가',
  '복사된 비디오를 본 사람에게 7일 뒤 찾아오는 축축한 원혼',
  '낮에는 가족의 얼굴을, 밤에는 다른 것을 쓰는 존재',
  '이름을 부르면 한 걸음씩 가까워지는, 보이지 않는 손님',
  '집 자체가 산 사람을 적대하는 의지를 품게 된 것',
  '거울 속에서만 다르게 움직이는 또 하나의 자신',
  '마을 사람 전부가 떠받드는, 결코 모습을 보여선 안 되는 옛 신',
  '몸속으로 파고들어 천천히 숙주를 갈아치우는 기생체',
  '잠들면 꿈을 통해 영역을 넓혀오는 무형의 포식자',
  '사진에만 찍히는, 점점 더 가까이 다가오는 검은 형상',
  '아이의 보이지 않는 친구라는 가면을 쓴 오래된 굶주림',
  '인간의 이해를 넘어선, 보기만 해도 정신이 무너지는 심해의 무엇',
  '죽은 자의 자리를 똑같은 얼굴로 대신 채워넣는 무언가',
  '정전이 될 때마다 한 사람씩 데려가는 어둠 속 존재',
  '라디오 잡음과 전화 너머에서만 말을 거는 목소리',
  '제물을 바치지 않으면 풍년을 거두어가는 숲의 옛 약속',
  '한 번 본 사람의 기억에서 영영 지워지지 않는 미소',
  '시신을 통해 산 자에게 옮겨붙으려는 굶주린 빈자리',
  '밤마다 한 층씩 천장에서 내려오는 발소리의 주인',
  '들여다본 자의 형상을 똑같이 빚어 대신 살게 하는 우물 속의 것',
  '말을 걸면 대답하고, 대답하면 데려가는 거울 너머의 가족',
  '죽음을 잠시 미뤄주는 대신 산 자의 시간을 갉아먹는 존재',
  '봉인이 약해질 때마다 종손의 꿈으로 흘러드는 종가의 옛 원한',
  '환자들의 같은 악몽 속에서 천천히 살을 얻어가는 형체',
]

// 3) 절박한 욕망: 무엇을 원하는가 — 호러는 '잃을 것'이 곧 욕망(도시에 §4 '일상=잃을 것')
const DESIRE = [
  '날이 밝을 때까지 가족을 한 명도 잃지 않고 버티는 것',
  '저주가 자신을 데려가기 전에 규칙을 알아내 멈추는 것',
  '실종된 가족이 정말 죽었는지 끝까지 확인하는 것',
  '아무도 믿지 않는 위협을 증명해 사람들을 대피시키는 것',
  '이 마을을 들키지 않고 살아서 빠져나가는 것',
  '저주를 다른 사람에게 옮겨서라도 자신은 살아남는 것',
  '죽은 아이를 되돌릴 수 있다는 금지된 방법을 끝내 시도하는 것',
  '집에 깃든 비극의 역사를 파헤쳐 원혼을 떠나보내는 것',
  '7일이 다 가기 전에 저주의 사슬을 끊을 다음 희생자를 찾는 것',
  '미쳐가는 자신이 정상인지 아닌지 스스로 증명하는 것',
  '동생의 일기가 가리키는 진실에 닿되 미치지 않고 멈추는 것',
  '아이가 부르는 보이지 않는 친구의 정체를 알아내 떼어내는 것',
  '평범했던 어제로, 아무 일 없던 일상으로 돌아가는 것',
  '봉인이 완전히 풀리기 전에 종가의 옛 의식을 되살리는 것',
  '제 손으로 변해버린 가족을 끝내 사람으로 되돌리는 것',
  '통신이 끊긴 이곳에서 단 한 통의 구조 신호라도 보내는 것',
  '들여다보지 말라던 그 방의 문을 끝내 열어 진실을 보는 것',
  '자신이 이미 죽었는지 살아있는지 확인하는 것',
]

// 4) 호러적 장애물 — 욕망을 가로막는 호러 고유의 벽(도시에 §3 장치)
const OBSTACLE = [
  '도와줄 사람도, 전화도 닿지 않는 완전한 고립',
  '주인공만 그것을 보고, 아무도 그 말을 믿지 않는다는 사실',
  '진실에 다가갈수록 정신이 무너져 자신조차 자신을 못 믿게 되는 것',
  '규칙을 어기면 즉시 처벌이 따르는, 빠져나갈 틈 없는 저주의 룰',
  '도망쳐도 같은 장소·같은 시간으로 되돌아오는 공간의 반복',
  '의지해야 할 가족·이웃이 이미 그것의 편이 되어버린 것',
  '한 명을 구하면 반드시 다른 한 명이 대가로 끌려가는 균형',
  '시신이 늘어날수록 그것의 형체가 또렷해지고 강해지는 것',
  '괴물에게 다가갈 유일한 길이 자신을 가장 무방비로 만드는 것',
  '진실을 아는 자가 차례로 입을 잃거나 사라지는 침묵의 압력',
  '해가 뜨기 전까지라는, 한 시간씩 좁혀오는 시간 제한',
  '자신의 몸이 통제를 벗어나 그것의 뜻대로 움직이기 시작하는 것',
  '구하려는 대상이 이미 그것으로 대체된 가짜라는 의심',
  '도움을 청한 외부인이 오자마자 더 빨리 사라져버리는 것',
  '믿었던 단서·기억·증거가 모두 조작이거나 환각이라는 사실',
  '문을 잠글수록 그것이 이미 안에 있다는 정황이 쌓이는 것',
  '마을의 친절이 곧 제물로 점찍힌 자에게 베푸는 마지막 호의인 것',
  '저주를 넘기려면 사랑하는 사람을 다음 표적으로 골라야 하는 것',
]

// 5) 저주의 규칙·금기 — 독자가 파악하며 긴장하는 작동 룰(도시에 §2 '규칙의 존재와 위반')
const RULE = [
  '밤에는 절대 거울을 들여다봐선 안 된다',
  '그것의 이름을 입에 올리면 한 걸음 가까워진다',
  '영상을 본 자는 7일 안에 누군가에게 복사해 넘겨야 산다',
  '다락방(혹은 지하실) 문은 무슨 일이 있어도 열어선 안 된다',
  '밤 12시 이후 문 두드리는 소리에 대답해선 안 된다',
  '거울 속 자신과 눈을 마주쳐선 안 된다',
  '집 안에서 그것의 모습을 봤다고 입 밖에 내선 안 된다',
  '제물을 바치는 의식을 단 한 해라도 거르면 안 된다',
  '잠들면 안 된다 — 꿈을 통해 들어오기 때문이다',
  '사진을 찍어선 안 된다, 찍히면 다음 차례가 된다',
  '아이가 가리키는 곳을 따라 봐선 안 된다',
  '정전이 되면 무슨 소리가 나도 불을 켜선 안 된다',
  '죽은 이의 이름을 세 번 부르면 그가 돌아온다',
  '집 밖으로 한 발도 나가지 않아야 안전하다 — 안이 더 위험해질 때까지',
  '그것과 눈을 마주친 채로 등을 돌려선 안 된다',
  '문턱을 넘기 전 반드시 초대해야 들어올 수 있다 — 그러니 누구도 들이지 말 것',
  '소금·성수·옛 문구는 단 한 번만 통한다, 두 번째는 통하지 않는다',
  '거울·사진·전화기 같은 매개를 통해야만 그것이 건너온다',
]

// 6) 고립·격리 장치 — 외부 도움을 차단해 무력화(도시에 §3 '격리·고립')
const ISOLATION = [
  '폭설로 끊긴 산길과 먹통이 된 휴대폰',
  '정전으로 멈춘 엘리베이터와 잠겨버린 비상구',
  '신호 한 칸 안 잡히는 깊은 산속 펜션',
  '안개에 잠겨 들어온 길조차 사라진 외딴 섬',
  '통신이 두절된 심해 잠수정/우주선의 폐쇄 공간',
  '모두가 한통속인, 외지인을 떠나보내지 않는 폐쇄적 마을',
  '같은 복도·같은 방으로 끝없이 되돌아오는 미궁 같은 건물',
  '아무도 출근하지 않은 텅 빈 야간 병원',
  '막차가 끊긴 폐쇄된 지하철역 승강장',
  '폭우와 산사태로 고립된, 구조대도 못 오는 펜션',
  '문이란 문은 모두 안에서만 잠기는 오래된 저택',
  '바깥은 멀쩡한데 이 집만 시간이 흐르지 않는 듯한 정적',
  '전화를 걸면 늘 자기 집 번호로만 연결되는 회선',
  '낮이 영영 오지 않는, 밤만 반복되는 긴긴 폭풍의 밤',
  '도와줄 단 한 사람이 이미 그것에게 잠식된 폐쇄된 가족',
  '들어온 문이 사라지고 창밖이 온통 어둠뿐인 방',
]

// 7) 위기에 걸린 것 — 실패의 대가(금기 침범, 도시에 §2 '금기 건드리기' · §4 상승 스케일)
const STAKES = [
  '잠든 아이가 한밤중 소리 없이 사라진다',
  '가족이 한 명씩 표정 없는 가짜로 대체된다',
  '저주가 끊기지 않고 다음 세대로 대물림된다',
  '자신이 그것이 되어 사랑하던 이들을 해치게 된다',
  '날이 밝아도 살아남은 자가 결국 아무도 없게 된다',
  '구하려던 사람을 제 손으로 끝내야만 하게 된다',
  '진실을 안 자가 영원히 미친 사람으로 갇힌다',
  '마을 전체가, 그리고 다음 외지인이 같은 운명을 반복한다',
  '그것이 이 집을 벗어나 바깥세상으로 풀려난다',
  '죽은 자가 산 자의 자리를 빼앗아 영영 돌아온다',
  '제물을 못 바쳐 마을의 모든 산 것이 한 해 안에 시든다',
  '봉인이 풀려 종가에 갇혀 있던 옛 원한이 깨어난다',
  '자기 몸을 잃고 의식만 거울/사진 속에 갇힌다',
  '도와주러 온 모든 사람이 차례로 끌려 들어간다',
  '살아남되 정상으로는 영영 돌아오지 못한다 — 트라우마와 결손만 남는다',
  '아무도 그가 거기 있었다는 사실조차 기억하지 못하게 된다',
  '저주를 넘긴 대가로, 사랑하는 사람을 다음 차례로 만든다',
  '끝난 줄 알았던 그것이 더 강해져 되돌아온다',
]

// 8) 도덕적 딜레마 — 생존 vs 인간성, 둘 다 가질 수 없는 선택(도시에 §2 인과응보 · §5 최대 희생)
const DILEMMA = [
  '자신이 살려면 저주를 누군가에게 옮겨야 한다 — 그게 사랑하는 사람일지라도',
  '한 명만 구할 수 있다 — 아이인가, 그를 끝까지 믿어준 동료인가',
  '진실을 알리면 모두가 미쳤다 하고, 침묵하면 다음 희생자가 나온다',
  '변해버린 가족을 사람으로 기억할지, 괴물로 끝낼지 결정해야 한다',
  '그것을 막을 유일한 방법은 무고한 누군가를 제물로 바치는 것이다',
  '죽은 아이를 되돌리면, 돌아온 그것은 더 이상 그 아이가 아니다',
  '도망치면 살지만, 자신이 본 진실을 아는 사람은 영영 없어진다',
  '그것과 거래해 목숨을 부지하면, 매년 한 사람씩 내줘야 한다',
  '괴물이 된 자신을 멈추려면 스스로를 끝내야 한다',
  '마을의 풍습을 따르면 가족은 살고, 거부하면 외지인 손님이 죽는다',
  '문을 잠그면 안의 가족이, 열면 바깥의 모두가 위험해진다',
  '기억을 지우면 평온하지만, 다음에 또 당할 자를 구할 수 없다',
  '한 사람의 죽음을 위장해야 나머지가 그것의 시야에서 벗어난다',
  '사랑하는 이를 미끼로 써야만 그것을 봉인할 시간을 벌 수 있다',
  '구조를 부르면 더 많은 희생자가, 안 부르면 우리 모두가 사라진다',
  '진실을 받아들이면 미치고, 부정하면 그것에게 더 깊이 먹힌다',
]

// 9) 비틀기(비카타르시스 씨앗) — 클리셰 전복·열린 결말(도시에 §5 반전 · 열린 결말)
const TWIST = [
  '괴물의 정체는 학대받아 변해버린 피해자였다 — 진짜 가해자는 따로 있다',
  '주인공은 첫 장면에서 이미 죽어 있었고, 모든 게 사후의 기록이었다',
  '아무도 안 믿어준 게 아니라, 다들 알면서 그를 제물로 합의한 것이었다',
  '저주를 푼 게 아니라 그저 다음 사람에게 옮겨졌을 뿐이다',
  '집을 떠났다 믿었지만 바깥세상이야말로 더 정교한 함정이었다',
  '구하려던 가족은 이미 오래전 죽었고, 곁의 그들은 처음부터 그것이었다',
  '경고하던 노인/이웃이 사실 저주를 퍼뜨리는 장본인이었다',
  '신뢰할 수 없던 화자가 미친 게 아니라, 유일하게 제정신이었다',
  '괴물을 막은 그 행동이 오히려 봉인을 푼 마지막 절차였다',
  '거울 속의 자신이 진짜였고, 이쪽이 줄곧 가짜였다',
  '살아남은 final girl이 마지막에 그것의 다음 그릇으로 선택된 것이었다',
  '모든 게 환각이라 믿고 깨어났지만, 그 깨어남이 또 다른 층의 꿈이었다',
  '주인공이 저주의 희생자가 아니라, 줄곧 저주를 옮기는 매개였다',
  '이긴 줄 알았는데 마지막 컷, 아이의 그림 속에 그것이 다시 그려져 있었다',
  '죽음을 막아준 존재가 곧 모든 죽음을 설계한 그 존재였다',
  '탈출한 차 안, 백미러에 처음부터 함께 타고 있던 것이 비친다',
  '사실 괴물은 없었다 — 그가 사랑한 이들을 차례로 죽인 건 그 자신이었다',
  '봉인은 성공했지만, 그 대가로 봉인한 자 역시 영영 그 안에 갇혔다',
]

// 10) 무대(하위장르) — 갈등이 펼쳐지는 호러 무대(도시에 §1 하위장르 지도 · §7 공간)
const STAGE = [
  '과거의 비극을 품은 귀신 들린 집(haunted house)',
  '외지인을 떠나보내지 않는 저주받은 시골 마을(포크 호러)',
  '가면 살인마가 한 명씩 지워가는 외딴 별장(슬래셔)',
  '엑소시즘과 사이비 의식이 얽힌 오래된 교회/사교집단(오컬트)',
  '감염·기생으로 내 몸이 배신하는 폐쇄 연구소(바디 호러)',
  '인간의 이해를 넘어선 무엇이 깃든 심해/우주의 폐쇄 공간(우주적 공포)',
  '초자연인지 광기인지 끝까지 모호한 정신병동(사이코로지컬)',
  '저주받은 비디오·사진·전화가 매개가 되는 현대 도시괴담',
  '눈에 갇힌, 시간이 멈춘 듯한 외딴 호텔/산장',
  '봉인된 우물·다락이 있는 종갓집과 대물림된 제사',
  '시신을 다루는 장례식장/영안실의 밤',
  '아이의 보이지 않는 친구가 있는 평범한 가정집',
  '실종 사건을 좇다 갇히는 폐교/폐병원',
  '막차가 끊긴 폐쇄된 지하철역/터널',
  '정전된 채 잠긴 야간 고층 아파트',
  '안개에 갇혀 길이 사라진 외딴 섬/등대',
]

interface Slot { key: string; label: string; icon: string; pool: string[] }
const SLOTS: Slot[] = [
  { key: 'subject', label: '취약한 주체', icon: '🕯️', pool: SUBJECT },
  { key: 'horror', label: '공포의 정체', icon: '👁️', pool: HORROR },
  { key: 'desire', label: '절박한 욕망', icon: '🎯', pool: DESIRE },
  { key: 'obstacle', label: '장애물', icon: '🧱', pool: OBSTACLE },
  { key: 'rule', label: '저주의 규칙(금기)', icon: '⛔', pool: RULE },
  { key: 'isolation', label: '고립 장치', icon: '🌫️', pool: ISOLATION },
  { key: 'stakes', label: '위기에 걸린 것', icon: '💀', pool: STAKES },
  { key: 'dilemma', label: '도덕적 딜레마', icon: '⚖️', pool: DILEMMA },
  { key: 'twist', label: '비틀기(비카타르시스)', icon: '🩸', pool: TWIST },
  { key: 'stage', label: '무대(하위장르)', icon: '🏚️', pool: STAGE },
]

// 조합수 = 각 슬롯 풀 크기의 곱(1조 이상 지향)
const COMBOS = SLOTS.reduce((acc, s) => acc * s.pool.length, 1)

const LS_KEY = 'sry:tool:horror-conflictforge'
const ri = (n: number) => Math.floor(Math.random() * n)
const pick = (a: string[], avoid?: string) => {
  if (a.length <= 1) return a[0]
  let v = a[ri(a.length)]
  if (avoid !== undefined && v === avoid) v = a[ri(a.length)]
  return v
}

type Result = Record<string, string>

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 한 단락 갈등 문장 조립 — 드레드 빌드업(일상→균열→포위→딜레마→대가) 순으로.
function summarize(r: Result): string {
  const stage = (r.stage || '').replace(/[.。]$/, '')
  const subj = (r.subject || '주인공').replace(/[.。]$/, '')
  const desire = (r.desire || '무언가').replace(/[.。]$/, '')
  const horror = (r.horror || '그것').replace(/[.。]$/, '')
  const obstacle = (r.obstacle || '').replace(/[.。]$/, '')
  const rule = (r.rule || '').replace(/[.。]$/, '')
  const isolation = (r.isolation || '').replace(/[.。]$/, '')
  const stakes = (r.stakes || '').replace(/[.。]$/, '')
  const dilemma = (r.dilemma || '').replace(/[.。]$/, '')
  let s = `${stage ? stage + ', ' : ''}${subj}.`
  s += ` 그는 ${desire}을(를) 바라지만, ${horror}이(가) 천천히 다가온다.`
  if (isolation) s += ` 도망칠 곳은 없다 — ${isolation}.`
  if (rule) s += ` 단 하나의 규칙이 그를 옭아맨다: "${rule}."`
  if (obstacle) s += ` 그러나 ${obstacle}이(가) 모든 시도를 가로막는다.`
  if (dilemma) s += ` 끝내 그는 선택을 강요받는다 — ${dilemma}.`
  if (stakes) s += ` 실패하면, ${stakes}.`
  return s
}

// 저장된 즐겨찾기(고정 조합) 항목
interface Saved { id: string; result: Result; createdAt: number }

function loadSaved(): Saved[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.saved) ? p.saved : Array.isArray(p) ? p : []
    return arr
      .filter((x: any) => x && typeof x === 'object' && x.result && typeof x.result === 'object')
      .map((x: any) => ({ id: String(x.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7))), result: x.result as Result, createdAt: Number(x.createdAt) || Date.now() }))
  } catch { return [] }
}

export default function HorrorConflictForge({ payload }: { payload?: Record<string, unknown> }) {
  const genreLabel = typeof payload?.genre === 'string' ? (payload.genre as string) : '호러·공포'

  const [result, setResult] = useState<Result>(() => {
    const r: Result = {}
    SLOTS.forEach((s) => { r[s.key] = pick(s.pool) })
    return r
  })
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)
  const [toast, setToast] = useState('')
  const [saved, setSaved] = useState<Saved[]>(() => loadSaved())
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 저장 목록 영속화 — 차단/용량초과 graceful
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ saved })) }
    catch { if (mounted.current) setToast('이 브라우저에서 저장이 막혀 있어요.') }
  }, [saved])

  // 토스트 자동 소거 + 언마운트 정리
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1900)
    return () => window.clearTimeout(t)
  }, [toast])

  // 굴림 애니메이션 자동 해제 + 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 360)
    return () => window.clearTimeout(t)
  }, [rolling])

  const rollAll = useCallback(() => {
    setRolling(true)
    setResult((prev) => {
      const next: Result = { ...prev }
      SLOTS.forEach((s) => { if (!locked[s.key]) next[s.key] = pick(s.pool, prev[s.key]) })
      return next
    })
  }, [locked])

  const rollOne = (key: string) => {
    const slot = SLOTS.find((s) => s.key === key)
    if (!slot) return
    setResult((prev) => ({ ...prev, [key]: pick(slot.pool, prev[key]) }))
  }
  const toggleLock = (key: string) => setLocked((l) => ({ ...l, [key]: !l[key] }))

  const summary = summarize(result)

  const plainText = () => {
    const lines = SLOTS.map((s) => `${s.icon} ${s.label}: ${result[s.key]}`).join('\n')
    return `[호러·공포 갈등]\n${lines}\n\n✍️ ${summary}`
  }

  const copy = () => {
    const text = plainText()
    const done = () => { if (mounted.current) setToast('복사했습니다') }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setToast('복사 실패') }
  }

  // 즐겨찾기 저장(현재 조합 고정)
  const star = () => {
    setSaved((prev) => [{ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), result: { ...result }, createdAt: Date.now() }, ...prev].slice(0, 40))
    setToast('즐겨찾기에 저장했습니다')
  }
  const loadSavedItem = (s: Saved) => { setResult({ ...s.result }); setLocked({}); setToast('불러왔습니다') }
  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))

  // 연계: 갈등 글감을 라이브러리 스니펫으로
  const toSnippet = () => {
    addToLibrary('snippets', { text: summary, source: '호러 갈등 도가니', tags: ['호러·공포', '갈등', result.stage || ''].filter(Boolean) })
    setToast('글감 라이브러리(스니펫)에 저장했습니다')
  }

  // 연계: 프로젝트 자료 〈갈등〉 폴더에 문서로
  const toProject = () => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다'); return }
    const rows = SLOTS.map((s) => `<p><b>${escHtml(s.icon)} ${escHtml(s.label)}</b><br>${escHtml(result[s.key])}</p>`).join('')
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.7;"><b>✍️ ${escHtml(summary)}</b></p>`,
      `<hr/>`,
      rows,
    ].join('')
    const title = `호러 갈등 — ${(result.stage || '무대').slice(0, 18)}`
    const id = addToProject({
      kind: 'text', root: 'research', folder: '갈등',
      title, bodyHtml, synopsis: summary,
      meta: { 장르: genreLabel, 무대: result.stage || '—', 규칙: (result.rule || '—').slice(0, 40), 딜레마: (result.dilemma || '—').slice(0, 40) },
    })
    setToast(id ? '프로젝트 자료 〈갈등〉 폴더에 추가했습니다 (바인더·DB 확인)' : '프로젝트에 추가하지 못했습니다')
  }

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 8, padding: 12, boxSizing: 'border-box', color: 'var(--text)', background: 'var(--paper)', overflow: 'auto' }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
  const slotRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="🩸"/></span>
        <strong style={{ fontSize: 14 }}>호러 갈등 도가니</strong>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }} title="모든 슬롯 풀 조합의 경우의 수">
          약 {COMBOS.toLocaleString()} 조합
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
        저주의 규칙·고립·금기 침범·off-screen 공포 등 호러 도시에에 근거한 갈등 슬롯을 굴립니다. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 단조하세요.
      </div>

      {/* 슬롯 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {SLOTS.map((s) => {
          const isLocked = !!locked[s.key]
          return (
            <div key={s.key} style={slotRow}>
              <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-10deg) scale(1.15)' : 'none' }}><Emoji e={s.icon}/></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{s.label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
                  {rolling && !isLocked ? '…' : result[s.key]}
                </div>
              </div>
              <button className="minibtn" title={isLocked ? '고정 해제' : '이 슬롯 고정'} onClick={() => toggleLock(s.key)} style={{ flexShrink: 0, padding: '2px 6px', borderColor: isLocked ? 'var(--accent)' : 'var(--border)', color: isLocked ? 'var(--accent)' : 'var(--muted)' }}>{isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
              <button className="minibtn" title="이 슬롯만 다시" onClick={() => rollOne(s.key)} disabled={isLocked} style={{ flexShrink: 0, padding: '2px 6px' }}><Emoji e="🎲"/></button>
            </div>
          )
        })}
      </div>

      {/* 조합 한 단락 요약 */}
      <div style={{ background: 'var(--chrome-2)', border: '1px solid var(--accent)', borderRadius: 10, padding: '11px 13px' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}><Emoji e="📝"/> 갈등 한 단락 요약</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>{summary}</div>
      </div>

      {/* 조작 버튼 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, minWidth: 130 }} onClick={rollAll}><Emoji e="🩸"/> 공포 단조하기</button>
        <button className="minibtn" onClick={copy}><Emoji e="📋"/> 복사</button>
        <button className="minibtn" onClick={star} title="현재 조합을 즐겨찾기에 저장"><Emoji e="⭐"/> 저장</button>
      </div>

      {/* 연계 */}
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '이 갈등을 프로젝트 자료 〈갈등〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={toSnippet}><Emoji e="📥"/> 글감 라이브러리</button>
        <button className="linkbtn" onClick={() => openToolLinked('conflict-builder', { character: result.subject, desire: result.desire, obstacle: result.obstacle, stakes: result.stakes })} title="갈등 설계기로 보내 더 다듬기"><Emoji e="⚔️"/> 갈등 설계기</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck')} title="반전 카드 더 보기"><Emoji e="🃏"/> 반전 카드</button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--ok)', textAlign: 'center' }}>{toast}</div>}

      {/* 즐겨찾기 목록 */}
      {saved.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5, fontWeight: 600 }}><Emoji e="⭐"/> 저장된 갈등 {saved.length}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {saved.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 9px' }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={summarize(s.result)}>{summarize(s.result)}</span>
                <button className="minibtn" style={{ flexShrink: 0, padding: '2px 6px', fontSize: 11 }} onClick={() => loadSavedItem(s)} title="불러오기">↻</button>
                <button className="minibtn" style={{ flexShrink: 0, padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={() => removeSaved(s.id)} title="삭제"><Emoji e="🗑️"/></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
