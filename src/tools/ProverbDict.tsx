// 속담·사자성어 사전 — 한국 속담과 사자성어 200+를 뜻과 함께 카테고리로 모은 로컬 대량 사전.
// 자급식: 외부 네트워크·라이브러리 없음(전통 속담·사자성어는 공유 문화유산/PD). react + './linkbus' 만 사용.
// Math.random + localStorage(즐겨찾기·마지막 카테고리·종류 필터)만 사용. 클릭 복사·무작위·펼침 탐색·검색.
import { useState, useEffect, useMemo, useCallback } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'proverb-dict', name: '속담·사자성어 사전', icon: '📜', group: '언어·어휘', intro: '한국 속담과 사자성어 200+를 뜻·카테고리로 찾아 인용·대사·제사에 양념으로 쓰세요', w: 620, h: 620 }

type Kind = 'proverb' | 'idiom'
interface Saying { text: string; meaning: string; hanja?: string }
interface CatDef { key: string; label: string; icon: string; proverbs: Saying[]; idioms: Saying[] }

// 로컬 사전 — 6개 카테고리(인생/노력/관계/경계/지혜/운명), 속담+사자성어 합계 200+.
const CATS: CatDef[] = [
  {
    key: 'life', label: '인생', icon: '🌱',
    proverbs: [
      { text: '인생은 짧고 예술은 길다', meaning: '사람의 한평생은 덧없으나 그가 남긴 일과 예술은 오래 남는다.' },
      { text: '개똥밭에 굴러도 이승이 좋다', meaning: '아무리 고생스러워도 죽는 것보다는 살아 있는 편이 낫다.' },
      { text: '산 입에 거미줄 치랴', meaning: '아무리 어려워도 사람은 그럭저럭 먹고살게 마련이다.' },
      { text: '쥐구멍에도 볕 들 날 있다', meaning: '몹시 고생하는 삶에도 좋은 때가 한 번은 온다.' },
      { text: '고생 끝에 낙이 온다', meaning: '어려운 일을 견뎌 내면 좋은 날이 온다.' },
      { text: '달도 차면 기운다', meaning: '한창 흥성하던 것도 시간이 지나면 쇠하게 마련이다.' },
      { text: '화무십일홍', meaning: '한 번 성한 것이 얼마 못 가 쇠한다는 뜻으로, 권세나 영화의 덧없음.' },
      { text: '세월이 약이다', meaning: '아무리 큰 슬픔도 시간이 지나면 차차 잊히고 가라앉는다.' },
      { text: '한 치 앞을 모르는 게 사람 일이다', meaning: '사람의 앞일은 한 순간도 미리 알 수 없다.' },
      { text: '사람 팔자 시간문제다', meaning: '사람의 운명은 짧은 시간에도 크게 뒤바뀔 수 있다.' },
      { text: '늙으면 아이 된다', meaning: '나이가 많이 들면 하는 짓이 어린아이처럼 된다.' },
      { text: '죽으면 썩어질 몸', meaning: '어차피 한 번 죽을 몸이니 너무 아끼지 말고 살라는 뜻.' },
      { text: '인생은 일장춘몽이라', meaning: '사람의 한평생이 한바탕 봄꿈처럼 덧없음.' },
      { text: '죽을 때가 되면 거짓말도 참말 된다', meaning: '죽음을 앞두면 사람의 마음이 진실해진다.' },
      { text: '나그네 길에서 만난 사람', meaning: '인생에서 스치듯 만났다 헤어지는 인연.' },
      { text: '백 년을 살아도 잠든 날 빼면 절반', meaning: '아무리 오래 살아도 온전히 누리는 시간은 짧다.' },
    ],
    idioms: [
      { text: '새옹지마', hanja: '塞翁之馬', meaning: '인생의 화와 복은 변화가 많아 예측하기 어렵다.' },
      { text: '전화위복', hanja: '轉禍爲福', meaning: '재앙이 도리어 복이 됨.' },
      { text: '고진감래', hanja: '苦盡甘來', meaning: '쓴 것이 다하면 단 것이 온다, 고생 끝에 즐거움이 옴.' },
      { text: '흥진비래', hanja: '興盡悲來', meaning: '즐거운 일이 다하면 슬픈 일이 옴, 세상일은 돌고 돈다.' },
      { text: '권불십년', hanja: '權不十年', meaning: '아무리 높은 권세도 십 년을 가지 못함.' },
      { text: '인생무상', hanja: '人生無常', meaning: '인생이 덧없고 한결같지 아니함.' },
      { text: '일장춘몽', hanja: '一場春夢', meaning: '한바탕의 봄꿈처럼 헛된 영화나 덧없는 일.' },
      { text: '회자정리', hanja: '會者定離', meaning: '만난 자는 반드시 헤어지게 됨, 만남과 이별의 무상함.' },
      { text: '생자필멸', hanja: '生者必滅', meaning: '생명이 있는 것은 반드시 죽음, 삶의 덧없음.' },
      { text: '한단지몽', hanja: '邯鄲之夢', meaning: '인생과 부귀영화의 덧없음을 이르는 말.' },
      { text: '남가일몽', hanja: '南柯一夢', meaning: '꿈처럼 헛된 한때의 부귀나 영화.' },
      { text: '백년하청', hanja: '百年河淸', meaning: '아무리 기다려도 일이 이루어지기 어려움.' },
      { text: '고희', hanja: '古稀', meaning: '예부터 드문 나이, 일흔 살을 이르는 말.' },
      { text: '풍수지탄', hanja: '風樹之歎', meaning: '효도하려 하나 부모가 이미 없음을 한탄함.' },
      { text: '조로인생', hanja: '朝露人生', meaning: '아침 이슬처럼 덧없는 인생.' },
      { text: '부귀재천', hanja: '富貴在天', meaning: '부귀는 하늘에 달려 사람의 뜻대로 되지 않음.' },
    ],
  },
  {
    key: 'effort', label: '노력·인내', icon: '🔥',
    proverbs: [
      { text: '천 리 길도 한 걸음부터', meaning: '아무리 큰일도 작은 시작에서 비롯된다.' },
      { text: '티끌 모아 태산', meaning: '작은 것도 모으고 모으면 큰 것을 이룬다.' },
      { text: '열 번 찍어 안 넘어가는 나무 없다', meaning: '꾸준히 애쓰면 어떤 어려운 일도 이루어진다.' },
      { text: '낙숫물이 댓돌을 뚫는다', meaning: '작은 힘이라도 꾸준히 하면 큰일을 해낸다.' },
      { text: '공든 탑이 무너지랴', meaning: '정성을 다해 한 일은 헛되지 않는다.' },
      { text: '구슬이 서 말이라도 꿰어야 보배', meaning: '아무리 좋은 것도 다듬어 쓸모 있게 만들어야 가치가 있다.' },
      { text: '시작이 반이다', meaning: '무슨 일이든 시작하기가 어렵지 일단 시작하면 절반은 한 셈이다.' },
      { text: '우물을 파도 한 우물을 파라', meaning: '한 가지 일을 끝까지 꾸준히 해야 성공한다.' },
      { text: '첫술에 배부르랴', meaning: '어떤 일이든 단번에 만족스러운 성과를 얻기는 어렵다.' },
      { text: '돌다리도 두들겨 보고 건너라', meaning: '잘 아는 일이라도 신중히 살펴서 하라.' },
      { text: '하늘은 스스로 돕는 자를 돕는다', meaning: '스스로 애쓰는 사람이라야 좋은 결과를 얻는다.' },
      { text: '부지런한 물방아는 얼 새도 없다', meaning: '쉬지 않고 부지런히 움직이면 탈이 생기지 않는다.' },
      { text: '아니 되면 조상 탓', meaning: '제 노력은 않고 안 되면 남 탓만 한다는 경계의 말.' },
      { text: '뜻이 있는 곳에 길이 있다', meaning: '굳은 의지가 있으면 어떤 어려움도 헤쳐 나갈 수 있다.' },
      { text: '땀 흘린 만큼 거둔다', meaning: '들인 노력에 따라 그만한 결실을 얻는다.' },
      { text: '느릿느릿 걸어도 황소걸음', meaning: '느려 보여도 꾸준하면 끝내 큰일을 이룬다.' },
    ],
    idioms: [
      { text: '대기만성', hanja: '大器晩成', meaning: '큰 그릇은 늦게 이루어짐, 큰 인물은 늦게 성공함.' },
      { text: '우공이산', hanja: '愚公移山', meaning: '꾸준히 노력하면 큰일도 반드시 이룸.' },
      { text: '마부작침', hanja: '磨斧作針', meaning: '도끼를 갈아 바늘을 만듦, 끈기 있게 노력함.' },
      { text: '수적천석', hanja: '水滴穿石', meaning: '물방울이 바위를 뚫음, 작은 힘도 꾸준하면 큰일을 이룸.' },
      { text: '형설지공', hanja: '螢雪之功', meaning: '반딧불과 눈빛으로 공부함, 고생하며 부지런히 학문을 닦음.' },
      { text: '주경야독', hanja: '晝耕夜讀', meaning: '낮에는 일하고 밤에는 공부함, 어렵게 공부함.' },
      { text: '와신상담', hanja: '臥薪嘗膽', meaning: '원수를 갚으려 괴로움을 참고 견딤.' },
      { text: '절치부심', hanja: '切齒腐心', meaning: '이를 갈고 마음을 썩임, 몹시 분하여 노력함.' },
      { text: '불철주야', hanja: '不撤晝夜', meaning: '밤낮을 가리지 않고 힘써 일함.' },
      { text: '각고면려', hanja: '刻苦勉勵', meaning: '몹시 애를 쓰고 부지런히 힘씀.' },
      { text: '백절불굴', hanja: '百折不屈', meaning: '백 번 꺾여도 굽히지 않음.' },
      { text: '칠전팔기', hanja: '七顚八起', meaning: '일곱 번 넘어져도 여덟 번 일어남, 거듭된 실패에도 굴하지 않음.' },
      { text: '심기일전', hanja: '心機一轉', meaning: '어떤 계기로 이제까지의 마음가짐을 완전히 바꿈.' },
      { text: '권토중래', hanja: '捲土重來', meaning: '한 번 패한 뒤 힘을 길러 다시 쳐들어옴.' },
      { text: '발분망식', hanja: '發憤忘食', meaning: '끼니조차 잊을 만큼 분발하여 일에 힘씀.' },
      { text: '형창설안', hanja: '螢窓雪案', meaning: '반딧불 비친 창과 눈 덮인 책상, 고생하며 부지런히 학문에 힘씀.' },
    ],
  },
  {
    key: 'relation', label: '관계·말', icon: '🤝',
    proverbs: [
      { text: '가는 말이 고와야 오는 말이 곱다', meaning: '내가 남에게 좋게 해야 남도 내게 좋게 한다.' },
      { text: '발 없는 말이 천 리 간다', meaning: '말은 순식간에 멀리 퍼지니 말을 삼가야 한다.' },
      { text: '말 한마디에 천 냥 빚도 갚는다', meaning: '말을 잘하면 어려운 일도 해결할 수 있다.' },
      { text: '낮말은 새가 듣고 밤말은 쥐가 듣는다', meaning: '비밀스러운 말도 새어 나가기 쉬우니 말조심하라.' },
      { text: '백지장도 맞들면 낫다', meaning: '쉬운 일도 서로 힘을 합치면 더 쉽다.' },
      { text: '먼 사촌보다 가까운 이웃이 낫다', meaning: '멀리 있는 친척보다 가까이 지내는 이웃이 더 도움이 된다.' },
      { text: '미운 놈 떡 하나 더 준다', meaning: '미울수록 도리어 잘 대해 주어 마음을 풀게 한다.' },
      { text: '윗물이 맑아야 아랫물이 맑다', meaning: '윗사람이 바르게 해야 아랫사람도 본받아 바르게 한다.' },
      { text: '하나를 보면 열을 안다', meaning: '한 가지 행동을 보면 그 사람 전체를 짐작할 수 있다.' },
      { text: '입은 비뚤어져도 말은 바로 해라', meaning: '어떤 형편에서도 말은 바르게 해야 한다.' },
      { text: '말이 씨가 된다', meaning: '늘 하던 말이 마침내 사실대로 되니 말을 함부로 말라.' },
      { text: '아 다르고 어 다르다', meaning: '같은 내용이라도 말하기에 따라 느낌이 아주 달라진다.' },
      { text: '귀에 걸면 귀걸이 코에 걸면 코걸이', meaning: '둘러대기에 따라 이렇게도 저렇게도 해석된다.' },
      { text: '같은 값이면 다홍치마', meaning: '같은 조건이면 보기 좋고 나은 것을 고른다.' },
      { text: '누울 자리 봐 가며 발 뻗어라', meaning: '결과를 헤아려 보고 미리 살펴서 행동하라.' },
      { text: '친구 따라 강남 간다', meaning: '제 뜻 없이 남에게 끌려 덩달아 따라 한다.' },
    ],
    idioms: [
      { text: '역지사지', hanja: '易地思之', meaning: '처지를 바꾸어 상대편의 입장에서 생각함.' },
      { text: '관포지교', hanja: '管鮑之交', meaning: '아주 친밀하고 변함없는 두터운 우정.' },
      { text: '죽마고우', hanja: '竹馬故友', meaning: '어릴 때부터 같이 놀며 자란 오랜 벗.' },
      { text: '막역지우', hanja: '莫逆之友', meaning: '서로 거스름이 없는, 허물없이 친한 벗.' },
      { text: '수어지교', hanja: '水魚之交', meaning: '물과 물고기의 사귐, 떨어질 수 없는 친밀한 관계.' },
      { text: '이심전심', hanja: '以心傳心', meaning: '말 없이 마음에서 마음으로 뜻이 통함.' },
      { text: '교언영색', hanja: '巧言令色', meaning: '아첨하느라 말을 꾸미고 얼굴빛을 곱게 함.' },
      { text: '동병상련', hanja: '同病相憐', meaning: '같은 처지의 사람끼리 서로 가엾게 여김.' },
      { text: '인지상정', hanja: '人之常情', meaning: '사람이라면 누구나 가지는 보통의 마음.' },
      { text: '결초보은', hanja: '結草報恩', meaning: '죽어서도 잊지 않고 은혜를 갚음.' },
      { text: '배은망덕', hanja: '背恩忘德', meaning: '입은 은덕을 저버리고 배신함.' },
      { text: '고복격양', hanja: '鼓腹擊壤', meaning: '배를 두드리며 땅을 침, 태평성대를 즐기는 모습.' },
      { text: '백아절현', hanja: '伯牙絶絃', meaning: '자기를 알아주던 벗의 죽음을 슬퍼함.' },
      { text: '간담상조', hanja: '肝膽相照', meaning: '서로 속마음을 터놓고 친하게 사귐.' },
      { text: '문전성시', hanja: '門前成市', meaning: '찾아오는 사람이 많아 문 앞이 시장을 이룸.' },
      { text: '읍참마속', hanja: '泣斬馬謖', meaning: '큰 목적을 위해 사사로운 정을 버리고 처단함.' },
    ],
  },
  {
    key: 'caution', label: '경계·교훈', icon: '⚠️',
    proverbs: [
      { text: '소 잃고 외양간 고친다', meaning: '일을 그르친 뒤에야 뒤늦게 손을 쓴다.' },
      { text: '호미로 막을 것을 가래로 막는다', meaning: '작을 때 처리하지 못해 일이 커진 뒤 큰 힘을 들인다.' },
      { text: '바늘 도둑이 소도둑 된다', meaning: '작은 잘못을 그냥 두면 큰 죄를 짓게 된다.' },
      { text: '믿는 도끼에 발등 찍힌다', meaning: '믿었던 사람에게 도리어 해를 입는다.' },
      { text: '돌다리도 두들겨 보고 건너라', meaning: '아는 일이라도 신중히 확인하고 하라.' },
      { text: '가는 날이 장날', meaning: '뜻하지 않은 일이 우연히 겹친다.' },
      { text: '낫 놓고 기역 자도 모른다', meaning: '아주 무식하여 쉬운 것조차 알지 못한다.' },
      { text: '빈 수레가 요란하다', meaning: '실속 없는 사람이 더 떠들고 잘난 체한다.' },
      { text: '벼는 익을수록 고개를 숙인다', meaning: '교양 있고 잘난 사람일수록 더 겸손하다.' },
      { text: '우물 안 개구리', meaning: '넓은 세상을 모르고 좁은 식견에 갇혀 있다.' },
      { text: '뱁새가 황새 따라가면 가랑이 찢어진다', meaning: '제 분수를 모르고 남을 좇으면 도리어 화를 입는다.' },
      { text: '제 꾀에 제가 넘어간다', meaning: '남을 속이려다가 도리어 자기가 당한다.' },
      { text: '아니 땐 굴뚝에 연기 나랴', meaning: '원인이 없으면 결과도 없다, 소문에는 까닭이 있다.' },
      { text: '낙숫물은 떨어지던 데 또 떨어진다', meaning: '한 번 한 잘못을 또다시 되풀이하기 쉽다.' },
      { text: '병 주고 약 준다', meaning: '해를 입힌 뒤에 도와주는 척한다.' },
      { text: '똥 묻은 개가 겨 묻은 개 나무란다', meaning: '제 큰 허물은 모르고 남의 작은 흠을 흉본다.' },
      { text: '되로 막을 것을 말로 막는다', meaning: '작을 때 처리하지 못해 나중에 큰 힘을 들인다.' },
      { text: '말 많은 집은 장맛도 쓰다', meaning: '말이 많은 집안은 살림이 잘되지 않는다.' },
    ],
    idioms: [
      { text: '망양보뢰', hanja: '亡羊補牢', meaning: '양을 잃고 우리를 고침, 일이 잘못된 뒤에야 손을 씀.' },
      { text: '사후약방문', hanja: '死後藥方文', meaning: '죽은 뒤에 약방문을 씀, 때를 놓쳐 소용없는 대책.' },
      { text: '교각살우', hanja: '矯角殺牛', meaning: '뿔을 바로잡으려다 소를 죽임, 작은 흠 고치려다 일을 망침.' },
      { text: '소탐대실', hanja: '小貪大失', meaning: '작은 것을 탐하다가 큰 것을 잃음.' },
      { text: '과유불급', hanja: '過猶不及', meaning: '지나친 것은 미치지 못한 것과 같음.' },
      { text: '자업자득', hanja: '自業自得', meaning: '자기가 저지른 일의 결과를 자기가 받음.' },
      { text: '자승자박', hanja: '自繩自縛', meaning: '제 줄로 제 몸을 묶음, 자기 말과 행동에 자기가 옭매임.' },
      { text: '구상유취', hanja: '口尙乳臭', meaning: '입에서 아직 젖내가 남, 말과 행동이 유치함.' },
      { text: '정저지와', hanja: '井底之蛙', meaning: '우물 안 개구리, 견문이 좁아 세상 형편을 모름.' },
      { text: '주마간산', hanja: '走馬看山', meaning: '말을 달리며 산을 봄, 자세히 살피지 못하고 대충 봄.' },
      { text: '근묵자흑', hanja: '近墨者黑', meaning: '먹을 가까이하면 검어짐, 나쁜 사람과 사귀면 물들기 쉬움.' },
      { text: '유비무환', hanja: '有備無患', meaning: '미리 준비가 되어 있으면 근심이 없음.' },
      { text: '거안사위', hanja: '居安思危', meaning: '편안할 때에 위태로움을 생각하여 대비함.' },
      { text: '침소봉대', hanja: '針小棒大', meaning: '바늘만 한 것을 몽둥이만 하다고 함, 작은 일을 크게 부풀림.' },
      { text: '조삼모사', hanja: '朝三暮四', meaning: '잔꾀로 남을 농락함, 눈앞의 차이만 알고 결과가 같음을 모름.' },
      { text: '감언이설', hanja: '甘言利說', meaning: '귀가 솔깃하도록 남을 꾀는 달콤한 말.' },
      { text: '허장성세', hanja: '虛張聲勢', meaning: '실속 없이 헛되이 큰소리치며 위세를 부림.' },
    ],
  },
  {
    key: 'wisdom', label: '지혜·이치', icon: '🦉',
    proverbs: [
      { text: '아는 것이 힘이다', meaning: '지식이 곧 큰 힘이 된다.' },
      { text: '등잔 밑이 어둡다', meaning: '가까이 있는 것을 도리어 잘 알지 못한다.' },
      { text: '구르는 돌에는 이끼가 끼지 않는다', meaning: '부지런히 움직이는 사람은 침체되지 않는다.' },
      { text: '꿩 먹고 알 먹는다', meaning: '한 가지 일로 두 가지 이익을 본다.' },
      { text: '도랑 치고 가재 잡는다', meaning: '한 가지 일로 두 가지 이익을 얻는다.' },
      { text: '말 타면 경마 잡히고 싶다', meaning: '사람의 욕심은 끝이 없다.' },
      { text: '되로 주고 말로 받는다', meaning: '조금 주고 그 갑절을 받는다.' },
      { text: '백문이 불여일견', meaning: '백 번 듣는 것이 한 번 보는 것만 못하다.' },
      { text: '열 길 물속은 알아도 한 길 사람 속은 모른다', meaning: '사람의 속마음은 헤아리기가 매우 어렵다.' },
      { text: '뛰는 놈 위에 나는 놈 있다', meaning: '아무리 재주가 뛰어나도 더 나은 사람이 있다.' },
      { text: '원숭이도 나무에서 떨어진다', meaning: '아무리 능숙한 사람도 실수할 때가 있다.' },
      { text: '핑계 없는 무덤이 없다', meaning: '어떤 일에도 그럴듯한 핑계는 다 있다.' },
      { text: '윗돌 빼서 아랫돌 괴기', meaning: '임시변통으로 이리저리 둘러맞춤.' },
      { text: '가랑비에 옷 젖는 줄 모른다', meaning: '사소한 것도 거듭되면 크게 영향을 미친다.' },
      { text: '서당 개 삼 년이면 풍월을 읊는다', meaning: '무식한 사람도 오래 보고 들으면 어느 정도 익히게 된다.' },
      { text: '구더기 무서워 장 못 담글까', meaning: '작은 방해가 있어도 마땅히 할 일은 해야 한다.' },
      { text: '천 냥 빚도 말로 갚는다', meaning: '말을 잘하면 큰 어려움도 해결할 수 있다.' },
      { text: '아는 길도 물어 가라', meaning: '잘 아는 일이라도 신중을 기하라.' },
    ],
    idioms: [
      { text: '온고지신', hanja: '溫故知新', meaning: '옛것을 익혀 새것을 앎.' },
      { text: '일거양득', hanja: '一擧兩得', meaning: '한 가지 일로 두 가지 이익을 얻음.' },
      { text: '일석이조', hanja: '一石二鳥', meaning: '돌 하나로 새 두 마리를 잡음, 한 가지 일로 두 이익.' },
      { text: '타산지석', hanja: '他山之石', meaning: '남의 하찮은 잘못도 자기 수양에 도움이 됨.' },
      { text: '반면교사', hanja: '反面敎師', meaning: '나쁜 본보기를 통해 가르침을 얻음.' },
      { text: '명약관화', hanja: '明若觀火', meaning: '불을 보듯 분명하고 뻔함.' },
      { text: '일목요연', hanja: '一目瞭然', meaning: '한눈에 알아볼 수 있을 만큼 분명함.' },
      { text: '청출어람', hanja: '靑出於藍', meaning: '제자가 스승보다 나음.' },
      { text: '괄목상대', hanja: '刮目相對', meaning: '눈을 비비고 다시 봄, 남의 학식·재주가 부쩍 늚.' },
      { text: '대동소이', hanja: '大同小異', meaning: '거의 같고 조금 다름, 비슷비슷함.' },
      { text: '아전인수', hanja: '我田引水', meaning: '제 논에 물 대기, 자기에게만 이롭게 함.' },
      { text: '견물생심', hanja: '見物生心', meaning: '물건을 보면 그것을 가지고 싶은 욕심이 생김.' },
      { text: '안분지족', hanja: '安分知足', meaning: '제 분수를 지키며 만족할 줄 앎.' },
      { text: '격물치지', hanja: '格物致知', meaning: '사물의 이치를 끝까지 따져 지식을 넓힘.' },
      { text: '실사구시', hanja: '實事求是', meaning: '사실에 근거하여 진리를 탐구함.' },
      { text: '명경지수', hanja: '明鏡止水', meaning: '맑은 거울과 고요한 물처럼 잡념 없는 깨끗한 마음.' },
      { text: '심사숙고', hanja: '深思熟考', meaning: '깊이 생각하고 거듭 헤아림.' },
    ],
  },
  {
    key: 'fate', label: '운명·세태', icon: '🎲',
    proverbs: [
      { text: '될성부른 나무는 떡잎부터 알아본다', meaning: '잘될 사람은 어려서부터 남다른 데가 있다.' },
      { text: '하룻강아지 범 무서운 줄 모른다', meaning: '경험 없는 자가 두려움을 모르고 함부로 덤빈다.' },
      { text: '개구리 올챙이 적 생각 못 한다', meaning: '형편이 나아진 사람이 어려웠던 시절을 잊는다.' },
      { text: '고래 싸움에 새우 등 터진다', meaning: '강한 자들 다툼에 약한 자가 공연히 피해를 본다.' },
      { text: '닭 쫓던 개 지붕 쳐다본다', meaning: '애쓰던 일이 실패하여 어이없이 됨.' },
      { text: '울며 겨자 먹기', meaning: '싫은 일을 마지못해 억지로 함.' },
      { text: '엎친 데 덮친다', meaning: '어려운 일이 겹쳐 일어난다.' },
      { text: '가뭄에 단비', meaning: '몹시 기다리던 차에 마침맞게 온 것.' },
      { text: '제비가 낮게 날면 비가 온다', meaning: '자연의 조짐으로 앞일을 짐작할 수 있다.' },
      { text: '쇠뿔도 단김에 빼라', meaning: '하려고 마음먹은 일은 망설이지 말고 곧 행하라.' },
      { text: '닭 잡아먹고 오리 발 내놓기', meaning: '잘못을 저지르고 엉뚱한 것으로 둘러댄다.' },
      { text: '벼룩의 간을 빼먹는다', meaning: '하찮은 것에서 무리하게 이익을 짜낸다.' },
      { text: '재주는 곰이 부리고 돈은 주인이 받는다', meaning: '수고는 한 사람이 하고 이익은 딴 사람이 차지한다.' },
      { text: '하늘이 무너져도 솟아날 구멍이 있다', meaning: '아무리 어려운 처지에도 헤어날 길은 있다.' },
      { text: '운이 따라야 일도 된다', meaning: '아무리 애써도 때와 운이 맞아야 일이 이루어진다.' },
      { text: '못된 송아지 엉덩이에 뿔 난다', meaning: '못된 사람이 더 미운 짓만 골라 한다.' },
      { text: '굼벵이도 구르는 재주가 있다', meaning: '아무리 못난 사람도 한 가지 재주는 있다.' },
      { text: '뒷간 갈 적 마음 다르고 올 적 마음 다르다', meaning: '급할 때와 일이 끝난 뒤의 마음이 달라진다.' },
    ],
    idioms: [
      { text: '인과응보', hanja: '因果應報', meaning: '원인과 결과는 서로 응함, 행한 대로 갚음을 받음.' },
      { text: '사필귀정', hanja: '事必歸正', meaning: '모든 일은 반드시 바른길로 돌아감.' },
      { text: '권선징악', hanja: '勸善懲惡', meaning: '착한 일을 권하고 악한 일을 벌함.' },
      { text: '진퇴양난', hanja: '進退兩難', meaning: '나아가지도 물러서지도 못하는 어려운 처지.' },
      { text: '사면초가', hanja: '四面楚歌', meaning: '사방이 적에게 둘러싸여 고립된 처지.' },
      { text: '풍전등화', hanja: '風前燈火', meaning: '바람 앞의 등불, 매우 위태로운 처지.' },
      { text: '누란지위', hanja: '累卵之危', meaning: '쌓아 놓은 알처럼 몹시 위태로운 형세.' },
      { text: '설상가상', hanja: '雪上加霜', meaning: '눈 위에 서리가 덮임, 어려운 일이 잇따라 겹침.' },
      { text: '금상첨화', hanja: '錦上添花', meaning: '비단 위에 꽃을 더함, 좋은 일에 더 좋은 일이 겹침.' },
      { text: '오비이락', hanja: '烏飛梨落', meaning: '까마귀 날자 배 떨어짐, 우연이 겹쳐 의심을 받음.' },
      { text: '천재일우', hanja: '千載一遇', meaning: '천 년에 한 번 만날 만한 좋은 기회.' },
      { text: '명재경각', hanja: '命在頃刻', meaning: '목숨이 경각에 달림, 거의 죽게 됨.' },
      { text: '천신만고', hanja: '千辛萬苦', meaning: '온갖 어려움을 겪으며 몹시 애씀.' },
      { text: '고립무원', hanja: '孤立無援', meaning: '고립되어 도움을 받을 데가 전혀 없음.' },
      { text: '백척간두', hanja: '百尺竿頭', meaning: '백 자나 되는 장대 끝, 매우 위태롭고 어려운 지경.' },
      { text: '일촉즉발', hanja: '一觸卽發', meaning: '조금만 닿아도 곧 터질 듯한 몹시 위급한 상태.' },
      { text: '기사회생', hanja: '起死回生', meaning: '거의 죽을 뻔하다가 다시 살아남.' },
    ],
  },
]

