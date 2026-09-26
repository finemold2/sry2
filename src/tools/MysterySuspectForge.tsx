// 용의자·동기 생성기 — 미스터리·추리 전용. 한 사건을 둘러싼 용의자 카드를 슬롯 조합으로 대량 생성한다.
//  각 용의자는 (관계 × 직업 × 표면동기 × 숨은동기 × 비밀 × 수상한 행동 × 알리바이 × 결정적 단서)를
//  로컬 표에서 한 조각씩 뽑아 입체적인 카드로 빚어낸다. 마음에 드는 슬롯은 🔒로 고정하고 나머지만 다시 굴린다.
//  생성된 용의자 명단 중 한 명을 '진범 후보'로 표시(주사위/직접 지정)해 누가 범인일지 가닥을 잡는다.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(명단)만 사용. 외부 API 불필요.
// 연계(linkbus): 용의자를 자료('research')/'인물' 폴더 카드로 추가(addToProject kind:character),
//  인물 라이브러리(characters)에도 저장, 인물 시트·관계도 등 관련 도구를 데이터와 함께 연다.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, type SharedCharacter } from './linkbus'
import { Emoji, emojify } from './linkbus'

export const meta = { id: 'mystery-suspect-forge', name: '용의자·동기 생성기', icon: '🕵️', group: '캐릭터', genre: '미스터리·추리', intro: '관계·표면동기·숨은동기·비밀·수상한 행동·알리바이를 조합해 용의자 카드를 대량 생성하고 진범 후보를 가려보세요', w: 600, h: 680 }

const LS = 'sry:tool:mystery-suspect-forge'

// 한글 받침 판정 + 조사 자동 선택(괄호 이중표기 금지, 실제 한 형태만 출력)
function hasJong(word: string): boolean {
  if (!word) return false
  const ch = word.charCodeAt(word.length - 1)
  if (ch < 0xac00 || ch > 0xd7a3) return false // 한글 음절이 아니면 받침 없는 것으로 처리
  return (ch - 0xac00) % 28 !== 0
}
// 받침 있으면 withJong, 없으면 withoutJong 을 단어 뒤에 붙인다(을/를, 은/는, 이/가)
const eul = (w: string) => w + (hasJong(w) ? '을' : '를') // 을/를

// ---------------- 이름 풀(작명 영감) ----------------
const SURNAME = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '한', '서', '신', '권', '황', '안', '송', '류', '홍', '전', '고', '문', '배', '백', '오', '남', '심']
const GIVEN = ['도현', '서연', '준영', '하경', '민수', '예린', '재훈', '수아', '태경', '윤서', '정우', '소율', '경민', '다은', '성진', '하린', '우진', '채원', '동혁', '지안', '석호', '미강', '영후', '나래', '현우', '보경', '태식', '유나', '진오', '세린', '병주', '아름']
const FOREIGN = ['에이드리언', '비비안', '클로드', '엘레나', '마르코', '소피아', '데미안', '나탈리', '루카스', '이자벨', '빅터', '로잘린', '세바스찬', '카밀라', '레오나르', '아멜리', '오스카', '베로니카']
const pickName = (): string => {
  const r = Math.random()
  if (r < 0.7) return pick(SURNAME) + pick(GIVEN)
  return pick(FOREIGN)
}

