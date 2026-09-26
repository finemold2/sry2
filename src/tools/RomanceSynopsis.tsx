// 로맨스 시놉시스 빌더 — 로맨스 장르의 핵심 계약(HEA/HFN, 관계 중심, 정서 카타르시스)에 맞춘
// 항목(두 주인공·만남·엮임 장치·끌림과 장벽·밀당·절망의 순간·대형 고백·관능도·결말 톤)을 채우면
// 로맨스다운 시놉시스를 여러 문체 틀로 자동 종합한다.
// 하위유형(현대·로판·악역영애·회빙환·계약/위장·후회/집착·BL/GL·뉴어덜트)과 점화 속도(슬로우번/인스타),
// 결말(HEA/HFN/외전형)을 고르면 그 결에 맞춘 도입·전개·결구를 자동 조립한다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크 없음(전부 로컬·자작 데이터, 로맨스 도시에 근거).
// 모든 입력/저장은 localStorage 'sry:tool:romance-synopsis' 에 JSON 으로 자동 저장·복원. 언마운트 시 타이머 정리.
// 연계: addToProject(folder:'기획','시놉시스') · addToLibrary('snippets', ...) · openToolLinked(설정집·캐릭터·플롯 등).
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'romance-synopsis',
  name: '로맨스 시놉시스 빌더',
  icon: '💞',
  group: '구조',
  genre: '로맨스',
  intro: '두 주인공·첫 만남·엮임 장치·끌림과 장벽·밀당·절망의 순간·대형 고백·관능도·결말을 채워 로맨스 시놉시스를 자동 종합합니다',
  w: 720,
  h: 680,
}

const LS = 'sry:tool:romance-synopsis'

// ---------- 타입 ----------
type SubKey = 'contemp' | 'romanceF' | 'villainess' | 'regress' | 'contract' | 'regret' | 'newadult' | 'blgl'
type HeatKey = 'clean' | 'sweet' | 'sensual' | 'steamy' | 'explicit'
type BurnKey = 'insta' | 'slowburn' | 'secondchance' | 'forbidden' | 'pushpull'
type EndKey = 'hea' | 'hfn' | 'epilogue' | 'cathartic' | 'bittersweet'
type DynKey = 'e2l' | 'f2l' | 'opposites' | 'forced' | 'fakedating' | 'pursuit' | 'protect' | 'rivals'

interface Draft {
  leadA: string        // 주인공 A(시점 인물)
  leadB: string        // 주인공 B(상대역)
  meetCute: string     // 첫 만남(밋큐트)
  bind: string         // 둘을 엮는 장치(계약·동거·임무·빙의 등)
  attraction: string   // 끌림의 근거(왜 하필 이 사람)
  barrier: string      // 장벽(신분·비밀·오해·외부 압력)
  pushpull: string     // 밀당·갈망의 양상
  blackMoment: string  // 절망의 순간(All Is Lost)
  grandGesture: string // 대형 고백·증명 행위
  theme: string        // 주제(사랑이 던지는 질문)
  sub: SubKey
  heat: HeatKey
  burn: BurnKey
  dyn: DynKey
  end: EndKey
  tpl: number          // 선택한 종합 틀
}

// ---------- 하위유형(도시에의 1·2차 분기 그대로) ----------
const SUBS: { key: SubKey; label: string; desc: string; tag: string }[] = [
  { key: 'contemp', label: '현대 로맨스', desc: '재벌·사내연애·계약연애 등 현실 배경의 컨템퍼러리(노라 로버츠 계열)', tag: '컨템퍼러리' },
  { key: 'romanceF', label: '로맨스 판타지(정통)', desc: '서구풍 가상 제국·귀족 사회 + 정략혼 + 황실 정치(브리저튼·로판)', tag: '황실·로판' },
  { key: 'villainess', label: '악역 영애물', desc: '원작 악녀로 빙의해 파멸 플래그를 피하며 사랑을 얻는다(재혼황후 계열)', tag: '악녀·파멸 회피' },
  { key: 'regress', label: '회귀·빙의·환생물', desc: '결말을 아는 정보 비대칭으로 비극을 알면서 다시 그를 만난다', tag: '회·빙·환' },
  { key: 'contract', label: '계약·위장 연애', desc: '계약결혼·가짜 연인 — “가짜인데 진짜가 되어버린” 전환점이 백미', tag: '가짜→진짜' },
  { key: 'regret', label: '후회·집착물', desc: '버린 뒤 뒤늦게 매달리는 후회남주, 혹은 과도한 독점욕의 집착남주', tag: '후회·얀데레' },
  { key: 'newadult', label: '뉴어덜트·이슈 드리븐', desc: '트라우마·관계 회복 등 무거운 소재의 청년 로맨스(콜린 후버 계열)', tag: '치유·성장' },
  { key: 'blgl', label: 'BL·GL', desc: '동성 로맨스 — 로맨스 서사 규약을 공유하되 별도 관습 체계', tag: '동성 로맨스' },
]
function subDef(k: SubKey) { return SUBS.find((s) => s.key === k) || SUBS[0] }

// ---------- 관계 역학(도시에 §3의 핵심 장치) ----------
const DYNS: { key: DynKey; label: string; desc: string; phrase: string }[] = [
  { key: 'e2l', label: '적에서 연인으로', desc: '적대 → 오해 → 재평가 → 결합(오만과 편견의 원형)', phrase: '서로를 못 견뎌하던 두 사람' },
  { key: 'f2l', label: '친구에서 연인으로', desc: '오래 곁에 있던 사이가 선을 넘는 순간의 두근거림', phrase: '오랜 시간 곁에 있던 두 사람' },
  { key: 'opposites', label: '정반대 끌림', desc: '얼음과 불 — 다른 두 세계가 서로에게 끌린다', phrase: '도무지 어울리지 않는 두 사람' },
  { key: 'forced', label: '강제 동거·밀착', desc: '한 침대만 남은 여관·폭설·위장 부부 — 물리적으로 묶여 감정이 발생', phrase: '같은 공간에 갇힌 두 사람' },
  { key: 'fakedating', label: '가짜 연인', desc: '계약·위장으로 시작했으나 진짜가 되어버리는 연기', phrase: '거짓으로 시작한 두 사람' },
  { key: 'pursuit', label: '일방적 구애·매달림', desc: '한쪽의 집요한 구애·후회의 매달림(권력 역전의 카타르시스)', phrase: '먼저 마음을 내건 한 사람' },
  { key: 'protect', label: '수호자·지킴', desc: '한쪽이 목숨·지위를 걸고 다른 한쪽을 지켜낸다', phrase: '지키는 자와 지켜지는 자' },
  { key: 'rivals', label: '연적·삼각', desc: '라이벌·과거 연인의 등장이 진심을 자각시키는 질투의 촉매', phrase: '제삼자 사이에 놓인 두 사람' },
]
function dynDef(k: DynKey) { return DYNS.find((d) => d.key === k) || DYNS[0] }

