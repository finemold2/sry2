// 무협 서사 장치·전개법 사전 — 무협(武俠) 장르 고유의 서사 장치와 전개/구조 패턴·페이싱·클라이맥스 관습을 모은 로컬 사전.
//  각 항목: 정의 + 사용법 + 예시 + 비틀기(클리셰 변주). 카테고리 펼침 + 검색 + 무작위 + 클릭복사.
//  자급식: 외부 네트워크·라이브러리 없음. react 와 './linkbus' 만 사용. (Math.random + localStorage 만 쓴다.)
//  연계(linkbus): 현재 항목을 자료('research')〈서사 장치〉 폴더 메모로 추가, 글감을 공유 라이브러리(snippets)에 저장, 관련 도구 열기.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji,
} from './linkbus'

export const meta = {
  id: 'wuxia-devices',
  name: '무협 서사 장치·전개법 사전',
  icon: '🗡️',
  group: '장치·전개',
  genre: '무협',
  intro: '기연·내공·은원·정사대전… 무협 고유의 서사 장치와 전개·페이싱·클라이맥스 관습을 정의·사용법·예시·비틀기로',
  w: 660,
  h: 600,
}

// ── 데이터 모델 ─────────────────────────────────────────────
interface Device {
  name: string        // 장치/관습 이름(무협 용어)
  hanja?: string      // 한자(있으면)
  def: string         // 정의 — 이 장치가 무엇이며 독자가 무엇을 기대하는가
  use: string         // 사용법 — 어디에·어떻게 배치하면 효과적인가
  ex: string          // 예시 — 구체적 장면 한 컷
  twist: string       // 비틀기 — 진부함을 피하는 변주
  tags?: string[]     // 검색 보조 태그
}
interface CatDef { key: string; label: string; icon: string; note: string; items: Device[] }

