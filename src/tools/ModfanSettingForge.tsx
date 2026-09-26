// 현대판타지·회귀 — 배경·현장 생성기
//   회귀물의 무대를 슬롯 조합으로 생성: 현장(권역) × 시간좌표 × 공기·분위기 × 시스템/이상징후
//   × 권력·세력 블록 × 회귀 맥락(미래지식 작동점) × 감각 디테일 × 후킹 한 줄.
//   마음에 드는 칸은 🔒로 잠그고 나머지만 🎲 재생성. 조합수 1조 이상(핵심 생성기 지향).
// 자급식: react 와 './linkbus' 만 import. 외부 API·네트워크 없음(전부 로컬 자작 데이터).
//   Math.random + localStorage('sry:tool:modfan-settingforge') 만 사용. 언마운트 정리.
// 연계: 공유 장소 라이브러리(addToLibrary('places')) + 프로젝트(addToProject kind:setting, folder:'장소')
//   + 글감 스니펫(addToLibrary('snippets')) + 관련 도구 열기(openToolLinked). payload.genre 맥락 배지.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'modfan-settingforge',
  name: '회귀 배경·현장 생성기',
  icon: '🏙️',
  group: '배경',
  genre: '현대판타지·회귀',
  intro: '회귀물의 무대(현장·시간좌표·시스템·세력·미래지식 작동점)를 조합해 만든다',
  w: 480,
  h: 660,
}

// ───────────────────────── 슬롯 데이터(장르 특화·구체) ─────────────────────────
// 현대판타지+회귀 도시에 근거. 현실 시스템(주식·연예·헌터/게이트·기업·스포츠) 위에
// "한 스푼의 비현실 + 미래지식 우위"가 작동하는 구체 무대들.

// 1) 현장(권역) — 회귀자가 두 번째 인생을 굴리는 구체적 장소
const PLACE = [
  '여의도 증권가 32층 트레이딩룸', '강남 테헤란로의 신생 스타트업 사무실', '낡은 반지하 원룸(전생의 시작점)',
  '대형 기획사 지하 연습실', '서울역 앞 게이트 발생 통제구역', '헌터협회 본부 등급심사실',
  '폐업 직전 동네 PC방', '명동 한복판에 갑자기 열린 균열', '재개발 예정 달동네 옥탑방',
  '대기업 신입 공채 면접 대기실', '심야 편의점 카운터 너머', '코엑스 지하 던전 입구',
  '강원도 폐광을 개조한 비밀 길드 거점', '한강 다리 위 새벽 4시', '경마장 베팅 창구',
  '인천공항 입국장(귀국하는 회귀 직후)', '학교 옥상의 급식 끝난 점심시간', '대학 도서관 열람실 구석자리',
  '판교 IT밸리의 24시간 야근 빌딩', '한물간 권투 체육관', '신도시 모델하우스 분양 상담석',
  '방송국 음악방송 대기실', '게임 개발사 QA실의 새벽', '응급실 복도(전생에 가족이 떠난 곳)',
  '부산 자갈치 시장 한복판', '코인 거래소 서버실', '재벌가 본가 응접실', '구단 클럽하우스 라커룸',
  '국세청 세무조사 회의실', '심야 라디오 부스', '낙후된 지방 거점 도시의 버스터미널',
  '게이트 너머 균열 안쪽의 던전 1층', '서초동 법원 앞 계단', '명문대 합격자 발표 게시판 앞',
  '신용불량자 명단이 떠 있던 은행 대출 창구', '강남 클럽 VIP룸', '동대문 새벽 도매시장',
  '연예인 전용 비공개 병실', '한국거래소 상장 심사장', '벤처캐피탈 투자심사 회의실',
  '게임 대회 결승 부스', '심야 택시 뒷좌석', '재수학원 단과반 강의실', '대기업 사내 비상대책 회의실',
  '동네 로또 판매점 앞', '연습생 합숙소 2층 침대', '게이트 방어선 최전방 천막', '증권방송 생방송 스튜디오',
  '폐허가 된 전생의 회사 사옥', '신축 아파트 청약 모델하우스 추첨장',
]

// 2) 시간좌표 — 회귀물은 구체적 연도·시점이 무기. (가공/변형된 동시대~근과거 결)
const TIMECODE = [
  '회귀 직후 — 익숙한 천장을 다시 본 첫 아침', 'IMF 직전, 모두가 아직 호황을 믿던 해',
  '닷컴버블이 부풀기 직전의 봄', '글로벌 금융위기 6개월 전', '코인 1차 폭등 직전의 늦가을',
  '첫 게이트가 열리기 사흘 전', 'S급 던전 브레이크 D-1', '데뷔조 최종 발표 전날 밤',
  '대형 기획사 공개 오디션 접수 마감일', '그 회사가 상장하기 정확히 1년 전', '전생에 죽었던 그날의 정확히 10년 전',
  '수능 100일 전', '신입 공채 서류 발표 직전', '코스닥 급등 종목이 바닥을 찍은 날',
  '재개발 고시가 뜨기 일주일 전', '월드컵 4강 신화가 시작되기 직전 봄', '그 천재 신인이 아직 무명이던 시절',
  '대지진 예고일 D-30', '전생의 배신자가 아직 내 편이던 시기', '회사가 부도나기 직전 마지막 분기',
  '코인 상장 폐지 D-7(전생엔 몰랐던)', '신약 임상 결과 발표 전야', '인수합병 공시가 뜨기 하루 전',
  '대형 화재 참사 발생 전날', '게이트 등급이 EX로 재평가되기 직전', '음원차트 역주행이 시작되기 전 주',
  '재벌 회장이 쓰러지기 정확히 사흘 전', '구단이 강등권에 떨어지기 직전 라운드', '전생의 첫 실수가 일어났던 그 순간 직전',
  '국민 게임이 출시되기 정확히 두 달 전', '전세 사기가 터지기 전, 모두가 안전하다 믿던 시점', '대형 길드 마스터가 던전에서 전사하기 전날',
  '판교 부동산이 평당 두 배로 뛰기 직전 분기', '그 배우가 무명에서 천만 배우로 도약하기 직전 작품',
]

