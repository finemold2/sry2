// 판타지 사건·소재 대장간 — 판타지 서사의 핵심 사건을 8개 슬롯 조합으로 대량 생성한다.
//  발단(촉발 사건) × 무대 × 마법/이적 × 위협 세력 × 휘말리는 인물 × 판돈(걸린 것) × 비틀기(반전) × 대가(여파)
//  여덟 슬롯을 골라 굴리면, 판타지 한 장면/한 국면이 되는 사건 전개를 한 단락으로 엮어 준다.
//  마음에 드는 슬롯은 🔒로 고정하고 나머지만 다시 굴려 변주한다. 핵심 생성기 — 조합 1조 이상.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(보관함)만 사용. 외부 API 불필요.
//  도시에 근거: 봉인된 악·예언·하드/소프트 매직·종족 정치·퀘스트·회빙환·시스템·로판/그림다크 결을 슬롯 데이터에 반영.
// 연계(linkbus): 현재 사건을 자료('research')/'사건' 폴더 문서로 추가하고, 스니펫 라이브러리에도 저장한다.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'genre-eventforge',
  name: '판타지 사건 대장간',
  icon: '⚔️',
  group: '생성기',
  genre: '판타지',
  intro: '발단·무대·마법·위협·인물·판돈·반전·대가 여덟 슬롯을 굴려 판타지 사건을 대량 생성하세요',
  w: 600,
  h: 700,
}

const LS = 'sry:tool:genre-eventforge'

