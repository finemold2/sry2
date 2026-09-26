// 문장·깃발·상징 사전(Heraldry) — 가문·세력 문장의 색·금속·도형·동물·구도와 깃발·인장 관습을 정리한 로컬 자료집.
//  궁정물/판타지의 가문 문장, 진영기, 인장, 가문 구호를 묘사할 때 쓰는 출발점.
//  자급식: react 와 './linkbus' 외 import 없음. 외부 API/네트워크/미디어 없음(전부 로컬 자작 데이터).
//  카테고리 펼침 + 검색 + 무작위 + 클릭복사 + 즐겨찾기 + 문장 생성기(슬롯 조합) + 수집함/스니펫/프로젝트 연계 + faction-builder 열기.
//  ※ 실제 문장학 용어를 참고하되 백과 베끼기 없이 직접 풀어 쓴 요약·창작 표현. 서사용 발상 도구이지 고증 매뉴얼이 아니다.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, addToStash, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'heraldry-ref',
  name: '문장·깃발 사전',
  icon: '🛡️',
  group: '리서치·자료',
  intro: '가문·세력 문장의 색·금속·도형·동물·구도의 의미와 깃발·인장 관습을 정리해 궁정물·판타지의 진영 묘사에 활용',
  w: 700,
  h: 720,
}

