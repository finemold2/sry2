// 미스터리·추리 장치·전개법 사전 — 추리 서사 고유의 장치(페어플레이 단서, 레드헤링, 서술트릭, 챕터 끝 훅,
// 의외의 범인)와 전개/하위장르 패턴(본격·도서추리·코지·하드보일드·경찰소설·일상미스터리·이야미스 등)을
// 정의 + 사용법 + 예시 + 비틀기(변주)로 묶은 로컬 사전. 장르 통념·대표작 분석에 근거한 자작 데이터.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(즐겨찾기·마지막 카테고리·검색)만 사용.
// 연계: 항목을 프로젝트 자료(미스터리 장치) 폴더 메모로 추가 / 글감 스니펫 라이브러리로 보관 / 관련 도구 열기.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'mystery-devices',
  name: '미스터리·추리 장치·전개법 사전',
  icon: '🕵️',
  group: '장치·전개',
  genre: '미스터리·추리',
  intro: '페어플레이 단서·레드헤링·서술트릭·챕터 끝 훅·의외의 범인과 본격/도서/코지/하드보일드 전개 패턴을 정의·사용법·예시·비틀기로 찾아 사건에 심으세요',
  w: 680,
  h: 640,
}

const LS = 'sry:tool:mystery-devices:'

interface Device {
  name: string        // 장치/패턴 이름
  alias?: string      // 영문/통용 표기
  def: string         // 정의
  use: string         // 사용법(실무 지침)
  ex: string          // 예시(대표작·관습)
  twist: string       // 비틀기(변주·주의)
}
interface CatDef { key: string; label: string; icon: string; desc: string; items: Device[] }

