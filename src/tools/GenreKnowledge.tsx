// 판타지 장르 지식·소재 사전 — 하위장르·마법체계·종족·세계관 어휘·서사 장치·클리셰(변주)·웹소설/로판 관습·대표작 계보·클라이맥스·세계관 체크리스트.
// 자급식: 외부 네트워크·라이브러리 없음. react + './linkbus' 만 사용. localStorage 로 펼침/즐겨찾기/마지막 카테고리 영속.
import { useState, useEffect, useMemo, useCallback } from 'react'
import { addToProject, hasProjectBridge, openToolLinked } from './linkbus'
import { Emoji, emojify } from './linkbus'

export const meta = { id: 'fan-genre-knowledge', name: '판타지 지식 사전', icon: '🐉', group: '지식 사전', genre: '판타지', intro: '판타지에서 자주 쓰는 소재·설정·고증 지식을 카테고리로 찾고 장면에 심으세요', w: 640, h: 620 }

interface Entry { name: string; desc: string; tip?: string }
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ─────────────────────────────────────────────────────────────────────────────
// 판타지 도시에 기반 자작 지식 사전 — 14개 카테고리, 합계 280+ 항목.
// ─────────────────────────────────────────────────────────────────────────────
const CATS: CatDef[] = [
  {
    key: 'subgenre', label: '하위 장르', icon: '🗺️', note: '무대와 독자 기대가 달라지는 분기. 어느 갈래에 속하는지부터 정하면 관습이 명확해진다.',
    items: [
      { name: '하이 판타지(이세계 정통)', desc: '지구와 무관한 독립 세계. 세계관 자체가 주인공이 되는 서사. 톨킨 『반지의 제왕』, 마틴 『얼불노』, 로스퍼스 『바람의 이름』 계보.', tip: '인공언어·연표·지도 수준의 세계 구축이 독자 기대치. 정보를 한꺼번에 쏟지 말고 필요할 때 흘려라.' },
      { name: '로우 판타지', desc: '현실 세계에 마법·이종족이 부분적으로 침투. 신비가 일상의 균열로 새어 든다. 도시 판타지의 모태.', tip: '"현실의 규칙은 그대로, 단 하나의 초자연만 도입"하면 침투의 충격이 선명해진다.' },
      { name: '어반 판타지', desc: '현대 도시 배경에 마법·괴물·비밀결사. 『드레스덴 파일』, 경계작 『해리 포터』.', tip: '현대 기술과 마법의 충돌·공존(휴대폰 vs 주문)을 코미디·디테일로 활용하라.' },
      { name: '이세계 전이·전생(이고깽·환생물)', desc: '주인공이 다른 세계로 넘어가거나 환생. 한·일 웹소설 주류. 『오버로드』, 『전생슬라임』, 『방패 용사』.', tip: '전생/전이 트리거는 1화에 빠르게. 전생 지식·게임 지식의 정보 우위가 핵심 동력.' },
      { name: '헌터물·게이트물', desc: '현실에 던전·게이트가 열리고 각성자가 싸운다. 한국 고유 진화형. 『나 혼자만 레벨업』.', tip: '시스템 메시지 UI(레벨·퀘스트·상점)를 서사에 삽입. 각성·랭킹·길드 구조가 골격.' },
      { name: '다크 판타지(그림다크)', desc: '도덕적 회색지대·폭력·정치 모략. 안전한 캐릭터는 없다. 『베르세르크』, 애버크롬비, 『말라잔』.', tip: '선악이 아니라 이해관계로 인물을 움직여라. 승리에는 반드시 비용을 부과.' },
      { name: '로맨스 판타지(로판)', desc: '회귀·빙의·환생 + 귀족/황실 정치 + 로맨스. 한국 여성향 거대 시장. 『상수리나무 아래』, 『재혼 황후』.', tip: '"원작에선 죽는 악역영애" 빙의 + 파멸 플래그 회피가 대표 엔진. 차갑지만 나에게만 다정한 남주.' },
      { name: '소드 앤 소서리', desc: '거대 세계 구원보다 영웅 개인의 모험·생존 중심. 코난, 『드리즈트』.', tip: '에피소드형 단위 모험을 누적하라. 스케일보다 액션과 캐릭터의 매력.' },
      { name: '서사시 판타지(에픽)', desc: '왕국·대륙·신의 운명을 건 다중 POV 장편. 조던 『시간의 수레바퀴』, 마틴.', tip: '각 시점이 독립된 긴장을 갖고 교차하다 한 점으로 수렴하게 설계.' },
      { name: '마도공학·아케인펑크', desc: '마법이 기술·산업·경제를 대체·왜곡한 세계. 마력 기관차, 마정석 발전, 골렘 노동.', tip: '"마법이 산업혁명을 일으켰다면?"으로 사회·계급·전쟁 양상을 다시 설계하라.' },
      { name: '판타지 무협(선협·동양 판타지)', desc: '검·기·도(道)·신선·요괴의 동아시아 세계관. 수련과 경지 돌파의 성장.', tip: '경지(연기→축기→…)의 단계와 벽·돌파의 리듬이 서구 레벨업의 동양적 대응물.' },
    ],
  },
  {
    key: 'magic', label: '마법 체계', icon: '✨', note: '판타지의 심장. 하드/소프트 구분과 "비용·한계"가 깊이를 만든다. 샌더슨의 세 법칙 참고.',
    items: [
      { name: '하드 매직(규칙형)', desc: '명시적 규칙·비용·한계를 가진 마법. 미스트본의 금속 능력, 어스시의 진명·등가교환.', tip: '샌더슨 제1법칙: 마법으로 갈등을 해결하는 능력은 독자가 그 마법을 이해한 정도에 비례한다. 미리 규칙을 보여줘야 해결이 카타르시스가 된다.' },
      { name: '소프트 매직(신비형)', desc: '규칙 불명·신비 그 자체. 간달프의 힘, 톨킨식. 경이·위협의 연출용.', tip: '소프트 매직으로 클라이맥스를 직접 해결하면 데우스 엑스 마키나가 된다. 분위기·공포에만 쓰라.' },
      { name: '비용과 대가(샌더슨 제2법칙)', desc: '마법은 능력보다 한계·약점·비용이 더 흥미롭다. 마나 고갈, 부작용, 수명 소모, 정신 침식.', tip: '"무엇을 할 수 있는가"보다 "무엇을 잃는가"를 설계하라. 대가 없는 힘은 긴장이 없다.' },
      { name: '마나·오드·에테르', desc: '마법을 구동하는 에너지원. 고갈·회복·총량이 전투의 자원 관리가 된다.', tip: '마나 총량·회복 속도를 수치 또는 감각으로 정해두면 전투 페이싱이 일관된다.' },
      { name: '서클·등급 체계', desc: '1~9서클 마법사처럼 위계로 능력을 단계화. 성장의 가시화에 유리.', tip: '서클 상승 = 성장 마일스톤. "벽"을 만들고 돌파시켜 리듬을 줘라.' },
      { name: '영창·캐스팅·룬·마법진', desc: '주문을 발동하는 절차. 긴 영창(강력·취약), 무영창(고수의 증표), 룬·진(陣)의 설계.', tip: '영창 시간 = 빈틈. 적이 영창을 끊거나 무영창으로 허를 찌르는 전술을 만들어라.' },
      { name: '원천(신·자연·혈통·계약)', desc: '마력이 어디서 오는가: 신의 권능, 자연 정령, 혈통의 재능, 악마·정령과의 계약.', tip: '원천이 다르면 사회적 지위·금기·정치도 달라진다. 신성마법은 교단 권력과 얽힌다.' },
      { name: '금주·금기(禁呪)', desc: '쓰면 안 되는 마법. 죽은 자 소생, 시간 역행, 영혼 거래. 깨면 대가가 따른다.', tip: '"절대 쓰지 말라던 그것"을 클라이맥스에서 쓰게 만들면 무게가 실린다.' },
      { name: '흑마법·백마법·네크로맨시', desc: '치유·축복(백) vs 저주·죽음(흑). 시체·언데드를 부리는 강령술.', tip: '"흑=악"의 클리셰를 비틀어 보라. 정당방위의 강령술, 부패한 신성마법.' },
      { name: '정령·소환·사역마', desc: '불·물·바람·땅의 정령, 소환수, 마녀의 사역마. 계약·교감·서열이 관건.', tip: '소환수에게 욕망·인격을 주면 단순 도구가 아니라 관계 서사가 된다.' },
      { name: '인챈트·마법부여', desc: '무기·갑옷·물건에 마력을 새겨 능력을 부여. 마도공학의 기초.', tip: '인챈트에 유지비·내구·반동을 두면 경제·전략 요소가 생긴다.' },
      { name: '검기·오러·소드마스터', desc: '검에 기·마력을 둘러 베는 무인의 경지. 동양 무협과 서양 기사의 교배.', tip: '오러의 색·형태로 인물의 개성·심상을 시각화하라.' },
      { name: '계약·등가교환', desc: '얻으려면 같은 값을 내놓아야 한다. 어스시의 균형, 연금술의 등가교환.', tip: '"무엇을 바칠 것인가"의 선택이 곧 캐릭터의 윤리를 드러낸다.' },
      { name: '제3법칙: 기존 체계 확장', desc: '새 마법을 추가하기 전에 이미 깐 체계를 확장하라. 난립은 세계를 산만하게 만든다.', tip: '하나의 규칙을 깊게 파면 독자가 "응용"을 예측·기대하는 재미가 생긴다.' },
    ],
  },
  {
    key: 'race', label: '종족·이종족', icon: '🧝', note: '클리셰화된 종족 이미지를 알고, 비틀어야 차별화된다. 전복 포인트를 함께 적었다.',
    items: [
      { name: '엘프', desc: '장수·미형·고결·자연 친화. 마법과 활의 명수. 톨킨이 정립한 표준.', tip: '전복: 타락하고 오만한 엘프, 죽음을 동경하는 불사의 권태, 멸망해 가는 노쇠한 종족.' },
      { name: '드워프', desc: '단신·완력·장인·고집. 지하 도시·광맥·술·도끼. 황금에 집착.', tip: '전복: 지상을 동경하는 드워프, 첨단 마도공학자, 여성 전사 문화.' },
      { name: '오크·고블린', desc: '야만·소모적 악역·집단 돌격. 전통적 "무지성 악".', tip: '전복: 명예와 부족 정치를 가진 오크 사회, 박해받는 소수자, 인간보다 도덕적인 종족.' },
      { name: '하플링·호빗', desc: '소박·향락·의외의 용기. 작은 자가 큰 운명을 진다.', tip: '"가장 약한 자가 반지를 나른다" — 작은 자의 영웅성은 강력한 동력.' },
      { name: '드래곤', desc: '권력·수호·재앙·태고의 지혜. 서양의 괴물, 동양의 길조. 보물을 쌓는 탐욕.', tip: '인간으로 변신하는 용, 계약·맹약의 상대, 멸종 위기의 마지막 개체로 변주.' },
      { name: '수인·비스트킨', desc: '짐승의 특징을 가진 종족. 후각·청각·완력 등 신체 우위와 사회적 차별.', tip: '본능과 이성의 갈등, 인간 사회의 편견을 서사 갈등으로 끌어와라.' },
      { name: '용족·반룡(드라코니안)', desc: '용의 피를 이은 종족. 비늘·날개·브레스. 자긍심 강한 전사 문화.', tip: '혈통의 저주(폭주·각성)와 종족적 오만을 결함으로.' },
      { name: '언데드·리치', desc: '죽지 못한 자. 좀비·구울·뱀파이어·리치(불사의 대마법사).', tip: '리치의 생명함(필락터리)처럼 "약점이 어딘가 숨겨져 있다"는 추리 요소로.' },
      { name: '정령족·요정', desc: '자연 원소의 화신, 변덕스러운 페어리. 계약·거래·장난.', tip: '서구 요정은 잔혹하고 변덕스럽다 — "이름을 알면 지배한다", "음식을 먹으면 못 돌아온다" 등 규칙.' },
      { name: '거인·트롤', desc: '거대한 완력, 둔중함, 산·서리·불의 거인. 고대의 위협.', tip: '재생하는 트롤(불·산으로만 죽음)처럼 "약점 한정"이 공략 퍼즐이 된다.' },
      { name: '나가·뱀인', desc: '뱀의 하반신, 독·매혹·고대 문명. 동남아·인도 신화 기원(이영도 『눈물을 마시는 새』의 나가).', tip: '체온·물·번식 등 인간과 다른 생물학으로 독자적 문화·갈등을 빚어라.' },
      { name: '도깨비·요괴(동양)', desc: '한국·일본의 토착 이종족. 도깨비방망이, 변신, 약속의 신성성.', tip: '서구 종족 대신 토착 요괴로 세계관을 짜면 신선한 차별화가 된다.' },
      { name: '천족·마족', desc: '천상의 천사·신족 vs 나락의 악마·마족. 진영 대립의 축.', tip: '진영을 회색으로: 타락 천사, 인간을 사랑한 마족, 부패한 천계.' },
      { name: '인공 생명·골렘·호문쿨루스', desc: '흙·금속·연금술로 만든 인공 존재. 명령·자유의지·영혼의 문제.', tip: '"피노키오/프랑켄슈타인" — 만들어진 존재의 자아·해방 서사로.' },
    ],
  },
  {
    key: 'lexicon', label: '세계관 어휘', icon: '📜', note: '판타지 클리셰 어휘 모음. 그대로 쓰기보다 작품 고유어로 변주하는 출발점.',
    items: [
      { name: '마나·마력 회로', desc: '마법의 에너지와 그것을 다루는 체내 경로. 회로 손상·확장이 성장 요소.', tip: '회로의 "용량·회복"을 정하면 전투 자원 관리가 명확해진다.' },
      { name: '아티팩트·매직아이템', desc: '절대반지·엑스칼리버형 강력한 마법 물건. 의지·중독성·대가를 품는다.', tip: '아이템에 "의지"를 주면 주인을 시험하고 타락시키는 갈등이 생긴다.' },
      { name: '던전·게이트·레이드', desc: '몬스터가 깃든 미궁, 차원의 균열, 보스 공략전. 헌터물의 무대.', tip: '던전의 "규칙·기믹"을 퍼즐로 설계하면 두뇌전이 가능하다.' },
      { name: '길드·모험가·등급(F~SSS)', desc: '의뢰를 중개하는 조합, 등급으로 분류되는 모험가. 게임적 관습.', tip: '등급은 성장 지표이자 사회적 신분. 저등급의 고수, 등급 사기 같은 비틀기.' },
      { name: '스킬·패시브·버프/디버프', desc: '습득 능력, 상시 효과, 강화/약화 상태. 시스템물의 전투 문법.', tip: '스킬 조합·시너지를 설계하면 "빌드"의 전략적 재미가 생긴다.' },
      { name: '스테이터스·레벨·경험치', desc: '수치화된 능력·성장. 레벨업·스탯 분배·한계 돌파.', tip: '"성장의 가시화"는 웹소설 독자의 강한 기대. 수치 상승에 서사적 의미를 붙여라.' },
      { name: '마탑·마법학원', desc: '마법사의 권력·교육 기관. 서열·파벌·금서고. 학원물의 무대.', tip: '학원은 성장·관계·정치를 한 무대에 모으는 압축 장치.' },
      { name: '성좌·성흔·가호', desc: '신·별·초월적 존재의 후원과 그 표식. 『전지적 독자 시점』의 성좌.', tip: '후원자에게 변덕·대가·관전자성을 주면 메타적 긴장이 생긴다.' },
      { name: '소드마스터·대마법사·현자', desc: '검·마법·지혜의 정점에 이른 칭호. 인간이 닿는 최고 경지.', tip: '"경지"마다 세계가 다르게 보이는 묘사로 격차를 실감 나게.' },
      { name: '용사·마왕·성녀', desc: '예언된 구원자, 봉인된 악, 신성한 치유자. 진영 서사의 삼각.', tip: '"용사가 악, 마왕이 선"의 역전이 가장 흔한 현대적 비틀기.' },
      { name: '회귀·빙의·환생(회빙환)', desc: '과거로 돌아가거나, 남의 몸·다른 세계에 들어가거나, 다시 태어남. 한국 웹소설 3대 엔진.', tip: '핵심은 "정보 우위". 미래/원작 지식으로 어떻게 판을 뒤집는가가 재미.' },
      { name: '시스템·튜토리얼·메시지창', desc: '게임 UI가 현실에 강림. "퀘스트 발생", "레벨 업" 알림.', tip: '시스템의 정체·목적·악의를 떡밥으로 깔면 후반 반전이 된다.' },
      { name: '마정석·마나석', desc: '마력을 담은 결정. 연료·화폐·동력원. 마도공학·경제의 기초.', tip: '"누가 마정석을 통제하는가"가 곧 권력·전쟁의 원인이 된다.' },
      { name: '봉인·결계·금역', desc: '악·힘·장소를 가두는 장치. 봉인 해제 카운트다운은 강력한 긴장.', tip: '봉인의 "약화 징조"를 초반부터 흘리면 클라이맥스가 예고된 폭발이 된다.' },
    ],
  },
  {
    key: 'device', label: '서사 장치', icon: '🎴', note: '판타지 고유의 플롯 도구. 정공법과 비틀기를 함께 적었다.',
    items: [
      { name: '예언(Prophecy)', desc: '운명을 예고하는 신탁. 정공법(예언대로) vs 비틀기(자기실현·오역·반전).', tip: '예언을 피하려는 행동이 오히려 예언을 이룬다(오이디푸스). 남용하면 긴장이 죽는다.' },
      { name: '선택받은 자(The Chosen One)', desc: '혈통·표식·예언으로 정당화된 주인공. 클리셰지만 핵심 동력.', tip: '변주: 선택받지 못한 자가 선택을 만든다 / 선택받은 자가 가짜였다 / 예언이 틀렸다.' },
      { name: '퀘스트·여정(The Quest)', desc: '맥거핀을 찾거나 파괴하는 여정. 일행 결성·동료 서사.', tip: '목표물보다 "여정에서 변하는 인물"이 진짜 알맹이다.' },
      { name: '멘토(Mentor)', desc: '간달프·덤블도어·오비완형 스승. 흔히 중반에 퇴장(죽음)시켜 주인공을 자립시킨다.', tip: '멘토를 일찍 죽이면 주인공이 홀로 결단해야 하는 성장이 강제된다.' },
      { name: '봉인된 악·고대의 위협', desc: '잠든 마왕, 봉인 해제 카운트다운, 되살아나는 태고의 재앙.', tip: '"과거가 현재의 위협을 설명"하게 역사를 설계하라.' },
      { name: '마법 아이템의 대가', desc: '강력한 아이템은 의지·중독·타락을 부른다. 절대반지의 유혹.', tip: '아이템이 인물을 시험·부패시키게 하면 단순 파워업이 아니라 윤리 서사가 된다.' },
      { name: '진명(眞名)·이름의 힘', desc: '사물·존재의 참 이름을 알면 지배할 수 있다. 어스시·요정 설화.', tip: '이름을 숨기고 지키는 것이 곧 정체성·생존의 문제가 된다.' },
      { name: '동료·파티 결성', desc: '서로 다른 강점·결함을 가진 일행. 갈등과 결속의 드라마.', tip: '각자 다른 욕망을 주면 같은 목표 안에서도 내부 긴장이 생긴다.' },
      { name: '각성·진명 해방·변신', desc: '주인공이 진짜 힘·정체를 개방하는 순간. 클라이맥스의 단골.', tip: '각성에 "방아쇠(상실·분노·각오)"를 두면 갑작스러움이 필연이 된다.' },
      { name: '희생(Sacrifice)', desc: '멘토·동료·주인공 자신의 희생으로 승리의 무게를 부여.', tip: '승리에 상실을 결부하면 카타르시스가 깊어진다. 공짜 승리는 가볍다.' },
      { name: '데우스 엑스 마키나(금기)', desc: '마지막에 새 능력·우연으로 해결하는 것. 판타지 최대 금기.', tip: '해결의 열쇠는 반드시 앞에서 심어라(체호프의 총·복선 회수).' },
      { name: '액자·회고 구조', desc: '현재의 화자가 과거를 들려주는 틀. 『바람의 이름』의 회고.', tip: '"전설의 영웅이 직접 진실을 말한다"는 틀은 신뢰성·반전의 여지를 준다.' },
      { name: '다중 POV·교차 시점', desc: '여러 인물의 시점이 교차하며 큰 그림을 그린다. 마틴·조던식.', tip: '각 시점 끝에 후킹을 걸어 다음 시점을 기다리게 하라.' },
      { name: '신·판테온·신화', desc: '세계를 창조·간섭하는 신들. 신앙·교단이 마법·정치와 얽힌다.', tip: '신이 실재하고 개입하는 세계에서 "신앙"은 사실 확인의 문제가 된다.' },
    ],
  },
  {
    key: 'cliche', label: '클리셰와 변주', icon: '🔁', note: '독자가 이미 아는 관습. 인지하고 비틀어야 신선해진다. (변주안 포함)',
    items: [
      { name: '평범한 시골 소년이 사실 왕족·용사의 후예', desc: '숨겨진 혈통·운명으로 정당화되는 주인공.', tip: '변주: 혈통이 거짓이었다 / 혈통 없이 스스로 영웅이 된다 / 혈통이 저주다.' },
      { name: '현명한 노(老)멘토의 중도 사망', desc: '스승이 죽어 주인공을 자립시킨다.', tip: '변주: 멘토가 배신자였다 / 멘토가 살아 돌아온다 / 멘토가 최종 보스다.' },
      { name: '봉인된 마왕의 부활', desc: '잠든 절대악이 깨어나 세계를 위협.', tip: '변주: 마왕이 깨어나니 의외로 합리적 / 봉인한 쪽이 진짜 악 / 마왕이 이미 인간 속에.' },
      { name: '엘프=미형, 드워프=구두쇠, 오크=악역', desc: '종족 고정관념의 전형.', tip: '변주: 천박한 엘프, 예술가 드워프, 철학자 오크 — 한 종족만 비틀어도 신선하다.' },
      { name: '선술집·여관에서의 퀘스트 의뢰', desc: '모험가 길드·주점에서 시작하는 의뢰.', tip: '변주: 의뢰가 함정 / 의뢰인이 가해자 / 길드가 착취 구조.' },
      { name: '"너에게는 특별한 재능이 있다"', desc: '잠재력을 알아보는 선언으로 시작되는 성장.', tip: '변주: 재능이 거짓 격려 / 재능이 폭탄(통제 불가) / 재능이 남의 것.' },
      { name: '무시당하던 약자가 각성·회귀로 최강이 됨', desc: '웹소설 사이다 공식의 핵심.', tip: '변주: 강해질수록 잃는 것 / 복수의 허무 / 최강이 된 뒤의 권태·책임.' },
      { name: '가족·문파에 버림받았다가 복수', desc: '천대받다 힘을 얻어 되갚는 서사.', tip: '변주: 복수 대상이 사실 피해자 / 화해 / 더 큰 적 앞에서 손잡기.' },
      { name: '"이번 생은 다르게 살겠다"(회귀)', desc: '미래 지식으로 과거를 고치는 회귀물 선언.', tip: '변주: 미래가 바뀌어 지식이 무용 / 회귀 자체가 함정 / 회귀 횟수 제한.' },
      { name: '"원작에선 죽는 악역영애였다"(로판)', desc: '소설/게임 속 악역에 빙의해 파멸 플래그를 피한다.', tip: '변주: 원작 강제력이 죽이려 듦 / 악역이 알고 보니 누명 / 주인공(여주)이 진짜 악.' },
      { name: '차갑지만 나에게만 다정한 남주', desc: '로판의 대표 남주 유형(까칠 + 직진).', tip: '변주: 다정함이 연기 / 집착의 위험성 직시 / 여주가 먼저 떠난다.' },
      { name: '파혼·이혼 후 더 잘됨', desc: '버림받은 뒤 성공·복수하는 통쾌함.', tip: '변주: 전 약혼자의 진심 / 성공의 공허 / 새로운 자아 찾기로 무게 이동.' },
      { name: '드래곤 슬레이어·용 퇴치', desc: '용을 잡아 영웅이 되는 정통 모티프.', tip: '변주: 용이 무고 / 용과 동맹 / 용을 죽이면 더 큰 재앙.' },
      { name: '마지막에 우정·사랑의 힘으로 각성', desc: '감정의 폭발로 한계를 돌파.', tip: '남발하면 데우스 엑스 마키나. 앞서 그 관계를 충분히 쌓았을 때만 통한다.' },
    ],
  },
  {
    key: 'web', label: '웹소설 관습', icon: '📱', note: '연재형 페이싱·후킹·성장 가시화의 문법. 회차 단위 보상이 핵심.',
    items: [
      { name: '초반 3~5화 골든타임', desc: '세계관·주인공·차별점·첫 사이다를 즉시 제시.', tip: '회귀/각성/전이 트리거를 1화 안에. 늦으면 독자가 이탈한다.' },
      { name: '사이다·고구마 리듬', desc: '답답함(고구마)을 쌓고 시원한 응징·역전(사이다)으로 해소.', tip: '회차당 최소 1회의 카타르시스. 고구마가 너무 길면 하차한다.' },
      { name: '클리프행어(절단신공)', desc: '매 화 끝에 다음 화를 부르는 위기·궁금증.', tip: '"바로 그때—" 다음 화로. 절정 직전에서 끊는 호흡 감각이 연재의 생명.' },
      { name: '떡밥-회수 짧은 주기', desc: '거대 복선보다 회차 단위의 즉각 보상이 우선.', tip: '큰 떡밥 1개 + 작은 보상 다수의 이중 구조로 호흡을 맞춰라.' },
      { name: '성장의 가시화', desc: '레벨·스탯·서열·등급으로 강해짐을 수치·랭킹으로 보여준다.', tip: '눈에 보이는 상승이 독자의 직접적 쾌감이다. 정체기엔 새 지표를 제시.' },
      { name: '파워 인플레이션 관리', desc: '주인공이 강해질수록 적도 강해지되 "벽-돌파"의 리듬 유지.', tip: '천장을 한 번에 깨지 말고 단계별 벽을 둬라. 무적이 되면 긴장이 죽는다.' },
      { name: '에피소드형 누적 구조', desc: '던전 공략·토너먼트·시험 등 단위 에피소드의 연쇄.', tip: '각 에피소드에 명확한 목표·보상·새 인물을 배치, 그 위에 거대 떡밥.' },
      { name: '회귀 정보 우위', desc: '미래·원작 지식으로 사건을 선점·예방·이용.', tip: '"알기 때문에 가능한 선택"이 독자의 우월감 대리만족이 된다.' },
      { name: '먼치킨·치트', desc: '압도적 능력·고유 스킬. 단, 너무 빠른 무적은 독.', tip: '치트에 "조건·약점·미완성"을 둬서 성장 여지를 남겨라.' },
      { name: '랭킹·서열·각성 등급', desc: 'F~SSS, 1위 랭커 등 사회적 위계. 등극이 최강 사이다.', tip: '서열 역전의 순간을 클라이맥스로 아껴라.' },
      { name: '제목·키워드 후킹', desc: '"SSS급", "회귀", "전직", "버림받은" 등 검색·클릭을 부르는 제목.', tip: '제목에 장르 신호 + 욕망 + 반전을 압축하라.' },
      { name: '주인공 1인칭·근접 시점', desc: '독자가 주인공에 빙의해 사이다를 직접 느끼게.', tip: '주인공의 속내·계산을 노출해 우월감과 몰입을 동시에.' },
    ],
  },
  {
    key: 'rofan', label: '로맨스 판타지', icon: '👑', note: '회빙환 + 귀족/황실 정치 + 로맨스. 한국 여성향 거대 시장의 관습.',
    items: [
      { name: '악역영애 빙의', desc: '소설/게임 속 파멸할 악역에게 빙의. 죽음 플래그 회피가 동력.', tip: '"원작 강제력"을 적대 세력으로 의인화하면 긴장이 생긴다.' },
      { name: '회귀한 황비·공녀', desc: '비참하게 죽은 과거로 회귀해 운명을 고친다. 『재혼 황후』형.', tip: '전생의 굴욕 → 이번 생의 선제·우위가 사이다 구조의 축.' },
      { name: '황실·귀족 정치', desc: '계승 다툼·파벌·정략결혼·사교계. 권력 암투가 무대.', tip: '로맨스와 정치를 분리하지 말고 "사랑이 곧 정치적 선택"이 되게 엮어라.' },
      { name: '차갑지만 나에게만 다정한 남주', desc: '냉혹한 황태자·공작이 여주에게만 무르다.', tip: '다정함의 "근거(과거·상처)"를 깔아야 단순 호구가 안 된다.' },
      { name: '집착남주·흑막남주', desc: '위험할 만큼 강한 애정 또는 음모를 쥔 남주.', tip: '집착의 매혹과 위험을 동시에 다뤄야 건강하면서도 긴장감 있다.' },
      { name: '사교계·데뷔탕트', desc: '무도회·티파티·드레스 코드. 평판이 곧 권력인 세계.', tip: '말 한마디·시선 하나가 칼이 되는 "미묘한 대화전"을 디테일로.' },
      { name: '서브남주·역하렘', desc: '여주를 둘러싼 복수의 매력적 남성. 선택의 긴장.', tip: '서브남주에게 독립된 서사를 줘서 "버려지는 카드"가 안 되게.' },
      { name: '계약결혼·정략결혼', desc: '목적을 위한 결혼이 진심으로 변하는 슬로우번.', tip: '"계약 조항"을 명시하면 그것을 깨는 순간이 로맨스의 전환점이 된다.' },
      { name: '전생 기억·원작 지식', desc: '원작/전생을 알기에 사건을 예측·선점.', tip: '"내가 아는 전개와 달라진다"는 순간이 긴장과 설렘의 교차점.' },
      { name: '파혼·복수 후 성공', desc: '버림받은 뒤 더 높이 올라가 되갚는 통쾌함.', tip: '복수의 끝에 "그래서 행복한가"를 묻는 성숙한 마무리가 여운을 남긴다.' },
      { name: '신분 상승·역하극', desc: '하녀·평민에서 귀족·황비로. 또는 몰락 귀족의 재기.', tip: '신분의 벽을 넘는 과정의 "디테일한 고난"이 카타르시스를 키운다.' },
      { name: '악녀·러브라이벌', desc: '여주를 음해하는 적대 여성. 단순 악역화 주의.', tip: '러브라이벌에게도 욕망·사연을 주면 입체적 긴장이 된다.' },
    ],
  },
  {
    key: 'canon', label: '대표작 계보', icon: '📚', note: '계보를 알면 어떤 관습이 어디서 왔는지, 무엇을 변주할지 보인다.',
    items: [
      { name: '톨킨 『반지의 제왕』·『호빗』', desc: '현대 하이 판타지의 원형. 인공언어·연표·종족 체계, "작은 자의 영웅성".', tip: '거의 모든 후대 클리셰의 출처. 비틀려면 먼저 원형을 알아야 한다.' },
      { name: '르 귄 『어스시』', desc: '진명(眞名) 마법, 균형의 윤리, 성장담. 소프트→철학적 마법의 표본.', tip: '"힘에는 균형의 대가"라는 윤리적 마법 설계의 교과서.' },
      { name: '마틴 『얼음과 불의 노래』', desc: '다중 POV, 주연도 죽는 잔혹함, 정치 모략. "안전한 캐릭터는 없다".', tip: '그림다크 정치 판타지의 현대적 기준점.' },
      { name: '샌더슨 『미스트본』·『스톰라이트』', desc: '하드 매직의 대표. 명시적 규칙·비용·한계. 작법 이론의 사실상 교과서.', tip: '"샌더슨의 세 법칙"은 마법 설계의 필독 원칙.' },
      { name: '로스퍼스 『바람의 이름』', desc: '액자식 회고, 미문, 천재 주인공. 서정적 1인칭 판타지.', tip: '"전설의 영웅이 직접 진실을 말한다"는 신뢰성 게임.' },
      { name: '애버크롬비 『첫 번째 법칙』', desc: '그림다크의 현대적 표본. 냉소·반영웅·전복된 영웅담.', tip: '클리셰를 알고 일부러 배신하는 메타적 재미.' },
      { name: '이영도 『드래곤 라자』·『눈물을 마시는 새』', desc: '한국 정통 판타지의 금자탑. 독창적 4종족(나가/도깨비/레콘/인간), 철학적 깊이.', tip: '서구 종족 대신 토착·창작 종족으로 세계를 짜는 모범.' },
      { name: '전민희 『룬의 아이들』', desc: '한국 하이판타지 서사 미학. 운명·성장·관계의 서정.', tip: '캐릭터 간 관계의 결을 섬세히 쌓는 한국형 에픽.' },
      { name: '추공 『나 혼자만 레벨업』', desc: '헌터물 글로벌 흥행작. 시스템·레벨업·각성·랭커 구조의 정점.', tip: '시스템물의 성장 가시화·사이다 페이싱의 표준.' },
      { name: '싱숑 『전지적 독자 시점』', desc: '메타픽션 + 시나리오/도깨비/성좌 시스템. 독자성과 서사 자기인식.', tip: '"독자가 곧 등장인물"이라는 메타 구조의 야심작.' },
      { name: '오버로드·전생슬라임·Re:제로', desc: '일본 이세계 트렌드의 정의자. 스테이터스·길드·모험가 등급 정착.', tip: '게임적 관습이 어떻게 서사 문법이 됐는지 보여주는 표본.' },
      { name: '알파타르트 『상수리나무 아래』·『재혼 황후』', desc: '로판 정전. 빙의/회귀 + 황실 정치 + 로맨스의 완성형.', tip: '로판 관습의 거의 모든 요소가 집약된 레퍼런스.' },
    ],
  },
  {
    key: 'structure', label: '전개·페이싱', icon: '📈', note: '정통(영웅의 여정)과 연재형(골든타임·후킹)의 구조 패턴.',
    items: [
      { name: '영웅의 여정(Hero\'s Journey)', desc: '일상→부름→거부→멘토→관문→시련/동료/적→심연→절정→보상→귀환→부활→변화.', tip: '단계를 기계적으로 채우지 말고 "변화"의 축으로 압축·생략하라.' },
      { name: '3막 구조', desc: '설정(1막)→대립·상승(2막)→해결(3막). 판타지 장편의 기본 골격.', tip: '2막 중간점에 판을 뒤집는 전환(거짓 승리/패배)을 둬라.' },
      { name: '세계관 점진 공개(드립)', desc: '초반에 정보를 쏟지 말고 필요할 때 제시. "보여주되 설명하지 말 것".', tip: '설정 강의(인포덤프)는 독약. 인물 행동·갈등 속에 녹여라.' },
      { name: '상승하는 스케일', desc: '마을→도시→왕국→대륙→세계/신. 위기의 단계적 확대.', tip: '개인의 작은 위기에서 시작해 세계의 운명으로 자연스럽게 확대.' },
      { name: '초반 골든타임(연재)', desc: '3~5화 안에 세계관·주인공·차별점·첫 보상을 제시.', tip: '"이 작품이 무엇이고 왜 봐야 하는가"를 즉시 답하라.' },
      { name: '회차 후킹(연재)', desc: '매 화 끝의 절단으로 다음 화 결제를 유도.', tip: '절정 직전, 또는 새 정보 직후에서 끊어라.' },
      { name: '복선 심기·회수', desc: '앞에 심은 규칙·아이템·정보가 결정타로 회수. 하드 매직의 카타르시스.', tip: '심은 총은 반드시 쏴라. 회수 없는 떡밥은 배신감을 준다.' },
      { name: '중간점 반전(미드포인트)', desc: '2막 한가운데서 진실 폭로·승패 역전으로 동력 재점화.', tip: '늘어지는 중반을 살리는 가장 강력한 장치.' },
      { name: '거짓 승리·거짓 패배', desc: '클라이맥스 직전, 잠시 다 이긴 듯/다 진 듯한 반전.', tip: '"어둠이 가장 짙은 순간"을 만들고 그 뒤에 진짜 절정을.' },
      { name: '에필로그·후일담', desc: '대가를 치른 세계의 변화, 남은 자들의 일상, 다음 모험의 씨앗.', tip: '승리의 비용·여운을 보여주면 세계가 살아 있는 느낌을 준다.' },
    ],
  },
  {
    key: 'climax', label: '클라이맥스 관습', icon: '⚔️', note: '최종 결전의 문법. 복선 회수와 대가가 무게를 만든다.',
    items: [
      { name: '최종 결전(마왕·신과의 대결)', desc: '개인 능력 + 동료 연계 + 세계관 규칙의 총동원.', tip: '주인공 혼자 다 하지 말고 그동안 쌓인 관계·자원이 합류하게.' },
      { name: '복선의 일괄 회수', desc: '앞서 심은 규칙·아이템·정보가 결정타로 회수되어 카타르시스 극대화.', tip: '하드 매직일수록 "아, 그래서 그랬구나"의 쾌감이 크다.' },
      { name: '희생으로 치른 승리', desc: '멘토·동료·주인공 자신의 희생이 승리에 무게를 부여.', tip: '공짜 승리는 가볍다. 무엇을 잃었는가가 감동을 만든다.' },
      { name: '각성·진명 해방·봉인 해제', desc: '주인공이 진짜 힘·정체를 개방하는 변신의 순간.', tip: '각성의 방아쇠를 앞에서 준비해야 갑작스럽지 않다.' },
      { name: '마법의 대가 치르기', desc: '승리에 반드시 비용(상실·후유증·세계 변화)을 부과.', tip: '"이긴 자도 온전치 못하다"가 깊이를 만든다.' },
      { name: '예언의 성취 또는 전복', desc: '예언이 예상과 다른 방식으로 실현되는 반전.', tip: '"예언은 맞았으나 의미가 달랐다"가 가장 강한 반전.' },
      { name: '최강의 사이다(웹소설)', desc: '쌓인 모든 굴욕·떡밥을 한 번에 응징·회수하는 압도적 역전.', tip: '그동안 참아온 고구마가 길수록 폭발이 크다. 등극·랭킹 1위로.' },
      { name: '데우스 엑스 마키나 금기', desc: '마지막에 새 능력·우연으로 해결하는 것 — 최대 금기.', tip: '해결의 모든 재료는 클라이맥스 이전에 등장해 있어야 한다.' },
      { name: '동료 총집결·합동기', desc: '흩어졌던 일행이 모여 각자의 강점으로 협공.', tip: '각 동료의 "한 방"을 클라이맥스용으로 아껴 두면 합류가 빛난다.' },
      { name: '진짜 흑막의 정체', desc: '배후의 진정한 적·음모가 드러나는 폭로.', tip: '흑막의 단서를 중반부터 흘려야 "정당한 반전"이 된다.' },
    ],
  },
  {
    key: 'worldbuild', label: '세계관 체크리스트', icon: '🌍', note: '판타지 세계를 일관되게 짓기 위한 점검 항목. 비어 있으면 채워라.',
    items: [
      { name: '지리·지도', desc: '대륙·왕국·산맥·미지의 땅. 관습상 지도 첨부가 흔하다.', tip: '거리·기후가 정치·경제·문화에 어떻게 작용하는지까지 생각하라.' },
      { name: '마법 체계 일관성', desc: '원천·습득법·비용·한계·사회적 위상이 자기 규칙을 어기지 않을 것.', tip: '규칙 위반은 "치트"로 느껴져 몰입을 깬다. 한 번 정한 규칙을 지켜라.' },
      { name: '종족과 문화', desc: '종족별 외형·수명·가치관·갈등사. 클리셰 전복 여지.', tip: '"왜 이 종족은 이렇게 사는가"를 환경·역사로 설명하라.' },
      { name: '정치·권력 구조', desc: '왕국·제국·교단·길드·마탑. 계승·음모·전쟁.', tip: '"누가 권력을 쥐고, 무엇으로 유지하는가"가 갈등의 엔진.' },
      { name: '종교·신화·창세', desc: '신·판테온·신앙이 마법·정치와 어떻게 얽히는가.', tip: '신이 실재하는가, 침묵하는가에 따라 세계의 분위기가 갈린다.' },
      { name: '경제·기술 수준', desc: '보통 중세 유럽 베이스. 마법이 기술·경제를 어떻게 대체·왜곡하는가(마도공학).', tip: '"마법이 있으면 왜 아직 칼로 싸우는가"의 답을 미리 준비하라.' },
      { name: '역사·연표', desc: '고대 대전쟁·왕조 흥망·봉인의 기원. 과거가 현재의 위협을 설명한다.', tip: '"지금의 갈등은 과거 어떤 사건의 결과인가"로 깊이를 만들어라.' },
      { name: '언어·명명 규칙', desc: '인명·지명·종족명의 음운 규칙. 일관된 작명이 세계의 결을 만든다.', tip: '엘프식/드워프식 등 종족별 음운 규칙을 정해두면 통일감이 생긴다.' },
      { name: '경이감(첫 등장 연출)', desc: '처음 보는 마법·생물·풍경의 경탄. 첫 등장에 공을 들여라.', tip: '"처음 본 순간"을 인물의 감각·반응으로 묘사하면 독자도 함께 놀란다.' },
      { name: '내적 일관성', desc: '마법·정치·경제·생물이 서로 모순되지 않을 것.', tip: '한 설정을 바꾸면 연쇄적으로 무엇이 달라지는지 추적하라.' },
      { name: '일상·생활상', desc: '먹고·입고·자고·믿는 평범한 삶. 세계를 "살아 있게" 만든다.', tip: '거대 서사 사이의 생활 디테일이 몰입의 접착제다.' },
      { name: '위협의 스케일 단계', desc: '개인→마을→왕국→세계로 확대되는 위협의 사다리.', tip: '초반에 작은 위협으로 규칙을 가르치고 점차 키워라.' },
    ],
  },
  {
    key: 'sensory', label: '감각·묘사 소재', icon: '🌫️', note: '판타지 장면을 살리는 구체적 감각·분위기 소재. 첫 등장·경이감 연출에.',
    items: [
      { name: '마법 발현의 시각', desc: '룬이 떠오르는 빛, 마법진의 회전, 마나의 아지랑이, 색을 가진 오러.', tip: '마법사마다 빛의 색·형태를 다르게 해 개성을 시각화하라.' },
      { name: '마법의 냄새·소리', desc: '오존 타는 냄새, 유황, 영창의 저음 울림, 마나가 도는 이명.', tip: '시각 외 감각을 더하면 마법이 "실재"하는 느낌이 강해진다.' },
      { name: '고대 유적·폐도시', desc: '이끼 낀 석상, 무너진 첨탑, 잊힌 문자, 봉인된 문.', tip: '"한때 영광스러웠으나 지금은 침묵하는" 대비로 시간을 느끼게.' },
      { name: '마법 생물의 기척', desc: '드래곤의 열기와 지축의 떨림, 정령의 한기, 언데드의 부패취.', tip: '등장 전 "기척"을 먼저 깔면 경이·공포가 증폭된다.' },
      { name: '이세계 하늘·천체', desc: '두 개의 달, 붉은 태양, 떠 있는 섬, 영원한 오로라.', tip: '하늘 하나만 바꿔도 "여긴 다른 세계"임을 단숨에 각인시킨다.' },
      { name: '마법 도시의 풍경', desc: '공중 부양 마차, 빛나는 가로등(마나석), 떠 있는 마탑, 차원문 시장.', tip: '마법과 일상의 융합 디테일이 "사는 세계"의 실감을 준다.' },
      { name: '의식·제의의 분위기', desc: '향연기, 촛불의 도열, 제단의 핏자국, 합창 같은 영창.', tip: '의식의 "절차"를 묘사하면 신성함·긴장이 쌓인다.' },
      { name: '전장·마법 전투', desc: '갈라지는 대지, 떨어지는 운석, 결계의 균열, 베인 오러의 잔광.', tip: '스케일은 "주변 환경의 파괴"로 보여주면 위력이 실감 난다.' },
      { name: '숲·자연의 마성', desc: '속삭이는 나무, 길을 바꾸는 안개, 정령의 빛, 시간이 다르게 흐르는 숲.', tip: '"들어가면 변해 나오는" 숲의 마성으로 시련의 무대를 만들어라.' },
      { name: '아티팩트의 존재감', desc: '맥동하는 보석, 속삭이는 검, 차가운 반지, 피를 부르는 갑주.', tip: '아이템에 "의지"의 감각을 주면 단순 도구가 아니게 된다.' },
    ],
  },
]

