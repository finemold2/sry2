// 부상·회복 리얼리즘 사전 — 액션·메디컬·서바이벌 창작 고증 참고용 로컬 자료집.
//  ⚠ 의학 자문이 아니라, 부상·응급처치·회복 과정의 '묘사 개연성'을 위한 창작 자료다.
//  자급식: react 와 './linkbus' 외 import 없음. 외부 API/미디어/네트워크 없음(전부 로컬 자작 데이터).
//  카테고리 펼침 + 검색 + 무작위 뽑기 + 클릭 복사 + 스니펫 저장 + 수집함 + 프로젝트 연계.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, addToStash, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'injury-recovery-ref',
  name: '부상·회복 리얼리즘 사전',
  icon: '🩹',
  group: '리서치·자료',
  intro: '자상·골절·화상·총상·중독·저체온 등 부상별 증상·응급처치·회복 기간·후유증을 액션/메디컬 고증용으로 정리',
  w: 660,
  h: 680,
}

// ---------- 항목 형(型) ----------
// 모든 텍스트는 '창작 묘사용 단서'이지 실제 처치 지침이 아니다.
interface Entry {
  name: string          // 명칭
  aka?: string          // 이칭·범주
  severity?: string     // 위중도(서사용 척도)
  signs?: string        // 증상·겉으로 드러나는 묘사
  pain?: string         // 통증·감각 묘사
  firstaid?: string     // 현장 응급처치(개념 수준, 묘사용)
  recovery?: string     // 회복 기간·경과
  aftermath?: string    // 후유증·흉터·재발
  myth?: string         // 흔한 오류·클리셰 주의
}
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ---------- 로컬 대량 자료집 (전부 직접 작성한 요약·표현) ----------
const CATS: CatDef[] = [
  {
    key: 'cut', label: '자상·열상·출혈', icon: '🔪',
    note: '칼·유리·파편에 의한 베임. 출혈 속도와 부위(동맥/정맥/모세)가 긴박감을 좌우한다.',
    items: [
      { name: '얕은 절상(피부·표피)', aka: '베임', severity: '경상', signs: '선을 그은 듯한 상처에서 천천히 배어 나오는 피. 가장자리가 깔끔하면 칼날, 너덜하면 둔한 모서리.', pain: '날카롭게 화끈거리다 곧 욱신거림으로 가라앉는다. 움직일 때마다 벌어지는 감각.', firstaid: '깨끗한 천으로 직접 압박해 지혈, 흐르는 물로 이물 제거, 마주 붙여 고정. 깊지 않으면 봉합 없이도 아문다.', recovery: '대개 7~10일이면 표면이 닫힌다. 관절 부위는 자꾸 벌어져 더 오래.', aftermath: '가는 흉터가 몇 달에 걸쳐 옅어진다. 결을 거스른 상처일수록 흉이 도드라진다.', myth: '“피 조금 나는 상처를 입으로 빤다”는 묘사는 감염을 부른다 — 노련한 인물일수록 그러지 않는다.' },
      { name: '깊은 열상(근육까지)', aka: '째진 상처', severity: '중등', signs: '벌어진 틈으로 붉은 근육·노란 지방층이 보인다. 압박해도 스미듯 계속 나는 피.', pain: '처음의 충격 뒤 둔하고 깊은 통증. 손상된 신경 방향으로 저릿함이 뻗기도.', firstaid: '강하게 직접 압박을 유지하며 봉합 가능한 곳으로 이송. 봉합·스테이플로 닫는다.', recovery: '봉합 후 실밥 제거까지 1~2주, 조직이 단단해지기까진 수주~수개월.', aftermath: '두툼한 흉터, 부위에 따라 감각 둔화나 당김. 힘줄·신경이 잘렸다면 기능 손실이 남을 수 있다.', myth: '“바늘 몇 번에 멀쩡히 뛴다”는 과장 — 근육이 잘리면 한동안 그 부위에 힘을 못 준다.' },
      { name: '동맥 출혈', aka: '대량출혈', severity: '치명적', signs: '맥박에 맞춰 분출하듯 솟는 선홍색 피. 짧은 시간에 바닥이 흥건해진다.', pain: '통증보다 ‘급격한 무력감·어지럼’이 먼저 — 창백해지고 식은땀, 손발이 차가워진다.', firstaid: '즉시 강한 직접 압박, 멈추지 않으면 상처 위쪽(심장 쪽)을 지혈대로 강하게 묶는다. 시간 기록이 중요.', recovery: '지혈·수혈·수술이 관건. 살아남아도 실혈량에 따라 며칠은 어지럽고 무력하다.', aftermath: '지혈대 장시간 사용 시 그 아래 조직 손상. 큰 혈관 손상은 수술 흉터와 기능 제한을 남긴다.', myth: '“지혈대를 풀었다 묶었다 반복”은 위험한 클리셰. 한 번 제대로 묶고 풀지 않는 편이 현실적.' },
      { name: '복부 관통상', aka: '배 찔림', severity: '치명적', signs: '겉은 작아도 속이 위험. 장기가 다치면 시간이 지날수록 배가 뻣뻣하게 부풀고 통증이 번진다.', pain: '찌르는 순간의 충격 후, 복막이 자극되면 ‘건드리기만 해도’ 비명이 나는 압통.', firstaid: '박힌 물체는 함부로 빼지 않는다(뺀 순간 출혈 폭발). 튀어나온 장기는 젖은 천으로 덮어 보호하며 이송.', recovery: '수술 후 수주, 장 손상이면 한동안 금식·관 삽입. 회복기 내내 기력 저하.', aftermath: '복부 유착·소화 장애, 큰 수술 흉터. 감염(복막염)이 생기면 회복이 크게 지연.', myth: '“찔린 칼을 영웅적으로 뽑는다”는 치명적 오류 — 박힌 채 고정하는 게 정석.' },
      { name: '방어흔', aka: '저항 상처', severity: '경상~중등', signs: '손바닥·팔뚝 안쪽의 베임. 흉기를 막다 생긴다 — 수사·검시에서 ‘저항했다’는 단서.', pain: '손의 베임은 신경이 많아 유독 쓰리고, 쥐는 동작마다 벌어진다.', firstaid: '압박 지혈 후 봉합. 힘줄 손상 여부 확인이 중요(손가락이 안 펴지면 의심).', recovery: '표면은 1~2주, 손의 정교한 힘은 더 오래 돌아온다.', aftermath: '손 흉터, 힘줄 손상 시 특정 손가락의 미세한 기능 저하.', myth: '몸싸움 장면에 ‘방어흔 없는 깔끔한 자상’만 그리면 오히려 부자연스럽다.' },
    ],
  },
  {
    key: 'blunt', label: '타박·골절·관절', icon: '🦴',
    note: '둔력 외상. 멍·붓기·골절·탈구. 통증보다 ‘못 움직임’이 서사의 제약을 만든다.',
    items: [
      { name: '타박상·멍', aka: '좌상', severity: '경상', signs: '맞은 자리가 붓고, 처음엔 붉다가 푸르죽죽→노랗게 색이 변해간다(색이 곧 시간의 표지).', pain: '누르거나 움직일 때 욱신거림. 깊은 근육 멍은 며칠 뒤가 더 아프다.', firstaid: '초기엔 냉찜질로 붓기·출혈을 줄이고, 이후엔 온찜질로 흡수를 돕는다. 휴식·거상.', recovery: '대개 1~2주. 멍 색의 변화로 ‘며칠 지났는지’ 묘사할 수 있다.', aftermath: '대부분 흔적 없이 사라지나, 반복 타격 부위는 굳은살처럼 단단해지기도.', myth: '멍은 맞은 직후 바로 시퍼렇게 들지 않는다 — 색은 시간차를 두고 변한다.' },
      { name: '늑골(갈비뼈) 골절', aka: '갈비뼈 금', severity: '중등', signs: '겉은 멀쩡해도 숨 쉴 때·기침할 때·웃을 때마다 찌르는 통증. 다친 쪽으로 눕기 힘들다.', pain: '깊게 숨을 들이쉬면 ‘콱’ 막히는 날카로운 통증 — 그래서 얕게 숨 쉬게 된다.', firstaid: '대부분 고정·진통·휴식으로 자연 치유. 단, 호흡 곤란·창백은 폐 손상 신호(응급).', recovery: '뼈가 붙기까지 4~6주, 그동안 격한 동작·웃음·재채기가 고통.', aftermath: '잘못 붙으면 만성 통증. 여러 대가 부러지면 호흡 자체가 위험(연가양흉).', myth: '“갈비 부러진 채 격투를 이어간다”는 과장 — 한 번 호흡할 때마다 의지가 꺾인다.' },
      { name: '장골(팔·다리뼈) 골절', aka: '개방/폐쇄 골절', severity: '중등~중상', signs: '부자연스러운 각도·길이, 극심한 붓기. 개방골절이면 피부를 뚫고 뼈가 보인다.', pain: '체중이 실리거나 움직이면 비명이 나는 통증. 개방골절은 쇼크를 동반.', firstaid: '부목으로 위·아래 관절까지 고정해 더 움직이지 않게. 개방창은 멸균 덮개. 함부로 맞추지 않는다.', recovery: '정복·고정(깁스/수술) 후 6~12주, 큰 뼈일수록 길다. 이후 재활로 근력 회복.', aftermath: '깁스 푼 직후의 근위축(가늘어진 팔다리), 날씨에 시린 느낌, 변형 유합 가능.', myth: '“부러진 다리로 전속력 도주”는 비현실 — 체중조차 못 싣는 경우가 많다.' },
      { name: '관절 탈구', aka: '빠짐(어깨·손가락 등)', severity: '중등', signs: '관절 모양이 어긋나 ‘툭 튀어나옴’, 그 자세에서 굳어 움직이지 못함.', pain: '빠진 순간의 격통과 ‘억지로도 못 움직이는’ 무력감. 신경 눌리면 저림.', firstaid: '비전문가의 무리한 정복은 신경·혈관 손상 위험. 부목·고정 후 이송이 안전.', recovery: '정복 후 며칠~몇 주 고정, 어깨는 재발이 잦아 재활이 길다.', aftermath: '습관성 탈구(또 빠짐), 관절 헐거움. 격투물 캐릭터의 ‘약점’으로 쓰기 좋다.', myth: '“벽에 부딪쳐 스스로 어깨를 맞춘다”는 묘사는 가능하나 어마어마한 통증·실패 위험을 동반.' },
      { name: '뇌진탕', aka: '머리 충격', severity: '중등(주의)', signs: '잠깐 멍해짐, 어지럼·구역, 같은 말 반복·기억의 빈틈. 동공 크기가 다르면 심각 신호.', pain: '지끈거리는 두통, 빛·소리에 예민. ‘안개 낀 듯한’ 사고 둔화.', firstaid: '안정·관찰. 점점 의식이 처지거나 반복 구토·경련이면 즉시 응급(뇌출혈 의심).', recovery: '경미하면 며칠~몇 주, 증상이 길게 가는 경우도(뇌진탕 후 증후군).', aftermath: '집중력·기억력 저하, 두통 반복. 반복 충격은 누적 손상을 남긴다.', myth: '“기절시켰다가 곧 멀쩡히 일어남”은 위험한 클리셰 — 의식 잃을 정도면 결코 가볍지 않다.' },
    ],
  },
  {
    key: 'burn', label: '화상·동상·열손상', icon: '🔥',
    note: '온도에 의한 손상. 깊이(도)와 넓이(체표면적)가 위중도를 가른다.',
    items: [
      { name: '1도 화상', aka: '표재성', severity: '경상', signs: '붉어지고 따끔거리지만 물집은 없다. 햇볕에 심하게 탄 정도.', pain: '화끈거리는 표면 통증, 닿으면 쓰리다.', firstaid: '흐르는 미지근한 물로 식히고(얼음 직접 금지), 보습. 대부분 흉 없이 낫는다.', recovery: '3~6일이면 가라앉고 얇은 껍질이 벗겨진다.', aftermath: '거의 흉터 없음, 일시적 색소 변화 정도.', myth: '“화상에 얼음·기름·치약”은 손상을 키운다 — 미지근한 흐르는 물이 정석.' },
      { name: '2도 화상', aka: '물집 화상', severity: '중등', signs: '붉고 진물·물집이 생긴다. 표재성은 분홍·축축, 심부는 창백·둔해짐.', pain: '표재 2도는 극심하게 아프고(신경 노출), 심부로 갈수록 오히려 통증이 둔해진다.', firstaid: '식히고 물집은 터뜨리지 않는다(감염 보호막). 멸균 덮개로 보호, 넓으면 병원.', recovery: '표재 2도 2~3주, 심부 2도는 더 길고 흉이 남기 쉽다.', aftermath: '색소 변화·흉터, 심부는 구축(피부가 당겨 움직임 제한)도.', myth: '물집을 일부러 터뜨리는 영웅적 묘사는 감염 위험 — 보통은 그대로 둔다.' },
      { name: '3도 화상', aka: '전층 화상', severity: '중상~치명적', signs: '하얗거나 검게 그을려 가죽처럼 뻣뻣. 넓으면 체액 손실·쇼크로 생명이 위험.', pain: '신경까지 파괴돼 그 부위 자체는 ‘통증이 없을’ 수 있다(가장자리는 아프다) — 무통이 곧 위중함의 역설.', firstaid: '눌어붙은 옷은 떼지 않고, 체온 유지·쇼크 대비하며 즉시 이송. 넓은 화상은 수액이 관건.', recovery: '피부 이식 수술과 긴 재활. 회복까지 수개월~수년.', aftermath: '심한 흉터·구축, 감각 소실, 외모·기능 변화. 트라우마까지 동반.', myth: '“3도 화상인데 아파서 비명”은 모순될 수 있다 — 가장 깊은 부위는 오히려 둔하다.' },
      { name: '흡입 화상', aka: '기도 손상', severity: '치명적', signs: '그을린 콧털·목소리 변화·쉰 기침, 시간이 지날수록 부어 숨길이 좁아진다.', pain: '타는 듯한 목·가슴, 숨쉴 때마다 거칠고 답답.', firstaid: '연기에서 즉시 벗어나 신선한 공기. 기도가 붓기 전에 이송 — 시간이 적.', recovery: '기도 부종이 가라앉기까지 위험기. 이후에도 폐 기능 저하.', aftermath: '만성 기침·호흡 곤란, 폐 손상.', myth: '화재 사망의 상당수는 ‘불’이 아니라 연기·일산화탄소 — 불꽃 없이도 치명적.' },
      { name: '동상', aka: '한랭 손상', severity: '중등~중상', signs: '하얗게·노랗게 굳고 감각이 사라진다, 녹을 때 자줏빛·물집. 손발끝·귀·코가 먼저.', pain: '얼 때는 무감각, 녹을 때 타는 듯·찌르는 듯한 격통이 몰려온다.', firstaid: '체온의 물에 서서히 녹인다(불·문지름 금지). 다시 얼 위험이 있으면 녹이지 않는다.', recovery: '경미하면 수일, 심하면 조직 괴사 경계가 드러나기까지 수주.', aftermath: '심부 동상은 조직 괴사·절단. 평생 추위·저림에 예민해진다.', myth: '“언 손발을 불·눈으로 문지른다”는 손상을 키운다 — 미지근한 물이 정석.' },
    ],
  },
  {
    key: 'gsw', label: '총상·폭발·관통', icon: '🔫',
    note: '액션물의 핵심. 입사·출사구, 공동(空洞) 손상, 파편이 묘사의 디테일을 만든다.',
    items: [
      { name: '연부조직 관통(살만)', aka: '관통상', severity: '중등', signs: '작은 입사구, 더 크고 너덜한 출사구. 뼈·장기를 피하면 의외로 ‘걸어다닐’ 수도.', pain: '맞은 순간엔 ‘세게 맞은 듯한 충격’, 곧 화끈거리는 통증과 무감각이 번갈아.', firstaid: '입·출사구 모두 압박 지혈, 이물 탐색 금지. 감염 위험이 커 결국 병원 처치 필요.', recovery: '깨끗한 관통이면 수주, 감염·조직 손상 정도에 좌우.', aftermath: '두 개의 흉터, 신경 스치면 저림·근력 저하.', myth: '“총 맞고 즉시 쓰러진다”도 “멀쩡히 싸운다”도 둘 다 극단 — 부위·심리상태에 따라 천차만별.' },
      { name: '관절·뼈 명중', aka: '골 손상 총상', severity: '중상', signs: '뼈가 파열되며 파편이 사방으로(2차 손상). 그 부위는 즉시 기능을 잃는다.', pain: '극심한 통증과 함께 ‘힘이 빠져 못 움직임’. 다리면 그 자리에 주저앉는다.', firstaid: '강한 압박·고정, 쇼크 대비. 수술 불가피.', recovery: '수술·고정 후 수개월, 관절이면 운동범위가 평생 제한될 수 있다.', aftermath: '영구적 절뚝임·관절 강직, 금속 고정물. 캐릭터의 후유 ‘특징’으로 활용.', myth: '“팔에 총 맞고도 똑같이 사격”은 비현실 — 뼈가 다치면 그 팔은 거의 무용지물.' },
      { name: '흉부 총상', aka: '가슴 관통', severity: '치명적', signs: '숨 쉴 때 상처에서 거품·바람 소리(개방성 기흉), 점점 숨이 가빠지고 입술이 파래진다.', pain: '가슴을 죄는 통증, 누우면 더 못 숨 쉼.', firstaid: '상처를 한쪽만 막아 공기는 빠지되 안 들어가게(밸브식 덮개) — 묘사용 개념. 즉시 이송.', recovery: '흉관 삽입·수술 후 수주, 폐 회복은 더 길다.', aftermath: '폐활량 저하, 추운 날·운동 시 숨참. 흉터.', myth: '“가슴 총상 후 곧장 대화”는 어렵다 — 폐가 다치면 말 자체가 힘겹다.' },
      { name: '폭발 손상', aka: '폭상(爆傷)', severity: '중상~치명적', signs: '겉은 멀쩡해도 ‘압력파’가 폐·귀·장을 안에서 망가뜨린다(1차). 파편·낙하·화상이 겹친다(2~4차).', pain: '귀울림·먹먹함과 어지럼, 내장 손상은 시차를 두고 악화.', firstaid: '눈에 보이는 출혈부터 지혈, 고막·내부 손상은 관찰. 다발 손상이라 우선순위 분류(트리아지).', recovery: '손상 조합에 따라 천차만별, 청력·균형은 오래 간다.', aftermath: '이명·난청, 외상후 스트레스, 만성 통증. 전쟁물 후유 묘사의 단골.', myth: '“폭발 직후 멀쩡히 대화”는 부자연 — 보통 귀가 먹먹하고 소리가 멀게 들린다.' },
      { name: '파편·자상 잔류물', aka: '이물 잔존', severity: '경상~중등', signs: '작은 상처지만 안에 유리·금속이 남아 곪거나 통증이 가시지 않는다.', pain: '움직일 때 ‘안에서 긁히는’ 이물감, 주변이 붉게 곪는다.', firstaid: '깊거나 큰 이물은 함부로 빼지 않고 영상 확인 후 제거. 작은 표면 이물만 세척·제거.', recovery: '제거 후 빠르게 호전, 방치 시 만성 농양.', aftermath: '잔류 파편이 평생 몸에 남기도(움직일 때 자각), 흉터.', myth: '“핀셋으로 척척 총알 제거”는 위험·고통이 큰 작업 — 즉석에선 잘 하지 않는다.' },
    ],
  },
  {
    key: 'tox', label: '중독·독·약물', icon: '☠️',
    note: '먹고·마시고·물려서 생기는 손상. 발현 시간과 증상 양상이 긴장의 리듬을 만든다.',
    items: [
      { name: '식중독·세균독', aka: '상한 음식', severity: '경상~중등', signs: '몇 시간 뒤 구역·구토·설사·복통. 탈수로 기운이 빠지고 어지럽다.', pain: '쥐어짜는 복통이 파도처럼, 화장실을 못 떠난다.', firstaid: '수분·전해질 보충이 핵심, 무리한 지사제는 독을 가둘 수 있다. 고열·혈변은 병원.', recovery: '대개 1~3일, 탈수가 심하면 수액으로 빠르게 회복.', aftermath: '며칠 기력 저하·예민한 장. 대부분 후유 없음.', myth: '“상한 거 먹자마자 토한다”는 과장 — 보통 몇 시간의 잠복기가 있다.' },
      { name: '일산화탄소 중독', aka: 'CO 질식', severity: '중상~치명적', signs: '두통·졸음·메스꺼움으로 ‘도망쳐야 한다는 판단’ 자체가 흐려진다. 입술·피부가 선홍빛.', pain: '명확한 통증보다 ‘무겁고 졸린’ 무력감 — 그래서 더 위험.', firstaid: '즉시 신선한 공기, 산소. 같은 공간의 다른 사람도 함께 위험.', recovery: '경미하면 수시간, 심하면 며칠 입원·고압산소.', aftermath: '기억·집중력 저하, 두통이 한동안. 뒤늦은 신경 증상도.', myth: '연탄·차고·보일러 사고의 단골 — 무색무취라 ‘눈치채지 못하는’ 전개가 현실적.' },
      { name: '뱀 교상', aka: '독사 물림', severity: '중등~치명적', signs: '물린 자국 두 점, 빠르게 붓고 변색·통증이 번진다(출혈독). 어지럼·시야 흐림은 신경독.', pain: '타는 듯 번지는 통증과 붓기, 신경독은 통증보다 마비가 두드러진다.', firstaid: '물린 부위를 심장보다 낮게·덜 움직이게, 죈 것 풀기. 빨아내기·절개·얼음·지혈대는 권장되지 않는다.', recovery: '항독소 투여 시 호전, 종류·시간에 좌우. 심한 부종은 수주.', aftermath: '조직 괴사·부위 기능 저하, 흉터. 신경독은 일시적 마비 후 회복.', myth: '“입으로 독을 빨아낸다”는 영화적 묘사 — 효과 적고 입에 독 옮길 위험, 노련한 인물은 안 한다.' },
      { name: '벌·곤충 다발 자상', aka: '알레르기·아나필락시스', severity: '경상~치명적', signs: '쏘인 자리 붓기·통증. 알레르기 체질은 전신 두드러기·입술·기도 부종·호흡곤란으로 급변.', pain: '국소는 화끈한 통증, 전신 반응은 ‘목이 조이고 숨이 막히는’ 공포.', firstaid: '침 제거·냉찜질. 전신 반응(아나필락시스)은 즉시 응급 — 분초를 다툰다.', recovery: '국소는 수일, 아나필락시스는 처치 후 관찰 필요.', aftermath: '대개 후유 없음, 알레르기 체질은 다음 노출이 더 위험.', myth: '벌침은 신용카드 모서리로 긁어 빼라는 통념보다, ‘빨리 빼는 것’ 자체가 중요.' },
      { name: '약물·알코올 과용', aka: '중추 억제', severity: '중등~치명적', signs: '졸음→혼미→혼수, 호흡이 느리고 얕아진다. 토물에 기도가 막힐 위험.', pain: '본인은 통증보다 ‘잠에 빠지듯’ 의식이 흐려진다.', firstaid: '의식 저하 시 옆으로 눕혀 기도 확보(토물 흡인 방지), 호흡 관찰, 즉시 이송.', recovery: '대사·해독에 따라 수시간~며칠, 호흡 억제가 고비.', aftermath: '저산소가 길었다면 뇌 손상, 흡인성 폐렴. 심리·중독 문제 동반.', myth: '“취한 사람을 똑바로 눕혀 재운다”는 위험 — 토하면 기도가 막힌다, 옆으로 눕혀야 한다.' },
    ],
  },
  {
    key: 'env', label: '환경·저체온·탈진', icon: '🌡️',
    note: '서바이벌·재난물. 추위·더위·탈수·고도가 서서히 몸을 무너뜨린다.',
    items: [
      { name: '저체온증', aka: '한랭 노출', severity: '중등~치명적', signs: '심한 떨림→떨림이 멈추고 말이 어눌·판단 흐려짐→역설적 탈의(더운 줄 착각해 옷을 벗음).', pain: '초기엔 시리고 떨리지만, 깊어질수록 통증도 추위도 못 느끼는 둔감.', firstaid: '젖은 옷 제거·마른 것으로, 몸통부터 서서히 보온. 거칠게 움직이지 않게(심장 부담).', recovery: '경미하면 보온으로 수시간, 심부 저체온은 의료적 가온 필요.', aftermath: '동반 동상, 심장 리듬 이상. 회복 후에도 추위에 예민.', myth: '“떨림이 멈췄으니 괜찮다”는 정반대 — 떨림이 그친 건 더 위험한 단계다.' },
      { name: '열사병', aka: '고열·일사병', severity: '중상~치명적', signs: '땀이 멎고 피부가 뜨겁고 건조, 혼란·헛소리·경련. 체온이 위험하게 치솟는다.', pain: '두통·메스꺼움과 ‘머리가 끓는’ 답답함, 의식이 오락가락.', firstaid: '그늘·시원한 곳, 즉시 적극적으로 식힌다(물·바람·찬 천). 의식 저하면 응급.', recovery: '빠른 냉각이 생사를 가른다. 회복 후에도 며칠 무기력.', aftermath: '장기 손상 가능, 한동안 더위에 약해진다.', myth: '“땀 뻘뻘 흘리니 괜찮다”와 반대 — 땀이 멎고 마른 피부가 더 위험한 신호.' },
      { name: '탈수', aka: '수분 부족', severity: '경상~중상', signs: '갈증·입마름·소변 감소·진한 색, 어지럼·두통, 심하면 피부 탄력 저하·혼미.', pain: '두통과 무기력, ‘기운이 쭉 빠지는’ 느낌.', firstaid: '조금씩 자주 수분·전해질. 한 번에 많이 들이켜면 도리어 탈.', recovery: '경미하면 수분 보충으로 빠르게, 심하면 수액.', aftermath: '대개 후유 없음, 반복되면 신장 부담.', myth: '“목마를 때만 마시면 된다”는 부족 — 갈증은 이미 탈수가 시작된 신호다.' },
      { name: '탈진·과로', aka: '극도의 피로', severity: '경상~중등', signs: '다리에 힘이 풀리고 손이 떨림, 집중력·판단력 급락, 추위·메스꺼움.', pain: '근육의 둔한 통증과 ‘한 발도 못 떼겠는’ 무력감.', firstaid: '휴식·당분·수분·보온. 무리하면 사고·이차 부상으로 이어진다.', recovery: '한숨 자고 먹으면 상당히 회복, 누적되면 며칠 필요.', aftermath: '면역 저하, 판단 실수로 인한 이차 사고가 진짜 위험.', myth: '“의지로 버티면 된다”는 한계가 있다 — 몸은 결국 멈춘다, 그 순간이 클라이맥스가 된다.' },
      { name: '고산병', aka: '고도 적응 실패', severity: '경상~치명적', signs: '두통·메스꺼움·불면(경증), 심하면 폐·뇌에 물이 차 호흡곤란·심한 혼란.', pain: '쪼개지는 두통과 숨 가쁨, 가만히 있어도 심장이 뛴다.', firstaid: '근본 처치는 ‘내려가는 것’. 휴식·수분으로 적응을 돕되 악화 시 즉시 하강.', recovery: '하강하면 대개 빠르게 호전, 중증은 의료 처치.', aftermath: '대개 후유 없음, 중증 뇌·폐부종은 위험.', myth: '“체력 좋으면 안 걸린다”는 오해 — 적응 속도의 문제라 누구나 걸릴 수 있다.' },
    ],
  },
  {
    key: 'care', label: '응급처치·간호 기본', icon: '🚑',
    note: '“누가, 어떻게 살리는가”의 개념 사전. 현장 처치·회복기 간호 묘사의 토대.',
    items: [
      { name: '지혈의 원칙', aka: '직접 압박', severity: '—', signs: '대량 출혈은 분초를 다툰다 — 가장 먼저, 가장 강하게 누르는 게 기본.', pain: '눌리는 통증을 호소해도 압박을 유지하는 ‘냉정함’이 처치자의 캐릭터를 드러낸다.', firstaid: '깨끗한 천으로 직접·강하게 압박 → 안 멈추면 상처 위쪽을 지혈대로. 시간을 기록한다.', recovery: '지혈 후엔 안정·수분, 실혈량에 따라 며칠 어지럽다.', aftermath: '지혈대 장시간은 그 아래 조직 손상 — 양날의 검.', myth: '“상처를 심장보다 높이”만으로 대량 출혈이 멎지 않는다 — 직접 압박이 우선.' },
      { name: '기도 확보·회복자세', aka: '옆으로 눕히기', severity: '—', signs: '의식이 흐린 사람을 똑바로 눕히면 혀·토물이 기도를 막는다.', pain: '본인은 무의식이라, 곁의 인물이 ‘무엇을 아는가’가 생사를 가른다.', firstaid: '의식 저하·구토 위험 시 옆으로 눕혀 기도를 확보(회복 자세). 호흡을 계속 살핀다.', recovery: '원인 처치가 핵심, 기도 막힘은 분초의 문제.', aftermath: '흡인이 일어났다면 폐렴 위험.', myth: '“토하는 사람을 일으켜 등을 두드린다”보다, 옆으로 눕히는 게 안전한 상황이 많다.' },
      { name: '심폐소생술 개념', aka: '가슴압박', severity: '—', signs: '반응·호흡이 없으면 멈춘 심장을 ‘대신 펌프질’ 해주는 행위 — 강하고 빠르게, 끊김 없이.', pain: '압박으로 갈비뼈가 부러지기도 — 그래도 멈추지 않는 ‘각오’가 장면의 긴장.', firstaid: '가슴 중앙을 깊고 빠르게 압박, 도움 요청·자동제세동기 확보. 지칠 때까지 또는 교대.', recovery: '되살아나도 한동안 위중, 즉시 병원.', aftermath: '압박으로 인한 늑골 골절·멍은 흔하다(살린 대가).', myth: '“몇 번 누르니 벌떡 일어나 멀쩡”은 드물다 — 돌아와도 한동안 의식이 혼미하다.' },
      { name: '쇼크 대응', aka: '순환 부전', severity: '—', signs: '창백·식은땀·빠르고 약한 맥, 어지럼·의식 저하. 큰 부상·출혈·중증 알레르기의 공통 위험.', pain: '본인은 ‘점점 멀어지는’ 감각, 추위와 갈증을 호소.', firstaid: '눕히고 보온, 출혈 등 원인 처치, 즉시 이송. 함부로 물·음식 주지 않는다.', recovery: '원인 해결 없이는 회복 안 됨 — 쇼크 자체가 응급.', aftermath: '저혈류가 길면 장기 손상.', myth: '“쇼크엔 뺨을 때려 정신 차리게”는 무의미 — 순환을 살리는 게 본질.' },
      { name: '감염·패혈증 경고', aka: '상처 곪음', severity: '—', signs: '상처가 붉게 번지고 열·고름·악취, 전신 발열·오한이면 위험(패혈증으로 진행).', pain: '욱신거리는 박동성 통증, 주변이 뜨겁고 부어오른다.', firstaid: '청결·세척·소독이 예방의 핵심, 번지는 발적·발열은 즉시 치료.', recovery: '항생 치료로 호전, 늦으면 전신으로 번져 생명 위협.', aftermath: '심한 감염은 조직 손상·절단, 패혈증 후유.', myth: '“시간 지나면 알아서 낫는다”가 위험 — 더러운 상처는 며칠 만에 전신을 무너뜨린다.' },
      { name: '재활·회복기 묘사', aka: '리해빌리테이션', severity: '—', signs: '뼈·근육이 붙은 뒤가 진짜 시작 — 굳은 관절, 가늘어진 근육을 되살리는 더딘 과정.', pain: '재활의 통증은 ‘나아지기 위한 아픔’ — 캐릭터의 인내와 변화를 그리기 좋다.', firstaid: '— (회복기 개념)', recovery: '부상 깊이의 몇 배가 걸리기도 — 큰 골절·수술은 수개월의 재활.', aftermath: '완전 회복도, 영구적 제약도 가능 — 후유는 캐릭터의 새 ‘특징’이 된다.', myth: '“깁스 풀자마자 전과 똑같이”는 비현실 — 풀린 직후가 가장 약하고 어색하다.' },
    ],
  },
]

