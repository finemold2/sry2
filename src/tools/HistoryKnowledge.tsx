// 역사·사극 장르 지식·소재 사전 — 하위장르·대표작 계보·독자 기대(필수 관습)·서사 장치·
//  전개/페이싱·클라이맥스 관습·특수 어휘(궁중어/관직/시대명사)·배경 세계관(왕대·정치지형·신분·
//  경제·공간·대외관계·사상)·흔한 함정(시대착오/호칭오류 등)·웹소설(회귀빙의) 관습을
//  카테고리로 묶은 로컬 사전. 도시에 근거한 역사·사극 특화 자작 데이터(범용 글쓰기 일반론 배제).
// 자급식: 외부 네트워크·라이브러리 없음. react + './linkbus' 만 사용.
//  localStorage 로 펼침/즐겨찾기/마지막 카테고리 영속. 언마운트 정리.
import { useState, useEffect, useMemo, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'history-knowledge', name: '역사·사극 지식 사전', icon: '🏯', group: '지식 사전', genre: '역사·사극', intro: '역사·사극에서 자주 쓰는 소재·설정·서사 장치·궁중어·고증 지식을 카테고리로 찾아 시대 장면에 심으세요', w: 680, h: 660 }

interface Entry { name: string; desc: string; tip?: string }
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ─────────────────────────────────────────────────────────────────────────────
// 역사·사극 도시에 기반 자작 지식 사전 — 13개 카테고리, 합계 180개 항목.
// 데이터는 전부 역사·사극 장르에 특화·구체적(조선 중심 + 대체역사/회귀빙의/궁중물).
// 범용 글쓰기 조언·일반론은 배제.
// ─────────────────────────────────────────────────────────────────────────────
const CATS: CatDef[] = [
  {
    key: 'subgenre', label: '하위 장르', icon: '🗂️', note: '무대와 고증 강도가 갈라지는 1차 분기. 어느 갈래인지 정하면 고증 부담·미래지식 사용·로맨스 비중이 따라온다.',
    items: [
      { name: '정통 역사소설', desc: '실존 인물·사건 중심, 고증 비중이 가장 높다. 사실의 빈틈을 상상으로 메운다. 김훈 『칼의 노래』·『남한산성』, 박경리 『토지』, 황석영 『장길산』 계보.', tip: '고증을 어겼다는 의심이 한 번 들면 몰입이 깨진다. 사료의 "빈칸"만 상상으로 채우고, 채워진 자리에 인물의 내면을 부어라.' },
      { name: '사극(드라마형)·궁중물', desc: '권력투쟁·당쟁·궁중암투가 핵심. 대중성이 강하고 정치 음모와 인물 멜로가 결합. 『뿌리깊은 나무』『정도전』『대장금』『육룡이 나르샤』.', tip: '갈등의 엔진은 "권력의 작동 원리"다 — 왕권 vs 신권, 외척, 환관을 갈등 축으로 깔고 어전 설전을 클라이맥스 단위로 써라.' },
      { name: '대체역사(Alternate History)', desc: '"만약 그때 ~했다면"의 분기. 임진왜란 승전, 조선 근대화, 병자호란 방어 등. 복거일 『비명을 찾아서』가 한국 대체역사의 효시.', tip: '분기점 이후의 "나비효과"를 일관되게 관리하라. 역사를 바꿨는데 이후 사건이 원래대로 흘러가면 치명적 모순이다.' },
      { name: '회귀·빙의 사극(웹소설 주류)', desc: '현대인이 과거 인물에 빙의/회귀해 역사를 바꾸거나 출세. 미래 지식의 "지식 격차"가 핵심 무기. 『조선 셰프 강주방』『철혈대공』류.', tip: '미래지식은 만능이 아니다 — 원료·장인·자본·정치 반발이라는 "구현 제약"을 반드시 걸어야 사이다와 개연성이 균형 잡힌다.' },
      { name: '퓨전 사극·가상왕조', desc: '실존 국가를 모델로 한 가상 왕조(대월·가상 조선)로 고증 부담을 회피. 정치+로맨스+성장의 결합이 자유롭다.', tip: '고증의 족쇄는 풀되 "시대 공기"는 유지하라 — 신분제·예법·정치구조의 무게가 빠지면 그냥 현대극이 된다.' },
      { name: '로맨스 사극(궁중 로맨스)', desc: '왕·세자·무관과의 로맨스. 신분 격차, 후궁 간택, 정략혼이 장애물이자 동력. 간택·외척의 부상으로 권력도가 흔들린다.', tip: '신분 격차를 "극복할 과제"로 명확히 세워라. 제약 없이 자유로운 연애는 시대감을 무너뜨린다.' },
      { name: '무협·역사 혼합', desc: '중원 배경 혹은 조선 배경의 무림. 임진왜란·사화 같은 역사적 사건을 무림 음모로 재해석. 정사(正史)와 비사(秘史)의 이중구조.', tip: '실제 사건의 "표면"은 사서대로, "이면"은 무림 세력의 암투로 — 두 층위가 맞물릴 때 설득력이 산다.' },
      { name: '대하 가문·민중사', desc: '한 가문 혹은 민중의 부침을 수십 년에 걸쳐 그리는 장편. 박경리 『토지』, 최명희 『혼불』의 풍속·언어 고증의 정점.', tip: '느린 호흡을 두려워 마라 — 풍속·세시·언어의 결을 두텁게 쌓아야 "시대가 살아있는" 대하가 된다.' },
    ],
  },
  {
    key: 'canon', label: '대표작 계보', icon: '📚', note: '서사 문법의 교과서들. "어떤 톤·어떤 구조"를 차용할지 정할 때 좌표가 된다.',
    items: [
      { name: '박종화 『금삼의 피』·『여인천하』', desc: '사극 통념의 원형. 궁중 비사·여인 권력투쟁(폐비 윤씨, 문정왕후)의 드라마를 정립했다.', tip: '"여인천하"형 구도 — 후궁·대비·외척이 왕을 둘러싸고 벌이는 음모를 차용할 때 원전으로.' },
      { name: '김훈 『칼의 노래』·『남한산성』', desc: '내면 독백형, 패배의 미학, 문장미의 정점. 이순신·인조의 절망을 만연체로 그린다.', tip: '승리가 아니라 "장렬한 패배·고뇌"를 절정으로 삼는 정통형의 톤. 카타르시스를 비애로 처리하고 싶을 때.' },
      { name: '이환경 『용의 눈물』·『태조 왕건』', desc: '정치·전쟁 대하의 표준. 권모술수와 명분, 군상극의 문법을 대중 사극에 정착시켰다.', tip: '다수 인물의 정치 군상극을 굴릴 때 — 각 인물에게 "명분"을 쥐여 주고 충돌시키는 방식이 핵심.' },
      { name: '김영현·박상연 『뿌리깊은 나무』·『육룡이 나르샤』', desc: '팩션(faction)의 모범. 가상 인물 + 실존 사건·인물을 결합해 고증과 상상의 균형을 잡았다.', tip: '실존 사건의 "빈 곳"에 가상 주인공을 끼워 넣는 팩션 기법 — 세종·정도전 곁의 무명 인물로 시점을 잡아 보라.' },
      { name: '드라마 『정도전』', desc: '정치 논쟁·대사극의 정수. 어전·사랑방의 설전, 명분과 노선의 대립을 말의 전쟁으로 시각화했다.', tip: '"말의 클라이맥스"를 쓰고 싶을 때 — 논리·고사·명분으로 상대를 제압하는 장면의 교본.' },
      { name: '복거일 『비명을 찾아서』', desc: '한국 대체역사의 효시. 일제가 패망하지 않은 세계라는 분기 설정으로 장르의 문을 열었다.', tip: '대체역사의 "분기점 + 일관된 후속 세계" 설계가 무엇인지 보여 주는 원전.' },
      { name: '시바 료타로·『대망(도쿠가와 이에야스)』', desc: '일본 대하역사·전국시대 권모술수의 바이블. 인내·책략·천하 경영의 장기 서사.', tip: '"긴 호흡으로 천하를 도모하는" 책략가형 주인공을 그릴 때 차용. 인내가 곧 무기인 캐릭터.' },
      { name: '켄 폴릿 『대지의 기둥』·미첼 『바람과 함께 사라지다』', desc: '시대 격변 + 개인사의 결합. 거대한 역사적 사건에 평범한 개인의 운명을 얽는 서구 역사소설의 표준.', tip: '"거대 사건과 개인의 교차"를 설계할 때 — 전쟁·혁명을 배경이 아니라 인물의 삶을 짓이기는 힘으로 써라.' },
      { name: '힐러리 맨틀 『울프 홀』', desc: '권력 내부의 심리극. 크롬웰의 시점으로 튜더 궁정의 음모를 내밀하게 그렸다.', tip: '권력자 곁의 "실무 책략가" 시점 — 정상이 아니라 그 옆에서 판을 짜는 인물의 내면극을 원할 때.' },
      { name: '중국 궁투(宮鬪) 『견환전』·『랑야방』', desc: '궁중암투·복수극의 현대적 표준. 후궁들의 권력 게임, 신분을 숨긴 복수자의 치밀한 설계.', tip: '"가려진 정체 + 단계적 복수"의 궁중 정치극을 쓸 때 — 정보전·포섭·역공의 사이클을 참조하라.' },
    ],
  },
  {
    key: 'expectation', label: '독자 기대·필수 관습', icon: '⚖️', note: '충족 못 하면 이탈하는 장르 계약. 이 장르가 "역사·사극처럼" 느껴지게 만드는 절대 조건들.',
    items: [
      { name: '시대 공기(時代感)', desc: '의식주·언어·신분 규범이 "그 시대처럼" 느껴져야 한다. 고증 오류는 즉시 몰입을 파괴한다.', tip: '대사 한 줄, 소품 하나에도 "이 시대에 있었나"를 자문하라. 시대감은 큰 사건이 아니라 디테일에서 산다.' },
      { name: '권력의 작동 원리', desc: '왕권 vs 신권, 당쟁, 외척, 환관, 사림/훈구. 정치 구조 자체가 갈등의 엔진이다.', tip: '왕을 만능 독재자로 그리지 마라 — 신권·언관·예법에 강하게 제약받는 권력의 견제 메커니즘을 갈등으로 써라.' },
      { name: '신분제의 무게', desc: '양반/중인/상민/천민, 적서차별, 여성의 제약. 주인공의 행동에 늘 신분의 족쇄가 걸려야 긴장이 산다.', tip: '천민·서얼·여성이 제약 없이 활약하면 시대감이 붕괴한다. 신분의 벽을 "극복 과제"로 만들어 긴장을 뽑아내라.' },
      { name: '거대 사건과 개인의 교차', desc: '임진왜란·병자호란·사화·반정 같은 실제 사건에 주인공이 얽힌다. 역사의 격류에 휩쓸리는 개인.', tip: '실제 사건을 배경 장식이 아니라 인물의 운명을 결정하는 힘으로 써라. 인물이 사건에 "참여"하게 하라.' },
      { name: '명분과 의리', desc: '인물의 동기는 충(忠)·효(孝)·의(義)·대의명분으로 정당화되거나 그것과 충돌해야 설득력을 얻는다.', tip: '악역에게도 "그 나름의 명분"을 줘라. 명분 없는 행동은 현대인의 사고가 시대에 침투한 것처럼 보인다.' },
      { name: '운명의 무게(기지의 결말)', desc: '독자는 결말(인물의 죽음·왕조의 향방)을 이미 아는 경우가 많다. "어떻게 그 결말에 이르는가"의 과정미가 핵심.', tip: '결말을 숨기려 애쓰지 말고 "과정"으로 승부하라 — 단종의 비극, 이순신의 전사는 알면서도 가슴이 미어지게.' },
      { name: '(웹소설형) 사이다', desc: '미래지식·신무기·개혁으로 적폐를 응징하는 통쾌함. 단, 고증·개연성과의 줄다리기가 필수.', tip: '3~5화당 1회 명확한 응징/역전을 배치하되, 너무 잦으면 가벼워지고 너무 드물면 이탈한다. 보상(관직·재물·인정)을 명확히.' },
      { name: '사료적 사실감', desc: '실록·장계·상소문·간찰의 질감, 시진·간지·절기의 시간 감각. 독자는 "기록된 세계"의 무게를 기대한다.', tip: '장 도입부에 "○년 ○월 실록 기사"를 한 줄 삽입하는 것만으로 사실감이 확 산다. 다만 과용하면 교과서가 된다.' },
    ],
  },
  {
    key: 'device', label: '서사 장치', icon: '🎭', note: '역사·사극을 "역사·사극답게" 굴리는 엔진들. 장면 단위로 꺼내 쓰는 핵심 자산.',
    items: [
      { name: '드라마틱 아이러니(역사적 운명)', desc: '독자는 결말을 알고 인물은 모른다. 단종의 비극, 이순신의 전사. "관객만 아는 비극"으로 긴장·비애를 증폭.', tip: '인물이 희망을 품을수록 독자는 결말을 알기에 더 아프다. 평범한 일상 장면조차 "곧 닥칠 운명"으로 물들여라.' },
      { name: '미래지식(무기로서의 예지)', desc: '회귀/빙의물의 핵심. 화약 배합·이앙법·종두법·측우기·화폐개혁·환국 예측. 미래 지식이 신분과 자본을 뒤집는다.', tip: '"왜 지금 가능한가"의 제약을 반드시 걸어라 — 지식만으로 즉시 구현되는 비약은 만능주의로 김이 샌다.' },
      { name: '사료 인용·기록 장치', desc: '실록·장계·상소문·간찰(편지)을 본문에 인용해 사실감을 부여. 장 도입부 "실록 기사" 삽입 기법.', tip: '인용은 "사실의 닻"이다 — 한 문단의 사료체 인용 뒤에 인물의 내면을 풀면 허구가 사실처럼 뿌리내린다.' },
      { name: '상소·어전회의 설전', desc: '갈등을 "말의 전쟁"으로 시각화. 논리·명분·고사(故事) 인용으로 상대를 제압하는 장면이 클라이맥스 단위로 기능.', tip: '결정타 한 줄(왕의 윤허, 결정적 증거 제시)을 준비해 두고, 그 한 줄을 위해 설전 전체를 빌드업하라.' },
      { name: '반정·역모 플롯엔진', desc: '거사 모의 → 명분 축적 → 포섭 → 거병 → 정변. 정보전·배신·타이밍이 서스펜스의 축.', tip: '"지면 가문이 멸한다"의 판돈을 깔아라. 거사 당일의 시간 압박과 한 명의 배신자가 최고의 긴장을 만든다.' },
      { name: '간택·정략혼', desc: '인물 배치와 동맹 재편 장치. 후궁·외척의 부상으로 권력도가 바뀐다. 혼사가 곧 정치다.', tip: '혼인을 로맨스로만 쓰지 마라 — 누구와 맺어지느냐로 세력 판도가 뒤집히는 "정치적 사건"으로 다뤄라.' },
      { name: '밀지·교지·옥새(맥거핀)', desc: '권력의 정당성을 상징하는 물건. 위조·탈취·해석 다툼이 플롯을 추동한다.', tip: '옥새를 가진 자가 정통이다 — 진위·소유·해석을 둘러싼 다툼을 정변의 핵심 쟁점으로 박아라.' },
      { name: '연좌·삼족·사약', desc: '패배의 비용을 극대화하는 장치. "지면 죽는다"가 아니라 "지면 가문이 멸한다"로 판돈을 올린다.', tip: '주인공의 선택에 가족·문중의 목숨을 걸어라 — 개인의 위험보다 연좌의 공포가 결정을 무겁게 만든다.' },
      { name: '장계·파발·봉수(정보 지연)', desc: '정보 전달의 지연을 활용한 서스펜스. 소식이 늦게 닿거나, 거짓 보고가 올라가는 함정.', tip: '"왕은 아직 모른다"의 시간차를 써라 — 변방의 패전 소식이 도성에 닿기까지의 공백이 긴장을 만든다.' },
      { name: '신분 위장·암행', desc: '미행·암행어사·잠행하는 왕. 정체 탄로의 긴장. 신분을 숨긴 자의 이중생활.', tip: '정체가 들통날 위기를 곳곳에 깔아라 — 호패·말투·손의 굳은살 같은 사소한 단서가 탄로의 트리거가 된다.' },
      { name: '고사·경전 인용 화법', desc: '인물이 사서삼경·중국 고사를 인용해 주장을 정당화. 시대 지성의 재현이자 설전의 무기.', tip: '인용은 "그 시대 지식인의 사고방식"을 드러낸다 — 다만 남발하면 현학적이 되니 결정적 한 방으로 아껴라.' },
      { name: '예언·도참·천기', desc: '도참설·정감록·천문(혜성·일식)으로 왕조의 흥망을 암시. 민심을 흔드는 정치적 무기.', tip: '"별이 떨어졌다", "참언이 돈다"로 거사의 명분과 민심 동요를 동시에 만들어라. 예언의 해석을 권력 다툼의 쟁점으로.' },
    ],
  },
  {
    key: 'structure', label: '전개·페이싱', icon: '🧱', note: '정통/대하형과 웹소설(회귀빙의)형의 구조 패턴. 분기점을 챕터 마일스톤으로 배치한다.',
    items: [
      { name: '[정통] 시대 도입', desc: '시대 배경·주인공의 위치를 제시. 사화·전쟁의 전조(사건의 씨앗)를 깐다. 느린 호흡을 허용.', tip: '풍속·내면·정치 묘사에 분량을 투자하라 — 정통형은 초반의 느림이 후반 격동의 대비를 만든다.' },
      { name: '[정통] 부침의 연속', desc: '상승과 몰락이 반복된다. 인물이 권력에 다가갔다 밀려나고, 사건에 휩쓸렸다 빠져나온다.', tip: '한 번의 직선 상승보다 "올랐다 추락하는" 파동이 대하의 맛이다. 추락의 깊이가 다음 상승의 높이를 만든다.' },
      { name: '[정통] 거대 사건 충돌', desc: '임진왜란·병자호란·반정 같은 거대 사건이 인물의 운명과 정면충돌. 전투·정변에서 속도가 폭발.', tip: '느리게 끌어온 호흡을 여기서 터뜨려라 — 평소의 만연체를 단문의 속도로 전환하면 격동이 살아난다.' },
      { name: '[정통] 운명의 완성', desc: '죽음·승리·몰락으로 닫힌다. 정통형은 승리보다 "장렬한 패배·죽음"이 절정인 경우가 많다.', tip: '카타르시스를 비애로 처리하라 — 이순신의 전사, 단종의 사사처럼 "졌으나 빛나는" 결말의 미학.' },
      { name: '[웹] 빙의/회귀 + 후크(1~5화)', desc: '현대인이 과거에 떨어짐 → 신분·상황 파악 → 미래지식 자각. 첫 화 내 강력한 위기 + 작은 사이다.', tip: '"여기가… 조선?"의 자각과 동시에 누명·하옥·암살 위협 같은 위기를 박아라. 1화에 후크가 없으면 이탈한다.' },
      { name: '[웹] 생존·기반(초반)', desc: '미래지식으로 작은 성과(요리·의술·상업·발명) → 신뢰 획득 → 후원자(왕·대감) 확보.', tip: '큰 개혁 전에 "작은 성공"으로 신뢰부터 쌓아라 — 빙의 직후 곧장 국정을 논하면 개연성이 무너진다.' },
      { name: '[웹] 상승·견제(중반)', desc: '공을 세울수록 적(외척·당파)이 견제. 한 사이클 = 위기 제시 → 미래지식+기지로 역전 → 보상.', tip: '견제 없는 출세는 밋밋하다 — 공을 세울 때마다 그에 비례하는 모함·정쟁의 파고를 일으켜라.' },
      { name: '[웹] 개혁·대업(후반)', desc: '국정 개혁·전쟁 승리·왕조의 운명 전환. 판이 개인에서 국가 단위로 확대된다.', tip: '판돈을 국가 단위로 올리되 초반의 "구현 제약"을 잊지 마라 — 개혁의 반발·부작용을 그려야 무게가 산다.' },
      { name: '역사적 분기점 = 챕터 마일스톤', desc: '사화·반정·외침 같은 분기점을 챕터의 큰 매듭으로 배치. 독자가 "이번엔 역사가 어떻게 바뀌나" 기대하게.', tip: '실제 연표를 작품의 골격으로 깔아라 — 다음 사화·다음 전란을 향해 가는 카운트다운이 동력이 된다.' },
      { name: '사이다 주기 관리', desc: '보통 3~5화당 1회 명확한 응징/역전. 너무 잦으면 가벼워지고, 너무 드물면 이탈한다.', tip: '응징의 "타깃"을 미리 빌드업하라 — 독자가 충분히 미워한 악역일수록 응징의 쾌감이 크다.' },
      { name: '시즌제 = 한 정변/전쟁 단위', desc: '연재 장편은 한 정변·한 전쟁을 한 시즌으로 묶는다. 시즌 끝에 큰 매듭과 다음 떡밥.', tip: '시즌 클라이맥스는 정변/결전으로, 시즌 마지막 장은 다음 위기의 그림자로 닫아라.' },
    ],
  },
  {
    key: 'climax', label: '클라이맥스 관습', icon: '🗡️', note: '역사·사극의 절정 형태들. "말의 전쟁", "정변 당일", "결전", "운명의 수용"의 변주.',
    items: [
      { name: '어전 설전·상소 대결의 끝장', desc: '정적을 명분·증거로 무너뜨리는 "말의 클라이맥스". 결정타 한 줄(왕의 윤허, 결정적 증거)이 승부를 가른다.', tip: '설전의 모든 논리를 결정타 한 줄로 수렴시켜라 — 그 한 줄을 위해 앞의 모든 명분·증거를 깔아 두는 것.' },
      { name: '정변·반정의 당일', desc: '거병 → 궁궐 장악 → 옥새 확보 → 즉위/폐위. 시간 압박형 서스펜스의 정점.', tip: '"새벽까지", "성문이 닫히기 전에"의 시한을 박고, 한 명의 배신·한 통의 늦은 파발로 판을 흔들어라.' },
      { name: '결전(임진·병자형 전투)', desc: '열세 극복, 전술 역전. 미래지식형이면 신무기·진법으로 역전. 명장면 단위로 묘사.', tip: '빌드업에서 심은 지형·신무기·약점을 결전에서 써라 — 갑자기 등장한 비책은 데우스 엑스 마키나로 김이 샌다.' },
      { name: '운명의 수용·비극의 완성', desc: '정통형의 절정. 승리보다 장렬한 패배·죽음(이순신 전사, 단종 사사, 삼배구고두)으로 카타르시스를 비애로 처리.', tip: '독자가 결말을 알아도 "어떻게 받아들이는가"로 승부하라 — 패배를 선택하는 인물의 내면이 절정이 된다.' },
      { name: '신분·정체의 폭로', desc: '숨겨온 출생·정체가 공개되며 권력도가 재편. 서얼이 적자였다, 폐세자가 살아있었다 등.', tip: '폭로의 "증거"(옥쇄·신물·증인)를 미리 깔아라 — 사후에 단서가 들어맞아야 반전이 속임수가 아니다.' },
      { name: '개혁 완수·즉위(웹소설형)', desc: '주인공이 왕이 되거나 권력 정점에 올라 적폐 청산을 공표. 사이다의 최종 형태.', tip: '즉위 자체보다 "그 자리에서 무엇을 바꾸는가"를 보여라 — 정점에 오른 뒤의 첫 명(命)이 작품의 주제를 드러낸다.' },
      { name: '밀지/교지의 결정적 등장', desc: '진짜 옥새·선왕의 밀지·위조의 발각이 정변의 정당성을 단번에 뒤집는다.', tip: '권력의 정통성을 종이 한 장에 걸어라 — 그 종이의 진위가 밝혀지는 순간이 클라이맥스가 된다.' },
      { name: '사약·국문의 절정', desc: '주인공 혹은 핵심 인물이 친국·사사의 벼랑 끝에 선다. 자백 강요와 끝까지 버티는 의기의 대결.', tip: '"불라"는 압박과 "아니 되옵니다"의 버팀이 부딪치는 장면 — 굴복하느냐 죽느냐의 선택을 절정으로 써라.' },
    ],
  },
  {
    key: 'court_speech', label: '호칭·궁중어', icon: '👑', note: '시대 공기를 만드는 핵심 어휘. 호칭 하나만 틀려도 고증 붕괴로 직결되니 신중히.',
    items: [
      { name: '전하 / 저하 / 마마', desc: '전하(殿下)=왕, 저하(邸下)=세자, 마마=왕·왕비·대비 등 왕실 웃어른의 높임. 대비마마·중전마마.', tip: '조선은 제후국이라 왕은 "전하"가 원칙. "폐하"는 황제(대한제국기)에게만 — 이 호칭 하나가 시대를 가른다.' },
      { name: '과인 / 짐 / 신(臣)', desc: '과인(寡人)=왕의 겸칭(덕이 적은 사람), 짐(朕)=황제의 자칭. 신·소신=신하의 자칭.', tip: '조선 왕은 "과인", 대한제국 황제·중국 황제는 "짐". 신하는 왕 앞에서 "신/소신", 더 낮추면 "소인".' },
      { name: '대감 / 영감 / 나리', desc: '대감=정2품 이상 당상관, 영감=종2품~정3품, 나리=당하관·양반 일반의 높임. 도련님·아씨=양반가 자제.', tip: '품계에 따라 호칭이 다르다 — 판서를 "나리"라 부르면 격이 어긋난다. 관직·품계와 호칭을 짝지어 두라.' },
      { name: '통촉하여 주시옵소서', desc: '"깊이 헤아려 주시옵소서"의 뜻. 신하가 왕에게 간언·청원할 때의 정형 표현.', tip: '간언의 클라이맥스에 박는 한 줄. 반복적으로 엎드려 외칠수록 절박함이 산다("거두어 주시옵소서").' },
      { name: '성은이 망극하옵니다', desc: '"임금의 은혜가 끝이 없습니다"의 뜻. 상을 받거나 용서받았을 때의 정형 답례.', tip: '사이다 직후 신하들이 엎드려 외치는 한 줄. "망극(罔極)"은 끝이 없다는 뜻으로 슬픔에도 쓴다(애통망극).' },
      { name: '아니 되옵니다 / 황공하옵니다', desc: '"아니 되옵니다"=강한 반대·만류, "황공하옵니다"=두렵고 송구합니다의 정형.', tip: '어전 설전에서 신하들이 합창처럼 "아니 되옵니다, 전하!"를 외치는 장면은 사극의 단골 — 비틀어 쓰면 신선하다.' },
      { name: '분부 거행하겠나이다 / 명을 받들겠나이다', desc: '왕의 명령을 수행하겠다는 정형 답. "거행"은 명을 받들어 실행함.', tip: '명을 내린 직후의 짧은 답으로 장면을 닫으면 권위의 무게가 산다.' },
      { name: '쇤네 / 소첩 / 소인', desc: '쇤네=종·하인의 자칭, 소첩=여인이 남편·윗사람에게 쓰는 자칭, 소인=신분 낮은 자의 자칭.', tip: '신분에 따라 자칭이 갈린다 — 천민이 "소인"이라 하면 어색할 수 있으니 신분과 자칭을 맞춰라.' },
      { name: '저잣거리 어투 / 반가 어투', desc: '상민의 거친 입말("~합쇼", "~하구먼")과 양반의 격식체("~하시게", "~이오")의 대비.', tip: '계층을 말투로 드러내라 — 한 장면에 양반과 상민이 섞일 때 어투 대비만으로 신분도가 그려진다.' },
    ],
  },
  {
    key: 'office', label: '관직·제도 어휘', icon: '📜', note: '권력 구조를 그리는 명사들. 누가 어느 자리에 있느냐가 곧 세력 판도다.',
    items: [
      { name: '삼정승(영의정·좌의정·우의정)', desc: '의정부의 최고위. 영의정이 수상. "정승"으로 통칭. 국정 운영의 정점이자 당쟁의 핵심 자리.', tip: '주인공이 노리는 "최종 권좌" 혹은 적의 정점으로 배치하라 — 정승 자리를 둘러싼 다툼이 큰 줄기가 된다.' },
      { name: '육조 판서·참판', desc: '이·호·예·병·형·공조의 장관(판서·정2품)과 차관(참판·종2품). 행정 실권의 핵심.', tip: '병조판서=군사, 이조판서=인사. 어느 판서를 쥐느냐로 권력의 성격이 달라진다.' },
      { name: '삼사(사헌부·사간원·홍문관)', desc: '언관·간쟁·문한 기구. 왕과 대신을 견제·탄핵하는 "언론" 권력. 청요직으로 출세의 등용문.', tip: '왕권을 제약하는 견제 장치로 써라 — 삼사의 탄핵·간쟁이 주인공의 발목을 잡거나 무기가 된다.' },
      { name: '승지·도승지', desc: '승정원의 비서. 왕명 출납을 담당. 도승지는 그 수장. 왕의 측근으로 정보의 길목.', tip: '왕과 신하 사이의 "정보 길목"으로 활용 — 밀지·상소가 거치는 자리라 음모의 결절점이 된다.' },
      { name: '관찰사·현감·수령', desc: '관찰사=도(道)의 장관, 현감=현(縣)의 수령. 지방 통치의 권한자. 탐관오리·청백리의 무대.', tip: '지방 에피소드의 권력자 — 부패한 수령 vs 암행어사의 구도는 사극의 단골이다.' },
      { name: '암행어사 / 마패', desc: '왕이 비밀리에 파견한 감찰관. 마패와 봉서를 지니고 "암행어사 출두"로 정체를 드러낸다.', tip: '"출두"는 강력한 사이다 카드 — 신분 위장과 정체 폭로의 긴장을 한 장면에 응축할 수 있다.' },
      { name: '과거(생원·진사·장원)', desc: '관료 등용 시험. 소과(생원·진사) → 대과(문과). 장원=수석. 출세의 정문이자 신분 상승의 사다리.', tip: '주인공의 출세 동력으로 — 다만 양반만 응시 가능하니 서얼·중인 주인공에겐 "응시 자격"부터가 장벽이다.' },
      { name: '삭탈관직·유배·위리안치', desc: '관직 박탈, 귀양, 가시울타리로 가둔 가택연금형 유배. 정쟁 패배의 대가.', tip: '"몰락의 단계"로 써라 — 삭탈관직 → 유배 → 위리안치로 내려갈수록 추락의 깊이가 깊어진다.' },
      { name: '국문·친국·사사(賜死)', desc: '국문=중죄 심문, 친국=왕이 직접 행하는 국문, 사사=사약을 내려 죽임. 정치적 숙청의 절차.', tip: '"지면 죽는다"의 끝을 보여 주는 장치 — 친국의 압박과 사약의 그림자가 정변의 판돈을 극대화한다.' },
      { name: '내관·상궁·환관', desc: '내관·환관=궁중의 거세된 남성 관리, 상궁=궁녀의 우두머리. 왕 곁의 측근이자 정보·음모의 통로.', tip: '권력 주변부의 "보이지 않는 손"으로 — 환관·상궁이 쥔 정보가 정변의 변수가 된다.' },
    ],
  },
  {
    key: 'objects', label: '시대 명사·소품', icon: '🏺', note: '시대 공기를 손에 잡히게 하는 사물들. 소품 하나가 장면의 시대를 증명한다.',
    items: [
      { name: '옥새 / 교지 / 밀지', desc: '옥새=국새(권력의 정통성), 교지=왕의 임명·명령 문서, 밀지=비밀 어명. 권력 정당성의 상징물.', tip: '맥거핀으로 최적 — 진짜냐 위조냐, 누가 쥐었느냐가 정변의 핵심 쟁점이 된다.' },
      { name: '상소 / 장계 / 간찰', desc: '상소=신하가 왕에게 올리는 글, 장계=지방관·장수의 보고서, 간찰=사사로운 편지.', tip: '정보의 매개로 써라 — 가로챈 간찰 한 통, 늦게 도착한 장계 하나가 플롯을 비튼다.' },
      { name: '호패 / 마패', desc: '호패=신분증명 패(이름·신분), 마패=역마 징발 증표(암행어사의 신표).', tip: '신분 위장물의 약점 — 호패 검문이 정체 탄로의 트리거가, 마패가 정체 폭로의 카드가 된다.' },
      { name: '곤룡포 / 익선관 / 어진', desc: '곤룡포=왕의 정복(용 무늬), 익선관=왕의 관모, 어진=왕의 초상화. 왕권의 시각적 상징.', tip: '의복·관모로 인물의 신분과 권위를 즉각 드러내라 — 곤룡포를 입는/벗는 행위 자체가 즉위/폐위의 상징.' },
      { name: '당상관·당하관 (관복 색)', desc: '관복의 색·흉배로 품계를 표시(당상관 붉은빛, 당하관 푸른빛 등). 색이 곧 권력의 표식.', tip: '복식의 색·장신구로 신분을 그려라 — 의복 묘사 한 줄로 인물의 위계를 독자에게 전달할 수 있다.' },
      { name: '봉수 / 파발', desc: '봉수=산봉우리 불·연기 신호망, 파발=말·사람을 통한 긴급 통신. 정보 전달의 속도와 지연.', tip: '"소식이 늦게 닿는다"의 서스펜스를 만들어라 — 봉수가 끊기거나 파발이 가로채이면 위기가 증폭된다.' },
      { name: '상평통보 / 공명첩', desc: '상평통보=조선 후기 동전(인조 이후 통용), 공명첩=이름 빈 관직 임명장(돈으로 신분 상승).', tip: '경제·신분 소재 — 단, 상평통보는 인조 이후라 임진왜란 이전 배경에 쓰면 시대착오다(고증 주의).' },
      { name: '사서삼경 / 정감록', desc: '사서삼경=유학 경전(과거 시험·지성의 토대), 정감록=조선 후기 예언서(왕조 멸망 예언).', tip: '경전 인용은 지식인의 화법으로, 정감록은 민심 동요·역모 명분으로 — 두 책의 쓰임이 정반대다.' },
      { name: '신주 / 위패 / 사당', desc: '조상의 혼을 모신 나무 패와 그 공간. 제사·종법의 중심. 효(孝)와 가문의 상징.', tip: '가문·효 갈등의 무대 — 신주를 모시느냐 버리느냐, 사당이 불타느냐가 가문 붕괴의 상징이 된다.' },
    ],
  },
  {
    key: 'setting', label: '배경·세계관', icon: '🏯', note: '설정 체크리스트. 왕대·정치지형·신분·경제·공간·대외관계·사상을 정하면 분위기가 결정된다.',
    items: [
      { name: '왕대(王代) 특정', desc: '연산·중종·선조·인조·영조·정조 등 어느 왕대인지로 분위기·사건·당파가 결정된다.', tip: '왕대를 먼저 정하라 — 그 왕대의 주요 사건·실존 인물·당파가 자동으로 작품의 뼈대가 된다.' },
      { name: '정치 지형(붕당)', desc: '훈구/사림 → 동인/서인 → 남인/북인 → 노론/소론. 시기마다 당쟁의 진영이 다르다.', tip: '시대에 맞는 당파를 써라 — 선조 이전에 "노론·소론"은 시대착오. 왕대별 붕당 지형을 확인하라.' },
      { name: '신분·제도', desc: '양반-중인-상민-천민, 적서차별, 노비, 군역·세제, 과거제. 사회의 골격이자 인물의 족쇄.', tip: '주인공의 신분을 정하면 가능한 행동의 범위가 정해진다 — 서얼이면 과거 응시부터 막힌다.' },
      { name: '경제·생활(농본·장시)', desc: '농본 사회, 장시·보부상의 유통, 의식주, 화폐(후기 상평통보). 일상의 질감.', tip: '상업·발명 소재(웹소설형)는 "농본 사회의 제약" 속에서 그려야 개연성이 산다 — 자본·유통망부터 깔아라.' },
      { name: '공간(궁궐 구조)', desc: '경복궁·창덕궁의 정전(공식)·편전(집무)·내전(생활)·후원. 한양 도성·지방 관아·변방 진(鎭).', tip: '궁궐의 공간 위계를 활용하라 — 정전의 공식성, 편전의 밀담, 내전의 사생활이 장면의 성격을 정한다.' },
      { name: '대외관계(사대·교린)', desc: '명·청 사대(조공·국서·사신), 일본(왜·통신사), 여진. 외교가 곧 생존의 문제.', tip: '병자호란·삼배구고두 같은 굴욕, 통신사·표류민 같은 교류를 사건의 축으로 — 대외관계는 강력한 갈등원이다.' },
      { name: '사상·종교', desc: '성리학·예학·붕당, 불교 억압, 무속, 후기 천주교 박해, 영정조 실학.', tip: '시대 사상이 인물의 사고를 규정한다 — 예송논쟁(예학)·실학·서학(천주교)은 각각 다른 시기의 갈등 소재다.' },
      { name: '달력·시간(간지·시진)', desc: '간지(갑자·을축…)·연호로 연도, 시진(자시·인시…)으로 하루, 절기·통금으로 일상의 리듬.', tip: '"인시(寅時)에 거사한다", "갑자년 사화" 식으로 시간을 시대어로 표기하면 사실감이 산다. 자정 통금도 긴장 요소.' },
      { name: '사대부가·저잣거리·관아', desc: '양반의 사랑방·안채, 상민의 저잣거리·주막, 지방의 관아·옥사. 계층별 생활 공간.', tip: '신분에 따라 무대를 나눠라 — 사랑방의 밀담, 저잣거리의 소문, 관아의 송사가 각기 다른 정보를 흘린다.' },
      { name: '변방·진(鎭)·국경', desc: '북방 여진과의 국경, 남방 왜구 방비, 변방의 진(군사 거점). 전란의 최전선.', tip: '중앙 정치와 변방 군사의 정보 격차를 써라 — 변방의 위기가 도성에 늦게 닿는 시간차가 서스펜스가 된다.' },
    ],
  },
  {
    key: 'pitfall', label: '흔한 함정·고증 경고', icon: '⚠️', note: '몰입을 깨는 대표적 오류들. 검증 체크리스트로 삼아 원고를 자가 점검하라.',
    items: [
      { name: '시대착오(애너크로니즘)', desc: '그 시대에 없던 물건·작물·제도. 고추(임진 이후)·고구마/감자(18C 후반)·상평통보(인조 이후)·안경·시계.', tip: '"이 물건이 이 연도에 있었나"를 도입 연대로 점검하라 — 고증 자동 점검 도구(시대착오 검사기)와 연계해 검증하라.' },
      { name: '호칭 오류', desc: '조선 왕을 "폐하"로(원칙은 "전하"), 세자에게 "전하", 품계에 안 맞는 "대감/나리" 혼용.', tip: '"폐하"는 황제(대한제국·중국)만. 품계와 호칭을 짝지은 표를 만들어 두고 대사를 점검하라.' },
      { name: '현대어·번역체 누수', desc: '"괜찮아요", "스트레스", "팀워크", "사실은 말이야" 같은 현대 어휘·개념이 대사에 침투.', tip: '대사를 소리 내어 읽어 "이 시대 사람이 할 말인가"를 점검하라 — 개념어(스트레스·시스템)는 특히 위험하다.' },
      { name: '미래지식 만능주의', desc: '지식만 있으면 즉시 구현된다는 비약. 원료·기술·장인·자본·정치 반발을 무시.', tip: '발명·개혁마다 "구현 제약"을 강제 체크하라 — 화약 하나도 초석·유황 수급부터 막힌다.' },
      { name: '나비효과 무시', desc: '역사를 바꿨는데 이후 사건이 원래대로 진행되는 모순. 대체역사·회귀물의 치명적 결함.', tip: '분기점 이후의 "달라진 세계"를 일관되게 추적하라 — 인물을 살렸으면 그가 일으킬 파장도 반영해야 한다.' },
      { name: '정치 구조 무지', desc: '왕이 만능 독재자처럼 묘사. 실제론 신권·언관·예법·종법에 강하게 제약받는 권력의 견제 메커니즘을 누락.', tip: '왕의 명령에 신하가 "아니 되옵니다"로 맞서는 구조를 살려라 — 견제 없는 왕권은 시대감을 무너뜨린다.' },
      { name: '신분제 가벼움', desc: '천민·서얼·여성이 시대 제약 없이 자유롭게 활약. 신분의 족쇄가 사라지면 시대감이 붕괴.', tip: '제약을 없애지 말고 "극복 과제"로 — 서얼의 한, 여성의 규방 제약을 뚫는 과정에서 드라마가 나온다.' },
      { name: '연호·간지·연표 오류', desc: '왕대와 사건 연도, 당파 지형이 어긋남(선조 이전에 노론 등장 등). 실존 인물의 생몰 충돌.', tip: '작중 연표를 한 장으로 정리해 두라 — 실존 인물을 등장시킬 땐 그 인물의 생몰·관직 시기를 맞춰라.' },
      { name: '복식·예법 오류', desc: '신분·품계에 안 맞는 복색, 잘못된 예법(절·인사·호칭의 격식)·혼례/상례 절차.', tip: '의복의 색·흉배, 절의 횟수·방향 같은 예법은 고증의 디테일 — 한 장면을 위해서라도 해당 시기 복식을 확인하라.' },
      { name: '여성/서얼의 권한 과장', desc: '여성이 공식 관직에 오르거나, 서얼이 제약 없이 과거에 급제. 제도적 불가능을 무시.', tip: '편법·예외(공명첩·특채·수렴청정)는 가능하나 "원칙은 막혀 있다"를 전제로 — 예외임을 작중에서 의식하게 하라.' },
    ],
  },
  {
    key: 'cliche', label: '클리셰(전복 권장)', icon: '🔁', note: '쓰되 비틀어야 할 상투구들. 그대로 쓰면 식상, 한 번 꺾으면 신선해진다.',
    items: [
      { name: '"역모입니다, 전하!"', desc: '정적을 모함·탄핵하는 어전의 단골 대사. 손가락질과 함께 터지는 정치 공격.', tip: '진짜 역모를 가짜로 몰거나, 가짜 고변이 진짜로 드러나게 비틀어라 — 외치는 자가 진범인 반전.' },
      { name: '"저자의 목을 쳐라!"', desc: '분노한 권력자의 즉결 처형 명령. 권위의 과시이자 공포의 연출.', tip: '명령 직후 "아니 되옵니다"의 만류, 혹은 명령한 자가 곧 같은 운명에 처하는 아이러니로 비틀어라.' },
      { name: '빙의 직후 "여기가… 조선?"', desc: '회귀빙의물의 자각 장면. "이 몸의 기억이 흘러든다"는 정보 전달 클리셰.', tip: '자각을 위기와 동시에 터뜨려라 — 깨어 보니 이미 국문장에 끌려와 있거나 사약 앞이면 후크가 강해진다.' },
      { name: '미래지식 단번 성공(비누·설탕·고추장)', desc: '비누·설탕·증류주·고추장·화약·종두법으로 즉시 부와 신임을 얻는 클리셰.', tip: '첫 시도를 실패시켜라 — 원료·기술·장인 부족으로 한 번 좌절한 뒤 성공해야 개연성과 카타르시스가 동시에 산다.' },
      { name: '음흉한 외척·요녀 후궁·간신', desc: '눈을 가늘게 뜨고 음모를 꾸미는 전형적 악역들. 당파 영수·요사스러운 후궁.', tip: '악역에게 "납득되는 명분·사연"을 줘라 — 가문을 지키려는 외척, 살아남으려는 후궁이면 입체적이 된다.' },
      { name: '"이미 모든 것이 끝난 뒤였다"', desc: '비극을 예고하는 회상·복선의 상투구. 운명의 불가항력을 암시.', tip: '예고 자체를 비틀어라 — "끝난 줄 알았으나 시작이었다"처럼 독자의 예측을 한 번 더 꺾어라.' },
      { name: '암행어사 출두 = 만능 해결', desc: '"암행어사 출두요!"로 모든 부정이 일거에 해결되는 사이다 클리셰.', tip: '출두 이후의 "뒷감당"을 그려라 — 처벌받은 세력의 보복, 중앙 정치의 개입으로 해결이 새 갈등이 되게.' },
      { name: '간택 = 신데렐라 상승', desc: '한미한 가문의 처녀가 간택으로 단숨에 중전·후궁이 되는 로맨스 상승 클리셰.', tip: '간택 이후의 "궁중암투의 시작"을 비춰라 — 오르는 것이 끝이 아니라 더 큰 위험의 입구임을 그려라.' },
      { name: '충신은 사약, 간신은 영달', desc: '곧은 신하가 모함으로 죽고 간신이 출세하는 비극 구도. 의(義)의 좌절.', tip: '독자가 아는 역사적 비극을 비틀 여지 — 충신의 죽음이 헛되지 않게 후대에 명예 회복되는 긴 호흡을 깔아라.' },
      { name: '"통촉하여 주시옵소서" 합창', desc: '신하들이 일제히 엎드려 외치는 간언 장면. 어전의 정형 연출.', tip: '합창을 깨는 한 명 — 모두가 엎드릴 때 홀로 다른 말을 하는 인물로 장면에 균열을 내라.' },
    ],
  },
]

