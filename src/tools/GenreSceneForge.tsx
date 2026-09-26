// 판타지 장면 생성기(GenreSceneForge) — 판타지 장르의 전형 장면을, 도시에(dossier)에 근거한
//  요소 슬롯(무대·시각/기후·시점 인물·마법/이적·갈등·전환 사건·감각 디테일·전개법)으로 조합 생성한다.
//  하이 판타지/이세계/헌터물/로판/그림다크 등 하위유형을 '전개법' 슬롯으로 적용해, 같은 무대라도
//  영웅의 여정·회차 후킹·POV·사이다 등 장르 관습에 맞춰 한 편의 장면 설계로 엮는다(완전 로컬, 외부 API 없음).
//  슬롯별 🔒 잠금 + 🎲 부분 재생성. 가능한 조합 1조(1,000,000,000,000) 이상.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(보관함)만 사용.
// 연계(linkbus): addToProject(folder:'장면')·장면 목록(scene-list)·배경/스니펫 라이브러리·관련 도구 열기.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = { id: 'genre-sceneforge', name: '판타지 장면 생성기(1조+ 조합)', icon: '🐉', group: '생성기', genre: '판타지', intro: '무대·마법·갈등·전환과 하위유형 전개법을 굴려 판타지 전형 장면을 1조+ 조합으로 설계하세요', w: 600, h: 700 }

const LS = 'sry:tool:genre-sceneforge'

