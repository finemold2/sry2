// 도시·뒷골목 사전 — 도시물·누아르 묘사를 위한 로컬 레퍼런스.
//  시장·빈민가·유흥가·범죄 조직·거리 은어·도시 소음/냄새를 한데 모았다.
//  자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크/미디어/키 불필요.
//  모든 텍스트는 직접 작성한 창작 데이터(백과·실존 조직/은어 베끼기 금지, 가상의 어휘로 구성).
//  제어문자·특수 구분자 없음(일반 문자만).
import { useState, useEffect, useMemo, useRef } from 'react'
import { addToStash, hasStash, addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'urban-underworld-ref',
  name: '도시·뒷골목 사전',
  icon: '🌃',
  group: '리서치·자료',
  intro: '시장·빈민가·유흥가·범죄 조직·거리 은어·도시 소음과 냄새 — 누아르와 도시물의 뒷면을 채우는 어휘 사전',
  w: 680,
  h: 660,
}

// ---------- 데이터 모델 ----------
interface UEntry {
  name: string        // 항목 이름/대상
  words: string[]     // 그것을 가리키는 어휘·은어·세부(자작)
  lines: string[]     // 그것을 살린 묘사 문장 후보(자작)
}
interface Section {
  key: string
  label: string
  icon: string
  axis: '공간' | '사람·조직' | '말·소리' | '감각'   // 무엇을 기준으로 묶었는가
  blurb: string                                       // 이 묶음에 대한 한 줄 안내
  entries: UEntry[]
}

