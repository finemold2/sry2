// 한국 방언 표현 사전 — 경상·전라·충청·강원·제주·북한 6개 지역의 대표 어휘·어미·억양 특징·예문을
// 표준어와 대조해 모은 로컬 대량 사전. 대사·인물 말투 설정에 바로 쓰도록 연계 버튼을 붙였다.
// 자급식: 외부 네트워크·미디어·라이브러리 없음. react + './linkbus' 만 import.
// 모든 표현·대조·예문은 직접 작성한 자작 데이터(백과 베끼기 금지). 제어문자 없음.
// localStorage(펼친 카테고리·지역·종류·즐겨찾기) 영속, Math.random 무작위, 클립보드 복사, 언마운트 타이머 정리.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToStash, addToLibrary, addToProject, hasProjectBridge, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'dialect-ref', name: '방언 표현 사전', icon: '🗺️', group: '언어·어휘', intro: '경상·전라·충청·강원·제주·북한 방언 어휘·어미·억양·예문을 표준어와 대조해 대사에 바로 쓰세요', w: 660, h: 660 }

// ---------- 데이터 모델 ----------
type Kind = 'word' | 'ending' | 'phrase'
interface Entry {
  dialect: string   // 방언 표현
  standard: string  // 표준어
  note?: string     // 쓰임/뉘앙스 풀이
}
interface RegionDef {
  key: string
  label: string
  icon: string
  // 억양·말투 특징(여러 줄)
  features: string[]
  words: Entry[]    // 대표 어휘 대조
  endings: Entry[]  // 대표 어미·말끝 대조
  phrases: Entry[]  // 예문(대사) 대조
}

