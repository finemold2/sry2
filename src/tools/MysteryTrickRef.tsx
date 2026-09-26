// 트릭·범행수법 사전 — 미스터리·추리 장르 전용. 밀실/알리바이 조작/시간차/신원 위장/암호/독살 등
//   트릭 유형 정의 + 고전 사례 유형 + "비틀기 제안"(슬롯 무작위 조합 생성기)을 한곳에 모은 로컬 사전.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 API 없음(전부 로컬 자작 데이터). Math.random + localStorage 만.
// 기능: 카테고리 펼침 + 검색 + 무작위 + 클릭 복사 / 비틀기 제안 생성기(슬롯 잠금·재생성·조합수 표시, 58억+)
// 연계(linkbus): 트릭 항목·비틀기 아이디어를 자료('research') 〈트릭 노트〉 폴더에 메모로 추가, 글감 스니펫 저장,
//   관련 도구(반전 카드덱/플롯 피라미드 등) 열기. payload.genre 가 오면 맥락 표기.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'mystery-trick-ref',
  name: '트릭·범행수법 사전',
  icon: '🔍',
  group: '지식 사전',
  genre: '미스터리·추리',
  intro: '밀실·알리바이·시간차·신원 위장·암호·독살 트릭 유형과 고전 사례, 비틀기 제안을 한곳에',
  w: 680,
  h: 660,
}

// ───────────────────────── 데이터 모델 ─────────────────────────
interface Trick {
  name: string          // 트릭/수법 이름
  def: string           // 정의·원리
  classics: string[]    // 고전 사례 '유형'(특정 작품 스포일러 대신 패턴화)
  twists: string[]      // 비틀기 제안(이 트릭을 변주하는 아이디어)
  tags: string[]        // 검색 보조 태그
}
interface Cat {
  key: string
  label: string
  icon: string
  desc: string
  items: Trick[]
}