// ---------- 점화 속도(도시에: 슬로우번/인스타러브 등) ----------
const BURNS: { key: BurnKey; label: string; desc: string }[] = [
  { key: 'slowburn', label: '슬로우번', desc: '긴장을 천천히 누적 — 장편·로판의 주력. 닿을 듯 닿지 않는 갈망' },
  { key: 'insta', label: '인스타러브', desc: '첫눈에 반함 — 단편·카테고리물의 빠른 결합' },
  { key: 'secondchance', label: '재회·세컨드 찬스', desc: '헤어졌던 두 사람이 다시 만나 묵은 감정을 마주한다' },
  { key: 'forbidden', label: '금지된 사랑', desc: '신분·금기·계율이 가로막아 끌릴수록 위태로워진다' },
  { key: 'pushpull', label: '밀당 진자', desc: '한 발 다가가면 두 발 물러서는 끌림과 회피의 진자 운동' },
]
function burnDef(k: BurnKey) { return BURNS.find((b) => b.key === k) || BURNS[0] }

// ---------- 관능도(도시에: heat level — 사전 합의된 약속) ----------
const HEATS: { key: HeatKey; label: string; desc: string }[] = [
  { key: 'clean', label: '클린(키스 없음)', desc: '신체 접촉 최소 — 설렘·시선·감정 중심' },
  { key: 'sweet', label: '스위트(키스까지)', desc: '키스·포옹까지. 가장 폭넓은 독자층' },
  { key: 'sensual', label: '센슈얼(암시)', desc: '관능을 암시하되 직접 묘사는 문을 닫는다(fade to black)' },
  { key: 'steamy', label: '스티미(노출)', desc: '정사 장면을 적극적으로 묘사하는 성인 로맨스' },
  { key: 'explicit', label: '익스플리싯(노골)', desc: '에로티카에 가까운 노골적 묘사(50가지 그림자 계열)' },
]
function heatDef(k: HeatKey) { return HEATS.find((h) => h.key === k) || HEATS[0] }

// ---------- 결말 톤(로맨스 계약: HEA/HFN 보장) ----------
const ENDS: { key: EndKey; label: string; desc: string; close: string }[] = [
  { key: 'hea', label: 'HEA(영원한 행복)', desc: '결혼·평생의 약속으로 완전히 맺어진다', close: '두 사람은 마침내 같은 미래를 약속하고, 오래도록 서로의 곁에 머문다.' },
  { key: 'hfn', label: 'HFN(지금의 행복)', desc: '“지금 함께”라는 따뜻한 현재형 결말', close: '먼 약속은 아직 미루어 두고, 두 사람은 지금 이 순간 서로의 손을 놓지 않는다.' },
  { key: 'epilogue', label: 'HEA + 외전', desc: '결합 후 후일담(육아·결혼생활)으로 보너스 설렘', close: '맺어진 뒤에도 이야기는 끝나지 않고, 일상이 된 사랑이 새로운 설렘을 피워 올린다.' },
  { key: 'cathartic', label: '사이다 응징형', desc: '후회·악역을 응징하고 정점에서 결합(권력 역전 카타르시스)', close: '버렸던 자는 무릎 꿇고, 무시당하던 그(녀)는 마침내 가장 사랑받는 자리에서 그를 내려다본다.' },
  { key: 'bittersweet', label: '애틋한 결합', desc: '대가를 치르고도 끝내 함께하는 씁쓸하고 벅찬 결말', close: '잃은 것은 끝내 돌아오지 않았으나, 그래도 두 사람은 서로를 택해 함께 남는다.' },
]
function endDef(k: EndKey) { return ENDS.find((e) => e.key === k) || ENDS[0] }

// 빈 칸은 자리표시자로 — 언제나 읽히는 문장을 만든다.
function f(s: string, ph: string): string {
  const t = (s || '').trim()
  return t || `〔${ph}〕`
}
// 문장 끝 마침표·온점·물음표 제거(문장 조립용)
function trim(s: string, ph: string): string {
  return f(s, ph).replace(/[.。!?]+$/, '')
}

// ---------- 한국어 조사 보정(받침 유무로 실제 하나를 골라 출력) ----------
// 끝의 따옴표·괄호 등 비한글 기호는 건너뛰고 마지막 '한글' 글자의 코드를 찾는다.
// (예: 이름이 ‘이안’ 처럼 따옴표로 닫혀도 '안'을 보고 받침을 판정 → 이안’과/이안’은)
function lastHangulCode(w: string): number {
  const s = (w || '').trim()
  for (let i = s.length - 1; i >= 0; i--) {
    const code = s.charCodeAt(i)
    if (code >= 0xac00 && code <= 0xd7a3) return code
    // 한글/숫자/영문 사이의 일반 글자를 만나면(공백·문장부호가 아닌) 더 거슬러 가지 않는다.
    if (/[0-9A-Za-z가-힣]/.test(s[i])) return code
  }
  return -1
}
// 마지막 한글 글자의 받침 유무. 한글이 아니면 받침 없음으로 본다.
function hasJong(w: string): boolean {
  const code = lastHangulCode(w)
  if (code < 0xac00 || code > 0xd7a3) return false
  return (code - 0xac00) % 28 !== 0
}
// 받침 있으면 withJong, 없으면 noJong 을 단어 뒤에 붙여 반환.
function withJosa(w: string, withJong: string, noJong: string): string {
  return w + (hasJong(w) ? withJong : noJong)
}
const eul = (w: string) => withJosa(w, '을', '를')   // 을/를
const iga = (w: string) => withJosa(w, '이', '가')   // 이/가
const eun = (w: string) => withJosa(w, '은', '는')   // 은/는
const wa = (w: string) => withJosa(w, '과', '와')    // 과/와
// 으로/로 — 받침 있으면 '으로', 없거나 'ㄹ' 받침이면 '로'. 단어 뒤에 붙여 반환.
function ro(w: string): string {
  const code = lastHangulCode(w)
  if (code < 0xac00 || code > 0xd7a3) return w + '로'
  const jong = (code - 0xac00) % 28
  return w + (jong === 0 || jong === 8 ? '로' : '으로')  // 8 = 'ㄹ'
}

// ---------- 종합 틀(템플릿) ----------
interface Tpl { name: string; hint: string; build: (d: Draft) => string }

