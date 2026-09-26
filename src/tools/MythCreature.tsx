// 신화 속 생물 사전 — 9개 문화권 100종 이상의 신화 생물을 로컬 배열로 담아 무작위·검색으로 글감을 제공한다.
// 자급식: 외부 네트워크·라이브러리 없음. react 외 import 없음. Math.random + useState/useEffect/useRef만 사용.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'myth-creature', name: '신화 생물 사전', icon: '🐉', group: '영감·발상', intro: '세계 신화 생물 100종에서 한 종을 뽑아 변주해 등장시키세요', w: 460, h: 620 }

interface Creature { name: string; origin: string; trait: string; symbol: string }

// 기원(문화권) 라벨
const ORIGINS = ['그리스', '북유럽', '켈트', '슬라브', '한국', '일본', '중국', '메소포타미아', '이집트', '기타'] as const

// 로컬 데이터 100종+ : 이름 · 기원 · 특징 · 상징
const CREATURES: Creature[] = [
  // ── 그리스 ──
  { name: '케르베로스', origin: '그리스', trait: '머리 셋 달린 지옥문의 파수견. 죽은 자는 들이고 산 자는 막는다.', symbol: '경계·죽음의 문턱·충직한 감시' },
  { name: '메두사', origin: '그리스', trait: '머리카락이 뱀인 고르곤. 눈을 마주친 자를 돌로 만든다.', symbol: '시선의 저주·아름다움과 공포·억울한 변신' },
  { name: '미노타우로스', origin: '그리스', trait: '소의 머리에 사람 몸. 미궁 속에 갇혀 제물을 기다린다.', symbol: '갇힌 본성·미궁·짐승과 인간의 경계' },
  { name: '키마이라', origin: '그리스', trait: '사자·염소·뱀이 한 몸에 섞인 불을 뿜는 괴물.', symbol: '이질의 결합·혼돈·불가능한 존재' },
  { name: '스핑크스', origin: '그리스', trait: '여인의 얼굴에 사자 몸, 날개를 단 수수께끼의 수호자.', symbol: '수수께끼·시험·지혜의 관문' },
  { name: '히드라', origin: '그리스', trait: '하나를 베면 둘이 돋는 머리를 가진 늪의 독사.', symbol: '끝없는 재생·근절 불가능한 악·증식하는 문제' },
  { name: '페가수스', origin: '그리스', trait: '메두사의 피에서 태어난 날개 달린 백마.', symbol: '영감·자유로운 비상·시(詩)의 원천' },
  { name: '하르피이아', origin: '그리스', trait: '여인의 얼굴에 새의 몸을 한, 음식을 채가는 폭풍의 정령.', symbol: '약탈·휘몰아치는 굶주림·천벌' },
  { name: '세이렌', origin: '그리스', trait: '노래로 뱃사람을 홀려 난파시키는 반인반조.', symbol: '치명적 유혹·노래의 마력·파멸의 부름' },
  { name: '케이론', origin: '그리스', trait: '의술과 지혜를 가르친 현명한 켄타우로스.', symbol: '스승·치유·고귀한 야성' },
  { name: '키클롭스', origin: '그리스', trait: '이마에 외눈 하나를 가진 거인 대장장이.', symbol: '단순한 폭력·외눈의 시야·원초적 힘' },
  { name: '에키드나', origin: '그리스', trait: '상반신은 미녀, 하반신은 뱀인 모든 괴물의 어머니.', symbol: '괴물의 근원·매혹과 독·태초의 어머니' },
  { name: '그리폰', origin: '그리스', trait: '독수리 머리·날개에 사자 몸을 한 황금의 수호자.', symbol: '보물 수호·하늘과 땅의 왕·고귀한 경계' },
  { name: '라돈', origin: '그리스', trait: '황금사과 정원을 지키는 잠들지 않는 백두룡.', symbol: '불침번·금단의 열매·영원한 경계' },
  { name: '카론', origin: '그리스', trait: '망자를 스틱스 강 건너로 실어 나르는 뱃사공.', symbol: '죽음의 도하·대가·돌아올 수 없는 강' },
  { name: '엠푸사', origin: '그리스', trait: '청동 다리와 불타는 머리칼로 나그네를 홀려 잡아먹는다.', symbol: '밤길의 위협·변신하는 유혹·헤카테의 종' },
  { name: '라미아', origin: '그리스', trait: '아이를 잡아먹는, 한때 여왕이었던 저주받은 괴물.', symbol: '잃은 모성의 광기·밤의 공포·복수' },
  { name: '탈로스', origin: '그리스', trait: '크레타 섬을 도는 청동 거인 자동인형.', symbol: '인공 생명·무한한 경비·단 하나의 약점' },

  // ── 북유럽 ──
  { name: '펜리르', origin: '북유럽', trait: '신들도 두려워한, 라그나로크에 오딘을 삼킬 거대한 늑대.', symbol: '풀려난 파멸·구속할 수 없는 분노·운명의 종말' },
  { name: '요르문간드', origin: '북유럽', trait: '세계를 휘감을 만큼 거대한 바다뱀, 미드가르드의 큰 뱀.', symbol: '세계의 둘레·자기 꼬리를 문 순환·종말의 적' },
  { name: '슬레이프니르', origin: '북유럽', trait: '오딘이 타는 다리가 여덟인 가장 빠른 말.', symbol: '경계를 넘는 질주·저승길·초월적 이동' },
  { name: '발키리', origin: '북유럽', trait: '전장에서 용맹한 전사자를 골라 발할라로 데려가는 처녀 전사.', symbol: '죽음의 선택·명예로운 전사(戰死)·운명의 손' },
  { name: '드라우그', origin: '북유럽', trait: '무덤에서 일어나 보물을 지키는 부풀어 오른 시체.', symbol: '무덤의 탐욕·되돌아온 죽음·집착하는 망령' },
  { name: '니드호그', origin: '북유럽', trait: '세계수 위그드라실의 뿌리를 갉아먹는 용.', symbol: '근본을 좀먹는 악·끝없는 부패·세계의 균열' },
  { name: '후긴과 무닌', origin: '북유럽', trait: '오딘의 두 까마귀, 생각과 기억으로 세상을 정찰한다.', symbol: '편재하는 앎·생각과 기억·신의 눈과 귀' },
  { name: '요툰', origin: '북유럽', trait: '신들과 맞서는 서리와 바위의 거인족.', symbol: '원초적 자연·혼돈의 세력·신에 맞선 힘' },
  { name: '라타토스크', origin: '북유럽', trait: '세계수를 오르내리며 독사와 독수리 사이에 험담을 나르는 다람쥐.', symbol: '소문의 전령·이간질·끊임없는 분란' },
  { name: '흐레스벨그', origin: '북유럽', trait: '날갯짓으로 바람을 일으키는, 세상 끝에 앉은 거대한 독수리.', symbol: '바람의 근원·하늘의 끝·태초의 폭풍' },
  { name: '아우둠라', origin: '북유럽', trait: '태초의 얼음을 핥아 최초의 신을 빚어낸 원시의 암소.', symbol: '창조의 젖줄·태초의 양육·생명의 시작' },
  { name: '니드호그의 흑룡', origin: '북유럽', trait: '시체의 해안에서 망자의 살을 뜯는 검은 용.', symbol: '죄의 응보·죽음 이후의 형벌·암흑' },

  // ── 켈트 ──
  { name: '밴시', origin: '켈트', trait: '누군가의 죽음이 임박하면 통곡으로 알리는 여인의 정령.', symbol: '죽음의 예고·통곡·가문의 운명' },
  { name: '셀키', origin: '켈트', trait: '물범 가죽을 벗으면 인간이 되는 바다의 변신족.', symbol: '두 세계 사이·잃은 본래의 가죽·돌아갈 바다' },
  { name: '푸카', origin: '켈트', trait: '말·염소·토끼로 변하며 행운과 불운을 함께 부르는 장난꾼.', symbol: '변덕·예측 불가·길흉의 양면' },
  { name: '레프러콘', origin: '켈트', trait: '무지개 끝에 황금 단지를 숨긴 구두장이 요정.', symbol: '숨긴 보물·교활한 약속·붙잡으면 풀려나는 행운' },
  { name: '쿠 시', origin: '켈트', trait: '안개 속을 소리 없이 도는 초록빛 거대한 요정 사냥개.', symbol: '죽음의 사자·고요한 추격·세 번의 울음' },
  { name: '도브허초', origin: '켈트', trait: '물속에 숨어 사람을 끌어들이는 물개와 개를 닮은 괴수.', symbol: '물의 함정·잠복한 위험·복수하는 짝' },
  { name: '쾰페이', origin: '켈트', trait: '아름다운 말로 둔갑해 물가에 사람을 태우고 호수로 사라지는 물귀신.', symbol: '치명적 매혹·물의 죽음·달콤한 함정' },
  { name: '레드 캡', origin: '켈트', trait: '희생자의 피로 모자를 물들이는 폐성의 늙은 악령.', symbol: '피의 갱신·잔혹한 텃세·폐허의 주인' },
  { name: '카하 바르', origin: '켈트', trait: '죽음을 부르는, 불꽃 같은 눈을 가진 거대한 검은 고양이 왕.', symbol: '영혼의 도둑·왕좌의 짐승·밤의 군주' },
  { name: '도라하르', origin: '켈트', trait: '머리 없이 검은 말을 몰며 이름을 부르면 그를 데려가는 사신.', symbol: '거역할 수 없는 호명·머리 없는 죽음·운명의 채찍' },

  // ── 슬라브 ──
  { name: '바바 야가', origin: '슬라브', trait: '닭다리로 걷는 오두막에 사는, 절구를 타고 나는 마녀.', symbol: '양가적 시험자·숲의 지혜·삼키거나 돕는 노파' },
  { name: '루살카', origin: '슬라브', trait: '물에 빠져 죽은 처녀가 된, 사람을 물로 끌어들이는 물의 정령.', symbol: '원혼·물의 유혹·못다 한 사랑' },
  { name: '도모보이', origin: '슬라브', trait: '집을 지키며 잘 대접하면 복을, 화나면 화를 부르는 집의 정령.', symbol: '가정의 수호·예우의 대가·보이지 않는 식구' },
  { name: '레시', origin: '슬라브', trait: '키를 자유로이 바꾸며 길 잃은 자를 홀리는 숲의 주인.', symbol: '숲의 미혹·자연의 변덕·경계 너머' },
  { name: '졸로토이', origin: '슬라브', trait: '불새, 빛나는 깃털 하나가 방 전체를 밝히는 황금 새.', symbol: '닿을 수 없는 보물·갈망·찬란한 시련' },
  { name: '키키모라', origin: '슬라브', trait: '밤마다 실을 잣거나 어지럽히는 집안의 작은 여귀.', symbol: '불면의 소란·살림의 불길함·숨은 불화' },
  { name: '즈메이', origin: '슬라브', trait: '여러 개의 머리에서 불을 뿜는 슬라브의 용.', symbol: '다중의 위협·납치된 공주·정복해야 할 악' },
  { name: '비이', origin: '슬라브', trait: '땅에 닿는 눈꺼풀을 들어 올리면 그 시선이 죽음을 부르는 지하의 왕.', symbol: '치명적 응시·가려진 죽음·들춰선 안 될 것' },
  { name: '폴레비크', origin: '슬라브', trait: '정오의 들판에서 게으른 농부를 벌하는 밭의 정령.', symbol: '노동의 감시·정오의 위협·수확의 법칙' },
  { name: '알코노스트', origin: '슬라브', trait: '들으면 모든 것을 잊게 하는 천상의 노래를 부르는 여인새.', symbol: '망각의 노래·천상의 기쁨·황홀한 상실' },

  // ── 한국 ──
  { name: '구미호', origin: '한국', trait: '천 년을 산 아홉 꼬리 여우, 사람이 되기를 갈망한다.', symbol: '인간이 되려는 갈망·매혹과 위험·오랜 인내' },
  { name: '도깨비', origin: '한국', trait: '방망이로 재물과 장난을 부리는, 정 많고 변덕스러운 귀물.', symbol: '횡재와 골탕·해학·인간과 어울리는 신령' },
  { name: '이무기', origin: '한국', trait: '여의주를 얻어 용이 되기를 천 년 기다리는 큰 뱀.', symbol: '승천의 갈망·미완의 존재·기다림 끝의 변신' },
  { name: '해태', origin: '한국', trait: '시비와 선악을 가려 불의를 들이받는 사자 닮은 신수.', symbol: '정의·화재를 막는 수호·옳고 그름의 심판' },
  { name: '삼족오', origin: '한국', trait: '태양 속에 사는 다리 셋 달린 검은 까마귀.', symbol: '태양의 정수·천상의 전령·하늘의 권위' },
  { name: '불가사리', origin: '한국', trait: '쇠를 먹으며 끝없이 자라 멈출 수 없게 된 괴수.', symbol: '통제 불능의 성장·삼키는 탐욕·역병 같은 번성' },
  { name: '저승사자', origin: '한국', trait: '검은 갓과 도포를 두르고 망자의 이름을 부르러 오는 사자.', symbol: '죽음의 명부·거역 못 할 호명·저승길의 안내' },
  { name: '두억시니', origin: '한국', trait: '머리가 짓이겨진 채 사람을 해치는 사납고 흉악한 잡귀.', symbol: '맹목적 폭력·원혼·이성 잃은 악' },
  { name: '강철이', origin: '한국', trait: '지나간 자리는 모두 말라 죽는, 가뭄을 부르는 독룡.', symbol: '재앙·메마름·존재만으로 닥치는 불행' },
  { name: '봉황', origin: '한국', trait: '오색 깃털로 태평성대에만 나타나는 상서로운 신조.', symbol: '태평성대·고귀함·성군의 출현' },
  { name: '백호', origin: '한국', trait: '서쪽을 지키는 흰 호랑이, 사방신의 하나.', symbol: '서방의 수호·가을과 금(金)·용맹한 위엄' },
  { name: '청룡', origin: '한국', trait: '동쪽을 다스리는 푸른 용, 봄과 생명을 부른다.', symbol: '동방의 수호·봄과 생장·왕의 기상' },
  { name: '그슨대', origin: '한국', trait: '바라보면 점점 커지며 사람을 압도하는 어둠의 형상.', symbol: '커지는 공포·맞설수록 자라는 두려움·밤의 압박' },

  // ── 일본 ──
  { name: '갓파', origin: '일본', trait: '정수리에 물을 담은 접시를 인, 강에 사는 장난꾸러기 요괴.', symbol: '물의 위험·예의의 시험·물이 마르면 무력해짐' },
  { name: '텐구', origin: '일본', trait: '붉은 얼굴에 긴 코, 산에 사는 오만한 무예의 정령.', symbol: '오만의 경계·산의 수호·무도의 스승' },
  { name: '오니', origin: '일본', trait: '뿔과 쇠몽둥이를 든, 인간을 벌하는 도깨비 같은 귀신.', symbol: '징벌·원초적 분노·억눌린 죄' },
  { name: '갓샤도쿠로', origin: '일본', trait: '굶어 죽은 원혼들이 뭉쳐 만들어진 거대한 해골.', symbol: '쌓인 원한·집단의 죽음·거대한 복수' },
  { name: '구미호(쿠다기츠네)', origin: '일본', trait: '사람을 홀리고 둔갑하는 영험한 여우 요괴.', symbol: '둔갑·홀림·신성과 요사의 양면' },
  { name: '롯쿠로쿠비', origin: '일본', trait: '밤이면 목이 한없이 늘어나는 여인 요괴.', symbol: '숨긴 본성·밤의 변신·들킬까 두려운 비밀' },
  { name: '유키온나', origin: '일본', trait: '눈보라 속에 나타나 나그네의 숨결을 얼리는 설녀.', symbol: '치명적 아름다움·겨울의 죽음·차가운 자비' },
  { name: '누에', origin: '일본', trait: '원숭이 얼굴·너구리 몸·뱀 꼬리를 한 불길한 밤의 괴물.', symbol: '불길한 징조·정체불명·뒤섞인 공포' },
  { name: '바케네코', origin: '일본', trait: '늙으면 둔갑하고 죽은 자를 조종하는 고양이 요괴.', symbol: '오래 산 것의 변이·은밀한 복수·길들지 않는 본성' },
  { name: '가시샤', origin: '일본', trait: '장례 행렬에서 시체를 채가는 불타는 요괴 고양이.', symbol: '죄인의 응보·시신의 약탈·불의 형벌' },
  { name: '쓰치구모', origin: '일본', trait: '사람을 거미줄로 옭아매는 거대한 흙거미 요괴.', symbol: '함정·옭아맴·은둔한 위협' },
  { name: '카라카사', origin: '일본', trait: '백 년 묵은 우산이 외눈에 외다리로 깡충거리는 도구 요괴.', symbol: '버려진 물건의 한·사물의 생명·세월의 변이' },
  { name: '아마노자쿠', origin: '일본', trait: '사람의 마음을 거꾸로 읽어 청개구리처럼 어기는 작은 귀신.', symbol: '청개구리 심보·반항·뒤틀린 욕망' },

  // ── 중국 ──
  { name: '용(룽)', origin: '중국', trait: '비와 강을 다스리는, 황제의 상징인 신성한 동방의 용.', symbol: '제왕의 권위·물과 비·하늘의 뜻' },
  { name: '기린', origin: '중국', trait: '성인이 날 때만 나타나는, 풀 한 포기 밟지 않는 어진 신수.', symbol: '인(仁)·태평의 징조·고결한 출현' },
  { name: '도철', origin: '중국', trait: '몸 없이 머리만 있어 끝없이 먹어치우는 탐욕의 괴수.', symbol: '한없는 탐욕·먹어도 채워지지 않음·과욕의 경계' },
  { name: '비휴', origin: '중국', trait: '먹기만 하고 배설하지 못해 재물을 모으는 날개 달린 짐승.', symbol: '축재·들어오기만 하는 부·재물의 수호' },
  { name: '구미호(후리징)', origin: '중국', trait: '미인으로 둔갑해 정기를 빼앗는 천 년 묵은 여우.', symbol: '경국지색·정기의 약탈·요사한 매혹' },
  { name: '백택', origin: '중국', trait: '천하 만물의 요괴를 모두 아는, 말하는 신령한 짐승.', symbol: '만물의 지식·예지·재앙을 막는 앎' },
  { name: '궁기', origin: '중국', trait: '날개 달린 호랑이로, 정직한 자를 잡아먹고 악인을 돕는 흉수.', symbol: '뒤집힌 정의·악의 편애·전도된 도덕' },
  { name: '혼돈', origin: '중국', trait: '눈·코·입이 없이 노래하고 춤추는, 덕을 어지럽히는 짐승.', symbol: '원초의 카오스·분별없음·미분화의 상태' },
  { name: '주작', origin: '중국', trait: '남쪽을 다스리는 붉은 불의 새, 사방신의 하나.', symbol: '남방의 수호·여름과 불·재생' },
  { name: '현무', origin: '중국', trait: '거북과 뱀이 한 몸이 된, 북쪽을 지키는 신수.', symbol: '북방의 수호·장수·음양의 결합' },
  { name: '구미수', origin: '중국', trait: '아홉 머리를 가진, 산해경에 나오는 사람 잡아먹는 새.', symbol: '다중의 탐식·불길·근절 못 할 위협' },
  { name: '바(旱魃)', origin: '중국', trait: '나타나는 곳마다 비를 멎게 해 가뭄을 부르는 여귀.', symbol: '가뭄·메마름·재앙을 부르는 존재' },

  // ── 메소포타미아 ──
  { name: '티아마트', origin: '메소포타미아', trait: '소금 바다이자 모든 괴물을 낳은 태초의 용 여신.', symbol: '태초의 혼돈·창조와 파괴·바다의 어머니' },
  { name: '훔바바', origin: '메소포타미아', trait: '신들의 삼나무 숲을 지키는, 얼굴이 창자처럼 얽힌 거인.', symbol: '신성한 경계·금단의 침범·자연의 파수꾼' },
  { name: '안주', origin: '메소포타미아', trait: '사자 머리에 독수리 몸으로 폭풍을 부르는 거대한 새.', symbol: '운명판의 약탈·폭풍·하늘의 위협' },
  { name: '라마수', origin: '메소포타미아', trait: '사람 머리·황소 몸·독수리 날개의 궁전 수호 신수.', symbol: '문지방의 수호·왕권의 보호·복합적 위엄' },
  { name: '파주주', origin: '메소포타미아', trait: '서풍과 역병을 몰고 오지만 악령을 쫓기도 하는 바람의 마왕.', symbol: '독으로 독을 막음·역병의 바람·양날의 부적' },
  { name: '라마슈투', origin: '메소포타미아', trait: '산모와 갓난아기를 노리는 사자 머리의 여악마.', symbol: '출산의 공포·아이를 노리는 악·파주주로 막는 위협' },
  { name: '우갈루', origin: '메소포타미아', trait: '사자 머리에 사람의 몸을 한, 문을 지키는 폭풍 사자.', symbol: '문의 수호·악을 쫓는 사나움·폭풍의 종' },
  { name: '무슈후슈', origin: '메소포타미아', trait: '뱀·사자·독수리가 섞인, 마르두크 신을 따르는 용.', symbol: '신의 종복·이슈타르 문의 상징·복합의 권위' },
  { name: '길타블룰루', origin: '메소포타미아', trait: '상반신은 사람, 하반신은 전갈인 태양문의 수문장.', symbol: '해 뜨는 문의 수호·경계의 시험·치명적 꼬리' },

  // ── 이집트 ──
  { name: '암무트', origin: '이집트', trait: '악어·사자·하마가 섞인, 죄 무거운 자의 심장을 삼키는 괴수.', symbol: '심판·영혼의 소멸·저울 너머의 형벌' },
  { name: '아펩', origin: '이집트', trait: '매일 밤 태양신의 배를 삼키려는 어둠과 혼돈의 대뱀.', symbol: '영원한 적·혼돈·밤마다 되풀이되는 싸움' },
  { name: '스핑크스(이집트)', origin: '이집트', trait: '왕의 얼굴에 사자 몸을 한 채 사막의 무덤을 지키는 수호상.', symbol: '왕권의 수호·침묵의 감시·영원한 파수' },
  { name: '바스테트', origin: '이집트', trait: '집과 아이를 지키는 고양이 머리의 여신.', symbol: '가정의 보호·기쁨·온화함과 사나움의 양면' },
  { name: '아누비스', origin: '이집트', trait: '자칼 머리를 한, 망자를 인도하고 심장을 다는 죽음의 신.', symbol: '장례·영혼의 무게·저승의 안내자' },
  { name: '벤누', origin: '이집트', trait: '스스로 타올라 재에서 되살아나는 태양의 왜가리 신조.', symbol: '재생·태양의 순환·죽음을 넘는 부활' },
  { name: '세르케트의 전갈', origin: '이집트', trait: '독을 다스리며 망자를 지키는 전갈의 여신.', symbol: '독과 치유·보호·치명적 수호' },
  { name: '타와레트', origin: '이집트', trait: '하마 몸에 사자 다리를 한, 산모를 지키는 여신.', symbol: '출산의 수호·모성·사나운 보호' },
  { name: '세트의 짐승', origin: '이집트', trait: '정체불명의 머리를 한, 혼돈과 사막의 신 세트의 화신.', symbol: '무질서·사막의 폭풍·길들지 않는 힘' },

  // ── 기타(범문화) ──
  { name: '피닉스', origin: '기타', trait: '500년마다 제 둥지에서 불타 재에서 다시 태어나는 불사조.', symbol: '불멸·재생·끝에서 시작되는 생' },
  { name: '드래곤', origin: '기타', trait: '보물을 쌓아 두고 불을 뿜는, 서구 전설의 거대한 용.', symbol: '탐욕·정복해야 할 시련·권능과 파괴' },
  { name: '유니콘', origin: '기타', trait: '이마에 외뿔을 단, 순결한 자에게만 다가오는 흰 말.', symbol: '순결·치유·붙잡을 수 없는 순수' },
  { name: '바실리스크', origin: '기타', trait: '눈빛과 숨결만으로 모든 생명을 죽이는 뱀들의 왕.', symbol: '치명적 시선·독·범접 못 할 죽음' },
  { name: '뱀파이어', origin: '기타', trait: '밤에 깨어나 산 자의 피로 영생하는 불사의 망령.', symbol: '영생의 대가·금단의 갈증·매혹과 저주' },
  { name: '늑대인간', origin: '기타', trait: '보름달이 뜨면 짐승으로 변하는, 두 본성에 찢긴 인간.', symbol: '억눌린 야성·이중성·통제 못 할 변신' },
  { name: '골렘', origin: '기타', trait: '진흙을 빚고 주문을 새겨 움직이는, 명령에 충실한 인형.', symbol: '맹목적 복종·창조의 책임·통제를 벗어난 피조물' },
  { name: '크라켄', origin: '기타', trait: '배를 통째로 끌어내리는, 바다 밑의 거대한 문어 괴물.', symbol: '심해의 공포·미지의 깊이·삼키는 바다' },
  { name: '진(지니)', origin: '기타', trait: '연기로 빚어진, 소원과 함정을 동시에 거는 영적 존재.', symbol: '뒤틀린 소원·자유와 속박·말의 함정' },
  { name: '만티코어', origin: '기타', trait: '사람 얼굴·사자 몸·전갈 꼬리로 사람을 통째 삼키는 괴수.', symbol: '잔혹한 포식·흔적 없는 죽음·복합의 위협' },
  { name: '웬디고', origin: '기타', trait: '굶주림과 추위가 인간을 변모시킨, 끝없이 먹는 식인 정령.', symbol: '채울 수 없는 탐욕·고립의 광기·인간성의 상실' },
  { name: '셀레스티얼 사슴', origin: '기타', trait: '발길 닿는 곳마다 꽃이 피는, 숲의 평화를 부르는 신성한 사슴.', symbol: '생명·평온·자연과의 조화' },
]

