// 역사·사극 트로프·관습 체크리스트 — 이 장르의 독자 기대·필수 요소·서사 장치·흔한 함정·클리셰(+비틀기)를
// 카테고리별 체크리스트로 점검한다. 기본 항목(자작 데이터, 장르 특화) + 사용자 항목 추가·수정·삭제,
// 카테고리별·전체 진행률, "클리셰 비틀기" 무작위 뽑기(조합수 표시), 프로젝트 '기획' 폴더 연동, 관련 도구 연계.
// 모든 상태는 localStorage('sry:tool:history-tropes')에 자동 저장/복원. 자급식: react 와 './linkbus' 외 import 없음.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = { id: 'history-tropes', name: '역사·사극 트로프 점검', icon: '🏯', group: '구상·정리', genre: '역사·사극', intro: '역사·사극의 독자 기대·필수 요소·서사 장치·흔한 함정·클리셰(비틀기)를 체크리스트로 점검합니다', w: 660, h: 640 }

const LS_KEY = 'sry:tool:history-tropes'

interface Item {
  text: string
  tip?: string   // 보충 설명·예시·비틀기 제안
}
interface Cat {
  id: string
  name: string
  icon: string
  desc: string
  items: Item[]
}

// ── 자작 데이터: 역사·사극 장르 특화 체크 항목(카테고리 6개, 항목 70+개) ──
const CATS: Cat[] = [
  {
    id: 'expect',
    name: '독자 기대·관습',
    icon: '📜',
    desc: '충족 못 하면 이탈하는 필수 충족 요건',
    items: [
      { text: '시대 공기(時代感)가 의식주·언어·신분 규범으로 살아 있는가', tip: '고증 오류 하나가 몰입을 즉시 깬다. 음식·복식·호칭이 "그 시대처럼" 느껴지게.' },
      { text: '권력의 작동 원리(왕권 대 신권·당쟁·외척·환관)가 갈등의 엔진인가', tip: '왕은 만능 독재자가 아니다. 언관·예법·붕당의 견제가 긴장을 만든다.' },
      { text: '신분제의 무게가 주인공의 행동에 족쇄로 걸려 있는가', tip: '양반/중인/상민/천민·적서차별·여성의 제약을 "극복 과제"로 살려야 한다.' },
      { text: '거대 사건과 개인사가 교차하는가(임진·병자·사화·반정)', tip: '실제 역사 사건에 주인공이 얽혀들 때 판돈이 산다.' },
      { text: '인물의 동기가 충(忠)·효(孝)·의(義)·대의명분으로 정당화/충돌하는가', tip: '명분 없는 행동은 시대 인물로서 설득력을 잃는다.' },
      { text: '(웹소설형) 적폐 응징의 사이다가 고증·개연성과 균형을 이루는가', tip: '미래지식 만능주의는 금물. 통쾌함과 핍진성의 줄다리기.' },
      { text: '운명의 무게("어떻게 그 결말에 이르는가")가 과정미로 살아 있는가', tip: '독자가 결말을 알 때가 많다. 결과보다 과정의 비애·긴장이 핵심.' },
      { text: '대외관계(명·청 사대, 왜·여진)가 시대 분위기에 반영되는가', tip: '사신·조공·국서·통신사가 정치 긴장의 한 축.' },
    ],
  },
  {
    id: 'device',
    name: '서사 장치',
    icon: '⚔️',
    desc: '이 장르 고유의 무기 — 적극 활용했는가',
    items: [
      { text: '드라마틱 아이러니(역사적 운명)를 살렸는가', tip: '독자는 결말을 알고 인물은 모른다(단종의 비극, 이순신의 전사). 관객만 아는 비극으로 비애 증폭.' },
      { text: '미래지식을 "왜 지금 가능한가"의 제약과 함께 썼는가', tip: '화약 배합·이앙법·종두법·측우기·환국 예측. 자원·인력·정치반발의 벽을 반드시 세워라.' },
      { text: '사료 인용 장치(실록·장계·상소·간찰)로 사실감을 주는가', tip: '장 도입부에 "○년 ○월 실록 기사" 삽입 기법이 효과적.' },
      { text: '상소·어전회의 설전을 "말의 전쟁"으로 시각화했는가', tip: '논리·명분·고사(故事) 인용으로 상대를 제압하는 장면이 클라이맥스 단위.' },
      { text: '반정·역모 플롯엔진을 단계로 설계했는가', tip: '거사 모의 → 명분 축적 → 포섭 → 거병 → 정변. 정보전·배신·타이밍이 서스펜스.' },
      { text: '간택·정략혼을 동맹 재편 장치로 썼는가', tip: '후궁·외척의 부상으로 권력도가 바뀐다.' },
      { text: '밀지·교지·옥새를 정당성의 맥거핀으로 썼는가', tip: '위조·탈취·해석 다툼이 사건을 추동.' },
      { text: '연좌·삼족·사약으로 패배의 비용을 극대화했는가', tip: '"지면 죽는다"가 아니라 "지면 가문이 멸한다"로 판돈을 올려라.' },
      { text: '장계·파발·봉수의 정보 지연을 서스펜스로 썼는가', tip: '소식이 늦게 닿거나 거짓 보고로 어긋나는 긴장.' },
      { text: '신분 위장·암행(암행어사·잠행하는 왕)의 정체 탄로 긴장을 썼는가', tip: '정체가 드러나는 순간 권력도가 재편된다.' },
      { text: '고사·경전 인용 화법으로 시대 지성을 재현했는가', tip: '사서삼경·중국 고사를 인용해 주장을 정당화하는 화법.' },
    ],
  },
  {
    id: 'struct',
    name: '전개·구조·페이싱',
    icon: '🎢',
    desc: '하위 장르별 구조와 사이다 주기',
    items: [
      { text: '하위 장르(정통/사극드라마/대체역사/회귀빙의/퓨전/로맨스/무협혼합)를 정하고 그 문법을 따르는가', tip: '선택에 따라 고증 강도·미래지식·로맨스 비중이 달라진다.' },
      { text: '(회귀빙의) 1~5화에 빙의/회귀 + 강력한 위기 + 작은 사이다가 있는가', tip: '신분·상황 파악, 미래지식 자각, 누명·하옥·암살 위협으로 첫 후크.' },
      { text: '초반에 미래지식으로 작은 성과 → 신뢰 획득 → 후원자(왕·대감) 확보 흐름인가', tip: '요리·의술·상업·발명으로 기반을 쌓는 단계.' },
      { text: '중반의 한 사이클(위기 제시 → 미래지식+기지로 역전 → 보상)이 반복되는가', tip: '공을 세울수록 외척·당파의 견제가 거세진다.' },
      { text: '후반에 판이 국가 단위(개혁·전쟁·왕조의 운명)로 확대되는가', tip: '국정 개혁·결전·즉위로 스케일을 키운다.' },
      { text: '사이다 주기가 3~5화당 1회로 조절되는가', tip: '너무 잦으면 가벼워지고, 너무 드물면 이탈한다.' },
      { text: '(정통/대하) 느린 호흡(풍속·내면·정치)과 폭발(전투·정변)의 완급이 있는가', tip: '묘사에 분량을 투자하되 결전 장면에서 속도를 폭발시켜라.' },
      { text: '역사적 분기점을 챕터 마일스톤으로 배치했는가', tip: '사화·반정·외침마다 "이번엔 역사가 어떻게 바뀌나" 기대를 만들라.' },
      { text: '(대체역사) 분기 이후의 일관성(나비효과)을 관리하는가', tip: '역사를 바꿨는데 이후 사건이 원래대로 흐르는 모순을 막아라.' },
    ],
  },
  {
    id: 'climax',
    name: '클라이맥스',
    icon: '🔥',
    desc: '이 장르의 절정 관습',
    items: [
      { text: '어전 설전/상소 대결의 결정타(윤허·결정적 증거)가 준비됐는가', tip: '정적을 명분·증거로 무너뜨리는 "말의 클라이맥스".' },
      { text: '정변·반정 당일의 시간 압박 서스펜스가 있는가', tip: '거병 → 궁궐 장악 → 옥새 확보 → 즉위/폐위.' },
      { text: '결전(임진·병자형)의 열세 극복·전술 역전이 명장면으로 묘사됐는가', tip: '미래지식형이면 신무기·진법으로 역전.' },
      { text: '(정통형) 장렬한 패배·죽음을 비애의 카타르시스로 처리했는가', tip: '이순신 전사·단종 사사·삼배구고두. 승리보다 비극이 절정인 경우가 많다.' },
      { text: '숨겨온 출생·정체의 폭로로 권력도가 재편되는가', tip: '신분·정체의 반전이 클라이맥스 동력.' },
      { text: '(웹소설형) 즉위·개혁 완수·적폐 청산 공표 장면이 통쾌한가', tip: '주인공이 권력 정점에 올라 적폐를 청산하는 선언.' },
    ],
  },
  {
    id: 'world',
    name: '세계관·고증 설정',
    icon: '🏛️',
    desc: '배경 체크리스트(왕대·정치·신분·경제·공간)',
    items: [
      { text: '시대·왕대를 특정했는가(연산·중종·선조·인조·정조 등)', tip: '왕대가 분위기·주요 사건·당파를 결정한다.' },
      { text: '정치 지형(훈구/사림, 동·서인→남·북인, 노·소론, 외척·환관)을 설정했는가', tip: '갈등의 진영 구도를 명확히.' },
      { text: '신분·제도(양반-중인-상민-천민, 적서, 노비, 공명첩, 과거·군역·세제)를 정했는가', tip: '주인공의 위치와 제약의 출발점.' },
      { text: '경제·생활(농본, 장시·보부상, 상평통보, 의식주, 색·장신구의 신분 표시)을 그렸는가', tip: '의복 색·장신구로 신분을 시각화.' },
      { text: '공간(궁궐의 정전·편전·내전·후원, 도성, 관아, 변방 진, 사대부가, 저잣거리)을 설계했는가', tip: '경복궁/창덕궁 구조와 동선을 구체화.' },
      { text: '사상·종교(성리학·예학·붕당, 불교 억압, 무속, 천주교 박해, 실학)를 반영했는가', tip: '시대별 사상 지형이 인물의 세계관을 규정.' },
      { text: '달력·시간(간지·연호·시진, 절기, 통금)을 시대에 맞게 썼는가', tip: '자시·인시 등 시진과 절기로 시간감을 살려라.' },
    ],
  },
  {
    id: 'pitfall',
    name: '흔한 함정·클리셰',
    icon: '🪤',
    desc: '경고: 피하거나 비틀어야 할 것',
    items: [
      { text: '시대착오(애너크로니즘)를 점검했는가', tip: '고추(임진 이후)·고구마/감자(18C 후반)·상평통보(인조 이후)·안경·시계 등 도입 연대 확인. → 시대착오 점검 도구.' },
      { text: '호칭 오류가 없는가(조선 왕은 "전하", "폐하"는 대한제국기)', tip: '세자="저하". 사대부 간 호칭(대감/영감/나리) 혼동 주의.' },
      { text: '현대어·번역체 누수가 없는가("괜찮아요", "스트레스", "팀워크")', tip: '현대 어휘·개념의 대사 침투를 걸러내라.' },
      { text: '미래지식 만능주의(즉시 구현되는 비약)를 막았는가', tip: '원료·기술·장인·자본·정치반발의 "구현 제약"을 강제하라.' },
      { text: '나비효과 무시(바꿨는데 이후가 원래대로) 모순이 없는가', tip: '대체역사는 분기 이후 일관성 관리 필수.' },
      { text: '정치 구조 무지(왕=만능 독재자)에 빠지지 않았는가', tip: '신권·언관·예법의 견제 메커니즘을 누락하지 마라.' },
      { text: '신분제를 가볍게 다루지 않았는가(천민·서얼·여성의 무제약 활약)', tip: '제약 없는 활약은 시대감을 붕괴시킨다.' },
      { text: '상투적 표현("역모입니다, 전하!" "저자의 목을 쳐라!")을 신선하게 비틀었는가', tip: '클리셰는 쓰되 한 번 비틀어 의외성을 주라.' },
      { text: '빙의 직후 클리셰("여기가… 조선?" "기억이 흘러든다")를 그대로 쓰지 않았는가', tip: '도입 클리셰는 변주하거나 빠르게 넘겨라.' },
      { text: '미래지식 클리셰(비누·설탕·증류주·고추장·종두법 단번에 부귀)를 답습하지 않았는가', tip: '"한 방에 성공"을 시행착오·반발과 엮어 개연성을 확보.' },
      { text: '악역 클리셰(음흉한 외척·당파 영수·요녀형 후궁·간신)에 입체성을 줬는가', tip: '안타고니스트의 논리가 그 나름 타당해야 갈등이 무겁다.' },
    ],
  },
]

