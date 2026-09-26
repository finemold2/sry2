// 이름 믹서 — 완전 로컬·저작권 안전 작명 도구.
//  · 외부 API/네트워크/이미지/음원 일절 사용 안 함. 모든 음절은 직접 만든(자작) 풀.
//  · 문화권(한국식/서구식/판타지) × 성별(남/여/중성) 음절 풀을 조합해 인물 이름을 대량 생성.
//  · 실존 인물·IP 가 아닌 무작위 음절 조합 → 우연히 실명과 겹칠 수 있으나 의도/저장은 음절 조합뿐.
//  · 조합 가능 수(경우의 수) 표시, 각 칸 잠금(🔒) 후 나머지만 재생성, 한 글자 단위 재굴림.
//  · 인물 라이브러리(localStorage 영속, 빈 상태 안내) + 공유 라이브러리/프로젝트 인물 카드 연계.
// react 와 './linkbus' 외 import 없음. 완전 로컬.
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  openToolLinked, addToLibrary, addToProject, hasProjectBridge,
  getDragItem, isItemDrag, TOOL_RELATIONS, Emoji, emojify,
} from './linkbus'

export const meta = {
  id: 'name-mixer',
  name: '이름 믹서',
  icon: '🎲',
  group: '게임·캐릭터',
  intro: '자작 음절을 문화권×성별로 조합해 인물 이름을 대량 생성·잠금/재생성',
  w: 640,
  h: 660,
}

// ───────────────────────── 자작 음절 풀 ─────────────────────────
// 모두 직접 만든(가공) 음절. 실제 이름 사전/명단을 베끼지 않고, 발음 느낌만 살린 자작 조각.
type Culture = 'kr' | 'west' | 'fantasy'
type Gender = 'm' | 'f' | 'n' // 남/여/중성

interface Pools {
  // 한국식: 문파(가문)·별호(이명) + 성(姓) 1글자 + 이름 앞/뒤 음절 풀(성별별)
  //  · 게임·캐릭터 작명용 — "{문파} {별호} {성}{이름①}{이름②}" 형태(무협/판타지 인물명에 자연스러움).
  clan?: string[]      // 문파/가문(2글자 완결어) — 그 자체로 자연스러운 소속명
  epiPre?: string[]    // 별호 앞 음절(방위·색·원소·기상 등 관형 요소)
  epiSuf?: string[]    // 별호 뒤 음절(자연물·무기·존재·직위 등 명사 요소) → 앞+뒤 = 자연스러운 2글자 별호
  surnames?: string[]
  given1: Record<Gender, string[]> // 이름 앞 음절(또는 단독)
  given2: Record<Gender, string[]> // 이름 뒤 음절
  // 서구/판타지: 이름 = (접두 + 중간? + 접미) + 미들네임, 성 = (성접두 + 성접미)
}

// 한국식(자작 한글 음절) — 문파 + 별호(앞+뒤) + 성 1글자 + 이름 2글자.
//  · 모든 음절·낱말은 그 자체로 완결된 자연스러운 한국어. 슬롯끼리 어떻게 섞여도 인물명으로 읽힘.
//  · 별호 = 관형 요소(앞) + 명사 요소(뒤)로, 예) 북풍/혈검/월영/청룡/백호처럼 자연스럽게 결합.
const KR: Pools = {
  clan: ['천검', '혈천', '무극', '백련', '청풍', '흑야', '비검', '천룡', '화산', '종남', '곤륜', '아미', '점창', '공동', '소림', '무당', '개방', '신창', '만통', '일월', '태극', '적룡', '흑풍', '청룡', '백호', '주작', '현무', '운하', '설산', '빙궁', '화룡', '천마', '사도', '정파', '사파', '녹림', '패천', '검각', '도문', '권문', '창천', '광명', '천하', '무영', '비응', '옥화', '금란', '은하', '적염', '묵향', '청죽', '매화', '난초', '송백', '죽림', '학익', '응천', '호연', '용천', '봉래'],
  epiPre: ['북', '남', '동', '서', '청', '백', '흑', '적', '황', '은', '금', '혈', '화', '수', '목', '풍', '뇌', '설', '월', '성', '운', '한', '천', '해', '산', '강', '빙', '염', '광', '묵', '창', '자', '홍', '녹', '회', '진', '신', '영', '무', '비', '상', '단', '명', '유', '독', '폭', '검', '도', '권', '패', '마', '선', '귀', '용', '호', '봉', '학', '응', '매', '표', '사', '곰', '늑', '묘', '환', '일', '야'],
  epiSuf: ['풍', '천', '야', '영', '화', '월', '성', '룡', '호', '랑', '검', '운', '설', '산', '강', '해', '림', '명', '광', '뢰', '봉', '학', '응', '표', '사', '객', '협', '인', '자', '옹', '선', '군', '왕', '주', '후', '백', '공', '향', '결', '빛', '도', '권', '마', '귀', '신', '살'],
  surnames: ['가', '간', '갈', '감', '강', '견', '경', '계', '고', '공', '곽', '구', '국', '권', '근', '금', '기', '길', '김', '나', '남', '노', '단', '담', '도', '동', '두', '라', '려', '로', '류', '마', '만', '매', '맹', '명', '모', '목', '문', '미', '민', '박', '반', '방', '배', '백', '변', '복', '봉', '부', '사', '산', '상', '서', '석', '선', '설', '성', '소', '손', '송', '수', '순', '승', '시', '신', '심', '안', '야', '양', '어', '엄', '여', '연', '염', '엽', '예', '오', '옥', '온', '왕', '요', '용', '우', '운', '원', '위', '유', '윤', '은', '음', '이', '인', '임', '자', '장', '전', '정', '제', '조', '종', '좌', '주', '지', '진', '차', '채', '천', '초', '최', '추', '탁', '태', '판', '편', '평', '표', '풍', '피', '필', '하', '한', '함', '허', '현', '형', '호', '홍', '화', '황', '후'],
  given1: {
    m: ['건', '강', '결', '겸', '경', '곤', '관', '광', '교', '규', '균', '근', '기', '남', '노', '단', '담', '대', '덕', '도', '동', '두', '람', '래', '록', '루', '명', '무', '문', '민', '범', '병', '보', '봉', '빈', '산', '상', '서', '석', '선', '성', '세', '솔', '수', '승', '시', '신', '안', '영', '온', '완', '요', '용', '우', '욱', '운', '원', '위', '유', '윤', '율', '은', '의', '익', '인', '일', '재', '정', '제', '종', '주', '준', '중', '지', '진', '찬', '창', '천', '철', '청', '태', '택', '하', '한', '헌', '혁', '현', '형', '호', '홍', '화', '환', '효', '후', '훈', '휘', '흥', '희'],
    f: ['가', '나', '다', '라', '람', '래', '려', '로', '리', '마', '미', '민', '보', '봄', '빈', '사', '산', '새', '샘', '서', '석', '선', '설', '성', '세', '소', '솔', '송', '수', '슬', '시', '신', '아', '애', '야', '어', '여', '연', '영', '예', '오', '옥', '온', '요', '우', '유', '윤', '율', '은', '이', '인', '자', '정', '주', '지', '진', '채', '천', '하', '한', '해', '향', '현', '혜', '호', '화', '환', '효', '희'],
    n: ['가', '나', '다', '라', '람', '래', '려', '로', '루', '리', '마', '미', '민', '별', '보', '봄', '비', '사', '산', '새', '샘', '서', '석', '선', '설', '성', '세', '소', '솔', '수', '시', '신', '아', '야', '어', '여', '연', '영', '예', '오', '온', '우', '운', '원', '유', '율', '윤', '은', '이', '인', '자', '재', '정', '주', '지', '진', '찬', '채', '천', '하', '한', '해', '향', '현', '호', '화', '후'],
  },
  given2: {
    m: ['건', '결', '겸', '경', '곤', '관', '광', '규', '균', '기', '남', '록', '룡', '름', '린', '만', '명', '무', '문', '민', '범', '병', '빈', '산', '삼', '상', '서', '석', '선', '설', '섭', '성', '솔', '수', '승', '식', '신', '안', '엽', '영', '욱', '운', '울', '원', '위', '유', '율', '윤', '음', '익', '인', '일', '재', '정', '제', '종', '주', '준', '중', '진', '찬', '창', '철', '태', '택', '하', '한', '헌', '혁', '현', '형', '호', '홍', '환', '회', '효', '후', '훈', '휘', '흠', '흥', '희'],
    f: ['가', '경', '나', '다', '라', '람', '래', '려', '린', '림', '마', '미', '별', '보', '봄', '비', '빈', '사', '산', '새', '서', '석', '선', '설', '성', '세', '소', '솔', '수', '슬', '시', '신', '아', '안', '애', '야', '연', '영', '옥', '온', '요', '우', '유', '율', '윤', '은', '음', '이', '인', '자', '정', '주', '지', '진', '채', '하', '한', '해', '향', '현', '혜', '화', '환', '회', '효', '희', '빛', '결'],
    n: ['결', '경', '나', '다', '라', '람', '래', '려', '루', '린', '림', '마', '미', '별', '봄', '비', '빛', '사', '산', '새', '서', '석', '선', '설', '성', '세', '소', '솔', '수', '슬', '시', '아', '안', '야', '연', '영', '온', '우', '운', '울', '원', '유', '율', '윤', '은', '음', '이', '인', '자', '재', '정', '주', '지', '진', '찬', '천', '하', '한', '해', '향', '현', '호', '화', '환', '회', '효', '후', '휘', '흔', '희'],
  },
}

