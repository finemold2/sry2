// 로맨스판타지(로판) 시놉시스 빌더 — 회빙환 설정·신분·여주의 무기·남주 유형·트로프·고구마/사이다·장벽·반전·결말 톤을
//  장르 관습대로 채우면 로판 시놉시스를 여러 문체 틀로 자동 종합한다.
//  핵심: ① 비어 있는 칸은 자리표시자로 항상 읽히는 문장 생성 ② '관계 골격 자동 생성기'(슬롯 풀 무작위·잠금/재생성·조합수 표시)
//  자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크 없음(전부 로컬·자작 데이터, 도시에 근거).
//  저장/입력은 localStorage('sry:tool:romfan-synopsis')에 JSON 자동 저장·복원. 언마운트 시 타이머 정리.
//  연계: addToProject(folder:'기획', '시놉시스')로 바인더 문서 추가, addToLibrary('snippets')로 글감 보관, openToolLinked 로 관련 도구.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'romfan-synopsis',
  name: '로판 시놉시스 빌더',
  icon: '👑',
  group: '구조',
  genre: '로맨스판타지',
  intro: '회빙환·신분·여주의 무기·남주 유형·트로프·고구마/사이다·반전·HEA를 채워 로판 시놉시스를 자동 종합합니다',
  w: 720,
  h: 680,
}

const LS = 'sry:tool:romfan-synopsis'

// ───────────────────────── 데이터 모델 ─────────────────────────
type StartKey = 'regression' | 'possession' | 'reincarnation' | 'villainess' | 'straight'
type StageKey = 'west' | 'east' | 'magic' | 'parenting' | 'business'
type ToneKey = 'cider' | 'healing' | 'dark' | 'comic' | 'epic'

interface Draft {
  start: StartKey       // 도입 장치(회빙환)
  stage: StageKey       // 무대(하위장르)
  tone: ToneKey         // 어조
  heroine: string       // 여주(신분·정체)
  weapon: string        // 여주의 무기(미래지식·능력·경영·정치)
  past: string          // 전생/원작의 비극(프롤로그)
  goal: string          // 여주의 목표(생존·이혼·복수·자유)
  male: string          // 남주(신분·정체)
  maleType: string      // 남주 유형(집착광공·다정·차가운 등)
  trope: string         // 관계 동력(트로프)
  bitter: string        // 고구마(억울·모욕·오해의 원천)
  cider: string         // 사이다(통쾌한 역전·공개 망신)
  barrier: string       // 장벽(라이벌·정치·신분·원작 강제력)
  twist: string         // 반전(비밀 폭로·숨겨진 혈통·정해진 결말 전복)
  ending: string        // 결말·HEA(즉위·결혼·외전 달달)
  theme: string         // 주제
  tpl: number           // 선택한 종합 틀
}

// ───────────────────────── 도입 장치(회빙환) ─────────────────────────
const STARTS: { key: StartKey; label: string; desc: string; open: string }[] = [
  { key: 'regression', label: '회귀', desc: '죽거나 파멸한 시점에서 과거로 돌아와 미래를 안다', open: '죽고 나서야 알았다. 그리고 눈을 떠보니, 모든 것이 시작되기 전이었다.' },
  { key: 'possession', label: '빙의', desc: '현대인이 읽던 소설/게임 속 인물(악역·엑스트라)이 된다', open: '눈을 뜨자, 내가 읽던 소설 속 악역의 몸이었다.' },
  { key: 'reincarnation', label: '환생', desc: '아예 다른 생으로 다시 태어난다(육아물 결합 빈번)', open: '다시 태어난 나는, 전생의 기억을 고스란히 가진 갓난아기였다.' },
  { key: 'villainess', label: '악역영애 빙의', desc: '처형·추방당할 악역임을 알고 파멸 플래그를 피한다', open: '원작대로라면 나는 처형당한다. 그 파멸의 플래그를, 나는 알고 있다.' },
  { key: 'straight', label: '정통(회빙환 없음)', desc: '환생 장치 없이 이 세계에서 운명을 개척한다', open: '천대받던 그날, 나는 더 이상 무릎 꿇지 않기로 했다.' },
]

// ───────────────────────── 무대(하위장르) ─────────────────────────
const STAGES: { key: StageKey; label: string; q: string }[] = [
  { key: 'west', label: '서양 제국·사교계', q: '황궁·작위·무도회·영지를 무대로 한 귀족 정치' },
  { key: 'east', label: '동양 후궁·세가', q: '후궁 암투·세가의 권력 다툼·황실의 비정함' },
  { key: 'magic', label: '마법·신성력·성좌', q: '마탑·아카데미·신전·예언이 운명을 보증하는 세계' },
  { key: 'parenting', label: '육아·딸바보', q: '어린 여주와 그녀를 떠받드는 어른 보호자들' },
  { key: 'business', label: '경영·전생지식', q: '영지 개발·상단·디저트로 전생 지식을 무기 삼는다' },
]

// ───────────────────────── 어조(톤) ─────────────────────────
const TONES: { key: ToneKey; label: string; desc: string }[] = [
  { key: 'cider', label: '사이다 복수', desc: '고구마를 짧게, 통쾌한 역전과 응징을 확실히' },
  { key: 'healing', label: '힐링·따뜻함', desc: '상처 입은 이들이 서로를 구원하는 잔잔한 결' },
  { key: 'dark', label: '다크·집착', desc: '광기 어린 헌신과 위태로운 긴장의 어둠' },
  { key: 'comic', label: '코믹·달달', desc: '오해와 설렘이 빚는 가볍고 사랑스러운 분위기' },
  { key: 'epic', label: '대서사·운명', desc: '신탁과 혈통, 제국의 운명이 걸린 장대한 흐름' },
]

const START_KEYS: StartKey[] = ['regression', 'possession', 'reincarnation', 'villainess', 'straight']
const STAGE_KEYS: StageKey[] = ['west', 'east', 'magic', 'parenting', 'business']
const TONE_KEYS: ToneKey[] = ['cider', 'healing', 'dark', 'comic', 'epic']

// 빈 칸은 자리표시자로 — 언제나 읽히는 문장을 만든다.
function f(s: string, ph: string): string {
  const t = (s || '').trim()
  return t || `〔${ph}〕`
}

