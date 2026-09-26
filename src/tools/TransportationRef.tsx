// 이동수단·여정 사전 — 여로물·역사물·로드무비식 서사의 '이동 고증과 감각'을 돕는 로컬 자작 자료집.
//  시대·문화별 탈것(도보/말/마차/배/기차/자동차/비행)의 속도·비용·여정 디테일·위험을 정리한다.
//  자급식: react 와 './linkbus' 외 import 없음. 외부 API/미디어/네트워크 없음(전부 로컬 자작 데이터).
//  카테고리 펼침 + 검색 + 무작위 + 클릭복사 + 수집함/스니펫/프로젝트 연계 + 관련 도구 열기(시대 사전).
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, addToStash, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'transportation-ref',
  name: '이동수단·여정 사전',
  icon: '🧭',
  group: '리서치·자료',
  genre: '여로물·역사·모험',
  intro: '시대·문화별 탈것(도보/말/마차/배/기차/자동차/비행)·속도·비용·여정 디테일·위험을 정리한 여로물 고증 참고 자료',
  w: 680,
  h: 700,
}

// ---------- 항목 형(型) ----------
// 모든 텍스트는 '서사용 단서'다 — 정확한 수치 사전이 아니라 장면의 속도감·비용감·고생·위험을 잡는 감각 자료.
interface Entry {
  name: string          // 명칭
  aka?: string          // 이칭·계열·예시
  era?: string          // 시대·문화 배경
  speed?: string        // 속도·하루 이동 거리(체감)
  cost?: string         // 비용·계급(누가 타는가)
  comfort?: string      // 승차감·고생(피로·멀미·추위)
  journey?: string      // 여정 디테일(준비·휴식·숙박·식사·동행)
  hazard?: string       // 위험(사고·도적·날씨·고장·질병)
  sense?: string        // 감각(소리·냄새·흔들림·풍경)
  cliche?: string       // 흔한 오류·고증 유의
}
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ---------- 로컬 대량 자료집 ----------
const CATS: CatDef[] = [
  {
    key: 'foot', label: '도보·짐꾼·동물 등짐', icon: '🥾',
    note: '가장 오래된 여정. 발과 등에 의지하는 이동은 ‘하루에 얼마나 가느냐’가 곧 이야기의 거리감이다 — 길·물·발의 상태가 모든 것을 가른다.',
    items: [
      { name: '도보 여행자(맨몸)', aka: '순례자·행상·방랑객', era: '전 시대·전 문화', speed: '평지 하루 30~40리(약 12~16km)가 무난, 무리하면 더 가나 다음 날 발이 망가진다. 산길·진창은 절반으로 준다.', cost: '돈이 거의 안 드는 ‘가난한 자의 길’. 다만 시간이라는 가장 큰 값을 치른다.', comfort: '발의 물집·관절·허리가 며칠 만에 한계. 짚신·가죽신·신발 바닥이 닳는 속도가 곧 여정의 시계.', journey: '해 뜨면 걷고 정오에 쉬며, 해 지기 전 마을·주막·동굴을 찾는다. 물·소금·마른 식량이 생명선.', hazard: '발병·탈수·일사병·동상. 인적 없는 길의 도적과 들짐승. 길을 잃으면 그 자체가 죽음.', sense: '제 숨소리와 발자국, 흙·풀 냄새, 짐끈이 어깨를 파고드는 압박. 멀리 보이던 산이 종일 가도 가까워지지 않는 막막함.', cliche: '며칠을 쉬지 않고 걷는 묘사는 비현실 — 발·물·식량의 한계를 넣어야 여정에 무게가 실린다.' },
      { name: '지게·봇짐 짐꾼', aka: '보부상·포터·캐러밴 인부', era: '전근대 전 문화', speed: '무거운 짐 때문에 맨몸의 절반~2/3. 비탈·계단에선 더 느리다.', cost: '품삯을 받고 남의 짐을 진다 — 하층의 고된 생계. 무게에 따라 삯이 매겨진다.', comfort: '어깨·허리·무릎이 가장 먼저 무너진다. 짐을 지고 내려놓는 ‘쉼’의 리듬이 하루를 지탱.', journey: '여럿이 줄지어(대상·행렬) 움직이며 짐을 나눠 진다. 쉴 곳·물·끼니를 미리 안배.', hazard: '짐의 무게로 인한 낙상·관절 손상, 짐 도난, 인부 간 다툼.', sense: '짐이 삐걱이는 소리, 거친 숨, 등을 적시는 땀, 무게가 빠질 때의 순간적 해방감.', cliche: '주인공이 무거운 짐을 가볍게 지고 험로를 내달리는 건 과장 — 짐의 무게가 곧 속도와 고생이다.' },
      { name: '낙타 대상(隊商)', aka: '카라반·사막 행렬', era: '고대~근세 건조 지대', speed: '하루 30~40km, 사막에선 더디나 며칠을 물 없이 버틴다. 더위를 피해 밤에 이동하기도.', cost: '낙타와 물자, 안내인·호위를 갖춰야 하는 ‘조직된 여정’. 교역으로 본전을 뽑는다.', comfort: '낙타 위의 흔들림과 모래·열기·갈증. 등을 곧추세우기 어려운 멀미 같은 요동.', journey: '오아시스를 잇는 길을 따라 움직이며, 물·사료·차양을 철저히 안배한다. 별과 지형으로 길을 읽는다.', hazard: '모래폭풍·길 잃음·탈수, 오아시스 사이의 거리 오판, 도적단(노상강도)의 습격.', sense: '낙타 방울과 발이 모래를 누르는 소리, 마른 바람과 모래 냄새, 한낮의 신기루와 밤의 차가움.', cliche: '사막을 며칠 걸어 횡단하는 ‘맨몸 영웅’ 묘사는 비현실 — 물·낙타·안내인이라는 시스템이 곧 생존이다.' },
    ],
  },
  {
    key: 'horse', label: '말·기마·역참', icon: '🐎',
    note: '전근대 ‘속도’의 상징. 다만 말은 기계가 아니다 — 먹이고 쉬게 하고 갈아타야 달린다. 그 한계가 곧 여정의 긴장이다.',
    items: [
      { name: '기마(보통 승마)', aka: '말 타고 가기', era: '말을 다루는 전 문화', speed: '평보·속보 섞어 하루 40~60km. 무리해서 빨리 달리면 말이 며칠을 쉬어야 한다.', cost: '말 한 마리는 큰 재산 — 사육·편자·사료가 계속 든다. 가진 자의 이동수단.', comfort: '익숙하면 빠르고 시원하나, 초심자는 안짱다리·엉덩이 통증·낙마 위험. 종일 타면 허리가 끊어진다.', journey: '말을 먹이고 물 먹이고 편자를 점검하는 일이 여정의 절반. 말의 컨디션이 곧 일정.', hazard: '낙마·말의 다리 부상(여정 끝)·놀란 말의 폭주. 도적은 말과 사람을 함께 노린다.', sense: '말발굽의 ‘다그닥’, 가죽 안장의 삐걱임, 말의 땀·풀 냄새, 빠른 바람과 높은 시선.', cliche: '말을 쉬지 않고 며칠 전속력으로 달리게 하는 묘사는 큰 오류 — 말은 곧 지치고 죽는다. ‘말을 아끼는’ 묘사가 고증.' },
      { name: '역참·파발(릴레이)', aka: '역마·포니 익스프레스·파발마', era: '고대 제국~근대 이전', speed: '지친 말을 새 말로 갈아타며 달려, 단신 기마의 몇 배 거리를 하루에 주파. 급보는 밤낮으로 이어 달린다.', cost: '국가·관(官)의 시스템 — 통행 증표(마패 등)가 있어야 말을 받는다. 사사로이 못 쓴다.', comfort: '갈아타는 사이의 짧은 쉼뿐, 안장 위에서 먹고 조는 강행군. 며칠이면 사람이 먼저 무너진다.', journey: '일정 거리마다 역(驛)·관(館)이 있어 말·물·끼니·잠자리를 공급. 길은 곧 국가의 핏줄.', hazard: '강행군의 탈진, 야간 주행의 낙마, 길의 끊김(전란·홍수)으로 인한 지연.', sense: '역에 들이닥치는 말발굽 소리, “말 갈아라!”의 외침, 갈아탄 새 말의 거친 숨.', cliche: '평민이 마음대로 역마를 타는 설정은 오류 — 역참은 권한과 증표가 필요한 ‘국가 인프라’다.' },
      { name: '전령·경마(輕馬)', aka: '단기 급사·연락병', era: '전 시대', speed: '짧은 거리를 가장 빠르게 — 단숨에 달려 소식을 잇는다. 장거리는 역참과 결합.', cost: '훈련된 말과 기수가 필요. 군·관의 통신 자원.', comfort: '속도를 위한 가벼운 차림, 휴대품 최소. 안장에서 흔들리는 짧고 강한 질주.', journey: '소식·명령을 정확히 전하는 것이 본분 — 한 글자의 오차가 전쟁을 가른다.', hazard: '매복·차단(적이 전령부터 노린다), 낙마로 인한 소식의 소실.', sense: '바람을 가르는 질주, 봉인된 서찰의 무게, 도착해 숨을 헐떡이며 전하는 한마디.', cliche: '전령이 너무 쉽게 적진을 가로지르는 건 비현실 — 길목 차단과 매복이 첩보전의 핵심이다.' },
    ],
  },
  {
    key: 'cart', label: '수레·마차·역마차', icon: '🛞',
    note: '짐과 사람을 ‘함께’ 나르는 바퀴의 시대. 길이 좋아야 마차가 산다 — 도로·다리·진창이 곧 속도의 주인이다.',
    items: [
      { name: '소달구지·짐수레', aka: '우차(牛車)·핸드카트', era: '농경 전 문화', speed: '소가 끄는 무거운 짐수레는 사람 걸음보다 느린 하루 10~20km. 진창에선 멈춰 선다.', cost: '농가의 기본 운반 수단 — 짐·곡식·사람을 한꺼번에. 소 한 마리도 큰 재산.', comfort: '바퀴가 돌·구덩이에 닿을 때마다 온몸이 튄다. 짚을 깔아 충격을 덜지만 멀미가 흔하다.', journey: '소를 먹이고 쉬게 하는 느린 리듬. 무거운 짐엔 비탈·강 건넘이 큰일.', hazard: '바퀴축 파손·진창 빠짐·짐 쏠림으로 인한 전복. 느린 만큼 도적의 표적.', sense: '나무 바퀴의 삐걱임, 소의 워낭 소리, 짐이 흔들리며 부딪는 둔탁한 소리.', cliche: '짐수레로 먼 거리를 빠르게 주파하는 건 오류 — 느림과 길 상태가 여정의 고생을 만든다.' },
      { name: '역마차(스테이지코치)', aka: '합승 마차·우편마차', era: '근세~철도 이전 유럽·미주', speed: '말을 역에서 갈아 매며 달려 하루 80~100km까지. 길이 좋으면 빠르나 진창·산악에선 급감.', cost: '좌석값을 내는 ‘대중교통’ — 안쪽 좌석은 비싸고 지붕 위(바깥)는 싸고 춥다.', comfort: '좁은 좌석에 낯선 이들과 끼어 앉아 종일 덜컹임. 비포장의 충격과 먼지·추위로 녹초가 된다.', journey: '역(인)에서 말을 갈고 끼니·잠자리를 해결. 시간표가 있어 늦으면 두고 간다.', hazard: '전복·바퀴 파손·말의 폭주. 인적 드문 길의 노상강도(코치 강도)가 단골 위협.', sense: '말발굽과 바퀴 소리, 마부의 채찍·나팔, 좁은 객실의 땀·먼지, 창밖으로 흐르는 풍경.', cliche: '역마차가 멈추지 않고 밤새 부드럽게 달리는 묘사는 과장 — 역마다 서고, 길은 거칠고, 동승객과의 마찰이 곧 드라마.' },
      { name: '귀인의 사두마차', aka: '캐리지·가마식 마차', era: '근세 유럽 귀족', speed: '잘 닦인 길에서 빠르고 안정적. 다만 무거워 진창·비탈엔 약하다.', cost: '여러 마리 말·마부·하인이 따르는 부의 과시. 유지비가 막대하다.', comfort: '쿠션과 휘장으로 충격·바람을 막은 ‘움직이는 방’. 그래도 비포장의 흔들림은 남는다.', journey: '하인이 길·숙소·말을 미리 안배. 신분에 맞는 여관·통행이 보장된다.', hazard: '전복·강도(부유한 표적)·말 사고. 호화로움이 오히려 위험을 부른다.', sense: '잘 만든 용수철의 부드러운 출렁임, 가죽·향수 냄새, 휘장 너머의 거리 소음.', cliche: '귀족 마차가 어디든 빠르게 가는 건 과장 — 무게와 길의 한계로 평민 마차보다 느릴 때도 많다.' },
    ],
  },
  {
    key: 'water', label: '배·강·바다·운하', icon: '⛵',
    note: '육로보다 빠르고 많이 나르는 물의 길. 다만 바람·물때·날씨가 주인이라 ‘언제 떠나느냐’를 사람이 정하지 못한다.',
    items: [
      { name: '나룻배·강배', aka: '거룻배·삼판·페리', era: '강·하천 전 문화', speed: '물길을 따르면 빠르고, 거슬러 오르면 노·삿대·예인(끌기)으로 느려진다. 물때가 시간표.', cost: '뱃삯이 도보보다 비싸나 짐 운반엔 싸게 먹힌다. 강나루의 사공이 길목을 쥔다.', comfort: '잔잔하면 편하나 좁고 흔들린다. 짐·가축·사람이 뒤섞인 혼잡과 물비린내.', journey: '나루에서 배를 기다리고, 물때·바람을 보아 떠난다. 강을 건너는 일이 큰 분기점.', hazard: '여울·암초·급류, 과적으로 인한 전복, 홍수·결빙으로 인한 결항.', sense: '노 젓는 ‘철벅’, 물이 뱃전을 치는 소리, 젖은 나무와 물비린내, 출렁임에 따른 멀미.', cliche: '강을 아무 때나 즉시 건너는 묘사는 오류 — 사공·물때·뱃삯이라는 ‘건넘의 절차’가 긴장을 만든다.' },
      { name: '돛단 범선(연안·원양)', aka: '정크·캐러벨·갤리언', era: '고대~대항해 시대', speed: '바람 좋으면 하루 100해리 이상, 무풍·역풍이면 며칠을 한 자리에 묶인다. 바람이 곧 일정.', cost: '항해는 큰 자본 — 선주·선원·화물의 동업. 승선료·운임이 비싸다.', comfort: '비좁은 선실·갑판, 짠 음식과 부족한 물, 끝없는 멀미와 습기. 장기 항해는 괴혈병의 그늘.', journey: '바람·해류·별·해도를 읽어 항로를 잡는다. 보급항에서 물·식량을 채운다.', hazard: '폭풍·암초·좌초, 무풍대의 표류, 괴혈병·전염병, 해적의 습격.', sense: '돛이 바람을 먹는 ‘퍽’, 삐걱이는 선체, 짠 바람과 타르 냄새, 끝없는 수평선과 별.', cliche: '범선이 바람과 무관하게 늘 빠른 건 오류 — 무풍·역풍에 묶인 ‘기다림’이 항해 서사의 본질이다.' },
      { name: '운하 바지선·예인', aka: '운하배·트레크스하위트', era: '근세~산업기', speed: '말이 둑길에서 배를 끄는 예인은 느리되 매우 부드럽고 일정하다. 화물에 최적.', cost: '운임이 싸 대량 화물 운송의 동맥. 사람도 싸게 옮긴다.', comfort: '흔들림이 거의 없어 마차보다 편안 — 잠자며 가기도. 다만 갑문마다 멈추고 느리다.', journey: '갑문(록)을 여닫으며 수위를 맞춰 오르내린다. 예인용 말·삯이 운영의 핵심.', hazard: '갑문 사고·둑 붕괴·결빙. 좁은 수로의 정체와 충돌.', sense: '잔물결과 말발굽이 둑을 밟는 소리, 갑문에 물이 차오르는 소리, 느리게 흐르는 강변 풍경.', cliche: '운하배를 ‘느려서 무의미’하게 그리면 아깝다 — 대량·저비용·안정이라는 산업혁명의 숨은 동맥이었다.' },
    ],
  },
  {
    key: 'rail', label: '철도·기차', icon: '🚂',
    note: '시간과 거리를 통째로 다시 쓴 강철의 길. ‘시간표’가 생기고, 멀던 곳이 하루 거리로 줄어든 ‘속도 혁명’의 무대.',
    items: [
      { name: '증기 기관차(초기 철도)', aka: '스팀로코·완행열차', era: '19세기~20세기 초', speed: '초기엔 시속 30~50km도 경이로웠다 — 마차의 몇 배. 멀던 도시가 ‘하루 거리’로 좁혀졌다.', cost: '등급(1·2·3등칸)으로 계급이 나뉜다. 3등은 딱딱한 나무 의자, 1등은 푹신한 객실.', comfort: '석탄 연기와 재가 객실로 들어오고, 터널에선 매캐함이 가득. 그래도 마차보단 비교 불가로 편하다.', journey: '역의 시계와 시간표가 사람을 길들인다 — ‘기차 시간’이라는 새로운 규율. 플랫폼의 작별이 이별 장면의 무대.', hazard: '탈선·충돌·보일러 폭발(초기), 건널목 사고. 시간표 신뢰가 곧 안전.', sense: '기적의 “뿌우—”, 바퀴가 이음매를 밟는 ‘덜컹덜컹’, 석탄 연기와 증기, 창밖으로 빨려 흐르는 풍경.', cliche: '근대 이전 배경에 기차를 등장시키는 시대착오 주의 — 철도의 등장은 ‘세계가 좁아진’ 큰 사건임을 살릴 것.' },
      { name: '장거리 침대열차', aka: '슬리퍼·대륙횡단 열차', era: '19세기 말~20세기', speed: '밤낮으로 달려 며칠 만에 대륙을 가로지른다. 자는 사이 수백 km를 이동.', cost: '침대칸은 비싸고 좌석칸은 싸다. 식당칸·라운지의 사교가 여정의 풍경.', comfort: '흔들림에 몸을 맡기고 잠드는 독특한 안온함. 좁은 침대·공용 세면·낯선 동승객.', journey: '식당칸의 식사, 차창 너머 바뀌는 지형, 정차역마다의 짧은 산책. 시간이 ‘흐르는’ 여정.', hazard: '탈선·연착·도난, 폐쇄된 객실의 밀실 같은 긴장(추리물의 단골 무대).', sense: '레일의 규칙적 ‘다각다각’이 자장가가 된다. 식당칸 식기 소리, 차창에 맺힌 김.', cliche: '대륙횡단을 몇 시간 만에 끝내는 건 시대 오류 — 며칠의 ‘닫힌 공간’이 인물들을 엮는 무대다.' },
      { name: '전차·노면전차(시내)', aka: '트램·전차(電車)', era: '19세기 말~', speed: '시내를 일정 속도로 누비는 대중교통. 정류장마다 서며 도시의 리듬을 만든다.', cost: '값싼 도시 교통 — 노동자·서민의 발. 동전 한 닢의 이동.', comfort: '붐비는 입석, 흔들리는 손잡이, 정류장마다의 멈춤과 출발. 도시 군중의 냄새와 소음.', journey: '집과 일터, 시장과 극장을 잇는 일상의 동선. 도시 생활 그 자체.', hazard: '혼잡·소매치기·접촉 사고. 선로 위 보행자와의 충돌.', sense: '전차의 ‘땡땡’ 종소리, 전선의 스파크, 레일이 도는 ‘끼익’, 사람들의 어깨가 닿는 만원의 감각.', cliche: '전차가 등장하는 시대·도시 고증을 맞출 것 — 전차는 ‘근대 도시’의 상징적 풍경이다.' },
    ],
  },
  {
    key: 'auto', label: '자동차·도로', icon: '🚗',
    note: '개인이 ‘제 시간에 제 길로’ 떠나게 한 기계. 도로·연료·정비가 받쳐줘야 굴러간다 — 초기엔 모험, 후엔 일상.',
    items: [
      { name: '초기 자동차(클래식 카)', aka: '포드 모델 T 세대', era: '20세기 초', speed: '시속 수십 km, 비포장에선 더 느리고 자주 멈춘다. 그래도 마차를 빠르게 밀어냈다.', cost: '처음엔 부자의 장난감, 양산되며 중산층의 ‘꿈’으로. 연료·정비비가 든다.', comfort: '딱딱한 서스펜션과 비포장의 진동, 매연·소음·추위(개방형). 고장이 잦아 운전이 곧 정비.', journey: '연료를 미리 챙기고 펑크·고장에 대비. 지도와 이정표에 의지한 ‘도로 위의 모험’.', hazard: '잦은 고장·펑크, 비포장의 전복, 미숙한 운전과 보행자 사고. 주유소가 드물던 시절의 연료 걱정.', sense: '엔진의 털털거림, 경적의 ‘빵’, 매연과 기름 냄새, 비포장에서 튀어 오르는 진동.', cliche: '초기 자동차가 늘 멀쩡히 빨리 달리는 건 과장 — 고장·펑크·연료 걱정이 곧 ‘자동차 여행의 모험’이었다.' },
      { name: '대중 자동차·고속도로', aka: '세단·로드트립', era: '20세기 중반~', speed: '포장도로·고속도로에서 빠르고 일정하게. 하루 수백 km의 ‘로드트립’이 가능해졌다.', cost: '대량생산으로 보편화 — 가족의 발. 연료·보험·주차의 일상 비용.', comfort: '좌석·냉난방·음악으로 ‘이동하는 거실’. 다만 장거리 운전의 피로·졸음은 위험.', journey: '주유소·휴게소·모텔의 인프라가 길을 잇는다. 지도를 펴고 떠나는 자유의 상징.', hazard: '졸음·과속·음주 운전, 정체, 사고. 인적 드문 길의 고장·연료 부족.', sense: '엔진의 일정한 웅웅거림, 라디오, 창밖으로 흐르는 풍경, 휴게소의 커피 냄새.', cliche: '고속도로·주유소가 있는 시대인지 고증할 것 — 인프라가 곧 ‘자유로운 이동’의 전제다.' },
      { name: '버스·합승차', aka: '시외버스·승합·승차 공유', era: '근현대', speed: '정해진 노선을 일정 속도로. 도시 간·도시 내를 값싸게 잇는다.', cost: '가장 값싼 장거리 이동 — 서민·청년·이주민의 발. 표 한 장의 여정.', comfort: '좁은 좌석에 낯선 이들과 끼어 종일. 멀미·소음·붐빔, 정류장마다의 멈춤.', journey: '터미널에서 표를 끊고 시간표를 따른다. 차창 밖 풍경과 동승객이 만드는 이야기.', hazard: '과속·졸음운전·과적, 휴게소에서의 분실, 연착.', sense: '디젤 엔진음과 진동, 차내 방송, 낯선 이들의 숨소리, 휴게소의 잠깐의 햇빛.', cliche: '버스 여행을 단조롭게만 그리면 아깝다 — 낯선 동승객·창밖 풍경·정류장의 만남이 곧 로드무비의 정서.' },
    ],
  },
  {
    key: 'air', label: '비행·하늘 길', icon: '✈️',
    note: '땅과 바다의 한계를 단숨에 넘은 하늘. 다만 날씨·연료·기체가 받쳐줘야 뜬다 — 초기엔 목숨 건 모험, 후엔 일상의 점프.',
    items: [
      { name: '기구·비행선', aka: '열기구·체펠린', era: '18세기 말~20세기 초', speed: '바람에 의지하는 기구는 방향을 정하기 어렵고, 동력 비행선은 느리되 우아하게 떠간다.', cost: '초기엔 부자·탐험가·군의 영역. 가스·정비·계류장이 든다.', comfort: '높은 곳의 추위와 멀미, 더딘 속도. 비행선 객실은 의외로 호화로웠다(초기 항공의 사치).', journey: '바람·날씨를 읽어 띄운다. 계류장에서 가스를 채우고 무게를 맞춘다.', hazard: '강풍·낙뢰·가스 누출과 화재(가연성 수소의 재앙), 표류. 날씨가 곧 생사.', sense: '버너의 ‘쉭’과 불꽃, 발밑으로 멀어지는 땅, 고요한 상공의 바람, 발아래 펼쳐진 세상.', cliche: '기구의 방향을 마음대로 모는 건 오류 — 기구는 바람에 맡기고 ‘높낮이’만 조절한다. 비행선의 화재 위험도 잊지 말 것.' },
      { name: '프로펠러 비행기(초기 항공)', aka: '복엽기·우편기', era: '20세기 초~중반', speed: '하늘 길로 며칠 거리를 몇 시간에 — 다만 항속이 짧아 자주 착륙·급유한다.', cost: '초기엔 모험가·우편·군의 영역, 점차 부유층의 이동으로. 위험이 곧 값이다.', comfort: '시끄럽고 흔들리고 춥다(비기밀 객실). 멀미·소음에 시달리는 ‘용기 있는 자의 이동’.', journey: '날씨와 연료를 보며 단거리씩 잇는다. 비행장·정비·기상 판단이 생명선.', hazard: '엔진 고장·기상 악화·연료 소진·불시착. 초기 항공은 사고가 잦았다.', sense: '프로펠러의 굉음과 진동, 기름 냄새, 발아래 구름과 땅, 착륙의 덜컹임.', cliche: '초기 비행기가 장거리를 한 번에 나는 건 오류 — 짧은 항속과 잦은 급유·악천후가 곧 모험의 긴장.' },
      { name: '제트 여객기(현대 항공)', aka: '여객기·국제선', era: '20세기 중반~', speed: '대륙·대양을 몇 시간 만에 건넌다. ‘아침에 떠나 밤에 지구 반대편’의 시대.', cost: '대중화되었으나 등급(이코노미·비즈니스·퍼스트)으로 여전히 계급이 갈린다.', comfort: '기밀·냉난방의 안온함, 다만 좁은 좌석·시차·건조함·장시간의 무료함.', journey: '공항의 수속·보안·탑승이 여정의 절반. 시차(제트래그)와 ‘어느새 도착’한 비현실감.', hazard: '난기류·기상 결항·연착, 드물게 비상 상황. 보안·수속의 긴장.', sense: '엔진의 일정한 굉음, 이륙 시 등을 누르는 가속, 창밖 구름 바다, 기내의 건조한 공기.', cliche: '시대극에 제트기를 넣는 시대착오 주의. 또 비행을 ‘점프’처럼 생략하면 ‘이동의 고생’이 주는 서사가 사라진다.' },
    ],
  },
  {
    key: 'plan', label: '여정 설계·물류·고생', icon: '🗺️',
    note: '탈것보다 중요한 건 ‘어떻게 짜느냐’. 거리·시간·비용·보급·길의 상태 — 여로물의 뼈대가 여기 있다.',
    items: [
      { name: '하루 이동 거리 잡기', aka: '여정의 시계', era: '전 시대', speed: '도보 12~16km / 기마 40~60km / 역마차 80~100km / 기차 수백 km — 시대마다 ‘하루 거리’가 곧 세계의 크기.', cost: '—', comfort: '무리한 일정은 다음 날의 탈진으로 돌아온다 — ‘쉬는 날’을 넣는 게 현실의 일정.', journey: '출발·휴식·숙박·도착을 ‘하루 단위’로 끊어 설계하면 여정의 리듬이 잡힌다.', hazard: '날씨·길의 끊김·동행의 컨디션이 일정을 흔든다 — 계획은 늘 어긋난다.', sense: '—', cliche: '하루에 비현실적인 거리를 주파시키면 세계의 크기가 무너진다 — 시대별 ‘하루 거리’를 기준점으로 삼을 것.' },
      { name: '여비·환전·통행세', aka: '돈의 무게', era: '전 시대', speed: '—', cost: '뱃삯·말삯·숙박비·식대·통행세·뇌물까지 — 여정은 곧 돈의 소모전. 가진 돈이 갈 수 있는 거리를 정한다.', comfort: '돈이 떨어진 여행자의 비참함 — 노숙·구걸·품팔이로 길을 잇는다.', journey: '환전(화폐가 지역마다 다름)·통행 증표·관문 통과가 여정의 관문. 돈을 어떻게 지니느냐(도난 대비)도 과제.', hazard: '도난·강도·사기(가짜 환전·바가지)·통행세 갈취. 돈이 떨어지면 발이 묶인다.', sense: '—', cliche: '주인공이 돈 걱정 없이 어디든 가는 건 비현실 — 여비의 고갈이 곧 여로물의 긴장과 인물의 선택을 만든다.' },
      { name: '길·도로·이정표', aka: '인프라가 곧 속도', era: '전 시대', speed: '잘 닦인 길(로마 가도·관도)에선 두 배 빠르고, 진창·산길·없는 길에선 절반 이하로 준다.', cost: '—', comfort: '포장·다리·이정표·역참의 유무가 여정의 고생을 좌우한다 — 길이 곧 문명의 척도.', journey: '주요 길은 안전·보급이 좋으나 붐비고, 샛길은 빠르나 위험하다 — 길 선택이 곧 전략.', hazard: '끊긴 다리·무너진 길·홍수·산사태. 인적 끊긴 샛길의 도적과 길 잃음.', sense: '—', cliche: '어디든 곧게 뻗은 좋은 길이 있는 건 시대 오류 — ‘길이 없거나 나쁘다’는 사실이 여정의 본질적 고생이다.' },
      { name: '날씨·계절·물때', aka: '하늘의 허락', era: '전 시대', speed: '눈·장마·역풍·결빙은 모든 이동을 멈춘다 — 떠날 ‘때’를 사람이 정하지 못한다.', cost: '—', comfort: '추위·더위·비·진창은 고생을 배로 늘린다. 계절이 곧 여정의 난이도.', journey: '겨울 산길·장마철 강·무풍의 바다는 피하거나 기다린다. ‘떠나기 좋은 철’을 노린다.', hazard: '폭설·홍수·폭풍·결빙·혹서. 날씨 오판이 곧 조난.', sense: '—', cliche: '날씨를 무시하고 사철 같은 속도로 이동하는 건 비현실 — 계절·날씨·물때의 허락이 출발을 좌우한다.' },
      { name: '동행·길동무·호위', aka: '함께 가는 사람들', era: '전 시대', speed: '—', cost: '호위·안내인·짐꾼을 고용하면 안전하나 비용이 든다. 일행이 많으면 느려진다.', comfort: '낯선 길동무와의 동행은 안전이자 위험 — 믿음과 의심이 교차하는 여로물의 핵심 정서.', journey: '안내인이 길·물·위험을 안다. 일행의 속도는 ‘가장 약한 자’에 맞춰진다.', hazard: '동행의 배신·이탈·분쟁, 약한 일원의 탈진이 전체를 위태롭게.', sense: '—', cliche: '혼자 모든 걸 해내는 영웅보다, 길동무·안내인과의 협력·갈등이 여정을 입체로 만든다.' },
      { name: '숙박·주막·야영', aka: '하룻밤의 안식', era: '전 시대', speed: '—', cost: '여관·주막은 돈이 들고, 야영은 공짜지만 위험. 신분·여비가 잠자리를 정한다.', comfort: '딱딱한 객실·빈대·낯선 소음 vs. 추위·이슬·들짐승의 야영. ‘따뜻한 식사와 잠자리’가 곧 작은 천국.', journey: '해 지기 전 잠잘 곳을 정하는 일이 하루의 마지막 과제. 주막은 정보·소문·만남의 장.', hazard: '도난·강도·화재, 야영의 추위·짐승·매복. 주막의 사기·시비.', sense: '—', cliche: '주막·여관은 단순한 ‘쉼터’가 아니라 정보와 만남, 위험이 교차하는 무대 — 여로물의 단골 분기점이다.' },
    ],
  },
]