// 서구식(자작 라틴 음절) — 이름 = 접두+(중간)+접미 + 미들네임, 성 = 접두+접미.
//  · 미들네임(가운데 이름)은 서구권 인명에서 매우 자연스러운 슬롯 → 풀네임 "given middle surname".
const WEST = {
  givenPre: {
    m: ['Al', 'Bren', 'Cor', 'Dan', 'El', 'Fen', 'Gar', 'Hal', 'Jor', 'Kal', 'Len', 'Mar', 'Nor', 'Ol', 'Per', 'Ren', 'Sel', 'Tor', 'Val', 'Wen', 'Ad', 'Ber', 'Carl', 'Ed', 'Frank', 'Ger', 'Hen', 'Ig', 'Jas', 'Kel', 'Lor', 'Mat', 'Nev', 'Os', 'Pat', 'Quen', 'Rod', 'Sam', 'Ter', 'Ul', 'Vic', 'Walt', 'Yor', 'Zach', 'Alb', 'Bram', 'Clar', 'Drew', 'Em', 'Ferd', 'Greg', 'Hum', 'Ivor', 'Jul', 'Kurt', 'Leo', 'Mal', 'Nat', 'Owen', 'Phil', 'Reg', 'Stan', 'Theo'],
    f: ['Al', 'Bri', 'Ce', 'Da', 'El', 'Fi', 'Ga', 'He', 'Is', 'Ka', 'Li', 'Ma', 'Na', 'Ophe', 'Ro', 'Se', 'Ta', 'Ve', 'Wi', 'Yse', 'Ade', 'Bea', 'Cla', 'Dor', 'Ele', 'Fre', 'Gwen', 'Hel', 'Ire', 'Jas', 'Ker', 'Lor', 'Mir', 'Nor', 'Oli', 'Pen', 'Ros', 'Sib', 'Tha', 'Ver', 'Win', 'Anne', 'Cor', 'Del', 'Eve', 'Flo', 'Gri', 'Hes', 'Ily', 'Jun', 'Kat', 'Lyd', 'Mae', 'Nev', 'Ono', 'Pri', 'Rho', 'Syl', 'Tess', 'Ursa', 'Vio'],
    n: ['Ari', 'Bel', 'Cas', 'Dev', 'El', 'Fin', 'Ha', 'Ja', 'Kai', 'Lo', 'Mer', 'Noa', 'Or', 'Ra', 'Sa', 'Ta', 'Val', 'Wre', 'Xa', 'Zen', 'Ad', 'Bri', 'Cor', 'Dru', 'Ev', 'Fre', 'Gar', 'Hol', 'Ind', 'Jor', 'Kel', 'Lin', 'Mor', 'Nev', 'Ol', 'Par', 'Quin', 'Rye', 'Shay', 'Tor', 'Ulan', 'Ves', 'Wyn', 'Yan', 'Zel', 'Ash', 'Cir', 'Dane', 'Ell', 'Fel', 'Gale', 'Har', 'Ira', 'Jet', 'Kor', 'Lane', 'Nye', 'Oren', 'Pace', 'Ree', 'Sage', 'Tate'],
  },
  givenMid: ['', '', '', 'a', 'e', 'i', 'an', 'el', 'in', 'or', 'is', 'ar', 'on', 'us', 'en', 'al', 'ir', 'ad', 'un'], // 고유 19개(빈칸은 2음절형 빈도↑)
  givenSuf: {
    m: ['as', 'an', 'ric', 'son', 'ton', 'us', 'win', 'mund', 'dor', 'ius', 'len', 'mar', 'red', 'bert', 'fred', 'gar', 'hard', 'man', 'nard', 'rich', 'vald', 'wick', 'wood', 'ward', 'ston', 'bald', 'gold', 'helm', 'rik', 'ulf', 'van', 'wal', 'stan', 'brand', 'frid', 'grim', 'hart', 'mer', 'thas', 'vin', 'gus', 'rod'],
    f: ['a', 'ia', 'ine', 'elle', 'wyn', 'ra', 'lia', 'na', 'sa', 'ette', 'lyn', 'da', 'ana', 'ova', 'is', 'anne', 'beth', 'cia', 'dra', 'ella', 'fina', 'gail', 'hilde', 'issa', 'jean', 'keth', 'liana', 'mina', 'nora', 'pia', 'rina', 'sine', 'tina', 'vera', 'wilda', 'osa', 'wenna', 'lina', 'dette'],
    n: ['a', 'en', 'is', 'ar', 'yn', 'el', 'on', 'er', 'ia', 'an', 'ix', 'or', 'ey', 'as', 'in', 'ow', 'ad', 'ell', 'ory', 'une', 'ade', 'ven', 'wick', 'ton', 'ley', 'son', 'den', 'ric', 'ham', 'ford', 'gate', 'well', 'mont', 'vale', 'rook', 'lyn', 'eth', 'wen'],
  },
  // 미들네임(완결된 짧은 이름) — 성별별
  middle: {
    m: ['James', 'John', 'Lee', 'Ray', 'Paul', 'Mark', 'Carl', 'Roy', 'Hugh', 'Earl', 'Glenn', 'Reed', 'Wade', 'Cole', 'Drake', 'Vance', 'Pierce', 'Quinn', 'Reid', 'Scott', 'Todd', 'Wynn', 'Boyd', 'Clyde', 'Floyd', 'Grant', 'Heath', 'Lyle', 'Neil', 'Reece', 'Shane', 'Troy', 'Wells', 'Bram', 'Cyrus', 'Errol', 'Finn', 'Gideon', 'Hart', 'Ivo', 'Joss', 'Kent', 'Lance', 'Blake', 'Chase', 'Dean', 'Forrest', 'Gage', 'Hayes', 'Jude', 'Knox', 'Loyd', 'Miles', 'Pruitt', 'Royce', 'Slade', 'Tobias', 'Wyatt'],
    f: ['Anne', 'Rose', 'Mae', 'Joy', 'Faye', 'Belle', 'Claire', 'Dawn', 'Eve', 'Grace', 'Hope', 'June', 'Kate', 'Lynn', 'Pearl', 'Wren', 'Bess', 'Cora', 'Dell', 'Elle', 'Fern', 'Gwen', 'Iris', 'Jade', 'Lark', 'Maeve', 'Nell', 'Opal', 'Paige', 'Quinn', 'Reine', 'Sage', 'Tess', 'Vale', 'Wynn', 'Beth', 'Clove', 'Dove', 'Esme', 'Flora', 'Hazel', 'Ivy', 'Juno', 'Blythe', 'Coral', 'Dahlia', 'Eline', 'Greer', 'Hollis', 'Lila', 'Marlowe', 'Nova', 'Olive', 'Posy', 'Romy', 'Sloane', 'Thea', 'Verity', 'Willow'],
    n: ['Reese', 'Sage', 'Wren', 'Quinn', 'Drew', 'Lane', 'Blair', 'Brook', 'Dale', 'Eden', 'Finch', 'Gale', 'Hart', 'Jules', 'Kit', 'Lake', 'Marin', 'Noor', 'Oak', 'Park', 'Rain', 'Sky', 'Tate', 'Vale', 'West', 'Wynn', 'Ash', 'Bay', 'Cory', 'Dane', 'Ellis', 'Frey', 'Gray', 'Holt', 'Indi', 'Jess', 'Kerr', 'Lior', 'Mica', 'Noa', 'Orin', 'Pax', 'Remy', 'Shai', 'Auden', 'Briar', 'Cleo', 'Echo', 'Flynn', 'Haven', 'Ira', 'Jory', 'Lennox', 'Marlo', 'Onyx', 'Phoenix', 'Quill', 'Rowan', 'Sutton'],
  },
  surPre: ['Ash', 'Black', 'Brook', 'Cald', 'Dun', 'Fair', 'Green', 'Hawk', 'Iron', 'Lang', 'March', 'North', 'Oak', 'Red', 'Stone', 'Thorn', 'Vale', 'West', 'Whit', 'Wood', 'Bram', 'Cliff', 'Dale', 'Elm', 'Frost', 'Gold', 'Grey', 'Holt', 'Lake', 'Moor', 'Pine', 'Quil', 'Rush', 'Sharp', 'Snow', 'Strom', 'Under', 'Wild', 'Birch', 'Crane', 'Even', 'Glen', 'Heath', 'Marsh', 'Raven', 'Silver', 'Storm', 'Sun', 'Swift', 'Tall', 'Wint', 'Crest', 'Deep', 'Far', 'Hill', 'Long', 'Lone'],
  surSuf: ['bourne', 'brook', 'croft', 'don', 'field', 'ford', 'gate', 'hart', 'haven', 'ley', 'mont', 'more', 'shaw', 'stead', 'ston', 'thorn', 'vale', 'wick', 'wood', 'worth', 'bury', 'combe', 'dale', 'dell', 'fall', 'gore', 'hall', 'holm', 'leigh', 'marsh', 'moor', 'ridge', 'stone', 'ton', 'water', 'well', 'wend', 'wyn', 'burn', 'cliff', 'crest', 'fell', 'glen', 'grove', 'heath', 'knoll', 'meadow', 'peak', 'spring', 'view', 'wall'],
}

