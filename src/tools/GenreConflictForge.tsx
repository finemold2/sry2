// 판타지 갈등·딜레마 단조기(鍛造) — 판타지 장르 도시에에 근거한 갈등 구도 슬롯 조합 생성기.
//  주체 · 욕망 · 판타지적 장애물 · 마법의 대가/비용 · 위기에 걸린 것 · 도덕적 딜레마 · 비틀기(반전 씨앗) · 무대(하위유형)
//  슬롯별 🔒 잠금 + 부분 재생성, 전체 조합수 표시(1조 이상). 결과를 한 줄 갈등 문장으로 조립.
//  연계: addToProject(folder:'갈등') 문서 추가 · addToLibrary('snippets') 글감 저장 · 관련 도구 열기.
//  자급식: react · './linkbus' 외 import 없음. 전부 로컬. localStorage 'sry:tool:genre-conflictforge'.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'genre-conflictforge', name: '판타지 갈등 단조기', icon: '⚔️', group: '생성기', genre: '판타지', intro: '마법의 대가·예언·종족·봉인된 악으로 판타지다운 갈등과 딜레마를 무작위 단조', w: 600, h: 680 }

// ── 판타지 도시에 기반 슬롯 풀(장르 특화·구체) ──
// 1) 주체: 누구의 갈등인가 — 판타지 관습의 인물 원형
const SUBJECT = [
  '선택받은 자로 지목된 시골 소년', '몰락한 귀족 가문의 마지막 후계', '봉인을 지키는 마지막 사제',
  '진명(眞名)을 잃어버린 마법사', '회귀해 두 번째 삶을 사는 검사', '원작 속 악역 영애에 빙의한 자',
  '서클을 넘지 못하는 만년 견습 마법사', '게이트 너머에서 살아 돌아온 각성자', '마왕의 피를 이은 인간',
  '용을 죽인 죄로 추방된 기사', '죽은 자의 기억을 읽는 강령술사', '왕이 되기를 거부한 적장자',
  '계약한 정령에게 영혼을 저당 잡힌 소환사', '엘프와 인간 사이에서 태어난 혼혈', '예언이 자신을 가리킨다 믿는 고아',
  '신을 잃은 성기사', '금주(禁呪)를 익힌 흑마법사', '드워프 장인의 도제가 된 인간 소녀',
  '시스템 메시지에 홀로 응답할 수 있는 헌터', '용사 파티에서 쫓겨난 짐꾼', '저주받은 검에 묶인 떠돌이',
  '마탑의 배신자로 낙인찍힌 천재', '대를 이어 마왕을 섬겨온 가문의 적자', '죽음을 미루는 대가를 치르는 연금술사',
  '성녀로 추대되었으나 신앙을 잃은 소녀', '용의 알을 품게 된 떠돌이 도굴꾼', '예언서를 통째로 외운 떠돌이 음유시인',
  '죽은 형의 자리를 대신 떠맡은 둘째 황자', '마법을 쓸 수 없는 마법사 가문의 자식', '봉인된 마검에게 선택받은 평범한 농부',
  '게이트 안에서 100년을 보내고 돌아온 회귀자', '신탁을 받았으나 그것을 거역하기로 한 무녀',
]

