// 로맨스 세계관·관계 빌더 — '두 사람의 관계'를 중심축으로 한 로맨스 세계관/설정을 도시에에 근거해 질문·입력으로 구조화한다.
//  · 좌측: 설정 섹션(장르 계약·관능도 / 무대·하위장르 / 두 주인공 / 관계 동력(트로프) / 갈등·장벽 / 감정 곡선·구조 / 장소·분위기 / 함정 점검) 탐색.
//  · 우측: 섹션별 안내 질문 + 자유 입력. 각 질문에 로맨스 도시에 기반 '예시 칩'(클릭 채우기/복사)과 무작위 추천.
//  · 상단: '관계 골격 자동 생성기' — 슬롯 풀 무작위 조합(잠금/재생성), 조합수 표시(1조 이상). 생성한 골격은 본문에 반영하거나 글감/인물/장소 라이브러리로 보낼 수 있다.
//  · 연계: 📄 프로젝트에 추가(자료 › 세계관), 라이브러리(스니펫/인물/장소), 관련 도구 열기. payload.genre 활용.
// 규칙: react 와 './linkbus' 만 import. 모든 데이터는 localStorage('sry:tool:romance-worldbuilder')에 JSON 자동 저장/복원. 언마운트 정리.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  addToProject,
  hasProjectBridge,
  addToLibrary,
  openToolLinked,
  Emoji,
  emojify,
} from './linkbus'

export const meta = { id: 'romance-worldbuilder', name: '로맨스 세계관 빌더', icon: '💞', group: '세계관', genre: '로맨스', intro: '하위장르·관능도·두 주인공·트로프·장벽·감정 곡선을 질문으로 구조화하는 로맨스 설정 바이블', w: 760, h: 660 }

const LS_KEY = 'sry:tool:romance-worldbuilder'

