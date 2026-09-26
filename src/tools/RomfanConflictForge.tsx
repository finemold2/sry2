// 로판 갈등·딜레마 단조기 — 로맨스판타지(로판) 도시에에 근거한 "이 장르다운 갈등 구도" 슬롯 조합 생성기.
//  여주(POV) · 남주(상대) · 회빙환 처지(시간/세계 비대칭) · 가로막는 신분·운명의 장벽 · 원작 강제력(정해진 결말)
//  · 고구마(억울함의 원천) · 사랑의 딜레마(둘 다 못 가지는 가치) · Black Moment(파국의 씨앗) · 사이다(역전의 무대)
//  · 비틀기(클리셰 전복) · 무대(로판 하위유형). 슬롯별 🔒 잠금 + 부분 재생성, 전체 조합수 표시(1조 이상).
//  로판 계약(여주 주체성·온리유 남주·사이다 보장·해피엔딩)에 맞춰 "관계와 운명을 동시에 시험하는" 갈등을 한 줄로 조립.
//  연계: addToProject(folder:'갈등') 문서 추가 · addToLibrary('snippets') 글감 저장 · 관련 도구 열기.
//  자급식: react · './linkbus' 외 import 없음. 전부 로컬. localStorage 'sry:tool:romfan-conflictforge'.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'romfan-conflictforge', name: '로판 갈등 단조기', icon: '👑', group: '생성기', genre: '로맨스판타지', intro: '회빙환·악역영애·신분차·원작강제력·집착·고구마/사이다로 로판다운 갈등과 운명의 딜레마를 무작위 단조', w: 620, h: 720 }

// ── 로판 도시에 기반 슬롯 풀(장르 특화·구체) ──
// 1) 여주(POV) — 로판 관습의 시점 인물 원형(회귀/빙의/환생/악역영애/육아/계약 등)
const HEROINE = [
  '처형당한 황후로 회귀해 이번엔 그를 버리기로 결심한 여인',
  '읽던 소설 속 파멸 예정 악역 영애에 빙의한 현대인',
  '버림받고 이혼당한 뒤 결혼 전으로 회귀한 공작부인',
  '엑스트라 조연으로 빙의해 조용히 살아남으려는 평민 시녀',
  '신성력을 숨긴 채 천대받는 서녀로 자란 백작가 영애',
  '죽은 줄 알았다가 잊힌 황녀로 신분이 밝혀진 떠돌이 소녀',
  '계약 결혼으로 차가운 대공가에 들어간 몰락 귀족 영애',
  '딸바보 기사들에게 둘러싸여 다시 태어난 다섯 살 황녀',
  '원작 결말을 아는 채 파멸 플래그를 피하려는 공녀',
  '저주받은 가문의 마지막 핏줄로 태어난 마탑의 견습생',
  '전생의 기억을 안고 황태자비 후보로 입궁한 후작 영애',
  '정략결혼 첫날밤 회귀를 깨닫고 도망치려는 신부',
  '죽은 언니를 대신해 황궁에 들어간 쌍둥이 동생',
  '예언 속 "그 아이"로 지목된 신전의 성녀 후보',
  '전생 지식으로 영지 경영에 뛰어든 망해가는 영지의 영애',
  '정령과 계약한 채 평민으로 숨어 살던 잊힌 대공녀',
  '악녀로 소문났지만 사실 누명을 쓴 비운의 황비',
  '회귀 전 자신을 죽인 자가 누구인지 아는 채 돌아온 황녀',
  '신분을 숨기고 아카데미에 입학한 가짜 남장 영애',
  '남주의 약혼녀 자리를 떠맡은, 원작엔 없던 변수 같은 여인',
  '시한부 선고를 숨긴 채 황실에 시집온 병약한 영애',
  '고대 혈통의 힘이 각성한, 버려진 사생아 출신 소녀',
]

