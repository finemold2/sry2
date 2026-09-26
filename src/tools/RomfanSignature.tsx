// 로판 시그니처 — 로맨스판타지 전개 대형 생성기(조합 1조+ 지향).
//  회빙환(회귀/빙의/환생) 설정 × 신분·처지(영애/황녀/기사/성녀…) × 남주 유형 × 계약·관계 시작
//  × 오해·장벽 × 궁중 사건 × 반전(숨은 진실) 일곱 슬롯의 로컬 풀(로판 도시에 기반·장르 특화)에서
//  무작위로 뽑아, "프롤로그(죽음·파멸) → 회빙환 각성 → 남주와 엮임 → 블랙 모먼트 → 공개 망신 역전
//  → 운명 전복 HEA"로 이어지는 로판 한 편을 조립한다.
//  슬롯별 🔒 잠금 + 부분 재생성, 총 조합수(1조+) 표시, 보관함(localStorage 자동 저장/복원),
//  스니펫 라이브러리 저장, 프로젝트(자료) 추가, 관련 도구 열기. 외부 네트워크·라이브러리 없음.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'romfan-signature',
  name: '로판 시그니처(1조+ 조합)',
  icon: '👑',
  group: '생성기',
  genre: '로맨스판타지',
  intro: '회빙환·신분·남주 유형·계약/오해·궁중 사건·반전을 조합해 로맨스판타지 전개를 1조+ 가지로 대량 생성하세요',
  w: 620,
  h: 700,
}

const LS = 'sry:tool:romfan-signature'

interface Slot { key: string; label: string; icon: string; beat: string; faces: string[] }

