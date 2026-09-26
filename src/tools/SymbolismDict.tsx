// 상징 사전 — 색·동물·식물·숫자·날씨·보석·방위 등 200+ 상징의 의미를 모은 로컬 사전.
// 자급식: 외부 네트워크·라이브러리 없음. Math.random + localStorage(즐겨찾기·마지막 카테고리)만 사용.
import { useState, useEffect, useMemo, useCallback } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'symbolism-dict', name: '상징 사전', icon: '🔮', group: '영감·발상', intro: '색·동물·식물·숫자·날씨·보석·방위의 상징적 의미를 찾아 장면에 심으세요', w: 600, h: 560 }

interface Sym { name: string; meaning: string }
interface CatDef { key: string; label: string; icon: string; items: Sym[] }

// 로컬 상징 사전 — 7개 카테고리, 합계 200+ 항목.
const CATS: CatDef[] = [
  {
    key: 'color', label: '색', icon: '🎨', items: [
      { name: '빨강', meaning: '열정·사랑·분노·위험·생명력. 피와 불의 색으로 강렬한 욕망이나 경고를 상징한다.' },
      { name: '주황', meaning: '활력·따뜻함·창의·사교성. 가을 노을과 결실의 풍요로움을 떠올리게 한다.' },
      { name: '노랑', meaning: '희망·지성·명랑함, 동시에 비겁·배신·질투. 햇빛의 밝음과 경고색의 양면.' },
      { name: '초록', meaning: '생명·성장·자연·치유·평화, 한편으로 미숙함·질투(green-eyed)·부패.' },
      { name: '파랑', meaning: '평온·신뢰·충성·우울. 하늘과 바다의 무한함, 차가운 슬픔(blue)을 함께 품는다.' },
      { name: '보라', meaning: '고귀함·왕권·신비·영성. 귀하던 염료의 역사로 권력과 사치를 상징.' },
      { name: '검정', meaning: '죽음·애도·미지·우아·악. 끝과 공허이자 격조 있는 위엄의 색.' },
      { name: '하양', meaning: '순수·결백·평화·신성, 동시에 공허·죽음(동양의 상복)·차가움.' },
      { name: '회색', meaning: '중립·모호함·우울·노쇠. 흑백 사이의 타협, 결정 못 하는 어중간함.' },
      { name: '금색', meaning: '부·영광·신성·불변. 변치 않는 가치와 신적인 광휘.' },
      { name: '은색', meaning: '달·직관·세련·이차적 영광. 차갑고 우아한 빛, 거울과 환상.' },
      { name: '갈색', meaning: '대지·안정·소박·신뢰, 때로 둔함·낡음. 흙과 나무의 견실함.' },
      { name: '분홍', meaning: '사랑·다정·순진·여성성. 부드러움과 미숙한 낭만.' },
      { name: '청록', meaning: '치유·보호·균형. 바다와 하늘 사이의 신비로운 평온.' },
      { name: '진홍(자홍)', meaning: '희생·권위·열렬한 사랑. 추기경의 색이자 깊은 정념.' },
      { name: '남색(인디고)', meaning: '직관·깊은 사색·신비·권위. 밤하늘 직전의 침잠한 푸름.' },
      { name: '베이지·아이보리', meaning: '차분함·중립·고전·온화함. 시간이 깃든 부드러운 흰빛.' },
      { name: '진주색', meaning: '우아·순결·은은한 광채. 빛에 따라 어른거리는 고요한 빛깔.' },
      { name: '심홍(버건디)', meaning: '성숙한 정열·격조·사치. 깊고 무거운 와인빛 욕망.' },
      { name: '연두', meaning: '새싹·시작·미숙·생동. 봄날 갓 돋은 어린 생명.' },
      { name: '카키·올리브드랍', meaning: '군대·위장·실용·은폐. 자연에 몸을 숨기는 색.' },
      { name: '핏빛(crimson)', meaning: '폭력·희생·치명적 정념. 막 흘린 피의 강렬함.' },
      { name: '잿빛', meaning: '소멸·애도·잔해·체념. 타고 남은 재의 무력함.' },
    ],
  },
  {
    key: 'animal', label: '동물', icon: '🦊', items: [
      { name: '사자', meaning: '용기·왕권·위엄·자존. 백수의 왕으로 지도력과 오만을 함께 상징.' },
      { name: '늑대', meaning: '야성·충성·고독·위협. 무리의 결속과 길들지 않는 자유.' },
      { name: '여우', meaning: '교활함·영리함·기만·매혹. 꾀로 살아남는 트릭스터.' },
      { name: '뱀', meaning: '유혹·치유·재생(허물벗기)·지혜·배신. 죽음과 부활의 양면.' },
      { name: '독수리', meaning: '자유·시야·권력·영적 상승. 하늘의 제왕, 멀리 보는 통찰.' },
      { name: '비둘기', meaning: '평화·순결·성령·연인의 헌신. 화해와 희망의 전령.' },
      { name: '까마귀', meaning: '죽음·예언·지성·불길함. 저승의 전령이자 영리한 관찰자.' },
      { name: '올빼미', meaning: '지혜·밤·죽음의 전조·고독. 어둠 속에서 진실을 보는 눈.' },
      { name: '나비', meaning: '변신·영혼·덧없음·부활. 번데기에서 깨어나는 변화의 상징.' },
      { name: '거미', meaning: '창조·운명·덫·인내. 실을 잣는 직조자이자 함정의 설계자.' },
      { name: '고양이', meaning: '독립·신비·행운/불운·관능. 길들지 않는 영물.' },
      { name: '개', meaning: '충성·우정·보호·복종. 인간 곁의 변치 않는 동반자.' },
      { name: '말', meaning: '자유·힘·정열·여정. 질주하는 본능과 고귀한 동력.' },
      { name: '용', meaning: '권력·수호·재앙·지혜. 동양의 길조와 서양의 괴물, 그 두 얼굴.' },
      { name: '봉황(불사조)', meaning: '재생·불멸·고귀함. 재에서 다시 태어나는 영원의 상징.' },
      { name: '곰', meaning: '힘·모성·동면·재생. 잠들었다 깨어나는 자연의 위력.' },
      { name: '호랑이', meaning: '용맹·위엄·야성·수호. 두려움과 외경을 동시에 일으키는 맹수.' },
      { name: '물고기', meaning: '풍요·무의식·다산·신앙. 물속 깊은 정신세계와 번성.' },
      { name: '사슴', meaning: '온순·순수·재생·고결. 숲의 영혼, 덧없이 아름다운 존재.' },
      { name: '토끼', meaning: '다산·민첩·겁·행운. 달과 봄, 빠른 번식의 상징.' },
      { name: '벌', meaning: '근면·공동체·질서·달콤함. 헌신하는 노동과 사회적 결속.' },
      { name: '나방', meaning: '집착·자기파멸·덧없음. 불빛을 향해 뛰어드는 치명적 끌림.' },
      { name: '백조', meaning: '우아·순결·변신·죽음의 노래. 추한 새끼에서 피어나는 아름다움.' },
      { name: '공작', meaning: '허영·자부·불멸·아름다움. 화려한 깃털 속의 오만과 영광.' },
      { name: '코끼리', meaning: '지혜·기억·인내·위엄. 결코 잊지 않는 거대한 온화함.' },
      { name: '돌고래', meaning: '구원·지성·유희·길잡이. 물에 빠진 자를 인도하는 친구.' },
      { name: '고래', meaning: '광대함·무의식·재생·삼킴. 요나를 삼킨 심연의 거인.' },
      { name: '거북', meaning: '장수·인내·우주·느림의 지혜. 세계를 등에 인 태고의 존재.' },
      { name: '개구리', meaning: '변태·다산·재생·정화. 물과 뭍을 오가는 변화의 상징.' },
      { name: '쥐', meaning: '교활·역병·다산·은밀함. 어둠 속에서 갉아먹는 작은 생존자.' },
      { name: '박쥐', meaning: '어둠·재생·불길·이행. 동양의 복(蝠)과 서양의 흡혈, 그 양면.' },
      { name: '돼지', meaning: '탐욕·풍요·다산·우매, 동시에 행운. 더러움과 번성의 양면.' },
      { name: '양', meaning: '순종·희생·순진·무리. 인도되는 자, 제물이 되는 순한 존재.' },
      { name: '염소', meaning: '욕망·고집·희생양·악마성. 거친 산을 오르는 반항의 짐승.' },
      { name: '수탉', meaning: '경계·새벽·자만·각성. 어둠의 끝을 알리는 울음.' },
      { name: '두꺼비', meaning: '독·변신·재물·불길. 추함 속에 보석을 품은 영물.' },
      { name: '전갈', meaning: '치명·배신·복수·방어. 꼬리에 죽음을 숨긴 침묵.' },
      { name: '학(두루미)', meaning: '장수·고결·행복·천상. 신선이 타고 다니는 길조.' },
      { name: '제비', meaning: '봄·귀향·소식·행운. 멀리 떠났다 반드시 돌아오는 새.' },
      { name: '나귀(당나귀)', meaning: '겸손·고집·인내·우직함. 화려함 없이 짐을 지는 충직함.' },
      { name: '개미', meaning: '근면·협동·예비·끈기. 작지만 미래를 준비하는 노동.' },
      { name: '문어', meaning: '지능·은밀·다면성·집착. 여러 팔로 모든 것을 움켜쥐는 신비.' },
      { name: '사마귀', meaning: '치명적 유혹·기다림·잔혹. 짝을 삼키는 위장한 포식자.' },
    ],
  },
  {
    key: 'plant', label: '식물', icon: '🌿', items: [
      { name: '장미', meaning: '사랑·열정·아름다움·비밀(sub rosa). 가시는 사랑의 고통.' },
      { name: '백합', meaning: '순결·부활·죽음·고귀함. 장례와 성모의 꽃.' },
      { name: '연꽃', meaning: '깨달음·순결·재생. 진흙에서 피어나는 정신의 정화.' },
      { name: '국화', meaning: '고결·은둔·죽음(동양 장례)·장수. 가을의 지조.' },
      { name: '해바라기', meaning: '숭배·충정·낙천·태양. 빛을 따라 도는 한결같음.' },
      { name: '벚꽃', meaning: '덧없음·아름다움·새 출발. 짧게 피고 지는 생의 무상.' },
      { name: '버드나무', meaning: '슬픔·애도·유연함·회복력. 늘어진 가지의 비탄과 끈질김.' },
      { name: '참나무(오크)', meaning: '강인함·인내·지혜·권위. 오래도록 흔들리지 않는 힘.' },
      { name: '담쟁이', meaning: '집착·충실·영속·얽힘. 죽음에도 푸른 끈질긴 애착.' },
      { name: '월계수', meaning: '승리·명예·영광. 승자의 머리에 씌우는 영예의 관.' },
      { name: '올리브', meaning: '평화·화해·풍요. 갈등을 끝내는 화해의 가지.' },
      { name: '양귀비', meaning: '망각·잠·죽음·전몰자 추모. 진홍빛 영면의 꽃.' },
      { name: '튤립', meaning: '완벽한 사랑·고백·덧없는 영화. 빛깔마다 다른 마음.' },
      { name: '제비꽃', meaning: '겸손·정절·수줍은 사랑. 그늘에 숨은 청초함.' },
      { name: '소나무', meaning: '불변·지조·장수. 겨울에도 푸른 절개.' },
      { name: '대나무', meaning: '곧음·절개·유연한 강인함. 휘어도 꺾이지 않는 군자의 덕.' },
      { name: '가시나무', meaning: '고난·보호·시련. 찌르는 방어와 수난의 면류관.' },
      { name: '클로버(네잎)', meaning: '행운·희망·신앙·사랑. 좀처럼 만나기 힘든 행운.' },
      { name: '라벤더', meaning: '평온·치유·헌신·정적. 마음을 가라앉히는 보랏빛 향.' },
      { name: '물망초', meaning: '진실한 사랑·기억·잊지 말아요. 이별 앞의 간청.' },
      { name: '엉겅퀴', meaning: '저항·고결·억셈. 척박함을 견디는 가시 돋친 자존.' },
      { name: '카네이션', meaning: '모성애·존경·순수한 사랑. 어버이를 향한 감사의 꽃.' },
      { name: '데이지', meaning: '순진·천진·새 출발·충실. 들판의 소박한 청순.' },
      { name: '수선화', meaning: '자기애(나르키소스)·재생·봄·고독. 물에 비친 자신에 빠진 꽃.' },
      { name: '동백', meaning: '절개·기다림·비극적 사랑. 송이째 툭 떨어지는 결연함.' },
      { name: '매화', meaning: '인고·고결·이른 봄·지조. 눈 속에 피어나는 군자의 꽃.' },
      { name: '난초', meaning: '고아함·은일·고결·우정. 깊은 골짜기에 홀로 향을 내는 군자.' },
      { name: '히아신스', meaning: '슬픔·후회·놀이·재생. 죽은 청년의 피에서 피어난 추모.' },
      { name: '아네모네', meaning: '덧없는 사랑·기다림·배신. 바람에 쉬이 지는 연약함.' },
      { name: '백일홍(배롱)', meaning: '떠나간 이를 향한 그리움·인내. 오래 붉게 피어 기다리는 마음.' },
      { name: '갈대', meaning: '나약함·순응·고독·바람. 흔들리되 꺾이지 않는 유연함.' },
      { name: '이끼', meaning: '시간·인내·은둔·고요. 오랜 정적 속에 자라는 푸름.' },
      { name: '독초(독말풀 등)', meaning: '위험·유혹·치명·금기. 아름다움 뒤에 숨긴 죽음.' },
      { name: '겨우살이', meaning: '키스·생명·보호·이교의 신성. 겨울에도 푸른 기생의 축복.' },
      { name: '밀(보리 이삭)', meaning: '풍요·부활·노동의 결실·생명의 순환. 죽고 다시 나는 곡식.' },
      { name: '포도(덩굴)', meaning: '풍요·도취·향락·공동체. 술과 축제, 결속의 열매.' },
      { name: '석류', meaning: '다산·풍요·죽음과 부활·유혹. 명부의 씨앗을 품은 붉은 열매.' },
      { name: '사과', meaning: '유혹·지식·불화·사랑. 선악과이자 황금 사과의 다툼.' },
    ],
  },
  {
    key: 'number', label: '숫자', icon: '🔢', items: [
      { name: '0', meaning: '공·무한·시작 이전·잠재. 모든 것과 아무것도 아님.' },
      { name: '1', meaning: '시작·통일·고독·신. 근원이자 유일함.' },
      { name: '2', meaning: '이원성·대립·균형·동반. 음양과 짝.' },
      { name: '3', meaning: '완성·삼위일체·조화·이야기 구조. 안정된 세 다리.' },
      { name: '4', meaning: '안정·사방·물질, 동양에선 죽음(死)과 불길. 견고함의 양면.' },
      { name: '5', meaning: '인간·오감·소우주. 별표(펜타그램)와 균형의 중심.' },
      { name: '6', meaning: '조화·결합·불완전(짐승의 수 666). 사랑과 책임.' },
      { name: '7', meaning: '신성·완전·행운·신비. 일곱 하늘, 일곱 죄악.' },
      { name: '8', meaning: '무한(∞)·재생·번영(동양 부의 수)·균형. 끝없는 순환.' },
      { name: '9', meaning: '완결·성취·임신(아홉 달)·끝맺음. 한 주기의 마지막.' },
      { name: '10', meaning: '완전·질서·완성된 순환. 십계명과 만수.' },
      { name: '12', meaning: '우주적 질서·시간·완전한 주기. 열두 달, 열두 사도.' },
      { name: '13', meaning: '불길·배신·변혁. 최후의 만찬의 열셋 번째.' },
      { name: '40', meaning: '시련·정화·기다림. 광야의 사십 일, 사십 주야의 비.' },
      { name: '100', meaning: '완전·충만·한 세대. 백 년의 완결성.' },
      { name: '1000', meaning: '영원에 가까운·무수·천년왕국. 헤아릴 수 없는 시간.' },
      { name: '11', meaning: '과잉·불균형·계시·전환. 완전(10)을 넘어선 불안정.' },
      { name: '21', meaning: '성년·완성된 성숙·통과의례. 세 번의 7, 책임의 나이.' },
      { name: '33', meaning: '그리스도의 나이·완성·헌신. 가장 높은 영적 마스터의 수.' },
      { name: '36(육육)', meaning: '동양의 길수·천강의 별. 완전한 군세, 삼십육계의 책략.' },
      { name: '49', meaning: '사십구재·중음·정화의 기간. 죽음과 환생 사이 일곱 칠일.' },
      { name: '60(육십갑자)', meaning: '한 주기의 완성·환갑·재시작. 천간지지가 다시 만나는 해.' },
      { name: '666', meaning: '짐승의 수·타락·종말. 인간의 불완전이 극에 달한 표징.' },
      { name: '777', meaning: '완전한 행운·신성·대박. 세 겹의 완전수.' },
      { name: '∞(무한)', meaning: '영원·끝없음·순환·신. 시작도 끝도 없는 고리.' },
    ],
  },
  {
    key: 'weather', label: '날씨·자연현상', icon: '⛅', items: [
      { name: '비', meaning: '정화·슬픔·재생·풍요. 씻어내림과 눈물의 양면.' },
      { name: '폭풍', meaning: '격정·혼란·시련·변혁. 내면의 동요가 하늘로 터진다.' },
      { name: '천둥·번개', meaning: '신의 분노·계시·각성·파괴. 어둠을 가르는 진실의 섬광.' },
      { name: '안개', meaning: '혼란·은폐·미지·경계의 모호함. 진실이 가려진 상태.' },
      { name: '눈', meaning: '순수·죽음·정적·시간의 멈춤. 모든 것을 덮는 백색의 침묵.' },
      { name: '무지개', meaning: '희망·약속·화해·다리. 폭풍 뒤의 언약.' },
      { name: '해돋이', meaning: '시작·희망·부활·각성. 새로운 날의 약속.' },
      { name: '해넘이', meaning: '끝·노년·평온한 작별·죽음. 하루와 생의 황혼.' },
      { name: '바람', meaning: '변화·자유·소식·영혼. 보이지 않으나 모든 것을 움직인다.' },
      { name: '가뭄', meaning: '결핍·영적 메마름·시련. 생명을 말리는 결핍의 시간.' },
      { name: '홍수', meaning: '심판·정화·압도·새 출발. 모든 것을 쓸어내는 재앙과 재생.' },
      { name: '서리', meaning: '냉혹·노쇠·일시적 죽음·아름다운 소멸. 차갑게 굳은 시간.' },
      { name: '구름', meaning: '불확실·우울·신비·변덕. 하늘을 가리는 마음의 그늘.' },
      { name: '햇빛', meaning: '진실·생명·기쁨·계시. 어둠을 몰아내는 명료함.' },
      { name: '달빛', meaning: '직관·환상·낭만·광기. 밤을 다스리는 은빛 이성.' },
      { name: '우박', meaning: '갑작스러운 재앙·냉혹·심판. 하늘이 쏟아내는 차가운 매질.' },
      { name: '이슬', meaning: '덧없음·순수·새 아침·은혜. 해가 뜨면 사라질 짧은 영롱함.' },
      { name: '진눈깨비', meaning: '음울·어중간·궂음. 비도 눈도 아닌 마음의 진창.' },
      { name: '열대야·폭염', meaning: '광기·억압된 욕망·임계점. 잠 못 드는 끈적한 긴장.' },
      { name: '한파(혹한)', meaning: '시련·단절·고립·죽음. 모든 것이 얼어붙는 정지.' },
      { name: '회오리(토네이도)', meaning: '파괴적 변화·휘말림·운명의 소용돌이. 모든 것을 빨아들이는 힘.' },
      { name: '땅거미(황혼)', meaning: '경계·전이·모호·우수. 낮과 밤이 섞이는 푸른 시간.' },
      { name: '새벽', meaning: '희망·각성·시작·고요한 결의. 어둠이 가장 짙은 직전의 빛.' },
      { name: '한밤(자정)', meaning: '경계·마법·전환·고독. 하루가 죽고 다시 태어나는 시각.' },
      { name: '오로라', meaning: '경이·초월·드문 계시. 극지에 드리운 천상의 장막.' },
      { name: '월식·일식', meaning: '불길·전조·질서의 일시 붕괴. 빛이 삼켜지는 두려운 징조.' },
      { name: '유성·별똥별', meaning: '소원·찰나·운명의 신호·죽음. 한순간 긋고 사라지는 빛.' },
      { name: '메아리', meaning: '반향·기억·고독·되돌아옴. 과거가 현재로 울려 퍼지는 소리.' },
    ],
  },
  {
    key: 'gem', label: '보석·광물', icon: '💎', items: [
      { name: '다이아몬드', meaning: '영원·순수·불변·견고함. 깨지지 않는 사랑과 가치.' },
      { name: '루비', meaning: '열정·생명력·권력·용기. 피처럼 붉은 정념.' },
      { name: '사파이어', meaning: '진실·충정·지혜·천상. 깊고 차분한 푸른 신뢰.' },
      { name: '에메랄드', meaning: '재생·희망·다산·치유. 봄빛 생명의 보석.' },
      { name: '진주', meaning: '순수·지혜·눈물·인고. 상처가 빚어낸 아름다움.' },
      { name: '자수정', meaning: '평정·금주·영성·보호. 취하지 않는 맑은 정신.' },
      { name: '오팔', meaning: '변덕·환상·희망/불운. 빛에 따라 변하는 신비.' },
      { name: '토파즈', meaning: '충실·우정·치유·명료. 따뜻한 호박빛 신의.' },
      { name: '가넷', meaning: '헌신·정열·귀환·보호. 어둠 속의 붉은 등불.' },
      { name: '터키석', meaning: '보호·행운·우정·하늘. 여행자의 부적.' },
      { name: '흑요석', meaning: '보호·진실 직시·차단. 어둠을 비추는 거울 돌.' },
      { name: '수정(석영)', meaning: '명료·치유·증폭·순수. 에너지를 모으는 투명한 돌.' },
      { name: '호박(앰버)', meaning: '시간·보존·온기·기억. 수천 년을 가둔 황금빛.' },
      { name: '금', meaning: '부·불변·신성·완전. 녹슬지 않는 영광.' },
      { name: '은', meaning: '달·정화·직관·이차적 가치. 차갑고 정결한 빛.' },
      { name: '철', meaning: '강함·전쟁·완고함·산업. 단단하나 녹스는 의지.' },
      { name: '청금석(라피스라줄리)', meaning: '천상·진리·왕권·영성. 별이 박힌 하늘을 담은 돌.' },
      { name: '월장석(문스톤)', meaning: '직관·여성성·꿈·달의 주기. 안에서 빛이 흐르는 신비.' },
      { name: '산호', meaning: '생명·보호·바다의 부적·열정. 살아 자라는 붉은 나무 돌.' },
      { name: '비취(옥)', meaning: '덕·장수·고결·평안. 군자의 다섯 덕을 담은 동양의 보석.' },
      { name: '페리도트', meaning: '치유·풍요·질투의 해소·빛. 화산이 빚은 연둣빛 보석.' },
      { name: '청자수정(아쿠아마린)', meaning: '항해 안전·평정·용기. 바다를 닮은 선원의 수호석.' },
      { name: '루비/적옥', meaning: '제왕·생명의 피·정념·보호. 가장 뜨거운 붉은 권능.' },
      { name: '석탄', meaning: '잠재·노동·검은 시련·압력. 압력을 견디면 다이아가 되는 원석.' },
      { name: '소금', meaning: '보존·맹약·정화·눈물. 변치 않는 언약이자 흘린 슬픔.' },
      { name: '수은', meaning: '변덕·연금술·독·유동. 잡히지 않는 은빛 액체.' },
      { name: '납', meaning: '무거움·우울·둔함·연금술의 시작. 금으로 변하길 기다리는 비천한 금속.' },
      { name: '청동', meaning: '오랜 세월·영웅·기념·견고. 동상으로 남는 영예의 합금.' },
      { name: '운석(별의 돌)', meaning: '하늘의 선물·운명·이질·초월. 다른 세계에서 떨어진 조각.' },
    ],
  },
  {
    key: 'direction', label: '방위·공간', icon: '🧭', items: [
      { name: '동쪽', meaning: '시작·탄생·희망·각성. 해가 떠오르는 새 출발.' },
      { name: '서쪽', meaning: '끝·죽음·노년·미지. 해가 지는 저승의 방향.' },
      { name: '남쪽', meaning: '열정·생명·정오·풍요. 따뜻한 정점의 방위.' },
      { name: '북쪽', meaning: '시련·어둠·지혜·미지의 추위. 차갑고 신비로운 극지.' },
      { name: '위(상)', meaning: '천상·이상·신성·상승. 높은 곳을 향한 동경.' },
      { name: '아래(하)', meaning: '지하·무의식·죽음·근원. 깊이 가라앉은 진실.' },
      { name: '중심', meaning: '균형·근원·세계의 배꼽·고요. 모든 방향이 만나는 점.' },
      { name: '오른쪽', meaning: '정의·이성·축복·정통. 옳음과 질서의 손.' },
      { name: '왼쪽', meaning: '직관·불길·이단·숨겨진 것. 무의식과 금기의 손.' },
      { name: '문지방(경계)', meaning: '전환·통과의례·선택. 두 세계를 가르는 임계점.' },
      { name: '교차로', meaning: '선택·운명·만남·마법. 길과 길이 엇갈리는 결단의 자리.' },
      { name: '미로', meaning: '혼란·탐색·시련·자기 발견. 중심을 향한 굽이친 여정.' },
      { name: '다리', meaning: '연결·전환·화해·위험한 건넘. 두 기슭을 잇는 통로.' },
      { name: '문', meaning: '기회·전환·미지로의 입구·차단. 열고 닫히는 가능성.' },
      { name: '계단', meaning: '상승·하강·단계적 변화·서열. 한 칸씩 오르내리는 운명.' },
      { name: '창문', meaning: '관망·갈망·내면과 외부의 경계·관음. 닿지 못하고 바라보는 틀.' },
      { name: '거울', meaning: '자아·진실·환상·이중성. 또 다른 나와 마주하는 표면.' },
      { name: '벽', meaning: '단절·보호·한계·억압. 넘을 수 없거나 지켜주는 경계.' },
      { name: '탑', meaning: '고립·야망·감금·오만. 높이 솟아 홀로 떨어진 자리.' },
      { name: '우물', meaning: '무의식·근원·비밀·소원. 깊이 내려가야 닿는 진실의 물.' },
      { name: '동굴', meaning: '무의식·자궁·은신·재생. 어둠으로 들어가 다시 태어나는 곳.' },
      { name: '정원', meaning: '낙원·통제된 자연·내면·에덴. 가꾸어진 마음의 풍경.' },
      { name: '숲', meaning: '미지·시련·무의식·길 잃음. 들어가면 변해 나오는 어둠.' },
      { name: '바다', meaning: '무의식·무한·생명의 근원·위협. 모든 것을 품고 삼키는 깊이.' },
      { name: '산', meaning: '도전·초월·신성·고독. 정상을 향한 영적 오름.' },
      { name: '강', meaning: '시간·흐름·경계·여정. 멈추지 않고 한 방향으로 흐르는 생.' },
      { name: '섬', meaning: '고립·피난·자족·단절. 바다에 둘러싸인 외딴 세계.' },
      { name: '사막', meaning: '시련·정화·영적 메마름·고독. 모든 군더더기를 태우는 황야.' },
      { name: '폐허', meaning: '몰락·시간·기억·덧없음. 영광이 무너진 자리의 침묵.' },
      { name: '나선·소용돌이', meaning: '순환·진화·현기증·운명. 같은 자리를 돌며 깊어지는 길.' },
      { name: '왕좌', meaning: '권력·정통·책임·고독. 앉는 순간 짊어지는 무게.' },
      { name: '제단', meaning: '희생·신성·서원·경계. 바치고 맹세하는 성스러운 자리.' },
      { name: '무덤', meaning: '죽음·기억·종착·재생의 씨앗. 끝이자 또 다른 시작의 흙.' },
    ],
  },
]