// ── 장르 통념·대표작 근거 장치/전개 데이터 (미스터리·추리 특화·구체적) ──────────
const CATS: CatDef[] = [
  {
    key: 'fairplay', label: '페어플레이·단서 설계', icon: '🃏',
    desc: '독자와 탐정이 같은 정보를 쥐고 겨루도록 단서를 공정하게 배치하는 본격 추리의 핵심 규약. 녹스의 십계·반 다인 20칙의 정신.',
    items: [
      {
        name: '페어플레이(공정한 단서)', alias: 'Fair-play / Clueing',
        def: '진상을 추리하는 데 필요한 모든 단서를 독자에게도 결말 전에 빠짐없이 제시한다는 원칙. 탐정만 본 증거나 막판에 튀어나온 새 정보로 풀면 반칙이다.',
        use: '범인 지목에 쓰일 핵심 단서 3~5개를 목록화하고, 각각 결말보다 한참 앞 챕터에 "무심하게" 심어라. 재독 시 "아, 그때 그게!" 하고 다 보이도록 배치하되, 초독 땐 다른 의미로 읽히게 위장하라.',
        ex: '크리스티 『그리고 아무도 없었다』, 엘러리 퀸의 "독자에의 도전"(여기까지 단서는 다 나왔다, 풀어보라). 녹스의 십계·반 다인 20칙의 토대.',
        twist: '모든 단서를 보여주되 "보는 법"을 끝까지 숨겨라. 단서는 1장에 다 깔렸지만, 그것을 꿰는 열쇠(한 인물의 거짓말 하나)가 마지막에 드러나며 평범하던 단서가 일제히 의미를 바꾼다.',
      },
      {
        name: '단서의 이중 의미', alias: 'Double-meaning Clue',
        def: '겉으로는 자연스러운 디테일이지만 진상을 알면 결정적 증거가 되는 단서. 처음엔 A로 읽히고 재독 땐 B로 읽힌다.',
        use: '단서를 "장면의 분위기·생활 묘사"로 위장해 흘려라. 독자가 멈춰 서지 않도록 다른 흥미로운 사건과 같은 문단에 끼워라(주의 분산). 정답을 알고 다시 읽으면 명백하도록 정밀하게 써라.',
        ex: '시계가 멈춘 시각, 거울에 비친 글자, "왼손잡이"라는 한마디, 부고 기사의 날짜. 크리스티가 즐겨 쓴 일상 디테일형 단서.',
        twist: '이중 의미를 삼중으로 겹쳐라. 독자가 위장(A)을 간파해 B로 읽도록 유도한 뒤, 진짜 의미는 C였다고 한 겹 더 벗긴다(똑똑한 독자를 노린 함정).',
      },
      {
        name: '소거법·용의자 풀', alias: 'Elimination / Suspect Pool',
        def: '한정된 용의자 집단을 세우고, 알리바이·동기·물증으로 하나씩 지워 마지막 한 명을 남기는 추론 구조. 클로즈드 서클의 단골 엔진.',
        use: '용의자 수를 통제 가능하게(보통 4~8명) 두고, 각자에게 동기·기회·수단 중 일부를 부여하라. 소거의 근거를 단서로 공정하게 깔되, "완벽한 알리바이"를 가진 자를 일부러 한 명 두어 후반 반전의 씨앗으로 삼아라.',
        ex: '오리엔트 특급 살인의 폐쇄된 객차, 그리고 아무도 없었다의 외딴 섬, 폐관(閉館)·산장·여객선의 클로즈드 서클.',
        twist: '소거가 끝나 "남은 한 명"을 지목한 직후, 그 전제(용의자가 이들뿐이다)를 깨라. 명단에 없던 자(죽은 줄 알았던 피해자, 탐정 자신, 서술자)가 범인이다.',
      },
      {
        name: '독자에의 도전', alias: 'Challenge to the Reader',
        def: '"단서는 모두 제시됐다. 이제 당신이 범인을 맞혀 보라"고 작가가 명시적으로 끼어드는 메타 장치. 페어플레이의 자기 선언.',
        use: '진상 직전, 본문 흐름을 멈추고 짧게 독자에게 도전장을 던져라. 그러려면 그 시점까지 단서가 정말 빠짐없이 나왔어야 한다(이 장치는 작가의 결벽을 강제한다).',
        ex: '엘러리 퀸 초기작의 명물. 일본 본격(신본격)에서 오마주로 자주 부활(아야츠지 유키토 등).',
        twist: '도전장 자체를 미끼로 써라. "단서는 다 나왔다"는 그 선언이 거짓말이거나, 도전 문구 안에 마지막 단서가 숨어 있게 한다.',
      },
      {
        name: '체호프의 단서(미회수 금지)', alias: "Chekhov's Clue",
        def: '강조해 보여준 사물·정보·이상한 행동은 반드시 회수되어야 한다는 원칙. 미스터리에선 더 엄격해, 의미 없이 강조된 디테일은 독자를 배신한다.',
        use: '강조한 모든 디테일에 "회수 장부"를 매겨라(이 손수건은 어디서 풀리나?). 진짜 단서를 가리려고 넣은 무의미한 강조는 레드헤링으로 명확히 분류해 끝에 해명하라.',
        ex: '벽난로 위의 권총, 누군가 반복해 만지는 반지, "그날따라 개가 짖지 않았다"(은의 백마, 셜록 홈즈)—짖지 않은 개라는 부재 단서의 고전.',
        twist: '"부재"를 단서로 써라. 있어야 할 것이 없는 것(짖지 않은 개, 사라진 한 켤레, 비어 있는 일정)이 가장 들키지 않는 단서다.',
      },
    ],
  },
  {
    key: 'misdirect', label: '레드헤링·오도', icon: '🐟',
    desc: '독자의 의심을 엉뚱한 곳으로 끌고 가 진범을 가리는 기만 기술. 거짓 단서·거짓 용의자·서술의 시선 조작.',
    items: [
      {
        name: '레드헤링(거짓 단서)', alias: 'Red Herring',
        def: '그럴듯하지만 진상과 무관한 단서·용의자로 독자의 추리를 의도적으로 빗나가게 하는 장치. 추리의 재미를 지탱하는 합법적 기만.',
        use: '레드헤링은 "진짜 단서보다 더 눈에 띄게" 배치하라(독자의 시선을 잡아먹게). 단, 결말에서 그것이 왜 빨간 청어였는지 반드시 해명하라—해명 없는 레드헤링은 사기다.',
        ex: '수상한 행동을 하지만 무관한 비밀(불륜·횡령)을 숨긴 용의자, 살인과 무관한 협박 편지. 크리스티의 전매특허.',
        twist: '레드헤링을 진실로 뒤집어라(이중 블러프). 독자가 "이건 함정이겠지" 하고 무시하도록 유도한 가장 의심스러운 자가, 실은 진짜 범인이었다(가장 뻔한 자가 정답).',
      },
      {
        name: '거짓 용의자(스케이프고트)', alias: 'False Suspect',
        def: '동기·기회·태도가 의심스러워 독자가 범인으로 점찍게 되는 인물. 진범을 가리는 그림자 역할.',
        use: '거짓 용의자에게 "범인이 아닌 이유로 수상한" 비밀을 줘라(다른 죄·약점). 그가 결백을 증명하는 과정이 또 다른 단서가 되게 하고, 누명에서 벗어나는 순간 독자의 시선을 진범에게 넘겨라.',
        ex: '갑자기 도주하는 인물, 흉기를 만진 손, 피해자와 다툰 직후의 알리바이 부재—전형적 "1순위 용의자".',
        twist: '거짓 용의자가 스스로 범인을 자처하게 하라(누군가를 감싸려는 거짓 자백). 그 거짓 자백이 오히려 진범의 정체를 가리키는 단서가 된다.',
      },
      {
        name: '주의 분산(스포트라이트 조작)', alias: 'Misdirection / Spotlight',
        def: '마술의 미스디렉션처럼, 화려한 사건·감정·서브플롯으로 독자의 주의를 끌어 결정적 단서를 시야 밖에 두는 기법.',
        use: '진짜 단서를 제시하는 바로 그 순간, 더 자극적인 일(다툼, 또 다른 시신, 충격 고백)을 터뜨려 독자의 눈을 돌려라. 단서는 화려한 사건의 "곁다리"처럼 흘려야 기억에 남지 않는다.',
        ex: '두 번째 살인이 일어나 모두가 그쪽을 볼 때, 진짜 결정적 증거가 무심히 지나간다. 크리스티·카의 페이싱 기술.',
        twist: '분산 자체를 범인이 연출했다고 밝혀라. 두 번째 사건이 진짜 단서를 덮기 위한 범인의 자작극이었다(사건이 곧 미스디렉션).',
      },
      {
        name: '신뢰 가는 인물의 함정', alias: 'Trusted Insider',
        def: '독자가 의심하지 않는 위치의 인물(조수·경찰·의사·서술자·어린이·노인)을 진범으로 두어 사각지대를 노리는 장치.',
        use: '"이 사람만은 아니다"라는 안전지대를 먼저 단단히 세워라(선량함·약자성·직업적 신뢰). 그 신뢰가 클수록 폭로의 충격이 크다. 단, 재독 시 그의 행동이 다 설명되도록 단서를 깔아라.',
        ex: '애크로이드 살인사건의 서술자, 충직한 집사·간호사·주치의가 범인인 관습. "가장 가까운 자를 의심하라"의 역설.',
        twist: '탐정의 조수(왓슨 포지션)나 탐정 자신을 범인으로 두어 장르의 메타 규약을 배신하라(단, 페어플레이는 지킬 것).',
      },
      {
        name: '동기의 위장', alias: 'Motive Misdirection',
        def: '명백해 보이는 동기(유산·치정·복수)를 전면에 세워 진짜 동기(은폐된 과거·예상 밖 이해관계)를 가리는 기법.',
        use: '가장 돈이 되는·가장 원한이 깊은 자를 무대 중앙에 세워라. 진범의 동기는 "왜 이 사람이?" 싶게 약하거나 숨겨야 한다. 진짜 동기는 사건의 표면이 아니라 과거·관계의 지층에 묻어라.',
        ex: '거액 유산 상속자가 1순위로 의심받지만, 진범의 동기는 20년 전 묻은 비밀의 폭로 차단이었다는 식.',
        twist: '동기를 "없게" 만들어라. 진범에게 표면적 동기가 전혀 없어 보이게 한 뒤(완전 무동기처럼), 사실은 가장 절박한 동기를 숨겼음을 드러낸다.',
      },
    ],
  },
  {
    key: 'narrative', label: '서술트릭·시점 기만', icon: '🎭',
    desc: '문장·시점·서술의 층위에서 독자를 속이는 고난도 장치. 진실을 숨기지 않고도 오독하게 만든다.',
    items: [
      {
        name: '서술트릭', alias: 'Narrative Trick',
        def: '거짓말을 하지 않으면서 서술의 틈(생략·중의·시점)을 이용해 독자가 스스로 오해하게 만드는 기법. 일본 본격의 정수.',
        use: '"독자는 OO일 거라 멋대로 가정한다"는 빈틈을 노려라(성별·나이·인원수·시간 순서·생사·인물 동일성). 거짓 진술 없이, 정보를 "안 한" 것으로 속여라. 트릭 해제 후 본문이 모두 참이었음이 증명돼야 한다.',
        ex: '아야츠지 유키토 『십각관의 살인』의 시점 트릭, 노리즈키·오리하라 작품군, 애거사 크리스티의 1인칭 서술자 트릭의 원형.',
        twist: '서술트릭을 쓸 거라는 기대 자체를 역이용하라. 독자가 "분명 서술트릭이겠지" 하고 의심하는 바로 그 지점은 정직하게 두고, 전혀 다른 곳에서 트릭을 건다.',
      },
      {
        name: '신뢰할 수 없는 화자', alias: 'Unreliable Narrator',
        def: '서술자의 인식·기억·정직성에 결함이 있어, 그의 진술을 곧이곧대로 믿으면 진상을 놓치는 시점 구조.',
        use: '화자의 결함을 일찍, 미묘하게 흘려라(기억의 공백, 과음, 편향, 자기합리화). 독자가 "이 사람 말, 다 믿어도 되나?"를 의심하게 만들되, 어디까지가 거짓인지 끝에서 정산하라.',
        ex: 'The Murder of Roger Ackroyd, 『나를 찾아줘』의 교차 일기, 기억상실·정신질환 화자의 미스터리.',
        twist: '"믿을 수 없는 화자"라는 신호를 일부러 강하게 줘서 독자가 그를 통째로 의심하게 한 뒤, 결정적 한 가지만은 그가 진실을 말했음을 드러내라(거짓 속의 진실).',
      },
      {
        name: '시점 인물의 정체 은폐', alias: 'Hidden POV Identity',
        def: '시점·1인칭 화자의 정체(범인·피해자·다른 인물)를 문장 기교로 숨겨 결말에 폭로하는 트릭.',
        use: '화자의 이름·성별·역할을 직접 명시하지 말고 대명사·역할어로만 지칭하라. 독자가 화자를 "당연히 선량한 관찰자"로 가정하도록 유도하고, 그 가정을 결말에 무너뜨려라.',
        ex: '범인이 1인칭 화자였던 고전, "나"가 두 사람이었던 트릭, 화자가 이미 죽은 자였던 구성.',
        twist: '시점을 여러 장에 걸쳐 교차시키되, 둘로 보이던 화자가 사실 한 명(혹은 한 명으로 보이던 화자가 둘)이었음을 마지막에 합치거나 쪼개라.',
      },
      {
        name: '시간 순서 조작', alias: 'Chronological Trick',
        def: '사건의 서술 순서를 실제 발생 순서와 어긋나게 배치해, 독자가 인과·알리바이를 오인하게 만드는 트릭.',
        use: '장면을 시간 순으로 쓰지 말고, 독자가 "동시"라고 믿을 두 장면을 사실은 며칠 차이로 두는 식의 틈을 만들어라. 날짜·요일·계절의 단서는 정확히 적되 눈에 띄지 않게 묻어라.',
        ex: '교차 서술된 두 사건이 실은 시차가 있어 알리바이가 성립/붕괴하는 구성, 회상과 현재를 뒤섞은 시간차 트릭.',
        twist: '시간 조작을 공간 조작과 결합하라. 같은 시각으로 보이던 두 장면이 다른 시간일 뿐 아니라 다른 장소·다른 인물이었다고 이중으로 뒤집는다.',
      },
      {
        name: '인물 동일성·이인일역 트릭', alias: 'Identity Swap',
        def: '두 인물을 하나로(혹은 한 인물을 둘로) 오인하게 만드는 트릭. 쌍둥이·변장·이름 공유·역할 교대를 활용.',
        use: '두 인물이 결코 한 장면에 동시에 나오지 않도록 동선을 설계하라(독자가 의심하지 않게 자연스러운 이유를 붙여). 이름·호칭·외양의 사소한 일치를 단서로 깔되 강조하지 마라.',
        ex: '쌍둥이 알리바이, 1인 2역의 변장, 죽은 자로 위장한 생존, 같은 별명을 가진 두 사람.',
        twist: '이인일역의 통념을 역으로 써라. 독자가 "둘은 같은 사람일 것"이라 의심하도록 유도한 뒤, 정말로 다른 두 사람이었음을 밝혀 그 의심 자체를 단서의 함정으로 만든다.',
      },
    ],
  },
  {
    key: 'hook', label: '훅·페이싱·구조', icon: '🪝',
    desc: '독자를 다음 장으로 끌고 가는 챕터 끝 훅과, 수사–단서–막다른 골목–반전의 미스터리 고유 리듬.',
    items: [
      {
        name: '챕터 끝 훅(클리프행어)', alias: 'Chapter-end Hook',
        def: '장 끝을 새 시신·뜻밖의 폭로·반전된 단서·위협으로 끊어, 독자가 책을 못 덮게 만드는 페이싱 장치. 미스터리의 페이지터너 엔진.',
        use: '각 장 끝에 "새 질문"을 하나씩 던져라(누가? 왜 거기에? 그럼 그 알리바이는?). 답을 다음 장에서 바로 주지 말고, 한 박자 미뤄 긴장을 끌어라. 장 첫 줄은 앞 장의 충격을 받아 곧장 굴려라.',
        ex: '두 번째 살인으로 끝나는 장, "그 순간 그녀는 책상 위의 사진을 보았다"로 끊기, 웹소설 추리물의 회차 끝 클리프행어.',
        twist: '훅을 페이크로 써라. 충격적으로 끊은 장 끝의 위협이 다음 장에서 김빠지게 해소되도록 두고(거짓 클리프행어), 진짜 위협은 안심한 순간 터뜨려라.',
      },
      {
        name: '수사 비트 시퀀스', alias: 'Investigation Beats',
        def: '사건 발생→현장 검증→탐문→단서 확보→가설→막다른 골목→재단서→반전→진상→해결로 이어지는 미스터리의 표준 진행 골격.',
        use: '"전진(단서 확보)–후퇴(막다른 골목)"를 번갈아 배치해 리듬을 만들어라. 가설을 한 번 세웠다 무너뜨리는 "중간 오답"을 꼭 넣어라(독자도 같이 틀려야 재미있다). 진상은 정보가 다 모인 뒤 한 번에 정산하라.',
        ex: '셜록 홈즈식 현장 관찰→연역, 경찰소설의 탐문·물증 수집 루틴, 본격의 "탐정의 추리 발표회".',
        twist: '비트를 거꾸로 돌려라(도서추리: 하우캐치엠). 범인이 누군지 처음부터 보여주고, "어떻게 잡히는가"를 수사 비트로 끌어가라.',
      },
      {
        name: '막다른 골목·중간 오답', alias: 'Dead End / False Solution',
        def: '탐정과 독자가 그럴듯한 해답에 도달했다가 새 사실로 무너지는 지점. 가짜 해결을 거쳐 진짜 해결로 가는 본격의 묘미.',
        use: '중간에 "완성도 높은 가짜 해답"을 제시하라(독자가 만족할 만큼). 그 가짜 해답이 설명하지 못하는 단 하나의 단서를 남겨, 그 균열에서 진상이 솟게 하라.',
        ex: '엘러리 퀸·카의 "다중 해답"(여러 그럴듯한 풀이를 거쳐 진상), 첫 자백이 거짓이었음이 드러나는 경찰소설.',
        twist: '가짜 해답을 진짜에 한없이 가깝게 만들어라. 범인은 맞혔으나 동기·수법이 틀렸다거나, 수법은 맞으나 범인이 다른 식으로 "거의 정답"을 비틀어라.',
      },
      {
        name: '시한·압박 장치', alias: 'Ticking Clock',
        def: '다음 살인 예고, 시효 만료, 처형 임박, 폭로 시한 등으로 수사에 시간 압박을 거는 장치. 정적인 추리에 추진력을 준다.',
        use: '"진상을 못 밝히면 무엇이 더 나빠지나"를 명시하라(또 죽는다, 무고한 자가 처형된다). 다음 사건이 예고된 연쇄살인 구도면, 예고 패턴 자체를 단서로 삼아라.',
        ex: '연쇄살인의 다음 표적 예고(견적·암호·시), 처형 집행 전 진범을 찾는 법정 미스터리, 시효 만료를 앞둔 콜드케이스.',
        twist: '시한을 거짓으로 두어라. 다음 살인 예고가 수사를 특정 방향으로 몰기 위한 범인의 미끼였고, 진짜 사건은 전혀 다른 곳에서 벌어진다.',
      },
      {
        name: '탐정의 추리 발표(디덕션 신)', alias: 'The Reveal',
        def: '용의자를 한자리에 모으고 탐정이 단서를 재구성해 범인을 지목하는 클라이맥스 관습. 본격·황금기의 상징적 무대.',
        use: '발표 전, 흩어진 단서를 독자가 떠올릴 수 있도록 짧게 환기하라. 추리는 단서→추론→결론의 사슬로 보여라(비약 금지). 진범을 마지막에 호명하고, 그 직전까지 누구든 가능해 보이게 긴장을 유지하라.',
        ex: '푸아로·엘러리 퀸의 응접실 추리극, 클로즈드 서클 마지막의 일제 해명, 코난식 "범인은 바로 당신".',
        twist: '발표 도중 추리가 한 번 뒤집히게 하라. 탐정이 지목한 직후 새 사실로 결론이 바뀌거나, 진범이 탐정의 추리에 반박하며 진짜 진상을 드러낸다.',
      },
    ],
  },
  {
    key: 'culprit', label: '의외의 범인·반전', icon: '🎯',
    desc: '독자의 사각을 찌르는 범인 유형과, 복선 회수로 정당화되는 반전의 설계.',
    items: [
      {
        name: '의외의 범인', alias: 'Least Likely Suspect',
        def: '독자가 가장 의심하지 않는 인물이 범인이라는 본격의 황금률. 단, "의외"가 "반칙"이 되지 않도록 페어플레이로 떠받쳐야 한다.',
        use: '의외성은 "정보를 숨겨서"가 아니라 "독자의 선입견을 이용해서" 만들어라(직업·약자성·호감으로 의심을 면제받은 자). 폭로 후 재독하면 그의 모든 행동이 단서였음이 드러나게 깔아라.',
        ex: '서술자·탐정의 조수·경찰·피해자(자작극)·이미 죽은 줄 안 인물·어린이·노인·전원 공범. 크리스티가 거의 모든 "의외의 범인" 유형을 한 번씩 썼다.',
        twist: '의외성의 인플레를 경계하라. "가장 의외라서" 범인인 게 빤히 보이는 시대엔, 오히려 "가장 뻔한 1순위 용의자"가 진범인 게 가장 의외다(이중 블러프).',
      },
      {
        name: '피해자=범인(자작극)', alias: 'Victim as Culprit',
        def: '피해자로 보이던 인물이 사건을 꾸민 장본인이거나, 자신의 죽음·실종을 위장해 누군가를 함정에 빠뜨린 구도.',
        use: '피해자의 죽음·피해를 독자가 의심 없이 받아들이게 만든 뒤(시신 확인의 허점, 위장 자살), 그 전제를 무너뜨려라. 자작극의 동기(누명·복수·보험·잠적)와 트릭(시신 바꿔치기 등)을 공정히 깔아라.',
        ex: '위장 자살로 원수를 살인범으로 모는 구도, 협박을 자작해 동정을 사는 인물, 보험금·복수형 자작극.',
        twist: '자작극이 도중에 진짜 사건으로 변질되게 하라. 죽음을 위장하려던 자가 제3자에게 진짜로 살해당해, 자작극과 진짜 살인이 한 현장에 겹친다.',
      },
      {
        name: '전원 공범', alias: 'Everyone Did It',
        def: '단독범으로 보이던 사건이 실은 다수의 공모였다는 반전. 소거법의 전제(범인은 한 명)를 통째로 깨는 충격적 구조.',
        use: '공범 구도를 쓰려면 "왜 모두가 한마음인가"라는 강한 공동 동기를 세워라(공동의 피해·복수·정의). 각자의 알리바이가 서로를 가려주는 구조를 단서로 깔되, 누구 하나만 봐선 안 보이게 하라.',
        ex: '오리엔트 특급 살인의 집단 공모, 마을 전체가 공범인 구도, 일가족·동창회 공모.',
        twist: '"전원 공범"을 가짜로 두어라. 모두가 자기가 공범이라 믿지만, 실제 치명타를 가한 건 단 한 명이었다(혹은 전원이 죽인 줄 알았으나 피해자는 그 전에 다른 이유로 죽어 있었다).',
      },
      {
        name: '복선 회수·반전의 정당화', alias: 'Foreshadow Payoff',
        def: '반전이 "갑툭튀"가 아니라 "그럴 줄 알았어야 했다"가 되도록, 결말의 진상이 앞서 깔린 복선·단서를 일제히 회수하며 재배열되는 지점.',
        use: '반전을 정한 뒤 역산해 복선을 3겹으로 깔아라(명시적 1·암시적 1·위장된 1). 폭로 장면에서 그 복선들을 호명하며 회수해 "공정했음"을 증명하라. 회수 없는 반전은 배신이다.',
        ex: '잘 만든 본격의 마지막 10페이지에서 흩어진 단서가 한 그림으로 맞춰지는 카타르시스. 식스 센스형 재배열.',
        twist: '회수 직후 한 겹 더 벗겨라(이중 반전). 1차 진상으로 모든 복선이 풀린 듯하지만, 단 하나 남은 위화감이 2차 진상(진짜 흑막)을 가리킨다.',
      },
      {
        name: '하우더닛·와이더닛', alias: 'Howdunit / Whydunit',
        def: '"누가"보다 "어떻게(밀실·알리바이)" 또는 "왜(동기·심리)"에 초점을 둔 변형 구조. 범인을 일찍 밝히고도 긴장을 유지하는 길.',
        use: '범인이 명백한 사건이라면, 미스터리를 수법(불가능 범죄의 해법)이나 동기(이해할 수 없는 살인의 이유)로 옮겨라. 독자의 질문을 "누구?"에서 "어떻게/왜?"로 갈아끼우는 순간 새 추진력이 생긴다.',
        ex: '도서추리(콜롬보: 범인을 먼저 보여주고 어떻게 잡히는가), 사회파(왜 죽였는가의 동기 탐구·마쓰모토 세이초), 밀실의 하우더닛(존 딕슨 카).',
        twist: '하우더닛과 후더닛을 합쳐라. "어떻게"의 해법이 풀리는 순간, 그 수법을 쓸 수 있는 사람이 단 한 명뿐임이 드러나며 범인이 자동으로 특정된다.',
      },
    ],
  },
  {
    key: 'subgenre', label: '하위장르 전개 패턴', icon: '🗂️',
    desc: '본격·도서추리·코지·하드보일드·경찰소설·일상미스터리·이야미스 등 하위장르별 전개·톤·규약의 차이.',
    items: [
      {
        name: '본격(퍼즐) 미스터리', alias: 'Honkaku / Whodunit Puzzle',
        def: '논리적 단서와 페어플레이로 독자와 두뇌 게임을 벌이는 추리의 정통. 트릭·논리·소거가 주역이고 인물·정서는 부차적.',
        use: '단서의 공정성·논리의 엄밀함을 최우선에 두어라. 클로즈드 서클·독자에의 도전·디덕션 신 같은 본격 관습을 적극 활용하고, 우연·초자연·미공개 정보를 배제하라.',
        ex: '엘러리 퀸, 존 딕슨 카(밀실), 아야츠지 유키토·신본격(관 시리즈), 크리스티의 퍼즐형 작품.',
        twist: '본격의 엄밀함 위에 현대적 정서를 얹어라(신본격→사회파의 절충). 완벽한 논리 트릭을 풀고 나니 드러나는 건 가슴 아픈 인간의 동기, 라는 결.',
      },
      {
        name: '도서추리(하우캐치엠)', alias: 'Inverted / Howcatchem',
        def: '범인과 수법을 처음부터 독자에게 공개하고, "탐정이 어떻게 그를 잡는가"의 추격을 그리는 역(逆)추리 구조.',
        use: '서두에 범행을 보여줘 독자에게 "신만 아는 우월감"을 주어라. 긴장은 "완전범죄의 단 하나의 실수"를 탐정이 어떻게 파고드는가에서 나온다. 범인의 사소한 오만·실수를 단서로 심어라.',
        ex: '콜럼보(형사 콜롬보)의 전형, R. 오스틴 프리먼의 도서추리 창안, 일부 사회파.',
        twist: '도서추리 중간에 후더닛을 끼워라. 독자가 안다고 믿은 "범인"이 실은 진범의 미끼였고, 진짜 범인은 따로 있었음을 후반에 뒤집는다.',
      },
      {
        name: '코지 미스터리', alias: 'Cozy Mystery',
        def: '소도시·아마추어 탐정·따뜻한 공동체를 배경으로, 폭력·유혈을 절제하고 인간미·유머·생활감을 앞세운 순한 추리.',
        use: '매력적인 무대(빵집·서점·시골 마을)와 호감형 아마추어 탐정을 세워라. 살인은 무대 밖에서 일어나고 잔혹 묘사는 피하라. 사건만큼이나 인물·일상·관계의 재미가 독자를 끈다(시리즈물에 적합).',
        ex: '애거사 크리스티 미스 마플, 알렉산더 매콜 스미스 『넘버원 여탐정 에이전시』, 베이커리·고양이 코지 시리즈군.',
        twist: '코지의 따뜻한 톤 속에 묵직한 진실을 숨겨라. 화기애애한 마을의 표면 아래 공동체 전체의 오랜 비밀(은폐된 과거의 죄)이 사건의 뿌리였음을 드러낸다.',
      },
      {
        name: '하드보일드', alias: 'Hardboiled',
        def: '냉소적 사립탐정, 도시의 부패, 폭력과 배신을 건조하고 감각적인 1인칭으로 그리는 미국식 누아르 추리. 진실보다 분위기·태도가 중심.',
        use: '문체를 짧고 건조하게, 1인칭의 냉소와 감각 묘사를 살려라. 탐정은 사건을 풀수록 더 깊은 부패에 빠져들고, 해결은 깔끔하지 않다(승리에도 대가가 따른다). 팜므파탈·이중 의뢰인을 활용하라.',
        ex: '대실 해밋 『몰타의 매』, 레이먼드 챈들러 필립 말로 시리즈, 로스 맥도널드.',
        twist: '하드보일드의 냉소를 끝에서 깨뜨려라. 다 닳은 줄 알았던 탐정이 단 하나의 도덕적 선택(돈·여자를 등지고 진실을 택함)으로 인간성을 증명한다.',
      },
      {
        name: '경찰소설(폴리스 프로시저럴)', alias: 'Police Procedural',
        def: '한 명의 천재 탐정이 아니라 팀·조직·절차로 사건을 푸는 사실적 수사물. 탐문·과학수사·서류·관료제의 디테일이 핍진성을 만든다.',
        use: '수사 절차(현장 보존·부검·탐문·영장·조서)를 정확히 고증하라. 여러 형사의 분업·갈등·일상을 병치하고, 한 사건이 아니라 동시에 굴러가는 여러 사건으로 현실감을 줘라. 우연보다 발품이 단서를 만든다.',
        ex: '맥베인 87분서, 스웨덴 마르틴 베크 시리즈(셰발·발뢰), 한국·일본 형사물.',
        twist: '절차의 사실성 안에 인간 드라마를 심어라. 시스템(관료제·정치·예산)이 진범보다 더 큰 적이 되어, 진실을 밝혀도 정의가 실현되지 않는 씁쓸함을 남긴다.',
      },
      {
        name: '일상의 수수께끼', alias: 'Everyday Mystery',
        def: '살인 없이, 일상의 작은 이상(사라진 물건·이해 안 되는 행동·기묘한 우연)을 추리로 푸는 순한 하위장르. 따뜻한 진상이 특징.',
        use: '사건의 규모를 줄이고 관찰·추론의 정밀함을 키워라. "왜 그 사람은 그렇게 행동했나"의 동기 추리가 핵심이며, 진상은 대개 악의가 아닌 사연(배려·자존심·사랑)이다.',
        ex: '기타무라 가오루, 요네자와 호노부 『빙과』(고전부 시리즈), 일본 일상미스터리 계보.',
        twist: '따뜻한 일상의 수수께끼 끝에 한 줄기 서늘함을 남겨라. 선의로 보이던 행동의 이면에 작은 어둠이 비쳐, 안온한 톤에 균열을 낸다.',
      },
      {
        name: '이야미스(뒷맛 나쁜 미스터리)', alias: 'Iyamisu',
        def: '인간의 악의·질투·위선을 파헤쳐 독자에게 불쾌한 여운(뒷맛)을 남기는 일본발 심리 미스터리. 트릭보다 인간의 어둠이 주역.',
        use: '평범한 일상·관계(엄마들, 동창, 직장) 속의 미세한 악의를 누적시켜라. 다중 시점으로 같은 사건을 비춰 각자의 추악한 속내를 드러내고, 진상보다 "사람이 이렇게까지"의 충격을 노려라.',
        ex: '미나토 가나에 『고백』, 누마타 마호카루, 심리·악의 중심의 이야미스 계보.',
        twist: '독자를 공범으로 만들어라. 추악한 인물에게 어느새 공감하게 한 뒤, 그 공감이 곧 독자 자신의 어둠을 비추는 거울이었음을 깨닫게 한다.',
      },
      {
        name: '사회파 미스터리', alias: 'Social-school Mystery',
        def: '범죄를 사회 구조·시대의 모순(빈곤·차별·부패·전후 상흔)의 산물로 그려, 동기와 사회 비판에 무게를 두는 추리. 와이더닛 중심.',
        use: '"왜 이 사람이 범죄를 저질렀나"를 사회적 맥락에서 추적하라. 트릭은 절제하고, 범인의 동기가 시대·제도의 비극과 맞물리게 하라. 해결이 통쾌함보다 비애를 남기게 설계하라.',
        ex: '마쓰모토 세이초 『점과 선』·『모래그릇』, 모리무라 세이이치, 한국 사회파 추리.',
        twist: '범인을 단죄하지 못하게 하라. 사회 구조가 진짜 가해자라면, 개인 범인을 잡아도 비극은 반복되고 탐정은 무력감만 안는다.',
      },
    ],
  },
]

