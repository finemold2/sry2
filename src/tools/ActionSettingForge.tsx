// 액션·전쟁 배경·현장 생성기(ActionSettingForge) — 전장·세트피스 무대를 슬롯 조합으로 무작위 생성.
//   5톤 프리셋(반전·환멸 / 영웅·카타르시스 / 전략·정치 / 무협·초식 / 헌터·각성)별 색채를 반영.
//   슬롯별 🔒 잠금 + 🎲 부분 재생성, 전체 조합수(1조+) 표시. 즐겨찾기 CRUD(localStorage).
//   연계(linkbus): addToProject(kind:'setting', folder:'장소') 로 프로젝트 바인더에 장소 카드 추가,
//   장소 라이브러리(addToLibrary 'places')·스니펫 저장, 관련 도구(배경 설정집/장면/감각 팔레트 등) 열기.
// import 는 react 와 './linkbus' 만 사용한다(다른 모듈 금지).
import { useMemo, useState, useEffect, useRef } from 'react'
import { addToLibrary, openToolLinked, addToProject, hasProjectBridge, TOOL_RELATIONS, Emoji, emojify } from './linkbus'

export const meta = { id: 'action-settingforge', name: '액션·전쟁 배경 생성기(1조+ 조합)', icon: '💥', group: '배경', genre: '액션·전쟁', intro: '전장·세트피스 무대를 지리·제약·시계·감각과 함께 빚어내는 액션·전쟁 전용 배경 생성기', w: 580, h: 700 }

const LS_KEY = 'sry:tool:action-settingforge'

// 관련 도구 이름표(연계 버튼 라벨용)
const REL_LABEL: Record<string, string> = {
  'setting-bible': '🗺️ 배경 설정집',
  'scene-list': '🎬 장면 목록',
  'scene-forge': '🎬 장면 생성기',
  'sensory-palette': '🌫 감각 팔레트',
  'moodboard-grid': '🧩 무드보드',
  'imagination-gallery': '🖼 상상력 갤러리',
  'world-wiki': '📚 세계관 위키',
}

// 5톤 프리셋(첫 선택지) — 도시에 1장의 "톤 프리셋"을 그대로 옮긴다. 분기마다 무대 색채가 갈린다.
type Tone = 'disillusion' | 'heroic' | 'strategy' | 'wuxia' | 'hunter'
interface ToneDef { key: Tone; label: string; icon: string; tag: string; note: string }
const TONES: ToneDef[] = [
  { key: 'disillusion', label: '반전·환멸', icon: '🩸', tag: '반전·환멸', note: '레마르크·헬러 계열. 참호·소모·부조리. 영웅은 없고 무게만 남는다 — 승리조차 공허하게.' },
  { key: 'heroic', label: '영웅·카타르시스', icon: '🔥', tag: '영웅·액션', note: '다이하드·존 윅 계열. 1인 대 다수, 세트피스의 연쇄, 시그니처 무브와 통쾌한 역전.' },
  { key: 'strategy', label: '전략·정치', icon: '♟️', tag: '전략·군담', note: '은하영웅전설·킬러엔젤스 계열. 병참·첩보·기만, 지휘부와 현장의 시점 교차.' },
  { key: 'wuxia', label: '무협·초식', icon: '⚔️', tag: '무협·비무', note: '화산귀환·신무협 계열. 내공·초식·문파전, 비무대와 사파의 음모.' },
  { key: 'hunter', label: '헌터·각성', icon: '🌀', tag: '헌터·레이드', note: '나혼렙·전독시 계열. 게이트·던전·각성, 레이드와 길드전, 시스템 메시지.' },
]

interface Slot { key: string; label: string; icon: string; options: string[]; per?: Partial<Record<Tone, string[]>> }

