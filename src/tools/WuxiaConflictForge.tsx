// 무협 갈등·딜레마 단조기(鍛造機) — 무협 장르 고유의 갈등 구도를 슬롯 풀 무작위 조합으로 단조한다.
// 협사의 처지 + 은원(원한/빚)의 뿌리 + 강호 세력 구도 + 무공·기연 변수 + 도덕적 트레이드오프 +
// 승리/성장의 대가 + 정체·비밀의 떡밥 + 압박 변수(데드라인/합공/진법)를 엮어 "무협다운" 갈등을 만든다.
// 각 슬롯은 잠금/개별 재생성 가능, 총 조합수를 표시(1조 이상). 자급식: react·linkbus 외 import 없음.
// 연계(linkbus): 단조한 갈등을 프로젝트 자료 '갈등' 폴더에 문서로 추가, 글감 스니펫으로 보관, 관련 도구 열기.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'wuxia-conflictforge', name: '무협 갈등 단조기', icon: '⚔️', group: '생성기', genre: '무협', intro: '협사의 은원·강호 구도·기연의 대가로 무협다운 갈등을 단조하세요', w: 640, h: 620 }

// ──────────────────────────────────────────────────────────────────────────
// 슬롯 정의 — 무협 장르 도시에에 근거한 구체적 자작 데이터(일반론 금지).
// 각 슬롯은 갈등의 한 축을 담당하며, 조합되면 강호의 한 인물이 처한 모순을 그린다.
// ──────────────────────────────────────────────────────────────────────────
interface Slot { key: string; label: string; icon: string; hint: string; pool: string[] }

