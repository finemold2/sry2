// 동물 상징·생태 사전 — 동물별 생태/행동/문화권별 상징·길흉/등장 연출을 자작 데이터로 정리.
// 상징·복선·비유에 바로 쓰도록 검색·무작위·복사 + 수집함/프로젝트/스니펫 연계.
// react 와 './linkbus' 외 import 없음. 외부 네트워크·미디어·키 불필요. 모두 로컬(자작 텍스트).
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  addToStash,
  addToProject, hasProjectBridge,
  addToLibrary,
  openToolLinked,
  Emoji, emojify,
} from './linkbus'

export const meta = {
  id: 'animal-symbol-ref',
  name: '동물 상징·생태 사전',
  icon: '🦅',
  group: '리서치·자료',
  intro: '동물별 생태·행동·문화권 상징/길흉·등장 연출을 찾아 상징·복선·비유에 심으세요',
  w: 660,
  h: 600,
}

// ---------- 데이터 모델 ----------
interface Animal {
  name: string          // 한국어 이름
  alias?: string        // 별칭/학술적 별명(검색 보조)
  ecology: string       // 생태·서식·먹이·신체 특징(자작 요약)
  behavior: string      // 두드러진 행동·습성(자작 요약)
  symbols: string[]     // 보편적 상징 키워드
  culture: string       // 문화권별 상징/길흉 비교(자작 요약)
  luck: '길' | '흉' | '양면' | '중립'  // 전반적 길흉 경향
  staging: string       // 글에서의 등장 연출·복선 아이디어(자작)
}
interface CatDef { key: string; label: string; icon: string; note: string; items: Animal[] }