const TEMPLATES: Tpl[] = [
  {
    name: '표준 줄거리형',
    hint: '두 주인공→첫 만남→엮임→끌림·장벽→밀당→절망→고백·결합 순의 정석',
    build: (d) => {
      const dyn = dynDef(d.dyn); const burn = burnDef(d.burn); const end = endDef(d.end)
      const leadA = trim(d.leadA, '주인공 A'); const leadB = trim(d.leadB, '주인공 B')
      const meet = trim(d.meetCute, '첫 만남'); const bind = trim(d.bind, '둘을 엮는 장치')
      const attr = trim(d.attraction, '끌림의 근거'); const bar = trim(d.barrier, '장벽')
      const pp = trim(d.pushpull, '밀당·갈망의 양상')
      return [
        `${withJosa(leadA, '과', '와')} ${leadB} — ${dyn.phrase}의 이야기.`,
        `${eul(meet)} 계기로 두 사람의 운명이 얽힌다.`,
        `${iga(bind)} 둘을 자꾸만 같은 자리에 묶고, ${burn.label} 속에서 ${iga(attr)} 마음을 흔든다.`,
        `그러나 ${iga(bar)} 둘 사이를 가로막고, ${iga(pp)} 끌림과 회피의 진자를 흔든다.`,
        `마침내 ${ro(trim(d.blackMoment, '절망의 순간'))} 관계가 끝장난 듯 보일 때, 모든 것을 뒤집는 결정적 한 수가 던져진다 — ${trim(d.grandGesture, '대형 고백·증명 행위')}.`,
        `이 사랑이 묻는 것은 하나다. ${trim(d.theme, '주제')}. ${end.close}`,
      ].join(' ')
    },
  },
  {
    name: '설렘 후킹형',
    hint: '“그를 만난 순간부터…” 두근거림으로 첫 줄을 건다',
    build: (d) => {
      const dyn = dynDef(d.dyn)
      const leadB = trim(d.leadB, '주인공 B'); const attr = trim(d.attraction, '끌림의 근거')
      const bind = trim(d.bind, '둘을 엮는 장치'); const pp = trim(d.pushpull, '밀당·갈망의 양상')
      return [
        `${trim(d.meetCute, '첫 만남')} — 그 순간부터 ${trim(d.leadA, '주인공 A')}의 평온한 일상에 금이 가기 시작한다.`,
        `${dyn.desc}. ${eun(leadB)} ${ro(attr)} 자꾸만 마음을 끌어당긴다.`,
        `${iga(bind)} 두 사람을 떼어놓지 못하게 만들고, ${iga(pp)} 가슴을 졸이게 한다.`,
        `다가갈수록 선명해지는 ${trim(d.barrier, '장벽')} — 끌릴수록 더 위태로워진다.`,
        `그리고 ${trim(d.blackMoment, '절망의 순간')}. 모든 것이 끝난 줄 알았던 그때, ${trim(d.grandGesture, '대형 고백·증명 행위')}.`,
      ].join(' ')
    },
  },
  {
    name: '여주 시점형',
    hint: '시점 인물(주인공 A)의 내면과 선택을 전면에 세운다',
    build: (d) => {
      const end = endDef(d.end); const burn = burnDef(d.burn)
      const meet = trim(d.meetCute, '첫 만남'); const leadB = trim(d.leadB, '주인공 B')
      return [
        `${trim(d.leadA, '주인공 A')} — 사랑 따위 다시는 믿지 않으리라 다짐했던 사람.`,
        `${ro(meet)} ${iga(leadB)} 그(녀)의 세계에 끼어들고, ${burn.label}의 속도로 마음이 흔들린다.`,
        `${trim(d.attraction, '끌림의 근거')} 때문에 끌리면서도, ${trim(d.barrier, '장벽')} 때문에 자신을 다잡는다 — ${trim(d.pushpull, '밀당·갈망')}.`,
        `${trim(d.blackMoment, '절망의 순간')}에 이르러서야 그(녀)는 자신의 진심을 마주한다.`,
        `그리고 던져진 선택 앞에서 그(녀)가 깨닫는 것은 하나다. ${trim(d.theme, '주제')}. ${end.close}`,
      ].join(' ')
    },
  },
  {
    name: '로판 트리트먼트형',
    hint: '제국·정략혼·정치 배경의 로맨스 판타지/악역영애 결',
    build: (d) => {
      const sub = subDef(d.sub); const end = endDef(d.end)
      const leadA = trim(d.leadA, '주인공 A'); const bar = trim(d.barrier, '신분·비밀·원작의 결말 등 장벽')
      const leadB = trim(d.leadB, '주인공 B'); const attr = trim(d.attraction, '끌림의 근거')
      const pp = trim(d.pushpull, '밀당·정치적 견제')
      return [
        `[${sub.label}] ${trim(d.bind, '정략혼·계약·빙의 등 둘을 엮는 설정')}.`,
        `${eun(leadA)} ${eul(bar)} 안은 채, ${wa(leadB)} 마주한다.`,
        `${ro(attr)} 두 사람은 가까워지지만, ${iga(pp)} 매 순간 시험에 든다.`,
        `${ro(trim(d.blackMoment, '절망의 순간 — 음모·폭로·파혼'))} 관계가 무너질 때, 판을 뒤엎는 한 수가 나온다 — ${trim(d.grandGesture, '권력·지위를 건 증명')}.`,
        `결국 이 이야기가 향하는 곳은 하나다. ${trim(d.theme, '주제')}. ${end.close}`,
      ].join(' ')
    },
  },
  {
    name: '뒤표지(블러브)형',
    hint: '책 뒤표지 홍보문구처럼 압축·자극적으로',
    build: (d) => {
      const dyn = dynDef(d.dyn)
      const leadA = trim(d.leadA, '주인공 A')
      return [
        `${trim(d.meetCute, '첫 만남')}.`,
        `${dyn.phrase}, ${withJosa(leadA, '과', '와')} ${trim(d.leadB, '주인공 B')}. ${trim(d.bind, '둘을 엮는 장치')} 때문에 둘은 결코 서로를 외면할 수 없게 된다.`,
        `끌릴수록 깊어지는 ${trim(d.barrier, '장벽')}, 그리고 ${trim(d.pushpull, '밀당·갈망')}.`,
        `모든 것을 잃을 뻔한 ${trim(d.blackMoment, '절망의 순간')} 끝에, 그(녀)는 묻는다 — ${trim(d.theme, '주제')}. 마지막 장을 덮기 전, 당신의 심장도 함께 뛴다.`,
      ].join(' ')
    },
  },
  {
    name: '웹소설 로그라인형',
    hint: '하위유형·트로프·관능도를 한 줄에 압축',
    build: (d) => {
      const sub = subDef(d.sub); const dyn = dynDef(d.dyn); const heat = heatDef(d.heat)
      const bind = trim(d.bind, '둘을 엮는 설정'); const leadA = trim(d.leadA, '주인공 A')
      const bar = trim(d.barrier, '장벽'); const pp = trim(d.pushpull, '밀당')
      return [
        `[${sub.label}·${dyn.label}·${heat.label}] ${ro(bind)} 묶인 ${withJosa(leadA, '과', '와')} ${trim(d.leadB, '주인공 B')}.`,
        `${eul(bar)} 사이에 두고 ${eul(pp)} 거듭하다, 끝내 던지는 한 수 — ${trim(d.grandGesture, '대형 고백')}. 그리고 남는 물음 — ${trim(d.theme, '주제')}.`,
      ].join(' ')
    },
  },
  {
    name: '구조 개요형',
    hint: '제출용 트리트먼트처럼 항목별로 정리',
    build: (d) => {
      const sub = subDef(d.sub); const dyn = dynDef(d.dyn); const burn = burnDef(d.burn); const heat = heatDef(d.heat); const end = endDef(d.end)
      return [
        `[하위유형] ${sub.label} · [관계 역학] ${dyn.label} · [점화] ${burn.label} · [관능도] ${heat.label} · [결말] ${end.label}`,
        `[주인공 A(시점)] ${f(d.leadA, '주인공 A')}`,
        `[주인공 B(상대역)] ${f(d.leadB, '주인공 B')}`,
        `[첫 만남(밋큐트)] ${f(d.meetCute, '첫 만남')}`,
        `[둘을 엮는 장치] ${f(d.bind, '계약·동거·임무·빙의 등')}`,
        `[끌림의 근거] ${f(d.attraction, '왜 하필 이 사람인가')}`,
        `[장벽] ${f(d.barrier, '신분·비밀·오해·외부 압력')}`,
        `[밀당·갈망] ${f(d.pushpull, '끌림과 회피의 진자')}`,
        `[절망의 순간] ${f(d.blackMoment, 'All Is Lost — 최저점')}`,
        `[대형 고백·증명] ${f(d.grandGesture, 'Grand Gesture')}`,
        `[주제] ${f(d.theme, '사랑이 던지는 질문')}`,
      ].join('\n')
    },
  },
]