// 변주 질문 풀: 무작위로 하나를 곁들여 "이 생물을 비틀어 등장시키기" 유도
const TWISTS = [
  '이 생물이 신화 속 모습과 정반대의 성격을 가졌다면, 어떤 사연이 숨어 있을까?',
  '이 생물이 인간 사회에 섞여 평범한 직업을 갖고 산다면 무엇을 할까?',
  '이 생물의 상징을 인물 한 명의 내면으로 옮긴다면 어떤 캐릭터가 될까?',
  '이 생물이 멸종 직전의 마지막 한 마리라면, 그를 둘러싼 이야기는?',
  '이 생물의 약점이나 금기를 깨뜨리는 순간을 장면의 절정으로 삼는다면?',
  '이 생물을 적이 아니라 주인공의 조력자로 등장시킨다면 무엇이 달라질까?',
  '현대 도시의 한복판에 이 생물이 나타난다면 첫 목격담은 어떻게 퍼질까?',
  '이 생물이 누군가와 맺은 오래된 계약이 있다면, 그 대가는 무엇일까?',
  '이 생물의 기원담을 완전히 새로 쓴다면, 어떤 비극에서 시작될까?',
  '이 생물이 두려워하는 단 하나가 있다면, 그것은 무엇이고 왜일까?',
]

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

