// 게임판타지·LitRPG 장면 생성기(LitrpgSceneForge) — 도시에에 근거해 이 장르 '전형 장면'을
//   요소 슬롯 조합으로 무작위 생성한다(완전 로컬, 외부 API 없음).
//  · 4대 분기(VR 다이브/데스게임/이세계 전이+시스템/현실 침공)를 첫 슬롯으로 두어 톤·금기를 가른다.
//  · 장르 고유 서사 장치(상태창·레벨업·스킬·퀘스트·드랍·시스템 메시지·한계돌파)를 장면 골격으로.
//  · '전개법' 적용: 코어 루프(사냥→보상→성장)와 성장 곡선(약→강)을 장면 구조에 반영.
//  · 슬롯별 🔒 잠금 + 🎲 부분 재생성, 조합수 표시(1억 이상).
//  · 본문에 삽입할 '시스템 메시지 박스'까지 함께 생성 — 장르 특유의 팝업 연출.
//  · 연계: 📄 프로젝트에 장면 추가(원고 › 장면), 스니펫/장소 라이브러리, 관련 도구 열기. payload.genre 활용.
// 규칙: react 와 './linkbus' 만 import. 데이터(잠금/최근 분기)는 localStorage('sry:tool:litrpg-sceneforge'). 언마운트 정리.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'litrpg-sceneforge',
  name: 'LitRPG 장면 생성기(조합 1조+)',
  icon: '🎮',
  group: '생성기',
  genre: '게임판타지·LitRPG',
  intro: '상태창·레벨업·퀘스트·드랍·시스템 메시지로 짜는 게임판타지/LitRPG 전형 장면을 조 단위 조합으로 생성',
  w: 560,
  h: 690,
}

const LS_KEY = 'sry:tool:litrpg-sceneforge'

// ───────────────────────── 분기(첫 선택) ─────────────────────────
// 도시에 §0: 4분기를 첫 선택지로 두면 이후 관습·금기·페이싱이 자동으로 갈린다.
interface Branch {
  key: string
  label: string
  icon: string
  blurb: string
  taboo: string          // 이 분기에서 피해야 할 것(함정)
  systemVoice: string    // 시스템/안내자 화자 톤
}
const BRANCHES: Branch[] = [
  { key: 'vr', label: 'VR 다이브형', icon: '🕶', blurb: '현실의 인간이 가상현실 게임(로열로드형)에 접속. 로그아웃·현실 생활이 공존', taboo: '죽음을 영구사망처럼 묘사하지 말 것(부활/로그아웃 가능)', systemVoice: '[시스템]' },
  { key: 'death', label: '갇힘/데스게임형', icon: '💀', blurb: 'SAO형. 게임에서 못 나오고, 죽으면 진짜 죽음. 긴장도 최상', taboo: '"로그아웃 안전지대" 묘사 금지 — 죽음의 무게를 희석하지 말 것', systemVoice: '[관리자 경고]' },
  { key: 'isekai', label: '이세계 전이+시스템형', icon: '🌀', blurb: '다른 세계로 넘어갔는데 그 세계에 게임 시스템이 깔려 있음. 로그아웃 개념 없음', taboo: '"이건 게임일 뿐"이라는 안심 대사 금지 — 세계는 진짜다', systemVoice: '[시스템]' },
  { key: 'apocalypse', label: '현실 침공형(시스템 아포칼립스)', icon: '🌃', blurb: '어느 날 현실에 상태창·던전·게이트가 출현. 헌터물과 강하게 겹침', taboo: '평범한 일상을 너무 길게 끌지 말 것 — 게이트의 위협이 상수다', systemVoice: '[시스템]' },
]

// ───────────────────────── 슬롯(장면 요소) ─────────────────────────
interface Slot { key: string; label: string; hint?: string; options: string[] }

