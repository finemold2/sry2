// LitRPG 시놉시스 빌더 — 게임판타지·LitRPG 장르 관습(접속 분기·시스템 각성·튜토리얼·
//   첫 특별함·코어 루프·파워 게이팅·보스 레이드·시스템의 배후·수치 인플레 관리)에 맞춘
//   슬롯을 굴려 한 편의 시놉시스를 자동 종합한다.
//   슬롯 풀 무작위(🔒 잠금/재생성) + 총 조합수 표시(1조 이상). 완성본은 복사/스니펫 저장/
//   프로젝트 자료 〈기획〉 폴더에 〈시놉시스〉 문서로 추가(addToProject). 관련 도구로 연계.
//   자급식: 외부 네트워크·라이브러리 없음. react / './linkbus' 외 import 없음. localStorage 영속.
import { useState, useEffect, useCallback, useRef } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'litrpg-synopsis',
  name: 'LitRPG 시놉시스 빌더',
  icon: '🎮',
  group: '구조',
  genre: '게임판타지·LitRPG',
  intro: '접속 분기·시스템 각성·첫 특별함·보스 레이드·시스템의 배후를 갖춘 시놉시스를 슬롯으로 종합(1조+ 조합)',
  w: 580,
  h: 700,
}

const LS = 'sry:tool:litrpg-synopsis:'

// ── 슬롯 정의: 게임판타지·LitRPG 관습에 근거한 자작 풀(구체적·장르 특화) ──────────────
interface Slot { key: string; label: string; icon: string; hint: string; pool: string[] }