const SLOTS: Slot[] = [
  {
    key: 'hero', label: '협사의 처지', icon: '🧍', hint: '갈등을 짊어진 인물이 강호에서 처한 출발점',
    pool: [
      '멸문(滅門)당한 가문의 마지막 핏줄',
      '폐인 취급받던 문파의 막내 제자',
      '단전이 깨져 무공을 잃은 전대(前代) 고수',
      '정체를 숨긴 마교(魔敎) 교주의 사생아',
      '회귀(回歸)해 과거로 돌아온 천하제일인',
      '구음절맥(九陰絶脈)을 타고난 시한부 소녀',
      '관(官)에 쫓기는 녹림(綠林)의 두령',
      '사부를 등에 업고 출도(出道)한 무명(無名) 검객',
      '얼굴을 잃고 가면으로 살아가는 살수(殺手)',
      '비급을 훔쳐 달아난 표국(鏢局)의 표사(鏢師)',
      '무림맹(武林盟)의 신임 후개(後丐)이자 정보상',
      '천형(天刑)처럼 만독불침(萬毒不侵)을 타고난 독인(毒人)의 후예',
      '강호를 등졌다가 다시 끌려 나온 은거(隱居) 노고수',
      '신분을 위장해 적의 문파에 잠입한 첩자',
      '한 자루 도(刀)만 믿고 사는 떠돌이 낭인(浪人)',
      '명문정파 장문인의 후계로 지목된 외동딸',
      '주화입마(走火入魔) 직전에 내몰린 폐관(閉關) 수행자',
      '아미(峨嵋)의 속가제자였다가 환속한 여협(女俠)',
      '천마(天魔)의 환생으로 점지된 채 정파에서 자란 소년',
      '구파일방을 모두 사칭하며 떠도는 사기꾼 무인',
      '신병(神兵)을 벼리다 손을 잃은 늙은 대장장이',
      '독문(毒門)의 시약(試藥)으로 길러진 산 독약 같은 여인',
      '천하제일을 노리다 폐관에서 미쳐버린 검광(劍狂)의 제자',
      '의술과 무공을 함께 익힌 강호의 떠돌이 의원(醫員)',
      '점창(點蒼)에서 파문당해 검을 봉인당한 검객',
      '살막(殺幕)에서 탈주해 현상금이 걸린 전직 살수',
      '제 무공을 잊기 위해 술에 절어 사는 주협(酒俠)',
      '한쪽 다리를 잃고도 경공(輕功)으로 강호를 떠도는 절름발이',
      '천한 기루(妓樓) 출신으로 무림에 발 들인 무희(舞姬) 검객',
      '사부의 시신을 등에 지고 복수처를 찾아 떠도는 제자',
      '두 문파의 피를 동시에 이어받은 사생아 무인',
      '눈먼 채 소리만으로 적을 베는 맹검(盲劍)의 후예',
      '비급을 통째로 외워버린 기억의 천재, 그러나 무재(無才)',
      '강호에 처음 발 디딘 산골 약초꾼의 아들',
      '천하를 호령하다 모든 걸 잃고 거지가 된 옛 맹주',
      '쌍둥이 형의 이름과 무공을 빌려 사는 동생',
    ],
  },
  {
    key: 'root', label: '은원(恩怨)의 뿌리', icon: '🩸', hint: '"은혜는 갚고 원한도 갚는다" — 갈등을 불 지피는 빚',
    pool: [
      '온 가문을 도살한 원수가 지금의 무림맹주(武林盟主)다',
      '목숨을 구해준 은인이 알고 보니 사문(師門)의 원흉이었다',
      '사부의 복수를 맹세했으나 원수는 친혈육으로 밝혀졌다',
      '평생 갚아야 할 은혜를 베푼 자가 천하를 어지럽히는 마두(魔頭)다',
      '나를 폐인으로 만든 사형(師兄)이 이제는 정파의 영웅으로 추앙받는다',
      '죽은 연인의 원한과 살아남은 가족의 안위가 정면으로 충돌한다',
      '대를 이어 내려온 두 가문의 핏빛 숙원(宿怨)을 내가 끝내야 한다',
      '나를 거둬 길러준 양부(養父)가 부모를 죽인 장본인임을 알게 됐다',
      '한때 형제로 의(義)를 맺었던 자가 사파(邪派)에 투신해 칼을 겨눈다',
      '은인의 유언이 곧 무고한 자를 베라는 청부(請負)였다',
      '나를 배신해 죽음으로 몬 동문이 같은 진실의 피해자였다',
      '복수의 칼끝이 향한 곳에 나를 사랑하는 사람이 서 있다',
      '사문을 멸한 진범이 십 년간 나를 키운 사부였다',
      '빚진 목숨값이 적의 비급(秘笈) 한 권으로 탕감될 수 있다',
      '원수의 딸이 내 목숨을 두 번이나 구해 빚을 졌다',
      '아비를 벤 칼을 물려받아 그 칼로 아비의 원수를 갚아야 한다',
      '사매(師妹)를 욕보인 자가 강호 모두가 우러르는 대협(大俠)이다',
      '내가 살린 아이가 자라 나의 가문을 멸할 마두가 되었다',
      '한 번의 잘못으로 멸문에 일조했던 죄가 평생을 옭아맨다',
      '원수에게 은혜를 입어 차마 칼을 들 명분이 사라졌다',
      '죽어가는 적이 내 친부의 마지막 행방을 쥐고 있다',
      '복수를 도와준 협객이 실은 모든 비극을 설계한 자였다',
      '사문의 멸문은 내가 훔쳐 달아난 비급 한 권에서 시작됐다',
      '평생의 숙적과 같은 여인을 동시에 연모하게 되었다',
      '원수의 무덤 앞에서야 그가 누명을 썼음을 알게 됐다',
      '나를 구하려 죽은 의형(義兄)의 원수가 내 스승이다',
      '갚지 못한 은혜의 주인이 강호의 공적(公敵)으로 몰렸다',
      '가문을 멸한 자가 죽기 전 나를 자식으로 거두려 한다',
      '복수의 대상이 천하를 구할 유일한 고수임이 드러났다',
      '내 손에 죽은 자의 유족이 나를 은인으로 떠받든다',
      '원한의 핏줄을 끊으려면 갓난 아이까지 베어야 한다',
      '은인이 남긴 빚을 갚으려면 내 사문을 배신해야 한다',
      '나를 길러준 살문(殺門)이 부모를 죽인 그 조직이었다',
      '죽은 사부의 원한이 살아 있는 사형제 모두를 향한다',
      '내가 받은 은혜와 내가 진 원한이 한 사람에게서 비롯됐다',
    ],
  },
  {
    key: 'faction', label: '강호 세력 구도', icon: '🏯', hint: '정파-사파-마교, 구파일방·세가의 정치가 만드는 압력',
    pool: [
      '정파(正派)의 위선과 사파(邪派)의 솔직함 사이에 끼었다',
      '구파일방(九派一幇)의 연합이 사실 한 음모가의 손에 놀아난다',
      '마교(魔敎)의 침공을 막으려면 원수의 문파와 손잡아야 한다',
      '무림맹과 황실(皇室)·관(官)의 암묵적 불가침이 깨지려 한다',
      '사천당문(四川唐門)의 암기·독이 정사대전(正邪大戰)의 판을 흔든다',
      '새외(塞外)의 라마승과 빙공(氷功) 세력이 중원을 노린다',
      '소림(少林)과 무당(武當)이 비급의 소유권을 두고 반목한다',
      '내 문파가 천하제일(天下第一)을 가르는 비무(比武)의 표적이 됐다',
      '개방(丐幇)의 정보망이 양 진영에 동시에 팔리고 있다',
      '남궁세가(南宮世家)와 모용세가(慕容世家)의 혼사 뒤에 칼이 숨었다',
      '명망 높은 정파가 뒤로는 살막(殺幕)을 부려 정적을 제거한다',
      '천마신교(天魔神敎)가 정파의 분열을 틈타 강호를 집어삼킨다',
      '제갈세가(諸葛世家)의 진법(陣法)이 누군가의 멸문에 쓰였다',
      '무림 서열을 정하는 영웅첩(英雄帖)이 함정으로 밝혀졌다',
      '화산(華山)과 종남(終南)이 화산논검(華山論劍)의 주최권을 다툰다',
      '곤륜(崑崙)·공동(崆峒)이 새외 세력과 은밀히 내통한다',
      '정파 연합이 한 문파를 마교로 몰아 멸문하려 한다',
      '흑도(黑道)와 녹림이 손잡아 표국들의 물길을 끊었다',
      '무림맹주 자리를 두고 구파가 살수까지 동원해 다툰다',
      '청성(靑城)의 도사들이 사파의 자금줄로 전락했다',
      '정·사 양대 세력이 동시에 내 사문에 동맹을 요구한다',
      '황보세가(皇甫世家)의 권력이 관(官)과 강호 양쪽을 쥐고 흔든다',
      '일월신교(日月神敎) 내부의 후계 다툼이 중원으로 번진다',
      '비급 한 권 때문에 정파끼리 서로의 등에 칼을 꽂는다',
      '북해빙궁(北海氷宮)이 중원의 분열을 노려 남하한다',
      '서장(西藏) 밀교가 정파의 고수들을 하나씩 포섭한다',
      '개방이 양분되어 정통과 오의(汚衣) 두 파로 갈라섰다',
      '정파의 대문파가 마교의 비밀 분파임이 드러나려 한다',
      '강호의 질서를 세운 노고수들이 한날한시에 의문사했다',
      '관무불가침(官武不可侵)의 묵계가 황제의 칙명으로 깨졌다',
      '천하의 살수 조직들이 한 사람을 노려 동맹을 맺었다',
      '정파 비무대회가 사파의 인재 사냥터로 변질됐다',
      '무림맹의 군자검(君子劍)이 뒤로는 마공을 익혔다',
      '강호를 가르는 정사(正邪)의 경계 자체가 누군가의 거짓이었다',
    ],
  },
  {
    key: 'martial', label: '무공·기연 변수', icon: '📜', hint: '기연(奇緣)·신공(神功)·내공이 갈등에 끼우는 결정적 변수',
    pool: [
      '천하를 가를 절대신공(絶代神功)의 마지막 한 장이 사라졌다',
      '익히면 강해지나 인간성을 갉아먹는 마공(魔功)을 손에 넣었다',
      '비동(秘洞)에서 얻은 심법(心法)이 가문의 원수가 남긴 것이었다',
      '내공을 단숨에 끌어올릴 영약(靈藥)이 단 하나, 쟁탈전이 벌어졌다',
      '전대고수가 죽기 전 무공과 함께 갚을 수 없는 유지(遺志)를 남겼다',
      '흡성대법(吸星大法)으로 빼앗은 내력이 주인을 잠식하기 시작했다',
      '검기(劍氣)를 검강(劍罡)으로 올릴 마지막 깨달음이 금기(禁忌)에 있다',
      '익힌 무공의 약점이 하필 가장 아끼는 사람에게만 통한다',
      '환골탈태(換骨奪胎)의 기연이 수명을 대가로 요구한다',
      '두 갈래 상승무공(上乘武功)이 서로를 거부해 하나를 버려야 한다',
      '진기(眞氣)가 역류해 운기조식(運氣調息) 한 번이 곧 생사의 갈림이다',
      '신병이기(神兵利器)가 주인의 피를 마실수록 살심(殺心)을 부른다',
      '깨달음의 문턱에서 심마(心魔)가 과거의 죄책감을 끄집어낸다',
      '비급의 진본(眞本)과 위본(僞本)이 뒤섞여 익히면 폐인이 된다',
      '절벽기연으로 얻은 신공이 익힐수록 기억을 지워버린다',
      '만년하수오(萬年何首烏)를 두고 영물(靈物)과 목숨을 건 거래를 해야 한다',
      '반로환동(返老還童)의 비술이 한 세대의 인연을 모두 끊어 놓는다',
      '검 한 자루에 깃든 전대 검신(劍神)의 검의(劍意)가 주인을 시험한다',
      '구결(口訣)의 마지막 한 줄이 일부러 틀리게 새겨져 있었다',
      '공청석유(空靑石乳)를 마시면 강해지나 평생 햇빛 아래 설 수 없다',
      '주화입마를 풀 유일한 심법이 적 문파의 절학(絶學)이다',
      '내단(內丹)을 삼킨 대가로 영물의 살의(殺意)까지 함께 깃들었다',
      '익힌 신법(身法)이 빨라질수록 수명이 한 호흡씩 깎인다',
      '천맥(天脈)을 타고났으나 그 무공을 가르칠 자가 원수뿐이다',
      '검강을 완성하는 마지막 한 수가 자신의 단전을 노린다',
      '독공(毒功)으로 강해진 몸이 곁의 모든 생명을 시들게 한다',
      '비급을 익히려면 먼저 두 눈을 스스로 멀게 해야 한다',
      '점혈수(點穴手)의 극의(極意)가 자기 자신에게만 풀리지 않는다',
      '두 사람이 함께 익혀야 완성되는 합벽(合璧) 무공의 짝이 원수다',
      '영약의 약효를 온전히 받으려면 인간의 감정을 버려야 한다',
      '기경팔맥(奇經八脈)을 뚫는 순간 봉인된 마성(魔性)이 깨어난다',
      '신공의 대성(大成)이 곧 사문 멸절의 예언과 맞물려 있다',
      '기연으로 얻은 내력이 본디 죽은 동문에게서 강탈한 것이었다',
      '천하제일의 검법을 익혔으나 그 검을 들 자격이 자신에게 없다',
    ],
  },
  {
    key: 'dilemma', label: '도덕적 트레이드오프', icon: '⚖️', hint: '무협 특유의 협(俠)·의(義)가 시험받는 양립 불가의 선택',
    pool: [
      '협(俠)을 지키면 사문이 멸하고, 사문을 지키면 협을 저버린다',
      '의(義)를 위해 정인(情人)을 베거나, 정인을 위해 의를 버려야 한다',
      '무고한 마을을 살리려면 원수에게 무릎 꿇어야 한다',
      '강해지려면 인간성을, 인간성을 지키려면 무력(武力)을 포기해야 한다',
      '진실을 밝히면 존경하던 스승이 무너지고 강호가 피로 물든다',
      '한 사람을 살리면 백 사람이 죽고, 백을 살리면 그 하나가 죽는다',
      '복수를 완성하는 순간 자신도 똑같은 마두(魔頭)가 된다',
      '강호의 평화를 위해 자신의 결백을 영원히 묻어야 한다',
      '약속을 지키면 배신자가, 약속을 깨면 의리 없는 자가 된다',
      '제자를 살리려면 천하에 화를 부를 금공(禁功)을 전수해야 한다',
      '정파의 대의를 따르면 양심을, 양심을 따르면 동문을 잃는다',
      '원수의 자식을 거두면 사문이 등 돌리고, 버리면 협이 죽는다',
      '비급을 불태우면 천하가 평안하나 사부의 한이 영원히 묻힌다',
      '아비의 복수를 하면 천하의 의인을, 참으면 자신을 잃는다',
      '은혜를 갚으면 원한을 저버리고, 원한을 갚으면 은혜를 저버린다',
      '동문을 고발하면 정의이고 침묵하면 의리이나, 둘 다일 순 없다',
      '마교를 살려 두면 화근이, 멸하면 무고한 교도 수천이 죽는다',
      '스승의 유지를 따르면 무고한 피를, 거스르면 사문의 도를 버린다',
      '천하제일이 되려면 협의(俠義)를, 협의를 지키려면 정점을 포기한다',
      '진범을 밝히면 사랑하는 이가, 덮으면 억울한 자가 죽는다',
      '백성을 구하려면 강호의 금기인 관(官)의 힘을 빌려야 한다',
      '제 손으로 거둔 제자가 곧 천하의 재앙이 될 씨앗임을 안다',
      '연인을 구하면 천하를, 천하를 구하면 연인을 잃는다',
      '복수의 칼을 거두면 비겁자가, 휘두르면 또 다른 비극의 원흉이 된다',
      '약자를 지키는 협이 강자에겐 곧 학살자로 비친다',
      '진실한 사파에 설 것인가, 위선의 정파에 남을 것인가',
      '죽어가는 원수를 살리면 협이고, 두면 천하의 화근이 사라진다',
      '신의를 지키려 거짓을, 정직하려 신의를 깨야 하는 자리에 섰다',
      '제 무공을 봉인하면 가족이, 풀면 강호가 위험에 빠진다',
      '대의를 위해 한 아이를 제물로 바칠 것인가 거부할 것인가',
      '원수와 손잡아 더 큰 악을 막을 것인가, 끝까지 적으로 남을 것인가',
      '사랑을 택하면 사문의 도를, 사문을 택하면 평생의 사랑을 버린다',
      '천하의 비밀을 지키려 평생 누명을 쓰고 살아야 한다',
    ],
  },
  {
    key: 'price', label: '승리·성장의 대가', icon: '💀', hint: '이기고도 잃는 것 — 무협의 비극적 정점을 위한 비용',
    pool: [
      '이기더라도 단전이 부서져 두 번 다시 무공을 쓸 수 없다',
      '금기무공을 쓰는 순간 십 년의 수명이 재가 되어 사라진다',
      '승리의 대가로 평생 숨겨온 정체가 만천하에 드러난다',
      '적을 베는 그 칼이 마지막 혈육의 인연마저 끊어 놓는다',
      '천하제일에 오르되 곁에 남는 이 하나 없이 홀로 귀은(歸隱)한다',
      '심마를 이겨내지 못하면 그대로 발광(發狂)해 폐인이 된다',
      '결투에서 이겨도 강호 전체를 적으로 돌리게 된다',
      '내력을 모두 소진해 평범한 필부(匹夫)로 돌아가야 한다',
      '복수를 이룬 자리에 남는 것은 텅 빈 가슴과 끝없는 회한뿐이다',
      '비급을 지켜내는 대가로 사랑하는 이를 제 손으로 보내야 한다',
      '진실을 밝힌 뒤엔 영웅이 아닌 패륜아로 강호에 이름이 남는다',
      '승부의 마지막 한 수가 자신의 두 눈 혹은 두 팔을 앗아간다',
      '반탄지력(反彈之力)을 견디다 경맥이 모조리 끊어진다',
      '마공을 끝까지 쓰면 이기되 더는 사람의 마음을 갖지 못한다',
      '원수를 베는 순간 평생을 지탱해온 삶의 목적까지 함께 죽는다',
      '강호를 구하나 그 공(功)은 영원히 다른 이의 이름으로 남는다',
      '기연의 힘을 다 쓰면 갓 얻은 기억과 인연이 모두 사라진다',
      '승리의 표식으로 얼굴에 지워지지 않는 마기(魔氣)가 새겨진다',
      '이기되 평생 한 자루 칼도 다시 쥐지 못하는 손이 된다',
      '천하를 평정하나 그 칼에 베인 모든 얼굴이 밤마다 찾아온다',
      '금공을 봉인하려 자신의 무공 절반을 영원히 잃는다',
      '진실을 지킨 대가로 사문에서 파문되어 강호를 떠돈다',
      '승부에서 이겨도 그 순간 사랑하던 이의 마음이 식어버린다',
      '극에 오른 무공이 곧 인간으로서의 수명을 모두 끌어다 쓴다',
      '천하제일의 이름을 얻되 다시는 평범한 행복을 누릴 수 없다',
      '적을 봉인하려 자신마저 함께 영겁의 빙굴(氷窟)에 갇힌다',
      '승리의 마지막 일격이 자신의 심맥(心脈)을 함께 끊는다',
      '복수를 마친 뒤 강호는 그를 영웅이 아닌 살성(殺星)으로 부른다',
      '신공을 대성하나 곁의 모든 이를 멀리 떠나보내야 한다',
      '이기되 그 대가로 평생 한마디 말도 잃은 벙어리가 된다',
      '천하를 구한 영약을 쓰면 자신은 일 년의 목숨밖에 남지 않는다',
      '승부 끝에 사부와 제자의 인연을 제 손으로 끊어야 한다',
      '강호를 구하나 그 진실은 무덤까지 홀로 짊어져야 한다',
    ],
  },
  {
    key: 'secret', label: '정체·비밀의 떡밥', icon: '🎭', hint: '후반 반전을 위한 은닉된 진실 — 폭로의 뇌관',
    pool: [
      '주인공의 몸엔 멸문한 마교 교주의 마지막 무맥(武脈)이 흐른다',
      '죽은 줄 알았던 사부가 적의 수장으로 살아 숨 쉬고 있다',
      '곁을 지키던 동행이 실은 가문을 멸한 자의 밀정(密偵)이다',
      '주인공이 회귀자임을 눈치챈 자가 강호에 또 있다',
      '천하를 어지럽힌 모든 음모의 배후가 바로 무림맹주다',
      '주인공의 특이체질이 사실 봉인된 고대 마공의 그릇이었다',
      '연모하던 여협이 사문의 원수가 심어둔 칼이었다',
      '얼굴을 가린 적의 가면 아래엔 죽은 형제의 얼굴이 있다',
      '주인공이 익힌 신공의 원주인이 다름 아닌 자신의 친부(親父)였다',
      '강호를 구할 예언의 주인공이 실은 강호를 멸할 자다',
      '비급에 적힌 마지막 구결(口訣)이 곧 주인공의 출생 비밀이다',
      '의절했던 동문이 줄곧 뒤에서 주인공을 지켜온 수호자였다',
      '주인공과 최종 적수는 한 어미에게서 난 쌍둥이다',
      '사문의 멸문을 명한 정파의 영웅이 곧 친혈육이었다',
      '주인공을 노리는 살수가 어릴 적 잃어버린 누이였다',
      '천하제일인이 주인공의 무공을 베껴 정점에 올랐었다',
      '주인공의 사부와 원수가 본디 한 사람의 두 얼굴이다',
      '봉인된 진본 비급이 주인공의 몸 안에 새겨져 있다',
      '강호를 구한 전대 대협이 실은 모든 비극의 설계자였다',
      '주인공이 섬기던 문파 전체가 적이 세운 위장 조직이었다',
      '죽은 정인이 실은 살아 적의 안주인이 되어 있다',
      '주인공의 천형(天形) 같은 무재(無才)가 봉인 술법의 결과였다',
      '예언이 가리킨 구원자는 주인공이 아니라 그의 원수였다',
      '주인공이 평생 좇은 복수의 진범이 거울 속 자신이었다',
      '사라진 절대신공이 주인공의 기억 속에 숨겨져 있다',
      '주인공을 거둔 양부가 친부를 죽이고 신분을 바꿔치기했다',
      '강호의 모든 살문(殺門)을 부린 흑막이 주인공의 스승이다',
      '주인공의 핏줄에만 풀리는 봉인이 천하의 운명을 쥐고 있다',
      '동고동락한 의형제가 처음부터 주인공의 무공을 노린 적이었다',
      '주인공이 받은 기연 자체가 적이 깔아둔 함정의 일부였다',
      '주인공의 진짜 이름이 강호가 두려워하는 마두의 그것이다',
      '천하를 위협하는 마교 교주가 주인공의 미래의 자신이다',
    ],
  },
  {
    key: 'pressure', label: '압박 변수', icon: '⏳', hint: '데드라인·합공·진법·독 — 갈등을 조이는 외부 압력',
    pool: [
      '보름 안에 해독(解毒)하지 못하면 온몸의 경맥이 끊긴다',
      '천하의 고수가 합공(合擊)·연수합격(聯手合擊)으로 길을 막는다',
      '제갈세가의 기문진(奇門陣) 안에 갇혀 출구가 사라졌다',
      '당문의 독과 암기가 사방에서 동시에 날아든다',
      '비무대회(比武大會)의 결승까지 정체를 들켜선 안 된다',
      '관군(官軍)과 마교가 동시에 같은 객잔(客棧)으로 몰려온다',
      '점혈(點穴)당해 진기를 한 줌도 끌어올릴 수 없다',
      '설산(雪山)의 폭설과 추격대가 퇴로를 함께 막는다',
      '운기조식을 마치기 전 적이 들이닥치면 그대로 주화입마다',
      '영약의 약효가 사라지기 전 절대고수를 꺾어야 한다',
      '강을 건너기 전 새외 빙공 고수가 강물째 얼려버린다',
      '하룻밤 안에 누명을 벗지 못하면 사문 전체가 멸문된다',
      '독이 심장에 닿기까지 단 백 보(步)의 거리만 남았다',
      '천라지망(天羅地網)이 펼쳐져 강호 어디에도 숨을 곳이 없다',
      '내력이 바닥나 다음 한 초식이 마지막이 될지 모른다',
      '인질의 목에 칼이 닿은 채 한 수도 물러설 수 없다',
      '비급이 불타기 전 마지막 구결을 외워야 한다',
      '달이 차오르기 전 마성(魔性)이 깨어나 이성을 삼킨다',
      '추격하는 살수의 발소리가 한 골목 뒤까지 따라붙었다',
      '진법의 생문(生門)이 닫히기까지 단 세 호흡이 남았다',
      '독무(毒霧)가 마을을 덮기 전 진원(震源)을 끊어야 한다',
      '내공을 봉인당한 채 절정고수 셋과 맞서야 한다',
      '관의 군대가 성문을 닫기 전 강호를 빠져나가야 한다',
      '심마가 다시 발작하기까지 단 한 시진(時辰)이 남았다',
      '쏟아지는 암기 속에서 단 한 명을 등 뒤로 지켜야 한다',
      '봉인이 풀리는 보름달 아래 적의 군세가 밀려온다',
      '약혼의 비무가 시작되기 전 진실을 증명해야 한다',
      '눈사태가 협곡을 메우기 전 마지막 다리를 건너야 한다',
      '독공의 절정고수가 호흡 한 번에 거리를 좁혀 온다',
      '맹독이 퍼지는 가운데 해약(解藥)은 적의 품에 단 한 알뿐이다',
      '날이 밝으면 사문의 처형이 집행된다',
      '추격대의 횃불이 산 전체를 포위해 좁혀 들어온다',
    ],
  },
]