// 일곱 축의 로컬 풀(로판 도시에 근거).
//  회빙환(回憑還)·신분·남주 유형·계약/관계 시작·오해/장벽·궁중 사건·반전.
//  각 풀이 넉넉해 전체 조합수가 1조를 가뿐히 넘는다(아래 TOTAL_COMBOS 계산).
const SLOTS: Slot[] = [
  {
    key: 'awaken', label: '회빙환 설정', icon: '⏳', beat: '프롤로그·각성',
    faces: [
      '처형대에서 목이 떨어지는 순간, 결혼 첫날밤으로 회귀한다',
      '독이 든 찻잔을 비운 직후, 데뷔탕트 무도회 전날로 회귀한다',
      '폐비가 되어 별궁에서 얼어 죽은 뒤, 황후로 책봉되던 날로 회귀한다',
      '남편의 칼에 찔려 쓰러진 순간, 정략결혼 선보는 자리로 회귀한다',
      '단두대 위에서 눈을 감자, 악역으로 데뷔하기 십 년 전 어린아이로 회귀한다',
      '화형당하던 불길 속에서, 성녀로 간택되기 직전으로 회귀한다',
      '교통사고로 죽은 현대인이, 읽던 로판 속 파멸할 악역 영애로 빙의한다',
      '야근 끝에 잠들었다가, 망겜 속 처형 직전의 엑스트라 시녀로 빙의한다',
      '소설 마지막 장을 덮은 순간, 그 책 속 버림받는 황비의 몸으로 빙의한다',
      '병상에서 숨을 거두자, 어린 시절 좋아하던 동화 속 저주받은 공녀로 빙의한다',
      '게임 오버 화면을 보던 중, 배드엔딩이 확정된 악녀 캐릭터로 빙의한다',
      '전생의 기억을 가진 채, 몰락 백작가의 막내딸로 다시 태어난다',
      '신께 한 가지 소원을 빌고, 죽었던 그 세계의 갓난 황녀로 환생한다',
      '죽기 직전 "다시 한번"을 외쳤더니, 원수 가문의 외동딸로 환생한다',
      '바다에 몸을 던진 뒤, 백 년 전 멸망한 왕국의 마지막 공주로 환생한다',
      '회귀했지만 단 하루 전으로만, 같은 죽음을 막으려 발버둥 친다',
      '회귀했더니 십오 년 전, 자신을 죽인 자가 아직 순수한 소년이던 시절이다',
      '세 번째 회귀, 앞선 두 번의 죽음을 모두 기억한 채 다시 시작한다',
      '빙의했더니 원작에서 三화 만에 죽는 단역, 생존 기한이 코앞이다',
      '빙의한 몸의 원래 주인이 남긴 일기로 정해진 파멸을 알게 된다',
      '회귀 직후, 죽기 전 들은 "원작 강제력"이라는 말의 의미를 깨닫는다',
      '처형 전 마지막으로 본 황태자의 눈빛을 기억한 채 과거로 돌아온다',
      '독살당한 기억을 안고, 자신을 독살할 시녀를 첫날부터 알아본다',
      '회귀 후, 미래에 일어날 모든 비극의 날짜를 머릿속에 새기고 있다',
      '빙의했더니 하필 원작 여주인공의 악역 라이벌, 죽음의 플래그가 한가득이다',
      '환생한 아기의 몸으로, 전생의 어휘를 떠올리며 어른들을 관찰한다',
      '죽은 뒤 신전의 심판대 앞에서, "한 번 더" 기회를 받고 회귀한다',
      '회귀했지만 능력은 없고 오직 미래 지식만이 유일한 무기다',
      '빙의 후, 자신이 들어온 몸이 곧 폐위될 황후임을 깨닫는다',
      '전생에 자신을 버린 가족 곁에서, 이번엔 다르게 살기로 결심하며 깨어난다',
      '단검에 찔린 그 밤으로 돌아와, 범인의 얼굴을 또렷이 기억한다',
      '회귀자임을 들키면 마녀로 몰린다는 걸 알고, 미래 지식을 철저히 숨긴다',
      '빙의했더니 원작 최종 보스의 어린 딸, 아버지의 파멸까지 막아야 한다',
      '환생 후 전생의 원수가 이번 생의 약혼자로 정해져 있음을 알게 된다',
      '회귀 첫날, 거울 속 자신이 처형 직전보다 십 년은 어려진 걸 본다',
      '죽음의 순간 들린 시스템 음성과 함께, 상태창을 가진 채 회귀한다',
      '빙의한 악역 영애에게 "호감도" 게이지가 보이기 시작한다',
      '회귀했지만 이번엔 기억이 군데군데 비어, 빈칸을 더듬으며 살아간다',
      '환생해 보니 전생의 자신이 쓴 소설 속 세계, 결말까지 다 알고 있다',
      '처형 직전 누군가 흘린 눈물 한 방울의 의미를, 회귀 후에야 곱씹는다',
      '두 번 죽고 세 번째로 깨어나, 이번엔 누구도 믿지 않기로 한다',
      '빙의했더니 원작 첫 화에서 이미 죽어 있어야 할 시한부 황녀다',
      '회귀 후, 자신을 살리려다 죽은 호위 기사의 마지막을 막기로 다짐한다',
      '환생한 영지의 굶주린 백성을 보고, 전생의 지식으로 바꿔 보기로 한다',
      '회귀했더니 폐허가 된 가문, 모든 것이 무너지기 직전의 첫날이다',
      '빙의한 직후, 원작의 "정해진 결말"을 거스를 단 하나의 분기점을 찾는다',
      '죽은 줄 알았는데 회귀, 그러나 회귀 전 사랑했던 그는 아직 자신을 모른다',
      '환생 후 신탁이 내려, "예언 속 그 아이"가 자신임을 알게 된다',
      '회귀자라는 비밀을 안고, 전생에 자신을 배신한 자에게 먼저 손을 내민다',
      '빙의했더니 원작에서 남주를 파멸시키는 악녀, 그를 살리기로 마음먹는다',
      '회귀 후, 전생의 마지막 기억이 남편의 "사랑한다"는 거짓말이었음을 곱씹는다',
      '환생한 몸이 마법을 쓸 수 없는 결함아, 그러나 전생의 머리가 있다',
      '빙의 직후, 곧 닥칠 황실 쿠데타의 날짜를 떠올리며 등골이 서늘해진다',
      '회귀했지만 시간이 빠르게 흘러, 파멸의 날까지 일 년밖에 남지 않았다',
      '죽음의 강을 건너던 중, 자신을 부르는 목소리에 이끌려 과거로 돌아온다',
      '환생해 갓난아기로 누운 요람에서, 자신을 죽일 자의 자장가를 듣는다',
      '회귀 후, 전생에 외면했던 어린 동생을 이번엔 지키기로 결심한다',
      '빙의한 몸의 약혼자가 원작 최악의 폭군이 될 운명임을 알게 된다',
      '회귀 직후, 이번 생엔 사랑 따위 하지 않겠다고 스스로에게 맹세한다',
      '환생한 세계에서 전생의 언어를 아는 자가 자신뿐임을 깨닫는다',
      '죽기 전 마지막으로 쓴 유언장을 회귀 후 직접 다시 찢어 버린다',
      '빙의했더니 원작 속 "잊혀진 첫째 황녀", 모두가 죽었다고 믿는 존재다',
      '회귀해 보니 자신을 죽인 독약의 제조법을 이미 알고 있다',
      '환생 후, 전생의 죽음이 사고가 아니라 누군가의 계획이었음을 직감한다',
      '회귀자임을 숨긴 채, 미래에 황제가 될 소년 곁에 일부러 머문다',
      '빙의한 직후 거울 앞에서, 원작 삽화 속 악녀의 얼굴과 마주한다',
      '회귀 후 첫 행동으로, 전생에 자신을 모함한 시녀를 조용히 내보낸다',
      '환생한 몸에 깃든 고대의 피가, 신성력으로 서서히 깨어난다',
      '죽음 직전 떠올린 단 하나의 후회를 바로잡으려 과거로 돌아온다',
      '빙의했더니 원작 최강 흑막의 정혼녀, 그의 계획을 전부 알고 있다',
      '회귀 후, 전생에 자신을 살려 준 익명의 은인을 찾아 나서기로 한다',
      '환생해 보니 멸문당할 가문의 유일한 핏줄, 시간이 얼마 없다',
      '회귀했지만 능력 대신 "미래에 죽을 사람"이 흐릿하게 보이는 눈을 얻는다',
      '빙의 직후, 원작에서 자신을 죽이는 남주의 첫 등장 장면을 떠올린다',
      '죽은 뒤 다시 눈을 뜨니, 사랑을 잃기 전 가장 빛나던 시절로 돌아와 있다',
      '환생한 황녀의 몸으로, 전생의 기억과 이생의 운명 사이에서 갈등한다',
      '회귀 후, 이번엔 황후가 아니라 자유를 택하겠다고 결심한다',
      '빙의한 악역 영애에게, 원작에 없던 "선택지" 시스템이 떠오른다',
      '회귀해 보니 전생의 모든 적이 아직 자신에게 다정하던 시절이다',
      '환생 후, 자신이 전생에 죽인 자의 아이로 다시 태어났음을 알게 된다',
      '죽음의 순간 신과 거래해, 단 하나의 미래를 바꿀 권한을 얻고 회귀한다',
      '빙의했더니 원작 1권 마지막에 버려지는 계약 황비의 몸이다',
      '회귀 직후, 전생에 자신을 가둔 탑의 열쇠를 이미 손에 쥐고 있다',
      '환생한 영지에서 전생의 레시피로 디저트를 만들어 살길을 연다',
      '회귀자라는 사실을 들킨 채 깨어나, 그가 자신을 경계하기 시작한다',
      '빙의한 직후, 원작 강제력이 자신을 정해진 죽음으로 끌어당김을 느낀다',
      '죽기 전 들은 "널 사랑했다"는 말의 진위를 회귀 후 확인하려 한다',
      '환생해 보니 전생에 쓰다 만 소설의 결말을 자신이 살아야 한다',
      '회귀 후, 전생에 놓친 단 한 사람을 이번엔 붙잡기로 마음먹는다',
      '빙의했더니 원작 여주의 들러리, 그러나 진짜 비밀은 자신에게 있다',
      '회귀 직후, 미래에 터질 역병의 날짜를 떠올리며 약초를 모으기 시작한다',
      '환생한 몸이 저주에 묶여, 스무 살 생일에 죽을 운명임을 알게 된다',
      '죽음 끝에서 회귀한 자신을, 아직 어린 그가 처음 본 듯 올려다본다',
      '빙의한 악녀의 몸으로, 원작 남주의 파멸 루트를 막을 단서를 쥔다',
      '회귀 후, 전생에 자신을 배신한 가문을 이번엔 먼저 무너뜨리기로 한다',
      '환생해 보니 신전이 찾던 잃어버린 성녀가 바로 자신이다',
      '회귀 직후, 전생의 죽음을 되풀이하지 않으려 가장 먼저 도망을 준비한다',
      '빙의한 직후, 손등에 새겨진 계약 문양이 곧 닥칠 운명을 알린다',
      '죽었던 자신이 회귀해, 같은 날 같은 자리에서 그를 다시 마주 선다',
    ],
  },
  {
    key: 'status', label: '신분·처지', icon: '🎀', beat: '여주의 자리',
    faces: [
      '폐가 직전 몰락 백작가의 막내 영애, 빚더미 위에 앉아 있다',
      '서출이라 천대받는 공작가의 둘째 영애다',
      '제국 최고 명문가의 정략결혼 카드로 길러진 영애다',
      '잊혀진 첫째 황녀, 별궁에 갇혀 존재마저 지워진 신세다',
      '병약하다는 이유로 폐위 위기에 몰린 시한부 황녀다',
      '적국에 인질로 보내진 망국의 마지막 공주다',
      '신성력을 잃어 추방당한 전(前) 성녀다',
      '신전이 새로 간택한 어린 성녀, 모두의 기대를 한 몸에 받는다',
      '검을 든 여기사, 가문의 명예를 짊어진 근위 기사단의 막내다',
      '재능을 숨긴 채 살아가는 마탑의 비밀 제자다',
      '하녀로 팔려 간 몰락 귀족의 딸, 원수 가문에 머문다',
      '계약 결혼으로 들어온, 사랑받지 못하는 황비다',
      '버림받아 별궁에 유폐된 폐비(廢妃)다',
      '가문을 일으킬 사명을 진 차기 가주(家主) 후보 영애다',
      '평민으로 위장해 사교계에 잠입한 숨은 귀족이다',
      '약혼이 파기된 채 사교계의 비웃음을 사는 영애다',
      '독살당할 운명이 정해진 황태자비 후보다',
      '아카데미 수석을 다투는 천재 마법사 영애다',
      '정령과 계약한 희귀한 정령사, 가문의 비밀 무기다',
      '황실 다과회의 들러리로만 불려 다니는 한미한 자작가의 딸이다',
      '죽은 언니를 대신해 그 자리에 앉혀진 대역 영애다',
      '저주받은 핏줄이라 불리며 사람들이 피하는 후작가의 외동딸이다',
      '신탁이 지목한 "예언 속 아이", 운명을 떠안은 소녀다',
      '몰락한 상단을 물려받아 직접 장사에 뛰어든 영애다',
      '황궁 시녀로 들어와 모든 비밀을 엿듣는 위치에 선다',
      '가문에서 버려져 변경의 영지를 홀로 다스리게 된 영주다',
      '쌍둥이 언니의 그림자에 가려 자란 둘째 영애다',
      '정혼자에게 파혼당해 수녀원에 보내질 위기의 영애다',
      '대공가의 양녀로 들어온, 출신을 알 수 없는 소녀다',
      '황제의 눈 밖에 나 변방으로 쫓겨난 후궁이다',
      '마법을 못 쓰는 결함아라 멸시받는 마법 명가의 딸이다',
      '전대 영웅의 유일한 핏줄, 그러나 가난 속에 자랐다',
      '귀족 사회에 갓 데뷔한, 모두가 주목하는 신예 영애다',
      '죽은 약혼자의 미망인으로 남겨진 어린 영애다',
      '황태자의 가짜 약혼녀로 세워진 방패막이 영애다',
      '신성 마법에 재능을 보여 신전에 끌려간 시골 소녀다',
      '가문의 비밀 장부를 쥔 채 회계를 도맡는 영리한 영애다',
      '폐위된 황후의 딸이라 죄인 취급받는 황녀다',
      '북부 변경백 가문의, 검과 영지 경영을 모두 익힌 영애다',
      '얼굴을 가린 채 가면무도회에서만 모습을 드러내는 비밀의 영애다',
      '황실 도서관 사서로 일하며 금서의 비밀에 닿은 영애다',
      '계약으로 묶인 대마법사의 어린 제자 겸 조수다',
      '성녀로 위장했으나 실은 신성력이 없는 가짜 성녀다',
      '몰락 가문을 디저트 사업으로 일으키려는 영애다',
      '황제의 숨겨진 사생아로, 뒤늦게 황실에 불려 온 황녀다',
      '오라비들 틈에서 거칠게 자란, 무가(武家)의 외동딸이다',
      '약초와 치유에 능해 "치유의 손"이라 불리는 영애다',
      '저주에 걸려 밤마다 모습이 변하는 비밀을 가진 공녀다',
      '망한 영지를 되살리려 직접 흙을 만지는 실용주의 영주다',
      '황실 무도회의 단골 망신거리, 그러나 속엔 칼을 품은 영애다',
      '용병단에 위장 입단한 귀공녀, 검술이 남다르다',
      '귀족이면서도 평민 거리에서 자란 이중생활의 영애다',
      '신전의 무녀로, 신탁을 전하는 통로가 된 소녀다',
      '가문의 정략 도구로 황궁에 바쳐진 어린 후궁이다',
      '폐서인되어 평민으로 강등됐다가 다시 불려 온 전직 영애다',
      '대상단의 외동딸로, 돈으로 신분을 사려는 야망을 품었다',
      '죽은 줄 알려진 황녀가 시골에서 정체를 숨기고 살아간다',
      '마수(魔獸)와 교감하는 희귀 능력으로 가문의 비밀이 된 영애다',
      '황태자 전속 가정교사로 들어온 몰락 귀족의 딸이다',
      '신검에 선택받아 본의 아니게 영웅으로 떠밀린 영애다',
    ],
  },
  {
    key: 'lead', label: '남주 유형', icon: '🗡️', beat: '운명의 상대',
    faces: [
      '얼음장 같은 무표정 뒤에 집착을 숨긴 냉미남 황제',
      '전생에 자신을 처형한 폭군, 그러나 회귀 후엔 무릎을 꿇는 황태자',
      '오직 여주에게만 다정해지는, 만인에겐 잔혹한 대공',
      '원작 속 최종 흑막이었으나 여주 앞에선 한없이 약해지는 마탑주',
      '냉혹한 검귀(劍鬼)로 불리지만 여주만은 목숨 걸고 지키는 기사단장',
      '능글맞은 웃음 뒤에 깊은 상처를 감춘 바람둥이 황자',
      '말수 적고 우직한, 그러나 한 번 정하면 평생을 거는 변경백',
      '여주를 죽이러 온 암살자였다가 그녀에게 길드는 그림자',
      '신을 대리하는 차가운 대신관, 여주 앞에서 처음 흔들린다',
      '저주에 걸려 짐승의 모습이 된, 외로운 성의 주인',
      '집착광공의 정수, "도망쳐도 끝까지 찾아낸다"는 황제',
      '여주의 정체(회귀·빙의)를 알고도 포용하는 다정한 황태자',
      '겉은 한량 같지만 제국 최강의 검을 숨긴 대공',
      '신분을 숨기고 평민으로 살던, 알고 보면 폐황자',
      '계약으로 묶인 가짜 남편, 점점 진짜가 되어 가는 공작',
      '여주를 첫눈에 알아본, 전생의 약속을 기억하는 환생자',
      '냉정한 재상으로 정치판을 쥐었으나 여주 앞에선 서툰 남자',
      '용병 출신으로 황위에 오른 거친 매력의 정복 군주',
      '병약한 미소년 황제, 그러나 속엔 누구보다 단단한 야망',
      '여주를 향한 마음을 의무로 포장하는, 서툰 호위 기사',
      '제국 최고의 마법사이자 여주의 까칠한 스승인 대마법사',
      '말 없이 곁을 지키다 결정적 순간에 모든 걸 거는 충신',
      '여주를 적으로 알고 다가왔다가 진심에 무너지는 적국 황태자',
      '겉으론 무심하지만 여주의 취향을 전부 외운 세심한 공작',
      '왕좌보다 여주를 택하겠다 선언하는, 야망을 버린 황자',
      '한 번 배신당한 뒤 누구도 믿지 않다가 여주에게만 마음을 여는 군주',
      '여주의 호위로 위장 잠입한, 정체를 숨긴 적국의 검',
      '신성력을 가진 성자(聖者), 금욕을 깨고 여주에게 빠진다',
      '냉혈한 사업가형 공작, 계약서로 시작해 진심으로 끝낸다',
      '여주를 살리려 일부러 악역을 자처하고 모질게 구는 남자',
      '전생의 기억을 가진 채 여주를 평생 기다려 온 회귀 남주',
      '거친 변경의 야수 같은 영주, 여주 앞에서만 순해진다',
      '여주가 빙의로 들어오기 전부터 그녀의 변화를 눈치챈 예민한 황제',
      '가면 뒤에 황족의 신분을 감춘 채 여주에게 접근하는 수수께끼의 남자',
      '여주의 죽음을 막으려 시간을 거슬러 온 또 한 명의 회귀자',
      '권력과 부를 다 가졌으나 사랑만은 처음인 어린 황제',
      '여주에게 빚을 졌다며 평생을 갚겠다 매달리는 우직한 기사',
      '냉소적이고 입은 험하지만 행동은 끝없이 다정한 마탑의 천재',
      '여주를 정략의 도구로 들였다가 진짜로 빠져 버린 차기 가주',
      '신탁이 점지한 여주의 운명적 짝, 그러나 처음엔 서로를 거부한다',
      '제국을 등진 반역자였으나 여주를 위해 다시 검을 잡는 남자',
      '여주의 비밀을 협박 카드로 쥐었다가 오히려 사랑에 빠지는 흑막',
      '말썽쟁이 막내 황자, 여주 앞에서만 어른스러워진다',
      '죽은 줄 알았던 여주의 옛 정혼자가 황제가 되어 돌아온다',
      '여주를 거두어 키운 보호자였다가 어느새 마음이 변한 대공',
      '감정을 모른다고 여겨지던 인형 같은 황태자, 여주에게 처음 웃는다',
      '여주의 영지를 노리고 왔다가 그녀의 능력에 반한 이웃 영주',
      '신을 잃은 타락한 사제, 여주에게서 다시 믿음을 찾는다',
      '얼음 공작이라 불리지만 여주의 손길에만 온도가 도는 남자',
      '여주가 회귀로 바꾼 미래의 유일한 변수, 예측 불가의 황자',
    ],
  },
  {
    key: 'bond', label: '계약·관계 시작', icon: '📜', beat: '엮임',
    faces: [
      '한시적 계약 결혼으로 묶여, 일 년 뒤 깨끗이 이혼하기로 약속한다',
      '위장 부부 연기를 하다 점점 진짜처럼 굴게 된다',
      '서로의 약점을 쥔 채, 이용 가치만으로 손을 잡는 거래를 맺는다',
      '파혼을 막으려 가짜 연인 행세를 시작한다',
      '목숨을 구해 준 대가로 평생의 충성(혹은 결혼)을 맹세받는다',
      '마법 계약으로 영혼이 묶여, 한쪽이 죽으면 다른 쪽도 위험해진다',
      '정략결혼으로 처음 보는 상대와 한 침실을 쓰게 된다',
      '주종 계약을 맺어 그를 호위로, 혹은 그녀를 주인으로 들인다',
      '신탁이 둘을 "운명의 짝"으로 묶어, 거부할 수 없는 인연이 된다',
      '빚을 갚는 조건으로 그의 저택에 얹혀살게 된다',
      '서로를 죽이려던 둘이, 공동의 적 앞에서 일시적 동맹을 맺는다',
      '계약서에 도장을 찍으며, 사랑은 절대 안 한다는 조항을 단다',
      '가짜 약혼으로 사교계를 속이다, 둘만 아는 비밀이 쌓여 간다',
      '폭설로 끊긴 별궁에 단둘이 갇혀 강제 동거가 시작된다',
      '그의 정혼녀 대역으로 들어가, 진짜처럼 행동해야 한다',
      '회귀 정보를 미끼로, 그에게 먼저 손을 내밀어 거래를 튼다',
      '그를 살릴 단 하나의 조건이 곁에 머무는 것이라, 어쩔 수 없이 묶인다',
      '서로의 목적이 같음을 알고, 적대하던 둘이 비밀 협력을 시작한다',
      '저주를 풀 열쇠가 서로임을 알게 되어 동행할 수밖에 없다',
      '그의 후견을 받는 대가로, 가문의 비밀을 함께 짊어진다',
      '하룻밤 실수(혹은 오해)로 책임을 지게 되어 식을 올린다',
      '둘만의 비밀 거래로, 서로의 평판을 지켜 주기로 약속한다',
      '검술(혹은 마법) 사제 관계로 묶여, 매일 마주할 수밖에 없다',
      '망명한 그녀를 숨겨 주는 대가로 위장 부부가 된다',
      '계약 마법사로 고용되어, 까칠한 그의 탑에서 함께 지낸다',
      '인질로 보내졌으나, 정중한 대우 속에 묘한 동거가 시작된다',
      '서로의 결혼을 막아 줄 동맹으로, "거래 연인"이 되기로 한다',
      '그의 가정교사로 들어가, 매일 한 지붕 아래 마주 앉는다',
      '신전의 명으로 성녀와 성기사로 짝지어져 함께 임무를 떠난다',
      '도박 빚 대신 그녀를 데려간 그가, 뜻밖에 정중히 대한다',
      '계약 종료일을 정해 두고 시작한 동거가, 자꾸 연장된다',
      '서로를 이용하기로 한 약속이, 어느새 서로를 챙기는 습관이 된다',
      '가문 간 화친의 볼모로 보내져, 적가의 안주인이 된다',
      '비밀을 지켜 주는 조건으로, 그의 그림자처럼 곁에 붙는다',
      '운명의 붉은 실이 보이는 능력으로, 자신과 그가 묶인 걸 알아챈다',
      '그를 단죄하러 왔다가, 진실을 알기 위해 곁에 머물기로 한다',
      '서로의 첫사랑인 척 연기하는 거래로, 옛 연인들 앞에 선다',
      '한 방만 남은 여관에서 시작된 동행이 길어진다',
      '그의 영지를 살려 주는 조건으로, 안주인 자리를 맡는다',
      '죽음을 함께 넘긴 뒤, 말없이 서로의 편이 되기로 한다',
      '계약서엔 없던 "심장이 뛰는 일"이 자꾸 늘어 간다',
      '그녀의 능력을 빌리는 대가로, 그가 평생의 보호를 약속한다',
      '거짓 연인 사진을 찍다, 진짜 같은 눈빛에 둘 다 흔들린다',
      '서로 다른 목적을 숨긴 채 동행을 시작한다',
      '폐허가 된 성에서 함께 살아남기로 손을 잡는다',
      '그의 약혼 파혼을 도와주는 조건으로, 가짜 연인이 된다',
      '신성 계약으로 묶여, 서로의 거짓말을 꿰뚫어 보게 된다',
      '몰락한 가문끼리 손을 잡고, 재기를 노리는 동업자가 된다',
      '그를 호위하는 임무를 맡아, 밤낮으로 곁을 지키게 된다',
      '둘만 아는 비밀을 공유하며, 공범 같은 사이가 된다',
    ],
  },
  {
    key: 'wall', label: '오해·장벽', icon: '🌩️', beat: '블랙 모먼트',
    faces: [
      '그가 처음부터 가문의 복수를 위해 접근했다는 의심이 폭발한다',
      '원작의 정해진 결말대로, 그가 다른 여자와 약혼을 발표한다',
      '죽은 줄 알았던 그의 첫사랑(혹은 정혼녀)이 살아 돌아온다',
      '신분 차이(평민과 황족)가 둘 사이를 가로막는 벽으로 드러난다',
      '회귀자임이 들켜, 그가 자신을 마녀 보듯 경계하기 시작한다',
      '그가 자신을 지키려 일부러 모진 말로 밀어낸다',
      '계약이 끝나는 날, 진심을 들킬까 봐 먼저 이별을 고한다',
      '빙의한 몸이 그가 가장 증오하던 사람임이 밝혀진다',
      '둘을 갈라놓으려는 가문(혹은 황실)의 거센 반대에 부딪힌다',
      '연적이 결정적인 거짓 증거를 흘려, 그가 자신을 의심한다',
      '오해를 풀 단 한 통의 편지가 끝내 전해지지 않는다',
      '그의 비밀(이중 신분·숨긴 권력)이 최악의 타이밍에 폭로된다',
      '전쟁(혹은 정변)이 터져 둘은 적과 적의 진영으로 갈린다',
      '시한부(혹은 저주)의 진실이 드러나 둘의 미래를 위협한다',
      '"널 사랑한 적 없다"는 그의 차가운 거짓말에 마음이 무너진다',
      '집안을 살리기 위한 정략결혼이 코앞으로 닥쳐온다',
      '그가 자신을 기억하지 못하는 사고(기억상실)가 일어난다',
      '자신의 정체(가짜 신분·숨긴 과거)가 들통날 위기에 처한다',
      '그가 자신을 향한 마음이 동정이었다고 차갑게 선을 긋는다',
      '회귀로 바꾼 미래가 더 큰 비극을 부른 듯한 죄책감에 빠진다',
      '그를 살리려면 자신이 영영 그의 기억에서 사라져야 한다는 조건이 걸린다',
      '둘만 알던 비밀이 가십이 되어 온 사교계에 퍼진다',
      '그의 부모(혹은 후견인)가 거액을 내밀며 헤어지라 종용한다',
      '자신이 그를 이용해 복수하려 했던 과거가 뒤늦게 들통난다',
      '오랜 가문의 원수 관계가 둘의 사랑을 죄로 만든다',
      '결정적 순간 그가 자신을 의심해, 쌓아 온 믿음이 무너진다',
      '먼 곳으로의 발령(혹은 유배)이 둘을 물리적으로 떼어 놓는다',
      '그가 가문을 지키려 다른 정혼을 받아들이겠다 선언한다',
      '서로를 위한 거짓말이 겹쳐, 둘 다 상대가 변심했다고 믿는다',
      '그가 진짜 정체를 숨긴 적국의 첩자였음이 드러난다',
      '출생의 비밀이 드러나, 둘 사이가 금지된 관계가 된다',
      '신탁이 둘의 결합을 "재앙"이라 경고해 모두가 등을 돌린다',
      '그의 약혼녀가 임신했다는 거짓 소문이 둘을 갈라놓는다',
      '회귀 전 기억 속 비극이, 같은 모습으로 다시 반복될 조짐을 보인다',
      '명예를 지키려면 그를 부정해야만 하는 선택의 기로에 선다',
      '그가 자신을 잊으려 일부러 먼 전장으로 떠난다',
      '둘의 다정한 순간이 악의적으로 편집되어 온 세상에 퍼진다',
      '신성력이 폭주해, 곁에 있으면 그를 해치게 된다는 사실을 안다',
      '그가 황위(혹은 가문)를 위해 정략혼을 받아들이려 한다',
      '오래 묵힌 오해가 터져, 가장 사랑하는 순간에 가장 잔인해진다',
      '그를 향한 마음이 원작 강제력에 의한 가짜일까 봐 두려워한다',
      '연적이 황실의 권력을 등에 업고 둘 사이를 짓밟는다',
      '그가 자신을 살리려 스스로 악역을 자처하고 떠나 버린다',
      '죽은 약혼자의 그림자가 끝내 둘 사이를 짓누른다',
      '그의 진짜 신분(폐황자·적국 왕족)이 밝혀져 신분의 벽이 솟는다',
      '둘 사이를 의심한 황실이 한쪽을 멀리 보내 버린다',
      '자신이 회귀자임을 빌미로 누군가 협박을 시작한다',
      '그가 자신의 비밀을 알고도 말없이 멀어져 가는 듯하다',
      '같은 사람을 사랑하는 친우(혹은 형제)와의 사이에서 갈등이 폭발한다',
      '그를 살리는 유일한 길이 자신의 신성력을 모두 바치는 것이다',
    ],
  },
  {
    key: 'court', label: '궁중 사건', icon: '🏰', beat: '정쟁·사이다',
    faces: [
      '데뷔탕트 무도회에서 자신을 모욕한 영애를 만인 앞에서 망신 준다',
      '독이 든 찻잔을 미리 알아채고, 차를 권한 자의 정체를 폭로한다',
      '황실 다과회에서 자신을 음해하려던 음모를 거꾸로 뒤집는다',
      '연회 한복판에서 악역의 죄가 만천하에 드러나 단죄된다',
      '재판정에 홀로 서서, 자신을 모함한 증거를 하나하나 무너뜨린다',
      '황제 앞에서 자신의 결백을 입증하고, 모함한 자를 끌어내린다',
      '사교계의 비웃음을 한 번의 무도회로 반전시켜 모두를 놀라게 한다',
      '암살 시도를 역이용해, 배후의 황족을 끌어내린다',
      '정략혼을 깨려는 음모를 미리 알고, 판을 통째로 뒤집는다',
      '황후 책봉식에서, 자신을 끌어내리려던 후궁의 계략이 무너진다',
      '영지의 기근을 전생의 지식으로 해결해 백성의 신망을 얻는다',
      '상단을 일으켜 막대한 부로 가문의 빚을 단숨에 청산한다',
      '신전의 거짓 신탁을 폭로해, 부패한 대신관을 끌어내린다',
      '황태자 약혼식에서, 가짜 약혼녀의 정체가 드러나 자리가 뒤집힌다',
      '검술 대회에 출전해, 자신을 무시하던 기사들을 무릎 꿇린다',
      '독살 누명을 벗고, 진짜 독살범인 시녀를 모두 앞에서 가려낸다',
      '황실 사냥 대회에서 위기에 빠진 황제를 구해 단숨에 신임을 얻는다',
      '몰락한 가문을 디저트·향수 사업으로 사교계의 중심에 세운다',
      '회귀로 알게 된 반란의 날, 미리 손을 써 쿠데타를 막아 낸다',
      '연회에서 자신을 능멸한 황자에게, 우아한 한마디로 망신을 되돌려 준다',
      '황실 무도회에서 첫 춤 상대가 펑크 나자, 뜻밖의 그가 손을 내민다',
      '예언 속 아이로 공인받아, 자신을 천대하던 가문이 머리를 조아린다',
      '비밀 장부를 들이밀어, 가문을 좀먹던 횡령의 주범을 잡아낸다',
      '신성력을 처음 발현해, 죽어 가던 황태자를 모두 앞에서 살려 낸다',
      '사교계 데뷔 무대에서, 모두의 예상을 깨고 황제의 눈에 든다',
      '정혼 파기를 선언하고, 자신을 버린 약혼자에게 되레 무릎을 꿇린다',
      '독을 탄 자를 함정에 빠뜨려, 자백을 만천하에 받아 낸다',
      '황실 연회에서 자신의 진짜 혈통이 밝혀져 모두가 경악한다',
      '영지 반란을 지혜로 잠재워, 변경의 안주인으로 인정받는다',
      '거짓 소문을 퍼뜨린 영애를, 그 자리에서 증거로 침묵시킨다',
      '신전 의식 도중 진짜 성녀의 표식이 자신에게 나타난다',
      '황후의 차 모임에서 정적의 음모를 우아하게 받아쳐 무너뜨린다',
      '약혼 파혼 후, 더 높은 신분의 그가 모두 앞에서 손을 내민다',
      '가문 회의에서 차기 가주 자리를 두고 오라비들을 압도한다',
      '황실 경연(무도·시·마법)에서 우승해 단숨에 주목을 받는다',
      '자신을 죽이려던 후궁의 계략을, 황제 앞에서 거꾸로 폭로한다',
      '회귀로 미리 안 역병에 대비해, 도시를 구하고 영웅이 된다',
      '가면무도회에서 정체를 드러내, 자신을 무시하던 이들을 굴복시킨다',
      '황태자비 간택에서, 모두의 예상을 뒤엎고 최종 후보가 된다',
      '몰래 키운 인맥과 정보로, 자신을 내쫓은 가문을 압박한다',
      '연회에서 적국 사절의 무례를 외교적 기지로 되받아친다',
      '죽은 줄 알려진 황녀가 살아 돌아와, 옥좌의 방을 술렁이게 한다',
      '신검의 선택을 받아, 자신을 의심하던 기사단을 침묵시킨다',
      '독살된 선황의 진실을 밝혀, 가짜 후계자를 끌어내린다',
      '황실 무도회 한복판에서 그가 공개적으로 자신을 "내 사람"이라 선언한다',
      '음모의 증거를 쥔 채 황제에게 알현을 청해, 판을 단번에 뒤집는다',
      '사교계를 쥐락펴락하던 영애와의 설전에서 완승을 거둔다',
      '몰락 가문의 이름으로 새 작위를 받아, 모두를 깜짝 놀라게 한다',
      '회귀 전 자신을 처형한 자의 죄를, 이번엔 먼저 만천하에 고발한다',
      '신전과 황실을 모두 등에 업고, 자신을 천대하던 자들을 단죄한다',
    ],
  },
  {
    key: 'twist', label: '반전·숨은 진실', icon: '🔮', beat: '운명 전복',
    faces: [
      '천대받던 자신이 실은 사라진 황실의 적통 황녀였음이 밝혀진다',
      '그가 사실은 전생에도 자신을 사랑해 줄곧 곁을 지킨 회귀자였다',
      '자신을 죽인 줄 알았던 그가, 실은 자신을 살리려 누명을 썼던 것이다',
      '원작의 "정해진 결말"이 회귀자의 개입을 전제로 쓰인 미끼였다',
      '저주받았다던 핏줄이 실은 신의 가호를 받은 고대 혈통이었다',
      '연적인 줄 알았던 여자가, 실은 자신을 지키려던 또 다른 회귀자였다',
      '잃었던 신성력이 사실은 더 강한 힘으로 봉인되어 있던 것이다',
      '그의 집착이 복수가 아니라, 전생의 약속을 지키려는 헌신이었다',
      '빙의해 들어온 몸의 원래 주인이 자신에게 미래를 맡긴 것이었다',
      '자신을 버린 가문이, 실은 저주로부터 지키려 멀리 보낸 것이었다',
      '예언 속 "재앙의 아이"가 실은 세계를 구할 열쇠였다',
      '그가 다른 여자와 약혼한 건, 자신을 위험에서 빼내려는 위장이었다',
      '죽은 줄 알았던 어머니가 살아 황실 어딘가에 숨어 있었다',
      '회귀 전 자신을 처형한 명령서가, 사실은 위조된 것이었다',
      '그가 적국의 첩자가 아니라, 두 나라의 평화를 위한 이중 첩자였다',
      '자신의 평범한 능력이 실은 모든 마법을 무효화하는 절대 권능이었다',
      '신탁의 진짜 의미가 정반대였음이 마지막에야 드러난다',
      '그를 죽음으로 이끈 운명을, 회귀자인 자신이 이미 비틀어 놓았다',
      '계약 결혼 상대가 사실 어릴 적 자신을 구해 준 그 소년이었다',
      '악역인 줄 알았던 자신이 원작의 진짜 주인공이었다',
      '그가 줄곧 모은 정보가 자신을 파멸이 아닌 행복으로 이끌기 위함이었다',
      '폐위된 황후의 딸이라는 낙인이, 실은 차기 황위 계승권의 증표였다',
      '자신을 음해하던 시녀가, 사실 더 큰 흑막에게 조종당하고 있었다',
      '전생의 죽음이 사고가 아니라, 그가 막지 못한 음모였음이 밝혀진다',
      '잊혀진 첫째 황녀라는 신분이 실은 황실의 가장 깊은 비밀이었다',
      '그가 평생 찾던 "운명의 사람"이 처음부터 자신이었음이 드러난다',
      '자신이 바꾼 미래가, 모두를 살리는 단 하나의 결말이었다',
      '저주의 진짜 해법이 사랑이었고, 그 사랑이 이미 시작돼 있었다',
      '원수 가문이라 믿었던 그의 가문이, 실은 자신의 가문을 지켜 온 은인이었다',
      '환생 전 자신이 이 세계를 창조한 작가(혹은 신)였음이 밝혀진다',
      '그가 줄곧 차갑게 군 이유가, 곁에 두면 자신이 위험해지기 때문이었다',
      '자신에게 보이던 호감도 게이지가, 사실은 운명의 붉은 실이었다',
      '죽은 약혼자가 실은 살아서, 자신을 지키려 신분을 숨기고 있었다',
      '신전이 숨긴 진실은, 진짜 성녀가 줄곧 자신이었다는 것이다',
      '그의 정혼녀였던 여자가, 사실 그의 잃어버린 누이였다',
      '회귀의 대가로 잃은 줄 알았던 기억이, 결정적 순간 모두 돌아온다',
      '자신을 처형하려던 황제가, 실은 협박당하던 허수아비였다',
      '몰락한 가문의 빚이, 사실 누군가 자신을 옭아매려 꾸민 함정이었다',
      '그가 평생 모은 재산이 전부 자신의 안전을 위한 준비였다',
      '예언서의 마지막 장이 찢겨 있었고, 거기 적힌 결말은 해피엔딩이었다',
      '자신을 노린 암살의 배후가, 가장 믿었던 가족이었음이 드러난다',
      '그가 회귀 전 마지막으로 남긴 말이 "다시 만나자"였음을 기억해 낸다',
      '신성력을 잃은 게 아니라, 더 큰 운명을 위해 신이 거둬 간 것이었다',
      '자신의 빙의가 우연이 아니라, 이 세계가 부른 필연이었다',
      '그가 적이라 믿었던 가문이, 실은 자신의 진짜 혈육이었다',
      '회귀 전 자신을 배신한 줄 알았던 친구가, 끝까지 편이었음이 밝혀진다',
      '저주받은 짐승의 모습 뒤에, 자신이 찾던 그 사람이 있었다',
      '원작 강제력에 맞선 자신의 선택이, 새로운 운명을 창조해 낸다',
      '잃어버린 줄 알았던 어린 시절 기억 속에, 이미 그와의 약속이 있었다',
      '자신이 살린 단 한 사람이, 결국 온 세계를 구할 열쇠가 된다',
    ],
  },
]

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

