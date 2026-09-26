// 우주선·함선 생성기 — SF·과학소설 전용. 한 척의 함선을 슬롯 조합으로 빚어낸다.
//  각 함선은 (함급 × 추진방식 × 무장 × 보조무장 × 방어체계 × 주임무·용도 × 동력원 × 선체 형태 ×
//   특이 결함 × 승무원 구성 × 함명)을 로컬 표에서 한 조각씩 뽑아 입체적인 제원 카드로 조립한다.
//  마음에 드는 슬롯은 🔒로 고정하고 나머지만 다시 굴린다(잠금/재생성). 가능한 조합 수는 수억 이상.
//  생성한 함선을 함대 명단에 모으고, 한 척을 ★기함(flagship)으로 지정해 함대의 중심을 잡는다.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(명단)만 사용. 외부 API 불필요.
// 연계(linkbus): 함선을 자료('research')/'세계관' 폴더 문서로 추가(addToProject), 한 줄 제원을
//  스니펫 라이브러리(snippets)에 저장, 배경 설정집·세계관 위키 등 관련 도구를 데이터와 함께 연다.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'sf-starship-forge', name: '우주선·함선 생성기', icon: '🚀', group: '생성기', genre: 'SF·과학소설', intro: '함급·추진방식·무장·용도·동력원·특이결함·승무원 구성을 조합해 함선 제원을 대량 생성하세요(수억 조합)', w: 620, h: 700 }

const LS = 'sry:tool:sf-starship-forge'

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const fmt = (n: number) => n.toLocaleString('ko-KR')
const uid = (p: string) => p + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)

// HTML 이스케이프 — 프로젝트 본문(HTML) 안전 주입.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ---------------- 함명 풀(작명 영감) ----------------
// 접두(소속·군함 분류) × 형용 × 명사 + 선택적 일련번호로 무수한 함명을 빚는다.
const SHIP_PREFIX = ['ISV', 'TSS', 'CNS', 'UNS', 'RSV', 'HMS', '제국함', '연방함', '항성함', '심연호', '개척함', '순례함', 'IFV', 'GSC', '동맹함', '자유함', '성단함']
const SHIP_ADJ = [
  '불멸의', '잊혀진', 'last', '새벽', '심연', '영원의', '침묵하는', '끝없는', '붉은', '강철',
  '여명', '황혼', '폭풍', '서리', '잿빛', '창백한', '굶주린', '꺼지지 않는', '머나먼', '고독한',
  '신성한', '저주받은', '눈먼', '천 개의', '마지막',
  '빛나는', '얼어붙은', '깨어난', '떠도는', '용맹한', '비밀스러운', '머나먼 별의', '꺼진', '눈부신', '잠든',
]
const SHIP_NOUN = [
  '여명', '방랑자', '심판', '약속', '망각', '나침반', '등불', '창', '방패', '날개',
  '서약', '메아리', '유성', '혜성', '특이점', '지평선', '항적', '돛', '닻', '나선',
  '불사조', '리바이어던', '오디세이', '프로메테우스', '이카로스', '안타레스', '베가', '시리우스', '오리온', '안드로메다',
  '바람', '재', '서리', '여울', '심해', '북극성', '귀환', '유랑', '개척', '순례',
  '여신', '검', '왕관', '횃불', '서막', '종소리', '신기루', '성좌', '은하', '여명빛',
]
const pickShipName = (): string => {
  const usePrefix = Math.random() < 0.6
  const useAdj = Math.random() < 0.7
  const useNum = Math.random() < 0.35
  let core = ''
  if (useAdj) core = pick(SHIP_ADJ) + ' ' + pick(SHIP_NOUN) + '호'
  else core = pick(SHIP_NOUN) + '호'
  const head = usePrefix ? pick(SHIP_PREFIX) + ' ' : ''
  const tail = useNum ? '-' + (Math.floor(Math.random() * 89) + 11) : ''
  return (head + core + tail).trim()
}
// 함명 풀 규모(대략): (접두 prefix+무) × (형용 adj+무) × 명사 × 번호효과
const NAME_COMBOS = (SHIP_PREFIX.length + 1) * (SHIP_ADJ.length + 1) * SHIP_NOUN.length * 5