// ───────────────────────── 설정 스키마(도시에 근거) ─────────────────────────
interface Field {
  key: string
  label: string
  ph: string        // placeholder/도움말
  hint?: string     // 한 줄 작법 조언
  chips: string[]   // 클릭하면 입력에 채워지는 로맨스 특화 예시
  big?: boolean
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
    key: 'contract',
    icon: '💍',
    label: '장르 계약·관능도',
    blurb: '로맨스는 "정서적으로 만족스러운 결말(HEA/HFN)을 약속하는 장르"다. 결말의 약속·관능도·POV·연재 보상은 독자와의 계약이므로 가장 먼저 못박는다. 여기서 어긋나면 별점이 무너진다.',
    fields: [
      {
        key: 'ending', label: '결말 약속(HEA/HFN)', ph: '두 사람이 영원히 맺어지는 HEA인가, 일단은 함께인 HFN인가. 결말의 톤을 못박자',
        hint: '한쪽이 죽거나 영영 헤어지면 "로맨스 계약 위반". 그건 멜로/러브스토리이지 로맨스가 아니다.',
        chips: [
          'HEA(Happily Ever After) — 결혼·평생의 약속으로 완결, 외전에서 후일담 보너스',
          'HFN(Happy For Now) — 미래는 열려 있되 "지금 우리는 함께"로 닫는 따뜻한 결말',
          '시리즈형 — 권마다 다른 커플이 HEA, 전권 인물이 카메오로 등장',
          '재회·재결합형 — 헤어졌던 두 사람이 끝내 다시 맺어지는 회복의 HEA',
        ],
      },
      {
        key: 'heat', label: '관능도(heat level)', ph: 'clean/sweet(키스까지) ↔ steamy/explicit(노골적 정사). 사전 고지될 관능 수위',
        hint: '관능도는 표지·소개·태그로 사전 합의되는 약속. 본문이 태그와 어긋나면 강한 반발을 산다.',
        chips: [
          'Clean/Sweet — 손잡기·포옹·키스까지, 정사는 문 닫고 생략(closed door)',
          'Warm — 분위기와 긴장은 진하되 노골적 묘사는 절제',
          'Steamy — 정사 장면을 비중 있게, 감정과 욕망을 함께 묘사',
          'Explicit/Erotica — 관능 묘사가 서사의 핵심 비중을 차지',
        ],
      },
      {
        key: 'pov', label: 'POV·시점 친밀성', ph: '여주 1인칭? 근접 3인칭? 남녀 양시점 교차? 남주 속마음은 본편/외전 어디서 보여줄지',
        hint: '로맨스 독자는 주인공 내면에 깊이 들어가길 기대한다. "상대의 속마음을 언제 열어줄지"가 텐션을 좌우한다.',
        chips: [
          '여주 1인칭 — 내면 독백과 오해·설렘을 가장 밀착해 전달',
          '남녀 양시점 교차(dual POV) — 회차마다 시점 전환, 양쪽 진심을 보여줌',
          '근접 3인칭 — 한 시점에 붙되 묘사의 폭을 확보',
          '남주 시점 외전 관습 — 본편은 여주 시점, 남주의 속마음은 후일담 특별편으로',
        ],
      },
      {
        key: 'serial', label: '연재 보상·페이싱 계약', ph: '단행본형인가 웹소설 연재형인가. 회차당 설렘 포인트·클리프행어 밀도',
        hint: '웹소설은 매 회차/매 5천 자마다 작은 설렘·반전·다음 화 궁금증이 없으면 연독률이 무너진다.',
        chips: [
          '웹소설 연재형 — 매 화 끝에 설렘 포인트 또는 클리프행어 필수',
          '초반 1~10화 케미 폭발 — "이 작품의 핵심 트로프"를 첫인상으로 각인',
          '단행본 장편 — 슬로우번, 다층 갈등을 호흡 길게 쌓는다',
          '카테고리·단편 — 빠른 점화, 인스타러브에 가까운 압축 전개',
        ],
      },
    ],
  },
  {
    key: 'world',
    icon: '🌹',
    label: '무대·하위장르',
    blurb: '로맨스는 현대 / 로맨스판타지 / 시대극(히스토리컬) / 패러노멀·로판타지로 1차 분기한다. 무대가 곧 가능한 장벽과 트로프의 풀을 결정한다. 배경은 두 사람을 엮는 "장치"여야 한다.',
    fields: [
      {
        key: 'subgenre', label: '하위장르 분기', ph: '현대 로맨스 / 로맨스판타지(로판) / 히스토리컬 / 패러노멀·로판타지(Romantasy) 중 무엇인가',
        hint: '한국 웹소설은 (1)현대 (2)로판 (3)BL/GL로 1차 분기, 로판은 다시 악역영애/회귀·빙의/정통연애/육아·힐링으로 나뉜다.',
        chips: [
          '현대 로맨스 — 재벌·사내연애·계약연애가 주력, 도시·일상의 결',
          '로맨스판타지(로판) — 서구풍 가상 제국·귀족 사회, 황실 정치와 연애',
          '히스토리컬 — 리젠시·시대극, 신분·예법·정략혼이 장벽(브리저튼류)',
          '로판타지(Romantasy) — 마법·이종족·예언이 연애와 얽힌 판타지 로맨스',
        ],
      },
      {
        key: 'robranch', label: '로판 2차 분기(로판일 때)', ph: '악역 영애물 / 책빙의·회귀·환생 / 정통 정략혼 연애 / 육아·힐링 중 어느 결인가',
        hint: '로판이 아니면 비워두자. 회귀·빙의는 "주인공만 결말을 안다"는 정보 비대칭이 고유 동력이 된다.',
        chips: [
          '악역 영애물 — 파멸 엔딩이 예정된 악녀로 빙의, 생존과 운명 뒤집기',
          '책빙의·회귀·환생 — 원작/전생을 아는 주인공이 결말을 바꾸는 능동성',
          '정통 정략혼 — 정략결혼/재혼으로 시작해 정치와 함께 진짜 감정이 자란다',
          '육아·힐링 — 어린 주인공·조카 키우기, 따뜻함과 치유가 중심',
        ],
      },
      {
        key: 'setting', label: '구체적 무대·세계 규칙', ph: '두 사람이 사는 사회의 규칙(신분제·후계 구도·재벌가 위계·마법 질서)과 그것이 만드는 제약',
        hint: '세계 규칙은 장식이 아니라 "두 사람을 갈라놓는 힘"으로 설계해야 로맨스에 종속된다.',
        chips: [
          '가상 제국의 황실·귀족 위계 — 신분 격차가 곧 사랑의 장벽',
          '재벌가 후계 구도 — 가문·주식·정략혼이 연애를 옥죈다',
          '계약(결혼·연애·동거)으로 묶인 관계 — "가짜가 진짜가 되는" 전환점',
          '마법·이종족 질서 — 인간/이종족 금기, 운명의 짝(mate) 규칙',
        ],
      },
      {
        key: 'special', label: '특수 설정·정보 비대칭', ph: '회귀·빙의·환생·예언·기억상실 등 두 사람의 관계에 비대칭을 만드는 장치',
        hint: '"비극을 알면서 다시 그를 만남"의 애절함, "결말을 바꾸는 능동성"은 로판 고유의 강력한 정서 엔진이다.',
        chips: [
          '회귀 — 비극을 겪고 과거로 돌아와 그 사람을 다시 만난다',
          '책빙의 — 소설 속 인물이 되어 원작의 결말을 알고 있다',
          '예언·운명의 짝 — "맺어질 운명"이 곧 거부의 명분이 되기도 한다',
          '기억상실·정체 은닉 — 한쪽이 과거/진짜 신분을 모른 채 사랑에 빠진다',
        ],
      },
    ],
  },
  {
    key: 'leads',
    icon: '💑',
    label: '두 주인공',
    blurb: '"왜 하필 이 사람인가"가 설득되지 않으면 케미가 없다는 평을 받는다. 각자의 결핍·상처·사랑에 대한 방어기제와, 둘이 서로를 채우는 보완 관계를 설계하라.',
    fields: [
      {
        key: 'heroine', label: '주인공 A(여주 등)·결핍과 방어기제', ph: '그/그녀의 상처·결핍과, 사랑 앞에서 세운 방어기제. 사랑에 빠지면 무엇을 두려워하는가',
        hint: '도입부에서 사랑에 대한 방어기제를 확립해야, 그것이 무너지는 과정이 곧 로맨스의 곡선이 된다.',
        chips: [
          '버림받은 상처로 "먼저 마음을 닫는" 자기방어형 — 들키기 전에 도망친다',
          '회귀/빙의로 결말을 알기에 "이번엔 절대 사랑하지 않겠다"는 결심형',
          '가문·일·생존이 1순위라 연애를 사치로 여기는 현실주의형',
          '겉은 당차고 도도하나 사랑받아본 적 없어 애정에 서툰 내면형',
        ],
      },
      {
        key: 'hero', label: '주인공 B(남주 등)·매력과 그림자', ph: '상대의 유형(상처 입은 남주/집착·후회/다정/적대)과, 끌리는 매력 및 감춘 그림자',
        hint: '다아시(오만)·로체스터(상처)·집착남·후회남 등 원형이 있다. "강해서 매력"이 아니라 상처·신념을 줘라.',
        chips: [
          '상처 입은 남주(tortured hero) — 어두운 비밀을 품은 다정과 냉정 사이',
          '집착남주(얀데레) — 과도한 독점욕, 그러나 그 집착의 기원에 결핍이 있다',
          '후회남주 — 한 번 그녀를 버린 뒤 뒤늦게 후회하며 매달린다(권력 역전)',
          '오만한 알파 — 다아시형, 첫인상은 거만하나 재평가될 진심이 있다',
        ],
      },
      {
        key: 'chemistry', label: '케미·보완·"왜 이 사람"', ph: '두 사람이 서로의 무엇을 채우는가. 끌림이 정당화되는 구체적 이유',
        hint: '감정의 정당화가 핵심. 둘이 함께일 때만 드러나는 면모, 서로의 상처를 건드리고 보듬는 지점을 설계하라.',
        chips: [
          '얼음 vs 불 — 차가운 한쪽이 다른 쪽 앞에서만 무너진다',
          '서로의 결핍을 정확히 채움 — 버림받은 자와 떠나지 않는 자',
          '동등한 적수(equals) — 지력·신념이 맞부딪치며 존중으로 발전',
          '겉은 상극, 속은 같은 상처 — 다른 가면을 쓴 같은 외로움',
        ],
      },
      {
        key: 'rivals', label: '연적·서브 남녀·삼각', ph: '질투를 유발하고 진심을 자각시킬 연적/약혼자/과거 연인. 삼각관계를 둘지',
        hint: '연적은 진심 자각의 촉매다. 단, 서브 인물에게도 입체성을 줘야 독자의 미움을 사지 않는다.',
        chips: [
          '정략혼 약혼자 — 세계 규칙이 정해준 "맺어져야 할 사람"의 압박',
          '과거 연인 — 다시 나타나 두 사람의 현재를 흔드는 그림자',
          '헌신적 서브남/서브녀 — 응원받지만 끝내 닿지 못하는 애틋함',
          '라이벌 영애·동료 — 같은 무대에서 겨루는 질투와 존중의 양가감정',
        ],
      },
    ],
  },
  {
    key: 'dynamic',
    icon: '🔥',
    label: '관계 동력·트로프',
    blurb: '로맨스를 "로맨스답게" 만드는 엔진들. 밀당·강제 밀착·슬로우번·갈망 같은 장치가 두 사람의 거리를 좁혔다 벌렸다 한다. 진자가 멈추면 텐션이 죽는다.',
    fields: [
      {
        key: 'trope', label: '핵심 트로프', ph: 'enemies-to-lovers·계약/가짜연인·강제동거·friends-to-lovers·재회 등 작품의 간판 트로프',
        hint: '초반에 핵심 트로프를 명확히 노출해야 한다(첫인상 = 연독률). 트로프는 클리셰가 아니라 약속된 즐거움이다.',
        chips: [
          'enemies-to-lovers — 적대 → 오해 → 재평가 → 결합(오만과 편견의 후예)',
          '계약/가짜 연인(fake dating) — 가짜인데 진짜가 되어버린 전환점이 백미',
          'forced proximity — 한 침대만 남은 여관, 폭설로 갇힘, 위장 부부',
          'friends-to-lovers / 소꿉친구 — 익숙함이 어느 순간 사랑으로 번진다',
        ],
      },
      {
        key: 'pushpull', label: '밀당·접점의 진자', ph: '끌림과 회피가 어떻게 진동하는가. 한 발 다가가면 두 발 물러서는 박자',
        hint: '가까워지면 한쪽이 물러서고, 멀어지면 다른 쪽이 끌림을 자각한다. 이 진자가 텐션의 심장이다.',
        chips: [
          '한 발 다가가면 두 발 물러서기 — 자각 직후의 회피 본능',
          '말은 가시, 행동은 다정 — 입과 손이 따로 노는 모순된 표현',
          'almost-kiss(니어 키스) — 입맞춤 직전 방해받아 보상을 미룬다',
          '접촉의 단계적 고조 — 우연한 손 스침 → 의도적 접촉 → 포옹 → 키스',
        ],
      },
      {
        key: 'burn', label: '점화 속도(슬로우번/인스타)', ph: '감정이 천천히 타오르는 슬로우번인가, 첫눈에 반하는 인스타러브인가',
        hint: '장편·로판은 슬로우번이 주력, 단편·카테고리는 인스타러브. 분량과 점화 속도를 맞춰라.',
        chips: [
          '슬로우번 — 긴장을 길게 누적, 첫 키스까지를 한참 미루는 갈증',
          '인스타러브 — 첫 만남의 강렬한 끌림, 빠른 점화(단편 적합)',
          '슬로우번 + 강한 초반 훅 — 점화는 느리되 케미는 1화부터',
          '재점화(second-chance) — 옛 불씨가 다시 타오르는 속도',
        ],
      },
      {
        key: 'yearning', label: '갈망·애틋함(pining)', ph: '드러내지 못하는 마음의 묘사. 닿을 듯 닿지 않는 시선·손끝·독백',
        hint: 'yearning은 로맨스 정서의 핵심 연료. "보여주되 닿지 못하게" 하는 거리감이 설렘을 만든다.',
        chips: [
          '닿을 듯 닿지 않는 손끝 — 스치고도 잡지 못하는 순간들',
          '몰래 지켜보는 시선 — 상대가 모르는 곳에서의 응시와 독백',
          '말하지 못한 고백 — 입가에서 삼킨 진심이 쌓여간다',
          '질투로 드러나는 본심 — 연적 앞에서야 자각하는 마음',
        ],
      },
    ],
  },
  {
    key: 'conflict',
    icon: '⛓️',
    label: '갈등·장벽',
    blurb: '갈등의 해결 = 관계의 성립이다. 외부 사건(정치·살인·전쟁)은 있어도 "이것이 둘 사이를 어떻게 바꾸는가"로 종속된다. 한 마디면 풀릴 오해(idiot plot)는 피하라.',
    fields: [
      {
        key: 'internal', label: '내적 장벽(상처·두려움)', ph: '각자의 마음속 장벽. 왜 스스로 이 사랑을 막는가(자격 없음·배신 트라우마·결말을 앎)',
        hint: '좋은 갈등은 인물의 상처·세계관에서 필연적으로 발생한다. 내적 장벽이 관계 진척을 막는 진짜 엔진이다.',
        chips: [
          '"나는 사랑받을 자격이 없다"는 자기혐오의 벽',
          '회귀/빙의로 결말을 알기에 정들면 안 된다는 결심',
          '과거의 배신으로 누구도 믿지 못하는 방어기제',
          '책임·복수·생존이 먼저라 사랑을 미루는 우선순위의 벽',
        ],
      },
      {
        key: 'external', label: '외적 장벽(세계·신분·정치)', ph: '두 사람을 가로막는 바깥의 힘. 신분 격차·정략혼·가문 반대·정치적 음모',
        hint: '외부 사건은 관계의 "시험 도구". 사건 자체보다 그것이 두 사람의 거리에 미치는 영향을 매 장면 새겨라.',
        chips: [
          '신분 격차 — 황족과 평민, 재벌과 직원, 넘을 수 없는 계급의 선',
          '정략혼·가문의 강제 — 사랑과 의무가 정면충돌',
          '정치적 음모·후계 다툼 — 둘의 결합이 권력 지형을 흔든다',
          '비밀·정체의 폭로 위협 — 진실이 드러나면 관계가 끝장날 시한폭탄',
        ],
      },
      {
        key: 'misunderstanding', label: '오해·소통 단절', ph: '관계를 흔드는 오해. 단 "한 마디면 풀릴 오해(idiot plot)"는 함정',
        hint: '좋은 오해는 인물의 상처·자존심·세계관 때문에 "말하지 못하는" 필연이 있어야 한다.',
        chips: [
          '자존심 때문에 진심을 말 못 하는 두 사람의 엇갈림',
          '의도적으로 숨긴 비밀이 최악의 타이밍에 드러나는 오해',
          '제3자(연적·가문)가 심은 거짓 정보로 빚어진 불신',
          '회귀/원작 지식 때문에 상대의 진심을 곡해하는 비대칭의 오해',
        ],
      },
      {
        key: 'stakes', label: '관계의 판돈(stakes)', ph: '이 사랑이 깨지면 무엇을 잃는가. 정서적·사회적·생존적 대가',
        hint: '판돈이 커야 갈등이 무겁다. "맺어지지 않으면 잃는 것"을 구체적으로 설계하라.',
        chips: [
          '맺어지지 않으면 정해진 비극(파멸 엔딩)으로 돌아간다',
          '사랑을 택하면 가문·지위·재산을 잃는다',
          '한쪽의 목숨·안전이 관계에 달려 있다',
          '서로를 잃으면 둘 다 다시는 마음을 열지 못한다',
        ],
      },
    ],
  },
  {
    key: 'arc',
    icon: '📈',
    label: '감정 곡선·구조',
    blurb: '감정 곡선이 사건 곡선보다 우선한다. 첫 만남 → 점화 → 절망의 순간(Black Moment) → 대형 고백(Grand Gesture) → HEA의 비트를, 상승-하강의 진자로 설계한다.',
    fields: [
      {
        key: 'meetcute', label: '첫 만남(Meet-Cute)', ph: '운명적·우스꽝스럽·적대적 첫 조우. 강렬한 첫인상(좋든 나쁘든)을 어떻게 만들지',
        hint: '첫 만남은 두 사람의 관계를 압축한 예고편. 좋든 나쁘든 "잊히지 않는 첫인상"을 설계하라.',
        chips: [
          '적대적 첫 만남 — 최악의 상황에서 부딪쳐 서로를 오해한다',
          '운명적 조우 — 빗속·무도회·사고로 거부할 수 없이 엮인다',
          '재회로서의 첫 만남 — 회귀/과거 인연으로 "다시" 마주친다',
          '계약·거래로 시작 — 첫 만남부터 이해관계로 묶인다',
        ],
      },
      {
        key: 'falling', label: '점화·행복의 정점(Fun & Games)', ph: '함께하는 시간이 쌓이며 케미가 폭발하는 구간. 첫 키스·진심 자각의 순간',
        hint: '관계 진척이 독자에게 체감되어야 한다(정체되면 "고구마"). 행복의 정점 뒤엔 반드시 작은 좌절을 둔다.',
        chips: [
          '강제 밀착에서 피어나는 케미 — 한 공간에 갇혀 무너지는 경계',
          '첫 키스 — 미뤄온 긴장이 터지는 보상의 순간',
          '진심 자각(midpoint) — "나 이 사람을 좋아하는구나"의 깨달음',
          '첫 동침/진심 고백으로 관계가 한 단계 깊어지는 전환',
        ],
      },
      {
        key: 'blackmoment', label: '절망의 순간(Black Moment)', ph: '클라이맥스 직전, 관계가 끝장난 듯한 최저점. 오해의 폭발·비밀의 폭로·외부 압력의 정점',
        hint: '로맨스의 필수 구조 비트. 떨어진 채 각자 진심을 깨닫는 "Dark Night of the Soul"이 이어진다.',
        chips: [
          '숨긴 비밀이 최악의 타이밍에 폭로돼 관계가 무너진다',
          '오해가 폭발해 서로 돌아설 수 없는 말을 내뱉는다',
          '외부 압력(가문·정략혼·정치)이 정점에 달해 이별을 강요',
          '한쪽의 희생적 결정("너를 위해 떠난다")이 빚은 어긋남',
        ],
      },
      {
        key: 'grand', label: '대형 고백·증명(Grand Gesture)', ph: '절망 이후 자존심·지위·목숨을 걸고 사랑을 증명하는 결정적 행동. 그리고 상호성',
        hint: '한쪽의 일방적 희생이 아니라 둘 다 무언가를 내려놓고 다가가야 만족도가 높다. 클라이맥스 = 관계의 최종 결정.',
        chips: [
          '공개 고백·프러포즈 — 만인 앞에서 자존심을 내려놓는다',
          '지위·재산·왕위 포기 — 권력보다 사람을 택하는 선택',
          '후회남의 완전한 무릎 꿇기 — 가해자였던 쪽의 속죄(권력 역전)',
          '상호 증명 — 둘 다 각자의 벽을 부수고 동시에 다가간다',
        ],
      },
      {
        key: 'resolution', label: '결말·후일담(HEA/외전)', ph: '결합 이후의 약속과, 웹소설 관습인 후일담(외전)으로 줄 보너스 설렘',
        hint: '웹소설은 외전(후일담)으로 보너스 설렘을 주는 것이 필수 관습. 남주 시점 특별편이 단골이다.',
        chips: [
          '결혼·평생의 약속으로 닫는 정통 HEA',
          '후일담 외전 — 결혼 생활·육아·일상의 달콤한 보너스',
          '남주 시점 외전 — 본편에서 감춰뒀던 그의 속마음 공개',
          '다음 커플로 이어지는 시리즈형 마무리(서브 인물의 HEA 예고)',
        ],
      },
    ],
  },
  {
    key: 'place',
    icon: '🏰',
    label: '장소·분위기',
    blurb: '로맨스의 장소는 감정의 무대다. 무도회장·공작저·옥상·여관의 한 방·비 오는 거리가 접촉과 고백을 빚는다. 장소마다 "어떤 감정 비트가 일어나는가"를 정하라.',
    fields: [
      {
        key: 'stage', label: '핵심 무대·동선', ph: '두 사람의 관계가 펼쳐지는 주요 공간(저택·회사·학원·궁정)과 그 안에서의 동선',
        hint: '공간은 거리(distance)를 가시화한다. 같은 집·같은 부서·같은 무도회처럼 둘을 묶는 무대를 골라라.',
        chips: [
          '공작저·황궁 — 예법과 신분이 지배하는 우아한 긴장의 무대',
          '재벌가 저택·사옥 — 위계와 비밀이 흐르는 현대적 공간',
          '학원·기숙사 — 또래·소문·우연이 만드는 청춘의 무대',
          '계약 동거의 한집 — 강제 밀착이 일상이 되는 사적 공간',
        ],
      },
      {
        key: 'romantic', label: '설렘 장소·이벤트', ph: '무도회·연회·축제·둘만의 비밀 공간 등 결정적 설렘이 일어나는 무대',
        hint: '무도회 첫 춤, 한 침대만 남은 여관처럼 장소 자체가 트로프가 되는 곳을 마련하라.',
        chips: [
          '무도회·연회 — 첫 춤, 시선의 교차, 질투가 터지는 공식 무대',
          '한 침대만 남은 여관 / 폭설 산장 — 강제 밀착의 고전',
          '둘만 아는 비밀 정원·서재 — 가면을 벗는 사적 도피처',
          '비 오는 거리·공항 — 추격과 고백이 어울리는 결정적 무대',
        ],
      },
      {
        key: 'mood', label: '감각·분위기 톤', ph: '작품 전체를 감싸는 정서적 톤과 감각 디테일(향·빛·계절·음악)',
        hint: '로맨스는 정서의 장르. 향수·촛불·계절감 같은 감각 디테일이 설렘과 애틋함을 증폭한다.',
        chips: [
          '달콤·화사 — 봄·꽃향·따뜻한 빛, 설렘 중심의 톤',
          '애틋·서정 — 빗소리·황혼·낮은 음악, 갈망과 그리움의 톤',
          '관능·농밀 — 어둑한 조명·향·체온, 긴장이 흐르는 톤',
          '우아·차가움 — 대리석·겨울·정제된 예법, 절제된 귀족의 톤',
        ],
      },
      {
        key: 'season', label: '시간·계절의 흐름', ph: '관계 진척에 맞춘 시간/계절의 흐름. 사교철·연말·연인의 기념일 등 시간 장치',
        hint: '계절의 변화로 감정의 변화를 가시화하면 좋다. 사교철·축제 같은 시한이 페이싱 장치가 된다.',
        chips: [
          '사교철(시즌) — 만남·청혼·정략혼이 몰리는 시한이 압박을 만든다',
          '사계의 흐름 — 겨울의 냉랭함에서 봄의 해빙으로 감정을 비춤',
          '연말·축제 — 한 해의 매듭이 고백·재회의 무대가 된다',
          '기념일·약속한 날 — 시한이 카운트다운처럼 긴장을 쌓는다',
        ],
      },
    ],
  },
  {
    key: 'pitfall',
    icon: '🚧',
    label: '함정 점검',
    blurb: '로맨스가 흔히 빠지는 덫을 미리 체크한다. 설계 단계에서 막아두면 후반에 독자 계약을 위반하지 않는다.',
    fields: [
      {
        key: 'idiot', label: 'idiot plot(바보 오해) 점검', ph: '한 마디면 풀릴 오해로 갈등을 끌지 않았는가. 오해에 인물적 필연이 있는가',
        hint: '"왜 그냥 말 안 해?"가 떠오르는 갈등은 함정. 침묵에 자존심·상처·세계관의 이유를 부여하라.',
        chips: [
          '모든 오해마다 "왜 말하지 못하는가"의 인물적 이유를 메모',
          '소통 한 번이면 끝날 갈등은 외적 장벽으로 교체',
          '오해는 인물의 상처·자존심에서 필연적으로 발생하게',
          '오해를 끄는 길이를 제한 — 너무 오래 끌면 "고구마" 이탈',
        ],
      },
      {
        key: 'pacing', label: '페이싱·고구마 점검', ph: '관계 진척이 정체되거나(고구마) 갈등 없이 행복만 이어지지(긴장 소멸) 않는가',
        hint: '진척이 정체되면 "고구마", 단조로운 행복은 지루함. 상승-하강의 진자를 유지하라.',
        chips: [
          '매 회차/장에 관계 진척·설렘·다음 훅 중 하나는 닫는다',
          '행복의 정점 뒤엔 반드시 작은 좌절을 배치(진자 유지)',
          '"사이다 무한"도 긴장 소멸 — 의도된 좌절로 텐션 유지',
          '초반 1~10화에 핵심 케미·트로프를 반드시 노출(연독률)',
        ],
      },
      {
        key: 'chemistry', label: '케미·동기 점검', ph: '"왜 하필 이 사람인가"가 설득되는가. 끌림에 구체적 근거가 있는가',
        hint: '감정의 정당화가 없으면 "케미 없음" 평가. 둘이 함께일 때만 드러나는 면모를 보여줘라.',
        chips: [
          '"왜 이 사람"을 장면으로 보여줬는지 점검(말 대신 행동)',
          '끌림의 근거가 외모·설정 나열에 그치지 않는지 확인',
          '둘이 함께일 때만 드러나는 변화·취약함을 마련',
          '갈등 중에도 서로를 향한 일관된 진심의 결을 유지',
        ],
      },
      {
        key: 'contract', label: '장르 계약 위반 점검', ph: 'HEA/HFN 약속과 사전 고지한 관능도를 끝까지 지켰는가',
        hint: '결말 약속·관능도는 독자와의 계약. 본문이 태그·약속과 어긋나면 별점 테러로 이어진다.',
        chips: [
          '결말이 HEA/HFN 약속을 지키는지 — 비극은 로맨스 위반',
          '본문 관능도가 표지·소개·태그와 일치하는지 점검',
          '주인공 외 인물에게 진짜 호감을 분산시켜 약속을 흐리지 않기',
          '연재형이면 회차당 보상(설렘/훅)이 끝까지 유지되는지 확인',
        ],
      },
    ],
  },
]

