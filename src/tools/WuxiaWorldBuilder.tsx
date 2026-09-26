// 무협 세계관 빌더 — '강호(江湖)'를 세우기 위한 설정 항목을 도시에에 근거해 질문·입력으로 구조화한다.
//  · 좌측: 설정 섹션(시대·톤 / 세력 구도 / 무공 체계 / 기연·성장 규칙 / 사문·문파 / 지리·장소 / 은원·도의 / 함정 점검) 탐색.
//  · 우측: 섹션별 안내 질문 + 자유 입력. 각 질문에는 무협 도시에 기반 '예시 칩'(클릭 채우기/복사)과 무작위 추천.
//  · 상단: '강호 골격 자동 생성기' — 슬롯 풀에서 무작위 조합(잠금/재생성), 조합수 표시(1조 이상). 생성한 골격은 본문에 반영하거나 글감/장소 라이브러리로 보낼 수 있다.
//  · 연계: 📄 프로젝트에 추가(자료 › 세계관), 라이브러리(스니펫/장소), 관련 도구 열기. payload.genre 활용.
// 규칙: react 와 './linkbus' 만 import. 모든 데이터는 localStorage('sry:tool:wuxia-worldbuilder')에 JSON 자동 저장/복원. 언마운트 정리.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  addToProject,
  hasProjectBridge,
  addToLibrary,
  openToolLinked,
  Emoji,
  emojify,
} from './linkbus'

export const meta = { id: 'wuxia-worldbuilder', name: '무협 세계관 빌더', icon: '🏯', group: '세계관', genre: '무협', intro: '강호의 시대·세력·무공·기연·사문·지리·은원을 질문으로 구조화하는 설정 바이블', w: 740, h: 640 }

const LS_KEY = 'sry:tool:wuxia-worldbuilder'

// ───────────────────────── 설정 스키마(도시에 근거) ─────────────────────────
// 각 섹션은 안내 질문(필드)들로 구성. 필드마다 도움말 + 예시 칩(무협 특화·구체적).
interface Field {
  key: string
  label: string
  ph: string        // placeholder/도움말
  hint?: string     // 한 줄 작법 조언
  chips: string[]   // 클릭하면 입력에 채워지는(또는 이어붙는) 무협 특화 예시
  big?: boolean     // 긴 입력칸
}
interface Section {
  key: string
  icon: string
  label: string
  blurb: string
  fields: Field[]
}