// 3) 공기·분위기 — 도시적·동시대적·실리적 + 한 스푼의 비현실
const MOOD = [
  '겉은 평범한 출근길, 속은 미래를 아는 자의 서늘한 여유', '데자뷔처럼 익숙한 거리, 그러나 손끝이 떨린다',
  '모두가 분주한데 나만 결말을 아는 고요', '형광등 아래 무미건조한 일상에 깔린 불온한 예감',
  '돌아왔다는 실감과 한 번 더라는 각오가 뒤섞인 새벽', '전생의 죄책감이 그림자처럼 따라붙는 오후',
  '아직 살아있는 가족 앞에서 울컥하는 안도', '들킬까 두려운 미래 지식의 무게', '복수의 다짐으로 차갑게 가라앉은 공기',
  '저점에서 매수 버튼 위에 떠 있는 손가락의 긴장', '무명인 거물을 알아본 자의 은밀한 흥분',
  '게이트 너머에서 새어 나오는 정체불명의 압력', '아무도 모르는 재앙의 카운트다운이 머릿속에만 흐르는 정적',
  '두 번째 인생이라는 사치를 자각한 담담함', '같은 실수는 없다는 결심으로 또렷해진 시야',
  '환호와 야유가 교차하는 무대 뒤의 비릿한 긴장', '돈 냄새와 욕망이 들끓는 거래소의 열기',
  '시스템 창이 눈앞에만 떠 있는 비현실적 고요', '낯익은 얼굴들이 아직 내게 적의가 없는 그 시절의 평온',
  '예고된 결말을 향해 톱니바퀴가 맞물려 돌아가는 운명감', '한밤의 도시 불빛 아래 홀로 깬 자의 외로운 명료함',
  '아는 미래가 어긋나기 시작한 자의 미세한 불안', '두 번 사는 자만 아는, 시간이 거꾸로 흐르는 듯한 멀미',
  '못 지킨 사람을 다시 마주한 순간의 먹먹한 떨림', '판을 짜는 자의 차분하고도 음험한 계산',
  '회귀자끼리 서로를 알아본 자리의 팽팽한 적의', '평범한 척 웃지만 속으론 카운트다운을 세는 이중의 긴장',
  '전생의 우상을 다시 본 묘한 환멸과 연민', '내일이면 뒤집힐 시세 앞에서의 서늘한 침착',
  '미래를 미끼로 사람을 움직이는 자의 은밀한 우월감', '다 알면서도 모른 척해야 하는 답답함 섞인 인내',
  '곧 끝날 평온을 아껴 음미하는 회귀자의 쓸쓸함',
]

// 4) 시스템/이상징후 — 현실 위 비현실 요소(시스템 창·각성·게이트·회귀 감각)
const SYSTEM = [
  '눈앞에만 떠 있는 반투명 상태창', '나만 들리는 미래 사건의 카운트다운 알림', '회귀할 때마다 초기화되는 [세이브 슬롯] 감각',
  '특정 인물 위에 떠오르는 미래 흥망 게이지', '저평가 자산을 붉게 표시해 주는 직감 보정', '거짓말을 흐릿하게 일그러뜨려 보여주는 시야',
  '게이트 등급을 색으로 미리 보는 각성 특성', '회귀자만 인식하는 [분기점] 마커', '아직 발현 전인 잠재 스탯 창',
  '전생의 기억이 데이터로 검색되는 머릿속 색인', '특정 날짜에 자동으로 울리는 예지 경보', '아무도 못 보는 균열의 실금이 벽에 비친다',
  '미래에 대박 날 콘텐츠가 머릿속에 통째로 떠오름', '회귀 횟수가 새겨진 보이지 않는 낙인', '시스템이 주는 [재회 보너스] 알림',
  '죽음의 순간을 되감는 [되돌리기] 직감', '특정 인물의 미래 대사가 자막처럼 흐른다', '없던 [상점] 인터페이스가 위기 때만 열린다',
  '각성하지 않은 척 숨겨야 하는 진짜 등급', '전생에 본 엔딩 크레딧이 가끔 눈앞을 스친다',
  '거래 체결 직전 손실 확률을 붉게 띄우는 직감', '다른 회귀자가 근처에 있으면 손목이 저릿해지는 감지',
  '운명선처럼 바닥에 깔리는 [최적 경로] 발광', '시세 차트가 미래 구간까지 흐릿하게 미리 그려진다',
  '나비효과로 어긋난 미래가 [경고: 분기 변동]으로 깜빡인다', '잠들면 전생의 마지막 날이 자동 재생되는 악몽 로그',
  '큰 사건 직전이면 머리 한쪽이 지끈거리는 예지 두통', '회귀 직후에만 잠깐 열렸다 사라지는 [초기 보너스] 창',
  '특정 인물의 호감도가 숫자로 미세하게 떠오른다', '거짓 정보에는 [신뢰도 낮음] 워터마크가 겹쳐 보인다',
]