// ───────────────────────── 트릭 사전(로컬, 6개 카테고리 · 합계 60+ 항목) ─────────────────────────
const CATS: Cat[] = [
  {
    key: 'locked', label: '밀실', icon: '🚪', desc: '안에서 잠긴 방·외부 침입 흔적 없는 현장에서 어떻게 범행이 가능했는가',
    items: [
      {
        name: '물리적 밀실 — 자물쇠 조작',
        def: '문은 잠겨 있었으나 자물쇠·걸쇠·빗장을 실·자석·핀·얼음 등으로 밖에서 조작했다. 떠난 뒤 흔적이 사라진다.',
        classics: ['바늘과 실로 안쪽 빗장을 당겨 거는 고전형', '문틈으로 넣은 도구로 안쪽 키를 돌린 뒤 회수', '문 아래로 열쇠를 다시 밀어넣어 자살로 위장'],
        twists: ['조작 도구가 흉기 자체였다(이중 용도)', '얼음·각설탕 등 시간이 지나면 녹아 증거가 사라지는 매개', '범인이 일부러 \'조작 흔적\'을 남겨 더 정교한 트릭을 가린다'],
        tags: ['밀실', '자물쇠', '빗장', '실', '바늘'],
      },
      {
        name: '기계·기관 트릭',
        def: '용수철·추·시계장치·문의 자동 잠김 구조 등 기계장치가 범인이 떠난 뒤 문을 잠그거나 흉기를 작동시킨다.',
        classics: ['천장·벽에 숨긴 발사 장치가 시차를 두고 작동', '문이 닫히면 자동으로 빗장이 내려가는 구조 악용', '피해자 본인의 동작(문 열기)이 함정을 격발'],
        twists: ['장치가 피해자의 평소 습관에 맞춰 설계되어 \'우연한 사고\'로 보인다', '범인조차 장치 작동 시각을 통제 못 해 알리바이가 어긋난다', '장치의 존재 자체가 두 번째 시신으로 위장된다'],
        tags: ['밀실', '기계', '장치', '함정', '용수철'],
      },
      {
        name: '심리적 밀실 — 발견 시점 조작',
        def: '방은 실제로 잠겨 있지 않았으나, 목격·발견의 \'순서와 시점\'을 통제해 밀실처럼 인식시킨다.',
        classics: ['발견자가 곧 범인 — 문을 부수며 그 순간 잠그거나 흔적을 만든다', '여러 사람이 동시에 \'잠겨 있었다\'고 증언하도록 상황 설계', '복도 통과 시각을 어긋나게 해 무인 구간을 만든다'],
        twists: ['\'함께 문을 부순\' 목격자 전원이 공범', '밀실은 피해자가 스스로 만든 것(은폐·자살 위장)이고 범인은 따로 있다', '밀실이라는 인식 자체가 진짜 출입구에서 시선을 돌리는 미끼'],
        tags: ['밀실', '심리', '발견자', '목격', '제일발견자'],
      },
      {
        name: '구조적 트릭 — 비밀 통로·이중 구조',
        def: '벽·바닥·가구·창의 숨은 출입구, 또는 방 자체가 두 개로 보이는 이중 구조를 이용한다.',
        classics: ['벽난로·책장 뒤 통로', '바닥·천장의 해치', '겉보기엔 한 방이나 가벽으로 나뉜 이중 공간'],
        twists: ['통로의 존재가 아니라 \'통로가 한 방향으로만 열린다\'는 점이 핵심', '비밀 통로가 사실 미끼이고 진범은 정문으로 당당히 드나들었다', '독자가 본 평면도 자체가 신뢰할 수 없는 서술이다'],
        tags: ['밀실', '비밀통로', '이중구조', '가벽', '평면도'],
      },
      {
        name: '시신 이동형 밀실',
        def: '범행은 다른 곳에서 일어났고, 잠긴 방에는 시신만(또는 시신을 가장한 것이) 옮겨졌거나, 살아 있는 듯 위장됐다.',
        classics: ['살아 있는 척 잠긴 방에 들어간 피해자가 이미 치명상을 입은 상태', '시신을 밖에서 던져넣거나 끌어들인 뒤 입구를 막음', '사망 추정 장소와 실제 살해 장소의 불일치'],
        twists: ['\'밀실 안의 시신\'이 사실 다른 사람', '피해자가 자기 발로 들어가 잠근 뒤 외부 요인으로 사망(원격 살해)', '밀실은 알리바이를 위한 무대장치다'],
        tags: ['밀실', '시신이동', '원격', '사망시각'],
      },
    ],
  },
  {
    key: 'alibi', label: '알리바이 조작', icon: '⏱️', desc: '범행 시각에 다른 곳에 있었다는 증명을 인위적으로 만들어낸다',
    items: [
      {
        name: '시각 조작 — 시계·기록 위조',
        def: '시계·녹음·CCTV·통화기록 등 \'시각의 증거\'를 앞당기거나 늦춰, 사망·범행 시각을 착각하게 만든다.',
        classics: ['멈춘 손목시계로 사망 시각을 가장', '미리 녹음·예약 발송한 메시지로 생존을 가장', '시계를 돌려 목격 증언을 어긋나게 함'],
        twists: ['조작된 시각이 너무 완벽해서 도리어 단서가 된다', '범인이 아니라 \'제3자\'가 자기 목적으로 같은 시계를 또 조작했다', '디지털 기록의 메타데이터(타임스탬프)가 진짜 시각을 폭로'],
        tags: ['알리바이', '시각', '시계', '타임스탬프', '녹음'],
      },
      {
        name: '대역·분신 트릭',
        def: '쌍둥이·변장·대역을 세워, 같은 시각 두 장소에 \'있었던\' 것처럼 만든다.',
        classics: ['쌍둥이가 서로의 알리바이가 됨', '변장한 공범이 피해자/범인 행세', '먼발치 목격에만 의존한 \'그 사람이었다\'는 증언'],
        twists: ['대역이 진짜 표적이었다(살해 대상 착오 유도)', '대역 본인은 자신이 이용당하는 줄 몰랐다', '대역은 사람이 아니라 마네킹·그림자·영상이었다'],
        tags: ['알리바이', '대역', '쌍둥이', '변장', '분신'],
      },
      {
        name: '집단 증언 담합',
        def: '여러 목격자가 입을 맞춰 범인의 위치를 보증한다. 공동 동기 또는 약점을 공유한 집단.',
        classics: ['폐쇄 공동체 전원이 한 사람을 감싸거나 함께 처벌', '서로의 알리바이를 교차로 보증하는 짝패', '권위자 한 명의 증언에 모두가 동조'],
        twists: ['담합한 줄 알았던 증인 중 하나만 진실을 말하고 있다', '담합의 목적은 살인 은폐가 아니라 전혀 다른 비밀의 보호', '탐정이 담합의 존재를 역이용해 함정을 판다'],
        tags: ['알리바이', '증언', '담합', '공범', '공동체'],
      },
      {
        name: '원격 격발 — 부재 중 살해',
        def: '범인이 현장을 떠난 뒤 작동하는 장치·예약·자연현상으로 살해해, 범행 시각에 부재 알리바이를 확보한다.',
        classics: ['예약된 전기·가스·화학 반응', '간조·일몰·기온 변화 등 자연의 시계를 이용', '피해자의 정해진 습관이 격발 조건'],
        twists: ['격발 시점이 날씨로 어긋나 알리바이가 깨진다', '범인은 \'성공\'을 모른 채 떠나 우연한 사고로 오인됨', '격발 조건을 아는 인물이 곧 용의자 풀을 좁힌다'],
        tags: ['알리바이', '원격', '예약', '자연', '습관'],
      },
      {
        name: '거리·이동시간 트릭',
        def: '두 지점 사이의 이동 가능 시간을 잘못 계산하게 만들어, 불가능해 보이는 왕복을 가능하게 한다.',
        classics: ['지름길·교통수단을 숨긴 빠른 왕복', '교통편 시각표를 활용한 \'분 단위\' 트릭', '강·지형을 가로지르는 의외의 경로'],
        twists: ['알리바이의 핵심은 거리가 아니라 \'시간대(타임존)\'의 차이', '교통편이 실제로는 그날 운행하지 않았다', '이동한 것은 사람이 아니라 물건(흉기·시신·기록)뿐'],
        tags: ['알리바이', '이동시간', '시각표', '경로', '타임존'],
      },
    ],
  },
  {
    key: 'timegap', label: '시간차', icon: '🕰️', desc: '사건이 일어난 \'진짜 시각\'을 흐트러뜨려 인과·순서를 착각하게 한다',
    items: [
      {
        name: '사망 시각 위장',
        def: '체온·사후경직·부패·곤충 등 사후 변화를 인위적으로 가속·지연시켜 사망 추정 시각을 어긋나게 한다.',
        classics: ['난방·냉방으로 시신 온도 조작', '얼리거나 데워 부패 진행을 왜곡', '사후경직을 풀거나 굳혀 추정 오차를 만든다'],
        twists: ['시각을 늦춘 줄 알았으나 사실은 앞당긴 역방향 트릭', '법의학적 오차 범위 자체를 범인이 알고 설계', '\'정확한 사망 시각\'을 알려주는 단서가 곧 범인의 전문성을 폭로'],
        tags: ['시간차', '사망시각', '사후경직', '체온', '법의학'],
      },
      {
        name: '선후 도착(순서 뒤집기)',
        def: '사건의 실제 발생 순서를 독자·수사진이 거꾸로 인식하게 만든다. 결과가 원인처럼 제시된다.',
        classics: ['두 번째 사건이 사실 먼저 일어났다', '\'발견 순서\'가 \'발생 순서\'로 오인됨', '편지·전화의 작성 시점과 도착 시점의 간극'],
        twists: ['순서를 뒤집은 주체가 범인이 아니라 목격자다', '뒤집힌 순서를 바로잡는 단 하나의 물증(영수증·날씨·뉴스)', '독자가 본 장면 배열(서술 순서) 자체가 트릭'],
        tags: ['시간차', '순서', '인과', '선후', '서술트릭'],
      },
      {
        name: '예고·지연 트릭',
        def: '미리 준비한 행위(편지·녹음·예약)가 시차를 두고 실행되어, 범인의 부재나 무관함을 입증한다.',
        classics: ['죽은 자가 보낸 듯한 예약 메시지', '미리 찍어둔 영상·사진으로 시점 위장', '지연 발화·지연 반응 장치'],
        twists: ['예고가 실은 진짜 협박이 아니라 알리바이 공작', '지연 장치가 의도보다 일찍/늦게 터져 진실이 드러남', '예고를 받은 사람만이 알 수 있는 정보가 범인을 가리킨다'],
        tags: ['시간차', '예고', '지연', '예약', '협박장'],
      },
      {
        name: '날짜·요일 착시',
        def: '달력·요일·기념일·시즌의 혼동을 이용해 \'언제\'를 통째로 착각하게 만든다.',
        classics: ['윤일·서머타임·연말연시의 경계', '같은 요일 반복으로 며칠을 하루처럼 압축', '날짜 변경선·시차로 이틀이 하루가 된다'],
        twists: ['모두가 같은 날로 착각한 두 날의 사진 한 장의 차이', '범인만 정확한 날짜를 헷갈리지 않았다는 점이 단서', '계절성 증거(꽃·눈·일조)가 진짜 날짜를 폭로'],
        tags: ['시간차', '날짜', '요일', '서머타임', '시차'],
      },
    ],
  },
  {
    key: 'identity', label: '신원 위장', icon: '🎭', desc: '누가 누구인지 — 피해자·가해자·생사·존재 자체를 속인다',
    items: [
      {
        name: '피해자 바꿔치기',
        def: '발견된 시신이 알려진 인물이 아니다. 신원 확인의 근거(얼굴·소지품·치아)를 위조한다.',
        classics: ['소지품·옷으로만 신원 추정', '얼굴 훼손으로 식별 불가하게 만듦', '치과·DNA 기록을 미리 바꿔치기'],
        twists: ['\'죽었다\'던 피해자가 범인이 되어 살아 있다', '바꿔치기 사실을 아는 단 한 사람이 다음 표적', '시신은 진짜이나 \'이름\'만 도용당했다'],
        tags: ['신원', '바꿔치기', '시신', 'DNA', '식별'],
      },
      {
        name: '범인=의외의 인물',
        def: '서술·시선의 사각지대에 둔 인물(서술자·탐정·피해자·시신·어린이·노인 등)이 진범이다.',
        classics: ['믿었던 화자·기록자가 거짓을 섞는다', '죽은 줄 알았던 인물의 생존', '수사·구조의 일원이 곧 범인'],
        twists: ['의외의 인물이 진범인 동시에 다음 피해자', '\'가장 의외\'를 노린 독자의 메타 추리를 한 번 더 뒤집기', '범인은 한 명이 아니라 \'역할\'을 나눠 가진 복수'],
        tags: ['신원', '범인', '의외', '서술자', '반전'],
      },
      {
        name: '생존·사망 위장',
        def: '살아 있는 자가 죽은 척하거나, 죽은 자가 산 것처럼 위장돼 존재의 시점이 흐려진다.',
        classics: ['장례·사망신고로 공식적 죽음 위장', '연기·약물로 가사 상태 연출', '대리 시신으로 자기 죽음을 꾸밈'],
        twists: ['위장 사망의 목적이 살인이 아니라 도주·보험·면책', '죽은 척하다 진짜로 죽는 역설', '위장을 도운 조력자가 비밀의 무게에 무너진다'],
        tags: ['신원', '생존', '사망위장', '가사', '실종'],
      },
      {
        name: '다중 인격·이중 생활',
        def: '한 사람이 둘 이상의 신분·이름·생활을 유지해 동선과 동기를 분산시킨다.',
        classics: ['낮과 밤의 다른 신분', '두 도시·두 가정의 이중 생활', '가명으로 운영한 또 다른 인생'],
        twists: ['두 신분이 서로 다른 사건의 용의자/피해자', '본인조차 한쪽 인격의 행적을 기억 못 한다', '이중 생활의 한쪽이 사실 누군가의 누명·도용'],
        tags: ['신원', '다중인격', '이중생활', '가명', '동선'],
      },
      {
        name: '변장·성별·연령 위장',
        def: '변장·분장·복식·목소리로 외형 정보를 바꿔, 목격 증언과 인상착의를 무력화한다.',
        classics: ['제복·유니폼으로 \'배경 인물\'이 됨', '성별·연령을 바꾼 분장', '특정 신체 특징을 가리거나 만들어냄'],
        twists: ['변장의 단서는 외형이 아니라 \'사라지지 않는 습관\'(걸음·말버릇)', '변장이 너무 평범해서 아무도 기억 못 한다', '변장한 인물이 사실 변장을 강요당한 피해자'],
        tags: ['신원', '변장', '분장', '제복', '인상착의'],
      },
    ],
  },
  {
    key: 'cipher', label: '암호·다잉메시지', icon: '🔐', desc: '범인·진실을 가리키는 메시지를 숨기거나, 거짓 메시지로 오도한다',
    items: [
      {
        name: '치환·대입 암호',
        def: '글자·숫자·기호를 일정 규칙으로 바꿔 적은 메시지. 키를 알아야 풀린다.',
        classics: ['카이사르식 자리 이동', '기호·그림 대입(춤추는 인형류)', '책·악보를 키로 쓰는 북 사이퍼'],
        twists: ['암호의 \'키\'가 피해자의 사적 정보라 범인 범위를 좁힌다', '풀린 평문이 또 다른 암호다(이중 암호)', '암호가 사실 미끼이고 진짜 메시지는 그 \'배치·여백\'에 있다'],
        tags: ['암호', '치환', '카이사르', '북사이퍼', '기호'],
      },
      {
        name: '다잉 메시지',
        def: '죽어가는 피해자가 남긴 단편적 단서. 불완전·모호해 다양한 해석이 가능하다.',
        classics: ['끊긴 글자·미완성 단어', '주변 사물의 배치로 남긴 암시', '피로 쓴 기호·이니셜'],
        twists: ['다잉 메시지는 범인을 가리키는 게 아니라 \'아끼는 사람을 지키려\' 일부러 모호하게', '범인이 메시지를 손대 의미를 비틀었다', '메시지는 진짜이나 \'읽는 방향·언어\'가 트릭'],
        tags: ['암호', '다잉메시지', '단서', '이니셜', '미완성'],
      },
      {
        name: '은닉 메시지(스테가노그래피)',
        def: '평범한 문장·그림·사물 속에 진짜 메시지를 숨긴다(머리글자·여백·잉크·이중 의미).',
        classics: ['문장의 첫 글자만 읽는 어크로스틱', '보이지 않는 잉크·미세 글씨', '그림·악보·자수에 숨긴 정보'],
        twists: ['숨긴 메시지를 \'찾았다는 사실\'이 함정(범인이 유도)', '진짜 메시지는 숨긴 게 아니라 너무 대놓고 보여 무시됐다', '메시지를 숨긴 매체(편지지·그림)의 출처가 결정적 단서'],
        tags: ['암호', '은닉', '스테가노그래피', '어크로스틱', '잉크'],
      },
      {
        name: '거짓 단서(레드 헤링)',
        def: '진실로 위장한 가짜 단서·메시지로 수사와 독자를 엉뚱한 방향으로 끈다.',
        classics: ['엉뚱한 용의자를 가리키는 위조 증거', '우연한 정황을 의미심장하게 배치', '진짜 단서를 가짜들 사이에 묻기'],
        twists: ['레드 헤링을 심은 행위 자체가 진범의 결정적 실수', '가짜인 줄 알았던 단서가 사실 진짜였다', '독자가 레드 헤링을 간파했다고 믿게 둔 뒤 한 번 더 뒤집기'],
        tags: ['암호', '레드헤링', '거짓단서', '위조', '오도'],
      },
    ],
  },
  {
    key: 'poison', label: '독살·수법', icon: '🧪', desc: '눈에 띄지 않게 독·약물·물리력으로 살해하고 사인을 위장한다',
    items: [
      {
        name: '지연성 독·축적독',
        def: '즉시 작용하지 않고 시차를 두거나, 여러 번 미량 투여로 축적되어 자연사·병사로 보이게 한다.',
        classics: ['만성 중독으로 위장한 장기 투여', '잠복기 있는 독으로 알리바이 확보', '평소 약과 섞어 의심 회피'],
        twists: ['축적독의 \'마지막 한 번\'을 가한 사람이 진범', '오랜 투여 기록(머리카락·손톱)이 시간선을 폭로', '독을 쓴 줄 알았으나 사인은 전혀 다른 것(이중 트릭)'],
        tags: ['독살', '지연', '축적', '만성', '잠복기'],
      },
      {
        name: '투여 경로 위장',
        def: '음식·음료·약·화장품·공기·접촉 등 의외의 경로로 독을 전달해 \'누가, 언제\'를 흐린다.',
        classics: ['공용 음식 중 한 사람분에만 투여', '담배·향·증기로 흡입시키기', '피부 접촉·주사 자국 위장'],
        twists: ['모두가 같은 것을 먹었는데 한 명만 죽은 경로의 비밀', '독은 음식이 아니라 \'식기·잔\'에 있었다', '범인 자신도 같은 것을 먹어 용의선상에서 빠진다(내성·해독제)'],
        tags: ['독살', '경로', '음식', '흡입', '접촉'],
      },
      {
        name: '사인 위장(사고·자살·병사)',
        def: '타살을 사고·자살·자연사로 보이게 현장과 증거를 꾸민다.',
        classics: ['낙상·익사·감전 사고로 위장', '유서·정황으로 자살 연출', '지병 악화로 보이게 함'],
        twists: ['자살로 위장한 현장의 \'단 하나 부자연스러운 점\'', '사고로 위장했으나 그 사고가 일어날 수 없는 물리적 조건', '진짜 사고를 범인이 \'타살처럼\' 보이게 해 수사를 교란'],
        tags: ['독살', '사인', '자살위장', '사고위장', '병사'],
      },
      {
        name: '흉기·도구 은폐',
        def: '흉기 자체를 사라지게 하거나, 평범한 사물로 위장해 \'무엇으로 죽였는가\'를 감춘다.',
        classics: ['녹거나 먹거나 증발하는 흉기(얼음·소금기둥류)', '일상 도구가 흉기였던 경우', '흉기를 현장 사물에 섞어 둠'],
        twists: ['사라진 흉기를 모두가 보고도 못 알아봤다', '흉기는 물건이 아니라 \'행위·환경\'(추위·공포·소음)', '흉기를 없앤 방법이 곧 범인의 직업·지식을 폭로'],
        tags: ['독살', '흉기', '은폐', '얼음', '도구'],
      },
    ],
  },
]

