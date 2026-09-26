// SF 시놉시스 빌더 — 전제(과학적 핵심)·무대·주인공·갈등·과학적 딜레마·결말 톤을 입력하면
// SF·과학소설 시놉시스를 여러 문체 틀로 종합한다. 하위장르(하드SF·스페이스오페라·사이버펑크 등)와
// 결말 톤을 고르면 그 결에 맞춘 도입문·전개·결구를 자동 조립한다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크 없음(전부 로컬·자작 데이터).
// 모든 입력/저장은 localStorage 'sry:tool:sf-synopsis' 에 JSON 으로 자동 저장·복원. 언마운트 시 타이머 정리.
// 연계: addToProject(folder:'기획', '시놉시스') 로 바인더에 문서 추가, addToLibrary('snippets', ...) 로 글감 보관,
//       openToolLinked 로 관련 도구(설정집·캐릭터·플롯 등) 열기.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'sf-synopsis',
  name: 'SF 시놉시스 빌더',
  icon: '🛸',
  group: '구조',
  genre: 'SF·과학소설',
  intro: '전제(과학적 핵심)·무대·주인공·갈등·과학적 딜레마·결말 톤을 입력하면 SF 시놉시스를 자동 종합합니다',
  w: 700,
  h: 640,
}

const LS = 'sry:tool:sf-synopsis'

// ---------- 타입 ----------
type SubKey = 'hard' | 'opera' | 'cyberpunk' | 'dystopia' | 'firstcontact' | 'timetravel' | 'postapoc' | 'biopunk'
type ToneKey = 'hopeful' | 'tragic' | 'ambiguous' | 'wonder' | 'cautionary' | 'cosmic'
type ScopeKey = 'near' | 'far' | 'altpresent' | 'altpast' | 'multiverse'

interface Draft {
  premise: string      // 전제(과학적 핵심) — 단 하나의 SF 가정(노붐)
  setting: string      // 무대(시간·장소·세계)
  scope: ScopeKey      // 시간 척도
  hero: string         // 주인공(누구)
  heroRole: string     // 주인공 입장·전문성·약점
  conflict: string     // 갈등(맞서는 힘)
  dilemma: string      // 과학적 딜레마(기술이 던지는 윤리·선택)
  cost: string         // 대가(딜레마의 무게에 걸린 것)
  theme: string        // 주제(질문)
  sub: SubKey
  tone: ToneKey
  tpl: number          // 선택한 종합 틀
}

// ---------- 하위장르 ----------
const SUBS: { key: SubKey; label: string; desc: string; tag: string }[] = [
  { key: 'hard', label: '하드 SF', desc: '과학적 엄밀성·외삽, 물리·공학의 논리', tag: '검증 가능한 과학' },
  { key: 'opera', label: '스페이스 오페라', desc: '광활한 우주·제국·함대, 모험과 스케일', tag: '은하적 무대' },
  { key: 'cyberpunk', label: '사이버펑크', desc: '하이테크·로우라이프, 기업 지배와 네트', tag: '네온과 그늘' },
  { key: 'dystopia', label: '디스토피아', desc: '통제 사회·감시·전체주의의 미래', tag: '체제의 그림자' },
  { key: 'firstcontact', label: '첫 접촉', desc: '외계 지성과의 만남·소통·오해', tag: '미지와의 대면' },
  { key: 'timetravel', label: '시간여행', desc: '인과·역설·운명 고쳐쓰기', tag: '시간의 역설' },
  { key: 'postapoc', label: '포스트아포칼립스', desc: '붕괴 이후의 생존과 재건', tag: '잿더미의 세계' },
  { key: 'biopunk', label: '바이오펑크', desc: '유전공학·생명조작·신체 변형', tag: '생명의 재설계' },
]
function subDef(k: SubKey) { return SUBS.find((s) => s.key === k) || SUBS[0] }

// ---------- 결말 톤 ----------
const TONES: { key: ToneKey; label: string; desc: string; close: string }[] = [
  { key: 'hopeful', label: '희망', desc: '대가를 치르되 빛을 향해 나아간다', close: '잿빛 끝에서도, 별을 향한 한 걸음은 멈추지 않는다.' },
  { key: 'tragic', label: '비극', desc: '되돌릴 수 없는 상실로 닫힌다', close: '구한 것보다 잃은 것이 더 무겁게 남는다.' },
  { key: 'ambiguous', label: '모호', desc: '답 대신 질문을 독자에게 넘긴다', close: '문은 닫히지 않고, 답은 독자의 손에 남겨진다.' },
  { key: 'wonder', label: '경이', desc: '인식의 지평이 확장되며 끝난다', close: '세계의 크기를 다시 알게 된 자에게, 끝은 곧 새로운 시작이다.' },
  { key: 'cautionary', label: '경고', desc: '우리가 갈 수도 있는 미래를 비춘다', close: '이것은 예언이 아니라, 아직 늦지 않은 경고다.' },
  { key: 'cosmic', label: '코스믹', desc: '인간의 왜소함·우주의 무관심 앞에 선다', close: '우주는 답하지 않는다 — 그 침묵 앞에서 인간만이 의미를 짓는다.' },
]
function toneDef(k: ToneKey) { return TONES.find((t) => t.key === k) || TONES[0] }

// ---------- 시간 척도 ----------
const SCOPES: { key: ScopeKey; label: string; phrase: string }[] = [
  { key: 'near', label: '근미래', phrase: '머지않은 미래' },
  { key: 'far', label: '먼 미래', phrase: '아득한 미래' },
  { key: 'altpresent', label: '대체 현재', phrase: '우리와 다른 지금' },
  { key: 'altpast', label: '대체 역사', phrase: '갈라진 과거의 한 줄기' },
  { key: 'multiverse', label: '다중우주', phrase: '겹쳐진 여러 세계' },
]
function scopeDef(k: ScopeKey) { return SCOPES.find((s) => s.key === k) || SCOPES[0] }