const SLOTS: Slot[] = [
  {
    key: 'mode', label: '접속 분기(세계 형태)', icon: '🌀',
    hint: '4분기 — 이후 관습·금기·페이싱이 자동으로 갈린다',
    pool: [
      'VR 다이브형(현실의 인간이 가상현실 게임에 접속, 로그아웃·현실 생활 공존)',
      '갇힘·데스게임형(게임에서 못 나옴, 죽으면 진짜 죽음, 안전지대 없음)',
      '이세계 전이+시스템형(다른 세계로 넘어갔는데 그 세계에 시스템이 깔려 있음, 로그아웃 없음)',
      '현실 침공형(어느 날 현실에 상태창·던전·게이트가 생긴 시스템 아포칼립스)',
      'VR 다이브형 변주(게임 성과가 곧 현실의 지위·재화가 되는 환율 연동 세계)',
      '현실 침공형 변주(헌터·각성자 등급제가 사회 권력 구조를 재편한 세계)',
    ],
  },
  {
    key: 'reference', label: '계보·톤 레퍼런스', icon: '📚',
    hint: '어느 계보를 변주할지에 따라 강조점이 정렬된다',
    pool: [
      '경제·생산·노가다·일확천금을 강조하는 로열로드형',
      '죽으면 끝이라는 긴장이 모든 선택을 짓누르는 데스게임형',
      '원작·미래 지식을 무기로 삼는 메타·정보전형',
      '사회·경제 시뮬레이션과 게임 세계의 공동체 구축형',
      '던전 코어·탑 등반의 반복 공략과 빌드 최적화형',
      '시스템 패러디·코미디로 관습을 비트는 풍자형',
      '그림자·소환·군단 운용으로 세력을 불리는 지휘관형',
      '수치적 성장 위계(경지·차원)를 정면으로 등반하는 수련형',
    ],
  },
  {
    key: 'protagonist', label: '주인공(약자에서 출발)', icon: '🧑',
    hint: '약자·하층 랭커·F급에서 시작해야 성장 곡선이 산다',
    pool: [
      '재능 없다 낙인찍힌 만년 F급 각성자', '길드에서 짐꾼 취급받던 최하급 보조 직업자',
      '접속 비용을 벌려 게임을 시작한 고학생', '회귀 전 첫 게이트에서 죽었던 평범한 회사원',
      '각성에 실패해 일반인으로 살던 헌터 가문의 막내', '버그·꼼수만 파던 양산형 폐인 게이머',
      '시한부 선고를 받고 마지막으로 접속한 환자', '아이템 감정만 하던 비전투직 상인',
      '튜토리얼 첫날 전원이 죽고 홀로 살아남은 생존자', '원작 소설을 끝까지 읽은 유일한 독자',
      '랭킹 바닥을 전전하던 무명 솔로 플레이어', '동생의 병원비를 위해 현질도 못 하던 무과금러',
      '각성 등급은 최하지만 기억만은 미래에서 온 회귀자', '버려진 직업을 강제로 받은 전직 실패자',
      '길드 마스터에게 토사구팽당한 옛 부길드장', '시스템 메시지가 남들과 다르게 보이는 이방인',
    ],
  },
  {
    key: 'inciting', label: '인사이팅 인시던트(각성)', icon: '⚡',
    hint: '접속/시스템 각성/전이 — 되돌릴 수 없는 1막의 방아쇠',
    pool: [
      '눈앞에 처음으로 [상태창]이 떠오르면서', '하늘이 갈라지고 첫 [게이트]가 도시 한복판에 열리면서',
      '죽음의 순간 “[튜토리얼을 시작합니다]”라는 메시지가 들려오면서', '캡슐에서 깨어나니 로그아웃 버튼이 사라져 있어서',
      '눈을 뜨니 모든 것에 등급과 수치가 보이는 다른 세계여서', '[히든 클래스 전직 조건을 충족했습니다] 알림이 홀로 떠서',
      '회귀해 모든 것을 다 알고 있는 채로 첫날 새벽에 눈을 떠서', '평범한 던전 청소 알바 중 [관리자]의 부름을 받으면서',
      '모두가 받지 못한 [시스템의 호출]에 혼자만 응답하면서', '죽은 줄 알았던 캐릭터의 몸으로 게임 종료 후에도 깨어나서',
      '첫 사냥에서 남들에겐 안 보이는 [숨겨진 퀘스트]가 떠올라서', '각성의 날, 모두가 직업을 받을 때 자신만 [무직]이 떠서',
      '낡은 캡슐에 접속한 순간 [최초 접속자] 보너스가 발동하면서', '시나리오가 시작됐다는 [도깨비]의 통보를 받으면서',
    ],
  },
  {
    key: 'special', label: '첫 특별함(차별화 핵심)', icon: '🌟',
    hint: '히든 클래스·유니크 스킬·단독 보유 시스템 — 주인공만의 것',
    pool: [
      '세상에 단 하나뿐인 [히든 클래스]를 전직하게 되고', '아무도 못 가진 [유니크 스킬]을 단독으로 습득하며',
      '죽은 적의 능력을 흡수·복제하는 [성장형 고유 능력]을 얻고', '실패할수록 강해지는 역설적인 [저주받은 칭호]를 받으며',
      '남들에겐 보이지 않는 [추가 정보창]을 단독으로 열람하고', '확률을 무시하고 항상 최상위 옵션이 뜨는 [특이점 운]을 지니며',
      '잡은 몬스터를 부하로 부리는 [소환·예속 계열 권능]을 깨우고', '경험치 획득량이 기하급수로 폭증하는 [고독한 수련자] 특성을 받으며',
      '죽음을 한 번 되감는 [부활·회귀형 패시브]를 단독 보유하고', '모든 스킬을 흡수해 한 등급 위로 진화시키는 [모방·진화]를 익히며',
      '시스템 자체를 일부 편집할 수 있는 [관리자 권한 조각]을 얻고', '미래를 미리 보는 [예지·시뮬레이션 스킬]을 단독으로 발현하며',
      '직업이 없기에 모든 스킬을 제한 없이 쓰는 [무한 가능성]을 손에 넣고', '쓰레기 아이템을 신물로 바꾸는 [재구성·연성 고유기]를 깨우며',
    ],
  },
  {
    key: 'build', label: '빌드 정체성(스탯·스킬)', icon: '🧬',
    hint: '어디에 투자하느냐가 곧 캐릭터성 — 빌드의 묘미',
    pool: [
      '깡 근력에 몰빵해 정면으로 부수는 탱·딜 일체형 근접 빌드',
      '민첩·은신에 투자한 일격 암살·잠입 특화 빌드',
      '지능·마나에 올인한 광역 섬멸형 마법 빌드',
      '소환수·언데드 군단을 불리는 지휘·물량 빌드',
      '버프·디버프·상태이상으로 판을 짜는 서포터·전술 빌드',
      '생산·제작·강화로 장비를 자급하는 경제·테크 빌드',
      '회복·보호막 중심의 불사 탱커 빌드',
      '스킬 콤보·연계기 시너지를 극대화한 콤보 마스터 빌드',
      '낮은 스탯을 운·확률 조작으로 메우는 변칙 도박 빌드',
      '여러 직업을 겹쳐 든 하이브리드 다직업 빌드',
    ],
  },
  {
    key: 'firstCathar', label: '첫 사이다(역전 보상)', icon: '💥',
    hint: '무시하던 자를 압도 — 성장의 가시화가 보상감의 핵심',
    pool: [
      '자신을 짐꾼 취급하던 길드를 단독 클리어로 망신 주고',
      '재능 없다 비웃던 동기들 앞에서 보스를 혼자 잡아내며',
      '버려졌던 직업으로 [최초 달성(First Clear)] 칭호를 거머쥐고',
      '먼치킨 랭커가 못 깬 히든 던전을 가뿐히 공략하며',
      '강자에게 빌붙던 자들이 도리어 자신에게 줄을 서게 만들고',
      '최하급이라던 평가를 뒤엎고 랭킹 순위를 폭발적으로 끌어올리며',
      '자신을 함정에 빠뜨린 자를 같은 함정으로 되갚아 주고',
      '경매장을 발칵 뒤집을 유니크 아이템을 들고 나타나며',
      '데스게임에서 모두가 포기한 층을 홀로 돌파해 생존자들을 구하고',
      '미래 지식으로 폭락 직전 시세를 선점해 단숨에 거부가 되며',
    ],
  },
  {
    key: 'system', label: '시스템(안내자) 성격', icon: '🤖',
    hint: '안내 AI·관리자·도깨비 — 세계관 비밀의 화자 겸함',
    pool: [
      '무미건조하게 규칙만 읊는 기계적 안내 AI', '주인공을 시험하듯 비꼬는 변덕스러운 관리자',
      '시나리오와 코인을 흥정하는 능청스러운 중개자(도깨비형)', '호의적인 척하지만 속내를 숨긴 [협력적] 시스템',
      '버그처럼 주인공에게만 말을 거는 오작동 인격', '냉정한 심판관처럼 공정한 룰만 집행하는 시스템',
      '오래전 죽은 누군가의 잔향이 깃든 안내자', '플레이어를 자원으로만 보는 비정한 운영 주체',
      '주인공을 [예외]로 점찍고 은밀히 편애하는 시스템', '질문할수록 더 큰 비밀의 실마리를 흘리는 수수께끼의 화자',
    ],
  },
  {
    key: 'coreLoop', label: '코어 루프·게이팅', icon: '🔁',
    hint: '사냥→경험치/드랍→레벨업/강화→더 센 사냥 + 자격 게이트',
    pool: [
      '사냥→레벨업→상위 던전 입장 자격을 따내는 단계적 파밍 루프',
      '퀘스트 연계→히든 분기→전직 자격을 여는 퀘스트 사슬',
      '드랍·강화·인챈트로 장비를 끌어올리는 도박성 파워업 루프',
      '랭킹전 승리→명성→상위 길드·레이드 자격을 얻는 경쟁 루프',
      '층마다 자격을 검증받으며 한 칸씩 오르는 탑 등반 루프',
      '생산·교역으로 자본을 불려 더 좋은 사냥터를 사들이는 경제 루프',
      '게이트 공략→코어 회수→영역 확장으로 세력을 넓히는 점령 루프',
      '시나리오 클리어→코인 정산→다음 시나리오 입장권을 사는 메인 루프',
    ],
  },
  {
    key: 'rival', label: '라이벌·경쟁 세력', icon: '🏴',
    hint: '랭커·길드·순위표 — 사회적 인정의 수치화',
    pool: [
      '정보와 자본을 독점한 거대 명문 길드', '주인공의 성장을 질투하는 천재 1위 랭커',
      '같은 히든 클래스를 노리는 또 다른 각성자', '플레이어를 사냥하는 PK·약탈 집단',
      '현실 권력과 결탁해 던전을 사유화한 헌터 재벌', '겉으론 동맹이나 뒤로 칼을 가는 이중 길드',
      '시스템의 총애를 받는다는 [선택받은 자]', '회귀 전 주인공을 죽였던 미래의 강자',
      '데스게임 공략조를 지배하려는 독재적 클리어 길드', '미래 지식을 의심하며 주인공을 추적하는 정보 조직',
    ],
  },
  {
    key: 'midTwist', label: '중간점 반전(스케일업)', icon: '🔄',
    hint: '단순 게임에서 우주적 음모로 — 판세 역전',
    pool: [
      '이 게임이 사실 인류를 시험하는 거대한 [선별 장치]였음이 드러나고',
      '믿었던 조력자가 시스템의 배후 세력과 한편이었음이 밝혀지며',
      '주인공의 [특별함]이 누군가 의도적으로 심어 둔 안배였고',
      '죽었다던 전설의 플레이어가 살아서 판을 움직이고 있었으며',
      '현실과 게임의 경계가 무너지기 시작하는 진짜 위협이 닥치고',
      '회귀로 바꾼 미래가 더 끔찍한 분기로 어긋나기 시작하며',
      '시스템이 보상하던 모든 행동이 실은 [수확]을 위한 것이었고',
      '주인공이 곧 다음 시스템을 잇는 [관리자 후보]임이 드러나며',
    ],
  },
  {
    key: 'allLost', label: '절망의 순간(전멸 위기)', icon: '🕳️',
    hint: '레이드 전멸 위기·동료 상실 — 최악의 조건',
    pool: [
      '핵심 동료가 부활 불가 페널티로 영영 사라지고', '강화하던 최종 장비가 실패해 파괴되며',
      '믿었던 길드의 배신으로 보스 앞에 홀로 남겨지고', '고유 능력이 봉인되어 가장 약한 상태가 되며',
      '데스게임의 카운트다운이 바닥나 전멸이 코앞에 닥치고', '소환·군단이 한순간에 전멸당해 무력해지며',
      '미래 지식이 더는 통하지 않는 미지의 분기에 들어서고', '현실의 가족이 게이트 너머의 인질로 잡히며',
      '시스템이 주인공을 [버그]로 규정해 삭제를 예고하고', '쌓아 올린 명성과 칭호가 누명으로 한순간에 박탈되며',
    ],
  },
  {
    key: 'climax', label: '클라이맥스(보스 레이드)', icon: '🐉',
    hint: '패턴 파악→전멸 위기→역전 변수 3박자 + 한계 돌파',
    pool: [
      '한계 돌파로 [조건 충족] 히든 스킬을 각성시키며 네임드를 베고',
      '죽기 직전 잠재력이 개방되어 한 등급 위로 진화한 채 보스와 정면 대결하며',
      '동료의 희생을 발판 삼아 패턴을 깨고 최종 일격을 꽂아 넣으며',
      '소환·군단을 총동원한 물량전으로 레이드 보스를 압살하며',
      '미래 지식으로 미리 짜둔 공략 동선대로 단 한 번에 클리어하며',
      '시스템 권한 조각으로 룰의 빈틈을 찔러 무적 보스를 무너뜨리며',
      '탑 최상층에서 [탑의 주인]과 운명을 건 최후의 등반전을 벌이며',
      '현실과 게임이 겹쳐진 전장에서 모든 빌드를 쏟아부어 흑막을 잡으며',
    ],
  },
  {
    key: 'ending', label: '결말·다음 게이트(시스템의 배후)', icon: '🏁',
    hint: '질적 보상·단위 리셋·새 떡밥 — 인플레를 다음 스케일로',
    pool: [
      '시스템을 만든 자의 정체가 드러나며 더 큰 차원의 등반이 시작된다',
      '게임을 끝낸 줄 알았으나, 진짜 [본 서버]가 열렸다는 마지막 알림이 뜬다',
      '현실로 돌아오지만 능력은 남았고, 세계의 비밀을 쥔 자가 된다',
      '왕좌에 올라선 순간, 자신을 시험하던 시스템의 다음 단계가 예고된다',
      '모든 보상의 정점에서 단위가 리셋되고, 새로운 등급 체계가 열린다',
      '시스템의 배후를 무너뜨렸으나, 그 자리를 이을 [관리자]로 지목된다',
      '회귀로 미래를 바꿨지만, 그 대가가 새로운 위협으로 돌아옴이 암시된다',
      '동료들과 길드를 일으켜 세운 끝에, 더 깊은 던전의 입구가 모습을 드러낸다',
    ],
  },
]