// 2) 욕망: 무엇을 원하는가
const DESIRE = [
  '봉인이 풀리기 전에 고대의 위협을 막는 것', '잃어버린 진명을 되찾아 힘을 회복하는 것',
  '몰락한 가문을 다시 일으키는 것', '예언을 거스르고 자신의 운명을 새로 쓰는 것',
  '죽은 동료를 되살리는 금지된 의식을 완성하는 것', '마왕을 쓰러뜨려 세계를 구하는 것',
  '회귀 전의 비극을 이번 생에서는 막는 것', '원작의 파멸 플래그를 회피하고 살아남는 것',
  '서클을 돌파해 대마법사로 인정받는 것', '추방을 명한 왕국에 복수하는 것',
  '저주를 풀어 인간으로 돌아가는 것', '계약한 정령을 해방시키는 것',
  '두 종족의 전쟁을 끝내고 화평을 맺는 것', '마탑 최고위에 올라 비밀에 닿는 것',
  '게이트 너머의 진실, 세계의 비밀을 밝히는 것', '잃어버린 신앙과 신의 응답을 되찾는 것',
  '랭킹 1위에 올라 무시했던 자들을 굴복시키는 것', '사랑하는 이를 데려간 죽음을 되돌리는 것',
  '금주의 대가를 치르고도 권능을 손에 넣는 것', '평범한 삶, 마법도 검도 없는 일상으로 돌아가는 것',
  '대를 이어 내려온 가문의 저주를 끊어내는 것', '잠든 용을 깨우지 않고 그 보물을 손에 넣는 것',
  '신을 죽인 진범을 찾아 신탁을 되돌리는 것', '봉인된 진짜 자아를 풀어 본래의 힘을 되찾는 것',
]

// 3) 장애물(판타지 특화) — 욕망을 가로막는 힘
const OBSTACLE = [
  '봉인이 풀려 깨어나기 시작한 고대의 마왕', '예언이 그가 세계를 멸망시킬 자라 못박고 있다는 사실',
  '마법을 쓸 때마다 기억을 한 조각씩 잃는 대가', '진명을 알아낸 적이 그를 말 한마디로 지배할 수 있다는 위협',
  '왕국과 마탑이 동시에 그의 목에 현상금을 건 상황', '회귀를 눈치챈 누군가가 미래 지식을 똑같이 가지고 있다는 사실',
  '계약한 정령이 영혼의 대가를 점점 더 크게 요구하는 것', '소환된 마왕군이 봉인의 균열로 끝없이 밀려드는 것',
  '신탁이 침묵하고 성물(聖物)이 빛을 잃어버린 것', '종족 간 해묵은 증오가 어떤 화평도 거부하는 것',
  '금주를 쓰면 정신이 잠식되어 또 다른 인격이 깨어나는 것', '시스템이 그에게만 치명적인 페널티 퀘스트를 강요하는 것',
  '용을 죽인 죄가 드래곤 일족 전체의 복수를 부른 것', '마탑주가 사실은 봉인을 풀려는 배후라는 것',
  '저주가 사랑하는 이를 해쳐야만 풀린다는 조건', '되살린 자가 살아있을 적과 전혀 다른 존재로 돌아온 것',
  '오러를 끌어올릴수록 수명이 깎여나가는 검의 대가', '그를 믿고 따른 동료들이 예언을 듣고 등을 돌리는 것',
  '죽음의 신이 미뤄둔 영혼들을 한꺼번에 거둬가려 하는 것', '각성한 힘이 통제를 벗어나 폭주하기 시작한 것',
  '구원자라 믿었던 성녀가 사실 봉인의 열쇠였던 것', '두 번째 회귀에서는 미래가 전혀 들어맞지 않는 것',
  '그를 따르는 동료들이 하나둘 예언의 제물로 정해진 것', '잠에서 깬 고룡이 옛 계약의 빚을 받으러 온 것',
]