// 모든 트릭을 펼친 평탄 목록(무작위·검색용)
type Flat = { cat: Cat; item: Trick }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))
const TOTAL = CATS.reduce((n, c) => n + c.items.length, 0)

// ───────────────────────── 비틀기 제안 생성기(슬롯 무작위 조합) ─────────────────────────
// 7개 슬롯의 풀에서 무작위로 뽑아 "비틀기 한 줄 시드"를 만든다. 조합수는 58억(약 58.3억)을 상회.
// 각 슬롯 풀은 모두 명사구(고유 항목)이며, 시드 문장에서 조사는 받침을 보고 josa() 로 실제 하나만 출력한다.
interface Slot { key: string; label: string; icon: string; pool: string[] }
const SLOTS: Slot[] = [
  {
    key: 'victim', label: '피해자', icon: '🩸',
    pool: [
      '폐쇄 저택의 상속인', '은퇴한 형사', '소문 많은 부호', '말 없는 가정부', '쌍둥이 중 형',
      '극단의 주연 배우', '시계 수리공', '독선적인 의사', '비밀 많은 변호사', '고립된 등대지기',
      '연재 중인 추리작가', '전직 마술사', '폐교 직전 교장', '야간열차 승객', '섬마을 우체부',
      '컬렉터인 노학자', '바닷가 펜션 주인', '몰락한 귀족', '신흥 종교 간부', '내부 고발자',
      '퇴역한 군의관', '골동품 감정사', '소도시의 검시관', '입막음당한 회계사', '실종된 무용수',
      '은둔한 발명가', '폐업한 약국의 약사', '소문난 점성술사', '말썽 많은 유언 집행인', '낙향한 지휘자',
    ],
  },
  {
    key: 'place', label: '현장', icon: '🏚️',
    pool: [
      '눈에 갇힌 산장', '밀물에 끊기는 섬', '정전된 극장', '운행 중인 야간열차', '안개 낀 등대',
      '폐쇄된 병동', '낡은 회전목마 창고', '지하 와인 저장고', '고립된 연구소', '비 내리는 온실',
      '문 잠긴 서재', '수직 동굴 캠프', '해상 유람선', '관람차 곤돌라', '폐광 갱도',
      '시험장이 된 강당', '리모델링 중인 호텔', '태풍에 봉쇄된 항구', '심야 라디오 부스', '눈사태로 막힌 터널',
      '문 닫은 천문대', '안개에 갇힌 골프장', '봉인된 미술관 수장고', '운행 멈춘 케이블카', '침수된 지하 주차장',
      '폐쇄 직전 수족관', '단수된 고층 아파트', '발이 묶인 공항 라운지', '고립된 산악 대피소', '정비 중인 놀이공원',
    ],
  },
  {
    key: 'trick', label: '핵심 트릭', icon: '🎯',
    pool: [
      '실로 조작한 빗장', '멈춘 시계의 거짓 시각', '쌍둥이 대역', '얼면 사라지는 흉기', '예약 발송 메시지',
      '발견 순서 뒤집기', '피해자 바꿔치기', '사후경직 가속', '책을 키로 쓴 암호', '머리글자 은닉 메시지',
      '축적독의 마지막 한 모금', '식기에 숨긴 독', '비밀 통로의 일방향', '서머타임 날짜 착시', '제복으로 배경 되기',
      '원격 격발 장치', '교통편 분 단위 트릭', '거짓 다잉 메시지', '자살로 위장한 현장', '레드 헤링 증거 심기',
      '거울로 만든 가짜 공간', '녹음으로 위장한 생존', '체온 조작한 사망 시각', '시신을 옮긴 무대장치', '습관을 격발한 함정',
      '날짜변경선 이용한 시차', '걸음 소리만의 알리바이', '잉크가 사라지는 유서', '같은 옷 입은 군중 속 잠입', '거꾸로 읽는 다잉 메시지',
    ],
  },
  {
    key: 'misdirect', label: '오도 장치', icon: '🎭',
    pool: [
      '믿음직한 서술자의 거짓', '죽은 줄 알았던 생존', '완벽해 보이는 알리바이', '의심받던 자의 결백',
      '우연을 가장한 필연', '가짜 협박장', '잘못 해석된 단서', '범인의 자작 목격담', '동정을 사는 약자 연기',
      '권위자의 단정', '엉뚱한 동기로 끌기', '대놓고 보여 무시된 진실', '독자의 메타 추리 역이용', '공동체의 입맞춤',
      '시점 인물의 사각지대', '시간선의 뒤바뀜', '이름만 도용된 시신', '두 사건의 혼동', '선의의 거짓말', '전문가의 오진',
      '자청한 수사 협조', '먼저 의심받겠다는 자수극', '눈물로 가린 냉정', '약자로 보이려는 위장', '뒤바뀐 가해자와 피해자',
      '과장된 슬픔의 연기', '엉뚱한 곳으로 끈 발자국', '먼저 발견한 자의 결백 주장', '진심처럼 꾸민 후회', '의도된 사소한 실수',
    ],
  },
  {
    key: 'clue', label: '결정적 단서', icon: '🔎',
    pool: [
      '녹지 않은 눈의 위치', '영수증의 시각', '계절에 안 맞는 꽃', '메타데이터 타임스탬프', '머리카락의 독 흔적',
      '걸음걸이라는 습관', '평면도의 모순', '날씨 기록', '잔에 남은 자국', '한 글자 빠진 메시지',
      '교통편 운휴 사실', '치아·DNA 기록의 위조', '여백에 숨은 글자', '사라진 흉기의 그림자', '시신 온도의 어긋남',
      '두 장 사진의 차이', '운행하지 않은 막차', '잠긴 방의 먼지', '거울에 비친 좌우 반전', '냄새의 잔향',
      '굳지 않은 잉크', '벗겨진 페인트 자국', '맞지 않는 시계 두 개', '낯선 흙의 성분', '바뀐 책의 페이지',
      '말라붙은 촛농의 양', '꺼지지 않은 난로', '되감긴 녹음의 잡음', '한쪽만 닳은 신발', '울리지 않은 전화 기록',
    ],
  },
  {
    key: 'motive', label: '진짜 동기', icon: '💔',
    pool: [
      '오래 묵은 복수', '바꿔치기한 유산', '들키면 끝장날 비밀', '누명을 벗기 위한 침묵', '아끼는 이를 지키려',
      '과거 사건의 은폐', '도용당한 인생을 되찾기', '면책·보험을 위한 위장', '명예를 지키려는 살의', '질투가 빚은 충동',
      '거래의 배신', '치정의 끝', '신념·광신', '협박에서 벗어나기', '실수를 덮으려다 커진 일',
      '권력 다툼', '가문의 저주를 끊으려', '대신 죄를 뒤집어쓰기', '진실을 묻으려는 조직', '잘못 살해한 표적의 뒷수습',
      '빼앗긴 발명의 권리', '버려진 자식의 원망', '조작된 과거의 진상', '대물림된 빚의 무게', '약속을 어긴 자의 응징',
      '사라진 증인의 입막음', '명단에서 지워질 두려움', '오래전 맞바꾼 신분', '되찾고 싶은 자리', '끝내 인정받지 못한 공로',
    ],
  },
  {
    key: 'ending', label: '결말의 한 수', icon: '🃏',
    pool: [
      '범인의 자백을 부른 마지막 질문', '두 번째 시신으로 드러난 진실', '탐정이 일부러 놓아준 함정',
      '진범이 남긴 단 하나의 자비', '뒤집힌 줄 알았던 추리의 재반전', '공범의 양심이 무너지는 순간',
      '증거가 사라진 자리에 남은 침묵', '모두가 공범이었다는 결론',
    ],
  },
]

