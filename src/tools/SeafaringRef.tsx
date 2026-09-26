// 항해·해적 생활 사전 — 해양물·대항해/해적 서사의 '배 위 삶과 바다의 고증·감각'을 돕는 로컬 자작 자료집.
//  배 구조·항해 용어·선상 위계·보급·해적 관습·해상 위험을 카테고리로 정리한다.
//  자급식: react 와 './linkbus' 외 import 없음. 외부 API/미디어/네트워크 없음(전부 로컬 자작 데이터).
//  카테고리 펼침 + 검색 + 무작위 + 클릭복사 + 수집함/스니펫/프로젝트 연계 + 관련 도구 열기(이동수단 사전).
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, addToStash, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'seafaring-ref',
  name: '항해·해적 생활 사전',
  icon: '🏴‍☠️',
  group: '리서치·자료',
  genre: '해양물·대항해·해적',
  intro: '배 구조·항해 용어·선상 위계·보급·해적 관습·해상 위험을 정리한 해양물 고증 참고 자료',
  w: 700,
  h: 720,
}

// ---------- 항목 형(型) ----------
// 모든 텍스트는 '서사용 단서'다 — 정밀 항해 교본이 아니라 장면의 삶·고생·위험·감각을 잡는 고증 자료.
interface Entry {
  name: string          // 명칭
  aka?: string          // 이칭·계열·예시
  what?: string          // 무엇인가(개념·역할)
  detail?: string        // 실제 운용·디테일
  life?: string          // 선상 생활·고생·인간사
  danger?: string        // 위험·실패·죽음
  sense?: string         // 감각(소리·냄새·흔들림·풍경)
  story?: string         // 이야기 활용 포인트
  cliche?: string        // 흔한 오류·고증 유의
}
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ---------- 로컬 대량 자료집 ----------
const CATS: CatDef[] = [
  {
    key: 'ship', label: '배의 구조·부위', icon: '⛵',
    note: '배는 ‘물 위에 뜬 작은 세계’다. 어느 부위인지 알면 추격·전투·폭풍·은신 장면의 공간이 살아난다 — 위는 갑판, 아래는 선창, 끝은 이물과 고물.',
    items: [
      { name: '선수·이물(船首)', aka: '바우(bow)·뱃머리', what: '배의 앞쪽 끝. 물살을 가르며 나아가는 방향의 머리.', detail: '뱃머리 아래에는 파도를 가르는 쇄파재가 있고, 끝에는 흔히 ‘선수상(figurehead)’ 조각상을 단다. 닻을 내리는 곳도 여기 가까이.', life: '망보기는 종종 이물 쪽에서 전방을 살핀다. 거친 바다에선 이물이 파도를 정면으로 받아 가장 흠뻑 젖는 자리.', danger: '암초·다른 배와의 충돌이 가장 먼저 닿는 부위. 거센 파도에 이물이 처박히면 갑판이 물에 잠긴다.', sense: '뱃머리가 파도를 ‘쩍’ 가르며 물보라를 뒤집어쓰는 소리, 짠 물안개, 발밑으로 솟구치는 부력.', story: '“이물에 서서 수평선을 본다”는 출항·희망·결의의 단골 장면. 선수상에 얽힌 미신·사연도 좋은 소재.', cliche: '배의 ‘앞’을 그냥 앞이라 쓰기보다 이물·선수라 부르면 해양물 공기가 산다. 좌우는 좌현·우현임을 헷갈리지 말 것.' },
      { name: '선미·고물(船尾)', aka: '스턴(stern)·배꼬리', what: '배의 뒤쪽 끝. 키와 선장실이 있는 ‘배의 두뇌’가 모인 곳.', detail: '대형 범선은 고물 쪽이 높게 솟아(선미루) 선장·항해사의 선실과 창문이 자리한다. 키(타·러더)가 여기 달려 배를 돌린다.', life: '선장·고급 선원의 공간 — 일반 선원은 함부로 못 든다. 고물의 ‘큰 선실’이 곧 권력의 자리.', danger: '추격전에서 적의 포가 노리는 자리(키를 부수면 배가 못 돈다). 후방 화재·침수도 치명적.', sense: '뒤로 길게 끌리는 물자국(항적), 키가 물을 누르는 묵직한 저항, 선미루 창으로 드는 빛.', story: '선장실의 밀담·항해일지·해도·금고 — 음모와 비밀이 모이는 무대. “고물의 불빛”은 야간 추격의 단서.', cliche: '키를 단순 ‘핸들’처럼 그리지 말 것 — 옛 배는 타륜·키손잡이(틸러)로 조종했고 큰 힘이 들었다.' },
      { name: '갑판(甲板)', aka: '데크(deck)·상갑판·중갑판', what: '배의 ‘바닥이자 마당’. 여러 층으로 나뉘어 위는 노동·전투, 아래는 거주·화물.', detail: '상갑판(weather deck)은 비바람을 직접 맞는 작업·전투의 무대. 그 아래 중·하갑판에 포·침상·화물이 층층이. 포를 늘어놓은 ‘포갑판’도.', life: '맨발의 선원이 밧줄·돛·청소로 종일 분주한 곳. 갑판을 ‘솔로 문질러 닦는’ 일이 신참의 단골 벌·일과.', danger: '미끄러운 갑판에서의 추락, 흔들림에 휩쓸려 바다로 떨어지는 ‘낙수(落水)’, 전투 중 파편.', sense: '물에 젖은 나무 갑판의 삐걱임, 발바닥에 닿는 거친 판자와 타르, 소금·생선·화약 냄새가 뒤섞인 공기.', story: '갑판은 인물들이 마주치는 ‘공용 광장’ — 명령·다툼·연설·반란이 모두 여기서 벌어진다.', cliche: '배 안을 평평한 한 층처럼 그리지 말 것 — 위아래 여러 갑판의 ‘층’이 추격·은신·전투의 깊이를 만든다.' },
      { name: '돛대·마스트', aka: '메인마스트·포마스트·미즌마스트', what: '돛을 매달아 바람을 받는 기둥. 큰 배는 여러 개를 세운다.', detail: '대개 앞에서부터 포마스트·메인마스트(가장 큼)·미즌마스트. 꼭대기에는 망보는 ‘망대(crow’s nest)’가 있다. 가로돛·세로돛을 가로대(야드)에 건다.', life: '돛을 펴고 접고 묶는 ‘돛 다루기’는 높은 곳을 오르내리는 가장 위험하고 고된 노동. 망보기 당번은 외롭고 춥다.', danger: '돛대 위에서의 추락(즉사), 돛대가 폭풍·포격에 부러지면(‘마스트가 꺾였다’) 배는 사실상 무력화.', sense: '바람에 돛이 ‘퍽’ 부풀고 ‘펄럭’이는 소리, 밧줄이 도르래에서 우는 소리, 높은 곳의 어지러운 흔들림과 탁 트인 시야.', story: '“돛대 위 망대에서 외친다 — 육지다! / 돛이다!” 발견·경고의 단골 장면. 형벌로 돛대에 묶기도.', cliche: '돛을 ‘펴기만 하면 빨라진다’가 아니다 — 바람 방향에 맞춰 돛을 접고 트는(태킹) 기술이 항해의 핵심.' },
      { name: '선창·화물칸(船倉)', aka: '홀드(hold)·짐칸·빌지', what: '갑판 아래 가장 깊은 곳. 화물·식량·물·전리품을 싣는 어둡고 습한 공간.', detail: '맨 밑바닥(빌지)에는 새어든 물이 고여 ‘빌지 펌프’로 퍼낸다. 무게 균형(밸러스트)을 위해 돌·모래를 깔기도. 보물·밀수품을 숨기는 곳도 여기.', life: '쥐·바퀴벌레·곰팡이가 들끓는 가장 열악한 공간. 죄인·포로를 가두거나, 밀항자가 숨는 자리.', danger: '침수가 가장 먼저 차는 곳 — 선창에 물이 차면 배가 가라앉는다. 화물 쏠림에 의한 전복, 화재.', sense: '고인 물의 썩은 ‘빌지 냄새’, 어둠 속 쥐가 스치는 소리, 출렁이는 물소리, 짐이 삐걱이며 쏠리는 둔탁한 소음.', story: '밀항자·포로·숨긴 보물·반란 모의 — ‘배의 어두운 밑바닥’은 비밀과 음모의 무대. 침수 위기의 긴박함도.', cliche: '선창을 깨끗한 창고처럼 그리지 말 것 — 악취·쥐·습기·어둠이 옛 배 밑바닥의 진짜 모습이다.' },
      { name: '좌현·우현·키', aka: '포트(port)·스타보드(starboard)·러더', what: '배를 바라보는 기준 방향과 배를 돌리는 장치.', detail: '뱃머리를 향해 왼쪽이 좌현(포트), 오른쪽이 우현(스타보드). 키(러더)는 고물 밑에 달려 좌우로 틀어 진로를 바꾼다. 타륜·키손잡이로 조종.', life: '키잡이(조타수)는 항해사의 명령대로 침로를 유지하는 중책. 폭풍 속 키를 잡는 일은 사투에 가깝다.', danger: '키가 부서지거나 키줄이 끊기면 배는 방향을 잃고 표류 — 전투에서 적이 노리는 급소.', sense: '키손잡이를 통해 손에 전해지는 물의 저항, 침로를 잡으려는 근육의 긴장, 키가 ‘끼익’ 도는 소리.', story: '“우현으로 키를 꺾어라!”는 추격·회피의 긴박한 명령. 키를 누가 잡느냐가 배의 운명을 쥔다.', cliche: '좌우를 ‘왼쪽/오른쪽’으로만 쓰면 밋밋하다. 다만 좌현/우현은 ‘뱃머리 기준’임을 일관되게 지킬 것.' },
    ],
  },
  {
    key: 'term', label: '항해 용어·기술', icon: '🧭',
    note: '바람과 물을 다루는 기술의 언어. 정확한 한두 단어가 장면의 ‘바다 공기’를 만든다 — 단, 남발하면 독자가 길을 잃는다.',
    items: [
      { name: '돛 다루기·바람 타기', aka: '세일링·태킹·자이빙', what: '바람의 방향에 맞춰 돛 각도를 조절해 나아가는 핵심 기술.', detail: '맞바람으로는 곧장 못 가고, 돛을 비스듬히 받아 지그재그로 거슬러 오른다(태킹). 바람을 등지면 빠르나 돛을 급히 트는(자이빙) 위험이 따른다.', life: '“돛을 올려라/줄여라/접어라”는 끊임없는 노동. 모든 선원이 한 호령에 일사불란하게 밧줄을 당겨야 한다.', danger: '돌풍에 돛이 한꺼번에 바람을 먹으면 배가 기울거나 돛대가 꺾인다. 잘못된 자이빙은 가로대가 갑판을 휩쓴다.', sense: '돛이 바람을 ‘퍼억’ 머금는 순간의 가속, 밧줄을 당기는 “이영차”의 합창, 바람이 귓전을 때리는 소리.', story: '맞바람에 묶여 며칠을 못 나아가는 ‘기다림’, 순풍을 만나 미끄러지듯 나아가는 ‘해방’ — 바람은 곧 운명이자 감정선.', cliche: '돛단배가 바람과 무관하게 늘 빠른 건 큰 오류 — 무풍·역풍에 묶이는 ‘바람의 횡포’가 항해의 본질이다.' },
      { name: '닻·정박', aka: '앵커·계류·투묘', what: '배를 한 자리에 멈춰 세우는 장치와 행위.', detail: '닻을 내려(투묘) 바닥에 걸고, 닻줄·닻사슬의 길이로 흔들림을 잡는다. 출항 시엔 무거운 닻을 도르래(캡스턴)를 돌려 끌어올린다.', life: '닻을 올리는 일은 여럿이 캡스턴 막대를 밀며 노동요를 부르는 중노동. “닻을 올려라!”는 곧 출항의 신호.', danger: '닻이 바닥을 못 물면 배가 끌려가(주묘) 좌초·충돌. 닻줄이 끊기거나 닻을 못 올리면 발이 묶인다.', sense: '닻사슬이 ‘드르륵’ 풀려 나가는 굉음, 캡스턴이 돌며 도는 노동요, 닻이 바닥을 무는 묵직한 멈춤.', story: '“닻을 올려라”는 새 항해의 시작, “닻을 내려라”는 안식·잠복. 급할 때 닻줄을 잘라 버리고 도망치는 장면도.', cliche: '닻을 내리면 어디서든 즉시 멈춘다고 그리지 말 것 — 수심·바닥의 종류·닻줄 길이가 정박의 성패를 가른다.' },
      { name: '수심·암초·여울', aka: '측심·소운딩·리프', what: '얕은 곳·바위를 피하기 위해 물 밑을 읽는 일.', detail: '추를 단 줄(측심줄)을 던져 수심을 재고, 해도와 비교해 항로를 잡는다. 암초·모래톱은 보이지 않는 죽음의 함정.', life: '연안·항구 진입 때 측심수가 끊임없이 수심을 외친다 — “세 길!… 두 길!” 긴장이 치솟는 순간.', danger: '암초에 부딪히면(좌초) 선체가 찢겨 침몰. 썰물에 모래톱에 얹히면 꼼짝 못 한 채 다음 만조를 기다리거나 부서진다.', sense: '측심줄이 ‘첨벙’ 들어가는 소리, 점점 얕아지는 수심을 외치는 다급한 목소리, 선체가 바닥을 ‘긁는’ 소름끼치는 소리.', story: '“이 해역의 암초를 아는 자는 나뿐”이라는 수로 안내인의 가치, 적을 얕은 여울로 유인해 좌초시키는 계략.', cliche: '먼바다보다 ‘육지에 가까운 곳’이 더 위험함을 기억할 것 — 암초·모래톱·여울은 연안의 함정이다.' },
      { name: '별·해·나침반으로 길 찾기', aka: '천측·항법·데드레커닝', what: '망망대해에서 배의 위치와 방향을 가늠하는 기술.', detail: '낮엔 해, 밤엔 북극성·별자리로 방위를 잡고, 나침반으로 방향을, 모래시계와 속도로 이동거리를 추정(추측항법)한다. 위도는 별 높이로, 경도는 오래 풀지 못한 난제였다.', life: '항해사·도선사는 글을 알고 천문·계산을 다루는 귀한 전문가 — 배의 운명을 쥔 두뇌. 해도와 항해일지는 비밀이자 보물.', danger: '구름이 오래 끼면 위치를 잃고, 계산이 틀리면 엉뚱한 곳에 닿거나 망망대해를 헤맨다 — 길을 잃는 것이 곧 죽음.', sense: '밤하늘 가득한 별과 그것을 재는 도구, 모래시계가 떨어지는 소리, 흔들리는 갑판 위에서 별 높이를 재는 긴장.', story: '경도를 못 구해 표류하는 배, 비밀 해도를 둘러싼 쟁탈, 별을 읽는 노련한 항해사의 권위 — 좋은 갈등의 씨앗.', cliche: '옛 항해사가 현대처럼 정확히 위치를 안다고 그리지 말 것 — ‘경도를 모른다’는 불안이 대항해 서사의 긴장이다.' },
      { name: '속도·거리·시간', aka: '노트·로그·당직', what: '바다에서 빠르기와 흐른 시간을 재는 방법.', detail: '매듭(노트)을 묶은 줄을 던져 일정 시간에 풀려 나간 매듭 수로 속도를 쟀다 — 그래서 단위가 ‘노트’. 시간은 모래시계와 종(벨)으로 알리고, 당직을 교대했다.', life: '하루를 여러 ‘당직(워치)’으로 쪼개 교대 근무 — 한밤중 당직(개의 당직)은 가장 고되다. 종소리가 시간이자 생활의 리듬.', danger: '속도·시간 오판은 추측항법의 오차로 쌓여 위치를 크게 어긋나게 한다. 졸음당직은 좌초·충돌을 부른다.', sense: '모래시계가 ‘사르르’ 떨어지는 소리, 시각을 알리는 ‘땡—땡—’ 종소리, 교대 당직의 졸린 발소리.', story: '“네 시간마다 종이 울린다”는 배 위 시간의 리듬. 당직 중 졸다 벌어진 사고, 한밤 당직의 고독이 좋은 장면.', cliche: '‘노트’가 매듭에서 온 단위임을 알면 디테일이 산다. 다만 현대 단위(km/h)를 옛 배에 섞지 말 것.' },
    ],
  },
  {
    key: 'rank', label: '선상 위계·직책', icon: '⚓',
    note: '배는 엄격한 계급의 사회다. 누가 명령하고 누가 따르는가 — 그 질서와 균열에서 충성·반란·음모가 태어난다.',
    items: [
      { name: '선장(船長)', aka: '캡틴·함장', what: '배의 절대 권력자. 항로·전투·상벌을 결정하는 최종 책임자.', detail: '바다 위에서 선장의 말은 법이다. 다만 해적선은 달라서, 선장도 선원 투표로 뽑고 끌어내릴 수 있는 ‘제한된 왕’인 경우가 많았다.', life: '선장은 고물의 큰 선실에서 따로 먹고 잔다 — 권력만큼 외로운 자리. 항해일지를 쓰고 해도를 관리한다.', danger: '무능·폭정은 반란(머티니)을 부른다. 폭풍·전투에서의 오판은 배 전체를 죽음으로 몬다 — 모든 책임이 한 사람에게.', sense: '갑판을 울리는 권위의 발소리, “내 배에서는…”으로 시작하는 호령, 홀로 별을 보는 고물의 뒷모습.', story: '폭군 선장 vs 정의로운 항해사, 선출된 해적 선장의 불안한 권위, 선장의 비밀(과거·목적지)이 곧 이야기의 축.', cliche: '“선장은 무조건 절대권력”은 반쪽 — 특히 해적선은 ‘규약’과 ‘투표’로 권력을 제한했음을 살리면 신선하다.' },
      { name: '항해사·도선사', aka: '메이트·내비게이터·파일럿', what: '길을 찾고 배를 모는 두뇌. 선장 다음가는 핵심.', detail: '항해사(메이트)는 선장을 보좌해 당직·항법·선원 관리를 맡고, 도선사(파일럿)는 특정 해역·항구의 물길을 아는 전문가. 글과 계산을 다룬다.', life: '천문·해도·기상을 읽는 귀한 지식인 — 무식한 선원들 사이에서 머리로 대접받는다. 선장과 가장 가까이, 때로 가장 위험하게.', danger: '항법 실수는 배를 좌초·표류시킨다. 선장과의 불화·야심은 반란의 불씨가 되기도.', sense: '해도를 펴고 컴퍼스를 짚는 손, 별을 재는 도구, 갑판에서 “침로 유지!”를 외치는 목소리.', story: '항해사의 비밀 야심(선장 자리 노리기), 도선사를 둘러싼 쟁탈(그가 없으면 그 바다를 못 간다)이 좋은 갈등.', cliche: '항해를 ‘선장 혼자’ 다 하는 듯 그리지 말 것 — 길 찾기·당직·관리를 나눠 맡는 위계가 배를 굴린다.' },
      { name: '갑판장·고급 선원', aka: '보슨(boatswain)·쿼터마스터·포술장', what: '실무를 지휘하는 중간 관리자들.', detail: '갑판장(보슨)은 밧줄·돛·갑판 작업과 선원 노동을 직접 감독·호령. 해적선의 쿼터마스터는 전리품 분배·규율·일상을 맡아 선장을 견제하는 ‘제2의 권력’. 포술장은 대포를 책임진다.', life: '선원과 가장 가까이 부딪치며 일을 시키고 벌을 주는 자리 — 미움도 신망도 여기서. 호각·매듭채찍이 권위의 상징.', danger: '가혹한 갑판장은 반란의 표적. 전투 중 포술장의 판단이 승패를 가른다.', sense: '귀를 찢는 갑판장의 호각, “당겨라!”의 호령, 매듭채찍이 허공을 가르는 소리.', story: '쿼터마스터와 선장의 권력 균형·암투, 선원의 신망을 받는 갑판장이 반란의 구심점이 되는 전개.', cliche: '해적선의 쿼터마스터를 단순 ‘부선장’으로 뭉개지 말 것 — 분배·규율을 쥔 ‘견제 권력’이라는 점이 해적 사회의 핵심.' },
      { name: '일반 선원·신참', aka: '세일러·하급 선원·풋내기', what: '돛과 밧줄, 노동의 실제 주체인 다수.', detail: '돛 다루기·청소·펌프질·짐 나르기 등 모든 험한 일을 맡는다. 숙련 선원(에이블)과 풋내기로 나뉘고, 풋내기는 가장 험한 잡일과 텃세를 견딘다.', life: '비좁은 선수루나 하갑판에서 해먹(그물침대)에 매달려 자고, 거친 음식과 고된 노동에 시달린다. 동료애와 미신, 노동요로 버틴다.', danger: '추락·낙수·병·사고가 일상. 가장 먼저 죽고 가장 늦게 챙겨지는 자리. 매질 같은 체벌도 흔했다.', sense: '여럿이 부르는 노동요(샨티), 해먹이 흔들리는 좁은 침상, 거친 손과 짠 땀, 동료의 코골이와 한숨.', story: '신참이 바다 사나이로 거듭나는 성장담, 선원들의 동료애와 반란, 학대받는 하급 선원의 봉기 — 다수의 시선이 곧 드라마.', cliche: '선원을 배경 인파로만 쓰지 말 것 — 노동요·미신·동료애·텃세 같은 ‘아래의 삶’이 해양물에 온기를 준다.' },
      { name: '특수 선원', aka: '선의(船醫)·요리사·목수·소년 선원', what: '배가 굴러가게 하는 전문·보조 인력.', detail: '선의는 부상·괴혈병을 다루고(실력은 천차만별), 요리사는 부족한 재료로 끼니를 짓고(다친 노병이 맡기도), 목수는 선체를 수리하며, 소년 선원(캐빈 보이)은 잔심부름과 화약 나르기를 한다.', life: '선의의 ‘치료’는 종종 톱과 럼주뿐인 절단 수술. 요리사의 ‘맛없는 죽’에 모두가 불평하고, 목수는 침수 때 영웅이 된다.', danger: '서툰 선의의 수술이 사람을 잡고, 목수가 구멍을 못 막으면 배가 가라앉는다. 소년 선원은 가장 약한 약자.', sense: '럼주 냄새와 비명이 새어 나오는 선의실, 짠 죽이 끓는 솥, 목수가 널빤지를 두드려 박는 소리.', story: '돌팔이 선의의 비밀, 따뜻한 요리사의 인간미, 화약을 나르다 죽는 소년 선원의 비극 — 작지만 강한 인물들.', cliche: '선의를 현대 의사처럼 그리지 말 것 — 마취도 항생제도 없는 시대, ‘절단과 기도’가 치료의 전부에 가까웠다.' },
    ],
  },
  {
    key: 'supply', label: '보급·식량·물', icon: '🍖',
    note: '바다 위엔 가게가 없다. 무엇을 얼마나 싣느냐가 항해의 한계 — 굶주림·갈증·괴혈병의 그늘이 늘 따른다.',
    items: [
      { name: '식수·물통', aka: '담수·캐스크', what: '바다 위 가장 귀한 자원. 바닷물은 못 마신다.', detail: '나무통(캐스크)에 담은 물은 며칠이면 썩고 벌레가 인다 — 그래서 술을 섞거나, 차라리 맥주·럼을 마셨다. 보급항에서 물을 채우는 일이 항해 일정을 좌우.', life: '하루 물 배급량이 정해져 있고, 무더위·장기 항해엔 늘 부족하다. 썩은 물을 코를 막고 들이켜는 일도 다반사.', danger: '물이 떨어지면 갈증으로 며칠 만에 무너진다 — 표류 시 가장 먼저 닥치는 죽음. 물을 둘러싼 다툼·살인도.', sense: '나무통에서 나는 곰팡내 물맛, 배급 줄의 초조함, 빗물을 받으려 천을 펼치는 절박함.', story: '물을 둘러싼 배급 갈등, 표류선의 물 한 모금을 향한 사투, 보급지를 찾아 헤매는 절박함 — 생존극의 핵심.', cliche: '먼 항해를 ‘물 걱정 없이’ 그리지 말 것 — 식수의 한계가 곧 항해의 한계이자 긴장의 근원이다.' },
      { name: '비스킷·소금절이 고기', aka: '하드택·건빵·소금돼지', what: '오래 두고 먹는 항해 식량의 주식.', detail: '바위처럼 단단한 비스킷(하드택)은 두드려 깨고 물에 불려 먹으며, 자주 바구미가 슨다. 소금에 절인 고기·생선은 짜디짜 물에 담가 빼고 먹는다.', life: '“비스킷을 두드리면 벌레가 기어 나온다”는 농담 같은 현실. 단조롭고 짜고 질긴 식사를 매일 견딘다. 신선한 것은 사치.', danger: '곰팡이·구더기·상한 고기로 인한 식중독. 신선한 채소·과일의 결핍은 곧 괴혈병으로.', sense: '돌처럼 딱딱한 비스킷을 두드리는 소리, 짠 고기를 씹는 질김, 바구미를 골라내는(혹은 포기하는) 체념.', story: '식량이 바닥나는 공포, 누군가 식량을 빼돌렸다는 의심, 보급지에서 신선한 과일을 만나는 작은 천국.', cliche: '항해 식사를 풍성하게 그리지 말 것 — 단조롭고 상하기 쉬운 보존식이 옛 바다의 일상이었다.' },
      { name: '괴혈병·항해병', aka: '스커비·뱃멀미·열병', what: '장기 항해가 부르는 질병의 그림자.', detail: '신선한 채소·과일(비타민C) 결핍으로 잇몸이 썩고 이가 빠지며 기운이 빠지는 괴혈병은 장기 항해의 대량 사망 원인이었다. 뒤늦게 감귤류가 예방책임을 알게 된다.', life: '몇 주 항해면 선원이 하나둘 쓰러진다 — 처음엔 무기력, 다음엔 멍·잇몸 출혈, 끝내 죽음. 좁은 배 안의 열병·이질도 무섭다.', danger: '대항해 시대엔 전투보다 병으로 더 많이 죽었다. 전염병이 좁은 배에 돌면 떼죽음. 시신은 바다에 수장.', sense: '잇몸에서 나는 피 냄새, 무기력하게 늘어진 병자들, 갑판에 늘어선 병상, 바다로 던져지는 시신.', story: '원인 모를 괴혈병의 공포, 감귤의 비밀을 둘러싼 발견, 병이 도는 ‘떠다니는 관’ 같은 배 — 강한 긴장.', cliche: '장기 항해를 ‘건강하게’ 마치는 건 비현실 — 병으로 절반이 죽는 일도 흔했음을 잊지 말 것.' },
      { name: '럼·그로그·배급 술', aka: '럼주·그로그·술 배급', what: '바다 위 선원의 위안이자 통제 수단.', detail: '썩은 물 대신, 그리고 사기 진작을 위해 럼·맥주를 배급했다. 럼을 물에 탄 ‘그로그’가 대표적. 술 배급은 권력의 도구이자 규율의 한 축.', life: '하루 술 배급 시간은 선원의 낙. 술이 들어가면 노래·이야기·다툼이 피어난다. 술을 끊는 벌, 더 주는 상이 통제 수단.', danger: '과음으로 인한 사고·싸움·당직 태만. 술이 떨어지면 사기가 무너지고, 술독에 빠진 선원·선장도.', sense: '럼의 독한 향과 달콤함, 배급 줄의 들뜸, 술기운에 부르는 노랫소리와 이어지는 시비.', story: '술을 미끼로 한 회유·반란 선동, 술 배급을 둘러싼 다툼, 술독에 빠진 인물의 추락 — 작은 사회의 윤활유이자 화약.', cliche: '선원의 음주를 단순 ‘무절제’로만 그리지 말 것 — 썩은 물의 대안이자 통제·사기의 수단이었던 맥락을 살릴 것.' },
      { name: '보급항·물자 조달', aka: '입항·보급·약탈 보급', what: '바다 위에서 다 떨어진 것을 채우는 유일한 길.', detail: '물·식량·목재·돛천·화약을 항구나 섬에서 보충한다. 해적은 정직한 거래 대신 마을을 털거나(약탈 보급), 다른 배를 덮쳐 빼앗기도. 비밀 보급지(은신처)도 운영.', life: '오랜 항해 끝의 입항은 선원의 축제 — 술집·여자·뭍의 음식. 동시에 탈영·다툼·소문이 퍼지는 위험한 휴식.', danger: '적대 항구에서의 나포·체포, 보급 중 기습, 약탈 보급의 보복. 항구병(전염병)을 옮겨 오기도.', sense: '오랜만의 흙냄새와 사람 소리, 흔들리지 않는 땅의 낯섦(육지 멀미), 시장의 활기와 술집의 소란.', story: '비밀 보급지의 위치를 둘러싼 쟁탈, 입항 중의 탈영·배신, 약탈 보급이 부른 추격 — 항구는 쉼이자 위험의 무대.', cliche: '배가 무한정 바다를 떠도는 건 비현실 — 정기적 보급이 필요하고, 그 보급지가 곧 약점이자 이야기의 분기점이다.' },
    ],
  },
  {
    key: 'pirate', label: '해적 관습·규약', icon: '🏴‍☠️',
    note: '해적은 무법자였지만 ‘그들만의 법’이 있었다 — 규약·분배·투표·깃발·심판. 낭만과 잔혹이 함께 흐르는 사회.',
    items: [
      { name: '해적 규약', aka: '코드·articles·서약', what: '배에 오를 때 모두가 서명·맹세하는 자치 규칙.', detail: '전리품 분배 비율, 금지 행위(배 안 도박·여자 데려오기·다툼), 부상자 보상(잃은 팔다리에 얼마), 비겁·배신의 처벌 등을 명문화했다. 모두의 동의로 정한 ‘민주적 무법’.', life: '규약 낭독·서명은 입단의 의식. 규약을 어기면 선장도 벌받고, 규약이 곧 질서를 지탱한다 — 무법자들의 의외의 ‘준법’.', danger: '규약 위반의 처벌은 가혹했다 — 채찍질, 섬에 버리기(마루닝), 처형. 규약을 둘러싼 해석 다툼이 분열을 부르기도.', sense: '촛불 아래 규약을 낭독하는 엄숙함, 도검 위에 손을 얹는 서약, 거친 손이 서툰 글씨로 이름을 적는 순간.', story: '규약을 어긴 자의 재판, 부당한 규약에 맞서는 반항, 규약을 미끼로 한 입단·배신 — 해적 사회의 갈등 엔진.', cliche: '해적을 ‘질서 없는 도적떼’로만 그리지 말 것 — 분배·투표·규약을 갖춘 자치 사회였다는 점이 신선하고 사실적이다.' },
      { name: '전리품 분배', aka: '셰어·몫·쿼터마스터 분배', what: '약탈물을 정해진 비율로 나누는 해적의 핵심 질서.', detail: '쿼터마스터가 규약대로 ‘몫(셰어)’을 매겨 분배 — 선장·항해사는 더 많은 몫, 일반 선원은 한 몫. 큰 부상엔 보상 몫을 얹어 줬다. 상선의 ‘선장 독식’과 달리 비교적 평등.', life: '분배의 날은 긴장과 환호의 순간. 한 푼이라도 빼돌리면 규약 위반 — 쿼터마스터의 공정함이 신뢰의 핵심.', danger: '분배 불만은 곧 분열·반란. 보물을 빼돌린 의심, 분배를 미룬 선장에 대한 봉기.', sense: '쏟아 놓은 금화·보석을 세는 손, 몫을 받는 줄의 들뜸, 불공평을 느낀 자의 굳은 표정.', story: '분배를 둘러싼 배신, 보물을 빼돌린 자의 추적, 평등 분배가 부른 상선 선원의 ‘해적 전향’ — 욕망의 드라마.', cliche: '해적을 ‘선장이 다 갖는’ 구조로 그리지 말 것 — 비교적 평등한 분배가 오히려 해적의 매력이자 모집의 비결이었다.' },
      { name: '투표·선출·반란', aka: '머티니·선출·해임', what: '선장조차 선원이 뽑고 끌어내리는 해적의 직접 민주.', detail: '해적선은 흔히 선장을 투표로 뽑고, 무능·폭정·분배 불만이면 투표로 해임하거나 반란을 일으켰다. 전투 중엔 선장이 절대권, 평시엔 쿼터마스터가 일상을 쥐는 권력 분립.', life: '갑판 회의에서 큰일을 표결하는 ‘바다 위 민회’. 선장의 권위는 신망 위에 서며, 신망을 잃으면 곧 끝.', danger: '반란(머티니)은 피를 부른다 — 선장을 죽이거나 작은 배에 태워 버린다. 파벌 싸움이 배를 둘로 가르기도.', sense: '갑판에 둘러선 거친 얼굴들, 손을 들거나 칼을 뽑는 표결, “새 선장을 뽑자!”의 외침.', story: '폭군 선장에 맞선 반란, 투표로 선장이 된 신참의 불안, 파벌로 갈린 배의 내전 — 권력의 향방이 곧 플롯.', cliche: '해적 선장을 ‘무조건 절대권력’으로 그리면 반쪽 — 투표·해임·반란이라는 견제 장치가 해적 사회의 진짜 긴장이다.' },
      { name: '해적기·항복 신호', aka: '졸리 로저·블랙플래그·붉은 깃발', what: '공포와 협상을 담은 깃발의 언어.', detail: '검은 깃발(졸리 로저, 흔히 해골·뼈)을 올리면 “항복하면 살려 준다”, 붉은 깃발을 올리면 “자비 없다, 다 죽인다”는 뜻으로 통했다. 평소엔 가짜 깃발로 위장해 접근하다 정체를 드러낸다.', life: '깃발을 올리는 순간은 위협의 절정 — 상선은 깃발만 보고 싸우지 않고 항복하기도. 공포가 곧 무기.', danger: '붉은 깃발을 본 상대의 결사항전, 위장 깃발이 들통난 순간의 전투. 잔혹한 명성은 양날의 칼.', sense: '돛대 위로 스르르 오르는 검은 깃발, 그것을 본 갑판의 술렁임과 공포, 펄럭이는 해골 문장.', story: '깃발의 문장에 얽힌 선장의 정체성, 위장 접근의 긴박함, ‘피 흘리지 않고 이기는’ 공포 전술 — 시각적 명장면.', cliche: '해골 깃발이 모든 해적의 똑같은 표준은 아니었다 — 선장마다 고유한 문장을 썼고, ‘검은 vs 붉은’의 의미 차이를 살리면 깊어진다.' },
      { name: '처벌·마루닝·판자 걷기', aka: '섬에 버리기·채찍질·키홀링', what: '규약 위반·배신을 다스리는 해적의 형벌.', detail: '무인도에 물 한 통과 총 한 자루만 주고 버리는 ‘마루닝’이 대표적 중형. 채찍질, 용골 밑으로 끌어 통과시키는 잔혹한 ‘키홀링’도. ‘판자 걷기’는 후대 창작으로 과장된 면이 크다.', life: '형벌은 공개로 행해 본보기를 삼는다 — 모두가 보는 앞에서 죄와 벌을 확인하는 의식. 두려움이 곧 규율.', danger: '마루닝은 사실상 느린 사형 — 구조 없이는 갈증·굶주림으로 죽는다. 키홀링은 종종 치명적.', sense: '무인도에 홀로 남겨지는 절망, 멀어지는 배의 돛, 채찍이 살을 가르는 소리, 공개 처형을 지켜보는 침묵.', story: '버려진 자의 생존·복수극, 부당한 처벌이 부른 동정과 반란, 마루닝의 공포를 무기로 한 협박 — 강한 갈등.', cliche: '‘판자 걷기’를 모든 해적의 표준 처형처럼 쓰지 말 것 — 실제로는 드물고, 마루닝·채찍질이 더 현실적이다.' },
    ],
  },
  {
    key: 'hazard', label: '해상 위험·재난', icon: '🌊',
    note: '바다는 가장 무서운 적이자 무대다. 폭풍·무풍·암초·전투·표류 — 사람의 의지를 비웃는 자연 앞에서 이야기가 깊어진다.',
    items: [
      { name: '폭풍·태풍', aka: '스톰·게일·허리케인', what: '배를 한순간에 삼키는 바다의 가장 큰 분노.', detail: '돛을 급히 줄이고(축범) 화물을 묶고 갑판의 모든 것을 고정한 채 견딘다. 심하면 돛을 다 내리고 ‘바람에 맡겨’ 표류하거나, 닻을 끌어 뱃머리를 파도로 향하게 한다.', life: '며칠간 잠도 못 자고 펌프질·키잡이에 매달리는 사투. 갑판에 휩쓸려 바다로 사라지는 동료, 멀미와 공포의 지옥.', danger: '전복·침몰·돛대 부러짐·낙수. 거대한 파도(삼각파도)에 배가 쪼개지기도. 폭풍 후 표류·고장으로 이어진다.', sense: '귀를 찢는 바람과 천둥, 산더미 같은 파도가 갑판을 덮치는 굉음, 삐걱이다 부러지는 돛대, 몸을 가누지 못하는 요동.', story: '폭풍을 함께 이겨내며 묶이는 동료애, 폭풍 속 선장의 결단, 폭풍 뒤 표류의 시작 — 항해 서사의 클라이맥스 단골.', cliche: '폭풍을 ‘잠깐의 위기’로 가볍게 쓰지 말 것 — 며칠의 사투, 사람을 잃는 대가, 그 뒤의 후유증까지 그려야 무게가 산다.' },
      { name: '무풍·표류', aka: '데드 칸·도드럼스·캄', what: '바람이 죽어 배가 멈춰 버린 ‘조용한 지옥’.', detail: '적도 부근 무풍대(도드럼스)에선 며칠~몇 주를 바람 없이 멈춘다. 돛은 축 늘어지고 배는 햇볕에 익는다 — 폭풍보다 더 무서운 정적.', life: '물과 식량이 줄어드는 가운데 할 수 있는 게 없는 절망. 더위와 권태에 미쳐 가는 선원, 다툼과 광기.', danger: '식수·식량의 고갈, 괴혈병·열사병, 절망에 의한 자해·살인·반란. 구조 없이 표류하면 곧 죽음.', sense: '거울 같은 잔잔한 바다, 축 처진 돛, 작열하는 햇볕, 아무 소리도 없는 무서운 정적과 미쳐 가는 신음.', story: '무풍 속 인간성의 붕괴(굶주림·광기·식인의 공포), 한 줄기 바람을 기다리는 절망, 표류선의 생존 드라마 — 심리극의 무대.', cliche: '바다의 위험을 폭풍으로만 그리지 말 것 — ‘바람이 없는’ 정적의 공포가 때로 더 무섭고 깊은 이야기를 만든다.' },
      { name: '해전·접현·등선', aka: '보딩·포격전·백병전', what: '배와 배가 맞붙어 싸우는 바다의 전투.', detail: '멀리선 대포로 돛·키·선체를 노리고(포격전), 가까워지면 갈고리로 끌어당겨 배에 뛰어올라(접현·등선) 칼·도끼·권총으로 백병전. 해적은 배를 가라앉히기보다 빼앗는 것이 목적이라 등선을 노린다.', life: '포연 자욱한 갑판, 파편과 비명, 흔들리는 발판 위의 사투. 포술장의 호령, 등선조의 함성, 항복의 백기.', danger: '포격에 의한 폭발·화재·파편, 등선 백병전의 난전, 화약고 유폭으로 인한 폭침. 배가 불타거나 가라앉으면 모두 바다로.', sense: '대포의 굉음과 진동, 매캐한 화약 연기, 갈고리가 박히는 ‘턱’, 칼이 부딪는 소리와 비명, 발밑의 흔들림.', story: '불리한 포격전을 등선으로 뒤집는 역전, 배를 멀쩡히 빼앗으려는 해적의 절제된 전술, 항복을 둘러싼 협상 — 박진감의 절정.', cliche: '해전을 ‘배를 가라앉히는 싸움’으로만 그리지 말 것 — 특히 해적은 ‘빼앗기 위해’ 싸웠고, 그래서 등선·항복 협상이 핵심이다.' },
      { name: '좌초·침몰·난파', aka: '리프 좌초·싱킹·시프렉', what: '배가 부서지거나 가라앉아 모든 것을 잃는 끝.', detail: '암초·모래톱에 얹히거나(좌초), 침수·전투·폭풍으로 가라앉는다(침몰). 살아남은 자는 부서진 배 조각·작은 보트로 표류하거나 무인도에 닿는다(난파).', life: '“배를 버려라!”의 외침, 한정된 구명보트를 둘러싼 아비규환, 가라앉는 배에서의 마지막 선택 — 누구를 살리고 무엇을 챙기나.', danger: '익사·저체온·상어. 표류·무인도의 굶주림과 갈증. 구조 없이는 느린 죽음. 보물을 안고 가라앉는 욕망의 최후.', sense: '선체가 갈리고 쪼개지는 비명 같은 소리, 차오르는 물, 가라앉는 배가 만드는 소용돌이, 표류물에 매달린 손.', story: '난파 후의 무인도 생존극, 침몰선의 보물을 둘러싼 후일담, 단 하나의 생존자가 전하는 비극 — 이야기의 시작점이자 끝점.', cliche: '난파를 ‘즉사’로 끝내지 말 것 — 배를 버리는 결단, 표류의 사투, 무인도의 생존이 풍부한 후속 이야기를 연다.' },
      { name: '바다의 미신·괴담', aka: '징조·조나·바다 괴물', what: '설명할 수 없는 바다 앞에서 선원이 의지한 믿음과 공포.', detail: '여자·시체·바나나를 배에 들이면 불운, 출항에 좋은·나쁜 요일, 불운을 부른다는 ‘조나(요나)’ 같은 사람, 알바트로스를 죽이면 저주, 세이렌·크라켄·유령선 같은 괴담까지 — 무지와 두려움이 빚은 풍부한 상상.', life: '미신은 선원의 행동을 실제로 좌우했다 — 징조에 출항을 미루고, 불운자를 배에서 내쫓고, 의식으로 바다를 달랜다. 두려움을 다스리는 ‘마음의 닻’.', danger: '미신에 휘둘린 잘못된 결정(좋은 바람을 놓치거나, 무고한 자를 ‘조나’로 몰아 희생). 공포가 부른 집단 광기.', sense: '폭풍 전의 불길한 적조, 돛대에 앉은 새, 안개 속 유령선의 그림자, 죽음을 앞둔 선원의 헛것.', story: '‘조나’로 몰린 무고한 자의 비극, 미신을 이용하는 교활한 인물, 진짜인지 환각인지 모를 바다 괴담 — 환상·심리의 문을 연다.', cliche: '바다 미신을 ‘무지한 미신’으로 비웃지만 말 것 — 그것은 두려움을 다스리는 문화이자, 환상 서사로 통하는 풍부한 광맥이다.' },
    ],
  },
]