// 4) 마법의 대가/비용 — 하드매직 도시에: '능력보다 한계·비용이 흥미롭다'(샌더슨 제2법칙)
const COST = [
  '쓸 때마다 수명이 깎인다', '한 번 쓸 때마다 가장 소중한 기억을 잃는다',
  '대가로 타인의 생명을 제물로 바쳐야 한다', '쓸수록 인간성을 잃고 괴물로 변해간다',
  '마나가 고갈되면 그 자리에서 노화하거나 잠든다', '권능의 반동이 사랑하는 이에게 옮겨간다',
  '진명을 입에 올리면 그만큼 자신의 존재가 옅어진다', '봉인의 힘을 빌리면 봉인이 그만큼 빨리 풀린다',
  '신의 권능을 쓸 때마다 신앙의 대가로 감정 하나가 사라진다', '회귀의 미래 지식은 한 번 바꿀 때마다 더 어긋난다',
  '금주를 쓸수록 또 다른 인격에게 몸을 내준다', '계약 정령이 부르는 값이 매번 두 배로 불어난다',
  '오러를 끌어올린 시간만큼 깨어난 뒤 잠들지 못한다', '죽음을 미룬 대가로 주변의 시간이 빨라진다',
  '치유의 힘을 쓰면 그 상처가 자신에게 옮겨온다', '시스템 스킬을 쓸 때마다 현실의 무언가가 사라진다',
  '예언을 거스를 때마다 운명이 더 잔혹한 형태로 되돌아온다', '대가가 없다 — 그래서 무엇을 잃었는지 끝내 알 수 없다',
  '권능을 쓴 흔적이 적에게 위치를 알리는 표식이 된다', '한 번 쓸 때마다 곁의 누군가가 그를 알아보지 못하게 된다',
  '마력을 끌어올리면 그만큼 봉인된 마왕의 속삭임이 커진다', '치른 대가는 항상 가장 늦게, 가장 잔인한 순간에 청구된다',
]

// 5) 위기에 걸린 것 — 실패의 대가(상승하는 스케일)
const STAKES = [
  '봉인이 완전히 풀려 세계가 마왕에게 삼켜진다', '예언대로 그가 종말의 방아쇠가 된다',
  '마지막 남은 가문의 혈육이 죽는다', '회귀의 기회를 잃고 같은 비극이 영원히 반복된다',
  '두 종족의 전면전이 대륙을 불태운다', '되살린 존재가 산 자들을 모두 거두어들인다',
  '왕국이 무너지고 마탑의 비밀이 적의 손에 넘어간다', '그를 믿어준 단 한 사람마저 그를 두려워하게 된다',
  '신이 인간을 완전히 버려 모든 기적이 사라진다', '게이트가 영구히 열려 현실이 던전이 된다',
  '저주가 다음 세대로 대물림된다', '진명을 쥔 적이 그를 영원한 노예로 삼는다',
  '폭주한 힘이 그가 지키려던 모든 것을 먼저 부순다', '죽음을 미룬 영혼들이 일제히 산 자의 자리를 빼앗는다',
  '랭킹과 명예를 모두 잃고 다시 무시당하는 자로 추락한다', '평범한 삶을 영영 되찾지 못하고 전장에 묶인다',
  '대륙의 마나가 고갈되어 모든 마법이 영원히 사라진다', '진명이 적의 입에 오르며 그의 자아가 통째로 지워진다',
  '시간의 균열이 닫혀 회귀도 미래도 없는 막다른 운명이 된다', '그가 끝내 지키려던 무대 자체가 흔적도 없이 무너진다',
]

// 6) 도덕적 딜레마 — 둘 다 가질 수 없는 가치 사이의 선택(그림다크/도시에 회색지대)
const DILEMMA = [
  '세계를 구하려면 사랑하는 이를 제물로 바쳐야 한다', '복수를 완성하면 자신이 증오하던 괴물이 된다',
  '진실을 밝히면 믿음으로 지탱되던 모든 평화가 무너진다', '동료를 살리려면 금주를 써 더 큰 악을 깨워야 한다',
  '예언을 따르면 무고한 자들이, 거스르면 자신이 죽는다', '마왕을 막을 유일한 힘은 마왕이 되는 것뿐이다',
  '봉인을 지키려면 봉인을 지킬 자기 자신을 봉인해야 한다', '회귀로 한 사람을 살리면 그 대가로 다른 이가 죽는다',
  '정의를 세우려면 자신을 거둬준 은인을 처단해야 한다', '힘을 포기하면 약자로, 받아들이면 인간성을 잃는다',
  '두 종족 중 한쪽 편을 들어야만 전쟁을 끝낼 수 있다', '구원받으려면 죄 없는 자에게 죄를 뒤집어씌워야 한다',
  '약속을 지키면 세계가, 어기면 단 한 사람이 무너진다', '치유하려면 그 고통을 자기 몸으로 대신 받아야 한다',
  '진명을 되찾으려면 자신을 사랑한 이의 기억을 지워야 한다', '신을 되살리려면 신을 죽인 자기 손으로 제단을 세워야 한다',
  '백성을 살리려면 자신을 따른 충신들을 버려야 한다', '미래를 바꾸려면 회귀 전 자신이 한 모든 선행을 되돌려야 한다',
  '대가 없는 힘을 얻으려면 대가를 대신 치를 무고한 자를 골라야 한다', '용을 살리면 마을이, 마을을 살리면 마지막 용이 사라진다',
]