// 2) 남주(상대역) — 알파/집착/상처/후회/계약 상대 등 로판 남주 원형
const HERO = [
  '한 번 정한 사람은 절대 놓지 않는 집착성 황제',
  '회귀 전 그녀를 처형대로 보낸 차가운 황태자',
  '비밀을 품고 늘 거리를 두는 어둠의 대공',
  '원수 가문의 유일한 후계자인 검의 공작',
  '겉은 다정한 신사, 속은 광기 어린 후작',
  '신성력을 두려워하면서도 그녀에게만 약해지는 신관',
  '평민으로 위장해 마을에 숨어든 제국의 황자',
  '연애엔 무심하다 소문난 천재 마탑주',
  '죽은 줄 알았던, 신분을 바꾼 채 곁에 선 전 약혼자',
  '말없이 그녀를 지켜온 충직한 호위 기사단장',
  '복수를 위해 그녀에게 접근한 황가의 사생아',
  '정략혼 상대로 떠밀려 온 무뚝뚝한 변경백',
  '소설 속에서 여주의 파멸을 설계한 흑막 황자',
  '얼음장 같은 얼굴로 그녀의 호위를 자처한 정령왕',
  '그녀가 살린 짐승이 사람으로 변한 고대의 수호자',
  '딸바보가 되어버린, 무서운 소문의 외삼촌 대공',
  '약혼 파기를 선언했다가 뒤늦게 후회하는 황태자',
  '저주에 걸려 밤마다 모습이 변하는 비운의 공작',
  '그녀의 정체를 알면서도 모른 척 곁을 지키는 재상',
  '평생 한 번도 마음을 준 적 없다는 냉혈한 검술 교관',
  '신탁이 점지한 그녀의 운명의 짝이라는 성자',
  '아카데미에서 그녀를 라이벌로 여기는 자존심 강한 공자',
]

// 3) 회빙환 처지(시간·세계의 비대칭) — 로판 최강 엔진: 여주만 아는 미래/원작
const TIMELINE = [
  '죽기 직전으로 회귀해 미래의 비극을 혼자만 알고 있다',
  '읽던 소설 속에 빙의해 모든 인물의 결말을 알고 있다',
  '두 번째 삶이라 같은 실수를 반복하지 않으려 발버둥친다',
  '환생해 전생의 원한과 사랑을 동시에 품고 있다',
  '회귀 전 자신을 죽인 자가 누구인지 똑똑히 기억한다',
  '원작에서 이 남자는 다른 여주인공의 차지였음을 안다',
  '미래에 닥칠 가문의 몰락과 전쟁을 미리 알고 있다',
  '전생의 죽음이 트라우마로 남아 특정 인물을 본능적으로 불신한다',
  '같은 시점을 여러 번 반복하며 결말을 바꾸려 안간힘 쓴다',
  '빙의한 몸의 원래 주인이 저지른 악행의 빚을 떠안았다',
  '미래 지식(요리·사업·의술)으로 판도를 뒤집을 패를 쥐었다',
  '회귀한 사람이 자신만이 아닐지 모른다는 의심에 휩싸였다',
  '원작에선 처형/추방당할 악역의 운명을 짊어지고 있다',
  '전생의 연인을 이번 생에서 알아보지 못한 채 다시 만났다',
]

// 4) 가로막는 신분·운명의 장벽 — 관계를 가로막는 로판 특화 장벽
const BARRIER = [
  '하늘과 땅 차이의 신분(평민과 황족, 서녀와 정실)',
  '서로의 가문이 대를 이은 원수지간이라는 사실',
  '한쪽이 곧 다른 사람과 정략결혼을 앞두고 있는 것',
  '상대가 자신의 가문을 멸문시킨 장본인이라는 과거',
  '신관·성녀의 금욕 서약, 혹은 황실의 혼인 규율',
  '회귀/빙의로 알게 된 "이 사람이 나를 죽인다"는 결말',
  '신성력과 마기처럼 상극인 두 힘을 타고난 운명',
  '계약 결혼이라는 명분이 진심을 자꾸 가로막는 것',
  '연인을 잃은 트라우마로 사랑에 빗장을 건 마음',
  '저주/예언이 "둘이 맺어지면 파멸한다"고 못 박은 것',
  '복수를 위해 접근했다는, 들키면 끝장날 비밀',
  '한쪽이 신분/정체/성별을 속이고 있다는 것',
  '오해로 쌓인 깊은 미움이 진심을 가리고 있는 것',
  '딸/혈육을 지키려면 사랑을 포기해야 하는 처지',
  '과거의 배신이 남긴, 다시는 못 믿겠다는 상처',
  '사교계의 추문과 악녀라는 누명이 두 사람을 떼어놓는 것',
  '한쪽이 곧 멀리(전장·왕위·신전) 떠나야 하는 운명',
  '신분제의 자기검열("나는 그를 가질 자격이 없다")',
  '첫사랑/죽은 약혼자의 그림자가 둘 사이에 드리운 것',
  '황권을 쥔 제3자가 두 사람의 혼인을 금지한 것',
]