// 5) 권력·세력 블록 — 흥망 타임라인이 미래지식의 무대
const POWER = [
  '곧 무너질 거대 재벌 2세의 사조직', '아직 무명인 미래의 1세대 IT 신화 창업자', '전생에 나를 짓밟은 대형 기획사 실세 이사',
  '게이트 이권을 독점하려는 헌터협회 고위 라인', '저점에 매집 중인 정체불명의 외국계 펀드', '곧 상장 폐지될 작전 세력의 검은손',
  '미래에 S급으로 각성할 길드의 무명 신인', '재개발 이권을 쥔 지역 토착 카르텔', '연예계 뒷거래를 주무르는 브로커 조직',
  '내부 정보를 흘리는 증권가 정보지 세력', '회귀자를 사냥하는 또 다른 예지자 집단', '곧 부도날 모기업 산하의 위태로운 자회사들',
  '미래의 대권 주자가 될 젊은 정치 신인', '게이트 던전을 비밀리에 연구하는 정부 기관', '전생에 우상이었다가 추락할 톱스타 라인',
  '코인 시장을 흔드는 고래 지갑 연합', '구단을 헐값에 인수하려는 기업의 인수팀', '신약 특허를 선점하려는 바이오 벤처들',
  '암묵적으로 시장을 나눠 가진 3대 길드 동맹', '나처럼 미래를 아는 척하는 사기꾼 카르텔',
  '미래에 국민 게임을 낼 무명 인디 개발팀', '전생에 나를 부도로 몰아넣은 사채 조직', '게이트 아이템을 독점 유통하는 경매 하우스',
  '회귀자만 골라 포섭하려는 그림자 길드', '미래의 부동산 큰손이 될 지방 토착 부동산업자', '연예계 데뷔를 미끼로 착취하는 악덕 소속사',
  '내부 정보로 작전을 거는 증권사 PB 라인', '미래 특허를 가로채려는 대기업 법무팀',
  '게이트 던전 영상을 독점 송출하는 신생 미디어 그룹', '전생에 나를 내친 옛 동업자가 세운 경쟁 회사',
  '코스닥 테마주를 띄웠다 터뜨리는 리딩방 운영 조직', '국가대표 선수를 발굴해 키우는 사설 스포츠 에이전시',
]

// 6) 회귀 맥락 — 이 무대에서 "미래지식이 작동하는 지점"(장르 엔진)
const REGRESS = [
  '여기서 그 종목을 저점 매수하면 종잣돈이 마련된다', '오늘 그 무명 신인을 알아보고 미리 포섭해야 한다',
  '사흘 뒤 터질 사건을 막거나 베팅할 마지막 타이밍', '전생의 배신자가 아직 손을 내밀기 전, 선수를 칠 순간',
  '이 면접만 통과하면 미래 핵심 인맥의 문이 열린다', '곧 열릴 게이트 위치를 나만 알고 있다',
  '전생에 놓친 가족을 이번엔 지킬 수 있는 분기점', '대박 날 콘텐츠를 남보다 먼저 선점할 기회',
  '미래에 폭등할 부동산을 헐값에 잡을 마지막 고시 전날', '전생의 원수가 아직 우위에 있지만 약점을 이미 안다',
  '회귀자임을 들키지 않으면서 정보를 흘려야 하는 줄타기', '이번 던전 공략 루트를 통째로 외우고 있다',
  '나비효과로 미래가 막 어긋나기 시작한 위험 신호', '아는 미래가 더는 안 통하는 첫 변수가 나타났다',
  '여기서 실력을 숨겼다가 결정적 순간에 터뜨릴 포석', '전생의 부고 명단을 떠올리며 한 명을 살리러 가는 길',
  '대형 청산의 첫 단추를 끼울 작은 응징의 자리', '미래의 라이벌이 될 떡잎을 지금 꺾을지 품을지의 갈림길',
  '거시 이벤트(폭락·재해) 전 마지막으로 손쓸 수 있는 칸', '또 다른 회귀자가 같은 미래를 노리고 있음을 직감한다',
  '미래에 대박 날 노래·시나리오를 본인이 먼저 발표할 자리', '전생에 헐값에 판 자산을 이번엔 끝까지 쥐고 갈 결심의 순간',
  '곧 추락할 우상에게서 미리 거리를 둬야 하는 타이밍', '아직 신뢰가 남아 있는 옛 동료를 다시 끌어들일 기회',
  '미래의 인수합병 정보를 미끼로 판을 흔들 수 있는 칸', '전생의 사망 원인을 단서로 진범의 동선을 앞지를 자리',
  '들킬 위험을 무릅쓰고 결정적 예지를 흘려야 하는 선택', '이번 회차에서만 열리는 숨겨진 보상 루트의 입구',
  '곧 헐값에 풀릴 알짜 매물을 남보다 먼저 선점할 마지막 며칠', '전생에 등 돌렸던 은인에게 이번엔 먼저 손을 내밀 순간',
]