const LS = 'sry:tool:injury-recovery-ref:'
const ALL = '__all__'

type Flat = { cat: CatDef; item: Entry }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))
const flatOf = (catKey: string): Flat[] =>
  catKey === ALL ? flatAll() : CATS.filter((c) => c.key === catKey).flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 항목 → 필드 라벨 묶음
const FIELDS: { k: keyof Entry; label: string }[] = [
  { k: 'aka', label: '범주·이칭' },
  { k: 'severity', label: '위중도' },
  { k: 'signs', label: '증상·겉모습' },
  { k: 'pain', label: '통증·감각' },
  { k: 'firstaid', label: '현장 응급처치' },
  { k: 'recovery', label: '회복 경과' },
  { k: 'aftermath', label: '후유증·흉터' },
  { k: 'myth', label: '흔한 오류·유의' },
]

function plainText(f: Flat): string {
  const lines = [`🩹 ${f.item.name}  (${f.cat.label})`]
  for (const fd of FIELDS) {
    const v = f.item[fd.k]
    if (v) lines.push(`· ${fd.label}: ${v}`)
  }
  return lines.join('\n')
}

function bodyHtml(f: Flat): string {
  const rows = FIELDS
    .filter((fd) => f.item[fd.k])
    .map((fd) => `<p><b>${escapeHtml(fd.label)}</b>: ${escapeHtml(String(f.item[fd.k]))}</p>`)
    .join('')
  return [
    `<p><b>${escapeHtml(f.cat.icon + ' ' + f.cat.label)} · ${escapeHtml(f.item.name)}</b></p>`,
    rows,
    `<p><i>※ 액션·메디컬 창작 고증용 참고 자료입니다. 의학적 자문·실제 응급처치 지침이 아닙니다.</i></p>`,
  ].join('')
}