// ---------------- 슬롯 정의 ----------------
interface Slot { key: string; label: string; icon: string; desc: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'relation', label: '피해자와의 관계', icon: '🔗', desc: '용의자가 사건·피해자와 맺은 관계',
    faces: [
      '피해자의 배우자',
      '피해자의 옛 연인',
      '오랜 사업 동업자',
      '유산을 노리는 친척',
      '한집에 사는 가정부',
      '피해자가 고용한 운전기사',
      '같은 직장의 라이벌',
      '비밀을 공유한 절친',
      '피해자에게 빚을 진 채무자',
      '얼마 전 해고당한 직원',
      '피해자가 무너뜨린 회사의 전 사장',
      '한 동네 오랜 이웃',
      '사건 현장의 첫 발견자',
      '피해자가 변호하던 의뢰인',
      '피해자를 쫓던 사립탐정',
      '며칠 전 찾아온 낯선 손님',
      '피해자의 주치의',
      '단골 술집의 바텐더',
      '피해자가 협박하던 상대',
      '오래전 헤어진 가족',
      '피해자와 같은 모임의 회원',
      '피해자가 후원하던 제자',
      '저택에 머물던 손님',
      '피해자에게 작품을 의뢰받은 예술가',
      '피해자 회사의 비밀을 쥔 내부 고발자',
      '피해자가 거래하던 골동품 중개인',
    ],
  },
  {
    key: 'job', label: '직업·신분', icon: '🪪', desc: '용의자의 직업과 사회적 위치',
    faces: [
      '대학 교수', '외과 의사', '변호사', '화가', '약사', '기자', '소설가', '골동품상',
      '은행원', '건축가', '간호사', '회계사', '배우', '사진작가', '플로리스트', '요리사',
      '보험 조사관', '경매사', '시계 수리공', '정원사', '사서', '음악가', '교사', '제약회사 연구원',
      '형사', '검시관', '신문 편집장', '박물관 큐레이터', '극단 연출가', '향수 조향사', '여관 주인', '전당포 주인',
    ],
  },
  {
    key: 'surface', label: '표면 동기', icon: '🎭', desc: '겉으로 드러나는, 누구나 의심할 만한 동기',
    faces: [
      '거액의 유산을 물려받게 된다',
      '피해자와 공공연히 다툰 적이 있다',
      '사업상 큰 손해를 입혔다고 알려져 있다',
      '연적 관계로 소문이 자자했다',
      '피해자에게 해고·파면당했다',
      '거액의 보험금 수령인이다',
      '피해자가 자신의 비리를 폭로하려 했다',
      '오래 묵은 원한이 공공연했다',
      '피해자의 자리를 노리고 있었다',
      '빚 독촉에 시달리고 있었다',
      '명예를 크게 실추당했다',
      '피해자가 결혼·계약을 깨려 했다',
      '경쟁에서 번번이 밀려났다',
      '가족을 모욕당한 일이 있었다',
      '피해자가 자신을 고소하려 했다',
      '거액의 도박 빚을 피해자에게 졌다',
      '피해자가 유언장에서 자신을 지우려 했다',
      '피해자에게 작품을 표절당했다',
      '피해자가 자신의 사업을 가로채려 했다',
      '피해자와 양육권을 두고 다투고 있었다',
    ],
  },
  {
    key: 'hidden', label: '숨은 동기', icon: '🕯️', desc: '아무도 모르는, 진짜 마음속 동기',
    faces: [
      '사실은 피해자를 깊이 사랑하고 있었다',
      '오래전 저지른 죄를 들킬까 두려웠다',
      '소중한 사람을 지키기 위해서였다',
      '피해자가 자신의 출생 비밀을 쥐고 있었다',
      '복수가 아니라 양심의 가책 때문이었다',
      '제3자의 협박에 떠밀린 것이었다',
      '진범을 감싸기 위해 움직이고 있었다',
      '잃어버린 무언가를 되찾으려 했다',
      '피해자의 죽음으로 누명을 벗으려 했다',
      '실은 피해자에게 은혜를 입은 처지였다',
      '오래 짝사랑한 이를 빼앗겼다 믿었다',
      '자신이 아니라 가족이 표적이라 여겼다',
      '진실이 밝혀지면 모두가 파멸한다고 믿었다',
      '돈이 아니라 한 통의 편지를 노렸다',
      '오래된 약속 하나를 지키려 했을 뿐이다',
      '피해자가 자신의 진짜 이름을 알고 있었다',
      '병든 가족의 치료비가 절실했다',
      '피해자가 죽어야 자신의 결백이 증명됐다',
      '사랑하는 이의 명예를 지키려 한 것이었다',
      '오래 감춰 온 진실을 끝내 묻으려 했다',
    ],
  },
  {
    key: 'secret', label: '비밀', icon: '🔒', desc: '들키면 안 되는, 감추고 있는 것',
    faces: [
      '이중 신분으로 살고 있다',
      '오래전 다른 사건의 진범이다',
      '치명적인 지병을 앓고 있다',
      '숨겨 둔 혈육이 있다',
      '신분과 학력이 모두 위조다',
      '거액의 횡령을 저질렀다',
      '피해자와 비밀리에 거래하고 있었다',
      '협박 편지를 받아 온 처지다',
      '과거에 자살을 시도한 적이 있다',
      '사건 직전 유언장을 고쳤다',
      '가명으로 다른 도시에 가정을 꾸리고 있다',
      '피해자의 일기를 몰래 훔쳐 읽고 있었다',
      '실은 현장에서 무언가를 가져갔다',
      '진실을 아는 유일한 목격자다',
      '오래전 신분을 바꿔 살아온 사람이다',
      '피해자에게 거액을 빌려준 비밀 채권자다',
      '몰래 다른 용의자와 내통하고 있었다',
      '사건 전날 피해자와 단둘이 만났다',
      '없앤 줄 알았던 증거를 보관하고 있다',
      '오래전 가족을 버리고 떠난 과거가 있다',
    ],
  },
  {
    key: 'behavior', label: '수상한 행동', icon: '👀', desc: '주변이 목격한, 의심을 사는 행동',
    faces: [
      '사건 당일 옷을 황급히 태웠다',
      '알리바이를 자꾸 바꿔 말한다',
      '현장에서 무언가를 줍는 것이 목격됐다',
      '평소와 달리 거액을 인출했다',
      '사건 후 갑자기 먼 곳으로 떠나려 했다',
      '피해자의 방을 몰래 뒤지고 있었다',
      '깨진 유리잔을 손수 치웠다',
      '받지 않던 전화를 그날만 피했다',
      '없앤 줄 알았던 흉기를 알고 있었다',
      '사건 시각을 묻자 식은땀을 흘렸다',
      '평소 안 쓰던 장갑을 끼고 있었다',
      '피해자의 장례에 끝내 오지 않았다',
      '수사관 앞에서 지나치게 협조적이었다',
      '사라진 줄 알았던 물건을 가지고 있었다',
      '한밤중 정원을 파는 것이 목격됐다',
      '편지 한 통을 황급히 삼켜 버렸다',
      '사건 직후 손을 몇 번이나 씻었다',
      '피해자 이름이 나오자 말을 더듬었다',
      '벽난로에 서류를 던져 넣고 있었다',
      '평소 차던 시계를 그날 이후 차지 않는다',
      '아무도 묻지 않은 알리바이를 먼저 늘어놓았다',
      '사건 시각의 행적만 유독 흐릿하게 말한다',
    ],
  },
  {
    key: 'alibi', label: '알리바이', icon: '🕰️', desc: '사건 시각에 어디 있었다고 주장하는가',
    faces: [
      '혼자 서재에 있었다고 한다(증인 없음)',
      '단골 술집에 있었다는데 종업원은 기억 못 한다',
      '먼 도시 출장 중이었다고 주장한다',
      '아내와 함께 있었다고 하나 서로만 증언한다',
      '병원 진료를 받고 있었다고 한다',
      '극장에서 영화를 봤다며 표를 내민다',
      '집에서 잠들어 있었다고 한다',
      '기차 안이었다며 표를 제시한다',
      '교회에 있었다고 신부가 증언한다',
      '회의에 참석 중이었다는 기록이 있다',
      '폭우 속 산책을 했다고 한다',
      '전화 통화 기록으로 알리바이를 댄다',
      '여러 사람과 만찬 중이었다고 한다',
      '알리바이가 완벽해 오히려 의심스럽다',
      '도서관에서 책을 읽고 있었다고 한다',
      '택시를 탔다며 영수증을 내민다',
      '이웃집에 다녀왔다는데 그 집은 비어 있었다',
      '호텔에 묵었다고 하나 투숙 기록이 없다',
      '온천에서 요양 중이었다고 주장한다',
      '한밤중 차를 몰고 있었다고만 한다',
    ],
  },
  {
    key: 'clue', label: '결정적 단서', icon: '🔍', desc: '이 용의자에게 연결되는 물증·정황',
    faces: [
      '현장에 떨어진 단추가 그의 외투 것과 같다',
      '흉기에서 그만 아는 매듭법이 발견됐다',
      '피해자 손톱 밑 섬유가 그의 옷과 일치한다',
      '협박 편지의 필체가 그와 닮았다',
      '사라진 열쇠가 그의 서랍에서 나왔다',
      '독극물을 다룰 줄 아는 유일한 인물이다',
      '현장 시계가 그의 거짓 알리바이 시각에 멈췄다',
      '피 묻은 손수건에 그의 이니셜이 있다',
      '목격된 자동차 번호가 그의 것과 일치한다',
      '사건 직후 그의 통장에 거액이 입금됐다',
      '깨진 안경 조각이 그의 도수와 같다',
      '현장에 남은 향수가 그가 쓰는 것이다',
      '피해자 일기 마지막 장에 그의 이름이 있다',
      '사라진 그림이 그의 집에서 발견됐다',
      '발자국 크기와 걸음걸이가 그와 일치한다',
      '결정적 단서가 너무 깔끔해 조작이 의심된다',
      '흉기에 묻은 약품이 그의 직업과 관련 있다',
      '현장에 남은 담배가 그가 피우는 상표다',
      '깨진 단추에 그의 옷감 실밥이 엉켜 있다',
      '피해자의 마지막 전화가 그에게 걸려 있었다',
      '현장 진흙이 그의 신발 밑창에서 나왔다',
      '사라진 장부에 그의 이름만 지워져 있었다',
    ],
  },
]