// 판타지(자작) — 이름 = 접두+중간+접미(거셈/유려함 풀) + 미들네임, 성/씨족 = 칭호형(어구1+어구2).
//  · 미들네임은 두 번째 부여명(second given name)으로, 판타지 인명에서도 자연스러운 슬롯.
const FAN = {
  givenPre: {
    m: ['Drak', 'Fen', 'Gor', 'Hael', 'Kael', 'Lorn', 'Mor', 'Ner', 'Orr', 'Rax', 'Skor', 'Thal', 'Ulf', 'Vor', 'Wrak', 'Xan', 'Zar', 'Bral', 'Cael', 'Dorn', 'Aldr', 'Bryn', 'Cor', 'Drath', 'Eld', 'Fyr', 'Garr', 'Hroth', 'Ith', 'Jorm', 'Kresh', 'Lothar', 'Marn', 'Nyr', 'Ogr', 'Pyr', 'Quor', 'Ragn', 'Sorl', 'Tharn', 'Ulth', 'Vael', 'Wreth', 'Xor', 'Zorn', 'Balt', 'Crag', 'Dre', 'Esk', 'Fell', 'Grom', 'Harn', 'Ick', 'Jarl', 'Kor', 'Lurk', 'Mok', 'Nokk', 'Praz', 'Rurik', 'Skel', 'Throk'],
    f: ['Aer', 'Bel', 'Cyn', 'Eld', 'Fae', 'Il', 'Lyr', 'Mira', 'Nyx', 'Ola', 'Phi', 'Quil', 'Ria', 'Sel', 'Thessa', 'Una', 'Vael', 'Wyn', 'Xia', 'Ysol', 'Anya', 'Bryl', 'Cael', 'Dris', 'Elen', 'Fior', 'Gwyn', 'Hesh', 'Ily', 'Jora', 'Kira', 'Lael', 'Myr', 'Nael', 'Ora', 'Pael', 'Quira', 'Rhya', 'Syl', 'Thaela', 'Uvi', 'Vyr', 'Wael', 'Xira', 'Ylle', 'Zara', 'Ael', 'Brae', 'Cyra', 'Drae', 'Elys', 'Faela', 'Glyn', 'Hyl', 'Isaela', 'Jyn', 'Lior', 'Myra', 'Nira'],
    n: ['Aeth', 'Bryn', 'Cor', 'Dae', 'Ely', 'Fyr', 'Glim', 'Hesh', 'Ither', 'Jael', 'Kor', 'Lume', 'Myr', 'Onyx', 'Pyr', 'Riel', 'Syl', 'Tarn', 'Vesh', 'Zeph', 'Ardd', 'Brael', 'Cael', 'Drys', 'Elar', 'Fael', 'Gryn', 'Hael', 'Isk', 'Jorn', 'Lyr', 'Morr', 'Nael', 'Orr', 'Pael', 'Quor', 'Ryn', 'Skel', 'Thael', 'Ull', 'Vael', 'Wrael', 'Xael', 'Ysk', 'Zael', 'Aer', 'Bryl', 'Crae', 'Dael', 'Eryn', 'Frae', 'Glor', 'Hyl', 'Kryn', 'Lael', 'Nyx', 'Oryn'],
  },
  givenMid: ['', '', 'a', 'e', 'o', 'an', 'el', 'ir', 'or', 'ys', 'eth', 'ar', 'um', 'al', 'en', 'in', 'os', 'us', 'yr'], // 고유 19개
  givenSuf: {
    m: ['dor', 'gar', 'mir', 'oth', 'rik', 'thas', 'vok', 'wyn', 'zar', 'dan', 'gorn', 'mund', 'rax', 'ul', 'eon', 'dahl', 'gron', 'hrim', 'kar', 'loth', 'nir', 'orn', 'rakk', 'seth', 'thul', 'vald', 'wroth', 'zul', 'bal', 'drimm', 'garr', 'hrok', 'korr', 'morth', 'nul', 'sorn', 'thrall'],
    f: ['ara', 'eth', 'iel', 'lyn', 'nara', 'rae', 'sara', 'thea', 'vyn', 'wen', 'ya', 'ynne', 'is', 'ora', 'eia', 'ael', 'dris', 'elle', 'fina', 'gryn', 'hira', 'issa', 'lael', 'mira', 'nira', 'pira', 'ria', 'saela', 'thira', 'ula', 'vira', 'wyl', 'ysse', 'aela', 'brina', 'cyra', 'delle', 'erys', 'faela'],
    n: ['ael', 'eth', 'ix', 'or', 'rin', 'thys', 'um', 'vyn', 'yr', 'an', 'is', 'el', 'os', 'ar', 'en', 'dris', 'gryn', 'hyl', 'isk', 'lyr', 'morr', 'nyx', 'orr', 'pyr', 'ryn', 'skel', 'ull', 'vesh', 'wrae', 'xys', 'ysk', 'zeph', 'aer', 'bryn', 'cael'],
  },
  // 미들네임(두 번째 부여명) — 성별별
  middle: {
    m: ['Drak', 'Mor', 'Korr', 'Vael', 'Thane', 'Rax', 'Grim', 'Thal', 'Vor', 'Orr', 'Kael', 'Bren', 'Dorn', 'Lorn', 'Garr', 'Hroth', 'Skel', 'Ulf', 'Wrath', 'Zar', 'Ash', 'Bron', 'Cael', 'Drath', 'Esk', 'Fenn', 'Garm', 'Hask', 'Iric', 'Jorr', 'Kresh', 'Loth', 'Marn', 'Nyr', 'Ogr', 'Praz', 'Rurik', 'Sorl', 'Tharn', 'Ull', 'Wreth', 'Xor', 'Zorn', 'Brak', 'Crom', 'Esh', 'Fael', 'Grond', 'Harn', 'Ick', 'Jarl', 'Lurk', 'Mok', 'Nokk'],
    f: ['Aer', 'Bel', 'Cyn', 'Eld', 'Fae', 'Lyr', 'Mira', 'Nyx', 'Ola', 'Ria', 'Sel', 'Una', 'Vael', 'Wyn', 'Xia', 'Ysol', 'Anya', 'Bryl', 'Cael', 'Dris', 'Elen', 'Fior', 'Gwyn', 'Hesh', 'Ily', 'Jora', 'Kira', 'Lael', 'Myr', 'Nael', 'Ora', 'Pael', 'Quira', 'Rhya', 'Syl', 'Thaela', 'Uvi', 'Vyr', 'Wael', 'Xira', 'Yara', 'Zara', 'Ael', 'Brae', 'Cyra', 'Drae', 'Elys', 'Faela', 'Glyn', 'Hyl', 'Isaela', 'Jyn', 'Lior', 'Myra', 'Nira', 'Ona', 'Pria', 'Ryn', 'Sera', 'Thira'],
    n: ['Aeth', 'Bryn', 'Cor', 'Dae', 'Ely', 'Fyr', 'Glim', 'Hesh', 'Jael', 'Kor', 'Lume', 'Myr', 'Onyx', 'Pyr', 'Riel', 'Syl', 'Tarn', 'Vesh', 'Zeph', 'Ardd', 'Brael', 'Cael', 'Drys', 'Elar', 'Fael', 'Gryn', 'Hael', 'Isk', 'Jorn', 'Lyr', 'Morr', 'Nael', 'Orr', 'Pael', 'Quor', 'Ryn', 'Skel', 'Thael', 'Ull', 'Vael', 'Wrael', 'Xael', 'Ysk', 'Zael', 'Aer', 'Bryl', 'Crae', 'Dael', 'Eryn', 'Frae', 'Glor', 'Hyl', 'Kryn', 'Lael', 'Nyx', 'Oryn', 'Quel', 'Ryl'],
  },
  clanWord1: ['Storm', 'Ash', 'Night', 'Frost', 'Ember', 'Star', 'Dawn', 'Dusk', 'Shadow', 'Blood', 'Iron', 'Moon', 'Sun', 'Wind', 'Stone', 'Flame', 'Mist', 'Thorn', 'Raven', 'Wolf', 'Grim', 'Bone', 'Ghost', 'Hollow', 'Pale', 'Black', 'Red', 'Gold', 'Silver', 'Snow', 'Sky', 'Sea', 'Tide', 'Thunder', 'Lightning', 'Cinder', 'Soul', 'Dread', 'Doom', 'Gloom', 'Crimson', 'Azure', 'Onyx', 'Hex', 'Rune', 'Wyrm', 'Drake', 'Griffin', 'Hawk', 'Bear', 'Lion', 'Serpent', 'Spider', 'Frostfang', 'Nightveil'],
  clanWord2: ['bane', 'born', 'caller', 'crest', 'fang', 'guard', 'heart', 'mantle', 'reaver', 'rider', 'shield', 'song', 'spire', 'thane', 'walker', 'warden', 'weaver', 'whisper', 'wing', 'wraith', 'blade', 'brand', 'claw', 'cloak', 'crown', 'forge', 'gaze', 'hammer', 'helm', 'hunter', 'keeper', 'lash', 'maw', 'oath', 'piercer', 'render', 'seeker', 'sister', 'slayer', 'spear', 'stalker', 'striker', 'talon', 'vow', 'ward', 'flame', 'frost', 'storm'],
}