// ---------- 영감 풀(무작위 채움) — 로맨스 도시에에 근거한 구체적·장르 특화 데이터 ----------
const LEAD_A_POOL = [
  '연애 따위 사치라 여기는 워커홀릭 광고 기획자 ‘서하’',
  '소설 속 처형당할 악역 영애 ‘아젤리아’에 빙의한 ‘나’',
  '회귀 전 그에게 버림받고 죽었던, 다시 스무 살로 돌아온 ‘이안’',
  '첫사랑에 데여 마음에 빗장을 건 출판사 편집자 ‘유진’',
  '몰락한 백작가의 영애로, 가문을 위해 정략혼을 받아들인 ‘레티시아’',
  '연예부 기자였다가 톱스타의 가짜 연인이 된 ‘다인’',
  '죽은 언니 대신 황비 자리에 앉게 된 시골 영애 ‘세실리아’',
  '연애 세포가 멸종했다 자부하는 대학병원 외과 레지던트 ‘하람’',
  '계약 결혼 3년 차, 이혼만 기다리던 재벌가 며느리 ‘소율’',
  '학창 시절 짝사랑을 묻어둔 채 동창회에 끌려 나온 ‘준서’',
  '가문의 빚을 갚으려 재벌가에 위장 취업한 비서 ‘하윤’',
]
const LEAD_B_POOL = [
  '감정을 드러내지 않는 차가운 재벌 3세 본부장 ‘강도현’',
  '겉으론 다정하나 속은 집착으로 가득한 황태자 ‘에드워드’',
  '회귀 전 그(녀)를 죽음으로 내몰았던, 그러나 이번 생엔 다른 ‘카일’',
  '무뚝뚝하지만 그(녀) 앞에서만 무너지는 경호실장 ‘준혁’',
  '냉혈한이라 불리지만 한 사람에게만은 한없이 약한 대공 ‘라이언’',
  '온 국민의 첫사랑인 톱스타이자, 사실은 외로운 ‘차은별’',
  '정략혼 상대로 만난, 무심한 듯 세심한 북부 변경백 ‘아드리안’',
  '괴팍한 천재 외과 과장이자 그(녀)의 사수 ‘도경’',
  '이혼을 거부하며 뒤늦게 매달리는 남편 ‘이서준’',
  '옆자리였던 그 시절 그대로, 다정해진 첫사랑 ‘민결’',
  '사람을 믿지 않지만 그(녀)에게만은 빗장을 푸는 대기업 회장 ‘한태경’',
]
const MEET_CUTE_POOL = [
  '폭우 속 같은 택시를 두고 다투다 결국 합승하게 된 밤',
  '면접관과 지원자로 다시 만난, 하필 어젯밤 술자리의 그 사람',
  '한 침대만 남은 산장에서 폭설로 함께 갇힌 첫날',
  '실수로 보낸 청첩장 한 장이 잘못된 사람에게 닿은 순간',
  '계약서에 서명하는 줄 알았던 자리가 혼인 서약식이었던 날',
  '처형대에서 눈을 감았다가, 파혼 직전 무도회장에서 눈을 뜬 순간',
  '카메라 앞에서 연인 연기를 하기로 한 첫 촬영 현장',
  '응급실에 실려 온 환자와 그를 살린 집도의로 마주한 새벽',
  '원수 집안의 상속자와 한 회사에 입사 동기로 배정된 날',
  '죽은 언니의 자리를 대신해 처음 인사 올린 황궁의 알현실',
  '엘리베이터에 단둘이 갇혀 한 시간을 버텨야 했던 정전의 밤',
]
const BIND_POOL = [
  '3년 뒤 깨끗이 이혼한다는 조건의 위장 결혼 계약',
  '한 지붕 아래 살아야 하는 강제 셰어하우스 계약',
  '회사의 합병이 걸린, 두 사람만 아는 거짓 연애 협약',
  '같은 사건을 파헤쳐야 하는 공동 수사 파트너 관계',
  '원작의 파멸 플래그를 함께 피해야 하는 빙의자와 공략 대상',
  '서로의 약점을 쥔 채 어쩔 수 없이 손잡은 정략 동맹',
  '한 사람의 빚을 다른 한 사람이 떠안으며 시작된 주종 계약',
  '같은 황실 후계 다툼에 휘말려 운명을 함께 건 정략혼',
  '연예계 스캔들을 덮기 위한 6개월짜리 공개 열애 협약',
  '죽은 가족의 유언이 묶어놓은, 거부할 수 없는 약혼',
  '한 아이의 후견을 함께 맡게 되어 한집을 쓰게 된 공동 양육 협약',
]
const ATTRACTION_POOL = [
  '아무에게도 보이지 않던 약한 모습을 그(녀)에게만 들켜버려서',
  '날 선 말 뒤에 숨겨둔 다정함을 우연히 목격해서',
  '누구도 믿어주지 않던 진심을 그 사람만은 믿어줘서',
  '무너지려는 순간마다 말없이 곁을 지켜준 사람이라서',
  '자신이 가장 두려워하던 약점을 부끄럽지 않게 만들어줘서',
  '거짓 연기 속에서 새어 나온 진짜 눈빛을 봐버려서',
  '회귀 전과는 전혀 다른 얼굴로 다가오는 그가 낯설고도 끌려서',
  '세상이 다 등 돌렸을 때 단 한 번 손을 내밀어준 사람이라서',
  '서로의 상처가 같은 모양이라 말하지 않아도 알아봐서',
  '무심한 척하면서도 가장 사소한 것까지 기억해줘서',
  '있는 그대로의 모습을 처음으로 인정해준 사람이라서',
]
const BARRIER_POOL = [
  '도저히 좁힐 수 없어 보이는 신분과 가문의 격차',
  '둘 중 누구도 입 밖에 낼 수 없는 치명적인 비밀',
  '한 마디면 풀리지만 상처 때문에 묻어둔 깊은 오해',
  '결말을 아는 자만이 짊어진, 다가갈수록 커지는 두려움',
  '가문·회사·황실이 결코 허락하지 않을 외부의 압력',
  '아직 정리되지 않은 과거의 연인 혹은 약혼자',
  '사랑하면 안 될 이유가 분명한 금기와 계율',
  '한쪽의 거짓말 위에 위태롭게 쌓아 올린 관계',
  '서로를 지키려다 도리어 서로를 밀어내는 엇갈린 희생',
  '회귀·빙의 사실을 들키면 모든 것을 잃는다는 비밀',
  '서로 다른 길을 가야만 하는 어긋난 꿈과 처지',
]
const PUSHPULL_POOL = [
  '가까워지면 한쪽이 겁먹고 물러서고, 멀어지면 다른 쪽이 끌림을 자각하는 진자',
  '닿을 듯 닿지 않는 손끝과, 끝내 입 밖에 내지 못한 고백의 갈망',
  '입맞춤 직전마다 누군가 끼어들어 미뤄지는 니어 키스의 연속',
  '연적의 등장으로 비로소 자각하는 질투와 진심',
  '낮에는 차갑게 선을 긋고 밤에는 무너지는 두 얼굴의 줄다리기',
  '“이건 계약일 뿐”이라 되뇌지만 자꾸만 진짜가 되어버리는 연기',
  '한 번의 고백 → 거절 → 후회 → 재고백으로 이어지는 다단계 밀당',
  '서로를 밀어내려는 말과 붙잡으려는 손이 어긋나는 순간들',
  '우연한 손 스침에서 의도된 포옹으로 번지는 접촉의 고조',
  '미래를 아는 자의 거리 두기와, 그 거리를 끝내 좁혀오는 그의 집요함',
  '무심한 한 마디에 종일 흔들리고, 다정한 한 번에 무너지는 마음의 시소',
]
const BLACK_MOMENT_POOL = [
  '오해가 폭발해 “다신 보지 말자”는 말을 내뱉고 등 돌린 밤',
  '숨겨온 비밀이 최악의 순간에 만천하에 폭로되는 사건',
  '그(녀)를 지키기 위해 일부러 마음에도 없는 이별을 고하는 희생',
  '회귀·빙의 사실이 들통나 모든 신뢰가 무너지는 순간',
  '가문·황실의 압력에 떠밀려 정략혼이 강행되는 파혼 통보',
  '연적의 음모로 둘 사이가 갈가리 찢기는 누명 사건',
  '과거의 죄가 드러나 사랑할 자격을 의심하게 되는 폭로',
  '한쪽이 떠나버린 뒤에야 텅 빈 자리의 크기를 깨닫는 상실',
  '사랑을 택하면 다른 모두를 잃는다는 잔인한 양자택일',
  '죽음의 위기 앞에서 끝내 진심을 전하지 못하고 멀어지는 순간',
  '신뢰가 가장 깊어진 순간, 처음의 계약이 거짓이었음이 드러나는 폭로',
]
const GRAND_GESTURE_POOL = [
  '공항·역으로 달려가 떠나는 그(녀)를 만인 앞에서 붙잡는다',
  '가진 지위와 재산을 모두 내려놓고 그(녀)의 곁을 택한다',
  '황실·가문과 등지더라도 정략혼을 깨고 그(녀)를 지킨다',
  '버렸던 자가 모든 자존심을 버리고 무릎 꿇어 속죄한다',
  '세상에 모든 비밀을 밝히며 그(녀)의 결백을 증명한다',
  '권력의 정점에서, 그 권력으로 가장 먼저 그(녀)를 지켜낸다',
  '먼저 “사랑한다”는 말을 끝내 입 밖으로 꺼내 진심을 언어화한다',
  '오해를 풀기 위해 자신의 가장 깊은 상처까지 내보인다',
  '죽음을 무릅쓰고 위기에 처한 그(녀)에게로 돌아온다',
  '두 사람의 약속이 담긴 장소에서 만인 앞에 청혼한다',
  '평생을 바쳐온 꿈을 포기하고 그(녀)가 있는 곳으로 돌아온다',
]
const THEME_POOL = [
  '사랑은 두 사람이 함께 무언가를 내려놓을 때 비로소 완성된다',
  '상처받을 것을 알면서도 다시 마음을 여는 것이 진짜 용기다',
  '운명이 정해두었대도, 사랑은 끝내 스스로 선택하는 것이다',
  '닿을 수 없다 믿었던 거리도, 한 사람의 진심이면 좁혀진다',
  '가짜로 시작한 마음도 진짜가 될 수 있는가',
  '버린 사랑은 되찾을 수 있는가, 아니면 후회만 남는가',
  '나를 가장 약하게 만드는 사람이 나를 가장 강하게 만든다',
  '비극을 알면서도 다시 그를 사랑할 수 있는가',
  '신분도 결말도 정해진 세계에서, 마음만은 내 것일 수 있는가',
  '사랑받을 자격을 의심하던 사람이 사랑을 받아들이기까지',
  '집착과 사랑의 경계는 어디인가',
  '함께한다는 것은 서로의 상처까지 끌어안는 일이다',
  '두려움을 무릅쓰고 먼저 손 내미는 쪽이 끝내 사랑을 얻는다',
]

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