// ── 무협 서사 장치·전개법 데이터(도시에 근거, 장르 특화) ──────
const CATS: CatDef[] = [
  {
    key: 'serendipity', label: '기연·성장', icon: '🌀',
    note: '약자→강자 서사의 엔진. 무공·내공을 어떤 대가로 얻는가가 핵심 계약.',
    items: [
      {
        name: '절벽기연', hanja: '絶壁奇緣',
        def: '추락·조난 끝에 비동(秘洞)에 떨어져 전대고수의 유해와 심법서·신병을 얻는 무협 최대의 클리셰. 독자는 "어떤 무공을, 어떤 대가로"를 기대한다.',
        use: '발단 직후 약자 주인공의 첫 파워업 트리거로. 추락의 원인(적의 음모·사고)을 후반 떡밥과 묶으면 인과가 산다.',
        ex: '독문(獨門)에 몰려 천길 낭떠러지로 떨어진 막내 제자가, 백골이 앉은 석실에서 먼지 쌓인 〈천뢰심결〉을 발견한다.',
        twist: '비급은 미완(未完)이거나 함정이다. 익히면 주화입마하는 사공(邪功)이라, 얻은 것이 곧 재앙의 씨앗이 되게 하라.',
        tags: ['비동', '추락', '비급', '심법서', '동굴'],
      },
      {
        name: '영약·내단', hanja: '靈藥·內丹',
        def: '만년하수오·공청석유·영물 내단을 복용해 수십 년 내공을 일순간에 얻는 서사적 레벨업 장치. 정량적 강함의 점프.',
        use: '수련만으로 도달 불가능한 벽을 넘게 할 때. 단, 복용엔 운기조식·시간·조력자(보호)가 필요해 긴장을 만든다.',
        ex: '천년설삼(雪蔘)을 삼킨 주인공이 전신의 경맥이 끊어질 듯한 열기를 가부좌로 사흘간 버텨 갑자(甲子)의 공력을 얻는다.',
        twist: '영약이 몸에 맞지 않아 폭주한다. 약효를 다스리려 적에게 보호를 구걸하는 굴욕, 혹은 약효의 절반만 흡수하고 나머지는 평생의 화근으로 남긴다.',
        tags: ['하수오', '공청석유', '내단', '복용', '갑자'],
      },
      {
        name: '전인 지목', hanja: '傳人指目',
        def: '죽어가는 절대고수가 마지막 순간 무공·유지(遺志)·문파를 한 사람에게 물려주는 전수 장치. 위기(단전 폐인 직전 등)와 결합한다.',
        use: '주인공에게 정통성·사명·원수를 동시에 부여할 때. 전수자는 "왜 하필 너인가"의 동기를 남겨야 한다.',
        ex: '마교의 추격에 폐인이 된 전대 검존이, 우연히 자신을 묻어주려던 거지 소년에게 검총(劍塚)의 위치와 평생의 검리를 토해내고 절명한다.',
        twist: '전수받은 무공의 진짜 목적은 복수가 아니라 봉인이다. 주인공은 강해질수록 전대의 죄를 대신 짊어지게 된다.',
        tags: ['전수', '유지', '사부', '절대고수', '폐인'],
      },
      {
        name: '주화입마', hanja: '走火入魔',
        def: '무리한 수련·심마(心魔)·상극 무공의 충돌로 진기가 역류해 폐인·발광·죽음에 이르는 성장의 리스크 비용.',
        use: '파워업에 반드시 대가를 붙이는 장치. 위기의 최저점(중반)이나, 금기무공을 쓴 직후의 응징으로 배치한다.',
        ex: '하루빨리 강해지려 운기 순서를 어긴 주인공이 단전이 들끓어 피를 토하며 쓰러지고, 곁의 의원이 "한 호흡만 늦었어도 폐인이 됐다"고 떤다.',
        twist: '주화입마를 의도적으로 끌어안아 심마와 거래한다 — 광증을 무기로 쓰되 매번 인간성을 한 조각씩 잃는 트레이드오프.',
        tags: ['심마', '역류', '폐인', '발광', '대가'],
      },
      {
        name: '환골탈태', hanja: '換骨奪胎',
        def: '내공이 극에 달하거나 영약·기연으로 골격·근맥이 통째로 새로 태어나, 체질·외모·수명이 바뀌는 질적 도약.',
        use: '경지의 벽(이류→일류, 일류→절정)을 넘는 분기점에. 외형 변화로 "다른 사람이 되었음"을 독자에게 시각화한다.',
        ex: '폐관 수련 끝에 온몸의 더러운 기운이 검은 땀으로 빠져나오고, 백발이 검어지며 노쇠한 몸이 청년의 것으로 돌아온다(반로환동).',
        twist: '탈태의 대가로 과거의 무공을 전부 잃고 처음부터 다시 쌓아야 한다 — 더 높이 가기 위해 가장 약한 자리로 돌아가는 역설.',
        tags: ['반로환동', '체질', '경지', '폐관', '도약'],
      },
      {
        name: '특이체질·천맥', hanja: '特異體質',
        def: '구음절맥·만독불침·천형(天形)·무공 못 익히는 폐맥 등, 태생의 체질이 저주이자 축복으로 작동하는 설정.',
        use: '"폐기 취급받던 무재(無才)가 알고 보니 천재 체질"의 반전 동력으로. 체질엔 약점(수명·발작 등)을 함께 줘 만능을 막는다.',
        ex: '무공을 익히면 죽는다던 절맥의 소녀가, 그 체질이 사실 천 년에 하나 나오는 천음지체(天陰之體)임을 절대고수가 알아본다.',
        twist: '체질의 진가는 강함이 아니라 누군가의 무공을 완성시키는 \'그릇\'이라는 것 — 노려진 자, 제물의 운명을 뒤집는 이야기로.',
        tags: ['구음절맥', '만독불침', '폐맥', '무재', '천재'],
      },
    ],
  },
  {
    key: 'qigong', label: '무공·내공 메커니즘', icon: '☯️',
    note: '무공 위계를 정량화하는 장치. 원리·약점·상성을 설계해야 초식이 공허해지지 않는다.',
    items: [
      {
        name: '내공·진기', hanja: '內功·眞氣',
        def: '단전(丹田)에 축적된 진기의 양과 순도가 곧 강함. 운기조식(運氣調息)으로 쌓고 경맥·기경팔맥으로 운용한다.',
        use: '강함을 \'수치\'처럼 가늠하게 하는 척도. "갑자/일갑자(60년 공력)" 같은 단위로 인물 간 격차를 독자에게 명시한다.',
        ex: '결투 중 주인공이 단전의 진기를 끌어올려 검에 싣자, 상대가 "고작 약관에 일갑자 공력이라니" 하고 안색이 변한다.',
        twist: '공력의 양보다 운용의 묘가 이긴다 — 적은 내공으로 거대한 공력을 \'흘리고 되돌리는\' 사량발천근(四兩撥千斤)의 이치로 역전.',
        tags: ['단전', '운기조식', '경맥', '진기', '갑자'],
      },
      {
        name: '검기→검강', hanja: '劍氣→劍罡',
        def: '기(氣)가 칼끝 밖으로 뻗으면 검기, 그것이 응축돼 실체화하면 검강(罡). 기→강의 위계가 곧 절정고수의 증표다.',
        use: '경지 차이를 가시화하는 장치. "검기는 베고 검강은 부순다"처럼 단계마다 할 수 있는 일을 분명히 규정한다.',
        ex: '검 끝 한 치 앞의 허공이 아지랑이처럼 일렁이더니, 바위가 두부처럼 갈라진다 — 검기를 넘어 검강에 든 자의 한 수.',
        twist: '주인공의 무공은 강기가 아니라 \'기를 죽이는\' 무형의 경지여서, 화려한 검강을 쓰는 적의 기세 자체를 흩어버린다.',
        tags: ['검강', '도기', '강기', '절정', '위계'],
      },
      {
        name: '심법·구결', hanja: '心法·口訣',
        def: '내공을 쌓고 운용하는 근본 이치를 담은 구결(口訣). 같은 초식도 어떤 심법으로 펴느냐에 따라 위력이 갈린다.',
        use: '무공의 \'원리\'를 부여하는 장치. 비급 쟁탈전·오독(誤讀)·구결의 결락 같은 플롯을 파생시킨다.',
        ex: '주인공이 외운 구결의 한 글자가 빠져 있어, 그 한 글자를 찾아 강호를 떠도는 동안 심법의 진의를 차츰 깨친다.',
        twist: '구결이 일부러 거꾸로 적혀 있다 — 글자 그대로 익히면 사공이 되고, 뒤집어 읽어야 정종(正宗)이 되는 함정 비급.',
        tags: ['구결', '비급', '심법', '운용', '원리'],
      },
      {
        name: '점혈·해혈', hanja: '點穴·解穴',
        def: '혈도(穴道)를 짚어 상대의 움직임·진기·감각을 봉쇄(점혈)하고 푸는(해혈) 정밀 무공. 비살상 제압의 대표 수단.',
        use: '죽이지 않고 제압해야 할 때, 또는 인질·심문·잠입 장면의 변수로. 시간제한(반 시진 뒤 풀린다)을 걸면 긴장이 산다.',
        ex: '말 한마디 없이 손가락 세 번이 번뜩이자, 거구의 호위무사 셋이 그대로 굳어 눈만 굴린다.',
        twist: '점혈이 통하지 않는 적(혈도가 어긋난 기형·이미 죽은 강시). 믿던 봉쇄 수단이 무력화되며 공포가 시작된다.',
        tags: ['혈도', '점혈', '제압', '봉쇄', '강시'],
      },
      {
        name: '경공·신법', hanja: '輕功·身法',
        def: '몸을 가볍게 띄워 물 위·벽·나뭇잎을 밟고 달리는 경공, 몸놀림으로 공격을 흘리는 신법. 추격·암살·도주의 핵심.',
        use: '결투에 입체감을, 추격전에 속도감을 주는 장치. "답설무흔(踏雪無痕)" 같은 절기로 인물의 격을 표현한다.',
        ex: '지붕 위를 제비처럼 스치는 흑의인의 발밑에서 기왓장 하나 울리지 않는다 — 답설무흔의 경지.',
        twist: '경공의 대가가 수명·내공의 급격한 소모라, 도주에 성공한 순간 주인공이 탈진해 무방비로 쓰러진다.',
        tags: ['답설무흔', '이형환위', '경공', '신법', '추격'],
      },
      {
        name: '경지의 위계', hanja: '境地位階',
        def: '삼류·이류·일류·절정·초절정·화경(化境)·현경·생사경으로 이어지는 강함의 계단. 독자가 인물의 \'좌표\'를 읽는 척도.',
        use: '세계관 초반에 상한과 단계를 고정해 후반 파워 인플레이션을 막는 장치. 경지마다 \'할 수 있는 일\'을 규정한다.',
        ex: '"화경에 들면 기를 흩어 자연과 어우러지고, 현경에 이르면 살의(殺意)만으로 사람을 죽인다"는 강호의 풍문.',
        twist: '경지의 숫자를 아예 무의미하게 만드는 자 — 위계 밖의 무리(武理)를 깨친 기인이라, 등급으로 가늠하던 독자의 기대를 배반한다.',
        tags: ['화경', '현경', '생사경', '절정', '등급'],
      },
    ],
  },
  {
    key: 'ethics', label: '협·은원의 윤리', icon: '⚖️',
    note: '"은혜는 반드시 갚고 원한도 반드시 갚는다(有恩必報 有仇必報)." 의리·신의가 행동의 축.',
    items: [
      {
        name: '은원', hanja: '恩怨',
        def: '갚아야 할 은혜(恩)와 풀어야 할 원한(怨)의 장부. 무협 인물의 거의 모든 행동은 이 대차대조표 위에서 움직인다.',
        use: '인물의 동기를 즉각 명료하게 만드는 장치. 은과 원을 한 인물에게 겹쳐 놓으면 강력한 딜레마가 된다.',
        ex: '"이 한 잔의 술로 십 년 전 목숨 빚은 갚았다. 다음에 만나면 우리는 적이다." 잔을 비우고 등을 돌리는 두 고수.',
        twist: '갚을 은인과 죽일 원수가 같은 사람이다 — 부모의 원수가 어린 날 자신을 구한 은인임이 밝혀지는 순간, 검이 멈춘다.',
        tags: ['은혜', '원한', '복수', '의리', '빚'],
      },
      {
        name: '협의·대의', hanja: '俠義·大義',
        def: '약자를 보호하고 불의에 맞서는 협(俠)의 정신. 김용은 이를 "협지대자, 위국위민(俠之大者 爲國爲民)"으로 국가·민족 차원까지 격상했다.',
        use: '개인 복수에서 천하대의로 동선을 확장하는 장치. 사적 원한과 공적 대의가 충돌할 때 인물의 그릇이 드러난다.',
        ex: '사문의 원수를 코앞에 두고도, 마교의 침공으로 불타는 마을을 먼저 구하려 검을 거두는 주인공.',
        twist: '대의라는 이름의 폭력 — "위국위민"을 외치는 정파 맹주가 실은 그 명분으로 사파를 학살해 온 위선자임을 드러낸다.',
        tags: ['협', '대의', '위국위민', '약자', '명분'],
      },
      {
        name: '신분 위장·정체 은닉', hanja: '身分僞裝',
        def: '명문 후예·마교 후계·폐인인 척 진짜 정체를 숨기는 장치. 후반 반전의 떡밥이자 \'실력 숨김\'의 카타르시스 장치.',
        use: '웹소설형에선 \'얕보임→증명\'의 사이다 사이클로, 정통형에선 정체 폭로를 클라이맥스 반전으로 아껴 둔다.',
        ex: '주루(酒樓)에서 시비를 거는 무뢰배를 못 이기는 척 맞아주던 평범한 점소이가, 위기의 순간 단 한 수로 좌중을 제압한다.',
        twist: '정체를 숨긴 게 \'강자\'가 아니라 \'폐인\'이라는 진실 — 모두가 절대고수로 떠받든 자가 실은 단전이 부서진 빈 껍데기다.',
        tags: ['위장', '정체', '실력숨김', '점소이', '반전'],
      },
      {
        name: '사문·문파', hanja: '師門·門派',
        def: '사부-제자의 관계가 도덕·플롯의 축이 되는 시스템. 사문의 원수=복수 동기, 문파 간 정치=강호 질서.',
        use: '주인공의 출신과 소속을 정하는 동시에, 사문의 규율·금기·은원을 갈등의 원천으로 삼는다.',
        ex: '파문(破門)당한 제자가, 자신을 내친 사부가 누명을 썼음을 알고 옛 사문을 위해 목숨을 거는 이야기.',
        twist: '사부가 곧 최종보스 — 평생 따른 스승이 사문을 몰락시킨 장본인이자, 주인공을 그저 \'무공의 그릇\'으로 키워온 자다.',
        tags: ['사부', '제자', '문파', '파문', '규율'],
      },
      {
        name: '관무불가침', hanja: '官武不可侵',
        def: '관(官, 조정·군)과 강호(江湖)는 서로의 일에 개입하지 않는다는 무림의 암묵적 룰. 강호를 독립된 \'법 밖 세계\'로 만든다.',
        use: '왜 무림의 분쟁이 관군으로 해결되지 않는가를 정당화하는 장치. 이 룰을 깨는 순간이 곧 거대한 전환점이 된다.',
        ex: '살인이 벌어진 객잔에 포졸이 들이닥치지만, 무림인의 일임을 알고 슬그머니 물러난다 — "강호의 일은 강호에서."',
        twist: '관이 마침내 강호에 칼을 댄다 — 황실의 음모로 관무불가침이 깨지며, 정사마(正邪魔) 모두가 공동의 적 앞에 손을 잡는다.',
        tags: ['관', '조정', '강호', '암묵룰', '독립세계'],
      },
    ],
  },
  {
    key: 'world', label: '강호 질서·세력', icon: '🏯',
    note: '정파-사파-마교 구도, 구파일방·세가·서열. 독자는 늘 "이 자가 강호에서 어느 위치인가"를 가늠한다.',
    items: [
      {
        name: '정사마 삼분', hanja: '正邪魔三分',
        def: '정파(正派)·사파(邪派)·마교(魔敎/天魔神敎)의 삼각 세력 구도. 선악의 단순 이분이 아니라 명분·이익·생존의 정치다.',
        use: '강호의 큰 판을 짜는 기본 장치. 정파의 위선, 사파의 의리, 마교의 인간미를 섞어 회색지대를 만들면 깊이가 산다.',
        ex: '정파 무림맹이 \'마교 토벌\'을 명분으로 군소 문파의 영약 광맥을 차지하려는 추악한 회의 장면.',
        twist: '가장 \'사파\'다운 인물이 가장 협(俠)답고, 가장 \'정파\'다운 자가 가장 잔혹하다 — 라벨과 본질을 어긋나게 배치한다.',
        tags: ['정파', '사파', '마교', '천마신교', '세력'],
      },
      {
        name: '구파일방', hanja: '九派一幇',
        def: '소림·무당·화산·아미·곤륜·점창·청성·종남·공동의 구파(九派)와 개방(丐幇). 정파 무림의 기둥이자 권위의 상징.',
        use: '세계관에 \'정통\'과 \'권위\'의 좌표를 세우는 장치. 각 문파에 고유 무공·기질(소림=불문/외공, 무당=도가/유능제강)을 부여한다.',
        ex: '화산논검(華山論劍)을 위해 구파의 장문인들이 한자리에 모이자, 객잔이 술렁이며 강호의 서열이 다시 점쳐진다.',
        twist: '구파일방이 이미 속에서 썩었다 — 명문의 간판 뒤에서 노쇠하고 부패한 권위를, 변방의 신흥 세력이 무너뜨리는 하극상의 판.',
        tags: ['소림', '무당', '화산', '개방', '정파'],
      },
      {
        name: '오대세가', hanja: '五大世家',
        def: '남궁(검)·사천당문(암기·독)·모용·황보·제갈(지략·진법) 등 혈통으로 무공을 잇는 명문가. 문파와는 다른 \'가문\'의 정치.',
        use: '혼맥·후계 다툼·가문의 명예 같은 갈등을 만들 때. 가문마다 특화 무공을 줘 결투의 색을 다양화한다.',
        ex: '사천당문의 암기 한 줌이 어둠 속에서 쏟아지자, 정면 승부만 알던 검객이 손쓸 새 없이 무너진다.',
        twist: '몰락한 방계(傍系)의 서자가 가문의 진짜 절학을 유일하게 잇고 있다 — 적통의 오만이 비주류에게 천하를 내주는 이야기.',
        tags: ['남궁세가', '당문', '제갈', '세가', '가문'],
      },
      {
        name: '서열·천하제일', hanja: '序列·天下第一',
        def: '절세고수-초절정-절정-일류-이류로 이어지는 강호 서열과, 그 정점인 천하제일인(天下第一人). 모든 도전의 좌표.',
        use: '인물 등장 때마다 \'격\'을 즉시 매겨주는 장치. 천하제일이라는 자리는 늘 다음 도전자의 표적이 된다.',
        ex: '강호 풍문에 새 이름이 오르내린다 — "그 애송이가 십대고수 중 셋을 꺾었다더라." 서열표가 흔들린다.',
        twist: '천하제일의 자리가 사실 저주다 — 그 자리에 오른 자는 끝없는 도전과 암습에 시달려 누구도 오래 살지 못한다.',
        tags: ['천하제일', '서열', '절세고수', '도전', '랭킹'],
      },
      {
        name: '새외세력', hanja: '塞外勢力',
        def: '서장(西藏)의 밀교·라마승, 북해의 빙공(氷功), 사막의 이민족 등 중원 밖에서 밀려드는 외부 위협. 강호 통합의 명분.',
        use: '내분에 빠진 정사마를 \'공동의 적\' 앞에 단결시키는 장치. 이질적 무공(밀교 주술·빙공)으로 신선함을 준다.',
        ex: '국경 너머에서 온 라마승이 손바닥 한 번에 정파 고수의 호신강기를 무너뜨리자, 중원이 처음으로 두려움을 느낀다.',
        twist: '새외세력을 끌어들인 자가 다름 아닌 중원의 정파 맹주다 — 외부의 적은 내부 권력 다툼의 도구였을 뿐.',
        tags: ['서장', '북해', '밀교', '빙공', '외세'],
      },
      {
        name: '강호의 직업', hanja: '江湖之業',
        def: '표국(鏢局, 호위업)·살막(殺幕, 청부살수)·개방의 정보망·의원·독인(毒人)·신병 대장장이 등 강호를 굴리는 생업.',
        use: '세계를 \'살아 있게\' 만드는 디테일 장치. 표행(鏢行)·청부·정보 거래를 사건의 발단으로 쓴다.',
        ex: '비단 한 수레를 호위하던 표사들이 녹림(綠林) 산적의 매복에 걸리고, 호위 무사 중 정체를 숨긴 고수가 끼어 있다.',
        twist: '강호 최고의 정보상이 알고 보면 천하의 판을 짜는 흑막 — 정보를 파는 자가 사실은 모든 은원을 설계해 온 거미다.',
        tags: ['표국', '살막', '개방', '독인', '녹림'],
      },
    ],
  },
  {
    key: 'combat', label: '결투·대결 묘사', icon: '⚔️',
    note: '초식·내공·병기의 합(合)을 주고받는 묘사를 독자는 기대한다. 무공엔 원리·약점·상성을.',
    items: [
      {
        name: '초식의 합', hanja: '招式之合',
        def: '이름 붙은 초식을 주고받으며 합(合)을 겨루는 정통 결투 묘사. "삼 초 안에 승부를 본다"처럼 합의 수가 격차를 말한다.',
        use: '실력 차를 정량화하며 결투에 리듬을 줄 때. 초식엔 반드시 \'노림수·약점·받아치는 법\'을 함께 묘사해 공허함을 막는다.',
        ex: '"매화삼롱(梅花三弄)!" 세 번 흩날린 검화(劍花) 중 둘은 허초(虛招), 마지막 하나가 명치를 노린 실초(實招)다.',
        twist: '이름난 절초의 진짜 노림수는 다음 한 수가 아니라, 상대가 \'아는 초식\'이라 방심하게 만드는 심리전이다.',
        tags: ['초식', '합', '허초', '실초', '검화'],
      },
      {
        name: '한 수에 승부', hanja: '一手決勝',
        def: '고룡(古龍)형 변주 — 길고 화려한 합 대신 정적·심리전 끝의 \'찰나의 한 수\'로 모든 것을 가르는 결투.',
        use: '긴 액션이 지칠 때, 혹은 절대고수 간 대결을 \'기세\'로 표현할 때. 베기 전후의 정적이 곧 묘사의 본체다.',
        ex: '두 검객이 십 장(丈)을 사이에 두고 미동도 없다. 낙엽 하나가 땅에 닿는 순간 — 한 명만 서 있다. 검은 이미 칼집 안이다.',
        twist: '\'한 수\'가 빗나간다. 절대적 자신감으로 펼친 단 하나의 수가 적의 미끼였고, 그 빈틈으로 패배가 결정된다.',
        tags: ['고룡', '찰나', '정적', '심리전', '단칼'],
      },
      {
        name: '독·암기', hanja: '毒·暗器',
        def: '정면 무력이 아닌 변수 — 당문(唐門)의 암기 세례와 무색무취의 독. 압도적 고수도 한 줌의 독엔 무너진다.',
        use: '강자를 약자가 꺾는 역전의 도구로. \'만독불침\'의 적이나 해독 시한(時限) 설정으로 긴장을 조절한다.',
        ex: '술잔의 미세한 떨림으로 독을 알아챈 고수가, 이미 손끝이 저려옴을 느끼며 해약(解藥)을 쥔 적과 협상에 나선다.',
        twist: '독을 쓴 자가 사실 독에 가장 약하다 — 평생 독을 다뤄 온 독인이 자신이 만든 독에 당하는 인과응보의 결말.',
        tags: ['암기', '독', '당문', '해약', '만독불침'],
      },
      {
        name: '진법·기관', hanja: '陣法·機關',
        def: '기문진(奇門陣)·연수합격(聯手合擊)·기관 함정으로 다수가 고수를 제압하는 장치. 제갈가의 진법이 대표.',
        use: '일대일로는 못 이기는 압도적 강자를 꺾을 때. 진의 \'생문(生門)\'을 찾는 추리 과정을 결투에 끼워 넣는다.',
        ex: '천라지망(天羅地網)에 갇힌 마두가, 사방에서 위치를 바꾸는 검진(劍陣) 앞에 처음으로 출구를 잃는다.',
        twist: '진을 짠 자가 진 안에 함께 갇힌다 — 적을 가두려 펼친 진법의 핵심이 깨지며, 설계자가 자기 함정의 제물이 된다.',
        tags: ['기문진', '검진', '연수합격', '생문', '기관'],
      },
      {
        name: '비무·논검', hanja: '比武·論劍',
        def: '비무대회·화산논검 같은 공식 대결 이벤트. 서열을 재편하고 숨은 고수를 무대 위로 끌어올리는 장치.',
        use: '여러 인물을 한자리에 모아 관계·실력을 한꺼번에 정리할 때. 우승 뒤 \'주목받는 대가\'(미녀·세력·표적)를 함께 준다.',
        ex: '약관의 무명 검객이 비무대에서 명문의 후기지수를 연파하자, 관중석의 노고수들이 술잔을 내려놓고 그를 응시한다.',
        twist: '비무는 처음부터 짜인 판이다 — 우승자를 미리 정해 두고 \'천하제일\'의 권위를 조작하려는 음모의 무대.',
        tags: ['비무대회', '화산논검', '서열', '후기지수', '무대'],
      },
    ],
  },
  {
    key: 'plot', label: '전개·구조 패턴', icon: '🗺️',
    note: '장편 대하형의 매크로 동선. 발단→기연→출도→충돌→추락→재기→대전→귀은.',
    items: [
      {
        name: '불우한 발단', hanja: '不遇之始',
        def: '사문·가문의 몰락, 폐인 취급받는 막내 제자, 무재(無才)로 멸시당하는 출발점. 약자 서사의 바닥을 만든다.',
        use: '1막. 독자가 주인공에게 감정이입하고 \'올라갈 일만 남았다\'는 기대를 품게 하는 출발 장치.',
        ex: '문파에서 잡일만 하던 외문(外門) 제자가, 사형들의 발길질 앞에서도 비급 한 줄을 훔쳐 외우며 견딘다.',
        twist: '불우함이 사실은 보호였다 — 일부러 약하게 키운 까닭이 \'노려지는 천재 체질\'을 숨기기 위함이었음을 후반에 드러낸다.',
        tags: ['발단', '몰락', '막내', '무재', '1막'],
      },
      {
        name: '출도', hanja: '出道',
        def: '수련을 마친 주인공이 강호에 첫발을 내딛는 전개. 첫 시련·첫 명성·첫 인연이 줄줄이 따라온다.',
        use: '2막의 문. 좁은 사문에서 넓은 강호로 무대를 확장하며, 작은 사건으로 세계의 규칙을 독자에게 가르친다.',
        ex: '하산한 주인공이 첫 객잔에서 횡포를 부리는 무뢰배를 손봐주자, 그 소문이 강호에 \'정체불명의 신예\'로 퍼진다.',
        twist: '출도하자마자 가장 큰 적과 마주친다 — 성장의 사다리를 천천히 오르는 대신, 최강의 벽을 먼저 보여주고 절망에서 시작한다.',
        tags: ['하산', '출도', '강호진출', '첫시련', '2막'],
      },
      {
        name: '중간보스 계단', hanja: '中間之敵',
        def: '점층적으로 강해지는 적의 계단. 한 적을 꺾으면 그 배후의 더 큰 적이 드러나는 양파 구조.',
        use: '장편의 페이싱을 유지하는 장치. 각 단계의 적에게 고유 무공·사연을 줘 단순 \'몹\'이 되지 않게 한다.',
        ex: '마을을 괴롭히던 수괴를 꺾자 그 뒤에 사파 분타주가, 그 뒤에 마교 호법이 — 적의 그림자가 점점 길어진다.',
        twist: '중간보스가 최종보스보다 매력적이다 — 의도적으로 \'아까운 적\'을 만들어, 그의 죽음이 주인공에게 평생의 그늘이 되게 한다.',
        tags: ['중간보스', '계단', '배후', '점층', '몹'],
      },
      {
        name: '중반의 추락', hanja: '中盤墜落',
        def: '배신·주화입마·동료의 죽음·정체 폭로가 겹치는 서사의 최저점(All is lost). 재기를 위한 바닥.',
        use: '구조의 정중앙. 그동안 쌓은 것을 한꺼번에 잃게 해, 후반 진각성의 무게를 만든다.',
        ex: '믿었던 사형의 칼에 단전이 부서지고, 영약도 비급도 빼앗긴 채 폐인이 되어 절벽 아래로 떨어지는 주인공.',
        twist: '추락이 곧 더 큰 기연의 입구 — 모든 것을 잃은 자리에서, 오히려 무공의 틀을 버린 \'무초승유초(無招勝有招)\'의 깨달음을 얻는다.',
        tags: ['추락', '배신', '최저점', '재기', '폐인'],
      },
      {
        name: '진각성·재기', hanja: '眞覺醒',
        def: '바닥에서 더 큰 무공·진실·자기 자신을 각성하고 일어서는 전개. 잃었기에 비로소 얻는 역설의 도약.',
        use: '3막의 시동. 단순한 파워업이 아니라 \'왜 싸우는가\'의 깨달음과 결합해야 카타르시스가 깊어진다.',
        ex: '복수만 좇던 주인공이, 폐인이 된 뒤에야 사부의 유지가 \'복수\'가 아닌 \'멈춤\'이었음을 깨닫고 검의 길을 다시 잡는다.',
        twist: '각성의 대가가 가장 사랑하는 것의 포기다 — 진정한 경지에 들기 위해 정(情)을 끊어야 하는, 강해질수록 외로워지는 길.',
        tags: ['각성', '재기', '깨달음', '도약', '3막'],
      },
      {
        name: '정사대전·천하대전', hanja: '正邪大戰',
        def: '정파 연합 대 마교, 혹은 새외 침공에 맞선 강호 전체 규모의 결전. 개인 동선이 천하 운명과 겹치는 클라이맥스.',
        use: '모든 세력·인연·은원을 한 전장으로 수렴시키는 장치. 개인 복수가 대의와 만나며 스케일이 폭발한다.',
        ex: '천마신교의 깃발이 중원을 뒤덮고, 흩어졌던 정사마의 고수들이 마지막 방어선에 함께 검을 든다.',
        twist: '대전의 진짜 승자는 싸우지 않은 제3자다 — 정사마가 서로를 소진하길 기다린 흑막이 잿더미 위에서 천하를 줍는다.',
        tags: ['정사대전', '천하대전', '마교침공', '결전', '수렴'],
      },
      {
        name: '귀은 엔딩', hanja: '歸隱',
        def: '천하제일에 오른(혹은 모든 것을 끝낸) 주인공이 명리(名利)를 버리고 강호를 떠나 은거하는 무협 특유의 결말.',
        use: '"이긴 자가 떠난다"는 무협의 미학을 닫는 장치. 승리의 공허함·정인과의 동행 등으로 여운을 남긴다.',
        ex: '무림맹주의 자리를 사양하고, 정인의 손을 잡은 채 안개 낀 강가의 작은 배에 오르는 천하제일인.',
        twist: '귀은이 불가능한 결말 — 떠나려는 순간 새로운 위협이 강호를 덮쳐, \'평범한 삶\'은 끝내 허락되지 않는 비극으로 닫는다.',
        tags: ['귀은', '은거', '결말', '명리', '여운'],
      },
    ],
  },
  {
    key: 'pacing', label: '페이싱·웹소설형', icon: '⚡',
    note: '회차당 1 사이다, 계단식 파워업. 정통형은 수련 과다로 늘어지고 웹소설형은 사이다 남발로 긴장이 죽는다.',
    items: [
      {
        name: '회귀', hanja: '回歸',
        def: '절대고수가 죽고 약자 시절로 돌아가, \'미래를 아는 강자\'의 더블 어드밴티지를 얻는 웹소설 무협의 표준 장치(화산귀환형).',
        use: '주인공에게 압도적 정보 우위와 \'다시 산다\'는 절절함을 동시에 부여할 때. 바뀐 미래로 회귀의 의미를 흔든다.',
        ex: '천하제일인으로 죽은 노고수가 눈을 떠 보니, 모든 게 시작되기 전 막내 제자 시절의 자기 몸 안이다.',
        twist: '회귀로 바꾼 미래가 더 나쁘다 — 알던 비극을 막자 예상 못한 더 큰 파국이 열려, \'미래 지식\'이 오히려 독이 된다.',
        tags: ['회귀', '환생', '미래지식', '화산귀환', '더블어드밴티지'],
      },
      {
        name: '사이다 사이클', hanja: '一回一快',
        def: '한 회 안에서 \'무시받음→얕보임→압도적 반격→주변의 경악\'을 닫는 웹소설 페이싱의 핵심 비트. 마지막 \'경악\'이 카타르시스.',
        use: '회차마다 통쾌함을 보장하는 장치. 단, 매번 같은 강도면 무뎌지므로 격차·대상·방식을 변주한다.',
        ex: '"고작 외문 제자 따위가" 비웃던 사형이, 단 한 수에 무릎 꿇으며 식은땀을 흘린다 — 좌중이 숨을 삼킨다.',
        twist: '사이다 뒤에 청구서를 붙인다 — 통쾌한 응징이 더 강한 적의 주목을 부르거나, 베푼 자비가 훗날의 화근이 되게 한다.',
        tags: ['사이다', '경악', '먼치킨', '리액션', '회차'],
      },
      {
        name: '계단식 파워업', hanja: '段階强化',
        def: '새 지역=새 강적=새 무공의 비트를 반복하는 웹소설 성장 리듬. 독자에게 예측 가능한 \'다음 카타르시스\'를 약속한다.',
        use: '연재 호흡을 일정하게 유지할 때. 비트가 단조롭지 않게 \'무공\' 대신 \'동료·정보·명성\'을 보상으로 섞는다.',
        ex: '북해에 닿자 빙공의 고수가 나타나고, 그를 꺾으며 한기를 다스리는 새 심법을 얻어 다음 무대로 향한다.',
        twist: '파워업의 사다리를 끊는다 — 더 강해질수록 약점이 커지는 무공을 줘, \'무한 강화\'의 단조로움을 깨뜨린다.',
        tags: ['파워업', '계단', '비트', '연재', '보상'],
      },
      {
        name: '떡밥-회수 단주기', hanja: '伏線回收',
        def: '정체·실력 숨김·과거의 폭로를 짧은 주기로 던지고 거두는 웹소설형 운영. 다음 회를 보게 만드는 갈고리.',
        use: '이탈을 막는 장치. 큰 떡밥(혈통·흑막) 아래 작은 떡밥(다음 회의 정체 폭로)을 겹쳐 끊임없이 회수한다.',
        ex: '"저 검법은… 멸문한 OO세가의 것!" 매 회 끝에 누군가 주인공의 정체에 한 발짝씩 다가서며 끊긴다.',
        twist: '회수한 떡밥이 가짜 단서다 — 독자가 다 풀었다 믿는 순간, 그 답 자체가 더 큰 흑막이 깔아둔 미끼였음을 뒤집는다.',
        tags: ['떡밥', '복선', '회수', '갈고리', '폭로'],
      },
      {
        name: '경악 리액션', hanja: '驚愕反應',
        def: '주인공의 한 수에 주변 인물·적·군중이 보이는 충격·경탄·공포의 묘사. 웹소설 카타르시스의 실질적 \'마무리\'.',
        use: '주인공의 강함을 직접 서술하는 대신 \'타인의 눈\'으로 보여줄 때. 시점을 잠깐 조연에게 넘기면 효과가 배가된다.',
        ex: '"말도 안 돼… 일초(一招)에? 저 나이에 화경이라고?" 노고수의 손에서 술잔이 떨어져 깨진다.',
        twist: '경악이 두려움으로 굳는다 — 환호하던 군중이 주인공의 압도적 힘 앞에서 점차 등을 돌리며, 강함이 곧 고립이 되게 한다.',
        tags: ['경악', '리액션', '시점전환', '카타르시스', '조연'],
      },
    ],
  },
  {
    key: 'climax', label: '클라이맥스 관습', icon: '🔥',
    note: '일대일 정점 대결, 대가 지불형 승리, 정체·혈연 반전, 천하대의 결착.',
    items: [
      {
        name: '최후의 한 수', hanja: '最後一招',
        def: '천하제일을 가르는 결투의 정점에서, 모든 합 끝에 펼치는 절초·금기무공 \'단 한 수\'로 승부가 갈리는 관습.',
        use: '클라이맥스의 심장. 그 한 수가 \'주인공만의 무공\'이거나 \'스승의 유산\'이면 서사적 의미가 절정에 닿는다.',
        ex: '온몸의 진기를 마지막 한 점에 모은 주인공의 검이, 마교주의 호신강기를 뚫고 정확히 단전을 관통한다.',
        twist: '최후의 한 수가 \'베지 않는\' 수다 — 죽일 수 있었으나 검을 멈추는 선택으로, 무력의 승리가 아닌 협(俠)의 승리를 그린다.',
        tags: ['절초', '금기무공', '정점', '단한수', '결투'],
      },
      {
        name: '대가 지불형 승리', hanja: '兩敗俱傷',
        def: '금기무공·반탄지력을 써 이기되 단전 파괴·수명 소진·폐인이 되는, \'이기고도 잃는\' 비극적 정점(서효원·정통 한무 선호).',
        use: '승리에 무게와 비통함을 더할 때. 무엇을 내주고 이겼는가가 결말의 정서를 결정한다.',
        ex: '주인공이 적과 함께 절벽으로 떨어지며 동귀어진(同歸於盡)을 택하고, 정인은 빈 검집만 끌어안는다.',
        twist: '대가를 치른 게 헛수고였다 — 모든 것을 바쳐 꺾은 적이 진짜 흑막의 \'대역\'에 불과했음이 마지막에 드러난다.',
        tags: ['동귀어진', '폐인', '수명소진', '금기', '비극'],
      },
      {
        name: '정체·혈연 반전', hanja: '血緣反轉',
        def: '최종보스가 사부·혈육·은인이었다는 폭로와 결합한 결투. 천룡팔부형 비극의 정점.',
        use: '결투의 칼끝에 윤리적 마비를 거는 장치. 정보를 미리 깔되, 폭로 시점을 검이 맞닿는 그 순간으로 아껴둔다.',
        ex: '복면을 벗긴 마교주의 얼굴이, 어린 날 자신을 업어 키운 \'죽은 줄 알았던 형\'이다 — 검이 떨린다.',
        twist: '혈연이 폭로돼도 검을 멈추지 않는다 — 핏줄보다 협을 택하는 잔혹한 결단으로, 값싼 화해를 거부하는 비극을 완성한다.',
        tags: ['혈연', '정체폭로', '천룡팔부', '사부', '비극'],
      },
      {
        name: '합공·다대일 역전', hanja: '聯手合擊',
        def: '절대강자를 진법·연수합격·암기·자기희생으로 꺾는 클라이맥스. 개인의 무력을 \'관계의 힘\'으로 넘어선다.',
        use: '단일 최강자를 쓰러뜨리되 주인공 한 명의 먼치킨화를 피할 때. 누가 무엇을 희생하는가가 감정의 핵이다.',
        ex: '혼자선 못 이길 마두를 향해, 흩어졌던 동료들이 각자의 절기를 한 호흡에 맞춰 펼치는 마지막 합격.',
        twist: '합공의 핵심 한 자리를 적이 이미 매수해 두었다 — 믿었던 합격진의 한 축이 배신하며, 역전이 다시 역전된다.',
        tags: ['합공', '연수합격', '자기희생', '진법', '관계'],
      },
      {
        name: '천하대의 결착', hanja: '大義結着',
        def: '개인의 복수가 강호·국가의 운명과 겹치며 스케일이 폭발하는 결말. 사적 은원이 공적 대의로 승화된다.',
        use: '소규모로 시작한 이야기를 \'천하\'의 무게로 닫을 때. 개인 동기와 대의가 한 행동에 포개지는 순간을 만든다.',
        ex: '아비의 원수를 베는 그 검이, 동시에 중원을 삼키려던 마교의 야망을 끝내는 한 수가 된다.',
        twist: '대의를 위해 사적 복수를 포기한다 — 원수를 살려 천하를 구하는 선택으로, 갚지 못한 원한을 평생의 짐으로 남기는 결말.',
        tags: ['대의', '복수', '천하', '승화', '결말'],
      },
    ],
  },
]