const CULTURES: { id: Culture; ko: string; icon: string; note: string }[] = [
  { id: 'kr', ko: '한국식', icon: '🏯', note: '성 1글자 + 이름 2글자(자작 한글 음절)' },
  { id: 'west', ko: '서구식', icon: '🏰', note: '접두+접미 이름 + 지명형 성(자작 라틴 음절)' },
  { id: 'fantasy', ko: '판타지', icon: '🐉', note: '거센 음절 이름 + 씨족 칭호(자작 음절)' },
]
const GENDERS: { id: Gender; ko: string; icon: string }[] = [
  { id: 'm', ko: '남성', icon: '♂' },
  { id: 'f', ko: '여성', icon: '♀' },
  { id: 'n', ko: '중성', icon: '⚲' },
]

// ───────────────────────── 유틸 ─────────────────────────
const rid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const fmtBig = (n: number) => (n >= 1e6 ? Math.round(n).toLocaleString('ko-KR') : Math.round(n).toLocaleString('ko-KR'))

// 한 인물 이름은 "부품(parts)"으로 구성 → 부품 단위 잠금/재굴림 가능.
// 부품: { key, txt } 들을 join 규칙으로 합쳐 풀네임을 만든다.
interface Part { key: string; txt: string }
interface NameItem {
  id: string
  culture: Culture
  gender: Gender
  parts: Part[]   // 표시·잠금 단위
  locked: Record<string, boolean> // partKey -> 잠금
}

