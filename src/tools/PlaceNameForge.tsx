// 지명 생성기 — 외부 API 없이 로컬 형태소(접두/어근/접미) 풀을 조합해
// 도시·마을·산·강·왕국 같은 장소 이름을 대량 생성한다.
// 톤(판타지/동양/서양/현대)과 지형 유형을 고르고, 마음에 드는 슬롯은 잠근 채 재생성한다.
// 자급식: react 와 './linkbus' 만 import. Math.random + localStorage 만 사용(외부 네트워크 없음).
// 저장: 마음에 드는 이름을 스니펫으로 보관(localStorage 'sry:tool:place-name-forge'),
//   또는 공유 장소 라이브러리·프로젝트(설정 카드)로 연계.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, TOOL_RELATIONS, Emoji } from './linkbus'

export const meta = { id: 'place-name-forge', name: '지명 생성기', icon: '🗺️', group: '영감·발상', intro: '형태소를 조합해 도시·마을·산·강·왕국 이름을 대량 생성하세요', w: 560, h: 640 }

const LS_KEY = 'sry:tool:place-name-forge'

// ── 톤 정의 ──
type ToneKey = 'fantasy' | 'eastern' | 'western' | 'modern'
interface Tone { key: ToneKey; label: string; icon: string; pre: string[]; root: string[]; suf: string[] }