// ── 한국어 조사 자동 선택: 앞 글자 받침을 보고 실제 조사 하나를 골라 붙인다 ──
//  괄호 이중표기("을(를)")를 결과에 절대 노출하지 않기 위한 헬퍼.
function lastCharHasJong(word: string): { has: boolean; isRieul: boolean } | null {
  // 괄호 안 주석·구두점을 제외한 마지막 '한글/숫자/영문' 글자를 찾는다.
  const m = (word || '').match(/[가-힣0-9A-Za-z]/g)
  if (!m || m.length === 0) return null
  const ch = m[m.length - 1]
  const code = ch.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28
    return { has: jong !== 0, isRieul: jong === 8 }
  }
  // 숫자/영문은 발음 기준으로 받침 유무를 근사. (로판 슬롯엔 거의 없지만 안전망)
  const hasJongMap: Record<string, boolean> = {
    '0': false, '1': false, '3': true, '6': true, '7': true, '8': false, '10': false,
    '2': false, '4': false, '5': false, '9': false,
    l: true, m: true, n: true, r: true, g: true,
  }
  const key = /[0-9]/.test(ch) ? ch : ch.toLowerCase()
  return { has: !!hasJongMap[key], isRieul: ch.toLowerCase() === 'l' }
}
// 받침 있으면 첫 번째(withJong), 없으면 두 번째(noJong)를 단어 뒤에 붙여 반환.
function josa(word: string, withJong: string, noJong: string): string {
  const w = (word || '').trim()
  const info = lastCharHasJong(w)
  if (!info) return w + withJong // 판단 불가 시 받침 있는 형태로(자리표시자 등)
  return w + (info.has ? withJong : noJong)
}
const ul = (w: string) => josa(w, '을', '를')      // 을/를
const iga = (w: string) => josa(w, '이', '가')     // 이/가
const eun = (w: string) => josa(w, '은', '는')     // 은/는
const wa = (w: string) => josa(w, '과', '와')      // 과/와
// 으로/로: 받침 없거나 'ㄹ' 받침이면 '로', 그 외엔 '으로'
function ro(word: string): string {
  const w = (word || '').trim()
  const info = lastCharHasJong(w)
  if (!info) return w + '으로'
  return w + (!info.has || info.isRieul ? '로' : '으로')
}

// ───────────────────────── 종합 틀(템플릿) ─────────────────────────
interface Tpl { name: string; hint: string; build: (d: Draft) => string }

const TEMPLATES: Tpl[] = [
  {
    name: '표준 줄거리형',
    hint: '프롤로그(비극)→각성→관계 형성→갈등→사이다→HEA 정석',
    build: (d) => {
      const st = STARTS.find((x) => x.key === d.start)!
      const sg = STAGES.find((x) => x.key === d.stage)!
      return [
        `${st.open} ${f(d.past, '전생/원작의 비극')}.`,
        `${st.label}한 ${eun(f(d.heroine, '여주'))} ${sg.q} 속에서 ${ul(f(d.goal, '여주의 목표'))} 결심한다.`,
        `그녀의 무기는 ${f(d.weapon, '여주의 무기(미래지식·능력)')}. 그러나 ${iga(f(d.barrier, '장벽'))} 앞을 가로막는다.`,
        `그런 그녀 곁에 ${f(d.male, '남주')} — ${iga(f(d.maleType, '남주 유형'))} 다가오고, 두 사람은 ${ro(f(d.trope, '관계 동력(트로프)'))} 얽힌다.`,
        `${f(d.bitter, '고구마(억울·모욕)')}의 모욕을 견딘 끝에, ${ro(f(d.cider, '사이다(통쾌한 역전)'))} 판을 뒤집는다.`,
        `마침내 ${iga(f(d.twist, '반전'))} 드러나고, ${ro(f(d.ending, '결말(HEA)'))} 이야기는 닫힌다.`,
        `이것은 ${f(d.theme, '주제')}에 관한 이야기다.`,
      ].join(' ')
    },
  },
  {
    name: '여주 1인칭 선언형',
    hint: '여주의 결심과 주체성을 전면에 세운 내적 독백 톤',
    build: (d) => {
      return [
        `${f(d.past, '전생/원작의 비극')}. 같은 실수를 두 번 반복할 생각은 없다.`,
        `${ro(f(d.heroine, '여주'))} 다시 시작한 나의 목표는 단 하나, ${f(d.goal, '여주의 목표')}.`,
        `이번엔 ${iga(f(d.weapon, '여주의 무기'))} 내 손에 있다.`,
        `${f(d.male, '남주')}? ${f(d.maleType, '남주 유형')}인 그가 자꾸만 ${ro(f(d.trope, '관계 동력(트로프)'))} 내 계획에 끼어든다. 호감도가… 왜 오르는 거지?`,
        `${iga(f(d.barrier, '장벽'))} 막아서고 ${iga(f(d.bitter, '고구마(억울)'))} 쌓여도, 나는 ${ro(f(d.cider, '사이다(역전)'))} 갚아준다.`,
        `그리고 끝내 마주한 ${f(d.twist, '반전')} — 원작대로 죽었어야 할 내가, ${ul(f(d.ending, '결말(HEA)'))} 쟁취한다.`,
      ].join(' ')
    },
  },
  {
    name: '남주 시점 폭로형',
    hint: '"그가 사실 얼마나 빠졌는지"를 드러내는 이중 시점 장치',
    build: (d) => {
      return [
        `처음엔 그저 ${f(d.male, '남주')}, ${f(d.maleType, '남주 유형')}일 뿐이었다.`,
        `${iga(f(d.heroine, '여주'))} ${ul(f(d.goal, '여주의 목표'))} 향해 ${ul(f(d.weapon, '여주의 무기'))} 휘두르는 모습을, 그는 멀리서 지켜본다.`,
        `${ro(f(d.trope, '관계 동력(트로프)'))} 얽히는 사이, 차가운 줄 알았던 그의 온도가 조금씩 달라진다.`,
        `${iga(f(d.barrier, '장벽'))} 그녀를 위협할 때, 그는 신분도 정치적 손해도 마다하지 않고 "내 사람"이라 공표한다.`,
        `${ul(f(d.bitter, '고구마(모욕)'))} 그녀가 ${ro(f(d.cider, '사이다(역전)'))} 되갚는 순간, 그는 깨닫는다 — 도망치게 둘 수 없다고.`,
        `${f(d.twist, '반전')}마저 거부가 아닌 포용으로 끌어안으며, 두 사람은 ${f(d.ending, '결말(HEA)')}에 이른다. 결국 ${f(d.theme, '주제')}.`,
      ].join(' ')
    },
  },
  {
    name: '연재 후킹(블러브)형',
    hint: '연재 소개글처럼 압축·자극적으로, 첫 화 후킹 강조',
    build: (d) => {
      const st = STARTS.find((x) => x.key === d.start)!
      return [
        `${f(d.past, '전생/원작의 비극')}.`,
        `${ro(st.label)} 돌아온 ${f(d.heroine, '여주')}에게 남은 무기는 ${f(d.weapon, '여주의 무기')} 하나뿐.`,
        `목표는 ${f(d.goal, '여주의 목표')} — 그뿐이었는데, ${f(d.maleType, '남주 유형')}인 ${iga(f(d.male, '남주'))} ${ro(f(d.trope, '관계 동력(트로프)'))} 자꾸 거리를 좁혀온다.`,
        `${iga(f(d.barrier, '장벽'))} 비웃을 때, 그녀는 ${ro(f(d.cider, '사이다(통쾌한 역전)'))} 답한다.`,
        `…그리고 마지막에 기다리는 ${f(d.twist, '반전')}. ${f(d.ending, '결말(HEA)')}.`,
      ].join(' ')
    },
  },
  {
    name: '고구마/사이다 설계형',
    hint: '독자 만족을 좌우하는 고구마↔사이다 비율을 명시',
    build: (d) => {
      return [
        `[발단] ${f(d.past, '전생/원작의 비극')} → ${STARTS.find((x) => x.key === d.start)!.label}로 각성.`,
        `[여주] ${f(d.heroine, '여주')} — 무기: ${f(d.weapon, '미래지식·능력')} / 목표: ${f(d.goal, '여주의 목표')}.`,
        `[남주] ${f(d.male, '남주')} (${f(d.maleType, '남주 유형')}) — 동력: ${f(d.trope, '트로프')}.`,
        `[고구마] ${f(d.bitter, '억울·모욕·오해')} (짧게, 분명한 청산 예고).`,
        `[사이다] ${f(d.cider, '공개 망신 역전·응징')} (확실하게).`,
        `[장벽] ${f(d.barrier, '라이벌·정치·원작 강제력')}.`,
        `[반전] ${f(d.twist, '비밀 폭로·숨겨진 혈통·운명 전복')}.`,
        `[HEA] ${f(d.ending, '즉위·결혼·외전 달달')}.`,
        `[주제] ${f(d.theme, '주제')}.`,
      ].join('\n')
    },
  },
  {
    name: '운명 전복형',
    hint: '"원작대로면 죽을 나"가 정반대 결말을 쟁취하는 주제 강조',
    build: (d) => {
      const sg = STAGES.find((x) => x.key === d.stage)!
      return [
        `${f(d.past, '전생/원작의 비극')} — 정해진 결말이었다.`,
        `하지만 ${eun(f(d.heroine, '여주'))} ${sg.q} 한가운데에서, ${ro(f(d.weapon, '여주의 무기'))} 운명을 비틀기 시작한다.`,
        `${wa(f(d.barrier, '장벽'))} ${iga(f(d.bitter, '고구마(원작 강제력·모욕)'))} 거듭 그녀를 끌어내리려 하지만, ${iga(f(d.cider, '사이다(역전)'))} 매번 판을 뒤집는다.`,
        `${f(d.male, '남주')}, ${wa(f(d.maleType, '남주 유형'))}의 ${f(d.trope, '트로프')}마저 정해진 줄거리를 어긋나게 한다.`,
        `그리고 ${f(d.twist, '반전')}. 원작대로라면 처형·파멸이었을 그녀가, ${ul(f(d.ending, '결말(HEA)'))} 손에 넣는다.`,
        `이 모든 것이 말한다 — ${f(d.theme, '주제')}.`,
      ].join(' ')
    },
  },
]

