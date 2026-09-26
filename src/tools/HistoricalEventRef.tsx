// 역사적 사건 유형 사전 — 플롯 배경 소재용 로컬 자작 자료집.
//  혁명·전쟁·역병·기근·천재지변·정변 등 '사건 유형'의 전형적 전개(국면)·원인·여파·민중 반응을 정리.
//  자급식: react 와 './linkbus' 외 import 없음. 외부 API 없음(전부 로컬 자작 요약 — 백과 베끼기 금지).
//  카테고리(사건 유형) 펼침 + 검색 + 무작위 + 클릭복사 + 수집함·스니펫·프로젝트 연계.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, addToStash, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'historical-event-ref',
  name: '역사적 사건 사전',
  icon: '⚔️',
  group: '리서치·자료',
  intro: '혁명·전쟁·역병·기근·천재지변·정변 등 사건 유형의 전형적 전개·원인·여파·민중 반응을 정리한 플롯 배경 자료',
  w: 740,
  h: 720,
}

// ---------- 항목 형(型) ----------
// 한 '항목'은 특정 사건 유형(예: 농민 봉기, 공성전, 팬데믹)의 전형(典型)을 담는다.
// 모든 텍스트는 자작 요약 — 특정 실제 사건의 베끼기가 아니라 '유형'의 패턴을 작가용으로 정리한 것.
interface Ev {
  id: string            // 고유 키
  name: string          // 사건 유형명(예: '민중 혁명', '장기 공성전')
  tagline: string       // 한 줄 분위기/요지
  scale: string         // 전형적 규모·기간 감각(서사 배치용)
  causes: string        // 원인·도화선(왜 일어나는가)
  phases: string        // 전형적 전개 국면(서사 구조로 쓰기 좋은 단계)
  factions: string      // 주요 세력·행위자(누가 부딪치는가)
  people: string        // 민중·평범한 인물의 반응(공포·기회·생존·도덕적 균열)
  aftermath: string     // 여파·결과(승패와 무관히 남는 것)
  hooks: string         // 이야기 갈고리(인물·장면 아이디어)
  pitfall: string       // 고증·서사 함정(작가가 자주 틀리는 점)
}
interface EvCat { key: string; label: string; icon: string; note: string; items: Ev[] }