// 도시에 §3·§4·§5의 장르 고유 장치/페이싱/클라이맥스를 슬롯으로 구체화(일반론 금지, 장르 특화).
const SLOTS: Slot[] = [
  {
    key: 'sceneType', label: '장면 유형', hint: '에피소드 단위 = 던전·레이드·퀘스트·랭킹전 한 덩어리(§4)',
    options: [
      '튜토리얼 구간(규칙 학습=독자 온보딩)', '첫 사냥터 진입(파워 게이팅)', '히든 던전 발견', '네임드 보스 레이드',
      '필드 보스 선점 경쟁', '강화·인챈트 도박(장비 파괴 위험)', '전직(클래스) 퀘스트', '히든/유니크 클래스 각성',
      '경매장·노점 흥정(현실↔게임 환율)', '랭킹전·길드 대항전', '레이드 공략 회의(빌드·시너지 설계)', 'PK·필드 학살 조우',
      '루팅 개봉(보스 드랍 까보기)', '스탯·스킬 트리 재설계', '안전지대 휴식·정보 교환', '퀘스트 실패 페널티 정산',
      '시스템(안내자 AI)과의 첫 대화', '회귀/원작지식 발동(미래를 써먹는 순간)', '게이트 브레이크(현실 침공)', '탑 층 돌파 시험',
    ],
  },
  {
    key: 'place', label: '무대', hint: '난이도 구획: 마을→필드→던전→레이드→상위 지역(§4)',
    options: [
      '초보자 마을의 광장', '슬라임이 들끓는 시작의 평원', '거미줄 가득한 폐광 던전', '독안개 자욱한 늪지 필드',
      '용암이 흐르는 화산 균열 레이드', '얼어붙은 설산 정상의 비밀 제단', '부패의 기운이 흐르는 언데드 묘지', '하늘에 떠 있는 부유성',
      '미궁처럼 뒤틀린 무한 회랑 던전', '거대 보스가 잠든 심해 신전', '경매장과 길드들이 모인 중앙 도시', '랭커들만 입장 가능한 콜로세움',
      '현실에 갑자기 열린 A급 게이트', '서울 한복판에 솟아난 던전 입구', '탑의 47층 시험장', '리스폰 직후의 적막한 부활 제단',
      '함정으로 가득한 보물고', '시스템이 만든 새하얀 튜토리얼 공간', '폐허가 된 NPC 마을', '버그처럼 멈춘 시간의 틈',
    ],
  },
  {
    key: 'pov', label: '시점 인물', hint: '약자에서 시작하는 성장 곡선(§4)',
    options: [
      'F급으로 시작한 무직 각성자', '회귀해 미래를 아는 랭커', '원작 소설을 다 읽은 독자', '생산직(대장장이) 노가다 플레이어',
      '히든 클래스를 단독 보유한 신입', '버려진 길드의 막내 탱커', '딜미터 1위를 노리는 광전사', '몰래 정보를 파는 정보상',
      '시스템에게 선택받은 유일한 사용자', '데스게임에 갇힌 평범한 학생', '전직 프로게이머 복귀자', '약초·요리로 먹고사는 비전투직',
      '버그를 발견한 디버거형 플레이어', '죽으면 끝인 줄 모르고 막 굴리던 초보', '랭킹 1위를 빼앗긴 전 챔피언', '동료를 잃고 솔로잉을 택한 생존자',
    ],
  },
  {
    key: 'goal', label: '단기 목표', hint: '목표 위계: 다음 레벨·던전·보스·랭킹이 동시에 굴러간다(§2)',
    options: [
      '다음 레벨까지 경험치를 채우려', '히든 퀘스트를 발견하려', '보스의 첫 클리어 보너스를 차지하려', '유니크 아이템을 손에 넣으려',
      '전직 조건을 충족하려', '강화를 +10까지 성공시키려', '랭킹 한 자릿수에 진입하려', '파티원을 전멸 위기에서 구하려',
      '시스템의 정체를 한 조각이라도 알아내려', '회귀 전 자신을 죽인 자를 추적하려', '게이트가 브레이크되기 전에 닫으려', '드랍률 0.1% 재료를 파밍하려',
      '무시하던 길드장에게 실력을 증명하려', '죽지 않고 이 층을 빠져나가려', '히든 클래스 칭호를 해금하려', '동료의 시신을 부활 제단까지 옮기려',
    ],
  },
  {
    key: 'mechanic', label: '발동 장치', hint: '서사 진행 엔진=게임 규칙(§0·§3)',
    options: [
      '레벨업 — 잉여 스탯 포인트 배분 선택', '히든 스킬 습득 조건이 충족됨', '드랍 판정(RNG) — 확률이 긴장을 만든다', '강화 성공/실패 판정',
      '칭호 획득(최초 달성 First Clear 보너스)', '버프/디버프·상태이상(중독·출혈·기절) 발생', 'MP/스태미나 고갈 — 자원관리의 한계', '쿨다운에 막힌 강력기',
      '퀘스트 분기(메인/히든/연계)가 갈림', '세트 아이템 효과·시너지 발동', '전투 로그·딜미터 출력', '경험치/아이템 손실을 동반한 죽음·리스폰',
      '시스템(안내자 AI)이 비밀 한 조각을 흘림', '회귀/원작지식으로 결과를 미리 앎', '히든 클래스·유니크 스킬 단독 보유 판명', '인벤토리·무게/슬롯 제한이 발목을 잡음',
    ],
  },
  {
    key: 'obstacle', label: '장애·난관', hint: '공정성: 규칙 안에서의 위기(§2)',
    options: [
      '예상보다 강한 네임드가 패턴을 바꾼다', '믿었던 파티원이 아이템을 노리고 배신한다', '강화가 연속 실패해 장비가 박살 난다', '상태이상이 겹쳐 행동 불능이 된다',
      'MP가 바닥나 마지막 한 방을 못 쓴다', '히든 보스의 즉사기에 파티가 전멸 직전이다', '다른 랭커 길드가 보스를 가로챈다', '죽으면 끝인데 부활 수단이 없다',
      '퀘스트 제한 시간이 거의 다 됐다', '인벤토리가 가득 차 핵심 재료를 못 줍는다', '버그/사기 유저가 판을 뒤엎는다', '게이트가 곧 브레이크되어 몬스터가 현실로 쏟아진다',
      '회귀 전과 다른 변수가 미래 지식을 무력화한다', '시스템이 불공정해 보이는 페널티를 부과한다', 'PK 무리가 길목을 막고 통행세를 요구한다', '클리어 조건이 동료 중 하나의 희생을 요구한다',
    ],
  },
  {
    key: 'turn', label: '역전·전환', hint: '클라이맥스 3박자: 패턴 파악→전멸 위기→역전 변수(§5)',
    options: [
      '죽기 직전 "조건 충족: [○○] 발동" 한계 돌파', '숨겨둔 회귀 지식으로 보스 패턴을 간파한다', '히든 스킬이 각성하며 판도를 뒤집는다', '운 좋은 크리티컬 한 방이 터진다',
      '아껴둔 일회용 유니크 아이템을 개봉한다', '시스템이 예고 없이 새 퀘스트를 부여한다', '동료의 희생으로 시간을 벌어낸다', '드랍률 0.1%가 결정적 순간에 터진다',
      '디버프가 역이용 가능한 약점임을 깨닫는다', '쿨다운이 한 박자 먼저 돌아온다', '세트 효과가 마지막 슬롯에서 완성된다', '시스템(안내자)이 결정적 힌트를 흘린다',
      '게이트 코어를 부숴 몬스터를 일소한다', '랭킹 보드가 실시간으로 뒤집힌다', '죽음을 가장한 함정으로 적을 끌어들인다', '전직이 즉석에서 완료되며 상위 스킬이 열린다',
    ],
  },
  {
    key: 'reward', label: '보상·결과', hint: '코어 루프의 보상감: 성장·드랍·다음 목표(§2)',
    options: [
      '레벨이 올라 새 스탯 포인트를 얻는다', '에픽·유니크 등급 아이템을 드랍한다', '히든 클래스로의 전직 자격을 해금한다', '최초 클리어(First Clear) 칭호를 받는다',
      '스킬이 상위 스킬로 진화·각성한다', '랭킹이 수직 상승해 명성이 오른다', '시스템 비밀의 한 조각(떡밥)을 손에 쥔다', '거액의 게임 재화를 현실 가치로 환산한다',
      '세트 아이템 마지막 조각을 완성한다', '다음 지역·다음 층으로 가는 게이트가 열린다', '무시하던 자들이 태도를 바꾼다(사이다)', '강화 +10에 성공해 옵션이 폭등한다',
      '히든 퀘스트가 연계 퀘스트로 이어진다', '동료를 부활시키고 길드 신뢰를 얻는다', '드랍 재료로 유니크 장비를 제작한다', '시스템이 "특이 사용자"로 기록·주목한다',
    ],
  },
  {
    key: 'tone', label: '톤·연출', hint: '페이싱 황금비: 쾌감 70 : 완급 30(§4)',
    options: [
      '숨 막히는 전멸 직전의 긴장', '압도적 성과로 갚아주는 사이다', '루팅 개봉의 두근거림(unboxing)', '수치가 치솟는 성장의 쾌감',
      '시스템 메시지가 호흡을 끊는 팝업 연출', '회귀자만 아는 정보 비대칭의 여유', '데스게임 특유의 죽음의 무게', '빌드·시너지를 짜는 머리싸움',
      '랭킹·평판이 걸린 경쟁의 열기', '안전지대의 짧은 휴식과 동료애', '시스템 배후를 향한 불길한 의혹', '강화 도박의 아찔한 손맛',
      '파밍 노가다의 묵묵한 성실함', '히든 피스를 끼워 맞추는 추리의 쾌감',
    ],
  },
  {
    key: 'systemMsg', label: '시스템 메시지 소재', hint: '본문 삽입용 팝업 텍스트(§3)',
    options: [
      '레벨 업! Lv.{n} 달성 — 잔여 스탯 포인트 +5', '스킬 [{skill}] 습득 — 등급: 유니크', '칭호 획득: [{title}] — 최초 달성 보너스 적용',
      '경고: 치명적 상태이상 [출혈] — HP 지속 감소', '조건 충족 — 한계 돌파 [{skill}] 발동 가능', '드랍 판정 성공(0.1%) — [{item}] 획득',
      '강화 실패… 장비 [{item}] 내구도 -50', '히든 퀘스트 발생: [{quest}] — 수락하시겠습니까?', '전직 자격 충족 — [{class}](으)로 전직하시겠습니까?',
      '게이트 붕괴까지 03:00 — 코어를 파괴하십시오', '특이 사용자로 등록되었습니다 — 관측 시작', '파티원 [동료] 사망 — 부활까지 12:00:00',
      '퀘스트 [{quest}] 완료 — 보상: 경험치 +120,000', '연계 발견: 스킬 [{skill}] + 칭호 [{title}] 시너지 개방',
    ],
  },
]

