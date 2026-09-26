// 법·재판·형벌 사전 — 법정물·사극·스릴러 고증을 위한 로컬 자작 자료집.
//  시대·문화별 법체계·재판 절차·형벌·수사·감옥을 ‘서사용 설정’으로 정리한다(실제 매뉴얼이 아니라 창작 참고).
//  자급식: react 와 './linkbus' 외 import 없음. 외부 API 없음(전부 로컬 자작 데이터).
//  카테고리 펼침 + 검색 + 무작위 + 클릭복사 + 스니펫 저장 + 프로젝트 연계(root:research).
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'law-justice-ref',
  name: '법·재판·형벌 사전',
  icon: '⚖️',
  group: '리서치·자료',
  intro: '시대·문화별 법체계·재판 절차·형벌·수사·감옥을 정리 — 법정물·사극·스릴러 고증용 창작 참고 자료',
  w: 660,
  h: 680,
}

// ---------- 항목 형(型) ----------
// 모든 텍스트는 '서사 설정' 수준의 창작 묘사용 단서다. 특정 실존 사건·인물의 복제가 아니라 일반적 제도·관행을 각색했다.
interface Entry {
  name: string          // 명칭(제도·절차·형벌·직역 등)
  era?: string          // 시대·문화 배경(서사 배경 잡기용)
  what?: string         // 무엇인가(핵심 정의)
  process?: string      // 절차·운영 방식(법정·수사 장면 묘사용)
  role?: string         // 관여하는 사람·직역(등장인물 설정용)
  drama?: string        // 이야기 활용·드라마 포인트(갈등·반전 씨앗)
  caution?: string      // 고증·작가 유의(흔한 오류·클리셰·시대 착오 주의)
}
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ---------- 로컬 대량 자작 자료집 ----------
const CATS: CatDef[] = [
  {
    key: 'system', label: '법체계·법원(法源)', icon: '📜',
    note: '“무엇이 법이며 어디서 나오는가.” 같은 죄도 법체계에 따라 다르게 다뤄진다 — 세계관의 토대.',
    items: [
      { name: '관습법(불문법)', era: '고대~중세, 부족·공동체 사회', what: '글로 적힌 법전이 아니라 ‘예부터 그래 왔다’는 관행과 공동체 기억이 곧 규범인 체계.', process: '분쟁이 생기면 원로·장로·족장이 “선례가 이러했다”며 구술 전통으로 판단한다. 기억하는 자가 곧 권위.', role: '원로·장로·구술 전승자, 마을 회의(평의회).', drama: '문서가 없으니 “누가 무엇을 기억하느냐”가 권력 — 기억의 조작·증인의 매수가 곧 법의 왜곡으로 이어진다.', caution: '관습법 사회에 현대식 ‘성문 조항 인용’을 넣지 말 것. 권위는 글이 아니라 사람·기억에서 나온다.' },
      { name: '성문법전', era: '고대 메소포타미아~근대', what: '돌·점토·종이에 조문을 새겨 ‘누구나 같은 기준’을 표방한 체계. 동해보복(같은 손해로 갚음) 원칙이 흔하다.', process: '조문에 정해진 죄와 형이 대응한다. 신분에 따라 형이 달라지는 ‘차등 처벌’이 고대 법전의 특징.', role: '왕·입법자(법을 반포하는 권력자), 서기, 판관.', drama: '“법은 같다”는 공언과 “신분 따라 다르다”는 현실의 간극이 분노와 봉기의 씨앗.', caution: '고대 성문법은 만인 평등이 아니다. 귀족·평민·노예의 형량 차이를 지우면 시대감이 무너진다.' },
      { name: '대륙법(성문주의)', era: '근대 유럽~현대', what: '체계적으로 편찬된 법전을 1차 근거로 삼고, 판사가 그 조문을 사건에 ‘적용’하는 체계.', process: '판사가 사실관계를 조사하고(직권주의 색채) 법조문에 비추어 결론을 낸다. 판례는 참고일 뿐 구속력이 약하다.', role: '직업 법관(시험으로 선발된 관료형 판사), 검사, 변호사.', drama: '“조문에 없으면 처벌 못 한다”는 죄형법정주의가 영리한 범인의 빈틈이 된다.', caution: '대륙법 법정에 영미식 ‘배심원 만장일치’를 섞지 말 것. 판사·소수 참심이 사실판단을 맡는 경우가 많다.' },
      { name: '보통법(판례주의)', era: '중세 잉글랜드~현대 영미권', what: '과거 판결(선례)이 법의 핵심 — “비슷한 사건은 비슷하게”라는 선례구속이 작동하는 체계.', process: '변호사가 유리한 판례를 찾아 인용하고, 판사가 선례를 따르거나 ‘구별’해 새 길을 연다. 배심이 사실을, 판사가 법을 본다.', role: '배심원, 법정 변호사, 판사(선례를 빚는 자).', drama: '“선례를 깨는 판결”은 그 자체로 역사적 사건 — 약자가 거대한 관행에 맞서는 법정극의 단골.', caution: '“판례주의=무법”이 아니다. 오히려 선례에 묶여 변화가 더딘 보수성이 갈등을 만든다.' },
      { name: '종교법', era: '전(全) 시대, 신정·종교공동체', what: '경전·교리·종교 권위가 곧 법인 체계. 신앙·혼인·상속·도덕이 세속 분쟁과 한데 묶인다.', process: '성직자·법학자가 경전을 해석해 판단한다. 세속 법정과 종교 법정이 ‘관할’을 두고 충돌하기도.', role: '성직자·교법학자, 종교 재판관.', drama: '“신의 법과 왕의 법이 부딪칠 때 누구를 따를 것인가” — 양심과 권력 사이의 비극.', caution: '종교법을 단순한 ‘박해 도구’로만 그리면 납작해진다. 신자에게는 진심의 윤리 체계였음을 함께 보여줄 것.' },
      { name: '봉건 관할·영주재판', era: '중세 봉건사회', what: '땅을 매개로 영주가 자기 영지 안 분쟁을 재판하는 ‘쪼개진 사법’. 왕의 법, 영주의 법, 교회법, 도시법이 뒤엉킨다.', process: '영주의 장원 법정이 소작농의 분쟁을 다스리고, 중대 범죄나 귀족 사건은 상위 권력으로 올라간다.', role: '영주·집사(장원 관리인), 배심적 평민단.', drama: '“어느 법정에서 재판받느냐”가 곧 운명 — 관할 다툼 자체가 권력 게임이 된다.', caution: '중세를 단일한 ‘왕의 법’으로 그리면 틀린다. 권력이 잘게 분산된 ‘법의 모자이크’를 보여줄 것.' },
      { name: '율령체제(동아시아)', era: '고대~근세 한·중·일', what: '형벌 규정인 율(律)과 행정 규정인 령(令)을 축으로 한 성문 체계. 유교적 신분·예(禮)와 결합한다.', process: '관(官)이 법을 집행하되, 가벼운 사안은 향촌의 도덕·중재로 다스리는 ‘예치(禮治)’가 함께 작동한다.', role: '지방관(수령)·아전, 형방, 중앙의 형부(刑部) 관료.', drama: '“법대로 vs 인정(人情)대로” — 원칙과 온정 사이에서 흔들리는 청백리 사또의 고뇌.', caution: '사극에서 현대 법정의 ‘무죄추정·변호인 선임권’을 그대로 옮기지 말 것. 자백 중심·신분 차등이 기본 전제.' },
    ],
  },
  {
    key: 'trial', label: '재판 절차·법정', icon: '🏛️',
    note: '진실을 가리는 ‘무대’. 절차 하나로 같은 증거도 유죄가 되고 무죄가 된다 — 법정극의 심장.',
    items: [
      { name: '규문주의(직권 심리)', era: '중세~근세 유럽·동아시아', what: '판관이 수사관·검사·재판관을 겸해 직접 캐묻고 결론까지 내리는 ‘심문 중심’ 절차.', process: '피고를 불러 직접 추궁하고, 자백을 ‘증거의 여왕’으로 떠받든다. 변호의 여지가 거의 없다.', role: '심문관(판관 겸 수사관), 서기, 형리.', drama: '“자백만 받으면 끝”이라는 구조가 고문·억울한 옥사로 치닫는 비극의 엔진.', caution: '규문주의 법정에 ‘반대신문하는 변호인’을 넣으면 시대 착오. 피고는 항변자가 아니라 추궁 대상이다.' },
      { name: '당사자주의(대심 구조)', era: '근현대 영미권', what: '검사와 변호인이 ‘대등한 양 당사자’로 다투고, 중립적 판단자가 승부를 가리는 구조.', process: '모두진술 → 증거제출·증인신문 → 반대신문 → 최종변론 → 평결. 다툼의 ‘기술’이 결과를 좌우한다.', role: '검사, 변호인, 판사(심판), 배심원(사실 판단).', drama: '“진실보다 더 잘 다투는 자가 이긴다” — 유능한 변호의 빛과 그늘이 모두 극이 된다.', caution: '당사자주의에서 판사는 링 위 선수가 아니라 심판이다. 판사가 직접 캐묻는 장면을 남발하지 말 것.' },
      { name: '배심재판', era: '중세 잉글랜드~현대', what: '평범한 시민들이 증거를 듣고 ‘유죄/무죄’를 평결하는 제도. 사실 판단을 권력이 아닌 동료 시민에게 맡긴다.', process: '배심원 선정(기피) → 심리 청취 → 비공개 평의 → 평결. 만장일치를 요구하기도 한다.', role: '배심원, 배심장, 양측 변호인(배심 설득이 핵심 기술).', drama: '한 명의 합리적 의심이 만장일치를 뒤집는 ‘12인의 성난 사람들’식 밀실 평의 드라마.', caution: '배심은 ‘법’이 아니라 ‘사실’을 판단한다. 배심원이 형량을 정하는 듯 그리는 건 대부분 오류.' },
      { name: '신판(神判)·시죄법', era: '고대~중세 초', what: '뜨거운 쇠·끓는 물·물에 담그기 등으로 ‘신이 무죄를 증명한다’고 믿은 재판. 결투 재판도 한 갈래.', process: '시련을 가하고 그 결과(상처의 회복, 가라앉음 등)를 신의 판단으로 해석한다. 결투에서 이긴 자가 옳다고 본다.', role: '성직자(시련 주관), 결투 대리인(대신 싸우는 용병).', drama: '“무죄면 신이 지킨다”는 믿음과, 그 믿음을 악용하는 권력의 냉소가 충돌한다.', caution: '근대 이후 배경에 신판을 넣으면 안 된다. 신판은 증거재판으로 대체되며 점차 폐지된 ‘초기’ 제도.' },
      { name: '심급·상소', era: '율령제~현대', what: '한 번의 판결로 끝나지 않고 상위 법원에 다시 판단을 구하는 ‘여러 단계’ 구조.', process: '1심 → 항소 → 상고. 상급심은 사실보다 법리·절차의 잘못을 주로 본다. 사극에선 임금에게 올리는 상언·격쟁.', role: '상소인, 상급 법관, (사극) 어사·신문고를 두드리는 백성.', drama: '“마지막 한 번의 기회” — 시한과 절차에 쫓기며 진실을 다투는 긴박한 후반부.', caution: '상급심이 사건을 처음부터 다시 본다고 단정하지 말 것. 보통 ‘법률심’이라 새 증거가 제한된다.' },
      { name: '증거법칙·증명책임', era: '근현대', what: '“누가, 무엇으로, 어디까지 입증해야 하는가”의 규칙. 위법하게 모은 증거를 배제하기도 한다.', process: '형사는 검사가 ‘합리적 의심 없는 정도’까지 입증해야 유죄. 위법수집증거·전문(傳聞)은 배제될 수 있다.', role: '검사(입증 책임), 변호인(증거 배제 신청), 판사(증거능력 판단).', drama: '결정적 증거가 ‘위법하게 수집됐다’는 한 줄로 무너지는 반전 — 절차가 정의를 막는 아이러니.', caution: '“심증은 가는데 증거가 없다”는 무죄추정의 핵심. 자백만으로 끝나는 현대 재판은 오류다.' },
      { name: '무죄추정·죄형법정주의', era: '근현대', what: '“유죄가 확정될 때까지 무죄로 본다”와 “법에 없으면 처벌 못 한다”는 근대 형사법의 두 기둥.', process: '의심받는 자는 자신의 무죄를 증명할 의무가 없고, 처벌은 미리 정해진 법조문이 있어야만 가능하다.', role: '피고인(방어권의 주체), 변호인, 검사.', drama: '“명백히 나쁜 자인데 처벌할 조항이 없다” — 법치의 원칙이 정의감과 충돌하는 딜레마.', caution: '근대 이전 배경엔 이 원칙들이 없다. 사극·중세물에 ‘무죄추정’을 넣는 건 대표적 시대 착오.' },
    ],
  },
  {
    key: 'roles', label: '법조 직역·관헌', icon: '👩‍⚖️',
    note: '법정과 거리에서 법을 움직이는 사람들. 직역을 정확히 알면 인물의 권한·한계·말투가 살아난다.',
    items: [
      { name: '판사·법관', era: '전 시대', what: '사건을 심리해 판결을 선고하는 권위자. 직업 법관(대륙법)과 선출·임명 판사(영미)로 갈린다.', process: '심리를 지휘하고 절차를 통제하며, 유무죄와 양형을 (또는 법리만) 판단한다.', role: '— (법정의 중심)', drama: '“법대로의 냉정”과 “인간으로서의 흔들림” 사이 — 양심적 거부, 정치적 압력에 굴복/저항.', caution: '체계에 따라 권한이 다르다. 영미 판사는 사실판단을 배심에 맡기고, 직권주의 판사는 직접 캐묻는다.' },
      { name: '검사·소추관', era: '근현대(공소제도 성립 후)', what: '국가를 대신해 범죄를 수사·기소하고 법정에서 유죄를 입증하는 공직자.', process: '수사 지휘 또는 송치 사건 검토 → 기소/불기소 결정 → 공판에서 입증·구형.', role: '— (소추의 주체)', drama: '“진실을 밝히려는 정의감” vs “유죄율·승진의 유혹” — 무리한 기소가 무고를 낳는 비극.', caution: '근대 이전엔 ‘검사’가 없는 경우가 많다(피해자가 직접 고소하거나 관이 직권 처리). 시대 확인 필수.' },
      { name: '변호인', era: '근현대', what: '피고인·당사자의 권리를 대변하고 방어하는 법률가. ‘방어권’의 화신.', process: '의뢰인 상담 → 증거 검토·반박 논리 구성 → 반대신문·변론. 국선변호로 빈자도 조력받게 한다.', role: '— (방어의 주체)', drama: '“유죄인 걸 알면서도 변호해야 하는가” — 직업윤리와 양심의 영원한 충돌.', caution: '변호인 선임권은 근대의 성취다. 규문주의·고대 법정에 ‘반대신문하는 변호사’를 넣지 말 것.' },
      { name: '서기·기록관', era: '전 시대', what: '심리 내용·진술·판결을 글로 남기는 사람. 기록이 곧 사건의 ‘공식 기억’.', process: '구술된 진술을 받아쓰고 문서를 보존한다. 사극의 형방·문서고 관리도 여기에 든다.', role: '— (기록의 주체)', drama: '“기록을 바꾸면 진실이 바뀐다” — 위조·소실된 문서 한 장이 사건을 뒤집는 스릴러 장치.', caution: '기록 매체(점토판·죽간·양피지·종이)가 시대를 드러낸다. 매체를 틀리면 고증이 무너진다.' },
      { name: '포졸·포도·치안관', era: '전 시대', what: '범인을 잡고 거리를 단속하는 ‘손과 발’. 수사 권한과 무력 사용의 경계가 시대마다 다르다.', process: '순찰·체포·압송·옥 관리. 사극의 포도청, 근세 유럽의 경비대, 근대의 경찰로 이어진다.', role: '포교(지휘)·포졸(실무), 야경꾼, 자경단.', drama: '“법을 집행하는 자의 부패” — 뇌물·고문·과잉 진압이 무고한 자를 옭아맨다.', caution: '근대 이전 ‘직업 경찰’ 개념은 약하다. 자경·향촌 공동체·사적 추적이 더 흔했음을 반영할 것.' },
      { name: '배심원', era: '중세 잉글랜드~현대', what: '시민 중에서 뽑혀 사실을 판단하는 비전문 재판 참여자.', process: '선정(기피) → 심리 청취 → 비공개 평의 → 평결. 사회 통념·상식이 법정에 들어오는 통로.', role: '— (사실 판단의 주체)', drama: '편견·여론·매수에 흔들리는 ‘보통 사람들’ — 한 사람의 양심이 다수를 돌려세우는 드라마.', caution: '대륙법·전근대 동아시아엔 배심이 없다(참심·향회 등은 별개). 무대 따라 제도를 맞출 것.' },
      { name: '암행어사·감찰', era: '조선 등 동아시아', what: '왕의 밀명을 받아 신분을 숨기고 지방관의 비리·억울한 옥사를 적발·시정하는 특명 관리.', process: '암행으로 민정을 살피고, 마패를 들어 ‘출도(出道)’하면 즉시 권한을 발동해 부정한 수령을 봉고파직한다.', role: '— (감찰·시정의 주체)', drama: '“하늘 같은 사또 위에 또 다른 권력” — 부패한 지방 권력을 일거에 뒤집는 통쾌한 반전 카드.', caution: '어사가 ‘즉결 처형’까지 마음대로 하진 않는다. 보고·상신 절차가 있으니 만능 해결사로 그리지 말 것.' },
    ],
  },
  {
    key: 'invest', label: '수사·검시·증거', icon: '🔍',
    note: '“어떻게 진실에 다가가는가.” 과학 없는 시대일수록 ‘말과 흔적’을 읽는 기술이 빛난다.',
    items: [
      { name: '검시·검험(檢驗)', era: '전 시대(동아시아 검시 전통 포함)', what: '시신을 살펴 사인을 가리는 절차. 동아시아엔 일찍이 체계적 검시 지침이 발달했다.', process: '관(官)이 시신과 현장을 살펴 상처·정황을 기록하고, 두 차례 검시(초검·복검)로 교차 확인하기도.', role: '검시관·오작인(시신을 다루는 실무자), 수령(검시 주관).', drama: '“시신은 거짓말을 하지 않는다” — 위장된 자살·사고를 검시가 뒤집는 고전 추리.', caution: '전근대 검시는 정밀 부검이 아니다. 외표 검사·정황 중심임을 반영하고 현대 법의학을 섞지 말 것.' },
      { name: '자백·신문', era: '전 시대', what: '진술을 받아 사건을 재구성하는 핵심 수단. 규문주의에서는 자백이 ‘증거의 여왕’이었다.', process: '추궁·대질·정황 제시로 진술을 끌어낸다. 전근대엔 고신(고문)이 합법적 신문 수단인 경우도.', role: '심문관·형리, 통변(통역), 서기.', drama: '“받아낸 자백이 진실인가, 고통이 만든 거짓인가” — 무고한 자백의 비극.', caution: '“자백=유죄”의 위험을 보여주는 게 좋다. 현대 배경이라면 위법한 자백은 증거능력이 부정됨을 잊지 말 것.' },
      { name: '증인·증언', era: '전 시대', what: '직접 보고 들은 자의 진술. 신분·성별·관계에 따라 증언의 ‘무게’가 달랐던 시대가 많다.', process: '소환 → 선서(또는 그 시대의 맹세) → 신문·반대신문. 위증은 무거운 죄로 다뤄지기도 한다.', role: '증인, 신문하는 양측, 선서를 주관하는 자.', drama: '“핵심 증인의 변심·매수·실종” — 증언 하나에 매달린 재판의 긴장.', caution: '전근대엔 증인 자격에 신분·성별 제한이 흔했다. 모두가 동등하게 증언하는 현대상을 투영하지 말 것.' },
      { name: '물증·정황증거', era: '전 시대', what: '흉기·문서·발자국·핏자국 등 ‘사람이 아닌 것’이 말하는 증거. 시대가 내려올수록 비중이 커진다.', process: '현장 보존·수집·대조. 정황을 엮어 ‘이렇게밖에 설명되지 않는다’는 추론을 세운다.', role: '수사관, 감정인(필적·인장 등 감정).', drama: '단 하나의 사소한 물건이 알리바이를 무너뜨리는 결정적 한 방.', caution: '시대에 없던 과학수사(지문·DNA 등)를 끌어오지 말 것. 시대의 ‘가능한 감정 기술’ 안에서 설계하라.' },
      { name: '필적·인장·문서감정', era: '문서행정 사회', what: '글씨·도장·서명의 진위를 가려 위조를 잡는 기술. 계약·유언·고변서의 진위가 사건의 축이 된다.', process: '대조 문서와 필체·인영(印影)을 비교하고, 종이·먹·봉인의 상태로 시기를 따진다.', role: '감정인, 서리, 인장을 관리하는 관헌.', drama: '“위조된 유언장 한 장” — 상속·반역 누명의 단골 장치. 미세한 흔적이 위조를 폭로.', caution: '인장·수결(서명) 문화는 지역마다 다르다(동아시아 인장 vs 서양 봉랍). 무대에 맞게 쓸 것.' },
      { name: '현상수배·추적', era: '전 시대', what: '도주한 범인을 잡기 위한 공지·추격. 방(榜)을 붙이거나 포스터를 돌리고 현상금을 건다.', process: '인상착의·죄목을 알려 제보·체포를 유도. 역참·관문·검문으로 도주로를 좁힌다.', role: '관헌, 현상금 사냥꾼, 제보하는 민(民).', drama: '“쫓는 자와 쫓기는 자” — 누명을 쓰고 도망치며 진범을 찾는 추격 스릴러의 골격.', caution: '통신·신원확인 수단이 시대를 좌우한다. 사진 없는 시대엔 ‘인상착의 묘사’와 ‘아는 얼굴’이 전부다.' },
    ],
  },
  {
    key: 'punish', label: '형벌·처벌', icon: '⛓️',
    note: '죄에 대한 ‘대가’의 카탈로그. 형벌의 종류·강도는 그 사회가 무엇을 두려워하는지를 드러낸다.',
    items: [
      { name: '사형(극형)', era: '전 시대', what: '생명을 거두는 최고형. 방식(참수·교수·능지 등)과 ‘공개 여부’가 시대·문화를 드러낸다.', process: '선고 → (상소·재가) → 집행. 공개 처형은 ‘본보기’로서 군중 앞에서 이뤄지곤 했다.', role: '집행인(망나니·사형집행관), 형장 관리, 입회 관헌.', drama: '“집행 직전의 사면”·“억울한 처형” — 시간과의 사투, 진실 규명의 데드라인.', caution: '집행 방식·예법(마지막 진술, 형장 절차)은 시대마다 엄격히 달랐다. 막연히 그리지 말고 무대에 맞출 것.' },
      { name: '유배·추방', era: '전 시대', what: '죄인을 본거지에서 떼어 멀리 보내는 형. 신체를 해치지 않으나 사회적 죽음에 가깝다.', process: '거리·기한·동반 여부를 정해 격리지로 보낸다(절도·위리안치 등 강도 차이). 감시·보고가 따른다.', role: '압송 관헌, 유배지 감독관, 배소(配所)의 향리.', drama: '“멀리 쫓겨난 자의 재기 혹은 몰락” — 유배지에서의 사색·음모·귀환의 서사.', caution: '유배는 ‘자유로운 여행’이 아니다. 거주·이동 제한, 감시, 가산 몰수 등 제약을 함께 그릴 것.' },
      { name: '태형·장형(신체형)', era: '전근대', what: '곤장·매로 신체에 고통을 가하는 형. 가벼운 죄의 단골이며 횟수로 강도를 정한다.', process: '죄목에 따라 매의 종류·횟수가 정해진다. 집행 중 부상·사망도 드물지 않았다.', role: '형리(집행), 입회 관원, 형구 관리자.', drama: '“매 앞에서 무너지는 거짓 자백” 또는 “끝까지 버티는 의기” — 고통 앞 인간의 민낯.', caution: '횟수·도구가 죄와 신분에 따라 규정돼 있었다. ‘무제한 구타’처럼 묘사하면 제도가 아니라 사적 폭력이 된다.' },
      { name: '벌금·배상·속전(贖錢)', era: '전 시대', what: '돈·재물로 죄를 갚거나 형을 대신하는 제도. 피해 배상과 ‘속죄금’ 성격이 섞인다.', process: '피해 산정 → 배상액·속전 부과. 가진 자는 형을 면하고 못 가진 자는 몸으로 갚는 불평등이 흔했다.', role: '판관, 산정인(피해 평가), 징수 관헌.', drama: '“돈이면 형을 면한다”는 구조가 빈부의 분노를 키운다 — 정의가 거래되는 세계.', caution: '속전·배상의 ‘차별’을 지우지 말 것. 같은 죄도 신분·재산에 따라 결과가 갈리는 게 시대의 진실.' },
      { name: '낙인·신체 표지·명예형', era: '전근대', what: '몸에 표식을 새기거나 군중 앞에 세워 ‘평판’을 망가뜨리는 형(낙인, 칼·차꼬를 씌워 조리돌림 등).', process: '공개된 장소에서 표식을 가하거나 망신을 주어 공동체의 기억에 죄를 각인한다.', role: '집행 관헌, 구경하는 군중(처벌의 일부).', drama: '“지울 수 없는 표식을 안고 사는 자” — 과거의 죄가 평생 따라붙는 낙인의 비극.', caution: '명예형은 ‘공동체가 보는 앞’이 핵심이다. 사적·은밀한 처벌로 그리면 제도의 의미가 사라진다.' },
      { name: '연좌·가족 처벌', era: '전근대(특히 중대 범죄)', what: '죄인 본인을 넘어 가족·일족까지 처벌하는 제도. 반역 등 ‘체제 위협’에 특히 가혹했다.', process: '본인 처형에 더해 가족의 노비화·유배·재산 몰수가 따른다(삼족·구족 등 범위 차).', role: '국가 권력(연좌 적용), 가문·향촌(낙인 부담).', drama: '“나 하나의 선택이 핏줄 전체를 멸한다” — 충(忠)과 효(孝), 가문과 양심의 비극적 충돌.', caution: '연좌는 근대 형법의 ‘책임 개인주의’와 정반대다. 현대 배경에 연좌를 적용하면 명백한 시대 착오.' },
      { name: '강제노역·복역', era: '전 시대~현대', what: '노동으로 죗값을 치르게 하는 형(관노·도형·강제노동, 근대 이후 징역).', process: '기간·노역 종류를 정해 시설·관청·공역에 투입한다. 근대 이후 ‘교화·갱생’ 명분이 더해진다.', role: '교도 관헌, 감독관, 동료 수형자.', drama: '“노역장 안의 작은 사회” — 위계·뒷거래·우정·탈주가 얽히는 폐쇄 세계의 서사.', caution: '전근대의 도형(徒刑)과 근대의 징역은 이념이 다르다(응보 vs 교화). 시대 정신을 섞지 말 것.' },
    ],
  },
  {
    key: 'prison', label: '구금·감옥·교정', icon: '🔒',
    note: '“가두는 공간”의 변천. 옥은 단순한 배경이 아니라 권력·공포·인간성을 압축한 무대다.',
    items: [
      { name: '미결 구류(옥·뇌옥)', era: '전근대', what: '재판·처형 전까지 ‘잠시 가두는’ 시설. 전근대엔 옥살이 자체가 ‘형’이라기보다 대기·신문의 공간이었다.', process: '체포 후 옥에 가두고 신문·재판을 기다린다. 환경이 열악해 옥중 사망도 흔했다.', role: '옥리·옥졸(간수), 옥바라지(가족·외부 조력), 신문관.', drama: '“옥 안에서 진실을 캐는 자” — 갇힌 채 사람을 모으고 음모를 풀어가는 밀폐극.', caution: '전근대에 ‘징역 N년’ 개념을 넣지 말 것. 옥은 형 집행지가 아니라 주로 미결·신문의 장소였다.' },
      { name: '근대 교도소(감옥 개혁)', era: '근대 이후', what: '응보를 넘어 ‘교화·규율’을 표방한 시설. 감시·격리·노동·시간표로 죄수를 ‘개조’하려 한다.', process: '수형 분류 → 규율·노역·교정 프로그램 → 가석방 심사. 독방·집단방 운영이 통제의 핵심.', role: '교도관, 소장, 교화·의료 인력, 수형자 위계.', drama: '“교화라는 이름의 통제” — 감시 시스템 속에서 인간성을 지키거나 무너지는 이야기.', caution: '근대 교도소의 ‘규율·감시’ 이념을 전근대 옥에 투영하지 말 것. 둘은 목적부터 다르다.' },
      { name: '미결·기결의 구분', era: '근현대', what: '재판이 끝나지 않은 ‘미결수’와 형이 확정된 ‘기결수’를 다르게 처우하는 원칙.', process: '미결수는 무죄추정에 따라 (이론상) 권리가 더 보장된다. 면회·서신·처우 규정이 갈린다.', role: '교정 당국, 변호인(접견권), 수용자.', drama: '“아직 유죄가 아닌데 갇혀 있다” — 무죄추정과 구금 현실의 모순이 빚는 분노.', caution: '근대 이전엔 이 구분이 모호하다. 현대 법정·교정물에서만 정확히 적용할 개념.' },
      { name: '면회·서신·외부 소통', era: '전 시대~현대', what: '갇힌 자와 바깥을 잇는 통로. 정보·물자·마음이 오가는 ‘생명선’이자 음모의 채널.', process: '허가·검열을 거쳐 면회·서신을 허용한다. 전근대엔 가족의 옥바라지가 생존을 좌우했다.', role: '교도/옥 관헌(검열), 가족·동지, 변호인.', drama: '“검열을 뚫는 암호 편지” — 갇힌 주인공이 바깥 세력과 공모해 판을 뒤집는 장치.', caution: '소통의 ‘검열·차단’ 강도가 시대·체제를 드러낸다. 자유로운 면회로 그리면 긴장이 사라진다.' },
      { name: '탈옥·구출', era: '전 시대', what: '갇힌 자가 빠져나오거나 외부가 빼내는 사건. 시설의 허점·내부 협력·바깥의 공모가 얽힌다.', process: '구조 파악 → 도구·시간 확보 → 내부 매수/혼란 → 도주로. 추격·은신이 뒤따른다.', role: '탈주자, 내통자(매수된 간수 등), 추격 관헌.', drama: '치밀한 계획과 단 하나의 변수 — 탈옥은 그 자체로 한 편의 서스펜스.', caution: '시대의 ‘잠금·감시 수단’ 안에서 설계할 것(자물쇠·열쇠·인원 점호). 현대 보안을 전근대에 넣지 말 것.' },
      { name: '사면·감형·복권', era: '전 시대', what: '권력이 형을 면제·경감하거나 빼앗긴 신분·권리를 되돌려주는 은전(恩典).', process: '경사·즉위·천재지변 등을 명분으로 대사면을 내리거나 개별 청원으로 감형·복권한다.', role: '군주·최고권력(은사 권한), 청원하는 가족·동지.', drama: '“집행 직전의 사면장”·“복권을 향한 긴 싸움” — 희망과 절망이 교차하는 결말의 카드.', caution: '사면은 ‘무죄 증명’이 아니라 ‘권력의 은전’이다. 둘을 혼동하면 인물의 명예 회복 서사가 어긋난다.' },
    ],
  },
  {
    key: 'concept', label: '죄·법 개념·법리', icon: '🧩',
    note: '대사와 논쟁의 ‘재료’. 개념을 정확히 쓰면 법정 대사가 단숨에 그럴듯해진다.',
    items: [
      { name: '고의·과실', era: '근현대 형법', what: '‘일부러 했는가(고의)’와 ‘부주의로 그리됐는가(과실)’를 가르는 핵심 구분 — 죄질과 형량을 좌우한다.', process: '같은 결과(사망 등)라도 고의면 무겁게, 과실이면 가볍게. ‘미필적 고의’ 같은 회색지대가 다툼의 핵심.', role: '검사(고의 입증), 변호인(과실로 다툼), 판사.', drama: '“죽이려 한 게 아니었다” — 마음속 의도를 둘러싼 법정의 진실 게임.', caution: '고의·과실의 정교한 구분은 근대 형법의 산물이다. 고대·중세엔 결과 중심 처벌이 더 흔했음을 기억할 것.' },
      { name: '정당방위·긴급피난', era: '근현대(원형은 고대부터)', what: '부당한 침해를 막기 위한 행위는 처벌하지 않거나 줄인다는 법리. ‘방위의 한계’가 늘 쟁점.', process: '침해의 현재성·부당성·방위의 상당성을 따진다. ‘지나친 방어(과잉방위)’는 다시 문제가 된다.', role: '피고인(방위 주장), 검사(과잉 주장), 판사.', drama: '“정당한 방어였나, 과한 복수였나” — 피해자가 가해자가 되는 순간의 윤리적 회색지대.', caution: '“위협받았으니 무조건 무죄”가 아니다. 비례·한계라는 까다로운 기준을 무시하면 법리가 망가진다.' },
      { name: '공소시효·시간', era: '근현대', what: '일정 기간이 지나면 더는 기소할 수 없게 하는 제도 — 진실이 ‘시간에 묻히는’ 장치.', process: '범죄 종류별로 기간이 다르고, 도주 등으로 정지·연장되기도. 시효 완성은 처벌 자체를 막는다.', role: '검사(시효 내 기소), 피의자(시효 도과 주장).', drama: '“시효 만료 직전, 진범이 밝혀진다” — 시간을 다투는 추적의 강력한 데드라인 장치.', caution: '시효는 근대 제도다. 또 중대 범죄는 시효가 없거나 폐지되기도 하니, 무대의 규칙을 정해두고 쓸 것.' },
      { name: '반역·대역(국사범)', era: '전 시대', what: '체제·군주를 위협하는 죄. 어느 시대든 가장 무겁게 다뤄졌고 절차마저 특별했다.', process: '특별 신문·연좌·공개 처형 등 ‘본보기’로 운영. 밀고·고변이 사건의 출발점이 되곤 한다.', role: '국가권력, 밀고자, 특별 심문관.', drama: '“충신인가 역적인가” — 누명·정치 숙청·억울한 멸문의 비극이 집약되는 소재.', caution: '국사범은 일반 범죄와 절차·형벌이 달랐다(가혹·신속). 일반 형사 절차로 그리면 무게가 빠진다.' },
      { name: '명예·무고·위증', era: '전 시대', what: '거짓 고발(무고), 거짓 증언(위증), 평판 훼손을 다루는 죄. ‘말이 무기’가 되는 세계의 균형추.', process: '무고·위증이 드러나면 흔히 그 죄에 해당하는 벌을 거꾸로 받는 ‘반좌(反坐)’식 처벌도 있었다.', role: '무고자/위증자, 피해자, 진위를 가리는 관헌.', drama: '“거짓 고발로 시작된 파멸” 그리고 “진실이 밝혀져 뒤집히는 처벌” — 정의 회복의 카타르시스.', caution: '무고·위증의 ‘되갚음 처벌’ 강도는 시대마다 다르다. 막연한 훈방으로 끝내면 긴장이 풀린다.' },
      { name: '계약·채무·민사', era: '전 시대', what: '사람 사이의 약속·빚·재산 다툼. 형사(처벌)와 달리 ‘손해 회복·이행’이 목적이다.', process: '증서·증인으로 약속을 입증하고, 이행·배상·담보 실행으로 분쟁을 푼다. 못 갚으면 노역·구금으로 번지기도.', role: '채권자·채무자, 보증인, 중재인·판관.', drama: '“빚이 사람을 옭아매는” 채무노예·담보 잡힌 가족 — 돈이 자유를 거래하는 비극.', caution: '민사와 형사를 뭉뚱그리지 말 것. 다만 전근대엔 둘의 경계가 흐려 ‘빚→투옥’이 가능했음을 활용할 수 있다.' },
    ],
  },
]