// ---------- 도시·뒷골목 사전(자작 데이터) ----------
// 축 1) 공간 — 시장·빈민가·유흥가·뒷골목의 풍경
// 축 2) 사람·조직 — 범죄 조직·뒷세계 인물·거래의 생태
// 축 3) 말·소리 — 거리 은어(가상)·흥정·도시 소음
// 축 4) 감각 — 도시의 냄새·빛·질감(누아르 분위기)
const SECTIONS: Section[] = [
  // ===== 공간 =====
  {
    key: 'market', label: '시장·노점', icon: '🏮', axis: '공간',
    blurb: '값을 부르는 소리와 비린 김 사이로, 도시가 가장 정직하게 숨 쉬는 곳.',
    entries: [
      { name: '재래시장 골목', words: ['빽빽한 차양', '발 디딜 틈 없는 통로', '좌판 모서리', '흥정 소리', '비닐 천막', '리어카 행렬', '바닥에 깔린 물기'], lines: ['차양이 맞닿아 하늘이 보이지 않는 골목을, 사람들은 어깨로 비집고 흘러갔다.', '좌판마다 값을 부르는 소리가 겹쳐, 한 마디도 또렷이 들리지 않았다.', '비에 젖은 바닥엔 채소 부스러기와 얼음 녹은 물이 미끄럽게 깔려 있었다.'] },
      { name: '생선·정육 좌판', words: ['얼음 위 생선', '비린 핏물', '도마 자국', '갈고리에 걸린 고기', '톱밥 깔린 바닥', '날 선 식칼', '저울 눈금'], lines: ['얼음 위에 누운 생선들이 흐린 눈으로 천장을 보고 있었다.', '도마는 수천 번의 칼질로 가운데가 움푹 패어 있었다.', '갈고리에 걸린 고깃덩이에서 떨어진 핏물이 톱밥에 검게 번졌다.'] },
      { name: '난전·노점', words: ['임시 매대', '도망칠 채비', '단속반 신호', '천막 기둥', '땅바닥 좌판', '잔돈 통', '호객'], lines: ['단속반이 뜬다는 한마디에, 노점들은 일제히 천막을 접고 흩어졌다.', '땅바닥에 펼친 좌판 위로 그날 팔 물건의 전부가 놓여 있었다.', '잔돈 통을 허리춤에 찬 노인이 지나는 이마다 눈을 맞추며 값을 불렀다.'] },
      { name: '뒷마당 창고·하역장', words: ['쌓인 종이 박스', '지게차 경고음', '검은 비닐 더미', '셔터 내린 점포', '하역 인부', '운송장 딱지', '기름 밴 콘크리트'], lines: ['셔터를 반쯤 내린 창고 안에서, 누군가 박스를 옮기는 소리만 들렸다.', '지게차가 후진할 때마다 경고음이 텅 빈 하역장에 메아리쳤다.', '운송장이 붙은 박스들 사이에, 송장 없는 박스 하나가 따로 쌓여 있었다.'] },
    ],
  },
  {
    key: 'slum', label: '빈민가·달동네', icon: '🏚️', axis: '공간',
    blurb: '비탈을 따라 다닥다닥 붙은 지붕들. 가난은 가까이 모일수록 따뜻하고, 또 시끄럽다.',
    entries: [
      { name: '비탈진 골목·계단', words: ['가파른 시멘트 계단', '녹슨 난간', '연탄재 더미', '좁은 틈새 길', '낮은 처마', '빨랫줄', '갈라진 담벼락'], lines: ['끝없이 이어진 시멘트 계단을, 노인은 난간을 짚으며 한 칸씩 올랐다.', '처마와 처마 사이로 빨랫줄이 가로질러, 골목엔 늘 누군가의 옷이 걸려 있었다.', '갈라진 담벼락 틈으로 잡초가 자라, 사람보다 끈질기게 그곳을 지켰다.'] },
      { name: '쪽방·옥탑', words: ['한 평 남짓 방', '공동 화장실', '얇은 합판 벽', '곰팡이 핀 벽지', '연탄 보일러', '창 없는 방', '옥탑 물탱크'], lines: ['합판 한 장을 사이에 두고, 옆방의 기침 소리가 제 방처럼 들렸다.', '창이 없는 방은 한낮에도 전등을 켜야 했고, 곰팡이 냄새가 가시지 않았다.', '옥탑의 물탱크는 여름엔 끓고 겨울엔 얼어, 사철 미지근한 물이 나왔다.'] },
      { name: '재개발 예정지', words: ['붉은 스프레이 표식', '철거 계고장', '비어 가는 집들', '깨진 유리창', '용역 차량', '버려진 살림', '경고 현수막'], lines: ['담벼락마다 붉은 스프레이로 그려진 가위표가, 떠날 날을 세고 있었다.', '계고장이 붙은 대문 안에서, 누군가는 여전히 저녁을 짓고 있었다.', '용역 차량이 골목 어귀에 서자, 남은 집들은 일제히 불을 껐다.'] },
      { name: '공터·고가 밑', words: ['잡초 무성한 빈터', '버려진 매트리스', '고가도로 그늘', '드럼통 모닥불', '비둘기 떼', '낙서 가득한 교각', '노숙의 흔적'], lines: ['고가 밑 그늘엔 낮에도 어둠이 고여, 시간이 비껴가는 듯했다.', '드럼통에 피운 불 주위로, 갈 곳 없는 이들이 말없이 손을 쬐었다.', '교각엔 누군가의 이름과 욕설이 겹겹이 덧칠되어 본래 색을 잃었다.'] },
    ],
  },
  {
    key: 'nightlife', label: '유흥가·환락가', icon: '🎰', axis: '공간',
    blurb: '간판이 켜지면 비로소 살아나는 거리. 빛이 화려할수록 그늘은 깊다.',
    entries: [
      { name: '네온 간판 거리', words: ['깜빡이는 네온', '젖은 아스팔트의 반사광', '호객용 입간판', '지하로 내려가는 계단', '비상구 붉은 빛', '담배 연기 자욱한 입구', '대기 줄'], lines: ['네온이 젖은 아스팔트에 번져, 거리 전체가 색색의 물웅덩이 같았다.', '지하로 내려가는 계단마다 붉고 푸른 빛이 번갈아 얼굴을 물들였다.', '깜빡이다 한쪽이 죽은 간판 글자가, 본래 이름과 다른 말을 만들고 있었다.'] },
      { name: '술집·룸살롱 내부', words: ['끈적이는 테이블', '두꺼운 방음문', '낮춘 조명', '빈 술병 트레이', '담뱃불 자국', '복도의 카펫', '계산서 다툼'], lines: ['두꺼운 방음문이 닫히자, 바깥의 음악이 한순간에 먹먹해졌다.', '끈적이는 테이블 위로 빈 병이 늘어갈수록 목소리는 거칠어졌다.', '복도 카펫엔 수없이 밟혀 눌린 담뱃불 자국이 별자리처럼 박혀 있었다.'] },
      { name: '도박장·하우스', words: ['연기로 흐린 공기', '딜러의 손놀림', '쌓인 칩 더미', '문 앞의 망보기', '판돈 적힌 장부', '땀에 젖은 셔츠', '시계 없는 방'], lines: ['창문도 시계도 없는 방에서, 사람들은 밤과 낮을 잊은 채 패를 쥐었다.', '딜러의 손이 카드를 가를 때마다, 누군가의 한 달치 벌이가 오갔다.', '문 앞에 선 사내가 발소리 하나에도 귀를 곤두세우며 복도를 살폈다.'] },
      { name: '뒷문·VIP 통로', words: ['간판 없는 철문', '경비의 무전기', '주차된 검은 세단', '셔터 내린 외관', '비밀번호 도어록', '계단 끝 사무실', '감시 카메라'], lines: ['간판 하나 없는 철문이, 거리에서 가장 비싼 방으로 통하는 입구였다.', '검은 세단이 뒷문에 멈추자, 경비가 무전기에 짧게 한마디를 흘렸다.', '셔터를 내린 가게 위층에선, 밤새 불이 꺼지지 않는 사무실이 돌아갔다.'] },
    ],
  },
  {
    key: 'alley', label: '뒷골목·이면도로', icon: '🌁', axis: '공간',
    blurb: '대로의 등 뒤. 모든 거래와 추격이 결국 흘러드는, 도시의 실핏줄.',
    entries: [
      { name: '막다른 골목', words: ['높은 담장', '쌓인 쓰레기 봉투', '깨진 가로등', '실외기 소음', '비상계단', '젖은 박스 더미', '도망칠 곳 없는 끝'], lines: ['뛰어든 골목은 막다른 길이었고, 높은 담장만이 숨을 막았다.', '깨진 가로등 아래로, 쌓인 쓰레기 봉투의 그림자가 사람처럼 일렁였다.', '실외기들이 일제히 토해내는 더운 바람이, 좁은 골목을 한증막으로 만들었다.'] },
      { name: '하수구·지하 통로', words: ['맨홀 뚜껑', '흐르는 오수', '울리는 발소리', '녹슨 사다리', '곰팡이 핀 벽', '쥐의 발톱 소리', '한 줄기 손전등 빛'], lines: ['맨홀 아래로 내려서자, 발소리가 어둠 속에서 몇 배로 부풀어 돌아왔다.', '손전등 한 줄기가 닿는 곳마다 물때 낀 벽이 번들거렸다.', '어둠 어딘가에서 쥐의 발톱 소리가 사그락사그락 따라붙었다.'] },
      { name: '주차장·지하 차고', words: ['낮은 천장', '깜빡이는 형광등', '기둥마다 번호', '기름 얼룩', '울리는 엔진음', '비상등 점멸', '시멘트 먼지'], lines: ['깜빡이는 형광등이, 기둥과 기둥 사이에 죽은 빛의 구역을 만들었다.', '낮은 천장 아래로 엔진음이 둔하게 깔리며 점점 가까워졌다.', '기름 얼룩이 번진 바닥 위로, 누군가의 발자국이 한 줄로 이어졌다.'] },
      { name: '옥상·고층 사이', words: ['녹슨 비상계단', '난간 너머 도시 야경', '에어컨 실외기 숲', '빨랫줄에 걸린 천막', '물탱크 그림자', '환기구의 더운 바람', '아득한 지상'], lines: ['비상계단을 다 오르자, 발밑으로 도시의 불빛이 강물처럼 흘렀다.', '실외기들이 줄지어 토해내는 더운 바람 사이로, 그는 몸을 숨겼다.', '난간 너머의 야경은 아름다웠지만, 한 발만 헛디뎌도 끝이었다.'] },
    ],
  },
  // ===== 사람·조직 =====
  {
    key: 'org', label: '범죄 조직·뒷세계', icon: '🐉', axis: '사람·조직',
    blurb: '명함 대신 별명으로 통하는 세계. 위계는 말이 아니라 침묵으로 지켜진다. (가상의 설정 어휘)',
    entries: [
      { name: '조직 위계', words: ['우두머리(가상)', '오른팔', '행동대장', '말단 조직원', '바지사장', '뒷배', '연락책'], lines: ['우두머리는 좀처럼 모습을 드러내지 않았고, 명령은 늘 두세 사람을 거쳐 내려왔다.', '행동대장이 턱짓 한 번을 하자, 말단들이 군말 없이 자리에서 일어섰다.', '겉으로 가게를 굴리는 바지사장 뒤에, 진짜 주인은 그림자처럼 숨어 있었다.'] },
      { name: '구역·세력 다툼', words: ['나와바리(구역)', '경계선', '상납', '세력 침범', '담판', '중립지대', '보복'], lines: ['그 거리는 오래전부터 한 패의 구역이었고, 누구도 함부로 발을 들이지 않았다.', '경계를 넘어온 낯선 얼굴들에, 거리의 공기가 순식간에 팽팽해졌다.', '담판이 깨지면 다음은 보복이라는 걸, 양쪽 모두 알고 있었다.'] },
      { name: '뒷세계 인물', words: ['해결사', '브로커', '장물아비', '정보상', '뒷돈 받는 끄나풀', '청부업자', '도박장 물주'], lines: ['해결사는 말이 없었고, 그 침묵이 어떤 협박보다 무거웠다.', '브로커는 누구의 편도 아니었다. 그저 더 많이 부르는 쪽의 편이었다.', '장물아비는 물건의 출처를 묻지 않는 대신, 값을 절반으로 후려쳤다.'] },
      { name: '거래·자금 세탁', words: ['현금 가방', '검은돈', '세탁용 점포', '차명 계좌', '이중장부', '뒷거래 약속', '수수료 떼기'], lines: ['현금이 든 가방은 한 번도 같은 사람의 손에 두 번 들리지 않았다.', '겉보기엔 멀쩡한 가게가, 실은 검은돈을 씻어내는 빨래터였다.', '이중장부의 진짜 숫자는, 오직 우두머리의 머릿속에만 적혀 있었다.'] },
      { name: '의리·배신', words: ['형님-아우 서열', '입막음', '배신자 색출', '충성 시험', '꼬리 자르기', '내부 고발', '변절'], lines: ['형님이라 부르던 입이, 어느 밤 가장 먼저 그를 팔아넘겼다.', '꼬리를 자르듯, 조직은 잡힌 말단 하나를 미련 없이 버렸다.', '의리는 돈이 떨어지는 순간 가장 먼저 동나는 물건이었다.'] },
    ],
  },
  {
    key: 'street_people', label: '거리의 사람들', icon: '🚬', axis: '사람·조직',
    blurb: '간판에 이름이 오르지 않는 이들. 도시의 밑바닥은 이들의 발로 굴러간다.',
    entries: [
      { name: '노점·뒷거리 상인', words: ['단골 챙기는 주인', '단속 피하는 손', '외상 장부', '텃세', '새벽 도매', '잔돈 인심', '자리싸움'], lines: ['주인은 단골의 얼굴만 보고도 어제 못 다한 외상값을 떠올렸다.', '새벽 도매시장을 다녀온 손엔, 하루를 버틸 물건이 가득했다.', '좋은 목은 늘 임자가 있었고, 자리 하나를 두고 텃세가 오갔다.'] },
      { name: '밤거리 군상', words: ['취객', '호객꾼', '대리운전 기사', '포장마차 주인', '편의점 야간 알바', '귀가하는 노동자', '배회하는 그림자'], lines: ['취객이 가로등을 붙잡고, 들리지 않는 누군가에게 하소연을 늘어놓았다.', '호객꾼은 지나는 어깨마다 손을 얹으며 같은 말을 백 번쯤 되풀이했다.', '포장마차의 노란 불빛 아래, 낯선 사람들이 잠시 한 식구처럼 둘러앉았다.'] },
      { name: '벼랑 끝 사람들', words: ['빚에 쫓기는 이', '사채 독촉', '일수 찍는 손', '전당포 단골', '도망자', '바닥 친 도박꾼', '마지막 패'], lines: ['독촉 전화가 울릴 때마다, 그는 액정을 엎어 두고 못 들은 척했다.', '전당포 진열장엔 누군가의 마지막 자존심이 값으로 매겨져 있었다.', '바닥을 친 도박꾼은, 잃을 게 없다는 표정으로 마지막 패를 밀었다.'] },
      { name: '권력의 그늘', words: ['뇌물 받는 손', '눈감아 주는 자', '뒷배 봐주기', '단속 정보 흘리기', '청탁', '유착', '봐주는 대가'], lines: ['단속 날짜는 늘 누군가의 입을 통해 미리 거리로 새어 나갔다.', '눈감아 주는 대가로, 봉투는 책상 서랍 깊숙이 조용히 들어갔다.', '겉으로 칼을 들이대던 손이, 뒤에선 같은 손과 악수를 나눴다.'] },
    ],
  },
  // ===== 말·소리 =====
  {
    key: 'slang', label: '거리 은어·뒷말', icon: '🗯️', axis: '말·소리',
    blurb: '바깥엔 들키지 않으려 비틀어 만든 말들. (전부 자작 가상 은어 — 실존 은어 아님)',
    entries: [
      { name: '돈·거래 은어', words: ['"종잇장"(현금)', '"씻는다"(세탁)', '"물어 온다"(가져온다)', '"바닥"(빈털터리)', '"굴린다"(불린다)', '"떼인다"(못 받는다)', '"끊어 준다"(빌려준다)'], lines: ['"종잇장 두둑하게 챙겨 와." 그 말은 빈손으로 오지 말라는 뜻이었다.', '"이건 좀 씻어야겠는데." 깨끗한 돈으로 만들어야 한다는 소리였다.', '"이번에 바닥 쳤어." 가진 게 한 푼도 남지 않았다는 고백이었다.'] },
      { name: '위험·신호 은어', words: ['"바람 분다"(단속)', '"손님 왔다"(경찰)', '"문 닫아"(중단)', '"털린다"(걸린다)', '"꼬리 붙었다"(미행)', '"비 온다"(위험)', '"잠수"(잠적)'], lines: ['"바람 분다." 한마디에, 골목의 좌판들이 거짓말처럼 사라졌다.', '"손님 왔다는데." 그 말이 돌자 가게 안의 공기가 단번에 굳었다.', '"꼬리 붙은 것 같아." 그는 일부러 길을 두 번 꺾어 돌아갔다.'] },
      { name: '사람·관계 은어', words: ['"형님"(상위자)', '"식구"(조직원)', '"바지"(허수아비)', '"끄나풀"(밀고자)', '"손님"(외부 표적)', '"물주"(자금책)', '"얼굴"(전면)'], lines: ['"우리 식구야." 그 한마디면 더는 의심하지 않는 게 거리의 법이었다.', '"걔는 바지일 뿐이야." 진짜 주인은 따로 있다는 귀띔이었다.', '"끄나풀 하나 심어 뒀어." 그 말에 좌중의 웃음이 일순 멎었다.'] },
      { name: '행동·명령 은어', words: ['"정리한다"(처리)', '"심는다"(잠입)', '"띄운다"(소문 낸다)', '"눌러앉힌다"(제압)', '"빼낸다"(빼돌린다)', '"엮는다"(연루시킨다)', '"덮는다"(은폐)'], lines: ['"조용히 정리해." 무슨 뜻인지 되묻는 사람은 거기 없었다.', '"소문 좀 띄워." 사실이든 아니든, 거리에 깔리면 그게 곧 진실이었다.', '"이번 일은 덮는다." 그 말과 함께, 누구도 그 밤을 입에 올리지 않았다.'] },
    ],
  },
  {
    key: 'haggle', label: '흥정·말다툼·고함', icon: '📣', axis: '말·소리',
    blurb: '값을 두고 오가는 입씨름부터 멱살잡이까지. 거리의 대화는 늘 음량으로 결판난다.',
    entries: [
      { name: '값 흥정', words: ['"깎아 주세요"', '"이게 원가야"', '"많이 사면"', '"덤 좀"', '"단골이잖아"', '"밑지고 파는 거야"', '"다음에 또 와"'], lines: ['"이게 원가라니까." 주인은 손을 내저으면서도 끝내 천 원을 깎아 줬다.', '"많이 살게요, 덤 좀 주세요." 흥정은 결국 정으로 마무리됐다.', '"단골이니까 특별히." 그 말은 모든 손님에게 똑같이 건네지는 인사였다.'] },
      { name: '시비·말다툼', words: ['"뭘 봐"', '"네가 뭔데"', '"한 번 더 말해 봐"', '"여기서 이러기야"', '멱살잡이', '삿대질', '구경꾼 모임'], lines: ['"뭘 봐." 그 한마디로 시비는 시작됐고, 구경꾼이 순식간에 둘러쌌다.', '삿대질이 오가는 사이, 누구도 먼저 물러서려 하지 않았다.', '멱살을 잡힌 사내의 셔츠 단추가 튕겨 나가 바닥을 굴렀다.'] },
      { name: '고함·호객', words: ['"골라 골라"', '"떨이요 떨이"', '"마지막 한 판"', '"오늘만 이 값"', '확성기 소리', '쉰 목청', '박수 손뼉'], lines: ['"골라, 골라!" 쉰 목소리가 확성기를 타고 골목 끝까지 닿았다.', '"떨이요, 마지막!" 그 외침은 장이 파할 때마다 어김없이 들렸다.', '손뼉을 치며 사람을 모으는 호객꾼 앞에, 어느새 둘러선 무리가 생겼다.'] },
    ],
  },
  // ===== 감각 =====
  {
    key: 'noise', label: '도시 소음', icon: '🔊', axis: '감각',
    blurb: '도시는 결코 완전히 잠들지 않는다. 소리의 결만 바뀔 뿐.',
    entries: [
      { name: '낮의 소음', words: ['경적의 합창', '공사장 드릴', '버스 출입문 신호음', '확성기 광고', '오토바이 굉음', '인파의 웅성거림', '간판 끄는 소리'], lines: ['신호가 바뀌기도 전에 터진 경적이, 한 박자씩 어긋난 합창을 이뤘다.', '공사장 드릴 소리가 빌딩 사이에서 부서져, 귓속을 콕콕 찔렀다.', '오토바이가 인도를 스쳐 지나며, 잠깐 모두의 말소리를 지워 버렸다.'] },
      { name: '밤의 소음', words: ['멀어지는 사이렌', '취객의 노랫소리', '셔터 내리는 소리', '실외기의 단조로운 윙윙', '먼 음악의 진동', '발소리의 메아리', '고양이 울음'], lines: ['사이렌이 점점 멀어지며, 밤거리를 다시 제 침묵으로 돌려놓았다.', '셔터가 차례로 내려가는 소리가, 하루의 끝을 한 칸씩 닫아걸었다.', '어디선가 새어 나온 음악의 저음만이, 벽을 타고 둔하게 진동했다.'] },
      { name: '실내·근거리 소음', words: ['형광등 진동음', '냉장고 모터 소리', '배관 물 흐르는 소리', '윗집 발소리', '엘리베이터 도착음', '시계 초침', '문틈 바람 소리'], lines: ['고요할수록 형광등의 미세한 진동음이 또렷하게 귀를 파고들었다.', '윗집의 발소리가 천장을 타고, 밤새 누군가의 불면을 흘려보냈다.', '냉장고 모터가 멎는 순간, 방은 갑자기 너무 조용해져 도리어 낯설었다.'] },
      { name: '불길한 정적', words: ['갑자기 멎은 소음', '발소리 끊김', '숨죽인 거리', '꺼진 음악', '귀를 누르는 고요', '심장 박동', '한 박자 늦은 메아리'], lines: ['늘 시끄럽던 골목이 거짓말처럼 조용해지자, 그것이 더 무서웠다.', '따라오던 발소리가 뚝 끊긴 그 순간, 등줄기가 먼저 곤두섰다.', '음악이 꺼진 방 안엔, 제 심장 소리만 북처럼 크게 울렸다.'] },
    ],
  },
  {
    key: 'smell', label: '도시의 냄새', icon: '🌫️', axis: '감각',
    blurb: '거리의 냄새는 여러 겹으로 겹쳐 온다 — 음식과 매연과, 지워지지 않는 무엇.',
    entries: [
      { name: '거리·골목 냄새', words: ['젖은 매연 냄새', '하수구 군내', '음식물 쓰레기의 시큼함', '담배 연기', '젖은 종이 박스', '눅눅한 콘크리트', '튀김 기름 냄새'], lines: ['뒷골목엔 하수구의 군내와 식은 기름 냄새가 끈질기게 엉겨 있었다.', '여름이 깊어질수록 음식물 쓰레기의 시큼한 냄새가 부풀어 올랐다.', '비가 매연을 씻어 내리자, 거리는 잠시나마 흙 냄새를 되찾았다.'] },
      { name: '시장·음식 냄새', words: ['비린 생선 좌판', '익은 과일의 단내', '향신료의 매캐함', '어묵 국물의 김', '구운 고기 냄새', '갓 튀긴 기름', '발효된 장 냄새'], lines: ['골목을 들어서자 갓 튀긴 기름 냄새가 대뜸 허기를 끌어냈다.', '생선의 비린내와 과일의 단내가, 한 걸음마다 자리를 바꿨다.', '어묵 국물에서 오른 김이 향신료 냄새에 섞여 코끝을 데웠다.'] },
      { name: '유흥가 냄새', words: ['독한 술 냄새', '값싼 향수', '담배에 전 공기', '안주 기름 냄새', '소독약 섞인 화장실 냄새', '땀과 열기', '바닥에 밴 토사물 냄새'], lines: ['문을 열자 독한 술 냄새와 값싼 향수가 한꺼번에 얼굴을 덮쳤다.', '담배에 전 공기 속에서, 사람들의 목소리만 점점 더 거칠어졌다.', '새벽이 가까울수록, 골목엔 지워지지 않는 냄새들이 바닥에 눌어붙었다.'] },
      { name: '위험·불길한 냄새', words: ['쇠비린 피 냄새', '화약 탄내', '탄 고무 냄새', '가스 냄새', '식은땀의 비린내', '낯선 향수의 위화감', '소독약의 차가움'], lines: ['이유 없이 쇠비린 냄새가 코끝을 스치자, 등이 먼저 곤두섰다.', '낯선 향수 냄새가 빈방에 남아, 누군가 다녀갔음을 말없이 일러 주었다.', '탄 고무 냄새가 옅게 깔리는 골목에서, 그는 발걸음을 늦추지 않았다.'] },
    ],
  },
  {
    key: 'visual', label: '빛·질감·도시 풍경', icon: '🌆', axis: '감각',
    blurb: '누아르의 화면은 빛과 그림자의 대비로 완성된다.',
    entries: [
      { name: '빛과 그림자', words: ['깜빡이는 가로등', '네온의 번짐', '젖은 노면의 반사', '블라인드 사이 빛줄기', '담배 연기 속 빛기둥', '역광의 실루엣', '죽은 등의 어둠'], lines: ['깜빡이는 가로등이, 골목에 밝음과 어둠의 박자를 번갈아 새겼다.', '블라인드 틈으로 든 빛줄기가, 담배 연기 속에서 길게 기둥을 세웠다.', '역광에 잠긴 실루엣은 얼굴이 없어, 누구라고도 단정할 수 없었다.'] },
      { name: '거리의 질감', words: ['갈라진 아스팔트', '벗겨진 페인트', '녹슨 철문', '낙서 덮인 벽', '깨진 보도블록', '기름때 낀 손잡이', '거미줄 친 처마'], lines: ['갈라진 아스팔트 틈을 따라, 빗물이 검은 실선을 그으며 흘렀다.', '벗겨진 페인트 아래로 옛 간판의 글자가 유령처럼 비쳐 나왔다.', '녹슨 철문은 밀 때마다, 오래 참았던 비명 같은 소리를 냈다.'] },
      { name: '도시 야경·원경', words: ['빌딩 불빛의 격자', '강물에 비친 도심', '아득한 차량 행렬', '광고판의 발광', '안개에 잠긴 고층', '점점이 켜진 창', '지평선의 붉은 노을'], lines: ['옥상에서 내려다본 도시는, 불빛의 격자가 끝없이 이어진 회로 같았다.', '강물 위로 도심의 불빛이 흔들리며, 거꾸로 선 또 하나의 도시를 그렸다.', '안개에 허리를 잠긴 고층 빌딩들이, 머리만 내놓고 떠 있는 듯했다.'] },
      { name: '날씨와 도시', words: ['장대비 속 거리', '안개 낀 새벽', '눈 쌓인 차도', '열기 아지랑이', '바람에 구르는 전단', '먼지 낀 황혼', '폭염의 빈 거리'], lines: ['장대비가 쏟아지자, 네온 불빛이 노면 위로 색색이 번져 흘렀다.', '안개 낀 새벽 거리엔, 가로등마다 흐릿한 후광이 둘러 있었다.', '폭염에 인적이 끊긴 정오의 거리는, 도시의 또 다른 폐허 같았다.'] },
    ],
  },
]

