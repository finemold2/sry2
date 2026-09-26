// 판타지 시놉시스 빌더 — 세계(이세계/대륙)·마법 체계·주인공·운명/관습·갈등(봉인된 악·정치)·대가·결말 톤을
// 입력하면 판타지 장르 관습에 맞춘 시놉시스를 여러 문체 틀로 자동 종합한다.
// 하위장르(하이·로우·어반·이세계전이·헌터물·다크·로판·소드앤소서리)와 마법의 성격(하드/소프트), 결말 톤을
// 고르면 그 결에 맞춘 도입문·전개·결구를 자동 조립한다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크 없음(전부 로컬·자작 데이터, 판타지 도시에 근거).
// 모든 입력/저장은 localStorage 'sry:tool:fantasy-synopsis' 에 JSON 으로 자동 저장·복원. 언마운트 시 타이머 정리.
// 연계: addToProject(folder:'기획','시놉시스') · addToLibrary('snippets', ...) · openToolLinked(설정집·캐릭터·플롯 등).
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'fantasy-synopsis',
  name: '판타지 시놉시스 빌더',
  icon: '🐉',
  group: '구조',
  genre: '판타지',
  intro: '세계·마법 체계·주인공·운명·갈등(봉인된 악·정치)·대가·결말 톤을 채워 판타지 시놉시스를 자동 종합합니다',
  w: 720,
  h: 660,
}

const LS = 'sry:tool:fantasy-synopsis'

// ---------- 타입 ----------
type SubKey = 'high' | 'low' | 'urban' | 'isekai' | 'hunter' | 'grimdark' | 'romanceF' | 'sns'
type MagicKey = 'hard' | 'soft' | 'system' | 'price' | 'bloodline' | 'forbidden'
type ToneKey = 'triumph' | 'bittersweet' | 'tragic' | 'wonder' | 'cathartic' | 'open' | 'grim'
type ScaleKey = 'village' | 'kingdom' | 'continent' | 'world' | 'gods'

interface Draft {
  world: string        // 세계/대륙/이세계 무대
  magic: string        // 마법 체계의 핵심 규칙·원천
  hero: string         // 주인공(누구)
  heroEdge: string     // 주인공의 비범함·결핍·약점(선택받은 자/회귀 등)
  destiny: string      // 운명·예언·각성의 계기(부름)
  antagonist: string   // 적대 세력(마왕·봉인된 악·정치·교단)
  conflict: string     // 핵심 갈등(맞서는 힘)
  cost: string         // 마법/승리의 대가(상실·후유증)
  theme: string        // 주제(질문)
  sub: SubKey
  magicType: MagicKey
  tone: ToneKey
  scale: ScaleKey
  tpl: number          // 선택한 종합 틀
}

// ---------- 하위장르(도시에의 분기 그대로) ----------
const SUBS: { key: SubKey; label: string; desc: string; tag: string }[] = [
  { key: 'high', label: '하이 판타지', desc: '지구와 무관한 독립 세계. 세계관 자체가 주인공(반지의 제왕·얼불노)', tag: '제2세계' },
  { key: 'low', label: '로우 판타지', desc: '현실 세계에 마법·이종족이 침투. 도시 판타지의 모태', tag: '현실 침투' },
  { key: 'urban', label: '어반 판타지', desc: '현대 도시 배경의 마법·초자연(드레스덴 파일)', tag: '도시의 마법' },
  { key: 'isekai', label: '이세계 전이·전생', desc: '회빙환으로 이세계에 떨어진 주인공(오버로드·전생슬라임)', tag: '회·빙·환' },
  { key: 'hunter', label: '헌터물·게이트물', desc: '현실에 던전·게이트가 열리고 각성자가 등장(나혼자만 레벨업)', tag: '각성·랭커' },
  { key: 'grimdark', label: '다크 판타지', desc: '도덕적 회색지대·폭력·정치(베르세르크·말라잔)', tag: '회색지대' },
  { key: 'romanceF', label: '로맨스 판타지', desc: '회귀·빙의·악역영애 + 황실 정치 + 로맨스(재혼 황후)', tag: '황실·로판' },
  { key: 'sns', label: '소드 앤 소서리', desc: '영웅 개인의 모험 중심(코난·드리즈트)', tag: '영웅 모험' },
]
function subDef(k: SubKey) { return SUBS.find((s) => s.key === k) || SUBS[0] }

// ---------- 마법의 성격(도시에: 하드/소프트·대가·시스템·혈통·금주) ----------
const MAGICS: { key: MagicKey; label: string; desc: string; phrase: string }[] = [
  { key: 'hard', label: '하드 매직', desc: '명시적 규칙·비용·한계의 마법(미스트본·어스시). 복선 회수로 해결', phrase: '규칙이 분명한 마법' },
  { key: 'soft', label: '소프트 매직', desc: '규칙 불명·신비의 마법(간달프식). 경이와 위협의 연출용', phrase: '신비에 싸인 힘' },
  { key: 'system', label: '시스템·스테이터스', desc: '게임 UI를 서사에 삽입 — 레벨·스탯·스킬·퀘스트(웹소설)', phrase: '시스템이 지배하는 세계' },
  { key: 'price', label: '등가교환·대가', desc: '모든 마법이 상실·후유증·금기의 값을 요구한다', phrase: '대가를 치르는 마법' },
  { key: 'bloodline', label: '혈통·계약', desc: '핏줄·신·정령과의 계약으로 힘을 잇는다', phrase: '핏줄로 이어진 힘' },
  { key: 'forbidden', label: '금주·흑마법', desc: '대가가 큰 금기의 술법 — 영혼·생명을 담보로 한다', phrase: '금단의 술법' },
]
function magicDef(k: MagicKey) { return MAGICS.find((m) => m.key === k) || MAGICS[0] }