// ---------- 항목 형(型) ----------
interface Entry {
  name: string          // 항목명(색·도형·동물 등)
  aka?: string          // 문장학 용어·원어·별칭
  meaning?: string      // 상징하는 덕목·기질
  detail?: string       // 묘사 디테일·작가 메모
  custom?: string       // 관습·쓰임새
  pitfall?: string      // 흔한 오용·주의점
}
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ---------- 로컬 대량 자료집(직접 작성) ----------
const CATS: CatDef[] = [
  {
    key: 'tincture', label: '색·금속(틴크처)', icon: '🎨',
    note: '문장은 두 ‘금속’과 다섯 ‘색’, 그리고 ‘모피 무늬’로 칠한다. 금속 위에 색, 색 위에 금속을 올리는 것이 원칙(금속끼리·색끼리 겹치지 않게 하는 ‘색채 규칙’).',
    items: [
      { name: '금색', aka: 'Or(오르)·금속', meaning: '관대함·고귀함·태양·신의', detail: '노란빛으로 칠하거나 금박을 입힌다. 가장 빛나는 바탕으로, 무게감 있는 짙은 짐승을 올리면 대비가 산다.', custom: '왕가·대공가의 바탕으로 흔하다. ‘금속’이라 그 위에는 색(붉음·푸름)을 올린다.', pitfall: '금색 바탕에 은색 짐승은 금속끼리 겹쳐 금기. 색 짐승을 올려야 한다.' },
      { name: '은색', aka: 'Argent(아전트)·금속', meaning: '순결·평화·진실·결백', detail: '흰빛으로 칠한다. 깨끗하고 차가운 바탕으로 젊은 가문·서약을 강조한 진영에 어울린다.', custom: '금색과 함께 두 ‘금속’ 중 하나. 그 위에는 색을 올린다.', pitfall: '은색 위 금색, 혹은 흰 들판에 노란 짐승은 식별이 어려워 피한다.' },
      { name: '붉은색', aka: 'Gules(귤스)·색', meaning: '용기·무용·정열·순교의 피', detail: '피처럼 짙은 적색. 전사 가문·정복 가문의 단골. 금·은 바탕 위에서 강렬하게 도드라진다.', custom: '가장 호전적인 인상의 색. 군기(軍旗)·정복기에 즐겨 쓴다.', pitfall: '붉은 바탕에 검은 짐승은 색끼리 겹쳐 금기. 금·은의 짐승을 올린다.' },
      { name: '푸른색', aka: 'Azure(애저)·색', meaning: '충성·진실·정의·하늘', detail: '깊은 군청. 신의·충절을 내세우는 가문, 바다·하늘과 연이 있는 세력에 어울린다.', custom: '왕가의 색으로도 흔하다(백합·별을 함께 두는 경우가 많다).', pitfall: '푸름 위 붉음·검음은 색끼리라 금기. 금·은을 올린다.' },
      { name: '검은색', aka: 'Sable(세이블)·색', meaning: '지조·슬픔·신중·불변', detail: '가장 무거운 색. 음모·복수·상실을 안은 가문, 혹은 위엄을 강조한 노가문에 어울린다.', custom: '엄숙·애도의 인상. 흰·금 짐승을 올리면 죽음·재(灰)의 미학이 산다.', pitfall: '검정 위 붉음·푸름은 식별이 어려워 금기. 금속을 올려야 한다.' },
      { name: '초록색', aka: 'Vert(베르)·색', meaning: '희망·기쁨·충성·자연', detail: '짙은 녹색. 숲·풍요의 땅을 가진 가문, 사냥·목축에 기반한 영지에 어울린다.', custom: '비교적 드물어 오히려 개성을 준다. 들판·언덕 무늬와 잘 어울린다.', pitfall: '초록 위 다른 색은 금기. 금·은 짐승으로 또렷이.' },
      { name: '보라색', aka: 'Purpure(퍼퓨어)·색', meaning: '왕권·고귀·통치·소버린', detail: '귀하던 자줏빛. 왕권·성직·고귀한 혈통을 주장하는 가문에 쓴다. 본래 드문 색이라 위세를 더한다.', custom: '제왕·교권과 연결. 자주 쓰면 흔해지므로 한 가문에 강조점으로.', pitfall: '판타지에서 남발하면 ‘귀함’이 희석된다. 한 진영의 정체성으로만.' },
      { name: '담비 모피', aka: 'Ermine(어민)·모피', meaning: '왕족·고위 귀족·권위', detail: '흰 바탕에 검은 꼬리 점을 흩뿌린 무늬. 왕족의 망토·옷깃에서 온 권위의 상징.', custom: '바탕 전체나 일부에 깐다. 단번에 ‘최상위 혈통’을 시각화한다.', pitfall: '하급 가문에 깔면 참람(僭濫)으로 비친다. 격에 맞춰 쓸 것.' },
      { name: '다람쥐 모피', aka: 'Vair(베어)·모피', meaning: '귀족·풍요·방한의 부', detail: '청·은 종(鐘) 모양이 번갈아 맞물린 무늬. 다람쥐 등·배 가죽을 이어 만든 값진 안감에서 왔다.', custom: '바탕 무늬로 깐다. 부유한 무역·영주 가문의 윤택함을 암시.', pitfall: '색 조합을 바꾼 변형(여러 색 베어)도 있으니 한 세계관에서 통일.' },
      { name: '핏빛(상흔)', aka: 'Sanguine(생귄)·드문 색', meaning: '인내·희생·치른 대가', detail: '말린 피 같은 짙은 적갈. 정식 색은 아니나 ‘오욕’ 혹은 상처를 새긴 가문에 극적으로 쓴다.', custom: '드문 색이라 특별한 사연(맹세·치욕·복수)을 가진 진영에 어울린다.', pitfall: '붉은색(귤스)과 혼동되지 않게 더 어둡고 칙칙하게.' },
      { name: '주황(불꽃)', aka: 'Tenné(테니)·드문 색', meaning: '야망·인내·시들지 않는 의지', detail: '갈빛 도는 주황. 정식 일곱 색에는 들지 않는 변방의 색으로, 외래·신흥 세력에 개성을 준다.', custom: '드물게 ‘오욕의 표지(abatement)’로도 쓰였다는 설이 있어 음울한 사연에 어울린다.', pitfall: '금색과 헷갈리지 않게 채도를 낮춰 흙빛으로.' },
    ],
  },
  {
    key: 'ordinary', label: '구획·도형(오디너리)', icon: '🔷',
    note: '방패를 가르거나 띠·십자·산형으로 나누는 굵은 도형들. 가장 오래되고 단순한 문양으로, 한두 개만으로도 위엄을 세운다.',
    items: [
      { name: '가로띠', aka: 'Fess(페스)·중앙 수평대', meaning: '군대 지휘대·견고한 허리·명예의 띠', detail: '방패 한가운데를 가로지르는 굵은 띠. 안정감과 무게중심을 준다.', custom: '하나만 둬도 단정하다. 그 위에 작은 짐승·별을 박아 사연을 더한다.', pitfall: '띠 위에 또 띠를 겹치면 어수선. 단순함이 위엄이다.' },
      { name: '세로띠', aka: 'Pale(페일)·중앙 수직대', meaning: '방어 말뚝·곧은 의지·군사적 강직', detail: '방패를 위아래로 가르는 굵은 기둥. 꼿꼿한 결기를 시각화한다.', custom: '둘로 가르면 ‘둘로 쪼갠 방패(per pale)’가 되어 혼인·연합을 표현.', pitfall: '너무 가늘면 ‘막대(pallet)’로 격이 달라진다.' },
      { name: '빗금띠', aka: 'Bend(벤드)·대각선대', meaning: '기사의 어깨띠·방어·전공', detail: '왼위에서 오른아래로 내려긋는 대각선 띠. 역동적이고 무인다운 인상.', custom: '오른위→왼아래로 그은 것은 ‘역빗금(bend sinister)’으로, 서출(庶出)을 암시하기도 한다.', pitfall: '역빗금을 함부로 쓰면 ‘서자 가문’ 함의가 생기니 의도를 정할 것.' },
      { name: '산형(셰브런)', aka: 'Chevron(셰브런)·∧ 모양', meaning: '지붕·집·보호·완수한 큰일', detail: '거꾸로 된 V자. 한 채의 집·완성된 위업을 떠올리게 한다.', custom: '여러 개를 겹쳐 ‘셰브로넬’로 쌓기도 한다. 건설·완수의 서사에 어울린다.', pitfall: '뒤집힌 ∨(셰브런 리버스드)는 의미가 달라지니 방향을 정확히.' },
      { name: '십자', aka: 'Cross(크로스)·정중앙 +', meaning: '신앙·서약·기사단·수호', detail: '세로·가로띠가 만나는 큰 십자. 종교적 헌신·기사단의 표지로 강력하다.', custom: '끝 모양(끝을 벌린·뾰족한·매듭진)에 따라 수십 변형이 있어 가문마다 다르게 쓴다.', pitfall: '특정 기사단의 십자(예: 갈라진 십자)는 함의가 강하니 세계관에 맞게.' },
      { name: '대각십자', aka: 'Saltire(솔타이어)·X자', meaning: '결의·교차로·수호 성인', detail: 'X자로 가른 큰 십자. 두 길이 만나는 결단, 어떤 지방·성인의 표지로 쓰인다.', custom: '단독으로도 강렬해 진영기에 즐겨 쓴다.', pitfall: '정십자(+)와 의미가 다르니 가문 사연에 맞춰 선택.' },
      { name: '머리띠(치프)', aka: 'Chief(치프)·상단 가로대', meaning: '권위·하사받은 명예·머리(우두머리)', detail: '방패 위쪽을 가로로 두른 넓은 띠. ‘위에서 내린 영예’를 상징해 군주가 하사한 표지를 박는다.', custom: '군공·하사로 받은 별·짐승을 치프에 박는 ‘영예의 증보(augmentation)’가 흔하다.', pitfall: '치프에 박은 표지는 ‘하사받음’의 함의가 강하니 출처 사연을 정할 것.' },
      { name: '테두리', aka: 'Bordure(보듀어)·방패 둘레', meaning: '구별·차자(次子)·보호의 띠', detail: '방패 가장자리를 두른 띠. 본가와 비슷하되 다름을 나타내는 ‘구별 표시’로 쓴다.', custom: '같은 가문의 둘째·셋째가 본가 문장에 테두리를 더해 분가를 표시.', pitfall: '테두리 무늬(점·짐승 박힌)는 분가 서열을 뜻하므로 가계도와 맞출 것.' },
      { name: '안쪽틀(이스커천)', aka: 'Inescutcheon(이네스커천)·작은 방패', meaning: '혼인·상속·또 다른 권리', detail: '방패 한가운데 얹은 작은 방패. 혼인으로 들어온 다른 가문, 혹은 상속한 영지의 권리를 표시.', custom: '여계(女系) 상속·연합을 한 칸으로 보여 주는 강력한 장치.', pitfall: '여러 개 얹으면 복잡. 정치적 함의가 크니 가계 설정과 일치시킬 것.' },
      { name: '마름모(로젠지)', aka: 'Lozenge(로젠지)·◇', meaning: '여성·미혼 상속녀·정숙', detail: '세로로 긴 마름모. 방패 대신 이 꼴에 문장을 그리면 ‘여성의 문장’임을 뜻한다.', custom: '여왕·여공작·미망인의 문장은 흔히 방패 아닌 로젠지에 담는다.', pitfall: '남성 가주에게 로젠지를 쓰면 어긋난다. 인물 성별·신분과 맞출 것.' },
      { name: '둥근방패(라운들)', aka: 'Roundel(라운들)·●', meaning: '동전·재화·완결·태양', detail: '단색 원반. 색에 따라 동전(금)·물방울(은)·포탄 등으로 읽히며 여럿을 흩뿌려 박는다.', custom: '셋·여섯 개를 삼각으로 배치하는 ‘쌓기’가 흔하다. 부·수확·전공을 암시.', pitfall: '개수·배열이 가문 정체성이 되니 임의로 바꾸지 말 것.' },
    ],
  },
  {
    key: 'beast', label: '동물·짐승(차지)', icon: '🦁',
    note: '문장의 주인공. 같은 짐승도 ‘자세(attitude)’에 따라 뜻이 달라진다. 사납게 일어선 자세일수록 호전·야망을 강하게 드러낸다.',
    items: [
      { name: '사자', aka: 'Lion·왕의 짐승', meaning: '용기·왕권·관대함·위엄', detail: '가장 흔하고 격 높은 짐승. 뒷발로 일어서 발톱을 세운 자세(램펀트)가 가장 호전적이다.', custom: '왕가·대가문의 단골. 한 마리만 크게 두거나, 셋을 세로로 늘어세운다(영국식).', pitfall: '걷는 사자(파상)와 일어선 사자(램펀트)는 인상이 크게 다르니 자세를 정할 것.' },
      { name: '독수리', aka: 'Eagle·하늘의 제왕', meaning: '제국·통치·시야·고귀한 권력', detail: '날개를 활짝 편 정면 독수리(디스플레이드)가 제국·황가의 표지로 강력하다. 머리가 둘인 쌍두독수리는 동·서 양 영토를 다스리는 대제국을 뜻한다.', custom: '황제·대제국 진영의 상징. 쌍두독수리는 ‘두 왕관을 쥔 자’의 야망을 단번에 보여 준다.', pitfall: '쌍두독수리는 함의가 매우 강하니 변방 소가문에 붙이면 어색하다.' },
      { name: '그리핀', aka: 'Griffin·사자몸+독수리머리', meaning: '용맹+경계·수호·보물 지킴이', detail: '땅의 왕(사자)과 하늘의 왕(독수리)을 합친 환수. 두 덕을 겸비한 수호자를 상징한다.', custom: '보물·성문·국경을 지키는 가문, 균형과 통찰을 자부하는 진영에 어울린다.', pitfall: '날개 달린 사자(다른 환수)와 혼동하지 말 것. 머리·앞발이 독수리.' },
      { name: '용', aka: 'Dragon·불의 짐승', meaning: '힘·수호·재앙·고대의 권능', detail: '날개와 불을 가진 거대한 환수. 정복·고대 혈통·재앙적 위력을 한 몸에 담는다. 다리 둘에 날개를 가진 ‘와이번’과 구분되기도 한다.', custom: '판타지 대가문·왕조의 상징으로 최강의 무게. 색에 따라 다른 가문(검은 용·붉은 용)으로 갈린다.', pitfall: '용은 위세가 압도적이라 약소 세력엔 과하다. 왕조급에 어울린다.' },
      { name: '늑대', aka: 'Wolf·무리의 짐승', meaning: '경계·결속·끈질김·야성', detail: '굶주린 듯 사나운 인상. 변경·북방·무리의 결속을 자부하는 전사 가문에 어울린다.', custom: '머리만(늑대 두상) 박거나, 일어선 자세로 둔다. 거칠고 충성스러운 기풍.', pitfall: '개(충직·복종)와 인상이 다르니 어느 쪽을 노리는지 정할 것.' },
      { name: '곰', aka: 'Bear·산의 짐승', meaning: '힘·보호·모성·완강함', detail: '거대하고 우직한 인상. 변경의 산악 가문, 묵직한 방어형 세력에 어울린다.', custom: '일어선 곰에 코뚜레·사슬을 채워 ‘길들인 야성’으로 그리기도 한다.', pitfall: '사슬 묶인 곰은 ‘제압·복속’ 함의가 생기니 가문 사연과 맞출 것.' },
      { name: '수사슴', aka: 'Stag/Hart·숲의 짐승', meaning: '평화·민첩·고결·번성', detail: '큰 뿔을 인 우아한 짐승. 사냥터·풍요로운 숲을 가진 가문, 온화하나 빠른 세력에 어울린다.', custom: '뛰는 자세(달리는 수사슴)로 두면 활력이, 멈춰 선 자세면 위엄이 산다.', pitfall: '사납지 않아 호전적 진영엔 약하다. 평화·풍요를 내세울 때.' },
      { name: '말', aka: 'Horse·전쟁의 동력', meaning: '준비됨·속도·기사도·고귀함', detail: '뒷발로 일어선 군마(forcené)가 역동적이다. 기마 전통·기사 가문에 어울린다.', custom: '안장·재갈을 채운 ‘무장한 말’로 군사색을 강조한다.', pitfall: '날개 단 말(페가수스)은 환수라 의미가 달라진다.' },
      { name: '멧돼지', aka: 'Boar·돌격하는 짐승', meaning: '용맹·완강·물러섬 없는 투지', detail: '엄니를 세운 사나운 짐승. 끝까지 싸우는 무인 기질을 상징한다.', custom: '머리만(멧돼지 두상) 박는 경우가 많다. 거친 변경·산악 가문에 어울린다.', pitfall: '멧돼지 머리는 ‘죽인 사냥감’의 표지로도 읽히니 사연을 정할 것.' },
      { name: '뱀', aka: 'Serpent·지혜의 짐승', meaning: '지혜·치유·교활·재생', detail: '자기 꼬리를 문 고리(우로보로스)나 휘감은 뱀으로 영원·순환을 표현한다.', custom: '치유·학문·음모를 자부하는 가문, 혹은 ‘영원한 왕조’를 주장하는 세력에.', pitfall: '교활·배신의 어두운 함의도 강하니 진영 색채와 맞출 것.' },
      { name: '백조', aka: 'Swan·물의 새', meaning: '우아·순결·고귀한 비애', detail: '목에 왕관·사슬을 두른 백조가 고귀한 혈통·서약을 상징한다.', custom: '아름다움·정숙을 내세우는 가문, 비극적 사연을 가진 진영에 어울린다.', pitfall: '사납지 않아 무인 가문엔 약하다. 궁정·예술 가문에 어울린다.' },
      { name: '갈까마귀', aka: 'Raven/Corbie·검은 새', meaning: '예지·죽음·지략·전령', detail: '검은 새로 음험하거나 영민한 인상을 준다. 북방·이교·점복의 색채를 띤 가문에.', custom: '바이킹·북방 진영의 군기에 까마귀를 두는 전통적 인상.', pitfall: '불길·죽음의 함의가 강하니 ‘영민함’을 노린다면 자세로 보완.' },
      { name: '물고기', aka: 'Fish/Pike·물의 짐승', meaning: '풍요·신앙·침묵의 부', detail: '강·바다·어업에 기반한 가문, 신앙(물고기 표지)을 내세운 세력에 어울린다.', custom: '한 마리를 세우거나(헌트, hauriant), 가로로 둔다(나이언트, naiant).', pitfall: '평범해 보이니 색·구도로 개성을 더해야 한다.' },
      { name: '벌', aka: 'Bee·근면의 곤충', meaning: '근면·질서·공동체·달콤한 부', detail: '작지만 여럿을 흩뿌려 박으면 ‘근면한 무리’의 인상이 강하다.', custom: '상공업·신흥 부르주아·근면을 자부하는 가문에 어울린다(특정 제정의 상징으로도).', pitfall: '귀족적 위엄보다 ‘일하는 부’의 인상이라 신흥 세력에 맞는다.' },
    ],
  },
  {
    key: 'attitude', label: '짐승의 자세(애티튜드)', icon: '🐾',
    note: '같은 사자라도 ‘어떤 자세냐’가 그 가문의 기질을 말한다. 사납게 일어설수록 야망·호전, 차분히 앉거나 걸을수록 위엄·통치의 인상.',
    items: [
      { name: '일어선(램펀트)', aka: 'Rampant·뒷발로 일어서 앞발을 든', meaning: '호전·야망·정복욕', detail: '가장 사나운 자세. 옆을 보며 뒷발로 일어서 앞발·발톱을 세운다. 정복·전쟁 가문의 단골.', custom: '한 마리를 방패 가득 크게 두면 압도적이다. 야망 큰 진영에.', pitfall: '온화함을 노리는 가문엔 과격하다.' },
      { name: '걷는(파상)', aka: 'Passant·한 발을 들고 걷는', meaning: '경계·통치·당당한 행보', detail: '네 발로 걸으며 옆을 보는 자세. 영국 왕가의 ‘세 마리 사자’가 이 자세다. 위엄과 절제를 함께 준다.', custom: '여러 마리를 세로로 늘어세워 ‘대대로 다스림’을 표현.', pitfall: '램펀트만큼 호전적이지 않으니 ‘통치 가문’ 인상에 맞춘다.' },
      { name: '앉은(세전트)', aka: 'Sejant·앉아 정면·측면을 보는', meaning: '경계·판관·차분한 권위', detail: '엉덩이를 붙이고 앉아 주변을 살피는 자세. 재판·심판·신중을 내세우는 가문에.', custom: '앞발을 든 변형(세전트 이렉트)으로 ‘준비된 권위’를 표현하기도.', pitfall: '정적인 인상이라 무인 가문엔 약하다.' },
      { name: '뛰어오르는(살리언트)', aka: 'Salient·두 뒷발로 도약하는', meaning: '돌격·기습·맹렬함', detail: '두 뒷발을 모아 앞으로 도약하는 자세. 사슴·표범 등에 어울려 ‘덮치는 순간’을 그린다.', custom: '기동·기습을 자부하는 가문, 사냥 짐승에 어울린다.', pitfall: '사자엔 드물게 쓰인다. 보통 램펀트가 표준.' },
      { name: '엎드린(쿠첸트)', aka: 'Couchant·발을 접고 엎드려 깬', meaning: '경계 속 휴식·잠재된 힘', detail: '엎드렸으되 머리를 들어 살피는 자세. ‘쉬되 잠들지 않는’ 잠재력을 상징.', custom: '내실을 다지는 가문, 힘을 감춘 세력에 어울린다.', pitfall: '약해 보일 수 있으니 ‘잠재된 위협’의 사연으로 보완.' },
      { name: '정면을 본(가던트)', aka: 'Gardant·고개를 보는 이쪽으로', meaning: '경계·정면 응시·당당함', detail: '몸은 옆, 얼굴은 정면을 보는 변형. 보는 이를 똑바로 응시해 위압감을 더한다.', custom: '‘파상 가던트’(걷되 정면 응시)는 강한 군주의 인상.', pitfall: '뒤를 보는 변형(리가던트)은 ‘경계·의심’의 함의가 다르다.' },
      { name: '날개 편(디스플레이드)', aka: 'Displayed·정면으로 날개를 활짝', meaning: '제국·통치·과시', detail: '주로 독수리. 정면을 보며 두 날개를 활짝 펴 영토·권력을 과시한다.', custom: '황가·대제국 진영의 표준 자세. 쌍두독수리와 결합해 위세를 극대화.', pitfall: '소가문엔 과하다. 제국급에 어울린다.' },
    ],
  },
  {
    key: 'charge', label: '인공물·기물(차지)', icon: '⚜️',
    note: '짐승 외에 박는 사물들. 무기·도구·상징물은 그 가문의 생업·서약·전공을 압축해 보여 준다.', items: [
      { name: '백합(플뢰르드리스)', aka: 'Fleur-de-lis·정형화한 붓꽃', meaning: '순결·왕권·신앙·완성', detail: '세 갈래로 정형화한 백합. 왕가의 상징으로 가장 격 높은 기물 중 하나.', custom: '바탕에 흩뿌리거나(세메), 셋을 모아 둔다. 왕통·신성을 주장하는 가문에.', pitfall: '특정 왕조의 강한 함의가 있으니 남발하면 ‘왕족 흉내’로 비친다.' },
      { name: '왕관', aka: 'Crown/Coronet·관(冠)', meaning: '주권·서열·하사된 지위', detail: '관의 형태(아치·보석·잎)가 작위 서열을 나타낸다. 짐승의 목에 두르거나 방패 위에 얹는다.', custom: '문장 위 ‘관’의 종류로 공·후·백의 격을 시각화. 군주만 닫힌 왕관(아치형).', pitfall: '작위에 맞지 않는 관을 쓰면 참람이다. 서열표와 맞출 것.' },
      { name: '검', aka: 'Sword·무기', meaning: '정의·무력·서약·심판', detail: '곧추세운 검은 결의를, 가로 누인 검은 절제·평정을 뜻한다. 두 자루 교차는 무문(武門).', custom: '검 끝의 방향(위·아래)이 의미를 가른다. 위는 공격적, 아래는 평화의 맹세.', pitfall: '피 묻은 검(distilling)은 ‘치른 살육’의 어두운 함의.' },
      { name: '탑·성', aka: 'Tower/Castle·요새', meaning: '방어·영지·견고함·항구함', detail: '성탑은 한 영지·요새의 지배를 상징한다. 성문이 열렸나 닫혔나로 인상이 달라진다.', custom: '변경 방어 가문, 한 성을 다스리는 영주의 표지로 직관적이다.', pitfall: '여러 탑을 박으면 복잡. 하나를 크게 두는 편이 위엄.' },
      { name: '열쇠', aka: 'Key·맡김의 표지', meaning: '권한·수호·비밀·관리', detail: '두 열쇠 교차는 ‘하늘·땅의 권한’을 맡았음을 뜻하기도(성직). 금고·성문·기록의 수호.', custom: '재무·기록·성문을 관리하는 가문, 성직 진영에 어울린다.', pitfall: '교차 열쇠는 성직 함의가 강하니 세속 가문엔 단독으로.' },
      { name: '별', aka: 'Star/Mullet·다섯·여섯 갈래', meaning: '명예·지도·하늘의 인도', detail: '다섯 갈래(멀릿)는 기사의 박차에서, 여섯 갈래는 별을 뜻하기도. 차자(次子)를 나타내는 ‘구별 표시’로도.', custom: '하사받은 영예의 표지로 치프에 박거나 흩뿌린다.', pitfall: '갈래 수·구멍 유무가 의미를 가르니 일관되게 그릴 것.' },
      { name: '초승달', aka: 'Crescent·달', meaning: '희망·증대·둘째 아들', detail: '뿔이 위를 향한 초승달. 동방·바다와의 연, 혹은 가문 내 둘째의 ‘구별 표시’.', custom: '본가와 구별하는 차자의 표지(cadency)로 표준적으로 쓴다.', pitfall: '차자 표시로 쓰면 가계 서열을 뜻하니 임의로 붙이지 말 것.' },
      { name: '닻', aka: 'Anchor·바다의 표지', meaning: '희망·항구함·해상의 힘', detail: '해운·항해에 기반한 가문, ‘흔들리지 않는 희망’을 내세운 세력에 어울린다.', custom: '항구 도시·해군 가문의 직관적 표지.', pitfall: '내륙 가문에 닻은 어색하다. 지리와 맞출 것.' },
      { name: '해·달', aka: 'Sun/Moon·천체', meaning: '영광·진실·주기·신성', detail: '얼굴을 그린 ‘영광의 해(sun in splendour)’는 광휘·진실을, 초승달·보름달은 주기·신비를 상징.', custom: '왕권의 광휘를 자부하는 가문, 점복·신비를 내세운 진영에.', pitfall: '얼굴 있는 해는 강한 왕권 함의가 있으니 격에 맞춰.' },
      { name: '손(피의 손)', aka: 'Hand·붉은 손', meaning: '서약·맹세·치른 대가', detail: '펼친 붉은 손바닥. 어떤 지방·작위의 표지이자, 서약·혈맹·죄값의 상징으로 극적이다.', custom: '강한 사연(맹세·치욕)을 가진 가문, 특정 작위의 증보로 박는다.', pitfall: '함의가 매우 강하니 가문 사연 없이 붙이지 말 것.' },
      { name: '심장', aka: 'Heart·붉은 심장', meaning: '충정·사랑·바친 마음', detail: '대개 붉은 심장. ‘바친 충성’ 혹은 ‘맡긴 마음’을 상징한다. 왕관 두른 심장은 충신의 표지.', custom: '왕에게 충성을 바친 가문, 헌신의 사연을 가진 진영에.', pitfall: '낭만적 ‘사랑’보다 ‘충성·헌신’의 무게로 읽히게 색·관을 더해.' },
      { name: '바퀴·톱니', aka: 'Wheel/Catherine wheel·바퀴', meaning: '순교·노동·운명의 순환', detail: '날 달린 바퀴는 순교·시련을, 일반 바퀴는 운수·생업을 상징한다.', custom: '장인·기술 가문, 순교 사연을 가진 진영에.', pitfall: '날 달린 바퀴는 순교의 강한 함의가 있으니 가문 서사와 맞출 것.' },
    ],
  },
  {
    key: 'arrangement', label: '구획·구도·분할', icon: '⬛',
    note: '방패를 어떻게 나누고 무엇을 어디에 두느냐. 분할은 혼인·연합·상속을 한 칸으로 보여 주는 정치 언어다.',
    items: [
      { name: '세로 분할', aka: 'Per pale·방패를 좌우로', meaning: '혼인·연합·두 가문의 결합', detail: '방패를 세로로 갈라 왼쪽에 남편, 오른쪽에 아내 가문의 문장을 둔다(임페일먼트).', custom: '혼인으로 두 가문이 맺어졌음을 단번에 보여 주는 표준 방식.', pitfall: '좌우 배치(누가 왼쪽인가)에 서열 함의가 있으니 일관되게.' },
      { name: '가로 분할', aka: 'Per fess·방패를 위아래로', meaning: '두 영지·하늘과 땅·계승', detail: '방패를 가로로 갈라 위·아래에 다른 문양을 둔다. 두 영지·두 권리의 결합.', custom: '위쪽에 하늘(해·별), 아래쪽에 땅(언덕·짐승)으로 구도를 짜기도.', pitfall: '위·아래 어느 쪽이 본가인지 정해 두지 않으면 혼란.' },
      { name: '네 칸 분할', aka: 'Quarterly·넷으로 나눔', meaning: '여러 가문·상속·제국적 권리', detail: '방패를 사분(四分)해 네 가문·네 영지의 문장을 모은다. 큰 상속·정략혼의 누적.', custom: '대가문일수록 칸이 늘어 ‘대대로 모은 권리’를 과시한다.', pitfall: '칸이 많을수록 복잡·산만. 핵심 넷만 또렷이 두는 편이 위엄.' },
      { name: '대각 분할', aka: 'Per bend·대각선으로', meaning: '역동·신흥·구별', detail: '방패를 대각으로 갈라 두 색·두 문양을 둔다. 신흥 가문의 개성에 어울린다.', custom: '왼위→오른아래(per bend)와 그 반대(sinister)로 인상이 다르다.', pitfall: '역대각(sinister)은 서출 함의가 따라올 수 있다.' },
      { name: '흩뿌림', aka: 'Semé·바탕 가득 작은 무늬', meaning: '풍요·무수·하늘', detail: '백합·별·심장 같은 작은 기물을 바탕 가득 흩뿌린다. ‘헤아릴 수 없는’ 풍요·신성.', custom: '백합 흩뿌림(semé-de-lis)은 왕권의 강한 인상.', pitfall: '특정 흩뿌림(백합)은 왕조 함의가 강하니 격에 맞게.' },
      { name: '대칭 배치(3·2·1)', aka: 'In pile/orle·삼각·둘레', meaning: '균형·질서·완결', detail: '같은 기물을 셋·둘·하나로 삼각 배치하거나, 방패 둘레를 따라 늘어세운다.', custom: '둥근방패·별·짐승 머리를 ‘2와 1’로 두는 배치가 가장 안정적.', pitfall: '개수와 배열이 가문 정체성이므로 임의 변경 금물.' },
    ],
  },
  {
    key: 'achievement', label: '문장 전체 구성(어치브먼트)', icon: '🏆',
    note: '방패만이 문장이 아니다. 투구·깃털 장식·받침 짐승·구호·관·망토까지 갖춘 ‘완전한 문장’의 부속들.',
    items: [
      { name: '방패(에스커천)', aka: 'Escutcheon/Shield·중심', meaning: '가문의 본체·정체성', detail: '문장의 심장. 색·도형·짐승이 모두 여기에 담긴다. 나머지는 이 방패를 둘러싼 장식.', custom: '방패꼴(영국·이탈리아·여성용 로젠지)이 지역·신분을 드러낸다.', pitfall: '여성·성직자는 방패 대신 다른 꼴(로젠지·타원)을 쓰기도.' },
      { name: '투구(헬름)', aka: 'Helm·방패 위 투구', meaning: '신분·서열·무인의 격', detail: '방패 위에 얹은 투구. 정면을 향했나 옆을 봤나, 살(바이저)이 몇 개인가로 서열을 나타낸다.', custom: '왕은 정면 황금 투구, 기사는 옆을 본 강철 투구—격이 한눈에 갈린다.', pitfall: '신분에 안 맞는 투구는 참람. 작위·기사 여부와 맞출 것.' },
      { name: '깃털 장식(크레스트)', aka: 'Crest·투구 위 장식', meaning: '가문의 별칭·전공·개성', detail: '투구 위에 얹은 입체 장식(짐승·날개·손·깃털). 방패와 별개로 가문을 식별하는 ‘제2의 표지’.', custom: '인장·깃발엔 크레스트만 단독으로 쓰기도 한다(간략한 표지).', pitfall: '크레스트는 방패와 다른 짐승일 수 있으니 둘을 헷갈리지 말 것.' },
      { name: '받침 짐승(서포터)', aka: 'Supporter·방패 양옆 짐승', meaning: '왕족·고위·하사된 영예', detail: '방패 좌우에서 떠받치는 한 쌍의 짐승(사자·유니콘·야인 등). 본래 왕·최고위 귀족만의 특권.', custom: '한 쌍으로 두며, 가문의 기질·동맹을 상징하는 짐승을 고른다.', pitfall: '서포터는 최상위의 특권이라 소가문에 붙이면 참람으로 비친다.' },
      { name: '구호(모토)', aka: 'Motto·가문의 표어', meaning: '신념·서약·기개', detail: '방패 아래(혹은 위) 띠에 새긴 짧은 문구. 가문의 정신을 한 줄로 압축한다.', custom: '대개 고어·라틴풍의 짧은 격언. 세계관에 맞춘 자작 구호를 새긴다.', pitfall: '너무 길거나 현대적이면 위엄이 깎인다. 짧고 묵직하게.' },
      { name: '망토(맨틀링)', aka: 'Mantling·투구에서 늘어진 천', meaning: '전장의 흔적·격식', detail: '투구에서 흘러내려 방패를 감싸는 찢긴 천. 전장에서 칼에 베인 천을 표현해 무용을 암시.', custom: '바깥은 가문의 주색, 안쪽은 금속색으로 칠하는 것이 관습.', pitfall: '색을 임의로 쓰면 가문색과 어긋난다. 주색·금속색을 따를 것.' },
      { name: '관(코러닛)', aka: 'Coronet/Crown·방패·투구 위 관', meaning: '작위 서열의 직접 표시', detail: '문장 위에 얹은 관의 종류(아치·보석·잎 수)가 공·후·백·자·남을 정확히 나타낸다.', custom: '닫힌(아치형) 왕관은 군주만, 잎·구슬의 수로 귀족 등급을 가린다.', pitfall: '관의 형태가 곧 작위 선언이니 인물 신분과 정확히 맞출 것.' },
    ],
  },
  {
    key: 'flag', label: '깃발·군기·인장 관습', icon: '🚩',
    note: '문장이 천·밀랍으로 옮겨가면 ‘깃발’과 ‘인장’이 된다. 형태·게양·날인 방식에 가문의 위세와 의도가 담긴다.',
    items: [
      { name: '가문기(배너)', aka: 'Banner·정사각 깃발', meaning: '가주의 임재·본진', detail: '방패 문양을 그대로 옮긴 정사각(혹은 세로로 긴) 깃발. 이 깃발이 선 곳이 곧 가주의 본진이다.', custom: '가주가 직접 출진한 천막·성루에만 올린다. 내려가면 가주의 부재·낙성을 뜻한다.', pitfall: '가주 부재 중 배너를 올리면 거짓 임재. 위세 과시의 무기이자 책임.' },
      { name: '제비꼬리기(펜넌)', aka: 'Pennon·끝이 갈라진 작은 기', meaning: '기사 개인·창끝의 표지', detail: '창끝에 다는 작고 끝이 갈라진 깃발. 한 기사 개인의 표지로, 전공을 세우면 끝을 잘라 ‘배너렛’으로 승격.', custom: '기사 서임·승급의 의례에서 깃발 끝을 자르는 장면이 극적이다.', pitfall: '배너(가주)와 펜넌(개인 기사)의 격을 헷갈리지 말 것.' },
      { name: '긴 깃발(스탠더드)', aka: 'Standard·길게 늘어진 깃발', meaning: '집결지·가문의 위세', detail: '아주 길게 늘어진 깃발로, 가문 색·짐승·구호를 늘어 새긴다. 군세의 집결지를 표시.', custom: '성벽·천막 위에 길게 늘어뜨려 멀리서도 소속을 알린다.', pitfall: '배너(방패 그대로)와 달리 ‘색·구호’ 중심임을 기억할 것.' },
      { name: '인장 반지', aka: 'Signet ring·날인 반지', meaning: '가주의 권한·친서의 진위', detail: '문장(흔히 크레스트)을 음각한 반지. 밀랍에 눌러 ‘이 명령이 진짜 가주의 뜻’임을 증명한다.', custom: '반지를 넘기는 것은 권한 위임. 빼앗기면 위조 명령이 나돈다—음모의 단골 장치.', pitfall: '인장이 도난·복제되는 설정은 서사적 긴장을 만든다(진위 다툼).' },
      { name: '밀랍 봉인', aka: 'Wax seal·문서 봉인', meaning: '봉서의 진위·미개봉의 증거', detail: '접은 문서에 녹인 밀랍을 떨어뜨려 인장으로 누른다. 색(붉은 밀랍=공문, 검은 밀랍=흉보)으로도 의미를 준다.', custom: '깨진 봉인은 ‘이미 열어본 친서’—배신·도청의 단서가 된다.', pitfall: '밀랍 색의 관습은 세계관마다 다르니 한 작품에서 통일.' },
      { name: '문장관(허랄드)', aka: 'Herald·문장 관리관', meaning: '문장의 등록·진위·서열 판정', detail: '가문 문장을 등록·심사하고, 행사·전령으로 서열을 선포하는 관리. ‘누가 어떤 문장을 쓸 자격이 있나’를 판정한다.', custom: '새 가문이 문장을 받으려면 문장관의 허가가 필요—신흥 세력의 갈등 소재.', pitfall: '문장은 아무나 못 짓는다. 등록·하사 절차가 이야기의 권력 장치.' },
      { name: '문장 도용·찬탈', aka: 'Usurpation·남의 문장 사용', meaning: '참람·반역·정체성 도둑질', detail: '쓸 자격 없는 자가 왕가·대가문의 문장(특히 백합·서포터·왕관)을 쓰는 것. 중대한 죄로 다뤄진다.', custom: '몰락 가문의 문장을 차지하거나, 사생아가 본가 문장을 노리는 분쟁의 씨앗.', pitfall: '판타지에선 ‘문장 도용=선전포고’급 사건으로 키울 수 있다.' },
      { name: '오욕의 표지(어베이트먼트)', aka: 'Abatement·치욕의 변형', meaning: '불명예·강등·죄의 낙인', detail: '비겁·반역·거짓의 죄를 지은 가문의 문장에 ‘흠집’(뒤집힌 무늬·칙칙한 색)을 더해 치욕을 박는 관습.', custom: '실제로는 드물었다지만, 서사에선 ‘낙인찍힌 가문’의 강력한 시각 장치.', pitfall: '실존 빈도는 낮으니 ‘이 세계의 관습’으로 설정해 두면 자연스럽다.' },
      { name: '문장 합치기(마셜링)', aka: 'Marshalling·여러 문장 결합', meaning: '혼인·상속·동맹의 누적', detail: '여러 가문 문장을 한 방패에 분할·결합하는 기술 전반(임페일·사분 등). 정치사를 한 면에 압축한다.', custom: '한 가문의 방패를 읽으면 그 집안의 혼맥·상속사가 보인다—작가의 ‘숨은 연표’.', pitfall: '결합이 많을수록 복잡. 독자가 읽을 수 있게 핵심만.' },
    ],
  },
]