const SECTIONS: Section[] = [
  {
    key: 'era',
    icon: '🏯',
    label: '시대·강호의 톤',
    blurb: '강호가 발 딛은 시대와 세계의 결을 먼저 못박는다. 사실계(인간 한계 유지)냐 선협계(비검·법보·장수)냐를 초반에 고정해야 무공·기연의 일관성이 산다.',
    fields: [
      {
        key: 'lineage', label: '계보·문체 모드', ph: '어느 무협의 결을 따를지(김용형 정통대협 / 고룡형 낭인추리 / 한무 신무협 / 웹소설 회귀먼치킨)',
        hint: '계보에 따라 페이싱·도덕관·결투 묘사가 갈린다. 한 줄로 못박자.',
        chips: [
          '김용형 정통대협 — 협지대자(俠之大者), 위국위민. 장중한 문체와 긴 합(合)',
          '고룡형 낭인추리 — 단문·분위기, 고독한 낭인, 찰나의 한 수로 승부',
          '한무 신무협(좌백·용대운) — 캐릭터 내면·문체 혁신, 강호의 회색지대',
          '웹소설 회귀먼치킨(화산귀환형) — 회차당 1 사이다, 미래지식 어드밴티지, 경악 리액션',
        ],
      },
      {
        key: 'world', label: '세계의 결(사실계/선협계)', ph: '중력·인간 한계를 지키는 사실계인가, 비검·법보·도술·장수가 통하는 선협계인가',
        hint: '여기서 정한 상한이 곧 무공·기연의 물리법칙이 된다.',
        chips: [
          '사실계 — 내공은 강하나 사람은 결국 죽는다. 검강(劍罡)까지가 인외(人外)의 끝',
          '반(半)선협 — 화경(化境) 고수는 강기로 바위를 가르되 하늘은 날지 못한다',
          '선협계 — 비검(飛劍)·법보(法寶)·반로환동(返老還童). 검선(劍仙)이 실존',
          '저무공(低武) — 무공은 희소하고 한 줄기 내공도 평생의 성취',
        ],
      },
      {
        key: 'period', label: '시대 배경', ph: '명·송·당풍의 막연한 고대인가, 가상 왕조인가, 무국적 강호인가',
        hint: '한무는 시대를 흐릿하게 처리하는 경우가 많다. 흐리되 일관되게.',
        chips: [
          '가상 왕조 — 어느 사서에도 없는 \'대정(大靖)\' 연간, 난세의 끝물',
          '명말(明末)풍 — 환관·붕당·왜구가 들끓고 관(官)은 썩었다',
          '무국적 강호 — 왕조명은 끝내 나오지 않고, 오직 강호의 시간만 흐른다',
          '왕조 교체기 — 옛 황실의 유민과 새 권력 사이, 무림이 저울추가 된다',
        ],
      },
      {
        key: 'guanwu', label: '관(官)과 강호의 거리', ph: '관무불가침(官武不可侵)이 지켜지는가, 황실·관이 강호에 손을 뻗는가',
        hint: '"관은 강호 일에 끼지 않는다"는 암묵 룰을 깨면 그 자체가 사건이 된다.',
        chips: [
          '관무불가침 엄수 — 포쾌(捕快)도 무림 분쟁엔 눈을 감는다',
          '암묵 룰 균열 — 금의위(錦衣衛)가 무림 고수를 비밀리에 사냥한다',
          '황실의 강호 개입 — 무림맹주 자리에 황실의 입김이 닿는다',
          '강호가 곧 권력 — 무림이 사실상 한 지역을 통치한다',
        ],
      },
    ],
  },
  {
    key: 'faction',
    icon: '⚔️',
    label: '세력 구도',
    blurb: '정파(正)-사파(邪)-마교(魔)의 삼분 구도와 구파일방·세가의 배치. 독자는 "이 사람이 강호에서 어느 위치인가"를 항상 가늠한다.',
    fields: [
      {
        key: 'order', label: '강호의 질서', ph: '무림맹·정파 연합 vs 마교의 큰 그림. 균형인가, 일극인가, 혼돈인가',
        hint: '세력 구도는 플롯 엔진이다. 누가 비급·서열을 쥐고 있는가.',
        chips: [
          '정사 균형 — 무림맹과 사도련(邪道聯)이 수십 년째 살얼음판 위에서 대치',
          '마교 봉인 후 — 백 년 전 정마대전(正魔大戰)에서 봉인된 천마신교의 그림자',
          '맹주 공백 — 전대 무림맹주가 의문사하고 차기 자리를 둘러싼 암투',
          '새외(塞外) 침공 임박 — 서장 밀교·북해빙궁이 중원을 노린다',
        ],
      },
      {
        key: 'sects', label: '구파일방·정파 축', ph: '소림·무당·화산·아미·곤륜·점창·청성·종남·공동 + 개방 중 무대의 중심은',
        hint: '작품마다 구성은 바뀐다. 주인공의 출신/적대 문파를 정해두자.',
        chips: [
          '소림(少林) — 천하무공출소림(天下武功出少林). 백팔나한진(羅漢陣)과 역근경(易筋經)',
          '무당(武當) — 태극(太極)의 유(柔)로 강(剛)을 제압, 도가의 본산',
          '화산(華山) — 매화검법(梅花劍法)의 검종(劍宗)과 기종(氣宗)의 해묵은 갈등',
          '개방(丐幇) — 천하제일의 정보망, 타구봉법(打狗棒法)과 항룡십팔장',
        ],
      },
      {
        key: 'evil', label: '사파·마교·새외', ph: '대척점 세력의 정체와 명분. 천마(天魔)는 누구이며 무엇을 원하는가',
        hint: '악을 \'강해서 악\'으로 두지 말 것. 마공의 대가·뒤틀린 신념을 줘라.',
        chips: [
          '천마신교(天魔神敎) — 교주는 천마, 흡성대법(吸星大法)으로 내공을 빨아들인다',
          '사천당문의 그늘 — 독(毒)과 암기(暗器)로 정파 질서 밖에서 군림',
          '혈교(血敎)·살막(殺幇) — 돈이면 누구든 죽이는 청부 살수 조직',
          '서장 밀교 — 라마승의 대수인(大手印)과 기이한 환술(幻術)',
        ],
      },
      {
        key: 'families', label: '세가(世家)', ph: '남궁(검)·사천당문(독·암기)·모용·황보·제갈(진법·지략) 중 등장 세가',
        hint: '세가는 핏줄·가문 정치의 무대. 가문의 비전(秘傳)과 가규(家規)를 줘라.',
        chips: [
          '남궁세가(南宮世家) — 제왕검형(帝王劍形), 검(劍)으로 일가를 이룬 명문',
          '사천당문(四川唐門) — 만천화우(滿天花雨)의 암기와 가전(家傳) 독술, 외인 불신',
          '제갈세가(諸葛世家) — 진법·기관·지략, 무(武)보다 지(智)로 강호를 읽는다',
          '모용세가(慕容世家) — 두인지환(斗轉星移), 옛 왕조 복원의 야심을 품은 가문',
        ],
      },
    ],
  },
  {
    key: 'martial',
    icon: '🌀',
    label: '무공 체계',
    blurb: '내공·심법의 메커니즘과 경지 위계. 위계 상한과 \'강함의 대가\'를 미리 설계하지 않으면 후반 파워 인플레로 긴장을 잃는다.',
    fields: [
      {
        key: 'qi', label: '내공·진기 메커니즘', ph: '단전(丹田)→운기조식(運氣調息)→경맥·혈도 운용을 어떻게 정량화할지',
        hint: '내공은 무공 위계의 측정자다. 축적·소모·고갈의 규칙을 정하라.',
        chips: [
          '단전에 진기를 축적, 기경팔맥(奇經八脈)을 뚫을수록 격이 오른다',
          '갑자(甲子, 60년) 단위로 내공을 센다 — "삼 갑자의 공력"',
          '심법마다 진기의 성질이 달라 충돌하면 주화입마(走火入魔)',
          '웹소설식 — 화후(火候)·경지를 상태창 수치로 명시화',
        ],
      },
      {
        key: 'tier', label: '경지 위계', ph: '삼류→이류→일류→절정→화경→현경→생사경 등 사다리와 \'천하제일\'의 의미',
        hint: '위계 상한을 박아두자. 끝없이 올리면 스케일이 통제 불능이 된다.',
        chips: [
          '삼류·이류·일류 / 절정(絶頂) / 초절정 / 화경(化境) — 화경이 인세의 끝',
          '기(氣)→강(罡) 위계 — 검기(劍氣)에서 검강(劍罡)으로, 강기는 형(形)을 갖는다',
          '현경(玄境)·생사경(生死境) — 자연과 합일, 손짓 한 번에 강기가 흩어진다',
          '천하제일인은 단 한 명, 그 위는 신화(전설의 三尊)로만 전해진다',
        ],
      },
      {
        key: 'signature', label: '핵심 신공(神功)·절학', ph: '천하제일을 가르는 단 하나의 절대무공. 그 원리·약점·상성',
        hint: '초식은 이름이 아니라 원리·약점·상성으로 굴려라. 멋진 한자만 나열 금물.',
        chips: [
          '심법 — 천마신공·구양신공·태극신공류의 근간 내공 심법',
          '검학 — 독고구검(獨孤九劍)처럼 \'초식의 빈틈을 찌르는\' 무초승유초(無招勝有招)',
          '금기무공 — 쓰면 단전이 부서지거나 수명을 태우는 반탄지력(反彈之力)',
          '상성 — 양강(陽剛) 무공은 음유(陰柔)에 막히고, 쾌검은 중검(重劍)에 부서진다',
        ],
      },
      {
        key: 'arts', label: '무공의 종류·변수', ph: '검/도/장/지/권, 보법·신법·경공, 독·암기·기문진(奇門陣) 등 정면 무력 밖의 변수',
        hint: '정면 무력만으로는 단조롭다. 독·진법·암기로 고수를 잡는 길을 열어두자.',
        chips: [
          '경공(輕功) — 답설무흔(踏雪無痕)·이형환위(移形換位)로 거리를 지운다',
          '점혈(點穴)·해혈 — 혈도를 짚어 적을 굳히고, 잘못 짚으면 폐인이 된다',
          '기문진(奇門陣) — 진법으로 다수가 절대고수를 가둔다(연수합격, 聯手合擊)',
          '당문의 독·암기 — 만천화우, 칠보단혼산(七步斷魂散), 만독불침(萬毒不侵)',
        ],
      },
    ],
  },
  {
    key: 'fortune',
    icon: '💎',
    label: '기연·성장 규칙',
    blurb: '약자→강자 서사는 무협의 심장. 단 기연엔 반드시 대가·제약을 붙여라. 위기마다 새 비급으로 해결하면 성취의 무게가 사라진다.',
    fields: [
      {
        key: 'trigger', label: '성장 트리거(기연)', ph: '주인공은 어떤 기연으로, 어떤 무공을, 어떤 대가로 얻는가',
        hint: '독자는 기연을 기대하면서 진부함을 경계한다 — 변주가 관건.',
        chips: [
          '절벽기연 — 추락 후 비동(秘洞)에서 전대고수의 유해와 심법서를 얻다',
          '영약·내단 — 만년하수오·공청석유·영물 내단으로 내공이 급상승',
          '전인(傳人) 지목 — 죽어가는 절대고수가 단전 폐인 직전의 주인공에게 유지를 넘기다',
          '회귀·환생 — 절대고수가 죽고 약자 시절로 돌아와 \'미래를 아는 강자\'가 되다',
        ],
      },
      {
        key: 'cost', label: '강함의 대가·리스크', ph: '주화입마·심마(心魔)·수명 소진·인간성 상실 등 성장의 비용',
        hint: '대가 없는 힘은 긴장을 죽인다. 강해질수록 무엇을 잃는가.',
        chips: [
          '주화입마 — 무리한 수련·상충 심법으로 폐인이 되거나 발광한다',
          '심마(心魔) — 마음의 그림자가 무공을 잠식, 이성을 갉아먹는다',
          '마공의 트레이드오프 — 흡성대법·화공(化功)은 강해지되 수명·인간성을 태운다',
          '금기무공의 반동 — 한 번 쓰면 단전이 깨지거나 폐인이 되는 최후의 수',
        ],
      },
      {
        key: 'constitution', label: '특이체질·운명', ph: '천맥(天脈)·구음절맥(九陰絶脈)·만독불침 같은 체질, 혹은 무재(無才)의 반전',
        hint: '"폐기 취급 막내가 알고 보니 특이체질"은 강한 클리셰 — 변주해 써라.',
        chips: [
          '구음절맥 — 스무 살을 못 넘기는 절맥, 그러나 음한지기(陰寒之氣)의 극에 닿는다',
          '천맥(天脈) — 백 년에 하나 나는 무공 천재의 경맥, 모두가 노린다',
          '만독불침 — 어릴 적 독에 절여져 모든 독이 통하지 않는 몸',
          '무재(無才)의 반전 — 단전이 막힌 폐인인 줄 알았으나 그 자체가 기연의 그릇',
        ],
      },
      {
        key: 'curve', label: '성장 곡선·페이싱', ph: '약자에서 천하제일까지의 단계와, 회차/장(章)당 비트',
        hint: '정통형은 수련 묘사 과다로 느려지고, 웹소설형은 사이다 남발로 긴장을 잃기 쉽다.',
        chips: [
          '계단식 — 새 지역=새 강적=새 무공의 반복 비트, 중간보스 계단',
          '사이클 — 도발받음 → 얕보임 → 압도적 반격 → 주변의 경악(리액션)',
          '중반 최저점 — 배신·동료의 죽음·정체 폭로로 추락 후 진각성',
          '귀은(歸隱) 지향 — 천하제일에 올라도 결국 강호를 떠나는 무협식 엔딩',
        ],
      },
    ],
  },
  {
    key: 'sect',
    icon: '🧧',
    label: '사문·문파·인물',
    blurb: '사부-제자 관계가 도덕과 플롯의 축이다. 사문의 원수=복수 동기, 문파 간 정치가 갈등의 엔진이 된다.',
    fields: [
      {
        key: 'master', label: '사문(師門)·사부', ph: '주인공의 사부는 누구이며, 사문은 어떤 처지인가(몰락·은거·명문)',
        hint: '"알고 보니 사부가/적이 부모·혈육"은 천룡팔부형 비극의 단골 — 떡밥을 심자.',
        chips: [
          '몰락한 작은 문파의 막내 제자, 사부는 옛 절정고수였으나 단전이 부서진 폐인',
          '은거 기인(奇人)의 마지막 전인, 강호는 사부가 죽은 줄 안다',
          '명문정파의 적전제자(嫡傳弟子)지만 사문의 위선에 환멸을 느낀다',
          '정체를 숨긴 마교/황실의 후예 — 사부조차 그 핏줄을 모른다',
        ],
      },
      {
        key: 'rank', label: '강호 서열·명성', ph: '주요 인물의 위치(천하제일인·무림맹주·절정고수·후기지수). 서열표가 있는가',
        hint: '독자는 늘 서열을 가늠한다. 후기지수(後起之秀) 랭킹·고수 비무 결과를 정해두자.',
        chips: [
          '무림맹주 — 정파의 정점, 그러나 그 자리는 정쟁의 한복판',
          '천하십대고수 / 사대세가주 — 강호가 인정한 공식 서열',
          '후기지수 — 차세대 영웅들의 랭킹(용봉지회, 龍鳳之會에서 겨룬다)',
          '숨은 고수 — 객잔 점소이·거지 노인이 실은 전대의 절대고수',
        ],
      },
      {
        key: 'disguise', label: '신분 위장·정체 은닉', ph: '주인공/주요 인물이 숨기는 진짜 정체와, 그것이 드러날 떡밥',
        hint: '정체 은닉은 후반 반전의 떡밥. 폭로 시점과 파장을 미리 설계하라.',
        chips: [
          '폐인인 척하는 절대고수 — 모두가 얕보지만 한 수에 판이 뒤집힌다',
          '명문 후예임을 숨긴 채 말단으로 잠입 — 가문의 원수를 안에서 친다',
          '마교 후계임을 숨기고 정파에 든 자 — 어느 쪽도 그를 믿지 못한다',
          '남장 여인 / 여장 — 비무대회와 강호 행보의 묘미이자 위기',
        ],
      },
      {
        key: 'women', label: '여성 인물·연(緣)', ph: '여협(女俠)·세가의 소저·마교의 성녀 등. 통속적 \'미녀의 호위\'를 넘어선 입체성',
        hint: '진산 이후 한무는 여성 관점을 들였다. 도구·트로피가 아닌 주체로 그려라.',
        chips: [
          '아미·화산의 여협 — 검을 든 동료이자 라이벌, 자기 사문의 대의를 진다',
          '세가의 소저 — 가문 정치의 장기말이기를 거부하고 강호로 나선다',
          '마교의 성녀(聖女) — 정파 주인공과 금기의 연(緣), 교(敎)와 마음 사이',
          '여성 살수 — 청부의 표적과 사랑에 빠지는 직업적 파국',
        ],
      },
    ],
  },
  {
    key: 'geo',
    icon: '🗺️',
    label: '지리·장소',
    blurb: '강호의 좌표. 객잔·표국·기루·비동·설산·장강이 사건의 무대가 된다. 지명을 흐리되 동선은 또렷하게.',
    fields: [
      {
        key: 'map', label: '주요 무대·동선', ph: '낙양·항주·사천·관외 등 주요 도시와, 주인공의 이동 경로',
        hint: '강호는 곧 길 위의 이야기. 출도(出道)에서 천하대전까지의 지리적 동선을 그려라.',
        chips: [
          '중원(中原) — 낙양·개봉·항주를 잇는 번화한 강호의 심장부',
          '사천(四川) — 험준한 촉도(蜀道), 당문과 아미·청성의 본거',
          '관외·새외 — 사막·설산·초원, 중원의 법이 닿지 않는 변경',
          '장강(長江)·운하 — 표국과 수적(水賊), 배 위에서 벌어지는 추격',
        ],
      },
      {
        key: 'places', label: '핵심 장소·기관(機關)', ph: '객잔·표국·기루·도박장·비동·금지(禁地) 등 사건이 벌어지는 곳',
        hint: '객잔의 시비 → 정체 드러남은 무협의 기본 비트. 장소마다 사건 훅을 달자.',
        chips: [
          '객잔(客棧) — 강호인이 모이는 정보·시비의 교차로, 첫 합이 벌어지는 곳',
          '표국(鏢局) — 호위업, 표물을 노린 녹림(綠林)·수적과의 격돌',
          '비동·금지(禁地) — 봉인된 무공과 기관진식(機關陣式)이 도사린 곳',
          '기루·도박장 — 흑도(黑道)와 정보가 흐르는 강호의 뒷골목',
        ],
      },
      {
        key: 'economy', label: '강호 경제·직업', ph: '표사·살수·정보상·의원·독인·대장장이 등 강호를 굴리는 생업',
        hint: '강호도 먹고산다. 돈·정보·신병(神兵)의 흐름이 곧 갈등의 동기다.',
        chips: [
          '표사(鏢師) — 목숨 걸고 표물을 옮기는 호위, 표국의 신용이 곧 자산',
          '개방의 정보망 — 거지 천하의 눈과 귀, 은자 몇 냥에 강호의 소문이 팔린다',
          '신병(神兵) 대장장이 — 명검·명도를 벼리는 은둔 장인, 그 작품을 두고 쟁탈전',
          '의원·독인(毒人) — 살리는 손과 죽이는 손, 한 끗 차이의 의술',
        ],
      },
      {
        key: 'event', label: '강호 이벤트', ph: '비무대회·화산논검(華山論劍)·무림대회 등 인물을 무대화하는 공식 사건',
        hint: '비무·논검은 서열 재편·등장인물 무대화 장치. 우승의 보상과 후폭풍을 정하라.',
        chips: [
          '화산논검(華山論劍) — 수년/수십 년마다 천하제일을 가리는 정상결전',
          '용봉지회(龍鳳之會) — 후기지수들이 겨루는 차세대 등용문',
          '무림대회 — 맹주 추대·세력 재편이 걸린 정파의 총회',
          '영웅대연(英雄大宴) — 명분 아래 모인 군웅, 그 자리에서 터지는 음모',
        ],
      },
    ],
  },
  {
    key: 'honor',
    icon: '🔥',
    label: '은원·도의·테마',
    blurb: '"은혜는 반드시 갚고, 원한도 반드시 갚는다(有恩必報, 有仇必報)." 협(俠)의 윤리와 은원의 사슬이 무협 갈등의 골격이다.',
    fields: [
      {
        key: 'revenge', label: '복수·은원(恩怨)의 사슬', ph: '주인공을 움직이는 복수의 원점(사문·가족 몰살)과, 그것이 천하대의로 확장되는 동선',
        hint: '개인 복수에서 출발해 천하대의로 확장되는 것이 무협의 정석 동선이다.',
        chips: [
          '멸문(滅門)의 밤 — 가문/사문이 하룻밤에 몰살, 유일한 생존자가 복수를 품는다',
          '배신의 사형(師兄) — 가장 믿던 자가 사문을 팔아넘긴 진범',
          '거대 음모 — 개인 복수의 끝에서 강호 전체를 삼키려는 흑막이 드러난다',
          '갚아야 할 은혜 — 목숨을 구해준 은인의 부탁이 새 사슬이 된다',
        ],
      },
      {
        key: 'code', label: '협(俠)의 윤리·도의', ph: '이 강호의 도덕률. 의리·신의·약자 보호가 어떻게 작동하고 어디서 무너지는가',
        hint: '"협지대자, 위국위민"의 정통 윤리부터 회색지대 신무협까지 톤을 정하라.',
        chips: [
          '협지대자(俠之大者) — 협의 큰 뜻은 나라와 백성을 위함에 있다(정통)',
          '강호도의 — 의리와 신의가 곧 목숨값, 약속은 천금(千金)보다 무겁다',
          '회색의 강호 — 정파도 위선을 품고 사파에도 의(義)가 있다(신무협)',
          '낭인의 도(道) — 대의보다 한 사람을 위한 검, 고룡식 개인 윤리',
        ],
      },
      {
        key: 'theme', label: '핵심 테마·질문', ph: '이 작품이 끝내 묻는 것(강함이란 무엇인가, 협이란, 귀은이란)',
        hint: '무공 너머의 한 문장이 작품을 기억하게 만든다.',
        chips: [
          '강함의 끝에서 무엇이 남는가 — 정상에 올라도 채워지지 않는 빈자리',
          '복수는 무엇을 되돌려 주는가 — 원수를 갚은 뒤의 공허',
          '협(俠)이란 결국 무엇인가 — 대의와 한 사람 사이의 선택',
          '강호를 떠날 수 있는가 — 귀은(歸隱)이라는 이름의 도피 혹은 완성',
        ],
      },
      {
        key: 'climax', label: '클라이맥스 관습', ph: '정점의 결투를 어떻게 닫을지(초식 대 초식, 찰나의 한 수, 대가 지불형 승리, 혈연 반전)',
        hint: '대가 지불형 승리(이기고도 잃는다)는 정통 한무가 사랑하는 비극적 정점이다.',
        chips: [
          '초식 대 초식 — 긴 합 끝에 마지막 한 수(절초·금기무공)로 승부',
          '찰나의 한 수 — 정적·심리전 후 단칼, 고룡식 변주',
          '대가 지불형 승리 — 금기무공으로 이기되 단전이 깨지고 폐인이 된다',
          '혈연·정체 반전 — 최종보스가 사부/혈육/은인이었다는 폭로와 결합한 결투',
        ],
      },
    ],
  },
  {
    key: 'pitfall',
    icon: '🚧',
    label: '함정 점검',
    blurb: '무협이 흔히 빠지는 덫을 미리 체크한다. 설계 단계에서 막아두면 후반에 무너지지 않는다.',
    fields: [
      {
        key: 'inflation', label: '파워 인플레이션 방지책', ph: '경지를 끝없이 올리지 않도록 위계 상한·강함의 대가를 어떻게 못박았는가',
        hint: '후반에 스케일·긴장이 통제 불능이 되는 1순위 원인. 상한을 명시하라.',
        chips: [
          '화경(化境)을 인세의 상한으로 고정, 그 위는 전설로만 존재',
          '내공 총량의 상한 — 갑자(甲子)에는 천장이 있고, 그 이상은 수명을 태운다',
          '천하제일은 단 한 명이라는 규칙으로 \'더 센 적\' 무한증식을 막는다',
          '강함마다 명확한 대가를 부과해 수치 경쟁 자체를 차단',
        ],
      },
      {
        key: 'fortune', label: '기연 남발 방지책', ph: '위기마다 새 비급·영약으로 해결하지 않도록 기연에 어떤 제약을 걸었는가',
        hint: '기연 남발은 성취의 무게를 지운다. 기연엔 반드시 대가·희소성을.',
        chips: [
          '기연은 작품당 손에 꼽게 — 영약은 강호에 몇 알 남지 않았다',
          '기연마다 대가 — 얻은 무공엔 반드시 부작용·미완(未完)의 결함이 있다',
          '기연은 \'주어지는\' 게 아니라 \'대가를 치르고 쟁취\'하는 것',
          '회귀의 미래지식도 점점 어긋난다 — 나비효과로 무력화',
        ],
      },
      {
        key: 'naming', label: '초식 작명 공허화 점검', ph: '멋진 한자 이름만 나열하지 않도록 무공에 원리·약점·상성·인과를 부여했는가',
        hint: '초식은 이름이 아니라 \'전술\'이다. 왜 그 초식이 그 상황을 푸는가.',
        chips: [
          '핵심 절학마다 \'원리 한 줄 + 약점 한 줄\'을 반드시 메모',
          '결투는 가위바위보 — 어떤 무공이 어떤 무공을 깨는지 상성표 작성',
          '초식 이름보다 \'무엇을 노리는 수\'인지를 먼저 적는다',
          '신무공 등장 시 반드시 한 번은 \'통하지 않는\' 장면을 넣어 균형',
        ],
      },
      {
        key: 'pacing', label: '페이싱·계약 위반 점검', ph: '성장 없는 전개·사이다 남발·수련 묘사 과다 등 독자 계약 위반 점검',
        hint: '약자→강자 성장은 무협의 계약. 성장이 멈추거나 긴장이 풀리면 계약 위반.',
        chips: [
          '정통형 — 초반 수련 묘사가 늘어지지 않게 사건과 교차편집',
          '웹소설형 — 사이다 사이에 \'질 수도 있다\'는 긴장을 의도적으로 배치',
          '회차/장마다 성장·떡밥회수·다음 훅 중 최소 하나는 닫는다',
          '정체·실력 숨김의 폭로 주기를 너무 늦추지 않는다',
        ],
      },
    ],
  },
]

