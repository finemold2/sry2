// 암호·은어·신호 사전 — 스파이/미스터리/시대극 소재 전용. 역사적 암호·치환/전치 방식·은어(클랜트)·
//   수신호·봉화/연기 신호 등을 "정의 + 실제 작동 예시 + 비틀기 아이디어"로 정리한 완전 로컬 사전.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 API/네트워크/미디어 없음(전부 로컬 자작 데이터·자작 알고리즘).
//   사용 문자는 일반 문자만(제어문자·\x00 없음). Math.random + localStorage 만.
// 기능:
//   ① 사전: 카테고리 펼침 + 검색 + 무작위 + 클릭 복사 + 항목별 비틀기 아이디어.
//   ② 실습기(playground): 카이사르/아트바시/비즈네르/레일펜스/모스/A1Z26/치환표 등을
//      입력 평문에 직접 적용해 "실제 작동하는" 암호문을 만들고 복호화까지. (전부 영문/숫자/공백 기준)
// 연계(linkbus): 항목·실습 결과를 자료('research') 〈암호 노트〉 폴더에 추가, 글감 스니펫 저장, 수집함에 담기,
//   관련 도구(트릭·범행수법 사전) 열기.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, addToStash, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'code-cipher-ref',
  name: '암호·은어·신호 사전',
  icon: '🕵️',
  group: '리서치·자료',
  intro: '역사적 암호·치환/전치 방식·은어·수신호·봉화/연기 신호를 실제 작동 예시와 함께',
  w: 700,
  h: 680,
}

// ───────────────────────── 데이터 모델 ─────────────────────────
interface Entry {
  name: string          // 이름
  era?: string          // 시대·출처(대략)
  def: string           // 정의·원리
  how: string[]         // 작동 방식(단계/구성)
  example: string[]     // 실제 작동 예시(평문→암호문 등). 일반 문자만.
  fiction: string[]     // 소설 활용·비틀기 아이디어
  tags: string[]        // 검색 보조 태그
}
interface Cat {
  key: string
  label: string
  icon: string
  desc: string
  items: Entry[]
}