const LS = 'sry:tool:law-justice-ref:'
const ALL = '__all__'

type Flat = { cat: CatDef; item: Entry }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 항목 → 단서 묶음(필드 라벨 포함)
const FIELDS: { k: keyof Entry; label: string }[] = [
  { k: 'era', label: '시대·배경' },
  { k: 'what', label: '핵심' },
  { k: 'process', label: '절차·운영' },
  { k: 'role', label: '관여 직역' },
  { k: 'drama', label: '이야기 활용' },
  { k: 'caution', label: '고증·유의' },
]

function plainText(f: Flat): string {
  const lines = [`⚖️ ${f.item.name}  (${f.cat.label})`]
  for (const fd of FIELDS) {
    const v = f.item[fd.k]
    if (v && v !== '—') lines.push(`· ${fd.label}: ${v}`)
  }
  return lines.join('\n')
}

function bodyHtml(f: Flat): string {
  const rows = FIELDS
    .filter((fd) => f.item[fd.k] && f.item[fd.k] !== '—')
    .map((fd) => `<p><b>${escapeHtml(fd.label)}</b>: ${escapeHtml(String(f.item[fd.k]))}</p>`)
    .join('')
  return [
    `<p><b>${escapeHtml(f.cat.icon + ' ' + f.cat.label)} · ${escapeHtml(f.item.name)}</b></p>`,
    rows,
    `<p><i>※ 법정물·사극·스릴러 고증을 위한 창작 참고 자료. 실제 법률 자문이 아닙니다.</i></p>`,
  ].join('')
}