// ───────────────────────── 강호 골격 자동 생성기 슬롯 풀 ─────────────────────────
// 슬롯 11개. 조합수 = 각 풀 크기의 곱(14·14·14·14·14·14·14·14·14·14·14 = 14^11) ≈ 4.05조 → 핵심 생성기 1조 이상 충족.
// (정확한 수치는 런타임에 combos = 모든 풀 크기의 곱으로 계산해 화면에 표기한다.)
interface Slot { key: string; label: string; icon: string; pool: string[] }
const SLOTS: Slot[] = [
  {
    key: 'era', label: '시대·정세', icon: '🏯', pool: [
      '가상 왕조 \'대정(大靖)\' 말년, 천하가 어지러운 난세',
      '명말풍 — 환관과 붕당이 조정을 좀먹고 변방엔 외적이 들끓는다',
      '무국적 강호 — 왕조명은 없고 오직 강호의 시간만 흐른다',
      '왕조 교체기 — 옛 황실 유민과 신권력 사이에 무림이 끼었다',
      '백 년 태평의 끝물 — 겉은 번화하나 물밑에서 균열이 번진다',
      '대기근의 시대 — 굶주림이 녹림과 흑도를 살찌운다',
      '북방 이민족의 남하로 중원 무림이 존망의 기로에 섰다',
      '정마대전(正魔大戰)이 끝난 직후의 폐허 같은 강호',
      '황실이 무림을 길들이려 금의위를 풀어놓은 살벌한 시절',
      '역병이 휩쓴 뒤, 신비 의술과 독술이 강호의 화두가 된 시대',
      '운하 무역이 폭증해 표국과 수적이 전성기를 맞은 시대',
      '봉인된 마교가 백 년 만에 꿈틀대기 시작한 불길한 해',
      '구파일방이 모처럼 손잡아 무림맹을 세운 직후의 어수선한 시기',
      '천하제일을 가르는 비급이 강호에 풀려 군웅이 들끓는 해',
    ],
  },
  {
    key: 'tone', label: '세계의 결', icon: '🌗', pool: [
      '사실계 — 검강(劍罡)까지가 인외의 끝, 사람은 결국 죽는다',
      '반(半)선협 — 화경 고수는 강기로 바위를 가르되 하늘은 못 난다',
      '선협계 — 비검·법보·반로환동, 검선(劍仙)이 실존한다',
      '저무공(低武) — 한 줄기 내공도 평생의 성취인 희소한 세계',
      '회색의 신무협 — 정사(正邪)의 경계가 흐릿한 어른의 강호',
      '낭만 무협 — 술·시·미인과 객잔의 정취가 무공만큼 중요하다',
      '추리 무협 — 결투보다 한 수와 진실, 분위기로 베는 세계',
      '먼치킨 웹소설 — 회차당 사이다와 경악 리액션이 굴러가는 결',
      '비극 무협 — 이기고도 잃는, 대가 지불형 결말을 향해 달린다',
      '무협+시스템 — 화후·경지가 상태창 수치로 명시되는 결',
      '정통 대하 — 협지대자(俠之大者), 장중한 문체와 긴 합의 세계',
      '쾌속 사이다 — 무시→증명→응징을 한 호흡에 닫는 결',
      '환협(幻俠) — 환술·기관·진법이 무공만큼 판을 흔드는 세계',
      '무협+의협 활극 — 빠른 합과 은원의 통쾌함이 앞서는 정통 활극의 결',
    ],
  },
  {
    key: 'order', label: '세력 구도', icon: '⚔️', pool: [
      '무림맹과 사도련이 수십 년째 살얼음판 위에서 대치한다',
      '전대 맹주의 의문사로 차기 맹주 자리를 둘러싼 암투가 한창',
      '봉인됐던 천마신교의 그림자가 다시 강호에 드리운다',
      '서장 밀교·북해빙궁 등 새외 세력이 중원 침공을 노린다',
      '구파일방이 늙고 굳은 사이, 신흥 세력이 판을 흔든다',
      '정파의 위선이 곪아 안에서부터 무너지는 중이다',
      '돈이면 누구든 죽이는 살막·혈교가 그림자 권력을 쥐었다',
      '사대세가가 무림맹을 제치고 강호의 실세로 떠올랐다',
      '겉으론 태평, 실은 한 흑막이 모든 세력을 조종하고 있다',
      '오랜 정마(正魔)의 휴전이 단 하나의 사건으로 깨지려 한다',
      '관(官)이 금의위를 앞세워 무림을 길들이려 한다',
      '녹림과 수적이 연합해 정파 질서 밖의 또 다른 강호를 세웠다',
      '천하제일인이 홀로 군림해, 누구도 그 그늘을 벗어나지 못한다',
      '정·사·마 삼분(三分)이 절묘하게 균형을 이뤄 누구도 먼저 못 움직인다',
    ],
  },
  {
    key: 'hero', label: '주인공의 처지', icon: '🧧', pool: [
      '몰락한 작은 문파의 막내 제자, 사부는 단전이 부서진 폐인',
      '멸문의 밤에서 살아남은 유일한 혈육, 복수를 품은 소년',
      '폐인 취급받던 무재(無才)지만 그 자체가 기연의 그릇이었다',
      '죽었다 회귀한 전대의 절대고수, 약자 시절로 돌아왔다',
      '정체를 숨긴 마교/황실의 후예, 사부조차 핏줄을 모른다',
      '명문정파의 적전제자지만 사문의 위선에 환멸을 느낀다',
      '스무 살을 못 넘기는 구음절맥의 몸으로 강호에 나선다',
      '객잔 점소이로 위장한, 모두가 죽은 줄 아는 은거 기인',
      '은인의 유언 하나로 강호에 끌려 나온 평범한 의원',
      '남장(男裝)으로 정체를 숨긴 채 비무대회에 나선 여협',
      '청부의 표적과 사랑에 빠져버린 살막의 여성 살수',
      '천맥(天脈)을 타고나 모두가 노리는, 쫓기는 후기지수',
      '표국의 평범한 표사였다가 표물 강탈 사건에 휘말린 자',
      '마교 교주의 버려진 자식, 정파에서 자라 자기 핏줄을 모른다',
    ],
  },
  {
    key: 'fortune', label: '기연·성장 트리거', icon: '💎', pool: [
      '절벽 추락 후 비동에서 전대고수의 유해와 심법서를 얻다',
      '만년하수오·공청석유를 복용해 내공이 갑자(甲子) 단위로 솟다',
      '죽어가는 절대고수가 단전 폐인 직전의 그에게 유지를 넘기다',
      '회귀한 미래지식으로 영약과 비급의 위치를 미리 안다',
      '봉인된 금기무공을 우연히 익혀 강해지나 수명을 태운다',
      '독에 절여진 몸이 만독불침(萬毒不侵)으로 각성하다',
      '잃어버린 가문 비전(秘傳)을 되찾아 핏줄의 무공을 깨우다',
      '괴팍한 거지/노승에게 떠밀려 천하제일의 절학을 배우다',
      '폐기된 단전을 기연의 영물 내단으로 다시 뚫어내다',
      '적의 흡성대법에 빨렸다가 도리어 그 내공을 역으로 흡수하다',
      '꿈/심상 속에서 전대 종사(宗師)의 검리(劍理)를 전수받다',
      '신병(神兵)을 손에 넣자 검이 스스로 주인의 무공을 이끈다',
      '깨진 비급의 잃어버린 후반부를 적의 몸에서 찾아 완성하다',
      '생사의 위기에서 경맥이 역(逆)으로 뚫리며 환골탈태(換骨奪胎)하다',
    ],
  },
  {
    key: 'cost', label: '강함의 대가', icon: '🔥', pool: [
      '무리한 수련과 상충 심법으로 주화입마의 위험을 안고 산다',
      '심마(心魔)가 무공을 잠식해 점점 이성을 갉아먹는다',
      '마공은 강해지되 수명과 인간성을 함께 태운다',
      '금기무공은 한 번 쓰면 단전이 부서지는 최후의 한 수다',
      '내공을 끌어올릴수록 봉인된 살심(殺心)이 함께 깨어난다',
      '특이체질의 대가로 정해진 수명이 빠르게 줄어든다',
      '강해질수록 옛 자신과 멀어져 사람을 잃어간다',
      '힘의 원천이 적에게 약점으로 노출돼 끝내 인질이 된다',
      '익힌 절학이 미완(未完)이라 결정적 순간 반드시 빈틈을 드러낸다',
      '내공을 쓸 때마다 잊고 싶은 전생/과거의 기억이 되살아난다',
      '강함의 대가로 감정이 메말라 사랑하는 법을 잊어간다',
      '봉인을 풀 때마다 수명이 한 갑자(甲子)씩 깎여 나간다',
      '힘이 본래 주인(전대고수)의 집념을 함께 끌어와 잠식당한다',
      '경지를 끌어올릴 때마다 잠들어야 할 옛 상처가 다시 욱신거린다',
    ],
  },
  {
    key: 'revenge', label: '갈등의 원점', icon: '⛓️', pool: [
      '하룻밤에 멸문당한 가문/사문, 그 진범을 쫓는다',
      '가장 믿던 사형(師兄)이 사문을 팔아넘긴 배신이 드러난다',
      '개인 복수의 끝에서 강호를 삼키려는 거대 음모가 모습을 드러낸다',
      '천하제일을 가르는 비급/신병을 둘러싼 강호의 쟁탈전',
      '목숨을 구해준 은인의 부탁이 풀 수 없는 새 사슬이 된다',
      '정파의 위선과 사파의 의(義)가 뒤집히는 진실을 마주한다',
      '봉인된 마교가 풀려나며 천하가 존망의 기로에 선다',
      '새외 세력의 중원 침공을 막을 마지막 방패가 되어야 한다',
      '사랑하는 이가 적의 핏줄/세력에 속해 있다는 비극적 진실',
      '잊힌 옛 왕조의 보물/혈통을 둘러싼 강호와 황실의 충돌',
      '독·역병을 무기로 강호를 무릎 꿇리려는 흑막의 음모',
      '서로가 서로의 원수임을 모른 채 동행하게 된 두 사람',
      '사문의 절학(絶學)을 탐낸 자들에게 사부가 죽임당했다',
      '강호 전체를 속인 거짓 영웅의 가면을 벗기는 단 한 사람의 싸움',
    ],
  },
  {
    key: 'climax', label: '정점의 결착', icon: '🏆', pool: [
      '긴 합 끝의 마지막 한 수(절초·금기무공)로 천하제일을 가른다',
      '정적과 심리전 끝의 단 한 칼, 고룡식 찰나의 승부',
      '금기무공으로 이기되 단전이 깨져 폐인이 되는 비극적 승리',
      '최종보스가 사부/혈육/은인이었다는 폭로와 함께 칼을 맞댄다',
      '진법·연수합격으로 절대강자를 다수가 무너뜨린다',
      '개인 복수가 천하대의와 겹치며 강호 전체의 결전으로 폭발한다',
      '압도적 격차의 확인사살과 적·군중의 경악으로 닫는다',
      '독·암기·자기희생으로 정면 무력의 절대자를 뒤집는다',
      '천하제일에 오른 그날, 모든 것을 버리고 귀은(歸隱)한다',
      '봉인의 대가로 자신을 희생해 마교/재앙을 다시 가둔다',
      '승부를 가르지 않은 채, 두 절대고수가 서로를 인정하고 갈라선다',
      '천하대전의 한복판, 개인의 검 한 자루가 전세를 가른다',
      '상성의 빈틈을 찌르는 무초승유초(無招勝有招)로 절대고수를 꺾는다',
      '강호 전체가 지켜보는 비무대(比武臺) 위에서 정정당당히 패권을 가른다',
    ],
  },
  {
    key: 'sign', label: '주인공의 별호·무기', icon: '🗡️', pool: [
      '검 한 자루를 쓰는 \'무명검객(無名劍客)\' — 이름을 끝내 밝히지 않는다',
      '도(刀)를 쓰는 \'혈도(血刀)\' — 한 번 뽑으면 피를 보고야 거둔다',
      '쾌검(快劍)의 달인 \'섬광(閃光)\' — 검을 본 자는 이미 베인 뒤다',
      '중검(重劍)을 쓰는 \'태산(泰山)\' — 무겁고 느리되 막을 길이 없다',
      '맨손 권각(拳脚)의 \'철권(鐵拳)\' — 병기를 들지 않는 자존심',
      '독·암기를 쓰는 \'독공자(毒公子)\' — 손이 닿기 전에 승부가 난다',
      '부채를 든 \'절선(折扇)\' — 문사(文士)의 풍모 아래 살수의 손',
      '창(槍)을 쓰는 \'일점홍(一點紅)\' — 단 한 점을 찔러 끝낸다',
      '채찍·연검(軟劍)을 쓰는 \'유사(柔絲)\' — 형(形)이 없어 읽히지 않는다',
      '쌍검(雙劍)의 \'쌍성(雙星)\' — 좌우가 한 몸처럼 어우러진다',
      '지(指)·장(掌)법의 \'무형수(無形手)\' — 기(氣)로 멀리서 친다',
      '활·비도(飛刀)의 \'소이비도\' — 보이지 않는 한 칼, 빗나간 적이 없다',
      '신병(神兵)을 든 \'천검(天劍)\' — 검이 주인을 고른다는 전설의 명검',
      '봉(棍)·곤을 휘두르는 \'파산(破山)\' — 우직한 한 방으로 진세를 무너뜨린다',
    ],
  },
  {
    key: 'resource', label: '핵심 자원·비전(秘傳)', icon: '📜', pool: [
      '천하제일을 가르는 단 하나의 신공(神功) 비급이 쟁탈의 중심이다',
      '강호에 몇 알 남지 않은 영약·내단이 모두의 표적이 된다',
      '주인을 고른다는 신병이기(神兵利器)가 핏빛 인연을 부른다',
      '개방의 천하제일 정보망이 강호의 모든 비밀을 쥐고 있다',
      '봉인된 마교의 마공서(魔功書)가 끝내 세상에 풀려난다',
      '잃어버린 가문의 가전(家傳) 비급이 핏줄에게만 열린다',
      '천하의 명검을 벼리는 은둔 장인과 그 마지막 작품',
      '만독불침의 비밀을 쥔 사천당문의 가전 독술과 해독제',
      '진법·기관의 도면을 독점한 제갈세가의 두뇌',
      '전대 절대고수가 남긴 \'무공의 지도\'와 그 봉인 장소',
      '황실 내탕고(內帑庫)의 보물과 그에 얽힌 옛 무림의 빚',
      '강호의 판도를 바꿀 영물(靈物)과 그 둥지를 둘러싼 다툼',
      '천하 고수들의 무공을 집대성한 \'무경(武經)\'의 행방',
      '경맥을 단숨에 뚫어준다는 전설의 영천(靈泉)과 그 입구를 가린 금제',
    ],
  },
  {
    key: 'secret', label: '숨은 비밀·반전 떡밥', icon: '🔮', pool: [
      '최종보스가 실은 주인공의 사부/혈육/은인이다',
      '존경받는 정파의 거두가 모든 음모의 흑막이었다',
      '주인공의 핏줄이 사실은 멸문의 원흉인 가문/마교다',
      '죽은 줄 알았던 전대고수가 정체를 숨기고 곁에 있다',
      '주인공이 익힌 무공이 곧 봉인된 재앙의 열쇠였다',
      '강호를 흔든 사건은 한 사람의 복수극이 꾸민 연극이었다',
      '동행하던 미녀/동료가 적이 심어둔 첩자였다',
      '주인공의 회귀/기억에 누군가 손을 댄 거짓이 섞여 있다',
      '두 적대 세력이 실은 한 뿌리에서 갈라진 형제 문파다',
      '천하제일인의 자리가 대대로 \'바꿔치기\'되어 온 가짜였다',
      '봉인된 마교는 사실 강호를 지켜온 마지막 방패였다',
      '주인공이 쫓던 원수는 이미 다른 가면을 쓰고 곁에 있었다',
      '예언/비급에 적힌 \'천하제일\'은 주인공이 아니라 그의 적이다',
      '주인공이 의지하던 비급의 마지막 장이 일부러 위조된 함정이었다',
    ],
  },
]

