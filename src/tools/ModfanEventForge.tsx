// 현대판타지·회귀 — 사건·소재 대형 생성기(EventForge).
// 회귀물 핵심 사건 요소(회귀 트리거·미래지식 종류·선점 대상·무대·방해/위기·청산·정서축·다음 떡밥)를 슬롯 풀에서 무작위 조합.
// 슬롯별 잠금/재생성, 총 조합수 표시(1조 지향), 결과를 한 줄 사건 시드로 합성.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(보관 시드)만 사용.
import { useState, useEffect, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'modfan-eventforge', name: '회귀 사건 대장간', icon: '⏳', group: '생성기', genre: '현대판타지·회귀', intro: '회귀 트리거·미래지식·선점·위기를 조합해 현판 회귀 사건 소재를 대량 생성', w: 560, h: 680 }

const LS = 'sry:tool:modfan-eventforge'

// ---------- 슬롯 정의 ----------
interface Slot {
  key: string
  label: string
  icon: string
  desc: string
  pool: string[]
}

// 회귀물 사건의 8개 축. 각 풀은 장르 특화·구체적(일반론 배제), '도시에'의 서사 장치에 근거.
const SLOTS: Slot[] = [
  {
    key: 'trigger', label: '회귀 트리거', icon: '💀', desc: '되돌아오게 된 죽음·절망의 순간',
    pool: [
      '게이트 붕괴에 동료를 미끼로 버려진 채 마수 군집 한복판에서 짓밟혀 죽는 순간',
      '믿었던 길드 마스터의 손에 등을 찔려 던전 보스룸 바닥에 쓰러진 순간',
      '코인 폭락으로 전 재산을 잃고 한강 다리 난간에 올라선 순간',
      '데뷔 직전 사고로 무대에 서보지도 못하고 응급실에서 숨이 끊긴 순간',
      '회사를 빼앗기고 길거리에 나앉아 한겨울 벤치에서 얼어 죽어가던 순간',
      '동생의 수술비를 마련하지 못해 장례식장에서 무릎 꿇은 그 밤',
      '소속사의 노예계약에 묶여 과로로 쓰러져 다시 눈을 뜨지 못한 순간',
      '내부고발 직후 의문의 교통사고로 차가 강물에 가라앉던 순간',
      '재능을 인정받지 못한 채 무명으로 늙어 병상에서 마지막 숨을 내쉰 순간',
      '세계를 멸망시킨 EX급 마수를 막아내고 홀로 잿더미 위에서 절명한 순간',
      '아버지의 회사를 망친 배신자에게 누명을 쓰고 옥중에서 생을 마감한 순간',
      '결승전 승부조작을 거부했다가 손가락이 부러지고 선수 생명이 끝난 순간',
      '투자 사기로 가족을 모두 잃고 빈집에서 혼자 약을 삼킨 순간',
      '플레이어 등급 측정에서 최하위 판정을 받고 버려진 채 던전에서 굶어 죽은 순간',
      '연구를 통째로 빼앗기고 학계에서 매장당해 폐인이 되어 죽은 순간',
      '전쟁 같은 인수합병전에서 패해 모든 지분을 빼앗기고 쫓겨난 그날',
      '소중한 사람을 지키지 못하고 그 시신을 끌어안은 채 함께 불길에 휩싸인 순간',
      '협회의 토사구팽으로 등급을 박탈당하고 추격대에 사냥당한 순간',
      '천만 영화의 원작자 자리를 빼앗기고 무명으로 잊혀 쓸쓸히 눈감은 순간',
      '믿었던 선배에게 작전주의 폭탄을 넘겨받고 빚더미에 깔려 무너진 순간',
      '마지막 게이트에서 길드원 전원을 살리려 홀로 남아 마수에게 삼켜진 순간',
      '신약 임상 데이터를 빼앗기고 동료의 죽음까지 뒤집어쓴 채 옥사한 순간',
      '결승 무대에서 사고를 위장한 테러로 손목이 으스러진 채 은퇴당한 순간',
      '회귀자임을 들킨 적의 손에 분기점마다 사냥당하다 결국 붙잡혀 죽은 순간',
    ],
  },
  {
    key: 'point', label: '회귀 시점', icon: '⏪', desc: '돌아간 분기점(왜 하필 이때인가)',
    pool: [
      '첫 게이트가 서울 도심에 열리기 사흘 전, 아무도 각성을 모르던 평범한 아침',
      '대학 합격자 발표를 코앞에 둔, 모든 진로가 갈리던 그 겨울',
      '문제의 코인이 0.1원이던 상장 직전, 누구도 거들떠보지 않던 시점',
      '소속사 오디션 최종 합격 통보를 받기 일주일 전',
      '아버지가 그 사기 계약서에 도장을 찍기 바로 전날',
      '동생이 첫 발병 증상을 보이기 한 달 전, 아직 모든 게 늦지 않은 때',
      '각성 능력 측정소 개소 첫날, 줄을 서면 아무도 모르는 떡잎이던 시점',
      '국가대표 선발전을 앞둔, 무릎 부상을 입기 직전의 전성기 직전',
      '회사 창업 멤버를 모으던, 통장에 종잣돈 300만 원뿐이던 시절',
      '그 배신자가 아직 신입으로 들어와 웃으며 인사하던 입사 첫날',
      '세계관을 뒤흔든 대형 던전 브레이크가 터지기 정확히 1년 전',
      '데뷔조 편성 회의가 열리기 며칠 전, 연습생 평가 직전',
      '부동산 폭등이 시작되기 직전, 그 동네가 미분양으로 텅 비어 있던 때',
      '첫 각성석 경매가 열리기 전날 밤, 가치를 아무도 모르던 시점',
      '그 천재 후배가 아직 무명 길거리 버스킹을 하던 시절',
      '재단 비리가 터지기 전, 모두가 그를 존경하던 마지막 순간',
      '각성 등급 측정이 전 국민 의무화되기 직전, 능력을 숨길 수 있던 마지막 해',
      '문제의 작전주가 동전주로 거래되던, 차트가 바닥을 기던 그 주',
      '천만 영화의 원작 웹소설이 조회수 0으로 묻혀 있던 연재 초기',
      '그 마수가 처음 게이트 밖으로 새어나오기 직전의 고요한 새벽',
      '재벌가 회장이 아직 정정하던, 후계 구도가 굳어지기 전의 봄',
      '프로 데뷔 드래프트가 열리기 전, 아무도 그를 지명하지 않던 시점',
    ],
  },
  {
    key: 'knowledge', label: '미래지식', icon: '🔮', desc: '주인공만 아는 결정적 정보(장르 엔진)',
    pool: [
      '석 달 뒤 강남 한복판에 A급 게이트가 열린다는 정확한 날짜와 좌표',
      '지금은 잡주인 그 종목이 반년 뒤 50배 떡상한다는 사실',
      '무명 연습생이 3년 뒤 국민 아이돌이 된다는 미래',
      '신입으로 들어온 그가 훗날 회사를 통째로 삼킬 배신자라는 진실',
      '특정 던전 깊은 곳에 EX급 각성석이 봉인돼 있다는 위치 정보',
      '아직 발표 전인 그 노래가 음원 차트 올킬을 한다는 사실',
      '반년 뒤 그 대기업 회장이 급사하며 후계 전쟁이 벌어진다는 미래',
      '저평가된 변두리 부지가 신도시 중심이 된다는 도시계획의 결말',
      '이 마수의 약점이 빛 속성이며 정확히 어디를 찔러야 즉사하는지',
      '경쟁 길드의 정예가 다음 레이드에서 전멸하는 정확한 패인',
      '아직 데뷔도 안 한 감독의 그 시나리오가 천만 영화가 된다는 사실',
      '협회 수뇌부가 비밀리에 던전을 사유화한다는 내부 음모의 전말',
      '특정 날짜에 코스닥 전체가 폭락하는 거시 경제 위기의 시점',
      '그 무명 선수가 세계 신기록을 세울 종목과 그 페이스 배분',
      '아직 아무도 모르는 게이트 등급 측정 공식의 빈틈과 악용법',
      '미래에 천문학적 가치를 갖게 될 특허 기술의 핵심 아이디어',
      '곧 발생할 던전 브레이크의 위치·등급·생존 루트 전부',
      '그 떡잎 천재 헌터의 각성 시기와 그를 먼저 포섭할 방법',
      '곧 터질 대형 게이트 사태의 정확한 D-day와 대피 동선',
      '그 무명 웹툰이 글로벌 IP가 되어 영상화까지 가는 전 과정',
      '아직 무명인 작곡가의 미발표 명곡과 그 멜로디 전부',
      '경쟁사가 다음 분기에 자금난으로 헐값에 매물로 나온다는 사실',
      '대형 사고로 공석이 될 협회 요직과 그 자리를 차지할 방법',
      '특정 길드가 배신으로 와해되는 시점과 그 핵심 인력의 향방',
    ],
  },
  {
    key: 'stage', label: '무대(직업·시스템)', icon: '🏙️', desc: '사건이 벌어지는 현실 시스템의 장',
    pool: [
      '헌터협회 등급 심사장과 그 뒤편의 권력 다툼',
      '코스닥 상장사를 둘러싼 작전 세력의 머니게임',
      '대형 기획사의 데뷔조 서바이벌 평가 무대',
      '재벌가 후계 구도가 얽힌 이사회 표 대결',
      '서울 한복판에 갓 열린 미공략 게이트 입구',
      '프로게임단 로스터 교체를 앞둔 스크림 연습실',
      '신도시 개발 정보가 오가는 부동산 경매장',
      '각성석·아이템이 거래되는 헌터 블랙마켓 옥션',
      '스타트업 데모데이의 투자 유치 피칭 무대',
      '국가대표 선발을 가르는 프로 스포츠 결승전',
      '신약 특허를 둘러싼 제약사 기술 탈취전',
      '대형 길드의 첫 레이드 공략 작전 회의실',
      '연예계 데뷔를 가르는 공중파 오디션 생방송',
      '벤처캐피탈이 모인 라운드 투자 협상 테이블',
      '대학 산학연 연구실의 논문·특허 우선권 경쟁',
      '게이트 던전 클리어 랭킹을 다투는 공식 레이드',
      '웹소설·웹툰 플랫폼의 신작 런칭 조회수 전쟁',
      '각성자 길드 창설 인가를 둘러싼 협회 청문회',
      '대기업 공채 최종 면접과 그 뒤의 낙하산 인사 다툼',
      '코인 거래소 상장 심사와 작전 세력의 펌핑전',
      '프로게임 리그 승강전과 스폰서 계약 협상',
      '의료 AI 스타트업의 데이터 확보 경쟁',
    ],
  },
  {
    key: 'preempt', label: '선점 행동', icon: '🎯', desc: '미래지식으로 남보다 먼저 잡는 한 수',
    pool: [
      '종잣돈을 끌어모아 그 잡주를 저점에서 전량 매수한다',
      '무명 연습생을 미리 찾아가 전속 계약을 선점한다',
      '미공략 게이트에 가장 먼저 진입해 초기 보상을 독식한다',
      '폭등 전 변두리 부지를 헐값에 통째로 사들인다',
      '그 천재 후배에게 먼저 손을 내밀어 자기 사람으로 만든다',
      '경매에 나오기 전 각성석을 개인 거래로 가로챈다',
      '대박 날 시나리오의 판권을 무명일 때 헐값에 확보한다',
      '배신자의 약점을 미리 수집해 결정적 카드로 쥔다',
      '급사할 회장의 비자금 흐름을 먼저 파악해 길목을 막는다',
      '신기술 특허를 경쟁자보다 하루 먼저 출원한다',
      '마수의 약점에 맞는 속성 장비를 미리 세팅해 둔다',
      '폭락 직전 모든 포지션을 정리하고 공매도로 돌아선다',
      '데뷔할 음원의 작곡가를 무명일 때 독점 계약한다',
      '전멸할 레이드를 사전 경고해 라이벌의 신뢰를 사거나 빚을 만든다',
      '협회 음모의 증거를 미리 백업해 안전장치로 삼는다',
      '떡잎 헌터의 각성을 앞당길 던전 코스를 먼저 짜준다',
      '망할 경쟁사의 핵심 인재를 무너지기 전에 빼온다',
      '미발표 명곡을 무명 작곡가에게서 선판매 계약으로 확보한다',
      '글로벌 IP가 될 웹툰의 영상화 판권을 무명일 때 묶어둔다',
      '공석이 될 협회 요직을 차지할 인맥을 미리 다져둔다',
      '폭등 직전 거래소 상장 종목에 초기 물량을 선점한다',
      '대형 사고를 미리 막아 은인이 될 인물에게 빚을 지운다',
    ],
  },
  {
    key: 'obstacle', label: '방해·위기', icon: '⚔️', desc: '사이다를 막는 장애물(짧고 굵게)',
    pool: [
      '"어떻게 알았지?" 주변의 의심이 미래지식의 출처를 캐기 시작한다',
      '나비효과로 내가 아는 미래가 어긋나며 정보가 더는 들어맞지 않는다',
      '또 다른 회귀자가 같은 종목·같은 인재를 노리고 먼저 움직인다',
      '전생의 원수가 아직은 압도적 우위에서 길목을 모조리 틀어막는다',
      '종잣돈이 부족해 결정적 타이밍에 베팅할 실탄이 없다',
      '미래지식을 들킬까 봐 실력을 숨기다 결정적 순간 의심을 산다',
      '예고했던 게이트가 예정보다 일찍, 더 높은 등급으로 열려버린다',
      '협회·기획사·이사회의 기득권이 신참의 진입을 조직적으로 막는다',
      '믿었던 조력자가 정보를 빼돌려 적에게 팔아넘긴다',
      '가족·동료의 안전이 인질로 잡혀 손발이 묶인다',
      '예지자를 감지하는 적이 "너도 회귀자냐"며 정체를 추궁한다',
      '선점한 자산이 법적·제도적 함정에 걸려 묶여버린다',
      '나비효과로 살렸던 사람이 엉뚱한 곳에서 새로운 위험을 부른다',
      '미래에 없던 변수—기록에 없는 마수·인물·사건이 돌출한다',
      '여론·언론이 졸부·운빨이라며 정당성을 흔든다',
      '시간이 촉박해 미래지식을 행사할 창이 빠르게 닫혀간다',
      '선점하려던 인재가 이미 다른 회귀자의 사람이 되어 있다',
      '미래에 없던 사고로 핵심 조력자가 예정보다 일찍 이탈한다',
      '주인공의 개입으로 미래가 통째로 바뀌어 정보가 백지가 된다',
      '적이 함정을 파고 일부러 거짓 미래를 흘려 주인공을 시험한다',
      '제도·규제가 갑자기 바뀌어 선점 전략의 길이 막힌다',
      '실력이 미래지식을 따라가지 못해 알면서도 손이 닿지 않는다',
    ],
  },
  {
    key: 'payoff', label: '청산·역전', icon: '🔥', desc: '쌓아온 것으로 돌파하는 카타르시스',
    pool: [
      '전생의 배신자를 같은 함정에 빠뜨려 모든 걸 되돌려준다',
      '선점한 자산이 폭등해 단숨에 판을 뒤엎을 체급을 손에 쥔다',
      '미래지식이 무효화된 위기를 회귀 후 스스로 쌓은 실력으로 돌파한다',
      '한때 자신을 짓밟던 거대 존재를 이제는 내려다보는 위치로 역전한다',
      '데뷔조 막내였던 무명을 정상에 세우며 업계 판도를 바꾼다',
      '협회의 음모를 백업해둔 증거로 단숨에 무너뜨린다',
      '전멸할 운명이던 동료들을 모두 살려 새 미래를 연다',
      '인수합병전에서 미리 모은 지분으로 적을 역으로 집어삼킨다',
      'EX급 각성석을 손에 넣어 등급 측정의 판 자체를 깨버린다',
      '못 지킨 가족을 이번엔 지켜내며 두 인생의 한을 푼다',
      '경쟁 길드를 흡수해 단숨에 최정상 세력으로 도약한다',
      '공매도와 선점 매수가 동시에 터지며 적의 자금줄을 끊는다',
      '숨겨온 실력을 폭발시켜 모두가 보는 앞에서 진가를 증명한다',
      '근원 빌런이 사실 또 다른 회귀자임을 간파하고 정보전에서 이긴다',
      '무명일 때 확보한 판권·특허가 천문학적 가치로 돌아온다',
      '전생에 잃었던 모든 것을 이번 생에 한 점으로 모아 되찾는다',
      '거짓 미래에 속는 척 역으로 적의 함정을 통째로 되돌려준다',
      '바뀐 미래를 오히려 무기 삼아 아무도 예측 못 할 수를 둔다',
      '키워낸 떡잎 인재들이 결정적 순간 주인공을 위해 한데 모인다',
      '전생의 죽음을 만든 그 사고를 이번엔 막아 운명 자체를 갈아치운다',
      '여론을 뒤집어 졸부라던 비난을 시대를 읽은 선견지명으로 바꾼다',
      '두 회귀자의 정보전 끝에 더 깊은 미래를 아는 자로서 판을 닫는다',
    ],
  },
  {
    key: 'emotion', label: '정서축', icon: '💗', desc: '액션과 별개로 흐르는 감정선',
    pool: [
      '아직 살아 있는 가족을 마주한 울컥함이 모든 행동의 동력이 된다',
      '못 지킨 사람을 이번엔 반드시 지키겠다는 무거운 각오',
      '두 번째 기회를 얻은 자의 죄책감과 책임감이 교차한다',
      '같은 실수를 반복하지 않겠다는 서늘한 다짐',
      '전생의 무능했던 자아를 마주보는 부끄러움과 성장의 갈증',
      '이미 죽은 친구를 다시 만난 회한과 그리움',
      '미래를 안다는 외로움—아무에게도 진실을 말할 수 없는 고독',
      '복수의 칼날과 다시 시작하는 설렘 사이의 흔들림',
      '두 인생의 무게를 홀로 짊어진 자의 고요한 결의',
      '바뀌어 가는 미래 앞에서 느끼는 두려움과 해방감',
      '소중한 일상을 되찾은 자의 벅찬 안도',
      '아직 늦지 않았다는 절박한 희망',
      '두 번 죽을 수는 없다는 비장한 단호함',
      '전생의 후회가 매 순간 등을 떠미는 조급함',
      '아는 미래가 무너질지 모른다는 서늘한 불안',
      '평범했던 어제로 돌아가고 싶은 은밀한 향수',
      '이번만큼은 내 손으로 끝낸다는 들끓는 복수심',
      '아무도 믿지 못하는 자의 차가운 경계심',
      '되찾은 시간이 아까워 한순간도 낭비 못 하는 절박함',
      '죽음을 한 번 겪은 자만의 담담한 초연함',
      '아직 자신을 알아보지 못하는 옛 인연 앞에서의 먹먹한 거리감',
      '두 번째 삶마저 헛되이 흘려보낼까 두려운 자기 불신',
    ],
  },
  {
    key: 'hook', label: '다음화 훅', icon: '🪝', desc: '회수 약속(떡밥)·클릭 유발 훅',
    pool: [
      '"그래, 이 날이었지." 예고된 대형 사건의 카운트다운이 시작된다',
      '거울 속 젊어진 얼굴을 보며 다음 목표를 체크리스트에 적어 넣는다',
      '미래지식이 처음으로 어긋난 단서가 마지막 줄에 드러난다',
      '또 다른 회귀자의 그림자가 같은 종목 매수 기록에서 포착된다',
      '아직 무명인 미래의 거물이 먼저 주인공에게 손을 내민다',
      '"넌 왜 이렇게 변했어?"—가장 가까운 사람의 의심이 깊어진다',
      '예고했던 게이트 좌표에서 예정보다 빠른 균열의 징후가 나타난다',
      '전생의 원수가 처음으로 주인공의 존재를 인지하기 시작한다',
      '선점한 자산의 가치가 첫 신호를 보이며 판이 움직이기 시작한다',
      '시스템 창에 기록에 없던 새로운 알림이 떠오른다',
      '죽은 줄 알았던 인물이 전혀 다른 위치에서 살아 나타난다',
      '"아직 ○○가 일어나기 전이군." 다음 분기점의 막이 오른다',
      '전생엔 없던 인물이 주인공의 동선을 정확히 따라붙기 시작한다',
      '예고한 미래 사건의 1차 전조가 뉴스 속보로 흘러나온다',
      '포섭하려던 떡잎이 이미 다른 회귀자의 손에 들어가 있었다',
      '시스템이 "이미 한 번 본 결말입니다"라는 경고를 띄운다',
      '전생의 마지막 기억 속 그 얼굴이 군중 속에서 스쳐 지나간다',
      '안전하다 믿은 선택이 기록에 없던 나비효과를 깨운다',
      '전생에선 적이었던 인물이 이번 생엔 먼저 동맹을 제안해 온다',
      '아무도 모르는 줄 알았던 미래지식을 누군가 이미 알고 있었다는 정황이 드러난다',
    ],
  },
]

