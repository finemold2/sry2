// 호러·공포 서사 장치·전개법 사전 — 공포 장르 고유의 서사 장치와 전개/구조 패턴·페이싱·클라이맥스 관습을 모은 로컬 사전.
//  각 항목: 정의 + 사용법 + 예시 + 비틀기(클리셰 변주). 카테고리 펼침 + 검색 + 무작위 + 클릭복사 + 즐겨찾기.
//  자급식: 외부 네트워크·라이브러리 없음. react 와 './linkbus' 만 사용. (Math.random + localStorage 만 쓴다.)
//  연계(linkbus): 현재 항목을 자료('research')〈서사 장치〉 폴더 메모로 추가, 글감을 공유 라이브러리(snippets)에 저장, 관련 도구 열기.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji,
} from './linkbus'

export const meta = {
  id: 'horror-devices',
  name: '호러·공포 서사 장치·전개법 사전',
  icon: '🕯️',
  group: '장치·전개',
  genre: '호러·공포',
  intro: '드레드·언캐니·오프스크린·신뢰불가 화자… 공포 고유의 서사 장치와 전개·페이싱·클라이맥스 관습을 정의·사용법·예시·비틀기로',
  w: 680,
  h: 680,
}

// ── 데이터 모델 ─────────────────────────────────────────────
interface Device {
  name: string        // 장치/관습 이름
  en?: string         // 원어(영문 술어) — 있으면
  def: string         // 정의 — 이 장치가 무엇이며 독자가 무엇을 기대하는가
  use: string         // 사용법 — 어디에·어떻게 배치하면 효과적인가
  ex: string          // 예시 — 구체적 장면 한 컷
  twist: string       // 비틀기 — 진부함을 피하는 변주
  tags?: string[]     // 검색 보조 태그
}
interface CatDef { key: string; label: string; icon: string; note: string; items: Device[] }