// ── 한국어 조사 헬퍼(받침 판정) ─────────────────────────────
//  앞 글자의 종성(받침)을 보고 실제 조사 하나를 골라 출력한다. "을(를)" 같은 이중표기 노출 금지.
function jong(s: string): number {
  // 끝에 붙은 한자·괄호·기호를 건너뛰고 '마지막 한글 음절'의 종성을 본다.
  //   예) "정적(靜寂)" → '적'(ㄱ받침) 으로 판정.
  const m = s.trim().match(/[가-힣](?=[^가-힣]*$)/)
  if (!m) return -1 // 한글 음절이 없으면 -1
  return (m[0].charCodeAt(0) - 0xac00) % 28 // 0 = 받침 없음, 8 = ㄹ
}
// 받침 있으면 withF, 없으면 noF
const J = (w: string, withF: string, noF: string) => (jong(w) <= 0 ? noF : withF)
const eul = (w: string) => J(w, '을', '를')
const eun = (w: string) => J(w, '은', '는')
const gwa = (w: string) => J(w, '과', '와')
// 으로/로: 받침 없거나 ㄹ받침이면 '로', 그 외 '으로'
const euro = (w: string) => { const f = jong(w); return f <= 0 || f === 8 ? '로' : '으로' }

// ── 유틸 ───────────────────────────────────────────────────
const LS = 'sry:tool:wuxia-devices'
const ALL_KEY = '__all__'