// 액션·전쟁 도시에에 근거한 자작 데이터 — 일반론이 아닌 장르 특화·구체.
// per: 톤별로 갈아끼우는 옵션(있으면 공통 options 대신 톤 옵션 사용 → 톤마다 색채가 달라진다).
const SLOTS: Slot[] = [
  {
    key: 'arena', label: '전장·현장', icon: '📍',
    options: [
      '엄폐물이라곤 무너진 콘크리트 기둥뿐인 폐공장 내부', '사방이 트인 다리 위, 양끝이 모두 봉쇄된 교량',
      '엘리베이터가 멈춘 고층 빌딩의 비상계단 통로', '시야가 십 보를 넘지 못하는 짙은 안개 속 협곡',
      '폭발물이 산재한 정유 시설의 배관 미로', '인질과 적이 뒤섞인 만원 지하철 객차',
      '한 줄로만 통과되는 좁은 갱도, 천장이 낮은 폐광', '발 디딜 곳마다 무너지는 빙벽의 가파른 사면',
      '사방에서 조여드는 시장통 골목, 출구가 보이지 않는 미로', '조명이 깜빡이는 정전된 지하 주차장',
      '강물이 차오르는 댐 방수로, 만조 시계가 도는 수문 앞', '모래폭풍이 시야를 삼키는 사막 한복판의 보급기지',
    ],
    per: {
      disillusion: [
        '시신이 부패해가는 진창의 참호 전선, 무릎까지 빠지는 흙탕', '포탄에 갈려나간 무인지대(노 맨스 랜드)의 철조망 사이',
        '며칠째 같은 마을을 두고 뺏고 빼앗기는 폐허가 된 시가지', '들것이 끝없이 들어오는 야전병원 텐트 안',
        '진흙과 빗물에 잠긴 폭격 분화구, 시신이 둥둥 뜬 웅덩이', '탈영병을 묻은 후방의 이름 없는 공동묘지 비탈',
        '식량도 탄약도 끊긴 포위된 보급창고의 마지막 방어선', '전사자 명단이 벽을 메운 임시 지휘소 막사',
      ],
      heroic: [
        '경비 카메라가 빼곡한 적 본거지의 펜트하우스 로비', '폭주하는 화물열차의 흔들리는 객차 지붕',
        '샹들리에가 머리 위에서 흔들리는 호화 무도회장', '주차된 차량 사이를 누비는 지하 격투장 한복판',
        '네온이 번지는 빗속 옥상, 헬기가 선회하는 마천루 끝', '총탄에 깨진 유리벽이 사방을 둘러싼 사무실 빌딩 로비',
        '엔진 소음이 귀를 먹먹하게 하는 활주로 위의 정지된 비행기', '경적이 울리는 고속도로 추격, 역주행하는 차들 사이',
      ],
      strategy: [
        '지형도가 펼쳐진 사령부 작전실, 전선이 깜빡이는 상황판 앞', '보급선 길목을 막아선 협곡의 매복 거점',
        '양동작전의 미끼가 펼쳐지는 가짜 진지의 빈 천막', '첩보가 오가는 적 후방의 위장된 무전 기지',
        '포대가 줄지어 선 고지, 사거리 안에 들어온 적 행군로', '함대가 진형을 짜는 성역(회랑) 항로, 좌표가 흐르는 함교',
        '포위망이 좁혀지는 적 수도의 마지막 성문 앞', '거짓 후퇴로 적을 끌어들이는 종심 방어선의 함정 지대',
      ],
      wuxia: [
        '문파의 명운을 건 비무대(比武臺), 사방을 둘러싼 군중의 침묵', '검기가 바위를 가르는 폭포 아래 수련장의 너럭바위',
        '독무가 피어오르는 사파의 비밀 분타(分舵) 지하 밀실', '천하의 고수들이 모인 무림맹 회합장의 긴 회랑',
        '절벽에 걸친 외나무다리, 한 사람만 건널 수 있는 협로', '내공을 갉아먹는 진법(陣法)이 깔린 미궁 같은 죽림(竹林)',
        '문파가 불타는 본산(本山), 무너지는 대들보 아래의 정원', '점혈로 갇힌 포로가 갇힌 산채(山寨)의 뇌옥(牢獄)',
      ],
      hunter: [
        'A급 게이트가 열린 도심 한복판, 균열에서 마수가 쏟아지는 광장', '보스룸으로 통하는 던전 최심부의 봉인된 회랑',
        '브레이크 직전 마기(魔氣)가 새어 나오는 미공략 던전 입구', '길드전이 벌어지는 길드 회관 옥상의 결계 안',
        '상태창이 깜빡이는 안전지대(세이프존)의 부서진 분수대', '시간제한이 도는 인스턴스 던전의 무너지는 방',
        '레이드 파티가 집결한 던전 게이트 앞 베이스캠프', '플레이어 묘비가 늘어선 데스게임 구역의 추모 회랑',
      ],
    },
  },
  {
    key: 'time', label: '시각·기상', icon: '🌦',
    options: [
      '동트기 직전, 사위가 잿빛으로 물드는 박명', '한낮의 열기로 아지랑이가 피어오르는 정오',
      '땅거미가 깔려 적아 식별이 어려운 황혼', '달도 없는 칠흑 같은 자정, 야시경 없이는 한 치 앞도',
      '함박눈이 발자국을 지워가는 새벽', '천둥이 포성을 삼키는 폭풍우의 한밤',
      '시야를 가리는 해무가 밀려오는 이른 아침', '진눈깨비가 총구를 얼리는 영하의 저녁',
      '모래바람에 조준선이 흔들리는 황사의 한낮', '보름달이 전장을 환히 비추는 매복하기 어려운 밤',
      '장맛비가 발자국과 핏자국을 함께 씻어내는 오후', '서리가 풀잎에 내려 발소리를 키우는 동틀 녘',
    ],
  },
  {
    key: 'terrain', label: '지리·구조', icon: '🗺',
    options: [
      '고지대 하나가 전장을 내려다보는 비대칭 지형', '엄폐물이 거의 없어 한 발만 노출돼도 끝나는 개활지',
      '출구가 단 하나뿐인 막다른 구조, 퇴로가 봉쇄됨', '복층 구조로 위아래에서 협공이 가능한 입체 공간',
      '좁은 길목이 병목을 이뤄 다수가 한 줄로만 통과되는 협로', '엄폐물이 미로처럼 얽혀 시야가 차단된 폐허',
      '수직 낙차가 큰 절벽이 한쪽을 끊어놓은 외길', '다리·통로가 끊겨 우회로가 멀고 험한 단절 지형',
      '물·불·가스가 환경 위험으로 도사린 함정 가득한 시설', '방어자가 농성하기 좋은 성벽·해자로 둘러싸인 요새',
      '시야는 트였으나 소리가 울려 위치가 드러나는 동굴', '엄폐와 매복에 최적인 빽빽한 수풀·시가지 잔해',
    ],
  },
  {
    key: 'clock', label: '시계 장치(시간제한)', icon: '⏱',
    options: [
      '폭탄 타이머가 분 단위로 줄어든다', '적 증원이 도착하기까지 시간이 얼마 없다',
      '인질 처형 시한이 코앞으로 다가왔다', '만조가 차올라 퇴로가 물에 잠기기 시작한다',
      '일출과 함께 적의 항공 지원이 가능해진다', '독가스가 환기구를 통해 차오르고 있다',
      '아군의 산소·식수가 바닥나기 직전이다', '예정된 포격 시각이 머리 위로 다가온다',
      '부상자의 출혈이 멈추지 않아 시간이 곧 생명이다', '봉인·결계가 풀리며 더 강한 적이 깨어나기까지의 카운트다운',
      '연료가 떨어져 탈출 수단이 곧 멈춘다', '통신 두절 전, 마지막 좌표를 송신할 수 있는 짧은 창',
    ],
  },
  {
    key: 'force', label: '병력·세력 구도', icon: '⚖',
    options: [
      '1 대 다수, 압도적 수적 열세 속 최후의 저항', '소수 정예가 대규모 병력의 허를 찌르는 침투',
      '아군과 적이 거의 동수로 맞붙는 정면 소모전', '아군은 무장이 빈약하고 적은 중화기로 무장했다',
      '아군에 배신자가 숨어 있어 등 뒤가 위험하다', '제3세력이 끼어들어 누가 적인지 모호하다',
      '비전투원·민간인이 전장에 섞여 화력을 쓸 수 없다', '지휘관을 잃어 통솔이 무너진 오합지졸의 사수',
      '증원을 기다리는 농성전, 버티기만 하면 이긴다', '퇴로를 끊고 배수의 진을 친 결사대',
      '한 명의 압도적 강자가 전선을 홀로 지탱한다', '양측 모두 지칠 대로 지친 막바지 소모전의 끝',
    ],
  },
  {
    key: 'mood', label: '분위기', icon: '🎭',
    options: [
      '숨이 멎을 듯한 정적, 폭발 직전의 고요', '귀가 먹먹할 만큼 쏟아지는 굉음과 혼돈',
      '체념과 결연함이 뒤섞인 마지막 각오', '동료를 잃은 자리의 서늘한 분노',
      '적과 눈이 마주친 찰나의 살의 어린 긴장', '승리를 직감한 자의 들뜬 광기',
      '퇴로가 끊겼음을 깨달은 순간의 차가운 공포', '오랜 매복 끝의 권태와 살얼음 같은 경계',
      '아드레날린이 시간을 늘려놓은 슬로모션 같은 감각', '피로가 한계를 넘은 무감각한 기계적 사격',
      '명령과 양심이 충돌하는 갈가리 찢긴 마음', '살아남았다는 죄책감이 깔린 전투 직후의 정적',
    ],
  },
  {
    key: 'chekhov', label: '환경 장치(체호프의 무기)', icon: '🧨',
    options: [
      '머리 위에 위태롭게 매달린 샹들리에·중장비', '잠긴 가스 밸브와 새어 나오는 인화성 기체',
      '발밑 어딘가 묻혀 있는 지뢰밭의 표식', '벽에 비치된 소화전·소화기와 미끄러운 거품',
      '천장을 떠받친 부서지기 직전의 대들보', '난간 너머 까마득한 낙차의 절벽·계단참',
      '수문을 열면 한꺼번에 쏟아질 거대한 저수조', '고압 전선이 늘어진 끊어진 전력 설비',
      '버려진 차량의 연료 탱크와 깨진 유리 파편', '천장 환기구로 이어지는 비좁은 탈출 통로',
      '쌓여 있는 드럼통과 흩어진 폭약 상자', '바닥을 적신 기름과 굴러다니는 발화점',
    ],
  },
  {
    key: 'weapon', label: '무장·화기', icon: '🔫',
    options: [
      '탄창이 단 하나 남은 권총, 마지막 한 발', '소음기를 단 저격총, 호흡 한 번이 생사를 가른다',
      '근접 백병전용 나이프와 부서진 개머리판', '연발과 점사를 오가는 분대지원화기',
      '연막탄·섬광탄 같은 비살상 보조 장비뿐', '곡사로 엄폐물 뒤를 노리는 박격포·유탄',
      '재장전 틈이 치명적인 산탄총 한 자루', '무기를 모두 잃고 맨손과 주변 사물뿐',
    ],
    per: {
      wuxia: [
        '내공 한 줌이 남은 애검(愛劍), 검기가 흔들린다', '점혈수(點穴手)와 경공으로 거리를 지우는 맨몸',
        '독을 바른 암기(暗器)와 비수, 보이지 않는 한 수', '봉인된 절기(絶技)를 풀어야만 닿는 마지막 초식',
        '부러진 검을 쥐고도 펼치는 파훼의 한 수', '심법이 어긋난 주화입마 직전의 위태로운 진기',
      ],
      hunter: [
        '쿨타임이 도는 광역 스킬, 단 한 번의 발동', '버프가 꺼지기 직전의 각성 폼 해방',
        'MP가 바닥난 상태의 기본 공격뿐', '드랍한 전설 등급 무기의 봉인 해제 조건',
        '디버프에 걸려 절반만 발휘되는 스킬셋', '파티 힐러가 쓰러져 자가 회복뿐인 한계 상황',
      ],
      strategy: [
        '거짓 무전과 위장으로 적을 속이는 정보전', '보급이 끊겨 노획한 적 화기로 버티는 임기응변',
        '포병 좌표를 불러줄 수 있는 마지막 통신선', '제압 사격으로 길을 여는 분대의 엄호 화력',
      ],
    },
  },
  {
    key: 'detail', label: '현장 디테일', icon: '🔎',
    options: [
      '탄피가 발밑에 수북이 쌓여 미끄러운 바닥', '벽을 따라 번진 핏자국이 누군가의 퇴로를 말해준다',
      '깨진 무전기에서 끊긴 마지막 교신이 흘러나온다', '주인을 잃은 군화 한 짝이 진흙 위에 박혀 있다',
      '아직 온기가 남은 식은 커피와 흩어진 작전 지도', '천장에서 떨어지는 콘크리트 가루와 흔들리는 조명',
      '바리케이드로 쌓아 올린 가구와 모래주머니', '벽에 새겨진 전사자들의 이름과 날짜',
      '연막이 걷히며 드러나는 적의 그림자', '눈밭 위에 한 줄로 찍힌 정찰병의 발자국',
      '버려진 들것과 그 위에 남은 붕대 더미', '깃발이 반쯤 타다 만 채 바람에 펄럭인다',
    ],
  },
  {
    key: 'sense', label: '감각(소리·냄새·촉감)', icon: '🌫',
    options: [
      '코를 찌르는 화약 냄새와 매캐한 연기', '금속이 맞부딪치는 날카로운 마찰음',
      '심장이 귓전을 때리는 자신의 박동 소리', '입안에 도는 비릿한 피 맛과 마른 침',
      '발밑에서 바스러지는 깨진 유리와 잔해', '귀를 먹먹하게 하는 폭음 뒤의 이명',
      '식은땀이 등줄기를 타고 흐르는 끈적함', '흙먼지가 목구멍을 막아 폐가 타들어가는 감각',
      '멀리서 다가오는 군화 발소리의 리듬', '총구를 쥔 손끝의 떨림과 차가운 강철',
      '피비린내와 흙냄새가 뒤엉킨 전장의 공기', '정적 속에 또렷이 들리는 자신의 거친 호흡',
    ],
  },
  {
    key: 'goal', label: '이곳에 온 목적', icon: '🎯',
    options: [
      '인질을 구출하고 무사히 빠져나가려', '거점을 사수하며 증원이 올 때까지 버티려',
      '적 지휘관을 제거하고 전선을 무너뜨리려', '봉쇄선을 뚫고 포위망을 탈출하려',
      '기밀 문서·증거를 회수해 진실을 밝히려', '폭파물을 해체해 더 큰 참사를 막으려',
      '동료의 시신·부상자를 데리고 후퇴하려', '약점을 파악해 한 단계 위 강자를 쓰러뜨리려',
      '함정을 역이용해 추격자를 끝장내려', '마지막 한 사람으로서 시간을 벌어주려',
    ],
  },
  {
    key: 'event', label: '벌어질 사건(전환)', icon: '⚡',
    options: [
      '믿었던 아군이 등 뒤에서 총구를 겨눈다', '설치해 둔 환경 장치가 결정적 순간에 터진다',
      '마지막 한 발·마지막 힘으로 전세가 뒤집힌다', '증원이 예정보다 일찍 도착해 균형이 무너진다',
      '시계 장치가 00:01에서 가까스로 멎는다', '희생을 자처한 후위가 길을 막아서며 외친다',
      '거짓 무전·위장이 들통나 함정이 역으로 작동한다', '한 단계 위 빌런이 시그니처 무브를 봉인 해제한다',
      '진짜 적이 외부가 아니라 아군 지휘부였음이 드러난다', '부상 시계가 한계를 넘어 의식이 흐려지기 시작한다',
      '거짓 안전지대였음이 드러나며 기습이 시작된다', '누적된 수련·복선이 마지막 일격으로 결실을 맺는다',
    ],
  },
]