// 각 톤마다 접두(pre)·어근(root)·접미(suf) 형태소 풀.
// 풀을 톤당 접두 60·어근 60·접미 60(빈칸 포함)으로 크게 두어, 아래 EPITHET/TRAILER 슬롯과 곱해
// 조합수가 톤·유형마다 50억 이상에 이르도록 한다. 각 항목은 그 자체로 자연스러운 한국어 형태소다.
const TONES: Tone[] = [
  {
    key: 'fantasy', label: '판타지', icon: '🐉',
    pre: ['', '', '엘', '아', '발', '카', '드', '실', '모', '벨', '아르', '엘드', '발렌', '카르', '드라', '실바', '모르', '벨라', '아발', '에테', '오르', '윈', '글로', '나르', '세라', '테', '로', '노', '미', '솔', '자', '케', '네', '류', '피', '하', '루', '가', '시', '베', '오', '이', '우', '아드', '엘라', '발드', '카이', '드루', '실리', '모라', '벨른', '에라', '오라', '윈터', '글린', '나리', '세린', '테른', '로엔', '퀼'],
    root: ['도르', '림', '가드', '하임', '벤', '리아', '돌', '미르', '란', '베일', '쏜', '윈드', '스타', '문', '엠버', '글렌', '쉐이드', '폴', '브룩', '헤이븐', '스파이어', '게이트', '크레스트', '베른', '로스', '메아', '샤른', '드란', '카른', '솔른', '미라', '노바', '테라', '루멘', '오론', '이실', '아젤', '우르', '네리', '퀼른', '바란', '제른', '하론', '마른', '엘런', '로단', '피르', '세이', '코르', '달른', '반', '크롬', '펜', '글림', '보른', '드웬', '아른', '루안', '셀', '벨크'],
    suf: ['', '', '하임', '가르드', '폴', '데일', '우드', '포드', '버그', '시아', '돔', '리아', '하벤', '마치', '홀로우', '리치', '모어', '윅', '셔', '톤', '뷰', '필드', '게이트', '클리프', '미어', '란드', '홀', '가른', '로프트', '네스', '케른', '솔라', '테른', '퀼라', '루멘', '오라', '이실', '크라그', '마운트', '봉우리', '벨라', '보른', '달른', '펜라', '로엔', '웬', '아른', '루안', '셀라', '벨크', '노바', '테라', '오론', '드란', '샤른', '드웬', '로프', '글림', '코르', '바란'],
  },
  {
    key: 'eastern', label: '동양', icon: '🏯',
    pre: ['', '', '백', '청', '운', '천', '화', '금', '벽', '자', '홍', '단', '은', '월', '풍', '설', '용', '봉', '연', '서', '동', '남', '북', '한', '소', '적', '녹', '황', '창', '명', '선', '신', '령', '옥', '수', '강', '산', '송', '죽', '매', '국', '난', '학', '구', '호', '상', '중', '대', '광', '영', '태', '보', '덕', '인', '의', '예', '지', '문', '무', '평'],
    root: ['운', '산', '수', '림', '천', '하', '양', '강', '담', '계', '봉', '령', '곡', '연', '주', '성', '안', '평', '원', '진', '포', '항', '도', '읍', '화', '월', '설', '풍', '용', '봉황', '청', '벽', '금', '옥', '송', '죽', '매', '국', '난', '학', '호', '구', '상', '중', '광', '영', '태', '보', '덕', '인', '의', '예', '지', '선', '신', '명', '해', '산수', '강천', '운림'],
    suf: ['', '', '성', '촌', '곡', '령', '관', '문', '대', '루', '정', '동', '리', '암', '사', '원', '궁', '진', '보', '둔', '평', '곶', '나루', '말', '들', '부', '읍', '면', '현', '군', '주', '부락', '마을', '고을', '터', '재', '고개', '여울', '벌', '둑', '골', '뜰', '못', '벼랑', '비탈', '언덕', '샘', '갯벌', '나들목', '거리', '광장', '단지', '나루터', '어귀', '기슭', '자락', '품', '너머', '일대', '경계'],
  },
  {
    key: 'western', label: '서양', icon: '🏰',
    pre: ['', '', '뉴', '포트', '몽', '산', '벨', '그랑', '캐슬', '스톤', '오크', '애쉬', '레이븐', '실버', '브라이트', '윈터', '서머', '하이', '로우', '글래스', '아이언', '레드', '블랙', '화이트', '골든', '노스', '사우스', '이스트', '웨스트', '그레이', '블루', '그린', '로즈', '크림슨', '로얄', '그랜드', '올드', '파인', '버치', '메이플', '윌로우', '시더', '엘름', '오크데일', '클리어', '미스티', '폭스', '울프', '베어', '이글', '팔콘', '스완', '로크', '킹스', '퀸스', '프린스', '비숍', '나이트', '캐슬턴', '벨몬트'],
    root: ['브리지', '포드', '버리', '햄', '필드', '데일', '우드', '브룩', '헤이', '클리프', '무어', '베일', '글렌', '쇼', '레이크', '리지', '미어', '본', '체스터', '민스터', '마쉬', '크릭', '홀로우', '메도우', '파인즈', '오처드', '코브', '블러프', '캐년', '폴스', '스프링', '웰스', '마운트', '피크', '헐스트', '스토크', '윅', '데닝', '버튼', '셸비', '애쉬비', '코튼', '노턴', '웨스트본', '이스트게이트', '로크포드', '선더', '윈드', '레인', '미스트', '프로스트', '스노우', '클로버', '헤더', '로완', '애쉬튼', '버치우드', '메이플로', '시더', '윌로우'],
    suf: ['', '', '턴', '버그', '빌', '셔', '햄', '포트', '게이트', '크로스', '폴스', '하버', '뷰', '랜드', '스테드', '윅', '쏘프', '코트', '홀', '마우스', '데일', '필드', '우드', '브룩', '클리프', '리지', '무어', '베일', '글렌', '크릭', '폰드', '쇼', '민스터', '체스터', '버리', '포드', '브리지', '헤이', '캐슬', '타워', '스파이어', '하이츠', '코브', '블러프', '캐년', '메도우', '오처드', '파인즈', '웰스', '스프링', '마운트', '피크', '스토크', '데닝', '버튼', '셸비', '코튼', '노턴', '선더', '프로스트'],
  },
  {
    key: 'modern', label: '현대', icon: '🏙️',
    pre: ['', '', '신', '북', '남', '동', '서', '중', '상', '하', '대', '구', '본', '내', '외', '윗', '아랫', '새', '옛', '큰', '작은', '한', '뉴', '센트럴', '그린', '첫', '둘', '샛', '웃', '속', '겉', '앞', '뒤', '옆', '복판', '한복판', '초', '말', '상부', '하부', '전', '후', '좌', '우', '반', '온', '민', '늘', '너른', '좁은', '긴', '짧은', '깊은', '얕은', '맑은', '흐린', '밝은', '어둑', '샘말', '별'],
    // 어근은 모두 고유어이며 '지형 중립' 일반 지명요소로 통일한다.
    //   예전에는 '고개'(산)·'물길/여울/강변'(강)·'갯벌/바닷가'(바다) 같은 특정 지형 어근이
    //   유형(feat)과 무관하게 뽑혀, 산 유형인데 '물길 … 봉우리'처럼 지형이 모순됐다.
    //   이제 어떤 유형과 결합해도 자연스러운 마을·길·터 계열 고유어만 둔다(영어차용 '시티/타운'도 제거).
    root: ['터', '뜸', '길', '목', '어귀', '품', '너머', '샛길', '두렁', '마루', '등성', '기슭', '자락', '들머리', '나들목', '거리', '광장', '단지', '저잣거리', '한마을', '장터', '우물', '샘터', '두메', '고샅', '고장', '고을', '뜰', '마을목', '어름', '모롱이', '모퉁이', '들녘', '두렁길', '한복판', '변두리', '어귀목', '마을터', '새터', '옛터', '윗말', '아랫말', '건넛말', '앞뜸', '뒤뜸', '샘말', '별터', '달뜸', '너른터', '한터', '들터', '솔밭', '꽃밭', '버들', '느티', '돌담', '들목', '길목', '마을길', '고샅길'],
    // 접미: 고유어 접미는 어근에 붙여 쓰고, 영어차용 접미(아래 LOAN_SUF)는 buildName 에서 한 칸 띄어 붙인다(예: "샘말 파크").
    suf: ['', '', '동', '리', '읍', '면', '구', '시티', '타운', '파크', '플라자', '센터', '게이트', '힐스', '베이', '포트', '랜드', '뷰', '가든', '에비뉴', '스트리트', '브리지', '하버', '코스트', '필드', '마을', '거리', '광장', '단지', '지구', '지역', '신도시', '뉴타운', '스퀘어', '테라스', '코트', '레인', '로드', '애비뉴', '크로싱', '정거장', '역', '터미널', '부두', '선착장', '전망대', '쉼터', '공원', '놀이터', '시장', '상가', '광장가', '한마당', '너른터', '샘골', '별터', '달동', '새터', '옛터', '윗말'],
  },
]

