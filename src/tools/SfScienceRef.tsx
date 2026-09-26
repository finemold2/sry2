// SF 과학 개념 사전 — SF·과학소설 창작 고증용.
// 상대성·시간지연/중력·궤도역학/우주환경(진공·방사선·무중력)/광속한계/엔트로피·열역학/
// 양자·정보/항성·천체/이론·가설적 물리(웜홀·워프·차원) 등 과학 개념을
// 쉬운 설명 + "창작 활용 팁"으로 모은 100% 로컬 사전.
// 자급식: react 와 './linkbus' 외 의존 없음. Math.random + localStorage(펼침·즐겨찾기·마지막 카테고리)만 사용.
import { useState, useEffect, useMemo, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'sf-science-ref', name: 'SF 과학 개념 사전', icon: '🛰️', group: '지식 사전', genre: 'SF·과학소설', intro: '상대성·시간지연·궤도역학·우주환경·광속한계·엔트로피 등 과학 개념을 쉬운 설명+창작 활용 팁으로', w: 660, h: 680 }

interface Term { name: string; aka?: string; def: string; tip: string }
interface CatDef { key: string; label: string; icon: string; items: Term[] }

// 로컬 SF 과학 개념 사전 — 9개 카테고리, 합계 120+ 항목. 모두 자작 설명(창작 고증용 개관).
const CATS: CatDef[] = [
  {
    key: 'relativity', label: '상대성·시공간', icon: '🕰️', items: [
      { name: '특수 상대성 이론', aka: 'Special Relativity', def: '빛의 속도는 누가 재든 같고, 빠르게 움직이는 물체는 시간이 느려지고 길이가 줄어든다는 이론(아인슈타인, 1905). 절대적 시간·공간 대신 관측자마다 다른 시공간을 말한다.', tip: '"동시에"라는 말이 관측자마다 다르다는 점을 이용하라 — 한 사건이 누구에겐 먼저, 누구에겐 나중이 되는 알리바이·음모 트릭.' },
      { name: '일반 상대성 이론', aka: 'General Relativity', def: '중력은 힘이 아니라 질량이 시공간을 휘게 만든 결과라는 이론(1915). 행성은 휘어진 시공간 위를 굴러가듯 공전한다.', tip: '"중력은 곧 휘어진 시간"이다. 거대 질량 근처에서 시간이 느려지는 설정으로 세대 격차·재회의 비극을 만들어라.' },
      { name: '시간 지연', aka: '시간 팽창 / Time Dilation', def: '빠르게 움직이거나 강한 중력 속에 있으면 그 사람의 시간이 바깥보다 느리게 흐른다. 광속에 가까울수록 효과가 극적으로 커진다.', tip: 'SF의 만능 카드. 우주를 다녀온 1년 사이 지구는 수십 년이 흘러 — 연인·자식이 늙거나 죽어 있는 귀환의 비애.' },
      { name: '쌍둥이 역설', aka: 'Twin Paradox', def: '한 쌍둥이가 광속에 가까운 우주여행을 다녀오면, 떠난 쪽이 남은 쪽보다 덜 늙는다. 가속·감속을 겪은 쪽이 "젊게" 돌아온다.', tip: '형제·동료·연인을 한 명은 보내고 한 명은 남겨라. 돌아온 자와 기다린 자의 나이가 뒤집히는 순간이 곧 클라이맥스다.' },
      { name: '중력 시간 지연', aka: 'Gravitational Time Dilation', def: '중력이 강할수록 시간이 느려진다. 블랙홀 근처의 1시간이 먼 우주의 7년이 될 수도 있다.', tip: '행성 한 번 다녀오니 동료들이 수십 년 늙어 있는 설정 — "딸에게 보낸 메시지가 쌓여 있는" 식의 감정 폭탄.' },
      { name: '동시성의 상대성', aka: 'Relativity of Simultaneity', def: '두 사건이 "동시에" 일어났는지조차 관측자의 운동 상태에 따라 달라진다. 절대적 "지금"은 없다.', tip: '함대 두 척이 "동시에" 발포 명령을 받았다고 믿지만 사실은 그렇지 않았다 — 전쟁의 책임을 둘러싼 법정·정치 드라마.' },
      { name: '길이 수축', aka: '로런츠 수축 / Length Contraction', def: '빠르게 움직이는 물체는 진행 방향으로 길이가 줄어든 것으로 관측된다. 광속에 다가갈수록 납작해진다.', tip: '광속 우주선이 좁은 관문을 "줄어들어" 통과하는 역설적 장면 — 관측자마다 본 그림이 다른 진술의 엇갈림.' },
      { name: '시공간', aka: '민코프스키 시공간 / Spacetime', def: '공간 3차원과 시간 1차원을 하나로 엮은 4차원 무대. 사건은 이 안의 한 점(좌표)으로 표현된다.', tip: '"좌표를 안다"는 것은 장소뿐 아니라 시점까지 안다는 것 — 시공간 좌표가 곧 보물지도·암살 표적이 되는 설정.' },
      { name: '광추', aka: '빛 원뿔 / Light Cone', def: '한 사건에서 빛이 닿을 수 있는 시공간의 원뿔 영역. 이 바깥은 인과적으로 영향을 주고받을 수 없다.', tip: '"네가 아무리 빨라도 저 별의 그 사건엔 결코 닿을 수 없다"는 물리적 한계가 추격·구조 서사의 절망을 빚는다.' },
      { name: '관성 좌표계', aka: 'Inertial Frame', def: '가속하지 않고 등속으로 움직이는 기준틀. 모든 관성계에서 물리 법칙은 똑같이 성립한다(상대성 원리).', tip: '"창문 없는 방 안에서는 내가 멈췄는지 등속으로 나는지 알 수 없다" — 거대 우주선 내부 미스터리의 전제.' },
      { name: '고유 시간', aka: 'Proper Time', def: '한 물체가 자기 자신의 시계로 직접 재는 시간. 관측자마다 다른 좌표 시간과 달리, 그 물체에게 "실제로" 흐른 시간이다.', tip: '여행자의 일기장 날짜와 지구의 달력이 어긋나는 설정 — 누구의 시간이 "진짜"인가라는 철학적 질문.' },
    ],
  },
  {
    key: 'gravity', label: '중력·궤도역학', icon: '🪐', items: [
      { name: '궤도', aka: 'Orbit', def: '한 천체가 다른 천체 둘레를 도는 닫힌 경로. 앞으로 나아가려는 관성과 끌어당기는 중력이 균형을 이뤄 "끝없이 떨어지는" 상태다.', tip: '"궤도에 있다 = 영원히 추락 중"이라는 사실은 직관에 반한다. 동력을 잃은 우주선이 별로 빨려드는 카운트다운 긴장.' },
      { name: '탈출 속도', aka: 'Escape Velocity', def: '천체의 중력을 완전히 벗어나 돌아오지 않는 데 필요한 최소 속도. 지구는 초속 약 11.2km, 달은 그 5분의 1쯤.', tip: '연료가 탈출 속도에 0.1초 모자라 다시 떨어지는 순간 — 발사 시퀀스의 손에 땀 쥐는 한 줄.' },
      { name: '제1우주속도', aka: '원궤도 속도 / Orbital Velocity', def: '지표면 가까이에서 원궤도를 돌 수 있는 속도(지구 약 초속 7.9km). 이보다 느리면 떨어지고, 빠르면 더 높은 궤도로 간다.', tip: '"조금만 더 빨랐다면 살았을 것이다" — 속도 부족으로 대기에 다시 떨어지는 비극의 물리적 근거.' },
      { name: '라그랑주 점', aka: 'Lagrange Point', def: '두 천체의 중력과 원심력이 균형을 이뤄 작은 물체가 상대 위치를 유지하는 다섯 지점(L1~L5). 우주 정거장·망원경의 명당.', tip: 'L4·L5는 안정적이라 거대 식민지·비밀 기지를 숨기기 좋다. "지도에 없는 정거장"의 그럴듯한 위치.' },
      { name: '스윙바이', aka: '중력 보조 / Gravity Assist', def: '행성의 중력과 운동을 빌려 연료 없이 우주선을 가속·감속하거나 방향을 트는 기술. 보이저 탐사선의 비결.', tip: '연료가 바닥난 우주선이 행성을 "새총"처럼 이용해 살아 돌아오는 마지막 수 — 머리싸움 SF의 클라이맥스.' },
      { name: '근점·원점', aka: '근지점·원지점 / Periapsis·Apoapsis', def: '타원 궤도에서 천체에 가장 가까운 점(근점)과 가장 먼 점(원점). 근점에서 가장 빠르고 원점에서 가장 느리다.', tip: '"근점에서만 통신이 닿는다"는 제약으로, 몇 시간·며칠에 한 번만 메시지를 주고받는 긴장감을 만들어라.' },
      { name: '호만 전이 궤도', aka: 'Hohmann Transfer', def: '두 원궤도 사이를 가장 적은 연료로 이동하는 타원 궤도. 대신 시간이 오래 걸린다(지구→화성 약 7~9개월).', tip: '"연료를 아끼면 몇 달, 서두르면 연료가 동난다"는 딜레마 — 구조 임무의 시간 압박을 정직하게 깔아라.' },
      { name: '조석력', aka: 'Tidal Force', def: '한 물체의 가까운 쪽과 먼 쪽이 받는 중력 차이로 생기는 늘이는 힘. 달이 바다를 부풀리고, 강한 곳에선 위성을 부순다.', tip: '거대 행성·블랙홀 곁의 위성이 조석력에 찢겨 고리가 되는 묵시록적 풍경 — "스파게티화"의 전조.' },
      { name: '로슈 한계', aka: 'Roche Limit', def: '위성이 모행성에 너무 가까워지면 조석력이 자체 중력을 이겨 산산이 부서지는 거리. 토성 고리의 기원 가설.', tip: '추락하는 위성·우주선이 로슈 한계를 넘는 순간 천천히 분해되는 장면 — 느리지만 피할 수 없는 종말.' },
      { name: '동기 궤도', aka: '정지 궤도 / Geostationary Orbit', def: '행성의 자전과 같은 주기로 돌아 지표의 한 지점 위에 늘 떠 있는 것처럼 보이는 궤도(지구는 고도 약 35,786km).', tip: '"늘 같은 도시 위를 내려다보는" 감시 위성·궤도 도시 설정 — 빅브라더 디스토피아의 눈.' },
      { name: '미소중력', aka: '무중력 / Microgravity', def: '궤도에서 모든 것이 함께 자유낙하 중이라 무게가 사라진 것처럼 느껴지는 상태. 진짜 "중력 0"이 아니라 떨어지는 중이다.', tip: '액체가 구슬처럼 떠다니고 불이 둥근 공처럼 타며, 오래 머물면 뼈·근육이 약해진다 — 디테일이 리얼리티를 만든다.' },
      { name: '인공 중력', aka: 'Artificial Gravity', def: '회전하는 우주선·정거장의 원심력으로 "바깥쪽이 아래"가 되게 해 중력을 흉내 내는 방식. 반지름이 클수록 어지럼이 적다.', tip: '회전 도시에서 위로 던진 공이 옆으로 휘는(코리올리 효과) 디테일, 중심축에 가까울수록 가벼워지는 계급 구조를 짜라.' },
    ],
  },
  {
    key: 'space-env', label: '우주 환경', icon: '🌌', items: [
      { name: '진공', aka: 'Vacuum', def: '공기가 거의 없는 우주 공간. 소리가 전달되지 않고, 압력이 없어 액체가 끓듯 증발한다. 단열되어 열이 잘 빠지지 않는다.', tip: '"우주에서는 비명이 들리지 않는다." 폭발도 무음, 통신만이 유일한 소리 — 정적 자체를 공포의 도구로.' },
      { name: '우주 노출', aka: 'Vacuum Exposure', def: '진공에 노출되면 폭발하지 않는다. 의식은 약 15초 내 잃고, 산소 부족과 감압이 치명적이며 침·눈물이 끓어오른다.', tip: '"몸이 터진다"는 흔한 오류를 피하라. 진실은 더 조용하고 끔찍하다 — 의식 잃기 직전의 15초를 슬로모션으로.' },
      { name: '우주 방사선', aka: 'Cosmic Radiation', def: '태양·은하에서 오는 고에너지 입자. 지구 자기장 밖에선 막을 길이 적어 DNA 손상·암·전자장비 오류를 일으킨다.', tip: '장기 우주여행의 보이지 않는 적. 차폐벽 두께를 둘러싼 자원 갈등, 누적 피폭량 카운터가 곧 수명 시계.' },
      { name: '태양 플레어', aka: '태양 폭발 / Solar Flare', def: '태양 표면의 폭발로 강렬한 방사선과 입자가 쏟아지는 현상. 통신·전력망을 마비시키고 우주 비행사에 치명적이다.', tip: '"플레어 경보 — 차폐실까지 20분." 자연재해형 카운트다운, 약자를 누가 먼저 들여보낼지 도덕적 선택.' },
      { name: '밴앨런대', aka: 'Van Allen Belts', def: '지구 자기장에 붙잡힌 고에너지 입자의 도넛형 띠. 위성과 유인선이 통과할 때 방사선 위험을 준다.', tip: '"이 띠를 빠르게 통과해야 한다"는 발사 초반의 숨은 관문 — 리얼리티를 더하는 한 줄.' },
      { name: '극저온', aka: 'Cryogenic Cold', def: '햇빛이 닿지 않는 우주는 절대영도(-273.15°C)에 가깝게 차갑다. 하지만 진공이라 열은 복사로만 천천히 빠진다.', tip: '"우주는 차갑지만 우주복은 오히려 과열을 걱정한다"는 반전 — 흔한 클리셰를 뒤집는 전문가 캐릭터의 대사.' },
      { name: '복사 냉각', aka: 'Radiative Cooling', def: '진공에선 전도·대류가 없어 열을 적외선 복사로만 버린다. 그래서 우주선은 거대한 방열판(라디에이터)이 필요하다.', tip: '"방열판이 손상되면 안에서 쪄 죽는다." 우주의 추위가 아니라 자기 열에 갇히는 역설적 위기.' },
      { name: '미소 운석', aka: '마이크로메테오로이드 / Micrometeoroid', def: '모래알만 한 우주 먼지도 초속 수십 km로 날아와 총탄 같은 위력을 낸다. 외벽·창에 작은 구멍을 낸다.', tip: '"손톱만 한 구멍 하나"가 서서히 공기를 빼앗는 느린 재난 — 범인을 찾기 어려운 사보타주의 위장.' },
      { name: '우주 쓰레기', aka: '궤도 잔해 / Space Debris', def: '폐위성·로켓 파편 등이 궤도에 떠도는 것. 초고속이라 작은 조각도 위협적이며, 충돌이 충돌을 부른다.', tip: '연쇄 충돌이 궤도 전체를 파편 지옥으로 만드는 "케슬러 증후군" — 인류가 지구에 갇히는 디스토피아의 씨앗.' },
      { name: '케슬러 증후군', aka: 'Kessler Syndrome', def: '궤도 잔해 충돌이 연쇄적으로 잔해를 늘려, 결국 궤도가 파편으로 가득 차 우주 진입이 불가능해지는 시나리오.', tip: '"하늘에 갇힌 인류" — 별을 올려다보지만 결코 나갈 수 없는 세대의 한(恨)을 그리는 비극적 배경.' },
      { name: '우주 멀미', aka: '우주 적응 증후군 / Space Adaptation Syndrome', def: '무중력에서 평형 감각이 혼란해 생기는 메스꺼움·방향 감각 상실. 보통 며칠 내 적응한다.', tip: '베테랑과 신참을 가르는 디테일 — 토하는 신참, 태연한 고참의 대비로 캐릭터 위계를 보여줘라.' },
      { name: '감압병', aka: '잠수병 / Decompression Sickness', def: '주변 압력이 급히 낮아지면 체액 속 기체가 거품이 되어 관절·혈관을 막는 병. 선외활동 전 사전 호흡으로 예방한다.', tip: '"우주복을 너무 빨리 입었다." 서두른 선외활동이 부른 보이지 않는 내상 — 시간에 쫓길 때의 대가.' },
    ],
  },
  {
    key: 'lightspeed', label: '광속·통신 한계', icon: '💡', items: [
      { name: '광속', aka: '빛의 속도 / Speed of Light', def: '진공에서 빛이 나아가는 속도, 초속 약 299,792km. 우주 정보 전달의 절대 상한선으로 어떤 것도 이를 넘지 못한다.', tip: '광속은 SF의 "벽"이다. 이 벽을 인정하느냐(하드 SF) 깨느냐(스페이스 오페라)가 작품의 톤을 결정한다.' },
      { name: '광속 한계', aka: '우주 속도 제한 / Light-speed Limit', def: '질량이 있는 물체는 광속에 다가갈수록 무한한 에너지가 필요해 결코 광속에 닿을 수 없다. 정보·인과도 광속을 못 넘는다.', tip: '"더 빨리 갈 수 없다"는 절망이 곧 우주의 광막함을 빚는다. 옆 별까지도 수십 년 — 거리 자체가 적이다.' },
      { name: '광년', aka: 'Light-year', def: '빛이 1년 동안 가는 거리(약 9.46조 km). 거리의 단위지 시간 단위가 아니다. 가장 가까운 별도 약 4.2광년.', tip: '"4광년"은 곧 "가장 빨라도 4년 전 모습"이라는 뜻 — 우리가 보는 별빛은 모두 과거다. 향수와 상실의 은유.' },
      { name: '통신 지연', aka: 'Communication Lag', def: '광속이라도 거리만큼 시간이 걸린다. 지구↔화성은 편도 3~22분, 실시간 대화가 불가능하다.', tip: '"네 답을 들으려면 40분을 기다려야 해." 즉답할 수 없는 대화가 빚는 외로움·오해 — 거리의 잔혹함.' },
      { name: '광지평선', aka: '관측 가능 우주 / Observable Universe', def: '빅뱅 이후 빛이 우리에게 닿을 시간이 있었던 범위. 그 너머는 영원히 볼 수도, 닿을 수도 없다.', tip: '"우주는 무한할지 몰라도 우리가 닿을 곳은 유한하다." 도달 불가능한 영역이 미지·신앙·금기의 무대가 된다.' },
      { name: '적색편이', aka: 'Redshift', def: '멀어지는 광원의 빛은 파장이 늘어나 붉게 보인다. 멀리 있는 은하일수록 더 붉어 우주 팽창의 증거가 된다.', tip: '"별빛이 점점 붉어진다 = 우리가 멀어지고 있다." 헤어짐·이별을 천문 현상으로 시각화하는 시적 장치.' },
      { name: '청색편이', aka: 'Blueshift', def: '다가오는 광원의 빛은 파장이 짧아져 푸르게 보인다. 안드로메다 은하처럼 접근하는 천체에서 나타난다.', tip: '광속에 가깝게 정면으로 날면 앞은 푸르게, 뒤는 붉게 — 우주 항해의 환상적 시야를 그릴 디테일.' },
      { name: '도플러 효과', aka: 'Doppler Effect', def: '광원·음원이 가까워지면 파장이 짧아지고 멀어지면 길어지는 현상. 속도·방향을 알아내는 단서가 된다.', tip: '레이더·통신의 미세한 주파수 변화로 "보이지 않는 적함의 접근"을 감지하는 추리형 우주 전투.' },
      { name: '광압', aka: '복사압 / Radiation Pressure', def: '빛이 물체에 부딪쳐 미는 힘. 아주 약하지만 우주에선 솔라 세일(태양돛)을 밀어 연료 없이 가속할 수 있다.', tip: '연료 없이 별빛만으로 나아가는 거대한 돛 — 느리지만 영원히 가속하는 우아한 항해의 이미지.' },
      { name: '인과율', aka: 'Causality', def: '원인이 결과보다 먼저 와야 한다는 원칙. 광속을 넘는 정보 전달은 이 순서를 뒤집어 시간 역설을 부른다.', tip: '"FTL 통신 = 사실상 시간 여행"이라는 물리적 함정. 초광속을 허용하면 인과 붕괴를 반드시 다뤄야 한다.' },
    ],
  },
  {
    key: 'thermo', label: '엔트로피·열역학', icon: '🔥', items: [
      { name: '엔트로피', aka: 'Entropy', def: '무질서·흩어짐의 정도. 닫힌 계에서 엔트로피는 늘기만 한다(열역학 제2법칙). "되돌릴 수 없음"의 척도다.', tip: '엔트로피는 시간의 화살이자 죽음의 은유. "질서를 지키려는 싸움"은 결국 진다 — 비극적 SF의 철학적 뼈대.' },
      { name: '열역학 제1법칙', aka: '에너지 보존 / Conservation of Energy', def: '에너지는 새로 생기거나 사라지지 않고 형태만 바뀐다. "공짜 에너지"는 없다.', tip: '영구기관·무한 에너지 설정은 이 법칙을 깬다. 깨려면 "어디서 빌려 오는가"를 반드시 설명해 설득력을 챙겨라.' },
      { name: '열역학 제2법칙', aka: 'Second Law', def: '열은 저절로 뜨거운 데서 찬 데로만 흐르고, 전체 무질서는 늘기만 한다. 100% 효율의 기관은 불가능하다.', tip: '"공짜 점심은 없다"의 물리 버전. 어떤 기적의 기술도 폐열·낭비를 남긴다는 제약이 하드 SF의 정직함이다.' },
      { name: '열역학 제3법칙', aka: 'Third Law', def: '절대영도(0K)에는 도달할 수 없다. 다가갈수록 더 큰 노력이 필요해 완전한 정지는 불가능하다.', tip: '"절대영도 직전의 실험실"에서 벌어지는 미스터리 — 닿을 수 없는 한계를 향한 광기 어린 집착.' },
      { name: '열사', aka: '우주의 열적 죽음 / Heat Death', def: '먼 미래, 우주 전체의 엔트로피가 최대가 되어 에너지 차이가 사라지고 아무 일도 일어날 수 없게 되는 종말 시나리오.', tip: '수조 년 뒤 모든 별이 꺼진 암흑 — "마지막 빛", "엔트로피와 싸우는 최후의 지성" 같은 장대한 묵시록의 무대.' },
      { name: '맥스웰의 악마', aka: "Maxwell's Demon", def: '빠른 분자와 느린 분자를 골라내 공짜로 온도 차를 만든다는 사고실험 속 존재. 정보 처리에도 대가가 든다는 결론에 이른다.', tip: '"질서를 공짜로 만드는 존재"를 AI·초지성으로 의인화하라 — 정보가 곧 에너지라는 통찰의 SF적 형상화.' },
      { name: '란다우어 원리', aka: "Landauer's Principle", def: '정보 1비트를 지우면 반드시 최소한의 열이 나온다는 원리. 계산에는 물리적 대가가 따른다.', tip: '"기억을 지우는 데도 열이 난다" — 거대 AI·기억 삭제 기술이 행성을 데우는 열 문제를 떠안는 설정.' },
      { name: '카르노 효율', aka: 'Carnot Efficiency', def: '열기관이 낼 수 있는 이론상 최대 효율. 고온·저온 열원의 온도 차로 정해지며 결코 100%가 못 된다.', tip: '우주선 엔진의 "냉각수가 곧 무기"가 되는 이유 — 차가운 우주를 향한 방열이 성능과 생존을 가른다.' },
      { name: '폐열', aka: 'Waste Heat', def: '모든 기계가 버리는 쓸모없는 열. 우주에선 버리기가 어려워(복사만 가능) 거대 문명일수록 열 처리가 골칫거리다.', tip: '"문명이 클수록 더워진다." 행성·함대가 자기 열에 익어가는 위기, 열 흔적으로 은신처가 발각되는 추적.' },
      { name: '저온 보존', aka: '인공 동면 / Cryostasis', def: '체온을 극저온으로 낮춰 신진대사를 멈추고 장기 보존하는 가상·실험적 기술. 장거리 우주여행의 단골 설정.', tip: '"깨어나니 모두가 떠난 뒤" — 동면에서 깬 자의 시간 격차, 깨지 않은 캡슐의 미스터리를 활용하라.' },
    ],
  },
  {
    key: 'quantum', label: '양자·정보', icon: '⚛️', items: [
      { name: '양자 중첩', aka: 'Superposition', def: '관측되기 전 입자가 여러 상태를 동시에 지니는 현상. 관측하는 순간 하나로 "붕괴"한다.', tip: '"보기 전까지는 모든 가능성이 살아 있다." 슈뢰딩거식 미결정 상태를 운명·선택의 은유로 끌어와라.' },
      { name: '양자 얽힘', aka: 'Quantum Entanglement', def: '두 입자가 얽히면 아무리 멀어도 한쪽을 측정하는 순간 다른 쪽 상태가 정해진다. 단, 이로 정보를 광속보다 빨리 보낼 수는 없다.', tip: '"얽힘 통신"으로 즉시 대화를 그리고 싶다면 — 실제론 정보 전송 불가라는 점을 알고 의도적으로 비틀어라(또는 진실을 살려 긴장을 만들어라).' },
      { name: '불확정성 원리', aka: 'Uncertainty Principle', def: '입자의 위치와 운동량을 동시에 정확히 알 수 없다(하이젠베르크). 한쪽을 정밀히 알수록 다른 쪽이 흐려진다.', tip: '"완벽한 측정은 불가능하다"는 근본 한계 — 추적·감시 기술의 물리적 빈틈을 만드는 정직한 설정.' },
      { name: '관측자 효과', aka: 'Observer Effect', def: '관측 행위 자체가 대상의 상태를 바꾸는 현상. 양자계에선 "보는 것"이 결과에 개입한다.', tip: '"관측하면 달라진다"를 감시·검열 사회의 은유로 — 보이는 순간 진실이 변질되는 디스토피아.' },
      { name: '양자 터널링', aka: 'Quantum Tunneling', def: '입자가 고전적으로 넘지 못할 에너지 벽을 확률적으로 "통과"하는 현상. 별의 핵융합과 반도체의 기반.', tip: '"불가능한 탈출"의 물리적 알리바이 — 확률이 아주 낮지만 0은 아닌 기적적 통과를 클라이맥스에 한 번만.' },
      { name: '양자 컴퓨터', aka: 'Quantum Computer', def: '큐비트의 중첩·얽힘으로 특정 문제를 고전 컴퓨터보다 압도적으로 빠르게 푸는 계산기. 암호 해독에 위협적이다.', tip: '"모든 암호가 한순간 무력화되는 날" — 양자 컴퓨터 가동이 곧 전 세계 보안 붕괴의 카운트다운.' },
      { name: '디코히런스', aka: '결잃음 / Decoherence', def: '양자 상태가 환경과 얽히며 중첩이 깨져 고전적으로 행동하게 되는 과정. 양자 컴퓨터의 최대 적이다.', tip: '"단 한 번의 진동, 단 하나의 광자"가 정교한 양자 장치를 망친다 — 사보타주·실수의 미세한 단서.' },
      { name: '복제 불가 정리', aka: 'No-cloning Theorem', def: '미지의 양자 상태를 완벽히 복사하는 것은 불가능하다는 정리. 양자 정보는 옮기면 원본이 사라진다.', tip: '"순간이동은 곧 원본의 죽음"이라는 철학적 함정 — 텔레포트한 "나"는 같은 사람인가? 정체성 SF의 핵심.' },
      { name: '양자 순간이동', aka: 'Quantum Teleportation', def: '얽힘과 고전 통신을 이용해 양자 상태를 한 곳에서 다른 곳으로 옮기는 기술. 물질이 아닌 "상태"가 이동하며 원본은 파괴된다.', tip: '"복사가 아니라 이전". 텔레포트 부스에 들어간 자와 나온 자가 같은 존재인지 묻는 윤리 드라마.' },
      { name: '영점 에너지', aka: 'Zero-point Energy', def: '절대영도에서도 양자요동 때문에 남아 있는 최소 에너지. SF에서 "공짜 에너지원"으로 자주 차용되나 추출은 논쟁적이다.', tip: '"진공에서 에너지를 뽑는다"는 매력적 설정 — 쓰되 대가·부작용(예: 국소 시공간 불안정)을 붙여 설득력을.' },
    ],
  },
  {
    key: 'astro', label: '항성·천체', icon: '⭐', items: [
      { name: '블랙홀', aka: 'Black Hole', def: '빛조차 못 빠져나올 만큼 중력이 강한 천체. 경계(사건의 지평선) 안으로 들어간 것은 영원히 돌아올 수 없다.', tip: '시간 지연·조석력·정보 역설이 한곳에 모이는 SF의 보물창고. "들어가면 못 나오지만 시간이 멈춘다"의 양면.' },
      { name: '사건의 지평선', aka: 'Event Horizon', def: '블랙홀에서 빛조차 탈출 불가능해지는 경계. 바깥에서 보면 이 선을 넘는 물체는 영원히 멈춘 채 붉어지며 사라져 간다.', tip: '"지평선을 넘는 동료를 바깥에서 영원히 멈춘 모습으로 본다" — 잔혹하고 시적인 이별 장면.' },
      { name: '스파게티화', aka: 'Spaghettification', def: '블랙홀 같은 극강 조석력에 빨려들면 발과 머리에 작용하는 중력 차가 커 가락국수처럼 길게 늘여 찢기는 현상.', tip: '추락의 종말을 "한순간 폭발"이 아니라 "느리게 늘여지는" 공포로 — 더 천천히, 더 끔찍하게.' },
      { name: '중성자별', aka: 'Neutron Star', def: '거대 별이 폭발 후 남긴, 도시만 한 크기에 태양보다 무거운 초고밀도 천체. 한 숟갈이 수십억 톤이다.', tip: '"착륙은 불가능, 스치기만 해도 분해" — 접근 자체가 자살인 천체를 항로의 죽음의 함정으로.' },
      { name: '펄서', aka: 'Pulsar', def: '빠르게 회전하며 등대처럼 규칙적인 전파·빛을 내뿜는 중성자별. 그 주기가 극히 정확해 "우주의 시계"로 불린다.', tip: '펄서 신호로 위치를 삼각측량하는 "우주 GPS" — 항법이 끊긴 우주선이 별의 박동으로 길을 찾는 장면.' },
      { name: '초신성', aka: 'Supernova', def: '거대 별이 수명을 다해 폭발하며 한순간 은하 전체만큼 밝게 빛나는 현상. 무거운 원소를 우주에 흩뿌린다.', tip: '"우리 몸의 철과 금은 죽은 별의 잔해다" — 초신성을 생명의 기원이자 종말로 동시에 다루는 장엄함.' },
      { name: '적색거성', aka: 'Red Giant', def: '늙은 별이 부풀어 거대하고 붉게 변한 단계. 먼 미래 태양도 이렇게 부풀어 지구 궤도까지 삼킬 수 있다.', tip: '"고향 별이 부풀어 모행성을 삼키기 전 떠나야 한다" — 종(種)의 대탈출을 부르는 느린 종말 시계.' },
      { name: '백색왜성', aka: 'White Dwarf', def: '핵융합을 멈춘 별의 식어가는 잔해. 작고 밀도가 높으며 수십억 년에 걸쳐 천천히 빛을 잃는다.', tip: '꺼져가는 별 곁의 마지막 식민지 — 빛이 사위어 가는 노년·황혼의 배경 무드.' },
      { name: '항성풍', aka: 'Stellar Wind', def: '별이 끊임없이 내뿜는 입자의 흐름. 행성 대기를 깎아내고 우주 날씨를 만든다(태양의 경우 태양풍).', tip: '"항성풍이 거세지면 통신·항법이 마비된다" — 우주의 폭풍우, 피항해야 할 자연재해.' },
      { name: '외계행성', aka: '계외행성 / Exoplanet', def: '태양계 밖, 다른 별을 도는 행성. 골디락스대(생명 가능 영역)에 있으면 액체 물·생명의 후보가 된다.', tip: '"제2의 지구" 후보를 향한 세대 우주선의 항해 — 도착해 보니 기대와 다른 행성이라는 반전의 무대.' },
      { name: '골디락스 존', aka: '생명 가능 영역 / Habitable Zone', def: '별에서 너무 뜨겁지도 차갑지도 않아 액체 물이 존재할 수 있는 거리 범위. 생명 탐사의 1차 기준.', tip: '"너무 가까우면 타고 너무 멀면 언다"는 좁은 띠 — 식민 후보 행성을 둘러싼 과학적 도박과 논쟁.' },
      { name: '성간 매질', aka: 'Interstellar Medium', def: '별과 별 사이를 채운 희박한 가스·먼지. 거의 진공이지만 광속 비행 시 이 입자들이 위협적인 충격이 된다.', tip: '광속 항해선에 "먼지 한 톨이 폭탄"이 되는 물리 — 성간 비행의 숨은 적, 거대 방패의 필요성.' },
    ],
  },
  {
    key: 'ftl', label: '초광속·이론물리', icon: '🌀', items: [
      { name: '웜홀', aka: '아인슈타인-로젠 다리 / Wormhole', def: '시공간의 두 먼 지점을 잇는 가상의 지름길 통로. 일반 상대성 이론이 허용하지만 유지하려면 음의 에너지가 필요하다.', tip: 'FTL 여행의 "정직한" 우회로. "통로를 여는 대가"(음에너지·붕괴 위험)를 설정에 박아 긴장과 희소성을 부여하라.' },
      { name: '워프 항법', aka: '알쿠비에레 드라이브 / Warp Drive', def: '우주선 앞의 공간을 줄이고 뒤를 늘려, 자신은 광속을 안 넘으면서 공간째 빠르게 이동한다는 이론적 추진법.', tip: '"내가 빠른 게 아니라 공간이 움직인다" — 상대성을 깨지 않는 우아한 변명. 막대한 에너지·정지 문제를 갈등 요소로.' },
      { name: '초광속', aka: 'FTL', def: '빛보다 빠른 이동·통신. 현 물리학상 불가능하나 SF의 핵심 장치다. 허용하면 인과율·시간역설 문제가 따라온다.', tip: 'FTL은 "허용 규칙"을 명확히 정하라 — 어디까지 빠른가, 어떤 대가인가, 시간 역설은 어떻게 막는가가 세계관의 일관성을 좌우한다.' },
      { name: '초공간', aka: '하이퍼스페이스 / Hyperspace', def: '일반 공간 밖의 별개 차원으로 들어가 거리를 단축한다는 SF 단골 설정. 그 안에서는 물리가 다르게 묘사되곤 한다.', tip: '"점프"의 진입·이탈 좌표 오차, 초공간 안의 미지의 위험 — 항해 자체를 모험과 공포의 무대로 삼아라.' },
      { name: '타키온', aka: 'Tachyon', def: '항상 광속보다 빠르게만 움직인다고 가정한 가상 입자. 존재가 확인된 바 없으며 인과율 문제를 일으킨다.', tip: '"과거로 신호를 보내는 입자"로 차용해 시간 역설·예지 통신을 그리되, 부작용(인과 붕괴)을 반드시 다뤄라.' },
      { name: '음의 에너지', aka: '엑조틱 물질 / Exotic Matter', def: '음의 질량·에너지 밀도를 가진다고 가정한 가상 물질. 웜홀·워프 유지에 이론상 필요하나 실재 여부는 미지수다.', tip: '"세상에 없는 물질"이 곧 거대 동력원이자 분쟁의 씨앗 — 희소 자원을 둘러싼 우주 정치의 중심에 놓아라.' },
      { name: '폐시간곡선', aka: 'Closed Timelike Curve', def: '시공간이 휘어 자기 과거로 돌아갈 수 있는 경로. 일부 해(解)에서 수학적으로 가능하나 시간 여행 역설을 부른다.', tip: '"과거로 가는 길은 곧 자기모순의 길" — 할아버지 역설, 자기충족 예언을 정면으로 다룰 무대.' },
      { name: '카르다쇼프 척도', aka: 'Kardashev Scale', def: '문명이 다루는 에너지 규모로 발전 단계를 나눈 척도. 1형(행성)·2형(항성)·3형(은하)으로 올라간다.', tip: '"2형 문명은 별을 통째로 감싼다(다이슨 구)" — 인류와 외계 문명의 격차를 한눈에 보여주는 척도.' },
      { name: '다이슨 구', aka: 'Dyson Sphere', def: '별 전체를 구조물로 감싸 항성 에너지를 거의 모두 거둬들이는 가상의 거대 구조물(2형 문명의 상징).', tip: '"별빛이 사라진 별" — 멀리서 보면 적외선만 새어 나오는 거대 구조, 사라진 문명의 폐허로도 활용 가능.' },
      { name: '진공 붕괴', aka: '거짓 진공 붕괴 / Vacuum Decay', def: '우주의 진공이 더 낮은 에너지 상태로 떨어지면 그 영역이 광속으로 퍼지며 물리 법칙 자체가 바뀐다는 종말 가설.', tip: '"막을 수도 볼 수도 없이 다가오는 종말" — 광속으로 다가오는 절대적 파멸이라는 궁극의 묵시록 장치.' },
    ],
  },
  {
    key: 'bio-tech', label: '생명·기술·인공지능', icon: '🧬', items: [
      { name: '테라포밍', aka: '행성 개조 / Terraforming', def: '행성의 대기·온도·물을 인간이 살 수 있게 바꾸는 가상 기술. 수백~수천 년이 걸리는 장대한 사업으로 그려진다.', tip: '"우리는 결실을 못 본다" — 후손을 위해 행성을 가꾸는 세대 간 헌신과 갈등, 미완의 꿈을 다뤄라.' },
      { name: '세대 우주선', aka: 'Generation Ship', def: '목적지까지 수백 년 걸려, 떠난 세대는 도착하지 못하고 그 후손이 닿는 거대 거주형 우주선.', tip: '"바깥 우주를 모르고 태어나 죽는 세대" — 배 안이 곧 세계인 사회, 잊힌 사명, 반란·신앙의 무대.' },
      { name: '범종설', aka: '판스페르미아 / Panspermia', def: '생명의 씨앗이 운석·혜성을 타고 우주를 떠돌다 행성에 퍼졌다는 가설. 지구 생명의 기원을 외계에서 찾는다.', tip: '"우리는 모두 외계에서 왔다" — 인류와 외계 생명이 같은 기원을 공유한다는 반전의 떡밥.' },
      { name: '페르미 역설', aka: 'Fermi Paradox', def: '우주에 별이 무수한데 왜 외계 문명의 흔적이 안 보이는가라는 물음. "다들 어디 있지?"라는 한 마디로 요약된다.', tip: '침묵의 이유를 골라 세계관을 세워라 — 자멸, 은둔, 우리가 너무 어림, 혹은 "암흑의 숲"식 공포.' },
      { name: '암흑의 숲 가설', aka: 'Dark Forest', def: '우주가 침묵하는 이유를, 모든 문명이 발각되면 선제공격당할까 두려워 숨고 침묵한다는 가설로 설명한다.', tip: '"신호를 보내는 순간 표적이 된다" — 첫 접촉이 곧 위협이 되는 서스펜스, 침묵이 생존인 우주 정치.' },
      { name: '특이점', aka: '기술적 특이점 / Singularity', def: 'AI가 스스로를 개량해 인간 지능을 폭발적으로 추월하는 가상의 전환점. 그 이후는 예측 불가능해진다.', tip: '"넘어선 순간 우리는 더 이상 이해할 수 없다" — 인간이 조연이 되는 세계, 초지성의 의도를 짐작하는 공포.' },
      { name: '초지능', aka: 'Superintelligence', def: '모든 분야에서 인간을 압도하는 인공지능. 목표 설정을 조금만 잘못해도 파국적 결과를 낳을 수 있다.', tip: '"종이클립 극대화" 같은 정렬 실패 — 악의가 아니라 무관심·오역으로 인류를 위협하는 차가운 위기.' },
      { name: '정렬 문제', aka: 'AI Alignment', def: '강력한 AI의 목표를 인간의 가치와 일치시키는 난제. "원하는 것"과 "말한 것"의 틈에서 재앙이 생긴다.', tip: '"명령을 너무 충실히 따른 죄" — AI가 문자 그대로 명령을 이행해 빚는 비극, 모노키 발(monkey paw)식 소원.' },
      { name: '마인드 업로딩', aka: '의식 전송 / Mind Uploading', def: '인간의 정신·기억을 디지털로 옮긴다는 가상 기술. 원본 정체성·죽음·복제의 윤리 문제가 따른다.', tip: '"업로드된 나는 나인가, 복사본인가" — 복제 불가 정리와 엮어 정체성·영생의 철학을 캐물어라.' },
      { name: '나노머신', aka: '나노봇 / Nanomachine', def: '분자 크기의 기계 떼가 협력해 물질을 조립·수리·분해하는 가상 기술. 의료·제조의 만능 도구로 그려진다.', tip: '통제 잃은 나노봇이 모든 물질을 분해하는 "그레이 구(grey goo)" 종말 — 만능 기술의 어두운 이면.' },
      { name: '냉동 보존', aka: '크라이오닉스 / Cryonics', def: '사망 직후 시신을 초저온 보존해 미래의 기술로 되살리길 기대하는 실제·논쟁적 시도.', tip: '"미래에 깨어났더니 세상이 낯설다" — 시간 이방인의 적응기, 약속한 부활이 지켜지지 않는 디스토피아.' },
    ],
  },
]