// ──────────────────────────────────────────────────────────────────────────
// 조합수 계산 — 모든 슬롯 풀 크기의 곱. 1조 이상(핵심 생성기 지향)을 노린다.
// ──────────────────────────────────────────────────────────────────────────
const TOTAL_COMBOS = SLOTS.reduce((acc, s) => acc * s.pool.length, 1)
function formatCombos(n: number): string {
  // 한국어 큰 수 단위(억/조/경)로 사람이 읽기 좋게.
  const units: [number, string][] = [[1e16, '경'], [1e12, '조'], [1e8, '억'], [1e4, '만']]
  for (const [base, label] of units) {
    if (n >= base) {
      const v = n / base
      const s = v >= 100 ? Math.round(v).toLocaleString('ko-KR') : v.toFixed(2).replace(/\.?0+$/, '')
      return `${s}${label} 가지`
    }
  }
  return `${n.toLocaleString('ko-KR')}가지`
}

const LS = 'sry:tool:wuxia-conflictforge'
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]

interface Forged { vals: Record<string, string>; ts: number }

// 단조된 갈등을 한 문단(서사 요약)으로 엮는다 — 무협 어투로.
function narrate(v: Record<string, string>): string {
  const hero = v.hero, root = v.root, faction = v.faction, martial = v.martial
  const dilemma = v.dilemma, price = v.price, secret = v.secret, pressure = v.pressure
  if (!hero) return '아래 〈갈등 단조〉를 눌러 강호의 한 갈등을 빚어보세요.'
  const parts: string[] = []
  if (hero) parts.push(`${hero}인 그/그녀는`)
  if (root) parts.push(`${root}.`)
  if (faction) parts.push(`강호에서는 ${faction}.`)
  if (martial) parts.push(`설상가상으로 ${martial}.`)
  if (pressure) parts.push(`게다가 ${pressure}.`)
  if (dilemma) parts.push(`그는 결국 ${dilemma}는 양자택일 앞에 선다.`)
  if (price) parts.push(`어느 길을 택하든 그 대가로 — ${price}.`)
  if (secret) parts.push(`(숨겨진 진실: ${secret}.)`)
  return parts.join(' ')
}