// 조합수(영감 풀 + 선택지 기준) — 핵심 생성기 지향(100조+).
// SUBS(8)·DYNS(8)·BURNS(5)·HEATS(5)·ENDS(5) × 텍스트 풀 9개(각 11) × THEME(13)의 곱.
// = 8000 × 11^9 × 13 ≈ 2.45e14.
const COMBOS = SUBS.length * DYNS.length * BURNS.length * HEATS.length * ENDS.length *
  LEAD_A_POOL.length * LEAD_B_POOL.length * MEET_CUTE_POOL.length * BIND_POOL.length *
  ATTRACTION_POOL.length * BARRIER_POOL.length * PUSHPULL_POOL.length *
  BLACK_MOMENT_POOL.length * GRAND_GESTURE_POOL.length * THEME_POOL.length

// ---------- 자작 예시(로맨스 관습에 충실) ----------
interface Example extends Omit<Draft, 'tpl'> { title: string }
const EXAMPLES: Example[] = [
  {
    title: '계약은 3년, 마음은 평생',
    leadA: '3년 뒤 깨끗이 이혼하기로 한 계약 결혼 며느리 ‘소율’',
    leadB: '감정을 드러내지 않는 차가운 재벌 3세 본부장 ‘강도현’',
    meetCute: '계약서에 서명하는 줄 알았던 자리가 혼인 서약식이었던 날',
    bind: '3년 뒤 깨끗이 이혼한다는 조건의 위장 결혼 계약',
    attraction: '아무에게도 보이지 않던 약한 모습을 그녀에게만 들켜버려서',
    barrier: '한쪽의 거짓말 위에 위태롭게 쌓아 올린 관계',
    pushpull: '“이건 계약일 뿐”이라 되뇌지만 자꾸만 진짜가 되어버리는 연기',
    blackMoment: '계약의 진짜 목적이 폭로되며 모든 신뢰가 무너지는 순간',
    grandGesture: '가진 지위와 재산을 모두 내려놓고 그녀의 곁을 택한다',
    theme: '가짜로 시작한 마음도 진짜가 될 수 있는가',
    sub: 'contract', heat: 'sweet', burn: 'slowburn', dyn: 'fakedating', end: 'hea',
  },
  {
    title: '악역으로 죽지 않고, 사랑받기로 했다',
    leadA: '소설 속 처형당할 악역 영애 ‘아젤리아’에 빙의한 ‘나’',
    leadB: '겉으론 다정하나 속은 집착으로 가득한 황태자 ‘에드워드’',
    meetCute: '처형대에서 눈을 감았다가, 파혼 직전 무도회장에서 눈을 뜬 순간',
    bind: '원작의 파멸 플래그를 함께 피해야 하는 빙의자와 공략 대상',
    attraction: '회귀 전과는 전혀 다른 얼굴로 다가오는 그가 낯설고도 끌려서',
    barrier: '회귀·빙의 사실을 들키면 모든 것을 잃는다는 비밀',
    pushpull: '미래를 아는 자의 거리 두기와, 그 거리를 끝내 좁혀오는 그의 집요함',
    blackMoment: '회귀·빙의 사실이 들통나 모든 신뢰가 무너지는 순간',
    grandGesture: '권력의 정점에서, 그 권력으로 가장 먼저 그녀를 지켜낸다',
    theme: '정해진 결말은 거역할 수 있는가 — 마음만은 내 것일 수 있는가',
    sub: 'villainess', heat: 'sensual', burn: 'pushpull', dyn: 'protect', end: 'cathartic',
  },
  {
    title: '다시, 너에게로',
    leadA: '회귀 전 그에게 버림받고 죽었던, 다시 스무 살로 돌아온 ‘이안’',
    leadB: '회귀 전 그를 죽음으로 내몰았던, 그러나 이번 생엔 다른 ‘카일’',
    meetCute: '원수 집안의 상속자와 한 회사에 입사 동기로 배정된 날',
    bind: '서로의 약점을 쥔 채 어쩔 수 없이 손잡은 정략 동맹',
    attraction: '세상이 다 등 돌렸을 때 단 한 번 손을 내밀어준 사람이라서',
    barrier: '결말을 아는 자만이 짊어진, 다가갈수록 커지는 두려움',
    pushpull: '가까워지면 겁먹고 물러서고, 멀어지면 끌림을 자각하는 진자',
    blackMoment: '그를 지키기 위해 일부러 마음에도 없는 이별을 고하는 희생',
    grandGesture: '죽음을 무릅쓰고 위기에 처한 그에게로 돌아온다',
    theme: '비극을 알면서도 다시 그를 사랑할 수 있는가',
    sub: 'regress', heat: 'sweet', burn: 'secondchance', dyn: 'e2l', end: 'bittersweet',
  },
]

