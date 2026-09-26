// 호러·공포 트로프·관습 체크리스트 — 공포 장르의 독자 기대(장르 계약)·필수 구조 요소·하위장르별 핵심 장치·
//   흔한 함정·클리셰(+비틀기 제안)를 카테고리별 체크리스트로 점검한다. 클리셰는 "비틀기" 한 줄을 함께 제공.
//   체크/펼침/검색/무작위 한 줌/사용자 항목 추가·수정·삭제 + 카테고리별·전체 진행률.
//   조합수: 켜진 "장치(device)" 항목들로 만들 수 있는 공포 장치 조합(부분집합) 수 = 2^N - 1 → 사실상 무한대에 가까운 변주.
// 자급식: react 와 './linkbus' 외 import 없음. 전부 로컬 자작 데이터(호러 특화). localStorage 'sry:tool:horror-tropes'.
// 연계(linkbus): 체크한 셋을 프로젝트 '기획' 폴더 문서로 추가, 글감을 스니펫 라이브러리에 저장, 관련 도구 열기.
import { useState, useEffect, useRef } from 'react'
import {
  addToProject, hasProjectBridge,
  addToLibrary,
  openToolLinked,
  Emoji,
} from './linkbus'

export const meta = { id: 'horror-tropes', name: '호러 트로프·관습 체크', icon: '🕯️', group: '구상·정리', genre: '호러·공포', intro: '공포 독자 기대·필수 요소·하위장르 장치·흔한 함정(클리셰 비틀기)을 체크리스트로 점검하세요', w: 680, h: 660 }

const LS_KEY = 'sry:tool:horror-tropes'

// ── 조사 헬퍼: 앞 글자(마지막 음절) 받침을 보고 실제 조사 하나만 골라 출력 ("을(를)" 이중표기 금지) ──
const hasJong = (w: string): boolean => {
  if (!w) return false
  const code = w.charCodeAt(w.length - 1)
  if (code < 0xac00 || code > 0xd7a3) return false // 한글 음절이 아니면 받침 없음 취급
  return (code - 0xac00) % 28 !== 0
}
const eul = (w: string) => w + (hasJong(w) ? '을' : '를') // 을/를
const eun = (w: string) => w + (hasJong(w) ? '은' : '는') // 은/는
const iga = (w: string) => w + (hasJong(w) ? '이' : '가') // 이/가
const euro = (w: string) => {                              // 으로/로 (받침 ㄹ이면 '로')
  if (!w) return w
  const code = w.charCodeAt(w.length - 1)
  if (code < 0xac00 || code > 0xd7a3) return w + '로'
  const jong = (code - 0xac00) % 28
  return w + (jong === 0 || jong === 8 ? '로' : '으로')
}

