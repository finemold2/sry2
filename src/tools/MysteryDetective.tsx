// 탐정·형사 캐릭터 생성기 — 미스터리·추리 장르 전용.
//  추리 스타일(논리/직관/과학수사/심리) × 결점 × 트레이드마크 × 조수 × 숙적 + 직함·전문분야·신조 등 다수 슬롯을 무작위 조합.
//  슬롯별 🔒 잠금 + 부분 재생성, 총 조합수(수억) 표시. 인물 시트 · 인물 라이브러리 · 프로젝트 인물 카드 연계.
import { useMemo, useRef, useState } from 'react'
import { addToLibrary, openToolLinked, addToProject, hasProjectBridge, Emoji, type SharedCharacter } from './linkbus'

export const meta = { id: 'mystery-detective', name: '탐정·형사 생성기', icon: '🕵️', group: '캐릭터', genre: '미스터리·추리', intro: '추리 스타일×결점×트레이드마크×조수×숙적을 굴려 입체적인 탐정·형사를 빚으세요(수천조 조합)', w: 580, h: 680 }

function ri(n: number) { return Math.floor(Math.random() * n) }
function pick<T>(a: T[]): T { return a[ri(a.length)] }

// 받침 유무로 조사를 실제로 골라 붙이는 헬퍼(괄호 이중표기 금지). 한글 음절만 판정, 그 외엔 기본형.
function hasFinalConsonant(word: string): boolean {
  const ch = word.charCodeAt(word.length - 1)
  if (ch < 0xac00 || ch > 0xd7a3) return false // 한글 음절 범위 밖이면 받침 없음으로 처리
  return (ch - 0xac00) % 28 !== 0
}
function josa(word: string, withBat: string, withoutBat: string): string {
  return word + (hasFinalConsonant(word) ? withBat : withoutBat)
}
const eul = (w: string) => josa(w, '을', '를')    // 을/를
const eun = (w: string) => josa(w, '은', '는')    // 은/는
const i_ga = (w: string) => josa(w, '이', '가')   // 이/가
const euro = (w: string) => {                      // 으로/로 (받침 ㄹ은 '로')
  const ch = w.charCodeAt(w.length - 1)
  if (ch < 0xac00 || ch > 0xd7a3) return w + '로'
  const jong = (ch - 0xac00) % 28
  return w + (jong === 0 || jong === 8 ? '로' : '으로')
}

// ---------- 슬롯 풀(풍부한 자작 데이터) ----------
const SURNAME = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '한', '서', '신', '권', '황', '안', '송', '류', '홍', '문', '백']
const GIVEN = ['도현', '서진', '민준', '하경', '연우', '지운', '태오', '예성', '준호', '세빈', '유진', '혜린', '소망', '재이', '나윤', '경래', '상우', '다인', '현성', '아라', '윤후', '시현', '주혁', '단비']
const GIVEN_EN = ['Cole', 'Mara', 'Ezra', 'Noir', 'Vale', 'Lena', 'Quinn', 'Dash', 'Ada', 'Sloan', 'Wren', 'Kade', 'Iris', 'Reed', 'Nova', 'Tate']