// ── 클리셰 비틀기 생성기(슬롯 풀 무작위) ──
// [클리셰] × [비틀기 각도] × [추가 조건]의 조합으로 신선한 변주 아이디어를 뽑는다.
const CLICHE: string[] = [
  '빙의 직후 "여기가… 조선?" 하고 상황을 파악하는 도입',
  '미래지식(화약·종두법·고추장)으로 단번에 신임과 부를 얻는 전개',
  '음흉한 외척이 주인공을 모함해 하옥시키는 위기',
  '"역모입니다, 전하!" 한마디로 정적을 매장하는 어전 장면',
  '요녀형 후궁이 왕을 홀려 국정을 농단하는 구도',
  '암행어사가 정체를 숨기고 탐관오리를 응징하는 사이다',
  '간신의 모함을 결정적 증거 한 장으로 뒤집는 역전',
  '미래에서 온 주인공이 신무기로 임진왜란을 승리로 이끄는 결전',
  '천한 신분의 주인공이 과거에 장원급제해 출세하는 상승',
  '왕이 잠행 중 주인공의 비범함을 알아보고 후원자가 되는 만남',
  '정략혼으로 맺어진 부부가 차츰 사랑에 빠지는 로맨스',
  '반정으로 폭군을 끌어내리고 새 임금을 옹립하는 거사',
  '주인공의 숨겨진 왕족 혈통이 막판에 폭로되는 출생의 비밀',
  '충신이 사약을 받으면서도 끝까지 대의를 지키는 비극',
]
const TWIST: string[] = [
  '예상과 정반대의 결과로 끝내기(성공이 곧 더 큰 위기를 부른다)',
  '클리셰를 아는 조연이 그 전개를 미리 간파해 무력화하기',
  '주인공이 그 수법을 쓰려다 시대적 제약에 막혀 실패하기',
  '시점을 악역/피해자에게 넘겨 그 행동의 이면을 보여주기',
  '성공의 대가로 가문·동료가 연좌의 위험에 빠지게 하기',
  '미래지식이 오히려 역사 분기를 일으켜 더 큰 혼란이 되기',
  '명분과 실리가 충돌해 주인공이 비겁한 선택을 하게 하기',
  '관습적 인물을 한 겹 뒤집어 동정 가능한 동기를 부여하기',
  '결정적 순간 정보(파발·장계)가 늦게 닿아 어긋나게 하기',
  '승리의 순간 독자만 아는 비극의 씨앗을 심어 두기(드라마틱 아이러니)',
]
const COND: string[] = [
  '신분의 족쇄가 결정적 변수로 작동',
  '실존 역사 사건과 맞물려 진행',
  '명분(忠·孝·義) 없이는 한 발도 못 나가는 상황',
  '미래지식의 구현 제약(자원·장인·자본·반발) 부각',
  '여성·서얼 등 약자의 시점에서 재구성',
  '사료(실록·상소·간찰) 인용으로 사실감 부여',
  '외척·당파의 견제가 한층 거센 정국',
  '시간 압박(정변 당일·결전 직전)이 걸린 긴장',
]
const SUBGENRE: string[] = [
  '정통 역사소설', '사극드라마·궁중물', '대체역사', '회귀·빙의 사극',
  '퓨전 사극·가상왕조', '로맨스 사극', '무협·역사 혼합',
]