// 7) 감각 디테일 — 무대에 깔리는 구체 감각(이미지)
const DETAIL = [
  '전광판 빨간 숫자가 망막에 잔상으로 남는다', '회귀 전 마지막으로 들었던 노래가 어디선가 흘러나온다',
  '젊어진 손등의 매끈함이 낯설고도 서늘하다', '익숙한 향수 냄새에 전생의 그 사람이 떠오른다',
  '게이트 균열에서 새어 나온 마나가 살갗을 따끔하게 누른다', '커피 자판기의 종이컵 떨어지는 소리가 유난히 또렷하다',
  '거울 속 너무 어린 얼굴에 잠시 숨이 막힌다', '키보드 두드리는 소리만 가득한 새벽 사무실의 적막',
  '스마트폰 액정에 뜬 옛 날짜가 가슴을 친다', '형광등이 한 번 깜빡일 때마다 분기점이 가까워지는 기분',
  '엘리베이터 거울에 비친 표정이 전생보다 단단하다', '아직 따뜻한 부모님의 목소리가 전화기 너머로 들린다',
  '상태창의 푸른 빛이 어둠 속에서 홀로 떠 있다', '도매시장의 비릿한 새벽 공기가 폐를 가득 채운다',
  '연습실 거울 벽에 비친 수십 명의 내가 동시에 움직인다', '계약서 위 펜 끝이 종이를 긁는 소리가 운명처럼 들린다',
  '한강 다리 난간의 차가운 쇠 냄새가 손에 배어든다', '면접장 형광등 아래 셔츠 깃이 목을 조여 온다',
  '던전 안쪽에서 불어오는 곰팡내 섞인 찬바람', '차트 그래프가 눈을 감아도 망막에 떠다닌다',
  '오래된 폴더폰 진동음이 전생의 그날을 소환한다', '입금 알림 진동이 손바닥에 짜릿하게 전해진다',
  '균열에서 새어 나온 빛이 아스팔트에 파랗게 번진다', '낡은 교복 셔츠의 풀 먹인 빳빳함이 어깨에 닿는다',
  '게이트 통제선 너머 사이렌이 멀리서 깜빡인다', '주문 체결음이 심장 박동과 겹쳐 울린다',
  '연습실 바닥에 밴 땀 냄새와 파스 향이 코를 찌른다', '회귀 직후 마신 첫 물의 차가움이 식도를 타고 내려간다',
  '오래전 멈춘 줄 알았던 손목시계 초침이 또각또각 다시 돌아간다', '창밖 도시의 불빛이 전생의 마지막 밤과 똑같이 번져 보인다',
]

// 8) 후킹 한 줄 — 회귀물 1화 후킹 톤(클리셰적 문장 결)
const HOOK = [
  '다시 눈을 떴다. 익숙한 천장이다. — 그래, 이 날이었지.', '나는 미래를 알고 있다. 이번엔 다르다.',
  '같은 실수는 반복하지 않는다. 전부 기억하고 있으니까.', '전생의 나라면 몰랐겠지만, 지금의 나는 안다.',
  '이 종목, 이 사람, 이 날짜 — 하나도 빠짐없이 외우고 있다.', '아직 그 사건이 일어나기 전이군. 시간은 충분하다.',
  '죽기 직전에 빌었던 단 하나의 소원이, 지금 이뤄졌다.', '이번 생은 빼앗기지 않는다. 단 하나도.',
  '그놈이 웃고 있다. 자기 끝을 모른 채.', '두 번째 인생이다. 이번엔 내가 판을 짠다.',
  '아직 살아있구나. 그 사실만으로 가슴이 무너진다.', '미래를 아는 자에게 이 세상은 너무 친절하다.',
  '들키지 마라. 천재인 척, 운이 좋은 척이면 충분하다.', '내가 아는 미래가, 오늘부터 조금씩 바뀐다.',
  '회귀자는 나뿐이라고 생각했다 — 방금 전까지는.', '이번엔 반드시 너를 지킨다. 무슨 수를 써서라도.',
  '전생의 마지막 순간을 기억한다. 그래서 이번엔 웃을 수 있다.', '아무것도 모르는 너희가, 곧 내 손바닥 위에 있겠지.',
  '시간은 내 편이다. 답을 아는 시험만큼 쉬운 게 또 있을까.', '한 번 죽어봤더니, 두 번째 삶이 이렇게 가볍구나.',
  '이 도시의 미래를 나만 알고 있다. 시작은 오늘이다.', '되감긴 인생의 첫 페이지 — 이번엔 결말부터 다시 쓴다.',
  '그날의 후회를, 오늘의 결심으로 갚는다.', '나는 끝을 봤다. 그러니 시작이 두렵지 않다.',
  '같은 무대, 다른 배우. 이번 주인공은 나다.', '미래는 정해져 있었다 — 내가 손대기 전까지는.',
  '두 번째 기회는 사치다. 그러니 단 한 칸도 버리지 않는다.', '아직 아무 일도 일어나지 않았다. 그게 가장 무서운 일이지.',
]