// ── 호러·공포 서사 장치·전개법 데이터(도시에 근거, 장르 특화) ──────
const CATS: CatDef[] = [
  {
    key: 'dread', label: '분위기·드레드', icon: '🌫️',
    note: '공포 ≠ 사건, 공포 = 기다림. 사건 전에 "곧 무언가 온다"는 예감을 길게 끄는 것이 핵심.',
    items: [
      {
        name: '드레드의 축적', en: 'Dread / Slow Burn',
        def: '사건 자체보다 "곧 무언가 일어난다"는 예감을 길게 끄는 장치. 정적·침묵·일상의 미세한 어긋남으로 불안을 쌓는다. 셜리 잭슨식 힐 하우스의 본령.',
        use: '전반부의 주력 엔진. 충격을 아끼고, 보일러 소리·시계 초침·먼 발소리 같은 \'설명 가능한\' 소음만 깔아 독자만 불안하게 만든다.',
        ex: '아무 일도 없다. 다만 복도 끝 문이 어제는 닫혀 있었고, 오늘은 한 뼘 열려 있다. 누구도 그 얘기를 꺼내지 않는다.',
        twist: '끝내 아무 일도 일어나지 않게 한다 — 기다림 자체가 인물을 미치게 만들고, 독자는 \'무엇을 기다렸는지\'조차 모른 채 끝나는 존재론적 불안.',
        tags: ['슬로우번', '예감', '정적', '침묵', '빌드업'],
      },
      {
        name: '공간의 인격화', en: 'The House as Antagonist',
        def: '집·호텔·숲 자체가 적대적 의지를 가진 존재가 되는 장치. 『샤이닝』의 오버룩 호텔, 힐 하우스처럼 건물이 살아 인물을 잠식한다.',
        use: '귀신 들린 집물(haunted house)의 토대. 공간의 과거(살인·자살·매장)를 공포의 근원으로 깔고, 방의 배치가 미묘하게 바뀌게 한다.',
        ex: '같은 복도를 세 번째 걷는데, 분명 끝에 있던 계단이 사라지고 벽뿐이다. 집이 그를 가두려 한다.',
        twist: '집이 적이 아니라 \'보호자\'였다 — 집은 더 끔찍한 바깥의 무언가로부터 인물을 가둬 지키고 있었음이 마지막에 드러난다.',
        tags: ['귀신들린집', '오버룩', '힐하우스', '저택', '공간'],
      },
      {
        name: '오염된 일상', en: 'The Uncanny Normal',
        def: '안전해야 할 일상의 공간·관계가 미세하게 오염되는 장치. 큰 사건 없이 \'평범함\'이 점점 잘못 느껴지게 만든다.',
        use: '1막에서 \'정상\'을 충분히 각인시킨 뒤, 그 정상을 한 올씩 비틀어 잃을 것을 만든다. 변화는 독자가 알아챌까 말까 한 수준으로.',
        ex: '엄마가 끓인 된장찌개 맛이 어제와 똑같은데, 어딘가 다르다. 가족 모두 평소처럼 웃는데 그 웃음이 0.5초 늦다.',
        twist: '오염을 느끼는 주인공이야말로 오염원이다 — 잘못된 건 세상이 아니라 자신의 인지였음을 천천히 폭로한다.',
        tags: ['일상', '언캐니', '오염', '미세변화', '가족'],
      },
      {
        name: '감각 어휘의 누적', en: 'Sensory Dread',
        def: '피비린내·곰팡내·삐걱임·등골의 한기 같은 다감각 어휘를 누적해 분위기를 \'체감\'시키는 장치. 정보가 아니라 감각으로 공포를 깐다.',
        use: '서술 톤을 정할 때. 시각(그림자·실루엣)에만 의존하지 말고 후각(썩은내·향냄새)·체감(공기가 차가워짐)을 섞어 입체적으로.',
        ex: '방 안의 공기가 한순간 무거워지고 차가워진다. 누군가 보고 있는 느낌, 그리고 어디선가 향(線香) 타는 냄새.',
        twist: '감각을 의도적으로 박탈한다 — 아무 냄새도, 소리도, 온도도 없는 \'완벽한 무\'의 방이 오히려 가장 견딜 수 없게 한다.',
        tags: ['후각', '체감', '곰팡내', '한기', '오감'],
      },
      {
        name: '날씨·정전의 동기화', en: 'Pathetic Fallacy',
        def: '폭풍우·정전·안개가 사건과 동시에 발생해 외부와의 단절과 불길함을 동시에 조이는 고전 장치.',
        use: '고립과 분위기를 한 번에 해결할 때. 다만 너무 정직하면 클리셰이므로, 맑은 대낮의 공포(역설적 밝음)와 번갈아 쓴다.',
        ex: '천둥이 치는 순간 집 안의 모든 불이 꺼지고, 다시 번개가 칠 때 창밖에 서 있던 형체가 한 걸음 가까워져 있다.',
        twist: '화창한 정오·환한 형광등 아래에서 가장 끔찍한 일이 벌어지게 한다 — \'어둠=공포\'의 기대를 배반하는 미드소마식 백색 공포.',
        tags: ['폭풍우', '정전', '안개', '날씨', '백색공포'],
      },
      {
        name: '경고하는 문지기', en: 'The Ominous Warning',
        def: '"이 마을엔 오면 안 됐어"라고 경고하는 노인·주유소 직원·여관 주인. 위험의 문턱에서 \'돌아갈 수 있는 마지막 기회\'를 제시하는 장치.',
        use: '독자에게 위험의 규모를 미리 \'예고\'하면서, 인물이 그것을 무시하는 선택으로 비극에 정당성을 줄 때.',
        ex: '기름을 넣어주던 노인이 룸미러 너머로 그들을 본다. "그 길로 가면… 해 지기 전엔 돌아 나오는 게 좋을 거요." 그러곤 입을 닫는다.',
        twist: '경고자가 사실 \'미끼\'다 — 그 음산한 경고 자체가 호기심을 부추겨 제물을 끌어들이는, 공동체가 짜둔 덫의 첫 단추이게 한다.',
        tags: ['경고', '노인', '문지기', '주유소', '예고'],
      },
    ],
  },
  {
    key: 'uncanny', label: '언캐니·낯섦', icon: '🪆',
    note: '두려운 낯섦(Uncanny) — 익숙한 것이 미세하게 잘못된 상태. 프로이트적 공포의 핵심.',
    items: [
      {
        name: '언캐니(두려운 낯섦)', en: 'The Uncanny',
        def: '익숙한 것이 \'아주 조금\' 잘못된 상태. 똑같이 생겼지만 표정 없는 가족, 미소가 늦는 사람, 늘 같은 자리에 선 인형. 정상과 이상의 경계에서 가장 오싹하다.',
        use: '괴물을 보여주지 않고도 공포를 만들 때. 99%가 정상이고 1%만 어긋나게 — 그 1%를 독자가 \'발견\'하게 두면 효과가 배가된다.',
        ex: '딸이 평소처럼 인사한다. 다 똑같다. 다만 눈을 깜빡이지 않는다. 대화 내내, 단 한 번도.',
        twist: '어긋남이 \'더 나아진\' 방향이게 한다 — 죽은 아들이 돌아왔는데 생전보다 더 다정하고 완벽해서, 그 완벽함이 가장 무섭게.',
        tags: ['언캐니', '인형', '도플갱어', '표정', '낯섦'],
      },
      {
        name: '거울·반사면의 배신', en: 'The Mirror',
        def: '거울 속의 내가 다르게 움직이거나, 등 뒤에 무언가가 비치는 장치. 안전한 \'반사\'를 위협의 창구로 뒤집는다.',
        use: '잘못된 안도 직후의 충격으로. 거울뿐 아니라 창유리·검은 TV화면·물웅덩이·숟가락 같은 모든 반사면을 활용한다.',
        ex: '세수를 하고 고개를 든다. 거울 속 내가 0.5초 늦게 고개를 든다. 그리고 한 박자 더 늦게, 웃는다.',
        twist: '거울 속이 진짜고 \'이쪽\'이 가짜다 — 주인공은 줄곧 반사상(像)이었고, 거울 너머의 자기 자신이 그를 지우려 한다.',
        tags: ['거울', '반사', '도플갱어', '창유리', '배신'],
      },
      {
        name: '아이·인형·광대', en: 'The Creepy Child',
        def: '순수의 상징이어야 할 아이·인형·광대를 공포의 매개로 쓰는 장치. 동요·보이지 않는 친구·텅 빈 눈으로 안전 기대를 전복한다.',
        use: '\'보호해야 할 약자\'가 위협이 되는 역설을 만들 때. 아이의 무심한 한마디("그 아저씨가 또 왔어")로 오싹함을 심는다.',
        ex: '다섯 살 아이가 빈 의자를 향해 웃으며 말한다. "엄마, 저 할머니가 내 방에서 자도 되냬." 집엔 할머니가 없다.',
        twist: '아이는 정말 순수하고, 진짜 괴물은 그 순수를 \'증거\'로 몰아 아이를 학대하는 어른들이다 — 초자연을 빌미로 한 인간의 잔혹.',
        tags: ['아이', '인형', '광대', '동요', '보이지않는친구'],
      },
      {
        name: '동물의 선(先)반응', en: 'The Animal Knows',
        def: '개·고양이가 사람보다 먼저 위험을 감지해 으르렁대거나 사라지는 장치. 인간의 인지 너머를 \'동물의 눈\'으로 암시한다.',
        use: '초자연의 존재를 직접 보여주지 않고 \'예고\'할 때. 동물의 이상 반응 → 인물의 불신 → 뒤늦은 확인의 순서로 긴장을 끈다.',
        ex: '늘 현관에서 반기던 개가 어느 날 2층 빈방 앞에서 털을 세우고 으르렁댄다. 텅 빈 방을 향해, 며칠째.',
        twist: '동물이 두려워한 건 괴물이 아니라 주인이다 — 빙의·변질된 주인공을 동물만이 알아보고 곁을 떠난 것.',
        tags: ['개', '고양이', '예감', '동물', '경고'],
      },
      {
        name: '시간·기억의 왜곡', en: 'Loop & Lost Time',
        def: '같은 일이 반복되거나(루프), 시간이 흐르지 않거나, 기억이 지워지는 인지적 불안 장치. 인물의 인식 토대를 흔든다.',
        use: '\'내가 미친 건가\'의 의심을 키울 때. 시계·달력·전화 기록 같은 객관 지표가 서로 모순되게 배치한다.',
        ex: '벽시계는 3시 17분에 멈춰 있고, 휴대폰은 사흘째 화요일이다. 분명 어제도 오늘이 화요일이었다.',
        twist: '루프가 \'탈출\'을 위한 것이 아니라, 인물을 한 시점에 영원히 가두기 위한 누군가의 자비/형벌이게 한다.',
        tags: ['루프', '시간왜곡', '기억상실', '반복', '인지'],
      },
      {
        name: '미소가 늦는 사람', en: 'The Wrong Reaction',
        def: '겉은 정상이나 반응의 \'타이밍·결\'이 어긋난 인물 — 미소가 0.5초 늦고, 슬픈 소식에 먼저 웃고, 통증에 무반응. 도플갱어·빙의·바꿔치기의 전조.',
        use: '\'가족이 가족 같지 않다\'는 의심을 키울 때. 큰 사건 없이 대화·식사 같은 일상에서 \'반응의 오차\'만으로 오싹함을 깐다.',
        ex: '아끼던 개가 죽었다고 말하자, 동생은 잠깐 멈칫하더니 — \'슬퍼해야 한다\'는 걸 떠올린 듯 — 뒤늦게 표정을 짓는다.',
        twist: '\'잘못된 반응\'을 하는 쪽이 사실 주인공이게 한다 — 어긋난 건 가족이 아니라, 이미 무언가로 바뀐 자기 자신임을 독자만 눈치채게.',
        tags: ['반응지연', '도플갱어', '빙의', '미소', '타이밍'],
      },
    ],
  },
  {
    key: 'unseen', label: '보이지 않는 것', icon: '👁️',
    note: '상상이 묘사보다 무섭다(러브크래프트 원칙). 괴물을 끝까지 안 보여주거나 일부만 보여준다.',
    items: [
      {
        name: '오프스크린 호러', en: 'Off-screen Horror',
        def: '괴물을 끝까지 보여주지 않거나 일부(그림자·발소리·문틈)만 보여주는 장치. 독자의 상상이 어떤 묘사보다 무섭다는 원칙.',
        use: '예산(언어)이 가장 적게 들면서 효과가 가장 큰 장치. 보여줄수록 무서움이 줄어드니, 결정적 순간까지 \'아낀다\'.',
        ex: '문틈으로 보이는 건 길게 늘어진 손가락 끝뿐. 나머지는 어둠. 그것이 무엇인지는 끝내 묘사되지 않는다.',
        twist: '마침내 전모를 보여주는데, 그것이 \'아무것도 아닌\' 평범한 것이게 한다 — 진짜 공포는 그걸 괴물로 만든 인물의 광기였음을.',
        tags: ['오프스크린', '러브크래프트', '암시', '그림자', '문틈'],
      },
      {
        name: '우주적 공포', en: 'Cosmic Horror',
        def: '인간의 이해를 넘어선 존재 앞의 절대적 무력함. 알 수 없는 것·이해 불가한 것에 대한 공포. 러브크래프트·크툴루 신화의 핵심.',
        use: '\'퇴치 가능한 괴물\'이 주는 안도를 거부할 때. 규모와 무관심(인류는 그것에게 먼지)을 강조해 존재론적 절망을 만든다.',
        ex: '학자는 그것의 일부를 \'이해\'한 대가로 미쳐 버린다. 그것은 그를 미워하지도 않는다. 그저 우리를 인지조차 못 한다.',
        twist: '인간이 그 거대한 존재의 \'꿈\' 혹은 \'세포\'에 불과하다는 설정 — 적과 싸우는 게 아니라 자기 존재의 무의미를 마주하게.',
        tags: ['우주적공포', '크툴루', '러브크래프트', '무력감', '광기'],
      },
      {
        name: '목격의 비대칭', en: 'No One Believes Me',
        def: '주인공만 그것을 본다 → 아무도 안 믿어준다 → 고립이 심화되는 사회적 무력화 장치. 신뢰받지 못하는 주인공의 절망.',
        use: '초자연의 공포에 사회적 공포를 더할 때. 주변의 합리적 설명("스트레스야", "꿈이었겠지")이 인물을 더 고립시킨다.',
        ex: '"또 시작이네." 남편의 한숨. 의사는 약을 늘리자고 한다. 오직 그녀만이 매일 밤 천장에서 기어다니는 그것을 본다.',
        twist: '주변 사람들도 \'다 보고 있었다\' — 모두가 알면서 침묵하는 공모(共謀)였고, 미친 척한 건 그들이라는 포크 호러식 반전.',
        tags: ['불신', '고립', '목격', '가스라이팅', '공모'],
      },
      {
        name: '금지된 지식의 처벌', en: 'Forbidden Knowledge',
        def: '열지 말라는 문, 읽지 말라는 책, 가지 말라는 방. \'알아버린 자\'가 파멸하는 판도라 구조. 호기심이 곧 죄가 된다.',
        use: '인물을 위험으로 끌고 가는 동력으로. 금기에는 반드시 \'그럴듯한 유혹\'(진실·구원·재물)을 붙여 호기심을 정당화한다.',
        ex: '"이 페이지부터는 절대 읽지 마라"는 경고가 적힌 일기. 물론 그는 다음 장을 넘긴다. 그리고 그것이 그를 \'읽기\' 시작한다.',
        twist: '금지된 지식이 사실은 \'유일한 구원의 방법\'이게 한다 — 경고를 따른 \'착한\' 인물이 무지로 인해 먼저 죽는 역설.',
        tags: ['금기', '판도라', '금서', '호기심', '처벌'],
      },
      {
        name: '신뢰할 수 없는 화자', en: 'Unreliable Narrator',
        def: '화자가 미쳤는지, 거짓말하는지, 이미 죽었는지 모르게 하는 장치. 독자의 인식 토대 자체를 흔들어 \'무엇이 진짜인가\'를 무너뜨린다.',
        use: '심리 호러의 척추. 화자의 진술과 객관 단서를 미세하게 어긋나게 깔아, 독자가 스스로 의심하게 만든다.',
        ex: '나는 분명 문을 잠갔다. 매일 밤. 그런데 아침마다 문은 열려 있다. …정말 내가 잠갔던가?',
        twist: '화자가 이미 죽어 있었다 / 괴물이 화자 자신이었다 — 마지막 페이지에서 독자가 읽어온 모든 것을 재해석하게 만드는 반전.',
        tags: ['신뢰불가', '화자', '광기', '반전', '심리'],
      },
      {
        name: '초자연이냐 정신병이냐', en: 'Ambiguity of the Supernatural',
        def: '귀신인지 망상인지, 저주인지 정신질환인지를 끝까지 모호하게 유지하는 장치. 둘 다로 읽히게 단서를 양쪽에 깔아 불확실성을 길게 끈다.',
        use: '심리 호러의 핵심 긴장. 초자연 증거와 \'합리적 설명\'(약·스트레스·트라우마)을 정확히 균형 맞춰, 독자가 한쪽으로 못 기울게 한다.',
        ex: '그녀가 본 그림자는 정말 있었을까. 약을 끊은 날부터 시작됐고, 약을 먹으면 잦아든다. 그러나 약을 먹은 어젯밤에도, 그것은 거기 있었다.',
        twist: '\'둘 다 정답\'이게 한다 — 정신병이 진짜 문을 열었거나, 약이 그것을 \'보이지 않게\' 했을 뿐 사라지게 한 건 아니었음을.',
        tags: ['모호성', '망상', '정신질환', '불확실성', '초자연'],
      },
    ],
  },
  {
    key: 'rules', label: '규칙·저주·전염', icon: '📜',
    note: '괴물·저주에는 작동 규칙이 있고("이름을 부르면 안 된다"), 독자는 그 규칙을 파악하며 긴장한다.',
    items: [
      {
        name: '규칙의 존재와 위반', en: 'The Rules of the Curse',
        def: '괴물·저주에 명확한 작동 규칙이 있는 장치("밤에 나온다", "뒤돌아보면 안 된다", "이름을 부르지 마라"). 규칙 파악 = 긴장, 위반 = 처벌.',
        use: '독자에게 \'생존 게임\'을 제시할 때. 규칙을 초중반에 분명히 심고, 클라이맥스에서 위반/역이용하게 한다.',
        ex: '이 집의 규칙은 셋. 밤 12시 이후 거울을 보지 말 것, 노크에 답하지 말 것, 그리고 — 절대 숫자를 세지 말 것.',
        twist: '규칙이 거짓이었다 / 지킬수록 함정에 빠진다 — 규칙을 알려준 자가 가해자였고, \'위반\'이야말로 유일한 탈출구였음을.',
        tags: ['규칙', '저주', '금기', '위반', '생존게임'],
      },
      {
        name: '저주의 전염 구조', en: 'The Curse Spreads',
        def: '저주가 사람에서 사람으로 옮겨가는 룰(『링』의 복사 전파). \'탈출구가 있는가\'의 게임을 독자에게 던진다.',
        use: '"넘기면 산다, 하지만 누군가는 죽는다"의 도덕적 딜레마를 만들 때. 전염의 조건·기한을 명확히 규정한다.',
        ex: '이 영상을 본 자는 이레 뒤 죽는다. 살려면 다른 누군가에게 보여 \'넘기는\' 수밖에 없다. 나는 누구에게 보일 것인가.',
        twist: '저주를 \'넘기지 않고\' 끊어내려는 인물의 자기희생이, 오히려 저주를 \'완성\'시켜 더 큰 재앙을 부르게 한다.',
        tags: ['전염', '저주', '링', '복사', '딜레마'],
      },
      {
        name: '카운트다운·타임리밋', en: 'The Countdown',
        def: '"7일 후", "해가 뜨기 전까지", "13번째 종이 울리면" 같은 시한으로 긴장을 조이는 장치. 시계가 적이 된다.',
        use: '느슨해질 수 있는 중후반에 가속 페달로. 시한이 가까워질수록 사건 간격을 좁혀 숨 쉴 틈을 줄인다.',
        ex: '벽에 손톱으로 그어진 작대기 여섯 개. 매일 아침 하나씩 늘어 있다. 일곱 번째가 그어지는 날, 그것이 온다.',
        twist: '시한이 끝나도 \'아무 일\'이 없게 한다 — 진짜 공포는 그 7일간 인물이 스스로를 무너뜨리며 한 짓들이었음을.',
        tags: ['카운트다운', '시한', '데드라인', '7일', '종'],
      },
      {
        name: '물건·매체를 통한 침투', en: 'Haunted Media',
        def: '거울·사진·비디오·인형·전화·라디오 잡음·낡은 일기 등 \'안전한 일상 사물\'을 위협의 매개로 쓰는 장치.',
        use: '독자의 현실로 공포를 확장할 때(나도 가진 물건). 매체의 \'노이즈\'(정전기·잡음·필름 결함)를 침투의 징조로.',
        ex: '오래된 가족사진. 볼 때마다 구석에 선 인물이 한 발씩 가까워진다. 어제는 문가, 오늘은 식탁 옆.',
        twist: '매개가 \'침투구\'가 아니라 \'봉인\'이었다 — 사진을 태우자 그 안에 갇혀 있던 것이 비로소 풀려나오게 한다.',
        tags: ['사진', '비디오', '전화', '라디오', '매체'],
      },
      {
        name: '계약·거래의 대가', en: 'The Faustian Bargain',
        def: '소원·구원·힘을 얻는 대신 끔찍한 대가를 치르는 계약 장치. 사이비·흑마술·악마와의 거래가 전형.',
        use: '인물의 욕망(병든 가족·복수·가난)을 위험으로 끌고 갈 때. 대가는 \'작아 보이지만 치명적\'이게 설계한다.',
        ex: '"딸을 살려드리죠. 대가는 당신의 \'가장 행복했던 기억\' 하나뿐입니다." 그는 망설임 없이 서명한다.',
        twist: '대가가 \'이미\' 치러졌음을 뒤늦게 깨닫게 한다 — 계약은 과거에 맺어졌고, 지금의 비극이 그 청구서였음을.',
        tags: ['계약', '악마', '대가', '소원', '흑마술'],
      },
      {
        name: '엑소시즘·의식의 절차', en: 'The Ritual',
        def: '빙의·저주를 푸는 데 정해진 절차·도구·주문이 필요한 장치. 성수·소금·이름·기도문의 \'순서\'가 곧 규칙이고, 한 단계라도 어기면 역효과가 난다.',
        use: '오컬트 호러의 클라이맥스 설계에. 의식을 \'성공해야 하는 시험\'으로 만들어, 절차의 실패·중단 가능성으로 긴장을 조인다.',
        ex: '신부가 떨리는 목소리로 마지막 구절을 읽는다. 촛불 하나가 꺼지면 처음부터 다시. …일곱 개 중 여섯 번째가, 방금 흔들렸다.',
        twist: '의식이 \'쫓아내는\' 게 아니라 \'불러들이는\' 절차였게 한다 — 구원인 줄 알고 행한 모든 단계가 봉인을 푸는 열쇠였음을.',
        tags: ['엑소시즘', '의식', '절차', '성수', '오컬트'],
      },
    ],
  },
  {
    key: 'isolation', label: '고립·신체의 배신', icon: '🩸',
    note: '외부 도움 차단으로 무력화, 또는 내 몸 자체가 적이 되는 자아 상실의 공포.',
    items: [
      {
        name: '격리·고립의 장치', en: 'Isolation',
        def: '통신 두절(휴대폰 안 터짐·정전)·폭설·외딴 섬·산장·우주선으로 외부 도움을 차단하는 장치. 탈출 불가가 핵심.',
        use: '괴물과 인물을 한 \'상자\' 안에 가둘 때. 고립의 이유를 합리적으로 깔되(폭설로 길 끊김), 차츰 그것이 \'우연이 아님\'을 암시한다.',
        ex: '눈보라에 길이 끊기고, 산장의 유선 전화는 죽어 있다. 휴대폰은 \'서비스 안 됨\'. 도와줄 사람은 100km 밖에.',
        twist: '고립이 \'밖\'이 아니라 \'안\'에서 만들어졌다 — 일행 중 누군가가 의도적으로 길을 끊고 통신을 죽였음을 드러낸다.',
        tags: ['고립', '산장', '폭설', '통신두절', '외딴섬'],
      },
      {
        name: '신체의 배신', en: 'Body Horror',
        def: '내 몸이 변하거나 통제되지 않는 공포 — 감염·빙의·기생·변형. 가장 가까운 \'나 자신\'이 가장 낯선 적이 되는 자아 상실.',
        use: '바디 호러·감염물의 핵심. 변화를 단계적으로(작은 발진 → 통제 불능 → 정체성 붕괴) 보여 점층적 혐오를 쌓는다.',
        ex: '손등의 작은 멍이 사흘 만에 \'움직이기\' 시작한다. 거울 앞에서, 그의 손가락이 그의 뜻과 다르게 까딱인다.',
        twist: '변형이 \'더 나은 존재\'로의 진화이게 한다 — 인간성을 잃는 게 상실이 아니라 \'각성\'으로 그려져, 혐오와 매혹을 동시에.',
        tags: ['바디호러', '감염', '빙의', '기생', '변형'],
      },
      {
        name: '안전지대의 침범', en: 'Home Invasion',
        def: '가장 안전해야 할 곳(내 집·내 방·내 침대)이 침범당하는 장치. 보편 금기를 건드려 가장 강한 반응을 끌어낸다.',
        use: '독자의 \'안전 감각\'을 직접 겨눌 때. 외부의 괴물이 마침내 \'안\'으로 들어오는 순간을 중대한 전환점으로.',
        ex: '잠결에 침대 밑에서 누군가 돌아눕는 소리. 그리고 매트리스가, 아래에서 천천히, 위로 밀려 올라온다.',
        twist: '\'그것\'은 침입한 적이 없다 — 처음부터 집의 일부였고, 침입자는 오히려 나중에 이사 온 인물 가족임을 뒤집는다.',
        tags: ['홈인베이전', '침범', '침대밑', '안전지대', '금기'],
      },
      {
        name: '아포칼립스·생존', en: 'Survival Horror',
        def: '좀비·감염 확산으로 세계 자체가 무너지는 가운데 살아남기를 다투는 장치. 괴물보다 \'다른 생존자\'가 더 무서워진다.',
        use: '공포에 사회·윤리 붕괴를 겹칠 때. 자원·신뢰·도덕이 바닥나며 인간이 인간에게 가하는 공포로 무게중심을 옮긴다.',
        ex: '감염자보다 무서운 건 옆집 가장이었다. 그는 자기 가족의 백신을 위해 우리 아이를 미끼로 내밀었다.',
        twist: '진짜 괴물은 \'면역자\'인 주인공이게 한다 — 그가 가는 곳마다 보균을 퍼뜨리는, 자신도 모르는 전파자였음을.',
        tags: ['좀비', '감염', '아포칼립스', '생존', '인간성'],
      },
      {
        name: '포크 호러의 공동체', en: 'Folk Horror',
        def: '외부인을 적대하는 고립된 시골 공동체와 그들의 비밀 풍습·이교 의식·인신공양. \'친절함이 더 무서운\' 마을.',
        use: '개인 대 공동체의 압도적 비대칭을 만들 때. 처음의 환대를 점차 \'사육·제물 준비\'로 재해석되게 깐다.',
        ex: '마을 사람들은 더없이 친절하다. 매 끼니를 차려주고, 가장 좋은 방을 내준다. 다만, 떠나려 할 때마다 길을 막을 뿐.',
        twist: '\'미개한 마을\'이 사실 옳았다 — 그들의 끔찍한 풍습이 정말로 더 큰 재앙을 막아왔고, 외부인의 \'합리\'가 봉인을 깬다.',
        tags: ['포크호러', '마을', '이교', '인신공양', '위커맨'],
      },
      {
        name: '혼자 떨어지는 인물', en: 'Splitting Up',
        def: '"잠깐 나갔다 올게" 하고 무리에서 혼자 떨어지는 인물 → 사망. 고립을 \'개인 단위\'로 쪼개 한 명씩 무력화하는 슬래셔·크리처물의 기본 장치.',
        use: '사상자를 \'논리적으로\' 내기 위해. 떨어지는 이유를 합당하게(연락·구조요청·물 뜨러) 깔되, 그 합리가 곧 함정이 되게 한다.',
        ex: '"신호 잡히는 데까지만 갔다 올게." 손전등 불빛이 나무들 사이로 멀어진다. 잠시 뒤, 불빛만 땅에 떨어진 채 흔들린다.',
        twist: '\'떨어진\' 자가 유일한 생존자가 되게 한다 — 함께 뭉쳐 안전하다 믿은 무리가 한꺼번에 당하고, 혼자였던 자만 살아남는 역전.',
        tags: ['분리', '슬래셔', '고립', '사상자', '혼자'],
      },
    ],
  },
  {
    key: 'pacing', label: '페이싱·스케어', icon: '⚡',
    note: '긴장-이완의 파동. 계속 무섭기만 하면 마비된다. 고요는 폭풍의 전조.',
    items: [
      {
        name: '잘못된 안도', en: 'False Scare / Jump Scare',
        def: '위협인 줄 알았던 게 고양이·친구였다 → 안심한 직후 진짜 공격. 긴장-이완-충격의 기본 호흡. 페이크 후의 진짜 한 방.',
        use: '스케어의 리듬을 만들 때. 가짜 놀람으로 독자의 경계를 \'한 번\' 풀어준 직후를 진짜 충격의 타이밍으로 잡는다.',
        ex: '벽장 안에서 무언가 부스럭. 떨리는 손으로 문을 연다 — 고양이다. 안도의 한숨. 그때, 등 뒤에서.',
        twist: '가짜 놀람을 \'세 번\' 연속 쓴 뒤 네 번째에도 가짜였다가, 독자가 완전히 방심한 한참 뒤 평온한 장면에서 친다.',
        tags: ['점프스케어', '페이크', '잘못된안도', '리듬', '충격'],
      },
      {
        name: '긴장-이완의 파동', en: 'The Rollercoaster',
        def: '조용한 구간(인물 교감·일상·유머)으로 숨을 줘야 다음 충격이 사는 페이싱 원칙. 계속 무서우면 둔감해진다.',
        use: '전체 구조를 설계할 때. 큰 충격 사이에 \'안전한\' 챕터를 의도적으로 끼워, 잃을 것(인물 정)을 키우고 호흡을 정돈한다.',
        ex: '간밤의 참극 다음 날, 일행은 햇살 아래 농담을 주고받는다. 독자는 웃다가도 안다 — 이 평화가 곧 끝나리란 걸.',
        twist: '\'안전한\' 휴식 챕터에서 가장 큰 비극이 터지게 한다 — 독자가 가장 방심하고 인물에게 정든 순간을 노린다.',
        tags: ['파동', '완급', '롤러코스터', '이완', '둔감화'],
      },
      {
        name: '저속 빌드업+가속 후반', en: 'Slow Start, Fast Finish',
        def: '전반부는 분위기로 천천히, 중반 이후 사건 간격을 좁히며 가속하는 페이싱. 후반부는 거의 쉴 틈 없이 몰아친다.',
        use: '장편 호러의 표준 곡선. 전반의 \'느림\'을 견디게 하려면, 작은 미스터리(이 집의 과거?)로 페이지를 넘기게 한다.',
        ex: '300페이지 중 200페이지는 \'이상한 낌새\'뿐이다. 그러나 한번 둑이 터지자, 마지막 100페이지는 쉼표가 없다.',
        twist: '곡선을 뒤집어 \'쾅\'으로 시작한 뒤 점점 조용해지게 한다 — 첫 충격의 정체를 캐 들어갈수록 더 깊은 정적의 공포로.',
        tags: ['빌드업', '가속', '곡선', '후반부', '페이싱'],
      },
      {
        name: '챕터 끝의 훅', en: 'Cliffhanger',
        def: '각 장 끝을 작은 충격·불길한 암시로 끊어 페이지를 넘기게 하는 장치. 웹소설형 호러에서 특히 핵심.',
        use: '연재·장편에서 이탈을 막을 때. 매 장 끝을 \'문이 열리는 소리\'·\'한 통의 전화\'·\'사라진 사람\'으로 닫는다.',
        ex: '그녀는 마침내 안도하며 침대에 누웠다. 그리고 베개 밑에서, 차갑고 축축한 무언가가 그녀의 손을 잡았다.',
        twist: '훅을 다음 장 첫 줄에서 \'시시하게\' 해소한 뒤(별것 아니었다), 바로 그 안도 위에 진짜 훅을 다시 건다.',
        tags: ['클리프행어', '훅', '챕터', '연재', '웹소설'],
      },
      {
        name: '스크롤 연출', en: 'Scroll Horror',
        def: '여백·줄바꿈으로 긴장과 점프스케어 타이밍을 제어하는 웹툰·웹소설 특화 장치(『옥수역 귀신』식). 독자의 \'넘기는\' 속도를 작가가 통제.',
        use: '디지털 연재에서 시각적 호흡을 만들 때. 긴 여백 뒤에 한 줄, 또는 한 줄씩 끊어 \'다음\'을 두렵게 만든다.',
        ex: '아무도 없었다.\n\n\n\n…정말 아무도 없었을까.\n\n\n뒤를 돌아본 순간.',
        twist: '여백으로 \'있을 것\'을 잔뜩 기대시킨 뒤 끝내 아무것도 안 주고, 그 빈 여백 자체를 공포의 잔상으로 남긴다.',
        tags: ['스크롤', '여백', '웹툰', '연재', '시각연출'],
      },
      {
        name: '스케어 밀도 조절', en: 'Scare Density',
        def: '잔잔한 챕터 → 중간 충격 → 가짜 안도 → 큰 충격으로 스케어의 \'강도\'를 계단처럼 변주하는 장치. 같은 강도의 반복은 둔감화를 부른다.',
        use: '둔감화를 막을 때. 충격마다 종류(시각/청각/심리)와 크기를 바꾸고, 가장 큰 한 방은 끝까지 아껴 \'정점\'을 단 한 번만 둔다.',
        ex: '소음(작게) → 그림자(중간) → 고양이 페이크(가짜) → 그리고 침묵이 길어진 한참 뒤, 가장 큰 한 방이 정적을 찢는다.',
        twist: '강도를 일부러 \'점점 약하게\' 떨어뜨린다 — 사건이 잦아들수록 독자의 경계가 풀리고, 그 무방비 위에 마지막 정점을 친다.',
        tags: ['밀도', '강도조절', '둔감화', '변주', '정점'],
      },
    ],
  },
  {
    key: 'structure', label: '전개·구조', icon: '🗺️',
    note: '전형적 5단: 일상→균열→상승→포위→대면. 잃을 것을 먼저 만들고, 합리적 설명을 점차 불가능하게.',
    items: [
      {
        name: '일상(The Normal)', en: 'Establish the Normal',
        def: '평범한 세계를 충분히 보여줘 \'잃을 것\'을 만드는 1단계. 인물·관계·공간을 정상 상태로 각인해 이후 붕괴의 낙차를 키운다.',
        use: '발단. 조급하게 공포로 뛰어들지 말고, 독자가 인물을 좋아하게 만들 시간을 준다(웹소설은 3화 내 첫 사건 필요).',
        ex: '이사 온 첫날, 가족은 새 집의 햇살에 들뜬다. 막내가 다락방을 차지하겠다고 떼를 쓴다. 평범하고, 행복하다.',
        twist: '\'정상\'이 처음부터 미세하게 잘못돼 있게 한다 — 첫 페이지부터 깔린 위화감을 독자만 느끼고 인물은 모르게.',
        tags: ['일상', '발단', '1막', '정상', '낙차'],
      },
      {
        name: '균열(The First Sign)', en: 'The First Sign',
        def: '작은 이상징후가 등장하는 2단계. 우연·착각·소음 수준으로, 합리적으로 설명 가능하게. 독자만 불안하다.',
        use: '첫 \'금\'을 그을 때. 인물이 무시할 만한 크기로(문이 열려 있다, 개가 짖는다), 그러나 독자는 기억하게 심는다.',
        ex: '밤마다 벽 안에서 긁는 소리. "쥐겠지." 가장은 쥐덫을 놓는다. 다음 날 아침, 쥐덫은 \'바깥에서\' 잠겨 있다.',
        twist: '첫 징후가 사실 \'마지막 경고\'였게 한다 — 그 작은 이상이 가장 친절한 도움이었고, 무시한 대가가 곧 닥치게.',
        tags: ['균열', '첫징후', '이상', '2단계', '복선'],
      },
      {
        name: '상승(Escalation)', en: 'Escalation',
        def: '사건이 잦아지고 강도가 세지는 3단계. 합리적 설명이 점점 불가능해지고, 인물이 조사를 시작하며 규칙을 발견한다.',
        use: '중반의 엔진. 사건마다 강도와 명확성을 한 단계씩 올리고, 인물이 \'능동적으로\' 진실을 파기 시작하게 한다.',
        ex: '소음 → 그림자 → 물건의 이동 → 마침내 가족 중 하나가 \'다른 목소리\'로 말한다. 더는 우연이라 할 수 없다.',
        twist: '상승을 멈추고 \'후퇴\'시킨다 — 갑자기 모든 현상이 사라져 인물이 안도하는 순간이, 가장 큰 포위의 서막이게.',
        tags: ['상승', '에스컬레이션', '조사', '규칙발견', '중반'],
      },
      {
        name: '포위(The Trap Closes)', en: 'The Trap Closes',
        def: '고립이 확정되고 안전지대가 붕괴하며 사상자가 나오는 4단계. 도망갈 곳이 없어지고, 괴물의 정체·기원이 드러난다.',
        use: '위기의 최고조. 탈출 시도를 \'한 번\' 실패시켜 절망을 각인하고, 그동안 아껴둔 진실(기원)을 이 지점에서 푼다.',
        ex: '차는 시동이 걸리지 않고, 도와주러 온 이웃은 문턱에서 살해당한다. 이제 이 집에서 나갈 방법은 없다.',
        twist: '\'정체가 드러나는\' 진실이 가짜 정보이게 한다 — 인물이 알아낸 괴물의 약점이 함정이라, 그 지식으로 더 깊이 빠진다.',
        tags: ['포위', '고립확정', '사상자', '기원', '4단계'],
      },
      {
        name: '정보의 적하(滴下)', en: 'Drip Feed',
        def: '괴물의 정체·규칙·기원을 한 번에 풀지 않고 조금씩 흘리는 장치. 미스터리가 곧 서사의 동력이 된다.',
        use: '독자를 끝까지 끌고 갈 때. \'한 조각\'을 풀 때마다 \'두 개의 새 의문\'을 열어, 정보가 늘수록 불안이 커지게 한다.',
        ex: '낡은 신문 기사 한 조각: 30년 전 이 집에서 일가족이. …기사 끝이 찢겨 \'몇 명이, 왜\'는 알 수 없다.',
        twist: '적하해 온 정보가 전부 한 사람의 거짓 일기였게 한다 — 독자가 모은 \'단서\'가 흑막이 깔아둔 서사였음을 뒤집는다.',
        tags: ['정보적하', '미스터리', '단서', '점진', '동력'],
      },
      {
        name: '대면·결말(Resolution)', en: 'Confrontation & Aftermath',
        def: '클라이맥스 대결 끝에 퇴치·탈출·패배·열린 결말 중 하나로 닫는 5단계 마지막. 5단 구조(일상→균열→상승→포위→대면)의 종착점.',
        use: '구조의 마침표를 어떤 정서로 찍을지 결정할 때. 후련함(퇴치)·찝찝함(열린 결말)·비통함(패배) 중 작품의 주제에 맞는 톤을 고른다.',
        ex: '해가 뜨고, 살아남은 둘이 폐허가 된 집을 등진다. 카메라가 멀어지는데 — 2층 창에 잠깐, 커튼이 흔들린다.',
        twist: '결말을 \'결말처럼\' 닫지 않는다 — 대면의 승패 대신, 인물이 그 밤을 \'어떻게 기억하기로 했는가\'로 끝내 사건이 아닌 여운을 남긴다.',
        tags: ['결말', '대면', '5단', '종착', '여운'],
      },
    ],
  },
  {
    key: 'climax', label: '클라이맥스·결말', icon: '🔥',
    note: '최후의 대면, 규칙의 역이용, 거짓 승리 후 재공격, 대가·상처, 열린 결말.',
    items: [
      {
        name: '최후의 대면', en: 'The Confrontation',
        def: '그동안 숨겨졌던 괴물·진실과 정면으로 마주하는 정점. 오프스크린으로 끌어온 존재를 (부분적으로라도) 드러내는 지점.',
        use: '클라이맥스의 심장. \'얼마나 보여줄지\'를 가장 신중히 결정한다 — 다 드러내면 후련하지만 신비가 죽고, 안 보이면 찝찝하다.',
        ex: '마침내 지하실 문을 연다. 그토록 피해 온 그것이, 흔들리는 손전등 불빛 속에서 천천히 고개를 돌린다.',
        twist: '대면의 순간 그것이 \'주인공의 얼굴\'을 하고 있게 한다 — 싸워온 괴물이 자기 자신/자기 죄의 형상이었음을.',
        tags: ['대면', '정점', '괴물공개', '클라이맥스', '진실'],
      },
      {
        name: '규칙의 역이용', en: 'Use the Rules',
        def: '빌드업에서 심어둔 괴물의 약점·규칙(성수·소금·이름·불·해뜨기)을 클라이맥스에서 사용하는 관습. 단, 미리 복선해 데우스 엑스 마키나를 피한다.',
        use: '카타르시스를 \'정당하게\' 줄 때. 약점은 반드시 1~2막에 \'무심코\' 심어두고, 결말에서 인물이 그것을 깨닫게 한다.',
        ex: '그것은 자기 이름을 들으면 멈춘다 — 초반 노인의 횡설수설에 묻혀 있던 그 한마디를, 주인공이 마지막에 떠올린다.',
        twist: '믿었던 규칙이 마지막에 \'통하지 않게\' 한다 — 성수도 소금도 소용없고, 인물이 진짜 약점을 즉석에서 찾아내야 하게.',
        tags: ['약점', '규칙역이용', '복선', '성수', '카타르시스'],
      },
      {
        name: '최대 희생', en: 'The Big Death',
        def: '클라이맥스 직전·도중에 핵심 인물의 죽음으로 판돈을 올리는 관습. "이번엔 진짜 죽을 수 있다"를 독자에게 각인한다.',
        use: '긴장의 신뢰도를 세울 때. 가장 안전해 보이던/가장 사랑받던 인물을 희생시켜 \'누구도 안전하지 않음\'을 증명한다.',
        ex: '모두를 지키려 문을 안에서 잠그고 남은 아버지. 유리창 너머로 손을 흔들어 보이고는, 어둠 속으로 끌려 들어간다.',
        twist: '죽은 줄 알았던 그 인물이 \'다른 것\'이 되어 돌아오게 한다 — 희생의 슬픔을 더 끔찍한 공포로 덮어쓴다.',
        tags: ['희생', '핵심인물죽음', '판돈', '긴장', '신뢰도'],
      },
      {
        name: '거짓 승리 후 재공격', en: 'The Final Jump',
        def: '이긴 줄 알았는데 괴물이 다시 일어나는 슬래셔의 정석. 마지막 점프스케어로 안도를 한 번 더 깨뜨린다.',
        use: '결말 직전의 마지막 한 방으로. 인물(과 독자)이 가장 긴장을 푼 \'끝났다\'의 순간을 정확히 노린다.',
        ex: '괴물은 쓰러졌다. 피투성이 생존자가 무릎을 꿇고 운다. …그 등 뒤에서, 쓰러졌던 손이 천천히 다시 움켜쥔다.',
        twist: '재공격을 \'페이크\'로 두고 진짜 위협은 전혀 다른 데서 오게 한다 — 모두가 죽은 괴물만 쳐다보는 사이, 옆에서.',
        tags: ['슬래셔', '거짓승리', '재공격', '점프스케어', '결말'],
      },
      {
        name: '대가·상처', en: 'The Survivor’s Scar',
        def: '살아남아도 정상으로 못 돌아오는 관습 — 트라우마·신체손상·동료 상실. 완전한 해피엔딩은 드물다.',
        use: '카타르시스에 무게를 더할 때. 생존을 \'승리\'가 아니라 \'대가를 치른 생환\'으로 그려 여운을 남긴다.',
        ex: '그녀는 살아남았다. 그러나 이제 거울을 보지 못하고, 밤에 불을 끄지 못하며, 아무도 그날을 묻지 않는다.',
        twist: '상처를 \'전염의 증거\'로 만든다 — 살아남은 자의 트라우마성 행동(중얼거림·강박)이 사실 그것이 옮겨붙은 흔적이게.',
        tags: ['트라우마', '상처', '생존자', '여운', '비카타르시스'],
      },
      {
        name: '열린 결말·씨앗', en: 'It Isn’t Over',
        def: '저주가 옮겨갔음·알·생존 개체·전염자가 남음·마지막 컷의 불길한 징조로 닫는 관습. 속편 여지 + 존재론적 불안.',
        use: '현대 호러가 선호하는 비(非)카타르시스 결말. \'퇴치\'의 후련함 대신 \'끝나지 않았다\'의 찝찝함을 남긴다.',
        ex: '모든 게 끝났다. 가족은 새 도시로 이사한다. 짐을 풀던 막내가, 어디서 묻어온 작은 인형 하나를 발견하고 웃는다.',
        twist: '열린 결말을 \'완전히 닫은 척\' 한 뒤 마지막 한 문장만으로 뒤집는다 — 안심한 독자의 뒤통수를 정확히 한 줄로.',
        tags: ['열린결말', '씨앗', '전염', '속편', '찝찝함'],
      },
      {
        name: '최종 반전', en: 'The Twist',
        def: '화자가 사실 죽어 있었다·괴물은 주인공이었다·모든 게 환각이었다·구원자가 진짜 적이었다 같은 인식 전복 장치.',
        use: '결말의 마지막 카드로. 반드시 \'다시 읽으면 보이는\' 복선을 앞에 깔아, 반전이 속임수가 아니라 \'재해석\'이 되게 한다.',
        ex: '그녀를 줄곧 도와온 신부(神父). 마지막 페이지: 그가 이 모든 의식을 \'시작한\' 자였고, 그녀는 마지막 제물이었다.',
        twist: '반전 자체를 \'또 한 번\' 반전시킨다(이중 반전) — 진실인 줄 알았던 폭로가 인물의 또 다른 망상이게 해, 바닥을 한 번 더 뺀다.',
        tags: ['반전', '트위스트', '재해석', '환각', '이중반전'],
      },
    ],
  },
]

