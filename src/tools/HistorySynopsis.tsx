// 역사·사극 시놉시스 빌더 — 이 장르의 핵심 계약(시대의 공기·권력의 작동 원리·신분제의 무게·
// 명분과 의리·거대 사건과 개인의 교차·운명의 무게)에 맞춘 항목(주인공·시대 배경·신분/처지·
// 정치 지형·미래지식/무기·거대 사건·정적·명분/대의·반전 장치·운명의 결말)을 채우면
// 사극다운 시놉시스를 여러 문체 틀로 자동 종합한다.
// 하위유형(정통·궁중암투·대체역사·회빙환 사극·퓨전 가상왕조·궁중로맨스·무협혼합)과
// 왕대 프리셋(연산~정조 등), 고증 강도(가상왕조↔정통고증), 미래지식 사용 여부, 결말 톤을 고르면
// 그 결에 맞춘 도입·전개·결구를 자동 조립한다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크 없음(전부 로컬·자작 데이터, 역사·사극 도시에 근거).
// 모든 입력/저장은 localStorage 'sry:tool:history-synopsis' 에 JSON 으로 자동 저장·복원. 언마운트 시 타이머 정리.
// 연계: addToProject(folder:'기획','시놉시스') · addToLibrary('snippets', ...) · openToolLinked(시대착오·캐릭터·관계도 등).
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'history-synopsis',
  name: '역사·사극 시놉시스 빌더',
  icon: '🏯',
  group: '구조',
  genre: '역사·사극',
  intro: '주인공·시대 배경·신분·정치 지형·거대 사건·정적·명분·반전·운명의 결말을 채워 사극 시놉시스를 자동 종합합니다',
  w: 740,
  h: 690,
}

const LS = 'sry:tool:history-synopsis'

// ---------- 타입 ----------
type SubKey = 'orthodox' | 'court' | 'althist' | 'regress' | 'fusion' | 'palaceRom' | 'martial'
type EraKey = 'founding' | 'sejong' | 'yeonsan' | 'jungjong' | 'imjin' | 'byeongja' | 'sukjong' | 'jeongjo' | 'late' | 'fictional'
type RigorKey = 'fictional' | 'loose' | 'balanced' | 'strict' | 'faction'
type FutureKey = 'none' | 'subtle' | 'core' | 'cheat'
type EndKey = 'tragic' | 'enthrone' | 'reform' | 'restore' | 'bittersweet' | 'cycle'
type EngineKey = 'coup' | 'purge' | 'war' | 'debate' | 'succession' | 'rise' | 'intrigue' | 'survive'

interface Draft {
  hero: string         // 주인공(처지·정체)
  setting: string      // 시대 배경·왕대 상황
  status: string       // 신분/처지(신분제의 족쇄)
  politics: string     // 정치 지형(왕권/신권·당파·외척)
  weapon: string       // 미래지식·신무기·기지(회빙환형) 또는 재능·학식
  bigEvent: string     // 거대 역사 사건(사화·전쟁·반정)
  antagonist: string   // 정적(외척·당파 영수·간신·요녀형 후궁)
  cause: string        // 명분·대의(충·효·의)
  reversal: string     // 반전·역전 장치(상소 설전·밀지·정변)
  fate: string         // 운명의 무게(독자가 아는 결말과의 긴장)
  theme: string        // 주제(이 역사가 던지는 질문)
  sub: SubKey
  era: EraKey
  rigor: RigorKey
  future: FutureKey
  engine: EngineKey
  end: EndKey
  tpl: number          // 선택한 종합 틀
}

// ---------- 하위유형(도시에 §1 분기 그대로) ----------
const SUBS: { key: SubKey; label: string; desc: string }[] = [
  { key: 'orthodox', label: '정통 역사소설', desc: '실존 인물·사건 중심, 고증 비중 높음. 빈틈을 상상으로 메운다(칼의 노래·토지 계열)' },
  { key: 'court', label: '궁중암투·사극', desc: '권력투쟁·당쟁·궁중 음모가 핵심. 인물 멜로와 정치 모략의 결합(여인천하·정도전 계열)' },
  { key: 'althist', label: '대체역사', desc: '“만약 그때 ~했다면” 분기. 임진 승전·조선 근대화 등(비명을 찾아서 계열)' },
  { key: 'regress', label: '회귀·빙의 사극', desc: '현대인이 과거 인물에 빙의/회귀해 미래지식으로 역사를 바꾸고 출세(웹소설 주류)' },
  { key: 'fusion', label: '퓨전·가상왕조', desc: '실존 국가를 모델로 한 가상 왕조로 고증 부담을 회피. 정치+성장+로맨스' },
  { key: 'palaceRom', label: '궁중 로맨스', desc: '왕·세자·무관과의 로맨스. 신분 격차·후궁 간택·정략혼이 갈등의 축' },
  { key: 'martial', label: '무협·역사 혼합', desc: '조선/중원 배경 무림. 역사적 사건을 무림 음모로 재해석' },
]
function subDef(k: SubKey) { return SUBS.find((s) => s.key === k) || SUBS[0] }

// ---------- 왕대 프리셋(도시에 §8: 왕대 선택 시 분위기·사건·당파 자동 제시) ----------
const ERAS: { key: EraKey; label: string; air: string; powers: string; events: string }[] = [
  { key: 'founding', label: '여말선초(건국기)', air: '왕조 교체의 격동과 명분 다툼', powers: '신진사대부 vs 권문세족, 정도전·이방원', events: '위화도 회군·역성혁명·왕자의 난' },
  { key: 'sejong', label: '세종조(성군의 치세)', air: '제도·문물의 전성, 학문과 발명의 시대', powers: '집현전·왕권 안정', events: '훈민정음·측우기·4군6진·과학 진흥' },
  { key: 'yeonsan', label: '연산조(폭정기)', air: '광기와 공포가 짓누르는 폭군의 시대', powers: '훈구 vs 사림, 외척·환관', events: '무오·갑자사화·흥청·중종반정' },
  { key: 'jungjong', label: '중종조(개혁과 좌절)', air: '사림의 이상과 반동의 충돌', powers: '훈구 vs 사림(조광조), 외척', events: '중종반정 후 정국·기묘사화' },
  { key: 'imjin', label: '선조조(임진왜란)', air: '미증유의 전란과 의병·명장의 분투', powers: '동인·서인 분당, 왕의 몽진', events: '임진왜란·이순신·의병·정유재란' },
  { key: 'byeongja', label: '인조조(병자호란)', air: '치욕과 명분의 비극, 삼배구고두', powers: '서인 집권, 친명배금 vs 주화', events: '인조반정·이괄의 난·정묘·병자호란' },
  { key: 'sukjong', label: '숙종조(환국정치)', air: '단번에 정권이 뒤집히는 환국의 격랑', powers: '남인·서인(노론·소론) 환국, 외척', events: '경신·기사·갑술환국·장희빈·인현왕후' },
  { key: 'jeongjo', label: '정조조(개혁군주)', air: '탕평과 실학, 좌절된 개혁의 꿈', powers: '노론 벽파 vs 시파, 왕의 친위', events: '규장각·수원화성·신해통공·정조 독살설' },
  { key: 'late', label: '조선 말·개항기', air: '외세와 격변, 무너지는 왕조', powers: '척사 vs 개화, 외척 세도', events: '병인·신미양요·개항·갑신정변·동학' },
  { key: 'fictional', label: '가상 왕조', air: '고증 부담을 던 가공의 왕조(자유 설정)', powers: '자유롭게 설계한 권력 구조', events: '작가가 설계한 가상의 대사건' },
]
function eraDef(k: EraKey) { return ERAS.find((e) => e.key === k) || ERAS[0] }