// 슬롯 메시지 토큰 치환용 풀(자작 데이터)
const FILLERS = {
  skill: ['그림자 칼날', '심연의 손길', '파멸의 일격', '시간 역행', '강철 피부', '무자비한 연격', '영혼 흡수', '천둥 강타'],
  title: ['던전 최초 정복자', '용을 벤 자', '랭킹 파괴자', '시스템의 변수', '불사의 생존자', '심연을 본 자'],
  item: ['심연의 흑검', '불멸자의 반지', '용린 갑주', '시간을 멈추는 모래시계', '영웅의 인장', '저주받은 성배'],
  quest: ['사라진 길드의 비밀', '봉인된 탑의 주인', '배신자의 정체', '잊힌 신의 유물'],
  class: ['그림자 군주', '심연의 사도', '시간 술사', '룬 대장장이', '데스나이트'],
  n: ['37', '50', '99', '120', '7', '23'],
}

// 조합수 — 분기 × 모든 슬롯(시스템 메시지 토큰 변형은 추가 가산이라 보수적으로 슬롯만 계산)
const SLOT_COMBOS = SLOTS.reduce((n, s) => n * s.options.length, 1)
const TOTAL_COMBOS = SLOT_COMBOS * BRANCHES.length

function randIdx(n: number) { return Math.floor(Math.random() * n) }
function pick<T>(arr: T[]): T { return arr[randIdx(arr.length)] }