const LS = 'sry:tool:history-knowledge:'
const ALL_KEY = '__all__'
const flatAll = (): { cat: CatDef; item: Entry }[] =>
  CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (str: string) =>
  String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 관련 도구(역사·사극 전용 연계)
const RELATED: { id: string; label: string }[] = [
  { id: 'anachronism-checker', label: '시대착오 검사' },
  { id: 'historical-figure', label: '역사 인물' },
  { id: 'on-this-day', label: '오늘의 역사' },
]

export default function HistoryKnowledge({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 활용: 다른 장르 컨텍스트로 열려도 역사·사극 전용 사전임을 안내.
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
      source: '역사·사극 지식 사전 · ' + c.label,
      tags: ['역사·사극', c.label],
    })
    setToast(`스니펫 라이브러리에 ‘${item.name}’을(를) 저장했습니다.`)
    window.setTimeout(() => setToast((t) => (t && t.includes(item.name) ? null : t)), 2200)
  }

  // 연계: 현재(무작위 또는 펼친) 항목을 프로젝트 자료 〈역사 지식〉 폴더에 메모로 추가.
  const addItemToProject = (c: CatDef, item: Entry) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(c.icon + ' ' + c.label)} · ${escapeHtml(item.name)}</b></p>`,
      `<p>${escapeHtml(item.desc)}</p>`,
      item.tip ? `<p><b>💡 활용</b><br>${escapeHtml(item.tip)}</p>` : '',
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '역사 지식',
      title: `${item.name} (${c.label})`, bodyHtml,
      meta: { 장르: '역사·사극', 분류: c.label },
    })
    if (id) {
      setToast(`프로젝트 자료 〈역사 지식〉에 ‘${item.name}’을(를) 추가했습니다.`)
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
        역사·사극 장르에서 자주 쓰는 소재·설정·서사 장치·궁중어·고증 지식 <b>{total}개</b>를 <b>{CATS.length}개</b> 카테고리로 모았습니다.
        검색·펼침·무작위로 찾고, 마음에 드는 항목을 시대 장면에 심어 보세요.
        {ctxGenre && ctxGenre !== '역사·사극' && (
          <span style={{ color: 'var(--accent)' }}> (현재 ‘{ctxGenre}’ 컨텍스트 — 이 사전은 역사·사극 전용입니다)</span>
        )}
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름·설명·활용으로 검색 (예: 전하, 옥새, 반정, 미래지식, 사화, 어전 설전, 시대착오)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="✨"/> 전체
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={c.icon}/> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 무작위 소재</button>
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
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon}/> {random.cat.label}</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{random.item.name}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0' }}>{random.item.desc}</div>
          {random.item.tip && (
            <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--accent)' }}><Emoji e="💡"/> {random.item.tip}</div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(itemText(random.cat, random.item), 'rnd')}>
              {copiedKey === 'rnd' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>
              {favs[key(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
            <button className="minibtn" onClick={() => saveSnippet(random.cat, random.item)} title="이 항목을 글감 스니펫으로 저장"><Emoji e="💾"/> 글감 저장</button>
          </div>
          {/* 연계: 프로젝트에 추가 */}
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => addItemToProject(random.cat, random.item)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 소재를 프로젝트 자료 〈역사 지식〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄"/> 프로젝트에 추가
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
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon}/> {c.label}</span>
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
                      <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 5, color: 'var(--accent)' }}><Emoji e="💡"/> {item.tip}</div>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      <button className="minibtn" onClick={() => copy(itemText(c, item), copyId)}>
                        {copiedKey === copyId ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
                      </button>
                      <button className="minibtn" onClick={() => setRandom({ cat: c, item })} title="이 소재를 강조 보기"><Emoji e="🔎"/> 강조 보기</button>
                      <button className="minibtn" onClick={() => saveSnippet(c, item)} title="이 항목을 글감 스니펫으로 저장"><Emoji e="💾"/> 글감 저장</button>
                      <button className="linkbtn" onClick={() => addItemToProject(c, item)} disabled={!hasProjectBridge()}
                        title={hasProjectBridge() ? '이 소재를 프로젝트 자료 〈역사 지식〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                        <Emoji e="📄"/> 프로젝트에 추가
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
          <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: '역사·사극' })} title={`${r.label} 열기`}>
            {r.label}
          </button>
        ))}
      </div>

      <div style={hint}>지식은 정답이 아니라 출발점입니다. 고증은 빈칸을 메우는 닻으로, 클리셰는 전복 포인트로, 호칭·시대명사는 시대 공기로 삼아 인물·장면에 슬쩍 심어 보세요.</div>
    </div>
  )
}