// ---- 슬롯 정의 ----
// 각 슬롯은 판타지 사건 전개의 한 축. faces = 그 축의 후보(로컬 표). 장르 특화·구체적으로.
interface Slot { key: string; label: string; icon: string; desc: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'spark', label: '발단', icon: '🜂', desc: '무엇이 사건을 촉발하는가',
    faces: [
      '천 년 봉인의 마지막 인장에 금이 가고',
      '예언서의 한 구절이 글자째 불타 사라지고',
      '국경의 던전 깊은 곳에서 게이트가 역류하고',
      '죽은 줄 알았던 대마법사의 탑에 다시 불이 켜지고',
      '용의 둥지에서 알 하나가 사라지고',
      '회귀한 자가 눈을 뜨자 멸망 사흘 전이고',
      '신탁이 끊기고 신전의 성화(聖火)가 꺼지고',
      '금주(禁呪)가 적힌 고대 석판이 시장에 흘러나오고',
      '소환진이 엉뚱한 것을 불러내 계약이 뒤틀리고',
      '왕가의 핏줄에만 깃든 표식이 평민 아이에게 나타나고',
      '마탑의 결계가 안에서부터 무너지기 시작하고',
      '죽은 자들의 이름을 부르는 종소리가 밤마다 울리고',
      '성좌가 시나리오를 선포하며 하늘이 갈라지고',
      '잠든 마왕의 심장 박동이 대지를 흔들기 시작하고',
      '엘프 숲의 세계수가 까닭 없이 시들기 시작하고',
      '계약의 정령이 인간과의 맹세를 일제히 파기하고',
      '봉인된 검이 스스로 칼집을 빠져나와 주인을 찾고',
      '원작에선 죽었어야 할 악역이 첫 페이지에서 살아 있고',
      '대륙 전역의 마나가 일제히 썰물처럼 빠져나가고',
      '잃어버린 왕의 무덤에서 빛기둥이 솟아오르고',
      '모험가 길드 게시판에 등급 외(外)의 의뢰가 걸리고',
      '죽은 영웅의 검이 후계자도 없이 다시 빛을 내고',
      '엘프와 드워프의 백 년 휴전 협정이 하룻밤에 깨지고',
      '하늘에 두 번째 달이 떠오르며 마수들이 광폭화하고',
      '폐광 깊은 곳에서 잠들어 있던 골렘이 눈을 뜨고',
      '신생아의 울음과 함께 잊힌 신의 이름이 되살아나고',
      '바다가 갈라지며 가라앉았던 옛 왕국이 떠오르고',
      '한 마을의 모든 그림자가 동시에 사라져 버리고',
      '예언의 별이 정해진 자리에서 어긋나 떨어지고',
      '죽은 자를 되살린다는 금서가 경매에 부쳐지고',
      '국왕의 대관식 한복판에서 성검이 거부의 빛을 내고',
      '드래곤이 천 년 만에 인간의 말로 경고를 보내오고',
    ],
  },
  {
    key: 'stage', label: '무대', icon: '🏰', desc: '어디에서 벌어지는가',
    faces: [
      '안개가 결코 걷히지 않는 저주받은 변경의 숲',
      '하늘에 떠 있는 마법사들의 부유성(浮遊城)',
      '지하 아홉 층으로 내려갈수록 강해지는 미궁 던전',
      '신과 인간이 거래하던 폐허가 된 옛 신전',
      '왕위 계승을 둘러싼 음모가 들끓는 황도(皇都)의 궁정',
      '용들이 잠든 화산 분지의 비룡 산맥',
      '죽은 자들이 산 자처럼 거니는 망령의 도시',
      '얼어붙은 북방, 봉인된 옛 악이 잠든 빙벽 너머',
      '마도공학이 증기와 마나로 돌아가는 길드 도시',
      '바다 밑으로 가라앉은 옛 마법 왕국의 수도',
      '계급이 마력으로 갈리는 마법학교의 첨탑',
      '게이트가 도심 한복판에 열린 현대의 헌터 협회',
      '시간이 거꾸로 흐르는 정령계의 경계 숲',
      '종족 간 휴전선이 그어진 분쟁의 회랑',
      '하루에 한 번만 문이 열리는 떠도는 마법 상점',
      '예언이 새겨진 거대한 세계수의 뿌리 아래',
      '악역 영애가 파혼당한 황실의 무도회장',
      '대전쟁의 시체 위에 세워진 폐성(廢城)의 옥좌',
      '계약으로만 들어갈 수 있는 차원의 틈새 도서관',
      '성좌들이 베팅하는 시나리오 무대가 된 멸망 직전의 도시',
      '천장이 보이지 않는 마법사 길드의 끝없는 서고',
      '국경을 가르는 마수의 숲, 검은 장벽 너머',
      '용병과 밀수꾼이 뒤섞인 항구 도시의 뒷골목',
      '진명을 잊으면 길을 잃는 안개의 미궁',
      '신탁을 받던 무녀들이 사라진 텅 빈 신탁소',
      '계급장이 곧 마력 등급인 제국 마법군의 병영',
      '하루마다 구조가 바뀌는 살아 있는 마법 성',
      '죽은 왕들이 잠든 지하 묘소의 왕가 납골당',
      '인간 출입이 금지된 정령들의 봄 축제 숲',
      '거울마다 다른 세계가 비치는 마녀의 저택',
      '검과 마법이 금지된 평화 협정의 중립 도시',
      '용암 위에 다리로 이어진 드워프의 지하 대장간 도시',
      '회귀할 때마다 처음 눈뜨는 멸망 사흘 전의 그 방',
    ],
  },
  {
    key: 'magic', label: '마법·이적', icon: '✨', desc: '어떤 초자연 법칙이 작동하는가',
    faces: [
      '대가로 수명을 깎아 쓰는 금단의 흑마법',
      '진명(眞名)을 알아야만 부릴 수 있는 균형의 마법',
      '금속을 태워 능력으로 바꾸는 정밀한 하드 매직',
      '서클이 높을수록 영창이 길어지는 정통 마법 체계',
      '죽은 자를 되살리되 영혼의 한 조각을 떼어 가는 사령술',
      '계약한 정령의 변덕에 결과가 갈리는 소환술',
      '읽으면 지식과 함께 광기가 스며드는 금서의 마법',
      '검에 마나를 둘러 베는 소드마스터의 오러',
      '예지를 보여주되 본 자를 천천히 눈멀게 하는 신성마법',
      '쓸 때마다 시전자의 기억 한 토막이 사라지는 망각술',
      '레벨과 스탯으로 수치화되는 시스템형 각성 능력',
      '회귀자만이 아는 미래 정보 그 자체가 무기가 되는',
      '피의 혈통에만 발현되는 봉인된 고대 권능',
      '말하는 순간 반드시 이뤄지지만 비틀려 이뤄지는 언령',
      '그림자를 제물로 바쳐 형체 없는 군대를 부리는',
      '마나가 없는 자에게는 보이지도 들리지도 않는 비술',
      '한 번 쓰면 세계의 균형에 빚을 지는 신의 권능',
      '거울을 매개로 다른 차원의 자신과 힘을 맞바꾸는',
      '룬을 새긴 자리에 영원히 흉터가 남는 인챈트',
      '믿는 자가 많을수록 강해지고 잊히면 소멸하는 신앙의 기적',
      '등가교환으로 무엇을 얻으면 같은 무게를 잃는 연금술',
      '계약서에 적힌 글자 그대로만 작동하는 악마의 권능',
      '죽기 직전에야 한 번 폭발하는 봉인된 혈맥의 힘',
      '꿈속에서만 시전할 수 있는 몽환계의 마법',
      '노래로 사물에 명령하는 잊혀진 음유시인의 가락',
      '베인 상처가 곧 마법진이 되는 피의 의식 마법',
      '시간을 되감되 시전자만 그 기억을 짊어지는 시계 마법',
      '소환수의 진짜 이름을 부르면 주종이 뒤바뀌는 계약술',
      '대지·바람·불·물 네 정령의 동의를 얻어야 발동하는 사대마법',
      '한 번 약속하면 어길 시 심장이 멎는 맹세의 마법',
      '읽은 책의 내용을 현실로 끌어내는 위험한 서고술',
      '신의 권능을 빌리되 신의 시선에 평생 감시당하는 신탁술',
      '레벨을 올리는 대신 인간성을 한 칸씩 잃는 마경(魔境)의 힘',
    ],
  },
  {
    key: 'threat', label: '위협 세력', icon: '🐉', desc: '맞서는 적·재앙은 무엇인가',
    faces: [
      '부활을 앞둔 봉인 속 마왕과 그 사도들',
      '인간을 가축으로 여기는 고대 용의 일족',
      '도시를 통째로 삼키려는 언데드 군단과 리치',
      '교리를 무기 삼아 이단을 화형하는 광신의 교단',
      '왕좌를 노리고 형제를 베는 황실의 음모가들',
      '계약을 빌미로 영혼을 거두는 차원 너머의 악마',
      '마나를 빨아먹으며 번지는 정체불명의 마법 역병',
      '종족 청소를 명분으로 진군하는 제국의 정예군',
      '주인을 배신하고 폭주한 고대 골렘과 자동인형',
      '게이트 너머에서 쏟아지는 등급 외(外) 보스 몬스터',
      '예언을 막으려 예언의 아이를 사냥하는 비밀 결사',
      '균형을 강제하려 재앙을 내리는 무자비한 신들',
      '미래를 알고 같은 회차를 반복하는 또 다른 회귀자',
      '시나리오 클리어를 막으려는 적대 성좌의 화신',
      '인간으로 위장해 궁정에 스며든 마족 첩자',
      '숲을 불태우는 인간에 맞서 일어선 분노한 정령왕',
      '계약자를 잡아먹으며 몸집을 불리는 사역마 군집',
      '죽은 영웅의 시신에 깃든 원혼의 데스나이트',
      '세계를 리셋하려는 창세 이전의 태초의 공허',
      '아군의 탈을 쓴, 모든 것을 꾸민 진짜 흑막',
      '소원을 들어주되 더 큰 것을 앗아 가는 마신(魔神)',
      '봉인이 풀릴 때마다 강해지는 일곱 사도(使徒)',
      '용을 부려 하늘에서 도시를 불태우는 폭군',
      '인간의 기억을 갉아먹으며 번지는 망각의 안개',
      '진명을 모으면 세계를 다시 쓰려는 고대의 사서',
      '죽지 않는 군주를 떠받드는 불사(不死)의 군단',
      '예언을 빌미로 산 제물을 요구하는 어둠의 사교(邪敎)',
      '대륙을 둘로 가르려는 두 황가의 대리 전쟁',
      '계약을 어긴 자를 사냥하는 정령들의 분노',
      '시스템의 허점을 악용해 각성자를 사냥하는 랭커',
      '신을 참칭하며 기적을 위조하는 거짓 성자',
      '봉인을 풀려고 영웅으로 위장한 마왕 자신',
      '세계수를 베어 마력을 독점하려는 마탑의 수장',
    ],
  },
  {
    key: 'who', label: '휘말리는 인물', icon: '🧝', desc: '누가 사건의 중심에 서는가',
    faces: [
      '재능 없다 멸시받다 뒤늦게 각성한 변방의 소년',
      '왕족의 핏줄을 모른 채 자란 고아',
      '동료에게 버림받고 회귀한 전직 최강자',
      '파멸 플래그를 피하려는, 소설 속 악역으로 빙의한 자',
      '예언이 지목한, 정작 평범하기만 한 선택받은 자',
      '인간을 경멸하던 고결한 엘프 마지막 생존자',
      '복수만을 위해 살아남은 멸문가의 외동',
      '신을 잃고 신성을 잃어 가는 마지막 성녀',
      '계약 마법을 어겨 저주에 묶인 떠돌이 마법사',
      '랭킹 최하위에서 시작해 시스템을 독점한 각성자',
      '마왕을 죽이라 명받았으나 마왕을 동정하는 용사',
      '기억을 잃은 채 적의 진영에서 눈을 뜬 옛 영웅',
      '인간과 마족 사이에서 태어나 양쪽에 쫓기는 혼혈',
      '죽은 스승의 진명을 물려받은 어린 후계자',
      '차갑지만 자신에게만 다정한 황태자에게 얽힌 영애',
      '동료를 지키려다 금주에 손을 댄 치유사',
      '드워프 장인 가문에서 쫓겨난 파문당한 대장장이',
      '예언을 거부하고 운명을 비틀기로 한 반항아',
      '성좌의 화신으로 지명되어 무대에 끌려온 독자',
      '봉인을 지키다 봉인과 함께 잊힌 마지막 수호자',
      '버림받은 황비였다가 회귀해 다시 사는 여인',
      '용의 알을 품어 버려 쫓기는 떠돌이 도굴꾼',
      '진명을 잃어 자기 이름조차 부르지 못하는 마법사',
      '신탁을 거짓으로 꾸며야 했던 가짜 성녀',
      '마왕의 피를 이었으나 인간으로 살고 싶은 소녀',
      '계약 정령에게 영혼을 저당 잡힌 어린 소환사',
      '예언서를 통째로 외운 변방의 무명 사서',
      '몰락한 공작가의 명예를 되찾으려는 막내딸',
      '동료를 잃고 혼자 살아 돌아온 길드의 막내',
      '시스템 메시지를 자신만 볼 수 있는 평범한 회사원',
      '왕을 시해한 누명을 쓰고 도망친 근위 기사',
      '봉인을 풀 열쇠인 줄도 모르고 길러진 양녀',
      '두 번째 회차에서 모든 것을 바꾸려는 회귀 용사',
    ],
  },
  {
    key: 'stake', label: '판돈', icon: '⚖️', desc: '무엇이 걸려 있는가',
    faces: [
      '대륙 전체의 운명과 수백만의 목숨',
      '봉인이 풀리기까지 남은 단 사흘의 시간',
      '되찾을 수 없는 단 하나의 핏줄, 가족의 생사',
      '왕좌의 정통성과 한 왕국의 존망',
      '깨지면 모든 마법이 사라지는 세계의 균형',
      '잃으면 영혼째 소멸하는 마지막 계약',
      '예언의 성취냐 전복이냐, 정해진 미래 그 자체',
      '두 종족의 휴전이냐 전면전이냐의 갈림길',
      '봉인된 마왕의 부활을 막을 마지막 기회',
      '회귀로 얻은 단 한 번뿐인 다시 사는 생',
      '신을 향한 믿음과 신앙 공동체의 존속',
      '주인공이 잃어버린 진짜 이름과 정체성',
      '세계를 리셋할 권능을 누가 손에 쥐느냐',
      '성좌가 건 시나리오의 클리어 보상과 멸망',
      '복수를 완성하느냐 인간으로 남느냐의 선택',
      '마지막 세계수와 모든 정령의 생명',
      '되살릴 수 있는 단 한 명, 그 대가로 잃을 또 한 명',
      '대마법의 발동을 막을 마나의 마지막 한 줌',
      '진실을 밝히느냐 묻느냐, 한 시대의 역사',
      '악역의 파멸 플래그를 꺾을 단 한 번의 분기점',
      '용의 마지막 알, 한 종족의 존속 그 자체',
      '잠든 마왕을 누가 먼저 깨우느냐의 경쟁',
      '신을 향한 마지막 기도가 닿느냐 묻히느냐',
      '제국과 변방 종족 사이의 학살을 막을 협상',
      '되살릴 단 한 사람을 누구로 정하느냐의 선택',
      '봉인의 열쇠가 적의 손에 넘어가느냐 마느냐',
      '주인공의 정체가 드러나면 잃을 모든 신뢰',
      '예언이 가리킨 아이를 살리느냐 죽이느냐',
      '마탑의 비술을 세상에 공개하느냐 봉인하느냐',
      '대륙을 가르는 마지막 다리를 지키느냐 무너뜨리느냐',
      '천 년의 휴전을 이어 갈 단 하나의 맹세',
      '회귀의 마지막 기회를 어디에 쓰느냐',
      '세계가 다시 쓰일 책의 첫 문장을 누가 적느냐',
    ],
  },
  {
    key: 'twist', label: '반전', icon: '🌀', desc: '무엇이 뒤집히는가',
    faces: [
      '봉인한 것은 마왕이 아니라 마왕을 막던 영웅이었다',
      '예언의 아이는 구원자가 아니라 멸망의 방아쇠였다',
      '믿었던 멘토가 모든 비극을 설계한 흑막이었다',
      '회귀의 기억이 사실은 적이 심어 놓은 가짜였다',
      '용은 인간을 사냥한 적이 없고 인간이 먼저 배신했다',
      '주인공이 죽이려던 마왕이 잃어버린 형제였다',
      '신탁은 신이 아니라 봉인된 악이 흘려보낸 거짓이었다',
      '구원의 의식은 세계를 제물로 바치는 절차였다',
      '악역 영애의 파멸은 오히려 세계를 구하는 길이었다',
      '죽은 줄 알았던 스승이 적의 편에서 살아 있었다',
      '성좌는 독자를 응원한 것이 아니라 베팅하고 있었다',
      '진짜 선택받은 자는 따로 있었고 주인공은 미끼였다',
      '봉인을 지키던 수호자가 봉인을 푸는 열쇠였다',
      '적군의 진군은 더 큰 재앙으로부터 도망치는 행렬이었다',
      '주인공이 쓰던 힘이 곧 세계를 좀먹던 병의 근원이었다',
      '예언은 이미 한 번 어긋났고, 지금은 두 번째 회차였다',
      '구하려던 가족이 사건의 진짜 배후였다',
      '마왕의 부활을 바란 것은 다름 아닌 신들이었다',
      '계약을 깬 정령들은 더 끔찍한 계약에서 도망친 것이었다',
      '세계를 리셋하려는 공허는 사실 주인공 자신이었다',
      '구원자로 모셔진 성녀가 봉인을 푸는 제물이었다',
      '잃어버린 왕의 핏줄은 적국의 황제에게 흐르고 있었다',
      '주인공의 회귀는 이번이 처음이 아니라 수백 번째였다',
      '용을 봉인한 것이 아니라 용이 인간을 보호하고 있었다',
      '예언서를 쓴 것은 미래에서 돌아온 주인공 자신이었다',
      '동료라 믿은 자가 사실은 위장한 적의 첩자였다',
      '마탑이 지키던 비밀은 마법이 곧 세계의 독이라는 사실이었다',
      '구하려던 세계는 이미 다른 누군가의 꿈속이었다',
      '신탁의 신은 오래전에 죽었고 사제들만 모르고 있었다',
      '봉인을 풀면 멸망이 아니라 진짜 구원이 오는 것이었다',
      '왕을 시해한 진범은 가장 충성스럽던 근위였다',
      '진명을 되찾으면 잊었던 죄까지 함께 돌아오는 것이었다',
    ],
  },
  {
    key: 'cost', label: '대가', icon: '🩸', desc: '무엇을 잃거나 남기는가',
    faces: [
      '승리의 대가로 마법이 영영 세계에서 사라진다',
      '봉인을 다시 채우려 누군가 산 채로 봉인 속에 들어간다',
      '구한 세계에서 주인공만이 모두에게 잊힌다',
      '되살린 자의 자리에 다른 이의 이름이 지워진다',
      '예언을 비튼 대가로 더 잔혹한 미래가 싹튼다',
      '두 종족의 평화는 한 영웅의 무덤 위에 세워진다',
      '진명을 되찾는 순간 지금의 자아가 소멸한다',
      '마왕은 죽었으나 그 빈자리에 새 어둠이 들어선다',
      '회귀의 권능을 다 써 버려 다음은 없는 단 한 번이 된다',
      '신앙을 지키려 성녀가 신성을 모두 불태운다',
      '복수를 끝낸 자에게 남은 것은 텅 빈 폐허뿐이다',
      '계약의 대가로 잃은 그림자는 끝내 돌아오지 않는다',
      '세계는 구원받았지만 균형의 빚이 다음 세대로 넘어간다',
      '진실이 드러나자 함께 싸운 동료들이 등을 돌린다',
      '시나리오는 클리어됐으나 성좌들이 새 무대를 선포한다',
      '봉인된 악은 잠들었을 뿐, 카운트다운이 다시 시작된다',
      '용을 살린 대가로 인간들의 증오를 평생 짊어진다',
      '기억을 되찾는 대신 사랑한 이를 알아보지 못하게 된다',
      '권좌에 올랐으나 그 자리는 거짓 위에 세워져 있다',
      '모두가 살아남았지만 단 한 가지 약속만은 깨어졌다',
      '예언을 막은 대가로 더 이상 미래를 볼 수 없게 된다',
      '봉인을 푼 자는 자유를 얻고 세계는 두려움을 얻는다',
      '용과 화해한 대신 인간 사회에서 영원히 추방된다',
      '동료를 살리려 자신의 이름을 역사에서 지운다',
      '승리의 함성 뒤에 남은 것은 텅 빈 폐허의 침묵뿐이다',
      '신성을 되찾았으나 인간으로서의 감정은 잃어버린다',
      '진실을 밝힌 대가로 평생 거짓말쟁이로 낙인찍힌다',
      '마법을 봉인해 평화를 얻되 옛 경이는 영영 사라진다',
      '계약을 끝낸 정령은 떠나고 다시는 봄이 오지 않는다',
      '회귀의 권능이 끊겨 이제 단 한 번의 삶만이 남는다',
      '왕좌를 되찾았으나 함께 싸운 이들은 모두 잠들었다',
      '세계는 다시 쓰였으나 옛 세계를 기억하는 건 자신뿐이다',
      '마왕을 봉인하느라 주인공도 함께 천 년의 잠에 든다',
    ],
  },
]

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