// ---------- 결말 톤 ----------
const TONES: { key: ToneKey; label: string; desc: string; close: string }[] = [
  { key: 'triumph', label: '승리', desc: '시련을 이기고 질서를 되찾는다', close: '봉인은 다시 채워지고, 세계는 다음 새벽을 맞는다.' },
  { key: 'cathartic', label: '사이다', desc: '쌓인 굴욕과 떡밥을 한 번에 응징·회수한다', close: '무시당하던 자가 마침내 정점에 서고, 모든 빚은 이자까지 갚아진다.' },
  { key: 'bittersweet', label: '씁쓸한 승리', desc: '이겼으나 대가가 무겁게 남는다', close: '세계는 구원받았으나, 그 값으로 가장 소중한 것이 사라졌다.' },
  { key: 'tragic', label: '비극', desc: '되돌릴 수 없는 상실로 닫힌다', close: '영웅은 운명을 거역했으나, 운명은 끝내 자기 값을 받아냈다.' },
  { key: 'wonder', label: '경이', desc: '세계의 크기를 다시 알게 되며 끝난다', close: '지도의 끝 너머, 아직 이름 붙지 않은 세계가 그를 부른다.' },
  { key: 'open', label: '여운', desc: '봉인의 균열·새 위협의 암시로 여지를 남긴다', close: '악은 잠들었을 뿐, 봉인의 틈으로 새어 나온 한기는 아직 가시지 않았다.' },
  { key: 'grim', label: '회색', desc: '선악이 모호한 채 권력만 자리를 바꾼다', close: '왕좌의 주인은 바뀌었으나, 그 자리에 드리운 그림자는 여전하다.' },
]
function toneDef(k: ToneKey) { return TONES.find((t) => t.key === k) || TONES[0] }

// ---------- 스케일(도시에: 마을→왕국→대륙→세계→신) ----------
const SCALES: { key: ScaleKey; label: string; phrase: string }[] = [
  { key: 'village', label: '마을·개인', phrase: '한 마을과 한 사람의 운명' },
  { key: 'kingdom', label: '왕국·정치', phrase: '왕국의 권좌와 음모' },
  { key: 'continent', label: '대륙·전쟁', phrase: '대륙을 가르는 전란' },
  { key: 'world', label: '세계·질서', phrase: '세계의 질서 그 자체' },
  { key: 'gods', label: '신·신화', phrase: '신들과 창세의 비밀' },
]
function scaleDef(k: ScaleKey) { return SCALES.find((s) => s.key === k) || SCALES[0] }

// 빈 칸은 자리표시자로 — 언제나 읽히는 문장을 만든다.
function f(s: string, ph: string): string {
  const t = (s || '').trim()
  return t || `〔${ph}〕`
}
// 문장 끝 마침표·온점 제거(문장 조립용)
function trim(s: string, ph: string): string {
  return f(s, ph).replace(/[.。!?]+$/, '')
}

// ---------- 한국어 조사 자동 선택(앞 글자 받침 판정) ----------
// 〔자리표시자〕·따옴표·괄호 등 비한글 꼬리는 건너뛰고 마지막 '한글 음절'의 받침으로 판정.
function lastHangulSyllable(s: string): string {
  const t = (s || '').trim()
  for (let i = t.length - 1; i >= 0; i--) {
    const c = t.charCodeAt(i)
    if (c >= 0xac00 && c <= 0xd7a3) return t[i]
  }
  return ''
}
// 받침(종성) 유무. 받침 없음/판정 불가 → false.
function hasBatchim(s: string): boolean {
  const ch = lastHangulSyllable(s)
  if (!ch) return false
  return (ch.charCodeAt(0) - 0xac00) % 28 !== 0
}
// ㄹ 받침인지(‘으로/로’ 판정용 — ㄹ 받침은 ‘로’).
function isRieulBatchim(s: string): boolean {
  const ch = lastHangulSyllable(s)
  if (!ch) return false
  return (ch.charCodeAt(0) - 0xac00) % 28 === 8
}
// 조사 결합: 받침 있으면 withB, 없으면 noB. 한글이 없으면 받침 있는 형태를 기본값으로.
function josa(word: string, withB: string, noB: string): string {
  return word + (hasBatchim(word) ? withB : noB)
}
// 을/를
function eul(w: string): string { return josa(w, '을', '를') }
// 이/가
function iga(w: string): string { return josa(w, '이', '가') }
// 은/는
function eun(w: string): string { return josa(w, '은', '는') }
// 으로/로 (ㄹ 받침은 '로')
function ro(w: string): string {
  return w + (hasBatchim(w) && !isRieulBatchim(w) ? '으로' : '로')
}
// 와/과
function gwa(w: string): string { return josa(w, '과', '와') }

// ---------- 종합 틀(템플릿) ----------
interface Tpl { name: string; hint: string; build: (d: Draft) => string }