// 7) 비틀기(반전 씨앗) — 클리셰 전복(도시에: 변주 포인트)
const TWIST = [
  '사실 선택받은 자는 그가 아니라 그가 지키던 적이었다', '예언은 오역되었고 진짜 뜻은 정반대였다',
  '봉인된 악은 세계를 멸망시키려던 게 아니라 막으려 했다', '멘토가 처음부터 모든 위협을 설계한 흑막이었다',
  '되살리려던 죽은 동료가 스스로 죽음을 택한 것이었다', '회귀의 미래 지식은 누군가 심어둔 거짓이었다',
  '마왕과 용사가 사실 같은 존재의 두 얼굴이었다', '구하려던 세계가 이미 누군가의 꿈/소설 속이었다',
  '저주를 건 것은 적이 아니라 그를 지키려던 어머니였다', '진명을 빼앗은 적이 사실은 미래의 자기 자신이었다',
  '신은 죽은 게 아니라 인간을 시험하려 침묵했을 뿐이었다', '그가 토벌하던 마물들이 봉인을 함께 막던 수호자였다',
  '회귀의 진짜 목적은 비극을 막는 게 아니라 반복시키는 것이었다', '그를 추방한 왕국이 그를 미끼로 더 큰 악을 가뒀던 것이었다',
  '계약한 정령이 곧 그의 잃어버린 진명의 화신이었다', '예언을 막으려 한 모든 행동이 오히려 예언을 이뤘다',
  '구원해야 할 세계가 사실 그를 가두기 위한 감옥이었다', '대가 없이 쓴 힘의 값은 다음 회귀의 자신이 치르고 있었다',
  '무시당하던 짐꾼이야말로 봉인을 홀로 지탱하던 핵심이었다', '마왕을 봉인한 영웅이 곧 봉인을 풀려는 자였다',
]

// 8) 무대(하위유형) — 갈등이 펼쳐지는 판타지 무대
const STAGE = [
  '봉인이 약해지는 변경의 신전', '음모가 들끓는 황실과 귀족 사교계(로판)', '서열로 모든 게 정해지는 마탑',
  '게이트가 열린 현대 도시(헌터물)', '종족들이 대치하는 국경의 회색지대', '마왕성으로 향하는 마지막 여정의 길 위',
  '드래곤이 잠든 고대 유적의 심층', '신탁이 끊긴 폐허가 된 대성당', '회귀 전 비극이 벌어졌던 그 운명의 날',
  '원작 소설 속 파멸이 예정된 무도회장', '균열에서 마왕군이 쏟아지는 봉인의 틈', '영혼이 거래되는 망자의 강가',
  '용사 파티가 분열하는 던전 보스방 앞', '왕위 계승 전쟁이 임박한 몰락한 왕국',
  '서열 결정전이 벌어지는 마법학교의 결투장', '랭킹 1위를 가리는 헌터 길드의 공개 레이드',
  '신탁이 내려지는 대신전의 봉헌 의식 한복판', '대가를 흥정하는 망령들의 야시장',
]