// ---------------- 슬롯 정의 ----------------
interface Slot { key: string; label: string; icon: string; desc: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'cls', label: '함급', icon: '🛰️', desc: '함선의 크기·등급. 톤수와 역할의 척도',
    faces: [
      '단좌식 우주전투기(스타파이터)', '경량 셔틀', '쾌속 코르벳', '호위 프리깃', '경순양함',
      '중순양함', '전투순양함', '주력 전함(드레드노트)', '초중량 전함(슈퍼드레드노트)', '항성모함(캐리어)',
      '강습상륙함', '구축함', '초계함(슬루프)', '나포·해적선', '대형 화물선(벌커)',
      '광물 채굴선', '심우주 탐사선', '식민 이주선(슬리퍼)', '세대 우주선(제너레이션 십)', '병원선(메디컬 프리깃)',
      '기함급 모함(머더십)', '잠항 스텔스함', '궤도 요새(스테이션-함)', '나노 정찰 드론모선', '거대 방주함(아크)',
      '쾌속 정보함(스카우트)', '예인·구난 터그선', '기뢰 부설함', '대잠 사냥꾼(헌터킬러)', '궤도 견인선(오비탈 터그)',
      '무인 자동전투함(드론십)', '항법 등대함(라이트하우스)',
    ],
  },
  {
    key: 'drive', label: '추진방식', icon: '🌀', desc: '항성 간·항성 내 이동을 가능케 하는 핵심 추진계',
    faces: [
      '알큐비에레 워프 버블', '하이퍼드라이브(아공간 도약)', '점프 게이트 연동 도약', '웜홀 천공 항법', '폴드 드라이브(공간 접기)',
      '이온 추진(저추력·고효율)', '핵융합 토치 드라이브', '반물질 소멸 추진', '벅서드 램제트(성간 수소 포집)', '솔라/레이저 세일',
      '중력파 서핑 드라이브', '진공 영점에너지 추진', '디랙 해 추진', '텐서 곡률 엔진', '특이점 견인(블랙홀 드라이브)',
      '초광속 불가·아광속 토치만', '아광속 핵펄스(오리온형)', '플라즈마 자기노즐(VASIMR형)', '시간 위상 변조 항법', '양자 터널 점프',
      '곡률 카타펄트 사출 도약', '중력 슬링샷 가속 항법', '아공간 견인 케이블 항법', '광압 추진 마이크로세일',
    ],
  },
  {
    key: 'main', label: '주무장', icon: '💥', desc: '함의 결정타를 맡는 대형 병기',
    faces: [
      '스파이널 마운트 레일건', '대출력 입자 빔포', '집속 레이저 어레이', '플라즈마 캐넌 포탑', '대함 어뢰 발사관',
      '유도 핵미사일 클러스터', '반물질 탄두 어뢰', '가우스 매스 드라이버', '중성자 빔 랜스', '광자 어뢰',
      '디럽터 메인 캐넌', '중력자 충격포(그래브 캐넌)', '위상 변조 빔(페이저)', '동역학 충각(램쉽)', '궤도 폭격 매스 봉(텅스텐 신의 막대)',
      '국소 특이점 투사기', '나노 해체 미사일', '전자기 펄스 대형포(EMP 랜스)', '초공동 운동탄 어뢰', '무장 없음(비무장·민수)',
      '메탈수소 작약 함포', '집속 마이크로파 방사포', '양자 얽힘 교란 어뢰', '소형 핵분열 기뢰탄 투사기',
    ],
  },
  {
    key: 'sec', label: '보조무장', icon: '🔫', desc: '근접 방어·소형 표적 대응을 위한 부무장',
    faces: [
      '회전식 펄스 레이저 포탑(CIWS)', '대공/대미사일 점사포', '근접 산탄 빔', '소형 유도 드론 벌떼', '기뢰 살포기',
      '전자전 재머·디코이', '에너지 그물 발사기', '단거리 요격 미사일', '플라즈마 기관포 다연장', '대인 펄스 포(보딩 대응)',
      '나노 부식 분무기', '음파/진동 충격기', '스텔스 어뢰 베이', '드론 모함 베이', '보조무장 미장착',
      '레이저 점멸 교란 섬광기', '채프·플레어 살포기', '근접 그래플 작살포', '소형 요격 빔 다발',
    ],
  },
  {
    key: 'def', label: '방어체계', icon: '🛡️', desc: '함을 지키는 장갑·차폐·회피의 종합',
    faces: [
      '편향 에너지 실드(디플렉터)', '적층 합금 장갑판', '능동 점멸 위상 실드', '플라즈마 코로나 차폐막', '자기병 차폐(자기장 돔)',
      '나노 자가복구 선체', '복사 흡수 스텔스 도장', '관성 흡수 댐퍼 장갑', '아블레이티브 희생 장갑', '중력 굴절 차폐',
      '점프 회피 단거리 도약', '디코이 홀로그램 군집', '냉각 클로크(열 차폐)', '능동 기뢰막', '구식 두꺼운 강철 외피',
      '실드 없음(장갑에만 의존)', '미러필드(빔 반사막)', '양자 위상 차폐', '드론 호위막', '관제 회피 AI 기동',
      '플라즈마 윈도 방벽', '소립자 산란 차폐장', '자기 유체 장갑(스마트 아머)', '관성 상쇄 점프 회피',
    ],
  },
  {
    key: 'role', label: '주임무·용도', icon: '🎯', desc: '이 함이 존재하는 목적과 전형적 임무',
    faces: [
      '제해권 확보·함대 결전', '국경 초계·순찰', '호송·호위', '심우주 탐사·측량', '식민·이주 수송',
      '구난·인양', '첩보·정찰', '봉쇄·임검', '강습·상륙 투사', '궤도 폭격·지상 지원',
      '화물·물류 운송', '자원 채굴·정제', '외교·기함 임무', '난민·인도주의 구호', '해적·약탈',
      '밀수·암거래', '연구·실험 플랫폼', '의료·후송', '통신 중계·전자전', '유물 회수·고고학 발굴',
      '테러·게릴라 기습', '의례·기함 퍼레이드', '관광·유람', '시간선 감시·순찰',
      '항로 개척·측지', '우주 정거장 보급', '전장 회수·정비 모함', '포로·죄수 호송',
    ],
  },
  {
    key: 'power', label: '동력원', icon: '⚡', desc: '함의 모든 계통을 먹이는 심장',
    faces: [
      '중수소-삼중수소 핵융합로', '반물질 소멸 반응로', '미니 특이점(인공 블랙홀) 발전', '진공 영점에너지 탭', '항성 직접 채열(다이슨 탭)',
      '동위원소 열전(RTG) 다발', '플라즈마 자기 가둠로', '제로포인트 양자 코어', '초임계 토륨 분열로', '엑조틱 물질 반응로',
      '태양광·축전 하이브리드', '지오뉴트리노 포집기', '엔탱글먼트 무선 송전 수신', '암흑물질 촉매로', '고대 유물 동력핵(불명 원리)',
      '뮤온 촉매 핵융합로', '헬륨-3 분열 반응로', '진공 붕괴 에너지 탭', '초전도 자기 저장 코어',
    ],
  },
  {
    key: 'hull', label: '선체 형태', icon: '🚢', desc: '실루엣과 구조 양식 — 첫인상을 결정',
    faces: [
      '날렵한 화살촉형', '원통형 회전 거주구', '비대칭 채굴 골조', '거대한 쐐기형 전함', '구체 코어+링 구조',
      '곤충형 다관절 골격', '평평한 가오리형 스텔스', '난잡한 누더기 개조선', '결정질 유기체형 선체', '대칭 쌍동선(카타마란)',
      '두꺼운 벽돌형 화물함', '우아한 백조형 유람선', '가시 돋친 약탈선', '모듈 도킹 군집형', '유선형 고래형 모함',
      '바늘처럼 가는 정찰침', '고대 폐허를 두른 융합 선체', '살아있는 듯한 생체 선체', '얼음으로 코팅된 혜성 위장선', '미완성 노출 골조',
      '바람개비형 회전 추진 선체', '도넛형 거주 링 선체', '뾰족한 다이아몬드형 돌격선', '거대한 깔때기형 채집선',
    ],
  },
  {
    key: 'flaw', label: '특이 결함·약점', icon: '⚠️', desc: '극적 긴장을 만드는 치명적 한계 — 이야기의 불씨',
    faces: [
      '워프 코어가 과열되면 폭주한다', '실드 재충전에 치명적 공백이 있다', '선미 추진부가 사각이라 무방비다', '냉각계가 노후해 장시간 전투 불가',
      'AI 인격이 명령을 자의적으로 해석한다', '항법 컴퓨터가 특정 좌표에서 멈춘다', '선체 한쪽이 응급 용접으로 버티는 중', '연료 누출 흔적을 적에게 들킨다',
      '구형 IFF라 아군 식별에 오류가 잦다', '생명유지 산소가 정원의 70%뿐', '점프 후 수 분간 모든 계통이 마비된다', '핵심 부품이 단종돼 수리가 불가능',
      '선내 중력이 불규칙하게 끊긴다', '통신 암호가 적에게 이미 뚫렸다', '주무장 발사 시 자체 전력이 고갈된다', '선장만이 아는 비밀 격실이 있다',
      '오래된 저주·유령 소문이 선원을 좀먹는다', '센서가 특정 방사선에 눈이 먼다', '도킹 클램프가 헐거워 분리 위험', '장갑 한 점만 명중하면 탄약고가 유폭한다',
      '항법사가 없으면 점프조차 못 한다', '예비 동력이 전무해 한 방이면 표류', '함체 떨림으로 정밀 사격이 빗나간다', '비밀 화물이 적의 추적 표적이다',
      '실드 발생기가 특정 주파수에 취약하다', '비상 탈출정이 정원의 절반뿐이다', '선체 도료가 벗겨져 레이더에 환히 잡힌다', '핵심 배선이 한 다발로 묶여 한 발에 마비된다',
    ],
  },
  {
    key: 'crew', label: '승무원 구성', icon: '🧑‍🚀', desc: '함을 움직이는 사람·존재들의 면면',
    faces: [
      '단독 항해사 한 명과 AI', '베테랑과 풋내기 두 명뿐', '12인 정예 특공대', '50여 명의 다민족 혼성 승조원', '수백 명 규모의 정규 함대 승조원',
      '전원 사이보그 강화병', '인간과 외계 종족의 혼성 팀', '동면 중인 식민 이주민 + 소수 당직조', '범죄자로 꾸려진 자살특공대', '신참 사관후보생 훈련 항해조',
      '전원 클론 병사', '반란으로 선장을 잃은 무질서한 잔존조', '안드로이드 승조원과 인간 선장 한 명', '가족 단위로 대를 잇는 세대 승조원', '유령처럼 말 없는 광신 교단 신도들',
      '용병 계약직 혼성 크루', '의료진 중심의 인도주의 팀', '과학자·연구원 위주 탐사대', '해적 두목과 충성스런 부하들', '인공지능이 단독 운용(승무원 없음)',
      '망명 귀족과 호위 기사단', '서로를 믿지 못하는 임시 연합조', '단 한 명의 생존자', '자아를 가진 함선 그 자체',
      '퇴역을 앞둔 노병들의 마지막 항해조', '외계 외교 사절단과 통역관들', '징집된 민간 기술자 임시조', '계급장을 떼인 강등 장교와 부하들',
    ],
  },
]