// 한글 받침 판정 → 조사 자동 선택(괄호 이중표기 금지)
function hasJong(word: string): boolean {
  const m = word.match(/[가-힣]\)?$/) // 끝 글자(닫는 괄호는 무시)
  const ch = (m ? m[0] : word).replace(/[^가-힣]/g, '').slice(-1)
  if (!ch) return false
  return (ch.charCodeAt(0) - 0xac00) % 28 !== 0
}
// 받침 있으면 첫 번째(은/이/을/과), 없으면 두 번째(는/가/를/와)
function josa(word: string, withJong: string, noJong: string): string {
  return word + (hasJong(word) ? withJong : noJong)
}

// 시스템 메시지 토큰 치환
function fillSystemMsg(template: string): string {
  const filled = template
    .replace('{n}', pick(FILLERS.n))
    .replace('{skill}', pick(FILLERS.skill))
    .replace('{title}', pick(FILLERS.title))
    .replace('{item}', pick(FILLERS.item))
    .replace('{quest}', pick(FILLERS.quest))
    .replace('{class}', pick(FILLERS.class))
  // '(으)로' 이중표기 제거: 닫는 괄호 앞 글자의 받침을 보고 실제 조사만 출력
  return filled.replace(/(\S)(\]?)\(으\)로/g, (_m, prev: string, br: string) =>
    prev + br + (hasJong(prev) ? '으로' : '로'))
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

