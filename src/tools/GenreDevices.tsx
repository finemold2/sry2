// 판타지 서사 장치·전개법 사전 — 이 장르 고유의 서사 장치(마법 시스템·예언·선택받은 자·아티팩트·
//  퀘스트·멘토·봉인된 악·종족 정치·시스템창·회빙환…)와 전개/구조 패턴·페이싱·클라이맥스 관습을
//  ① 정의 ② 사용법 ③ 예시 ④ 비틀기 로 정리한 로컬 사전. 도시에(샌더슨 법칙·영웅의 여정·웹소설
//  사이다/고구마·골든타임·하드/소프트 매직 등)에 근거한 자작 데이터.
//  펼침/접힘 + 카테고리 + 검색 + 무작위(중복 회피) + 즐겨찾기 + 클릭복사.
//  연계: 항목/현재 보기를 프로젝트 자료 〈판타지 장치〉 폴더 문서로 추가, 글감 스니펫 저장, 관련 도구 열기.
//  자급식 — react 와 './linkbus' 외 import 없음. 외부 API 없음. 상태는 localStorage 자동 저장/복원(graceful).
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'genre-devices', name: '판타지 서사 장치·전개 사전', icon: '🐉', group: '장치·전개', genre: '판타지', intro: '마법 시스템·예언·선택받은 자·퀘스트·시스템창·회빙환… 판타지 고유의 서사 장치와 전개·페이싱·클라이맥스 관습을 정의·사용법·예시·비틀기로', w: 680, h: 680 }

const LS = 'sry:tool:genre-devices:'
const ALL_KEY = '__all__'

// ── 데이터 모델: 한 항목 = 판타지 서사 장치/전개 관습 ──
interface Device {
  name: string         // 한국어 명칭
  aka?: string         // 원어/별칭
  def: string          // 정의 — 이 장치가 무엇인가(도시에 근거)
  how: string          // 사용법 — 어떻게 쓰는가(작법)
  example: string      // 예시 — 대표작/장면
  twist: string        // 비틀기 — 클리셰를 전복하는 변주
}
interface CatDef { key: string; label: string; icon: string; blurb: string; items: Device[] }