const TEMPLATES: Tpl[] = [
  {
    name: '표준 줄거리형',
    hint: '세계→마법→주인공→부름→적·갈등→대가→결말 톤 순의 정석',
    build: (d) => {
      const mg = magicDef(d.magicType); const tone = toneDef(d.tone); const sc = scaleDef(d.scale)
      const w = trim(d.world, '세계·무대'); const he = trim(d.hero, '주인공')
      const ds = trim(d.destiny, '운명·예언·각성의 계기'); const an = trim(d.antagonist, '적대 세력')
      const cf = trim(d.conflict, '핵심 갈등'); const co = trim(d.cost, '마법·승리의 대가')
      return [
        `${w} — ${iga(mg.phrase)} 흐르는 곳. ${trim(d.magic, '마법 체계의 핵심 규칙')}.`,
        `${eun(he)} ${josa(trim(d.heroEdge, '주인공의 비범함·결핍·약점'), '이다', '다')}.`,
        `${iga(ds)} 평범한 일상을 깨뜨리며 그를 부른다.`,
        `그러나 ${iga(an)} 그림자를 드리우고, ${iga(cf)} 길을 막는다.`,
        `${iga(sc.phrase)} 걸린 이 싸움의 끝에서 그는 ${eul(co)} 치러야 한다.`,
        `결국 이 이야기는 ${eul(trim(d.theme, '주제'))} 묻는다. ${tone.close}`,
      ].join(' ')
    },
  },
  {
    name: '예언·부름형',
    hint: '“예언이 깨어나는 날” 운명의 부름으로 호기심을 건다',
    build: (d) => {
      const sub = subDef(d.sub)
      const w = trim(d.world, '세계·무대'); const he = trim(d.hero, '주인공')
      const an = trim(d.antagonist, '적대 세력'); const cf = trim(d.conflict, '핵심 갈등')
      return [
        `오래된 예언이 다시 입에 오르내릴 무렵, ${trim(d.destiny, '운명·예언·각성의 계기')}.`,
        `${eul(w)} 무대로, ${sub.label}의 이야기가 시작된다.`,
        `${he} — ${trim(d.heroEdge, '비범함·결핍·약점')} — 그(녀)는 ${an}에 맞서 ${eul(cf)} 떠안는다.`,
        `힘에는 값이 따른다: ${trim(d.cost, '마법·승리의 대가')}.`,
        `예언은 예상과 다른 얼굴로 실현되고, 이야기는 ${eul(trim(d.theme, '주제'))} 향해 나아간다.`,
      ].join(' ')
    },
  },
  {
    name: '인물 중심형',
    hint: '주인공의 시선과 선택을 전면에 세운다',
    build: (d) => {
      const tone = toneDef(d.tone); const mg = magicDef(d.magicType)
      const an = trim(d.antagonist, '적대 세력'); const cf = trim(d.conflict, '핵심 갈등')
      return [
        `${trim(d.hero, '주인공')} — ${trim(d.heroEdge, '비범함·결핍·약점')}.`,
        `${trim(d.world, '세계·무대')}에서, 그(녀)는 ${mg.phrase} 속에서 ${eul(trim(d.destiny, '운명·각성의 계기'))} 마주한다.`,
        `${iga(an)} 그(녀)를 시험하고, ${iga(cf)} 누구도 대신 져줄 수 없는 선택으로 좁혀진다.`,
        `무엇을 택하든 ${eul(trim(d.cost, '대가'))} 내놓아야 한다.`,
        `그 선택의 끝에서 드러나는 것은 ${josa(trim(d.theme, '주제'), '이다', '다')}. ${tone.close}`,
      ].join(' ')
    },
  },
  {
    name: '세계관 중심형',
    hint: '세계의 규칙과 마법 체계를 먼저 세운다',
    build: (d) => {
      const sub = subDef(d.sub); const mg = magicDef(d.magicType); const sc = scaleDef(d.scale)
      const an = trim(d.antagonist, '적대 세력'); const he = trim(d.hero, '주인공')
      const cf = trim(d.conflict, '핵심 갈등'); const co = trim(d.cost, '대가')
      return [
        `${trim(d.world, '세계·무대')} — ${sub.desc}.`,
        `이 세계를 떠받치는 규칙: ${trim(d.magic, '마법 체계')} (${mg.label}).`,
        `그 질서 위로 ${iga(an)} 균열을 내고, ${iga(he)} 그 한가운데로 끌려든다.`,
        `${iga(sc.phrase)} 흔들릴 때, ${iga(cf)} 첨예해지고 ${iga(co)} 다가온다.`,
        `결국 이 세계가 비추는 것은 ${josa(trim(d.theme, '주제'), '이다', '다')}.`,
      ].join(' ')
    },
  },
  {
    name: '뒤표지(블러브)형',
    hint: '책 뒤표지 홍보문구처럼 압축·자극적으로',
    build: (d) => {
      return [
        `${trim(d.destiny, '운명·각성의 계기')}.`,
        `${trim(d.world, '세계·무대')}에서 ${eun(trim(d.hero, '주인공'))} 결코 어제 같은 하루를 살 수 없게 된다.`,
        `${iga(trim(d.antagonist, '적대 세력'))} 모든 것을 무너뜨리려 할 때, 그(녀) 앞에 놓인 단 하나의 길 — ${trim(d.conflict, '핵심 갈등')}.`,
        `그 끝에서 치를 값은 ${trim(d.cost, '대가')}. 마지막 장을 덮기 전, 당신도 묻게 된다: ${trim(d.theme, '주제')}.`,
      ].join(' ')
    },
  },
  {
    name: '웹소설 로그라인형',
    hint: '회빙환·각성·사이다를 한 줄에 압축',
    build: (d) => {
      const sub = subDef(d.sub); const mg = magicDef(d.magicType)
      const he = trim(d.hero, '주인공'); const cf = trim(d.conflict, '핵심 갈등'); const co = trim(d.cost, '대가')
      return [
        `[${sub.label}·${mg.label}] ${trim(d.world, '세계·무대')}에서, ${josa(trim(d.heroEdge, '결핍·약점'), '이던', '이던')} ${iga(he)} ${eul(trim(d.destiny, '각성·회귀의 계기'))} 통해 달라진다.`,
        `${trim(d.antagonist, '적대 세력')}에 맞서 ${eul(cf)} 돌파하고 ${eul(co)} 건 끝에 — ${trim(d.theme, '주제')}.`,
      ].join(' ')
    },
  },
  {
    name: '구조 개요형',
    hint: '제출용 트리트먼트처럼 항목별로 정리',
    build: (d) => {
      const sub = subDef(d.sub); const mg = magicDef(d.magicType); const tone = toneDef(d.tone); const sc = scaleDef(d.scale)
      return [
        `[하위장르] ${sub.label} · [마법] ${mg.label} · [스케일] ${sc.label} · [결말 톤] ${tone.label}`,
        `[세계·무대] ${f(d.world, '세계·무대')}`,
        `[마법 체계] ${f(d.magic, '마법 체계의 핵심 규칙')}`,
        `[주인공] ${f(d.hero, '주인공')} (${f(d.heroEdge, '비범함·결핍·약점')})`,
        `[운명·부름] ${f(d.destiny, '운명·예언·각성의 계기')}`,
        `[적대 세력] ${f(d.antagonist, '마왕·봉인된 악·정치·교단')}`,
        `[핵심 갈등] ${f(d.conflict, '핵심 갈등')}`,
        `[대가] ${f(d.cost, '마법·승리의 대가')}`,
        `[주제] ${f(d.theme, '주제')}`,
      ].join('\n')
    },
  },
]

