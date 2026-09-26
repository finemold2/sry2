// 시대·세대별 속어·유행어 사전 — 7080(1970~80년대)·9020(1990~2000년대)·현대(2010~) 세 연대에 걸쳐
// 청춘·학생·직장·시장 등 집단별 은어·유행어·축약어를 뜻·예문과 함께 모은 로컬 대량 사전.
// 시대 고증과 인물 말투 설정에 바로 쓰도록 연계 버튼(수집함/스니펫/프로젝트/관련 도구)을 붙였다.
// 자급식: 외부 네트워크·미디어·라이브러리 없음. react + './linkbus' 만 import.
// 모든 어휘·뜻·예문은 직접 작성한 자작 데이터(백과 베끼기 금지). 제어문자·특수문자 없음(일반 문자만).
// 비속어는 순화 표기(원형 대신 완곡어로 풀이). 욕설 원형은 싣지 않음.
// localStorage(연대·집단·종류·즐겨찾기·펼침) 영속, Math.random 무작위, 클립보드 복사, 언마운트 타이머 정리.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToStash, addToLibrary, addToProject, hasProjectBridge, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'slang-era-ref', name: '시대별 속어·유행어 사전', icon: '🕰️', group: '언어·어휘', intro: '7080·9020·현대 세 연대의 집단별 은어·유행어·축약어를 뜻·예문과 함께 — 시대 고증과 인물 말투에 바로 쓰세요', w: 680, h: 680 }

// ---------- 데이터 모델 ----------
type Kind = 'slang' | 'buzz' | 'abbr'   // 은어 / 유행어 / 축약어
interface Entry {
  term: string       // 표제어(속어·유행어·축약어)
  mean: string       // 뜻(표준어 풀이)
  ex: string         // 예문(그 시대 말투)
  group: string      // 쓰던 집단(청춘/학생/직장/시장/통신 등)
  soft?: boolean     // 비속어 순화 표기 항목(주의 배지)
}
interface EraDef {
  key: string
  label: string      // 연대 이름
  range: string      // 대략적 시기
  icon: string
  notes: string[]    // 그 시대 말투·세태 특징(여러 줄)
  entries: Entry[]
}

