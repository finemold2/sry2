// 스릴러·서스펜스 갈등·딜레마 생성기(ThrillerConflictForge)
//  - 이 장르 고유의 갈등 구도를 슬롯 조합으로 무작위 생성한다(완전 로컬, 외부 API 없음).
//  - 슬롯별 🔒 잠금 + 🎲 부분 재생성, 전체 조합수 표시(1조 이상 지향).
//  - 도시에 근거한 장르 특화 자작 데이터: 압박 주인공·정보 비대칭·티킹클락·맥거핀·배신·도덕적 딜레마 등.
//  - CRUD: 생성한 갈등을 localStorage 'sry:tool:thriller-conflictforge' 에 저장/수정/삭제, 언마운트 정리.
//  - 연계(linkbus): 프로젝트 '갈등' 폴더에 문서 추가 / 스니펫 저장 / 관련 도구 열기. payload.genre 활용.
import { useEffect, useMemo, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'thriller-conflictforge',
  name: '스릴러 갈등·딜레마 단조기',
  icon: '🩸',
  group: '생성기',
  genre: '스릴러·서스펜스',
  intro: '압박·시한·배신·도덕적 딜레마를 조합해 스릴러다운 갈등 구도를 무작위 생성',
  w: 560,
  h: 660,
}

// ────────────────────────────────────────────────────────────────────────────
// 슬롯 정의 — 스릴러·서스펜스 도시에에 근거한 장르 특화 풀.
//   protagonist : 유능하지만 취약한 주인공(도시에 §2)
//   antagonist  : 한발 앞선 만만찮은 적대자(도시에 §2)
//   wantNeed    : 주인공이 지켜내려는 것 / 추적하는 것
//   ticking     : 티킹 클락(명시·자연·사회적 마감, 도시에 §3)
//   pressure    : 끊임없는 위협·압박 장치(도시에 §2,§3)
//   asymmetry   : 정보 비대칭 — 누가 무엇을 아는가(도시에 §3 핵심)
//   betrayal    : 잘못된 신뢰 / 거짓 동맹(도시에 §3)
//   dilemma     : 둘 다 가질 수 없는 도덕적 선택(도시에 §4,§5)
//   cost        : 실패의 구체적·되돌릴 수 없는 대가(도시에 §2)
//   device      : 장르 고유 서사 장치(맥거핀·체호프의 총·언리라이어블 등, 도시에 §3)
// ────────────────────────────────────────────────────────────────────────────
interface Slot { key: string; label: string; icon: string; hint: string; options: string[] }

