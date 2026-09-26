// 점술·예언 방식 사전 — 점성·타로·주역·점복·해몽·신탁 등 세계의 점술 방식·도구·해석 관습을
// 자작 데이터로 정리. 예언 플롯·운명 모티프·신비 분위기 소재로 바로 쓰도록 검색·무작위·복사 +
// 수집함/프로젝트/스니펫/예언 생성기 연계.
// react 와 './linkbus' 외 import 없음. 외부 네트워크·미디어·키 불필요. 모두 로컬(자작 텍스트).
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  addToStash,
  addToProject, hasProjectBridge,
  addToLibrary,
  openToolLinked,
  Emoji,
} from './linkbus'

export const meta = {
  id: 'divination-ref',
  name: '점술·예언 방식 사전',
  icon: '🔮',
  group: '리서치·자료',
  intro: '점성·타로·주역·점복·해몽·신탁 등 점술 방식·도구·해석 관습을 찾아 예언 플롯에 심으세요',
  w: 680,
  h: 620,
}

// ---------- 데이터 모델 ----------
interface Method {
  name: string           // 한국어 이름
  alias?: string         // 별칭/원어 음차(검색 보조)
  origin: string         // 기원·전승 지역/시대(자작 요약)
  how: string            // 점치는 방법·절차(자작 요약)
  tools: string[]        // 사용하는 도구·매개물
  reading: string        // 해석 관습·길흉을 읽는 법(자작 요약)
  omen: '길조 중심' | '흉조 중심' | '양면' | '중립·해석형'  // 결과의 성향
  staging: string        // 예언 플롯·장면 연출 아이디어(자작)
}
interface CatDef { key: string; label: string; icon: string; note: string; items: Method[] }