// 5) 원작 강제력(정해진 결말의 압력) — 로판 고유: 운명을 비틀려는 시도에 저항하는 세계
const FATEFORCE = [
  '아무리 피해도 원작의 처형 장면으로 사건이 다시 흘러간다',
  '바꾼 줄 알았던 미래가 형태만 달리한 채 똑같이 반복된다',
  '여주가 행동을 바꿀수록 원작 강제력이 더 강하게 반작용한다',
  '신탁이 예언한 비극을 막으려는 시도 자체가 비극을 부른다',
  '회귀로 살린 사람의 자리를 대신해 자신이 죽어야 할 운명이 된다',
  '원작 남주와 원작 여주의 만남을 막자 세계가 뒤틀리기 시작한다',
  '"정해진 결말"을 거부할수록 사랑하는 이가 위험에 빠진다',
  '바꾼 미래의 대가로 알 수 없는 새 비극의 씨앗이 자란다',
  '예언서의 마지막 장만은 누구도 읽지 못해 결말이 안갯속이다',
  '운명을 거스른 죄로 신/성좌가 직접 개입해 시험을 내린다',
  '원작 지식이 어느 분기부터 더는 들어맞지 않아 길을 잃는다',
  '"그 아이"라는 예언이 축복인지 저주인지 끝까지 모호하다',
  '시간을 되돌릴 마지막 기회가 단 한 번뿐이라는 제약',
  '죽음의 플래그가 다른 인물에게로 옮겨붙어 선택을 강요한다',
]

// 6) 고구마(억울함의 원천) — 도시에: 사이다를 위해 깔되 짧고 분명히 청산해야 하는 압박
const POTATO = [
  '누명을 쓰고도 진실을 입증할 증거가 손에 없는 처지',
  '회귀/빙의 사실을 아무도 믿어주지 않아 미친 사람 취급받는 것',
  '악녀로 소문나 무도회·사교계에서 공공연히 모욕당하는 것',
  '정실/적녀에게 공을 빼앗기고 서녀라 무시당하는 것',
  '남주가 오해해 차갑게 등을 돌린 채 해명을 듣지 않는 것',
  '가문/황실 어른들의 정략에 의해 의사를 무시당하는 것',
  '연적의 모함으로 죄를 뒤집어쓰고 추방 위기에 몰리는 것',
  '신성력을 의심받아 가짜 성녀로 몰리는 것',
  '아끼던 사람에게 배신당해 홀로 모든 책임을 떠안는 것',
  '능력을 숨겨야 해서 무능한 척 멸시를 견뎌야 하는 것',
  '진심이 번번이 곡해되어 더 미움받게 되는 어긋남',
  '미래를 알면서도 권력이 없어 비극을 막지 못하는 무력감',
  '계약 관계라는 이유로 진짜 아내/연인 대접을 못 받는 것',
  '제 손으로 키운 호감도가 엉뚱한 라이벌에게로 향하는 것',
]