// ---------- 고증 강도(도시에: 가상왕조↔정통고증 슬라이더) ----------
const RIGORS: { key: RigorKey; label: string; desc: string }[] = [
  { key: 'fictional', label: '가상왕조(0)', desc: '실존 고증에 얽매이지 않는 가공 세계. 분위기만 사극' },
  { key: 'loose', label: '느슨(25)', desc: '실존 배경을 빌리되 사건·인물은 자유롭게 변형' },
  { key: 'balanced', label: '균형(50)', desc: '실존 사건의 뼈대는 지키되 빈틈을 상상으로(팩션의 기본)' },
  { key: 'strict', label: '엄정(75)', desc: '연대·제도·호칭까지 꼼꼼히 고증. 시대착오 경계' },
  { key: 'faction', label: '정통고증(100)', desc: '실록·사료에 밀착. 사실의 빈틈만 최소한으로 상상' },
]
function rigorDef(k: RigorKey) { return RIGORS.find((r) => r.key === k) || RIGORS[2] }

// ---------- 미래지식 사용(도시에 §4: Prolepsis as Weapon) ----------
const FUTURES: { key: FutureKey; label: string; desc: string }[] = [
  { key: 'none', label: '없음(고증형)', desc: '미래지식 없이 시대 안의 재능·학식·기지로만 승부' },
  { key: 'subtle', label: '은근', desc: '미래지식이 있으나 전면에 내세우지 않고 결정적 순간에만' },
  { key: 'core', label: '핵심(제약 있음)', desc: '미래지식이 주무기 — 단 “왜 지금 가능한가”의 제약(자원·인력·정치반발)을 건다' },
  { key: 'cheat', label: '치트(사이다)', desc: '미래지식·신무기로 적폐를 통쾌하게 응징(개연성보다 쾌감 우선)' },
]
function futureDef(k: FutureKey) { return FUTURES.find((f) => f.key === k) || FUTURES[0] }

// ---------- 플롯 엔진(도시에 §4·§5: 갈등의 동력) ----------
const ENGINES: { key: EngineKey; label: string; desc: string; phrase: string }[] = [
  { key: 'coup', label: '반정·정변', desc: '거사 모의→명분 축적→포섭→거병→정변. 정보전·배신·타이밍의 서스펜스', phrase: '한 번의 거사로 천하가 뒤집히는' },
  { key: 'purge', label: '사화·숙청', desc: '당파 간 피의 보복. 한 번 지면 가문이 멸하는 판돈', phrase: '피로 피를 씻는 사화의' },
  { key: 'war', label: '전란·결전', desc: '임진·병자형 외침. 열세 극복과 전술 역전의 명장면', phrase: '나라의 존망이 걸린 전란의' },
  { key: 'debate', label: '어전 설전·상소', desc: '갈등을 “말의 전쟁”으로. 논리·명분·고사로 정적을 제압', phrase: '말로써 칼을 대신하는 조정의' },
  { key: 'succession', label: '후계·세자 다툼', desc: '왕위 계승을 둘러싼 외척·당파의 암투. 간택·정략혼으로 동맹 재편', phrase: '보위를 둘러싼 골육의' },
  { key: 'rise', label: '입신·출세', desc: '미천한 처지에서 공을 세워 신뢰를 얻고 권력의 정점으로', phrase: '바닥에서 정상으로 오르는' },
  { key: 'intrigue', label: '궁중 음모·복수', desc: '함정·모함·독살의 그물망. 정보와 인내로 되갚는 복수극', phrase: '궁궐 깊은 곳의 음모와 복수의' },
  { key: 'survive', label: '생존·은둔', desc: '연좌·역모의 칼날을 피해 정체를 숨기고 살아남는다', phrase: '죽음의 칼날을 피해 살아남는' },
]
function engineDef(k: EngineKey) { return ENGINES.find((e) => e.key === k) || ENGINES[0] }

// ---------- 결말 톤(도시에 §6: 클라이맥스 관습) ----------
const ENDS: { key: EndKey; label: string; desc: string; close: string }[] = [
  { key: 'tragic', label: '장렬한 비극', desc: '승리보다 장렬한 패배·죽음이 절정(이순신 전사·단종 사사형)', close: '끝내 운명을 거스르지 못하였으나, 그가 남긴 이름만은 역사에 새겨져 오래도록 지워지지 않는다.' },
  { key: 'enthrone', label: '즉위·등극', desc: '주인공이 보위에 올라 권력의 정점에서 적폐 청산을 공표', close: '마침내 그가 용상에 오르고, 그를 짓밟던 자들은 무릎 꿇으며 새 시대의 막이 오른다.' },
  { key: 'reform', label: '개혁 완수', desc: '국정 개혁·전쟁 승리로 왕조의 운명을 바꾼다(대체역사형)', close: '그의 손으로 역사의 물길이 바뀌고, 이전과는 다른 내일이 이 땅에 열린다.' },
  { key: 'restore', label: '신원·복권', desc: '누명을 벗고 잃었던 가문·지위·명예를 되찾는다', close: '오랜 누명이 벗겨지고, 무너졌던 가문과 빼앗긴 이름이 마침내 제자리로 돌아온다.' },
  { key: 'bittersweet', label: '씁쓸한 승리', desc: '대가를 치르고 얻은 절반의 승리. 잃은 것이 더 크다', close: '뜻은 이루었으나 곁의 사람들을 잃었고, 손에 쥔 승리는 끝내 차갑기만 하다.' },
  { key: 'cycle', label: '운명의 수용', desc: '바꿀 수 없는 흐름을 받아들이는 비애의 카타르시스', close: '거스를 수 없는 시대의 물결 앞에서, 그는 마침내 자신의 운명을 조용히 끌어안는다.' },
]
function endDef(k: EndKey) { return ENDS.find((e) => e.key === k) || ENDS[0] }

// 빈 칸은 자리표시자로 — 언제나 읽히는 문장을 만든다.
function f(s: string, ph: string): string {
  const t = (s || '').trim()
  return t || `〔${ph}〕`
}
// 문장 끝 마침표 등 제거(문장 조립용)
function trim(s: string, ph: string): string {
  return f(s, ph).replace(/[.。!?]+$/, '')
}