// ---------- 자작 사전: 8개 카테고리, 합계 90+ 항목 ----------
const CATS: CatDef[] = [
  {
    key: 'astro', label: '천문·역법 점성', icon: '🌌', note: '하늘의 운행에서 운명을 읽다',
    items: [
      { name: '서양 점성술', alias: '호로스코프·astrology', origin: '고대 메소포타미아의 천체 관측에서 비롯해 그리스·중세를 거쳐 체계화된 별점 전통.', how: '태어난 순간 하늘에 떠 있던 행성·별자리의 위치를 출생 차트(천궁도)로 그려, 12궁과 행성의 각도(어스펙트)를 풀이한다.', tools: ['천궁도(차트)', '천체력', '12별자리', '행성 기호'], reading: '태양·달·상승궁의 삼각으로 기본 성격을 읽고, 행성의 각도와 하우스로 사랑·일·운세의 흐름을 본다. 길흉보다 "경향"을 읽는다.', omen: '중립·해석형', staging: '인물이 태어난 시각이 기록에 없어 점성가가 끝내 차트를 완성하지 못하는 설정으로, "운명을 알 수 없는 자"라는 미스터리를 깐다.' },
      { name: '점성 흉조 관측', alias: '혜성·일식 점', origin: '동서양 모두에서 별의 이상 현상을 왕조의 길흉으로 본 천문 점성 전통.', how: '혜성·일식·유성·행성의 역행 같은 비정상적 천문 현상을 관측해 전쟁·역병·군주의 죽음 같은 큰 사건의 전조로 해석한다.', tools: ['관상감의 기록', '혜성', '일식', '천변(天變) 보고서'], reading: '밝은 별이 흐려지거나 혜성이 특정 방위에 나타나면 그 방위의 나라·인물에 흉사가 든다고 본다. 거의 흉조로 읽힌다.', omen: '흉조 중심', staging: '하늘에 붉은 혜성이 떠오르자 궁정이 동요하고, 왕이 그 전조를 막으려 무고한 자를 제물 삼는 비극의 도화선으로 쓴다.' },
      { name: '사주명리', alias: '팔자·四柱', origin: '동아시아에서 음양오행 이론을 바탕으로 발전한 생년월일시 운명학.', how: '태어난 해·달·날·시를 각각 천간과 지지의 두 글자로 적어 여덟 글자(사주팔자)를 세우고, 오행의 상생·상극으로 운명을 푼다.', tools: ['간지(干支)', '오행', '만세력', '대운표'], reading: '오행이 한쪽으로 치우치면 그것이 약점이자 과제가 되고, 십 년 단위의 대운으로 인생의 큰 흐름을 읽는다. 타고난 그릇을 본다.', omen: '중립·해석형', staging: '명리가가 인물의 사주를 보고 "이 아이는 마흔 살을 넘기기 어렵다"고 단언하게 해, 그 한마디가 평생을 옭아매는 운명의 저주처럼 작동하게 한다.' },
      { name: '자미두수', alias: '紫微斗數', origin: '동아시아에서 별자리를 인생의 열두 영역에 배치해 보는 명운학.', how: '생년월일시로 명반(命盤)을 만들어 자미성을 비롯한 여러 별을 열두 궁(명궁·재백궁·부처궁 등)에 배치하고 그 조합을 읽는다.', tools: ['명반(命盤)', '주성·보좌성', '십이궁'], reading: '어느 별이 어느 궁에 들었는지로 재물·배우자·자녀·관록 등 삶의 각 영역을 세밀하게 풀이한다. 분야별로 길흉이 갈린다.', omen: '양면', staging: '명반을 본 점술가가 "재물 궁은 빛나나 부부 궁은 비었다"고 말해, 부와 사랑을 동시에 가질 수 없는 인물의 딜레마를 예고한다.' },
      { name: '베다 점성술', alias: '죠티시·인도 점성', origin: '고대 인도의 베다 전통에서 비롯한 별점 체계.', how: '서양과 달리 항성을 기준으로 한 황도대를 쓰고, 달이 머무는 별자리(낙샤트라)와 행성의 시기(다샤)를 함께 풀이한다.', tools: ['라시 차트', '낙샤트라', '다샤 주기', '행성 시간'], reading: '전생의 업(카르마)이 이번 생의 별자리로 드러난다고 보아, 현재의 고난을 과거 행위의 결과로 해석한다.', omen: '중립·해석형', staging: '결혼을 앞둔 두 사람의 별자리를 맞춰 보니 "전생의 빚"이 얽혀 있다는 풀이를 넣어, 운명적 끌림과 불길함을 동시에 깐다.' },
      { name: '월령·태세 점', alias: '달과 절기 점', origin: '농경 사회에서 달의 차고 기욺과 절기로 길일을 가린 역법 점복.', how: '달이 차오르는지 기우는지, 어느 절기·간지의 날인지로 혼례·이사·파종·출항 같은 일의 길일과 흉일을 정한다.', tools: ['책력(달력)', '달의 위상', '이십사절기', '손 없는 날'], reading: '달이 차는 시기는 시작과 번성에, 기우는 시기는 마무리·정리에 길하다고 본다. 일의 종류마다 길일이 다르다.', omen: '양면', staging: '집안 어른이 "이 달에는 혼인을 올리면 안 된다"고 막는데도 강행한 혼례가 어긋나기 시작해, 무시한 점괘가 차츰 들어맞는 구조를 만든다.' },
    ],
  },
  {
    key: 'card', label: '카드·점패', icon: '🃏', note: '뽑아 펼친 그림에서 길을 읽다',
    items: [
      { name: '타로', alias: 'tarot', origin: '중세 유럽의 카드놀이에서 출발해 점술로 발전한 78장의 그림 카드 체계.', how: '질문을 마음에 품고 카드를 섞은 뒤 일정한 자리(스프레드)에 펼쳐, 각 자리에 놓인 카드의 그림과 정·역방향을 읽는다.', tools: ['메이저 아르카나 22장', '마이너 아르카나 56장', '스프레드 천', '컵·검·지팡이·동전'], reading: '같은 카드라도 놓인 자리(과거·현재·미래 등)와 정·역방향에 따라 뜻이 뒤집힌다. "죽음" 카드가 끝과 새 시작을 함께 뜻하듯 상징적으로 읽는다.', omen: '양면', staging: '점술가가 마지막 한 장을 뒤집기 직전에 누군가 들이닥쳐, 끝내 보지 못한 그 카드가 무엇이었을지가 이야기 내내 독자를 사로잡게 한다.' },
      { name: '오라클 카드', alias: 'oracle deck', origin: '근현대에 등장한, 정해진 장수·규칙이 없는 자유로운 메시지 카드.', how: '타로와 달리 덱마다 그림과 장수가 제각각이며, 한 장을 뽑아 그 위에 적힌 짧은 문구나 상징을 그날의 지침으로 삼는다.', tools: ['그림 카드', '키워드 문구', '안내서'], reading: '엄격한 규칙보다 직관과 첫인상을 중시한다. 뽑힌 한 장의 단어가 곧 오늘의 화두가 된다.', omen: '길조 중심', staging: '매일 아침 한 장씩 뽑아 일기 옆에 적던 인물이, 어느 날 같은 카드만 사흘째 나오자 그것을 운명의 신호로 받아들이게 한다.' },
      { name: '윷점', alias: '윷괘', origin: '한국 정초에 윷을 던져 한 해 운수를 보던 세시 점복.', how: '윷을 세 번 던져 나온 도·개·걸·윷·모의 조합으로 64괘 또는 정해진 점사(占辭)를 찾아 한 해의 길흉을 읽는다.', tools: ['윷가락 네 개', '윷점풀이(점괘 책)'], reading: '나온 조합마다 "쥐가 곳간에 든다", "어린아이가 어미를 만난다" 같은 짧은 비유 점사가 붙어 있어 그 뜻을 새긴다.', omen: '양면', staging: '정월 대보름에 마을 사람들이 돌아가며 윷점을 보는데, 유독 한 사람만 흉한 점사가 나와 좌중이 침묵하는 장면으로 불길을 깐다.' },
      { name: '척전(擲錢)', alias: '동전 점·엽전점', origin: '동아시아에서 동전을 던져 앞뒤로 길흉을 가린 간이 점법.', how: '동전 몇 닢을 던져 앞면·뒷면의 조합을 보거나, 세 닢을 여섯 번 던져 주역의 괘를 세우는 데 쓴다.', tools: ['엽전·동전 세 닢', '점통', '주역 본문(괘 풀이용)'], reading: '앞면(양)과 뒷면(음)의 수를 헤아려 효(爻)를 정하고, 그것을 쌓아 괘를 만들어 의미를 읽는다. 즉석에서 가볍게 묻기 좋다.', omen: '중립·해석형', staging: '큰 결정을 앞둔 인물이 "앞면이 나오면 떠난다"며 동전을 던지는데, 그 동전이 세워진 채로 멈추는 기묘한 장면으로 운명의 유보를 그린다.' },
      { name: '뽑기 점·제비', alias: '제비뽑기·추첨 점', origin: '여러 문화에서 신의 뜻을 우연에 맡겨 묻던 가장 오래된 점법의 하나.', how: '번호나 글귀를 적은 제비·산가지·막대를 통에 넣고 흔들어 하나를 뽑아, 그 위의 풀이를 신탁으로 받아들인다.', tools: ['제비·산가지', '점통', '풀이 책', '봉인된 쪽지'], reading: '뽑힌 제비에 적힌 등급(대길·중길·소길·흉 등)과 짧은 시구로 길흉을 가린다. 우연 자체를 신의 선택으로 본다.', omen: '양면', staging: '신전에서 누구도 거역 못 할 제비뽑기로 제물을 정하는데, 조작된 통에서 주인공의 제비만 나오도록 누군가 손을 써 둔 음모를 숨긴다.' },
      { name: '룬 점', alias: '룬스톤·rune', origin: '북유럽 게르만 문화에서 룬 문자를 새긴 돌·나뭇조각으로 본 점법.', how: '룬 문자를 새긴 돌이나 나뭇조각을 천 위에 던지거나 자루에서 뽑아, 나온 문자의 뜻과 방향으로 풀이한다.', tools: ['룬스톤 세트', '점치는 천', '가죽 자루'], reading: '각 룬은 재물·여행·보호·시련 같은 고유한 뜻을 지니며, 뒤집혀 나오면 그 의미가 막히거나 반대로 작동한다고 본다.', omen: '양면', staging: '전장에 나서기 전 룬을 던졌더니 "시련"과 "승리"의 돌이 포개져 나와, 이기되 큰 대가를 치른다는 모순된 예언을 만든다.' },
    ],
  },
  {
    key: 'iching', label: '괘·역(易)·산가지', icon: '☯', note: '음양의 기호로 변화를 읽다',
    items: [
      { name: '주역(역경)', alias: '시초점·周易', origin: '고대 중국에서 비롯한 64괘의 변화 철학이자 점법.', how: '시초(蓍草) 풀줄기 50개를 나누는 복잡한 절차를 여섯 번 반복해 효를 쌓아 본괘를 세우고, 변효가 있으면 변괘까지 읽는다.', tools: ['시초(점대) 50개', '64괘', '효사(爻辭)', '주역 본문'], reading: '본괘와 변괘, 변효의 효사를 함께 읽어 "지금 어떤 변화의 국면에 있는가"를 푼다. 단순 길흉이 아니라 처신의 도리를 묻는다.', omen: '중립·해석형', staging: '점대를 세던 노인이 같은 괘를 세 번 거듭 얻자 손을 떨며 "하늘이 거듭 말하면 거스를 수 없다"고 중얼거리는 장면으로 운명의 무게를 싣는다.' },
      { name: '산통점', alias: '산가지점·算筒', origin: '동아시아에서 산가지·점대를 통에 넣어 흔들던 거리 점복.', how: '번호 매긴 산가지를 점통에 넣고 흔들어 튀어나온 가지의 번호로 정해진 점괘(괘책)를 찾아 읽는다.', tools: ['점통', '산가지(점대)', '괘책(풀이 책)'], reading: '튀어나온 번호에 대응하는 시구·점사를 읽어 길흉을 가린다. 절차가 간단해 장터 점쟁이가 흔히 썼다.', omen: '양면', staging: '장터 점쟁이가 일부러 길한 가지만 나오게 통을 기울이는 손기술을 보여 줘, 예언의 신비와 사기의 경계를 흐린다.' },
      { name: '매화역수', alias: '梅花易數', origin: '주역을 즉석에서 응용한, 눈앞의 사물·숫자로 괘를 세우는 점법.', how: '시각·방위·들리는 소리·글자 획수 같은 우연한 수를 즉석에서 괘로 변환해, 묻지 않아도 다가오는 일을 미리 읽는다.', tools: ['주변 사물', '숫자·획수', '시간', '팔괘'], reading: '"매화나무 가지가 흔들리는 것을 보고 다음 일을 안다"는 식으로, 일상의 작은 징조를 괘로 옮겨 곧 일어날 일을 예측한다.', omen: '중립·해석형', staging: '도사가 새가 떨어뜨린 가지의 방향만 보고 "오늘 손님이 흉한 소식을 가져온다"고 맞혀, 모든 것이 징조로 읽히는 인물의 신통력을 부각한다.' },
      { name: '척괘·동전 육효', alias: '六爻·납갑', origin: '동전을 던져 주역의 효를 세우는, 점복용으로 정밀화된 역법.', how: '동전 세 닢을 여섯 번 던져 효를 쌓아 괘를 세우고, 각 효에 십이지·육친(부모·형제·관귀 등)을 붙여 구체적 사안을 짚는다.', tools: ['동전 세 닢', '육효 양식', '육친·십이지'], reading: '잃은 물건·소송·병세처럼 구체적 질문에 강하다. 어느 효가 움직이는지(동효)로 일의 성패와 시기를 읽는다.', omen: '양면', staging: '잃어버린 옥새의 행방을 육효로 짚어 "물가 북쪽, 검은 옷의 사람"이라 풀이하자, 그 모호한 단서를 좇는 추적극이 시작되게 한다.' },
      { name: '토정비결', alias: '土亭祕訣', origin: '한 해의 신수를 월별로 풀어 보던 한국의 세시 운세서 전통.', how: '생년월일을 정해진 수식으로 괘로 환산해, 그 괘에 적힌 일 년 열두 달의 신수 풀이를 차례로 읽는다.', tools: ['생년월일', '괘 산출표', '월별 비결 풀이'], reading: '"이 달엔 동쪽에 재물이 있다", "구설을 조심하라" 같은 월별 짧은 점사로 한 해 운수를 가른다. 새해 풍속에 가깝다.', omen: '양면', staging: '정초에 본 비결에 "오월에 큰 물을 조심하라"는 구절이 있어, 그 달이 다가올수록 인물이 물을 피해 다니다 도리어 화를 부르는 아이러니를 만든다.' },
    ],
  },
  {
    key: 'body', label: '관상·신체 점', icon: '🖐', note: '몸에 새겨진 운명을 읽다',
    items: [
      { name: '관상', alias: '면상·相術', origin: '동아시아에서 얼굴 생김으로 성품과 운명을 읽던 인상학.', how: '이마·눈썹·눈·코·입·귀와 얼굴의 삼정(상·중·하)을 살펴, 그 균형과 특징으로 부귀·수명·성정을 풀이한다.', tools: ['얼굴 부위(이목구비)', '삼정·오악', '점·주름·흉터'], reading: '코는 재물, 이마는 초년운, 턱은 말년운에 대응시키는 식으로 부위마다 의미를 둔다. 기색(낯빛)의 변화로 임박한 길흉도 본다.', omen: '양면', staging: '관상가가 인물을 보자마자 안색이 굳어 "그 상은 사람을 살리기도 죽이기도 하는 상"이라 말하고 떠나, 정체에 대한 불길한 복선을 남긴다.' },
      { name: '수상', alias: '손금·palmistry', origin: '동서양 모두에서 손바닥의 선과 모양으로 운명을 본 점법.', how: '생명선·감정선·두뇌선·운명선 등 손바닥의 주요 선과 언덕(구릉)의 솟음을 살펴 성격과 운세, 수명을 읽는다.', tools: ['손바닥 선', '손가락 모양', '손의 언덕', '돋보기'], reading: '선이 길고 또렷하면 그 영역이 강하고, 끊기거나 갈라지면 굴곡이 있다고 본다. 양손을 비교해 타고난 운과 닦은 운을 가른다.', omen: '양면', staging: '집시 점쟁이가 주인공의 손을 들여다보다 생명선이 도중에 뚝 끊긴 것을 보고 말없이 손을 놓아 버리는 장면으로 죽음의 그림자를 드리운다.' },
      { name: '골상·체상', alias: '骨相·체형 점', origin: '두개골의 형태나 체형으로 기질을 읽으려 한 옛 인상학.', how: '머리뼈의 융기와 패임, 어깨·허리·걸음걸이 같은 몸의 균형을 살펴 기질과 재능, 명운을 가늠한다.', tools: ['두상', '체형·골격', '걸음걸이'], reading: '뼈가 굵고 단단하면 기개가 있고, 걸음이 무거우면 운이 더디다는 식으로 본다. 오늘날엔 미신으로 여겨지나 옛 서사에 자주 등장한다.', omen: '중립·해석형', staging: '왕이 후계를 고를 때 골상가를 불러 왕자들의 뼈를 만지게 하는 장면으로, 능력이 아닌 미신으로 운명이 갈리는 부조리를 그린다.' },
      { name: '사마귀·점(痣) 풀이', alias: '복점·흉점', origin: '몸에 난 점·사마귀의 위치로 길흉을 가린 민간 점속.', how: '얼굴과 몸 어디에 점이 났는지, 그 빛깔과 크기가 어떤지를 정해진 풀이표에 맞춰 길한 점인지 흉한 점인지 가린다.', tools: ['점 위치도', '점의 빛깔·크기'], reading: '눈물점은 슬픔, 입가의 점은 재복, 발바닥의 점은 출세를 뜻한다는 식으로 본다. 감춰진 점일수록 길하다는 통념도 있다.', omen: '양면', staging: '주인공의 등에 숨겨진 붉은 점이 옛 예언에 나오는 "왕의 표식"과 일치한다는 것이 밝혀져, 평범한 인물의 정체가 뒤집히는 장치로 쓴다.' },
      { name: '필적·서체 점', alias: '필상·graphology', origin: '글씨의 모양으로 성품과 기질을 읽으려 한 근대 인상학.', how: '글자의 크기·기울기·필압·여백을 살펴 쓴 사람의 성격, 심리 상태, 숨긴 의도를 풀이한다.', tools: ['친필 문서', '서명', '필압·기울기'], reading: '글씨가 위로 올라가면 낙관적, 필압이 세면 격정적이라 보는 식이다. 떨리는 획에서 거짓이나 불안을 읽는다.', omen: '중립·해석형', staging: '협박 편지의 필체를 분석한 인물이 "이 글씨를 쓴 자는 곧 무너질 자"라 단언해, 추리와 점술의 경계를 흐리는 조연으로 쓴다.' },
    ],
  },
  {
    key: 'nature', label: '자연·동물 점복', icon: '🐦', note: '날씨·짐승·식물에서 징조를 읽다',
    items: [
      { name: '조점(鳥占)', alias: '새점·augury', origin: '고대 여러 문화에서 새의 비행·울음으로 신의 뜻을 읽던 점법.', how: '새가 나는 방향·높이·무리의 모양, 우는 소리와 횟수를 정해진 규칙에 맞춰 길흉으로 해석한다.', tools: ['하늘의 새', '새 우는 소리', '관측 지팡이(방위 구분용)'], reading: '오른쪽에서 날아오면 길하고 왼쪽이면 흉하다는 식으로 방위를 중시한다. 까마귀·올빼미의 울음은 대개 흉조로 읽힌다.', omen: '양면', staging: '출정 직전 새 떼가 진영 위를 거꾸로 돌자, 점관이 출정을 막으려 하지만 장군이 묵살하고 떠나 패배의 복선을 깐다.' },
      { name: '복점(卜占)·갑골', alias: '거북점·甲骨', origin: '고대 중국 상나라에서 거북 등딱지·짐승 뼈를 태워 본 가장 오래된 동아시아 점법.', how: '거북 배딱지나 소뼈에 홈을 파고 불에 지져, 갈라진 금(조兆)의 모양과 방향으로 길흉을 읽고 그 결과를 뼈에 새긴다.', tools: ['거북 배딱지', '소 어깨뼈', '불 지지는 막대', '새김칼'], reading: '균열이 곧고 길게 뻗으면 길, 어긋나거나 끊기면 흉으로 본다. 왕이 직접 물어 점친 기록이 갑골문으로 남았다.', omen: '양면', staging: '왕이 전쟁의 길흉을 거북점으로 묻는데, 불에 지진 등딱지가 사람의 비명 같은 소리를 내며 갈라지는 기괴한 묘사로 신의 분노를 암시한다.' },
      { name: '내장점', alias: '간점·haruspicy', origin: '고대 지중해·근동에서 제물 짐승의 내장으로 신의 뜻을 읽던 점법.', how: '제사로 바친 짐승의 간·심장 같은 내장의 모양·빛깔·결함을 살펴, 그 상태로 다가올 일의 길흉을 가린다.', tools: ['제물 짐승', '간·내장', '청동 간 모형(부위 구분용)'], reading: '간이 매끈하고 온전하면 길하고, 색이 변했거나 일부가 없으면 큰 흉사가 든다고 본다. 제관만이 읽을 수 있는 비전이다.', omen: '흉조 중심', staging: '제물의 간에 본래 없어야 할 검은 얼룩이 있어 제관이 새파랗게 질리는 장면으로, 다가올 재앙을 누구도 막지 못하리라는 압박을 만든다.' },
      { name: '기상 점·풍점', alias: '날씨 점·구름점', origin: '농경·항해 문화에서 구름·바람·노을로 날씨와 운수를 읽던 경험적 점복.', how: '노을의 빛깔, 구름의 모양과 흐름, 바람의 방향, 달무리 같은 하늘의 기색으로 다음 날씨와 일의 길흉을 점친다.', tools: ['노을·구름', '달무리·햇무리', '바람의 방향'], reading: '"붉은 아침놀은 풍랑의 전조"처럼 경험에서 굳은 규칙을 따른다. 달무리는 비를, 까닭 없는 무지개는 변고를 알린다고 본다.', omen: '양면', staging: '늙은 뱃사람이 핏빛 노을을 보고 출항을 한사코 말리지만, 젊은 선장이 비웃고 떠난 배가 끝내 폭풍에 휩쓸리게 한다.' },
      { name: '식물 점', alias: '꽃점·풀점', origin: '민간에서 꽃잎·나뭇잎·풀의 상태로 마음과 운수를 가린 소박한 점속.', how: '꽃잎을 한 장씩 떼며 "좋다·싫다"를 세거나, 나무의 첫 꽃·과실의 풍흉, 풀의 시듦으로 사랑과 농사의 길흉을 본다.', tools: ['꽃잎', '나뭇잎', '점치는 풀', '과실'], reading: '마지막 꽃잎에 닿은 말이 답이라 믿거나, 심은 나무가 잘 자라면 그 집안이 흥한다고 본다. 가장 일상적이고 정겨운 점법이다.', omen: '길조 중심', staging: '소녀가 꽃잎을 떼며 사랑점을 보는 정겨운 장면 뒤에, 마지막 꽃잎이 "이별"에서 멈추는 작은 디테일로 비극을 예고한다.' },
      { name: '벌레·짐승 행동 점', alias: '충점·동물 전조', origin: '동물의 이상 행동을 천재지변·길흉의 전조로 읽던 민간 관습.', how: '개미가 줄지어 이사하거나, 쥐가 한꺼번에 달아나거나, 닭이 한밤에 울거나, 까치가 우는 것 등을 정해진 풀이로 해석한다.', tools: ['집짐승·들짐승', '벌레의 움직임', '울음·이동'], reading: '아침 까치는 반가운 손님, 한밤의 개 울음·닭 울음은 흉사, 쥐의 대탈출은 큰 변고의 전조로 본다.', omen: '양면', staging: '마을의 짐승들이 일제히 산 위로 달아나는 장면만으로, 곧 닥칠 지진이나 홍수를 누구도 말하지 않고 보여 준다.' },
    ],
  },
  {
    key: 'oracle', label: '신탁·강신·무점', icon: '🗿', note: '신의 입을 빌려 미래를 듣다',
    items: [
      { name: '신탁(오라클)', alias: 'oracle', origin: '고대 그리스 등에서 신전의 사제를 통해 신의 답을 듣던 예언 제도.', how: '참배자가 신전에 물음을 바치면, 무아지경에 든 무녀(여사제)가 신의 말을 토해 내고 사제가 그것을 시구로 옮겨 전한다.', tools: ['신전', '무녀(여사제)', '신성한 연기·샘물', '봉헌물'], reading: '신탁은 대개 한 가지로 못 박지 않고 두 가지로 읽히게 모호하다. "큰 나라가 멸망하리라"는 말이 적인지 자신인지 알 수 없게 한다.', omen: '양면', staging: '"강을 건너면 큰 나라가 무너지리라"는 신탁을 받은 왕이 적을 무너뜨릴 줄 알고 진군했다가, 무너지는 큰 나라가 자기 나라였음을 깨닫는 고전적 반전을 만든다.' },
      { name: '무점·점복(무당 점)', alias: '신점·神占', origin: '한국 무속에서 신을 받은 무당이 신의 말을 빌려 보는 점.', how: '무당이 쌀·엽전·방울·신칼 등을 쓰거나, 신이 내린 상태(공수)에서 직접 묻는 이의 과거·현재·미래를 짚어 말한다.', tools: ['쌀점', '엽전', '신방울·신칼', '오방기'], reading: '흩뿌린 쌀알의 수와 모양, 던진 엽전의 면, 잡은 깃발의 색으로 길흉을 가린다. 신의 공수는 단정적이고 강렬하다.', omen: '양면', staging: '무당이 굿 도중 갑자기 낯빛이 바뀌어 죽은 자의 목소리로 비밀을 토해 내, 산 자들이 숨겨 온 진실이 드러나는 장면으로 쓴다.' },
      { name: '강령·접신술', alias: '교령술·séance', origin: '죽은 이의 영혼을 불러 말을 듣고자 한 강신 의례.', how: '어두운 방에서 둘러앉아 손을 맞잡고 영매(미디엄)를 통해 망자를 부르며, 탁자의 흔들림이나 두드림, 자동기술로 답을 받는다.', tools: ['영매(미디엄)', '강령판(위자보드)', '촛불', '둘러앉은 원'], reading: '한 번 두드리면 "예", 두 번은 "아니오"처럼 약속된 신호로 읽거나, 영매가 망자의 목소리를 빌려 직접 말한다.', omen: '흉조 중심', staging: '강령회에서 부르지 않은 무언가가 응답하기 시작해, 촛불이 일제히 꺼지고 위자보드의 지침이 제멋대로 움직이는 공포 장면으로 전환한다.' },
      { name: '몽조(夢兆) 신탁', alias: '꿈 신탁·인큐베이션', origin: '신전에서 잠들어 꿈으로 신의 답을 구하던 고대의 꿈 점.', how: '병이나 물음을 안고 신전에서 하룻밤 정결히 잠들면, 신이 꿈에 나타나 처방이나 답을 내린다고 믿어 그 꿈을 사제가 풀이한다.', tools: ['신전 침소', '정결 의식', '꿈 기록', '해몽 사제'], reading: '꿈에 나타난 신·동물·물건이 곧 신의 처방이라 보아, 깨어난 뒤 사제가 그 상징을 현실의 지침으로 옮긴다.', omen: '길조 중심', staging: '치유를 구해 신전에서 잠든 인물이 똑같은 꿈을 본 낯선 이와 마주쳐, 같은 신탁을 공유한 두 사람의 운명이 얽히게 한다.' },
      { name: '점술 거울·수정구', alias: '수정 응시·scrying', origin: '거울·수정구·물·불꽃 같은 매끈한 표면을 응시해 환영을 보는 점법.', how: '어두운 곳에서 수정구나 검은 거울, 잔잔한 물 표면을 오래 응시해, 떠오르는 흐릿한 형상·연기·환영을 읽는다.', tools: ['수정구', '검은 거울', '물그릇', '촛불·연기'], reading: '구슬 속에 맺히는 안개·형상·글자를 점술가가 풀이한다. 보이는 것은 보는 자의 마음에 달렸다고도 한다.', omen: '양면', staging: '수정구를 들여다보던 점술가가 자기 죽는 모습을 보고 비명을 지르며 구슬을 떨어뜨려, 그 환영을 피하려 발버둥치는 자기실현적 예언의 서막을 연다.' },
      { name: '음성·환청 신탁', alias: '클레로만시·소리 점', origin: '우연히 들려온 말소리나 자연의 소리를 신의 답으로 받아들인 점속.', how: '신전을 나서며 처음 들은 행인의 말, 종소리의 횟수, 바람에 흔들리는 나뭇잎·풍경 소리를 묻는 일의 답으로 받아들인다.', tools: ['우연한 말소리', '종·풍경', '나뭇잎 소리'], reading: '"우연은 없다"는 믿음 아래, 마침 들린 한마디를 신이 그 입을 빌려 준 답으로 새긴다. 듣는 이의 해석이 전부다.', omen: '중립·해석형', staging: '답을 구하러 길을 나선 인물이 우연히 들은 아이의 노랫말 한 구절을 신의 응답으로 받아들여, 그 한마디가 큰 결단을 좌우하게 한다.' },
    ],
  },
  {
    key: 'dream', label: '해몽·상징 풀이', icon: '🌙', note: '꿈과 우연의 상징을 풀다',
    items: [
      { name: '해몽', alias: '꿈풀이·oneiromancy', origin: '동서고금 어디서나 행해진, 꿈의 내용으로 길흉을 가린 점법.', how: '꿈에 나온 사물·동물·행위·색을 정해진 풀이표나 점술가의 해석에 맞춰 현실의 길흉으로 옮긴다.', tools: ['꿈 기록', '해몽서(풀이 책)', '상징 사전'], reading: '돼지·용·똥 꿈은 재물, 이가 빠지는 꿈은 가족의 우환, 불 꿈은 번성을 뜻한다는 식이다. 반대로 읽는 "역몽" 관습도 있다.', omen: '양면', staging: '같은 꿈을 두고 두 해몽가가 정반대로 풀이해, 어느 쪽을 믿느냐에 따라 인물의 운명이 갈리는 갈림길을 만든다.' },
      { name: '태몽', alias: '아기 점지 꿈', origin: '동아시아에서 아이를 밴 사실과 그 아이의 운명을 알리는 꿈으로 여긴 관습.', how: '임신 무렵 본 꿈에 나온 동물·과일·보석·자연물로 아이의 성별과 장차의 기질·운명을 미리 점친다.', tools: ['임신 무렵의 꿈', '동물·과일·꽃·보석 상징'], reading: '용·호랑이 꿈은 큰 인물, 꽃·구슬 꿈은 귀한 딸, 큰 과일은 풍요를 점지한다고 본다. 평생 따라다니는 운명의 첫 표식이 된다.', omen: '길조 중심', staging: '"검은 용이 우물로 떨어지는" 불길한 태몽을 안고 태어난 아이가, 평생 그 꿈의 그림자에서 벗어나려 발버둥치는 운명극을 깐다.' },
      { name: '점성 상징·길흉 색', alias: '상징 해석', origin: '꿈과 현실 양쪽에서 색·숫자·방위에 길흉을 부여한 상징 관습.', how: '특정 색(붉은색·흰색·검은색)·숫자(셋·일곱·아홉)·방위(동·서)에 정해진 길흉을 두고, 꿈이나 점괘에 그것이 나오면 함께 읽는다.', tools: ['오방색', '길수·흉수', '방위', '상징 풀이표'], reading: '흰색은 상(喪)과 정결을 동시에, 붉은색은 경사와 피를 함께 뜻하는 식으로 색마다 양면이 있다. 숫자와 방위가 길흉을 더한다.', omen: '양면', staging: '예언의 핵심 단서가 "흰 옷의 사람"인데, 그것이 신부인지 상주인지 끝까지 모호하게 두어 결말의 반전을 숨긴다.' },
      { name: '서물(書物) 점', alias: '책 펼치기 점·bibliomancy', origin: '경전이나 시집을 아무 데나 펼쳐 그 구절을 신탁으로 삼은 점법.', how: '눈을 감고 물음을 떠올린 뒤 경전·시집을 아무렇게나 펼쳐, 손가락이 닿은 구절을 그 물음에 대한 답으로 읽는다.', tools: ['경전·시집', '바늘·손가락', '봉인된 책'], reading: '펼쳐진 구절을 글자 그대로가 아니라 물음에 빗대어 읽는다. 우연히 펼친 페이지를 운명의 안배로 본다.', omen: '중립·해석형', staging: '큰 결정을 앞둔 인물이 낡은 시집을 펼쳤더니 옛 연인의 이름이 적힌 페이지가 나와, 우연이 운명처럼 그를 과거로 끌어당기게 한다.' },
      { name: '이름·획수 점', alias: '성명학·수비학', origin: '이름의 글자·획수·발음에 운명이 깃든다고 본 작명·점법.', how: '이름 글자의 획수를 더해 길수·흉수를 가리거나, 발음의 음양오행을 따져 그 이름이 주인에게 길한지 흉한지 풀이한다.', tools: ['이름 글자', '획수표', '음양오행', '길수·흉수'], reading: '획수의 합이 특정 길한 수에 들면 좋고, 흉수에 들면 이름을 고쳐야 한다고 본다. 이름이 곧 운명의 그릇이라 여긴다.', omen: '양면', staging: '아이의 이름 획수가 "단명할 수"라는 풀이에 부모가 이름을 거듭 바꾸지만, 무엇으로 고쳐도 흉수가 따라붙는 저주처럼 그린다.' },
    ],
  },
  {
    key: 'fate', label: '운명·예언 모티프', icon: '⚖', note: '이야기를 움직이는 예언의 장치들',
    items: [
      { name: '자기실현적 예언', alias: '오이디푸스형 예언', origin: '예언을 피하려는 행동이 도리어 예언을 이루게 하는 비극의 구조.', how: '"아들이 아비를 죽이리라" 같은 예언을 들은 자가 그것을 막으려 한 선택이, 우연과 오해를 거쳐 끝내 그 예언을 실현시킨다.', tools: ['피하려는 행동', '오해·우연', '봉인된 진실'], reading: '예언은 틀리지 않는다. 다만 그것을 피하려는 발버둥 자체가 예언의 도구가 된다. 운명의 불가항력을 보여 준다.', omen: '흉조 중심', staging: '예언을 피하려 갓난아이를 멀리 버린 왕이, 수십 년 뒤 그 아이의 손에 죽으며 모든 회피가 예언의 길이었음을 깨닫게 한다.' },
      { name: '거짓·해석 여지 예언', alias: '양날의 신탁', origin: '여러 뜻으로 읽히도록 일부러 모호하게 짜인 신탁의 전통.', how: '"왕은 여인의 몸에서 나지 않은 자에게만 쓰러지리라" 같은 말로, 안심시키면서도 빠져나갈 구멍(예외)을 숨겨 둔다.', tools: ['이중 의미의 문구', '숨은 예외', '말장난'], reading: '문구 그대로 믿은 자는 방심하다 무너지고, 숨은 뜻을 꿰뚫은 자만 살아남는다. 예언의 함정이 곧 반전의 열쇠가 된다.', omen: '양면', staging: '"숲이 성으로 다가오기 전엔 패하지 않는다"는 예언을 믿은 폭군이, 병사들이 나뭇가지로 위장해 다가오자 무너지는 식의 반전을 설계한다.' },
      { name: '예언서·예언시', alias: '두루마리 예언·노스트라다무스형', origin: '오래전 기록된 모호한 예언이 후대에 들어맞는다고 믿어진 문헌 전통.', how: '수백 년 전 남겨진 사행시·암호 같은 예언을, 사건이 터질 때마다 후대인이 "이것이 그 예언"이라며 끼워 맞춰 해석한다.', tools: ['낡은 두루마리', '암호·사행시', '봉인', '해석자'], reading: '예언은 사건이 일어난 뒤에야 "그게 이 뜻이었다"고 풀린다. 그래서 늘 맞는 듯 보이지만 미리 막진 못한다.', omen: '양면', staging: '주인공이 예언서의 모호한 구절을 자신에게 유리하게 해석하다, 그 해석이 통째로 틀렸음이 막판에 드러나며 모든 계획이 무너지게 한다.' },
      { name: '선택받은 자 예언', alias: '예언의 아이·구원자', origin: '한 인물이 세상을 구하거나 멸망시킬 운명을 타고났다는 영웅 서사의 핵.', how: '먼 옛날의 예언이 "표식을 지닌 아이가 어둠을 끝내리라"고 못 박아, 그 표식의 주인을 찾고 기르고 시험하는 이야기가 펼쳐진다.', tools: ['예언의 표식(점·흉터·별)', '예언서', '시험·통과의례'], reading: '표식의 주인이 진짜 그 사람인지, 예언이 그를 만든 것인지 그가 예언을 이룬 것인지가 늘 긴장의 핵이 된다.', omen: '길조 중심', staging: '"선택받은 자"가 사실은 가짜이고, 평범하다 무시당하던 곁의 인물이 진짜 표식의 주인이었음을 막판에 드러내는 반전을 깐다.' },
      { name: '저주·금기 예언', alias: '가문의 저주·금기 위반', origin: '한 가문·장소에 걸린 저주나, 어기면 화를 부르는 금기의 예언.', how: '"이 집안의 장남은 서른을 넘기지 못한다", "그 방의 문을 열면 안 된다" 같은 저주·금기가 대를 이어 전해지며 인물을 옭아맨다.', tools: ['가문의 전설', '봉인된 방·물건', '어기면 닥치는 화'], reading: '저주는 어길 때 비로소 작동하고, 금기는 호기심에 깨진다. 그 위반의 순간이 곧 비극의 방아쇠가 된다.', omen: '흉조 중심', staging: '가문의 저주를 미신이라 비웃던 막내가 봉인된 방을 열어젖히는 순간, 대대로 전해진 예언이 비로소 깨어나게 한다.' },
      { name: '운명의 세 여신·실 모티프', alias: '운명의 실·moirai', origin: '인간의 수명을 실로 잣고 끊는 운명의 여신들로 운명의 정해짐을 형상화한 신화 장치.', how: '한 여신은 생명의 실을 잣고, 한 여신은 길이를 재며, 한 여신은 가위로 끊는다. 그 실의 길이가 곧 한 사람의 수명이다.', tools: ['생명의 실', '물레·가위', '운명의 책·저울'], reading: '실이 끊기는 순간이 곧 죽음이라, 누구도 자기 실의 길이를 모른다. 운명은 이미 잣아져 있고 인간은 그 위를 걸을 뿐이라 본다.', omen: '중립·해석형', staging: '죽음을 앞둔 인물의 환영 속에 실을 끊으려는 가위가 어른거리게 해, 그가 마지막 순간까지 그 실을 붙들려 발버둥치는 장면으로 쓴다.' },
    ],
  },
]