// 7) 사랑의 딜레마 — 둘 다 가질 수 없는 가치 사이의 선택(주체성·희생의 도시에)
const DILEMMA = [
  '사랑을 택하면 가문이, 가문을 택하면 사랑이 무너진다',
  '그를 살리려면 회귀로 돌아온 자신이 다시 죽어야 한다',
  '복수를 완성하면 사랑하게 된 바로 그 사람이 파멸한다',
  '진실(회빙환·정체)을 고백하면 사랑을, 숨기면 양심을 잃는다',
  '그를 지키려면 그가 가장 미워하는 악녀가 되어야 한다',
  '신성력으로 세상을 구하려면 사랑을 제물로 바쳐야 한다',
  '딸/혈육을 지키려면 그를 떠나보내야 한다',
  '황위/권력을 포기해야만 그 사람과 함께할 수 있다',
  '그의 정략혼을 막으면 두 제국이 전쟁에 빠진다',
  '원작대로 두면 그가 행복하고, 비틀면 그가 위험해진다',
  '그를 자유롭게 놓아주는 것이 가장 그를 사랑하는 길이다',
  '신분을 밝히면 사랑이, 숨기면 그와의 미래가 거짓이 된다',
  '그의 비밀을 폭로하면 정의가, 덮으면 사랑이 지켜진다',
  '예언을 거스르면 사랑을 얻지만 세상이 멸망할지 모른다',
  '그를 믿으면 또 배신당할지 모르고, 안 믿으면 영영 잃는다',
  '세상의 인정을 얻으려면 사랑을 숨겨야 하고, 사랑하면 모든 걸 잃는다',
  '그의 행복을 위해 원작 여주에게 그를 양보해야 할지 모른다',
  '진심을 말하면 운명이 틀어지고, 침묵하면 평생 후회한다',
]

// 8) Black Moment(파국의 씨앗) — 클라이맥스 직전, 관계가 끝장난 듯한 최저점의 방아쇠
const BLACKMOMENT = [
  '숨겨온 비밀(회빙환·복수·정체)이 최악의 순간에 폭로된다',
  '오해가 폭발해 "다 끝났다"며 서로 등을 돌린다',
  '원작 여주/약혼자의 등장으로 그가 떠나는 것처럼 보인다',
  '그를 지키려 한 거짓말이 배신으로 오해받는다',
  '가문·황실의 압력에 못 이겨 약혼 파기를 통보당한다',
  '회귀 전의 처형/죽음이 또 반복되려는 듯한 절망의 순간',
  '한쪽이 상대를 위해 일부러 악녀를 자처하고 사라진다',
  '저주/시한부가 발현되어 영영 헤어질 위기에 몰린다',
  '진심 어린 고백이 최악의 타이밍에 거절당한다',
  '신성력이 폭주하거나 봉인되어 모든 것을 잃을 위기에 처한다',
  '"널 사랑한 적 없다"는 마음에도 없는 말로 관계를 끊는다',
  '과거의 상처가 되살아나 스스로 사랑할 자격이 없다 믿는다',
  '황권을 쥔 자가 두 사람을 떼어놓으려 결정적 수를 쓴다',
  '기억을 잃거나 다른 시간선으로 끌려가 함께한 모든 것이 지워진다',
]

// 9) 사이다(역전의 무대) — 도시에: 억울함을 분명히 청산하는 통쾌한 공개 역전 장치
const VICTORY = [
  '만조백관·사교계 앞에서 악역의 죄를 낱낱이 폭로하고 공인받는다',
  '황제가 만인 앞에서 그녀를 황후/정실로 지목해 신분을 뒤집는다',
  '숨겨온 신성력/혈통이 각성해 가짜를 무릎 꿇린다',
  '미래 지식으로 일군 사업·영지가 가문의 콧대를 꺾는다',
  '남주가 신분과 정치적 손해를 감수하고 "내 사람"이라 공표한다',
  '회귀 전의 가해자가 제 꾀에 넘어가 자업자득으로 자멸한다',
  '누명의 결정적 증거가 만천하에 드러나 단숨에 명예를 회복한다',
  '약혼 파기를 선언한 자가 무릎 꿇고 매달리지만 단칼에 거절한다',
  '딸바보 보호자들이 한꺼번에 나서 그녀를 모욕한 자를 응징한다',
  '예언 속 "그 아이"임이 신전에서 공식 선포되어 판이 뒤집힌다',
  '원작 강제력을 깨고 "정해진 죽음" 대신 정반대의 결말을 쟁취한다',
  '연적/흑막의 음모를 역이용해 그들의 무대에서 되갚아 준다',
  '재판/연회에서 침착한 한마디로 좌중을 압도하며 진실을 세운다',
  '버려졌던 출신이 사실 가장 고귀한 혈통임이 만천하에 밝혀진다',
]