// ── 장면 연출 축(staging axes) ─────────────────────────────
//  장치(무엇)와 독립적인 '어떻게 깔 것인가'의 연출 차원들. 각 축은 서로 모순 없이 자유롭게
//  조합되며(시점·시간/조도·무대·감각초점·거리는 한 장면이 동시에 갖는 독립 속성),
//  무작위 '공포 장면 설계 카드'에 곱해져 조합 공간을 크게 넓힌다. 항목은 모두 고유.
interface Axis { key: string; label: string; icon: string; opts: string[] }
const AXES: Axis[] = [
  {
    key: 'pov', label: '시점·서술', icon: '🗣️',
    // 명사구(서술 방식) — 종결문이 아님. 어느 장치에도 얹을 수 있는 독립 속성.
    opts: ['1인칭 독백', '3인칭 밀착 시점', '관찰자 시점', '신뢰할 수 없는 화자의 일기', '교차 편집된 두 시점'],
  },
  {
    key: 'light', label: '시간대·조도', icon: '🕯️',
    // 명사구(때·빛 상태). 서로 배타라 한 장면에 하나만 — 곱집합 안전.
    opts: ['해 지기 직전의 박명', '칠흑 같은 새벽 3시', '형광등이 깜빡이는 한밤', '눈부신 한낮의 정적', '안개 낀 흐린 오후'],
  },
  {
    key: 'stage', label: '무대·공간', icon: '🏚️',
    // 명사구(장소). 장치 텍스트와 충돌하지 않는 일반 배경.
    opts: ['텅 빈 복도', '잠긴 지하실', '눈에 갇힌 산장', '낡은 가족의 거실', '인적 끊긴 병원 병동', '폐가가 된 학교'],
  },
  {
    key: 'sense', label: '감각 초점', icon: '👂',
    // 명사구(어떤 감각을 전면에 둘지). 다른 축과 독립.
    opts: ['멀리서 들려오는 소음', '코를 찌르는 냄새', '등골을 스치는 한기', '시야 가장자리의 그림자', '피부에 닿는 축축함'],
  },
  {
    key: 'distance', label: '거리·노출', icon: '🔭',
    // 명사구(공포 대상을 얼마나 보여주는가). 오프스크린 원칙의 연출 변주.
    opts: ['전혀 보이지 않는 채로', '일부만 흘끗 비치며', '소리로만 존재하며', '정면으로 드러난 채로'],
  },
]