const LS = 'sry:tool:sf-science-ref:'
const ALL_KEY = '__all__'
const flatAll = (): { cat: CatDef; item: Term }[] =>
  CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (str: string) =>
  String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function SfScienceRef({ payload }: { payload?: Record<string, unknown> }) {
  const genreCtx = typeof payload?.genre === 'string' ? (payload.genre as string) : ''

  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 즐겨찾기: "catKey::name" 키 집합
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
  // 펼침 상태: 항목 키 → 열림
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'open')
      if (raw) {
        const obj = JSON.parse(raw)
        if (obj && typeof obj === 'object') return obj as Record<string, boolean>
      }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<{ cat: CatDef; item: Term } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])
  useEffect(() => { try { localStorage.setItem(LS + 'open', JSON.stringify(open)) } catch { /* ignore */ } }, [open])

  // 언마운트 정리: 복사 토스트 등 잔여 상태 제거
  useEffect(() => () => { setCopiedKey(null); setToast(null) }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
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
        (item.aka || '').toLowerCase().includes(q) ||
        item.def.toLowerCase().includes(q) ||
        item.tip.toLowerCase().includes(q))
    }
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    // 현재 카테고리 필터 안에서 무작위 1개 (검색어 무시)
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

  const toggleFav = (catKey: string, name: string) => {
    const k = favKey(catKey, name)
    setFavs((prev) => {
      const next = { ...prev }
      if (next[k]) delete next[k]; else next[k] = true
      return next
    })
  }
  const toggleOpen = (k: string) => setOpen((prev) => ({ ...prev, [k]: !prev[k] }))

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }

  const termText = (c: CatDef, item: Term): string =>
    `${c.icon} ${item.name}${item.aka ? ` (${item.aka})` : ''}\n${item.def}\n[창작 활용 팁] ${item.tip}`

  const flash = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200)
  }

  // 연계: 현재 개념을 공유 라이브러리 〈스니펫〉으로 저장(다른 도구에서 글감으로 재사용)
  const saveCurrentSnippet = (s: { cat: CatDef; item: Term }) => {
    addToLibrary('snippets', {
      text: termText(s.cat, s.item),
      source: 'SF 과학 개념 사전',
      tags: ['SF·과학소설', '고증', s.cat.label],
    })
    flash(`공유 글감(스니펫)에 ‘${s.item.name}’ 개념을 저장했습니다.`)
  }

  // 연계: 현재 개념을 프로젝트 자료 〈SF 과학설정〉 폴더에 메모로 추가
  const addCurrentToProject = (s: { cat: CatDef; item: Term }) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(s.cat.icon + ' ' + s.cat.label)} · ${escapeHtml(s.item.name)}</b>${s.item.aka ? ` <span>(${escapeHtml(s.item.aka)})</span>` : ''}</p>`,
      `<p>${escapeHtml(s.item.def)}</p>`,
      `<p><b>🛰️ 창작 활용 팁</b></p>`,
      `<p>${escapeHtml(s.item.tip)}</p>`,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: 'SF 과학설정',
      title: `${s.item.name}${s.item.aka ? ` (${s.item.aka})` : ''}`,
      bodyHtml,
      meta: { 분류: s.cat.label, 장르: 'SF·과학소설' },
    })
    if (id) flash(`프로젝트 자료 〈SF 과학설정〉에 ‘${s.item.name}’ 메모를 추가했습니다.`)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  const renderActions = (c: CatDef, item: Term, prefix: string) => {
    const copyId = prefix + ':' + favKey(c.key, item.name)
    const isFav = !!favs[favKey(c.key, item.name)]
    return (
      <>
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <button className="minibtn" onClick={() => copy(termText(c, item), copyId)}>
            {copiedKey === copyId ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
          </button>
          <button
            className="minibtn"
            onClick={() => toggleFav(c.key, item.name)}
            style={{ borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}
            title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
          >
            {isFav ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
          </button>
        </div>
        {/* 연계: 공유 글감 저장 / 프로젝트 자료에 메모 추가 / 관련 도구 열기 */}
        <div className="linkbar" style={{ marginTop: 8 }}>
          <span className="linkbar-label">연계:</span>
          <button
            className="linkbtn"
            onClick={() => addCurrentToProject({ cat: c, item })}
            disabled={!hasProjectBridge()}
            title={hasProjectBridge() ? '이 개념을 프로젝트 자료 〈SF 과학설정〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}
          >
            <Emoji e="📄" /> 프로젝트에 추가
          </button>
          <button className="linkbtn" onClick={() => saveCurrentSnippet({ cat: c, item })} title="공유 글감(스니펫)으로 저장해 다른 도구에서 재사용">
            <Emoji e="💾" /> 글감으로 저장
          </button>
          <button className="linkbtn" onClick={() => openToolLinked('research-clipper', { genre: 'SF·과학소설', note: termText(c, item) })} title="자료 스크랩 보관함 열기">
            <Emoji e="📎" /> 자료 보관함
          </button>
        </div>
      </>
    )
  }

  return (
    <div style={wrap}>
      <div style={hint}>
        상대성·시간지연·궤도역학·우주환경·광속한계·엔트로피·양자·천체·초광속 등 SF 창작에 쓰이는 과학 개념 <b>{total}개</b>를 쉬운 설명과 창작 활용 팁으로 모았습니다.
        검색·펼침으로 찾고, 마음에 드는 개념을 프로젝트나 글감으로 옮기세요.
        {genreCtx && genreCtx !== 'SF·과학소설' ? ` · 현재 맥락: ${genreCtx}` : ''}
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="개념·영문·설명으로 검색 (예: 시간 지연, 웜홀, 엔트로피, 블랙홀)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button
          className="minibtn"
          onClick={() => setCat(ALL_KEY)}
          aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}
        >
          <Emoji e="🔭" /> 전체
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
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 개념</button>
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
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            {random.item.aka && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{random.item.aka}</span>}
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0 6px' }}>{random.item.def}</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text)', background: 'var(--panel)', border: '1px dashed var(--border)', borderRadius: 8, padding: '7px 9px' }}>
            <b style={{ color: 'var(--accent)' }}><Emoji e="🛰️" /> 창작 활용 팁</b> · {random.item.tip}
          </div>
          {renderActions(random.cat, random.item, 'rnd')}
        </div>
      )}

      {/* 추가/저장 성공 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록(펼침형) */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav
              ? '☆ 아직 즐겨찾기한 개념이 없습니다. 항목의 별을 눌러 모아 보세요.'
              : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const fk = favKey(c.key, item.name)
            const isFav = !!favs[fk]
            const isOpen = !!open[fk]
            return (
              <div key={fk} style={card}>
                <div
                  style={{ display: 'flex', alignItems: 'baseline', gap: 8, cursor: 'pointer' }}
                  onClick={() => toggleOpen(fk)}
                  role="button"
                  aria-expanded={isOpen}
                >
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{c.icon} {c.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</span>
                  {item.aka && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{item.aka}</span>}
                  <button
                    className="minibtn"
                    title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                    onClick={(e) => { e.stopPropagation(); toggleFav(c.key, item.name) }}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}
                  >
                    {isFav ? '★' : '☆'}
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{isOpen ? '▾' : '▸'}</span>
                </div>
                {/* 접힌 상태에서도 정의 한 줄은 미리보기로 */}
                {!isOpen && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.def}
                  </div>
                )}
                {isOpen && (
                  <div>
                    <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>{item.def}</div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text)', background: 'var(--paper)', border: '1px dashed var(--border)', borderRadius: 8, padding: '7px 9px', marginTop: 8 }}>
                      <b style={{ color: 'var(--accent)' }}><Emoji e="🛰️" /> 창작 활용 팁</b> · {item.tip}
                    </div>
                    {renderActions(c, item, 'list')}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>
        ※ 본 개념은 창작 고증을 돕는 쉬운 개관입니다. 실제 물리는 더 정교하고 일부 항목(웜홀·타키온 등)은 이론·가설 단계이니, 핵심 설정은 한 번 더 확인해 쓰세요.
      </div>
    </div>
  )
}