export default function MythCreature() {
  const [current, setCurrent] = useState<Creature | null>(null)
  const [twist, setTwist] = useState('')
  const [query, setQuery] = useState('')
  const [originFilter, setOriginFilter] = useState<string>('전체')
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')
  const mounted = useRef(true)
  const copyTimer = useRef<number | null>(null)
  const toastTimer = useRef<number | null>(null)

  // 무작위 한 종 + 변주 질문 뽑기(검색/필터 결과 범위 안에서)
  const roll = (pool?: Creature[]) => {
    const base = pool && pool.length ? pool : CREATURES
    let next = pick(base)
    // 같은 생물 연속 방지(풀이 2개 이상일 때)
    if (base.length > 1 && current && next.name === current.name) next = pick(base)
    setCurrent(next)
    setTwist(pick(TWISTS))
    setCopied(false)
  }

  // 첫 진입 시 무작위 1종
  useEffect(() => {
    roll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 언마운트 정리(복사 타이머)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    }
  }, [])

  // 검색/필터 적용된 목록
  const q = query.trim().toLowerCase()
  const filtered = CREATURES.filter((c) => {
    if (originFilter !== '전체' && c.origin !== originFilter) return false
    if (!q) return true
    return (
      c.name.toLowerCase().includes(q) ||
      c.origin.toLowerCase().includes(q) ||
      c.trait.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q)
    )
  })

  const copy = () => {
    if (!current) return
    const text =
      `${current.name} (${current.origin} 신화)\n` +
      `특징: ${current.trait}\n` +
      `상징: ${current.symbol}\n\n` +
      `✍️ 변주: ${twist}`
    navigator.clipboard?.writeText(text).then(() => {
      if (!mounted.current) return
      setCopied(true)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
    }).catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }

  // HTML 특수문자 escape(&,<,> 필수) — 본문 HTML 안전 처리
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // 현재 신화 생물(이름/기원/특징/상징)을 프로젝트 자료(소재 폴더)에 메모로 추가
  const toProject = () => {
    if (!current) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않아 추가할 수 없어요.'); return }
    const c = current
    const bodyHtml =
      `<p><b>${esc(c.name)}</b> <i>(${esc(c.origin)} 신화)</i></p>` +
      `<p><b>특징</b> · ${esc(c.trait)}</p>` +
      `<p><b>상징</b> · ${esc(c.symbol)}</p>` +
      (twist ? `<p><b>✍️ 변주</b> · ${esc(twist)}</p>` : '')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '소재',
      title: `${c.name} (${c.origin} 신화)`,
      bodyHtml,
      meta: { 기원: c.origin, 상징: c.symbol },
    })
    if (!mounted.current) return
    setToast(id ? `‘${c.name}’을(를) 프로젝트 ‘자료 › 소재’에 추가했어요.` : '프로젝트에 추가하지 못했어요.')
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => { if (mounted.current) setToast('') }, 4000)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const inputStyle: React.CSSProperties = { flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }

  return (
    <div style={wrap}>
      <div style={hint}>
        세계 9개 문화권 <b>{CREATURES.length}종</b>의 신화 생물 사전입니다. 무작위로 한 종을 뽑아 <b>변주해 등장시킬 질문</b>과 함께 보여줍니다.
      </div>

      {/* 검색 + 기원 필터 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름·기원·특징·상징 검색…"
          style={inputStyle}
          aria-label="신화 생물 검색"
        />
        {query && (
          <button className="minibtn" onClick={() => setQuery('')} title="검색어 지우기">✕</button>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {(['전체', ...ORIGINS] as string[]).map((o) => {
          const on = originFilter === o
          return (
            <button
              key={o}
              className="minibtn"
              onClick={() => setOriginFilter(o)}
              aria-pressed={on}
              style={{
                fontSize: 11, padding: '3px 8px',
                opacity: on ? 1 : 0.55,
                borderColor: on ? 'var(--accent)' : 'var(--border)',
                color: on ? 'var(--text)' : 'var(--muted)',
              }}
            >
              {o}
            </button>
          )
        })}
      </div>

      {/* 본문: 검색어/필터 없으면 무작위 카드, 있으면 검색 결과 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
        {(!q && originFilter === '전체') ? (
          // ── 무작위 한 종 카드 ──
          current ? (
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{current.name}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 999, padding: '1px 9px' }}>{current.origin} 신화</span>
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.6, marginTop: 10 }}>{current.trait}</div>
              <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 8, color: 'var(--muted)' }}>
                <span style={{ color: 'var(--ok)', fontWeight: 600 }}>상징</span> · {current.symbol}
              </div>
              <div style={{ marginTop: 12, padding: 12, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <div style={{ fontWeight: 600, color: 'var(--accent)', fontSize: 13, marginBottom: 4 }}><Emoji e="✍️"/> 이 생물을 변주해 등장시키기</div>
                <div style={{ fontSize: 13, lineHeight: 1.55 }}>{twist}</div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>아래 버튼으로 한 종을 뽑아보세요.</div>
          )
        ) : (
          // ── 검색/필터 결과 목록 ──
          filtered.length ? (
            <>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{filtered.length}종 검색됨 — 항목을 누르면 변주 질문과 함께 펼칩니다.</div>
              {filtered.map((c) => (
                <button
                  key={c.name}
                  onClick={() => { setOriginFilter('전체'); setQuery(''); roll([c]) }}
                  style={{
                    textAlign: 'left', background: 'var(--panel)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '10px 12px', color: 'var(--text)', cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{c.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{c.origin}</span>
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 3, color: 'var(--muted)' }}>{c.trait}</div>
                  <div style={{ fontSize: 11.5, lineHeight: 1.45, marginTop: 3, color: 'var(--muted)' }}>상징 · {c.symbol}</div>
                </button>
              ))}
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>검색 결과가 없습니다. 다른 키워드를 시도해 보세요.</div>
          )
        )}
      </div>

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={() => roll(q || originFilter !== '전체' ? filtered : undefined)}><Emoji e="🎲"/> 다시 (무작위 한 종)</button>
        <button className="minibtn" onClick={copy} disabled={!current}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 글쓰기에 활용</>}</button>
      </div>

      {/* [프로젝트 연동] 현재 신화 생물을 자료(소재)에 메모로 추가 — 결과 없거나 미연결 시 비활성 */}
      <div className="linkbar">
        <span className="linkbar-label">연계</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!current || !hasProjectBridge()}
          title={hasProjectBridge() ? '현재 신화 생물을 프로젝트 자료(소재)에 메모로 추가' : '프로젝트에 연결되어 있지 않아요'}
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
      </div>
      {toast && (
        <div style={{ fontSize: 12, color: 'var(--ok)', textAlign: 'center', lineHeight: 1.5 }}>{toast}</div>
      )}

      <div style={hint}>신화의 설정은 출발점일 뿐입니다. 상징을 비틀고 변주 질문을 따라 당신만의 생물로 만들어 보세요.</div>
    </div>
  )
}
