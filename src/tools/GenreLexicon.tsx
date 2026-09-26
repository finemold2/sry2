// 판타지 특수 어휘·표현 사전 — 이 장르 특유의 단어·관용표현·말투·상투구·전문용어를
//   카테고리(세계관 어휘 / 마법 체계 / 종족·존재 / 직위·계급 / 던전·시스템 / 관용표현·상투구 /
//   말투·어조 / 클리셰)로 모은 로컬 사전. 도시에(판타지 도시에)에 근거한 자작 데이터.
//  카테고리 펼침·검색·무작위·클릭복사 + 스니펫 저장 + 프로젝트 메모 추가.
//  자급식: 외부 네트워크·라이브러리 없음. react + './linkbus' 만 import. localStorage 영속.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'genre-lexicon', name: '판타지 어휘·표현 사전', icon: '📜', group: '어휘·표현', genre: '판타지', intro: '판타지 특유의 어휘·관용구·말투·상투구·전문용어를 찾아 클릭 복사·스니펫 저장', w: 660, h: 620 }

interface Term { word: string; read?: string; gloss: string; use?: string }
interface CatDef { key: string; label: string; icon: string; desc: string; items: Term[] }

// 판타지 도시에 §7(특수 어휘·표현·클리셰), §4(서사 장치), §1(하위 분기), §8(세계관 요소)에 근거.
// 일반론이 아니라 판타지 장르에 구체적·특화된 항목만 수록.
const CATS: CatDef[] = [
  {
    key: 'world', label: '세계관 어휘', icon: '🗺️', desc: '대륙·왕국·지명·세계 구조를 부르는 판타지 고유어',
    items: [
      { word: '제국', read: '帝國', gloss: '대륙을 호령하는 다민족 통합 국가. 황제·선제후·속국으로 권력이 층층이 쌓인다.', use: '“제국력 1024년, 황도(皇都) 발렌시아에 봄이 왔다.”' },
      { word: '왕국', read: '王國', gloss: '한 왕가가 다스리는 중규모 국가. 제국의 속국이거나 변경의 독립국으로 자주 등장.', use: '“북방 다섯 왕국이 처음으로 하나의 깃발 아래 모였다.”' },
      { word: '변경', read: '邊境', gloss: '문명의 끝, 마물·이종족과 맞닿은 위험한 국경 지대. 모험과 전쟁의 무대.', use: '“변경백(邊境伯)은 황실의 명 없이도 군대를 움직일 수 있었다.”' },
      { word: '마경', read: '魔境', gloss: '마기(魔氣)가 짙어 평범한 자는 발을 들이지 못하는 금단의 영역.', use: '“그 숲은 백 년 전 마경으로 변했고, 돌아온 자가 없다.”' },
      { word: '영지', read: '領地', gloss: '귀족이 황제·왕으로부터 하사받아 다스리는 땅. 세금·병력·재판권이 따라온다.', use: '“공작의 영지는 작은 나라만큼 넓었다.”' },
      { word: '대륙', read: '大陸', gloss: '판타지 세계의 무대 전체. 보통 고유 이름과 지도가 붙는다.', use: '“에른가르드 대륙의 동쪽 끝, 해가 가장 먼저 닿는 땅.”' },
      { word: '마탑', read: '魔塔', gloss: '마법사들이 모여 연구·수련하는 거대한 탑. 층마다 비전(祕傳)이 봉인돼 있다.', use: '“마탑의 9층에 오른 자만이 대마법사라 불린다.”' },
      { word: '신전', read: '神殿', gloss: '신을 모시는 성소. 사제·성기사·신탁이 머무는 정치·치유의 중심.', use: '“여명의 신전에서 새 성녀가 선택되었다는 소식이 퍼졌다.”' },
      { word: '결계', read: '結界', gloss: '마력으로 친 보이지 않는 장벽. 침입·마물·재앙을 막거나 무언가를 가둔다.', use: '“천 년을 버텨온 결계에 처음으로 금이 갔다.”' },
      { word: '봉인', read: '封印', gloss: '강대한 존재·힘을 잠재워 가둔 마법적 잠금. 풀리는 순간이 곧 위기.', use: '“마왕의 봉인이 약해질 때마다 하늘이 핏빛으로 물들었다.”' },
      { word: '이세계', read: '異世界', gloss: '현실과 단절된 다른 세계. 전이·전생물의 무대.', use: '“눈을 떠 보니, 그곳은 분명 내가 읽던 소설 속 이세계였다.”' },
      { word: '차원의 균열', gloss: '세계와 세계 사이가 찢어진 틈. 마물·게이트·전이의 통로로 쓰인다.', use: '“하늘이 갈라지고, 균열 너머에서 검은 손이 뻗어 나왔다.”' },
      { word: '세계수', read: '世界樹', gloss: '대지의 중심에 서서 모든 생명과 마력을 잇는 거대한 신성한 나무.', use: '“세계수의 잎이 떨어지는 날, 한 시대가 끝난다고 했다.”' },
      { word: '영맥', read: '靈脈', gloss: '대지를 흐르는 마력의 혈관. 끊기면 땅이 마르고 마법이 시든다.', use: '“영맥이 뒤틀린 마을에선 곡식 대신 가시나무가 자랐다.”' },
      { word: '미궁', read: '迷宮', gloss: '스스로 구조를 바꾸는 살아 있는 던전. 깊이 들어갈수록 강한 마물과 보물.', use: '“미궁 88층, 인간이 도달한 가장 깊은 곳이었다.”' },
      { word: '고대 유적', gloss: '멸망한 선대 문명의 잔해. 잊힌 마법·금기·진실이 잠들어 있다.', use: '“유적의 벽에는 지금은 누구도 읽지 못하는 문자가 새겨져 있었다.”' },
    ],
  },
  {
    key: 'magic', label: '마법 체계', icon: '✨', desc: '마나·서클·영창 등 마법의 작동 원리를 부르는 용어',
    items: [
      { word: '마나', read: 'Mana', gloss: '마법을 일으키는 근원적 힘. 고갈되면 영창이 끊기고, 과용하면 몸을 태운다.', use: '“그는 남은 마나를 단 한 방의 마법에 쏟아부었다.”' },
      { word: '마력', read: '魔力', gloss: '개체가 보유·운용하는 마나의 양과 질. 그릇의 크기가 곧 잠재력.', use: '“태어날 때부터 그녀의 마력은 보통 사람의 백 배였다.”' },
      { word: '오드', read: 'Od', gloss: '생명체 내부에서 생성되는 마력. 외부의 마나(마나)와 구분해 쓰는 설정에서 등장.', use: '“오드가 마르면, 마법사는 제 수명을 깎아 마법을 쓴다.”' },
      { word: '마력 회로', gloss: '몸속에서 마나를 끌어와 마법으로 변환하는 통로. 넓고 정교할수록 강한 술자.', use: '“선천적으로 회로가 막힌 그는 평생 마법을 쓸 수 없다고 했다.”' },
      { word: '서클', read: 'Circle', gloss: '마법사의 등급. 보통 1~9서클로 나뉘며, 서클이 오를수록 격이 다른 마법이 열린다.', use: '“6서클 마법 ‘메테오’가 전장 한복판에 떨어졌다.”' },
      { word: '영창', read: '詠唱', gloss: '마법을 발동하기 위해 외는 주문. 길수록 강하지만, 끊기면 마법도 흩어진다.', use: '“영창이 끝나기 전에 적의 화살이 그의 목을 노렸다.”' },
      { word: '무영창', gloss: '주문을 입에 담지 않고 마법을 쓰는 고등 기술. 천재·괴물의 증표.', use: '“무영창으로 9서클을 쓰는 자는, 역사에 단 셋뿐이었다.”' },
      { word: '마법진', read: '魔法陣', gloss: '바닥·허공에 그려 마력을 증폭·고정하는 기하학적 문양. 소환·결계·의식의 핵심.', use: '“핏빛 마법진이 완성되는 순간, 공기가 뒤틀렸다.”' },
      { word: '룬', read: 'Rune', gloss: '의미와 마력을 담은 고대 문자. 새기면 무기·갑옷에 영구한 마법이 깃든다.', use: '“검신에 새겨진 룬이 푸르게 빛나며 한기를 뿜었다.”' },
      { word: '인챈트', read: 'Enchant', gloss: '사물에 마법 효과를 부여하는 기술. ‘예리함’, ‘불속성’ 따위를 장비에 새긴다.', use: '“이 단검은 ‘침묵’이 인챈트되어 소리 없이 벤다.”' },
      { word: '금주', read: '禁呪', gloss: '대가가 끔찍하거나 세계를 흔드는 탓에 금지된 마법. 죽은 자 부활·시간 역행 등.', use: '“금주를 입에 올린 자는 이름째 역사에서 지워졌다.”' },
      { word: '등가교환', gloss: '얻으려면 그만한 대가를 치러야 한다는 마법의 철칙. 하드 매직의 윤리적 뼈대.', use: '“죽은 누이를 되살리려면, 같은 무게의 무언가를 내놓아야 했다.”' },
      { word: '속성', read: '屬性', gloss: '화·수·풍·토·빛·어둠 등 마법의 성질. 상성(相性)이 전투의 승패를 가른다.', use: '“불 속성 마법사에게 물의 정령은 천적이었다.”' },
      { word: '정령', read: '精靈', gloss: '자연의 힘이 깃든 존재. 계약한 술자(정령사)의 명에 따라 힘을 빌려준다.', use: '“상급 정령 운디네가 그녀의 부름에 응했다.”' },
      { word: '사역마', read: '使役魔', gloss: '마법사가 부리는 종속된 존재. 정찰·전투·계약의 매개로 쓰인다.', use: '“까마귀 모습의 사역마가 적진의 소식을 물고 돌아왔다.”' },
      { word: '소환', read: '召喚', gloss: '다른 곳·다른 세계의 존재를 불러내는 마법. 대가와 통제가 관건.', use: '“금단의 소환진에서 끌려 나온 것은, 악마였다.”' },
      { word: '마도공학', read: '魔導工學', gloss: '마법과 기술을 결합한 학문. 마차·골렘·비행선을 마력으로 움직인다.', use: '“마도공학이 발달한 제도(帝都)에선 가로등마저 마석으로 빛났다.”' },
      { word: '마석', read: '魔石', gloss: '마력이 응축된 광물. 마물의 핵이거나 마도구의 동력원으로 거래된다.', use: '“상급 마석 하나면 평민은 평생 일하지 않아도 됐다.”' },
    ],
  },
  {
    key: 'race', label: '종족·존재', icon: '🧝', desc: '엘프·드워프·드래곤 등 판타지 세계를 채우는 이종족과 괴물',
    items: [
      { word: '엘프', read: 'Elf', gloss: '뾰족한 귀에 장수하는 미형의 종족. 자연·정령·활을 다루며 인간을 얕본다는 클리셰.', use: '“엘프는 백 년을 청년으로 살고, 천 년을 슬픔으로 산다.”' },
      { word: '드워프', read: 'Dwarf', gloss: '땅속에 사는 키 작은 장인족. 대장일·술·황금·고집의 대명사.', use: '“드워프의 도끼는 산을 쪼개고, 드워프의 고집은 그 산보다 단단했다.”' },
      { word: '오크', read: 'Orc', gloss: '녹색 피부의 호전적 야만족. 흔히 소모적 악역이나, 명예의 전사로 비트는 변주도.', use: '“오크 부족장은 약한 자를 죽이고, 강한 자에게 머리를 숙였다.”' },
      { word: '하플링', read: 'Halfling', gloss: '키 작고 소박한 반인족(호빗계). 평범함 속의 의외의 용기로 사랑받는다.', use: '“가장 작은 하플링이, 가장 무거운 운명을 짊어졌다.”' },
      { word: '드래곤', read: 'Dragon', gloss: '마법과 보물을 다루는 최상위 용족. 재앙이자 지혜, 인간형으로 둔갑하기도.', use: '“드래곤이 날개를 펴자, 정오의 하늘이 밤이 되었다.”' },
      { word: '와이번', read: 'Wyvern', gloss: '드래곤의 하위종. 다리가 둘, 지능은 낮지만 비행 마물로 위협적.', use: '“와이번 떼가 성벽 위로 그림자를 드리웠다.”' },
      { word: '리치', read: 'Lich', gloss: '불사를 얻기 위해 영혼을 그릇(성궤)에 봉인한 언데드 대마법사.', use: '“리치를 죽이려면, 먼저 숨겨진 성궤(聖櫃)를 찾아 부숴야 했다.”' },
      { word: '언데드', read: 'Undead', gloss: '죽어서도 움직이는 존재. 스켈레톤·좀비·구울·뱀파이어를 아우른다.', use: '“네크로맨서의 손짓에 들판의 시체들이 일제히 일어섰다.”' },
      { word: '네크로맨서', read: 'Necromancer', gloss: '죽음과 시체를 다루는 흑마법사. 금기시되며 박해받는 직군.', use: '“네크로맨서라는 말이 나오자, 마을 사람들은 횃불부터 들었다.”' },
      { word: '골렘', read: 'Golem', gloss: '흙·돌·강철에 마력을 불어넣어 움직이는 인공 거인. 명령에 충실한 수호자.', use: '“강철 골렘은 지칠 줄도, 두려움도 몰랐다.”' },
      { word: '슬라임', read: 'Slime', gloss: '가장 약한 마물의 대명사. 이세계물에선 의외의 성장·환생의 출발점으로 인기.', use: '“가장 약한 슬라임으로 환생했지만, 나는 포기하지 않았다.”' },
      { word: '마물', read: '魔物', gloss: '마기로 태어난 짐승·괴물의 총칭. 토벌·사냥의 대상이자 마석의 출처.', use: '“밤이 깊을수록, 숲에서 기어 나오는 마물도 강해졌다.”' },
      { word: '마왕', read: '魔王', gloss: '어둠의 세력을 이끄는 최종 위협. 봉인되었다 부활하는 것이 정석.', use: '“천 년의 봉인이 풀리고, 마왕이 다시 옥좌에 앉았다.”' },
      { word: '정령왕', read: '精靈王', gloss: '각 속성 정령들의 정점에 선 군주급 존재. 계약 자체가 전설.', use: '“불의 정령왕 이프리트와 계약한 인간은, 천 년에 한 명뿐이었다.”' },
      { word: '신수', read: '神獸', gloss: '신의 권능을 지닌 영적 짐승(봉황·기린·해태 등). 길조이자 수호자.', use: '“신수가 깃든 산에는 사냥꾼조차 발을 들이지 않았다.”' },
      { word: '악마', read: '惡魔', gloss: '계약과 영혼을 탐하는 어둠의 존재. 소환의 대가로 파멸을 부른다.', use: '“악마는 거짓말을 하지 않는다. 다만, 진실을 잔인하게 다룰 뿐.”' },
    ],
  },
  {
    key: 'rank', label: '직위·계급·조직', icon: '⚔️', desc: '용사·기사·길드 등급 등 인물의 자리와 세력을 부르는 말',
    items: [
      { word: '용사', read: '勇者', gloss: '마왕에 맞서도록 선택·소환된 영웅. ‘선택받은 자’ 클리셰의 핵심 직함.', use: '“신탁이 가리킨 용사는, 검도 잡아본 적 없는 시골 소년이었다.”' },
      { word: '현자', read: '賢者', gloss: '세계의 진리와 마법의 정점에 닿은 지혜자. 흔히 멘토로 등장.', use: '“현자는 답을 주지 않았다. 다만 더 어려운 질문을 남겼다.”' },
      { word: '성녀', read: '聖女', gloss: '신의 가호를 받아 치유·정화·신탁을 행하는 여성. 신전 권력의 상징.', use: '“성녀의 손이 닿자, 곪았던 상처가 거짓말처럼 아물었다.”' },
      { word: '성기사', read: '聖騎士', gloss: '신앙과 무력을 겸비한 기사. 언데드·악마의 천적.', use: '“성기사의 검이 빛을 머금자, 구울들이 비명을 지르며 흩어졌다.”' },
      { word: '소드마스터', read: 'Sword Master', gloss: '검에 마나(오러)를 실어 강철을 두부처럼 베는 검의 극의에 이른 자.', use: '“소드마스터 한 명이 일개 군단의 가치를 지녔다.”' },
      { word: '대마법사', gloss: '7서클 이상에 이른 마법의 정점. 한 나라의 균형을 좌우하는 전략 병기.', use: '“대마법사가 진노하면, 왕도 그 앞에선 고개를 숙였다.”' },
      { word: '기사단', read: '騎士團', gloss: '왕·영주에 충성하는 무력 집단. 단장·부단장·기사·종자로 위계가 잡혀 있다.', use: '“붉은 사자 기사단은 단 한 번도 등을 보인 적이 없었다.”' },
      { word: '모험가', read: '冒險家', gloss: '의뢰를 받아 토벌·호위·탐색을 수행하는 직업인. 길드 등급으로 격이 매겨진다.', use: '“막 등록한 F등급 모험가에게, 그런 의뢰가 올 리 없었다.”' },
      { word: '모험가 길드', gloss: '의뢰와 모험가를 잇는 조직. 접수처·등급 심사·보수 정산을 맡는다.', use: '“길드 게시판엔 늘 누군가의 절박함이 종이로 붙어 있었다.”' },
      { word: '등급', read: 'Rank', gloss: '실력의 척도. 보통 F·E·D·C·B·A·S, 더 위로 SS·SSS까지 치솟는다.', use: '“S등급 위에 SS, 그 위엔 전설로만 전해지는 SSS가 있었다.”' },
      { word: '선제후', read: '選帝侯', gloss: '황제를 선출할 권리를 가진 최상위 대귀족. 제국 정치의 큰손.', use: '“일곱 선제후의 표가 곧 다음 황제를 정했다.”' },
      { word: '공작', read: '公爵', gloss: '왕족에 버금가는 최고위 귀족. 로판·궁중물의 차가운 남주 단골 직위.', use: '“얼음 같던 공작이, 그녀에게만은 다정했다.”' },
      { word: '변경백', read: '邊境伯', gloss: '국경을 지키는 군사 귀족. 자체 군대와 폭넓은 자치권을 지닌다.', use: '“변경백의 말은, 변경에선 황명과 다를 바 없었다.”' },
      { word: '집행관', read: '執行官', gloss: '교단·길드·황실의 명을 받아 처단·정화를 수행하는 자. 냉혹한 칼.', use: '“집행관이 검은 외투를 펄럭이며 마을에 들어섰다.”' },
      { word: '랭커', read: 'Ranker', gloss: '(헌터물) 각성자 서열 상위에 든 강자. 한 명의 랭커가 도시를 지킨다.', use: '“상위 랭커 한 사람의 부재로, 게이트 하나가 무너졌다.”' },
      { word: '각성자', read: '覺醒者', gloss: '(헌터물) 게이트 출현 이후 초능력에 눈뜬 인간. 등급으로 분류·관리된다.', use: '“그는 십 년을 최약체 각성자로 비웃음당했다 — 회귀하기 전까지는.”' },
    ],
  },
  {
    key: 'system', label: '던전·시스템·게임적 관습', icon: '🎮', desc: '게이트·스테이터스 창 등 웹소설이 정착시킨 게임적 장치',
    items: [
      { word: '게이트', read: 'Gate', gloss: '(헌터물) 현실에 갑자기 열리는 이세계의 문. 안에서 마물이 쏟아져 나온다.', use: '“오전 7시, 강남 한복판에 A급 게이트가 열렸다.”' },
      { word: '던전', read: 'Dungeon', gloss: '마물과 보물이 들어찬 미궁형 공략지. 깊이 들어갈수록 위험과 보상이 커진다.', use: '“던전의 최하층, 그곳에서 보스가 그들을 기다리고 있었다.”' },
      { word: '레이드', read: 'Raid', gloss: '강력한 보스·던전을 다수가 협공해 공략하는 작전.', use: '“S급 보스 레이드에 길드의 정예 전원이 투입됐다.”' },
      { word: '스테이터스 창', gloss: '(시스템물) 인물의 능력치를 보여주는 게임식 반투명 창. 성장의 가시화 장치.', use: '“[힘 12 / 민첩 9 / 마력 47] — 눈앞에 푸른 창이 떠올랐다.”' },
      { word: '스탯', read: 'Stat', gloss: '힘·민첩·체력·지력·마력 등 수치화된 능력. 레벨업·아이템으로 오른다.', use: '“레벨 한 번에 모든 스탯이 두 배가 됐다. 말도 안 되는 성장률이었다.”' },
      { word: '레벨업', read: 'Level Up', gloss: '경험치를 쌓아 한 단계 강해지는 순간. 성장 보상의 즉각적 카타르시스.', use: '“[레벨 업!] 익숙한 종소리가, 그의 귀에만 울렸다.”' },
      { word: '스킬', read: 'Skill', gloss: '습득·각성한 특수 능력. 액티브(발동)와 패시브(상시)로 나뉜다.', use: '“[고유 스킬: 절대 회피]를 얻으셨습니다.”' },
      { word: '버프·디버프', gloss: '능력을 일시 강화(버프)하거나 약화(디버프)하는 효과. 전투의 변수.', use: '“광역 버프가 아군 전체를 황금빛으로 물들였다.”' },
      { word: '퀘스트', read: 'Quest', gloss: '(시스템물) 시스템이 부여하는 임무. 보상·페널티가 따라붙는다.', use: '“[긴급 퀘스트 발생: 24시간 내 보스를 처치하라. 실패 시 사망.]”' },
      { word: '시스템', read: 'System', gloss: '인물에게만 보이는 초월적 안내자·규칙 엔진. 메시지·상점·퀘스트를 띄운다.', use: '“[플레이어님, 환영합니다. 튜토리얼을 시작합니다.]”' },
      { word: '히든 피스', gloss: '극소수만 아는 숨겨진 공략·직업·보상. 회귀자·정보 우위자의 무기.', use: '“회귀 전의 기억 덕분에, 그는 첫날부터 히든 피스를 챙겼다.”' },
      { word: '아티팩트', read: 'Artifact', gloss: '강대한 마력이 깃든 전설의 물건. 종종 의지·대가·중독성을 지닌다.', use: '“그 아티팩트는 주인을 고른다고 했다. 그리고, 잡아먹는다고도.”' },
      { word: '히든 클래스', gloss: '드러나지 않은 희귀 직업. 평범한 시작에서 최강으로 가는 반전의 열쇠.', use: '“[직업: 그림자 군주] — 세상에 단 하나뿐인 히든 클래스였다.”' },
      { word: '코어·보스', gloss: '던전을 닫는 핵심(코어)을 지키는 최종 마물(보스). 처치해야 게이트가 닫힌다.', use: '“보스의 코어를 부수는 순간, 던전 전체가 무너지기 시작했다.”' },
      { word: '회귀', read: '回歸', gloss: '죽음·실패 직전 과거로 돌아가 다시 사는 것. 한국 웹소설의 3대 엔진.', use: '“열 번째 회귀. 이번엔, 반드시 끝을 본다.”' },
      { word: '빙의·환생', gloss: '소설·게임 속 인물에 들어가거나(빙의), 죽어 다른 존재로 다시 나는 것(환생).', use: '“하필이면, 원작에서 가장 먼저 죽는 악역에게 빙의했다.”' },
    ],
  },
  {
    key: 'idiom', label: '관용표현·상투구', icon: '🗯️', desc: '판타지에서 닳도록 쓰이는 결정적 한 줄·정형 문구',
    items: [
      { word: '“너에게는 특별한 힘이 있다”', gloss: '멘토가 평범한 주인공의 잠재력을 일깨우는 정형구. 운명의 시작을 알린다.', use: '도입부 멘토 대사. 변주: “네 안의 것은 힘이 아니라, 저주일지도 모른다.”' },
      { word: '“이번 생은 다르게 살겠다”', gloss: '회귀·환생물의 다짐 선언. 과거의 굴욕을 뒤집겠다는 동력의 핵심.', use: '회귀 직후 1화 후킹. 독자에게 ‘사이다’를 예고하는 한 줄.' },
      { word: '“봉인이 풀렸다”', gloss: '잠든 악·고대의 위협이 깨어나는 위기의 신호탄.', use: '“천 년의 봉인이 풀렸다. 세계는 그 사실을 아직 몰랐다.”' },
      { word: '“검을 들 자격”', gloss: '용사·기사의 정통성·각오를 묻는 표현. 통과의례·서임식에 등장.', use: '“검을 드는 건 누구나 할 수 있다. 휘두를 자격은 다르다.”' },
      { word: '“대가를 치러야 한다”', gloss: '마법·소원에 반드시 비용이 따른다는 등가교환의 상투구.', use: '“모든 기적엔 청구서가 따라온다. 마법도 예외는 아니지.”' },
      { word: '“운명은 정해져 있다 / 바꿀 수 있다”', gloss: '예언과 자유의지의 충돌을 드러내는 대립 문구. 결말의 반전 떡밥.', use: '“예언은 미래를 말하지 않는다. 다만, 우리를 시험할 뿐이다.”' },
      { word: '“세계의 운명이 네 손에”', gloss: '개인의 위기를 세계적 스케일로 끌어올리는 정형 선언.', use: '클라이맥스 직전, 주인공의 어깨에 세계를 얹는 한 줄.' },
      { word: '“그것은 인간이 다룰 힘이 아니었다”', gloss: '금기·소프트 매직의 경이·공포를 환기하는 문구.', use: '“그가 손을 들자, 그것은 인간이 다룰 힘이 아니었다.”' },
      { word: '“늦었다고 생각할 때가…”의 반전형 — “이미 늦었다”', gloss: '희망을 꺾어 절망(고구마)을 쌓는 다크/웹소설식 비틀기.', use: '“늦지 않았다고? 아니, 모든 게 이미 끝난 뒤였다.”' },
      { word: '“피는 거짓말을 하지 않는다”', gloss: '혈통·핏줄로 정당화되는 ‘선택받은 자’ 클리셰의 상투구.', use: '“네 안의 피가, 네가 누구인지 증명할 것이다.”' },
      { word: '“이름을 부르지 마라”', gloss: '진명(眞名)·금기의 존재를 둘러싼 어스시식 금기 표현.', use: '“그것의 이름을 입에 담는 순간, 그것은 너를 찾아온다.”' },
      { word: '“최강이 되었다”', gloss: '성장의 정점·랭킹 1위 등극을 알리는 웹소설식 카타르시스 선언.', use: '“그날 이후, 세상은 그를 ‘최강’이라 불렀다.”' },
    ],
  },
  {
    key: 'tone', label: '말투·어조', icon: '🎭', desc: '종족·신분별 말씨와 판타지 특유의 문체·어조',
    items: [
      { word: '예스러운 격식체(고풍체)', gloss: '“~하노라 / ~할지어다 / 그대” 등 옛 어투. 신·왕·고대 존재의 위엄을 낸다.', use: '“그대가 선택받은 자라면, 이 검이 그대를 알아보리라.”' },
      { word: '신탁·예언 어조', gloss: '운율·은유·모호함을 섞은 경구체. 해석의 여지를 남겨 긴장을 만든다.', use: '“불이 셋을 삼키고, 잿더미에서 왕이 일어나리니.”' },
      { word: '귀족·궁중 어투(로판체)', gloss: '우아하고 절제된 존대. 가시 돋친 정중함으로 권력 다툼을 그린다.', use: '“공작께서는 참으로… 자비로우시군요. 소문과는 달리.”' },
      { word: '엘프의 고고한 말씨', gloss: '느릿하고 시적이며, 인간의 짧은 생을 측은해하는 어조.', use: '“너희 인간은 늘 서두르는구나. 죽음이 그리도 가까운 탓일까.”' },
      { word: '드워프의 투박한 말씨', gloss: '거칠고 직설적이며, 술·금·대장일이 화제. 사투리체로 표현되기도.', use: '“쓸데없는 말은 됐고, 이 도끼 값이나 제대로 쳐 달라고.”' },
      { word: '마물·마왕의 위압 어조', gloss: '낮게 깔리고 인간을 벌레 보듯 하는 오만한 말투. 공포 연출.', use: '“가소롭구나. 한낱 인간이 내 잠을 깨우다니.”' },
      { word: '시스템 메시지체', gloss: '대괄호·반말·기계적 통보. 감정 없는 안내가 도리어 긴장을 준다.', use: '“[경고: 보스가 분노 상태에 진입했습니다.]”' },
      { word: '먼치킨 주인공의 능청체', gloss: '압도적 강함을 담담·시니컬하게 흘리는 어조. ‘사이다’의 맛을 살린다.', use: '“아, 이 정도면 됐나? 다음.” — 그는 하품을 했다.' },
      { word: '음유시인·이야기꾼 어조', gloss: '청중을 부르며 전설을 노래하듯 풀어내는 액자식 화법.', use: '“자, 잔을 채우게. 용을 벤 검사의 이야기를 들려주지.”' },
      { word: '사제·교단의 설교체', gloss: '신앙·죄·구원을 설파하는 장중한 어조. 위선·광신의 양면을 그릴 때 유용.', use: '“빛은 모든 죄를 사하노라. 다만, 회개하지 않는 자는 예외이니라.”' },
      { word: '회귀자의 독백체', gloss: '미래를 아는 자의 차분한 우위·씁쓸함이 밴 1인칭 내레이션.', use: '‘이번엔 안다. 저 미소 뒤에 무엇이 숨어 있는지.’' },
    ],
  },
  {
    key: 'cliche', label: '클리셰·전복', icon: '🔁', desc: '인지하고 변주할 단골 설정 — 그대로 쓰거나, 비틀거나',
    items: [
      { word: '평범한 시골 소년이 사실 왕족·용사의 후예', gloss: '‘선택받은 자’의 출생의 비밀. 가장 닳은 출발점.', use: '전복: 후예가 가짜였거나, 혈통이 아니라 ‘선택’이 영웅을 만든다.' },
      { word: '현명한 노(老)멘토의 중도 사망', gloss: '간달프·덤블도어식. 멘토를 잃고 주인공이 홀로 서게 만든다.', use: '전복: 멘토가 사실 흑막이었거나, 죽음을 위장하고 돌아온다.' },
      { word: '봉인된 마왕의 부활', gloss: '잠든 악이 깨어나는 카운트다운형 위협.', use: '전복: 마왕이 실은 세계를 지키던 봉인 그 자체였다.' },
      { word: '엘프=미형·고결 / 드워프=술·구두쇠 / 오크=무지성 악', gloss: '종족 고정관념. 그대로 쓰면 편하지만 식상하다.', use: '전복: 잔혹한 엘프, 시인 같은 오크, 사기꾼 드워프로 비튼다.' },
      { word: '선술집·여관에서의 퀘스트 의뢰', gloss: '모험의 출발점이자 정보·동료를 얻는 단골 무대.', use: '전복: 그 의뢰 자체가 주인공을 노린 함정이었다.' },
      { word: '“너는 선택받았다”는 예언', gloss: '운명을 정당화하는 장치. 남용하면 긴장이 죽는다.', use: '전복: 예언이 오역되었거나, 다른 사람을 가리킨 것이었다.' },
      { word: '약자가 각성·회귀로 최강이 됨', gloss: '웹소설의 핵심 동력. 사이다의 원천.', use: '전복: 최강이 된 대가로 인간성·관계를 잃어 간다.' },
      { word: '차갑지만 나에게만 다정한 남주(로판)', gloss: '얼음 공작·황태자가 여주에게만 빗장을 푸는 정석.', use: '전복: 그 다정함이 처음부터 계산된 연기였다.' },
      { word: '원작에서 죽는 악역에 빙의(로판)', gloss: '파멸 플래그 회피가 목표가 되는 빙의물 공식.', use: '전복: 원작 자체가 거짓이라, 미래 지식이 통하지 않는다.' },
      { word: '최종 결전에서 갑자기 각성하는 새 힘', gloss: '데우스 엑스 마키나. 판타지 작법의 최대 금기.', use: '대안: 클라이맥스의 힘은 반드시 앞서 복선으로 심어 두고 회수한다.' },
      { word: '가족·문파에 버림받았다가 복수', gloss: '굴욕(고구마) → 응징(사이다)의 전형적 리듬.', use: '전복: 복수를 이룬 뒤에야, 진짜 적은 따로 있었음을 안다.' },
      { word: '동료 파티 결성과 여정', gloss: '검사·마법사·사제·도적의 균형 잡힌 일행 클리셰.', use: '전복: 동료 중 하나가 처음부터 적의 첩자였다.' },
    ],
  },
]

