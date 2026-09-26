// 호러 장면 대장간 — 호러·공포 서사의 한 장면을 8개 슬롯 조합으로 대량 생성한다.
//  공간 × 때·날씨 × 시점 인물(취약성) × 첫 징후(균열) × 언캐니 디테일 × 도사린 존재 × 규칙·금기 × 전환(스케어·여운)
//  여덟 슬롯을 골라 굴리면, 호러 한 장면이 되는 전개를 한 단락으로 엮어 준다(드레드 축적 → 스케어 → 여운).
//  마음에 드는 슬롯은 🔒로 고정하고 나머지만 다시 굴려 변주한다. 핵심 생성기 — 조합 1조 이상.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(보관함)만 사용. 외부 API 불필요.
//  도시에 근거: 고립된 폐쇄공간·귀신 들린 집·포크 호러·우주적 공포·바디 호러·언캐니·off-screen·규칙 위반·
//  드레드·잘못된 안도·금지된 지식·저주 전염·신뢰불가 화자·열린 결말 코드를 슬롯 데이터에 반영(전개법 적용).
// 연계(linkbus): 현재 장면을 원고('draft')/'장면' 폴더 문서로 추가하고, 스니펫 라이브러리에도 저장한다.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'horror-sceneforge',
  name: '호러 장면 대장간',
  icon: '🕯️',
  group: '생성기',
  genre: '호러·공포',
  intro: '공간·때·인물·징후·언캐니·존재·규칙·전환 여덟 슬롯을 굴려 호러 장면을 대량 생성하세요',
  w: 600,
  h: 720,
}

const LS = 'sry:tool:horror-sceneforge'