// 카테고리 5종(도시에 §4 서사 장치 / §5 전개·구조 / §6 클라이맥스 / 웹소설·로판 특화)
const CATS: CatDef[] = [
  {
    key: 'magic', label: '마법·세계규칙', icon: '✨',
    blurb: '마법 체계와 그 규칙·대가 — 판타지의 심장. 하드/소프트의 차이를 알고 다뤄라.',
    items: [
      {
        name: '하드 매직 시스템', aka: 'Hard Magic',
        def: '규칙·비용·한계가 명시적으로 정의된 마법. 독자가 작동 원리를 이해할 수 있어 플롯의 갈등 해결 도구로 정당하게 쓸 수 있다(미스트본의 금속별 능력, 어스시의 진명·등가교환).',
        how: '먼저 "할 수 있는 것/없는 것/치러야 할 대가"를 표로 못 박아라. 그 규칙 안에서만 위기를 해결하게 하라. 샌더슨 제1법칙 — 마법으로 갈등을 푸는 정당성은 독자가 그 마법을 이해한 정도에 비례한다. 결정타로 쓸 규칙·아이템·정보는 클라이맥스 전에 반드시 미리 보여 둬라.',
        example: '미스트본 — 금속을 "태워" 능력을 쓰되 금속이 소진되면 무력해진다. 알로맨시의 한계가 곧 전투의 전술이 된다.',
        twist: '규칙을 독자만 알고 인물은 모르게 하라(극적 아이러니). 혹은 "규칙의 허점"을 클라이맥스의 열쇠로 — 모두가 불가능하다 믿은 조합을 주인공이 합법적으로 찾아낸다.',
      },
      {
        name: '소프트 매직 시스템', aka: 'Soft Magic',
        def: '규칙이 불명확하고 신비에 싸인 마법. 경이·위협의 연출용이며 그 자체로 플롯을 풀면 데우스 엑스 마키나가 된다(간달프식, 톨킨의 힘).',
        how: '마법을 "해결책"이 아니라 "분위기·위협·경이"로 써라. 주인공의 위기는 마법이 아니라 인간적 선택·용기로 풀게 하라. 신비를 유지하려면 절대 다 설명하지 말고, 마법사가 무엇을 못 하는지를 더 자주 보여라.',
        example: '반지의 제왕 — 간달프의 힘은 끝내 체계화되지 않는다. 그래서 그의 등장은 매번 경이롭고, 절대반지는 그 힘으로 못 부순다(인간이 운반해야 한다).',
        twist: '소프트 매직 세계에 단 하나의 하드한 규칙(절대 금기)을 박아 두고, 그 금기의 위반/준수만으로 클라이맥스를 설계하라. 신비와 공정함을 동시에.',
      },
      {
        name: '마법의 대가·한계', aka: 'Cost & Limitation',
        def: '능력 자체보다 그 능력이 치르는 비용·약점·금기가 서사를 끌고 간다는 원칙. 샌더슨 제2법칙 — 마법은 할 수 있는 것보다 할 수 없는 것이 더 흥미롭다.',
        how: '새 능력을 줄 때마다 동등한 무게의 대가를 함께 설계하라: 마나 고갈, 수명·기억·인간성 침식, 부작용, 금주(禁呪), 정신 침식. 대가가 클수록 그 능력을 쓰는 "선택"이 드라마가 된다.',
        example: '어스시 — 진명으로 무엇이든 부릴 수 있으나, 세계의 "균형(Equilibrium)"을 깨면 반드시 반작용이 돌아온다. 게드의 자만이 그림자를 풀어놓는다.',
        twist: '대가를 "남이 대신 치르게" 하라 — 주인공의 마법이 강해질수록 사랑하는 이가 시들어 간다. 능력의 성장이 곧 죄책감의 누적이 되는 구조.',
      },
      {
        name: '서클·등급 마법 체계', aka: 'Circle / Tier System',
        def: '1~9서클처럼 마법사의 격을 단계로 수치화한 동양 판타지 관습. 영창·캐스팅·마법진·룬·인챈트 등 시전 절차와 함께 작동한다.',
        how: '서클(경지)마다 "할 수 있는 일의 질적 도약"을 명확히 차등화하라(양적 인플레가 아니라 질적 벽). 주인공이 한 서클 오를 때마다 세계가 다르게 보이게 하라. 영창 길이·마나 소모로 전투의 리듬을 만든다.',
        example: '국산 정통 판타지의 8서클·9서클 대마법사 — 경지 간 격차가 절대적이라, 한 단계 돌파가 곧 전세 역전이 된다.',
        twist: '서클을 "거짓 지표"로 — 낮은 서클이 높은 서클을 이기는 구조(효율·창의·금기 활용). 수치가 강함을 보장하지 않음을 폭로해 인플레의 함정을 비튼다.',
      },
      {
        name: '정령·소환·계약 마법', aka: 'Summoning & Pact',
        def: '정령·소환수·사역마와의 계약으로 힘을 빌리는 마법. 힘의 원천이 "외부 존재"이므로 관계·대가·배신의 드라마가 내장된다.',
        how: '소환수를 도구가 아니라 의지를 가진 인격으로 다뤄라. 계약 조건(대가·기한·금기)을 명시하고, 그 조건이 클라이맥스에서 발목을 잡거나 구원이 되게 하라. 정령은 속성·기질로 캐릭터화한다.',
        example: 'TRPG 기원 판타지의 정령술사 — 상위 정령일수록 변덕스럽고 대가가 크다. 계약 위반은 곧 정령의 반란.',
        twist: '소환된 "도구"가 사실 주인공보다 현명하거나, 계약의 진짜 주인이 누구인지 뒤집어라. 부리는 자와 부려지는 자의 위계를 전복한다.',
      },
      {
        name: '금주·흑마법·금기', aka: 'Forbidden Arts',
        def: '세계가 금지한 마법(네크로맨시·금주·인신공양·시간 마법). 강력하지만 사용 자체가 도덕적·물리적 파국을 부른다.',
        how: '금기를 "왜 금지되었는가"의 역사로 뒷받침하라(과거의 대재앙). 주인공이 금기에 손대는 순간을 "넘지 말아야 할 선"으로 무겁게 연출하고, 그 대가를 반드시 회수하라.',
        example: '언데드·리치·네크로맨서 계열 — 죽음을 거스른 자는 인간성과 영혼을 조금씩 잃는다. 금주는 늘 마지막 카드여야 한다.',
        twist: '"악한 금주"가 사실 세계를 구하는 유일한 길이 되게 하라. 주인공이 영웅이 되기 위해 스스로 금기를 범하고 괴물이 되는 비극.',
      },
      {
        name: '마도공학·마법 산업화', aka: 'Magitech',
        def: '마법을 기술·경제·전쟁에 산업적으로 적용한 세계(마법 기차·마도 병기·마정석 발전). 중세 베이스를 비틀어 마법이 사회 구조를 바꾼 설정.',
        how: '"마법이 흔해지면 사회가 어떻게 바뀌는가"를 외삽하라 — 계급, 노동, 전쟁, 빈부. 마법을 경이가 아니라 인프라로 다루되, 그로 인한 새로운 갈등(독점·격차·환경)을 만든다.',
        example: '마정석 동력 도시·마도 비공정 — 마법이 석유 같은 자원이 되어 그것을 둘러싼 제국 간 전쟁이 벌어진다.',
        twist: '산업화된 마법이 한계에 부딪히고, 잊힌 "원시적·신비적 마법"이 진짜 답이 되게 하라. 진보 서사를 거꾸로 뒤집는다.',
      },
    ],
  },
  {
    key: 'plot', label: '서사 장치', icon: '🗝️',
    blurb: '예언·선택받은 자·아티팩트·퀘스트·멘토·봉인된 악 — 판타지를 굴리는 동력 장치들.',
    items: [
      {
        name: '예언', aka: 'Prophecy',
        def: '운명을 미리 예고해 긴장과 필연감을 부여하는 장치. 정공법(예언대로 성취)과 비틀기(자기실현·오역·반전)의 두 길이 있다.',
        how: '예언은 모호하게 — 여러 해석이 가능하되 결말에서 단 하나로 수렴하게 설계하라. 예언이 인물을 움직이는 동력이 되게 하되, 모든 걸 예언으로 강제 진행하면 인물의 선택이 사라지니 절제하라.',
        example: '시간의 수레바퀴·수많은 영웅 서사 — "선택받은 자가 어둠을 무찌르리라"는 예언이 주인공을 여정으로 떠민다.',
        twist: '자기실현적 예언으로 — 예언을 피하려는 행동이 정확히 예언을 성취시킨다(오이디푸스 구조). 혹은 예언이 의도적 거짓·오역이었음을 폭로하라.',
      },
      {
        name: '선택받은 자', aka: 'The Chosen One',
        def: '혈통·표식·예언으로 정당화된 특별한 운명의 주인공. 평범한 자가 사실 특별했다는 판타지의 핵심 동력이자 최대 클리셰.',
        how: '"선택"에 책임과 대가를 부여하라 — 운명은 축복이자 저주. 특별함을 타고난 것으로만 두지 말고, 선택받은 자가 그 자격을 "행동으로 증명"하게 하라.',
        example: '반지의 제왕 — 프로도는 강해서가 아니라 "유혹에 가장 덜 물들" 수 있어 선택된다. 작은 자의 영웅성.',
        twist: '"선택받은 자가 가짜였다" 혹은 "선택받지 못한 자가 스스로 선택을 만든다". 진짜 영웅은 운명이 아니라 의지로 정해진다는 전복.',
      },
      {
        name: '마법 아티팩트', aka: 'Artifact / Magic Item',
        def: '엑스칼리버·절대반지처럼 막강한 힘을 지닌 마법 물건. 단순 도구를 넘어 의지·대가·중독성을 가질 때 서사가 깊어진다.',
        how: '아이템에 "양날의 검" 속성을 부여하라 — 힘을 줄수록 사용자를 잠식한다. 아이템의 기원·금기·파괴 조건을 설계하고, 그것을 두고 벌어지는 욕망의 자기장을 그려라.',
        example: '절대반지 — 무한한 힘이지만 끼는 자를 부패시킨다. 그래서 "쓰는" 이야기가 아니라 "버리는(파괴하는)" 이야기가 된다.',
        twist: '전설의 아티팩트가 사실 무력하거나 함정이게 하라. 진짜 힘은 평범해 보이던 물건/주인공 자신에게 있었다는 반전.',
      },
      {
        name: '퀘스트·여정', aka: 'The Quest',
        def: '맥거핀을 찾거나 파괴하기 위한 여정. 동료(party) 결성과 길 위의 시련이 성장과 관계의 무대가 된다.',
        how: '목적지보다 "여정에서 변하는 것"에 무게를 두라. 일행 각자에게 다른 동기·비밀을 주고, 여정의 각 구간이 하나의 시련·성장 단위가 되게 하라. 스케일을 점진적으로 키워라(마을→대륙).',
        example: '반지 원정대 — 반지를 운반·파괴하는 단순한 목표가, 종족을 가로지른 동료애와 각자의 시험으로 채워진다.',
        twist: '여정의 목적 자체가 거짓이었거나, 도착하니 의미가 사라지게 하라(맥거핀의 무의미화). "찾는 것"보다 "찾는 동안 잃고 얻은 것"이 진짜 보상.',
      },
      {
        name: '멘토', aka: 'The Mentor',
        def: '주인공에게 지혜·힘·소명을 전수하는 현자(간달프·덤블도어·오비완). 흔히 중반에 퇴장(죽음)시켜 주인공을 자립시킨다.',
        how: '멘토를 만능 해결사로 두지 말고, 그가 "곁에 있는 동안" 의존을 만든 뒤 결정적 순간에 떠나보내라. 멘토의 죽음/부재가 주인공의 진짜 각성을 촉발하게 설계하라.',
        example: '간달프의 추락(모리아), 덤블도어·오비완의 죽음 — 스승의 부재가 제자를 진짜 주인공으로 만든다.',
        twist: '멘토가 사실 배신자·진짜 악역이거나, 그의 가르침이 틀렸음을 주인공이 깨닫게 하라. 스승을 넘어서는 것이 아니라 "부정"해야 성장하는 구조.',
      },
      {
        name: '봉인된 악·고대의 위협', aka: 'Sealed Evil / Ancient Threat',
        def: '잠든 마왕·봉인된 재앙이 풀려나며 세계를 위협하는 장치. 봉인 해제 카운트다운이 긴장의 시계를 단다.',
        how: '봉인의 "역사"를 현재의 위협으로 직결시켜라(과거가 현재를 설명). 봉인이 약해지는 징조를 점진적으로 흩뿌리고, 해제의 책임이 주인공과 얽히게 하라.',
        example: '눈물을 마시는 새·수많은 대전쟁 전사(前史) — 봉인된 고대의 존재가 깨어나며 세계의 질서가 흔들린다.',
        twist: '봉인된 "악"이 사실 세계를 지탱하던 존재였거나, 진짜 악은 그것을 봉인한 자들이었음을 폭로하라. 선악의 봉인을 거꾸로 뒤집는다.',
      },
      {
        name: '종족·종족 정치', aka: 'Races & Politics',
        def: '엘프·드워프·오크·하플링 등 이종족과 그들의 외형·수명·가치관·역사적 갈등. 종족 간 정치가 거대 서사의 축이 된다.',
        how: '각 종족에 "수명·가치관에서 비롯된 고유의 세계관"을 부여하라(장수 종족의 권태, 단명 종족의 절박). 종족 갈등을 단순 선악이 아니라 역사·자원·오해의 누적으로 그려라.',
        example: '눈물을 마시는 새 — 나가·도깨비·레콘·인간, 각 종족의 생리(물을 못 견딤 등)가 곧 세계관과 갈등의 근원이 된다.',
        twist: '"야만적 악역" 오크에게 문화·언어·억울한 역사를 주어 시점 인물로 삼아라. 엘프=고결, 드워프=구두쇠 같은 클리셰를 정면으로 부순다.',
      },
      {
        name: '저주·축복', aka: 'Curse & Blessing',
        def: '대상에게 거는 지속적 마법 효과. 강력한 힘에는 대가가, 저주에는 해제의 조건이 따라붙어 플롯의 시한과 목표를 만든다.',
        how: '저주/축복에 "해제 조건"을 명시해 그것이 곧 퀘스트가 되게 하라. 축복은 양날로, 저주는 의외의 선물로 — 둘의 경계를 흐려 아이러니를 만든다.',
        example: '미녀와 야수형 저주 — 풀 수 있는 조건(진정한 사랑 등)이 곧 이야기의 목표선이 된다.',
        twist: '저주가 사실 보호였거나, 축복이 사실 가장 잔인한 저주였음을 드러내라. 받은 자가 끝내 저주를 "해제하지 않기로" 선택하는 역설.',
      },
    ],
  },
  {
    key: 'structure', label: '전개·구조', icon: '🧭',
    blurb: '영웅의 여정·세계관 공개·다중 시점·상승하는 스케일 — 판타지 장편의 골격과 페이싱.',
    items: [
      {
        name: '영웅의 여정', aka: "Hero's Journey / Monomyth",
        def: '일상→모험의 부름→거부→멘토→관문 통과→시련·동료·적→심연→절정→보상→귀환→부활→변화로 이어지는 신화적 3막 구조. 판타지 장편의 기본 골격.',
        how: '12단계를 기계적으로 채우지 말고, 인물의 내적 결핍을 각 단계에 매핑하라. "모험의 거부"와 "가장 깊은 동굴(심연)"을 충실히 그려야 부활의 카타르시스가 산다.',
        example: '스타워즈·반지의 제왕 — 평범한 자가 부름을 받아 떠나고, 시련을 거쳐 다른 존재가 되어 돌아온다.',
        twist: '여정을 완주하지 못하게 하거나(반-영웅), "귀환할 일상이 사라진" 결말로. 단계를 역순·해체해 독자의 구조적 기대를 의도적으로 배반하라.',
      },
      {
        name: '세계관 점진 공개', aka: 'Worldbuilding Drip',
        def: '방대한 설정을 도입부에 쏟지 않고 이야기 흐름 속에서 필요할 때마다 조금씩 흘리는 기법. "보여주되 설명하지 말 것."',
        how: '독자가 알아야 할 최소한만, 행동·대사·갈등 속에 녹여라. 낯선 용어는 맥락으로 추론 가능하게 던지고, 설정집을 통째로 읊는 인포덤프를 경계하라(빙산의 일각 원칙).',
        example: '미스트본·바람의 이름 — 마법 규칙을 강의하지 않고 "쓰는 장면"으로 자연히 익히게 한다.',
        twist: '의도적으로 정보를 "잘못" 흘려라 — 독자가 믿게 된 세계관이 후반에 통째로 거짓이었음이 드러나는 구조(믿을 수 없는 세계).',
      },
      {
        name: '다중 시점 서사시', aka: 'Multiple POV Epic',
        def: '여러 인물의 시점을 교차하며 같은 세계를 다각도로 보여주는 대하 구조. 각 시점이 독립 긴장을 갖고 수렴한다(마틴·조던식).',
        how: '시점은 장·챕터 단위로 명확히 나누고, 각 인물에게 "그 인물만 아는 정보"를 쥐게 하라. 독자는 전모를, 인물은 한계를 — 그 낙차로 극적 아이러니와 서스펜스를 만든다.',
        example: '얼음과 불의 노래 — 챕터마다 시점 인물이 바뀌며, 한 사건이 여러 진실로 갈라지고 결국 한 그림으로 맞춰진다.',
        twist: '시점 인물을 가차 없이 죽여 "안전한 캐릭터는 없다"를 각인시켜라. 혹은 신뢰하던 시점 인물이 실은 가장 믿을 수 없는 화자였음을 드러내라.',
      },
      {
        name: '상승하는 스케일', aka: 'Escalating Scale',
        def: '개인의 위기가 마을→도시→왕국→대륙→세계/신의 운명으로 점차 확대되는 판타지 특유의 확장 구조.',
        how: '스케일을 단계마다 한 칸씩 올리되, 매 단계의 판돈을 "구체적 인물"에 묶어라(세계가 아니라 그 안의 한 사람을 잃을 위험). 스케일이 커질수록 감정의 닻은 작고 개인적이어야 한다.',
        example: '반지의 제왕 — 샤이어의 평화에서 시작해 가운데땅 전체의 운명으로 확장되지만, 끝내 "고향으로의 귀환"으로 닫힌다.',
        twist: '스케일을 거꾸로 — 세계급 위협처럼 보이던 것이 사실 한 가정·한 사람의 사적 비극이었음을 드러내라. 거대함을 친밀함으로 환원한다.',
      },
      {
        name: '액자식 회고 구조', aka: 'Frame Narrative',
        def: '현재의 화자가 과거의 자기 이야기를 들려주는 형식. 미문(美文)과 운명감, 신빙성에 대한 의문을 동시에 자아낸다.',
        how: '바깥 화자의 "현재 처지"와 안 이야기의 "과거 영광" 사이 낙차로 긴장을 만들어라. 화자가 자기 이야기를 미화·왜곡할 여지를 남겨 재독의 묘미를 심어라.',
        example: '바람의 이름 — 전설이 된 콰스가 여관에서 자신의 진짜 이야기를 사흘에 걸쳐 풀어놓는다.',
        twist: '회고하는 화자의 진술과 곳곳의 객관적 단서를 어긋나게 심어, 그가 영웅이 아니라 가해자·실패자였을 가능성을 행간에 숨겨라.',
      },
      {
        name: '에피소드 누적 + 거대 떡밥', aka: 'Episodic + Arc',
        def: '던전 공략·토너먼트·시험 같은 단위 에피소드를 연쇄하면서, 그 위에 장편을 관통하는 거대 떡밥(메인 아크)을 깔아 두는 구조.',
        how: '각 에피소드는 자체로 완결된 보상(승리·아이템·관계)을 주되, 끝마다 메인 아크의 단서를 한 조각씩 남겨라. 단기 만족과 장기 궁금증을 동시에 굴린다.',
        example: '능력 배틀물·헌터물 — 매 던전/토너먼트가 독립 에피소드이면서, 전체를 관통하는 "세계의 비밀"이 서서히 드러난다.',
        twist: '단위 에피소드들이 사실 무작위가 아니라 누군가 설계한 "거대한 판"의 일부였음을 폭로하라. 반복되던 일상이 음모의 무대였다는 전복.',
      },
    ],
  },
  {
    key: 'climax', label: '클라이맥스·페이싱', icon: '⚔️',
    blurb: '최종 결전·복선 회수·희생·각성·대가 치르기 — 절정의 카타르시스를 설계하는 관습.',
    items: [
      {
        name: '최종 결전', aka: 'Final Battle',
        def: '마왕·대마법사·신과의 대결. 개인의 능력 + 동료의 연계 + 세계관 규칙이 총동원되는 클라이맥스.',
        how: '결전을 힘 대 힘의 단순 충돌이 아니라 "그동안 쌓은 모든 것의 시험"으로 설계하라 — 배운 규칙, 모은 동료, 치른 희생이 한 장면에 수렴하게 하라. 적의 강함을 미리 충분히 증명해 둬야 승리가 값지다.',
        example: '대마왕과의 최후 결전 — 주인공 혼자가 아니라, 여정에서 얻은 동료·아이템·깨달음이 톱니처럼 맞물려 이긴다.',
        twist: '주먹이 아니라 "이해·용서·자기희생"으로 적을 무너뜨려라. 혹은 진짜 최종전이 외부의 마왕이 아니라 주인공 내면의 어둠과의 싸움이게 하라.',
      },
      {
        name: '복선의 일괄 회수', aka: 'Payoff Convergence',
        def: '앞서 심어 둔 규칙·아이템·정보가 클라이맥스에서 결정타로 한꺼번에 회수되는 카타르시스 장치. 하드 매직일수록 효과가 크다.',
        how: '회수할 순간을 먼저 정하고 거꾸로 복선을 심어라(역설계). 무심한 디테일로 깔아 둔 단서가 "아, 그래서!"의 쾌감으로 터지게 하라. 절정에서 새 능력을 갑툭튀시키는 데우스 엑스 마키나는 최대 금기.',
        example: '미스트본의 결말 — 초반부터 흩뿌린 마법 규칙과 사소한 디테일이 마지막에 단 하나의 해법으로 수렴한다.',
        twist: '독자가 "복선"이라 믿은 것들이 모두 함정(레드 헤링)이고, 진짜 열쇠는 무시당하던 곳에 있었음을 드러내라. 회수의 방향 자체를 비튼다.',
      },
      {
        name: '희생', aka: 'Sacrifice',
        def: '멘토·동료·주인공 자신의 희생으로 승리에 무게를 부여하는 장치. 공짜 승리는 가볍다.',
        how: '희생할 인물·가치를 미리 충분히 사랑하게 만들어라(애착 없이는 상실도 없다). 희생이 "어쩔 수 없는 것"이 아니라 인물의 "선택"이 되게 하라. 승리의 기쁨에 상실의 그림자를 겹쳐라.',
        example: '간달프의 추락, 수많은 동료의 산화 — 누군가의 죽음이 승리의 길을 연다.',
        twist: '희생이 헛되게 하라(아무것도 못 바꾼 죽음), 혹은 "죽지 않는 것"이 더 큰 희생이게 하라(살아남아 모든 걸 감당하는 형벌로서의 생존).',
      },
      {
        name: '각성·진명 해방·변신', aka: 'Awakening / True Name',
        def: '주인공이 봉인된 진짜 힘·정체를 개방하는 변신의 순간. 성장의 정점이자 클라이맥스의 시각적 절정.',
        how: '각성을 위한 "방아쇠"를 감정적 한계점에 두라(소중한 것의 상실, 각오의 완성). 각성 전 충분히 무력했어야 그 해방이 카타르시스가 된다. 진명·봉인의 정체를 복선으로 미리 깔아라.',
        example: '봉인된 혈통/진명의 각성 — 절체절명의 순간, 주인공이 자신의 진짜 정체와 힘을 처음으로 온전히 개방한다.',
        twist: '각성한 "진짜 힘"이 사실 저주이거나, 진명을 되찾자 자아를 잃게 하라. 해방이 곧 상실인 비극적 변신.',
      },
      {
        name: '마법의 대가 치르기', aka: 'Paying the Price',
        def: '승리에 반드시 비용(상실·후유증·세계의 영구적 변화)을 부과해 결말에 깊이를 더하는 관습. 마법은 공짜가 아니다.',
        how: '클라이맥스의 큰 마법/금기에는 큰 대가를 — 능력 상실, 기억·수명의 소진, 마법이 사라진 세계. 대가를 통해 "이긴 자가 무엇을 잃었는가"를 보여 결말에 여운을 남겨라.',
        example: '어스시·반지의 제왕 — 악을 물리치되, 마법(요정)의 시대가 끝나거나 주인공이 더는 예전으로 돌아갈 수 없게 된다.',
        twist: '대가를 즉시 치르지 않고 "다음 세대/속편의 빚"으로 미뤄라. 혹은 승리의 대가가 너무 커서 "이기지 않는 편이 나았다"는 회의를 남겨라.',
      },
      {
        name: '파워 인플레이션 관리', aka: 'Power Creep Control',
        def: '주인공이 강해질수록 위기의 긴장이 빠지는 문제를 "벽과 돌파"의 리듬으로 관리하는 페이싱 기법.',
        how: '주인공이 강해지면 적·판돈도 함께 키우되, 단순 수치 경쟁이 아니라 "새로운 종류의 위협"으로 갱신하라(물리→정치→내면). 압도적 강함에는 그에 걸맞은 "쓸 수 없는 상황·도덕적 족쇄"를 채워 긴장을 유지하라.',
        example: '장편 연재물 — 주인공이 천하무적이 되면, 적을 더 세게 만드는 대신 "지킬 수 없는 것·풀 수 없는 딜레마"로 위기를 만든다.',
        twist: '의도적으로 주인공을 "강함의 정점에서 추락"시켜라(능력 상실·봉인). 가장 강했던 자가 가장 약해진 채 다시 오르는 구조로 긴장을 재점화한다.',
      },
    ],
  },
  {
    key: 'webnovel', label: '웹소설·로판', icon: '📱',
    blurb: '회빙환·시스템창·사이다/고구마·골든타임·악역영애 — 연재형 판타지의 핵심 코드.',
    items: [
      {
        name: '회귀·빙의·환생', aka: '회빙환',
        def: '미래 지식·전생 기억을 통한 정보 우위로 이야기를 굴리는 한국 웹소설의 3대 엔진. 주인공이 남들이 모르는 결말을 안다.',
        how: '"정보 우위"를 사이다의 연료로 써라 — 남들은 모르는 미래·약점·기연을 주인공만 알기에 통쾌한 역전이 가능하다. 다만 전지(全知)가 긴장을 죽이지 않게, 지식이 어긋나는 "변수"를 의도적으로 심어라.',
        example: '회귀물·전생물 — "이번 생은 다르게 살겠다"며 전생의 실패와 미래 지식을 발판으로 운명을 다시 쓴다.',
        twist: '회귀했더니 미래가 이미 바뀌어 지식이 무용해지게 하라, 혹은 "나만 회귀한 게 아니었음"을 드러내라. 정보 우위를 빼앗아 진짜 실력을 시험한다.',
      },
      {
        name: '시스템·스테이터스 창', aka: 'System / Status Window',
        def: '레벨·스탯·스킬·퀘스트·상점 같은 게임 UI를 서사에 삽입하는 장치. 성장의 수치화와 즉각적 보상을 가시화한다(헌터물의 핵심).',
        how: '시스템을 "성장의 눈금자"로 써서 독자가 강해짐을 실시간으로 체감하게 하라. 레벨업·스킬 획득·알림음을 회차의 보상 비트로 배치하라. 단, 시스템이 만능이 되지 않게 "퀘스트의 대가·페널티"를 함께 설계하라.',
        example: '나 혼자만 레벨업류 — "레벨이 올랐습니다" 알림과 스탯 분배가 곧 성장의 카타르시스이자 회차의 후킹이 된다.',
        twist: '시스템의 "정체·목적"을 미스터리로 — 누가, 왜 이 시스템을 줬는가. 친절한 보상 기계가 사실 거대한 시나리오의 통제 장치였음을 폭로하라.',
      },
      {
        name: '사이다·고구마 리듬', aka: 'Catharsis Pacing',
        def: '답답함(고구마)을 쌓고 시원한 응징·역전(사이다)으로 해소하는 웹소설의 정서 리듬. 회차당 최소 1회의 카타르시스가 약속이다.',
        how: '고구마는 "사이다를 위한 장전"일 뿐 — 너무 길면 독자가 이탈한다. 굴욕·억울함을 또렷이 쌓되, 빠르게 통쾌하게 되갚아라. 응징의 대상·방식·타이밍을 구체적으로 설계하라.',
        example: '무시당하던 약자가 각성/회귀로 자신을 멸시한 가족·문파를 압도적으로 되갚는 전형적 사이다 전개.',
        twist: '사이다 끝에 "공허함·대가"를 남겨 단순 응징을 넘어서라. 혹은 고구마를 끝내 사이다로 갚지 않고 "용서·초탈"로 승화해 기대를 비튼다.',
      },
      {
        name: '초반 골든타임', aka: 'Opening Golden Time',
        def: '연재 1~5화 안에 세계관·주인공·차별점·첫 사이다를 즉시 제시해야 한다는 웹소설의 진입 규칙. 회귀/각성 트리거를 빠르게.',
        how: '1화에서 강력한 후킹(상황·떡밥·반전)으로 끌고, 도입부 인포덤프를 피하라. 주인공의 목표·차별화 코드를 빠르게 선언하고, 초반에 작은 사이다를 한 번 터뜨려 "이 작품의 맛"을 증명하라.',
        example: '첫 화부터 회귀/각성 트리거가 발동해, 독자가 "이번엔 어떻게 다를까"를 즉시 궁금해하게 만드는 도입.',
        twist: '의도적 "저점 출발"로 — 1화의 주인공을 철저히 무력·바닥에 두어 이후의 상승 폭을 극대화한다(역골든타임 베팅). 다만 1화 내 반전 약속은 분명히.',
      },
      {
        name: '회차 클리프행어', aka: 'Per-Episode Hook',
        def: '매 회차 끝에 다음 화를 부르는 긴장·궁금증을 거는 연재형 후킹. 약 5천 자 안에 기승전결과 미끼를 담는다.',
        how: '회차 끝마다 또렷한 미끼 질문(누가? 왜? 어떻게?)을 남겨라. 클라이맥스 직전 또는 폭로 직전에서 끊어라. 단, 매 화 미끼만 던지고 회수하지 않으면 피로해지니 약속을 지켜라.',
        example: '"그때, 닫히던 문틈으로 익숙한 그림자가 비쳤다 —" 하고 회차가 끝나 다음 화 결제를 부른다.',
        twist: '클리프행어를 의도적으로 "김빠지게" 해소해 독자의 과장된 기대를 비틀거나, 한 회차를 완결감 있게 닫아 호흡을 환기하라(역설적 후킹).',
      },
      {
        name: '악역영애·원작 빙의', aka: '로판 코드',
        def: '소설/게임 속 악역(특히 악역영애)에 빙의해 정해진 파멸 플래그를 회피·전복하는 로맨스 판타지의 핵심 설정.',
        how: '"원작의 결말을 아는" 정보 우위를 동력으로, 파멸 플래그를 하나씩 무력화하는 과정을 단계적 사이다로 배치하라. 황실·귀족 정치를 갈등의 무대로, 차갑지만 주인공에게만 다정한 상대역의 변화를 로맨스 곡선으로 그려라.',
        example: '재혼 황후·상수리나무 아래류 — "원작에선 죽는 악역이었다"는 자각에서 출발해, 회귀/빙의 지식으로 운명을 다시 쓴다.',
        twist: '원작 지식이 틀렸거나 세계가 "원작"이 아니었음을 드러내라, 혹은 빙의한 "악역"이 사실 진짜 주인공이었음을 폭로해 메타적 전복을 만든다.',
      },
      {
        name: '기연·치트', aka: 'Lucky Break / Cheat',
        def: '우연한 비급·영약·특별한 시스템 등 주인공에게 주어지는 성장의 발판. 사이다의 연료지만 남용하면 긴장이 죽는다.',
        how: '기연은 "공짜"로 두지 말고 그것을 "쓸 자격·대가·리스크"를 부여하라. 기연으로 얻은 힘을 "어떻게 활용하는가"의 영리함에 초점을 옮겨, 운이 아니라 실력의 서사로 전환하라.',
        example: '우연히 얻은 절대적 시스템/비급으로 약자가 최강으로 도약하는 전형적 도입.',
        twist: '기연이 사실 함정·빚이었거나, 모두가 같은 치트를 가진 세계에서 "치트 없이" 이겨야 하게 하라. 손쉬운 성장 공식을 정면으로 비튼다.',
      },
    ],
  },
]