const LS = 'sry:tool:symbolism-dict:'
const ALL_KEY = '__all__'
const flatAll = (): { cat: CatDef; item: Sym }[] =>
  CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

export default function SymbolismDict() {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 즐겨찾기: "catKey::name" 형태의 키 집합
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
  const [random, setRandom] = useState<{ cat: CatDef; item: Sym } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 영속 저장
  useEffect(() => {
    try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ }
  }, [cat])
  useEffect(() => {
    try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ }
  }, [favs])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])

  const favKey = (catKey: string, name: string) => `${catKey}::${name}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[favKey(c.key, item.name)])
    if (q) {
      base = base.filter(({ item }) =>
        item.name.toLowerCase().includes(q) || item.meaning.toLowerCase().includes(q))
    }
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    // 현재 카테고리 필터 안에서 무작위 1개 (검색어 무시, 즐겨찾기 우선 아님)
    const pool = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      // 직전과 같으면 한 번 더
      if (prev && pool.length > 1 && pick.item.name === prev.item.name && pick.cat.key === prev.cat.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return pick
    })
  }, [cat])

  const toggleFav = (catKey: string, name: string) => {
    const k = favKey(catKey, name)
    setFavs((prev) => {
      const next = { ...prev }
      if (next[k]) delete next[k]
      else next[k] = true
      return next
    })
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }

  // "장면에 심기" 발상 질문 (상징을 받아 이야기 질문으로)
  const plantQuestions = (s: { cat: CatDef; item: Sym }): string[] => [
    `이 장면에서 ${s.cat.icon} ‘${s.item.name}’을(를) 슬쩍 등장시킨다면, 어떤 사물·배경·대사에 숨길 수 있을까?`,
    `인물 중 누가 ‘${s.item.name}’의 의미(${s.item.meaning.split('.')[0]})를 가장 절실히 닮았는가? 또는 정반대인가?`,
    `‘${s.item.name}’이 처음 나올 때와 결말에서 같은 상징이 의미를 뒤집는다면, 무엇이 달라질까?`,
  ]

  const copyPlant = (s: { cat: CatDef; item: Sym }) => {
    const text = `${s.cat.icon} ${s.item.name} — ${s.item.meaning}\n\n[장면에 심기]\n` +
      plantQuestions(s).map((q, i) => `${i + 1}. ${q}`).join('\n')
    copy(text, 'plant')
  }

  // 현재 상징 항목(대상/의미/장면 질문)을 프로젝트 자료 〈소재〉 폴더에 메모로 추가.
  const escapeHtml = (str: string) =>
    String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const addCurrentToProject = () => {
    if (!random || !hasProjectBridge()) return
    const s = random
    const bodyHtml = [
      `<p><b>${escapeHtml(s.cat.icon + ' ' + s.cat.label)} · ${escapeHtml(s.item.name)}</b></p>`,
      `<p>${escapeHtml(s.item.meaning)}</p>`,
      `<p><b>🌱 장면에 심기</b></p>`,
      `<ol>${plantQuestions(s).map((q) => `<li>${escapeHtml(q)}</li>`).join('')}</ol>`,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '소재',
      title: `${s.item.name} (${s.cat.label} 상징)`,
      bodyHtml,
    })
    if (id) {
      setToast(`프로젝트 자료 〈소재〉에 ‘${s.item.name}’ 상징 메모를 추가했습니다.`)
      window.setTimeout(() => setToast((t) => (t && t.includes(s.item.name) ? null : t)), 2200)
    }
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  return (
    <div style={wrap}>
      <div style={hint}>
        색·동물·식물·숫자·날씨·보석·방위 등 <b>{total}개</b> 상징의 의미를 모았습니다. 검색·필터로 찾고, 마음에 드는 상징을 장면에 심어 보세요.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="상징 이름이나 의미로 검색 (예: 죽음, 재생, 사랑)"
        style={{
          padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none',
        }}
      />

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
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 상징</button>
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

      {/* 무작위 결과 + 장면에 심기 질문 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0 8px' }}>{random.item.meaning}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}><Emoji e="🌱" /> 이 상징을 장면에 심기</div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text)' }}>
            {plantQuestions(random).map((q, i) => <li key={i}>{q}</li>)}
          </ol>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button className="minibtn" onClick={() => copyPlant(random)}>
              {copiedKey === 'plant' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 심기 질문 복사</>}
            </button>
            <button
              className="minibtn"
              onClick={() => toggleFav(random.cat.key, random.item.name)}
            >
              {favs[favKey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
          {/* 연계: 현재 상징 항목(대상/의미/장면 질문)을 프로젝트 자료 〈소재〉 폴더에 메모로 추가 */}
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button
              className="linkbtn"
              onClick={addCurrentToProject}
              disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '현재 상징과 장면에 심기 질문을 프로젝트 자료 〈소재〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}
            >
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
          </div>
        </div>
      )}

      {/* 추가 성공 토스트 */}
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
              ? '☆ 아직 즐겨찾기한 상징이 없습니다. 항목의 별을 눌러 모아 보세요.'
              : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const fk = favKey(c.key, item.name)
            const isFav = !!favs[fk]
            const copyId = 'item:' + fk
            return (
              <div key={fk} style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /> {c.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</span>
                  <button
                    className="minibtn"
                    title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                    onClick={() => toggleFav(c.key, item.name)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}
                  >
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 5 }}>{item.meaning}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button
                    className="minibtn"
                    onClick={() => copy(`${c.icon} ${item.name} — ${item.meaning}`, copyId)}
                  >
                    {copiedKey === copyId ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
                  </button>
                  <button
                    className="minibtn"
                    onClick={() => { setRandom({ cat: c, item }); }}
                    title="이 상징의 장면에 심기 질문 보기"
                  >
                    <Emoji e="🌱" /> 장면에 심기
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>상징은 정답이 아니라 출발점입니다. 의미를 비틀거나 뒤집어 인물·장면에 슬쩍 심어 보세요.</div>
    </div>
  )
}
