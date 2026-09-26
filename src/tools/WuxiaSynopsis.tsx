// 무협 시놉시스 빌더 — 계보(문체 모드)·주인공·기연·사문/문파·은원·신공·적(흑막)·금기·반전·귀결을
// 무협 장르 관습에 맞춰 입력하면 무협소설 시놉시스를 여러 종합 틀로 자동 완성한다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크 없음(전부 로컬·자작 무협 데이터).
// 모든 입력/저장은 localStorage('sry:tool:wuxia-synopsis') 에 JSON 자동 저장·복원. 언마운트 시 타이머 정리.
// 연계: addToProject(root:'research', folder:'기획', '시놉시스') 로 프로젝트 바인더에 문서 추가,
//       addToLibrary('snippets', ...) 로 생성 시놉시스를 글감 보관, openToolLinked 로 관련 도구 열기.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'wuxia-synopsis',
  name: '무협 시놉시스 빌더',
  icon: '⚔️',
  group: '구조',
  genre: '무협',
  intro: '계보·주인공·기연·사문·은원·신공·흑막·반전·귀결을 채우면 무협 시놉시스를 자동 종합합니다',
  w: 700,
  h: 640,
}

const LS = 'sry:tool:wuxia-synopsis'

// ---------- 유형 키 ----------
type LineageKey = 'jinyong' | 'gulong' | 'sinmuhyeop' | 'webnovel' // 계보(문체·도덕관 모드)
type ScaleKey = 'gwiwon' | 'munpa' | 'jeongsa' | 'cheonha' | 'seonhyeop' // 갈등 규모(서사 축)

// ---------- 계보(대표작 기반 문체 모드) ----------
const LINEAGES: { key: LineageKey; label: string; desc: string; root: string; open: string }[] = [
  {
    key: 'jinyong', label: '정통 대협(김용형)',
    desc: '협지대자·위국위민. 개인 무공이 천하대의로 확장되는 대하 정통',
    root: '사조영웅전·천룡팔부 계열',
    open: '난세의 강호, 한 사람의 협(俠)이 천하의 무게를 짊어진다.',
  },
  {
    key: 'gulong', label: '낭인 추리(고룡형)',
    desc: '단문·분위기·심리전. 한 수에 승부, 고독한 낭인형 주인공',
    root: '초류향·소이비도 계열',
    open: '검을 뽑기 전, 이미 승부는 마음속에서 끝나 있었다.',
  },
  {
    key: 'sinmuhyeop', label: '한무 신무협(좌백·용대운형)',
    desc: '캐릭터 내면·문체 혁신, 강호의 그늘과 인간 군상',
    root: '대도오·군림천하 계열',
    open: '강호는 의(義)를 말하지만, 정작 의로 죽는 자는 드물다.',
  },
  {
    key: 'webnovel', label: '웹소설 회귀먼치킨(화산귀환형)',
    desc: '회귀·미래지식·사이다. 무시→증명→압도, 군중의 경악이 카타르시스',
    root: '화산귀환 계열',
    open: '한 번 죽어본 자는, 두 번째 강호에서 두려울 것이 없다.',
  },
]

// ---------- 갈등 규모(서사 축) ----------
const SCALES: { key: ScaleKey; label: string; q: string }[] = [
  { key: 'gwiwon', label: '사문·가문 복수(은원)', q: '몰살된 사문·가문의 원한을 어떻게 갚는가' },
  { key: 'munpa', label: '비급·신병 쟁탈', q: '천하를 가를 절대무공·신병을 누가 차지하는가' },
  { key: 'jeongsa', label: '정사대전(정파 대 사파)', q: '강호를 둘로 가른 정사의 전운을 어찌 가를 것인가' },
  { key: 'cheonha', label: '마교 침공·천하대란', q: '강호 전체를 삼키려는 마교(천마)를 막을 수 있는가' },
  { key: 'seonhyeop', label: '선협·비검 쟁투', q: '비검·법보를 둘러싼 검선들의 천하제일 다툼은 어디로 향하는가' },
]

// 빈 칸은 자리표시자로 — 언제나 읽히는 문장을 만든다.
function f(s: string, ph: string): string {
  const t = (s || '').trim()
  return t || `〔${ph}〕`
}
// 어미 마침표 정리(중복 방지).
function trimDot(s: string): string {
  return (s || '').trim().replace(/[.。!?！？]+$/, '')
}

// ---------- 한국어 조사 자동 선택 헬퍼 ----------
// 앞 단어의 마지막 '한글' 글자 받침을 보고 조사를 실제로 하나 골라 붙인다.
// 결과에 '을(를)' 같은 괄호 이중표기가 절대 노출되지 않게 한다.
// 한글이 아닌 글자(괄호·따옴표·라틴문자 등)는 건너뛰고 마지막 한글을 찾는다.
function lastHangul(s: string): string {
  const t = (s || '').trim()
  for (let i = t.length - 1; i >= 0; i--) {
    const c = t.charCodeAt(i)
    if (c >= 0xac00 && c <= 0xd7a3) return t[i]
  }
  return ''
}
// 받침 유무. 한글이 없으면(숫자·영문 등) 받침 있음으로 가정(보수적).
function hasBatchim(s: string): boolean {
  const ch = lastHangul(s)
  if (!ch) return true
  return (ch.charCodeAt(0) - 0xac00) % 28 !== 0
}
// 받침이 'ㄹ'인지(으로/로 판정용).
function batchimIsRieul(s: string): boolean {
  const ch = lastHangul(s)
  if (!ch) return false
  return (ch.charCodeAt(0) - 0xac00) % 28 === 8
}
// 단어 + 조사(받침 보고 택1). type: 목적격(을/를)·주격(이/가)·보조사(은/는)·방향격(으로/로).
function J(word: string, type: '을' | '이' | '은' | '으로'): string {
  const w = (word || '').trim()
  if (type === '으로') {
    // 받침 없거나 'ㄹ' 받침이면 '로', 그 외 받침이면 '으로'.
    return w + (!hasBatchim(w) || batchimIsRieul(w) ? '로' : '으로')
  }
  const b = hasBatchim(w)
  if (type === '을') return w + (b ? '을' : '를')
  if (type === '이') return w + (b ? '이' : '가')
  return w + (b ? '은' : '는')
}

// ---------- 적(흑막) 모델 ----------
interface Foe {
  id: string
  name: string      // 적 이름·세력
  position: string  // 강호 위계(예: 천마, 사도련주, 절정고수)
  scheme: string    // 음모·목적
}

