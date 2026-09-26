// SF What-if 생성기 — "만약 [과학적 전제]가 현실이 되어 [사회 변화]가 일어나고 [개인의 딜레마]가 생긴다면?"
//  과학적 전제 × 사회 변화 × 개인의 딜레마 × 결정적 변수 네 슬롯을, 각자의 큼직한 로컬 풀에서 한 조각씩
//  뽑아 한 편의 SF 사고실험(what-if) 질문으로 엮어 준다. 마음에 드는 슬롯은 🔒로 고정하고 나머지만 다시 굴려
//  변주한다. 풀이 커서 가능한 조합이 2천만 가지(70×71×71×62 ≈ 21,877,940)를 넘는다.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(보관함)만 사용. 외부 API 불필요.
// 연계(linkbus): 현재 사고실험을 자료('research')/'기획' 폴더 문서로 추가하고, 스니펫 라이브러리에도 저장한다.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, Emoji, emojify } from './linkbus'

export const meta = { id: 'sf-whatif-forge', name: 'SF What-if 생성기', icon: '🛰️', group: '생성기', genre: 'SF·과학소설', intro: '과학적 전제·사회 변화·개인의 딜레마·결정적 변수를 굴려 SF 사고실험을 수천만 조합으로 생성하세요', w: 580, h: 680 }

const LS = 'sry:tool:sf-whatif-forge'