// ───────── 공포 로그라인(한 줄 프롬프트) 생성기 — 곱집합 슬롯 ─────────
// 6개 독립 슬롯의 곱집합으로 한 줄 공포 로그라인을 만든다. 각 슬롯은 문법역할이 고정되어 어떤 조합으로
// 섞여도 의미가 성립한다(슬롯 독립성). 명사 자리엔 명사구, 종결 자리엔 종결문만 둔다.
//  PLACE  공간(명사구) — '~에서' 의 무대. 다른 슬롯을 전제하지 않음.
//  WHO    취약한 인물(명사구) — 주어. 직업·관계만 담아 위협과 독립.
//  THREAT 위협(명사구) — '~을/를 맞닥뜨린다' 의 목적어. 하위장르 무관하게 명사로만.
//  RULE   괴물의 규칙(독립 종결문) — 그 자체로 완결되는 금기/조건 문장.
//  DEVICE dread 장치(부사구) — '~며/면서' 로 본문에 붙는 수식. 어떤 위협에도 성립.
//  ENDING 결말(종결문) — 마지막 매듭. 특정 위협을 지명하지 않아 독립.
const PLACE: string[] = [
  '폭설에 갇힌 외딴 산장', '안개 낀 등대지기의 숙소', '바다 한가운데 멈춘 폐선', '신호가 끊긴 심해 잠수정',
  '문 닫은 지 오래인 폐병원', '학생이 사라진 폐교 본관', '이사 온 새 집의 잠긴 지하실', '천장이 낮은 옛 저택의 다락',
  '마른 우물이 있는 시골 마당', '외부인을 꺼리는 고립된 산촌', '돌아갈 배가 끊긴 외딴 섬', '입구가 무너진 폐광 갱도',
  '눈보라에 고립된 산속 휴게소', '정전이 잦은 낡은 아파트', '손님이 끊긴 변두리 모텔', '간판만 남은 폐쇄된 놀이공원',
  '관리인이 떠난 산정 천문대', '터널 공사가 멈춘 산허리', '물이 빠진 댐 바닥의 수몰 마을', '안개가 걷히지 않는 늪지 별장',
  '예배가 끊긴 산속 수도원', '환자가 없는 야간 응급실', '마지막 열차가 떠난 종착역', '폐쇄된 지하 방공호',
  '눈 덮인 연구 기지', '항로를 벗어난 화물선', '전파가 닿지 않는 자작나무 숲', '인적 끊긴 고속도로 휴게소',
  '문을 잠근 새벽의 도서관 서고', '관객이 빠져나간 심야 극장', '불 꺼진 백화점 지하 주차장', '회진이 멈춘 정신병동',
  '연기가 멎은 옛 도자기 가마', '물레방아가 멈춘 외딴 방앗간', '종이 멎은 산비탈 성당', '폐쇄된 해저 케이블 관제실',
  '폭우에 물든 강가의 외딴 펜션', '버려진 군부대 막사', '입주가 멈춘 미분양 신축 단지', '운행이 끊긴 케이블카 정상역',
  '얼어붙은 호숫가 별장', '인부가 떠난 채석장 사무소', '환풍이 멈춘 지하 벙커', '오래 비어 있던 종갓집 사랑채',
  '눈사태로 길이 막힌 스키 산장', '관제탑이 침묵한 폐공항',
]
const WHO: string[] = [
  '빚에 쫓겨 이곳을 택한 신혼부부', '취재차 홀로 들어온 르포 기자', '계약직으로 부임한 야간 경비원', '실종된 동생을 찾아온 누나',
  '부임 첫날의 젊은 보건교사', '졸업을 앞둔 사범대 실습생', '은퇴를 미룬 노년의 등대지기', '진료 기록을 뒤지던 인턴 의사',
  '유산을 상속받은 외아들', '논문 자료를 모으던 민속학 대학원생', '귀촌을 결심한 도시 부부', '대피해 온 등산객 일행',
  '인수인계도 없이 떠밀린 신입 사회복지사', '복역을 마치고 돌아온 옛 주민', '폐허를 촬영하던 사진작가', '미제 사건을 쫓는 퇴직 형사',
  '교환학생으로 머무는 유학생', '요양 차 내려온 시한부 화가', '대를 이으러 온 젊은 종손', '소문을 확인하러 온 유튜버',
  '구조 신호를 받고 출동한 응급 구조대원', '재개발을 조사하던 시청 공무원', '실습 나온 간호대 학생', '입양아를 데려온 부부',
  '단기 알바로 들어온 대학생', '연구비를 따낸 젊은 생물학자', '부모를 여읜 두 남매', '취직 면접을 보러 온 청년',
  '복원 작업을 맡은 문화재 전문가', '하룻밤 묵어가려던 배낭여행객', '전근 발령을 받은 시골 순경', '제대를 앞둔 말년 병장',
  '치매 어머니를 모시고 온 딸', '잠적한 아버지를 찾는 청소년', '계약을 앞둔 부동산 중개인', '폐업 정리를 맡은 청소 용역',
  '귀신 들렸다는 환자를 맡은 신부', '시신을 수습하러 온 장의사', '난파에서 살아남은 선원', '취재원을 만나러 온 다큐 PD',
  '학자금을 벌러 온 고학생', '낯선 곳에 부임한 젊은 목사', '교생 실습을 나온 예비 교사', '유물을 발굴하던 고고학도',
  '소집에 응한 예비군', '치료를 미뤄온 외래 환자',
]
const THREAT: string[] = [
  '눈 없이 웃는 가족의 얼굴', '거울에만 비치는 또 다른 나', '한 맺힌 처녀귀신의 그림자', '문틈으로 새어 드는 검은 손',
  '벽 속에서 들리는 아이의 노래', '사진마다 늘어나는 낯선 인영', '밤마다 가까워지는 발소리', '천장을 기어 다니는 무언가',
  '피부 밑에서 자라는 이물', '눈을 마주치면 따라붙는 존재', '되감기는 똑같은 하루', '말을 따라 하는 빈방의 목소리',
  '제 발로 열리는 지하실 문', '머리카락이 자라는 낡은 인형', '물속에서 손짓하는 익사자', '주인 없는 한 켤레의 발자국',
  '이름을 부르면 돌아보는 그림자', '몸을 갈아입으려는 기생체', '산 자를 닮아 가는 시신', '잠들면 자리를 바꾸는 사물들',
  '문을 두드리고 사라지는 손님', '거꾸로 매달려 내려다보는 형체', '입을 맞추려 다가오는 죽은 연인', '핏빛으로 번지는 천장의 얼룩',
  '점점 닮아 가는 거리의 사람들', '숨소리만 남기고 사라진 동행', '벽지를 긁어 내리는 손톱 소리', '잠긴 방에서 새어 나오는 향내',
  '자정마다 멈추는 모든 시계', '눈동자가 따라 도는 초상화', '한 명씩 줄어드는 단체 사진', '제 목소리로 우는 라디오 잡음',
  '천천히 차오르는 정체 모를 물', '복도 끝에서 손짓하는 흰옷', '거울 너머로 넘어오려는 손', '얼굴이 지워진 옛 사진의 인물',
  '밤마다 자리를 옮기는 무덤', '살을 파고드는 검은 균사', '문장을 바꿔 쓰는 보이지 않는 손', '눈을 감으면 다가오는 숨결',
  '제 그림자에서 떨어져 나온 형상', '벽시계 뒤에서 새는 속삭임', '산 채로 묻힌 자의 손톱자국', '점점 무거워지는 등 뒤의 시선',
  '창밖에 떠 있는 창백한 얼굴', '식탁에 늘 한 명 더 차려진 자리',
]
const RULE: string[] = [
  '해가 지면 절대 거울을 봐서는 안 된다', '그 이름을 입에 올리면 곧장 찾아온다', '문을 세 번 두드려도 결코 열어선 안 된다',
  '밤 사이 들리는 부름에 답해서는 안 된다', '사진을 찍으면 한 사람씩 사라진다', '지하실의 불은 끝까지 꺼선 안 된다',
  '자정의 발소리를 헤아리면 멈추지 않는다', '뒤를 돌아보는 순간 따라붙는다', '울리는 전화를 받으면 차례가 넘어온다',
  '거울에 비친 자신과 눈을 맞춰선 안 된다', '집 안에서 그의 이야기를 꺼내선 안 된다', '잠들기 전 숫자를 세면 하나가 더 는다',
  '문지방을 밟고 들어오면 나갈 수 없다', '죽은 이의 물건을 만지면 빙의된다', '비명을 들어도 절대 내다봐선 안 된다',
  '약속한 제물을 거르면 대신 데려간다', '같은 길을 두 번 지나면 길을 잃는다', '불 꺼진 방에 혼자 남으면 늘어난다',
  '그의 눈을 똑바로 보면 표적이 된다', '한 번 들인 손님은 스스로 못 내보낸다', '시계가 멈추면 시간이 되돌아간다',
  '노랫소리를 따라 부르면 끌려간다', '밤마다 문 앞의 신발을 옮겨선 안 된다', '식탁의 빈자리를 채워선 안 된다',
  '벽의 긁는 소리에 대꾸하면 들어온다', '해 뜨기 전 밖으로 나가면 돌아오지 못한다', '거울을 천으로 덮지 않으면 빠져나온다',
  '울음소리에 이름을 물으면 따라온다', '꿈에서 본 문을 현실에서 열어선 안 된다', '제 그림자를 밟으면 자리를 빼앗긴다',
  '향이 다 타기 전에 자리를 떠선 안 된다', '편지를 읽으면 다음 사람에게 옮겨야 한다', '물에 비친 얼굴에 손을 대선 안 된다',
  '한밤의 노크에 숫자로 답하면 끝난다', '죽은 이의 자리에 앉으면 일어설 수 없다', '같은 꿈을 사흘 꾸면 데리러 온다',
  '문을 잠근 방에서 두 번 불리면 응한다', '거울 속에서 웃으면 자리가 바뀐다', '밤에 머리를 감으면 따라 들어온다',
  '계단 수를 세면 한 칸이 사라진다', '불씨가 꺼지면 그날 밤을 넘기지 못한다', '약속한 시각을 어기면 빚이 두 배가 된다',
  '잠긴 문 너머의 대답에 답례해선 안 된다', '죽은 이의 사진을 뒤집으면 깨어난다', '한밤중 흐르는 노래를 끄면 멈추지 않는다',
  '제 이름이 두 번 불리기 전에 자야 한다', '문틈으로 내미는 손을 잡으면 끌려간다', '벽 너머의 발소리에 박자를 맞추면 들어온다',
]
const DEVICE: string[] = [
  '발소리만 들릴 뿐 정작 형체는 보이지 않으며', '익숙한 집이 미세하게 어긋나 있다는 낯섦 속에서',
  '안심한 직후마다 진짜 공격이 닥쳐오며', '정체와 규칙이 한 방울씩만 새어 나오는 가운데',
  '남은 시간을 헤아리는 카운트다운에 쫓기며', '집 자체가 적의를 품은 듯 인물을 옥죄어 오고',
  '거울과 사진과 전화 같은 일상 사물을 통해 스며들며', '같은 하루가 되풀이되며 출구가 닫혀 가고',
  '제 몸을 마음대로 못 한다는 감각이 번지는 사이', '저주가 사람에서 사람으로 옮겨 가는 규칙 속에서',
  '믿었던 화자의 말마저 의심스러워지는 가운데', '아무도 그 말을 믿어 주지 않는 고립 속에서',
  '정적이 길어질수록 불안이 차오르고', '냄새가 형체보다 먼저 위협을 알려 오며',
  '어둠 속 두 눈만이 이쪽을 응시하는 가운데', '문틈과 반사면으로 시선이 새어 드는 사이',
  '합리적 설명이 하나씩 무너져 내리고', '안전해야 할 공간이 차례로 침범당하며',
  '바깥과의 연락이 완전히 끊긴 채', '기억이 조금씩 지워지는 줄도 모른 채',
  '온도가 한 칸씩 떨어지며 소름이 돋고', '그림자가 제 주인보다 한 박자 늦게 움직이며',
  '벽 너머의 인기척이 점점 가까워지는 가운데', '한 명씩 자취를 감추는 줄도 모른 채',
  '꿈과 현실의 경계가 흐려지는 사이', '사물들이 밤마다 제자리를 바꾸어 놓으며',
  '낮의 멀쩡함과 밤의 이상함이 번갈아 들이닥치고', '구조의 희망이 매번 한 걸음씩 멀어지며',
  '들려오는 소리의 근원을 끝내 알 수 없는 채', '거울 속 풍경이 바깥과 어긋나기 시작하며',
  '잠들 때마다 자리가 바뀌어 있는 불안 속에서', '설명할수록 더 깊어지는 모순에 휘말리며',
  '낯선 이들이 점점 자신을 닮아 가는 가운데', '시계마다 가리키는 시각이 어긋나는 사이',
  '비명조차 누구의 것인지 분간되지 않으며', '돌아갈 길이 매번 다르게 뒤바뀌는 가운데',
  '숨소리 하나가 방 안에 더 늘어난 채', '오래된 기록이 스스로 문장을 바꾸어 가며',
  '믿을 수 있는 것이 하나씩 사라지는 사이', '등 뒤의 시선이 시시각각 무거워지며',
  '들이쉰 공기마저 비린내로 물들어 가고', '눈을 깜빡일 때마다 거리가 좁혀지는 가운데',
  '제 목소리가 낯설게 메아리쳐 돌아오며', '문이 잠긴 줄 알았던 방이 열려 있는 채',
  '밤이 깊을수록 규칙이 하나씩 늘어나며', '구원처럼 보이던 손길이 점점 수상해지는 사이',
]
const ENDING: string[] = [
  '살아남았으나 그날의 기억만은 끝내 돌아오지 않는다', '괴물은 봉인됐지만 누군가의 희생이 그 대가였다',
  '다 끝난 듯한 마지막 순간, 같은 불길함이 다시 시작된다', '진실이 밝혀지자 차라리 몰랐던 편이 나았음을 깨닫는다',
  '탈출에 성공했으나 저주는 이미 다른 이에게 옮겨 갔다', '문을 닫는 데는 성공했지만 안에 한 사람을 두고 와야 했다',
  '구원자라 믿었던 이가 실은 모든 일의 시작이었다', '겨우 빠져나왔지만 거울 속의 자신은 웃고 있다',
  '규칙을 역이용해 이겼으나 그 대가로 한쪽을 잃는다', '모든 게 환각이었다는 안도 끝에 한 가지가 어긋나 있다',
  '돌아온 일상 속에서 그것의 흔적이 조용히 자라난다', '마지막 생존자는 자신이 정말 살아 있는지 확신하지 못한다',
  '봉인은 임시였을 뿐, 약속한 시간이 다시 다가온다', '진실을 안 자만이 끝내 입을 다물 수밖에 없게 된다',
  '괴물을 물리쳤으나 그 자리를 자신이 대신 채우게 된다', '간신히 막아 냈지만 같은 일이 옆 마을에서 시작된다',
  '살아 돌아왔어도 더는 예전의 자신으로 돌아가지 못한다', '마지막 장면에서 사진 속 인원이 한 명 늘어나 있다',
  '탈출의 기쁨도 잠시, 따라 나온 발자국이 뒤에 찍혀 있다', '모두를 구했지만 그 기억은 누구의 것도 아니게 된다',
  '저주는 풀렸으나 그 빈자리에 더 오래된 무엇이 깃든다', '되돌아온 평온 속에서 시계만이 여전히 거꾸로 돈다',
  '끝내 정체는 밝혀지지 않은 채 사건만 조용히 묻힌다', '살아남은 자는 매일 밤 같은 꿈에서 깨어나길 반복한다',
  '봉인의 열쇠를 쥔 채 스스로 그 안에 갇히기를 택한다', '마지막 한 줄의 일기만이 그날의 진실을 증언한다',
  '구조됐지만 구조대의 명단에 없던 한 사람이 함께 돌아온다', '문을 잠그는 순간, 안쪽에서 똑같이 잠그는 소리가 들린다',
  '모든 것이 제자리로 돌아왔으나 그림자 하나가 늘어 있다', '겨우 잠재운 그것이 다음 세대의 이름을 이미 알고 있다',
  '진실을 기록한 자가 다음 희생자가 되어 사라진다', '집을 떠났지만 새 집의 지하에서 같은 소리가 들려온다',
  '의식을 끝낸 대가로 산 자와 죽은 자가 자리를 맞바꾼다', '마지막 통화가 끊긴 뒤에도 신호음만은 계속 이어진다',
  '괴물의 규칙을 깬 자가 새로운 규칙의 일부가 되어 버린다', '돌아온 가족 중 하나는 더 이상 그 사람이 아니다',
  '불을 끄는 순간, 어둠 속에서 누군가 대신 눈을 뜬다', '살아남은 둘 중 진짜는 하나뿐이었음을 끝에서 알게 된다',
  '봉인의 부적이 마르기 전에 다음 비가 내리기 시작한다', '마지막 페이지가 저절로 다음 이름을 적어 내려간다',
  '구원의 종이 울렸으나 그 소리에 깨어난 것은 따로 있었다', '집을 허물자 그 밑에서 더 깊은 문이 드러난다',
  '저주를 넘긴 상대가 다름 아닌 미래의 자신이었다', '눈을 떠 보니 처음의 그 방으로 다시 돌아와 있다',
  '모두 잠든 새벽, 식탁의 빈 의자만이 조용히 끌려 나온다', '이야기는 끝났지만 읽은 사람에게로 차례가 넘어온다',
]
// 곱집합 슬롯 정의(라벨·풀). 화면 조합수(COMBOS) 표시에 사용.
const LOGLINE_SLOTS: { label: string; pool: string[] }[] = [
  { label: '공간', pool: PLACE },
  { label: '인물', pool: WHO },
  { label: '위협', pool: THREAT },
  { label: '규칙', pool: RULE },
  { label: '장치', pool: DEVICE },
  { label: '결말', pool: ENDING },
]
// 곱집합 조합수 = 각 슬롯 풀 크기의 곱(고유 항목만)
const LOGLINE_COMBOS = LOGLINE_SLOTS.reduce((a, s) => a * s.pool.length, 1)
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
// 한 줄 공포 로그라인 — 조사는 받침에 맞춰 헬퍼로 출력. 모든 슬롯은 독립 성립.
function makeLogline(): string {
  const place = pick(PLACE), who = pick(WHO), threat = pick(THREAT)
  const rule = pick(RULE), device = pick(DEVICE), ending = pick(ENDING)
  return `${euro(place)}, ${iga(who)} ${eul(threat)} 맞닥뜨린다. ${rule}—${device}, 끝내 ${ending}.`
}
function koNum(n: number): string {
  const KO = [[1e16, '경'], [1e12, '조'], [1e8, '억'], [1e4, '만']] as const
  for (const [unit, name] of KO) {
    if (n >= unit) { const v = n / unit; return `약 ${v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(2)}${name}` }
  }
  return n.toLocaleString()
}

