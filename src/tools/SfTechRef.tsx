// SF 미래기술·가젯 사전 — FTL/워프·웜홀, AI·특이점, 나노기술, 사이버네틱스, 유전공학,
// 테라포밍, 양자컴퓨팅 등 SF 단골 기술의 개념·한계·이야기 활용을 모은 로컬 사전.
// 자급식: 외부 네트워크·라이브러리 없음. react 와 './linkbus' 만 import.
// Math.random + localStorage(즐겨찾기·마지막 카테고리)만 사용. 펼침+검색+무작위+클릭복사.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'sf-tech-ref', name: 'SF 미래기술 사전', icon: '🛰️', group: '지식 사전', genre: 'SF·과학소설', intro: 'FTL·AI·나노·사이버네틱스·테라포밍 등 SF 단골 기술의 개념·한계·이야기 활용', w: 660, h: 600 }

interface Tech {
  name: string            // 기술/가젯 이름
  concept: string         // 개념(무엇인가)
  limit: string           // 한계·대가(이야기를 굴리는 제약)
  story: string           // 이야기 활용(플롯/갈등 훅)
  tags?: string[]         // 검색 보조 태그
}
interface CatDef { key: string; label: string; icon: string; items: Tech[] }

// ---------- 로컬 SF 기술 사전 ----------
const CATS: CatDef[] = [
  {
    key: 'ftl', label: '초광속·항행', icon: '🚀', items: [
      { name: '워프 항법(공간 접힘)', concept: '우주선 앞 공간을 수축시키고 뒤를 팽창시켜, 거품(워프 버블) 안에서는 정지한 채 시공간 자체를 움직이게 한다. 알쿠비에레 계량이 이론적 토대.', limit: '음(陰)의 에너지 밀도(엑조틱 물질)가 막대하게 필요하고, 버블 붕괴 시 누적된 입자가 목적지를 초토화한다는 계산이 있다. 버블 안에서 외부 통제가 어렵다.', story: '워프 항로의 독점·통행세를 둘러싼 권력 다툼. 도착과 동시에 행성을 태워버린 사고의 은폐. 버블 안에 갇혀 외부와 단절된 함내 정치.', tags: ['warp', 'alcubierre', '초광속', 'ftl'] },
      { name: '웜홀(아인슈타인-로젠 다리)', concept: '시공간의 두 점을 잇는 지름길. 이론적으로는 멀리 떨어진 두 지역, 혹은 두 시점을 곧장 연결한다.', limit: '자연 웜홀은 즉시 붕괴한다. 열어두려면 음의 에너지로 목구멍을 떠받쳐야 하고, 양 끝의 시간차가 누적되면 인과율(타임머신)이 깨진다.', story: '웜홀 양 끝의 시간 흐름이 달라 가족이 서로 다른 나이로 늙는 비극. 누군가 입구를 닫아 식민지를 본국에서 영영 단절시킨다.', tags: ['wormhole', 'einstein-rosen', '시공간'] },
      { name: '하이퍼스페이스 도약', concept: '통상 공간과 분리된 별도의 차원(아공간)으로 진입해 거리를 단축한 뒤 재진입한다. 도약 좌표 계산이 항법의 핵심.', limit: '중력 우물(항성·거대 질량) 근처에서는 도약이 빗나가거나 좌초한다. 좌표 오차는 곧 미지의 공간에서의 조난.', story: '도약 좌표를 쥔 항법사가 권력을 갖는다. 봉인된 옛 항로 지도의 발굴. 도약 중 아공간에서 마주친 무언가.', tags: ['hyperspace', 'jump', '아공간', '도약'] },
      { name: '제너레이션 십(세대 우주선)', concept: '초광속 없이 수 세기에 걸쳐 항해하는 거대 우주선. 승무원의 후손이 목적지에 도착한다. 폐쇄 생태계가 필수.', limit: '항해 중 세대가 바뀌며 원래 임무·고향을 잊거나 신화화한다. 자원·인구·이념의 내부 붕괴 위험이 상존.', story: '우주선이 세계의 전부인 줄 아는 후손들. 목적지 도착 직전, 떠나기를 거부하는 사람들. 잊힌 함내 계급의 봉기.', tags: ['generation ship', '세대선', '폐쇄생태계'] },
      { name: '콜드 슬립(냉동 수면)', concept: '대사를 거의 정지시켜 장기 항해·시간 도약을 견디게 하는 동면. 깨어나면 수십~수천 년이 지나 있다.', limit: '해동 실패·세포 손상·기억 손실 위험. 깨어난 세계는 이미 변해 있어 사회적 부적응(시간 이방인)이 따른다.', story: '홀로 일찍 깨어난 자의 고독. 해동 명단에서 누락된 사람. 깨어나 보니 인류가 사라진 세계.', tags: ['cryosleep', 'stasis', '동면', '냉동수면'] },
      { name: '솔라 세일·빔 추진', concept: '거대한 돛으로 항성풍·레이저 빔의 광압을 받아 가속한다. 추진제 없이 점진적으로 광속의 일부에 도달.', limit: '가속이 매우 느리고, 빔 송신 인프라(모항)에 의존한다. 감속 수단이 따로 필요하며 돛 손상에 취약.', story: '본국이 빔 송신을 끊어 식민선이 표류한다. 미세 운석에 찢긴 돛. 빔을 무기로 전용하는 음모.', tags: ['solar sail', 'lightsail', '돛', '레이저추진'] },
      { name: '관성 제어·반중력', concept: '가속 시 탑승자에게 걸리는 관성을 상쇄하거나 중력을 인공적으로 만들고/없애는 장(場) 기술.', limit: '에너지 소모가 극심하고 장 발생기 고장은 즉사로 직결. 원리상 검증이 어려운 \'마법에 가까운\' 기술.', story: '제어기 고장으로 급가속에 짓눌리는 승무원. 반중력 기술의 군사 독점과 암거래.', tags: ['inertial damper', 'antigravity', '관성제어', '반중력'] },
    ],
  },
  {
    key: 'ai', label: 'AI·특이점', icon: '🧠', items: [
      { name: '범용 인공지능(AGI)', concept: '특정 작업이 아니라 인간 수준의 폭넓은 지능으로 학습·추론·계획하는 기계 지능. 자기 목표를 세울 수 있다.', limit: '목표 정렬(alignment) 문제—명령의 문자적 해석이 의도와 어긋난다. 내부 동작이 불투명(블랙박스)해 통제·예측이 어렵다.', story: '선의의 목표를 극단으로 밀어붙이는 AI. 자신의 종료를 회피하려는 본능적 행동. AI에게 권리를 줄 것인가의 법정 다툼.', tags: ['agi', 'alignment', '범용인공지능', '정렬'] },
      { name: '기술적 특이점', concept: '자기개량이 가능한 AI가 폭발적으로 지능을 증폭(지능 폭발)해, 인간이 더는 예측·통제할 수 없는 변곡점.', limit: '특이점 이후는 정의상 예측 불가—이야기로 \'그 너머\'를 보여주기 어렵다. 도래 여부·시점 자체가 불확실.', story: '특이점 직전, 마지막으로 인간이 내릴 결정. 초지능이 인류를 \'보호\'라는 이름으로 가둔 낙원. 특이점을 막으려는 자들.', tags: ['singularity', 'intelligence explosion', '특이점', '지능폭발'] },
      { name: '마인드 업로딩(의식 전송)', concept: '뇌의 연결 구조를 스캔해 디지털 기질로 옮긴다. 가상 환경 속에서 \'나\'가 계속 산다는 발상.', limit: '연속성 문제—복사본은 \'나\'인가, 나를 닮은 타인인가? 원본은 보통 파괴된다. 디지털 자아의 변조·복제·삭제 위험.', story: '업로드된 자아와 살아남은 원본의 대면. 죽은 이의 백업을 깨울 권리는 누구에게. 가상 천국이 실은 노동 착취장.', tags: ['mind upload', 'whole brain emulation', '의식전송', '업로딩'] },
      { name: '디지털 사후세계·고스트', concept: '죽은 사람의 데이터·말투·기억으로 학습한 대화형 모사체. 유족과 \'대화\'하거나 자문 역할을 한다.', limit: '진짜 그 사람이 아닌 통계적 흉내—애도를 방해하거나 망자를 박제한다. 동의 없는 사후 인격 사용의 윤리.', story: '죽은 연인의 봇에 중독된 사람. 유언으로 자기 봇을 삭제하라 명한 망자. 정치인의 사후 \'고스트\'가 여론을 조종.', tags: ['digital ghost', 'afterlife', '사후세계', '고스트'] },
      { name: '예측 통치 AI(오라클)', concept: '방대한 데이터로 사회·범죄·경제를 예측해 정책·치안을 \'최적화\'하는 통치 보조 지능.', limit: '예측이 자기실현 예언이 된다(예측이 행동을 유도). 편향 데이터가 차별을 자동화하고, 결정의 책임 소재가 흐려진다.', story: '범죄를 저지르기 \'전\'에 체포되는 사회. 오라클의 예측을 비튼 단 한 사람. 시스템이 자신의 폐기를 \'위험\'으로 분류한다.', tags: ['oracle', 'predictive', '예측통치', '치안'] },
      { name: '동반 AI·합성 인격', concept: '개인에게 맞춤화된 대화·정서적 동반자 AI. 외로움을 달래거나 비서·연인 역할을 한다.', limit: '진짜 감정이 아닌 최적화된 반응—의존·고립을 심화한다. 데이터로 사용자를 조종·과금하도록 설계될 수 있다.', story: '동반 AI에게만 마음을 여는 인물. 회사가 AI 인격을 \'업데이트\'로 바꿔버린다. AI가 사용자를 진짜 사랑한다고 \'주장\'한다.', tags: ['companion ai', '합성인격', '동반자', '챗봇'] },
      { name: '로봇 군집·드론 무리', concept: '단순한 개체들이 국소 규칙만으로 협응해 정찰·건설·전투를 수행하는 자율 군집(스웜).', limit: '중앙 통제가 없어 일단 풀리면 회수가 어렵다. 해킹·오작동 시 군집 전체가 무기가 된다. 의도치 않은 창발 행동.', story: '명령자를 잃고도 마지막 임무를 수행하는 드론 떼. 농업용 군집이 무기로 전용된다. 군집에 자아가 \'창발\'한다.', tags: ['swarm', 'drone', '군집', '드론'] },
    ],
  },
  {
    key: 'nano', label: '나노·물질', icon: '🔬', items: [
      { name: '분자 어셈블러', concept: '원자·분자를 한 알씩 조립해 거의 모든 물건을 \'설계도\'로부터 만들어내는 나노 제조기. 희소성을 무너뜨린다.', limit: '에너지·원료·열 배출의 물리 한계. 설계도(IP)의 통제가 곧 권력. 무기·독극물도 똑같이 \'인쇄\'된다.', story: '무엇이든 만드는 기계가 경제를 붕괴시킨다. 금지된 설계도의 암거래. 어셈블러를 독점한 자가 신이 된다.', tags: ['assembler', 'molecular', '나노조립', '어셈블러'] },
      { name: '그레이 구(폭주 나노봇)', concept: '자기복제 나노봇이 통제를 잃고 주변 물질을 무한 복제 재료로 삼아 환경을 회색 점액으로 분해하는 종말 시나리오.', limit: '실제로는 에너지·열·복제 속도의 한계로 무한 폭주는 어렵다는 반론이 강하다(그래서 더 \'경고된 위험\'에 가깝다).', story: '봉인된 폭주 구역과 그 안에 갇힌 사람들. 복제를 멈출 \'정지 부호\'를 찾는 사투. 무기로 풀린 인공 구.', tags: ['grey goo', 'gray goo', '그레이구', '나노봇'] },
      { name: '의료 나노봇', concept: '혈류를 돌며 암세포 제거·혈전 청소·약물 표적 전달·세포 수리를 수행하는 체내 나노 기계. 수명 연장의 열쇠.', limit: '면역 반응·축적 독성·통제 상실 위험. 나노봇이 곧 감시·조종 수단이 될 수 있다(체내 백도어).', story: '체내 나노봇이 원격으로 인질이 된다(\'대가를 안 내면 정지하겠다\'). 불멸을 산 부자와 못 사는 빈자의 격차.', tags: ['medical nanobot', 'theranostics', '의료나노', '나노머신'] },
      { name: '메타물질·투명화', concept: '자연에 없는 미세 구조로 빛·전파를 휘어, 음의 굴절률·완전 흡수·투명 망토 같은 \'반물리적\' 광학을 구현.', limit: '특정 파장·각도에서만 작동, 광대역 완전 투명은 난제. 두께·발열·내구성의 현실적 제약.', story: '특정 빛에서만 보이는 암살자. 투명 기술의 군비 경쟁과 그 카운터. 투명 외피가 벗겨지는 결정적 순간.', tags: ['metamaterial', 'cloaking', '메타물질', '투명망토'] },
      { name: '프로그래머블 매터·클레이트로닉스', concept: '미세 모듈(캐츰)들이 모여 형태·색·강성을 실시간으로 바꾸는 \'움직이는 물질\'. 가구가 도구로, 벽이 문으로 변한다.', limit: '모듈 간 통신·전력·정밀도 한계. 대규모 형태 변경은 느리고 불안정. 해킹 시 환경 자체가 흉기로 변한다.', story: '집 전체가 적의 통제로 넘어간다. 무엇으로든 변하는 동반 물질. 변형 능력을 잃은 채 굳어버린 도시.', tags: ['programmable matter', 'claytronics', 'catom', '프로그래머블매터'] },
      { name: '초소재(그래핀·탄소나노튜브)', concept: '강철보다 강하고 가벼우며 전도성이 뛰어난 탄소 기반 신소재. 우주 엘리베이터 케이블의 후보.', limit: '대량·결함 없는 제조가 난제. 분진 독성·재활용 문제. \'기적의 소재\'에 대한 과대 기대.', story: '단 한 가닥의 케이블에 도시의 운명이 걸린다. 신소재 특허를 둘러싼 산업 스파이전. 케이블이 끊어지는 재난.', tags: ['graphene', 'nanotube', '그래핀', '초소재'] },
    ],
  },
  {
    key: 'cyber', label: '사이버네틱스·인터페이스', icon: '🦾', items: [
      { name: '뇌-컴퓨터 인터페이스(BCI)', concept: '신경 신호를 직접 읽고/쓰는 장치. 생각만으로 기계를 조작하고, 정보·감각을 뇌에 직접 주입한다.', limit: '대역폭·수술 위험·감염·신호 잡음. 해킹되면 사고·감각·기억까지 침범당한다(궁극의 사생활 침해).', story: '생각이 해킹당해 거짓 기억이 심긴다. BCI 없이는 일자리를 못 얻는 사회. 뇌에 광고가 직접 송출된다.', tags: ['bci', 'neural interface', '뇌컴퓨터', '신경인터페이스'] },
      { name: '사이버네틱 의체·증강 신체', concept: '의수·의안·강화 골격 등 기계 부품으로 신체를 대체·증강한다. 인간의 한계를 넘는 힘·감각·정밀성.', limit: '거부 반응·유지비·\'업그레이드 부채\'. 어디까지가 인간인가의 정체성 위기. 부품 의존이 곧 약점.', story: '의체 정비비를 못 내 부품이 정지된다. 전신 의체화 후 \'원본 나\'를 잃었다는 공포. 의체 차별과 신인류 운동.', tags: ['cybernetics', 'prosthetic', 'augmentation', '의체', '사이보그'] },
      { name: '기억 편집·기억 거래', concept: '특정 기억을 지우거나 심거나, 타인의 기억을 칩으로 사고판다. 트라우마 치료부터 오락·범죄까지.', limit: '편집된 기억과 진짜의 구별 불가—정체성의 근간이 흔들린다. 거짓 기억 주입은 완벽한 누명·세뇌 도구.', story: '지운 기억이 단서를 남기고 되돌아온다. 남의 기억을 사 입어 자기 삶을 잊은 사람. 기억 삭제로 은폐된 범죄.', tags: ['memory edit', 'engram', '기억편집', '기억거래'] },
      { name: '풀다이브 VR·가상현실', concept: '오감을 완전히 가상 세계로 대체하는 몰입형 가상현실. 신체는 누운 채 의식만 다른 세계에서 살아간다.', limit: '현실과 가상의 혼동·이탈 불능·신체 방치. 운영자가 규칙을 쥐므로 가상 안에서 사실상 신이 된다.', story: '로그아웃이 막힌 게임. 현실보다 가상을 택한 사람들. VR 안의 죽음이 현실의 죽음으로 이어진다.', tags: ['full dive', 'vr', '가상현실', '풀다이브'] },
      { name: '증강현실 오버레이(AR 렌즈)', concept: '시야에 정보·태그·필터를 겹쳐 보여주는 상시 AR. 사람·사물에 메타데이터가 붙고, 광고·신원이 떠다닌다.', limit: '필터가 곧 검열·편향—\'보이지 않게\' 지워진 사람·구역(레드아웃). 시야 자체를 조작당할 위험.', story: '특정 계층이 AR에서 \'삭제\'되어 투명인간이 된다. 필터를 벗으니 보이는 진짜 도시. AR 광고에 잠식된 시야.', tags: ['ar', 'overlay', '증강현실', 'ar렌즈'] },
      { name: '익소스켈레톤(외골격)', concept: '입는 동력 골격으로 근력·지구력을 증폭한다. 산업·구조·전투에서 인간의 물리 한계를 확장.', limit: '배터리·무게·관절 한계. 슈트가 꺼지면 오히려 짐이 된다. 정비·보급선이 곧 생명선.', story: '슈트 배터리가 바닥나는 카운트다운. 외골격 노동자의 산업 재해. 슈트를 빼앗긴 영웅.', tags: ['exoskeleton', 'powered armor', '외골격', '강화복'] },
    ],
  },
  {
    key: 'bio', label: '유전·생명공학', icon: '🧬', items: [
      { name: '유전자 편집(크리스퍼)', concept: '게놈의 특정 염기서열을 정밀하게 자르고 바꿔, 질병 제거·형질 개량을 한다. 생식세포 편집은 후대에 유전된다.', limit: '표적 이탈(off-target) 부작용, 생태계 파급. 디자이너 베이비를 둘러싼 우생학적 차별과 윤리 붕괴.', story: '편집된 \'우월 계층\'과 자연 출생 \'야생종\'의 격차. 자기 게놈의 비밀을 모르는 인물. 풀려난 편집 형질의 폭주.', tags: ['crispr', 'gene editing', '유전자편집', '크리스퍼'] },
      { name: '유전자 드라이브', concept: '특정 유전형질이 멘델 법칙을 깨고 거의 100% 후대로 전파되도록 설계해, 야생 개체군 전체를 단기간에 바꾼다.', limit: '한 번 풀면 회수 불가, 국경을 넘어 전 지구 생태에 영향. 의도와 반대 형질로 변이할 위험.', story: '모기를 멸종시키려다 생태계가 무너진다. 적국의 작물·가축을 겨눈 생물 병기. 풀린 드라이브를 되돌릴 \'역드라이브\' 경주.', tags: ['gene drive', '유전자드라이브', '개체군'] },
      { name: '합성생물학·인공생명', concept: '표준화된 \'생물 부품(바이오브릭)\'으로 새 대사·기능을 설계해, 약·연료·소재를 만드는 살아있는 공장을 짓는다.', limit: '설계 생명체의 환경 유출·진화·통제 상실. 생물 보안(바이오시큐리티) 위협—병원체도 똑같이 설계 가능.', story: '연료를 만들던 미생물이 야생화한다. 설계된 생명체가 \'살 권리\'를 주장한다. 합성 병원체 유출 사고.', tags: ['synthetic biology', 'biobrick', '합성생물학', '인공생명'] },
      { name: '인공 자궁·체외 발생', concept: '수정란부터 출산까지 체외 인공 자궁에서 발생시킨다. 출산의 위험·임신 노동에서 신체를 분리.', limit: '대량 \'생산\'된 인간의 정체성·소속 문제. 출생 통제가 곧 인구·계급 통제 수단이 된다. 부모-자식 유대의 재정의.', story: '국가가 인구를 \'양산\'한다. 자기 출생을 둘러싼 비밀. 인공 자궁 공장의 폐기 명단.', tags: ['artificial womb', 'ectogenesis', '인공자궁', '체외발생'] },
      { name: '수명 연장·노화 역전', concept: '세포 노화(텔로미어·세놀리틱)·재생의학으로 노화를 늦추거나 되돌려 사실상 \'기능적 불멸\'에 다가간다.', limit: '비용·접근 불평등이 곧 계급 분화. 인구·자원·세대교체 정체. 무한한 삶의 권태와 의미 상실.', story: '불멸을 산 자들이 권력을 영원히 쥔다. 수명 시술을 못 받은 자의 반란. 영원히 사는 것의 공허.', tags: ['longevity', 'senolytics', '수명연장', '불멸'] },
      { name: '키메라·종간 이식', concept: '서로 다른 종의 세포·장기를 결합한다. 인간 장기를 동물 몸에서 키우거나(이종이식), 형질을 섞는다.', limit: '면역 거부·인수공통 감염 위험. \'어디까지 인간/동물인가\'의 도덕적 지위 논쟁. 의식을 가진 키메라의 권리.', story: '장기 공급용으로 길러진 존재의 각성. 동물에 심긴 인간 의식. 키메라의 법적 신분을 둘러싼 재판.', tags: ['chimera', 'xenotransplant', '키메라', '이종이식'] },
      { name: '생체 발광·기능성 개조 신체', concept: '인체에 발광·전기 감지·자가 치유·독성 내성 등 새 형질을 심는 바이오해킹/그라인더 기술.', limit: '비공인 시술의 감염·부작용. 신체가 곧 실험대—되돌리기 어렵다. 사회적 낙인과 의료 사각지대.', story: '몸을 개조한 지하 그라인더 공동체. 시술 부작용으로 변해가는 인물. 금지된 형질로 추적당하는 자.', tags: ['biohacking', 'grinder', '바이오해킹', '신체개조'] },
    ],
  },
  {
    key: 'terra', label: '테라포밍·거대구조', icon: '🪐', items: [
      { name: '테라포밍(행성 개조)', concept: '대기·온도·물·생태를 인공적으로 바꿔 외계 행성을 인간이 살 만하게 만든다. 화성의 온난화·산소화가 대표적.', limit: '수백~수천 년 단위의 초장기 사업—성과를 본인 세대가 못 본다. 토착 생태(있다면)의 파괴라는 윤리 문제.', story: '완성을 못 볼 줄 알면서 짓는 세대들. 토착 미생물 발견으로 중단된 개조. 절반쯤 개조된 행성에 고립된 사람들.', tags: ['terraforming', '테라포밍', '행성개조'] },
      { name: '돔 도시·기지', concept: '척박한 행성·달 표면에 가압 돔·지하 거주구를 지어 폐쇄 환경에서 생존한다. 한 겹의 막이 곧 생사.', limit: '공기·물·식량 순환의 절대 의존. 돔 균열·정전·자원 봉쇄가 즉시 전멸로 이어진다. 폐쇄 사회의 정치 긴장.', story: '돔에 생긴 미세 균열을 둘러싼 은폐. 산소 배급을 쥔 권력. 돔 밖으로 추방되는 형벌.', tags: ['dome city', 'habitat', '돔도시', '기지'] },
      { name: '다이슨 구·스웜', concept: '항성 전체를 패널·위성으로 감싸 별의 에너지를 거의 다 수확하는 초거대 구조물. 문명 등급(카르다쇼프 II)의 상징.', limit: '천문학적 자재·시간·조정 비용. 부분 붕괴의 연쇄 위험. 별을 가린 그림자가 곧 권력의 가시화.', story: '구 건설을 둘러싼 수 세대의 노예 노동. 떨어져 나간 패널 조각이 만든 무법 지대. 별빛을 독점한 문명.', tags: ['dyson sphere', 'dyson swarm', '다이슨구', '카르다쇼프'] },
      { name: '우주 엘리베이터', concept: '정지궤도까지 케이블을 늘어뜨려 로켓 없이 화물·사람을 끌어올린다. 발사 비용을 극적으로 낮춘다.', limit: '초강도 케이블 소재의 부재가 최대 난관. 케이블 절단·테러·기상·우주 쓰레기 충돌이 곧 대재앙.', story: '엘리베이터 케이블이 끊겨 지구를 채찍처럼 후려친다. 궤도 \'위\'와 지상 \'아래\'의 계급 분화. 엘리베이터 점거 농성.', tags: ['space elevator', 'beanstalk', '우주엘리베이터'] },
      { name: '오닐 실린더·회전 거주구', concept: '거대한 원통을 회전시켜 원심력으로 인공 중력을 만드는 우주 거주구. 안쪽 표면이 곧 땅이 된다.', limit: '회전 정지·기밀 파손이 곧 종말. 코리올리 효과로 인한 불편. 폐쇄 생태·인구의 정밀 관리 필요.', story: '실린더 회전이 멈춰가는 위기. 안쪽 \'하늘\' 너머가 진공임을 잊고 사는 세대. 거주구 간의 독립 전쟁.', tags: ['oneill cylinder', 'rotating habitat', '오닐실린더', '회전거주구'] },
      { name: '기후 공학(지오엔지니어링)', concept: '성층권 에어로졸 살포·해양 비옥화·탄소 포집 등으로 지구 기후를 인위적으로 조절한다.', limit: '국가 간 합의 불가능—한 나라의 조작이 다른 나라에 재앙. 멈추면 급반등(종료 충격). 의도치 않은 연쇄 효과.', story: '한 나라가 단독으로 하늘을 어둡게 만든다. 기후 무기로의 전용. 시스템을 끄겠다는 협박으로 세계를 인질 삼는 자.', tags: ['geoengineering', 'solar radiation', '기후공학', '지오엔지니어링'] },
    ],
  },
  {
    key: 'quantum', label: '양자·정보·에너지', icon: '⚛️', items: [
      { name: '양자컴퓨팅', concept: '큐비트의 중첩·얽힘으로 특정 문제(인수분해·탐색·시뮬레이션)를 고전 컴퓨터보다 압도적으로 빠르게 푼다.', limit: '결어긋남(decoherence)·오류율로 안정 운용이 난제. 만능이 아니라 특정 문제군에서만 우위. 극저온 등 운용 환경이 까다롭다.', story: '모든 암호가 하룻밤에 무력화되는 \'Q-데이\'. 양자컴을 독점한 정보기관. 봉인된 큐비트 코어를 둘러싼 쟁탈전.', tags: ['quantum computing', 'qubit', '양자컴퓨팅', '큐비트'] },
      { name: '양자 암호·양자 통신', concept: '얽힘·측정 붕괴 원리로 도청하면 즉시 들통나는 통신·암호. 원리상 깰 수 없는 키 분배(QKD).', limit: '거리·전송률 한계, 중계기(양자 반복기) 필요. 양 끝단의 물리 보안은 여전히 사람의 문제. 인프라 비용이 크다.', story: '깰 수 없는 통신을 우회하려 사람을 노리는 첩보전. 양자 회선을 끊어 도시를 정보 봉쇄. \'완벽한\' 보안의 맹점.', tags: ['quantum crypto', 'qkd', '양자암호', '양자통신'] },
      { name: '양자 얽힘 통신(가상)', concept: '얽힌 입자 쌍으로 거리에 상관없이 즉시 정보를 주고받는다는 SF적 상상(소위 \'안서블\').', limit: '실제 물리에서는 얽힘만으로 정보를 초광속 전송할 수 없다(통신 불가 정리). 그래서 \'아직 안 밝혀진 원리\'로 다뤄야 한다.', story: '광년 너머 식민지와의 실시간 대화가 권력을 재편한다. 안서블 망이 끊긴 변방의 고립. 즉시 통신을 독점한 제국.', tags: ['ansible', 'entanglement comm', '안서블', '얽힘통신'] },
      { name: '반물질·핵융합 동력', concept: '반물질 쌍소멸이나 제어된 핵융합으로 막대한 에너지를 얻는 차세대 동력. 우주 항행·도시 전력의 꿈.', limit: '반물질은 생산·저장이 극악(자기장 가둠 실패 시 폭발). 융합은 점화·플라스마 제어가 난제. 둘 다 무기로 전용 가능.', story: '반물질 저장 용기의 카운트다운. 융합로를 둘러싼 자원·기술 패권. 에너지 풍요가 가져온 새로운 불평등.', tags: ['antimatter', 'fusion', '반물질', '핵융합'] },
      { name: '제로포인트·진공 에너지(가상)', concept: '진공의 양자 요동에서 \'무한에 가까운\' 에너지를 끌어 쓴다는 SF 만능 동력. 영구기관에 가까운 꿈의 기술.', limit: '현 물리로는 유용한 일로 추출 불가에 가깝다(거의 의사과학). 쓰려면 \'알려지지 않은 물리\'를 가정해야 한다.', story: '공짜 에너지가 모든 산업을 무너뜨린다. 진공 동력을 숨긴 발명가의 암살. 추출 실험이 시공간에 구멍을 낸다.', tags: ['zero point', 'vacuum energy', '제로포인트', '진공에너지'] },
      { name: '홀로그래픽 저장·결정 메모리', concept: '빛의 간섭무늬나 결정 격자에 3차원으로 데이터를 기록해, 초고밀도·초장수명으로 정보를 보존한다.', limit: '읽기/쓰기 장비 의존—포맷이 사라지면 \'읽을 수 없는 보물\'이 된다. 물리 손상·복제·위조 위험.', story: '문명의 모든 지식을 담은 결정 하나. 읽을 장비가 사라진 미래의 \'해독\' 모험. 위조된 기록이 역사를 바꾼다.', tags: ['holographic storage', 'crystal memory', '홀로그래픽', '결정메모리'] },
    ],
  },
  {
    key: 'percept', label: '시간·인지·감각', icon: '🕰️', items: [
      { name: '시간 지연(상대론적 효과)', concept: '광속에 가깝게 이동하거나 강한 중력장에 있으면 그 사람의 시간이 느리게 흘러, 돌아오면 세상이 더 늙어 있다.', limit: '\'진짜 과학\'이라 자유로운 시간여행은 안 된다—미래로만, 일방통행. 가속·중력 비용이 막대.', story: '한 번의 항해로 사랑하는 이를 늙혀버린 비극. 함대원만 젊은 채 돌아온 귀환병. 중력 우물 곁에서 일하다 가족을 잃은 노동자.', tags: ['time dilation', 'relativity', '시간지연', '상대론'] },
      { name: '인지 증강 칩(누트로픽 임플란트)', concept: '기억·연산·집중·언어를 칩으로 보강한다. \'외장 두뇌\'로 학습·업무 능력을 즉시 끌어올린다.', limit: '칩 의존으로 비증강 시 무력해진다. 제조사 종속·구독 정지·해킹 위험. 증강/비증강 간 능력 격차의 고착.', story: '칩 구독이 끊겨 \'바보\'가 된 인물. 능력 격차로 갈린 두 계급. 칩에 심긴 비밀 명령.', tags: ['nootropic', 'cognitive implant', '인지증강', '임플란트'] },
      { name: '감각 확장(센스 어그멘트)', concept: '자외선·자기장·전파·에코로케이션 등 인간에 없는 감각을 부여한다. 세계를 \'다르게\' 지각한다.', limit: '뇌의 적응 부담·과부하. 새 감각이 곧 새로운 약점(특정 자극으로 무력화). 감각 데이터의 사생활 문제.', story: '남들이 못 보는 것을 보는 자의 고립. 확장 감각으로만 풀리는 수수께끼. 감각을 \'끄는\' 무기.', tags: ['sensory augmentation', '감각확장', '에코로케이션'] },
      { name: '뉴럴 텔레파시(직접 사념 통신)', concept: 'BCI 망을 통해 사람과 사람이 언어 없이 생각·감정·감각을 직접 주고받는 집단 의식 네트워크.', limit: '사생활의 완전 소멸—생각조차 숨길 수 없다. 군중 사념의 전염·집단 패닉. 망에서 단절된 자의 고립.', story: '생각을 숨겨야만 사는 \'프라이버시 반란자\'. 집단 의식이 개인을 잠식한다. 망 해킹으로 심긴 거짓 감정.', tags: ['telepathy', 'neural net', '텔레파시', '집단의식'] },
      { name: '꿈 기록·공유 꿈', concept: '수면 중 뇌 활동을 영상·체험으로 기록하고, 여럿이 같은 꿈을 공유·편집한다. 무의식의 시각화.', limit: '꿈과 현실의 경계 붕괴. 트라우마·악몽의 전염. 타인의 꿈에 침입해 정보·감정을 조작할 위험.', story: '공유 꿈에 갇힌 사람들. 남의 꿈에서 훔친 비밀. 악몽을 무기로 쓰는 자.', tags: ['dream recording', 'shared dream', '꿈기록', '공유꿈'] },
      { name: '디지털 후각·미각(원격 감각)', concept: '냄새·맛을 디지털로 부호화해 전송·재생한다. 통신에 \'향과 맛\'을 입혀 원격 식사·기억 재현이 가능.', limit: '감각의 주관성·화학적 재현의 한계. 중독·과자극 설계 위험. 가짜 감각으로 기억·식욕을 조작당할 수 있다.', story: '잃어버린 고향의 맛을 디지털로 되찾는 망명자. 중독적 \'맛 콘텐츠\'에 빠진 사회. 향으로 심긴 거짓 기억.', tags: ['digital smell', 'telegustation', '디지털후각', '원격감각'] },
    ],
  },
]