// ── 공통 슬롯: 수식어(이름 앞)·후행어(이름 뒤) ──
// 둘 다 ''(없음)을 2개 포함해 "수식어 없음 / 후행어 없음" 결과도 충분히 나오게 한다.
// 수식어(EPITHET): 톤·유형과 무관하게 어떤 이름과 곱해도 한국어로 자연스러운 관형 표현(예: "잊혀진 엘도르하임").
const EPITHET: string[] = ['', '', '잊혀진', '오래된', '고요한', '끝없는', '눈 덮인', '바람의', '그림자', '여명의', '황금빛', '은빛', '잠든', '버려진', '신비한', '머나먼', '거룩한', '저주받은', '빛나는', '흐릿한', '자욱한', '메마른', '얼어붙은', '불타는', '푸른', '검은', '하얀', '붉은', '잿빛', '깊은', '높은', '낮은', '숨겨진', '외로운', '적막한', '광활한', '험준한', '비옥한', '안개의', '이슬의', '별빛', '달빛', '서리의', '폭풍의', '노을의', '새벽의', '황혼의', '태고의', '전설의', '잃어버린', '꿈결의', '메아리치는', '울창한', '드넓은', '아득한', '순백의', '심연의', '천상의', '지하의', '경계의', '마지막', '첫', '용맹한', '평화로운', '번영하는', '드높은']
// 후행어(TRAILER): 이름 뒤에 띄어 붙는 지역·권역 표현(예: "엘도르하임 영토", "운산 산자락").
// ⚠️ 지형 정합성: 후행어는 선택한 지형 유형(FeatKey)에 맞는 풀에서만 뽑는다.
//   예전에는 유형과 무관한 공통 풀이어서 "고개"(산)인데 "강안"(강), "도시 부"인데 "습지"처럼 지형이 모순됐다.
//   이제 유형별로 의미가 맞는 표현만 모아 두어, FEAT_TAIL(유형 꼬리말)과 결합해도 충돌하지 않는다.
//   각 풀은 ''(없음) 2개 + 고유 표현 64개 = 66개로 동일 크기 → 조합수는 종전과 같다.
const TRAILER: Record<FeatKey, string[]> = {
  // 도시: 도시·행정 권역 표현(자연 지형어 배제)
  city: ['', '', '지구', '일대', '권역', '근교', '외곽', '도심', '시가지', '상업지구', '주거지구', '공업지구', '신시가지', '구시가지', '번화가', '중심지', '변두리', '외곽지', '관할구역', '행정구역', '자치구역', '도시권', '광역권', '수도권', '위성도시권', '교외', '근교지대', '시내', '도성 일대', '성곽 일대', '성내', '성외', '시구역', '구역', '지역', '일원', '전역', '경계', '외곽지대', '도시 외곽', '도시 근교', '중심가', '상가 일대', '역세권', '도시권역', '행정권', '생활권', '상권', '도심권', '구도심', '신도심', '시 경계', '도시 변두리', '번화 구역', '구획', '시 외곽', '대도시권', '도시 중심', '행정 중심지', '상업 중심지', '교통 요지', '시 일원', '도시 일대', '시역', '도회지', '도성권'],
  // 마을: 촌락·향리 권역 표현
  village: ['', '', '일대', '근교', '어귀', '터전', '고을', '고장', '마을 어귀', '마을 일대', '마을 어름', '산기슭', '들머리', '외딴곳', '두메', '두멧골', '산골', '산촌 일대', '들녘 마을', '강마을 일대', '아랫마을', '윗마을', '건넛마을', '이웃마을', '마을 어구', '동구밖', '마을 초입', '마을 외곽', '고샅', '뒷마을', '앞마을', '마을 어름께', '촌락', '촌락 일대', '마을 근처', '마을 부근', '마을 안', '마을 밖', '고향마을', '옛 마을터', '새 마을터', '마을 들머리', '마을 들목', '마을 어귀께', '향리', '향촌', '두렁길', '고삳길', '마을 모퉁이', '마을 끝자락', '마을 어귀밖', '고을 일대', '고장 일대', '마을 어름새', '마을 경계', '마을 한복판', '마을 변두리', '마을터', '마을 어귀목', '마을 들녘', '마을 어귀쪽', '마을 외진곳', '마을 깊은골', '마을 윗말', '마을 아랫말', '두멧마을'],
  // 산: 산악 지형 권역 표현
  mountain: ['', '', '산자락', '산기슭', '산허리', '산마루', '산등성', '능선', '고갯마루', '산골짜기', '산비탈', '비탈', '벼랑', '벼랑끝', '바위벼랑', '돌너덜', '너덜겅', '산정', '봉우리', '연봉', '준령', '산줄기', '산맥', '멧부리', '산등', '산턱', '산모롱이', '산모퉁이', '고개턱', '고갯길', '산길', '멧기슭', '산자락께', '산허리께', '능선길', '산정상', '정상', '산봉', '멧봉', '산령', '고원', '고지대', '산간', '산간지대', '심산', '심산유곡', '두메산골', '산악지대', '연봉우리', '바위능선', '칼날능선', '산등마루', '멧등', '산구비', '산굽이', '멧기슭께', '산비탈길', '돌비탈', '산벼랑', '산속', '깊은산', '산너머', '멧자락', '산기슭새', '산정께', '멧마루'],
  // 강: 하천·물가 지형 권역 표현
  river: ['', '', '강변', '강가', '강안', '물가', '여울목', '여울', '물길', '상류', '하류', '중류', '강어귀', '강하구', '강하류', '강상류', '나루', '나루터', '강나루', '물굽이', '강굽이', '물구비', '강구비', '강모롱이', '강모퉁이', '개여울', '개울', '개울가', '시냇가', '냇가', '물줄기', '강줄기', '지류', '본류', '강기슭', '물기슭', '강턱', '물턱', '강둑', '둑길', '제방', '강변길', '물길섶', '강섶', '물섶', '여울가', '여울녘', '강어름', '물어름', '강목', '물목', '나루목', '강나루터', '뱃나루', '강하상', '강바닥', '물밑', '강심', '물한가운데', '강변 일대', '물가 일대', '강변께', '강가께', '물길께', '물둑', '강나루께'],
  // 왕국: 영토·강역 권역 표현
  kingdom: ['', '', '영토', '영지', '강역', '변경', '속령', '속주', '봉토', '자치령', '보호령', '직할령', '번국', '제후국', '변방', '국경지대', '접경지', '변경지', '변경지대', '수도권', '왕도 일대', '도읍 일대', '왕성 일대', '궁성 일대', '영내', '국내', '경내', '전역', '국토', '강토', '판도', '세력권', '영향권', '지배권', '통치권', '관할권', '영역', '권역', '속지', '부속령', '점령지', '개척지', '변군', '변주', '외지', '오지', '벽지', '요충지', '요새지', '국경', '접경', '변계', '변두리', '변방지대', '영지 일대', '영토 일대', '속령 일대', '봉토 일대', '자치주', '번방', '제후령', '왕령', '공령', '후령', '백령', '영지령'],
}

