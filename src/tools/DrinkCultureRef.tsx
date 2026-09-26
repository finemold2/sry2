// 술·음료 문화 사전 — 시대·문화별 술/차/음료, 주조·양조, 주점·술자리, 음주 예절·풍습, 취기 묘사를
// 모은 완전 로컬 레퍼런스. 장면·계층·관계 묘사용 자료집. 모든 데이터는 자작 요약·표현(백과 베끼기 없음).
// 외부 네트워크/키/미디어 불필요. react 와 './linkbus' 외 import 금지.
import { useEffect, useRef, useState } from 'react'
import { addToStash, addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'drink-culture-ref', name: '술·음료 문화 사전', icon: '🍶', group: '리서치·자료', intro: '시대·문화별 술·차·음료와 주점·음주 예절·취기 묘사로 장면을 살리세요', w: 470, h: 640 }

// ---------- 데이터 타입 ----------
interface Entry {
  name: string      // 항목 이름
  tag?: string      // 곁다리 분류(지역/시대/계열)
  desc: string      // 자작 요약(감각·장면 중심)
}
interface Cat {
  id: string
  title: string
  icon: string
  hint: string
  items: Entry[]
}

// ---------- 자작 데이터 (백과 베끼기 금지, 묘사·장면 활용용 요약) ----------
const CATS: Cat[] = [
  {
    id: 'liquor', title: '술의 종류·묘사', icon: '🍶', hint: '무대 배경·계층 표지',
    items: [
      { name: '맑게 거른 청주', tag: '동아시아', desc: '쌀로 빚어 맑게 가라앉힌 술. 잔에 따르면 옅은 호박빛이 돌고, 한 모금에 곡물의 단내가 코끝을 스친다. 격식 있는 자리에 오른다.' },
      { name: '뿌연 막걸리', tag: '한반도', desc: '발효 찌꺼기가 섞여 우유처럼 뽀얗다. 잔을 흔들면 가라앉은 앙금이 다시 올라온다. 시큼하고 텁텁한 단맛이 농주의 정취를 낸다.' },
      { name: '독하게 내린 증류주', tag: '여러 문화', desc: '한 잔만으로 목구멍이 화끈거리고 숨이 막힌다. 향은 거의 없고 알코올의 날이 곧장 선다. 추위와 시름을 함께 태운다.' },
      { name: '오크통의 위스키', tag: '서양', desc: '나무통에서 오래 숙성해 짙은 황금빛이 돈다. 코를 대면 그을린 나무와 말린 과일, 바닐라 같은 향이 층을 이룬다. 천천히 음미하는 술.' },
      { name: '포도밭의 적포도주', tag: '지중해·서양', desc: '잔을 기울이면 붉은 막이 유리벽을 타고 흐른다. 떫은 기운 뒤로 검은 과일과 가죽 향이 남는다. 식탁과 종교 의식에 함께한다.' },
      { name: '거품 이는 발효 맥주', tag: '여러 문화', desc: '따를 때 흰 거품이 손가락만큼 솟아오른다. 쌉싸름한 홉 향과 빵 같은 곡물 단내가 어우러진다. 노동 뒤의 한 잔.' },
      { name: '꿀로 빚은 봉밀주', tag: '고대·북유럽', desc: '꿀을 발효시켜 묵직하고 달다. 잔을 비우면 입술에 끈적한 단맛이 남는다. 연회의 뿔잔에 담겨 돌려 마신다.' },
      { name: '쌀로 빚은 탁한 술', tag: '동남아시아', desc: '항아리에 빨대를 꽂아 여럿이 둘러앉아 빨아 마신다. 발효 향이 진하고 알싸한 단맛이 돈다. 마을 잔치의 술.' },
      { name: '향신료 데운 와인', tag: '겨울·유럽', desc: '계피와 정향, 오렌지 껍질을 넣어 끓인다. 김이 오르는 잔에서 따뜻한 향이 피어오른다. 추운 거리의 손난로 같은 술.' },
      { name: '대나무에 거른 약주', tag: '동아시아', desc: '약초와 곡물을 함께 빚어 은은한 한약 향이 밴다. 몸을 데우는 술로 여겨 어른의 술상에 오른다.' },
      { name: '선인장 발효주', tag: '중앙아메리카', desc: '걸쭉하고 미끈한 질감에 시큼한 발효 향이 강하다. 호불호가 분명하며, 오래된 의식과 함께 전해진다.' },
      { name: '독한 무색 화주', tag: '동유럽·북방', desc: '얼음처럼 차게 식혀 작은 잔에 단숨에 털어 넣는다. 목을 타고 불덩이가 내려간 뒤 뱃속이 후끈 달아오른다.' },
      { name: '발효 말젖 술', tag: '초원·유목', desc: '시큼하고 톡 쏘며 옅은 거품이 인다. 가죽 부대에서 흔들어 익힌, 길 위의 술. 손님에게 첫 잔으로 권한다.' },
      { name: '과실로 담근 술', tag: '여러 문화', desc: '매실이나 산딸기를 설탕·술에 담가 오래 둔다. 붉거나 노란 빛이 우러나고, 새콤달콤한 향이 잔 위에 떠돈다.' },
    ],
  },
  {
    id: 'tea-soft', title: '차·비주류 음료', icon: '🍵', hint: '맑은 자리·일상 장면',
    items: [
      { name: '우려낸 녹차', tag: '동아시아', desc: '뜨거운 물을 부으면 잎이 천천히 펴지며 연둣빛이 우러난다. 풀 향과 옅은 쌉싸름함이 입안을 맑게 헹군다.' },
      { name: '발효시킨 흑차', tag: '동아시아', desc: '오래 묵힐수록 흙과 나무 같은 깊은 향이 든다. 짙은 갈색 찻물이 묵직하게 목을 넘어간다.' },
      { name: '우유 넣은 홍차', tag: '서양·남아시아', desc: '진하게 우린 홍차에 우유를 부으면 옅은 갈색으로 부드러워진다. 향신료를 넣으면 따뜻한 단내가 퍼진다.' },
      { name: '볶은 보리차', tag: '동아시아', desc: '구수한 곡물 향이 나는 갈색 물. 뜨겁게도 차게도 마시며, 식탁에 늘 놓인 일상의 음료다.' },
      { name: '갈아 만든 코코아', tag: '중앙아메리카·서양', desc: '쓴 카카오를 갈아 데운 음료. 본디 매운 향신료를 더해 마셨고, 뒷날 설탕과 우유로 달콤해졌다.' },
      { name: '진하게 내린 커피', tag: '서아시아·서양', desc: '검고 걸쭉하게 내려 작은 잔에 담는다. 쓴맛 뒤로 탄 듯한 향이 길게 남아 잠을 쫓는다.' },
      { name: '꽃잎 우린 차', tag: '여러 문화', desc: '말린 꽃을 우려 향긋하고 맑다. 옅은 색의 찻물에서 정원의 냄새가 피어오른다. 마음을 가라앉힌다.' },
      { name: '과일 짜낸 즙', tag: '여러 문화', desc: '갓 짜내 과육 알갱이가 떠 있다. 시고 단 향이 입에 닿기 전부터 군침을 돌게 한다.' },
      { name: '약초 달인 탕약', tag: '동아시아', desc: '여러 약초를 오래 달여 쓰고 텁텁하다. 코를 막고 단숨에 들이켠 뒤 단것을 찾게 된다. 병상의 음료.' },
      { name: '꿀 탄 더운물', tag: '여러 문화', desc: '뜨거운 물에 꿀을 풀어 목을 달랜다. 단순하지만 아픈 이나 추위에 떠는 이를 위한 다정한 한 잔.' },
      { name: '발효 유음료', tag: '여러 문화', desc: '시큼하게 발효시킨 젖에 옅은 단맛을 더한다. 톡 쏘면서도 부드러워 속을 편안하게 한다.' },
      { name: '얼음 띄운 식혜', tag: '한반도', desc: '삭힌 쌀알이 동동 뜨고 차갑게 식혀 달다. 잔치 끝에 입가심으로 내는 시원한 단 음료.' },
    ],
  },
  {
    id: 'brewing', title: '주조·양조 과정', icon: '⚗️', hint: '술 만드는 장면·생업',
    items: [
      { name: '누룩 띄우기', tag: '동아시아', desc: '곡물 반죽을 따뜻한 곳에 두어 곰팡이를 피운다. 쿰쿰한 향이 방에 차고, 잘 띄운 누룩은 술맛의 밑천이 된다.' },
      { name: '고두밥 식히기', tag: '동아시아', desc: '쪄낸 밥을 멍석에 펴 김을 날린다. 너무 뜨거우면 효모가 죽기에, 손등으로 온도를 가늠하며 기다린다.' },
      { name: '항아리 발효', tag: '여러 문화', desc: '재료를 독에 담고 천을 덮어 며칠을 둔다. 안에서 보글보글 소리가 나고 시큼한 향이 새어 나오면 익는 신호다.' },
      { name: '맥아 싹틔우기', tag: '서양', desc: '보리를 물에 적셔 싹을 틔운 뒤 말린다. 단내가 도는 맥아를 으깨 끓이면 달큰한 맥즙이 우러난다.' },
      { name: '홉 넣어 끓이기', tag: '서양', desc: '맥즙에 홉을 넣고 오래 끓인다. 쌉싸름한 향이 부엌을 채우고, 끓이는 시간으로 쓴맛의 깊이를 조절한다.' },
      { name: '포도 으깨기', tag: '지중해', desc: '바구니 가득한 포도를 발이나 틀로 짓이긴다. 자줏빛 즙이 통을 채우고 단 향과 함께 발효가 시작된다.' },
      { name: '증류기 내리기', tag: '여러 문화', desc: '발효액을 끓여 오른 김을 식혀 받는다. 첫 방울과 끝 방울은 버리고, 가운데만 받아 독하고 맑은 술을 얻는다.' },
      { name: '오크통 숙성', tag: '서양', desc: '나무통에 담아 어둠 속에서 몇 해를 재운다. 해마다 조금씩 줄고, 통의 향이 술에 배어 색과 맛이 깊어진다.' },
      { name: '용수 박아 거르기', tag: '동아시아', desc: '발효된 술덧에 대나무 통을 박아 맑은 술을 떠낸다. 가라앉히면 청주, 그대로 거르면 탁주가 된다.' },
      { name: '얼려 농축하기', tag: '북방', desc: '발효주를 얼려 얼음을 걷어내면 알코올만 진하게 남는다. 불 없이 추위로 빚는 독한 술.' },
      { name: '꿀과 물 섞기', tag: '고대', desc: '꿀을 물에 풀어 자연의 효모가 깃들기를 기다린다. 며칠이 지나면 거품이 일고 단술이 익어간다.' },
      { name: '맛보며 때 가늠하기', tag: '여러 문화', desc: '발효 중인 술을 한 모금 떠 맛본다. 단맛이 줄고 알싸함이 오르면 거를 때가 됐다는 장인의 직감이 든다.' },
    ],
  },
  {
    id: 'venue', title: '주점·술자리 공간', icon: '🏮', hint: '장소의 소음·냄새·계층',
    items: [
      { name: '저잣거리 주막', tag: '옛 동아시아', desc: '문 앞에 등을 내걸고 술 익는 냄새가 길까지 흐른다. 평상에 길손과 장사꾼이 뒤섞여 잔을 부딪친다. 소문이 오가는 곳.' },
      { name: '연기 자욱한 선술집', tag: '서양', desc: '낮은 천장에 호롱불, 나무 탁자가 끈적인다. 노랫소리와 욕설, 잔 부딪는 소리가 뒤엉킨다. 비밀과 싸움이 함께 자란다.' },
      { name: '격식 있는 요릿집', tag: '동아시아', desc: '방마다 칸을 막아 은밀하다. 정갈한 술상과 시중드는 이가 있고, 셈이 두둑한 자들이 큰 이야기를 나눈다.' },
      { name: '귀족의 연회장', tag: '여러 문화', desc: '긴 식탁에 촛불이 줄지어 타고 은잔이 빛난다. 음악과 춤 사이로 술이 끝없이 채워진다. 화려함 아래 음모가 흐른다.' },
      { name: '항구의 술 창고', tag: '여러 문화', desc: '술통이 천장까지 쌓이고 바닷내와 술내가 섞인다. 뱃사람들이 통에 걸터앉아 마신다. 떠남과 귀향의 냄새.' },
      { name: '뒷골목 밀주집', tag: '근대', desc: '간판도 없이 암호로만 드나든다. 단속을 피해 숨죽인 채 독한 술을 따른다. 위태로운 자유의 공기가 감돈다.' },
      { name: '다관(찻집)', tag: '동아시아', desc: '낮고 단정한 자리, 물 끓는 소리만 또렷하다. 차를 사이에 두고 낮은 목소리로 흥정과 약속이 오간다.' },
      { name: '광장의 노천 카페', tag: '서양·근대', desc: '햇볕 아래 탁자가 줄지어 있고 잔이 부딪는다. 오가는 이를 구경하며 한나절을 보낸다. 만남과 토론의 무대.' },
      { name: '집 마당의 술상', tag: '여러 문화', desc: '멍석을 깔고 둘러앉아 직접 담근 술을 나눈다. 격식 없이 정이 오가고, 밤이 깊도록 노래가 이어진다.' },
      { name: '신전·사원의 헌주', tag: '고대', desc: '신께 바치는 술을 그릇에 따라 땅에 붓는다. 향이 피어오르고, 마시기보다 바치기 위한 술이 다뤄진다.' },
      { name: '귀갓길 포장마차', tag: '근현대', desc: '천막 아래 김이 오르고 등불이 흔들린다. 낯선 이끼리 어깨를 맞대고 하루의 고단함을 한 잔에 푼다.' },
      { name: '왕궁의 어연', tag: '동아시아', desc: '엄격한 자리 차례에 따라 잔이 돈다. 한 잔의 순서와 방향에도 위계가 담겨, 술보다 격식이 무겁다.' },
    ],
  },
  {
    id: 'etiquette', title: '음주 예절·풍습', icon: '🥂', hint: '문화 차이·인물 행동',
    items: [
      { name: '연장자 먼저 권하기', tag: '동아시아', desc: '윗사람의 잔을 두 손으로 먼저 채운다. 자기 잔을 스스로 따르는 것은 외로움이나 무례로 비친다.' },
      { name: '고개 돌려 마시기', tag: '한반도', desc: '윗사람 앞에서는 몸을 옆으로 틀고 잔을 가려 마신다. 정면으로 들이켜는 것을 결례로 여긴다.' },
      { name: '눈 맞추며 건배', tag: '유럽', desc: '잔을 부딪칠 때 상대의 눈을 본다. 시선을 피하면 불운이 따른다는 믿음이 농담처럼 전해진다.' },
      { name: '첫 잔은 신에게', tag: '고대', desc: '마시기 전 몇 방울을 땅이나 불에 붓는다. 보이지 않는 이들과 먼저 나눈다는 뜻을 담는다.' },
      { name: '잔 돌려 마시기', tag: '여러 문화', desc: '하나의 잔이나 뿔을 차례로 돌려 마신다. 같은 그릇으로 마심으로써 한편임을 확인한다.' },
      { name: '술잔은 비워 보이기', tag: '여러 문화', desc: '권한 술을 단숨에 비우고 빈 잔을 들어 보인다. 사양 없이 받는 것이 신뢰의 표시로 통한다.' },
      { name: '석 잔을 사양하다 받기', tag: '동아시아', desc: '처음 권하면 한두 번 물린 뒤에 받는다. 곧장 받으면 가벼이 보이는 격식이 있다.' },
      { name: '주량을 숨기기', tag: '여러 문화', desc: '취한 기색을 드러내지 않는 것이 점잖음으로 여겨진다. 정신을 잃는 일은 큰 흉이 된다.' },
      { name: '취중진담 헤아리기', tag: '여러 문화', desc: '술자리에서 나온 말의 무게를 두고 셈한다. 다음 날 모른 척할지, 약속으로 새길지가 미묘하다.' },
      { name: '주모·주인에게 인사', tag: '여러 문화', desc: '자리에 들고 날 때 술 내는 이에게 예를 차린다. 단골의 정과 외상의 신용이 이 인사에서 자란다.' },
      { name: '잔 비기 전에 채우기', tag: '동아시아', desc: '상대 잔이 마르기 전에 미리 따른다. 빈 잔을 오래 두는 것은 무심함으로 비친다.' },
      { name: '금주의 자리', tag: '여러 문화', desc: '신앙이나 상중(喪中)으로 술을 입에 대지 않는다. 권하지 않는 배려가 곧 예의가 된다.' },
    ],
  },
  {
    id: 'drunk', title: '취기 단계·묘사', icon: '🥴', hint: '점점 취해가는 인물',
    items: [
      { name: '발그레 오르는 첫 잔', desc: '뺨이 따뜻해지고 말수가 조금 는다. 긴장이 풀리며 웃음이 헤퍼진다. 아직 또렷한, 가장 기분 좋은 단계.' },
      { name: '말이 많아지는 흥', desc: '목소리가 커지고 손짓이 헤프다. 평소 못 하던 말을 농담처럼 흘리고, 옆 사람과 금세 가까워진다.' },
      { name: '눈이 풀리는 거나함', desc: '시선의 초점이 느슨해지고 동작이 반 박자 늦다. 같은 말을 되풀이하면서도 정작 본인은 모른다.' },
      { name: '비틀거리는 만취', desc: '걸음이 옆으로 쏠리고 벽을 짚는다. 혀가 꼬여 말이 뭉개지고, 감정이 둑 터지듯 쏟아진다.' },
      { name: '울거나 웃는 감정 폭발', desc: '사소한 일에 눈물이 나거나 깔깔 웃는다. 억눌렀던 속내가 술기운에 밀려 한꺼번에 새어 나온다.' },
      { name: '곯아떨어진 잠', desc: '탁자에 엎드려 잠들거나 자리에서 무너진다. 흔들어도 깨지 않고, 누군가 들쳐 업어야 한다.' },
      { name: '술 깬 뒤의 숙취', desc: '관자놀이가 욱신거리고 입안이 텁텁하다. 간밤의 기억이 토막 나 있고, 어제 한 말을 더듬어 후회한다.' },
      { name: '취하지 않은 척', desc: '또렷이 굴려고 애쓰지만 발음 끝이 흐릿하다. 똑바로 걸으려 할수록 부자연스럽고, 주변은 이미 눈치챘다.' },
      { name: '주사(酒邪)의 돌변', desc: '평소와 딴사람처럼 시비를 걸거나 울먹인다. 술이 가린 본성이 드러나, 자리의 분위기를 깨뜨린다.' },
      { name: '한 잔도 못 견디는 약한 술', desc: '몇 모금에 얼굴이 새빨개지고 숨이 가쁘다. 손사래를 치며 물러앉아, 약한 주량이 곧 놀림이 되기도 한다.' },
      { name: '아무리 마셔도 끄떡없는', desc: '연거푸 비워도 흐트러짐이 없다. 좌중이 다 무너진 뒤에도 홀로 또렷해, 두려움 섞인 감탄을 산다.' },
      { name: '취기 속의 다짐', desc: '술기운에 큰소리로 맹세하거나 결심한다. 그 자리에선 진심이나, 술이 깨면 흐릿해지는 약속.' },
    ],
  },
  {
    id: 'social', title: '술자리 속 관계·계층', icon: '🤝', hint: '인물 관계를 술로 드러내기',
    items: [
      { name: '윗사람이 따라 주는 잔', desc: '권력자가 손수 술을 따른다. 받는 이는 황송함과 부담을 동시에 느낀다. 호의인지 시험인지 가늠하게 된다.' },
      { name: '아랫사람의 첨잔', desc: '낮은 자리의 사람이 부지런히 잔을 채운다. 충성의 표시이자, 자기 잔은 비어 있기 쉬운 위계의 풍경.' },
      { name: '화해의 술', desc: '말없이 잔을 채워 건넨다. 사과도 변명도 없이, 받아 마시는 것으로 앙금이 녹는다. 대사 없는 용서.' },
      { name: '의절의 마지막 잔', desc: '한 잔을 끝으로 인연을 끊는다. 비운 잔을 엎어 놓거나 깨뜨려, 다시 보지 않겠다는 뜻을 새긴다.' },
      { name: '거래를 봉하는 술', desc: '흥정이 끝나면 잔을 부딪쳐 약속을 굳힌다. 종이보다 무거운 구두의 맹세로 통한다.' },
      { name: '술로 떠보는 본심', desc: '취하게 해 속내를 끌어낸다. 권하는 잔마다 의도가 숨어 있고, 받는 이는 정신을 붙들려 애쓴다.' },
      { name: '끼지 못한 자의 잔', desc: '겉도는 이는 혼자 잔만 비운다. 무리의 웃음 밖에서, 술이 외로움을 더 또렷하게 한다.' },
      { name: '대신 마셔 주는 우정', desc: '약한 이를 위해 대신 잔을 받는다. 말없는 비호이자, 끈끈함을 드러내는 사소한 의리.' },
      { name: '첫 술을 함께한 사이', desc: '누군가의 첫 잔을 곁에서 지켜본 이는 특별히 기억된다. 어른의 문턱을 함께 넘은 증인이 된다.' },
      { name: '외상 장부의 신용', desc: '셈은 다음으로 미루고 이름만 적는다. 외상이 쌓일수록 주인과의 정이자 약점이 함께 자란다.' },
      { name: '술자리의 위계 차례', desc: '누가 먼저 마시고 누가 따르는지로 서열이 드러난다. 잔이 도는 방향에 보이지 않는 질서가 흐른다.' },
      { name: '술 못 마시는 자리의 곤란', desc: '권하는 분위기 속에서 거절해야 하는 처지. 신앙·건강·다짐 사이에서 인물의 결을 드러낼 수 있다.' },
    ],
  },
  {
    id: 'scene', title: '술·음료 장면 글감', icon: '✏️', hint: '바로 쓰는 묘사 단서',
    items: [
      { name: '혼자 따르는 잔', desc: '아무도 없는 방에서 스스로 잔을 채우는 장면으로 인물의 고독을 그려보세요. 무엇을 떠올리며 마시는가.' },
      { name: '첫 술을 배우는 밤', desc: '어른에게 처음 술을 받는 순간을 써보세요. 떨림, 기대, 어색함 사이에서 인물이 어떻게 행동하는가.' },
      { name: '독이 든 잔', desc: '화려한 술자리 아래 흐르는 살의를 잔 하나로 감춰보세요. 누가 권하고, 누가 망설이는가.' },
      { name: '취중에 새는 비밀', desc: '술기운에 무심코 흘린 말이 판을 뒤집는 장면을 써보세요. 듣는 이의 표정 변화를 함께.' },
      { name: '술 깬 아침의 후회', desc: '간밤의 기억을 더듬는 인물의 아침을 그려보세요. 흩어진 잔과 토막 난 기억, 머뭇거리는 사과.' },
      { name: '마지막으로 함께 마신 술', desc: '평범한 한 잔에 작별의 무게를 실어보세요. 누구도 헤어짐을 입에 올리지 않는다.' },
      { name: '계급이 갈리는 술상', desc: '같은 자리 다른 술과 잔으로 신분 차이를 드러내보세요. 누구는 은잔, 누구는 사발.' },
      { name: '맛으로 떠오르는 기억', desc: '한 모금에 옛 사람·옛 장소가 떠오르는 순간을 써보세요. 어떤 향이 무엇을 불러오는가.' },
      { name: '권하는 잔을 거절하는 순간', desc: '거듭 권하는 술을 끝내 물리는 인물을 그려보세요. 그 거절이 무엇을 지키려는 것인지.' },
      { name: '함께 술을 빚는 시간', desc: '두 인물이 손을 맞춰 술이나 차를 만드는 동안 관계가 드러나게 해보세요. 기다림과 맛봄 사이.' },
      { name: '취해야만 닿는 진심', desc: '맨정신엔 못 하던 말을 술의 힘으로 꺼내는 장면을 써보세요. 진심인가, 핑계인가.' },
      { name: '엎질러진 술', desc: '쏟아진 잔 하나로 자리의 긴장을 깨뜨려보세요. 누가 닦고, 누가 화내고, 누가 웃는가.' },
    ],
  },
]