// ── 항목 종류 ──
// kind:'expect'  독자 기대/장르 계약 — 어기면 "안 무섭다"는 치명적 반응
// kind:'beat'    필수 구조 비트 — 공포의 5단 곡선 골격
// kind:'device'  공포 서사 장치 — 선택해 조합하는 자산(조합수 카운트 대상)
// kind:'trap'    흔한 함정/클리셰 — 'twist'(비틀기)와 함께 점검
type ItemKind = 'expect' | 'beat' | 'device' | 'trap'
interface BaseItem { text: string; tip?: string; twist?: string }
interface Cat {
  id: string
  name: string
  icon: string
  desc: string
  kind: ItemKind
  items: BaseItem[]
}

// ───────────────────── 호러·공포 특화 자작 데이터 ─────────────────────
const CATS: Cat[] = [
  // 1) 장르 계약 — 독자가 사전 합의한 약속
  {
    id: 'contract', name: '장르 계약 (독자와의 약속)', icon: '🤝', kind: 'expect',
    desc: '어기면 "하나도 안 무섭다 / 이게 호러냐"로 별점이 무너지는 핵심 약속들',
    items: [
      { text: '무섭다 — 긴장(dread)→충격(shock)→다시 긴장의 사이클을 반드시 돌린다', tip: '독자는 안전한 거리에서 공포를 소비하러 왔다. 끝까지 무섭지 않으면 장르 계약 위반.' },
      { text: '공포의 3층위(즉각 충격·지속 불안·사후 여운)를 모두 노린다', tip: '① 점프스케어/고어 ② 분위기의 dread ③ 책을 덮은 뒤의 존재론적 찝찝함. 셋 다 노려야 좋은 호러.' },
      { text: '취약하거나 고립된 인물에게 이입하게 만든다', tip: '"내가 저 상황이면"이 작동해야 공포가 산다. 무력감·고립감이 공포의 전제.' },
      { text: '괴물·저주에 작동 규칙이 있고, 위반에는 처벌이 따른다', tip: '"밤에 나온다", "이름을 부르면 안 된다", "보면 7일 후 죽는다". 규칙이 곧 게임이다.' },
      { text: '"초자연인가 정신병인가"의 불확실성을 가능한 길게 유지한다', tip: '정답을 빨리 주면 긴장이 죽는다. 모호함을 오래 끌수록 dread가 깊어진다.' },
      { text: '금기(죽음·시신·신체훼손·아이·집의 침범)를 의도적으로 건드린다', tip: '보편 금기를 건드릴 때 독자의 원초적 반응이 가장 강하다. 안전의 공간을 위협하라.' },
      { text: '약속한 결말의 결(퇴치의 후련함 vs 열린 찝찝함)을 지킨다', tip: '카타르시스형이냐 비카타르시스(열린 결말)형이냐를 정하고 톤을 일관되게.' },
      { text: '(웹소설) 초반 1~3화 안에 첫 공포 사건을 반드시 터뜨린다', tip: '연독률 = 초반의 첫 오싹함. 분위기만 깔다 끝나면 이탈한다.' },
      { text: '(웹소설) 매 화 끝을 작은 충격·불길한 암시(클리프행어)로 끊는다', tip: '스크롤 연출(여백·줄바꿈)로 점프스케어 타이밍을 제어하라.' },
    ],
  },

  // 2) 필수 구조 비트 — 공포의 5단 곡선
  {
    id: 'beats', name: '필수 구조 비트 (공포의 5단 곡선)', icon: '🎢', kind: 'beat',
    desc: '평범한 일상 → 첫 균열 → 상승 → 포위(고립 확정) → 대면/결말. 빠진 비트가 약한 고리',
    items: [
      { text: '일상(The Normal) — 평범한 세계를 충분히 보여 "잃을 것"을 만든다', tip: '인물·관계·공간을 정상 상태로 각인시켜야, 그것이 무너질 때 공포가 작동한다.' },
      { text: '첫 균열(The First Sign) — 설명 가능할 법한 작은 이상징후', tip: '우연·착각·소음 수준. 독자만 불안하고 인물은 아직 모른다.' },
      { text: '상승(Escalation) — 사건이 잦아지고 합리적 설명이 불가능해진다', tip: '인물이 조사를 시작하고 괴물의 규칙을 하나씩 발견한다.' },
      { text: '목격의 비대칭 — 주인공만 보고 아무도 안 믿어준다', tip: '"다들 날 미쳤다고 한다." 사회적 무력화로 고립을 심화시키는 필수 비트.' },
      { text: '포위(The Trap Closes) — 고립 확정·안전지대 붕괴·첫 사상자', tip: '통신 두절·정전·폭설. 도망갈 곳이 없어지고 진실(정체·기원)이 드러난다.' },
      { text: '대면(Confrontation) — off-screen으로 끌어온 존재를 (부분이라도) 드러낸다', tip: '클라이맥스의 정면 대결. 빌드업에서 심은 약점·규칙을 여기서 사용.' },
      { text: '최대 희생 — 클라이맥스 직전·도중 핵심 인물의 죽음으로 판돈을 올린다', tip: '"이번엔 진짜 죽을 수 있다"를 각인시키는 순간.' },
      { text: '결말 — 퇴치/탈출/패배/열린 결말 중 하나로 매듭짓는다', tip: '완전한 해피엔딩은 드물다. 살아남아도 대가(트라우마·상실)가 남는 게 정석.' },
      { text: '씨앗/여운 — 저주가 옮겨갔거나 생존 개체가 남았다는 마지막 불길함', tip: '속편 여지 + 존재론적 불안. 현대 호러가 선호하는 마무리.' },
    ],
  },

  // 3) 공포 서사 장치 — dread 엔진(조합 대상)
  {
    id: 'engine', name: '공포 서사 장치 (dread 엔진)', icon: '🧲', kind: 'device',
    desc: '공포를 만들고 유지하는 핵심 장치. 켜진 항목으로 공포 장치 조합을 만든다',
    items: [
      { text: '드레드(Dread)의 축적 — 사건보다 "곧 무언가 일어난다"는 기다림', tip: '공포 = 사건이 아니라 기다림. 정적·침묵·일상의 미세한 어긋남으로 쌓는다.' },
      { text: '언캐니(두려운 낯섦) — 익숙한 것이 미세하게 잘못된 상태', tip: '표정 없는 가족, 0.5초 늦는 미소, 늘 같은 자리의 인형. 프로이트적 공포의 핵심.' },
      { text: '보이지 않는 것의 공포(off-screen) — 괴물을 끝까지 안 보여주기', tip: '상상이 묘사보다 무섭다(러브크래프트 원칙). 발소리·그림자·문틈·반사면만.' },
      { text: '잘못된 안도(false scare) — 위협인 줄 알았는데 고양이 → 직후 진짜 공격', tip: '긴장-이완-급습의 기본 호흡. 안심시킨 직후가 가장 무섭다.' },
      { text: '잠긴 정보의 적하(滴下) — 정체·규칙·기원을 한 번에 풀지 않기', tip: '미스터리가 동력. 조금씩 흘려 독자가 직접 규칙을 맞추게 한다.' },
      { text: '카운트다운/타임리밋 — "7일 후", "해 뜨기 전", "13번째 종이 울리면"', tip: '시한이 긴장을 조인다. 남은 시간을 가시화하라.' },
      { text: '공간의 인격화 — 집·호텔·숲 자체가 적대적 의지를 가진다', tip: '오버룩 호텔·힐 하우스. 배경이 곧 적이 되는 순간.' },
      { text: '매체를 통한 침투 — 거울·사진·비디오·인형·전화·라디오 잡음', tip: '"안전한 일상 사물"을 위협 매개로. 익숙함이 배신될 때 오싹하다.' },
      { text: '시간·기억의 왜곡 — 루프·기억 삭제·흐르지 않는 시간', tip: '인지적 불안을 유발. 같은 일이 반복되면 독자도 같이 갇힌다.' },
      { text: '신체의 배신 — 감염·빙의·기생·변형으로 내 몸을 통제 못 함', tip: '바디 호러의 핵심. 자아 상실의 공포.' },
      { text: '저주·계약의 전염 구조 — 사람에서 사람으로 옮겨가는 룰', tip: '『링』의 복사 전파. "탈출구가 있는가"의 게임을 독자에게 던진다.' },
      { text: '신뢰할 수 없는 화자 — 미쳤는지·거짓말인지·이미 죽었는지 모르게', tip: '독자의 인식 토대 자체를 흔든다. 사이코로지컬 호러의 무기.' },
    ],
  },

  // 4) 하위장르 코드(조합 대상)
  {
    id: 'subgenre', name: '하위장르 코드 (결을 정한다)', icon: '🩸', kind: 'device',
    desc: '유령·오컬트·슬래셔·바디·포크·우주적·서바이벌… 작품의 결을 정하는 하위장르 장치',
    items: [
      { text: '(유령/고딕) 비극을 품은 귀신 들린 집 — 집의 역사가 곧 공포의 근원', tip: '과거의 살인·자살·매장. 셜리 잭슨 『힐 하우스』·전통 흉가물.' },
      { text: '(한국 원혼) 한(恨) 맺힌 처녀귀신·구미호 — 사연과 원한이 공포의 동력', tip: '『전설의 고향』 계보. 무서움 + 애처로움의 결합이 한국 괴담의 맛.' },
      { text: '(J-호러) 축축하고 끈질긴 원혼·기술 매체를 통한 저주 전파', tip: '『링』의 사다코·『주온』. 흑발·기어 오는 동작·정전기 노이즈.' },
      { text: '(악마/오컬트) 엑소시즘·사이비·흑마술·인신공양', tip: '향·촛농·라틴어 주문·성수. 신앙과 의식이 무대.' },
      { text: '(슬래셔) 가면 살인마 + 마지막 생존자(final girl)', tip: '죄지은 자부터 죽고, 순수·기지를 가진 자가 살아남는 도덕 구조.' },
      { text: '(바디 호러) 신체변형·감염·기생 — 불쾌의 미학', tip: '크로넨버그·이토 준지. 살이 뭉개지고 변형되는 생리적 혐오.' },
      { text: '(크리처/몬스터) 미지의 생물·괴수의 위협', tip: '서서히 정체를 드러내되 한 번에 다 보여주지 않는다.' },
      { text: '(포크 호러) 고립된 시골 공동체·이교 의식·"친절함이 더 무서운" 마을', tip: '『위커맨』·『미드소마』. 외부인을 적대하는 폐쇄 공동체.' },
      { text: '(우주적 공포) 인간의 이해를 넘는 존재 앞의 무력함', tip: '러브크래프트/크툴루. "알아버린 자"가 광기에 빠진다.' },
      { text: '(사이코로지컬) 내면의 붕괴·편집증·믿을 수 없는 화자', tip: '에드거 앨런 포 계보. 초자연인지 광기인지 끝까지 모호.' },
      { text: '(서바이벌/아포칼립스) 좀비·감염 종말물', tip: '리처드 매시슨 계보. 호러 + 생존 + 미스터리 혼합형(웹소설 흥행 공식).' },
      { text: '(도시괴담) 현대 도시 + 던전·게이트물 결합형', tip: '한국 웹소설 흥행 코드. 일상 공간에 침투하는 괴이 + 생존 게임.' },
    ],
  },

  // 5) 공간·배경 코드(조합 대상)
  {
    id: 'setting', name: '공간·배경 코드 (가장 중요)', icon: '🏚️', kind: 'device',
    desc: '호러에서 공간은 가장 강력한 장치. 고립과 침범이 핵심',
    items: [
      { text: '고립된 폐쇄공간 — 산장·외딴 저택·등대·우주선·잠수함·눈에 갇힌 호텔', tip: '탈출 불가가 핵심. 외부 도움을 물리적으로 차단한다.' },
      { text: '외딴 섬·지하벙커 — 돌아갈 길이 끊긴 무대', tip: '들어오긴 쉬워도 나가긴 불가능한 구조로 설계하라.' },
      { text: '안전해야 할 곳의 침범 — 내 집·아이 방·침실', tip: '가장 안전해야 할 공간이 위협받을 때 공포가 극대화된다.' },
      { text: '이사 온 새 집의 지하실·다락방·우물', tip: '"열지 말라"는 공간이 곧 금기. 호기심이 파멸로 이끈다.' },
      { text: '폐허·버려진 건물(폐병원·폐교·폐가)', tip: '과거의 비극이 남은 장소. 고딕 호러의 정전 무대.' },
      { text: '저주받은 마을 — 비밀스러운 풍습·외부인 적대', tip: '"이 마을엔 오면 안 됐어"라 경고하는 노인. 포크 호러의 무대.' },
      { text: '폭풍우·정전이 사건과 동시 발생하는 밤', tip: '통신 두절 + 어둠 + 고립을 한 번에 만드는 고전 장치.' },
      { text: '숲·산·동굴 — 길을 잃고 방향감각을 잃는 자연', tip: '문명에서 멀어질수록 규칙이 사라진다. 원초적 공포의 공간.' },
    ],
  },

  // 6) 감각·분위기 어휘(조합 대상)
  {
    id: 'sensory', name: '감각·분위기 어휘', icon: '👁️', kind: 'device',
    desc: '공포는 감각으로 쓴다. 청각·시각·체감·후각의 디테일을 골라 분위기를 빚어라',
    items: [
      { text: '(청각) 삐걱이는 마룻바닥·긁는 소리·발소리·숨소리', tip: '정적을 깨는 소리가 정적 자체보다 무섭다.' },
      { text: '(청각) 라디오 잡음·멀리서 들리는 노랫소리·웃음·속삭임', tip: '근원을 알 수 없는 소리. "어디서 나는 거지?"의 불안.' },
      { text: '(청각) 똑똑 문 두드림 — 그러나 아무도 없다', tip: '응답을 기대하게 만든 뒤 배신하는 고전 장치.' },
      { text: '(시각) 그림자·실루엣·깜빡이는 전등·반쯤 열린 문', tip: '명확히 보이지 않는 것이 공포의 핵심. 윤곽만 보여라.' },
      { text: '(시각) 거울 속의 무언가·창밖의 얼굴·어둠 속 두 눈', tip: '반사면·창·어둠은 "이쪽을 보는 시선"을 만든다.' },
      { text: '(체감) 등골이 서늘·소름·목덜미가 곤두서·공기가 차가워짐', tip: '"누군가 보고 있는 느낌"의 생리적 신호로 위협을 예고.' },
      { text: '(후각) 피비린내·썩은 내·흙냄새·곰팡이·축축한 냄새', tip: '냄새는 가장 원초적 경고. 보이기 전에 냄새로 먼저 침투시켜라.' },
      { text: '(후각) 향(線香)·촛농 냄새 — 오컬트·제의의 기척', tip: '의식의 공간임을 후각으로 암시한다.' },
    ],
  },

  // 7) 클라이맥스 코드(조합 대상)
  {
    id: 'climax', name: '클라이맥스 코드', icon: '🔥', kind: 'device',
    desc: '절정 = 숨겨둔 진실/괴물과의 정면 대면. 형태를 골라라',
    items: [
      { text: '규칙의 활용/역이용 — 빌드업의 약점(성수·소금·이름·불·해뜨기)을 사용', tip: '데우스 엑스 마키나가 되지 않게 미리 복선을 깔아둘 것.' },
      { text: 'final girl/생존자의 반격 — 가장 무력했던 인물의 수동→능동 전환', tip: '슬래셔의 정석. 도망만 치던 인물이 마침내 맞서 싸운다.' },
      { text: '거짓 승리 후 재공격 — 이긴 줄 알았는데 괴물이 다시 일어난다', tip: '마지막 점프스케어. "다 끝났다" 직후가 가장 위험하다.' },
      { text: '반전(twist) — 화자가 죽어 있었다·괴물이 주인공이었다·전부 환각', tip: '구원자가 진짜 적이었다 등. 인식의 토대를 뒤집는 한 방.' },
      { text: '대가·상처 — 살아남아도 정상으로 돌아오지 못한다', tip: '트라우마·신체손상·동료 상실. 완전한 해피엔딩은 호러에서 드물다.' },
      { text: '열린 결말 — 저주가 옮겨갔거나 알·전염자가 남았다는 암시', tip: '마지막 컷의 불길한 징조로 존재론적 불안을 남긴다.' },
      { text: '희생을 통한 봉인/퇴치 — 누군가의 죽음으로 막는다', tip: '승리에 무게를 주는 가장 확실한 방법. 판돈을 끝까지 올린다.' },
    ],
  },

  // 8) 흔한 함정/클리셰 — 비틀기 동반
  {
    id: 'traps', name: '흔한 함정 · 클리셰 (비틀기)', icon: '🪤', kind: 'trap',
    desc: '체크 = "내 글에 이 함정이 있나?" 점검. 각 항목엔 비틀기 한 줄을 제공',
    items: [
      { text: '점프스케어(고양이·갑자기 켜진 TV)에만 의존하는가?', tip: '값싼 깜짝 효과는 둔감화되고 사후 여운이 없다.', twist: 'jump scare는 양념일 뿐. 지속적 dread와 사후 여운(존재론적 불안)을 본진으로 삼아라.' },
      { text: '괴물을 너무 일찍·너무 자세히 다 보여주는가?', tip: '정체가 밝혀지는 순간 공포는 급격히 식는다.', twist: 'off-screen 원칙 — 그림자·발소리·일부만. 상상이 묘사를 이긴다. 전모는 클라이맥스까지 아껴라.' },
      { text: '"잠깐 나갔다 올게" 하고 혼자 떨어졌다가 죽는 전형인가?', tip: '예측 가능한 분리 = 긴장이 아니라 헛웃음.', twist: '관객이 예측하는 그 순간을 역이용하라 — 분리됐는데 정작 위험은 남은 무리 쪽에 있게.' },
      { text: '"안 터지는 휴대폰·고장난 차"를 변명 없이 남발하는가?', tip: '고립 장치가 작위적이면 몰입이 깨진다.', twist: '고립을 인물의 선택·세계관에서 끌어내라(통신을 끊는 이유, 도움을 못 청하는 사정).' },
      { text: '주인공이 사건에 끌려다니기만 하는 수동적 인물인가?', tip: '무력감은 좋지만 끝까지 수동이면 답답하다.', twist: '무력→조사→규칙 발견→반격의 곡선을 그려라. 마지막엔 스스로 결정을 내리게.' },
      { text: '캐릭터가 멍청한 선택(지하실로 혼자 내려가기)만 반복하는가?', tip: '"왜 저기로 가?" — 독자의 이입이 끊긴다.', twist: '비합리적 행동에 납득 가능한 동기를 줘라(아이가 거기 있다, 소리가 가족 목소리다).' },
      { text: '피·고어의 양으로만 공포를 만들려 하는가?', tip: '혐오(disgust)는 공포(terror)와 다르다. 고어만으론 무섭지 않다.', twist: '고어는 충격의 정점에만 아껴 쓰고, 평소엔 암시·dread로 상상하게 하라.' },
      { text: '괴물·저주에 일관된 규칙이 없어 아무 때나 작동하는가?', tip: '규칙 없는 위협은 긴장도, 공정함도 없다.', twist: '규칙을 명확히 심고 위반=처벌로 일관하라. 독자가 규칙을 파악하며 긴장하게.' },
      { text: '"초자연인가 정신병인가"의 답을 너무 빨리 확정하는가?', tip: '정답이 나오는 순간 미스터리의 동력이 꺼진다.', twist: '모호함을 클라이맥스 직전까지 유지하라. 둘 다 가능해 보이게 단서를 양쪽에 깔아라.' },
      { text: '동물(개·고양이)이 먼저 이상 반응하는 클리셰를 그냥 쓰는가?', tip: '너무 익숙해 예고편처럼 읽힌다.', twist: '동물 반응을 미끼로 깔되, 진짜 위협은 전혀 다른 곳에서 오게 비틀어라.' },
      { text: '다 끝난 줄 알았는데 손이 불쑥 — 을 의미 없이 반복하는가?', tip: '관성적 마지막 점프스케어는 진부하다.', twist: '재공격을 쓰려면 "끝나지 않는다"는 주제(저주의 전염)와 연결해 의미를 부여하라.' },
      { text: '결말에서 모든 걸 깔끔히 설명·퇴치해 여운을 지우는가?', tip: '과잉 설명은 우주적 공포·찝찝함을 무너뜨린다.', twist: '핵심 미스터리 하나는 끝까지 설명하지 마라. 알 수 없음이 가장 오래 남는 공포다.' },
      { text: '여성·약자 인물을 비명 지르는 희생양으로만 소비하는가?', tip: '평면적 피해자는 긴장도 이입도 만들지 못한다.', twist: 'final girl의 능동성·기지를 부여하라. 가장 무력했던 인물이 마지막에 맞서게.' },
    ],
  },
]