// ───────────────────────── 조사(받침) 헬퍼 ─────────────────────────
// 앞 글자 받침을 보고 조사 하나만 골라 붙인다. "을(를)" 같은 이중표기를 출력하지 않는다.
const lastHasBatchim = (s: string): boolean | null => {
  const ch = s.trim().slice(-1)
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return null // 한글 음절이 아니면 판단 불가
  return (code - 0xac00) % 28 !== 0
}
const lastIsRieul = (s: string): boolean => {
  const ch = s.trim().slice(-1)
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false
  return (code - 0xac00) % 28 === 8 // ㄹ 받침
}
// type: '이/가' | '을/를' | '은/는' | '으로/로'
const josa = (word: string, type: '이/가' | '을/를' | '은/는' | '으로/로'): string => {
  const has = lastHasBatchim(word)
  if (type === '으로/로') {
    // 받침 없음 또는 ㄹ 받침이면 '로', 그 외 받침이면 '으로'
    if (has === null) return word + '로'
    return has && !lastIsRieul(word) ? word + '으로' : word + '로'
  }
  const [withB, withoutB] = type === '이/가' ? ['이', '가'] : type === '을/를' ? ['을', '를'] : ['은', '는']
  if (has === null) return word + withoutB
  return word + (has ? withB : withoutB)
}

