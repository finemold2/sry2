// 군사 조직·계급·작전 용어 사전 — 전쟁·밀리터리·역사·판타지물 고증을 돕는 로컬 자작 자료집.
//  ⚠ 실제 군사 작전·교범이 아니라, 군대·전쟁 묘사의 '고증과 질감'을 돕는 창작 자료로 구성한다.
//  자급식: react 와 './linkbus' 외 import 없음. 외부 API/미디어/네트워크 없음(전부 로컬 자작 데이터).
//  카테고리 펼침 + 검색 + 무작위 + 즐겨찾기 + 클릭복사 + 수집함/스니펫/프로젝트 연계 + 관련 도구 열기.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, addToStash, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'military-org-ref',
  name: '군사 조직·계급 사전',
  icon: '🎖️',
  group: '리서치·자료',
  genre: '전쟁·밀리터리·역사·판타지',
  intro: '시대·병종별 계급 체계·편제(부대 규모)·지휘 구조·전술 교리·군 은어를 정리한 전쟁·밀리터리물 고증 참고 자료',
  w: 680,
  h: 700,
}

// ---------- 항목 형(型) ----------
// 모든 텍스트는 '묘사·설정용 단서'이지 실제 작전·교범이 아니다. 조직·문화·말투의 질감에 초점을 둔다.
interface Entry {
  name: string          // 명칭(계급·편제·직책·전술·은어 등)
  aka?: string          // 이칭·별칭·대응(타군/타국)
  era?: string          // 시대·문화 배경
  scale?: string        // 규모·인원·구성(편제 항목의 핵심)
  role?: string         // 역할·임무·권한
  who?: string          // 누가 맡나(계급·직책·자격)
  voice?: string        // 말투·호칭·분위기(대사 묘사용)
  detail?: string       // 디테일·운용·구조
  cliche?: string       // 흔한 오류·클리셰(고증 유의)
}
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ---------- 로컬 대량 자료집 ----------
const CATS: CatDef[] = [
  {
    key: 'rank-modern', label: '현대 계급(육군 기준)', icon: '🪖',
    note: '계급은 ‘서열’이자 ‘책임의 무게’다. 같은 군복도 가슴의 약장과 어깨의 계급장이 모든 관계를 정한다 — 누가 명령하고 누가 따르는가.',
    items: [
      { name: '이등병·일등병(이병·일병)', aka: '신병·졸병', era: '현대', scale: '개인(말단)', role: '명령을 받아 수행하는 가장 아래. 모든 잡무와 위험의 최전선.', who: '갓 입대한 병사', voice: '“~말입니다”, “예, 알겠습니다!” 짧고 각진 복명복창. 선임 앞에선 눈도 함부로 못 든다.', detail: '아직 ‘열외’가 잦고 실수가 많아 늘 지적받는 위치. 시간이 곧 계급인 사회.', cliche: '신병이 곧바로 영웅적 활약을 하는 전개는 비현실 — 처음 몇 달은 ‘몸이 굳고 손이 떨리는’ 적응기가 사실적.' },
      { name: '상등병·병장(상병·병장)', aka: '고참·말년', era: '현대', scale: '개인(병 최고참)', role: '병사 중 최고참. 분대 내 실무를 사실상 좌우하고 후임을 통솔.', who: '복무 후반의 병사', voice: '“그건 이렇게 하는 거다.” 여유롭고 능숙. 말년엔 ‘떨어지는 낙엽도 조심’하는 분위기.', detail: '간부는 아니나 ‘병들의 왕’. 분위기·기강을 실질적으로 쥔다. 전역이 가까워질수록 책임에서 한 발 물러나는 심리.', cliche: '병장을 만능 해결사로만 그리면 단조롭다 — 권한 없는 책임, 곧 떠날 자의 거리감이 입체감을 준다.' },
      { name: '하사·중사·상사(부사관)', aka: '하사관·NCO', era: '현대', scale: '개인(직업군인 실무 핵심)', role: '분대·소대의 실무 지휘와 장비·훈련·기강을 책임지는 ‘군의 척추’.', who: '직업으로 복무하는 부사관', voice: '거칠지만 현장에 밝다. “장교는 계획을, 부사관은 일을 한다”는 자부심.', detail: '오래 복무해 실무에 가장 밝다. 젊은 초급장교를 ‘은근히 가르치는’ 베테랑이 흔한 구도.', cliche: '부사관을 단순 폭력적 교관으로 그리면 얕다 — 실무를 떠받치는 전문성·연륜이 핵심 매력이다.' },
      { name: '원사·주임원사', aka: '망치(군 은어)·CSM', era: '현대', scale: '개인(부사관 최선임)', role: '부대 부사관단의 정점. 지휘관의 ‘오른팔’로 병·부사관의 기강과 복지를 총괄.', who: '최고참 부사관', voice: '한마디에 부대가 긴장한다. 장교에게도 직언할 수 있는 무게.', detail: '계급은 부사관이나 영향력은 막강. 지휘관도 이 사람의 의견을 함부로 무시 못 한다.', cliche: '계급장만 보고 ‘부사관=장교보다 아래’로 단순화하면 오류 — 주임원사의 실질 권위를 살리면 조직 묘사가 깊어진다.' },
      { name: '소위·중위(초급장교)', aka: '꼬마장교·신임장교', era: '현대', scale: '개인(소대장급)', role: '소대(수십 명)를 지휘하는 첫 장교. 이론은 있으나 실전은 부사관에게 배운다.', who: '사관학교·후보생 출신 갓 임관 장교', voice: '“소대, 집합!” 권위를 세우려 하나 베테랑 부사관 앞에선 한 수 접는다.', detail: '책임은 무겁고 경험은 얕은 긴장의 자리. 노련한 선임 부사관과의 관계가 성장의 관문.', cliche: '초급장교가 처음부터 완벽히 통솔하는 전개는 비현실 — 부사관에게 배우며 신뢰를 쌓는 과정이 사실적.' },
      { name: '대위·소령(중급장교)', aka: '중대장·대대 참모', era: '현대', scale: '개인(중대장급)', role: '중대(백여 명)를 책임지거나 대대 참모로 작전·인사·군수를 맡는다.', who: '경력을 쌓은 장교', voice: '계획과 보고의 언어. 위로는 보고하고 아래로는 지시하는 ‘중간 관리자’의 피로.', detail: '실전 지휘의 핵심 단위(중대)를 맡는 첫 단계. 위아래에 끼인 압박이 큰 자리.', cliche: '대위급을 ‘만능 영웅’으로 그리기보다, 상부 명령과 부하 안위 사이의 갈등을 그리면 인간적 깊이가 산다.' },
      { name: '중령·대령(고급장교)', aka: '대대장·연대장', era: '현대', scale: '개인(대대·연대장급)', role: '수백~수천 명의 대대·연대를 지휘. 작전의 큰 그림과 부대 운명을 쥔다.', who: '검증된 고급장교', voice: '결단의 언어. 한 명령이 수백 명의 생사를 가른다는 무게가 배어난다.', detail: '진급 경쟁이 치열한 ‘병목’. 별(장군)을 향한 마지막 관문에서 정치·실력·운이 얽힌다.', cliche: '고급장교의 결정은 ‘냉혹한 효율’과 ‘부하에 대한 책임’ 사이의 저울질 — 한쪽만 그리면 평면적.' },
      { name: '준장~대장(장성·장군)', aka: '별·스타·제너럴', era: '현대', scale: '개인(여단·사단·군단·군 지휘)', role: '여단 이상 대부대와 전략을 지휘. 별의 개수(준장1~대장4)가 곧 권력의 크기.', who: '최상위 지휘관', voice: '말수가 적되 무겁다. 한마디가 곧 작전. 정치·군사가 교차하는 자리.', detail: '전술이 아니라 ‘전략·정치’의 영역. 전장보다 상황실·회의실에서 더 많은 싸움을 한다.', cliche: '장군을 전선에서 직접 총 쏘는 영웅으로 그리는 건 비현실 — 그들의 무대는 지도와 통신, 정치다.' },
    ],
  },
  {
    key: 'rank-history', label: '역사·시대별 계급·직책', icon: '🏛️',
    note: '계급의 이름은 시대를 비춘다. 백인대장과 천호장, 별기장과 천총 — 옛 직책의 어감 하나가 시대 고증을 단숨에 세운다.',
    items: [
      { name: '백인대장(켄투리오)', aka: '센추리온', era: '고대 로마', scale: '백인대(약 80명)', role: '로마 군단의 중추 지휘관. 백인대(켄투리아)를 이끌고 직접 최전선에 선다.', who: '실전으로 올라온 노련한 직업군인', voice: '굵은 명령과 욕설, 포도나무 지팡이(비티스)로 군기를 잡는 거친 권위.', detail: '로마군의 ‘진짜 척추’. 장교(트리부누스)는 정치 코스지만, 백인대장은 실전이 만든다.', cliche: '로마군을 묘사할 때 백인대장의 ‘현장 권위’를 살리면 고증의 밀도가 다르다 — 군단의 힘은 여기서 나왔다.' },
      { name: '천부장·백부장', aka: '천호장·백호장', era: '동아시아·유목(고대~중세)', scale: '천 명·백 명 단위', role: '천 명(천호)·백 명(백호)을 통솔하는 지휘관. 십진 편제의 골격.', who: '공을 세운 무장·부족장', voice: '간결한 명령과 군율. 유목 기병에선 ‘속도와 신호’가 곧 권위.', detail: '몽골식 십진 편제(십호·백호·천호·만호)의 일부. 명료한 단위가 거대 군세를 통제 가능하게 했다.', cliche: '유목 대군을 ‘오합지졸’로 그리면 오류 — 십진 편제와 신호 체계가 만든 정밀한 통제력이 진짜 무서움이다.' },
      { name: '만호·천총·파총', aka: '조선·동아시아 무관직', era: '조선·중세 동아시아', scale: '만호=대부대, 천총·파총=중·소대급', role: '지방군·진(鎭)을 지휘하거나 부대를 통솔하는 무관 직책.', who: '무과 급제·군공으로 임명된 무관', voice: '“~하라.” 한문투의 군령과 격식. 문관과의 위계·갈등이 배어난다.', detail: '조선은 문관 우위라 무관의 지위가 상대적으로 낮았다 — 그 설움이 인물의 동기가 된다.', cliche: '조선군을 단순 약체로 그리기보다, 문무 위계·재정 한계 속의 분투를 그리면 역사 고증이 깊어진다.' },
      { name: '기사·종자(스콰이어)', aka: '나이트·견습기사', era: '중세 유럽', scale: '개인(+종자·시종 수행)', role: '봉건 영주에게 충성하고 무장 기병으로 싸우는 전사 계급. 종자는 그 견습.', who: '귀족 가문의 자제(시동→종자→기사 서임)', voice: '명예·충성·서약의 언어. 거친 전사이자 격식의 귀족이라는 이중성.', detail: '기사는 ‘직업’이 아니라 ‘신분’. 말·갑주·종자를 자비로 갖춰야 했다(전쟁은 비쌌다).', cliche: '기사를 무조건 고결하게만 그리면 낭만화 — 약탈·반목·돈 문제도 현실이었음을 넣으면 입체감이 산다.' },
      { name: '용병대장(콘도티에로)', aka: '자유용병단 단장', era: '중세~르네상스 유럽', scale: '용병단(수십~수천)', role: '계약으로 싸우는 직업 군대의 두목. 충성은 ‘돈과 명성’을 따른다.', who: '실력으로 부대를 모은 야전 지휘관', voice: '계약·보수·평판의 언어. 명예보다 ‘다음 일자리’가 행동을 정한다.', detail: '봉신이 아닌 ‘사업가’. 너무 빨리 이기면 일거리가 끊겨 일부러 끌기도 했다는 묘한 동기.', cliche: '용병을 단순 악당으로만 그리면 단순하다 — ‘돈 따라 충성’이라는 합리적 동기가 더 흥미로운 회색지대다.' },
      { name: '제독·함장', aka: '애드미럴·캡틴(해군)', era: '범선~현대 해군', scale: '함대·단일 함선', role: '함대(제독)나 한 척의 군함(함장)을 지휘. 바다 위에선 함장이 곧 법.', who: '항해·전투 경력의 해군 장교', voice: '“우현 전타!” 절도 있는 항해 구령. 함장은 외롭고 절대적인 권위.', detail: '범선 시대 함장은 한 척의 ‘작은 왕’이었다 — 보급·통신이 끊긴 바다에서 모든 책임이 그에게 있었다.', cliche: '해상 지휘를 육상처럼 그리면 어색 — 통신 단절·고립·바다의 변수라는 해군 특유의 질감을 살릴 것.' },
    ],
  },
  {
    key: 'unit', label: '편제(부대 규모)', icon: '🔢',
    note: '“몇 명인가”가 곧 “무엇을 할 수 있는가”다. 분대부터 군단까지 — 규모의 사다리를 알면 전투의 스케일이 정확해진다.',
    items: [
      { name: '분대(分隊)', aka: '스쿼드', era: '현대', scale: '약 8~12명', role: '전술의 최소 단위. 함께 먹고 자고 싸우는 ‘가족 같은’ 집단.', who: '분대장(하사·병장)이 지휘', voice: '이름·별명으로 부르는 가장 사적인 단위. 농담과 욕설, 진한 전우애.', detail: '현대 보병 전술의 기본 벽돌. 화기조·소총조로 나뉘어 ‘쏘고 움직이는’ 짝을 이룬다.', cliche: '전쟁 이야기의 정서는 대부분 ‘분대’ 규모에서 산다 — 너무 큰 단위로만 그리면 인물이 흐려진다.' },
      { name: '소대(小隊)', aka: '플래툰', era: '현대', scale: '약 30~50명(3~4개 분대)', role: '소위(소대장)와 선임 부사관이 함께 이끄는 첫 ‘지휘 단위’.', who: '소대장(소위·중위) + 선임 부사관', voice: '“소대, 산개!” 장교의 명령과 부사관의 통제가 겹친다.', detail: '초급장교가 처음 사람을 책임지는 단위. 장교-부사관의 호흡이 전투력을 좌우.', cliche: '소대장 혼자 모든 걸 결정하는 묘사는 비현실 — 베테랑 부사관과의 역할 분담이 사실적이다.' },
      { name: '중대(中隊)', aka: '컴퍼니', era: '현대', scale: '약 100~150명(3~4개 소대)', role: '독립 작전이 가능한 최소 단위. 대위(중대장)가 지휘.', who: '중대장(대위) + 행정보급관(상사·원사)', voice: '점호·집합의 단위. 중대장의 성격이 곧 부대 분위기.', detail: '병영 생활과 전투의 기본 ‘집’. 보급·취사·행정을 갖춘 자립 단위.', cliche: '“한 중대로 적 사단을 막았다”류는 극적이나 드문 일 — 규모 차이의 무게를 정확히 그려야 설득된다.' },
      { name: '대대(大隊)', aka: '배탤리언', era: '현대', scale: '약 300~800명(3~5개 중대)', role: '중령(대대장)이 지휘하는 본격 작전 부대. 참모와 지원중대를 갖춘다.', who: '대대장(중령) + 참모진(작전·인사·군수·정보)', voice: '참모 회의·상황도·무전의 언어. 개인보다 ‘부대’를 말한다.', detail: '독립 작전·방어 구역을 맡는 핵심 제대. 여기서부터 ‘참모’가 작전을 짠다.', cliche: '대대 이상부턴 지휘관이 개인 전투를 하지 않는다 — 상황실·지도가 그들의 전장이다.' },
      { name: '연대·여단(聯隊·旅團)', aka: '레지먼트·브리게이드', era: '현대', scale: '연대 1천~3천, 여단 3천~5천', role: '여러 대대를 묶은 대부대. 대령·준장이 지휘하며 독립 전투가 가능.', who: '연대장(대령)·여단장(준장)', voice: '전술을 넘어 ‘작전’의 언어. 부대 간 협조와 화력 배분.', detail: '여단은 보병·포병·기갑·공병을 섞은 ‘제병협동’의 단위로 현대전의 주력.', cliche: '병종을 따로따로 그리면 현대전 같지 않다 — ‘제병협동(여러 병과의 합)’이 핵심 질감이다.' },
      { name: '사단·군단(師團·軍團)', aka: '디비전·코어', era: '현대', scale: '사단 1만~2만, 군단 수만', role: '전략 단위. 소장(사단장)·중장(군단장)이 전역의 한 축을 책임진다.', who: '사단장(소장)·군단장(중장)', voice: '전략·정치·보급의 언어. 지도 위에서 군을 ‘덩어리’로 움직인다.', detail: '한 도시·전선을 통째로 맡는 규모. 보급선·예비대·시간표가 승패를 가른다.', cliche: '대군의 이동은 ‘보급’이 절반 — 화려한 전투만 그리고 군수를 빼면 전쟁 묘사가 가벼워진다.' },
      { name: '고대 군단(레기온)', aka: '로마 레기온', era: '고대 로마', scale: '약 4,800~5,400명', role: '로마군의 핵심 대부대. 코호르스·켄투리아·콘투베르니움으로 정연하게 나뉜다.', who: '레가투스(군단장)·트리부누스·백인대장', voice: '나팔·군기·구령으로 움직이는 정밀한 집단. 라틴어 군령의 절도.', detail: '천막 한 동(8명, 콘투베르니움)→백인대→코호르스→군단의 사다리. 규율과 토목이 곧 무기였다.', cliche: '로마군의 힘은 ‘개개인의 강함’보다 ‘편제·규율·공병력’ — 무질서한 전투집단으로 그리면 고증이 무너진다.' },
      { name: '판타지·가상 편제', aka: '기사단·군단·코호트(창작)', era: '판타지·가상', scale: '설정 나름(기사단=정예 소수~수천)', role: '세계관 규모·마법·종족에 맞춘 자유 설계. 단, 내부 일관성이 생명.', who: '단장·기사장·사령관 등 창작 직책', voice: '서약·문장(紋章)·서열의 언어를 일관되게. 호칭 체계가 곧 세계의 깊이.', detail: '실제 편제(분대→군단)를 ‘뼈대’로 삼고 마법·비행·괴수 병종을 더하면 설득력이 산다.', cliche: '“1만 대군”을 외치고 보급·지휘를 안 그리면 공허 — 규모엔 먹이고 재우고 명령 전달하는 ‘현실’이 따른다.' },
    ],
  },
  {
    key: 'command', label: '지휘·참모·직책', icon: '📋',
    note: '명령이 어떻게 흘러가는가 — 지휘 계통과 참모 조직을 알면, 한 줄의 명령이 최전선까지 닿는 ‘시간과 마찰’을 그릴 수 있다.',
    items: [
      { name: '지휘 계통(체인 오브 커맨드)', aka: '명령 계통·지휘권', era: '전 시대', scale: '조직 전체', role: '명령이 위에서 아래로 흐르는 ‘책임의 사슬’. 한 단계도 건너뛰지 않는 것이 원칙.', who: '모든 계급이 사슬의 한 고리', voice: '“계통을 밟아 보고하라.” 절차를 어기면 군기 문란.', detail: '명령은 한 단계씩 내려가며 ‘현장에 맞게’ 해석된다. 계통이 끊기면(통신 두절) 부대는 마비된다.', cliche: '주인공이 계통을 무시하고 독단으로 움직이는 전개는 극적이나, ‘항명’의 대가(처벌·불신)를 그려야 무게가 산다.' },
      { name: '참모(스태프)', aka: '막료·G/S 참모', era: '근대~현대', scale: '지휘부', role: '지휘관을 보좌해 정보·작전·인사·군수를 분담 기획. ‘싸우지 않는 두뇌’.', who: '참모장교(인사1·정보2·작전3·군수4)', voice: '보고서·브리핑·상황도의 언어. 숫자와 가능성을 말한다.', detail: '1=인사, 2=정보, 3=작전, 4=군수의 분업(미군 G/S 체계). 참모장이 이를 총괄.', cliche: '전쟁을 ‘전선의 총격’으로만 그리면 절반 — 후방 참모의 계획·보급이 승패를 좌우함을 보여주면 깊이가 산다.' },
      { name: '참모장(치프 오브 스태프)', aka: '비서실장 격', era: '근대~현대', scale: '지휘부 정점', role: '참모 조직을 총괄하고 지휘관의 의도를 명령으로 변환하는 ‘조직의 허리’.', who: '신임 두터운 고급장교', voice: '지휘관의 뜻을 ‘번역’해 각 참모에 배분. 실무의 최종 조율자.', detail: '지휘관이 ‘무엇을’ 정하면 참모장이 ‘어떻게’를 조직한다 — 둘의 호흡이 부대의 효율.', cliche: '지휘관 혼자 모든 걸 처리하는 묘사보다, 참모장과의 분업을 그리면 조직의 현실감이 산다.' },
      { name: '전령·통신', aka: '러너·시그널·무전병', era: '전 시대', scale: '개인~분대', role: '명령과 보고를 ‘나르는’ 신경. 옛엔 사람·말·나팔·연기, 현대엔 무전·암호.', who: '전령병·통신병·기수', voice: '“충성! ○○에서 전문입니다.” 정확한 복창이 생명 — 한 글자 오류가 참사.', detail: '통신이 끊기면 가장 정교한 작전도 무너진다. ‘안개 속의 전쟁’의 핵심 변수.', cliche: '명령이 즉시 전달된다고 가정하면 비현실 — 전달의 ‘지연·왜곡·두절’이 극적 긴장의 보고(寶庫)다.' },
      { name: '군사고문·작전참모', aka: '어드바이저·G3', era: '현대', scale: '지휘부', role: '작전 계획을 입안하고 지휘관에게 ‘수(手)’를 제시하는 핵심 두뇌.', who: '작전 경험 풍부한 장교', voice: '“세 가지 방책이 있습니다.” 선택지와 위험을 저울에 올린다.', detail: '여러 ‘방책(COA)’을 비교해 최선을 권한다. 지휘관은 그중 하나를 ‘결심’한다.', cliche: '작전이 즉흥적으로 떠오르는 전개보다, 방책 비교·도상연습의 과정을 그리면 군사적 설득력이 산다.' },
      { name: '헌병·군기', aka: '엠피(MP)·프로보스트', era: '근대~현대', scale: '전담 부대', role: '군 내 질서·교통·포로·범죄를 관리. 후방의 질서를 지키는 ‘군대 속 경찰’.', who: '헌병 병과', voice: '“정지! 통행증 제시.” 같은 군인에게도 단호한 통제.', detail: '전선보다 후방·검문소·포로수용소가 무대. 전우이자 ‘감시자’라는 미묘한 위치.', cliche: '헌병을 단순 악역으로만 쓰면 평면적 — 질서 유지의 필요와 통제의 폭력 사이 회색지대가 흥미롭다.' },
    ],
  },
  {
    key: 'branch', label: '병과·병종', icon: '🛠️',
    note: '“무엇으로 싸우는가”가 병과를 가른다. 보병·기병·포병·공병… 각 병종의 자부심과 텃세, 협동과 반목이 군대 문화를 만든다.',
    items: [
      { name: '보병(步兵)', aka: '인펀트리·발로 뛰는 자', era: '전 시대', scale: '군의 다수', role: '땅을 직접 밟고 점령하는 ‘전쟁의 여왕’. 결국 영토는 보병의 발로 차지한다.', who: '대다수 병사', voice: '“결국 우리가 들어가야 끝난다.” 진흙·피로·자부심이 섞인 거친 정서.', detail: '아무리 화력이 발달해도 ‘점령’은 보병의 몫. 가장 많이 죽고 가장 고생하는 병종.', cliche: '첨단 무기 시대에도 보병이 ‘구식’이 아니라 ‘최종 결정자’임을 그리면 전쟁의 본질이 산다.' },
      { name: '기병(騎兵)', aka: '캐벌리·기갑(현대 대응)', era: '고대~근대 / 현대=기갑', role: '속도와 충격으로 적을 흔들고 측면·후방을 친다. 현대엔 전차가 그 역할을 잇는다.', who: '말(혹은 전차)을 다루는 정예', voice: '엘리트 의식이 강하다. “보병의 진흙탕과 우린 다르다”는 자부심(과 텃세).', detail: '돌파·추격·정찰의 기동 전력. 유지비가 비싸 ‘귀족·정예’의 병종이었다.', cliche: '기병 돌격을 만능으로 그리면 오류 — 장창 방진·참호 앞에선 무력했음을 함께 그려야 균형이 산다.' },
      { name: '포병(砲兵)', aka: '아틸러리·전쟁의 신', era: '근세~현대', scale: '포대(여러 문)', role: '먼 거리에서 화력을 퍼붓는 ‘전장의 망치’. 현대전 사상자의 다수를 낸다.', who: '관측·계산·사격을 분업하는 전문 병과', voice: '좌표·제원·“사격!”의 수학적 언어. 적을 보지 않고 ‘지도 위 점’으로 친다.', detail: '관측병이 좌표를 불러 후방의 포가 때린다 — 보이지 않는 죽음. 보병의 ‘든든한 우산’.', cliche: '포병을 배경으로만 두면 아깝다 — ‘보이지 않는 곳에서 오는 죽음’의 공포와 관측-사격의 협동이 극적이다.' },
      { name: '공병(工兵)', aka: '엔지니어·사퍼', era: '전 시대', scale: '전문 부대', role: '길을 닦고 다리를 놓고 진지를 짓고 지뢰를 거둔다. ‘싸우기 위한 길’을 만드는 손.', who: '토목·폭파·축성 전문 병과', voice: '“길이 없으면 만든다.” 전투보다 ‘공사’의 언어. 묵묵한 실용주의.', detail: '로마군의 강함도 공병의 토목력에서 나왔다. 현대엔 도하·지뢰·폭파의 핵심.', cliche: '전투만 그리고 ‘어떻게 강을 건넜나’를 빼면 비현실 — 공병의 일이 작전을 가능케 한다.' },
      { name: '의무·위생', aka: '메딕·군의관·간호', era: '전 시대', scale: '의무대', role: '부상자를 살리고 후송한다. 전장에서 ‘살리는 손’이라는 특수한 위치.', who: '군의관·위생병·간호장교', voice: '“출혈부터 잡아!” 다급함 속의 냉정. 적도 살릴지 고뇌하는 윤리.', detail: '전사자보다 ‘살릴 수 있었던 부상자’의 비극이 크다. 후송 속도가 곧 생존율.', cliche: '부상의 구체적 양상·치료·회복 경과는 〈부상·회복 사전〉과 맞춰 그리면 의무병 묘사가 깊어진다.' },
      { name: '병참·수송(군수)', aka: '로지스틱스·보급', era: '전 시대', scale: '후방 대조직', role: '먹이고 입히고 탄약을 나른다. “아마추어는 전술을, 프로는 보급을 말한다.”', who: '보급·수송·정비 병과', voice: '재고·수송·소요의 언어. 화려하지 않으나 전쟁을 지탱한다.', detail: '대군은 ‘먹는 입’이다 — 보급이 끊기면 가장 강한 군대도 굶어 무너진다.', cliche: '보급을 무시하면 전쟁 묘사가 가벼워진다 — 굶주림·탄약 부족·보급선 차단이 진짜 승부처일 때가 많다.' },
      { name: '특수부대', aka: '코만도·스페셜포스', era: '현대(원형은 고대)', scale: '소수 정예', role: '침투·정찰·요인 구출·파괴 등 ‘소수로 비대칭 타격’을 수행.', who: '극한 훈련을 통과한 정예', voice: '말수 적고 절제된 프로페셔널리즘. ‘조용한 전문가’의 자부심.', detail: '소수·은밀·고난도. 실패가 곧 고립이라 정신력과 팀워크가 생명.', cliche: '특수부대를 ‘무적 슈퍼히어로’로 그리면 얕다 — 보급·지원이 끊긴 고립의 취약함이 긴장을 만든다.' },
      { name: '정보·첩보', aka: '인텔리전스·정보병과', era: '전 시대', scale: '전담 조직', role: '적의 의도·전력을 캐고 아군 정보를 지킨다. ‘보이지 않는 전쟁’.', who: '정보장교·분석관·요원', voice: '추정·확률·“신뢰도 중”의 언어. 확실한 건 없고, 늘 ‘안개’ 속이다.', detail: '정보 우위가 곧 전쟁 우위. 다만 ‘틀린 정보·역정보’의 함정이 늘 따른다.', cliche: '정보가 항상 정확하다고 가정하면 비현실 — ‘잘못된 정보로 인한 참사’가 전쟁의 흔한 비극이다.' },
    ],
  },
  {
    key: 'tactic', label: '작전·전술 교리', icon: '🗺️',
    note: '무기보다 ‘어떻게 쓰느냐’. 포위·돌파·기만·후퇴 — 작전의 문법을 알면 전투 장면이 ‘우연’이 아니라 ‘의도’로 읽힌다.',
    items: [
      { name: '포위(包圍)·섬멸', aka: '에워싸기·이중포위', era: '전 시대', scale: '작전급', role: '적의 측면·후방을 감아 ‘퇴로를 끊고’ 섬멸하는 결정적 기동.', who: '기동 전력(기병·기갑)이 주역', voice: '“양익으로 감싸라.” 중앙은 버티고 양 날개가 돈다.', detail: '한니발의 칸나이 전투가 교과서 — 약한 중앙으로 끌어들여 양익으로 감쌌다. 퇴로 차단이 핵심.', cliche: '포위는 ‘둘러싸기만 하면 끝’이 아니다 — 포위된 적의 필사적 돌파(궁지의 쥐) 위험을 함께 그릴 것.' },
      { name: '돌파(突破)·집중', aka: '브레이크스루·전격전', era: '전 시대~현대', scale: '작전급', role: '한 점에 전력을 모아 적의 선을 ‘뚫고’ 종심으로 쇄도한다.', who: '집중된 기갑·충격 전력', voice: '“한 점을 집중 타격하라.” 넓게 펴지 말고 ‘송곳’처럼.', detail: '전격전(블리츠크리크)이 대표 — 좁은 정면에 기갑·항공·기동을 집중해 단숨에 뚫는다.', cliche: '돌파만 하고 ‘측면 노출·보급 한계’를 잊으면 위험 — 너무 깊이 들어간 송곳은 잘려 나간다.' },
      { name: '기만·양동(陽動)', aka: '디셉션·페인트', era: '전 시대', scale: '전략~전술', role: '거짓 움직임으로 적의 시선·전력을 ‘엉뚱한 곳’에 묶어 둔다.', who: '지휘부의 계략', voice: '“여기를 칠 것처럼 보이게 하라.” 진짜 의도는 숨긴다.', detail: '노르망디 상륙 전 ‘가짜 군대(고무 전차)’로 적을 속인 사례. 정보전·심리전과 한 몸.', cliche: '기만은 ‘적이 속아 줘야’ 성립 — 적도 바보가 아니므로, 정교한 ‘이중 기만’의 머리싸움이 흥미롭다.' },
      { name: '지연·후퇴·철수', aka: '딜레잉·종심방어', era: '전 시대', scale: '작전급', role: '시간을 벌거나 전력을 보존하기 위해 ‘질서 있게’ 물러난다 — 가장 어려운 기동.', who: '후위(後衛) 부대가 희생을 떠안는다', voice: '“후위가 버틴다. 본대는 물러나라.” 누군가는 남아야 한다는 비장.', detail: '패주(무너짐)와 철수(질서)는 천지차. 후퇴를 통제하는 능력이 명장의 척도.', cliche: '후퇴를 ‘비겁’으로만 그리면 얕다 — 전력 보존을 위한 ‘질서 있는 후퇴’가 종종 더 큰 용기다.' },
      { name: '제병협동(諸兵協同)', aka: '컴바인드 암스', era: '근대~현대', scale: '작전급', role: '보병·기갑·포병·항공이 ‘약점을 서로 메우며’ 함께 싸우는 현대전의 핵심.', who: '여러 병과의 합동', voice: '“보병 전진, 포병 탄막, 항공 근접지원.” 시간표로 짜인 협주.', detail: '한 병종은 반드시 약점이 있다 — 기갑은 보병에, 보병은 포병에… 서로 가려 주는 것이 강함의 비결.', cliche: '병종을 따로따로 싸우게 그리면 현대전 같지 않다 — ‘조합’이 곧 전투력임을 보여줄 것.' },
      { name: '비대칭전·게릴라', aka: '유격전·반란', era: '전 시대(현대 두드러짐)', scale: '소규모 분산', role: '약자가 정규전을 피하고 ‘치고 빠지며’ 강자를 지치게 한다.', who: '유격대·민병·반군', voice: '“이기려 하지 말고 지지 마라.” 시간과 인내가 무기.', detail: '정면충돌 대신 보급선·소부대를 노린다. ‘주민의 지지’가 곧 보급과 은신처.', cliche: '게릴라를 단순 ‘약한 적’으로 그리면 오류 — 정규군을 수렁에 빠뜨리는 비대칭의 무서움을 살릴 것.' },
      { name: '공성(攻城)·농성', aka: '시즈·포위공격', era: '고대~근세', scale: '작전급', role: '성·요새를 함락하거나 지킨다 — 굶기기·돌파·기만의 인내심 싸움.', who: '공성측·수성측', voice: '“보급이 떨어질 때까지 기다린다.” 시간이 곧 무기.', detail: '공성은 대개 ‘피보다 굶주림’으로 결판났다. 질병·식량·식수가 칼보다 무서웠다.', cliche: '공성을 ‘성벽 타고 넘는 전투’로만 그리면 절반 — 보급·질병·심리전의 장기전이 본질이다.' },
    ],
  },
  {
    key: 'life', label: '군대 생활·문화', icon: '⛺',
    note: '전투는 짧고 일상은 길다. 보초·점호·군기·계급 사회의 질감 — 전쟁 이야기의 ‘공기’는 여기서 나온다.',
    items: [
      { name: '보초·경계 근무', aka: '불침번·초소·위병', era: '전 시대', scale: '개인~분대', role: '잠든 부대를 지키는 눈. 길고 지루하나 ‘방심하면 끝’인 긴장.', who: '교대로 서는 모든 병사', voice: '“누구냐!” 암구호 확인. 졸음과 추위, 어둠 속의 환청과의 싸움.', detail: '대부분 아무 일도 없어 지루하다 — 그 ‘지루함 속 단 한 번의 위기’가 이야기의 긴장이 된다.', cliche: '경계 근무를 늘 ‘사건이 터지는 시간’으로 그리면 비현실 — 99%의 권태가 1%의 공포를 빛나게 한다.' },
      { name: '점호·일과', aka: '롤콜·인원파악', era: '전 시대', scale: '부대 단위', role: '인원과 상태를 확인하는 의식. 하루를 여닫고 군기를 새기는 반복.', who: '전 부대', voice: '“번호!” “하나!”… 끝나면 마지막이 인원 보고. 한 명이라도 비면 비상.', detail: '반복과 통제가 곧 ‘군대다움’. 지긋지긋한 일상이 위기 때 ‘몸이 먼저 움직이는’ 훈련이 된다.', cliche: '훈련·반복의 지루함을 생략하면 위기 때 인물의 ‘몸에 밴 침착함’이 설득력을 잃는다.' },
      { name: '군기·기강(紀綱)', aka: '디시플린·군율', era: '전 시대', scale: '조직 전체', role: '명령을 ‘즉시·정확히’ 따르게 하는 규율. 공포가 만든 질서이자 생존의 조건.', who: '전 계급(특히 신병에게 가혹)', voice: '복명복창·차렷·경례의 절도. 작은 흐트러짐도 ‘군기 빠졌다’며 잡는다.', detail: '극한의 공포 속에서도 ‘몸이 명령대로 움직이게’ 하는 것이 군기의 목적 — 때로 폭력으로 변질된다.', cliche: '군기를 폭력으로만 그리면 단순 — ‘공포 속 질서’라는 필요와 ‘폭력의 변질’ 사이를 함께 그리면 입체적.' },
      { name: '계급 사회·텃세', aka: '짬밥·서열·기수', era: '전 시대', scale: '부대 내부', role: '계급·복무기간·기수가 만드는 비공식 서열. 공식 계급장 못지않게 강력하다.', who: '모든 구성원', voice: '“짬이 안 되는데.” 공식 명령과 비공식 서열이 충돌하는 미묘함.', detail: '같은 계급도 ‘들어온 순서’가 권력. 이 비공식 질서가 부조리와 전우애를 동시에 낳는다.', cliche: '비공식 서열(짬밥)을 무시하면 군대 묘사가 헐겁다 — 공식·비공식 권력의 이중 구조가 현실의 질감이다.' },
      { name: '훈련·교육', aka: '드릴·신병교육·BCT', era: '전 시대', scale: '훈련소·부대', role: '민간인을 ‘싸우는 몸’으로 바꾸는 과정. 반복으로 본능을 덮어쓴다.', who: '신병 + 교관(부사관)', voice: '교관의 고함과 욕설, “생각하지 마, 몸이 기억하게 해.” 반복의 언어.', detail: '두려움 속에서도 자동으로 움직이도록 ‘과하게’ 반복한다 — 훈련은 곧 ‘공포의 예방접종’.', cliche: '훈련 장면을 생략하면 인물이 갑자기 강해진 듯 보인다 — 몸에 새겨지는 과정을 그려야 성장이 설득된다.' },
      { name: '군장·보급품', aka: '기어·풀패키지·짐', era: '전 시대', scale: '개인', role: '병사가 등에 진 모든 것 — 무기·탄약·식량·물·삽·천막. 무게가 곧 고통.', who: '모든 병사', voice: '“이걸 다 메고 어떻게 싸우나.” 무게에 짓눌린 행군의 신음.', detail: '현대 보병은 자기 체중의 상당 부분을 짊어진다 — 행군 자체가 전투 전의 ‘소모전’.', cliche: '병사가 가볍게 뛰어다니는 묘사는 비현실 — 군장의 무게와 그로 인한 피로를 넣으면 사실감이 산다.' },
      { name: '군복·계급장·약장', aka: '인시그니아·전투복', era: '근대~현대', scale: '개인', role: '한눈에 ‘누구이고 무엇을 했는가’를 보여주는 시각 언어. 어깨·가슴이 곧 이력서.', who: '모든 군인', voice: '말없이 권위를 전한다 — 계급장 하나에 경례가, 약장 하나에 존경이 따른다.', detail: '약장(리본)은 받은 훈장·경력의 압축. 베테랑은 굳이 말하지 않아도 가슴이 말한다.', cliche: '계급장·약장의 ‘무언의 권위’를 활용하면, 대사 없이도 인물의 위계와 과거를 보여줄 수 있다.' },
    ],
  },
  {
    key: 'slang', label: '군 은어·호칭·구호', icon: '🗣️',
    note: '군대는 그들만의 언어를 가진 부족이다. 줄임말·은어·복창은 ‘소속감’이자 ‘효율’ — 대사에 한두 마디만 섞어도 진짜 군인처럼 들린다.',
    items: [
      { name: '복명복창(復命復唱)', aka: '명령 되받아 외치기', era: '전 시대', scale: '소통 방식', role: '받은 명령을 큰 소리로 ‘되외쳐’ 오해를 없애는 군대식 확인 절차.', who: '명령을 받는 모든 이', voice: '“○○로 이동하라!” → “○○로 이동하겠습니다!” 한 글자도 빼지 않는다.', detail: '소음·혼란 속에서 ‘잘못 들음’을 막는 생존 기술. 안 하면 군기 문란으로 지적.', cliche: '대사에 복명복창을 한두 번만 넣어도 ‘군대다운 공기’가 단숨에 산다 — 과하지 않게 양념처럼.' },
      { name: '암구호·수하(誰何)', aka: '패스워드·“누구냐”', era: '전 시대', scale: '경계 상황', role: '아군·적군을 가르는 약속된 말. 묻는 말(문어)과 답하는 말(답어)이 짝을 이룬다.', who: '보초와 접근자', voice: '“누구냐!” “(문어)○○!” “(답어)△△!” 틀리면 발포 대상.', detail: '매일 바뀌는 약속어. 어둠 속 신원 확인의 유일한 수단 — 잊으면 아군에게 죽을 수도.', cliche: '암구호를 잊거나 적이 알아낸 상황은 강력한 서스펜스 장치 — 한 단어가 생사를 가른다.' },
      { name: '“이상”·“수신 양호”', aka: '오버·로저·무전 용어', era: '근현대', scale: '통신', role: '무전 통신의 약속어. ‘말 끝’과 ‘수신 확인’을 분명히 해 혼선을 막는다.', who: '통신하는 모든 이', voice: '“여기는 ○○, 응답하라. 이상.” “수신 양호. 로저(알았다). 오버.”', detail: '“오버”=내 말 끝(응답 바람), “아웃”=교신 종료, “로저”=알아들음. 섞어 쓰면 아마추어 티.', cliche: '무전 용어를 정확히 쓰면 단숨에 ‘진짜’ 같다 — 단, “오버 앤 아웃”은 모순(흔한 영화식 오류)이니 주의.' },
      { name: '“충성!”·“필승!” (경례 구호)', aka: '부대 구호·전투구호', era: '근현대', scale: '인사·사기', role: '경례·인사 때 외치는 부대의 정신. 소속과 기강, 사기를 한마디에 담는다.', who: '경례하는 군인', voice: '절도 있는 손동작과 함께 짧고 우렁차게. 부대마다 고유 구호가 있다.', detail: '구호 하나에 부대의 ‘정체성’이 담긴다 — 창작 세계관도 고유 구호를 만들면 소속감이 산다.', cliche: '창작 군대에 고유 구호·경례법을 만들어 일관되게 쓰면, 세계관의 ‘군 문화’가 단번에 설득된다.' },
      { name: '“열외”·“관물대”·“짬”', aka: '병영 은어', era: '현대 한국군 등', scale: '일상', role: '집단에서 빠짐(열외), 개인 사물함(관물대), 경력·밥그릇(짬) 등 일상 은어.', who: '병사들', voice: '“넌 오늘 작업 열외다.” “짬 좀 됐다고.” 끼리끼리 통하는 축약의 언어.', detail: '은어는 ‘우리끼리’의 표식 — 외부인은 못 알아듣게 함으로써 소속감을 강화한다.', cliche: '은어를 한두 개만 적재적소에 쓰면 생생하다 — 너무 많이 쏟으면 독자가 길을 잃으니 주석처럼 풀어 줄 것.' },
      { name: '“하나, 둘!”·군가·구령', aka: '카덴스·발맞춤', era: '전 시대', scale: '집단 행동', role: '발·동작을 맞추는 리듬. 따로인 개인을 ‘하나의 부대’로 묶는 소리.', who: '행군·제식하는 전 부대', voice: '선창과 후렴의 주고받음 — “하나!” “둘!” 또는 가락 붙은 군가.', detail: '발맞춤은 효율이자 ‘심리’ — 같은 리듬으로 움직이며 두려움을 덜고 결속을 다진다.', cliche: '행군 장면에 구령·군가를 넣으면 ‘집단’의 질감이 산다 — 지친 발걸음과 노래의 대비가 특히 처연하다.' },
      { name: '“민간인”·“쫄병”·“짬타이거” 류 별칭', aka: '농담조 호칭', era: '현대', scale: '일상', role: '제대 임박자(예비 민간인), 신병(쫄병), 부대 길고양이(짬타이거) 등 정겨운 별칭.', who: '병영 구성원', voice: '거친 듯 정겨운 농담. 험한 일상을 견디는 ‘유머의 완충재’.', detail: '딱딱한 군 생활 속 농담·별명은 인간미의 숨구멍 — 전우애가 가장 잘 드러나는 결.', cliche: '전쟁 이야기에 유머·별명을 적절히 넣으면 인물이 살아난다 — 비극만 쌓으면 오히려 무뎌진다.' },
    ],
  },
]