// 천 단위 구분 표기(조합수)
function fmtNum(n: number): string {
  try { return n.toLocaleString('ko-KR') } catch { return String(n) }
}
// 큰 수 한국어 단위(억/조) 보조 표기
function koUnit(n: number): string {
  if (n >= 1e12) return `약 ${(n / 1e12).toFixed(n >= 1e13 ? 0 : 1)}조`
  if (n >= 1e8) return `약 ${(n / 1e8).toFixed(n >= 1e9 ? 0 : 1)}억`
  if (n >= 1e4) return `약 ${(n / 1e4).toFixed(0)}만`
  return fmtNum(n)
}

function randIdx(len: number): number {
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const a = new Uint32Array(1)
      crypto.getRandomValues(a)
      return a[0] % len
    }
  } catch {}
  return Math.floor(Math.random() * len)
}

// HTML 이스케이프(프로젝트 bodyHtml 용)
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 받침 유무로 조사를 골라 붙인다(앞 글자가 한글일 때만 판별, 아니면 받침 없음 취급).
// 마지막 '실제 글자'를 찾기 위해 끝의 인용부호·괄호 등은 건너뛴다.
function hasJongseong(word: string): boolean {
  const m = word.match(/[가-힣]['"’”」』)\]】〉》]*$/)
  const ch = m ? m[0].charAt(0) : ''
  if (!ch) return false
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false
  return (code - 0xac00) % 28 !== 0
}
// 을/를, 이/가, 은/는, 으로/로 를 받침에 맞춰 출력
function josa(word: string, withBat: string, woBat: string): string {
  return word + (hasJongseong(word) ? withBat : woBat)
}

type Answers = Record<string, string>           // `${section}.${field}` → 값
type SkeletonState = Record<string, number>     // slot.key → 선택 인덱스
type LockState = Record<string, boolean>        // slot.key → 잠금

interface Store {
  answers: Answers
  skeleton: SkeletonState
  locks: LockState
  activeSection: string
}

function defaultSkeleton(): SkeletonState {
  const s: SkeletonState = {}
  for (const slot of SLOTS) s[slot.key] = randIdx(slot.pool.length)
  return s
}

function load(): Store {
  const base: Store = { answers: {}, skeleton: {}, locks: {}, activeSection: SECTIONS[0].key }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { ...base, skeleton: defaultSkeleton() }
    const p = JSON.parse(raw)
    const answers: Answers = {}
    if (p && p.answers && typeof p.answers === 'object') {
      for (const k of Object.keys(p.answers)) if (typeof p.answers[k] === 'string') answers[k] = p.answers[k]
    }
    const skeleton: SkeletonState = {}
    for (const slot of SLOTS) {
      const v = p?.skeleton?.[slot.key]
      skeleton[slot.key] = typeof v === 'number' && v >= 0 && v < slot.pool.length ? v : randIdx(slot.pool.length)
    }
    const locks: LockState = {}
    for (const slot of SLOTS) locks[slot.key] = !!p?.locks?.[slot.key]
    const activeSection = SECTIONS.some((s) => s.key === p?.activeSection) ? p.activeSection : SECTIONS[0].key
    return { answers, skeleton, locks, activeSection }
  } catch {
    return { ...base, skeleton: defaultSkeleton() }
  }
}

export default function WuxiaWorldBuilder({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState<Store>(() => load())
  const [query, setQuery] = useState('')
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')
  const [showSkeleton, setShowSkeleton] = useState(true)
  // 사용자 정의 항목(이름은 사용자가 지정, 값은 직접 입력) + 고정 '기타' 자유 입력칸.
  // 무작위 생성(전체 재생성) 시 값/기타는 비우되 항목 정의(라벨)는 유지한다.
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')

  const mounted = useRef(true)
  const copyTimer = useRef<number | null>(null)
  const noteTimer = useRef<number | null>(null)

  // payload.genre — 다른(공통) 도구 동선에서 장르가 넘어오면 안내에 반영(무협 전용 도구라 보조 용도).
  const genreHint = typeof payload?.genre === 'string' ? (payload.genre as string) : meta.genre

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (copyTimer.current) { clearTimeout(copyTimer.current); copyTimer.current = null }
      if (noteTimer.current) { clearTimeout(noteTimer.current); noteTimer.current = null }
    }
  }, [])

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(store))
    } catch {
      if (mounted.current) flashNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.')
    }
  }, [store])

  // 조합수 = 모든 슬롯 풀 크기의 곱
  const combos = useMemo(() => SLOTS.reduce((acc, s) => acc * s.pool.length, 1), [])

  const flashCopied = (msg: string) => {
    setCopied(msg)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => { if (mounted.current) setCopied('') }, 1600)
  }
  const flashNote = (msg: string) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => { if (mounted.current) setNote('') }, 4200)
  }

  const copyText = useCallback(async (text: string, okMsg: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      flashCopied(okMsg)
    } catch {
      flashCopied('복사 실패 — 직접 선택해 복사하세요.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 답안 입력 ──
  const fkey = (sec: string, field: string) => `${sec}.${field}`
  const getAns = (sec: string, field: string) => store.answers[fkey(sec, field)] || ''
  const setAns = (sec: string, field: string, value: string) => {
    setStore((s) => ({ ...s, answers: { ...s.answers, [fkey(sec, field)]: value } }))
  }
  // 예시 칩 → 입력에 채움(비어있으면 대체, 내용 있으면 줄바꿈으로 이어붙임)
  const applyChip = (sec: string, field: string, chip: string) => {
    setStore((s) => {
      const k = fkey(sec, field)
      const cur = s.answers[k] || ''
      const next = cur.trim() ? cur.replace(/\s*$/, '') + '\n' + chip : chip
      return { ...s, answers: { ...s.answers, [k]: next } }
    })
  }

  const setActiveSection = (key: string) => setStore((s) => ({ ...s, activeSection: key }))

  // ── 사용자 정의 항목 + 기타 ──
  const addCustom = () => {
    let label = ''
    try { label = (window.prompt('추가할 항목의 이름을 입력하세요 (예: 화폐·언어·금기)', '') || '').trim() } catch {}
    if (!label) return
    const id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    setCustom((arr) => [...arr, { id, label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) => {
    setCustom((arr) => arr.map((it) => (it.id === id ? { ...it, value } : it)))
  }
  const removeCustom = (id: string) => {
    setCustom((arr) => arr.filter((it) => it.id !== id))
  }
  // 사용자 정의 항목 → 다른 도구로 보내는 fields 맵 보강(값이 있는 항목만, 키=라벨 그대로). 기타도 비어있지 않으면 'etc'로.
  const mergeCustomFields = (base?: Record<string, string>): Record<string, string> => {
    const f: Record<string, string> = { ...(base || {}) }
    for (const it of custom) {
      const v = it.value.trim()
      const k = it.label.trim()
      if (k && v) f[k] = v
    }
    if (etc.trim()) f.etc = etc.trim()
    return f
  }
  // 복사/요약 텍스트용 — 사용자 정의 항목·기타를 줄 단위로(있을 때만).
  const customLines = (): string[] => {
    const out: string[] = []
    for (const it of custom) {
      const v = it.value.trim()
      if (it.label.trim() && v) out.push(`${it.label.trim()}: ${v}`)
    }
    if (etc.trim()) out.push(`기타: ${etc.trim()}`)
    return out
  }

  // ── 강호 골격 생성기 ──
  const rerollAll = () => {
    setStore((s) => {
      const next: SkeletonState = { ...s.skeleton }
      for (const slot of SLOTS) if (!s.locks[slot.key]) next[slot.key] = randIdx(slot.pool.length)
      return { ...s, skeleton: next }
    })
    // 무작위 생성 시 사용자 정의 항목의 '값'과 '기타'는 비우되, 항목(이름) 정의는 유지한다.
    setCustom((arr) => arr.map((it) => ({ ...it, value: '' })))
    setEtc('')
  }
  const rerollOne = (key: string) => {
    setStore((s) => ({ ...s, skeleton: { ...s.skeleton, [key]: randIdx(SLOTS.find((x) => x.key === key)!.pool.length) } }))
  }
  const toggleLock = (key: string) => {
    setStore((s) => ({ ...s, locks: { ...s.locks, [key]: !s.locks[key] } }))
  }

  const skeletonLines = (): { label: string; icon: string; text: string }[] =>
    SLOTS.map((slot) => ({ label: slot.label, icon: slot.icon, text: slot.pool[store.skeleton[slot.key] ?? 0] }))

  const skeletonText = (): string =>
    skeletonLines().map((l) => `${l.icon} ${l.label}: ${l.text}`).join('\n')

  const skeletonTitle = (): string => {
    // 시대 + 주인공 처지 앞머리를 제목 후보로
    const era = SLOTS[0].pool[store.skeleton.era ?? 0]
    const hero = SLOTS[3].pool[store.skeleton.hero ?? 0]
    return `강호 골격 — ${era.split(/[—,(]/)[0].trim()} / ${hero.split(/[,(]/)[0].trim()}`
  }

  // 생성한 골격을 본문(섹션 답안)에 반영 — 슬롯을 대응 섹션 필드에 채운다(빈 필드는 대체, 내용 있으면 이어붙임).
  // sign·resource·secret 슬롯은 직접 대응 필드가 없어 별호·자원·반전 칸이 신설되기 전까지는 반영 대상에서 제외한다.
  const SKELETON_MAP: Record<string, [string, string]> = {
    era: ['era', 'period'],
    tone: ['era', 'world'],
    order: ['faction', 'order'],
    hero: ['sect', 'master'],
    fortune: ['fortune', 'trigger'],
    cost: ['fortune', 'cost'],
    revenge: ['honor', 'revenge'],
    climax: ['honor', 'climax'],
  }
  const applySkeletonToAnswers = () => {
    setStore((s) => {
      const ans = { ...s.answers }
      let filled = 0
      for (const slot of SLOTS) {
        const dest = SKELETON_MAP[slot.key]
        if (!dest) continue
        const k = fkey(dest[0], dest[1])
        const text = slot.pool[s.skeleton[slot.key] ?? 0]
        ans[k] = (!ans[k] || !ans[k].trim()) ? text : ans[k].replace(/\s*$/, '') + '\n' + text
        filled++
      }
      window.setTimeout(() => { if (mounted.current) flashNote(`골격 ${filled}개 항목을 설정 본문에 반영했어요. (기존 입력은 아래에 이어붙임)`) }, 0)
      return { ...s, answers: ans }
    })
  }

  // 골격을 글감(스니펫) 라이브러리로
  const skeletonToLibrary = () => {
    addToLibrary('snippets', {
      text: skeletonTitle() + '\n\n' + skeletonText(),
      source: '무협 세계관 빌더 · 강호 골격',
      tags: ['무협', '세계관', '강호골격'],
    })
    flashCopied('강호 골격을 글감 라이브러리에 담았어요')
  }

  // 골격의 '주요 무대'를 장소 라이브러리로(시대+세력 톤을 분위기로)
  const skeletonPlaceToLibrary = () => {
    const era = SLOTS[0].pool[store.skeleton.era ?? 0]
    const order = SLOTS[2].pool[store.skeleton.order ?? 0]
    const tone = SLOTS[1].pool[store.skeleton.tone ?? 0]
    const placeName = '강호(江湖) — ' + era.split(/[—,(]/)[0].trim()
    addToLibrary('places', {
      name: placeName,
      kind: '왕국·국가',
      mood: tone,
      history: era,
      rules: order,
      source: '무협 세계관 빌더',
      // 정규(표준) 장소 키로 맞춘 fields — 받는 허브(배경 설정집)에서 기본 칸에 들어가게.
      // 사용자 정의 항목(값이 있는 것만, 키=라벨)과 기타(etc)를 함께 실어 보낸다.
      fields: mergeCustomFields({
        name: placeName,
        kind: '왕국·국가',
        atmosphere: tone,   // 분위기 → atmosphere
        history: era,
        rules: order,
      }),
    })
    flashCopied('강호 무대를 장소 라이브러리에 담았어요')
  }

  // 골격을 프로젝트에 추가(자료 › 세계관)
  const skeletonToProject = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않아 추가할 수 없어요.'); return }
    const title = skeletonTitle()
    const body = skeletonLines().map((l) => `<p><b>${esc(l.icon + ' ' + l.label)}</b> — ${esc(l.text)}</p>`).join('')
    const metaCols: Record<string, string> = {
      장르: '무협',
      시대: SLOTS[0].pool[store.skeleton.era ?? 0].split(/[—,(]/)[0].trim().slice(0, 40),
      결: SLOTS[1].pool[store.skeleton.tone ?? 0].split(/[—,(]/)[0].trim().slice(0, 40),
    }
    const id = addToProject({ kind: 'text', root: 'research', folder: '세계관', title, bodyHtml: body, meta: metaCols })
    if (id) flashNote(`${josa(`‘${title}’`, '을', '를')} 프로젝트 ‘자료 › 세계관’에 추가했어요.`)
    else flashNote('프로젝트에 추가하지 못했어요.')
  }

  // ── 전체 설정 → 텍스트(섹션별 채워진 답안만) ──
  const buildFullText = (): string => {
    const out: string[] = []
    out.push('# 무협 세계관 설정 — 강호(江湖)')
    out.push('')
    out.push('[강호 골격]')
    out.push(skeletonText())
    for (const sec of SECTIONS) {
      const filled = sec.fields.filter((f) => getAns(sec.key, f.key).trim())
      if (!filled.length) continue
      out.push('')
      out.push(`## ${sec.icon} ${sec.label}`)
      for (const f of filled) {
        out.push(`- ${f.label}: ${getAns(sec.key, f.key).trim().replace(/\n/g, '\n    ')}`)
      }
    }
    const cl = customLines()
    if (cl.length) {
      out.push('')
      out.push('## ➕ 사용자 정의 항목')
      for (const line of cl) out.push(`- ${line.replace(/\n/g, '\n    ')}`)
    }
    return out.join('\n')
  }

  const buildFullHtml = (): string => {
    const parts: string[] = []
    parts.push(`<h2>무협 세계관 설정 — 강호(江湖)</h2>`)
    parts.push(`<p><b>강호 골격</b></p>`)
    parts.push(skeletonLines().map((l) => `<p>${esc(l.icon + ' ' + l.label)}: ${esc(l.text)}</p>`).join(''))
    for (const sec of SECTIONS) {
      const filled = sec.fields.filter((f) => getAns(sec.key, f.key).trim())
      if (!filled.length) continue
      parts.push(`<h3>${esc(sec.icon + ' ' + sec.label)}</h3>`)
      for (const f of filled) {
        const v = getAns(sec.key, f.key).trim().replace(/\r\n|\r|\n/g, '<br>')
        parts.push(`<p><b>${esc(f.label)}</b><br>${esc(v).replace(/&lt;br&gt;/g, '<br>')}</p>`)
      }
    }
    for (const it of custom) {
      const v = it.value.trim()
      if (it.label.trim() && v) {
        parts.push(`<h3>${esc(it.label.trim())}</h3>`)
        parts.push(`<p>${esc(v).replace(/\r\n|\r|\n/g, '<br>')}</p>`)
      }
    }
    if (etc.trim()) {
      parts.push(`<h3>기타</h3>`)
      parts.push(`<p>${esc(etc.trim()).replace(/\r\n|\r|\n/g, '<br>')}</p>`)
    }
    return parts.join('')
  }

  const exportAll = () => {
    copyText(buildFullText(), '전체 세계관 설정을 복사했어요')
  }

  const fullToProject = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않아 추가할 수 없어요.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '세계관',
      title: '무협 세계관 설정 — 강호',
      bodyHtml: buildFullHtml(),
      meta: { 장르: '무협', 섹션: String(answeredSectionCount) },
    })
    if (id) flashNote('전체 세계관 설정을 프로젝트 ‘자료 › 세계관’에 추가했어요.')
    else flashNote('프로젝트에 추가하지 못했어요.')
  }

  // 섹션 답안 통계
  const sectionFilledCount = (sec: Section) => sec.fields.filter((f) => getAns(sec.key, f.key).trim()).length
  const answeredSectionCount = SECTIONS.filter((s) => sectionFilledCount(s) > 0).length
  const totalFilled = SECTIONS.reduce((a, s) => a + sectionFilledCount(s), 0)
  const totalFields = SECTIONS.reduce((a, s) => a + s.fields.length, 0)

  // 검색: 매칭 섹션/필드 강조 + 첫 매칭 섹션으로 점프 후보
  const q = query.trim().toLowerCase()
  const fieldMatches = (sec: Section, f: Field) => {
    if (!q) return false
    return (
      sec.label.toLowerCase().includes(q) ||
      f.label.toLowerCase().includes(q) ||
      f.ph.toLowerCase().includes(q) ||
      (f.hint || '').toLowerCase().includes(q) ||
      f.chips.some((c) => c.toLowerCase().includes(q))
    )
  }
  const sectionHasMatch = (sec: Section) => !!q && (sec.label.toLowerCase().includes(q) || sec.fields.some((f) => fieldMatches(sec, f)))

  const active = SECTIONS.find((s) => s.key === store.activeSection) || SECTIONS[0]

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', fontSize: 14, minHeight: 0 }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }
  const headTitle: React.CSSProperties = { fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex' }
  const leftCol: React.CSSProperties = { width: 210, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--chrome-2)' }
  const leftHead: React.CSSProperties = { padding: 10, display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--border)', flexShrink: 0 }
  const search: React.CSSProperties = { width: '100%', padding: '7px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const navWrap: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }
  const rightCol: React.CSSProperties = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }
  const label: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }
  const area: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', resize: 'vertical', minHeight: 56, lineHeight: 1.55, fontFamily: 'inherit' }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }
  const sectionTitle: React.CSSProperties = { fontSize: 13.5, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }
  const tinyBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '4px 7px', borderRadius: 6 }
  const linkbtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', cursor: 'pointer', fontSize: 12, lineHeight: 1.2, padding: '6px 9px', borderRadius: 8 }
  const chip: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--chrome-2)', color: 'var(--text)', cursor: 'pointer', fontSize: 11.5, lineHeight: 1.4, padding: '5px 8px', borderRadius: 999, textAlign: 'left' }
  const linkbar: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }
  const muted: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }

  const related = ['setting-bible', 'world-wiki', 'character-forge', 'name-mixer']
  const relLabel: Record<string, string> = {
    'setting-bible': '🗺️ 배경 설정집',
    'world-wiki': '📚 세계관 위키',
    'character-forge': '🧬 캐릭터 포지',
    'name-mixer': '🔤 이름 믹서',
  }
  const openRelated = (id: string) => openToolLinked(id, { genre: '무협' })

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={headTitle}><Emoji e="🏯" /> 무협 세계관 빌더</span>
        <span style={{ ...muted, fontSize: 12 }}>강호 설정 {totalFilled}/{totalFields} · 섹션 {answeredSectionCount}/{SECTIONS.length}</span>
        <span style={{ flex: 1 }} />
        {copied && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{copied}</span>}
        <button className="minibtn" onClick={() => setShowSkeleton((v) => !v)} title="강호 골격 생성기 펼치기/접기">
          {showSkeleton ? '▾ 골격 생성기' : '▸ 골격 생성기'}
        </button>
        <button className="minibtn" onClick={exportAll} title="전체 세계관 설정을 텍스트로 복사"><Emoji e="📋" /> 전체 복사</button>
        <button className="linkbtn" style={linkbtn} onClick={fullToProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '전체 설정을 프로젝트 자료(세계관)에 문서로 추가' : '프로젝트에 연결되어 있지 않아요'}>
          <Emoji e="📄" /> 프로젝트에 추가
        </button>
      </div>

      {note && <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--warn)', borderBottom: '1px solid var(--border)', lineHeight: 1.5 }}>{note}</div>}

      {/* ── 강호 골격 자동 생성기 ── */}
      {showSkeleton && (
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0, maxHeight: 320, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={sectionTitle}><Emoji e="🎲" /> 강호 골격 자동 생성기</span>
            <span style={muted}>슬롯 무작위 조합 · 잠금(<Emoji e="🔒" />)은 고정 · 조합수 <b style={{ color: 'var(--accent)' }}>{fmtNum(combos)}</b>가지 ({koUnit(combos)})</span>
            <span style={{ flex: 1 }} />
            <button className="btn-primary" onClick={rerollAll} title="잠그지 않은 슬롯을 모두 다시 굴립니다"><Emoji e="🎲" /> 전체 재생성</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8 }}>
            {SLOTS.map((slot) => {
              const locked = !!store.locks[slot.key]
              return (
                <div key={slot.key} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px', background: 'var(--paper)', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}><Emoji e={slot.icon} /> {slot.label}</span>
                    <span style={{ flex: 1 }} />
                    <button style={{ ...tinyBtn, color: locked ? 'var(--accent)' : 'var(--muted)', borderColor: locked ? 'var(--accent)' : 'var(--border)' }} onClick={() => toggleLock(slot.key)} title={locked ? '잠금 해제' : '이 슬롯 고정'}>
                      {locked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
                    </button>
                    <button style={tinyBtn} onClick={() => rerollOne(slot.key)} disabled={locked} title="이 슬롯만 다시 굴리기"><Emoji e="🎲" /></button>
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{slot.pool[store.skeleton[slot.key] ?? 0]}</div>
                </div>
              )
            })}
          </div>

          <div style={linkbar}>
            <button className="minibtn" onClick={() => copyText(skeletonTitle() + '\n\n' + skeletonText(), '강호 골격을 복사했어요')}><Emoji e="📋" /> 골격 복사</button>
            <button className="minibtn" onClick={applySkeletonToAnswers} title="골격을 아래 설정 항목 본문에 반영">⬇ 설정에 반영</button>
            <button className="minibtn" onClick={skeletonToLibrary} title="강호 골격을 글감(스니펫) 라이브러리에 저장"><Emoji e="📥" /> 글감으로</button>
            <button className="minibtn" onClick={skeletonPlaceToLibrary} title="강호 무대를 장소 라이브러리에 저장"><Emoji e="📍" /> 장소로</button>
            <button className="linkbtn" style={linkbtn} onClick={skeletonToProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '이 골격을 프로젝트 자료(세계관)에 추가' : '프로젝트에 연결되어 있지 않아요'}><Emoji e="📄" /> 골격을 프로젝트에</button>
          </div>
        </div>
      )}

      <div style={body}>
        {/* 좌측: 섹션 내비 + 검색 */}
        <div style={leftCol}>
          <div style={leftHead}>
            <input style={search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍 설정 항목 검색" aria-label="설정 항목 검색" />
          </div>
          <div style={navWrap}>
            {SECTIONS.map((sec) => {
              const activeSec = sec.key === store.activeSection
              const cnt = sectionFilledCount(sec)
              const hit = sectionHasMatch(sec)
              return (
                <button
                  key={sec.key}
                  onClick={() => setActiveSection(sec.key)}
                  style={{
                    textAlign: 'left',
                    border: '1px solid ' + (activeSec ? 'var(--accent)' : (hit ? 'var(--accent)' : 'transparent')),
                    background: activeSec ? 'var(--paper)' : (hit ? 'var(--paper)' : 'transparent'),
                    color: 'var(--text)', cursor: 'pointer', borderRadius: 8, padding: '8px 9px',
                    display: 'flex', flexDirection: 'column', gap: 3,
                    boxShadow: activeSec ? '0 0 0 1px var(--accent)' : 'none',
                  }}
                  title={sec.label}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: activeSec ? 700 : 600, fontSize: 13 }}>
                    <span aria-hidden><Emoji e={sec.icon} /></span>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sec.label}</span>
                    {cnt > 0 && <span style={{ fontSize: 10.5, color: '#fff', background: 'var(--accent)', borderRadius: 999, padding: '1px 6px', flexShrink: 0 }}>{cnt}</span>}
                  </span>
                </button>
              )
            })}
          </div>
          <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)' }}>
            <div style={{ ...muted, fontSize: 11 }}>대상 장르: <b style={{ color: 'var(--accent)' }}>{genreHint}</b></div>
          </div>
        </div>

        {/* 우측: 섹션 질문·입력 */}
        <div style={rightCol}>
          <div style={scroll}>
            <div style={panel}>
              <div style={sectionTitle}><span aria-hidden><Emoji e={active.icon} /></span> {active.label}</div>
              <div style={muted}>{active.blurb}</div>
            </div>

            {active.fields.map((f) => {
              const val = getAns(active.key, f.key)
              const hit = fieldMatches(active, f)
              return (
                <div key={f.key} style={{ ...panel, borderColor: hit ? 'var(--accent)' : 'var(--border)' }}>
                  <div style={label}>{f.label}</div>
                  <div style={{ ...muted, marginTop: -4 }}>{f.ph}</div>
                  <textarea
                    style={{ ...area, minHeight: f.big ? 96 : 56 }}
                    value={val}
                    onChange={(e) => setAns(active.key, f.key, e.target.value)}
                    placeholder="여기에 이 항목의 설정을 적으세요. 아래 예시를 눌러 채울 수도 있어요."
                    aria-label={f.label}
                  />
                  {f.hint && <div style={{ ...muted, color: 'var(--muted)' }}><Emoji e="💡" /> {f.hint}</div>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)' }}>예시 (클릭하면 채워져요)</span>
                      <span style={{ flex: 1 }} />
                      <button style={tinyBtn} onClick={() => applyChip(active.key, f.key, f.chips[randIdx(f.chips.length)])} title="예시 중 하나를 무작위로 채우기"><Emoji e="🎲" /> 무작위</button>
                      {val.trim() && <button style={{ ...tinyBtn, color: 'var(--warn)' }} onClick={() => setAns(active.key, f.key, '')} title="이 항목 비우기">✕ 비우기</button>}
                      {val.trim() && <button style={tinyBtn} onClick={() => copyText(`${f.label}: ${val.trim()}`, '항목을 복사했어요')} title="이 항목 복사"><Emoji e="📋" /></button>}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {f.chips.map((c, i) => (
                        <button
                          key={i}
                          style={chip}
                          onClick={() => applyChip(active.key, f.key, c)}
                          title="클릭: 입력에 채우기 / 길게 누르지 않아도 복사는 우측 📋 사용"
                        >
                          {emojify(c.length > 64 ? c.slice(0, 64) + '…' : c)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* 사용자 정의 항목 + 기타(자유 입력) */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={sectionTitle}><Emoji e="➕" /> 사용자 정의 항목</div>
                <span style={{ flex: 1 }} />
                <button className="minibtn" onClick={addCustom} title="원하는 이름으로 새 입력 항목을 추가합니다(내용은 직접 작성)">＋ 항목 추가</button>
              </div>
              <div style={muted}>스키마에 없는 설정(화폐·언어·금기 등)을 자유롭게 더하세요. 항목은 저장되고, 장소로 보낼 때 함께 실립니다. (전체 재생성 시 값은 비워지고 항목 이름은 유지됩니다.)</div>
              {custom.length === 0 && <div style={{ ...muted, fontStyle: 'italic' }}>아직 추가한 항목이 없어요. ‘＋ 항목 추가’로 시작하세요.</div>}
              {custom.map((it) => (
                <div key={it.id} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ ...label, marginBottom: 0, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emojify(it.label)}</span>
                    <button style={{ ...tinyBtn, color: 'var(--warn)' }} onClick={() => removeCustom(it.id)} title="이 항목 삭제" aria-label={`${it.label} 항목 삭제`}>✕</button>
                  </div>
                  <textarea
                    style={{ ...area, minHeight: 48 }}
                    value={it.value}
                    onChange={(e) => setCustomValue(it.id, e.target.value)}
                    placeholder={`‘${it.label}’의 내용을 직접 적으세요.`}
                    aria-label={it.label}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={label}>기타</div>
                <textarea
                  style={{ ...area, minHeight: 80 }}
                  value={etc}
                  onChange={(e) => setEtc(e.target.value)}
                  placeholder="어느 항목에도 들어가지 않는 메모·아이디어를 자유롭게 적으세요."
                  aria-label="기타"
                />
              </div>
            </div>

            {/* 연계 도구 */}
            <div style={panel}>
              <div style={sectionTitle}><Emoji e="🔗" /> 함께 쓰면 좋은 도구</div>
              <div style={linkbar}>
                {related.map((rid) => (
                  <button key={rid} className="linkbtn" style={linkbtn} onClick={() => openRelated(rid)} title={`${relLabel[rid] || rid} 열기 (무협 모드)`}>
                    {emojify(relLabel[rid] || rid)}
                  </button>
                ))}
              </div>
              <div style={muted}>장소는 <b>배경 설정집</b>에서 카드로, 설정 자료는 <b>세계관 위키</b>에서 페이지로 이어 정리하면 좋아요. 인물·이름은 캐릭터 포지·이름 믹서로.</div>
            </div>

            <div style={{ ...muted, paddingBottom: 4 }}>
              모든 입력은 이 브라우저에 자동 저장됩니다. 무협 도시에에 근거한 예시는 ‘채우기’용 출발점이니 작품에 맞게 변주하세요.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