// ---- 슬롯 정의 ----
// 각 슬롯은 호러 장면의 한 축. faces = 그 축의 후보(로컬 표). 장르 특화·구체적으로(일반론 금지).
interface Slot { key: string; label: string; icon: string; desc: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'place', label: '공간', icon: '🏚️', desc: '어디에서 — 고립·폐쇄·일상 침범의 무대',
    faces: [
      '눈보라에 갇혀 외부와 끊긴 산장',
      '대대로 비극을 품어 온 외딴 저택',
      '불 꺼진 등대지기의 텅 빈 오두막',
      '교신이 끊긴 채 표류하는 우주정거장 모듈',
      '수심 800미터에서 멈춰 선 잠수정 선실',
      '외부인을 환대하는 척하는 폐쇄된 시골 마을',
      '이사 첫날, 문이 안 열리는 지하실이 딸린 새 집',
      '환자가 다 사라진 폐병원 3층 복도',
      '관객 없는 낡은 극장의 무대 뒤 분장실',
      '정전된 채 엘리베이터가 멈춘 고층 아파트',
      '비석만 남은 안개 자욱한 국립묘지',
      '예배가 끊긴 산속 폐수도원 회랑',
      '입구가 무너져 갇힌 폐광 갱도 깊은 곳',
      '회전목마가 저 혼자 도는 버려진 놀이공원',
      '아무도 내리지 않는 막차의 마지막 칸',
      '거울만 가득한 빈 백화점 의류 매장',
      '전파가 닿지 않는 캠핑장의 가장 안쪽 텐트',
      '시신을 보관하던 폐쇄 직전의 병원 영안실',
      '제물의 흔적이 남은 숲속 고인돌 제단',
      '한 가구만 남은 철거 직전의 아파트 단지',
      '신호가 끊긴 채 폭설에 멈춘 고속도로 휴게소',
      '문이 안에서 잠긴 학교 야간 자습실',
      '물이 차오르기 시작한 지하 주차장 B4',
      '주인이 사라진 농가의 가축 없는 축사',
      '인적 끊긴 새벽 두 시의 무인 셀프 빨래방',
      '곰팡내 가득한 외갓집 다락방',
      '안내 방송만 흐르는 폐쇄된 지하철 역사',
      '의식의 촛농이 굳은 사이비 교단의 기도실',
      '벽지 뒤에서 소리가 나는 원룸 한 칸',
      '오래전 익사 사고가 있던 폐장한 실내 수영장',
      '배가 끊겨 하룻밤 갇힌 외딴 섬의 민박집',
      '환풍기만 돌아가는 지하 벙커의 통신실',
      '아무도 살지 않는데 불이 켜져 있는 옆집',
    ],
  },
  {
    key: 'when', label: '때·날씨', icon: '🌑', desc: '언제 — 빛과 소리를 앗아 가는 시간·기상',
    faces: [
      '13번째 종이 울린 자정 직후',
      '정전으로 모든 빛이 사라진 폭풍우의 밤',
      '시계가 새벽 세 시에서 멈춰 버린 그 순간',
      '해가 뜨기 직전, 가장 어두운 한 시간',
      '안개가 한 치 앞을 지운 새벽',
      '함박눈에 발소리마저 묻히는 깊은 밤',
      '휴대폰 배터리가 3퍼센트로 떨어진 한밤중',
      '천둥이 칠 때만 방 안이 잠깐 환해지는 순간',
      '괘종시계가 멈추고 집 안이 완벽히 고요해진 때',
      '라디오가 저절로 잡음만 토해 내는 늦은 밤',
      '보름달이 구름에 들고 나길 반복하는 밤',
      '해무가 항구를 통째로 삼킨 정오',
      '전등이 깜빡이다 끝내 꺼져 버린 직후',
      '같은 시각이 자꾸 되풀이되는 듯한 오후',
      '눈이 길을 지워 돌아갈 곳을 잃은 저녁',
      '비가 창을 두드려 다른 소리를 다 가린 새벽',
      '단전·단수가 동시에 시작된 한여름 열대야',
      '달력의 날짜가 어제와 똑같은 아침',
      '모두가 잠든 뒤, 집 안에 나만 깨어 있는 시각',
      '진눈깨비가 유리에 들러붙어 바깥이 안 보이는 밤',
      '해가 떠도 그림자만 길어지는 흐린 한낮',
      '약속한 7일째, 마지막 자정이 다가오는 때',
      '폭설로 길이 끊긴 채 맞은 둘째 날 밤',
      '전기는 들어오는데 모든 시계가 다른 시각을 가리킬 때',
      '깊은 잠에서 정확히 같은 시각에 깨어난 새벽 4시 44분',
      '안개경보가 내린 채 동이 트지 않는 아침',
      '정전된 엘리베이터 안, 시간 감각이 사라진 동안',
      '폭우에 정전과 단수가 겹친 늦은 밤',
      '바깥은 환한데 집 안만 어둑해진 오후',
      '달도 별도 없이 칠흑 같은 그믐밤',
      '귀가 먹먹할 만큼 모든 소리가 멎은 한순간',
      '해가 진 뒤 가로등이 하나둘 꺼져 가는 골목',
      '시간이 멎은 듯 초침 소리만 크게 들리는 밤',
    ],
  },
  {
    key: 'who', label: '시점 인물', icon: '🫥', desc: '누가 — 무력·고립으로 이입을 만드는 취약한 인물',
    faces: [
      '아무도 자기 말을 믿어 주지 않는, 다들 미쳤다고 하는 화자',
      '혼자 집을 지키게 된 어린아이',
      '약을 끊은 뒤 환각인지 진짜인지 분간 못 하는 사람',
      '깁스로 다리를 못 움직여 도망칠 수 없는 환자',
      '귀가 들리지 않아 등 뒤를 느끼지 못하는 인물',
      '이 집에 무슨 일이 있었는지 모른 채 이사 온 가족의 막내',
      '"여긴 오면 안 됐다"는 경고를 무시한 외지인',
      '동료들과 떨어져 혼자 뒤처진 탐사대원',
      '죽은 가족의 목소리를 자꾸 듣는 유족',
      '임신한 몸으로 외딴집에 홀로 남겨진 여인',
      '간밤의 일을 통째로 기억하지 못하는 생존자',
      '신앙을 잃어 가던 중 부름을 받은 젊은 사제',
      '금지된 방을 끝내 열고야 만 호기심 많은 인물',
      '저주받은 물건을 모르고 사들인 골동품상',
      '마지막까지 살아남으려는, 가장 평범했던 사람',
      '동생을 찾으러 혼자 폐가에 들어간 누나',
      '취재를 위해 마을에 잠입한 신참 기자',
      '아무도 없는 집에서 인기척을 느끼는 자취생',
      '꿈과 현실의 경계가 무너지기 시작한 불면증자',
      '가족 중 자기만 그것을 볼 수 있는 둘째',
      '실종 신고를 받고 홀로 출동한 야간 당직 경찰',
      '낡은 일기장을 해독하다 정신이 잠식되는 연구자',
      '거울 속 자신이 다르게 움직이는 걸 본 사람',
      '죽은 친구의 번호로 문자를 받기 시작한 청년',
      '제 손이 제 뜻대로 움직이지 않기 시작한 환자',
      '아이의 "보이지 않는 친구"를 의심하기 시작한 부모',
      '마을 사람 전부가 자신을 지켜보는 걸 깨달은 여행자',
      '응답 없는 무전기만 붙들고 있는 마지막 생존자',
      '몸 안에서 무언가 자라는 느낌을 떨치지 못하는 사람',
      '이미 죽은 줄도 모르고 집을 떠도는 화자',
      '약속을 어기면 차례가 온다는 걸 뒤늦게 안 사람',
      '동물이 자기만 보면 으르렁대는 이유를 모르는 입주자',
      '한 번 본 얼굴이 어디서든 다시 나타나는 사람',
    ],
  },
  {
    key: 'crack', label: '첫 징후', icon: '🩻', desc: '균열 — 설명될 법한, 그러나 어긋난 첫 신호',
    faces: [
      '분명 잠갔던 문이 아침마다 조금씩 열려 있다',
      '벽지 안쪽에서 긁는 소리가 일정한 박자로 들린다',
      '가족사진 속 누군가의 얼굴이 매번 다르게 보인다',
      '밤마다 천장에서 발소리가 또박또박 지나간다',
      '아이가 허공의 한 점을 보며 인사를 건넨다',
      '키우던 개가 텅 빈 복도를 향해 사납게 짖는다',
      '거울에 비친 방 안 물건의 위치가 미묘하게 다르다',
      '없던 문이 복도 끝에 하나 더 생겨 있다',
      '욕실 배수구에서 머리카락이 끝없이 올라온다',
      '시계가 모두 같은 시각에서 멈춰 있다',
      '전화기 너머로 자기 목소리가 메아리처럼 들린다',
      '창밖에 어제도 그제도 같은 사람이 서 있다',
      '벽에 손바닥 자국이 안쪽에서 찍혀 있다',
      '오래된 비디오테이프에 찍은 적 없는 장면이 담겨 있다',
      '냉장고 안에서 흙냄새가 새어 나온다',
      '아무도 누른 적 없는데 초인종이 한 번씩 울린다',
      '계단을 셀 때마다 칸수가 한 칸씩 늘어 있다',
      '잠든 사이 누가 머리맡 의자를 침대 쪽으로 돌려놓는다',
      '라디오 잡음 속에서 자기 이름을 부르는 소리가 섞인다',
      '욕조 물이 빼도 빼도 핏물 색으로 다시 찬다',
      '가족이 똑같이 생겼는데 미소가 0.5초씩 늦다',
      '집 안 모든 시계의 초침이 거꾸로 돌기 시작한다',
      '창문 유리에 안쪽에서 입김 자국이 맺힌다',
      '읽지 않은 편지가 매일 우편함에 한 통씩 늘어난다',
      '잠들기 전 끈 불이 깨어 보면 켜져 있다',
      '발자국이 눈밭 한가운데서 갑자기 끊겨 있다',
      '가스레인지가 저 혼자 켜졌다 꺼진다',
      '아이의 그림에 본 적 없는 다섯 번째 가족이 그려진다',
      '벽 너머 옆집에서 이사 온 적 없는데 가구 끄는 소리가 난다',
      '복도 끝 액자 속 인물이 매번 조금씩 이쪽을 본다',
      '전등을 끄면 1초쯤 늦게 다른 방의 불이 함께 꺼진다',
      '냉장고 자석이 매일 밤 같은 글자로 재배열돼 있다',
      '잠긴 방 안에서 아주 작게 라디오 소리가 새어 나온다',
    ],
  },
  {
    key: 'uncanny', label: '언캐니 디테일', icon: '🪞', desc: '두려운 낯섦 — 익숙한 것이 미세하게 잘못된 감각',
    faces: [
      '항상 같은 자리에 같은 자세로 서 있는 낡은 인형',
      '눈을 마주칠 때마다 천천히 고개를 돌리는 초상화',
      '표정이 전혀 없는, 너무 똑같이 생긴 가족',
      '웃음소리만 남기고 사라지는 보이지 않는 아이',
      '반쯤 열린 문틈으로 비치는 한쪽 눈',
      '벽에 박힌 못만큼 길게 늘어나는 그림자',
      '말끝마다 0.5초씩 늦게 따라 하는 메아리',
      '온기 하나 없이 차갑게 식어 가는 방 안 공기',
      '거울 속의 내가 나보다 한 박자 늦게 움직인다',
      '발끝만 보이는, 커튼 아래 누군가의 두 발',
      '아무것도 없는데 자꾸 삐걱이는 흔들의자',
      '눈동자가 없는, 미소만 그려진 가족의 사진',
      '문을 등지면 등 뒤에서 옷자락 스치는 소리',
      '먼지 한 톨 없이 깨끗한, 오래 비운 방',
      '잠든 척하지만 숨소리가 들리지 않는 옆자리',
      '창밖에서 안을 들여다보는, 얼굴 없는 실루엣',
      '아이 키 높이에서 들려오는 또렷한 노랫소리',
      '체온이 느껴지는데 거울에 비치지 않는 손',
      '벽시계의 똑딱임에 한 박자씩 끼어드는 다른 소리',
      '눈을 깜빡일 때마다 한 발씩 가까워지는 형체',
      '집 안 어디서나 똑같은 거리에서 들리는 발소리',
      '향을 피운 적 없는데 코끝에 감도는 향내',
      '천장 모서리에 거꾸로 매달려 미소 짓는 무언가',
      '아무도 앉지 않았는데 움푹 꺼진 소파 자국',
      '내 글씨가 아닌데 내 일기에 적혀 있는 한 줄',
      '문을 두드리는 소리가 안쪽에서 들려온다',
      '눈이 마주치자 입꼬리만 천천히 올라가는 사람',
      '거울 속 방에는 있는데 실제 방에는 없는 의자',
      '내 그림자가 나와 다른 방향으로 움직인다',
      '대화 중 단 한 번도 눈을 깜빡이지 않는 상대',
      '전화기 너머에서 똑같이 숨을 멈추고 듣고 있는 누군가',
      '가족인데 어딘가 비율이 미세하게 어긋난 얼굴',
      '내 발자국 옆에 나란히 찍히는, 맨발의 또 다른 발자국',
    ],
  },
  {
    key: 'lurker', label: '도사린 존재', icon: '👁️', desc: '무엇이 — 끝까지 다 보여 주지 않는 위협(off-screen)',
    faces: [
      '복도 끝 어둠 속에서 이쪽을 보는 두 개의 눈',
      '물에 젖은 긴 머리로 천천히 다가오는 원혼',
      '비디오를 본 지 이레째 나타난다는 저주의 존재',
      '집 자체가 적의를 품은, 살아 있는 듯한 건물',
      '벽과 천장을 거미처럼 기어 다니는 형체',
      '죽은 가족의 얼굴을 흉내 내는 무언가',
      '인간의 이해를 넘어선, 보면 미쳐 버리는 존재',
      '마을 사람들이 대대로 섬겨 온 숲의 옛 신',
      '제 몸을 숙주 삼아 자라나는 기생 생명',
      '거울 속에서만 사는, 이쪽으로 건너오려는 그림자',
      '이름을 부르면 다가오는, 부르지 말아야 할 것',
      '아이의 모습으로 신뢰를 얻으려는 가짜',
      '문틈·환풍구로만 존재를 드러내는 보이지 않는 것',
      '죽은 자들을 되살려 마을을 채워 가는 역병',
      '가면을 쓴 채 한 명씩 지워 가는 침묵의 살인마',
      '저주를 다음 사람에게 옮겨야 사는 전염성 망령',
      '꿈속에서만 사냥하는, 잠들면 안 되는 존재',
      '인형 속에 깃들어 밤마다 자리를 옮기는 영',
      '몸을 빌려 안에서부터 사람을 바꿔 버리는 빙의체',
      '같은 얼굴로 가족 사이에 슬그머니 끼어든 도플갱어',
      '땅 밑에서 들숨처럼 사람을 끌어당기는 무언가',
      '울음소리로 길 잃은 자를 유인하는 늪의 것',
      '한 번 들으면 머릿속을 떠나지 않는 노래의 주인',
      '폐가에 봉인됐다가 풀려난 옛 집주인의 원혼',
      '거울·사진·물 같은 반사면에만 비치는 추적자',
      '교단이 강림을 준비 중인, 계약을 원하는 악마',
      '몸의 형태를 흉내 내지만 관절이 어긋난 모방체',
      '한 사람을 정해 천천히 다가오는 카운트다운의 저주',
      '말 없는 아이의 입을 빌려 속삭이는 옛것',
      '눈을 떼는 순간에만 움직이는 석상 같은 존재',
      '집 안의 모든 그림자를 제 것으로 삼는 어둠',
      '안개 속에서 사람 수를 하나씩 줄여 가는 형체',
      '죽은 줄 알았으나 벽 안에서 살아 있던 그 무엇',
    ],
  },
  {
    key: 'rule', label: '규칙·금기', icon: '🚫', desc: '작동 법칙 — 어기면 처벌받는 저주·괴물의 룰',
    faces: [
      '밤 12시 이후엔 절대 거울을 보지 말 것',
      '이름을 세 번 부르면 그것이 대답한다',
      '복도의 불은 무슨 일이 있어도 끄지 말 것',
      '비디오를 본 자는 이레 안에 다음 사람에게 보여야 한다',
      '문 두드리는 소리에 절대 대답하지 말 것',
      '지하실 문은 어떤 경우에도 열지 말 것',
      '밤사이 들리는 목소리에 이름을 답하지 말 것',
      '해가 진 뒤엔 결코 집 밖으로 나가지 말 것',
      '계단을 오를 땐 절대 뒤를 돌아보지 말 것',
      '창밖의 무언가와 눈을 마주치지 말 것',
      '잠들기 전 반드시 소금으로 문지방을 막을 것',
      '식탁의 빈자리 한 곳엔 꼭 음식을 차려 둘 것',
      '13번째 계단은 절대 밟지 말 것',
      '밤에 자기 이름을 부르는 소리엔 답하지 말 것',
      '거울을 천으로 덮기 전엔 잠들지 말 것',
      '마을의 축제 날엔 절대 집 밖을 보지 말 것',
      '그것의 모습을 똑바로 쳐다보지 말 것',
      '한 번 들어온 것에게는 이름을 묻지 말 것',
      '새벽 3시엔 무슨 소리가 나도 깨지 말 것',
      '집 안의 시계를 멈추거나 맞추려 하지 말 것',
      '잠긴 방에서 나는 소리는 못 들은 척할 것',
      '그것이 부탁하는 일은 한 가지도 들어주지 말 것',
      '죽은 이의 이름은 이 집 안에서 입에 올리지 말 것',
      '촛불이 꺼지기 전에 기도를 끝내야 한다',
      '거울 두 개를 마주 보게 두지 말 것',
      '밤에 누가 등을 두드려도 돌아보지 말 것',
      '울음소리를 따라 숲으로 들어가지 말 것',
      '그것과 눈을 떼는 순간 끝이니 깜빡이지 말 것',
      '집 안에서는 절대 그것의 흉내를 내지 말 것',
      '문지방을 넘기 전 반드시 허락을 받을 것',
      '해 뜨기 전까지는 무슨 일이 있어도 버틸 것',
      '한 명이라도 규칙을 어기면 모두의 차례가 온다',
      '저주는 받은 자가 죽으면 가장 가까운 이에게 옮겨 간다',
    ],
  },
  {
    key: 'turn', label: '전환·스케어', icon: '🔪', desc: '사건 — 드레드를 깨는 충격·잘못된 안도·여운',
    faces: [
      '위협인 줄 알았던 게 고양이였다 — 안도한 순간, 등 뒤에서',
      '도망쳐 잠근 문 안쪽에 이미 그것이 서 있었다',
      '"이제 끝났어" 하고 돌아서자 어깨에 손이 얹힌다',
      '구해 주러 온 줄 알았던 사람이 진짜 가해자였다',
      '거울 속의 내가 나보다 먼저 웃기 시작한다',
      '핸드폰 플래시에 잡힌 건 사람 키만 한 형체였다',
      '잠긴 줄 알았던 지하실 문이 안에서부터 열린다',
      '믿었던 가족이 사실은 그것이 흉내 낸 가짜였다',
      '아이가 "엄마는 어젯밤에 돌아가셨잖아"라고 말한다',
      '전화기 너머에서 들린 건 내 등 뒤의 숨소리였다',
      '발자국을 따라가니 결국 내 방 침대 밑이었다',
      '모두 잠든 줄 알았는데 모두가 같은 곳을 보고 있었다',
      '규칙을 단 하나 어겼을 뿐인데 차례가 시작된다',
      '죽은 친구의 번호로 "지금 네 뒤에 있어"가 온다',
      '거울을 덮은 천이 안에서부터 부풀어 오른다',
      '안전한 줄 알았던 마지막 방의 천장이 내려다본다',
      '구조대가 켠 손전등에 벽을 가득 메운 손자국이 드러난다',
      '내 손이 내 의지와 상관없이 문을 열기 시작한다',
      '"다 끝났다"는 자막 뒤, 마지막 컷에서 알이 꿈틀한다',
      '저주를 옮기는 데 성공했지만 옮긴 상대가 가족이었다',
      '간신히 빠져나왔으나 차 백미러에 그것이 앉아 있다',
      '잘려 나간 줄 알았던 손이 어둠 속에서 꿈틀거린다',
      '"날 좀 믿어 줘" 하던 동료가 천천히 미소만 짓는다',
      '비명을 지르려는데 입에서 다른 목소리가 나온다',
      '벽시계가 12시를 치자 모든 문이 동시에 잠긴다',
      '살아남은 줄 알았는데 거울 속 내가 손을 흔든다',
      '경고하던 노인이 사실은 그것을 부르는 사제였다',
      '병원에서 깨어 보니 모든 게 같은 날, 같은 시각이다',
      '마지막 생존자의 그림자가 발밑에서 천천히 일어선다',
      '눈을 뜨자 천장 가득 거꾸로 매달린 얼굴들이 웃는다',
      '문 두드리는 소리에 대답하지 않자, 손잡이가 돌아간다',
      '도와달라던 목소리가 내 목소리와 똑같았다',
      '집을 떠난 뒤에도 매일 같은 시각, 그 발소리가 들려온다',
    ],
  },
]

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