// 한국어 조사 — 앞 글자의 받침을 보고 실제로 하나를 골라 붙인다(괄호 이중표기 금지).
// 끝 글자가 한글이 아니면(영문/숫자/따옴표/기호) 받침 없음으로 간주해 자연스러운 쪽을 택한다.
function hasJong(s: string): boolean {
  const m = (s || '').trim()
  if (!m) return false
  // 끝의 닫는 따옴표·괄호·문장부호는 건너뛰고 마지막 '글자'를 찾는다.
  let i = m.length - 1
  while (i >= 0 && /['’"”)\]}〕」』·]/.test(m[i])) i--
  if (i < 0) return false
  const ch = m.charCodeAt(i)
  if (ch < 0xac00 || ch > 0xd7a3) return false // 한글 음절이 아니면 받침 없음 취급
  return (ch - 0xac00) % 28 !== 0
}
// 받침 유무로 둘 중 하나 선택: jo(s,'을','를')
function jo(s: string, withJong: string, withoutJong: string): string {
  return s + (hasJong(s) ? withJong : withoutJong)
}
const eul = (s: string) => jo(s, '을', '를')   // 을/를
const iga = (s: string) => jo(s, '이', '가')   // 이/가
const eun = (s: string) => jo(s, '은', '는')   // 은/는
const euro = (s: string) => {                  // 으로/로 — 단, ㄹ 받침은 '로'
  const m = (s || '').trim()
  let i = m.length - 1
  while (i >= 0 && /['’"”)\]}〕」』·]/.test(m[i])) i--
  if (i >= 0) {
    const ch = m.charCodeAt(i)
    if (ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28 === 8) return s + '로' // ㄹ받침
  }
  return s + (hasJong(s) ? '으로' : '로')
}
const gwa = (s: string) => jo(s, '과', '와')   // 과/와
const ira = (s: string) => jo(s, '이라는', '라는') // 이라는/라는

// ---------- 종합 틀(템플릿) ----------
interface Tpl { name: string; hint: string; build: (d: Draft) => string }

const TEMPLATES: Tpl[] = [
  {
    name: '표준 줄거리형',
    hint: '주인공→시대→처지→정치 지형→사건→정적→명분→반전→운명 순의 정석',
    build: (d) => {
      const era = eraDef(d.era); const eng = engineDef(d.engine); const end = endDef(d.end)
      return [
        `${trim(d.hero, '주인공')} — ${eul(trim(d.setting, '시대 배경'))} 살아가는 인물의 이야기.`,
        `${ira(trim(d.status, '신분/처지'))} 족쇄를 짊어진 채, ${era.air} 속에서 ${trim(d.politics, '정치 지형')}의 한복판에 던져진다.`,
        `${eng.phrase} 소용돌이 — ${iga(trim(d.bigEvent, '거대 역사 사건'))} 닥치자, ${euro(trim(d.weapon, '미래지식·재능·기지'))} 활로를 연다.`,
        `그러나 ${iga(trim(d.antagonist, '정적'))} 사사건건 그를 견제하고, ${eul(trim(d.cause, '명분·대의'))} 두고 조정이 둘로 갈린다.`,
        `벼랑 끝에서 ${iga(trim(d.reversal, '반전·역전 장치'))} 판을 뒤집는다.`,
        `독자가 이미 아는 결말 — ${trim(d.fate, '운명의 무게')} — 그곳을 향해 이야기는 나아가고, 이 역사가 묻는 것은 ${trim(d.theme, '주제')}, 바로 그것이다. ${end.close}`,
      ].join(' ')
    },
  },
  {
    name: '회빙환 후킹형',
    hint: '“눈을 뜨니 조선이었다” 미래지식의 정보 비대칭으로 첫 줄을 건다',
    build: (d) => {
      const era = eraDef(d.era); const fut = futureDef(d.future)
      return [
        `눈을 떠보니 ${trim(d.setting, '시대 배경')} — ${iga(trim(d.hero, '주인공'))} 되어 있었다.`,
        `${ira(trim(d.status, '신분/처지'))} 처지에, ${iga(era.events)} 코앞으로 다가온 절체절명의 시국.`,
        `그러나 그에게는 누구도 갖지 못한 것이 있다 — ${trim(d.weapon, '미래지식·신무기')}(${fut.label}).`,
        `${trim(d.bigEvent, '거대 역사 사건')}의 향방을 아는 자만이 둘 수 있는 수로, ${trim(d.antagonist, '정적')}의 견제를 하나씩 무너뜨린다.`,
        `위기마다 ${euro(trim(d.reversal, '반전·역전 장치'))} 역전하며, 그는 ${eul(trim(d.cause, '명분·대의'))} 내세워 판을 키운다.`,
        `정해진 비극 ${trim(d.fate, '운명의 무게')} — 과연 그는 역사를 바꿀 수 있는가.`,
      ].join(' ')
    },
  },
  {
    name: '대하 사극형',
    hint: '시대의 공기와 권력의 작동 원리를 무겁게 깐다(정통·궁중물)',
    build: (d) => {
      const era = eraDef(d.era); const eng = engineDef(d.engine); const end = endDef(d.end)
      return [
        `${era.air}. ${trim(d.setting, '시대 배경')}, 권력은 ${era.powers}의 손에서 요동치고 있었다.`,
        `${eun(trim(d.hero, '주인공'))} ${trim(d.status, '신분/처지')}의 자리에서 ${eul(trim(d.politics, '정치 지형'))} 마주한다.`,
        `${eng.desc} — 그 한복판에 ${iga(trim(d.bigEvent, '거대 역사 사건'))} 그를 끌어들인다.`,
        `${gwa(trim(d.antagonist, '정적'))}의 대립은 ${eul(trim(d.cause, '명분·대의'))} 둘러싼 명분 싸움으로 번지고, ${iga(trim(d.reversal, '반전·역전 장치'))} 운명의 저울을 흔든다.`,
        `그리하여 ${trim(d.fate, '운명의 무게')}에 이른다. 이 이야기가 묻는 것은 ${trim(d.theme, '주제')}. ${end.close}`,
      ].join(' ')
    },
  },
  {
    name: '주인공 시점형',
    hint: '주인공의 내면·신분의 족쇄·선택을 전면에 세운다',
    build: (d) => {
      const end = endDef(d.end)
      return [
        `${trim(d.hero, '주인공')} — ${ira(trim(d.status, '신분/처지'))} 굴레를 평생의 짐으로 안고 살아온 사람.`,
        `${trim(d.setting, '시대 배경')}, ${iga(trim(d.politics, '정치 지형'))} 그의 발목을 옭아맨다.`,
        `${iga(trim(d.bigEvent, '거대 역사 사건'))} 그를 시험에 들게 하고, 그는 ${euro(trim(d.weapon, '재능·미래지식·기지'))} 맞선다.`,
        `${trim(d.antagonist, '정적')}의 칼끝 앞에서 그가 끝내 붙드는 것은 ${trim(d.cause, '명분·대의')}, 바로 그것이다.`,
        `${eul(trim(d.reversal, '반전·역전 장치'))} 지나, 그가 마주한 운명은 ${trim(d.fate, '운명의 무게')}. 그가 깨닫는 것은 ${trim(d.theme, '주제')}. ${end.close}`,
      ].join(' ')
    },
  },
  {
    name: '대체역사 분기형',
    hint: '“만약 그때 ~했다면” 분기점과 나비효과를 전면에',
    build: (d) => {
      const era = eraDef(d.era); const end = endDef(d.end)
      return [
        `역사의 갈림길 — ${era.events}. 만약 그 순간을 다시 둘 수 있다면.`,
        `${eun(trim(d.hero, '주인공'))} ${eul(trim(d.weapon, '미래지식·신기술'))} 가지고 ${trim(d.bigEvent, '바꾸려는 거대 사건')}에 손을 댄다.`,
        `${trim(d.status, '신분/처지')}의 한계와 ${trim(d.antagonist, '정적')}의 반발, 그리고 무엇보다 ${iga(trim(d.politics, '정치 지형'))} 변화를 가로막는다.`,
        `${eul(trim(d.cause, '명분·대의'))} 명분으로 그는 한 걸음씩 역사의 물길을 튼다 — 단, 모든 변화에는 나비효과의 대가가 따른다.`,
        `${iga(trim(d.reversal, '반전·역전 장치'))} 분기를 확정짓고, 끝내 ${trim(d.fate, '바뀐 운명')}에 닿는다. 이 가정이 묻는 것은 ${trim(d.theme, '주제')}. ${end.close}`,
      ].join(' ')
    },
  },
  {
    name: '실록 사료체형',
    hint: '“○년 ○월, 실록은 기록한다…” 사료 인용 분위기로',
    build: (d) => {
      const era = eraDef(d.era); const eng = engineDef(d.engine)
      return [
        `[${era.label}] 사관은 붓을 들어 한 사람의 일을 적는다.`,
        `${trim(d.hero, '주인공')}, ${trim(d.status, '신분/처지')}의 자리에서 ${eul(trim(d.setting, '시대 배경'))} 살다.`,
        `${eng.label}의 풍파가 일고 ${iga(trim(d.bigEvent, '거대 역사 사건'))} 닥치니, 그가 ${eul(trim(d.cause, '명분·대의'))} 들어 조정에 맞서다.`,
        `${iga(trim(d.antagonist, '정적'))} 그를 모해하였으되, ${euro(trim(d.reversal, '반전·역전 장치'))} 그 죄를 밝히다.`,
        `사관이 평하여 이르되, ${trim(d.theme, '주제')} — 그 끝은 ${trim(d.fate, '운명의 무게')}였더라.`,
      ].join(' ')
    },
  },
  {
    name: '웹소설 로그라인형',
    hint: '하위유형·시대·미래지식을 한 줄에 압축',
    build: (d) => {
      const sub = subDef(d.sub); const era = eraDef(d.era); const fut = futureDef(d.future)
      return [
        `[${sub.label}·${era.label}·미래지식 ${fut.label}] ${trim(d.status, '신분/처지')}의 ${iga(trim(d.hero, '주인공'))} ${euro(trim(d.weapon, '무기'))} ${trim(d.bigEvent, '거대 사건')}에 맞선다.`,
        `${eul(trim(d.antagonist, '정적'))} 꺾고 ${eul(trim(d.cause, '명분'))} 세워 — 마침내 ${trim(d.theme, '주제')}.`,
      ].join(' ')
    },
  },
  {
    name: '구조 개요형',
    hint: '제출용 트리트먼트처럼 항목별로 정리',
    build: (d) => {
      const sub = subDef(d.sub); const era = eraDef(d.era); const rig = rigorDef(d.rigor)
      const fut = futureDef(d.future); const eng = engineDef(d.engine); const end = endDef(d.end)
      return [
        `[하위유형] ${sub.label} · [왕대/시대] ${era.label} · [고증 강도] ${rig.label} · [미래지식] ${fut.label} · [플롯 엔진] ${eng.label} · [결말] ${end.label}`,
        `[주인공] ${f(d.hero, '처지·정체')}`,
        `[시대 배경] ${f(d.setting, '왕대 상황·시대의 공기')}`,
        `[신분/처지] ${f(d.status, '신분제의 족쇄')}`,
        `[정치 지형] ${f(d.politics, '왕권/신권·당파·외척')}`,
        `[미래지식·무기·재능] ${f(d.weapon, '결정적 우위')}`,
        `[거대 역사 사건] ${f(d.bigEvent, '사화·전쟁·반정')}`,
        `[정적] ${f(d.antagonist, '외척·당파 영수·간신')}`,
        `[명분·대의] ${f(d.cause, '충·효·의')}`,
        `[반전·역전 장치] ${f(d.reversal, '상소 설전·밀지·정변')}`,
        `[운명의 무게] ${f(d.fate, '독자가 아는 결말과의 긴장')}`,
        `[주제] ${f(d.theme, '이 역사가 던지는 질문')}`,
      ].join('\n')
    },
  },
]

// ---------- 영감 풀(무작위 채움) — 역사·사극 도시에에 근거한 구체적·장르 특화 데이터 ----------
const HERO_POOL = [
  '죽었어야 할 폐세자의 몸으로 눈을 뜬 현대의 사학도 ‘나’',
  '실록 한 줄로만 남은 무명의 사관(史官)',
  '서얼이라는 이유로 등용길이 막힌 천재 책략가 ‘윤겸’',
  '몰락한 무반 가문의 막내로, 변방 진(鎭)을 지키는 부장 ‘이강’',
  '수라간 나인에서 시작해 어선(御膳)을 책임지는 자리에 오른 ‘서래’',
  '왕의 어린 시절을 지킨, 충(忠)과 야망 사이의 내금위장 ‘무영’',
  '환국 한 번에 가문이 멸문된, 복수를 품은 남인의 유일한 핏줄 ‘이도진’',
  '의주 만상(灣商)의 행수로, 조선과 청을 잇는 거상을 꿈꾸는 ‘박만덕’',
  '폐비의 아들이라는 낙인을 안고 보위에 오른 어린 임금',
  '역모의 누명을 쓰고 위리안치된 전(前) 대제학의 외동딸 ‘소윤’',
  '무오년 사화로 스승을 잃고 산림(山林)에 숨은 사림의 후예',
  '통신사의 역관으로 왜국을 오가며 정보를 캐는 첩보가 ‘김응서’',
  '대대로 어의를 배출한 의관 가문에서 약방을 지키는 젊은 의녀 ‘단이’',
  '암행어사의 마패를 품고 지방 수령의 비리를 캐는 신진 문관 ‘정도현’',
  '천문과 역법을 다루다 미래를 점치는 자로 몰린 관상감의 천문생 ‘유서’',
  '왕실 호위를 맡은 별군직 출신으로, 무예는 으뜸이나 글을 모르는 무인 ‘강철주’',
]
const SETTING_POOL = [
  '왜군의 발이 코앞에 이른, 동인·서인이 갈라진 선조조의 한양',
  '삼배구고두의 치욕이 임박한, 남한산성에 갇힌 인조조의 겨울',
  '무오·갑자 두 사화의 피비린내가 가시지 않은 연산조의 궁궐',
  '환국 한 번에 정승의 목이 오가던, 장희빈과 인현왕후의 숙종조',
  '탕평과 규장각의 개혁이 노론 벽파에 막히던 정조조의 창덕궁',
  '조광조의 이상이 기묘사화로 꺾여가던 중종조의 조정',
  '훈민정음 반포를 앞두고 사대부의 반대가 들끓던 세종조',
  '위화도 회군 직후, 새 왕조의 칼자루를 두고 권문세족과 신진사대부가 맞선 개경',
  '개항의 격랑 속, 척사와 개화가 칼을 겨눈 조선 말의 한양 도성',
  '왕권은 약하고 외척의 세도가 하늘을 찌르던 어느 시국',
  '훈민정음 반포를 앞두고 사대부의 반대가 들끓던 세종조의 집현전',
  '거듭된 흉년과 역병으로 민심이 들끓고 도적이 횡행하던 어느 봄',
  '명·청 교체기의 풍랑 속, 사대의 향배를 두고 조정이 흔들리던 시국',
  '세자 책봉을 둘러싼 암투로 동궁(東宮)에 긴장이 감돌던 어느 해',
]
const STATUS_POOL = [
  '적자에게 밀려 평생 벼슬길이 막힌 서얼',
  '면천(免賤)을 꿈꾸는 관노(官奴) 출신',
  '역적의 자손으로 연좌되어 변방으로 내쳐진 처지',
  '여인의 몸으로 정치에 발을 들일 수 없는 규방의 신세',
  '권세를 잃고 몰락한 양반가의 마지막 자손',
  '왕의 핏줄이나 폐서인(廢庶人)된 종친',
  '천한 중인(中人)이라 학식에도 불구하고 한직에 묶인 신세',
  '간택 후궁으로 들어와 외척의 패가 된 후궁',
  '무관(武官)이라 문반(文班)에 늘 눌리는 처지',
  '귀양에서 풀려났으나 삭탈관직되어 백의(白衣)의 몸',
  '과거에 급제하고도 가문의 당색에 밀려 청요직에서 배제된 처지',
  '궁녀로 입궁해 평생 출궁이 허락되지 않는 내명부의 신세',
  '역관·의관 같은 잡과 출신이라 양반에게 늘 멸시받는 기술직',
  '종친이되 왕위 계승에서 멀어 정치 참여조차 금지된 한가한 군(君)',
]
const POLITICS_POOL = [
  '왕권을 누르려는 신권(臣權)과 이를 거머쥐려는 왕의 팽팽한 줄다리기',
  '훈구와 사림이 사화로 서로의 씨를 말리려는 권력 지형',
  '동인·서인, 다시 남인·북인으로 갈라진 붕당의 칼바람',
  '노론과 소론이 세자의 자리를 두고 맞붙은 후계 다툼',
  '외척이 어린 왕을 끼고 조정을 농단하는 세도의 그늘',
  '환관과 후궁이 내전(內殿)을 등에 업고 벌이는 은밀한 권력 게임',
  '명에 대한 사대와 신흥 청 사이에서 갈라진 친명·주화의 대립',
  '언관(言官) 삼사가 임금의 뜻에도 굽히지 않는 공론(公論)의 견제',
  '척신(戚臣)과 산림(山林)이 인사권을 두고 벌이는 암투',
  '세자를 옹위하는 동궁 세력과 이를 흔들려는 후궁 소생 측의 대립',
  '재정난 속에 군포·공납의 개혁을 둘러싸고 갈라진 조정의 이해다툼',
  '지방 향반(鄕班)과 중앙 경화사족(京華士族) 사이의 보이지 않는 알력',
]
const WEAPON_POOL = [
  '환국·사화의 시기와 결과를 미리 아는 역사 지식',
  '화약 배합과 신식 화포의 제법을 꿰뚫은 기술',
  '이앙법·구황작물로 흉년을 넘기는 농정(農政) 지식',
  '종두법으로 역병을 막아 민심을 얻는 의술',
  '복식부기와 환(換)을 이용한 상업·재정 운용술',
  '적의 수를 읽어내는 병법과 진법(陣法)의 재능',
  '경전과 고사를 자유로이 인용해 좌중을 압도하는 변설(辯舌)',
  '필체와 위조를 간파하는 눈, 그리고 정보를 모으는 첩보망',
  '측우기·해시계 등 미래의 기물(器物)을 재현하는 손재주',
  '인물의 마음을 꿰뚫어 포섭하고 이간하는 용인술(用人術)',
  '암호와 봉서(封書)를 짜고 푸는 능력, 그리고 빈틈없는 기억력',
  '수리와 측량에 밝아 성곽·수레·기계 장치를 설계하는 공학적 재능',
  '시정의 소문과 저잣거리 여론을 읽어 민심을 움직이는 선동의 감각',
]
const BIG_EVENT_POOL = [
  '임진왜란 — 왜군이 부산을 넘어 보름 만에 한양으로 밀고 오는 국난',
  '병자호란 — 청군이 압록을 넘어 남한산성을 에워싸는 겨울의 포위',
  '갑자사화 — 폐비의 원한을 빌미로 조정을 피로 물들이는 숙청',
  '기묘사화 — 개혁을 외치던 사림이 하룻밤에 쓸려나가는 반동',
  '인조반정 — 광해를 끌어내리고 새 임금을 세우는 거사',
  '기사·갑술환국 — 하루아침에 정권이 통째로 뒤집히는 정변',
  '세자의 죽음 — 뒤주에 갇혀 여드레 만에 숨을 거두는 비극',
  '이괄의 난 — 논공행상에 불만을 품은 장수가 도성을 점령하는 반란',
  '정유재란의 명량 — 열두 척으로 수백 척을 막아야 하는 결전',
  '동학의 봉기 — 학정에 맞선 농민들이 관아를 휩쓰는 거대한 물결',
  '무오사화 — 한 줄의 사초(史草)가 빌미가 되어 사림이 도륙되는 참극',
  '계유정난 — 수양대군이 김종서를 제거하고 권력을 틀어쥐는 정변',
  '경신환국 — 남인이 하루아침에 실각하고 서인이 정권을 거머쥐는 격변',
  '신미양요 — 강화도 앞바다에 이양선이 나타나 포성이 울리는 충격',
]
const ANTAGONIST_POOL = [
  '어린 왕을 허수아비로 세운 채 조정을 쥐락펴락하는 외척의 영수',
  '대의명분을 앞세워 정적을 사화로 도륙하는 당파의 거두',
  '임금의 총애를 등에 업고 내전을 농단하는 요녀형 후궁',
  '겉으론 충신, 속으론 역심을 품은 음흉한 권간(權奸)',
  '주인공의 가문을 멸문시킨 원수, 지금은 일인지하의 정승',
  '왜·청과 내통해 나라를 팔아넘기려는 매국의 무리',
  '환관의 우두머리로, 밀지와 인사권을 손에 쥔 내시부 수장',
  '능력은 출중하나 사사로운 권력욕에 사로잡힌 라이벌 신료',
  '주화(主和)와 척화(斥和)로 사사건건 부딪치는 강경파 영수',
  '국법을 손에 쥐고 무고한 죄인을 만들어내는 냉혹한 형조 판서',
  '변방의 병권을 사사로이 키워 도성을 노리는 야심 찬 절도사',
  '왕실 재정을 주무르며 매관매직으로 곳간을 채우는 탐욕의 척신',
]
const CAUSE_POOL = [
  '도탄에 빠진 백성을 구해야 한다는 애민(愛民)의 대의',
  '무너진 군신(君臣)의 의리와 종묘사직을 지키려는 충(忠)',
  '억울하게 죽은 아버지의 원한을 풀려는 효(孝)',
  '대의를 위해 사사로운 정을 끊어야 하는 멸사봉공(滅私奉公)',
  '오랑캐에게 무릎 꿇을 수 없다는 척화(斥和)의 명분',
  '실리를 위해 명분을 굽혀야 한다는 주화(主和)의 현실론',
  '적서·반상의 벽을 넘어 인재를 쓰자는 개혁의 기치',
  '왕권을 바로 세워 신권의 발호를 막아야 한다는 명분',
  '백성과의 약속, 신의(信義)를 끝까지 지키려는 의리',
  '스승의 가르침과 학문의 도리를 저버릴 수 없다는 사도(師道)의 의리',
  '천하의 이치는 백성에게 있다는 민본(民本)의 신념',
  '예법과 명분으로 무너진 강상(綱常)을 다시 세우려는 대의',
]
const REVERSAL_POOL = [
  '어전회의에서 결정적 증거를 내밀어 정적을 무릎 꿇리는 상소 대결',
  '위조된 밀지의 진위를 가려내 역모의 전모를 폭로하는 한 수',
  '봉수·파발의 지연을 역이용해 적의 허를 찌르는 정보전',
  '숨겨둔 출생의 비밀이 드러나며 권력도가 통째로 재편되는 폭로',
  '거병 당일, 내응(內應)을 미리 포섭해 두어 무혈로 궁궐을 장악',
  '신무기·진법으로 압도적 열세를 뒤집는 결전의 한 장면',
  '간택·정략혼으로 적의 동맹을 가르고 우군을 끌어들이는 한 수',
  '왕의 어심을 돌려 “윤허한다”는 한 마디를 끌어내는 결정타',
  '죽은 줄 알았던 핵심 증인이 살아 돌아와 모든 것을 증언',
  '적이 파둔 함정인 줄 알면서도 역으로 덫을 놓아 되치는 반격',
  '잊혔던 선왕의 유서(遺書)가 발견되어 대의명분이 뒤바뀌는 한 수',
  '오랜 세월 숨겨온 장부와 증좌를 한꺼번에 풀어 부정을 까발리는 폭로',
  '민심을 등에 업은 상소의 물결로 임금의 결단을 끌어내는 공론전',
]
const FATE_POOL = [
  '역사가 정한 그 죽음 — 막을 수 있는가, 아니면 되풀이될 뿐인가',
  '독자는 이미 안다, 그가 끝내 사약을 받게 되리라는 것을',
  '바꾸려 할수록 더 깊어지는, 정해진 비극을 향한 발걸음',
  '승리의 끝에 기다리는 것은 전사(戰死), 그러나 그것이 곧 불멸',
  '한 왕조의 운명이 그의 손끝에 걸려 있다는 무게',
  '연좌의 칼날 — 그가 지면 삼족이 함께 스러진다',
  '바뀐 역사가 불러올 또 다른 비극, 나비효과의 그늘',
  '폐위·사사(賜死)로 끝난 실제 기록과의 끝없는 줄다리기',
  '권력의 정점에 닿는 순간 가장 가까운 이를 잃게 된다는 예감',
  '이겨도 시대의 한계 앞에선 결국 제자리로 돌아오고 마는 흐름',
]
const THEME_POOL = [
  '정해진 운명 앞에서 인간의 의지는 무엇을 바꿀 수 있는가',
  '대의와 사사로운 정(情) 가운데 무엇을 택해야 하는가',
  '권력은 무엇을 위해 쥐어야 하며, 무엇 앞에서 내려놓아야 하는가',
  '신분이 정한 자리에 갇힌 자도 자신의 길을 낼 수 있는가',
  '명분과 실리가 부딪칠 때, 무엇이 진정 백성을 위하는가',
  '역사를 바꾸는 것은 옳은가, 아니면 흐름은 끝내 제자리로 돌아오는가',
  '충(忠)이란 임금을 향한 것인가, 백성과 사직을 향한 것인가',
  '패배가 정해진 싸움에도 끝까지 싸워야 할 이유는 무엇인가',
  '승리의 대가로 사람을 잃는다면, 그 승리는 누구를 위한 것인가',
  '한 사람의 양심은 시대의 광기 앞에서 어디까지 버틸 수 있는가',
  '진실을 기록하는 일과 살아남는 일이 충돌할 때 무엇을 택할 것인가',
]

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

// 조합수(선택지 + 영감 풀 기준) — 핵심 생성기 지향(1조+).
// SUBS(7)·ERAS(10)·RIGORS(5)·FUTURES(4)·ENGINES(8)·ENDS(6) × 11개 텍스트 풀의 곱.
const COMBOS = SUBS.length * ERAS.length * RIGORS.length * FUTURES.length * ENGINES.length * ENDS.length *
  HERO_POOL.length * SETTING_POOL.length * STATUS_POOL.length * POLITICS_POOL.length *
  WEAPON_POOL.length * BIG_EVENT_POOL.length * ANTAGONIST_POOL.length * CAUSE_POOL.length *
  REVERSAL_POOL.length * FATE_POOL.length * THEME_POOL.length

// ---------- 자작 예시(사극 관습에 충실) ----------
interface Example extends Omit<Draft, 'tpl'> { title: string }
const EXAMPLES: Example[] = [
  {
    title: '폐세자, 다시 보위를 노리다',
    hero: '죽었어야 할 폐세자의 몸으로 눈을 뜬 현대의 사학도 ‘나’',
    setting: '환국 한 번에 정승의 목이 오가던 숙종조의 궁궐',
    status: '폐서인(廢庶人)된 종친으로, 언제 사약이 내릴지 모르는 처지',
    politics: '남인·서인이 환국으로 서로의 씨를 말리려는 권력 지형',
    weapon: '환국·사화의 시기와 결과를 미리 아는 역사 지식',
    bigEvent: '기사·갑술환국 — 하루아침에 정권이 통째로 뒤집히는 정변',
    antagonist: '임금의 총애를 등에 업고 내전을 농단하는 요녀형 후궁',
    cause: '왕권을 바로 세워 신권의 발호를 막아야 한다는 명분',
    reversal: '위조된 밀지의 진위를 가려내 역모의 전모를 폭로하는 한 수',
    fate: '독자는 이미 안다, 그가 끝내 사약을 받게 되리라는 것을',
    theme: '정해진 운명 앞에서 인간의 의지는 무엇을 바꿀 수 있는가',
    sub: 'regress', era: 'sukjong', rigor: 'balanced', future: 'core', engine: 'intrigue', end: 'enthrone',
  },
  {
    title: '남한산성, 그 겨울의 명분',
    hero: '주화(主和)와 척화(斥和) 사이에서 임금을 보필하는 도승지',
    setting: '삼배구고두의 치욕이 임박한, 남한산성에 갇힌 인조조의 겨울',
    status: '귀양에서 풀려났으나 삭탈관직되어 백의(白衣)의 몸',
    politics: '명에 대한 사대와 신흥 청 사이에서 갈라진 친명·주화의 대립',
    weapon: '경전과 고사를 자유로이 인용해 좌중을 압도하는 변설',
    bigEvent: '병자호란 — 청군이 남한산성을 에워싸는 겨울의 포위',
    antagonist: '오랑캐에게 무릎 꿇을 수 없다는 강경 척화파 영수',
    cause: '실리를 위해 명분을 굽혀야 한다는 주화(主和)의 현실론',
    reversal: '어전회의에서 결정적 논리로 임금의 어심을 돌리는 상소 대결',
    fate: '폐위·치욕으로 끝난 실제 기록과의 끝없는 줄다리기',
    theme: '명분과 실리가 부딪칠 때, 무엇이 진정 백성을 위하는가',
    sub: 'orthodox', era: 'byeongja', rigor: 'faction', future: 'none', engine: 'debate', end: 'bittersweet',
  },
  {
    title: '만약, 임진의 바다를 미리 알았다면',
    hero: '통신사의 역관으로 왜국을 오가며 정보를 캐는 첩보가 ‘김응서’',
    setting: '왜군의 발이 코앞에 이른, 동인·서인이 갈라진 선조조의 한양',
    status: '천한 중인(中人)이라 학식에도 불구하고 한직에 묶인 신세',
    politics: '동인·서인으로 갈라져 전란의 경보마저 당쟁에 묻히는 조정',
    weapon: '화약 배합과 신식 화포의 제법을 꿰뚫은 기술',
    bigEvent: '임진왜란 — 왜군이 부산을 넘어 보름 만에 밀고 오는 국난',
    antagonist: '왜와 내통해 경보를 막고 나라를 팔아넘기려는 매국의 무리',
    cause: '도탄에 빠진 백성을 구해야 한다는 애민(愛民)의 대의',
    reversal: '신무기·진법으로 압도적 열세를 뒤집는 결전의 한 장면',
    fate: '바뀐 역사가 불러올 또 다른 비극, 나비효과의 그늘',
    theme: '역사를 바꾸는 것은 옳은가, 아니면 흐름은 끝내 제자리로 돌아오는가',
    sub: 'althist', era: 'imjin', rigor: 'loose', future: 'cheat', engine: 'war', end: 'reform',
  },
]

// ---------- 저장 항목 ----------
interface Saved { id: string; title: string; draft: Draft; text: string; createdAt: number }

function newId(prefix = 'hs'): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return prefix + '_' + crypto.randomUUID() } catch { /* noop */ }
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const SUB_KEYS: SubKey[] = ['orthodox', 'court', 'althist', 'regress', 'fusion', 'palaceRom', 'martial']
const ERA_KEYS: EraKey[] = ['founding', 'sejong', 'yeonsan', 'jungjong', 'imjin', 'byeongja', 'sukjong', 'jeongjo', 'late', 'fictional']
const RIGOR_KEYS: RigorKey[] = ['fictional', 'loose', 'balanced', 'strict', 'faction']
const FUTURE_KEYS: FutureKey[] = ['none', 'subtle', 'core', 'cheat']
const ENGINE_KEYS: EngineKey[] = ['coup', 'purge', 'war', 'debate', 'succession', 'rise', 'intrigue', 'survive']
const END_KEYS: EndKey[] = ['tragic', 'enthrone', 'reform', 'restore', 'bittersweet', 'cycle']

function blankDraft(): Draft {
  return {
    hero: '', setting: '', status: '', politics: '', weapon: '', bigEvent: '',
    antagonist: '', cause: '', reversal: '', fate: '', theme: '',
    sub: 'regress', era: 'sukjong', rigor: 'balanced', future: 'core', engine: 'intrigue', end: 'enthrone', tpl: 0,
  }
}

function normDraft(x: unknown): Draft {
  const o = (x || {}) as Partial<Draft>
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const d = blankDraft()
  return {
    hero: str(o.hero), setting: str(o.setting), status: str(o.status), politics: str(o.politics),
    weapon: str(o.weapon), bigEvent: str(o.bigEvent), antagonist: str(o.antagonist),
    cause: str(o.cause), reversal: str(o.reversal), fate: str(o.fate), theme: str(o.theme),
    sub: SUB_KEYS.includes(o.sub as SubKey) ? (o.sub as SubKey) : d.sub,
    era: ERA_KEYS.includes(o.era as EraKey) ? (o.era as EraKey) : d.era,
    rigor: RIGOR_KEYS.includes(o.rigor as RigorKey) ? (o.rigor as RigorKey) : d.rigor,
    future: FUTURE_KEYS.includes(o.future as FutureKey) ? (o.future as FutureKey) : d.future,
    engine: ENGINE_KEYS.includes(o.engine as EngineKey) ? (o.engine as EngineKey) : d.engine,
    end: END_KEYS.includes(o.end as EndKey) ? (o.end as EndKey) : d.end,
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
  const sub = subDef(d.sub); const era = eraDef(d.era); const rig = rigorDef(d.rigor)
  const fut = futureDef(d.future); const eng = engineDef(d.engine); const end = endDef(d.end)
  const row = (label: string, v: string) => (v && v.trim() ? `<p><b>${escHtml(label)}:</b> ${escHtml(v.trim())}</p>` : '')
  const paras = text.split('\n').filter(Boolean).map((p) => `<p>${escHtml(p)}</p>`).join('')
  return [
    `<p><b>하위유형:</b> ${escHtml(sub.label)} · <b>왕대/시대:</b> ${escHtml(era.label)} · <b>고증 강도:</b> ${escHtml(rig.label)} · <b>미래지식:</b> ${escHtml(fut.label)} · <b>플롯 엔진:</b> ${escHtml(eng.label)} · <b>결말:</b> ${escHtml(end.label)}</p>`,
    `<hr/>`,
    `<p style="font-size:14px;line-height:1.7;"><b>시놉시스</b></p>`,
    paras,
    `<hr/>`,
    row('주인공(처지·정체)', d.hero),
    row('시대 배경(시대의 공기)', d.setting),
    row('신분/처지(신분제의 족쇄)', d.status),
    row('정치 지형(왕권/신권·당파·외척)', d.politics),
    row('미래지식·무기·재능', d.weapon),
    row('거대 역사 사건', d.bigEvent),
    row('정적', d.antagonist),
    row('명분·대의(충·효·의)', d.cause),
    row('반전·역전 장치', d.reversal),
    row('운명의 무게', d.fate),
    row('주제', d.theme),
  ].filter(Boolean).join('')
}

export default function HistorySynopsis({ payload }: { payload?: Record<string, unknown> }) {
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
      const isEmpty = !init.current.cur.hero && !init.current.cur.setting && !init.current.cur.bigEvent
      if (seed && isEmpty) {
        setCur((p) => ({ ...p, hero: p.hero || seed }))
        flashNote('전달받은 아이디어를 주인공 칸에 넣었습니다. 자유롭게 고쳐 쓰세요.')
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

  const hasInput = !!(cur.hero || cur.setting || cur.status || cur.politics || cur.weapon || cur.bigEvent || cur.antagonist || cur.cause || cur.reversal || cur.fate || cur.theme)

  // ---- 영감(무작위 채움) — 빈 칸만 채운다 ----
  const inspire = () => {
    setCur((p) => ({
      ...p,
      hero: p.hero || pick(HERO_POOL),
      setting: p.setting || pick(SETTING_POOL),
      status: p.status || pick(STATUS_POOL),
      politics: p.politics || pick(POLITICS_POOL),
      weapon: p.weapon || pick(WEAPON_POOL),
      bigEvent: p.bigEvent || pick(BIG_EVENT_POOL),
      antagonist: p.antagonist || pick(ANTAGONIST_POOL),
      cause: p.cause || pick(CAUSE_POOL),
      reversal: p.reversal || pick(REVERSAL_POOL),
      fate: p.fate || pick(FATE_POOL),
      theme: p.theme || pick(THEME_POOL),
    }))
    flashNote('빈 칸에 사극 영감 예시를 채웠습니다. 마음대로 고쳐 쓰세요.')
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
      title: title.trim() || (cur.hero.trim() ? cur.hero.trim().slice(0, 24) : '제목 없는 시놉시스'),
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
    setCur((p) => ({ ...blankDraft(), sub: p.sub, era: p.era, rigor: p.rigor, future: p.future, engine: p.engine, end: p.end, tpl: p.tpl }))
    setEditId(null); setTitle('')
    flashNote('입력을 비웠습니다.')
  }

  // 왕대 프리셋 적용 — 빈 칸에 시대의 공기·정치 지형을 자동 제안(도시에 §8)
  const applyEra = (k: EraKey) => {
    const era = eraDef(k)
    setCur((p) => ({
      ...p,
      era: k,
      setting: p.setting || (k === 'fictional' ? '' : `${era.air} (${era.label})`),
      politics: p.politics || (k === 'fictional' ? '' : era.powers),
      bigEvent: p.bigEvent || (k === 'fictional' ? '' : era.events.split('·')[0]),
    }))
    flashNote(k === 'fictional' ? '가상 왕조 — 자유롭게 설정하세요.' : `${era.label} 프리셋: 주요 당파·사건을 빈 칸에 제안했습니다.`)
  }

  // ---- 연계: 프로젝트 기획 폴더에 시놉시스 문서 추가 ----
  const toProject = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const docTitle = (title.trim() || (cur.hero.trim() ? cur.hero.trim().slice(0, 24) : '시놉시스'))
    const id = addToProject({
      kind: 'text', root: 'research', folder: '기획',
      title: `시놉시스 — ${docTitle}`,
      bodyHtml: bodyHtmlOf(cur, text),
      synopsis: text.split('\n')[0]?.slice(0, 120),
      meta: {
        장르: '역사·사극', 하위유형: subDef(cur.sub).label, 왕대시대: eraDef(cur.era).label,
        고증강도: rigorDef(cur.rigor).label, 미래지식: futureDef(cur.future).label,
        플롯엔진: engineDef(cur.engine).label, 결말: endDef(cur.end).label, 틀: TEMPLATES[cur.tpl].name,
      },
    })
    flashNote(id ? '프로젝트 자료 〈기획〉 폴더에 시놉시스 문서를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 연계: 글감 보관함에 스니펫 저장 ----
  const toLibrary = () => {
    addToLibrary('snippets', {
      text,
      source: '역사·사극 시놉시스 빌더',
      tags: ['시놉시스', '역사·사극', subDef(cur.sub).label, eraDef(cur.era).label, endDef(cur.end).label],
    })
    flashNote('생성한 시놉시스를 글감 보관함에 저장했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const headBar: React.CSSProperties = { padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
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
            onChange={(e) => setField(k, e.target.value as never)} placeholder={ph} maxLength={ml || 240} rows={2} />
        ) : (
          <input style={input} value={cur[k] as string} onChange={(e) => setField(k, e.target.value as never)} placeholder={ph} maxLength={ml || 160} />
        )}
        {pool && <button style={dice} title="이 칸만 무작위로 다시 굴리기" onClick={() => reroll(k, pool)}><Emoji e="🎲"/></button>}
      </div>
    </div>
  )

  return (
    <div style={wrap}>
      <div style={headBar}>
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="🏯"/> 역사·사극 시놉시스 빌더</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>주인공·시대·신분·정치·사건·정적·명분·반전·운명 → 사극 시놉시스</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="minibtn" onClick={inspire} title="빈 칸에 무작위 사극 영감 채우기"><Emoji e="🎲"/> 영감</button>
          <button className="minibtn" onClick={() => setShowEx((v) => !v)}>{showEx ? '예시 닫기' : <><Emoji e="📚"/> 작품 예시</>}</button>
        </div>
      </div>

      <div style={body}>
        {note && (
          <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>{emojify(note)}</div>
        )}

        {showEx && (
          <div style={card}>
            <h4 style={sectionTitle}>사극 예시 — 눌러 입력에 채우기</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EXAMPLES.map((ex) => (
                <div key={ex.title} style={{ ...savedRow, gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>「{ex.title}」</b>
                    <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>
                      {subDef(ex.sub).label} · {eraDef(ex.era).label} · {endDef(ex.end).label}
                    </span>
                    <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => applyExample(ex)}>이 예시 쓰기</button>
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--muted)', wordBreak: 'keep-all' }}>{ex.hero} · {ex.bigEvent}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 유형·시대·강도 선택 */}
        <div style={card}>
          <h4 style={sectionTitle}>하위유형 · 왕대/시대 · 고증 강도 · 미래지식 · 플롯 엔진 · 결말</h4>

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
            <span style={fieldLabel}>왕대/시대 프리셋 — 누르면 시대의 공기·당파·사건을 빈 칸에 제안</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ERAS.map((e) => (
                <button key={e.key} onClick={() => applyEra(e.key)} style={chip(cur.era === e.key)} title={`${e.air} · 권력: ${e.powers} · 사건: ${e.events}`}>{e.label}</button>
              ))}
            </div>
            <div style={{ ...hint, marginTop: 6 }}>
              <b>{eraDef(cur.era).air}</b> · 권력: {eraDef(cur.era).powers} · 사건: {eraDef(cur.era).events}
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <span style={fieldLabel}>고증 강도(가상왕조 ↔ 정통고증)</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {RIGORS.map((r) => (
                <button key={r.key} onClick={() => setField('rigor', r.key)} style={chip(cur.rigor === r.key)} title={r.desc}>{r.label}</button>
              ))}
            </div>
            <div style={{ ...hint, marginTop: 6 }}>{rigorDef(cur.rigor).desc}</div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <span style={fieldLabel}>미래지식 사용(회귀·빙의형의 핵심 무기)</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {FUTURES.map((ft) => (
                <button key={ft.key} onClick={() => setField('future', ft.key)} style={chip(cur.future === ft.key)} title={ft.desc}>{ft.label}</button>
              ))}
            </div>
            <div style={{ ...hint, marginTop: 6 }}>{futureDef(cur.future).desc}</div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <span style={fieldLabel}>플롯 엔진(갈등의 동력)</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ENGINES.map((en) => (
                <button key={en.key} onClick={() => setField('engine', en.key)} style={chip(cur.engine === en.key)} title={en.desc}>{en.label}</button>
              ))}
            </div>
            <div style={{ ...hint, marginTop: 6 }}>{engineDef(cur.engine).desc}</div>
          </div>

          <div>
            <span style={fieldLabel}>결말 톤(사극 클라이맥스 관습)</span>
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
            <div style={col}><Field k="hero" label="주인공 (처지·정체)" ph="예: 죽었어야 할 폐세자의 몸으로 눈을 뜬 사학도 ‘나’" pool={HERO_POOL} /></div>
            <div style={col}><Field k="status" label="신분/처지 — 신분제의 족쇄" ph="예: 적자에게 밀려 벼슬길이 막힌 서얼" pool={STATUS_POOL} /></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="setting" label="시대 배경 — 시대의 공기(왕대 상황)" ph="예: 왜군이 코앞에 이른, 동인·서인이 갈라진 선조조의 한양" ml={240} area pool={SETTING_POOL} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="politics" label="정치 지형 — 왕권/신권·당파·외척" ph="예: 남인·서인이 환국으로 서로의 씨를 말리려는 권력 지형" ml={240} area pool={POLITICS_POOL} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="weapon" label="미래지식·무기·재능 — 결정적 우위" ph="예: 환국·사화의 시기와 결과를 미리 아는 역사 지식" ml={220} area pool={WEAPON_POOL} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="bigEvent" label="거대 역사 사건 — 개인과 교차하는 대사건" ph="예: 임진왜란 — 왜군이 보름 만에 한양으로 밀고 오는 국난" ml={240} area pool={BIG_EVENT_POOL} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="antagonist" label="정적 — 외척·당파 영수·간신·요녀형 후궁" ph="예: 어린 왕을 허수아비로 세운 외척의 영수" ml={220} area pool={ANTAGONIST_POOL} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="cause" label="명분·대의 — 충(忠)·효(孝)·의(義)" ph="예: 도탄에 빠진 백성을 구해야 한다는 애민의 대의" ml={220} area pool={CAUSE_POOL} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="reversal" label="반전·역전 장치 — 상소 설전·밀지·정변" ph="예: 어전회의에서 결정적 증거로 정적을 무릎 꿇리는 상소 대결" ml={240} area pool={REVERSAL_POOL} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="fate" label="운명의 무게 — 독자가 아는 결말과의 긴장" ph="예: 역사가 정한 그 죽음, 막을 수 있는가" ml={220} area pool={FATE_POOL} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="theme" label="주제 — 이 역사가 던지는 질문" ph="예: 정해진 운명 앞에서 인간의 의지는 무엇을 바꿀 수 있는가" ml={200} area pool={THEME_POOL} />
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
            <button className="linkbtn" onClick={() => openToolLinked('character-forge', { genre: '역사·사극', seed: cur.hero })} title="주인공 캐릭터 만들기"><Emoji e="👤"/> 캐릭터 만들기</button>
            <button className="linkbtn" onClick={() => openToolLinked('relationship-map', { genre: '역사·사극' })} title="군신·당파·외척의 관계를 펼치기"><Emoji e="🕸️"/> 관계도</button>
            <button className="linkbtn" onClick={() => openToolLinked('conflict-builder', { genre: '역사·사극', seed: cur.antagonist })} title="정적과의 갈등을 더 정교하게"><Emoji e="⚔️"/> 갈등 설계</button>
            <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre: '역사·사극' })} title="플롯 구조로 펼치기"><Emoji e="🔺"/> 플롯 구조</button>
            <button className="linkbtn" onClick={() => openToolLinked('anachronism-checker', { genre: '역사·사극' })} title="시대착오·고증 점검"><Emoji e="🏺"/> 시대착오 점검</button>
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
                      {subDef(s.draft.sub).label} · {eraDef(s.draft.era).label} · {endDef(s.draft.end).label}
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
          사극 시놉시스의 심장은 <b>거대 사건과 개인의 교차</b>, 그리고 <b>독자가 결말을 이미 아는 운명의 무게</b>입니다 —
          “무엇이 일어나는가”보다 <b>“어떻게 그 결말에 이르는가”의 과정미</b>를 설계하세요.
          왕은 만능 독재자가 아니라 <b>신권·언관·예법에 제약</b>되며, 인물의 행동은 <b>충·효·의·대의명분</b>으로 정당화되거나 그것과 충돌해야 합니다.
          선택지와 영감 풀만으로도 약 {COMBOS.toLocaleString('en-US')}가지 변주가 가능합니다. 입력·저장은 이 브라우저에 자동 저장됩니다.
        </div>

        {/* 저작권: 모든 문구는 본 도구가 자체 생성한 창작 풀(외부 텍스트 미사용) */}
        <div className="license-note" style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.4 }}>
          <span className="license-badge">자체 창작</span> 모든 슬롯·예시 문구는 이 도구가 자체 작성한 오리지널 풀로, 외부 저작물을 사용하지 않습니다.
        </div>
      </div>
    </div>
  )
}