// 한 용의자 = 슬롯 key → face 매핑 + 이름
interface Suspect { id: string; name: string; faces: Record<string, string> }

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const fmt = (n: number) => n.toLocaleString('ko-KR')
const uid = (p: string) => p + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)

// HTML 이스케이프 — 프로젝트 본문(HTML) 안전 주입.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 전체 슬롯 조합 수(이름 풀까지 곱하면 더 커지지만, 슬롯만으로도 표시).
const SLOT_COMBOS = SLOTS.reduce((acc, s) => acc * s.faces.length, 1)
const NAME_COMBOS = SURNAME.length * GIVEN.length + FOREIGN.length
const TOTAL_COMBOS = SLOT_COMBOS * NAME_COMBOS

function genSuspect(prev?: Suspect, locked?: Record<string, boolean>): Suspect {
  const faces: Record<string, string> = {}
  for (const s of SLOTS) {
    if (prev && locked && locked[s.key] && prev.faces[s.key]) { faces[s.key] = prev.faces[s.key]; continue }
    let f = pick(s.faces)
    if (prev && f === prev.faces[s.key] && s.faces.length > 1) f = pick(s.faces) // 연속 중복 완화
    faces[s.key] = f
  }
  const name = (prev && locked && locked.name) ? prev.name : pickName()
  return { id: prev?.id || uid('sus'), name, faces }
}