// ───────────────────────── 영감 슬롯 풀(도시에 근거 자작) ─────────────────────────
const POOL_HEROINE = [
  '폐위 직전의 황후', '처형당할 운명의 악역 공작영애', '천대받던 서녀(庶女) 출신 영애', '죽은 줄 알았던 황녀',
  '예언 속 그 아이로 지목된 성녀 후보', '버림받은 황비', '몰락 가문의 마지막 영애', '시한부 선고를 받은 황녀',
  '후궁으로 간택된 한미한 가문의 여식', '소설 속 엑스트라 시녀', '마탑주의 숨겨진 제자', '갓 태어난 대공가의 외동딸',
  '정략결혼으로 팔려가는 변방 영주의 딸', '신분을 숨긴 채 잠입한 옛 황실의 후예',
  '계약직 대역으로 입궁한 평민 출신 가짜 영애', '이혼당하고 친정으로 쫓겨난 후작부인',
  '저주받은 탑에 갇혀 자란 잊힌 공주', '약혼이 파기된 채 사교계에서 매장당한 백작영애',
  '대공가에 양녀로 들어간 천애 고아 소녀', '신탁을 받고 신전에 바쳐진 어린 무녀',
]
const POOL_WEAPON = [
  '처형되기 전 회귀로 얻은 미래 정보', '원작 소설의 모든 전개를 아는 지식', '치유의 신성력', '강대한 마나와 속성 마법',
  '전생의 경영·회계 지식', '독과 약초에 통달한 의술', '사람의 거짓을 꿰뚫는 통찰', '현대의 요리·디저트 레시피',
  '잊힌 고대 혈통에 깃든 권능', '정령과 계약한 힘', '상단을 일으키는 사업 수완', '궁중 정치의 판을 읽는 눈',
  '꿈으로 미래를 미리 보는 예지력', '죽은 자의 마지막 기억을 읽는 능력',
  '전생의 현대 의학·위생 지식', '한 번 본 것은 잊지 않는 완벽한 기억력',
  '사교계 인맥과 소문을 자유자재로 다루는 화술', '몸을 숨기고 잠입하는 암살자의 무예',
]
const POOL_PAST = [
  '믿었던 황제에게 누명을 쓰고 처형당했다', '원작에서 여주인공에게 밀려나 추방당해 죽었다', '독살당한 채 차디찬 냉궁에서 눈을 감았다',
  '가문이 멸문당하는 것을 무력하게 지켜봐야 했다', '사랑이라 믿었던 약혼자에게 배신당했다', '딸을 지키지 못하고 비참하게 스러졌다',
  '소설 속 악역으로서 단두대에 올랐다', '전쟁의 책임을 뒤집어쓰고 폐위되었다',
  '여동생에게 약혼자와 자리를 모두 빼앗긴 채 잊혀졌다', '평생 도구로만 쓰이다 토사구팽당했다',
  '역병이 도는 영지에서 외면받으며 홀로 숨졌다', '진실을 말했다는 이유로 미친 사람 취급을 받다 갇혔다',
]
const POOL_GOAL = [
  '이번엔 반드시 살아남는 것', '조용히 이혼당하고 자유로워지는 것', '가문을 다시 일으켜 세우는 것',
  '자신을 버린 자들에게 똑같이 갚아주는 것', '파멸 플래그를 모두 피해 가는 것', '딸을 안전하게 지켜내는 것',
  '폐위된 자리를 되찾는 것', '원작의 정해진 결말을 비틀어 행복을 쟁취하는 것',
  '누명을 벗고 명예를 온전히 회복하는 것', '아무에게도 기대지 않고 홀로서기를 이루는 것',
  '몰락할 영지를 풍요로운 땅으로 바꿔 놓는 것', '자신을 옭아맨 약혼을 깨끗이 파기하는 것',
]
const POOL_MALE = [
  '냉혹하기로 소문난 황제', '북부를 다스리는 잔혹한 대공', '검의 신이라 불리는 기사단장', '원작의 진짜 주인공인 황태자',
  '마탑주이자 대마법사', '나라를 좌우하는 젊은 재상', '저주받았다는 소문의 흑발 공작', '신전의 대신관',
  '적국의 황태자', '비밀을 품은 호위 기사',
  '제국 최고의 상단을 거느린 젊은 상회주', '신분을 숨기고 시정에 섞여 든 황자',
  '용을 다스린다는 전설의 변경백', '냉정한 검술 교관이자 그녀의 정혼자',
  '몰락 가문을 일으킨 자수성가한 신흥 귀족', '얼음 같은 평판의 황실 근위 기사단장',
]
const POOL_MALETYPE = [
  '오직 그녀에게만 약해지는 집착광공', '겉은 냉정하나 속은 헌신적인 다정남', '무심한 듯 하나하나 챙기는 츤데레',
  '강아지처럼 따르는 순애보 연하남', '능글맞게 거리를 좁히는 능청남', '상처 입은 짐승 같은 다크한 남주',
  '예의 바르나 소유욕이 무서운 신사', '그녀의 정체를 알면서도 모른 척 지켜주는 수호자',
  '천재적이지만 그녀 앞에서만 허당이 되는 마법사', '원수처럼 으르렁대다 가장 먼저 무너지는 라이벌남',
  '과묵하고 무뚝뚝하나 행동으로 다 말하는 곰 같은 남자', '겉으론 바람둥이지만 그녀에게만은 순정인 카사노바',
]
const POOL_TROPE = [
  '계약 결혼 — 처음엔 거래, 나중엔 진심', '정략결혼으로 맺어진 적대적 부부', '신분을 숨긴 채 가까워지는 비밀 연애',
  '서로를 오해한 채 시작된 적에서 연인으로', '주종 계약으로 묶인 호위와 주군', '딸바보 보호자에서 한 여자로의 자각',
  '같은 비밀(회귀·빙의)을 공유하게 된 공범', '원수의 가문이지만 끌리는 금단의 관계', '약혼 파기 후 의외의 그가 손을 내미는 전개',
  '소꿉친구였다가 재회해 다시 끌리는 사이', '서로의 약점을 쥐고 시작한 위험한 거래 관계',
  '한 침대를 쓰게 된 어쩔 수 없는 동거', '죽이려 보낸 자객과 표적으로 만난 운명',
  '거짓 연인 행세를 하다 진짜가 되어 버린 사이',
]
const POOL_BITTER = [
  '약혼자가 여주인공을 두고 공개적으로 망신을 준다', '계모와 이복자매가 누명을 씌운다', '사교계가 출신을 들먹이며 비웃는다',
  '황실이 정쟁의 희생양으로 삼으려 한다', '아무도 그녀의 진심을 믿어주지 않는다', '원작 강제력이 그녀를 파멸로 떠민다',
  '라이벌 여캐가 남주 곁을 가로막는다', '가문의 어른들이 그녀를 도구로만 취급한다',
  '공들인 성과를 다른 이가 가로채 제 것이라 떠든다', '거짓 소문이 퍼져 하루아침에 사교계에서 매장당한다',
  '믿었던 측근이 등 뒤에서 그녀를 팔아넘긴다', '신분이 낮다는 이유로 정당한 자리마저 빼앗긴다',
]
const POOL_CIDER = [
  '무도회에서 만인이 보는 앞에 악역의 죄가 폭로된다', '되찾은 능력으로 자신을 모욕한 자들을 무릎 꿇린다',
  '재판정에서 증거를 들이밀어 누명을 통쾌하게 벗는다', '남주가 만조백관 앞에서 그녀를 황후로 지목한다',
  '몰락시키려던 자들의 음모가 자업자득으로 자멸한다', '경영 수완으로 가문을 비웃던 이들을 압도한다',
  '약혼을 먼저 파기하고 더 높은 자리로 올라선다', '예언이 그녀의 정통성을 만천하에 공인한다',
  '미래 지식으로 위기를 예언처럼 막아내 모두를 경악시킨다', '그녀를 버린 가문이 도리어 그녀에게 머리를 조아린다',
  '빼앗긴 작위와 영지를 황명으로 고스란히 되찾는다', '결투에서 자신을 능멸한 기사를 단숨에 제압한다',
]
const POOL_BARRIER = [
  '원작의 정해진 결말(원작 강제력)', '여주인공으로 예정된 라이벌의 방해', '황실·가문의 정치적 음모',
  '신분 차이와 서출 차별의 벽', '회귀·빙의의 비밀이 들통날 위기', '남주를 노리는 또 다른 약혼 후보',
  '전생의 트라우마가 부르는 불신', '저주·예언이 드리운 파멸의 그림자',
  '국경을 노리는 적국과 임박한 전쟁', '왕실의 인정을 받지 못한 출생의 비밀',
  '그녀를 제거하려는 황실 비밀 조직', '두 사람을 갈라놓으려는 가문 간의 오랜 원한',
]
const POOL_TWIST = [
  '천대받던 그녀가 사실 잊힌 황실의 정통 혈통이었다', '회귀·빙의의 비밀을 남주가 알면서도 끝까지 지켜주고 있었다',
  '남주 역시 회귀자였고, 두 사람의 전생이 얽혀 있었다', '원작의 진짜 흑막은 여주인공이라 믿었던 인물이었다',
  '여주가 예언 속 성녀(혹은 신의 자손)임이 드러난다', '죽은 줄 알았던 가족이 신분을 숨긴 채 살아 있었다',
  '그녀를 파멸시킨 전생의 배신자가 이번 생에선 가장 충실한 아군이 된다',
  '그녀가 빙의한 몸의 원래 주인이 의식 속에 살아 있었다', '전생의 비극을 꾸민 진범이 가장 가까운 가족이었다',
  '그녀가 읽은 원작에는 숨겨진 진짜 결말이 따로 있었다', '남주의 저주를 풀 열쇠가 처음부터 그녀 자신이었다',
]
const POOL_ENDING = [
  '황후로 즉위해 곁에 선 남주와 제국을 함께 다스린다', '모든 음모를 청산하고 두 사람만의 영지에서 행복을 누린다',
  '파멸 플래그를 전부 비틀어 원작과 정반대의 해피엔딩을 맞는다', '결혼과 함께 외전에서 달달한 후일담·육아가 이어진다',
  '폐위된 자리를 되찾고 자신을 버린 자들 위에 군림한다', '저주를 끊어내고 사랑하는 이와 평범하지만 충만한 일상을 얻는다',
  '대륙 제일의 상단주가 되어 남주와 함께 세상을 누빈다', '예언을 완성한 성녀로 추앙받으며 새 시대를 연다',
  '누명을 모두 벗고 명예롭게 복권되어 정혼자와 맺어진다', '두 나라의 평화를 맺는 황후가 되어 전쟁을 끝낸다',
]
const POOL_THEME = [
  '사랑받을 자격은 누가 정해주는 것이 아니라 스스로 증명하는 것이다', '정해진 운명도 의지 앞에서는 다시 쓰일 수 있다',
  '진짜 고귀함은 혈통이 아니라 끝까지 굴하지 않는 마음에서 온다', '용서받지 못할 모욕도 통쾌한 정산으로 청산된다',
  '진심은 가장 차가운 사람의 온도마저 바꾼다', '두 번째 삶은 같은 실수를 반복하지 않을 기회다',
  '구원은 받는 것이 아니라 서로에게 건네는 것이다', '존엄은 빼앗길 수 있어도 스스로 포기하지 않는 한 사라지지 않는다',
  '복수의 끝에서 비로소 자신을 위한 삶이 시작된다', '두려움을 마주한 자만이 자기 운명의 주인이 된다',
]