// 조합 카운트 대상(공포 장치): kind === 'device' 인 카테고리들의 켜진 항목 수
const DEVICE_CATS = CATS.filter((c) => c.kind === 'device')

interface UserItem { id: string; text: string }
interface Persisted {
  checked: Record<string, boolean>
  removed: string[]               // 삭제한 기본 항목 id
  userItems: Record<string, UserItem[]> // catId -> 사용자 항목
  collapsed: Record<string, boolean>
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function emptyState(): Persisted { return { checked: {}, removed: [], userItems: {}, collapsed: {} } }

function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return emptyState()
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return emptyState()
    const checked: Record<string, boolean> = {}
    if (p.checked && typeof p.checked === 'object') for (const k of Object.keys(p.checked)) checked[k] = !!p.checked[k]
    const collapsed: Record<string, boolean> = {}
    if (p.collapsed && typeof p.collapsed === 'object') for (const k of Object.keys(p.collapsed)) collapsed[k] = !!p.collapsed[k]
    const userItems: Record<string, UserItem[]> = {}
    if (p.userItems && typeof p.userItems === 'object') {
      for (const k of Object.keys(p.userItems)) {
        const arr = p.userItems[k]
        if (Array.isArray(arr)) userItems[k] = arr.filter((x: any) => x && typeof x.text === 'string').map((x: any) => ({ id: String(x.id || newId()), text: String(x.text) }))
      }
    }
    const removed = Array.isArray(p.removed) ? p.removed.filter((x: any) => typeof x === 'string') : []
    return { checked, removed, userItems, collapsed }
  } catch { return emptyState() }
}