// 9) 마법의 원천(체계) — 도시에: 마법 체계의 원천(신/자연/혈통/계약 등)이 갈등의 색을 정한다
const SOURCE = [
  '서클을 쌓아 영창하는 정통 마나 마법', '진명(眞名)으로 사물의 본질을 부리는 어스시식 마법',
  '금속을 태워 능력을 얻는 하드매직 체계', '신에게 권능을 빌려 쓰는 신성 마법',
  '정령·악마와의 계약으로 발현하는 마법', '핏줄에 새겨진 혈통 마법(드래곤·마족의 피)',
  '시스템 창과 스킬 포인트로 굴러가는 게임식 마법', '금주서(禁呪書)에 봉인된 흑마법',
  '오러·검기로 발현되는 검사의 마나심법', '룬과 마법진을 새겨 작동시키는 룬마법',
  '연금술과 등가교환의 마도공학', '죽은 자를 부리는 강령·사령 마법',
  '음률에 마력을 실어 거는 음유시인의 주가(呪歌)', '꿈과 환영을 다루는 정신계 마법',
  '봉인을 풀어 빌려 쓰는 고대 마왕의 권능', '계절·천기를 부리는 자연 친화 마법',
  '회귀·예지로 미래 정보를 무기 삼는 시간계 능력', '대가 없이 발현되지만 정체불명인 소프트매직',
]

interface Slot { key: string; label: string; icon: string; pool: string[] }
const SLOTS: Slot[] = [
  { key: 'subject', label: '주체', icon: '🧙', pool: SUBJECT },
  { key: 'source', label: '마법의 원천', icon: '✨', pool: SOURCE },
  { key: 'desire', label: '욕망', icon: '🎯', pool: DESIRE },
  { key: 'obstacle', label: '장애물', icon: '🧱', pool: OBSTACLE },
  { key: 'cost', label: '마법의 대가', icon: '🩸', pool: COST },
  { key: 'stakes', label: '위기에 걸린 것', icon: '💥', pool: STAKES },
  { key: 'dilemma', label: '도덕적 딜레마', icon: '⚖️', pool: DILEMMA },
  { key: 'twist', label: '비틀기(반전)', icon: '🔮', pool: TWIST },
  { key: 'stage', label: '무대', icon: '🗺️', pool: STAGE },
]

// 조합수 = 각 슬롯 풀 크기의 곱
const COMBOS = SLOTS.reduce((acc, s) => acc * s.pool.length, 1)

const LS_KEY = 'sry:tool:genre-conflictforge'
const ri = (n: number) => Math.floor(Math.random() * n)
const pick = (a: string[], avoid?: string) => {
  if (a.length <= 1) return a[0]
  let v = a[ri(a.length)]
  if (avoid !== undefined && v === avoid) v = a[ri(a.length)]
  return v
}

type Result = Record<string, string>

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 한 줄 갈등 문장 조립 — 슬롯들을 판타지다운 갈등 구문으로.
function summarize(r: Result): string {
  const subj = r.subject || '주인공'
  const desire = (r.desire || '무언가').replace(/[.。]$/, '')
  const ob = (r.obstacle || '장애물').replace(/[.。]$/, '')
  const cost = (r.cost || '').replace(/[.。]$/, '')
  const stakes = (r.stakes || '').replace(/[.。]$/, '')
  const dilemma = (r.dilemma || '').replace(/[.。]$/, '')
  const stage = r.stage || ''
  const source = (r.source || '').replace(/[.。]$/, '')
  let s = `${stage ? stage + '에서, ' : ''}${subj}은(는) ${desire}을(를) 바라지만, ${ob}이(가) 앞을 가로막는다.`
  if (source) s += ` 그가 의지하는 힘은 ${source}.`
  if (cost) s += ` 게다가 그 힘에는 ${cost}는 대가가 따른다.`
  if (dilemma) s += ` 결국 그는 선택을 강요받는다 — ${dilemma}.`
  if (stakes) s += ` 실패하면 ${stakes}.`
  return s
}