// 조합수: 각 항목을 [정의·사용법·예시·비틀기] 4개의 독립 "관점 슬롯"으로 보면,
// 사전 항목 N개에서 관점을 무작위로 조합해 영감 카드를 만들 수 있다. 아래 무작위 영감은
// (항목 × 항목 × 항목)의 서로 다른 3장 뽑기 + 슬롯 배정으로 막대한 조합을 만든다.
const ALL_ITEMS = (): { cat: CatDef; item: Device }[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))
const TOTAL = CATS.reduce((n, c) => n + c.items.length, 0)
// 영감 조합수: 서로 다른 3항목 순열(P(N,3)) × 4개 관점 슬롯 배정(4^3) — 표기용 추정치.
const combos = (() => {
  const N = TOTAL
  const perm3 = N * (N - 1) * (N - 2)
  return perm3 * 4 * 4 * 4
})()
// ── 한국어 조사 헬퍼: 앞 글자의 받침 유무로 실제 형태 하나를 골라 붙인다(괄호 이중표기 금지) ──
// 마지막 음절이 한글이면 받침 유무로 판정. 'ㄹ' 받침은 '으로/로'에서 받침 없음처럼 취급.
const lastSyl = (w: string): number | null => {
  for (let i = w.length - 1; i >= 0; i--) {
    const c = w.charCodeAt(i)
    if (c >= 0xac00 && c <= 0xd7a3) return c
  }
  return null
}
const hasJong = (w: string): boolean => { const c = lastSyl(w); return c == null ? false : (c - 0xac00) % 28 !== 0 }
const jongCode = (w: string): number => { const c = lastSyl(w); return c == null ? 0 : (c - 0xac00) % 28 }
// 을/를, 이/가, 은/는: 받침 있으면 앞(을·이·은), 없으면 뒤(를·가·는)
const J_obj = (w: string) => w + (hasJong(w) ? '을' : '를')
const J_sub = (w: string) => w + (hasJong(w) ? '이' : '가')
const J_top = (w: string) => w + (hasJong(w) ? '은' : '는')
// 으로/로: 받침 없거나 'ㄹ'(28진법 8) 받침이면 '로', 그 외 받침이면 '으로'
const J_with = (w: string) => { const j = jongCode(w); return w + (j === 0 || j === 8 ? '로' : '으로') }