// 전체 조합수 — 톤 5 × 각 슬롯 옵션 수(톤별 옵션이 있는 슬롯은 톤별 옵션 길이가 들어가도록 톤마다 곱한 뒤 합산)
function comboCount(): number {
  let total = 0
  for (const t of TONES) {
    let n = 1
    for (const s of SLOTS) {
      const opts = s.per && s.per[t.key] ? s.per[t.key]! : s.options
      n *= opts.length
    }
    total += n
  }
  return total
}
const COMBOS = comboCount()

function ri(n: number) { return Math.floor(Math.random() * n) }
function optsOf(s: Slot, tone: Tone): string[] { return s.per && s.per[tone] ? s.per[tone]! : s.options }

interface SavedPreset { id: string; name: string; tone: Tone; picks: Record<string, number>; ts: number }

function loadPresets(): SavedPreset[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p as SavedPreset[] }
  } catch { /* noop */ }
  return []
}

// 톤이 바뀌면 톤별 옵션 길이에 맞춰 인덱스를 클램프
function clampPicks(picks: Record<string, number>, tone: Tone): Record<string, number> {
  const out: Record<string, number> = {}
  for (const s of SLOTS) {
    const len = optsOf(s, tone).length
    const cur = picks[s.key]
    out[s.key] = (typeof cur === 'number' && cur >= 0 && cur < len) ? cur : ri(len)
  }
  return out
}