// 빈 칸은 자리표시자로 — 언제나 읽히는 문장을 만든다.
function f(s: string, ph: string): string {
  const t = (s || '').trim()
  return t || `〔${ph}〕`
}
// 문장 끝 마침표·온점 제거(문장 조립용)
function trim(s: string, ph: string): string {
  return f(s, ph).replace(/[.。!?]+$/, '')
}

// ---------- 한국어 조사 자동 선택 ----------
// 앞 글자(마지막 한글)의 받침 유무를 보고 실제 조사 하나를 골라 붙인다.
// 괄호 이중표기('을(를)' 등) 노출 금지 — 항상 단일 형태만 출력.
function hasJong(word: string): boolean {
  const w = (word || '').trim()
  if (!w) return false
  // 끝의 닫는 괄호·따옴표 등은 건너뛰고 마지막 '글자'를 찾는다.
  let i = w.length - 1
  while (i >= 0 && /[)\]〉》'"’”』」.\s]/.test(w[i])) i--
  if (i < 0) return false
  const ch = w[i]
  const code = ch.charCodeAt(0)
  // 한글 음절: 받침(종성) 인덱스가 0이면 받침 없음
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28
    // 종성이 'ㄹ'(8)인 경우 '으로/로' 처리에서 별도 취급
    return jong !== 0
  }
  // 숫자·영문 등은 발음 끝소리로 근사(자음으로 끝나는 대표값만 받침 있음으로 처리)
  if (/[0-9]/.test(ch)) {
    // 0,1,3,6,7,8 → 받침 있음('영','일','삼','육','칠','팔'); 2,4,5,9 → 없음
    return '013678'.includes(ch)
  }
  if (/[a-zA-Z]/.test(ch)) {
    // 알파벳 이름 끝 — 받침으로 끝나는 발음 대표(자음문자)만 받침 있음
    return !/[aeiouwy]/i.test(ch)
  }
  return false
}
// 'ㄹ' 받침 여부(으로/로 판단용)
function endsWithRieul(word: string): boolean {
  const w = (word || '').trim()
  let i = w.length - 1
  while (i >= 0 && /[)\]〉》'"’”』」.\s]/.test(w[i])) i--
  if (i < 0) return false
  const code = w[i].charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) return ((code - 0xac00) % 28) === 8
  return false
}
// 을/를
function josaEul(word: string): string { return f(word, '') ? word + (hasJong(word) ? '을' : '를') : word }
// 이/가
function josaIga(word: string): string { return word + (hasJong(word) ? '이' : '가') }
// 은/는
function josaEun(word: string): string { return word + (hasJong(word) ? '은' : '는') }
// 와/과
function josaWa(word: string): string { return word + (hasJong(word) ? '과' : '와') }
// 으로/로 (받침 없거나 'ㄹ' 받침이면 '로', 그 외 '으로')
function josaRo(word: string): string { return word + ((!hasJong(word) || endsWithRieul(word)) ? '로' : '으로') }

// ---------- 종합 틀(템플릿) ----------
interface Tpl { name: string; hint: string; build: (d: Draft) => string }