function suspectSummary(s: Suspect): string {
  return SLOTS.map((sl) => `${sl.icon} ${sl.label}: ${s.faces[sl.key]}`).join('\n')
}

// 용의자 카드 → 프로젝트/라이브러리 character 필드.
function toCharacterFields(s: Suspect, culprit: boolean): Record<string, string> {
  return {
    name: s.name,
    role: culprit ? '용의자 · ★진범 후보' : '용의자',
    relation: s.faces.relation,
    occupation: s.faces.job,
    motive: `표면: ${s.faces.surface} / 숨은: ${s.faces.hidden}`,
    secret: s.faces.secret,
    behavior: s.faces.behavior,
    alibi: s.faces.alibi,
    clue: s.faces.clue,
  }
}

// 정규(표준) 캐릭터 키로 맞춘 fields — 받는 허브(인물 시트/라이브러리)의 기본 칸에 제자리로 들어가게.
// 매핑: 직업→occupation, 표면+숨은 동기→motivation, 비밀→secret, 관계→relations.
//  알리바이·수상한 행동·결정적 단서는 정규 슬롯이 없어 notes 로 모은다.
function toCharacterFieldsCanon(s: Suspect, culprit: boolean): Record<string, string> {
  const notes = [
    `알리바이: ${s.faces.alibi || '—'}`,
    `수상한 행동: ${s.faces.behavior || '—'}`,
    `결정적 단서: ${s.faces.clue || '—'}`,
  ].join(' · ')
  return {
    name: s.name,
    role: culprit ? '용의자 · ★진범 후보' : '용의자',
    occupation: s.faces.job || '',
    motivation: `표면: ${s.faces.surface || '—'} / 숨은: ${s.faces.hidden || '—'}`,
    secret: s.faces.secret || '',
    relations: s.faces.relation || '',
    notes,
  }
}

interface Saved { id: string; name: string; faces: Record<string, string>; culprit: boolean; note: string }

