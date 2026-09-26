// 현대판타지·회귀 특수 어휘·표현 사전 — 이 장르 특유의 단어·관용표현·말투·상투구·전문용어를
//   8개 카테고리(회귀·시간 어휘 / 메타지식·정보전 / 헌터·각성 / 경제·재벌 / 연예·콘텐츠 /
//   회귀 자각 첫 문장·상투구 / 회귀자 독백·말투 / 빈출 클리셰·전복)로 모은 로컬 사전.
//   현대판타지·회귀 도시에(§4 서사 장치, §7 특수 어휘·표현·클리셰, §8 세계관 요소)에 근거한 자작 데이터.
//   카테고리 펼침·검색·무작위·클릭복사 + 스니펫 저장 + 프로젝트 메모 추가 + 관련 도구 연계.
//   자급식: 외부 네트워크·라이브러리 없음. react + './linkbus' 만 import. localStorage 영속.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'modfan-lexicon', name: '현판·회귀 어휘·표현 사전', icon: '⏳', group: '어휘·표현', genre: '현대판타지·회귀', intro: '회귀·메타지식·헌터·재벌·연예 어휘와 회귀물 상투구·말투를 찾아 클릭 복사·스니펫 저장', w: 680, h: 640 }

interface Term { word: string; read?: string; gloss: string; use?: string }
interface CatDef { key: string; label: string; icon: string; desc: string; items: Term[] }