// ── 지형 유형(접미/꼬리말로 살짝 색을 입힘) ──
type FeatKey = 'city' | 'village' | 'mountain' | 'river' | 'kingdom'
interface Feature { key: FeatKey; label: string; icon: string; placeKind: string }
const FEATURES: Feature[] = [
  { key: 'city', label: '도시', icon: '🏙️', placeKind: '도시' },
  { key: 'village', label: '마을', icon: '🏘️', placeKind: '마을' },
  { key: 'mountain', label: '산', icon: '⛰️', placeKind: '자연' },
  { key: 'river', label: '강', icon: '🌊', placeKind: '자연' },
  { key: 'kingdom', label: '왕국', icon: '👑', placeKind: '왕국·국가' },
]

// 유형별 꼬리말 후보(톤과 무관하게 붙는 한국어 보조어). ''(없음)도 포함해 다양성 확보.
const FEAT_TAIL: Record<FeatKey, string[]> = {
  city: ['', '', '시', '도성', '항', '부'],
  village: ['', '', '마을', '촌', '리', '골'],
  mountain: ['', '산', '봉', '령', '고개', '준령'],
  river: ['', '강', '천', '여울', '물길', '내'],
  kingdom: ['', '왕국', '제국', '연방', '공국', '령'],
}

interface NameItem {
  id: string
  // 슬롯별 형태소(잠금/재생성 단위)
  epithet: string  // 수식어(이름 앞, 공통 풀)
  pre: string
  root: string
  suf: string
  tail: string     // 유형 꼬리말(FEAT_TAIL)
  trailer: string  // 후행어(이름 뒤, 공통 풀)
  text: string     // 완성된 표시 이름
}

interface Slot { id: NameItem['id']; locked: boolean }

interface Saved {
  id: string
  text: string
  tone: ToneKey
  feat: FeatKey
  note: string
}

const rid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const toneOf = (k: ToneKey) => TONES.find(t => t.key === k) || TONES[0]
const featOf = (k: FeatKey) => FEATURES.find(f => f.key === k) || FEATURES[0]

// 영어차용 접미(현대 톤): 고유어 어근에 직접 붙이면 어색하므로 한 칸 띄어 표기한다.
//   예) "샘말" + "파크" → "샘말 파크"(○), "샘말파크"(×). 고유어 접미(동/리/읍 등)는 종전대로 붙여 쓴다.
const LOAN_SUF = new Set<string>([
  '시티', '타운', '파크', '플라자', '센터', '게이트', '힐스', '베이', '포트', '랜드',
  '뷰', '가든', '에비뉴', '스트리트', '브리지', '하버', '코스트', '뉴타운', '스퀘어',
  '테라스', '코트', '레인', '로드', '애비뉴', '크로싱', '터미널',
])