interface Draft {
  hero: string          // 주인공
  heroStart: string     // 출발 처지(폐인·막내 제자·몰락 후예 등)
  destiny: string       // 기연(절벽 비동·내단·전인 지목 등)
  destinyCost: string   // 기연의 대가·제약(주화입마 위험·수명·심마)
  sect: string          // 사문·문파
  art: string           // 상승무공·신공(절대무공)
  enmity: string        // 은원(원수·맺힌 원한)
  foes: Foe[]           // 적·흑막
  taboo: string         // 금기무공·마공·대가 지불(흡성대법·반탄지력 등)
  trial: string         // 중반 최저점(배신·주화입마·정체 폭로)
  twist: string         // 반전(정체·혈연·사부가 원수 등)
  resolution: string    // 결말(천하제일 등극 / 귀은 / 비극적 승리)
  theme: string         // 주제(협의·은원·대가)
  lineage: LineageKey
  scale: ScaleKey
  tpl: number           // 선택한 종합 틀
}

// ---------- 종합 틀(템플릿) ----------
interface Tpl {
  name: string
  hint: string
  build: (d: Draft) => string
}

function foeLine(fs: Foe[]): string {
  const named = fs.filter((x) => x.name.trim())
  if (!named.length) return '〔적·흑막〕'
  return named.map((x) => (x.position.trim() ? `${x.name.trim()}(${x.position.trim()})` : x.name.trim())).join(', ')
}

const TEMPLATES: Tpl[] = [
  {
    name: '대하 정통형',
    hint: '발단→기연→출도→대전→귀결, 김용식 정통 무협의 정석',
    build: (d) => {
      const lin = LINEAGES.find((l) => l.key === d.lineage)!
      const sc = SCALES.find((s) => s.key === d.scale)!
      return [
        `${lin.open} ${J(f(d.hero, '주인공'), '은')} ${f(d.heroStart, '출발 처지')}, 강호의 밑바닥에서 시작한다.`,
        `${J(f(d.destiny, '기연'), '을')} 통해 ${J(f(d.art, '상승무공·신공'), '을')} 얻지만, 그 힘에는 ${J(f(d.destinyCost, '기연의 대가'), '이')} 따른다.`,
        `${J(f(d.sect, '사문·문파'), '을')} 등에 업고 출도한 그가 마주한 것은 ${foeLine(d.foes)}의 음모 — "${sc.q}".`,
        `골수에 사무친 ${J(f(d.enmity, '은원'), '을')} 갚으려는 길 위에서, ${J(f(d.trial, '중반의 시련'), '이')} 그를 나락으로 떨어뜨린다.`,
        `마침내 ${J(f(d.taboo, '금기·절초'), '을')} 펼친 일전 끝에 ${J(f(d.twist, '반전'), '이')} 드러나고, ${f(d.resolution, '귀결')}.`,
        `이 이야기는 결국 ${f(d.theme, '주제')}에 관한 무협이다.`,
      ].join(' ')
    },
  },
  {
    name: '낭인 분위기형',
    hint: '고룡식 단문·심리전, 한 수의 승부와 고독을 강조',
    build: (d) => {
      const lin = LINEAGES.find((l) => l.key === d.lineage)!
      return [
        `${lin.open}`,
        `${f(d.hero, '주인공')} — ${f(d.heroStart, '출발 처지')}. 그가 지닌 것은 단 하나, ${f(d.art, '신공·절초')}뿐이다.`,
        `강호를 떠도는 그의 발길은 ${J(f(d.enmity, '은원'), '을')} 향한다.`,
        `${J(foeLine(d.foes), '이')} 그림자처럼 그를 시험하고, ${J(f(d.trial, '중반의 시련'), '이')} 그의 검끝을 흔든다.`,
        `달빛 아래 마주 선 단 한 번의 합 — 그 찰나에 ${J(f(d.twist, '반전'), '이')} 드러난다.`,
        `검을 거둔 자리에 남는 것은 ${f(d.resolution, '귀결')}, 그리고 ${f(d.theme, '주제')}.`,
      ].join(' ')
    },
  },
  {
    name: '신무협 군상형',
    hint: '한무 신무협식 — 인물 내면과 강호의 그늘, 의(義)의 균열에 초점',
    build: (d) => {
      const sc = SCALES.find((s) => s.key === d.scale)!
      return [
        `강호는 협(俠)을 말하지만, ${J(f(d.hero, '주인공'), '이')} 본 강호는 다르다.`,
        `${f(d.heroStart, '출발 처지')}였던 그는 ${J(f(d.destiny, '기연'), '으로')} 일어서되, ${J(f(d.destinyCost, '기연의 대가'), '을')} 가슴에 품는다.`,
        `${f(d.sect, '사문·문파')}의 이름 아래 ${J(foeLine(d.foes), '이')} 벌이는 ${sc.q} — 그 틈에서 정(正)과 사(邪)의 경계가 흐려진다.`,
        `${f(d.enmity, '은원')}과 ${f(d.taboo, '금기·마공')}의 유혹 사이에서, ${J(f(d.trial, '중반의 시련'), '이')} 그를 시험한다.`,
        `그리고 모든 가면이 벗겨지는 순간 ${f(d.twist, '반전')} — ${f(d.resolution, '귀결')}.`,
        `남는 물음은 하나, ${f(d.theme, '주제')}.`,
      ].join(' ')
    },
  },
  {
    name: '회귀 먼치킨형(웹소설)',
    hint: '화산귀환식 — 회귀·미래지식·사이다, 무시→증명→압도→경악',
    build: (d) => {
      const sc = SCALES.find((s) => s.key === d.scale)!
      return [
        `천하제일을 눈앞에 두고 스러진 ${f(d.hero, '주인공')}, 그가 ${f(d.heroStart, '약자였던 과거')}로 회귀한다.`,
        `미래를 아는 그는 ${J(f(d.destiny, '기연'), '을')} 누구보다 먼저 손에 넣어 ${J(f(d.art, '신공·절대무공'), '을')} 완성한다.`,
        `처음엔 무시당하지만, 한 수 한 수가 ${f(d.sect, '사문·문파')}와 강호를 경악시킨다.`,
        `전생의 원수 ${J(foeLine(d.foes), '이')} 꾸미는 ${J(sc.label, '을')}, 이번엔 미리 부순다.`,
        `${J(f(d.enmity, '은원'), '을')} 통쾌하게 청산하는 길에 ${f(d.trial, '중반의 위기')}와 ${J(f(d.twist, '반전'), '이')} 기다리고,`,
        `끝내 ${f(d.resolution, '귀결')} — 그가 증명하는 것은 ${f(d.theme, '주제')}다.`,
      ].join(' ')
    },
  },
  {
    name: '뒤표지(블러브)형',
    hint: '책 뒤표지 홍보문구처럼 압축·자극적으로',
    build: (d) => {
      const sc = SCALES.find((s) => s.key === d.scale)!
      return [
        `${f(d.heroStart, '출발 처지')}의 ${f(d.hero, '주인공')}.`,
        `${J(f(d.destiny, '기연'), '이')} 그의 운명을 뒤집는다.`,
        `${J(foeLine(d.foes), '이')} 강호를 노리고, ${sc.q}.`,
        `갚아야 할 ${f(d.enmity, '은원')}, 펼쳐선 안 될 ${f(d.taboo, '금기무공')}.`,
        `마지막 한 수가 가르는 ${f(d.twist, '반전')} — 당신이 본 강호는 모두 거짓이었다.`,
        `— ${f(d.theme, '주제')}.`,
      ].join(' ')
    },
  },
  {
    name: '구조 개요형',
    hint: '제출용 트리트먼트처럼 항목별로 정리',
    build: (d) => {
      const lin = LINEAGES.find((l) => l.key === d.lineage)!
      const sc = SCALES.find((s) => s.key === d.scale)!
      return [
        `[계보] ${lin.label} · ${lin.root}`,
        `[축] ${sc.label} — ${sc.q}`,
        `[발단] ${f(d.hero, '주인공')} (${f(d.heroStart, '출발 처지')}) · ${f(d.sect, '사문·문파')}`,
        `[기연] ${f(d.destiny, '기연')} → ${f(d.art, '신공')} (대가: ${f(d.destinyCost, '대가·제약')})`,
        `[은원] ${f(d.enmity, '맺힌 원한')}`,
        `[적·흑막] ${foeLine(d.foes)}`,
        `[금기·대가] ${f(d.taboo, '금기무공·마공')}`,
        `[중반 최저점] ${f(d.trial, '배신·주화입마·정체 폭로')}`,
        `[반전] ${f(d.twist, '정체·혈연 반전')}`,
        `[귀결] ${f(d.resolution, '천하제일·귀은·비극적 승리')}`,
        `[주제] ${f(d.theme, '협의·은원·대가')}`,
      ].join('\n')
    },
  },
]