// 한 척 = 슬롯 key → face 매핑 + 함명
interface Ship { id: string; name: string; faces: Record<string, string> }

// 전체 슬롯 조합 수(함명 풀까지 곱하면 더 커진다).
const SLOT_COMBOS = SLOTS.reduce((acc, s) => acc * s.faces.length, 1)
const TOTAL_COMBOS = SLOT_COMBOS * NAME_COMBOS

function genShip(prev?: Ship, locked?: Record<string, boolean>): Ship {
  const faces: Record<string, string> = {}
  for (const s of SLOTS) {
    if (prev && locked && locked[s.key] && prev.faces[s.key]) { faces[s.key] = prev.faces[s.key]; continue }
    let f = pick(s.faces)
    if (prev && f === prev.faces[s.key] && s.faces.length > 1) f = pick(s.faces) // 연속 중복 완화
    faces[s.key] = f
  }
  const name = (prev && locked && locked.name) ? prev.name : pickShipName()
  return { id: prev?.id || uid('ship'), name, faces }
}

function shipSummary(s: Ship): string {
  return SLOTS.map((sl) => `${sl.icon} ${sl.label}: ${s.faces[sl.key]}`).join('\n')
}

// 한 줄 제원(스니펫·복사용)
function shipOneLine(s: Ship): string {
  const f = s.faces
  return `${s.name} — ${f.cls} / ${f.role}. ${f.drive} 추진, 주무장 ${f.main}. 약점: ${f.flaw}`
}