// ───────────────────────── 사전 데이터(로컬, 6개 카테고리) ─────────────────────────
const CATS: Cat[] = [
  {
    key: 'classic', label: '역사적 암호', icon: '📜', desc: '고대~근세에 실제로 쓰인 대표적 암호 체계',
    items: [
      {
        name: '카이사르 암호 (Caesar)',
        era: '고대 로마, 율리우스 카이사르',
        def: '알파벳을 일정 칸수(키)만큼 한 방향으로 밀어 치환하는 가장 단순한 시프트 암호.',
        how: [
          '키 n을 정한다(예: 3).',
          '각 글자를 알파벳 순서상 n칸 뒤로 민다(A→D, B→E ...).',
          'Z를 넘으면 A로 순환한다. 복호화는 같은 칸수만큼 앞으로 되돌린다.',
        ],
        example: [
          '키 3 — 평문 ATTACK → 암호 DWWDFN',
          '키 3 — 평문 HELLO → 암호 KHOOR',
          '되돌리기: KHOOR 를 3칸 앞으로 → HELLO',
        ],
        fiction: [
          '키 숫자가 등장인물의 생일·방 호수 같은 사적 정보라 범인 범위를 좁힌다.',
          '겉보기엔 카이사르지만 한 글자마다 키가 1씩 늘어나는 변형(점진 시프트)이다.',
          '암호를 푸는 것보다 "왜 하필 키가 그 숫자인가"가 진짜 단서가 된다.',
        ],
        tags: ['카이사르', '시프트', '치환', 'caesar', '로마'],
      },
      {
        name: '아트바시 (Atbash)',
        era: '고대 히브리',
        def: '알파벳을 앞뒤로 완전히 뒤집어 대응시키는 역순 치환(A↔Z, B↔Y ...). 키가 없는 고정 방식.',
        how: [
          '알파벳 순서표와 그 역순표를 위아래로 둔다.',
          '평문 글자를 같은 자리의 역순 글자로 바꾼다(A→Z, B→Y, M→N ...).',
          '한 번 더 적용하면 원문으로 돌아온다(자기역원).',
        ],
        example: [
          '평문 ABC → 암호 ZYX',
          '평문 SECRET → 암호 HVXIVG',
          '다시 적용: HVXIVG → SECRET (원상복귀)',
        ],
        fiction: [
          '키가 필요 없어 "아는 사람끼리는 즉석에서" 주고받는 결사·비밀조직의 표식.',
          '겉으로는 무의미한 단어처럼 보이는 가게 간판이 사실 아트바시 평문이다.',
          '두 번 적용하면 원문이라는 성질로 "들켜도 안전한 이중 메시지"를 만든다.',
        ],
        tags: ['아트바시', '역순', '치환', 'atbash', '히브리'],
      },
      {
        name: '비즈네르 암호 (Vigenère)',
        era: '16세기 프랑스, 오랫동안 해독 불가로 통함',
        def: '키워드의 글자마다 다른 시프트를 적용하는 다표식(폴리알파벳) 암호. 단순 빈도분석을 무력화한다.',
        how: [
          '키워드를 평문 길이에 맞춰 반복해 적는다(LEMON LEMON ...).',
          '각 자리에서 평문 글자를 키 글자의 알파벳 순번(A=0)만큼 민다.',
          '복호화는 키 글자 순번만큼 거꾸로 되돌린다.',
        ],
        example: [
          '키 LEMON — 평문 ATTACKATDAWN → 암호 LXFOPVEFRNHR',
          'A(+L=11)→L, T(+E=4)→X, T(+M=12)→F ...',
          '복호화: 같은 키 LEMON 으로 거꾸로 밀면 ATTACKATDAWN',
        ],
        fiction: [
          '키워드가 두 인물만 아는 추억의 단어라, 키를 아는 순간 관계가 폭로된다.',
          '키워드의 길이를 모르면 못 푸는데, 그 길이가 사건의 "날짜 수"와 같다.',
          '책 제목을 키로 쓰는 변형 → 그 책이 서가에서 사라진 것이 결정적 단서.',
        ],
        tags: ['비즈네르', '폴리알파벳', '키워드', 'vigenere', '다표식'],
      },
      {
        name: '플레이페어 (Playfair)',
        era: '19세기 영국, 외교·군사 전신',
        def: '5x5 글자판을 이용해 두 글자(이중자) 단위로 치환하는 수동 암호. 단일 글자 빈도분석을 회피한다.',
        how: [
          '키워드로 중복 없는 5x5 표를 만든다(I/J는 한 칸 공유).',
          '평문을 두 글자씩 묶고, 같은 글자쌍 사이에는 X를 끼운다.',
          '같은 행이면 오른쪽, 같은 열이면 아래, 그 외엔 사각형의 반대 모서리로 치환.',
        ],
        example: [
          '키워드 MONARCHY 로 만든 표에서',
          '평문 HI → 표 위치 규칙에 따라 BM 같은 식으로 치환',
          '두 글자 단위라 글자 길이가 항상 짝수로 떨어진다.',
        ],
        fiction: [
          '키워드를 적은 카드가 분실되면 영원히 못 푸는 "물리적 키" 미스터리.',
          'I/J 공유 규칙 때문에 생기는 미세한 모호함이 오역을 낳아 사건을 비튼다.',
          '두 글자씩 끊는 성질을 이용해 의미 없는 더미 글자(X)에 진짜 단서를 숨긴다.',
        ],
        tags: ['플레이페어', '이중자', '5x5', 'playfair', '전신'],
      },
      {
        name: '피그펜 (Pigpen / 프리메이슨)',
        era: '근세 유럽, 프리메이슨·동업조합',
        def: '알파벳을 격자·X자 칸 모양에 배치하고, 글자 대신 그 칸의 "모양(테두리)"으로 적는 기하 치환.',
        how: [
          '#자 격자 2개와 X자 2개에 알파벳을 순서대로 배치(점 유무로 구분).',
          '각 글자가 차지한 칸의 테두리 모양만 그린다.',
          '같은 칸 두 번째 글자는 점(.)을 찍어 구별한다.',
        ],
        example: [
          'A는 ⌐ 모양, B는 ∪ 모양처럼 글자마다 고유한 칸 모양',
          '문장을 칸 모양의 나열로 적어 글자임을 숨긴다.',
          '글로 못 옮기는 "그림 암호"라 본 사전에서는 원리만 설명',
        ],
        fiction: [
          '묘비·문장(紋章)·자수에 새겨진 무늬가 사실 피그펜 메시지였다.',
          '아이의 낙서로 보이던 도형이 마지막 페이지에서 해독된다.',
          '조직의 표식이자 암호라서, 모양을 아는 자만이 내부인임을 증명한다.',
        ],
        tags: ['피그펜', '프리메이슨', '기하', 'pigpen', '도형'],
      },
      {
        name: '책 암호 (Book Cipher)',
        era: '근세~근대, 첩보의 단골',
        def: '특정 "책"을 공유 키로 삼아, 페이지·줄·단어 번호의 묶음으로 단어를 가리키는 방식.',
        how: [
          '송수신자가 같은 판본의 책을 약속한다.',
          '전하려는 각 단어를 "페이지-줄-단어" 좌표 숫자로 바꾼다.',
          '받는 쪽은 같은 책을 펴서 좌표대로 단어를 읽어 복원한다.',
        ],
        example: [
          '예: 34-2-7 = 34페이지 2번째 줄 7번째 단어',
          '숫자 나열만 보이고 책을 모르면 절대 못 푼다.',
          '판본·쇄가 다르면 같은 좌표가 다른 단어를 가리킨다(함정).',
        ],
        fiction: [
          '용의자 모두의 책장에 같은 책이 꽂혀 있는데, 한 권만 판본이 다르다.',
          '죽은 자가 남긴 숫자 메모의 "책"이 무엇인지가 추리의 핵심.',
          '키가 되는 책이 절판되어, 그 책을 가진 사람으로 범위가 좁혀진다.',
        ],
        tags: ['책암호', '북사이퍼', '좌표', 'book', '첩보'],
      },
      {
        name: '폴리비우스 사각형 (Polybius)',
        era: '고대 그리스',
        def: '5x5 표에 글자를 넣고 각 글자를 "행번호·열번호" 두 숫자로 바꾸는 좌표 치환. 신호·노크에도 응용.',
        how: [
          '5x5 표에 A~Z 배치(I/J 한 칸 공유).',
          '각 글자를 (행, 열) 숫자쌍으로 적는다.',
          '벽 두드리기·횃불 개수 등 비문자 매체로도 전달 가능.',
        ],
        example: [
          '표준 표에서 A=11, B=12, C=13 ... K=25 ...',
          '평문 CAT → 13 11 44 (열·행은 표 구성에 따름)',
          '감옥 벽 노크(탭 코드)로 11=A는 한 번·한 번 같은 식',
        ],
        fiction: [
          '독방 죄수들이 벽 두드림으로 대화하는 탭 코드의 원형.',
          '횃불 개수로 멀리 전하는 "불빛 좌표"로 변형해 봉화와 결합.',
          '숫자쌍의 나열이 사실 좌표가 아니라 날짜·시각이라는 이중 해석.',
        ],
        tags: ['폴리비우스', '좌표', '탭코드', 'polybius', '노크'],
      },
    ],
  },
  {
    key: 'method', label: '치환·전치 방식', icon: '🔁', desc: '글자를 바꾸거나(치환) 자리를 섞는(전치) 일반 원리',
    items: [
      {
        name: '단일치환 (Monoalphabetic)',
        def: '알파벳 각 글자를 고정된 다른 글자로 일대일 대응시키는 방식. 키는 뒤섞인 알파벳 한 벌.',
        how: [
          '평문 알파벳 ABC...Z 아래에 뒤섞은 알파벳을 대응표로 둔다.',
          '평문 글자를 대응표의 글자로 바꾼다.',
          '복호화는 표를 거꾸로 읽는다. 빈도분석에 약하다.',
        ],
        example: [
          '표: A→Q, B→W, C→E ... (임의 1:1 대응)',
          '평문 CAB → 암호 EQW',
          '가장 흔한 글자(E 등)의 빈도가 그대로라 깨지기 쉽다.',
        ],
        fiction: [
          '범인이 만든 1:1 표가 사실 다른 메시지(머리글자)로 구성돼 있다.',
          '빈도분석으로 풀릴 줄 알았으나 평문 자체가 외국어라 막힌다.',
          '대응표를 외우지 못해 적어둔 종이가 결정적 물증.',
        ],
        tags: ['단일치환', '대응표', '빈도분석', 'monoalphabetic', '치환'],
      },
      {
        name: '레일펜스 (Rail Fence, 전치)',
        def: '글자를 지그재그(울타리 모양) 여러 줄에 흩뿌린 뒤 줄 단위로 다시 읽는 전치 암호.',
        how: [
          '줄 수(레일)를 정한다(예: 3).',
          '평문을 위→아래→위 지그재그로 한 글자씩 배치.',
          '맨 윗줄부터 차례로 읽어 이어 붙인다.',
        ],
        example: [
          '레일 3 — 평문 WEAREDISCOVERED',
          '지그재그 배치 후 줄별로 읽으면 자리가 섞인 암호문이 나온다',
          '복호화는 같은 지그재그 틀을 복원해 되읽는다',
        ],
        fiction: [
          '줄 수를 모르면 못 푸는데, 그 줄 수가 피해자의 나이다.',
          '전치라 글자 종류·빈도는 그대로여서 "치환이 아님"을 눈치채는 게 관건.',
          '메시지를 종이 띠에 적어 막대에 감는 물리적 전치(스키테일)와 연결.',
        ],
        tags: ['레일펜스', '전치', '지그재그', 'railfence', '울타리'],
      },
      {
        name: '스키테일 (Scytale)',
        era: '고대 스파르타',
        def: '같은 굵기의 막대에 가죽 띠를 감고 가로로 글을 적은 뒤 띠를 풀면 자리가 섞이는 물리적 전치.',
        how: [
          '약속된 지름의 막대에 띠를 나선으로 감는다.',
          '막대를 따라 가로로 평문을 적는다.',
          '띠를 풀면 글자 순서가 흐트러진다. 같은 굵기 막대로만 복원.',
        ],
        example: [
          '같은 지름의 막대가 곧 "키"',
          '띠만 보면 무의미한 글자 나열',
          '굵기가 다르면 줄이 어긋나 못 읽는다',
        ],
        fiction: [
          '키가 되는 막대(굵기)가 평범한 물건(지팡이·촛대)이라 눈에 안 띈다.',
          '막대가 부러져 두 동강 나면서 메시지도 둘로 갈린다.',
          '굵기를 재는 단서가 현장에 남은 "감긴 자국"이다.',
        ],
        tags: ['스키테일', '전치', '막대', 'scytale', '스파르타'],
      },
      {
        name: '열 전치 (Columnar Transposition)',
        def: '평문을 격자에 채운 뒤 키워드의 알파벳 순서대로 열을 뽑아 재배열하는 전치 암호.',
        how: [
          '키워드 길이만큼의 열을 만들고 평문을 행 방향으로 채운다.',
          '키워드 글자의 알파벳 순서로 열에 번호를 매긴다.',
          '번호 순서대로 열을 세로로 읽어 이어 붙인다.',
        ],
        example: [
          '키워드 ZEBRA(=5,2,1,4,3 순) 로 열 순서 결정',
          '평문을 5열 격자에 채우고 열 번호 순으로 추출',
          '복호화는 열 길이를 계산해 격자를 역으로 복원',
        ],
        fiction: [
          '키워드를 모르면 길이만 알아도 경우의 수가 폭발해 못 푼다.',
          '두 번 적용(이중 전치)해 난도를 올린 군용 변형.',
          '격자 빈칸을 채운 더미 글자에 진짜 머리글자 메시지를 심는다.',
        ],
        tags: ['열전치', '전치', '키워드', 'columnar', '격자'],
      },
      {
        name: 'A1Z26 (숫자 치환)',
        def: '알파벳을 순번 숫자로 바꾸는 가장 직관적인 치환(A=1, B=2 ... Z=26).',
        how: [
          '각 글자를 알파벳 순번 숫자로 적는다.',
          '글자 사이는 구분 기호(예: -)로 나눈다.',
          '복호화는 숫자를 다시 글자로 되돌린다.',
        ],
        example: [
          '평문 CODE → 3-15-4-5',
          '평문 SOS → 19-15-19',
          '숫자만 보여 "전화번호처럼" 위장하기 쉽다',
        ],
        fiction: [
          '메모의 숫자가 좌표·시각인 줄 알았으나 A1Z26 단어였다.',
          '숫자에 +1 같은 미세 오프셋을 더해 한 단계 더 꼰다.',
          '아이의 셈 공책에 적힌 숫자열이 사실 유언이었다.',
        ],
        tags: ['a1z26', '숫자', '치환', '순번', '오프셋'],
      },
      {
        name: '뉴멘클레이터 (Nomenclator)',
        era: '중세~근세 유럽 궁정',
        def: '치환 알파벳에 더해, 자주 쓰는 인명·지명·단어를 통째로 대신하는 "코드 단어집"을 결합한 혼합 암호.',
        how: [
          '기본 글자 치환표 + 별도의 코드표(예: 387=왕)를 함께 운용.',
          '평범한 글자는 치환, 중요한 단어는 코드 번호로 대체.',
          '코드표가 길수록 강력하지만 분실·탈취 위험이 크다.',
        ],
        example: [
          '예: 인명/지명을 숫자 코드로(메리=521, 런던=83)',
          '나머지 글자는 단순 치환으로 적는다',
          '코드표 자체가 핵심 기밀',
        ],
        fiction: [
          '코드표(작은 수첩) 한 권이 왕국의 운명을 쥔 맥거핀.',
          '코드 번호 하나가 둘로 해석돼 음모가 엇갈린다.',
          '코드표를 외운 마지막 생존자가 표적이 된다.',
        ],
        tags: ['뉴멘클레이터', '코드북', '혼합', 'nomenclator', '궁정'],
      },
    ],
  },
  {
    key: 'cant', label: '은어·암구호', icon: '🗣️', desc: '특정 집단만 통하는 말·암호 같은 통과 신호',
    items: [
      {
        name: '암구호 (Password / Countersign)',
        def: '아군임을 확인하기 위해 한쪽이 던지는 말과 정해진 응답으로 이루어진 한 쌍의 통과 신호.',
        how: [
          '제시어와 응답어를 미리 약속한다(예: "천둥"→"번개").',
          '경계병이 제시어를 말하면 통과자는 정해진 응답을 한다.',
          '주기적으로 갱신해 탈취·도청에 대비한다.',
        ],
        example: [
          '제시 "산"→응답 "강" 같은 한 쌍',
          '응답을 모르면 적·외부인으로 간주',
          '발음·억양까지 검사하는 변형(쉬볼렛)',
        ],
        fiction: [
          '오늘의 암구호가 바뀐 줄 모른 첩자가 옛 응답을 말해 발각된다.',
          '응답어가 어떤 노래의 가사라, 그 노래를 아는 자만 통과.',
          '암구호를 정한 자가 곧 내부 배신자라는 반전.',
        ],
        tags: ['암구호', '패스워드', '통과', 'countersign', '쉬볼렛'],
      },
      {
        name: '쉬볼렛 (Shibboleth)',
        def: '특정 집단만 자연스럽게 발음하는 단어로 출신·소속을 가려내는 "말의 시험".',
        how: [
          '발음 차이가 뚜렷한 단어를 고른다.',
          '대상에게 그 단어를 말하게 한다.',
          '발음·억양으로 내부인/외부인을 판별한다.',
        ],
        example: [
          '같은 글자라도 집단마다 발음이 갈리는 단어',
          '글로는 안 드러나고 "소리"로만 판별',
          '사투리·외국어 억양이 곧 단서',
        ],
        fiction: [
          '완벽히 위장한 첩자가 단 한 단어의 발음으로 들통난다.',
          '쉬볼렛을 아는 자가 일부러 틀리게 발음해 신분을 숨긴다.',
          '발음 시험이 사실 청력·기억을 떠보는 다른 함정.',
        ],
        tags: ['쉬볼렛', '발음', '판별', 'shibboleth', '사투리'],
      },
      {
        name: '도둑 은어 (Thieves’ Cant)',
        era: '근세 유럽 범죄 하위문화',
        def: '범죄·부랑 집단이 외부인 모르게 쓰던 직업 은어. 평범한 단어에 전혀 다른 뜻을 부여한다.',
        how: [
          '일상 단어를 특정 의미로 재정의한다(예: "양"=피해자).',
          '내부에서만 통용되며 끊임없이 갱신된다.',
          '듣는 외부인은 평범한 대화로 착각한다.',
        ],
        example: [
          '예: "장사 나간다"=범행하러 간다',
          '겉뜻과 속뜻이 완전히 다른 이중 어휘',
          '은어를 모르면 모의 전체를 놓친다',
        ],
        fiction: [
          '시장통 평범한 잡담이 사실 범행 모의였다.',
          '은어를 알아듣는 형사가 군중 속 모의를 포착한다.',
          '은어가 갱신되어 옛말을 쓰는 자가 위장 첩자로 의심받는다.',
        ],
        tags: ['은어', '도둑은어', '하위문화', 'cant', '이중어휘'],
      },
      {
        name: '코크니 운율 은어 (Rhyming Slang)',
        era: '19세기 런던',
        def: '단어를 그와 운(韻)이 맞는 구절로 대체하고, 흔히 운이 맞는 마지막 말을 생략해 더 알아듣기 어렵게 만든다.',
        how: [
          '바꿀 단어와 운이 맞는 두 단어 구절을 만든다.',
          '대화에선 흔히 운이 맞는 끝말을 빼고 앞말만 쓴다.',
          '내부인은 생략된 운으로 본뜻을 복원한다.',
        ],
        example: [
          '구조: "본단어 ← 운이 맞는 구절"의 약속',
          '끝말 생략으로 외부인은 더 알아듣기 어려움',
          '지역·세대마다 새 은어가 계속 생김',
        ],
        fiction: [
          '용의자의 한마디 은어가 출신지를 폭로한다.',
          '운율 은어로 짠 메시지가 평범한 노래 가사처럼 들린다.',
          '세대가 다른 두 사람이 같은 은어를 다르게 풀어 오해가 생긴다.',
        ],
        tags: ['코크니', '운율은어', '런던', 'rhyming', '슬랭'],
      },
      {
        name: '호보 사인 (Hobo Signs)',
        era: '19~20세기 북미 떠돌이 노동자',
        def: '떠돌이들이 울타리·전봇대에 분필로 남긴 약속된 기호로 "여긴 안전/위험/적선 가능" 등을 전한 길거리 부호.',
        how: [
          '간단한 도형(원·화살표·고양이 등)에 의미를 약속.',
          '거쳐 가는 장소의 담벼락에 표시를 남긴다.',
          '뒤따라온 동료가 표시를 읽고 행동을 정한다.',
        ],
        example: [
          '예: 특정 표시=친절한 집, 다른 표시=사나운 개',
          '글이 아니라 도형이라 외부인은 낙서로 오인',
          '본 사전에서는 원리만(그림 생략)',
        ],
        fiction: [
          '집 담벼락의 낙서가 사실 범행 표적을 가리키는 호보 사인.',
          '표시를 지우거나 바꿔 다음 사람을 함정으로 유인한다.',
          '오래된 표시가 사건의 옛 동선을 증언한다.',
        ],
        tags: ['호보사인', '분필', '길거리부호', 'hobo', '떠돌이'],
      },
    ],
  },
  {
    key: 'hand', label: '수신호·몸짓', icon: '✋', desc: '소리 없이 손·몸으로 전하는 약속된 신호',
    items: [
      {
        name: '군용 수신호 (Hand & Arm Signals)',
        def: '교전·정숙이 필요한 상황에서 팀이 소리 없이 의사를 전하는 표준화된 손·팔 동작 체계.',
        how: [
          '주먹=정지, 손바닥 누르기=엎드려·은폐 등 동작을 약속.',
          '대열 후미까지 동작을 차례로 전달(릴레이).',
          '어두우면 짧은 접촉 신호로 대체한다.',
        ],
        example: [
          '주먹 들기=멈춤, 손가락 둘=두 명/2시 방향 식',
          '시야가 닿는 거리에서만 통함',
          '오해 방지를 위해 동작은 크고 단순하게',
        ],
        fiction: [
          '정적 속 손짓 하나의 오독이 작전을 무너뜨린다.',
          '적이 같은 수신호를 흉내 내 아군을 유인한다.',
          '말 못 하는 인물이 이 신호로만 진실을 전한다.',
        ],
        tags: ['수신호', '군용', '정숙', 'handsignal', '작전'],
      },
      {
        name: '다이버 신호 (Diver Hand Signals)',
        def: '말이 불가능한 수중에서 안전·상태를 주고받는 표준 손 신호. 오해가 곧 사고로 직결돼 엄격히 통일돼 있다.',
        how: [
          '엄지·검지 원=OK, 엄지 위/아래=상승/하강 등 약속.',
          '손을 목에 긋기=공기 없음 같은 비상 신호.',
          '받은 사람은 반드시 같은 신호로 응답(확인).',
        ],
        example: [
          'OK 신호엔 OK로 응답해야 "확인됨"',
          '응답 없으면 비상으로 간주',
          '시야 흐린 야간 잠수는 접촉 신호로 보완',
        ],
        fiction: [
          '수중에서 거짓 OK 신호로 동료를 안심시킨 뒤 사고를 위장.',
          '신호 응답이 없던 단 몇 초가 알리바이의 균열.',
          '말 못 하는 물속에서만 전할 수 있던 진실.',
        ],
        tags: ['다이버', '수중', '신호', 'diving', 'OK'],
      },
      {
        name: '경매·시장 손짓 (Auction/Trade Hand)',
        def: '소음이 큰 경매장·거래소에서 호가·매매를 손가락 수·손바닥 방향으로 빠르게 전하는 신호.',
        how: [
          '손바닥 방향=매수/매도, 손가락 수=수량·가격.',
          '얼굴 가까이=가격, 멀리=수량 등 위치로 구분.',
          '눈 깜빡임·고갯짓 같은 미세 신호로 입찰.',
        ],
        example: [
          '손가락 셋=3단위, 손바닥 바깥=판다 식',
          '소리 없이도 거래 성립',
          '미세 신호라 외부인은 못 알아챔',
        ],
        fiction: [
          '경매장 손짓 한 번으로 막대한 거래가 비밀리에 오간다.',
          '입찰 신호를 가로채 가격을 조작한 음모.',
          '눈짓 하나가 사실 살인 청부의 수락이었다.',
        ],
        tags: ['경매', '시장', '손짓', 'auction', '호가'],
      },
      {
        name: '심판·중계 수신호 (Officiating Signals)',
        def: '경기장에서 심판이 판정을, 방송이 진행을 소리 없이 전달하는 약속된 동작.',
        how: [
          '특정 동작=특정 판정(득점·반칙·시간정지).',
          '관중·선수 모두가 동시에 같은 정보를 인지.',
          '큐 사인(손가락 세기)으로 카운트다운을 전달.',
        ],
        example: [
          '양팔 들기=득점, 호각+손동작 조합',
          '큐 사인 5→4→3...으로 생방송 진행',
          '동작이 공개적이라 누구나 읽음(공개 신호)',
        ],
        fiction: [
          '생방송 큐 사인 타이밍을 이용한 알리바이.',
          '심판의 미묘한 손동작이 사실 매수 신호였다.',
          '공개 신호 속에 끼워 넣은 사적 암호.',
        ],
        tags: ['심판', '중계', '큐사인', 'signal', '방송'],
      },
    ],
  },
  {
    key: 'fire', label: '봉화·연기·빛 신호', icon: '🔥', desc: '먼 거리에 불·연기·빛으로 약속된 뜻을 전한다',
    items: [
      {
        name: '봉화 (Beacon / 烽火)',
        era: '고대~중세 동서양',
        def: '산봉우리 봉수대에서 불·연기를 피워, 변방의 위급을 단계별로 중앙까지 릴레이로 전한 경보 체계.',
        how: [
          '봉수대를 시야가 닿는 거리로 사슬처럼 배치.',
          '불·연기의 "개수"로 위급 단계를 약속(예: 평시 1, 적 출현 2 ...).',
          '앞 봉수대 신호를 보면 같은 단계로 다음에 이어 올린다.',
        ],
        example: [
          '연기 한 줄기=평안, 다섯 줄기=전면 침공 같은 단계',
          '한 봉수대 누락 시 사슬이 끊겨 경보 실패',
          '낮엔 연기, 밤엔 불빛으로 운용',
        ],
        fiction: [
          '봉화 단계가 한 단계만 잘못 올라 거짓 전쟁이 시작된다.',
          '봉수지기를 매수해 경보를 끊은 음모.',
          '꺼진 봉화 하나가 침입 경로를 역으로 폭로.',
        ],
        tags: ['봉화', '봉수', '연기', 'beacon', '경보'],
      },
      {
        name: '연기 신호 (Smoke Signals)',
        def: '담요·덮개로 연기를 끊었다 잇거나 횟수를 조절해 약속된 뜻을 전하는 시각 통신.',
        how: [
          '불 위에 젖은 풀로 짙은 연기를 만든다.',
          '담요로 연기를 덮었다 떼며 끊김의 횟수·길이를 조절.',
          '미리 약속한 "끊김 패턴"으로 의미를 전달.',
        ],
        example: [
          '연기 두 번=집결, 세 번=위험 같은 약속',
          '바람·날씨에 크게 좌우됨',
          '먼 거리 시각 통신이라 야간엔 불빛으로 전환',
        ],
        fiction: [
          '연기 횟수를 한 번 더해 거짓 집결령을 내린다.',
          '바람에 흩어진 연기가 메시지를 반쪽만 전해 비극이 된다.',
          '연기가 오른 위치 자체가 범인의 은신처를 드러낸다.',
        ],
        tags: ['연기신호', '시각통신', '패턴', 'smoke', '담요'],
      },
      {
        name: '모스 부호 (Morse Code)',
        era: '19세기, 전신',
        def: '점(짧음)과 선(김)의 조합으로 글자를 표현하는 부호. 소리·빛·두드림 등 어떤 매체로도 전할 수 있다.',
        how: [
          '각 글자를 점·선의 정해진 조합으로 약속.',
          '점=짧게, 선=길게. 글자 사이·단어 사이에 쉼.',
          '소리(무전)·빛(랜턴)·노크 등으로 송신.',
        ],
        example: [
          'SOS = ... --- ... (점셋·선셋·점셋)',
          'A = .-, E = . (가장 짧은 글자)',
          '랜턴 깜빡임·노크 길이로도 전송 가능',
        ],
        fiction: [
          '갇힌 인물이 전등 깜빡임 모스로 SOS를 보낸다.',
          '평범한 노크 소리가 사실 모스 메시지였다.',
          '한 글자만 어긋난 모스가 사건의 방향을 바꾼다.',
        ],
        tags: ['모스', '점선', '전신', 'morse', 'SOS'],
      },
      {
        name: '수기 신호 (Semaphore Flags)',
        def: '양손의 깃발 두 개를 시계 위치처럼 여러 방향으로 두어 글자를 표현하는 주간 시각 통신.',
        how: [
          '두 깃발의 각도 조합마다 한 글자를 약속.',
          '한 글자씩 자세를 바꿔 멀리 보낸다.',
          '망원경으로 읽고, 받았음을 신호로 확인.',
        ],
        example: [
          '두 팔(깃발)의 방향 조합=글자',
          '함선 간·해안 간 주간 통신에 사용',
          '시야·날씨에 의존, 야간엔 등불로 대체',
        ],
        fiction: [
          '먼 배에서 보낸 수기 신호의 한 글자를 오독해 비극이 시작.',
          '해안 절벽의 인물이 깃발로 공범에게 신호한다.',
          '깃발 신호를 사진에 우연히 찍혀 알리바이가 깨진다.',
        ],
        tags: ['수기', '깃발', '세마포어', 'semaphore', '해상'],
      },
      {
        name: '등화관제·신호등 (Lamp / Light Code)',
        def: '깜빡임의 길이·횟수·색으로 뜻을 전하는 빛 신호. 야간·해상·열차에서 두루 쓰인다.',
        how: [
          '짧은 점멸·긴 점멸·색으로 의미를 약속.',
          '랜턴 셔터를 여닫아 모스 등 부호를 송신.',
          '신호등·등대처럼 고정 패턴으로도 운용.',
        ],
        example: [
          '긴 점멸 둘=정지, 짧게 셋=전진 식',
          '등대의 점멸 주기 자체가 식별 코드',
          '색(적/청)으로 통행·금지 구분',
        ],
        fiction: [
          '등대 점멸 패턴이 평소와 한 박자 달라 음모를 알아챈다.',
          '열차 신호등을 조작해 사고를 위장.',
          '창문 불빛의 깜빡임이 사실 공범에게 보내는 신호.',
        ],
        tags: ['등화', '빛신호', '랜턴', '등대', 'lamp'],
      },
    ],
  },
  {
    key: 'spy', label: '첩보 기법', icon: '🎯', desc: '메시지를 숨기거나 안전하게 주고받는 현장 기술',
    items: [
      {
        name: '드보크 (Dead Drop)',
        def: '서로 마주치지 않고 약속된 은닉 장소에 물건·메시지를 두고 가져가는 비접촉 전달 기법.',
        how: [
          '눈에 안 띄는 은닉 지점을 약속(벽돌 틈·나무 구멍 등).',
          '한쪽이 두고 떠나면, 다른 쪽이 나중에 회수.',
          '"채웠다/비웠다"를 알리는 별도 신호(분필 표시 등)를 둔다.',
        ],
        example: [
          '예: 공원 벤치 밑 자석 케이스',
          '근처 우체통의 분필 자국=드롭 완료 신호',
          '두 사람이 절대 동시에 안 나타남',
        ],
        fiction: [
          '드롭 신호(분필 자국)를 제3자가 지워 거래가 어긋난다.',
          '회수자가 바뀐 줄 모르고 둔 정보가 적의 손에.',
          '은닉 장소가 사건 현장과 겹쳐 동선이 폭로된다.',
        ],
        tags: ['드보크', '데드드롭', '비접촉', 'deaddrop', '은닉'],
      },
      {
        name: '브러시 패스 (Brush Pass)',
        def: '인파 속에서 스치듯 지나가며 순간적으로 물건을 건네는 대면 전달 기법.',
        how: [
          '붐비는 곳에서 동선이 잠깐 겹치도록 한다.',
          '스치는 찰나에 손에서 손으로 물건을 옮긴다.',
          '서로 아는 척하지 않고 그대로 지나간다.',
        ],
        example: [
          '예: 지하철 환승 인파 속 0.5초 전달',
          '신문·우산 등으로 손동작을 가린다',
          '감시자는 두 사람의 접촉을 못 잡는다',
        ],
        fiction: [
          '브러시 패스 순간이 CCTV 한 프레임에 잡혀 결정적 증거.',
          '엉뚱한 사람과 스쳐 물건이 잘못 전달된다.',
          '전달이 사실 절도였다는 반전.',
        ],
        tags: ['브러시패스', '대면전달', '인파', 'brushpass', '접선'],
      },
      {
        name: '원타임 패드 (One-Time Pad)',
        def: '평문 길이만큼의 진짜 무작위 키를 단 한 번만 써서 결합하는, 이론상 해독 불가능한 방식.',
        how: [
          '평문과 같은 길이의 무작위 키를 양쪽이 한 벌씩 보유.',
          '평문 각 글자를 키 글자와 더해(모듈러) 암호화.',
          '키는 한 번 쓰고 폐기. 재사용하면 안전성이 무너진다.',
        ],
        example: [
          '평문+무작위키=무작위처럼 보이는 암호문',
          '키를 모르면 어떤 평문도 똑같이 그럴듯',
          '핵심은 "키를 절대 재사용하지 않음"',
        ],
        fiction: [
          '범인이 패드를 재사용해 두 메시지가 함께 깨진다.',
          '키 뭉치(패드 노트)의 행방이 추리의 핵심.',
          '같은 키로 만든 두 메시지의 모순이 알리바이를 깬다.',
        ],
        tags: ['원타임패드', 'OTP', '무작위', 'onetimepad', '키'],
      },
      {
        name: '마이크로닷 (Microdot)',
        def: '문서 한 페이지 분량을 점 하나 크기로 축소해 마침표·우표 뒤 등에 숨기는 은닉 기법.',
        how: [
          '문서를 사진으로 극도로 축소해 작은 점으로 만든다.',
          '편지의 마침표·우표·반지 안쪽 등에 부착.',
          '받는 쪽은 확대경으로 복원해 읽는다.',
        ],
        example: [
          '겉보기엔 평범한 마침표 하나',
          '확대해야만 본문이 드러남',
          '한 통의 편지에 책 한 권 분량을 숨김',
        ],
        fiction: [
          '편지의 마침표 하나가 사실 기밀 전부였다.',
          '확대경을 가진 자만이 진실에 닿는다.',
          '마이크로닷이 붙은 우표가 우표 수집가에게 흘러든다.',
        ],
        tags: ['마이크로닷', '축소', '은닉', 'microdot', '편지'],
      },
      {
        name: '눌 사이퍼 (Null Cipher)',
        def: '평범한 문장 속에서 약속된 위치의 글자(첫 글자·세 번째 단어 등)만 모아 진짜 메시지를 만드는 은닉.',
        how: [
          '약속한 규칙을 정한다(각 단어 첫 글자만 등).',
          '그 규칙에 맞게 자연스러운 문장을 작성.',
          '받는 쪽은 같은 규칙으로 숨은 글자를 추출.',
        ],
        example: [
          '예: 각 줄 첫 글자만 세로로 읽기(어크로스틱)',
          '겉문장은 완전히 평범한 편지',
          '규칙을 모르면 숨은 뜻이 안 보임',
        ],
        fiction: [
          '평범한 안부 편지의 첫 글자들이 고발이었다.',
          '용의자가 무심코 쓴 메모의 머리글자가 자백.',
          '눌 사이퍼를 들킨 척하며 진짜는 다른 규칙에 숨긴다.',
        ],
        tags: ['눌사이퍼', '어크로스틱', '은닉', 'null', '머리글자'],
      },
    ],
  },
]