// ---------- 자작 시대별 속어·유행어 사전 ----------
const ERAS: EraDef[] = [
  {
    key: '7080', label: '7080', range: '1970~1980년대', icon: '📻',
    notes: [
      '통기타·다방·교련의 시대 — 한자어 섞인 점잖은 어휘와 군대식 표현이 일상에 스몄다.',
      '"~씨" "~군" 호칭과 편지·연애편지 문화가 살아 있어 글말투가 정중하고 길었다.',
      '영어 차용은 일본식 발음(빵꾸·다스 등)을 거쳐 들어온 것이 많았다.',
      '대학가·재수생·시장 상인 등 집단마다 은어가 또렷이 갈렸다.',
    ],
    entries: [
      { term: '미팅', mean: '남녀 학생이 짝지어 만나는 단체 소개팅', ex: '"이번 주말에 미팅 나가는데 너도 올래?"', group: '대학·청춘' },
      { term: '부킹', mean: '낯선 이성과 자리를 합석시켜 주는 일', ex: '"오늘 그 다방, 부킹 잘된다 카더라."', group: '대학·청춘' },
      { term: '간지', mean: '멋·분위기가 난다는 느낌', ex: '"저 형 나팔바지 입은 거 간지 죽인다."', group: '대학·청춘' },
      { term: '쌔비다', mean: '몰래 가져가다, 슬쩍하다(가벼운 도둑질의 순화 표현)', ex: '"누가 내 도시락 반찬 또 쌔벼 갔어."', group: '학생', soft: true },
      { term: '땡땡이', mean: '수업·근무를 몰래 빠지는 일', ex: '"오후 수업 땡땡이치고 빵집 가자."', group: '학생' },
      { term: '왕따', mean: '무리에서 따돌림당하는 일(당대엔 "따" 정도로 통함)', ex: '"괜히 튀면 따 당한다, 조용히 있어."', group: '학생' },
      { term: '범생이', mean: '공부만 하는 모범생을 놀리는 말', ex: '"저 범생이는 쉬는 시간에도 책만 본다."', group: '학생' },
      { term: '날라리', mean: '공부 안 하고 놀러 다니는 사람', ex: '"머리 기르고 다니더니 완전 날라리 됐네."', group: '학생' },
      { term: '쨔샤', mean: '"이 자식아"를 부드럽게 부르는 친근한 호칭', ex: '"쨔샤, 오랜만이다! 잘 지냈냐."', group: '청춘', soft: true },
      { term: '뽀록나다', mean: '숨긴 일이 드러나다, 들통나다', ex: '"숙제 안 한 거 결국 뽀록났어."', group: '학생' },
      { term: '쫑나다', mean: '끝나다, 파토나다', ex: '"그 둘 사귀던 거 쫑났대."', group: '청춘' },
      { term: '삥땅', mean: '거스름돈·돈을 몰래 빼돌리는 일(부정의 순화 표현)', ex: '"심부름값에서 삥땅 치지 마라."', group: '시장·일상', soft: true },
      { term: '쇼부', mean: '담판·흥정으로 끝장을 보는 일', ex: '"값은 내가 가서 쇼부 보고 올게."', group: '시장' },
      { term: '뗑깡', mean: '억지로 떼쓰는 짓(어린아이의 생떼)', ex: '"애가 장난감 사 달라고 뗑깡 부린다."', group: '일상', soft: true },
      { term: '나와바리', mean: '구역, 세력권', ex: '"여긴 우리 나와바리니까 얼씬 마라."', group: '거리', soft: true },
      { term: '깔치', mean: '여자친구를 이르던 거친 은어', ex: '"저 형 요즘 깔치 생겼다더라."', group: '거리', soft: true },
      { term: '쌩까다', mean: '모른 척 무시하다, 외면하다', ex: '"인사했는데 나를 쌩까더라."', group: '청춘' },
      { term: '농띠', mean: '게으름, 일을 슬슬 피하는 짓', ex: '"농띠 그만 부리고 어서 일해."', group: '직장·일상' },
      { term: '뺀질이', mean: '요령 피우며 책임을 피하는 사람', ex: '"저 뺀질이는 힘든 일만 쏙쏙 빠진다."', group: '직장' },
      { term: '꼰대', mean: '잔소리 많고 권위적인 어른·선생', ex: '"우리 담임 완전 꼰대야, 말이 안 통해."', group: '학생' },
      { term: '쩐', mean: '돈을 이르는 은어', ex: '"이번 달은 쩐이 다 떨어졌다."', group: '거리' },
      { term: '데모', mean: '시위, 집회', ex: '"오늘 학교 앞에 데모 있어서 길 막혔어."', group: '대학' },
      { term: '아싸리', mean: '차라리, 아예', ex: '"이럴 거면 아싸리 다 그만두자."', group: '청춘', soft: true },
      { term: '빵꾸', mean: '구멍·펑크(타이어나 일이 어긋남)', ex: '"약속에 빵꾸 내지 말고 꼭 나와라."', group: '일상' },
      { term: '쪼다', mean: '어수룩하고 변변치 못한 사람을 놀리는 말', ex: '"그런 것도 못하면 쪼다 소리 듣는다."', group: '청춘', soft: true },
      { term: '삐끼', mean: '손님을 끌어들이는 호객꾼', ex: '"극장 앞 삐끼가 자꾸 붙잡더라."', group: '거리', soft: true },
      { term: '오바이트', mean: '술이 과해 토함(영어 over+eat의 콩글리시)', ex: '"어제 과음해서 오바이트했어."', group: '청춘' },
      { term: '잠바', mean: '점퍼, 겉옷', ex: '"날 추우니 잠바 챙겨 입어라."', group: '일상' },
      { term: '쌍팔년도', mean: '아주 오래되고 촌스러운 것을 비꼬는 말', ex: '"그 노래는 무슨 쌍팔년도 감성이냐."', group: '청춘' },
      { term: '추리닝', mean: '운동복(트레이닝복의 변형)', ex: '"동네 슈퍼는 추리닝 입고 가도 돼."', group: '일상' },
    ],
  },
  {
    key: '9020', label: '9020', range: '1990~2000년대', icon: '💾',
    notes: [
      'X세대·서태지·PC통신과 초기 인터넷의 시대 — 통신체(외계어)와 이모티콘이 폭발했다.',
      '하이텔·천리안 채팅, 이후 싸이월드·버디버디로 또래 은어가 빠르게 번졌다.',
      '"즐" "방가" 같은 통신 축약어와 ㅋㅋ·ㅎㅎ 자음 표기가 자리잡았다.',
      '오렌지족·야타족 등 소비 세태를 비꼬는 신조어가 쏟아졌다.',
    ],
    entries: [
      { term: '방가방가', mean: '반갑다는 통신체 인사', ex: '"오랜만에 접속! 방가방가~"', group: '통신' },
      { term: '하이루', mean: '안녕(Hi의 통신체 변형) 인사', ex: '"하이루, 오늘도 채팅방 왔네."', group: '통신' },
      { term: '즐', mean: '비웃으며 상대를 물리치는 통신 은어(꺼지라는 뜻의 순화)', ex: '"또 광고냐? 즐~"', group: '통신', soft: true },
      { term: '셤', mean: '시험의 통신 축약', ex: '"낼 셤인데 공부 1도 안 했어."', group: '학생' },
      { term: '안습', mean: '안구에 습기 — 안타깝고 눈물 난다는 신조어', ex: '"또 떨어졌다니 진짜 안습이다."', group: '통신' },
      { term: '엽기', mean: '기괴하고 황당해서 웃긴 것', ex: '"이 짤방 완전 엽기네 ㅋㅋ"', group: '통신' },
      { term: '짱', mean: '최고, 으뜸', ex: '"이 떡볶이 집 진짜 짱이야!"', group: '학생' },
      { term: '왕', mean: '아주, 매우(강조 접두)', ex: '"오늘 시험 왕 어려웠어."', group: '학생' },
      { term: '캡', mean: '최고·끝내준다는 감탄(capital에서 옴)', ex: '"새로 산 그 운동화 캡이다!"', group: '청춘' },
      { term: '강추', mean: '강력 추천', ex: '"이 영화 진짜 강추야, 꼭 봐."', group: '통신' },
      { term: '비추', mean: '추천하지 않음', ex: '"그 식당은 비추, 가지 마."', group: '통신' },
      { term: '글쿠나', mean: '그렇구나의 통신체', ex: '"아 글쿠나, 이제 이해됐어."', group: '통신' },
      { term: '설', mean: '근거 없는 소문·추측(說의 줄임)', ex: '"둘이 사귄다는 설이 돌더라."', group: '통신' },
      { term: '득템', mean: '좋은 물건을 운 좋게 얻음(게임 아이템에서 옴)', ex: '"중고로 새것 같은 거 득템했어!"', group: '통신' },
      { term: '잠수', mean: '연락을 끊고 사라지는 일', ex: '"걔 요즘 잠수 타서 연락이 안 돼."', group: '통신' },
      { term: '폭탄', mean: '미팅에서 짝으로 만난 마음에 안 드는 상대(외모 비하의 순화 표현)', ex: '"이번 미팅은 다들 폭탄이었대."', group: '청춘', soft: true },
      { term: '킹카', mean: '인기 많은 잘생긴 남자', ex: '"우리 과 킹카가 누군지 알아?"', group: '대학' },
      { term: '퀸카', mean: '인기 많은 예쁜 여자', ex: '"옆 반 퀸카가 전학 왔대."', group: '대학' },
      { term: '엑박', mean: '깨진 사진(엑스박스 모양 깨진 이미지)', ex: '"네 미니홈피 사진 다 엑박 떴어."', group: '통신' },
      { term: '도촬', mean: '몰래 찍는 사진(사생활 침해, 하면 안 되는 행위)', ex: '"도촬은 범죄야, 절대 하지 마."', group: '통신', soft: true },
      { term: '훈남', mean: '훈훈하게 잘생기고 다정해 보이는 남자', ex: '"새로 온 알바생 완전 훈남이야."', group: '청춘' },
      { term: '얼짱', mean: '얼굴이 최고로 예쁜/잘생긴 사람', ex: '"인터넷 얼짱으로 떠서 유명해졌대."', group: '통신' },
      { term: '몸짱', mean: '몸매가 좋은 사람', ex: '"운동 열심히 하더니 몸짱 됐네."', group: '통신' },
      { term: '쌩얼', mean: '화장 안 한 맨얼굴', ex: '"오늘 쌩얼인데 사진 찍지 마."', group: '청춘' },
      { term: '버카충', mean: '버스카드 충전', ex: '"학교 가기 전에 버카충부터 해야 해."', group: '학생' },
      { term: '컴맹', mean: '컴퓨터를 잘 다루지 못하는 사람', ex: '"우리 아빠는 완전 컴맹이라 내가 다 해드려."', group: '일상' },
      { term: '디카', mean: '디지털 카메라', ex: '"디카 새로 사서 막 찍고 다녀."', group: '일상' },
      { term: '번개', mean: '갑자기 즉석으로 모이는 만남', ex: '"오늘 저녁 번개인데 나올 사람?"', group: '통신' },
      { term: '정모', mean: '동호회·카페의 정기 모임', ex: '"이번 정모는 홍대에서 한대."', group: '통신' },
      { term: '품절남', mean: '결혼해서 더는 사귈 수 없는 남자', ex: '"그 오빠 다음 달 결혼이래, 이제 품절남."', group: '청춘' },
      { term: '왕따', mean: '집단에서 심하게 따돌림당하는 일(이 시기 굳어진 말)', ex: '"왕따는 절대 못 본 척하면 안 돼."', group: '학생' },
      { term: '담탱', mean: '담임 선생님을 이르는 학생 은어', ex: '"담탱한테 또 혼났어."', group: '학생' },
    ],
  },
  {
    key: 'modern', label: '현대', range: '2010년대~', icon: '📱',
    notes: [
      '스마트폰·SNS·유튜브의 시대 — 줄임말과 밈이 실시간으로 생겨나고 사라진다.',
      '초성체(ㄱㄱ·ㅇㅈ)와 영어·한국어 합성 줄임이 자연스레 섞인다.',
      '커뮤니티·게임·아이돌 팬덤마다 전용 은어가 빠르게 번진다.',
      '세대 차이를 드러내는 신조어가 잦아 인물의 나이대를 묘사하기 좋다.',
    ],
    entries: [
      { term: '갑분싸', mean: '갑자기 분위기 싸해짐', ex: '"내 농담에 다들 조용해져서 갑분싸 됐어."', group: '일상' },
      { term: 'TMI', mean: '굳이 알 필요 없는 너무 많은 정보', ex: '"아침에 뭐 먹었는지까지? 그건 TMI야."', group: '일상' },
      { term: '인싸', mean: '무리에 잘 섞여 인기 있는 사람(insider)', ex: '"걔는 어디 가도 인싸라 친구가 많아."', group: '청춘' },
      { term: '아싸', mean: '무리에 잘 못 끼는 사람(outsider)', ex: '"난 모임보다 혼자가 편한 아싸야."', group: '청춘' },
      { term: '꾸안꾸', mean: '꾸민 듯 안 꾸민 듯 자연스러운 차림', ex: '"오늘 꾸안꾸로 입었는데 칭찬받았어."', group: '청춘' },
      { term: '존맛', mean: '굉장히 맛있음(맛의 강조 순화 표현)', ex: '"여기 김밥 진짜 존맛이야, 꼭 먹어봐."', group: '일상', soft: true },
      { term: '갓성비', mean: '가격 대비 성능이 최고임', ex: '"이 이어폰 싼데 음질 좋아, 완전 갓성비."', group: '일상' },
      { term: '오운완', mean: '오늘 운동 완료', ex: '"새벽 헬스장 다녀와서 오운완 인증!"', group: '일상' },
      { term: 'komo', mean: '커뮤니티에서 쓰는 모임의 줄임(코어 모임)', ex: '"이번 komo는 토요일 오후래."', group: '커뮤니티' },
      { term: '핵', mean: '엄청, 매우(강조 접두)', ex: '"오늘 시험 핵어려웠어, 망했다."', group: '학생' },
      { term: '점메추', mean: '점심 메뉴 추천', ex: '"배고픈데 점메추 좀 해줘."', group: '직장' },
      { term: '워라밸', mean: '일과 삶의 균형(work-life balance)', ex: '"이 회사는 야근이 없어서 워라밸이 좋아."', group: '직장' },
      { term: '낄끼빠빠', mean: '낄 때 끼고 빠질 때 빠지는 눈치', ex: '"분위기 보고 낄끼빠빠 좀 해라."', group: '청춘' },
      { term: '취존', mean: '취향을 존중함', ex: '"민트초코 좋아하는 것도 취존이지."', group: '일상' },
      { term: '손절', mean: '관계를 미련 없이 끊음(주식 용어에서 옴)', ex: '"계속 약속 어기길래 그냥 손절했어."', group: '청춘' },
      { term: '현타', mean: '현실 자각 타임 — 문득 허무해지는 순간', ex: '"새벽까지 게임하다 현타 왔어."', group: '청춘' },
      { term: '플렉스', mean: '돈·물건을 과시하듯 쓰는 일(flex)', ex: '"첫 월급으로 플렉스 한번 했지."', group: '청춘' },
      { term: '국룰', mean: '누구나 따르는 국민적 규칙·정석', ex: '"치킨엔 콜라가 국룰이지."', group: '일상' },
      { term: '입틀막', mean: '입을 틀어막을 만큼 놀라거나 감탄함', ex: '"무대 보고 입틀막했잖아, 너무 멋져서."', group: '팬덤' },
      { term: '최애', mean: '가장 아끼고 좋아하는 대상', ex: '"이 그룹에서 내 최애는 막내야."', group: '팬덤' },
      { term: '덕질', mean: '좋아하는 대상에 푹 빠져 즐기는 일', ex: '"요즘 그 배우 덕질하느라 바빠."', group: '팬덤' },
      { term: '입덕', mean: '어떤 대상의 팬이 되기 시작함', ex: '"그 무대 한 번 보고 입덕했어."', group: '팬덤' },
      { term: '탈덕', mean: '팬을 그만두는 일', ex: '"실망스러운 일이 있어서 탈덕했어."', group: '팬덤' },
      { term: '돌직구', mean: '에두르지 않고 곧바로 던지는 말', ex: '"그렇게 돌직구로 물어보면 당황하지."', group: '일상' },
      { term: '깜놀', mean: '깜짝 놀람', ex: '"문 갑자기 열려서 깜놀했어."', group: '일상' },
      { term: '어그로', mean: '관심·시비를 끌려고 일부러 자극하는 짓', ex: '"댓글에 어그로 끄는 사람 무시해."', group: '커뮤니티' },
      { term: '핵인싸', mean: '아주 인기 많은 인싸 중의 인싸', ex: '"그 친구는 학교에서 핵인싸야."', group: '청춘' },
      { term: '얼죽아', mean: '얼어 죽어도 아이스(아메리카노)', ex: '"한겨울에도 난 얼죽아라 따뜻한 거 안 마셔."', group: '일상' },
      { term: '맛집', mean: '음식이 맛있기로 소문난 가게', ex: '"이 동네 맛집 리스트 정리해 뒀어."', group: '일상' },
      { term: '드립', mean: '재치 있게 던지는 농담·말장난', ex: '"걔는 아무 데서나 드립 잘 쳐서 웃겨."', group: '청춘' },
      { term: '주접', mean: '좋아하는 마음을 호들갑스럽게 떠는 말', ex: '"최애한테 주접 댓글 잔뜩 달았어."', group: '팬덤' },
      { term: '킹받다', mean: '몹시 화나거나 어이없음(강조 표현)', ex: '"버스를 눈앞에서 놓쳐서 킹받았어."', group: '청춘' },
      { term: '알잘딱깔센', mean: '알아서 잘 딱 깔끔하고 센스 있게', ex: '"세세히 말 안 해도 알잘딱깔센으로 해줘."', group: '직장' },
    ],
  },
]