const ALL_KEY = '__all__'
const FAV_KEY = '__fav__'

const flatAll = (): { cat: CatDef; item: Device }[] =>
  CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 한 장치를 텍스트(복사·스니펫)로 직렬화.
function deviceToText(c: CatDef, d: Device): string {
  return [
    `🕵️ [${c.label}] ${d.name}${d.alias ? ` (${d.alias})` : ''}`,
    `· 정의: ${d.def}`,
    `· 사용법: ${d.use}`,
    `· 예시: ${d.ex}`,
    `· 비틀기: ${d.twist}`,
  ].join('\n')
}

// 한 장치를 프로젝트 본문(HTML)으로.
function deviceToHtml(c: CatDef, d: Device): string {
  return [
    `<p><b>🕵️ [${escHtml(c.label)}] ${escHtml(d.name)}${d.alias ? ` (${escHtml(d.alias)})` : ''}</b></p>`,
    `<p><b>정의</b> · ${escHtml(d.def)}</p>`,
    `<p><b>사용법</b> · ${escHtml(d.use)}</p>`,
    `<p><b>예시</b> · ${escHtml(d.ex)}</p>`,
    `<p><b>비틀기</b> · ${escHtml(d.twist)}</p>`,
  ].join('')
}

// ── 사건 트릭 설계 조합기: 슬롯 풀 ─────────────────────────────────────────
// 사전의 장치를 실제 한 추리 사건으로 조립하도록 9개 슬롯을 무작위 조합(잠금/재생성). 장르 통념 근거 자작 풀.
// 조합수 = 슬롯 풀 곱 ≈ 수천억 이상(핵심 생성기 지향).
interface SlotDef { key: string; label: string; icon: string; pool: string[] }
const SLOTS: SlotDef[] = [
  {
    key: 'subgenre', label: '하위장르·톤', icon: '🗂️', pool: [
      '본격(퍼즐) — 논리·트릭 우선', '도서추리 — 범인을 먼저 공개', '코지 — 따뜻한 소도시 아마추어 탐정',
      '하드보일드 — 냉소적 도시 사립탐정', '경찰소설 — 팀·절차 사실주의', '일상의 수수께끼 — 살인 없는 작은 이상',
      '이야미스 — 인간 악의의 뒷맛', '사회파 — 동기와 사회 비판', '신본격 — 메타적 트릭 유희',
      '리걸/법정 미스터리', '역사·시대 미스터리', '고딕·관 저택형 미스터리',
    ],
  },
  {
    key: 'scene', label: '사건 무대', icon: '🏚️', pool: [
      '눈보라에 고립된 외딴 산장', '폭풍우로 끊긴 외딴 섬의 저택', '운행 중인 침대열차의 객차',
      '폐관(閉館)된 도서관·박물관', '의식이 열리는 산골 마을', '명문가의 비밀 많은 대저택',
      '대학 연구실·기숙사', '여객선·크루즈의 선상', '폭설로 갇힌 산악 호텔',
      '쇠락한 극단·소극장', '온천 료칸·전통 여관', '회사 사옥의 야근 밤',
      '병원·요양원의 폐쇄 병동', '재개발을 앞둔 노포 상점가', '동창회가 열린 모교',
      '눈 내린 별장 단지', '안개 낀 항구 도시', '종교 시설·수도원',
    ],
  },
  {
    key: 'victim', label: '피해자·시신 상태', icon: '🔪', pool: [
      '안에서 잠긴 밀실의 시신', '독살로 보이는 평온한 죽음', '추락사로 위장된 타살',
      '시간이 어긋난 사후 변화', '신원을 알 수 없게 훼손된 시신', '자살로 보이는 정황의 죽음',
      '사라진 시신(시신 없는 살인)', '두 번째·세 번째 연쇄 피해자', '죽은 줄 알았으나 살아 있던 자',
      '모두가 미워하던 폭군의 죽음', '아무도 미워하지 않던 선인의 죽음', '예고된 살인의 첫 희생자',
      '과거 사건과 똑같은 수법의 시신', '음독 직전 남긴 다잉 메시지', '얼어붙은 채 발견된 시신',
    ],
  },
  {
    key: 'truecrime', label: '진상(트릭의 핵)', icon: '🧩', pool: [
      '서술트릭(시점·성별·시간 오인)', '신뢰할 수 없는 화자의 거짓', '이인일역·쌍둥이 알리바이',
      '시간 순서 조작으로 만든 알리바이', '피해자=범인의 자작극', '전원 공범의 공모',
      '의외의 범인(서술자·조수·탐정)', '밀실의 물리 트릭', '시신 바꿔치기·신원 위장',
      '원격·시한 장치를 이용한 부재 알리바이', '다잉 메시지의 진의 오독 유도', '하우더닛(누군지는 자명, 수법이 핵)',
      '와이더닛(범인은 일찍, 동기가 핵)', '죽음의 순서·인과 뒤집기', '독자의 선입견을 이용한 무동기 위장',
    ],
  },
  {
    key: 'culprit', label: '범인 정체', icon: '🎯', pool: [
      '가장 신뢰받던 인물(집사·주치의·간호사)', '탐정의 조수(왓슨 포지션)', '1인칭 서술자',
      '죽은 줄 알았던 피해자', '의심에서 일찍 벗어난 자', '가장 약해 보이던 인물(어린이·노인)',
      '경찰·수사 관계자', '완벽한 알리바이의 소유자', '피해자의 가족 전원(공범)',
      '겉보기 무동기의 제3자', '과거 사건의 생존자', '탐정 자신(메타 반전)',
      '가장 뻔한 1순위 용의자(이중 블러프)', '두 사람으로 위장한 한 명', '마을·조직 전체',
    ],
  },
  {
    key: 'motive', label: '숨은 동기', icon: '🕯️', pool: [
      '20년 전 묻은 비밀의 폭로 차단', '복수(과거의 죄에 대한 사적 단죄)', '거액 유산·보험금',
      '사랑하는 이를 감싸기 위해', '신원·과거를 들키지 않으려고', '치정·삼각관계의 파국',
      '집단의 명예·공동체 비밀 수호', '협박에서 벗어나려는 절박함', '오인·우발에서 시작된 은폐의 연쇄',
      '사회적 부조리가 낳은 비극', '자존심·열등감이 빚은 광기', '대의·신념을 위한 살인',
      '잘못된 정의감(사적 처형)', '잊고 싶은 트라우마의 재발', '아무도 모를 사소한 이유(불합리한 악의)',
    ],
  },
  {
    key: 'redherring', label: '레드헤링·오도', icon: '🐟', pool: [
      '수상하나 무관한 비밀을 숨긴 용의자', '살인과 무관한 협박 편지', '도주로 의심을 자초한 무고한 자',
      '범인이 연출한 가짜 두 번째 사건', '동기가 가장 뚜렷한 상속자', '흉기를 만진 결백한 손',
      '누군가를 감싸는 거짓 자백', '엉뚱한 곳을 가리키는 다잉 메시지', '의심을 사도록 조작된 알리바이',
      '진짜 단서를 덮는 충격 고백', '오해를 부르는 목격 증언', '범인이 흘린 거짓 살인 예고',
      '과거 사건과의 거짓 연결고리', '"이건 함정이겠지" 싶은 가장 뻔한 자', '무의미하게 강조된 사물(부재 단서 은폐)',
    ],
  },
  {
    key: 'cluekey', label: '결정적 단서', icon: '🔍', pool: [
      '멈춘 시계가 가리키는 진짜 시각', '짖지 않은 개(있어야 할 것의 부재)', '거울에 비쳐야 읽히는 글자',
      '왼손잡이/오른손잡이의 모순', '부고·신문의 날짜 어긋남', '두 인물이 동시에 없던 동선',
      '사후 변화와 증언의 시차', '평소와 다른 사소한 습관의 변화', '다잉 메시지의 중의적 해석',
      '독·약물의 발현 시간 역산', '사진·그림 속 위치의 모순', '소리(종·기차·시보)로 특정되는 시각',
      '필적·서명의 미세한 위조 흔적', '날씨·조수·일출 기록과의 불일치', '있을 수 없는 곳에 있던 사물',
    ],
  },
  {
    key: 'twistbeat', label: '반전·구조 위치', icon: '🪝', pool: [
      '중간 오답(가짜 해결)을 거친 진상', '독자에의 도전 직후의 디덕션 신', '챕터 끝 두 번째 살인 클리프행어',
      '막다른 골목에서 솟은 재단서', '복선 일제 회수의 마지막 10페이지', '이중 반전(1차 진상 뒤의 진짜 흑막)',
      '용의자를 모은 응접실 추리 발표', '자백이 거짓이었음의 폭로', '시한(다음 살인 예고) 직전의 결착',
      '소거 후 "명단 밖"의 범인 등장', '도서추리: 잡히는 과정의 마지막 실수', '신뢰하던 인물의 정체 폭로',
      '피해자 생존·자작극의 드러남', '서술트릭 해제로 본문 재독 유발', '단죄 못 하는 씁쓸한 결말(사회파)',
    ],
  },
]