export default function MysterySuspectForge({ payload }: { payload?: Record<string, unknown> }) {
  const genre = typeof payload?.genre === 'string' ? payload.genre : '미스터리·추리'

  // 현재 굴리는 한 명(잠금/재생성 작업대)
  const [current, setCurrent] = useState<Suspect>(() => genSuspect())
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)

  // 사용자 정의 항목(직접 적는 빈 칸) + 고정 '기타' 자유 입력.
  //  무작위 생성 시 '값'은 비우되 '항목(라벨)'은 유지한다(아래 clearCustom 참조).
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')
  const clearCustom = useCallback(() => { setCustom((prev) => prev.map((c) => ({ ...c, value: '' }))); setEtc('') }, [])
  const addCustom = () => {
    const label = window.prompt('추가할 항목 이름을 입력하세요 (예: 별명, 첫인상, 핵심 트릭)')?.trim()
    if (!label) return
    setCustom((prev) => [...prev, { id: uid('cf'), label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) => setCustom((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
  const removeCustom = (id: string) => setCustom((prev) => prev.filter((c) => c.id !== id))

  // 사용자 정의 항목(값이 있는 것만) + 기타 → fields 맵에 합치기(다른 도구로 그대로 전달).
  const withExtras = (fields: Record<string, string>): Record<string, string> => {
    const out = { ...fields }
    for (const c of custom) { const v = c.value.trim(); if (c.label && v) out[c.label] = v }
    const e = etc.trim(); if (e) out.etc = e
    return out
  }
  // 사용자 정의 항목·기타를 요약/복사 텍스트 끝에 덧붙인다(값이 있을 때만).
  const extrasSummary = (): string => {
    const lines: string[] = []
    for (const c of custom) { const v = c.value.trim(); if (c.label && v) lines.push(`• ${c.label}: ${v}`) }
    const e = etc.trim(); if (e) lines.push(`📝 기타: ${e}`)
    return lines.length ? '\n' + lines.join('\n') : ''
  }

  // 용의자 명단(이번 사건의 후보들) — 저장/복원
  const [list, setList] = useState<Saved[]>(() => {
    try {
      const raw = localStorage.getItem(LS)
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          return arr.filter((x) => x && typeof x.name === 'string' && x.faces).map((x, i) => ({
            id: typeof x.id === 'string' ? x.id : 'sv_' + i,
            name: String(x.name),
            faces: (x.faces && typeof x.faces === 'object') ? x.faces : {},
            culprit: !!x.culprit,
            note: typeof x.note === 'string' ? x.note : '',
          }))
        }
      }
    } catch { /* ignore */ }
    return []
  })

  const [tab, setTab] = useState<'forge' | 'list'>('forge')
  const [toast, setToast] = useState('')
  const [copiedKey, setCopiedKey] = useState('')
  const nonce = useRef(0)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 명단 영속
  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify(list)) } catch { /* ignore */ } }, [list])

  // 굴림 애니메이션 자동 해제(+언마운트 정리)
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 320)
    return () => window.clearTimeout(t)
  }, [rolling])

  // 토스트/복사 피드백 정리(언마운트 포함)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1800)
    return () => window.clearTimeout(t)
  }, [toast])
  useEffect(() => {
    if (!copiedKey) return
    const t = window.setTimeout(() => { if (mounted.current) setCopiedKey('') }, 1500)
    return () => window.clearTimeout(t)
  }, [copiedKey])

  const rollAll = useCallback(() => {
    const my = ++nonce.current
    setRolling(true)
    setCurrent((prev) => {
      if (my !== nonce.current) return prev
      return genSuspect(prev, locked)
    })
    clearCustom() // 새 캐릭터: 사용자 정의 항목의 값과 기타는 비우되, 항목(라벨)은 유지
  }, [locked, clearCustom])

  const rollOne = (key: string) => {
    setCurrent((prev) => {
      const slot = SLOTS.find((s) => s.key === key)
      if (!slot) return prev
      let f = pick(slot.faces)
      if (f === prev.faces[key] && slot.faces.length > 1) f = pick(slot.faces)
      return { ...prev, faces: { ...prev.faces, [key]: f } }
    })
  }
  const rollName = () => setCurrent((prev) => ({ ...prev, name: pickName() }))
  const toggleLock = (key: string) => setLocked((l) => ({ ...l, [key]: !l[key] }))

  // 현재 용의자를 명단에 추가
  const addToList = () => {
    setList((prev) => {
      if (prev.some((s) => s.id === current.id)) { setToast('이미 명단에 있는 용의자입니다.'); return prev }
      setToast(`용의자 "${current.name}"${hasJong(current.name) ? '을' : '를'} 명단에 추가했습니다.`)
      return [...prev, { id: current.id, name: current.name, faces: { ...current.faces }, culprit: false, note: '' }]
    })
    // 다음 용의자를 위해 새 id 부여(잠금 슬롯은 유지)
    setCurrent((prev) => ({ ...genSuspect(prev, locked), id: uid('sus') }))
    clearCustom() // 다음 용의자: 사용자 정의 값·기타 비움(라벨 유지)
  }

  const removeFromList = (id: string) => setList((prev) => prev.filter((s) => s.id !== id))
  const setNote = (id: string, note: string) => setList((prev) => prev.map((s) => (s.id === id ? { ...s, note } : s)))

  // 진범 후보 지정(한 명만) — 같은 용의자 다시 누르면 해제
  const markCulprit = (id: string) => setList((prev) => prev.map((s) => ({ ...s, culprit: s.id === id ? !s.culprit : false })))
  // 진범 후보 무작위 지정
  const rollCulprit = () => {
    setList((prev) => {
      if (prev.length === 0) { setToast('먼저 용의자를 명단에 추가하세요.'); return prev }
      const idx = Math.floor(Math.random() * prev.length)
      setToast(`🎲 진범 후보: ${prev[idx].name}`)
      return prev.map((s, i) => ({ ...s, culprit: i === idx }))
    })
  }
  const culpritId = list.find((s) => s.culprit)?.id || ''

  // 복사
  const copy = (key: string, text: string) => {
    const done = () => { if (mounted.current) setCopiedKey(key) }
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
    } catch { if (mounted.current) setToast('복사에 실패했습니다.') }
  }

  // 프로젝트 본문(HTML) — 용의자 한 명의 카드.
  const bodyHtmlFor = (s: Suspect | Saved, culprit: boolean, note?: string): string => {
    const rows = SLOTS.map((sl) => `<p><b>${escHtml(sl.icon + ' ' + sl.label)}:</b> ${escHtml(s.faces[sl.key] || '—')}</p>`).join('')
    return [
      `<p style="font-size:15px;"><b>${escHtml(s.name)}</b> ${culprit ? '<span style="color:#c0392b;">★ 진범 후보</span>' : '<span style="color:#888;">용의자</span>'}</p>`,
      `<hr/>`,
      rows,
      note ? `<p style="color:#888;">📝 ${escHtml(note)}</p>` : '',
    ].join('')
  }

  // 현재 용의자를 프로젝트(자료 › 인물)에 character 카드로 추가
  const addCurrentToProject = () => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물',
      title: `🕵️ ${current.name} (용의자)`,
      character: withExtras({ ...toCharacterFields(current, false), ...toCharacterFieldsCanon(current, false) }),
      bodyHtml: bodyHtmlFor(current, false),
      meta: { 분류: '용의자', 관계: current.faces.relation, 표면동기: current.faces.surface, 숨은동기: current.faces.hidden, 장르: genre },
    })
    setToast(id ? '프로젝트 〈자료 › 인물〉에 용의자 카드를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 명단의 한 용의자를 프로젝트에 추가
  const addSavedToProject = (s: Saved) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물',
      title: `🕵️ ${s.name} (${s.culprit ? '★진범 후보' : '용의자'})`,
      character: { ...toCharacterFields(s as unknown as Suspect, s.culprit), ...toCharacterFieldsCanon(s as unknown as Suspect, s.culprit) },
      bodyHtml: bodyHtmlFor(s, s.culprit, s.note),
      meta: { 분류: s.culprit ? '진범 후보' : '용의자', 관계: s.faces.relation, 표면동기: s.faces.surface, 숨은동기: s.faces.hidden, 장르: genre },
    })
    setToast(id ? `프로젝트에 "${s.name}"${hasJong(s.name) ? '을' : '를'} 추가했습니다.` : '프로젝트에 추가하지 못했습니다.')
  }

  // 명단 전체를 프로젝트에 일괄 추가
  const addAllToProject = () => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    if (list.length === 0) { setToast('명단이 비어 있습니다.'); return }
    let n = 0
    for (const s of list) {
      const id = addToProject({
        kind: 'character', root: 'research', folder: '인물',
        title: `🕵️ ${s.name} (${s.culprit ? '★진범 후보' : '용의자'})`,
        character: { ...toCharacterFields(s as unknown as Suspect, s.culprit), ...toCharacterFieldsCanon(s as unknown as Suspect, s.culprit) },
        bodyHtml: bodyHtmlFor(s, s.culprit, s.note),
        meta: { 분류: s.culprit ? '진범 후보' : '용의자', 관계: s.faces.relation, 표면동기: s.faces.surface, 숨은동기: s.faces.hidden, 장르: genre },
      })
      if (id) n++
    }
    setToast(n ? `프로젝트 〈자료 › 인물〉에 ${n}명을 추가했습니다.` : '프로젝트에 추가하지 못했습니다.')
  }

  // 인물 라이브러리에 저장(여러 도구 공유)
  const saveToLibrary = (s: Suspect | Saved, culprit: boolean) => {
    const traits = SLOTS.map((sl) => ({ k: sl.label, v: s.faces[sl.key] || '—' }))
    const c: Partial<SharedCharacter> = {
      name: s.name,
      role: culprit ? '용의자 · ★진범 후보' : '용의자',
      traits,
      goal: s.faces.surface,
      secret: s.faces.secret,
      personality: `숨은 동기: ${s.faces.hidden}`,
      notes: `관계: ${s.faces.relation} · 알리바이: ${s.faces.alibi} · 단서: ${s.faces.clue}`,
      source: '용의자·동기 생성기',
    }
    // 작업대(current)에서 보낼 때만 라이브 사용자 정의 항목·기타를 fields 에 합친다.
    const isCurrent = (s as Suspect).id === current.id
    const fields = toCharacterFieldsCanon(s as unknown as Suspect, culprit)
    addToLibrary('characters', { ...c, fields: isCurrent ? withExtras(fields) : fields } as Partial<SharedCharacter>)
    setToast(`인물 라이브러리에 "${s.name}"${hasJong(s.name) ? '을' : '를'} 저장했습니다.`)
  }

  // 인물 시트로 보내기(연계)
  const sendToSheet = (s: Suspect | Saved, culprit: boolean) => {
    // 작업대(current)에서 보낼 때만 라이브 사용자 정의 항목·기타를 fields 에 합친다.
    const isCurrent = (s as Suspect).id === current.id
    const fields = toCharacterFieldsCanon(s as unknown as Suspect, culprit)
    openToolLinked('character-sheet', { character: { ...toCharacterFields(s as unknown as Suspect, culprit), fields: isCurrent ? withExtras(fields) : fields }, genre })
    setToast('인물 시트로 보냈습니다.')
  }
  // 관계도 열기(연계) — 명단을 맥락으로
  const openRelMap = () => { openToolLinked('relationship-map', { genre, suspects: list.map((s) => s.name) }); setToast('인물 관계도를 열었습니다.') }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const cardBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>{genre === '미스터리·추리' ? '미스터리·추리' : genre}</b> · 관계·직업·표면동기·숨은동기·비밀·수상한 행동·알리바이·단서 슬롯을 굴려 입체적인 <b>용의자 카드</b>를 만드세요.
        마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴립니다. 여러 명을 <b>명단</b>에 모은 뒤 한 명을 <b>★진범 후보</b>로 가려보세요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'}
          style={{ borderColor: tab === 'forge' ? 'var(--accent)' : 'var(--border)', color: tab === 'forge' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🕵️"/> 용의자 생성
        </button>
        <button className="minibtn" onClick={() => setTab('list')} aria-pressed={tab === 'list'}
          style={{ borderColor: tab === 'list' ? 'var(--accent)' : 'var(--border)', color: tab === 'list' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🗂️"/> 용의자 명단 ({list.length})
        </button>
      </div>

      {tab === 'forge' && (
        <>
          {/* 이름 + 조합수 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}><Emoji e="🕵️"/></span>
              <span style={{ fontSize: 17, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current.name}</span>
              <button className="minibtn" onClick={() => toggleLock('name')} title={locked.name ? '이름 고정 해제' : '이름 고정'}
                style={{ borderColor: locked.name ? 'var(--accent)' : 'var(--border)', padding: '0 6px' }}><Emoji e={locked.name ? '🔒' : '🔓'}/></button>
              <button className="minibtn" onClick={rollName} disabled={!!locked.name} title="이름만 다시" style={{ padding: '0 6px' }}><Emoji e="🎲"/></button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            가능한 용의자 조합 <b style={{ color: 'var(--accent)' }}>{fmt(TOTAL_COMBOS)}</b>가지 이상 (슬롯 {fmt(SLOT_COMBOS)} × 이름 {fmt(NAME_COMBOS)})
          </div>

          {/* 슬롯 카드들 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {SLOTS.map((slot) => {
              const face = current.faces[slot.key]
              const isLocked = !!locked[slot.key]
              return (
                <div key={slot.key} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px' }}>
                  <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-12deg) scale(1.15)' : 'none' }}>
                    <Emoji e={slot.icon}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{slot.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }} title={slot.desc}>
                      {rolling && !isLocked ? '…' : face}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => toggleLock(slot.key)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)', padding: '0 6px' }}>
                    <Emoji e={isLocked ? '🔒' : '🔓'}/>
                  </button>
                  <button className="minibtn" onClick={() => rollOne(slot.key)} disabled={isLocked} title="이 슬롯만 다시" style={{ flexShrink: 0, padding: '0 6px' }}><Emoji e="🎲"/></button>
                </div>
              )
            })}

            {/* 사용자 정의 항목(직접 입력) — 무작위 생성 시 값은 비우고 라벨은 유지 */}
            {custom.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px dashed var(--border)', borderRadius: 10, padding: '9px 12px' }}>
                <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0 }}><Emoji e="✏️"/></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.label}</div>
                  <input
                    value={c.value}
                    onChange={(e) => setCustomValue(c.id, e.target.value)}
                    placeholder="직접 입력…"
                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 9px', fontSize: 14, fontFamily: 'inherit' }}
                  />
                </div>
                <button className="minibtn" onClick={() => removeCustom(c.id)} title="이 항목 삭제" style={{ flexShrink: 0, borderColor: 'var(--warn)', color: 'var(--warn)', padding: '0 6px' }}>✕</button>
              </div>
            ))}

            {/* ＋ 항목 추가 */}
            <button className="minibtn" onClick={addCustom} title="이름을 입력해 빈 입력칸을 추가합니다 (직접 작성)"
              style={{ alignSelf: 'flex-start', borderStyle: 'dashed' }}>＋ 항목 추가</button>

            {/* 고정 '기타' 자유 입력 */}
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="📝"/> 기타 (자유 메모 · 떠오르는 무엇이든)</div>
              <textarea
                value={etc}
                onChange={(e) => setEtc(e.target.value)}
                placeholder="이 용의자에 대해 자유롭게 적어 두세요 — 말버릇·복선·반전 아이디어 등…"
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 140 }} onClick={rollAll}><Emoji e="🎲"/> 용의자 생성 / 다시 굴리기</button>
            <button className="minibtn" onClick={addToList} title="이 용의자를 명단에 추가"><Emoji e="➕"/> 명단에 추가</button>
            <button className="minibtn" onClick={() => copy('cur', `${current.name} (용의자)\n${suspectSummary(current)}${extrasSummary()}`)}>
              {copiedKey === 'cur' ? '✓ 복사됨' : <><Emoji e="📋"/> 복사</>}
            </button>
          </div>

          {/* 연계 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={addCurrentToProject} disabled={!hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '현재 용의자를 프로젝트 자료 〈인물〉 폴더에 카드로 추가'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => saveToLibrary(current, false)}><Emoji e="📥"/> 인물 라이브러리</button>
            <button className="linkbtn" onClick={() => sendToSheet(current, false)}><Emoji e="🪪"/> 인물 시트로</button>
          </div>
        </>
      )}

      {tab === 'list' && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="minibtn" onClick={rollCulprit} disabled={list.length === 0} title="명단에서 진범 후보를 무작위로 지정"><Emoji e="🎲"/> 진범 후보 무작위</button>
            <button className="minibtn" onClick={addAllToProject} disabled={list.length === 0 || !hasProjectBridge()} title="명단 전체를 프로젝트에 추가"><Emoji e="📄"/> 전체 프로젝트에 추가</button>
            <button className="minibtn" onClick={openRelMap} disabled={list.length === 0} title="인물 관계도 열기"><Emoji e="🕸️"/> 관계도</button>
            {culpritId && <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>★ 진범 후보: {list.find((s) => s.id === culpritId)?.name}</span>}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
            {list.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="🗂️"/></div>
                명단에 용의자가 없습니다.<br />
                <span style={{ fontSize: 12 }}>‘용의자 생성’ 탭에서 <Emoji e="➕"/> 명단에 추가로 후보를 모은 뒤, 한 명을 ★진범 후보로 지목하세요.</span>
              </div>
            )}
            {list.map((s) => (
              <div key={s.id} style={{ ...cardBox, borderColor: s.culprit ? 'var(--accent)' : 'var(--border)', boxShadow: s.culprit ? '0 0 0 1px var(--accent)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{s.culprit ? '★ ' : <><Emoji e="🕵️"/>{' '}</>}{s.name}</span>
                  {s.culprit && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px' }}>진범 후보</span>}
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => markCulprit(s.id)} title={s.culprit ? '진범 후보 해제' : '진범 후보로 지목'}
                    style={{ borderColor: s.culprit ? 'var(--accent)' : 'var(--border)' }}>{s.culprit ? '★' : '☆'}</button>
                  <button className="minibtn" onClick={() => copy('l' + s.id, `${s.name} (용의자)\n${suspectSummary(s as unknown as Suspect)}`)} title="복사">
                    {copiedKey === 'l' + s.id ? '✓' : <Emoji e="📋"/>}
                  </button>
                  <button className="minibtn" onClick={() => removeFromList(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑"/></button>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{suspectSummary(s as unknown as Suspect)}</div>
                <textarea
                  value={s.note}
                  onChange={(e) => setNote(s.id, e.target.value)}
                  placeholder="이 용의자에 대한 메모(의심 정황·트릭·반전 아이디어)…"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
                <div className="linkbar">
                  <span className="linkbar-label">연계:</span>
                  <button className="linkbtn" onClick={() => addSavedToProject(s)} disabled={!hasProjectBridge()}
                    title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 용의자를 프로젝트 자료 〈인물〉 폴더에 카드로 추가'}>
                    <Emoji e="📄"/> 프로젝트에 추가
                  </button>
                  <button className="linkbtn" onClick={() => saveToLibrary(s, s.culprit)}><Emoji e="📥"/> 라이브러리</button>
                  <button className="linkbtn" onClick={() => sendToSheet(s, s.culprit)}><Emoji e="🪪"/> 인물 시트로</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{emojify(toast)}</div>}
      <div style={hint}>용의자 카드는 출발점입니다. 진범 후보 하나, 강력한 가짜 단서 여럿 — 공정한 단서와 의외의 범인으로 독자를 속여보세요.</div>
    </div>
  )
}