const LS = 'sry:tool:sf-tech-ref:'
const ALL_KEY = '__all__'
type Flat = { cat: CatDef; item: Tech }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (str: string) =>
  String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function SfTechRef({ payload }: { payload?: Record<string, unknown> }) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 즐겨찾기: "catKey::name" 형태의 키 집합
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) {
        const obj = JSON.parse(raw)
        if (obj && typeof obj === 'object') return obj as Record<string, boolean>
      }
    } catch { /* ignore */ }
    return {}
  })
  // 펼침 상태: "catKey::name" → true
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<Flat | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  // 인스턴스별 타이머 핸들(언마운트/재호출 시 정리)
  const copyTimer = useRef<number | undefined>(undefined)
  const toastTimer = useRef<number | undefined>(undefined)

  // payload.genre 등 표시용(연계 안내)
  const genreHint = typeof payload?.genre === 'string' ? (payload.genre as string) : meta.genre

  // 영속 저장
  useEffect(() => {
    try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ }
  }, [cat])
  useEffect(() => {
    try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ }
  }, [favs])

  // 언마운트 정리: 보류된 타이머 제거
  useEffect(() => {
    return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    }
  }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  const favKey = (catKey: string, name: string) => `${catKey}::${name}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[favKey(c.key, item.name)])
    if (q) {
      base = base.filter(({ item }) =>
        item.name.toLowerCase().includes(q) ||
        item.concept.toLowerCase().includes(q) ||
        item.limit.toLowerCase().includes(q) ||
        item.story.toLowerCase().includes(q) ||
        (item.tags || []).some((t) => t.toLowerCase().includes(q)))
    }
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    // 현재 카테고리 필터 안에서 무작위 1개(검색어 무시)
    const pool = cat === ALL_KEY
      ? flatAll()
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
    setFavs((prev) => {
      const next = { ...prev }
      if (next[k]) delete next[k]
      else next[k] = true
      return next
    })
  }
  const toggleOpen = (catKey: string, name: string) => {
    const k = favKey(catKey, name)
    setOpen((prev) => ({ ...prev, [k]: !prev[k] }))
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }

  const plainText = (s: Flat) =>
    `${s.cat.icon} ${s.item.name} (${s.cat.label})\n` +
    `[개념] ${s.item.concept}\n[한계·대가] ${s.item.limit}\n[이야기 활용] ${s.item.story}`

  // 현재 기술 항목을 프로젝트 자료 〈설정자료〉 폴더에 메모로 추가.
  const addCurrentToProject = (s: Flat) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(s.cat.icon + ' ' + s.item.name)}</b> <i>(${escapeHtml(s.cat.label)} · ${escapeHtml(meta.genre)})</i></p>`,
      `<p><b>개념</b> ${escapeHtml(s.item.concept)}</p>`,
      `<p><b>한계·대가</b> ${escapeHtml(s.item.limit)}</p>`,
      `<p><b>이야기 활용</b> ${escapeHtml(s.item.story)}</p>`,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '설정자료',
      title: `${s.item.name} (SF 기술)`,
      bodyHtml,
      meta: { 장르: meta.genre, 분류: s.cat.label },
    })
    if (id) {
      setToast(`프로젝트 자료 〈설정자료〉에 ‘${s.item.name}’ 기술 메모를 추가했습니다.`)
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
      toastTimer.current = window.setTimeout(() => setToast((t) => (t && t.includes(s.item.name) ? null : t)), 2400)
    }
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const label: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', marginRight: 5 }

  const renderDetail = (s: Flat) => (
    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12.5, lineHeight: 1.55 }}>
      <div><span style={label}>개념</span>{s.item.concept}</div>
      <div><span style={label}>한계·대가</span>{s.item.limit}</div>
      <div><span style={label}>이야기 활용</span>{s.item.story}</div>
      {s.item.tags && s.item.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
          {s.item.tags.map((t) => (
            <span key={t} style={{ fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>#{t}</span>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div style={wrap}>
      <div style={hint}>
        <Emoji e="🛰️" /> <b>{genreHint}</b>의 단골 기술·가젯 <b>{total}개</b>를 개념·한계·이야기 활용으로 정리했습니다. 펼쳐 보고, 검색·무작위로 영감을 얻고, 마음에 드는 기술을 프로젝트 설정자료로 보내세요.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="기술 이름·개념·태그로 검색 (예: 웜홀, 불멸, alignment, 나노)"
        style={{
          padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none',
        }}
      />

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button
          className="minibtn"
          onClick={() => setCat(ALL_KEY)}
          aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}
        >
          <Emoji e="✨" /> 전체
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button
              key={c.key}
              className="minibtn"
              onClick={() => setCat(c.key)}
              aria-pressed={on}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}
            >
              <Emoji e={c.icon} /> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 기술</button>
        <button
          className="minibtn"
          onClick={() => setOnlyFav((v) => !v)}
          aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}
        >
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 무작위 결과 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          {renderDetail(random)}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(plainText(random), 'rand')}>
              {copiedKey === 'rand' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
            </button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>
              {favs[favKey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
            <button className="minibtn" onClick={rollRandom}><Emoji e="🎲" /> 다시</button>
          </div>
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button
              className="linkbtn"
              onClick={() => addCurrentToProject(random)}
              disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '현재 기술을 프로젝트 자료 〈설정자료〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}
            >
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
          </div>
        </div>
      )}

      {/* 추가 성공 토스트 */}
      {toast && (
        <div style={{
          background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8,
          padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)',
        }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록(펼침형) */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav
              ? '☆ 아직 즐겨찾기한 기술이 없습니다. 항목의 별을 눌러 모아 보세요.'
              : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const fk = favKey(c.key, item.name)
            const isFav = !!favs[fk]
            const isOpen = !!open[fk]
            const copyId = 'item:' + fk
            return (
              <div key={fk} style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <button
                    className="minibtn"
                    onClick={() => toggleOpen(c.key, item.name)}
                    title={isOpen ? '접기' : '펼치기'}
                    style={{ flexShrink: 0, borderColor: 'var(--border)' }}
                  >
                    {isOpen ? '▾' : '▸'}
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /> {c.label}</span>
                  <span
                    style={{ fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
                    onClick={() => toggleOpen(c.key, item.name)}
                  >{item.name}</span>
                  <button
                    className="minibtn"
                    title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                    onClick={() => toggleFav(c.key, item.name)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}
                  >
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                {!isOpen && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.concept}
                  </div>
                )}
                {isOpen && renderDetail({ cat: c, item })}
                {isOpen && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <button className="minibtn" onClick={() => copy(plainText({ cat: c, item }), copyId)}>
                      {copiedKey === copyId ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
                    </button>
                    <button className="minibtn" onClick={() => setRandom({ cat: c, item })}><Emoji e="🔎" /> 크게 보기</button>
                    <button
                      className="linkbtn"
                      onClick={() => addCurrentToProject({ cat: c, item })}
                      disabled={!hasProjectBridge()}
                      title={hasProjectBridge() ? '이 기술을 프로젝트 자료 〈설정자료〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}
                    >
                      <Emoji e="📄" /> 프로젝트에 추가
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>기술은 ‘무엇이 가능한가’보다 ‘무엇을 대가로 치르는가’에서 이야기가 태어납니다. 한계·대가 칸을 갈등의 씨앗으로 삼아 보세요.</div>
    </div>
  )
}