export default function InjuryRecoveryRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 가 오면 안내 힌트로 활용(맥락 활용)
  const genreHint = typeof payload?.genre === 'string' ? (payload.genre as string) : ''

  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL
  })
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [random, setRandom] = useState<Flat | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const copyTimer = useRef<number | null>(null)
  const toastTimer = useRef<number | null>(null)

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  // 언마운트 정리: 복사·토스트 타이머 취소
  useEffect(() => () => {
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
  }, [])

  const total = CATS.reduce((n, c) => n + c.items.length, 0)
  const favKey = (catKey: string, name: string) => `${catKey}::${name}`

  const q = query.trim().toLowerCase()
  let filtered: Flat[] = flatOf(cat)
  if (onlyFav) filtered = filtered.filter(({ cat: c, item }) => favs[favKey(c.key, item.name)])
  if (q) {
    filtered = filtered.filter(({ cat: c, item }) => {
      if (c.label.toLowerCase().includes(q)) return true
      if (item.name.toLowerCase().includes(q)) return true
      return FIELDS.some((fd) => String(item[fd.k] || '').toLowerCase().includes(q))
    })
  }

  const rollRandom = () => {
    const pool = flatOf(cat)
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.name === prev.item.name && pick.cat.key === prev.cat.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return pick
    })
  }

  const toggleFav = (catKey: string, name: string) => {
    const k = favKey(catKey, name)
    setFavs((prev) => { const next = { ...prev }; if (next[k]) delete next[k]; else next[k] = true; return next })
  }
  const toggleExpand = (k: string) => setExpanded((prev) => ({ ...prev, [k]: !prev[k] }))

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* graceful */ })
  }

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2400)
  }

  // 스니펫 라이브러리 저장(글감)
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: `[부상 자료] ${plainText(f)}`,
      source: '부상·회복 리얼리즘 사전',
      tags: ['부상', '회복', '고증', f.cat.label, f.item.name],
    })
    flash(`스니펫 라이브러리에 ‘${f.item.name}’ 자료를 저장했습니다.`)
  }

  // 수집함에 담기
  const toStash = (f: Flat) => {
    if (!hasStash()) { flash('수집함에 연결되어 있지 않습니다.'); return }
    addToStash({ kind: 'note', label: `${f.item.name} (${f.cat.label})`, text: plainText(f) })
    flash(`수집함에 ‘${f.item.name}’을(를) 담았습니다.`)
  }

  // 프로젝트 자료에 추가
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '부상·회복 자료',
      title: `${f.item.name} (${f.cat.label})`,
      bodyHtml: bodyHtml(f),
      meta: { 분류: f.cat.label, 위중도: f.item.severity || '', 회복: f.item.recovery ? '경과 있음' : '' },
    })
    if (id) flash(`프로젝트 자료 〈부상·회복 자료〉에 ‘${f.item.name}’을(를) 추가했습니다.`)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  const sevColor = (sev?: string) => {
    if (!sev) return 'var(--muted)'
    if (sev.includes('치명')) return 'var(--accent)'
    if (sev.includes('중상')) return 'var(--accent)'
    return 'var(--ok)'
  }

  const renderFields = (item: Entry) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
      {FIELDS.filter((fd) => item[fd.k]).map((fd) => (
        <div key={fd.k} style={{ fontSize: 12.5, lineHeight: 1.55 }}>
          <span style={{ color: fd.k === 'severity' ? sevColor(item.severity) : 'var(--accent)', fontWeight: 600, marginRight: 6 }}>{fd.label}</span>
          <span>{String(item[fd.k])}</span>
        </div>
      ))}
    </div>
  )

  return (
    <div style={wrap}>
      {/* 창작 참고용 명시 — 가장 위에 고정 */}
      <div style={{
        background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)',
        borderRadius: 8, padding: '8px 11px', fontSize: 12, lineHeight: 1.55, color: 'var(--muted)',
      }}>
        <Emoji e="⚠️"/> <b style={{ color: 'var(--text)' }}>창작 고증 참고 자료</b>입니다. 액션·메디컬·서바이벌 묘사의 개연성을 돕는 서사용 단서이며,
        <b style={{ color: 'var(--text)' }}> 의학적 자문이나 실제 응급처치 지침이 아닙니다.</b> 실제 상황에서는 전문 의료에 따르세요.
      </div>

      <div style={hint}>
        자상·골절·화상·총상·중독·환경 손상·응급처치 등 <b>{total}개</b> 항목을 카테고리로 정리했습니다.
        검색·펼침으로 찾고, 무작위로 영감을 얻고, 클릭해 복사하거나 수집함·스니펫·프로젝트로 보내세요.
        {genreHint ? <>  (전달된 맥락: <b>{genreHint}</b>)</> : null}
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름·증상·후유증으로 검색 (예: 출혈, 흉터, 호흡곤란, 재활)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL)} aria-pressed={cat === ALL}
          style={{ borderColor: cat === ALL ? 'var(--accent)' : 'var(--border)', color: cat === ALL ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🗂️"/> 전체
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={c.icon}/> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 무작위 뽑기</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 무작위 결과 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon}/> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          {renderFields(random.item)}
          <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(plainText(random), 'rnd')}>
              {copiedKey === 'rnd' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="💾"/> 스니펫 저장</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>
              {favs[favKey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
          <div className="linkbar" style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
            <button className="linkbtn" onClick={() => toStash(random)} disabled={!hasStash()}
              title={hasStash() ? '이 자료를 수집함에 담기' : '수집함에 연결되어 있지 않습니다'}>
              <Emoji e="📎"/> 수집함
            </button>
            <button className="linkbtn" onClick={() => toProject(random)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '프로젝트 자료 〈부상·회복 자료〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('scene-forge')} title="장면 단조기 열기(부상 장면 묘사로 확장)"><Emoji e="🎬"/> 장면 단조기</button>
            <button className="linkbtn" onClick={() => openToolLinked('event-timeline')} title="사건 연대표 열기(회복 경과·시간 흐름 정리)"><Emoji e="🕰️"/> 사건 연대표</button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5 }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록(펼침형) */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 자료가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const fk = favKey(c.key, item.name)
            const open = !!expanded[fk]
            const isFav = !!favs[fk]
            return (
              <div key={fk} style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon}/> {c.label}</span>
                  <button onClick={() => toggleExpand(fk)} title={open ? '접기' : '펼치기'}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', fontSize: 15, fontWeight: 700, textAlign: 'left' }}>
                    {open ? '▾' : '▸'} {item.name}
                  </button>
                  {item.severity && (
                    <span style={{ fontSize: 10.5, color: sevColor(item.severity), border: `1px solid ${sevColor(item.severity)}`, borderRadius: 6, padding: '1px 5px', flexShrink: 0 }}>
                      {item.severity}
                    </span>
                  )}
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(c.key, item.name)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                {!open && item.signs && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.signs}
                  </div>
                )}
                {open && renderFields(item)}
                {open && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
                    <button className="minibtn" onClick={() => copy(plainText({ cat: c, item }), 'item:' + fk)}>
                      {copiedKey === 'item:' + fk ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
                    </button>
                    <button className="minibtn" onClick={() => saveSnippet({ cat: c, item })}><Emoji e="💾"/> 스니펫 저장</button>
                    <button className="linkbtn" onClick={() => toStash({ cat: c, item })} disabled={!hasStash()}
                      title={hasStash() ? '수집함에 담기' : '수집함에 연결되어 있지 않습니다'}>
                      <Emoji e="📎"/> 수집함
                    </button>
                    <button className="linkbtn" onClick={() => toProject({ cat: c, item })} disabled={!hasProjectBridge()}
                      title={hasProjectBridge() ? '프로젝트 자료에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                      <Emoji e="📄"/> 프로젝트에 추가
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>리얼리즘은 ‘정확한 의학’이 아니라 ‘납득되는 고통과 시간’입니다. 회복 기간·후유증을 이야기에 녹여 인물에게 무게를 더하세요.</div>
    </div>
  )
}