const LS = 'sry:tool:heraldry-ref:'
const ALL_KEY = '__all__'

type Flat = { cat: CatDef; item: Entry }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

// ---------- 한국어 조사 헬퍼(받침 판정) ----------
// 괄호·따옴표·숫자·영문 등으로 끝나는 항목도 있으므로, '마지막 발음 글자'(한글 음절 또는
// 숫자/영문)를 찾아 그 한글 독음의 종성(받침)을 본다. 예: '…1)' → '일'(ㄹ 받침) → '을'.
// jong: 종성 코드(0=받침없음, 8=ㄹ받침, 그 외 양수=다른 받침). 판정 불가 시 0(받침없음)으로 본다.
const DIGIT_JONG: Record<string, number> = {
  // 0영(ㅇ) 1일(ㄹ) 2이(없음) 3삼(ㅁ) 4사(없음) 5오(없음) 6육(ㄱ) 7칠(ㄹ) 8팔(ㄹ) 9구(없음)
  '0': 21, '1': 8, '2': 0, '3': 16, '4': 0, '5': 0, '6': 1, '7': 8, '8': 8, '9': 0,
}
const LETTER_JONG: Record<string, number> = {
  // 알파벳 한글 독음의 종성: 받침 있는 것만 표기(나머지는 0).
  // b비 c시 d디 e이 f에프(ㅍ) g지 h에이치 i아이 j제이 k케이 l엘(ㄹ) m엠(ㅁ) n엔(ㄴ)
  // o오 p피 q큐 r아르(ㄹ) s에스(ㅅ) t티 u유 v브이 w더블유 x엑스(ㅅ) y와이 z제트(ㅌ)
  f: 17, l: 8, m: 16, n: 4, r: 8, s: 19, x: 19, z: 20,
}
// 마지막 발음 글자의 종성 코드를 구한다(꼬리의 괄호·따옴표·공백·중점 등은 건너뛴다).
const lastJong = (s: string): number => {
  for (let i = s.length - 1; i >= 0; i--) {
    const ch = s[i]
    const c = s.charCodeAt(i)
    if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28   // 한글 음절
    if (ch >= '0' && ch <= '9') return DIGIT_JONG[ch]          // 숫자
    const low = ch.toLowerCase()
    if (low >= 'a' && low <= 'z') return LETTER_JONG[low] ?? 0  // 영문
    // 그 외(괄호·따옴표·공백·구두점)는 건너뛴다
  }
  return 0
}
const hasBatchim = (s: string): boolean => lastJong(s) !== 0
// 받침 유무로 조사를 골라 단어에 붙인다. (을/를, 이/가, 은/는, 와/과)
const josa = (word: string, withB: string, noB: string): string => word + (hasBatchim(word) ? withB : noB)
const eulReul = (w: string) => josa(w, '을', '를')        // 목적격
const euiRo = (w: string) => {
  // '으로/로': 받침이 없거나 ㄹ 받침(종성 8)이면 '로', 그 외엔 '으로'
  const jong = lastJong(w)
  return w + (jong === 0 || jong === 8 ? '로' : '으로')
}

