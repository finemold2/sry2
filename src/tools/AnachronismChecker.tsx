// 시대착오 점검 — 시대물/사극 작가용. 입력 텍스트에서 현대어·외래어·근현대 도입 어휘를
// 로컬 사전(200+)으로 찾아 본문에 강조 표시하고 목록(사유·대안)으로 보여준다.
// 자급식: react 외 import 없음. 외부 네트워크·키 불필요(100% 로컬 사전). 모든 검사는 브라우저에서 수행.
import { useState, useEffect, useRef, useMemo } from 'react'

export const meta = { id: 'anachronism-checker', name: '시대착오 점검', icon: '🏺', group: '교정·언어', intro: '사극·시대소설에서 어색한 현대어·외래어를 로컬 사전으로 찾아 고증을 돕습니다', w: 540, h: 600 }

// ── 분류 ───────────────────────────────────────────────
// tech: 현대 기술·기기 / loan: 외래어·외국어 / modern: 근현대 도입 개념·제도 / casual: 현대 말투·신조어
type Cat = 'tech' | 'loan' | 'modern' | 'casual'

interface Entry {
  word: string            // 탐지 대상(한국어). 단어 경계 없이 부분일치로 탐지
  cat: Cat
  note?: string           // 사유·대안 제안(없으면 분류 기본 안내)
}