// ───────────────────────── 관계 골격 자동 생성기 슬롯 풀 ─────────────────────────
// 슬롯 12개. 조합수 = 각 풀 크기의 곱 = 13^8 · 14^4 ≈ 31.3조 → 핵심 생성기 1조 이상 충족.
// (subgenre·trope·heroine·hero 4개 슬롯이 14, 나머지 8개가 13. 정확한 수치는 런타임에
//  combos = 모든 풀 크기의 곱으로 계산해 화면에 표기한다. 중복 없는 고유 항목만 센다.)
interface Slot { key: string; label: string; icon: string; pool: string[] }
const SLOTS: Slot[] = [
  {
    key: 'subgenre', label: '하위장르·무대', icon: '🌹', pool: [
      '현대 로맨스 — 재벌가의 위계와 비밀이 흐르는 도시',
      '현대 로맨스 — 같은 회사·같은 부서의 사내연애',
      '로맨스판타지 — 서구풍 가상 제국의 황실과 귀족 사회',
      '로판 악역영애물 — 파멸이 예정된 악녀로 빙의한 세계',
      '로판 책빙의 — 읽던 소설 속 인물이 되어 결말을 안다',
      '히스토리컬 — 리젠시 사교철, 예법과 정략혼의 시대',
      '로판타지(Romantasy) — 마법과 이종족, 운명의 짝 규칙',
      '로판 육아·힐링 — 어린 주인공을 키우며 피어나는 사랑',
      '회귀 로맨스 — 비극을 겪고 과거로 돌아온 두 번째 생',
      '현대 로맨스 — 계약결혼/계약연애로 묶인 두 사람',
      '로판 정통 정략혼 — 정략결혼으로 시작하는 황실 정치 연애',
      '재회 로맨스 — 헤어졌던 두 사람이 다시 마주친 도시',
      '학원·청춘 로맨스 — 또래·소문·우연이 엮는 무대',
      '동양풍 궁중 로맨스 — 후궁·세도가가 얽힌 옛 왕조의 궁',
    ],
  },
  {
    key: 'trope', label: '핵심 트로프', icon: '🔥', pool: [
      'enemies-to-lovers — 적대에서 시작해 재평가 끝에 사랑으로',
      '계약/가짜 연인(fake dating) — 가짜가 진짜가 되어버린다',
      'forced proximity — 한 공간에 갇혀 무너지는 경계',
      'friends-to-lovers — 익숙함이 어느 순간 사랑으로 번진다',
      '계약결혼 — 거래로 맺은 결혼이 진짜 감정으로',
      'second-chance — 옛 인연이 다시 불붙는 재점화',
      '신분을 숨긴 사랑 — 정체를 감춘 채 빠져드는 마음',
      '운명의 짝(soulmate/mate) — 거부할 수 없는 끌림과 그 거부',
      '집착·소유욕 — 과도한 독점욕 이면의 결핍',
      '후회물 — 버린 뒤 뒤늦게 매달리는 권력 역전',
      'one bed / 강제 동거 — 사적 공간을 공유하는 밀착',
      '금지된 사랑 — 신분·가문·규칙이 막아선 관계',
      '서로의 비밀을 쥔 공범 관계 — 위험이 묶은 두 사람',
      '짝사랑의 역전 — 오래 바라보던 쪽에게 마침내 돌아오는 마음',
    ],
  },
  {
    key: 'heat', label: '관능도·톤', icon: '💋', pool: [
      'Clean/Sweet — 키스까지, 정사는 문 닫고 생략',
      'Warm — 긴장은 진하되 노골적 묘사는 절제',
      'Steamy — 정사를 비중 있게, 감정과 욕망을 함께',
      '달콤·화사한 설렘 중심의 톤',
      '애틋·서정 — 갈망과 그리움이 흐르는 톤',
      '관능·농밀 — 체온과 향이 흐르는 긴장의 톤',
      '우아·차가움 — 절제된 귀족의 톤',
      '코믹·발랄 — 티격태격 케미의 경쾌한 톤',
      '다크 로맨스 — 위험과 집착이 감도는 어두운 톤',
      'Explicit — 관능 묘사가 핵심 비중',
      '잔잔·힐링 — 따뜻함과 치유가 중심인 톤',
      '비장·애절 — 시한과 비극의 그림자가 드리운 톤',
      '청춘·풋풋 — 첫사랑의 설렘이 감도는 톤',
    ],
  },
  {
    key: 'heroine', label: '주인공 A(여주)', icon: '👑', pool: [
      '버림받은 상처로 먼저 마음을 닫는 자기방어형',
      '회귀/빙의로 결말을 알기에 "이번엔 사랑하지 않겠다"는 결심형',
      '가문·생존이 1순위라 연애를 사치로 여기는 현실주의형',
      '겉은 도도하나 사랑받아본 적 없어 애정에 서툰 내면형',
      '파멸 엔딩을 피하려 발버둥치는 빙의 악역 영애',
      '능력 있고 당찬 커리어우먼, 빈틈은 사생활',
      '신분을 숨긴 채 진짜 정체를 감춘 잠행자',
      '다정하지만 자기 행복은 늘 뒤로 미루는 헌신형',
      '복수를 품고 적진에 뛰어든 냉정한 전략가',
      '평범함 속에 특별한 비밀을 숨긴 보통의 그녀',
      '상처를 농담으로 가리는 밝고 단단한 생존자',
      '예언/운명에 묶여 사랑을 두려워하는 사람',
      '재능과 야심으로 무대를 휘어잡는 주체적 인물',
      '책임감으로 가족을 떠받치느라 자기 마음은 뒤로 미룬 장녀형',
    ],
  },
  {
    key: 'hero', label: '주인공 B(남주)', icon: '🖤', pool: [
      '상처 입은 남주 — 어두운 비밀을 품은 다정과 냉정 사이',
      '집착남주(얀데레) — 과도한 독점욕 이면의 결핍',
      '후회남주 — 한 번 버린 뒤 뒤늦게 매달린다',
      '오만한 알파(다아시형) — 첫인상은 거만, 재평가될 진심',
      '겉은 차갑고 속은 다정한 츤데레 권력자',
      '신분을 숨긴 황족/재벌, 평범한 얼굴 뒤의 정체',
      '냉혹한 황제/총수, 그녀 앞에서만 무너진다',
      '다정다감한 햇살형, 일편단심의 헌신',
      '위험한 매력의 다크 히어로, 손에 피를 묻힌 자',
      '능청맞고 영리한, 진심을 농담에 숨기는 자',
      '의무와 사랑 사이에서 갈등하는 책임감의 인물',
      '죽음/시한을 안고 사랑을 두려워하는 비극의 남자',
      '동등한 적수, 지력과 신념으로 맞부딪치는 라이벌',
      '무뚝뚝하지만 행동으로 챙기는 과묵한 보호자형',
    ],
  },
  {
    key: 'meet', label: '첫 만남(Meet-Cute)', icon: '✨', pool: [
      '최악의 상황에서 부딪쳐 서로를 오해한 적대적 첫 만남',
      '빗속·무도회·사고로 거부할 수 없이 엮인 운명적 조우',
      '회귀/과거 인연으로 "다시" 마주친 재회의 첫 만남',
      '계약·거래로 처음부터 이해관계에 묶인 만남',
      '정체를 숨긴 채 우연히 마주쳐 본모습을 들킨 만남',
      '구해주거나 구해진, 위기 속 첫 대면',
      '정략혼 상대로 마주 앉은 첫 대면의 긴장',
      '적과 아군 사이 어딘가에서 협상 테이블에 마주한 만남',
      '한 침대만 남은 여관/한집에 떠밀린 강제 밀착의 시작',
      '무도회의 첫 춤으로 시선이 얽힌 만남',
      '서로를 다른 사람으로 착각한 채 시작된 인연',
      '거래·고용 관계(상사-부하, 의뢰인-해결사)로 묶인 첫날',
      '소문으로만 알던 상대를 실제로 마주한 반전의 첫인상',
    ],
  },
  {
    key: 'internal', label: '내적 장벽', icon: '💔', pool: [
      '"나는 사랑받을 자격이 없다"는 자기혐오의 벽',
      '회귀/빙의로 결말을 알기에 정들면 안 된다는 결심',
      '과거의 배신으로 누구도 믿지 못하는 방어기제',
      '책임·복수·생존이 먼저라 사랑을 미루는 우선순위',
      '버림받을까 두려워 먼저 밀어내는 자기파괴',
      '상대를 지키려 일부러 거리를 두는 자기희생',
      '감정 표현에 서툴러 진심이 늘 가시로 나가는 벽',
      '신분/처지가 다르다는 자격지심의 벽',
      '예언/운명에 저항하려는 자유의지의 벽',
      '죽음/시한을 알기에 미래를 약속하지 못하는 벽',
      '한 번 사랑에 데어 다시는 안 한다는 결심',
      '진짜 정체가 드러나면 끝이라는 두려움',
      '의무(가문·왕위)와 마음 사이에서 마음을 누르는 벽',
    ],
  },
  {
    key: 'external', label: '외적 장벽', icon: '⛓️', pool: [
      '신분 격차 — 넘을 수 없는 계급의 선',
      '정략혼·가문의 강제 — 사랑과 의무의 정면충돌',
      '정치적 음모·후계 다툼 — 둘의 결합이 권력을 흔든다',
      '비밀·정체 폭로의 위협 — 진실이 드러나면 끝장',
      '연적·약혼자의 등장과 압박',
      '가문 간의 해묵은 원한과 반대',
      '예정된 비극(파멸 엔딩)으로 끌어당기는 운명',
      '시한(시즌·기념일·죽음)이 만드는 카운트다운',
      '직위·재산을 건 선택을 강요하는 사회적 압력',
      '서로가 서로의 적/표적이라는 입장의 대립',
      '거리·전쟁·임무로 인한 물리적 분리',
      '소문·스캔들이 관계를 위협하는 평판의 압력',
      '운명의 짝 규칙이 거꾸로 거부의 명분이 된다',
    ],
  },
  {
    key: 'pushpull', label: '밀당·관계 동력', icon: '🎭', pool: [
      '한 발 다가가면 두 발 물러서는 회피의 진자',
      '말은 가시, 행동은 다정한 모순된 표현',
      'almost-kiss — 입맞춤 직전 번번이 방해받는다',
      '접촉의 단계적 고조 — 손 스침에서 포옹, 키스로',
      '질투로 드러나는 본심 — 연적 앞에서야 자각',
      '슬로우번 — 첫 키스까지를 한참 미루는 갈증',
      '인스타러브 — 첫눈에 빠진 빠른 점화',
      '닿을 듯 닿지 않는 갈망(pining)의 시선과 독백',
      '티격태격 케미 — 다툼이 곧 애정 표현',
      '서로를 시험하며 천천히 신뢰를 쌓는 줄다리기',
      '한쪽의 직진과 다른 쪽의 회피가 빚는 추격전',
      '비밀을 공유하며 가까워지는 공범의 긴장',
      '재점화 — 옛 불씨가 닿을 때마다 되살아난다',
    ],
  },
  {
    key: 'black', label: '절망의 순간(Black Moment)', icon: '🌑', pool: [
      '숨긴 비밀이 최악의 타이밍에 폭로돼 관계가 무너진다',
      '오해가 폭발해 돌아설 수 없는 말을 내뱉는다',
      '외부 압력(가문·정략혼·정치)이 정점에 달해 이별을 강요',
      '"너를 위해 떠난다"는 희생적 결정이 빚은 어긋남',
      '연적·약혼자로 인해 관계가 끝장난 듯 보인다',
      '한쪽의 배신/오판이 드러나 신뢰가 박살난다',
      '죽음/시한이 임박해 미래가 닫힌 듯한 절망',
      '정체가 폭로돼 그동안의 모든 것이 거짓처럼 보인다',
      '예정된 비극이 현실이 되려는 최저점',
      '자존심과 상처가 충돌해 서로 등을 돌린다',
      '한쪽이 모든 걸 잃고 상대를 밀어내는 추락',
      '진실을 안 상대가 배신감에 떠나버린다',
      '서로를 지키려던 거짓말이 정반대의 비극을 부른다',
    ],
  },
  {
    key: 'grand', label: '대형 고백·증명(Grand Gesture)', icon: '💐', pool: [
      '만인 앞에서 자존심을 내려놓는 공개 고백·프러포즈',
      '지위·재산·왕위를 포기하고 사람을 택한다',
      '후회남의 완전한 무릎 꿇기와 속죄(권력 역전)',
      '둘 다 각자의 벽을 부수고 동시에 다가가는 상호 증명',
      '목숨을 걸고 상대를 구하는 결정적 행동',
      '오해를 풀기 위해 모든 비밀과 진심을 털어놓는다',
      '공항/거리를 가로지르는 절박한 추격과 붙잡음',
      '정략혼·정치의 판을 뒤엎고 사랑을 선언한다',
      '예정된 비극을 거스르려 모든 것을 거는 선택',
      '시한을 함께 마주하기로 한 약속의 고백',
      '거짓 신분을 벗고 진짜 모습으로 나아간다',
      '편지·재회로 묵은 오해를 풀고 다시 손을 잡는다',
      '권력으로 그녀/그를 지켜내는 보호의 증명',
    ],
  },
  {
    key: 'ending', label: '결말·후일담', icon: '💞', pool: [
      'HEA — 결혼·평생의 약속으로 닫고 외전으로 후일담',
      'HFN — 미래는 열려 있되 "지금 우리는 함께"',
      '후일담 외전 — 결혼 생활·육아·일상의 달콤한 보너스',
      '남주 시점 외전 — 감춰뒀던 그의 속마음 공개',
      '시리즈형 — 다음 커플(서브 인물)의 HEA를 예고',
      '운명을 뒤집은 끝의 새로운 시작',
      '비극을 막아낸 두 사람의 평온한 일상',
      '신분·가문의 벽을 넘어 공인된 결합',
      '재회로 닫는 회복의 HEA',
      '시한을 이겨내거나 함께 받아들인 애틋한 결말',
      '권력의 정점에서 서로를 택해 함께 군림',
      '소박하지만 확실한 행복으로의 귀결',
      '오랜 갈망 끝에 마침내 닿은 첫 "사랑한다"',
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

// 한국어 조사 자동 선택 — 앞 글자의 받침 유무를 보고 실제 조사 하나를 골라 붙인다.
// 괄호 이중표기("을(를)")를 절대 노출하지 않기 위한 헬퍼.
function hasJong(ch: string): boolean {
  const code = ch.charCodeAt(ch.length - 1)
  if (code < 0xac00 || code > 0xd7a3) return false // 한글 음절이 아니면 받침 없음 취급
  return (code - 0xac00) % 28 !== 0
}
function josa(word: string, withJong: string, noJong: string): string {
  if (!word) return noJong
  // '로/으로'는 받침이 없거나 'ㄹ' 받침이면 '로'
  const last = word[word.length - 1]
  const code = last.charCodeAt(0)
  if (withJong === '으로' && noJong === '로' && code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28
    return word + (jong === 0 || jong === 8 ? '로' : '으로')
  }
  return word + (hasJong(last) ? withJong : noJong)
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

export default function RomanceWorldBuilder({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState<Store>(() => load())
  const [query, setQuery] = useState('')
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')
  const [showSkeleton, setShowSkeleton] = useState(true)
  // 사용자 정의 항목(이름은 유지, 값은 재생성 시 비움) + 고정 '기타' 자유 입력
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')

  const mounted = useRef(true)
  const copyTimer = useRef<number | null>(null)
  const noteTimer = useRef<number | null>(null)

  // payload.genre — 다른(공통) 도구 동선에서 장르가 넘어오면 안내에 반영(로맨스 전용 도구라 보조 용도).
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

  // ── 사용자 정의 항목 ──
  const addCustom = () => {
    const label = (window.prompt('추가할 항목의 이름을 입력하세요 (예: 가문 문장, 첫 대사, 테마곡 등)') || '').trim()
    if (!label) return
    const id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    setCustom((arr) => [...arr, { id, label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) =>
    setCustom((arr) => arr.map((it) => (it.id === id ? { ...it, value } : it)))
  const removeCustom = (id: string) => setCustom((arr) => arr.filter((it) => it.id !== id))
  // 사용자 정의 항목 → fields 맵에 합치기(값이 비어있지 않은 것만) + '기타'
  const customFields = (): Record<string, string> => {
    const out: Record<string, string> = {}
    for (const it of custom) {
      const k = it.label.trim()
      const v = it.value.trim()
      if (k && v) out[k] = v
    }
    if (etc.trim()) out.etc = etc.trim()
    return out
  }
  // 사용자 정의 항목 + '기타' → 텍스트 라인(요약/복사용)
  const customLines = (): string[] => {
    const out: string[] = []
    for (const it of custom) {
      const v = it.value.trim()
      if (it.label.trim() && v) out.push(`- ${it.label.trim()}: ${v.replace(/\n/g, '\n    ')}`)
    }
    if (etc.trim()) out.push(`- 기타: ${etc.trim().replace(/\n/g, '\n    ')}`)
    return out
  }

  // ── 관계 골격 생성기 ──
  const rerollAll = () => {
    setStore((s) => {
      const next: SkeletonState = { ...s.skeleton }
      for (const slot of SLOTS) if (!s.locks[slot.key]) next[slot.key] = randIdx(slot.pool.length)
      return { ...s, skeleton: next }
    })
    // 새로 무작위 생성: 사용자 정의 항목의 '값'과 '기타'는 비우되, 항목(이름)은 유지한다.
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
    // 트로프 + 하위장르 앞머리를 제목 후보로
    const trope = SLOTS[1].pool[store.skeleton.trope ?? 0]
    const sub = SLOTS[0].pool[store.skeleton.subgenre ?? 0]
    return `관계 골격 — ${sub.split(/[—,(]/)[0].trim()} / ${trope.split(/[—,(]/)[0].trim()}`
  }

  // 생성한 골격을 본문(섹션 답안)에 반영 — 슬롯을 대응 섹션 필드에 채운다(빈 필드는 대체, 내용 있으면 이어붙임).
  const SKELETON_MAP: Record<string, [string, string]> = {
    subgenre: ['world', 'subgenre'],
    trope: ['dynamic', 'trope'],
    heat: ['contract', 'heat'],
    heroine: ['leads', 'heroine'],
    hero: ['leads', 'hero'],
    meet: ['arc', 'meetcute'],
    internal: ['conflict', 'internal'],
    external: ['conflict', 'external'],
    pushpull: ['dynamic', 'pushpull'],
    black: ['arc', 'blackmoment'],
    grand: ['arc', 'grand'],
    ending: ['arc', 'resolution'],
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
    const cl = customLines()
    const extra = cl.length ? '\n\n[사용자 정의·기타]\n' + cl.join('\n') : ''
    addToLibrary('snippets', {
      text: skeletonTitle() + '\n\n' + skeletonText() + extra,
      source: '로맨스 세계관 빌더 · 관계 골격',
      tags: ['로맨스', '세계관', '관계골격', '트로프'],
    })
    flashCopied('관계 골격을 글감 라이브러리에 담았어요')
  }

  // 골격의 두 주인공을 인물 라이브러리로
  const skeletonCharsToLibrary = () => {
    const heroine = SLOTS[3].pool[store.skeleton.heroine ?? 0]
    const hero = SLOTS[4].pool[store.skeleton.hero ?? 0]
    const internal = SLOTS[6].pool[store.skeleton.internal ?? 0]
    const trope = SLOTS[1].pool[store.skeleton.trope ?? 0]
    const cf = customFields()
    addToLibrary('characters', {
      name: '주인공 A',
      role: '여주인공(로맨스)',
      personality: heroine,
      secret: internal,
      notes: `핵심 트로프: ${trope}`,
      source: '로맨스 세계관 빌더',
      fields: {
        name: '주인공 A',
        role: '여주인공(로맨스)',
        gender: '여성',
        personality: heroine,
        fear: internal,
        flaw: internal,
        notes: `핵심 트로프: ${trope}`,
        ...cf,
      },
    })
    addToLibrary('characters', {
      name: '주인공 B',
      role: '남주인공(로맨스)',
      personality: hero,
      notes: `핵심 트로프: ${trope}`,
      source: '로맨스 세계관 빌더',
      fields: {
        name: '주인공 B',
        role: '남주인공(로맨스)',
        gender: '남성',
        personality: hero,
        notes: `핵심 트로프: ${trope}`,
        ...cf,
      },
    })
    flashCopied('두 주인공을 인물 라이브러리에 담았어요')
  }

  // 골격의 무대를 장소 라이브러리로(하위장르+톤을 분위기로)
  const skeletonPlaceToLibrary = () => {
    const sub = SLOTS[0].pool[store.skeleton.subgenre ?? 0]
    const heat = SLOTS[2].pool[store.skeleton.heat ?? 0]
    const external = SLOTS[7].pool[store.skeleton.external ?? 0]
    const cf = customFields()
    addToLibrary('places', {
      name: '로맨스 무대 — ' + sub.split(/[—,(]/)[0].trim(),
      kind: '배경·세계',
      mood: heat,
      history: sub,
      rules: external,
      source: '로맨스 세계관 빌더',
      fields: {
        name: '로맨스 무대 — ' + sub.split(/[—,(]/)[0].trim(),
        kind: '배경·세계',
        atmosphere: heat,
        history: sub,
        rules: external,
        ...cf,
      },
    })
    flashCopied('로맨스 무대를 장소 라이브러리에 담았어요')
  }

  // 골격을 프로젝트에 추가(자료 › 세계관)
  const skeletonToProject = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않아 추가할 수 없어요.'); return }
    const title = skeletonTitle()
    const body = skeletonLines().map((l) => `<p><b>${esc(l.icon + ' ' + l.label)}</b> — ${esc(l.text)}</p>`).join('')
    const metaCols: Record<string, string> = {
      장르: '로맨스',
      하위장르: SLOTS[0].pool[store.skeleton.subgenre ?? 0].split(/[—,(]/)[0].trim().slice(0, 40),
      트로프: SLOTS[1].pool[store.skeleton.trope ?? 0].split(/[—,(]/)[0].trim().slice(0, 40),
      관능도: SLOTS[2].pool[store.skeleton.heat ?? 0].split(/[—,(]/)[0].trim().slice(0, 40),
    }
    const id = addToProject({ kind: 'text', root: 'research', folder: '세계관', title, bodyHtml: body, meta: metaCols })
    if (id) flashNote(`‘${title}’${josa(title, '을', '를')} 프로젝트 ‘자료 › 세계관’에 추가했어요.`)
    else flashNote('프로젝트에 추가하지 못했어요.')
  }

  // ── 전체 설정 → 텍스트(섹션별 채워진 답안만) ──
  const buildFullText = (): string => {
    const out: string[] = []
    out.push('# 로맨스 세계관·관계 설정')
    out.push('')
    out.push('[관계 골격]')
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
      out.push('## ➕ 사용자 정의·기타')
      for (const line of cl) out.push(line)
    }
    return out.join('\n')
  }

  const buildFullHtml = (): string => {
    const parts: string[] = []
    parts.push(`<h2>로맨스 세계관·관계 설정</h2>`)
    parts.push(`<p><b>관계 골격</b></p>`)
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
    const cf = customFields()
    const cfKeys = Object.keys(cf)
    if (cfKeys.length) {
      parts.push(`<h3>${esc('➕ 사용자 정의·기타')}</h3>`)
      for (const k of cfKeys) {
        const v = cf[k].replace(/\r\n|\r|\n/g, '<br>')
        const lbl = k === 'etc' ? '기타' : k
        parts.push(`<p><b>${esc(lbl)}</b><br>${esc(v).replace(/&lt;br&gt;/g, '<br>')}</p>`)
      }
    }
    return parts.join('')
  }

  const exportAll = () => {
    copyText(buildFullText(), '전체 로맨스 설정을 복사했어요')
  }

  const fullToProject = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않아 추가할 수 없어요.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '세계관',
      title: '로맨스 세계관·관계 설정',
      bodyHtml: buildFullHtml(),
      meta: { 장르: '로맨스', 섹션: String(answeredSectionCount) },
    })
    if (id) flashNote('전체 로맨스 설정을 프로젝트 ‘자료 › 세계관’에 추가했어요.')
    else flashNote('프로젝트에 추가하지 못했어요.')
  }

  // 섹션 답안 통계
  const sectionFilledCount = (sec: Section) => sec.fields.filter((f) => getAns(sec.key, f.key).trim()).length
  const answeredSectionCount = SECTIONS.filter((s) => sectionFilledCount(s) > 0).length
  const totalFilled = SECTIONS.reduce((a, s) => a + sectionFilledCount(s), 0)
  const totalFields = SECTIONS.reduce((a, s) => a + s.fields.length, 0)

  // 검색: 매칭 섹션/필드 강조
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

  const related = ['character-forge', 'relationship-map', 'setting-bible', 'name-mixer', 'emotion-arc']
  const relLabel: Record<string, string> = {
    'character-forge': '🧬 캐릭터 생성기',
    'relationship-map': '🪢 관계도',
    'setting-bible': '🗺️ 배경 설정집',
    'name-mixer': '🔤 이름 믹서',
    'emotion-arc': '📈 감정 곡선',
  }
  const openRelated = (id: string) => openToolLinked(id, { genre: '로맨스' })

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={headTitle}><Emoji e="💞" /> 로맨스 세계관 빌더</span>
        <span style={{ ...muted, fontSize: 12 }}>설정 {totalFilled}/{totalFields} · 섹션 {answeredSectionCount}/{SECTIONS.length}</span>
        <span style={{ flex: 1 }} />
        {copied && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{copied}</span>}
        <button className="minibtn" onClick={() => setShowSkeleton((v) => !v)} title="관계 골격 생성기 펼치기/접기">
          {showSkeleton ? '▾ 골격 생성기' : '▸ 골격 생성기'}
        </button>
        <button className="minibtn" onClick={exportAll} title="전체 로맨스 설정을 텍스트로 복사"><Emoji e="📋" /> 전체 복사</button>
        <button className="linkbtn" style={linkbtn} onClick={fullToProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '전체 설정을 프로젝트 자료(세계관)에 문서로 추가' : '프로젝트에 연결되어 있지 않아요'}>
          <Emoji e="📄" /> 프로젝트에 추가
        </button>
      </div>

      {note && <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--warn)', borderBottom: '1px solid var(--border)', lineHeight: 1.5 }}>{note}</div>}

      {/* ── 관계 골격 자동 생성기 ── */}
      {showSkeleton && (
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0, maxHeight: 340, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={sectionTitle}><Emoji e="🎲" /> 관계 골격 자동 생성기</span>
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
                  <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{emojify(slot.pool[store.skeleton[slot.key] ?? 0])}</div>
                </div>
              )
            })}
          </div>

          <div style={linkbar}>
            <button className="minibtn" onClick={() => { const cl = customLines(); copyText(skeletonTitle() + '\n\n' + skeletonText() + (cl.length ? '\n\n[사용자 정의·기타]\n' + cl.join('\n') : ''), '관계 골격을 복사했어요') }}><Emoji e="📋" /> 골격 복사</button>
            <button className="minibtn" onClick={applySkeletonToAnswers} title="골격을 아래 설정 항목 본문에 반영">⬇ 설정에 반영</button>
            <button className="minibtn" onClick={skeletonToLibrary} title="관계 골격을 글감(스니펫) 라이브러리에 저장"><Emoji e="📥" /> 글감으로</button>
            <button className="minibtn" onClick={skeletonCharsToLibrary} title="두 주인공을 인물 라이브러리에 저장"><Emoji e="👤" /> 두 주인공</button>
            <button className="minibtn" onClick={skeletonPlaceToLibrary} title="로맨스 무대를 장소 라이브러리에 저장"><Emoji e="📍" /> 무대로</button>
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
                  {f.hint && <div style={{ ...muted, color: 'var(--muted)' }}><Emoji e="💡" /> {emojify(f.hint)}</div>}
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
                          title="클릭: 입력에 채우기 / 복사는 우측 📋 사용"
                        >
                          {emojify(c.length > 64 ? c.slice(0, 64) + '…' : c)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* 사용자 정의 항목 + 고정 '기타' (모든 섹션에서 항상 보임) */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={sectionTitle}><Emoji e="➕" /> 사용자 정의 항목</div>
                <span style={{ flex: 1 }} />
                <button className="minibtn" onClick={addCustom} title="원하는 항목을 직접 추가합니다(이름을 입력하면 빈 입력칸이 생겨요)">＋ 항목 추가</button>
              </div>
              <div style={{ ...muted, marginTop: -4 }}>도시에에 없는 나만의 설정 항목을 직접 만들어 적으세요. 추가한 항목은 인물·장소 시트와 복사/요약에도 함께 담깁니다.</div>
              {custom.length === 0 && <div style={muted}>아직 추가한 항목이 없어요. ‘＋ 항목 추가’를 눌러 시작하세요.</div>}
              {custom.map((it) => (
                <div key={it.id} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ ...label, marginBottom: 0, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emojify(it.label)}</span>
                    <button style={{ ...tinyBtn, color: 'var(--warn)' }} onClick={() => removeCustom(it.id)} title="이 항목 삭제">✕</button>
                  </div>
                  <textarea
                    style={{ ...area, minHeight: 48 }}
                    value={it.value}
                    onChange={(e) => setCustomValue(it.id, e.target.value)}
                    placeholder="이 항목의 내용을 직접 적으세요."
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
                  placeholder="그 밖에 메모해 둘 자유로운 설정·아이디어를 적으세요."
                  aria-label="기타"
                />
              </div>
            </div>

            {/* 연계 도구 */}
            <div style={panel}>
              <div style={sectionTitle}><Emoji e="🔗" /> 함께 쓰면 좋은 도구</div>
              <div style={linkbar}>
                {related.map((rid) => (
                  <button key={rid} className="linkbtn" style={linkbtn} onClick={() => openRelated(rid)} title={`${relLabel[rid] || rid} 열기 (로맨스 모드)`}>
                    {emojify(relLabel[rid] || rid)}
                  </button>
                ))}
              </div>
              <div style={muted}>두 주인공은 <b>캐릭터 생성기</b>로 살을 붙이고 <b>관계도</b>로 끌림·연적을 잇세요. 무대는 <b>배경 설정집</b>, 감정 곡선은 <b>감정 곡선</b> 도구로 이어 정리하면 좋아요.</div>
            </div>

            <div style={{ ...muted, paddingBottom: 4 }}>
              모든 입력은 이 브라우저에 자동 저장됩니다. 로맨스 도시에에 근거한 예시는 ‘채우기’용 출발점이니 작품에 맞게 변주하세요.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