const SLOTS: Slot[] = [
  {
    key: 'protagonist', label: '주인공', icon: '🎯',
    hint: '유능하지만 취약해야 긴장이 산다 — 약점·결함을 품은 추적자',
    options: [
      '정직 처분당한 강력계 형사',
      '기억의 빈 구멍을 가진 사건 생존자',
      '내부 고발을 준비하는 기업 회계사',
      '딸을 잃은 뒤 잠 못 드는 프로파일러',
      '은퇴를 하루 앞둔 베테랑 협상가',
      '약물에 손댄 적 있는 응급실 의사',
      '증인 보호 중 신분을 숨긴 전직 청부업자',
      '특종에 눈먼 무명 탐사기자',
      '오심으로 한 명을 보낸 적 있는 검사',
      '공황장애를 숨긴 항공 보안관',
      '빚에 쫓기는 사설 경비원',
      '아들의 알리바이가 깨진 평범한 가장',
      '청력을 잃어가는 음향 분석관',
      '전과를 세탁한 사회복지사',
      '동료의 죽음에 책임이 있는 잠입 수사관',
      '시한부 판정을 받은 법의학자',
      '도청에 능한 흥신소 직원',
      '딸의 휴대폰을 몰래 추적하는 어머니',
      '한 번의 거짓 증언으로 출세한 변호사',
      '불면과 환청에 시달리는 야간 경비',
    ],
  },
  {
    key: 'antagonist', label: '적대자', icon: '🕷️',
    hint: '주인공보다 한발 앞서고 정당해 보이는 이유를 가진 위협',
    options: [
      '수사 정보를 미리 빼내는 내부의 누군가',
      '피해자처럼 위장한 진짜 설계자',
      '법망 밖에서 처벌하는 자경 살인자',
      '제자를 조종하는 카리스마 사이코패스',
      '증거를 합법적으로 지워온 대기업 고문',
      '경찰 무전을 도청하는 모방범',
      '과거의 비밀을 쥔 옛 동료',
      '시민의 갈채를 받는 부패한 정치인',
      '완벽한 알리바이를 가진 이웃',
      '피해자 가족을 자처하는 협박범',
      '주인공의 약점을 정확히 아는 옛 연인',
      '규칙을 방패 삼는 무능한 상관',
      '아이를 인질로 협상하는 청부 조직',
      '진실을 봉인하려는 정보기관 요원',
      '온라인에 모든 걸 중계하는 감시자',
      '죽은 줄 알았던 형제',
      '병원 시스템을 장악한 내부자',
      '판사를 매수한 그림자 브로커',
      '얼굴 없는 협박 메일의 발신자',
      '주인공을 영웅으로 추켜세우는 진범',
    ],
  },
  {
    key: 'wantNeed', label: '걸린 목표', icon: '🧭',
    hint: '주인공이 지켜내거나 추적하는 것 — stakes의 출발점',
    options: [
      '납치된 아이를 산 채로 되찾는 것',
      '터지기 전에 진짜 표적을 알아내는 것',
      '누명을 벗고 자유를 되찾는 것',
      '사라진 증인을 먼저 찾는 것',
      '연쇄범의 다음 희생자를 막는 것',
      '봉인된 진실을 세상에 공개하는 것',
      '가족을 안전가옥까지 데려가는 것',
      '치명적 거래가 성사되기 전에 끊는 것',
      '죽은 자의 마지막 메시지를 해독하는 것',
      '내부의 첩자를 작전 전에 색출하는 것',
      '협박범의 정체를 24시간 안에 밝히는 것',
      '조작된 증거를 재판 전에 뒤집는 것',
      '도망친 진범을 국경 전에 붙잡는 것',
      '자신이 정말 범인인지 확인하는 것',
      '폭로 직전 살해된 동료의 자료를 지키는 것',
      '인질 협상을 무혈로 끝내는 것',
      '잃어버린 기억의 그날을 복원하는 것',
      '딸이 빠진 함정에서 그녀를 빼내는 것',
      '바이러스 유출원을 차단하는 것',
      '자백 영상이 퍼지기 전에 회수하는 것',
    ],
  },
  {
    key: 'ticking', label: '티킹 클락', icon: '⏳',
    hint: '명시·자연·사회적 마감 — 카운트다운이 긴장을 만든다',
    options: [
      '자정의 폭파 타이머',
      '동틀 녘 출항하는 마지막 배',
      '오전 10시 개정하는 재판',
      '약효가 떨어지는 여섯 시간',
      '밀물이 갱도를 채우기까지',
      '증인 보호가 만료되는 72시간',
      '생중계가 끝나는 카운트다운',
      '범인이 예고한 다음 희생까지 하루',
      '서버 로그가 자동 삭제되기 전',
      '협박범이 정한 송금 마감',
      '눈보라가 길을 막기 전',
      '인질의 산소가 바닥나는 시각',
      '신분이 들통나기까지의 한나절',
      '국경 검문이 강화되는 새벽',
      '투표가 마감되는 정오',
      '수술실 마취가 풀리기 전',
      '연료가 떨어지는 마지막 비행',
      '경찰 포위망이 좁혀오는 시간',
      '백신 접종 시한',
      '기억이 다시 지워지기 전',
    ],
  },
  {
    key: 'pressure', label: '압박 장치', icon: '🔪',
    hint: '페이지마다 위협을 느끼게 하는 상황 — 평온은 짧아야 한다',
    options: [
      '백미러에 계속 같은 차가 보인다',
      '집 안 물건이 미세하게 옮겨져 있다',
      '울리지 않던 전화가 갑자기 울린다',
      '믿을 수 있는 사람이 한 명도 없다',
      '도움을 청할수록 의심을 산다',
      '카메라가 모든 동선을 따라온다',
      '범인이 주인공의 일상을 꿰고 있다',
      '도시 전체가 그를 범인으로 안다',
      '한 발짝 늦을 때마다 시체가 늘어난다',
      '경찰이 그를 쫓는 동시에 진범도 쫓는다',
      '구조 신호가 적에게도 닿는다',
      '잠긴 방 안에서 빠져나갈 길이 없다',
      '정전으로 모든 보안이 무력화된다',
      '거짓말이 한 겹씩 들통나기 시작한다',
      '주인공의 약이 누군가 바꿔치기됐다',
      '도청기가 어딘가에 숨어 있다',
      '협조자가 차례로 입을 다문다',
      '증거가 손에 들어올 때마다 사라진다',
      '추격을 피할수록 함정 깊숙이 들어간다',
      '아무도 그의 말을 믿지 않는다',
    ],
  },
  {
    key: 'asymmetry', label: '정보 비대칭', icon: '🎭',
    hint: '누가 무엇을 아는가 — 서스펜스의 핵심 설계(독자>인물 등)',
    options: [
      '독자만 폭탄의 위치를 안다',
      '주인공은 동맹을, 독자는 그가 적임을 안다',
      '범인은 알고 주인공은 모르는 함정이 있다',
      '주인공이 쫓는 단서가 사실 미끼다',
      '독자도 주인공도 진범을 모른다',
      '주인공만 진실을 알지만 아무도 안 믿는다',
      '적은 주인공의 다음 수를 미리 읽는다',
      '피해자가 가해자를 알면서 침묵한다',
      '두 시간선이 같은 비밀을 향해 좁혀진다',
      '주인공의 기억이 결정적 한 조각만 비었다',
      '독자만 조력자의 배신을 눈치챈다',
      '주인공은 무죄를 알지만 증명할 길이 없다',
      '범인이 수사 회의에 함께 앉아 있다',
      '주인공이 본 것을 본인만 사실로 안다',
      '같은 단서가 재독에서 정반대로 읽힌다',
      '독자는 카운트다운을, 인물은 모른다',
      '진실은 거의 다 모였고 한 조각이 없다',
      '적이 주인공을 영웅으로 믿게 만든다',
      '두 인물이 서로를 범인으로 의심한다',
      '주인공만 죽은 자의 메시지를 해독했다',
    ],
  },
  {
    key: 'betrayal', label: '잘못된 신뢰', icon: '🤝',
    hint: '조력자가 배신자, 권위자가 흑막 — 믿을 사람이 없다는 편집증',
    options: [
      '믿었던 파트너가 적에게 정보를 넘긴다',
      '권위 있는 멘토가 사건의 설계자였다',
      '구해준 사람이 가해자였다',
      '가족 중 한 명이 거짓말을 하고 있다',
      '제보자가 사실은 함정을 깔았다',
      '같은 편 요원이 이중 첩자다',
      '주인공을 돕던 변호사가 매수됐다',
      '가장 가까운 이가 진범이다',
      '경찰 내부에 적의 눈과 귀가 있다',
      '죽은 줄 알았던 동료가 적이 되어 돌아온다',
      '연인이 처음부터 임무로 접근했다',
      '주인공이 신뢰한 기록이 조작됐다',
      '구조대 안에 범인이 섞여 있다',
      '증인이 돈을 받고 진술을 바꾼다',
      '상관이 사건을 의도적으로 덮는다',
      '의사가 환자를 실험 대상으로 삼았다',
      '가장 의심 없던 이웃이 감시자였다',
      '주인공의 정보원이 적의 끄나풀이다',
      '같이 도망친 일행이 추적자를 부른다',
      '아군의 무전이 적에게 생중계된다',
    ],
  },
  {
    key: 'dilemma', label: '도덕적 딜레마', icon: '⚖️',
    hint: '둘 다 가질 수 없는 선택 — 승리에 대가가 따라야 한다',
    options: [
      '한 사람을 구하면 다수가 죽는다',
      '진실을 밝히면 가족이 무너진다',
      '범인을 잡으려면 규칙을 어겨야 한다',
      '딸을 살리려면 무고한 이를 희생해야 한다',
      '정의를 택하면 자신이 파멸한다',
      '비밀을 지키면 누군가 누명을 쓴다',
      '복수를 끝내면 자신도 괴물이 된다',
      '동료를 살리면 작전이 실패한다',
      '거래에 응하면 더 큰 악을 키운다',
      '증거를 쓰면 사랑하는 이가 드러난다',
      '신고하면 보호받던 이가 추방된다',
      '살리려 거짓말하면 신뢰를 잃는다',
      '시간을 벌려면 다른 인질을 포기해야 한다',
      '자수하면 진범이 영영 빠져나간다',
      '약속을 지키면 진실을 묻어야 한다',
      '도망치면 남은 자들이 대가를 치른다',
      '용서하면 정의가 무너진다',
      '폭로하면 무고한 다수가 다친다',
      '아이를 지키려 살인을 덮어야 한다',
      '한 발을 쏘면 두 생명이 갈린다',
    ],
  },
  {
    key: 'cost', label: '실패의 대가', icon: '💥',
    hint: '구체적이고 되돌릴 수 없어야 긴장이 산다',
    options: [
      '인질이 산 채로 묻힌다',
      '도시가 공황에 빠진다',
      '딸이 영영 사라진다',
      '진범이 영웅으로 남는다',
      '주인공이 살인범으로 기록된다',
      '진실이 영원히 봉인된다',
      '연쇄범이 다음 표적을 노린다',
      '내부 첩자가 작전을 무너뜨린다',
      '무고한 자가 사형장에 선다',
      '가족이 보복의 표적이 된다',
      '증거가 불타 재판이 무너진다',
      '바이러스가 도시로 퍼진다',
      '주인공이 자기 자신을 잃는다',
      '협박 영상이 전 세계에 풀린다',
      '마지막 증인이 입을 다문다',
      '아이가 적의 손에 자란다',
      '동료의 죽음이 헛되이 묻힌다',
      '주인공의 직위와 명예가 무너진다',
      '구조의 기회가 영영 닫힌다',
      '범인이 다시 일상으로 돌아간다',
    ],
  },
  {
    key: 'device', label: '서사 장치', icon: '🧩',
    hint: '맥거핀·체호프의 총·언리라이어블·레드헤링 등 장르 무기',
    options: [
      '맥거핀: 모두가 쫓는 USB 한 개',
      '체호프의 총: 초반에 스친 흉터가 결정적',
      '레드 헤링: 가장 유력한 용의자가 미끼',
      '언리라이어블 내레이터: 화자가 거짓을 섞는다',
      '이중 시점 교차: 지금과 그날이 맞물린다',
      '거짓 결말: 끝난 듯한 위협이 한 번 더 솟는다',
      '클리프행어: 폭로 직전에 장이 끊긴다',
      '콜드 오픈: 미래의 참극을 먼저 보여준다',
      '맥거핀: 누구도 본 적 없는 기밀 명단',
      '체호프의 총: 무심히 언급된 알레르기',
      '미스디렉션: 진짜 단서가 배경에 숨어 있다',
      '캣앤마우스: 범인과 추적자가 메시지를 주고받는다',
      '시간선 분절: 사건이 거꾸로 풀린다',
      '단서의 이중 기능: 같은 사실이 재독에 뒤집힌다',
      '스팅어: 마지막 한 줄이 모든 걸 뒤엎는다',
      '도메스틱 언캐니: 안전한 집이 위협의 근원',
      '맥거핀: 사라진 검은 가방',
      '체호프의 총: 잠금장치 비밀번호의 의미',
      '신뢰할 수 없는 기록: 영상이 편집됐다',
      '카운트-인 공개: 한 조각씩만 진실이 새어 나온다',
    ],
  },
]