// ---------- 로컬 대량 자료집 (사건 유형 6분류) ----------
const CATS: EvCat[] = [
  {
    key: 'revolution', label: '혁명·봉기', icon: '✊',
    note: '낡은 질서가 무너지고 새 질서가 들어서려 다투는 격변. 분노가 조직으로, 군중이 권력으로 바뀌는 과정. 이상과 폭력이 한 몸으로 움직인다.',
    items: [
      {
        id: 'popular-revolution', name: '민중 혁명', tagline: '쌓인 분노가 거리를 메우고, 구체제가 하룻밤에 흔들린다.',
        scale: '대도시·수도를 중심으로 수일~수개월, 여파는 수년. 군중 수만이 거리로.',
        causes: '오랜 수탈과 불평등, 식량난·증세, 부패한 지배층의 사치, 작은 사건(처형·물가 폭등·실정)이 도화선이 되어 억눌린 분노에 불을 붙인다.',
        phases: '①소요·소문 확산 → ②상징적 충돌(관청·감옥 습격) → ③권력 공백과 임시 권력 등장 → ④구지배층 도주·체포 → ⑤노선 갈등(온건 vs 급진) → ⑥공포정치 또는 안정화. 혁명은 흔히 ‘혁명을 잡아먹는다’.',
        factions: '굶주린 민중·도시 빈민, 불만 품은 지식인·하급 군인, 동요하는 중간계층, 무너지는 지배층, 기회를 노리는 야심가. 어제의 동지가 내일의 숙청 대상.',
        people: '처음엔 두려움, 곧 들뜬 해방감과 ‘이제 다르다’는 희망. 그러나 약탈·보복·배급 줄·밀고가 일상을 잠식하며 ‘누구를 믿나’의 불안으로. 어떤 이는 영웅이, 어떤 이는 변절자가 된다.',
        aftermath: '구질서의 상징 파괴, 새 달력·새 호칭·새 깃발. 그러나 권력은 다시 소수에게 모이고, 이상은 현실에 닳는다. 반동·내전·외세 개입의 위험. 살아남은 자의 환멸과 다음 세대의 신화화.',
        hooks: '어제까지 하인이던 자가 심판관이 된다 / 광장의 환호 뒤에서 명단을 작성하는 손 / 도주하는 귀족과 그를 숨겨 준 옛 정인 / 이상을 끝까지 믿다 동지에게 처형당하는 자.',
        pitfall: '혁명을 ‘선악 단순 대결’로 그리면 납작해진다 — 내부 노선 다툼·배신·이상의 변질이 핵심. 군중이 즉시 통일된 의지로 움직이지 않는다(혼란·소문·관망이 다수).',
      },
      {
        id: 'peasant-uprising', name: '농민 봉기', tagline: '낫과 곡괭이를 든 사람들이 더는 못 견디겠다며 일어선다.',
        scale: '한 고을~여러 지방으로 번지며 수주~수개월. 진압되면 빠르게, 번지면 왕조를 흔들 만큼.',
        causes: '가혹한 세금·부역과 흉년이 겹친 보릿고개, 탐관오리의 횡포, 토지 수탈, 전염병·천재지변으로 무너진 생계. ‘이대로면 어차피 죽는다’는 절박함.',
        phases: '①진정·탄원 등 합법 호소 실패 → ②관아 앞 집결과 격문(檄文) → ③무기 탈취·관청 점거 → ④세 확산과 ‘우두머리’ 추대 → ⑤관군 파견과 회전(會戰) → ⑥진압·해산 또는 협상. 대개 진압되나, 제도 개혁을 끌어내기도.',
        factions: '소작농·머슴·몰락 향민, 동조하는 하급 아전·승려·떠돌이, 진압하는 관군과 토벌대, 양다리 걸친 지방 유력자, 멀리서 관망하는 조정.',
        people: '동참하면 역적, 빠지면 비겁자 — 마을이 쪼개진다. 곳간을 여는 통쾌함, 그러나 보복이 두려워 밤마다 산을 보는 눈. 어떤 집은 아들을, 어떤 집은 곡식을 잃는다.',
        aftermath: '주모자 효수와 연좌, 마을 초토화. 그러나 ‘민심이 무섭다’는 교훈으로 일부 폐단이 고쳐지기도. 전설과 노래로 남아 다음 봉기의 씨앗이 된다.',
        hooks: '격문을 쓴 글 아는 자의 운명 / 진압군에 끌려간 옆집 아들 / 봉기 지도자를 사랑하지만 관에 줄 댄 집안의 딸 / 살아남으려 동지를 밀고하는 자의 밤.',
        pitfall: '농민이 처음부터 ‘체제 전복’을 목표로 한 듯 그리면 과장 — 대개 ‘부당한 관리·세금’을 향한 국지적 분노에서 시작한다. 무장·조직 수준을 정규군처럼 그리지 말 것.',
      },
      {
        id: 'independence-movement', name: '독립·해방 운동', tagline: '빼앗긴 이름과 말을 되찾으려는 길고 음험한 싸움.',
        scale: '수년~수십 년의 지구전. 폭발적 시위와 긴 잠복기가 교차한다.',
        causes: '외세 지배·식민 수탈, 언어·종교·정체성의 억압, 차별과 동화 정책. 굴욕적 사건이나 탄압이 운동에 불을 댕긴다.',
        phases: '①계몽·교육·문화 운동(은밀한 정체성 지키기) → ②대규모 비폭력 시위·선언 → ③탄압과 지하화·무장 분파 등장 → ④국제 여론전·망명 정부 → ⑤지배 약화의 틈(전쟁·붕괴)을 노린 봉기 → ⑥독립 또는 좌절·분단. 노선(비폭력 vs 무장, 자치 vs 완전 독립) 갈등이 내내 따라붙는다.',
        factions: '지식인·학생·종교인, 망명자·무장 조직, 협력자(부역자)와 밀정, 동요하는 식민 관료, 이해를 저울질하는 외부 열강.',
        people: '말을 숨기고 이름을 바꾼 채 사는 굴욕, 작은 저항의 짜릿함과 발각의 공포. 가족 중 누군가는 협력해 먹고살고, 누군가는 산으로 간다 — 한 식탁의 균열.',
        aftermath: '해방의 환희, 그러나 곧 ‘누가 나라를 세우나’의 권력 다툼·노선 분열·부역자 청산 문제. 분단·내전의 씨앗이 되기도. 순교자는 신화가, 협력자는 낙인이 된다.',
        hooks: '금지된 모국어로 쓴 일기 / 밀정이 된 옛 동지 / 부역 관리인 아버지와 운동가 아들 / 해방의 날, 환호 속에서 처형 명단을 떠올리는 사람.',
        pitfall: '운동을 단일한 영웅 서사로 만들면 내부 분열·협력자 문제·노선 갈등이 지워진다. ‘해방=즉시 완전한 정의’로 단순화하지 말 것 — 해방 후가 더 복잡하다.',
      },
    ],
  },
  {
    key: 'war', label: '전쟁·분쟁', icon: '⚔️',
    note: '집단과 집단이 무력으로 충돌하는 사건. 영웅담보다 보급·질병·진창·기다림이 실제를 채운다. 전선보다 후방에서 더 많은 일이 벌어진다.',
    items: [
      {
        id: 'invasion-war', name: '침략 전쟁', tagline: '국경 너머에서 군대가 밀려오고, 일상이 하룻밤에 전선이 된다.',
        scale: '수개월~수년. 국토 전역과 후방·바다까지 휩쓴다.',
        causes: '영토·자원 욕심, 왕위·정통성 분쟁, 종교·민족 명분, 약해진 이웃을 노린 기회주의. 국경 사건·동맹 의무가 도화선.',
        phases: '①선전포고·기습 또는 국경 충돌 → ②초기 우세와 진격, 도시 함락 → ③방어선 구축과 교착·소모전 → ④보급·질병·민심이 승패를 가름 → ⑤반격·결전 또는 강화 협상 → ⑥점령·배상·분할. 진격은 빠르고 점령 유지는 더디다.',
        factions: '침략군과 방어군, 동요하는 동맹·중립국, 점령지의 협력자·저항군(파르티잔), 군량을 대는 상인, 등 떠밀려 징집된 농민병.',
        people: '피란길의 행렬과 버려진 집, 약탈·징발·강제 부역, 점령군과의 어쩔 수 없는 동거. 살기 위한 협력과 그로 인한 수치, 가족을 지키려는 거짓말. 후방의 굶주림이 전선의 죽음만큼 무겁다.',
        aftermath: '점령·할양·배상, 무너진 도시와 끊긴 세대. 승자에게도 빚과 환멸이 남고, 패자에겐 복수의 씨앗. 협력자 청산·전쟁 신화·외상 후 침묵이 오래 간다.',
        hooks: '피란 수레에서 떨어진 아이 / 점령군 장교와 통역이 된 마을 처녀 / 형은 징집, 동생은 저항군 / 폐허에서 옛 적의 부상병을 숨기는 농가.',
        pitfall: '전쟁을 ‘영웅의 회전(會戰)’으로만 그리면 거짓 — 대부분은 행군·기다림·보급·질병·약탈이다. 점령은 ‘깃발 꽂으면 끝’이 아니라 끝없는 통치·저항의 시작.',
      },
      {
        id: 'civil-war', name: '내전·내란', tagline: '같은 말을 쓰는 사람들이 서로를 적으로 돌린다.',
        scale: '수년~수십 년. 한 나라 안에서 마을·가족 단위까지 쪼개진다.',
        causes: '왕위·계승 분쟁, 지역·계급·종교·이념의 분열, 중앙 권력의 붕괴, 외세의 대리전. 한 사건이 양 진영의 결집 명분이 된다.',
        phases: '①정치 위기·권력 공백 → ②양 진영 결집과 무장 → ③초기 학살·숙청과 진영 굳히기 → ④지구전·게릴라·봉쇄 → ⑤외세 개입과 국제화 → ⑥승자의 보복 또는 지친 끝의 타협. 전선이 마음속에도 그어진다.',
        factions: '대립하는 두(혹은 여러) 진영, 회색지대의 주민, 외부 후원 세력, 변절·이중첩자, 이익을 챙기는 군벌·무기상.',
        people: '어제의 이웃·친척이 적이 되어 한 동네에서 서로를 밀고한다. 어느 편인지 묻는 검문, 잘못 답하면 죽는다. 중립은 불가능하고, 침묵조차 선택이 된다. 전쟁이 끝나도 마을은 쪼개진 채 남는다.',
        aftermath: '폐허보다 깊은 분열, 보복의 악순환과 ‘승자의 정의’. 화해는 더디고 기억은 다투며, 같은 사건을 두고 두 개의 역사가 쓰인다. 트라우마가 다음 세대로 이어진다.',
        hooks: '서로 다른 편에 선 형제 / 검문소에서 옛 친구를 못 알아본 척하는 순간 / 양쪽 모두에게 쫓기는 의사 / 전쟁 후, 가해자와 한 마을에 사는 피해자.',
        pitfall: '내전을 ‘정의 vs 악’으로 깔끔히 가르면 본질을 놓친다 — 회색지대·강요된 선택·상호 학살이 핵심. 중립적 주민이 다수임을 잊지 말 것.',
      },
      {
        id: 'siege', name: '장기 공성전', tagline: '성벽 안과 밖, 둘 다 굶주리며 누가 먼저 무너지나 겨룬다.',
        scale: '수주~수개월, 길면 수년. 한 도시·요새에 집중된 농성과 봉쇄.',
        causes: '요충지 점령·보급선 차단, 항복 거부, 상징적 수도 함락 시도. 정면 돌파보다 ‘말려 죽이기’가 합리적일 때.',
        phases: '①포위·보급선 차단 → ②성벽 공격(공성기·갱도·사다리)과 격퇴 → ③장기 봉쇄와 양측의 식량·질병 고갈 → ④내부 분열·기근·역병 → ⑤구원군 도착 여부가 분수령 → ⑥함락(약탈) 또는 포위 해제·협상. 시간이 진짜 무기.',
        factions: '농성 측 수비대·주민, 포위 측 군대, 오기로 한 구원군, 내응(內應)하는 배신자, 값을 부르는 식량 밀매상.',
        people: '처음엔 결의, 곧 배급과 쥐·말·가죽까지 먹는 굶주림, 역병과 의심. 성문을 열자는 자와 끝까지 버티자는 자가 갈린다. 함락의 밤, 약탈·학살의 공포. 살아남아도 ‘그날’을 평생 입에 못 담는다.',
        aftermath: '함락 시 약탈·보복·인구 격감, 버틴 경우 영웅 서사. 어느 쪽이든 도시는 텅 비고, 살아남은 자는 굶주림의 기억에 갇힌다. 전략적 가치가 사라지면 폐허로 남는다.',
        hooks: '마지막 곡식 자루를 두고 벌어지는 일 / 성문을 열려는 내응자를 의심하는 보초 / 봉쇄 너머 가족에게 닿지 못한 편지 / 구원군이 끝내 오지 않는 새벽.',
        pitfall: '공성전을 ‘웅장한 돌격 한 번’으로 압축하면 본질(기다림·기근·질병·내부 붕괴)을 놓친다. 함락이 대개 전투가 아니라 배신·아사·역병으로 결판남을 기억할 것.',
      },
    ],
  },
  {
    key: 'plague', label: '역병·전염병', icon: '🦠',
    note: '눈에 보이지 않는 적이 사회를 마비시키는 사건. 칼보다 소문과 공포가 빨리 번지고, 죽음 앞에서 인간의 바닥과 정점이 동시에 드러난다.',
    items: [
      {
        id: 'pandemic', name: '대역병(팬데믹)', tagline: '도시의 절반이 쓰러지고, 산 자가 죽은 자를 묻지 못한다.',
        scale: '수개월~수년, 여러 차례 파도(波)로 재유행. 한 지역에서 대륙으로 번진다.',
        causes: '교역로·전쟁·이주로 옮겨 온 병원체, 밀집·불결한 도시, 영양실조와 면역 약화. 원인을 모른 채 ‘하늘의 벌’로 해석된다.',
        phases: '①첫 환자·소문(부정·은폐) → ②급격한 확산과 의료 붕괴 → ③봉쇄·격리·도시 폐쇄 → ④사재기·폭동·희생양 사냥 → ⑤피크와 대량 사망, 매장 위기 → ⑥쇠퇴와 잔존, 재유행. 두려움이 병보다 빨리 퍼진다.',
        factions: '병자와 간병인, 도망친 부유층과 남겨진 빈민, 헌신하는 의원·성직자와 돌팔이·약장수, 격리를 집행하는 관헌, 희생양으로 몰린 이방인·소수자.',
        people: '문에 표식을 단 격리 가옥, 종소리와 시체 수레, 가족조차 멀리하는 단절. 어떤 이는 약값을 부르고, 어떤 이는 목숨 걸고 간병한다. 광기 어린 신앙·미신·마녀사냥과, 의외의 친절이 공존한다.',
        aftermath: '인구 격감으로 노동력 부족·임금 상승·신분 동요, 빈집과 버려진 마을. 종교·세계관의 흔들림, 의학의 각성. 희생양이 된 집단의 박해가 상처로 남는다. 살아남은 자의 죄책감.',
        hooks: '격리 가옥 문 앞의 마지막 식량 / 도망친 영주의 빈 저택을 지키는 하인 / 약을 독점한 약종상과 그를 찾아온 가난한 어미 / 시체 수레꾼이 된 묘지기의 하루.',
        pitfall: '역병을 ‘배경 장식’으로만 쓰면 약하다 — 봉쇄·사재기·희생양·신분 동요 같은 ‘사회의 반응’이 진짜 이야기. 즉효약·현대 의학 개념을 시대착오로 넣지 말 것.',
      },
      {
        id: 'local-epidemic', name: '풍토병·국지 유행', tagline: '한 고을을 덮친 열병이 마을의 운명을 가른다.',
        scale: '한 마을·고을~한 계절. 좁지만 그 안에선 절멸급.',
        causes: '오염된 물·고인 물의 모기, 흉년 뒤의 쇠약, 떠돌이·군대가 옮긴 병, 장례·간병 과정의 전염. 특정 계절·지형과 결부된다.',
        phases: '①첫 죽음과 “돌림병이 돈다”는 수군거림 → ②확산과 마을 봉쇄(우물·길 막기) → ③무당·의원·관의 개입 → ④희생양 지목 또는 집단 굿·기도 → ⑤소강 또는 마을 붕괴(피란·해산). 작은 공동체라 더 잔인하게 갈린다.',
        factions: '병든 가족과 멀쩡한 이웃, 마을을 떠날 자와 남을 자, 무당·의원·관헌, 외지에서 온 ‘병을 옮긴 자’로 지목된 자.',
        people: '아픈 집을 피하고 우물을 나눠 쓰길 거부하는 균열, 그러나 한밤중 몰래 약을 두고 가는 손. 떠나는 자의 죄책감과 남는 자의 원망. 한 죽음이 온 마을의 신앙·관계를 시험한다.',
        aftermath: '몇 집이 끊기고 빈터가 생긴다. 떠난 자와 남은 자의 골, 희생양이 된 집의 낙인. 우물·장례·금기의 새 규칙이 생기고, 그해는 ‘병들었던 해’로 오래 불린다.',
        hooks: '병든 아이를 안고 마을을 떠나는 어미 / 우물을 막자는 마을 회의 / 병을 옮겼다고 몰린 떠돌이 / 다 떠난 마을에 홀로 남아 환자를 돌보는 노인.',
        pitfall: '작은 공동체의 ‘서로를 향한 의심·배제’가 핵심인데 이를 빼고 단순 ‘앓다 나음’으로 처리하면 밋밋하다. 병의 정체를 현대 진단명으로 단정해 버리면 시대감이 깨진다.',
      },
    ],
  },
  {
    key: 'famine', label: '기근·식량난', icon: '🌾',
    note: '곡식이 끊겨 사람이 사람을 먹는 데까지 가는 사건. 천재(天災)로 시작해 인재(人災)로 깊어진다. 굶주림은 가장 느리고 가장 잔인한 재난.',
    items: [
      {
        id: 'great-famine', name: '대기근', tagline: '들판이 마르고 곳간이 비어, 산 자가 풀뿌리와 나무껍질을 벗긴다.',
        scale: '한 계절~수년의 연속 흉작. 한 지방에서 나라 전체로.',
        causes: '가뭄·홍수·냉해·병충해의 연속 흉작, 전쟁·약탈로 끊긴 농사, 잘못된 정책·매점매석, 단일 작물 의존. 천재에 인재가 겹쳐 파국으로.',
        phases: '①흉작과 곡가 폭등 → ②비축·도토리·구황작물로 버티기 → ③유랑·걸식·인신매매 → ④아사자 속출과 역병 동반 → ⑤폭동·약탈·식인의 극단 → ⑥구휼(賑恤)·풍년 또는 인구 붕괴. 굶주림은 도덕을 마지막까지 시험한다.',
        factions: '굶는 백성과 곳간을 쥔 지주·관리, 곡식을 쟁여 값을 올리는 모리배, 구휼하려는 청백리, 유랑하는 걸인 무리, 곡식을 노린 도적.',
        people: '자식을 종으로 팔거나 길에 버리는 부모, 풀뿌리·흙·나무껍질까지 먹는 사람들, 곳간을 터는 손과 그걸 지키는 칼. 나누는 자와 빼앗는 자가 같은 골목에 있다. 살아남은 죄책감이 평생 따라온다.',
        aftermath: '인구 격감과 버려진 농토, 신분 변동(노비 급증·몰락 양반), 곡가·토지 질서의 재편. 굶주림의 기억이 세대를 따라 ‘아끼는 습성’과 트라우마로 남는다. 정권의 정당성이 흔들린다.',
        hooks: '마지막 씨앗을 먹을지 심을지 / 자식을 팔러 가는 길에서 / 곳간을 연 관리와 그를 처벌하려는 상부 / 굶주린 마을에 들어온 한 수레의 곡식.',
        pitfall: '기근을 단순 ‘배경 흉년’으로 처리하면 약하다 — 매점매석·구휼 실패 같은 인재(人災)와 인간성의 붕괴/발휘가 핵심. 즉각적인 외부 구호를 현대적으로 그리면 시대착오.',
      },
      {
        id: 'siege-starvation', name: '봉쇄 기근', tagline: '성과 도시가 갇혀, 안에서부터 천천히 굶어 간다.',
        scale: '수주~수개월의 봉쇄. 갇힌 도시·요새 인구에 집중.',
        causes: '전쟁의 포위·해상 봉쇄, 보급선 차단, 점령군의 식량 통제. 굶기는 것이 곧 무기.',
        phases: '①비축 식량 배급제 → ②암시장과 폭리, 식량 폭동 → ③말·개·가죽·쥐까지 → ④아사·역병과 시신 처리 위기 → ⑤내부 항복론과 결사항전론의 충돌 → ⑥성문 개방 또는 옥쇄. 배급표가 곧 생사부.',
        factions: '굶는 주민과 식량을 쥔 수비대·관리, 암시장 상인, 항복파와 항전파, 봉쇄한 적군, 몰래 식량을 들이려는 밀수꾼.',
        people: '배급 줄에서의 싸움, 아이를 위해 자기 몫을 굶는 부모, 식량을 숨긴 이웃을 향한 밀고. 곡식 한 줌이 사람값을 정하고, 어제의 점잖던 사람이 짐승처럼 변한다. 그래도 누군가는 몫을 나눈다.',
        aftermath: '함락이든 해방이든 인구는 텅 비고, ‘그 겨울’의 굶주림은 평생의 기준점이 된다. 식량을 둘러싼 원한·은혜가 전후 관계를 좌우한다. 부풀린 영웅담과 묻힌 추한 기억이 공존.',
        hooks: '배급표를 위조한 자의 재판 / 마지막 말(馬)을 잡는 밤 / 적진의 가족에게 식량을 들이려는 밀수 / 성문을 열자고 설득하는 어머니들.',
        pitfall: '봉쇄 기근의 핵심은 ‘갇힌 채 서서히 무너지는 내부’다 — 외부 전투 묘사로 대체하면 안 된다. 굶주림의 단계(배급→암시장→짐승→사람)를 건너뛰면 절박함이 죽는다.',
      },
    ],
  },
  {
    key: 'disaster', label: '천재지변·재난', icon: '🌋',
    note: '자연이 인간의 질서를 단숨에 지워 버리는 사건. 재난 그 자체보다, 무너진 뒤 드러나는 사회의 민낯과 복구의 정치가 이야기가 된다.',
    items: [
      {
        id: 'earthquake', name: '대지진', tagline: '땅이 흔들린 몇 초가 도시 하나를 폐허로 바꾼다.',
        scale: '발생은 수십 초, 여진은 수일~수주, 복구는 수년. 도시·해안 광역에 동시 타격.',
        causes: '지각 변동(서사상으론 ‘예고 없는 천재’). 부실한 건축·밀집·취약 지반이 피해를 키우는 인재 요소.',
        phases: '①본진과 붕괴(수십 초의 지옥) → ②매몰자 구조와 화재·여진 → ③단수·단전·물자 고갈과 약탈·유언비어 → ④구호와 무질서, 희생양·괴소문(특정 집단이 우물에 독을 탔다는 식) → ⑤이재민촌과 복구의 정치 → ⑥재건과 망각. 흔들림 뒤의 ‘인간’이 진짜 사건.',
        factions: '이재민과 구조대, 약탈자와 자경단, 무능·헌신이 갈리는 관리, 괴소문에 휩쓸린 군중과 그 표적이 된 소수자, 재건 이권을 노린 자.',
        people: '폐허에서 가족 이름을 부르는 소리, 물·담요 한 장을 둘러싼 다툼과 나눔. 공포가 만든 유언비어와 그로 인한 폭력, 그 와중의 의외의 연대. ‘그날 어디 있었나’가 평생의 질문이 된다.',
        aftermath: '도시 구조·인구의 재편, 부실·부패의 폭로와 책임 공방, 트라우마와 추모. 괴소문이 부른 학살의 상처. 재건 이권을 둘러싼 새 권력 다툼. 기억의 풍화와 다음 재난 망각.',
        hooks: '무너진 집 아래에서 들리는 목소리 / 괴소문에 쫓기는 이방인을 숨기는 사람 / 부실시공을 알던 건축업자의 죄책감 / 이재민촌에서 다시 시작하는 가족.',
        pitfall: '지진을 ‘파괴 장면’으로 소비하고 끝내면 약하다 — 유언비어·희생양·복구의 정치 같은 ‘재난 후 사회’가 핵심. 즉각적·완벽한 구조 시스템을 시대 무시하고 넣지 말 것.',
      },
      {
        id: 'flood', name: '대홍수·수해', tagline: '강이 둑을 넘어 들과 마을을 삼키고, 물이 빠진 뒤 더 큰 싸움이 온다.',
        scale: '범람은 수일, 침수·역병은 수주, 복구는 한 계절 이상. 강 유역 전체.',
        causes: '폭우·해일·둑 붕괴, 무리한 개간·삼림 파괴로 약해진 땅, 방치된 제방. 천재에 관리 실패가 겹친다.',
        phases: '①폭우·수위 경고(무시·대피) → ②둑 붕괴와 범람, 고립·표류 → ③구조와 지붕 위 농성 → ④물이 빠진 뒤 진창·역병·식량난 → ⑤구휼과 책임 공방, 제방 다툼 → ⑥재건과 이주. 물보다 ‘물 빠진 뒤’가 길다.',
        factions: '수재민과 구조선, 상류·하류 마을의 물싸움(둑을 어디서 터뜨리나), 제방을 관리하던 관리, 구휼미를 쥔 자, 떠내려간 재산을 노린 자.',
        people: '지붕 위에서 구조를 기다리는 밤, 떠내려가는 살림과 가축, 상류 마을이 우리 쪽 둑을 텄다는 원한. 진흙 속 시신 수습과 역병, 그래도 함께 흙을 퍼내는 손. 물자국이 벽에 남아 매년 그날을 떠올리게 한다.',
        aftermath: '농토 유실과 기근·역병의 연쇄, 상·하류 간 원한, 제방·치수를 둘러싼 정치. 이주와 마을 소멸, 또는 더 높은 둑과 함께 재건. 책임을 둘러싼 소송·민란의 씨앗.',
        hooks: '둑을 어느 마을 쪽으로 터뜨릴지 결정하는 회의 / 지붕 위에서 떠내려간 이웃 / 구휼미를 빼돌린 관리 / 물 빠진 폐가에서 옛 살림을 찾는 노부부.',
        pitfall: '홍수를 ‘범람 한 번’으로 끝내면 약하다 — 상·하류 갈등, 물 빠진 뒤의 역병·기근·치수 정치가 핵심. 현대식 즉각 재난 대응을 과거 배경에 넣지 말 것.',
      },
      {
        id: 'volcano', name: '화산 분화', tagline: '하늘이 잿빛으로 막히고, 한 해의 여름이 사라진다.',
        scale: '분화는 수일, 화산재·기후 영향은 수개월~수년. 인근은 즉사, 광역은 흉작·기근.',
        causes: '화산 활동(서사상 ‘대재난의 전조’). 인근 정착·무지가 피해를 키운다. 대분화는 멀리까지 기후를 바꾼다.',
        phases: '①전조(지진·연기·이상 징후, 무시) → ②분화와 화쇄류·낙진(인근 절멸) → ③화산재로 막힌 하늘·낮의 어둠·이상기후 → ④흉작·기근·역병의 연쇄(원거리 재난) → ⑤유랑·이주와 종말론·미신 → ⑥서서히 회복되는 하늘. 분화점에서 멀어도 ‘여름 없는 해’로 굶는다.',
        factions: '분화 인근 주민과 도망자, 먼 곳의 농민(흉작 피해자), 종말을 외치는 예언자·광신, 질서를 잡으려는 관, 이주민을 받거나 막는 타지.',
        people: '낮인데 어두운 하늘 아래의 공포, ‘세상이 끝난다’는 소문과 광신, 잿더미에 묻힌 마을. 멀리선 영문 모를 흉년에 굶고, 떠도는 화산 난민을 향한 배척. 하늘만 보며 비를 기다리는 나날.',
        aftermath: '인근은 묻혀 사라지고, 광역은 ‘여름 없는 해’의 기근·역병·이주. 종교·미신의 발흥, 정치 불안. 묻힌 도시는 훗날 발굴되어 그날을 증언한다. 기후 충격이 먼 곳의 역사를 바꾼다.',
        hooks: '전조를 경고했으나 무시당한 자 / 잿빛 하늘 아래 종말을 외치는 예언자 / 화산 난민을 받아들일지 다투는 마을 / 멀리서 영문 모를 흉년에 굶는 농가.',
        pitfall: '화산을 ‘인근 파괴’로만 보면 절반만 그린 것 — 화산재·기후 변화가 ‘먼 곳’에 기근을 부르는 광역성이 강력한 소재. 분화 직후 즉시 회복으로 그리면 스케일이 죽는다.',
      },
    ],
  },
  {
    key: 'coup', label: '정변·권력암투', icon: '🗡️',
    note: '소수가 은밀히 또는 전격적으로 권력을 가로채는 사건. 거리의 혁명과 달리 궁정·군대·밀실에서 결판난다. 칼보다 정보와 타이밍이 무기.',
    items: [
      {
        id: 'palace-coup', name: '궁정 정변', tagline: '하룻밤의 움직임으로 옥좌의 주인이 바뀐다.',
        scale: '결행은 하룻밤~며칠, 여파는 수년의 숙청. 궁궐·수도에 집중.',
        causes: '왕의 무능·병약·폭정, 후계 분쟁, 외척·환관·권신의 발호, 군부의 불만. 정통성의 빈틈이 도화선.',
        phases: '①불만 세력의 은밀한 규합·명분 만들기 → ②핵심 병력·궁문·통신 장악 → ③기습 결행(체포·시해·옥새 확보) → ④새 권력의 정당화(조서·즉위·대의명분) → ⑤반대파 숙청과 회유 → ⑥불복 세력의 반격(내전 위험) 또는 안정화. 명분 없는 칼은 오래 못 간다.',
        factions: '쿠데타 주모자(권신·장군·종친)와 가담 군부, 친위·금군, 외척·환관, 폐위될 군주와 충신, 줄을 갈아타는 관료들.',
        people: '밤사이 바뀐 깃발에 어리둥절한 백성, “누가 이겼나”를 살피는 관료들, 잘못 줄 선 집안의 몰락. 거리의 일상은 의외로 빨리 정상으로 — 그러나 궁에선 피의 명단이 돈다.',
        aftermath: '새 군주·실권자의 등극과 대대적 숙청·연좌, 공신 책봉과 논공행상. 정통성 시비가 오래 남고, 또 다른 정변의 빌미가 된다. 사서(史書)는 승자가 쓴다 — 폐주는 폭군으로 기록된다.',
        hooks: '거사 직전 망설이는 가담자 / 폐위된 군주를 끝까지 따른 충신 / 줄을 잘못 선 집안의 딸 / 다음 정변을 이미 꾸미는 공신.',
        pitfall: '정변은 ‘거리의 혁명’과 다르다 — 군중이 아니라 핵심 거점(군·궁문·옥새)의 전격 장악이 관건. ‘정의로운 거사 vs 악한 폭군’의 단순 구도(승자의 서술)에 휘둘리지 말 것.',
      },
      {
        id: 'military-coup', name: '군사 쿠데타', tagline: '동트기 전, 탱크 아닌 군화 소리가 권력을 접수한다.',
        scale: '결행은 수시간~며칠, 통치는 수년~수십 년. 수도의 요충(방송·관청·다리)에 집중.',
        causes: '정치 혼란·부패·경제난, 군부의 불만과 야심, 외세의 묵인·후원, ‘질서 회복’이라는 명분. 위기가 길수록 군이 나설 틈이 커진다.',
        phases: '①은밀한 모의와 부대 포섭 → ②새벽 결행: 방송국·관청·교통 요지·지도부 장악 → ③비상사태·계엄 선포와 통금 → ④저항(시위·반(反)쿠데타) 진압 또는 협상 → ⑤민정 이양 약속과 권력 고착화 → ⑥장기 군정 또는 또 다른 쿠데타. 첫 몇 시간이 성패를 가른다.',
        factions: '쿠데타 주도 장교단과 가담 부대, 충성을 지킨 부대, 무력화된 정부, 관망·동조하는 관료·언론, 침묵하거나 저항하는 시민, 외부 강대국.',
        people: '아침에 일어나 보니 바뀐 방송, 거리의 군인과 통금. 두려움 속 관망, “이번엔 좀 나아질까”라는 체념 섞인 기대와 그 배신. 잡혀간 이웃, 검열된 신문, 입조심하는 식탁.',
        aftermath: '계엄·언론 통제·정적 숙청, ‘질서’의 이름으로 굳어지는 억압. 약속한 민정 이양의 지연, 부패의 재생산. 저항의 기억과 훗날의 청산. 경제·외교의 단절 또는 의존.',
        hooks: '거사에 동참할지 밤새 고민하는 젊은 장교 / 방송국을 지키다 끌려간 아나운서 / 통금 속 귀가하는 가족 / 검열을 뚫고 진실을 알리려는 기자.',
        pitfall: '쿠데타의 핵심은 ‘대중 동원’이 아니라 ‘요충 장악과 기정사실화’다. 모든 군이 한뜻이라는 가정은 위험 — 부대 간 충돌·관망·반쿠데타가 변수. 즉각적 시민 봉기로 손쉽게 막히는 식으로 단순화 말 것.',
      },
      {
        id: 'court-intrigue', name: '궁중 암투', tagline: '미소 뒤의 칼 — 피 한 방울 없이 사람이 사라진다.',
        scale: '수개월~수년의 장기전. 한 궁정·가문 내부의 그림자 싸움.',
        causes: '후계·총애 다툼, 외척·붕당의 세력 경쟁, 한정된 권력(자리·재물·총애)을 둘러싼 제로섬. 드러나지 않는 야심이 동력.',
        phases: '①줄서기와 파벌 형성 → ②정보전·소문·모함(誣告)과 가짜 증거 → ③총애·신임의 이동을 노린 함정 → ④실각·유배·사사(賜死)나 ‘사고’ → ⑤승자의 자리 굳히기와 보복 → ⑥새 위협의 등장(돌고 도는 암투). 칼보다 말과 정보가 사람을 죽인다.',
        factions: '경쟁 파벌·외척, 정보를 쥔 환관·시녀·집사, 판단하는 군주(혹은 그 총애), 중립을 가장한 기회주의자, 함정에 빠진 충직한 자.',
        people: '말 한마디를 곱씹고 누구 앞에서 웃을지 계산하는 나날, 어제의 권세가가 오늘 끌려 나가는 광경. 하인·시녀조차 정보를 팔고, 가족이 서로를 의심한다. 안전한 침묵이 가장 큰 사치.',
        aftermath: '한 가문의 멸문과 다른 가문의 발흥, 총애의 향방에 따른 재편. 그러나 승리는 잠정적 — 다음 표적은 오늘의 승자. 기록은 지워지고 덧칠되며, 진실은 소문으로만 남는다.',
        hooks: '날조된 편지 한 통의 행방 / 주인을 배신한 충직한 시종 / 총애를 잃은 후궁의 마지막 수 / 모함인 줄 알면서 침묵해야 하는 신하.',
        pitfall: '궁중 암투는 액션이 아니라 ‘정보·심리·타이밍’의 게임이다 — 노골적 폭력으로 바꾸면 맛이 죽는다. 모든 음모가 한 명의 천재 악당에게서 나온다는 단순화(실제론 다자간 견제)도 피할 것.',
      },
    ],
  },
]