// ── 관계 골격 자동 생성기: 슬롯 정의(잠금/재생성용) ──
interface GenSlot { key: keyof Draft; label: string; icon: string; pool: string[] }
const GEN_SLOTS: GenSlot[] = [
  { key: 'heroine', label: '여주(신분·정체)', icon: '👸', pool: POOL_HEROINE },
  { key: 'weapon', label: '여주의 무기', icon: '🗝️', pool: POOL_WEAPON },
  { key: 'past', label: '전생/원작의 비극', icon: '🥀', pool: POOL_PAST },
  { key: 'goal', label: '여주의 목표', icon: '🎯', pool: POOL_GOAL },
  { key: 'male', label: '남주(신분·정체)', icon: '🤴', pool: POOL_MALE },
  { key: 'maleType', label: '남주 유형', icon: '🖤', pool: POOL_MALETYPE },
  { key: 'trope', label: '관계 동력(트로프)', icon: '💞', pool: POOL_TROPE },
  { key: 'bitter', label: '고구마(억울·모욕)', icon: '🍠', pool: POOL_BITTER },
  { key: 'cider', label: '사이다(통쾌한 역전)', icon: '🥤', pool: POOL_CIDER },
  { key: 'barrier', label: '장벽', icon: '🧱', pool: POOL_BARRIER },
  { key: 'twist', label: '반전', icon: '🔮', pool: POOL_TWIST },
  { key: 'ending', label: '결말(HEA)', icon: '💍', pool: POOL_ENDING },
  { key: 'theme', label: '주제', icon: '✨', pool: POOL_THEME },
]