const LS = 'sry:tool:seafaring-ref:'
const ALL = '__all__'

type Flat = { cat: CatDef; item: Entry }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 항목 → 단서 묶음(필드 라벨 포함)
const FIELDS: { k: keyof Entry; label: string }[] = [
  { k: 'aka', label: '이칭·계열' },
  { k: 'what', label: '무엇인가' },
  { k: 'detail', label: '운용·디테일' },
  { k: 'life', label: '선상 생활' },
  { k: 'danger', label: '위험·재난' },
  { k: 'sense', label: '감각' },
  { k: 'story', label: '이야기 활용' },
  { k: 'cliche', label: '고증·유의' },
]

function plainText(f: Flat): string {
  const lines = [`🏴‍☠️ ${f.item.name}  (${f.cat.label})`]
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
    `<p><i>※ 해양물·대항해·해적물 창작 참고 자료. 정밀 항해 교본이 아니라 배 위 삶과 바다의 고증·감각을 잡는 서사용 단서입니다.</i></p>`,
  ].join('')
}

export default function SeafaringRef({ payload }: { payload?: Record<string, unknown> }) {
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
      text: `[항해·해적 자료] ${plainText(f)}`,
      source: '항해·해적 생활 사전 (해양물·대항해·해적)',
      tags: ['항해', '해적', '해양물', '대항해', f.cat.label, f.item.name],
    })
    flash(`스니펫 라이브러리에 ‘${f.item.name}’ 자료를 저장했습니다.`)
  }

  // 프로젝트 자료에 추가 — addToProject(...)
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '항해·해적 자료',
      title: `${f.item.name} (${f.cat.label})`,
      bodyHtml: bodyHtml(f),
      meta: { 분류: f.cat.label, 위험: f.item.danger && f.item.danger !== '—' ? '있음' : '', 감각: f.item.sense && f.item.sense !== '—' ? '있음' : '' },
    })
    if (id) flash(`프로젝트 자료 〈항해·해적 자료〉에 ‘${f.item.name}’을(를) 추가했습니다.`)
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
        <Emoji e="🏴‍☠️"/> <b style={{ color: 'var(--text)' }}>창작 참고 자료</b>입니다. 해양물·대항해·해적물의 배 위 장면 고증과 삶·고생·위험의 감각 묘사를 위한 서사용 단서이며,
        정밀 항해 교본이 아닙니다. 디테일은 ‘이야기의 개연성’에 맞춰 각색해 쓰세요.
      </div>

      <div style={hint}>
        배 구조·항해 용어·선상 위계·보급·해적 관습·해상 위험까지 <b>{total}개</b> 항목을 카테고리로 정리했습니다.
        검색·펼침으로 찾고, 무작위로 항해 영감을 얻고, 클릭해 복사하거나 수집함·스니펫·프로젝트로 보내세요.
        {genreHint && genreHint !== '해양물·대항해·해적' ? <>  (전달된 맥락: <b>{genreHint}</b>)</> : null}
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름·부위·용어·직책·위험으로 검색 (예: 갑판, 태킹, 쿼터마스터, 괴혈병, 졸리 로저, 마루닝)"
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
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 무작위 자료</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('transportation-ref')}
          title="이동수단·여정 사전 열기 — 배 외의 탈것·여정 설계와 함께 보면 이동 고증이 깊어집니다"
          style={{ marginLeft: 'auto' }}>
          <Emoji e="🧭"/> 이동수단·여정 사전
        </button>
        <span style={hint}>{filtered.length}개 표시</span>
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
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => toStash(random)} disabled={!hasStash()}
              title={hasStash() ? '이 자료를 플로팅 수집함에 담기' : '수집함에 연결되어 있지 않습니다'}>
              <Emoji e="📎"/> 수집함
            </button>
            <button className="linkbtn" onClick={() => toProject(random)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 자료를 프로젝트 자료 〈항해·해적 자료〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('transportation-ref')} title="이동수단·여정 사전 열기"><Emoji e="🧭"/> 이동수단·여정 사전</button>
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
            const preview = (item.what && item.what !== '—') ? item.what : item.detail
            return (
              <div key={fk} style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon}/> {c.label}</span>
                  <button onClick={() => toggleExpand(fk)} title={open ? '접기' : '펼치기'}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', fontSize: 15, fontWeight: 700, textAlign: 'left' }}>
                    {open ? '▾' : '▸'} {item.name}
                  </button>
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(c.key, item.name)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                {!open && preview && preview !== '—' && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {preview}
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

      <div style={hint}>자료는 정답이 아니라 출발점입니다. 시대·해역·배의 종류에 맞춰 ‘보급·날씨·위계·관습’을 비틀어 당신만의 항해를 설계하세요. 배 외의 탈것·여정 설계는 〈이동수단·여정 사전〉과 함께 보면 이동 고증이 깊어집니다.</div>
    </div>
  )
}