// 한 줄 핵심 요약(제목/시놉시스용).
function logline(v: Record<string, string>): string {
  if (!v.hero) return '무협 갈등'
  return `${v.hero} — ${v.dilemma || v.root || ''}`.replace(/\s+/g, ' ').trim()
}

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface SavedState { current: Record<string, string> | null; locked: Record<string, boolean>; saved: Forged[] }
function loadState(): SavedState {
  try {
    const raw = localStorage.getItem(LS)
    if (!raw) return { current: null, locked: {}, saved: [] }
    const p = JSON.parse(raw)
    const valid = (o: any): Record<string, string> => {
      const r: Record<string, string> = {}
      if (o && typeof o === 'object') SLOTS.forEach((s) => { if (typeof o[s.key] === 'string') r[s.key] = o[s.key] })
      return r
    }
    const current = p?.current ? valid(p.current) : null
    const locked: Record<string, boolean> = {}
    if (p?.locked && typeof p.locked === 'object') SLOTS.forEach((s) => { if (p.locked[s.key]) locked[s.key] = true })
    const saved: Forged[] = Array.isArray(p?.saved)
      ? p.saved.filter((x: any) => x && x.vals).map((x: any) => ({ vals: valid(x.vals), ts: Number(x.ts) || Date.now() }))
      : []
    return { current: current && Object.keys(current).length ? current : null, locked, saved }
  } catch { return { current: null, locked: {}, saved: [] } }
}

