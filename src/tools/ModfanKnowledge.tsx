// 현대판타지·회귀 — 장르 지식·소재 사전.
//  이 장르에서 자주 쓰는 소재·설정·고증 지식을 카테고리로 풍부하게 모은 로컬 사전(도시에 근거).
//  카테고리 펼침 + 검색 + 무작위 + 클릭 복사 + 즐겨찾기 + 프로젝트/라이브러리 연계.
//  자급식: 외부 네트워크·라이브러리 없음. react 와 './linkbus' 만 import. localStorage 영속.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'modfan-knowledge',
  name: '현판 회귀 소재 사전',
  icon: '⏳',
  group: '지식 사전',
  genre: '현대판타지·회귀',
  intro: '현대판타지·회귀에서 자주 쓰는 소재·설정·고증 지식을 카테고리로 펼쳐 보고 검색·무작위·복사',
  w: 620,
  h: 660,
}

interface Entry {
  name: string       // 소재/용어/설정 이름
  desc: string       // 의미·쓰임·고증 설명 (장르 특화·구체)
  tip?: string       // 집필 팁/주의(함정)·활용 한 줄
}
interface CatDef { key: string; label: string; icon: string; note: string; items: Entry[] }

// ─────────────────────────────────────────────────────────────────────────────
// 장르 지식 사전 — 도시에(현대판타지·회귀) 근거. 12개 카테고리, 항목 다수.
// 일반론 금지: 전부 "현판+회귀" 특화의 구체적 소재·고증·관습.
// ─────────────────────────────────────────────────────────────────────────────
const CATS: CatDef[] = [
  {
    key: 'core', label: '핵심 장치·개념', icon: '🌀',
    note: '회귀물의 엔진을 이루는 근간 개념. 작동 원리를 정해두면 전개가 흔들리지 않는다.',
    items: [
      { name: '회귀(回歸)', desc: '주인공이 죽거나 절망적 결말 뒤, 기억을 가진 채 본인의 과거 시점으로 의식이 되돌아가는 장치. 환생(타인으로 다시 태어남)·빙의(타인의 몸)와 달리 "본인이 본인의 과거로" 돌아간다.', tip: '1화 안에 "회귀했다 + 첫 미래지식 행사"를 반드시 보여줘야 계약 위반이 아니다.' },
      { name: '메타지식(미래 정보)', desc: '장르의 핵심 엔진. 정보 비대칭 = 무기. 거시 이벤트(주가·코인·재해·게이트 출현일), 인물 정보(배신자·떡잎 천재·약점), 콘텐츠 메타(어떤 노래·웹툰·게임이 대박날지)로 나뉜다.', tip: '회귀해놓고 정보를 안 쓰면 독자와의 약속 위반. 종류별로 "언제 어떻게 쓸지" 목록화하라.' },
      { name: '회귀 트리거', desc: '시간 역행을 촉발하는 죽음의 순간(배신·자살·전사·병사·사고). 강렬한 후회·각오와 함께 묘사해 "두 번째 기회"의 무게를 각인한다.', tip: '트리거의 감정(한·복수심·후회)이 곧 1막 전체의 동력. 밋밋하면 추진력이 약하다.' },
      { name: '회귀 시점 정합성', desc: '"왜 하필 그 시점인가". 중요한 분기 직전(가족의 사망 전, 폭락 전, 게이트 발생 전)이라야 미래지식이 빛난다. 무의미한 시점은 동력이 약하다.', tip: '회귀 시점은 "되돌리고 싶은 가장 큰 후회"와 "미래지식을 쓸 첫 무대"가 겹치는 날로.' },
      { name: '나비효과(분기 변동)', desc: '주인공의 개입으로 원래 미래가 바뀌기 시작. 중반 이후 "내가 아는 미래가 더는 안 통한다"는 메타지식 무효화 위기로 전환된다.', tip: '치트 무효화는 긴장 회복의 정석. 너무 빨리 풀지 말고 2막 후반~3막에 배치.' },
      { name: '두 개의 타임라인', desc: '①전생에 실제 벌어진 "원래 미래" ②개입으로 변해가는 "새 미래". 작가가 둘을 분리 관리해야 모순이 안 생긴다.', tip: '원래 미래표를 따로 두고, 개입할 때마다 새 미래로 갈라지는 분기를 기록하라.' },
      { name: '선점(先占) 모티프', desc: '저평가 자산·인재·기술·부동산·종목·아이템을 남보다 먼저 확보. "쟤가 미래의 대스타/대박 종목"임을 알고 미리 잡는다.', tip: '선점은 쾌감이 크지만 "왜 너만 알아?"의 의심 관리가 필수.' },
      { name: '지식 누설 긴장', desc: '주인공이 미래를 안다는 걸 들킬 위험. "어떻게 알았지?"라는 주변 의심을 예지력·천재성·우연·정보망으로 위장해 관리한다.', tip: '들킬 뻔한 순간을 떡밥으로 굴리면 긴장감과 인물 매력을 동시에 챙긴다.' },
      { name: '회귀자 인식 장치', desc: '다른 회귀자·예지자·시스템이 "너도 회귀자냐"를 감지 → 회귀자 간 정보전. 후반 빌런 설계에 자주 사용되는 고급 장치.', tip: '"나만 미래를 안다"가 깨지는 순간이 최대의 위기이자 반전 포인트.' },
      { name: '체크리스트형 목표', desc: '"이번엔 ①가족 살리기 ②그놈 응징 ③이 종목 매수…" 회귀 직후 할 일 목록이 챕터 단위 추진력을 만든다.', tip: '리스트를 한 번에 다 풀지 말고 단기·장기로 분산해 동력을 길게 가져가라.' },
      { name: "'전생의 나' 대비 구조", desc: '과거의 무능·실패한 자아 vs 현재의 각성한 자아. 같은 상황을 다르게 처리하며 성장을 입증한다.', tip: '같은 사건을 전생/현생 두 번 보여주는 "다시 쓰기"가 가장 통쾌하다.' },
      { name: '두 번 사는 자의 정서', desc: '이미 죽은 가족·친구를 다시 만나는 회한, 못 지킨 것을 지키려는 동기. 액션 쾌감과 별개로 작동하는 감정선 축.', tip: '사이다만 있으면 얄팍해진다. 회한·재회의 정서가 캐릭터에 깊이를 준다.' },
      { name: '중생(重生)', desc: '중국 망문에서 회귀를 가리키는 말. 도시현대문(都市) 중생물 = 한국 현판 회귀와 거의 동형(연예·재벌·도시 능력자).', tip: '용어를 작품 톤에 맞춰 "회귀/중생/리턴" 중 하나로 통일하라.' },
      { name: '루프(타임루프)', desc: '같은 기간을 반복하며 죽음마다 되감기는 회귀의 변종(일본 Re:제로형). 한 시점 고정 회귀와 달리 "반복 학습"이 핵심.', tip: '루프형은 "정보 축적"이 쾌감원. 매 회차 새로 알게 된 정보를 가시화하라.' },
    ],
  },
  {
    key: 'opening', label: '오프닝·후킹 공식', icon: '🎬',
    note: '1~5화의 생사를 가르는 후킹. 회귀물은 답답함이 더 치명적이므로 초반 사이다가 절대적.',
    items: [
      { name: '회귀 자각 첫 문장', desc: '"다시 눈을 떴다." "익숙한 천장이다."류 클리셰적 첫 문장. 독자가 즉시 "회귀했구나"를 알아채게 하는 신호.', tip: '클리셰지만 효과적. 변주하더라도 "회귀 신호"는 1~3문장 안에 확실히 줘라.' },
      { name: '젊어진 몸 자각', desc: '거울·창문·휴대폰을 보며 젊어진/과거의 몸과 날짜를 확인하는 장면. 회귀 사실을 시각적으로 못 박는다.', tip: '날짜·기기·유행으로 "몇 년도 며칠인지"를 구체적으로 박아 리얼리티를 준다.' },
      { name: '가족 생존 울컥', desc: '아직 살아있는 부모·동생을 보고 울컥 → 강력한 동기 부여. 액션 이전에 감정의 닻을 내린다.', tip: '"이번엔 반드시 지킨다"는 결의로 자연스럽게 첫 목표를 세팅하라.' },
      { name: '1화 첫 사이다', desc: '회귀+첫 미래지식 행사+작은 승리를 1화(또는 프롤로그+1~2화)에 압축. 현대 웹소설 1화 후킹 절대 규칙.', tip: '큰 성공이 아니어도 된다. "이미 답을 아는 자"의 작은 통쾌함이면 충분.' },
      { name: '즉시 돈/정보 확보', desc: '첫 행동으로 로또·종목·경매·면접·코인 등에서 즉시 종잣돈이나 핵심 정보를 잡는다.', tip: '첫 자본은 작게. 너무 큰돈을 한 번에 벌면 이후 동력(성장 곡선)이 죽는다.' },
      { name: '회귀 트리거 플래시백', desc: '프롤로그에서 죽음·배신의 순간을 짧고 강렬하게 보여준 뒤 회귀로 컷. 복수의 동기를 선명히 한다.', tip: '플래시백은 짧게. 길어지면 "고구마"로 느껴져 1화 이탈을 부른다.' },
      { name: "'그래, 이 날이었지'", desc: '회귀 후 날짜를 확인하고 미래 사건을 떠올리는 독백. 메타지식의 존재를 자연스럽게 노출한다.', tip: '독백으로 미래 사건을 예고하면 그 자체가 거대 떡밥이 된다.' },
      { name: '체크리스트 선언', desc: '회귀 직후 "이번 생에 할 일"을 정리하는 독백/메모. 독자에게 앞으로의 로드맵을 깔아준다.', tip: '①가족 ②복수 ③재산 ④인재 영입처럼 갈래를 나눠 장기 기대감을 형성.' },
    ],
  },
  {
    key: 'hunter', label: '헌터·게이트 세계관', icon: '⚔️',
    note: '현판+헌터 혼합형의 뼈대. 평범한 현대 + 게이트가 공존하는 "각성 이후의 현대".',
    items: [
      { name: '각성', desc: '평범한 인간이 마나·스탯·스킬을 다루는 헌터로 깨어나는 현상. 회귀물에선 "전생엔 늦게 각성/미각성했으나 이번엔 빠르게 각성"이 단골.', tip: '각성 시점·등급을 전생보다 앞당겨 격차를 만드는 게 핵심 사이다.' },
      { name: '게이트(차원문)', desc: '현대 도시 곳곳에 열리는 던전 입구. 방치하면 마수가 쏟아지는 브레이크가 일어난다. 출현일·위치·등급을 아는 것이 미래지식의 정수.', tip: '"○월 ○일 ○○역 게이트"를 예고해 두고 회수하면 강력한 setup-payoff.' },
      { name: '던전·레이드', desc: '게이트 내부 공간. 보스·기믹·보상이 있고, 다수가 모여 공략하는 것을 레이드라 한다.', tip: '전생에 누가 어디서 죽었는지 알고 그 죽음을 막거나 보상을 가로채는 전개가 통쾌하다.' },
      { name: '등급(S급·EX급)', desc: '헌터·게이트·아이템의 강함을 F~S, 그 위 EX/SSS로 표기. 가시적 수치 성장의 핵심 지표.', tip: '등급은 자주 갱신해 진척감을 줘야 한다. "측정기 오류?"식 저평가 클리셰도 단골.' },
      { name: '시스템 창(상태창)', desc: '본인에게만 보이는 스탯·스킬·퀘스트 UI. 회귀+시스템 결합 시 "회귀 보상으로 특수 시스템을 받았다"가 흔하다.', tip: '시스템의 규칙(레벨업 조건·제약)을 초반에 못 박아야 후반 치트 논란을 피한다.' },
      { name: '스탯·스킬', desc: '근력·민첩·마력·감지 등 능력치와, 액티브/패시브 스킬. 성장의 단위이자 전투 설계의 언어.', tip: '전생에 못 익힌 상위 스킬을 미리 확보하는 "스킬 선점"이 헌터 회귀의 묘미.' },
      { name: '헌터협회', desc: '각성자 관리·등급 측정·게이트 통제를 맡는 공적 기관. 권력·관료주의·부패가 갈등의 무대.', tip: '협회의 부패한 인물을 전생 정보로 단죄하는 청산극이 자주 쓰인다.' },
      { name: '길드', desc: '헌터들의 조직(기업형). 가입·창설·세력 다툼이 2막 세력화의 핵심 무대.', tip: '전생에 망한 길드를 미리 사들이거나, 명문 길드의 흥망을 알고 움직이는 전개.' },
      { name: '마수·몬스터', desc: '게이트에서 나오는 적. 약점·드랍·서식 패턴이 공략 정보. 전생 지식으로 약점을 선점한다.', tip: '"이 마수의 약점은 ○○"를 미리 아는 우위를 매 레이드의 작은 사이다로.' },
      { name: '마정석·드랍 아이템', desc: '마수에게서 나오는 에너지 결정·장비. 헌터 경제의 화폐이자 성장 자원.', tip: '미래에 값이 폭등할 마정석/아이템을 저점에 쟁여 자본을 굴리는 경제+헌터 융합.' },
      { name: '플레이어·전직', desc: '시스템이 부여하는 직업(클래스) 개념. 게임판타지 어휘를 현대 헌터물에 차용.', tip: '전생에 잘못 고른 전직을 이번엔 최적 빌드로 바꾸는 "리롤" 쾌감.' },
      { name: '히든 클래스·각성 스킬', desc: '극소수만 얻는 숨겨진 직업/스킬. 전생 정보로 획득 조건을 알고 선점한다.', tip: '획득 조건을 떡밥으로 깔고 한참 뒤 회수하면 장기 기대감이 커진다.' },
      { name: '스탯 측정기', desc: '각성 등급·능력치를 재는 협회 장비. "측정 불가/측정기 고장"으로 비범함을 연출하는 클리셰.', tip: '저평가→반전 패턴은 식상할 수 있으니 한 번만, 임팩트 있게.' },
      { name: '던전 브레이크', desc: '방치된 게이트가 폭주해 마수가 현실로 쏟아지는 대재앙. 거시 미래 사건으로 자주 예고된다.', tip: '대형 브레이크 날짜를 1막에 예고→3막에 회수하는 장대한 떡밥으로.' },
    ],
  },
  {
    key: 'economy', label: '경제·재벌·주식', icon: '💰',
    note: '미래지식형 성공 서사의 본류. 현실 시장 규칙을 정확히 그려야 우위가 빛난다.',
    items: [
      { name: '종잣돈', desc: '회귀 후 첫 사업·투자를 굴릴 초기 자본. 로또·소액 종목·중고 거래·아르바이트로 마련하는 게 정석.', tip: '종잣돈은 작게 시작. 단번에 거부가 되면 성장 서사가 사라진다.' },
      { name: '저점 매수·떡상', desc: '미래에 폭등할 종목/코인을 바닥에서 사 모으는 행위. "떡상" 직전 매집이 핵심 쾌감.', tip: '실명 기업은 변형·가공(유사 사명)해 법적 함정을 피하라.' },
      { name: 'IPO·상장', desc: '비상장 기업이 증시에 상장하는 사건. 미래에 대박 날 회사의 초기 투자/공모주 선점에 활용.', tip: '"이 회사가 몇 년 뒤 상장해 대박"이라는 장기 떡밥으로 설계.' },
      { name: '인수합병(M&A)', desc: '기업을 사들이거나 합치는 거래. 2막 세력 확장의 무기. 적대적 인수로 원수 기업을 집어삼키는 청산극.', tip: '전생에 나를 망친 기업을 이번엔 거꾸로 인수하는 "체급 역전"의 정점.' },
      { name: '재벌가 권력 다툼', desc: '대기업 오너 일가의 후계·지분 경쟁. 회귀 막내/서자가 미래지식으로 후계 구도를 뒤집는 재벌물 단골.', tip: '"재벌집 막내아들"형. 가족 내 멸시→역전의 통쾌함이 동력.' },
      { name: '부동산 선점', desc: '미래에 개발·폭등할 토지·건물을 저가에 매입. 재개발·역세권·신도시 정보가 무기.', tip: '실제 지명 대신 가공 지명으로. "○○ 재개발 발표일"을 떡밥으로.' },
      { name: '경제 위기 예측', desc: '폭락·환란·버블 붕괴 같은 거시 사건을 미리 알고 공매도·현금화·헐값 매집으로 대응.', tip: '위기를 "기회"로 전환하는 장면은 회귀 경제물 최대의 사이다 중 하나.' },
      { name: '벤처·스타트업 투자', desc: '아직 무명인 미래의 유니콘 기업에 초기 투자. 인재(창업자)까지 선점하면 시너지.', tip: '돈만 대지 말고 미래 거물 창업자와 인연을 맺어 인맥 자산으로.' },
      { name: '특허·기술 선점', desc: '미래에 표준이 될 기술·아이디어를 먼저 특허·개발. 지식 자체를 자본으로 전환.', tip: '"내가 만든 게 아닌데 어떻게?"의 개연성(연구팀·인수)을 미리 깔아라.' },
      { name: '환율·원자재', desc: '환율·금·유가 등 거시 변수의 미래 흐름을 알고 베팅. 경제물의 디테일 경쟁 영역.', tip: '용어·절차의 정확성이 곧 리얼리티. 어설프면 우위가 안 빛난다.' },
      { name: '공매도·레버리지', desc: '하락에 베팅하거나 빚을 내 수익을 키우는 고위험 기법. 미래를 아는 자에겐 저위험 고수익.', tip: '"아는 자에겐 도박이 아니라 계산"이라는 독백으로 우위를 강조.' },
      { name: '비자금·차명', desc: '재벌·정치 권력의 숨은 돈. 전생 정보로 그 존재·약점을 알고 협상·단죄의 카드로 쓴다.', tip: '비리 정보는 강력한 협상 카드이자 후반 청산의 증거가 된다.' },
    ],
  },
  {
    key: 'entertainment', label: '연예·아이돌·콘텐츠', icon: '🎤',
    note: '연예계+회귀의 거대 클러스터. "망한 연예인이 데뷔 직전으로 회귀"가 대표 흐름.',
    items: [
      { name: '데뷔조·연습생', desc: '데뷔를 앞둔 후보군과 훈련생. 회귀자가 데뷔조 경쟁·서바이벌을 미래지식으로 돌파한다.', tip: '"데뷔 못 하면 죽는 병"류. 데뷔 직전 회귀가 가장 흔한 시점.' },
      { name: '음원 차트 올킬·역주행', desc: '발매곡이 차트 1위를 휩쓸거나(올킬), 뒤늦게 다시 차트인하는 역주행. 성공의 가시적 지표.', tip: '차트 순위·스밍·음방 1위를 수치로 보여줘 진척감을 만든다.' },
      { name: '명곡 선점', desc: '미래에 대박 날 노래·작곡가·트렌드를 미리 알고 본인이 선점·발표. 콘텐츠 메타지식의 정수.', tip: '실곡 표절이 아니라 "트렌드·작법 감각"으로 변형해야 법적·윤리적 안전.' },
      { name: '기획사·소속사', desc: '연예인을 발굴·관리하는 회사. 회귀자가 망할 기획사를 피하거나 명가를 미리 점지·창설한다.', tip: '대표·이사진의 미래 비리를 알고 협상하거나 직접 차리는 전개.' },
      { name: '오디션·서바이벌', desc: '경연 프로그램으로 데뷔/생존을 다투는 무대. 미래 결과·심사평·편집을 아는 우위.', tip: '"악마의 편집"을 미리 알고 역이용하는 장면이 통쾌하다.' },
      { name: '미래 스타 포섭', desc: '아직 무명인 미래의 톱스타·아이돌·배우를 알아보고 미리 영입·인연을 맺는다.', tip: '경제물의 "인재 선점"과 동형. 사람을 자산으로 보는 시선.' },
      { name: '스캔들·루머 관리', desc: '연예계의 흥망을 가르는 폭로·열애설·논란. 미래에 터질 사건을 알고 막거나 역이용.', tip: '전생에 나를 매장한 루머를 거꾸로 차단·반격하는 복수극.' },
      { name: '팬덤·화력', desc: '팬 커뮤니티의 결집력. 투표·스밍·굿즈로 가시화되는 현대 연예 권력.', tip: '팬덤 형성 과정을 단계적 수치(구독·조회·팬카페 인원)로 보여줘라.' },
      { name: '웹툰·웹소설·게임 IP', desc: '미래에 대박 날 콘텐츠 IP를 알고 제작·판권 선점. 작가물/제작자물의 핵심.', tip: '"내가 본 그 작품"을 본인이 만들거나 판권을 잡는 메타 구조.' },
      { name: '음방·콘서트·투어', desc: '음악방송 1위, 콘서트 매진, 월드투어 등 커리어 정점의 무대. 성공의 정서적 보상.', tip: '"전생엔 못 선 무대"에 이번엔 서는 장면이 감정의 클라이맥스.' },
      { name: '저작권·정산', desc: '음원·콘텐츠 수익 배분 구조. 불공정 계약·노예계약이 갈등 소재.', tip: '전생에 당한 불공정 계약을 이번엔 간파·거부하는 통쾌함.' },
      { name: '바이럴·알고리즘', desc: '영상·숏폼이 추천 알고리즘을 타고 퍼지는 현대 흥행 메커니즘. 미래 트렌드 선점 무대.', tip: '플랫폼·알고리즘의 작동을 정확히 그려야 우위가 설득력을 얻는다.' },
    ],
  },
  {
    key: 'profession', label: '직업 특화(전문성)', icon: '🧑‍💼',
    note: '3세대 분화의 핵심. "전문성+미래지식" 디테일 경쟁. 업계 절차·용어가 곧 리얼리티.',
    items: [
      { name: '의사·의료', desc: '천재 외과의·응급의 회귀물. 미래 의술·증례·약물 정보로 못 살린 환자를 살린다.', tip: '시술 절차·용어의 정확성이 생명. 어설프면 전문성 우위가 무너진다.' },
      { name: '요리·셰프', desc: '미슐랭 셰프·요리 서바이벌 회귀. 미래 레시피·트렌드·평가를 알고 정상에 오른다.', tip: '맛 묘사와 조리 과정의 구체성이 몰입의 핵심.' },
      { name: '작가·웹소설', desc: '망한 작가가 회귀해 미래 히트작·트렌드를 알고 집필. 메타가 강한 자기참조 장르.', tip: '"내가 읽은 그 작품"을 쓰는 구조. 표절 아닌 변형·재창작으로.' },
      { name: '교사·교수·강사', desc: '미래 교육 트렌드·입시 정보·인재를 알고 떡잎을 키우는 육성물.', tip: '제자(미래 거물)를 키우는 보람과 인맥 자산의 결합.' },
      { name: '변호사·검사·판사', desc: '법조 회귀물. 미래 판례·사건 진실·증거를 알고 정의를 바로잡거나 권력과 싸운다.', tip: '실제 법 절차·용어 고증이 강할수록 사이다가 묵직해진다.' },
      { name: '프로게이머·e스포츠', desc: '망한/은퇴 프로가 데뷔 직전으로 회귀. 미래 메타·패치·전략을 알고 정상에 선다.', tip: '게임 메타의 변천을 아는 것이 곧 실력 우위. 경기 묘사의 박진감이 관건.' },
      { name: '스포츠 선수·감독', desc: '축구·야구·농구 등. 부상·이적·경기 결과를 알고 커리어를 다시 쓴다.', tip: '"이 경기에서 다친다"를 알고 피하는 디테일이 몰입을 만든다.' },
      { name: '기획자·PD·제작자', desc: '방송·영화·게임 제작 회귀물. 어떤 기획이 대박날지 알고 콘텐츠 제국을 세운다.', tip: '제작 현장의 절차·직군 용어를 정확히 그려야 한다.' },
      { name: '구단주·단장', desc: '스포츠 구단 경영 회귀. 미래 유망주·드래프트·이적시장을 알고 명문 구단을 만든다.', tip: '선수 영입·재정·전술의 경영 시뮬레이션 감각.' },
      { name: '엔지니어·개발자', desc: 'IT·테크 회귀물. 미래 기술 스택·제품·시장을 알고 유니콘을 창업한다.', tip: '기술 트렌드의 흐름을 정확히 알아야 "선견지명"이 설득된다.' },
      { name: '고시·공무원·관료', desc: '시험·인사·정책 정보를 알고 권력의 길을 오르는 입신물.', tip: '시험 출제 경향·인사 라인을 아는 우위. 관료 사회 묘사의 디테일.' },
      { name: '형사·수사관', desc: '미해결 사건·범인을 알고 미리 막거나 검거하는 수사 회귀물.', tip: '"전생에 못 잡은 그놈"을 이번엔 잡는 추격의 카타르시스.' },
      { name: '군인·용병', desc: '전장·작전·동료의 죽음을 알고 다시 싸우는 밀리터리 회귀물.', tip: '못 지킨 전우를 이번엔 지키는 정서 + 작전 디테일.' },
    ],
  },
  {
    key: 'pacing', label: '전개·페이싱·구조', icon: '📈',
    note: '연재 호흡의 법칙. 한 화 1쾌감, 사이다 누적, 수치 성장의 주기적 갱신.',
    items: [
      { name: '3막 골격(웹소설형)', desc: '1막 각성·정착(~30화) / 2막 확장·세력화(~30~150화) / 3막 정점·청산(후반). 회귀물 표준 골격.', tip: '각 막의 끝에 "체급이 올라갔다"는 가시적 도약을 배치하라.' },
      { name: '에피소드 사이클', desc: '[목표 제시→미래지식/실력 발동→방해·위기→통쾌한 해결→보상 수치화→다음 떡밥]을 3~10화 단위로 반복.', tip: '이 사이클이 깨지면 연재 호흡이 무너진다. 매 묶음 보상을 수치로.' },
      { name: '한 화 1쾌감', desc: '매 화 작은 승리·정보·떡밥 중 하나 이상을 반드시 담는다. 고구마는 짧게, 사이다는 누적되게.', tip: '회귀물은 답답함이 더 치명적. "이미 답을 아는데 왜 못 풀어?"가 금물.' },
      { name: '수치 성장 갱신', desc: '재산·랭킹·레벨·구독·직급·소속을 주기적으로 보고해 진척감을 유지한다.', tip: '"통장 잔고/랭킹/레벨"을 정기적으로 보여주면 독자가 성장에 중독된다.' },
      { name: '원거리/단기 떡밥 병렬', desc: '회귀 직후 거대 미래 사건(원거리 떡밥)을 예고 + 단기 회수 떡밥을 병렬로 굴려 동력을 길게.', tip: '장기 떡밥 하나에만 의존하면 중반이 늘어진다. 단기 떡밥으로 텐션 유지.' },
      { name: '한 화 분량·연재', desc: '한 화 약 5,000자 안팎, 매일 연재. 매 화 끝에 다음화 클릭 유발 훅을 둔다.', tip: '화 끝 훅 = 반전·도발·결정의 순간. "그런데 그 순간—"식 절단.' },
      { name: '계단식 사이다', desc: '작은 승리→중간 승리→대형 청산의 계단으로 보상을 키운다. 통쾌함을 누적·증폭.', tip: '초반에 큰 복수를 다 써버리면 후반이 김빠진다. 큰 청산은 아껴라.' },
      { name: '메타지식 무효화 전환', desc: '중반 이후 "아는 미래가 안 통한다"로 긴장을 회복. 치트의 점진적 무력화.', tip: '무효화는 캐릭터가 "스스로 쌓은 실력"으로 넘어서는 성장의 무대.' },
      { name: '복수 분할 배치', desc: '초반 통쾌함(소소한 응징)과 후반 대형 청산(근원 빌런)을 분리 배치한다.', tip: '매 구간 작은 응징으로 갈증을 풀되, 최종 청산은 끝까지 끌어라.' },
      { name: '회차 절단(클리프행어)', desc: '화 끝에서 결정적 순간을 끊어 다음화를 유도. 결제·구독 전환의 기술.', tip: '매번 같은 패턴이면 닳는다. 절단의 종류(반전/위기/도발)를 섞어라.' },
    ],
  },
  {
    key: 'climax', label: '클라이맥스·결말', icon: '🏆',
    note: '장르의 도덕: 치트만으로 끝내지 않는다. 두 인생의 합으로 이긴다.',
    items: [
      { name: '메타지식 붕괴 후 자력 승리', desc: '최종 국면에 미래지식 이점이 사라지거나 적도 회귀자/예지자 → 회귀 후 스스로 쌓은 실력·동료·기반으로 이긴다.', tip: '"치트로 시작해 실력으로 끝낸다"가 장르의 핵심 도덕이자 카타르시스.' },
      { name: '전생 청산의 완결', desc: '1막에서 못 갚은 큰 빚(나를 죽인/배신한 근원 빌런, 망친 조직)을 최종장에서 압도적으로 청산.', tip: '청산은 압도적이되 졸렬하지 않게. 빌런에게도 최소한의 논리를 줘라.' },
      { name: '두 인생의 합', desc: '전생의 한 + 현생의 성취가 한 점에 모이는 정서적 정점. 못 지킨 사람을 이번엔 지킨다.', tip: '액션의 정점과 감정의 정점을 같은 장면에 겹치면 폭발력이 커진다.' },
      { name: '체급 역전 시각화', desc: '한때 자신을 짓밟던 거대 존재를 이제는 내려다보는 위치 역전을 장면으로 보여준다.', tip: '말이 아닌 "구도"로 보여줘라. 누가 누구를 올려다보는가.' },
      { name: '회귀자 빌런 대결', desc: '또 다른 회귀자/예지자가 최종 빌런으로 등장 → 정보전·미래 쟁탈전의 정점.', tip: '"둘 다 미래를 안다"면 승부는 결국 의지·인맥·응용력으로 갈린다.' },
      { name: '성취·안정 엔딩', desc: '안정된 일상·가족·제국 완성·후일담. "두 번째 인생은 행복했다"류 정서적 마침표.', tip: '현판 회귀는 비극보다 성취·안정 엔딩을 선호. 못 지킨 것을 지킨 결말로.' },
      { name: '에필로그·후일담', desc: '본편 이후의 평온한 일상·다음 세대·잔여 떡밥 정리. 독자에게 충분한 보상을 준다.', tip: '주요 인물의 "그 후"를 짧게 비춰 정서적 여운을 남겨라.' },
      { name: '근원 진실 공개', desc: '"왜 회귀했는가/회귀의 정체"를 최종장에 밝혀 세계관을 닫는다(선택적 고급 마무리).', tip: '회귀 원리를 끝까지 미스터리로 둘지, 공개할지 초반에 정해두면 모순이 없다.' },
    ],
  },
  {
    key: 'phrase', label: '특수 어휘·대사 패턴', icon: '🗨️',
    note: '장르 톤을 만드는 빈출 표현. 내적 독백 비중이 큰 게 특징(미래지식 해설을 독백으로).',
    items: [
      { name: '다시 눈을 떴다.', desc: '회귀 자각의 클리셰적 첫 문장. 독자에게 즉시 회귀 신호를 준다.', tip: '도입에 한 번. 남발하면 진부해진다.' },
      { name: '익숙한 천장이다.', desc: '과거의 방·풍경을 보며 회귀를 실감하는 정형 문장.', tip: '"익숙한 ○○이다"로 변주 가능.' },
      { name: '이번엔 다르다.', desc: '각오·결의를 압축한 핵심 캐치프레이즈. 전생 대비 구조의 선언.', tip: '결정적 장면마다 반복 변주하면 캐릭터의 시그니처가 된다.' },
      { name: '같은 실수는 반복하지 않는다.', desc: '전생의 후회를 동력으로 삼는 다짐. 1막 동기 부여의 단골 대사.', tip: '실제로 그 실수를 "다르게 처리"하는 장면과 짝지어라.' },
      { name: '나는 미래를 알고 있다.', desc: '메타지식 우위를 직접 천명하는 독백. 우위감의 핵심 선언.', tip: '말로만 끝내지 말고 곧바로 정보를 행사해 증명하라.' },
      { name: '그래, 이 날이었지.', desc: '날짜·사건을 떠올리며 다가올 미래를 환기하는 독백.', tip: '뒤이어 미래 사건을 예고하면 그대로 떡밥이 된다.' },
      { name: '아직 ○○가 일어나기 전이군.', desc: '거시 미래 사건(폭락·게이트·재해) 발생 전임을 확인하는 표현.', tip: '"전이군"으로 setup, 나중에 발생으로 payoff.' },
      { name: '전생의 나라면 몰랐겠지만.', desc: '전생/현생 자아 대비를 드러내는 독백. 성장 입증의 어법.', tip: '구체적 "그때의 무지"와 짝지어야 대비가 산다.' },
      { name: '전부 기억하고 있다.', desc: '"이 종목, 이 사람, 이 날짜… 전부 기억하고 있다."류 정보 장악의 독백.', tip: '나열형 독백은 메타지식의 범위를 독자에게 각인시키는 효과.' },
      { name: '넌 왜 이렇게 변했어?', desc: '주변인이 달라진 주인공을 의심하는 대사. 지식 누설 긴장을 만든다.', tip: '둘러대는 대응(천재성·우연·각성)을 캐릭터답게 설계하라.' },
      { name: '두 번째 인생/세컨드 라이프', desc: '회귀 후의 삶을 가리키는 호칭. 정서적 무게를 담는 어휘.', tip: '제목·부제·핵심 독백에 쓰면 장르 정체성을 못 박는다.' },
      { name: '재능을 숨긴다/실력을 감춘다', desc: '비범함을 일부러 감췄다가 나중에 폭발시키는 빈출 클리셰의 어휘.', tip: '"왜 감추는가"의 동기가 명확해야 답답하지 않다.' },
    ],
  },
  {
    key: 'cliche', label: '빈출 클리셰·관습', icon: '♻️',
    note: '독자가 기대하는 관습. 어기면 이탈하지만, 살짝 비틀면 신선해진다.',
    items: [
      { name: '회귀 직후 거울 확인', desc: '거울·창문을 보며 젊어진 몸을 자각하는 장면. 회귀의 시각적 확정.', tip: '식상하다면 "사진/SNS/뉴스 날짜"로 변주해 같은 효과를.' },
      { name: '가족 생존에 울컥', desc: '죽었던 가족이 살아있음에 감정이 북받쳐 동기를 얻는다.', tip: '감정 과잉은 금물. 짧고 묵직하게.' },
      { name: '첫 행동=돈/정보', desc: '회귀하자마자 로또·종목·경매·면접으로 즉시 자원을 확보.', tip: '첫 자본은 작게. 단번에 거부가 되면 성장이 사라진다.' },
      { name: '원수의 초반 우위', desc: '전생의 원수가 초반엔 우위에 있다가 서서히 역전된다.', tip: '역전의 계단을 촘촘히 깔아 매 구간 응징의 쾌감을.' },
      { name: '재능 은폐→폭발', desc: '실력을 감췄다가 결정적 순간에 폭발시킨다.', tip: '폭발 시점과 보는 이의 충격(리액션)을 공들여 연출.' },
      { name: '미래 거물 미리 포섭', desc: '아직 무명인 미래의 거물(스타·창업자·천재)을 알아보고 미리 잡는다.', tip: '"왜 저 무명에게?"라는 주변 의아함이 곧 선견지명의 증거.' },
      { name: '저평가→측정 불가 반전', desc: '저평가받던 주인공이 측정 불가·등급 초과로 비범함을 드러낸다(헌터물).', tip: '한 번만, 임팩트 있게. 반복하면 닳는다.' },
      { name: '둘러대기(의심 회피)', desc: '"어떻게 알았어?"에 천재성·우연·정보망으로 둘러대 지식 누설을 막는다.', tip: '둘러대는 방식이 캐릭터의 매력 포인트가 될 수 있다.' },
      { name: '전생 동료 재회', desc: '전생에 함께했거나 잃은 동료를 다시 만나 관계를 새로 맺는다.', tip: '"이번엔 잃지 않는다"는 동기로 감정선을 강화.' },
      { name: '리셋된 인맥 재구축', desc: '회귀로 끊긴 인맥을 미래 정보로 더 빠르게·유리하게 다시 쌓는다.', tip: '전생의 신뢰를 이번엔 "한발 앞선 호의"로 선점하는 묘미.' },
      { name: '회귀 동기화(기시감)', desc: '주변에 데자뷔를 느끼게 하거나, 주인공이 기시감으로 긴장하는 연출.', tip: '"이 장면 본 적 있다"는 긴장이 미래지식 누설의 위험 신호로.' },
    ],
  },
  {
    key: 'world', label: '배경·세계관 설정', icon: '🏙️',
    note: '도시적·동시대적·실리적 분위기. "현실 위 한 스푼의 비현실".',
    items: [
      { name: '시간 좌표의 명시성', desc: '"20○○년 ○월"처럼 구체 연도가 중요. 미래지식 디테일(실제 트렌드·사건 모사)이 리얼리티의 핵심.', tip: '실명·실제기업은 변형·가공해 법적 함정을 피하라.' },
      { name: '현실 시스템=무대', desc: '주식시장·연예계·스포츠리그·대기업·고시·창업 생태계 등 현실 규칙을 정확히 그려야 우위가 빛난다.', tip: '직업군별 사실 디테일(업계 용어·절차·성공 경로)을 자료로 받쳐라.' },
      { name: '이중 세계(헌터 혼합)', desc: '평범한 현대 일상 + 게이트/던전이 공존하는 "각성 이후의 현대". 시스템·등급·협회·길드가 뼈대.', tip: '일상과 비일상의 경계(언제부터 게이트가 열렸나)를 초반에 정립.' },
      { name: '세력 지도', desc: '가문·기업·길드·기획사·구단 등 권력 블록과 그 흥망 타임라인. 미래지식이 작동할 무대표.', tip: '세력별 "전생의 흥망 연표"를 만들어 개입 포인트를 시각화하라.' },
      { name: '흥망 타임라인', desc: '어떤 기업·인물·세력이 언제 뜨고 지는지의 연표. 미래지식의 적용 지점 지도.', tip: '두 타임라인(원래/새 미래)을 나란히 관리해야 모순이 없다.' },
      { name: '동시대 트렌드 모사', desc: '실제 유행·기술·문화의 흐름을 가공해 깔아 "그 시절감"과 미래 예측의 설득력을 만든다.', tip: '디테일이 곧 리얼리티. 단, 실명은 유사명·가상명으로 치환.' },
      { name: '도시적 분위기', desc: '마법적 고풍보다 실리적·현대적 톤. 빌딩·증시·SNS·스튜디오·게이트가 공존하는 풍경.', tip: '"현실 위 한 스푼의 비현실"의 균형을 잃지 마라.' },
      { name: '글로벌 무대 확장', desc: '국내에서 시작해 해외 시장·국제 협회·월드투어·글로벌 게이트로 스케일을 키운다.', tip: '2~3막의 체급 확장 신호. 무대가 넓어질수록 적도 커진다.' },
      { name: '법·제도의 회색지대', desc: '각성·게이트·신기술을 둘러싼 미비한 법·제도. 회귀자가 빈틈을 합법적으로 선점.', tip: '"아직 규제가 없는 시기"를 선점의 무대로 활용하는 묘미.' },
      { name: '실명 회피·가공', desc: '실제 기업·인물·작품을 유사명·가상명으로 변형해 법적·윤리적 안전을 확보.', tip: '리얼함은 유지하되 식별 가능성은 지운다. 장르의 기본 위생.' },
    ],
  },
  {
    key: 'pitfall', label: '흔한 함정·주의', icon: '⚠️',
    note: '작법상 자주 빠지는 실수. 미리 알면 피할 수 있다.',
    items: [
      { name: '미래지식 방치', desc: '회귀해놓고 정보를 안 쓰거나 늦게 쓰는 것. 장르 최대의 계약 위반.', tip: '1화부터 작게라도 즉시 행사. "아껴두는" 연출은 답답함만 준다.' },
      { name: '치트 과잉(긴장 소멸)', desc: '미래를 다 알아 위기가 없으면 긴장이 죽는다. 무적의 함정.', tip: '나비효과·메타지식 무효화·회귀자 빌런으로 주기적 위기를 심어라.' },
      { name: '타임라인 모순', desc: '개입으로 미래가 바뀌었는데도 옛 미래지식이 그대로 통하는 설정 오류.', tip: '두 타임라인을 분리 관리. 바뀐 지점 이후엔 지식이 무력화돼야 일관적.' },
      { name: '한 방에 거부 되기', desc: '첫 화에 너무 큰돈·권력을 얻어 이후 성장 곡선이 사라지는 실수.', tip: '자본·등급은 작게 시작해 계단식으로. 진척감이 곧 중독성.' },
      { name: '복수 조기 소진', desc: '초반에 근원 빌런까지 다 응징해 후반 청산의 동력이 없어지는 것.', tip: '소소한 응징은 자주, 근원 청산은 끝까지 아껴라.' },
      { name: '지식 누설 무관리', desc: '주인공이 미래를 어떻게 아는지에 대한 주변 의심을 방치해 개연성이 무너지는 것.', tip: '천재성·정보망·예지 등 위장 논리를 일관되게 깔아라.' },
      { name: '고구마 과다', desc: '답답한 전개가 길어지는 것. 회귀물은 "이미 답을 아는데 왜?"라 더 치명적.', tip: '고구마는 짧게, 곧바로 사이다로 회수. 화 단위로 갈증을 풀어라.' },
      { name: '회귀 시점 무의미', desc: '되돌아간 시점이 서사적으로 의미 없어 동력이 약한 것.', tip: '시점은 "최대 후회 + 미래지식 첫 무대"가 겹치는 분기 직전으로.' },
      { name: '미회수 떡밥', desc: '예고한 미래 사건(재해·게이트·인물 흥망)을 회수하지 않아 약속을 어기는 것.', tip: '예고했으면 반드시 회수. 떡밥 장부를 만들어 추적하라.' },
      { name: '전문성 고증 부실', desc: '직업 특화물에서 절차·용어가 어설퍼 미래지식 우위가 안 빛나는 것.', tip: '업계 디테일을 자료로 받쳐라. 리얼리티가 곧 사이다의 무게.' },
      { name: '감정선 부재', desc: '사이다·성공만 있고 회한·재회·동기의 정서가 없어 얄팍해지는 것.', tip: '"두 번 사는 자"의 감정선을 액션과 별개 축으로 굴려라.' },
      { name: '실명 무단 사용', desc: '실제 기업·인물·작품을 그대로 써 법적·윤리적 위험을 안는 것.', tip: '유사명·가상명으로 변형. 장르의 기본 위생 수칙.' },
    ],
  },
]