// ---------------------------------------------------------------------------
// 슬롯 정의 — 각 슬롯은 판타지 장면의 한 축. faces 는 도시에에 근거한 자작 로컬 풀(장르 특화·구체적).
//  풀을 크게 잡아 7개 슬롯 조합이 1조(10^12)를 가뿐히 넘도록 설계.
// ---------------------------------------------------------------------------
interface Slot { key: string; label: string; icon: string; desc: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'stage', label: '무대', icon: '🏰', desc: '장면이 펼쳐지는 판타지 무대',
    faces: [
      '구름을 뚫고 솟은 마탑(魔塔) 최상층 영창실',
      '용이 잠든 화산 분화구의 보물 동굴',
      '서리 덮인 엘프 왕국의 은빛 회랑',
      '지하 깊은 곳 드워프 대장간의 용광로 앞',
      '저주받은 폐성, 무너진 알현실',
      '안개에 잠긴 고대 신전의 봉인의 방',
      '마수가 우글대는 검은 숲의 갈림길',
      '시체가 일어서는 네크로맨서의 묘지',
      '모험가 길드 1층, 의뢰 게시판 앞 선술집',
      '갓 열린 던전의 1층 입구, 푸른 마법진 위',
      '도시 한복판에 찢어진 차원의 게이트 앞',
      '황실 무도회장, 샹들리에 아래 대리석 홀',
      '성좌들이 내려다보는 시나리오 개시의 광장',
      '왕도를 굽어보는 성벽 위 망루',
      '용병들이 모인 변경 요새의 식당',
      '죽음의 사막 한가운데, 모래에 묻힌 고대 도시',
      '바다 위를 떠가는 비공정의 갑판',
      '세계수(世界樹) 뿌리 아래의 정령 샘',
      '봉인된 마왕성으로 향하는 마지막 다리',
      '시간이 멈춘 듯한 현자의 미궁 서고',
      '검기가 오가는 검술학원의 연무장',
      '회귀 직후 눈뜬, 십 년 전 그 방',
      '악역 영애가 파혼당하는 황태자의 정원',
      '계약 마법진이 그려진 소환사의 의식장',
      '용암이 흐르는 마계의 옥좌 앞',
      '눈보라가 휘몰아치는 설산 정상의 제단',
      '랭커들이 격돌하는 투기장 중앙',
      '성수(聖水)가 마르지 않는 신성 교단의 대성당',
      '고대 룬이 빛나는 봉인 해제의 제단',
      '망령들이 떠도는 안개 낀 늪지대',
      '드래곤 라이더의 둥지가 있는 절벽 꼭대기',
      '마법 폭주로 반쯤 무너진 학원 첨탑',
      '왕위 계승을 다투는 귀족 회의장',
      '정령왕이 잠든 얼어붙은 호수 한복판',
      '금기의 흑마법서가 봉인된 지하 금서고',
      '용사 파티가 야영하는 마지막 던전 직전의 모닥불 앞',
      '교수형 직전의 처형대, 군중이 운집한 광장',
      '이세계로 소환된 직후의 새하얀 신전 제단',
      '마정석 광맥이 빛나는 폐광 갱도',
      '예언이 새겨진 신탁의 동굴 깊은 곳',
    ],
  },
  {
    key: 'time', label: '시각·기후', icon: '🌙', desc: '시각과 날씨 — 경이감을 빚는 배경',
    faces: [
      '두 개의 달이 겹쳐 핏빛으로 물든 밤',
      '마력의 오로라가 하늘을 가르는 새벽',
      '용의 화염으로 하늘이 붉게 타는 황혼',
      '서리 마법이 대기를 얼리는 한겨울 정오',
      '안개와 함께 망령이 깨어나는 자정',
      '별자리가 유난히 또렷한 무월(無月)의 밤',
      '마나 폭풍이 몰아치는 잿빛 오후',
      '성수가 빛나는 축일(祝日)의 맑은 아침',
      '일식으로 세상이 어둠에 잠긴 한낮',
      '첫눈과 함께 정령이 내려앉는 이른 아침',
      '뇌전 마법 같은 천둥이 치는 폭풍의 밤',
      '마력 안개가 무릎까지 차오른 흐린 새벽',
      '별똥별이 쏟아져 소원을 비는 깊은 밤',
      '봉인이 약해지는 마(魔)의 시각, 축시 삼경',
      '꽃잎과 마나의 빛 가루가 흩날리는 봄날 정오',
      '재가 눈처럼 내리는 전쟁 직후의 잿빛 아침',
      '오로라가 정령의 노래처럼 일렁이는 극야의 밤',
      '용암 빛으로 붉게 달아오른 마계의 영원한 황혼',
      '마력이 비처럼 쏟아져 죽은 풀까지 되살아나는 새벽',
      '세 번째 달이 떠오르며 결계가 흔들리는 자정 직전',
      '신성한 빛이 구름을 가르고 내리꽂히는 정오의 한순간',
      '검은 눈이 내리며 마수의 울음이 멎는 한밤중',
      '안개 속에서 도깨비불이 길을 밝히는 해질녘',
      '대기가 마나로 포화되어 숨쉬기조차 무거운 흐린 한낮',
      '월식과 함께 봉인의 룬이 붉게 달아오르는 깊은 밤',
      '서리꽃이 창에 피어나는 마법이 깃든 새벽녘',
      '용의 비행으로 그림자가 대지를 뒤덮는 한낮',
      '별빛이 마법진처럼 정렬하는 천 년에 한 번의 밤',
      '재와 마나가 뒤섞인 잿빛 비가 내리는 전장의 황혼',
      '신탁이 내려오는 신성한 정적의 동틀 무렵',
    ],
  },
  {
    key: 'pov', label: '시점 인물', icon: '🗡️', desc: '이 장면을 살아내는 주인공(POV)',
    faces: [
      '각성 직후 시스템 창을 처음 본 최약체 헌터',
      '회귀해 미래를 아는 몰락 귀족의 후계자',
      '원작 소설 속 악역 영애에 빙의한 주인공',
      '9서클을 노리는 오만한 천재 마법사',
      '검기를 막 깨우친 변경 출신 검사',
      '용사로 소환된 평범한 이세계 전이자',
      '봉인된 마왕의 기억을 물려받은 소년',
      '성좌의 가호를 받은 독자(讀者)형 생존자',
      '신탁을 거부하려는 선택받은 고아',
      '죽은 스승의 유언을 좇는 견습 정령사',
      '왕위를 빼앗긴 채 숨어 사는 진짜 황태자',
      '인간을 경멸하는 장수한 하이엘프 궁수',
      '복수를 위해 흑마법에 손댄 전직 성기사',
      '랭킹 1위를 노리는 냉혹한 SSS급 각성자',
      '계약 정령을 잃고 표류하는 소환술사',
      '용을 길들이려는 무모한 신참 드래곤 라이더',
      '버림받았다 최강으로 돌아온 폐가의 막내',
      '예언서를 해독하는 늙은 현자',
      '금기를 어기고 죽은 자를 되살린 네크로맨서',
      '두 번째 삶에서 가족을 지키려는 환생자',
      '차가운 황태자의 약혼녀가 된 평민 출신 영애',
      '동료에게 배신당해 던전에 갇힌 탱커',
      '진명(眞名)을 잃어버린 떠돌이 마법사',
      '신께 버림받았다 믿는 타락한 성녀',
      '하루 한 번 미래를 보는 저주를 짊어진 신탁의 무녀',
      '죽을 때마다 그날로 돌아오는 무한 회귀의 모험가',
      '용의 피를 이은 사생아 검사',
      '길드에서 쫓겨난 뒤 흑막을 좇는 전직 길드장',
      '마탑주가 되려 동기를 짓밟는 야심 찬 차석 마법사',
      '인간으로 위장해 인간계에 잠입한 마족 후예',
      '회차마다 죽는 엑스트라에 빙의한 생존형 주인공',
      '신검에게 선택받았으나 검을 두려워하는 겁쟁이 소년',
      '대장장이의 딸이자 전설 무구의 마지막 계승자',
      '봉인을 지키다 천 년을 산 불멸의 문지기',
      '성좌의 시나리오를 거부하고 자기 길을 가려는 반골 화신',
      '폐위된 황녀로서 복수와 제위를 동시에 노리는 책략가',
    ],
  },
  {
    key: 'magic', label: '마법·이적', icon: '✨', desc: '장면을 지배하는 마법 체계·초자연 현상(규칙·대가 포함)',
    faces: [
      '마나가 고갈되면 수명이 깎이는 금단의 영창을 시전한다',
      '서클을 넘어선 광역 마법이 폭주해 통제를 잃는다',
      '검에 오러(검기)를 둘러 강철을 두부처럼 가른다',
      '시스템이 [퀘스트]와 보상을 눈앞에 띄운다',
      '계약한 상위 정령을 소환하지만 그 대가로 감정 하나를 잃는다',
      '진명(眞名)을 부르자 봉인된 힘이 균형을 깨고 풀려난다',
      '죽은 자를 되살리는 대가로 산 자의 기억이 사라진다',
      '회귀 전의 미래 지식이 결정적 정보 우위를 만든다',
      '성좌가 후원하며 화신화(化身化)의 권능을 빌려준다',
      '룬을 새긴 아티팩트가 의지를 가진 듯 주인을 시험한다',
      '드래곤의 브레스가 결계를 단숨에 녹여 버린다',
      '예언이 자기실현적으로 어긋난 방향으로 성취된다',
      '흑마법의 부작용으로 시전자의 육신이 부패하기 시작한다',
      '시간을 국소적으로 되감지만 그만큼 자신만 늙는다',
      '신성력으로 언데드를 정화하나 신앙심이 바닥나면 멈춘다',
      '봉인의 룬이 카운트다운하며 고대의 악이 깨어난다',
      '소환된 사역마가 계약 조항의 허점을 파고든다',
      '마법진이 차원을 찢어 게이트 너머의 존재를 끌어들인다',
      '버프와 디버프가 교차하며 전세가 한순간 뒤집힌다',
      '금주(禁呪)를 외운 대가로 영혼의 일부를 저당 잡힌다',
      '마정석의 마력을 과충전해 일격에 전부 쏟아붓는다',
      '정신 침식형 마법이 적과 아군의 기억을 뒤섞는다',
      '각성한 고유 스킬이 규칙의 빈틈을 찌르는 치트가 된다',
      '용의 심장을 흡수해 폭발적으로 격을 올리되 인간성을 잃어간다',
      '마력 회로를 한계까지 개방해 신체가 마나에 타들어 간다',
      '성검을 뽑자 자격을 묻는 시험이 발동해 과거의 죄를 비춘다',
      '저주받은 무구가 적의 생명을 빨아 주인에게 힘으로 돌려준다',
      '대마법의 영창 도중 단 한 음절만 틀려도 술식이 자신을 향한다',
      '정령과의 등가교환으로 기억 한 조각을 내주고 폭풍을 부른다',
      '봉인구의 마지막 사슬이 풀리며 억눌렸던 권능이 역류한다',
      '신성 마법이 적의 거짓을 꿰뚫지만 시전자의 죄도 함께 드러낸다',
      '마정석 폭주를 역이용해 던전 전체를 무너뜨리는 자폭 술식을 짠다',
      '소환진을 통해 미래의 자신에게서 한 번의 조언을 빌려 온다',
      '용언(龍言) 마법으로 세계의 법칙을 한 문장 고쳐 쓴다',
    ],
  },
  {
    key: 'conflict', label: '갈등·장애', icon: '⚔️', desc: '주인공을 옭아매는 대립과 위기',
    faces: [
      '믿었던 동료가 등 뒤에서 단검을 겨눈다',
      '봉인이 풀리기까지 시간이 얼마 남지 않았다',
      '마왕군의 정예가 퇴로를 모두 막아섰다',
      '예언이 주인공을 세계의 멸망 원흉으로 지목한다',
      '마나가 바닥나 마법을 한 번밖에 쓸 수 없다',
      '구해야 할 사람과 지켜야 할 세계, 하나만 택해야 한다',
      '진짜 정체가 드러나면 화형을 면치 못한다',
      '회귀로 안 미래가 이미 어긋나기 시작했다',
      '랭커들이 약점을 알아채고 협공해 온다',
      '계약 정령이 명령을 거부하고 폭주한다',
      '귀족들의 음모가 가문 전체를 파멸로 몰아간다',
      '드래곤이 보물 대신 자신의 새끼를 요구한다',
      '성녀의 신성력이 거짓 신앙 위에 세워졌음이 폭로된다',
      '용사 파티가 주인공을 짐짝으로 여겨 추방하려 한다',
      '봉인된 마왕의 기억이 주인공의 자아를 잠식한다',
      '금기를 어긴 대가가 사랑하는 이에게 청구된다',
      '성좌들이 더 잔혹한 시나리오로 판을 갈아엎는다',
      '왕위 계승의 정당성을 입증할 증표가 사라졌다',
      '적이 인질을 방패 삼아 협상을 강요한다',
      '아군의 마법이 폭주해 같은 편을 휩쓴다',
      '예언의 영웅이 사실 가짜였음이 드러난다',
      '죽은 줄 알았던 숙적이 더 강해져 돌아온다',
      '던전의 보스가 동료의 얼굴을 하고 있다',
      '구원자라 믿은 자가 모든 비극의 설계자였다',
      '성검의 자격이 주인공이 아닌 숙적에게 있음이 드러난다',
      '회귀로 바꾼 미래가 더 큰 재앙을 불러왔다',
      '신탁이 두 갈래로 갈려 따를 예언을 골라야 한다',
      '마탑이 금기를 어긴 죄로 주인공의 처형을 명한다',
      '동료를 살릴 마력이 마왕을 봉인할 마력과 같은 양뿐이다',
      '용의 둥지를 지키려면 인간 마을을 버려야 한다',
      '진실을 밝히면 가문이, 침묵하면 백성이 무너진다',
      '각성 등급이 조작되어 약자로 낙인찍힌 채 던전에 던져진다',
      '봉인을 풀 열쇠가 사랑하는 이의 목숨값이다',
      '성좌가 시나리오 클리어 조건으로 동료 중 하나의 희생을 건다',
    ],
  },
  {
    key: 'turn', label: '전환·사건', icon: '🌀', desc: '판을 뒤집는 결정적 한 수·반전',
    faces: [
      '봉인이 풀리며 고대의 마왕이 눈을 뜬다',
      '죽은 줄 알았던 스승이 적의 편에서 나타난다',
      '주인공의 손등에 잊혔던 용사의 문장이 떠오른다',
      '예언이 정반대 방식으로 실현되며 모두를 속인다',
      '시스템이 숨겨진 히든 퀘스트와 클래스를 개방한다',
      '회귀 전엔 없던 변수가 미래를 송두리째 바꾼다',
      '성좌가 직접 강림해 전장의 규칙을 다시 쓴다',
      '봉인의 검이 진짜 주인을 알아보고 응답한다',
      '마법진이 역류해 소환수가 시전자를 삼킨다',
      '악역 영애의 파멸 플래그가 한순간에 꺾인다',
      '드래곤이 적이 아니라 마지막 수호자였음이 드러난다',
      '진명을 되찾은 순간 잠재된 진짜 힘이 해방된다',
      '죽음 직전, 정령왕이 계약을 자청한다',
      '적의 두목이 사실 잃어버린 혈육임이 밝혀진다',
      '봉인된 마왕이 인류의 적이 아니었음이 폭로된다',
      '쌓이고 쌓인 굴욕이 단 한 수의 역전으로 응징된다',
      '신탁의 동굴이 무너지며 새 예언을 토해 낸다',
      '게이트 너머에서 미래의 자신이 경고를 보내온다',
      '성검이 빛을 잃고 흑검이 진짜 성물로 깨어난다',
      '마왕성의 문이 안에서부터 열린다',
      '죽은 동료의 마지막 마법이 결정타로 회수된다',
      '하늘에서 별이 떨어지며 세계의 종(終)이 선포된다',
      '회귀의 진짜 대가가 마지막에야 청구된다',
      '봉인된 기억이 한꺼번에 돌아와 정체를 뒤흔든다',
      '하급으로 위장한 스킬이 사실 SSS급 히든 권능으로 각성한다',
      '숨겨 둔 마법진이 발동하며 적의 필살기를 통째로 되돌린다',
      '예언의 「선택받은 자」가 주인공이 아니라 적이었음이 뒤집힌다',
      '죽었어야 할 회차에서 미래의 동료가 시간을 거슬러 끼어든다',
      '봉인의 마왕이 인류를 멸할 재앙이 아니라 막아 온 방패였음이 밝혀진다',
      '추방했던 파티가 주인공 없이는 한 발도 못 나아감을 깨닫는다',
      '신성력이 다한 순간, 흑마법이 유일한 구원의 손을 내민다',
      '왕가의 인장이 가짜였고 진짜 계승자는 주인공임이 증명된다',
      '용이 인간의 말로 주인공의 진명을 부른다',
      '무너진 신탁의 동굴 벽에 다음 회차의 결말이 새겨져 있다',
    ],
  },
  {
    key: 'sensory', label: '감각 디테일', icon: '🌫', desc: '경이감을 살리는 한 줄의 감각',
    faces: [
      '마나가 살갗을 스칠 때의 따끔한 정전기',
      '용의 숨결이 닿는 거리에서 끓어오르는 열기',
      '오래된 마법서에서 풍기는 잉크와 곰팡내',
      '검기가 공기를 가를 때의 날카로운 파공음',
      '성수가 상처에 닿을 때의 시원한 빛의 감촉',
      '봉인이 풀리며 울리는 저음의 진동',
      '얼어붙은 제단에 닿은 손끝의 시린 통증',
      '정령이 지나갈 때 코끝에 도는 풀과 비 냄새',
      '룬이 빛날 때 망막에 남는 푸른 잔상',
      '시체 냄새 너머로 번지는 흑마법의 유황 내',
      '드래곤 비늘에 반사된 노을의 붉은 빛',
      '시스템 알림음이 머릿속에 직접 울리는 청량한 음',
      '마정석이 깨질 때 흩어지는 빛 가루의 따스함',
      '성좌의 시선이 등줄기에 내려앉는 묵직한 압박',
      '회귀 직후 옛 방에서 맡은 익숙한 먼지 냄새',
      '검과 검이 맞부딪칠 때 손목을 타고 오는 저릿함',
      '마법진 위에서 발밑이 떠오르는 무중력의 어지러움',
      '봉인된 마왕성에서 새어 나오는 차가운 정적',
      '오러를 두른 검날에서 번지는 푸른 열기와 윙윙거림',
      '정령 샘에 손을 담글 때 손끝까지 차오르는 생기',
      '대마법 영창 직전, 공기가 팽팽하게 당겨지는 압력',
      '드래곤의 포효가 흉골을 뒤흔드는 저주파 진동',
      '성수가 마른 입술을 적실 때의 단맛 도는 시원함',
      '흑마법진에서 피어오르는 비릿한 철과 재의 냄새',
      '마정석 광맥이 어둠 속에서 내뿜는 푸른 빛의 맥동',
      '회귀의 순간, 시야가 거꾸로 빨려 드는 현기증',
      '봉인이 풀릴 때 잇새로 스며드는 금속성의 떨림',
      '세계수 잎이 스칠 때 귓가에 닿는 바람의 속삭임',
      '시스템 알림창이 시야에 겹쳐 뜰 때의 미묘한 잔상',
      '마계의 유황 바람이 폐 깊숙이 박히는 매캐함',
    ],
  },
  {
    key: 'mode', label: '전개법(하위유형)', icon: '📜', desc: '하위유형 관습으로 장면을 엮는 전개 틀(도시에 근거)',
    faces: [
      '하이 판타지: 경이감을 천천히 쌓으며 세계관을 보여주듯 펼친다(설명 금지)',
      '영웅의 여정: 「가장 깊은 동굴」의 시련으로, 멘토 없이 홀로 관문을 넘게 한다',
      '이세계 전이: 시스템 창·스테이터스로 성장을 수치화해 즉각 보상을 준다',
      '헌터·게이트물: 각성과 랭킹의 벽을 세우고 그 벽을 돌파하는 쾌감으로 끝맺는다',
      '회빙환(회귀·빙의·환생): 미래 지식의 정보 우위로 판을 미리 읽고 뒤집는다',
      '웹소설 사이다: 쌓인 고구마를 한 방에 응징하는 카타르시스로 회차를 닫는다',
      '회차 후킹: 마지막 한 줄을 다음 화를 부르는 절정의 클리프행어로 끊는다',
      '로맨스 판타지: 황실 정치와 파멸 플래그 위에 차갑지만 다정한 호감을 얹는다',
      '그림다크: 선악의 회색지대에서, 덜 잔인한 선택만 남기고 대가를 치르게 한다',
      '다중 POV 서사시: 독립된 시점의 긴장을 교차시켜 한 점으로 수렴시킨다',
      '하드 매직 결전: 앞서 심은 마법 규칙·아이템을 결정타로 일괄 회수한다',
      '소프트 매직 경이: 규칙을 감추고 신비와 위협의 분위기만으로 압도한다',
      '소드 앤 소서리: 거대 세계관보다 영웅 개인의 모험과 한 판 승부에 집중한다',
      '봉인된 악 카운트다운: 고대의 위협이 깨어나는 시한을 두고 긴장을 조인다',
      '성장 가시화: 약→강의 한 단계 돌파를 장면 안에서 분명히 보여 준다',
      '희생의 클라이맥스: 멘토·동료·자신의 희생으로 승리에 무게를 부여한다',
      '경이감 첫 등장: 처음 보는 마법·생물·풍경을 공들여 연출해 경탄을 자아낸다',
      '예언의 전복: 예언이 예상과 다른 방식으로 실현되는 반전으로 마무리한다',
      '멘토의 퇴장: 멘토를 이 장면에서 잃게 해 주인공의 자립을 강제한다',
      '마법의 대가: 승리에 반드시 상실·후유증·세계의 변화를 비용으로 부과한다',
      '종족 정치: 엘프·드워프·인간 등 종족 갈등을 장면의 동력으로 삼는다',
      '에피소드 누적: 던전 공략·시험·토너먼트 단위로 끊되 거대 떡밥을 깐다',
      '파워 인플레 관리: 강해진 주인공 앞에 새 「벽」을 세워 긴장을 유지한다',
      '치트 금지: 새 능력을 갑툭튀시키지 않고 기존 규칙만으로 해결하게 한다',
    ],
  },
]

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const fmt = (n: number) => n.toLocaleString('ko-KR')