export default function WuxiaConflictForge({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [vals, setVals] = useState<Record<string, string>>(init.current.current || {})
  const [locked, setLocked] = useState<Record<string, boolean>>(init.current.locked)
  const [saved, setSaved] = useState<Forged[]>(init.current.saved)
  const [forging, setForging] = useState(false)
  const [toast, setToast] = useState('')
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify({ current: vals, locked, saved })) }
    catch { if (mounted.current) setToast('저장이 막혀 있어 새로고침 시 내용이 사라질 수 있어요.') }
  }, [vals, locked, saved])

  // 토스트 자동 소거
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1900)
    return () => window.clearTimeout(t)
  }, [toast])

  // 단조 애니메이션 자동 해제
  useEffect(() => {
    if (!forging) return
    const t = window.setTimeout(() => { if (mounted.current) setForging(false) }, 360)
    return () => window.clearTimeout(t)
  }, [forging, vals])

  // 전체(또는 잠기지 않은) 슬롯 재생성
  const forge = useCallback(() => {
    setForging(true)
    setVals((prev) => {
      const next: Record<string, string> = { ...prev }
      SLOTS.forEach((s) => {
        if (locked[s.key] && prev[s.key]) return
        let f = pick(s.pool)
        if (f === prev[s.key] && s.pool.length > 1) f = pick(s.pool)
        next[s.key] = f
      })
      return next
    })
  }, [locked])

  // 개별 슬롯만 재생성
  const reroll = (key: string) => {
    const s = SLOTS.find((x) => x.key === key)!
    setVals((prev) => {
      let f = pick(s.pool)
      if (f === prev[key] && s.pool.length > 1) f = pick(s.pool)
      return { ...prev, [key]: f }
    })
  }

  const toggleLock = (key: string) => setLocked((p) => ({ ...p, [key]: !p[key] }))

  const hasResult = SLOTS.every((s) => vals[s.key])
  const story = narrate(vals)

  // 평문 내보내기
  const asText = (v: Record<string, string>): string => {
    const lines = SLOTS.map((s) => `${s.icon} ${s.label}: ${v[s.key] || '—'}`)
    return `[무협 갈등 단조]\n${lines.join('\n')}\n\n▶ ${narrate(v)}`
  }

  const copy = () => {
    if (!hasResult) return
    const text = asText(vals)
    const done = () => { if (mounted.current) setToast('갈등을 복사했어요.') }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallback(text, done))
      else fallback(text, done)
    } catch { fallback(text, done) }
  }
  const fallback = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setToast('복사에 실패했어요.') }
  }

  // 즐겨찾기 저장(현재 단조 결과를 목록에 보관)
  const saveCurrent = () => {
    if (!hasResult) return
    setSaved((prev) => [{ vals: { ...vals }, ts: Date.now() }, ...prev].slice(0, 50))
    setToast('갈등을 보관함에 저장했어요.')
  }
  const removeSaved = (ts: number) => setSaved((prev) => prev.filter((x) => x.ts !== ts))
  const restoreSaved = (f: Forged) => { setVals({ ...f.vals }); setToast('보관된 갈등을 불러왔어요.') }

  // 본문 HTML(프로젝트/연계용)
  const bodyHtml = (v: Record<string, string>): string => {
    const rows = SLOTS.map((s) => `<p><b>${escHtml(s.icon)} ${escHtml(s.label)}</b><br>${escHtml(v[s.key] || '—')}</p>`).join('')
    return [
      `<p style="font-size:15px;line-height:1.75;"><b>▶ ${escHtml(narrate(v))}</b></p>`,
      '<hr/>',
      rows,
    ].join('')
  }

  // 프로젝트 자료 '갈등' 폴더에 문서 추가
  const toProject = () => {
    if (!hasResult) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '갈등',
      title: `⚔️ ${logline(vals)}`,
      bodyHtml: bodyHtml(vals),
      synopsis: narrate(vals).slice(0, 160),
      meta: {
        장르: '무협',
        처지: vals.hero || '—',
        은원: vals.root || '—',
        딜레마: vals.dilemma || '—',
        대가: vals.price || '—',
      },
    })
    setToast(id ? '프로젝트 자료 〈갈등〉 폴더에 추가했어요.' : '프로젝트 추가에 실패했어요.')
  }

  // 글감 스니펫으로 보관(공유 라이브러리)
  const toSnippet = () => {
    if (!hasResult) return
    addToLibrary('snippets', { text: narrate(vals), source: '무협 갈등 단조기', tags: ['무협', '갈등'] })
    setToast('글감 스니펫으로 저장했어요.')
  }

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)', overflow: 'hidden' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="⚔️"/></span>
        <strong style={{ fontSize: 15 }}>무협 갈등 단조기</strong>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--muted)' }} title={`${TOTAL_COMBOS.toLocaleString('ko-KR')}가지`}>
          조합 {formatCombos(TOTAL_COMBOS)}
        </span>
      </div>

      <div style={body}>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>
          여덟 갈래 슬롯을 무작위로 단조해 <b>무협다운 갈등 구도</b>를 빚습니다. 마음에 드는 칸은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 단조하세요. 칸마다 <Emoji e="🎲"/>로 그 칸만 다시 굴릴 수 있습니다.
        </div>

        {/* 슬롯들 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SLOTS.map((s) => {
            const val = vals[s.key]
            const isLocked = !!locked[s.key]
            return (
              <div key={s.key} style={{ display: 'flex', alignItems: 'stretch', gap: 8, background: 'var(--panel)', border: '1px solid ' + (isLocked ? 'var(--accent)' : 'var(--border)'), borderRadius: 10, padding: '9px 10px' }}>
                <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0, paddingTop: 2, transition: 'transform .25s', transform: forging && !isLocked ? 'rotate(-10deg) scale(1.15)' : 'none' }}><Emoji e={s.icon}/></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600 }}>{s.label}</span>
                    <span style={{ opacity: 0.7 }} title={s.hint}>· {s.pool.length}종</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.45, marginTop: 2, color: val ? 'var(--text)' : 'var(--muted)', wordBreak: 'break-word' }}>
                    {val ? (forging && !isLocked ? '…' : val) : `— ${s.hint} —`}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                  <button className="minibtn" onClick={() => reroll(s.key)} title="이 칸만 다시 굴리기" style={{ padding: '2px 7px', fontSize: 12 }}><Emoji e="🎲"/></button>
                  <button className="minibtn" onClick={() => toggleLock(s.key)} title={isLocked ? '고정 해제' : '이 칸 고정'} style={{ padding: '2px 7px', fontSize: 12, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>{isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
                </div>
              </div>
            )
          })}
        </div>

        {/* 서사 요약 */}
        <div style={{ background: 'var(--chrome-2)', border: '1px solid ' + (hasResult ? 'var(--accent)' : 'var(--border)'), borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 5 }}>▶ 단조된 갈등 (서사 요약)</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.75, color: hasResult ? 'var(--text)' : 'var(--muted)', whiteSpace: 'pre-wrap' }}>{story}</div>
        </div>

        {/* 액션 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-primary" style={{ flex: 1, minWidth: 130 }} onClick={forge}><Emoji e="⚒️"/> 갈등 단조</button>
          <button className="minibtn" onClick={saveCurrent} disabled={!hasResult} title="현재 갈등을 보관함에 저장"><Emoji e="⭐"/> 보관</button>
          <button className="minibtn" onClick={copy} disabled={!hasResult} title="갈등을 텍스트로 복사"><Emoji e="📋"/> 복사</button>
        </div>

        {/* 연계 */}
        <div className="linkbar" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
          <button className="linkbtn" onClick={toProject} disabled={!hasResult || !hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈갈등〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
          <button className="linkbtn" onClick={toSnippet} disabled={!hasResult} title="이 갈등을 글감 스니펫으로 보관"><Emoji e="💡"/> 글감으로 저장</button>
          <button className="linkbtn" onClick={() => openToolLinked('conflict-builder', { genre: (payload?.genre as string) || '무협', desire: vals.root, obstacle: vals.faction, stakes: vals.price })} title="갈등 설계기에서 더 다듬기"><Emoji e="🔧"/> 갈등 설계기</button>
          <button className="linkbtn" onClick={() => openToolLinked('character-forge', { genre: (payload?.genre as string) || '무협' })} title="협사 인물 빚기"><Emoji e="🧍"/> 인물 단조</button>
        </div>

        {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}

        {/* 보관함 */}
        {saved.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}><Emoji e="⭐"/> 보관한 갈등 ({saved.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {saved.map((f) => (
                <div key={f.ts} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 9, padding: '7px 9px' }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }} title={narrate(f.vals)}>
                    {logline(f.vals)}
                  </div>
                  <button className="minibtn" onClick={() => restoreSaved(f)} title="불러오기" style={{ padding: '2px 7px', fontSize: 11, flexShrink: 0 }}>↺</button>
                  <button className="minibtn" onClick={() => removeSaved(f.ts)} title="삭제" style={{ padding: '2px 7px', fontSize: 11, color: 'var(--warn)', flexShrink: 0 }}><Emoji e="🗑️"/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.55, marginTop: 2 }}>
          단조된 갈등은 출발점입니다. 무협의 "은혜는 갚고 원한도 갚는다"는 계약과 "이기고도 잃는" 대가를 살려, 자유롭게 비틀어 보세요.
        </div>
      </div>
    </div>
  )
}