const LKEY = 'sry:tool:drink-culture-ref'

// 사용자 추가 항목(자료 보강) — 카테고리별 텍스트 묶음으로 보관
interface UserItem { id: string; cat: string; name: string; desc: string }
function loadUser(): UserItem[] {
  try {
    const raw = localStorage.getItem(LKEY)
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p as UserItem[] }
  } catch { /* noop */ }
  return []
}
function saveUser(arr: UserItem[]) {
  try { localStorage.setItem(LKEY, JSON.stringify(arr)) } catch { /* noop */ }
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 검색 매칭
function matches(e: Entry, q: string): boolean {
  if (!q) return true
  const hay = (e.name + ' ' + (e.tag || '') + ' ' + e.desc).toLowerCase()
  return hay.includes(q)
}

export default function DrinkCultureRef({ payload }: { payload?: Record<string, unknown> }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {}
    CATS.forEach((c, i) => { o[c.id] = i < 2 }) // 처음 두 분류만 펼침
    return o
  })
  const [picked, setPicked] = useState<{ cat: Cat; e: Entry } | null>(null)
  const [copiedKey, setCopiedKey] = useState('')
  const [toast, setToast] = useState('')
  const [user, setUser] = useState<UserItem[]>(() => loadUser())
  const [draftCat, setDraftCat] = useState(CATS[0].id)
  const [draftName, setDraftName] = useState('')
  const [draftDesc, setDraftDesc] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 언마운트 정리(타이머 해제)
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    if (copyTimer.current) clearTimeout(copyTimer.current)
  }, [])

  // payload 로 검색어/분류 초기 지정 가능
  useEffect(() => {
    if (!payload) return
    const pq = typeof payload.query === 'string' ? payload.query : ''
    if (pq) setQ(pq)
    const pc = typeof payload.cat === 'string' ? payload.cat : ''
    if (pc && CATS.some((c) => c.id === pc)) setOpen((o) => ({ ...o, [pc]: true }))
  }, [payload])

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2000)
  }

  const bridge = hasProjectBridge()
  const ql = q.trim().toLowerCase()

  // 분류별 표시 항목(자작 + 사용자 추가 병합)
  const catItems = (c: Cat): Entry[] => {
    const extra = user.filter((u) => u.cat === c.id).map<Entry>((u) => ({ name: u.name, tag: '내가 추가', desc: u.desc }))
    return [...c.items, ...extra]
  }

  const filteredCats = CATS.map((c) => ({ cat: c, items: catItems(c).filter((e) => matches(e, ql)) }))
  const totalHits = filteredCats.reduce((n, x) => n + x.items.length, 0)
  const totalItems = CATS.reduce((n, c) => n + c.items.length, 0) + user.length

  // 무작위 뽑기 — 검색 필터 반영
  const drawRandom = () => {
    const pool: { cat: Cat; e: Entry }[] = []
    filteredCats.forEach(({ cat, items }) => items.forEach((e) => pool.push({ cat, e })))
    if (!pool.length) { flash('뽑을 항목이 없습니다.'); return }
    const hit = pool[Math.floor(Math.random() * pool.length)]
    setPicked(hit)
    setOpen((o) => ({ ...o, [hit.cat.id]: true }))
  }

  const entryText = (cat: Cat, e: Entry): string =>
    `[${cat.title}] ${e.name}${e.tag ? ` (${e.tag})` : ''}\n${e.desc}`

  const copyEntry = (cat: Cat, e: Entry, key: string) => {
    const text = entryText(cat, e)
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(key)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopiedKey(''), 1400)
    }).catch(() => {})
  }

  // 연계 1) 수집함에 담기
  const stashEntry = (cat: Cat, e: Entry) => {
    addToStash({ kind: 'note', label: `🍶 ${e.name}`, text: entryText(cat, e) })
    flash('수집함에 담았습니다.')
  }

  // 연계 2) 스니펫 라이브러리 저장
  const snippetEntry = (cat: Cat, e: Entry) => {
    addToLibrary('snippets', { text: entryText(cat, e), tags: ['술·음료', cat.title], source: '술·음료 문화 사전' })
    flash('스니펫으로 저장했습니다.')
  }

  // 연계 3) 프로젝트 자료에 추가
  const projectEntry = (cat: Cat, e: Entry) => {
    if (!bridge) return
    const body = `<p>🍶 <b>${escHtml(e.name)}</b>${e.tag ? ' (' + escHtml(e.tag) + ')' : ''}</p>\n<p>${escHtml(e.desc)}</p>\n<p style="color:#888">분류: ${escHtml(cat.title)}</p>`
    const id = addToProject({
      kind: 'text', root: 'research', folder: '술·음료 문화 자료',
      title: `술·음료 · ${e.name}`, bodyHtml: body,
      meta: { 분류: cat.title, 곁분류: e.tag || '—' },
    })
    if (id) flash('프로젝트 "술·음료 문화 자료" 폴더에 추가했습니다.')
  }

  // 사용자 항목 추가/삭제
  const addUser = () => {
    const name = draftName.trim(), desc = draftDesc.trim()
    if (!name || !desc) { flash('이름과 묘사를 모두 입력하세요.'); return }
    const item: UserItem = { id: 'u_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4).toString(36), cat: draftCat, name, desc }
    const next = [item, ...user]
    setUser(next); saveUser(next)
    setDraftName(''); setDraftDesc('')
    setOpen((o) => ({ ...o, [draftCat]: true }))
    flash('항목을 추가했습니다.')
  }
  const removeUser = (name: string, cat: string) => {
    const next = user.filter((u) => !(u.name === name && u.cat === cat))
    setUser(next); saveUser(next)
    flash('항목을 삭제했습니다.')
  }
  const isUserItem = (cat: Cat, e: Entry): boolean =>
    e.tag === '내가 추가' && user.some((u) => u.cat === cat.id && u.name === e.name)

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 8, padding: 10, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const topRow: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }
  const inputS: React.CSSProperties = { flex: 1, minWidth: 120, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--chrome-2)', color: 'var(--text)', fontSize: 13 }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }
  const catHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', userSelect: 'none', fontSize: 13, fontWeight: 700 }
  const itemS: React.CSSProperties = { padding: '8px 10px', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, lineHeight: 1.5 }
  const tagS: React.CSSProperties = { fontSize: 10.5, color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px', marginLeft: 6 }
  const actRow: React.CSSProperties = { display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }

  return (
    <div style={wrap}>
      {/* 상단: 검색 + 무작위 */}
      <div style={topRow}>
        <input
          style={inputS}
          placeholder="술·차·주점·예절·취기 검색 (예: 막걸리, 건배, 만취, 중세)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && <button className="minibtn" onClick={() => setQ('')}>✕</button>}
        <button className="btn-primary" onClick={drawRandom}><Emoji e="🎲"/> 무작위</button>
      </div>

      {/* 통계 + 항목 추가 토글 + 도구 연계 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{ql ? `검색 결과 ${totalHits}건` : `${CATS.length}개 분류 · 총 ${totalItems}개 항목`}</span>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => setShowAdd((v) => !v)}>{showAdd ? '✕ 닫기' : '➕ 항목 추가'}</button>
        <button className="linkbtn" onClick={() => openToolLinked('world-cuisine-ref')} title="식문화 사전 도구 열기"><Emoji e="🍲"/> 식문화 사전</button>
      </div>

      {/* 항목 추가(CRUD) */}
      {showAdd && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: 9, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <select value={draftCat} onChange={(e) => setDraftCat(e.target.value)} style={{ ...inputS, flex: 'none' }}>
            {CATS.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.title}</option>)}
          </select>
          <input style={{ ...inputS, flex: 'none' }} placeholder="항목 이름" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
          <textarea style={{ ...inputS, flex: 'none', minHeight: 52, resize: 'vertical', fontFamily: 'inherit' }} placeholder="묘사·메모(자작)" value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} />
          <button className="btn-primary" onClick={addUser}>저장</button>
        </div>
      )}

      {/* 무작위 뽑은 항목 */}
      {picked && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: 10, fontSize: 12.5, lineHeight: 1.5 }}>
          <div style={{ marginBottom: 2 }}>
            <b style={{ color: 'var(--accent)' }}><Emoji e={picked.cat.icon}/> {picked.e.name}</b>
            {picked.e.tag && <span style={tagS}>{picked.e.tag}</span>}
          </div>
          <div style={{ color: 'var(--text)' }}>{picked.e.desc}</div>
          <div style={actRow}>
            <button className="minibtn" onClick={() => copyEntry(picked.cat, picked.e, 'pick')}>{copiedKey === 'pick' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
            <button className="linkbtn" onClick={() => stashEntry(picked.cat, picked.e)}><Emoji e="📎"/> 수집함</button>
            <button className="linkbtn" onClick={() => snippetEntry(picked.cat, picked.e)}><Emoji e="🧩"/> 스니펫</button>
            {bridge && <button className="linkbtn" onClick={() => projectEntry(picked.cat, picked.e)}><Emoji e="📄"/> 프로젝트에 추가</button>}
            <button className="minibtn" onClick={() => setPicked(null)}>✕</button>
          </div>
        </div>
      )}

      {/* 분류 목록 */}
      <div style={scroll}>
        {filteredCats.map(({ cat, items }) => {
          if (ql && items.length === 0) return null
          const isOpen = ql ? true : !!open[cat.id]
          return (
            <div key={cat.id}>
              <div style={catHead} onClick={() => !ql && setOpen((o) => ({ ...o, [cat.id]: !o[cat.id] }))}>
                <span>{isOpen ? '▾' : '▸'}</span>
                <span><Emoji e={cat.icon}/></span>
                <span style={{ flex: 1 }}>{cat.title}</span>
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted)' }}>{cat.hint} · {items.length}</span>
              </div>
              {isOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 5 }}>
                  {items.map((e, i) => {
                    const key = cat.id + '_' + i + '_' + e.name
                    return (
                      <div key={key} style={itemS}>
                        <div>
                          <b>{e.name}</b>
                          {e.tag && <span style={tagS}>{e.tag}</span>}
                          {isUserItem(cat, e) && (
                            <button className="minibtn" style={{ float: 'right', padding: '0 6px' }} onClick={() => removeUser(e.name, cat.id)} title="내가 추가한 항목 삭제"><Emoji e="🗑"/></button>
                          )}
                        </div>
                        <div style={{ color: 'var(--muted)', marginTop: 3 }}>{e.desc}</div>
                        <div style={actRow}>
                          <button className="minibtn" onClick={() => copyEntry(cat, e, key)}>{copiedKey === key ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
                          <button className="linkbtn" onClick={() => stashEntry(cat, e)}><Emoji e="📎"/> 수집함</button>
                          <button className="linkbtn" onClick={() => snippetEntry(cat, e)}><Emoji e="🧩"/> 스니펫</button>
                          {bridge && <button className="linkbtn" onClick={() => projectEntry(cat, e)}><Emoji e="📄"/> 프로젝트</button>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        {ql && totalHits === 0 && (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 24, fontSize: 13 }}>
            '{q}'에 해당하는 항목이 없습니다. 다른 말로 검색해 보세요.
          </div>
        )}
      </div>

      {toast && (
        <div style={{ fontSize: 12, color: 'var(--ok)', fontWeight: 600, textAlign: 'center' }}>✓ {toast}</div>
      )}
    </div>
  )
}