export default function ActionSettingForge({ payload }: { payload?: Record<string, unknown> }) {
  const initTone: Tone = (() => {
    const g = typeof payload?.genre === 'string' ? (payload.genre as string) : ''
    if (g.includes('무협')) return 'wuxia'
    if (g.includes('헌터') || g.includes('게임')) return 'hunter'
    return 'heroic'
  })()

  const [tone, setTone] = useState<Tone>(initTone)
  const [picks, setPicks] = useState<Record<string, number>>(() => clampPicks({}, initTone))
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState('')
  const [presets, setPresets] = useState<SavedPreset[]>(() => loadPresets())
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  // [추가] 사용자 정의 항목(라벨+값) + 고정 '기타' 자유 입력 — 무작위 생성하지 않고 사용자가 직접 적는다.
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')

  const mounted = useRef(true)
  const flashTimer = useRef<number | null>(null)
  const copyTimer = useRef<number | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (flashTimer.current) clearTimeout(flashTimer.current)
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  // 즐겨찾기 영속(localStorage)
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(presets)) } catch { /* 용량 초과 등 무시 */ }
  }, [presets])

  const toneDef = useMemo(() => TONES.find((t) => t.key === tone)!, [tone])

  const rollAll = () => {
    setPicks((p) => {
      const out: Record<string, number> = {}
      for (const s of SLOTS) out[s.key] = locked[s.key] ? p[s.key] : ri(optsOf(s, tone).length)
      return out
    })
    // [추가] 새 무대를 무작위 생성할 때 사용자 정의 항목의 '값'과 '기타'는 비운다(항목 이름은 유지 — 미리 만든 데이터가 없으므로 무작위 생성하지 않음).
    setCustom((cs) => cs.map((c) => ({ ...c, value: '' })))
    setEtc('')
  }

  // [추가] 사용자 정의 항목 CRUD
  const addCustom = () => {
    const label = window.prompt('추가할 항목 이름을 입력하세요 (예: 전리품, 특수 규칙, 비밀 통로)')
    if (label == null) return
    const lbl = label.trim()
    if (!lbl) return
    setCustom((cs) => [...cs, { id: 'cst_' + Date.now().toString(36) + ri(1e4).toString(36), label: lbl, value: '' }])
  }
  const setCustomValue = (id: string, value: string) => setCustom((cs) => cs.map((c) => (c.id === id ? { ...c, value } : c)))
  const delCustom = (id: string) => setCustom((cs) => cs.filter((c) => c.id !== id))

  // [추가] 연계 객체의 fields 맵에 합칠 사용자 정의/기타 항목(값이 비어있지 않을 때만)
  const extraFields = (): Record<string, string> => {
    const out: Record<string, string> = {}
    for (const c of custom) { const v = c.value.trim(); if (c.label && v) out[c.label] = v }
    const e = etc.trim(); if (e) out.etc = e
    return out
  }
  const rollOne = (k: string) => setPicks((p) => {
    const s = SLOTS.find((x) => x.key === k)!
    return { ...p, [k]: ri(optsOf(s, tone).length) }
  })
  const setPick = (k: string, idx: number) => setPicks((p) => ({ ...p, [k]: idx }))
  const toggleLock = (k: string) => setLocked((l) => ({ ...l, [k]: !l[k] }))
  const changeTone = (t: Tone) => { setTone(t); setPicks((p) => clampPicks(p, t)) }

  const val = (k: string) => { const s = SLOTS.find((x) => x.key === k)!; return optsOf(s, tone)[picks[k]] }

  const placeName = useMemo(() => `[${toneDef.tag}] ${val('arena')}`, [picks, tone]) // eslint-disable-line react-hooks/exhaustive-deps

  const sceneText = useMemo(() => {
    return `《${toneDef.label}》 [${val('time')}] ${val('arena')}. ${val('terrain')}이며, 분위기는 ${val('mood')}. ` +
      `${val('force')} 상황에서 ${val('clock')}. ` +
      `주변엔 ${val('detail')} 있고, ${val('chekhov')}가 도사린다. 손에 쥔 것은 ${val('weapon')}뿐. ` +
      `${val('sense')} 속에서, 누군가는 ${val('goal')} 이곳에 발을 들인다. 이윽고 ${val('event')}.`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks, tone])

  const flash = (m: string) => {
    setSaved(m)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { if (mounted.current) setSaved('') }, 1700)
  }
  const copy = (text?: string) => {
    // [추가] 기본 복사 텍스트에 사용자 정의 항목·기타도 포함(값이 있을 때만)
    let base = sceneText
    if (text == null) {
      const ex = extraFields()
      const lines = Object.entries(ex).map(([k, v]) => `${k === 'etc' ? '기타' : k}: ${v}`)
      if (lines.length) base = sceneText + '\n' + lines.join('\n')
    }
    const t = text ?? base
    navigator.clipboard?.writeText(t).then(() => {
      if (!mounted.current) return
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1400)
    }).catch(() => {})
  }

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // [연계] 프로젝트 바인더에 장소 카드(설정) 추가 — kind:'setting', folder:'장소'
  const toProject = () => {
    const ex = extraFields()
    const exHtml = Object.entries(ex).map(([k, v]) => `<p>${esc(k === 'etc' ? '기타' : k)}: ${esc(v)}</p>`).join('')
    const id = addToProject({
      kind: 'setting', root: 'research', folder: '장소',
      title: placeName,
      icon: '💥',
      bodyHtml:
        `<p><b>${esc(placeName)}</b> <i>(${esc(toneDef.label)} · 액션·전쟁)</i></p>` +
        `<p>시각·기상: ${esc(val('time'))}</p>` +
        `<p>지리·구조: ${esc(val('terrain'))}</p>` +
        `<p>분위기: ${esc(val('mood'))}</p>` +
        `<p>병력·세력 구도: ${esc(val('force'))}</p>` +
        `<p>시계 장치(시간제한): ${esc(val('clock'))}</p>` +
        `<p>환경 장치(체호프의 무기): ${esc(val('chekhov'))}</p>` +
        `<p>무장·화기: ${esc(val('weapon'))}</p>` +
        `<p>현장 디테일: ${esc(val('detail'))}</p>` +
        `<p>감각: ${esc(val('sense'))}</p>` +
        `<p>이곳에 온 목적: ${esc(val('goal'))}</p>` +
        `<p>벌어질 사건: ${esc(val('event'))}</p>` +
        exHtml +
        `<p>${esc(sceneText)}</p>`,
      synopsis: sceneText,
      character: {
        ...ex,
        name: placeName, kind: '전장·세트피스', mood: val('mood'), 톤: toneDef.label, 시각: val('time'), 지리: val('terrain'), 시간제한: val('clock'),
        // 정규(장소) 키로 1:1 매핑 — 받는 허브(배경 설정집)에서 기본 칸에 들어가도록(기존 키는 유지, 정규 키만 추가)
        atmosphere: val('mood'),
        appearance: val('arena'),
        sensory: val('sense'),
        geography: val('terrain'),
        climate: val('time'),
        history: `${toneDef.label} · 액션·전쟁`,
        rules: `시계 장치(시간제한): ${val('clock')} · 환경 장치(체호프의 무기): ${val('chekhov')}`,
        dangers: `병력·세력 구도: ${val('force')} · 무장·화기: ${val('weapon')} · 벌어질 사건: ${val('event')}`,
        landmarks: val('detail'),
        notes: sceneText,
      },
      meta: { 톤: toneDef.label, 현장: val('arena'), 분위기: val('mood'), 시각: val('time'), 지리: val('terrain'), 병력구도: val('force'), 시간제한: val('clock'), 장르: '액션·전쟁' },
    })
    flash(id ? '프로젝트에 장소 추가됨(자료 ▸ 장소)' : '프로젝트에 연결되지 않았습니다')
  }

  // [연계] 장소 라이브러리에 저장
  const toLibrary = () => {
    addToLibrary('places', {
      name: placeName,
      kind: val('arena'),
      mood: val('mood'),
      sensory: val('sense'),
      history: `${toneDef.label} / ${val('time')} / ${val('terrain')} / ${val('force')}`,
      rules: `시간제한: ${val('clock')} · 환경 장치: ${val('chekhov')}`,
      notes: sceneText,
      source: '액션·전쟁 배경 생성기',
      fields: {
        name: placeName,
        kind: '전장·세트피스',
        atmosphere: val('mood'),
        appearance: val('arena'),
        sensory: val('sense'),
        geography: val('terrain'),
        climate: val('time'),
        history: `${toneDef.label} · 액션·전쟁`,
        rules: `시계 장치(시간제한): ${val('clock')} · 환경 장치(체호프의 무기): ${val('chekhov')}`,
        dangers: `병력·세력 구도: ${val('force')} · 무장·화기: ${val('weapon')} · 벌어질 사건: ${val('event')}`,
        landmarks: val('detail'),
        notes: sceneText,
        ...extraFields(),
      },
    })
    flash('장소 라이브러리에 저장')
  }

  // [연계] 스니펫(글감)으로 저장
  const toSnippet = () => {
    addToLibrary('snippets', { text: sceneText, source: '액션·전쟁 배경 생성기', tags: ['배경', '액션·전쟁', toneDef.tag] })
    flash('스니펫(글감)으로 저장')
  }

  // [연계] 배경 설정집으로 보내기(데이터 동반)
  const toSettingBible = () => {
    openToolLinked('setting-bible', {
      genre: '액션·전쟁',
      place: {
        name: placeName, type: '전장·세트피스', mood: val('mood'), sensory: val('sense'),
        history: `${toneDef.label} · ${val('time')} · ${val('terrain')}`,
        rules: `시간제한: ${val('clock')} · 환경 장치: ${val('chekhov')} · 병력구도: ${val('force')}`,
        notes: sceneText,
        fields: {
          name: placeName,
          kind: '전장·세트피스',
          atmosphere: val('mood'),
          appearance: val('arena'),
          sensory: val('sense'),
          geography: val('terrain'),
          climate: val('time'),
          history: `${toneDef.label} · 액션·전쟁`,
          rules: `시계 장치(시간제한): ${val('clock')} · 환경 장치(체호프의 무기): ${val('chekhov')}`,
          dangers: `병력·세력 구도: ${val('force')} · 무장·화기: ${val('weapon')} · 벌어질 사건: ${val('event')}`,
          landmarks: val('detail'),
          notes: sceneText,
          ...extraFields(),
        },
      },
    })
    flash('배경 설정집으로 보냄')
  }

  // 즐겨찾기 CRUD
  const savePreset = () => {
    const nm = placeName.length > 28 ? placeName.slice(0, 28) + '…' : placeName
    setPresets((p) => [{ id: 'asf_' + Date.now().toString(36) + ri(1e4).toString(36), name: nm, tone, picks: { ...picks }, ts: Date.now() }, ...p].slice(0, 40))
    flash('현재 조합을 즐겨찾기에 저장')
  }
  const applyPreset = (p: SavedPreset) => {
    setTone(p.tone)
    setPicks(clampPicks({ ...p.picks }, p.tone))
    flash('즐겨찾기 불러옴')
  }
  const delPreset = (id: string) => setPresets((p) => p.filter((x) => x.id !== id))

  // 사전류(슬롯 옵션 펼침 + 검색 + 무작위 + 클릭복사)
  const q = query.trim()
  const filterMatch = (txt: string) => !q || txt.includes(q)

  const relIds = (TOOL_RELATIONS['setting-bible'] || []).filter((id) => REL_LABEL[id] && id !== 'setting-bible' && id !== 'scene-list')

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)', overflow: 'auto' }}>
      {/* 톤 프리셋 선택 */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
        {TONES.map((t) => (
          <button key={t.key} className={'minibtn' + (tone === t.key ? ' active' : '')} title={t.note}
            onClick={() => changeTone(t.key)}
            style={{ borderColor: tone === t.key ? 'var(--accent)' : 'var(--border)', color: tone === t.key ? 'var(--accent)' : undefined }}>
            <Emoji e={t.icon}/> {t.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{toneDef.note}</div>
      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
        조합 가능 무대 <b style={{ color: 'var(--accent)' }}>{COMBOS.toLocaleString()}</b>가지. 슬롯을 <Emoji e="🔒"/> 잠그고 나머지만 <Emoji e="🎲"/> 돌려 원하는 전장을 찾으세요.
      </div>

      {/* 생성 결과 */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 13px', fontSize: 14, lineHeight: 1.65 }}>
        {sceneText}
      </div>

      {/* 슬롯 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {SLOTS.map((s) => {
          const opts = optsOf(s, tone)
          const open = expanded === s.key
          return (
            <div key={s.key} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', width: 96, flexShrink: 0 }}><Emoji e={s.icon}/> {s.label}</span>
                <span style={{ flex: 1, fontSize: 13, minWidth: 0 }}>{opts[picks[s.key]]}</span>
                <button className="minibtn" title="펼쳐서 고르기" onClick={() => setExpanded(open ? null : s.key)} style={{ color: open ? 'var(--accent)' : 'var(--muted)' }}>▾</button>
                <button className="minibtn" title={locked[s.key] ? '잠금 해제' : '이 슬롯 잠금'} onClick={() => toggleLock(s.key)} style={{ color: locked[s.key] ? 'var(--accent)' : 'var(--muted)' }}>{locked[s.key] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
                <button className="minibtn" title="이 슬롯만 다시" onClick={() => rollOne(s.key)} disabled={locked[s.key]}><Emoji e="🎲"/></button>
              </div>
              {open && (
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 150, overflow: 'auto' }}>
                  {opts.map((o, i) => filterMatch(o) && (
                    <button key={i} className="minibtn" onClick={() => { setPick(s.key, i); copy(o) }}
                      title="선택 + 클릭복사"
                      style={{ fontSize: 11, borderColor: i === picks[s.key] ? 'var(--accent)' : 'var(--border)', color: i === picks[s.key] ? 'var(--accent)' : undefined }}>
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* [추가] 사용자 정의 항목 + 고정 '기타' 자유 입력 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, borderTop: '1px solid var(--border)', paddingTop: 7 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', flex: 1 }}><Emoji e="✍"/> 직접 적는 항목(무작위 생성 안 함)</span>
          <button className="minibtn" onClick={addCustom} title="원하는 항목을 직접 추가합니다">＋ 항목 추가</button>
        </div>
        {custom.map((c) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', width: 96, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.label}>{c.label}</span>
            <input value={c.value} onChange={(e) => setCustomValue(c.id, e.target.value)} placeholder="내용을 직접 입력"
              style={{ flex: 1, minWidth: 0, padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 12 }} />
            <button className="minibtn" title="이 항목 삭제" onClick={() => delCustom(c.id)}>✕</button>
          </div>
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="📝"/> 기타(자유 입력)</span>
          <textarea value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="이 무대에 대해 자유롭게 메모하세요."
            rows={3} style={{ padding: '6px 9px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 12, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit' }} />
        </div>
      </div>

      {/* 사전 검색(펼친 슬롯 옵션 필터) */}
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔎 펼친 슬롯에서 어휘 검색(예: 참호, 게이트, 시계)"
        style={{ padding: '6px 9px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 12 }} />

      {/* 액션 버튼 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={rollAll}><Emoji e="🎲"/> 전장 생성</button>
        <button className="minibtn" onClick={() => copy()}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
        <button className="minibtn" onClick={savePreset}><Emoji e="⭐"/> 즐겨찾기</button>
      </div>

      {/* 연계 */}
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '현재 전장을 프로젝트 자료(장소)에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={toLibrary}><Emoji e="🏞"/> 장소 라이브러리</button>
        <button className="linkbtn" onClick={toSnippet}><Emoji e="📥"/> 스니펫 저장</button>
        <button className="linkbtn" onClick={toSettingBible}><Emoji e="🗺️"/> 배경 설정집으로</button>
        {relIds.map((id) => (
          <button key={id} className="linkbtn" onClick={() => openToolLinked(id, { genre: '액션·전쟁' })}>{emojify(REL_LABEL[id])}</button>
        ))}
      </div>

      {saved && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>✓ {saved}</div>}

      {/* 즐겨찾기 목록 */}
      {presets.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="⭐"/> 즐겨찾기 ({presets.length})</div>
          {presets.map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.name}>{p.name}</span>
              <button className="minibtn" title="불러오기" onClick={() => applyPreset(p)}>↩</button>
              <button className="minibtn" title="삭제" onClick={() => delPreset(p.id)}><Emoji e="🗑"/></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