// 10) 비틀기(클리셰 전복) — 로판 클리셰를 한 번 꼬는 변주 포인트
const TWIST = [
  '냉혹한 그가 사실 그녀보다 먼저 회귀해 줄곧 그녀만 지켜왔다',
  '복수의 대상이 알고 보니 회귀 전 자신을 구하려다 누명 쓴 은인이었다',
  '"이 남자가 나를 죽인다"던 원작 결말은 흑막이 조작한 거짓이었다',
  '계약 결혼 상대가 사실 전생의 잊지 못한 그 사람이었다',
  '차갑게 밀어내던 행동이 원작 강제력으로부터 그녀를 지키려는 희생이었다',
  '죽은 줄 알았던 약혼자가 신분을 바꾼 채 호위 기사로 곁에 있었다',
  '연적이라 여긴 영애가 실은 두 사람을 이어준 또 다른 회귀자였다',
  '회귀한 사람은 여주가 아니라 남주였다는 사실이 드러난다',
  '그가 잊은 줄 알았던 어린 시절 첫 만남을 평생 기억하고 있었다',
  '정략혼 상대가 바로 신탁이 점지한 운명의 짝이었다',
  '"사랑하지 않는다"던 말이 그의 가장 큰 거짓말이었다',
  '두 사람의 만남 자체가 신/성좌가 오래전부터 설계한 인연이었다',
  '집착으로 보였던 모든 행동에 회귀 전의 가슴 아픈 사연이 있었다',
  '그녀가 미워한 과거의 그는 다른 황자의 죄를 뒤집어쓴 것이었다',
  '평민으로 위장한 그가 알고 보니 가장 높은 황좌의 주인이었다',
  '악역 영애라 믿었던 자신이 실은 원작의 진짜 주인공이었다',
  '저주를 풀 열쇠가 둘의 이별이 아니라 둘의 결합이었다',
]

// 11) 무대(로판 하위유형) — 갈등이 펼쳐지는 로판 무대
const STAGE = [
  '음모가 들끓는 황실과 사교계의 무도회장(서양 제국 로판)',
  '회귀 전 비극이 벌어졌던 그 운명의 황궁(회귀물)',
  '원작 소설 속 파멸이 예정된 귀족 영애의 저택(책빙의)',
  '신성력과 마기가 교차하는 마탑과 신전(성좌·신물물)',
  '딸바보 보호자들이 북적이는 따뜻한 대공저(육아 로판)',
  '계약과 정략이 얽힌 차가운 대공가의 신혼집(계약 결혼)',
  '후궁의 암투가 끓어오르는 동양풍 황실(동양풍 로판)',
  '신분을 숨긴 영애들이 겨루는 황립 아카데미(아카데미물)',
  '전생 지식으로 일군 영지와 상단의 경영 전쟁터(영지 경영물)',
  '저주와 죽음이 반복되는 어둠의 가문의 고성(다크 로판)',
  '첫사랑의 기억이 잠든 변방의 작은 영지(힐링 로판)',
  '예언과 성녀 선발이 벌어지는 거대 신전(성녀물)',
  '신분을 숨긴 황자가 머무는 평민 마을(신분 위장)',
  '전쟁과 정략혼이 교차하는 제국 격변기(시대극 로판)',
  '폭설에 갇힌 외딴 사냥터 별궁(강제 동거)',
  '약혼식과 즉위식으로 북적이는 화려한 황궁 연회장',
]