// 조합수 = (도입5 × 무대5 × 톤5) × 13개 슬롯 풀 크기의 곱
const COMBOS = (() => {
  let n = START_KEYS.length * STAGE_KEYS.length * TONE_KEYS.length
  for (const s of GEN_SLOTS) n *= s.pool.length
  return n
})()
const fmtCombos = (n: number): string => {
  // 1조 이상이면 "조/억" 단위로 가독성 있게.
  if (n >= 1e12) return (n / 1e12).toFixed(n >= 1e13 ? 0 : 1).replace(/\.0$/, '') + '조 이상'
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, '') + '억 이상'
  return n.toLocaleString('ko-KR')
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

// ───────────────────────── 자작 예시(입력 자동 채움) ─────────────────────────
interface Example extends Draft { title: string }
const EXAMPLES: Example[] = [
  {
    title: '냉궁에서 다시, 황후의 회귀',
    start: 'regression', stage: 'west', tone: 'cider',
    heroine: '독살당하기 직전으로 회귀한 폐황후 아리아드네',
    weapon: '처형 직전까지 본 정쟁의 전말과 배신자들의 명단',
    past: '믿었던 황제에게 누명을 쓰고 냉궁에서 독살당했다',
    goal: '이번엔 황제와의 결혼을 피하고 조용히 이혼해 자유로워지는 것',
    male: '냉혹하기로 소문난 황제 카이엔',
    maleType: '오직 그녀에게만 약해지는 집착광공',
    trope: '정략결혼으로 맺어졌으나 그녀가 먼저 이혼을 원하는 역(逆)전개',
    bitter: '사교계가 한미한 친정을 들먹이며 황후 자격을 비웃는다',
    cider: '무도회에서 정적의 반역 증거를 만인 앞에 펼쳐 단죄한다',
    barrier: '원작에서 황후가 될 예정인 후작영애의 집요한 방해',
    twist: '황제 역시 같은 시점으로 회귀한 회귀자였고, 그녀를 잃은 전생을 후회하고 있었다',
    ending: '이혼을 청한 그녀에게 황제가 황후의 관 대신 진심을 바치며 제국을 함께 다스린다',
    theme: '두 번째 삶은 같은 실수를 반복하지 않을 기회다',
    tpl: 0,
  },
  {
    title: '악역영애의 파멸 플래그 회피기',
    start: 'villainess', stage: 'magic', tone: 'comic',
    heroine: '처형당할 운명의 악역 공작영애 레티시아',
    weapon: '내가 읽던 소설의 모든 전개를 아는 원작 지식',
    past: '원작 소설 속 악역으로서 여주인공을 괴롭히다 단두대에 올랐다',
    goal: '파멸 플래그를 전부 피하고 호감도·평판을 재설계해 살아남는 것',
    male: '원작의 진짜 주인공인 황태자 에드윈',
    maleType: '무심한 듯 하나하나 챙기는 츤데레',
    trope: '악역답게 거리를 두려는데 자꾸 가까워지는 적에서 연인으로',
    bitter: '원작 강제력이 그녀를 자꾸 악행의 자리로 떠민다',
    cider: '되살린 마법 재능으로 아카데미 시험에서 만인을 압도한다',
    barrier: '원작에서 그와 맺어질 예정인 성녀 후보 여주인공',
    twist: '천대받던 그녀가 사실 봉인된 고대 마법사의 정통 혈통이었다',
    ending: '원작과 정반대로, 살아남은 그녀가 황태자비가 되어 외전에서 달달한 일상을 누린다',
    theme: '정해진 운명도 의지 앞에서는 다시 쓰일 수 있다',
    tpl: 1,
  },
  {
    title: '다시 태어난 대공가의 외동딸',
    start: 'reincarnation', stage: 'parenting', tone: 'healing',
    heroine: '전생의 기억을 가진 채 다시 태어난 대공가의 외동딸 에스텔',
    weapon: '사람의 거짓과 진심을 꿰뚫어 보는 전생의 통찰',
    past: '전생에 가족 없이 외롭게 스러졌다',
    goal: '이번 생에선 차갑고 무서운 보호자들의 진짜 가족이 되는 것',
    male: '저주받았다는 소문의 흑발 대공이자 그녀의 양아버지',
    maleType: '겉은 냉정하나 속은 한없이 헌신적인 딸바보',
    trope: '딸바보 보호자들이 어린 그녀의 혀 짧은 말에 차례로 함락된다',
    bitter: '가문의 어른들이 그녀를 정략의 도구로만 보려 한다',
    cider: '어린 그녀가 숨겨둔 능력으로 가문을 노린 음모를 무너뜨린다',
    barrier: '대공가를 노리는 친척들의 상속 음모와 저주의 그림자',
    twist: '그녀의 미소가 대공가에 드리운 오래된 저주를 풀어낸다',
    ending: '저주를 끊어내고 따뜻한 가족과 충만한 일상을 얻는다',
    theme: '진짜 고귀함은 혈통이 아니라 끝까지 굴하지 않는 마음에서 온다',
    tpl: 5,
  },
]

// ───────────────────────── 저장 항목 ─────────────────────────
interface Saved { id: string; title: string; draft: Draft; text: string; createdAt: number }

function newId(prefix = 's'): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return prefix + '_' + crypto.randomUUID() } catch { /* noop */ }
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function blankDraft(): Draft {
  return {
    start: 'regression', stage: 'west', tone: 'cider',
    heroine: '', weapon: '', past: '', goal: '', male: '', maleType: '',
    trope: '', bitter: '', cider: '', barrier: '', twist: '', ending: '', theme: '',
    tpl: 0,
  }
}