const KIND_LABEL: Record<Kind, string> = { slang: '은어', buzz: '유행어', abbr: '축약어' }
const KIND_ICON: Record<Kind, string> = { slang: '🔒', buzz: '🔥', abbr: '✂️' }
const KINDS: Kind[] = ['slang', 'buzz', 'abbr']

// 표제어 형태로 종류를 추정(은어=특정 집단어, 축약어=초성/줄임, 유행어=널리 퍼진 신조어).
// 데이터에 별도 kind 필드를 두지 않고, 자작 분류 규칙으로 일관 산출(검색·필터·통계에 사용).
const ABBR_SET = new Set<string>([
  'TMI', '안습', '버카충', '갑분싸', '점메추', '오운완', '워라밸', '낄끼빠빠', '취존', '국룰',
  '입틀막', '최애', '깜놀', '핵인싸', '얼죽아', '알잘딱깔센', '셤', 'komo', '디카', '쌩얼', '쩐',
])
const SLANG_GROUPS = new Set<string>(['통신', '커뮤니티', '거리', '시장', '팬덤'])
function kindOf(e: Entry): Kind {
  if (ABBR_SET.has(e.term)) return 'abbr'
  if (SLANG_GROUPS.has(e.group)) return 'slang'
  return 'buzz'
}