// ---------- 무작위 영감 풀(무협 특화·구체적) ----------
// 각 풀은 빈 칸을 채우는 영감용. 조합수 표기에도 사용.
const START_POOL = [
  '문파에서 무재(無才)로 천대받는 막내 제자',
  '멸문한 명문세가의 유일한 생존자',
  '단전이 폐해져 폐인 취급받는 전대고수의 손자',
  '표국의 말단 표사로 굴러먹던 떠돌이',
  '기루 뒷마당에서 자란 이름 없는 고아',
  '주화입마로 미친 사부를 모시는 마지막 제자',
  '죄인의 핏줄로 낙인찍혀 변방으로 쫓겨난 자',
  '천형(天刑)의 절맥을 타고나 단명할 운명의 소년',
  '관(官)에 쫓기다 강호로 숨어든 전직 포두',
]
const DESTINY_POOL = [
  '절벽에서 추락해 떨어진 비동(秘洞)에서 마주한 전대 검선의 유해와 심법서',
  '죽어가는 절대고수가 마지막 숨으로 전한 평생의 무공과 유지',
  '단숨에 막대한 내공을 안겨준 만년하수오와 영물의 내단',
  '실은 만맥(萬脈)을 품은 특이체질로 드러난, 폐기된 줄 알았던 단전',
  '공동의 벽화에 새겨져 우연히 해독해 낸 잊혀진 신공의 구결',
  '적의 암습으로 본의 아니게 몸에 깃든 천마의 봉인된 심법',
  '검총(劍塚)에서 한 번에 깨우친 역대 검수들의 검의(劍意)',
  '죽기 직전의 중독을 만독불침의 체질로 거듭나게 한 기연의 독',
  '입적하는 노승이 송두리째 물려준 평생의 불문 내공',
  '강물에 떠내려온 옥함 속 비급과 정체불명의 호신 영약',
]
const COST_POOL = [
  '구결을 한 단계만 잘못 운용해도 주화입마로 폐인이 될 위험',
  '내공을 쓸수록 수명이 깎여 나가는 금단의 대가',
  '강해질수록 이성과 인간성을 잃게 하는, 깃든 심마(心魔)',
  '몸을 잠식해 주기적으로 발작을 일으키는 음한지기의 고통',
  '신공이 완성되기 전까지 적에게 내력의 약점을 들킬 치명적 공백',
  '펼칠 때마다 정인(情人)이나 동료의 생기를 빨아들이는 업보',
  '절반만 얻은 구결 — 나머지를 찾지 못하면 내력이 역류하는 죽음의 시한',
  '극성에 이를수록 짙어져 무고한 이마저 베고 싶게 하는 살기(殺氣)',
  '펼친 뒤엔 며칠씩 시력·청력을 앗아가는 후유증',
]
const ART_POOL = [
  '천하를 가른다는 잊혀진 신공(神功), 강기(罡氣)로 검기를 압도한다',
  '한 초식에 만 가지 변화를 담은 무형(無形)의 검법',
  '역린(逆鱗)의 도법 — 한 번 뽑으면 적이든 자신이든 베어야 끝난다',
  '기경팔맥을 모두 뚫어 내력이 마르지 않는 무상심법(無上心法)',
  '상대의 내공을 흡수해 자신의 것으로 만드는 흡성(吸星)의 절기',
  '죽은 듯 멈춰 적의 살초를 흘려보내는 이형환위의 보법',
  '눈 위를 밟아도 자취가 없는 답설무흔(踏雪無痕)의 경공',
  '점혈(點穴) 한 수로 고수의 전신을 굳혀버리는 지법(指法)',
  '검기를 검강(劍罡)으로 승화시켜 십 장 밖의 적을 베는 어검(御劍)의 경지',
]
const ENMITY_POOL = [
  '사문을 하룻밤에 몰살한 복면 고수에게 갚을 피의 빚',
  '가문을 멸문시키고 가보(家寶)를 빼앗은 정파 명숙(名宿)에 대한 원한',
  '누명을 씌워 사부를 폐인으로 만든 동문 사형에 대한 복수',
  '어린 시절 자신을 노예로 팔아넘긴 흑도 살막(殺幕)과의 악연',
  '강호 전체가 외면한, 억울하게 사도(邪道)로 몰린 어머니의 명예',
  '약혼자를 빼앗고 표국을 불사른 권문세가에 갚을 한',
  '한 마을을 도륙한 새외 마두에게 진 핏빛 빚',
  '죽기 전 사부가 남긴, 반드시 갚으라던 강호의 묵은 원한',
  '의형제를 배신해 등 뒤에서 칼을 꽂은 옛 동료에게 갚을 원한',
  '집안의 비전 무공을 훔쳐 달아난 식객(食客)에게 받아낼 빚',
]
const TABOO_POOL = [
  '흡성대법 — 적의 내공을 강탈하나 주화입마와 광기를 부른다',
  '반탄지력의 금기 — 이기되 단전이 부서지는 동귀어진(同歸於盡)의 한 수',
  '화공(化功) — 무공을 폐하는 마공이나 시전자도 수명을 태운다',
  '천마신공 최후 구결 — 천하무적이나 사람의 마음을 잃는다',
  '혈도(血刀)의 살초 — 한 번 펼치면 핏빛 광증에서 깨어나기 어렵다',
  '환골탈태의 역공(逆功) — 새 몸을 얻되 십 년 수명을 바쳐야 한다',
  '금단의 합벽쌍수 — 두 사람의 내공을 합치나 하나는 반드시 폐인이 된다',
  '대라전이대법 — 적의 무공을 되돌려주나 자신의 경맥도 함께 끊긴다',
  '환마심공 — 적을 환각에 가두나 시전자도 현실과 환상을 분간하지 못하게 된다',
  '소혼대법 — 단숨에 적의 정신을 무너뜨리나 자신의 기억도 한 조각씩 잃는다',
]
const TRIAL_POOL = [
  '가장 믿었던 동료가 적의 첩자였음이 드러나며 빠지는 함정',
  '무리한 운기로 주화입마에 들어 단전이 역류하는 위기',
  '숨겨온 마교 후예의 정체가 폭로되어 강호 공적(公敵)이 되는 추락',
  '구해야 할 정인이 적의 손에 인질로 잡혀 무공마저 봉인당하는 절체절명',
  '스승의 죽음이 실은 자신을 위한 희생이었음을 뒤늦게 깨닫는 회한',
  '독계(毒計)에 당해 내공을 모두 잃고 처음부터 다시 일어서야 하는 좌절',
  '구파의 누명을 쓰고 추격당하며 동료들마저 등을 돌리는 고립',
  '심마에 사로잡혀 자기 손으로 아끼던 이를 해칠 뻔한 위기',
  '적의 거짓 정보에 속아 무고한 협객을 베고 강호의 지탄을 한 몸에 받는 오판',
  '결정적 순간에 신공이 미완임이 드러나 적 앞에서 내력이 흩어지는 파국',
]
const TWIST_POOL = [
  '평생 좇던 원수가 실은 자신을 지키려 악역을 자처한 사부였다',
  '최종 흑막이 헤어진 혈육(친형/생부)이었음이 결투 중 밝혀진다',
  '주인공이 익힌 신공의 진짜 주인이 바로 자기 자신의 전생이었다',
  '정파의 수호자라 믿은 무림맹주가 마교 침공의 설계자였다',
  '죽은 줄 알았던 사매가 다른 이름으로 적진 한복판에 살아 있었다',
  '자신을 거둔 은인이 곧 사문을 멸한 장본인이었다',
  '강호가 좇던 절세비급이 실은 봉인을 푸는 가짜 미끼였다',
  '주인공이 정파라 믿은 출신이 사실 마교의 마지막 핏줄이었다',
  '평생 지켜온 사문이 실은 강호를 속여 온 거대한 음모의 본거지였다',
  '주인공이 익힌 신공이 사실 흑막을 봉인하기 위한 마지막 열쇠였다',
]
const RESOLUTION_POOL = [
  '천하제일인의 자리에 오르지만 모든 것을 내려놓고 강호를 떠나 귀은(歸隱)한다',
  '금기무공의 대가로 단전이 부서진 채, 이기고도 폐인이 되어 산으로 든다',
  '정사대전을 끝내고 새 무림의 질서를 세운 뒤 정인과 함께 자취를 감춘다',
  '원수를 베는 대신 용서하여 은원의 사슬을 스스로 끊는다',
  '천마를 봉인하며 수명을 모두 태워, 강호를 구하고 조용히 스러진다',
  '무림맹주의 자리를 마다하고 한 자루 검만 들고 다시 강호를 떠돈다',
  '정과 사의 경계를 허문 새로운 도(道)를 세워 후학을 기른다',
  '복수를 이루나 그 자리에 남은 공허를 안고 속세를 등진다',
  '강호의 패권 다툼에서 물러나 작은 의원(醫院)을 열고 백성을 돌본다',
  '제자에게 검과 유지를 모두 물려주고 자신은 이름 없이 강호에서 사라진다',
]
const THEME_POOL = [
  '은혜는 반드시 갚고 원한도 반드시 갚되, 그 끝에서 협(俠)은 무엇으로 남는가',
  '강해지는 일과 인간으로 남는 일은 어디서 갈라지는가',
  '협의 큰 뜻(俠之大者)은 결국 위국위민(爲國爲民)에 닿는다',
  '복수는 원한을 풀어주지 않으며, 진짜 자유는 사슬을 놓는 데서 온다',
  '천하제일의 무공보다 무거운 것은 한 사람을 지키려는 마음이다',
  '정(正)과 사(邪)를 가르는 것은 무공이 아니라 그것을 쓰는 마음이다',
  '강호의 의(義)는 입으로 외치는 자가 아니라 묵묵히 지키는 자의 것이다',
  '운명에 끌려가는가, 운명을 베는가 — 검은 그 물음에 답하는 도구다',
  '진정한 강함은 적을 꺾는 힘이 아니라 자신을 다스리는 마음에서 나온다',
  '용서와 복수의 갈림길에서, 검을 거두는 손이 가장 무겁다',
]