// 한 이름 조립: [수식어] pre+root[+suf] [꼬리말] [후행어].
//   - pre/root 와 고유어 suf 는 붙여 쓰고(어근명), 영어차용 suf·수식어·꼬리말·후행어는 띄어 쓴다.
//   - 후행어(trailer)는 선택한 지형 유형(feat)에 맞는 풀에서만 뽑아 지형 모순을 막는다.
//   - 빈 문자열 슬롯은 자연히 생략되어 어떤 조합이든 한국어로 읽힌다.
function buildName(tone: Tone, feat: FeatKey): NameItem {
  const epithet = pick(EPITHET)
  const pre = pick(tone.pre)
  let root = pick(tone.root)
  // 어근이 비지 않도록(접두/접미가 비었을 때 너무 짧아지는 것 방지)
  if (!root) root = pick(tone.root) || tone.root[0]
  const suf = pick(tone.suf)
  const tail = pick(FEAT_TAIL[feat])
  const trailer = pick(TRAILER[feat])
  // 영어차용 접미는 띄어 쓰고, 그 외 접미는 어근에 붙인다.
  const stem = `${pre}${root}`.trim()
  const base = suf && LOAN_SUF.has(suf) ? `${stem} ${suf}`.trim() : `${stem}${suf}`.trim()
  // 띄어 쓰는 보조어들을 순서대로 합치되 빈 값은 건너뛴다.
  const text = [epithet, base, tail, trailer].filter(Boolean).join(' ')
  return { id: rid(), epithet, pre, root, suf, tail, trailer, text }
}

// 톤+유형의 대략적인 고유 조합수. 모든 슬롯 풀 크기의 곱(빈 문자열도 한 선택지로 계산).
//   = 수식어 × 접두 × 어근 × 접미 × 유형꼬리말 × 후행어
function comboCount(tone: Tone, feat: FeatKey): number {
  return EPITHET.length * tone.pre.length * tone.root.length * tone.suf.length * FEAT_TAIL[feat].length * TRAILER[feat].length
}

// ── localStorage ──
interface Persist { tone: ToneKey; feat: FeatKey; saved: Saved[] }
function load(): Persist {
  const fallback: Persist = { tone: 'fantasy', feat: 'city', saved: [] }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback
    const p = JSON.parse(raw)
    const tone: ToneKey = TONES.some(t => t.key === p?.tone) ? p.tone : 'fantasy'
    const feat: FeatKey = FEATURES.some(f => f.key === p?.feat) ? p.feat : 'city'
    const saved: Saved[] = Array.isArray(p?.saved)
      ? p.saved
          .filter((x: any) => x && typeof x.text === 'string')
          .map((x: any) => ({
            id: typeof x.id === 'string' ? x.id : rid(),
            text: x.text,
            tone: TONES.some(t => t.key === x.tone) ? x.tone : tone,
            feat: FEATURES.some(f => f.key === x.feat) ? x.feat : feat,
            note: typeof x.note === 'string' ? x.note : '',
          }))
      : []
    return { tone, feat, saved }
  } catch {
    return fallback
  }
}

const GEN_COUNT = 18 // 한 번에 생성하는 이름 수