// ── 한국어 조사 헬퍼 ───────────────────────────────────────
//  앞 글자의 받침 유무를 보고 실제 조사 하나를 골라 붙인다. "을(를)" 같은 이중표기 금지.
function hasFinalConsonant(word: string): boolean {
  const ch = word.charCodeAt(word.length - 1)
  if (ch < 0xac00 || ch > 0xd7a3) return false // 한글 음절이 아니면 받침 없음으로 간주
  return (ch - 0xac00) % 28 !== 0
}
// 을/를, 이/가, 은/는, 으로/로(ㄹ받침은 '로')
function eul(word: string): string { return word + (hasFinalConsonant(word) ? '을' : '를') }
function euro(word: string): string {
  const ch = word.charCodeAt(word.length - 1)
  const jong = (ch >= 0xac00 && ch <= 0xd7a3) ? (ch - 0xac00) % 28 : 0
  if (jong === 0) return word + '로'      // 받침 없음 → 로
  if (jong === 8) return word + '로'      // ㄹ 받침 → 로
  return word + '으로'                    // 그 외 받침 → 으로
}

// ── 유틸 ───────────────────────────────────────────────────
const LS = 'sry:tool:horror-devices'
const ALL_KEY = '__all__'

interface Flat { catKey: string; catLabel: string; catIcon: string; d: Device }
const flatAll = (): Flat[] =>
  CATS.flatMap((c) => c.items.map((d) => ({ catKey: c.key, catLabel: c.label, catIcon: c.icon, d })))

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 조합수: 8개 카테고리에서 각 1개씩 장치를 뽑고, 슬롯마다 '원형 그대로 / 비틀기 적용'(2상태)을
//   독립적으로 선택한 뒤, 다섯 연출 축(시점·시간/조도·무대·감각초점·거리/노출)을 각각 하나씩
//   곱해 '공포 장면 설계 카드'를 조합 → 곱집합 × 2^카테고리수 × ∏(연출축 옵션수).
//   (이전 ≈5.0억 → 연출 5축을 더해 약 128억으로 확장. 5e9 이상 증가, 모든 항목 고유.)
function comboCount(): number {
  const product = CATS.reduce((n, c) => n * Math.max(1, c.items.length), 1)
  const twists = Math.pow(2, CATS.length)            // 슬롯별 비틀기 on/off
  const staging = AXES.reduce((n, a) => n * Math.max(1, a.opts.length), 1) // 연출 축들의 곱
  return product * twists * staging
}
function fmtNum(n: number): string {
  // 한국어 만/억/조 단위 근사 표기
  if (n >= 1e12) return (n / 1e12).toFixed(n >= 1e13 ? 0 : 1) + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e9 ? 0 : 1) + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(0) + '만'
  return n.toLocaleString('ko-KR')
}