const LS = 'sry:tool:historical-event-ref:'
const ALL = '__all__'

type Flat = { cat: EvCat; item: Ev }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 항목의 '표 행' 정의 — 규모·원인·전개·세력·민중반응·여파·갈고리·함정
const FIELDS: { k: keyof Ev; label: string; icon: string }[] = [
  { k: 'scale', label: '규모·기간', icon: '📏' },
  { k: 'causes', label: '원인·도화선', icon: '🔥' },
  { k: 'phases', label: '전형적 전개', icon: '📈' },
  { k: 'factions', label: '주요 세력', icon: '🎭' },
  { k: 'people', label: '민중 반응', icon: '👥' },
  { k: 'aftermath', label: '여파·결과', icon: '🌫️' },
  { k: 'hooks', label: '이야기 갈고리', icon: '🪝' },
  { k: 'pitfall', label: '고증·서사 함정', icon: '⚠️' },
]

function plainText(f: Flat): string {
  const lines = [
    `⚔️ ${f.item.name}  (${f.cat.label})`,
    `· 요지: ${f.item.tagline}`,
  ]
  for (const fd of FIELDS) {
    const v = f.item[fd.k]
    if (v) lines.push(`· ${fd.label}: ${v}`)
  }
  return lines.join('\n')
}

function bodyHtml(f: Flat): string {
  const rows = FIELDS
    .filter((fd) => f.item[fd.k])
    .map((fd) => `<tr><td><b>${escapeHtml(fd.label)}</b></td><td>${escapeHtml(String(f.item[fd.k]))}</td></tr>`)
    .join('')
  return [
    `<p><b>${escapeHtml(f.item.name)}</b> — ${escapeHtml(f.cat.label)}</p>`,
    `<p><i>${escapeHtml(f.item.tagline)}</i></p>`,
    `<table border="1" cellpadding="4" cellspacing="0"><tbody>${rows}</tbody></table>`,
    `<p><i>※ 플롯 배경 소재용 자작 '사건 유형' 요약입니다. 특정 실제 사건을 쓸 땐 사료로 다시 검증하세요.</i></p>`,
  ].join('')
}