// 관련 도구(연계) — 판타지 세계관·인물·생물·작명·시스템 설계 도구로 잇는다.
const RELATED: { id: string; label: string }[] = [
  { id: 'world-wiki', label: '🌐 세계관 위키' },
  { id: 'setting-bible', label: '📔 배경 설정집' },
  { id: 'creature-designer', label: '🦎 창작 생물 설계기' },
  { id: 'conlang-forge', label: '🔤 가상 언어 대장간' },
  { id: 'culture-builder', label: '🏺 문화 설계기' },
  { id: 'character-forge', label: '🧬 캐릭터 생성기' },
  { id: 'curse-blessing-gen', label: '🪄 저주·축복 생성기' },
  { id: 'dnd-spell', label: '🪄 판타지 주문 자료' },
]

const LS = 'sry:tool:fan-genre-knowledge:'
const ALL_KEY = '__all__'
const flatAll = (): { cat: CatDef; item: Entry }[] =>
  CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (str: string) =>
  String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function GenreKnowledge({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 활용: 다른 장르 컨텍스트로 열려도 판타지 사전임을 안내(이 도구는 판타지 전용).
  const ctxGenre = typeof payload?.genre === 'string' ? (payload.genre as string) : undefined

  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 펼친 항목 키 집합 ("catKey::name")
  const [open, setOpen] = useState<Record<string, boolean>>({})
  // 즐겨찾기 ("catKey::name")
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<{ cat: CatDef; item: Entry } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])
  // 언마운트 정리: 토스트 타이머
  useEffect(() => () => { setToast(null); setCopiedKey(null) }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  const key = (catKey: string, name: string) => `${catKey}::${name}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[key(c.key, item.name)])
    if (q) base = base.filter(({ cat: c, item }) =>
      item.name.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q) ||
      (item.tip || '').toLowerCase().includes(q) ||
      c.label.toLowerCase().includes(q))
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    const pool = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.name === prev.item.name && pick.cat.key === prev.cat.key)
        pick = pool[Math.floor(Math.random() * pool.length)]
      // 무작위로 뽑은 항목은 펼쳐 둔다
      setOpen((o) => ({ ...o, [key(pick.cat.key, pick.item.name)]: true }))
      return pick
    })
  }, [cat])

  const toggleOpen = (catKey: string, name: string) => {
    const k = key(catKey, name)
    setOpen((o) => ({ ...o, [k]: !o[k] }))
  }
  const toggleFav = (catKey: string, name: string) => {
    const k = key(catKey, name)
    setFavs((p) => { const n = { ...p }; if (n[k]) delete n[k]; else n[k] = true; return n })
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* graceful */ })
  }
  const itemText = (c: CatDef, item: Entry) =>
    `${c.icon} ${c.label} · ${item.name}\n${item.desc}` + (item.tip ? `\n[활용] ${item.tip}` : '')

  // 연계: 현재(무작위 또는 펼친) 항목을 프로젝트 자료 〈판타지 지식〉 폴더에 메모로 추가.
  const addItemToProject = (c: CatDef, item: Entry) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(c.icon + ' ' + c.label)} · ${escapeHtml(item.name)}</b></p>`,
      `<p>${escapeHtml(item.desc)}</p>`,
      item.tip ? `<p><b>💡 활용</b><br>${escapeHtml(item.tip)}</p>` : '',
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '판타지 지식',
      title: `${item.name} (${c.label})`, bodyHtml,
      meta: { 장르: '판타지', 분류: c.label },
    })
    if (id) {
      setToast(`프로젝트 자료 〈판타지 지식〉에 ‘${item.name}’을(를) 추가했습니다.`)
      window.setTimeout(() => setToast((t) => (t && t.includes(item.name) ? null : t)), 2200)
    }
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px' }

  const curCatNote = cat !== ALL_KEY ? CATS.find((c) => c.key === cat)?.note : undefined

  return (
    <div style={wrap}>
      <div style={hint}>
        판타지 장르에서 자주 쓰는 소재·설정·고증 지식 <b>{total}개</b>를 <b>{CATS.length}개</b> 카테고리로 모았습니다.
        검색·펼침·무작위로 찾고, 마음에 드는 항목을 장면에 심어 보세요.
        {ctxGenre && ctxGenre !== '판타지' && (
          <span style={{ color: 'var(--accent)' }}> (현재 ‘{ctxGenre}’ 컨텍스트 — 이 사전은 판타지 전용입니다)</span>
        )}
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름·설명·활용으로 검색 (예: 마법, 회귀, 마왕, 복선, 종족)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
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
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={c.icon} /> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 소재</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {curCatNote && (
        <div style={{ ...hint, fontStyle: 'italic', borderLeft: '3px solid var(--accent)', paddingLeft: 8 }}>{curCatNote}</div>
      )}

      {/* 무작위 결과 강조 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{random.item.name}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0' }}>{random.item.desc}</div>
          {random.item.tip && (
            <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--accent)' }}><Emoji e="💡" /> {random.item.tip}</div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(itemText(random.cat, random.item), 'rnd')}>
              {copiedKey === 'rnd' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
            </button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>
              {favs[key(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
          {/* 연계: 프로젝트에 추가 */}
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => addItemToProject(random.cat, random.item)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 소재를 프로젝트 자료 〈판타지 지식〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
          </div>
        </div>
      )}

      {/* 추가 성공 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록 (펼침형) */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 소재가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const k = key(c.key, item.name)
            const isOpen = !!open[k]
            const isFav = !!favs[k]
            const copyId = 'it:' + k
            return (
              <div key={k} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => toggleOpen(c.key, item.name)}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /> {c.label}</span>
                  <span style={{ fontSize: 14.5, fontWeight: 700 }}>{item.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{isOpen ? '▲ 접기' : '▼ 펼치기'}</span>
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                    onClick={(e) => { e.stopPropagation(); toggleFav(c.key, item.name) }}
                    style={{ flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                {!isOpen && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 4, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.desc}</div>
                )}
                {isOpen && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 13, lineHeight: 1.55 }}>{item.desc}</div>
                    {item.tip && (
                      <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 5, color: 'var(--accent)' }}><Emoji e="💡" /> {item.tip}</div>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      <button className="minibtn" onClick={() => copy(itemText(c, item), copyId)}>
                        {copiedKey === copyId ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
                      </button>
                      <button className="minibtn" onClick={() => setRandom({ cat: c, item })} title="이 소재를 강조 보기"><Emoji e="🔎" /> 강조 보기</button>
                      <button className="linkbtn" onClick={() => addItemToProject(c, item)} disabled={!hasProjectBridge()}
                        title={hasProjectBridge() ? '이 소재를 프로젝트 자료 〈판타지 지식〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                        <Emoji e="📄" /> 프로젝트에 추가
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 관련 도구 연계 */}
      <div className="linkbar">
        <span className="linkbar-label">관련 도구:</span>
        {RELATED.map((r) => (
          <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: '판타지' })} title={`${r.label} 열기`}>
            {emojify(r.label)}
          </button>
        ))}
      </div>

      <div style={hint}>지식은 정답이 아니라 출발점입니다. 클리셰는 알고 비틀고, 빈칸은 세계관 체크리스트로 채워 보세요.</div>
    </div>
  )
}