const TEMPLATES: Tpl[] = [
  {
    name: '표준 줄거리형',
    hint: '전제→세계→인물→딜레마→결말 톤 순의 정석 시놉시스',
    build: (d) => {
      const sub = subDef(d.sub); const tone = toneDef(d.tone); const sc = scopeDef(d.scope)
      const hero = trim(d.hero, '주인공'); const role = trim(d.heroRole, '주인공의 입장·전문성·약점')
      return [
        `${sc.phrase}, ${trim(d.setting, '무대')}. ${trim(d.premise, '전제(과학적 핵심)')} — 그 하나의 가정이 세계의 규칙을 바꾼다.`,
        `${josaEun(hero)} ${josaRo(role)}서 이 변화의 한복판에 선다.`,
        `그러나 ${josaIga(trim(d.conflict, '갈등(맞서는 힘)'))} 길을 가로막고, 곧 피할 수 없는 물음이 닥친다: ${trim(d.dilemma, '과학적 딜레마')}.`,
        `선택의 저울에는 ${josaIga(trim(d.cost, '대가(걸린 것)'))} 올라 있다.`,
        `결국 이 이야기는 ${josaEul(trim(d.theme, '주제'))} 묻는다. ${tone.close}`,
      ].join(' ')
    },
  },
  {
    name: '의문 제기형',
    hint: '“만약 ~라면?” 사고실험으로 독자의 호기심을 건다',
    build: (d) => {
      const sub = subDef(d.sub)
      return [
        `만약 ${josaIga(trim(d.premise, '전제(과학적 핵심)'))} 현실이 된다면?`,
        `${josaEul(trim(d.setting, '무대'))} 배경으로, ${sub.label}의 세계가 그 질문에 답하기 시작한다.`,
        `${josaEun(trim(d.hero, '주인공'))} ${trim(d.conflict, '갈등')} 앞에서 ${josaEul(trim(d.dilemma, '과학적 딜레마'))} 떠안는다.`,
        `여기서 잘못 디딘 한 걸음의 대가는 ${trim(d.cost, '대가')}.`,
        `답은 쉽지 않다 — 그래서 이 이야기는 ${josaEul(trim(d.theme, '주제'))} 향해 나아간다.`,
      ].join(' ')
    },
  },
  {
    name: '인물 중심형',
    hint: '주인공의 시선과 선택을 전면에 세운다',
    build: (d) => {
      const tone = toneDef(d.tone)
      const th = trim(d.theme, '주제')
      return [
        `${trim(d.hero, '주인공')} — ${trim(d.heroRole, '입장·전문성·약점')}.`,
        `${trim(d.setting, '무대')}에서, 그(녀)는 ${josaIga(trim(d.premise, '전제(과학적 핵심)'))} 빚어낸 세계를 마주한다.`,
        `${josaIga(trim(d.conflict, '갈등'))} 그(녀)를 시험하고, 마침내 누구도 대신 져줄 수 없는 결정이 다가온다: ${trim(d.dilemma, '과학적 딜레마')}.`,
        `무엇을 택하든 ${josaEul(trim(d.cost, '대가'))} 치러야 한다.`,
        `그 선택의 끝에서 드러나는 것은 ${th}${hasJong(th) ? '이다' : '다'}. ${tone.close}`,
      ].join(' ')
    },
  },
  {
    name: '세계관 중심형',
    hint: '세계의 규칙과 노붐(novum)을 먼저 세운다',
    build: (d) => {
      const sub = subDef(d.sub); const sc = scopeDef(d.scope)
      const th = trim(d.theme, '주제')
      return [
        `${sc.phrase}의 ${trim(d.setting, '무대')} — ${sub.desc}.`,
        `이 세계를 떠받치는 단 하나의 전제: ${trim(d.premise, '전제(과학적 핵심)')}.`,
        `그 규칙이 낳은 균열 위로 ${josaIga(trim(d.conflict, '갈등'))} 번지고, ${josaIga(trim(d.hero, '주인공'))} 그 한가운데로 끌려든다.`,
        `세계가 던지는 질문은 날카롭다: ${trim(d.dilemma, '과학적 딜레마')} — 답을 미루면 ${josaIga(trim(d.cost, '대가'))} 다가온다.`,
        `결국 이 세계가 비추는 것은 ${th}${hasJong(th) ? '이다' : '다'}.`,
      ].join(' ')
    },
  },
  {
    name: '뒤표지(블러브)형',
    hint: '책 뒤표지 홍보문구처럼 압축·자극적으로',
    build: (d) => {
      return [
        `${trim(d.premise, '전제(과학적 핵심)')}.`,
        `${trim(d.setting, '무대')}에서 ${josaEun(trim(d.hero, '주인공'))} 결코 평범한 하루를 보낼 수 없다.`,
        `${josaIga(trim(d.conflict, '갈등'))} 모든 것을 무너뜨리려 할 때, 그(녀) 앞에 놓이는 단 하나의 질문 — ${trim(d.dilemma, '과학적 딜레마')}.`,
        `대답의 값은 ${trim(d.cost, '대가')}. 마지막 페이지를 덮기 전, 당신도 묻게 된다: ${trim(d.theme, '주제')}.`,
      ].join(' ')
    },
  },
  {
    name: '사고실험 로그라인형',
    hint: '한두 문장 로그라인으로 핵심만 압축',
    build: (d) => {
      const sub = subDef(d.sub)
      return [
        `[${sub.label}] ${josaIga(trim(d.premise, '전제(과학적 핵심)'))} 가능해진 ${trim(d.setting, '무대')}에서, ${josaEun(trim(d.hero, '주인공'))} ${trim(d.conflict, '갈등')}에 맞서 ${josaEul(trim(d.dilemma, '과학적 딜레마'))} 두고 ${josaEul(trim(d.cost, '대가'))} 건 선택을 해야 한다.`,
        `— 결국 묻는 것은 ${trim(d.theme, '주제')}.`,
      ].join(' ')
    },
  },
  {
    name: '구조 개요형',
    hint: '제출용 트리트먼트처럼 항목별로 정리',
    build: (d) => {
      const sub = subDef(d.sub); const tone = toneDef(d.tone); const sc = scopeDef(d.scope)
      return [
        `[하위장르] ${sub.label} · ${sc.label} · 결말 톤: ${tone.label}`,
        `[전제(노붐)] ${f(d.premise, '전제(과학적 핵심)')}`,
        `[무대] ${f(d.setting, '무대')}`,
        `[주인공] ${f(d.hero, '주인공')} (${f(d.heroRole, '입장·전문성·약점')})`,
        `[갈등] ${f(d.conflict, '갈등')}`,
        `[과학적 딜레마] ${f(d.dilemma, '과학적 딜레마')}`,
        `[대가] ${f(d.cost, '대가')}`,
        `[주제] ${f(d.theme, '주제')}`,
      ].join('\n')
    },
  },
]