// ---------- 자작 사전: 8개 카테고리, 합계 100+ 항목 ----------
const CATS: CatDef[] = [
  {
    key: 'beast', label: '맹수·대형 포유류', icon: '🐅', note: '힘·위엄·공포를 거느린 존재들',
    items: [
      { name: '사자', alias: '백수의 왕', ecology: '초원의 정점 포식자. 암컷 무리가 사냥을 도맡고 수컷은 영역과 자손을 지킨다. 갈기는 성숙과 우위를 드러낸다.', behavior: '낮에는 길게 잠을 자고 해질녘 사냥에 나선다. 무리(프라이드) 단위로 영역을 공유한다.', symbols: ['왕권', '용기', '위엄', '자존', '오만'], culture: '서양 문장(紋章)에선 군주와 용맹의 상징, 부활절 사자처럼 신성의 비유로도 쓰인다. 동양에선 불법을 지키는 수호(사자상)로 변주된다.', luck: '길', staging: '권좌의 인물 곁에 사자 문양·조각을 깔아 두면 그가 무너질 때 그 상징이 함께 균열을 내며 몰락을 예고할 수 있다.' },
      { name: '호랑이', alias: '범', ecology: '단독 생활을 하는 대형 고양잇과. 줄무늬는 개체마다 달라 지문처럼 식별된다. 매복형 사냥꾼.', behavior: '넓은 영역을 홀로 순찰하며 냄새와 발톱 자국으로 경계를 표시한다. 물을 좋아해 헤엄을 잘 친다.', symbols: ['용맹', '위엄', '야성', '수호', '두려움'], culture: '한국 설화에서 산신령의 동물이자 액을 막는 수호신. 중국에선 서방을 지키는 백호. 인도·동남아에선 두려움과 외경의 대상으로 신격화된다.', luck: '양면', staging: '마을을 지키는 산군(山君)으로 등장시키되, 인간의 탐욕이 그 영역을 침범하는 순간 수호가 재앙으로 뒤집히게 하면 주제를 응축할 수 있다.' },
      { name: '곰', ecology: '잡식성 대형 포유류. 가을에 지방을 비축해 겨울잠에 든다. 후각이 매우 발달했다.', behavior: '평소엔 느긋하나 새끼를 지킬 때 폭발적으로 공격적이다. 동면 후 봄에 깨어난다.', symbols: ['힘', '모성', '동면', '재생'], culture: '북방·시베리아 문화에서 숲의 주인이자 조상의 화신으로 외경받는다. 단군 신화의 웅녀처럼 인내와 변신의 상징으로도 쓰인다.', luck: '길', staging: '겨울잠과 봄의 깨어남을 인물의 잠복기·부활과 겹쳐 두면, 곰의 출몰 자체가 이야기의 계절적 전환을 알린다.' },
      { name: '늑대', ecology: '무리를 이루는 갯과 포식자. 위계가 뚜렷하고 협동 사냥에 능하다. 원거리 의사소통을 위해 운다.', behavior: '달밤에 길게 울어 무리를 결속하고 영역을 알린다. 짝과 평생 함께하는 개체가 많다.', symbols: ['야성', '충성', '고독', '위협'], culture: '로마 건국 신화의 양육자(암늑대)부터, 유럽 민담의 잡아먹는 위협까지 양극을 오간다. 초원 유목 문화에선 용맹의 토템.', luck: '양면', staging: '한 마리 외톨이 늑대를 무리에서 떨어진 인물과 겹쳐 두고, 멀리서 화답하는 울음을 들려주면 고독과 소속 갈망을 동시에 그릴 수 있다.' },
      { name: '표범', alias: '레오파드', ecology: '나무를 잘 타는 단독 포식자. 사냥감을 나무 위로 끌어올려 다른 포식자로부터 지킨다.', behavior: '은밀하고 적응력이 강해 사막·밀림·설산까지 폭넓게 산다. 야행성에 가깝다.', symbols: ['은밀', '민첩', '고독한 자존', '치명'], culture: '아프리카 일부 왕권 의례에서 표범 가죽은 지도자의 권위를 표시한다. 점박이 무늬는 "변하지 않는 본성"의 비유로 자주 인용된다.', luck: '양면', staging: '"표범은 점을 바꾸지 못한다"는 통념을 활용해, 변하려는 인물의 노력과 본성의 끈질김을 대비시키는 복선으로 깔 수 있다.' },
      { name: '코끼리', ecology: '육상 최대 포유류. 암컷 중심의 무리를 이루며 가장 나이 든 암컷이 길과 물길을 기억한다.', behavior: '죽은 동료의 뼈 앞에서 멈춰 만지는 듯한 행동을 보여 "애도"의 상징이 됐다. 저주파로 멀리 소통한다.', symbols: ['지혜', '기억', '인내', '위엄'], culture: '인도·동남아에서 지혜와 행운(코끼리 머리 신)으로 숭상된다. 흰 코끼리는 특히 신성하나, 동시에 "감당 못 할 값비싼 선물"이라는 역설의 비유로도 쓰인다.', luck: '길', staging: '기억하는 동물이라는 특성을 빌려, 모두가 잊은 사건을 코끼리만이 "기억하듯" 환기하는 장치로 배치하면 과거 회귀를 자연스럽게 연다.' },
      { name: '하이에나', ecology: '강력한 턱을 지닌 무리 동물. 청소동물로 알려졌지만 실제로는 능숙한 사냥꾼이기도 하다.', behavior: '암컷이 무리를 이끄는 모계 사회. 특유의 "웃는" 듯한 울음을 낸다.', symbols: ['교활', '비겁', '기회주의', '조롱'], culture: '여러 문화에서 부정적으로 그려졌지만, 일부 지역 전승에선 영리함과 생존력의 상징으로 재평가된다.', luck: '흉', staging: '약자를 둘러싸고 "웃는" 군중의 비유로 쓰거나, 겉보기 비겁함 뒤의 강한 모계 질서를 드러내 통념을 뒤집는 반전 소재로 삼는다.' },
      { name: '들소', alias: '버펄로·바이슨', ecology: '거대한 떼를 이루어 초원을 이동하는 초식동물. 무리의 이동 자체가 대지를 뒤흔든다.', behavior: '위협을 받으면 떼 전체가 한 방향으로 돌진한다. 새끼를 가운데 두고 원진을 친다.', symbols: ['풍요', '대지', '희생', '집단의 힘'], culture: '북미 평원 문화에서 생존의 근간이자 신성한 선물로 여겨졌고, 그 떼의 소멸은 한 세계의 붕괴를 상징하게 됐다.', luck: '길', staging: '들소 떼의 사라짐을 한 공동체의 몰락·삶의 방식 소멸과 겹쳐, 풍경의 변화만으로 시대의 종말을 그릴 수 있다.' },
      { name: '여우', ecology: '단독 생활을 하는 작은 갯과. 잡식성이며 도시까지 적응해 산다. 청각이 예민하다.', behavior: '먹이를 땅에 묻어 저장하고 영리하게 위험을 피한다. 야행성에 가깝다.', symbols: ['교활', '영리', '기만', '매혹'], culture: '동아시아에선 둔갑하는 구미호로 매혹과 위험을 함께 상징하고, 서양 우화에선 꾀바른 트릭스터로 굳어졌다.', luck: '양면', staging: '인물의 말은 부드럽고 매혹적이나 그림자나 옷자락에 여우 이미지를 슬쩍 겹쳐, 정체에 대한 의심을 독자에게만 흘린다.' },
    ],
  },
  {
    key: 'bird', label: '새·날짐승', icon: '🦅', note: '하늘·영혼·전령의 상징',
    items: [
      { name: '독수리', alias: '수리', ecology: '높은 곳에서 활공하며 먼 거리의 먹이를 포착하는 맹금. 시력이 인간의 여러 배다.', behavior: '상승 기류를 타고 거의 날갯짓 없이 오래 떠 있다. 절벽에 둥지를 튼다.', symbols: ['자유', '시야', '권력', '영적 상승'], culture: '여러 제국이 국가 문장으로 삼아 권력과 승리를 표상했다. 일부 토착 전통에선 하늘과 인간을 잇는 신성한 전령으로 본다.', luck: '길', staging: '인물이 결정의 정점에 설 때 머리 위로 독수리가 한 번 활공하게 하면, 시야의 확장이나 권력의 도래를 말없이 예고한다.' },
      { name: '올빼미', alias: '부엉이', ecology: '야행성 맹금. 소리 없이 날도록 깃털이 특화돼 있고 머리를 크게 돌려 넓게 살핀다.', behavior: '어둠 속에서 청각과 시각으로 사냥한다. 낮에는 나무 그늘에서 쉰다.', symbols: ['지혜', '밤', '죽음의 전조', '고독'], culture: '그리스에선 지혜의 여신의 새로 길조였으나, 여러 농경 문화에선 밤에 우는 새라 하여 죽음·불길의 전조로 여겨졌다.', luck: '양면', staging: '같은 올빼미를 1막에선 지혜의 조언자 이미지로, 후반엔 죽음의 전조로 다시 등장시켜 같은 상징의 의미를 뒤집는 복선으로 쓴다.' },
      { name: '까마귀', ecology: '매우 영리한 잡식성 조류. 도구를 쓰고 얼굴을 기억할 만큼 인지력이 높다.', behavior: '무리를 지어 떠들썩하게 모이고, 빛나는 물건을 모으는 습성이 있다.', symbols: ['죽음', '예언', '지성', '불길'], culture: '북유럽 신화에서 최고신의 눈과 귀가 되는 지혜의 새. 동아시아에선 태양 속 삼족오로 신성하나, 검은빛 탓에 흉조로도 통한다.', luck: '양면', staging: '시체나 전장 위를 도는 까마귀 떼로 죽음을 직접 말하지 않고 보여 주거나, 영리한 까마귀 한 마리를 화자의 비밀 관찰자로 삼는다.' },
      { name: '비둘기', ecology: '도시와 들에 흔한 조류. 귀소 본능이 강해 먼 곳에서도 둥지로 돌아온다.', behavior: '짝과 함께 둥지를 짓고 새끼를 함께 기른다. 무리로 모여 먹이를 찾는다.', symbols: ['평화', '순결', '화해', '헌신'], culture: '대홍수 신화에서 올리브 가지를 물어 와 재앙의 끝과 화해를 알린 새. 연인의 헌신·성령의 비유로도 굳어졌다.', luck: '길', staging: '갈등이 봉합되는 장면에 비둘기를 날려 화해를 비추되, 그 비둘기가 곧 매에게 채여 거짓 평화를 암시하는 식으로 비틀 수 있다.' },
      { name: '봉황', alias: '불사조·피닉스', ecology: '실재하지 않는 상상의 새. 스스로 불에 타 재가 된 뒤 그 재에서 다시 태어난다고 전한다.', behavior: '오백 년 또는 천 년을 살고 종말에 불꽃 속에서 갱신한다는 이야기로 전승된다.', symbols: ['재생', '불멸', '고귀', '갱신'], culture: '동양의 봉황은 성군의 치세에 나타나는 길조이자 황후의 상징. 서양의 피닉스는 죽음과 부활의 영원한 순환을 표상한다.', luck: '길', staging: '모든 것을 잃은 인물의 재기를 봉황의 분신(焚身)과 부활에 겹쳐, 가장 깊은 잿더미 장면 뒤에 갱신의 단서를 심는다.' },
      { name: '백조', ecology: '물 위를 우아하게 미끄러지는 대형 물새. 수면 아래에서는 쉴 새 없이 발을 젓는다.', behavior: '평생 같은 짝과 지내는 경우가 많다. 위협받으면 의외로 사납게 맞선다.', symbols: ['우아', '순결', '변신', '백조의 노래'], culture: '"못생긴 새끼에서 피어나는 아름다움"의 우화로 변신·성장을 상징하고, 죽기 직전 가장 아름답게 운다는 전승에서 "백조의 노래"(마지막 절창)가 나왔다.', luck: '길', staging: '겉은 평온하나 수면 아래로 발버둥치는 백조의 이중성을, 우아함을 연기하느라 안에서 무너지는 인물의 내면과 겹쳐 보여 준다.' },
      { name: '제비', ecology: '봄에 찾아왔다 가을에 떠나는 철새. 처마 밑에 진흙 둥지를 짓고 빠르게 난다.', behavior: '같은 둥지로 매년 돌아오는 강한 귀소성을 보인다. 곤충을 날면서 잡아먹는다.', symbols: ['봄', '귀향', '소식', '행운'], culture: '동아시아 설화에서 은혜를 갚는 새로 복과 재물을 물어 온다. 멀리 떠났다 반드시 돌아오는 속성에서 재회·소식의 전령이 됐다.', luck: '길', staging: '떠난 인물의 귀환을 제비가 처마에 다시 둥지를 트는 계절 묘사로 예고하면, 직접 말하지 않고도 "돌아옴"을 깐다.' },
      { name: '학', alias: '두루미', ecology: '긴 다리와 목을 지닌 대형 물새. 습지에서 짝을 지어 춤추듯 구애한다.', behavior: '암수가 마주 서서 깃을 펴고 뛰며 춤을 추고, 오래 한 짝과 지낸다.', symbols: ['장수', '고결', '행복', '천상'], culture: '동아시아에서 신선이 타고 다니는 길조이자 장수의 상징. 학의 춤은 부부의 백년해로와 고고한 품격을 표상한다.', luck: '길', staging: '노부부의 회상 장면에 마주 보는 한 쌍의 학을 배치해, 평생 함께한 시간을 군말 없이 응축한다.' },
      { name: '공작', ecology: '수컷이 거대하고 화려한 깃을 펴 구애하는 꿩과 새. 깃의 눈무늬가 시선을 사로잡는다.', behavior: '위협이나 과시 때 깃을 부채처럼 펼친다. 경계 시 날카롭게 운다.', symbols: ['허영', '자부', '불멸', '아름다움'], culture: '인도에서 신성한 새이자 길조. 깃의 "눈"무늬는 만물을 보는 신성한 시선으로, 또는 허영의 표상으로 양분된다.', luck: '양면', staging: '권력자가 깃을 펴듯 자신을 과시하는 자리에 공작을 두고, 그 화려함 뒤의 공허를 드러내 허영의 몰락을 예고한다.' },
      { name: '매', alias: '송골매', ecology: '급강하 속도가 매우 빠른 맹금. 사냥을 위해 인간에게 길들여진 역사가 길다(매사냥).', behavior: '높이 떠 있다 표적을 향해 수직으로 내리꽂힌다. 정확하고 신속하다.', symbols: ['집중', '속도', '충성스러운 사냥꾼', '결단'], culture: '유목·귀족 문화에서 매사냥은 권위와 통제의 상징. 길들여졌으나 야성을 잃지 않는 존재로 자주 그려진다.', luck: '길', staging: '주인의 부름에만 돌아오는 매로 충성과 길들임을 그리되, 어느 순간 부름을 거부하고 떠나게 해 자유 의지의 전환점으로 쓴다.' },
    ],
  },
  {
    key: 'reptile', label: '파충류·양서류', icon: '🐍', note: '재생·변태·금기의 경계',
    items: [
      { name: '뱀', ecology: '다리 없이 기는 파충류. 허물을 벗으며 자라고, 일부 종은 독을 지닌다. 열을 감지한다.', behavior: '주기적으로 허물을 벗어 "새로 태어나는" 듯 보인다. 똬리를 틀어 매복한다.', symbols: ['유혹', '치유', '재생', '지혜', '배신'], culture: '의술의 지팡이를 휘감은 치유의 상징이자, 낙원에서 유혹한 배신자. 동양에선 물·재물을 다스리는 신성한 존재로도 본다.', luck: '양면', staging: '허물벗기를 인물의 변모·재생과 겹쳐 두거나, 신뢰하던 인물 곁에 뱀 이미지를 깔아 배신의 복선으로 삼는다.' },
      { name: '용', ecology: '실재하지 않는 상상의 영물. 동양에선 뱀·물고기·사슴의 특징을 합친 형상으로, 서양에선 날개 달린 거대한 도마뱀으로 그려진다.', behavior: '동양 용은 구름과 비를 부르고 강·바다를 다스린다. 서양 용은 보물을 지키며 불을 뿜는다.', symbols: ['권력', '수호', '재앙', '지혜'], culture: '동양에선 황제와 길조, 강수를 주관하는 신성. 서양에선 영웅이 무찔러야 할 탐욕스러운 괴물로 정반대 위치를 차지한다.', luck: '양면', staging: '같은 "용"이라도 동/서 해석이 충돌함을 이용해, 한 진영엔 수호신·다른 진영엔 재앙으로 받아들여지는 문화 충돌의 핵으로 배치한다.' },
      { name: '거북', ecology: '단단한 등딱지로 몸을 보호하는 장수 동물. 느리지만 매우 오래 산다.', behavior: '위험 시 머리와 다리를 등딱지 안으로 거둔다. 산란을 위해 먼 바다를 회유한다.', symbols: ['장수', '인내', '우주', '느림의 지혜'], culture: '동아시아 사신 중 북방을 지키는 현무의 바탕. 여러 창조 신화에서 세계를 등에 인 태고의 받침으로 등장한다.', luck: '길', staging: '서두르는 인물 곁에 느린 거북을 두어 "느림이 도리어 끝까지 간다"는 주제를 행동 대비로 보여 준다.' },
      { name: '개구리', ecology: '물과 뭍을 오가는 양서류. 알→올챙이→개구리로 극적으로 변태한다.', behavior: '비가 오기 전 요란하게 운다. 봄에 깨어나 알을 낳는다.', symbols: ['변태', '다산', '재생', '정화'], culture: '풍요·비를 부르는 길조로 농경 문화에서 환영받는다. 변태의 극적 과정은 영혼의 변화·정화의 비유로 쓰인다.', luck: '길', staging: '올챙이에서 개구리로의 변태를 인물의 정체성 변화와 겹쳐, 같은 존재가 전혀 다른 형태로 거듭나는 성장의 은유로 깐다.' },
      { name: '도마뱀', ecology: '꼬리가 잘려도 다시 자라는 파충류. 위협받으면 꼬리를 끊고 달아난다.', behavior: '햇볕에 몸을 데우고, 위험할 때 꼬리를 자기 절단(자절)해 목숨을 건진다.', symbols: ['재생', '적응', '버림과 회복', '민첩'], culture: '꼬리를 버리고 살아남는 속성에서 "희생과 재생"의 상징이 됐다. 여러 토착 전승에서 변신·치유의 동물로 등장한다.', luck: '길', staging: '인물이 무언가(지위·관계·과거)를 잘라 내고 살아남는 결단을, 꼬리를 끊고 달아나는 도마뱀에 겹쳐 보여 준다.' },
      { name: '두꺼비', ecology: '거칠고 사마귀 같은 피부를 지닌 양서류. 피부에서 독을 분비해 자신을 지킨다.', behavior: '느리게 움직이며 밤에 활동한다. 위협받으면 몸을 부풀린다.', symbols: ['독', '변신', '재물', '불길'], culture: '동아시아 설화에서 달에 사는 두꺼비, 재물을 부르는 영물로 등장한다. 추한 외양 탓에 마법·금기와도 결부된다.', luck: '양면', staging: '추한 두꺼비가 사실은 변신한 귀인이라는 옛 모티프를 빌려, 외양으로 사람을 판단하는 인물의 편견을 시험하는 장치로 쓴다.' },
      { name: '악어', ecology: '물가에 매복하는 거대한 파충류. 물속에서 눈만 내놓고 먹이를 기다린다.', behavior: '먹이를 물어 물속으로 끌고 들어가 회전시킨다. 거짓 눈물을 흘린다는 통념이 있다.', symbols: ['위선', '매복', '원시적 위협', '인내'], culture: '"악어의 눈물"이라는 표현으로 거짓 슬픔·위선의 대명사가 됐다. 고대 일부 문화에선 강의 신으로 숭배되기도 했다.', luck: '흉', staging: '겉으로 우는 인물의 진심을 의심케 하고 싶을 때, "악어의 눈물"을 직접 쓰지 않고 물가의 악어 한 마리로 암시한다.' },
    ],
  },
  {
    key: 'aquatic', label: '물고기·바다 생물', icon: '🐟', note: '무의식·풍요·심연',
    items: [
      { name: '물고기', ecology: '물속에서 사는 척추동물의 총칭. 떼를 이루어 헤엄치며 빠르게 번식한다.', behavior: '무리(어군)를 지어 포식자를 혼란시키고, 물의 흐름을 따라 회유한다.', symbols: ['풍요', '무의식', '다산', '신앙'], culture: '여러 문화에서 다산과 번영의 상징. 초기 기독교에선 신앙의 은밀한 표식이었고, 동아시아에선 출세·잉어의 비유로도 쓰인다.', luck: '길', staging: '물고기 떼가 한순간 방향을 바꾸는 장면으로 군중·여론의 급변을 비유하거나, 잡히지 않는 물고기로 손에서 빠져나가는 욕망을 그린다.' },
      { name: '고래', ecology: '바다에 사는 거대한 포유류. 노래하듯 멀리까지 소리로 소통하고 깊이 잠수한다.', behavior: '수면 위로 거대한 몸을 솟구쳤다 떨어뜨린다(브리칭). 무리를 지어 회유한다.', symbols: ['광대함', '무의식', '삼킴', '재생'], culture: '거대한 물고기에게 삼켜졌다 사흘 만에 토해진 예언자 설화에서, 고래는 죽음 같은 시련과 재생의 통로로 상징된다.', luck: '양면', staging: '인물이 거대한 위기에 "삼켜졌다" 다시 나오는 구조를, 고래 뱃속 모티프에 기대어 시련-재생의 통과의례로 배치한다.' },
      { name: '돌고래', ecology: '지능이 높은 해양 포유류. 초음파로 주변을 인식하고 무리로 협동한다.', behavior: '물에 빠진 존재를 밀어 올린다는 목격담이 많아 "구원자" 이미지가 굳었다. 유희를 즐긴다.', symbols: ['구원', '지성', '유희', '길잡이'], culture: '고대 지중해 전승에서 표류자를 뭍으로 인도하는 친구이자 신의 사자로 그려졌다. 즐겁게 노는 모습에서 기쁨의 상징이 됐다.', luck: '길', staging: '절망에 빠진 인물 곁에 돌고래를 등장시켜 구원의 손길을 예감케 하거나, 그 유희를 통해 잠시 숨 돌리는 정서적 쉼표로 쓴다.' },
      { name: '상어', ecology: '바다의 정점 포식자. 먼 거리의 핏기와 미세한 진동을 감지한다.', behavior: '끊임없이 헤엄쳐야 숨 쉴 수 있는 종이 많아 "멈추면 죽는" 존재로 통한다.', symbols: ['공포', '냉혹', '멈출 수 없음', '원시적 욕망'], culture: '근대 대중문화에서 바다의 공포 그 자체로 각인됐다. 일부 해양 문화에선 조상의 화신·수호신으로 숭배되기도 한다.', luck: '흉', staging: '"멈추면 죽는다"는 속성을 야망에 사로잡혀 결코 멈추지 못하는 인물과 겹쳐, 성공의 강박을 상어의 헤엄에 비유한다.' },
      { name: '문어', ecology: '여덟 개의 다리를 지닌 두족류. 색과 질감을 바꿔 주변에 녹아들고 좁은 틈도 통과한다.', behavior: '위협받으면 먹물을 뿜고 달아난다. 도구를 다룰 만큼 영리하다.', symbols: ['지능', '은밀', '다면성', '집착'], culture: '여러 팔로 모든 것을 움켜쥐는 형상에서 "거대 조직·문어발 확장"의 비유로 쓰인다. 신화에선 심연의 괴물로도 그려진다.', luck: '양면', staging: '여러 곳에 손을 뻗친 막후 권력자를 직접 설명하는 대신, 문어발처럼 얽힌 도식이나 이미지로 그 다면적 지배를 암시한다.' },
      { name: '잉어', ecology: '민물에 사는 강인한 물고기. 거센 물길을 거슬러 오르는 힘이 있다.', behavior: '폭포 같은 급류를 거슬러 뛰어오르려 거듭 시도한다.', symbols: ['입신출세', '인내', '도약', '변신'], culture: '거센 폭포(용문)를 뛰어넘은 잉어가 용이 된다는 전승에서, 노력 끝의 입신출세·극적 신분 상승의 상징이 됐다.', luck: '길', staging: '거듭 떨어지면서도 다시 뛰어오르는 잉어를, 시험·관문을 앞둔 인물의 좌절과 재도전에 겹쳐 두면 "도약 직전"의 긴장을 깐다.' },
      { name: '해마', ecology: '수컷이 새끼를 품어 기르는 독특한 어류. 꼬리로 해초를 감고 천천히 떠다닌다.', behavior: '수컷의 육아낭에서 알이 부화한다. 평생 한 짝과 지내는 종이 있다.', symbols: ['뒤바뀐 역할', '인내', '연약한 보호', '느림'], culture: '수컷이 임신·출산을 맡는 보기 드문 생태에서, 고정된 성 역할을 뒤집는 상징으로 인용된다.', luck: '중립', staging: '전통적 역할이 뒤바뀐 가족·관계를 그릴 때, 새끼를 품은 수컷 해마를 잔잔한 상징물로 배경에 놓는다.' },
      { name: '해파리', ecology: '뇌도 심장도 없이 떠다니는 젤리질의 바다 생물. 촉수에 독침을 지닌 종이 많다.', behavior: '물살에 몸을 맡겨 표류하며, 닿는 것을 독침으로 마비시킨다.', symbols: ['투명함', '수동성', '아름다운 위험', '덧없음'], culture: '아름답고 투명하지만 닿으면 쏘는 양면성에서, "매혹적이나 위험한 것"의 비유로 쓰인다.', luck: '양면', staging: '흐름에 떠밀리듯 수동적으로 살던 인물이, 닿는 이마다 무심코 상처 입히는 양면을 해파리의 투명한 독침에 겹친다.' },
    ],
  },
  {
    key: 'insect', label: '곤충·거미·작은 생물', icon: '🦋', note: '변신·근면·덧없음',
    items: [
      { name: '나비', ecology: '알→애벌레→번데기→나비로 완전 변태하는 곤충. 짧은 성충기를 산다.', behavior: '번데기 속에서 몸을 완전히 재구성한 뒤 날개를 펴고 나온다. 꽃을 옮겨 다닌다.', symbols: ['변신', '영혼', '덧없음', '부활'], culture: '여러 문화에서 죽은 이의 영혼이나 환생의 화신으로 본다. 번데기에서의 변태는 영적 거듭남의 대표 비유다.', luck: '길', staging: '인물의 결정적 변화 직후 나비 한 마리가 창에 앉게 하면, 거듭남을 한 컷의 이미지로 봉인할 수 있다.' },
      { name: '거미', ecology: '실을 잣아 그물을 치는 절지동물. 거미줄로 먹이를 가두고 진동으로 사냥을 감지한다.', behavior: '정교한 그물을 짓고 가운데서 진동을 기다린다. 일부 종은 짝짓기 후 수컷을 잡아먹는다.', symbols: ['창조', '운명', '덫', '인내'], culture: '실을 잣는 직조자로 운명·창조의 여신과 결부된다. 동시에 그물=함정의 이미지로 음모·덫의 상징이기도 하다.', luck: '양면', staging: '음모를 꾸미는 인물을 "그물 한가운데 앉아 진동을 기다리는 거미"로 그려, 누가 거미줄에 걸려드는지 독자가 조마조마하게 한다.' },
      { name: '벌', alias: '꿀벌', ecology: '여왕을 중심으로 고도로 조직된 군집 곤충. 분업이 철저하고 춤으로 꽃의 위치를 알린다.', behavior: '쉴 새 없이 꽃을 오가 꿀을 모으고, 침입자에게 침을 쏘며 군집을 지킨다.', symbols: ['근면', '공동체', '질서', '달콤함'], culture: '부지런함과 사회적 협동의 대명사. 일부 전통에선 영혼의 전령이나 부활의 상징으로도 본다.', luck: '길', staging: '완벽히 분업된 사회를 벌집 질서에 빗대 두고, 한 마리가 그 질서를 이탈하는 순간을 체제 균열의 복선으로 삼는다.' },
      { name: '나방', ecology: '주로 밤에 활동하는 나비의 친척. 불빛을 향해 끝없이 몰려든다.', behavior: '불빛에 이끌려 위험을 무릅쓰고 달려든다(주광성). 어두운 색으로 위장한다.', symbols: ['집착', '자기파멸', '덧없음', '치명적 끌림'], culture: '"불을 향해 뛰어드는 나방"은 파멸을 알면서도 멈추지 못하는 치명적 욕망의 대표 비유다.', luck: '흉', staging: '파국으로 향하는 줄 알면서도 사랑·욕망에 끌리는 인물을, 등불에 부딪히는 나방으로 반복해 보여 주면 결말의 비극을 예고한다.' },
      { name: '개미', ecology: '거대한 군집을 이루어 사는 사회성 곤충. 자기 몸의 여러 배를 들어 옮긴다.', behavior: '냄새길을 따라 줄지어 먹이를 나르고, 겨울을 대비해 부지런히 비축한다.', symbols: ['근면', '협동', '예비', '끈기'], culture: '여름내 일해 겨울을 대비하는 우화로 근면·미래 대비의 상징이 됐다. 거대 군집은 개체를 초월한 "초유기체"로 인용된다.', luck: '길', staging: '눈앞의 향락에 빠진 인물과, 묵묵히 미래를 비축하는 인물을 베짱이-개미 대비로 배치해 가치관 충돌을 그린다.' },
      { name: '반딧불이', alias: '개똥벌레', ecology: '스스로 빛을 내는 야행성 딱정벌레. 짝을 부르려 배 끝을 점멸한다.', behavior: '여름밤 짝짓기 신호로 정해진 리듬으로 반짝인다. 깨끗한 환경에서만 산다.', symbols: ['덧없는 빛', '희망', '기억', '순수'], culture: '여름밤의 정취와 짧은 생의 아름다움을 표상한다. 사라져 가는 청정함의 상징으로 환경·향수와 결부된다.', luck: '길', staging: '점점 줄어드는 반딧불이의 불빛으로 떠나가는 시절·사라지는 순수를 비추고, 마지막 한 점의 명멸로 여운을 남긴다.' },
      { name: '사마귀', ecology: '앞다리를 기도하듯 모은 채 매복하는 포식 곤충. 위장에 능하다.', behavior: '미동도 없이 기다렸다 순식간에 사냥한다. 일부 암컷은 짝짓기 중 수컷을 잡아먹는다.', symbols: ['치명적 유혹', '기다림', '잔혹', '위장'], culture: '"기도하는" 듯한 자세와 짝을 삼키는 생태가 겹쳐, 경건한 외양 뒤의 잔혹함·치명적 매혹의 상징이 됐다.', luck: '흉', staging: '경건하고 매혹적인 인물의 자세 뒤에 사마귀 이미지를 깔아, 다가가는 상대를 삼킬 위험을 독자에게만 흘린다.' },
      { name: '매미', ecology: '여러 해를 땅속에서 애벌레로 지내다 잠깐 지상에 올라 우는 곤충. 허물을 남기고 날아간다.', behavior: '땅속에서 긴 잠복기를 보낸 뒤 짧은 여름 한철 격렬히 울다 죽는다.', symbols: ['덧없음', '인내 후의 절정', '부활', '여름'], culture: '동아시아에서 허물을 벗고 깨끗한 이슬만 먹는다 하여 청렴·재생의 상징으로 쓰였다. 짧고 강렬한 성충기는 무상함을 표상한다.', luck: '길', staging: '오랜 무명·잠복 끝에 짧게 폭발하는 인물의 전성기를, 수년 땅속에 있다 한철 우는 매미의 일생에 겹쳐 보여 준다.' },
      { name: '잠자리', ecology: '두 쌍의 투명한 날개로 정교하게 나는 곤충. 공중에서 정지·후진까지 한다.', behavior: '물가에서 짝짓기하고 빠르게 방향을 바꾸며 곤충을 사냥한다. 애벌레는 물속에서 자란다.', symbols: ['변화', '순간', '가벼움', '환영'], culture: '물에서 공중으로 삶의 무대를 옮기는 변태에서 변화·전환의 상징이 된다. 동아시아 일부에선 길조로도 본다.', luck: '길', staging: '한자리에 머무르지 못하고 끊임없이 방향을 바꾸는 인물의 가벼움·불안정을, 정지비행하는 잠자리 이미지로 가볍게 비춘다.' },
    ],
  },
  {
    key: 'domestic', label: '가축·반려·일상 동물', icon: '🐕', note: '충성·희생·일상의 결',
    items: [
      { name: '개', ecology: '인간과 가장 오래 함께한 동물. 후각이 뛰어나고 무리(가족)에 강한 유대를 보인다.', behavior: '주인을 따르고 위험을 알리며 영역을 지킨다. 감정 표현이 풍부하다.', symbols: ['충성', '우정', '보호', '복종'], culture: '여러 신화에서 저승의 문을 지키는 수문장으로 등장한다. 동시에 인간 곁의 변치 않는 동반자·충성의 대명사다.', luck: '길', staging: '인물보다 먼저 죽음·위험을 감지하는 개를 두어, 개의 이상 행동만으로 다가오는 사건을 독자가 먼저 직감하게 한다.' },
      { name: '고양이', ecology: '독립적인 소형 육식 동물. 야행성에 가깝고 좁은 곳·높은 곳을 좋아한다.', behavior: '제 뜻대로 다가왔다 멀어지며, 사냥 본능으로 움직이는 것을 쫓는다.', symbols: ['독립', '신비', '행운/불운', '관능'], culture: '고대 일부 문화에선 신성한 수호 동물로 숭배됐고, 다른 시대엔 마녀의 동물로 박해받았다. 검은 고양이의 길흉은 지역마다 정반대다.', luck: '양면', staging: '인물의 비밀을 유일하게 "지켜본" 고양이를 침묵의 증인으로 두거나, 검은 고양이의 길흉 통념을 뒤집어 반전 소재로 쓴다.' },
      { name: '말', ecology: '빠르게 달리는 초식 가축. 무리 생활을 하며 위험에 민감해 잘 놀란다.', behavior: '위협을 느끼면 즉시 달아나고, 신뢰한 사람을 태운다. 질주할 때 가장 본성에 가깝다.', symbols: ['자유', '힘', '정열', '여정'], culture: '전쟁·이동의 동반자로 영웅과 짝지어진다. 날개 달린 말, 저승으로 데려가는 말 등 이승과 저승을 잇는 매개로도 등장한다.', luck: '길', staging: '인물의 질주하는 욕망·여정을 말의 달림에 겹치고, 그 말이 발을 멈추거나 쓰러질 때 여정의 좌절을 신체적으로 그린다.' },
      { name: '소', alias: '황소', ecology: '되새김질하는 대형 초식 가축. 힘이 세고 인내심이 강하며 농경에 쓰였다.', behavior: '묵묵히 쟁기를 끌고, 화가 나면 뿔을 앞세워 돌진한다.', symbols: ['근면', '희생', '풍요', '우직한 힘'], culture: '농경 문화의 근간이자 풍요·노동의 상징. 여러 신화에서 신성한 제물이거나, 황소로 변신한 신의 모습으로 등장한다.', luck: '길', staging: '묵묵히 일하다 마지막에 제물이 되는 소의 운명을, 헌신만 강요당한 인물의 처지와 겹쳐 조용한 비극을 깐다.' },
      { name: '양', ecology: '무리 지어 사는 온순한 가축. 목자를 따라 이동하고 천적에 무력하다.', behavior: '무리에서 떨어지면 불안해하고, 앞선 양을 무작정 따라간다.', symbols: ['순종', '희생', '순진', '무리'], culture: '인도되는 자·제물의 대표 상징(희생양). 한편 길 잃은 한 마리를 찾는 목자 비유처럼 보살핌의 대상으로도 그려진다.', luck: '길', staging: '맹목적으로 앞선 자를 따르는 군중을 양 떼에 빗대고, 무리에서 이탈한 한 마리로 각성하는 개인을 대비시킨다.' },
      { name: '돼지', ecology: '잡식성 가축. 영리하고 후각이 예민하며 새끼를 많이 낳는다.', behavior: '진흙 목욕으로 체온을 조절한다. 먹이를 잘 찾아내 사냥·탐색에 쓰이기도 한다.', symbols: ['탐욕', '풍요', '다산', '행운'], culture: '동아시아에선 재물·복을 부르는 길한 동물이지만, 다른 문화에선 더러움·탐욕·금기의 동물로 정반대 평가를 받는다.', luck: '양면', staging: '같은 돼지가 한 문화권에선 복덩이로, 다른 문화권에선 금기로 취급됨을 이용해 두 세계의 가치 충돌을 식탁 장면에 압축한다.' },
      { name: '닭', alias: '수탉', ecology: '날지 못하는 가금. 수탉은 새벽에 울어 시각을 알린다.', behavior: '동트기 전 가장 먼저 울어 어둠의 끝을 알린다. 무리에 뚜렷한 서열이 있다.', symbols: ['경계', '새벽', '자만', '각성'], culture: '어둠을 몰아내는 새벽의 전령으로 길조이자, 부정 직전 세 번 운 수탉처럼 배신·각성의 결정적 순간을 표시한다.', luck: '길', staging: '결정적 배신이나 진실의 순간 직전 수탉의 울음을 한 번 끼워 넣어, 어둠의 끝과 각성을 청각으로 봉인한다.' },
      { name: '토끼', ecology: '번식력이 강한 초식 동물. 귀가 크고 청각이 예민하며 빠르게 달아난다.', behavior: '위험을 들으면 즉시 굴로 숨고, 한 해에 여러 번 새끼를 낳는다.', symbols: ['다산', '민첩', '겁', '행운'], culture: '달 속에 사는 토끼(옥토끼) 설화로 달·재생과 결부된다. 봄·다산의 상징인 동시에, 늘 쫓기는 약자의 표상이기도 하다.', luck: '길', staging: '늘 쫓기며 굴로 달아나는 약자의 처지를 토끼에 겹치되, 그 민첩함과 다산을 강자에 맞서는 끈질긴 생존력으로 뒤집을 수 있다.' },
      { name: '나귀', alias: '당나귀', ecology: '말을 닮은 소형 가축. 힘이 좋고 험한 길도 잘 견디며 짐을 진다.', behavior: '고집이 세 위험하다 판단하면 꿈쩍 않는다. 화려함 없이 묵묵히 짐을 나른다.', symbols: ['겸손', '고집', '인내', '우직함'], culture: '화려한 말과 대비되는 겸손의 동물. 평화로운 입성의 탈것으로 등장해 권력의 위세를 뒤집는 겸손의 상징으로 쓰인다.', luck: '길', staging: '위세를 부리는 인물을 말에, 겸손하지만 끝까지 짐을 지는 인물을 나귀에 빗대 외양과 내실의 대비를 만든다.' },
    ],
  },
  {
    key: 'mythic', label: '환수·전설의 동물', icon: '🦄', note: '상상 속에 응축된 인간의 소망과 공포',
    items: [
      { name: '유니콘', alias: '일각수', ecology: '이마에 외뿔이 돋은 상상의 말. 순결한 이만 다가갈 수 있다고 전한다.', behavior: '숲 깊은 곳에 홀로 살며 좀처럼 잡히지 않는다는 이야기로 전승된다.', symbols: ['순결', '희귀', '치유', '닿을 수 없는 이상'], culture: '뿔에 해독·치유의 힘이 있다 믿어졌다. 잡히지 않는 속성에서 "추구하지만 끝내 손에 넣지 못하는 이상"의 비유가 됐다.', luck: '길', staging: '결코 손에 넣을 수 없는 이상이나 사람을 유니콘에 빗대, 인물이 평생 좇지만 닿지 못하는 대상의 상징으로 배치한다.' },
      { name: '그리핀', alias: '취조', ecology: '독수리의 머리·날개와 사자의 몸을 합친 상상의 짐승.', behavior: '보물과 성소를 지키는 수호자로 전해진다. 하늘과 땅의 제왕을 한 몸에 합쳤다.', symbols: ['수호', '권위', '하늘과 땅의 결합', '경계'], culture: '고대 미술에서 왕권·신성한 보물의 파수꾼으로 자주 등장한다. 두 최강 동물의 결합이라 균형·이중성의 상징이기도 하다.', luck: '길', staging: '봉인된 보물·금단의 진실을 지키는 존재로 그리핀을 두어, 그것을 지나야만 핵심에 도달하는 관문 장치로 쓴다.' },
      { name: '인어', ecology: '상반신은 사람, 하반신은 물고기인 상상의 존재. 바닷속에 산다고 전한다.', behavior: '노래로 뱃사람을 홀려 바다로 끌어들인다는 전승과, 인간을 사랑해 비극을 맞는 전승이 공존한다.', symbols: ['치명적 유혹', '이루어질 수 없는 사랑', '경계의 존재', '바다'], culture: '아름다운 노래로 파멸시키는 위험한 유혹자이자, 인간이 되고자 모든 걸 버리는 비극적 사랑의 주인공으로 양분된다.', luck: '양면', staging: '두 세계 어디에도 온전히 속하지 못하는 경계인을 인어에 겹쳐, 사랑을 위해 자기 본질을 버리는 희생의 비극을 깐다.' },
      { name: '켄타우로스', alias: '반인반마', ecology: '상반신은 사람, 하반신은 말인 상상의 종족.', behavior: '대개 거칠고 본능적으로 그려지나, 그중 하나는 현자로서 영웅들을 가르친 스승으로 전한다.', symbols: ['이성과 본능의 충돌', '야성', '스승', '경계'], culture: '인간의 이성과 짐승의 본능이 한 몸에 깃든 존재로, 문명과 야성의 긴장을 표상한다.', luck: '양면', staging: '이성과 충동 사이에서 분열된 인물의 내면을, 반은 사람 반은 짐승인 켄타우로스의 형상에 빗대 시각화한다.' },
      { name: '구미호', alias: '아홉꼬리여우', ecology: '아홉 개의 꼬리를 지닌 늙은 여우 요괴. 오래 묵을수록 꼬리가 늘어난다고 전한다.', behavior: '아름다운 사람으로 둔갑해 사람을 홀린다는 동아시아 전승이 대표적이다.', symbols: ['매혹', '둔갑', '위험한 아름다움', '경계의 욕망'], culture: '인간이 되고 싶어 하는 슬픈 요괴이자, 사람을 해치는 위험한 매혹자로 양면적으로 그려진다.', luck: '양면', staging: '인간이 되고 싶지만 본성을 숨겨야 하는 존재를 구미호에 겹쳐, 매혹과 정체 탄로의 긴장을 로맨스 복선으로 깐다.' },
      { name: '히드라', alias: '머리 아홉 뱀', ecology: '머리를 베면 그 자리에 둘이 돋는 상상의 거대 물뱀.', behavior: '습지에 살며 한 머리가 잘려도 곧 더 많은 머리로 되살아난다.', symbols: ['끝없이 되살아나는 문제', '근절의 어려움', '증식하는 위협'], culture: '"히드라 같은 문제"는 하나를 해결하면 둘이 생기는, 뿌리 뽑기 어려운 골칫거리의 대명사가 됐다.', luck: '흉', staging: '아무리 처리해도 다시 불어나는 부패·소문·세력을 히드라에 빗대, 표면적 해결이 도리어 사태를 키우는 구조를 그린다.' },
      { name: '드래곤(서양 용)', ecology: '날개와 비늘을 지닌 거대한 상상의 파충류. 입에서 불을 뿜는다.', behavior: '동굴 속 보물 위에 똬리를 틀고 잠들어 보물을 지킨다.', symbols: ['탐욕', '시련', '수호하는 위협', '정복해야 할 공포'], culture: '영웅 서사에서 반드시 무찔러야 할 최종 시련이자, 쌓아 둔 보물을 결코 쓰지 않는 무의미한 탐욕의 상징이다.', luck: '흉', staging: '아무도 쓰지 못하게 부(富)와 진실을 깔고 앉은 인물을 보물 위의 드래곤에 빗대, 그 보물에 다가가는 일을 최종 시련으로 만든다.' },
      { name: '바실리스크', alias: '뱀들의 왕', ecology: '눈빛이나 숨결만으로 상대를 죽인다는 상상의 뱀.', behavior: '시선이 마주치는 것만으로 치명적이라 거울로만 상대할 수 있다고 전한다.', symbols: ['시선의 치명성', '맞설 수 없는 공포', '간접 대면'], culture: '"마주 보면 죽는" 속성에서, 정면으로 응시할 수 없는 진실·트라우마의 비유로 인용된다.', luck: '흉', staging: '직시하면 무너지는 진실·과거를, 거울로만 볼 수 있는 바실리스크에 빗대 인물이 그것을 "비스듬히" 마주하게 한다.' },
    ],
  },
  {
    key: 'small', label: '설치류·소형 야생', icon: '🐭', note: '은밀함·생존·전조',
    items: [
      { name: '쥐', ecology: '번식력이 매우 강한 소형 설치류. 어둠과 좁은 틈을 좋아하고 무엇이든 갉는다.', behavior: '밤에 활동하며 위험을 빠르게 감지해 가장 먼저 달아난다(침몰선의 쥐).', symbols: ['교활', '역병', '다산', '은밀함'], culture: '역병을 옮기는 불길한 존재로 두려움의 대상이었으나, 동아시아 십이지에선 영리함·다산의 첫 번째 동물로 길하게 본다.', luck: '양면', staging: '"가라앉는 배에서 쥐가 먼저 떠난다"는 통념을 빌려, 조직이 무너지기 직전 가장 먼저 발을 빼는 인물을 쥐의 이동으로 암시한다.' },
      { name: '박쥐', ecology: '날 수 있는 유일한 포유류. 어둠 속에서 초음파로 길을 찾고 거꾸로 매달려 잔다.', behavior: '동굴·어둠에 무리 지어 살며 황혼에 떼 지어 날아오른다.', symbols: ['어둠', '재생', '불길', '이행'], culture: '서양에선 흡혈·어둠의 동물로 불길하게, 동아시아에선 한자 "복(蝠)"과 발음이 같아 복(福)을 부르는 길조로 정반대로 본다.', luck: '양면', staging: '같은 박쥐 문양이 한 인물에겐 복의 부적, 다른 인물에겐 죽음의 전조로 읽히게 해 두 세계관의 충돌을 한 소품에 담는다.' },
      { name: '다람쥐', ecology: '나무를 잘 타는 작은 설치류. 도토리를 여기저기 묻어 겨울을 대비한다.', behavior: '먹이를 부지런히 저장하지만 묻은 자리를 자주 잊는다(그 덕에 숲이 퍼진다).', symbols: ['예비', '근면', '망각', '뜻밖의 기여'], culture: '겨울을 대비하는 부지런함의 상징인 동시에, "잊어버린 도토리가 숲이 된다"는 데서 무심한 선의·우연한 결실의 비유로 쓰인다.', luck: '길', staging: '인물이 무심코 한 행동(묻어 둔 도토리)이 훗날 뜻밖의 결실로 돌아오는 구조를, 다람쥐의 망각과 숲의 탄생에 겹쳐 깐다.' },
      { name: '두더지', ecology: '땅속에 굴을 파며 사는 동물. 시력은 약하나 촉각과 후각이 발달했다.', behavior: '평생을 어둠 속 굴에서 보내며 흙을 밀어 올려 두둑을 만든다.', symbols: ['은밀한 잠입', '보이지 않는 작업', '내부의 침투', '맹목'], culture: '"두더지"는 조직 내부에 숨어든 첩자를 가리키는 비유로 굳어졌다. 땅 밑에서 보이지 않게 움직이는 속성에서 왔다.', luck: '흉', staging: '조직 안에 잠입한 내통자를 직접 지목하지 않고, 땅 밑에서 솟은 두둑처럼 "보이지 않는 손"의 흔적만 흘려 의심을 키운다.' },
      { name: '족제비', ecology: '날렵하고 좁은 몸을 지닌 소형 육식 동물. 좁은 틈도 통과해 사냥한다.', behavior: '재빠르고 영리하게 닭장 등에 침입한다. 위협 시 고약한 냄새를 풍긴다.', symbols: ['교활', '날렵함', '기회주의', '미꾸라짐'], culture: '"족제비 같다"는 표현은 약삭빠르게 책임을 빠져나가는 태도를 가리킨다. 빠르고 잡기 어려운 속성에서 왔다.', luck: '흉', staging: '책임을 교묘히 빠져나가는 인물의 화법을 "족제비처럼 미끄러지는" 말투로 묘사해, 잡힐 듯 잡히지 않는 인상을 만든다.' },
      { name: '고슴도치', ecology: '온몸이 가시로 덮인 소형 동물. 위협받으면 몸을 둥글게 말아 가시로 방어한다.', behavior: '겁이 많아 위험하면 곧장 공처럼 웅크려 가시만 내보인다. 야행성이다.', symbols: ['방어적 고립', '상처 입기 쉬움', '다가갈 수 없음', '경계'], culture: '"서로의 가시 때문에 너무 가까이 갈 수 없는" 관계의 비유(고슴도치의 딜레마)로 인용된다.', luck: '중립', staging: '상처가 두려워 다가오는 이를 가시로 밀어내는 인물을 고슴도치에 빗대, 친밀과 안전 사이의 거리 두기 갈등을 그린다.' },
      { name: '사슴', ecology: '숲에 사는 우아한 초식 동물. 수컷의 뿔은 해마다 떨어지고 다시 자란다.', behavior: '작은 기척에도 즉시 달아나고, 발정기엔 수컷끼리 뿔을 맞대 겨룬다.', symbols: ['온순', '순수', '재생', '고결'], culture: '뿔이 떨어졌다 다시 자라는 데서 재생·갱신의 상징이 됐다. 숲의 영혼·신의 사자로 그려져 함부로 해치면 화를 부른다고 전한다.', luck: '길', staging: '순수한 존재가 사냥당하는 사슴 사냥 장면으로, 폭력에 무너지는 무구함을 직접 말하지 않고 보여 줄 수 있다.' },
      { name: '오소리', ecology: '굴을 깊고 정교하게 파는 야행성 동물. 한번 자리 잡으면 좀처럼 떠나지 않는다.', behavior: '고집스럽게 자기 굴을 지키며, 위협받으면 물러서지 않고 맞선다.', symbols: ['고집', '끈기', '수비적 용기', '뿌리내림'], culture: '자기 영역을 끝까지 지키는 완강함에서, 물러서지 않는 고집·뚝심의 상징으로 인용된다.', luck: '중립', staging: '한 자리·한 신념을 끝내 떠나지 않는 인물을 오소리의 굴에 빗대, 변화에 맞서는 완강함의 양면(뚝심이자 고립)을 그린다.' },
    ],
  },
]