const LS = 'sry:tool:slang-era-ref:'
const ALL = '__all__'

interface Row { era: EraDef; kind: Kind; item: Entry }
const rowsOfEra = (e: EraDef): Row[] => e.entries.map((item) => ({ era: e, kind: kindOf(item), item }))
const flatAll = (): Row[] => ERAS.flatMap(rowsOfEra)

export default function SlangEraRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.era 로 특정 연대를 펼쳐 열 수 있게(연계 진입)
  const initialEra = typeof payload?.era === 'string' && ERAS.some((e) => e.key === payload.era)
    ? (payload.era as string) : ALL

  const [query, setQuery] = useState('')
  const [era, setEra] = useState<string>(() => {
    if (initialEra !== ALL) return initialEra
    try { const raw = localStorage.getItem(LS + 'era'); if (raw && (raw === ALL || ERAS.some((e) => e.key === raw))) return raw } catch { /* ignore */ }
    return ALL
  })
  const [kind, setKind] = useState<Kind | 'all'>(() => {
    try { const raw = localStorage.getItem(LS + 'kind'); if (raw === 'slang' || raw === 'buzz' || raw === 'abbr' || raw === 'all') return raw } catch { /* ignore */ }
    return 'all'
  })
  // 펼친 연대 카드(아코디언). 빈 객체면 모두 접힘.
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try { const raw = localStorage.getItem(LS + 'open'); if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> } } catch { /* ignore */ }
    return initialEra !== ALL ? { [initialEra]: true } : { '7080': true }
  })
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try { const raw = localStorage.getItem(LS + 'favs'); if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> } } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<Row | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'era', era) } catch { /* ignore */ } }, [era])
  useEffect(() => { try { localStorage.setItem(LS + 'kind', kind) } catch { /* ignore */ } }, [kind])
  useEffect(() => { try { localStorage.setItem(LS + 'open', JSON.stringify(open)) } catch { /* ignore */ } }, [open])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  // 언마운트 정리 — 복사/토스트 타이머
  const copiedTimer = useRef(0)
  const toastTimer = useRef(0)
  useEffect(() => () => {
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
  }, [])

  const total = useMemo(() => ERAS.reduce((n, e) => n + e.entries.length, 0), [])

  const favKey = (ek: string, term: string) => `${ek}::${term}`

  // 검색·필터 적용 전의 풀(무작위 뽑기 공용)
  const pool = useMemo(() => {
    let base = era === ALL ? flatAll() : (ERAS.find((e) => e.key === era) ? rowsOfEra(ERAS.find((e) => e.key === era)!) : [])
    if (kind !== 'all') base = base.filter((r) => r.kind === kind)
    if (onlyFav) base = base.filter((r) => favs[favKey(r.era.key, r.item.term)])
    return base
  }, [era, kind, onlyFav, favs])

  const q = query.trim().toLowerCase()
  const matches = useCallback((r: Row): boolean => {
    if (!q) return true
    return r.item.term.toLowerCase().includes(q)
      || r.item.mean.toLowerCase().includes(q)
      || r.item.ex.toLowerCase().includes(q)
      || r.item.group.toLowerCase().includes(q)
  }, [q])

  // 연대별로 그룹핑된 표시 데이터(검색·필터 적용)
  const grouped = useMemo(() => {
    return ERAS.map((e) => {
      if (era !== ALL && era !== e.key) return { era: e, rows: [] as Row[] }
      let rows = rowsOfEra(e)
      if (kind !== 'all') rows = rows.filter((x) => x.kind === kind)
      if (onlyFav) rows = rows.filter((x) => favs[favKey(e.key, x.item.term)])
      rows = rows.filter(matches)
      return { era: e, rows }
    }).filter((g) => g.rows.length > 0 || (era !== ALL && era === g.era.key))
  }, [era, kind, onlyFav, favs, matches])

  const shownCount = useMemo(() => grouped.reduce((n, g) => n + g.rows.length, 0), [grouped])

  const toggleOpen = (ek: string) => setOpen((prev) => ({ ...prev, [ek]: !prev[ek] }))
  const expandAll = () => setOpen(Object.fromEntries(ERAS.map((e) => [e.key, true])))
  const collapseAll = () => setOpen({})

  const flashToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }, [])

  const rollRandom = useCallback(() => {
    if (!pool.length) { setRandom(null); flashToast('뽑을 표현이 없습니다. 필터를 풀어 보세요.'); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.term === prev.item.term && pick.era.key === prev.era.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      // 뽑힌 연대 카드를 펼쳐 둠
      setOpen((o) => (o[pick.era.key] ? o : { ...o, [pick.era.key]: true }))
      return pick
    })
  }, [pool, flashToast])

  const toggleFav = (ek: string, term: string) => {
    const fk = favKey(ek, term)
    setFavs((prev) => { const next = { ...prev }; if (next[fk]) delete next[fk]; else next[fk] = true; return next })
  }

  // 복사용 한 줄(표제어 — 뜻 / 예문)
  const plainOf = (r: Row): string => `${r.item.term} — ${r.item.mean} / 예) ${r.item.ex}`

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current)
      copiedTimer.current = window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* 클립보드 거부 graceful */ })
  }

  const escapeHtml = (str: string) =>
    String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // [연계 1] 수집함에 담기
  const sendToStash = (r: Row) => {
    addToStash({ kind: 'note', label: `속어(${r.era.label}·${KIND_LABEL[r.kind]})`, text: plainOf(r) })
    flashToast(`수집함에 담았습니다 — “${r.item.term}”`)
  }
  // [연계 2] 공유 스니펫 라이브러리에 저장
  const saveSnippet = (r: Row) => {
    addToLibrary('snippets', { text: plainOf(r), source: `시대별 속어·유행어 사전 (${r.era.label})`, tags: [r.era.label, KIND_LABEL[r.kind], r.item.group] })
    flashToast(`스니펫으로 저장했습니다 — “${r.item.term}”`)
  }
  // [연계 3] 프로젝트 자료 〈시대 어휘 노트〉 폴더에 추가
  const addRowToProject = (r: Row) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(r.era.icon + ' ' + r.era.label + '(' + r.era.range + ') · ' + KIND_LABEL[r.kind] + ' · ' + r.item.group)}</b></p>`,
      `<p><b>${escapeHtml(r.item.term)}</b> — ${escapeHtml(r.item.mean)}</p>`,
      `<p>예) ${escapeHtml(r.item.ex)}</p>`,
      r.item.soft ? `<p><i>※ 비속어를 순화해 풀이한 항목입니다.</i></p>` : '',
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '시대 어휘 노트', title: `${r.item.term} (${r.era.label})`, bodyHtml })
    if (id) flashToast(`프로젝트 자료 〈시대 어휘 노트〉에 “${r.item.term}”를 추가했습니다.`)
  }
  // 연대 전체를 한 문서로 프로젝트에 추가
  const addEraToProject = (eg: EraDef) => {
    if (!hasProjectBridge()) return
    const lis = eg.entries.map((e) => {
      const k = kindOf(e)
      const soft = e.soft ? ' (순화)' : ''
      return `<li><b>${escapeHtml(e.term)}</b>${escapeHtml(soft)} [${escapeHtml(KIND_LABEL[k] + '·' + e.group)}] — ${escapeHtml(e.mean)}<br/>예) ${escapeHtml(e.ex)}</li>`
    }).join('')
    const notes = `<p><b>시대 말투·세태</b></p><ul>${eg.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}</ul>`
    const bodyHtml = `<p><b>${escapeHtml(eg.icon + ' ' + eg.label + ' (' + eg.range + ') 속어·유행어')}</b></p>` + notes + `<p><b>어휘 목록</b></p><ul>${lis}</ul>`
    const id = addToProject({ kind: 'text', root: 'research', folder: '시대 어휘 노트', title: `${eg.label}(${eg.range}) 속어·유행어 정리`, bodyHtml })
    if (id) flashToast(`프로젝트 자료 〈시대 어휘 노트〉에 〈${eg.label} 정리〉를 추가했습니다.`)
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10 }
  const chip = (on: boolean): React.CSSProperties => ({ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' })

  const renderRow = (r: Row) => {
    const fk = favKey(r.era.key, r.item.term)
    const isFav = !!favs[fk]
    const cid = 'item:' + fk
    return (
      <div key={fk} style={{ ...card, padding: '9px 11px', background: 'var(--paper)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={KIND_ICON[r.kind]} /> {KIND_LABEL[r.kind]} · {r.item.group}</span>
          {r.item.soft && <span title="비속어를 순화해 풀이한 항목" style={{ fontSize: 10.5, color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 6, padding: '0 5px', flexShrink: 0 }}>순화</span>}
          <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(r.era.key, r.item.term)} style={{ marginLeft: 'auto', flexShrink: 0, ...chip(isFav) }}>{isFav ? '★' : '☆'}</button>
        </div>
        <div style={{ marginTop: 5, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{r.item.term}</span>
          <span style={{ color: 'var(--muted)' }}>↔</span>
          <span style={{ fontSize: 14, color: 'var(--ok)' }}>{r.item.mean}</span>
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 4, color: 'var(--muted)', fontStyle: 'italic' }}>예) {r.item.ex}</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <button className="minibtn" onClick={() => copy(plainOf(r), cid)}>{copiedKey === cid ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
          {hasStash() && <button className="linkbtn" onClick={() => sendToStash(r)} title="플로팅 수집함에 담기"><Emoji e="📎" /> 수집함</button>}
          <button className="linkbtn" onClick={() => saveSnippet(r)} title="공유 스니펫 라이브러리에 저장"><Emoji e="✂️" /> 스니펫</button>
          {hasProjectBridge() && <button className="linkbtn" onClick={() => addRowToProject(r)} title="프로젝트 자료 〈시대 어휘 노트〉에 추가"><Emoji e="📄" /> 프로젝트</button>}
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={hint}>
        7080·9020·현대 세 연대의 속어·유행어·축약어 <b>{total}개</b>를 뜻·예문과 함께 모았습니다. 연대를 펼쳐 보고, 클릭해 복사하거나 시대 고증·인물 말투에 바로 쓰세요. <b>비속어는 순화 표기</b>(원형 대신 완곡한 풀이)이며 〈순화〉 배지로 표시합니다.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="표제어·뜻·예문·집단으로 검색 (예: 부킹, 방가방가, 갑분싸, 통신)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 연대 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setEra(ALL)} aria-pressed={era === ALL} style={chip(era === ALL)}><Emoji e="✨" /> 전체</button>
        {ERAS.map((e) => (
          <button key={e.key} className="minibtn" onClick={() => setEra(e.key)} aria-pressed={era === e.key} style={chip(era === e.key)} title={e.range}><Emoji e={e.icon} /> {e.label}</button>
        ))}
      </div>

      {/* 종류 필터 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={() => setKind('all')} aria-pressed={kind === 'all'} style={chip(kind === 'all')}><Emoji e="📚" /> 전체</button>
        {KINDS.map((k) => (
          <button key={k} className="minibtn" onClick={() => setKind(k)} aria-pressed={kind === k} style={chip(kind === k)}><Emoji e={KIND_ICON[k]} /> {KIND_LABEL[k]}</button>
        ))}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 표현</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav} style={chip(onlyFav)}>{onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}</button>
        <button className="minibtn" onClick={expandAll}>⊞ 모두 펼치기</button>
        <button className="minibtn" onClick={collapseAll}>⊟ 모두 접기</button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{shownCount}개 표시</span>
      </div>

      {/* 무작위 결과 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.era.icon} /> {random.era.label}({random.era.range}) · <Emoji e={KIND_ICON[random.kind]} /> {KIND_LABEL[random.kind]} · {random.item.group}</span>
            {random.item.soft && <span style={{ fontSize: 10.5, color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 6, padding: '0 5px' }}>순화</span>}
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ margin: '6px 0 2px', display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{random.item.term}</span>
            <span style={{ color: 'var(--muted)' }}>↔</span>
            <span style={{ fontSize: 15, color: 'var(--ok)' }}>{random.item.mean}</span>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, margin: '4px 0 8px', color: 'var(--muted)', fontStyle: 'italic' }}>예) {random.item.ex}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(plainOf(random), 'rand')}>{copiedKey === 'rand' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
            <button className="minibtn" onClick={() => toggleFav(random.era.key, random.item.term)}>{favs[favKey(random.era.key, random.item.term)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}</button>
            <button className="minibtn" onClick={rollRandom}><Emoji e="🎲" /> 다시</button>
          </div>
          {/* 연계 4종 */}
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            {hasStash() && <button className="linkbtn" onClick={() => sendToStash(random)} title="플로팅 수집함에 담기"><Emoji e="📎" /> 수집함</button>}
            <button className="linkbtn" onClick={() => saveSnippet(random)} title="공유 스니펫 라이브러리에 저장"><Emoji e="✂️" /> 스니펫 저장</button>
            <button className="linkbtn" onClick={() => addRowToProject(random)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈시대 어휘 노트〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
            <button className="linkbtn" onClick={() => openToolLinked('dialect-ref')} title="관련 도구: 방언 표현 사전 열기"><Emoji e="🔗" /> 방언 사전</button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5 }}>✓ {toast}</div>
      )}

      {/* 연대별 아코디언 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
        {grouped.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 표현이 없습니다. 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          grouped.map((g) => {
            const eg = g.era
            const isOpen = !!open[eg.key]
            return (
              <div key={eg.key} style={card}>
                {/* 연대 헤더(펼침/접기) */}
                <button
                  onClick={() => toggleOpen(eg.key)}
                  aria-expanded={isOpen}
                  style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 9 }}
                >
                  <span style={{ fontSize: 18 }}><Emoji e={eg.icon} /></span>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{eg.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{eg.range}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {g.rows.length}개</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 13 }}>{isOpen ? '▾' : '▸'}</span>
                </button>

                {isOpen && (
                  <div style={{ padding: '0 13px 13px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {/* 시대 말투·세태 */}
                    <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 5 }}><Emoji e="🗯️" /> 시대 말투·세태</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6, color: 'var(--muted)' }}>
                        {eg.notes.map((n, i) => <li key={i}>{n}</li>)}
                      </ul>
                      {hasProjectBridge() && (
                        <div style={{ marginTop: 8 }}>
                          <button className="linkbtn" onClick={() => addEraToProject(eg)} title="이 연대 전체(세태·어휘·뜻·예문)를 한 문서로 프로젝트에 추가"><Emoji e="📄" /> 이 연대 통째로 프로젝트에 추가</button>
                        </div>
                      )}
                    </div>
                    {/* 어휘 목록 */}
                    {g.rows.length === 0
                      ? <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: '6px 2px' }}>이 조건에 해당하는 표현이 없습니다.</div>
                      : g.rows.map(renderRow)}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 저작권 표기 */}
      <div className="license-note">
        수록 표제어·뜻·예문·세태 설명은 모두 직접 작성한 자작 데이터입니다. 속어·유행어는 세대가 함께 써 온 말이며, 풀이·예문·분류는 창작 표현입니다. 비속어 원형은 싣지 않고 완곡하게 순화했습니다.
        <span className="license-badge" style={{ marginLeft: 6 }}>자작 데이터</span>
      </div>
    </div>
  )
}
