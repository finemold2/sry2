// 무기·전투 사전 — 액션·무협·역사물 창작을 위한 로컬 자작 자료집.
//  ⚠ 실제 사용·제작 안내가 아니라, 무기·전투 묘사의 '고증과 감각'을 돕는 창작 자료로 구성한다.
//  자급식: react 와 './linkbus' 외 import 없음. 외부 API/미디어/네트워크 없음(전부 로컬 자작 데이터).
//  카테고리 펼침 + 검색 + 무작위 + 클릭복사 + 수집함/스니펫/프로젝트 연계 + 관련 도구 열기.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, addToStash, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'weapons-combat-ref',
  name: '무기·전투 사전',
  icon: '⚔️',
  group: '리서치·자료',
  genre: '액션·무협·역사',
  intro: '시대·문화별 무기(도검/창/궁/화기/암기)·갑주·전술과 간격/속도/소리 묘사를 정리한 액션·무협 고증 참고 자료',
  w: 660,
  h: 680,
}

// ---------- 항목 형(型) ----------
// 모든 텍스트는 '묘사용 단서'이지 사용·제작 지침이 아니다. 살상 절차는 적지 않고, 장면의 감각·고증·연출에 초점.
interface Entry {
  name: string          // 명칭
  aka?: string          // 이칭·별칭·계열
  era?: string          // 시대·문화 배경
  reach?: string        // 간격(거리감) — 전투 묘사의 핵심
  speed?: string        // 속도·리듬(휘두름·재장전·발사 호흡)
  sound?: string        // 소리(발도·격돌·시위·총성)
  feel?: string         // 무게·다루는 감각
  tactic?: string       // 전술·운용(대형·합·간합)
  injury?: string       // 부상 양상(서사용 — 자세한 부상 묘사는 부상·회복 사전과 연계)
  cliche?: string       // 흔한 오류·클리셰(고증 유의)
}
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ---------- 로컬 대량 자료집 ----------
const CATS: CatDef[] = [
  {
    key: 'sword', label: '도검(刀劍)', icon: '🗡️',
    note: '베고 찌르는 근접 병기의 정수. 같은 ‘칼’도 곧은 검과 휜 도는 쓰는 결이 다르다 — 찌름이냐 베기냐가 장면의 호흡을 가른다.',
    items: [
      { name: '한손검(아밍 소드)', aka: '기사의 검', era: '중세 유럽', reach: '한 팔 + 칼 길이. 방패와 함께 쓰면 ‘반 걸음’ 더 짧아진 듯 단단해진다.', speed: '짧고 빠른 베기·찌름. 방패 너머로 튀어나오는 ‘틈새 공격’이 본령.', sound: '방패에 부딪히는 둔탁한 “쿵”, 칼끼리 스치는 날카로운 “챙”.', feel: '한 손으로 들 만큼 가볍지만, 칼끝이 멀어 손목 힘이 곧 정확도.', tactic: '방패로 막고 칼로 찌르는 ‘벽과 송곳’의 짝. 대열을 이루면 방패가 겹쳐 ‘벽’이 된다.', injury: '갑옷 틈(겨드랑이·목·사타구니)을 노린 찌름이 치명적. 베기는 사지·얼굴의 깊은 열창.', cliche: '갑옷 입은 적을 칼로 ‘쩍’ 가르는 묘사는 과장. 판금 앞에선 찌름·관절·둔격으로 전환하는 게 고증.' },
      { name: '롱소드(한손반검)', aka: '바스타드 소드', era: '중세 후기 유럽', reach: '양손으로 쥐면 한손검보다 한 뼘 이상 길고, 지렛대가 길어 ‘끝의 위력’이 커진다.', speed: '큰 베기와 빠른 되돌림이 공존. 손잡이를 길게/짧게 쥐어 박자를 바꾼다.', sound: '공기를 가르는 묵직한 “부웅”, 맞부딪힐 때 쇳소리가 길게 운다.', feel: '양손이라 안정적이되, 칼끝이 멀어 ‘내 키만큼 더 큰 나’처럼 공간을 지배.', tactic: '거리 밖에서 위협하다 ‘하프소딩’(칼날을 잡고 짧게 찌름)으로 갑옷 틈을 파고든다.', injury: '큰 베기는 팔다리를 깊이 가르고, 끝 찌름은 좁은 틈을 정확히 뚫는다.', cliche: '무겁고 둔하다는 통념과 달리 의외로 가볍고 민첩 — 둔기처럼 휘두르는 연출은 오류.' },
      { name: '투핸드 소드(츠바이핸더)', aka: '대검', era: '르네상스 유럽(용병)', reach: '키만 한 길이. ‘선을 긋는’ 위협 범위가 가장 넓다.', speed: '한 번 휘두르면 크고 느리나, 회전 관성으로 연속 베기가 이어진다.', sound: '바람을 통째로 가르는 낮은 “후웅”, 창대를 쳐낼 때 “딱” 하고 부러지는 소리.', feel: '두 손과 온몸으로 다루는 큰 무기 — 한 번의 헛스윙이 곧 큰 빈틈.', tactic: '창병의 장창 숲을 쳐내며 길을 여는 ‘대형 파괴자’. 좁은 곳에선 무용지물.', injury: '닿으면 큰 절단·복합 손상. 다만 빗나가면 회복이 느려 반격에 취약.', cliche: '실내·난전에서 거대 검을 휘두르는 연출은 비현실적 — 휘두를 공간이 곧 생명.' },
      { name: '레이피어', aka: '찌름검', era: '근세 유럽(결투)', reach: '가늘고 매우 길다. ‘한 발 먼저 닿는’ 찌름이 절대 우위.', speed: '베기는 약하나 찌름이 번개처럼 빠르고 곧다. 손목의 미세한 박자 싸움.', sound: '거의 소리가 없는 찌름, 막을 때 가는 쇳소리가 ‘티잉’.', feel: '깃털처럼 끝이 살아 움직인다 — 손끝의 감각이 곧 칼끝.', tactic: '간합(間合)을 재는 페인트와 ‘한 박자 빠른 직선’. 단검을 든 반대 손이 방어를 맡는다.', injury: '좁고 깊은 자창 — 외상은 작아도 안쪽 손상이 크다(검시·서사 단서).', cliche: '화려하게 칼을 ‘챙챙’ 부딪는 영화식 연출은 과장 — 실제는 거리와 타이밍의 정적인 싸움.' },
      { name: '카타나(일본도)', aka: '일본 도(刀)·태도(太刀)', era: '일본 봉건시대', reach: '한 팔 반. 곡선 덕에 ‘끌어 베는’ 유효 거리가 길게 느껴진다.', speed: '발도(拔刀)에서 베기까지 한 호흡. 되돌림보다 ‘한 번에 끝내는’ 일격을 노린다.', sound: '칼집에서 빠지는 “스릉”, 베는 순간의 짧고 날카로운 바람소리.', feel: '양손으로 쥐고 허리·전신으로 끌어 베는 칼 — 손목만으로 휘두르면 결이 죽는다.', tactic: '발도술은 ‘먼저 빼는 자’가 아니라 ‘정확히 닿는 자’가 이긴다. 한 합에 승부를 거는 거합(居合)의 미학.', injury: '당겨 베는 절창 — 길고 깔끔한 베임. 갑주 상대로는 틈·관절을 노린다.', cliche: '강철도 두부처럼 자른다는 묘사는 신화. 뼈·갑옷에 부딪히면 날이 상한다 — 베는 ‘대상’을 골라야 고증이 산다.' },
      { name: '직도(直刀)·환수도', aka: '동아시아 외날 곧은 칼', era: '고대~중세 동아시아', reach: '한 팔 + 칼. 곧아서 찌름과 베기가 모두 무난하다.', speed: '곡도보다 찌름에 강하고, 베기는 묵직하게 내려친다.', sound: '곧은 날의 “챙”과 내려칠 때의 낮은 바람소리.', feel: '균형이 손잡이 쪽에 있어 다루기 쉽고 입문에 좋다.', tactic: '보병의 기본 호신·근접 병기. 방패·창과 함께 대열에서 쓰인다.', injury: '곧은 찌름과 내려베기 위주 — 정직한 손상 양상.', cliche: '동아시아 칼=휜 칼이라는 통념과 달리, 곧은 칼의 시대가 길었음을 기억하면 시대 고증이 깊어진다.' },
      { name: '곡도(曲刀)·환도', aka: '동아시아 외날 휜 칼', era: '중세~근세 동아시아', reach: '한 팔 + 칼. 휨 덕분에 끌어 베는 ‘스침’의 위력.', speed: '말 위에서나 보행 중 ‘지나가며 긋는’ 베기에 최적. 멈추지 않고 흐른다.', sound: '바람을 끊는 “쉭”, 스쳐 베는 짧은 마찰음.', feel: '휘는 날이 손목을 덜 잡아채 연속 동작이 매끄럽다.', tactic: '기병의 스침 베기, 보병의 빠른 연속 베기. 흐르는 동선이 곧 방어.', injury: '길고 얕게 시작해 깊게 패는 절창 — 스치듯 지나가도 상처가 길다.', cliche: '휜 칼은 찌르기 못한다는 오해 — 끝을 세우면 충분히 찌른다. 다만 곧은 칼보다 직선 찌름은 불리.' },
      { name: '단검·대거', aka: '비수·아이키도스', era: '전 시대·전 문화', reach: '가장 짧다. ‘품 안’에 들어와야 닿는 거리의 무기.', speed: '뽑기와 찌름이 매우 빠르고 은밀. 큰 무기의 ‘사각’에서 산다.', sound: '거의 무음 — 옷깃 스치는 소리, 짧은 “퍽”.', feel: '손 안에 숨길 만큼 작아 의표를 찌른다. 역수(逆手)·순수(順手) 잡기로 결이 달라진다.', tactic: '난전·근접 클린치에서 빛난다. 갑옷 기사를 쓰러뜨린 뒤 틈을 노리는 ‘미세리코르드(자비의 칼)’ 같은 마무리 역할.', injury: '좁고 깊은 자창 다발 — 짧지만 급소에 닿으면 치명적.', cliche: '단검 하나로 무장한 적을 정면에서 제압하는 건 비현실 — 단검은 ‘거리를 좁힌 뒤’의 무기다.' },
    ],
  },
  {
    key: 'pole', label: '창·장병기(長兵)', icon: '🔱',
    note: '“긴 것이 짧은 것을 이긴다.” 전장의 주인공은 늘 창이었다 — 간격(間合)을 지배하는 자가 산다.',
    items: [
      { name: '장창(파이크)', aka: '밀집 장창', era: '고대~근세(밀집 보병)', reach: '사람 키의 두세 배. ‘닿기 전에 닿는’ 절대적 거리 우위.', speed: '개별 동작은 느리나, 대열 전체가 ‘숲’처럼 한 박자에 움직인다.', sound: '대열이 창을 내릴 때의 일제히 “촤악”, 부딪힐 때 나무·쇠의 둔탁한 합주.', feel: '혼자선 다루기 버겁지만 대열 속에선 ‘벽의 일부’가 되어 든든하다.', tactic: '여러 줄이 창을 겹쳐 내려 ‘찌르는 벽(밀집방진)’을 만든다. 측면·후방이 곧 약점.', injury: '정면 다발 자창 — 한 사람에게 여러 창이 동시에 닿는다.', cliche: '영웅 한 명이 장창 대열을 뚫는 장면은 비현실. 대열은 ‘개인기’가 아니라 ‘기율’로 깨진다.' },
      { name: '단창·투창(재블린)', aka: '필룸·표창(鏢槍)', era: '고대(로마·여러 문화)', reach: '근접은 한 팔+창, 던지면 수십 보 밖.', speed: '찌름은 빠르고, 던지면 한 번에 멀리 — 던진 뒤엔 칼로 전환.', sound: '날아가며 우는 “휘잉”, 방패에 박히는 “퍽”.', feel: '가볍게 들고 던질 수 있으나 한 번 던지면 손이 빈다.', tactic: '돌격 직전 일제히 던져 적의 방패를 무력화(휘어 박혀 못 빼게)한 뒤 칼로 밀어붙인다.', injury: '관통 자창 — 방패째 꽂히거나 사지를 꿰뚫는다.', cliche: '투창을 무한히 던지는 묘사는 오류 — 보통 한둘만 휴대한다. 던진 뒤의 ‘빈손’이 긴장.' },
      { name: '미늘창(할버드)', aka: '폴액스·글레이브 계열', era: '중세 후기~근세 유럽', reach: '두 팔+긴 자루. 찌름·찍기·걸기를 한 무기로.', speed: '큰 동작이 많아 묵직하나, 갈고리로 ‘끌어당기는’ 기습이 매섭다.', sound: '내려찍는 “쾅”, 갈고리가 갑옷을 긁는 “지익”.', feel: '머리 쪽이 무거워 한 번 내려치면 큰 위력, 대신 회수가 느리다.', tactic: '창끝으로 찌르고, 도끼날로 찍고, 갈고리로 기병을 말에서 끌어내린다 — ‘만능 장병기’.', injury: '둔격(함몰)·관통·찢김이 섞인 복합 손상 — 판금 갑옷도 둔격으로 무력화.', cliche: '판금 기사는 무적이 아니다 — 폴액스의 둔격·갈고리가 그 천적이었음을 기억할 것.' },
      { name: '월도·언월도(대도)', aka: '쿠다치·청룡언월도 계열', era: '중세 동아시아', reach: '긴 자루 + 큰 칼날. 휘두름의 반경이 매우 넓다.', speed: '느리고 크지만 원심력으로 ‘쓸어내는’ 위력이 압도적.', sound: '공기를 통째로 베는 낮은 “후우웅”, 무거운 합주.', feel: '온몸을 써야 하는 대형 무기 — 힘과 체력의 상징.', tactic: '넓게 쓸어 다수를 견제하거나 기병을 베어낸다. 좁은 곳·난전에선 불리.', injury: '크고 깊은 절단·둔격 복합 — 한 번에 큰 손상.', cliche: '무협의 ‘가볍게 휘두르는 거대 도’는 연출 과장 — 실제론 엄청난 체력이 든다. 그 무게감을 묘사에 담아야 설득력.' },
      { name: '곤(棍)·봉', aka: '장곤·육척봉', era: '전 시대 동아시아(무술)', reach: '키보다 길다. 양 끝을 모두 쓰는 ‘두 무기’.', speed: '회전과 찌름·후리기가 끊임없이 이어지는 연속성이 생명.', sound: '바람을 가르는 “휙휙”, 맞부딪힐 때 나무의 “딱딱”.', feel: '날이 없어 다루기 안전하나, 타격은 의외로 묵직하다.', tactic: '간격을 재며 찌르고 후리고 받아넘긴다. 모든 장병기의 기본기로 통한다.', injury: '둔격·골절 위주 — 베임은 없어도 뼈와 관절을 노린다.', cliche: '봉을 ‘약한 무기’로 그리기 쉬우나, 간격과 연속성에서 칼을 압도할 수 있음을 보여주면 무협의 깊이가 산다.' },
      { name: '삼지창·당파', aka: '트라이던트·차(叉)', era: '여러 문화', reach: '두 팔+자루. 세 갈래로 ‘빗나가도 걸리는’ 관용.', speed: '찌름 위주, 갈래로 상대 무기를 ‘잡아 비트는’ 기술이 특기.', sound: '찌를 때의 “쉭”, 무기를 가둘 때의 “챙—덜컥”.', feel: '머리가 무겁고 넓어 방어·제압에 강하다.', tactic: '상대의 칼·창을 갈래 사이에 가두어 비틀어 떨어뜨린 뒤 찌른다.', injury: '다발 자창 — 세 점이 동시에 박힌다.', cliche: '단순 찌름 무기로만 그리면 아깝다 — ‘무기를 잡아채는’ 제압 기능이 개성.' },
    ],
  },
  {
    key: 'bow', label: '궁·노(弓弩)·투척', icon: '🏹',
    note: '닿기 전에 끝내는 원거리의 미학. 바람·거리·시간이 곧 명중 — ‘쏘기 전’의 긴장이 장면을 만든다.',
    items: [
      { name: '장궁(롱보우)', aka: '영국식 장궁', era: '중세 유럽', reach: '수백 보 — 전장 가장 먼 손길.', speed: '숙련자는 빠르게 연사하나, 한 발마다 온몸의 힘으로 ‘당겨 버티는’ 호흡이 든다.', sound: '시위의 깊은 “퉁—”, 화살이 공기를 가르는 “휘이익”, 빗발칠 땐 “쏴아” 하는 비 같은 소리.', feel: '활을 당기는 힘이 어마어마해, 평생 훈련한 몸만이 제대로 쓴다(편향된 어깨·뼈가 남을 정도).', tactic: '일제 사격으로 ‘화살비’를 퍼붓는다. 곡사로 머리 위에서 떨어뜨려 방패 너머를 친다.', injury: '관통 자창 — 박힌 화살은 ‘빼는 것’이 더 위험(미늘). 먼 거리는 비스듬히 박힌다.', cliche: '화살 맞고 멀쩡히 뛰는 연출은 과장. 다만 ‘즉사’도 드물다 — 박힌 채 싸우다 출혈로 무너지는 현실이 더 처절하다.' },
      { name: '단궁·각궁(합성궁)', aka: '복합궁·기마궁', era: '유라시아 유목 문화', reach: '수백 보, 짧은 활인데도 강력하다(여러 재료를 겹친 힘).', speed: '말 위에서도 빠르게 연사. ‘달리며 쏘는’ 리듬이 핵심.', sound: '짧고 탄탄한 시위 소리, 말발굽과 겹쳐 ‘다그닥-퉁’의 합주.', feel: '짧아 다루기 좋고, 말 위에서도 좌우로 자유롭게 쏜다.', tactic: '치고 빠지는 기마 사격 — 거리를 유지하며 적을 ‘갉아먹는다’. 후퇴하며 뒤로 쏘는 ‘파르티안 샷’.', injury: '관통 자창 — 기동 중 사격이라 산발적이지만 누적이 치명적.', cliche: '말 위 사격을 너무 쉽게 그리지 말 것 — 균형·타이밍·말 다루기가 모두 필요한 고난도 기예다.' },
      { name: '석궁(쇠뇌·크로스보우)', aka: '노(弩)', era: '고대 동아시아~중세 유럽', reach: '수백 보, 곧고 강한 직사.', speed: '한 발의 위력은 크나 재장전이 느리다 — ‘쏘고 나면 한참 비는’ 긴장.', sound: '걸쇠를 당기는 “끼릭”, 발사의 짧고 둔탁한 “퉁-탁”, 화살(쿼럴)이 박히는 “퍽”.', feel: '겨누어 두면 힘이 안 들어, 훈련이 짧아도 쓴다 — ‘평민도 기사를 잡는’ 평등의 무기.', tactic: '방벽 뒤에서 장전하고, 신호에 일제히 쏜다. 느린 재장전을 방패·교대로 메운다.', injury: '강한 관통 자창 — 근거리에선 갑옷도 뚫는다.', cliche: '연사가 빠른 묘사는 오류 — 재장전의 ‘공백’을 어떻게 메우느냐가 전술의 핵심이다.' },
      { name: '투석구(슬링)', aka: '슬링·물맷돌', era: '고대(목동·경보병)', reach: '의외로 멀리(돌·납탄). 활에 버금가는 사거리.', speed: '돌려서 던지는 한 동작 — 빠르게 반복 가능, 탄약은 흔하다.', sound: '머리 위에서 도는 “부웅부웅”, 발사 순간의 “핑”, 맞을 때의 둔탁한 “퍽”.', feel: '가벼운 끈 하나 — 숨기기 쉽고, 숙련엔 의외로 긴 시간이 든다.', tactic: '경보병의 견제·괴롭힘. 투구·이마를 노린 둔격이 의외로 치명적.', injury: '둔격·함몰 — 베이지 않아도 머리뼈를 부순다. 무방비 두부에 특히 위험.', cliche: '‘약한 어린이 무기’로 얕보기 쉬우나, 숙련된 투석병은 전장을 흔들었음을 기억할 것.' },
      { name: '표창·수리검(암기 던지기)', aka: '비표·다트', era: '여러 문화(은밀전)', reach: '근~중거리. 손에서 떠난 한 점의 기습.', speed: '뽑아 던지는 한 호흡 — 은밀하고 빠르나 위력은 제한적.', sound: '거의 무음 — 공기를 짧게 가르는 “핏”, 박히는 “탁”.', feel: '작고 가벼워 여러 개를 숨겨 다닌다. 정확히 맞히기는 의외로 어렵다.', tactic: '시선을 끌거나 도주·견제용. ‘치명타’보다 ‘틈 만들기’가 본분.', injury: '얕은 자창·둔격 — 단독 치명상은 드물고, 주로 견제·교란.', cliche: '수리검 한 방에 적이 즉사하는 무협·닌자 연출은 과장 — 실제론 견제·연막 보조 수단에 가깝다.' },
    ],
  },
  {
    key: 'gun', label: '화기(火器)·총포', icon: '🔫',
    note: '연기와 굉음으로 전장을 바꾼 병기. 시대마다 ‘장전 시간·명중·연기’가 달라 전술과 묘사가 통째로 바뀐다.',
    items: [
      { name: '화승총(매치록)', aka: '아쿼버스·조총', era: '근세(16~17세기)', reach: '수십~백여 보, 명중률은 낮다.', speed: '한 발 쏘고 재장전에 한참 — 화약 붓고 다지고 불씨 붙이는 긴 절차.', sound: '거대한 “쾅”과 함께 자욱한 흰 연기, 불씨가 타들어 가는 “치익”.', feel: '무겁고, 비가 오면 불씨가 꺼져 무용지물 — 날씨가 곧 운명.', tactic: '여러 줄이 교대로 쏘는 ‘윤번 사격(층사)’으로 끊김 없는 탄막을 만든다. 장창·근접병이 재장전을 지킨다.', injury: '둔탁한 관통·파열 — 납탄이 들어가며 짓이긴다(당대 치료가 어려운 큰 상처).', cliche: '비 오는 날 화승총이 멀쩡히 발사되는 장면은 오류. ‘불씨 관리’의 긴장을 살리면 시대감이 산다.' },
      { name: '수발총(플린트록)', aka: '머스킷', era: '17~19세기', reach: '백 보 안팎, 일제사격으로 면을 친다.', speed: '화승총보다 빠르나 여전히 느린 재장전 — 한 발의 무게가 크다.', sound: '부싯돌이 ‘딱’ 튀고 곧바로 “탕!”, 일제사격은 천둥 같은 합주.', feel: '총검을 꽂으면 ‘짧은 창’이 된다 — 쏘고 나면 백병전.', tactic: '횡대로 늘어서 일제사격 후 총검 돌격. ‘얼마나 침착하게 줄을 유지하느냐’가 승부.', injury: '큰 관통·골절 — 납탄이 뼈를 부수고 파편을 만든다.', cliche: '엄폐 없이 마주 서서 쏘는 모습이 미련해 보이지만, 명중률·재장전을 생각하면 ‘대형 유지’가 합리였음을 묘사로 보여줄 것.' },
      { name: '리볼버(연발 권총)', aka: '식스슈터', era: '19세기~', reach: '근거리, 빠른 대응.', speed: '여섯 발을 연달아 쏜다 — 재장전(탄피 빼고 다시 넣기)이 느려 ‘여섯 발의 긴장’.', sound: '날카로운 “탕”, 공이를 당기는 “찰칵”, 실린더 돌아가는 “드르륵”.', feel: '한 손에 들어오는 위력 — 뽑는 속도가 곧 생사.', tactic: '근접 결투·호신. 엄폐와 뽑기 속도, 남은 탄수 계산이 묘미.', injury: '관통 자창 — 근거리 위력이 크다.', cliche: '실린더가 무한정 나가는 연출은 오류 — ‘여섯 발 뒤의 공백’과 재장전이 서스펜스의 핵심.' },
      { name: '볼트액션 소총', aka: '연발 장총', era: '19세기말~20세기', reach: '수백~천 보 이상(저격).', speed: '한 발 쏘고 노리쇠를 당겨 다음 탄 — 정확하나 느린 리듬.', sound: '먼 “탕”이 늦게 도착하고, 노리쇠 조작의 “철컥-철컥”.', feel: '길고 묵직, 견착·호흡·격발의 정적인 집중.', tactic: '참호·엄폐 뒤 정밀 사격. 저격은 ‘한 발-한 호흡-한 표적’의 인내.', injury: '먼 거리의 정밀 관통 — 거리·각도에 따라 손상이 크게 달라진다.', cliche: '무한 연사가 아니다 — 한 발마다 노리쇠를 당기는 ‘틈’이 긴장의 박자.' },
      { name: '산탄총(샷건)', aka: '엽총·스캐터건', era: '근현대', reach: '근거리에 압도적, 멀면 흩어져 약하다.', speed: '한두 발의 강력함, 재장전(약실에 새 탄 넣기)이 동작으로 드러난다.', sound: '둔중한 “쾅”, 약실을 여닫는 “철컥-차캉”.', feel: '반동이 강해 어깨로 받아낸다 — ‘한 발의 무게’가 손에 박힌다.', tactic: '실내·좁은 통로의 근접 제압. 거리를 좁힌 자가 절대 우위.', injury: '근거리 다발 파열 — 넓고 얕은 다수 손상, 거리 멀면 산발.', cliche: '먼 거리에서 한 발에 적이 날아가는 연출은 과장 — ‘거리에 따라 위력이 급변’함을 살릴 것.' },
    ],
  },
  {
    key: 'blunt', label: '둔기·도끼·철퇴', icon: '🔨',
    note: '베지 않고 ‘부순다.’ 갑옷이 두꺼워질수록 빛나는 충격의 병기 — 칼이 못 하는 일을 한다.',
    items: [
      { name: '전투도끼', aka: '워액스·바이킹 도끼', era: '여러 시대', reach: '한 팔+자루(한손/양손형).', speed: '내려치는 한 방의 위력, 회수는 칼보다 느리다.', sound: '쪼개는 “쩍”, 방패에 박히는 “퍼걱”.', feel: '머리가 무거워 위력은 크나, 빗나가면 큰 빈틈.', tactic: '방패를 쪼개고, 갈고리진 날로 적의 방패를 ‘당겨 끌어내린’ 뒤 친다.', injury: '깊은 절창+둔격 복합 — 뼈를 쪼갠다. 사지 손상이 크다.', cliche: '도끼=야만적 막무가내라는 통념과 달리, 방패를 다루는 정교한 기술이 함께했음을 보여줄 것.' },
      { name: '철퇴·메이스', aka: '플랜지드 메이스', era: '중세(대갑옷 시대)', reach: '한 팔+짧은 자루.', speed: '짧고 빠른 타격, 회전보다 ‘찍어 누르는’ 박자.', sound: '둔탁한 “퍽-쾅”, 갑옷을 우그러뜨리는 금속음.', feel: '머리가 단단하고 무거워, 닿기만 하면 충격이 갑옷을 뚫고 안으로.', tactic: '판금 갑옷의 천적 — 못 베어도 충격으로 뼈를 부순다. 성직 기사의 무기로도 알려짐(‘피를 흘리지 않는’ 명분).', injury: '함몰·골절·내상 — 겉은 멀쩡해도 안이 부서진다(서사 단서).', cliche: '갑옷 입은 적엔 칼보다 둔기가 효과적임을 알면 ‘왜 메이스를 들었나’가 설득된다.' },
      { name: '워해머(전투망치)', aka: '루체른 해머', era: '중세 후기', reach: '한 팔~두 팔(장병형도).', speed: '내려치는 큰 동작, 뾰족한 반대편(부리)으로 ‘찍는’ 변화.', sound: '망치면의 “쾅”, 부리가 갑옷을 뚫는 “콱”.', feel: '한쪽은 둔격, 한쪽은 송곳 — 두 위협을 한 무기에.', tactic: '둔격으로 갑옷을 무력화하고, 송곳 부리로 투구·관절을 ‘뚫는다’.', injury: '함몰(둔격)과 깊은 천공(부리)의 양면 손상.', cliche: '대갑옷 시대 병기의 진화(베기→둔격·천공)를 그리면 전투 고증의 깊이가 산다.' },
      { name: '편곤·도리깨(플레일)', aka: '쇠도리깨', era: '여러 시대', reach: '자루+사슬+추 — 예측 불가의 곡선.', speed: '원심력으로 한 번 돌면 멈추기 어렵다 — 위력 크나 통제 난해.', sound: '추가 도는 “부웅”, 사슬이 감기는 “차르륵”.', feel: '다루기 가장 어려운 무기 중 하나 — 자칫 자기 몸을 친다.', tactic: '방패를 ‘넘어’ 때린다(추가 휘감겨 방패 뒤를 친다). 다만 빗나감의 위험이 크다.', injury: '둔격·함몰 — 방어 너머를 치는 변칙 손상.', cliche: '‘사슬 달린 별 모양 추’의 화려한 이미지는 후대 과장이 많다 — 실제 운용은 매우 까다로웠음을 알면 묘사가 신중해진다.' },
    ],
  },
  {
    key: 'hidden', label: '암기(暗器)·은닉·기관', icon: '🌑',
    note: '무협·암살극의 향신료. 보이지 않는 한 수 — 다만 ‘은밀함’이 곧 ‘위력의 한계’임을 함께 그려야 설득된다.',
    items: [
      { name: '소매·품 속 비도(飛刀)', aka: '소매검·비수', era: '무협(가상 고증)', reach: '근거리 기습. 손이 닿는 순간이 전부.', speed: '소매에서 빼는 한 동작 — 의표를 찌르는 속도.', sound: '옷자락 스치는 소리뿐, 거의 무음의 “핏”.', feel: '작고 가벼워 늘 숨겨 둔다 — 들킨 순간 위력의 절반을 잃는다.', tactic: '대화·인사처럼 ‘방심한 거리’에서 한 수. 먼저 시선·손을 묶어 두는 ‘속임’이 본체.', injury: '얕은 자창 — 단독 치명상보단 ‘틈 만들기’. 급소에 닿아야 결정적.', cliche: '암기 한 방으로 고수를 즉사시키는 무협 연출은 과장 — ‘방심·속임’이라는 전제 없이는 통하지 않는다.' },
      { name: '독침·취전(吹箭)', aka: '입으로 부는 바늘·블로건', era: '여러 문화·무협', reach: '근~중거리, 짧고 조용한 사거리.', speed: '입김 한 번 — 소리 없이 날아간다.', sound: '거의 무음, “후—핏” 정도의 숨소리.', feel: '대롱과 작은 바늘 — 숨기기 쉽고 발견이 어렵다.', tactic: '은신·매복에서 한 수. 효과는 ‘즉각’보다 ‘서서히’ 오게 그리면 서스펜스가 산다.', injury: '아주 작은 자입 자국 — 외상은 거의 없어 ‘왜 쓰러졌는지 모를’ 단서가 된다.', cliche: '독의 즉효를 과신하지 말 것 — 발현 시간·증상은 ‘독’ 자료와 맞춰 개연성을 잡는다(부상·독 묘사 연계).' },
      { name: '쇠사슬·유성추', aka: '연자추·구절편', era: '무협(가상 고증)', reach: '길게 늘이면 중거리, 감으면 근거리 — 가변적.', speed: '돌리고 던지고 감는 연속 동작 — 화려하나 통제가 어렵다.', sound: '쇠사슬의 “차르르”, 추가 바람을 가르는 “부웅”.', feel: '숙련엔 오랜 수련이 필요 — 어설프면 제 발을 묶는다.', tactic: '거리를 자유자재로 바꾸며 적의 무기·발목을 감아 제압. ‘무기를 빼앗는’ 기술이 백미.', injury: '둔격·교란 — 감겨 넘어뜨리는 제압이 주효.', cliche: '무협 특유의 과장된 곡예를 ‘수련의 결과’로 묘사하면 황당함 대신 설득이 생긴다.' },
      { name: '기관(機關)·함정 장치', aka: '독전·노궁 함정', era: '무협·고분물', reach: '설치한 공간 전체 — ‘들어선 순간’이 발동.', speed: '발동은 즉각, 설치엔 시간·지식이 든다.', sound: '걸림쇠의 “철컥”, 발사·낙하의 굉음, 정적 뒤의 굉음 대비가 핵심.', feel: '직접 싸우지 않고 ‘공간을 무기로’ — 설계자의 머리싸움.', tactic: '연쇄 노궁·낙석·독연 등으로 침입자를 거른다. ‘해제의 단서’를 심어 두면 추리의 재미.', injury: '관통·둔격·중독 등 장치에 따라 다양 — 복합 손상.', cliche: '무한정 정교한 함정은 비현실 — 유지·작동의 한계(녹·낡음·오작동)를 넣으면 리얼리티가 산다.' },
    ],
  },
  {
    key: 'armor', label: '갑주·방어구', icon: '🛡️',
    note: '“무엇으로 막느냐”가 “무엇으로 치느냐”를 결정한다. 갑옷의 발달이 무기의 진화를 끌어냈다 — 둘은 한 쌍이다.',
    items: [
      { name: '가죽·누비(갬비슨)', aka: '솜누비 갑옷', era: '전 시대(기본 방어)', reach: '—', speed: '가벼워 기동에 유리.', sound: '둔탁한 ‘퍽’ — 베임을 어느 정도 흡수.', feel: '가볍고 저렴 — 가장 널리 입던 ‘기본’. 사슬·판금 아래 받침으로도 쓴다.', tactic: '베기·둔격을 분산. 화살·찌름엔 약하다.', injury: '둔격·찌름엔 비교적 취약, 가벼운 베임엔 강하다.', cliche: '‘평민은 무방비’라는 통념과 달리 누비 갑옷이 널리 쓰였음을 알면 전장 묘사가 풍부해진다.' },
      { name: '사슬갑옷(메일)', aka: '체인메일', era: '고대~중세', reach: '—', speed: '무겁지만 유연 — 움직임은 자유롭다.', sound: '고리들이 쓸리는 “차르륵”, 베일 때 “챙”.', feel: '베기를 잘 막으나 둔격은 그대로 전해진다 — 받침 누비가 필수.', tactic: '베기·스침엔 강하고, 찌름(좁은 송곳)·둔격엔 약하다. 그래서 둔기·송곳 무기가 발달.', injury: '베임은 막아도 ‘안쪽 멍·골절’은 남는다(둔격 손상).', cliche: '사슬갑옷이 찌름까지 막는다는 오해 — 가는 송곳·강한 찌름엔 고리가 벌어진다.' },
      { name: '판금갑옷(플레이트)', aka: '풀 플레이트', era: '중세 후기~르네상스', reach: '—', speed: '의외로 기동성 좋다(무게가 온몸에 분산). 다만 지구력 소모 큼.', sound: '판이 부딪는 “철그렁”, 둔격의 “쾅”.', feel: '베기를 거의 무력화 — 칼은 ‘틈’을 노려야 한다.', tactic: '베기 무용→찌름(틈)·둔격(충격)·레슬링(넘어뜨려 단검 마무리)으로 전환. 무기 진화의 방아쇠.', injury: '직접 손상은 적지만 둔격의 충격은 안으로 — ‘겉 멀쩡, 속 골절’.', cliche: '판금 입은 기사가 넘어지면 못 일어난다는 건 낭설 — 잘 만든 갑옷은 구르고 뛸 수 있었다.' },
      { name: '방패', aka: '실드·라운드/카이트/타워', era: '전 시대', reach: '몸 앞 한 뼘 — ‘맞기 전에 막는’ 거리.', speed: '막고 밀치는 능동적 도구 — 단순한 벽이 아니다.', sound: '막을 때 “쿵”, 가장자리로 치는 “퍽”.', feel: '한 팔의 부담이 크나, 있고 없고가 생사를 가른다.', tactic: '겹쳐 ‘벽’을 만들고, 모서리로 치고, 밀어 무너뜨린다. ‘방패벽’은 고대 보병의 핵심.', injury: '가장자리·돌기로 가하는 둔격도 가능 — 방어구이자 무기.', cliche: '방패를 수동적 ‘벽’으로만 그리면 아깝다 — 밀치고 때리는 ‘능동 방어’가 진짜 묘미.' },
      { name: '투구', aka: '헬름·바시넷·갑투', era: '전 시대', reach: '—', speed: '시야·청각을 일부 가린다 — ‘답답함’이 곧 약점.', sound: '안에서 듣는 자기 숨소리와 둔탁한 외부음 — 갇힌 감각.', feel: '머리를 지키나 시야가 좁아져 ‘옆·뒤’가 사각.', tactic: '두부 둔격·자창을 막는다. 적은 ‘투구 틈(눈·목)’을 노린다.', injury: '잘 막으면 둔격을 분산, 틈을 찔리면 치명적.', cliche: '투구 쓴 인물의 ‘좁은 시야·답답한 호흡’을 묘사에 넣으면 전투의 긴박함이 살아난다.' },
    ],
  },
  {
    key: 'tactic', label: '전술·합(合)·간격', icon: '🎯',
    note: '무기보다 중요한 건 ‘어떻게 쓰느냐’. 간격(間合)·박자·대형 — 액션·무협 묘사의 뼈대가 여기 있다.',
    items: [
      { name: '간격(間合·거리 재기)', aka: '마아이·리치 싸움', era: '전 시대·전 무술', reach: '두 사람 사이의 ‘닿느냐 마느냐’의 한 발.', speed: '들고 나며 거리를 흔드는 정적인 탐색 — 폭발 직전의 정지.', sound: '발을 끄는 소리, 숨 고르는 소리뿐인 정적.', feel: '“닿을 듯 말 듯”의 긴장 — 한 발이 곧 승부.', tactic: '내 무기는 닿고 상대는 못 닿는 ‘거리’를 만드는 싸움. 긴 무기는 거리를, 짧은 무기는 ‘파고듦’을 노린다.', injury: '—', cliche: '액션을 ‘칼 부딪힘의 연속’으로만 그리면 단조롭다 — 부딪히기 전, 거리와 호흡의 정적을 살리면 긴장이 산다.' },
      { name: '합(合)·교환', aka: '공방의 한 박자', era: '검술·무협', reach: '맞닿은 거리에서 오가는 한 호흡.', speed: '치고-막고-되받는 박자의 연쇄 — 빠를수록 ‘숨 막히는’ 연출.', sound: '쇳소리의 연쇄 “챙-챙-차앙”, 사이사이의 거친 숨.', feel: '한 합마다 체력과 집중이 깎인다 — 길어질수록 실수가 생긴다.', tactic: '먼저 무너지는 자가 진다. ‘한 합에 끝낼지, 합을 쌓아 지치게 할지’가 전략.', injury: '—', cliche: '수십 합을 화려하게 주고받는 무협식 연출은 ‘체력 소모’를 무시한 과장 — 지침·숨참을 넣으면 현실감이 생긴다.' },
      { name: '선제·후발(先後)', aka: '먼저 칠까, 받아칠까', era: '전 무술', reach: '—', speed: '먼저 치는 ‘선’과, 끌어들여 되받는 ‘후’의 박자 싸움.', sound: '정적 속의 첫 움직임이 모든 것을 연다.', feel: '먼저 친 자는 빈틈이 생기고, 기다린 자는 인내가 필요 — 양날.', tactic: '먼저 쳐 기선을 잡거나, 일부러 빈틈을 보여 ‘유인’한 뒤 되받는다(후발선지).', injury: '—', cliche: '늘 ‘먼저 치는 쪽이 유리’한 건 아니다 — 받아치기의 묘를 그리면 고수의 격이 산다.' },
      { name: '대형(隊形)·방진', aka: '진형·라인 전투', era: '집단 전투', reach: '대열 전체가 만드는 ‘면(面)’.', speed: '개인은 느려도 대열은 한 박자에 움직인다 — 기율이 곧 속도.', sound: '구령·북소리에 맞춘 발맞춤, 방패·창의 일제 합주.', feel: '혼자가 아니라 ‘벽의 일부’ — 옆 사람을 믿는 것이 곧 방어.', tactic: '방패벽·장창방진으로 정면을 굳히고, 측면·후방을 지킨다. ‘대열이 무너지는 순간’ 학살이 시작된다.', injury: '—', cliche: '영웅 한 명이 군대를 흩는 연출은 비현실 — 집단전은 ‘기율의 붕괴’로 결판남을 보여줄 것.' },
      { name: '기병 돌격', aka: '충격 기병·랜스 차지', era: '고대~근세', reach: '말의 속도가 만드는 ‘닿기 전의 공포’.', speed: '느리게 다가오다 마지막에 폭발하는 가속 — 땅을 울리는 질주.', sound: '말발굽이 땅을 울리는 “두두두두”, 창이 부딪는 굉음, 그 전의 침묵.', feel: '말 위의 높이와 속도가 곧 위력 — 다만 한 번 빗나가면 멈추기 어렵다.', tactic: '대열의 측면·배후를 친다. 정면의 ‘창 숲(방진)’ 앞에선 말이 멈춰 무력화된다.', injury: '—', cliche: '기병이 보병 방진을 정면으로 들이받는 묘사는 오류 — 말은 창 벽 앞에서 본능적으로 멈춘다.' },
      { name: '매복·기습', aka: '복병·야습', era: '전 시대', reach: '지형이 만든 ‘보이지 않는 거리’.', speed: '오랜 기다림 뒤의 순간 폭발 — 정적과 굉음의 낙차.', sound: '풀벌레·바람의 정적, 그것을 찢는 함성·화살비.', feel: '기다림의 인내와 ‘들키면 끝’이라는 긴장.', tactic: '지형·어둠·날씨를 이용해 적의 ‘방심한 순간’을 친다. 한 번의 기습이 수적 열세를 뒤집는다.', injury: '—', cliche: '매복은 ‘운’이 아니라 ‘정보와 인내’의 결과 — 준비 과정을 그리면 설득력이 산다.' },
    ],
  },
  {
    key: 'sense', label: '전투 감각·묘사 단서', icon: '👂',
    note: '무기 이름보다 독자를 사로잡는 건 ‘감각’이다. 소리·냄새·시간감·공포를 모아 둔 묘사용 단서 상자.',
    items: [
      { name: '소리의 층위', aka: '전장의 사운드스케이프', era: '—', reach: '—', speed: '—', sound: '멀리선 함성·북소리, 가까이선 쇳소리·비명·숨소리. 화기 시대엔 굉음 뒤 ‘귀가 먹먹한 정적’.', feel: '소리가 멀고 가까움에 따라 ‘거리감’이 잡힌다 — 묘사의 원근법.', tactic: '소리를 ‘멀리→가까이→몸 안(자기 심장·숨)’ 순으로 좁히면 긴장이 조여든다.', injury: '—', cliche: '전투를 시각으로만 그리면 평면적 — 소리의 원근을 넣으면 장면이 입체가 된다.' },
      { name: '냄새·연기', aka: '피·흙·화약·쇠', era: '—', reach: '—', sound: '—', feel: '쇠 냄새 같은 피비린내, 젖은 흙, 땀, 화기 시대의 매캐한 화약 연기. 연기는 시야를 가려 ‘아무것도 안 보이는 공포’.', tactic: '화약 연기로 자욱한 전장에선 ‘보이지 않는 적’의 공포를 묘사할 수 있다.', injury: '—', cliche: '냄새 묘사를 빼면 절반을 잃는다 — 후각은 가장 원초적인 공포의 통로다.' },
      { name: '시간감의 왜곡', aka: '슬로·체감 시간', era: '—', reach: '—', speed: '극도의 긴장에서 시간이 ‘느리게’ 늘어지는 체감 — 한 호흡이 영원처럼.', sound: '소리가 멀어지고, 자기 심장 소리만 크게 들리는 ‘터널’ 감각.', feel: '아드레날린이 만든 좁은 시야(터널 비전)와 느려진 시간 — 손이 떨리고 입이 마른다.', tactic: '결정적 순간만 ‘느리게’ 늘이고 나머지는 빠르게 처리하면 리듬이 산다.', injury: '—', cliche: '모든 장면을 슬로모션으로 늘이면 오히려 긴장이 죽는다 — ‘한 박자’만 늘일 것.' },
      { name: '부상의 즉시 반응', aka: '아픔보다 먼저 오는 충격', era: '—', reach: '—', speed: '맞은 직후엔 통증보다 ‘충격·뜨거움·먹먹함’이 먼저, 통증은 뒤늦게 밀려온다.', sound: '자기 비명을 ‘남의 것처럼’ 듣는 분리감.', feel: '아드레날린이 통증을 잠시 가려, 다친 줄 모르고 싸우다 ‘피를 보고서야’ 무너지기도 한다.', injury: '구체적 부상 양상·치료·회복 경과는 〈부상·회복 사전〉과 맞춰 그릴 것 — 출혈·골절·쇼크의 단계.', cliche: '맞자마자 비명을 지르며 쓰러지는 연출보다, ‘늦게 오는 통증’이 더 사실적이고 처절하다.' },
      { name: '공포·아드레날린', aka: '싸움-도망 반응', era: '—', reach: '—', speed: '심장이 뛰고 호흡이 가빠지며 손이 떨린다 — 정밀 동작이 어려워진다.', sound: '귀가 ‘웅—’ 울고 주변 소리가 멀어진다.', feel: '용기란 ‘두렵지 않음’이 아니라 ‘두려워도 움직이는 것’ — 떨리는 손, 마른 입, 후들거리는 다리를 그릴 것.', tactic: '두려움을 ‘이긴’ 묘사보다 ‘안고 가는’ 묘사가 인물을 입체로 만든다.', injury: '—', cliche: '주인공이 전혀 떨지 않는 ‘무감각한 강함’은 오히려 얕다 — 두려움의 묘사가 용기를 빛나게 한다.' },
      { name: '체력·지구력의 한계', aka: '지쳐가는 몸', era: '—', reach: '—', speed: '싸움이 길어질수록 팔이 무거워지고 칼끝이 처진다 — 후반엔 ‘속도’가 아니라 ‘버팀’의 싸움.', sound: '거칠어지는 숨, 갈라지는 목소리.', feel: '갑옷·무기의 무게가 시간과 함께 ‘배로’ 느껴진다 — 짧은 전투가 현실적인 이유.', tactic: '체력 안배가 곧 전략 — ‘오래 끌어 지치게 하기’ vs ‘단숨에 끝내기’.', injury: '—', cliche: '지치지 않고 수십 합을 싸우는 묘사는 비현실 — 호흡·근육의 한계를 넣으면 긴박함이 산다.' },
    ],
  },
]