const defId = (catId: string, idx: number) => `d:${catId}:${idx}`

interface MergedItem { id: string; text: string; tip?: string; twist?: string; user: boolean }
function catItems(cat: Cat, st: Persisted): MergedItem[] {
  const out: MergedItem[] = []
  cat.items.forEach((it, idx) => {
    const id = defId(cat.id, idx)
    if (st.removed.includes(id)) return
    out.push({ id, text: it.text, tip: it.tip, twist: it.twist, user: false })
  })
  ;(st.userItems[cat.id] || []).forEach((u) => out.push({ id: u.id, text: u.text, user: true }))
  return out
}

// 조합수(부분집합) — 켜진 공포 장치 n개로 만들 수 있는 장치 묶음 수 = 2^n - 1 (빈 묶음 제외)
function comboCount(onDevices: number): { display: string; raw: number } {
  if (onDevices <= 0) return { display: '0', raw: 0 }
  const raw = Math.pow(2, onDevices) - 1
  if (raw >= 1e16) return { display: `약 ${(raw / 1e12).toExponential(2)}조 이상`, raw }
  const KO = [
    [1e16, '경'], [1e12, '조'], [1e8, '억'], [1e4, '만'],
  ] as const
  for (const [unit, name] of KO) {
    if (raw >= unit) {
      const v = raw / unit
      return { display: `약 ${v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(2)}${name}`, raw }
    }
  }
  return { display: raw.toLocaleString(), raw }
}

