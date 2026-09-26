// 예법·금기 사전 — 시대·문화·상황(궁중/제례/식사/혼례/장례/접객 등)별 예법·호칭·금기·결례를
// 자작 텍스트로 정리한 로컬 레퍼런스. 갈등·고증 장면을 쓸 때 "무엇이 결례인가"를 빠르게 찾는다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크/미디어/키 불필요.
// 데이터는 백과를 베끼지 않고 일반 상식을 직접 요약·표현한 자작 데이터다(고증은 작품 톤에 맞게 조정 권장).
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToStash, hasStash, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'social-etiquette-ref', name: '예법·금기 사전', icon: '🎎', group: '리서치·자료', intro: '시대·문화·상황별 예법·호칭·금기·결례를 찾아 갈등·고증 장면에 활용', w: 660, h: 600 }

// ---------- 데이터 타입 ----------
interface Rule {
  name: string          // 항목 이름(예법/호칭/금기)
  kind: 'do' | 'dont' | 'title' | 'note'  // 권장 / 금기·결례 / 호칭 / 일반 설명
  body: string          // 한 줄 핵심 설명(자작)
  tags?: string[]       // 검색 보조 태그
}
interface Scene {
  key: string
  label: string
  icon: string
  era?: string          // 대략 시대/배경 표기
  intro: string         // 상황 한 줄 소개
  rules: Rule[]
}

const KIND_LABEL: Record<Rule['kind'], { label: string; icon: string; color: string }> = {
  do: { label: '지킬 것', icon: '✅', color: 'var(--ok)' },
  dont: { label: '결례·금기', icon: '⛔', color: '#e06c6c' },
  title: { label: '호칭', icon: '🏷️', color: 'var(--accent)' },
  note: { label: '풀이', icon: '📖', color: 'var(--muted)' },
}