// 적(흑막) 영감 — 이름·위계·음모를 한 묶음으로.
const FOE_POOL: { name: string; position: string; scheme: string }[] = [
  { name: '혈마(血魔)', position: '천마신교 교주', scheme: '강호 전체를 마교의 발 아래 두려 정사대전을 도발한다' },
  { name: '독고세가', position: '사도련 맹주', scheme: '비급을 강탈해 천하제일의 무력을 독점하려 한다' },
  { name: '검귀(劍鬼)', position: '새외(塞外) 절세고수', scheme: '중원 구파를 차례로 멸하며 검의 정점을 시험한다' },
  { name: '백면귀공자', position: '암살조직 살막주', scheme: '강호 명숙들을 은밀히 제거해 권력의 공백을 만든다' },
  { name: '천독노조', position: '사천당문 배신자', scheme: '만독으로 무림맹 수뇌를 한자리에서 몰살하려 한다' },
  { name: '무영(無影)', position: '얼굴 없는 흑막', scheme: '정파의 탈을 쓰고 강호를 뒤에서 조종해 왔다' },
  { name: '빙백노조(氷魄老祖)', position: '북해빙궁 궁주', scheme: '빙공으로 중원을 얼려 새외의 패권을 중원에 세우려 한다' },
  { name: '소면나찰(笑面羅刹)', position: '녹림 십팔채 총표파자', scheme: '관(官)과 결탁해 표국과 상단을 장악하려 한다' },
  { name: '귀곡자(鬼谷子)', position: '제갈세가를 노리는 진법 마인', scheme: '기문진을 풀어 무림맹 본단을 산 채로 가두려 한다' },
  { name: '천면랑군(千面郎君)', position: '역용술의 대가', scheme: '명숙들의 얼굴로 위장해 강호에 불신과 분열을 퍼뜨린다' },
  { name: '광검(狂劍)', position: '폐관에서 풀려난 전대 마검사', scheme: '천하제일을 가리는 비무에 강호 고수를 모아 모조리 베려 한다' },
  { name: '음양노조(陰陽老祖)', position: '사파 연합 배후의 책사', scheme: '정파와 사파를 이간질해 양쪽을 모두 소진시킨 뒤 강호를 거머쥔다' },
]