const fmtCombos = (n: number): string => {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(2) + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(1) + '만'
  return String(n)
}

// ── 장치 조합 프롬프트 생성기 ──
// 판타지 장치 사전의 정신을 살려, 서로 독립적인 6개 슬롯(세계·주인공·목표·수단·시련·반전결말)에서
// 하나씩 무작위로 뽑아 문법적으로 온전한 한 문장의 '이야기 씨앗'을 만든다. 각 슬롯은 다른 슬롯을
// 전제하지 않으므로 곱집합으로 섞여도 의미 충돌이 없다. 조사는 헬퍼로 받침을 보고 실제 하나만 출력.
// 문형: 「<세계>에서 <주인공>은/는 <목표>을/를 <수단>으로/로 좇는다. <시련>이/가 길을 막지만, <반전결말>.」

// ① 세계(공간 명사구) — '…에서'에 자연히 붙는다.
const SLOT_WORLD: string[] = [
  '마나가 고갈되어 가는 제국', '두 개의 달이 뜨는 변경', '용이 잠든 화산 지대', '시간이 거꾸로 흐르는 고성',
  '신들이 떠나 버린 폐허 도시', '얼음에 봉인된 북방 왕국', '부유하는 마법 군도', '안개가 기억을 지우는 늪지',
  '계급이 마력으로 정해지는 도시국가', '대마법사들이 다스리는 탑의 도시', '죽은 자가 잠들지 못하는 황무지', '별빛으로 마법을 짜는 사막 부족',
  '강철과 마정석이 뒤섞인 공업 도시', '엘프와 인간이 휴전 중인 국경 숲', '예언이 법전이 된 신정 왕국', '바다 밑에 가라앉은 옛 수도',
  '하룻밤마다 지형이 바뀌는 미궁 대륙', '마법이 금지된 청교 왕국', '거대수의 가지 위에 세워진 도시', '용병 길드가 실권을 쥔 자유도시',
  '저주받은 가문들이 모인 귀족 영지', '영원한 황혼에 잠긴 경계의 땅', '드워프의 지하 갱도 왕국', '환생자들이 모여드는 변두리 마을',
  '시스템이 인간을 등급으로 나눈 신세계', '잊힌 신을 섬기는 산정 수도원', '마수가 들끓는 폐쇄된 던전 도시', '왕위 계승 전쟁이 한창인 황도',
  '교단이 마법을 독점한 성도', '유랑 극단이 떠도는 변경 가도', '결계로 둘러싸인 마법 학원', '망령이 항구를 떠도는 무역 도시',
  '계약 정령이 흔한 상인 연합 도시', '폭풍이 멈추지 않는 절벽 요새', '금광 대신 마정석이 쏟아진 광산 마을', '서로 다른 세계가 겹쳐진 틈의 경계',
  '대륙을 가르는 마법 장벽의 그늘', '불멸자들이 권태에 잠긴 천공 도시', '회귀자들의 비밀 결사가 숨은 수도', '재앙 이후 마법이 사라진 잿빛 대지',
  '신탁이 매일 바뀌는 신전 도시', '용의 피를 거래하는 암시장 골목', '봉인이 풀려 가는 고대 유적지', '마도 열차가 대륙을 잇는 연합국',
  '악역영애의 파멸이 예정된 소설 속 황실',
]
// ② 주인공(인물 명사구) — '…은/는'(주제격).
const SLOT_HERO: string[] = [
  '기억을 잃은 용병', '회귀한 몰락 귀족', '예언에 지목된 고아', '계약 정령을 잃은 소환사', '금주에 손댄 견습 마법사',
  '시스템에 각성한 최약체 헌터', '왕좌에서 쫓겨난 망명 왕자', '신을 의심하는 젊은 사제', '진명을 빼앗긴 마지막 용', '저주받은 검을 물려받은 기사',
  '빙의한 악역영애', '스승을 잃은 외톨이 제자', '봉인을 지키던 늙은 수호자', '용병단을 꾸리는 떠돌이 검사', '두 얼굴을 가진 첩자',
  '마탑에서 도망친 실험체', '죽었다 살아난 전직 영웅', '예언서를 훔친 도둑', '인간이 된 마수', '환생한 대마법사',
  '평민 출신 천재 마법사', '복수를 벼르는 멸문가의 후예', '신탁을 받은 무명의 양치기', '마정석 밀수로 연명하는 소녀', '기사 서임을 거부당한 서출',
  '금지된 피를 이은 혼혈', '예언을 비웃는 냉소적 학자', '동생을 찾아 헤매는 추적자', '교단이 노리는 성흔의 아이', '죽은 약혼자를 되살리려는 연금술사',
  '시간 마법에 휘말린 시계공', '용을 길들인 변방의 사냥꾼', '왕가의 비밀을 아는 시녀', '계약을 어긴 흑마법사', '망각의 강을 건넌 망령',
  '전생의 죄를 기억하는 수도사', '버려진 신의 마지막 사도', '검 대신 노래로 싸우는 음유시인', '저주를 축복이라 믿는 소년', '봉인된 마왕의 그릇이 된 평민',
  '예언을 조작하려는 야심가', '미래를 본 뒤 미쳐 가는 점성술사', '동족에게 추방당한 엘프', '기연으로 최강이 된 잡일꾼', '원작 결말을 아는 빙의자',
]
// ③ 목표(행위의 대상 명사구) — '…을/를'(목적격).
const SLOT_GOAL: string[] = [
  '잃어버린 진명', '봉인된 고대의 힘', '왕좌를 노리는 음모', '저주를 푸는 단 하나의 열쇠', '대륙을 가른 옛 전쟁의 진실',
  '죽은 이를 되살릴 금주', '예언이 가리키는 마지막 성물', '제국을 무너뜨릴 약점', '잊힌 신의 유산', '세계를 지탱하는 봉인의 비밀',
  '스승의 죽음에 얽힌 흑막', '마탑 깊은 곳의 금서', '용의 심장에 깃든 마력', '가문을 멸문시킨 자의 정체', '시스템을 만든 자의 정체',
  '미래를 바꿀 단 한 번의 선택', '봉인을 다시 채울 의식', '마계로 통하는 문', '예언을 무효로 만들 반례', '대마법사들의 추악한 비밀',
  '잃어버린 동료를 되찾을 길', '교단이 숨긴 이단의 경전', '왕국을 구할 잊힌 영웅의 검', '저주받은 가문의 사면', '마정석 고갈을 막을 대체 마력',
  '진짜 부모의 행방', '봉인된 마왕의 약점', '회귀 전 미처 못 막은 비극', '세계가 멸망하는 진짜 이유', '신탁에 숨겨진 거짓',
  '용족과 인간의 화친', '죽음을 거스를 영생의 비법', '파멸 플래그를 부술 방법', '대륙 최후의 마법사의 유언', '봉인을 풀려는 자들의 정체',
  '잃어버린 고향으로 가는 항로', '왕가의 정통 혈통을 증명할 증표', '마수들을 불러들이는 근원', '예언자를 침묵시킨 손', '세계를 재편할 금단의 마법',
  '전생의 빚을 갚을 마지막 기회', '신들이 떠난 이유', '봉인 너머의 진짜 적', '운명을 다시 쓸 회귀의 대가', '원작에 없던 숨겨진 결말',
]
// ④ 수단(도구·방법 명사구) — '…으로/로'(도구격).
const SLOT_MEANS: string[] = [
  '금속을 태우는 알로맨시', '진명을 부르는 고대 마법', '계약한 상위 정령의 힘', '미래를 보는 회귀의 기억', '시스템이 내준 퀘스트',
  '대가를 치르는 금주', '봉인을 일시로 푸는 의식', '서클을 끌어올린 깨달음', '스승이 남긴 단 하나의 비급', '용의 피로 벼린 마검',
  '예언을 역이용한 책략', '동료들과 짜낸 연계 마법', '마정석을 폭주시킨 한 수', '교단의 눈을 속인 위장', '망령들과 맺은 거래',
  '저주를 무기로 바꾼 역발상', '잊힌 신과 맺은 계약', '진짜 정체를 숨긴 가면', '금단의 시간 마법', '되살린 옛 영웅의 검술',
  '약점을 찌르는 냉철한 계산', '소환수와 나눈 신뢰', '마탑에서 훔친 금서의 주문', '환생 전의 무공', '평민의 시선으로 본 허점',
  '복수를 미룬 인내', '신탁을 거스른 자유 의지', '동족이 가르쳐 준 결계술', '기연으로 얻은 절대적 권능', '원작 지식이라는 정보 우위',
  '대마법사들도 모르는 효율', '봉인의 허점을 노린 침투', '용을 길들인 유대', '왕가의 권위를 빌린 명분', '흑마법으로 빚은 언데드 군세',
  '망각의 강물을 담은 약병', '전생의 죄를 속죄하는 헌신', '노래로 마음을 흔드는 음유', '저주를 축복으로 뒤집은 해석', '마왕의 그릇이라는 양날의 그릇',
  '점성술로 읽은 운명의 틈', '추방을 견디며 벼른 실력', '잡일로 익힌 생존의 지혜', '파멸 플래그를 거꾸로 쓴 계획', '아무도 안 믿던 단 하나의 가설',
]
// ⑤ 시련(앞을 막는 장애 명사구) — '…이/가'(주격).
const SLOT_TRIAL: string[] = [
  '풀려나려는 봉인된 마왕', '왕좌를 노리는 황실의 음모', '예언을 맹신하는 광신 교단', '진명을 노리는 정령들의 반란', '금주의 대가로 잠식되는 인간성',
  '동료의 가슴에 숨겨진 배신', '한계에 다다른 마정석 고갈', '추격해 오는 마탑의 추적자', '되살아난 죽은 자들의 군세', '서클의 벽에 막힌 성장의 한계',
  '용족과 인간의 해묵은 전쟁', '스승의 죽음에 얽힌 흑막', '되풀이되는 회귀의 저주', '신탁이 내린 가혹한 시험', '봉인을 풀려는 비밀 결사',
  '대마법사들의 견제와 질투', '몰려드는 마수의 무리', '정해진 파멸의 플래그', '교단이 풀어놓은 성기사단', '망령이 거는 끝없는 유혹',
  '용의 분노를 산 대가', '시스템이 내건 잔혹한 페널티', '가문에 드리운 오랜 저주', '진실을 묻으려는 권력자의 손', '잃어버린 기억의 공백',
  '예언서에 적힌 비극적 결말', '대륙을 덮치는 마력 폭풍', '신을 자처하는 미친 마법사', '계약을 어긴 정령의 복수', '봉인 너머에서 새어 나오는 광기',
  '왕국을 좀먹는 부패한 귀족들', '시간을 거스른 자에게 따르는 반작용', '동족조차 등 돌린 고립', '마왕의 그릇이 깨어나려는 충동', '예언자를 침묵시킨 보이지 않는 적',
  '거듭되는 사이다 뒤의 공허', '되살린 자에게 따라붙는 빚', '교단이 조작한 거짓 신탁', '약혼자의 죽음을 부른 음모', '회귀로도 막지 못한 운명의 관성',
  '원작에는 없던 변수', '폭주하기 시작한 금단의 마법', '동생을 인질로 잡은 흑막', '세계를 멸망으로 이끄는 카운트다운', '믿었던 멘토의 숨겨진 야심',
]
// ⑥ 반전결말(종결문) — 한 문장으로 끝나는 반전·결말. 다른 슬롯을 전제하지 않는 자족적 종결.
const SLOT_TWIST: string[] = [
  '결국 그가 막으려던 재앙은 그 자신이었다', '승리의 대가로 마법이 영영 세계에서 사라진다', '구원의 열쇠는 가장 미움받던 자의 손에 있었다',
  '예언은 처음부터 그를 속이기 위한 거짓이었다', '봉인된 악이야말로 세계를 지탱하던 존재였다', '되찾은 진명과 함께 그는 자아를 잃어 간다',
  '진짜 적은 그를 이끌던 스승이었다', '이긴 자가 잃은 것이 진 자가 잃은 것보다 컸다', '운명을 바꾼 자리에 더 큰 비극이 들어선다',
  '선택받은 자는 사실 아무도 아니었다', '저주는 마지막 순간 가장 따뜻한 축복이 된다', '회귀한 것은 그 혼자만이 아니었다',
  '구하려던 세계는 애초에 누군가가 꾸민 무대였다', '대가는 그가 아니라 사랑하는 이가 대신 치른다', '금주는 끝내 그를 영웅이자 괴물로 만든다',
  '시스템을 만든 손은 그를 처음부터 지켜보고 있었다', '복수를 끝낸 자리에 남은 것은 텅 빈 침묵뿐이었다', '진짜 힘은 평범해 보이던 물건에 깃들어 있었다',
  '예언을 피하려던 발걸음이 정확히 예언을 완성한다', '왕좌에 오른 그는 자신이 무너뜨린 자와 똑같아진다', '죽지 않은 것이야말로 가장 무거운 형벌이었다',
  '봉인을 푼 손과 다시 채운 손이 같은 사람이었다', '되살린 이는 더는 그가 알던 사람이 아니었다', '용은 적이 아니라 마지막 동맹이 되어 준다',
  '신들이 떠난 이유는 인간을 두려워했기 때문이었다', '원작은 처음부터 이 세계가 아니었다', '멘토의 가르침은 모두 정교한 거짓이었다',
  '기연은 공짜가 아니라 평생 갚아야 할 빚이었다', '파멸 플래그를 부수자 더 잔인한 운명이 시작된다', '세계를 구한 영웅은 끝내 고향으로 돌아가지 못한다',
  '진실을 안 대가로 그는 모든 것을 기억하게 된다', '악으로 불리던 가문이 사실 세계의 마지막 방패였다', '승리는 다음 세대가 갚아야 할 빚으로 미뤄진다',
  '그를 배신한 동료가 끝까지 그를 믿은 유일한 사람이었다', '봉인 너머의 적은 거울 속 자신이었다', '예언자는 미래를 막으려다 미래를 불러왔다',
  '구원받은 자들은 구원받은 사실조차 모른 채 살아간다', '마왕의 그릇이 깨어나 마왕을 삼켜 버린다', '되찾은 왕좌는 텅 빈 폐허 위의 자리였다',
  '운명을 거스른 자에게 세계가 천천히 등을 돌린다', '가장 약했던 자가 끝내 가장 멀리 살아남는다', '진짜 기적은 마법이 아니라 끝까지 놓지 않은 손이었다',
  '예언서의 마지막 장은 백지로 남아 그의 선택을 기다린다', '봉인을 지키는 일이 곧 세계를 가두는 일이었다', '돌아온 회귀자는 바뀐 미래 앞에서 무력해진다',
  '신탁은 옳았으나 그것을 옮긴 입이 거짓을 보탰다',
]

