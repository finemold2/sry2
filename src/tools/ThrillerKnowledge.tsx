// 스릴러·서스펜스 장르 지식·소재 사전 — 장르 정의·하위장르·대표작 계보·독자 기대(필수 관습)·
//  서사 장치(정보 비대칭/티킹 클락/맥거핀/언리라이어블 내레이터 등)·전개/페이싱·클라이맥스 관습·
//  특수 어휘(장르 용어/감각 동작 어휘)·압박형 배경 프리셋·흔한 함정·클리셰(전복 권장)를
//  카테고리로 묶은 로컬 사전. 도시에 근거한 스릴러·서스펜스 특화 자작 데이터(범용 글쓰기 일반론 배제).
// 자급식: 외부 네트워크·라이브러리 없음. react + './linkbus' 만 사용.
//  localStorage 로 펼침/즐겨찾기/마지막 카테고리 영속. 언마운트 정리.
import { useState, useEffect, useMemo, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = { id: 'thriller-knowledge', name: '스릴러·서스펜스 지식 사전', icon: '🕵️', group: '지식 사전', genre: '스릴러·서스펜스', intro: '스릴러·서스펜스에서 자주 쓰는 소재·서사 장치·압박형 배경·장르 용어·고증 함정을 카테고리로 찾아 긴장 장면에 심으세요', w: 700, h: 660 }

interface Entry { name: string; desc: string; tip?: string }
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ─────────────────────────────────────────────────────────────────────────────
// 스릴러·서스펜스 도시에 기반 자작 지식 사전 — 11개 카테고리, 합계 200+ 항목.
// 데이터는 전부 스릴러·서스펜스 장르에 특화·구체적(심리/도메스틱/리걸/스파이/수사/액션 혼종).
// 범용 글쓰기 조언·일반론은 배제.
// ─────────────────────────────────────────────────────────────────────────────
const CATS: CatDef[] = [
  {
    key: 'subgenre', label: '하위 장르', icon: '🗂️', note: '무대와 위협의 성격이 갈라지는 1차 분기. 어느 갈래인지 정하면 페이싱·시점·반전 강도·고증 부담이 따라온다.',
    items: [
      { name: '심리 스릴러', desc: '위협이 외부의 추격보다 인물의 내면·인지·관계에서 온다. 기억·정신·진실의 불확실성이 엔진. 하이스미스 『리플리』, 정유정 『종의 기원』, 영화 『싸이코』.', tip: '"무슨 일이 일어나는가"보다 "내가 보는 게 진짜인가"로 끌어라. 신뢰할 수 없는 화자·왜곡된 지각을 무기로 삼아라.' },
      { name: '도메스틱(가정) 스릴러', desc: '안전해야 할 곳(집·결혼·이웃·학교)이 위협의 근원이 되는 전도. 2010년대 붐. 플린 『나를 찾아줘』, 호킨스 『걸 온 더 트레인』, 핀 『우먼 인 윈도』.', tip: '평범한 부부싸움·이웃 험담에서 출발해 한 꺼풀씩 일상을 균열시켜라. 가장 가까운 사람이 가장 위험하다는 편집증이 핵심.' },
      { name: '리걸·법정 스릴러', desc: '법·증거·재판 절차가 무대이자 시한. 공판 일정이 곧 티킹 클락. 그리샴 『그래서 그들은 바다로 갔다』, 터로우 『무죄추정』, 도진기.', tip: '"공판 D-7" 같은 절차의 마감을 카운트다운으로 깔아라. 증거 하나의 채택/배제가 판세를 뒤집는 미스디렉션을 설계하라.' },
      { name: '스파이·정치 스릴러', desc: '첩보·국가권력·이중스파이의 도덕적 회색지대. 르카레 『추운 나라에서 돌아온 스파이』(현실적·우울), 러들럼 『본 아이덴티티』(액션 추진형), 포사이스 『자칼의 날』.', tip: '르카레형(배신·환멸)과 러들럼형(추격·기억상실)은 톤이 정반대다. 어느 쪽인지 먼저 정하라 — 회색의 깊이가 결정된다.' },
      { name: '법의학·수사 스릴러', desc: '연쇄살인·프로파일링·검시. 단서의 함정과 추리의 절차. 해리스 『양들의 침묵』, 콘웰(검시관), 디버 『본 콜렉터』.', tip: '범인의 시점을 일찍 끼워 정보 비대칭(독자 > 형사)을 만들면 추적의 긴장이 폭발한다. 단서는 이중 기능(1독 무해, 재독 결정적)으로.' },
      { name: '액션·추적 스릴러', desc: '물리적 추격·생존·임무 수행. 짧은 챕터와 끝없는 위기 갱신. 차일드 『잭 리처』, 브라운 『다빈치 코드』(보물찾기+초단편 챕터).', tip: '주인공을 유능하되 취약하게 — 다치고 속고 고립시켜라. 매 시퀀스 위험을 한 단 올려 같은 강도의 반복을 피하라.' },
      { name: '테크노·생존·재난 스릴러', desc: '과학·기술·전염병·시스템 붕괴가 위협. 크라이튼 『쥬라기 공원』『안드로메다 스트레인』. 절차적 사실감이 무게를 만든다.', tip: '위협의 "메커니즘"을 독자가 이해하게 하라 — 어떻게 퍼지는지, 무엇이 임계점인지가 명확해야 카운트다운이 산다.' },
      { name: '느와르·범죄 스릴러', desc: '부패한 도시·청부·뒷세계. 도덕적 주인공이 드물고 모두가 회색. 김언수 『설계자들』, 영화 『추격자』『끝까지 간다』.', tip: '"믿을 사람이 없다"의 세계관을 구축하라. 승리에도 대가가 따르고, 다크/오픈 엔딩이 어울린다.' },
      { name: '미스터리 혼종(미스터리 스릴러)', desc: '과거의 "무슨 일이 있었나"(후스더닛)와 미래의 "막을 수 있나"가 결합. 후반부로 갈수록 시한이 조여 온다.', tip: '미스터리(과거 지향)와 스릴러(미래 지향)의 비율을 정하라 — 초반 수수께끼에서 후반 카운트다운으로 무게를 옮기면 강력하다.' },
      { name: '도주(누명) 스릴러', desc: '누명 쓴 평범한 인물이 진짜 범인을 찾으며 추격을 피해 달아난다. "쫓기며 동시에 쫓는" 이중 압박.', tip: '경찰·진범 양쪽에 동시에 쫓기게 하라. 무고를 증명할 단서가 곧 자신을 위험에 빠뜨리는 아이러니를 깔아라.' },
    ],
  },
  {
    key: 'canon', label: '대표작 계보', icon: '📚', note: '서사 문법의 교과서들. "어떤 톤·어떤 반전 구조"를 차용할지 정할 때 좌표가 된다.',
    items: [
      { name: '히치콕(『현기증』『싸이코』『이창』)', desc: '서스펜스 문법의 교과서. "테이블 밑 폭탄" 정의(관객만 아는 위협이 긴장을 15분 지속)의 원천. 정보 비대칭 설계의 정수.', tip: '"관객은 알고 인물은 모른다"의 드라마틱 아이러니를 장면 단위로 설계할 때의 원전. 서프라이즈(15초)보다 서스펜스(15분)를 택하라.' },
      { name: '대프니 듀 모리에 『레베카』', desc: '고딕 서스펜스의 원형. 죽은 전처의 그림자, 이름 없는 화자, 저택의 불길한 분위기. 도메스틱 서스펜스의 뿌리.', tip: '"보이지 않는 존재의 압박"을 쓸 때 — 직접 등장하지 않는 위협(과거·소문·부재자)이 집 전체를 잠식하는 분위기 구축법.' },
      { name: '패트리샤 하이스미스 『리플리』', desc: '반사회적 인물의 시점. 범죄자에게 독자가 이입하게 만드는 도덕적 전복. 들킬 위기의 서스펜스.', tip: '악인을 주인공으로 — 독자가 "들키지 마"라고 응원하게 만드는 시점 설계. 공감과 죄책감 사이의 긴장이 무기.' },
      { name: '존 르카레 『추운 나라에서…』『팅커 테일러…』', desc: '현실적·도덕적 회색의 스파이물. 영웅 없는 첩보, 배신과 환멸, 조직 내부의 두더지(이중스파이) 색출.', tip: '화려한 액션 대신 "신뢰의 부식"으로 긴장을 만들 때. 누가 배신자인가의 정보전, 승리해도 공허한 다크 엔딩.' },
      { name: '프레더릭 포사이스 『자칼의 날』', desc: '절차적 카운트다운의 정석. 암살자의 준비 과정과 수사관의 추적을 평행 편집. 결말(드골 생존)을 알아도 과정이 긴장.', tip: '"결말을 알아도 어떻게에 매달리게" 만드는 절차 스릴러의 교본. 가해자/추적자 평행 시점 + 디테일한 준비 과정.' },
      { name: '토머스 해리스 『양들의 침묵』', desc: '연쇄살인범 + 프로파일링의 대중화. 한니발 렉터라는 "한 수 위 빌런", 신참 수사관의 취약성, 시한부 피해자.', tip: '"만만찮은 적대자"의 교본 — 빌런이 주인공보다 똑똑하고 매혹적일 때 긴장이 산다. 빌런과의 면담이 정보전이 되게.' },
      { name: '길리언 플린 『나를 찾아줘』', desc: '신뢰할 수 없는 화자 + 중간 반전의 현대적 표준. 이중 시점(일기 vs 현재), 도메스틱의 가면 뒤 진실.', tip: '"중간점 대반전"의 교본 — 50% 지점에서 독자가 믿던 화자/구도를 뒤집어라. 일기·기록이 거짓 증언일 수 있음을 활용하라.' },
      { name: '제프리 디버 『본 콜렉터』', desc: '함정-반전형 플롯의 장인. 매 장마다 단서·역전·새 위협을 배치. "거짓 해결 → 진짜 위협"의 반복.', tip: '"해결한 줄 알았는데 더 큰 함정"의 진동 구조. 챕터마다 단서를 던지고 회수하는 정교한 트릭 설계의 본보기.' },
      { name: '리 차일드 『잭 리처』 시리즈', desc: '액션 추적 스릴러의 표준. 떠돌이 자경단형 주인공, 한 사건에 휘말려 정의를 실현. 능동적·물리적 해결.', tip: '"우연히 휘말렸으나 떠나지 않는" 주인공 동기 설계. 짧은 문장·빠른 페이싱·물리적 대결의 시리즈 문법.' },
      { name: '정유정 『7년의 밤』『종의 기원』', desc: '한국 심리 스릴러의 대표. 가해자의 내면을 집요하게 추적. 사이코패스 1인칭, 죄의 심연.', tip: '"가해자 시점의 심연"을 그릴 때 — 악의 평범함과 논리를 1인칭으로 추적하는 한국형 심리 스릴러의 교본.' },
      { name: '영화 『추격자』·『살인의 추억』·『끝까지 간다』', desc: '한국형 서스펜스의 작법 레퍼런스. 범인을 일찍 공개하고 "잡을 수 있나"로 끄는 구조, 무능한 시스템, 블랙코미디 혼합.', tip: '"범인을 일찍 까고 추적의 좌절로 긴장"을 만드는 한국형 구조. 시스템의 무능·일상의 부조리를 압박 요소로 써라.' },
      { name: '드라마 『시그널』·『비밀의 숲』', desc: '수사/검찰 스릴러의 정점(영상). 과거-현재 교차(시그널), 감정 없는 검사의 부패 추적(비밀의 숲). 정교한 떡밥 회수.', tip: '"시간선 교차로 정보 통제"(시그널), "냉정한 시점으로 부패의 그물 추적"(비밀의 숲) 구조를 소설에 옮길 때 참조.' },
      { name: '댄 브라운 『다빈치 코드』', desc: '코드·보물찾기 스릴러 + 초단편 챕터 페이싱. 24시간 내 수수께끼 해독, 매 장 클리프행어.', tip: '"2~4쪽 초단편 챕터 + 매 장 끝 훅"의 가속 페이싱과 퍼즐 추격 구조. 단, 빌런의 장황한 설명은 함정.' },
    ],
  },
  {
    key: 'expectation', label: '독자 기대·필수 관습', icon: '⚖️', note: '충족 못 하면 "사기당했다"는 반응이 나오는 장르 계약. 이 글이 "스릴러처럼" 느껴지게 하는 절대 조건들.',
    items: [
      { name: '끊임없는 위협감', desc: '페이지마다 "뭔가 잘못될 수 있다"는 압력. 평온은 짧고, 항상 다음 위협의 그림자가 드리워야 한다.', tip: '안전한 장면에도 불안의 씨앗을 심어라 — 울리지 않는 전화, 어긋난 물건의 위치, 백미러 속 차. 정적조차 위협으로 물들여라.' },
      { name: '명확하고 상승하는 이해관계', desc: '개인적 위험에서 출발해 더 큰 것(가족→공동체→다수)으로 확장되거나, "이 한 사람을 살리는 게 곧 전부"로 응축된다.', tip: '판돈을 처음부터 다 깔지 마라 — 위협이 무엇을 위협하는지를 단계적으로 키워라. 추상적 위험보다 구체적 손실이 무겁다.' },
      { name: '유능하지만 취약한 주인공', desc: '무적은 금물. 다치고, 속고, 실수해야 긴장이 산다. 능력과 약점이 함께 있어야 결과가 불확실해진다.', tip: '주인공에게 명확한 약점(트라우마·신체·관계·시간 부족)을 줘라 — 그 약점이 클라이맥스에서 시험받게 설계하라.' },
      { name: '만만찮은 적대자', desc: '통념상 "스릴러의 질은 빌런의 질에 비례한다." 빌런이 똑똑하고 한발 앞서야 한다. 동등하거나 더 강한 적.', tip: '빌런에게 명확한 목표·논리·강점을 줘라. 주인공이 매번 한발 늦게 따라잡는 구도가 추격의 긴장을 만든다.' },
      { name: '시간 압박(티킹 클락)', desc: '마감·카운트다운·생존 시한. 명시적(폭탄 타이머)이든 암묵적(밤이 오면, 약효가 떨어지면)이든 시계가 돌아간다.', tip: '카운트다운을 가시화하라 — "공판까지 72시간", "산소 30분치". 시한을 반복 환기하면 모든 장면에 압력이 걸린다.' },
      { name: '공정한 반전(twist)', desc: '최소 한 번의 판도를 뒤집는 반전. 단, "공정해야"(복선 회수) 한다. 재독에서 단서가 보여야 속임수가 아니다.', tip: '반전의 증거를 1독에선 무해하게, 재독에선 결정적으로 보이게 미리 깔아라. 정보를 숨기되 거짓말은 하지 마라.' },
      { name: '빠른 페이싱·짧은 챕터', desc: '짧은 장, 장면 끝마다의 훅(클리프행어), 군더더기 없는 산문. 페이지 터너의 리듬.', tip: '장면을 결정·폭로·위협·역전 직전에서 끊어라. 위협 임박 시 단문·현재형으로 체감 속도를 올려라.' },
      { name: '충분한 해소(payoff)', desc: '긴장을 충분히 끌어올린 뒤 카타르시스적 해소. 위협의 무력화, 또는 (다크 스릴러의) 의도적 좌절감.', tip: '쌓은 긴장에 비례하는 해소를 줘라 — 빌드업 없는 해결은 김이 새고, 해소 없는 긴장은 사기처럼 느껴진다.' },
      { name: '도덕적 대가', desc: '승리에 희생·상처가 따른다. 무손실 승리는 싱겁다고 평가된다. 이긴 자에게 흉터가 남아야 한다.', tip: '클라이맥스에서 주인공이 무언가(사람·신념·결백)를 잃게 하라. 대가 없는 승리는 긴장의 무게를 배신한다.' },
    ],
  },
  {
    key: 'device', label: '서사 장치', icon: '🎭', note: '스릴러·서스펜스를 "장르답게" 굴리는 엔진들. 장면 단위로 꺼내 쓰는 핵심 자산.',
    items: [
      { name: '정보 비대칭(드라마틱 아이러니)', desc: '독자 > 인물(서스펜스), 독자 = 인물(미스터리/동행), 독자 < 인물(서프라이즈/반전)을 장면 단위로 의도적으로 전환한다.', tip: '장면마다 "누가 무엇을 아는가" 매트릭스를 정하라. 독자만 폭탄을 알게 하면(>) 긴장이, 같이 모르게 하면(=) 충격이 산다.' },
      { name: '티킹 클락(시한 장치)', desc: '명시 타이머(폭탄·인질 시한), 자연 마감(밤이 오면·약효가 떨어지면·조수가 차오르면), 사회적 마감(투표·재판·출항).', tip: '시한을 가시화하고 반복 환기하라 — 시계·달력·줄어드는 자원. 마감이 클라이맥스 0초와 겹치도록 설계하라.' },
      { name: '클리프행어 챕터 엔딩', desc: '장 끝을 결정·폭로·위협·역전 "직전"에서 끊는다. 댄 브라운/패터슨식 2~4쪽 초단편 챕터로 가속.', tip: '한 장의 마지막 문장은 다음 장을 펴게 만드는 "갈고리"여야 한다. 해결은 다음 장 첫머리가 아니라 한 박자 뒤로 미뤄라.' },
      { name: '레드 헤링(거짓 단서)', desc: '의심을 엉뚱한 곳으로 유도하는 가짜 단서·가짜 용의자. 독자의 추리를 빗나가게 하는 미스디렉션.', tip: '진짜 단서와 같은 무게로 가짜를 배치하라 — 너무 노골적이면 역으로 진범이 보인다. 거짓 단서에도 합당한 사연을 줘라.' },
      { name: '체호프의 총(복선 회수)', desc: '초반에 무심히 보여준 요소(흉터·약·비밀번호·알레르기·습관)를 클라이맥스에서 결정적으로 회수한다.', tip: '클라이맥스에 필요한 도구·정보를 1막에 "무해하게" 심어 둬라. 갑자기 등장한 해결책은 데우스 엑스 마키나로 김이 샌다.' },
      { name: '맥거핀(MacGuffin)', desc: '모두가 쫓지만 그 자체 내용은 덜 중요한 추동 물건/정보(서류·코드·핵코드·USB·디스크). 추격의 동력.', tip: '맥거핀의 "내용"보다 "그것을 둘러싼 인물들의 욕망·배신"에 집중하라. 무엇인지보다 누가 쥐느냐가 플롯을 움직인다.' },
      { name: '신뢰할 수 없는 화자', desc: '기억상실·거짓말·정신질환·음주/약물·선택적 서술. 『나를 찾아줘』 이후 도메스틱 스릴러의 표준 무기.', tip: '화자가 무엇을 빠뜨리거나 왜곡하는지 작가는 정확히 알고 써라. 재독 시 "왜곡의 단서"가 보여야 공정한 속임수가 된다.' },
      { name: '이중 시점 + 시간선 분절', desc: '"지금"과 "그때"를 교차해 정보를 통제·지연. 챕터 머리에 시점/시간 라벨(─, "3일 전", "그녀의 일기").', tip: '두 시간선이 한 지점(반전)에서 충돌하도록 설계하라. 각 시점이 다른 조각을 쥐게 해 독자가 끼워 맞추게 만들어라.' },
      { name: '위장된 일상성(도메스틱 언캐니)', desc: '안전해야 할 곳(집·이웃·결혼·학교)이 위협의 근원이 되는 전도. 친숙함이 곧 공포로 뒤집힌다.', tip: '평범한 디테일(저녁식사·등굣길·이웃의 미소)에 미세한 균열을 넣어라 — 정상에서 살짝 벗어난 것이 가장 섬뜩하다.' },
      { name: '추격·은신·함정 시퀀스', desc: '물리적 긴장의 3종 기본 동작. 쫓고(chase), 숨고(hide), 덫에 걸린다(trap). 공간을 압박 장치로 쓴다.', tip: '추격엔 출구의 점진적 봉쇄를, 은신엔 발각 직전의 아슬함을, 함정엔 "탈출구가 곧 덫"인 아이러니를 넣어라.' },
      { name: '잘못된 신뢰(False Ally)', desc: '조력자가 배신자, 권위자가 흑막. "믿을 사람이 없다"는 편집증을 조성. 가장 가까운 자가 적.', tip: '배신자에게 미리 작은 단서(어긋난 말·시선·정보 누설)를 깔아라. 배신 전까지는 진짜 조력자처럼 기능하게 하라.' },
      { name: '단서의 이중 기능', desc: '같은 사실이 1회독에서는 무해, 재독에서는 결정적이 되도록 배치. 공정한 반전의 핵심 기술.', tip: '핵심 단서를 다른 사소한 정보들 사이에 묻어라 — 독자가 보고도 그 의미를 모르고 지나치게 만드는 것이 기술이다.' },
      { name: '카운트-인 정보 공개', desc: '독자에게 한 조각씩만 흘려 "거의 다 알 것 같은데 결정적 1조각이 없는" 상태를 길게 유지한다.', tip: '핵심 진실은 가능한 한 늦게, 그러나 복선은 충분히 일찍 — 한 번에 쏟지 말고 장면마다 한 조각씩 배급하라.' },
      { name: '콜드 오픈(cold open)', desc: '도입부에 충격적 장면(시체 발견·미래의 위기·폭력)을 먼저 던지고 본 이야기로 진입. 즉각적 후크.', tip: '미래의 위기 장면을 먼저 보여주고 "○○시간 전"으로 회귀하면 모든 평범한 장면에 카운트다운의 그림자가 깔린다.' },
      { name: '캣앤마우스(고양이와 쥐)', desc: '추적자와 표적이 서로의 수를 읽으며 주고받는 두뇌 게임. 가까워졌다 멀어지는 진동의 긴장.', tip: '양쪽이 번갈아 우위를 점하게 하라 — 한쪽이 일방적이면 긴장이 죽는다. 상대를 인정하는 "존중의 적대"가 묘미.' },
      { name: '스팅어(엔딩 한 방)', desc: '위협이 끝난 듯한 마지막 순간에 던지는 한 줄·한 장면의 역전. 다크/오픈 엔딩의 단골.', tip: '해소된 뒤 한 박자 쉬고 "그러나…"의 마지막 이미지를 던져라 — 빌런의 미소, 다시 울리는 전화, 사라진 증거.' },
    ],
  },
  {
    key: 'structure', label: '전개·페이싱', icon: '🧱', note: '3막 + 위협 점증 곡선. 분기점(개입 사건·중간점·올 이즈 로스트)을 챕터 마일스톤으로 배치한다.',
    items: [
      { name: '1막: 일상 + 개입 사건(~25%)', desc: '평범한 일상 → 개입 사건(Inciting Incident)으로 주인공이 위협에 끌려 들어간다. "되돌아갈 수 없는 선"을 1막 끝에.', tip: '일상은 짧게, 그러나 인물·약점·정상 상태를 각인시켜라 — 무너질 "정상"이 또렷해야 위협의 충격이 산다.' },
      { name: '포인트 오브 노 리턴', desc: '1막 끝의 결정적 선. 주인공이 더는 물러설 수 없게 되는 지점. 사건에 "참여"가 강제된다.', tip: '주인공이 스스로 선택해 발을 들이게 하라 — 휩쓸려 끌려가는 것보다 능동적 선택이 책임과 긴장을 만든다.' },
      { name: '2막 전반: 대응·조사(25~50%)', desc: '주인공이 대응·조사하고 적의 윤곽이 드러난다. 추격·은신·정보전이 시작되고 협력자/배신자가 등장.', tip: '매 시퀀스 "목표 → 장애 → 부분 해결 + 더 큰 새 위협"의 진동을 반복하라. 각 장면이 가치 상태(+/-)를 바꿔야 한다.' },
      { name: '중간점 대반전(50%)', desc: '큰 반전/판세 역전. 가짜 승리(곧 무너질) 또는 진짜 위협의 실체 노출. 『나를 찾아줘』식 화자 전복도 여기.', tip: '50% 지점에서 독자가 믿던 구도를 한 번 뒤집어라 — 반전 후 "이제부터 진짜"라는 새 국면으로 동력을 갱신하라.' },
      { name: '2막 후반: 적의 우위(50~75%)', desc: '적이 우위에 서고 조력자 상실, 신뢰 붕괴가 이어진다. 주인공이 점점 고립·소진된다.', tip: '같은 강도의 위협 반복은 지루하다 — 위험을 한 단씩 올려라(개인→가까운 이→다수, 또는 추상→구체).' },
      { name: '올 이즈 로스트(75%)', desc: '"모든 것을 잃은 순간." 최악의 패배·배신·상실로 주인공이 바닥을 친다. 희망이 꺼진 듯한 지점.', tip: '주인공에게서 가장 소중한 것을 빼앗아라 — 이 바닥의 깊이가 클라이맥스 반등의 높이를 결정한다.' },
      { name: '3막: 퍼즐 완성 → 대결(75~100%)', desc: '마지막 정보 퍼즐을 맞추고 적대자와 직접 대면한다. 복선 회수, 카운트다운 만료점과 일치하는 클라이맥스.', tip: '바닥에서 "남은 단서 한 조각"으로 반등시켜라 — 1막에 심은 체호프의 총이 여기서 터지게 하라.' },
      { name: '여진·스팅어(~100%)', desc: '대결 후 짧은 여운/후일담, 그리고 마지막 한 줄 반전(stinger) 옵션. 위협의 잔향을 남긴다.', tip: '완전히 닫지 말지 결정하라 — 다크/오픈 엔딩이면 해소 직후 "그러나…"의 마지막 이미지로 불안을 남겨라.' },
      { name: '위협 에스컬레이션 사다리', desc: '매 시퀀스 위험을 한 단 올린다(개인→가까운 이→다수, 또는 추상→구체). 같은 강도의 반복은 둔감을 부른다.', tip: '위협 목록을 강도 순으로 정렬해 두고 아껴 써라 — 가장 센 카드를 너무 일찍 쓰면 후반이 시들해진다.' },
      { name: '페이싱 리듬(완급)', desc: '고강도 액션·폭로 뒤에 짧은 호흡(숨 고르기·감정/정보 정리) → 다시 가속. 완급 없이 계속 빠르면 둔감해진다.', tip: '폭주 뒤엔 반드시 짧은 정적을 둬라 — 독자가 숨을 고르고 정보를 정리해야 다음 가속의 충격이 산다.' },
      { name: '시퀀스 단위 가치 전환', desc: '각 장면은 가치 상태(안전↔위험, 신뢰↔배신, 희망↔절망)를 반드시 바꿔야 한다. 정체된 장면은 잘라낸다.', tip: '장면 끝에 "처음과 무엇이 달라졌나"를 자문하라 — 아무것도 안 바뀌었으면 그 장면은 긴장을 죽이는 군더더기다.' },
      { name: '정보 지연 vs 폭로 균형', desc: '핵심 진실은 가능한 한 늦게(Slow Reveal), 그러나 복선은 충분히 일찍. 한 방에 쏟는 정보 덤프는 김을 뺀다.', tip: '독자가 "거의 다 알 것 같은데 1조각이 없는" 상태를 최대한 길게 끌어라 — 그 1조각이 클라이맥스의 열쇠다.' },
    ],
  },
  {
    key: 'climax', label: '클라이맥스 관습', icon: '🎯', note: '스릴러 절정의 형태들. "직접 대면", "티킹 클락 만료", "반전 회수", "거짓 결말"의 변주.',
    items: [
      { name: '직접 대면(능동적 해결)', desc: '주인공과 적대자의 물리적·심리적 정면 충돌. 우연·중간자가 아니라 주인공의 능동적 선택으로 해결되어야 만족도가 높다.', tip: '주인공이 스스로의 능력·각오로 끝내게 하라 — 경찰이 막판에 와서 해결하면 주인공의 여정이 무의미해진다.' },
      { name: '최악의 조건에서', desc: '주인공이 무장 해제·고립·부상·시간 부족 등 가장 불리한 상태에서 맞서게 설계. 약점이 시험받는 순간.', tip: '1막에 심은 약점·트라우마를 여기서 정면으로 건드려라 — 가장 불리할 때 가장 큰 도덕적 선택을 강요하라.' },
      { name: '티킹 클락 만료점 일치', desc: '카운트다운의 0초와 클라이맥스가 겹친다. 시한·클라이맥스·해결이 한 점에서 만나 압력이 최대가 된다.', tip: '"앞으로 60초"의 시계를 클라이맥스 내내 돌려라 — 초 단위로 끊으면 같은 행동도 훨씬 조마조마해진다.' },
      { name: '반전·복선의 회수', desc: '앞서 심은 체호프의 총·복선·진짜 정체가 이 지점에서 터진다. "그래서 그게 그거였구나"의 재배열.', tip: '회수할 단서를 미리 적어 두고 하나씩 터뜨려라 — 독자가 "아, 그때 그게!"를 외치게 만드는 것이 카타르시스다.' },
      { name: '거짓 결말·막판 부활', desc: '위협이 끝난 듯하다가 한 번 더 솟구치는 "마지막 한 방". 슬래셔·액션 스릴러의 단골(죽은 줄 알았던 빌런의 부활).', tip: '독자가 안도하는 순간 한 번 더 뒤집어라 — 단, 남발하면 식상하니 정말 끝난 듯한 "충분한 안도" 뒤에 한 번만.' },
      { name: '도덕적 대가의 청구', desc: '승리에 희생·상처가 따른다. 무손실 승리는 싱겁다. 이긴 자가 무언가(사람·신념·결백)를 잃는다.', tip: '클라이맥스에서 주인공에게 "둘 다는 못 구한다"의 선택을 강요하라 — 대가가 클수록 승리의 무게가 산다.' },
      { name: '다크/오픈 엔딩', desc: '르카레·플린류는 의도적으로 승리를 박탈하거나, 악이 이기거나, "끝나지 않은" 불안을 남긴다. 마지막 한 줄 반전이 흔한 관습.', tip: '"해결되었으나 무언가 잘못된" 여운을 남겨라 — 진범은 잡았는데 진실은 묻히고, 살았는데 변해 버린 주인공.' },
      { name: '빌런 자백의 함정 회피', desc: '빌런의 장황한 동기 설명(monologue) 중 주인공이 탈출/역전하는 클리셰의 변주. 정보 전달과 긴장의 줄다리기.', tip: '자백을 길게 늘이지 말고 행동 속에 녹여라 — 설명이 필요하면 짧게, 그 사이에도 시계는 돌아가게 하라.' },
    ],
  },
  {
    key: 'lexicon', label: '장르 용어·관용 표현', icon: '🔠', note: '시나리오·합평·기획서에서 통용되는 장르 용어와, 긴장을 만드는 감각·동작 어휘.',
    items: [
      { name: '티킹 클락 / 카운트다운', desc: '시한 장치. 폭탄 타이머처럼 명시적이거나 "밤이 오면" 같은 암묵적 마감으로 모든 장면에 압력을 건다.', tip: '기획 단계에서 "이 이야기의 시계는 무엇인가"를 한 줄로 정의하라 — 시계가 없으면 추진력이 약하다.' },
      { name: '레드 헤링 / 미스디렉션', desc: '레드 헤링=거짓 단서로 의심을 유도, 미스디렉션=시선을 다른 곳으로 돌리는 연출. 추리의 빗나감을 설계.', tip: '진짜 단서를 가짜 단서들 사이에 같은 무게로 묻어라 — 독자의 주의를 의도적으로 다른 곳에 붙들어 두는 것이 기술.' },
      { name: '맥거핀', desc: '모두가 쫓지만 내용 자체는 덜 중요한 추동 물건/정보(서류·코드·핵코드·USB). 욕망의 결절점.', tip: '맥거핀의 정체를 끝까지 안 밝혀도 된다 — 중요한 건 그것을 둘러싼 인물들의 행동과 배신이다.' },
      { name: '클리프행어 / 훅(hook)', desc: '클리프행어=벼랑 끝에서 끊기, 훅=다음을 펴게 만드는 갈고리. 장 끝·연재 회차 끝의 필수 장치.', tip: '연재라면 매 회차 끝을 더 강한 훅으로 — 결정 직전, 폭로 직전, 위협 직전에서 끊어라.' },
      { name: '언리라이어블 내레이터', desc: '신뢰할 수 없는 화자. 기억상실·거짓·정신질환·선택적 서술로 독자를 오도. 현대 도메스틱 스릴러의 표준.', tip: '화자의 왜곡을 작가는 정확히 통제하고, 재독 시 들통날 "균열의 단서"를 남겨라.' },
      { name: '트위스트 / 리빌(reveal)', desc: '트위스트=판도를 뒤집는 반전, 리빌=숨겨진 진실의 공개. 공정성(복선 회수)이 생명.', tip: '반전 후 독자가 앞으로 돌아가 확인했을 때 단서가 다 있어야 한다 — 없으면 "사기"라는 평을 받는다.' },
      { name: '콜드 오픈', desc: '본 이야기 전에 던지는 충격적 도입 장면(시체·미래 위기·폭력). 즉각적 몰입과 질문 유발.', tip: '콜드 오픈으로 "이게 어떻게 여기까지?"의 의문을 심고 본편에서 그 답을 향해 조여 가라.' },
      { name: '캣앤마우스', desc: '추적자와 표적의 두뇌 게임. 서로의 수를 읽으며 우위가 진동하는 긴장.', tip: '양쪽에 번갈아 우위를 줘라 — 일방적 추격은 긴장이 죽고, 호각의 두뇌전은 끝까지 조마조마하다.' },
      { name: '포인트 오브 노 리턴 / 올 이즈 로스트', desc: '되돌아갈 수 없는 선(1막 끝), 모든 것을 잃은 순간(75%). 구조의 핵심 분기 명칭.', tip: '두 지점을 챕터 마일스톤으로 먼저 정하고 그 사이를 위협 점증으로 채워라.' },
      { name: '스팅어 / 다크 엔딩', desc: '스팅어=마지막 한 방의 역전, 다크 엔딩=승리 박탈·불안 잔존. 여운형 결말의 용어.', tip: '닫을지 열어 둘지 톤에 맞춰 정하라 — 시리즈/속편을 염두에 두면 스팅어가 다음 편의 떡밥이 된다.' },
      { name: '"등줄기를 타고 흐르는" / "심장이 내려앉았다"', desc: '신체 반응으로 공포·긴장을 묘사하는 관용 표현. 청각·촉각 중심의 감각 어휘.', tip: '관용구를 그대로 쓰면 진부하다 — "목덜미가 서늘해졌다"를 구체적 감각(에어컨 바람? 누군가의 숨?)으로 비틀어라.' },
      { name: '"누군가 집에 있었다"', desc: '침입·감시의 단골 신호. 옮겨진 물건, 따뜻한 컵, 열린 문, 사라진 사진 등 "정상에서 벗어난 흔적".', tip: '큰 흔적보다 미세한 어긋남이 더 섬뜩하다 — 컵의 위치, 신발의 방향, 미묘하게 다른 냄새 한 줄로 침입을 암시하라.' },
      { name: '백미러 속 차 / 울리지 않는 전화', desc: '추격·고립의 시각·청각 클리셰. 따라오는 헤드라이트, 끊긴 통신, 갑자기 울리는(혹은 죽은) 전화기.', tip: '"미행"은 즉시 단정하지 말고 의심→확신→공포의 단계로 끌어라 — 같은 차가 세 번째 보일 때 독자도 확신하게.' },
      { name: '깜빡이는 형광등 / 잠긴 방', desc: '압박 공간의 분위기 어휘. 불안정한 조명, 닫히는 문, 들어갈 수 없거나 나올 수 없는 방(로크드 룸).', tip: '조명·소리·공간을 위협의 은유로 써라 — 꺼지는 불, 잠기는 문은 인물의 통제력 상실을 시각화한다.' },
    ],
  },
  {
    key: 'setting', label: '압박형 배경 프리셋', icon: '🏚️', note: '배경 자체가 압박 장치여야 한다. 폐쇄·고립·감시·탈출 불가가 긴장을 만든다.',
    items: [
      { name: '폭설 산장 / 외딴 섬', desc: '고전 압박 공간. 외부와 단절되어 도움도 탈출도 불가능. "로크드 룸"의 확장. 의심이 내부로 향한다.', tip: '탈출 불가의 물리적 근거(끊긴 다리·폭설·뱃길 두절)를 먼저 확립하라 — 그래야 "여기서 나갈 수 없다"가 설득된다.' },
      { name: '멈춘 엘리베이터·열차·비행기·잠수함', desc: '이동 수단 속 밀실. 좁은 공간, 한정된 인원, 빠져나갈 수 없는 시간. 폐소공포와 의심의 응축.', tip: '한정된 용의자·산소·시간을 자원으로 다뤄라 — 공간이 좁을수록 인물 간 긴장이 폭발한다.' },
      { name: '정전된 빌딩 / 폐쇄 병원', desc: '어둠·미로 같은 구조·작동 불능 시스템. 추격과 은신의 무대. 보안·의료 시스템의 역설적 무력화.', tip: '빛(손전등·비상등)을 자원으로 관리하라 — 보이는 범위가 곧 안전의 범위, 어둠이 위협의 영역이 된다.' },
      { name: '지하실 / 벙커 / 감금실', desc: '로크드 룸의 핵심. 갇힘·고립·탈출 시도. 도메스틱 스릴러의 납치·감금 무대. 빠져나갈 단 하나의 길.', tip: '감금 공간의 "규칙"(문·창·소리·감시)을 정밀하게 설정하라 — 탈출 계획의 모든 디테일이 그 규칙에서 나온다.' },
      { name: '교외 주택가 / 완벽한 결혼·이웃', desc: '도메스틱 스릴러의 무대. 완벽해 보이는 표면 아래의 균열. 학부모 모임·이웃 험담이 정보전이 된다.', tip: '겉의 완벽함을 공들여 묘사한 뒤 한 줄의 어긋남을 던져라 — 정상의 가면이 두꺼울수록 균열의 충격이 크다.' },
      { name: 'SNS·스마트홈·CCTV(현대 감시)', desc: '감시자본주의 결합 스릴러의 무대. 위치추적·해킹·딥페이크·열린 마이크. 사생활이 무기이자 약점.', tip: '기술을 양날로 써라 — 추적 도구가 동시에 추적당하는 통로가 된다. "끈 줄 알았던 카메라가 켜져 있었다".' },
      { name: '비 내리는 대도시 / 부패한 도시', desc: '느와르의 무대. 부패한 경찰·정치·기업, 뒷골목·항만·클럽. "믿을 사람이 없는" 회색 세계.', tip: '도시 자체를 적대자처럼 그려라 — 시스템이 주인공을 보호하지 않는 무력함이 고립의 긴장을 만든다.' },
      { name: '법정·로펌·구치소(리걸)', desc: '리걸 스릴러의 무대. 증거개시·배심·공판 일정. 절차가 곧 티킹 클락이자 미스디렉션의 장.', tip: '"공판 D-N"을 카운트다운으로 깔고, 증거 하나의 채택/배제로 판세를 진동시켜라.' },
      { name: '국경·공항·환승·안전가옥(스파이)', desc: '스파이 스릴러의 무대. 신분 위장, 미행, 접선, 기관 내부 권력 다툼. 어디서든 정체가 들통날 수 있다.', tip: '"누가 보고 있나"의 편집증을 공간에 깔아라 — 환승 5분, 위조 여권의 한 글자가 생사를 가른다.' },
      { name: '폭풍·정전·통신 두절(자연 고립)', desc: '재난·생존 스릴러의 압박. 자연이 외부 도움을 차단하고 자원을 고갈시킨다. 시간이 곧 적.', tip: '환경을 카운트다운으로 — 차오르는 물, 떨어지는 기온, 줄어드는 배터리가 인물을 막다른 선택으로 몬다.' },
      { name: '연구소·격리시설(테크노)', desc: '테크노·팬데믹 스릴러의 무대. 통제된 환경에서 위협(병원체·AI·실험체)이 탈주. 봉쇄 프로토콜의 시한.', tip: '위협의 확산 "메커니즘"과 봉쇄의 "규칙"을 명확히 하라 — 그 규칙을 깨거나 이용하는 것이 클라이맥스다.' },
    ],
  },
  {
    key: 'character', label: '인물·역할 유형', icon: '👤', note: '스릴러의 동력을 만드는 인물 배치. 유능하되 취약한 주인공과 만만찮은 적대자가 양축이다.',
    items: [
      { name: '유능하나 취약한 주인공', desc: '능력(수사력·전문성·집념)과 약점(트라우마·중독·신체·관계)을 함께 지닌다. 약점이 클라이맥스에서 시험받는다.', tip: '능력만큼 약점을 또렷이 설계하라 — 결과의 불확실성은 약점에서 나온다. 무적의 주인공은 긴장을 죽인다.' },
      { name: '한 수 위의 적대자', desc: '주인공보다 똑똑하고 한발 앞서는 빌런. 명확한 목표·논리·강점. "스릴러의 질은 빌런의 질에 비례한다".', tip: '빌런의 시점에서 그의 계획이 합당하게 보일 만큼 동기를 줘라 — 매번 주인공이 한발 늦게 따라잡게 설계하라.' },
      { name: '신뢰할 수 없는 화자/목격자', desc: '기억·정신·이해관계 때문에 진실을 왜곡하는 시점 인물. 독자를 오도하는 핵심 장치.', tip: '왜곡의 "동기"(자기보호·죄책감·정신상태)를 명확히 하고, 재독 시 균열이 보이게 단서를 남겨라.' },
      { name: '배신하는 조력자(False Ally)', desc: '믿었던 파트너·멘토·권위자가 흑막. "믿을 사람이 없다"의 편집증을 만든다.', tip: '배신 전까지 진짜 조력자처럼 기능하되, 어긋난 말·정보 누설의 작은 단서를 미리 깔아 공정성을 확보하라.' },
      { name: '시한부 피해자', desc: '구해야 할 대상. 인질·실종자·다음 표적. 티킹 클락에 얼굴을 부여해 추적의 동기를 인격화한다.', tip: '피해자를 추상적 "누군가"가 아니라 독자가 정 붙일 구체적 인물로 — 살려야 할 이유가 감정적이어야 긴장이 산다.' },
      { name: '소시오패스/연쇄범 빌런', desc: '논리적이되 공감 없는 가해자. 1인칭 시점이면 악의 평범함과 내적 논리를 추적. 클리셰화 주의.', tip: '"천재 사이코패스" 클리셰를 비틀어라 — 평범하고 지루한 일상을 사는 가해자가 더 섬뜩할 수 있다.' },
      { name: '내부고발자/정보원', desc: '진실의 열쇠를 쥔 위태로운 인물. 죽기 직전 단서를 흘리거나, 보호 대상이 되어 추격을 부른다.', tip: '"죽기 직전 단서를 흘리는 정보원" 클리셰는 비틀어라 — 정보가 불완전·오해의 소지가 있게 해 미스디렉션으로.' },
      { name: '회색의 수사관/추적자', desc: '규칙과 결과 사이에서 흔들리는 추적자. 트라우마·이혼·중독을 안은 형사형. 클리셰화 주의.', tip: '"알코올 중독 형사" 클리셰를 신선하게 하려면 약점이 사건과 유기적으로 얽히게 하라 — 장식이 아니라 약점이 되도록.' },
      { name: '평범한 휘말린 자(Everyman)', desc: '특별한 능력 없이 사건에 휘말린 보통 사람. 독자 이입이 쉽고, 무력감이 긴장을 만든다. 도주 스릴러의 주인공.', tip: '능력이 아니라 절박함·기지·끈기로 위기를 넘게 하라 — 보통 사람의 작은 영리함이 큰 카타르시스를 준다.' },
    ],
  },
  {
    key: 'pitfall', label: '흔한 함정·점검 경고', icon: '⚠️', note: '몰입을 깨고 "사기당했다"는 반응을 부르는 대표 오류들. 검증 체크리스트로 원고를 자가 점검하라.',
    items: [
      { name: '공정하지 않은 반전', desc: '복선 없이 갑툭튀하는 반전. 재독해도 단서가 없어 "작가가 숨겼다"가 아니라 "작가가 속였다"로 느껴진다.', tip: '반전의 단서를 1독엔 무해, 재독엔 결정적으로 미리 깔아라 — 정보를 숨기는 건 되지만 거짓말은 안 된다.' },
      { name: '데우스 엑스 마키나(편의적 해결)', desc: '갑자기 등장한 인물·능력·우연으로 위기를 해결. 클라이맥스의 비약은 카타르시스를 무너뜨린다.', tip: '해결에 쓸 도구·정보·능력은 반드시 1막에 심어 둬라(체호프의 총) — 클라이맥스에서 처음 나오면 김이 샌다.' },
      { name: '무적의 주인공', desc: '다치지도 속지도 실수하지도 않는 주인공. 결과가 뻔해 긴장이 죽는다. 빌런이 들러리로 전락.', tip: '주인공에게 명확한 약점·한계를 줘라 — 패배·부상·오판이 있어야 다음 위기의 결과가 불확실해진다.' },
      { name: '약한 빌런', desc: '멍청하거나 동기 없는 적대자. 주인공이 너무 쉽게 이긴다. "스릴러의 질은 빌런의 질에 비례한다".', tip: '빌런이 주인공보다 한발 앞서게 하라 — 빌런의 계획이 합당하게 보일 만큼 똑똑하고 동기가 분명해야 한다.' },
      { name: '시한(티킹 클락)의 부재', desc: '추진력 없는 늘어진 전개. 시계가 없으면 "왜 지금 서둘러야 하나"가 모호해 긴장이 빠진다.', tip: '명시적이든 암묵적이든 시계를 깔아라 — "언제까지 무엇을 막아야 하나"가 한 줄로 정의되어야 한다.' },
      { name: '늘어지는 중반(saggy middle)', desc: '2막에서 위협이 정체되고 같은 강도가 반복된다. 독자가 페이지를 덮는 지점.', tip: '매 시퀀스 위험을 한 단 올리고, 중간점에 큰 반전을 박아라 — 정체된 장면은 가치 전환이 없으면 잘라내라.' },
      { name: '정보 덤프(설명 과잉)', desc: '진실·배경을 한 번에 쏟아붓는 긴 설명. 특히 클라이맥스의 빌런 장황한 자백은 긴장을 죽인다.', tip: '정보는 장면마다 한 조각씩 배급하라 — 설명이 필요하면 행동·대화 속에 녹이고, 시계는 그동안에도 돌게 하라.' },
      { name: '우연의 남발(coincidence)', desc: '주인공을 곤경에 빠뜨리는 우연은 허용되나, 구해 주는 우연은 금물. 편의적 행운은 신뢰를 깬다.', tip: '"우연은 인물을 위기로 몰 때만, 탈출은 인물의 선택·능력으로." 이 원칙을 클라이맥스에서 특히 지켜라.' },
      { name: '레드 헤링 과잉/노골', desc: '거짓 단서가 너무 많거나 너무 뻔해 독자가 역으로 진범을 맞춘다. 미스디렉션의 실패.', tip: '거짓 단서에도 합당한 사연을 주고, 진짜 단서와 같은 무게로 배치하라 — "수상한 사람이 범인 아니다"가 들통나면 실패.' },
      { name: '클리셰 인물의 무비판 사용', desc: '천재 사이코패스, 알코올 형사, 막판 배신 파트너, 무력한 미녀 피해자(특히 지양)를 변주 없이 답습.', tip: '클리셰는 토대로만 쓰고 한 번씩 비틀어라 — 무력한 피해자를 능동적 생존자로, 막판 배신을 거짓 배신으로.' },
      { name: '톤의 불일치', desc: '르카레형 회색 스파이물에 만화적 액션이, 가벼운 추격물에 음울한 철학이 끼어들어 장르 약속이 흔들린다.', tip: '초반에 톤(현실적/오락적, 다크/밝음)을 약속하고 끝까지 지켜라 — 톤이 흔들리면 독자가 무엇을 기대할지 잃는다.' },
    ],
  },
  {
    key: 'cliche', label: '클리셰(전복 권장)', icon: '🔁', note: '쓰되 비틀어야 할 상투구들. 그대로 쓰면 식상, 한 번 꺾으면 신선해진다.',
    items: [
      { name: '시체 발견 콜드 오픈', desc: '도입부 시체 발견으로 시작하는 단골. 즉각적 후크지만 너무 흔해 변별력이 떨어진다.', tip: '시체가 아니라 "사라진 것"으로 열어라 — 비어 있는 침대, 켜진 채 버려진 차, 끓고 있는 주전자가 더 불길하다.' },
      { name: '"○○시간 전"으로 회귀', desc: '미래 위기 장면을 먼저 보여주고 과거로 돌아가는 구조. 강력하나 남용되어 예측 가능해졌다.', tip: '회귀 후 보여준 미래가 "그대로"가 아니게 비틀어라 — 독자가 본 그 장면이 실제론 다른 맥락이었음이 드러나게.' },
      { name: '범인은 가장 가까운 사람', desc: '배우자·파트너·친구가 범인인 도메스틱 반전. 너무 정석이라 독자가 먼저 의심한다.', tip: '가장 가까운 자를 의심하게 한 뒤 무죄로 풀고, 진짜는 "의심조차 안 한 자"로 — 이중 미스디렉션으로 꺾어라.' },
      { name: '빌런의 장황한 자백 중 탈출', desc: '클라이맥스에서 빌런이 동기를 설명하는 사이 주인공이 역전. 영화적 클리셰의 대표.', tip: '자백을 짧게 자르고 행동으로 옮겨라 — 설명이 필요하면 추격 중에, 시계가 돌아가는 동안 흘려라.' },
      { name: 'USB/비밀번호 한 방 해결', desc: '결정적 증거(USB·기밀문서)나 비밀번호 한 번으로 모든 게 풀리는 편의적 맥거핀.', tip: '증거를 손에 넣는 것이 끝이 아니라 시작이 되게 하라 — 그걸 지키고 전달하고 입증하는 과정에 더 큰 위기를.' },
      { name: '죽은 줄 알았던 빌런의 부활', desc: '슬래셔·액션의 막판 부활 한 방. 효과적이지만 남발되어 독자가 "또?"라고 느낀다.', tip: '"진짜로 끝난" 충분한 안도를 준 뒤 한 번만, 그리고 부활의 복선(시신 미확인·맥박 한 번)을 미리 깔아 공정하게.' },
      { name: '한 건만 더 하고 은퇴하는 베테랑', desc: '마지막 임무에서 일이 틀어지는 베테랑 클리셰. 죽음 플래그로 너무 잘 알려졌다.', tip: '"은퇴 직전"을 던졌으면 죽이지 말고 살려서 기대를 배신하거나, 은퇴의 이유 자체를 반전의 단서로 써라.' },
      { name: '무력한 미녀 피해자', desc: '구출만 기다리는 수동적 여성 피해자(지양 대상). 시대착오적이고 긴장의 동력도 약하다.', tip: '피해자를 능동적 생존자·공모자·반전의 주체로 만들어라 — 구해야 할 대상이 스스로 판을 뒤집을 때 신선하다.' },
      { name: '미행 = 백미러 속 같은 차', desc: '추격의 시각 클리셰. 따라오는 헤드라이트로 미행을 알리는 단골 연출.', tip: '시각이 아니라 다른 감각으로 — 똑같은 발소리의 리듬, 매번 같은 향수, SNS에 먼저 와 있는 댓글로 추적을 암시하라.' },
      { name: '죽기 직전 의미심장한 단서', desc: '정보원이 죽으며 수수께끼 같은 한마디를 남기는 클리셰. 편의적 정보 전달.', tip: '마지막 말을 명료한 단서가 아니라 "오해를 부르는 불완전한 정보"로 — 그 자체가 미스디렉션이 되게 비틀어라.' },
      { name: '"사실은 모든 게 꿈/환각"', desc: '심리 스릴러의 위험한 반전. 공정성이 없으면 독자가 배신감을 느끼는 최악의 마무리.', tip: '되도록 피하되 쓴다면 단서를 철저히 — 환각의 규칙을 일관되게 깔아 재독 시 "다 보였다"가 되어야 면죄된다.' },
    ],
  },
]

const LS = 'sry:tool:thriller-knowledge:'
const ALL_KEY = '__all__'
const flatAll = (): { cat: CatDef; item: Entry }[] =>
  CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (str: string) =>
  String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 관련 도구(스릴러·서스펜스 작법 연계)
const RELATED: { id: string; label: string }[] = [
  { id: 'plot-twist-deck', label: '🃏 반전 덱' },
  { id: 'conflict-builder', label: '⚔️ 갈등 설계기' },
  { id: 'tension-curve', label: '📈 긴장 곡선' },
  { id: 'scene-forge', label: '🎬 장면 생성기' },
  { id: 'sensory-palette', label: '👁️ 감각 팔레트' },
  { id: 'cliche-finder', label: '🗯️ 상투 표현 점검' },
]

export default function ThrillerKnowledge({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 활용: 다른 장르 컨텍스트로 열려도 스릴러·서스펜스 전용 사전임을 안내.
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
  // 언마운트 정리: 토스트/복사표시 상태 리셋
  useEffect(() => () => { setToast(null); setCopiedKey(null) }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  const key = (catKey: string, name: string) => `${catKey}::${name}`

  // "조합수": 무작위 소재 조합을 안내(서로 다른 카테고리에서 1개씩 뽑는 소재 패키지의 경우의 수).
  // 카테고리별 항목 수의 곱 — 장면 발상용 "소재 조합"이 얼마나 다양한지 보여 준다.
  const comboCount = useMemo(() => CATS.reduce((n, c) => n * BigInt(c.items.length), 1n), [])
  const comboText = useMemo(() => {
    const n = comboCount
    if (n >= 1000000000000n) return `${(Number(n) / 1e12).toFixed(1)}조 가지 이상`
    if (n >= 100000000n) return `${(Number(n) / 1e8).toFixed(1)}억 가지 이상`
    return `${n.toLocaleString()}가지`
  }, [comboCount])

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

  // 연계: 현재 항목을 글감 스니펫으로 공유 라이브러리에 저장(다른 도구에서 재사용).
  const saveSnippet = (c: CatDef, item: Entry) => {
    addToLibrary('snippets', {
      text: itemText(c, item),
      source: '스릴러·서스펜스 지식 사전 · ' + c.label,
      tags: ['스릴러·서스펜스', c.label],
    })
    setToast(`스니펫 라이브러리에 ‘${item.name}’을(를) 저장했습니다.`)
    window.setTimeout(() => setToast((t) => (t && t.includes(item.name) ? null : t)), 2200)
  }

  // 연계: 현재(무작위 또는 펼친) 항목을 프로젝트 자료 〈스릴러 지식〉 폴더에 메모로 추가.
  const addItemToProject = (c: CatDef, item: Entry) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(c.icon + ' ' + c.label)} · ${escapeHtml(item.name)}</b></p>`,
      `<p>${escapeHtml(item.desc)}</p>`,
      item.tip ? `<p><b>💡 활용</b><br>${escapeHtml(item.tip)}</p>` : '',
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '스릴러 지식',
      title: `${item.name} (${c.label})`, bodyHtml,
      meta: { 장르: '스릴러·서스펜스', 분류: c.label },
    })
    if (id) {
      setToast(`프로젝트 자료 〈스릴러 지식〉에 ‘${item.name}’을(를) 추가했습니다.`)
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
        스릴러·서스펜스 장르에서 자주 쓰는 소재·서사 장치·압박형 배경·장르 용어·고증 함정 <b>{total}개</b>를 <b>{CATS.length}개</b> 카테고리로 모았습니다.
        검색·펼침·무작위로 찾고, 마음에 드는 항목을 긴장 장면에 심어 보세요.
        카테고리별로 1개씩 뽑는 <b>소재 조합</b>은 <b>{comboText}</b>입니다.
        {ctxGenre && ctxGenre !== '스릴러·서스펜스' && (
          <span style={{ color: 'var(--accent)' }}> (현재 ‘{ctxGenre}’ 컨텍스트 — 이 사전은 스릴러·서스펜스 전용입니다)</span>
        )}
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름·설명·활용으로 검색 (예: 티킹 클락, 레드 헤링, 맥거핀, 반전, 도메스틱, 콜드 오픈, 데우스)"
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
            <button className="minibtn" onClick={() => saveSnippet(random.cat, random.item)} title="이 항목을 글감 스니펫으로 저장"><Emoji e="💾" /> 글감 저장</button>
          </div>
          {/* 연계: 프로젝트에 추가 */}
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => addItemToProject(random.cat, random.item)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 소재를 프로젝트 자료 〈스릴러 지식〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
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
                      <button className="minibtn" onClick={() => saveSnippet(c, item)} title="이 항목을 글감 스니펫으로 저장"><Emoji e="💾" /> 글감 저장</button>
                      <button className="linkbtn" onClick={() => addItemToProject(c, item)} disabled={!hasProjectBridge()}
                        title={hasProjectBridge() ? '이 소재를 프로젝트 자료 〈스릴러 지식〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
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
          <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: '스릴러·서스펜스' })} title={`${r.label} 열기`}>
            {emojify(r.label)}
          </button>
        ))}
      </div>

      <div style={hint}>지식은 정답이 아니라 출발점입니다. 장치는 장면 단위로, 클리셰는 전복 포인트로, 함정은 점검 체크리스트로 삼아 위협과 시한을 인물·장면에 슬쩍 심어 보세요.</div>
    </div>
  )
}