// ---------- 저장 키 ----------
const LS = 'sry:tool:divination-ref:'
const ALL = '__all__'
const FAVO = '__favorite__'

const flatAll = (): { cat: CatDef; item: Method }[] =>
  CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const omenBadge = (o: Method['omen']): { label: string; color: string } => {
  switch (o) {
    case '길조 중심': return { label: '길조 중심', color: 'var(--ok)' }
    case '흉조 중심': return { label: '흉조 중심', color: '#d9534f' }
    case '양면': return { label: '양면', color: 'var(--accent)' }
    default: return { label: '해석형', color: 'var(--muted)' }
  }
}

const escapeHtml = (str: string) =>
  String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 한 점술 방식을 사람이 읽기 좋은 텍스트로
const toText = (cat: CatDef, m: Method): string => {
  const ob = omenBadge(m.omen).label
  return [
    `${cat.icon} ${m.name}${m.alias ? ` (${m.alias})` : ''} — ${cat.label} · ${ob}`,
    `기원: ${m.origin}`,
    `방법: ${m.how}`,
    `도구: ${m.tools.join(', ')}`,
    `해석 관습: ${m.reading}`,
    `예언 연출: ${m.staging}`,
  ].join('\n')
}

export default function DivinationRef({ payload }: { payload?: Record<string, unknown> }) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL || raw === FAVO || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL
  })
  // 즐겨찾기: "catKey::name"
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  // 펼친 항목 키 집합
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [random, setRandom] = useState<{ cat: CatDef; item: Method } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  // payload 로 특정 검색어를 받으면 적용(연계 진입)
  useEffect(() => {
    const q = payload?.query
    if (typeof q === 'string' && q.trim()) setQuery(q.trim())
  }, [payload])

  // 영속
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  // 언마운트 정리: 토스트 타이머 해제
  useEffect(() => () => { if (toastTimer.current) { window.clearTimeout(toastTimer.current); toastTimer.current = null } }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  const favKey = (catKey: string, name: string) => `${catKey}::${name}`

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => { setToast(null); toastTimer.current = null }, 2400)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = cat === ALL || cat === FAVO
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (cat === FAVO) base = base.filter(({ cat: c, item }) => favs[favKey(c.key, item.name)])
    if (q) {
      base = base.filter(({ item, cat: c }) =>
        item.name.toLowerCase().includes(q) ||
        (item.alias || '').toLowerCase().includes(q) ||
        item.origin.toLowerCase().includes(q) ||
        item.how.toLowerCase().includes(q) ||
        item.reading.toLowerCase().includes(q) ||
        item.staging.toLowerCase().includes(q) ||
        item.tools.some((s) => s.toLowerCase().includes(q)) ||
        c.label.toLowerCase().includes(q))
    }
    return base
  }, [query, cat, favs])

  const rollRandom = useCallback(() => {
    const pool = cat === ALL || cat === FAVO
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    const usable = cat === FAVO ? pool.filter(({ cat: c, item }) => favs[favKey(c.key, item.name)]) : pool
    if (!usable.length) { setRandom(null); showToast('뽑을 항목이 없습니다.'); return }
    setRandom((prev) => {
      let pick = usable[Math.floor(Math.random() * usable.length)]
      if (prev && usable.length > 1 && pick.item.name === prev.item.name && pick.cat.key === prev.cat.key) {
        pick = usable[Math.floor(Math.random() * usable.length)]
      }
      // 무작위로 뽑은 항목은 펼침
      setOpen((o) => ({ ...o, [favKey(pick.cat.key, pick.item.name)]: true }))
      return pick
    })
  }, [cat, favs, showToast])

  const toggleFav = (catKey: string, name: string) => {
    const k = favKey(catKey, name)
    setFavs((prev) => { const n = { ...prev }; if (n[k]) delete n[k]; else n[k] = true; return n })
  }
  const toggleOpen = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }))

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* graceful */ })
  }

  // ----- 연계 -----
  const stashMethod = (cat: CatDef, m: Method) => {
    addToStash({ kind: 'note', label: `${m.name} 점술 자료`, text: toText(cat, m) })
    showToast(`수집함에 ‘${m.name}’ 자료를 담았습니다.`)
  }
  const projectMethod = (cat: CatDef, m: Method) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(cat.icon + ' ' + m.name)}${m.alias ? escapeHtml(` (${m.alias})`) : ''}</b> — ${escapeHtml(cat.label)} · ${escapeHtml(omenBadge(m.omen).label)}</p>`,
      `<p><b>기원</b>: ${escapeHtml(m.origin)}</p>`,
      `<p><b>방법</b>: ${escapeHtml(m.how)}</p>`,
      `<p><b>도구</b>: ${escapeHtml(m.tools.join(', '))}</p>`,
      `<p><b>해석 관습</b>: ${escapeHtml(m.reading)}</p>`,
      `<p><b>예언 연출</b>: ${escapeHtml(m.staging)}</p>`,
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '점술·예언', title: `${m.name} (점술 방식)`, bodyHtml })
    if (id) showToast(`프로젝트 자료 〈점술·예언〉에 ‘${m.name}’을(를) 추가했습니다.`)
  }
  const snippetMethod = (cat: CatDef, m: Method) => {
    // 예언 연출 문장을 바로 쓸 스니펫으로
    addToLibrary('snippets', { text: m.staging, tags: ['점술', m.name, cat.label], source: '점술·예언 방식 사전' })
    showToast(`‘${m.name}’ 예언 연출을 스니펫으로 저장했습니다.`)
  }

  // ----- 스타일 -----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const chip: React.CSSProperties = { fontSize: 11, padding: '2px 7px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)' }

  const renderDetail = (cat: CatDef, m: Method) => {
    const ob = omenBadge(m.omen)
    return (
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {m.tools.map((s) => <span key={s} style={{ ...chip, borderColor: 'var(--accent)', color: 'var(--text)' }}><Emoji e="🜂" /> {s}</span>)}
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.55 }}><b style={{ color: 'var(--muted)' }}>기원 </b>{m.origin}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.55 }}><b style={{ color: 'var(--muted)' }}>방법 </b>{m.how}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.55 }}><b style={{ color: 'var(--muted)' }}>해석 관습 </b>{m.reading}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.55, background: 'var(--paper)', border: '1px dashed var(--border)', borderRadius: 8, padding: '7px 9px' }}>
          <b style={{ color: 'var(--accent)' }}><Emoji e="✍" /> 예언 연출 </b>{m.staging}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
          <button className="minibtn" onClick={() => copy(toText(cat, m), 'full:' + favKey(cat.key, m.name))}>
            {copiedKey === 'full:' + favKey(cat.key, m.name) ? <>✓ 복사됨</> : <><Emoji e="📋" /> 전체 복사</>}
          </button>
          <button className="minibtn" onClick={() => copy(m.staging, 'stage:' + favKey(cat.key, m.name))}>
            {copiedKey === 'stage:' + favKey(cat.key, m.name) ? <>✓ 복사됨</> : <><Emoji e="📋" /> 연출만 복사</>}
          </button>
          <span style={{ ...chip, marginLeft: 'auto', borderColor: ob.color, color: ob.color }}>{ob.label}</span>
        </div>
        {/* 연계 버튼 묶음 */}
        <div className="linkbar" style={{ marginTop: 4 }}>
          <span className="linkbar-label">연계:</span>
          <button className="linkbtn" onClick={() => stashMethod(cat, m)} title="이 점술 방식 자료를 플로팅 수집함에 담기"><Emoji e="📎" /> 수집함</button>
          <button className="linkbtn" onClick={() => projectMethod(cat, m)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈점술·예언〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
          <button className="linkbtn" onClick={() => snippetMethod(cat, m)} title="예언 연출 문장을 스니펫 라이브러리에 저장"><Emoji e="✂" /> 스니펫 저장</button>
          <button className="linkbtn" onClick={() => openToolLinked('prophecy-generator', { query: m.name })} title="모호한 예언 문구를 조합하는 예언 생성기 열기"><Emoji e="🔮" /> 예언 생성기</button>
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={hint}>
        점술·예언 방식 <b>{total}종</b>의 기원·방법·도구·해석 관습·예언 연출을 모았습니다. 운명·신비 플롯의 소재로 바로 심어 보세요.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="방식·도구·해석으로 검색 (예: 신탁, 수정구, 거북점, 자기실현)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL)} aria-pressed={cat === ALL}
          style={{ borderColor: cat === ALL ? 'var(--accent)' : 'var(--border)', color: cat === ALL ? 'var(--text)' : 'var(--muted)' }}><Emoji e="✨" /> 전체</button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on}
              title={c.note}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}><Emoji e={c.icon} /> {c.label}</button>
          )
        })}
        <button className="minibtn" onClick={() => setCat(FAVO)} aria-pressed={cat === FAVO}
          style={{ borderColor: cat === FAVO ? 'var(--accent)' : 'var(--border)', color: cat === FAVO ? 'var(--text)' : 'var(--muted)' }}>★ 즐겨찾기</button>
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 점술</button>
        <button className="minibtn" onClick={() => setOpen({})} title="모든 항목 접기">▴ 모두 접기</button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}종 표시</span>
      </div>

      {/* 무작위 결과 강조 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            {random.item.alias && <span style={{ fontSize: 12, color: 'var(--muted)' }}>({random.item.alias})</span>}
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          {renderDetail(random.cat, random.item)}
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>✓ {toast}</div>
      )}

      {/* 목록 (펼침/접기) */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {cat === FAVO ? '★ 아직 즐겨찾기한 점술 방식이 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const fk = favKey(c.key, item.name)
            const isFav = !!favs[fk]
            const isOpen = !!open[fk]
            const ob = omenBadge(item.omen)
            return (
              <div key={fk} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => toggleOpen(fk)}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /></span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</span>
                  {item.alias && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>({item.alias})</span>}
                  <span style={{ ...chip, borderColor: ob.color, color: ob.color, flexShrink: 0 }}>{ob.label}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {item.tools.slice(0, 3).join(' · ')}
                  </span>
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={(e) => { e.stopPropagation(); toggleFav(c.key, item.name) }}
                    style={{ flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>{isFav ? '★' : '☆'}</button>
                  <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{isOpen ? '▾' : '▸'}</span>
                </div>
                {isOpen && renderDetail(c, item)}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>점술은 정답이 아니라 이야기의 장치입니다. 같은 점괘도 누가 어떻게 해석하느냐에 따라 길흉이 뒤집히니, 그 모호함과 함정을 복선·반전으로 비틀어 심어 보세요.</div>
    </div>
  )
}