// 전체 조합수 — 1조 이상 지향(20^10 ≈ 1.02e13).
const COMBOS = SLOTS.reduce((n, s) => n * s.options.length, 1)

const LS_KEY = 'sry:tool:thriller-conflictforge'

interface Saved { id: string; picks: Record<string, number>; text: string; createdAt: number }

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function randIdx(n: number): number { return Math.floor(Math.random() * n) }
function esc(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

// 조합수 한국어 표기(만/억/조 단위) — 규모를 직관적으로.
function bigKo(n: number): string {
  const jo = 1e12, eok = 1e8, man = 1e4
  if (n >= jo) return (n / jo).toFixed(n >= jo * 10 ? 0 : 1).replace(/\.0$/, '') + '조'
  if (n >= eok) return (n / eok).toFixed(n >= eok * 10 ? 0 : 1).replace(/\.0$/, '') + '억'
  if (n >= man) return Math.round(n / man).toLocaleString() + '만'
  return n.toLocaleString()
}

function loadSaved(): Saved[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const p = JSON.parse(raw)
    const arr = Array.isArray(p) ? p : Array.isArray(p?.list) ? p.list : []
    return arr.filter((x: any) => x && typeof x === 'object' && x.picks).map((x: any) => ({
      id: String(x.id || newId()),
      picks: x.picks && typeof x.picks === 'object' ? x.picks : {},
      text: String(x.text || ''),
      createdAt: Number(x.createdAt) || Date.now(),
    }))
  } catch { return [] }
}