interface Slot { key: string; label: string; icon: string; pool: string[] }
const SLOTS: Slot[] = [
  { key: 'heroine', label: '여주(POV)', icon: '👸', pool: HEROINE },
  { key: 'hero', label: '남주(상대역)', icon: '🤴', pool: HERO },
  { key: 'timeline', label: '회빙환 처지', icon: '⏳', pool: TIMELINE },
  { key: 'barrier', label: '신분·운명의 장벽', icon: '🧱', pool: BARRIER },
  { key: 'fate', label: '원작 강제력', icon: '📜', pool: FATEFORCE },
  { key: 'potato', label: '고구마(억울함)', icon: '🥔', pool: POTATO },
  { key: 'dilemma', label: '사랑의 딜레마', icon: '⚖️', pool: DILEMMA },
  { key: 'black', label: '파국의 순간', icon: '💔', pool: BLACKMOMENT },
  { key: 'victory', label: '사이다(역전)', icon: '🥤', pool: VICTORY },
  { key: 'twist', label: '비틀기(반전)', icon: '🔮', pool: TWIST },
  { key: 'stage', label: '무대', icon: '🏰', pool: STAGE },
]

// 조합수 = 각 슬롯 풀 크기의 곱(핵심 생성기 — 1조 이상 지향)
const COMBOS = SLOTS.reduce((acc, s) => acc * s.pool.length, 1)

const LS_KEY = 'sry:tool:romfan-conflictforge'
const ri = (n: number) => Math.floor(Math.random() * n)
const pick = (a: string[], avoid?: string) => {
  if (a.length <= 1) return a[0]
  let v = a[ri(a.length)]
  if (avoid !== undefined && v === avoid) v = a[ri(a.length)]
  return v
}

type Result = Record<string, string>

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 한 줄 로판 갈등 문장 조립 — 회빙환 처지 → 끌림과 장벽 → 원작강제력/딜레마 → 파국 → 사이다 흐름.
function summarize(r: Result): string {
  const heroine = (r.heroine || '여주').replace(/[.。]$/, '')
  const hero = (r.hero || '남주').replace(/[.。]$/, '')
  const timeline = (r.timeline || '').replace(/[.。]$/, '')
  const barrier = (r.barrier || '').replace(/[.。]$/, '')
  const fate = (r.fate || '').replace(/[.。]$/, '')
  const potato = (r.potato || '').replace(/[.。]$/, '')
  const dilemma = (r.dilemma || '').replace(/[.。]$/, '')
  const black = (r.black || '').replace(/[.。]$/, '')
  const victory = (r.victory || '').replace(/[.。]$/, '')
  const stage = (r.stage || '').replace(/[.。]$/, '')
  let s = `${stage ? stage + '. ' : ''}${heroine}`
  if (timeline) s += `는 ${timeline}.`
  else s += '의 이야기.'
  s += ` 그런 그녀 앞에 ${hero}가 나타나 마음을 뒤흔들지만`
  if (barrier) s += `, 둘 사이엔 ${barrier}(이)라는 장벽이 가로놓여 있다.`
  else s += ', 둘 사이엔 쉽게 넘을 수 없는 장벽이 있다.'
  if (fate) s += ` 게다가 ${fate}.`
  if (potato) s += ` 그 와중에 ${potato}.`
  if (dilemma) s += ` 끝내 그녀는 선택을 강요받는다 — ${dilemma}.`
  if (black) s += ` 그리고 ${black}, 모든 게 끝장난 듯 보인다.`
  if (victory) s += ` 하지만 결국 ${victory}.`
  return s
}

// 저장된 즐겨찾기(고정 조합) 항목
interface Saved { id: string; result: Result; createdAt: number }

function loadSaved(): Saved[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.saved) ? p.saved : Array.isArray(p) ? p : []
    return arr
      .filter((x: any) => x && typeof x === 'object' && x.result && typeof x.result === 'object')
      .map((x: any) => ({ id: String(x.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7))), result: x.result as Result, createdAt: Number(x.createdAt) || Date.now() }))
  } catch { return [] }
}