// 부분일치 시 오탐을 줄이려 비교적 고유한 표기 위주로 구성.
// 200+ 항목. 시대물(사극·전근대 배경) 기준에서 어색할 수 있는 어휘.
const DICT: Entry[] = [
  // ── 현대 기술·기기 (tech) ──
  { word: '컴퓨터', cat: 'tech' },
  { word: '노트북', cat: 'tech' },
  { word: '스마트폰', cat: 'tech' },
  { word: '핸드폰', cat: 'tech' },
  { word: '휴대폰', cat: 'tech' },
  { word: '휴대전화', cat: 'tech' },
  { word: '전화기', cat: 'tech' },
  { word: '전화', cat: 'tech', note: '전화기 자체가 근대 이후 발명품입니다(시대 확인).' },
  { word: '텔레비전', cat: 'tech' },
  { word: '티브이', cat: 'tech' },
  { word: '라디오', cat: 'tech' },
  { word: '카메라', cat: 'tech' },
  { word: '사진', cat: 'tech', note: '사진술은 19세기 발명입니다. 전근대 배경이면 그림·초상으로.' },
  { word: '영화', cat: 'tech' },
  { word: '인터넷', cat: 'tech' },
  { word: '와이파이', cat: 'tech' },
  { word: '이메일', cat: 'tech' },
  { word: '메일', cat: 'tech', note: '전자우편을 뜻하면 시대착오. 서신·편지로.' },
  { word: '문자메시지', cat: 'tech' },
  { word: '카톡', cat: 'tech' },
  { word: '메신저', cat: 'tech' },
  { word: '앱', cat: 'tech' },
  { word: '어플', cat: 'tech' },
  { word: '소프트웨어', cat: 'tech' },
  { word: '하드웨어', cat: 'tech' },
  { word: '프로그램', cat: 'tech' },
  { word: '데이터', cat: 'tech' },
  { word: '디지털', cat: 'tech' },
  { word: '온라인', cat: 'tech' },
  { word: '오프라인', cat: 'tech' },
  { word: '게임기', cat: 'tech' },
  { word: '비디오', cat: 'tech' },
  { word: '냉장고', cat: 'tech' },
  { word: '에어컨', cat: 'tech' },
  { word: '선풍기', cat: 'tech', note: '전동 선풍기는 근대 이후. 부채·합죽선으로.' },
  { word: '세탁기', cat: 'tech' },
  { word: '전기', cat: 'tech', note: '전기 보급은 근대 이후입니다(시대 확인).' },
  { word: '전등', cat: 'tech', note: '전등 이전에는 등잔·호롱불·촛불.' },
  { word: '전구', cat: 'tech' },
  { word: '형광등', cat: 'tech' },
  { word: '엘리베이터', cat: 'tech' },
  { word: '에스컬레이터', cat: 'tech' },
  { word: '자동차', cat: 'tech', note: '내연기관 자동차는 19세기 말 발명.' },
  { word: '자전거', cat: 'tech', note: '자전거는 19세기 발명품입니다.' },
  { word: '오토바이', cat: 'tech' },
  { word: '기차', cat: 'tech', note: '철도·증기기관차는 19세기 도입.' },
  { word: '열차', cat: 'tech' },
  { word: '지하철', cat: 'tech' },
  { word: '비행기', cat: 'tech', note: '동력 비행은 20세기.' },
  { word: '헬리콥터', cat: 'tech' },
  { word: '로켓', cat: 'tech' },
  { word: '엔진', cat: 'tech' },
  { word: '모터', cat: 'tech' },
  { word: '배터리', cat: 'tech' },
  { word: '시계', cat: 'tech', note: '기계식 회중·손목시계는 시대 확인 필요(해시계·물시계 가능).' },
  { word: '손목시계', cat: 'tech' },
  { word: '안경', cat: 'tech', note: '안경 보급 시기를 확인하세요(조선 후기 도입).' },
  { word: '망원경', cat: 'tech', note: '망원경은 17세기 발명.' },
  { word: '현미경', cat: 'tech' },
  { word: '엑스레이', cat: 'tech' },
  { word: '주사', cat: 'tech', note: '주사기는 근대 의술.' },
  { word: '백신', cat: 'tech' },
  { word: '수술', cat: 'tech', note: '근대 외과 수술 개념(시대 확인).' },
  { word: '마취', cat: 'tech' },
  { word: '엑스선', cat: 'tech' },
  { word: '레이저', cat: 'tech' },
  { word: '플라스틱', cat: 'tech' },
  { word: '비닐', cat: 'tech' },
  { word: '고무', cat: 'tech', note: '가공 고무는 근대 산물.' },
  { word: '유리창', cat: 'tech', note: '판유리 창은 시대 확인(전통 한옥은 창호지).' },
  { word: '성냥', cat: 'tech', note: '성냥은 19세기 발명(이전엔 부싯돌·부시).' },
  { word: '라이터', cat: 'tech' },
  { word: '총', cat: 'tech', note: '화약 무기 도입 시기를 확인하세요.' },
  { word: '권총', cat: 'tech' },
  { word: '소총', cat: 'tech' },
  { word: '대포', cat: 'tech', note: '화포 도입 시기를 확인하세요.' },
  { word: '폭탄', cat: 'tech' },
  { word: '수류탄', cat: 'tech' },
  { word: '탱크', cat: 'tech' },
  { word: '레이더', cat: 'tech' },
  { word: '드론', cat: 'tech' },
  { word: '로봇', cat: 'tech' },

  // ── 외래어·외국어 (loan) ──
  { word: '오케이', cat: 'loan', note: '현대 외래어. "알겠습니다/그리하지요" 등으로.' },
  { word: '오케바리', cat: 'loan' },
  { word: '땡큐', cat: 'loan' },
  { word: '굿', cat: 'loan', note: '감탄의 영어. 굿(무속)과 혼동 주의 — 문맥 확인.' },
  { word: '나이스', cat: 'loan' },
  { word: '커피', cat: 'loan', note: '커피 도입은 근대(조선 말). "차"로 대체 검토.' },
  { word: '카페', cat: 'loan' },
  { word: '코코아', cat: 'loan' },
  { word: '초콜릿', cat: 'loan' },
  { word: '케이크', cat: 'loan' },
  { word: '빵', cat: 'loan', note: '빵(서양식)은 근대 도입. 떡·전병 등 검토.' },
  { word: '버터', cat: 'loan' },
  { word: '치즈', cat: 'loan' },
  { word: '햄', cat: 'loan' },
  { word: '소시지', cat: 'loan' },
  { word: '피자', cat: 'loan' },
  { word: '햄버거', cat: 'loan' },
  { word: '샌드위치', cat: 'loan' },
  { word: '스파게티', cat: 'loan' },
  { word: '아이스크림', cat: 'loan' },
  { word: '주스', cat: 'loan' },
  { word: '콜라', cat: 'loan' },
  { word: '맥주', cat: 'loan', note: '맥주는 근대 도입. 막걸리·청주 등으로.' },
  { word: '와인', cat: 'loan' },
  { word: '위스키', cat: 'loan' },
  { word: '담배', cat: 'loan', note: '담배(연초)는 17세기 전래. 시대 확인.' },
  { word: '버스', cat: 'loan' },
  { word: '택시', cat: 'loan' },
  { word: '호텔', cat: 'loan', note: '서양식 호텔. 객주·주막·여각으로.' },
  { word: '레스토랑', cat: 'loan' },
  { word: '마트', cat: 'loan' },
  { word: '슈퍼', cat: 'loan' },
  { word: '백화점', cat: 'loan', note: '백화점은 근대 상업 시설.' },
  { word: '빌딩', cat: 'loan' },
  { word: '아파트', cat: 'loan' },
  { word: '셔츠', cat: 'loan' },
  { word: '바지', cat: 'loan', note: '양복 바지를 뜻하면 시대 확인. 전통 바지(고의)와 구분.' },
  { word: '코트', cat: 'loan' },
  { word: '재킷', cat: 'loan' },
  { word: '드레스', cat: 'loan' },
  { word: '스커트', cat: 'loan' },
  { word: '넥타이', cat: 'loan' },
  { word: '구두', cat: 'loan', note: '서양식 구두는 근대 도입. 짚신·미투리·갖신 검토.' },
  { word: '부츠', cat: 'loan' },
  { word: '운동화', cat: 'loan' },
  { word: '슬리퍼', cat: 'loan' },
  { word: '모자', cat: 'loan', note: '서양식 모자면 시대 확인(갓·패랭이 등).' },
  { word: '스타일', cat: 'loan' },
  { word: '패션', cat: 'loan' },
  { word: '디자인', cat: 'loan' },
  { word: '브랜드', cat: 'loan' },
  { word: '모델', cat: 'loan' },
  { word: '카드', cat: 'loan' },
  { word: '티켓', cat: 'loan' },
  { word: '쿠폰', cat: 'loan' },
  { word: '포인트', cat: 'loan' },
  { word: '서비스', cat: 'loan' },
  { word: '시스템', cat: 'loan' },
  { word: '프로젝트', cat: 'loan' },
  { word: '미팅', cat: 'loan' },
  { word: '스케줄', cat: 'loan' },
  { word: '플랜', cat: 'loan' },
  { word: '아이디어', cat: 'loan' },
  { word: '메모', cat: 'loan' },
  { word: '리스트', cat: 'loan' },
  { word: '체크', cat: 'loan' },
  { word: '테스트', cat: 'loan' },
  { word: '레벨', cat: 'loan' },
  { word: '포인트제', cat: 'loan' },
  { word: '파티', cat: 'loan' },
  { word: '클럽', cat: 'loan' },
  { word: '콘서트', cat: 'loan' },
  { word: '쇼', cat: 'loan' },
  { word: '무대', cat: 'loan', note: '서양식 무대 개념이면 확인(마당·판으로).' },
  { word: '스포츠', cat: 'loan' },
  { word: '축구', cat: 'loan' },
  { word: '야구', cat: 'loan' },
  { word: '농구', cat: 'loan' },
  { word: '테니스', cat: 'loan' },
  { word: '골프', cat: 'loan' },
  { word: '올림픽', cat: 'loan' },
  { word: '챔피언', cat: 'loan' },
  { word: '메달', cat: 'loan' },
  { word: '에너지', cat: 'loan' },
  { word: '파워', cat: 'loan' },
  { word: '스트레스', cat: 'loan', note: '근현대 심리 용어. "근심·화병·마음고생"으로.' },
  { word: '트라우마', cat: 'loan' },
  { word: '콤플렉스', cat: 'loan' },
  { word: '멘탈', cat: 'loan' },
  { word: '컨디션', cat: 'loan' },
  { word: '이미지', cat: 'loan' },
  { word: '센스', cat: 'loan' },
  { word: '매너', cat: 'loan' },
  { word: '찬스', cat: 'loan' },
  { word: '리듬', cat: 'loan' },
  { word: '템포', cat: 'loan' },
  { word: '멜로디', cat: 'loan' },
  { word: '피아노', cat: 'loan' },
  { word: '기타', cat: 'loan', note: '악기 기타면 외래어. "그 밖에"의 기타(其他)와 구분.' },
  { word: '바이올린', cat: 'loan' },
  { word: '드럼', cat: 'loan' },
  { word: '마이크', cat: 'loan' },
  { word: '스피커', cat: 'loan' },

  // ── 근현대 도입 개념·제도 (modern) ──
  { word: '경찰', cat: 'modern', note: '근대 경찰 제도. 포졸·포교·순라·의금부 등으로.' },
  { word: '형사', cat: 'modern' },
  { word: '검사', cat: 'modern', note: '근대 사법 직제. 시대 확인.' },
  { word: '변호사', cat: 'modern' },
  { word: '판사', cat: 'modern', note: '근대 사법 직제(사또·관아의 재판과 구분).' },
  { word: '법원', cat: 'modern' },
  { word: '재판소', cat: 'modern' },
  { word: '병원', cat: 'modern', note: '근대 병원. 의원·약방·혜민서 등으로.' },
  { word: '의사', cat: 'modern', note: '근대 직업명. 의원·의생으로.' },
  { word: '간호사', cat: 'modern' },
  { word: '약국', cat: 'modern', note: '약방·약재상으로.' },
  { word: '학교', cat: 'modern', note: '근대 학제. 서당·향교·성균관 등으로.' },
  { word: '대학', cat: 'modern', note: '근대 고등교육. 성균관·국자감과 구분.' },
  { word: '학생', cat: 'modern', note: '근대 학제 용어. 유생·학동으로.' },
  { word: '선생님', cat: 'modern', note: '호칭 확인. 스승·훈장·사부로.' },
  { word: '교수', cat: 'modern' },
  { word: '졸업', cat: 'modern' },
  { word: '시험', cat: 'modern', note: '근대 시험. 과거(科擧)로 대체 검토.' },
  { word: '회사', cat: 'modern', note: '근대 기업 형태. 상단·전(廛)·계로.' },
  { word: '공장', cat: 'modern', note: '근대 공업 시설. 공방·가마로.' },
  { word: '사장', cat: 'modern' },
  { word: '직원', cat: 'modern' },
  { word: '월급', cat: 'modern', note: '근대 임금 제도. 녹봉·삯으로.' },
  { word: '연봉', cat: 'modern' },
  { word: '은행', cat: 'modern', note: '근대 금융. 객주·전당·환전상으로.' },
  { word: '대출', cat: 'modern' },
  { word: '주식', cat: 'modern' },
  { word: '투자', cat: 'modern' },
  { word: '보험', cat: 'modern' },
  { word: '세금', cat: 'modern', note: '근대 조세 용어. 세(稅)·공납·환곡 등으로.' },
  { word: '여권', cat: 'modern' },
  { word: '비자', cat: 'modern' },
  { word: '국경', cat: 'modern', note: '근대적 국경 개념. 변경·국계로.' },
  { word: '국적', cat: 'modern' },
  { word: '시민', cat: 'modern', note: '근대 정치 개념. 백성·양민으로.' },
  { word: '국민', cat: 'modern', note: '근대 국가 개념. 백성·신민으로.' },
  { word: '민주주의', cat: 'modern' },
  { word: '공화국', cat: 'modern' },
  { word: '대통령', cat: 'modern' },
  { word: '국회', cat: 'modern' },
  { word: '선거', cat: 'modern', note: '근대 선거 제도(천거·추대와 구분).' },
  { word: '투표', cat: 'modern' },
  { word: '정당', cat: 'modern', note: '근대 정당(붕당·당파와 구분).' },
  { word: '경제', cat: 'modern', note: '근대 학술 용어로의 "경제"는 시대 확인.' },
  { word: '사회', cat: 'modern', note: '근대 번역어(社會). 시대 확인.' },
  { word: '개인', cat: 'modern', note: '근대 번역어(個人). 시대 확인.' },
  { word: '자유', cat: 'modern', note: '근대 번역 개념으로 쓰면 확인(自由).' },
  { word: '평등', cat: 'modern', note: '근대 번역 개념(平等).' },
  { word: '인권', cat: 'modern' },
  { word: '권리', cat: 'modern', note: '근대 번역어(權利).' },
  { word: '의무', cat: 'modern' },
  { word: '과학', cat: 'modern', note: '근대 번역어(科學). 격물·궁리로.' },
  { word: '철학', cat: 'modern', note: '근대 번역어(哲學).' },
  { word: '심리', cat: 'modern', note: '근대 학문 용어.' },
  { word: '문화', cat: 'modern', note: '근대 번역어(文化).' },
  { word: '예술', cat: 'modern', note: '근대 번역어(藝術).' },
  { word: '문학', cat: 'modern', note: '근대 의미의 "문학"은 시대 확인.' },
  { word: '소설', cat: 'modern', note: '근대 소설 개념. 패관·이야기책 등으로 검토.' },
  { word: '신문', cat: 'modern', note: '근대 신문. 방(榜)·기별로.' },
  { word: '잡지', cat: 'modern' },
  { word: '방송', cat: 'modern' },
  { word: '뉴스', cat: 'modern' },
  { word: '기자', cat: 'modern' },
  { word: '광고', cat: 'modern' },
  { word: '우표', cat: 'modern' },
  { word: '우체국', cat: 'modern', note: '근대 우편 제도. 파발·역참으로.' },
  { word: '주소', cat: 'modern', note: '근대 주소 체계.' },
  { word: '주민등록', cat: 'modern' },
  { word: '신분증', cat: 'modern', note: '근대 신분증. 호패로.' },
  { word: '여관', cat: 'modern', note: '근대식 숙박. 주막·객주·여각으로.' },
  { word: '식당', cat: 'modern', note: '근대 외식업. 주막·국밥집으로.' },
  { word: '시장경제', cat: 'modern' },
  { word: '노동자', cat: 'modern', note: '근대 계급 용어.' },
  { word: '계급', cat: 'modern', note: '근대 사회 용어(신분과 구분).' },
  { word: '혁명', cat: 'modern', note: '근대 정치 개념. 역성혁명·반정과 구분.' },
  { word: '시간표', cat: 'modern' },
  { word: '분', cat: 'modern', note: '"분" 단위 시각은 근대 시계 보급 이후.' },
  { word: '초', cat: 'modern', note: '"초" 단위 시각은 근대 시계 이후. 단위 확인.' },
  { word: '미터', cat: 'modern', note: '미터법은 근대 도량형.' },
  { word: '킬로', cat: 'modern' },
  { word: '그램', cat: 'modern' },
  { word: '센티', cat: 'modern' },
  { word: '리터', cat: 'modern' },
  { word: '퍼센트', cat: 'modern' },
  { word: '도시', cat: 'modern', note: '근대 의미의 "도시"는 확인. 도성·읍성으로.' },
  { word: '국가', cat: 'modern', note: '근대 국가 개념(國家). 시대 확인.' },
  { word: '정부', cat: 'modern', note: '근대 행정 용어. 조정·관청으로.' },
  { word: '공무원', cat: 'modern', note: '근대 직제. 관리·아전으로.' },
  { word: '군인', cat: 'modern', note: '근대 군 용어. 군졸·병사·군관으로.' },
  { word: '장교', cat: 'modern' },

  // ── 현대 말투·신조어 (casual) ──
  { word: '대박', cat: 'casual', note: '현대 구어. "굉장하다/놀랍다"로.' },
  { word: '헐', cat: 'casual' },
  { word: '짱', cat: 'casual' },
  { word: '쩐다', cat: 'casual' },
  { word: '쩔어', cat: 'casual' },
  { word: '개꿀', cat: 'casual' },
  { word: '꿀잼', cat: 'casual' },
  { word: '노잼', cat: 'casual' },
  { word: '핵', cat: 'casual', note: '강조 접두 "핵-"은 현대 신조어.' },
  { word: '존맛', cat: 'casual' },
  { word: '갓', cat: 'casual', note: '강조 "갓-"은 현대어. 모자 "갓"과 구분.' },
  { word: '꿀팁', cat: 'casual' },
  { word: '레전드', cat: 'casual' },
  { word: '멘붕', cat: 'casual' },
  { word: '인싸', cat: 'casual' },
  { word: '아싸', cat: 'casual' },
  { word: '갑분싸', cat: 'casual' },
  { word: '꿀', cat: 'casual', note: '"꿀이다(좋다)" 신조어. 식품 꿀과 구분.' },
  { word: '느낌적인', cat: 'casual' },
  { word: '느낌이', cat: 'casual', note: '"느낌적 느낌" 류 현대 구어 확인.' },
  { word: '솔직히', cat: 'casual', note: '현대 구어 추임새로 잦으면 확인.' },
  { word: '진심', cat: 'casual', note: '"진심?" 류 감탄 구어면 확인.' },
  { word: '레알', cat: 'casual' },
  { word: '실화', cat: 'casual', note: '"실화냐" 류 신조어 확인.' },
  { word: '핵노잼', cat: 'casual' },
  { word: '꿀템', cat: 'casual' },
  { word: '띵작', cat: 'casual' },
  { word: '갓생', cat: 'casual' },
  { word: '워라밸', cat: 'casual' },
  { word: '플렉스', cat: 'casual' },
  { word: '스웩', cat: 'casual' },
  { word: '꿀맛', cat: 'casual', note: '신조어 용법이면 확인.' },
  { word: '극혐', cat: 'casual' },
  { word: '비호감', cat: 'casual' },
  { word: '호감', cat: 'casual', note: '현대 구어 용법 확인.' },
  { word: '심쿵', cat: 'casual' },
  { word: '설렘', cat: 'casual', note: '현대 구어 빈출이면 확인.' },
  { word: '꿀잠', cat: 'casual' },
  { word: '득템', cat: 'casual' },
  { word: '현타', cat: 'casual' },
  { word: '오졌다', cat: 'casual' },
  { word: '쌉', cat: 'casual' },
  { word: '개이득', cat: 'casual' },
  { word: '꿀빨', cat: 'casual' },
  { word: '치트키', cat: 'casual' },
  { word: '나이스샷', cat: 'casual' },
  { word: '파이팅', cat: 'casual', note: '현대 응원 구호. "힘내라/기운 내자"로.' },
  { word: '화이팅', cat: 'casual' },
  { word: '굿잡', cat: 'casual' },
  { word: '굿모닝', cat: 'casual' },
  { word: '하이', cat: 'casual', note: '인사 "hi". 감탄 "하이고"와 구분.' },
  { word: '바이', cat: 'casual' },
  { word: '쏘리', cat: 'casual' },
  { word: '럭키', cat: 'casual' },
  { word: '와우', cat: 'casual' },
  { word: '심플', cat: 'casual' },
  { word: '쿨하게', cat: 'casual' },
  { word: '쿨한', cat: 'casual' },
]