interface CaseCombo { [slotKey: string]: string }
function comboToText(combo: CaseCombo): string {
  return ['🕵️ 미스터리·추리 사건 트릭 설계', ...SLOTS.map((s) => `${s.icon} ${s.label}: ${combo[s.key]}`)].join('\n')
}
function comboToHtml(combo: CaseCombo): string {
  return ['<p><b>🕵️ 미스터리·추리 사건 트릭 설계</b></p>',
    ...SLOTS.map((s) => `<p><b>${escHtml(s.icon + ' ' + s.label)}</b> · ${escHtml(combo[s.key] || '')}</p>`)].join('')
}

export default function MysteryDevices({ payload }: { payload?: Record<string, unknown> }) {
  const genre = typeof payload?.genre === 'string' ? (payload.genre as string) : '미스터리·추리'

  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || raw === FAV_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  const [random, setRandom] = useState<{ cat: CatDef; item: Device } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)
  const copyTimer = useRef<number | null>(null)

  // ── 모드(사전 / 사건 트릭 설계 조합기) ──
  const [mode, setMode] = useState<'dict' | 'gen'>('dict')
  // 조합기: 현재 뽑힌 슬롯 값 + 잠금 상태
  const [combo, setCombo] = useState<CaseCombo>(() => {
    const o: CaseCombo = {}
    SLOTS.forEach((s) => { o[s.key] = s.pool[Math.floor(Math.random() * s.pool.length)] })
    return o
  })
  const [locks, setLocks] = useState<Record<string, boolean>>({})

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  // 언마운트 정리(타이머)
  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
  }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  const favKey = (catKey: string, name: string) => `${catKey}::${name}`

  // 조합기의 슬롯 풀 곱 = 만들 수 있는 서로 다른 사건 트릭 설계 수(핵심 생성기 지향).
  const comboCount = useMemo(() => SLOTS.reduce((acc, s) => acc * s.pool.length, 1), [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base: { cat: CatDef; item: Device }[]
    if (cat === ALL_KEY) base = flatAll()
    else if (cat === FAV_KEY) base = flatAll().filter(({ cat: c, item }) => favs[favKey(c.key, item.name)])
    else base = CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (q) {
      base = base.filter(({ item }) =>
        item.name.toLowerCase().includes(q) ||
        (item.alias || '').toLowerCase().includes(q) ||
        item.def.toLowerCase().includes(q) ||
        item.use.toLowerCase().includes(q) ||
        item.ex.toLowerCase().includes(q) ||
        item.twist.toLowerCase().includes(q))
    }
    return base
  }, [query, cat, favs])

  const rollRandom = useCallback(() => {
    // 현재 카테고리 풀에서 무작위 1개(검색어 무시). 잠금 없는 단순 재생성.
    let pool: { cat: CatDef; item: Device }[]
    if (cat === ALL_KEY) pool = flatAll()
    else if (cat === FAV_KEY) pool = flatAll().filter(({ cat: c, item }) => favs[favKey(c.key, item.name)])
    else pool = CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.name === prev.item.name && pick.cat.key === prev.cat.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return pick
    })
  }, [cat, favs])

  const toggleFav = (catKey: string, name: string) => {
    const k = favKey(catKey, name)
    setFavs((prev) => {
      const next = { ...prev }
      if (next[k]) delete next[k]; else next[k] = true
      return next
    })
  }

  // ── 조합기: 잠금 안 된 슬롯만 재생성(직전 값과 다르게) ──
  const pickFresh = (s: SlotDef, prev?: string): string => {
    if (s.pool.length <= 1) return s.pool[0]
    let v = s.pool[Math.floor(Math.random() * s.pool.length)]
    if (prev !== undefined && v === prev) v = s.pool[Math.floor(Math.random() * s.pool.length)]
    return v
  }
  const regenerate = () => {
    setCombo((prev) => {
      const next: CaseCombo = { ...prev }
      SLOTS.forEach((s) => { if (!locks[s.key]) next[s.key] = pickFresh(s, prev[s.key]) })
      return next
    })
  }
  const regenSlot = (s: SlotDef) => setCombo((prev) => ({ ...prev, [s.key]: pickFresh(s, prev[s.key]) }))
  const toggleLock = (key: string) => setLocks((prev) => ({ ...prev, [key]: !prev[key] }))

  // 조합기 연계: 프로젝트 자료 〈미스터리 장치〉 폴더에 사건 트릭 설계 메모 추가.
  const comboToProj = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '미스터리 장치',
      title: `사건 트릭 설계 — ${combo.scene}`,
      bodyHtml: comboToHtml(combo),
      synopsis: `${combo.subgenre} / ${combo.truecrime} / ${combo.culprit}`,
      icon: '🕵️',
      meta: { 장르: genre, 하위장르: combo.subgenre, 무대: combo.scene, 진상: combo.truecrime, 범인: combo.culprit },
    })
    flash(id ? '프로젝트 자료 〈미스터리 장치〉에 사건 트릭 설계를 추가했습니다.' : '프로젝트 추가에 실패했어요.')
  }
  // 조합기 연계: 글감 스니펫 보관함에 담기.
  const comboToStash = () => {
    addToLibrary('snippets', {
      text: comboToText(combo),
      source: '미스터리·추리 장치 사전 · 사건 트릭 설계 조합기',
      tags: ['미스터리·추리', '사건트릭설계', combo.subgenre, combo.truecrime],
    })
    flash('글감 보관함에 사건 트릭 설계를 담았습니다.')
  }

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    if (!navigator.clipboard) { flash('이 환경에서는 클립보드 복사가 지원되지 않습니다.'); return }
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(id)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => flash('복사에 실패했습니다. 직접 선택해 복사해 주세요.'))
  }

  // 연계 — 프로젝트 자료 〈미스터리 장치〉 폴더에 메모로 추가.
  const addToProj = (c: CatDef, d: Device) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '미스터리 장치',
      title: `${d.name} (${c.label})`,
      bodyHtml: deviceToHtml(c, d),
      synopsis: d.def,
      icon: '🕵️',
      meta: { 장르: genre, 분류: c.label, 영문: d.alias || '' },
    })
    flash(id ? `프로젝트 자료 〈미스터리 장치〉에 ‘${d.name}’을(를) 추가했습니다.` : '프로젝트 추가에 실패했어요.')
  }

  // 연계 — 글감 스니펫 라이브러리에 보관.
  const stash = (c: CatDef, d: Device) => {
    addToLibrary('snippets', {
      text: deviceToText(c, d),
      source: `미스터리·추리 장치 사전 · ${c.label}`,
      tags: ['미스터리·추리', c.label, d.name, ...(d.alias ? [d.alias] : [])],
    })
    flash(`글감 보관함에 ‘${d.name}’을(를) 담았습니다.`)
  }

  // 관련 도구(같은 장르군 또는 전개 도구)로 데이터와 함께 이동.
  const RELATED: { id: string; label: string; icon: string }[] = [
    { id: 'mystery-clue-planner', label: '단서·레드헤링 배치기', icon: '🔍' },
    { id: 'mystery-trick-ref', label: '트릭·범행수법 사전', icon: '🔍' },
    { id: 'mystery-twist-designer', label: '반전·진범 공개 설계기', icon: '🕵️' },
    { id: 'mystery-plot-curve', label: '미스터리 플롯 곡선', icon: '🕵️' },
    { id: 'mystery-case-forge', label: '사건 생성기', icon: '🕵️' },
  ]
  const openRelated = (id: string, c?: CatDef, d?: Device) => {
    openToolLinked(id, d ? { genre, device: d.name, note: c ? `${c.label} · ${d.name}` : d.name } : { genre })
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const facetLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginRight: 4 }
  const facetRow: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.6, marginTop: 5 }

  const DeviceBody = ({ c, d }: { c: CatDef; d: Device }) => (
    <>
      <div style={facetRow}><span style={facetLabel}>정의</span>{d.def}</div>
      <div style={facetRow}><span style={facetLabel}>사용법</span>{d.use}</div>
      <div style={facetRow}><span style={facetLabel}>예시</span>{d.ex}</div>
      <div style={{ ...facetRow, color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px', marginTop: 7 }}>
        <span style={{ ...facetLabel, color: 'var(--warn)' }}>비틀기</span>{d.twist}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={() => copy(deviceToText(c, d), 'item:' + favKey(c.key, d.name))}>
          {copiedKey === 'item:' + favKey(c.key, d.name) ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
        </button>
        <button className="minibtn" onClick={() => toggleFav(c.key, d.name)} style={{ borderColor: favs[favKey(c.key, d.name)] ? 'var(--accent)' : 'var(--border)' }}>
          {favs[favKey(c.key, d.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
        </button>
        <button className="minibtn" onClick={() => stash(c, d)} title="글감 보관함에 담기"><Emoji e="📥" /> 글감 보관</button>
      </div>
      {/* 연계 줄 */}
      <div className="linkbar" style={{ marginTop: 8, flexWrap: 'wrap' }}>
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={() => addToProj(c, d)} disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? '이 장치를 프로젝트 자료 〈미스터리 장치〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
          <Emoji e="📄" /> 프로젝트에 추가
        </button>
        {RELATED.map((r) => (
          <button key={r.id} className="linkbtn" onClick={() => openRelated(r.id, c, d)} title={`${r.label} 열기`}>
            <Emoji e={r.icon} /> {r.label}
          </button>
        ))}
      </div>
    </>
  )

  return (
    <div style={wrap}>
      {/* 모드 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setMode('dict')} aria-pressed={mode === 'dict'}
          style={{ flex: 1, borderColor: mode === 'dict' ? 'var(--accent)' : 'var(--border)', color: mode === 'dict' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="📖" /> 장치 사전 ({total})
        </button>
        <button className="minibtn" onClick={() => setMode('gen')} aria-pressed={mode === 'gen'}
          style={{ flex: 1, borderColor: mode === 'gen' ? 'var(--accent)' : 'var(--border)', color: mode === 'gen' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🎰" /> 사건 트릭 설계 조합기
        </button>
      </div>

      {/* 토스트(공통) */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>
          ✓ {toast}
        </div>
      )}

      {mode === 'dict' && (
        <>
          <div style={hint}>
            <b>미스터리·추리</b> 고유의 서사 장치와 전개·하위장르 관습 <b>{total}항목</b>을 정의·사용법·예시·비틀기로 묶었습니다.
            검색·펼침으로 찾고, 무작위로 영감을 얻으세요.
          </div>

          {/* 검색 */}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="장치·전개법 검색 (예: 페어플레이, 레드헤링, 서술트릭, 의외의 범인, 코지)"
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
                <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on} title={c.desc}
                  style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                  <Emoji e={c.icon} /> {c.label}
                </button>
              )
            })}
            <button className="minibtn" onClick={() => setCat(FAV_KEY)} aria-pressed={cat === FAV_KEY}
              style={{ borderColor: cat === FAV_KEY ? 'var(--accent)' : 'var(--border)', color: cat === FAV_KEY ? 'var(--text)' : 'var(--muted)' }}>
              ★ 즐겨찾기
            </button>
          </div>

          {/* 동작 줄 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 장치</button>
            <span style={hint}>{filtered.length}개 표시</span>
          </div>

          {/* 무작위 결과 */}
          {random && (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
                <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
                {random.item.alias && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{random.item.alias}</span>}
                <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={rollRandom} title="다시 뽑기"><Emoji e="🔁" /></button>
                <button className="minibtn" onClick={() => setRandom(null)} title="닫기">✕</button>
              </div>
              <DeviceBody c={random.cat} d={random.item} />
            </div>
          )}

          {/* 목록 (펼침/접힘) */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {filtered.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
                {cat === FAV_KEY ? '★ 아직 즐겨찾기한 장치가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
              </div>
            ) : (
              filtered.map(({ cat: c, item }) => {
                const fk = favKey(c.key, item.name)
                const open = !!expanded[fk] || !!query.trim() || cat === FAV_KEY
                return (
                  <div key={fk} style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                      onClick={() => setExpanded((p) => ({ ...p, [fk]: !open }))}>
                      <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /> {c.label}</span>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</span>
                      {item.alias && <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{item.alias}</span>}
                      <span style={{ marginLeft: 'auto', flexShrink: 0, color: 'var(--muted)', fontSize: 13 }}>{open ? '▾' : '▸'}</span>
                    </div>
                    {!open && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginTop: 4 }}>{item.def}</div>}
                    {open && <DeviceBody c={c} d={item} />}
                  </div>
                )
              })
            )}
          </div>

          <div style={hint}>관습은 정답이 아니라 출발점입니다. 정의대로 쓰기보다 <b>비틀기</b>로 독자의 예측을 배신하되, <b>페어플레이</b>는 지키세요.</div>
        </>
      )}

      {mode === 'gen' && (
        <>
          <div style={hint}>
            9개 슬롯을 무작위로 조합해 <b>미스터리·추리 사건 트릭 한 세트</b>를 설계합니다. 마음에 드는 슬롯은 <Emoji e="🔒" /> <b>잠금</b>하고 나머지만 다시 굴리세요.
          </div>

          {/* 조작 줄 + 조합수 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={regenerate} style={{ flex: '0 0 auto' }}><Emoji e="🎰" /> 조합 굴리기</button>
            <button className="minibtn" onClick={() => setLocks({})} title="모든 잠금 해제"><Emoji e="🔓" /> 잠금 해제</button>
            <span style={{ ...hint, marginLeft: 'auto' }} title="9개 슬롯 풀의 곱 = 만들 수 있는 서로 다른 사건 트릭 설계 수">
              <Emoji e="🧮" /> 조합수 <b style={{ color: 'var(--accent)' }}>{comboCount.toLocaleString('ko-KR')}</b>가지
            </span>
          </div>

          {/* 슬롯 목록 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {SLOTS.map((s) => {
              const locked = !!locks[s.key]
              return (
                <div key={s.key} style={{ ...card, borderColor: locked ? 'var(--accent)' : 'var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0, width: 92 }}><Emoji e={s.icon} /> {s.label}</span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{combo[s.key]}</span>
                    <button className="minibtn" onClick={() => toggleLock(s.key)} title={locked ? '잠금 해제' : '이 슬롯 잠금'}
                      style={{ flexShrink: 0, borderColor: locked ? 'var(--accent)' : 'var(--border)' }}>
                      {locked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
                    </button>
                    <button className="minibtn" onClick={() => regenSlot(s)} title="이 슬롯만 다시" style={{ flexShrink: 0 }}><Emoji e="🔁" /></button>
                    <button className="minibtn" onClick={() => copy(combo[s.key], 'slot:' + s.key)} title="복사" style={{ flexShrink: 0 }}>
                      {copiedKey === 'slot:' + s.key ? <>✓</> : <Emoji e="📋" />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 조합 결과 동작 */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(comboToText(combo), 'combo:all')}>
              {copiedKey === 'combo:all' ? <>✓ 전체 복사됨</> : <><Emoji e="📋" /> 사건 트릭 설계 전체 복사</>}
            </button>
            <button className="minibtn" onClick={comboToStash} title="글감 보관함에 담기"><Emoji e="📥" /> 글감 보관</button>
          </div>

          {/* 연계 줄 */}
          <div className="linkbar" style={{ flexWrap: 'wrap' }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={comboToProj} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 사건 트릭 설계를 프로젝트 자료 〈미스터리 장치〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            {RELATED.map((r) => (
              <button key={r.id} className="linkbtn" onClick={() => openRelated(r.id)} title={`${r.label} 열기`}>
                <Emoji e={r.icon} /> {r.label}
              </button>
            ))}
          </div>

          <div style={hint}>조합은 출발점입니다. 슬롯 간 충돌(진상↔결정적 단서, 범인↔숨은 동기)이 흥미롭다면 그 모순에서 사건이 살아납니다. <b>단서는 공정하게</b> 깔되 시선만 비트세요.</div>
        </>
      )}
    </div>
  )
}