// ---------- 영감 풀(무작위 채움) — 판타지 도시에에 근거한 구체적·장르 특화 데이터 ----------
const WORLD_POOL = [
  '여섯 왕국이 갈라진 검과 마법의 대륙 〈아스카리온〉',
  '천 년째 마탑이 하늘을 떠받치는 부유 도시 〈셀레네〉',
  '신들이 잠든 뒤 마법이 말라가는 황혼의 대륙',
  '안개 너머로 사라진 고대 제국의 폐허 위에 세워진 변경 왕국',
  '용이 다스리던 시대가 끝나고 인간이 그 뼈 위에 도시를 세운 땅',
  '북쪽 빙벽 너머에 봉인된 마왕을 잊은 채 번영하는 황실',
  '게이트가 도심 한복판에 열려 던전이 일상이 된 현대 서울',
  '정령과 인간이 계약으로 공존하는 숲의 도시국가',
  '교단이 마법을 이단으로 단죄하는 종교 제국',
  '바다가 사라지고 모래 밑에 가라앉은 항구 문명',
  '소설 속 악역 영애로 빙의한, 황태자가 다스리는 제국 궁정',
  '레벨과 스탯이 신의 율법처럼 작동하는 신생 이세계',
  '두 개의 달이 번갈아 뜨며 마법의 조류가 뒤바뀌는 쌍월(雙月)의 대륙',
  '거대한 세계수의 가지마다 도시가 매달려 사는 수목 문명',
  '영원한 밤에 잠긴 채 인공 태양의 마력으로 버티는 지하 제국',
  '계절이 수십 년씩 이어지고 긴 겨울마다 망자가 깨어나는 변경',
  '신들의 전쟁으로 하늘이 갈라진 뒤 떠다니는 부유 섬들의 군도',
  '죽은 신의 거대한 시신 위에 도시들이 세워진 사해(死骸) 대륙',
]
const MAGIC_POOL = [
  '8서클로 나뉜 마나 회로 — 한 서클을 올릴 때마다 수명을 깎는다',
  '진명(眞名)을 아는 자만이 사물을 부릴 수 있고, 부르는 만큼 균형이 무너진다',
  '계약한 정령의 분노가 곧 술자의 광기로 되돌아온다',
  '레벨·스탯·스킬 창이 모두에게 보이지만, 주인공만 ‘재설정’이 가능하다',
  '피를 매개로 한 혈맹 마법 — 같은 피끼리만 술법을 이을 수 있다',
  '죽은 자의 기억을 태워 마력으로 쓰는 금주(禁呪)',
  '오러(검기)는 마음의 흔들림을 그대로 베어내 술자를 먼저 벤다',
  '신성력은 신앙의 깊이만큼 강하나, 거짓 기도는 술자를 불태운다',
  '시간을 되감는 회귀 — 한 번 쓸 때마다 한 사람의 기억을 잃는다',
  '룬을 새기는 위치에 따라 효과가 뒤집히는 변덕스러운 인챈트',
  '소환수와 영혼을 공유해, 그 짐승이 죽으면 술자의 일부도 함께 죽는다',
  '마도공학으로 마나를 연료처럼 정제·거래하는 산업화된 마법',
  '아티팩트에 깃든 의지가 사용할수록 술자의 인격을 잠식한다',
  '신탁으로 내려오는 신성 마법 — 신의 변덕에 따라 힘이 거두어진다',
  '별자리의 운행을 읽어 끌어 쓰는 점성 마법 — 하늘이 흐리면 힘을 잃는다',
  '음악·노래에 가락을 실어 부리는 영창 마법 — 목소리를 잃으면 술법도 끊긴다',
  '그림자를 떼어 부리는 술법 — 빛 아래에서는 무력해지고 밤에 강해진다',
  '기억을 마력으로 환전하는 마법 — 강한 술법일수록 더 많은 추억을 지운다',
  '문신처럼 몸에 새긴 룬으로만 발동하는 마법 — 살갗이 다하면 힘도 다한다',
  '꿈속에서만 자유로운 몽환 마법 — 현실로 끌어내는 만큼 술자가 잠들지 못한다',
]
const HERO_EDGE_POOL = [
  '버림받은 사생아였으나 사라진 왕가의 마지막 핏줄이다',
  '재능 없는 낙오자였다가 회귀 후 미래의 지식을 쥔 자다',
  '마력을 한 톨도 쓰지 못하는 ‘무능력자’이지만 마법을 무효화한다',
  '가문에 버림받고 죽었다가, 십 년 전으로 돌아와 다시 눈을 떴다',
  '예언이 지목한 구원자이나, 정작 그 예언을 믿지 않는다',
  '최약체 F급 헌터였으나 홀로 던전에서 시스템을 각성했다',
  '원작에선 처형당하는 악역 영애에 빙의해 파멸 플래그를 피해야 한다',
  '검술은 천재적이나 사람을 베는 것을 끝내 두려워한다',
  '기억을 잃은 채 깨어났고, 그 빈 기억 속에 세계의 비밀이 묻혀 있다',
  '신에게 선택받았으나, 그 신을 끝내 증오한다',
  '몰락한 마탑의 마지막 제자로, 금서에 담긴 9서클 비밀을 홀로 안다',
  '평범한 모험가로 살고 싶었으나, 죽은 마왕의 영혼이 그에게 깃들었다',
  '소설 속 단역 기사로 빙의해, 원작에 없던 자유를 처음 갖게 되었다',
  '검을 쥐면 누구도 못 이기지만, 검을 놓는 순간 가장 약한 자가 된다',
]
const DESTINY_POOL = [
  '봉인된 마왕의 부활을 알리는 별이 천 년 만에 떠올랐다',
  '죽은 멘토가 남긴 한 통의 유언이 잊힌 혈통을 일깨운다',
  '게이트에서 돌아온 날, 그에게만 보이는 시스템 창이 떠올랐다',
  '처형대 위에서 눈을 감았다가, 파혼 직전의 그날로 되돌아왔다',
  '금지된 서고에서 진명 하나를 읽은 순간 세계가 그를 알아보았다',
  '용의 알을 주운 소년에게 고대의 계약이 깨어났다',
  '모두가 외면한 변경의 봉화가 오르고, 그만이 그 부름에 응한다',
  '정령왕이 그를 ‘세계의 균형을 되돌릴 자’로 지목했다',
  '죽은 줄 알았던 누이의 편지가 십 년 만에 도착했다',
  '악역으로 죽을 운명임을 깨닫고, 살아남기 위해 판을 뒤집기로 한다',
  '도심에 첫 게이트가 열린 날, 그 안에서 홀로 살아 돌아왔다',
  '천 년에 한 번 열리는 마탑의 시험장이 그를 후계자로 지목했다',
  '잠결에 읽은 별자리가 그를 ‘마지막 봉인의 열쇠’로 가리켰다',
  '버려진 신전에서 깨어난 고대의 검이 그의 손을 주인으로 택했다',
  '온 마을이 하룻밤 새 잿더미가 되고, 그 불길 속에서 그만이 살아남았다',
  '꿈마다 찾아오던 낯선 여인이 사실 봉인된 여신이었음을 알게 된다',
  '계약의 인장이 손등에 떠오른 날, 정령들이 그를 군주로 받들기 시작했다',
  '왕국 전역의 마법이 일제히 멈춘 ‘침묵의 날’, 그의 힘만 깨어났다',
]
const ANTAGONIST_POOL = [
  '천 년 봉인이 풀려가는 잠든 마왕과 그를 섬기는 교단',
  '왕좌를 노리고 형제를 차례로 베어가는 야심가 대공',
  '마법을 독점하려 이단 재판을 휘두르는 대신관',
  '세계를 ‘초기화’하려는, 시스템 너머의 관리자',
  '인간을 가축처럼 사육해온 고대 흡혈 귀족 가문',
  '예언을 막으려다 오히려 예언을 이루는 현왕(賢王)',
  '게이트 너머에서 침공해 오는 마계의 군주',
  '주인공을 파멸시키려는 원작의 ‘진짜 주인공’과 그 후원 세력',
  '죽음을 정복하려 산 자를 제물로 바치는 리치 군주',
  '질서의 이름으로 자유를 말살하려는 제국의 그림자 정보국',
  '봉인을 풀어 세계를 ‘정화’하려는 타락한 옛 용사',
  '마나가 마르는 세계에서 마지막 마력을 독식하려는 마탑 연합',
  '세계를 백지로 되돌려 다시 쓰려는, 창세에 실패한 옛 신',
  '예언된 영웅을 미리 제거하려 시간을 거슬러 온 미래의 폭군',
  '죽음을 두려워해 산 자의 수명을 거둬들이는 불멸의 황제',
  '인간의 감정을 양식 삼아 세계를 잿빛으로 물들이는 공허의 군세',
  '영웅의 가면을 쓰고 대중의 환호 속에서 세계를 집어삼키는 위선의 성자',
  '운명을 직조하며 모든 이의 결말을 미리 정해두는 베틀의 마녀',
]
const CONFLICT_POOL = [
  '봉인을 다시 채울 열쇠가 곧 봉인을 푸는 열쇠와 같다는 사실',
  '동료라 믿은 자가 적의 첩자였고, 그를 베어야 길이 열린다',
  '세계를 구하려면 자신을 따르던 이들을 제물로 바쳐야 한다',
  '복수의 표적이 알고 보니 어린 자신을 구한 은인이었다',
  '예언을 따르면 세계가, 거스르면 사랑하는 이가 죽는다',
  '약자였던 자가 강해질수록 그를 키운 가문과 등져야 한다',
  '진실을 밝히면 그가 지켜온 질서 전체가 거짓 위에 섰음이 드러난다',
  '랭킹의 정점에 오를수록 더 거대한 적이 그를 기다린다',
  '황태자의 마음을 얻을수록 원작의 파멸 플래그가 가까워진다',
  '마왕을 베는 유일한 길이 또 다른 마왕이 되는 것이다',
  '멘토가 중반에 쓰러지고, 아직 미완성인 채로 홀로 서야 한다',
  '시스템이 내린 퀘스트의 보상이 사실 세계를 무너뜨리는 함정이다',
]
const COST_POOL = [
  '마법을 쓸 때마다 깎여 나가는 자신의 수명',
  '되찾으려던 단 한 사람의 기억',
  '함께 떠나온 동료들 중 누군가의 목숨',
  '인간으로 남을 권리, 혹은 인간이라는 정체성',
  '돌아갈 고향이라는 마지막 희망',
  '예언을 이루는 대가로 잃게 될 자유의지',
  '회귀할 때마다 사라지는 사랑했던 이의 기억',
  '왕좌에 앉기 위해 묻어야 할 자신의 양심',
  '봉인을 채우는 제물이 될 자기 자신',
  '계약한 정령에게 내어줄, 죽은 뒤의 영혼',
  '검을 휘두를 때마다 닳아 사라지는 인간다움',
  '신성력을 얻는 대가로 잃는 분노·사랑 같은 감정',
  '미래의 지식을 쥔 값으로, 누구도 그를 믿지 못하게 되는 고독',
  '레벨을 올릴수록 멀어지는, 평범하게 살고 싶던 소망',
  '용을 길들인 대가로 짊어지는, 그 짐승이 태운 마을들의 죄',
  '두 번째 삶을 얻는 대신 기억에서 지워질 첫 번째 생의 가족',
]
const THEME_POOL = [
  '운명은 거역할 수 있는가, 아니면 거역마저 운명인가',
  '힘에는 반드시 값이 따른다 — 무엇까지 내놓을 수 있는가',
  '선택받은 자가 아니라, 선택하는 자가 영웅이 된다',
  '복수의 끝에 남는 것은 정의인가, 또 다른 폐허인가',
  '한 사람을 지우면 천 명을 살릴 수 있다 — 그래도 되는가',
  '괴물을 베려는 자는 어디까지 괴물이 되어도 좋은가',
  '잃어버린 것을 되찾기 위해 더 많은 것을 잃어야 한다면',
  '질서와 자유 중 무엇이 더 많은 피를 요구하는가',
  '두 번째 삶은 첫 번째 삶의 후회를 갚을 수 있는가',
  '예언은 미래를 정하는가, 그것을 믿는 우리가 미래를 만드는가',
  '경이는 길들여지는 순간 사라지는가 — 세계의 신비를 어디까지 설명해야 하는가',
  '강함은 사람을 자유롭게 하는가, 더 무거운 책임에 묶는가',
  '봉인한 악을 잊은 세계와, 그 악을 기억하는 외로운 자 중 누가 옳은가',
  '핏줄은 운명인가, 끊어낼 수 있는 사슬인가',
  '신을 섬기는 것과 신을 의심하는 것 중 무엇이 더 큰 믿음인가',
  '구원은 모두를 위한 것인가, 누군가를 버려야만 닿는 곳인가',
]

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