interface Saved { id: string; name: string; faces: Record<string, string>; flagship: boolean; note: string }

export default function SfStarshipForge({ payload }: { payload?: Record<string, unknown> }) {
  const genre = typeof payload?.genre === 'string' ? payload.genre : 'SF·과학소설'

  // 현재 굴리는 한 척(잠금/재생성 작업대)
  const [current, setCurrent] = useState<Ship>(() => genShip())
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)

  // 함대 명단 — 저장/복원
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
            flagship: !!x.flagship,
            note: typeof x.note === 'string' ? x.note : '',
          }))
        }
      }
    } catch { /* ignore */ }
    return []
  })

  // 사용자 정의 항목(라벨+값) — 자율 추가. 무작위 생성 대상 아님(미리 만든 데이터 없음).
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  // 고정 '기타' 자유 입력 — 항상 보이며 기본 비어 있음.
  const [etc, setEtc] = useState('')

  const [tab, setTab] = useState<'forge' | 'fleet'>('forge')
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
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1900)
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
    clearUserFields() // 새로 굴리면 사용자 정의 값·기타는 비운다(항목 정의는 유지)
    setCurrent((prev) => {
      if (my !== nonce.current) return prev
      return genShip(prev, locked)
    })
  }, [locked])

  const rollOne = (key: string) => {
    setCurrent((prev) => {
      const slot = SLOTS.find((s) => s.key === key)
      if (!slot) return prev
      let f = pick(slot.faces)
      if (f === prev.faces[key] && slot.faces.length > 1) f = pick(slot.faces)
      return { ...prev, faces: { ...prev.faces, [key]: f } }
    })
  }
  const rollName = () => setCurrent((prev) => ({ ...prev, name: pickShipName() }))
  const toggleLock = (key: string) => setLocked((l) => ({ ...l, [key]: !l[key] }))

  // 사용자 정의 항목 — 추가/값변경/삭제. 무작위 생성하지 않고 사용자가 직접 적는다.
  const addCustom = () => {
    const label = (window.prompt('추가할 항목 이름을 입력하세요 (예: 격납고, 통신 콜사인, 모항)') || '').trim()
    if (!label) return
    setCustom((prev) => [...prev, { id: uid('cf'), label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) => setCustom((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
  const removeCustom = (id: string) => setCustom((prev) => prev.filter((c) => c.id !== id))
  // 무작위 생성 시 사용자 정의 '값'과 '기타'를 비운다(항목 정의·라벨은 유지).
  const clearUserFields = () => { setCustom((prev) => prev.map((c) => ({ ...c, value: '' }))); setEtc('') }

  // 사용자 정의·기타를 엔티티 fields 맵에 합치기(비어있지 않은 것만). 다른 도구에 그대로 나타나게.
  const mergeUserFields = (base: Record<string, string>): Record<string, string> => {
    const out = { ...base }
    for (const c of custom) { const l = c.label.trim(); if (l && c.value.trim()) out[l] = c.value }
    if (etc.trim()) out.etc = etc
    return out
  }
  // 사용자 정의·기타를 텍스트(복사·요약)에 덧붙이기.
  const userFieldsText = (): string => {
    const lines: string[] = []
    for (const c of custom) { const l = c.label.trim(); if (l && c.value.trim()) lines.push(`${l}: ${c.value}`) }
    if (etc.trim()) lines.push(`기타: ${etc}`)
    return lines.length ? '\n' + lines.join('\n') : ''
  }

  // 현재 함선을 함대에 추가
  const addToFleet = () => {
    setList((prev) => {
      if (prev.some((s) => s.id === current.id)) { setToast('이미 함대에 있는 함선입니다.'); return prev }
      setToast(`함선 "${current.name}"을(를) 함대에 편입했습니다.`)
      return [...prev, { id: current.id, name: current.name, faces: { ...current.faces }, flagship: false, note: '' }]
    })
    // 다음 함선을 위해 새 id 부여(잠금 슬롯은 유지)
    clearUserFields() // 새 함선이므로 사용자 정의 값·기타 비움(항목 정의는 유지)
    setCurrent((prev) => ({ ...genShip(prev, locked), id: uid('ship') }))
  }

  const removeFromFleet = (id: string) => setList((prev) => prev.filter((s) => s.id !== id))
  const setNote = (id: string, note: string) => setList((prev) => prev.map((s) => (s.id === id ? { ...s, note } : s)))

  // 기함 지정(한 척만) — 같은 함선 다시 누르면 해제
  const markFlagship = (id: string) => setList((prev) => prev.map((s) => ({ ...s, flagship: s.id === id ? !s.flagship : false })))
  const flagshipId = list.find((s) => s.flagship)?.id || ''

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

  // 프로젝트 본문(HTML) — 함선 한 척의 제원 카드.
  const bodyHtmlFor = (s: Ship | Saved, flagship: boolean, note?: string, withUser?: boolean): string => {
    const rows = SLOTS.map((sl) => `<p><b>${escHtml(sl.icon + ' ' + sl.label)}:</b> ${escHtml(s.faces[sl.key] || '—')}</p>`).join('')
    // 사용자 정의 항목·기타(현재 함선에 한해, 비어있지 않은 것만)
    const userRows = withUser
      ? custom.filter((c) => c.label.trim() && c.value.trim()).map((c) => `<p><b>${escHtml(c.label)}:</b> ${escHtml(c.value)}</p>`).join('')
        + (etc.trim() ? `<p><b>${escHtml('기타')}:</b> ${escHtml(etc)}</p>` : '')
      : ''
    return [
      `<p style="font-size:15px;"><b>${escHtml(s.name)}</b> ${flagship ? '<span style="color:#c79a3a;">★ 기함</span>' : '<span style="color:#888;">함선</span>'}</p>`,
      `<p style="color:#888;">${escHtml(shipOneLine(s as Ship))}</p>`,
      `<hr/>`,
      rows,
      userRows,
      note ? `<p style="color:#888;">📝 ${escHtml(note)}</p>` : '',
    ].join('')
  }

  // 함선 한 척을 프로젝트(자료 › 세계관)에 문서로 추가
  const addOneToProject = (s: Ship | Saved, flagship: boolean, note?: string, withUser?: boolean) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return false }
    const baseMeta: Record<string, string> = {
      분류: flagship ? '기함' : '함선', 함급: s.faces.cls, 추진: s.faces.drive,
      주무장: s.faces.main, 용도: s.faces.role, 동력원: s.faces.power, 장르: genre,
    }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '세계관',
      title: `🚀 ${s.name} (${flagship ? '★기함' : '함선'})`,
      bodyHtml: bodyHtmlFor(s, flagship, note, withUser),
      meta: withUser ? mergeUserFields(baseMeta) : baseMeta,
    })
    return !!id
  }

  // 현재 함선을 프로젝트에 추가
  const addCurrentToProject = () => {
    const ok = addOneToProject(current, false, undefined, true)
    if (ok) setToast('프로젝트 〈자료 › 세계관〉에 함선 카드를 추가했습니다.')
    else if (hasProjectBridge()) setToast('프로젝트에 추가하지 못했습니다.')
  }
  // 명단의 한 함선을 프로젝트에 추가
  const addSavedToProject = (s: Saved) => {
    const ok = addOneToProject(s, s.flagship, s.note)
    if (ok) setToast(`프로젝트에 "${s.name}"을(를) 추가했습니다.`)
    else if (hasProjectBridge()) setToast('프로젝트에 추가하지 못했습니다.')
  }
  // 함대 전체를 프로젝트에 일괄 추가
  const addAllToProject = () => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    if (list.length === 0) { setToast('함대가 비어 있습니다.'); return }
    let n = 0
    for (const s of list) { if (addOneToProject(s, s.flagship, s.note)) n++ }
    setToast(n ? `프로젝트 〈자료 › 세계관〉에 ${n}척을 추가했습니다.` : '프로젝트에 추가하지 못했습니다.')
  }

  // 스니펫 라이브러리에 한 줄 제원 저장(여러 도구 공유)
  const saveToLibrary = (s: Ship | Saved) => {
    addToLibrary('snippets', { text: shipOneLine(s as Ship), source: '우주선·함선 생성기', tags: ['SF', '함선', s.faces.cls] })
    setToast(`스니펫 라이브러리에 "${s.name}" 제원을 저장했습니다.`)
  }

  // 배경 설정집으로 보내기(연계) — 함을 무대 설정으로
  // 함선 슬롯 → 장소 정규 키 매핑(추가). 받는 허브(배경 설정집)에서 항목이 제자리 칸에 들어가게 한다.
  const placeFieldsFor = (s: Ship | Saved, withUser?: boolean): Record<string, string> => {
    const f = s.faces || {}
    const base: Record<string, string> = {
      name: s.name,
      kind: '우주선',
      appearance: f.hull || '',                 // 선체 형태(실루엣·첫인상) → 외형
      inhabitants: f.crew || '',                // 승무원 구성 → 거주자
      dangers: f.flaw || '',                    // 특이 결함·약점 → 위험요소
      history: f.role || '',                    // 주임무·용도 → 내력/배경 임무
      notes: shipSummary(s as Ship),            // 전체 제원 요약 → 메모
    }
    return withUser ? mergeUserFields(base) : base
  }
  const sendToSetting = (s: Ship | Saved, withUser?: boolean) => {
    openToolLinked('setting-bible', { genre, place: { name: s.name, kind: '우주선', notes: shipSummary(s as Ship), fields: placeFieldsFor(s, withUser) } })
    setToast('배경 설정집으로 보냈습니다.')
  }
  // 세계관 위키 열기(연계) — 함대를 맥락으로
  const openWiki = () => { openToolLinked('world-wiki', { genre, ships: list.map((s) => s.name) }); setToast('세계관 위키를 열었습니다.') }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const cardBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>{genre === 'SF·과학소설' ? 'SF·과학소설' : genre}</b> · 함급·추진방식·무장·방어·용도·동력원·선체·결함·승무원 슬롯을 굴려 입체적인 <b>함선 제원</b>을 만드세요.
        마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴립니다. 여러 척을 <b>함대</b>에 모은 뒤 한 척을 <b>★기함</b>으로 지정하세요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'}
          style={{ borderColor: tab === 'forge' ? 'var(--accent)' : 'var(--border)', color: tab === 'forge' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🚀"/> 함선 생성
        </button>
        <button className="minibtn" onClick={() => setTab('fleet')} aria-pressed={tab === 'fleet'}
          style={{ borderColor: tab === 'fleet' ? 'var(--accent)' : 'var(--border)', color: tab === 'fleet' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🛸"/> 함대 명단 ({list.length})
        </button>
      </div>

      {tab === 'forge' && (
        <>
          {/* 함명 + 조합수 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}><Emoji e="🚀"/></span>
              <span style={{ fontSize: 17, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current.name}</span>
              <button className="minibtn" onClick={() => toggleLock('name')} title={locked.name ? '함명 고정 해제' : '함명 고정'}
                style={{ borderColor: locked.name ? 'var(--accent)' : 'var(--border)', padding: '0 6px' }}>{locked.name ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
              <button className="minibtn" onClick={rollName} disabled={!!locked.name} title="함명만 다시" style={{ padding: '0 6px' }}><Emoji e="🎲"/></button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            가능한 함선 조합 <b style={{ color: 'var(--accent)' }}>{fmt(TOTAL_COMBOS)}</b>가지 이상 (슬롯 {fmt(SLOT_COMBOS)} × 함명 약 {fmt(NAME_COMBOS)})
          </div>

          {/* 슬롯 카드들 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {SLOTS.map((slot) => {
              const face = current.faces[slot.key]
              const isLocked = !!locked[slot.key]
              const danger = slot.key === 'flaw'
              return (
                <div key={slot.key} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid ' + (danger ? 'var(--warn)' : 'var(--border)'), borderRadius: 10, padding: '9px 12px' }}>
                  <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-12deg) scale(1.15)' : 'none' }}>
                    <Emoji e={slot.icon}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: danger ? 'var(--warn)' : 'var(--muted)' }}>{slot.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }} title={slot.desc}>
                      {rolling && !isLocked ? '…' : face}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => toggleLock(slot.key)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)', padding: '0 6px' }}>
                    {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                  </button>
                  <button className="minibtn" onClick={() => rollOne(slot.key)} disabled={isLocked} title="이 슬롯만 다시" style={{ flexShrink: 0, padding: '0 6px' }}><Emoji e="🎲"/></button>
                </div>
              )
            })}

            {/* 사용자 정의 항목 — 직접 적는 칸. 무작위 생성 대상 아님(새로 굴리면 값만 비움). */}
            {custom.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px dashed var(--border)', borderRadius: 10, padding: '9px 12px' }}>
                <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0 }}><Emoji e="📝"/></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</div>
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

            <button className="minibtn" onClick={addCustom} title="직접 적는 사용자 정의 항목을 추가" style={{ alignSelf: 'flex-start' }}>＋ 항목 추가</button>

            {/* 고정 '기타' 자유 입력 — 항상 보임. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="📝"/> 기타</div>
              <textarea
                value={etc}
                onChange={(e) => setEtc(e.target.value)}
                placeholder="자유롭게 적으세요(설계 비화·소속 함대·전적·미해결 비밀·기타 메모 등)…"
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 140 }} onClick={rollAll}><Emoji e="🎲"/> 함선 생성 / 다시 굴리기</button>
            <button className="minibtn" onClick={addToFleet} title="이 함선을 함대에 편입"><Emoji e="➕"/> 함대에 편입</button>
            <button className="minibtn" onClick={() => copy('cur', `${current.name}\n${shipSummary(current)}${userFieldsText()}`)}>
              {copiedKey === 'cur' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
          </div>

          {/* 연계 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={addCurrentToProject} disabled={!hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '현재 함선을 프로젝트 자료 〈세계관〉 폴더에 문서로 추가'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => saveToLibrary(current)}><Emoji e="📥"/> 스니펫 저장</button>
            <button className="linkbtn" onClick={() => sendToSetting(current, true)}><Emoji e="🗺️"/> 배경 설정집으로</button>
          </div>
        </>
      )}

      {tab === 'fleet' && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="minibtn" onClick={addAllToProject} disabled={list.length === 0 || !hasProjectBridge()} title="함대 전체를 프로젝트에 추가"><Emoji e="📄"/> 전체 프로젝트에 추가</button>
            <button className="minibtn" onClick={openWiki} disabled={list.length === 0} title="세계관 위키 열기"><Emoji e="📚"/> 세계관 위키</button>
            <button className="minibtn" onClick={() => copy('fleet', list.map((s) => shipOneLine(s as Ship)).join('\n'))} disabled={list.length === 0} title="함대 전체 한 줄 제원 복사">
              {copiedKey === 'fleet' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 전체 복사</>}
            </button>
            {flagshipId && <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>★ 기함: {list.find((s) => s.id === flagshipId)?.name}</span>}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
            {list.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="🛸"/></div>
                함대에 함선이 없습니다.<br />
                <span style={{ fontSize: 12 }}>‘함선 생성’ 탭에서 <Emoji e="➕"/> 함대에 편입으로 함선을 모은 뒤, 한 척을 ★기함으로 지정하세요.</span>
              </div>
            )}
            {list.map((s) => (
              <div key={s.id} style={{ ...cardBox, borderColor: s.flagship ? 'var(--accent)' : 'var(--border)', boxShadow: s.flagship ? '0 0 0 1px var(--accent)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{s.flagship ? <>★ </> : <><Emoji e="🚀"/> </>}{s.name}</span>
                  {s.flagship && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px' }}>기함</span>}
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => markFlagship(s.id)} title={s.flagship ? '기함 지정 해제' : '기함으로 지정'}
                    style={{ borderColor: s.flagship ? 'var(--accent)' : 'var(--border)' }}>{s.flagship ? '★' : '☆'}</button>
                  <button className="minibtn" onClick={() => copy('l' + s.id, `${s.name}\n${shipSummary(s as Ship)}`)} title="복사">
                    {copiedKey === 'l' + s.id ? <>✓</> : <Emoji e="📋"/>}
                  </button>
                  <button className="minibtn" onClick={() => removeFromFleet(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑"/></button>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{shipSummary(s as Ship)}</div>
                <textarea
                  value={s.note}
                  onChange={(e) => setNote(s.id, e.target.value)}
                  placeholder="이 함선에 대한 메모(소속·전적·선장·비밀 화물 등)…"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
                <div className="linkbar">
                  <span className="linkbar-label">연계:</span>
                  <button className="linkbtn" onClick={() => addSavedToProject(s)} disabled={!hasProjectBridge()}
                    title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 함선을 프로젝트 자료 〈세계관〉 폴더에 문서로 추가'}>
                    <Emoji e="📄"/> 프로젝트에 추가
                  </button>
                  <button className="linkbtn" onClick={() => saveToLibrary(s)}><Emoji e="📥"/> 스니펫</button>
                  <button className="linkbtn" onClick={() => sendToSetting(s)}><Emoji e="🗺️"/> 배경 설정집으로</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>함선 제원은 출발점입니다. 결함 슬롯(<Emoji e="⚠️"/>)은 이야기의 불씨 — 가장 강한 무장보다 단 하나의 약점이 더 좋은 장면을 만듭니다.</div>
    </div>
  )
}