const LS = 'sry:tool:weapons-combat-ref:'
const ALL = '__all__'

type Flat = { cat: CatDef; item: Entry }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 항목 → 단서 묶음(필드 라벨 포함)
const FIELDS: { k: keyof Entry; label: string }[] = [
  { k: 'aka', label: '이칭·계열' },
  { k: 'era', label: '시대·문화' },
  { k: 'reach', label: '간격(거리감)' },
  { k: 'speed', label: '속도·리듬' },
  { k: 'sound', label: '소리' },
  { k: 'feel', label: '무게·감각' },
  { k: 'tactic', label: '전술·운용' },
  { k: 'injury', label: '부상 양상' },
  { k: 'cliche', label: '고증·유의' },
]

function plainText(f: Flat): string {
  const lines = [`⚔️ ${f.item.name}  (${f.cat.label})`]
  for (const fd of FIELDS) {
    const v = f.item[fd.k]
    if (v && v !== '—') lines.push(`· ${fd.label}: ${v}`)
  }
  return lines.join('\n')
}

function bodyHtml(f: Flat): string {
  const rows = FIELDS
    .filter((fd) => f.item[fd.k] && f.item[fd.k] !== '—')
    .map((fd) => `<p><b>${escapeHtml(fd.label)}</b>: ${escapeHtml(String(f.item[fd.k]))}</p>`)
    .join('')
  return [
    `<p><b>${escapeHtml(f.cat.icon + ' ' + f.cat.label)} · ${escapeHtml(f.item.name)}</b></p>`,
    rows,
    `<p><i>※ 액션·무협·역사물 창작 참고 자료. 실제 사용·제작을 위한 정보가 아닙니다.</i></p>`,
  ].join('')
}

