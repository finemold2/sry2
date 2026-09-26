// 인물 갈등 매트릭스 생성기 — 인물 목록을 받아, 등장인물 쌍(pair)마다
//  갈등 유형 × 원인 × 표출 방식(+ 판돈 + 추이) 슬롯을 무작위로 조합해
//  "누가-누구와, 무엇 때문에, 어떻게 부딪치는가"를 한 줄 긴장으로 설계해 준다.
//  쌍/슬롯별로 🔒 잠금 후 나머지만 다시 굴려 변주(조합 가짓수 표시).
//  결과를 프로젝트 자료 〈갈등〉 폴더 문서로 추가하고, 인물 관계도(relationship-map)를 함께 열 수 있다.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage 만 사용(외부 API/미디어/네트워크 불필요).
// 저작권 안전: 모든 표는 자작 한국어 텍스트. 제어문자·특수 구분자 미사용(일반 문자만).
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  addToProject, hasProjectBridge, addToLibrary, addToStash, hasStash,
  openToolLinked, useLibraryList, Emoji, emojify,
} from './linkbus'

export const meta = {
  id: 'conflict-matrix-gen',
  name: '갈등 매트릭스 생성기',
  icon: '⚔️',
  group: '구상·정리',
  intro: '인물 목록을 넣으면 쌍마다 갈등 유형·원인·표출 방식을 조합해 관계 긴장을 설계합니다',
  w: 720,
  h: 680,
}

const LS = 'sry:tool:conflict-matrix-gen'