const STYLE = [
  { k: '논리', tag: '연역·관찰형', desc: '사소한 단서에서 사슬처럼 결론을 끌어내는 순수 추론가', method: '현장의 미세 흔적과 모순을 논리로 짜맞춘다' },
  { k: '직관', tag: '직감·통찰형', desc: '설명하기 전에 먼저 진실을 감지하는 본능적 수사관', method: '직감으로 핵심을 짚고 나서 근거를 거꾸로 찾는다' },
  { k: '과학수사', tag: '포렌식·증거형', desc: '혈흔·DNA·탄도·독물을 읽는 냉정한 과학자', method: '실험·감정·데이터로 물증을 해독한다' },
  { k: '심리', tag: '프로파일·심리형', desc: '범인의 마음을 읽고 자백을 끌어내는 심리 분석가', method: '동기와 행동 패턴을 프로파일링해 범인을 좁힌다' },
  { k: '잠입', tag: '위장·잠행형', desc: '신분을 바꿔 어둠 속으로 스며드는 위장 전문가', method: '위장 잠입으로 내부에서 진상을 캐낸다' },
  { k: '발품', tag: '탐문·집념형', desc: '구두 굽이 닳도록 발로 뛰며 증언을 모으는 노력형', method: '끈질긴 탐문과 잠복으로 증거를 쌓는다' },
  { k: '기록', tag: '문헌·자료형', desc: '낡은 서류와 기록의 틈에서 진실을 캐는 자료 분석가', method: '방대한 문헌과 장부를 대조해 모순을 찾아낸다' },
  { k: '함정', tag: '유인·설계형', desc: '범인이 스스로 걸려들 덫을 짜는 책략가', method: '치밀한 함정을 설계해 범인의 자백을 유도한다' },
]
const RANK = ['사설탐정', '강력계 형사', '경찰서 반장', '광역수사대 경위', '아마추어 명탐정', '전직 형사 출신 탐정', '검시관 겸 수사관', '특수수사본부 프로파일러', '시골 파출소 순경', '대학교 범죄학 교수', '보험조사관', '흥신소 소장', '국과수 감정관', '미제사건 전담반 경감', '기자 출신 탐정']
const SPECIALTY = ['밀실 살인', '연쇄 살인', '실종 사건', '독살·약물', '금융·사기', '미술품 절도', '유괴·납치', '방화', '미제·콜드케이스', '위장 자살', '암호·코드', '신원 위조', '협박·공갈', '산업 스파이', '컬트·사이비', '디지털 포렌식']
const FLAW = ['지독한 불면증', '알코올 의존', '대인기피·은둔벽', '진통제 남용', '병적인 결벽증', '권위에 대한 반골 기질', '과거 사건의 트라우마', '오만한 자만심', '규칙을 무시하는 독단', '감정 기복이 심함', '거짓말을 못하는 외골수', '의심병·편집증', '도박벽', '워커홀릭', '냉소와 염세', '청각 과민증']
const TRADEMARK = ['낡은 트렌치코트', '항상 물고 있는 빈 파이프', '검은 가죽 수첩', '회중시계를 만지작거림', '특정 브랜드 담배', '한쪽만 낀 가죽 장갑', '체스 말을 굴리는 버릇', '늘 쓰는 둥근 안경', '독특한 향수 냄새', '주머니 속 부적', '먹다 만 사탕 봉지', '낡은 만년필', '뜨개질하는 손', '클래식 음악 흥얼거림', '사건 현장 사진을 벽에 붙이기', '커피를 끊임없이 마심']
const CATCHPHRASE = ['"사실은 거짓말을 하지 않아."', '"우연은 없다. 패턴만 있을 뿐."', '"모두가 거짓말을 한다."', '"답은 늘 현장에 있다."', '"가장 단순한 설명이 진실이다."', '"불가능을 지우면 남는 게 진실이지."', '"사람은 흔적을 남긴다, 반드시."', '"이건 사고가 아니야."', '"누가 이득을 보는가를 봐라."', '"증거는 침묵하지 않는다."', '"범인은 이미 이 방 안에 있다."', '"시간 순서가 모든 걸 말해준다."', '"디테일이 사건을 푼다."', '"알리바이는 깨지라고 있는 거야."', '"동기를 찾으면 범인이 보인다."', '"진실은 불편할수록 진짜다."', '"눈이 아니라 머리로 봐라."', '"거짓말에는 늘 균열이 있다."']
const ASSISTANT = ['충직한 후배 형사', '명석한 법의학자', '천재 해커 조수', '수다스러운 정보원', '냉정한 파트너 검사', '은퇴한 노형사 멘토', '발 넓은 신문기자', '말 없는 경호원', '예리한 비서', '뒷골목 정보통', '동물적 후각의 수색견', '의대생 인턴', '전직 도둑 협력자', '심리상담사 친구', '동네 식당 주인', '나이 어린 견습 탐정']
const NEMESIS = ['얼굴 없는 범죄 설계자', '한때 동료였던 부패 경찰', '귀족적인 두뇌파 살인마', '복수를 노리는 옛 용의자', '도시를 쥔 범죄 조직 보스', '천재적인 위조 전문가', '정체를 숨긴 연쇄 살인범', '권력층의 청부 해결사', '거울 같은 또 다른 탐정', '과거를 아는 협박꾼', '신출귀몰한 괴도', '광기에 찬 컬트 교주', '내부의 배신자', '법망을 빠져나가는 변호사', '죽은 줄 알았던 옛 숙적']
const MOTIVE = ['죽은 가족의 진실 규명', '과거 실수에 대한 속죄', '정의에 대한 순수한 집착', '풀지 못한 미제에 대한 강박', '단순한 호기심과 지적 유희', '버려진 약자에 대한 연민', '명성과 인정 욕구', '숙적과의 끝나지 않은 대결', '잃어버린 신뢰의 회복', '돈과 생계', '진실 없이는 못 사는 천성', '내면의 죄책감 씻기', '억울한 누명의 명예 회복', '스승의 유언을 지키려는 의리', '세상에 대한 끓는 분노', '권력에 맞선 약속']
const ORIGIN = ['몰락한 명문가의 외동', '경찰 집안의 반항아', '고아원 출신의 자수성가', '범죄 피해자 유가족', '전직 군 정보장교', '시골 출신 상경자', '범죄자 부모를 둔 자식', '의사 집안의 이단아', '거리에서 큰 부랑아 출신', '엘리트 코스를 박차고 나온 사람', '이민 2세대', '수도원에서 자란 사람', '서커스단을 떠돈 떠돌이', '도서관 사서의 늦둥이', '탄광촌에서 자란 광부의 아들', '법조 명문가의 막내']
const APPEARANCE = ['헝클어진 머리에 면도하지 않은 턱', '흠잡을 데 없이 단정한 정장 차림', '왜소하지만 형형한 눈빛', '큰 키에 구부정한 자세', '날카로운 매부리코', '눈 밑의 짙은 다크서클', '왼뺨의 오래된 흉터', '늘 피곤해 보이는 창백한 낯', '운동선수 같은 다부진 체격', '나이를 가늠하기 힘든 얼굴', '한쪽 다리를 약간 저는', '인상적인 회색 눈동자', '희끗희끗 센 관자놀이', '손등을 덮은 오래된 화상 자국', '늘 헐렁한 카디건 차림']
const HABIT = ['생각할 때 눈을 감고 손가락을 두드림', '현장에서 혼잣말로 추리를 읊음', '용의자를 빤히 응시함', '메모지에 도식을 그림', '결정적 순간에 갑자기 자리를 뜸', '커피잔을 빙빙 돌림', '담배에 불을 붙였다 끄기를 반복', '상대의 말을 따라 되뇜', '뒷짐을 지고 서성임', '사건 파일을 거꾸로 들고 읽음', '안경을 벗었다 썼다 함', '엉뚱한 질문으로 허를 찌름', '손가락으로 허공에 글씨를 씀', '동전을 손등 위로 굴림', '추리가 막히면 단것을 찾음', '대화 도중 수첩에 몰래 적음']
const WEAKNESS = ['결정적 단서를 종종 놓침', '감정에 휘말리면 판단이 흐려짐', '상관과 끝없이 충돌함', '위장·잠복에 서툼', '폭력 앞에서 무력함', '컴퓨터·기계에 약함', '사람을 너무 쉽게 믿음', '혼자서는 추리를 못 정리함', '대중 앞에 서면 얼어붙음', '체력이 부실함', '돈 관리를 전혀 못함', '거짓말 탐지에 약함', '방향 감각이 형편없음', '추리에 몰두하면 주변을 못 봄', '서류 작업을 끝없이 미룸', '겁이 많아 야간 수사를 꺼림']