// 현대판타지·회귀 도시에에 근거. 일반론이 아니라 이 장르에 구체적·특화된 항목만 수록.
const CATS: CatDef[] = [
  {
    key: 'regress', label: '회귀·시간 어휘', icon: '⏳', desc: '회귀·전생·나비효과 등 시간 역행 장치를 부르는 핵심어 (도시에 §4·§7)',
    items: [
      { word: '회귀', read: '回歸', gloss: '죽거나 절망적 결말을 맞은 뒤 인생의 특정 과거 시점으로 의식·기억을 가진 채 돌아가는 것. 본인이 본인의 과거로 돌아가는 형태로, 환생·빙의와 구별되는 이 장르의 엔진.', use: '“다시 눈을 떴을 때, 나는 십 년 전으로 회귀해 있었다.”' },
      { word: '회귀자', read: '回歸者', gloss: '회귀를 겪어 미래를 아는 자. 정보 비대칭이 곧 무기이며, 후반부엔 다른 회귀자와의 정보전이 벌어진다.', use: '“회귀자는 단 하나의 무기를 쥐고 있다 — 이미 본 미래.”' },
      { word: '전생', read: '前生', gloss: '회귀하기 전, 주인공이 실제로 살았던 첫 번째 인생. 후회·배신·죽음이 회귀 트리거로 작동한다.', use: '“전생의 나라면 여기서 또 속았겠지. 하지만 이번엔 안다.”' },
      { word: '현생', read: '現生', gloss: '회귀 후 다시 사는 두 번째 인생. 전생의 한과 현생의 성취가 한 점에 모이는 것이 정서적 정점.', use: '“현생의 나는, 전생의 내가 못 지킨 것을 반드시 지킨다.”' },
      { word: '두 번째 인생', gloss: '회귀로 얻은 ‘다시 사는 기회’를 가리키는 정서적 표현. ‘세컨드 라이프’로도 쓴다.', use: '“두 번째 인생이다. 같은 실수는 반복하지 않는다.”' },
      { word: '중생', read: '重生', gloss: '중국 망문(网文)식 회귀 표기. 도시현대문 중생물은 한국 현판 회귀와 거의 동형(연예·재벌·도시 능력자).', use: '“중생이라 불리든 회귀라 불리든, 결국 다시 사는 자의 이야기다.”' },
      { word: '나비효과', gloss: '주인공의 개입으로 ‘아는 미래’가 어긋나기 시작하는 변동. 중반 이후 메타지식 무효화의 동력.', use: '“내가 손을 댄 그 순간부터, 미래는 더 이상 내가 아는 미래가 아니었다.”' },
      { word: '분기점', read: '分岐點', gloss: '미래가 갈라지는 결정적 시점. ‘왜 하필 그 시점으로 회귀했는가’가 서사적으로 의미를 가져야 한다.', use: '“하필 이 날로 돌아온 이유가 있다. 모든 게 여기서 갈렸으니까.”' },
      { word: '원래 미래', gloss: '전생에서 실제로 벌어진, 주인공이 기억하는 타임라인. ‘새 미래’와 분리해 관리해야 모순이 없다.', use: '“원래 미래대로라면, 저 회사는 삼 년 뒤 상장한다.”' },
      { word: '새 미래', gloss: '주인공의 개입으로 바뀌어 가는 타임라인. 아는 정보가 통하지 않는 위기의 무대.', use: '“새 미래에선 그가 죽지 않았다. 그게 문제였다.”' },
      { word: '선지자', read: '先知者', gloss: '미래를 아는 자. 회귀를 들키지 않으려 ‘예지력·천재성·우연’으로 위장할 때 쓰는 가면.', use: '“사람들은 그를 선지자라 불렀다. 회귀자라는 진실은 아무도 몰랐다.”' },
      { word: '루프', read: 'Loop', gloss: '일본계 차용. 같은 기간을 반복 회귀하며 갱신하는 타임루프형. (Re:제로식)', use: '“이번이 몇 번째 루프인지, 이젠 세는 것도 그만뒀다.”' },
      { word: '회차', read: '回次', gloss: '몇 번째 회귀(인생)인지를 세는 단위. ‘열 번째 회차’처럼 누적 실패·각오의 무게를 드러낸다.', use: '“열일곱 번째 회차. 이번엔 반드시 끝을 본다.”' },
      { word: '리셋·세이브로드', gloss: '게임판타지에서 온 회귀의 정서적 원형. 죽으면 특정 지점부터 다시 시작하는 감각.', use: '“삶이 세이브로드라면, 나는 방금 가장 좋은 지점을 불러왔다.”' },
      { word: '청산', read: '淸算', gloss: '전생에서 나를 망친 인물·조직에 대한 응징·정리. 초반 통쾌함과 후반 대형 청산을 분리 배치한다.', use: '“이번 생의 목표는 단 하나, 그놈들을 전부 청산하는 것이다.”' },
      { word: '회귀 전·회귀 후', gloss: '같은 상황을 무능했던 과거(회귀 전)와 각성한 현재(회귀 후)로 대비하는 성장 입증 구조.', use: '“회귀 전엔 떨었고, 회귀 후엔 웃었다. 같은 방, 다른 나.”' },
    ],
  },
  {
    key: 'meta', label: '메타지식·정보전', icon: '🔮', desc: '미래 정보·선점·정보 비대칭 등 회귀물의 핵심 엔진 (도시에 §4)',
    items: [
      { word: '미래 지식', gloss: '주인공이 기억하는 앞으로 벌어질 사건·인물·종목 정보. 1화부터 첫 활용을 보여줘야 계약 위반이 아니다.', use: '“나는 미래를 알고 있다. 이 종목이 석 달 뒤 열 배가 된다는 것을.”' },
      { word: '메타지식', gloss: '작품·콘텐츠 차원의 앞선 정보(어떤 노래·시나리오·게임이 대박날지). ‘읽은 소설의 전개를 아는’ 예지형의 사촌.', use: '“메타지식이 있는 한, 흥행은 도박이 아니라 계산이었다.”' },
      { word: '정보 비대칭', gloss: '나만 미래를 안다는 우위. 이 장르의 무기 그 자체. 우위가 사라지는 순간이 곧 최대 위기.', use: '“정보 비대칭이 무너진 자리에, 비로소 진짜 실력이 시험대에 올랐다.”' },
      { word: '선점', read: '先占', gloss: '저평가 자산·인재·기술·종목·아이템을 남보다 먼저 확보하는 모티프. ‘쟤가 미래의 대스타’를 미리 잡기.', use: '“아직 무명인 그를, 나는 미래의 월드스타로 알아보고 선점했다.”' },
      { word: '떡잎', gloss: '아직 무명이나 미래에 거물이 될 인재. 회귀자가 알아보고 미리 포섭하는 ‘미래의 거물’.', use: '“저 신인, 떡잎이 다르다. 삼 년 뒤 이 바닥을 뒤집을 얼굴이지.”' },
      { word: '거시 이벤트', gloss: '경제 위기·코인/주가 폭등·자연재해·게이트 출현일 등 거대한 미래 사건. 원거리 떡밥으로 예고·회수한다.', use: '“2008년 가을. 거시 이벤트의 카운트다운은 이미 시작됐다.”' },
      { word: '예지', read: '豫知', gloss: '회귀를 감추기 위해 ‘앞일을 본다’고 둘러대는 위장. 주변의 “어떻게 알았지?”를 막는 방패.', use: '“예지 능력이라고 해 두자. 회귀했다고 말할 순 없으니까.”' },
      { word: '지식 누설', gloss: '미래를 안다는 사실이 들킬 위험. “넌 왜 이렇게 변했어?”라는 의심을 관리하는 긴장 요소.', use: '“말이 너무 앞섰다. 들키기 전에 우연으로 둘러대야 했다.”' },
      { word: '데자뷔', gloss: '같은 상황을 두 번째 겪는 회귀자의 기시감. 미래를 안다는 우위와 들킬 긴장을 동시에 환기한다.', use: '“데자뷔가 아니다. 나는 이 장면을 전생에서 ‘실제로’ 겪었다.”' },
      { word: '회귀자 인식', gloss: '다른 회귀자·예지자·시스템이 “너도 회귀자냐”를 감지하는 고급 장치. 후반 빌런 설계에 자주 쓴다.', use: '“그의 눈빛이 달라졌다. ‘너도… 돌아온 거냐?’”' },
      { word: '체크리스트', gloss: '회귀 직후 할 일 목록(①가족 살리기 ②그놈 응징 ③이 종목 매수…). 챕터 단위 추진력을 준다.', use: '“회귀 첫날, 나는 종이에 적었다. 이번 생에 반드시 끝낼 목록을.”' },
      { word: 'setup-payoff', read: '복선·회수', gloss: '예고한 미래 사건(대지진·코인 폭등·특정 인물의 흥망)을 반드시 회수하는 약속 이행 원칙.', use: '“내가 말한 그날이 왔다. 약속한 폭락은, 정확히 시작됐다.”' },
      { word: '메타지식 무효화', gloss: '중반 이후 ‘아는 미래가 더는 통하지 않는’ 위기로의 전환. 긴장 회복의 정석.', use: '“내가 아는 미래는 여기서 끝이었다. 이제부턴 진짜 실력이다.”' },
      { word: '정보전', read: '情報戰', gloss: '회귀자·예지자끼리 서로의 미래 정보를 두고 벌이는 수싸움. 후반부 핵심 갈등.', use: '“그도 미래를 안다. 그렇다면 이건 능력 싸움이 아니라, 정보전이다.”' },
      { word: '복기', read: '復棋', gloss: '전생의 사건·실수를 되짚어 최선의 수를 다시 두는 행위. 바둑식 비유로 회귀의 사고법을 표현.', use: '“전생을 복기했다. 그날 내가 둔 패착이, 모든 걸 무너뜨렸으니까.”' },
    ],
  },
  {
    key: 'hunter', label: '헌터·각성·시스템', icon: '🌀', desc: '게이트·각성·스탯 창 등 헌터 혼합형 현판의 게임적 장치 (도시에 §1·§4)',
    items: [
      { word: '게이트', read: 'Gate', gloss: '평범한 현대 도시에 갑자기 열리는 이세계의 문. 회귀자는 출현일·등급을 미리 안다.', use: '“오전 7시, 강남 한복판에 A급 게이트가 열렸다. 전생과 정확히 같은 시각에.”' },
      { word: '각성', read: '覺醒', gloss: '게이트 출현 이후 초능력·스탯에 눈뜨는 것. 전생엔 최약체였던 주인공이 회귀로 최적 각성 루트를 안다.', use: '“전생엔 각성이 늦어 죽었다. 이번엔, 첫날부터 각성한다.”' },
      { word: '각성자', read: '覺醒者', gloss: '각성한 인간. 등급(F~SSS·EX)으로 분류·관리되며, 협회·길드 체계 안에 편입된다.', use: '“십 년을 최약체 각성자로 비웃음당했다 — 회귀하기 전까지는.”' },
      { word: '헌터협회', gloss: '각성자·게이트를 관리하는 공식 기구. 등급 심사·게이트 통제·보상 정산을 맡는 현판의 행정 뼈대.', use: '“헌터협회의 등급 판정이, 한 사람의 인생을 갈랐다.”' },
      { word: '길드', read: 'Guild', gloss: '헌터들이 모인 세력 단위. 회귀자는 어느 길드가 흥하고 망할지 미래 타임라인으로 안다.', use: '“저 신생 길드가 삼 년 뒤 최강이 된다. 지금 들어가면, 창립 멤버다.”' },
      { word: 'S급·EX급', gloss: '각성자·게이트·마수의 최상위 등급. SSS·EX는 전설로만 전해지는 재앙급.', use: '“S급 위에 SSS, 그 위엔 이름조차 금기인 EX가 있었다.”' },
      { word: '마수', read: '魔獸', gloss: '게이트·던전에서 쏟아지는 괴물. 처치하면 마정석·전리품을 떨군다.', use: '“하급 게이트의 마수쯤은, 회귀 전 기억만으로도 패턴이 다 보였다.”' },
      { word: '스테이터스 창', gloss: '각성자에게만 보이는 게임식 반투명 능력치 창. 수치 성장의 가시화 장치.', use: '“[힘 12 / 민첩 9 / 마력 47] — 회귀하자, 익숙한 푸른 창이 다시 떠올랐다.”' },
      { word: '시스템', read: 'System', gloss: '인물에게만 보이는 초월적 안내자·규칙 엔진. 메시지·퀘스트·상점을 띄운다.', use: '“[플레이어님, 다시 오셨군요.] — 시스템마저 나의 회귀를 알고 있었다.”' },
      { word: '히든 피스', gloss: '극소수만 아는 숨겨진 공략·직업·보상. 회귀자·정보 우위자의 전매특허.', use: '“회귀 전의 기억 덕분에, 그는 첫날부터 히든 피스를 챙겼다.”' },
      { word: '히든 클래스', gloss: '드러나지 않은 희귀 직업. 평범한 시작에서 최강으로 가는 반전의 열쇠.', use: '“[직업: 그림자 군주] — 세상에 단 하나뿐인 히든 클래스였다.”' },
      { word: '랭커', read: 'Ranker', gloss: '각성자 서열 상위에 든 강자. 한 명의 랭커가 도시 하나를 지킨다.', use: '“전생에 동경하던 랭커들의 이름을, 나는 이미 전부 알고 있었다.”' },
      { word: '레이드', read: 'Raid', gloss: '강력한 보스·게이트를 다수가 협공해 공략하는 작전. 회귀자는 공략법을 통째로 안다.', use: '“이 레이드, 전생에 백 명이 죽고서야 깬 곳이다. 이번엔 한 명도 안 죽인다.”' },
      { word: '브레이크(던전 브레이크)', gloss: '제때 공략 못 한 게이트가 터져 마수가 현실로 쏟아지는 재앙. 회귀자가 막아야 할 예정된 참사.', use: '“그날의 던전 브레이크. 도시 절반이 무너졌던 그 날을, 나는 막으러 왔다.”' },
      { word: '마정석', read: '魔晶石', gloss: '마수의 핵으로 떨어지는 에너지 결정. 화폐이자 동력원으로, 회귀자는 시세 변동을 안다.', use: '“상급 마정석 하나면, 평범한 가족이 평생 걱정 없이 살 수 있었다.”' },
    ],
  },
  {
    key: 'money', label: '경제·재벌·투자', icon: '💹', desc: '종잣돈·상장·저점 매수 등 경제·재벌물 결합형 어휘 (도시에 §1·§7)',
    items: [
      { word: '종잣돈', gloss: '미래 지식을 굴리기 위한 첫 자본. 회귀 직후 로또·경매·종목으로 빠르게 확보하는 1막의 출발점.', use: '“회귀 첫날, 나는 종잣돈부터 만들기로 했다. 미래를 아는 자에게 돈은 시간문제였으니까.”' },
      { word: '저점 매수', gloss: '미래에 폭등할 자산을 바닥에서 미리 사들이는 선점의 핵심 행위.', use: '“모두가 던질 때, 나는 샀다. 이게 바닥이라는 걸 아는 건 나뿐이었으니까.”' },
      { word: '떡상·떡락', gloss: '폭등(떡상)·폭락(떡락)을 가리키는 인터넷 은어. 회귀자는 그 날짜와 폭을 안다.', use: '“이 코인, 다음 주 목요일에 떡상한다. 그리고 한 달 뒤 떡락하지.”' },
      { word: '상장', read: '上場', gloss: '기업 주식이 증시에 처음 거래되는 것(IPO). 어느 회사가 언제 상장할지가 회귀자의 황금 정보.', use: '“이 스타트업, 오 년 뒤 상장해 시총 십조가 된다. 지금은 직원 다섯 명짜리지만.”' },
      { word: 'IPO', read: '기업공개', gloss: '비상장 기업이 주식을 공개해 자금을 조달하는 절차. 공모가·따상 여부가 미래 지식의 단골 소재.', use: '“IPO 공모주 청약. 따상은 이미 정해진 미래였다.”' },
      { word: '인수합병', read: 'M&A', gloss: '기업을 사들이거나 합치는 거래. 누가 누구를 먹는지 흥망 타임라인을 알면 판을 짤 수 있다.', use: '“삼 년 뒤, 저 거대 그룹은 부도난다. 그전에 알짜 계열사부터 인수한다.”' },
      { word: '시드 투자', gloss: '창업 극초기에 들어가는 투자. 미래의 유니콘에 ‘떡잎’ 단계에서 베팅하는 선점 전략.', use: '“창고에서 시작한 그 회사에, 나는 망설임 없이 시드를 넣었다.”' },
      { word: '재벌', read: '財閥', gloss: '거대 기업 집단과 그 일가. 회귀+재벌/경제물의 대표 무대로, 가문 권력 다툼이 자주 얽힌다.', use: '“재벌가 막내로 회귀했다. 이번엔 버림받는 패가 아니라, 판을 쥐는 패가 되어야 했다.”' },
      { word: '경영권', gloss: '기업을 실질적으로 지배하는 권리. 지분·이사회·표 대결로 빼앗고 지키는 경제물의 전장.', use: '“형들은 몰랐다. 막내가 이미 경영권의 마지막 한 표를 쥐고 있다는 걸.”' },
      { word: '공매도', gloss: '주가 하락에 베팅하는 거래. 미래의 폭락을 아는 회귀자에게 가장 잔혹한 무기.', use: '“그 회사가 분식회계로 무너지는 날을 안다. 그래서 나는, 미리 공매도를 걸었다.”' },
      { word: '작전·세력', gloss: '인위적으로 주가를 띄우는 시장 조작 세력. 회귀자는 어느 종목에 작전이 붙는지 안다.', use: '“이 종목엔 작전 세력이 붙는다. 그 파도에 올라타되, 빠질 날을 정확히 안다.”' },
      { word: '부동산 선점', gloss: '미래에 개발·폭등할 땅·건물을 미리 사두는 것. 거시 정보의 대표 활용처.', use: '“이 허허벌판이 십 년 뒤 신도시가 된다. 지금 사두면, 백 배다.”' },
      { word: '복리', read: '複利', gloss: '불어난 이익에 다시 이익이 붙는 구조. 미래를 아는 자의 자본이 기하급수로 커지는 원리.', use: '“미래 지식과 복리. 이 둘이 만나면, 돈은 눈덩이처럼 굴러갔다.”' },
      { word: '엑시트', read: 'Exit', gloss: '투자금을 회수해 빠져나오는 것. 회귀자는 ‘들어갈 날’만큼 ‘빠질 날’을 정확히 안다.', use: '“들어가는 것보다 중요한 건 엑시트. 나는 폭락 전날 전부 정리했다.”' },
      { word: '시드머니 굴리기', gloss: '작은 자본을 종목·사업으로 단계적으로 키우는 1막의 성장 곡선. 수치 성장의 가시화.', use: '“백만 원이 천만 원, 천만 원이 억이 됐다. 미래를 아는 한, 멈추지 않았다.”' },
    ],
  },
  {
    key: 'star', label: '연예·콘텐츠·스포츠', icon: '🎤', desc: '데뷔조·음원 올킬 등 연예/콘텐츠/스포츠 직업 결합형 어휘 (도시에 §1·§4)',
    items: [
      { word: '데뷔조', gloss: '연습생 중 데뷔가 확정된 멤버 구성. 망했던 연예인이 데뷔 직전으로 회귀하는 거대 클러스터의 출발점.', use: '“데뷔조에서 잘렸던 게 전생. 이번엔, 데뷔조를 내가 짠다.”' },
      { word: '연습생', gloss: '데뷔를 준비하는 기획사 소속 지망생. 회귀자는 누가 뜨고 누가 묻힐지 미리 안다.', use: '“같은 연습생 중에, 삼 년 뒤 월드스타가 될 얼굴이 있었다. 나만 알아봤다.”' },
      { word: '음원 올킬', gloss: '발매와 동시에 모든 음원 차트 1위를 휩쓰는 것. 미래의 명곡을 선점한 회귀자의 단골 성취.', use: '“발매 한 시간 만에 음원 올킬. 전생에서 듣고 또 들었던 그 멜로디였다.”' },
      { word: '역주행', gloss: '한참 뒤 차트가 거꾸로 치고 올라가는 현상. 묻혔던 곡·콘텐츠의 미래를 아는 회귀자의 카드.', use: '“지금은 아무도 안 듣지만, 이 곡은 반년 뒤 역주행으로 1위를 찍는다.”' },
      { word: '기획사', gloss: '연예인을 발굴·관리하는 회사. 어느 기획사가 흥하고 어느 대표가 사고 칠지 회귀자가 안다.', use: '“이 기획사, 대표의 횡령으로 이 년 뒤 망한다. 그전에 좋은 신인부터 빼온다.”' },
      { word: '컴백', read: 'Comeback', gloss: '아티스트의 신곡·신보 활동 재개. 시기·콘셉트를 미래 지식으로 최적화하는 연예물의 승부처.', use: '“컴백 타이밍이 전부다. 그리고 나는, 가장 완벽한 그 날을 안다.”' },
      { word: '떡밥(연예)', gloss: '팬덤을 자극할 콘텐츠·정보. 회귀자는 어떤 떡밥이 화제가 될지 알고 미리 설계한다.', use: '“던질 떡밥의 순서까지, 나는 이미 머릿속에 그려 두었다.”' },
      { word: '바이럴', read: 'Viral', gloss: '입소문으로 폭발적으로 퍼지는 현상. 미래에 터질 밈·영상·곡을 선점해 인위적으로 점화한다.', use: '“이 짧은 영상이 바이럴 터진다는 걸, 나는 일 년 전부터 알고 있었다.”' },
      { word: '시나리오 선점', gloss: '미래에 대박날 시나리오·웹툰·게임을 본인이 먼저 쓰거나 사는 콘텐츠 메타지식의 활용.', use: '“이 시나리오는 천만 영화가 된다. 그래서 나는, 작가가 무명일 때 판권을 샀다.”' },
      { word: '대박 IP', gloss: '미래에 거대 프랜차이즈가 될 콘텐츠 원천. 작가·기획자물 회귀의 황금 알.', use: '“이 웹소설이 드라마·게임·굿즈로 이어지는 대박 IP가 된다. 지금 잡아야 했다.”' },
      { word: '드래프트', read: 'Draft', gloss: '(스포츠물) 프로 구단이 신인을 지명하는 절차. 누가 슈퍼스타가 될지 아는 회귀자의 무대.', use: '“드래프트 전체 1순위로 묻힐 그 선수가, 사실은 역대급이라는 걸 나만 알았다.”' },
      { word: '구단주', gloss: '(스포츠물) 구단을 소유·운영하는 자. 회귀+스포츠 경영의 정점 직위.', use: '“만년 꼴찌 구단을 인수했다. 우승까지의 모든 길을, 나는 이미 봤으니까.”' },
      { word: '랭킹·티어', gloss: '(프로게이머물) 실력 서열·등급. 메타 변화와 패치를 아는 회귀자가 최강 픽을 선점한다.', use: '“다음 시즌 메타가 어떻게 바뀔지 안다. 챌린저는, 정해진 결과였다.”' },
      { word: '오디션', gloss: '데뷔·캐스팅을 가르는 관문. 심사 취향·합격자를 아는 회귀자가 최적의 곡·연기를 고른다.', use: '“이 오디션에서 심사위원이 무엇에 흔들리는지, 나는 전생에서 봤다.”' },
      { word: '슈퍼스타', gloss: '미래에 정점에 설 인물. 무명일 때 알아보고 인연·계약을 선점하는 ‘미래의 거물’ 모티프.', use: '“지금은 무명이지만, 십 년 뒤 이 이름은 전 세계가 안다. 나는 미리 손을 내밀었다.”' },
    ],
  },
  {
    key: 'open', label: '회귀 자각·첫 문장·상투구', icon: '🌅', desc: '회귀를 자각하는 클리셰적 첫 장면과 정형 문구 (도시에 §7)',
    items: [
      { word: '“다시 눈을 떴다”', gloss: '회귀 자각의 가장 닳은 첫 문장. 두 번째 인생의 시작을 알리는 신호탄.', use: '“다시 눈을 떴다. 천장이, 십 년 전 그 방의 천장이었다.”' },
      { word: '“익숙한 천장이다”', gloss: '낯익은 과거의 공간을 보고 회귀를 깨닫는 정형구. ‘젊어진 몸·옛 방’의 자각과 짝을 이룬다.', use: '“익숙한 천장이다. 분명 죽었는데, 나는 다시 이 방에 있었다.”' },
      { word: '“이번엔 다르다”', gloss: '과거의 굴욕을 뒤집겠다는 다짐 선언. 독자에게 ‘사이다’를 예고하는 회귀물의 후킹 한 줄.', use: '“이번엔 다르다. 전생의 나는 여기서 무너졌지만, 지금의 나는 안다.”' },
      { word: '“같은 실수는 반복하지 않는다”', gloss: '회귀자의 각오를 압축한 정형구. 전생의 패착을 복기한 자의 결의.', use: '“같은 실수는 반복하지 않는다. 그러기엔 너무 많은 걸 잃었으니까.”' },
      { word: '“나는 미래를 알고 있다”', gloss: '정보 비대칭이라는 무기를 선언하는 한 줄. 1화에서 첫 활용과 함께 제시되는 것이 정석.', use: '“나는 미래를 알고 있다. 그 사실 하나가, 모든 판을 뒤집을 패였다.”' },
      { word: '“그래, 이 날이었지”', gloss: '특정 사건 직전임을 알아채는 회귀자의 독백. 미래 지식이 작동하기 시작하는 순간.', use: '“그래, 이 날이었지. 아직 그 사고가 일어나기 전이군.”' },
      { word: '“아직 ○○가 일어나기 전이군”', gloss: '미래의 거대 사건이 아직 발생하지 않았음을 확인하는 정형 독백. 선점·예방의 신호.', use: '“달력을 봤다. 아직 그 폭락이 일어나기 전이군. 시간은 충분했다.”' },
      { word: '“전생의 나라면 몰랐겠지만”', gloss: '과거의 무능한 자아와 현재의 각성한 자아를 대비하는 정형 어구.', use: '“전생의 나라면 몰랐겠지만, 저 미소 뒤에 칼이 숨어 있다는 걸 이젠 안다.”' },
      { word: '거울 속 젊어진 얼굴', gloss: '거울·창문을 보며 ‘젊어진 몸’을 자각하는 빈출 클리셰. 회귀의 물리적 실감.', use: '“거울 속엔, 주름 하나 없는 스무 살의 내가 나를 보고 있었다.”' },
      { word: '“살아 있었구나”', gloss: '전생에서 잃은 가족·친구가 아직 살아 있음에 울컥하는 정형 대사. 감정선의 동기 부여.', use: '“문을 열자, 죽었던 동생이 거기 있었다. ‘살아 있었구나.’ 목이 메었다.”' },
      { word: '“이 종목, 이 사람, 이 날짜… 전부 기억한다”', gloss: '미래 지식의 목록을 환기하는 정형 독백. 회귀자의 무기 인벤토리.', use: '“이 종목, 이 사람, 이 날짜… 전부 기억하고 있다. 하나도 놓치지 않는다.”' },
      { word: '“넌 왜 이렇게 변했어?”', gloss: '달라진 주인공을 향한 주변의 의심 대사. 지식 누설을 적당히 둘러대야 하는 긴장.', use: '“‘너… 왜 이렇게 변했어?’ 나는 웃으며 둘러댔다. ‘철 좀 들었나 봐.’”' },
      { word: '“두 번째 기회”', gloss: '회귀를 ‘다시 사는 기회’로 규정하는 정형 표현. 그 무게를 각인하는 도입 어구.', use: '“두 번째 기회였다. 이번엔, 단 하나도 헛되이 쓰지 않을 작정이었다.”' },
      { word: '“이번 생은 다르게 산다”', gloss: '회귀·환생물 공통의 다짐 선언. 과거를 청산하고 새로 살겠다는 동력의 핵심.', use: '“이번 생은 다르게 산다. 끌려다니지 않고, 내가 판을 짠다.”' },
    ],
  },
  {
    key: 'tone', label: '회귀자 독백·말투·어조', icon: '🗯️', desc: '미래를 아는 자 특유의 화법·내적 독백·업계 말투 (도시에 §7·§8)',
    items: [
      { word: '회귀자의 독백체', gloss: '미래를 아는 자의 차분한 우위·씁쓸함이 밴 1인칭 내레이션. 미래지식 해설을 독백으로 처리한다.', use: '‘이번엔 안다. 저 미소 뒤에 무엇이 숨어 있는지. 그래서 더 씁쓸했다.’' },
      { word: '먼치킨 능청체', gloss: '압도적 우위를 담담·시니컬하게 흘리는 어조. ‘사이다’의 맛을 살리는 현판 주인공의 말투.', use: '“아, 이 정도면 됐나? 다음.” — 그는 하품을 했다.' },
      { word: '예측·확신 어조', gloss: '“반드시 그렇게 된다”는 단정조. 미래를 아는 자만이 가질 수 있는 흔들림 없는 확신.', use: '“두고 봐. 정확히 사흘 뒤, 저 회사 주가는 상한가를 친다.”' },
      { word: '회한·그리움 어조', gloss: '이미 죽은 가족·친구를 다시 만난 회귀자의 젖은 어조. 액션 쾌감과 별개의 감정선 축.', use: '‘이번엔, 당신을 먼저 보내지 않을 겁니다. 그 약속 하나로 돌아왔으니까.’' },
      { word: '업계 전문가 어투', gloss: '주식·연예·헌터 등 직업군의 사실적 용어·절차를 막힘없이 구사하는 말투. 미래지식의 우위를 빛낸다.', use: '“공모가 대비 따상, 보호예수 풀리는 시점까지 계산해 두면 리스크는 없습니다.”' },
      { word: '냉소·사이다 한 방', gloss: '전생의 원수를 한 문장으로 제압하는 통쾌한 대사. 매 화 1쾌감의 정점.', use: '“그때 날 비웃었지? 이번엔, 네가 내 결재를 기다릴 차례다.”' },
      { word: '시스템 메시지체', gloss: '(헌터 혼합형) 대괄호·반말·기계적 통보. 감정 없는 안내가 도리어 긴장을 준다.', use: '“[경고: 곧 발생할 던전 브레이크를 막을 수 있는 시간은 47분입니다.]”' },
      { word: '둘러대기 화법', gloss: '회귀·미래지식을 들키지 않으려 ‘직감·운·천재성’으로 포장하는 능청스러운 변명조.', use: '“어떻게 알았냐고? 그냥… 감이 좋았어요.” 거짓말은 짧을수록 좋았다.' },
      { word: '카운트다운 어조', gloss: '예고한 거대 사건이 다가올수록 긴장을 끌어올리는 화법. 원거리 떡밥의 회수 직전.', use: '‘이제 일주일. 그날이 오면, 세상은 내가 아는 그 세상이 아니게 된다.’' },
      { word: '체급 역전 선언', gloss: '한때 자신을 짓밟던 거대 존재를 내려다보게 된 위치 역전을 시각화하는 대사.', use: '“회장님. 이제 고개를 드십시오. 위에서 내려다보는 건, 이번엔 접니다.”' },
      { word: '내적 정보 해설', gloss: '겉으론 평범한 행동을 하면서 속으론 미래 정보를 줄줄 풀어내는 독백/지문의 이중 구조.', use: '그는 웃으며 악수했다. ‘이 사람이 삼 년 뒤 나를 배신할 그 얼굴이다.’ 속으론 그렇게 새겼다.' },
      { word: '담백한 회상 진입', gloss: '“전생에선…”으로 자연스럽게 과거를 펼쳐 미래 정보의 출처를 보여주는 회상 어법.', use: '‘전생에선, 바로 이 자리에서 모든 걸 잃었다. 그래서 이번엔 다르게 둔다.’' },
    ],
  },
  {
    key: 'cliche', label: '빈출 클리셰·전복', icon: '🔁', desc: '인지하고 변주할 회귀물 단골 설정 — 그대로 쓰거나, 비틀거나 (도시에 §7·§9)',
    items: [
      { word: '회귀 직후 즉시 돈·정보 확보', gloss: '로또·종목·경매·면접으로 첫 행동에서 바로 자본을 만드는 1막의 정석.', use: '전복: 로또 번호가 나비효과로 어긋나, 미래 지식이 통하지 않음을 일찍 깨닫는다.' },
      { word: '가족이 아직 살아있음에 울컥', gloss: '죽은 부모·동생이 살아 있는 걸 보고 무너지는 감정 클리셰. 동기 부여의 단골.', use: '전복: 살아 있는 가족이, 사실 전생에 주인공을 배신한 장본인이었다.' },
      { word: '전생의 원수가 초반엔 우위', gloss: '한때 나를 짓밟던 자가 처음엔 위에 있다가 서서히 역전되는 통쾌한 리듬.', use: '전복: 그 원수도 회귀자라, 우위가 쉽게 뒤집히지 않는다(정보전 발생).' },
      { word: '재능·실력을 숨긴다', gloss: '실력을 감췄다가 결정적 순간에 폭발시키는 사이다 장치.', use: '전복: 숨긴 실력이 결국 의심을 사, 정체(회귀자)가 들킬 위기가 된다.' },
      { word: '미래의 거물을 무명일 때 포섭', gloss: '아직 무명인 미래의 대스타·천재를 알아보고 미리 잡는 선점 클리셰.', use: '전복: 그 거물이 사실 미래에 주인공을 파멸시킬 인물이라, 포섭이 양날의 검이 된다.' },
      { word: '“이번 생은 가족을 위해”', gloss: '복수 일변도에서 벗어나 가족·소중한 사람을 지키는 것을 목표로 삼는 정서 축.', use: '전복: 가족을 지키려는 선택이, 더 큰 미래를 망치는 딜레마로 이어진다.' },
      { word: '약자가 회귀로 최강이 됨', gloss: '현판 웹소설의 핵심 동력. 사이다의 원천.', use: '전복: 최강이 된 대가로 전생에서 함께였던 동료·인간성을 잃어 간다.' },
      { word: '미래 지식으로 무위험 떡상', gloss: '아는 종목·콘텐츠로 손실 없이 성공하는 무적 구도.', use: '전복: 개입이 시장을 바꿔 ‘아는 미래’가 더는 안 통하는 중반 위기로 전환.' },
      { word: '데우스 엑스 마키나식 새 미래지식', gloss: '위기마다 “사실 이것도 알고 있었다”로 막아내는 남용. 회귀물 최대 금기.', use: '대안: 클라이맥스의 돌파는 회귀 후 ‘스스로 쌓은 실력·인맥’으로 이루게 한다(메타지식 붕괴 후 자력 승리).' },
      { word: '회귀해놓고 정보를 안 씀', gloss: '미래를 알면서도 활용을 미루는 전개. 독자와의 계약 위반.', use: '대안: 1화~초반에 회귀 자각 → 첫 미래지식 행사 → 작은 승리 사이클을 반드시 보여준다.' },
      { word: '무의미한 회귀 시점', gloss: '왜 하필 그때로 돌아왔는지 서사적 의미가 없는 시점 설정. 동력이 약해진다.', use: '대안: 회귀 시점을 ‘모든 게 갈린 분기점 직전’으로 잡아 동력을 만든다.' },
      { word: '예고한 미래 사건의 미회수', gloss: '대지진·코인 폭등·게이트 출현일을 예고하고 회수하지 않는 약속 불이행.', use: '대안: 원거리 떡밥(거시 이벤트)과 단기 회수 떡밥을 병렬로 굴려 반드시 회수한다.' },
      { word: '성취·안정형 에필로그', gloss: '“두 번째 인생은 행복했다”류의 정서적 마침표. 현판 회귀는 비극보다 성취 엔딩을 선호.', use: '전복: 안정 뒤에 남은 한 가지 미련·또 다른 회귀자의 그림자를 남겨 여운을 준다.' },
    ],
  },
]