// ───────────────────────── 슬롯(갈등의 다섯 축) ─────────────────────────
// 각 슬롯은 한 쌍의 갈등을 이루는 한 축. faces = 그 축의 후보 표(자작·풍부).
interface Slot { key: string; label: string; icon: string; desc: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'type', label: '갈등 유형', icon: '⚔️', desc: '두 사람이 어떤 종류로 부딪치는가',
    // ⚠ 모든 항목은 '명사구'(주어 자리에 들어가도 어색하지 않은 종결되지 않은 표현)로 통일.
    faces: [
      '가치관의 정면충돌',
      '권력과 주도권 다툼',
      '사랑을 둘러싼 삼각 긴장',
      '과거의 빚과 복수',
      '신뢰가 깨진 배신의 골',
      '서로 다른 목표가 부딪치는 이해 충돌',
      '오해에서 비롯된 반목',
      '경쟁과 질투의 라이벌 관계',
      '보호와 통제 사이의 줄다리기',
      '진실을 두고 갈리는 폭로전',
      '책임을 떠넘기는 비난의 악순환',
      '세대 차이에서 오는 단절',
      '계급·신분 차이가 만든 벽',
      '이념과 신념의 대립',
      '생존 자원을 둘러싼 다툼',
      '명예와 자존심의 충돌',
      '자유와 의무 사이의 갈림',
      '소유와 집착이 부른 마찰',
      '서로를 향한 죄책감의 응어리',
      '도와주려다 어긋난 선의의 비극',
      '믿음과 의심이 엇갈리는 신뢰의 균열',
      '용서와 응징 사이의 줄타기',
      '진심과 거짓을 가리려는 진위 다툼',
      '약속과 변심이 부딪치는 신의의 시험',
      '의리와 이익이 충돌하는 선택의 기로',
      '돌봄과 간섭이 뒤엉킨 애정의 과잉',
      '독립과 의존이 맞서는 거리의 문제',
      '추억과 현실이 어긋나는 인식의 격차',
      '정의와 현실의 무게가 다른 신념의 마찰',
      '재능과 노력을 두고 갈리는 인정 투쟁',
      '비밀과 폭로가 맞부딪치는 은폐 전쟁',
      '헌신과 배신이 교차하는 마음의 채무',
      '자존심이 부딪치는 굽힘 없는 기싸움',
      '기대와 실망이 쌓여 가는 어긋난 사랑',
      '소유와 자유를 둘러싼 구속의 줄다리기',
      '진실과 침묵 사이의 양심의 갈림',
      '복종과 반항이 맞서는 위계의 균열',
      '동정과 자존이 부딪치는 도움의 역설',
      '명분과 실리가 갈라지는 노선 다툼',
      '연민과 두려움이 뒤섞인 거리 두기',
      '책임 소재를 둘러싼 끝없는 공방',
      '우정과 사랑 사이에서 흔들리는 경계',
      '과거의 죄와 현재의 평온이 부딪치는 청산',
      '꿈과 생계가 충돌하는 현실의 압박',
      '진영과 양심이 갈라서는 입장의 분열',
      '보상과 처벌을 둘러싼 응보의 다툼',
      '서로 다른 기억이 만든 진실의 분열',
      '의무와 욕망이 맞서는 내면의 전선',
      '권위와 자유의지가 부딪치는 통제의 벽',
      '동경과 열등감이 뒤엉킨 비교의 늪',
      '약속된 미래와 변해 버린 마음의 괴리',
      '구원과 파멸을 가르는 선택의 무게',
      '겉과 속이 다른 위선과 진심의 대결',
      '집착과 체념이 맞서는 미련의 줄다리기',
      '신뢰 회복과 처벌 요구가 충돌하는 화해의 조건',
      '서열과 평등이 부딪치는 자리의 다툼',
      '가족이라는 굴레와 개인의 삶의 충돌',
      '진심 어린 충고와 받아들이지 못함의 어긋남',
      '복수의 정당함과 용서의 부름이 갈리는 윤리',
      '경계와 호의가 뒤섞인 의심의 거리',
      '버림과 매달림이 맞서는 이별의 줄다리기',
      '명예 회복과 진실 은폐가 충돌하는 체면 싸움',
      '도움과 빚짐 사이의 미묘한 권력 관계',
      '오해의 누적이 만든 돌이킬 수 없는 골',
      '정의 실현과 자기 보신이 부딪치는 양심전',
      '사랑의 방식이 달라 어긋나는 마음의 온도차',
      '지난날의 영광과 몰락의 현실이 부딪치는 자존심',
      '진실의 추적과 은폐의 방어가 맞서는 두뇌 싸움',
      '헌신의 강요와 거부가 충돌하는 관계의 무게',
      '연대와 배신이 갈리는 동지애의 시험',
      '용기와 비겁이 부딪치는 결단의 순간',
      '믿어 준 만큼 커지는 실망의 그림자',
      '주는 사랑과 받기만 하는 마음의 불균형',
      '과거를 묻으려는 자와 들추려는 자의 대치',
      '책임의 회피와 추궁이 맞서는 진상 규명',
      '대의와 사사로운 정 사이의 갈등',
      '자기희생과 자기 보호가 부딪치는 선택',
      '서로를 길들이려는 두 고집의 충돌',
      '진실한 사과와 받지 못한 용서의 어긋남',
      '권리 주장과 양보 요구가 맞서는 분배의 다툼',
      '믿음의 강요와 의심의 권리가 부딪치는 신뢰전',
      '돌아오라는 부름과 떠나려는 결심의 대치',
      '보호한다는 명분과 자유의 박탈이 충돌하는 통제',
      '재능의 그늘에 가려진 노력의 분노',
      '같은 목표를 향한 두 방식의 노선 충돌',
      '드러난 약점을 둘러싼 연민과 경멸의 갈림',
      '운명과 의지가 부딪치는 거역의 시도',
      '사랑이라 믿었던 소유욕의 정체를 둔 다툼',
      '진심을 알아주지 않는 데서 오는 외로움의 골',
      '정직한 패배와 비겁한 승리가 부딪치는 명분',
      '오래된 은혜와 새로운 원한이 충돌하는 정리',
      '경쟁자이자 동료라는 모순된 관계의 긴장',
      '지켜야 할 것과 버려야 할 것이 갈리는 결단',
      '서로의 상처를 건드리는 말의 칼날 다툼',
    ],
  },
  {
    key: 'cause', label: '원인', icon: '🌱', desc: '무엇이 그 갈등의 불씨인가',
    // ⚠ 모든 항목은 '명사구'(불씨는 ○○ 형태로 자연스러운 표현).
    faces: [
      '오래 묵힌 한마디 사과의 부재',
      '누구에게도 말 못 한 비밀',
      '갈라진 유산과 재산 분배',
      '한쪽만 기억하는 옛 약속',
      '거짓으로 시작된 첫 만남',
      '서로를 위한다는 착각',
      '한 사람을 향한 두 마음',
      '되돌릴 수 없는 한 번의 선택',
      '바뀌어 버린 신념과 변절',
      '인정받지 못한 노력과 소외감',
      '대신 짊어진 죄와 누명',
      '한쪽이 숨긴 병 혹은 시한',
      '가문·조직의 뿌리 깊은 원한',
      '잘못 전달된 말과 어긋난 정보',
      '버림받았다는 오래된 상처',
      '같은 자리를 향한 야망',
      '지켜 주지 못했던 그날의 무력함',
      '서로 다른 진실을 믿게 된 분기',
      '한쪽의 거듭된 거짓말',
      '말하지 않아 곪아 버린 기대',
      '서로의 가족이 얽힌 과거사',
      '한 번의 배신이 남긴 트라우마',
      '돌려받지 못한 빌려준 마음',
      '끝내 전하지 못한 진심',
      '잘못된 시기에 마주친 인연',
      '편들어 주지 않았던 결정적 순간',
      '한쪽만 치른 희생의 무게',
      '오래 감춰 온 출생의 비밀',
      '엇갈린 채 굳어 버린 첫인상',
      '약속 시간에 끝내 오지 않은 사람',
      '대신 떠안은 누군가의 빚',
      '말 한마디로 갈라진 두 운명',
      '되풀이된 거절이 쌓은 거리',
      '믿었던 사람에게 들킨 약점',
      '한순간의 충동이 부른 사고',
      '서로 다르게 기억하는 그날의 진실',
      '돌이킬 수 없이 새어 나간 비밀',
      '한쪽이 몰래 내린 큰 결정',
      '뒤늦게 밝혀진 오래된 호의의 정체',
      '아무도 책임지지 않은 한 사람의 죽음',
      '갚을 수 없을 만큼 커진 은혜',
      '드러나지 않은 채 곪은 질투',
      '서로를 향한 기대치의 어긋남',
      '한쪽이 일방적으로 끊어 버린 연락',
      '진심을 의심받은 데서 시작된 균열',
      '같은 사람을 두고 벌인 침묵의 경쟁',
      '지난날 외면했던 도움의 손길',
      '대물림된 가문의 묵은 죄',
      '한쪽이 먼저 깨 버린 신의',
      '잘못을 인정하지 않는 완고함',
      '뒤바뀐 처지가 만든 열등감',
      '누군가를 지키려다 저지른 더 큰 잘못',
      '오래 참아 온 인내의 폭발',
      '한쪽의 성공이 드리운 그림자',
      '받아들여지지 못한 진심 어린 충고',
      '서로의 세계가 너무 달랐던 거리',
      '한 번 무너진 뒤 회복되지 못한 믿음',
      '말하지 못한 사랑이 변질된 미움',
      '명예를 위해 묻어 버린 진실',
      '돌아오겠다던 사람의 긴 부재',
      '대신 뒤집어쓴 누명의 억울함',
      '몰래 진행된 거래의 뒷거래',
      '한쪽이 끝내 놓지 못한 옛사랑',
      '서로 다른 정의를 믿게 된 신념의 분기',
      '아껴 준 만큼 깊어진 실망',
      '드러난 거짓말 뒤의 또 다른 거짓',
      '지켜야 했던 약속을 어긴 그 밤',
      '한쪽이 감춘 진짜 의도',
      '오래된 우정 사이에 끼어든 이해관계',
      '돌이킬 수 없는 말실수의 여파',
      '한 사람만 알고 있던 결정적 진실',
      '서로를 보호하려는 거짓말의 충돌',
      '버림받은 기억이 만든 방어적 태도',
      '인정받고 싶은 마음이 부른 무리수',
      '한쪽이 강요한 일방적 희생',
      '잊으려 해도 떠오르는 그날의 장면',
      '신뢰를 저버린 작은 배신의 누적',
      '대가 없이 베푼 호의에 대한 부담',
      '서로 다른 속도로 식어 간 마음',
      '끝내 사과받지 못한 옛 상처',
      '한쪽의 침묵이 키운 오해',
      '경쟁심이 우정을 갉아먹은 시간',
      '지나친 간섭이 만든 반발심',
      '한 번의 거짓 증언이 남긴 앙금',
      '돌려주지 못한 약속의 무게',
      '서로의 약점을 알아 버린 위태로움',
      '한쪽만 변해 버린 가치관',
      '오래도록 표현하지 못한 고마움',
      '들키고 싶지 않았던 부끄러운 과거',
      '대를 이어 전해진 미움의 씨앗',
    ],
  },
  {
    key: 'manifest', label: '표출 방식', icon: '🔥', desc: '갈등이 겉으로 어떻게 드러나는가',
    // ⚠ 모든 항목은 '…로/…며' 부사구 형태(갈등은 ○○ 드러난다 에 맞춤).
    faces: [
      '냉랭한 침묵과 회피로',
      '날카로운 말다툼과 폭언으로',
      '뒤에서 흠집 내는 험담으로',
      '겉으론 웃으며 속으로 칼을 가는 위선으로',
      '대놓고 맞서는 정면 대결로',
      '제3자를 끌어들인 편 가르기로',
      '눈물과 호소로 죄책감을 자극하며',
      '물리적 충돌과 폭력으로',
      '경쟁으로 끝없이 증명하려 들며',
      '소중한 것을 인질 삼은 협박으로',
      '의도적인 무시와 따돌림으로',
      '비밀을 폭로하겠다는 위협으로',
      '도움을 빌미로 한 통제로',
      '과장된 친절 뒤에 숨긴 거리감으로',
      '재산·지위를 무기로 한 압박으로',
      '서로의 약점을 들춰내는 진흙탕으로',
      '말없이 떠나 버리는 단절로',
      '대리인을 내세운 간접 공격으로',
      '공개 석상에서의 망신주기로',
      '끝없이 곱씹는 원망과 자기연민으로',
      '비꼬는 농담에 가시를 숨긴 빈정거림으로',
      '눈도 마주치지 않는 무언의 거부로',
      '지난 잘못을 끄집어내는 되새김질로',
      '주변 사람을 줄 세우는 세 불리기로',
      '돈과 선물로 마음을 사려는 회유로',
      '울음 끝에 매달리는 감정적 호소로',
      '차갑게 선을 긋는 사무적인 태도로',
      '소문을 흘려 평판을 깎는 음해로',
      '약속을 일부러 어기는 보복으로',
      '면전에서 쏘아붙이는 직설로',
      '뒤늦게 후회하며 번복하는 변덕으로',
      '상대를 떠보는 시험과 함정으로',
      '겉으론 화해한 척하는 가식으로',
      '연락을 끊었다 잇기를 반복하는 밀당으로',
      '제 잘못은 덮고 남 탓만 하는 책임 전가로',
      '침묵시위로 상대를 지치게 하며',
      '과거를 들먹이며 죄책감을 씌우는 가스라이팅으로',
      '아랫사람을 시켜 대신 부딪치게 하며',
      '권위를 내세워 찍어 누르는 강압으로',
      '동정을 사려는 피해자 행세로',
      '논리로 몰아붙이는 말꼬리 잡기로',
      '관계를 끊겠다는 으름장으로',
      '상대가 아끼는 사람을 끌어들이며',
      '겉으론 양보하며 속으론 계산하는 술수로',
      '한숨과 표정으로 불만을 흘리며',
      '편지나 메시지로 길게 따져 묻는 추궁으로',
      '서로 다른 자리에서 같은 사람을 헐뜯으며',
      '맞불을 놓듯 똑같이 되갚는 복수로',
      '겉도는 형식적인 대화로',
      '약점을 빌미로 한 은근한 협박으로',
      '모임에서 일부러 빼놓는 따돌림으로',
      '말끝마다 비교하며 깎아내리는 멸시로',
      '도움을 거절당했다는 토라짐으로',
      '진심을 숨긴 차가운 예의로',
      '뒤끝 있는 침묵 끝의 폭발로',
      '상대의 호의를 일부러 오해하며',
      '제삼자 앞에서 망신을 주는 폭로로',
      '먼저 손 내밀길 기다리는 자존심 싸움으로',
      '겉으론 걱정하며 속으론 통제하는 간섭으로',
      '눈물 대신 차가운 비웃음으로',
      '지난 은혜를 들먹이는 빚 독촉으로',
      '면담을 거부하고 글로만 응대하며',
      '주변에 미리 변명을 깔아 두는 선수 치기로',
      '맞장구치다 등 뒤에서 칼을 꽂으며',
      '상대의 실수를 기다렸다는 듯 물고 늘어지며',
      '관계를 무기 삼은 침묵의 형벌로',
      '겉으론 의연한 척 속으로 무너지며',
      '먼저 사과하면 지는 거라는 고집으로',
      '서로의 가족까지 끌어들인 확전으로',
      '거짓 화해 뒤 다시 도지는 앙금으로',
      '한쪽이 일방적으로 통보하는 결별 선언으로',
      '비밀을 쥐고 흔드는 약점 잡기로',
      '겉으론 무관심한 척 속으론 주시하며',
      '말 대신 행동으로 보여 주는 무언의 시위로',
      '주변의 동정을 모아 여론을 만들며',
      '상대의 선의를 시험하는 떠보기로',
      '날을 세운 채 형식만 갖춘 협상으로',
      '오래 참다 한 번에 쏟아내는 폭발로',
      '체면 때문에 겉으로만 웃는 가면으로',
      '말끝을 흐리며 핵심을 피하는 회피로',
      '약속을 거듭 미루는 무언의 거절로',
      '겉으론 응원하며 속으론 발목 잡는 견제로',
      '상대의 호의를 시험에 들게 하는 떠보기로',
      '냉소 어린 칭찬으로 깎아내리는 비아냥으로',
      '돌아선 등으로 말없이 보여 주는 거부로',
      '제 편을 모아 수적으로 압박하는 위세로',
      '지난 약속을 빌미로 한 끈질긴 추궁으로',
    ],
  },
  {
    key: 'stakes', label: '판돈', icon: '🎯', desc: '이 다툼에서 무엇을 잃거나 얻는가',
    // ⚠ 모든 항목은 '명사구'(걸린 것은 ○○ 형태).
    faces: [
      '둘 중 하나만 가질 수 있는 자리',
      '되돌릴 수 없는 한 사람의 목숨',
      '무너지기 직전의 신뢰',
      '가문·조직 전체의 운명',
      '평생을 바친 명예',
      '사랑하는 단 한 사람',
      '숨겨 온 진실의 폭로 여부',
      '다시는 못 볼지도 모를 마지막 기회',
      '함께 지켜 온 약속의 존속',
      '한쪽의 자유 혹은 구속',
      '두 사람을 잇던 마지막 끈',
      '세상에 알려질 거짓의 정체',
      '서로가 쌓아 온 모든 것',
      '아이·약자의 미래',
      '용서받을 수 있는 마지막 가능성',
      '복수를 완성할 단 한 번의 순간',
      '오래 지켜 온 둘만의 비밀',
      '한 사람의 평생을 좌우할 평판',
      '겨우 되찾은 마음의 평온',
      '다시 시작할 수 있는 두 번째 기회',
      '끝까지 지키려던 마지막 자존심',
      '서로를 향한 남은 신뢰의 한 조각',
      '오랜 세월 쌓아 온 두 사람의 우정',
      '누군가의 결백을 증명할 단 하나의 증거',
      '대를 이어 지켜 온 가문의 명운',
      '한 사람의 인생을 바꿀 결정적 선택',
      '돌아갈 수 없는 옛 관계의 복원',
      '간신히 유지되던 평화로운 일상',
      '아직 전하지 못한 진심의 마지막 기회',
      '한쪽이 평생 감춰 온 약점',
      '두 사람만 아는 과거의 진실',
      '되찾을 수 없는 잃어버린 시간',
      '서로의 자존심이 걸린 승부의 결과',
      '한 사람의 꿈과 미래 전부',
      '끝내 받아 내야 할 진심 어린 사과',
      '무너지면 다시 못 세울 마지막 믿음',
      '함께한 세월이 남긴 모든 추억',
      '누군가를 구할 수 있는 단 한 번의 기회',
      '오래 미뤄 온 화해의 마지막 문',
      '서로의 운명을 가를 한 번의 판단',
      '평생 짊어질 죄책감의 무게',
      '돌이킬 수 없는 이별 혹은 재회',
      '한쪽이 지켜야 할 소중한 사람의 안전',
      '세상에 드러나면 끝장날 치부',
      '겨우 회복한 두 사람 사이의 거리',
      '대가를 치르고서야 얻을 진실',
      '마지막까지 붙잡고 싶은 옛정',
      '서로를 향한 용서와 복수의 갈림',
      '한 사람의 명예를 건 결백',
      '잃으면 다시 못 얻을 단 한 번의 신뢰',
      '두 사람이 함께 꿈꾸던 미래',
      '끝내 지켜 내야 할 마지막 약속',
      '한쪽의 인생을 건 결단의 결과',
      '오래 감춰 둔 마음의 진실',
      '서로에게 남은 마지막 자비',
      '돌아오지 않을지 모를 한 사람의 마음',
      '평생을 걸고 쌓은 둘만의 세계',
      '누군가의 희생으로 지켜질 평화',
      '한 번 무너지면 끝인 관계의 토대',
      '진실이 밝혀질지 묻힐지의 기로',
      '서로를 알아본 단 하나의 인연',
      '되찾아야 할 빼앗긴 자리',
      '오랜 원한을 풀 마지막 매듭',
      '한쪽이 끝까지 숨기려는 비밀',
      '두 사람의 남은 신의 전부',
      '용서로 끝낼지 단죄로 끝낼지의 선택',
      '한 사람의 생사를 가를 결정',
      '돌이킬 수 없는 신뢰의 마지막 한 줌',
      '서로를 향한 마지막 진심',
      '평생 후회로 남을지 모를 한 번의 선택',
      '간신히 붙어 있던 관계의 실낱',
      '누구의 진실이 살아남을지의 승부',
      '오래 지켜 온 한 사람의 존엄',
      '다시는 오지 않을 화해의 기회',
      '서로가 끝까지 놓지 못한 미련',
      '한쪽이 평생 갚아야 할 마음의 빚',
      '진심이 닿을지 외면당할지의 갈림',
      '두 사람의 운명을 묶은 마지막 약속',
      '잃으면 영영 못 되돌릴 한 사람',
      '끝까지 지켜 낼 마지막 양심',
      '서로의 상처를 끝낼 진정한 화해',
    ],
  },
  {
    key: 'arc', label: '추이', icon: '📈', desc: '이 갈등이 어디로 흘러가는가',
    // ⚠ 모든 항목은 '종결문'(결국 이 다툼은 ○○ 형태로 끝맺음).
    faces: [
      '곪다가 한순간 폭발한다',
      '뜻밖의 화해로 매듭지어진다',
      '제3의 사건이 끼어들어 뒤집힌다',
      '한쪽의 희생으로 가라앉는다',
      '돌이킬 수 없는 파국으로 치닫는다',
      '서로를 더 깊이 이해하며 풀린다',
      '겉만 봉합한 채 불씨를 남긴다',
      '약자였던 쪽이 역전한다',
      '둘 다 잃고 나서야 끝난다',
      '진실이 드러나며 국면이 바뀐다',
      '대를 이어 다음 세대로 넘어간다',
      '거리를 둔 채 평행선으로 굳어진다',
      '한쪽이 떠나며 미완으로 남는다',
      '공통의 적 앞에서 잠시 손잡는다',
      '오해가 풀려 허무하게 끝난다',
      '복수가 또 다른 복수를 부른다',
      '시간이 흐르며 서서히 무뎌진다',
      '결정적 한마디로 단번에 갈라선다',
      '뒤늦은 사과로 가까스로 봉합된다',
      '제삼자의 중재로 어렵게 가라앉는다',
      '한쪽의 죽음으로 영영 미완에 그친다',
      '서로의 진심을 확인하며 단단해진다',
      '겉으론 끝났으나 마음엔 앙금이 남는다',
      '예상치 못한 반전으로 처지가 뒤바뀐다',
      '오랜 침묵 끝에 조용히 정리된다',
      '한쪽의 양보로 위태롭게 유지된다',
      '결국 누구도 이기지 못한 채 끝난다',
      '세월이 지나서야 비로소 용서된다',
      '거짓이 들통나며 한쪽이 무너진다',
      '서로를 향한 미움이 연민으로 바뀐다',
      '끝내 화해하지 못하고 등을 돌린다',
      '한 번의 위기를 함께 넘기며 풀린다',
      '진실이 묻힌 채 잘못된 결말로 굳는다',
      '두 사람 모두 변한 뒤에야 마주 선다',
      '마지막 선택의 순간 한쪽이 손을 놓는다',
      '돌고 돌아 처음의 자리로 되돌아온다',
      '서로의 자리를 인정하며 거리를 좁힌다',
      '한쪽의 헌신이 끝내 마음을 돌린다',
      '쌓인 오해가 한꺼번에 터지며 갈라진다',
      '뜻밖의 약점이 드러나며 균형이 무너진다',
      '서로를 놓아주며 각자의 길로 향한다',
      '오랜 다툼 끝에 진정한 동료가 된다',
      '복수를 앞두고 마음이 흔들려 멈춘다',
      '한쪽이 모든 걸 내려놓으며 끝맺는다',
      '진실 앞에서 두 사람 다 무릎 꿇는다',
      '겉도는 평화 속에 긴장이 이어진다',
      '결정적 증거가 나오며 단숨에 종결된다',
      '서로를 용서하지도 잊지도 못한 채 멀어진다',
      '한쪽의 변심으로 허망하게 끝나 버린다',
      '오랜 원한이 화해로 마침내 풀린다',
      '두 사람의 운명이 함께 무너진다',
      '뒤늦게 알게 된 진심에 후회만 남는다',
      '서로의 상처를 보듬으며 새로 시작한다',
      '끝까지 자존심을 굽히지 못해 결렬된다',
      '한쪽이 떠난 뒤에야 그리움으로 남는다',
      '진실이 밝혀져도 관계는 회복되지 못한다',
      '서로를 향한 집착이 파국을 부른다',
      '한순간의 용기로 오랜 매듭이 풀린다',
      '아무 일 없던 듯 표면 아래로 가라앉는다',
      '오랜 시간이 흐른 뒤 답을 찾으며 잦아든다',
      '한쪽의 진실한 고백으로 전환을 맞는다',
      '서로를 이해하지 못한 채 영영 갈라선다',
      '예기치 못한 비극으로 모든 것이 끝난다',
      '마침내 서로의 손을 맞잡으며 화해한다',
      '오랜 앙금이 한 번의 진심에 녹아내린다',
      '서로의 잘못을 인정하며 매듭을 짓는다',
      '끝내 진실을 알지 못한 채 멀어진다',
      '제삼자의 배신으로 둘이 손잡게 된다',
      '한쪽의 침묵이 모든 것을 묻어 버린다',
      '뜻밖의 재회로 다시 불씨가 살아난다',
      '서로를 미워하다 닮아 가며 화해한다',
      '마지막 순간 한쪽이 모든 책임을 떠안는다',
      '오해의 사슬이 끊기며 관계가 회복된다',
      '한쪽의 떠남으로 다툼이 의미를 잃는다',
      '진실보다 정이 앞서 조용히 덮어 둔다',
      '서로의 자존심이 무너진 뒤에야 풀린다',
      '한 번의 위기가 둘을 더 가깝게 만든다',
      '끝없는 평행선 끝에 각자 길을 간다',
      '뒤늦은 깨달음이 화해의 문을 연다',
      '복수의 끝에서 공허만이 남는다',
      '서로를 지키려다 함께 무너진다',
      '오랜 갈등이 다음 세대의 화해로 풀린다',
      '한쪽의 양심선언으로 국면이 뒤집힌다',
      '미움이 무관심으로 식으며 잦아든다',
      '진심을 확인한 순간 모든 게 달라진다',
      '돌이킬 수 없는 한마디로 끝장이 난다',
      '서로를 놓지 못해 같은 자리를 맴돈다',
    ],
  },
]