// 조합수(영감 풀 + 선택지 기준) — 슬롯이 많아 천문학적 변주가 가능함을 표시.
// SUBS(8)·MAGICS(6)·TONES(7)·SCALES(5) × 8개 텍스트 풀(WORLD18·MAGIC20·HERO_EDGE14·DESTINY18
// ·ANTAGONIST18·CONFLICT12·COST16·THEME16)의 곱. 풀은 모두 고유 항목.
const COMBOS = SUBS.length * MAGICS.length * TONES.length * SCALES.length *
  WORLD_POOL.length * MAGIC_POOL.length * HERO_EDGE_POOL.length * DESTINY_POOL.length *
  ANTAGONIST_POOL.length * CONFLICT_POOL.length * COST_POOL.length * THEME_POOL.length

// ---------- 자작 예시(판타지 관습에 충실) ----------
interface Example extends Omit<Draft, 'tpl'> { title: string }
const EXAMPLES: Example[] = [
  {
    title: '봉인의 마지막 핏줄',
    world: '북쪽 빙벽 너머에 마왕을 봉인한 채 번영하는 여섯 왕국의 대륙',
    magic: '8서클로 나뉜 마나 회로 — 서클을 올릴 때마다 술자의 수명을 깎는다',
    hero: '변경 영지의 버림받은 사생아 카엘',
    heroEdge: '재능 없는 낙오자였으나, 실은 봉인을 새긴 옛 왕가의 마지막 핏줄이다',
    destiny: '봉인의 별이 천 년 만에 떠오른 밤, 죽은 멘토의 유언이 그의 핏줄을 일깨운다',
    antagonist: '봉인이 풀려가는 잠든 마왕과 그를 섬기는 교단',
    conflict: '봉인을 다시 채울 열쇠가, 곧 봉인을 푸는 열쇠와 같다는 진실',
    cost: '봉인을 채우는 제물이 될 자기 자신',
    theme: '선택받은 자가 아니라, 선택하는 자가 영웅이 된다',
    sub: 'high', magicType: 'price', tone: 'bittersweet', scale: 'world',
  },
  {
    title: '두 번째로 떠오른 창',
    world: '게이트가 도심 한복판에 열려 던전이 일상이 된 현대 서울',
    magic: '레벨·스탯·스킬 창이 모두에게 보이지만, 주인공만 ‘재설정’이 가능하다',
    hero: '최약체로 멸시받던 F급 헌터 지훈',
    heroEdge: '동료에게 버림받아 죽었다가, 첫 각성의 날로 회귀해 미래를 안다',
    destiny: '폐던전에서 홀로 죽던 순간, 그에게만 보이는 시스템이 ‘재설정’을 제안한다',
    antagonist: '세계를 초기화하려는 시스템 너머의 관리자와 그 하수인 랭커들',
    conflict: '랭킹의 정점에 오를수록 더 거대한 적이 그를 기다린다',
    cost: '회귀할 때마다 사라지는, 사랑했던 이들의 기억',
    theme: '두 번째 삶은 첫 번째 삶의 후회를 갚을 수 있는가',
    sub: 'hunter', magicType: 'system', tone: 'cathartic', scale: 'world',
  },
  {
    title: '악역으로 죽지 않기로 했다',
    world: '소설 속 악역 영애로 빙의한, 황태자가 다스리는 제국 궁정',
    magic: '피를 매개로 한 혈맹 마법 — 같은 피끼리만 술법을 이을 수 있다',
    hero: '처형당할 운명의 공작 영애 아델하이트에 빙의한 ‘나’',
    heroEdge: '원작의 결말을 아는 유일한 사람이자, 파멸 플래그를 피해야 하는 빙의자',
    destiny: '처형대의 환영을 본 뒤, 살아남기 위해 원작의 판을 뒤집기로 한다',
    antagonist: '원작의 ‘진짜 여주인공’과 그를 후원하는 황후파',
    conflict: '황태자의 마음을 얻을수록 원작의 파멸 플래그가 가까워진다',
    cost: '왕좌에 다가서기 위해 묻어야 할 자신의 본심',
    theme: '정해진 결말은 거역할 수 있는가, 아니면 거역마저 각본인가',
    sub: 'romanceF', magicType: 'bloodline', tone: 'triumph', scale: 'kingdom',
  },
]