function normDraft(x: unknown): Draft {
  const o = (x || {}) as Partial<Draft>
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  return {
    start: START_KEYS.includes(o.start as StartKey) ? (o.start as StartKey) : 'regression',
    stage: STAGE_KEYS.includes(o.stage as StageKey) ? (o.stage as StageKey) : 'west',
    tone: TONE_KEYS.includes(o.tone as ToneKey) ? (o.tone as ToneKey) : 'cider',
    heroine: str(o.heroine), weapon: str(o.weapon), past: str(o.past), goal: str(o.goal),
    male: str(o.male), maleType: str(o.maleType), trope: str(o.trope),
    bitter: str(o.bitter), cider: str(o.cider), barrier: str(o.barrier),
    twist: str(o.twist), ending: str(o.ending), theme: str(o.theme),
    tpl: Number.isFinite(o.tpl) && (o.tpl as number) >= 0 && (o.tpl as number) < TEMPLATES.length ? (o.tpl as number) : 0,
  }
}

function loadState(): { cur: Draft; saved: Saved[]; locked: Record<string, boolean> } {
  try {
    const raw = localStorage.getItem(LS)
    if (!raw) return { cur: blankDraft(), saved: [], locked: {} }
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
    const locked: Record<string, boolean> = {}
    if (p?.locked && typeof p.locked === 'object') {
      for (const s of GEN_SLOTS) if (p.locked[s.key]) locked[s.key] = true
    }
    return { cur, saved, locked }
  } catch {
    return { cur: blankDraft(), saved: [], locked: {} }
  }
}

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 본문 HTML(프로젝트 문서용) — 시놉시스 + 항목별 정리.
function bodyHtmlOf(d: Draft, text: string): string {
  const st = STARTS.find((x) => x.key === d.start)!
  const sg = STAGES.find((x) => x.key === d.stage)!
  const tn = TONES.find((x) => x.key === d.tone)!
  const row = (label: string, v: string) => (v && v.trim() ? `<p><b>${escHtml(label)}:</b> ${escHtml(v.trim())}</p>` : '')
  const paras = text.split('\n').filter(Boolean).map((p) => `<p>${escHtml(p)}</p>`).join('')
  return [
    `<p><b>유형:</b> ${escHtml(st.label)} · ${escHtml(sg.label)} · ${escHtml(tn.label)}</p>`,
    `<hr/>`,
    `<p style="font-size:14px;line-height:1.7;"><b>시놉시스</b></p>`,
    paras,
    `<hr/>`,
    row('여주(신분·정체)', d.heroine),
    row('여주의 무기', d.weapon),
    row('전생/원작의 비극', d.past),
    row('여주의 목표', d.goal),
    row('남주(신분·정체)', d.male),
    row('남주 유형', d.maleType),
    row('관계 동력(트로프)', d.trope),
    row('고구마(억울·모욕)', d.bitter),
    row('사이다(통쾌한 역전)', d.cider),
    row('장벽', d.barrier),
    row('반전', d.twist),
    row('결말(HEA)', d.ending),
    row('주제', d.theme),
  ].filter(Boolean).join('')
}