// 활성 슬롯들의 조합 가짓수.
function comboCount(activeKeys: string[]): number {
  return activeKeys.reduce((acc, k) => {
    const s = SLOTS.find((x) => x.key === k)
    return acc * (s ? s.faces.length : 1)
  }, 1)
}
// 전체 풀 기준 최대 조합(타이틀·표시용) — 1조 초과 검증.
const MAX_COMBOS = SLOTS.reduce((n, s) => n * s.faces.length, 1)

// 굴린 조각들을 한 편의 판타지 장면 설계로 엮는다.
function compose(by: Record<string, string>): string {
  const parts: string[] = []
  if (by.stage) parts.push(`【무대】 ${by.stage}`)
  if (by.time) parts.push(`【시각·기후】 ${by.time}`)
  // 본문 한 문단(서사형)
  const narr: string[] = []
  if (by.stage && by.time) narr.push(`${by.stage}, ${by.time}.`)
  else if (by.stage) narr.push(`${by.stage}.`)
  if (by.pov) narr.push(`${by.pov}이(가) 그 한가운데 서 있다.`)
  if (by.magic) narr.push(`이때 ${by.magic}.`)
  if (by.conflict) narr.push(`그러나 ${by.conflict}.`)
  if (by.turn) narr.push(`바로 그 순간, ${by.turn}.`)
  if (by.sensory) narr.push(`(감각: ${by.sensory}.)`)
  let out = narr.join(' ')
  if (by.mode) out += `\n\n▷ 전개법 — ${by.mode}`
  return out.trim()
}