const SECT_POOL = [
  '소림(少林)', '무당(武當)', '화산(華山)', '아미(峨嵋)', '곤륜(崑崙)',
  '점창(點蒼)', '청성(靑城)', '종남(終南)', '공동(崆峒)', '개방(丐幇)',
  '남궁세가(검)', '사천당문(암기·독)', '제갈세가(진법)', '모용세가', '황보세가',
  '하북팽가(도)', '산동악가(창)', '천산파(天山派)',
]

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

// ---------- 조합수 계산(영감 슬롯 풀 기준) ----------
// 각 슬롯은 고유 항목만 한 개씩 곱한다(중복으로 부풀리지 않음). 적(흑막)도 FOE_POOL에서 한 세력만 뽑는다.
// = 슬롯 풀 크기의 순수 곱집합 = 100조 단위.
function combos(): number {
  const base =
    START_POOL.length *
    DESTINY_POOL.length *
    COST_POOL.length *
    ART_POOL.length *
    ENMITY_POOL.length *
    TABOO_POOL.length *
    TRIAL_POOL.length *
    TWIST_POOL.length *
    RESOLUTION_POOL.length *
    THEME_POOL.length *
    SECT_POOL.length *
    FOE_POOL.length
  // 종합 틀·계보·규모 선택도 결과를 바꾸므로 곱한다.
  return base * TEMPLATES.length * LINEAGES.length * SCALES.length
}
function fmtCombo(n: number): string {
  // 한국어 단위(만·억·조)로 가독성 있게.
  if (n >= 1e12) return (n / 1e12).toFixed(n >= 1e13 ? 0 : 1).replace(/\.0$/, '') + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, '') + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, '') + '만'
  return String(n)
}

// ---------- 저장 항목 ----------
interface Saved {
  id: string
  title: string
  draft: Draft
  text: string
  createdAt: number
}

function newId(prefix = 's'): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return prefix + '_' + crypto.randomUUID() } catch { /* noop */ }
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const blankFoe = (): Foe => ({ id: newId('f'), name: '', position: '', scheme: '' })

function blankDraft(): Draft {
  return {
    hero: '', heroStart: '', destiny: '', destinyCost: '',
    sect: '', art: '', enmity: '',
    foes: [blankFoe()],
    taboo: '', trial: '', twist: '', resolution: '', theme: '',
    lineage: 'jinyong', scale: 'gwiwon', tpl: 0,
  }
}

const LINEAGE_KEYS: LineageKey[] = ['jinyong', 'gulong', 'sinmuhyeop', 'webnovel']
const SCALE_KEYS: ScaleKey[] = ['gwiwon', 'munpa', 'jeongsa', 'cheonha', 'seonhyeop']

function normFoe(x: unknown): Foe {
  const o = (x || {}) as Partial<Foe>
  return {
    id: typeof o.id === 'string' ? o.id : newId('f'),
    name: typeof o.name === 'string' ? o.name : '',
    position: typeof o.position === 'string' ? o.position : '',
    scheme: typeof o.scheme === 'string' ? o.scheme : '',
  }
}

function normDraft(x: unknown): Draft {
  const o = (x || {}) as Partial<Draft>
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const foes = Array.isArray(o.foes) && o.foes.length ? o.foes.map(normFoe) : [blankFoe()]
  return {
    hero: str(o.hero), heroStart: str(o.heroStart),
    destiny: str(o.destiny), destinyCost: str(o.destinyCost),
    sect: str(o.sect), art: str(o.art), enmity: str(o.enmity),
    foes,
    taboo: str(o.taboo), trial: str(o.trial), twist: str(o.twist),
    resolution: str(o.resolution), theme: str(o.theme),
    lineage: LINEAGE_KEYS.includes(o.lineage as LineageKey) ? (o.lineage as LineageKey) : 'jinyong',
    scale: SCALE_KEYS.includes(o.scale as ScaleKey) ? (o.scale as ScaleKey) : 'gwiwon',
    tpl: Number.isFinite(o.tpl) && (o.tpl as number) >= 0 && (o.tpl as number) < TEMPLATES.length ? (o.tpl as number) : 0,
  }
}

function loadState(): { cur: Draft; saved: Saved[] } {
  try {
    const raw = localStorage.getItem(LS)
    if (!raw) return { cur: blankDraft(), saved: [] }
    const p = JSON.parse(raw)
    const cur = normDraft(p?.cur)
    const saved: Saved[] = Array.isArray(p?.saved)
      ? p.saved.filter((s: unknown) => s && typeof (s as Saved).text === 'string').map((s: Saved) => ({
          id: String(s.id || newId()),
          title: String(s.title || ''),
          draft: normDraft(s.draft),
          text: String(s.text || ''),
          createdAt: Number.isFinite(s.createdAt) ? s.createdAt : Date.now(),
        }))
      : []
    return { cur, saved }
  } catch {
    return { cur: blankDraft(), saved: [] }
  }
}

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function foeDetailHtml(fs: Foe[]): string {
  const named = fs.filter((x) => x.name.trim() || x.position.trim() || x.scheme.trim())
  if (!named.length) return ''
  const items = named.map((x) => {
    const parts: string[] = []
    if (x.position.trim()) parts.push(`위계: ${escHtml(x.position.trim())}`)
    if (x.scheme.trim()) parts.push(`음모: ${escHtml(x.scheme.trim())}`)
    return `<li><b>${escHtml(x.name.trim() || '이름 미정')}</b>${parts.length ? ' — ' + parts.join(' · ') : ''}</li>`
  }).join('')
  return `<p><b>적·흑막</b></p><ul>${items}</ul>`
}

// 본문 HTML(프로젝트 문서용) — 시놉시스 + 항목별 정리.
function bodyHtmlOf(d: Draft, text: string): string {
  const lin = LINEAGES.find((l) => l.key === d.lineage)!
  const sc = SCALES.find((s) => s.key === d.scale)!
  const row = (label: string, v: string) => (v && v.trim() ? `<p><b>${escHtml(label)}:</b> ${escHtml(v.trim())}</p>` : '')
  const paras = text.split('\n').filter(Boolean).map((p) => `<p>${escHtml(p)}</p>`).join('')
  return [
    `<p><b>계보:</b> ${escHtml(lin.label)} (${escHtml(lin.root)})</p>`,
    `<p><b>갈등 축:</b> ${escHtml(sc.label)} — ${escHtml(sc.q)}</p>`,
    `<hr/>`,
    `<p style="font-size:14px;line-height:1.7;"><b>시놉시스</b></p>`,
    paras,
    `<hr/>`,
    row('주인공', d.hero),
    row('출발 처지', d.heroStart),
    row('기연', d.destiny),
    row('기연의 대가·제약', d.destinyCost),
    row('사문·문파', d.sect),
    row('상승무공·신공', d.art),
    row('은원(맺힌 원한)', d.enmity),
    foeDetailHtml(d.foes),
    row('금기무공·대가', d.taboo),
    row('중반 최저점(시련)', d.trial),
    row('반전', d.twist),
    row('귀결', d.resolution),
    row('주제', d.theme),
  ].filter(Boolean).join('')
}