export default function LawJusticeRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 가 오면 안내 힌트로 활용(맥락 활용)
  const genreHint = typeof payload?.genre === 'string' ? (payload.genre as string) : ''

  const [query, setQuery] = useState('')
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
  const favKey = (catKey: string, name: string) => `${catKey}::${name}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base: Flat[] = cat === ALL ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[favKey(c.key, item.name)])
    if (q) {
      base = base.filter(({ cat: c, item }) => {
        if (c.label.toLowerCase().includes(q)) return true
        if (item.name.toLowerCase().includes(q)) return true
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
      if (prev && pool.length > 1 && pick.item.name === prev.item.name && pick.cat.key === prev.cat.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return pick
    })
  }, [cat])

  const toggleFav = (catKey: string, name: string) => {
    const k = favKey(catKey, name)
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

  // 수집함에 담기 — addToStash 대신 스니펫 라이브러리에 저장(글감 보관)
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: `[법·재판 자료] ${plainText(f)}`,
      source: '법·재판·형벌 사전',
      tags: ['법', '재판', '형벌', '고증', f.cat.label, f.item.name],
    })
    flash(`스니펫 라이브러리에 ‘${f.item.name}’ 자료를 저장했습니다.`)
  }

  // 프로젝트 자료에 추가 — addToProject(root:research)
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '법·재판 고증 자료',
      title: `${f.item.name} (${f.cat.label})`,
      bodyHtml: bodyHtml(f),
      meta: { 분류: f.cat.label, 시대배경: f.item.era || '', 관여직역: f.item.role && f.item.role !== '—' ? f.item.role : '' },
    })
    if (id) flash(`프로젝트 자료 〈법·재판 고증 자료〉에 ‘${f.item.name}’을(를) 추가했습니다.`)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  const renderFields = (item: Entry) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
      {FIELDS.filter((fd) => item[fd.k] && item[fd.k] !== '—').map((fd) => (
        <div key={fd.k} style={{ fontSize: 12.5, lineHeight: 1.55 }}>
          <span style={{ color: 'var(--accent)', fontWeight: 600, marginRight: 6 }}>{fd.label}</span>
          <span>{String(item[fd.k])}</span>
        </div>
      ))}
    </div>
  )

  return (
    <div style={wrap}>
      {/* 창작 참고용 명시 — 가장 위에 고정 */}
      <div style={{
        background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)',
        borderRadius: 8, padding: '8px 11px', fontSize: 12, lineHeight: 1.55, color: 'var(--muted)',
      }}>
        <Emoji e="⚖️" /> <b style={{ color: 'var(--text)' }}>창작 고증 자료</b>입니다. 법정물·사극·스릴러의 ‘법·재판·형벌·수사·감옥’ 묘사를 위한
        서사용 설정 단서이며, 실제 법률 자문이나 특정 사건 정보가 아닙니다. 시대·문화 배경에 맞춰 각색해 쓰세요.
      </div>

      <div style={hint}>
        법체계·재판 절차·법조 직역·수사/검시·형벌·감옥·법리 등 <b>{total}개</b> 항목을 카테고리로 정리했습니다.
        검색·펼침으로 찾고, 무작위로 영감을 얻고, 클릭해 복사하거나 스니펫·프로젝트로 보내세요.
        {genreHint ? <>  (전달된 맥락: <b>{genreHint}</b>)</> : null}
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="제도·절차·직역·형벌로 검색 (예: 배심, 검시, 유배, 무죄추정, 어사)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL)} aria-pressed={cat === ALL}
          style={{ borderColor: cat === ALL ? 'var(--accent)' : 'var(--border)', color: cat === ALL ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🗂️" /> 전체
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
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 자료</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 카테고리 설명 */}
      {cat !== ALL && (() => {
        const c = CATS.find((x) => x.key === cat)
        return c?.note ? (
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, borderLeft: '2px solid var(--border)', paddingLeft: 9 }}>
            <Emoji e={c.icon} /> {emojify(c.note)}
          </div>
        ) : null
      })()}

      {/* 무작위 결과 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          {renderFields(random.item)}
          <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(plainText(random), 'rnd')}>
              {copiedKey === 'rnd' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
            </button>
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="📎" /> 스니펫 저장</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>
              {favs[favKey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => toProject(random)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 자료를 프로젝트 자료 〈법·재판 고증 자료〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('historical-era-ref')} title="시대·역사 사전 열기"><Emoji e="🏺" /> 시대·역사 사전</button>
            <button className="linkbtn" onClick={() => openToolLinked('professions-ref')} title="직업·직역 사전 열기"><Emoji e="🧑‍💼" /> 직업·직역 사전</button>
            <button className="linkbtn" onClick={() => openToolLinked('event-timeline')} title="사건 연대표 열기(재판·수사 흐름 정리)"><Emoji e="🕰️" /> 사건 연대표</button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5 }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록(펼침형) */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 자료가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const fk = favKey(c.key, item.name)
            const open = !!expanded[fk]
            const isFav = !!favs[fk]
            return (
              <div key={fk} style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /> {c.label}</span>
                  <button onClick={() => toggleExpand(fk)} title={open ? '접기' : '펼치기'}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', fontSize: 15, fontWeight: 700, textAlign: 'left' }}>
                    {open ? '▾' : '▸'} {item.name}
                  </button>
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(c.key, item.name)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                {!open && (item.what || item.era) && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.era ? <span style={{ color: 'var(--accent)' }}>[{item.era}] </span> : null}{item.what}
                  </div>
                )}
                {open && renderFields(item)}
                {open && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
                    <button className="minibtn" onClick={() => copy(plainText({ cat: c, item }), 'item:' + fk)}>
                      {copiedKey === 'item:' + fk ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
                    </button>
                    <button className="minibtn" onClick={() => saveSnippet({ cat: c, item })}><Emoji e="📎" /> 스니펫 저장</button>
                    <button className="linkbtn" onClick={() => toProject({ cat: c, item })} disabled={!hasProjectBridge()}
                      title={hasProjectBridge() ? '프로젝트 자료에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                      <Emoji e="📄" /> 프로젝트에 추가
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>자료는 정답이 아니라 출발점입니다. 같은 죄도 ‘어느 시대, 어떤 법체계, 누구의 법정’이냐에 따라 결과가 달라집니다 — 그 간극을 갈등의 씨앗으로 삼으세요.</div>
    </div>
  )
}