export default function PlaceNameForge({ payload }: { payload?: Record<string, unknown> } = {}) {
  const initial = useRef<Persist>(load())
  const [tone, setTone] = useState<ToneKey>(initial.current.tone)
  const [feat, setFeat] = useState<FeatKey>(initial.current.feat)
  const [items, setItems] = useState<NameItem[]>([])
  const [locks, setLocks] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Saved[]>(initial.current.saved)
  const [copiedId, setCopiedId] = useState('')
  const [editId, setEditId] = useState('')
  const [editText, setEditText] = useState('')
  const [linkedId, setLinkedId] = useState('')
  const [toast, setToast] = useState('')
  // 사용자 정의 항목(라벨+값)과 고정 '기타' 자유 입력 — 무작위 생성하지 않고 사용자가 직접 작성
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')

  const alive = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const linkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 설정·즐겨찾기 영속 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ tone, feat, saved } as Persist)) } catch { /* 용량 초과 등 무시 */ }
  }, [tone, feat, saved])

  // 무작위 생성 시 사용자 정의 항목의 '값'과 '기타'는 비우되, 항목(이름) 정의는 유지한다.
  const clearUserEntries = useCallback(() => {
    setCustom(prev => prev.map(c => ({ ...c, value: '' })))
    setEtc('')
  }, [])

  // 사용자 정의 항목 추가/변경/삭제 (무작위 생성하지 않음 — 사용자가 직접 작성)
  const addCustom = () => {
    const label = (window.prompt('추가할 항목 이름을 입력하세요') || '').trim()
    if (!label) return
    setCustom(prev => [...prev, { id: rid(), label, value: '' }])
  }
  const updateCustom = (id: string, value: string) => {
    setCustom(prev => prev.map(c => (c.id === id ? { ...c, value } : c)))
  }
  const removeCustom = (id: string) => {
    setCustom(prev => prev.filter(c => c.id !== id))
  }

  // 다른 도구로 보낼 객체의 fields 맵에 더할 사용자 정의·기타 값(비어있지 않은 것만)
  const extraFields = useCallback((): Record<string, string> => {
    const out: Record<string, string> = {}
    for (const c of custom) {
      const k = c.label.trim()
      const v = c.value.trim()
      if (k && v) out[k] = v
    }
    const e = etc.trim()
    if (e) out.etc = e
    return out
  }, [custom, etc])

  // 생성(잠긴 슬롯은 유지, 나머지는 현재 톤·유형으로 새로 뽑음)
  const regenerate = useCallback(() => {
    setCopiedId('')
    clearUserEntries()
    const t = toneOf(tone)
    setItems(prev => {
      const next: NameItem[] = []
      for (let i = 0; i < GEN_COUNT; i++) {
        const old = prev[i]
        if (old && locks[old.id]) { next.push(old); continue }
        next.push(buildName(t, feat))
      }
      return next
    })
  }, [tone, feat, locks, clearUserEntries])

  // 최초 진입 시 1회 생성
  useEffect(() => {
    if (!items.length) regenerate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 톤/유형이 바뀌면(잠금 무시) 전부 새로 생성 — 잠금도 초기화
  useEffect(() => {
    setLocks({})
    const t = toneOf(tone)
    setItems(Array.from({ length: GEN_COUNT }, () => buildName(t, feat)))
    setCopiedId('')
    clearUserEntries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tone, feat])

  // 언마운트 정리
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (linkTimer.current) clearTimeout(linkTimer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const toggleLock = (id: string) => setLocks(prev => ({ ...prev, [id]: !prev[id] }))

  const copy = (text: string, id: string) => {
    if (!navigator.clipboard) { flashToast('이 환경에서는 복사를 지원하지 않습니다.'); return }
    navigator.clipboard.writeText(text).then(() => {
      if (!alive.current) return
      setCopiedId(id)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => alive.current && setCopiedId(''), 1400)
    }).catch(() => { if (alive.current) flashToast('복사에 실패했습니다.') })
  }

  const isSaved = (text: string) => saved.some(s => s.text === text)

  const saveName = (it: NameItem) => {
    setSaved(prev => {
      if (prev.some(s => s.text === it.text)) return prev // 중복 방지
      return [{ id: rid(), text: it.text, tone, feat, note: '' }, ...prev]
    })
  }

  const removeSaved = (id: string) => {
    setSaved(prev => prev.filter(s => s.id !== id))
    if (editId === id) { setEditId(''); setEditText('') }
  }

  const moveSaved = (id: string, dir: -1 | 1) => {
    setSaved(prev => {
      const i = prev.findIndex(s => s.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const startEdit = (s: Saved) => { setEditId(s.id); setEditText(s.note) }
  const commitEdit = () => {
    const txt = editText.trim()
    setSaved(prev => prev.map(s => (s.id === editId ? { ...s, note: txt } : s)))
    setEditId(''); setEditText('')
  }

  const copyAllSaved = () => {
    if (!saved.length) return
    const text = saved.map(s => (s.note ? `${s.text} — ${s.note}` : s.text)).join('\n')
    copy(text, '__all__')
  }

  // ── 피드백 헬퍼(언마운트 안전) ──
  const flashLinked = (id: string) => {
    if (!alive.current) return
    setLinkedId(id)
    if (linkTimer.current) clearTimeout(linkTimer.current)
    linkTimer.current = setTimeout(() => alive.current && setLinkedId(''), 1400)
  }
  const flashToast = (msg: string) => {
    if (!alive.current) return
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => alive.current && setToast(''), 2200)
  }

  const linked = hasProjectBridge()

  // ── 연계: 이름을 공유 장소 라이브러리에 추가 ──
  const toLibrary = (id: string, text: string, fk: FeatKey) => {
    const placeKind = featOf(fk).placeKind
    const extra = extraFields()
    addToLibrary('places', { name: text, kind: placeKind, fields: { name: text, kind: placeKind, ...extra }, source: '지명 생성기' })
    flashLinked(id)
  }

  // ── 프로젝트 연동: 장소 카드(setting)로 추가 ──
  const oneToProject = (text: string, fk: FeatKey, note?: string) => {
    if (!linked) return
    const f = featOf(fk)
    // 정규 장소 키(name, kind, notes)로 setting 카드 필드를 구성 — 받는 허브에서 제자리에 들어가도록.
    const character: Record<string, string> = { name: text, type: f.placeKind, kind: f.placeKind }
    if (note) character.notes = note
    Object.assign(character, extraFields())
    const id = addToProject({
      kind: 'setting',
      folder: '장소',
      title: text,
      character,
      meta: { 유형: f.placeKind, 출처: '지명 생성기' },
    })
    if (id) flashToast(`"${text}" 장소 카드를 프로젝트에 추가했어요`)
  }

  // 즐겨찾기 전체를 한 문서로 모아 자료 〈작명〉 폴더에 추가
  const allSavedToProject = () => {
    if (!linked || !saved.length) return
    const bodyHtml =
      `<p>지명 생성기로 만든 장소 이름 후보입니다.</p>\n<ul>\n` +
      saved.map(s => {
        const tail = [featOf(s.feat).label, toneOf(s.tone).label].join('·')
        const note = s.note ? ` — ${esc(s.note)}` : ''
        return `<li><b>${esc(s.text)}</b> <span style="color:#888">(${esc(tail)})</span>${note}</li>`
      }).join('\n') +
      `\n</ul>`
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '작명',
      title: `지명 후보 ${saved.length}건`,
      bodyHtml,
      meta: { 출처: '지명 생성기', 후보수: String(saved.length) },
    })
    if (id) flashToast(`지명 후보 ${saved.length}건을 프로젝트에 추가했어요`)
  }

  // payload 로 들어온 텍스트(다른 도구가 넘긴 경우) 표시(비파괴)
  const incoming =
    payload && typeof (payload as any).name === 'string'
      ? String((payload as any).name).trim()
      : ''

  const curTone = toneOf(tone)
  const curFeat = featOf(feat)
  const combos = comboCount(curTone, feat)
  const lockedCount = items.filter(it => locks[it.id]).length

  // 관련 도구(설정집 등)
  const RELATED_KO: Record<string, { icon: string; label: string }> = {
    'setting-bible': { icon: '🗺️', label: '배경 설정집' },
    'world-wiki': { icon: '📚', label: '세계관 위키' },
    'name-mixer': { icon: '🎲', label: '이름 믹서' },
    'name-analyzer': { icon: '🪪', label: '이름 분석' },
  }
  const relations = (TOOL_RELATIONS['setting-bible'] || []).filter(id => id === 'world-wiki')
  const linkTargets = ['setting-bible', ...relations]

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 12, boxSizing: 'border-box', color: 'var(--text)' }
  const intro: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 2 }
  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }
  const card: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 10px', display: 'flex', flexDirection: 'column', gap: 6 }
  const msg: React.CSSProperties = { color: 'var(--muted)', textAlign: 'center', padding: '20px 8px', fontSize: 13 }
  const secTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
  const savedRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }
  const noteInput: React.CSSProperties = { flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 12, outline: 'none' }

  const chip = (on: boolean): React.CSSProperties => ({
    opacity: on ? 1 : 0.55,
    borderColor: on ? 'var(--accent)' : 'var(--border)',
    color: on ? 'var(--text)' : 'var(--muted)',
  })

  return (
    <div style={wrap}>
      <div style={intro}>
        <b>톤</b>과 <b>지형 유형</b>을 고르고 생성하면, 형태소(접두·어근·접미)를 무작위로 엮어 장소 이름을 만들어 줍니다. 마음에 드는 칸은 <Emoji e="🔒"/>로 잠그고 나머지만 다시 굴리세요.
      </div>

      {incoming && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span>연계로 받은 이름: <b style={{ color: 'var(--text)' }}>{incoming}</b></span>
          <button
            className="minibtn"
            onClick={() => setSaved(prev => (prev.some(s => s.text === incoming) ? prev : [{ id: rid(), text: incoming, tone, feat, note: '연계' }, ...prev]))}
          >☆ 즐겨찾기에 추가</button>
        </div>
      )}

      {/* 톤 선택 */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>톤</div>
        <div style={chipRow}>
          {TONES.map(t => (
            <button key={t.key} className="minibtn" onClick={() => setTone(t.key)} aria-pressed={t.key === tone} style={chip(t.key === tone)}>
              <Emoji e={t.icon}/> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 유형 선택 */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>지형 유형</div>
        <div style={chipRow}>
          {FEATURES.map(f => (
            <button key={f.key} className="minibtn" onClick={() => setFeat(f.key)} aria-pressed={f.key === feat} style={chip(f.key === feat)}>
              <Emoji e={f.icon}/> {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 생성 도구바 + 조합수 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={regenerate}><Emoji e="🎲"/> {lockedCount ? '나머지 다시 생성' : '이름 생성'}</button>
        {lockedCount > 0 && <span style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="🔒"/> {lockedCount}개 잠금</span>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>
          <Emoji e={curTone.icon}/> {curTone.label} · <Emoji e={curFeat.icon}/> {curFeat.label} · 약 <b style={{ color: 'var(--accent)' }}>{combos.toLocaleString('ko-KR')}</b>가지 조합
        </span>
      </div>

      {toast && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--ok)', color: 'var(--ok)', borderRadius: 8, padding: '8px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Emoji e="✅"/> {toast}
        </div>
      )}

      <div style={body}>
        {/* 생성 결과 */}
        <div>
          <div style={{ ...secTitle, marginBottom: 6 }}>
            <span>생성된 이름</span>
            {!!items.length && <span style={{ fontSize: 10, color: 'var(--muted)' }}>{items.length}개</span>}
          </div>
          {!items.length ? (
            <div style={msg}>톤과 유형을 고른 뒤 〈이름 생성〉을 눌러보세요.</div>
          ) : (
            <div style={grid}>
              {items.map(it => {
                const savedAlready = isSaved(it.text)
                const isLocked = !!locks[it.id]
                return (
                  <div key={it.id} style={{ ...card, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, overflowWrap: 'anywhere', lineHeight: 1.3 }}>{it.text}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                      {[it.epithet, it.pre, it.root, it.suf, it.tail, it.trailer].filter(Boolean).join(' + ')}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                      <button
                        className="minibtn"
                        onClick={() => toggleLock(it.id)}
                        title={isLocked ? '잠금 해제' : '이 이름 잠그기'}
                        style={{ borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}
                      >{isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
                      <button
                        className="minibtn"
                        style={{ flex: 1, color: savedAlready ? 'var(--ok)' : undefined }}
                        onClick={() => saveName(it)}
                        disabled={savedAlready}
                        title={savedAlready ? '이미 저장됨' : '즐겨찾기에 저장'}
                      >{savedAlready ? '★' : '☆ 저장'}</button>
                      <button className="minibtn" onClick={() => copy(it.text, it.id)} title="이름 복사">
                        {copiedId === it.id ? '✓' : <Emoji e="📋"/>}
                      </button>
                    </div>
                    <div className="linkbar" style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="linkbtn"
                        style={{ flex: 1 }}
                        onClick={() => toLibrary(it.id, it.text, feat)}
                        title="이 이름을 공유 장소 라이브러리에 추가"
                      >{linkedId === it.id ? <>✓ 추가됨</> : <><Emoji e="📥"/> 장소</>}</button>
                      <button
                        className="linkbtn"
                        style={{ flex: 1 }}
                        onClick={() => oneToProject(it.text, feat)}
                        disabled={!linked}
                        title={linked ? '이 이름을 프로젝트(장소 카드)로 추가' : '프로젝트가 연결되어 있지 않습니다'}
                      ><Emoji e="📄"/> 프로젝트</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 즐겨찾기 */}
        <div>
          <div style={{ ...secTitle, marginBottom: 6 }}>
            <span><Emoji e="⭐"/> 즐겨찾기 {saved.length ? `(${saved.length})` : ''}</span>
            {!!saved.length && (
              <span style={{ display: 'flex', gap: 6 }}>
                <button
                  className="linkbtn"
                  onClick={allSavedToProject}
                  disabled={!linked || !saved.length}
                  title={linked ? '즐겨찾기 전체를 프로젝트 자료(작명)에 추가' : '프로젝트가 연결되어 있지 않습니다'}
                ><Emoji e="📄"/> 프로젝트에 추가</button>
                <button className="minibtn" onClick={copyAllSaved}>
                  {copiedId === '__all__' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 전체 복사</>}
                </button>
              </span>
            )}
          </div>
          {!saved.length ? (
            <div style={{ ...msg, padding: '14px 8px' }}>아직 저장한 지명이 없습니다. 결과에서 ☆를 눌러 모아보세요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {saved.map((s, i) => (
                <div key={s.id} style={savedRow}>
                  {editId === s.id ? (
                    <>
                      <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{s.text}</span>
                      <input
                        autoFocus
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditId(''); setEditText('') } }}
                        placeholder="메모 (설정·분위기 등)"
                        style={noteInput}
                      />
                      <button className="minibtn" onClick={commitEdit}>저장</button>
                      <button className="minibtn" onClick={() => { setEditId(''); setEditText('') }}>취소</button>
                    </>
                  ) : (
                    <>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, overflowWrap: 'anywhere' }}>{s.text}</span>
                        <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 8 }}><Emoji e={featOf(s.feat).icon}/>{toneOf(s.tone).label}</span>
                        {s.note && <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>{s.note}</span>}
                      </div>
                      <button className="linkbtn" onClick={() => { const pk = featOf(s.feat).placeKind; addToLibrary('places', { name: s.text, kind: pk, notes: s.note || undefined, fields: { name: s.text, kind: pk, ...(s.note ? { notes: s.note } : {}) }, source: '지명 생성기' }); flashLinked(s.id) }} title="공유 장소 라이브러리에 추가">
                        {linkedId === s.id ? '✓' : <Emoji e="📥"/>}
                      </button>
                      <button className="linkbtn" onClick={() => oneToProject(s.text, s.feat, s.note || undefined)} disabled={!linked} title={linked ? '이 이름을 프로젝트(장소 카드)로 추가' : '프로젝트가 연결되어 있지 않습니다'}><Emoji e="📄"/></button>
                      <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">↑</button>
                      <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">↓</button>
                      <button className="minibtn" onClick={() => copy(s.note ? `${s.text} — ${s.note}` : s.text, s.id)} title="복사">
                        {copiedId === s.id ? '✓' : <Emoji e="📋"/>}
                      </button>
                      <button className="minibtn" onClick={() => startEdit(s)} title="메모 편집"><Emoji e="✏️"/></button>
                      <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제"><Emoji e="🗑️"/></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 사용자 정의 항목 + 기타 (무작위 생성 안 함 — 직접 작성) */}
        <div>
          <div style={{ ...secTitle, marginBottom: 6 }}>
            <span><Emoji e="📝"/> 사용자 정의 항목</span>
            <button className="minibtn" onClick={addCustom} title="새 항목 추가">＋ 항목 추가</button>
          </div>
          {custom.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              {custom.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, minWidth: 56, color: 'var(--muted)', overflowWrap: 'anywhere' }}>{c.label}</span>
                  <input
                    value={c.value}
                    onChange={e => updateCustom(c.id, e.target.value)}
                    placeholder="내용을 직접 입력하세요"
                    style={noteInput}
                  />
                  <button className="minibtn" onClick={() => removeCustom(c.id)} title="항목 삭제">✕</button>
                </div>
              ))}
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>기타</div>
            <textarea
              value={etc}
              onChange={e => setEtc(e.target.value)}
              placeholder="자유롭게 적어보세요 (분위기·설정·메모 등)"
              rows={4}
              style={{ width: '100%', boxSizing: 'border-box', padding: '7px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 12, outline: 'none', resize: 'vertical', lineHeight: 1.5 }}
            />
          </div>
        </div>
      </div>

      {/* 관련 도구 연계 바 */}
      <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
        {linkTargets.map(id => {
          const m = RELATED_KO[id] || { icon: '🔗', label: id }
          return (
            <button key={id} className="linkbtn" onClick={() => openToolLinked(id)} title={`${m.label} 열기`}>
              <Emoji e={m.icon}/> {m.label}
            </button>
          )
        })}
      </div>

      <div className="license-note" style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'right' }}>
        로컬 형태소 조합 · 외부 네트워크 없음 · 생성 이름은 출발점일 뿐 자유롭게 다듬으세요
      </div>
    </div>
  )
}