const CAT_META: Record<Cat, { label: string; color: string; desc: string }> = {
  tech: { label: '현대 기술·기기', color: 'var(--warn)', desc: '전근대 배경에 존재하지 않던 기계·발명품' },
  loan: { label: '외래어·외국어', color: 'var(--accent)', desc: '근현대에 들어온 외국어·차용어' },
  modern: { label: '근현대 제도·개념', color: 'var(--ok)', desc: '근대 이후 성립한 제도·번역어·단위' },
  casual: { label: '현대 말투·신조어', color: 'var(--muted)', desc: '현대 구어·인터넷 신조어' },
}

// ── 탐지 ───────────────────────────────────────────────
interface Hit {
  entry: Entry
  index: number
  end: number
  line: number
}

// 사전 단어를 길이 내림차순으로 정렬(긴 단어 우선 매칭으로 겹침 줄임)
const SORTED = [...DICT].sort((a, b) => b.word.length - a.word.length)

// 정규식 특수문자 이스케이프
function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 전체 사전 단일 정규식(대안 매칭). 길이순으로 합쳐 긴 단어가 먼저 매칭되게 한다.
const COMBINED = new RegExp(SORTED.map((e) => esc(e.word)).join('|'), 'g')
const WORD_INDEX: Map<string, Entry> = new Map(DICT.map((e) => [e.word, e]))