// 모든 항목 평탄 목록(검색·무작위)
type Flat = { cat: Cat; item: Entry }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))
const TOTAL = CATS.reduce((n, c) => n + c.items.length, 0)

// ───────────────────────── 실습기(playground) 알고리즘 — 전부 로컬, 영문/숫자/공백 기준 ─────────────────────────
const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const isAZ = (ch: string) => ch >= 'A' && ch <= 'Z'

function caesar(text: string, key: number, dec = false): string {
  const k = ((dec ? -key : key) % 26 + 26) % 26
  return text.toUpperCase().split('').map((ch) => {
    if (!isAZ(ch)) return ch
    return A[(A.indexOf(ch) + k) % 26]
  }).join('')
}
function atbash(text: string): string {
  return text.toUpperCase().split('').map((ch) => (isAZ(ch) ? A[25 - A.indexOf(ch)] : ch)).join('')
}
function vigenere(text: string, keyword: string, dec = false): string {
  const key = (keyword.toUpperCase().match(/[A-Z]/g) || []).join('')
  if (!key) return text.toUpperCase()
  let ki = 0
  return text.toUpperCase().split('').map((ch) => {
    if (!isAZ(ch)) return ch
    const shift = A.indexOf(key[ki % key.length]); ki++
    const k = ((dec ? -shift : shift) % 26 + 26) % 26
    return A[(A.indexOf(ch) + k) % 26]
  }).join('')
}
function a1z26(text: string): string {
  return text.toUpperCase().split('').map((ch) => (isAZ(ch) ? String(A.indexOf(ch) + 1) : (ch === ' ' ? ' / ' : ch))).join('-').replace(/-? \/ -?/g, ' / ').replace(/^-|-$/g, '')
}
function a1z26Decode(text: string): string {
  return text.split(/\s*\/\s*/).map((word) =>
    word.split(/[-\s]+/).filter(Boolean).map((n) => {
      const v = parseInt(n, 10)
      return (v >= 1 && v <= 26) ? A[v - 1] : '?'
    }).join('')
  ).join(' ')
}
function railFence(text: string, rails: number, dec = false): string {
  const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (rails < 2 || clean.length === 0) return clean
  // 지그재그 행 인덱스 패턴
  const pattern: number[] = []
  let r = 0, dir = 1
  for (let i = 0; i < clean.length; i++) {
    pattern.push(r)
    if (r === 0) dir = 1; else if (r === rails - 1) dir = -1
    r += dir
  }
  if (!dec) {
    let out = ''
    for (let row = 0; row < rails; row++) for (let i = 0; i < clean.length; i++) if (pattern[i] === row) out += clean[i]
    return out
  } else {
    // 복호화: 각 행에 몇 글자가 가는지 세고 채운 뒤 지그재그로 되읽기
    const counts = new Array(rails).fill(0)
    for (const p of pattern) counts[p]++
    const rowsArr: string[] = []
    let idx = 0
    for (let row = 0; row < rails; row++) { rowsArr.push(clean.slice(idx, idx + counts[row])); idx += counts[row] }
    const cursor = new Array(rails).fill(0)
    let out = ''
    for (const p of pattern) { out += rowsArr[p][cursor[p]]; cursor[p]++ }
    return out
  }
}
const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--',
  '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
}
const MORSE_REV: Record<string, string> = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]))
function morse(text: string): string {
  return text.toUpperCase().split('').map((ch) => {
    if (ch === ' ') return '/'
    return MORSE[ch] ?? (/[A-Z0-9]/.test(ch) ? '?' : '')
  }).filter(Boolean).join(' ')
}
function morseDecode(text: string): string {
  return text.trim().split(/\s+/).map((tok) => (tok === '/' ? ' ' : (MORSE_REV[tok] ?? '?'))).join('')
}