// ---------- 자작 방언 사전(지역 6 × 어휘/어미/예문) ----------
const REGIONS: RegionDef[] = [
  {
    key: 'gyeongsang', label: '경상', icon: '🌊',
    features: [
      '말끝을 짧게 끊고 음의 높낮이가 큰 편이라 다그치듯 들리기 쉽다.',
      '의문은 끝을 올려 "~노/~나"로 맺는다(설명의문 ~노, 판정의문 ~나).',
      '받침 뒤 모음을 빠르게 흘려 단어가 짧아지는 일이 잦다.',
      '강조할 때 "억수로, 디기, 무지"를 자주 곁들인다.',
    ],
    words: [
      { dialect: '억수로', standard: '엄청, 무척', note: '정도가 매우 심함을 강조.' },
      { dialect: '디기', standard: '되게, 아주', note: '강한 정도 부사.' },
      { dialect: '단디', standard: '단단히, 잘', note: '"단디 챙기라"처럼 당부할 때.' },
      { dialect: '문디', standard: '문둥이(친근한 욕)', note: '가까운 사이에 정겹게 부르는 말.' },
      { dialect: '쎄빠지다', standard: '몹시 힘들다', note: '"쎄빠지게 일했다"처럼 고생을 표현.' },
      { dialect: '천지삐까리', standard: '아주 많음', note: '여기저기 가득함을 과장.' },
      { dialect: '쪼매', standard: '조금', note: '"쪼매만 기다리라".' },
      { dialect: '깨방정', standard: '방정맞은 짓', note: '경망스레 까부는 모양.' },
      { dialect: '머스마', standard: '사내아이', note: '남자아이를 이르는 말.' },
      { dialect: '가시나', standard: '계집아이', note: '여자아이를 이르는 말(거칠게 들릴 수 있음).' },
      { dialect: '몬하다', standard: '못하다', note: '"몬 간다(못 간다)".' },
      { dialect: '맥지', standard: '괜히, 공연히', note: '"맥지 그라지 마라".' },
      { dialect: '시방', standard: '지금', note: '현재를 가리키는 말(여러 지역 공유).' },
      { dialect: '욜로', standard: '이리로', note: '"욜로 온나(이리로 와라)".' },
      { dialect: '머라카노', standard: '뭐라고 하느냐', note: '되묻거나 따질 때.' },
      { dialect: '안카나', standard: '안 그러냐, 그렇잖아', note: '동의를 구하는 끝말.' },
      { dialect: '뻑쩍지근하다', standard: '뻐근하다', note: '몸이 묵직하게 결리는 느낌.' },
      { dialect: '깡술', standard: '안주 없는 술', note: '맨술로 마심.' },
      { dialect: '정구지', standard: '부추', note: '나물 이름.' },
      { dialect: '꼬치', standard: '고추', note: '채소 고추.' },
    ],
    endings: [
      { dialect: '~노', standard: '~냐(설명의문)', note: '내용을 묻는 의문. "뭐 묵노?"' },
      { dialect: '~나', standard: '~냐(판정의문)', note: '예/아니오를 묻는 의문. "밥 묵었나?"' },
      { dialect: '~다 아이가', standard: '~잖아', note: '동의·확인. "맞다 아이가."' },
      { dialect: '~카더라', standard: '~라고 하더라', note: '전해 들은 말. "온다 카더라."' },
      { dialect: '~삐다', standard: '~버리다', note: '"가삐다(가 버리다)".' },
      { dialect: '~능교', standard: '~습니까', note: '높임 의문. "어디 가능교?"' },
      { dialect: '~소', standard: '~오/~요', note: '예사높임. "그라소."' },
      { dialect: '~라꼬', standard: '~라고', note: '인용·강조. "간다 카라꼬."' },
      { dialect: '~데이', standard: '~다(다짐)', note: '다짐·당부의 끝말. "잘 가데이."' },
      { dialect: '~기라', standard: '~인 거라', note: '단정·설명. "그기 맞는 기라."' },
      { dialect: '~가', standard: '~인가', note: '판정의문 축약. "니가?"' },
      { dialect: '~제', standard: '~지', note: '확인. "그라제."' },
    ],
    phrases: [
      { dialect: '밥 뭇나?', standard: '밥 먹었니?', note: '가장 흔한 안부 인사.' },
      { dialect: '쪼매만 기다리라.', standard: '조금만 기다려라.', note: '재촉을 누그러뜨림.' },
      { dialect: '와 이라노?', standard: '왜 이러냐?', note: '따지거나 놀랄 때.' },
      { dialect: '단디 해라.', standard: '제대로 해라.', note: '당부·잔소리.' },
      { dialect: '됐다 마, 고마해라.', standard: '됐어, 그만해라.', note: '말다툼을 끊을 때.' },
      { dialect: '억수로 마이 묵었다.', standard: '엄청 많이 먹었다.', note: '과식 후.' },
      { dialect: '니 어데 가노?', standard: '너 어디 가니?', note: '설명의문 ~노.' },
      { dialect: '그기 그기 아이가.', standard: '그게 그거잖아.', note: '대수롭지 않다는 핀잔.' },
      { dialect: '내 마음 알겠제?', standard: '내 마음 알겠지?', note: '다정하게 확인.' },
      { dialect: '퍼뜩 온나.', standard: '얼른 와라.', note: '재촉하는 부름.' },
    ],
  },
  {
    key: 'jeolla', label: '전라', icon: '🌾',
    features: [
      '말끝을 부드럽게 늘이며 "~잉"으로 다정하게 맺는 일이 잦다.',
      '"거시기"로 이름을 잊은 것·차마 못 할 말을 두루 가리킨다.',
      '"~브렀다(~버렸다)" 류의 완료 표현이 발달했다.',
      '맛·정을 표현하는 어휘가 풍부하고 어조가 정겹다.',
    ],
    words: [
      { dialect: '거시기', standard: '거 뭐냐, 그것', note: '이름 잊은 것·말하기 거북한 것을 두루 가리킴.' },
      { dialect: '솔찬히', standard: '꽤, 상당히', note: '"솔찬히 멀다".' },
      { dialect: '겁나게', standard: '엄청, 무척', note: '정도 강조. "겁나게 맛있다".' },
      { dialect: '아따', standard: '어이쿠, 아이참', note: '감탄·핀잔의 첫말.' },
      { dialect: '워매', standard: '어머나', note: '놀람의 감탄.' },
      { dialect: '시방', standard: '지금', note: '현재를 가리킴.' },
      { dialect: '욕보다', standard: '수고하다, 고생하다', note: '"욕봤소(수고했소)".' },
      { dialect: '댕기다', standard: '다니다', note: '"학교 댕긴다".' },
      { dialect: '오메', standard: '아이고, 어머', note: '감탄·탄식.' },
      { dialect: '항꾼에', standard: '한꺼번에, 함께', note: '"항꾼에 가자".' },
      { dialect: '쌔게', standard: '세게, 빨리', note: '"쌔게 묵어라".' },
      { dialect: '짠하다', standard: '안쓰럽다, 애틋하다', note: '가엾고 마음이 아림.' },
      { dialect: '간잔지런하다', standard: '가지런하다', note: '나란히 정돈된 모양.' },
      { dialect: '깨작거리다', standard: '깨지락거리다', note: '음식을 깨작깨작 먹음.' },
      { dialect: '맨치로', standard: '처럼, 같이', note: '"나맨치로(나처럼)".' },
      { dialect: '여그', standard: '여기', note: '장소 가리킴. 저그(저기), 거그(거기).' },
      { dialect: '뭣땀시', standard: '무엇 때문에, 왜', note: '"뭣땀시 그라요?"' },
      { dialect: '쪼깐', standard: '조금', note: '"쪼깐만 더 주쇼".' },
      { dialect: '폴세', standard: '벌써', note: '"폴세 갔어".' },
      { dialect: '징하다', standard: '지긋지긋하다, 대단하다', note: '정도가 심함(부정/감탄 양쪽).' },
    ],
    endings: [
      { dialect: '~잉', standard: '~응, ~지(다정)', note: '다정하게 다짐·확인. "잘 가잉."' },
      { dialect: '~브렀다', standard: '~버렸다', note: '완료. "다 묵어브렀다."' },
      { dialect: '~쟤(라)', standard: '~지(다짐)', note: '"그라쟤(그러지)".' },
      { dialect: '~당께', standard: '~다니까', note: '강한 강조. "맞당께!"' },
      { dialect: '~디야/~디아', standard: '~대(전언)', note: '"온디야(온대)".' },
      { dialect: '~ㄴ개', standard: '~ㄴ가', note: '의문. "갔는개?"' },
      { dialect: '~쇼/~씨요', standard: '~세요', note: '높임 청유·명령. "오쇼.", "오씨요."' },
      { dialect: '~겄다', standard: '~겠다', note: '추측·의지. "비 오겄다."' },
      { dialect: '~제', standard: '~지', note: '확인·다짐. "그라제."' },
      { dialect: '~ㅆ능갑다', standard: '~ㅆ나 보다', note: '추측. "갔능갑다."' },
      { dialect: '~씨', standard: '~지(부드러운 마침)', note: '"그라씨."' },
      { dialect: '~디', standard: '~데(회상)', note: '"좋읍디(좋데)".' },
    ],
    phrases: [
      { dialect: '아따, 거시기 좀 갖고 와봐.', standard: '아이참, 그것 좀 가져와 봐.', note: '이름 잊은 물건을 부탁.' },
      { dialect: '욕봤소, 잘 가시오.', standard: '수고했어요, 잘 가요.', note: '헤어질 때 인사.' },
      { dialect: '겁나게 맛있구마잉.', standard: '엄청 맛있네.', note: '음식 칭찬.' },
      { dialect: '뭣땀시 그라요?', standard: '왜 그래요?', note: '까닭을 물음.' },
      { dialect: '시방 나 놀리요?', standard: '지금 나 놀려요?', note: '발끈할 때.' },
      { dialect: '워매, 깜짝이야.', standard: '어머나, 깜짝이야.', note: '놀람.' },
      { dialect: '쪼깐만 지달려 보쇼.', standard: '조금만 기다려 보세요.', note: '정중한 요청.' },
      { dialect: '항꾼에 묵으러 가세.', standard: '함께 먹으러 가자.', note: '다정한 청유.' },
      { dialect: '짠해서 못 보겄네.', standard: '안쓰러워 못 보겠네.', note: '연민.' },
      { dialect: '폴세 다 끝나브렀어.', standard: '벌써 다 끝나 버렸어.', note: '완료 표현.' },
    ],
  },
  {
    key: 'chungcheong', label: '충청', icon: '🏞️',
    features: [
      '말의 속도가 느긋하고 끝을 길게 늘여 여유롭게 들린다.',
      '"~유"로 부드럽게 맺는 높임이 대표적이다.',
      '"~겨/~벼"처럼 끝을 늘이며 확인·동의를 구한다.',
      '직접 다그치기보다 에둘러 말하는 완곡함이 두드러진다.',
    ],
    words: [
      { dialect: '워디', standard: '어디', note: '"워디 가남?"' },
      { dialect: '왜그려', standard: '왜 그래', note: '느긋한 되물음.' },
      { dialect: '그류', standard: '그래요', note: '대표적 긍정 답.' },
      { dialect: '읎다', standard: '없다', note: '"돈이 읎어".' },
      { dialect: '암껏두', standard: '아무것도', note: '"암껏두 읎어".' },
      { dialect: '쩌기', standard: '저기', note: '장소 가리킴. 여기→여그, 거기→거그도 쓰임.' },
      { dialect: '인저', standard: '이제', note: '"인저 가야지".' },
      { dialect: '겁나', standard: '굉장히', note: '정도 강조(전라와 공유).' },
      { dialect: '냅둬', standard: '내버려 둬', note: '"그냥 냅둬유".' },
      { dialect: '뭐여', standard: '뭐야', note: '느긋한 의문.' },
      { dialect: '징허다', standard: '지독하다, 대단하다', note: '정도가 심함.' },
      { dialect: '되게', standard: '아주, 매우', note: '정도 부사(전국 공유).' },
      { dialect: '핵교', standard: '학교', note: '구개음화·발음 변형.' },
      { dialect: '괜찮유', standard: '괜찮아요', note: '"나 괜찮유".' },
      { dialect: '시방', standard: '지금', note: '현재.' },
      { dialect: '쪼매', standard: '조금', note: '"쪼매 남았슈".' },
      { dialect: '냄편', standard: '남편', note: '발음 변형.' },
      { dialect: '맹키로', standard: '처럼, 같이', note: '"너맹키로".' },
      { dialect: '저짝', standard: '저쪽', note: '방향 가리킴.' },
      { dialect: '디다', standard: '되다, 고되다', note: '"일이 디다(고되다)".' },
    ],
    endings: [
      { dialect: '~유', standard: '~요', note: '대표적 부드러운 높임. "그류.", "가유."' },
      { dialect: '~겨', standard: '~인 거야/~지', note: '확인·동의. "그런 겨?"' },
      { dialect: '~벼', standard: '~지/~잖아', note: '"맞는 거 아녀, 그렇잖여 → 그려 그벼."' },
      { dialect: '~여', standard: '~야', note: '"뭐여?", "그려."' },
      { dialect: '~남', standard: '~나(의문)', note: '"가남?(가나?)".' },
      { dialect: '~ㄴ감', standard: '~ㄴ가', note: '"그런감?"' },
      { dialect: '~혀', standard: '~해', note: '"그만혀.", "어여 와혀."' },
      { dialect: '~ㅆ슈', standard: '~ㅆ어요', note: '"먹었슈.", "갔슈."' },
      { dialect: '~잖여', standard: '~잖아', note: '"맞잖여."' },
      { dialect: '~대유', standard: '~대요', note: '전언 높임. "온대유."' },
      { dialect: '~ㄴ디', standard: '~ㄴ데', note: '"좋은디 왜 그려."' },
      { dialect: '~기여', standard: '~인 거야', note: '단정. "그기여."' },
    ],
    phrases: [
      { dialect: '왜 그려, 무슨 일 있슈?', standard: '왜 그래, 무슨 일 있어요?', note: '느긋한 걱정.' },
      { dialect: '천천히 와유, 안 급혀.', standard: '천천히 와요, 안 급해.', note: '여유로운 배려.' },
      { dialect: '그류, 알겄슈.', standard: '그래요, 알겠어요.', note: '순한 수긍.' },
      { dialect: '뭐 그런 걸 다 사 왔댜.', standard: '뭐 그런 걸 다 사 왔어.', note: '쑥스러운 고마움.' },
      { dialect: '인저 그만 가야 쓰겄네.', standard: '이제 그만 가야겠네.', note: '자리를 뜰 때.' },
      { dialect: '괜찮유, 신경 쓰지 마유.', standard: '괜찮아요, 신경 쓰지 마요.', note: '사양.' },
      { dialect: '워디 갔다 인저 와?', standard: '어디 갔다 이제 와?', note: '가벼운 핀잔.' },
      { dialect: '그게 맞는 겨, 아닌 겨?', standard: '그게 맞는 거야, 아닌 거야?', note: '느긋한 확인.' },
      { dialect: '쪼매 남았슈, 금방 끝나유.', standard: '조금 남았어요, 금방 끝나요.', note: '안심시킴.' },
      { dialect: '암껏두 아녀, 됐슈.', standard: '아무것도 아니야, 됐어요.', note: '대수롭지 않다는 손사래.' },
    ],
  },
  {
    key: 'gangwon', label: '강원', icon: '⛰️',
    features: [
      '영동·영서의 차이가 있으나 대체로 끝을 누르듯 맺어 무뚝뚝하게 들린다.',
      '"~드래요/~래요"로 전언·설명을 부드럽게 맺는다.',
      '"~제"로 확인·다짐하는 끝말이 잦다.',
      '산골·바닷가 생활에서 온 어휘가 남아 있다.',
    ],
    words: [
      { dialect: '마커', standard: '모두, 전부', note: '"마커 모여라".' },
      { dialect: '천상', standard: '하는 수 없이, 영락없이', note: '"천상 가야지".' },
      { dialect: '나래비', standard: '줄, 한 줄로 섬', note: '"나래비 서라".' },
      { dialect: '뜨럭', standard: '마루, 토방', note: '집의 마루 앞 공간.' },
      { dialect: '감자바우', standard: '강원도 사람(애칭)', note: '강원 사람을 정겹게 이르는 말.' },
      { dialect: '엄두룩하다', standard: '어둑하다', note: '날이 어둑해짐.' },
      { dialect: '메께라', standard: '아이고, 어이쿠', note: '놀람·감탄.' },
      { dialect: '구녕', standard: '구멍', note: '발음 변형.' },
      { dialect: '안주', standard: '아직', note: '"안주 안 왔어".' },
      { dialect: '데기', standard: '되게, 아주', note: '정도 강조.' },
      { dialect: '비알', standard: '비탈, 산비탈', note: '가파른 산길.' },
      { dialect: '서덜', standard: '돌이 많은 곳', note: '강가·산의 돌밭.' },
      { dialect: '쌔비다', standard: '많다, 흔하다', note: '"천지로 쌔빗다".' },
      { dialect: '들창코', standard: '들린 코', note: '코 모양 묘사(전국 공유).' },
      { dialect: '재핀네', standard: '여편네, 아내', note: '아내를 낮춰 이르는 말.' },
      { dialect: '쾌하다', standard: '시원하다, 후련하다', note: '속이 후련함.' },
      { dialect: '저나', standard: '저기, 저 말이야', note: '말 꺼낼 때 머뭇거림.' },
      { dialect: '곤드레', standard: '고려엉겅퀴(나물)', note: '강원 산나물.' },
      { dialect: '올체', standard: '올해', note: '발음 변형.' },
      { dialect: '에지간히', standard: '어지간히', note: '적당히·웬만큼.' },
    ],
    endings: [
      { dialect: '~드래요', standard: '~더라고요', note: '전언·회상. "좋드래요."' },
      { dialect: '~래요', standard: '~래요/~다고요', note: '설명·전언. "간대요 → 간래요."' },
      { dialect: '~제', standard: '~지', note: '확인·다짐. "그라제."' },
      { dialect: '~ㅂ세', standard: '~ㅂ시다', note: '청유. "가봅세."' },
      { dialect: '~나', standard: '~냐(의문)', note: '"밥 먹었나?"' },
      { dialect: '~잼', standard: '~자(청유)', note: '"같이 가잼."' },
      { dialect: '~게', standard: '~게/~지', note: '"이리 오게."' },
      { dialect: '~드만', standard: '~더구먼', note: '"좋드만."' },
      { dialect: '~ㄴ가배', standard: '~ㄴ가 봐', note: '추측. "왔는가배."' },
      { dialect: '~ㅆ소', standard: '~ㅆ소', note: '예사높임. "봤소."' },
      { dialect: '~우', standard: '~오/~요', note: '"그라우."' },
      { dialect: '~다이', standard: '~다(다짐)', note: '"잘 가다이."' },
    ],
    phrases: [
      { dialect: '마커 모여서 가자.', standard: '모두 모여서 가자.', note: '함께 떠날 때.' },
      { dialect: '안주 멀었나?', standard: '아직 멀었니?', note: '재촉.' },
      { dialect: '거기 데기 좋드래요.', standard: '거기 아주 좋더라고요.', note: '권유·소개.' },
      { dialect: '천상 우리가 해야제.', standard: '하는 수 없이 우리가 해야지.', note: '체념 섞인 결심.' },
      { dialect: '저나, 잠깐 이리 와 봐.', standard: '저기, 잠깐 이리 와 봐.', note: '머뭇거리며 부름.' },
      { dialect: '메께라, 깜짝 놀랐네.', standard: '어이쿠, 깜짝 놀랐네.', note: '놀람.' },
      { dialect: '비알이 가파라서 데기 힘들어.', standard: '비탈이 가팔라서 아주 힘들어.', note: '산길 묘사.' },
      { dialect: '에지간히 하고 들어가자.', standard: '어지간히 하고 들어가자.', note: '그만하자는 권유.' },
      { dialect: '올체는 곤드레가 잘 됐드만.', standard: '올해는 곤드레가 잘 됐더구먼.', note: '작황 이야기.' },
      { dialect: '같이 가봅세, 어여.', standard: '같이 갑시다, 어서.', note: '청유.' },
    ],
  },
  {
    key: 'jeju', label: '제주', icon: '🌴',
    features: [
      '고유 어휘와 옛 모음(아래아 ㆍ 흔적)이 남아 표준어와 차이가 가장 크다.',
      '"~수다/~우다"로 높임을, "~ㄴ게/~게"로 다짐을 맺는다.',
      '의문은 "~과/~꽈"로 정중히, "~디/~ㄴ디"로 친근히 맺는다.',
      '바다·바람·돌 문화에서 온 살림 어휘가 풍부하다.',
    ],
    words: [
      { dialect: '혼저', standard: '어서', note: '"혼저 옵서(어서 오세요)".' },
      { dialect: '옵서', standard: '오세요', note: '맞이하는 말.' },
      { dialect: '폭삭 속았수다', standard: '정말 수고하셨습니다', note: '깊은 감사·위로의 인사.' },
      { dialect: '하르방', standard: '할아버지', note: '돌하르방의 그 하르방.' },
      { dialect: '할망', standard: '할머니', note: '나이 든 여성.' },
      { dialect: '아방', standard: '아버지', note: '제주 친족어.' },
      { dialect: '어멍', standard: '어머니', note: '제주 친족어.' },
      { dialect: '괸당', standard: '친척, 일가', note: '제주 공동체의 핵심인 친족.' },
      { dialect: '몬딱', standard: '모두, 전부', note: '"몬딱 먹읍서".' },
      { dialect: '게메', standard: '글쎄, 그러게', note: '맞장구·동의.' },
      { dialect: '무사', standard: '왜', note: '"무사 경 햄시?(왜 그래?)".' },
      { dialect: '경', standard: '그렇게', note: '"경 허지 말라".' },
      { dialect: '이추룩', standard: '이렇게', note: '경추룩(그렇게)와 짝.' },
      { dialect: '하영', standard: '많이', note: '"하영 먹읍서".' },
      { dialect: '오몽', standard: '움직임, 거동', note: '"오몽도 못 한다".' },
      { dialect: '식게', standard: '제사', note: '집안 제사.' },
      { dialect: '비바리', standard: '처녀, 젊은 여자', note: '제주 여성을 이르는 말.' },
      { dialect: '냉바리', standard: '결혼한 여자', note: '비바리와 짝.' },
      { dialect: '지꺼지다', standard: '기뻐하다, 신나다', note: '"막 지꺼졈수다".' },
      { dialect: '맨도롱', standard: '따뜻함, 알맞게 데움', note: '"맨도롱 또똣(따뜻)".' },
    ],
    endings: [
      { dialect: '~수다', standard: '~습니다', note: '높임. "속았수다.", "감수다(갑니다)".' },
      { dialect: '~우다', standard: '~ㅂ니다', note: '높임. "맞우다."' },
      { dialect: '~ㄴ게', standard: '~ㄴ걸/~네', note: '다짐·감탄. "좋은게."' },
      { dialect: '~게', standard: '~지/~자', note: '"가게(가자)."' },
      { dialect: '~과/~꽈', standard: '~까(정중 의문)', note: '"어디 감과?(어디 가십니까?)".' },
      { dialect: '~디', standard: '~니/~어(친근 의문)', note: '"밥 먹언디?(밥 먹었니?)".' },
      { dialect: '~ㄴ디', standard: '~는데', note: '"좋안디(좋은데)".' },
      { dialect: '~ㅁ시?', standard: '~고 있니?(진행)', note: '"뭐 햄시?(뭐 하니?)".' },
      { dialect: '~ㅂ서', standard: '~세요(높임 명령)', note: '"앚읍서(앉으세요)".' },
      { dialect: '~서', standard: '~어/~게(청유)', note: '"먹읍서."' },
      { dialect: '~ㄴ생이여', standard: '~ㄴ가 봐', note: '추측. "온 생이여(오나 봐)".' },
      { dialect: '~라', standard: '~다(단정)', note: '"경 한 거라."' },
    ],
    phrases: [
      { dialect: '혼저 옵서, 폭삭 속았수다.', standard: '어서 오세요, 정말 수고하셨습니다.', note: '맞이하며 위로하는 인사.' },
      { dialect: '무사 경 햄시?', standard: '왜 그렇게 해/그러니?', note: '까닭을 물음.' },
      { dialect: '하영 먹읍서, 몬딱 드릴게.', standard: '많이 드세요, 전부 드릴게요.', note: '음식 대접.' },
      { dialect: '게메, 나도 경 생각햄수다.', standard: '그러게, 나도 그렇게 생각해요.', note: '맞장구.' },
      { dialect: '어디 감과?', standard: '어디 가십니까?', note: '정중한 의문.' },
      { dialect: '뭐 햄시? 같이 가게.', standard: '뭐 하니? 같이 가자.', note: '친근한 청유.' },
      { dialect: '경 허지 말앙 이추룩 헙서.', standard: '그렇게 하지 말고 이렇게 하세요.', note: '권유.' },
      { dialect: '맨도롱 또똣할 때 먹읍서.', standard: '따뜻할 때 드세요.', note: '음식 권함.' },
      { dialect: '괸당끼리 식게 모영 모였수다.', standard: '친척끼리 제사 모셔 모였습니다.', note: '집안 행사 설명.' },
      { dialect: '막 지꺼졈수다.', standard: '정말 신나요/기뻐요.', note: '기쁨 표현.' },
    ],
  },
  {
    key: 'bukhan', label: '북한·이북', icon: '❄️',
    features: [
      '표준어를 "문화어"라 하며 두음법칙을 적용하지 않는다(리, 로동, 녀자).',
      '한자어 대신 다듬은 고유어 어휘가 많다(얼음보숭이=아이스크림 등, 다만 실생활어는 다양).',
      '함경·평안·황해 사투리가 바탕에 깔려 억양이 세고 끝을 눌러 맺는다.',
      '구호·다짐조의 단정적 말투, "~ㅁ다/~수다" 류 종결이 두드러진다.',
    ],
    words: [
      { dialect: '일없습니다', standard: '괜찮습니다', note: '사양·안심의 대표 표현.' },
      { dialect: '동무', standard: '친구, 동료', note: '벗·동료를 두루 이름(체제어로도 쓰임).' },
      { dialect: '인차', standard: '곧, 이내', note: '"인차 가갓습니다".' },
      { dialect: '에미나이', standard: '계집아이, 여자', note: '함경 방언, 거칠게 들릴 수 있음.' },
      { dialect: '간나', standard: '계집아이(거친 말)', note: '낮춤·욕설로도 쓰임.' },
      { dialect: '바쁘다', standard: '힘들다, 어렵다', note: '북에서는 "어렵다"의 뜻으로도 폭넓게 씀.' },
      { dialect: '망탕', standard: '마구, 함부로', note: '"망탕 쓰지 말라".' },
      { dialect: '게사니', standard: '거위', note: '가축 이름.' },
      { dialect: '마사지다', standard: '부서지다, 망가지다', note: '"기게가 마사졌소".' },
      { dialect: '눅다', standard: '값이 싸다', note: '"값이 눅다".' },
      { dialect: '발쪽하다', standard: '뾰족하다', note: '끝이 뾰족함.' },
      { dialect: '가마치', standard: '누룽지', note: '솥 바닥 눌은밥.' },
      { dialect: '곽밥', standard: '도시락', note: '곽(통)에 담은 밥.' },
      { dialect: '록화기', standard: '비디오, 녹화기', note: '두음법칙 미적용.' },
      { dialect: '단고기', standard: '개고기', note: '다듬은 말.' },
      { dialect: '나스다', standard: '나서다, 앞장서다', note: '"앞에 나스라".' },
      { dialect: '메기다', standard: '먹이다', note: '발음 변형.' },
      { dialect: '강냉이', standard: '옥수수', note: '강원·이북 공유 어휘.' },
      { dialect: '눈썹달', standard: '초승달', note: '다듬은 표현.' },
      { dialect: '비지깨', standard: '성냥', note: '함경 방언(외래어 차용).' },
    ],
    endings: [
      { dialect: '~ㅁ다/~ㅂ니다', standard: '~ㅂ니다(강한 단정)', note: '"가갓슴다(가겠습니다)".' },
      { dialect: '~갓다', standard: '~겠다', note: '의지·추측. "하갓다."' },
      { dialect: '~수다', standard: '~소/~습니다', note: '"고맙수다."' },
      { dialect: '~ㄴ다요/~다요', standard: '~다고요', note: '강조 전언. "맞다요."' },
      { dialect: '~디요', standard: '~지요', note: '평안 방언. "그렇디요."' },
      { dialect: '~ㅁ까/~ㅂ니까', standard: '~ㅂ니까', note: '"어디 감까?"' },
      { dialect: '~라요', standard: '~라고요', note: '"빨리 오라요."' },
      { dialect: '~소', standard: '~소/~오', note: '"잘 가소."' },
      { dialect: '~으꺼니/~으꺼이', standard: '~으니까', note: '함경 방언. "가꺼니."' },
      { dialect: '~네', standard: '~네/~지(다짐)', note: '"그렇네."' },
      { dialect: '~당', standard: '~다(다짐)', note: '"좋당."' },
      { dialect: '~ㄹ라', standard: '~려고/~ㄹ게', note: '"가갓을라."' },
    ],
    phrases: [
      { dialect: '일없습니다, 신경 쓰지 마시라요.', standard: '괜찮습니다, 신경 쓰지 마세요.', note: '사양.' },
      { dialect: '동무, 인차 갑시다.', standard: '친구, 곧 갑시다.', note: '재촉.' },
      { dialect: '이거 값이 눅구만요.', standard: '이거 값이 싸네요.', note: '흥정·감탄.' },
      { dialect: '망탕 쓰지 말고 아껴 쓰라.', standard: '함부로 쓰지 말고 아껴 써라.', note: '당부.' },
      { dialect: '곽밥 싸 왔으니 같이 먹읍시다.', standard: '도시락 싸 왔으니 같이 먹읍시다.', note: '권유.' },
      { dialect: '기게가 마사져서 바쁘게 됐소.', standard: '기계가 망가져서 곤란하게 됐소.', note: '난처함.' },
      { dialect: '빨리 오라요, 늦갓습니다.', standard: '빨리 오라고요, 늦겠습니다.', note: '재촉.' },
      { dialect: '그렇디요, 내 말이 맞디요.', standard: '그렇지요, 내 말이 맞지요.', note: '확인.' },
      { dialect: '앞에 나스라, 동무가 책임지라.', standard: '앞에 나서라, 자네가 책임져라.', note: '명령조.' },
      { dialect: '고맙수다, 잘 가소.', standard: '고맙습니다, 잘 가요.', note: '작별 인사.' },
    ],
  },
]