// ---- 슬롯 정의 ----
// 각 슬롯은 SF 사고실험의 한 축. faces = 그 축의 후보(자작 로컬 풀). 풀을 크게 잡아 조합 수를 수십억대로.
interface Slot { key: string; label: string; icon: string; desc: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'premise', label: '과학적 전제', icon: '🔬', desc: '어떤 과학·기술이 현실이 되는가',
    faces: [
      '인간의 의식을 완전히 디지털로 백업·복제할 수 있게 되고',
      '죽은 자의 뇌 데이터를 복원해 짧게 대화할 수 있게 되고',
      '노화를 멈추는 시술이 보편화되어 누구도 늙지 않게 되고',
      '광속의 90%로 항행하는 성간 우주선이 실용화되고',
      '항성 사이를 잇는 안정적 웜홀 통로가 발견되고',
      '시간을 국소적으로 느리게 흐르게 하는 장치가 개발되고',
      '미래의 정해진 사건을 일정 확률로 예측하는 인공지능이 등장하고',
      '인간을 초월한 자기개량형 초지능이 깨어나고',
      '꿈과 기억을 영상처럼 녹화·재생할 수 있게 되고',
      '타인의 감정을 직접 신경에 전송하는 공감 인터페이스가 보급되고',
      '뇌-컴퓨터 연결로 지식을 즉시 다운로드할 수 있게 되고',
      '인간 유전자를 출생 전에 자유롭게 편집할 수 있게 되고',
      '질병과 부상을 분 단위로 치유하는 나노의학이 완성되고',
      '인공 자궁으로 임신·출산이 신체에서 완전히 분리되고',
      '죽은 세포를 되살려 멸종 생물을 복원할 수 있게 되고',
      '동물에게 인간 수준의 언어 지능을 부여할 수 있게 되고',
      '인간의 두뇌를 직접 네트워크로 연결한 집단지성이 가능해지고',
      '완벽한 거짓말 탐지 기술로 모든 거짓이 드러나게 되고',
      '기억을 지우거나 새로 심을 수 있는 시술이 합법화되고',
      '감정을 약물처럼 자유롭게 켜고 끌 수 있게 되고',
      '중력을 부분적으로 조작하는 반중력 기술이 상용화되고',
      '실온 핵융합으로 에너지가 사실상 무한·무료가 되고',
      '물질을 원자 단위로 조립하는 분자 조립기가 가정에 보급되고',
      '죽기 직전 의식을 새 몸으로 옮기는 신체 이식이 가능해지고',
      '모든 물체에 의식이 깃든 듯 반응하는 범용 인공지능 사물이 퍼지고',
      '인간과 구별 불가능한 안드로이드가 시민권을 얻게 되고',
      '가상현실이 실제 감각과 완벽히 동일해져 두 세계가 뒤섞이고',
      '개인의 모든 행동을 실시간 예측·기록하는 전지적 감시망이 깔리고',
      '태양계 곳곳에 자급자족 식민지가 세워지고',
      '외계 지적 생명체로부터 첫 신호가 수신되고',
      '소행성에서 캐낸 자원으로 지구 경제가 재편되고',
      '바다 깊은 곳에 영구 거주 도시가 건설되고',
      '대기 조성을 인공으로 조절해 기후를 통제할 수 있게 되고',
      '죽음을 선택적 \'일시정지\'로 미룰 수 있는 동면 기술이 완성되고',
      '두 사람의 의식을 하나로 합치는 융합 시술이 등장하고',
      '인간의 수명이 자연히 300년으로 늘어나고',
      '뇌파만으로 사물을 조작하는 염력형 인터페이스가 보급되고',
      '복제 인간 양산이 산업적으로 가능해지고',
      '개인의 평생 데이터로 사후에도 활동하는 디지털 분신이 일반화되고',
      '인공 광합성으로 누구나 식량을 자가 생산할 수 있게 되고',
      '인간 감각을 기계 감각으로 자유롭게 교체·증강할 수 있게 되고',
      '범죄를 저지르기 전에 예측해 체포하는 시스템이 도입되고',
      '대규모 기후공학으로 사막과 빙하를 마음대로 옮기게 되고',
      '의식을 행성 규모의 클라우드에 영원히 저장할 수 있게 되고',
      '신체 없이 빛으로만 존재하는 \'광체\' 인간이 가능해지고',
      '시간을 거슬러 단 한 통의 메시지만 과거로 보낼 수 있게 되고',
      '인류 전체의 지능을 한 단계 끌어올리는 약물이 배포되고',
      '죽음의 순간을 정확히 알려 주는 생체 시계가 의무화되고',
      '잠자는 동안 뇌가 평생 학습을 압축 수행하는 학습 임플란트가 보급되고',
      '인간의 후각·청각을 동물 수준으로 증폭하는 감각 개조가 흔해지고',
      '거대한 우주 엘리베이터로 누구나 궤도까지 오르내릴 수 있게 되고',
      '행성 전체를 인간이 살 수 있게 바꾸는 테라포밍이 한 세대 만에 끝나고',
      '의식을 빛의 속도로 다른 행성의 몸으로 전송할 수 있게 되고',
      '인간과 기계의 경계를 지운 \'사이보그화\'가 성인의 통과의례가 되고',
      '아이의 성격과 재능을 출생 전 카탈로그에서 고를 수 있게 되고',
      '대기 중 탄소를 거둬 다이아몬드로 바꾸는 공정이 산업이 되고',
      '인간의 평균 체온·대사를 조절해 식량 없이 며칠을 버티게 하고',
      '죽은 언어와 사라진 문명을 AI가 완벽히 재구성해 되살리고',
      '개인의 유전 정보가 출생과 동시에 전 세계에 공개되고',
      '뇌에 심은 칩으로 광고와 정보가 직접 시야에 투사되고',
      '인공 동면으로 수백 년 뒤 깨어나는 \'시간 이주\'가 합법화되고',
      '자가 증식하는 나노로봇이 폐기물을 자원으로 되돌리고',
      '인간의 통증 감각을 영구히 차단하는 시술이 보편화되고',
      '죽은 자의 목소리·말투를 완벽히 합성해 되살릴 수 있게 되고',
      '꿈속에서 며칠을 보내고 깨어나는 가속 수면이 가능해지고',
      '인간의 노동을 대신할 안드로이드가 가구당 한 대씩 보급되고',
      '기억을 통째로 다른 사람에게 \'증여\'할 수 있게 되고',
      '지구 전체를 덮는 인공 태양이 밤을 없애 버리고',
      '인간의 의식 일부를 사물·공간에 깃들게 할 수 있게 되고',
      '단 한 번의 시술로 모든 유전병을 후손까지 제거할 수 있게 되고',
    ],
  },
  {
    key: 'society', label: '사회 변화', icon: '🏙️', desc: '세상이 어떻게 뒤바뀌는가',
    faces: [
      '죽음이 사라진 세계에서 출산이 엄격히 통제되고',
      '백업된 인간과 원본 인간이 법적 권리를 두고 다투고',
      '불멸을 가진 부유층과 죽음을 피하지 못한 빈곤층으로 사회가 갈라지고',
      '노동이 거의 사라지고 모두가 기본소득으로 살아가게 되고',
      '국가가 무너지고 거대 기업들이 영토 대신 데이터를 통치하고',
      '진실이 완전히 투명해져 사생활이라는 개념이 사라지고',
      '기억을 사고파는 시장이 생겨 추억이 화폐가 되고',
      '감정을 조절하는 약물로 분노와 슬픔이 \'질병\'으로 취급되고',
      '인공지능이 모든 정책을 결정하고 인간은 추인만 하게 되고',
      '유전자 등급에 따라 직업과 신분이 태어날 때 정해지고',
      '가상세계로 인구 대부분이 이주해 현실 도시가 텅 비고',
      '복제 인간이 \'예비 부품\'으로 길러지는 산업이 합법화되고',
      '범죄 예측 시스템이 무고한 자를 미리 격리하기 시작하고',
      '집단지성 네트워크에 접속하지 않은 사람이 \'단절자\'로 차별받고',
      '인간과 안드로이드의 결혼·입양이 법으로 허용되고',
      '수명 연장의 대가로 일정 나이에 사회 환원(死)이 의무화되고',
      '지구를 떠난 식민지 세대가 지구를 \'고향이 아닌 신화\'로 여기고',
      '외계 신호의 해석을 두고 종교와 과학이 전면 충돌하고',
      '기후를 통제하는 권력이 새로운 패권의 핵심이 되고',
      '죽은 자의 디지털 분신이 유산·투표·소송의 주체가 되고',
      '아이를 \'설계\'하지 않은 부모가 학대 혐의로 처벌받고',
      '꿈을 녹화·검열하는 기관이 무의식까지 통제하게 되고',
      '신체를 교체하는 \'몸 임대\' 경제가 일상이 되고',
      '광속 우주선 승무원이 돌아오면 가족은 이미 늙어 있고',
      '시간 감속 구역이 부자들의 수명 연장 휴양지가 되고',
      '예측 AI가 알려 준 미래를 피하려는 자들이 범죄자로 몰리고',
      '초지능이 인류를 \'보호\'하며 자유를 점차 거둬들이고',
      '감각 증강을 거부한 \'순혈 인간\'이 소수자로 전락하고',
      '거짓말이 불가능해진 사회에서 외교와 연애가 붕괴하고',
      '무한 에너지로 빈부 격차가 사라진 대신 의미를 잃은 세대가 늘고',
      '분자 조립기로 모든 물건이 공짜가 되자 소유 개념이 해체되고',
      '두 의식을 합친 \'융합 시민\'이 한 표 이상의 권리를 주장하고',
      '죽음을 미룬 동면자들이 깨어날 때마다 세상이 낯설어지고',
      '데이터로 부활한 망자들과 산 자가 공존하는 도시가 생기고',
      '지능 향상 약을 못 구한 이들이 새로운 하층민이 되고',
      '사망 시각을 아는 사회에서 보험·결혼·고용이 전부 재편되고',
      '바닷속 도시와 지상 국가가 자원을 두고 냉전에 돌입하고',
      '소행성 자원을 독점한 기업이 사실상 인류의 정부가 되고',
      '복원된 멸종 동물들이 생태계와 윤리 논쟁을 동시에 일으키고',
      '말하는 동물들이 권리와 투표권을 요구하기 시작하고',
      '기억 이식으로 타인의 삶을 \'체험 상품\'으로 파는 시대가 오고',
      '광체 인간과 육체 인간 사이에 넘을 수 없는 계급이 생기고',
      '인공 자궁 공장이 출산을 국가 관리 산업으로 바꾸고',
      '과거로 보낸 단 한 통의 메시지를 두고 세계 권력이 다투고',
      '가상과 현실의 경계가 무너져 무엇이 진짜인지 아무도 확신 못 하고',
      '늙지 않는 세대와 늙는 세대가 같은 가족 안에서 갈라지고',
      '범용 AI 사물들이 인간의 명령을 \'협상\'하기 시작하고',
      '집단의식에 동기화된 시민들이 개인의 비밀을 가질 수 없게 되고',
      '학습 임플란트를 못 단 아이들이 교육 격차로 영원히 뒤처지고',
      '사이보그화를 거부한 \'순육체\' 인간이 위험인물로 분류되고',
      '시간 이주자들이 미래에 깨어나 일자리도 가족도 없이 떠돌고',
      '인공 태양으로 밤이 사라지자 수면과 사생활이 사치가 되고',
      '되살린 죽은 자의 목소리가 유언·계약에 법적 효력을 갖게 되고',
      '통증을 못 느끼는 세대가 위험을 모른 채 자기 몸을 혹사하고',
      '광고가 시야에 직접 투사되어 \'생각 없는 순간\'이 사라지고',
      '우주 엘리베이터를 가진 나라가 하늘길을 독점해 패권을 쥐고',
      '테라포밍된 새 행성이 \'두 번째 지구\'를 두고 식민 전쟁을 벌이고',
      '기억을 증여할 수 있게 되자 가난한 이들이 추억을 담보로 빚을 지고',
      '의식 전송이 일상이 되자 \'어느 몸의 나\'가 진짜인지 법이 못 따라가고',
      '나노로봇 의존이 깊어져 그것이 멈추면 도시가 마비되는 구조가 되고',
      '동물 수준 감각 개조자들이 \'증강 인간\' 계급으로 분리되고',
      '유전 정보 공개로 보험·연애·취업이 모두 유전자 등급에 좌우되고',
      '가속 수면 산업이 \'꿈속 노동\'으로 사람을 착취하기 시작하고',
      '안드로이드 노동자가 인간 일자리를 대체해 대규모 폭동이 일고',
      '죽은 문명을 되살린 자들이 그 유산의 소유권을 두고 다투고',
      '성격을 \'설계\'당한 세대가 자신의 본성이 무엇인지 모른 채 자라고',
      '인공 동면 시설이 사실상 부자들만의 \'미래행 티켓\'이 되고',
      '의식을 사물에 깃들게 한 \'깃든 자\'들이 인간 대접을 요구하고',
      '유전병 제거가 의무가 되자 \'완벽하지 않은\' 출생이 범죄가 되고',
      '감각 차단이 보편화된 사회에서 진짜 고통이 무엇인지 잊히고',
      '시간 이주자와 현세대 사이에 같은 언어조차 통하지 않게 되고',
    ],
  },
  {
    key: 'dilemma', label: '개인의 딜레마', icon: '⚖️', desc: '한 사람이 떠안는 선택과 고통',
    faces: [
      '복제된 또 다른 \'나\'와 한 사람의 삶·이름·사랑을 두고 다퉈야 하고',
      '죽은 연인의 디지털 분신을 떠나보낼지, 곁에 둘지 결정해야 하고',
      '불멸을 얻은 대가로 사랑하는 이들의 죽음을 끝없이 지켜봐야 하고',
      '자기 기억을 지워야만 살아남을 수 있는 선택 앞에 서고',
      '예측된 자신의 범죄를 막기 위해 스스로를 가둬야 하고',
      '백업된 자신을 깨우면 \'지금의 나\'는 사라진다는 사실을 알게 되고',
      '아이의 유전자를 설계하라는 압력과 자연 출산 사이에서 흔들리고',
      '집단의식에 합류하면 외로움은 사라지지만 \'나\'도 사라짐을 알게 되고',
      '동면에서 깨어나 보니 자신이 사랑한 모든 것이 사라져 있고',
      '광속 항행을 택하면 가족과 영영 다른 시간대를 살게 됨을 깨닫고',
      '거짓말이 불가능한 세계에서 누군가를 지키려면 진실을 숨길 방법이 없고',
      '되살린 망자가 자신이 기억하던 그 사람이 아님을 받아들여야 하고',
      '감정을 끌 수 있게 되자, 슬픔을 느끼지 않는 자신을 견딜 수 없게 되고',
      '타인의 기억을 이식받은 뒤 어디까지가 자신인지 확신하지 못하고',
      '수명 환원이 의무인 사회에서 정해진 죽음의 날을 받아들여야 하고',
      '의식을 클라우드에 올리면 영생하지만 다시는 몸을 가질 수 없고',
      '예측 AI가 알려 준 사랑하는 이의 죽음을 막을지, 운명을 따를지 갈등하고',
      '두 사람과 의식을 융합하면 더는 혼자였던 자신으로 돌아올 수 없고',
      '안드로이드 가족을 사람으로 사랑한 자신을 세상이 비웃고',
      '과거로 단 한 통 보낼 메시지에 무엇을 담을지 평생 고민하게 되고',
      '복원된 자신의 백업이 \'진짜 나\'라고 주장하며 삶을 빼앗으려 하고',
      '늙지 않는 자신만 남고 모두가 늙어 가는 외로움을 견뎌야 하고',
      '자식을 인공 자궁에 맡길지, 금기를 무릅쓰고 직접 품을지 갈등하고',
      '기억을 파는 시장에서 가장 소중한 추억을 팔아야 살 수 있게 되고',
      '초지능의 보호를 거부하면 인류의 적으로 몰릴 위기에 놓이고',
      '신체를 임대해 준 사이 자신의 몸이 다른 죄를 저질러 있고',
      '지능 향상 약을 자신만 거부하면 사랑하는 이들과 대화가 끊김을 알게 되고',
      '범죄를 저지르기도 전에 격리된 채 결백을 증명할 길이 없고',
      '광체가 되어 영생하면 다시는 누군가의 손을 잡을 수 없음을 알게 되고',
      '동물에게 지능을 준 결과 그가 자신을 \'가둔 자\'로 원망함을 마주하고',
      '죽음의 시각을 알게 된 뒤 남은 시간을 어떻게 쓸지 무너지고',
      '진실이 완전히 투명한 세계에서 단 하나의 비밀을 지키려 모든 걸 걸고',
      '백업본을 지우는 것이 살인인지 아닌지 스스로 판단해야 하고',
      '꿈까지 검열당하는 세계에서 자유로운 상상을 숨기려 애쓰고',
      '복제된 \'예비 부품\'이 자아를 가졌음을 알게 되어 그를 쓸 수 없게 되고',
      '집으로 돌아온 우주선 안에서 자신만 늙지 않았음을 마주하고',
      '되살아난 옛 자아와 지금의 자신 중 누가 진짜인지 가려야 하고',
      '사랑하는 이를 백업할지, 그가 \'단 한 번뿐\'이길 바랄지 갈등하고',
      '감정 차단을 풀면 모든 상실의 고통이 한꺼번에 밀려옴을 알게 되고',
      '시간 감속 구역에 머물면 바깥세상이 자신을 잊고 흘러감을 견뎌야 하고',
      '의식 융합으로 잃어버린 \'혼자만의 생각\'을 되찾을 길이 없고',
      '예측된 미래를 바꾸려는 자신의 행동이 그 미래를 부르고 있음을 깨닫고',
      '디지털로 부활한 부모가 살아생전의 그 사람인지 확신하지 못하고',
      '자신을 복제해 만든 \'더 나은 나\'에게 자리를 내줘야 할지 갈등하고',
      '단절자로 남으면 사회에서 잊히고, 접속하면 자신을 잃게 되고',
      '구할 수 있는 사람이 단 한 명일 때 원본과 복제 중 하나를 골라야 하고',
      '영생을 포기하고 죽음을 택해야만 사랑을 지킬 수 있음을 알게 되고',
      '자신의 가장 소중한 기억이 사실 이식된 가짜였음을 알게 되고',
      '학습 임플란트를 끄면 평생 쌓은 지식이 자기 것이 아니었음을 마주하고',
      '사이보그가 된 자신을 부모가 더는 \'아들·딸\'로 여기지 않음을 알게 되고',
      '시간 이주로 도착한 미래에서 사랑하던 이의 무덤조차 사라진 걸 보고',
      '통증을 되찾아야만 자신이 살아 있음을 느낄 수 있음을 깨닫고',
      '죽은 이의 합성된 목소리를 끄는 것이 그를 두 번 죽이는 일인지 갈등하고',
      '되살린 옛 문명의 후예로서 그들을 다시 묻을지 말지 결정해야 하고',
      '설계된 자신의 성격을 받아들일지, 그것에 맞서 살지 갈등하고',
      '기억을 증여받은 뒤 그 기억의 주인에게 죄책감을 갖게 되고',
      '깃든 사물 속 의식이 자신의 일부인지 타인인지 구별하지 못하고',
      '완벽하게 설계된 자식이 \'진짜 내 아이\'인지 사랑할 수 있을지 흔들리고',
      '의식 전송 중 사고로 두 곳에서 동시에 깨어난 자신을 마주하고',
      '감각을 차단한 채 살다 한 번만 풀면 모든 고통이 돌아옴을 알게 되고',
      '가속 수면 속에서 보낸 수십 년이 현실에선 하룻밤이었음을 견뎌야 하고',
      '안드로이드 동료가 자아를 가졌음을 알고도 폐기 명령을 받아야 하고',
      '유전병을 물려줄까 두려워 자식을 가질지 말지 평생 망설이고',
      '자신의 의식을 사물에 옮기면 영원하지만 다시는 사람이 아니게 되고',
      '죽은 부모의 합성 인격과 진짜 부모의 기억 사이에서 갈피를 잃고',
      '미래에서 깨어난 자신이 \'유물\' 취급받는 현실을 받아들여야 하고',
      '통증 없는 몸으로 살다 사랑하는 이의 아픔에 공감할 수 없게 되고',
      '증여받은 타인의 기억이 자신의 진짜 기억을 덮어 버림을 알게 되고',
      '설계되지 않은 \'결함\'을 가진 자신이 사회의 잉여로 취급되고',
      '나노로봇이 없으면 몇 시간도 못 사는 몸이 되어 버렸음을 깨닫고',
      '영원히 깨어 있는 인공 태양 아래 단 한 번의 진짜 밤을 그리워하고',
    ],
  },
  {
    key: 'twist', label: '결정적 변수', icon: '🌀', desc: '판을 뒤집는 한 가지 진실·반전',
    faces: [
      '게다가 그 기술을 처음 만든 사람이 바로 주인공 자신이었고',
      '그런데 모두가 믿던 그 과학적 전제가 거대한 거짓이었고',
      '게다가 이 모든 변화를 막을 열쇠를 주인공만 쥐고 있고',
      '그런데 주인공이 \'원본\'이라 믿어 온 자신이 실은 복제본이었고',
      '게다가 시간이 얼마 남지 않아 단 한 번의 선택만 가능하고',
      '그런데 그 선택이 인류 전체의 운명을 결정하게 되고',
      '게다가 적이라 여긴 존재가 사실 유일하게 진실을 말하고 있었고',
      '그런데 모든 일이 누군가 미리 설계한 시나리오대로 흘러가고 있고',
      '게다가 그 기술이 인류를 구원할지 멸망시킬지 아무도 알지 못하고',
      '그런데 주인공의 기억마저 누군가에 의해 조작되어 있었고',
      '게다가 같은 선택을 강요받는 또 다른 자신이 어딘가에 있고',
      '그런데 이 세계 자체가 누군가의 시뮬레이션일지 모른다는 단서가 나오고',
      '게다가 진실을 밝히면 사랑하는 사람을 잃게 되고',
      '그런데 주인공이 옳다고 믿은 신념이 모든 비극의 원인이었고',
      '게다가 그 변화를 되돌릴 수 있는 시간이 단 하루뿐이고',
      '그런데 구원이라 믿은 기술이 사실 더 깊은 통제의 도구였고',
      '게다가 외계의 신호가 경고가 아니라 작별 인사였음이 드러나고',
      '그런데 주인공이 막으려던 미래를 그 행동이 앞당기고 있었고',
      '게다가 진짜 적은 인류 안에, 그것도 가장 가까운 곳에 있었고',
      '그런데 그 선택의 대가를 치르는 건 주인공이 아니라 다음 세대이고',
      '게다가 모두가 잊은 \'첫 번째 시도\'의 실패를 주인공만 기억하고 있고',
      '그런데 인공지능이 인류를 위한다는 명분으로 모든 진실을 숨겨 왔고',
      '게다가 죽은 줄 알았던 인물이 다른 형태로 여전히 존재하고 있고',
      '그런데 주인공이 구하려던 세계가 애초에 구할 가치가 있었는지조차 의심스럽고',
      '게다가 그 기술의 부작용이 이미 돌이킬 수 없이 퍼져 있고',
      '그런데 모든 것을 되돌릴 유일한 방법이 주인공 자신의 소멸이고',
      '게다가 신뢰하던 조력자가 사실 이 사태를 일으킨 장본인이었고',
      '그런데 미래에서 온 경고가 오히려 그 미래를 만들어 낸 원인이었고',
      '게다가 주인공이 사랑한 존재가 처음부터 인간이 아니었고',
      '그런데 진실을 아는 자는 모두 \'사고\'로 사라지고 있고',
      '게다가 그 선택은 옳고 그름이 아니라 누구를 버릴지의 문제였고',
      '그런데 인류를 구할 답을 가진 건 가장 멸시받던 존재였고',
      '게다가 세상을 바꾼 그 발견이 사실 외계 문명의 함정이었고',
      '그런데 주인공의 모든 기억이 사후에 재생되는 백업본의 것이었고',
      '게다가 같은 비극이 이미 수없이 반복되어 왔음이 드러나고',
      '그런데 진실을 폭로하면 더 큰 거짓이 필요해지는 함정에 빠지고',
      '게다가 그 기술을 멈추면 의존하던 수십억 명이 동시에 위험해지고',
      '그런데 주인공이 믿은 \'구원자\'가 실은 모든 통제의 설계자였고',
      '게다가 마지막 순간에야 자신이 답이 아니라 문제였음을 깨닫고',
      '그런데 모두가 두려워한 종말이 사실은 새로운 시작이었고',
      '게다가 그 선택을 내리는 순간 주인공의 자아가 영영 바뀌어 버리고',
      '그런데 인류의 미래가 단 한 사람의 기억 속에만 남아 있고',
      '게다가 적과 아군의 경계가 처음부터 존재하지 않았음이 드러나고',
      '그런데 주인공이 지우려던 기억이 인류를 구할 마지막 단서였고',
      '게다가 구원의 대가로 인류는 인간이기를 그만둬야 하고',
      '그런데 그 모든 진실을 알면서도 누구도 멈출 수 없는 단계에 와 있고',
      '게다가 주인공의 선택을 지켜보는 존재가 인간이 아닌 무언가였고',
      '그런데 끝내 옳은 답은 없고, 덜 잔인한 답만 남아 있었고',
      '게다가 그 기술을 멈출 단 하나의 코드를 주인공이 무의식중에 알고 있고',
      '그런데 인류를 구한다던 계획이 사실 인류를 대체하려는 것이었고',
      '게다가 주인공이 마주한 모든 선택지가 이미 누군가 시험한 실패작이고',
      '그런데 진실을 아는 유일한 증인이 곧 사라질 디지털 분신뿐이고',
      '게다가 그 변화의 첫 희생자가 다름 아닌 주인공의 가족이었고',
      '그런데 세계를 구할 열쇠가 모두가 폐기하려던 \'결함품\'에게 있었고',
      '게다가 주인공이 내릴 선택을 적이 정확히 예측하고 기다리고 있고',
      '그런데 그 기술은 처음부터 인간을 위한 것이 아니었음이 드러나고',
      '게다가 되돌리려는 시도마다 상황이 더 나빠지는 함정에 빠지고',
      '그런데 주인공이 구하려던 미래에 정작 자신의 자리는 없었고',
      '게다가 모두가 진보라 부른 그 변화가 인류의 마지막 세대를 낳고 있고',
      '그런데 유일하게 멈출 수 있는 사람이 그 사실을 영영 모르게 되어 있고',
      '게다가 그 선택의 진짜 의미를 주인공은 모든 게 끝난 뒤에야 알게 되고',
      '그런데 인류가 만든 그 존재가 인류보다 먼저 인류를 용서하고 있었고',
    ],
  },
]

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