const LS = 'sry:tool:genre-lexicon:'
const ALL_KEY = '__all__'
type Flat = { cat: CatDef; item: Term }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 한 항목을 한 덩이 텍스트로(복사·스니펫·프로젝트 공통)
const termText = (f: Flat): string => {
  const head = `${f.cat.icon} [${f.cat.label}] ${f.item.word}${f.item.read ? ` (${f.item.read})` : ''}`
  const lines = [head, f.item.gloss]
  if (f.item.use) lines.push(`예) ${f.item.use}`)
  return lines.join('\n')
}

export default function GenreLexicon({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 활용: 다른 도구가 장르를 넘겨주면 안내에 반영(이 도구는 판타지 전용).
  const incomingGenre = typeof payload?.genre === 'string' ? (payload.genre as string) : ''

  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 즐겨찾기: "catKey::word"
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<Flat | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)
  const copyTimer = useRef<number | null>(null)

  // 영속
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])
  // 언마운트 정리
  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
  }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])

  // 조합수: 어휘 사전에서 "한 장면에 심을 어휘 조합"의 경우의 수.
  //  - 카테고리 8개에서 각각 한 항목씩 뽑는 조합(있음/없음 선택 포함, 최소 1개)
  //  → ∏(items_i + 1) - 1.  (세계관 어휘 한 항목 + 마법 한 항목 + … 식의 팔레트 조합)
  const comboCount = useMemo(() => {
    let p = 1
    for (const c of CATS) p *= (c.items.length + 1)
    return p - 1
  }, [])
  const comboText = useMemo(() => {
    // 한국어 만/억/조 단위 근사 표기
    const n = comboCount
    if (n >= 1e16) return `${(n / 1e16).toFixed(1)}경 가지 이상`
    if (n >= 1e12) return `${(n / 1e12).toFixed(2)}조 가지 이상`
    if (n >= 1e8) return `${(n / 1e8).toFixed(2)}억 가지 이상`
    if (n >= 1e4) return `${(n / 1e4).toFixed(0)}만 가지`
    return `${n.toLocaleString()}가지`
  }, [comboCount])

  const favKey = (catKey: string, word: string) => `${catKey}::${word}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base: Flat[] = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[favKey(c.key, item.word)])
    if (q) {
      base = base.filter(({ item }) =>
        item.word.toLowerCase().includes(q) ||
        (item.read || '').toLowerCase().includes(q) ||
        item.gloss.toLowerCase().includes(q) ||
        (item.use || '').toLowerCase().includes(q))
    }
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    const pool: Flat[] = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.word === prev.item.word && pick.cat.key === prev.cat.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return pick
    })
  }, [cat])

  const toggleFav = (catKey: string, word: string) => {
    const k = favKey(catKey, word)
    setFavs((prev) => { const next = { ...prev }; if (next[k]) delete next[k]; else next[k] = true; return next })
  }

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* graceful */ })
  }

  // 스니펫 저장(생성 글감)
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: termText(f),
      source: '판타지 어휘·표현 사전',
      tags: ['판타지', '어휘', f.cat.label, f.item.word],
    })
    flash(`‘${f.item.word}’을(를) 스니펫으로 저장했습니다.`)
  }

  // 프로젝트 자료 〈설정/어휘〉 폴더에 메모 추가
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(f.cat.icon + ' ' + f.cat.label)} · ${escapeHtml(f.item.word)}${f.item.read ? ' (' + escapeHtml(f.item.read) + ')' : ''}</b></p>`,
      `<p>${escapeHtml(f.item.gloss)}</p>`,
      f.item.use ? `<p style="color:#888"><i>예) ${escapeHtml(f.item.use)}</i></p>` : '',
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '설정/어휘',
      title: `${f.item.word} (판타지 어휘)`,
      bodyHtml,
      meta: { 장르: '판타지', 분류: f.cat.label },
    })
    if (id) flash(`프로젝트 자료 〈설정/어휘〉에 ‘${f.item.word}’을(를) 추가했습니다.`)
  }

  // 현재 화면의 항목 전부를 한 문서로 묶어 프로젝트에 추가
  const allToProject = () => {
    if (!hasProjectBridge() || filtered.length === 0) return
    const body = filtered.map((f) =>
      `<p><b>${escapeHtml(f.cat.icon + ' ' + f.item.word)}${f.item.read ? ' (' + escapeHtml(f.item.read) + ')' : ''}</b> — ${escapeHtml(f.item.gloss)}` +
      (f.item.use ? `<br/><span style="color:#888"><i>예) ${escapeHtml(f.item.use)}</i></span>` : '') + '</p>'
    ).join('')
    const where = cat === ALL_KEY ? '전체' : (CATS.find((c) => c.key === cat)?.label || '')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '설정/어휘',
      title: `판타지 어휘집 — ${where}${query ? ` · ‘${query}’` : ''} (${filtered.length}개)`,
      bodyHtml: body, meta: { 장르: '판타지', 분류: where },
    })
    if (id) flash(`현재 목록 ${filtered.length}개를 프로젝트 〈설정/어휘〉에 추가했습니다.`)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>판타지</b> 장르 특유의 어휘·관용구·말투·상투구·전문용어 <b>{total}개</b>를 8개 분류로 모았습니다.
        검색·무작위로 찾아 클릭 복사하고, 마음에 들면 스니펫·프로젝트에 담으세요.
        {incomingGenre && incomingGenre !== '판타지' && (
          <span style={{ color: 'var(--accent)' }}> (요청 장르 ‘{incomingGenre}’ — 이 사전은 판타지 전용입니다.)</span>
        )}
        <br /><Emoji e="🎲" /> 한 장면의 어휘 팔레트 조합은 <b>{comboText}</b> ({comboCount.toLocaleString()})로 짤 수 있습니다.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="단어·뜻·예문으로 검색 (예: 봉인, 마나, 회귀, 용사)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 펼침 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="✨" /> 전체
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on}
              title={c.desc}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={c.icon} /> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 어휘</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 무작위 결과 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.word}</span>
            {random.item.read && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{random.item.read}</span>}
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0 4px' }}>{random.item.gloss}</div>
          {random.item.use && <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--muted)', fontStyle: 'italic' }}>예) {random.item.use}</div>}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(termText(random), 'rand')}>{copiedKey === 'rand' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
            <button className="minibtn" onClick={() => copy(random.item.word, 'rand-w')}>{copiedKey === 'rand-w' ? <>✓ 복사됨</> : <><Emoji e="🔤" /> 단어만</>}</button>
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="💾" /> 스니펫</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.word)}>
              {favs[favKey(random.cat.key, random.item.word)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
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
            {onlyFav ? '☆ 아직 즐겨찾기한 어휘가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const fk = favKey(c.key, item.word)
            const isFav = !!favs[fk]
            const copyId = 'item:' + fk
            return (
              <div key={fk} style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /> {c.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
                    title="클릭하면 단어를 복사합니다"
                    onClick={() => copy(item.word, copyId + ':w')}>{item.word}</span>
                  {item.read && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{item.read}</span>}
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                    onClick={() => toggleFav(c.key, item.word)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 5 }}>{item.gloss}</div>
                {item.use && <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--muted)', fontStyle: 'italic', marginTop: 4 }}>예) {item.use}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <button className="minibtn" onClick={() => copy(termText({ cat: c, item }), copyId)}>
                    {copiedKey === copyId ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
                  </button>
                  <button className="minibtn" onClick={() => saveSnippet({ cat: c, item })}><Emoji e="💾" /> 스니펫</button>
                  <button className="linkbtn" onClick={() => toProject({ cat: c, item })} disabled={!hasProjectBridge()}
                    title={hasProjectBridge() ? '이 어휘를 프로젝트 자료 〈설정/어휘〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                    <Emoji e="📄" /> 프로젝트에 추가
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 하단: 일괄 동작 + 연계 */}
      <div className="linkbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
        <button className="linkbtn" onClick={allToProject} disabled={!hasProjectBridge() || filtered.length === 0}
          title={hasProjectBridge() ? '현재 목록 전체를 한 문서로 프로젝트 〈설정/어휘〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
          <Emoji e="📄" /> 목록 전체 프로젝트에 추가
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('genre-conventions', { genre: '판타지' })}
          title="장르 관습 체크리스트 열기"><Emoji e="📐" /> 장르 관습</button>
        <button className="linkbtn" onClick={() => openToolLinked('world-wiki', { genre: '판타지' })}
          title="세계관 위키 열기"><Emoji e="🌐" /> 세계관 위키</button>
        <button className="linkbtn" onClick={() => openToolLinked('name-mixer', { genre: '판타지' })}
          title="이름 조합기 열기"><Emoji e="🔤" /> 이름 조합기</button>
        <span style={{ ...hint, marginLeft: 'auto' }}>
          어휘는 정답이 아니라 출발점입니다. 클리셰는 그대로 쓰거나, 비틀어 보세요.
        </span>
      </div>
    </div>
  )
}
