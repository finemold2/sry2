// 스릴러 시놉시스 빌더 — 스릴러·서스펜스 장르 관습(티킹 클락·정보 비대칭·반전·에스컬레이션)에
//   맞춘 슬롯을 굴려 한 편의 시놉시스를 자동 종합한다.
//   슬롯 풀 무작위(🔒 잠금/재생성) + 총 조합수 표시(1조 이상). 완성본은 복사/스니펫 저장/
//   프로젝트 자료 〈기획〉 폴더에 〈시놉시스〉 문서로 추가(addToProject). 관련 스릴러 도구로 연계.
//   자급식: 외부 네트워크·라이브러리 없음. react / './linkbus' 외 import 없음. localStorage 영속.
import { useState, useEffect, useCallback, useRef } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'thriller-synopsis',
  name: '스릴러 시놉시스 빌더',
  icon: '🕵️',
  group: '구조',
  genre: '스릴러·서스펜스',
  intro: '티킹 클락·반전·에스컬레이션을 갖춘 스릴러 시놉시스를 슬롯으로 종합(1조+ 조합)',
  w: 560,
  h: 680,
}

const LS = 'sry:tool:thriller-synopsis:'

// ── 슬롯 정의: 스릴러·서스펜스 관습에 근거한 자작 풀(구체적·장르 특화) ──────────────
interface Slot { key: string; label: string; icon: string; hint: string; pool: string[] }