// 문화권별: 부품 키 목록(표시 순서)
function partKeys(culture: Culture): string[] {
  if (culture === 'kr') return ['sur', 'g1', 'g2'] // 현대 한국식 — 성 1글자 + 이름 2글자(문파/별호 같은 호·수식어는 요즘 안 씀)
  return ['gp', 'gm', 'gs', 'mid', 'sp', 'ss'] // 이름접두/중간/접미 + 미들네임 + 성접두/접미
}
const PART_KO: Record<string, string> = {
  clan: '문파', ep1: '별호①', ep2: '별호②', sur: '성', g1: '이름①', g2: '이름②',
  gp: '이름 접두', gm: '이름 중간', gs: '이름 접미', mid: '미들네임',
  sp: '성 접두', ss: '성 접미',
}

// 부품 하나를 (재)생성
function genPart(culture: Culture, gender: Gender, key: string): string {
  if (culture === 'kr') {
    if (key === 'clan') return pick(KR.clan!)
    if (key === 'ep1') return pick(KR.epiPre!)
    if (key === 'ep2') return pick(KR.epiSuf!)
    if (key === 'sur') return pick(KR.surnames!)
    if (key === 'g1') return pick(KR.given1[gender])
    return pick(KR.given2[gender])
  }
  const T = culture === 'west' ? WEST : FAN
  if (key === 'gp') return pick(T.givenPre[gender])
  if (key === 'gm') return pick(T.givenMid)
  if (key === 'gs') return pick(T.givenSuf[gender])
  if (key === 'mid') return pick(T.middle[gender])
  if (key === 'sp') return culture === 'west' ? pick(WEST.surPre) : pick(FAN.clanWord1)
  return culture === 'west' ? pick(WEST.surSuf) : pick(FAN.clanWord2)
}

// NameItem 생성/재생성 — 잠긴 부품은 보존
function makeItem(culture: Culture, gender: Gender, prev?: NameItem): NameItem {
  const keys = partKeys(culture)
  const locked = prev && prev.culture === culture ? prev.locked : {}
  const parts: Part[] = keys.map(k => {
    if (prev && prev.culture === culture && locked[k]) {
      const old = prev.parts.find(p => p.key === k)
      if (old) return old
    }
    return { key: k, txt: genPart(culture, gender, k) }
  })
  return { id: prev?.id || rid(), culture, gender, parts, locked: { ...locked } }
}

// 풀네임 문자열
function fullName(it: NameItem): string {
  const m: Record<string, string> = {}
  it.parts.forEach(p => { m[p.key] = p.txt })
  if (it.culture === 'kr') return `${m.sur}${m.g1}${m.g2}`
  const given = `${m.gp}${m.gm}${m.gs}`
  const sur = `${m.sp}${m.ss}`
  return m.mid ? `${given} ${m.mid} ${sur}` : `${given} ${sur}`
}
function givenOnly(it: NameItem): string {
  const m: Record<string, string> = {}
  it.parts.forEach(p => { m[p.key] = p.txt })
  if (it.culture === 'kr') return `${m.sur}${m.g1}${m.g2}`
  return `${m.gp}${m.gm}${m.gs}`
}
function surOnly(it: NameItem): string {
  const m: Record<string, string> = {}
  it.parts.forEach(p => { m[p.key] = p.txt })
  if (it.culture === 'kr') return m.sur
  return `${m.sp}${m.ss}`
}

// 조합 가능 수(경우의 수) — 각 부품 풀 크기의 곱(중간 빈칸 가중치는 후처리 무시, 풀크기로 계산)
function combos(culture: Culture, gender: Gender): number {
  if (culture === 'kr') {
    // 성 × 이름① × 이름②
    return KR.surnames!.length * KR.given1[gender].length * KR.given2[gender].length
  }
  const T = culture === 'west' ? WEST : FAN
  const sp = culture === 'west' ? WEST.surPre.length : FAN.clanWord1.length
  const ss = culture === 'west' ? WEST.surSuf.length : FAN.clanWord2.length
  // 중간음절은 고유값 개수(빈칸 중복 제거)
  const midUniq = new Set(T.givenMid).size
  // 이름접두 × 중간 × 이름접미 × 미들네임 × 성접두 × 성접미
  return T.givenPre[gender].length * midUniq * T.givenSuf[gender].length * T.middle[gender].length * sp * ss
}

// ───────────────────────── 영속(인물 라이브러리) ─────────────────────────
const STORE_KEY = 'sry:tool:name-mixer'
interface CharCard {
  id: string
  name: string
  culture: Culture
  gender: Gender
  role: string   // 역할(주인공/조연 등)
  note: string   // 메모
  created: number
}
function loadCards(): CharCard[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
      .filter((x: any) => x && typeof x.name === 'string')
      .map((x: any) => ({
        id: typeof x.id === 'string' ? x.id : rid(),
        name: x.name,
        culture: (['kr', 'west', 'fantasy'].includes(x.culture) ? x.culture : 'kr') as Culture,
        gender: (['m', 'f', 'n'].includes(x.gender) ? x.gender : 'n') as Gender,
        role: typeof x.role === 'string' ? x.role : '',
        note: typeof x.note === 'string' ? x.note : '',
        created: typeof x.created === 'number' ? x.created : Date.now(),
      }))
  } catch { return [] }
}

const cultureKo = (c: Culture) => CULTURES.find(x => x.id === c)?.ko || c
const genderKo = (g: Gender) => GENDERS.find(x => x.id === g)?.ko || g

