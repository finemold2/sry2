// 수사·감식 용어 사전 — 미스터리·추리 창작 고증용.
// 현장 보존/부검·검시/지문/혈흔/DNA·미세증거/탄도·총기/심문·취조/사후 변화 등
// 수사 절차와 법과학(forensics) 용어를 정의·창작 메모와 함께 모은 로컬 사전.
// 자급식: react 와 './linkbus' 외 의존 없음. Math.random + localStorage(펼침·즐겨찾기·마지막 카테고리)만 사용.
import { useState, useEffect, useMemo, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'mystery-forensics', name: '수사·감식 용어 사전', icon: '🔬', group: '지식 사전', genre: '미스터리·추리', intro: '현장 보존·부검·지문·혈흔·DNA·탄도·검시·심문 등 수사 절차와 법과학 용어를 고증용으로', w: 660, h: 680 }

interface Term { name: string; aka?: string; def: string; tip: string }
interface CatDef { key: string; label: string; icon: string; items: Term[] }

// 로컬 수사·감식 용어 사전 — 9개 카테고리, 합계 100+ 항목. 모두 자작 설명(창작 고증용 개관).
const CATS: CatDef[] = [
  {
    key: 'scene', label: '현장 보존·감식', icon: '🚧', items: [
      { name: '현장 보존', aka: 'Crime Scene Preservation', def: '사건 현장을 발견 당시 그대로 지켜 증거의 오염·변형·소실을 막는 최초이자 핵심 절차. 최초 출동 경찰관(임장 경찰)의 첫 임무다.', tip: '범인이 아니라 "선의의 목격자·동료"가 증거를 망치게 하면 진범 추적이 한 박자 늦어진다 — 갈등의 씨앗.' },
      { name: '폴리스 라인', aka: '통제선 / Police Line·Cordon', def: '현장 안팎을 가르는 출입 통제선. 보통 외곽선(언론·구경꾼)과 내곽선(직접 수사구역) 이중으로 친다.', tip: '누가 라인 안으로 들어왔는가가 곧 용의자 명단의 출발점이 될 수 있다.' },
      { name: '임장 일지', aka: '현장 출입 기록부 / Scene Entry Log', def: '현장에 드나든 모든 사람의 시각·이름·목적을 적는 기록. 후일 증거 오염 책임과 동선을 추적하는 근거가 된다.', tip: '일지에 적히지 않은 인물이 현장에 있었다는 사실 자체가 결정적 단서가 된다.' },
      { name: '공통 진입로', aka: '단일 동선 / Single Path', def: '수사관이 현장을 밟지 않도록 미리 한 가닥 길만 정해 드나드는 경로. 증거 위 발자국 추가를 막는다.', tip: '서툰 형사가 이 원칙을 어겨 자기 발자국을 남기는 실수 — 초보 캐릭터 묘사에 유용.' },
      { name: '그리드 수색', aka: '격자 수색 / Grid Search', def: '현장을 바둑판처럼 나눠 한 칸씩 훑는 체계적 증거 수색법. 직선·나선·구역 수색 등 변형이 있다.', tip: '"아무도 보지 못한 작은 것"을 격자 끝 칸에서 발견하는 연출이 고전적이다.' },
      { name: '증거물 표식', aka: '넘버 텐트 / Evidence Marker', def: '증거 위치마다 번호를 세운 노란 표식(텐트). 사진·도면에 위치를 대응시키는 기준점이 된다.', tip: '번호 사이가 비어 있다(예: 1,2,4) — 누군가 증거 하나를 치웠다는 시각적 복선.' },
      { name: '현장 스케치', aka: '현장 도면 / Crime Scene Sketch', def: '증거·시신·가구의 위치와 거리를 비율로 그린 도면. 사진이 담지 못하는 공간 관계를 남긴다.', tip: '도면 속 거리가 진술과 어긋날 때 — "그 자리에서는 그것을 볼 수 없다"는 알리바이 붕괴.' },
      { name: '증거물 봉투', aka: '증거 수집 봉투 / Evidence Bag', def: '증거를 개별 밀봉·표기해 담는 봉투. 액체 증거는 종이, 마른 증거는 비닐 등 종류별로 다르게 쓴다.', tip: '젖은 혈흔 의류를 비닐에 밀봉해 곰팡이로 망치는 실수 — 감식 미스의 단골.' },
      { name: '대조 시료', aka: '컨트롤 샘플 / Control Sample', def: '오염 여부를 가리려 현장의 깨끗한 부분에서도 함께 채취하는 비교용 시료. 검출 결과의 신뢰도를 받친다.', tip: '대조 시료에서도 같은 게 나왔다면 증거 능력이 무너진다 — 법정 반전 장치.' },
      { name: '루미놀', aka: 'Luminol', def: '닦아낸 혈흔에도 반응해 푸르게 발광하는 화학 시약. 어둠 속에서 잠재 혈흔 패턴을 드러낸다.', tip: '청소된 욕실 바닥이 루미놀 아래 환히 빛나는 장면 — 시각적 충격의 정석.' },
      { name: '잠재 증거', aka: 'Latent Evidence', def: '맨눈으로는 보이지 않아 시약·광원·분말로 드러내야 하는 증거(지문·체액·미세물질 등).', tip: '"깨끗해 보이던 방"이 특수 광원 아래 전혀 다른 현장으로 바뀌는 반전.' },
      { name: '교차 오염', aka: 'Cross Contamination', def: '한 증거의 물질이 다른 증거·사람에게 옮아 섞이는 것. 장갑 미교체·동선 무시가 원인이다.', tip: '진범의 변호 전략으로 "오염 가능성"을 파고드는 법정물의 단골 공격.' },
      { name: '로카르의 교환 법칙', aka: "Locard's Exchange Principle", def: '"모든 접촉은 흔적을 남긴다." 범인은 현장에 무언가를 남기고 무언가를 가져간다는 법과학의 대원칙.', tip: '추리의 철학적 근거 — "완벽한 범죄는 없다"를 탐정의 신조로 삼게 하라.' },
    ],
  },
  {
    key: 'autopsy', label: '부검·검시', icon: '🩺', items: [
      { name: '부검', aka: '검시 해부 / Autopsy', def: '사인·사망 시각·사망 방식을 밝히려 시신을 의학적으로 해부·검사하는 절차. 법의관(부검의)이 집도한다.', tip: '부검 결과가 1차 추정과 정반대로 나오는 순간이 2막의 동력이 된다.' },
      { name: '검시', aka: '검안 / Post-mortem Examination', def: '해부 전 시신 외부를 살펴 손상·시반·체온 등으로 사망 정황을 살피는 단계. 외표 검사라고도 한다.', tip: '겉만 본 검안의 성급한 판단 vs 부검의 진실 — 두 전문가의 대립 구도.' },
      { name: '사인', aka: 'Cause of Death (COD)', def: '죽음을 직접 일으킨 의학적 원인(예: 출혈성 쇼크, 질식). "무엇이 죽였는가"에 대한 답.', tip: '표면적 사인 뒤에 숨은 진짜 사인(독→심정지)을 밝히는 게 추리의 핵심 갈래.' },
      { name: '사망의 종류', aka: 'Manner of Death', def: '죽음의 법적 성격 분류: 자연사·사고사·자살·타살·불상(미상). "어떻게 죽음에 이르렀나"의 분류.', tip: '"자살로 위장된 타살"이야말로 본격 미스터리의 고전적 출발점.' },
      { name: '사망 시각 추정', aka: 'Estimating Time of Death', def: '체온 하강·시반·사후강직·위 내용물 소화 정도 등을 종합해 사망 시점을 좁히는 추정. 폭이 넓고 변수가 많다.', tip: '사망 추정 시각이 용의자 알리바이와 겹치거나 어긋나는 지점 — 트릭의 무대.' },
      { name: '시반', aka: '시체 얼룩 / Livor Mortis', def: '사후 혈액이 중력 방향 낮은 곳으로 가라앉아 생기는 보랏빛 얼룩. 발생·고정 시점이 사망 시각·자세 추정 단서.', tip: '시반 위치가 발견된 자세와 안 맞으면 "시신이 사후에 옮겨졌다"는 결정적 증거.' },
      { name: '사후강직', aka: '시강 / Rigor Mortis', def: '사후 근육이 굳어 뻣뻣해지는 현상. 보통 사후 몇 시간 뒤 시작해 진행·소실되는 경과로 시각을 가늠한다.', tip: '강직 진행 단계와 진술 시각의 모순으로 거짓 알리바이를 깨는 클래식 트릭.' },
      { name: '사후 한랭', aka: '시랭 / Algor Mortis', def: '사후 체온이 주변 온도까지 떨어지는 과정. 하강 속도로 사망 경과 시간을 추정하나 환경 변수에 민감하다.', tip: '난방·냉방·물속 등 환경을 바꿔 사망 시각을 흐트러뜨리는 트릭의 핵심 변수.' },
      { name: '시신 부패 단계', aka: 'Decomposition Stages', def: '자가분해→부패→팽창→부패 진행→백골화로 이어지는 사후 변화 단계. 곤충·기온·습도에 따라 속도가 달라진다.', tip: '백골만 남은 변사체에서 신원·사인을 역추적하는 콜드 케이스 설정.' },
      { name: '법곤충학', aka: 'Forensic Entomology', def: '시신에 모인 곤충(특히 검정파리)의 발생·성장 단계로 사망 후 경과 시간을 추정하는 분야.', tip: '곤충 종이 그 계절·지역과 안 맞으면 "시신은 다른 곳에서 옮겨졌다"는 단서.' },
      { name: '위 내용물 분석', aka: 'Stomach Contents', def: '소화 진행 정도와 음식 종류로 마지막 식사 시각·내용을 추정. 사망 시각의 보조 단서가 된다.', tip: '"마지막 식사"로 피해자의 마지막 동선·동행자를 역추적하는 전개.' },
      { name: '독성학 검사', aka: '독물 검사 / Toxicology', def: '혈액·소변·장기·모발에서 약물·독극물·알코올을 검출·정량하는 검사. 결과가 나오기까지 시간이 걸린다.', tip: '독성 결과가 늦게 도착해 "이미 두 번째 희생자가" 같은 시간 압박을 만든다.' },
      { name: '방어흔', aka: 'Defensive Wounds', def: '피해자가 공격을 막다 손·팔에 입는 상처. 저항 여부와 공격 방향을 시사한다.', tip: '방어흔이 전혀 없다 → 면식범·기습·약물에 의한 무력화 등 범인상의 단서.' },
      { name: '주저흔', aka: 'Hesitation Marks', def: '자해·자살 시 본격적 상처 옆에 남는 얕고 망설인 듯한 상처. 자·타살 감별의 단서가 된다.', tip: '주저흔이 "없는" 자살은 타살 위장 의심을 부른다 — 위장 살인 폭로의 열쇠.' },
      { name: '생활반응', aka: 'Vital Reaction', def: '상처가 생전에 났는지(출혈·붓기 등) 사후에 났는지 구별하는 조직 반응. 사후 손상 위장을 가린다.', tip: '"사후에 낸 상처"로 사인을 위장한 트릭이 생활반응으로 들통난다.' },
    ],
  },
  {
    key: 'fingerprint', label: '지문·족적', icon: '🖐️', items: [
      { name: '지문', aka: 'Fingerprint', def: '손가락 마루(융선)가 만드는 무늬. 평생 변하지 않고 사람마다 달라 개인 식별의 고전적 표준이다.', tip: '"장갑을 꼈는데도" 안쪽 장갑·접촉면에서 의외의 흔적이 나오는 반전.' },
      { name: '잠재 지문', aka: 'Latent Print', def: '맨눈에 안 보이는 지문. 땀·기름 성분이 표면에 남긴 자국으로, 분말·시약·광원으로 현출한다.', tip: '"닦았다고 믿은" 곳에서 잠재 지문 하나가 남아 범인을 특정한다.' },
      { name: '현재 지문', aka: 'Patent Print', def: '피·잉크·먼지 등이 묻은 손가락이 남긴, 맨눈에 보이는 지문. 별도 현출 없이 촬영·채취한다.', tip: '핏빛 지문 하나가 벽에 선명히 — 시각적 충격과 즉각적 단서를 동시에.' },
      { name: '함몰 지문', aka: '입체 지문 / Plastic Print', def: '점토·양초·껌처럼 무른 표면에 눌려 입체로 찍힌 지문. 음각으로 남는다.', tip: '봉랍·비누·버터 같은 의외의 매체에 남은 입체 지문이 단서가 되는 묘미.' },
      { name: '융선 특징점', aka: '마뉴샤 / Minutiae', def: '융선이 끊기거나(단선) 갈라지는(분기) 등의 미세 특징점. 지문 대조의 실제 일치 기준이 된다.', tip: '"몇 개 점이 일치해야 동일인인가"의 기준을 둘러싼 법정 공방 소재.' },
      { name: '닌히드린', aka: 'Ninhydrin', def: '종이 등 다공성 표면의 땀 속 아미노산과 반응해 보랏빛으로 지문을 드러내는 시약.', tip: '범인이 만진 "편지·노트"에서 시약으로 지문을 살려내는 고전 장면.' },
      { name: '순간접착제 훈증', aka: '시아노아크릴레이트 / Superglue Fuming', def: '밀폐 공간에서 순간접착제 증기를 쐬어 매끈한 표면의 잠재 지문을 흰색으로 굳혀 드러내는 기법.', tip: '비닐봉지·총기·캔 같은 매끈한 흉기에서 지문을 살리는 감식 디테일.' },
      { name: '지문 자동 검색', aka: 'AFIS', def: '채취 지문을 대규모 데이터베이스와 자동 대조하는 시스템. 후보를 추리면 최종 확인은 감정인이 한다.', tip: '"DB에 없는 지문" = 전과 없는 범인. 수사가 막히는 벽으로 활용.' },
      { name: '족적', aka: '발자국 / Footwear Impression', def: '신발 바닥 무늬가 남긴 자국. 종류·치수·마모 패턴으로 신발과 보행 특징을 좁힌다.', tip: '독특한 신발 밑창 무늬가 현장과 용의자를 잇는 결정적 물증.' },
      { name: '타이어 자국', aka: 'Tire Track', def: '차량 타이어가 남긴 자국. 트레드 패턴·폭·축간거리로 차종·진행 방향을 추정한다.', tip: '진입·이탈 방향을 거꾸로 읽어 범인의 도주로를 복원하는 추리.' },
      { name: '공구흔', aka: '도구 자국 / Tool Mark', def: '드라이버·빠루 등이 자물쇠·창틀에 남긴 긁힘·눌림 자국. 특정 공구와 대조 가능하다.', tip: '"안에서 잠긴 방"의 공구흔이 침입 트릭의 진상을 알려준다.' },
      { name: '치흔', aka: '교흔 / Bite Mark', def: '깨문 자국. 치열 형태로 가해자를 좁히려 쓰이나 증거로서 신뢰성 논란이 있다.', tip: '신뢰성 논란 자체를 "잘못된 유죄"의 모티프로 쓰면 묵직한 주제가 된다.' },
    ],
  },
  {
    key: 'blood', label: '혈흔 분석', icon: '🩸', items: [
      { name: '혈흔 형태 분석', aka: 'BPA / Bloodstain Pattern Analysis', def: '핏방울의 모양·크기·분포를 분석해 가격 방향·횟수·위치·흉기 종류를 역추정하는 분야.', tip: '"피가 거짓말을 한다"는 위장 — 뿌려놓은 혈흔이 물리법칙과 안 맞아 들통난다.' },
      { name: '비산혈흔', aka: '튄 피 / Spatter', def: '힘이 가해져 공중으로 흩뿌려진 핏방울. 속도에 따라 저속·중속·고속 비산으로 나뉜다.', tip: '고속 비산(안개 같은 미세 혈흔)은 총상·고에너지 충격을 시사 — 흉기 추정 단서.' },
      { name: '낙하혈흔', aka: 'Drip / Passive Stain', def: '중력만으로 떨어진 피. 떨어진 높이에 따라 가장자리의 톱니(돌기) 모양이 달라진다.', tip: '핏방울 톱니의 방향으로 피해자가 "걸어간 경로"를 복원하는 묘사가 가능.' },
      { name: '이탈혈흔', aka: '캐스트오프 / Cast-off', def: '흉기를 휘두를 때 묻은 피가 원심력으로 튀어 천장·벽에 호를 그리며 남는 혈흔.', tip: '천장에 그려진 호의 개수로 "몇 번 내리쳤는가"를 세는 섬뜩한 디테일.' },
      { name: '동맥 분출흔', aka: 'Arterial Spurt', def: '동맥이 잘려 심박에 맞춰 리듬 있게 뿜어져 나온 혈흔. 큰 혈관 손상을 시사한다.', tip: '분출흔의 높이·리듬으로 피해자가 그때 "서 있었는지 누워 있었는지"를 추정.' },
      { name: '응혈·접촉흔', aka: 'Transfer / Smear', def: '피 묻은 물체나 손이 닿아 옮겨진 자국, 또는 끌린 자국(스미어). 접촉·이동을 보여준다.', tip: '바닥의 끌린 혈흔이 "시신을 끌고 간 동선"을 그대로 그려 보인다.' },
      { name: '공백흔', aka: '보이드 / Void Pattern', def: '혈흔이 사방에 있는데 한 군데만 비어 있는 형태. 그 자리에 무언가(사람·물건)가 있었음을 뜻한다.', tip: '공백의 윤곽으로 "사라진 흉기·사라진 사람"의 형체를 역으로 그려내는 추리.' },
      { name: '혈액형 검사', aka: 'ABO Typing', def: '혈액을 ABO·Rh 형으로 분류하는 기본 검사. 배제에는 유용하나 개인 특정력은 낮다.', tip: '시대극·DNA 이전 배경에서 "혈액형 불일치"만으로 용의자를 좁히는 수사.' },
      { name: '혈흔 추정 검사', aka: '카스틀-마이어 / Presumptive Test', def: '대상이 혈액인지 현장에서 빠르게 가리는 예비 검사(루미놀·페놀프탈레인 등). 확정은 별도로 한다.', tip: '"붉은 얼룩"이 페인트인지 피인지 — 예비 검사로 뒤집히는 초반 오인.' },
    ],
  },
  {
    key: 'dna', label: 'DNA·미세증거', icon: '🧬', items: [
      { name: 'DNA 프로파일링', aka: '유전자 지문 / DNA Profiling', def: '개인마다 다른 DNA 특정 구간(STR)을 분석해 신원을 식별·대조하는 기법. 현대 법과학의 표준.', tip: '쌍둥이·혼합 시료·미량 DNA 등 "DNA도 만능이 아닌" 상황이 반전의 여지를 만든다.' },
      { name: 'STR 분석', aka: '단순반복서열 / Short Tandem Repeat', def: '짧은 염기서열이 사람마다 다른 횟수로 반복되는 부위를 분석. 현 DNA 감정의 핵심 표준이다.', tip: '전문 용어를 탐정·법의관의 대사로 자연스럽게 흘리면 고증의 밀도가 산다.' },
      { name: '접촉 DNA', aka: '터치 DNA / Touch DNA', def: '손이 닿은 물체에 떨어진 미량의 피부세포에서 얻는 DNA. 극소량이라 오염·이차전이 논란이 있다.', tip: '"만진 적 없다"는 진술이 터치 DNA로 깨지거나, 거꾸로 이차전이로 누명이 씌워지는 양날.' },
      { name: '미토콘드리아 DNA', aka: 'mtDNA', def: '모계로만 유전되는 세포소기관 DNA. 모발 줄기·오래된 뼈처럼 핵 DNA가 부족한 시료에 쓴다.', tip: '백골·머리카락만 남은 콜드 케이스에서 모계 친족을 통해 신원을 좁히는 전개.' },
      { name: '가계도 DNA 수사', aka: 'Forensic Genetic Genealogy', def: '범인의 DNA를 공개 족보 DNA DB와 대조해 먼 친척을 찾고 가계를 좁혀 용의자를 특정하는 기법.', tip: '"DB에 없던 범인"을 친척의 DNA로 잡아내는 현대 콜드 케이스의 신무기.' },
      { name: '미세증거', aka: '트레이스 / Trace Evidence', def: '섬유·머리카락·유리 파편·페인트·토양 등 눈에 잘 안 띄는 미량 물질. 접촉·이동을 잇는 연결고리.', tip: '옷에 붙은 희귀한 섬유 한 올이 범인의 직업·장소를 가리키는 고전 단서.' },
      { name: '섬유 감정', aka: 'Fiber Analysis', def: '섬유의 종류·색·꼬임·염료를 비교해 의류·카펫·차량 내장재 등과 대조하는 분야.', tip: '"피해자에게 없던 카펫 섬유"가 범행 차량을 특정한다.' },
      { name: '모발 감정', aka: 'Hair Analysis', def: '모발의 형태·색·뿌리 상태로 종·부위·강제 탈락 여부를 살피고, 뿌리가 있으면 DNA도 얻는다.', tip: '"뽑힌(강제 탈락) 모발"은 격렬한 저항을 시사 — 사건 정황의 단서.' },
      { name: '토양·식물 감정', aka: 'Forensic Geology/Botany', def: '신발·차량의 흙, 옷에 붙은 씨앗·꽃가루로 다녀온 장소를 좁히는 분야.', tip: '신발 흙이 "현장에 없는 토양"이면 시신·범인이 제3의 장소를 거쳤다는 증거.' },
      { name: '유리 파편 분석', aka: 'Glass Fragment Analysis', def: '깨진 유리의 굴절률·두께·방사형/동심원 균열로 깨진 방향·순서를 읽는다.', tip: '"안에서 깼나 밖에서 깼나"를 균열로 가려 침입 위장을 폭로하는 디테일.' },
      { name: '필적·문서 감정', aka: 'Questioned Document', def: '필적·잉크·종이·인쇄를 분석해 위조·변조·작성자를 가리는 분야.', tip: '유서·계약서·협박장의 필적 감정으로 위장·대필을 밝히는 본격 추리.' },
      { name: '디지털 포렌식', aka: 'Digital Forensics', def: '휴대폰·PC·CCTV·통신 기록에서 삭제·은닉 데이터를 복원·분석하는 분야. 현대 수사의 큰 축.', tip: '"지운 메시지" 복원, 기지국·CCTV로 동선 복원 — 현대 알리바이 트릭의 무대.' },
    ],
  },
  {
    key: 'ballistics', label: '탄도·총기', icon: '🔫', items: [
      { name: '탄도학', aka: 'Ballistics', def: '탄환의 발사·비행·명중을 다루는 분야. 내탄도(총열 내)·외탄도(비행)·종말탄도(명중 시)로 나뉜다.', tip: '탄도 재구성으로 "어디서 쐈는가(사격 위치)"를 역산해 저격 트릭을 깬다.' },
      { name: '강선흔', aka: '라이플링 마크 / Rifling Marks', def: '총열 내부 나선 홈(강선)이 탄환 표면에 새기는 줄무늬. 총마다 미세하게 달라 총기 식별의 핵심.', tip: '같은 총기에서 발사됐는지 강선흔으로 잇는 "연쇄 사건" 연결의 정석.' },
      { name: '탄피·약실흔', aka: 'Cartridge Case Marks', def: '발사 시 공이·약실·추출기가 탄피에 남기는 자국. 발사 총기를 특정하는 또 다른 지문이다.', tip: '현장에 떨어진 탄피 하나가 무기를, 그 무기가 소유자를 가리킨다.' },
      { name: '총상 입사·출사구', aka: 'Entry/Exit Wound', def: '탄환이 들어간 자리(입사구, 보통 작고 정연)와 나간 자리(출사구, 보통 크고 불규칙). 방향·거리를 시사.', tip: '"입사·출사구가 뒤바뀐" 모순으로 자살 위장 타살을 폭로하는 트릭.' },
      { name: '사입 거리 추정', aka: 'Range of Fire', def: '총상 주변의 화약 잔재·그을음·자상(스티플링)으로 발사 거리(접사·근사·원사)를 가늠한다.', tip: '"자살"이라는데 자기 손이 닿지 않는 원거리 사격흔이면 곧장 타살 의심.' },
      { name: '총기 발사 잔류물', aka: 'GSR / Gunshot Residue', def: '발사 시 손·옷·주변에 튀는 미세 화약 입자. 사격 여부·근접성의 단서가 된다.', tip: 'GSR이 "엉뚱한 사람" 손에서 나오거나, 진범 손이 깨끗한 트릭(장갑·물세척)의 묘미.' },
      { name: '탄착군', aka: 'Shot Grouping', def: '여러 발이 명중한 자국의 분포. 사수의 숙련도·거리·총기 안정성을 시사한다.', tip: '"흩어진 탄착군 vs 정밀한 한 발" — 범인이 전문가인지 아닌지의 단서.' },
      { name: '도검흔·자창', aka: 'Stab/Incised Wound', def: '찌른 상처(자창)는 깊고, 벤 상처(절창)는 길다. 칼날 폭·각도로 흉기와 가격 방향을 추정한다.', tip: '상처 폭과 깊이가 "제시된 흉기"와 안 맞으면 진짜 흉기는 따로 있다는 단서.' },
      { name: '둔기 손상', aka: 'Blunt Force Trauma', def: '둔탁한 물체에 가격되어 생긴 함몰·열상·골절. 흉기 표면 형태가 상처에 찍히기도 한다.', tip: '상처에 찍힌 독특한 무늬(예: 격자·문양)가 특정 흉기를 지목한다.' },
    ],
  },
  {
    key: 'interrogation', label: '심문·진술', icon: '🗣️', items: [
      { name: '심문', aka: '취조 / Interrogation', def: '용의자를 상대로 혐의를 확인하려 묻는 대질·추궁 과정. 임의성(강압 없음)이 보장돼야 증거능력이 선다.', tip: '강압·회유로 받아낸 자백이 뒤에 무너지는 "허위 자백" 반전의 토대.' },
      { name: '참고인 조사', aka: 'Witness Interview', def: '사건과 관련된 비(非)용의자(목격자·관계자)에게 사실을 듣는 면담. 진술의 일관성·기억의 한계를 살핀다.', tip: '"선의의 목격자"의 잘못된 기억이 수사를 엉뚱한 길로 끄는 장치.' },
      { name: '진술 조서', aka: 'Statement / Deposition', def: '진술 내용을 정리해 본인 확인·서명을 받은 문서. 후일 진술 번복을 가리는 근거가 된다.', tip: '초기 조서와 법정 증언의 미묘한 차이가 위증·은폐를 드러낸다.' },
      { name: '미란다 고지', aka: 'Miranda Warning', def: '신문 전 진술거부권·변호인 조력권 등을 알려야 한다는 원칙. 어기면 자백의 증거능력이 흔들린다.', tip: '절차 하자(미고지)로 결정적 자백이 무용지물 되는 법정 반전.' },
      { name: '진술 거부권', aka: '묵비권 / Right to Silence', def: '불리한 진술을 강요당하지 않을 권리. 침묵 자체를 불리한 정황으로 삼을 수 없다.', tip: '"묵비"하는 용의자의 침묵을 어떻게 읽느냐가 탐정과 형사의 시각 차이를 드러낸다.' },
      { name: '알리바이', aka: 'Alibi', def: '범행 시각에 다른 곳에 있었다는 부재 증명. 미스터리에서 깨고 세우기를 반복하는 핵심 장치.', tip: '"완벽한 알리바이"일수록 어딘가 인위적 — 알리바이 공작 자체가 트릭이다.' },
      { name: '알리바이 공작', aka: 'Alibi Trick', def: '사망 시각·동선·시계·교통수단을 조작해 거짓 부재 증명을 꾸미는 수법. 본격 추리의 단골 트릭.', tip: '시각표·시계 조작·대역(替え玉)·원격 알리바이 등 기법별로 깨는 쾌감을 설계하라.' },
      { name: '대질 신문', aka: 'Confrontation', def: '진술이 엇갈리는 둘 이상을 마주 앉혀 모순을 드러내는 신문. 거짓말의 균열을 노린다.', tip: '대질 중 한쪽이 무심코 흘린 한마디가 전모를 무너뜨리는 클라이맥스.' },
      { name: '거짓말 탐지', aka: '폴리그래프 / Polygraph', def: '맥박·호흡·피부 전도 변화를 재 거짓 여부를 추정하는 장치. 신뢰성 논란으로 증거능력은 제한적이다.', tip: '"통과한 진범 / 떨어진 무고한 자" — 기계를 맹신하는 함정을 드라마로.' },
      { name: '인지 면담', aka: 'Cognitive Interview', def: '목격자가 당시 맥락·감각을 떠올리게 유도해 기억을 더 끌어내는 면담 기법. 유도 없이 회상을 돕는다.', tip: '서툰 유도신문 vs 노련한 인지면담 — 수사관의 역량 차이를 보여주는 대비.' },
      { name: '프로파일링', aka: '범죄자 프로파일링 / Criminal Profiling', def: '범행 수법·현장 행동에서 범인의 성격·습관·배경을 추론하는 기법. 수사 범위를 좁히는 데 쓴다.', tip: '프로파일이 "딱 맞는 듯" 빗나가, 진범은 정반대 유형이라는 반전.' },
      { name: '범행 수법', aka: '모더스 오페란디 / MO·Modus Operandi', def: '범인이 목적을 이루려 반복하는 일관된 수법. 연쇄성·동일범 추정의 단서.', tip: 'MO의 미묘한 변화가 "모방범"의 존재를 알리는 복선.' },
      { name: '시그니처', aka: '범행 표식 / Signature', def: '실용적 필요를 넘어 범인이 심리적 충동으로 반복하는 고유 행위. MO와 달리 잘 안 바뀐다.', tip: '시그니처는 같은데 MO가 다르면 — 학습한 동일범 또는 진화한 범인.' },
      { name: '냉각 사건', aka: '콜드 케이스 / Cold Case', def: '단서가 끊겨 장기 미제로 남은 사건. 새 증거·기술·증언으로 다시 열린다.', tip: '수십 년 묵은 사건이 DNA 기술 발전으로 되살아나는 현대 미스터리의 주류.' },
    ],
  },
  {
    key: 'procedure', label: '수사 절차·법', icon: '⚖️', items: [
      { name: '변사 사건', aka: 'Unattended/Unnatural Death', def: '범죄 관련성이 의심되는 죽음. 경찰·검찰의 검시 대상이 되며 부검 여부를 가린다.', tip: '"단순 변사"로 묻힐 뻔한 죽음을 한 형사가 의심하며 사건이 시작된다.' },
      { name: '검시관 제도', aka: 'Coroner / Medical Examiner', def: '죽음의 종류·사인을 공적으로 판정하는 제도·직책. 나라마다 검시관·법의관 체계가 다르다.', tip: '제도·관할의 차이(시골 vs 도시, 나라 간)를 갈등·지연 요소로 활용.' },
      { name: '수색·압수 영장', aka: 'Search Warrant', def: '강제 수색·증거 압수에 필요한 법원 허가. 요건을 못 갖추면 확보 증거가 무효가 될 수 있다.', tip: '영장 없이 들어가 얻은 결정적 증거가 법정에서 배제되는 절차적 반전.' },
      { name: '독수독과', aka: 'Fruit of the Poisonous Tree', def: '위법하게 수집한 증거와 그로부터 파생된 증거의 능력을 부정하는 법리. 절차의 정당성을 강제한다.', tip: '"진실은 알지만 증명할 수 없다" — 법과 정의의 간극을 드러내는 묵직한 테마.' },
      { name: '증거 능력', aka: 'Admissibility', def: '증거가 법정에서 채택될 수 있는 자격. 위법수집·전문(傳聞)·관련성 결여 등으로 배제될 수 있다.', tip: '결정적 물증이 "증거 능력 없음"으로 막히는 순간이 변호·기소의 분수령.' },
      { name: '연속성·보관 연쇄', aka: '체인 오브 커스터디 / Chain of Custody', def: '증거가 수집→보관→분석→법정에 이르는 모든 이동·관리 기록. 한 군데라도 끊기면 신뢰가 무너진다.', tip: '보관 연쇄의 빈틈을 변호인이 파고들어 핵심 증거를 무력화하는 법정 공방.' },
      { name: '공소시효', aka: 'Statute of Limitations', def: '일정 기간이 지나면 기소할 수 없게 되는 제도. 범죄 종류에 따라 다르고 일부 중범죄는 폐지되기도.', tip: '"시효 만료 직전/직후"라는 시간 압박이 콜드 케이스 스릴러의 동력.' },
      { name: '재구성·현장 재현', aka: 'Reconstruction', def: '증거·진술을 종합해 사건의 진행을 시간순으로 복원하는 작업. 현장 재현 실험을 동반하기도.', tip: '재현 실험에서 "그 트릭은 물리적으로 불가능"이 드러나며 진상이 뒤집힌다.' },
      { name: '용의선상·참고인', aka: 'Person of Interest', def: '아직 피의자는 아니나 관련성이 의심돼 주시하는 인물. 수사가 좁혀지며 지위가 바뀐다.', tip: '독자의 의심을 한 인물에 몰아갔다가, 진범을 그 그늘에 숨기는 시선 분산.' },
      { name: '피의자·피고인', aka: 'Suspect / Defendant', def: '수사 단계에서 혐의를 받는 자(피의자)와 기소되어 재판받는 자(피고인). 단계에 따라 호칭이 다르다.', tip: '호칭의 정확한 사용만으로도 절차 단계가 전달돼 고증 밀도가 올라간다.' },
    ],
  },
  {
    key: 'special', label: '특수 감식', icon: '🧪', items: [
      { name: '얼굴 복원', aka: 'Facial Reconstruction', def: '두개골을 토대로 근육·피부 두께를 더해 생전 얼굴을 추정·복원하는 기법. 신원 미상 변사체에 쓴다.', tip: '복원된 얼굴이 공개되며 "그 사람을 안다"는 제보가 사건을 푸는 전환점.' },
      { name: '치과 기록 대조', aka: 'Forensic Odontology', def: '치아·보철물을 생전 치과 기록과 대조해 신원을 확인. 화재·백골 등 손상이 심할 때 유용하다.', tip: '얼굴을 알아볼 수 없는 시신의 신원을 치과 기록으로 뒤집는 전개.' },
      { name: '법인류학', aka: 'Forensic Anthropology', def: '뼈를 분석해 성별·나이·키·인종·생전 손상·사망 후 경과를 추정하는 분야. 백골화 사건의 핵심.', tip: '오래된 뼈에서 "치유된 옛 골절"을 읽어 피해자의 과거사를 복원한다.' },
      { name: '음성 분석', aka: 'Forensic Phonetics', def: '녹음된 목소리의 음향 특징을 분석해 화자를 식별·대조하는 분야. 협박 전화 등에 쓰인다.', tip: '변조된 협박 음성에서 배경 소음·억양 한 조각이 발신자를 좁힌다.' },
      { name: '필적 비교', aka: 'Handwriting Comparison', def: '글씨의 기울기·필압·연결 습관을 비교해 동일인·위조를 가리는 분야(문서 감정의 일부).', tip: '유서의 필적이 "본인은 맞지만 떨림이 이상한" 강요된 작성 정황을 드러낸다.' },
      { name: '잠재 흔적 광원', aka: '대체광원 / ALS·Forensic Light', def: '특정 파장의 빛으로 체액·지문·섬유 등 맨눈에 안 보이는 흔적을 형광·대비로 드러내는 장비.', tip: '암실에서 푸른 빛 아래 드러나는 체액 자국 — 분위기와 단서를 동시에 잡는 장면.' },
      { name: '화재·방화 감식', aka: 'Fire/Arson Investigation', def: '발화점·연소 패턴·촉진제 잔류물로 화재 원인과 방화 여부를 가리는 분야.', tip: '"실화로 위장한 방화" — V자 연소흔과 촉진제 냄새가 진실을 가린 불을 폭로한다.' },
      { name: '폭발물 감식', aka: 'Explosives Forensics', def: '폭발 잔재·파편·기폭 방식을 분석해 폭발물 종류와 제작자의 수법을 추정하는 분야.', tip: '폭탄 제작의 버릇(시그니처)으로 연쇄 폭파범을 추적하는 전개.' },
      { name: '약독물 감식', aka: 'Forensic Toxicology', def: '독극물·약물의 종류·치사량·투여 경로를 밝히는 분야. 검출이 까다로운 독은 사인을 가린다.', tip: '"검출되지 않는 독"이라는 고전적 환상을, 현대 기법으로 끝내 잡아내는 대결.' },
      { name: '곤충·환경 시간 추정', aka: 'PMI Estimation', def: '곤충 발생·시신 변화·환경 요인을 종합해 사후경과시간(PMI)을 추정하는 작업.', tip: '여러 추정치가 엇갈릴 때, 그 "오차 범위"야말로 트릭이 숨는 공간이다.' },
    ],
  },
]

