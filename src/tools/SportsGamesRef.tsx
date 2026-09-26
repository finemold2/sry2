// 놀이·스포츠·도박 사전 — 시대·문화별 놀이/경기/내기의 규칙·도구·은어·계층 묘사를 모은 로컬 사전.
// 장면 소재(시정의 도박판, 귀족의 마상시합, 아이들의 골목놀이 등)와 계층·시대 고증에 쓴다.
// 자급식: 외부 네트워크·라이브러리 없음. react 와 ./linkbus 만 import. 자작 텍스트만 사용(저작권 안전).
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToStash, hasStash, addToProject, hasProjectBridge, addToLibrary, Emoji } from './linkbus'

export const meta = { id: 'sports-games-ref', name: '놀이·스포츠·도박 사전', icon: '🎲', group: '리서치·자료', intro: '시대·문화별 놀이·경기·내기의 규칙·도구·은어·계층을 찾아 장면에 심으세요', w: 640, h: 580 }

interface Entry {
  name: string
  alias?: string       // 다른 이름/원어
  era?: string         // 시대·지역
  klass?: string       // 즐기던 계층
  rules: string        // 규칙·진행
  gear?: string        // 도구·판·장비
  slang?: string       // 은어·속어·외침
  scene?: string       // 장면 소재 한 줄
}
interface CatDef { key: string; label: string; icon: string; items: Entry[] }