// ---------- 저장 항목 ----------
interface Saved { id: string; title: string; draft: Draft; text: string; createdAt: number }

function newId(prefix = 'rs'): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return prefix + '_' + crypto.randomUUID() } catch { /* noop */ }
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const SUB_KEYS: SubKey[] = ['contemp', 'romanceF', 'villainess', 'regress', 'contract', 'regret', 'newadult', 'blgl']
const HEAT_KEYS: HeatKey[] = ['clean', 'sweet', 'sensual', 'steamy', 'explicit']
const BURN_KEYS: BurnKey[] = ['insta', 'slowburn', 'secondchance', 'forbidden', 'pushpull']
const DYN_KEYS: DynKey[] = ['e2l', 'f2l', 'opposites', 'forced', 'fakedating', 'pursuit', 'protect', 'rivals']
const END_KEYS: EndKey[] = ['hea', 'hfn', 'epilogue', 'cathartic', 'bittersweet']

function blankDraft(): Draft {
  return {
    leadA: '', leadB: '', meetCute: '', bind: '', attraction: '',
    barrier: '', pushpull: '', blackMoment: '', grandGesture: '', theme: '',
    sub: 'contemp', heat: 'sweet', burn: 'slowburn', dyn: 'e2l', end: 'hea', tpl: 0,
  }
}