// 슬롯별 분해 라인(복사/저장/프로젝트용)
function rowsTextOf(by: Record<string, string>, keys: string[]): string {
  return keys
    .map((k) => {
      const s = SLOTS.find((x) => x.key === k)
      return s && by[k] ? `${s.icon} ${s.label}: ${by[k]}` : ''
    })
    .filter(Boolean)
    .join('\n')
}

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface Saved { id: string; text: string; note: string; slots: string; rows: string; title: string }

export default function GenreSceneForge({ payload }: { payload?: Record<string, unknown> }) {
  // 활성 슬롯(기본 전부) — 저장/복원
  const [active, setActive] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':active')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length) {
          const valid = arr.filter((k: string) => SLOTS.some((s) => s.key === k))
          if (valid.length) return valid
        }
      }
    } catch { /* ignore */ }
    return SLOTS.map((s) => s.key)
  })
  const [results, setResults] = useState<Record<string, string>>(() =>
    Object.fromEntries(SLOTS.map((s) => [s.key, pick(s.faces)])))
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)

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
            title: typeof s.title === 'string' ? s.title : '',
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

  // 페이로드로 슬롯 프리셋/장르 진입 처리(연계). 1회.
  useEffect(() => {
    const want = payload?.slots
    if (Array.isArray(want)) {
      const valid = want.filter((k): k is string => typeof k === 'string' && SLOTS.some((s) => s.key === k))
      if (valid.length) setActive(SLOTS.filter((s) => valid.includes(s.key)).map((s) => s.key))
    }
    // 다른 도구에서 '판타지' 장르로 진입 시 안내 토스트(payload.genre 활용)
    if (typeof payload?.genre === 'string' && payload.genre.includes('판타지')) {
      setToast('판타지 장면 설계를 시작합니다. 🎲 굴려 보세요.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { try { localStorage.setItem(LS + ':active', JSON.stringify(active)) } catch { /* ignore */ } }, [active])
  useEffect(() => { try { localStorage.setItem(LS + ':saved', JSON.stringify(saved)) } catch { /* ignore */ } }, [saved])

  // 비활성 슬롯의 잠금 정리(결과는 보존해 재활성 시 즉시 표시)
  useEffect(() => {
    setLocked((prev) => {
      const next: Record<string, boolean> = {}
      active.forEach((k) => { if (prev[k]) next[k] = true })
      return next
    })
  }, [active])

  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 320)
    return () => window.clearTimeout(t)
  }, [rolling])

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
        if (prev.length <= 1) return prev
        return prev.filter((k) => k !== key)
      }
      return SLOTS.filter((s) => prev.includes(s.key) || s.key === key).map((s) => s.key)
    })
  }

  const forgeAll = useCallback(() => {
    const my = ++nonce.current
    setRolling(true)
    setResults((prev) => {
      if (my !== nonce.current) return prev
      const next: Record<string, string> = { ...prev }
      active.forEach((k) => {
        if (locked[k]) return
        const slot = SLOTS.find((s) => s.key === k)
        if (!slot) return
        let f = pick(slot.faces)
        if (f === prev[k] && slot.faces.length > 1) f = pick(slot.faces)
        next[k] = f
      })
      return next
    })
  }, [active, locked])

  const rollOne = (key: string) => {
    if (locked[key]) return
    setRolling(true)
    setResults((prev) => {
      const slot = SLOTS.find((s) => s.key === key)
      if (!slot) return prev
      let f = pick(slot.faces)
      if (f === prev[key] && slot.faces.length > 1) f = pick(slot.faces)
      return { ...prev, [key]: f }
    })
  }

  const toggleLock = (key: string) => setLocked((prev) => ({ ...prev, [key]: !prev[key] }))

  const byKey: Record<string, string> = {}
  active.forEach((k) => { if (results[k]) byKey[k] = results[k] })
  const hasResults = Object.keys(byKey).length > 0
  const story = hasResults ? compose(byKey) : ''
  const combos = comboCount(active)
  const slotLabelLine = active.map((k) => SLOTS.find((s) => s.key === k)?.label || k).join('·')
  const sceneTitle = `${byKey.pov ? byKey.pov.slice(0, 14) : '판타지 장면'} · ${byKey.stage ? byKey.stage.slice(0, 16) : ''}`.replace(/ · $/, '')
  const rowsText = () => rowsTextOf(byKey, active)

  const saveCurrent = () => {
    if (!hasResults) return
    setSaved((prev) => {
      if (prev.some((s) => s.text === story)) { setToast('이미 보관함에 있습니다.'); return prev }
      const rec: Saved = {
        id: 'sv_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4).toString(36),
        text: story, note: '', slots: slotLabelLine, rows: rowsText(), title: sceneTitle,
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

  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setToast('복사에 실패했습니다.') }
  }
  const copy = (key: string, text: string) => {
    const done = () => { if (mounted.current) setCopiedKey(key) }
    try {
      if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done)) }
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }

  // 프로젝트 본문(HTML)
  const bodyHtmlFor = (title: string, text: string, rows: string, slots: string) => {
    const paras = text.split('\n').filter(Boolean).map((ln) => `<p style="line-height:1.8;">${escHtml(ln)}</p>`).join('')
    const rowLines = rows ? rows.split('\n').filter(Boolean).map((ln) => `<p>${escHtml(ln)}</p>`).join('') : ''
    return [
      `<p style="font-size:15px;"><b>${escHtml(title)}</b></p>`,
      paras, `<hr/>`,
      slots ? `<p><b>슬롯 조합:</b> ${escHtml(slots)}</p>` : '',
      rowLines,
    ].join('')
  }

  // 프로젝트 연동 — 현재 장면을 원고(draft)/'장면' 폴더에 문서로 추가.
  const addStoryToProject = () => {
    if (!hasResults) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '장면',
      title: `🐉 ${sceneTitle}`,
      bodyHtml: bodyHtmlFor(sceneTitle, story, rowsText(), slotLabelLine),
      synopsis: story.split('\n')[0] || sceneTitle,
      meta: {
        장르: '판타지',
        무대: byKey.stage ? byKey.stage.slice(0, 30) : '—',
        시점인물: byKey.pov ? byKey.pov.slice(0, 30) : '—',
        전개법: byKey.mode ? byKey.mode.split(':')[0] : '—',
      },
    })
    setToast(id ? '프로젝트 원고 〈장면〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }
  const addSavedToProject = (s: Saved) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '장면',
      title: `🐉 ${s.title || '판타지 장면'}`,
      bodyHtml: bodyHtmlFor(s.title || '판타지 장면', s.text, s.rows, s.slots) + (s.note ? `<p style="color:#888;">📝 ${escHtml(s.note)}</p>` : ''),
      synopsis: s.text.split('\n')[0] || s.title,
      meta: { 장르: '판타지' },
    })
    setToast(id ? '프로젝트 〈장면〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 장면 목록 도구로 보내기(연계)
  const toSceneList = () => {
    if (!hasResults) return
    openToolLinked('scene-list', {
      scene: {
        title: sceneTitle, summary: story.split('\n')[0] || story,
        pov: byKey.pov || '', place: byKey.stage || '',
        goal: byKey.magic || '', conflict: byKey.conflict || '', mood: byKey.time || '',
      },
      genre: '판타지',
    })
    setToast('장면 목록으로 보냈습니다.')
  }
  // 배경 라이브러리에 무대 저장
  const toLibPlace = () => {
    if (!byKey.stage) return
    addToLibrary('places', {
      name: byKey.stage, kind: '판타지 무대', mood: byKey.time || '',
      sensory: byKey.sensory || '', notes: story, source: '판타지 장면 생성기',
      fields: {
        name: byKey.stage,
        kind: '판타지 무대',
        atmosphere: byKey.time || '',
        sensory: byKey.sensory || '',
        notes: story,
      },
    })
    setToast('배경 라이브러리에 무대를 저장했습니다.')
  }
  // 스니펫(글감) 저장
  const saveSnippet = (text: string, slots: string) => {
    if (!text) return
    addToLibrary('snippets', {
      text: `[판타지 장면] ${text}`,
      source: '판타지 장면 생성기',
      tags: ['글감', '판타지', '장면', ...slots.split('·').filter(Boolean)],
    })
    setToast('스니펫 라이브러리에 저장했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const cardBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>무대·시각·시점 인물·마법/이적·갈등·전환·감각·전개법</b> 슬롯을 굴려, 판타지 전형 장면을 한 편의 설계로 엮습니다. 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 <Emoji e="🎲"/> 굴리세요. <b>전개법</b> 슬롯이 하이판타지·이세계·헌터물·로판·그림다크 등 하위유형 관습을 적용합니다.
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'}
          style={{ borderColor: tab === 'forge' ? 'var(--accent)' : 'var(--border)', color: tab === 'forge' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🐉"/> 생성
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐"/> 보관함 ({saved.length})
        </button>
      </div>

      {tab === 'forge' && (
        <>
          <div style={chipRow}>
            {SLOTS.map((s) => {
              const on = active.includes(s.key)
              return (
                <button key={s.key} className="minibtn" onClick={() => toggleSlot(s.key)} aria-pressed={on} title={s.desc}
                  style={{ opacity: on ? 1 : 0.5, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                  <Emoji e={s.icon}/> {s.label}{on ? '' : ' +'}
                </button>
              )
            })}
          </div>

          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmt(combos)}</b>가지
            {combos >= 1_000_000_000_000 ? ' (1조+ 이상)' : combos >= 100_000_000 ? ' (1억+ 이상)' : combos >= 1_000_000 ? ' (백만+ )' : ''}
            <span style={{ marginLeft: 6, opacity: 0.7 }}>· 전체 풀 기준 최대 {fmt(MAX_COMBOS)}가지</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {active.map((k) => {
              const slot = SLOTS.find((s) => s.key === k)!
              const face = results[k]
              const isLocked = !!locked[k]
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 22, width: 28, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-12deg) scale(1.15)' : 'none' }}>
                    <Emoji e={slot.icon}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{slot.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5, color: face ? 'var(--text)' : 'var(--muted)' }}>
                      {face ? (rolling && !isLocked ? '…' : face) : '— 굴려주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => rollOne(k)} disabled={isLocked} title="이 슬롯만 다시" style={{ flexShrink: 0 }}><Emoji e="🎲"/></button>
                  <button className="minibtn" onClick={() => toggleLock(k)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                  </button>
                </div>
              )
            })}
          </div>

          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', maxHeight: 200, overflowY: 'auto' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🐉"/> 판타지 장면 설계</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: hasResults ? 'var(--text)' : 'var(--muted)', whiteSpace: 'pre-wrap' }}>
              {story || '슬롯을 굴리면 판타지 전형 장면이 한 편의 설계로 엮입니다.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={forgeAll}><Emoji e="🐉"/> 장면 생성 / 다시 굴리기</button>
            <button className="minibtn" onClick={() => copy('story', `${story}\n\n${rowsText()}`)} disabled={!hasResults}>
              {copiedKey === 'story' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={saveCurrent} disabled={!hasResults}><Emoji e="⭐"/> 보관</button>
            <button className="minibtn" onClick={() => saveSnippet(story, slotLabelLine)} disabled={!hasResults} title="글감 스니펫 라이브러리에 저장"><Emoji e="✂️"/> 스니펫</button>
          </div>

          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={addStoryToProject} disabled={!hasResults || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !hasResults ? '먼저 장면을 굴려주세요' : '현재 장면을 프로젝트 원고 〈장면〉 폴더에 추가'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={toSceneList} disabled={!hasResults}><Emoji e="📋"/> 장면 목록으로</button>
            <button className="linkbtn" onClick={toLibPlace} disabled={!byKey.stage}><Emoji e="🏞"/> 무대 저장</button>
            <button className="linkbtn" onClick={() => openToolLinked('setting-bible', { genre: '판타지' })}><Emoji e="🏰"/> 배경 설정집</button>
            <button className="linkbtn" onClick={() => openToolLinked('character-sheet', { genre: '판타지' })}><Emoji e="🪪"/> 인물 시트</button>
            <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre: '판타지' })}><Emoji e="🔺"/> 플롯 피라미드</button>
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐"/></div>
              보관한 장면이 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성 탭에서 <Emoji e="⭐"/> 보관을 눌러 마음에 드는 판타지 장면을 모아보세요.</span>
            </div>
          )}
          {saved.map((s, i) => {
            const k = 'sv' + s.id
            return (
              <div key={s.id} style={cardBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {s.slots && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{s.slots}</span>}
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                  <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">▼</button>
                  <button className="minibtn" onClick={() => copy(k, s.text + (s.rows ? `\n\n${s.rows}` : '') + (s.note ? `\n📝 ${s.note}` : ''))} title="복사">
                    {copiedKey === k ? <>✓</> : <Emoji e="📋"/>}
                  </button>
                  <button className="minibtn" onClick={() => saveSnippet(s.text, s.slots)} title="스니펫 라이브러리에 저장"><Emoji e="✂️"/></button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑"/></button>
                </div>
                {s.title && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}><Emoji e="🐉"/> {s.title}</div>}
                <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{s.text}</div>
                {s.rows && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{s.rows}</div>
                )}
                <textarea
                  value={s.note}
                  onChange={(e) => setNote(s.id, e.target.value)}
                  placeholder="이 장면을 어느 작품·회차에 쓸지 메모…"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
                <div className="linkbar">
                  <span className="linkbar-label">연계:</span>
                  <button className="linkbtn" onClick={() => addSavedToProject(s)} disabled={!hasProjectBridge()}
                    title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 장면을 프로젝트 원고 〈장면〉 폴더에 추가'}>
                    <Emoji e="📄"/> 프로젝트에 추가
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{emojify(toast)}</div>}
      <div style={hint}>장면은 출발점일 뿐입니다. 같은 조합이라도 내 세계관·마법 체계·인물에 맞춰 자유롭게 비틀어 보세요. 하드 매직이라면 전환의 한 수를 앞서 심어 둔 규칙으로 회수하세요.</div>
    </div>
  )
}