// ===================== 자작 데이터: 상황별 예법·금기 =====================
const SCENES: Scene[] = [
  {
    key: 'court', label: '궁중·왕실', icon: '👑', era: '전통 왕조 일반',
    intro: '왕·군주 앞에서의 처신. 서열과 시선, 등 돌림, 발언 순서가 곧 생사·출세를 가른다.',
    rules: [
      { kind: 'title', body: '군주에게는 ‘전하/폐하’, 세자에게는 ‘저하’, 대비·왕후에게는 ‘마마’ 식으로 지위에 맞는 극존칭을 쓴다.', name: '존호와 마마 호칭', tags: ['전하', '폐하', '마마', '저하'] },
      { kind: 'title', body: '자신을 낮추어 ‘소신/소인/신(臣)’이라 칭하고, 결코 ‘나/내’를 군주 앞에서 쓰지 않는다.', name: '겸칭(소신·신)', tags: ['겸손', '자칭'] },
      { kind: 'do', body: '어전에 들 때 관복·관모를 갖추고, 정해진 자리·서열대로 도열한다. 늦거나 흐트러지면 불경이다.', name: '관복과 서열 도열', tags: ['복식', '서열'] },
      { kind: 'do', body: '하명을 받으면 머리를 조아려 ‘성은이 망극하옵니다’로 받들고, 즉답 대신 뜻을 헤아려 신중히 아뢴다.', name: '하명 봉대', tags: ['성은', '응답'] },
      { kind: 'dont', body: '군주에게 등을 보이며 나가는 것은 큰 결례다. 물러날 때 뒷걸음으로 어전을 빠져나간다.', name: '등 돌려 퇴장 금지', tags: ['퇴장', '등'] },
      { kind: 'dont', body: '용안(군주의 얼굴)을 정면으로 빤히 응시하지 않는다. 시선을 낮추는 것이 예다.', name: '용안 직시 금지', tags: ['시선', '눈'] },
      { kind: 'dont', body: '윗전이 묻기 전에 먼저 입을 열거나 말을 가로채면 방자하다 하여 벌을 받는다.', name: '선발언·말 가로채기', tags: ['발언', '순서'] },
      { kind: 'dont', body: '군주의 이름(휘)을 함부로 부르거나 쓰는 것은 피휘(避諱)를 어긴 중죄다.', name: '휘를 범함(피휘)', tags: ['이름', '피휘'] },
      { kind: 'note', body: '독대(군주와 단둘이 마주함)는 큰 신임의 표시이자, 모함의 빌미가 되기도 한다.', name: '독대의 양면', tags: ['독대', '신임'] },
      { kind: 'dont', body: '어전에서 무기를 지니거나, 허락 없이 계단·옥좌에 가까이 오르면 시역(弑逆)의 혐의를 산다.', name: '무장·근접 금지', tags: ['무기', '옥좌'] },
      { kind: 'do', body: '상소·간언은 명분과 예를 갖춰 글로 올리고, 거듭 물리쳐도 죽음을 무릅쓰는 직언이 충신의 도리로 여겨졌다.', name: '간언과 상소의 예', tags: ['간언', '상소'] },
    ],
  },
  {
    key: 'rite', label: '제례·차례', icon: '🕯️', era: '유교 전통 가례',
    intro: '조상을 모시는 자리. 방위·순서·복색의 작은 어긋남도 ‘불효’로 읽힌다.',
    rules: [
      { kind: 'do', body: '제상은 보통 북쪽을 향해 차리고, 신위를 기준으로 좌우·앞뒤 진설 순서를 지킨다.', name: '진설의 방위', tags: ['방위', '진설', '북쪽'] },
      { kind: 'do', body: '술잔은 향을 쐰 뒤 올리고, 잔을 올린 이가 두 번 절(재배)하는 것이 기본 절차다.', name: '헌작과 재배', tags: ['절', '술잔', '재배'] },
      { kind: 'do', body: '남자는 두 번, 여자는 네 번 절하는 식으로 가문·지역에 따라 절 수가 정해져 있다(가가례).', name: '절 수의 법도', tags: ['절', '횟수'] },
      { kind: 'dont', body: '비린 것 중 ‘치’로 끝나는 생선(갈치·꽁치 등)이나 복숭아는 올리지 않는다는 금기가 흔하다.', name: '치·복숭아 금기', tags: ['생선', '복숭아', '음식'] },
      { kind: 'dont', body: '고춧가루·마늘 등 향이 강하거나 붉은 양념을 제수에 쓰지 않는 가풍이 많다.', name: '강한 양념 금기', tags: ['고춧가루', '마늘', '양념'] },
      { kind: 'dont', body: '제사 도중 잡담·웃음·다툼은 조상에 대한 큰 결례로, 엄숙을 깨면 집안의 화로 본다.', name: '엄숙을 깸', tags: ['웃음', '잡담', '엄숙'] },
      { kind: 'note', body: '‘좌포우혜·홍동백서·어동육서·조율이시’ 같은 진설 어구는 지역·가문마다 다르게 전해진다.', name: '진설 어구의 변형', tags: ['홍동백서', '조율이시'] },
      { kind: 'dont', body: '상중(喪中)이거나 부정 탄 이로 여겨지는 사람은 제례에 참여하지 않는 관습이 있었다.', name: '부정 든 자의 배제', tags: ['부정', '상중'] },
      { kind: 'do', body: '복색은 화려한 색을 피하고 단정·차분한 옷차림으로, 손을 모으고 공경한 자세를 유지한다.', name: '단정한 복색과 자세', tags: ['복색', '자세'] },
    ],
  },
  {
    key: 'dining', label: '식사·주연', icon: '🍚', era: '전통~근현대 한국',
    intro: '밥상에는 서열과 정이 함께 놓인다. 수저 드는 순서, 잔 받는 손이 사람됨을 드러낸다.',
    rules: [
      { kind: 'do', body: '윗사람이 먼저 수저를 든 뒤 아랫사람이 따라 드는 것이 예다. 먼저 먹기 시작하면 무례하다.', name: '윗사람 먼저', tags: ['수저', '순서', '어른'] },
      { kind: 'do', body: '어른께 술을 따를 때와 받을 때 모두 두 손을 쓰고, 마실 때는 고개를 살짝 돌려 마신다.', name: '두 손으로 술 권하기', tags: ['술', '두 손', '잔'] },
      { kind: 'dont', body: '밥그릇에 수저를 꽂아 세우는 것은 죽은 이에게 올리는 메(밥) 모양이라 식사 자리에선 금기다.', name: '밥에 수저 꽂기', tags: ['수저', '밥', '죽음'] },
      { kind: 'dont', body: '소리 내어 후루룩·쩝쩝 먹거나, 입에 음식을 문 채 말하는 것은 결례로 여겨진다.', name: '소리 내며 먹기', tags: ['소리', '예절'] },
      { kind: 'dont', body: '공용 반찬을 자기 수저로 휘젓거나 뒤적이는 것은 함께 먹는 이들에게 결례다.', name: '반찬 뒤적이기', tags: ['반찬', '공용'] },
      { kind: 'do', body: '어른보다 먼저 자리를 뜨지 않고, 다 드실 때까지 기다렸다 함께 일어나는 것이 도리다.', name: '먼저 일어나지 않기', tags: ['자리', '어른'] },
      { kind: 'note', body: '주안상에서 첫 잔을 어른께 올리고, 술이 떨어지지 않게 살피는 것이 아랫사람의 몫이었다.', name: '주안상의 도리', tags: ['술', '주안상'] },
      { kind: 'dont', body: '젓가락으로 음식을 주고받는 행위는 장례의 습관을 연상시켜 꺼리는 문화가 있다(특히 일본).', name: '젓가락 건네기 금기', tags: ['젓가락', '장례', '일본'] },
      { kind: 'do', body: '손님에게는 좋은 자리(상석)를 권하고, 음식을 거듭 권하는 것이 후한 대접의 표현이다.', name: '상석 권하기', tags: ['상석', '손님'] },
    ],
  },
  {
    key: 'wedding', label: '혼례', icon: '💍', era: '전통 혼례~현대',
    intro: '두 집안이 맺어지는 자리. 말 한마디, 색 하나가 길흉을 가른다.',
    rules: [
      { kind: 'do', body: '혼사에는 ‘끊어진다·헤어진다·다시·재차’ 같은 불길한 말을 삼가는 것이 오랜 관습이다.', name: '불길한 말 금기', tags: ['말', '금기', '재혼'] },
      { kind: 'do', body: '함을 들이고 받을 때, 사주단자·예물에 정성을 갖추고 받는 쪽도 정중히 답례한다.', name: '함과 사주단자', tags: ['함', '사주', '예물'] },
      { kind: 'do', body: '폐백에서 시부모께 절을 올리면 어른이 다산·복을 빌며 대추·밤을 던져 주는 정이 오간다.', name: '폐백과 대추·밤', tags: ['폐백', '대추', '밤'] },
      { kind: 'dont', body: '신부·신랑의 흠을 들추거나 과거를 캐묻는 것은 두 집안 모두에 대한 큰 결례다.', name: '과거 캐묻기', tags: ['과거', '흠'] },
      { kind: 'dont', body: '하객이 신부보다 화려하거나 흰색·붉은색으로 시선을 끄는 차림은 예의에 어긋난다고 본다.', name: '하객 복색 과함', tags: ['복색', '흰색', '하객'] },
      { kind: 'note', body: '혼서지·예단·이바지 같은 절차는 두 집안의 격식과 정성을 가늠하는 척도로 여겨졌다.', name: '예단과 이바지', tags: ['예단', '이바지'] },
      { kind: 'dont', body: '축의금 봉투에 이름을 빠뜨리거나, 4와 같은 꺼리는 숫자로 액수를 맞추는 것은 피한다.', name: '축의금 결례', tags: ['축의금', '숫자', '4'] },
      { kind: 'do', body: '혼주(양가 부모)에게 먼저 인사드리고 축하를 전한 뒤, 신랑·신부에게 다가가는 것이 순서다.', name: '혼주 먼저 인사', tags: ['혼주', '인사'] },
    ],
  },
  {
    key: 'funeral', label: '장례·조문', icon: '🕊️', era: '전통~현대 상례',
    intro: '슬픔의 자리에서의 말과 몸가짐. 위로의 마음도 격식을 벗어나면 상처가 된다.',
    rules: [
      { kind: 'do', body: '빈소에서는 검은색·어두운 무채색의 단정한 옷을 입고, 화려한 장신구는 피한다.', name: '조문 복장', tags: ['복장', '검은색'] },
      { kind: 'do', body: '분향·헌화 후 영정에 절(보통 두 번)하고, 상주와 맞절한 뒤 짧게 위로의 말을 건넨다.', name: '분향·재배·맞절', tags: ['분향', '절', '상주'] },
      { kind: 'do', body: '위로는 ‘삼가 고인의 명복을 빕니다’ 정도로 간결히. 길게 말을 늘이지 않는 것이 예다.', name: '간결한 위로', tags: ['위로', '말', '명복'] },
      { kind: 'dont', body: '사인(死因)을 캐묻거나 “호상이다·잘 가셨다” 같은 말로 슬픔을 가볍게 만들지 않는다.', name: '사인 캐묻기·호상 운운', tags: ['사인', '호상', '말'] },
      { kind: 'dont', body: '빈소에서 큰 소리로 웃거나 떠들고, 술자리로 변질시키는 것은 고인과 상주에 대한 결례다.', name: '빈소에서 소란', tags: ['웃음', '술', '소란'] },
      { kind: 'note', body: '부의금 봉투에는 보통 ‘부의(賻儀)·근조(謹弔)’를 쓰고, 액수는 홀수로 맞추는 관습이 있다.', name: '부의금과 봉투', tags: ['부의', '근조', '홀수'] },
      { kind: 'dont', body: '상주에게 “안녕하세요” 같은 일상 인사나 악수를 청하는 것은 어울리지 않는다.', name: '일상 인사·악수', tags: ['인사', '악수', '상주'] },
      { kind: 'do', body: '상주는 곡(哭)과 예를 다하되, 문상객을 맞아 일일이 답례하는 것이 도리로 여겨졌다.', name: '상주의 답례', tags: ['상주', '곡', '답례'] },
      { kind: 'dont', body: '흰색을 죽음·애도의 색으로 보는 문화권(동아시아 다수)에서는 경사에 흰옷이 금기다.', name: '흰색=상복 문화', tags: ['흰색', '상복', '문화'] },
    ],
  },
  {
    key: 'hospitality', label: '접객·방문', icon: '🍵', era: '전통~현대 가정',
    intro: '손님을 들이고 배웅하는 일에는 집안의 인격이 담긴다. 차 한 잔에도 위계가 있다.',
    rules: [
      { kind: 'do', body: '손님을 상석(보통 안쪽·문에서 먼 자리)으로 안내하고, 주인은 문에 가까운 자리에 앉는다.', name: '상석 배치', tags: ['상석', '자리'] },
      { kind: 'do', body: '차·다과를 낼 때 두 손으로 공손히 올리고, 손님이 들기 전에 권하는 것이 예다.', name: '두 손으로 차 내기', tags: ['차', '다과', '두 손'] },
      { kind: 'do', body: '방문할 때 빈손보다 작은 선물(과일·다과 등)을 들고 가는 것이 정과 예의로 통한다.', name: '빈손 방문 피하기', tags: ['선물', '방문'] },
      { kind: 'dont', body: '남의 집에서 허락 없이 방·서랍·물건을 들여다보거나 만지는 것은 큰 결례다.', name: '허락 없는 탐색', tags: ['사생활', '물건'] },
      { kind: 'dont', body: '신을 신은 채 마루·온돌방에 오르는 것은 동아시아 가정에서 무례로 여겨진다.', name: '신 신고 입실', tags: ['신발', '입실', '온돌'] },
      { kind: 'note', body: '주인은 손님이 일어설 때까지 먼저 자리를 권해 일으키지 않고, 문밖까지 배웅하는 것이 정성이다.', name: '배웅의 예', tags: ['배웅', '손님'] },
      { kind: 'dont', body: '오래 머무르며 식사 때를 넘기고도 일어나지 않는 손님은 ‘염치없다’ 평을 듣는다.', name: '눈치 없이 장기 체류', tags: ['체류', '염치'] },
      { kind: 'do', body: '선물을 받으면 그 자리에서 바로 뜯어보지 않는 절제가 예의로 통하던 문화권이 많다.', name: '선물 즉시 개봉 자제', tags: ['선물', '개봉'] },
    ],
  },
  {
    key: 'salon', label: '서양 살롱·무도회', icon: '🎻', era: '근세 유럽 상류층',
    intro: '응접실과 무도회장의 격식. 소개·춤·명함·시선의 규칙이 신분을 증명한다.',
    rules: [
      { kind: 'title', body: '작위에 따라 ‘공작(Duke)·후작·백작·자작·남작’을 구분하고, 부인은 ‘Lady·Madam’ 등으로 부른다.', name: '작위 호칭', tags: ['작위', '호칭', '경'] },
      { kind: 'do', body: '서로 모르는 두 사람은 신분이 더 낮은 쪽을 높은 쪽에게 ‘소개’하는 절차를 거쳐야 대화할 수 있다.', name: '정식 소개 절차', tags: ['소개', '신분'] },
      { kind: 'dont', body: '소개 없이 먼저 말을 거는 것, 특히 여성에게 다짜고짜 접근하는 것은 무례로 여겨진다.', name: '무소개 접근', tags: ['소개', '접근'] },
      { kind: 'do', body: '무도회에서 신사는 숙녀에게 춤을 청하고, 한 사람과 너무 여러 번 추면 소문(약혼 추정)이 난다.', name: '댄스 카드의 규칙', tags: ['춤', '무도회', '댄스카드'] },
      { kind: 'dont', body: '이미 다른 신사에게 약속된 춤을 가로채거나, 청을 받고 이유 없이 거절하는 것은 결례다.', name: '춤 가로채기·거절', tags: ['춤', '거절'] },
      { kind: 'note', body: '방문 시 ‘명함(calling card)’을 남기고, 그 답방 여부로 교제의 의사를 가늠하는 문화가 있었다.', name: '명함과 답방', tags: ['명함', '방문'] },
      { kind: 'do', body: '식탁에선 바깥쪽 포크·나이프부터 안쪽으로 차례로 쓰고, 손은 식탁 위에 단정히 둔다.', name: '바깥쪽 커틀러리부터', tags: ['포크', '식탁', '커틀러리'] },
      { kind: 'dont', body: '여성·연장자·상급자보다 먼저 앉거나, 그들의 입장 전에 자리를 차지하는 것은 무례다.', name: '서열 앞질러 착석', tags: ['착석', '서열'] },
      { kind: 'note', body: '장갑·부채·손수건의 작은 몸짓이 은밀한 신호(관심·거절)로 읽히던 사교의 ‘침묵 언어’가 있었다.', name: '부채·장갑의 신호', tags: ['부채', '장갑', '신호'] },
    ],
  },
  {
    key: 'tea', label: '다도·차회', icon: '🌿', era: '동아시아 차 문화',
    intro: '차 한 잔에 담긴 침묵의 예. 잔을 쥐는 손, 따르는 양에도 마음이 드러난다.',
    rules: [
      { kind: 'do', body: '주인은 손님의 잔을 가득 채우지 않고 7~8할만 따라, 향과 온기가 머물 여백을 남긴다.', name: '칠팔 할만 따르기', tags: ['차', '따르기', '여백'] },
      { kind: 'do', body: '잔을 받을 때 가볍게 손가락을 굽혀 탁자를 두드려 감사를 표하는 관습(고배례)이 있다.', name: '손가락으로 답례', tags: ['답례', '고배례'] },
      { kind: 'do', body: '찻잔은 두 손으로 감싸 쥐고, 차의 빛깔·향·맛을 천천히 음미하는 것이 예다.', name: '두 손으로 음미', tags: ['찻잔', '음미'] },
      { kind: 'dont', body: '뜨거운 차를 후후 크게 불거나 단숨에 들이켜는 것, 잔을 거칠게 내려놓는 것은 결례다.', name: '거친 음용', tags: ['차', '소리'] },
      { kind: 'note', body: '주인은 가장 어른·귀한 손님부터 차를 올리고, 차의 종류와 다구로 손님에 대한 격을 표한다.', name: '귀한 손님부터', tags: ['차', '서열', '다구'] },
      { kind: 'do', body: '차회의 대화는 다투지 않고 풍류·자연·예술로 이끌어, 자리를 맑고 고요하게 유지한다.', name: '맑은 대화', tags: ['대화', '풍류'] },
    ],
  },
  {
    key: 'gift', label: '선물·숫자 금기', icon: '🎁', era: '동·서양 문화 비교',
    intro: '같은 마음도 무엇을 주느냐에 따라 축복이 되거나 저주가 된다. 숫자·소리·색의 금기를 안다.',
    rules: [
      { kind: 'dont', body: '한자·중화권에서 ‘시계(送鐘)’ 선물은 ‘장례를 치른다’와 발음이 같아 큰 금기다.', name: '시계 선물 금기', tags: ['시계', '발음', '중화권'] },
      { kind: 'dont', body: '연인·부부에게 ‘우산(傘)·배(梨)’를 나누어 주는 것은 ‘흩어짐·이별’의 발음과 닿아 꺼린다.', name: '우산·배 금기', tags: ['우산', '배', '이별'] },
      { kind: 'dont', body: '날붙이(칼·가위)는 ‘인연을 끊는다’는 뜻으로 읽혀 선물로는 피하는 문화가 많다.', name: '칼·가위 선물', tags: ['칼', '가위', '인연'] },
      { kind: 'note', body: '동아시아에서 4는 ‘죽을 사(死)’와 음이 같아 꺼리고, 8은 부귀의 수로 환영받는다.', name: '4와 8의 음운', tags: ['숫자', '4', '8'] },
      { kind: 'note', body: '서양에서는 13을 불길하게 보고, 노란 국화·흰 백합은 장례를 연상시켜 선물 꽃으로 피한다.', name: '서양의 13과 장례 꽃', tags: ['13', '국화', '백합'] },
      { kind: 'dont', body: '짝수 송이 꽃다발을 장례에, 홀수를 경사에 쓰는 식으로 꽃 송이 수의 길흉을 따지는 관습이 있다.', name: '꽃 송이 수', tags: ['꽃', '송이', '짝수'] },
      { kind: 'do', body: '선물은 받는 이의 격에 맞게, 너무 과하거나 빈약하지 않게 ‘적정한 정성’으로 맞추는 것이 예다.', name: '적정한 정성', tags: ['선물', '정성'] },
      { kind: 'note', body: '포장 색에도 금기가 있어, 흰색·검은색 포장은 애도를, 붉은색은 경사를 뜻하는 문화권이 많다.', name: '포장 색의 의미', tags: ['포장', '색', '흰색', '붉은색'] },
    ],
  },
  {
    key: 'temple', label: '사찰·종교 의례', icon: '🛕', era: '불교·신앙 공간 일반',
    intro: '성스러운 공간에는 보이지 않는 경계가 있다. 문턱·합장·복장의 작은 무지가 결례가 된다.',
    rules: [
      { kind: 'do', body: '법당에 들 때 합장하고, 문턱을 밟지 않고 넘어 들어가는 것이 예다.', name: '문턱 밟지 않기', tags: ['문턱', '합장', '법당'] },
      { kind: 'do', body: '부처님 정면(중앙 문)으로 드나들지 않고 옆문을 쓰며, 등을 보이지 않게 물러난다.', name: '중앙 출입 자제', tags: ['중앙', '출입', '예배'] },
      { kind: 'dont', body: '신성한 공간에서 큰 소리·사진 촬영·노출이 심한 복장은 결례로 여겨진다.', name: '소란·노출 복장', tags: ['소란', '복장', '촬영'] },
      { kind: 'do', body: '예배·기도 중인 이의 앞을 가로지르지 않고, 뒤로 돌아가는 것이 배려다.', name: '기도자 앞 가로지르기 자제', tags: ['예배', '가로지르기'] },
      { kind: 'note', body: '신자에게 거룩한 물건·경전·성상에는 함부로 손대지 않고 공경을 표하는 것이 도리다.', name: '성물에 대한 공경', tags: ['성물', '경전'] },
      { kind: 'dont', body: '공양물·시주를 가볍게 여기거나, 의례 절차를 비웃는 언행은 신자에게 깊은 모욕이 된다.', name: '의례 조롱', tags: ['공양', '시주', '모욕'] },
    ],
  },
  {
    key: 'letter', label: '서신·문서 격식', icon: '✒️', era: '전통 서간~근대',
    intro: '얼굴을 보지 못하는 글에서, 첫 문장과 마지막 문장이 그 사람의 격을 증명한다.',
    rules: [
      { kind: 'do', body: '서두에 상대의 안부를 먼저 여쭙고(‘기체후 일향만강하옵신지요’ 류), 자기 안부는 뒤에 둔다.', name: '상대 안부 먼저', tags: ['안부', '서두', '서간'] },
      { kind: 'title', body: '받는 이의 지위에 따라 ‘귀하·좌하·님·전(前)·합하’ 등 봉투·서두의 경칭을 달리한다.', name: '봉투 경칭', tags: ['귀하', '좌하', '경칭'] },
      { kind: 'do', body: '윗사람에게 보내는 글은 줄을 바꿔 상대를 가리키는 글자를 행 위로 올리는(대두법) 식의 공경이 있었다.', name: '대두법(행 올리기)', tags: ['대두법', '공경'] },
      { kind: 'dont', body: '윗사람의 휘(이름)를 글에 그대로 적거나, 손아랫말투로 쓰면 큰 무례가 된다.', name: '윗사람 이름·하대', tags: ['휘', '하대', '이름'] },
      { kind: 'do', body: '끝에 ‘드림·올림·배상(拜上)’ 같은 결구로 자신을 낮추고, 날짜·이름을 갖춰 맺는다.', name: '결구와 낙관', tags: ['올림', '배상', '결구'] },
      { kind: 'note', body: '경조사·축하·위로의 글은 정해진 상투 문구(‘근하신년’ 등)를 통해 격식과 마음을 함께 전했다.', name: '경조 상투 문구', tags: ['근하신년', '경조'] },
    ],
  },
  {
    key: 'guild', label: '무가·기사·무사', icon: '⚔️', era: '봉건 무사·기사 사회',
    intro: '칼을 찬 자들의 세계. 인사·맹세·결투의 절차를 어기면 명예가 죽는다.',
    rules: [
      { kind: 'do', body: '주군에게 충(忠)을 맹세하고, 명을 받으면 사사로운 이해보다 의(義)를 앞세우는 것이 도리로 여겨졌다.', name: '주군에 대한 충의', tags: ['충성', '주군', '의'] },
      { kind: 'dont', body: '상대의 칼·무기를 허락 없이 만지거나, 칼집을 부딪치게 하는 것은 도전·모욕으로 받아들여진다.', name: '남의 칼에 손대기', tags: ['칼', '무기', '도전'] },
      { kind: 'do', body: '결투·시합은 입회인을 두고 규칙·예를 갖춰 행하며, 항복·자비의 표시를 존중한다.', name: '입회와 결투 예법', tags: ['결투', '입회', '항복'] },
      { kind: 'dont', body: '등 뒤에서 치거나, 무장하지 않은 자·항복한 자를 베는 것은 비겁(불명예)으로 멸시받았다.', name: '비겁한 공격', tags: ['비겁', '항복', '명예'] },
      { kind: 'note', body: '명예를 더럽힌 자가 스스로 책임지는 의례(서양의 결투 신청, 동양의 할복 등)가 명예 회복의 형식이었다.', name: '명예 회복 의례', tags: ['명예', '결투', '할복'] },
      { kind: 'do', body: '손님으로 든 자를 해치지 않고 보호하는 ‘접객의 신의’는 무가에서도 깨면 큰 불명예였다.', name: '손님 보호의 신의', tags: ['손님', '신의', '보호'] },
    ],
  },
]