const SLOTS: Slot[] = [
  {
    key: 'subgenre', label: '서브장르', icon: '🎭',
    hint: '시놉시스의 결을 결정 — 리걸·스파이·도메스틱·법의학 등',
    pool: [
      '도메스틱(심리) 스릴러', '리걸(법정) 스릴러', '정치·스파이 스릴러',
      '법의학·수사 스릴러', '액션·추적 스릴러', '테크노·생존 스릴러',
      '누아르·범죄 스릴러', '고딕·서스펜스', '미스터리 스릴러(후스더닛 혼종)',
      '호러 스릴러', '음모론·은폐 스릴러', '연쇄살인·프로파일링 스릴러',
    ],
  },
  {
    key: 'protagonist', label: '주인공(유능하나 취약)', icon: '🧑‍⚕️',
    hint: '무적 금지 — 다치고 속고 실수할 여지가 있어야 긴장이 산다',
    pool: [
      '불면증에 시달리는 전직 강력계 형사', '의뢰인의 거짓말을 직감하는 국선 변호사',
      '기억의 한 시간을 통째로 잃어버린 외상외과 의사', '내부고발 직전인 회계 감사관',
      '은퇴를 앞둔 검시관', '딸과 멀어진 위기협상가', '도청을 의심하는 정신과 상담사',
      '복역 후 출소한 전직 해커', '남편의 과거를 모르는 임신 8개월의 번역가',
      '익명 제보를 받은 탐사보도 기자', '망명자를 관리하던 정보기관 분석관',
      '실종 사건만 쫓는 사설탐정', '시한부 선고를 받은 폭발물 처리반원',
      '증인보호 프로그램에 들어간 전직 회계사', '딸의 학교 학부모회를 의심하는 워킹맘',
      '약물 의존을 숨긴 응급실 간호사', '아버지의 자살을 믿지 않는 법의학 대학원생',
    ],
  },
  {
    key: 'incident', label: '개입 사건(콜드 오픈)', icon: '⚡',
    hint: '되돌아갈 수 없는 선으로 끌고 가는 1막의 방아쇠',
    pool: [
      '한밤중 걸려 온 발신번호 없는 전화 한 통으로', '이웃집 지하실에서 발견된 낯선 신발 한 짝으로',
      '죽은 줄 알았던 사람이 보낸 소인 없는 엽서로', '자신의 이름이 적힌 유서가 배달되면서',
      '출근길 백미러에 매일 같은 차가 비치기 시작하면서', '아이의 그림에 그려진 본 적 없는 남자 때문에',
      '삭제했던 영상이 클라우드에 다시 나타나면서', '계약서에 적힌 자기 서명이 가짜임을 알아채면서',
      '동료의 자살로 위장된 타살 흔적을 발견하면서', '폭설로 고립된 산장에서 한 사람이 사라지면서',
      '응급실에 실려 온 환자가 자기 얼굴을 하고 있어서', '집에 돌아오니 모든 물건이 1센티씩 옮겨져 있어서',
      '의뢰받은 사건의 피해자가 자신의 옛 연인이어서', '봉인됐던 사건 파일이 익명으로 책상에 놓이면서',
      '딸의 휴대폰에서 자신을 협박하는 문자를 발견하면서', '장례식장에서 영정 속 인물과 눈이 마주치면서',
    ],
  },
  {
    key: 'goal', label: '주인공의 목표', icon: '🎯',
    hint: '능동적 추적형 서사의 추진력',
    pool: [
      '48시간 안에 진범을 밝혀 누명을 벗으려', '실종된 딸이 살아 있다는 증거를 찾으려',
      '폭로 전에 살해당한 동료의 자료를 복원하려', '재판 전날까지 결정적 증인을 살려 데려오려',
      '도시를 노린 테러의 표적을 알아내 막으려', '망명자를 안전가옥까지 무사히 인도하려',
      '자기 안의 사라진 한 시간에 무슨 일이 있었는지 밝히려', '가족을 인질범의 손에서 빼내려',
      '은폐된 의료사고의 진실을 세상에 알리려', '연쇄살인의 다음 희생자를 예측해 구하려',
      '협박범에게서 아이의 영상을 회수하려', '자신을 함정에 빠뜨린 내부의 배신자를 색출하려',
      '폭발물의 위치와 타이머를 찾아내려', '죽은 남편이 남긴 계좌의 비밀을 추적하려',
    ],
  },
  {
    key: 'antagonist', label: '적대자(한 발 앞선)', icon: '😈',
    hint: '스릴러의 질은 빌런의 질에 비례한다 — 똑똑하고 앞서야 한다',
    pool: [
      '주인공의 모든 동선을 미리 읽는 전직 동료', '법망 안에서 완벽한 알리바이를 세운 거물 변호사',
      '신원이 매번 바뀌는 청부 설계자', '피해자를 정성껏 고르는 의례형 연쇄살인범',
      '시민의 안전을 명분으로 감시망을 쥔 고위 관료', '가장 다정한 얼굴을 한 가족 구성원',
      '제도 안에 숨어 증거를 통제하는 내부 정보원', '죽음을 위장하고 배후에서 조종하는 흑막',
      '아이의 신뢰를 무기로 삼는 이웃', '정신과 기록을 인질로 잡은 상담의',
      '실종을 사고로 분식하는 부패한 수사관', '코드 한 줄로 도시를 멈출 수 있는 내부 해커',
      '피해자 행세를 하며 동정을 사는 진범', '권력 승계를 위해 과거를 지우는 가문의 후계자',
    ],
  },
  {
    key: 'tickingClock', label: '티킹 클락', icon: '⏳',
    hint: '명시 타이머 / 자연 마감 / 사회적 마감',
    pool: [
      '동트기 전까지', '재판 개정 종소리가 울리기 전에', '폭발물 타이머가 0이 되기 전에',
      '약효가 떨어져 기억이 닫히기 전에', '마지막 출항이 끊기기 전에', '투표 마감 자정 전까지',
      '인질 교환 시각이 지나기 전에', '다음 만조가 지하실을 삼키기 전에',
      '제보 기사가 인쇄에 넘어가기 전에', '망명 비행기가 이륙하기 전에',
      '연쇄살인범의 주기가 한 바퀴 돌기 전에', '폭설이 마지막 통신선을 끊기 전에',
      '항암 치료로 의식이 흐려지기 전에', '감청이 들통나 안전가옥이 노출되기 전에',
    ],
  },
  {
    key: 'asymmetry', label: '정보 비대칭(서스펜스)', icon: '🃏',
    hint: '독자>인물(서스펜스)·독자=인물(동행)·독자<인물(반전)의 의도적 설계',
    pool: [
      '독자만 범인의 정체를 미리 알아 “잡을 수 있나”로 긴장이 늘어지고',
      '독자와 주인공이 같은 속도로 단서를 쥐어 함께 추리하며',
      '주인공이 숨긴 진실을 독자조차 마지막까지 모른 채 끌려가고',
      '테이블 밑 폭탄을 독자만 알아 평범한 대화 한 장면이 고문이 되며',
      '두 시점이 엇갈려 한쪽이 아는 것을 다른 쪽은 모른 채 충돌하고',
      '독자가 거의 다 알 듯한데 결정적 한 조각만 끝까지 가려진 채',
      '신뢰할 수 없는 화자의 서술이 독자를 의도적으로 오도하며',
    ],
  },
  {
    key: 'midpointTwist', label: '중간점 반전', icon: '🔄',
    hint: '50% 부근의 판세 역전 — 가짜 승리 또는 진짜 위협의 실체',
    pool: [
      '구하려던 사람이 사실 모든 일의 설계자였음이 드러나고',
      '믿었던 조력자가 적과 한편이었다는 사실이 밝혀지며',
      '주인공이 쥔 결정적 증거가 처음부터 조작된 미끼였고',
      '죽었다던 인물이 살아서 배후를 움직이고 있었으며',
      '범인이라 믿었던 용의자가 또 다른 희생자였음이 드러나고',
      '사라진 한 시간 속 자신의 행적이 가장 끔찍한 진실이었으며',
      '추격해 온 적이 실은 자신을 보호하려던 사람이었고',
      '안전하다 믿던 장소가 처음부터 함정의 한가운데였으며',
    ],
  },
  {
    key: 'allIsLost', label: '절망의 순간(All Is Lost)', icon: '🕳️',
    hint: '75% 부근 — 조력자 상실·신뢰 붕괴, 최악의 조건',
    pool: [
      '유일한 증인이 입을 닫은 채 살해되고', '단 하나 남은 증거가 불타 사라지며',
      '믿었던 파트너의 배신으로 고립무원이 되고', '가족이 적의 손에 인질로 잡히며',
      '자신이 진범으로 몰려 수배자가 되고', '시간이 바닥나 마지막 기회마저 닫히며',
      '경찰·언론·세상 모두가 등을 돌리고', '구하려던 그 사람이 가장 큰 위협임이 드러나며',
      '약효가 끊겨 기억과 함께 단서가 흩어지고', '안전가옥의 위치가 적에게 새어 나가며',
    ],
  },
  {
    key: 'climax', label: '클라이맥스(직접 대면)', icon: '🔥',
    hint: '주인공의 능동적 선택으로, 가장 불리한 상태에서 정면 충돌',
    pool: [
      '무장 해제된 채 적과 단둘이 마주한 폐쇄 공간에서',
      '폭우 속 무너지는 건물 옥상에서 타이머와 경주하며',
      '법정 한복판에서 위증의 사슬을 한 번에 끊어내며',
      '침수되는 지하실에서 수갑을 찬 채 진실을 자백받으며',
      '마지막 열차가 떠나는 승강장에서 추격을 마무리하며',
      '응급실 수술대 위에서 자기 목숨을 걸고 함정을 뒤집으며',
      '생방송 카메라 앞에서 은폐의 전모를 폭로하며',
      '눈보라 치는 산장에서 전원이 끊긴 채 마지막 한 명과 대치하며',
    ],
  },
  {
    key: 'chekhov', label: '회수되는 복선(체호프의 총)', icon: '🔫',
    hint: '초반에 무심히 보여준 요소를 클라이맥스에서 결정적으로 회수',
    pool: [
      '1막에서 스쳐 간 약물 알레르기가 결정타가 되고',
      '무심히 언급된 옛 흉터가 진짜 정체를 증명하며',
      '버려진 줄 알았던 음성 메시지가 마지막 증거가 되고',
      '아이의 그림 속 사소한 디테일이 범인을 가리키며',
      '습관처럼 적던 메모의 한 줄이 알리바이를 무너뜨리고',
      '오래된 비밀번호 하나가 모든 잠금을 여는 열쇠가 되며',
      '고장 난 줄 알았던 CCTV가 사실은 모든 걸 녹화하고 있었으며',
    ],
  },
  {
    key: 'ending', label: '결말(해소/스팅어)', icon: '🎬',
    hint: '카타르시스적 해소 또는 다크/오픈 엔딩 + 마지막 한 줄 반전',
    pool: [
      '진실은 밝혀지지만 주인공은 돌이킬 수 없는 상처를 안고 떠난다',
      '위협은 끝난 듯하나 마지막 한 통의 전화가 다시 울린다',
      '승리의 대가로 가장 소중한 것을 잃고, 도덕적 빚만 남는다',
      '악은 법망을 피해 가고, 주인공만이 진실을 안 채 침묵한다',
      '구원받은 줄 알았던 인물의 미소가 끝에서 서늘하게 비틀린다',
      '사건은 종결되지만 같은 수법의 또 다른 시작이 암시된다',
      '진범은 처벌받되, 주인공 자신도 같은 어둠에 한 발 담갔음을 깨닫는다',
      '모두가 안도한 마지막 장면, 거울 속에 낯선 그림자가 비친다',
    ],
  },
]