const LS = 'sry:tool:transportation-ref:'
const ALL = '__all__'

type Flat = { cat: CatDef; item: Entry }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 항목 → 단서 묶음(필드 라벨 포함)
const FIELDS: { k: keyof Entry; label: string }[] = [
  { k: 'aka', label: '이칭·예시' },
  { k: 'era', label: '시대·문화' },
  { k: 'speed', label: '속도·하루 거리' },
  { k: 'cost', label: '비용·계급' },
  { k: 'comfort', label: '승차감·고생' },
  { k: 'journey', label: '여정 디테일' },
  { k: 'hazard', label: '위험' },
  { k: 'sense', label: '감각' },
  { k: 'cliche', label: '고증·유의' },
]

function plainText(f: Flat): string {
  const lines = [`🧭 ${f.item.name}  (${f.cat.label})`]
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
    `<p><i>※ 여로물·역사·모험물 창작 참고 자료. 정확한 수치 사전이 아니라 장면의 속도감·고생·위험을 잡는 서사용 단서입니다.</i></p>`,
  ].join('')
}

export default function TransportationRef({ payload }: { payload?: Record<string, unknown> }) {
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
      text: `[이동수단·여정 자료] ${plainText(f)}`,
      source: '이동수단·여정 사전 (여로물·역사·모험)',
      tags: ['이동수단', '여정', '여로물', '교통', f.cat.label, f.item.name],
    })
    flash(`스니펫 라이브러리에 ‘${f.item.name}’ 자료를 저장했습니다.`)
  }

  // 프로젝트 자료에 추가 — addToProject(...)
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '이동수단·여정 자료',
      title: `${f.item.name} (${f.cat.label})`,
      bodyHtml: bodyHtml(f),
      meta: { 분류: f.cat.label, 시대: f.item.era && f.item.era !== '—' ? f.item.era : '', 속도: f.item.speed && f.item.speed !== '—' ? '있음' : '' },
    })
    if (id) flash(`프로젝트 자료 〈이동수단·여정 자료〉에 ‘${f.item.name}’을(를) 추가했습니다.`)
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
        <Emoji e="🧭" /> <b style={{ color: 'var(--text)' }}>창작 참고 자료</b>입니다. 여로물·역사·모험물의 이동 장면 고증과 속도감·고생·위험의 감각 묘사를 위한 서사용 단서이며,
        정확한 수치 사전이 아닙니다. 디테일은 ‘이야기의 개연성’에 맞춰 각색해 쓰세요.
      </div>

      <div style={hint}>
        도보·말·마차·배·기차·자동차·비행, 그리고 여정 설계까지 <b>{total}개</b> 항목을 카테고리로 정리했습니다.
        검색·펼침으로 찾고, 무작위로 여정 영감을 얻고, 클릭해 복사하거나 수집함·스니펫·프로젝트로 보내세요.
        {genreHint && genreHint !== '여로물·역사·모험' ? <>  (전달된 맥락: <b>{genreHint}</b>)</> : null}
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름·시대·속도·비용·위험으로 검색 (예: 역참, 범선, 여비, 진창, 침대열차)"
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
        <button className="linkbtn" onClick={() => openToolLinked('historical-era-ref')}
          title="역사 시대 사전 열기 — 어느 시대·문화의 이동인지 맞춰 보면 고증이 깊어집니다"
          style={{ marginLeft: 'auto' }}>
          <Emoji e="📜" /> 역사 시대 사전
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
              title={hasProjectBridge() ? '이 자료를 프로젝트 자료 〈이동수단·여정 자료〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('historical-era-ref')} title="역사 시대 사전 열기"><Emoji e="📜" /> 역사 시대 사전</button>
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
                {!open && (item.speed && item.speed !== '—' ? item.speed : item.journey) && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.speed && item.speed !== '—' ? item.speed : item.journey}
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

      <div style={hint}>자료는 정답이 아니라 출발점입니다. 시대·문화·길의 상태에 맞춰 ‘하루 거리·여비·날씨·동행’을 비틀어 당신만의 여정을 설계하세요. 어느 시대의 이동인지는 〈역사 시대 사전〉과 함께 맞추면 고증이 깊어집니다.</div>
    </div>
  )
}