const PROMPT_SLOTS: { key: string; label: string; icon: string; pool: string[] }[] = [
  { key: 'world', label: '세계', icon: '🌍', pool: SLOT_WORLD },
  { key: 'hero', label: '주인공', icon: '🧝', pool: SLOT_HERO },
  { key: 'goal', label: '목표', icon: '🎯', pool: SLOT_GOAL },
  { key: 'means', label: '수단', icon: '✨', pool: SLOT_MEANS },
  { key: 'trial', label: '시련', icon: '⚔️', pool: SLOT_TRIAL },
  { key: 'twist', label: '반전결말', icon: '🌀', pool: SLOT_TWIST },
]
// 조합수 = 각 슬롯 풀 크기의 곱(고유 항목만). 화면 표기·보고용.
const PROMPT_COMBOS = PROMPT_SLOTS.reduce((n, s) => n * s.pool.length, 1)

interface PromptPick { world: string; hero: string; goal: string; means: string; trial: string; twist: string }
const buildPromptSentence = (p: PromptPick): string =>
  `${p.world}에서 ${J_top(p.hero)} ${J_obj(p.goal)} ${J_with(p.means)} 좇는다. ${J_sub(p.trial)} 길을 막지만, ${p.twist}.`
const rollPrompt = (): PromptPick => ({
  world: SLOT_WORLD[Math.floor(Math.random() * SLOT_WORLD.length)],
  hero: SLOT_HERO[Math.floor(Math.random() * SLOT_HERO.length)],
  goal: SLOT_GOAL[Math.floor(Math.random() * SLOT_GOAL.length)],
  means: SLOT_MEANS[Math.floor(Math.random() * SLOT_MEANS.length)],
  trial: SLOT_TRIAL[Math.floor(Math.random() * SLOT_TRIAL.length)],
  twist: SLOT_TWIST[Math.floor(Math.random() * SLOT_TWIST.length)],
})

const escapeHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const plain = (s: { cat: CatDef; item: Device }): string =>
  `${s.item.name}${s.item.aka ? ` (${s.item.aka})` : ''}  [${s.cat.icon} ${s.cat.label}]\n` +
  `[정의] ${s.item.def}\n` +
  `[사용법] ${s.item.how}\n` +
  `[예시] ${s.item.example}\n` +
  `[비틀기] ${s.item.twist}`

// 관련 도구(연계) — 판타지 장치 사전에서 자연히 이어지는 도구들
const RELATED: { id: string; label: string; icon: string }[] = [
  { id: 'magic-system-designer', label: '마법 체계 설계기', icon: '✨' },
  { id: 'prophecy-generator', label: '예언 생성기', icon: '🔮' },
  { id: 'quest-forge', label: '퀘스트 생성기', icon: '🗺️' },
  { id: 'hero-journey-map', label: '영웅의 여정 맵', icon: '🧭' },
  { id: 'curse-blessing-gen', label: '저주·축복 생성기', icon: '🪄' },
  { id: 'genre-conventions', label: '장르 관습 체크리스트', icon: '📐' },
]

export default function GenreDevices({ payload }: { payload?: Record<string, unknown> }) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try { const raw = localStorage.getItem(LS + 'cat'); if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw } catch { /* ignore */ }
    return ALL_KEY
  })
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try { const raw = localStorage.getItem(LS + 'open'); if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> } } catch { /* ignore */ }
    return {}
  })
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try { const raw = localStorage.getItem(LS + 'favs'); if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> } } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [spark, setSpark] = useState<{ cat: CatDef; item: Device }[] | null>(null) // 무작위 영감(3장)
  const [random, setRandom] = useState<{ cat: CatDef; item: Device } | null>(null) // 무작위 1개
  const [prompt, setPrompt] = useState<PromptPick | null>(null) // 장치 조합 프롬프트(6슬롯)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const mounted = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // payload.genre / payload.cat 로 초기 카테고리 지정(연계 진입)
  useEffect(() => {
    try {
      const c = payload && typeof payload.cat === 'string' ? payload.cat : ''
      if (c && CATS.some((x) => x.key === c)) setCat(c)
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 영속 저장(graceful)
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'open', JSON.stringify(open)) } catch { /* ignore */ } }, [open])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  // 언마운트 정리
  useEffect(() => () => {
    mounted.current = false
    if (copyTimer.current) clearTimeout(copyTimer.current)
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  const itemKey = (catKey: string, name: string) => `${catKey}::${name}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = cat === ALL_KEY ? ALL_ITEMS() : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[itemKey(c.key, item.name)])
    if (q) base = base.filter(({ cat: c, item }) =>
      item.name.toLowerCase().includes(q) ||
      (item.aka ? item.aka.toLowerCase().includes(q) : false) ||
      item.def.toLowerCase().includes(q) ||
      item.how.toLowerCase().includes(q) ||
      item.example.toLowerCase().includes(q) ||
      item.twist.toLowerCase().includes(q) ||
      c.label.toLowerCase().includes(q))
    return base
  }, [query, cat, onlyFav, favs])

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { if (mounted.current) setToast(null) }, 2200)
  }

  // 무작위 1개(현재 카테고리/검색 풀에서, 직전과 중복 회피)
  const rollRandom = useCallback(() => {
    const pool = filtered.length ? filtered : ALL_ITEMS()
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.name === prev.item.name && pick.cat.key === prev.cat.key) pick = pool[Math.floor(Math.random() * pool.length)]
      return pick
    })
    setSpark(null)
    setPrompt(null)
  }, [filtered])

  // 무작위 영감: 서로 다른 3장(전체 풀) 뽑기 → 충돌·교배 발상용
  const rollSpark = useCallback(() => {
    const pool = ALL_ITEMS()
    if (pool.length < 3) { setSpark(null); return }
    const idx = new Set<number>()
    while (idx.size < 3) idx.add(Math.floor(Math.random() * pool.length))
    setSpark(Array.from(idx).map((i) => pool[i]))
    setRandom(null)
    setPrompt(null)
  }, [])

  // 장치 조합 프롬프트: 6개 독립 슬롯에서 하나씩 뽑아 한 문장의 이야기 씨앗을 만든다(직전과 다르게).
  const rollPromptCard = useCallback(() => {
    setPrompt((prev) => {
      let p = rollPrompt()
      if (prev && p.world === prev.world && p.hero === prev.hero && p.goal === prev.goal) p = rollPrompt()
      return p
    })
    setSpark(null)
    setRandom(null)
  }, [])

  const toggleOpen = (catKey: string, name: string) => {
    const k = itemKey(catKey, name)
    setOpen((prev) => { const n = { ...prev }; if (n[k]) delete n[k]; else n[k] = true; return n })
  }
  const toggleFav = (catKey: string, name: string) => {
    const k = itemKey(catKey, name)
    setFavs((prev) => { const n = { ...prev }; if (n[k]) delete n[k]; else n[k] = true; return n })
  }
  const expandAll = () => { const n: Record<string, boolean> = {}; filtered.forEach(({ cat: c, item }) => { n[itemKey(c.key, item.name)] = true }); setOpen((prev) => ({ ...prev, ...n })) }
  const collapseAll = () => setOpen({})

  const copy = (text: string, id: string) => {
    if (!text) return
    const done = () => { if (!mounted.current) return; setCopiedKey(id); if (copyTimer.current) clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => { if (mounted.current) setCopiedKey((c) => (c === id ? null : c)) }, 1500) }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(() => {})
      else { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done() }
    } catch { /* graceful */ }
  }

  // 글감 스니펫 저장
  const saveSnippet = (s: { cat: CatDef; item: Device }) => {
    addToLibrary('snippets', { text: plain(s), source: '판타지 서사 장치 사전', tags: ['판타지', '서사장치', s.cat.label, s.item.name] })
    showToast(`스니펫 보관함에 ‘${s.item.name}’을(를) 저장했습니다.`)
  }

  // 프로젝트 자료 〈판타지 장치〉 폴더에 단일 항목 문서로 추가
  const addItemToProject = (s: { cat: CatDef; item: Device }) => {
    if (!hasProjectBridge()) { showToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = [
      `<p><b>${escapeHtml(s.cat.icon + ' ' + s.cat.label)} · ${escapeHtml(s.item.name)}${s.item.aka ? ` <i>(${escapeHtml(s.item.aka)})</i>` : ''}</b></p>`,
      `<p><b>정의</b> · ${escapeHtml(s.item.def)}</p>`,
      `<p><b>사용법</b> · ${escapeHtml(s.item.how)}</p>`,
      `<p><b>예시</b> · ${escapeHtml(s.item.example)}</p>`,
      `<p><b>비틀기</b> · ${escapeHtml(s.item.twist)}</p>`,
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '판타지 장치',
      title: `${s.item.name}${s.item.aka ? ` (${s.item.aka})` : ''}`,
      bodyHtml,
      meta: { 장르: '판타지', 분류: s.cat.label, 장치: s.item.name },
    })
    showToast(id ? `프로젝트 자료 〈판타지 장치〉에 ‘${s.item.name}’을(를) 추가했습니다.` : '프로젝트에 추가하지 못했습니다.')
  }

  // 현재 보기(필터된 전체)를 한 편의 문서로 프로젝트에 추가
  const addViewToProject = () => {
    if (!hasProjectBridge()) { showToast('프로젝트에 연결되어 있지 않습니다.'); return }
    if (filtered.length === 0) { showToast('추가할 항목이 없습니다.'); return }
    const catLabel = cat === ALL_KEY ? '전체' : (CATS.find((c) => c.key === cat)?.label || '전체')
    const parts: string[] = [`<p><b>🐉 판타지 서사 장치·전개 — ${escapeHtml(catLabel)} (${filtered.length}개)</b></p>`]
    filtered.forEach(({ cat: c, item }) => {
      parts.push(`<h3>${escapeHtml(c.icon + ' ' + item.name)}${item.aka ? ` (${escapeHtml(item.aka)})` : ''}</h3>`)
      parts.push(`<p><b>정의</b> · ${escapeHtml(item.def)}</p>`)
      parts.push(`<p><b>사용법</b> · ${escapeHtml(item.how)}</p>`)
      parts.push(`<p><b>예시</b> · ${escapeHtml(item.example)}</p>`)
      parts.push(`<p><b>비틀기</b> · ${escapeHtml(item.twist)}</p>`)
    })
    const id = addToProject({ kind: 'text', root: 'research', folder: '판타지 장치', title: `판타지 서사 장치 — ${catLabel} (${filtered.length})`, bodyHtml: parts.join(''), meta: { 장르: '판타지', 분류: catLabel, 항목수: String(filtered.length) } })
    showToast(id ? `프로젝트 자료 〈판타지 장치〉에 ${filtered.length}개 항목 문서를 추가했습니다.` : '프로젝트에 추가하지 못했습니다.')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden', fontSize: 14 }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginRight: 6 }
  const lineStyle: React.CSSProperties = { fontSize: 13, lineHeight: 1.6, marginTop: 6 }
  const input: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }

  const renderDetail = (item: Device) => (
    <>
      <div style={lineStyle}><span style={labelStyle}>정의</span>{item.def}</div>
      <div style={lineStyle}><span style={labelStyle}>사용법</span>{item.how}</div>
      <div style={lineStyle}><span style={labelStyle}>예시</span>{item.example}</div>
      <div style={lineStyle}><span style={{ ...labelStyle, color: 'var(--warn)' }}>비틀기</span>{item.twist}</div>
    </>
  )

  const catLabel = cat === ALL_KEY ? '전체' : (CATS.find((c) => c.key === cat)?.label || '전체')

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>판타지</b> 고유의 서사 장치(마법 시스템·예언·선택받은 자·아티팩트·퀘스트·멘토·봉인된 악·시스템창·회빙환…)와 전개·페이싱·클라이맥스 관습 <b>{TOTAL}개</b>를 <b>정의·사용법·예시·비틀기</b>로 정리했습니다. 무작위 영감 조합 <b>약 {fmtCombos(combos)}가지</b>, <b>장치 조합 프롬프트</b> <b>약 {fmtCombos(PROMPT_COMBOS)}가지</b>.
      </div>

      {/* 검색 */}
      <input value={query} onChange={(e) => setQuery(e.target.value)} style={input}
        placeholder="장치·전개 검색 (예: 하드 매직, 예언, 사이다, 복선 회수, 시스템창, 회귀)" aria-label="검색" />

      {/* 카테고리 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}><Emoji e="🐉" /> 전체</button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on} title={c.blurb}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}><Emoji e={c.icon} /> {c.label}</button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom}><Emoji e="🎲" /> 무작위 장치</button>
        <button className="minibtn" onClick={rollSpark} title="서로 다른 장치 3개를 뽑아 교배·충돌 발상"><Emoji e="🃏" /> 영감 3연</button>
        <button className="minibtn" onClick={rollPromptCard} title={`세계·주인공·목표·수단·시련·반전을 조합해 이야기 씨앗 한 문장 생성 (약 ${fmtCombos(PROMPT_COMBOS)}가지)`}><Emoji e="🌀" /> 장치 조합</button>
        <button className="minibtn" onClick={expandAll}>⊕ 모두 펼치기</button>
        <button className="minibtn" onClick={collapseAll}>⊖ 모두 접기</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>{onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}</button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 연계 + 현재 보기 프로젝트 추가 */}
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={addViewToProject} disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? `현재 보기(${catLabel} ${filtered.length}개)를 프로젝트 자료 〈판타지 장치〉 폴더에 한 문서로 추가` : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
        {RELATED.map((r) => (
          <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: '판타지' })} title={`${r.label} 열기`}><Emoji e={r.icon} /> {r.label}</button>
        ))}
      </div>

      {/* 장치 조합 프롬프트(6슬롯 곱집합) */}
      {prompt && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}><Emoji e="🌀" /> 장치 조합 프롬프트 — 약 {fmtCombos(PROMPT_COMBOS)}가지 중 하나</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={rollPromptCard}>↻ 다시</button>
            <button className="minibtn" onClick={() => setPrompt(null)}>✕</button>
          </div>
          <div style={{ fontSize: 14.5, lineHeight: 1.7 }}>{buildPromptSentence(prompt)}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {PROMPT_SLOTS.map((s) => (
              <span key={s.key} style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px' }}>
                <Emoji e={s.icon} /> {s.label}: {prompt[s.key as keyof PromptPick]}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(buildPromptSentence(prompt), 'prompt')}>{copiedKey === 'prompt' ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}</button>
            <button className="minibtn" onClick={() => addToLibrary('snippets', { text: buildPromptSentence(prompt), source: '판타지 서사 장치 사전 — 장치 조합', tags: ['판타지', '장치조합', '이야기씨앗'] }) || showToast('장치 조합 프롬프트를 스니펫으로 저장했습니다.')}><Emoji e="📌" /> 스니펫 저장</button>
            <button className="linkbtn" onClick={() => { if (!hasProjectBridge()) { showToast('프로젝트에 연결되어 있지 않습니다.'); return } const id = addToProject({ kind: 'text', root: 'research', folder: '판타지 장치', title: '장치 조합 프롬프트', bodyHtml: `<p>${escapeHtml(buildPromptSentence(prompt))}</p>`, meta: { 장르: '판타지', 분류: '장치 조합' } }); showToast(id ? '프로젝트 자료 〈판타지 장치〉에 장치 조합 프롬프트를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.') }} disabled={!hasProjectBridge()}><Emoji e="📄" /> 프로젝트에 추가</button>
          </div>
        </div>
      )}

      {/* 무작위 영감 3연 */}
      {spark && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}><Emoji e="🃏" /> 영감 3연 — 충돌·교배해 새 장치를 빚어 보세요</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={rollSpark}>↻ 다시</button>
            <button className="minibtn" onClick={() => setSpark(null)}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {spark.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
                <span style={{ fontSize: 11, color: 'var(--accent)', flexShrink: 0 }}><Emoji e={s.cat.icon} /> {s.cat.label}</span>
                <b>{s.item.name}</b>
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>{s.item.def}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(spark.map((s) => `• ${s.item.name} — ${s.item.def}`).join('\n'), 'spark')}>{copiedKey === 'spark' ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}</button>
            <button className="minibtn" onClick={() => addToLibrary('snippets', { text: '판타지 장치 교배 영감\n' + spark.map((s) => `• ${s.item.name} (${s.cat.label}) — ${s.item.def}`).join('\n'), source: '판타지 서사 장치 사전', tags: ['판타지', '영감', '교배'] }) || showToast('영감 3연을 스니펫으로 저장했습니다.')}><Emoji e="📌" /> 스니펫 저장</button>
          </div>
        </div>
      )}

      {/* 무작위 1개 카드 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            {random.item.aka && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{random.item.aka}</span>}
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={rollRandom}>↻ 다시</button>
            <button className="minibtn" onClick={() => setRandom(null)}>✕</button>
          </div>
          {renderDetail(random.item)}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(plain(random), 'rand')}>{copiedKey === 'rand' ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}</button>
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="📌" /> 스니펫 저장</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>{favs[itemKey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}</button>
            <button className="linkbtn" onClick={() => addItemToProject(random)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '이 장치를 프로젝트 자료 〈판타지 장치〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5 }}>✓ {toast}</div>}

      {/* 목록(펼침형) */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 장치가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const k = itemKey(c.key, item.name)
            const isOpen = !!open[k]
            const isFav = !!favs[k]
            const copyId = 'item:' + k
            return (
              <div key={k} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => toggleOpen(c.key, item.name)} role="button" aria-expanded={isOpen}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', width: 14, flexShrink: 0 }}>{isOpen ? '▾' : '▸'}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /></span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</span>
                  {item.aka && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{item.aka}</span>}
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={(e) => { e.stopPropagation(); toggleFav(c.key, item.name) }}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>{isFav ? '★' : '☆'}</button>
                </div>
                {!isOpen && (
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 5, marginLeft: 22, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.def}</div>
                )}
                {isOpen && (
                  <div style={{ marginLeft: 22 }}>
                    {renderDetail(item)}
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      <button className="minibtn" onClick={(e) => { e.stopPropagation(); copy(plain({ cat: c, item }), copyId) }}>{copiedKey === copyId ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}</button>
                      <button className="minibtn" onClick={(e) => { e.stopPropagation(); saveSnippet({ cat: c, item }) }}><Emoji e="📌" /> 스니펫 저장</button>
                      <button className="linkbtn" onClick={(e) => { e.stopPropagation(); addItemToProject({ cat: c, item }) }} disabled={!hasProjectBridge()}
                        title={hasProjectBridge() ? '이 장치를 프로젝트 자료 〈판타지 장치〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>장치는 목적이 아니라 도구입니다. <b>관습(정의·사용법)</b>은 독자와의 약속으로 충실히 지키되, <b>비틀기</b>로 클리셰를 전복해 신선함을 만드세요. 특히 마법은 <b>한계·대가</b>가, 클라이맥스는 <b>복선 회수</b>가 카타르시스를 만듭니다.</div>
    </div>
  )
}