export default function WeaponsCombatRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 가 오면 검색 힌트로 활용(맥락 활용)
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

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  const favKey = (catKey: string, name: string) => `${catKey}::${name}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base: Flat[] = cat === ALL ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[favKey(c.key, item.name)])
    if (q) {
      base = base.filter(({ cat: c, item }) => {
        if (c.label.toLowerCase().includes(q)) return true
        if (item.name.toLowerCase().includes(q)) return true
        return FIELDS.some((fd) => String(item[fd.k] || '').toLowerCase().includes(q))
      })
    }
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    const pool: Flat[] = cat === ALL ? flatAll()
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

  // 수집함에 담기 — addToStash(...)
  const toStash = (f: Flat) => {
    if (!hasStash()) { flash('수집함에 연결되어 있지 않습니다.'); return }
    addToStash({ kind: 'note', label: `${f.item.name} (${f.cat.label})`, text: plainText(f) })
    flash(`수집함에 ‘${f.item.name}’ 자료를 담았습니다.`)
  }

  // 스니펫 저장(글감) — addToLibrary('snippets', ...)
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: `[무기·전투 자료] ${plainText(f)}`,
      source: '무기·전투 사전 (액션·무협·역사)',
      tags: ['무기', '전투', '액션', '무협', f.cat.label, f.item.name],
    })
    flash(`스니펫 라이브러리에 ‘${f.item.name}’ 자료를 저장했습니다.`)
  }

  // 프로젝트 자료에 추가 — addToProject(...)
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '무기·전투 자료',
      title: `${f.item.name} (${f.cat.label})`,
      bodyHtml: bodyHtml(f),
      meta: { 분류: f.cat.label, 시대: f.item.era && f.item.era !== '—' ? f.item.era : '', 간격: f.item.reach && f.item.reach !== '—' ? '있음' : '' },
    })
    if (id) flash(`프로젝트 자료 〈무기·전투 자료〉에 ‘${f.item.name}’을(를) 추가했습니다.`)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  const renderFields = (item: Entry) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
      {FIELDS.filter((fd) => item[fd.k] && item[fd.k] !== '—').map((fd) => (
        <div key={fd.k} style={{ fontSize: 12.5, lineHeight: 1.55 }}>
          <span style={{ color: 'var(--accent)', fontWeight: 600, marginRight: 6 }}>{fd.label}</span>
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
        <Emoji e="⚔️" /> <b style={{ color: 'var(--text)' }}>창작 참고 자료</b>입니다. 액션·무협·역사물의 무기·전투 장면 고증과 감각 묘사를 위한 서사용 단서이며,
        실제 사용·제작을 위한 정보가 아닙니다. 디테일은 ‘이야기의 개연성’에 맞춰 각색해 쓰세요.
      </div>

      <div style={hint}>
        도검·창·궁노·화기·둔기·암기·갑주·전술·전투 감각 등 <b>{total}개</b> 항목을 카테고리로 정리했습니다.
        검색·펼침으로 찾고, 무작위로 장면 영감을 얻고, 클릭해 복사하거나 수집함·스니펫·프로젝트로 보내세요.
        {genreHint && genreHint !== '액션·무협·역사' ? <>  (전달된 맥락: <b>{genreHint}</b>)</> : null}
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름·시대·간격·소리·전술로 검색 (예: 간격, 재장전, 방패벽, 판금)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL)} aria-pressed={cat === ALL}
          style={{ borderColor: cat === ALL ? 'var(--accent)' : 'var(--border)', color: cat === ALL ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🗂️" /> 전체
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={c.icon} /> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 자료</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('injury-recovery-ref')}
          title="부상·회복 사전 열기 — 무기가 만든 부상의 양상·치료·회복 경과를 이어서 정리"
          style={{ marginLeft: 'auto' }}>
          <Emoji e="🩹" /> 부상·회복 사전
        </button>
        <span style={hint}>{filtered.length}개 표시</span>
      </div>

      {/* 무작위 결과 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          {renderFields(random.item)}
          <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(plainText(random), 'rnd')}>
              {copiedKey === 'rnd' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
            </button>
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="💾" /> 스니펫 저장</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>
              {favs[favKey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => toStash(random)} disabled={!hasStash()}
              title={hasStash() ? '이 자료를 플로팅 수집함에 담기' : '수집함에 연결되어 있지 않습니다'}>
              <Emoji e="📎" /> 수집함
            </button>
            <button className="linkbtn" onClick={() => toProject(random)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 자료를 프로젝트 자료 〈무기·전투 자료〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('injury-recovery-ref')} title="부상·회복 사전 열기"><Emoji e="🩹" /> 부상·회복 사전</button>
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
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /> {c.label}</span>
                  <button onClick={() => toggleExpand(fk)} title={open ? '접기' : '펼치기'}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', fontSize: 15, fontWeight: 700, textAlign: 'left' }}>
                    {open ? '▾' : '▸'} {item.name}
                  </button>
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(c.key, item.name)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                {!open && (item.reach && item.reach !== '—' ? item.reach : item.feel) && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.reach && item.reach !== '—' ? item.reach : item.feel}
                  </div>
                )}
                {open && renderFields(item)}
                {open && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
                    <button className="minibtn" onClick={() => copy(plainText({ cat: c, item }), 'item:' + fk)}>
                      {copiedKey === 'item:' + fk ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
                    </button>
                    <button className="minibtn" onClick={() => saveSnippet({ cat: c, item })}><Emoji e="💾" /> 스니펫 저장</button>
                    <button className="linkbtn" onClick={() => toStash({ cat: c, item })} disabled={!hasStash()}
                      title={hasStash() ? '수집함에 담기' : '수집함에 연결되어 있지 않습니다'}>
                      <Emoji e="📎" /> 수집함
                    </button>
                    <button className="linkbtn" onClick={() => toProject({ cat: c, item })} disabled={!hasProjectBridge()}
                      title={hasProjectBridge() ? '프로젝트 자료에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                      <Emoji e="📄" /> 프로젝트에 추가
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>자료는 정답이 아니라 출발점입니다. 시대·문화·갑주 수준에 맞춰 ‘간격·박자·소리’를 비틀어 당신만의 전투 장면을 설계하세요. 부상의 구체적 양상은 〈부상·회복 사전〉과 함께 그리면 깊어집니다.</div>
    </div>
  )
}