// 큰 수 표기(한국 단위: 조/억/만). 조합 1조 이상을 강조.
function fmtBig(n: number): string {
  const ko = n.toLocaleString('ko-KR')
  const jo = 1_0000_0000_0000
  const eok = 1_0000_0000
  const man = 1_0000
  let unit = ''
  if (n >= jo) unit = `약 ${(n / jo).toFixed(2)}조`
  else if (n >= eok) unit = `약 ${(n / eok).toFixed(1)}억`
  else if (n >= man) unit = `약 ${Math.round(n / man)}만`
  return unit ? `${ko} (${unit})` : ko
}

// 활성 슬롯들의 조합 가짓수.
function comboCount(activeKeys: string[]): number {
  return activeKeys.reduce((acc, k) => {
    const s = SLOTS.find((x) => x.key === k)
    return acc * (s ? s.faces.length : 1)
  }, 1)
}

// 굴린 결과들을 자연스러운 호러 장면 전개 단락으로 엮는다(드레드 → 스케어 → 여운).
function compose(by: Record<string, string>): string {
  const { place, when, who, crack, uncanny, lurker, rule, turn } = by
  const parts: string[] = []
  // 1) 공간 + 때(고립·드레드의 무대)
  if (place && when) parts.push(`${when}, ${place}`)
  else if (place) parts.push(place)
  else if (when) parts.push(`${when}, 모든 것이 시작된다`)
  // 2) 시점 인물(취약성)
  if (who) parts.push(`그곳에 ${who}이(가) 있다`)
  // 3) 첫 징후(균열)
  if (crack) parts.push(`처음엔 사소했다 — ${crack}`)
  // 4) 언캐니 디테일(두려운 낯섦)
  if (uncanny) parts.push(`그리고 자꾸 눈에 밟히는 것: ${uncanny}`)
  // 5) 도사린 존재(off-screen)
  if (lurker) parts.push(`그 어긋남의 정체는 — ${lurker}`)
  // 6) 규칙·금기
  if (rule) parts.push(`살아남는 법은 단 하나, “${rule}.”`)
  // 7) 전환·스케어·여운
  if (turn) parts.push(`그러나 — ${turn}`)
  if (!parts.length) return ''
  return parts.map((p) => p.replace(/[.。]$/, '')).join('. ') + '.'
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface Saved { id: string; text: string; note: string; slots: string; rows: string; place: string; mood: string }

export default function HorrorSceneForge({ payload }: { payload?: Record<string, unknown> }) {
  // 활성 슬롯(기본 전부) — 저장/복원
  const [active, setActive] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':active')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length) {
          const valid = arr.filter((k: string) => SLOTS.some((s) => s.key === k))
          if (valid.length) return SLOTS.filter((s) => valid.includes(s.key)).map((s) => s.key)
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
            place: typeof s.place === 'string' ? s.place : '',
            mood: typeof s.mood === 'string' ? s.mood : '',
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
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 340)
    return () => window.clearTimeout(t)
  }, [rolling])

  // 복사/토스트 피드백 정리(언마운트 포함)
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
        if (prev.length <= 1) return prev // 최소 1개
        return prev.filter((k) => k !== key)
      }
      return SLOTS.filter((s) => prev.includes(s.key) || s.key === key).map((s) => s.key)
    })
  }

  const allOn = () => setActive(SLOTS.map((s) => s.key))

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
  const titleFor = (txt: string) => {
    const where = byKey.place ? byKey.place.replace(/^.*?,\s*/, '') : ''
    const head = where ? where : txt.slice(0, 18)
    return `🕯️ ${head}${head.length >= 18 ? '…' : ''}`
  }

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
        place: byKey.place || '',
        mood: byKey.lurker || '',
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

  // 프로젝트 본문(HTML) — 완성 장면 + 슬롯별 분해.
  const bodyHtmlFor = (text: string, rows: string, slots: string) => {
    const rowLines = rows
      ? rows.split('\n').filter(Boolean).map((ln) => `<p>${escHtml(ln)}</p>`).join('')
      : ''
    return [
      `<p style="font-size:15px;line-height:1.85;"><b>${escHtml(text)}</b></p>`,
      `<hr/>`,
      slots ? `<p><b>슬롯 조합:</b> ${escHtml(slots)}</p>` : '',
      rowLines,
    ].join('')
  }

  // 프로젝트 연동 — 현재 장면을 원고(draft)/'장면' 폴더에 문서로 추가.
  const addStoryToProject = () => {
    if (!hasResults) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'draft',
      folder: '장면',
      title: titleFor(story),
      bodyHtml: bodyHtmlFor(story, rowsText(), slotLabelLine),
      synopsis: story,
      icon: '🕯️',
      meta: {
        공간: byKey.place || '—',
        때: byKey.when || '—',
        존재: byKey.lurker || '—',
        규칙: byKey.rule || '—',
        장르: '호러·공포',
      },
    })
    setToast(id ? '프로젝트 원고 〈장면〉 폴더에 장면을 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 스니펫 저장 — 글감 라이브러리에 장면을 스니펫으로 추가(여러 도구가 공유).
  const saveSnippet = (text: string, slots: string) => {
    if (!text) return
    addToLibrary('snippets', {
      text: `[호러 장면] ${text}`,
      source: '호러 장면 대장간',
      tags: ['글감', '장면', '호러·공포', ...slots.split('·').filter(Boolean)],
    })
    setToast('스니펫 라이브러리에 저장했습니다.')
  }

  // 장소 저장 — 공포 공간을 배경 라이브러리에 저장.
  const savePlace = () => {
    if (!byKey.place) { setToast('공간 슬롯을 먼저 굴려주세요.'); return }
    // 받는 허브(배경 설정집)의 기본 칸에 제자리로 들어가도록 정규(장소) 키로 매핑한 fields 동봉.
    const placeFields: Record<string, string> = {}
    placeFields.name = byKey.place                                  // 공간 → name
    placeFields.kind = '호러 공간'                                  // 종류/유형 → kind
    if (byKey.when) placeFields.atmosphere = byKey.when             // 때·날씨(분위기) → atmosphere
    if (byKey.uncanny) placeFields.sensory = byKey.uncanny          // 언캐니/감각 → sensory
    if (byKey.rule) placeFields.rules = byKey.rule                  // 규칙·금기 → rules
    if (byKey.lurker) placeFields.dangers = byKey.lurker            // 도사린 존재(위협) → dangers
    if (byKey.crack) placeFields.secrets = byKey.crack             // 첫 징후(숨겨진 어긋남) → secrets
    if (story) placeFields.notes = story                            // 장면 전개 → notes
    addToLibrary('places', {
      name: byKey.place,
      kind: '호러 공간',
      mood: byKey.uncanny || byKey.when || '',
      rules: byKey.rule || '',
      sensory: byKey.uncanny || '',
      notes: story,
      fields: placeFields,
      source: '호러 장면 대장간',
    })
    setToast('배경 라이브러리에 공포 공간을 저장했습니다.')
  }

  // 보관 항목 하나를 프로젝트에 추가
  const addSavedToProject = (s: Saved) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '장면',
      title: titleFor(s.text),
      bodyHtml: bodyHtmlFor(s.text, s.rows, s.slots) + (s.note ? `<p style="color:#888;">📝 ${escHtml(s.note)}</p>` : ''),
      synopsis: s.text,
      icon: '🕯️',
      meta: { 장르: '호러·공포' },
    })
    setToast(id ? '프로젝트 〈장면〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const cardBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>공간·때·인물·징후·언캐니·존재·규칙·전환</b> 여덟 슬롯을 골라 굴리면, 호러 한 장면이 되도록 <b>드레드 → 스케어 → 여운</b> 순서로 엮어 줍니다. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴리세요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'}
          style={{ borderColor: tab === 'forge' ? 'var(--accent)' : 'var(--border)', color: tab === 'forge' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🕯️"/> 생성
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
            {active.length < SLOTS.length && (
              <button className="minibtn" onClick={allOn} title="모든 슬롯 켜기" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                ⊕ 전체
              </button>
            )}
          </div>

          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmtBig(combos)}</b>가지
            {combos >= 1_0000_0000_0000 ? <> — 1조 이상 <Emoji e="🔥"/></> : combos >= 1_0000_0000 ? ' — 1억 이상' : ''}
          </div>

          {/* 슬롯별 굴림 결과 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
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
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{slot.label} <span style={{ opacity: 0.7 }}>· {slot.faces.length}종</span></div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.45, color: face ? 'var(--text)' : 'var(--muted)' }}>
                      {face ? (rolling && !isLocked ? '…' : face) : '— 굴려주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => toggleLock(k)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 완성 장면 전개 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🕯️"/> 장면 전개</div>
            <div style={{ fontSize: 14, lineHeight: 1.75, color: hasResults ? 'var(--text)' : 'var(--muted)' }}>
              {story || '슬롯을 골라 굴리면, 한 편의 호러 장면이 만들어집니다.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 130 }} onClick={forge}><Emoji e="🕯️"/> 생성 / 다시 굴리기</button>
            <button className="minibtn" onClick={() => copy('story', `${story}\n\n${rowsText()}`)} disabled={!hasResults}>
              {copiedKey === 'story' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={saveCurrent} disabled={!hasResults}><Emoji e="⭐"/> 보관</button>
            <button className="minibtn" onClick={() => saveSnippet(story, slotLabelLine)} disabled={!hasResults} title="글감 스니펫 라이브러리에 저장"><Emoji e="✂️"/> 스니펫</button>
          </div>

          {/* 프로젝트·관련 도구 연계 */}
          <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
            <button className="linkbtn" onClick={addStoryToProject} disabled={!hasResults || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !hasResults ? '먼저 장면을 굴려주세요' : '현재 장면을 프로젝트 원고 〈장면〉 폴더에 문서로 추가'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={savePlace} disabled={!byKey.place} title="공포 공간을 배경 라이브러리에 저장"><Emoji e="🏚️"/> 공간 저장</button>
            <button className="linkbtn" onClick={() => openToolLinked('scene-list')} title="장면 목록 열기"><Emoji e="🎬"/> 장면 목록</button>
            <button className="linkbtn" onClick={() => openToolLinked('sensory-palette')} title="감각 팔레트 열기"><Emoji e="🌫"/> 감각 팔레트</button>
            <button className="linkbtn" onClick={() => openToolLinked('setting-bible')} title="배경 설정집 열기"><Emoji e="🏞"/> 배경 설정집</button>
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐"/></div>
              보관한 장면이 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성 탭에서 <Emoji e="⭐"/> 보관을 눌러 마음에 드는 호러 장면을 모아보세요.</span>
            </div>
          )}
          {saved.map((s, i) => {
            const k = 'sv' + s.id
            return (
              <div key={s.id} style={cardBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {s.slots && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px' }}>{s.slots}</span>}
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                  <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">▼</button>
                  <button className="minibtn" onClick={() => copy(k, s.text + (s.rows ? `\n\n${s.rows}` : '') + (s.note ? `\n📝 ${s.note}` : ''))} title="복사">
                    {copiedKey === k ? '✓' : <Emoji e="📋"/>}
                  </button>
                  <button className="minibtn" onClick={() => saveSnippet(s.text, s.slots)} title="스니펫 라이브러리에 저장"><Emoji e="✂️"/></button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑"/></button>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.7 }}>{s.text}</div>
                {s.rows && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{s.rows}</div>
                )}
                <textarea
                  value={s.note}
                  onChange={(e) => setNote(s.id, e.target.value)}
                  placeholder="이 장면을 어느 챕터·국면에 쓸지 메모…"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
                <div className="linkbar">
                  <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
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

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>
        장면 전개는 출발점일 뿐입니다. 공포는 사건이 아니라 <b>기다림</b>이라는 걸 기억하세요 — 징후·언캐니로 드레드를 길게 끌고, 존재는 <b>끝까지 다 보여 주지 말 것</b>(off-screen). 규칙을 심었다면 클라이맥스에서 그 위반·역이용으로 회수하세요.
      </div>
    </div>
  )
}