interface Method {
  key: string
  label: string
  intro: string
  needsKeyNum?: string   // 숫자 키 라벨
  needsKeyText?: string  // 문자열 키 라벨
  encode: (t: string, k: string) => string
  decode: (t: string, k: string) => string
}
const METHODS: Method[] = [
  {
    key: 'caesar', label: '카이사르', intro: '키 칸수만큼 알파벳을 민다',
    needsKeyNum: '시프트(칸)',
    encode: (t, k) => caesar(t, parseInt(k || '3', 10) || 0),
    decode: (t, k) => caesar(t, parseInt(k || '3', 10) || 0, true),
  },
  {
    key: 'atbash', label: '아트바시', intro: 'A↔Z 역순 치환(키 없음·자기역원)',
    encode: (t) => atbash(t),
    decode: (t) => atbash(t),
  },
  {
    key: 'vigenere', label: '비즈네르', intro: '키워드 글자마다 다른 시프트',
    needsKeyText: '키워드',
    encode: (t, k) => vigenere(t, k || 'KEY'),
    decode: (t, k) => vigenere(t, k || 'KEY', true),
  },
  {
    key: 'rail', label: '레일펜스', intro: '지그재그 줄로 전치',
    needsKeyNum: '레일(줄 수)',
    encode: (t, k) => railFence(t, Math.max(2, parseInt(k || '3', 10) || 3)),
    decode: (t, k) => railFence(t, Math.max(2, parseInt(k || '3', 10) || 3), true),
  },
  {
    key: 'a1z26', label: 'A1Z26', intro: 'A=1...Z=26 숫자 치환',
    encode: (t) => a1z26(t),
    decode: (t) => a1z26Decode(t),
  },
  {
    key: 'morse', label: '모스 부호', intro: '점(.)·선(-)으로 변환',
    encode: (t) => morse(t),
    decode: (t) => morseDecode(t),
  },
]