// 총 조합수(슬롯 풀 크기 곱). 1조 지향 검증용.
function totalCombos(): number {
  return SLOTS.reduce((acc, s) => acc * s.pool.length, 1)
}

const COMBOS = totalCombos()

// 큰 수 한국어 단위 표기(억/조/경).
function formatCombos(n: number): string {
  const units: [number, string][] = [
    [1e16, '경'], [1e12, '조'], [1e8, '억'], [1e4, '만'],
  ]
  for (const [base, name] of units) {
    if (n >= base) {
      const v = n / base
      const s = v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(v >= 10 ? 1 : 2)
      return `${s}${name} 가지`
    }
  }
  return `${n.toLocaleString()} 가지`
}

const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]

// 한국어 조사 자동 선택 — 앞 글자 받침 유무로 실제 하나를 골라 출력(괄호 이중표기 금지).
function hasJong(word: string): boolean {
  const last = (word || '').replace(/[^가-힣A-Za-z0-9]/g, '').slice(-1)
  if (!last) return false
  const code = last.charCodeAt(0)
  // 한글 음절: 받침(종성) 유무로 판정
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0
  // 영문/숫자: 받침처럼 발음되는 종성으로 근사(보수적으로 받침 있음 처리 안 함 → 모음 끝 취급)
  return false
}
// 을/를
function josaEulReul(word: string): string {
  return hasJong(word) ? '을' : '를'
}