function normDraft(x: unknown): Draft {
  const o = (x || {}) as Partial<Draft>
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  return {
    leadA: str(o.leadA), leadB: str(o.leadB), meetCute: str(o.meetCute), bind: str(o.bind),
    attraction: str(o.attraction), barrier: str(o.barrier), pushpull: str(o.pushpull),
    blackMoment: str(o.blackMoment), grandGesture: str(o.grandGesture), theme: str(o.theme),
    sub: SUB_KEYS.includes(o.sub as SubKey) ? (o.sub as SubKey) : 'contemp',
    heat: HEAT_KEYS.includes(o.heat as HeatKey) ? (o.heat as HeatKey) : 'sweet',
    burn: BURN_KEYS.includes(o.burn as BurnKey) ? (o.burn as BurnKey) : 'slowburn',
    dyn: DYN_KEYS.includes(o.dyn as DynKey) ? (o.dyn as DynKey) : 'e2l',
    end: END_KEYS.includes(o.end as EndKey) ? (o.end as EndKey) : 'hea',
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

// 본문 HTML(프로젝트 문서용) — 시놉시스 + 항목별 정리. 모든 사용자 입력은 escHtml() 처리.
function bodyHtmlOf(d: Draft, text: string): string {
  const sub = subDef(d.sub); const dyn = dynDef(d.dyn); const burn = burnDef(d.burn); const heat = heatDef(d.heat); const end = endDef(d.end)
  const row = (label: string, v: string) => (v && v.trim() ? `<p><b>${escHtml(label)}:</b> ${escHtml(v.trim())}</p>` : '')
  const paras = text.split('\n').filter(Boolean).map((p) => `<p>${escHtml(p)}</p>`).join('')
  return [
    `<p><b>하위유형:</b> ${escHtml(sub.label)} · <b>관계 역학:</b> ${escHtml(dyn.label)} · <b>점화:</b> ${escHtml(burn.label)} · <b>관능도:</b> ${escHtml(heat.label)} · <b>결말:</b> ${escHtml(end.label)}</p>`,
    `<hr/>`,
    `<p style="font-size:14px;line-height:1.7;"><b>시놉시스</b></p>`,
    paras,
    `<hr/>`,
    row('주인공 A(시점)', d.leadA),
    row('주인공 B(상대역)', d.leadB),
    row('첫 만남(밋큐트)', d.meetCute),
    row('둘을 엮는 장치', d.bind),
    row('끌림의 근거', d.attraction),
    row('장벽', d.barrier),
    row('밀당·갈망', d.pushpull),
    row('절망의 순간(All Is Lost)', d.blackMoment),
    row('대형 고백·증명(Grand Gesture)', d.grandGesture),
    row('주제', d.theme),
  ].filter(Boolean).join('')
}

export default function RomanceSynopsis({ payload }: { payload?: Record<string, unknown> }) {
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

  // payload.genre / payload.seed 활용(빈 입력일 때만 안내·시드).
  useEffect(() => {
    mounted.current = true
    try {
      const g = payload && typeof payload.genre === 'string' ? (payload.genre as string) : ''
      const seed = payload && typeof payload.seed === 'string' ? (payload.seed as string) : ''
      const isEmpty = !init.current.cur.leadA && !init.current.cur.leadB && !init.current.cur.meetCute
      if (seed && isEmpty) {
        setCur((p) => ({ ...p, leadA: p.leadA || seed }))
        flashNote('전달받은 아이디어를 주인공 A 칸에 넣었습니다. 자유롭게 고쳐 쓰세요.')
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

  // 다른 탭 동기화
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS) {
        try {
          const s = loadState()
          if (mounted.current) { setCur(s.cur); setSaved(s.saved) }
        } catch { /* noop */ }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

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

  const hasInput = !!(cur.leadA || cur.leadB || cur.meetCute || cur.bind || cur.attraction || cur.barrier || cur.pushpull || cur.blackMoment || cur.grandGesture || cur.theme)

  // ---- 영감(무작위 채움) — 빈 칸만 채운다 ----
  const inspire = () => {
    setCur((p) => ({
      ...p,
      leadA: p.leadA || pick(LEAD_A_POOL),
      leadB: p.leadB || pick(LEAD_B_POOL),
      meetCute: p.meetCute || pick(MEET_CUTE_POOL),
      bind: p.bind || pick(BIND_POOL),
      attraction: p.attraction || pick(ATTRACTION_POOL),
      barrier: p.barrier || pick(BARRIER_POOL),
      pushpull: p.pushpull || pick(PUSHPULL_POOL),
      blackMoment: p.blackMoment || pick(BLACK_MOMENT_POOL),
      grandGesture: p.grandGesture || pick(GRAND_GESTURE_POOL),
      theme: p.theme || pick(THEME_POOL),
    }))
    flashNote('빈 칸에 로맨스 영감 예시를 채웠습니다. 마음대로 고쳐 쓰세요.')
  }
  // 한 칸만 새로 굴리기
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
      title: title.trim() || (cur.leadA.trim() ? cur.leadA.trim().slice(0, 24) : '제목 없는 시놉시스'),
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
    setCur((p) => ({ ...blankDraft(), sub: p.sub, heat: p.heat, burn: p.burn, dyn: p.dyn, end: p.end, tpl: p.tpl }))
    setEditId(null); setTitle('')
    flashNote('입력을 비웠습니다.')
  }

  // ---- 연계: 프로젝트 기획 폴더에 시놉시스 문서 추가 ----
  const toProject = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const docTitle = (title.trim() || (cur.leadA.trim() ? cur.leadA.trim().slice(0, 24) : '시놉시스'))
    const id = addToProject({
      kind: 'text', root: 'research', folder: '기획',
      title: `시놉시스 — ${docTitle}`,
      bodyHtml: bodyHtmlOf(cur, text),
      synopsis: text.split('\n')[0]?.slice(0, 120),
      meta: {
        장르: '로맨스', 하위유형: subDef(cur.sub).label, 관계역학: dynDef(cur.dyn).label,
        점화: burnDef(cur.burn).label, 관능도: heatDef(cur.heat).label, 결말: endDef(cur.end).label, 틀: TEMPLATES[cur.tpl].name,
      },
    })
    flashNote(id ? '프로젝트 자료 〈기획〉 폴더에 시놉시스 문서를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 연계: 글감 보관함에 스니펫 저장 ----
  const toLibrary = () => {
    addToLibrary('snippets', {
      text,
      source: '로맨스 시놉시스 빌더',
      tags: ['시놉시스', '로맨스', subDef(cur.sub).label, dynDef(cur.dyn).label, endDef(cur.end).label],
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
        {pool && <button style={dice} title="이 칸만 무작위로 다시 굴리기" onClick={() => reroll(k, pool)}><Emoji e="🎲"/></button>}
      </div>
    </div>
  )

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="💞"/> 로맨스 시놉시스 빌더</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>두 주인공·첫 만남·엮임·끌림·장벽·밀당·절망·고백 → 로맨스 시놉시스</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="minibtn" onClick={inspire} title="빈 칸에 무작위 로맨스 영감 채우기"><Emoji e="🎲"/> 영감</button>
          <button className="minibtn" onClick={() => setShowEx((v) => !v)}>{showEx ? '예시 닫기' : <><Emoji e="📚"/> 작품 예시</>}</button>
        </div>
      </div>

      <div style={body}>
        {note && (
          <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>{emojify(note)}</div>
        )}

        {showEx && (
          <div style={card}>
            <h4 style={sectionTitle}>로맨스 예시 — 눌러 입력에 채우기</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EXAMPLES.map((ex) => (
                <div key={ex.title} style={{ ...savedRow, gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>「{ex.title}」</b>
                    <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>
                      {subDef(ex.sub).label} · {dynDef(ex.dyn).label} · {endDef(ex.end).label}
                    </span>
                    <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => applyExample(ex)}>이 예시 쓰기</button>
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--muted)', wordBreak: 'keep-all' }}>{ex.leadA} × {ex.leadB}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 유형 선택 */}
        <div style={card}>
          <h4 style={sectionTitle}>하위유형 · 관계 역학 · 점화 속도 · 관능도 · 결말</h4>
          <div style={{ marginBottom: 10 }}>
            <span style={fieldLabel}>하위유형</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SUBS.map((s) => (
                <button key={s.key} onClick={() => setField('sub', s.key)} style={chip(cur.sub === s.key)} title={s.desc}>{s.label}</button>
              ))}
            </div>
            <div style={{ ...hint, marginTop: 6 }}>{subDef(cur.sub).desc}</div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <span style={fieldLabel}>관계 역학(트로프)</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DYNS.map((dn) => (
                <button key={dn.key} onClick={() => setField('dyn', dn.key)} style={chip(cur.dyn === dn.key)} title={dn.desc}>{dn.label}</button>
              ))}
            </div>
            <div style={{ ...hint, marginTop: 6 }}>{dynDef(cur.dyn).desc}</div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <span style={fieldLabel}>점화 속도</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {BURNS.map((b) => (
                <button key={b.key} onClick={() => setField('burn', b.key)} style={chip(cur.burn === b.key)} title={b.desc}>{b.label}</button>
              ))}
            </div>
            <div style={{ ...hint, marginTop: 6 }}>{burnDef(cur.burn).desc}</div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <span style={fieldLabel}>관능도(heat level) — 사전 합의된 약속</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {HEATS.map((h) => (
                <button key={h.key} onClick={() => setField('heat', h.key)} style={chip(cur.heat === h.key)} title={h.desc}>{h.label}</button>
              ))}
            </div>
            <div style={{ ...hint, marginTop: 6 }}>{heatDef(cur.heat).desc}</div>
          </div>
          <div>
            <span style={fieldLabel}>결말 톤 — 로맨스 계약(HEA/HFN 보장)</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ENDS.map((e) => (
                <button key={e.key} onClick={() => setField('end', e.key)} style={chip(cur.end === e.key)} title={e.desc}>{e.label}</button>
              ))}
            </div>
            <div style={{ ...hint, marginTop: 6 }}>{endDef(cur.end).desc} — “{endDef(cur.end).close}”</div>
          </div>
        </div>

        {/* 입력 */}
        <div style={card}>
          <h4 style={sectionTitle}>{editId ? <><Emoji e="✏️"/> 수정 중</> : '구성 요소 입력'}</h4>
          <div style={{ ...twoRow, marginBottom: 10 }}>
            <div style={col}><Field k="leadA" label="주인공 A (시점 인물)" ph="예: 연애 따위 사치라 여기는 워커홀릭 기획자 ‘서하’" pool={LEAD_A_POOL} /></div>
            <div style={col}><Field k="leadB" label="주인공 B (상대역)" ph="예: 감정을 드러내지 않는 차가운 재벌 3세 ‘강도현’" pool={LEAD_B_POOL} /></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="meetCute" label="첫 만남(밋큐트) — 운명적·우스꽝·적대적 첫 조우" ph="예: 폭우 속 같은 택시를 두고 다투다 결국 합승하게 된 밤" ml={220} area pool={MEET_CUTE_POOL} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="bind" label="둘을 엮는 장치(계약·동거·임무·빙의 등)" ph="예: 3년 뒤 깨끗이 이혼한다는 조건의 위장 결혼 계약" ml={220} area pool={BIND_POOL} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="attraction" label="끌림의 근거 — “왜 하필 이 사람인가”" ph="예: 아무에게도 보이지 않던 약한 모습을 그(녀)에게만 들켜서" ml={200} area pool={ATTRACTION_POOL} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="barrier" label="장벽 — 신분·비밀·오해·외부 압력" ph="예: 도저히 좁힐 수 없어 보이는 신분과 가문의 격차" ml={200} area pool={BARRIER_POOL} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="pushpull" label="밀당·갈망(push-pull) — 끌림과 회피의 진자" ph="예: 가까워지면 물러서고, 멀어지면 끌림을 자각하는 진자" ml={220} area pool={PUSHPULL_POOL} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="blackMoment" label="절망의 순간(All Is Lost) — 관계의 최저점" ph="예: 오해가 폭발해 ‘다신 보지 말자’며 등 돌린 밤" ml={220} area pool={BLACK_MOMENT_POOL} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="grandGesture" label="대형 고백·증명(Grand Gesture) — 결정적 행동" ph="예: 떠나는 그(녀)를 만인 앞에서 붙잡는다" ml={220} area pool={GRAND_GESTURE_POOL} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="theme" label="주제 (사랑이 던지는 질문)" ph="예: 가짜로 시작한 마음도 진짜가 될 수 있는가" ml={200} area pool={THEME_POOL} />
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
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => copy(text, 'main')}>{copied === 'main' ? '✓ 복사됨' : <><Emoji e="📋"/> 복사</>}</button>
          </div>
          <div style={synBox}>{text}</div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <input style={{ ...input, flex: 1, minWidth: 180 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="저장 제목 (비우면 주인공명으로 자동)" maxLength={60} />
            <button className="btn-primary" onClick={saveCurrent}>{editId ? '수정 저장' : <><Emoji e="💾"/> 저장</>}</button>
            {editId && <button className="minibtn" onClick={() => { setEditId(null); setTitle('') }}>새 항목으로</button>}
          </div>

          {/* 연계 버튼 */}
          <div className="linkbar" style={{ marginTop: 12, flexWrap: 'wrap', display: 'flex', gap: 6, alignItems: 'center' }}>
            <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
            <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '현재 시놉시스를 프로젝트 자료 〈기획〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={toLibrary} title="생성한 시놉시스를 글감 보관함에 저장"><Emoji e="⭐"/> 글감 보관</button>
            <button className="linkbtn" onClick={() => openToolLinked('character-forge', { genre: '로맨스', seed: cur.leadA })} title="주인공 캐릭터 만들기"><Emoji e="👤"/> 캐릭터 만들기</button>
            <button className="linkbtn" onClick={() => openToolLinked('relationship-map', { genre: '로맨스' })} title="두 주인공의 관계를 펼치기"><Emoji e="💞"/> 관계도</button>
            <button className="linkbtn" onClick={() => openToolLinked('emotion-arc', { genre: '로맨스' })} title="감정 곡선으로 설렘·절망의 진폭 설계"><Emoji e="📈"/> 감정 곡선</button>
            <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre: '로맨스' })} title="플롯 구조로 펼치기"><Emoji e="🔺"/> 플롯 구조</button>
            <button className="linkbtn" onClick={() => openToolLinked('conflict-builder', { genre: '로맨스' })} title="장벽·갈등을 더 정교하게"><Emoji e="⚔️"/> 갈등 설계</button>
          </div>
        </div>

        {/* 저장 목록(CRUD) */}
        <div style={card}>
          <h4 style={sectionTitle}>저장한 시놉시스 · {saved.length}건</h4>
          {saved.length === 0 ? (
            <div style={emptyBox}>
              아직 저장한 시놉시스가 없습니다.<br />
              요소를 채우고 <b>저장</b>을 누르면 여기에 모입니다.<br />
              <span style={{ fontSize: 12 }}>막막하다면 상단의 <b><Emoji e="📚"/> 작품 예시</b> 또는 <b><Emoji e="🎲"/> 영감</b>으로 시작하세요.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {saved.map((s, i) => (
                <div key={s.id} style={{ ...savedRow, border: '1px solid ' + (editId === s.id ? 'var(--accent)' : 'var(--border)') }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>{s.title || '(제목 없음)'}</b>
                    <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>
                      {subDef(s.draft.sub).label} · {dynDef(s.draft.dyn).label} · {endDef(s.draft.end).label}
                    </span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                      <button style={iconBtn} title="위로" onClick={() => moveSaved(s.id, -1)} disabled={i === 0}>▲</button>
                      <button style={iconBtn} title="아래로" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1}>▼</button>
                      <button style={iconBtn} title="복사" onClick={() => copy(s.text, 'sv' + s.id)}>{copied === 'sv' + s.id ? '✓' : '복사'}</button>
                      <button style={iconBtn} title="불러와 수정" onClick={() => loadSaved(s)}><Emoji e="✏️"/></button>
                      <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeSaved(s.id)}><Emoji e="🗑️"/></button>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--muted)', wordBreak: 'keep-all', whiteSpace: 'pre-wrap', maxHeight: 88, overflow: 'hidden' }}>{s.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={hint}>
          로맨스 시놉시스의 심장은 <b>두 사람의 관계가 곧 플롯</b>이라는 점입니다 —
          외부 사건은 “이 일이 둘 사이를 어떻게 바꾸는가”로 종속시키고, <b>설렘(상승) 뒤엔 작은 좌절(하강)</b>의 진자를 잊지 마세요.
          그리고 로맨스의 계약(HEA/HFN)에 따라 <b>두 사람은 끝내 함께</b>해야 합니다.
          영감 풀과 선택지만으로도 약 {COMBOS.toLocaleString('en-US')}가지 변주가 가능합니다. 입력·저장은 이 브라우저에 자동 저장됩니다.
        </div>

        {/* 저작권: 모든 문구는 본 도구가 자체 생성한 창작 풀(외부 텍스트 미사용) */}
        <div className="license-note" style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.4 }}>
          <span className="license-badge">자체 창작</span> 모든 슬롯·예시 문구는 이 도구가 자체 작성한 오리지널 풀로, 외부 저작물을 사용하지 않습니다.
        </div>
      </div>
    </div>
  )
}