interface Flat { catKey: string; catLabel: string; catIcon: string; d: Device }
const flatAll = (): Flat[] =>
  CATS.flatMap((c) => c.items.map((d) => ({ catKey: c.key, catLabel: c.label, catIcon: c.icon, d })))

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── 무협 한 줄 시놉시스(logline) 생성기 ──────────────────────
//  8개 독립 슬롯에서 각 1개를 뽑아 한 문장으로 합성한다. 슬롯끼리 의미가 충돌하지 않도록
//  각 슬롯은 같은 문법역할(주어 명사 / 장소 명사 / 계기 명사 / 보상 명사 / 적 명사 /
//  대결방식 명사 / 시련 명사 / 종결절)만 담는다. 조사는 받침에 맞춰 실제로 하나를 골라 붙인다.
//  모든 항목은 고유(중복 없음). 외부 의존 없이 결정 가능한 곱집합.
const HERO = [ // {은/는} — 주어(명사구)
  '버려진 막내 제자', '폐인 취급받던 무재(無才)', '멸문한 세가의 외동', '거지꼴의 떠돌이 검객',
  '신분을 숨긴 점소이', '절맥(絶脈)을 타고난 소녀', '파문당한 옛 수제자', '복수만 좇는 외문 제자',
  '천하제일을 노리는 후기지수', '회귀한 전대 고수', '강호를 떠났던 은거 노인', '이름 없는 표사(鏢師)',
  '마교에서 도망친 배교자', '의원으로 위장한 살수', '몰락한 명문의 서자', '한쪽 팔을 잃은 검객',
] // 16
const PLACE = [ // 에서 — 장소(명사)
  '천길 낭떠러지 아래 비동(秘洞)', '백골이 앉은 석실', '눈 덮인 폐관(閉關)의 동굴', '강호의 낡은 객잔',
  '화산논검이 열린 봉우리', '사천당문의 독원(毒園)', '안개 자욱한 마교의 총단', '북해(北海)의 빙궁',
  '구파일방이 모인 무림맹', '녹림이 들끓는 산채', '서장(西藏)의 라마 사원', '검총(劍塚)이 묻힌 폐허',
  '비무대회가 벌어진 연무장', '강가의 외딴 주루(酒樓)', '기관과 함정의 미궁', '전대 고수의 무덤가',
] // 16
const TRIGGER = [ // {으로/로} — 계기(명사)
  '뜻밖의 추락', '죽어가는 고수의 전수(傳授)', '천년 영약과의 만남', '미완(未完)의 사공(邪功)',
  '함정으로 깔린 비급', '한순간의 환골탈태', '믿었던 자의 배신', '점혈에 당한 굴욕',
  '주화입마의 문턱', '우연히 엿본 구결(口訣)', '사문의 금기(禁忌)', '잊고 있던 회귀의 기억',
  '내려진 전인(傳人) 지목', '독에 무너진 첫 패배', '깨달은 무초승유초(無招勝有招)', '뒤집어 읽은 비급의 진의',
] // 16
const GIFT = [ // {을/를} 얻어 — 보상(명사)
  '한 갑자(甲子)의 공력', '실체화한 검강(劍罡)', '잃었던 사문의 절학', '봉인된 마공(魔功)',
  '답설무흔(踏雪無痕)의 경공', '만독불침(萬毒不侵)의 체질', '천음지체(天陰之體)의 각성', '미래를 아는 더블 어드밴티지',
  '사량발천근(四兩撥千斤)의 묘리', '점혈과 해혈의 정밀함', '당문의 암기 절기', '진법을 깨는 안목',
  '검총에 잠든 검리(劍理)', '한기를 다스리는 새 심법', '베지 않는 검의 경지', '전대의 죄까지 짊어진 무공',
] // 16
const FOE = [ // {과/와}의 — 적/세력(명사)
  '정파를 자처한 위선의 맹주', '의리를 아는 사파의 분타주', '인간미를 감춘 마교 호법', '암기를 쏟아내는 당문 고수',
  '천하제일을 자처한 검객', '죽은 줄 알았던 친형', '평생 따른 스승', '진법으로 무장한 제갈가',
  '빙공(氷功)을 쓰는 새외(塞外) 라마승', '강호의 판을 짠 정보상 흑막', '녹림을 다스리는 산적 두목', '청부를 받은 살막(殺幕)의 살수',
  '구음절맥을 노리는 사교(邪敎)', '동귀어진을 각오한 마두', '대역을 내세운 진짜 배후', '비무를 조작한 명문의 장로',
] // 16
const MANNER = [ // {으로/로} — 대결방식(명사)
  '단 한 수의 정적(靜寂)', '삼 초(三招) 안의 속전속결', '허초와 실초의 심리전', '연수합격(聯手合擊)의 합공',
  '천라지망(天羅地網)의 검진', '독과 해약을 건 협상', '기세만으로 누르는 압도', '동귀어진의 맞바꿈',
  '경공으로 휘젓는 입체 결투', '점혈로 봉쇄한 제압', '진법의 생문(生門) 찾기', '내공을 흘려보내는 사량발천근',
  '금기무공을 꺼낸 도박', '자기희생을 건 마지막 일격', '기를 죽이는 무형(無形)의 경지', '미끼를 문 적의 빈틈 노리기',
] // 16
const ORDEAL = [ // {} 속에서 — 시련(명사)
  '단전이 부서진 폐인의 나날', '믿음을 뒤엎는 정체 폭로', '동료를 잃은 최저점', '주화입마의 발작',
  '쫓기고 또 쫓기는 추격', '관무불가침이 깨진 혼란', '정사대전(正邪大戰)의 한복판', '새외세력의 침공',
  '해독 시한(時限)에 쫓기는 다급함', '사문의 누명', '천하제일이라는 자리의 저주', '강해질수록 깊어지는 고립',
  '갚을 은인이 곧 원수인 딜레마', '회귀로 더 나빠진 미래', '혈연과 협(俠) 사이의 마비', '명리(名利)와 정(情)의 갈림길',
  '대의를 위한 사적 복수의 포기', '값싼 화해를 거부하는 결단',
] // 18
const ENDING = [ // 종결절 — 결말(문장)
  '마침내 천하제일에 오른다', '검을 멈추고 협(俠)의 승리를 택한다', '모든 것을 잃고도 다시 일어선다', '핏줄보다 협을 택해 검을 휘두른다',
  '원수를 살려 천하를 구한다', '명리를 버리고 강호를 떠나 은거한다', '동귀어진으로 적과 함께 스러진다', '잿더미 위 흑막의 정체를 폭로한다',
  '사적 원한을 천하대의로 승화시킨다', '강함의 대가로 가장 사랑하는 것을 잃는다', '무공의 틀을 버리고 새 길을 깨친다', '평범한 삶이 끝내 허락되지 않음을 받아들인다',
  '배신한 합격진을 다시 뒤집어 역전한다', '전대의 죄를 대신 짊어지고 봉인을 완성한다', '경악하는 강호를 뒤로하고 홀로 선다', '얻은 기연이 곧 재앙의 씨앗이었음을 깨닫는다',
  '복수를 끝낸 검을 강물에 던져 버린다', '정인의 손을 잡고 안개 낀 강가의 배에 오른다',
] // 18