// ── 사전 본체 — 7개 카테고리, 합계 90+ 항목. 모두 자작 요약. ──
const CATS: CatDef[] = [
  {
    key: 'board', label: '판·말놀이', icon: '🁢', items: [
      { name: '바둑', alias: '위기(圍棋)·고(碁)', era: '고대 중국~동아시아 전반', klass: '선비·양반·승려', rules: '19줄 격자(361점)에 흑백 돌을 번갈아 놓아 빈 집(영토)을 더 많이 차지하면 이긴다. 상대 돌을 활로(자유)가 없게 에워싸면 따낸다.', gear: '바둑판(나무 반), 흑돌·백돌, 통과 뚜껑', slang: '“수가 보인다”, “패를 쓴다”, “대마는 죽지 않는다”', scene: '두 노인이 정자에서 한나절을 한 판에 쏟으며 세상사를 빗댄다.' },
      { name: '장기', alias: '상희(象戲)', era: '고려~조선·중국 장기(샹치)와 형제', klass: '서민~양반 두루', rules: '초·한 양편이 궁(왕)을 가운데 두고 차·포·마·상·졸 등을 움직여 상대 궁을 잡으면 이긴다. 포는 다른 말을 넘어야 움직인다.', gear: '장기판, 붉은(한)·푸른(초) 글자 알', slang: '“장군!”, “멍군!”, “외통수”', scene: '주막 평상에서 구경꼴이 둘러서서 훈수를 두다 멱살잡이가 난다.' },
      { name: '체스', alias: 'Chess', era: '중세 유럽(인도 차투랑가에서)', klass: '귀족·성직자·시민', rules: '8×8판에서 킹을 지키며 퀸·룩·비숍·나이트·폰을 부려 상대 킹을 도망갈 수 없게(체크메이트) 만든다.', gear: '체스보드, 흑백 기물 16개씩', slang: '“Check”, “Mate”, “캐슬링”, “앙파상”', scene: '겨울 살롱에서 장군과 외교관이 말 한 수에 자존심을 건다.' },
      { name: '윷놀이', era: '한국 고대~현재(설·정월)', klass: '온 마을·신분 무관', rules: '네 개의 윷가락을 던져 도·개·걸·윷·모가 나오면 그 수만큼 말을 옮긴다. 상대 말을 잡거나 지름길을 타며 네 말을 먼저 빼면 이긴다.', gear: '윷가락 넷, 윷판(말판), 말', slang: '“모야!”, “업고 가자”, “잡았다!”', scene: '명절 마당에서 윷이 멍석 밖으로 튀고 온 식구가 환호한다.' },
      { name: '백개먼', alias: 'Backgammon·삼륙(西洋雙陸)', era: '고대 근동~중세 유럽', klass: '상인·여행자·귀족', rules: '주사위 두 개를 굴려 나온 수만큼 자기 말 열다섯을 골인 방향으로 옮긴다. 홀로 선 상대 말은 쳐서 밖으로 내보낸다. 먼저 다 빼면 승.', gear: '24포인트 보드, 말 15개씩, 주사위, 더블링 큐브', slang: '“더블!”, “블롯이다”, “게이트가 닫혔다”', scene: '항구 카페에서 두 선장이 주사위 소리로 무료한 정박을 달랜다.' },
      { name: '오목', alias: '고모쿠·렌주', era: '동아시아', klass: '아이~어른 누구나', rules: '바둑판에 흑백 돌을 번갈아 두어 가로·세로·대각으로 다섯 알을 먼저 잇는 쪽이 이긴다.', gear: '바둑판·돌(또는 공책 격자·연필)', slang: '“삼삼”, “쌍삼 금수”, “막혔다”', scene: '시험 끝난 교실 뒤편, 공책 칸에 ○×로 한 판이 벌어진다.' },
      { name: '고누', era: '조선 서민·농촌', klass: '농민·아이들', rules: '땅이나 종이에 그린 간단한 판(우물고누·곤질고누 등)에서 말을 움직여 상대를 가두거나 못 움직이게 하면 이긴다.', gear: '땅바닥 그림판, 돌·나뭇가지 말', slang: '“가뒀다”, “움쩍 못 한다”', scene: '들일 참에 머슴들이 흙바닥에 금을 긋고 조약돌로 내기를 건다.' },
      { name: '주사위 놀이(쌍륙)', alias: '雙六', era: '삼국~조선 귀족', klass: '궁중·양반·기방', rules: '주사위를 굴려 말을 옮겨 먼저 진영을 통과시키는 백개먼 계열. 기녀와 한량의 풍류 놀이로도 즐겼다.', gear: '쌍륙판, 말, 주사위 둘', slang: '“쌍륙이오”, “끗발이 좋다”', scene: '비단 깔린 기방에서 가락에 맞춰 주사위가 또르르 구른다.' },
    ],
  },
  {
    key: 'card', label: '패·카드놀이', icon: '🃏', items: [
      { name: '투전', era: '조선 후기', klass: '저잣거리·노름꾼·한량', rules: '좁고 긴 기름종이 패(가락)에 그림·숫자를 그려 끗수를 겨룬다. 가보(9끗)에 가깝게 모으는 도리짓고땡·동동이 등 변종이 많았다.', gear: '투전목(기름먹인 종이패 한 묶음), 판돈', slang: '“가보다!”, “땡 잡았다”, “물주”, “끗발”', scene: '밤늦은 도박장 호롱불 아래, 빚에 몰린 사내가 마지막 패를 뒤집는다.' },
      { name: '화투', alias: '하나후다 변형', era: '구한말~근현대 한국', klass: '서민·노인·잔칫집', rules: '열두 달 그림패 48장. 바닥패와 같은 달을 맞춰 먹고 광·띠·열끗·피로 점수를 낸다. 고스톱·민화투·고도리 등.', gear: '화투 48장, 점수표, 판돈(고스톱)', slang: '“고!”, “스톱!”, “쓰리고”, “피박·광박”, “싸리”', scene: '명절 안방, 담요 위에서 “고냐 스톱이냐”로 한 해 어른의 자존심이 갈린다.' },
      { name: '포커', alias: 'Poker', era: '19세기 미국~세계', klass: '카우보이·도박사·상류 살롱', rules: '52장 카드로 각자 패를 만들어 족보(원페어<투페어<…<스트레이트<플러시<풀하우스<…)를 겨룬다. 베팅·블러프가 핵심.', gear: '카드 한 벌, 칩, 딜러 버튼', slang: '“콜”, “레이즈”, “올인”, “블러프”, “텔(tell)”', scene: '서부 살롱, 권총을 탁자에 올린 채 누군가 “올인”을 외친다.' },
      { name: '블랙잭', alias: '21·트웬티원', era: '18세기 유럽~카지노', klass: '카지노 손님·딜러', rules: '카드 합을 21에 가깝게(넘으면 버스트) 만들어 딜러를 이긴다. 그림패는 10, 에이스는 1 또는 11.', gear: '카드 슈, 칩, 딜러 테이블', slang: '“히트”, “스탠드”, “버스트”, “더블다운”, “블랙잭!”', scene: '네온 카지노, 딜러가 무표정하게 “버스트”라며 칩을 쓸어간다.' },
      { name: '타로(점·놀이)', alias: 'Tarocchi', era: '15세기 이탈리아~', klass: '귀족 카드놀이→후대 점술', rules: '본래 트럼프 계열 카드놀이였으나 후대에 78장(메이저·마이너 아르카나)으로 점을 치는 도구가 됨.', gear: '타로 78장, 천, 촛불', slang: '“역방향”, “스프레드”, “죽음 카드”', scene: '천막 안 집시 점쟁이가 “이 카드는 끝이자 시작입니다”라며 한 장을 뒤집는다.' },
      { name: '브리지', alias: 'Contract Bridge', era: '19세기말~20세기 사교계', klass: '상류·지식인 사교', rules: '네 명이 두 편으로 나뉘어 비딩(계약)으로 목표 트릭 수를 정하고, 패를 내어 그만큼 따낸다. 파트너십·신호가 정교하다.', gear: '카드 한 벌, 비딩 박스, 스코어시트', slang: '“원 노트럼프”, “패스”, “더미”, “파트너”', scene: '응접실의 부인들이 찻잔을 사이에 두고 눈빛만으로 패를 짠다.' },
      { name: '관운장·골패(골패 노름)', alias: '骨牌', era: '동아시아 전통', klass: '도박꾼·기방·상인', rules: '뼈·상아·대나무에 점을 새긴 패(도미노 계열)로 끗수를 짝지어 겨룬다. 천구·지구 등 패 이름이 있다.', gear: '골패 한 벌, 판, 돈', slang: '“천구다”, “쌍이다”, “끗이 맞다”', scene: '뒷골목 노름방, 패가 부딪는 딸깍 소리와 돈이 오가는 숨죽인 긴장.' },
      { name: '솔리테어', alias: '페이션스·혼자카드', era: '18세기 유럽~', klass: '혼자 노는 누구나', rules: '혼자서 카드를 정해진 규칙대로 쌓아 모든 패를 정렬하면 성공. 클론다이크·프리셀 등 변종.', gear: '카드 한 벌(또는 화면)', slang: '“막혔다”, “리셔플”, “완성!”', scene: '불 꺼진 사무실, 야근하는 이가 책상에서 혼자 카드를 늘어놓는다.' },
    ],
  },
  {
    key: 'street', label: '골목·아이놀이', icon: '🪀', items: [
      { name: '제기차기', era: '한국 전통~현재', klass: '아이·청소년', rules: '엽전이나 천을 싼 제기를 발 안쪽·바깥으로 떨어뜨리지 않고 많이 차는 사람이 이긴다. 양발차기·들제기 등.', gear: '제기(엽전+한지/천술)', slang: '“헐랭이”, “몇 번?”, “땅제기”', scene: '겨울 골목, 콧물 닦으며 “마흔둘!”을 세는 아이들의 입김.' },
      { name: '딱지치기', era: '근현대 한국', klass: '동네 아이들', rules: '종이를 접은 딱지를 땅에 놓고, 상대 딱지를 내리쳐 뒤집으면 따 먹는다.', gear: '두껍게 접은 종이 딱지', slang: '“넘어갔다!”, “바람 넣기”, “장딱지”', scene: '먼지 나는 공터, 한 아이가 온몸으로 내리쳐 흙먼지가 인다.' },
      { name: '구슬치기', era: '근현대 한국·세계', klass: '아이들', rules: '유리구슬을 손가락으로 튕겨 상대 구슬을 맞히거나 구멍에 넣으면 따 먹는다. 삼각형·구멍치기 등.', gear: '유리·사기 구슬, 땅에 판 구멍', slang: '“알 박기”, “맞혔다”, “다마”', scene: '담벼락 그늘, 무릎 꿇은 아이가 한 알에 호흡을 멈춘다.' },
      { name: '비석치기', era: '한국 전통', klass: '아이들', rules: '세워 둔 상대의 납작한 돌(비석)을 자기 돌을 던지거나 발등·무릎·머리에 얹어 가서 쓰러뜨리는 단계 놀이.', gear: '납작한 돌 두 개씩', slang: '“발등!”, “장군 단계”, “죽었다”', scene: '논둑길, 돌을 머리에 인 채 비틀비틀 걸어가 “와르르” 무너뜨린다.' },
      { name: '공기놀이', alias: '살구·짜개받기', era: '한국 전통~현재', klass: '주로 여자아이', rules: '작은 공깃돌 다섯을 던지고 받으며 한 알·두 알…꺾기까지 단계를 통과한다. 손등에 얹어 받기로 끝낸다.', gear: '공깃돌 다섯(작은 돌)', slang: '“꺾기”, “죽었다”, “몇 년?”', scene: '교실 바닥, 쉬는 시간 또각또각 돌 부딪는 소리가 번진다.' },
      { name: '사방치기', alias: '땅따먹기·돌차기', era: '한국·세계 공통', klass: '아이들', rules: '땅에 칸을 그리고 돌을 던진 칸을 외발로 밟지 않고 뛰어 돌아온다. 단계가 오를수록 어려워진다.', gear: '분필·돌, 땅 그림판', slang: '“한 발!”, “선 밟았다”, “집 짓기”', scene: '학교 운동장에 그려진 분필 칸을 외다리로 콩콩 뛴다.' },
      { name: '숨바꼭질', alias: '꼭꼭숨어라', era: '세계 보편', klass: '어린아이', rules: '술래가 눈을 감고 세는 동안 숨고, 술래가 찾아낸다. 먼저 들킨 사람이 다음 술래.', gear: '없음(숨을 곳)', slang: '“꼭꼭 숨어라”, “못 찾겠다 꾀꼬리”', scene: '해질녘, “못 찾겠다 꾀꼬리” 소리에 골목 어딘가에서 키득 새어 나온다.' },
      { name: '말뚝박기', era: '근현대 한국', klass: '남자아이·청소년', rules: '한 편이 허리를 굽혀 말이 되고, 다른 편이 달려와 등에 올라탄다. 무너지거나 가위바위보로 공수 교대.', gear: '몸(벽에 기댄 깍두기)', slang: '“말이야 곰이야”, “무너졌다!”', scene: '쉬는 시간 복도, 우당탕 무너지며 웃음과 비명이 터진다.' },
      { name: '땅따먹기(뼘치기)', era: '한국 전통', klass: '아이들', rules: '땅에 자기 집을 두고 돌이나 손가락을 튕겨 세 번 만에 집으로 돌아오면 그 영역을 차지한다.', gear: '땅·돌·막대기', slang: '“한 뼘”, “내 땅이다”, “죽었다”', scene: '흙마당에 점점 넓어지는 곡선의 영토가 그어진다.' },
      { name: '고무줄놀이', era: '근현대 한국', klass: '주로 여자아이', rules: '긴 고무줄을 양쪽에서 잡고, 노래에 맞춰 발로 걸고 넘으며 점점 높이를 올린다.', gear: '긴 고무줄', slang: '“발목”, “무릎”, “만세(머리 위)”', scene: '노래 가락에 맞춰 치마가 펄럭이고 고무줄이 발에 척척 감긴다.' },
    ],
  },
  {
    key: 'field', label: '들·마당 경기', icon: '🤼', items: [
      { name: '씨름', era: '한국 고대~현재(단오·추석)', klass: '장정·농민·후대 직업선수', rules: '샅바를 잡고 힘과 기술(들배지기·안다리·뒤집기)로 상대를 넘어뜨린다. 무릎 위가 땅에 닿으면 패. 천하장사를 가린다.', gear: '샅바, 모래판, 황소(상품)', slang: '“들배지기!”, “장사”, “모래판”', scene: '단오 모래판, 우승자가 황소 등에 올라 마을을 한 바퀴 돈다.' },
      { name: '레슬링(고대)', alias: 'Pale·팔레', era: '고대 그리스 올림피아', klass: '시민·자유민 선수', rules: '벌거벗고 기름을 바른 채 상대를 세 번 넘어뜨리면 승. 판크라티온은 거의 무제한 격투였다.', gear: '기름·모래, 알몸', slang: '“던졌다”, “항복(손가락 들기)”', scene: '올림피아의 흙먼지 속, 기름 바른 몸이 햇빛에 번들거린다.' },
      { name: '검투(글라디아토르)', alias: 'Munera', era: '고대 로마', klass: '노예·죄수 검투사, 관중은 전 계층', rules: '원형경기장에서 무장한 검투사들이 싸운다. 패자의 생사는 관중·주최자의 엄지로 갈렸다. 종류별 무장이 달랐다.', gear: '글라디우스·방패·그물·삼지창, 콜로세움', slang: '“미테!(살려라)”, “유구라!(찔러라)”', scene: '함성으로 들끓는 원형경기장, 모래에 핏자국이 길게 끌린다.' },
      { name: '마상시합', alias: 'Joust·토너먼트', era: '중세 유럽', klass: '기사·귀족', rules: '두 기사가 말을 달려 긴 창(랜스)으로 서로를 겨눠 떨어뜨리거나 창을 부러뜨린다. 점수로 우열을 가린다.', gear: '랜스, 갑옷, 군마, 방벽(틸트)', slang: '“라일라!(달려라)”, “창을 꺾었다”', scene: '귀부인의 손수건을 투구에 단 기사가 흙먼지를 일으키며 돌진한다.' },
      { name: '폴로', alias: '격구(擊毬)', era: '페르시아 고대~동아시아·영국', klass: '왕족·무관·기병', rules: '말을 타고 긴 채로 공을 쳐 상대 골에 넣는다. 동아시아 격구는 무관의 무예 훈련이기도 했다.', gear: '말, 폴로 채(장시), 공, 골문', slang: '“골이다”, “말머리를 돌려”', scene: '궁궐 마당, 비단옷 무관들이 채를 휘두르며 흙을 박찬다.' },
      { name: '줄다리기', era: '세계 농경문화 보편', klass: '온 마을·신분 무관', rules: '두 편이 굵은 줄을 마주 당겨 표시선을 넘기면 이긴다. 풍년·승부 점치는 의례이기도 했다.', gear: '굵은 동아줄, 표시선', slang: '“영차!”, “당겨라”, “줄이 넘어온다”', scene: '정월 대보름, 암줄과 수줄을 엮고 온 동네가 함성으로 줄을 당긴다.' },
      { name: '축국', alias: '蹴鞠', era: '고대 중국·한국·일본', klass: '귀족·무관·궁중', rules: '깃털·가죽 공을 발로 차 떨어뜨리지 않거나 작은 문에 넣는다. 군사 훈련이자 풍류였다.', gear: '가죽·털 공, 문(球門)', slang: '“받아라”, “떨구지 마라”', scene: '단오의 궁궐 뜰, 공이 발에서 발로 옮겨 다니며 비단 소매가 펄럭인다.' },
      { name: '연날리기·연싸움', era: '동아시아·세계', klass: '아이~어른', rules: '연을 띄워 높이·재주를 겨루거나, 실에 사금파리를 먹여 상대 연줄을 끊는 연싸움을 한다.', gear: '방패연·가오리연, 자세, 사금파리 먹인 실', slang: '“끊겼다!”, “얼레를 풀어라”, “날린다”', scene: '정월 강변 둑, 끊긴 연이 멀리 날아가자 아이가 발을 동동 구른다.' },
      { name: '그네뛰기', era: '한국 전통(단오)', klass: '주로 여인·처녀', rules: '높은 나뭇가지에 맨 그네를 굴러 누가 더 높이 올라 매단 방울·꽃을 차거나 끈을 잡느냐를 겨룬다.', gear: '그넷줄, 발판, 높이 매단 표적', slang: '“더 굴러라”, “닿았다!”', scene: '단오, 치마폭을 부풀리며 처녀의 발끝이 신록의 가지를 스친다.' },
    ],
  },
  {
    key: 'court', label: '구기·코트 경기', icon: '⚽', items: [
      { name: '축구', alias: 'Football·Soccer', era: '중세 민속축구~19세기 근대 규칙', klass: '민중→전 계층', rules: '손을 쓰지 않고(골키퍼 제외) 공을 차 상대 골에 넣는다. 많이 넣는 쪽이 승. 오프사이드 규칙이 핵심.', gear: '공, 골대, 잔디 경기장', slang: '“골!”, “오프사이드”, “페널티”, “핸드볼”', scene: '진창 마을 광장에서 수백 명이 공 하나를 두고 옆 마을과 패싸움하듯 몰린다.' },
      { name: '테니스(죈드폼)', alias: 'Jeu de paume·리얼테니스', era: '중세 프랑스 궁정~근대', klass: '귀족·왕족→시민', rules: '본래 손바닥으로, 후에 라켓으로 공을 쳐 네트 너머로 넘긴다. 0·15·30·40의 독특한 점수 셈.', gear: '라켓, 공, 네트, 코트', slang: '“러브(0)”, “듀스”, “애드”, “폴트”', scene: '궁정 실내코트, 왕이 직접 라켓을 들고 신하와 공을 주고받는다.' },
      { name: '크리켓', alias: 'Cricket', era: '16세기 잉글랜드~영연방', klass: '시골 신사→대중', rules: '투수(볼러)가 던진 공을 타자(배츠맨)가 쳐 두 위켓 사이를 달려 점수(런)를 낸다. 수비가 위켓을 무너뜨리면 아웃.', gear: '배트, 공, 위켓(3주), 잔디 피치', slang: '“하울즈 댓!”, “식스”, “덕(0점)”, “위켓”', scene: '여름 잔디밭, 흰옷의 신사들이 한나절을 두고 느긋이 공을 친다.' },
      { name: '농구', alias: 'Basketball', era: '1891년 미국 고안', klass: '학생→대중·프로', rules: '공을 드리블·패스로 옮겨 높은 골대(바스켓)에 넣는다. 멀리서 넣으면 더 높은 점수.', gear: '공, 바스켓(림·백보드), 코트', slang: '“슛”, “덩크”, “파울”, “스리포인트”', scene: '비 오는 체육관, 신발 끄는 소리와 림을 때리는 공의 울림.' },
      { name: '하키(필드)', alias: 'Field Hockey', era: '고대~근대 영국', klass: '학생·군인·대중', rules: '곡선 스틱으로 공을 쳐 상대 골에 넣는다. 스틱의 평평한 면만 쓸 수 있다.', gear: '하키 스틱, 공, 골대', slang: '“히트!”, “페널티코너”, “파울”', scene: '서리 내린 들판, 스틱과 공이 부딪는 딱딱한 소리가 차게 퍼진다.' },
      { name: '배드민턴', alias: 'Poona·셔틀콕', era: '영국령 인도~근대', klass: '식민지 장교→대중', rules: '깃털 셔틀콕을 라켓으로 쳐 네트 너머로 넘긴다. 바닥에 떨어뜨리거나 네트에 걸면 실점.', gear: '라켓, 셔틀콕, 네트', slang: '“스매시”, “네트인”, “인·아웃”', scene: '저녁 아파트 마당, 가로등 아래 셔틀콕이 하얗게 떠올랐다 떨어진다.' },
      { name: '족구', era: '근현대 한국', klass: '군인·직장인·동네', rules: '발과 머리로만 공을 다뤄 네트 너머로 넘긴다. 한 편 세 번 안에 넘겨야 한다.', gear: '공, 낮은 네트, 코트', slang: '“헤딩!”, “리시브”, “스파이크”, “아웃”', scene: '점심 뒤 운동장, 군화 끈을 조인 병사들이 흙먼지 속에 공을 차 올린다.' },
    ],
  },
  {
    key: 'bet', label: '내기·도박판', icon: '💰', items: [
      { name: '투계', alias: '닭싸움', era: '동남아·동아시아·유럽 전반', klass: '서민~귀족, 도박꾼', rules: '발톱에 쇠발톱(가포)을 단 수탉 둘을 싸움 붙이고, 어느 쪽이 이길지 돈을 건다. 한쪽이 죽거나 달아나면 끝.', gear: '싸움닭, 쇠발톱, 투계장, 판돈', slang: '“가포 채워라”, “물주”, “끝났다”', scene: '먼지 자욱한 투계장, 깃털이 흩날리고 동전이 흙바닥에 떨어진다.' },
      { name: '경마', alias: 'Horse Racing', era: '고대~근대 영국 본격화', klass: '귀족 스포츠→대중 도박', rules: '기수가 탄 말들이 트랙을 달려 순위를 가린다. 관중은 우승마·복합 결과에 돈을 건다(단승·복승 등).', gear: '경주마, 기수·실크, 트랙, 마권', slang: '“다크호스”, “마권”, “배당”, “스타트”', scene: '관중석의 함성, 결승선 앞에서 두 말의 코끝이 사진처럼 겹친다.' },
      { name: '주사위 노름', alias: 'Dice·크랩스 계열', era: '고대~현대 보편', klass: '병사·뱃사람·도박꾼', rules: '주사위를 굴려 나온 눈의 합이나 특정 조합에 돈을 건다. 가장 오래되고 단순한 도박.', gear: '주사위(둘 이상), 컵, 판돈', slang: '“세븐!”, “스네이크아이즈(1·1)”, “하우스”', scene: '병영 막사, 담요 위에서 주사위가 구르고 졸병들의 봉급이 오간다.' },
      { name: '룰렛', alias: 'Roulette', era: '18세기 프랑스~카지노', klass: '유럽 상류·카지노 손님', rules: '회전판에 구슬을 굴려 멈춘 숫자·색을 맞힌다. 단일 숫자는 배당이 크고 적/흑은 거의 반반.', gear: '룰렛 휠, 구슬, 베팅 테이블, 칩', slang: '“레디로느보(걸어주세요)”, “리앙느바플뤼(끝)”, “0(제로)”', scene: '샹들리에 아래, 구슬이 또르르 돌다 “리앙느바플뤼” 한마디에 멎는다.' },
      { name: '슬롯머신', alias: 'One-armed bandit', era: '19세기말 미국~현대', klass: '대중 도박', rules: '동전을 넣고 레버나 버튼으로 릴을 돌려 그림이 일렬로 맞으면 당첨금이 쏟아진다.', gear: '릴 기계, 코인·메달', slang: '“잭팟!”, “외팔이 강도”, “땡잡았다”', scene: '딸랑이는 동전 소리, 노파가 종이컵을 들고 레버를 당기고 또 당긴다.' },
      { name: '복권·제비뽑기', alias: 'Lottery', era: '고대 로마·근세 유럽~현대', klass: '서민·국가 재정', rules: '번호·제비를 사서 추첨에서 맞으면 상금을 받는다. 다리·전쟁 비용을 대는 국가사업이기도 했다.', gear: '복권지, 추첨기·항아리', slang: '“당첨”, “꽝”, “긁는다”', scene: '연말, 가판대 앞 사람들이 복권을 긁으며 한숨과 탄성을 동시에 낸다.' },
      { name: '내기 바둑·장기', era: '동아시아 전반', klass: '한량·내기꾼', rules: '판마다 돈이나 물건을 걸고 두는 바둑·장기. 일부러 져 주거나 사기 수를 부리는 ‘낚시’도 흔했다.', gear: '판·돌·알, 판돈', slang: '“판돈”, “접바둑”, “물주”, “져 줬다”', scene: '시장 한구석, 노름꾼이 어수룩한 손님을 슬슬 약 올려 판돈을 키운다.' },
      { name: '야바위', alias: '셸게임·세 컵 놀이', era: '시대·문화 불문 거리 사기', klass: '거리 사기꾼·뜨내기', rules: '엎은 컵 셋(또는 카드) 중 공이 든 것을 맞히게 한다. 실은 손기술로 늘 빗나가게 하는 사기 노름.', gear: '컵 셋, 작은 공(또는 카드), 바람잡이', slang: '“찾아봐”, “여기 있네!”, “바람잡이”', scene: '장터 한복판, 구경꾼 틈의 바람잡이가 일부러 맞혀 호구를 끌어들인다.' },
      { name: '투우·소싸움', era: '스페인·지중해·한국 청도 등', klass: '농민~귀족·관중', rules: '투우는 투우사가 소와 겨루는 의례적 싸움, 소싸움은 황소 둘을 맞붙여 밀어내는 쪽이 이긴다(한국). 내기가 따른다.', gear: '소, 물레타·검(투우)/없음(소싸움), 투기장', slang: '“올레!”, “밀어!”, “물러섰다”', scene: '흙먼지 이는 투기장, 두 황소의 뿔이 맞물려 땅이 패도록 버틴다.' },
    ],
  },
  {
    key: 'mind', label: '내기말·수수께끼·풍류', icon: '🎏', items: [
      { name: '투호', alias: '投壺', era: '고대 중국~조선 궁중', klass: '왕·사대부·귀빈', rules: '일정 거리에서 화살을 항아리(호) 입에 던져 넣어 많이 넣는 쪽이 이긴다. 예를 갖춘 점잖은 놀이.', gear: '청동·도자 항아리, 화살(살), 점수산가지', slang: '“들어갔다”, “귀에 걸쳤다”, “한 순(巡)”', scene: '정자에서 사대부들이 술잔을 걸고 점잖게 화살을 던진다.' },
      { name: '시패(시 짓기 내기)', alias: '운자 띄우기', era: '동아시아 문인 사회', klass: '문인·선비·기방', rules: '운(韻)을 정해 돌아가며 즉석에서 시구를 잇거나 짓고, 못 하거나 늦으면 벌주를 마신다.', gear: '술잔, 붓·종이, 운자 패', slang: '“운을 띄운다”, “벌주”, “화답하라”', scene: '달밤 누각, 술잔이 한 바퀴 돌고 누군가 운에 막혀 잔을 비운다.' },
      { name: '수수께끼·말놀이', era: '세계 보편', klass: '아이~어른', rules: '말의 이중 의미·소리를 이용한 문제를 내고 맞힌다. 끝말잇기·스무고개·삼행시 등.', gear: '말과 재치뿐', slang: '“정답!”, “땡”, “한 고개 넘었다”', scene: '긴 밤길, 지친 일행이 끝말잇기로 졸음을 쫓으며 걷는다.' },
      { name: '가위바위보', alias: '잰켄·묵찌빠', era: '동아시아~세계', klass: '누구나, 신분 무관', rules: '주먹·보·가위를 동시에 내어 상성으로 승부를 가린다. 순서·내기·편 가르기의 만능 도구.', gear: '맨손', slang: '“안 내면 진 거”, “묵찌빠”, “비겼다”', scene: '계산대 앞, 두 친구가 “안 내면 진 거 가위바위보”로 밥값을 가린다.' },
      { name: '술래잡기·얼음땡', era: '세계 보편', klass: '아이들', rules: '술래가 뛰어 다른 사람을 친다. ‘얼음’을 외치면 멈춰 잡히지 않고, ‘땡’을 쳐 주면 풀린다.', gear: '없음(넓은 마당)', slang: '“얼음!”, “땡!”, “술래”', scene: '해질녘 놀이터, “얼음!” 외치고 동상처럼 굳은 아이의 다리가 후들거린다.' },
      { name: '주령(술자리 벌칙놀이)', alias: '酒令', era: '동아시아 연회', klass: '연회의 모든 손님', rules: '돌아가며 노래·시·손동작 따위를 시키고 틀린 사람이 벌주를 마신다. 흥을 돋우는 술자리 규칙.', gear: '술잔, 산가지·패', slang: '“벌주!”, “걸렸다”, “한 순배 돌자”', scene: '시끌벅적한 연회, 박자를 놓친 손님이 멋쩍게 잔을 들이켠다.' },
      { name: '쥐불놀이', alias: '논두렁 태우기', era: '한국 정월대보름', klass: '농촌 아이·청년', rules: '깡통에 불을 담아 빙빙 돌리거나 논두렁에 불을 놓아 해충을 없애고 풍년을 빈다. 마을끼리 불 세기를 겨루기도.', gear: '구멍 뚫은 깡통, 불씨·짚', slang: '“돌려라!”, “불 옮는다”, “망월이야”', scene: '대보름 밤, 빙빙 도는 불깡통이 어둠에 붉은 원을 그린다.' },
      { name: '제기·공기 내기', era: '한국 전통', klass: '아이들', rules: '제기차기·공기놀이 등으로 진 사람이 이긴 사람의 손목을 ‘딱밤’ 맞거나 심부름을 하는 소소한 내기.', gear: '제기·공깃돌', slang: '“딱밤”, “꿀밤”, “진 사람 심부름”', scene: '쉬는 시간, 진 아이가 이마를 내밀고 눈을 질끈 감는다.' },
    ],
  },
]