export default function RomfanConflictForge({ payload }: { payload?: Record<string, unknown> }) {
  const genreLabel = typeof payload?.genre === 'string' ? (payload.genre as string) : '로맨스판타지'

  const [result, setResult] = useState<Result>(() => {
    const r: Result = {}
    SLOTS.forEach((s) => { r[s.key] = pick(s.pool) })
    return r
  })
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)
  const [toast, setToast] = useState('')
  const [saved, setSaved] = useState<Saved[]>(() => loadSaved())
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 저장 목록 영속화 — 차단/용량초과 graceful
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ saved })) }
    catch { if (mounted.current) setToast('이 브라우저에서 저장이 막혀 있어요.') }
  }, [saved])

  // 토스트 자동 소거 + 언마운트 정리
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1900)
    return () => window.clearTimeout(t)
  }, [toast])

  // 굴림 애니메이션 자동 해제 + 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 360)
    return () => window.clearTimeout(t)
  }, [rolling])

  const rollAll = useCallback(() => {
    setRolling(true)
    setResult((prev) => {
      const next: Result = { ...prev }
      SLOTS.forEach((s) => { if (!locked[s.key]) next[s.key] = pick(s.pool, prev[s.key]) })
      return next
    })
  }, [locked])

  const rollOne = (key: string) => {
    const slot = SLOTS.find((s) => s.key === key)
    if (!slot) return
    setResult((prev) => ({ ...prev, [key]: pick(slot.pool, prev[key]) }))
  }
  const toggleLock = (key: string) => setLocked((l) => ({ ...l, [key]: !l[key] }))

  const summary = summarize(result)

  const plainText = () => {
    const lines = SLOTS.map((s) => `${s.icon} ${s.label}: ${result[s.key]}`).join('\n')
    return `[로판 갈등]\n${lines}\n\n✍️ ${summary}`
  }

  const copy = () => {
    const text = plainText()
    const done = () => { if (mounted.current) setToast('복사했습니다') }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setToast('복사 실패') }
  }

  // 즐겨찾기 저장(현재 조합 고정)
  const star = () => {
    setSaved((prev) => [{ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), result: { ...result }, createdAt: Date.now() }, ...prev].slice(0, 40))
    setToast('즐겨찾기에 저장했습니다')
  }
  const loadSavedItem = (s: Saved) => { setResult({ ...s.result }); setLocked({}); setToast('불러왔습니다') }
  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))

  // 연계: 갈등 글감을 라이브러리 스니펫으로
  const toSnippet = () => {
    addToLibrary('snippets', { text: summary, source: '로판 갈등 단조기', tags: ['로맨스판타지', '갈등', result.heroine || ''].filter(Boolean) })
    setToast('글감 라이브러리(스니펫)에 저장했습니다')
  }

  // 연계: 프로젝트 자료 〈갈등〉 폴더에 문서로
  const toProject = () => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다'); return }
    const rows = SLOTS.map((s) => `<p><b>${escHtml(s.icon)} ${escHtml(s.label)}</b><br>${escHtml(result[s.key])}</p>`).join('')
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.7;"><b>✍️ ${escHtml(summary)}</b></p>`,
      `<hr/>`,
      rows,
    ].join('')
    const title = `로판 갈등 — ${(result.heroine || '여주').slice(0, 16)} ✕ ${(result.hero || '남주').slice(0, 16)}`
    const id = addToProject({
      kind: 'text', root: 'research', folder: '갈등',
      title, bodyHtml, synopsis: summary,
      meta: {
        장르: genreLabel,
        무대: result.stage || '—',
        장벽: (result.barrier || '—').slice(0, 40),
        딜레마: (result.dilemma || '—').slice(0, 40),
        원작강제력: (result.fate || '—').slice(0, 40),
      },
    })
    setToast(id ? '프로젝트 자료 〈갈등〉 폴더에 추가했습니다 (바인더·DB 확인)' : '프로젝트에 추가하지 못했습니다')
  }

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 8, padding: 12, boxSizing: 'border-box', color: 'var(--text)', background: 'var(--paper)', overflow: 'auto' }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
  const slotRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="👑"/></span>
        <strong style={{ fontSize: 14 }}>로판 갈등 단조기</strong>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }} title="모든 슬롯 풀 조합의 경우의 수">
          약 {COMBOS.toLocaleString()} 조합
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
        회빙환·악역영애·신분차·<b>원작 강제력</b>·집착·<b>고구마/사이다</b> 등 로판 도시에에 근거한 <b>갈등 구도</b> 슬롯을 굴립니다. 운명(회빙환·원작 강제력)과 관계(끌림·장벽·딜레마)를 동시에 시험하는 로판다운 갈등에 초점을 맞췄어요. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 단조하세요.
      </div>

      {/* 슬롯 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {SLOTS.map((s) => {
          const isLocked = !!locked[s.key]
          return (
            <div key={s.key} style={slotRow}>
              <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-10deg) scale(1.15)' : 'none' }}><Emoji e={s.icon}/></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{s.label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
                  {rolling && !isLocked ? '…' : result[s.key]}
                </div>
              </div>
              <button className="minibtn" title={isLocked ? '고정 해제' : '이 슬롯 고정'} onClick={() => toggleLock(s.key)} style={{ flexShrink: 0, padding: '2px 6px', borderColor: isLocked ? 'var(--accent)' : 'var(--border)', color: isLocked ? 'var(--accent)' : 'var(--muted)' }}>{isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
              <button className="minibtn" title="이 슬롯만 다시" onClick={() => rollOne(s.key)} disabled={isLocked} style={{ flexShrink: 0, padding: '2px 6px' }}><Emoji e="🎲"/></button>
            </div>
          )
        })}
      </div>

      {/* 조합 한 줄 요약 */}
      <div style={{ background: 'var(--chrome-2)', border: '1px solid var(--accent)', borderRadius: 10, padding: '11px 13px' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}><Emoji e="📝"/> 로판 갈등 한 줄 요약</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.65 }}>{summary}</div>
      </div>

      {/* 조작 버튼 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, minWidth: 130 }} onClick={rollAll}><Emoji e="👑"/> 갈등 단조하기</button>
        <button className="minibtn" onClick={copy}><Emoji e="📋"/> 복사</button>
        <button className="minibtn" onClick={star} title="현재 조합을 즐겨찾기에 저장"><Emoji e="⭐"/> 저장</button>
      </div>

      {/* 연계 */}
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '이 갈등을 프로젝트 자료 〈갈등〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={toSnippet}><Emoji e="📥"/> 글감 라이브러리</button>
        <button className="linkbtn" onClick={() => openToolLinked('conflict-builder', { character: result.heroine, desire: `${result.hero}와(과) 맺어지고 운명을 비트는 것`, obstacle: result.barrier, stakes: result.black })} title="갈등 설계기로 보내 더 다듬기"><Emoji e="⚔️"/> 갈등 설계기</button>
        <button className="linkbtn" onClick={() => openToolLinked('romance-conflictforge', { genre: genreLabel })} title="일반 로맨스 갈등 단조기 열기"><Emoji e="💔"/> 로맨스 갈등</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck')} title="반전 카드 더 보기"><Emoji e="🔮"/> 반전 카드</button>
        <button className="linkbtn" onClick={() => openToolLinked('emotion-arc')} title="감정 곡선으로 관계 진척 설계"><Emoji e="📈"/> 감정 곡선</button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--ok)', textAlign: 'center' }}>{toast}</div>}

      {/* 즐겨찾기 목록 */}
      {saved.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5, fontWeight: 600 }}><Emoji e="⭐"/> 저장된 갈등 {saved.length}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {saved.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 9px' }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={summarize(s.result)}>{summarize(s.result)}</span>
                <button className="minibtn" style={{ flexShrink: 0, padding: '2px 6px', fontSize: 11 }} onClick={() => loadSavedItem(s)} title="불러오기">↻</button>
                <button className="minibtn" style={{ flexShrink: 0, padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={() => removeSaved(s.id)} title="삭제"><Emoji e="🗑️"/></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