// 큰 수 표기(한국 단위: 조/억/만). 조합 1조 이상을 강조.
function fmtBig(n: number): string {
  const ko = n.toLocaleString('ko-KR')
  const jo = 1_0000_0000_0000
  const eok = 1_0000_0000
  const man = 1_0000
  let unit = ''
  if (n >= jo) unit = `약 ${(n / jo).toFixed(2)}조`
  else if (n >= eok) unit = `약 ${(n / eok).toFixed(1)}억`
  else if (n >= man) unit = `약 ${Math.round(n / man)}만`
  return unit ? `${ko} (${unit})` : ko
}

// 활성 슬롯들의 조합 가짓수.
function comboCount(activeKeys: string[]): number {
  return activeKeys.reduce((acc, k) => {
    const s = SLOTS.find((x) => x.key === k)
    return acc * (s ? s.faces.length : 1)
  }, 1)
}

// 굴린 결과들을 자연스러운 판타지 사건 전개 단락으로 엮는다(의미 단위 조립).
function compose(by: Record<string, string>): string {
  const { spark, stage, magic, threat, who, stake, twist, cost } = by
  const parts: string[] = []
  // 1) 발단 + 무대
  if (spark) parts.push(stage ? `${stage}에서, ${spark}` : spark)
  else if (stage) parts.push(`${stage}에서, 사건이 시작된다`)
  // 2) 마법/이적이 작동하는 세계
  if (magic) parts.push(`이곳의 법칙은 ${magic} 마법이다`)
  // 3) 휘말리는 인물 + 위협
  if (who) {
    if (threat) parts.push(`${who}이(가) ${threat}에 맞서게 된다`)
    else parts.push(`그 한가운데에 ${who}이(가) 서 있다`)
  } else if (threat) {
    parts.push(`${threat}이(가) 모든 것을 위협한다`)
  }
  // 4) 판돈
  if (stake) parts.push(`걸린 것은 ${stake}`)
  // 5) 반전
  if (twist) parts.push(`그러나 진실은 — ${twist}`)
  // 6) 대가
  if (cost) parts.push(`그리고 그 끝에서, ${cost}`)
  if (!parts.length) return ''
  return parts.map((p) => p.replace(/[.。]$/, '')).join('. ') + '.'
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface Saved { id: string; text: string; note: string; slots: string; rows: string }

export default function GenreEventForge({ payload }: { payload?: Record<string, unknown> }) {
  // 활성 슬롯(기본 전부) — 저장/복원
  const [active, setActive] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':active')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length) {
          const valid = arr.filter((k: string) => SLOTS.some((s) => s.key === k))
          if (valid.length) return SLOTS.filter((s) => valid.includes(s.key)).map((s) => s.key)
        }
      }
    } catch { /* ignore */ }
    return SLOTS.map((s) => s.key)
  })
  const [results, setResults] = useState<Record<string, string>>({})
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)

  // 보관함 — 저장/복원
  const [saved, setSaved] = useState<Saved[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':saved')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          return arr.filter((s) => s && typeof s.text === 'string').map((s, i) => ({
            id: typeof s.id === 'string' ? s.id : 'sv_' + i,
            text: String(s.text),
            note: typeof s.note === 'string' ? s.note : '',
            slots: typeof s.slots === 'string' ? s.slots : '',
            rows: typeof s.rows === 'string' ? s.rows : '',
          }))
        }
      }
    } catch { /* ignore */ }
    return []
  })

  const [tab, setTab] = useState<'forge' | 'saved'>('forge')
  const [toast, setToast] = useState('')
  const [copiedKey, setCopiedKey] = useState('')
  const nonce = useRef(0)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 페이로드로 슬롯 프리셋이 넘어오면 적용(연계 진입). 1회.
  useEffect(() => {
    const want = payload?.slots
    if (Array.isArray(want)) {
      const valid = want.filter((k): k is string => typeof k === 'string' && SLOTS.some((s) => s.key === k))
      if (valid.length) setActive(SLOTS.filter((s) => valid.includes(s.key)).map((s) => s.key))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 저장
  useEffect(() => { try { localStorage.setItem(LS + ':active', JSON.stringify(active)) } catch { /* ignore */ } }, [active])
  useEffect(() => { try { localStorage.setItem(LS + ':saved', JSON.stringify(saved)) } catch { /* ignore */ } }, [saved])

  // 비활성 슬롯의 결과/잠금 정리
  useEffect(() => {
    setResults((prev) => {
      const next: Record<string, string> = {}
      active.forEach((k) => { if (prev[k]) next[k] = prev[k] })
      return next
    })
    setLocked((prev) => {
      const next: Record<string, boolean> = {}
      active.forEach((k) => { if (prev[k]) next[k] = true })
      return next
    })
  }, [active])

  // 굴림 애니메이션 자동 해제 + 언마운트 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 340)
    return () => window.clearTimeout(t)
  }, [rolling])

  // 복사/토스트 피드백 정리(언마운트 포함)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1900)
    return () => window.clearTimeout(t)
  }, [toast])
  useEffect(() => {
    if (!copiedKey) return
    const t = window.setTimeout(() => { if (mounted.current) setCopiedKey('') }, 1500)
    return () => window.clearTimeout(t)
  }, [copiedKey])

  const toggleSlot = (key: string) => {
    setActive((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev // 최소 1개
        return prev.filter((k) => k !== key)
      }
      return SLOTS.filter((s) => prev.includes(s.key) || s.key === key).map((s) => s.key)
    })
  }

  const allOn = () => setActive(SLOTS.map((s) => s.key))

  const forge = useCallback(() => {
    const my = ++nonce.current
    setRolling(true)
    setResults((prev) => {
      if (my !== nonce.current) return prev
      const next: Record<string, string> = { ...prev }
      active.forEach((k) => {
        if (locked[k] && prev[k]) return // 잠긴 슬롯 유지
        const slot = SLOTS.find((s) => s.key === k)
        if (!slot) return
        let f = pick(slot.faces)
        if (f === prev[k] && slot.faces.length > 1) f = pick(slot.faces) // 연속 중복 완화
        next[k] = f
      })
      return next
    })
  }, [active, locked])

  const toggleLock = (key: string) => setLocked((prev) => ({ ...prev, [key]: !prev[key] }))

  const rolledList = active
    .map((k) => ({ slot: SLOTS.find((s) => s.key === k)!, face: results[k] }))
    .filter((r) => r.slot && r.face) as { slot: Slot; face: string }[]

  const hasResults = rolledList.length > 0
  const byKey: Record<string, string> = {}
  rolledList.forEach((r) => { byKey[r.slot.key] = r.face })
  const story = hasResults ? compose(byKey) : ''
  const combos = comboCount(active)
  const slotLabelLine = active.map((k) => SLOTS.find((s) => s.key === k)?.label || k).join('·')
  const rowsText = () => rolledList.map((r) => `${r.slot.icon} ${r.slot.label}: ${r.face}`).join('\n')

  const saveCurrent = () => {
    if (!hasResults) return
    setSaved((prev) => {
      if (prev.some((s) => s.text === story)) { setToast('이미 보관함에 있습니다.'); return prev }
      const rec: Saved = {
        id: 'sv_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4).toString(36),
        text: story,
        note: '',
        slots: slotLabelLine,
        rows: rowsText(),
      }
      setToast('보관함에 저장했습니다.')
      return [rec, ...prev]
    })
  }

  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))
  const setNote = (id: string, note: string) => setSaved((prev) => prev.map((s) => (s.id === id ? { ...s, note } : s)))
  const moveSaved = (id: string, dir: -1 | 1) => {
    setSaved((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      const ni = idx + dir
      if (ni < 0 || ni >= prev.length) return prev
      const a = prev.slice()
      ;[a[idx], a[ni]] = [a[ni], a[idx]]
      return a
    })
  }

  const copy = (key: string, text: string) => {
    const done = () => { if (mounted.current) setCopiedKey(key) }
    try {
      if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done)) }
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setToast('복사에 실패했습니다.') }
  }

  // 프로젝트 본문(HTML) — 완성 사건 + 슬롯별 분해.
  const bodyHtmlFor = (text: string, rows: string, slots: string) => {
    const rowLines = rows
      ? rows.split('\n').filter(Boolean).map((ln) => `<p>${escHtml(ln)}</p>`).join('')
      : ''
    return [
      `<p style="font-size:15px;line-height:1.8;"><b>${escHtml(text)}</b></p>`,
      `<hr/>`,
      slots ? `<p><b>슬롯 조합:</b> ${escHtml(slots)}</p>` : '',
      rowLines,
    ].join('')
  }

  // 프로젝트 연동 — 현재 사건을 자료(research)/'사건' 폴더에 문서로 추가.
  const addStoryToProject = () => {
    if (!hasResults) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '사건',
      title: `⚔️ 판타지 사건 — ${story.slice(0, 26)}${story.length > 26 ? '…' : ''}`,
      bodyHtml: bodyHtmlFor(story, rowsText(), slotLabelLine),
      synopsis: story,
      meta: {
        발단: byKey.spark || '—',
        무대: byKey.stage || '—',
        위협: byKey.threat || '—',
        판돈: byKey.stake || '—',
        장르: '판타지',
      },
    })
    setToast(id ? '프로젝트 자료 〈사건〉 폴더에 사건을 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 스니펫 저장 — 글감 라이브러리에 사건을 스니펫으로 추가(여러 도구가 공유).
  const saveSnippet = (text: string, slots: string) => {
    if (!text) return
    addToLibrary('snippets', {
      text: `[판타지 사건] ${text}`,
      source: '판타지 사건 대장간',
      tags: ['글감', '사건', '판타지', ...slots.split('·').filter(Boolean)],
    })
    setToast('스니펫 라이브러리에 저장했습니다.')
  }

  // 보관 항목 하나를 프로젝트에 추가
  const addSavedToProject = (s: Saved) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '사건',
      title: `⚔️ 판타지 사건 — ${s.text.slice(0, 26)}${s.text.length > 26 ? '…' : ''}`,
      bodyHtml: bodyHtmlFor(s.text, s.rows, s.slots) + (s.note ? `<p style="color:#888;">📝 ${escHtml(s.note)}</p>` : ''),
      synopsis: s.text,
      meta: { 장르: '판타지' },
    })
    setToast(id ? '프로젝트 〈사건〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const cardBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>발단·무대·마법·위협·인물·판돈·반전·대가</b> 여덟 슬롯을 골라 굴리면, 판타지 한 국면이 되는 사건 전개로 엮어 줍니다. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴리세요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'}
          style={{ borderColor: tab === 'forge' ? 'var(--accent)' : 'var(--border)', color: tab === 'forge' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⚔️"/> 생성
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐"/> 보관함 ({saved.length})
        </button>
      </div>

      {tab === 'forge' && (
        <>
          {/* 슬롯 선택 */}
          <div style={chipRow}>
            {SLOTS.map((s) => {
              const on = active.includes(s.key)
              return (
                <button key={s.key} className="minibtn" onClick={() => toggleSlot(s.key)} aria-pressed={on}
                  title={s.desc}
                  style={{ opacity: on ? 1 : 0.5, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                  <Emoji e={s.icon}/> {s.label}{on ? '' : ' +'}
                </button>
              )
            })}
            {active.length < SLOTS.length && (
              <button className="minibtn" onClick={allOn} title="모든 슬롯 켜기" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                ⊕ 전체
              </button>
            )}
          </div>

          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmtBig(combos)}</b>가지
            {combos >= 1_0000_0000_0000 ? <> — 1조 이상 <Emoji e="🔥"/></> : combos >= 1_0000_0000 ? ' — 1억 이상' : ''}
          </div>

          {/* 슬롯별 굴림 결과 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {active.map((k) => {
              const slot = SLOTS.find((s) => s.key === k)!
              const face = results[k]
              const isLocked = !!locked[k]
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 22, width: 28, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-12deg) scale(1.15)' : 'none' }}>
                    <Emoji e={slot.icon}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{slot.label} <span style={{ opacity: 0.7 }}>· {slot.faces.length}종</span></div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: face ? 'var(--text)' : 'var(--muted)' }}>
                      {face ? (rolling && !isLocked ? '…' : face) : '— 굴려주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => toggleLock(k)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 완성 사건 전개 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="⚔️"/> 사건 전개</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: hasResults ? 'var(--text)' : 'var(--muted)' }}>
              {story || '슬롯을 골라 굴리면, 한 편의 판타지 사건이 만들어집니다.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 130 }} onClick={forge}><Emoji e="⚔️"/> 생성 / 다시 굴리기</button>
            <button className="minibtn" onClick={() => copy('story', `${story}\n\n${rowsText()}`)} disabled={!hasResults}>
              {copiedKey === 'story' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={saveCurrent} disabled={!hasResults}><Emoji e="⭐"/> 보관</button>
            <button className="minibtn" onClick={() => saveSnippet(story, slotLabelLine)} disabled={!hasResults} title="글감 스니펫 라이브러리에 저장"><Emoji e="✂️"/> 스니펫</button>
          </div>

          {/* 프로젝트·관련 도구 연계 */}
          <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
            <button className="linkbtn" onClick={addStoryToProject} disabled={!hasResults || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !hasResults ? '먼저 사건을 굴려주세요' : '현재 사건을 프로젝트 자료 〈사건〉 폴더에 문서로 추가'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid')} title="플롯 피라미드 열기"><Emoji e="📐"/> 플롯 피라미드</button>
            <button className="linkbtn" onClick={() => openToolLinked('scene-list')} title="장면 목록 열기"><Emoji e="🎬"/> 장면 목록</button>
            <button className="linkbtn" onClick={() => openToolLinked('world-wiki')} title="세계관 위키 열기"><Emoji e="📖"/> 세계관 위키</button>
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐"/></div>
              보관한 사건이 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성 탭에서 <Emoji e="⭐"/> 보관을 눌러 마음에 드는 판타지 사건을 모아보세요.</span>
            </div>
          )}
          {saved.map((s, i) => {
            const k = 'sv' + s.id
            return (
              <div key={s.id} style={cardBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {s.slots && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px' }}>{s.slots}</span>}
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                  <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">▼</button>
                  <button className="minibtn" onClick={() => copy(k, s.text + (s.rows ? `\n\n${s.rows}` : '') + (s.note ? `\n📝 ${s.note}` : ''))} title="복사">
                    {copiedKey === k ? <>✓</> : <Emoji e="📋"/>}
                  </button>
                  <button className="minibtn" onClick={() => saveSnippet(s.text, s.slots)} title="스니펫 라이브러리에 저장"><Emoji e="✂️"/></button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑"/></button>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.65 }}>{s.text}</div>
                {s.rows && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{s.rows}</div>
                )}
                <textarea
                  value={s.note}
                  onChange={(e) => setNote(s.id, e.target.value)}
                  placeholder="이 사건을 어느 챕터·국면에 쓸지 메모…"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
                <div className="linkbar">
                  <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
                  <button className="linkbtn" onClick={() => addSavedToProject(s)} disabled={!hasProjectBridge()}
                    title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 사건을 프로젝트 자료 〈사건〉 폴더에 추가'}>
                    <Emoji e="📄"/> 프로젝트에 추가
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>사건 전개는 출발점일 뿐입니다. 같은 조합이라도 내 세계관·마법 체계·인물에 맞춰 자유롭게 비틀어 보세요. (소프트 매직이라면 반전·대가를 분위기로, 하드 매직이라면 복선 회수로)</div>
    </div>
  )
}
