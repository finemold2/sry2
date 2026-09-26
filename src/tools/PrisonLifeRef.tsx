// 수감 생활 사전 — 교도소물·옥중 서사 고증을 위한 로컬 자작 자료집.
//  시대·유형별 감옥의 구조·일과·위계·은어·생존 규칙·면회/탈옥 관습을 ‘서사용 설정’으로 정리한다(실제 매뉴얼이 아니라 창작 참고).
//  자급식: react 와 './linkbus' 외 import 없음. 외부 API 없음(전부 로컬 자작 데이터).
//  카테고리 펼침 + 검색 + 무작위 + 클릭복사 + 스니펫 저장 + 프로젝트 연계(root:research) + 관련 도구 열기.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'prison-life-ref',
  name: '수감 생활 사전',
  icon: '🔒',
  group: '리서치·자료',
  intro: '시대·유형별 감옥 구조·일과·위계·은어·생존 규칙·면회/탈옥 관습을 정리 — 교도소물·옥중 서사 고증용 창작 참고',
  w: 680,
  h: 700,
}

// ---------- 항목 형(型) ----------
// 모든 텍스트는 ‘서사 설정’ 수준의 창작 묘사용 단서다. 특정 실존 시설·사건의 복제가 아니라 일반적 구조·관행을 각색했다.
interface Entry {
  name: string          // 명칭(구역·일과·계층·은어·규칙·관습 등)
  era?: string          // 시대·유형 배경(서사 배경 잡기용)
  what?: string         // 무엇인가(핵심 정의)
  detail?: string       // 구체 묘사·운영 방식(장면 디테일용)
  who?: string          // 관여하는 사람·역할(등장인물 설정용)
  drama?: string        // 이야기 활용·드라마 포인트(갈등·반전 씨앗)
  caution?: string      // 고증·작가 유의(흔한 오류·클리셰·시대 착오 주의)
}
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ---------- 로컬 대량 자작 자료집 ----------
const CATS: CatDef[] = [
  {
    key: 'structure', label: '감옥 구조·공간', icon: '🏚️',
    note: '“어디에 갇히는가.” 공간은 단순한 배경이 아니라 권력·통제·도주 가능성을 결정하는 무대 그 자체다.',
    items: [
      { name: '뇌옥·전옥(典獄)', era: '전근대 동아시아', what: '재판·처형을 기다리는 자를 잠시 가두던 관청 부속 옥. 형 집행지가 아니라 ‘대기·신문의 공간’이었다.', detail: '나무 창살과 흙바닥, 차꼬·칼을 채운 좁은 칸. 위생이 나빠 옥중 병사·아사가 흔했고, 가족의 ‘옥바라지’가 곧 생존선이었다.', who: '옥리·옥졸(간수), 옥바라지하는 가족, 신문을 기다리는 미결수.', drama: '“형이 정해지지 않은 채 썩어가는” 미결의 공포 — 갇힌 채 결백을 증명하려는 자의 밀폐극.', caution: '전근대 옥에 ‘징역 N년’ 개념을 넣지 말 것. 옥은 처벌지가 아니라 재판·신문 대기소였다.' },
      { name: '독방(징벌방·독거)', era: '근대 이후', what: '한 사람을 홀로 가두는 방. 규율 위반자의 징벌, 또는 자·타해 위험자의 격리에 쓰인다.', detail: '창문이 작거나 없고 빛·소리·시간 감각이 차단된다. 장기 독거는 정신을 갉아먹는 ‘조용한 고문’으로 그려진다.', who: '독거 수형자, 점호·배식을 맡는 교도관, 면담하는 교화·의료 인력.', drama: '“고립이 사람을 어떻게 무너뜨리는가” 혹은 “고독 속에서 단단해지는 의지” — 내면 독백의 무대.', caution: '독방을 ‘만능 협박 카드’로 남발하지 말 것. 규율·기간·심사 절차가 있는 제도임을 보여줘야 사실감이 산다.' },
      { name: '잡거방(집단 거실)', era: '근현대', what: '여러 명이 함께 지내는 큰 방. 대다수 수형 생활이 이뤄지는 공간이자 위계·뒷거래·우정이 얽히는 작은 사회.', detail: '바닥 자리(상석/말석)에 위계가 새겨지고, 화장실·창가·콘센트 같은 ‘좋은 자리’가 권력의 척도가 된다.', who: '방장(거실 대표)·고참·신입, 순찰하는 교도관.', drama: '“좁은 방 안의 권력 다툼” — 신입이 자리와 인정을 얻어가는 과정 자체가 한 편의 서사.', caution: '잡거방을 무법천지로만 그리면 납작하다. 암묵적 규칙·질서가 ‘또 다른 법’으로 작동함을 보여줄 것.' },
      { name: '사동·동(棟)·블록', era: '근현대', what: '거실을 묶은 큰 단위 건물. 보안 등급·죄종·처우에 따라 사동을 나누어 통제한다.', detail: '중죄·관심대상은 고(高)보안 사동에, 모범수는 완화된 사동에 둔다. 사동 간 이동 자체가 처우의 상징이 된다.', who: '사동 담당 교도관, 사동별 수형자 집단.', drama: '“어느 사동으로 옮겨지느냐”가 곧 운명 — 강등·승급이 보상과 처벌의 핵심 장치.', caution: '단순한 ‘감옥 한 채’가 아니라 등급·구획이 있는 구조임을 반영하면 디테일이 살아난다.' },
      { name: '운동장·작업장·강당', era: '근현대', what: '거실 밖 공용 공간. 짧은 운동, 노역, 종교·교육 행사가 이뤄지는 ‘바깥 같은 안’.', detail: '운동 시간은 정보·물건·메시지가 오가는 통로다. 작업장의 도구·동선은 종종 음모·탈주의 무대가 된다.', who: '운동·작업을 감독하는 교도관, 작업반 수형자, 교화 강사.', drama: '“통제된 자유의 시간”에 벌어지는 거래·접선·충돌 — 짧은 틈이 사건의 분기점.', caution: '운동·작업 시간을 무한정 자유로운 듯 그리지 말 것. 인원 점검·동선 통제가 늘 따라붙는다.' },
      { name: '하옥·지하 감방(던전)', era: '중세~근세 서양', what: '성·요새 지하에 둔 깊고 어두운 감방. 정치범·중죄인을 세상과 단절시키는 ‘잊힌 공간’.', detail: '습기·어둠·쇠사슬이 기본. 빛도 시간도 없이 갇혀 ‘살아 있으나 죽은’ 상태로 묘사되곤 한다.', who: '간수장·문지기 간수, 잊힌 죄수, 가끔 내려오는 심문관.', drama: '“세상에서 지워진 자” — 오래된 죄수, 비밀을 아는 늙은 수인의 등장은 강력한 미스터리 장치.', caution: '낭만적 ‘고성 던전’이 과장되기 쉽다. 실제론 처형·이감이 더 흔했고 장기 유폐는 특수했음을 염두에 둘 것.' },
      { name: '하옥선·유형지·노역 수용소', era: '근세~근대', what: '배·외딴 섬·변경에 죄인을 모아 강제노역시키던 격리형 수용. 탈출이 사실상 불가능한 ‘열린 감옥’.', detail: '높은 담 대신 ‘거리·바다·황야’ 자체가 벽이 된다. 가혹한 노동·풍토병·감독관의 횡포가 일상.', who: '유형수·도형수, 무장 감독관, 현지 향리·정착민.', drama: '“돌아갈 수 없는 끝의 땅” — 절망 속 공동체, 반란, 불가능한 귀환의 서사.', caution: '유형지를 ‘담장 없는 자유 공간’으로 오해하지 말 것. 거리·자연·감시가 더 잔혹한 감옥이 된다.' },
      { name: '미결수용실(구치소)', era: '근현대', what: '재판이 끝나지 않은 미결수를 수용하는 시설. 무죄추정 원칙상 (이론상) 처우가 더 보장된다.', detail: '변호인 접견·서신·면회 규정이 기결수와 다르다. 재판 출정과 복귀가 일상의 리듬을 만든다.', who: '미결수, 접견하는 변호인, 호송·계호 인력.', drama: '“아직 유죄가 아닌데 갇혀 있다” — 무죄추정과 구금 현실의 모순이 빚는 분노와 초조.', caution: '미결과 기결을 뭉뚱그리지 말 것. 처우·권리·공간이 다른 별개의 신분이다.' },
    ],
  },
  {
    key: 'routine', label: '일과·생활', icon: '⏰',
    note: '“하루가 어떻게 흘러가는가.” 반복되는 시간표는 통제의 핵심이자, 그 틈을 비집는 사건의 무대다.',
    items: [
      { name: '기상·점호(인원 점검)', era: '근현대', what: '정해진 시각에 일어나 인원을 세는 절차. 하루를 여닫는 통제의 의식이자 ‘한 명이라도 비면 비상’인 시점.', detail: '아침·저녁(또는 수시) 점호로 이상 유무를 확인한다. 점호 불응·인원 불일치는 즉시 비상·수색으로 이어진다.', who: '점호하는 교도관, 줄 맞춰 서는 수형자, 거실 대표.', drama: '“점호 때 빈 자리” — 탈주·자해·은폐가 드러나는 결정적 순간. 시간을 다투는 긴장의 트리거.', caution: '점호를 형식적으로 흘리지 말 것. 탈옥 서사에서 ‘다음 점호까지의 시간’이 곧 카운트다운이 된다.' },
      { name: '배식·식사(콩밥·관식)', era: '전 시대~현대', what: '정해진 양의 식사를 받는 일. 빈약한 급식은 생존과 거래의 중심이며, 음식은 곧 권력·정·복종의 매개다.', detail: '좋은 반찬·여분의 식사가 위계의 보상으로 오간다. 전근대엔 가족의 사식(私食)·옥바라지가 생사를 갈랐다.', who: '배식 담당(수형자/직원), 사식 넣는 가족, 음식으로 줄을 세우는 고참.', drama: '“밥 한 그릇으로 사람을 사고 굴복시키는” 폐쇄 사회의 경제 — 작은 음식이 큰 거래가 된다.', caution: '“감옥=콩밥” 같은 한 줄 클리셰에 머물지 말 것. 음식의 ‘분배 권력’을 그리면 훨씬 입체적이다.' },
      { name: '노역·작업(징역)', era: '근대 이후', what: '노동으로 죗값을 치르며 시간을 보내는 일과의 중심. 근대 형벌의 ‘교화·규율’ 이념과 맞물린다.', detail: '봉제·인쇄·세탁·취사 등 작업이 배정되고, 성실도가 가석방·처우에 반영된다. 작업장은 정보·물건의 교환소이기도.', who: '작업 지도 교도관, 작업반장(고참 수형자), 신입 작업원.', drama: '“노동 속에서 인간성을 지키거나 잃는” 이야기 — 작업장의 사고·태업·연대가 사건의 씨앗.', caution: '전근대 도형(徒刑)과 근대 징역은 이념이 다르다(응보 vs 교화). 시대를 섞지 말 것.' },
      { name: '운동·여가 시간', era: '근현대', what: '하루 중 짧게 허락된 신체 활동·휴식. ‘통제된 자유’로서 정신 건강과 질서 유지에 쓰인다.', detail: '운동장 산책, 간단한 구기, 독서·집필 시간 등. 짧은 자유 시간에 거래·접선·충돌이 집중된다.', who: '계호 교도관, 운동하는 수형자 집단.', drama: '“하루 한 시간의 햇빛” — 작은 자유가 절실해지는 폐쇄 세계의 감정 묘사에 효과적.', caution: '여가를 무한정으로 그리지 말 것. 시간·구역·인원이 엄격히 제한된 ‘틈’임을 잊지 말 것.' },
      { name: '소등·취침·야간', era: '근현대', what: '불을 끄고 잠드는 시간. 감시가 느슨해지는 ‘어둠의 시간’이라 사고·폭력·밀담이 일어나기 쉽다.', detail: '소등 후엔 작은 소리·움직임도 통제된다. 순찰·야간 점검이 돌고, 동시에 어둠은 은밀한 거래의 장막이 된다.', who: '야간 근무 교도관, 잠 못 드는 수형자, 어둠 속 가해자/피해자.', drama: '“불 꺼진 방 안의 사건” — 목격자 없는 어둠은 미스터리·서스펜스의 단골 무대.', caution: '소등 후를 ‘완전 무방비’로 그리지 말 것. 야간 순찰·점검이라는 통제가 여전히 작동한다.' },
      { name: '검방·소지품 검사(수색)', era: '근현대', what: '거실·신체·소지품을 뒤져 금지물품을 찾는 절차. 통제의 칼날이자 ‘숨긴 것이 드러나는’ 위기.', detail: '불시 검방, 신체 수색, 거실 정리 점검이 수시로 행해진다. 밀반입품·무기·연락 도구가 적발되면 징벌로 이어진다.', who: '수색하는 교도관, 물건을 숨기는 수형자, 은닉처를 아는 고참.', drama: '“하필 그 검방에 걸리는” 아슬아슬함 — 숨긴 칼·편지·약물이 발각되는 순간의 서스펜스.', caution: '검방을 ‘아무 때나 마구잡이’로 그리지 말 것. 절차·기록이 있는 통제 수단임을 반영하면 사실감이 산다.' },
      { name: '위생·목욕·질병', era: '전 시대~현대', what: '씻고 건강을 유지하는 문제. 열악한 위생은 전염병·죽음으로 직결되며, 의무실은 또 하나의 권력 공간이다.', detail: '제한된 목욕·세탁, 부족한 의료. 전근대엔 옥병(獄病)·전염이 대량 사망을 불렀고, 의무실 출입은 ‘틈’이 된다.', who: '의무 인력·의무실 수형 도우미, 병든 수형자, 위생을 통제하는 직원.', drama: '“병을 핑계로 의무실에 가는” 계략 — 의료 동선이 접선·탈주·은폐의 길이 된다.', caution: '시대의 의료 수준을 정확히 둘 것. 전근대 옥에 현대 의무실·약물을 끌어오면 고증이 무너진다.' },
      { name: '교화·교육·종교 활동', era: '근대 이후', what: '갱생을 표방한 교육·상담·종교 프로그램. 근대 교도소의 ‘교정’ 이념을 드러내는 일과.', detail: '검정고시·직업훈련·종교집회·상담이 운영되고, 참여 실적이 처우·가석방에 반영된다.', who: '교화·교육 인력, 종교인, 자원봉사자, 참여 수형자.', drama: '“교화라는 이름의 또 다른 통제” 혹은 “진짜 변화의 계기” — 갱생의 진정성을 묻는 무대.', caution: '교화 프로그램은 근대 이후의 산물이다. 전근대 옥에 ‘갱생 교육’을 넣는 건 시대 착오.' },
    ],
  },
  {
    key: 'hierarchy', label: '위계·서열·세력', icon: '👑',
    note: '“누가 위에 있는가.” 공식 규칙 아래엔 늘 또 하나의 질서가 흐른다 — 그 보이지 않는 법이 옥중 서사의 엔진이다.',
    items: [
      { name: '방장·거실 대표', era: '근현대', what: '한 거실을 실질적으로 다스리는 고참 수형자. 공식 직책은 아니지만 자리·식사·질서를 좌우한다.', detail: '신입의 자리와 처신을 정하고, 분쟁을 ‘방 안 규칙’으로 중재한다. 직원과 수형자 사이의 비공식 창구 역할도.', who: '방장, 그를 따르는 고참, 눈치 보는 신입.', drama: '“작은 왕국의 군주” — 방장과의 충돌·결탁·승계가 거실 서사의 핵심 축이 된다.', caution: '방장을 단순 폭군으로만 그리지 말 것. 질서·보호를 제공하는 ‘필요악’의 양면을 보여주면 입체적이다.' },
      { name: '고참·신입(짬·기수)', era: '근현대', what: '수감 기간·관록에 따른 비공식 서열. ‘들어온 순서’가 곧 권위가 되는 폐쇄 사회의 기본 문법.', detail: '신입은 허드렛일·궂은 자리를 맡고 처신을 배운다. 시간이 쌓이며 권한과 발언권이 자연히 올라간다.', who: '오래된 고참, 갓 들어온 신입, 서열을 매기는 집단.', drama: '“신입의 적응기” — 굴욕을 견디며 자리를 얻거나, 질서를 거스르며 충돌하는 성장·생존담.', caution: '서열을 군대식으로만 옮기지 말 것. 시설·문화마다 ‘짬’의 작동 방식이 다름을 살릴 것.' },
      { name: '교도관·간수(공식 권력)', era: '전 시대~현대', what: '시설을 운영·통제하는 직원. 규칙의 집행자이자, 부패·재량으로 또 다른 권력이 되기도 한다.', detail: '점호·계호·검방·처우 결정을 쥔다. 엄격한 원칙주의자부터 뇌물에 흔들리는 자까지 인물 폭이 넓다.', who: '소장·계장·담당 교도관·옥졸, 그들과 거래하는 수형자.', drama: '“법을 집행하는 자의 타락 혹은 양심” — 간수와 수인의 관계는 통제·연민·공모가 뒤엉킨다.', caution: '교도관을 ‘일률적 악역’으로 소비하지 말 것. 통제자이자 인간인 양면을 그려야 갈등이 깊어진다.' },
      { name: '옥리·옥졸·옥바라지', era: '전근대 동아시아', what: '옥을 지키는 하급 관리·심부름꾼과, 갇힌 자를 밖에서 돕는 가족·조력자. 전근대 옥의 생존 생태계.', detail: '옥졸은 박봉이라 뇌물·편의 제공이 만연했고, 옥바라지(밥·옷·돈)가 부족하면 옥중에서 죽기도 했다.', who: '옥리·옥졸, 옥바라지하는 가족·하인, 뇌물을 주고받는 양쪽.', drama: '“돈과 정으로 옥문 안팎이 이어지는” 세계 — 가족의 헌신과 옥졸의 부패가 생사를 가른다.', caution: '전근대 옥을 ‘국가가 먹여주는 곳’으로 그리지 말 것. 자비(自費)·외부 조력이 생존의 전제였다.' },
      { name: '패거리·파벌(세력)', era: '근현대', what: '출신·지역·죄종·이해로 뭉친 수형자 집단. 보호와 위협을 동시에 제공하는 ‘작은 진영’.', detail: '세력에 들면 보호받지만 충성·상납을 요구받는다. 세력 간 균형이 깨지면 거실·사동이 들끓는다.', who: '세력 두목, 행동대, 중립을 지키려는 독립 수형자.', drama: '“어느 편에 설 것인가” — 가입·배신·세력 다툼이 옥중 정치극의 골격이 된다.', caution: '세력을 단색의 ‘갱단’으로만 그리지 말 것. 보호·소속·생존이라는 동기를 함께 보여줄 것.' },
      { name: '약자·표적(따돌림·갈취)', era: '전 시대~현대', what: '서열 바닥에서 갈취·폭력·심부름에 시달리는 처지. 폐쇄 사회의 잔혹함이 가장 노골적으로 드러나는 지점.', detail: '돈·물건·노동을 빼앗기고 궂은일을 떠맡는다. 누구를 표적 삼느냐가 집단의 결속·공포를 유지하는 수단이 되기도.', who: '표적이 된 약자, 가해하는 집단, 못 본 척하는 다수.', drama: '“바닥에서 살아남기” — 굴종·반격·연대·복수, 어느 길을 택하느냐가 인물의 핵심 선택.', caution: '약자의 고통을 자극적 구경거리로 소비하지 말 것. 생존·존엄을 둘러싼 진지한 시선이 필요하다.' },
      { name: '비공식 화폐·거래(담배·라면)', era: '근현대', what: '현금이 금지된 안에서 통용되는 대체 화폐와 암거래. 음식·기호품·편의가 ‘돈’의 역할을 한다.', detail: '담배·라면·간식·우표 같은 물건이 가치 단위가 되고, 빚·이자·담보까지 생긴다. 거래의 통제권이 곧 권력.', who: '물건을 굴리는 ‘큰손’, 빚진 자, 단속하는 직원.', drama: '“감옥 안의 경제” — 사채·담보·파산이 거실의 권력 지형을 뒤흔드는 정밀한 장치.', caution: '품목·가치는 시대·시설마다 다르다. 막연한 ‘돈거래’보다 구체적 물건 경제를 설계하면 사실감이 산다.' },
    ],
  },
  {
    key: 'argot', label: '은어·옥중 말투', icon: '🗣️',
    note: '“그들만의 말.” 은어는 결속·은폐·서열의 언어다. 대사 한 줄에 자연스레 섞으면 세계가 단숨에 진짜처럼 들린다. (※ 자작 각색 용례)',
    items: [
      { name: '들어옴·나감을 가리키는 말', era: '근현대(자작 각색)', what: '수감되는 것과 풀려나는 것을 에둘러 부르는 표현들. ‘안/밖’을 가르는 경계 의식이 담긴다.', detail: '“안으로 들어왔다 / 담을 넘었다 / 바깥바람을 쐰다 / 문이 열린다(출소)” 같은 식으로 직설을 피해 말한다.', who: '수형자끼리, 면회 온 가족과의 대화.', drama: '출소를 둘러싼 말들은 희망·두려움(재범·사회 복귀)을 동시에 품어 감정의 결을 만든다.', caution: '은어는 ‘자작 각색 용례’다. 특정 지역·실제 집단의 진짜 은어를 그대로 베끼지 말고 세계관에 맞게 지어 쓸 것.' },
      { name: '서열·역할을 가리키는 말', era: '근현대(자작 각색)', what: '방장·고참·신입·약자 등 위계를 부르는 호칭. 부르는 말 자체가 권력 관계를 드러낸다.', detail: '“형님/큰형(고참) · 막내(신입) · 자리지기(좋은 자리 차지) · 심부름꾼” 같이 관계와 의무가 호칭에 새겨진다.', who: '서열을 매기고 부르는 수형자 집단.', drama: '호칭이 바뀌는 순간이 곧 서열 변동 — “이제 형님이라 부르지 않겠다”는 선언이 반란의 신호가 된다.', caution: '호칭 체계는 문화·시설마다 다르다. 일률적 군대식으로 옮기지 말고 그 세계 고유의 말로 다듬을 것.' },
      { name: '물건·거래를 가리키는 말', era: '근현대(자작 각색)', what: '밀반입품·대체 화폐·암거래를 에둘러 부르는 말. 단속을 피하려 직설을 피하는 ‘은폐의 언어’.', detail: '“넣는다(반입) · 돌린다(유통) · 외상(빚) · 줄(연락·공급선)” 처럼 짧고 모호한 동사로 정보를 흘린다.', who: '거래하는 수형자, 못 알아듣게 말하려는 양쪽.', drama: '은어를 알아듣느냐 못 듣느냐가 ‘내부자/외부자’를 가른다 — 신입이 말을 배우는 과정이 곧 적응기.', caution: '실제 범죄 수법의 ‘사용법’으로 읽히지 않게 할 것. 어디까지나 분위기용 대사 장치로만.' },
      { name: '시간·형기를 가리키는 말', era: '전 시대~현대(자작 각색)', what: '남은 형기·날짜를 부르는 표현. 시간이 가장 절실한 곳이라 시간을 가리키는 말이 유독 발달한다.', detail: '“달력에 금 긋는다(하루 보냄) · 날 센다 · 끝이 보인다(출소 임박) · 길다(중형)” 처럼 시간을 몸으로 센다.', who: '형기를 세는 수형자, 위로·재촉하는 동료.', drama: '“날을 세는 의식”은 희망과 권태를 동시에 보여주는 강력한 디테일 — 벽의 금, 지워지는 숫자.', caution: '형기 표현은 ‘체감 시간’의 장치다. 실제 행정 용어와 혼동되게 쓰지 말고 정서적 표현으로 다룰 것.' },
      { name: '간수·통제를 가리키는 말', era: '근현대(자작 각색)', what: '교도관·점호·검방 등 통제 요소를 에둘러 부르는 말. 경계와 거리감이 담긴 ‘저쪽’의 언어.', detail: '“열쇠(간수) · 도는 시간(순찰) · 뒤집는다(검방) · 줄 선다(점호)” 처럼 통제 행위를 동사로 압축한다.', who: '수형자끼리, 통제를 피하거나 대비하려는 집단.', drama: '“열쇠가 돈다”는 한마디로 거실이 순식간에 조용해지는 — 통제의 리듬을 대사로 그리는 장치.', caution: '은어로 ‘통제를 무력화하는 구체 방법’을 설명하지 말 것. 분위기·긴장 조성용으로 절제할 것.' },
      { name: '바깥세상을 가리키는 말', era: '전 시대~현대(자작 각색)', what: '담장 밖 세상·가족·자유를 부르는 말. 갇힌 자에게 ‘밖’은 그리움이자 두려움의 대상이다.', detail: '“바깥 · 담 너머 · 햇빛 보는 날(출소) · 줄(외부 연락)” 처럼 거리감과 동경이 함께 묻어난다.', who: '면회를 기다리는 수형자, 편지를 주고받는 양쪽.', drama: '오래 갇힌 자가 ‘바깥’을 두려워하는 역설 — 출소가 곧 또 다른 시련이 되는 사회 복귀 서사.', caution: '“출소=해피엔딩”의 안일함을 피할 것. ‘밖’의 낯섦·낙인이 더 무거운 감옥일 수 있다.' },
    ],
  },
  {
    key: 'survival', label: '생존 규칙·처세', icon: '🛡️',
    note: '“어떻게 살아남는가.” 명문화되지 않은 규칙들이 진짜 법이다. 이 규칙을 알면 인물의 선택과 실수가 설득력을 얻는다.',
    items: [
      { name: '눈에 띄지 마라(처신의 기본)', era: '전 시대~현대', what: '약하게도 강하게도 보이지 말고 ‘적당히’ 처신하라는 폐쇄 사회의 1번 규칙.', detail: '지나친 비굴은 표적을, 지나친 과시는 도전을 부른다. 말과 시선을 아끼고 무리에 섞여 시간을 버는 게 기본 생존술.', who: '눈치 보는 신입, 가르치는 고참, 시험하는 집단.', drama: '“섞이려 애쓰는 자”의 긴장 — 한 번의 실수(말·시선·반응)가 처지를 단숨에 뒤집는다.', caution: '주인공을 처음부터 무용담의 강자로 만들지 말 것. ‘살아남기 위한 처신’이 더 사실적이고 흡인력 있다.' },
      { name: '빚지지 마라(거래의 함정)', era: '근현대', what: '안에서의 빚은 곧 종속이다. 호의·물건·보호를 받는 순간 갚을 수 없는 굴레에 묶일 수 있다.', detail: '담배·라면 한 줄의 외상이 이자와 노동으로 불어나고, 끝내 몸·심부름·범행 가담까지 요구받는다.', who: '돈을 굴리는 큰손, 빚진 약자, 보증·중재하는 자.', drama: '“작은 호의가 파멸의 시작” — 빚의 사슬에 묶여 원치 않는 일에 끌려드는 비극의 엔진.', caution: '“공짜 호의”를 순수하게만 그리지 말 것. 폐쇄 경제에서 호의엔 대개 대가가 따른다.' },
      { name: '입을 다물어라(밀고와 침묵)', era: '전 시대~현대', what: '본 것·들은 것을 함부로 옮기지 말라는 규칙. ‘밀고자’ 낙인은 곧 사형선고나 다름없는 곳이 많다.', detail: '직원에게 동료를 일러바치는 것은 최대 금기다. 침묵이 보호받는 자격이고, 입이 가벼운 자는 표적이 된다.', who: '비밀을 아는 자, 밀고를 의심받는 자, 응징하는 집단.', drama: '“알지만 말할 수 없다” — 진실을 쥔 채 침묵을 강요당하는 자의 도덕적 압박이 서스펜스를 만든다.', caution: '밀고 금기는 강력하지만 절대적이진 않다. 직원과의 비공식 거래·정보 흥정의 회색지대를 활용할 것.' },
      { name: '자리를 지켜라(영역과 질서)', era: '근현대', what: '거실의 자리·순서·역할에는 보이지 않는 소유권이 있다. 함부로 침범하면 분쟁이 터진다.', detail: '좋은 자리(창가·화장실 옆 등), 배식 순서, 사용 시간 등이 위계로 배분된다. 무심한 침범이 큰 싸움이 된다.', who: '자리를 차지한 고참, 모르고 침범한 신입, 중재하는 방장.', drama: '“사소한 자리 다툼”이 거대한 충돌로 번지는 — 폐쇄 공간의 긴장을 압축한 디테일.', caution: '자리 규칙을 ‘아무도 모르는 함정’으로만 쓰지 말 것. 신입이 배워가는 과정으로 그리면 더 자연스럽다.' },
      { name: '보호를 사라(연대와 종속)', era: '전 시대~현대', what: '혼자는 위험하니 세력·후견에 기대 보호받는 처세. 그 대가로 충성·상납·복종이 요구된다.', detail: '강자의 그늘에 들어가면 갈취·폭력에서 비교적 안전하지만, 그의 싸움·범행에 끌려들 위험을 진다.', who: '후견하는 강자, 보호받는 약자, 경쟁 세력.', drama: '“안전을 위해 자유를 판다” — 보호와 종속 사이에서 흔들리는 인물의 선택이 곧 주제가 된다.', caution: '보호 관계를 단순한 ‘동맹’으로 미화하지 말 것. 대가와 위험이 따르는 거래임을 보여줄 것.' },
      { name: '시간을 견뎌라(권태와 정신)', era: '전 시대~현대', what: '폭력만큼 무서운 적이 ‘끝없는 권태’다. 반복되는 시간을 버티는 법이 곧 정신의 생존술.', detail: '루틴 만들기, 독서·집필·운동, 날 세기, 목표 두기. 무너지면 무기력·우울·자해로 치닫는다.', who: '시간을 견디는 수형자, 무너지는 자, 곁에서 붙드는 동료.', drama: '“아무 일도 일어나지 않는 공포” — 권태와 싸우는 내면이 옥중 서사의 깊이를 만든다.', caution: '감옥을 사건의 연속으로만 채우지 말 것. ‘견딤’의 정적인 시간이 오히려 인물을 깊게 한다.' },
      { name: '약속을 지켜라(명예와 신용)', era: '전 시대~현대', what: '문서도 법도 없는 곳에서 ‘말과 의리’가 곧 신용이다. 한 번 약속을 깨면 다시는 신뢰받지 못한다.', detail: '거래·보호·정보 교환이 구두 신용으로 돌아간다. 배신은 즉각적이고 가혹한 응징을 부른다.', who: '약속을 주고받는 자들, 배신자, 응징하는 집단.', drama: '“말 한마디의 무게” — 의리를 지키느냐 배신하느냐가 인물의 운명과 명예를 가른다.', caution: '의리를 낭만화하면서도 그 잔혹한 강제력(배신=응징)을 함께 그려야 균형이 맞는다.' },
    ],
  },
  {
    key: 'visit', label: '면회·소통·바깥', icon: '✉️',
    note: '“안과 밖을 잇는 선.” 면회·편지·사식은 생명선이자 정보·음모의 통로다. 검열과 그 틈이 긴장을 만든다.',
    items: [
      { name: '면회(접견)', era: '전 시대~현대', what: '갇힌 자가 가족·지인·변호인을 만나는 일. 정보·위로·물자가 오가는 가장 중요한 소통 창구.', detail: '시간·인원·횟수가 제한되고 직원이 입회·감청하기도. 유리벽·전화기 너머의 만남은 그리움과 거리감을 동시에 그린다.', who: '면회 오는 가족·변호인, 입회·기록하는 직원, 기다리는 수형자.', drama: '“짧은 면회 안에 전해야 할 말” — 감시 속 암시·눈빛·암호로 메시지를 주고받는 긴장의 장면.', caution: '면회를 자유로운 대화로 그리지 말 것. 시간·감시·기록의 제약이 오히려 극적 긴장을 만든다.' },
      { name: '서신·편지(검열)', era: '전 시대~현대', what: '글로 안팎을 잇는 통로. 검열을 전제로 하기에 ‘쓸 수 있는 말’과 ‘숨긴 말’이 갈린다.', detail: '주고받는 편지를 직원이 읽고 일부를 가리거나 막는다. 그래서 암호·은유·행간에 진짜 메시지를 담는다.', who: '편지를 쓰는 양쪽, 검열하는 직원.', drama: '“검열을 뚫는 암호 편지” — 행간에 숨긴 한 줄이 판을 뒤집는 고전적 옥중 장치.', caution: '검열의 존재를 잊지 말 것. ‘무엇이든 자유롭게 쓰는 편지’는 긴장을 죽이고 시대감을 흐린다.' },
      { name: '사식·영치품·차입', era: '전 시대~현대', what: '바깥에서 음식·옷·돈·물품을 넣어주는 일. 부족한 급식·물자를 메우는 ‘생존의 보급선’.', detail: '전근대 옥바라지부터 근대의 영치금·사식까지. 무엇을, 얼마나 넣을 수 있느냐가 안에서의 처지를 좌우한다.', who: '차입하는 가족, 검사·전달하는 직원, 받는 수형자(와 그것을 노리는 자).', drama: '“넉넉한 사식이 곧 권력” — 바깥의 형편이 안의 서열로 직결되는 잔혹한 연결고리.', caution: '국가가 다 대준다고 그리지 말 것. 특히 전근대엔 자비·외부 차입이 생존의 전제였다.' },
      { name: '밀반입(반입 금지물)', era: '전 시대~현대', what: '술·약물·무기·연락 도구 등 금지된 물건을 몰래 들여오는 일. 통제의 허점을 파고드는 위험한 거래.', detail: '면회·사식·외부 작업·매수된 직원 등 다양한 경로로 흘러든다. 적발되면 무거운 징벌과 추가 처벌이 따른다.', who: '반입을 시도하는 자, 매수된 내통자, 단속하는 직원.', drama: '“하나의 반입품이 권력 지형을 바꾼다” — 무기·통신·약물의 등장이 사건의 분기점이 된다.', caution: '구체적 반입 ‘수법 매뉴얼’로 읽히지 않게 할 것. 분위기·긴장용으로 추상적으로 다룰 것.' },
      { name: '면회 거부·접견 금지', era: '근현대', what: '특정 인물·기간의 면회를 막는 조치. 고립을 강화하는 통제 수단이자 ‘바깥과의 단절’이라는 공포.', detail: '수사·징벌·보안을 명분으로 접견을 제한한다. 외부와 끊긴 수형자는 정보·위로·방어 수단을 동시에 잃는다.', who: '접견을 금하는 당국, 끊긴 수형자, 막힌 가족·변호인.', drama: '“연락이 끊긴 동안” 벌어지는 일들 — 단절은 오해·음모·고립의 비극을 키운다.', caution: '접견 금지를 무제한·자의적으로 그리지 말 것. 명분·기간·절차가 있는 제도임을 반영할 것.' },
      { name: '출소·가석방·사회 복귀', era: '근대 이후', what: '형기를 마치거나 조건부로 풀려나 바깥으로 돌아가는 일. 끝이자 또 다른 시작인 ‘문턱’.', detail: '가석방은 성실도·심사를 거쳐 조건부로 허락된다. 출소자는 낙인·단절·생계라는 ‘바깥의 감옥’과 마주한다.', who: '출소자, 심사하는 당국, 맞이하거나 외면하는 사회·가족.', drama: '“풀려났지만 자유롭지 않다” — 사회 복귀의 좌절·재범의 유혹이 깊은 후일담을 만든다.', caution: '“출소=해피엔딩”의 안일함을 피할 것. 가석방은 근대 제도이며 전근대 ‘사면’과는 성격이 다르다.' },
    ],
  },
  {
    key: 'escape', label: '탈옥·소요·사건', icon: '🪜',
    note: '“벽을 넘는 자.” 탈옥·반란·진정은 그 자체로 서스펜스다. 시대의 ‘잠금·감시 수단’ 안에서 설계해야 사실감이 산다.',
    items: [
      { name: '탈옥(脫獄)', era: '전 시대~현대', what: '갇힌 자가 시설을 빠져나가는 사건. 구조의 허점·내부 협력·바깥의 공모가 맞물려야 가능한 ‘불가능에의 도전’.', detail: '구조 파악 → 도구·시간 확보 → 내통/혼란 → 도주로 → 추격·은신. 단 하나의 변수가 모든 계획을 무너뜨린다.', who: '탈주자, 매수된 내통자, 추격하는 관헌·간수.', drama: '치밀한 계획과 우연의 균형 — 탈옥은 그 자체로 한 편의 완결된 서스펜스 구조를 이룬다.', caution: '시대의 잠금·감시(자물쇠·열쇠·점호·담)를 정확히 둘 것. 현대 보안을 전근대에, 또는 그 반대로 섞지 말 것.' },
      { name: '내통·매수(안에서 여는 문)', era: '전 시대~현대', what: '간수·직원·외부인을 돈·정·약점으로 포섭해 통제를 무력화하는 일. 가장 흔한 탈옥·반입의 동력.', detail: '박봉·약점·인정에 호소해 점호·열쇠·정보를 빼낸다. 내통자의 변심 하나가 계획 전체를 뒤집는 변수가 된다.', who: '포섭하는 수형자, 매수된 직원, 그를 의심하는 양쪽.', drama: '“믿었던 내통자의 배신” — 누구를 믿느냐가 곧 생사를 가르는 신뢰의 드라마.', caution: '구체적 매수·해정(解錠) 수법을 매뉴얼처럼 설명하지 말 것. 인물·신뢰의 긴장으로 풀어낼 것.' },
      { name: '폭동·소요(집단 항거)', era: '전 시대~현대', what: '처우·학대·기강에 항의해 수형자들이 집단으로 들고일어나는 사건. 폐쇄 사회의 압력이 폭발하는 순간.', detail: '점거·단식·작업 거부에서 무력 충돌까지 강도가 다양하다. 진압·협상·보복이 뒤따르며 질서가 재편된다.', who: '주동자, 가담·관망하는 다수, 진압·협상하는 당국.', drama: '“억눌린 분노의 폭발” — 정의로운 항거인지 통제 불능의 혼란인지, 그 경계가 주제를 만든다.', caution: '폭동을 단순 ‘액션’으로 소비하지 말 것. 원인(학대·부정)과 결과(보복·재편)를 함께 그려야 무게가 산다.' },
      { name: '단식·진정·소청(비폭력 항거)', era: '근현대', what: '폭력 대신 단식·청원·고발로 부당함에 맞서는 저항. ‘말과 몸’으로 권력에 압박을 가하는 방식.', detail: '단식으로 여론을 환기하거나, 진정·소송으로 처우 개선을 요구한다. 전근대엔 격쟁·상언으로 억울함을 호소했다.', who: '항거하는 수형자, 이를 알리는 외부(가족·변호인·언론), 대응하는 당국.', drama: '“약자의 비폭력 무기” — 굶주리는 몸 하나가 거대한 시스템을 흔드는 긴 싸움의 서사.', caution: '비폭력 항거의 효과를 즉효약처럼 그리지 말 것. 무시·탄압·긴 소모전이 더 현실적이다.' },
      { name: '구출·습격(바깥의 개입)', era: '전 시대~현대', what: '외부 세력이 시설을 치거나 호송 중을 노려 갇힌 자를 빼내는 사건. 옥 안팎의 공모가 핵심.', detail: '이감·재판 출정 등 ‘담 밖으로 나오는 틈’이 흔한 표적이 된다. 무력·기만·내응이 결합돼야 성공한다.', who: '구출하는 외부 세력, 안의 내응자, 호송·경비 관헌.', drama: '“가장 약한 순간(호송)을 노리는 한 방” — 안과 밖의 타이밍을 맞추는 정밀한 합동 작전극.', caution: '구출을 ‘담장 정면 돌파’로만 그리지 말 것. 이송·출정의 ‘틈’을 노리는 편이 더 그럴듯하다.' },
      { name: '옥중 사망·은폐(가장 어두운 사건)', era: '전 시대~현대', what: '병·폭력·자해·처형 등으로 안에서 죽는 일과, 그것을 둘러싼 은폐·진상 규명. 옥중 미스터리의 핵심.', detail: '열악한 위생·은밀한 폭력은 죽음을 ‘사고·병사’로 위장하기 쉽게 한다. 진실을 캐는 자에게 위협이 따른다.', who: '죽은 자, 은폐하려는 가해·당국, 진상을 파는 동료·가족·조사자.', drama: '“의문의 죽음”과 그 진상 추적 — 폐쇄 공간이라는 밀실이 강력한 추리 무대가 된다.', caution: '죽음을 자극적 장치로만 소비하지 말 것. 진상·책임·애도를 함께 다뤄야 서사가 가벼워지지 않는다.' },
    ],
  },
]