// ---------- 문장 생성기 슬롯(슬롯 조합 무작위) ----------
// 모든 풀은 '고유 항목'만 포함하며, 각 슬롯은 의미상 독립적이다(다른 슬롯을 전제하지 않음).
// field: 방패 바탕(들판) — 단색·모피·분할 바탕(명사구, '~ 방패에' 자리)
const SLOT_FIELD = [
  '금빛 바탕', '은빛 바탕', '붉은 바탕', '푸른 바탕', '검은 바탕', '초록 바탕', '보랏빛 바탕', '주황빛 바탕',
  '담비 모피 바탕', '다람쥐 모피 바탕', '핏빛 상흔의 바탕',
  '세로로 가른(금·검) 바탕', '가로로 가른(은·붉) 바탕', '대각으로 가른(푸름·금) 바탕', '넷으로 사분한 바탕',
  '백합을 흩뿌린 푸른 바탕', '별을 흩뿌린 검은 바탕', '물결무늬 푸른 바탕', '톱니무늬로 가른 바탕', '비늘무늬 은빛 바탕',
  '체크무늬(금·붉) 바탕', '쐐기로 가른 바탕', '둘레를 두른 초록 바탕', '햇살처럼 갈라진 바탕',
]
// ordinary: 방패를 가르는 굵은 도형(명사구, '~를 두르고' 자리)
const SLOT_ORDINARY = [
  '중앙 가로띠', '곧추선 세로띠', '대각 빗금띠', '∧자 산형', '큰 십자', 'X자 대각십자',
  '상단 머리띠(치프)', '방패 둘레 테두리', '가운데 작은 방패', '둥근방패 셋(2와 1)',
  '가는 막대 셋', '쌍산형(겹친 ∧)', '갈고리 십자', '뾰족한 십자', '물결 가로띠',
  '톱니 가로띠', '하단 받침띠', '좁은 빗금 둘', '안쪽 둘레선(오를)', '구획 없이 바탕만',
]
// charge: 방패의 주문양(명사/명사구, 색을 앞에 붙여 쓰는 자리)
const SLOT_CHARGE = [
  '일어선 사자', '걷는 사자 셋', '날개 편 독수리', '쌍두독수리', '수호하는 그리핀', '불을 뿜는 용',
  '사나운 늑대', '우직한 곰', '뿔 인 수사슴', '돌격하는 멧돼지', '휘감은 뱀', '왕관 두른 백조',
  '날개 펼친 갈까마귀', '세운 물고기', '벌 떼', '교차한 두 검', '곧추선 검', '백합 셋',
  '성탑 하나', '교차한 두 열쇠', '다섯 갈래 별 셋', '초승달 하나', '닻 하나',
  '얼굴 그린 영광의 해', '붉은 손바닥', '왕관 두른 심장',
]
// tincture: 주문양의 색(관형사형, '~ 사자' 처럼 charge 앞에 붙음) — 문장학 7색+모피 한정이라 고유 8종 유지
const SLOT_TINCTURE = ['금빛', '은빛', '붉은', '푸른', '검은', '초록빛', '보랏빛', '핏빛']
// charge 의 배치/자세(명사구, charge 뒤에 자연스레 붙음) — 새 슬롯, 다른 슬롯과 독립
const SLOT_BEARING = [
  '하나를 방패 가득 크게 둔', '둘을 마주 세운', '셋을 2와 1로 모은', '바탕 가득 흩뿌린',
  '정면을 응시하게 둔', '머리만 떼어 박은', '둘레를 따라 늘어세운', '치프에 박은',
  '왕관을 씌운', '사슬로 묶은', '뒤를 돌아보게 둔', '한가운데 도드라지게 둔',
  '대각으로 비스듬히 둔', '거꾸로 뒤집어 둔',
]
// achieve: 방패를 둘러싼 부속(명사구, '위에는 ~' 자리)
const SLOT_ACHIEVE = [
  '정면 황금 투구에 왕관', '옆을 본 강철 투구', '깃털 크레스트', '날개 모양 크레스트',
  '한 쌍의 받침 사자', '한 쌍의 받침 유니콘', '한 쌍의 받침 야인', '한 쌍의 받침 그리핀',
  '늘어뜨린 찢긴 망토', '작위를 새긴 관', '받침대를 딛고 선 짐승 한 쌍', '두 깃대를 교차한 장식',
  '월계관을 두른 방패', '아무 부속 없이 방패만',
]
// flag: 깃발·인장으로 옮길 때의 형태(명사구, '~ 형태로 내건다' 자리) — 새 슬롯, 독립
const SLOT_FLAG = [
  '정사각 가문기', '세로로 긴 가문기', '끝이 갈라진 제비꼬리기', '길게 늘어진 스탠더드',
  '삼각 전투기', '두 갈래 군기', '밀랍에 누른 둥근 인장', '음각한 인장 반지',
  '창끝의 작은 펜넌', '성루에 내건 큰 배너', '띠 모양 표어기', '둘로 접은 봉서의 봉인',
]
// motto: 가문 구호(완결된 표어 — 명사 자리에 쓰지 않고 '구호는 ~' 인용 자리에만 둔다)
const SLOT_MOTTO = [
  '“부러질지언정 굽히지 않는다”', '“우리는 기억한다”', '“불 속에서 단련된다”', '“그림자 속에서 지킨다”',
  '“피로 맺은 약속”', '“끝까지 선다”', '“침묵이 우리의 검”', '“태어난 곳으로 돌아간다”',
  '“두려움 없이 그러나 자만 없이”', '“겨울을 견딘 뿌리”', '“바다는 우리의 길”', '“하늘이 무너져도”',
  '“약속한 것은 지킨다”', '“밤보다 깊은 충절”', '“무너진 곳에서 다시”', '“빛은 동에서 온다”',
  '“검을 들되 먼저 뽑지 않는다”', '“돌처럼 굳건히”', '“바람을 거슬러 오른다”', '“대가는 우리가 치른다”',
  '“늦더라도 반드시”', '“뿌리는 깊고 가지는 넓게”', '“한 번 한 맹세”', '“불씨를 꺼뜨리지 않는다”',
  '“강은 바위를 깎는다”', '“높이 날아 멀리 본다”', '“섬기되 굴종하지 않는다”', '“겨울 끝에 봄”',
  '“말보다 행함으로”', '“끝까지 함께”',
]