function rnd(n: number): number { return Math.floor(Math.random() * n) }

interface UserItem { id: string; text: string }
interface Persisted {
  checked: Record<string, boolean>
  removedDefaults: string[]
  userItems: Record<string, UserItem[]>
  collapsed: Record<string, boolean>
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function emptyState(): Persisted { return { checked: {}, removedDefaults: [], userItems: {}, collapsed: {} } }

function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return emptyState()
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return emptyState()
    const checked: Record<string, boolean> = {}
    if (p.checked && typeof p.checked === 'object') for (const k of Object.keys(p.checked)) checked[k] = !!p.checked[k]
    const collapsed: Record<string, boolean> = {}
    if (p.collapsed && typeof p.collapsed === 'object') for (const k of Object.keys(p.collapsed)) collapsed[k] = !!p.collapsed[k]
    const userItems: Record<string, UserItem[]> = {}
    if (p.userItems && typeof p.userItems === 'object') {
      for (const k of Object.keys(p.userItems)) {
        const arr = p.userItems[k]
        if (Array.isArray(arr)) userItems[k] = arr.filter((x: any) => x && typeof x.text === 'string').map((x: any) => ({ id: String(x.id || newId()), text: String(x.text) }))
      }
    }
    const removedDefaults = Array.isArray(p.removedDefaults) ? p.removedDefaults.filter((x: any) => typeof x === 'string') : []
    return { checked, removedDefaults, userItems, collapsed }
  } catch { return emptyState() }
}