// 굴린 결과를 한 줄 사건 시드로 합성.
function compose(by: Record<string, string>): string {
  const t = by.trigger, p = by.point, k = by.knowledge, st = by.stage
  const pr = by.preempt, ob = by.obstacle, pa = by.payoff, em = by.emotion, h = by.hook
  if (!Object.values(by).some(Boolean)) return '슬롯을 굴려 사건 소재를 만들어보세요.'
  const parts: string[] = []
  if (t) parts.push(`${t}—그 절망의 끝에서 회귀한다.`)
  if (p) parts.push(`돌아간 곳은 ${p}.`)
  if (k) parts.push(`주인공만이 ${k}${josaEulReul(k)} 알고 있다.`)
  if (st) parts.push(`무대는 ${st}.`)
  if (pr) parts.push(`그는 ${pr}.`)
  if (ob) parts.push(`그러나 ${ob}.`)
  if (pa) parts.push(`끝내 ${pa}.`)
  if (em) parts.push(`그 밑바닥엔 ${em}.`)
  if (h) parts.push(`그리고— ${h}`)
  return parts.join(' ')
}

// HTML 이스케이프(프로젝트 본문 주입 안전화).
function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface SavedSeed { id: string; by: Record<string, string>; seed: string; note: string; updated: number }

export default function ModfanEventForge({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 활용(상단 배지)
  const genre = (payload && typeof payload.genre === 'string' && payload.genre) || meta.genre

  const [results, setResults] = useState<Record<string, string>>({})
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)
  const [tab, setTab] = useState<'forge' | 'saved'>('forge')
  const [copied, setCopied] = useState('')
  const [toast, setToast] = useState('')
  const nonce = useRef(0)

  const [saved, setSaved] = useState<SavedSeed[]>(() => {
    try {
      const raw = localStorage.getItem(LS)
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          return arr
            .filter((s) => s && typeof s.seed === 'string')
            .map((s) => ({
              id: typeof s.id === 'string' ? s.id : 'sd_' + Math.random().toString(36).slice(2),
              by: (s.by && typeof s.by === 'object') ? s.by : {},
              seed: String(s.seed),
              note: typeof s.note === 'string' ? s.note : '',
              updated: typeof s.updated === 'number' ? s.updated : Date.now(),
            }))
        }
      }
    } catch { /* ignore */ }
    return []
  })

  // 보관 시드 저장
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify(saved)) } catch { /* 저장 실패 graceful */ }
  }, [saved])

  // 복사 피드백 타이머 정리(언마운트/재설정)
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(''), 1500)
    return () => window.clearTimeout(t)
  }, [copied])

  // 토스트 타이머 정리
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 2000)
    return () => window.clearTimeout(t)
  }, [toast])

  // 굴림 애니메이션 자동 해제 + 언마운트 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => setRolling(false), 360)
    return () => window.clearTimeout(t)
  }, [rolling, results])

  const roll = useCallback(() => {
    const my = ++nonce.current
    setCopied('')
    setRolling(true)
    setResults((prev) => {
      const next: Record<string, string> = { ...prev }
      SLOTS.forEach((s) => {
        if (locked[s.key] && prev[s.key]) return // 잠긴 슬롯 유지
        let v = pick(s.pool)
        if (v === prev[s.key] && s.pool.length > 1) v = pick(s.pool) // 연속 중복 완화
        next[s.key] = v
      })
      if (my !== nonce.current) return prev
      return next
    })
  }, [locked])

  const toggleLock = (key: string) => setLocked((prev) => ({ ...prev, [key]: !prev[key] }))

  const seed = compose(results)
  const hasResults = SLOTS.some((s) => results[s.key])

  const seedPlainText = () => {
    const lines = SLOTS.filter((s) => results[s.key])
      .map((s) => `${s.icon} ${s.label}: ${results[s.key]}`)
      .join('\n')
    return `${lines}\n\n⏳ ${seed}`
  }

  const copyAll = () => {
    if (!hasResults) return
    const text = seedPlainText()
    if (!navigator.clipboard) { setCopied('unsupported'); return }
    navigator.clipboard.writeText(text).then(() => setCopied('all')).catch(() => setCopied('fail'))
  }

  const copyOne = (key: string) => {
    const v = results[key]
    if (!v) return
    if (!navigator.clipboard) { setCopied('unsupported'); return }
    navigator.clipboard.writeText(v).then(() => setCopied(key)).catch(() => setCopied('fail'))
  }

  // 보관
  const saveSeed = () => {
    if (!hasResults) return
    const by: Record<string, string> = {}
    SLOTS.forEach((s) => { if (results[s.key]) by[s.key] = results[s.key] })
    const rec: SavedSeed = {
      id: 'sd_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36),
      by, seed, note: '', updated: Date.now(),
    }
    setSaved((prev) => [rec, ...prev])
    setToast('보관함에 사건 시드를 담았습니다.')
  }

  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))
  const setNote = (id: string, note: string) =>
    setSaved((prev) => prev.map((s) => (s.id === id ? { ...s, note } : s)))
  const moveSaved = (id: string, dir: -1 | 1) => {
    setSaved((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      const ni = idx + dir
      if (ni < 0 || ni >= prev.length) return prev
      const a = prev.slice()
      ;[a[idx], a[ni]] = [a[ni], a[idx]]
      return a
    })
  }
  const reuseSaved = (s: SavedSeed) => {
    setResults({ ...s.by })
    setTab('forge')
    setToast('보관한 시드를 대장간에 불러왔습니다.')
  }

  // 사건 본문(HTML) 생성
  const bodyHtml = (by: Record<string, string>, sd: string, note?: string): string => {
    const rows = SLOTS.filter((s) => by[s.key])
      .map((s) => `<p><b>${esc(s.icon)} ${esc(s.label)}:</b> ${esc(by[s.key])}</p>`)
      .join('')
    return [
      `<p style="font-size:15px;line-height:1.7;"><b>⏳ ${esc(sd)}</b></p>`,
      `<hr/>`,
      rows,
      note ? `<hr/><p><b>📝 메모:</b> ${esc(note)}</p>` : '',
    ].join('')
  }

  // 프로젝트 연동 — 현재 시드를 자료(research) '사건' 폴더에 문서로 추가.
  const toProject = (by: Record<string, string>, sd: string, note?: string) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const triggerShort = (by.trigger || sd).slice(0, 22)
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '사건',
      title: `⏳ ${triggerShort}…`,
      bodyHtml: bodyHtml(by, sd, note),
      synopsis: sd.slice(0, 120),
      icon: '⏳',
      meta: { 장르: genre, 무대: by.stage || '', 미래지식: by.knowledge ? '있음' : '' },
    })
    setToast(id ? '프로젝트 자료 〈사건〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 라이브러리 스니펫으로 — 글감 풀에 추가.
  const toLibrary = (sd: string) => {
    addToLibrary('snippets', { text: sd, source: '회귀 사건 대장간', tags: ['현대판타지', '회귀', '사건'] })
    setToast('공유 라이브러리(글감)에 사건 시드를 담았습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  return (
    <div style={wrap}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px' }}>
          <Emoji e="⏳" /> {genre}
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          가능한 조합 <b style={{ color: 'var(--text)' }}>{formatCombos(COMBOS)}</b> ({COMBOS.toLocaleString()})
        </span>
      </div>

      <div style={hint}>
        회귀물 핵심 사건 요소(트리거·시점·미래지식·무대·선점·위기·청산·정서·훅)를 굴려 <b>사건 소재</b>를 만듭니다. 마음에 드는 슬롯은 <Emoji e="🔒" />로 고정하고 나머지만 다시 굴리세요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'}
          style={{ borderColor: tab === 'forge' ? 'var(--accent)' : 'var(--border)', color: tab === 'forge' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⏳" /> 대장간
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐" /> 보관함 ({saved.length})
        </button>
      </div>

      {tab === 'forge' && (
        <>
          {/* 슬롯들 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {SLOTS.map((s) => {
              const v = results[s.key]
              const isLocked = !!locked[s.key]
              return (
                <div key={s.key} style={{ ...card, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-12deg) scale(1.15)' : 'none' }}>
                    <Emoji e={s.icon} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {s.label} <span style={{ opacity: 0.7 }}>· {s.desc}</span> <span style={{ opacity: 0.6 }}>({s.pool.length})</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: v ? 'var(--text)' : 'var(--muted)' }}>
                      {v ? (rolling && !isLocked ? '…' : v) : '— 굴려주세요 —'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                    <button className="minibtn" onClick={() => toggleLock(s.key)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                      style={{ borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                      {isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
                    </button>
                    <button className="minibtn" onClick={() => copyOne(s.key)} disabled={!v} title="이 슬롯 복사">
                      {copied === s.key ? <>✓</> : <Emoji e="📋" />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 조합 시드 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', maxHeight: 150, overflowY: 'auto' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="⏳" /> 사건 시드</div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: hasResults ? 'var(--text)' : 'var(--muted)' }}>{seed}</div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 130 }} onClick={roll}><Emoji e="🎲" /> 사건 굴리기 / 다시 섞기</button>
            <button className="minibtn" onClick={copyAll} disabled={!hasResults}>
              {copied === 'all' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 전체 복사</>}
            </button>
            <button className="minibtn" onClick={saveSeed} disabled={!hasResults}><Emoji e="⭐" /> 보관</button>
          </div>

          {/* 연계 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => toProject(results, seed)} disabled={!hasResults || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '현재 사건 시드를 프로젝트 자료 〈사건〉 폴더에 추가'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => toLibrary(seed)} disabled={!hasResults}
              title="사건 시드를 공유 라이브러리(글감)에 담기">
              <Emoji e="🧩" /> 글감으로 담기
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck')} title="반전 카드덱 열기">
              <Emoji e="🃏" /> 반전 카드덱
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('character-forge', { genre })} title="인물 대장간 열기">
              <Emoji e="🧬" /> 인물 만들기
            </button>
          </div>

          {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
          {copied === 'unsupported' && <div style={hint}>이 환경에서는 클립보드 복사가 지원되지 않습니다.</div>}
          {copied === 'fail' && <div style={hint}>복사에 실패했습니다. 직접 선택해 복사해 주세요.</div>}
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐" /></div>
              보관한 사건 시드가 없습니다.<br />
              <span style={{ fontSize: 12 }}>대장간에서 <Emoji e="⭐" /> 보관을 눌러 마음에 드는 사건을 모아보세요.</span>
            </div>
          )}
          {saved.map((s, i) => (
            <div key={s.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', flex: 1 }}>#{saved.length - i}</span>
                <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">▼</button>
                <button className="minibtn" onClick={() => reuseSaved(s)} title="대장간에 불러오기">↩</button>
                <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제"
                  style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑" /></button>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>{s.seed}</div>
              <textarea
                value={s.note}
                onChange={(e) => setNote(s.id, e.target.value)}
                placeholder="이 사건을 어떤 화에 어떻게 쓸지 메모…"
                rows={2}
                style={{
                  width: '100%', boxSizing: 'border-box', resize: 'vertical',
                  background: 'var(--paper)', color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit',
                }}
              />
              <div className="linkbar">
                <span className="linkbar-label">연계:</span>
                <button className="linkbtn" onClick={() => toProject(s.by, s.seed, s.note)} disabled={!hasProjectBridge()}
                  title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 사건 시드를 프로젝트 자료 〈사건〉 폴더에 추가'}>
                  <Emoji e="📄" /> 프로젝트에 추가
                </button>
                <button className="linkbtn" onClick={() => toLibrary(s.seed)} title="글감으로 담기"><Emoji e="🧩" /> 글감으로 담기</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={hint}>슬롯 조합은 출발점일 뿐입니다. 내 인물·세계관·연재 흐름에 맞춰 자유롭게 비틀어 보세요.</div>
    </div>
  )
}