// ---------- 영속(localStorage) ----------
const LS = 'sry:tool:social-etiquette-ref:'
const ALL_KEY = '__all__'

// 평탄화 헬퍼
function flatAll(): { scene: Scene; rule: Rule }[] {
  return SCENES.flatMap((s) => s.rules.map((rule) => ({ scene: s, rule })))
}

function escapeHtml(str: string): string {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export default function SocialEtiquetteRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.scene 로 특정 상황을 열 수 있게(연계 진입)
  const initialScene = typeof payload?.scene === 'string' && SCENES.some((s) => s.key === payload.scene)
    ? (payload.scene as string)
    : ALL_KEY

  const [query, setQuery] = useState('')
  const [scene, setScene] = useState<string>(() => {
    if (initialScene !== ALL_KEY) return initialScene
    try {
      const raw = localStorage.getItem(LS + 'scene')
      if (raw && (raw === ALL_KEY || SCENES.some((s) => s.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 종류 필터: do/dont/title/note (빈 객체 = 전체)
  const [kindFilter, setKindFilter] = useState<Record<Rule['kind'], boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'kinds')
      if (raw) {
        const o = JSON.parse(raw)
        if (o && typeof o === 'object') return o as Record<Rule['kind'], boolean>
      }
    } catch { /* ignore */ }
    return { do: false, dont: false, title: false, note: false }
  })
  // 펼친 상황(아코디언). 전체 보기일 땐 검색/필터에 따라 자동 펼침.
  const [openScenes, setOpenScenes] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'open')
      if (raw) {
        const o = JSON.parse(raw)
        if (o && typeof o === 'object') return o as Record<string, boolean>
      }
    } catch { /* ignore */ }
    return {}
  })
  const [random, setRandom] = useState<{ scene: Scene; rule: Rule } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 토스트/복사 타이머 정리용
  const timers = useRef<number[]>([])
  const pushTimer = useCallback((id: number) => { timers.current.push(id) }, [])
  useEffect(() => {
    // 언마운트 정리: 남은 모든 타이머 해제
    return () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = [] }
  }, [])

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'scene', scene) } catch { /* ignore */ } }, [scene])
  useEffect(() => { try { localStorage.setItem(LS + 'kinds', JSON.stringify(kindFilter)) } catch { /* ignore */ } }, [kindFilter])
  useEffect(() => { try { localStorage.setItem(LS + 'open', JSON.stringify(openScenes)) } catch { /* ignore */ } }, [openScenes])

  const total = useMemo(() => SCENES.reduce((n, s) => n + s.rules.length, 0), [])
  const anyKind = useMemo(() => Object.values(kindFilter).some(Boolean), [kindFilter])

  const matchKind = useCallback((k: Rule['kind']) => !anyKind || kindFilter[k], [anyKind, kindFilter])

  // 검색 + 종류 필터를 거친 (상황→규칙) 묶음. 화면 표시는 상황별 아코디언.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pool = scene === ALL_KEY ? SCENES : SCENES.filter((s) => s.key === scene)
    return pool.map((s) => {
      const rules = s.rules.filter((r) => {
        if (!matchKind(r.kind)) return false
        if (!q) return true
        const hay = (r.name + ' ' + r.body + ' ' + (r.tags || []).join(' ') + ' ' + s.label).toLowerCase()
        return hay.includes(q)
      })
      return { scene: s, rules }
    }).filter((g) => g.rules.length > 0)
  }, [query, scene, matchKind])

  const shownCount = useMemo(() => groups.reduce((n, g) => n + g.rules.length, 0), [groups])

  // 검색/필터가 걸려 있으면 결과가 있는 상황을 자동으로 펼친다.
  const searching = query.trim().length > 0 || anyKind
  const isOpen = useCallback((key: string) => {
    if (searching) return true
    return !!openScenes[key]
  }, [searching, openScenes])

  const toggleScene = useCallback((key: string) => {
    setOpenScenes((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const toggleKind = useCallback((k: Rule['kind']) => {
    setKindFilter((prev) => ({ ...prev, [k]: !prev[k] }))
  }, [])

  const rollRandom = useCallback(() => {
    // 현재 상황/종류 필터 범위 안에서 무작위 1개(검색어 무시)
    const pool: { scene: Scene; rule: Rule }[] = (scene === ALL_KEY ? SCENES : SCENES.filter((s) => s.key === scene))
      .flatMap((s) => s.rules.filter((r) => matchKind(r.kind)).map((rule) => ({ scene: s, rule })))
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.rule.name === prev.rule.name && pick.scene.key === prev.scene.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return pick
    })
  }, [scene, matchKind])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    const id = window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2300)
    pushTimer(id)
  }, [pushTimer])

  const copy = useCallback((text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      const t = window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
      pushTimer(t)
    }).catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }, [pushTimer])

  // 한 규칙을 한 줄 텍스트로
  const ruleLine = (s: Scene, r: Rule) =>
    `[${s.icon} ${s.label}] ${KIND_LABEL[r.kind].icon} ${r.name} — ${r.body}`

  // ----- 연계 1: 프로젝트 자료(research) 〈예법·금기〉 폴더에 항목 추가 -----
  const addRuleToProject = useCallback((s: Scene, r: Rule) => {
    if (!hasProjectBridge()) return
    const kl = KIND_LABEL[r.kind]
    const bodyHtml = [
      `<p><b>${escapeHtml(s.icon + ' ' + s.label)}${s.era ? ' · ' + escapeHtml(s.era) : ''}</b></p>`,
      `<p><b>${escapeHtml(kl.icon + ' ' + kl.label)}</b> — ${escapeHtml(r.name)}</p>`,
      `<p>${escapeHtml(r.body)}</p>`,
      r.tags && r.tags.length ? `<p style="color:#888">태그: ${escapeHtml(r.tags.join(', '))}</p>` : '',
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '예법·금기',
      title: `${r.name} (${s.label} · ${kl.label})`,
      bodyHtml,
    })
    if (id) showToast(`프로젝트 자료 〈예법·금기〉에 ‘${r.name}’을(를) 추가했습니다.`)
  }, [showToast])

  // 한 상황 전체를 프로젝트에 한 문서로 추가
  const addSceneToProject = useCallback((s: Scene, rules: Rule[]) => {
    if (!hasProjectBridge()) return
    const lines = rules.map((r) => {
      const kl = KIND_LABEL[r.kind]
      return `<li><b>${escapeHtml(kl.icon + ' ' + kl.label)} · ${escapeHtml(r.name)}</b> — ${escapeHtml(r.body)}</li>`
    }).join('')
    const bodyHtml = [
      `<p><b>${escapeHtml(s.icon + ' ' + s.label)}${s.era ? ' · ' + escapeHtml(s.era) : ''}</b></p>`,
      `<p>${escapeHtml(s.intro)}</p>`,
      `<ul>${lines}</ul>`,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '예법·금기',
      title: `${s.label} 예법 정리 (${rules.length}항)`,
      bodyHtml,
    })
    if (id) showToast(`〈${s.label}〉 예법 ${rules.length}항을 프로젝트 자료에 추가했습니다.`)
  }, [showToast])

  // ----- 연계 2: 수집함에 담기 -----
  const stashRule = useCallback((s: Scene, r: Rule) => {
    if (!hasStash()) return
    addToStash({ kind: 'note', label: `${s.label}·${r.name}`, text: ruleLine(s, r) })
    showToast(`수집함에 ‘${r.name}’을(를) 담았습니다.`)
  }, [showToast])

  // ----- 연계 3: 스니펫 라이브러리에 저장 -----
  const snippetRule = useCallback((s: Scene, r: Rule) => {
    addToLibrary('snippets', { text: ruleLine(s, r), source: '예법·금기 사전', tags: [s.label, KIND_LABEL[r.kind].label] })
    showToast(`스니펫으로 ‘${r.name}’을(를) 저장했습니다.`)
  }, [showToast])

  // ----- 연계 4: 관련 도구 열기 -----
  const RELATED: { id: string; label: string }[] = [
    { id: 'anachronism-checker', label: '시대착오 검사기' },
    { id: 'symbolism-dict', label: '상징 사전' },
    { id: 'world-wiki', label: '세계관 위키' },
  ]

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const chip = (on: boolean): React.CSSProperties => ({ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' })

  const kindBadge = (k: Rule['kind']): React.CSSProperties => ({
    fontSize: 10.5, fontWeight: 700, color: KIND_LABEL[k].color,
    border: `1px solid ${KIND_LABEL[k].color}`, borderRadius: 6, padding: '1px 6px', flexShrink: 0,
  })

  return (
    <div style={wrap}>
      <div style={hint}>
        궁중·제례·식사·혼례·장례·접객 등 <b>{SCENES.length}개 상황</b>의 예법·호칭·금기·결례 <b>{total}항</b>을 모았습니다.
        “무엇이 결례인가”를 찾아 갈등·고증 장면에 심어 보세요.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="예법·호칭·금기 검색 (예: 등 돌림, 수저, 흰색, 호칭, 시계)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 상황 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setScene(ALL_KEY)} aria-pressed={scene === ALL_KEY} style={chip(scene === ALL_KEY)}><Emoji e="✨" /> 전체</button>
        {SCENES.map((s) => (
          <button key={s.key} className="minibtn" onClick={() => setScene(s.key)} aria-pressed={scene === s.key} style={chip(scene === s.key)} title={s.intro}>
            <Emoji e={s.icon} /> {s.label}
          </button>
        ))}
      </div>

      {/* 종류 필터 + 무작위 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 뽑기</button>
        {(Object.keys(KIND_LABEL) as Rule['kind'][]).map((k) => (
          <button key={k} className="minibtn" onClick={() => toggleKind(k)} aria-pressed={!!kindFilter[k]} style={chip(!!kindFilter[k])} title={`${KIND_LABEL[k].label}만 보기`}>
            <Emoji e={KIND_LABEL[k].icon} /> {KIND_LABEL[k].label}
          </button>
        ))}
        <span style={{ ...hint, marginLeft: 'auto' }}>{shownCount}항 표시</span>
      </div>

      {/* 관련 도구 열기(연계) */}
      <div className="linkbar">
        <span className="linkbar-label">관련 도구:</span>
        {RELATED.map((t) => (
          <button key={t.id} className="linkbtn" onClick={() => openToolLinked(t.id)} title={`${t.label} 열기`}><Emoji e="🔗" /> {t.label}</button>
        ))}
      </div>

      {/* 무작위 결과 카드 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.scene.icon} /> {random.scene.label}</span>
            <span style={kindBadge(random.rule.kind)}><Emoji e={KIND_LABEL[random.rule.kind].icon} /> {KIND_LABEL[random.rule.kind].label}</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{random.rule.name}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0 8px' }}>{random.rule.body}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(ruleLine(random.scene, random.rule), 'rand')}>{copiedKey === 'rand' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
            <button className="linkbtn" onClick={() => addRuleToProject(random.scene, random.rule)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈예법·금기〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
            <button className="linkbtn" onClick={() => stashRule(random.scene, random.rule)} disabled={!hasStash()} title={hasStash() ? '수집함에 담기' : '수집함을 사용할 수 없습니다'}><Emoji e="📎" /> 수집함</button>
            <button className="linkbtn" onClick={() => snippetRule(random.scene, random.rule)} title="스니펫 라이브러리에 저장"><Emoji e="🧷" /> 스니펫 저장</button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>✓ {toast}</div>
      )}

      {/* 상황별 아코디언 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {groups.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            검색·필터 결과가 없습니다. 다른 말로 찾거나 필터를 해제해 보세요.
          </div>
        ) : (
          groups.map(({ scene: s, rules }) => {
            const open = isOpen(s.key)
            return (
              <div key={s.key} style={card}>
                {/* 상황 헤더(펼침/접기) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    className="minibtn"
                    onClick={() => toggleScene(s.key)}
                    aria-expanded={open}
                    title={open ? '접기' : '펼치기'}
                    style={{ flexShrink: 0 }}
                  >
                    {open ? '▾' : '▸'}
                  </button>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={() => toggleScene(s.key)}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}><Emoji e={s.icon} /> {s.label}
                      {s.era && <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400, marginLeft: 6 }}>{s.era}</span>}
                    </span>
                    <span style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>{s.intro}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{rules.length}항</span>
                  <button
                    className="linkbtn"
                    onClick={() => addSceneToProject(s, rules)}
                    disabled={!hasProjectBridge()}
                    title={hasProjectBridge() ? '이 상황 전체를 한 문서로 프로젝트에 추가' : '프로젝트에 연결되어 있지 않습니다'}
                    style={{ flexShrink: 0 }}
                  >
                    <Emoji e="📄" /> 전체 추가
                  </button>
                </div>

                {/* 규칙 목록 */}
                {open && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    {rules.map((r, i) => {
                      const rid = s.key + '::' + r.name + '::' + i
                      return (
                        <div key={rid} style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
                            <span style={kindBadge(r.kind)}><Emoji e={KIND_LABEL[r.kind].icon} /> {KIND_LABEL[r.kind].label}</span>
                            <span style={{ fontSize: 13.5, fontWeight: 700 }}>{r.name}</span>
                          </div>
                          <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 4 }}>{r.body}</div>
                          {r.tags && r.tags.length > 0 && (
                            <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 4 }}>{r.tags.map((t) => '#' + t).join(' ')}</div>
                          )}
                          <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
                            <button className="minibtn" onClick={() => copy(ruleLine(s, r), rid)}>{copiedKey === rid ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
                            <button className="linkbtn" onClick={() => addRuleToProject(s, r)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈예법·금기〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
                            <button className="linkbtn" onClick={() => stashRule(s, r)} disabled={!hasStash()} title={hasStash() ? '수집함에 담기' : '수집함을 사용할 수 없습니다'}><Emoji e="📎" /> 수집함</button>
                            <button className="linkbtn" onClick={() => snippetRule(s, r)} title="스니펫 라이브러리에 저장"><Emoji e="🧷" /> 스니펫</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>
        <Emoji e="⚖️" /> 예법은 시대·지역·가문마다 다르며 여기 정리는 자작 요약입니다. 작품의 톤·고증에 맞게 비틀거나 어겨서 갈등을 만들어 보세요.
      </div>
    </div>
  )
}