// ---------- 저장 항목 ----------
interface Saved { id: string; title: string; draft: Draft; text: string; createdAt: number }

function newId(prefix = 'fs'): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return prefix + '_' + crypto.randomUUID() } catch { /* noop */ }
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const SUB_KEYS: SubKey[] = ['high', 'low', 'urban', 'isekai', 'hunter', 'grimdark', 'romanceF', 'sns']
const MAGIC_KEYS: MagicKey[] = ['hard', 'soft', 'system', 'price', 'bloodline', 'forbidden']
const TONE_KEYS: ToneKey[] = ['triumph', 'cathartic', 'bittersweet', 'tragic', 'wonder', 'open', 'grim']
const SCALE_KEYS: ScaleKey[] = ['village', 'kingdom', 'continent', 'world', 'gods']

function blankDraft(): Draft {
  return {
    world: '', magic: '', hero: '', heroEdge: '', destiny: '',
    antagonist: '', conflict: '', cost: '', theme: '',
    sub: 'high', magicType: 'hard', tone: 'triumph', scale: 'world', tpl: 0,
  }
}

function normDraft(x: unknown): Draft {
  const o = (x || {}) as Partial<Draft>
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  return {
    world: str(o.world), magic: str(o.magic),
    hero: str(o.hero), heroEdge: str(o.heroEdge), destiny: str(o.destiny),
    antagonist: str(o.antagonist), conflict: str(o.conflict), cost: str(o.cost), theme: str(o.theme),
    sub: SUB_KEYS.includes(o.sub as SubKey) ? (o.sub as SubKey) : 'high',
    magicType: MAGIC_KEYS.includes(o.magicType as MagicKey) ? (o.magicType as MagicKey) : 'hard',
    tone: TONE_KEYS.includes(o.tone as ToneKey) ? (o.tone as ToneKey) : 'triumph',
    scale: SCALE_KEYS.includes(o.scale as ScaleKey) ? (o.scale as ScaleKey) : 'world',
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
  const sub = subDef(d.sub); const mg = magicDef(d.magicType); const tone = toneDef(d.tone); const sc = scaleDef(d.scale)
  const row = (label: string, v: string) => (v && v.trim() ? `<p><b>${escHtml(label)}:</b> ${escHtml(v.trim())}</p>` : '')
  const paras = text.split('\n').filter(Boolean).map((p) => `<p>${escHtml(p)}</p>`).join('')
  return [
    `<p><b>하위장르:</b> ${escHtml(sub.label)} · <b>마법:</b> ${escHtml(mg.label)} · <b>스케일:</b> ${escHtml(sc.label)} · <b>결말 톤:</b> ${escHtml(tone.label)}</p>`,
    `<hr/>`,
    `<p style="font-size:14px;line-height:1.7;"><b>시놉시스</b></p>`,
    paras,
    `<hr/>`,
    row('세계·무대', d.world),
    row('마법 체계', d.magic),
    row('주인공', d.hero),
    row('주인공의 비범함·결핍·약점', d.heroEdge),
    row('운명·예언·각성의 계기', d.destiny),
    row('적대 세력', d.antagonist),
    row('핵심 갈등', d.conflict),
    row('대가(걸린 것)', d.cost),
    row('주제', d.theme),
  ].filter(Boolean).join('')
}

export default function GenreSynopsis({ payload }: { payload?: Record<string, unknown> }) {
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
      const isEmpty = !init.current.cur.world && !init.current.cur.hero && !init.current.cur.destiny
      if (seed && isEmpty) {
        setCur((p) => ({ ...p, world: p.world || seed }))
        flashNote('전달받은 아이디어를 세계 칸에 넣었습니다. 자유롭게 고쳐 쓰세요.')
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

  const hasInput = !!(cur.world || cur.magic || cur.hero || cur.heroEdge || cur.destiny || cur.antagonist || cur.conflict || cur.cost || cur.theme)

  // ---- 영감(무작위 채움) — 빈 칸만 채운다 ----
  const inspire = () => {
    setCur((p) => ({
      ...p,
      world: p.world || pick(WORLD_POOL),
      magic: p.magic || pick(MAGIC_POOL),
      heroEdge: p.heroEdge || pick(HERO_EDGE_POOL),
      destiny: p.destiny || pick(DESTINY_POOL),
      antagonist: p.antagonist || pick(ANTAGONIST_POOL),
      conflict: p.conflict || pick(CONFLICT_POOL),
      cost: p.cost || pick(COST_POOL),
      theme: p.theme || pick(THEME_POOL),
    }))
    flashNote('빈 칸에 판타지 영감 예시를 채웠습니다. 마음대로 고쳐 쓰세요.')
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
      title: title.trim() || (cur.world.trim() ? cur.world.trim().slice(0, 24) : '제목 없는 시놉시스'),
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
    setCur((p) => ({ ...blankDraft(), sub: p.sub, magicType: p.magicType, tone: p.tone, scale: p.scale, tpl: p.tpl }))
    setEditId(null); setTitle('')
    flashNote('입력을 비웠습니다.')
  }

  // ---- 연계: 프로젝트 기획 폴더에 시놉시스 문서 추가 ----
  const toProject = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const docTitle = (title.trim() || (cur.world.trim() ? cur.world.trim().slice(0, 24) : '시놉시스'))
    const id = addToProject({
      kind: 'text', root: 'research', folder: '기획',
      title: `시놉시스 — ${docTitle}`,
      bodyHtml: bodyHtmlOf(cur, text),
      synopsis: text.split('\n')[0]?.slice(0, 120),
      meta: { 장르: '판타지', 하위장르: subDef(cur.sub).label, 마법: magicDef(cur.magicType).label, 스케일: scaleDef(cur.scale).label, 결말톤: toneDef(cur.tone).label, 틀: TEMPLATES[cur.tpl].name },
    })
    flashNote(id ? '프로젝트 자료 〈기획〉 폴더에 시놉시스 문서를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 연계: 글감 보관함에 스니펫 저장 ----
  const toLibrary = () => {
    addToLibrary('snippets', {
      text,
      source: '판타지 시놉시스 빌더',
      tags: ['시놉시스', '판타지', subDef(cur.sub).label, magicDef(cur.magicType).label, toneDef(cur.tone).label],
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
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="🐉" /> 판타지 시놉시스 빌더</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>세계·마법·주인공·운명·갈등·대가·결말 톤 → 판타지 시놉시스</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="minibtn" onClick={inspire} title="빈 칸에 무작위 판타지 영감 채우기"><Emoji e="🎲" /> 영감</button>
          <button className="minibtn" onClick={() => setShowEx((v) => !v)}>{showEx ? '예시 닫기' : <><Emoji e="📚" /> 작품 예시</>}</button>
        </div>
      </div>

      <div style={body}>
        {note && (
          <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>{emojify(note)}</div>
        )}

        {showEx && (
          <div style={card}>
            <h4 style={sectionTitle}>판타지 예시 — 눌러 입력에 채우기</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EXAMPLES.map((ex) => (
                <div key={ex.title} style={{ ...savedRow, gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>「{ex.title}」</b>
                    <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>
                      {subDef(ex.sub).label} · {magicDef(ex.magicType).label} · {toneDef(ex.tone).label}
                    </span>
                    <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => applyExample(ex)}>이 예시 쓰기</button>
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--muted)', wordBreak: 'keep-all' }}>{ex.world}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 유형 선택 */}
        <div style={card}>
          <h4 style={sectionTitle}>하위장르 · 마법의 성격 · 스케일 · 결말 톤</h4>
          <div style={{ marginBottom: 10 }}>
            <span style={fieldLabel}>하위장르</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SUBS.map((s) => (
                <button key={s.key} onClick={() => setField('sub', s.key)} style={chip(cur.sub === s.key)} title={s.desc}>{s.label}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <span style={fieldLabel}>마법의 성격</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {MAGICS.map((m) => (
                <button key={m.key} onClick={() => setField('magicType', m.key)} style={chip(cur.magicType === m.key)} title={m.desc}>{m.label}</button>
              ))}
            </div>
            <div style={{ ...hint, marginTop: 6 }}>{magicDef(cur.magicType).desc}</div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <span style={fieldLabel}>스케일(이야기의 판)</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SCALES.map((s) => (
                <button key={s.key} onClick={() => setField('scale', s.key)} style={chip(cur.scale === s.key)} title={s.phrase}>{s.label}</button>
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
          <div style={{ ...twoRow, marginBottom: 10 }}>
            <div style={col}><Field k="world" label="세계·무대 (대륙·이세계·도시)" ph="예: 여섯 왕국이 갈라진 검과 마법의 대륙 〈아스카리온〉" pool={WORLD_POOL} /></div>
            <div style={col}><Field k="hero" label="주인공 (누구인가)" ph="예: 변경 영지의 버림받은 사생아 카엘" /></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="magic" label="마법 체계 — 핵심 규칙·원천(하드 매직일수록 명시)" ph="예: 8서클 마나 회로 — 서클을 올릴 때마다 수명을 깎는다" ml={220} area pool={MAGIC_POOL} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="heroEdge" label="주인공의 비범함·결핍·약점(선택받은 자·회빙환 등)" ph="예: 재능 없는 낙오자였으나 실은 사라진 왕가의 마지막 핏줄" ml={200} area pool={HERO_EDGE_POOL} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="destiny" label="운명·예언·각성의 계기(모험의 부름)" ph="예: 봉인의 별이 천 년 만에 떠오른 밤, 죽은 멘토의 유언이 핏줄을 일깨운다" ml={220} area pool={DESTINY_POOL} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="antagonist" label="적대 세력 — 마왕·봉인된 악·정치·교단" ph="예: 봉인이 풀려가는 잠든 마왕과 그를 섬기는 교단" ml={200} area pool={ANTAGONIST_POOL} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="conflict" label="핵심 갈등 — 맞서는 힘·딜레마" ph="예: 봉인을 채울 열쇠가 곧 봉인을 푸는 열쇠와 같다는 진실" ml={220} area pool={CONFLICT_POOL} />
          </div>
          <div style={{ ...twoRow, marginBottom: 10 }}>
            <div style={col}><Field k="cost" label="대가 — 마법·승리에 걸린 것" ph="예: 봉인을 채우는 제물이 될 자기 자신" pool={COST_POOL} /></div>
            <div style={col}><Field k="theme" label="주제 (작품이 던지는 질문)" ph="예: 선택받은 자가 아니라, 선택하는 자가 영웅이 된다" pool={THEME_POOL} /></div>
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
            <input style={{ ...input, flex: 1, minWidth: 180 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="저장 제목 (비우면 세계명으로 자동)" maxLength={60} />
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
            <button className="linkbtn" onClick={() => openToolLinked('setting-bible', { genre: '판타지', seed: cur.world })} title="세계를 설정집으로 펼치기"><Emoji e="🗺️" /> 배경 설정집</button>
            <button className="linkbtn" onClick={() => openToolLinked('character-forge', { genre: '판타지', seed: cur.hero })} title="주인공 캐릭터 만들기"><Emoji e="👤" /> 캐릭터 만들기</button>
            <button className="linkbtn" onClick={() => openToolLinked('conflict-builder', { genre: '판타지' })} title="갈등을 더 정교하게 설계하기"><Emoji e="⚔️" /> 갈등 설계</button>
            <button className="linkbtn" onClick={() => openToolLinked('hero-journey-map', { genre: '판타지' })} title="영웅의 여정으로 구조 펼치기"><Emoji e="🗺️" /> 영웅의 여정</button>
            <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre: '판타지' })} title="플롯 구조로 펼치기"><Emoji e="🔺" /> 플롯 구조</button>
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
                      {subDef(s.draft.sub).label} · {magicDef(s.draft.magicType).label} · {toneDef(s.draft.tone).label}
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
          판타지 시놉시스의 심장은 <b>일관된 세계의 규칙(마법 체계)</b>과 그 규칙이 인물에게 안기는 <b>대가</b>입니다 —
          하드 매직일수록 앞서 심은 규칙·아이템·정보가 결말에서 복선으로 회수될 때 카타르시스가 커집니다.
          영감 풀과 선택지만으로도 약 {COMBOS.toLocaleString('en-US')}가지 변주가 가능합니다. 입력·저장은 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