// 한 줄 시놉시스 한 문장을 합성한다(받침에 맞춘 실제 조사 사용).
function makeLogline(p: { hero: string; place: string; trig: string; gift: string; foe: string; manner: string; ordeal: string; ending: string }): string {
  const { hero, place, trig, gift, foe, manner, ordeal, ending } = p
  return `${hero}${eun(hero)} ${place}에서 ${trig}${euro(trig)} ${gift}${eul(gift)} 얻어, ` +
    `${foe}${gwa(foe)}의 ${manner}${euro(manner)} 맞선 끝에 ${ordeal} 속에서 ${ending}.`
}
const SCENE_SLOTS = [HERO, PLACE, TRIGGER, GIFT, FOE, MANNER, ORDEAL, ENDING]
function rollLogline(): string {
  const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]
  return makeLogline({
    hero: pick(HERO), place: pick(PLACE), trig: pick(TRIGGER), gift: pick(GIFT),
    foe: pick(FOE), manner: pick(MANNER), ordeal: pick(ORDEAL), ending: pick(ENDING),
  })
}

// 조합수: 무협 한 줄 시놉시스 생성기 — 8개 독립 슬롯의 곱집합(고유 항목만).
//   16×16×16×16×16×16×18×18 = 5,435,817,984가지의 서로 다른 한 줄 시놉시스.
function comboCount(): number {
  return SCENE_SLOTS.reduce((n, slot) => n * slot.length, 1)
}
function fmtNum(n: number): string {
  // 한국어 만/억/조 단위 근사 표기
  if (n >= 1e12) return (n / 1e12).toFixed(n >= 1e13 ? 0 : 1) + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e9 ? 0 : 1) + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(0) + '만'
  return n.toLocaleString('ko-KR')
}