interface Gen {
  seed: number
  name: string; age: number; gender: string
  style: typeof STYLE[number]
  rank: string; specialty: string
  flaw: string; trademark: string; catchphrase: string
  assistant: string; nemesis: string
  motive: string; origin: string; appearance: string; habit: string; weakness: string
}
type SlotKey = Exclude<keyof Gen, 'seed' | 'style'> | 'style'

const GENDERS = ['남성', '여성', '중성적']
function randName(): string {
  return Math.random() < 0.78 ? pick(SURNAME) + pick(GIVEN) : pick(GIVEN_EN)
}
function genOne(): Gen {
  return {
    seed: ri(1e9),
    name: randName(), age: 26 + ri(40), gender: pick(GENDERS),
    style: pick(STYLE),
    rank: pick(RANK), specialty: pick(SPECIALTY),
    flaw: pick(FLAW), trademark: pick(TRADEMARK), catchphrase: pick(CATCHPHRASE),
    assistant: pick(ASSISTANT), nemesis: pick(NEMESIS),
    motive: pick(MOTIVE), origin: pick(ORIGIN), appearance: pick(APPEARANCE), habit: pick(HABIT), weakness: pick(WEAKNESS),
  }
}

// 조합수: 핵심 슬롯들의 곱(이름·나이 제외해도 수억 이상)
const COMBOS = STYLE.length * RANK.length * SPECIALTY.length * FLAW.length * TRADEMARK.length *
  CATCHPHRASE.length * ASSISTANT.length * NEMESIS.length * MOTIVE.length * ORIGIN.length *
  APPEARANCE.length * HABIT.length * WEAKNESS.length