// ───────────────────────── 유틸 ─────────────────────────
const LS = 'sry:tool:code-cipher-ref:'
const ALL = '__all__'
const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const rand = (n: number) => Math.floor(Math.random() * n)

// ───────────────────────── 한국어 조사 헬퍼 (받침 판정·결정론) ─────────────────────────
// 한글 마지막 글자의 종성(받침) 유무·ㄹ받침 여부를 보고 올바른 조사 하나를 골라 붙인다.
// 괄호 이중표기("을(를)") 절대 미노출.
function lastSyl(w: string): { has: boolean; rieul: boolean } | null {
  const s = (w || '').trim()
  if (!s) return null
  const code = s.charCodeAt(s.length - 1)
  if (code < 0xac00 || code > 0xd7a3) return null // 한글 음절이 아니면 판정 불가
  const jong = (code - 0xac00) % 28
  return { has: jong !== 0, rieul: jong === 8 } // 8 = ㄹ
}
const eulReul = (w: string) => { const t = lastSyl(w); return w + (t ? (t.has ? '을' : '를') : '를') }
const euRo = (w: string) => { const t = lastSyl(w); return w + (t ? (!t.has || t.rieul ? '로' : '으로') : '로') }
const waGwa = (w: string) => { const t = lastSyl(w); return w + (t ? (t.has ? '과' : '와') : '와') }
const imyeon = (w: string) => { const t = lastSyl(w); return w + (t ? (t.has ? '이면' : '면') : '면') } // "~이면 / ~면"