const LS = 'sry:tool:modfan-lexicon:'
const ALL_KEY = '__all__'
type Flat = { cat: CatDef; item: Term }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 한 항목을 한 덩이 텍스트로(복사·스니펫·프로젝트 공통)
const termText = (f: Flat): string => {
  const head = `${f.cat.icon} [${f.cat.label}] ${f.item.word}${f.item.read ? ` (${f.item.read})` : ''}`
  const lines = [head, f.item.gloss]
  if (f.item.use) lines.push(`예) ${f.item.use}`)
  return lines.join('\n')
}

export default function ModfanLexicon({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 활용: 다른 도구가 장르를 넘겨주면 안내에 반영(이 사전은 현대판타지·회귀 전용).
  const incomingGenre = typeof payload?.genre === 'string' ? (payload.genre as string) : ''

  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 즐겨찾기: "catKey::word"
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<Flat | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)
  const copyTimer = useRef<number | null>(null)

  // 영속
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])
  // 언마운트 정리
  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
  }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])

  // 조합수: 어휘 사전에서 "한 장면에 엮을 8요소 어휘 팔레트"를 순서까지 정하는 경우의 수.
  //  - 8개 카테고리에서 각각 한 항목씩 뽑고( ∏ items_i ), 그 8개를 문장 안에 배치하는 순서( 8! )까지 곱한다.
  //  → ∏(items_i) × 8!.  (예: 회귀어휘 1 + 메타지식 1 + 헌터 1 + … 8요소를 골라 순서대로 배치)
  //  카테고리별 항목 수가 충분히 커 조합수는 1조(핵심 생성기 지향선)를 크게 넘는다.
  const comboCount = useMemo(() => {
    let p = 1
    for (const c of CATS) p *= c.items.length
    let fact = 1
    for (let i = 1; i <= CATS.length; i++) fact *= i
    return p * fact
  }, [])
  const comboText = useMemo(() => {
    // 한국어 만/억/조/경 단위 근사 표기
    const n = comboCount
    if (n >= 1e16) return `${(n / 1e16).toFixed(2)}경 가지 이상`
    if (n >= 1e12) return `${(n / 1e12).toFixed(2)}조 가지 이상`
    if (n >= 1e8) return `${(n / 1e8).toFixed(2)}억 가지 이상`
    if (n >= 1e4) return `${(n / 1e4).toFixed(0)}만 가지`
    return `${n.toLocaleString()}가지`
  }, [comboCount])

  const favKey = (catKey: string, word: string) => `${catKey}::${word}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base: Flat[] = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[favKey(c.key, item.word)])
    if (q) {
      base = base.filter(({ item }) =>
        item.word.toLowerCase().includes(q) ||
        (item.read || '').toLowerCase().includes(q) ||
        item.gloss.toLowerCase().includes(q) ||
        (item.use || '').toLowerCase().includes(q))
    }
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    const pool: Flat[] = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.word === prev.item.word && pick.cat.key === prev.cat.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return pick
    })
  }, [cat])

  const toggleFav = (catKey: string, word: string) => {
    const k = favKey(catKey, word)
    setFavs((prev) => { const next = { ...prev }; if (next[k]) delete next[k]; else next[k] = true; return next })
  }

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* graceful */ })
  }

  // 스니펫 저장(생성 글감)
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: termText(f),
      source: '현판·회귀 어휘·표현 사전',
      tags: ['현대판타지·회귀', '어휘', f.cat.label, f.item.word],
    })
    flash(`‘${f.item.word}’을(를) 스니펫으로 저장했습니다.`)
  }

  // 프로젝트 자료 〈설정/어휘〉 폴더에 메모 추가
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(f.cat.icon + ' ' + f.cat.label)} · ${escapeHtml(f.item.word)}${f.item.read ? ' (' + escapeHtml(f.item.read) + ')' : ''}</b></p>`,
      `<p>${escapeHtml(f.item.gloss)}</p>`,
      f.item.use ? `<p style="color:#888"><i>예) ${escapeHtml(f.item.use)}</i></p>` : '',
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '설정/어휘',
      title: `${f.item.word} (현판·회귀 어휘)`,
      bodyHtml,
      meta: { 장르: '현대판타지·회귀', 분류: f.cat.label },
    })
    if (id) flash(`프로젝트 자료 〈설정/어휘〉에 ‘${f.item.word}’을(를) 추가했습니다.`)
  }

  // 현재 화면의 항목 전부를 한 문서로 묶어 프로젝트에 추가
  const allToProject = () => {
    if (!hasProjectBridge() || filtered.length === 0) return
    const body = filtered.map((f) =>
      `<p><b>${escapeHtml(f.cat.icon + ' ' + f.item.word)}${f.item.read ? ' (' + escapeHtml(f.item.read) + ')' : ''}</b> — ${escapeHtml(f.item.gloss)}` +
      (f.item.use ? `<br/><span style="color:#888"><i>예) ${escapeHtml(f.item.use)}</i></span>` : '') + '</p>'
    ).join('')
    const where = cat === ALL_KEY ? '전체' : (CATS.find((c) => c.key === cat)?.label || '')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '설정/어휘',
      title: `현판·회귀 어휘집 — ${where}${query ? ` · ‘${query}’` : ''} (${filtered.length}개)`,
      bodyHtml: body, meta: { 장르: '현대판타지·회귀', 분류: where },
    })
    if (id) flash(`현재 목록 ${filtered.length}개를 프로젝트 〈설정/어휘〉에 추가했습니다.`)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>현대판타지·회귀</b> 장르 특유의 어휘·관용구·말투·상투구·전문용어 <b>{total}개</b>를 8개 분류로 모았습니다.
        검색·무작위로 찾아 클릭 복사하고, 마음에 들면 스니펫·프로젝트에 담으세요.
        {incomingGenre && incomingGenre !== '현대판타지·회귀' && (
          <span style={{ color: 'var(--accent)' }}> (요청 장르 ‘{incomingGenre}’ — 이 사전은 현대판타지·회귀 전용입니다.)</span>
        )}
        <br /><Emoji e="🎲" /> 8개 분류에서 한 항목씩 뽑아 순서까지 정하는 어휘 팔레트 조합은 <b>{comboText}</b> ({comboCount.toLocaleString()})로 짤 수 있습니다.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="단어·뜻·예문으로 검색 (예: 회귀, 선점, 게이트, 종잣돈, 떡상)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 펼침 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="✨" /> 전체
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on}
              title={c.desc}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={c.icon} /> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 어휘</button>
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
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.word}</span>
            {random.item.read && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{random.item.read}</span>}
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0 4px' }}>{random.item.gloss}</div>
          {random.item.use && <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--muted)', fontStyle: 'italic' }}>예) {random.item.use}</div>}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(termText(random), 'rand')}>{copiedKey === 'rand' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
            <button className="minibtn" onClick={() => copy(random.item.word, 'rand-w')}>{copiedKey === 'rand-w' ? <>✓ 복사됨</> : <><Emoji e="🔤" /> 단어만</>}</button>
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="💾" /> 스니펫</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.word)}>
              {favs[favKey(random.cat.key, random.item.word)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 어휘가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const fk = favKey(c.key, item.word)
            const isFav = !!favs[fk]
            const copyId = 'item:' + fk
            return (
              <div key={fk} style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /> {c.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
                    title="클릭하면 단어를 복사합니다"
                    onClick={() => copy(item.word, copyId + ':w')}>{item.word}</span>
                  {item.read && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{item.read}</span>}
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                    onClick={() => toggleFav(c.key, item.word)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 5 }}>{item.gloss}</div>
                {item.use && <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--muted)', fontStyle: 'italic', marginTop: 4 }}>예) {item.use}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <button className="minibtn" onClick={() => copy(termText({ cat: c, item }), copyId)}>
                    {copiedKey === copyId ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
                  </button>
                  <button className="minibtn" onClick={() => saveSnippet({ cat: c, item })}><Emoji e="💾" /> 스니펫</button>
                  <button className="linkbtn" onClick={() => toProject({ cat: c, item })} disabled={!hasProjectBridge()}
                    title={hasProjectBridge() ? '이 어휘를 프로젝트 자료 〈설정/어휘〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                    <Emoji e="📄" /> 프로젝트에 추가
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 하단: 일괄 동작 + 연계 */}
      <div className="linkbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
        <button className="linkbtn" onClick={allToProject} disabled={!hasProjectBridge() || filtered.length === 0}
          title={hasProjectBridge() ? '현재 목록 전체를 한 문서로 프로젝트 〈설정/어휘〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
          <Emoji e="📄" /> 목록 전체 프로젝트에 추가
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('genre-conventions', { genre: '현대판타지·회귀' })}
          title="장르 관습 체크리스트 열기"><Emoji e="📐" /> 장르 관습</button>
        <button className="linkbtn" onClick={() => openToolLinked('genre-devices', { genre: '현대판타지·회귀' })}
          title="장르 서사 장치 열기"><Emoji e="🔧" /> 서사 장치</button>
        <button className="linkbtn" onClick={() => openToolLinked('name-mixer', { genre: '현대판타지·회귀' })}
          title="이름 조합기 열기"><Emoji e="🔤" /> 이름 조합기</button>
        <span style={{ ...hint, marginLeft: 'auto' }}>
          어휘는 정답이 아니라 출발점입니다. 상투구는 그대로 쓰거나, 비틀어 보세요.
        </span>
      </div>
    </div>
  )
}