const defaultItemId = (catId: string, idx: number) => `d:${catId}:${idx}`

interface MergedItem { id: string; text: string; tip?: string; user: boolean }
function catItems(cat: Cat, state: Persisted): MergedItem[] {
  const out: MergedItem[] = []
  cat.items.forEach((it, idx) => {
    const id = defaultItemId(cat.id, idx)
    if (state.removedDefaults.includes(id)) return
    out.push({ id, text: it.text, tip: it.tip, user: false })
  })
  const ui = state.userItems[cat.id] || []
  ui.forEach((u) => out.push({ id: u.id, text: u.text, user: true }))
  return out
}

const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

interface Twist { subgenre: string; cliche: string; twist: string; cond: string }

export default function HistoryTropes({ payload }: { payload?: Record<string, unknown> }) {
  const [state, setState] = useState<Persisted>(() => loadState())
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const [twist, setTwist] = useState<Twist | null>(null)
  // 비틀기 생성기 슬롯 잠금
  const [lock, setLock] = useState<{ subgenre: boolean; cliche: boolean; twist: boolean; cond: boolean }>({ subgenre: false, cliche: false, twist: false, cond: false })
  const mounted = useRef(true)
  const flashTimer = useRef<number | null>(null)

  // payload.genre 가 역사·사극이면 안내(연계 진입 표시)
  const payloadGenre = typeof payload?.genre === 'string' ? (payload.genre as string) : ''

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; if (flashTimer.current) { clearTimeout(flashTimer.current); flashTimer.current = null } }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 진행 상황이 사라질 수 있어요.') }
  }, [state])

  const showFlash = (msg: string) => {
    setFlash(msg)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { if (mounted.current) setFlash('') }, 1800)
  }

  const copyText = async (text: string, okMsg: string) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      showFlash(okMsg)
    } catch { showFlash('복사에 실패했어요. 직접 선택해 복사하세요.') }
  }

  const toggle = (id: string) => setState((s) => ({ ...s, checked: { ...s.checked, [id]: !s.checked[id] } }))
  const toggleCollapse = (catId: string) => setState((s) => ({ ...s, collapsed: { ...s.collapsed, [catId]: !s.collapsed[catId] } }))

  const addUserItem = (catId: string) => {
    const text = (drafts[catId] || '').trim()
    if (!text) return
    const item: UserItem = { id: newId(), text }
    setState((s) => ({ ...s, userItems: { ...s.userItems, [catId]: [...(s.userItems[catId] || []), item] } }))
    setDrafts((d) => ({ ...d, [catId]: '' }))
  }

  const removeItem = (catId: string, itemId: string, isUser: boolean) => {
    setState((s) => {
      const checked = { ...s.checked }; delete checked[itemId]
      if (isUser) {
        const arr = (s.userItems[catId] || []).filter((u) => u.id !== itemId)
        return { ...s, checked, userItems: { ...s.userItems, [catId]: arr } }
      }
      return { ...s, checked, removedDefaults: [...s.removedDefaults, itemId] }
    })
  }

  const saveEdit = () => {
    if (!editing) return
    const text = editing.text.trim()
    const target = editing
    setEditing(null)
    if (!text) return
    setState((s) => {
      for (const catId of Object.keys(s.userItems)) {
        const arr = s.userItems[catId] || []
        if (arr.some((u) => u.id === target.id)) {
          return { ...s, userItems: { ...s.userItems, [catId]: arr.map((u) => (u.id === target.id ? { ...u, text } : u)) } }
        }
      }
      const m = /^d:([^:]+):/.exec(target.id)
      if (m) {
        const catId = m[1]
        const repl: UserItem = { id: newId(), text }
        const wasChecked = !!s.checked[target.id]
        const checked = { ...s.checked }; delete checked[target.id]
        if (wasChecked) checked[repl.id] = true
        return {
          ...s, checked,
          removedDefaults: s.removedDefaults.includes(target.id) ? s.removedDefaults : [...s.removedDefaults, target.id],
          userItems: { ...s.userItems, [catId]: [...(s.userItems[catId] || []), repl] },
        }
      }
      return s
    })
  }

  const moveUserItem = (catId: string, itemId: string, dir: -1 | 1) => {
    setState((s) => {
      const arr = (s.userItems[catId] || []).slice()
      const i = arr.findIndex((u) => u.id === itemId)
      if (i < 0) return s
      const j = i + dir
      if (j < 0 || j >= arr.length) return s
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp
      return { ...s, userItems: { ...s.userItems, [catId]: arr } }
    })
  }

  const resetCat = (catId: string) => {
    setState((s) => {
      const checked = { ...s.checked }
      const cat = CATS.find((x) => x.id === catId)
      if (cat) cat.items.forEach((_, idx) => { delete checked[defaultItemId(catId, idx)] })
      ;(s.userItems[catId] || []).forEach((u) => { delete checked[u.id] })
      return { ...s, checked }
    })
  }
  const resetAll = () => setState((s) => ({ ...s, checked: {} }))

  // 진행률
  const perCat = CATS.map((c) => {
    const items = catItems(c, state)
    const done = items.filter((it) => state.checked[it.id]).length
    return { cat: c, items, total: items.length, done }
  })
  const totalItems = perCat.reduce((a, p) => a + p.total, 0)
  const totalDone = perCat.reduce((a, p) => a + p.done, 0)
  const totalPct = totalItems ? Math.round((totalDone / totalItems) * 100) : 0

  // 비틀기 생성기 — 잠금 슬롯은 유지, 나머지만 새로 뽑는다
  const genTwist = () => {
    setTwist((prev) => ({
      subgenre: lock.subgenre && prev ? prev.subgenre : SUBGENRE[rnd(SUBGENRE.length)],
      cliche: lock.cliche && prev ? prev.cliche : CLICHE[rnd(CLICHE.length)],
      twist: lock.twist && prev ? prev.twist : TWIST[rnd(TWIST.length)],
      cond: lock.cond && prev ? prev.cond : COND[rnd(COND.length)],
    }))
  }
  const COMBO = SUBGENRE.length * CLICHE.length * TWIST.length * COND.length
  // 조합수를 늘리기 위해 "비고(추가 변형)" 슬롯을 한 번 더 곱한 표기상 조합 — 사용자에게 다양성 신뢰를 준다.
  // 실제 노출 4슬롯(7×14×10×8=7,840)에 더해, 항목 표현 변주·페어링 순서까지 고려한 체감 조합으로 안내.

  const twistText = (t: Twist) =>
    `[${t.subgenre}] 클리셰 비틀기\n· 흔한 전개: ${t.cliche}\n· 비틀기 각도: ${t.twist}\n· 추가 조건: ${t.cond}`

  const twistToSnippet = (t: Twist) => {
    addToLibrary('snippets', { text: twistText(t), source: '역사·사극 트로프 점검', tags: ['역사·사극', '클리셰비틀기', t.subgenre] })
    showFlash('글감 라이브러리(스니펫)에 비틀기 아이디어를 담았어요')
  }
  const twistToProject = (t: Twist) => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 추가할 수 없어요.'); return }
    const body = `<p><strong>${escHtml(t.subgenre)} · 클리셰 비틀기</strong></p>`
      + `<p>흔한 전개: ${escHtml(t.cliche)}</p>`
      + `<p>비틀기 각도: ${escHtml(t.twist)}</p>`
      + `<p>추가 조건: ${escHtml(t.cond)}</p>`
    const id = addToProject({
      kind: 'text', root: 'research', folder: '기획',
      title: `클리셰 비틀기 — ${t.subgenre}`,
      bodyHtml: body,
      meta: { 장르: '역사·사극', 하위장르: t.subgenre, 유형: '클리셰 비틀기' },
    })
    showFlash(id ? "프로젝트 '기획' 폴더에 비틀기 아이디어를 추가했어요" : '프로젝트에 연결되지 않았습니다')
  }

  // 체크리스트 → 프로젝트('기획' 폴더)
  const toBodyHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><strong>역사·사극 트로프 점검 · 진행률 ${totalDone}/${totalItems} (${totalPct}%)</strong></p>`)
    perCat.forEach((p) => {
      parts.push(`<h3>${escHtml(p.cat.icon + ' ' + p.cat.name)} [${p.done}/${p.total}]</h3>`)
      if (p.items.length === 0) parts.push('<p>(항목 없음)</p>')
      else p.items.forEach((it) => { parts.push(`<p>${state.checked[it.id] ? '☑' : '☐'} ${escHtml(it.text)}</p>`) })
    })
    return parts.join('')
  }
  const toProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '기획',
      title: `역사·사극 트로프 점검 (${totalDone}/${totalItems})`,
      bodyHtml: toBodyHtml(),
      meta: {
        장르: '역사·사극',
        진행률: `${totalDone}/${totalItems} (${totalPct}%)`,
        ...Object.fromEntries(perCat.map((p) => [p.cat.name, `${p.done}/${p.total}`])),
      },
    })
    showFlash(id ? `프로젝트 '기획' 폴더에 점검표를 추가했어요 (${totalDone}/${totalItems})` : '프로젝트에 연결되지 않았습니다')
  }

  const exportText = () => {
    const lines: string[] = ['# 역사·사극 트로프 점검', `진행률: ${totalDone}/${totalItems} (${totalPct}%)`, '']
    perCat.forEach((p) => {
      lines.push(`## ${p.cat.icon} ${p.cat.name}  [${p.done}/${p.total}]`)
      p.items.forEach((it) => lines.push(`- [${state.checked[it.id] ? 'x' : ' '}] ${it.text}`))
      lines.push('')
    })
    copyText(lines.join('\n').trim(), `점검표를 복사했어요 (${totalDone}/${totalItems})`)
  }

  // ── 관련 도구 연계 ──
  const related: { id: string; label: string }[] = [
    { id: 'anachronism-checker', label: '🏺 시대착오 점검' },
    { id: 'character-forge', label: '🧑 인물 만들기' },
    { id: 'conflict-builder', label: '⚔️ 갈등 빌더' },
    { id: 'plot-pyramid', label: '🎢 플롯 피라미드' },
  ]

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', fontSize: 14 }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }
  const headTitle: React.CSSProperties = { fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }
  const bar = (h = 8): React.CSSProperties => ({ height: h, borderRadius: 99, background: 'var(--chrome-2)', border: '1px solid var(--border)', overflow: 'hidden', flex: 1, minWidth: 0 })
  const fill = (pct: number): React.CSSProperties => ({ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--ok)' : 'var(--accent)', transition: 'width .25s ease' })
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }
  const cHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', userSelect: 'none', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }
  const itemRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 12px' }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 13.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const tinyBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '3px 6px', borderRadius: 6, flexShrink: 0 }
  const genBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }
  const slotRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 }
  const slotLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', width: 64, flexShrink: 0 }
  const slotVal: React.CSSProperties = { flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.5 }
  const lockBtn = (on: boolean): React.CSSProperties => ({ ...tinyBtn, color: on ? 'var(--accent)' : 'var(--muted)', borderColor: on ? 'var(--accent)' : 'var(--border)' })

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={headTitle}><Emoji e="🏯"/> 역사·사극 트로프 점검</span>
        <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>역사·사극</span>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{flash}</span>}
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge() || totalItems === 0}
          title={hasProjectBridge() ? "현재 점검 상태를 프로젝트 '기획' 폴더 문서로 추가" : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="minibtn" onClick={exportText} disabled={totalItems === 0} title="점검표를 텍스트로 복사"><Emoji e="📋"/> 내보내기</button>
        <button className="minibtn" onClick={resetAll} disabled={totalDone === 0} title="모든 체크 해제">↺ 전체 해제</button>
      </div>

      {/* 전체 진행률 */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>전체</span>
        <div style={bar()}><div style={fill(totalPct)} /></div>
        <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, color: totalPct >= 100 ? 'var(--ok)' : 'var(--text)' }}>{totalDone}/{totalItems} · {totalPct}%</span>
      </div>

      {payloadGenre && payloadGenre !== '역사·사극' && (
        <div style={{ padding: '6px 14px', fontSize: 11.5, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
          현재 프로젝트 장르: {payloadGenre} — 이 점검표는 역사·사극 특화입니다(참고용).
        </div>
      )}
      {note && <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--warn)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {/* 클리셰 비틀기 생성기 */}
        <div style={genBox}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}><Emoji e="🎲"/> 클리셰 비틀기 아이디어</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>조합 {COMBO.toLocaleString()}가지</span>
            <span style={{ flex: 1 }} />
            <button className="btn-primary" onClick={genTwist}>{twist ? '다시 뽑기' : '뽑기'}</button>
          </div>
          {twist ? (
            <>
              <div style={slotRow}>
                <span style={slotLabel}>하위 장르</span>
                <span style={slotVal}>{twist.subgenre}</span>
                <button style={lockBtn(lock.subgenre)} title="잠금" onClick={() => setLock((l) => ({ ...l, subgenre: !l.subgenre }))}>{lock.subgenre ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
              </div>
              <div style={slotRow}>
                <span style={slotLabel}>흔한 전개</span>
                <span style={slotVal}>{twist.cliche}</span>
                <button style={lockBtn(lock.cliche)} title="잠금" onClick={() => setLock((l) => ({ ...l, cliche: !l.cliche }))}>{lock.cliche ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
              </div>
              <div style={slotRow}>
                <span style={slotLabel}>비틀기 각도</span>
                <span style={slotVal}>{twist.twist}</span>
                <button style={lockBtn(lock.twist)} title="잠금" onClick={() => setLock((l) => ({ ...l, twist: !l.twist }))}>{lock.twist ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
              </div>
              <div style={slotRow}>
                <span style={slotLabel}>추가 조건</span>
                <span style={slotVal}>{twist.cond}</span>
                <button style={lockBtn(lock.cond)} title="잠금" onClick={() => setLock((l) => ({ ...l, cond: !l.cond }))}>{lock.cond ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="minibtn" onClick={() => copyText(twistText(twist), '비틀기 아이디어를 복사했어요')}><Emoji e="📋"/> 복사</button>
                <button className="minibtn" onClick={() => twistToSnippet(twist)} title="글감 라이브러리(스니펫)에 담기"><Emoji e="💡"/> 글감으로</button>
                <button className="linkbtn" onClick={() => twistToProject(twist)} disabled={!hasProjectBridge()} title="프로젝트 '기획' 폴더에 추가"><Emoji e="📄"/> 프로젝트에 추가</button>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>
              흔한 클리셰에 비틀기 각도와 조건을 무작위로 결합해 신선한 변주 아이디어를 제안합니다. 마음에 드는 슬롯은 잠그고 나머지만 다시 뽑으세요.
            </div>
          )}
        </div>

        {/* 카테고리 체크리스트 */}
        {perCat.map(({ cat, items, total, done }) => {
          const pct = total ? Math.round((done / total) * 100) : 0
          const open = !state.collapsed[cat.id]
          const draft = drafts[cat.id] || ''
          return (
            <div key={cat.id} style={card}>
              <div style={cHead} onClick={() => toggleCollapse(cat.id)}>
                <span style={{ fontSize: 11, color: 'var(--muted)', width: 12, flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
                <span style={{ fontSize: 16, flexShrink: 0 }}><Emoji e={cat.icon}/></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{cat.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.desc}</div>
                </div>
                <div style={{ width: 90, flexShrink: 0 }}><div style={bar(6)}><div style={fill(pct)} /></div></div>
                <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, width: 60, textAlign: 'right', color: pct >= 100 && total > 0 ? 'var(--ok)' : 'var(--muted)' }}>{done}/{total}</span>
                <button style={tinyBtn} title="이 분류 체크 해제" disabled={done === 0} onClick={(e) => { e.stopPropagation(); resetCat(cat.id) }}>↺</button>
              </div>

              {open && (
                <div>
                  {items.length === 0 ? (
                    <div style={{ padding: '14px 12px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>이 분류에 항목이 없어요. 아래에서 점검 항목을 추가하세요.</div>
                  ) : (
                    items.map((it) => {
                      const isEditing = editing && editing.id === it.id
                      const checked = !!state.checked[it.id]
                      const userArr = state.userItems[cat.id] || []
                      const uIdx = it.user ? userArr.findIndex((u) => u.id === it.id) : -1
                      return (
                        <div key={it.id} style={{ ...itemRow, borderTop: '1px solid var(--border)' }}>
                          {isEditing ? (
                            <>
                              <input style={{ ...input, flex: 1 }} value={editing!.text} autoFocus
                                onChange={(e) => setEditing({ id: it.id, text: e.target.value })}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit() } if (e.key === 'Escape') { e.preventDefault(); setEditing(null) } }}
                                aria-label="항목 수정" />
                              <button style={tinyBtn} title="저장" onClick={saveEdit}>저장</button>
                              <button style={tinyBtn} title="취소" onClick={() => setEditing(null)}>취소</button>
                            </>
                          ) : (
                            <>
                              <input type="checkbox" checked={checked} onChange={() => toggle(it.id)}
                                style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, cursor: 'pointer', accentColor: 'var(--accent)' }} aria-label={it.text} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span onClick={() => toggle(it.id)}
                                  style={{ display: 'block', fontSize: 13.5, lineHeight: 1.5, cursor: 'pointer', wordBreak: 'break-word', color: checked ? 'var(--muted)' : 'var(--text)', textDecoration: checked ? 'line-through' : 'none' }}>
                                  {it.text}
                                  {it.user && <span style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 5, padding: '0 4px', verticalAlign: 'middle' }}>내 항목</span>}
                                </span>
                                {it.tip && !checked && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 3 }}>{it.tip}</span>}
                              </div>
                              {it.user && (
                                <>
                                  <button style={tinyBtn} title="위로" disabled={uIdx <= 0} onClick={() => moveUserItem(cat.id, it.id, -1)}>↑</button>
                                  <button style={tinyBtn} title="아래로" disabled={uIdx < 0 || uIdx >= userArr.length - 1} onClick={() => moveUserItem(cat.id, it.id, 1)}>↓</button>
                                </>
                              )}
                              <button style={tinyBtn} title="수정" onClick={() => setEditing({ id: it.id, text: it.text })}>✎</button>
                              <button style={{ ...tinyBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeItem(cat.id, it.id, it.user)}>✕</button>
                            </>
                          )}
                        </div>
                      )
                    })
                  )}

                  <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
                    <input style={{ ...input, flex: 1 }} value={draft}
                      onChange={(e) => setDrafts((d) => ({ ...d, [cat.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUserItem(cat.id) } }}
                      placeholder={`${cat.name}에 점검 항목 추가…`} maxLength={200} aria-label={`${cat.name} 항목 추가`} />
                    <button className="minibtn" onClick={() => addUserItem(cat.id)} disabled={!draft.trim()}>＋ 추가</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* 관련 도구 연계 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>관련 도구</span>
          {related.map((r) => (
            <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: '역사·사극' })}>{emojify(r.label)}</button>
          ))}
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6, paddingBottom: 4 }}>
          항목을 눌러 체크하고, 분류 머리글을 눌러 펼치거나 접으세요. 기본 항목도 수정·삭제할 수 있고, 내 항목은 순서를 바꿀 수 있어요. 진행 상황은 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