// 전체 기본 장치 항목 수로 이론적 최대 조합수(2^N-1)를 미리 계산해 안내 — 1조 이상 지향 확인용.
const TOTAL_DEVICE_ITEMS = DEVICE_CATS.reduce((a, c) => a + c.items.length, 0)
const MAX_COMBO = comboCount(TOTAL_DEVICE_ITEMS)

function escHtml(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

export default function HorrorTropes({ payload }: { payload?: Record<string, unknown> }) {
  const genre = (payload && typeof payload.genre === 'string' && payload.genre) ? String(payload.genre) : '호러·공포'

  const [state, setState] = useState<Persisted>(() => loadState())
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [query, setQuery] = useState('')
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const [spark, setSpark] = useState<MergedItem[]>([])
  const [loglines, setLoglines] = useState<string[]>([])
  const mounted = useRef(true)
  const flashTimer = useRef<number | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (flashTimer.current) { clearTimeout(flashTimer.current); flashTimer.current = null }
    }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 진행 상황이 사라질 수 있어요.') }
  }, [state])

  const say = (msg: string) => {
    setFlash(msg)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { if (mounted.current) setFlash('') }, 1900)
  }

  const copyText = async (text: string, okMsg: string) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      say(okMsg)
    } catch { say('복사에 실패했어요. 직접 선택해 복사하세요.') }
  }

  const toggle = (id: string) => setState((s) => ({ ...s, checked: { ...s.checked, [id]: !s.checked[id] } }))
  const toggleCollapse = (id: string) => setState((s) => ({ ...s, collapsed: { ...s.collapsed, [id]: !s.collapsed[id] } }))

  const addUserItem = (catId: string) => {
    const text = (drafts[catId] || '').trim()
    if (!text) return
    const item: UserItem = { id: newId(), text }
    setState((s) => ({ ...s, userItems: { ...s.userItems, [catId]: [...(s.userItems[catId] || []), item] } }))
    setDrafts((d) => ({ ...d, [catId]: '' }))
  }

  const removeItem = (catId: string, id: string, isUser: boolean) => {
    setState((s) => {
      const checked = { ...s.checked }; delete checked[id]
      if (isUser) {
        const arr = (s.userItems[catId] || []).filter((u) => u.id !== id)
        return { ...s, checked, userItems: { ...s.userItems, [catId]: arr } }
      }
      return { ...s, checked, removed: [...s.removed, id] }
    })
  }

  const saveEdit = () => {
    if (!editing) return
    const text = editing.text.trim()
    const target = editing
    setEditing(null)
    if (!text) return
    setState((s) => {
      for (const catId of Object.keys(s.userItems)) {
        const arr = s.userItems[catId] || []
        if (arr.some((u) => u.id === target.id)) {
          return { ...s, userItems: { ...s.userItems, [catId]: arr.map((u) => (u.id === target.id ? { ...u, text } : u)) } }
        }
      }
      const m = /^d:([^:]+):/.exec(target.id)
      if (m) {
        const catId = m[1]
        const repl: UserItem = { id: newId(), text }
        const wasChecked = !!s.checked[target.id]
        const checked = { ...s.checked }; delete checked[target.id]
        if (wasChecked) checked[repl.id] = true
        return {
          ...s, checked,
          removed: s.removed.includes(target.id) ? s.removed : [...s.removed, target.id],
          userItems: { ...s.userItems, [catId]: [...(s.userItems[catId] || []), repl] },
        }
      }
      return s
    })
  }

  const resetAll = () => setState((s) => ({ ...s, checked: {} }))

  // ── 오늘의 공포 장치 한 줌: 장치 카테고리에서 무작위 3개 ──
  const drawSpark = () => {
    const pool: MergedItem[] = []
    DEVICE_CATS.forEach((c) => catItems(c, state).forEach((it) => pool.push(it)))
    if (pool.length === 0) return
    const picks: MergedItem[] = []
    const used = new Set<number>()
    const n = Math.min(3, pool.length)
    while (picks.length < n) {
      const i = Math.floor(Math.random() * pool.length)
      if (used.has(i)) continue
      used.add(i); picks.push(pool[i])
    }
    setSpark(picks)
  }

  const applySpark = () => {
    if (spark.length === 0) return
    setState((s) => {
      const checked = { ...s.checked }
      spark.forEach((it) => { checked[it.id] = true })
      return { ...s, checked }
    })
    say('뽑은 장치를 체크에 반영했어요')
  }

  // ── 공포 로그라인 생성기(곱집합 슬롯) ──
  const drawLoglines = () => {
    const seen = new Set<string>()
    const out: string[] = []
    let guard = 0
    while (out.length < 3 && guard < 60) {
      guard++
      const l = makeLogline()
      if (seen.has(l)) continue
      seen.add(l); out.push(l)
    }
    setLoglines(out)
  }

  // ── 집계 ──
  const ql = query.trim().toLowerCase()
  const perCat = CATS.map((cat) => {
    const all = catItems(cat, state)
    const items = ql ? all.filter((it) => it.text.toLowerCase().includes(ql) || (it.tip || '').toLowerCase().includes(ql) || (it.twist || '').toLowerCase().includes(ql)) : all
    const done = all.filter((it) => state.checked[it.id]).length
    return { cat, items, all, total: all.length, done, hidden: all.length - items.length }
  })
  const totalItems = perCat.reduce((a, p) => a + p.total, 0)
  const totalDone = perCat.reduce((a, p) => a + p.done, 0)
  const totalPct = totalItems ? Math.round((totalDone / totalItems) * 100) : 0

  // 조합수: 켜진 공포 장치 항목 수
  const onDevices = DEVICE_CATS.reduce((a, c) => a + catItems(c, state).filter((it) => state.checked[it.id]).length, 0)
  const combo = comboCount(onDevices)

  // ── 내보내기 / 프로젝트 ──
  const selectedByCat = () => CATS.map((cat) => ({ cat, picks: catItems(cat, state).filter((it) => state.checked[it.id]) })).filter((x) => x.picks.length > 0)

  const exportText = () => {
    const sel = selectedByCat()
    const lines: string[] = [`# 호러 트로프·관습 체크 (${genre})`, `선택 ${totalDone}/${totalItems} · 공포 장치 ${onDevices}개 → 조합 ${combo.display}`, '']
    if (sel.length === 0) lines.push('(아직 체크한 항목이 없어요)')
    sel.forEach(({ cat, picks }) => {
      lines.push(`## ${cat.icon} ${cat.name}`)
      picks.forEach((it) => { lines.push(`- ${it.text}`); if (it.twist) lines.push(`    ↳ 비틀기: ${it.twist}`) })
      lines.push('')
    })
    copyText(lines.join('\n').trim(), `체크한 항목을 복사했어요 (${totalDone}개)`)
  }

  const toBodyHtml = (): string => {
    const sel = selectedByCat()
    const parts: string[] = []
    parts.push(`<p><strong>장르:</strong> ${escHtml(genre)} &nbsp;·&nbsp; <strong>선택:</strong> ${totalDone}/${totalItems} &nbsp;·&nbsp; <strong>공포 장치 조합:</strong> ${escHtml(combo.display)} (${onDevices}개 선택)</p>`)
    if (sel.length === 0) { parts.push('<p>(아직 체크한 항목이 없습니다)</p>'); return parts.join('') }
    sel.forEach(({ cat, picks }) => {
      parts.push(`<h3>${escHtml(cat.icon + ' ' + cat.name)}</h3>`)
      picks.forEach((it) => {
        parts.push(`<p>☑ ${escHtml(it.text)}</p>`)
        if (it.twist) parts.push(`<p style="color:#888;margin-left:14px">↳ 비틀기: ${escHtml(it.twist)}</p>`)
      })
    })
    return parts.join('')
  }

  const toProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '기획',
      title: `호러 트로프 셋 (${totalDone}개 선택)`,
      bodyHtml: toBodyHtml(),
      meta: {
        장르: genre,
        선택: `${totalDone}/${totalItems}`,
        공포장치수: String(onDevices),
        조합수: combo.display,
      },
    })
    say(id ? `프로젝트 '기획' 폴더에 호러 트로프 셋을 추가했어요 (${totalDone}개)` : '프로젝트에 연결되지 않았습니다')
  }

  // 선택한 셋을 글감 스니펫으로 저장
  const toSnippet = () => {
    const sel = selectedByCat()
    if (sel.length === 0) { say('먼저 항목을 체크하세요'); return }
    const text = sel.map(({ cat, picks }) => `${cat.icon} ${cat.name}: ` + picks.map((p) => p.text).join(' / ')).join('\n')
    addToLibrary('snippets', { text: `[호러 트로프 셋]\n${text}`, source: '호러 트로프·관습 체크', tags: ['호러·공포', '트로프', '기획'] })
    say('글감(스니펫)으로 저장했어요')
  }

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', fontSize: 14, background: 'var(--paper)' }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap', background: 'var(--chrome-2)' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const bar = (h = 8): React.CSSProperties => ({ height: h, borderRadius: 99, background: 'var(--chrome-2)', border: '1px solid var(--border)', overflow: 'hidden', flex: 1, minWidth: 0 })
  const fill = (pct: number): React.CSSProperties => ({ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--ok)' : 'var(--accent)', transition: 'width .25s ease' })
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }
  const cHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', userSelect: 'none', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }
  const itemRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 12px' }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 13.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const tinyBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '3px 6px', borderRadius: 6, flexShrink: 0 }
  const kindBadge = (): React.CSSProperties => ({
    fontSize: 10, padding: '1px 5px', borderRadius: 5, border: '1px solid var(--border)', color: 'var(--muted)', flexShrink: 0, whiteSpace: 'nowrap',
  })

  const linked = hasProjectBridge()

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }}><Emoji e="🕯️"/> 호러 트로프·관습 체크</span>
        <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>{genre}</span>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{flash}</span>}
        <button className="linkbtn" onClick={toProject} disabled={!linked || totalDone === 0} title={linked ? "체크한 셋을 프로젝트 '기획' 폴더 문서로 추가" : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="minibtn" onClick={toSnippet} disabled={totalDone === 0} title="체크한 항목을 글감(스니펫)으로 저장"><Emoji e="💡"/> 글감 저장</button>
        <button className="minibtn" onClick={exportText} disabled={totalDone === 0} title="체크한 항목을 텍스트로 복사"><Emoji e="📋"/> 내보내기</button>
        <button className="minibtn" onClick={resetAll} disabled={totalDone === 0} title="모든 체크 해제">↺ 해제</button>
      </div>

      {/* 진행률 + 조합수 */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>전체</span>
        <div style={bar()}><div style={fill(totalPct)} /></div>
        <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, color: totalPct >= 100 ? 'var(--ok)' : 'var(--text)' }}>{totalDone}/{totalItems} · {totalPct}%</span>
        <span style={{ flexBasis: '100%', height: 0 }} />
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>선택한 공포 장치 <b style={{ color: 'var(--text)' }}>{onDevices}개</b>로 만들 수 있는 장치 조합</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{combo.display}{combo.raw > 0 ? ' 가지' : ''}</span>
        <span style={{ flexBasis: '100%', height: 0 }} />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>전체 {TOTAL_DEVICE_ITEMS}개 장치를 모두 쓰면 이론상 <b style={{ color: 'var(--accent)' }}>{MAX_COMBO.display}</b> 가지 조합</span>
      </div>

      {/* 검색 + 공포 장치 한 줌 */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
        <input
          style={{ ...input, flex: 1, minWidth: 160 }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="장치·함정 검색 (예: 거울, 고립, 언캐니, 슬래셔, 점프스케어)"
          aria-label="트로프 검색"
        />
        {query && <button style={tinyBtn} onClick={() => setQuery('')} title="검색 지우기">✕</button>}
        <button className="minibtn" onClick={drawSpark} title="공포 장치 풀에서 무작위 3개 뽑기"><Emoji e="🎲"/> 장치 한 줌</button>
        <button className="minibtn" onClick={drawLoglines} title="공간×인물×위협×규칙×장치×결말 곱집합으로 한 줄 공포 로그라인 생성"><Emoji e="🕯️"/> 로그라인 생성</button>
      </div>

      {spark.length > 0 && (
        <div style={{ margin: '0 14px', padding: 10, borderRadius: 10, border: '1px solid var(--accent)', background: 'var(--chrome-2)', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}><Emoji e="🎲"/> 오늘의 공포 장치 한 줌</span>
            <span style={{ flex: 1 }} />
            <button style={tinyBtn} onClick={drawSpark} title="다시 뽑기">↻ 다시</button>
            <button style={tinyBtn} onClick={applySpark} title="뽑은 장치를 체크에 반영">✓ 반영</button>
            <button style={tinyBtn} onClick={() => copyText(spark.map((s) => '• ' + s.text).join('\n'), '뽑은 장치 복사됨')} title="복사"><Emoji e="📋"/></button>
          </div>
          {spark.map((it) => (
            <div key={it.id} style={{ fontSize: 12.5, lineHeight: 1.5 }}>• {it.text}</div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>서로 안 어울려 보이는 장치일수록 신선한 공포가 됩니다. "이 셋을 한 장면에?"라고 상상해 보세요.</div>
        </div>
      )}

      {loglines.length > 0 && (
        <div style={{ margin: '8px 14px 0', padding: 10, borderRadius: 10, border: '1px solid var(--accent)', background: 'var(--chrome-2)', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}><Emoji e="🕯️"/> 공포 로그라인</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>공간×인물×위협×규칙×장치×결말 = <b style={{ color: 'var(--accent)' }}>{koNum(LOGLINE_COMBOS)}</b> 가지</span>
            <span style={{ flex: 1 }} />
            <button style={tinyBtn} onClick={drawLoglines} title="다시 생성">↻ 다시</button>
            <button style={tinyBtn} onClick={() => copyText(loglines.map((l) => '• ' + l).join('\n'), '로그라인 복사됨')} title="복사"><Emoji e="📋"/></button>
          </div>
          {loglines.map((l, i) => (
            <div key={i} style={{ fontSize: 12.5, lineHeight: 1.6, display: 'flex', gap: 6 }}>
              <span style={{ flex: 1 }}>{l}</span>
              <button style={tinyBtn} onClick={() => copyText(l, '복사됨')} title="이 줄 복사"><Emoji e="📋"/></button>
            </div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>여섯 슬롯을 곱집합으로 엮은 한 줄 발상. 마음에 드는 줄을 복사해 시놉시스의 씨앗으로 삼으세요.</div>
        </div>
      )}

      {note &&<div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--warn)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {perCat.map(({ cat, items, total, done, hidden }) => {
          const pct = total ? Math.round((done / total) * 100) : 0
          const open = !state.collapsed[cat.id]
          const draft = drafts[cat.id] || ''
          if (ql && items.length === 0) return null
          return (
            <div key={cat.id} style={card}>
              <div style={cHead} onClick={() => toggleCollapse(cat.id)}>
                <span style={{ fontSize: 11, color: 'var(--muted)', width: 12, flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
                <span style={{ fontSize: 16, flexShrink: 0 }}><Emoji e={cat.icon}/></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {cat.name}
                    {cat.kind === 'device' && <span style={kindBadge()}>조합 대상</span>}
                    {cat.kind === 'trap' && <span style={{ ...kindBadge(), color: 'var(--warn)', borderColor: 'var(--warn)' }}>함정·비틀기</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cat.desc}{ql && hidden > 0 ? ` · 검색 일치 ${items.length}/${total}` : ''}
                  </div>
                </div>
                <div style={{ width: 80, flexShrink: 0 }}><div style={bar(6)}><div style={fill(pct)} /></div></div>
                <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, width: 52, textAlign: 'right', color: pct >= 100 && total > 0 ? 'var(--ok)' : 'var(--muted)' }}>{done}/{total}</span>
              </div>

              {open && (
                <div>
                  {items.map((it) => {
                    const isEditing = editing && editing.id === it.id
                    const checked = !!state.checked[it.id]
                    return (
                      <div key={it.id} style={{ ...itemRow, borderTop: '1px solid var(--border)' }}>
                        {isEditing ? (
                          <>
                            <input
                              style={{ ...input, flex: 1 }} value={editing!.text} autoFocus
                              onChange={(e) => setEditing({ id: it.id, text: e.target.value })}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit() } if (e.key === 'Escape') { e.preventDefault(); setEditing(null) } }}
                              aria-label="항목 수정"
                            />
                            <button style={tinyBtn} onClick={saveEdit}>저장</button>
                            <button style={tinyBtn} onClick={() => setEditing(null)}>취소</button>
                          </>
                        ) : (
                          <>
                            <input
                              type="checkbox" checked={checked} onChange={() => toggle(it.id)}
                              style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, cursor: 'pointer', accentColor: cat.kind === 'trap' ? 'var(--warn)' : 'var(--accent)' }}
                              aria-label={it.text}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span
                                onClick={() => toggle(it.id)}
                                style={{ display: 'block', fontSize: 13.5, lineHeight: 1.5, cursor: 'pointer', wordBreak: 'break-word', color: checked ? 'var(--muted)' : 'var(--text)', textDecoration: checked && cat.kind !== 'trap' ? 'line-through' : 'none', fontWeight: checked && cat.kind === 'trap' ? 600 : 400 }}
                              >
                                {it.text}
                                {it.user && <span style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 5, padding: '0 4px', verticalAlign: 'middle' }}>내 항목</span>}
                              </span>
                              {it.tip && <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 3 }}>{it.tip}</div>}
                              {it.twist && (
                                <div style={{ fontSize: 11.5, color: 'var(--accent)', lineHeight: 1.5, marginTop: 3, paddingLeft: 8, borderLeft: '2px solid var(--accent)' }}>
                                  <b>비틀기</b> · {it.twist}
                                </div>
                              )}
                            </div>
                            <button style={tinyBtn} title="이 항목 복사" onClick={() => copyText(it.text + (it.twist ? `\n↳ 비틀기: ${it.twist}` : ''), '복사됨')}><Emoji e="📋"/></button>
                            <button style={tinyBtn} title="수정" onClick={() => setEditing({ id: it.id, text: it.text })}>✎</button>
                            <button style={{ ...tinyBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeItem(cat.id, it.id, it.user)}>✕</button>
                          </>
                        )}
                      </div>
                    )
                  })}

                  {!ql && (
                    <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
                      <input
                        style={{ ...input, flex: 1 }} value={draft}
                        onChange={(e) => setDrafts((d) => ({ ...d, [cat.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUserItem(cat.id) } }}
                        placeholder={`${cat.name}에 내 항목 추가…`} maxLength={200}
                        aria-label={`${cat.name} 항목 추가`}
                      />
                      <button className="minibtn" onClick={() => addUserItem(cat.id)} disabled={!draft.trim()}>＋ 추가</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* 연계 */}
        <div className="linkbar" style={{ marginTop: 2 }}>
          <span className="linkbar-label">연계:</span>
          <button className="linkbtn" onClick={() => openToolLinked('conflict-builder', { genre })} title="공포 장치로 갈등·위협을 설계"><Emoji e="⚔️"/> 갈등 설계기</button>
          <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre })} title="5단 공포 곡선을 플롯에 배치"><Emoji e="🔺"/> 플롯 피라미드</button>
          <button className="linkbtn" onClick={() => openToolLinked('sensory-palette', { genre })} title="감각 어휘로 분위기 빚기"><Emoji e="👁️"/> 감각 팔레트</button>
          <button className="linkbtn" onClick={() => openToolLinked('setting-bible', { genre })} title="고립 공간을 무대로 설계"><Emoji e="🏚️"/> 배경 설정집</button>
          <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck', { genre })} title="결말 반전 발상"><Emoji e="🃏"/> 반전 카드덱</button>
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6, paddingBottom: 4 }}>
          항목을 눌러 체크하고, 카테고리 머리글로 펼치거나 접으세요. <b>조합 대상</b> 카테고리(공포 장치·하위장르·공간·감각·클라이맥스)에서 고른 장치 수로 가능한 조합 수가 계산됩니다.
          <b>함정·비틀기</b>는 "내 글에 이 함정이 있나?"를 점검하는 칸 — 체크된 함정의 <b style={{ color: 'var(--accent)' }}>비틀기</b>를 보강 지점으로 삼으세요. 기본 항목도 수정·삭제할 수 있고, 진행 상황은 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