// 조합수 = 각 슬롯 풀 크기의 곱
const COMBO = SLOTS.reduce((n, s) => n * s.pool.length, 1)

// ───────────────────────── 유틸 ─────────────────────────
const LS = 'sry:tool:mystery-trick-ref:'
const ALL = '__all__'
const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const fmt = (n: number) =>
  n >= 1e8 ? `약 ${(n / 1e8).toFixed(1).replace(/\.0$/, '')}억` :
  n >= 1e4 ? `약 ${Math.round(n / 1e4).toLocaleString('ko-KR')}만` :
  n.toLocaleString('ko-KR')

const rand = (n: number) => Math.floor(Math.random() * n)

// ───────────────────────── 컴포넌트 ─────────────────────────
export default function MysteryTrickRef({ payload }: { payload?: Record<string, unknown> }) {
  const genreCtx = typeof payload?.genre === 'string' ? (payload.genre as string) : ''

  // 탭: 사전 / 비틀기 제안 생성기
  const [tab, setTab] = useState<'dict' | 'gen'>(() => {
    try { const v = localStorage.getItem(LS + 'tab'); if (v === 'gen' || v === 'dict') return v } catch { /* ignore */ }
    return 'dict'
  })

  // ── 사전 상태 ──
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try { const v = localStorage.getItem(LS + 'cat'); if (v && (v === ALL || CATS.some((c) => c.key === v))) return v } catch { /* ignore */ }
    return ALL
  })
  const [openKey, setOpenKey] = useState<string | null>(null)   // 펼쳐진 트릭(catKey::name)
  const [randomPick, setRandomPick] = useState<Flat | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // ── 생성기 상태 ──
  const [slots, setSlots] = useState<Record<string, number>>(() => {
    const o: Record<string, number> = {}
    for (const s of SLOTS) o[s.key] = rand(s.pool.length)
    return o
  })
  const [locks, setLocks] = useState<Record<string, boolean>>(() => {
    try { const raw = localStorage.getItem(LS + 'locks'); if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o } } catch { /* ignore */ }
    return {}
  })

  const copyTimer = useRef<number | null>(null)
  const toastTimer = useRef<number | null>(null)

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'tab', tab) } catch { /* ignore */ } }, [tab])
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'locks', JSON.stringify(locks)) } catch { /* ignore */ } }, [locks])

  // 언마운트 정리(타이머)
  useEffect(() => () => {
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
  }, [])

  const showCopied = useCallback((id: string) => {
    setCopied(id)
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500)
  }, [])
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2400)
  }, [])

  const copy = useCallback((text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text)
      .then(() => showCopied(id))
      .catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }, [showCopied])

  // ── 사전: 필터 ──
  const itemKey = (catKey: string, name: string) => `${catKey}::${name}`
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = cat === ALL ? flatAll() : flatAll().filter(({ cat: c }) => c.key === cat)
    if (q) {
      base = base.filter(({ item }) =>
        (item.name + ' ' + item.def + ' ' + item.tags.join(' ') + ' ' +
          item.classics.join(' ') + ' ' + item.twists.join(' ')).toLowerCase().includes(q))
    }
    return base
  }, [query, cat])

  const rollRandom = useCallback(() => {
    const pool = cat === ALL ? flatAll() : flatAll().filter(({ cat: c }) => c.key === cat)
    if (!pool.length) { setRandomPick(null); return }
    setRandomPick((prev) => {
      let pick = pool[rand(pool.length)]
      if (prev && pool.length > 1 && pick.item.name === prev.item.name) pick = pool[rand(pool.length)]
      setOpenKey(itemKey(pick.cat.key, pick.item.name))
      return pick
    })
  }, [cat])

  // 트릭 항목 → 복사/메모용 텍스트
  const trickPlain = (f: Flat) => {
    const t = f.item
    return [
      `[${f.cat.icon} ${f.cat.label}] ${t.name}`,
      t.def,
      '· 고전 사례 유형: ' + t.classics.map((x) => '\n   - ' + x).join(''),
      '· 비틀기 제안: ' + t.twists.map((x) => '\n   - ' + x).join(''),
    ].join('\n')
  }
  const trickHtml = (f: Flat) => {
    const t = f.item
    return [
      `<p><b>${escapeHtml(f.cat.icon + ' ' + f.cat.label)} · ${escapeHtml(t.name)}</b></p>`,
      `<p>${escapeHtml(t.def)}</p>`,
      `<p><b>고전 사례 유형</b></p><ul>${t.classics.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`,
      `<p><b>비틀기 제안</b></p><ul>${t.twists.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`,
    ].join('')
  }

  const addTrickToProject = (f: Flat) => {
    if (!hasProjectBridge()) return
    const id = addToProject({
      kind: 'text', root: 'research', folder: '트릭 노트',
      title: `${f.item.name} (${f.cat.label} 트릭)`,
      bodyHtml: trickHtml(f),
    })
    if (id) showToast(`자료 〈트릭 노트〉에 ‘${f.item.name}’을(를) 추가했습니다.`)
  }
  const saveTrickSnippet = (f: Flat) => {
    addToLibrary('snippets', { text: trickPlain(f), source: '트릭·범행수법 사전', tags: ['트릭', f.cat.label, ...f.item.tags] })
    showToast(`글감으로 ‘${f.item.name}’을(를) 저장했습니다.`)
  }

  // ── 생성기: 한 줄 시드 ──
  const seedFields = useMemo(() =>
    SLOTS.map((s) => ({ slot: s, value: s.pool[slots[s.key] ?? 0] })), [slots])

  const reroll = useCallback(() => {
    setSlots((prev) => {
      const next = { ...prev }
      for (const s of SLOTS) {
        if (locks[s.key]) continue
        let v = rand(s.pool.length)
        if (s.pool.length > 1 && v === prev[s.key]) v = (v + 1 + rand(s.pool.length - 1)) % s.pool.length
        next[s.key] = v
      }
      return next
    })
  }, [locks])

  const rerollOne = (key: string) => {
    setSlots((prev) => {
      const s = SLOTS.find((x) => x.key === key)!
      let v = rand(s.pool.length)
      if (s.pool.length > 1 && v === prev[key]) v = (v + 1 + rand(s.pool.length - 1)) % s.pool.length
      return { ...prev, [key]: v }
    })
  }
  const toggleLock = (key: string) => setLocks((p) => ({ ...p, [key]: !p[key] }))

  const seedSentence = useMemo(() => {
    const m: Record<string, string> = {}
    for (const f of seedFields) m[f.slot.key] = f.value
    // 따옴표·괄호는 받침 판단을 가리므로, 단어로 조사를 먼저 정하고 표기를 입힌다.
    const j = (word: string, type: '이/가' | '을/를' | '은/는' | '으로/로') =>
      josa(word, type).slice(word.length) // 단어 뒤에 붙을 조사만 추출
    return `‘${m.place}’에서 ‘${m.victim}’${j(m.victim, '이/가')} 죽는다. ` +
      `범인은 「${m.trick}」${j(m.trick, '으로/로')} 범행하고, 「${m.misdirect}」${j(m.misdirect, '으로/로')} 수사를 흐린다. ` +
      `그러나 「${m.clue}」${j(m.clue, '이/가')} 모든 걸 뒤집고, 진짜 동기는 ‘${m.motive}’${lastHasBatchim(m.motive) ? '이었다' : '였다'}. ` +
      `끝내 ‘${m.ending}’${j(m.ending, '으로/로')} 막을 내린다.`
  }, [seedFields])

  const seedHtml = () => {
    const rows = seedFields.map((f) =>
      `<li><b>${escapeHtml(f.slot.icon + ' ' + f.slot.label)}</b>: ${escapeHtml(f.value)}</li>`).join('')
    return `<p><b>🔍 미스터리 비틀기 시드</b></p><p>${escapeHtml(seedSentence)}</p><ul>${rows}</ul>`
  }
  const seedPlain = () =>
    seedFields.map((f) => `${f.slot.icon} ${f.slot.label}: ${f.value}`).join('\n') + '\n\n' + seedSentence

  const addSeedToProject = () => {
    if (!hasProjectBridge()) return
    const id = addToProject({
      kind: 'text', root: 'research', folder: '트릭 노트',
      title: `비틀기 시드 — ${seedFields.find((f) => f.slot.key === 'trick')?.value ?? '미스터리'}`,
      bodyHtml: seedHtml(),
    })
    if (id) showToast('자료 〈트릭 노트〉에 비틀기 시드를 추가했습니다.')
  }
  const saveSeedSnippet = () => {
    addToLibrary('snippets', { text: seedPlain(), source: '트릭·범행수법 사전(비틀기 제안)', tags: ['트릭', '비틀기', '미스터리'] })
    showToast('글감으로 비틀기 시드를 저장했습니다.')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const input: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }

  return (
    <div style={wrap}>
      <div style={hint}>
        밀실·알리바이·시간차·신원 위장·암호·독살 등 <b>{TOTAL}종</b>의 트릭·범행수법을 정의·고전 사례 유형·비틀기 제안과 함께 모았습니다.
        {genreCtx ? <>  <span style={{ color: 'var(--accent)' }}>· {genreCtx} 맥락</span></> : null}
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" aria-pressed={tab === 'dict'} onClick={() => setTab('dict')}
          style={{ borderColor: tab === 'dict' ? 'var(--accent)' : 'var(--border)', color: tab === 'dict' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="📚"/> 트릭 사전
        </button>
        <button className="minibtn" aria-pressed={tab === 'gen'} onClick={() => setTab('gen')}
          style={{ borderColor: tab === 'gen' ? 'var(--accent)' : 'var(--border)', color: tab === 'gen' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🎲"/> 비틀기 제안
        </button>
      </div>

      {/* ───────────── 사전 탭 ───────────── */}
      {tab === 'dict' && (
        <>
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="트릭 이름·원리·태그로 검색 (예: 알리바이, 사망 시각, 암호)" style={input} />

          {/* 카테고리 펼침 필터 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button className="minibtn" aria-pressed={cat === ALL} onClick={() => setCat(ALL)}
              style={{ borderColor: cat === ALL ? 'var(--accent)' : 'var(--border)', color: cat === ALL ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e="✨"/> 전체
            </button>
            {CATS.map((c) => {
              const on = cat === c.key
              return (
                <button key={c.key} className="minibtn" aria-pressed={on} onClick={() => setCat(c.key)}
                  title={c.desc}
                  style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                  <Emoji e={c.icon}/> {c.label}
                </button>
              )
            })}
          </div>

          {/* 동작 줄 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 무작위 트릭</button>
            <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}종 표시</span>
          </div>

          {/* 무작위 강조 카드 */}
          {randomPick && (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={randomPick.cat.icon}/> {randomPick.cat.label}</span>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{randomPick.item.name}</span>
                <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandomPick(null)}>✕</button>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>{randomPick.item.def}</div>
            </div>
          )}

          {/* 토스트 */}
          {toast && (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5 }}>✓ {toast}</div>
          )}

          {/* 목록(펼침) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>검색 결과가 없습니다. 다른 말로 찾아보세요.</div>
            ) : filtered.map(({ cat: c, item }) => {
              const k = itemKey(c.key, item.name)
              const open = openKey === k
              const cid = 'item:' + k
              return (
                <div key={k} style={card}>
                  <button onClick={() => setOpenKey(open ? null : k)}
                    style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: 8, width: '100%' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon}/> {c.label}</span>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>{open ? '▲' : '▼'}</span>
                  </button>
                  <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 5 }}>{item.def}</div>

                  {open && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 3 }}><Emoji e="📖"/> 고전 사례 유형</div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6 }}>
                          {item.classics.map((x, i) => (
                            <li key={i} onClick={() => copy(x, cid + ':c' + i)} title="클릭하여 복사" style={{ cursor: 'pointer' }}>
                              {x}{copied === cid + ':c' + i ? <span style={{ color: 'var(--accent)', marginLeft: 6 }}>✓</span> : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 3 }}><Emoji e="🌀"/> 비틀기 제안</div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6 }}>
                          {item.twists.map((x, i) => (
                            <li key={i} onClick={() => copy(x, cid + ':t' + i)} title="클릭하여 복사" style={{ cursor: 'pointer' }}>
                              {x}{copied === cid + ':t' + i ? <span style={{ color: 'var(--accent)', marginLeft: 6 }}>✓</span> : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="minibtn" onClick={() => copy(trickPlain({ cat: c, item }), cid)}>
                          {copied === cid ? <>✓ 복사됨</> : <><Emoji e="📋"/> 전체 복사</>}
                        </button>
                        <button className="minibtn" onClick={() => saveTrickSnippet({ cat: c, item })}><Emoji e="💾"/> 글감 저장</button>
                      </div>
                      {/* 연계 */}
                      <div className="linkbar">
                        <span className="linkbar-label">연계:</span>
                        <button className="linkbtn" disabled={!hasProjectBridge()}
                          title={hasProjectBridge() ? '이 트릭을 자료 〈트릭 노트〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}
                          onClick={() => addTrickToProject({ cat: c, item })}>
                          <Emoji e="📄"/> 프로젝트에 추가
                        </button>
                        <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck')} title="반전 카드덱 열기"><Emoji e="🃏"/> 반전 카드덱</button>
                        <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid')} title="플롯 피라미드 열기"><Emoji e="⛰️"/> 플롯 피라미드</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ───────────── 비틀기 제안 생성기 탭 ───────────── */}
      {tab === 'gen' && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={reroll}><Emoji e="🎲"/> 전체 재생성</button>
            <span style={{ ...hint, marginLeft: 'auto' }}>가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmt(COMBO)}</b>가지 ({COMBO.toLocaleString('ko-KR')})</span>
          </div>

          {/* 슬롯들 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {seedFields.map(({ slot, value }) => {
              const locked = !!locks[slot.key]
              return (
                <div key={slot.key} style={{ ...card, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', width: 76, flexShrink: 0 }}><Emoji e={slot.icon}/> {slot.label}</span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                    title="클릭하여 복사" onClick={() => copy(value, 'slot:' + slot.key)}>
                    {value}{copied === 'slot:' + slot.key ? <span style={{ color: 'var(--accent)', marginLeft: 6 }}>✓</span> : null}
                  </span>
                  <button className="minibtn" title="이 슬롯만 재생성" onClick={() => rerollOne(slot.key)} disabled={locked}><Emoji e="🎲"/></button>
                  <button className="minibtn" aria-pressed={locked} title={locked ? '잠금 해제' : '잠금(재생성 시 고정)'}
                    onClick={() => toggleLock(slot.key)}
                    style={{ borderColor: locked ? 'var(--accent)' : 'var(--border)' }}>
                    {locked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 한 줄 시드 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 5 }}><Emoji e="🧩"/> 비틀기 시드</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.65 }}>{seedSentence}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <button className="minibtn" onClick={() => copy(seedPlain(), 'seed')}>{copied === 'seed' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
              <button className="minibtn" onClick={saveSeedSnippet}><Emoji e="💾"/> 글감 저장</button>
            </div>
            {/* 연계 */}
            <div className="linkbar" style={{ marginTop: 8 }}>
              <span className="linkbar-label">연계:</span>
              <button className="linkbtn" disabled={!hasProjectBridge()}
                title={hasProjectBridge() ? '이 시드를 자료 〈트릭 노트〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}
                onClick={addSeedToProject}>
                <Emoji e="📄"/> 프로젝트에 추가
              </button>
              <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck')} title="반전 카드덱 열기"><Emoji e="🃏"/> 반전 카드덱</button>
              <button className="linkbtn" onClick={() => openToolLinked('conflict-builder')} title="갈등 빌더 열기"><Emoji e="⚔️"/> 갈등 빌더</button>
            </div>
          </div>

          {/* 토스트(생성기에서도 표시) */}
          {toast && (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5 }}>✓ {toast}</div>
          )}

          <div style={hint}>슬롯을 <Emoji e="🔒"/> 잠그고 나머지만 재생성하며 마음에 드는 조합을 찾으세요. 시드는 정답이 아니라 트릭 설계의 출발점입니다.</div>
        </>
      )}
    </div>
  )
}