// 총 조합수(슬롯 풀 크기의 곱) — 1조 이상 지향
const TOTAL_COMBOS = SLOTS.reduce((n, s) => n * s.pool.length, 1)
const fmtNum = (n: number) => n.toLocaleString('ko-KR')
const fmtBig = (n: number) => {
  if (n >= 1e12) return `약 ${(n / 1e12).toFixed(2)}조`
  if (n >= 1e8) return `약 ${(n / 1e8).toFixed(2)}억`
  return fmtNum(n)
}

const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 슬롯 결과를 한 편의 시놉시스 문단으로 종합한다.
function compose(r: Record<string, string>): string {
  const need = SLOTS.every((s) => r[s.key])
  if (!need) return ''
  const p1 =
    `[${r.subgenre}] ${r.protagonist}은(는) ${r.incident} 평온한 일상이 무너진다. ` +
    `${r.tickingClock} 그(녀)는 ${r.goal} 한다.`
  const p2 =
    `그러나 ${r.antagonist}이(가) 한 발 앞서 있고, ${r.asymmetry} 긴장은 점점 조여 온다. ` +
    `이야기의 한가운데서 ${r.midpointTwist} 판이 뒤집힌다.`
  const p3 =
    `위협이 정점에 이르며 ${r.allIsLost} 모든 것을 잃은 듯하다. ` +
    `그럼에도 ${r.chekhov} 마지막 퍼즐이 맞춰지고, ${r.climax} 주인공은 적과 정면으로 맞선다.`
  const p4 = `그리고 ${r.ending}`
  return [p1, p2, p3, p4]
    .join('\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ([,.])/g, '$1')
    .trim()
}

function loadResults(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS + 'results')
    if (raw) {
      const obj = JSON.parse(raw)
      if (obj && typeof obj === 'object') {
        const next: Record<string, string> = {}
        SLOTS.forEach((s) => { if (typeof obj[s.key] === 'string' && s.pool.includes(obj[s.key])) next[s.key] = obj[s.key] })
        return next
      }
    }
  } catch { /* ignore */ }
  return {}
}
function loadLocked(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(LS + 'locked')
    if (raw) {
      const obj = JSON.parse(raw)
      if (obj && typeof obj === 'object') {
        const next: Record<string, boolean> = {}
        SLOTS.forEach((s) => { if (obj[s.key]) next[s.key] = true })
        return next
      }
    }
  } catch { /* ignore */ }
  return {}
}