const LS = 'sry:tool:military-org-ref:'
const ALL = '__all__'

type Flat = { cat: CatDef; item: Entry }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 항목 → 단서 묶음(필드 라벨 포함)
const FIELDS: { k: keyof Entry; label: string }[] = [
  { k: 'aka', label: '이칭·대응' },
  { k: 'era', label: '시대·문화' },
  { k: 'scale', label: '규모·구성' },
  { k: 'role', label: '역할·임무' },
  { k: 'who', label: '누가 맡나' },
  { k: 'voice', label: '말투·분위기' },
  { k: 'detail', label: '디테일·운용' },
  { k: 'cliche', label: '고증·유의' },
]

function plainText(f: Flat): string {
  const lines = [`🎖️ ${f.item.name}  (${f.cat.label})`]
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
    `<p><i>※ 전쟁·밀리터리·역사·판타지물 창작 참고 자료. 실제 군사 작전·교범이 아닙니다.</i></p>`,
  ].join('')
}

export default function MilitaryOrgRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 가 오면 검색 힌트로 활용(맥락 활용)
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

  // 수집함에 담기 — addToStash(...)
  const toStash = (f: Flat) => {
    if (!hasStash()) { flash('수집함에 연결되어 있지 않습니다.'); return }
    addToStash({ kind: 'note', label: `${f.item.name} (${f.cat.label})`, text: plainText(f) })
    flash(`수집함에 ‘${f.item.name}’ 자료를 담았습니다.`)
  }

  // 스니펫 저장(글감) — addToLibrary('snippets', ...)
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: `[군사 조직 자료] ${plainText(f)}`,
      source: '군사 조직·계급 사전 (전쟁·밀리터리·역사·판타지)',
      tags: ['군사', '군대', '전쟁', '밀리터리', f.cat.label, f.item.name],
    })
    flash(`스니펫 라이브러리에 ‘${f.item.name}’ 자료를 저장했습니다.`)
  }

  // 프로젝트 자료에 추가 — addToProject(root:research, folder:"세계관")
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '세계관',
      title: `${f.item.name} (${f.cat.label})`,
      bodyHtml: bodyHtml(f),
      meta: {
        분류: f.cat.label,
        시대: f.item.era && f.item.era !== '—' ? f.item.era : '',
        규모: f.item.scale && f.item.scale !== '—' ? f.item.scale : '',
      },
    })
    if (id) flash(`프로젝트 자료 〈세계관〉에 ‘${f.item.name}’을(를) 추가했습니다.`)
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
        <Emoji e="🎖" /> <b style={{ color: 'var(--text)' }}>창작 참고 자료</b>입니다. 전쟁·밀리터리·역사·판타지물의 군대·전투 묘사를 위한 조직·계급·작전·문화의 서사용 단서이며,
        실제 군사 작전·교범이 아닙니다. 시대·세계관에 맞춰 ‘이야기의 개연성’에 따라 각색해 쓰세요.
      </div>

      <div style={hint}>
        계급(현대·역사)·편제·지휘·병과·작전 교리·군대 생활·군 은어 등 <b>{total}개</b> 항목을 카테고리로 정리했습니다.
        검색·펼침으로 찾고, 무작위로 설정 영감을 얻고, 클릭해 복사하거나 수집함·스니펫·프로젝트 〈세계관〉으로 보내세요.
        {genreHint && genreHint !== '전쟁·밀리터리·역사·판타지' ? <>  (전달된 맥락: <b>{genreHint}</b>)</> : null}
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="계급·편제·직책·전술·은어로 검색 (예: 분대, 참모, 포위, 복명복창, 백인대장)"
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
        <button className="linkbtn" onClick={() => openToolLinked('weapons-combat-ref')}
          title="무기·전투 사전 열기 — 군대가 든 무기·전투 장면의 간격·소리·전술을 이어서 정리"
          style={{ marginLeft: 'auto' }}>
          <Emoji e="⚔️" /> 무기·전투 사전
        </button>
        <span style={hint}>{filtered.length}개 표시</span>
      </div>

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
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="💾" /> 스니펫 저장</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>
              {favs[favKey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => toStash(random)} disabled={!hasStash()}
              title={hasStash() ? '이 자료를 플로팅 수집함에 담기' : '수집함에 연결되어 있지 않습니다'}>
              <Emoji e="📎" /> 수집함
            </button>
            <button className="linkbtn" onClick={() => toProject(random)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 자료를 프로젝트 자료 〈세계관〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('weapons-combat-ref')} title="무기·전투 사전 열기"><Emoji e="⚔️" /> 무기·전투 사전</button>
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
            const preview = (item.role && item.role !== '—') ? item.role
              : (item.scale && item.scale !== '—') ? item.scale
                : (item.detail && item.detail !== '—' ? item.detail : '')
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
                {!open && preview && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {preview}
                  </div>
                )}
                {open && renderFields(item)}
                {open && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
                    <button className="minibtn" onClick={() => copy(plainText({ cat: c, item }), 'item:' + fk)}>
                      {copiedKey === 'item:' + fk ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
                    </button>
                    <button className="minibtn" onClick={() => saveSnippet({ cat: c, item })}><Emoji e="💾" /> 스니펫 저장</button>
                    <button className="linkbtn" onClick={() => toStash({ cat: c, item })} disabled={!hasStash()}
                      title={hasStash() ? '수집함에 담기' : '수집함에 연결되어 있지 않습니다'}>
                      <Emoji e="📎" /> 수집함
                    </button>
                    <button className="linkbtn" onClick={() => toProject({ cat: c, item })} disabled={!hasProjectBridge()}
                      title={hasProjectBridge() ? '프로젝트 자료 〈세계관〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                      <Emoji e="📄" /> 프로젝트에 추가
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>자료는 정답이 아니라 출발점입니다. 시대·세계관·기술 수준에 맞춰 ‘계급의 무게·명령의 흐름·군대의 공기’를 비틀어 당신만의 군대를 설계하세요. 무기·전투 장면은 〈무기·전투 사전〉과 함께 그리면 깊어집니다.</div>
    </div>
  )
}