const AXES = [
  { key: '전체', label: '전체', icon: '✨' },
  { key: '공간', label: '공간', icon: '🏙️' },
  { key: '사람·조직', label: '사람·조직', icon: '👥' },
  { key: '말·소리', label: '말·소리', icon: '🗣️' },
  { key: '감각', label: '감각', icon: '💭' },
] as const

const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

interface ToolProps { payload?: Record<string, unknown> }

export default function UrbanUnderworldRef({ payload }: ToolProps = {}) {
  // 검색어 / 축 필터 / 펼친 섹션 / 무작위 픽 / 복사·안내 표시
  const [query, setQuery] = useState('')
  const [axis, setAxis] = useState<string>('전체')
  const [open, setOpen] = useState<Record<string, boolean>>(() => ({ [SECTIONS[0].key]: true }))
  const [pickItem, setPickItem] = useState<{ section: Section; entry: UEntry } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [linkMsg, setLinkMsg] = useState<string | null>(null)

  const copyTimer = useRef<number | null>(null)
  const linkTimer = useRef<number | null>(null)

  // payload 로 외부에서 초기 검색어가 전달되면 반영(연계 호환)
  useEffect(() => {
    const q = payload && typeof payload['query'] === 'string' ? (payload['query'] as string) : ''
    if (q) setQuery(q)
  }, [payload])

  // localStorage 설정 복원(검색·축·펼침 상태)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('sry:tool:urban-underworld-ref')
      if (raw) {
        const s = JSON.parse(raw) as { query?: string; axis?: string; open?: Record<string, boolean> }
        if (typeof s.query === 'string') setQuery(s.query)
        if (typeof s.axis === 'string') setAxis(s.axis)
        if (s.open && typeof s.open === 'object') setOpen(s.open)
      }
    } catch { /* 손상된 설정 무시 */ }
  }, [])

  // 설정 영속화
  useEffect(() => {
    try {
      localStorage.setItem('sry:tool:urban-underworld-ref', JSON.stringify({ query, axis, open }))
    } catch { /* 용량 초과 등 무시 */ }
  }, [query, axis, open])

  // 언마운트 시 타이머 정리(누수 방지)
  useEffect(() => {
    return () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
      if (linkTimer.current !== null) window.clearTimeout(linkTimer.current)
    }
  }, [])

  const flashCopied = (id: string) => {
    setCopied(id)
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => { setCopied(null); copyTimer.current = null }, 1400)
  }
  const flashLink = (msg: string) => {
    setLinkMsg(msg)
    if (linkTimer.current !== null) window.clearTimeout(linkTimer.current)
    linkTimer.current = window.setTimeout(() => { setLinkMsg(null); linkTimer.current = null }, 1800)
  }

  const safeCopy = (text: string, id: string) => {
    try {
      navigator.clipboard?.writeText(text).then(() => flashCopied(id)).catch(() => { /* 권한 거부·미지원 graceful */ })
    } catch { /* 클립보드 미지원 무시 */ }
  }

  // 총 항목/어휘/문장 수(데이터 풍부함 표시)
  const stats = useMemo(() => {
    let entries = 0, words = 0, lines = 0
    for (const s of SECTIONS) {
      entries += s.entries.length
      for (const e of s.entries) { words += e.words.length; lines += e.lines.length }
    }
    return { sections: SECTIONS.length, entries, words, lines }
  }, [])

  // 축 필터 + 검색 적용 결과(섹션별로 일치하는 항목만)
  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    return SECTIONS
      .filter((s) => axis === '전체' || s.axis === axis)
      .map((s) => {
        if (!q) return { section: s, entries: s.entries }
        const matchSection = s.label.toLowerCase().includes(q) || s.blurb.toLowerCase().includes(q)
        const entries = s.entries.filter((e) =>
          matchSection ||
          e.name.toLowerCase().includes(q) ||
          e.words.some((w) => w.toLowerCase().includes(q)) ||
          e.lines.some((l) => l.toLowerCase().includes(q)),
        )
        return { section: s, entries }
      })
      .filter((g) => g.entries.length > 0)
  }, [axis, q])

  const matchCount = useMemo(() => filtered.reduce((n, g) => n + g.entries.length, 0), [filtered])

  const toggle = (key: string) => setOpen((o) => ({ ...o, [key]: !o[key] }))

  // 검색 중에는 일치한 섹션을 자동으로 펼쳐 보여 준다
  const isOpen = (key: string) => (q ? true : !!open[key])

  // 무작위 — 현재 필터 범위 안에서 항목 하나를 뽑는다
  const pickRandom = () => {
    const pool: { section: Section; entry: UEntry }[] = []
    for (const g of filtered) for (const e of g.entries) pool.push({ section: g.section, entry: e })
    if (!pool.length) return
    let next = rand(pool)
    if (pickItem && pool.length > 1 && next.entry.name === pickItem.entry.name) next = rand(pool)
    setPickItem(next)
    setOpen((o) => ({ ...o, [next.section.key]: true }))
  }

  // 한 항목을 텍스트로(복사·연계 공용)
  const entryText = (section: Section, e: UEntry) =>
    `[${section.label} · ${e.name}]\n어휘: ${e.words.join(', ')}\n\n` + e.lines.map((l) => `- ${l}`).join('\n')

  // HTML escape(&,<,>) — bodyHtml 안전 생성
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // [연계] 한 항목을 수집함에 담기
  const stashEntry = (section: Section, e: UEntry) => {
    addToStash({ kind: 'note', label: `도시·뒷골목 · ${e.name}`, text: entryText(section, e) })
    flashLink('수집함에 담았습니다')
  }
  // [연계] 한 항목을 스니펫 라이브러리에 저장
  const snippetEntry = (section: Section, e: UEntry) => {
    addToLibrary('snippets', { text: entryText(section, e), source: '도시·뒷골목 사전', tags: ['도시물', '누아르', section.label, e.name] })
    flashLink('스니펫으로 저장했습니다')
  }
  // [연계] 한 항목을 프로젝트 자료에 메모로 추가
  const projectEntry = (section: Section, e: UEntry) => {
    const lis = e.lines.map((l) => `<li>${esc(l)}</li>`).join('')
    const chips = e.words.map((w) => esc(w)).join(', ')
    const bodyHtml = `<p><b>어휘</b> · ${chips}</p><p><b>묘사 문장</b></p><ul>${lis}</ul>`
    const id = addToProject({
      kind: 'text', root: 'research', folder: '도시·뒷골목 묘사',
      title: `${e.name} · ${section.label}`,
      bodyHtml,
      meta: { 분류: section.label, 기준: section.axis, 출처: '도시·뒷골목 사전' },
    })
    flashLink(id ? '프로젝트에 추가했습니다' : '프로젝트에 연결되지 않았습니다')
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chip = (on: boolean): React.CSSProperties => ({ opacity: on ? 1 : 0.6, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)', fontWeight: on ? 700 : 400 })
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px' }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>도시물·누아르</b>의 뒷면을 채우는 사전입니다. <b>시장·빈민가·유흥가·뒷골목</b>의 풍경, <b>범죄 조직</b>의 생태, <b>거리 은어</b>와 <b>도시의 소음·냄새</b>를 모았습니다.
      </div>

      {/* 검색 + 축 필터 */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="공간·은어·소음·냄새 검색 (예: 뒷골목, 단속, 네온, 흥정)"
          style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13 }}
        />
        {query && <button className="minibtn" onClick={() => setQuery('')} title="검색어 지우기">✕</button>}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0, alignItems: 'center' }}>
        {AXES.map((a) => (
          <button key={a.key} className="minibtn" onClick={() => setAxis(a.key)} aria-pressed={axis === a.key} style={chip(axis === a.key)}>
            <Emoji e={a.icon} /> {a.label}
          </button>
        ))}
        <button className="btn-primary" onClick={pickRandom} style={{ marginLeft: 'auto' }} title="현재 범위에서 항목 하나를 무작위로 뽑습니다"><Emoji e="🎲" /> 무작위</button>
      </div>

      {/* 무작위로 뽑힌 항목 강조 카드 */}
      {pickItem && (
        <div style={{ ...card, borderColor: 'var(--accent)', borderRadius: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 16 }}><Emoji e={pickItem.section.icon} /></span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{pickItem.section.label}</span>
            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{pickItem.entry.name}</span>
            <button className="minibtn" onClick={() => setPickItem(null)} title="닫기" style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px' }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {pickItem.entry.words.map((w, i) => (
              <span key={i} style={{ fontSize: 12, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px' }}>{w}</span>
            ))}
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text)', borderLeft: '2px solid var(--accent)', paddingLeft: 8 }}>
            “{rand(pickItem.entry.lines)}”
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            <button className="minibtn" onClick={() => safeCopy(entryText(pickItem.section, pickItem.entry), 'pick')} style={copied === 'pick' ? { color: 'var(--ok)', borderColor: 'var(--ok)' } : undefined}>{copied === 'pick' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
            <button className="minibtn" onClick={pickRandom}><Emoji e="🎲" /> 다시</button>
          </div>
        </div>
      )}

      {/* 결과 수 */}
      <div style={{ ...hint, flexShrink: 0 }}>
        {q || axis !== '전체'
          ? <>일치 항목 <b style={{ color: 'var(--accent)' }}>{matchCount}</b>개</>
          : <>총 <b style={{ color: 'var(--accent)' }}>{stats.sections}</b>개 분류 · 항목 <b>{stats.entries}</b> · 어휘 <b>{stats.words}</b> · 묘사 문장 <b>{stats.lines}</b></>}
      </div>

      {/* 섹션(펼침/접힘) 목록 */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 && (
          <div style={{ ...hint, textAlign: 'center', padding: 20 }}>일치하는 항목이 없습니다. 다른 말로 검색해 보세요.</div>
        )}
        {filtered.map((g) => {
          const s = g.section
          const opened = isOpen(s.key)
          return (
            <div key={s.key} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <button
                onClick={() => toggle(s.key)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--panel)', border: 'none', borderBottom: opened ? '1px solid var(--border)' : 'none', color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ fontSize: 16 }}><Emoji e={s.icon} /></span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{s.label}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>{s.axis}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{g.entries.length}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 12 }}>{opened ? '▾' : '▸'}</span>
              </button>
              {opened && (
                <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--paper)' }}>
                  <div style={hint}>{s.blurb}</div>
                  {g.entries.map((e) => (
                    <div key={e.name} style={card}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--accent)' }}>{e.name}</span>
                        <button className="minibtn" onClick={() => safeCopy(entryText(s, e), e.name)} title="이 항목 복사" style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px', ...(copied === e.name ? { color: 'var(--ok)', borderColor: 'var(--ok)' } : {}) }}>{copied === e.name ? '✓' : <Emoji e="📋" />}</button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                        {e.words.map((w, i) => (
                          <span key={i} style={{ fontSize: 12, color: 'var(--text)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px' }}>{w}</span>
                        ))}
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {e.lines.map((l, i) => (
                          <li key={i} style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>{l}</li>
                        ))}
                      </ul>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {hasStash() && <button className="linkbtn" onClick={() => stashEntry(s, e)} title="이 묘사를 수집함에 담습니다"><Emoji e="📎" /> 수집함</button>}
                        <button className="linkbtn" onClick={() => snippetEntry(s, e)} title="이 묘사를 스니펫 라이브러리에 저장합니다"><Emoji e="✂️" /> 스니펫</button>
                        <button className="linkbtn" onClick={() => projectEntry(s, e)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '이 묘사를 프로젝트 자료에 추가합니다' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 도구 연계 — 도시의 냄새를 향·냄새 사전으로 이어 가기 */}
      <div className="linkbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0, alignItems: 'center' }}>
        <button className="linkbtn" onClick={() => openToolLinked('scent-ref')} title="도시의 냄새 묘사를 더 깊이 다루려면 향·냄새 묘사 사전을 엽니다">
          <Emoji e="👃" /> 향·냄새 묘사 사전 열기
        </button>
        {linkMsg && <span className="license-note" style={{ fontSize: 12, color: 'var(--ok)' }}>✓ {linkMsg}</span>}
      </div>

      <div style={hint}>은어와 풍경을 그대로 옮기기보다, 인물이 그 거리에서 무엇을 두려워하고 무엇에 익숙한지로 비틀어 보세요. 누아르의 긴장은 디테일의 누적에서 옵니다.</div>
      <div className="license-note" style={{ ...hint, fontSize: 11 }}>모든 어휘·은어·문장은 직접 작성한 창작 텍스트(가상의 설정)입니다. 실존 조직·은어를 옮기지 않으며, 외부 이미지·API·폰트를 사용하지 않습니다.</div>
    </div>
  )
}