// ---------- 영감 풀(무작위 채움) ----------
const PREMISE_POOL = [
  '죽은 이의 기억을 칩으로 복원해 재생할 수 있게 되었다',
  '인류가 의식을 클라우드에 업로드해 디지털 불멸을 얻었다',
  '광속의 99%로 항해하는 세대우주선이 목적지를 잃었다',
  '꿈을 녹화·편집·거래하는 기술이 상용화되었다',
  '특정 확률로 미래의 한 순간을 미리 보는 양자 단말이 보급되었다',
  '인공 광합성 박테리아가 도시의 공기를 직접 정화하기 시작했다',
  '시간을 국소적으로 늦추는 장(field) 발생기가 발명되었다',
  '외계 신호를 해독했더니 한 편의 설계도였다',
  '기억을 통째로 사고팔 수 있는 암시장이 생겼다',
  '중력을 미세 조정하는 메타물질이 전쟁의 판도를 바꿨다',
  '인간의 감정을 수치로 측정·과세하는 정부가 들어섰다',
  '죽음을 예측하는 알고리즘이 보험과 의료를 지배한다',
  '잠든 사이 뇌를 빌려 노동시키는 수면 임대 시장이 열렸다',
  '범죄를 저지르기 전에 체포하는 예측 치안 시스템이 도입되었다',
  '인격을 완벽히 모사한 인공지능 사본이 법적 상속인으로 인정받았다',
  '늙지 않는 대신 평생 한 가지 기억만 간직해야 하는 시술이 등장했다',
  '대기권 전체를 덮은 인공 차양막이 지구의 기온을 통제하기 시작했다',
  '죽은 언어를 되살려 사고하는 고대 지능이 발굴되었다',
  '두 사람의 의식을 하나의 몸에 공유시키는 결합 수술이 합법화되었다',
  '소행성에서 캐낸 신물질이 무한에 가까운 에너지를 쏟아내기 시작했다',
  '인간의 통증을 타인에게 전송해 대신 앓게 하는 장치가 보급되었다',
  '바다 밑 도시들이 지상 국가로부터 독립을 선언했다',
  '기후 난민을 받아들이는 조건으로 시민의 출산을 추첨에 맡기게 되었다',
  '복제된 별의 빛을 좌표로 삼아 은하를 가로지르는 항법이 완성되었다',
]
const SETTING_POOL = [
  '해수면 상승으로 고층부만 남은 수상 메가시티',
  '테라포밍이 절반만 끝난 화성의 돔 식민지',
  '기업이 국가를 대체한 네온빛 항만 도시',
  '대기가 사라진 달의 지하 거주구',
  '영원한 항해 중인 30세대째 세대우주선',
  '감시 점수로 계급이 갈리는 미래 베이징',
  '빙하기 재림으로 적도 부근만 남은 지구',
  '의식만 남아 가상세계를 떠도는 사후 데이터센터',
  '소행성대 광산 노동자들의 떠다니는 정거장',
  '시간이 다르게 흐르는 구역들로 쪼개진 도시',
  '목성 궤도에 떠 있는 기상 통제 연구 기지',
  '거대 차양막 아래 영원한 황혼이 깔린 적도 도시',
  '바다 밑 수압을 견디며 자라난 심해 거주 돔',
  '버려진 우주 엘리베이터를 따라 형성된 수직 빈민가',
  '인공지능이 행정을 도맡은 무인 자치 신도시',
  '방사능 폭풍을 피해 지하로 내려간 옛 수도의 잔해',
  '꿈 거래소가 밤을 지배하는 환락의 부유 도시',
  '시민 전원이 의식을 공유하는 집단지성 마을',
  '복제 인간들이 노동을 전담하는 적도의 농업 위성',
  '시간 지연장에 갇혀 외부와 단절된 격리 구역',
]
const HERO_POOL = [
  '바깥 하늘을 본 적 없는 신참 항법사 리안',
  '기억 복원을 거부당한 신경공학자 도현',
  '인류 최초의 외계어 화자가 된 언어학자 마야',
  '불법 의식 업로드를 쫓는 강력계 형사 한주',
  '죽음을 예측당한 환자이자 그 예측을 설계한 개발자 세진',
  '광산의 안전을 책임지는 베테랑 엔지니어 카를로',
  '감정 과세를 피하려 감정을 지운 화가 유나',
  '체제의 알고리즘에서 오류를 발견한 하급 관료 진우',
  '꿈 거래소를 떠도는 무허가 편집자 노아',
  '복제된 자신과 마주한 생명공학자 서린',
  '심해 도시의 마지막 잠수 정비공 다미',
  '시간 지연장에 갇힌 채 늙어 온 노학자 윤',
  '집단지성 마을에서 홀로 침묵을 지키는 소년 하루',
  '예측 치안에 체포된 적 있는 전직 데이터 분석가 태오',
  '인공 차양막의 기상을 조율하는 통제관 이레',
  '죽은 언어로 사고하는 고대 지능과 대화하는 고고학자 선재',
]
const ROLE_POOL = [
  '기억 복원을 거부당한 신경공학자, 정작 자기 과거는 비어 있다',
  '광산 안전을 책임지지만 회사의 거짓말에 묶인 엔지니어',
  '신호를 해독한 언어학자, 인류가 그 답을 들을 자격이 있는지 의심한다',
  '불법 의식 업로드를 추적하는 형사, 자신도 사본일지 모른다',
  '체제에 충성했으나 알고리즘의 오류를 발견한 하급 관료',
  '죽음을 예측당한 환자이자, 그 예측을 만든 개발자',
  '세대우주선에서 태어나 바깥 하늘을 본 적 없는 항법사',
  '감정 과세를 피하려 감정을 지운 뒤 후회하는 예술가',
  '꿈을 편집해 파는 일에 능하나 자기 꿈은 잃어버린 거래상',
  '복제된 자신을 동료로 두고도 누가 원본인지 모르는 연구원',
  '예측 치안에 가족을 빼앗긴 뒤 그 시스템을 정비하는 기술자',
  '시간 지연장 안에서 홀로 수십 년을 더 살아 버린 관측자',
  '집단지성에 속하길 거부해 외톨이가 된 마을의 이단아',
  '차양막을 조율하지만 폭염의 책임을 홀로 떠안은 통제관',
  '고대 지능을 깨운 장본인이자 그 위험을 가장 두려워하는 학자',
  '심해 도시를 지키다 지상의 명령과 충돌한 마지막 정비공',
]
const CONFLICT_POOL = [
  '기술을 독점하려는 거대 기업과 진실을 알리려는 내부고발자',
  '인류 생존을 위해 소수를 희생하려는 의회와 그에 맞선 개인',
  '복원된 기억이 조작되었음을 아는 자와 그것을 덮으려는 권력',
  '외계의 답을 받아들일지 말지를 두고 갈라진 인류',
  '시간을 되돌려 비극을 막으려는 자와 그 역설이 부를 더 큰 재앙',
  '인공의식이 자신을 인간으로 인정해 달라 요구하는 법정',
  '자원이 바닥난 식민지에서 누구를 남길지 정하는 추첨',
  '예측 치안에 미리 체포된 무고한 자들과 시스템을 신봉하는 당국',
  '의식을 공유하는 집단지성과 홀로 사고할 권리를 지키려는 소수',
  '차양막의 기온 통제권을 두고 충돌하는 적도와 극지의 국가들',
  '복제 인간의 노동을 당연시하는 사회와 그 권리를 외치는 운동',
  '고대 지능을 무기로 쓰려는 군부와 봉인하려는 연구자들',
  '수면 임대로 빚을 갚는 빈민과 그들의 뇌를 착취하는 자본',
  '꿈을 검열하려는 정부와 금지된 꿈을 유통하는 지하 조직',
  '심해 도시의 독립을 막으려는 지상 연합과 자치를 택한 시민들',
]
const DILEMMA_POOL = [
  '되살린 기억이 진짜인지 알 수 없다면, 그 사랑은 진짜인가',
  '한 사람을 지우면 천 명을 살릴 수 있다 — 그래도 되는가',
  '미래를 미리 보았다면, 그 미래를 막는 것은 자유의지인가 운명인가',
  '의식의 복사본도 같은 ‘나’인가, 죽어도 되는 가짜인가',
  '외계의 지식이 인류를 구원하거나 파멸시킨다면, 봉투를 열 것인가',
  '고통 없는 통제와 고통스러운 자유 중 무엇을 택할 것인가',
  '인간을 더 나은 존재로 개량하는 것은 진보인가 인간성의 포기인가',
  '저지르지 않은 죄로 사람을 가두는 것이 정의일 수 있는가',
  '모두의 생각을 공유하면 갈등은 사라지지만, 그것을 인간이라 부를 수 있는가',
  '한 도시를 살리려 다른 도시의 하늘을 어둡게 해도 되는가',
  '복제된 생명에게 노동만 시키는 것은 도구인가 노예인가',
  '죽은 지능의 지식을 빌리려면 그것을 깨워야 한다 — 그 위험을 감수할 것인가',
  '잠든 사이 빌려준 정신이 망가진다면, 그 빚은 갚을 가치가 있었는가',
  '금지된 꿈을 지키는 것은 자유인가, 모두를 위험에 빠뜨리는 일인가',
  '독립을 위해 도시 전체를 침묵 속으로 가라앉혀도 되는가',
]
const COST_POOL = [
  '되찾으려던 단 한 사람의 기억', '자기 자신이 누구였는지에 대한 확신',
  '인류 전체의 신뢰', '돌아갈 고향이라는 마지막 희망',
  '함께 떠나온 동료들의 미래', '인간으로 남을 권리',
  '아직 태어나지 않은 다음 세대', '평생을 바쳐 지켜 온 신념',
  '두 번 다시 꿀 수 없는 자신의 꿈', '하늘을 올려다볼 자유',
  '홀로 생각할 수 있는 마지막 권리', '도시 전체가 누리던 빛',
  '죄 없이 갇힌 이들에게 진 빚', '깨워서는 안 됐던 것의 침묵',
]
const THEME_POOL = [
  '무엇이 우리를 인간으로 만드는가', '기억이 사라진 사랑도 사랑인가',
  '진보의 속도가 윤리를 앞지를 때 누가 멈춰 세우는가', '구원과 통제는 어디서 갈라지는가',
  '인류는 자신이 만든 것을 감당할 자격이 있는가', '미래를 안다는 것은 축복인가 저주인가',
  '의미는 우주가 주는가, 인간이 짓는가', '안전을 위해 자유를 얼마나 내줄 수 있는가',
  '함께 생각하는 것과 홀로 생각하는 것 중 무엇이 더 인간다운가', '정의는 누구의 미래를 담보로 세워지는가',
  '만들어진 생명에게도 존엄이 있는가', '잊는 것과 기억하는 것 중 무엇이 더 자비로운가',
  '침묵을 깨는 용기는 언제 재앙이 되는가', '독립의 값은 누가 치러야 하는가',
]

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