const LS = 'sry:tool:sports-games-ref:'
const ALL = '__all__'

interface Hit { cat: CatDef; item: Entry }
const flatAll = (): Hit[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))
const poolOf = (catKey: string): Hit[] =>
  catKey === ALL ? flatAll() : CATS.filter((c) => c.key === catKey).flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function SportsGamesRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.q 가 있으면 검색어 프리셋(연계로 열릴 때)
  const initialQuery = typeof payload?.q === 'string' ? (payload.q as string) : ''

  const [query, setQuery] = useState(initialQuery)
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
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<Hit | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 언마운트 정리용 타이머 추적
  const timers = useRef<number[]>([])
  const after = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timers.current = timers.current.filter((t) => t !== id)
      fn()
    }, ms)
    timers.current.push(id)
    return id
  }, [])
  useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = [] }, [])

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  const favKey = (catKey: string, name: string) => `${catKey}::${name}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = poolOf(cat)
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[favKey(c.key, item.name)])
    if (q) {
      base = base.filter(({ item }) =>
        [item.name, item.alias, item.era, item.klass, item.rules, item.gear, item.slang, item.scene]
          .filter(Boolean)
          .some((f) => (f as string).toLowerCase().includes(q)))
    }
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    const pool = poolOf(cat)
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
    setFavs((prev) => { const n = { ...prev }; if (n[k]) delete n[k]; else n[k] = true; return n })
  }
  const toggleOpen = (k: string) => setOpen((prev) => ({ ...prev, [k]: !prev[k] }))

  // 항목 → 일반 텍스트(복사·수집·스니펫 공용). 제어문자 없이 평범한 줄바꿈만.
  const plainText = (h: Hit) => {
    const it = h.item
    const lines: string[] = []
    lines.push(`${h.cat.icon} ${it.name}${it.alias ? ` (${it.alias})` : ''}`)
    if (it.era) lines.push(`시대·지역: ${it.era}`)
    if (it.klass) lines.push(`계층: ${it.klass}`)
    lines.push(`규칙: ${it.rules}`)
    if (it.gear) lines.push(`도구: ${it.gear}`)
    if (it.slang) lines.push(`은어: ${it.slang}`)
    if (it.scene) lines.push(`장면: ${it.scene}`)
    return lines.join('\n')
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      after(1500, () => setCopiedKey((c) => (c === id ? null : c)))
    }).catch(() => { /* graceful */ })
  }
  const flash = (msg: string) => { setToast(msg); after(2200, () => setToast((t) => (t === msg ? null : t))) }

  // ── 연계 동작 ──
  const stashIt = (h: Hit) => {
    if (!hasStash()) return
    addToStash({ kind: 'note', label: `${h.cat.icon} ${h.item.name} (${h.cat.label})`, text: plainText(h) })
    flash(`수집함에 ‘${h.item.name}’을(를) 담았습니다.`)
  }
  const projectIt = (h: Hit) => {
    if (!hasProjectBridge()) return
    const it = h.item
    const bodyHtml = [
      `<p><b>${escapeHtml(h.cat.icon + ' ' + it.name)}</b>${it.alias ? ` <i>${escapeHtml(it.alias)}</i>` : ''}</p>`,
      it.era ? `<p><b>시대·지역</b> ${escapeHtml(it.era)}</p>` : '',
      it.klass ? `<p><b>계층</b> ${escapeHtml(it.klass)}</p>` : '',
      `<p><b>규칙</b> ${escapeHtml(it.rules)}</p>`,
      it.gear ? `<p><b>도구</b> ${escapeHtml(it.gear)}</p>` : '',
      it.slang ? `<p><b>은어</b> ${escapeHtml(it.slang)}</p>` : '',
      it.scene ? `<p><b>장면</b> ${escapeHtml(it.scene)}</p>` : '',
    ].filter(Boolean).join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '놀이·스포츠·도박', title: `${it.name} (${h.cat.label})`, bodyHtml })
    if (id) flash(`프로젝트 자료 〈놀이·스포츠·도박〉에 ‘${it.name}’을(를) 추가했습니다.`)
  }
  const snippetIt = (h: Hit) => {
    addToLibrary('snippets', { text: plainText(h), source: '놀이·스포츠·도박 사전', tags: [h.cat.label] })
    flash(`스니펫으로 ‘${h.item.name}’을(를) 저장했습니다.`)
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const field = (label: string, value?: string, accent = false) => value ? (
    <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 5 }}>
      <b style={{ color: accent ? 'var(--accent)' : 'var(--muted)' }}>{label}</b> {value}
    </div>
  ) : null

  const renderHit = (h: Hit, keyPrefix: string, forceOpen = false) => {
    const fk = favKey(h.cat.key, h.item.name)
    const isFav = !!favs[fk]
    const oKey = keyPrefix + fk
    const isOpen = forceOpen || !!open[oKey]
    const copyId = keyPrefix + ':' + fk
    return (
      <div key={oKey} style={card}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          {!forceOpen && (
            <button className="minibtn" onClick={() => toggleOpen(oKey)} title={isOpen ? '접기' : '펼치기'} style={{ flexShrink: 0, padding: '2px 7px' }} aria-expanded={isOpen}>
              {isOpen ? '▾' : '▸'}
            </button>
          )}
          <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={h.cat.icon} /> {h.cat.label}</span>
          <span style={{ fontSize: 15, fontWeight: 700, cursor: forceOpen ? 'default' : 'pointer' }} onClick={() => !forceOpen && toggleOpen(oKey)}>{h.item.name}</span>
          {h.item.alias && <span style={{ fontSize: 11.5, color: 'var(--muted)', fontStyle: 'italic' }}>{h.item.alias}</span>}
          <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(h.cat.key, h.item.name)} style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
            {isFav ? '★' : '☆'}
          </button>
        </div>
        {isOpen && (
          <>
            {field('시대·지역', h.item.era)}
            {field('계층', h.item.klass)}
            {field('규칙', h.item.rules, true)}
            {field('도구', h.item.gear)}
            {field('은어', h.item.slang)}
            {h.item.scene && (
              <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 7, padding: '6px 9px', background: 'var(--paper)', borderRadius: 7, borderLeft: '2px solid var(--accent)', color: 'var(--text)' }}>
                <Emoji e="🎬" /> {h.item.scene}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <button className="minibtn" onClick={() => copy(plainText(h), copyId)}>
                {copiedKey === copyId ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
              </button>
              <button className="minibtn" onClick={() => stashIt(h)} disabled={!hasStash()} title={hasStash() ? '수집함에 담기' : '수집함이 연결되어 있지 않습니다'}><Emoji e="📎" /> 수집함</button>
              <button className="linkbtn" onClick={() => projectIt(h)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료에 자료 카드로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
              <button className="minibtn" onClick={() => snippetIt(h)} title="스니펫 라이브러리에 저장"><Emoji e="✂" /> 스니펫</button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={hint}>
        판·카드·골목놀이·들경기·구기·도박판·풍류까지 <b>{total}개</b> 항목. 시대·계층별 규칙·도구·은어·장면 소재를 모았습니다. 항목을 펼쳐 보고, 별로 모으고, 복사·수집·프로젝트·스니펫으로 활용하세요.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름·시대·계층·규칙·은어로 검색 (예: 투전, 중세, 귀족, 올인, 단오)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL)} aria-pressed={cat === ALL} style={{ borderColor: cat === ALL ? 'var(--accent)' : 'var(--border)', color: cat === ALL ? 'var(--text)' : 'var(--muted)' }}><Emoji e="🎲" /> 전체</button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on} style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={c.icon} /> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 뽑기</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav} style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 무작위 결과 */}
      {random && (
        <div style={{ position: 'relative' }}>
          <button className="minibtn" style={{ position: 'absolute', top: 6, right: 6, zIndex: 1, padding: '2px 7px' }} onClick={() => setRandom(null)} title="닫기">✕</button>
          {renderHit(random, 'rand:', true)}
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 항목이 없습니다. 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map((h) => renderHit(h, 'list:'))
        )}
      </div>

      <div style={hint}>고증은 출발점입니다. 시대·계층에 맞는 놀이·내기·은어를 골라 장면의 질감과 인물의 처지를 드러내 보세요.</div>
    </div>
  )
}