type Slots = { field: string; ordinary: string; charge: string; tincture: string; bearing: string; achieve: string; flag: string; motto: string }
const SLOT_DEFS: { key: keyof Slots; label: string; pool: string[] }[] = [
  { key: 'field', label: '바탕(들판)', pool: SLOT_FIELD },
  { key: 'ordinary', label: '구획·도형', pool: SLOT_ORDINARY },
  { key: 'charge', label: '주문양(차지)', pool: SLOT_CHARGE },
  { key: 'tincture', label: '문양 색', pool: SLOT_TINCTURE },
  { key: 'bearing', label: '문양 배치', pool: SLOT_BEARING },
  { key: 'achieve', label: '문장 부속', pool: SLOT_ACHIEVE },
  { key: 'flag', label: '깃발·인장', pool: SLOT_FLAG },
  { key: 'motto', label: '가문 구호', pool: SLOT_MOTTO },
]
const COMBOS = SLOT_DEFS.reduce((n, s) => n * s.pool.length, 1)
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]

function blazon(s: Slots): string {
  // 자작 ‘설명문(blazon 풍)’ — 슬롯을 한 문장으로 엮는다. 조사는 받침에 맞춰 골라 붙인다.
  // charge 자리: '<색> <자세로 둔> <주문양>을/를' (명사구) — 색은 관형사형, 배치는 관형절로 자연 결합.
  const charge = `${s.tincture} ${s.bearing} ${s.charge}`
  const base = `${s.field} 방패에 ${eulReul(charge)} 새기고`
  const ord = s.ordinary === '구획 없이 바탕만' ? '' : `, ${eulReul(s.ordinary)} 둘렀다`
  // 구획이 없으면 charge 절을 마무리하는 종결을 붙인다(항상 완결 문장이 되도록).
  const head = ord ? `${base}${ord}` : `${base.replace(/새기고$/, '새겼다')}`
  const ach = s.achieve === '아무 부속 없이 방패만' ? '' : ` 위에는 ${eulReul(s.achieve)} 얹었다.`
  const flag = ` 이 문장은 ${euiRo(s.flag)} 내건다.`
  return `${head}.${ach}${flag} 가문 구호는 ${s.motto}.`
}