// 총 조합수(슬롯 풀 크기의 곱) — 1조 이상 지향(핵심 생성기)
const TOTAL_COMBOS = SLOTS.reduce((n, s) => n * s.pool.length, 1)
const fmtNum = (n: number) => n.toLocaleString('ko-KR')
const fmtBig = (n: number) => {
  if (n >= 1e16) return `약 ${(n / 1e16).toFixed(2)}경`
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
    `[${r.mode}] ${r.protagonist}은(는) ${r.inciting} 운명이 뒤바뀐다. ` +
    `(톤: ${r.reference})`
  const p2 =
    `그(녀)는 ${r.special} 남들과 다른 출발선에 선다. ` +
    `${r.build}로 자신을 벼리며, ${r.firstCathar} 첫 사이다를 터뜨린다.`
  const p3 =
    `${r.system}이(가) 길을 안내하는 가운데, 그는 ${r.coreLoop}로 한 계단씩 강해진다. ` +
    `그러나 ${r.rival}이(가) 앞을 가로막고, 경쟁은 점점 치열해진다.`
  const p4 =
    `이야기의 한가운데서 ${r.midTwist} 판이 뒤집힌다. ` +
    `위협이 정점에 이르며 ${r.allLost} 모든 것을 잃은 듯하다.`
  const p5 =
    `그럼에도 ${r.climax} 최후의 전투를 끝낸다. ` +
    `그리고 ${r.ending}`
  return [p1, p2, p3, p4, p5]
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

export default function LitrpgSynopsis({ payload }: { payload?: Record<string, unknown> }) {
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
  const offGenre = !!ctxGenre && !ctxGenre.includes('게임판타지') && !ctxGenre.includes('LitRPG') && !ctxGenre.toLowerCase().includes('litrpg')

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
  const workTitle = title.trim() || (results.mode ? '무제 LitRPG' : '무제 LitRPG')

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
    addToLibrary('snippets', { text: synopsis, source: 'LitRPG 시놉시스 빌더', tags: ['시놉시스', '게임판타지·LitRPG'] })
    flash('스니펫 라이브러리에 저장했습니다.')
  }

  // 프로젝트 자료 〈기획〉 폴더에 〈시놉시스〉 문서로 추가
  const toProject = () => {
    if (!ready) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const paras = synopsis.split('\n\n').map((p) => `<p style="line-height:1.75;margin:0 0 10px;">${esc(p)}</p>`).join('')
    const rows = SLOTS
      .map((s) => `<tr><td style="padding:3px 10px 3px 0;color:#888;white-space:nowrap;vertical-align:top;">${esc(s.icon)} ${esc(s.label)}</td><td style="padding:3px 0;">${esc(results[s.key] || '')}</td></tr>`)
      .join('')
    const bodyHtml = [
      `<p style="font-size:13px;color:#888;">장르: 게임판타지·LitRPG · 접속 분기: ${esc((results.mode || '').split('(')[0])}</p>`,
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
      meta: { 장르: '게임판타지·LitRPG', 접속분기: (results.mode || '').split('(')[0], 도구: 'LitRPG 시놉시스 빌더' },
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
        게임판타지·LitRPG 관습(<b>접속 분기 · 시스템 각성 · 첫 특별함 · 빌드 정체성 · 코어 루프 · 중간점 스케일업 · 보스 레이드 · 시스템의 배후</b>)에 맞춘 슬롯을 굴려 한 편의 시놉시스를 자동 종합합니다. 마음에 드는 슬롯은 <Emoji e="🔒" />로 고정하세요.
      </div>

      {offGenre && (
        <div style={{ ...card, fontSize: 12, color: 'var(--muted)', borderColor: 'var(--accent)' }}>
          <Emoji e="ℹ️" /> 현재 「{ctxGenre}」 맥락으로 열렸지만, 이 도구는 <b>게임판타지·LitRPG</b> 전용 시놉시스 빌더입니다.
        </div>
      )}

      {/* 제목 + 조합수 */}
      <div style={card}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>작품 제목(선택)</div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예) 나 혼자만 무직"
          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 14 }}
        />
        <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          <span>가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmtBig(TOTAL_COMBOS)}</b> 가지 <span style={{ opacity: 0.7 }}>({fmtNum(TOTAL_COMBOS)})</span></span>
          <span>{lockedCount > 0 ? <><Emoji e="🔒" /> {lockedCount}개 고정됨</> : '고정 없음 — 전부 새로 굴림'}</span>
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
                <Emoji e={s.icon} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }} title={s.hint}>
                  {s.label} <span style={{ opacity: 0.7 }}>({s.pool.length})</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: v ? 'var(--text)' : 'var(--muted)' }}>
                  {v ? (rolling && !isLocked ? '…' : v) : '— 굴려주세요 —'}
                </div>
              </div>
              <button className="minibtn" onClick={() => rollOne(s.key)} title="이 슬롯만 다시 굴리기" style={{ flexShrink: 0 }} disabled={isLocked}><Emoji e="🎲" /></button>
              <button
                className="minibtn"
                onClick={() => toggleLock(s.key)}
                title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}
                aria-pressed={isLocked}
              >
                {isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
              </button>
            </div>
          )
        })}
      </div>

      {/* 완성 시놉시스 */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🎮" /> 『{workTitle}』 시놉시스</div>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: ready ? 'var(--text)' : 'var(--muted)', whiteSpace: 'pre-wrap' }}>
          {synopsis || '슬롯을 굴려 시놉시스를 종합해 보세요.'}
        </div>
      </div>

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, minWidth: 150 }} onClick={rollAll}><Emoji e="🎲" /> 시놉시스 종합</button>
        <button className="minibtn" onClick={copy} disabled={!ready}>{copied ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}</button>
        <button className="minibtn" onClick={saveSnippet} disabled={!ready} title="완성된 시놉시스를 스니펫 라이브러리에 저장"><Emoji e="💾" /> 스니펫</button>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!ready || !hasProjectBridge()}
          title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '완성된 시놉시스를 프로젝트 자료 〈기획〉 폴더에 〈시놉시스〉 문서로 추가'}
        >
          <Emoji e="📄" /> 프로젝트에 추가
        </button>
      </div>

      {/* 관련 도구 연계 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>이어서:</span>
        <button className="linkbtn" onClick={() => openToolLinked('logline-forge', { genre: '게임판타지·LitRPG' })} title="한 줄 로그라인으로 압축"><Emoji e="⚒️" /> 로그라인</button>
        <button className="linkbtn" onClick={() => openToolLinked('save-the-cat-beats', { genre: '게임판타지·LitRPG' })} title="15비트로 구조 잡기"><Emoji e="🐱" /> 비트 시트</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck', { genre: '게임판타지·LitRPG' })} title="시스템의 배후 반전 더 뽑기"><Emoji e="🃏" /> 반전 덱</button>
        <button className="linkbtn" onClick={() => openToolLinked('conflict-builder', { genre: '게임판타지·LitRPG' })} title="라이벌과의 갈등 설계"><Emoji e="⚔️" /> 갈등 설계기</button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}

      <div style={hint}>잠긴 슬롯은 그대로 두고 나머지만 다시 굴립니다. 시놉시스는 출발점일 뿐 — 성장 곡선을 한 단씩 올리며(성장·보상·다음 목표 갱신) 자유롭게 다듬어 보세요.</div>

      <div className="license-note" style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.4 }}>
        <span className="license-badge">자체 창작</span> 모든 슬롯 문구는 이 도구가 게임판타지·LitRPG 장르 통념에 근거해 자체 작성한 오리지널 풀로, 외부 저작물을 사용하지 않습니다.
      </div>
    </div>
  )
}