function detect(text: string): Hit[] {
  if (!text) return []
  const hits: Hit[] = []
  // 줄 계산용 개행 인덱스
  const lineStarts: number[] = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1)
  const toLine = (idx: number) => {
    let lo = 0, hi = lineStarts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (lineStarts[mid] <= idx) lo = mid; else hi = mid - 1
    }
    return lo + 1
  }

  COMBINED.lastIndex = 0
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = COMBINED.exec(text)) !== null) {
    if (guard++ > 20000) break // 폭주 방지
    const word = m[0]
    const entry = WORD_INDEX.get(word)
    if (entry) {
      hits.push({ entry, index: m.index, end: m.index + word.length, line: toLine(m.index) })
    }
    if (m.index === COMBINED.lastIndex) COMBINED.lastIndex++
  }
  return hits
}

// 본문 강조용 세그먼트 분할(매치/비매치 교차)
interface Seg { text: string; hit?: Hit }
function segmentize(text: string, hits: Hit[]): Seg[] {
  if (hits.length === 0) return [{ text }]
  const segs: Seg[] = []
  let cur = 0
  for (const h of hits) {
    if (h.index > cur) segs.push({ text: text.slice(cur, h.index) })
    segs.push({ text: text.slice(h.index, h.end), hit: h })
    cur = h.end
  }
  if (cur < text.length) segs.push({ text: text.slice(cur) })
  return segs
}