export default function ThrillerSynopsis({ payload }: { payload?: Record<string, unknown> }) {
  const [results, setResults] = useState<Record<string, string>>(loadResults)
  const [locked, setLocked] = useState<Record<string, boolean>>(loadLocked)
  const [title, setTitle] = useState<string>(() => {
    try { return localStorage.getItem(LS + 'title') || '' } catch { return '' }
  })
  const [rolling, setRolling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')

  const nonceRef = useRef(0)
  const toastTimerRef = useRef<number | null>(null)

  // payload.genre 맥락 배지(다른 장르로 열려도 동작하되 안내)
  const ctxGenre = payload && typeof payload.genre === 'string' ? String(payload.genre).trim() : ''
  const offGenre = !!ctxGenre && !ctxGenre.includes('스릴러') && !ctxGenre.includes('서스펜스')

  // 초기 진입 시 비어 있으면 한 번 자동 종합(빈 화면 방지)
  const seededRef = useRef(false)
  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    if (Object.keys(results).length === 0) {
      const next: Record<string, string> = {}
      SLOTS.forEach((s) => { next[s.key] = pick(s.pool) })
      setResults(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 영속
  useEffect(() => { try { localStorage.setItem(LS + 'results', JSON.stringify(results)) } catch { /* ignore */ } }, [results])
  useEffect(() => { try { localStorage.setItem(LS + 'locked', JSON.stringify(locked)) } catch { /* ignore */ } }, [locked])
  useEffect(() => { try { localStorage.setItem(LS + 'title', title) } catch { /* ignore */ } }, [title])

  // 토스트 타이머 언마운트 정리
  useEffect(() => () => { if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current) }, [])
  const flash = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(''), 1900)
  }, [])

  const rollAll = useCallback(() => {
    setCopied(false)
    setRolling(true)
    nonceRef.current += 1
    setResults((prev) => {
      const next: Record<string, string> = { ...prev }
      SLOTS.forEach((s) => {
        if (locked[s.key] && prev[s.key]) return
        let v = pick(s.pool)
        if (v === prev[s.key] && s.pool.length > 1) v = pick(s.pool)
        next[s.key] = v
      })
      return next
    })
  }, [locked])

  const rollOne = useCallback((key: string) => {
    setCopied(false)
    const s = SLOTS.find((x) => x.key === key)
    if (!s) return
    setRolling(true)
    nonceRef.current += 1
    setResults((prev) => {
      let v = pick(s.pool)
      if (v === prev[key] && s.pool.length > 1) v = pick(s.pool)
      return { ...prev, [key]: v }
    })
  }, [])

  // 굴림 애니메이션 자동 해제(경쟁상태 정리)
  useEffect(() => {
    if (!rolling) return
    const my = nonceRef.current
    const t = window.setTimeout(() => { if (nonceRef.current === my) setRolling(false) }, 360)
    return () => window.clearTimeout(t)
  }, [rolling, results])

  const toggleLock = (key: string) => setLocked((p) => ({ ...p, [key]: !p[key] }))

  const synopsis = compose(results)
  const hasAll = SLOTS.every((s) => results[s.key])
  const ready = !!synopsis && hasAll
  const lockedCount = SLOTS.filter((s) => locked[s.key]).length
  const workTitle = title.trim() || (results.subgenre ? `무제 ${results.subgenre}` : '무제 스릴러')

  const copy = () => {
    if (!ready) return
    const text = `『${workTitle}』 시놉시스\n\n${synopsis}`
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => { /* graceful */ })
  }

  // 스니펫 라이브러리 저장
  const saveSnippet = () => {
    if (!ready) return
    addToLibrary('snippets', { text: synopsis, source: '스릴러 시놉시스 빌더', tags: ['시놉시스', '스릴러·서스펜스'] })
    flash('스니펫 라이브러리에 저장했습니다.')
  }

  // 프로젝트 자료 〈기획〉 폴더에 〈시놉시스〉 문서로 추가
  const toProject = () => {
    if (!ready) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const paras = synopsis.split('\n\n').map((p) => `<p style="line-height:1.75;margin:0 0 10px;">${esc(p)}</p>`).join('')
    const rows = SLOTS
      .map((s) => `<tr><td style="padding:3px 10px 3px 0;color:#888;white-space:nowrap;">${esc(s.icon)} ${esc(s.label)}</td><td style="padding:3px 0;">${esc(results[s.key] || '')}</td></tr>`)
      .join('')
    const bodyHtml = [
      `<p style="font-size:13px;color:#888;">장르: 스릴러·서스펜스 · 서브장르: ${esc(results.subgenre || '')}</p>`,
      `<h3 style="margin:6px 0 10px;">📝 시놉시스</h3>`,
      paras,
      `<hr/>`,
      `<h4 style="margin:12px 0 6px;">🧩 빌딩 블록</h4>`,
      `<table style="font-size:13px;border-collapse:collapse;">${rows}</table>`,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '기획',
      title: `📝 시놉시스 — ${esc(workTitle).slice(0, 50)}`,
      synopsis: synopsis.slice(0, 400),
      bodyHtml,
      meta: { 장르: '스릴러·서스펜스', 서브장르: results.subgenre || '', 도구: '스릴러 시놉시스 빌더' },
    })
    flash(id ? '프로젝트 자료 〈기획〉 폴더에 〈시놉시스〉를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  return (
    <div style={wrap}>
      <div style={hint}>
        스릴러·서스펜스 관습(<b>티킹 클락 · 정보 비대칭 · 중간점 반전 · 절망의 순간 · 직접 대면 · 체호프의 총</b>)에 맞춘 슬롯을 굴려 한 편의 시놉시스를 자동 종합합니다. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하세요.
      </div>

      {offGenre && (
        <div style={{ ...card, fontSize: 12, color: 'var(--muted)', borderColor: 'var(--accent)' }}>
          <Emoji e="ℹ️"/> 현재 「{ctxGenre}」 맥락으로 열렸지만, 이 도구는 <b>스릴러·서스펜스</b> 전용 시놉시스 빌더입니다.
        </div>
      )}

      {/* 제목 + 조합수 */}
      <div style={card}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>작품 제목(선택)</div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예) 마지막 증인"
          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 14 }}
        />
        <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          <span>가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmtBig(TOTAL_COMBOS)}</b> 가지 <span style={{ opacity: 0.7 }}>({fmtNum(TOTAL_COMBOS)})</span></span>
          <span>{lockedCount > 0 ? <><Emoji e="🔒"/> {lockedCount}개 고정됨</> : '고정 없음 — 전부 새로 굴림'}</span>
        </div>
      </div>

      {/* 슬롯 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SLOTS.map((s) => {
          const v = results[s.key]
          const isLocked = !!locked[s.key]
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, ...card }}>
              <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-8deg) scale(1.12)' : 'none' }}>
                <Emoji e={s.icon}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }} title={s.hint}>
                  {s.label} <span style={{ opacity: 0.7 }}>({s.pool.length})</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: v ? 'var(--text)' : 'var(--muted)' }}>
                  {v ? (rolling && !isLocked ? '…' : v) : '— 굴려주세요 —'}
                </div>
              </div>
              <button className="minibtn" onClick={() => rollOne(s.key)} title="이 슬롯만 다시 굴리기" style={{ flexShrink: 0 }} disabled={isLocked}><Emoji e="🎲"/></button>
              <button
                className="minibtn"
                onClick={() => toggleLock(s.key)}
                title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}
                aria-pressed={isLocked}
              >
                {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
              </button>
            </div>
          )
        })}
      </div>

      {/* 완성 시놉시스 */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🕵️"/> 『{workTitle}』 시놉시스</div>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: ready ? 'var(--text)' : 'var(--muted)', whiteSpace: 'pre-wrap' }}>
          {synopsis || '슬롯을 굴려 시놉시스를 종합해 보세요.'}
        </div>
      </div>

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, minWidth: 150 }} onClick={rollAll}><Emoji e="🎲"/> 시놉시스 종합</button>
        <button className="minibtn" onClick={copy} disabled={!ready}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
        <button className="minibtn" onClick={saveSnippet} disabled={!ready} title="완성된 시놉시스를 스니펫 라이브러리에 저장"><Emoji e="💾"/> 스니펫</button>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!ready || !hasProjectBridge()}
          title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '완성된 시놉시스를 프로젝트 자료 〈기획〉 폴더에 〈시놉시스〉 문서로 추가'}
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
      </div>

      {/* 관련 스릴러 도구 연계 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>이어서:</span>
        <button className="linkbtn" onClick={() => openToolLinked('logline-forge', { genre: '스릴러·서스펜스' })} title="한 줄 로그라인으로 압축"><Emoji e="⚒️"/> 로그라인</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck', { genre: '스릴러·서스펜스' })} title="반전 아이디어 더 뽑기"><Emoji e="🔄"/> 반전 덱</button>
        <button className="linkbtn" onClick={() => openToolLinked('save-the-cat-beats', { genre: '스릴러·서스펜스' })} title="15비트로 구조 잡기"><Emoji e="🐱"/> 비트 시트</button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}

      <div style={hint}>잠긴 슬롯은 그대로 두고 나머지만 다시 굴립니다. 시놉시스는 출발점일 뿐 — 위협을 한 단씩 올리며 자유롭게 다듬어 보세요.</div>

      <div className="license-note" style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.4 }}>
        <span className="license-badge">자체 창작</span> 모든 슬롯 문구는 이 도구가 스릴러·서스펜스 장르 통념에 근거해 자체 작성한 오리지널 풀로, 외부 저작물을 사용하지 않습니다.
      </div>
    </div>
  )
}