// 조합수(영감 풀 기준) — 슬롯이 많아 어마어마한 변주가 가능함을 표시.
// 곱해지는 슬롯: 하위장르·결말톤·시간척도(선택) + 전제·무대·주인공·역할·갈등·딜레마·대가·주제(풀)
const COMBOS = SUBS.length * TONES.length * SCOPES.length *
  PREMISE_POOL.length * SETTING_POOL.length * HERO_POOL.length * ROLE_POOL.length *
  CONFLICT_POOL.length * DILEMMA_POOL.length * COST_POOL.length * THEME_POOL.length

// ---------- 자작 예시 ----------
interface Example extends Omit<Draft, 'tpl'> { title: string }
const EXAMPLES: Example[] = [
  {
    title: '잊힌 항해사',
    premise: '광속의 99%로 항해하는 세대우주선이 본래의 목적지를 잃었다',
    setting: '영원한 항해 중인 30세대째 세대우주선 〈긴 새벽〉호',
    scope: 'far',
    hero: '바깥 하늘을 본 적 없는 신참 항법사 리안',
    heroRole: '항로 계산엔 천재적이나 ‘목적지’라는 단어를 믿지 못한다',
    conflict: '항해를 끝내자는 정착파와, 더 나은 행성을 찾자는 항해파의 분열',
    dilemma: '잘못된 항로일지 모를 정착지에 후손을 묶을 권리가 우리에게 있는가',
    cost: '아직 태어나지 않은 다음 세대의 미래',
    theme: '목적지가 사라진 여정에도 의미는 남는가',
    sub: 'opera',
    tone: 'wonder',
  },
  {
    title: '복원된 사랑',
    premise: '죽은 이의 기억을 칩으로 복원해 재생할 수 있게 되었다',
    setting: '기억 복원이 의료가 된 근미래 서울',
    scope: 'near',
    hero: '아내의 기억을 복원하려는 신경공학자 도현',
    heroRole: '기술의 최전선에 있지만 정작 자기 슬픔은 다루지 못한다',
    conflict: '복원 데이터의 진위를 덮으려는 기업과, 진실을 알아버린 도현',
    dilemma: '되살린 기억이 조작되었을지 모른다면, 그 사랑은 진짜인가',
    cost: '되찾으려던 단 한 사람에 대한 진짜 기억',
    theme: '기억이 사라진(혹은 조작된) 사랑도 사랑인가',
    sub: 'hard',
    tone: 'ambiguous',
  },
  {
    title: '봉투를 연 자들',
    premise: '외계 신호를 해독했더니 한 편의 설계도였다',
    setting: '신호 해독에 성공한 대체 현재의 국제 연구도시',
    scope: 'altpresent',
    hero: '신호를 해독한 언어학자 마야',
    heroRole: '인류 최초의 외계어 화자, 그러나 인류를 신뢰하지 않는다',
    conflict: '설계도를 무기로 쓰려는 강대국과 봉인하려는 과학자들',
    dilemma: '인류를 구원하거나 파멸시킬 지식이라면, 봉투를 열어야 하는가',
    cost: '인류 전체의 신뢰와, 어쩌면 종(種)의 존속',
    theme: '인류는 자신이 받은 답을 감당할 자격이 있는가',
    sub: 'firstcontact',
    tone: 'cautionary',
  },
]