const fullText = (f: Flat): string => {
  const t = (f.d.tags || []).join(' ')
  return `${f.d.name} ${f.d.en || ''} ${f.d.def} ${f.d.use} ${f.d.ex} ${f.d.twist} ${f.catLabel} ${t}`.toLowerCase()
}

// ── 컴포넌트 ───────────────────────────────────────────────
export default function HorrorDevices({ payload }: { payload?: Record<string, unknown> }) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + ':cat')
      if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 펼침 상태: "catKey::name" 집합
  const [open, setOpen] = useState<Record<string, boolean>>({})
  // 즐겨찾기: "catKey::name"
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + ':favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<Flat | null>(null)
  // 무작위 카드에 함께 굴리는 연출 축 값(축key→옵션) + 비틀기 적용 여부
  const [stage, setStage] = useState<{ picks: Record<string, string>; twist: boolean } | null>(null)
  const [copied, setCopied] = useState<string>('')
  const [toast, setToast] = useState<string>('')
  const nonce = useRef(0)

  // payload.genre 활용 — 호러 외 장르로 열렸을 때 안내(연계 진입 맥락 표시)
  const payloadGenre = typeof payload?.genre === 'string' ? (payload.genre as string) : ''

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + ':cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + ':favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  // 복사/토스트 타이머 정리(언마운트 안전)
  useEffect(() => { if (!copied) return; const t = window.setTimeout(() => setCopied(''), 1500); return () => window.clearTimeout(t) }, [copied])
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(''), 2400); return () => window.clearTimeout(t) }, [toast])

  const total = useMemo(() => flatAll().length, [])
  const combos = useMemo(() => comboCount(), [])
  const fk = (catKey: string, name: string) => `${catKey}::${name}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = cat === ALL_KEY ? flatAll() : flatAll().filter((f) => f.catKey === cat)
    if (onlyFav) base = base.filter((f) => favs[fk(f.catKey, f.d.name)])
    if (q) base = base.filter((f) => fullText(f).includes(q))
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    const pool = cat === ALL_KEY ? flatAll() : flatAll().filter((f) => f.catKey === cat)
    if (!pool.length) { setRandom(null); return }
    const my = ++nonce.current
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.d.name === prev.d.name && pick.catKey === prev.catKey) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return my === nonce.current ? pick : prev
    })
    // 연출 축들을 함께 굴려 '공포 장면 설계 카드'를 완성한다
    const picks: Record<string, string> = {}
    for (const a of AXES) picks[a.key] = a.opts[Math.floor(Math.random() * a.opts.length)]
    if (my === nonce.current) setStage({ picks, twist: Math.random() < 0.5 })
    // 무작위로 뽑힌 항목은 펼쳐 보여준다
  }, [cat])

  const toggleOpen = (catKey: string, name: string) => {
    const k = fk(catKey, name)
    setOpen((p) => ({ ...p, [k]: !p[k] }))
  }
  const toggleFav = (catKey: string, name: string) => {
    const k = fk(catKey, name)
    setFavs((p) => { const n = { ...p }; if (n[k]) delete n[k]; else n[k] = true; return n })
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text)
      .then(() => setCopied(id))
      .catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }

  // 무작위 연출 축 + 장치로 '공포 장면 설계' 한 문장을 조합(조사 헬퍼로 받침 처리)
  //  슬롯 문법역할: 시점/시간/무대/감각/거리는 모두 명사구, 장치명은 목적어, 마무리는 종결문.
  const sceneSentence = (f: Flat, st: { picks: Record<string, string>; twist: boolean }): string => {
    const p = st.picks
    const pov = p.pov, light = p.light, stg = p.stage, sense = p.sense, dist = p.distance
    const mode = st.twist ? '비틀어' : '원형 그대로'
    // 받침에 맞춰 장치명 뒤 목적격 조사를 붙인다("…을"/"…를"). 괄호 이중표기 없음.
    const deviceObj = '「' + f.d.name + '」' + (hasFinalConsonant(f.d.name) ? '을' : '를')
    // 예) "1인칭 독백으로, 칠흑 같은 새벽 3시 잠긴 지하실에서 — 멀리서 들려오는 소음을 앞세워
    //      전혀 보이지 않는 채로 「드레드의 축적」을 비틀어 깐다."
    return `${euro(pov)}, ${light} ${stg}에서 — ${eul(sense)} 앞세워 ${dist} ${deviceObj} ${mode} 깐다.`
  }

  // 한 항목을 텍스트로 직렬화(복사·라이브러리용)
  const deviceText = (f: Flat): string => {
    const title = `${f.catIcon} [${f.catLabel}] ${f.d.name}${f.d.en ? ` (${f.d.en})` : ''}`
    return [
      title,
      `· 정의: ${f.d.def}`,
      `· 사용법: ${f.d.use}`,
      `· 예시: ${f.d.ex}`,
      `· 비틀기: ${f.d.twist}`,
    ].join('\n')
  }

  // 항목을 프로젝트 자료〈서사 장치〉 폴더 메모로 추가
  const addDeviceToProject = (f: Flat) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escHtml(f.catIcon + ' ' + f.catLabel)} · ${escHtml(f.d.name)}${f.d.en ? ' ' + escHtml('(' + f.d.en + ')') : ''}</b></p>`,
      `<p><b>정의</b> — ${escHtml(f.d.def)}</p>`,
      `<p><b>사용법</b> — ${escHtml(f.d.use)}</p>`,
      `<p><b>예시</b> — ${escHtml(f.d.ex)}</p>`,
      `<p><b>비틀기</b> — ${escHtml(f.d.twist)}</p>`,
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '서사 장치', title: `[호러] ${f.d.name}`, bodyHtml })
    if (id) setToast(`프로젝트 자료〈서사 장치〉에 ‘${f.d.name}’를 추가했습니다.`)
  }

  // 항목을 공유 라이브러리(글감 snippets)에 저장 — 다른 도구에서 재활용
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: deviceText(f),
      source: '호러·공포 서사 장치·전개법 사전',
      tags: ['호러·공포', f.catLabel, f.d.name, ...(f.d.tags || [])],
    })
    setToast(`글감 라이브러리에 ‘${f.d.name}’를 저장했습니다.`)
  }

  // 스타일
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const input: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const field = (label: string, val: string) => (
    <div style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 4 }}>
      <span style={{ color: 'var(--accent)', fontWeight: 700, marginRight: 5 }}>{label}</span>
      <span>{val}</span>
    </div>
  )

  const renderDevice = (f: Flat, key: string, forceOpen = false) => {
    const k = fk(f.catKey, f.d.name)
    const isOpen = forceOpen || !!open[k]
    const isFav = !!favs[k]
    return (
      <div key={key} style={card}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, cursor: 'pointer' }} onClick={() => !forceOpen && toggleOpen(f.catKey, f.d.name)}>
          <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={f.catIcon} /> {f.catLabel}</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{f.d.name}</span>
          {f.d.en && <span style={{ fontSize: 11.5, color: 'var(--muted)', fontStyle: 'italic' }}>{f.d.en}</span>}
          <button
            className="minibtn"
            title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
            onClick={(e) => { e.stopPropagation(); toggleFav(f.catKey, f.d.name) }}
            style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}
          >
            {isFav ? '★' : '☆'}
          </button>
          {!forceOpen && <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>}
        </div>
        {/* 닫힌 상태에서도 정의 한 줄은 보여 검색·훑기 편의 */}
        {!isOpen && <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 5, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{f.d.def}</div>}
        {isOpen && (
          <div style={{ marginTop: 4 }}>
            {field('정의', f.d.def)}
            {field('사용법', f.d.use)}
            {field('예시', f.d.ex)}
            {field('비틀기', f.d.twist)}
            {f.d.tags && f.d.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
                {f.d.tags.map((t) => (
                  <span key={t} style={{ fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 999, padding: '1px 7px' }}>#{t}</span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
              <button className="minibtn" onClick={() => copy(deviceText(f), 'd:' + k)}>
                {copied === 'd:' + k ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
              </button>
              <button className="minibtn" onClick={() => saveSnippet(f)}><Emoji e="💾" /> 글감 저장</button>
            </div>
            {/* 연계 */}
            <div className="linkbar" style={{ marginTop: 8 }}>
              <span className="linkbar-label">연계:</span>
              <button
                className="linkbtn"
                onClick={() => addDeviceToProject(f)}
                disabled={!hasProjectBridge()}
                title={hasProjectBridge() ? '이 장치를 프로젝트 자료〈서사 장치〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}
              >
                <Emoji e="📄" /> 프로젝트에 추가
              </button>
              <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid')} title="플롯 구조에 이 장치를 배치"><Emoji e="📐" /> 플롯 피라미드</button>
              <button className="linkbtn" onClick={() => openToolLinked('scene-forge', { genre: '호러·공포' })} title="이 장치로 공포 장면 만들기"><Emoji e="🎬" /> 장면 만들기</button>
              <button className="linkbtn" onClick={() => openToolLinked('tension-curve')} title="긴장 곡선에 이 비트를 얹기"><Emoji e="📈" /> 긴장 곡선</button>
              <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck')} title="반전 카드로 비틀기 더 굴리기"><Emoji e="🃏" /> 반전 카드덱</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={hint}>
        호러·공포 고유의 <b>서사 장치·전개법 {total}종</b>을 8개 유형으로 정의·사용법·예시·비틀기까지 모았습니다.
        유형마다 장치 하나씩 뽑고 ‘원형/비틀기’에 <b>시점·시간/조도·무대·감각·거리</b> 5개 연출 축을 곱해
        공포 장면 설계 카드를 조합하면 <b>약 {fmtNum(combos)}({combos.toLocaleString('ko-KR')})가지</b>.
        {payloadGenre && payloadGenre !== '호러·공포' && (
          <span style={{ color: 'var(--accent)' }}> · ‘{payloadGenre}’ 작업에서 열렸어요 — 공포 장치를 변주로 빌려 쓰기 좋습니다.</span>
        )}
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="장치·전개·페이싱 검색 (예: 드레드, 언캐니, 오프스크린, 점프스케어, 열린 결말)"
        style={input}
      />

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="✨" /> 전체
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on} title={c.note}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={c.icon} /> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 장치</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}종 표시</span>
      </div>

      {/* 현재 카테고리 안내 */}
      {cat !== ALL_KEY && (
        <div style={{ ...hint, fontSize: 11.5, fontStyle: 'italic' }}>
          <Emoji e={CATS.find((c) => c.key === cat)?.icon || ''} /> {CATS.find((c) => c.key === cat)?.note}
        </div>
      )}

      {/* 무작위 결과(펼친 카드) */}
      {random && (
        <div style={{ border: '1px solid var(--accent)', borderRadius: 10, padding: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 0' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}><Emoji e="🎲" /> 무작위 공포 장면 설계 카드</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => { setRandom(null); setStage(null) }}>✕</button>
          </div>
          {/* 연출 축(시점·시간/조도·무대·감각·거리) — 장치와 독립으로 함께 굴린 결과 */}
          {stage && (
            <div style={{ margin: '6px 10px 0', padding: '8px 10px', background: 'var(--paper)', border: '1px dashed var(--accent)', borderRadius: 8 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 7 }}>
                {AXES.map((a) => (
                  <span key={a.key} style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 8px' }}>
                    <Emoji e={a.icon} /> {a.label}: <b style={{ color: 'var(--text)' }}>{stage.picks[a.key]}</b>
                  </span>
                ))}
                <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 8px' }}>
                  <Emoji e="🔀" /> 적용: <b style={{ color: 'var(--text)' }}>{stage.twist ? '비틀기' : '원형'}</b>
                </span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)' }}>{sceneSentence(random, stage)}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button className="minibtn" onClick={() => copy(sceneSentence(random, stage), 'scene')}>
                  {copied === 'scene' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 장면 문장 복사</>}
                </button>
                <button className="minibtn" onClick={rollRandom}><Emoji e="🎲" /> 다시 굴리기</button>
              </div>
            </div>
          )}
          {renderDevice(random, 'rand:' + fk(random.catKey, random.d.name), true)}
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5 }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 장치가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map((f) => renderDevice(f, fk(f.catKey, f.d.name)))
        )}
      </div>

      <div style={hint}>
        장치는 공식이 아니라 출발점입니다. <b>공포 = 기다림</b>, 보여주는 것보다 <b>아끼는 것</b>이 무섭고, 파워업이 아니라 <b>대가·여운</b>으로 긴장을 닫으세요.
      </div>
    </div>
  )
}