const ROWS: { k: SlotKey; label: string }[] = [
  { k: 'name', label: '이름' }, { k: 'age', label: '나이' }, { k: 'gender', label: '성별' },
  { k: 'style', label: '추리 스타일' }, { k: 'rank', label: '직함' }, { k: 'specialty', label: '전문 분야' },
  { k: 'flaw', label: '결점' }, { k: 'trademark', label: '트레이드마크' }, { k: 'catchphrase', label: '입버릇' },
  { k: 'assistant', label: '조수' }, { k: 'nemesis', label: '숙적' }, { k: 'motive', label: '수사 동기' },
  { k: 'origin', label: '출신' }, { k: 'appearance', label: '외모' }, { k: 'habit', label: '버릇' }, { k: 'weakness', label: '수사상 약점' },
]
function valStr(g: Gen, k: SlotKey): string {
  if (k === 'age') return g.age + '세'
  if (k === 'style') return `${g.style.k}형 (${g.style.tag})`
  return String(g[k as keyof Gen])
}

export default function MysteryDetective({ payload }: { payload?: Record<string, unknown> }) {
  const [g, setG] = useState<Gen>(() => genOne())
  const [locked, setLocked] = useState<Partial<Record<SlotKey, boolean>>>({})
  const [toast, setToast] = useState('')
  const savedRef = useRef(false)

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 1700) }

  const rollAll = () => {
    setG((prev) => {
      const next = genOne()
      for (const r of ROWS) if (locked[r.k]) (next as unknown as Record<string, unknown>)[r.k] = (prev as unknown as Record<string, unknown>)[r.k]
      return next
    })
    savedRef.current = false
  }
  const rollOne = (k: SlotKey) => setG((prev) => {
    if (locked[k]) return prev
    const fresh = genOne()
    return { ...prev, [k]: (fresh as unknown as Record<string, unknown>)[k] } as Gen
  })
  const toggleLock = (k: SlotKey) => setLocked((l) => ({ ...l, [k]: !l[k] }))

  // 인물 카드/시트 필드 매핑
  const toCharacterFields = (): Record<string, string> => ({
    name: g.name,
    role: `${g.rank} · ${g.style.k}형 탐정`,
    age: `${g.age}세 · ${g.gender}`,
    occupation: g.rank,
    appearance: `${g.appearance} · 트레이드마크: ${g.trademark}`,
    personality: `${g.style.k}형(${g.style.tag}) — ${g.style.desc}`,
    method: g.style.method,
    specialty: `전문 분야: ${g.specialty}`,
    habits: `버릇: ${g.habit} · 입버릇: ${g.catchphrase}`,
    background: `출신: ${g.origin}`,
    goal: `수사 동기: ${g.motive}`,
    conflict: `결점: ${g.flaw} · 약점: ${g.weakness} · 숙적: ${g.nemesis}`,
    allies: `조수: ${g.assistant}`,
  })
  // 인물 시트/배경 설정집 등 허브가 기본 칸에 그대로 꽂도록 정규(canonical) 키로 매핑.
  // 뭉친 값은 가능한 한 분리(나이/성별·외모/트레이드마크), 애매한 값은 notes 로.
  const toCanonicalCharFields = (): Record<string, string> => ({
    name: g.name,
    role: `${g.rank} · ${g.style.k}형 탐정`,
    gender: g.gender,
    age: `${g.age}세`,
    occupation: g.rank,
    appearance: g.appearance,
    mark: g.trademark,
    personality: `${g.style.k}형(${g.style.tag}) — ${g.style.desc}`,
    goal: g.motive,
    motivation: g.motive,
    flaw: g.flaw,
    speech: g.catchphrase,
    habit: g.habit,
    background: g.origin,
    relations: `조수: ${g.assistant} · 숙적: ${g.nemesis}`,
    notes: `전문 분야: ${g.specialty} · 수사 방식: ${g.style.method} · 수사상 약점: ${g.weakness}`,
  })
  // 조사 헬퍼로 자연스러운 한 줄 프로필을 만든다(모든 슬롯이 명사/명사구 → 문법역할 일치, 슬롯 독립).
  const tagline = () =>
    `${euro(g.origin)} 자란 ${g.rank} ${eun(g.name)} ${eul(g.specialty)} 쫓으며, ` +
    `${eul(g.motive)} 위해 ${eul(g.flaw)} 안고 산다. ` +
    `${i_ga(g.style.k + '형')} 그의 무기.`
  const summaryText = () => tagline() + '\n\n' + ROWS.map((r) => r.label + ': ' + valStr(g, r.k)).join('\n') + '\n수사 방식: ' + g.style.method

  const toSheet = () => { openToolLinked('character-sheet', { character: { ...toCharacterFields(), fields: toCanonicalCharFields() } }); flash('인물 시트로 보냈습니다') }
  const toRelation = () => { openToolLinked('relationship-map', { character: { ...toCharacterFields(), fields: toCanonicalCharFields() } }); flash('인물 관계도로 보냈습니다(조수·숙적 연결에 활용)') }
  const toConflict = () => { openToolLinked('conflict-builder', { genre: '미스터리·추리', character: { ...toCharacterFields(), fields: toCanonicalCharFields() } }); flash('갈등 설계기로 보냈습니다(탐정 vs 숙적)') }
  const toLibrary = () => {
    const c: Partial<SharedCharacter> = {
      name: g.name,
      role: `${g.rank} · ${g.style.k}형 탐정`,
      personality: g.style.desc,
      goal: g.motive,
      secret: g.flaw,
      appearance: `${g.appearance} · ${g.trademark}`,
      traits: ROWS.map((r) => ({ k: r.label, v: valStr(g, r.k) })),
      fields: toCanonicalCharFields(),
      source: '탐정·형사 생성기',
    }
    addToLibrary('characters', c); flash('인물 라이브러리에 저장했습니다')
  }
  const toProject = () => {
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물', title: `${g.name} (탐정)`,
      character: { ...toCharacterFields(), ...toCanonicalCharFields() },
      meta: { 직함: g.rank, 추리스타일: g.style.k + '형', 전문분야: g.specialty, 결점: g.flaw, 숙적: g.nemesis, 나이: g.age + '세', 성별: g.gender },
    })
    if (id) { savedRef.current = true; flash('프로젝트 ‘자료 › 인물’에 탐정 카드로 추가했습니다 (바인더·DB 확인)') }
    else flash('프로젝트에 추가할 수 없습니다')
  }

  // payload.genre 맥락(미스터리·추리)으로 열렸을 때, payload.reroll 이 오면 새로 굴린다.
  useMemo(() => { if (payload?.reroll) rollAll() /* eslint-disable-next-line */ }, [])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)', overflow: 'auto' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}><Emoji e="🕵️" /> 미스터리·추리 · 탐정·형사 생성기</span>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>약 {COMBOS.toLocaleString()}+ 조합</span>
      </div>

      <div style={{ display: 'flex', gap: 12, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
        <div style={{ flexShrink: 0, textAlign: 'center', width: 92 }}>
          <div style={{ fontSize: 34 }}><Emoji e="🕵️" /></div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{g.name}</div>
          <div style={{ fontSize: 11, color: 'var(--accent)' }}>{g.style.k}형</div>
        </div>
        <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, alignSelf: 'center' }}>
          {g.age}세 · {g.gender} · {g.rank}<br />
          전문: {g.specialty} · 결점: {g.flaw}<br />
          <span style={{ color: 'var(--text)' }}>수사 방식 — {g.style.method}</span>
        </div>
      </div>

      <div style={{ fontSize: 11.5, color: 'var(--text)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', lineHeight: 1.55 }}>
        {tagline()}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        {ROWS.map((r) => (
          <div key={r.k} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px' }}>
            <span style={{ fontSize: 10.5, color: 'var(--muted)', width: 62, flexShrink: 0 }}>{r.label}</span>
            <span style={{ flex: 1, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={valStr(g, r.k)}>{valStr(g, r.k)}</span>
            <button className="minibtn" title={locked[r.k] ? '잠금해제' : '잠금'} onClick={() => toggleLock(r.k)} style={{ padding: '0 3px', color: locked[r.k] ? 'var(--accent)' : 'var(--muted)' }}>{locked[r.k] ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
            <button className="minibtn" title="이 항목만 다시" onClick={() => rollOne(r.k)} disabled={!!locked[r.k]} style={{ padding: '0 3px' }}><Emoji e="🎲" /></button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={rollAll}><Emoji e="🎲" /> 탐정 생성</button>
        <button className="minibtn" onClick={() => { navigator.clipboard?.writeText(summaryText()).then(() => flash('복사됨')).catch(() => {}) }}><Emoji e="📋" /> 복사</button>
      </div>

      <div className="linkbar">
        <span className="linkbar-label">연동:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()}><Emoji e="📄" /> 프로젝트에 탐정 카드 추가</button>
        <button className="linkbtn" onClick={toSheet}><Emoji e="🪪" /> 인물 시트로</button>
        <button className="linkbtn" onClick={toLibrary}><Emoji e="📥" /> 인물 라이브러리</button>
        <button className="linkbtn" onClick={toRelation}><Emoji e="🕸️" /> 관계도로</button>
        <button className="linkbtn" onClick={toConflict}><Emoji e="⚔️" /> 갈등 설계기로</button>
      </div>
      <div style={{ fontSize: 11, color: toast ? 'var(--ok)' : 'var(--muted)' }}>{toast || <>슬롯을 <Emoji e="🔒" /> 잠그고 <Emoji e="🎲" /> 로 부분 재생성하세요. “프로젝트에 탐정 카드 추가”는 좌측 바인더(자료 › 인물)·DB에 실시간 반영됩니다.</>}</div>
    </div>
  )
}