// 저장된 즐겨찾기(고정 조합) 항목
interface Saved { id: string; result: Result; createdAt: number }

function loadSaved(): Saved[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.saved) ? p.saved : Array.isArray(p) ? p : []
    return arr
      .filter((x: any) => x && typeof x === 'object' && x.result && typeof x.result === 'object')
      .map((x: any) => ({ id: String(x.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7))), result: x.result as Result, createdAt: Number(x.createdAt) || Date.now() }))
  } catch { return [] }
}

export default function GenreConflictForge({ payload }: { payload?: Record<string, unknown> }) {
  const genreLabel = typeof payload?.genre === 'string' ? (payload.genre as string) : '판타지'

  const [result, setResult] = useState<Result>(() => {
    const r: Result = {}
    SLOTS.forEach((s) => { r[s.key] = pick(s.pool) })
    return r
  })
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)
  const [toast, setToast] = useState('')
  const [saved, setSaved] = useState<Saved[]>(() => loadSaved())
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 저장 목록 영속화 — 차단/용량초과 graceful
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ saved })) }
    catch { if (mounted.current) setToast('이 브라우저에서 저장이 막혀 있어요.') }
  }, [saved])

  // 토스트 자동 소거 + 언마운트 정리
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1900)
    return () => window.clearTimeout(t)
  }, [toast])

  // 굴림 애니메이션 자동 해제 + 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 360)
    return () => window.clearTimeout(t)
  }, [rolling])

  const rollAll = useCallback(() => {
    setRolling(true)
    setResult((prev) => {
      const next: Result = { ...prev }
      SLOTS.forEach((s) => { if (!locked[s.key]) next[s.key] = pick(s.pool, prev[s.key]) })
      return next
    })
  }, [locked])

  const rollOne = (key: string) => {
    const slot = SLOTS.find((s) => s.key === key)
    if (!slot) return
    setResult((prev) => ({ ...prev, [key]: pick(slot.pool, prev[key]) }))
  }
  const toggleLock = (key: string) => setLocked((l) => ({ ...l, [key]: !l[key] }))

  const summary = summarize(result)

  const plainText = () => {
    const lines = SLOTS.map((s) => `${s.icon} ${s.label}: ${result[s.key]}`).join('\n')
    return `[판타지 갈등]\n${lines}\n\n✍️ ${summary}`
  }

  const copy = () => {
    const text = plainText()
    const done = () => { if (mounted.current) setToast('복사했습니다') }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setToast('복사 실패') }
  }

  // 즐겨찾기 저장(현재 조합 고정)
  const star = () => {
    setSaved((prev) => [{ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), result: { ...result }, createdAt: Date.now() }, ...prev].slice(0, 40))
    setToast('즐겨찾기에 저장했습니다')
  }
  const loadSavedItem = (s: Saved) => { setResult({ ...s.result }); setLocked({}); setToast('불러왔습니다') }
  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))

  // 연계: 갈등 글감을 라이브러리 스니펫으로
  const toSnippet = () => {
    addToLibrary('snippets', { text: summary, source: '판타지 갈등 단조기', tags: ['판타지', '갈등', result.subject || ''].filter(Boolean) })
    setToast('글감 라이브러리(스니펫)에 저장했습니다')
  }

  // 연계: 프로젝트 자료 〈갈등〉 폴더에 문서로
  const toProject = () => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다'); return }
    const rows = SLOTS.map((s) => `<p><b>${escHtml(s.icon)} ${escHtml(s.label)}</b><br>${escHtml(result[s.key])}</p>`).join('')
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.7;"><b>✍️ ${escHtml(summary)}</b></p>`,
      `<hr/>`,
      rows,
    ].join('')
    const title = `판타지 갈등 — ${(result.subject || '주체').slice(0, 18)}`
    const id = addToProject({
      kind: 'text', root: 'research', folder: '갈등',
      title, bodyHtml, synopsis: summary,
      meta: { 장르: genreLabel, 무대: result.stage || '—', 딜레마: (result.dilemma || '—').slice(0, 40) },
    })
    setToast(id ? '프로젝트 자료 〈갈등〉 폴더에 추가했습니다 (바인더·DB 확인)' : '프로젝트에 추가하지 못했습니다')
  }

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 8, padding: 12, boxSizing: 'border-box', color: 'var(--text)', background: 'var(--paper)', overflow: 'auto' }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
  const slotRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="⚔️"/></span>
        <strong style={{ fontSize: 14 }}>판타지 갈등 단조기</strong>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }} title="모든 슬롯 풀 조합의 경우의 수">
          약 {COMBOS.toLocaleString()} 조합
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
        마법의 대가·예언·종족·봉인된 악 등 판타지 도시에에 근거한 갈등 슬롯을 굴립니다. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 단조하세요.
      </div>

      {/* 슬롯 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {SLOTS.map((s) => {
          const isLocked = !!locked[s.key]
          return (
            <div key={s.key} style={slotRow}>
              <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-10deg) scale(1.15)' : 'none' }}><Emoji e={s.icon}/></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{s.label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
                  {rolling && !isLocked ? '…' : result[s.key]}
                </div>
              </div>
              <button className="minibtn" title={isLocked ? '고정 해제' : '이 슬롯 고정'} onClick={() => toggleLock(s.key)} style={{ flexShrink: 0, padding: '2px 6px', borderColor: isLocked ? 'var(--accent)' : 'var(--border)', color: isLocked ? 'var(--accent)' : 'var(--muted)' }}>{isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
              <button className="minibtn" title="이 슬롯만 다시" onClick={() => rollOne(s.key)} disabled={isLocked} style={{ flexShrink: 0, padding: '2px 6px' }}><Emoji e="🎲"/></button>
            </div>
          )
        })}
      </div>

      {/* 조합 한 줄 요약 */}
      <div style={{ background: 'var(--chrome-2)', border: '1px solid var(--accent)', borderRadius: 10, padding: '11px 13px' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}><Emoji e="📝"/> 갈등 한 줄 요약</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.65 }}>{summary}</div>
      </div>

      {/* 조작 버튼 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, minWidth: 130 }} onClick={rollAll}><Emoji e="⚒️"/> 갈등 단조하기</button>
        <button className="minibtn" onClick={copy}><Emoji e="📋"/> 복사</button>
        <button className="minibtn" onClick={star} title="현재 조합을 즐겨찾기에 저장"><Emoji e="⭐"/> 저장</button>
      </div>

      {/* 연계 */}
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '이 갈등을 프로젝트 자료 〈갈등〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={toSnippet}><Emoji e="📥"/> 글감 라이브러리</button>
        <button className="linkbtn" onClick={() => openToolLinked('conflict-builder', { character: result.subject, desire: result.desire, obstacle: result.obstacle, stakes: result.stakes })} title="갈등 설계기로 보내 더 다듬기"><Emoji e="⚔️"/> 갈등 설계기</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck')} title="반전 카드 더 보기"><Emoji e="🔮"/> 반전 카드</button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--ok)', textAlign: 'center' }}>{toast}</div>}

      {/* 즐겨찾기 목록 */}
      {saved.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5, fontWeight: 600 }}><Emoji e="⭐"/> 저장된 갈등 {saved.length}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {saved.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 9px' }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={summarize(s.result)}>{summarize(s.result)}</span>
                <button className="minibtn" style={{ flexShrink: 0, padding: '2px 6px', fontSize: 11 }} onClick={() => loadSavedItem(s)} title="불러오기">↻</button>
                <button className="minibtn" style={{ flexShrink: 0, padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={() => removeSaved(s.id)} title="삭제"><Emoji e="🗑️"/></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