export default function WuxiaSynopsis({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [cur, setCur] = useState<Draft>(init.current.cur)
  const [saved, setSaved] = useState<Saved[]>(init.current.saved)
  const [title, setTitle] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [copied, setCopied] = useState('')
  const [note, setNote] = useState('')

  const mounted = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const COMBOS = useRef(combos())

  // payload.genre 활용 — 무협 맥락으로 진입 시 안내(빈 입력일 때만).
  useEffect(() => {
    mounted.current = true
    try {
      const g = payload && typeof payload.genre === 'string' ? (payload.genre as string) : ''
      const seed = payload && typeof payload.seed === 'string' ? (payload.seed as string) : ''
      const isEmpty = !init.current.cur.hero && !init.current.cur.destiny && !init.current.cur.enmity
      if (seed && isEmpty) {
        setCur((p) => ({ ...p, hero: p.hero || seed }))
        flashNote(`${J(`‘${seed}’`, '을')} 주인공으로 가져왔습니다. 🎲 영감으로 강호를 채워보세요.`)
      } else if (g && isEmpty) {
        flashNote(`‘${g}’ 맥락으로 시작합니다. 칸을 채우거나 🎲 영감으로 강호를 받아보세요.`)
      }
    } catch { /* noop */ }
    return () => {
      mounted.current = false
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS, JSON.stringify({ cur, saved }))
    } catch {
      if (mounted.current) flashNote('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.')
    }
  }, [cur, saved])

  const flashNote = (msg: string) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2800)
  }
  const flashCopied = (tag: string) => {
    setCopied(tag)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => { if (mounted.current) setCopied('') }, 1500)
  }

  const setField = <K extends keyof Draft>(k: K, v: Draft[K]) => setCur((p) => ({ ...p, [k]: v }))

  const text = TEMPLATES[cur.tpl].build(cur)

  const hasInput = !!(
    cur.hero || cur.heroStart || cur.destiny || cur.sect || cur.art || cur.enmity ||
    cur.taboo || cur.trial || cur.twist || cur.resolution || cur.theme ||
    cur.foes.some((x) => x.name || x.position || x.scheme)
  )

  // ---- 적(흑막) CRUD ----
  const addFoe = () => setCur((p) => ({ ...p, foes: [...p.foes, blankFoe()] }))
  const removeFoe = (id: string) => setCur((p) => ({ ...p, foes: p.foes.length > 1 ? p.foes.filter((x) => x.id !== id) : p.foes }))
  const setFoe = (id: string, k: keyof Foe, v: string) =>
    setCur((p) => ({ ...p, foes: p.foes.map((x) => (x.id === id ? { ...x, [k]: v } : x)) }))
  const moveFoe = (id: string, dir: -1 | 1) =>
    setCur((p) => {
      const i = p.foes.findIndex((x) => x.id === id)
      if (i < 0) return p
      const j = i + dir
      if (j < 0 || j >= p.foes.length) return p
      const a = p.foes.slice()
      ;[a[i], a[j]] = [a[j], a[i]]
      return { ...p, foes: a }
    })

  // ---- 영감(무작위 채움) — 빈 칸만 채운다 ----
  const inspire = () => {
    setCur((p) => {
      const foe = pick(FOE_POOL)
      const foes = p.foes.some((x) => x.name.trim() || x.position.trim() || x.scheme.trim())
        ? p.foes
        : [{ id: newId('f'), name: foe.name, position: foe.position, scheme: foe.scheme }]
      return {
        ...p,
        heroStart: p.heroStart || pick(START_POOL),
        destiny: p.destiny || pick(DESTINY_POOL),
        destinyCost: p.destinyCost || pick(COST_POOL),
        sect: p.sect || pick(SECT_POOL),
        art: p.art || pick(ART_POOL),
        enmity: p.enmity || pick(ENMITY_POOL),
        taboo: p.taboo || pick(TABOO_POOL),
        trial: p.trial || pick(TRIAL_POOL),
        twist: p.twist || pick(TWIST_POOL),
        resolution: p.resolution || pick(RESOLUTION_POOL),
        theme: p.theme || pick(THEME_POOL),
        foes,
      }
    })
    flashNote('빈 칸에 무협 영감을 채웠습니다. 마음대로 고쳐 쓰세요.')
  }

  // ---- 전체 재생성(잠금 개념 없이, 빈 칸 우선 채우되 전체 굴림) ----
  const reroll = () => {
    const foe = pick(FOE_POOL)
    setCur((p) => ({
      ...p,
      heroStart: pick(START_POOL),
      destiny: pick(DESTINY_POOL),
      destinyCost: pick(COST_POOL),
      sect: pick(SECT_POOL),
      art: pick(ART_POOL),
      enmity: pick(ENMITY_POOL),
      taboo: pick(TABOO_POOL),
      trial: pick(TRIAL_POOL),
      twist: pick(TWIST_POOL),
      resolution: pick(RESOLUTION_POOL),
      theme: pick(THEME_POOL),
      foes: [{ id: newId('f'), name: foe.name, position: foe.position, scheme: foe.scheme }],
    }))
    flashNote('강호 한 판을 새로 굴렸습니다. (주인공 이름은 직접 지어주세요)')
  }

  const copy = async (txt: string, tag: string) => {
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(txt)
      else throw new Error('no clipboard')
      flashCopied(tag)
    } catch {
      flashNote('복사에 실패했습니다. 직접 선택해 복사하세요.')
    }
  }

  const saveCurrent = () => {
    const rec: Saved = {
      id: editId || newId(),
      title: title.trim() || (cur.hero.trim() ? `${cur.hero.trim()}의 강호록` : '제목 없는 무협 시놉시스'),
      draft: cur,
      text,
      createdAt: Date.now(),
    }
    if (editId) {
      setSaved((p) => p.map((s) => (s.id === editId ? { ...rec, createdAt: s.createdAt } : s)))
      flashNote('수정했습니다.')
    } else {
      setSaved((p) => [rec, ...p])
      flashNote('무협 시놉시스를 저장했습니다.')
    }
    setEditId(null)
    setTitle('')
  }

  const loadSaved = (s: Saved) => {
    setCur(normDraft(s.draft))
    setTitle(s.title)
    setEditId(s.id)
    flashNote('불러왔습니다. 수정 후 저장하면 갱신됩니다.')
  }
  const removeSaved = (id: string) => {
    setSaved((p) => p.filter((s) => s.id !== id))
    if (editId === id) { setEditId(null); setTitle('') }
  }
  const moveSaved = (id: string, dir: -1 | 1) =>
    setSaved((p) => {
      const i = p.findIndex((s) => s.id === id)
      if (i < 0) return p
      const j = i + dir
      if (j < 0 || j >= p.length) return p
      const a = p.slice()
      ;[a[i], a[j]] = [a[j], a[i]]
      return a
    })

  const clearForm = () => {
    setCur((p) => ({ ...blankDraft(), lineage: p.lineage, scale: p.scale, tpl: p.tpl }))
    setEditId(null)
    setTitle('')
    flashNote('입력을 비웠습니다.')
  }

  // ---- 연계: 프로젝트 기획 폴더에 시놉시스 문서 추가 ----
  const toProject = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const lin = LINEAGES.find((l) => l.key === cur.lineage)!
    const sc = SCALES.find((s) => s.key === cur.scale)!
    const docTitle = (title.trim() || (cur.hero.trim() ? `${cur.hero.trim()}의 강호록` : '무협 시놉시스'))
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '기획',
      title: `시놉시스 — ${docTitle}`,
      bodyHtml: bodyHtmlOf(cur, text),
      synopsis: trimDot(text.split('\n')[0] || '').slice(0, 120),
      meta: { 장르: '무협', 계보: lin.label, 갈등축: sc.label, 틀: TEMPLATES[cur.tpl].name },
    })
    flashNote(id ? '프로젝트 자료 〈기획〉 폴더에 시놉시스 문서를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 연계: 글감 보관함에 스니펫 저장 ----
  const toLibrary = () => {
    addToLibrary('snippets', {
      text,
      source: '무협 시놉시스 빌더',
      tags: ['시놉시스', '무협', LINEAGES.find((l) => l.key === cur.lineage)!.label, SCALES.find((s) => s.key === cur.scale)!.label],
    })
    flashNote('생성한 시놉시스를 글감 보관함에 저장했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }
  const fieldLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }
  const input: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const twoRow: React.CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap' }
  const col: React.CSSProperties = { flex: 1, minWidth: 200 }
  const synBox: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 12, padding: '14px 16px', fontSize: 14.5, lineHeight: 1.85, color: 'var(--text)', wordBreak: 'keep-all', whiteSpace: 'pre-wrap' }
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '6px 11px', fontSize: 12.5, borderRadius: 999, cursor: 'pointer',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'var(--accent)' : 'var(--chrome-2)',
    color: active ? '#fff' : 'var(--text)', whiteSpace: 'nowrap',
  })
  const tplBtn = (active: boolean): React.CSSProperties => ({
    textAlign: 'left', padding: '8px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 12.5,
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'rgba(0,0,0,0.04)' : 'var(--chrome-2)',
    color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 2,
  })
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '4px 7px', borderRadius: 7 }
  const savedRow: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }
  const emptyBox: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '18px 10px', border: '1px dashed var(--border)', borderRadius: 10 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }

  const Field = ({ k, label, ph, ml, area }: { k: keyof Draft; label: string; ph: string; ml?: number; area?: boolean }) => (
    <div>
      <label style={fieldLabel}>{label}</label>
      {area ? (
        <textarea style={{ ...input, resize: 'vertical', minHeight: 56 }} value={cur[k] as string}
          onChange={(e) => setField(k, e.target.value as never)} placeholder={ph} maxLength={ml || 220} rows={2} />
      ) : (
        <input style={input} value={cur[k] as string} onChange={(e) => setField(k, e.target.value as never)} placeholder={ph} maxLength={ml || 160} />
      )}
    </div>
  )

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="⚔️" /> 무협 시놉시스 빌더</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>기연·은원·신공·흑막 → 무협 시놉시스</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="minibtn" onClick={inspire} title="빈 칸에 무작위 무협 영감 채우기"><Emoji e="🎲" /> 영감</button>
          <button className="minibtn" onClick={reroll} title="강호 한 판을 통째로 새로 굴리기(주인공 이름 제외)"><Emoji e="🔁" /> 전체 재생성</button>
        </div>
      </div>

      <div style={body}>
        {note && (
          <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>{emojify(note)}</div>
        )}

        <div style={{ ...hint }}>
          <Emoji e="🎲" /> 슬롯 풀 무작위 조합으로 만들 수 있는 강호의 수 — 약 <b style={{ color: 'var(--accent)' }}>{fmtCombo(COMBOS.current)}</b> 가지
          <span style={{ marginLeft: 6, opacity: 0.8 }}>({COMBOS.current.toLocaleString()})</span>
        </div>

        {/* 유형 선택: 계보 + 갈등 축 */}
        <div style={card}>
          <h4 style={sectionTitle}>계보(문체 모드) · 갈등 축</h4>
          <div style={{ marginBottom: 10 }}>
            <span style={{ ...fieldLabel }}>계보 — 어느 대표작 결을 따를까</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {LINEAGES.map((l) => (
                <button key={l.key} onClick={() => setField('lineage', l.key)} style={chip(cur.lineage === l.key)} title={`${l.desc} · ${l.root}`}>{l.label}</button>
              ))}
            </div>
            <div style={{ ...hint, marginTop: 6 }}>{LINEAGES.find((l) => l.key === cur.lineage)!.desc}</div>
          </div>
          <div>
            <span style={{ ...fieldLabel }}>갈등 규모(서사 축)</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SCALES.map((s) => (
                <button key={s.key} onClick={() => setField('scale', s.key)} style={chip(cur.scale === s.key)} title={s.q}>{s.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* 입력 */}
        <div style={card}>
          <h4 style={sectionTitle}>{editId ? <><Emoji e="✏️" /> 수정 중</> : '구성 요소 입력'}</h4>
          <div style={{ ...twoRow, marginBottom: 10 }}>
            <div style={col}><Field k="hero" label="주인공" ph="예: 청풍검 한설" /></div>
            <div style={col}><Field k="heroStart" label="출발 처지 (약자의 시작)" ph="예: 문파에서 천대받는 무재(無才) 막내 제자" ml={180} /></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="destiny" label="기연(奇緣) — 성장의 트리거" ph="예: 절벽에서 추락한 비동에서 전대 검선의 심법서를 얻는다" ml={220} area />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="destinyCost" label="기연의 대가·제약 (필수 — 기연 남발 방지)" ph="예: 구결을 잘못 운용하면 주화입마로 폐인이 될 위험을 안는다" ml={200} />
          </div>
          <div style={{ ...twoRow, marginBottom: 10 }}>
            <div style={col}><Field k="sect" label="사문 · 문파" ph="예: 화산(華山) / 사천당문" /></div>
            <div style={col}><Field k="art" label="상승무공 · 신공(神功)" ph="예: 잊혀진 무형(無形)의 검법" ml={180} /></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="enmity" label="은원(恩怨) — 맺힌 원한" ph="예: 사문을 하룻밤에 몰살한 복면 고수에게 갚을 피의 빚" ml={200} />
          </div>

          {/* 적(흑막) CRUD */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ ...fieldLabel, margin: 0 }}>적 · 흑막 — {cur.foes.length}세력 (강호 위계·음모)</span>
              <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={addFoe}>＋ 적 추가</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cur.foes.map((x, i) => (
                <div key={x.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10, background: 'var(--chrome-2)' }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input style={{ ...input, flex: 1 }} value={x.name} onChange={(e) => setFoe(x.id, 'name', e.target.value)} placeholder={`적 ${i + 1} 이름·세력 (예: 혈마)`} maxLength={60} />
                    <button style={iconBtn} title="위로" onClick={() => moveFoe(x.id, -1)} disabled={i === 0}>▲</button>
                    <button style={iconBtn} title="아래로" onClick={() => moveFoe(x.id, 1)} disabled={i === cur.foes.length - 1}>▼</button>
                    <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeFoe(x.id)} disabled={cur.foes.length <= 1}><Emoji e="🗑️" /></button>
                  </div>
                  <div style={twoRow}>
                    <input style={{ ...input, flex: 1, minWidth: 150 }} value={x.position} onChange={(e) => setFoe(x.id, 'position', e.target.value)} placeholder="강호 위계 (예: 천마신교 교주)" maxLength={80} />
                    <input style={{ ...input, flex: 1.4, minWidth: 180 }} value={x.scheme} onChange={(e) => setFoe(x.id, 'scheme', e.target.value)} placeholder="음모·목적 (예: 정사대전을 도발해 강호를 삼킨다)" maxLength={140} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <Field k="taboo" label="금기무공 · 마공의 대가 (트레이드오프)" ph="예: 흡성대법 — 내공을 강탈하나 주화입마·광기를 부른다" ml={200} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="trial" label="중반 최저점 — 배신·주화입마·정체 폭로" ph="예: 가장 믿었던 동료가 적의 첩자였음이 드러나 함정에 빠진다" ml={200} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="twist" label="반전 — 정체·혈연·사부가 원수" ph="예: 평생 좇던 원수가 실은 자신을 지키려 악역을 자처한 사부였다" ml={220} area />
          </div>
          <div style={{ ...twoRow, marginBottom: 4 }}>
            <div style={col}><Field k="resolution" label="귀결 — 천하제일·귀은(歸隱)·비극적 승리" ph="예: 천하제일에 오르나 모든 것을 내려놓고 귀은한다" ml={200} /></div>
            <div style={col}><Field k="theme" label="주제 — 협의·은원·강함의 대가" ph="예: 강해지는 일과 인간으로 남는 일은 어디서 갈라지는가" ml={180} /></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="minibtn" onClick={clearForm} disabled={!hasInput && !editId}>입력 비우기</button>
          </div>
        </div>

        {/* 종합 틀 */}
        <div style={card}>
          <h4 style={sectionTitle}>시놉시스 틀 — {TEMPLATES.length}가지</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {TEMPLATES.map((t, i) => (
              <button key={t.name} onClick={() => setField('tpl', i)} style={tplBtn(cur.tpl === i)}>
                <b style={{ fontSize: 12.5, color: cur.tpl === i ? 'var(--accent)' : 'var(--text)' }}>{cur.tpl === i ? '● ' : '○ '}{t.name}</b>
                <span style={{ color: 'var(--muted)', fontSize: 11.5 }}>{t.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 결과 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>종합된 시놉시스 · {TEMPLATES[cur.tpl].name}</h4>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => copy(text, 'main')}>{copied === 'main' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
          </div>
          <div style={synBox}>{text}</div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <input style={{ ...input, flex: 1, minWidth: 180 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="저장 제목 (비우면 ‘OO의 강호록’으로 자동)" maxLength={60} />
            <button className="btn-primary" onClick={saveCurrent}>{editId ? '수정 저장' : <><Emoji e="💾" /> 저장</>}</button>
            {editId && <button className="minibtn" onClick={() => { setEditId(null); setTitle('') }}>새 항목으로</button>}
          </div>

          {/* 연계 버튼 */}
          <div className="linkbar" style={{ marginTop: 12, flexWrap: 'wrap' }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '현재 시놉시스를 프로젝트 자료 〈기획〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={toLibrary} title="생성한 시놉시스를 글감 보관함에 저장"><Emoji e="⭐" /> 글감 보관</button>
            <button className="linkbtn" onClick={() => openToolLinked('character-forge', { genre: '무협', seed: cur.hero })} title="주인공·흑막 캐릭터를 만들러 가기"><Emoji e="👤" /> 캐릭터 만들기</button>
            <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre: '무협' })} title="플롯 구조로 펼치기"><Emoji e="🔺" /> 플롯 구조</button>
            <button className="linkbtn" onClick={() => openToolLinked('conflict-builder', { genre: '무협' })} title="은원·갈등 설계로 이어가기"><Emoji e="⚔️" /> 갈등 설계</button>
          </div>
        </div>

        {/* 저장 목록(CRUD) */}
        <div style={card}>
          <h4 style={sectionTitle}>저장한 시놉시스 · {saved.length}건</h4>
          {saved.length === 0 ? (
            <div style={emptyBox}>
              아직 저장한 무협 시놉시스가 없습니다.<br />
              요소를 채우고 <b>저장</b>을 누르면 여기에 모입니다.<br />
              <span style={{ fontSize: 12 }}>막막하다면 상단의 <b><Emoji e="🎲" /> 영감</b> 또는 <b><Emoji e="🔁" /> 전체 재생성</b>으로 강호를 굴려보세요.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {saved.map((s, i) => (
                <div key={s.id} style={{ ...savedRow, border: '1px solid ' + (editId === s.id ? 'var(--accent)' : 'var(--border)') }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>{s.title || '(제목 없음)'}</b>
                    <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>
                      {LINEAGES.find((l) => l.key === s.draft.lineage)?.label || '계보'}
                    </span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                      <button style={iconBtn} title="위로" onClick={() => moveSaved(s.id, -1)} disabled={i === 0}>▲</button>
                      <button style={iconBtn} title="아래로" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1}>▼</button>
                      <button style={iconBtn} title="복사" onClick={() => copy(s.text, 'sv' + s.id)}>{copied === 'sv' + s.id ? '✓' : '복사'}</button>
                      <button style={iconBtn} title="불러와 수정" onClick={() => loadSaved(s)}><Emoji e="✏️" /></button>
                      <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeSaved(s.id)}><Emoji e="🗑️" /></button>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--muted)', wordBreak: 'keep-all', whiteSpace: 'pre-wrap', maxHeight: 88, overflow: 'hidden' }}>{s.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={hint}>
          무협 시놉시스는 “약자가 어떤 기연으로, 어떤 무공을, 어떤 대가로 얻어, 어떤 은원을 갚는가”를 한 호흡에 보여주는 설계도입니다.
          기연에는 반드시 <b>대가·제약</b>을, 금기무공에는 <b>트레이드오프</b>를 걸어 파워 인플레이션과 기연 남발을 피하세요. 입력·저장은 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