const escapeHtml = (str: string) =>
  String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function HeraldryRef({ payload }: { payload?: Record<string, unknown> }) {
  const [tab, setTab] = useState<'dict' | 'forge'>('dict')

  // ----- 사전 상태 -----
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [random, setRandom] = useState<Flat | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // ----- 생성기 상태 -----
  const [slots, setSlots] = useState<Slots>(() => {
    try {
      const raw = localStorage.getItem(LS + 'slots')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return { ...rollAll(), ...o } as Slots }
    } catch { /* ignore */ }
    return rollAll()
  })
  const [locks, setLocks] = useState<Record<keyof Slots, boolean>>(() => ({
    field: false, ordinary: false, charge: false, tincture: false, bearing: false, achieve: false, flag: false, motto: false,
  }))
  const [houseName, setHouseName] = useState('')

  // 타이머/타임아웃 정리용
  const timers = useRef<number[]>([])
  const setTimer = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms)
    timers.current.push(id)
    return id
  }, [])
  useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = [] }, [])

  // payload(다른 도구가 전달한 가문명 등) 반영
  useEffect(() => {
    if (!payload) return
    const t = (payload.title || payload.house || payload.name) as string | undefined
    if (t && typeof t === 'string') { setTab('forge'); setHouseName(t) }
  }, [payload])

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])
  useEffect(() => { try { localStorage.setItem(LS + 'slots', JSON.stringify(slots)) } catch { /* ignore */ } }, [slots])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  const favKey = (catKey: string, name: string) => `${catKey}::${name}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base: Flat[] = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[favKey(c.key, item.name)])
    if (q) {
      base = base.filter(({ item }) =>
        [item.name, item.aka, item.meaning, item.detail, item.custom, item.pitfall]
          .filter(Boolean).some((s) => (s as string).toLowerCase().includes(q)))
    }
    return base
  }, [query, cat, onlyFav, favs])

  const rollDictRandom = useCallback(() => {
    const pool = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let p = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && p.item.name === prev.item.name && p.cat.key === prev.cat.key) {
        p = pool[Math.floor(Math.random() * pool.length)]
      }
      return p
    })
  }, [cat])

  const toggleFav = (catKey: string, name: string) => {
    const k = favKey(catKey, name)
    setFavs((prev) => { const n = { ...prev }; if (n[k]) delete n[k]; else n[k] = true; return n })
  }
  const toggleExpand = (k: string) => setExpanded((p) => ({ ...p, [k]: !p[k] }))

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      setTimer(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* graceful */ })
  }

  const entryText = (f: Flat): string => {
    const it = f.item
    const lines = [`🛡️ ${f.cat.icon} ${f.cat.label} · ${it.name}${it.aka ? ` (${it.aka})` : ''}`]
    if (it.meaning) lines.push(`상징: ${it.meaning}`)
    if (it.detail) lines.push(`묘사: ${it.detail}`)
    if (it.custom) lines.push(`관습: ${it.custom}`)
    if (it.pitfall) lines.push(`주의: ${it.pitfall}`)
    return lines.join('\n')
  }

  // ----- 연계 -----
  const toStash = (f: Flat) => {
    if (!hasStash()) return
    addToStash({ kind: 'note', label: `문장 자료 · ${f.item.name}`, text: entryText(f) })
    flash(`수집함에 ‘${f.item.name}’ 자료를 담았습니다.`)
  }
  const toSnippet = (f: Flat) => {
    addToLibrary('snippets', { text: entryText(f), tags: ['문장', f.cat.label], source: 'heraldry-ref' })
    flash(`스니펫에 ‘${f.item.name}’을(를) 저장했습니다.`)
  }
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) return
    const it = f.item
    const bodyHtml = [
      `<p><b>${escapeHtml(f.cat.icon + ' ' + f.cat.label)} · ${escapeHtml(it.name)}</b>${it.aka ? ` <i>${escapeHtml(it.aka)}</i>` : ''}</p>`,
      it.meaning ? `<p><b>상징</b> — ${escapeHtml(it.meaning)}</p>` : '',
      it.detail ? `<p><b>묘사</b> — ${escapeHtml(it.detail)}</p>` : '',
      it.custom ? `<p><b>관습</b> — ${escapeHtml(it.custom)}</p>` : '',
      it.pitfall ? `<p><b>주의</b> — ${escapeHtml(it.pitfall)}</p>` : '',
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '문장·세력', title: `${it.name} (문장 자료)`, bodyHtml })
    if (id) flash(`프로젝트 자료 〈문장·세력〉에 ‘${it.name}’을(를) 추가했습니다.`)
  }

  const flash = (msg: string) => {
    setToast(msg)
    setTimer(() => setToast((t) => (t === msg ? null : t)), 2200)
  }

  // ----- 생성기 동작 -----
  function rollAll(): Slots {
    return {
      field: pick(SLOT_FIELD), ordinary: pick(SLOT_ORDINARY), charge: pick(SLOT_CHARGE),
      tincture: pick(SLOT_TINCTURE), bearing: pick(SLOT_BEARING), achieve: pick(SLOT_ACHIEVE),
      flag: pick(SLOT_FLAG), motto: pick(SLOT_MOTTO),
    }
  }
  const reroll = () => {
    setSlots((prev) => {
      const next = { ...prev }
      SLOT_DEFS.forEach((s) => { if (!locks[s.key]) next[s.key] = pick(s.pool) })
      return next
    })
  }
  const rerollOne = (key: keyof Slots, poolKey: string[]) => setSlots((prev) => ({ ...prev, [key]: pick(poolKey) }))
  const toggleLock = (key: keyof Slots) => setLocks((p) => ({ ...p, [key]: !p[key] }))

  const forgeText = (): string => {
    const head = houseName.trim() ? `【${houseName.trim()} 가문 문장】\n` : '【가문 문장】\n'
    return head + blazon(slots)
  }
  const copyForge = () => copy(forgeText(), 'forge')
  const stashForge = () => {
    if (!hasStash()) return
    addToStash({ kind: 'note', label: houseName.trim() ? `${houseName.trim()} 가문 문장` : '가문 문장', text: forgeText() })
    flash('수집함에 가문 문장을 담았습니다.')
  }
  const snippetForge = () => {
    addToLibrary('snippets', { text: forgeText(), tags: ['문장', '가문'], source: 'heraldry-ref' })
    flash('스니펫에 가문 문장을 저장했습니다.')
  }
  const projectForge = () => {
    if (!hasProjectBridge()) return
    const name = houseName.trim() || '이름 없는 가문'
    const bodyHtml = [
      `<p><b>🛡️ ${escapeHtml(name)} 가문 문장</b></p>`,
      `<p>${escapeHtml(blazon(slots))}</p>`,
      `<ul>`,
      SLOT_DEFS.map((s) => `<li><b>${escapeHtml(s.label)}</b>: ${escapeHtml(slots[s.key])}</li>`).join(''),
      `</ul>`,
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '문장·세력', title: `${name} 가문 문장`, bodyHtml })
    if (id) flash(`프로젝트 자료 〈문장·세력〉에 ‘${name}’ 가문 문장을 추가했습니다.`)
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const inputStyle: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }

  return (
    <div style={wrap}>
      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('dict')} aria-pressed={tab === 'dict'}
          style={{ borderColor: tab === 'dict' ? 'var(--accent)' : 'var(--border)', color: tab === 'dict' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="📖" /> 문장 사전
        </button>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'}
          style={{ borderColor: tab === 'forge' ? 'var(--accent)' : 'var(--border)', color: tab === 'forge' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🛠️" /> 가문 문장 생성기
        </button>
        <button className="linkbtn" style={{ marginLeft: 'auto' }} onClick={() => openToolLinked('faction-builder')} title="세력·진영 설계기 열기"><Emoji e="⚔️" /> 세력 설계기 열기</button>
      </div>

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>
          ✓ {toast}
        </div>
      )}

      {tab === 'dict' ? (
        <>
          <div style={hint}>
            가문·세력 문장의 색·금속·도형·동물·구도와 깃발·인장 관습 <b>{total}항목</b>. 검색·펼침으로 찾아 진영의 시각 정체성을 설계하세요. <i>(역사 용어를 참고한 서사용 발상 자료)</i>
          </div>

          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="문장 항목 검색 (예: 사자, 백합, 십자, 충성, 혼인, 인장)" style={inputStyle} />

          {/* 카테고리 필터 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY}
              style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e="✨" /> 전체
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
            <button className="btn-primary" onClick={rollDictRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 항목</button>
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
                <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
                <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
                {random.item.aka && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{random.item.aka}</span>}
                <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
              </div>
              {random.item.meaning && <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 6 }}><b style={{ color: 'var(--accent)' }}>상징</b> {random.item.meaning}</div>}
              {random.item.detail && <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 4, color: 'var(--muted)' }}>{random.item.detail}</div>}
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <button className="minibtn" onClick={() => copy(entryText(random), 'rand')}>{copiedKey === 'rand' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
                <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>
                  {favs[favKey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
                </button>
              </div>
            </div>
          )}

          {/* 목록 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {filtered.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
                {onlyFav ? '☆ 아직 즐겨찾기한 항목이 없습니다. 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
              </div>
            ) : (
              filtered.map((f) => {
                const fk = favKey(f.cat.key, f.item.name)
                const isFav = !!favs[fk]
                const open = !!expanded[fk]
                const copyId = 'item:' + fk
                return (
                  <div key={fk} style={card}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, cursor: 'pointer' }} onClick={() => toggleExpand(fk)}>
                      <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={f.cat.icon} /> {f.cat.label}</span>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{f.item.name}</span>
                      {f.item.aka && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{f.item.aka}</span>}
                      <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                        onClick={(e) => { e.stopPropagation(); toggleFav(f.cat.key, f.item.name) }}
                        style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                        {isFav ? '★' : '☆'}
                      </button>
                      <span style={{ flexShrink: 0, color: 'var(--muted)', fontSize: 12 }}>{open ? '▾' : '▸'}</span>
                    </div>
                    {f.item.meaning && <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 5 }}><b style={{ color: 'var(--accent)' }}>상징</b> {f.item.meaning}</div>}
                    {open && (
                      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {f.item.detail && <div style={{ fontSize: 12.5, lineHeight: 1.55 }}><b>묘사</b> — {f.item.detail}</div>}
                        {f.item.custom && <div style={{ fontSize: 12.5, lineHeight: 1.55 }}><b>관습</b> — {f.item.custom}</div>}
                        {f.item.pitfall && <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--muted)' }}><b><Emoji e="⚠" /> 주의</b> — {f.item.pitfall}</div>}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      <button className="minibtn" onClick={() => copy(entryText(f), copyId)}>{copiedKey === copyId ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
                      <button className="minibtn" onClick={() => toStash(f)} disabled={!hasStash()}
                        title={hasStash() ? '이 자료를 플로팅 수집함에 담기' : '수집함에 연결되어 있지 않습니다'}><Emoji e="📎" /> 수집함</button>
                      <button className="minibtn" onClick={() => toSnippet(f)} title="공유 스니펫에 저장"><Emoji e="✂" /> 스니펫</button>
                      <button className="minibtn" onClick={() => toProject(f)} disabled={!hasProjectBridge()}
                        title={hasProjectBridge() ? '프로젝트 자료 〈문장·세력〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트</button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div style={hint}>문장은 ‘읽는’ 그림입니다. 색·짐승·구도가 곧 그 가문의 선언이니, 진영마다 다르게 비틀어 정체성을 새기세요.</div>
        </>
      ) : (
        <>
          <div style={hint}>
            슬롯을 굴려 가문 문장을 즉석에서 짭니다. 마음에 드는 칸은 <Emoji e="🔒" /> 잠그고 나머지만 다시 굴리세요. 조합 수 <b>{COMBOS.toLocaleString('en-US')}</b>가지.
          </div>

          <input value={houseName} onChange={(e) => setHouseName(e.target.value)} placeholder="가문·세력 이름 (선택, 예: 북풍의 가렌가)" style={inputStyle} />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={reroll}><Emoji e="🎲" /> 전체 다시 굴리기</button>
            <button className="minibtn" onClick={() => setLocks({ field: false, ordinary: false, charge: false, tincture: false, bearing: false, achieve: false, flag: false, motto: false })}><Emoji e="🔓" /> 잠금 모두 해제</button>
          </div>

          {/* 슬롯 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {SLOT_DEFS.map((s) => {
              const locked = locks[s.key]
              return (
                <div key={s.key} style={{ ...card, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
                  <button className="minibtn" onClick={() => toggleLock(s.key)} title={locked ? '잠금 해제' : '이 칸 잠그기'}
                    style={{ flexShrink: 0, borderColor: locked ? 'var(--accent)' : 'var(--border)' }}>
                    {locked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
                  </button>
                  <div style={{ flexShrink: 0, width: 78, fontSize: 11.5, color: 'var(--muted)' }}>{s.label}</div>
                  <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{slots[s.key]}</div>
                  <button className="minibtn" onClick={() => rerollOne(s.key, s.pool)} title="이 칸만 다시 굴리기" style={{ flexShrink: 0 }}>↻</button>
                </div>
              )
            })}
          </div>

          {/* 생성된 문장 설명문 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 4 }}><Emoji e="🛡️" /> {houseName.trim() ? `${houseName.trim()} 가문 문장` : '가문 문장'}</div>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>{blazon(slots)}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <button className="minibtn" onClick={copyForge}>{copiedKey === 'forge' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
              <button className="minibtn" onClick={stashForge} disabled={!hasStash()}
                title={hasStash() ? '이 문장을 수집함에 담기' : '수집함에 연결되어 있지 않습니다'}><Emoji e="📎" /> 수집함</button>
              <button className="minibtn" onClick={snippetForge} title="공유 스니펫에 저장"><Emoji e="✂" /> 스니펫</button>
            </div>
          </div>

          {/* 연계 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={projectForge} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '생성한 가문 문장을 프로젝트 자료 〈문장·세력〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            <button className="linkbtn"
              onClick={() => openToolLinked('faction-builder', { title: houseName.trim() || '새 가문', crest: blazon(slots), from: 'heraldry-ref' })}
              title="이 가문 문장을 가지고 세력 설계기 열기">
              <Emoji e="⚔️" /> 세력 설계기로
            </button>
          </div>

          <div style={hint}>설명문(blazon)은 출발점입니다. 짐승의 자세·색의 함의를 사전 탭에서 확인해 가문 사연과 어긋나지 않게 다듬으세요.</div>
        </>
      )}
    </div>
  )
}