// 천 단위 콤마(한국어 로캘)
const fmt = (n: number) => n.toLocaleString('ko-KR')

// 전체(모든 슬롯) 조합수 — "총 조합" 표기용. 도시에 목표: 1조+ 지향.
const TOTAL_COMBOS = SLOTS.reduce((acc, s) => acc * s.faces.length, 1)

// 큰 수를 한국어 단위(조/억/만)로 읽기 쉽게.
function humanCount(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(n >= 1e13 ? 0 : 1).replace(/\.0$/, '') + '조+'
  if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, '') + '억+'
  if (n >= 1e4) return (n / 1e4).toFixed(0) + '만+'
  return fmt(n)
}

// 활성 슬롯들의 조합 가짓수.
function comboCount(activeKeys: string[]): number {
  return activeKeys.reduce((acc, k) => {
    const s = SLOTS.find((x) => x.key === k)
    return acc * (s ? s.faces.length : 1)
  }, 1)
}

// 굴린 결과들을 "프롤로그 → 각성 → 엮임 → 블랙 모먼트 → 사이다 → 운명 전복" 흐름의 로판 전개 단락으로 엮는다.
function compose(by: Record<string, string>): string {
  const awaken = by.awaken, status = by.status, lead = by.lead
  const bond = by.bond, wall = by.wall, court = by.court, twist = by.twist
  const parts: string[] = []
  if (awaken) parts.push(`${awaken}`)
  if (status) parts.push(`이번 생의 자리는 ${status}`)
  if (lead) parts.push(`그런 그녀 앞에 ${lead}가 나타난다`)
  if (bond) parts.push(`두 사람은 ${bond}`)
  if (wall) parts.push(`그러나 ${wall}. 관계는 최저점으로 곤두박질친다`)
  if (court) parts.push(`절망 끝에 그녀는 ${court}`)
  if (twist) parts.push(`그리고 마침내 ${twist}`)
  if (!parts.length) return ''
  return parts.map((p) => p.replace(/[.。]$/, '')).join('. ') + '.'
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface Saved { id: string; text: string; note: string; slots: string; rows: string }

export default function RomfanSignature({ payload }: { payload?: Record<string, unknown> }) {
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

  // 토스트 자동 해제 + 언마운트 정리
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 2000)
    return () => window.clearTimeout(t)
  }, [toast])

  // 복사 피드백 자동 해제 + 정리
  useEffect(() => {
    if (!copiedKey) return
    const t = window.setTimeout(() => { if (mounted.current) setCopiedKey('') }, 1500)
    return () => window.clearTimeout(t)
  }, [copiedKey])

  // 굴림 애니메이션 자동 해제 + 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 380)
    return () => window.clearTimeout(t)
  }, [rolling, results])

  const generate = () => {
    const my = ++nonce.current
    setRolling(true)
    setResults((prev) => {
      if (my !== nonce.current) return prev
      const next: Record<string, string> = { ...prev }
      active.forEach((k) => {
        if (locked[k] && prev[k]) return // 잠긴 슬롯 유지
        const s = SLOTS.find((x) => x.key === k)
        if (!s) return
        let f = pick(s.faces)
        if (f === prev[k] && s.faces.length > 1) f = pick(s.faces) // 연속 중복 완화
        next[k] = f
      })
      return next
    })
  }

  const toggleSlot = (key: string) => {
    setActive((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev // 최소 1개 유지
        return prev.filter((k) => k !== key)
      }
      return SLOTS.filter((s) => prev.includes(s.key) || s.key === key).map((s) => s.key)
    })
  }

  const toggleLock = (key: string) => setLocked((prev) => ({ ...prev, [key]: !prev[key] }))

  const rolledList = active
    .map((k) => ({ slot: SLOTS.find((s) => s.key === k)!, face: results[k] }))
    .filter((r) => r.slot && r.face) as { slot: Slot; face: string }[]

  const by: Record<string, string> = {}
  rolledList.forEach((r) => { by[r.slot.key] = r.face })
  const story = compose(by)
  const hasResults = rolledList.length > 0
  const activeCombos = comboCount(active)

  const slotsLine = () => rolledList.map((r) => r.face).join(' · ')
  const rowsText = () => rolledList.map((r) => `${r.slot.icon} ${r.slot.label}: ${r.face}`).join('\n')

  const copy = (key: string, text: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text)
      .then(() => setCopiedKey(key))
      .catch(() => setToast('이 환경에서는 복사가 지원되지 않습니다.'))
  }

  // 스니펫 라이브러리 저장 — 글감 라이브러리에 로판 전개를 스니펫으로(여러 도구 공유).
  const saveSnippet = () => {
    if (!story) return
    addToLibrary('snippets', {
      text: `[로판 전개] ${story}`,
      source: '로판 시그니처 생성기',
      tags: ['글감', '로맨스판타지', '로판', '전개', ...rolledList.map((r) => r.slot.label)],
    })
    setToast('글감 라이브러리(스니펫)에 저장했습니다.')
  }

  // 프로젝트 자료에 추가 — 로판 전개 한 편을 〈로판 전개〉 폴더 메모로.
  const toProject = () => {
    if (!story) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const rows = rolledList
      .map((r) => `<p><b>${escHtml(r.slot.icon)} ${escHtml(r.slot.label)} <span style="color:#999;">(${escHtml(r.slot.beat)})</span>:</b> ${escHtml(r.face)}</p>`)
      .join('')
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.8;"><b>👑 ${escHtml(story)}</b></p>`,
      `<hr/>`,
      rows,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '로판 전개',
      title: `👑 ${slotsLine().slice(0, 48) || '로판 전개'}`,
      bodyHtml,
      synopsis: story.slice(0, 120),
      meta: { 장르: '로맨스판타지', 슬롯: rolledList.map((r) => r.slot.label).join(', ') },
    })
    setToast(id ? '프로젝트 자료 〈로판 전개〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 보관함에 담기
  const stash = () => {
    if (!story) return
    setSaved((prev) => [{
      id: 'sv_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4).toString(36),
      text: story, note: '', slots: slotsLine(), rows: rowsText(),
    }, ...prev])
    setToast('보관함에 담았습니다.')
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
  // 보관 항목을 프로젝트 자료로
  const savedToProject = (s: Saved) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const rows = s.rows.split('\n').filter(Boolean).map((line) => `<p>${escHtml(line)}</p>`).join('')
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.8;"><b>👑 ${escHtml(s.text)}</b></p>`,
      s.note ? `<p>📝 ${escHtml(s.note)}</p>` : '',
      `<hr/>`, rows,
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '로판 전개',
      title: `👑 ${s.slots.slice(0, 48) || '로판 전개'}`,
      bodyHtml, synopsis: s.text.slice(0, 120), meta: { 장르: '로맨스판타지' },
    })
    setToast(id ? '프로젝트 자료 〈로판 전개〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }
  const tabBtn = (on: boolean): React.CSSProperties => ({ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' })

  return (
    <div style={wrap}>
      <div style={hint}>
        <Emoji e="👑" /> <b>회빙환 · 신분 · 남주 유형 · 계약/오해 · 궁중 사건 · 반전</b>을 무작위로 조합해
        〈프롤로그(죽음·파멸) → 회빙환 각성 → 엮임 → 블랙 모먼트 → 공개 망신 역전 → 운명 전복 해피엔딩〉의
        로맨스판타지 전개 한 편을 만듭니다. 마음에 드는 슬롯은 <Emoji e="🔒" />로 고정하고 나머지만 다시 생성하세요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'} style={tabBtn(tab === 'forge')}><Emoji e="👑" /> 생성기</button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'} style={tabBtn(tab === 'saved')}><Emoji e="⭐" /> 보관함 ({saved.length})</button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>
          총 조합 약 <b style={{ color: 'var(--accent)' }}>{humanCount(TOTAL_COMBOS)}</b>
        </span>
      </div>

      {tab === 'forge' && (
        <>
          {/* 슬롯 on/off 칩 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SLOTS.map((s) => {
              const on = active.includes(s.key)
              return (
                <button key={s.key} className="minibtn" onClick={() => toggleSlot(s.key)} aria-pressed={on}
                  title={`${s.label} — 비트: ${s.beat}`}
                  style={{ opacity: on ? 1 : 0.5, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                  <Emoji e={s.icon} /> {s.label}{on ? '' : ' +'}
                </button>
              )
            })}
          </div>

          {/* 슬롯 결과들 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {active.map((k) => {
              const s = SLOTS.find((x) => x.key === k)!
              const face = results[k]
              const isLocked = !!locked[k]
              return (
                <div key={k} style={{ ...card, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-10deg) scale(1.15)' : 'none' }}><Emoji e={s.icon} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {s.label} <span style={{ opacity: 0.7 }}>· {s.beat}</span>
                      <span style={{ marginLeft: 6, opacity: 0.6 }}>({s.faces.length}종)</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: face ? 'var(--text)' : 'var(--muted)' }}>
                      {face ? (rolling && !isLocked ? '…' : face) : '— 생성해 주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => face && copy('row-' + k, `${s.label}: ${face}`)} disabled={!face} title="이 슬롯 복사" style={{ flexShrink: 0 }}>
                    {copiedKey === 'row-' + k ? '✓' : <Emoji e="📋" />}
                  </button>
                  <button className="minibtn" onClick={() => toggleLock(k)} title={isLocked ? '고정 해제' : '이 슬롯 고정'} style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 조합 전개 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Emoji e="👑" /> 로판 전개
              <span style={{ flex: 1 }} />
              <button className="minibtn" onClick={() => copy('story', story)} disabled={!hasResults} title="전개 복사">{copiedKey === 'story' ? <>✓ 복사됨</> : <Emoji e="📋" />}</button>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.65, color: hasResults ? 'var(--text)' : 'var(--muted)' }}>{story || '슬롯을 생성하면 한 편의 로판 전개로 엮어 드립니다.'}</div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 140 }} onClick={generate}><Emoji e="👑" /> 생성 / 다시 굴리기</button>
            <button className="minibtn" onClick={stash} disabled={!hasResults}><Emoji e="⭐" /> 보관</button>
            <button className="minibtn" onClick={saveSnippet} disabled={!hasResults}><Emoji e="📚" /> 글감 저장</button>
          </div>

          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            선택한 슬롯 조합 약 <b style={{ color: 'var(--accent)' }}>{humanCount(activeCombos)}</b>가지 ({fmt(activeCombos)}). <Emoji e="🔒" />로 고정한 슬롯은 다시 굴려도 유지됩니다.
          </div>

          {/* 연계 */}
          <div className="linkbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
            <button className="linkbtn" onClick={toProject} disabled={!hasResults || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '현재 로판 전개를 프로젝트 자료 〈로판 전개〉 폴더에 추가'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('character-forge', { genre: '로맨스판타지' })} title="여주·남주 인물 빚기"><Emoji e="🧑" /> 인물 빚기</button>
            <button className="linkbtn" onClick={() => openToolLinked('romance-signature', { genre: '로맨스판타지' })} title="설렘·관계 전개 시그니처"><Emoji e="💞" /> 로맨스 시그니처</button>
            <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck', { genre: '로맨스판타지' })} title="관계를 흔들 반전 카드 뽑기"><Emoji e="🃏" /> 반전 카드덱</button>
            <button className="linkbtn" onClick={() => openToolLinked('emotion-arc', { genre: '로맨스판타지' })} title="감정 곡선 설계"><Emoji e="📈" /> 감정 곡선</button>
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐" /></div>
              보관한 전개가 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성기에서 <Emoji e="⭐" /> 보관을 눌러 마음에 드는 로판 전개를 모아 보세요.</span>
            </div>
          )}
          {saved.map((s, i) => (
            <div key={s.id} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.slots}</span>
                <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">▼</button>
                <button className="minibtn" onClick={() => copy('sv-' + s.id, s.text + (s.note ? `\n📝 ${s.note}` : ''))} title="복사">{copiedKey === 'sv-' + s.id ? '✓' : <Emoji e="📋" />}</button>
                <button className="linkbtn" onClick={() => savedToProject(s)} disabled={!hasProjectBridge()} title="프로젝트 자료에 추가"><Emoji e="📄" /></button>
                <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑" /></button>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.6 }}>{s.text}</div>
              <textarea value={s.note} onChange={(e) => setNote(s.id, e.target.value)} placeholder="이 전개를 내 작품에 어떻게 쓸지 메모…" rows={2}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }} />
            </div>
          ))}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>조합은 출발점일 뿐입니다. 같은 전개라도 내 여주의 능력(미래 지식·마법·경영)·남주의 "온리 유"·세계관(서양 제국풍·동양 후궁·게임 속 세계)에 맞춰 자유롭게 비틀어 보세요. 고구마는 짧게, 사이다는 확실히.</div>
    </div>
  )
}