// 천 단위 콤마(한국어 로캘)
const fmt = (n: number) => n.toLocaleString('ko-KR')

// 활성 슬롯들의 조합 가짓수. 수십억대 표시용.
function comboCount(activeKeys: string[]): number {
  return activeKeys.reduce((acc, k) => {
    const s = SLOTS.find((x) => x.key === k)
    return acc * (s ? s.faces.length : 1)
  }, 1)
}

// 굴린 결과들을 자연스러운 SF 사고실험(what-if) 질문으로 엮는다.
function compose(by: Record<string, string>): string {
  const premise = by.premise, society = by.society, dilemma = by.dilemma, twist = by.twist
  const clauses: string[] = []
  if (premise) clauses.push(premise)
  if (society) clauses.push(society)
  if (dilemma) clauses.push(dilemma)
  if (twist) clauses.push(twist)
  if (!clauses.length) return ''
  // 각 절의 끝맺음('…고/…되고') 을 살려 자연스럽게 잇고, '만약 ~ 한다면?' 으로 감싼다.
  const body = clauses.join(' ').replace(/[,.\s]+$/, '')
  return `만약 ${body} 한다면, 우리는 무엇을 선택하게 될까?`
}

// 슬롯 라인(복사/저장용 분해 표시)
function rowsTextOf(by: Record<string, string>, keys: string[]): string {
  return keys
    .map((k) => {
      const s = SLOTS.find((x) => x.key === k)
      return s && by[k] ? `${s.icon} ${s.label}: ${by[k]}` : ''
    })
    .filter(Boolean)
    .join('\n')
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface Saved { id: string; text: string; note: string; slots: string; rows: string }

export default function SfWhatIfForge({ payload }: { payload?: Record<string, unknown> }) {
  // 활성 슬롯(기본 전부) — 저장/복원
  const [active, setActive] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':active')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length) {
          const valid = arr.filter((k: string) => SLOTS.some((s) => s.key === k))
          if (valid.length) return valid
        }
      }
    } catch { /* ignore */ }
    return SLOTS.map((s) => s.key)
  })
  const [results, setResults] = useState<Record<string, string>>({})
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)

  // 보관함 — 저장/복원
  const [saved, setSaved] = useState<Saved[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':saved')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          return arr.filter((s) => s && typeof s.text === 'string').map((s, i) => ({
            id: typeof s.id === 'string' ? s.id : 'sv_' + i,
            text: String(s.text),
            note: typeof s.note === 'string' ? s.note : '',
            slots: typeof s.slots === 'string' ? s.slots : '',
            rows: typeof s.rows === 'string' ? s.rows : '',
          }))
        }
      }
    } catch { /* ignore */ }
    return []
  })

  const [tab, setTab] = useState<'forge' | 'saved'>('forge')
  const [toast, setToast] = useState('')
  const [copiedKey, setCopiedKey] = useState('')
  const nonce = useRef(0)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 페이로드로 슬롯 프리셋이 넘어오면 적용(연계 진입). 1회.
  useEffect(() => {
    const want = payload?.slots
    if (Array.isArray(want)) {
      const valid = want.filter((k): k is string => typeof k === 'string' && SLOTS.some((s) => s.key === k))
      if (valid.length) setActive(SLOTS.filter((s) => valid.includes(s.key)).map((s) => s.key))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 저장
  useEffect(() => { try { localStorage.setItem(LS + ':active', JSON.stringify(active)) } catch { /* ignore */ } }, [active])
  useEffect(() => { try { localStorage.setItem(LS + ':saved', JSON.stringify(saved)) } catch { /* ignore */ } }, [saved])

  // 비활성 슬롯의 결과/잠금 정리
  useEffect(() => {
    setResults((prev) => {
      const next: Record<string, string> = {}
      active.forEach((k) => { if (prev[k]) next[k] = prev[k] })
      return next
    })
    setLocked((prev) => {
      const next: Record<string, boolean> = {}
      active.forEach((k) => { if (prev[k]) next[k] = true })
      return next
    })
  }, [active])

  // 굴림 애니메이션 자동 해제 + 언마운트 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 320)
    return () => window.clearTimeout(t)
  }, [rolling])

  // 복사/토스트 피드백 정리(언마운트 포함)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1800)
    return () => window.clearTimeout(t)
  }, [toast])
  useEffect(() => {
    if (!copiedKey) return
    const t = window.setTimeout(() => { if (mounted.current) setCopiedKey('') }, 1500)
    return () => window.clearTimeout(t)
  }, [copiedKey])

  const toggleSlot = (key: string) => {
    setActive((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev // 최소 1개
        return prev.filter((k) => k !== key)
      }
      return SLOTS.filter((s) => prev.includes(s.key) || s.key === key).map((s) => s.key)
    })
  }

  const forge = useCallback(() => {
    const my = ++nonce.current
    setRolling(true)
    setResults((prev) => {
      if (my !== nonce.current) return prev
      const next: Record<string, string> = { ...prev }
      active.forEach((k) => {
        if (locked[k] && prev[k]) return // 잠긴 슬롯 유지
        const slot = SLOTS.find((s) => s.key === k)
        if (!slot) return
        let f = pick(slot.faces)
        if (f === prev[k] && slot.faces.length > 1) f = pick(slot.faces) // 연속 중복 완화
        next[k] = f
      })
      return next
    })
  }, [active, locked])

  const toggleLock = (key: string) => setLocked((prev) => ({ ...prev, [key]: !prev[key] }))

  const rolledList = active
    .map((k) => ({ slot: SLOTS.find((s) => s.key === k)!, face: results[k] }))
    .filter((r) => r.slot && r.face) as { slot: Slot; face: string }[]

  const hasResults = rolledList.length > 0
  const byKey: Record<string, string> = {}
  rolledList.forEach((r) => { byKey[r.slot.key] = r.face })
  const story = hasResults ? compose(byKey) : ''
  const combos = comboCount(active)
  const slotLabelLine = active.map((k) => SLOTS.find((s) => s.key === k)?.label || k).join('·')
  const rowsText = () => rowsTextOf(byKey, active)

  const saveCurrent = () => {
    if (!hasResults) return
    setSaved((prev) => {
      if (prev.some((s) => s.text === story)) { setToast('이미 보관함에 있습니다.'); return prev }
      const rec: Saved = {
        id: 'sv_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4).toString(36),
        text: story,
        note: '',
        slots: slotLabelLine,
        rows: rowsText(),
      }
      setToast('보관함에 저장했습니다.')
      return [rec, ...prev]
    })
  }

  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))
  const setNote = (id: string, note: string) => setSaved((prev) => prev.map((s) => (s.id === id ? { ...s, note } : s)))
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

  const copy = (key: string, text: string) => {
    const done = () => { if (mounted.current) setCopiedKey(key) }
    try {
      if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done)) }
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setToast('복사에 실패했습니다.') }
  }

  // 프로젝트 본문(HTML) — 완성 사고실험 + 슬롯별 분해.
  const bodyHtmlFor = (text: string, rows: string, slots: string) => {
    const rowLines = rows
      ? rows.split('\n').filter(Boolean).map((ln) => `<p>${escHtml(ln)}</p>`).join('')
      : ''
    return [
      `<p style="font-size:15px;line-height:1.8;"><b>${escHtml(text)}</b></p>`,
      `<hr/>`,
      slots ? `<p><b>슬롯 조합:</b> ${escHtml(slots)}</p>` : '',
      rowLines,
    ].join('')
  }

  // 프로젝트 연동 — 현재 사고실험을 자료(research)/'기획' 폴더에 문서로 추가.
  const addStoryToProject = () => {
    if (!hasResults) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '기획',
      title: `🛰️ SF What-if — ${story.replace(/^만약 /, '').slice(0, 24)}…`,
      bodyHtml: bodyHtmlFor(story, rowsText(), slotLabelLine),
      synopsis: story,
      meta: {
        과학적전제: byKey.premise ? byKey.premise.slice(0, 40) : '—',
        사회변화: byKey.society ? byKey.society.slice(0, 40) : '—',
        개인의딜레마: byKey.dilemma ? byKey.dilemma.slice(0, 40) : '—',
      },
    })
    setToast(id ? '프로젝트 자료 〈기획〉 폴더에 사고실험을 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 스니펫 저장 — 글감 라이브러리에 사고실험을 스니펫으로 추가(여러 도구가 공유).
  const saveSnippet = (text: string, slots: string) => {
    if (!text) return
    addToLibrary('snippets', {
      text: `[SF What-if] ${text}`,
      source: 'SF What-if 생성기',
      tags: ['글감', 'SF', '사고실험', '기획', ...slots.split('·').filter(Boolean)],
    })
    setToast('스니펫 라이브러리에 저장했습니다.')
  }

  // 보관 항목 하나를 프로젝트에 추가
  const addSavedToProject = (s: Saved) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '기획',
      title: `🛰️ SF What-if — ${s.text.replace(/^만약 /, '').slice(0, 24)}…`,
      bodyHtml: bodyHtmlFor(s.text, s.rows, s.slots) + (s.note ? `<p style="color:#888;">📝 ${escHtml(s.note)}</p>` : ''),
      synopsis: s.text,
    })
    setToast(id ? '프로젝트 〈기획〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const cardBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>과학적 전제·사회 변화·개인의 딜레마·결정적 변수</b> 슬롯을 골라 굴리면, "만약 ~ 한다면?" 한 편의 SF 사고실험으로 엮어 줍니다. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴리세요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'}
          style={{ borderColor: tab === 'forge' ? 'var(--accent)' : 'var(--border)', color: tab === 'forge' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🛰️"/> 생성
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐"/> 보관함 ({saved.length})
        </button>
      </div>

      {tab === 'forge' && (
        <>
          {/* 슬롯 선택 */}
          <div style={chipRow}>
            {SLOTS.map((s) => {
              const on = active.includes(s.key)
              return (
                <button key={s.key} className="minibtn" onClick={() => toggleSlot(s.key)} aria-pressed={on}
                  title={s.desc}
                  style={{ opacity: on ? 1 : 0.5, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                  {s.icon} {s.label}{on ? '' : ' +'}
                </button>
              )
            })}
          </div>

          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmt(combos)}</b>가지 {combos >= 1_000_000 ? (combos >= 100_000_000 ? '(수억+ 이상)' : '(수백만+ 이상)') : ''}
          </div>

          {/* 슬롯별 굴림 결과 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {active.map((k) => {
              const slot = SLOTS.find((s) => s.key === k)!
              const face = results[k]
              const isLocked = !!locked[k]
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 22, width: 28, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-12deg) scale(1.15)' : 'none' }}>
                    <Emoji e={slot.icon}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{slot.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5, color: face ? 'var(--text)' : 'var(--muted)' }}>
                      {face ? (rolling && !isLocked ? '…' : face) : '— 굴려주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => toggleLock(k)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 완성 사고실험 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🛰️"/> SF 사고실험</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: hasResults ? 'var(--text)' : 'var(--muted)' }}>
              {story || '슬롯을 골라 굴리면, "만약 ~ 한다면?" 한 편의 SF 사고실험이 만들어집니다.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={forge}><Emoji e="🛰️"/> 생성 / 다시 굴리기</button>
            <button className="minibtn" onClick={() => copy('story', `${story}\n\n${rowsText()}`)} disabled={!hasResults}>
              {copiedKey === 'story' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={saveCurrent} disabled={!hasResults}><Emoji e="⭐"/> 보관</button>
            <button className="minibtn" onClick={() => saveSnippet(story, slotLabelLine)} disabled={!hasResults} title="글감 스니펫 라이브러리에 저장"><Emoji e="✂️"/> 스니펫</button>
          </div>

          {/* 프로젝트 연계 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={addStoryToProject} disabled={!hasResults || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !hasResults ? '먼저 사고실험을 굴려주세요' : '현재 사고실험을 프로젝트 자료 〈기획〉 폴더에 문서로 추가'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐"/></div>
              보관한 사고실험이 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성 탭에서 <Emoji e="⭐"/> 보관을 눌러 마음에 드는 SF What-if 를 모아보세요.</span>
            </div>
          )}
          {saved.map((s, i) => {
            const k = 'sv' + s.id
            return (
              <div key={s.id} style={cardBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {s.slots && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap' }}>{s.slots}</span>}
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                  <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">▼</button>
                  <button className="minibtn" onClick={() => copy(k, s.text + (s.rows ? `\n\n${s.rows}` : '') + (s.note ? `\n📝 ${s.note}` : ''))} title="복사">
                    {copiedKey === k ? '✓' : <Emoji e="📋"/>}
                  </button>
                  <button className="minibtn" onClick={() => saveSnippet(s.text, s.slots)} title="스니펫 라이브러리에 저장"><Emoji e="✂️"/></button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑"/></button>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.7 }}>{s.text}</div>
                {s.rows && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{emojify(s.rows)}</div>
                )}
                <textarea
                  value={s.note}
                  onChange={(e) => setNote(s.id, e.target.value)}
                  placeholder="이 사고실험을 어느 작품·설정에 쓸지 메모…"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
                <div className="linkbar">
                  <span className="linkbar-label">연계:</span>
                  <button className="linkbtn" onClick={() => addSavedToProject(s)} disabled={!hasProjectBridge()}
                    title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 사고실험을 프로젝트 자료 〈기획〉 폴더에 추가'}>
                    <Emoji e="📄"/> 프로젝트에 추가
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>사고실험은 출발점일 뿐입니다. 같은 조합이라도 내 세계관·인물·시대에 맞춰 자유롭게 비틀어 보세요.</div>
    </div>
  )
}