const LS = 'sry:tool:prison-life-ref:'
const ALL = '__all__'

type Flat = { cat: CatDef; item: Entry }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 항목 → 단서 묶음(필드 라벨 포함)
const FIELDS: { k: keyof Entry; label: string }[] = [
  { k: 'era', label: '시대·유형' },
  { k: 'what', label: '핵심' },
  { k: 'detail', label: '구체 묘사' },
  { k: 'who', label: '관여 인물' },
  { k: 'drama', label: '이야기 활용' },
  { k: 'caution', label: '고증·유의' },
]

function plainText(f: Flat): string {
  const lines = [`🔒 ${f.item.name}  (${f.cat.label})`]
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
    `<p><i>※ 교도소물·옥중 서사 고증을 위한 창작 참고 자료. 실제 시설 정보나 범행 안내가 아닙니다.</i></p>`,
  ].join('')
}

export default function PrisonLifeRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre / payload.era 가 오면 안내 힌트로 활용(맥락 활용)
  const genreHint = typeof payload?.genre === 'string' ? (payload.genre as string)
    : typeof payload?.era === 'string' ? (payload.era as string) : ''

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

  // 수집함에 담기 — addToStash 채널(있으면 수집함에, 없어도 graceful)
  // 여기서는 스니펫 라이브러리에 저장(글감 보관) — 다른 글쓰기 도구에서 함께 읽힘
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: `[수감 생활 자료] ${plainText(f)}`,
      source: '수감 생활 사전',
      tags: ['감옥', '교도소', '수감', '옥중', '고증', f.cat.label, f.item.name],
    })
    flash(`스니펫 라이브러리에 ‘${f.item.name}’ 자료를 저장했습니다.`)
  }

  // 프로젝트 자료에 추가 — addToProject(root:research)
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '수감 생활 고증 자료',
      title: `${f.item.name} (${f.cat.label})`,
      bodyHtml: bodyHtml(f),
      meta: { 분류: f.cat.label, 시대유형: f.item.era || '', 관여인물: f.item.who && f.item.who !== '—' ? f.item.who : '' },
    })
    if (id) flash(`프로젝트 자료 〈수감 생활 고증 자료〉에 ‘${f.item.name}’을(를) 추가했습니다.`)
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
        <Emoji e="🔒"/> <b style={{ color: 'var(--text)' }}>창작 고증 자료</b>입니다. 교도소물·옥중 서사의 ‘구조·일과·위계·은어·생존·면회·탈옥’ 묘사를 위한
        서사용 설정 단서이며, 실제 시설 정보·범행 안내·특정 사건 정보가 아닙니다. 은어는 자작 각색 용례이니 세계관에 맞게 다듬어 쓰세요.
      </div>

      <div style={hint}>
        감옥 구조·일과·위계·은어·생존 규칙·면회/탈옥 관습 등 <b>{total}개</b> 항목을 카테고리로 정리했습니다.
        검색·펼침으로 찾고, 무작위로 영감을 얻고, 클릭해 복사하거나 스니펫·프로젝트로 보내세요.
        {genreHint ? <>  (전달된 맥락: <b>{genreHint}</b>)</> : null}
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="구조·일과·위계·은어·생존·면회·탈옥으로 검색 (예: 점호, 방장, 사식, 검방, 내통)"
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
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 카테고리 설명 */}
      {cat !== ALL && (() => {
        const c = CATS.find((x) => x.key === cat)
        return c?.note ? (
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, borderLeft: '2px solid var(--border)', paddingLeft: 9 }}>
            <Emoji e={c.icon}/> {c.note}
          </div>
        ) : null
      })()}

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
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="📎"/> 스니펫 저장</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>
              {favs[favKey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => toProject(random)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 자료를 프로젝트 자료 〈수감 생활 고증 자료〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('law-justice-ref')} title="법·재판·형벌 사전 열기"><Emoji e="⚖️"/> 법·재판·형벌 사전</button>
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
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{c.icon} {c.label}</span>
                  <button onClick={() => toggleExpand(fk)} title={open ? '접기' : '펼치기'}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', fontSize: 15, fontWeight: 700, textAlign: 'left' }}>
                    {open ? '▾' : '▸'} {item.name}
                  </button>
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(c.key, item.name)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                {!open && (item.what || item.era) && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.era ? <span style={{ color: 'var(--accent)' }}>[{item.era}] </span> : null}{item.what}
                  </div>
                )}
                {open && renderFields(item)}
                {open && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
                    <button className="minibtn" onClick={() => copy(plainText({ cat: c, item }), 'item:' + fk)}>
                      {copiedKey === 'item:' + fk ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
                    </button>
                    <button className="minibtn" onClick={() => saveSnippet({ cat: c, item })}><Emoji e="📎"/> 스니펫 저장</button>
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

      <div style={hint}>
        자료는 정답이 아니라 출발점입니다. 같은 ‘옥’도 <b>어느 시대·어떤 유형(전근대 뇌옥·근대 교도소·유형지·구치소)</b>이냐에 따라
        구조와 규칙이 전혀 달라집니다 — 그 차이를 갈등의 씨앗으로 삼으세요.
        <button className="linkbtn" style={{ marginLeft: 6 }} onClick={() => openToolLinked('law-justice-ref')} title="법·재판·형벌 사전 열기">
          <Emoji e="⚖️"/> 법·재판·형벌 사전 열기
        </button>
      </div>
    </div>
  )
}