interface Persisted { picks: Record<string, number>; locked: Record<string, boolean>; branch: number }

export default function LitrpgSceneForge({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 활용: 다른 장르로 열리면 안내(이 도구는 게임판타지·LitRPG 특화)
  const payloadGenre = typeof payload?.genre === 'string' ? (payload.genre as string) : ''

  const [branch, setBranch] = useState<number>(0)
  const [picks, setPicks] = useState<Record<string, number>>(() => Object.fromEntries(SLOTS.map((s) => [s.key, randIdx(s.options.length)])))
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [sysSeed, setSysSeed] = useState(0) // 시스템 메시지 토큰 재생성 트리거
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState('')
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // localStorage 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const p = JSON.parse(raw) as Partial<Persisted>
        if (p.picks) setPicks((cur) => ({ ...cur, ...p.picks }))
        if (p.locked) setLocked(p.locked)
        if (typeof p.branch === 'number' && p.branch >= 0 && p.branch < BRANCHES.length) setBranch(p.branch)
      }
    } catch { /* noop */ }
  }, [])

  // localStorage 저장(잠금/분기/픽 — 마지막 상태 기억)
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ picks, locked, branch } as Persisted)) } catch { /* 용량 초과 등 무시 */ }
  }, [picks, locked, branch])

  // 언마운트 정리(타이머)
  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current)
    if (copyTimer.current) clearTimeout(copyTimer.current)
  }, [])

  const rollAll = useCallback(() => {
    setPicks((p) => Object.fromEntries(SLOTS.map((s) => [s.key, locked[s.key] ? p[s.key] : randIdx(s.options.length)])))
    setSysSeed((x) => x + 1)
  }, [locked])
  const rollOne = useCallback((k: string) => {
    setPicks((p) => ({ ...p, [k]: randIdx(SLOTS.find((s) => s.key === k)!.options.length) }))
    if (k === 'systemMsg') setSysSeed((x) => x + 1)
  }, [])
  const toggleLock = useCallback((k: string) => setLocked((l) => ({ ...l, [k]: !l[k] })), [])

  const val = useCallback((k: string) => SLOTS.find((s) => s.key === k)!.options[picks[k]], [picks])
  const br = BRANCHES[branch]

  // 시스템 메시지(토큰 치환) — picks/sysSeed에 따라 안정적으로 재계산
  const systemLine = useMemo(() => fillSystemMsg(val('systemMsg')), [val, sysSeed]) // eslint-disable-line react-hooks/exhaustive-deps

  // 장면 산문(전개법 적용: 무대·인물·목표 → 발동 장치 → 난관 → 역전 → 보상 → 톤)
  const sceneText = useMemo(() => {
    return (
      `[${br.label}] ${val('place')}. ${josa(val('pov'), '은', '는')} ${val('goal')} 한다. ` +
      `장면 유형은 「${val('sceneType')}」. ` +
      `${val('mechanic')} — 그러나 ${val('obstacle')}. ` +
      `위기의 순간, ${val('turn')}. ` +
      `그 결과 ${val('reward')}. ` +
      `(톤: ${val('tone')})`
    )
  }, [val, branch]) // eslint-disable-line react-hooks/exhaustive-deps

  const sceneTitle = useMemo(() => `${val('pov')} · ${val('sceneType')}`, [val])

  // 클립보드용 전문(시스템 메시지 박스 포함)
  const fullText = useMemo(() => (
    `${sceneText}\n\n${br.systemVoice} ${systemLine}\n\n· 분기 금기: ${br.taboo}`
  ), [sceneText, systemLine, br])

  const flash = (m: string) => {
    setSaved(m)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaved(''), 1600)
  }
  const copy = () => {
    navigator.clipboard?.writeText(fullText).then(() => {
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 1400)
    }).catch(() => {})
  }

  // ── 연계 ──
  const toProject = () => {
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '장면',
      title: sceneTitle,
      bodyHtml: `<p>${esc(sceneText)}</p>` +
        `<blockquote><b>${esc(br.systemVoice)}</b> ${esc(systemLine)}</blockquote>` +
        `<p><i>분기 금기: ${esc(br.taboo)}</i></p>`,
      synopsis: sceneText,
      meta: { 분기: br.label, 장면유형: val('sceneType'), 무대: val('place'), 톤: val('tone') },
    })
    flash(id ? '프로젝트 원고 「장면」에 추가됨' : '프로젝트에 연결되어 있지 않습니다')
  }
  const toSnippet = () => {
    addToLibrary('snippets', { text: fullText, source: 'LitRPG 장면 생성기', tags: ['장면', 'LitRPG', br.label] })
    flash('스니펫으로 저장')
  }
  const toLibPlace = () => {
    addToLibrary('places', {
      name: val('place'), kind: 'LitRPG 무대', mood: val('tone'), notes: sceneText, source: 'LitRPG 장면 생성기',
      // 정규(표준) 키로 매핑 — 받는 허브(배경 설정집)의 기본 칸에 제자리로 들어가게
      fields: {
        name: val('place'),
        kind: 'LitRPG 무대',
        atmosphere: val('tone'),
        notes: sceneText,
      },
    })
    flash('배경 라이브러리에 무대 저장')
  }

  // 관련 도구(장면·세계관·인물 계통)
  const RELATED: { id: string; label: string }[] = [
    { id: 'scene-list', label: '📋 장면 목록' },
    { id: 'scene-forge', label: '🎬 일반 장면 생성기' },
    { id: 'plot-pyramid', label: '🔺 플롯 피라미드' },
    { id: 'character-sheet', label: '🪪 인물 시트' },
  ]
  const toSceneList = () => {
    openToolLinked('scene-list', { scene: { title: sceneTitle, summary: sceneText, pov: val('pov'), place: val('place'), goal: val('goal'), conflict: val('obstacle'), mood: val('tone') } })
    flash('장면 목록으로 보냄')
  }

  // ── 스타일 ──
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)', overflow: 'auto' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        조합 가능 장면 <b style={{ color: 'var(--accent)' }}>{TOTAL_COMBOS.toLocaleString()}</b>가지(분기×슬롯, 시스템 메시지 변형 별도).
        분기를 고르고 슬롯을 <Emoji e="🔒"/> 잠근 뒤 <Emoji e="🎲"/>로 나머지만 굴려 원하는 장면을 찾으세요.
        {payloadGenre && payloadGenre !== meta.genre && (
          <span style={{ color: 'var(--warn, #c97a3a)' }}> · 전달된 장르: {payloadGenre}(이 도구는 게임판타지·LitRPG 특화)</span>
        )}
      </div>

      {/* 분기 선택 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {BRANCHES.map((b, i) => (
          <button
            key={b.key}
            className={i === branch ? 'btn-primary' : 'minibtn'}
            onClick={() => setBranch(i)}
            title={b.blurb}
            style={{ fontSize: 12 }}
          >
            <Emoji e={b.icon}/> {b.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, padding: '0 2px' }}>
        {br.blurb}<br /><span style={{ color: 'var(--warn, #c97a3a)' }}><Emoji e="⚠"/> 금기: {br.taboo}</span>
      </div>

      {/* 생성 결과 */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 14.5, lineHeight: 1.65 }}>
        {sceneText}
      </div>

      {/* 시스템 메시지 박스(장르 특유 팝업 연출) */}
      <div style={{
        background: 'var(--panel)', border: '1px dashed var(--accent)', borderRadius: 8,
        padding: '8px 10px', fontSize: 13, fontFamily: 'ui-monospace, Menlo, Consolas, monospace', lineHeight: 1.6,
      }}>
        <b style={{ color: 'var(--accent)' }}>{br.systemVoice}</b> {systemLine}
      </div>

      {/* 슬롯들 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SLOTS.map((s) => (
          <div key={s.key} style={{ ...card, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', width: 88, flexShrink: 0 }} title={s.hint}>{s.label}</span>
            <span style={{ flex: 1, fontSize: 12.5, minWidth: 0 }}>{s.options[picks[s.key]]}</span>
            <button className="minibtn" title={locked[s.key] ? '잠금 해제' : '이 슬롯 잠금'} onClick={() => toggleLock(s.key)} style={{ color: locked[s.key] ? 'var(--accent)' : 'var(--muted)' }}>{locked[s.key] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
            <button className="minibtn" title="이 슬롯만 다시" onClick={() => rollOne(s.key)} disabled={locked[s.key]}><Emoji e="🎲"/></button>
          </div>
        ))}
      </div>

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={rollAll}><Emoji e="🎲"/> 장면 생성</button>
        <button className="minibtn" onClick={() => setSysSeed((x) => x + 1)} title="시스템 메시지 토큰만 다시"><Emoji e="🔄"/> 시스템 메시지</button>
        <button className="minibtn" onClick={copy}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
      </div>

      {/* 연계 */}
      <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '현재 장면을 프로젝트 원고에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 장면 추가</button>
        <button className="linkbtn" onClick={toSnippet}><Emoji e="📥"/> 스니펫 저장</button>
        <button className="linkbtn" onClick={toLibPlace}><Emoji e="🏞"/> 무대 저장</button>
        <button className="linkbtn" onClick={toSceneList}><Emoji e="📋"/> 장면 목록으로</button>
        {RELATED.filter((r) => r.id !== 'scene-list').map((r) => (
          <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: meta.genre })}>{emojify(r.label)}</button>
        ))}
      </div>
      {saved && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>✓ {saved}</div>}
    </div>
  )
}