const LS = 'sry:tool:proverb-dict:'
const ALL_KEY = '__all__'

interface Row { cat: CatDef; kind: Kind; item: Saying }
const rowsOf = (c: CatDef): Row[] => [
  ...c.proverbs.map((item) => ({ cat: c, kind: 'proverb' as Kind, item })),
  ...c.idioms.map((item) => ({ cat: c, kind: 'idiom' as Kind, item })),
]
const flatAll = (): Row[] => CATS.flatMap(rowsOf)

const KIND_LABEL: Record<Kind, string> = { proverb: '속담', idiom: '사자성어' }

export default function ProverbDict() {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  const [kind, setKind] = useState<Kind | 'all'>(() => {
    try {
      const raw = localStorage.getItem(LS + 'kind')
      if (raw === 'proverb' || raw === 'idiom' || raw === 'all') return raw
    } catch { /* ignore */ }
    return 'all'
  })
  // 즐겨찾기: "catKey::kind::text" 형태의 키 집합
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) {
        const obj = JSON.parse(raw)
        if (obj && typeof obj === 'object') return obj as Record<string, boolean>
      }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<Row | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'kind', kind) } catch { /* ignore */ } }, [kind])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  // 언마운트 시 진행 중인 복사 토스트 타이머 정리
  const copiedTimer = useMemo(() => ({ id: 0 }), [])
  const toastTimer = useMemo(() => ({ id: 0 }), [])
  useEffect(() => () => {
    if (copiedTimer.id) window.clearTimeout(copiedTimer.id)
    if (toastTimer.id) window.clearTimeout(toastTimer.id)
  }, [copiedTimer, toastTimer])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.proverbs.length + c.idioms.length, 0), [])

  const favKey = (catKey: string, k: Kind, text: string) => `${catKey}::${k}::${text}`

  // 현재 카테고리·종류 필터 풀(검색·즐겨찾기 미적용) — 무작위/목록 공용
  const pool = useMemo(() => {
    let base = cat === ALL_KEY ? flatAll() : (CATS.find((c) => c.key === cat) ? rowsOf(CATS.find((c) => c.key === cat)!) : [])
    if (kind !== 'all') base = base.filter((r) => r.kind === kind)
    return base
  }, [cat, kind])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = pool
    if (onlyFav) base = base.filter((r) => favs[favKey(r.cat.key, r.kind, r.item.text)])
    if (q) {
      base = base.filter((r) =>
        r.item.text.toLowerCase().includes(q) ||
        r.item.meaning.toLowerCase().includes(q) ||
        (r.item.hanja ? r.item.hanja.toLowerCase().includes(q) : false))
    }
    return base
  }, [pool, query, onlyFav, favs])

  const rollRandom = useCallback(() => {
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.text === prev.item.text && pick.cat.key === prev.cat.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return pick
    })
  }, [pool])

  const toggleFav = (catKey: string, k: Kind, text: string) => {
    const fk = favKey(catKey, k, text)
    setFavs((prev) => {
      const next = { ...prev }
      if (next[fk]) delete next[fk]
      else next[fk] = true
      return next
    })
  }

  const flashToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.id) window.clearTimeout(toastTimer.id)
    toastTimer.id = window.setTimeout(() => setToast(null), 2200)
  }

  const plainOf = (r: Row): string => {
    const head = r.kind === 'idiom' && r.item.hanja ? `${r.item.text}(${r.item.hanja})` : r.item.text
    return `${head} — ${r.item.meaning}`
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      if (copiedTimer.id) window.clearTimeout(copiedTimer.id)
      copiedTimer.id = window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }

  // [연계] 스니펫 저장 — 공유 라이브러리에 인용구 텍스트를 추가
  const saveSnippet = (r: Row) => {
    addToLibrary('snippets', {
      text: plainOf(r),
      source: `속담·사자성어 사전 (${r.cat.label})`,
      tags: [KIND_LABEL[r.kind], r.cat.label],
    })
    flashToast(`스니펫으로 저장했습니다 — “${r.item.text}”`)
  }

  const escapeHtml = (str: string) =>
    String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // 현재 무작위 항목을 프로젝트 자료 〈인용구〉 폴더에 메모로 추가
  const addCurrentToProject = () => {
    if (!random || !hasProjectBridge()) return
    const r = random
    const head = r.kind === 'idiom' && r.item.hanja ? `${r.item.text} (${r.item.hanja})` : r.item.text
    const bodyHtml = [
      `<p><b>${escapeHtml(r.cat.icon + ' ' + r.cat.label)} · ${escapeHtml(KIND_LABEL[r.kind])}</b></p>`,
      `<p><b>${escapeHtml(head)}</b></p>`,
      `<p>${escapeHtml(r.item.meaning)}</p>`,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '인용구',
      title: `${r.item.text} (${KIND_LABEL[r.kind]})`,
      bodyHtml,
    })
    if (id) flashToast(`프로젝트 자료 〈인용구〉에 “${r.item.text}”를 추가했습니다.`)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  const renderHead = (r: Row, big = false) => (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: big ? 17 : 15, fontWeight: 700 }}>{r.item.text}</span>
      {r.kind === 'idiom' && r.item.hanja && (
        <span style={{ fontSize: big ? 13 : 12, color: 'var(--muted)' }}>{r.item.hanja}</span>
      )}
    </span>
  )

  return (
    <div style={wrap}>
      <div style={hint}>
        한국 속담과 사자성어 <b>{total}개</b>를 인생·노력·관계·경계·지혜·운명으로 모았습니다. 인용·제사·대사의 양념으로 쓰고, 클릭해 복사하세요.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="속담·사자성어·뜻·한자로 검색 (예: 노력, 후회, 塞翁)"
        style={{
          padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none',
        }}
      />

      {/* 종류 필터 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {([['all', '전체', '📚'], ['proverb', '속담', '🗣️'], ['idiom', '사자성어', '🀄']] as const).map(([k, label, ic]) => {
          const on = kind === k
          return (
            <button
              key={k}
              className="minibtn"
              onClick={() => setKind(k)}
              aria-pressed={on}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}
            >
              <Emoji e={ic} /> {label}
            </button>
          )
        })}
      </div>

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button
          className="minibtn"
          onClick={() => setCat(ALL_KEY)}
          aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}
        >
          <Emoji e="✨" /> 전체
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button
              key={c.key}
              className="minibtn"
              onClick={() => setCat(c.key)}
              aria-pressed={on}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}
            >
              <Emoji e={c.icon} /> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 한 줄</button>
        <button
          className="minibtn"
          onClick={() => setOnlyFav((v) => !v)}
          aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}
        >
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 무작위 결과 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label} · {KIND_LABEL[random.kind]}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ margin: '6px 0 2px' }}>{renderHead(random, true)}</div>
          <div style={{ fontSize: 13, lineHeight: 1.55, margin: '4px 0 8px' }}>{random.item.meaning}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(plainOf(random), 'rand')}>
              {copiedKey === 'rand' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
            </button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.kind, random.item.text)}>
              {favs[favKey(random.cat.key, random.kind, random.item.text)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
          {/* 연계: 스니펫 저장 + 프로젝트 자료에 메모 추가 */}
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => saveSnippet(random)} title="이 인용구를 공유 스니펫 라이브러리에 저장">
              <Emoji e="✂️" /> 스니펫 저장
            </button>
            <button
              className="linkbtn"
              onClick={addCurrentToProject}
              disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 인용구를 프로젝트 자료 〈인용구〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}
            >
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{
          background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8,
          padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)',
        }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav
              ? '☆ 아직 즐겨찾기한 항목이 없습니다. 별을 눌러 모아 보세요.'
              : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map((r) => {
            const fk = favKey(r.cat.key, r.kind, r.item.text)
            const isFav = !!favs[fk]
            const copyId = 'item:' + fk
            return (
              <div key={fk} style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={r.cat.icon} /> {r.cat.label} · {KIND_LABEL[r.kind]}</span>
                  <button
                    className="minibtn"
                    title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                    onClick={() => toggleFav(r.cat.key, r.kind, r.item.text)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}
                  >
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                <div style={{ marginTop: 5 }}>{renderHead(r)}</div>
                <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 4 }}>{r.item.meaning}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <button className="minibtn" onClick={() => copy(plainOf(r), copyId)}>
                    {copiedKey === copyId ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
                  </button>
                  <button className="minibtn" onClick={() => saveSnippet(r)} title="공유 스니펫 라이브러리에 저장">
                    <Emoji e="✂️" /> 스니펫
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 저작권 표기 */}
      <div className="license-note">
        수록 속담·사자성어는 오랜 세월 전해 내려온 공유 문화유산(퍼블릭 도메인)이며, 뜻풀이는 자체 작성했습니다.
        <span className="license-badge" style={{ marginLeft: 6 }}>Public Domain</span>
      </div>
    </div>
  )
}