export default function HistoricalEventRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.event / payload.kind 가 오면 검색 힌트로 활용
  const hint0 = typeof payload?.event === 'string' ? (payload.event as string)
    : typeof payload?.kind === 'string' ? (payload.kind as string) : ''

  const [query, setQuery] = useState(hint0)
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
  const favKey = (catKey: string, id: string) => `${catKey}::${id}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base: Flat[] = cat === ALL ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[favKey(c.key, item.id)])
    if (q) {
      base = base.filter(({ cat: c, item }) => {
        if (c.label.toLowerCase().includes(q)) return true
        if (item.name.toLowerCase().includes(q)) return true
        if (item.tagline.toLowerCase().includes(q)) return true
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
      if (prev && pool.length > 1 && pick.item.id === prev.item.id) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return pick
    })
  }, [cat])

  const toggleFav = (catKey: string, id: string) => {
    const k = favKey(catKey, id)
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

  // 수집함에 담기 — addToStash({kind:'note', ...})
  const toStash = (f: Flat) => {
    if (!hasStash()) { flash('수집함에 연결되어 있지 않습니다.'); return }
    addToStash({ kind: 'note', label: `${f.item.name} (${f.cat.label})`, text: plainText(f) })
    flash(`수집함에 ‘${f.item.name}’ 사건 자료를 담았습니다.`)
  }

  // 스니펫 저장(글감) — addToLibrary('snippets', ...)
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: `[사건 유형] ${plainText(f)}`,
      source: '역사적 사건 사전',
      tags: ['역사', '사건', '플롯', f.cat.label, f.item.name],
    })
    flash(`스니펫 라이브러리에 ‘${f.item.name}’ 자료를 저장했습니다.`)
  }

  // 프로젝트 자료에 추가 — addToProject(root:'research', folder:'사건·배경')
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '사건·배경',
      title: `${f.item.name} (${f.cat.label})`,
      bodyHtml: bodyHtml(f),
      meta: { 사건유형: f.cat.label, 요지: f.item.tagline },
    })
    if (id) flash(`프로젝트 자료 〈사건·배경〉에 ‘${f.item.name}’을(를) 추가했습니다.`)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  // 표 형식 렌더(규모·원인·전개·… 행)
  const renderTable = (item: Ev) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 8, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      {FIELDS.filter((fd) => item[fd.k]).map((fd, i) => (
        <div key={fd.k} style={{ display: 'flex', gap: 0, background: i % 2 ? 'var(--paper)' : 'var(--panel)' }}>
          <div style={{ flex: '0 0 104px', padding: '7px 9px', fontSize: 12, fontWeight: 600, color: fd.k === 'pitfall' ? 'var(--ok)' : 'var(--accent)', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 4 }}>
            <span aria-hidden><Emoji e={fd.icon} /></span><span>{fd.label}</span>
          </div>
          <div style={{ flex: 1, padding: '7px 10px', fontSize: 12.5, lineHeight: 1.55 }}>{String(item[fd.k])}</div>
        </div>
      ))}
    </div>
  )

  return (
    <div style={wrap}>
      {/* 안내 — 플롯 배경 소재용 명시 */}
      <div style={{
        background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)',
        borderRadius: 8, padding: '8px 11px', fontSize: 12, lineHeight: 1.55, color: 'var(--muted)',
      }}>
        <Emoji e="⚔️" /> <b style={{ color: 'var(--text)' }}>플롯 배경 소재</b>입니다. 혁명·전쟁·역병·기근·천재지변·정변 등 사건 ‘유형’의 전형적
        전개·원인·여파·민중 반응을 정리한 자작 요약이며, 특정 실제 사건을 쓸 땐 사료로 다시 확인해 쓰세요.
      </div>

      <div style={hint}>
        여섯 유형 · <b>{total}개</b> 사건 유형을 표로 정리했습니다. 검색·펼침으로 찾고, 무작위로 사건의 씨앗을 얻고,
        클릭해 복사하거나 수집함·스니펫·프로젝트 〈사건·배경〉으로 보내세요. <b>전개</b>는 그대로 플롯 단계로,
        <b>이야기 갈고리</b>는 장면·인물 아이디어로 쓰기 좋습니다.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="사건·유형·키워드로 검색 (예: 봉쇄, 숙청, 피란, 약탈, 희생양, 배급, 화산재)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 사건 유형(카테고리) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL)} aria-pressed={cat === ALL}
          style={{ borderColor: cat === ALL ? 'var(--accent)' : 'var(--border)', color: cat === ALL ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🗂️" /> 전체
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on}
              title={c.note}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={c.icon} /> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 사건</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('historical-era-ref')} title="시대상 레퍼런스 열기"><Emoji e="🏺" /> 시대상 레퍼런스</button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 유형 선택 시 한 줄 설명 */}
      {cat !== ALL && (
        <div style={{ ...hint, fontStyle: 'italic' }}>
          <Emoji e={CATS.find((c) => c.key === cat)?.icon || ''} /> {CATS.find((c) => c.key === cat)?.note}
        </div>
      )}

      {/* 무작위 결과 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>{random.item.tagline}</div>
          {renderTable(random.item)}
          <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(plainText(random), 'rnd')}>
              {copiedKey === 'rnd' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
            </button>
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="💾" /> 스니펫 저장</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.id)}>
              {favs[favKey(random.cat.key, random.item.id)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => toStash(random)} disabled={!hasStash()}
              title={hasStash() ? '이 자료를 플로팅 수집함에 담기' : '수집함에 연결되어 있지 않습니다'}>
              <Emoji e="📎" /> 수집함
            </button>
            <button className="linkbtn" onClick={() => toProject(random)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 자료를 프로젝트 자료 〈사건·배경〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('historical-era-ref')} title="시대상 레퍼런스 열기"><Emoji e="🏺" /> 시대상 레퍼런스</button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5 }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록(펼침형 표) */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 사건이 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const fk = favKey(c.key, item.id)
            const open = !!expanded[fk]
            const isFav = !!favs[fk]
            return (
              <div key={fk} style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /> {c.label}</span>
                  <button onClick={() => toggleExpand(fk)} title={open ? '접기' : '펼치기'}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', fontSize: 15, fontWeight: 700, textAlign: 'left' }}>
                    {open ? '▾' : '▸'} {item.name}
                  </button>
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(c.key, item.id)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)', fontStyle: 'italic' }}>
                  {item.tagline}
                </div>
                {open && renderTable(item)}
                {open && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button className="minibtn" onClick={() => copy(plainText({ cat: c, item }), 'item:' + fk)}>
                      {copiedKey === 'item:' + fk ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
                    </button>
                    <button className="minibtn" onClick={() => saveSnippet({ cat: c, item })}><Emoji e="💾" /> 스니펫 저장</button>
                    <button className="linkbtn" onClick={() => toStash({ cat: c, item })} disabled={!hasStash()}
                      title={hasStash() ? '수집함에 담기' : '수집함에 연결되어 있지 않습니다'}>
                      <Emoji e="📎" /> 수집함
                    </button>
                    <button className="linkbtn" onClick={() => toProject({ cat: c, item })} disabled={!hasProjectBridge()}
                      title={hasProjectBridge() ? '프로젝트 자료 〈사건·배경〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                      <Emoji e="📄" /> 프로젝트에 추가
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>같은 ‘전쟁’이라도 침략·내전·공성은 인물이 놓이는 자리와 도덕적 선택이 전혀 다릅니다. 사건 유형은 플롯의 뼈대일 뿐, 인물의 구체적 선택으로 살을 붙여 쓰세요.</div>
    </div>
  )
}