const LS = 'sry:tool:mystery-forensics:'
const ALL_KEY = '__all__'
const flatAll = (): { cat: CatDef; item: Term }[] =>
  CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (str: string) =>
  String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function MysteryForensics({ payload }: { payload?: Record<string, unknown> }) {
  const genreCtx = typeof payload?.genre === 'string' ? (payload.genre as string) : ''

  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 즐겨찾기: "catKey::name" 키 집합
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
  // 펼침 상태: 항목 키 → 열림
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'open')
      if (raw) {
        const obj = JSON.parse(raw)
        if (obj && typeof obj === 'object') return obj as Record<string, boolean>
      }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<{ cat: CatDef; item: Term } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])
  useEffect(() => { try { localStorage.setItem(LS + 'open', JSON.stringify(open)) } catch { /* ignore */ } }, [open])

  // 언마운트 정리: 복사 토스트 타이머 등 잔여 효과 제거
  useEffect(() => () => { setCopiedKey(null); setToast(null) }, [])

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
        (item.aka || '').toLowerCase().includes(q) ||
        item.def.toLowerCase().includes(q) ||
        item.tip.toLowerCase().includes(q))
    }
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    // 현재 카테고리 필터 안에서 무작위 1개 (검색어 무시)
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
      if (next[k]) delete next[k]; else next[k] = true
      return next
    })
  }
  const toggleOpen = (k: string) => setOpen((prev) => ({ ...prev, [k]: !prev[k] }))

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }

  const termText = (c: CatDef, item: Term): string =>
    `${c.icon} ${item.name}${item.aka ? ` (${item.aka})` : ''}\n${item.def}\n[고증 메모] ${item.tip}`

  const flash = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200)
  }

  // 연계: 현재 용어를 공유 라이브러리 〈스니펫〉으로 저장(다른 도구에서 글감으로 재사용)
  const saveCurrentSnippet = (s: { cat: CatDef; item: Term }) => {
    addToLibrary('snippets', {
      text: termText(s.cat, s.item),
      source: '수사·감식 용어 사전',
      tags: ['미스터리·추리', '고증', s.cat.label],
    })
    flash(`공유 글감(스니펫)에 ‘${s.item.name}’ 용어를 저장했습니다.`)
  }

  // 연계: 현재 용어를 프로젝트 자료 〈고증·수사용어〉 폴더에 메모로 추가
  const addCurrentToProject = (s: { cat: CatDef; item: Term }) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(s.cat.icon + ' ' + s.cat.label)} · ${escapeHtml(s.item.name)}</b>${s.item.aka ? ` <span>(${escapeHtml(s.item.aka)})</span>` : ''}</p>`,
      `<p>${escapeHtml(s.item.def)}</p>`,
      `<p><b>🔎 고증·연출 메모</b></p>`,
      `<p>${escapeHtml(s.item.tip)}</p>`,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '고증·수사용어',
      title: `${s.item.name}${s.item.aka ? ` (${s.item.aka})` : ''}`,
      bodyHtml,
      meta: { 분류: s.cat.label, 장르: '미스터리·추리' },
    })
    if (id) flash(`프로젝트 자료 〈고증·수사용어〉에 ‘${s.item.name}’ 메모를 추가했습니다.`)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  const renderActions = (c: CatDef, item: Term, prefix: string) => {
    const copyId = prefix + ':' + favKey(c.key, item.name)
    const isFav = !!favs[favKey(c.key, item.name)]
    return (
      <>
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <button className="minibtn" onClick={() => copy(termText(c, item), copyId)}>
            {copiedKey === copyId ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
          </button>
          <button
            className="minibtn"
            onClick={() => toggleFav(c.key, item.name)}
            style={{ borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}
            title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
          >
            {isFav ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
          </button>
        </div>
        {/* 연계: 공유 글감 저장 / 프로젝트 자료에 메모 추가 / 관련 도구 열기 */}
        <div className="linkbar" style={{ marginTop: 8 }}>
          <span className="linkbar-label">연계:</span>
          <button
            className="linkbtn"
            onClick={() => addCurrentToProject({ cat: c, item })}
            disabled={!hasProjectBridge()}
            title={hasProjectBridge() ? '이 용어를 프로젝트 자료 〈고증·수사용어〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}
          >
            <Emoji e="📄" /> 프로젝트에 추가
          </button>
          <button className="linkbtn" onClick={() => saveCurrentSnippet({ cat: c, item })} title="공유 글감(스니펫)으로 저장해 다른 도구에서 재사용">
            <Emoji e="💾" /> 글감으로 저장
          </button>
          <button className="linkbtn" onClick={() => openToolLinked('research-clipper', { genre: '미스터리·추리', note: termText(c, item) })} title="자료 스크랩 보관함 열기">
            <Emoji e="📎" /> 자료 보관함
          </button>
        </div>
      </>
    )
  }

  return (
    <div style={wrap}>
      <div style={hint}>
        현장 보존·부검·지문·혈흔·DNA·탄도·심문 등 수사 절차와 법과학 용어 <b>{total}개</b>를 모았습니다(창작 고증용 개관).
        검색·펼침으로 찾고, 마음에 드는 용어를 프로젝트나 글감으로 옮기세요.
        {genreCtx && genreCtx !== '미스터리·추리' ? ` · 현재 맥락: ${genreCtx}` : ''}
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="용어·영문·설명으로 검색 (예: 알리바이, 사망 시각, 혈흔, DNA)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button
          className="minibtn"
          onClick={() => setCat(ALL_KEY)}
          aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}
        >
          <Emoji e="🔍" /> 전체
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
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 용어</button>
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
            {random.item.aka && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{random.item.aka}</span>}
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0 6px' }}>{random.item.def}</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text)', background: 'var(--panel)', border: '1px dashed var(--border)', borderRadius: 8, padding: '7px 9px' }}>
            <b style={{ color: 'var(--accent)' }}><Emoji e="🔎" /> 고증·연출 메모</b> · {random.item.tip}
          </div>
          {renderActions(random.cat, random.item, 'rnd')}
        </div>
      )}

      {/* 추가/저장 성공 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록(펼침형) */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav
              ? '☆ 아직 즐겨찾기한 용어가 없습니다. 항목의 별을 눌러 모아 보세요.'
              : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const fk = favKey(c.key, item.name)
            const isFav = !!favs[fk]
            const isOpen = !!open[fk]
            return (
              <div key={fk} style={card}>
                <div
                  style={{ display: 'flex', alignItems: 'baseline', gap: 8, cursor: 'pointer' }}
                  onClick={() => toggleOpen(fk)}
                  role="button"
                  aria-expanded={isOpen}
                >
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /> {c.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</span>
                  {item.aka && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{item.aka}</span>}
                  <button
                    className="minibtn"
                    title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                    onClick={(e) => { e.stopPropagation(); toggleFav(c.key, item.name) }}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}
                  >
                    {isFav ? '★' : '☆'}
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{isOpen ? '▾' : '▸'}</span>
                </div>
                {/* 접힌 상태에서도 정의 한 줄은 미리보기로 */}
                {!isOpen && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.def}
                  </div>
                )}
                {isOpen && (
                  <div>
                    <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>{item.def}</div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text)', background: 'var(--paper)', border: '1px dashed var(--border)', borderRadius: 8, padding: '7px 9px', marginTop: 8 }}>
                      <b style={{ color: 'var(--accent)' }}><Emoji e="🔎" /> 고증·연출 메모</b> · {item.tip}
                    </div>
                    {renderActions(c, item, 'list')}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>
        ※ 본 용어는 창작 고증을 돕는 개관입니다. 실제 절차·법 제도는 시대·국가·관할에 따라 다르니, 핵심 트릭은 한 번 더 확인해 쓰세요.
      </div>
    </div>
  )
}