// 결정론 시드 RNG(완전 로컬). 같은 시드면 같은 결과.
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ───────────────────────── 암호 메시지(접선 지령문) 조합 풀 ─────────────────────────
// 첩보·미스터리·시대극 톤. 각 슬롯은 서로 독립이며 어떤 조합이라도 자연스러운 한 문장이 된다.
// 템플릿: "[시각], [장소]에서 [상대]와/과 만나 [물건]을/를 [방식](으)로 넘긴다. [신호]면 [지시]."
// 슬롯끼리 다른 슬롯을 전제하지 않도록 어휘를 골랐다. 모든 항목은 고유.
const MSG = {
  // 1) 시각 — 부사구(언제). 자연스러운 시간 표현.
  time: [
    '자정 정각', '동트기 직전', '해질 무렵', '셋째 종이 울릴 때', '장이 파한 뒤',
    '안개가 짙은 새벽', '달이 가장 높을 때', '첫차가 떠나기 전', '비가 그친 직후', '등불이 켜지는 시각',
    '썰물이 들 무렵', '예배 종이 멎은 뒤', '눈이 내리는 밤', '시장이 가장 붐빌 때', '교대가 바뀌는 틈',
    '닭이 두 번 울 때', '강 안개가 걷힐 무렵', '마지막 기차가 지난 뒤', '보름달이 뜬 밤', '바람이 잦아든 새벽',
    '정오 종소리에 맞춰', '가로등이 꺼지기 직전', '미사가 끝난 직후', '조수가 멈춘 순간', '서리가 내린 이른 아침',
  ],
  // 2) 장소 — "~에서" 앞에 붙는 명사. 장소 명사.
  place: [
    '낡은 시계탑 아래', '부두 셋째 창고', '헌책방 뒷방', '성당 종탑', '폐역 승강장',
    '강변 다리 밑', '시장 골목 끝 찻집', '온실 유리 너머', '극장 분장실', '등대지기 오두막',
    '공원 분수대 곁', '기차역 보관함 앞', '항구 등대 계단', '묘지 입구 비석', '여관 다락방',
    '운하 갑문 옆', '낚시터 버드나무', '대장간 뒷마당', '수도원 회랑', '강둑 버려진 나룻배',
    '광장 비둘기탑', '골동품점 진열창', '강 건너 물레방앗간', '성벽 무너진 틈', '거리 끝 가스등 아래',
  ],
  // 3) 접선 상대 — "~와/과" 앞 명사(사람). 직책·별칭(중립적).
  partner: [
    '잿빛 외투의 사내', '꽃 파는 노파', '절름발이 우편배달부', '말없는 뱃사공', '검은 장갑의 부인',
    '한쪽 눈 가린 악사', '늙은 시계공', '떠돌이 약장수', '항구의 짐꾼', '회색 모자의 신사',
    '벙어리 청소부', '붉은 머플러의 여인', '외다리 군인', '책 읽는 사서', '낡은 수첩의 기자',
    '안경 낀 회계원', '거리의 점쟁이', '수염 기른 푸주한', '하얀 앞치마의 제빵사', '비단 장수',
    '교회 종지기', '말 모는 마부', '항만의 등대지기', '저잣거리 엿장수', '문지기 노인',
  ],
  // 4) 물건 — "~을/를" 앞 명사(전달 대상). 첩보 소품.
  item: [
    '봉랍 찍은 편지', '낡은 회중시계', '접힌 지도 한 장', '가죽 표지 수첩', '은제 담뱃갑',
    '마른 꽃을 끼운 책', '필름 한 통', '도장이 든 주머니', '명함 묶음', '열쇠 한 벌',
    '깃펜과 잉크병', '구겨진 차표', '유리병에 든 쪽지', '동전 한 닢', '낡은 우표첩',
    '밀랍 인장', '암호표 한 장', '빛바랜 사진', '실로 묶은 서류', '향수병',
    '주소가 적힌 손수건', '금테 안경', '낡은 회계 장부', '봉인된 상자', '접은 신문 한 부',
  ],
  // 5) 전달 방식 — "~(으)로" 부사구. 수단·방법 명사.
  method: [
    '드보크', '브러시 패스', '북사이퍼 좌표', '눌 사이퍼 편지', '마이크로닷',
    '암구호 교환', '연기 신호', '봉화 한 단계', '모스 점멸', '수기 깃발',
    '분필 표식', '벽 두드림', '비둘기 전서', '책갈피 메모', '거울 반사 빛',
    '창문 등불', '신문 광고란', '암호 전보', '손수건 매듭', '동전 자국',
    '향수 냄새', '노래 가사', '카드 한 벌', '시장 호가 손짓', '교회 종소리',
  ],
  // 6) 신호 조건 — 절(만약 ~면). 명사로 끝나 "~면/이면"이 붙는다.
  signal: [
    '창에 붉은 천', '문 앞 분필 자국', '등불 세 번 깜빡임', '연기 두 줄기', '종소리 한 번 더 울림',
    '신문 접힌 모양', '화분 위치 바뀜', '문고리 손수건', '계단의 분필 동그라미', '창가의 시든 꽃',
    '비둘기 두 마리', '울타리 매듭', '벽의 새 낙서', '커튼 반쯤 닫힘', '램프 색이 푸름',
    '담장 위 돌멩이', '대문 빗장 풀림', '굴뚝 연기 없음', '간판 거꾸로 걸림', '우체통 분필 표시',
    '시계탑 멈춤', '깃발 절반 내림', '창문 두 번 두드림', '문지방의 흰 분필', '계단 끝 빨간 끈',
  ],
  // 7) 지시 — 종결문(명령/지시). 완결된 종결형 문장.
  order: [
    '즉시 자리를 뜨고 다시 접촉하지 말라', '예비 장소로 옮겨 사흘을 기다려라', '모든 기록을 태우고 잠적하라',
    '약속을 하루 뒤로 미뤄라', '대신 차선책을 실행하라', '연락책을 바꾸고 침묵하라',
    '물건을 그 자리에 두고 떠나라', '신원을 숨기고 관망하라', '경계를 풀지 말고 대기하라',
    '다음 신호가 올 때까지 움직이지 말라', '안전 가옥으로 즉시 복귀하라', '거래를 중단하고 흔적을 지워라',
    '약속 장소를 옮겨 다시 알려라', '암호를 갱신하고 통보하라', '모든 접촉을 끊고 도시를 떠나라',
    '예정대로 진행하되 미행을 살펴라', '받은 물건을 즉시 폐기하라', '동료에게만 조용히 전하라',
    '국경을 넘기 전에 변장을 마쳐라', '다음 달까지 활동을 멈추라', '즉시 모임을 해산하라',
    '늦지 말고 정시에 나타나라', '미끼를 흘려 추적을 따돌려라', '본부의 확인을 받기 전엔 실행하지 말라',
    '계획을 백지화하고 원점에서 다시 시작하라',
  ],
}
// 조합수(곱집합) — 표시·검증용.
const MSG_KEYS = ['time', 'place', 'partner', 'item', 'method', 'signal', 'order'] as const
const MSG_COMBOS = MSG_KEYS.reduce((n, k) => n * MSG[k].length, 1)
// 한 조합 결과(시드 결정론)를 자연스러운 한국어 지령문으로 조립.
function buildMessage(rng: () => number): string {
  const pick = (arr: string[]) => arr[Math.floor(rng() * arr.length)]
  const time = pick(MSG.time)
  const place = pick(MSG.place)
  const partner = pick(MSG.partner)
  const item = pick(MSG.item)
  const method = pick(MSG.method)
  const signal = pick(MSG.signal)
  const order = pick(MSG.order)
  return `${time}, ${place}에서 ${waGwa(partner)} 만나 ${eulReul(item)} ${euRo(method)} 넘긴다. ${imyeon(signal)} ${order}.`
}