const slotByKey = (k: string): Slot | undefined => SLOTS.find((s) => s.key === k)
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const fmt = (n: number): string => (n >= 1e15 ? '천조+' : n.toLocaleString('ko-KR'))

// ── 한국어 조사 자동 선택(받침 판정) ──
// 단어의 마지막 글자에 받침(종성)이 있는지 보고 적절한 조사를 골라 붙인다.
// 결과에 "을(를)" 같은 괄호 이중표기가 노출되지 않도록 실제 조사를 출력한다.
function hasJong(word: string): boolean {
  const w = (word || '').trim()
  if (!w) return false
  const ch = w[w.length - 1]
  const code = ch.charCodeAt(0)
  // 한글 음절: 받침 = (code - 0xac00) % 28 !== 0
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0
  // 숫자·영문 등은 발음상 받침 유무를 근사. 받침 있는 발음: 1,3,6,7,8,0, 영문 l,m,n,r,자음 끝 등.
  if (/[0-9]$/.test(w)) return /[136780]$/.test(w)
  if (/[a-zA-Z]$/.test(w)) return /[lmnr]$/i.test(w)
  return false // 그 외(괄호·기호 등)는 받침 없음으로 처리
}
// 받침 유무에 따라 조사를 붙인 문자열을 돌려준다. (jong=받침 있을 때, noJong=받침 없을 때)
function josa(word: string, jong: string, noJong: string): string {
  return word + (hasJong(word) ? jong : noJong)
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 한 쌍(a, b)의 굴림 결과(슬롯별 face)를 자연스러운 갈등 한 줄로 엮는다.
function compose(a: string, b: string, by: Record<string, string>): string {
  const { type, cause, manifest, stakes, arc } = by
  const parts: string[] = []
  // 1) 누가-누구와 / 무엇 때문에 / 어떤 유형 — 받침에 맞춰 와/과, 은/는, 을/를 실제 선택
  let head = `${josa(a, '과', '와')} ${b}`
  if (type) head = `${josa(a, '과', '와')} ${josa(b, '은', '는')} ${josa(type, '을', '를')} 겪는다`
  parts.push(head)
  if (cause) parts.push(`불씨는 ${cause}`)
  if (manifest) parts.push(`갈등은 ${manifest} 드러난다`)
  if (stakes) parts.push(`걸린 것은 ${stakes}`)
  if (arc) parts.push(`결국 이 다툼은 ${arc}`)
  return parts.map((p) => p.replace(/[.。]$/, '')).join('. ') + '.'
}

// 쌍 키(순서 무관 고정) — "ai|bi" 의 작은 인덱스가 앞.
function pairKey(i: number, j: number): string {
  return i < j ? `${i}|${j}` : `${j}|${i}`
}

// 활성 슬롯들의 조합 가짓수(한 쌍 기준).
function comboPerPair(activeKeys: string[]): number {
  return activeKeys.reduce((acc, k) => {
    const s = slotByKey(k)
    return acc * (s ? s.faces.length : 1)
  }, 1)
}

interface PairCell {
  key: string           // pairKey
  a: string             // 인물 A 이름
  b: string             // 인물 B 이름
  faces: Record<string, string> // 슬롯 key → 뽑힌 face
}
interface Saved {
  id: string
  a: string
  b: string
  text: string
  rows: string
  note: string
}

export default function ConflictMatrixGen({ payload }: { payload?: Record<string, unknown> }) {
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // ── 인물 목록(이름 배열) — 저장/복원 ──
  const [names, setNames] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':names')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          const cleaned = arr.map((x) => String(x).slice(0, 40).trim()).filter(Boolean)
          if (cleaned.length) return Array.from(new Set(cleaned))
        }
      }
    } catch { /* ignore */ }
    return ['주인공', '대립자']
  })
  const [draft, setDraft] = useState('')

  // ── 활성 슬롯(기본 type·cause·manifest 3개; 나머지는 선택) — 저장/복원 ──
  const [active, setActive] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':active')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          const valid = arr.filter((k: string) => SLOTS.some((s) => s.key === k))
          if (valid.length) return valid
        }
      }
    } catch { /* ignore */ }
    return ['type', 'cause', 'manifest']
  })

  // ── 매트릭스 셀(쌍별 결과) ── key → PairCell
  const [cells, setCells] = useState<Record<string, PairCell>>({})
  // ── 잠금 ── `${pairKey}::${slotKey}` → true
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)

  // ── 보관함 — 저장/복원 ──
  const [saved, setSaved] = useState<Saved[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':saved')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          return arr.filter((s) => s && typeof s.text === 'string').map((s, i) => ({
            id: typeof s.id === 'string' ? s.id : 'cv_' + i,
            a: String(s.a || ''),
            b: String(s.b || ''),
            text: String(s.text),
            rows: typeof s.rows === 'string' ? s.rows : '',
            note: typeof s.note === 'string' ? s.note : '',
          }))
        }
      }
    } catch { /* ignore */ }
    return []
  })

  const [tab, setTab] = useState<'matrix' | 'saved'>('matrix')
  const [toast, setToast] = useState('')
  const [copiedKey, setCopiedKey] = useState('')
  const [focusKey, setFocusKey] = useState('') // 펼친 쌍(상세 슬롯 편집)
  const nonce = useRef(0)

  // 공유 라이브러리 인물(연계: 불러오기 버튼)
  const libChars = useLibraryList('characters')

  // ── 페이로드로 인물/슬롯 프리셋 진입(연계) — 1회 ──
  const handledPayload = useRef<unknown>(null)
  useEffect(() => {
    if (!payload || handledPayload.current === payload) return
    handledPayload.current = payload
    // names / characters 둘 다 허용
    const rawNames = (payload as Record<string, unknown>).names
    const rawChars = (payload as Record<string, unknown>).characters || (payload as Record<string, unknown>).character
    const incoming: string[] = []
    if (Array.isArray(rawNames)) rawNames.forEach((n) => { if (typeof n === 'string' && n.trim()) incoming.push(n.trim()) })
    const charArr = Array.isArray(rawChars) ? rawChars : rawChars ? [rawChars] : []
    charArr.forEach((c) => {
      if (c && typeof c === 'object' && typeof (c as { name?: unknown }).name === 'string') {
        const nm = String((c as { name: string }).name).trim()
        if (nm) incoming.push(nm)
      }
    })
    if (incoming.length) {
      setNames((prev) => Array.from(new Set([...prev, ...incoming.map((x) => x.slice(0, 40))])))
      if (mounted.current) setToast(`인물 ${incoming.length}명을 받았습니다.`)
    }
    const wantSlots = (payload as Record<string, unknown>).slots
    if (Array.isArray(wantSlots)) {
      const valid = wantSlots.filter((k): k is string => typeof k === 'string' && SLOTS.some((s) => s.key === k))
      if (valid.length) setActive(SLOTS.filter((s) => valid.includes(s.key)).map((s) => s.key))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── localStorage 저장 ──
  useEffect(() => { try { localStorage.setItem(LS + ':names', JSON.stringify(names)) } catch { /* ignore */ } }, [names])
  useEffect(() => { try { localStorage.setItem(LS + ':active', JSON.stringify(active)) } catch { /* ignore */ } }, [active])
  useEffect(() => { try { localStorage.setItem(LS + ':saved', JSON.stringify(saved)) } catch { /* ignore */ } }, [saved])

  // ── 인물 목록이 바뀌면 더 이상 존재하지 않는 쌍의 셀/잠금 정리 ──
  useEffect(() => {
    const validPairs = new Set<string>()
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) validPairs.add(pairKey(i, j))
    setCells((prev) => {
      const next: Record<string, PairCell> = {}
      Object.values(prev).forEach((c) => {
        // 이름 기준으로 유효성 재확인(인덱스가 바뀌어도 같은 두 이름이면 유지)
        const ia = names.indexOf(c.a), ib = names.indexOf(c.b)
        if (ia >= 0 && ib >= 0 && ia !== ib) next[pairKey(ia, ib)] = { ...c, key: pairKey(ia, ib) }
      })
      return next
    })
  }, [names])

  // 비활성 슬롯의 셀 face/잠금 정리
  useEffect(() => {
    setCells((prev) => {
      const next: Record<string, PairCell> = {}
      Object.entries(prev).forEach(([k, c]) => {
        const faces: Record<string, string> = {}
        active.forEach((sk) => { if (c.faces[sk]) faces[sk] = c.faces[sk] })
        next[k] = { ...c, faces }
      })
      return next
    })
    setLocked((prev) => {
      const next: Record<string, boolean> = {}
      Object.keys(prev).forEach((lk) => {
        const sk = lk.split('::')[1]
        if (active.includes(sk)) next[lk] = prev[lk]
      })
      return next
    })
  }, [active])

  // 굴림 애니메이션 해제 + 언마운트 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 340)
    return () => window.clearTimeout(t)
  }, [rolling])

  // 토스트/복사 피드백 정리(언마운트 포함)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1900)
    return () => window.clearTimeout(t)
  }, [toast])
  useEffect(() => {
    if (!copiedKey) return
    const t = window.setTimeout(() => { if (mounted.current) setCopiedKey('') }, 1400)
    return () => window.clearTimeout(t)
  }, [copiedKey])

  // ── 인물 추가/삭제 ──
  const addNames = () => {
    const toks = draft.split(/[,\n;·]/).map((s) => s.trim()).filter(Boolean).map((s) => s.slice(0, 40))
    if (!toks.length) return
    setNames((prev) => {
      const set = new Set(prev)
      toks.forEach((t) => set.add(t))
      const arr = Array.from(set)
      if (arr.length > 12) { setToast('인물은 최대 12명까지 권장합니다(쌍이 너무 많아져요).'); return arr.slice(0, 12) }
      return arr
    })
    setDraft('')
  }
  const removeName = (nm: string) => setNames((prev) => prev.filter((n) => n !== nm))
  const importLib = () => {
    const libNames = libChars.map((c) => String(c.name || '').trim()).filter(Boolean)
    if (!libNames.length) { setToast('공유 라이브러리에 저장된 인물이 없습니다. 인물 시트·캐릭터 모델에서 먼저 추가하세요.'); return }
    setNames((prev) => {
      const set = new Set(prev)
      libNames.forEach((n) => set.add(n.slice(0, 40)))
      const arr = Array.from(set).slice(0, 12)
      return arr
    })
    setToast(`라이브러리 인물 ${libNames.length}명을 불러왔습니다.`)
  }

  // ── 슬롯 토글 ──
  const toggleSlot = (key: string) => {
    setActive((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev
        return prev.filter((k) => k !== key)
      }
      return SLOTS.filter((s) => prev.includes(s.key) || s.key === key).map((s) => s.key)
    })
  }

  // ── 모든 쌍 굴리기(잠긴 셀/슬롯 유지) ──
  const pairs: { i: number; j: number; key: string; a: string; b: string }[] = []
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      pairs.push({ i, j, key: pairKey(i, j), a: names[i], b: names[j] })
    }
  }

  const rollOne = useCallback((pk: string, a: string, b: string) => {
    setCells((prev) => {
      const cur = prev[pk]
      const faces: Record<string, string> = { ...(cur?.faces || {}) }
      active.forEach((sk) => {
        if (locked[`${pk}::${sk}`] && faces[sk]) return // 잠긴 슬롯 유지
        const slot = slotByKey(sk)
        if (!slot) return
        let f = pick(slot.faces)
        if (f === faces[sk] && slot.faces.length > 1) f = pick(slot.faces)
        faces[sk] = f
      })
      return { ...prev, [pk]: { key: pk, a, b, faces } }
    })
  }, [active, locked])

  const rollAll = useCallback(() => {
    if (pairs.length === 0) return
    nonce.current++
    setRolling(true)
    setCells((prev) => {
      const next: Record<string, PairCell> = { ...prev }
      pairs.forEach(({ key, a, b }) => {
        const cur = next[key]
        const faces: Record<string, string> = { ...(cur?.faces || {}) }
        active.forEach((sk) => {
          if (locked[`${key}::${sk}`] && faces[sk]) return
          const slot = slotByKey(sk)
          if (!slot) return
          let f = pick(slot.faces)
          if (f === faces[sk] && slot.faces.length > 1) f = pick(slot.faces)
          faces[sk] = f
        })
        next[key] = { key, a, b, faces }
      })
      return next
    })
  }, [pairs, active, locked])

  const toggleLock = (pk: string, sk: string) => setLocked((prev) => ({ ...prev, [`${pk}::${sk}`]: !prev[`${pk}::${sk}`] }))
  const lockWholePair = (pk: string, on: boolean) => setLocked((prev) => {
    const next = { ...prev }
    active.forEach((sk) => { next[`${pk}::${sk}`] = on })
    return next
  })

  // ── 한 쌍의 텍스트/행 ──
  const cellStory = (c: PairCell | undefined): string => {
    if (!c) return ''
    const by: Record<string, string> = {}
    active.forEach((sk) => { if (c.faces[sk]) by[sk] = c.faces[sk] })
    if (Object.keys(by).length === 0) return ''
    return compose(c.a, c.b, by)
  }
  const cellRows = (c: PairCell | undefined): string => {
    if (!c) return ''
    return active
      .map((sk) => { const s = slotByKey(sk); return s && c.faces[sk] ? `${s.icon} ${s.label}: ${c.faces[sk]}` : '' })
      .filter(Boolean)
      .join('\n')
  }

  const combos = comboPerPair(active)
  const maxCombos = comboPerPair(SLOTS.map((s) => s.key)) // 5개 슬롯 전부 켰을 때(최대 조합수)
  const filledCount = pairs.filter((p) => { const c = cells[p.key]; return c && active.some((sk) => c.faces[sk]) }).length
  const slotLabelLine = active.map((k) => slotByKey(k)?.label || k).join('·')

  // ── 복사 ──
  const copy = (key: string, text: string) => {
    const done = () => { if (mounted.current) setCopiedKey(key) }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
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

  // 전체 매트릭스 텍스트(복사/내보내기)
  const matrixText = (): string => {
    const lines: string[] = [`⚔️ 갈등 매트릭스 (슬롯: ${slotLabelLine})`, '']
    pairs.forEach((p) => {
      const c = cells[p.key]
      const story = cellStory(c)
      if (story) { lines.push(`◆ ${p.a} ↔ ${p.b}`); lines.push(story); lines.push('') }
    })
    return lines.join('\n').trim()
  }

  // ── 보관 ──
  const saveCell = (c: PairCell) => {
    const text = cellStory(c)
    if (!text) return
    setSaved((prev) => {
      if (prev.some((s) => s.text === text)) { setToast('이미 보관함에 있습니다.'); return prev }
      const rec: Saved = {
        id: 'cv_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4).toString(36),
        a: c.a, b: c.b, text, rows: cellRows(c), note: '',
      }
      setToast('보관함에 저장했습니다.')
      return [rec, ...prev]
    })
  }
  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))
  const setNote = (id: string, note: string) => setSaved((prev) => prev.map((s) => (s.id === id ? { ...s, note } : s)))
  const moveSaved = (id: string, dir: -1 | 1) => setSaved((prev) => {
    const idx = prev.findIndex((s) => s.id === id)
    if (idx < 0) return prev
    const ni = idx + dir
    if (ni < 0 || ni >= prev.length) return prev
    const a = prev.slice()
    ;[a[idx], a[ni]] = [a[ni], a[idx]]
    return a
  })

  // ── 프로젝트 본문(HTML) ──
  const bodyHtmlPair = (a: string, b: string, text: string, rows: string, note?: string): string => {
    const rowLines = rows ? rows.split('\n').filter(Boolean).map((ln) => `<p>${escHtml(ln)}</p>`).join('') : ''
    return [
      `<p style="font-size:15px;line-height:1.8;"><b>${escHtml(a)} ↔ ${escHtml(b)}</b></p>`,
      `<p style="font-size:14px;line-height:1.7;">${escHtml(text)}</p>`,
      `<hr/>`,
      rowLines,
      note ? `<p style="color:#888;">📝 ${escHtml(note)}</p>` : '',
    ].join('')
  }
  const bodyHtmlMatrix = (): string => {
    const blocks = pairs.map((p) => {
      const c = cells[p.key]
      const story = cellStory(c)
      if (!story) return ''
      return `<p style="font-size:14px;line-height:1.8;"><b>◆ ${escHtml(p.a)} ↔ ${escHtml(p.b)}</b><br/>${escHtml(story)}</p>`
    }).filter(Boolean)
    return [
      `<p><b>슬롯 조합:</b> ${escHtml(slotLabelLine)}</p>`,
      `<hr/>`,
      ...blocks,
    ].join('')
  }

  // ── 프로젝트 연계 — 자료(research)/〈갈등〉 폴더로 ──
  const addPairToProject = (c: PairCell, note?: string) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const text = cellStory(c)
    if (!text) { setToast('먼저 이 쌍을 굴려주세요.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '갈등',
      title: `⚔️ ${c.a} ↔ ${c.b}`,
      bodyHtml: bodyHtmlPair(c.a, c.b, text, cellRows(c), note),
      synopsis: text,
      meta: { 인물A: c.a, 인물B: c.b, 유형: c.faces.type || '—', 판돈: c.faces.stakes || '—' },
    })
    setToast(id ? `프로젝트 자료 〈갈등〉 폴더에 '${c.a}↔${c.b}'를 추가했습니다.` : '프로젝트에 추가하지 못했습니다.')
  }
  const addMatrixToProject = () => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    if (filledCount === 0) { setToast('먼저 매트릭스를 굴려주세요.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '갈등',
      title: `⚔️ 갈등 매트릭스 (${names.length}명·${filledCount}쌍)`,
      bodyHtml: bodyHtmlMatrix(),
      synopsis: `${names.join(', ')} 사이 ${filledCount}개 관계 긴장`,
      meta: { 인물수: String(names.length), 갈등쌍: String(filledCount), 슬롯: slotLabelLine },
    })
    setToast(id ? `프로젝트 자료 〈갈등〉 폴더에 매트릭스 전체를 추가했습니다.` : '프로젝트에 추가하지 못했습니다.')
  }
  const addSavedToProject = (s: Saved) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '갈등',
      title: `⚔️ ${s.a} ↔ ${s.b}`,
      bodyHtml: bodyHtmlPair(s.a, s.b, s.text, s.rows, s.note),
      synopsis: s.text,
      meta: { 인물A: s.a, 인물B: s.b },
    })
    setToast(id ? '프로젝트 〈갈등〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ── 수집함 ──
  const stashCell = (c: PairCell) => {
    const text = cellStory(c)
    if (!text) return
    addToStash({ kind: 'note', label: `⚔️ ${c.a}↔${c.b}`, text: `${text}\n\n${cellRows(c)}` })
    setToast('수집함에 담았습니다.')
  }
  // ── 스니펫 라이브러리 ──
  const saveSnippetText = (text: string, a: string, b: string) => {
    if (!text) return
    addToLibrary('snippets', {
      text: `[갈등] ${text}`,
      source: '갈등 매트릭스 생성기',
      tags: ['글감', '갈등', '관계', a, b],
    })
    setToast('스니펫 라이브러리에 저장했습니다.')
  }
  const snippetCell = (c: PairCell) => saveSnippetText(cellStory(c), c.a, c.b)

  // ── 인물 관계도로 보내기(연계) ──
  const openRelMap = () => {
    if (names.length < 2) { setToast('인물을 2명 이상 추가하세요.'); return }
    openToolLinked('relationship-map', { character: names.map((n) => ({ name: n })) })
  }

  // ───────────────────────── 스타일 ─────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const cardBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }
  const inputStyle: React.CSSProperties = { flex: 1, minWidth: 0, background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit' }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>인물 목록</b>을 넣으면 가능한 모든 <b>쌍</b>마다 <b>갈등 유형·원인·표출 방식</b>(+판돈·추이)을 조합해 관계 긴장을 한 줄로 설계합니다. 셀·슬롯을 <Emoji e="🔒"/>로 잠그고 나머지만 다시 굴리세요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('matrix')} aria-pressed={tab === 'matrix'}
          style={{ borderColor: tab === 'matrix' ? 'var(--accent)' : 'var(--border)', color: tab === 'matrix' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⚔️"/> 매트릭스
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐"/> 보관함 ({saved.length})
        </button>
      </div>

      {tab === 'matrix' && (
        <>
          {/* 인물 입력 */}
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNames() } }}
              placeholder="인물 이름 입력(쉼표·줄바꿈으로 여러 명) 후 Enter"
              style={inputStyle}
            />
            <button className="minibtn" onClick={addNames} title="인물 추가">＋ 추가</button>
            <button className="minibtn" onClick={importLib} title="공유 라이브러리(인물 시트·캐릭터 모델)에서 불러오기"><Emoji e="👥"/> 불러오기</button>
          </div>

          {/* 인물 칩 */}
          <div style={chipRow}>
            {names.length === 0 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>아직 인물이 없습니다.</span>}
            {names.map((nm) => (
              <span key={nm} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 999, padding: '3px 6px 3px 10px' }}>
                {nm}
                <button className="minibtn" onClick={() => removeName(nm)} title="삭제"
                  style={{ padding: '0 5px', borderColor: 'transparent', color: 'var(--muted)', lineHeight: 1.2 }}>✕</button>
              </span>
            ))}
          </div>

          {/* 슬롯 선택 */}
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
            인물 <b style={{ color: 'var(--accent)' }}>{names.length}</b>명 → 갈등 쌍 <b style={{ color: 'var(--accent)' }}>{pairs.length}</b>개 · 쌍당 가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmt(combos)}</b>가지{combos >= 10000 ? ' (수만+)' : ''} · 5축 모두 켜면 최대 <b style={{ color: 'var(--accent)' }}>{fmt(maxCombos)}</b>가지
          </div>

          {/* 생성 버튼 줄 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 140 }} onClick={rollAll} disabled={pairs.length === 0}>
              <Emoji e="⚔️"/> 전체 굴리기 / 다시 굴리기
            </button>
            <button className="minibtn" onClick={() => copy('matrix', matrixText())} disabled={filledCount === 0}>
              {copiedKey === 'matrix' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 전체 복사</>}
            </button>
          </div>

          {/* 매트릭스 셀 목록 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {pairs.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '28px 16px', lineHeight: 1.6 }}>
                <div style={{ fontSize: 38, marginBottom: 6 }}><Emoji e="⚔️"/></div>
                인물을 2명 이상 추가하면 쌍마다 갈등이 생성됩니다.
              </div>
            )}
            {pairs.map((p) => {
              const c = cells[p.key]
              const story = cellStory(c)
              const open = focusKey === p.key
              const wholeLocked = c && active.length > 0 && active.every((sk) => locked[`${p.key}::${sk}`])
              return (
                <div key={p.key} style={cardBox}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      <span style={{ color: 'var(--accent)' }}>{p.a}</span>
                      <span style={{ color: 'var(--muted)', margin: '0 6px' }}>↔</span>
                      <span style={{ color: 'var(--accent)' }}>{p.b}</span>
                    </span>
                    <span style={{ flex: 1 }} />
                    <button className="minibtn" onClick={() => rollOne(p.key, p.a, p.b)} title="이 쌍만 다시 굴리기"><Emoji e="🎲"/></button>
                    <button className="minibtn" onClick={() => lockWholePair(p.key, !wholeLocked)} title={wholeLocked ? '이 쌍 잠금 해제' : '이 쌍 전체 잠금'}
                      style={{ borderColor: wholeLocked ? 'var(--accent)' : 'var(--border)' }}>
                      {wholeLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                    </button>
                    <button className="minibtn" onClick={() => setFocusKey(open ? '' : p.key)} title={open ? '접기' : '슬롯별 보기/편집'}>
                      {open ? '▴' : '▾'}
                    </button>
                  </div>

                  <div style={{ fontSize: 14, lineHeight: 1.6, color: story ? 'var(--text)' : 'var(--muted)' }}>
                    {story || '— 아직 굴리지 않았습니다 —'}
                  </div>

                  {/* 슬롯별 상세(펼침) */}
                  {open && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px dashed var(--border)', paddingTop: 8 }}>
                      {active.map((sk) => {
                        const slot = slotByKey(sk)!
                        const face = c?.faces[sk]
                        const isLocked = !!locked[`${p.key}::${sk}`]
                        return (
                          <div key={sk} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-10deg) scale(1.12)' : 'none' }}><Emoji e={slot.icon}/></span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{slot.label}</div>
                              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, color: face ? 'var(--text)' : 'var(--muted)' }}>
                                {face ? (rolling && !isLocked ? '…' : face) : '—'}
                              </div>
                            </div>
                            <button className="minibtn" onClick={() => toggleLock(p.key, sk)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                              style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                              {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* 셀 액션 */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="minibtn" onClick={() => copy('c' + p.key, story + '\n\n' + cellRows(c))} disabled={!story}>
                      {copiedKey === 'c' + p.key ? <>✓</> : <Emoji e="📋"/>} 복사
                    </button>
                    <button className="minibtn" onClick={() => c && saveCell(c)} disabled={!story}><Emoji e="⭐"/> 보관</button>
                    <button className="minibtn" onClick={() => c && snippetCell(c)} disabled={!story} title="글감 스니펫 라이브러리에 저장"><Emoji e="✂️"/> 스니펫</button>
                    {hasStash() && (
                      <button className="minibtn" onClick={() => c && stashCell(c)} disabled={!story} title="플로팅 수집함에 담기"><Emoji e="📎"/> 수집함</button>
                    )}
                    <span style={{ flex: 1 }} />
                    <button className="linkbtn" onClick={() => c && addPairToProject(c)} disabled={!story || !hasProjectBridge()}
                      title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 갈등을 프로젝트 자료 〈갈등〉 폴더에 추가'}>
                      <Emoji e="📄"/> 프로젝트에 추가
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 매트릭스 연계 바 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={addMatrixToProject} disabled={filledCount === 0 || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '매트릭스 전체를 프로젝트 자료 〈갈등〉 폴더에 문서로 추가'}>
              <Emoji e="📄"/> 매트릭스 전체를 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={openRelMap} disabled={names.length < 2}
              title="이 인물들로 인물 관계도를 엽니다">
              <Emoji e="🕸️"/> 인물 관계도 열기
            </button>
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐"/></div>
              보관한 갈등이 없습니다.<br />
              <span style={{ fontSize: 12 }}>매트릭스 탭에서 <Emoji e="⭐"/> 보관을 눌러 마음에 드는 관계 긴장을 모아보세요.</span>
            </div>
          )}
          {saved.map((s, i) => {
            const k = 'sv' + s.id
            return (
              <div key={s.id} style={cardBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap' }}>
                    {s.a} ↔ {s.b}
                  </span>
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                  <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">▼</button>
                  <button className="minibtn" onClick={() => copy(k, s.text + (s.rows ? `\n\n${s.rows}` : '') + (s.note ? `\n📝 ${s.note}` : ''))} title="복사">
                    {copiedKey === k ? <>✓</> : <Emoji e="📋"/>}
                  </button>
                  <button className="minibtn" onClick={() => saveSnippetText(s.text, s.a, s.b)} title="스니펫 라이브러리에 저장"><Emoji e="✂️"/></button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑"/></button>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.6 }}>{s.text}</div>
                {s.rows && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{emojify(s.rows)}</div>
                )}
                <textarea
                  value={s.note}
                  onChange={(e) => setNote(s.id, e.target.value)}
                  placeholder="이 갈등을 어느 장면·국면에 쓸지 메모…"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
                <div className="linkbar">
                  <span className="linkbar-label">연계:</span>
                  <button className="linkbtn" onClick={() => addSavedToProject(s)} disabled={!hasProjectBridge()}
                    title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 갈등을 프로젝트 자료 〈갈등〉 폴더에 추가'}>
                    <Emoji e="📄"/> 프로젝트에 추가
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>같은 조합이라도 내 인물·관계·세계에 맞춰 자유롭게 비틀어 보세요. 갈등은 이야기의 엔진입니다.</div>
    </div>
  )
}