// ───────────────────────── 컴포넌트 ─────────────────────────
export default function NameMixer({ payload }: { payload?: Record<string, unknown> } = {}) {
  const [culture, setCulture] = useState<Culture>('kr')
  const [gender, setGender] = useState<Gender>('n')
  const [count, setCount] = useState(12)
  const [items, setItems] = useState<NameItem[]>([])
  const [cards, setCards] = useState<CharCard[]>(() => loadCards())
  const [copiedId, setCopiedId] = useState('')
  const [flashId, setFlashId] = useState('')   // 라이브러리 추가 피드백
  const [toast, setToast] = useState('')
  const [dragOver, setDragOver] = useState(false)
  // 카드 편집
  const [editId, setEditId] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editNote, setEditNote] = useState('')
  // 드롭으로 받은 외부 이름(작명 변형용)
  const [seedName, setSeedName] = useState('')

  const alive = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const linked = hasProjectBridge()

  // 영속 저장
  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(cards)) } catch { /* 용량 초과 무시 */ }
  }, [cards])

  // 언마운트 정리
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (flashTimer.current) clearTimeout(flashTimer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  // payload 로 들어온 이름(다른 도구가 넘긴 경우) → 시드로
  useEffect(() => {
    const n = payload && typeof (payload as any).name === 'string' ? String((payload as any).name).trim() : ''
    if (n) setSeedName(n)
    const c = payload && (payload as any).culture
    if (c === 'kr' || c === 'west' || c === 'fantasy') setCulture(c)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 최초 1회 생성
  useEffect(() => {
    setItems(Array.from({ length: count }, () => makeItem(culture, gender)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const total = useMemo(() => combos(culture, gender), [culture, gender])

  // 전체(잠긴 부품 보존하며) 재생성
  const regenAll = () => {
    setCopiedId('')
    setItems(prev => {
      const next = prev.slice(0, count).map(it => makeItem(culture, gender, it))
      while (next.length < count) next.push(makeItem(culture, gender))
      return next
    })
  }
  // 문화권/성별/개수 변경 시 새로 채움(잠금 초기화)
  const rebuild = (c: Culture, g: Gender, n: number) => {
    setCopiedId('')
    setItems(Array.from({ length: n }, () => makeItem(c, g)))
  }
  const changeCulture = (c: Culture) => { setCulture(c); rebuild(c, gender, count) }
  const changeGender = (g: Gender) => { setGender(g); rebuild(culture, g, count) }
  const changeCount = (n: number) => { const v = Math.max(1, Math.min(60, n)); setCount(v); rebuild(culture, gender, v) }

  // 한 인물(전체 부품) 재굴림 — 잠긴 부품 보존
  const rerollItem = (id: string) => {
    setItems(prev => prev.map(it => (it.id === id ? makeItem(culture, gender, it) : it)))
  }
  // 부품 하나만 재굴림(잠겨 있으면 해제 후 굴리는 게 아니라, 잠금은 그대로 두고 강제 굴림은 막음)
  const rerollPart = (id: string, key: string) => {
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it
      if (it.locked[key]) return it // 잠긴 부품은 보호
      const parts = it.parts.map(p => (p.key === key ? { key, txt: genPart(it.culture, it.gender, key) } : p))
      return { ...it, parts }
    }))
  }
  // 부품 잠금 토글
  const toggleLock = (id: string, key: string) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, locked: { ...it.locked, [key]: !it.locked[key] } } : it)))
  }

  // ── 클립보드 ──
  const copy = (text: string, id: string) => {
    if (!navigator.clipboard) { flashToast('이 환경에서는 복사를 지원하지 않습니다'); return }
    navigator.clipboard.writeText(text).then(() => {
      if (!alive.current) return
      setCopiedId(id)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => alive.current && setCopiedId(''), 1300)
    }).catch(() => flashToast('복사에 실패했습니다'))
  }

  const flashToast = (m: string) => {
    if (!alive.current) return
    setToast(m)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => alive.current && setToast(''), 2200)
  }
  const flashLib = (id: string) => {
    if (!alive.current) return
    setFlashId(id)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => alive.current && setFlashId(''), 1300)
  }

  // ── 인물 카드(라이브러리) CRUD ──
  const addCard = (it: NameItem) => {
    const name = fullName(it)
    setCards(prev => {
      if (prev.some(c => c.name === name)) { flashToast(`"${name}" 은 이미 인물 라이브러리에 있습니다`); return prev }
      flashToast(`"${name}" 인물 카드 추가됨`)
      return [{ id: rid(), name, culture: it.culture, gender: it.gender, role: '', note: '', created: Date.now() }, ...prev]
    })
  }
  const addCardFromName = (name: string) => {
    const nm = name.trim()
    if (!nm) return
    setCards(prev => {
      if (prev.some(c => c.name === nm)) { flashToast(`"${nm}" 은 이미 있습니다`); return prev }
      flashToast(`"${nm}" 인물 카드 추가됨`)
      return [{ id: rid(), name: nm, culture, gender, role: '', note: '', created: Date.now() }, ...prev]
    })
  }
  const removeCard = (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id))
    if (editId === id) cancelEdit()
  }
  const startEdit = (c: CharCard) => { setEditId(c.id); setEditRole(c.role); setEditNote(c.note) }
  const cancelEdit = () => { setEditId(''); setEditRole(''); setEditNote('') }
  const commitEdit = () => {
    setCards(prev => prev.map(c => (c.id === editId ? { ...c, role: editRole.trim(), note: editNote.trim() } : c)))
    cancelEdit()
  }
  const moveCard = (id: string, dir: -1 | 1) => {
    setCards(prev => {
      const i = prev.findIndex(c => c.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  // ── 연계: 공유 인물 라이브러리 / 인물 시트 / 프로젝트 ──
  // 정규(표준) 캐릭터 fields 생성 — 받는 허브(인물 시트)에서 기본 칸에 정확히 들어가도록 키를 표준화.
  // 보유 값만 1:1 매핑(name/role/gender/notes). 빈 값은 넣지 않는다(추가만, 삭제·리네임 없음).
  const charFields = (name: string, role: string, gender: Gender, note: string): Record<string, string> => {
    const f: Record<string, string> = { name, gender: genderKo(gender) }
    if (role) f.role = role
    if (note) f.notes = note
    return f
  }

  const toSharedLibrary = (card: CharCard) => {
    addToLibrary('characters', {
      name: card.name,
      role: card.role || undefined,
      notes: card.note || undefined,
      fields: charFields(card.name, card.role, card.gender, card.note),
      source: `이름 믹서(${cultureKo(card.culture)}·${genderKo(card.gender)})`,
    })
    flashLib(card.id)
  }
  const toCharacterSheet = (card: CharCard) => {
    openToolLinked('character-sheet', { character: { name: card.name, role: card.role, fields: charFields(card.name, card.role, card.gender, card.note) } })
  }
  const candToSheet = (it: NameItem) => openToolLinked('character-sheet', { character: { name: fullName(it), fields: charFields(fullName(it), '', it.gender, '') } })

  // 프로젝트 인물 카드(character) 로 추가
  const cardToProject = (c: CharCard) => {
    if (!linked) return
    const id = addToProject({
      kind: 'character',
      root: 'research',
      folder: '인물',
      title: c.name,
      character: {
        name: c.name,
        ...(c.role ? { role: c.role } : {}),
        gender: genderKo(c.gender),
        ...(c.note ? { notes: c.note } : {}),
        문화권: cultureKo(c.culture),
        성별: genderKo(c.gender),
      },
      synopsis: c.note || undefined,
      icon: '🧑',
      bodyHtml:
        `<p><b>${esc(c.name)}</b></p>\n<p>문화권: ${esc(cultureKo(c.culture))} · 성별: ${esc(genderKo(c.gender))}` +
        (c.role ? ` · 역할: ${esc(c.role)}` : '') + `</p>` +
        (c.note ? `\n<p>${esc(c.note)}</p>` : ''),
      meta: { 출처: '이름 믹서', 문화권: cultureKo(c.culture), 성별: genderKo(c.gender) },
    })
    if (id) flashToast(`"${c.name}" 프로젝트 인물로 추가됨`)
  }
  const candToProject = (it: NameItem) => {
    if (!linked) return
    const name = fullName(it)
    const id = addToProject({
      kind: 'character',
      root: 'research',
      folder: '인물',
      title: name,
      character: { name, gender: genderKo(it.gender), 문화권: cultureKo(it.culture), 성별: genderKo(it.gender) },
      icon: '🧑',
      bodyHtml: `<p><b>${esc(name)}</b></p>\n<p>문화권: ${esc(cultureKo(it.culture))} · 성별: ${esc(genderKo(it.gender))}</p>`,
      meta: { 출처: '이름 믹서', 문화권: cultureKo(it.culture), 성별: genderKo(it.gender) },
    })
    if (id) flashToast(`"${name}" 프로젝트 인물로 추가됨`)
  }
  const allCardsToProject = () => {
    if (!linked || !cards.length) return
    let n = 0
    cards.forEach(c => {
      const id = addToProject({
        kind: 'character', root: 'research', folder: '인물', title: c.name,
        character: { name: c.name, ...(c.role ? { role: c.role } : {}), gender: genderKo(c.gender), ...(c.note ? { notes: c.note } : {}), 문화권: cultureKo(c.culture), 성별: genderKo(c.gender) },
        synopsis: c.note || undefined, icon: '🧑',
        bodyHtml: `<p><b>${esc(c.name)}</b></p>\n<p>문화권: ${esc(cultureKo(c.culture))} · 성별: ${esc(genderKo(c.gender))}</p>` + (c.note ? `\n<p>${esc(c.note)}</p>` : ''),
        meta: { 출처: '이름 믹서', 문화권: cultureKo(c.culture), 성별: genderKo(c.gender) },
      })
      if (id) n++
    })
    if (n) flashToast(`인물 ${n}명을 프로젝트에 추가했습니다`)
  }

  const copyAllItems = () => {
    if (!items.length) return
    copy(items.map(fullName).join('\n'), '__items__')
  }

  // ── 좌측 바인더 파일 드롭 → 이름 시드 ──
  const onDrop = (e: React.DragEvent) => {
    setDragOver(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const nm = (item.character?.name || item.title || '').trim()
    if (nm) { setSeedName(nm); flashToast(`"${nm}" 을(를) 시드로 받았습니다`) }
  }

  // ───────────────────────── 스타일 ─────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 12, boxSizing: 'border-box', color: 'var(--text)' }
  const introS: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const controls: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }
  const segRow: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }
  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }
  const card: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 7 }
  const secTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }
  const msg: React.CSSProperties = { color: 'var(--muted)', textAlign: 'center', padding: '20px 8px', fontSize: 13, lineHeight: 1.6 }
  const cardRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', flexWrap: 'wrap' }
  const seg = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
    border: '1px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--paper)',
    color: active ? '#fff' : 'var(--text)',
    fontWeight: active ? 700 : 400,
  })
  const partChip = (locked: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 6,
    border: '1px solid var(--border)', fontSize: 12,
    background: locked ? 'color-mix(in srgb, var(--ok) 18%, var(--paper))' : 'var(--panel)',
    cursor: 'default',
  })
  const inp: React.CSSProperties = { padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 12, outline: 'none' }

  const relations = (TOOL_RELATIONS['name-mixer'] || [])
  const RELATED_KO: Record<string, { icon: string; label: string }> = {
    'name-analyzer': { icon: '🪪', label: '이름 분석' },
    'character-model': { icon: '🎭', label: '캐릭터 모델' },
    'character-sheet': { icon: '🧑‍🎤', label: '인물 시트' },
  }

  return (
    <div
      style={{ ...wrap, outline: dragOver ? '2px dashed var(--accent)' : 'none', outlineOffset: -4 }}
      onDragOver={e => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div style={introS}>
        자작 음절을 <b>문화권 × 성별</b>로 조합해 인물 이름을 만듭니다. 마음에 드는 글자는 <b><Emoji e="🔒" />로 잠그고</b> 나머지만 다시 굴리세요. 실존 인물·작품이 아닌 무작위 음절 조합입니다.
      </div>

      {/* 컨트롤 */}
      <div style={controls}>
        <div style={segRow}>
          <span style={{ fontSize: 11, color: 'var(--muted)', width: 48 }}>문화권</span>
          {CULTURES.map(c => (
            <button key={c.id} style={seg(culture === c.id)} onClick={() => changeCulture(c.id)} title={c.note}>
              <Emoji e={c.icon} /> {c.ko}
            </button>
          ))}
        </div>
        <div style={segRow}>
          <span style={{ fontSize: 11, color: 'var(--muted)', width: 48 }}>성별</span>
          {GENDERS.map(g => (
            <button key={g.id} style={seg(gender === g.id)} onClick={() => changeGender(g.id)}>
              {g.icon} {g.ko}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>개수</span>
          <button className="minibtn" onClick={() => changeCount(count - 4)} disabled={count <= 1}>−</button>
          <b style={{ fontSize: 13, minWidth: 22, textAlign: 'center' }}>{count}</b>
          <button className="minibtn" onClick={() => changeCount(count + 4)} disabled={count >= 60}>＋</button>
        </div>
        <div style={segRow}>
          <button className="btn-primary" onClick={regenAll}><Emoji e="🎲" /> 재생성(잠금 유지)</button>
          <button className="minibtn" onClick={copyAllItems} disabled={!items.length}>
            {copiedId === '__items__' ? '✓ 복사됨' : <><Emoji e="📋" /> 전체 복사</>}
          </button>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: 'var(--muted)' }} title="이 문화권·성별 풀로 만들 수 있는 서로 다른 이름의 경우의 수">
            조합 가능 수 <b style={{ color: 'var(--accent)' }}>{fmtBig(total)}</b>가지
          </span>
        </div>
      </div>

      {/* 드롭/시드로 받은 이름 */}
      {seedName && (
        <div style={{ ...cardRow, borderColor: 'var(--accent)' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>받은 이름:</span>
          <b style={{ fontSize: 13 }}>{seedName}</b>
          <span style={{ flex: 1 }} />
          <button className="minibtn" onClick={() => addCardFromName(seedName)}>＋ 인물 카드</button>
          {linked && <button className="linkbtn" onClick={() => addCardFromName(seedName)} title="우선 인물 카드로 담은 뒤 프로젝트로 보낼 수 있습니다"><Emoji e="📄" /></button>}
          <button className="minibtn" onClick={() => setSeedName('')} title="지우기">✕</button>
        </div>
      )}

      {toast && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--ok)', color: 'var(--ok)', borderRadius: 8, padding: '7px 10px', fontSize: 12 }}>
          <Emoji e="✅" /> {emojify(toast)}
        </div>
      )}

      <div style={body}>
        {/* 후보 영역 */}
        <div>
          <div style={{ ...secTitle, marginBottom: 6 }}>
            <span>이름 후보 <span style={{ fontWeight: 400 }}>({cultureKo(culture)} · {genderKo(gender)})</span></span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{items.length}개 · 글자를 눌러 <Emoji e="🔒" />잠금 / <Emoji e="🎲" />재굴림</span>
          </div>
          {!items.length ? (
            <div style={msg}>생성된 이름이 없습니다. 위의 “<Emoji e="🎲" /> 재생성”을 눌러보세요.</div>
          ) : (
            <div style={grid}>
              {items.map(it => {
                const full = fullName(it)
                const exists = cards.some(c => c.name === full)
                return (
                  <div key={it.id} style={card}>
                    <div style={{ fontSize: 16, fontWeight: 800, overflowWrap: 'anywhere', lineHeight: 1.3 }}>{full}</div>
                    {/* 부품(잠금/재굴림 단위) */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {it.parts.filter(p => p.txt !== '').map(p => (
                        <span key={p.key} style={partChip(!!it.locked[p.key])} title={PART_KO[p.key] || p.key}>
                          <span style={{ overflowWrap: 'anywhere' }}>{p.txt}</span>
                          <button
                            onClick={() => toggleLock(it.id, p.key)}
                            title={it.locked[p.key] ? '잠금 해제' : '이 글자 잠금'}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11, lineHeight: 1 }}
                          >{it.locked[p.key] ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
                          <button
                            onClick={() => rerollPart(it.id, p.key)}
                            disabled={!!it.locked[p.key]}
                            title={it.locked[p.key] ? '잠겨 있어 굴릴 수 없습니다' : '이 글자만 다시 굴리기'}
                            style={{ background: 'none', border: 'none', cursor: it.locked[p.key] ? 'not-allowed' : 'pointer', padding: 0, fontSize: 11, lineHeight: 1, opacity: it.locked[p.key] ? 0.35 : 1 }}
                          ><Emoji e="🎲" /></button>
                        </span>
                      ))}
                    </div>
                    {/* 빈 중간음절도 잠금/굴림 가능하게 별도 한 줄(서구/판타지) */}
                    {it.parts.some(p => p.key === 'gm' && p.txt === '') && (
                      <button
                        className="minibtn"
                        onClick={() => rerollPart(it.id, 'gm')}
                        style={{ alignSelf: 'flex-start', fontSize: 10, padding: '1px 6px' }}
                        title="중간 음절 추가(2→3음절)"
                      >＋ 중간 음절</button>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                      <button className="minibtn" style={{ flex: 1 }} onClick={() => rerollItem(it.id)} title="잠긴 글자만 빼고 전체 재굴림"><Emoji e="🎲" /> 전체 굴림</button>
                      <button className="minibtn" onClick={() => copy(full, it.id)} title="이름 복사">{copiedId === it.id ? '✓' : <Emoji e="📋" />}</button>
                    </div>
                    <div className="linkbar" style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="linkbtn"
                        style={{ flex: 1, color: exists ? 'var(--ok)' : undefined }}
                        onClick={() => addCard(it)}
                        disabled={exists}
                        title={exists ? '이미 인물 라이브러리에 있습니다' : '인물 카드(라이브러리)로 담기'}
                      >{exists ? '★ 담김' : '☆ 인물 카드'}</button>
                      <button className="linkbtn" onClick={() => candToSheet(it)} title="이 이름으로 인물 시트 열기"><Emoji e="🪪" /></button>
                      <button className="linkbtn" onClick={() => candToProject(it)} disabled={!linked} title={linked ? '프로젝트 인물로 추가' : '프로젝트가 연결되어 있지 않습니다'}><Emoji e="📄" /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 인물 라이브러리(카드) */}
        <div>
          <div style={{ ...secTitle, marginBottom: 6 }}>
            <span><Emoji e="🗂️" /> 인물 라이브러리 {cards.length ? `(${cards.length})` : ''}</span>
            {!!cards.length && (
              <span style={{ display: 'flex', gap: 6 }}>
                <button className="linkbtn" onClick={allCardsToProject} disabled={!linked} title={linked ? '전체를 프로젝트 인물로 추가' : '프로젝트가 연결되어 있지 않습니다'}><Emoji e="📄" /> 전체 프로젝트</button>
                <button className="minibtn" onClick={() => copy(cards.map(c => c.name).join('\n'), '__cards__')}>{copiedId === '__cards__' ? '✓' : <><Emoji e="📋" /> 복사</>}</button>
              </span>
            )}
          </div>
          {!cards.length ? (
            <div style={msg}>
              아직 담은 인물이 없습니다.<br />
              후보에서 <b>☆ 인물 카드</b>를 눌러 모으거나, 좌측 파일을 이 창에 끌어다 놓아 시드로 쓰세요.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {cards.map((c, i) => (
                <div key={c.id} style={cardRow}>
                  {editId === c.id ? (
                    <>
                      <b style={{ fontSize: 13, flexShrink: 0 }}>{c.name}</b>
                      <input value={editRole} onChange={e => setEditRole(e.target.value)} placeholder="역할(주인공/조연…)" style={{ ...inp, width: 130 }}
                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit() }} />
                      <input value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="메모" style={{ ...inp, flex: 1, minWidth: 120 }}
                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit() }} autoFocus />
                      <button className="minibtn" onClick={commitEdit}>저장</button>
                      <button className="minibtn" onClick={cancelEdit}>취소</button>
                    </>
                  ) : (
                    <>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ fontSize: 13, overflowWrap: 'anywhere' }}>{c.name}</b>
                        <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 8 }}>
                          {cultureKo(c.culture)}·{genderKo(c.gender)}{c.role ? <> · {emojify(c.role)}</> : ''}
                        </span>
                        {c.note && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{emojify(c.note)}</div>}
                      </div>
                      <button className="linkbtn" onClick={() => toCharacterSheet(c)} title="인물 시트로"><Emoji e="🪪" /></button>
                      <button className="linkbtn" onClick={() => toSharedLibrary(c)} title="공유 인물 라이브러리에 추가">{flashId === c.id ? '✓' : <Emoji e="📥" />}</button>
                      <button className="linkbtn" onClick={() => cardToProject(c)} disabled={!linked} title={linked ? '프로젝트 인물로 추가' : '프로젝트가 연결되어 있지 않습니다'}><Emoji e="📄" /></button>
                      <button className="minibtn" onClick={() => moveCard(c.id, -1)} disabled={i === 0} title="위로">↑</button>
                      <button className="minibtn" onClick={() => moveCard(c.id, 1)} disabled={i === cards.length - 1} title="아래로">↓</button>
                      <button className="minibtn" onClick={() => copy(c.name, c.id)} title="복사">{copiedId === c.id ? '✓' : <Emoji e="📋" />}</button>
                      <button className="minibtn" onClick={() => startEdit(c)} title="편집"><Emoji e="✏️" /></button>
                      <button className="minibtn" onClick={() => removeCard(c.id)} title="삭제"><Emoji e="🗑️" /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 관련 도구 연계 바 */}
      {!!relations.length && (
        <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
          {relations.map(id => {
            const m = RELATED_KO[id] || { icon: '🔗', label: id }
            return (
              <button key={id} className="linkbtn" onClick={() => openToolLinked(id)} title={`${m.label} 열기`}>
                <Emoji e={m.icon} /> {m.label}
              </button>
            )
          })}
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>외부 데이터·이미지 미사용 · 모든 음절 자작</span>
        </div>
      )}
    </div>
  )
}