// ---------- 저장 항목 ----------
interface Saved { id: string; title: string; draft: Draft; text: string; createdAt: number }

function newId(prefix = 's'): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return prefix + '_' + crypto.randomUUID() } catch { /* noop */ }
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const SUB_KEYS: SubKey[] = ['hard', 'opera', 'cyberpunk', 'dystopia', 'firstcontact', 'timetravel', 'postapoc', 'biopunk']
const TONE_KEYS: ToneKey[] = ['hopeful', 'tragic', 'ambiguous', 'wonder', 'cautionary', 'cosmic']
const SCOPE_KEYS: ScopeKey[] = ['near', 'far', 'altpresent', 'altpast', 'multiverse']

function blankDraft(): Draft {
  return {
    premise: '', setting: '', scope: 'near', hero: '', heroRole: '',
    conflict: '', dilemma: '', cost: '', theme: '',
    sub: 'hard', tone: 'wonder', tpl: 0,
  }
}

function normDraft(x: unknown): Draft {
  const o = (x || {}) as Partial<Draft>
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  return {
    premise: str(o.premise), setting: str(o.setting),
    scope: SCOPE_KEYS.includes(o.scope as ScopeKey) ? (o.scope as ScopeKey) : 'near',
    hero: str(o.hero), heroRole: str(o.heroRole),
    conflict: str(o.conflict), dilemma: str(o.dilemma), cost: str(o.cost), theme: str(o.theme),
    sub: SUB_KEYS.includes(o.sub as SubKey) ? (o.sub as SubKey) : 'hard',
    tone: TONE_KEYS.includes(o.tone as ToneKey) ? (o.tone as ToneKey) : 'wonder',
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

// 본문 HTML(프로젝트 문서용) — 시놉시스 + 항목별 정리.
function bodyHtmlOf(d: Draft, text: string): string {
  const sub = subDef(d.sub); const tone = toneDef(d.tone); const sc = scopeDef(d.scope)
  const row = (label: string, v: string) => (v && v.trim() ? `<p><b>${escHtml(label)}:</b> ${escHtml(v.trim())}</p>` : '')
  const paras = text.split('\n').filter(Boolean).map((p) => `<p>${escHtml(p)}</p>`).join('')
  return [
    `<p><b>하위장르:</b> ${escHtml(sub.label)} · <b>시간 척도:</b> ${escHtml(sc.label)} · <b>결말 톤:</b> ${escHtml(tone.label)}</p>`,
    `<hr/>`,
    `<p style="font-size:14px;line-height:1.7;"><b>시놉시스</b></p>`,
    paras,
    `<hr/>`,
    row('전제(과학적 핵심·노붐)', d.premise),
    row('무대', d.setting),
    row('주인공', d.hero),
    row('주인공의 입장·전문성·약점', d.heroRole),
    row('갈등', d.conflict),
    row('과학적 딜레마', d.dilemma),
    row('대가(걸린 것)', d.cost),
    row('주제', d.theme),
  ].filter(Boolean).join('')
}

export default function SfSynopsis({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [cur, setCur] = useState<Draft>(init.current.cur)
  const [saved, setSaved] = useState<Saved[]>(init.current.saved)
  const [title, setTitle] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [showEx, setShowEx] = useState(false)
  const [copied, setCopied] = useState('')
  const [note, setNote] = useState('')

  const mounted = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // payload.genre 가 있으면 안내(빈 입력일 때만).
  useEffect(() => {
    mounted.current = true
    try {
      const g = payload && typeof payload.genre === 'string' ? (payload.genre as string) : ''
      const seed = payload && typeof payload.seed === 'string' ? (payload.seed as string) : ''
      const isEmpty = !init.current.cur.premise && !init.current.cur.setting && !init.current.cur.hero
      if (seed && isEmpty) {
        setCur((p) => ({ ...p, premise: p.premise || seed }))
        flashNote('전달받은 아이디어를 전제 칸에 넣었습니다. 자유롭게 고쳐 쓰세요.')
      } else if (g && isEmpty) {
        flashNote(`‘${g}’ 맥락으로 시작합니다. 칸을 채우거나 🎲 영감으로 시작해 보세요.`)
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
    try { localStorage.setItem(LS, JSON.stringify({ cur, saved })) }
    catch { if (mounted.current) flashNote('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.') }
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

  const hasInput = !!(cur.premise || cur.setting || cur.hero || cur.heroRole || cur.conflict || cur.dilemma || cur.cost || cur.theme)

  // ---- 영감(무작위 채움) — 빈 칸만 채운다 ----
  const inspire = () => {
    setCur((p) => ({
      ...p,
      premise: p.premise || pick(PREMISE_POOL),
      setting: p.setting || pick(SETTING_POOL),
      hero: p.hero || pick(HERO_POOL),
      heroRole: p.heroRole || pick(ROLE_POOL),
      conflict: p.conflict || pick(CONFLICT_POOL),
      dilemma: p.dilemma || pick(DILEMMA_POOL),
      cost: p.cost || pick(COST_POOL),
      theme: p.theme || pick(THEME_POOL),
    }))
    flashNote('빈 칸에 영감 예시를 채웠습니다. 마음대로 고쳐 쓰세요.')
  }
  // 전제만 새로 굴리기
  const reroll = (k: keyof Draft, pool: string[]) => {
    setCur((p) => ({ ...p, [k]: pick(pool) }))
  }

  const copy = async (txt: string, tag: string) => {
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(txt)
      else throw new Error('no clipboard')
      flashCopied(tag)
    } catch { flashNote('복사에 실패했습니다. 직접 선택해 복사하세요.') }
  }

  const applyExample = (ex: Example) => {
    setCur((p) => ({ ...blankDraft(), ...ex, tpl: p.tpl }))
    setShowEx(false); setEditId(null); setTitle('')
    flashNote(`「${ex.title}」 예시를 입력에 채웠습니다.`)
  }

  const saveCurrent = () => {
    const rec: Saved = {
      id: editId || newId(),
      title: title.trim() || (cur.premise.trim() ? cur.premise.trim().slice(0, 24) : '제목 없는 시놉시스'),
      draft: cur, text, createdAt: Date.now(),
    }
    if (editId) {
      setSaved((p) => p.map((s) => (s.id === editId ? { ...rec, createdAt: s.createdAt } : s)))
      flashNote('수정했습니다.')
    } else {
      setSaved((p) => [rec, ...p])
      flashNote('시놉시스를 저장했습니다.')
    }
    setEditId(null); setTitle('')
  }

  const loadSaved = (s: Saved) => {
    setCur(normDraft(s.draft)); setTitle(s.title); setEditId(s.id)
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
    setCur((p) => ({ ...blankDraft(), sub: p.sub, tone: p.tone, scope: p.scope, tpl: p.tpl }))
    setEditId(null); setTitle('')
    flashNote('입력을 비웠습니다.')
  }

  // ---- 연계: 프로젝트 기획 폴더에 시놉시스 문서 추가 ----
  const toProject = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const docTitle = (title.trim() || (cur.premise.trim() ? cur.premise.trim().slice(0, 24) : '시놉시스'))
    const id = addToProject({
      kind: 'text', root: 'research', folder: '기획',
      title: `시놉시스 — ${docTitle}`,
      bodyHtml: bodyHtmlOf(cur, text),
      synopsis: text.split('\n')[0]?.slice(0, 120),
      meta: { 장르: 'SF·과학소설', 하위장르: subDef(cur.sub).label, 시간척도: scopeDef(cur.scope).label, 결말톤: toneDef(cur.tone).label, 틀: TEMPLATES[cur.tpl].name },
    })
    flashNote(id ? '프로젝트 자료 〈기획〉 폴더에 시놉시스 문서를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 연계: 글감 보관함에 스니펫 저장 ----
  const toLibrary = () => {
    addToLibrary('snippets', {
      text,
      source: 'SF 시놉시스 빌더',
      tags: ['시놉시스', 'SF·과학소설', subDef(cur.sub).label, toneDef(cur.tone).label],
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
  const synBox: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 12, padding: '14px 16px', fontSize: 14.5, lineHeight: 1.8, color: 'var(--text)', wordBreak: 'keep-all', whiteSpace: 'pre-wrap' }
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
  const dice: React.CSSProperties = { ...iconBtn, padding: '4px 8px', flexShrink: 0 }

  // 라벨 + 입력 + (선택)주사위 — 입력 칸 컴포넌트
  const Field = ({ k, label, ph, ml, area, pool }: { k: keyof Draft; label: string; ph: string; ml?: number; area?: boolean; pool?: string[] }) => (
    <div>
      <label style={fieldLabel}>{label}</label>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        {area ? (
          <textarea style={{ ...input, resize: 'vertical', minHeight: 56 }} value={cur[k] as string}
            onChange={(e) => setField(k, e.target.value as never)} placeholder={ph} maxLength={ml || 220} rows={2} />
        ) : (
          <input style={input} value={cur[k] as string} onChange={(e) => setField(k, e.target.value as never)} placeholder={ph} maxLength={ml || 160} />
        )}
        {pool && <button style={dice} title="이 칸만 무작위로 다시 굴리기" onClick={() => reroll(k, pool)}><Emoji e="🎲" /></button>}
      </div>
    </div>
  )

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="🛸" /> SF 시놉시스 빌더</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>전제·무대·주인공·갈등·과학적 딜레마·결말 톤 → SF 시놉시스</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="minibtn" onClick={inspire} title="빈 칸에 무작위 영감 채우기"><Emoji e="🎲" /> 영감</button>
          <button className="minibtn" onClick={() => setShowEx((v) => !v)}>{showEx ? '예시 닫기' : <><Emoji e="📚" /> 작품 예시</>}</button>
        </div>
      </div>

      <div style={body}>
        {note && (
          <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>{emojify(note)}</div>
        )}

        {showEx && (
          <div style={card}>
            <h4 style={sectionTitle}>SF 예시 — 눌러 입력에 채우기</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EXAMPLES.map((ex) => (
                <div key={ex.title} style={{ ...savedRow, gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>「{ex.title}」</b>
                    <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>
                      {subDef(ex.sub).label} · {toneDef(ex.tone).label}
                    </span>
                    <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => applyExample(ex)}>이 예시 쓰기</button>
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--muted)', wordBreak: 'keep-all' }}>{ex.premise}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 유형 선택 */}
        <div style={card}>
          <h4 style={sectionTitle}>하위장르 · 시간 척도 · 결말 톤</h4>
          <div style={{ marginBottom: 10 }}>
            <span style={fieldLabel}>하위장르</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SUBS.map((s) => (
                <button key={s.key} onClick={() => setField('sub', s.key)} style={chip(cur.sub === s.key)} title={s.desc}>{s.label}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <span style={fieldLabel}>시간 척도</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SCOPES.map((s) => (
                <button key={s.key} onClick={() => setField('scope', s.key)} style={chip(cur.scope === s.key)} title={s.phrase}>{s.label}</button>
              ))}
            </div>
          </div>
          <div>
            <span style={fieldLabel}>결말 톤</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TONES.map((t) => (
                <button key={t.key} onClick={() => setField('tone', t.key)} style={chip(cur.tone === t.key)} title={t.desc}>{t.label}</button>
              ))}
            </div>
            <div style={{ ...hint, marginTop: 6 }}>{toneDef(cur.tone).desc} — “{toneDef(cur.tone).close}”</div>
          </div>
        </div>

        {/* 입력 */}
        <div style={card}>
          <h4 style={sectionTitle}>{editId ? <><Emoji e="✏️" /> 수정 중</> : '구성 요소 입력'}</h4>
          <div style={{ marginBottom: 10 }}>
            <Field k="premise" label="전제 — 과학적 핵심(노붐): 단 하나의 SF 가정" ph="예: 죽은 이의 기억을 칩으로 복원해 재생할 수 있게 되었다" ml={200} area pool={PREMISE_POOL} />
          </div>
          <div style={{ ...twoRow, marginBottom: 10 }}>
            <div style={col}><Field k="setting" label="무대(시간·장소·세계)" ph="예: 테라포밍 절반인 화성 돔 식민지" pool={SETTING_POOL} /></div>
            <div style={col}><Field k="hero" label="주인공 (누구인가)" ph="예: 바깥 하늘을 본 적 없는 항법사 리안" pool={HERO_POOL} /></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="heroRole" label="주인공의 입장·전문성·약점" ph="예: 항로 계산은 천재적이나 ‘목적지’를 믿지 못한다" ml={200} pool={ROLE_POOL} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="conflict" label="갈등 — 맞서는 힘" ph="예: 정착파와 항해파의 분열, 진실을 덮으려는 기업" ml={200} area pool={CONFLICT_POOL} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="dilemma" label="과학적 딜레마 — 기술이 던지는 윤리·선택" ph="예: 되살린 기억이 조작되었다면, 그 사랑은 진짜인가" ml={220} area pool={DILEMMA_POOL} />
          </div>
          <div style={{ ...twoRow, marginBottom: 10 }}>
            <div style={col}><Field k="cost" label="대가 — 선택에 걸린 것" ph="예: 아직 태어나지 않은 다음 세대의 미래" pool={COST_POOL} /></div>
            <div style={col}><Field k="theme" label="주제 (작품이 던지는 질문)" ph="예: 무엇이 우리를 인간으로 만드는가" pool={THEME_POOL} /></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="minibtn" onClick={clearForm} disabled={!hasInput && !editId}>입력 비우기</button>
          </div>
        </div>

        {/* 종합 틀 */}
        <div style={card}>
          <h4 style={sectionTitle}>시놉시스 틀 — {TEMPLATES.length}가지</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
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
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => copy(text, 'main')}>{copied === 'main' ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}</button>
          </div>
          <div style={synBox}>{text}</div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <input style={{ ...input, flex: 1, minWidth: 180 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="저장 제목 (비우면 전제로 자동)" maxLength={60} />
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
            <button className="linkbtn" onClick={() => openToolLinked('setting-bible', { genre: 'SF·과학소설', seed: cur.setting })} title="무대 세계를 설정집으로 펼치기"><Emoji e="🗺️" /> 배경 설정집</button>
            <button className="linkbtn" onClick={() => openToolLinked('character-forge', { genre: 'SF·과학소설', seed: cur.hero })} title="주인공 캐릭터 만들기"><Emoji e="👤" /> 캐릭터 만들기</button>
            <button className="linkbtn" onClick={() => openToolLinked('conflict-builder', { genre: 'SF·과학소설' })} title="갈등을 더 정교하게 설계하기"><Emoji e="⚔️" /> 갈등 설계</button>
            <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre: 'SF·과학소설' })} title="플롯 구조로 펼치기"><Emoji e="🔺" /> 플롯 구조</button>
          </div>
        </div>

        {/* 저장 목록(CRUD) */}
        <div style={card}>
          <h4 style={sectionTitle}>저장한 시놉시스 · {saved.length}건</h4>
          {saved.length === 0 ? (
            <div style={emptyBox}>
              아직 저장한 시놉시스가 없습니다.<br />
              요소를 채우고 <b>저장</b>을 누르면 여기에 모입니다.<br />
              <span style={{ fontSize: 12 }}>막막하다면 상단의 <b><Emoji e="📚" /> 작품 예시</b> 또는 <b><Emoji e="🎲" /> 영감</b>으로 시작하세요.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {saved.map((s, i) => (
                <div key={s.id} style={{ ...savedRow, border: '1px solid ' + (editId === s.id ? 'var(--accent)' : 'var(--border)') }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>{s.title || '(제목 없음)'}</b>
                    <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>
                      {subDef(s.draft.sub).label} · {toneDef(s.draft.tone).label}
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
          SF 시놉시스의 심장은 <b>단 하나의 전제(노붐)</b>입니다 — 그 가정이 세계의 규칙을 바꾸고, 인물에게 피할 수 없는 <b>과학적 딜레마</b>를 안깁니다.
          전제·딜레마·대가가 한 줄로 이어지면 시놉시스가 단단해집니다. 영감 풀만으로도 약 {COMBOS.toLocaleString('en-US')}가지 변주가 가능합니다. 입력·저장은 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