const KIND_LABEL: Record<Kind, string> = { word: '어휘', ending: '어미·말끝', phrase: '예문(대사)' }
const KIND_ICON: Record<Kind, string> = { word: '🔤', ending: '〽️', phrase: '💬' }
const KINDS: Kind[] = ['word', 'ending', 'phrase']

const LS = 'sry:tool:dialect-ref:'
const ALL = '__all__'

interface Row { region: RegionDef; kind: Kind; item: Entry }
const entriesOf = (r: RegionDef, k: Kind): Entry[] => (k === 'word' ? r.words : k === 'ending' ? r.endings : r.phrases)
const rowsOfRegion = (r: RegionDef): Row[] =>
  KINDS.flatMap((k) => entriesOf(r, k).map((item) => ({ region: r, kind: k, item })))
const flatAll = (): Row[] => REGIONS.flatMap(rowsOfRegion)

export default function DialectRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.region 으로 특정 지역을 펼쳐 열 수 있게(연계 진입)
  const initialRegion = typeof payload?.region === 'string' && REGIONS.some((r) => r.key === payload.region)
    ? (payload.region as string) : ALL

  const [query, setQuery] = useState('')
  const [region, setRegion] = useState<string>(() => {
    if (initialRegion !== ALL) return initialRegion
    try { const raw = localStorage.getItem(LS + 'region'); if (raw && (raw === ALL || REGIONS.some((r) => r.key === raw))) return raw } catch { /* ignore */ }
    return ALL
  })
  const [kind, setKind] = useState<Kind | 'all'>(() => {
    try { const raw = localStorage.getItem(LS + 'kind'); if (raw === 'word' || raw === 'ending' || raw === 'phrase' || raw === 'all') return raw } catch { /* ignore */ }
    return 'all'
  })
  // 펼친 지역 카드(아코디언). 빈 객체면 모두 접힘.
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try { const raw = localStorage.getItem(LS + 'open'); if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> } } catch { /* ignore */ }
    return initialRegion !== ALL ? { [initialRegion]: true } : { gyeongsang: true }
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
  useEffect(() => { try { localStorage.setItem(LS + 'region', region) } catch { /* ignore */ } }, [region])
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

  const total = useMemo(() => REGIONS.reduce((n, r) => n + r.words.length + r.endings.length + r.phrases.length, 0), [])

  const favKey = (rk: string, k: Kind, dialect: string) => `${rk}::${k}::${dialect}`

  // 검색·필터가 적용되기 전의 풀(무작위 뽑기 공용)
  const pool = useMemo(() => {
    let base = region === ALL ? flatAll() : (REGIONS.find((r) => r.key === region) ? rowsOfRegion(REGIONS.find((r) => r.key === region)!) : [])
    if (kind !== 'all') base = base.filter((r) => r.kind === kind)
    if (onlyFav) base = base.filter((r) => favs[favKey(r.region.key, r.kind, r.item.dialect)])
    return base
  }, [region, kind, onlyFav, favs])

  const q = query.trim().toLowerCase()
  const matches = useCallback((r: Row): boolean => {
    if (!q) return true
    return r.item.dialect.toLowerCase().includes(q)
      || r.item.standard.toLowerCase().includes(q)
      || (r.item.note ? r.item.note.toLowerCase().includes(q) : false)
  }, [q])

  // 지역별로 그룹핑된 표시 데이터(검색·필터 적용)
  const grouped = useMemo(() => {
    return REGIONS.map((r) => {
      if (region !== ALL && region !== r.key) return { region: r, rows: [] as Row[] }
      let rows = rowsOfRegion(r)
      if (kind !== 'all') rows = rows.filter((x) => x.kind === kind)
      if (onlyFav) rows = rows.filter((x) => favs[favKey(r.key, x.kind, x.item.dialect)])
      rows = rows.filter(matches)
      return { region: r, rows }
    }).filter((g) => g.rows.length > 0 || (region !== ALL && region === g.region.key))
  }, [region, kind, onlyFav, favs, matches])

  const shownCount = useMemo(() => grouped.reduce((n, g) => n + g.rows.length, 0), [grouped])

  const toggleOpen = (rk: string) => setOpen((prev) => ({ ...prev, [rk]: !prev[rk] }))
  const expandAll = () => setOpen(Object.fromEntries(REGIONS.map((r) => [r.key, true])))
  const collapseAll = () => setOpen({})

  const rollRandom = useCallback(() => {
    if (!pool.length) { setRandom(null); flashToast('뽑을 표현이 없습니다. 필터를 풀어 보세요.'); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.dialect === prev.item.dialect && pick.region.key === prev.region.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      // 뽑힌 지역 카드를 펼쳐 둠
      setOpen((o) => (o[pick.region.key] ? o : { ...o, [pick.region.key]: true }))
      return pick
    })
  }, [pool])

  const toggleFav = (rk: string, k: Kind, dialect: string) => {
    const fk = favKey(rk, k, dialect)
    setFavs((prev) => { const next = { ...prev }; if (next[fk]) delete next[fk]; else next[fk] = true; return next })
  }

  const flashToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  // 복사용 한 줄(방언 — 표준어 / 뜻)
  const plainOf = (r: Row): string => {
    const base = `${r.item.dialect} — ${r.item.standard}`
    return r.item.note ? `${base} (${r.item.note})` : base
  }

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
    addToStash({ kind: 'note', label: `방언(${r.region.label}·${KIND_LABEL[r.kind]})`, text: plainOf(r) })
    flashToast(`수집함에 담았습니다 — “${r.item.dialect}”`)
  }
  // [연계 2] 공유 스니펫 라이브러리에 저장
  const saveSnippet = (r: Row) => {
    addToLibrary('snippets', { text: plainOf(r), source: `방언 표현 사전 (${r.region.label})`, tags: [r.region.label, KIND_LABEL[r.kind]] })
    flashToast(`스니펫으로 저장했습니다 — “${r.item.dialect}”`)
  }
  // [연계 3] 프로젝트 자료 〈방언 노트〉 폴더에 추가
  const addRowToProject = (r: Row) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(r.region.icon + ' ' + r.region.label + ' 방언 · ' + KIND_LABEL[r.kind])}</b></p>`,
      `<p><b>${escapeHtml(r.item.dialect)}</b> = ${escapeHtml(r.item.standard)}</p>`,
      r.item.note ? `<p>${escapeHtml(r.item.note)}</p>` : '',
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '방언 노트', title: `${r.item.dialect} (${r.region.label})`, bodyHtml })
    if (id) flashToast(`프로젝트 자료 〈방언 노트〉에 “${r.item.dialect}”를 추가했습니다.`)
  }
  // 지역 전체(어휘/어미/예문)를 한 문서로 프로젝트에 추가
  const addRegionToProject = (rg: RegionDef) => {
    if (!hasProjectBridge()) return
    const sec = (k: Kind) => {
      const rows = entriesOf(rg, k)
      const lis = rows.map((e) => `<li><b>${escapeHtml(e.dialect)}</b> = ${escapeHtml(e.standard)}${e.note ? ` — ${escapeHtml(e.note)}` : ''}</li>`).join('')
      return `<p><b>${escapeHtml(KIND_ICON[k] + ' ' + KIND_LABEL[k])}</b></p><ul>${lis}</ul>`
    }
    const feats = `<p><b>억양·말투 특징</b></p><ul>${rg.features.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>`
    const bodyHtml = `<p><b>${escapeHtml(rg.icon + ' ' + rg.label + ' 방언')}</b></p>` + feats + sec('word') + sec('ending') + sec('phrase')
    const id = addToProject({ kind: 'text', root: 'research', folder: '방언 노트', title: `${rg.label} 방언 정리`, bodyHtml })
    if (id) flashToast(`프로젝트 자료 〈방언 노트〉에 〈${rg.label} 방언 정리〉를 추가했습니다.`)
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10 }
  const chip = (on: boolean): React.CSSProperties => ({ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' })

  const renderRow = (r: Row) => {
    const fk = favKey(r.region.key, r.kind, r.item.dialect)
    const isFav = !!favs[fk]
    const cid = 'item:' + fk
    return (
      <div key={fk} style={{ ...card, padding: '9px 11px', background: 'var(--paper)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={KIND_ICON[r.kind]}/> {KIND_LABEL[r.kind]}</span>
          <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(r.region.key, r.kind, r.item.dialect)} style={{ marginLeft: 'auto', flexShrink: 0, ...chip(isFav) }}>{isFav ? '★' : '☆'}</button>
        </div>
        <div style={{ marginTop: 5, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{r.item.dialect}</span>
          <span style={{ color: 'var(--muted)' }}>↔</span>
          <span style={{ fontSize: 14, color: 'var(--ok)' }}>{r.item.standard}</span>
        </div>
        {r.item.note && <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 4, color: 'var(--muted)' }}>{r.item.note}</div>}
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <button className="minibtn" onClick={() => copy(plainOf(r), cid)}>{copiedKey === cid ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
          {hasStash() && <button className="linkbtn" onClick={() => sendToStash(r)} title="플로팅 수집함에 담기"><Emoji e="📎"/> 수집함</button>}
          <button className="linkbtn" onClick={() => saveSnippet(r)} title="공유 스니펫 라이브러리에 저장"><Emoji e="✂️"/> 스니펫</button>
          {hasProjectBridge() && <button className="linkbtn" onClick={() => addRowToProject(r)} title="프로젝트 자료 〈방언 노트〉에 추가"><Emoji e="📄"/> 프로젝트</button>}
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={hint}>
        경상·전라·충청·강원·제주·북한 방언 표현 <b>{total}개</b>를 표준어와 대조해 모았습니다(어휘·어미·예문). 지역을 펼쳐 보고, 클릭해 복사하거나 대사·말투 설정에 바로 쓰세요.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="방언·표준어·뜻으로 검색 (예: 거시기, 일없다, 혼저, ~유)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 지역 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setRegion(ALL)} aria-pressed={region === ALL} style={chip(region === ALL)}><Emoji e="✨"/> 전체</button>
        {REGIONS.map((r) => (
          <button key={r.key} className="minibtn" onClick={() => setRegion(r.key)} aria-pressed={region === r.key} style={chip(region === r.key)}><Emoji e={r.icon}/> {r.label}</button>
        ))}
      </div>

      {/* 종류 필터 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={() => setKind('all')} aria-pressed={kind === 'all'} style={chip(kind === 'all')}><Emoji e="📚"/> 전체</button>
        {KINDS.map((k) => (
          <button key={k} className="minibtn" onClick={() => setKind(k)} aria-pressed={kind === k} style={chip(kind === k)}><Emoji e={KIND_ICON[k]}/> {KIND_LABEL[k]}</button>
        ))}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 무작위 표현</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav} style={chip(onlyFav)}>{onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}</button>
        <button className="minibtn" onClick={expandAll}>⊞ 모두 펼치기</button>
        <button className="minibtn" onClick={collapseAll}>⊟ 모두 접기</button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{shownCount}개 표시</span>
      </div>

      {/* 무작위 결과 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.region.icon}/> {random.region.label} · <Emoji e={KIND_ICON[random.kind]}/> {KIND_LABEL[random.kind]}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ margin: '6px 0 2px', display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{random.item.dialect}</span>
            <span style={{ color: 'var(--muted)' }}>↔</span>
            <span style={{ fontSize: 15, color: 'var(--ok)' }}>{random.item.standard}</span>
          </div>
          {random.item.note && <div style={{ fontSize: 13, lineHeight: 1.55, margin: '4px 0 8px', color: 'var(--muted)' }}>{random.item.note}</div>}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(plainOf(random), 'rand')}>{copiedKey === 'rand' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
            <button className="minibtn" onClick={() => toggleFav(random.region.key, random.kind, random.item.dialect)}>{favs[favKey(random.region.key, random.kind, random.item.dialect)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}</button>
            <button className="minibtn" onClick={rollRandom}><Emoji e="🎲"/> 다시</button>
          </div>
          {/* 연계 4종 */}
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            {hasStash() && <button className="linkbtn" onClick={() => sendToStash(random)} title="플로팅 수집함에 담기"><Emoji e="📎"/> 수집함</button>}
            <button className="linkbtn" onClick={() => saveSnippet(random)} title="공유 스니펫 라이브러리에 저장"><Emoji e="✂️"/> 스니펫 저장</button>
            <button className="linkbtn" onClick={() => addRowToProject(random)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈방언 노트〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
            <button className="linkbtn" onClick={() => openToolLinked('filler-word-ko')} title="관련 도구: 한국어 군말·입버릇 사전 열기"><Emoji e="🔗"/> 입버릇 사전</button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5 }}>✓ {toast}</div>
      )}

      {/* 지역별 아코디언 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
        {grouped.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 표현이 없습니다. 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          grouped.map((g) => {
            const rg = g.region
            const isOpen = !!open[rg.key]
            return (
              <div key={rg.key} style={card}>
                {/* 지역 헤더(펼침/접기) */}
                <button
                  onClick={() => toggleOpen(rg.key)}
                  aria-expanded={isOpen}
                  style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 9 }}
                >
                  <span style={{ fontSize: 18 }}><Emoji e={rg.icon}/></span>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{rg.label} 방언</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{g.rows.length}개</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 13 }}>{isOpen ? '▾' : '▸'}</span>
                </button>

                {isOpen && (
                  <div style={{ padding: '0 13px 13px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {/* 억양·말투 특징 */}
                    <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 5 }}><Emoji e="🎙️"/> 억양·말투 특징</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6, color: 'var(--muted)' }}>
                        {rg.features.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                      {hasProjectBridge() && (
                        <div style={{ marginTop: 8 }}>
                          <button className="linkbtn" onClick={() => addRegionToProject(rg)} title="이 지역 방언 전체(특징·어휘·어미·예문)를 한 문서로 프로젝트에 추가"><Emoji e="📄"/> 이 지역 통째로 프로젝트에 추가</button>
                        </div>
                      )}
                    </div>
                    {/* 표현 목록 */}
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
        수록 방언·표준어 대조와 예문·풀이는 모두 직접 작성한 자작 데이터입니다. 방언은 지역 공동체가 오래 써 온 말이며, 대조·뉘앙스 설명은 창작 표현입니다.
        <span className="license-badge" style={{ marginLeft: 6 }}>자작 데이터</span>
      </div>
    </div>
  )
}