// ---------- 저장 키 ----------
const LS = 'sry:tool:animal-symbol-ref:'
const ALL = '__all__'
const FAVO = '__favorite__'

const flatAll = (): { cat: CatDef; item: Animal }[] =>
  CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const luckBadge = (l: Animal['luck']): { label: string; color: string } => {
  switch (l) {
    case '길': return { label: '길조', color: 'var(--ok)' }
    case '흉': return { label: '흉조', color: '#d9534f' }
    case '양면': return { label: '양면', color: 'var(--accent)' }
    default: return { label: '중립', color: 'var(--muted)' }
  }
}

const escapeHtml = (str: string) =>
  String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 한 동물을 사람이 읽기 좋은 텍스트로
const toText = (cat: CatDef, a: Animal): string => {
  const lb = luckBadge(a.luck).label
  return [
    `${cat.icon} ${a.name}${a.alias ? ` (${a.alias})` : ''} — ${cat.label} · ${lb}`,
    `상징: ${a.symbols.join(', ')}`,
    `생태: ${a.ecology}`,
    `행동: ${a.behavior}`,
    `문화권 상징: ${a.culture}`,
    `등장 연출: ${a.staging}`,
  ].join('\n')
}

export default function AnimalSymbolRef({ payload }: { payload?: Record<string, unknown> }) {
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
  const [random, setRandom] = useState<{ cat: CatDef; item: Animal } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  // payload 로 특정 동물 검색어를 받으면 적용(연계 진입)
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
        item.ecology.toLowerCase().includes(q) ||
        item.behavior.toLowerCase().includes(q) ||
        item.culture.toLowerCase().includes(q) ||
        item.staging.toLowerCase().includes(q) ||
        item.symbols.some((s) => s.toLowerCase().includes(q)) ||
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
  const stashAnimal = (cat: CatDef, a: Animal) => {
    addToStash({ kind: 'note', label: `${a.name} 상징·생태`, text: toText(cat, a) })
    showToast(`수집함에 ‘${a.name}’ 자료를 담았습니다.`)
  }
  const projectAnimal = (cat: CatDef, a: Animal) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(cat.icon + ' ' + a.name)}${a.alias ? escapeHtml(` (${a.alias})`) : ''}</b> — ${escapeHtml(cat.label)} · ${escapeHtml(luckBadge(a.luck).label)}</p>`,
      `<p><b>상징</b>: ${escapeHtml(a.symbols.join(', '))}</p>`,
      `<p><b>생태</b>: ${escapeHtml(a.ecology)}</p>`,
      `<p><b>행동</b>: ${escapeHtml(a.behavior)}</p>`,
      `<p><b>문화권 상징</b>: ${escapeHtml(a.culture)}</p>`,
      `<p><b>등장 연출</b>: ${escapeHtml(a.staging)}</p>`,
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '동물 상징', title: `${a.name} (동물 상징)`, bodyHtml })
    if (id) showToast(`프로젝트 자료 〈동물 상징〉에 ‘${a.name}’을(를) 추가했습니다.`)
  }
  const snippetAnimal = (cat: CatDef, a: Animal) => {
    // 등장 연출 문장을 바로 쓸 스니펫으로
    addToLibrary('snippets', { text: a.staging, tags: ['동물상징', a.name, cat.label], source: '동물 상징·생태 사전' })
    showToast(`‘${a.name}’ 등장 연출을 스니펫으로 저장했습니다.`)
  }

  // ----- 스타일 -----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const chip: React.CSSProperties = { fontSize: 11, padding: '2px 7px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)' }

  const renderDetail = (cat: CatDef, a: Animal) => {
    const lb = luckBadge(a.luck)
    return (
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {a.symbols.map((s) => <span key={s} style={{ ...chip, borderColor: 'var(--accent)', color: 'var(--text)' }}>#{s}</span>)}
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.55 }}><b style={{ color: 'var(--muted)' }}>생태 </b>{a.ecology}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.55 }}><b style={{ color: 'var(--muted)' }}>행동 </b>{a.behavior}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.55 }}><b style={{ color: 'var(--muted)' }}>문화권 상징 </b>{a.culture}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.55, background: 'var(--paper)', border: '1px dashed var(--border)', borderRadius: 8, padding: '7px 9px' }}>
          <b style={{ color: 'var(--accent)' }}><Emoji e="✍" /> 등장 연출 </b>{a.staging}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
          <button className="minibtn" onClick={() => copy(toText(cat, a), 'full:' + favKey(cat.key, a.name))}>
            {copiedKey === 'full:' + favKey(cat.key, a.name) ? <>✓ 복사됨</> : <><Emoji e="📋" /> 전체 복사</>}
          </button>
          <button className="minibtn" onClick={() => copy(a.staging, 'stage:' + favKey(cat.key, a.name))}>
            {copiedKey === 'stage:' + favKey(cat.key, a.name) ? <>✓ 복사됨</> : <><Emoji e="📋" /> 연출만 복사</>}
          </button>
          <span style={{ ...chip, marginLeft: 'auto', borderColor: lb.color, color: lb.color }}>{lb.label}</span>
        </div>
        {/* 연계 버튼 묶음 */}
        <div className="linkbar" style={{ marginTop: 4 }}>
          <span className="linkbar-label">연계:</span>
          <button className="linkbtn" onClick={() => stashAnimal(cat, a)} title="이 동물의 상징·생태 자료를 플로팅 수집함에 담기"><Emoji e="📎" /> 수집함</button>
          <button className="linkbtn" onClick={() => projectAnimal(cat, a)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈동물 상징〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
          <button className="linkbtn" onClick={() => snippetAnimal(cat, a)} title="등장 연출 문장을 스니펫 라이브러리에 저장"><Emoji e="✂" /> 스니펫 저장</button>
          <button className="linkbtn" onClick={() => openToolLinked('symbolism-dict', { query: a.symbols[0] })} title="색·식물·숫자 등 종합 상징 사전 열기"><Emoji e="🔮" /> 상징 사전</button>
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={hint}>
        동물 <b>{total}종</b>의 생태·행동·문화권 상징/길흉·등장 연출을 모았습니다. 상징·복선·비유에 바로 심어 보세요.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="동물 이름·상징·생태로 검색 (예: 재생, 충성, 야행성, 둔갑)"
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
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 동물</button>
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
            {cat === FAVO ? '★ 아직 즐겨찾기한 동물이 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const fk = favKey(c.key, item.name)
            const isFav = !!favs[fk]
            const isOpen = !!open[fk]
            const lb = luckBadge(item.luck)
            return (
              <div key={fk} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => toggleOpen(fk)}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /></span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</span>
                  {item.alias && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>({item.alias})</span>}
                  <span style={{ ...chip, borderColor: lb.color, color: lb.color, flexShrink: 0 }}>{lb.label}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {item.symbols.slice(0, 3).map((s) => '#' + s).join(' ')}
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

      <div style={hint}>상징은 정답이 아니라 출발점입니다. 문화권에 따라 길흉이 정반대인 동물도 많으니, 의미를 비틀거나 뒤집어 인물·장면에 슬쩍 심어 보세요.</div>
    </div>
  )
}