// 조합수: 카테고리 × 항목 + 무작위 묶음 조합으로 충분히 크게 표시(사전류 특성상 항목 곱으로 산정).
const LS = 'sry:tool:modfan-knowledge:'
const ALL_KEY = '__all__'
const FAV_ONLY = '__fav__'
const escapeHtml = (str: string) =>
  String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

type Flat = { cat: CatDef; item: Entry }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))
const TOTAL = CATS.reduce((n, c) => n + c.items.length, 0)
const CAT_COUNT = CATS.length
// 항목 곱 기반 "지식 조합수"(무작위 5개 묶음 기준): C(TOTAL,5) 근사로 1조 이상 보장 산정.
const combos = (() => {
  const n = TOTAL, k = 5
  let v = 1
  for (let i = 0; i < k; i++) v = (v * (n - i)) / (i + 1)
  return Math.floor(v)
})()

export default function ModfanKnowledge({ payload }: { payload?: Record<string, unknown> }) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || raw === FAV_ONLY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 펼침 상태: 카테고리 key → 열림 여부 (browse 영역)
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'open')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o }
    } catch { /* ignore */ }
    return { [CATS[0].key]: true }
  })
  // 즐겨찾기: "catKey::name"
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o }
    } catch { /* ignore */ }
    return {}
  })
  const [random, setRandom] = useState<Flat | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  // payload.genre / payload.q 활용 — 연계로 열렸을 때 검색어 프리필
  useEffect(() => {
    const q = payload && typeof payload.q === 'string' ? (payload.q as string) : ''
    if (q) setQuery(q)
  }, [payload])

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'open', JSON.stringify(open)) } catch { /* ignore */ } }, [open])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  // 언마운트 정리
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }, [])

  const flash = useCallback((msg: string, ms = 1800) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), ms)
  }, [])

  const favKey = (catKey: string, name: string) => `${catKey}::${name}`

  const ql = query.trim().toLowerCase()

  // 검색·필터 적용된 카테고리 트리(펼쳐보기용)
  const tree = useMemo(() => {
    return CATS
      .filter((c) => cat === ALL_KEY || cat === FAV_ONLY || c.key === cat)
      .map((c) => {
        let items = c.items
        if (cat === FAV_ONLY) items = items.filter((it) => favs[favKey(c.key, it.name)])
        if (ql) items = items.filter((it) =>
          it.name.toLowerCase().includes(ql) ||
          it.desc.toLowerCase().includes(ql) ||
          (it.tip ? it.tip.toLowerCase().includes(ql) : false))
        return { cat: c, items }
      })
      .filter((g) => g.items.length || (!ql && cat !== FAV_ONLY && g.cat.label.toLowerCase().includes(ql)))
  }, [cat, ql, favs])

  const shownCount = useMemo(() => tree.reduce((n, g) => n + g.items.length, 0), [tree])

  const rollRandom = useCallback(() => {
    const pool = cat === FAV_ONLY
      ? flatAll().filter((f) => favs[favKey(f.cat.key, f.item.name)])
      : cat === ALL_KEY ? flatAll() : flatAll().filter((f) => f.cat.key === cat)
    if (!pool.length) { setRandom(null); flash('무작위로 뽑을 항목이 없습니다.'); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.name === prev.item.name && pick.cat.key === prev.cat.key)
        pick = pool[Math.floor(Math.random() * pool.length)]
      return pick
    })
  }, [cat, favs, flash])

  const toggleFav = (catKey: string, name: string) => {
    const k = favKey(catKey, name)
    setFavs((prev) => { const next = { ...prev }; if (next[k]) delete next[k]; else next[k] = true; return next })
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    const done = () => { setCopiedKey(id); window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1400) }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
    else fallbackCopy(text, done)
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { flash('복사 실패 — 직접 선택하세요') }
  }

  const entryText = (f: Flat) => {
    let t = `${f.cat.icon} ${f.cat.label} · ${f.item.name}\n${f.item.desc}`
    if (f.item.tip) t += `\n[집필 팁] ${f.item.tip}`
    return t
  }

  // 라이브러리 스니펫으로 저장(우클릭/버튼)
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: entryText(f),
      source: '현판 회귀 소재 사전 · ' + f.cat.label,
      tags: ['현대판타지·회귀', f.cat.label, f.item.name],
    })
    flash('스니펫 저장: ' + f.item.name)
  }

  // 단일 항목을 프로젝트 자료 〈현판 회귀 소재〉 폴더에 메모로 추가
  const addEntryToProject = (f: Flat) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(f.cat.icon + ' ' + f.cat.label)} · ${escapeHtml(f.item.name)}</b></p>`,
      `<p>${escapeHtml(f.item.desc)}</p>`,
      f.item.tip ? `<p><b>집필 팁</b> — ${escapeHtml(f.item.tip)}</p>` : '',
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '현판 회귀 소재',
      title: `${f.item.name} (${f.cat.label})`, bodyHtml,
      meta: { 장르: '현대판타지·회귀', 분류: f.cat.label },
    })
    if (id) flash(`프로젝트 자료 〈현판 회귀 소재〉에 ‘${f.item.name}’ 추가됨`)
  }

  // 현재 보이는 항목 묶음을 한 문서로 프로젝트에 추가
  const addVisibleToProject = () => {
    if (!hasProjectBridge() || !shownCount) return
    const where = cat === FAV_ONLY ? '즐겨찾기' : (ql ? `“${query.trim()}” 검색` : (cat === ALL_KEY ? '전체' : (CATS.find((c) => c.key === cat)?.label ?? '')))
    const bodyHtml =
      `<p>현대판타지·회귀 소재 ${shownCount}개 묶음 (${escapeHtml(where)}).</p>` +
      tree.map((g) =>
        `<p><b>${escapeHtml(g.cat.icon + ' ' + g.cat.label)}</b></p>` +
        g.items.map((it) =>
          `<p>• <b>${escapeHtml(it.name)}</b> — ${escapeHtml(it.desc)}${it.tip ? ` <i>(팁: ${escapeHtml(it.tip)})</i>` : ''}</p>`).join('')
      ).join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '현판 회귀 소재',
      title: `현판 회귀 소재 모음 — ${where} ${shownCount}개`, bodyHtml,
      meta: { 장르: '현대판타지·회귀' },
    })
    if (id) flash(`프로젝트 자료 〈현판 회귀 소재〉에 ${shownCount}개 묶음 추가됨`, 2400)
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 9, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px' }
  const chip = (on: boolean): React.CSSProperties => ({ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' })

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>현대판타지·회귀</b> 집필용 소재·설정·고증 사전 — <b>{CAT_COUNT}</b>개 분야, 총 <b>{TOTAL}</b>개 항목.
        펼쳐 보거나 검색·무작위로 찾고, 클릭해 복사하세요. (지식 조합수 약 <b>{combos.toLocaleString()}</b>가지 묶음)
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="소재·용어·설명으로 검색 (예: 메타지식, 게이트, 떡상, 청산)"
        className="field"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY} style={chip(cat === ALL_KEY)}><Emoji e="✨"/> 전체</button>
        {CATS.map((c) => (
          <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={cat === c.key} style={chip(cat === c.key)}><Emoji e={c.icon}/> {c.label}</button>
        ))}
        <button className="minibtn" onClick={() => setCat(FAV_ONLY)} aria-pressed={cat === FAV_ONLY} style={chip(cat === FAV_ONLY)}>★ 즐겨찾기</button>
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom}><Emoji e="🎲"/> 무작위 소재</button>
        <button className="minibtn" onClick={() => setOpen(Object.fromEntries(CATS.map((c) => [c.key, true])))}>▾ 모두 펼침</button>
        <button className="minibtn" onClick={() => setOpen({})}>▸ 모두 접기</button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{shownCount}개 표시</span>
      </div>

      {/* 무작위 결과 카드 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '11px 13px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon}/> {random.cat.label}</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{random.item.name}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0' }}>{random.item.desc}</div>
          {random.item.tip && <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--accent)' }}><Emoji e="💡"/> {random.item.tip}</div>}
          <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(entryText(random), 'rand')}>{copiedKey === 'rand' ? '✓ 복사됨' : <><Emoji e="📋"/> 복사</>}</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>{favs[favKey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}</button>
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="📎"/> 스니펫 저장</button>
            <button className="minibtn" onClick={rollRandom}><Emoji e="🎲"/> 다시</button>
            <button className="linkbtn" onClick={() => addEntryToProject(random)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '이 소재를 프로젝트 자료에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '7px 10px', fontSize: 12, lineHeight: 1.5 }}>✓ {toast}</div>
      )}

      {/* 펼쳐보기 트리 */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7, paddingRight: 2 }}>
        {tree.length === 0 && (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '26px 12px' }}>
            {cat === FAV_ONLY ? '★ 아직 즐겨찾기한 소재가 없습니다. 항목의 별을 눌러 모아 보세요.' : `“${query}” 결과가 없습니다.`}
          </div>
        )}
        {tree.map((g) => {
          const isOpen = !!open[g.cat.key] || !!ql || cat === FAV_ONLY || (cat !== ALL_KEY && cat !== FAV_ONLY)
          return (
            <div key={g.cat.key} style={{ border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden' }}>
              <button
                onClick={() => setOpen((o) => ({ ...o, [g.cat.key]: !isOpen }))}
                style={{ width: '100%', textAlign: 'left', padding: '8px 10px', background: 'var(--panel)', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span><Emoji e={g.cat.icon}/> {g.cat.label}</span>
                <span style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 400 }}>({g.items.length})</span>
                <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>{isOpen ? '▾' : '▸'}</span>
              </button>
              {isOpen && (
                <div style={{ padding: '4px 10px 10px' }}>
                  <div style={{ ...hint, marginBottom: 6 }}>{g.cat.note}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {g.items.map((it) => {
                      const fk = favKey(g.cat.key, it.name)
                      const isFav = !!favs[fk]
                      const cid = 'i:' + fk
                      return (
                        <div key={fk} style={card}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                            <span style={{ fontSize: 14.5, fontWeight: 700 }}>{it.name}</span>
                            <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(g.cat.key, it.name)} style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>{isFav ? '★' : '☆'}</button>
                          </div>
                          <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 4 }}>{it.desc}</div>
                          {it.tip && <div style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--accent)', marginTop: 4 }}><Emoji e="💡"/> {it.tip}</div>}
                          <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
                            <button className="minibtn" onClick={() => copy(entryText({ cat: g.cat, item: it }), cid)}>{copiedKey === cid ? '✓ 복사됨' : <><Emoji e="📋"/> 복사</>}</button>
                            <button className="minibtn" onClick={() => saveSnippet({ cat: g.cat, item: it })}><Emoji e="📎"/> 스니펫</button>
                            <button className="linkbtn" onClick={() => addEntryToProject({ cat: g.cat, item: it })} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '이 소재를 프로젝트 자료에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 하단: 연계 + 묶음 추가 */}
      <div className="linkbar" style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
        <button className="minibtn" onClick={() => openToolLinked('writing-dictionary')} title="만능 단어·표현 사전 열기"><Emoji e="📚"/> 단어 사전</button>
        <button className="minibtn" onClick={() => openToolLinked('character-sheet')} title="인물 시트 열기"><Emoji e="🪪"/> 인물 시트</button>
        <button className="minibtn" onClick={() => openToolLinked('plot-pyramid')} title="플롯 피라미드 열기"><Emoji e="📐"/> 플롯</button>
        <button
          className="linkbtn"
          onClick={addVisibleToProject}
          disabled={!hasProjectBridge() || shownCount === 0}
          style={{ marginLeft: 'auto' }}
          title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : shownCount === 0 ? '추가할 항목이 없습니다' : `현재 보이는 ${shownCount}개를 프로젝트 자료 〈현판 회귀 소재〉에 묶음 추가`}
        >
          <Emoji e="📄"/> 보이는 {shownCount}개 프로젝트에 추가
        </button>
      </div>
    </div>
  )
}