export default function ThrillerConflictForge({ payload }: { payload?: Record<string, unknown> }) {
  const genreFromPayload = typeof payload?.genre === 'string' ? (payload.genre as string) : ''
  const isThriller = !genreFromPayload || genreFromPayload.includes('스릴러') || genreFromPayload.includes('서스펜스')

  const [picks, setPicks] = useState<Record<string, number>>(() => Object.fromEntries(SLOTS.map((s) => [s.key, randIdx(s.options.length)])))
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [list, setList] = useState<Saved[]>(() => loadSaved())
  const [flash, setFlash] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 저장 목록 영속.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)) } catch { /* 용량초과 등 무시 */ }
  }, [list])

  // 토스트 자동 소거(언마운트 정리 포함).
  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => { if (mounted.current) setFlash('') }, 1600)
    return () => window.clearTimeout(t)
  }, [flash])

  const val = (k: string) => SLOTS.find((s) => s.key === k)!.options[picks[k]]

  const rollAll = () => setPicks((p) => Object.fromEntries(SLOTS.map((s) => [s.key, locked[s.key] ? p[s.key] : randIdx(s.options.length)])))
  const rollOne = (k: string) => { if (locked[k]) return; setPicks((p) => ({ ...p, [k]: randIdx(SLOTS.find((s) => s.key === k)!.options.length) })) }
  const toggleLock = (k: string) => setLocked((l) => ({ ...l, [k]: !l[k] }))

  // 갈등 구도 산문 — 슬롯을 스릴러다운 한 문단으로 조립.
  const conflictText = useMemo(() => {
    const p = val('protagonist'), a = val('antagonist'), w = val('wantNeed'), t = val('ticking')
    const pr = val('pressure'), as = val('asymmetry'), b = val('betrayal'), d = val('dilemma')
    const c = val('cost'), dev = val('device')
    return (
      `${p}는 ${w}을(를) 두고 ${a}와(과) 맞선다. ` +
      `시간은 ${t}까지뿐이고, ${pr}. ` +
      `정보의 무게는 어긋나 있다 — ${as}. ` +
      `결정적 순간, ${b}. ` +
      `그는 선택을 강요받는다: ${d}. 실패하면 ${c}. ` +
      `(장치: ${dev})`
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks])

  const logline = useMemo(() => `${val('protagonist')} vs ${val('antagonist')} — ${val('ticking')} 안에 ${val('wantNeed')}`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [picks])

  const copy = (text: string, msg = '복사됨') => {
    const done = () => { if (mounted.current) setFlash(msg) }
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
    } catch { if (mounted.current) setFlash('복사 실패') }
  }

  // ── CRUD ──
  const saveCurrent = () => {
    const rec: Saved = { id: newId(), picks: { ...picks }, text: conflictText, createdAt: Date.now() }
    setList((prev) => [rec, ...prev])
    setFlash('갈등 구도 저장됨')
  }
  const loadOne = (s: Saved) => { setPicks({ ...s.picks }); setConfirmDel(null); setFlash('불러옴') }
  const remove = (id: string) => { setList((prev) => prev.filter((x) => x.id !== id)); setConfirmDel(null) }

  // ── 연계(linkbus) ──
  const bodyHtml = () => {
    const rows: [string, string][] = [
      ['🎯 주인공', val('protagonist')],
      ['🕷️ 적대자', val('antagonist')],
      ['🧭 걸린 목표', val('wantNeed')],
      ['⏳ 티킹 클락', val('ticking')],
      ['🔪 압박 장치', val('pressure')],
      ['🎭 정보 비대칭', val('asymmetry')],
      ['🤝 잘못된 신뢰', val('betrayal')],
      ['⚖️ 도덕적 딜레마', val('dilemma')],
      ['💥 실패의 대가', val('cost')],
      ['🧩 서사 장치', val('device')],
    ]
    const parts = [`<p><b>로그라인:</b> ${esc(logline)}</p>`, `<p>${esc(conflictText)}</p>`]
    rows.forEach(([k, v]) => parts.push(`<p><b>${esc(k)}</b><br>${esc(v)}</p>`))
    return parts.join('')
  }
  const toProject = () => {
    if (!hasProjectBridge()) { setFlash('프로젝트에 연결되지 않았습니다'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '갈등',
      title: `스릴러 갈등 — ${val('protagonist')} vs ${val('antagonist')}`,
      bodyHtml: bodyHtml(),
      synopsis: logline,
      meta: {
        장르: '스릴러·서스펜스',
        주인공: val('protagonist'),
        적대자: val('antagonist'),
        티킹클락: val('ticking'),
        딜레마: val('dilemma'),
      },
    })
    setFlash(id ? '프로젝트 자료(갈등)에 추가됨' : '프로젝트 추가에 실패했어요')
  }
  const toSnippet = () => { addToLibrary('snippets', { text: conflictText, source: '스릴러 갈등 단조기', tags: ['스릴러', '갈등'] }); setFlash('스니펫으로 저장') }

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)', boxSizing: 'border-box' }
  const card: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }
  const slotRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }

  return (
    <div style={wrap}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        조합 가능 갈등 구도 <b style={{ color: 'var(--accent)' }}>{COMBOS.toLocaleString()}</b>가지
        <span style={{ color: 'var(--accent)' }}> (약 {bigKo(COMBOS)})</span>.
        슬롯을 <Emoji e="🔒"/> 잠그고 나머지만 <Emoji e="🎲"/> 돌려 원하는 구도를 찾으세요.
      </div>

      {!isThriller && (
        <div style={{ fontSize: 11.5, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px' }}>
          이 도구는 스릴러·서스펜스 전용입니다. 현재 프로젝트 장르: <b>{genreFromPayload}</b> — 결과는 스릴러 관습으로 생성됩니다.
        </div>
      )}

      {/* 로그라인 + 갈등 구도 산문 */}
      <div style={card}>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}><Emoji e="🪝"/> 로그라인</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.55, marginBottom: 10 }}>{logline}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}><Emoji e="📝"/> 갈등 구도</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.65 }}>{conflictText}</div>
      </div>

      {/* 슬롯들 */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SLOTS.map((s) => (
          <div key={s.key} style={slotRow}>
            <span style={{ fontSize: 14, width: 18, flexShrink: 0, textAlign: 'center' }} title={s.hint}><Emoji e={s.icon}/></span>
            <span style={{ fontSize: 11, color: 'var(--muted)', width: 76, flexShrink: 0 }}>{s.label}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.4 }}>{s.options[picks[s.key]]}</span>
            <button className="minibtn" title={locked[s.key] ? '잠금 해제' : '이 슬롯 잠금'} onClick={() => toggleLock(s.key)} style={{ color: locked[s.key] ? 'var(--accent)' : 'var(--muted)' }}><Emoji e={locked[s.key] ? '🔒' : '🔓'}/></button>
            <button className="minibtn" title="이 슬롯만 다시" onClick={() => rollOne(s.key)} disabled={locked[s.key]}><Emoji e="🎲"/></button>
          </div>
        ))}
      </div>

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={rollAll}><Emoji e="🎲"/> 갈등 생성</button>
        <button className="minibtn" onClick={() => copy(conflictText, '갈등 복사됨')}><Emoji e="📋"/> 본문 복사</button>
        <button className="minibtn" onClick={() => copy(logline, '로그라인 복사됨')}><Emoji e="🪝"/> 로그라인 복사</button>
        <button className="minibtn" onClick={saveCurrent}><Emoji e="💾"/> 저장</button>
      </div>

      {/* 연계 */}
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '현재 갈등을 프로젝트 자료(갈등 폴더)에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={toSnippet}><Emoji e="📥"/> 스니펫 저장</button>
        <button className="linkbtn" onClick={() => openToolLinked('conflict-builder', { genre: '스릴러·서스펜스', desire: val('wantNeed'), obstacle: val('antagonist'), stakes: val('cost') })}><Emoji e="⚔️"/> 갈등 설계기</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck', { genre: '스릴러·서스펜스' })}><Emoji e="🃏"/> 반전 카드</button>
        <button className="linkbtn" onClick={() => openToolLinked('scene-forge', { genre: '스릴러·서스펜스' })}><Emoji e="🎬"/> 장면 생성기</button>
      </div>

      {flash && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>✓ {flash}</div>}

      {/* 저장 목록(CRUD) */}
      {list.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}><Emoji e="💾"/> 저장된 갈등 ({list.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflow: 'auto' }}>
            {list.map((s) => {
              const title = `${s.picks.protagonist != null ? SLOTS[0].options[s.picks.protagonist] : ''} vs ${s.picks.antagonist != null ? SLOTS[1].options[s.picks.antagonist] : ''}`
              return (
                <div key={s.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', background: 'var(--panel)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
                    <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => loadOne(s)} title="이 구도 불러오기">↩ 불러오기</button>
                    <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => copy(s.text, '복사됨')} title="복사"><Emoji e="📋"/></button>
                    <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={() => setConfirmDel(s.id)} title="삭제"><Emoji e="🗑️"/></button>
                  </div>
                  {confirmDel === s.id && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--warn)' }}>삭제할까요?</span>
                      <button className="btn-primary" style={{ padding: '2px 8px', fontSize: 11, background: 'var(--warn)' }} onClick={() => remove(s.id)}>삭제</button>
                      <button className="minibtn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => setConfirmDel(null)}>취소</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