const fullText = (f: Flat): string => {
  const t = (f.d.tags || []).join(' ')
  return `${f.d.name} ${f.d.hanja || ''} ${f.d.def} ${f.d.use} ${f.d.ex} ${f.d.twist} ${f.catLabel} ${t}`.toLowerCase()
}

// ── 컴포넌트 ───────────────────────────────────────────────
export default function WuxiaDevices() {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + ':cat')
      if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 펼침 상태: "catKey::name" 집합
  const [open, setOpen] = useState<Record<string, boolean>>({})
  // 즐겨찾기: "catKey::name"
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + ':favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<Flat | null>(null)
  const [logline, setLogline] = useState<string>('')
  const [copied, setCopied] = useState<string>('')
  const [toast, setToast] = useState<string>('')
  const nonce = useRef(0)

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + ':cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + ':favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  // 복사/토스트 타이머 정리(언마운트 안전)
  useEffect(() => { if (!copied) return; const t = window.setTimeout(() => setCopied(''), 1500); return () => window.clearTimeout(t) }, [copied])
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(''), 2400); return () => window.clearTimeout(t) }, [toast])

  const total = useMemo(() => flatAll().length, [])
  const combos = useMemo(() => comboCount(), [])
  const fk = (catKey: string, name: string) => `${catKey}::${name}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = cat === ALL_KEY ? flatAll() : flatAll().filter((f) => f.catKey === cat)
    if (onlyFav) base = base.filter((f) => favs[fk(f.catKey, f.d.name)])
    if (q) base = base.filter((f) => fullText(f).includes(q))
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    const pool = cat === ALL_KEY ? flatAll() : flatAll().filter((f) => f.catKey === cat)
    if (!pool.length) { setRandom(null); return }
    const my = ++nonce.current
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.d.name === prev.d.name && pick.catKey === prev.catKey) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return my === nonce.current ? pick : prev
    })
    // 무작위로 뽑힌 항목은 펼쳐 보여준다
  }, [cat])

  // 무협 한 줄 시놉시스 한 문장을 새로 합성한다(이전과 다르게).
  const rollSceneLine = useCallback(() => {
    setLogline((prev) => { let s = rollLogline(); if (s === prev) s = rollLogline(); return s })
  }, [])

  const toggleOpen = (catKey: string, name: string) => {
    const k = fk(catKey, name)
    setOpen((p) => ({ ...p, [k]: !p[k] }))
  }
  const toggleFav = (catKey: string, name: string) => {
    const k = fk(catKey, name)
    setFavs((p) => { const n = { ...p }; if (n[k]) delete n[k]; else n[k] = true; return n })
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text)
      .then(() => setCopied(id))
      .catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }

  // 한 항목을 텍스트로 직렬화(복사·라이브러리용)
  const deviceText = (f: Flat): string => {
    const title = `${f.catIcon} [${f.catLabel}] ${f.d.name}${f.d.hanja ? `(${f.d.hanja})` : ''}`
    return [
      title,
      `· 정의: ${f.d.def}`,
      `· 사용법: ${f.d.use}`,
      `· 예시: ${f.d.ex}`,
      `· 비틀기: ${f.d.twist}`,
    ].join('\n')
  }

  // 항목을 프로젝트 자료〈서사 장치〉 폴더 메모로 추가
  const addDeviceToProject = (f: Flat) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escHtml(f.catIcon + ' ' + f.catLabel)} · ${escHtml(f.d.name)}${f.d.hanja ? ' ' + escHtml('(' + f.d.hanja + ')') : ''}</b></p>`,
      `<p><b>정의</b> — ${escHtml(f.d.def)}</p>`,
      `<p><b>사용법</b> — ${escHtml(f.d.use)}</p>`,
      `<p><b>예시</b> — ${escHtml(f.d.ex)}</p>`,
      `<p><b>비틀기</b> — ${escHtml(f.d.twist)}</p>`,
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '서사 장치', title: `[무협] ${f.d.name}`, bodyHtml })
    if (id) setToast(`프로젝트 자료〈서사 장치〉에 ‘${f.d.name}’를 추가했습니다.`)
  }

  // 항목을 공유 라이브러리(글감 snippets)에 저장 — 다른 도구에서 재활용
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: deviceText(f),
      source: '무협 서사 장치·전개법 사전',
      tags: ['무협', f.catLabel, f.d.name, ...(f.d.tags || [])],
    })
    setToast(`글감 라이브러리에 ‘${f.d.name}’를 저장했습니다.`)
  }

  // 스타일
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const input: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const field = (label: string, val: string) => (
    <div style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 4 }}>
      <span style={{ color: 'var(--accent)', fontWeight: 700, marginRight: 5 }}>{label}</span>
      <span>{val}</span>
    </div>
  )

  const renderDevice = (f: Flat, key: string, forceOpen = false) => {
    const k = fk(f.catKey, f.d.name)
    const isOpen = forceOpen || !!open[k]
    const isFav = !!favs[k]
    return (
      <div key={key} style={card}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, cursor: 'pointer' }} onClick={() => !forceOpen && toggleOpen(f.catKey, f.d.name)}>
          <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={f.catIcon} /> {f.catLabel}</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{f.d.name}</span>
          {f.d.hanja && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{f.d.hanja}</span>}
          <button
            className="minibtn"
            title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
            onClick={(e) => { e.stopPropagation(); toggleFav(f.catKey, f.d.name) }}
            style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}
          >
            {isFav ? '★' : '☆'}
          </button>
          {!forceOpen && <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>}
        </div>
        {/* 닫힌 상태에서도 정의 한 줄은 보여 검색·훑기 편의 */}
        {!isOpen && <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 5, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{f.d.def}</div>}
        {isOpen && (
          <div style={{ marginTop: 4 }}>
            {field('정의', f.d.def)}
            {field('사용법', f.d.use)}
            {field('예시', f.d.ex)}
            {field('비틀기', f.d.twist)}
            {f.d.tags && f.d.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
                {f.d.tags.map((t) => (
                  <span key={t} style={{ fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 999, padding: '1px 7px' }}>#{t}</span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
              <button className="minibtn" onClick={() => copy(deviceText(f), 'd:' + k)}>
                {copied === 'd:' + k ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
              </button>
              <button className="minibtn" onClick={() => saveSnippet(f)}><Emoji e="💾" /> 글감 저장</button>
            </div>
            {/* 연계 */}
            <div className="linkbar" style={{ marginTop: 8 }}>
              <span className="linkbar-label">연계:</span>
              <button
                className="linkbtn"
                onClick={() => addDeviceToProject(f)}
                disabled={!hasProjectBridge()}
                title={hasProjectBridge() ? '이 장치를 프로젝트 자료〈서사 장치〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}
              >
                <Emoji e="📄" /> 프로젝트에 추가
              </button>
              <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid')} title="플롯 구조에 이 장치를 배치"><Emoji e="📐" /> 플롯 피라미드</button>
              <button className="linkbtn" onClick={() => openToolLinked('scene-forge')} title="이 장치로 장면 만들기"><Emoji e="🎬" /> 장면 만들기</button>
              <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck')} title="반전 카드로 비틀기 더 굴리기"><Emoji e="🃏" /> 반전 카드덱</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={hint}>
        무협(武俠) 고유의 <b>서사 장치·전개법 {total}종</b>을 8개 유형으로 정의·사용법·예시·비틀기까지 모았습니다.
        ‘한 줄 시놉시스’ 버튼은 8개 슬롯(주인공·장소·계기·무공·적·대결·시련·결말)을 한 문장으로 엮어 <b>약 {fmtNum(combos)}({combos.toLocaleString('ko-KR')})가지</b>를 만듭니다.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="장치·전개·페이싱 검색 (예: 기연, 주화입마, 회귀, 정사대전, 귀은)"
        style={input}
      />

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="✨" /> 전체
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on} title={c.note}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={c.icon} /> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 장치</button>
        <button className="minibtn" onClick={rollSceneLine} style={{ flex: '0 0 auto' }} title="장치들을 한 문장으로 엮어 무협 한 줄 시놉시스를 합성합니다"><Emoji e="📜" /> 한 줄 시놉시스</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}종 표시</span>
      </div>

      {/* 현재 카테고리 안내 */}
      {cat !== ALL_KEY && (
        <div style={{ ...hint, fontSize: 11.5, fontStyle: 'italic' }}>
          <Emoji e={CATS.find((c) => c.key === cat)?.icon || ''} /> {CATS.find((c) => c.key === cat)?.note}
        </div>
      )}

      {/* 무작위 결과(펼친 카드) */}
      {random && (
        <div style={{ border: '1px solid var(--accent)', borderRadius: 10, padding: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 0' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}><Emoji e="🎲" /> 무작위로 뽑은 장치</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          {renderDevice(random, 'rand:' + fk(random.catKey, random.d.name), true)}
        </div>
      )}

      {/* 무협 한 줄 시놉시스(logline) 합성 결과 */}
      {logline && (
        <div style={{ border: '1px solid var(--accent)', borderRadius: 10, padding: '8px 12px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}><Emoji e="📜" /> 한 줄 시놉시스 (8개 슬롯 조합)</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={rollSceneLine} title="다시 합성"><Emoji e="🎲" /> 다시</button>
            <button className="minibtn" onClick={() => setLogline('')}>✕</button>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.7, marginTop: 7 }}>{logline}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(logline, 'logline')}>
              {copied === 'logline' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
            </button>
            <button className="minibtn" onClick={() => {
              addToLibrary('snippets', { text: logline, source: '무협 서사 장치·전개법 사전 — 한 줄 시놉시스', tags: ['무협', '시놉시스', 'logline'] })
              setToast('글감 라이브러리에 한 줄 시놉시스를 저장했습니다.')
            }}><Emoji e="💾" /> 글감 저장</button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5 }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 장치가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map((f) => renderDevice(f, fk(f.catKey, f.d.name)))
        )}
      </div>

      <div style={hint}>
        장치는 공식이 아니라 출발점입니다. <b>비틀기</b>로 클리셰를 뒤집고, 파워업엔 반드시 <b>대가</b>를 붙여 긴장을 지키세요.
      </div>
    </div>
  )
}