interface Slot { key: string; label: string; icon: string; pool: string[] }
const SLOTS: Slot[] = [
  { key: 'place', label: '현장(권역)', icon: '🏙️', pool: PLACE },
  { key: 'time', label: '시간좌표', icon: '🕰️', pool: TIMECODE },
  { key: 'mood', label: '공기·분위기', icon: '🎭', pool: MOOD },
  { key: 'system', label: '시스템·이상징후', icon: '🪟', pool: SYSTEM },
  { key: 'power', label: '권력·세력', icon: '🏛️', pool: POWER },
  { key: 'regress', label: '미래지식 작동점', icon: '🔮', pool: REGRESS },
  { key: 'detail', label: '감각 디테일', icon: '🌫️', pool: DETAIL },
  { key: 'hook', label: '후킹 한 줄', icon: '✍️', pool: HOOK },
]

type SettingMap = Record<string, string>

// 조합수: 모든 슬롯 풀 크기의 곱
function totalCombos(): number {
  return SLOTS.reduce((acc, s) => acc * s.pool.length, 1)
}
function fmtCombos(n: number): string {
  // 한국어 단위(조/억/만)로 보기 좋게 — 조 단위면 억 자리까지 함께 보여 정밀도 유지
  const 조 = 1_0000_0000_0000
  const 억 = 1_0000_0000
  const 만 = 1_0000
  if (n >= 조) {
    const t = Math.floor(n / 조)
    const rest억 = Math.floor((n % 조) / 억)
    return rest억 > 0 ? `${t}조 ${rest억}억 가지` : `${t}조 가지`
  }
  if (n >= 억) return `${(n / 억).toFixed(2).replace(/\.?0+$/, '')}억 가지`
  if (n >= 만) return `${(n / 만).toFixed(0)}만 가지`
  return `${n.toLocaleString()}가지`
}

const LS = 'sry:tool:modfan-settingforge'

// 한국어 조사 자동 선택: 마지막 글자 받침 유무로 실제 조사를 하나 골라 출력(괄호 이중표기 방지)
function hasBatchim(word: string): boolean {
  const w = (word || '').replace(/[)\]"'』」】〉》\s.!?…·~]+$/g, '') // 끝의 따옴표·괄호·구두점 제거
  const ch = w.charCodeAt(w.length - 1)
  if (Number.isNaN(ch) || ch < 0xac00 || ch > 0xd7a3) return false // 한글 음절이 아니면 받침 없음 취급
  return (ch - 0xac00) % 28 !== 0
}
// 을/를 (목적격)
const josaEulReul = (w: string) => `${w}${hasBatchim(w) ? '을' : '를'}`
// 으로/로 (도구·방향) — ㄹ 받침은 '로'
function josaEuro(w: string): string {
  const t = (w || '').replace(/[)\]"'』」】〉》\s.!?…·~]+$/g, '')
  const ch = t.charCodeAt(t.length - 1)
  if (Number.isNaN(ch) || ch < 0xac00 || ch > 0xd7a3) return `${w}로`
  const jong = (ch - 0xac00) % 28
  return `${w}${jong === 0 || jong === 8 ? '로' : '으로'}`
}

const rnd = (a: string[]) => a[Math.floor(Math.random() * a.length)]
const rid = () => Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36)
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 굴린 결과를 자연스러운 무대 묘사로 엮는다
function compose(m: SettingMap): string {
  return [
    `【${m.place}】 — ${m.time}.`,
    `${m.mood}.`,
    `이상징후: ${m.system}.`,
    `세력: ${m.power}.`,
    `이번 무대의 핵심 — ${m.regress}.`,
    `감각: ${m.detail}.`,
    // 조사 자동 선택(으로/로 → 을/를): 무대 이름 받침에 맞춰 괄호 없이 자연스러운 한 문장으로 마무리
    `${josaEuro(m.place)} 돌아온 그 순간, ${josaEulReul(m.mood.split(',')[0])} 손에 쥐고 다시 시작한다.`,
    `〈후킹〉 ${m.hook}`,
  ].join('\n')
}

interface SavedItem { id: string; map: SettingMap; note: string }