export default function AnachronismChecker({ payload }: { payload?: Record<string, unknown> } = {}) {
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState<'all' | Cat>('all')

  // [연계] 다른 도구가 보낸 본문(payload.text)을 점검 대상으로 채움 — 같은 payload 는 1회만 처리(부모 리렌더 시 재적용 방지)
  const handledPayload = useRef<unknown>(null)
  useEffect(() => {
    if (!payload || handledPayload.current === payload) return
    handledPayload.current = payload
    const t = typeof payload.text === 'string' ? payload.text : ''
    if (t.trim()) setText(t)
  }, [payload]) // eslint-disable-line
  const copyTimer = useRef<number | null>(null)

  // 언마운트 시 복사 타이머 정리
  useEffect(() => () => { if (copyTimer.current != null) clearTimeout(copyTimer.current) }, [])

  const hits = useMemo(() => {
    try { return detect(text) } catch { return [] }
  }, [text])

  const counts = useMemo(() => {
    const c: Record<Cat, number> = { tech: 0, loan: 0, modern: 0, casual: 0 }
    for (const h of hits) c[h.entry.cat]++
    return c
  }, [hits])

  const shownHits = useMemo(
    () => (filter === 'all' ? hits : hits.filter((h) => h.entry.cat === filter)),
    [hits, filter],
  )

  // 강조 표시는 필터 반영(필터된 항목만 강조)
  const segs = useMemo(() => {
    try { return segmentize(text, shownHits) } catch { return [{ text }] }
  }, [text, shownHits])

  // 단어별 집계(목록용): 같은 단어 묶어 횟수 표시
  const grouped = useMemo(() => {
    const map = new Map<string, { entry: Entry; count: number; lines: number[] }>()
    for (const h of shownHits) {
      const g = map.get(h.entry.word)
      if (g) { g.count++; if (!g.lines.includes(h.line)) g.lines.push(h.line) }
      else map.set(h.entry.word, { entry: h.entry, count: 1, lines: [h.line] })
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.entry.word.localeCompare(b.entry.word))
  }, [shownHits])

  const resultText = useMemo(() => {
    if (grouped.length === 0) return ''
    const lines: string[] = ['[시대착오 점검 결과]', `의심 어휘 ${hits.length}건(${grouped.length}종)`, '']
    for (const g of grouped) {
      const cm = CAT_META[g.entry.cat]
      const note = g.entry.note || cm.desc
      lines.push(`• "${g.entry.word}" ×${g.count} [${cm.label}] (줄 ${g.lines.join(', ')})`)
      lines.push(`  → ${note}`)
    }
    return lines.join('\n')
  }, [grouped, hits.length])

  const doCopy = async () => {
    if (!resultText) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(resultText)
      } else {
        const ta = document.createElement('textarea')
        ta.value = resultText
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  const sample = '주막에 들어선 그는 스마트폰을 꺼내 사진을 찍었다. "오케이, 대박이네." 커피 한 잔을 마시며 버스 시간표를 확인하던 선비는 경찰이 올까 스트레스를 받았다. 학교 시험이 코앞이라 파이팅을 외쳤다.'

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const topBar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }
  const title: React.CSSProperties = { fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }
  const taStyle: React.CSSProperties = {
    minHeight: 90, maxHeight: 150, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '11px 13px', fontSize: 15, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const chipRow: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }
  const chip = (active: boolean, color: string): React.CSSProperties => ({
    fontSize: 12, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${active ? color : 'var(--border)'}`,
    background: active ? color : 'var(--chrome-2)',
    color: active ? 'var(--paper)' : 'var(--text)', userSelect: 'none', whiteSpace: 'nowrap',
  })
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 2 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '2px 0' }
  const preview: React.CSSProperties = {
    background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10,
    padding: '11px 13px', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px' }
  const cardHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }
  const tag = (color: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 6, padding: '1px 6px', whiteSpace: 'nowrap' })
  const wordTxt: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: 'var(--text)' }
  const cntTxt: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const noteTxt: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 2 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)', textAlign: 'center', fontSize: 13, lineHeight: 1.6, padding: 16 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <div style={topBar}>
        <div style={title}>🏺 사극·시대소설에서 어색할 수 있는 현대어·외래어를 로컬 사전({DICT.length}+)으로 찾습니다 (네트워크 불필요)</div>
      </div>

      <textarea
        style={taStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="시대물 원고를 붙여넣으세요. 현대 기술·외래어·근현대 제도·신조어를 찾아 강조합니다."
        spellCheck={false}
        aria-label="시대착오 점검 입력"
      />

      <div style={chipRow}>
        <span style={chip(filter === 'all', 'var(--accent)')} onClick={() => setFilter('all')} role="button" tabIndex={0}>전체 {hits.length}</span>
        <span style={chip(filter === 'tech', CAT_META.tech.color)} onClick={() => setFilter('tech')} role="button" tabIndex={0}>기술 {counts.tech}</span>
        <span style={chip(filter === 'loan', CAT_META.loan.color)} onClick={() => setFilter('loan')} role="button" tabIndex={0}>외래어 {counts.loan}</span>
        <span style={chip(filter === 'modern', CAT_META.modern.color)} onClick={() => setFilter('modern')} role="button" tabIndex={0}>제도 {counts.modern}</span>
        <span style={chip(filter === 'casual', CAT_META.casual.color)} onClick={() => setFilter('casual')} role="button" tabIndex={0}>신조어 {counts.casual}</span>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => setText(sample)} type="button">예시</button>
        <button className="minibtn" onClick={() => setText('')} disabled={!text} type="button">지우기</button>
        <button className="btn-primary" onClick={doCopy} disabled={grouped.length === 0} type="button">{copied ? '복사됨 ✓' : '결과 복사'}</button>
      </div>

      {text.trim() === '' ? (
        <div style={empty}>
          <div style={{ fontSize: 30 }}>📜</div>
          <div>시대물 원고를 붙여넣으면 컴퓨터·커피·오케이·스트레스 같은<br />현대어·외래어를 찾아 본문에 강조하고 목록으로 정리합니다.</div>
          <div style={hint}>부분일치 사전이라 일부는 문맥 확인이 필요한 참고 항목입니다(예: 무속 "굿", 악기 "기타").</div>
        </div>
      ) : (
        <div style={scroll}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={sectionTitle}>본문 강조 {filter !== 'all' && `· ${CAT_META[filter].label}만`}</div>
            <div style={preview}>
              {segs.map((s, i) =>
                s.hit ? (
                  <mark
                    key={i}
                    title={`${CAT_META[s.hit.entry.cat].label}: ${s.hit.entry.note || CAT_META[s.hit.entry.cat].desc}`}
                    style={{
                      background: 'transparent',
                      color: CAT_META[s.hit.entry.cat].color,
                      fontWeight: 700,
                      borderBottom: `2px solid ${CAT_META[s.hit.entry.cat].color}`,
                      padding: '0 1px',
                    }}
                  >
                    {s.text}
                  </mark>
                ) : (
                  <span key={i}>{s.text}</span>
                ),
              )}
            </div>
          </div>

          {grouped.length === 0 ? (
            <div style={empty}>
              <div style={{ fontSize: 30 }}>{hits.length === 0 ? '✅' : '🔍'}</div>
              <div>{hits.length === 0 ? '의심되는 현대어·외래어가 없습니다. 고증이 깔끔합니다!' : '선택한 분류에 해당하는 항목이 없습니다.'}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={sectionTitle}>의심 어휘 목록 ({grouped.length}종 · {shownHits.length}건)</div>
              {grouped.map((g) => {
                const cm = CAT_META[g.entry.cat]
                return (
                  <div key={g.entry.word} style={card}>
                    <div style={cardHead}>
                      <span style={wordTxt}>{g.entry.word}</span>
                      <span style={tag(cm.color)}>{cm.label}</span>
                      <span style={{ flex: 1 }} />
                      <span style={cntTxt}>{g.count}회 · 줄 {g.lines.slice(0, 8).join(', ')}{g.lines.length > 8 ? '…' : ''}</span>
                    </div>
                    <div style={noteTxt}>{g.entry.note || cm.desc}</div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={hint}>고증 보조용 근사 도구입니다. 사전 부분일치라 동음이의(예: 기타 其他, 굿 무속)는 직접 확인하세요. 배경 시대에 따라 일부 어휘는 정상일 수 있습니다.</div>
        </div>
      )}
    </div>
  )
}