// ───────────────────────── 컴포넌트 ─────────────────────────
export default function CodeCipherRef({ payload }: { payload?: Record<string, unknown> }) {
  const ctx = typeof payload?.genre === 'string' ? (payload.genre as string) : ''
  const seedText = typeof payload?.text === 'string' ? (payload.text as string) : ''

  const [tab, setTab] = useState<'dict' | 'play' | 'msg'>(() => {
    try { const v = localStorage.getItem(LS + 'tab'); if (v === 'dict' || v === 'play' || v === 'msg') return v } catch { /* ignore */ }
    return 'dict'
  })

  // ── 사전 상태 ──
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try { const v = localStorage.getItem(LS + 'cat'); if (v && (v === ALL || CATS.some((c) => c.key === v))) return v } catch { /* ignore */ }
    return ALL
  })
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [randomPick, setRandomPick] = useState<Flat | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // ── 실습기 상태 ──
  const [method, setMethod] = useState<string>(() => {
    try { const v = localStorage.getItem(LS + 'method'); if (v && METHODS.some((m) => m.key === v)) return v } catch { /* ignore */ }
    return 'caesar'
  })
  const [mode, setMode] = useState<'enc' | 'dec'>('enc')
  const [keyNum, setKeyNum] = useState('3')
  const [keyText, setKeyText] = useState('SECRET')
  const [plain, setPlain] = useState(seedText || 'ATTACK AT DAWN')

  // ── 메시지 생성기 상태 ──
  const [msgSeed, setMsgSeed] = useState<number>(() => 1 + rand(0x7fffffff))
  const msgText = useMemo(() => buildMessage(mulberry32(msgSeed)), [msgSeed])
  const rollMsg = useCallback(() => setMsgSeed(1 + rand(0x7fffffff)), [])

  const copyTimer = useRef<number | null>(null)
  const toastTimer = useRef<number | null>(null)

  useEffect(() => { try { localStorage.setItem(LS + 'tab', tab) } catch { /* ignore */ } }, [tab])
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'method', method) } catch { /* ignore */ } }, [method])

  // 언마운트 정리(타이머)
  useEffect(() => () => {
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
  }, [])

  const showCopied = useCallback((id: string) => {
    setCopied(id)
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500)
  }, [])
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2400)
  }, [])
  const copy = useCallback((text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text)
      .then(() => showCopied(id))
      .catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }, [showCopied])

  // ── 사전: 필터 ──
  const itemKey = (catKey: string, name: string) => `${catKey}::${name}`
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = cat === ALL ? flatAll() : flatAll().filter(({ cat: c }) => c.key === cat)
    if (q) {
      base = base.filter(({ item }) =>
        (item.name + ' ' + (item.era || '') + ' ' + item.def + ' ' + item.tags.join(' ') + ' ' +
          item.how.join(' ') + ' ' + item.example.join(' ') + ' ' + item.fiction.join(' ')).toLowerCase().includes(q))
    }
    return base
  }, [query, cat])

  const rollRandom = useCallback(() => {
    const pool = cat === ALL ? flatAll() : flatAll().filter(({ cat: c }) => c.key === cat)
    if (!pool.length) { setRandomPick(null); return }
    setRandomPick((prev) => {
      let pick = pool[rand(pool.length)]
      if (prev && pool.length > 1 && pick.item.name === prev.item.name) pick = pool[rand(pool.length)]
      setOpenKey(itemKey(pick.cat.key, pick.item.name))
      return pick
    })
  }, [cat])

  const entryPlain = (f: Flat) => {
    const t = f.item
    return [
      `[${f.cat.icon} ${f.cat.label}] ${t.name}${t.era ? ` (${t.era})` : ''}`,
      t.def,
      '· 작동 방식:' + t.how.map((x) => '\n   - ' + x).join(''),
      '· 실제 예시:' + t.example.map((x) => '\n   - ' + x).join(''),
      '· 활용·비틀기:' + t.fiction.map((x) => '\n   - ' + x).join(''),
    ].join('\n')
  }
  const entryHtml = (f: Flat) => {
    const t = f.item
    return [
      `<p><b>${escapeHtml(f.cat.icon + ' ' + f.cat.label)} · ${escapeHtml(t.name)}</b>${t.era ? ` <i>(${escapeHtml(t.era)})</i>` : ''}</p>`,
      `<p>${escapeHtml(t.def)}</p>`,
      `<p><b>작동 방식</b></p><ul>${t.how.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`,
      `<p><b>실제 예시</b></p><ul>${t.example.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`,
      `<p><b>활용·비틀기</b></p><ul>${t.fiction.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`,
    ].join('')
  }

  const addEntryToProject = (f: Flat) => {
    if (!hasProjectBridge()) return
    const id = addToProject({
      kind: 'text', root: 'research', folder: '암호 노트',
      title: `${f.item.name} (${f.cat.label})`,
      bodyHtml: entryHtml(f),
    })
    if (id) showToast(`자료 〈암호 노트〉에 ‘${f.item.name}’을(를) 추가했습니다.`)
  }
  const saveEntrySnippet = (f: Flat) => {
    addToLibrary('snippets', { text: entryPlain(f), source: '암호·은어·신호 사전', tags: ['암호', f.cat.label, ...f.item.tags] })
    showToast(`글감으로 ‘${f.item.name}’을(를) 저장했습니다.`)
  }
  const stashEntry = (f: Flat) => {
    addToStash({ kind: 'note', label: `${f.item.name} — ${f.cat.label}`, text: entryPlain(f) })
    showToast(`수집함에 ‘${f.item.name}’을(를) 담았습니다.`)
  }

  // ── 실습기: 변환 ──
  const cur = useMemo(() => METHODS.find((m) => m.key === method) || METHODS[0], [method])
  const keyArg = cur.needsKeyText ? keyText : (cur.needsKeyNum ? keyNum : '')
  const result = useMemo(() => {
    try { return mode === 'enc' ? cur.encode(plain, keyArg) : cur.decode(plain, keyArg) }
    catch { return '(변환 오류)' }
  }, [cur, mode, plain, keyArg])

  const playPlain = () => {
    const keyDesc = cur.needsKeyText ? `키워드 ${keyText || '(없음)'}` : cur.needsKeyNum ? `키 ${keyNum}` : '키 없음'
    return [
      `방식: ${cur.label} (${cur.intro}) · ${keyDesc} · ${mode === 'enc' ? '암호화' : '복호화'}`,
      `입력: ${plain}`,
      `결과: ${result}`,
    ].join('\n')
  }
  const playHtml = () => {
    const keyDesc = cur.needsKeyText ? `키워드 ${keyText || '(없음)'}` : cur.needsKeyNum ? `키 ${keyNum}` : '키 없음'
    return [
      `<p><b>🔐 ${escapeHtml(cur.label)}</b> — ${escapeHtml(cur.intro)} <i>(${escapeHtml(keyDesc)}, ${mode === 'enc' ? '암호화' : '복호화'})</i></p>`,
      `<p><b>입력</b>: ${escapeHtml(plain)}</p>`,
      `<p><b>결과</b>: ${escapeHtml(result)}</p>`,
    ].join('')
  }
  const swapInOut = () => { setPlain(result); setMode((m) => (m === 'enc' ? 'dec' : 'enc')) }

  const addPlayToProject = () => {
    if (!hasProjectBridge()) return
    const id = addToProject({
      kind: 'text', root: 'research', folder: '암호 노트',
      title: `암호 실습 — ${cur.label}`,
      bodyHtml: playHtml(),
    })
    if (id) showToast('자료 〈암호 노트〉에 실습 결과를 추가했습니다.')
  }
  const savePlaySnippet = () => {
    addToLibrary('snippets', { text: playPlain(), source: '암호·은어·신호 사전(실습기)', tags: ['암호', '실습', cur.label] })
    showToast('글감으로 실습 결과를 저장했습니다.')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const input: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }

  return (
    <div style={wrap}>
      <div style={hint}>
        역사적 암호·치환/전치·은어·수신호·봉화/연기 신호 등 <b>{TOTAL}종</b>을 정의·작동 방식·실제 예시·비틀기 아이디어와 함께 모았습니다.
        {ctx ? <>  <span style={{ color: 'var(--accent)' }}>· {ctx} 맥락</span></> : null}
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" aria-pressed={tab === 'dict'} onClick={() => setTab('dict')}
          style={{ borderColor: tab === 'dict' ? 'var(--accent)' : 'var(--border)', color: tab === 'dict' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="📚"/> 사전
        </button>
        <button className="minibtn" aria-pressed={tab === 'play'} onClick={() => setTab('play')}
          style={{ borderColor: tab === 'play' ? 'var(--accent)' : 'var(--border)', color: tab === 'play' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🔧"/> 암호 실습기
        </button>
        <button className="minibtn" aria-pressed={tab === 'msg'} onClick={() => setTab('msg')}
          style={{ borderColor: tab === 'msg' ? 'var(--accent)' : 'var(--border)', color: tab === 'msg' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🎲"/> 지령문 생성기
        </button>
      </div>

      {/* ───────────── 사전 탭 ───────────── */}
      {tab === 'dict' && (
        <>
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="이름·원리·태그로 검색 (예: 카이사르, 봉화, 은어, 모스)" style={input} />

          {/* 카테고리 펼침 필터 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button className="minibtn" aria-pressed={cat === ALL} onClick={() => setCat(ALL)}
              style={{ borderColor: cat === ALL ? 'var(--accent)' : 'var(--border)', color: cat === ALL ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e="✨"/> 전체
            </button>
            {CATS.map((c) => {
              const on = cat === c.key
              return (
                <button key={c.key} className="minibtn" aria-pressed={on} onClick={() => setCat(c.key)} title={c.desc}
                  style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                  <Emoji e={c.icon}/> {c.label}
                </button>
              )
            })}
          </div>

          {/* 동작 줄 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 무작위</button>
            <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}종 표시</span>
          </div>

          {/* 무작위 강조 카드 */}
          {randomPick && (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={randomPick.cat.icon}/> {randomPick.cat.label}</span>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{randomPick.item.name}</span>
                <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandomPick(null)}>✕</button>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>{randomPick.item.def}</div>
            </div>
          )}

          {/* 토스트 */}
          {toast && (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5 }}>✓ {toast}</div>
          )}

          {/* 목록(펼침) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>검색 결과가 없습니다. 다른 말로 찾아보세요.</div>
            ) : filtered.map(({ cat: c, item }) => {
              const k = itemKey(c.key, item.name)
              const open = openKey === k
              const cid = 'item:' + k
              return (
                <div key={k} style={card}>
                  <button onClick={() => setOpenKey(open ? null : k)}
                    style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: 8, width: '100%' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon}/> {c.label}</span>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>{open ? '▲' : '▼'}</span>
                  </button>
                  {item.era && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>{item.era}</div>}
                  <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 5 }}>{item.def}</div>

                  {open && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 3 }}><Emoji e="⚙️"/> 작동 방식</div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6 }}>
                          {item.how.map((x, i) => (
                            <li key={i} onClick={() => copy(x, cid + ':h' + i)} title="클릭하여 복사" style={{ cursor: 'pointer' }}>
                              {x}{copied === cid + ':h' + i ? <span style={{ color: 'var(--accent)', marginLeft: 6 }}>✓</span> : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 3 }}><Emoji e="🧩"/> 실제 예시</div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6 }}>
                          {item.example.map((x, i) => (
                            <li key={i} onClick={() => copy(x, cid + ':e' + i)} title="클릭하여 복사" style={{ cursor: 'pointer' }}>
                              {x}{copied === cid + ':e' + i ? <span style={{ color: 'var(--accent)', marginLeft: 6 }}>✓</span> : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 3 }}><Emoji e="🌀"/> 활용·비틀기</div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6 }}>
                          {item.fiction.map((x, i) => (
                            <li key={i} onClick={() => copy(x, cid + ':f' + i)} title="클릭하여 복사" style={{ cursor: 'pointer' }}>
                              {x}{copied === cid + ':f' + i ? <span style={{ color: 'var(--accent)', marginLeft: 6 }}>✓</span> : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="minibtn" onClick={() => copy(entryPlain({ cat: c, item }), cid)}>
                          {copied === cid ? <>✓ 복사됨</> : <><Emoji e="📋"/> 전체 복사</>}
                        </button>
                        <button className="minibtn" onClick={() => saveEntrySnippet({ cat: c, item })}><Emoji e="💾"/> 글감 저장</button>
                      </div>
                      {/* 연계 */}
                      <div className="linkbar">
                        <span className="linkbar-label">연계:</span>
                        <button className="linkbtn" disabled={!hasProjectBridge()}
                          title={hasProjectBridge() ? '이 항목을 자료 〈암호 노트〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}
                          onClick={() => addEntryToProject({ cat: c, item })}>
                          <Emoji e="📄"/> 프로젝트에 추가
                        </button>
                        <button className="linkbtn" disabled={!hasStash()}
                          title={hasStash() ? '수집함에 담기' : '수집함이 연결되어 있지 않습니다'}
                          onClick={() => stashEntry({ cat: c, item })}>
                          <Emoji e="📎"/> 수집함
                        </button>
                        <button className="linkbtn" onClick={() => openToolLinked('mystery-trick-ref')} title="트릭·범행수법 사전 열기"><Emoji e="🔍"/> 트릭 사전</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ───────────── 실습기 탭 ───────────── */}
      {tab === 'play' && (
        <>
          {/* 방식 선택 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {METHODS.map((m) => {
              const on = method === m.key
              return (
                <button key={m.key} className="minibtn" aria-pressed={on} onClick={() => setMethod(m.key)} title={m.intro}
                  style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                  {m.label}
                </button>
              )
            })}
          </div>
          <div style={hint}>{cur.intro}. (영문·숫자·공백 기준으로 동작합니다. 한글은 그대로 통과)</div>

          {/* 모드 + 키 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="minibtn" aria-pressed={mode === 'enc'} onClick={() => setMode('enc')}
                style={{ borderColor: mode === 'enc' ? 'var(--accent)' : 'var(--border)', color: mode === 'enc' ? 'var(--text)' : 'var(--muted)' }}><Emoji e="🔒"/> 암호화</button>
              <button className="minibtn" aria-pressed={mode === 'dec'} onClick={() => setMode('dec')}
                style={{ borderColor: mode === 'dec' ? 'var(--accent)' : 'var(--border)', color: mode === 'dec' ? 'var(--text)' : 'var(--muted)' }}><Emoji e="🔓"/> 복호화</button>
            </div>
            {cur.needsKeyNum && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
                {cur.needsKeyNum}
                <input type="number" value={keyNum} onChange={(e) => setKeyNum(e.target.value)} style={{ ...input, width: 80, padding: '6px 8px' }} />
              </label>
            )}
            {cur.needsKeyText && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
                {cur.needsKeyText}
                <input value={keyText} onChange={(e) => setKeyText(e.target.value)} placeholder="키워드" style={{ ...input, width: 140, padding: '6px 8px' }} />
              </label>
            )}
          </div>

          {/* 입력 */}
          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 5 }}>입력 ({mode === 'enc' ? '평문' : '암호문'})</div>
            <textarea value={plain} onChange={(e) => setPlain(e.target.value)} rows={3}
              placeholder={mode === 'enc' ? 'ATTACK AT DAWN' : '변환된 문자열을 붙여넣으세요'}
              style={{ ...input, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <button className="minibtn" onClick={swapInOut} title="결과를 입력으로 보내고 모드 전환"><Emoji e="🔁"/> 결과↔입력</button>
              <button className="minibtn" onClick={() => setPlain('')}>지우기</button>
            </div>
          </div>

          {/* 결과 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 5 }}>결과 ({mode === 'enc' ? '암호문' : '평문'})</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, wordBreak: 'break-all', whiteSpace: 'pre-wrap', minHeight: 22 }}>{result || <span style={{ color: 'var(--muted)' }}>(입력을 넣으면 결과가 표시됩니다)</span>}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <button className="minibtn" onClick={() => copy(result, 'play')}>{copied === 'play' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 결과 복사</>}</button>
              <button className="minibtn" onClick={savePlaySnippet}><Emoji e="💾"/> 글감 저장</button>
            </div>
            {/* 연계 */}
            <div className="linkbar" style={{ marginTop: 8 }}>
              <span className="linkbar-label">연계:</span>
              <button className="linkbtn" disabled={!hasProjectBridge()}
                title={hasProjectBridge() ? '실습 결과를 자료 〈암호 노트〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}
                onClick={addPlayToProject}>
                <Emoji e="📄"/> 프로젝트에 추가
              </button>
              <button className="linkbtn" disabled={!hasStash()}
                title={hasStash() ? '수집함에 담기' : '수집함이 연결되어 있지 않습니다'}
                onClick={() => { addToStash({ kind: 'note', label: `암호 실습 — ${cur.label}`, text: playPlain() }); showToast('수집함에 실습 결과를 담았습니다.') }}>
                <Emoji e="📎"/> 수집함
              </button>
              <button className="linkbtn" onClick={() => openToolLinked('mystery-trick-ref')} title="트릭·범행수법 사전 열기"><Emoji e="🔍"/> 트릭 사전</button>
            </div>
          </div>

          {/* 토스트(실습기에서도 표시) */}
          {toast && (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5 }}>✓ {toast}</div>
          )}

          <div style={hint}>※ 학습·창작용 시연입니다. 실제 보안에는 적합하지 않습니다(고전 암호는 모두 해독 가능).</div>
        </>
      )}

      {/* ───────────── 지령문 생성기 탭 ───────────── */}
      {tab === 'msg' && (
        <>
          <div style={hint}>
            첩보·미스터리·시대극용 <b>접선 지령문</b>을 무작위 조합으로 생성합니다.
            시각·장소·접선 상대·물건·전달 방식·신호·지시 7개 자리를 조합해
            총 <b>{MSG_COMBOS.toLocaleString()}가지</b>의 문장을 만들 수 있습니다.
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={rollMsg}><Emoji e="🎲"/> 새 지령문</button>
            <span style={{ ...hint, marginLeft: 'auto' }}>조합 가짓수 {MSG_COMBOS.toLocaleString()}</span>
          </div>

          {/* 생성 결과 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}><Emoji e="📨"/> 생성된 지령문</div>
            <div style={{ fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{msgText}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <button className="minibtn" onClick={() => copy(msgText, 'msg')}>{copied === 'msg' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
              <button className="minibtn" onClick={() => { addToLibrary('snippets', { text: msgText, source: '암호·은어·신호 사전(지령문 생성기)', tags: ['암호', '지령문', '접선'] }); showToast('글감으로 지령문을 저장했습니다.') }}><Emoji e="💾"/> 글감 저장</button>
            </div>
            {/* 연계 */}
            <div className="linkbar" style={{ marginTop: 8 }}>
              <span className="linkbar-label">연계:</span>
              <button className="linkbtn" disabled={!hasProjectBridge()}
                title={hasProjectBridge() ? '지령문을 자료 〈암호 노트〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}
                onClick={() => { if (!hasProjectBridge()) return; const id = addToProject({ kind: 'text', root: 'research', folder: '암호 노트', title: '접선 지령문', bodyHtml: `<p>${escapeHtml(msgText)}</p>` }); if (id) showToast('자료 〈암호 노트〉에 지령문을 추가했습니다.') }}>
                <Emoji e="📄"/> 프로젝트에 추가
              </button>
              <button className="linkbtn" disabled={!hasStash()}
                title={hasStash() ? '수집함에 담기' : '수집함이 연결되어 있지 않습니다'}
                onClick={() => { addToStash({ kind: 'note', label: '접선 지령문', text: msgText }); showToast('수집함에 지령문을 담았습니다.') }}>
                <Emoji e="📎"/> 수집함
              </button>
              <button className="linkbtn" onClick={() => openToolLinked('mystery-trick-ref')} title="트릭·범행수법 사전 열기"><Emoji e="🔍"/> 트릭 사전</button>
            </div>
          </div>

          {toast && (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5 }}>✓ {toast}</div>
          )}

          <div style={hint}>※ 각 자리는 서로 독립이며 어떤 조합이라도 자연스러운 한 문장이 됩니다. 조사(을/를·와/과·(으)로·(이)면)는 앞 글자 받침에 맞춰 자동으로 선택됩니다.</div>
        </>
      )}
    </div>
  )
}