export default function ModfanSettingForge({ payload }: { payload?: Record<string, unknown> }) {
  const [map, setMap] = useState<SettingMap | null>(null)
  const [locks, setLocks] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')
  const [saved, setSaved] = useState<SavedItem[]>([])
  const [editId, setEditId] = useState('')
  const [editText, setEditText] = useState('')
  const [showSaved, setShowSaved] = useState(false)
  // 사용자 정의 항목(미리 만든 데이터 없음 → 직접 입력) + 고정 '기타' 자유 입력
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')

  const alive = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // payload.genre 맥락 배지
  const ctxGenre = payload && typeof payload.genre === 'string' ? String(payload.genre).trim() : ''

  // ── 마운트: 저장본 로드 + 첫 굴림 ──
  useEffect(() => {
    alive.current = true
    try {
      const raw = localStorage.getItem(LS)
      if (raw) {
        const p = JSON.parse(raw)
        if (Array.isArray(p?.saved)) {
          setSaved(p.saved.filter((s: any) => s && s.map && typeof s.id === 'string'))
        }
      }
    } catch { /* ignore */ }
    // 첫 무대 자동 생성
    const first: SettingMap = {}
    SLOTS.forEach((s) => { first[s.key] = rnd(s.pool) })
    setMap(first)
    return () => {
      alive.current = false
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (rollTimer.current) clearTimeout(rollTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 저장본 영속 ──
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify({ saved })) } catch { /* 용량 초과 무시 */ }
  }, [saved])

  const flashToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { if (alive.current) setToast('') }, 2000)
  }, [])

  // ── 굴리기(잠금 칸은 유지) ──
  const roll = useCallback(() => {
    setCopied(false)
    setRolling(true)
    // 새 무대 생성: 사용자 정의 항목의 '값'과 '기타'는 비우고 항목 정의(이름)는 유지
    setCustom((prev) => prev.map((c) => ({ ...c, value: '' })))
    setEtc('')
    setMap((prev) => {
      const next: SettingMap = { ...(prev || {}) }
      SLOTS.forEach((s) => {
        if (locks[s.key] && prev && prev[s.key]) return
        let v = rnd(s.pool)
        if (prev && v === prev[s.key] && s.pool.length > 1) v = rnd(s.pool) // 연속 중복 줄이기
        next[s.key] = v
      })
      return next
    })
    if (rollTimer.current) clearTimeout(rollTimer.current)
    rollTimer.current = setTimeout(() => { if (alive.current) setRolling(false) }, 320)
  }, [locks])

  const rollOne = (key: string) => {
    setCopied(false)
    setMap((prev) => {
      if (!prev) return prev
      const s = SLOTS.find((x) => x.key === key)!
      let v = rnd(s.pool)
      if (v === prev[key] && s.pool.length > 1) v = rnd(s.pool)
      return { ...prev, [key]: v }
    })
  }

  const toggleLock = (key: string) => setLocks((p) => ({ ...p, [key]: !p[key] }))

  // ── 사용자 정의 항목 ──
  const addCustom = () => {
    const label = (window.prompt('추가할 항목 이름을 입력하세요') || '').trim()
    if (!label) return
    setCustom((prev) => [...prev, { id: rid(), label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) =>
    setCustom((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
  const removeCustom = (id: string) => setCustom((prev) => prev.filter((c) => c.id !== id))

  // 사용자 정의 항목·기타 → fields 맵 보강(비어있지 않은 것만). 라벨 충돌은 기존 키 보존.
  const mergeExtraFields = (fields: Record<string, string>): Record<string, string> => {
    const out = { ...fields }
    custom.forEach((c) => {
      const k = c.label.trim()
      const v = c.value.trim()
      if (k && v && !(k in out)) out[k] = v
    })
    const e = etc.trim()
    if (e && !('etc' in out)) out.etc = e
    return out
  }
  // 사용자 정의 항목·기타 → 텍스트 줄(비어있지 않은 것만)
  const extraLines = (): string => {
    const lines: string[] = []
    custom.forEach((c) => { const v = c.value.trim(); if (c.label.trim() && v) lines.push(`${c.label.trim()}: ${v}`) })
    const e = etc.trim()
    if (e) lines.push(`기타: ${e}`)
    return lines.length ? '\n' + lines.join('\n') : ''
  }

  const fullText = map ? compose(map) + extraLines() : ''
  const lockedCount = SLOTS.filter((s) => locks[s.key]).length
  const combos = totalCombos()

  // ── 복사 ──
  const copyText = () => {
    if (!map) return
    if (!navigator.clipboard) { flashToast('이 환경에서는 복사를 지원하지 않습니다.'); return }
    navigator.clipboard.writeText(fullText).then(() => {
      if (!alive.current) return
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => { if (alive.current) setCopied(false) }, 1500)
    }).catch(() => flashToast('복사에 실패했습니다.'))
  }

  // ── 즐겨찾기(CRUD, localStorage) ──
  const saveSetting = () => {
    if (!map) return
    setSaved((prev) => [{ id: rid(), map: { ...map }, note: '' }, ...prev].slice(0, 60))
    flashToast('무대를 즐겨찾기에 저장했어요')
  }
  const removeSaved = (id: string) => {
    setSaved((prev) => prev.filter((s) => s.id !== id))
    if (editId === id) { setEditId(''); setEditText('') }
  }
  const startEdit = (s: SavedItem) => { setEditId(s.id); setEditText(s.note) }
  const commitEdit = () => {
    const t = editText.trim()
    setSaved((prev) => prev.map((s) => (s.id === editId ? { ...s, note: t } : s)))
    setEditId(''); setEditText('')
  }
  const loadSaved = (s: SavedItem) => { setMap({ ...s.map }); setLocks({}); setCopied(false); flashToast('무대를 불러왔어요') }

  // ── 연계: 공유 장소 라이브러리 ──
  const toLibrary = (m: SettingMap, note?: string) => {
    const sensory = [
      `시간좌표: ${m.time}`,
      `이상징후: ${m.system}`,
      `권력·세력: ${m.power}`,
      `미래지식 작동점: ${m.regress}`,
      `감각: ${m.detail}`,
    ].join('\n')
    addToLibrary('places', {
      name: m.place,
      kind: '현대판타지·회귀 무대',
      mood: m.mood,
      sensory,
      notes: note || compose(m),
      source: '회귀 배경·현장 생성기',
      // 정규 키(장소) fields — 받는 허브가 기본 칸에 바로 꽂도록 표준화(추가 전용)
      // + 사용자 정의 항목·기타도 함께 실어 다른 도구(인물 시트·갤러리 등)에 그대로 노출
      fields: mergeExtraFields({
        name: m.place,
        kind: '현대판타지·회귀 무대',
        atmosphere: m.mood,
        sensory: m.detail,
        rules: m.system,
        inhabitants: m.power,
        history: m.time,
        secrets: m.regress,
        notes: note ? `${m.hook}\n${note}` : m.hook,
      }),
    })
    flashToast(`장소 ‘${m.place}’를 공유 라이브러리에 추가했어요`)
  }

  // ── 연계: 글감 스니펫 ──
  const toSnippet = (m: SettingMap) => {
    addToLibrary('snippets', {
      text: compose(m),
      source: '회귀 배경·현장 생성기',
      tags: ['현대판타지', '회귀', '배경', '글감'],
    })
    flashToast('무대 글감을 스니펫으로 저장했어요')
  }

  // ── 연계: 프로젝트(설정 카드, 자료 › 장소) ──
  const linked = hasProjectBridge()
  const toProject = (m: SettingMap, note?: string) => {
    if (!linked) { flashToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = [
      `<p><b>🏙️ 현장(권역):</b> ${esc(m.place)}</p>`,
      `<p><b>🕰️ 시간좌표:</b> ${esc(m.time)}</p>`,
      `<p><b>🎭 공기·분위기:</b> ${esc(m.mood)}</p>`,
      `<p><b>🪟 시스템·이상징후:</b> ${esc(m.system)}</p>`,
      `<p><b>🏛️ 권력·세력:</b> ${esc(m.power)}</p>`,
      `<p><b>🔮 미래지식 작동점:</b> ${esc(m.regress)}</p>`,
      `<p><b>🌫️ 감각 디테일:</b> ${esc(m.detail)}</p>`,
      `<p><b>✍️ 후킹 한 줄:</b> ${esc(m.hook)}</p>`,
      note ? `<hr/><p><b>메모:</b> ${esc(note)}</p>` : '',
      ...custom.filter((c) => c.label.trim() && c.value.trim()).map((c) => `<p><b>${esc(c.label.trim())}:</b> ${esc(c.value.trim())}</p>`),
      etc.trim() ? `<p><b>기타:</b> ${esc(etc.trim())}</p>` : '',
      `<hr/><p style="line-height:1.7;white-space:pre-wrap;">${esc(compose(m))}</p>`,
    ].filter(Boolean).join('')
    const character: Record<string, string> = {
      name: m.place,
      type: '현대판타지·회귀 무대',
      time: m.time,
      mood: m.mood,
      system: m.system,
      power: m.power,
      regress: m.regress,
      sensory: m.detail,
      hook: m.hook,
      // 정규 키(장소) — 받는 허브가 기본 칸에 바로 꽂도록 표준화(기존 키 유지 + 추가)
      kind: '현대판타지·회귀 무대',
      atmosphere: m.mood,
      rules: m.system,
      inhabitants: m.power,
      history: m.time,
      secrets: m.regress,
    }
    if (note) character.notes = note
    const character2 = mergeExtraFields(character)
    const id = addToProject({
      kind: 'setting',
      root: 'research',
      folder: '장소',
      title: `무대 · ${m.place}`,
      bodyHtml,
      character: character2,
      meta: { 유형: '현대판타지·회귀 무대', 시간좌표: m.time, 분위기: m.mood, 출처: '회귀 배경·현장 생성기' },
    })
    flashToast(id ? `‘${m.place}’ 무대를 프로젝트(자료 › 장소)에 추가했어요` : '프로젝트에 추가하지 못했습니다.')
  }

  // ── 관련 도구 ──
  const RELATED: { id: string; icon: string; label: string }[] = [
    { id: 'setting-bible', icon: '🗺️', label: '배경 설정집' },
    { id: 'world-wiki', icon: '📚', label: '세계관 위키' },
    { id: 'scene-list', icon: '🎬', label: '장면 목록' },
    { id: 'sensory-palette', icon: '🎨', label: '감각 팔레트' },
    { id: 'story-dice', icon: '🎲', label: '스토리 주사위' },
  ]
  const openRelated = (id: string) => openToolLinked(id, ctxGenre ? { genre: ctxGenre } : undefined)

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 12, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const introStyle: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const badge: React.CSSProperties = { display: 'inline-block', fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px', marginLeft: 6 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }
  const slotCard: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px' }
  const secTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }
  const savedRow: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }
  const noteInput: React.CSSProperties = { flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 12, outline: 'none' }

  return (
    <div style={wrap}>
      <div style={introStyle}>
        회귀물의 <b>무대</b>를 8개 슬롯으로 조합합니다. 마음에 드는 칸은 <Emoji e="🔒"/>로 잠그고 나머지만 <Emoji e="🎲"/> 재생성하세요.
        {ctxGenre && <span style={badge}>장르: {ctxGenre}</span>}
      </div>
      <div style={{ fontSize: 11, color: 'var(--ok)', fontWeight: 700 }}>
        가능한 무대 조합 약 <b>{fmtCombos(combos)}</b><span style={{ color: 'var(--muted)', fontWeight: 400 }}> ({combos.toLocaleString()})</span>
      </div>

      {/* 슬롯들 */}
      <div style={body}>
        {SLOTS.map((s) => {
          const v = map?.[s.key] || ''
          const isLocked = !!locks[s.key]
          const shimmer = rolling && !isLocked
          return (
            <div key={s.key} style={slotCard}>
              <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: shimmer ? 'rotate(-10deg) scale(1.12)' : 'none' }}>
                <Emoji e={s.icon}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.45, color: v ? 'var(--text)' : 'var(--muted)', wordBreak: 'keep-all' }}>
                  {v ? (shimmer ? '…' : v) : '— 굴려주세요 —'}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                <button className="minibtn" onClick={() => rollOne(s.key)} title="이 칸만 다시 굴리기" disabled={isLocked}><Emoji e="🎲"/></button>
                <button
                  className="minibtn"
                  onClick={() => toggleLock(s.key)}
                  title={isLocked ? '고정 해제' : '이 칸 고정'}
                  style={{ borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}
                >
                  {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                </button>
              </div>
            </div>
          )
        })}

        {/* 사용자 정의 항목 */}
        <div style={secTitle}>
          <span><Emoji e="➕"/> 사용자 정의 항목 ({custom.length})</span>
          <button className="minibtn" onClick={addCustom} title="새 항목 추가">＋ 항목 추가</button>
        </div>
        {custom.map((c) => (
          <div key={c.id} style={slotCard}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{c.label}</div>
              <input
                style={{ ...noteInput, width: '100%', boxSizing: 'border-box' }}
                value={c.value}
                placeholder="직접 입력하세요"
                onChange={(e) => setCustomValue(c.id, e.target.value)}
              />
            </div>
            <button className="minibtn" style={{ flexShrink: 0 }} onClick={() => removeCustom(c.id)} title="이 항목 삭제">✕</button>
          </div>
        ))}

        {/* 고정 '기타' 자유 입력 */}
        <div style={slotCard}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}><Emoji e="📝"/> 기타</div>
            <textarea
              style={{ ...noteInput, width: '100%', boxSizing: 'border-box', minHeight: 64, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }}
              value={etc}
              placeholder="자유롭게 적어 두세요 (메모·아이디어·추가 설정 등)"
              onChange={(e) => setEtc(e.target.value)}
            />
          </div>
        </div>

        {/* 즐겨찾기 영역 */}
        <div style={secTitle}>
          <span><Emoji e="⭐"/> 저장한 무대 ({saved.length})</span>
          <button className="minibtn" onClick={() => setShowSaved((v) => !v)}>{showSaved ? '접기' : '펼치기'}</button>
        </div>
        {showSaved && (
          saved.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--muted)' }}>아직 저장한 무대가 없습니다. 마음에 드는 조합을 <Emoji e="⭐"/>로 저장해 보세요.</div>
            : saved.map((s) => (
              <div key={s.id} style={savedRow}>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}><Emoji e="🏙️"/> {s.map.place}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>{s.map.time} · {s.map.regress}</div>
                {editId === s.id ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      style={noteInput}
                      value={editText}
                      placeholder="메모(선택)"
                      autoFocus
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditId(''); setEditText('') } }}
                    />
                    <button className="minibtn" onClick={commitEdit}>저장</button>
                  </div>
                ) : (
                  s.note && <div style={{ fontSize: 12, color: 'var(--text)', fontStyle: 'italic' }}><Emoji e="📝"/> {s.note}</div>
                )}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="minibtn" onClick={() => loadSaved(s)}>불러오기</button>
                  <button className="minibtn" onClick={() => startEdit(s)}>메모</button>
                  <button className="linkbtn" onClick={() => toLibrary(s.map, s.note)} title="공유 장소 라이브러리에 추가"><Emoji e="📍"/> 장소</button>
                  <button className="linkbtn" onClick={() => toProject(s.map, s.note)} disabled={!linked} title={linked ? '프로젝트 자료에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트</button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제"><Emoji e="🗑️"/></button>
                </div>
              </div>
            ))
        )}
      </div>

      {/* 액션 바 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, minWidth: 130 }} onClick={roll}>
          <Emoji e="🎲"/> 무대 생성{lockedCount > 0 ? <> (<Emoji e="🔒"/>{lockedCount} 고정)</> : ''}
        </button>
        <button className="minibtn" onClick={copyText} disabled={!map}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
        <button className="minibtn" onClick={saveSetting} disabled={!map}><Emoji e="⭐"/> 저장</button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="linkbtn" onClick={() => map && toLibrary(map)} disabled={!map} title="현재 무대를 공유 장소 라이브러리에 추가"><Emoji e="📍"/> 장소 라이브러리</button>
        <button className="linkbtn" onClick={() => map && toSnippet(map)} disabled={!map} title="현재 무대 글감을 스니펫으로 저장"><Emoji e="🔖"/> 스니펫</button>
        <button
          className="linkbtn"
          onClick={() => map && toProject(map)}
          disabled={!map || !linked}
          title={linked ? '현재 무대를 프로젝트 자료 › 장소에 설정 카드로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
      </div>

      {/* 관련 도구 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
        {RELATED.map((r) => (
          <button key={r.id} className="minibtn" style={{ fontSize: 11 }} onClick={() => openRelated(r.id)} title={`${r.label} 열기`}>
            <Emoji e={r.icon}/> {r.label}
          </button>
        ))}
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center', fontWeight: 600 }}>{toast}</div>}
    </div>
  )
}