// ───────────────────────── 컴포넌트 ─────────────────────────
export default function RomfanSynopsis({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [cur, setCur] = useState<Draft>(init.current.cur)
  const [saved, setSaved] = useState<Saved[]>(init.current.saved)
  const [locked, setLocked] = useState<Record<string, boolean>>(init.current.locked)
  const [title, setTitle] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [showEx, setShowEx] = useState(false)
  const [showGen, setShowGen] = useState(true)
  const [copied, setCopied] = useState('')
  const [note, setNote] = useState('')

  const mounted = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mounted.current = true
    try {
      const g = payload && typeof payload.genre === 'string' ? (payload.genre as string) : ''
      const isEmpty = !init.current.cur.heroine && !init.current.cur.male && !init.current.cur.goal
      if (g && isEmpty) flashNote(`‘${g}’ 맥락으로 시작합니다. 칸을 채우거나 🎲 골격 생성으로 한 판 굴려보세요.`)
    } catch { /* noop */ }
    return () => {
      mounted.current = false
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동 저장(입력·저장목록·잠금)
  useEffect(() => {
    try {
      localStorage.setItem(LS, JSON.stringify({ cur, saved, locked }))
    } catch {
      if (mounted.current) flashNote('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.')
    }
  }, [cur, saved, locked])

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
  const hasInput = !!(cur.heroine || cur.male || cur.goal || cur.weapon || cur.trope || cur.twist || cur.ending || cur.theme || cur.past)
  const lockedCount = GEN_SLOTS.filter((s) => locked[s.key]).length

  // ── 관계 골격 자동 생성기: 잠긴 슬롯은 유지, 나머지만 무작위 ──
  const rollAll = () => {
    setCur((p) => {
      const next: Draft = { ...p }
      for (const s of GEN_SLOTS) {
        if (locked[s.key] && (p[s.key] as string)) continue
        let v = pick(s.pool)
        if (v === (p[s.key] as string) && s.pool.length > 1) v = pick(s.pool)
        ;(next[s.key] as string) = v
      }
      return next
    })
    flashNote('관계 골격을 굴렸습니다. 잠긴 슬롯은 그대로 유지됩니다.')
  }
  const rollOne = (key: keyof Draft) => {
    const s = GEN_SLOTS.find((x) => x.key === key)
    if (!s) return
    setCur((p) => {
      let v = pick(s.pool)
      if (v === (p[key] as string) && s.pool.length > 1) v = pick(s.pool)
      return { ...p, [key]: v }
    })
  }
  const toggleLock = (key: keyof Draft) => setLocked((p) => ({ ...p, [key]: !p[key] }))

  const copy = async (txt: string, tag: string) => {
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(txt)
      else throw new Error('no clipboard')
      flashCopied(tag)
    } catch { flashNote('복사에 실패했습니다. 직접 선택해 복사하세요.') }
  }

  const applyExample = (ex: Example) => {
    const { title: _t, ...d } = ex
    void _t
    setCur(normDraft(d))
    setShowEx(false)
    setEditId(null)
    setTitle('')
    flashNote(`「${ex.title}」 예시를 입력에 채웠습니다.`)
  }

  const saveCurrent = () => {
    const rec: Saved = {
      id: editId || newId(),
      title: title.trim() || (cur.heroine.trim() ? cur.heroine.trim().slice(0, 24) : '제목 없는 시놉시스'),
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
    setCur((p) => ({ ...blankDraft(), start: p.start, stage: p.stage, tone: p.tone, tpl: p.tpl }))
    setEditId(null); setTitle('')
    flashNote('입력을 비웠습니다.')
  }

  // ── 연계: 프로젝트 〈기획〉 폴더에 시놉시스 문서 추가 ──
  const toProject = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const st = STARTS.find((x) => x.key === cur.start)!
    const sg = STAGES.find((x) => x.key === cur.stage)!
    const tn = TONES.find((x) => x.key === cur.tone)!
    const docTitle = title.trim() || (cur.heroine.trim() ? cur.heroine.trim().slice(0, 24) : '시놉시스')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '기획',
      title: `시놉시스 — ${docTitle}`,
      bodyHtml: bodyHtmlOf(cur, text),
      synopsis: text.split('\n')[0]?.slice(0, 120),
      meta: { 장르: '로맨스판타지', 도입: st.label, 무대: sg.label, 어조: tn.label, 틀: TEMPLATES[cur.tpl].name },
    })
    flashNote(id ? '프로젝트 자료 〈기획〉 폴더에 시놉시스 문서를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ── 연계: 글감 보관함에 스니펫 저장 ──
  const toLibrary = () => {
    addToLibrary('snippets', {
      text,
      source: '로판 시놉시스 빌더',
      tags: ['시놉시스', '로맨스판타지', STARTS.find((x) => x.key === cur.start)!.label, TONES.find((x) => x.key === cur.tone)!.label],
    })
    flashNote('생성한 시놉시스를 글감 보관함에 저장했습니다.')
  }

  // ── 연계: 여주/남주를 인물 라이브러리로 ──
  const heroineToLibrary = () => {
    if (!cur.heroine.trim() && !cur.weapon.trim()) { flashNote('먼저 여주 칸을 채워주세요.'); return }
    addToLibrary('characters', {
      name: cur.heroine.trim() || '여주인공',
      role: '여주인공',
      goal: cur.goal.trim(),
      secret: cur.weapon.trim(),
      notes: [cur.past && `전생/원작: ${cur.past}`, cur.bitter && `고구마: ${cur.bitter}`].filter(Boolean).join('\n'),
      fields: {
        name: cur.heroine.trim() || '여주인공',
        role: '여주인공',
        goal: cur.goal.trim(),
        motivation: cur.goal.trim(),
        secret: cur.weapon.trim(),
        background: cur.past.trim(),
        notes: [cur.bitter && `고구마(억울·모욕): ${cur.bitter.trim()}`, cur.barrier && `장벽: ${cur.barrier.trim()}`, cur.twist && `반전: ${cur.twist.trim()}`].filter(Boolean).join('\n'),
      },
      source: '로판 시놉시스 빌더',
    })
    flashNote('여주를 인물 라이브러리에 저장했습니다.')
  }
  const maleToLibrary = () => {
    if (!cur.male.trim() && !cur.maleType.trim()) { flashNote('먼저 남주 칸을 채워주세요.'); return }
    addToLibrary('characters', {
      name: cur.male.trim() || '남주인공',
      role: '남주인공',
      personality: cur.maleType.trim(),
      notes: cur.trope && `관계 동력: ${cur.trope}`,
      fields: {
        name: cur.male.trim() || '남주인공',
        role: '남주인공',
        personality: cur.maleType.trim(),
        relations: cur.trope.trim() ? `여주와의 관계 동력(트로프): ${cur.trope.trim()}` : '',
        notes: cur.barrier.trim() ? `장벽: ${cur.barrier.trim()}` : '',
      },
      source: '로판 시놉시스 빌더',
    })
    flashNote('남주를 인물 라이브러리에 저장했습니다.')
  }

  // ───────────────────────── 스타일 ─────────────────────────
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
    background: active ? 'rgba(0,0,0,0.04)' : 'var(--chrome-2)', color: 'var(--text)',
    display: 'flex', flexDirection: 'column', gap: 2,
  })
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '4px 7px', borderRadius: 7 }
  const savedRow: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }
  const emptyBox: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '18px 10px', border: '1px dashed var(--border)', borderRadius: 10 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }
  const genRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 9, padding: '7px 9px' }

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
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="👑" /> 로판 시놉시스 빌더</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>회빙환·여주의 무기·남주 유형·트로프·사이다 → 로판 시놉시스</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="minibtn" onClick={() => setShowGen((v) => !v)}>{showGen ? '생성기 접기' : <><Emoji e="🎲" /> 골격 생성기</>}</button>
          <button className="minibtn" onClick={() => setShowEx((v) => !v)}>{showEx ? '예시 닫기' : <><Emoji e="📚" /> 작품 예시</>}</button>
        </div>
      </div>

      <div style={body}>
        {note && (
          <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>{emojify(note)}</div>
        )}

        {/* 관계 골격 자동 생성기 */}
        {showGen && (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <h4 style={{ ...sectionTitle, margin: 0 }}><Emoji e="🎲" /> 관계 골격 자동 생성기</h4>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmtCombos(COMBOS)}</b> 가지
                {lockedCount > 0 ? <> · <Emoji e="🔒" /> {lockedCount}개 고정</> : ''}
              </span>
              <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={rollAll}>전체 굴리기</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 7 }}>
              {GEN_SLOTS.map((s) => {
                const v = cur[s.key] as string
                const isLocked = !!locked[s.key]
                return (
                  <div key={s.key} style={genRow}>
                    <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}><Emoji e={s.icon} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{s.label} <span style={{ opacity: 0.6 }}>({s.pool.length})</span></div>
                      <div style={{ fontSize: 12.5, lineHeight: 1.35, color: v ? 'var(--text)' : 'var(--muted)', wordBreak: 'keep-all' }}>{v || '— 비어 있음 —'}</div>
                    </div>
                    <button style={iconBtn} title="이 슬롯만 다시 굴리기" onClick={() => rollOne(s.key)} disabled={isLocked}><Emoji e="🎲" /></button>
                    <button style={{ ...iconBtn, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }} title={isLocked ? '고정 해제' : '이 슬롯 고정'} onClick={() => toggleLock(s.key)} aria-pressed={isLocked}>{isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
                  </div>
                )
              })}
            </div>
            <div style={{ ...hint, marginTop: 8 }}>슬롯을 굴려 골격을 잡은 뒤, 아래 입력칸에서 자유롭게 다듬으세요. 마음에 드는 슬롯은 <Emoji e="🔒" />로 고정합니다.</div>
          </div>
        )}

        {/* 작품 예시 */}
        {showEx && (
          <div style={card}>
            <h4 style={sectionTitle}>로판 예시 — 눌러 입력에 채우기</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EXAMPLES.map((ex) => (
                <div key={ex.title} style={{ ...savedRow, gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>「{ex.title}」</b>
                    <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>
                      {STARTS.find((t) => t.key === ex.start)?.label} · {STAGES.find((s) => s.key === ex.stage)?.label}
                    </span>
                    <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => applyExample(ex)}>이 예시 쓰기</button>
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--muted)', wordBreak: 'keep-all' }}>{ex.past}.</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 유형 선택 */}
        <div style={card}>
          <h4 style={sectionTitle}>도입 장치 · 무대 · 어조</h4>
          <div style={{ marginBottom: 10 }}>
            <span style={fieldLabel}>도입 장치 (회빙환)</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STARTS.map((t) => (
                <button key={t.key} onClick={() => setField('start', t.key)} style={chip(cur.start === t.key)} title={t.desc}>{t.label}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <span style={fieldLabel}>무대 (하위장르)</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STAGES.map((s) => (
                <button key={s.key} onClick={() => setField('stage', s.key)} style={chip(cur.stage === s.key)} title={s.q}>{s.label}</button>
              ))}
            </div>
          </div>
          <div>
            <span style={fieldLabel}>어조 (톤)</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TONES.map((t) => (
                <button key={t.key} onClick={() => setField('tone', t.key)} style={chip(cur.tone === t.key)} title={t.desc}>{t.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* 입력 */}
        <div style={card}>
          <h4 style={sectionTitle}>{editId ? <><Emoji e="✏️" /> 수정 중</> : '구성 요소 입력'}</h4>
          <div style={{ marginBottom: 10 }}>
            <Field k="past" label="프롤로그 — 전생/원작의 비극 (충격적 도입)" ph="예: 믿었던 황제에게 누명을 쓰고 냉궁에서 독살당했다" ml={200} area />
          </div>
          <div style={{ ...twoRow, marginBottom: 10 }}>
            <div style={col}><Field k="heroine" label="여주 (신분·정체)" ph="예: 독살 직전으로 회귀한 폐황후 아리아드네" /></div>
            <div style={col}><Field k="weapon" label="여주의 무기 (미래지식·능력·경영·정치)" ph="예: 처형 직전까지 본 정쟁의 전말" /></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="goal" label="여주의 목표 (생존·이혼·복수·자유)" ph="예: 이번엔 결혼을 피하고 조용히 이혼해 자유로워지는 것" ml={180} />
          </div>
          <div style={{ ...twoRow, marginBottom: 10 }}>
            <div style={col}><Field k="male" label="남주 (신분·정체)" ph="예: 냉혹하기로 소문난 황제 카이엔" /></div>
            <div style={col}><Field k="maleType" label="남주 유형 (집착광공·다정·츤데레…)" ph="예: 오직 그녀에게만 약해지는 집착광공" /></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="trope" label="관계 동력 (트로프 — 계약결혼·적에서 연인 등)" ph="예: 정략결혼했으나 그녀가 먼저 이혼을 원하는 역전개" ml={180} />
          </div>
          <div style={{ ...twoRow, marginBottom: 10 }}>
            <div style={col}><Field k="bitter" label="고구마 (억울·모욕·오해의 원천)" ph="예: 사교계가 한미한 친정을 들먹이며 비웃는다" ml={180} /></div>
            <div style={col}><Field k="cider" label="사이다 (통쾌한 역전·공개 망신)" ph="예: 무도회에서 정적의 반역 증거를 만인 앞에 펼친다" ml={180} /></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="barrier" label="장벽 (라이벌·정치·신분·원작 강제력)" ph="예: 원작에서 황후가 될 예정인 후작영애의 방해" ml={180} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="twist" label="반전 (비밀 폭로·숨겨진 혈통·운명 전복)" ph="예: 황제 역시 회귀자였고 전생의 그녀를 후회하고 있었다" ml={220} area />
          </div>
          <div style={{ ...twoRow, marginBottom: 10 }}>
            <div style={col}><Field k="ending" label="결말·HEA (즉위·결혼·외전 달달)" ph="예: 이혼을 청한 그녀에게 황제가 진심을 바치며 함께 제국을 다스린다" ml={200} /></div>
            <div style={col}><Field k="theme" label="주제" ph="예: 정해진 운명도 의지 앞에서는 다시 쓰일 수 있다" ml={160} /></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => copy(text, 'main')}>{copied === 'main' ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}</button>
          </div>
          <div style={synBox}>{text}</div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <input style={{ ...input, flex: 1, minWidth: 180 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="저장 제목 (비우면 여주 이름으로 자동)" maxLength={60} />
            <button className="btn-primary" onClick={saveCurrent}>{editId ? '수정 저장' : <><Emoji e="💾" /> 저장</>}</button>
            {editId && <button className="minibtn" onClick={() => { setEditId(null); setTitle('') }}>새 항목으로</button>}
          </div>

          {/* 연계 버튼 */}
          <div className="linkbar" style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
            <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '현재 시놉시스를 프로젝트 자료 〈기획〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={toLibrary} title="생성한 시놉시스를 글감 보관함에 저장"><Emoji e="⭐" /> 글감 보관</button>
            <button className="linkbtn" onClick={heroineToLibrary} title="여주를 인물 라이브러리에 저장"><Emoji e="👸" /> 여주 저장</button>
            <button className="linkbtn" onClick={maleToLibrary} title="남주를 인물 라이브러리에 저장"><Emoji e="🤴" /> 남주 저장</button>
            <button className="linkbtn" onClick={() => openToolLinked('romfan-charforge', { genre: '로맨스판타지', seed: cur.heroine })} title="로판 캐릭터를 만들러 가기"><Emoji e="🎭" /> 로판 캐릭터</button>
            <button className="linkbtn" onClick={() => openToolLinked('romfan-outline', { genre: '로맨스판타지' })} title="장/막 개요로 펼치기"><Emoji e="🗂️" /> 로판 개요</button>
            <button className="linkbtn" onClick={() => openToolLinked('romfan-signature', { genre: '로맨스판타지' })} title="로판 전개 시그니처 생성기 열기"><Emoji e="⚙️" /> 전개 생성기</button>
          </div>
        </div>

        {/* 저장 목록(CRUD) */}
        <div style={card}>
          <h4 style={sectionTitle}>저장한 시놉시스 · {saved.length}건</h4>
          {saved.length === 0 ? (
            <div style={emptyBox}>
              아직 저장한 시놉시스가 없습니다.<br />
              요소를 채우고 <b>저장</b>을 누르면 여기에 모입니다.<br />
              <span style={{ fontSize: 12 }}>막막하다면 상단의 <b><Emoji e="🎲" /> 골격 생성기</b> 또는 <b><Emoji e="📚" /> 작품 예시</b>로 시작하세요.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {saved.map((s, i) => (
                <div key={s.id} style={{ ...savedRow, border: '1px solid ' + (editId === s.id ? 'var(--accent)' : 'var(--border)') }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>{s.title || '(제목 없음)'}</b>
                    <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>
                      {STARTS.find((t) => t.key === s.draft.start)?.label || '도입'} · {TONES.find((t) => t.key === s.draft.tone)?.label || '톤'}
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
          로판 시놉시스는 “왜 이 상황인지(프롤로그·회빙환)→여주가 무엇으로 어떻게 운명을 비트는지→고구마를 사이다로 청산하고 HEA에 이르는지”를
          한 호흡에 보여주는 설계도입니다. 고구마는 짧게·사이다는 확실히, 남주의 ‘온리 유’와 여주의 주체성을 잊지 마세요. 입력·저장은 이 브라우저에 자동 저장됩니다.
        </div>

        {/* 저작권: 모든 문구는 본 도구가 자체 생성한 창작 풀(외부 텍스트 미사용) */}
        <div className="license-note" style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.4 }}>
          <span className="license-badge">자체 창작</span> 모든 슬롯·예시 문구는 이 도구가 로판 장르 통념에 근거해 자체 작성한 오리지널 풀로, 외부 저작물을 사용하지 않습니다.
        </div>
      </div>
    </div>
  )
}
