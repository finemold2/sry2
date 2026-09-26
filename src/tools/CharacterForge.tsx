// 캐릭터 생성기 — 얼굴(저작권 안전 DiceBear) + 키/몸무게/혈액형/MBTI 등 수많은 특성을 무작위 생성.
// 슬롯별 🔒 잠금 + 부분 재생성. 연계: 인물 시트로 보내기 · 인물 라이브러리 저장 · 프로젝트에 인물 카드 추가(바인더+DB 실시간).
import { useMemo, useRef, useState } from 'react'
import { addToLibrary, openToolLinked, addToProject, hasProjectBridge, type SharedCharacter, Emoji, emojify } from './linkbus'

export const meta = { id: 'character-forge', name: '캐릭터 생성기', icon: '🧬', group: '영감·발상', intro: '얼굴·키·몸무게·혈액형·MBTI 등 수많은 특성으로 완성형 캐릭터를 무작위 생성', w: 560, h: 660 }

type Face = 'person' | 'cartoon' | 'fantasy'
const FACE_LABEL: Record<Face, string> = { person: '👤 인물풍', cartoon: '🎨 만화풍', fantasy: '🧝 판타지' }

const NAMES_KO = ['도윤', '서아', '시우', '하준', '지호', '예린', '민재', '수빈', '서준', '하린', '윤서', '지안', '建우', '채원', '정우', '소율']
  .map((n) => (/[가-힣]{2}/.test(n) ? n : '리안'))
const SURNAME_KO = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '한', '서', '신', '권', '황']
const NAMES_EN = ['Aria', 'Kai', 'Noah', 'Luna', 'Ezra', 'Mara', 'Ivo', 'Sera', 'Dane', 'Vera', 'Lior', 'Nadia', 'Cael', 'Rin']
const NAMES_FANTASY = ['엘드린', '카엘', '세라피나', '모르간', '리안드라', '드라크', '아엘', '베르딘', '실라', '오르넬', '타비온', '느브', '카산']

function ri(n: number) { return Math.floor(Math.random() * n) }
function pick<T>(a: T[]): T { return a[ri(a.length)] }

// 받침 유무로 조사를 실제로 하나 골라 붙인다(괄호 이중표기 금지). 한글이 아니면 받침 있는 쪽 취급.
function hasBatchim(word: string): boolean {
  const ch = word.trim().slice(-1)
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return true
  return (code - 0xac00) % 28 !== 0
}
function josa(word: string, withB: string, noB: string): string {
  return word + (hasBatchim(word) ? withB : noB)
}
const eul = (w: string) => josa(w, '을', '를')   // 을/를
const eun = (w: string) => josa(w, '은', '는')   // 은/는
const euro = (w: string) => {                      // 으로/로 (ㄹ 받침은 '로')
  const ch = w.trim().slice(-1)
  const code = ch.charCodeAt(0)
  const rieul = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 === 8
  return w + (hasBatchim(w) && !rieul ? '으로' : '로')
}
function randName(face: Face): string {
  if (face === 'person') return Math.random() < 0.6 ? pick(SURNAME_KO) + pick(NAMES_KO) : pick(NAMES_EN)
  if (face === 'fantasy') return pick(NAMES_FANTASY)
  return Math.random() < 0.5 ? pick(NAMES_EN) : pick(SURNAME_KO) + pick(NAMES_KO)
}

const P = {
  gender: ['남성', '여성', '논바이너리'],
  blood: ['A형', 'B형', 'O형', 'AB형'],
  mbti: ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'],
  body: ['호리호리한', '탄탄한', '왜소한', '건장한', '풍채 좋은', '마른', '근육질의', '둥글둥글한', '훤칠한', '아담한'],
  hair: ['칠흑 같은 단발', '희끗한 장발', '부스스한 곱슬', '짧게 친 스포츠머리', '은빛 긴 생머리', '땋아 내린 머리', '붉은 웨이브', '삭발에 가까운', '하나로 묶은 포니테일', '잿빛 단정한 머리', '푸른빛 도는 흑발', '헝클어진 갈색머리'],
  eyes: ['날카로운 눈매', '서글서글한 눈', '깊고 검은 눈', '냉랭한 회색 눈', '장난기 어린 눈', '졸린 듯한 눈', '형형한 안광', '겁먹은 듯한 눈', '호박색 눈동자', '한쪽만 색이 다른 눈'],
  mark: ['왼뺨의 흉터', '코끝의 주근깨', '목덜미의 문신', '안경', '한쪽 귀의 귀걸이', '손등의 화상 자국', '눈가의 점', '늘 붕대를 감은 손', '특별한 표식 없음', '창백한 낯빛', '햇볕에 그을린 피부'],
  role: ['주인공', '조력자', '적대자', '멘토', '라이벌', '연인', '배신자', '관찰자', '희생양', '트릭스터', '수호자', '내부의 적'],
  job: ['형사', '의사', '교사', '용병', '상인', '사서', '암살자', '기자', '음유시인', '연금술사', '항해사', '도굴꾼', '정치가', '화가', '대장장이', '점성술사', '간호사', '바텐더', '경비병', '학자', '무당', '요리사', '재단사', '광부'],
  personality: ['냉철한', '다정한', '오만한', '소심한', '의리 있는', '변덕스러운', '집요한', '낙천적인', '비관적인', '대범한', '교활한', '강직한', '예민한', '무던한', '저돌적인', '겸손한', '독선적인', '유머러스한', '내성적인', '충동적인'],
  value: ['정의', '자유', '가족', '명예', '복수', '진실', '생존', '사랑', '권력', '신념', '평화', '지식', '충성', '쾌락', '구원'],
  desire: ['잃어버린 가족을 찾기', '세상에 인정받기', '과거를 바로잡기', '금지된 지식을 얻기', '복수를 완성하기', '평범한 삶을 살기', '왕좌에 오르기', '누군가를 지키기', '자유를 얻기', '진실을 밝히기', '한 사람의 사랑', '빚을 갚기', '불멸을 얻기', '고향으로 돌아가기'],
  fear: ['버림받는 것', '실패', '어둠', '진실이 드러나는 것', '사랑하는 이의 죽음', '통제력을 잃는 것', '잊히는 것', '배신', '자기 자신', '높은 곳', '구속', '과거의 반복'],
  flaw: ['지나친 자존심', '의심이 많음', '욱하는 성미', '거짓말 버릇', '우유부단함', '집착', '냉정함', '비겁함', '완벽주의', '질투심', '과거에 매임', '타인을 못 믿음'],
  secret: ['출생의 비밀', '저지른 살인', '이중 신분', '숨겨둔 혈육', '거짓 정체', '치명적 지병', '배신의 과거', '금지된 능력', '빚더미', '사랑하는 적', '잊힌 기억', '거래한 악마'],
  speech: ['툭툭 던지는 말투', '예의 바른 존댓말', '냉소적인 어투', '사투리가 섞인', '느릿느릿한', '속사포 같은', '시적인 표현', '거친 욕설 섞인', '더듬는 말투', '나긋나긋한', '군더더기 없는', '능청스러운'],
  habit: ['손톱을 물어뜯음', '머리를 쓸어넘김', '혼잣말을 함', '담배를 만지작거림', '코를 찡긋함', '늘 메모함', '발을 떪', '눈을 자주 깜빡임', '헛기침을 함', '반지를 돌림', '입술을 깨묾', '동전을 튕김'],
  origin: ['몰락한 귀족 가문', '변방의 어촌', '뒷골목 빈민가', '엄격한 군인 집안', '떠돌이 유랑단', '수도원', '부유한 상인 가문', '전쟁 고아원', '산속 외딴 마을', '왕실', '이방의 땅', '학자 집안'],
  hobby: ['오래된 책 수집', '밤하늘 관측', '검술 수련', '약초 재배', '악기 연주', '낚시', '그림 그리기', '요리', '도박', '체스', '새 관찰', '일기 쓰기'],
  quirk: ['단것을 못 끊음', '거짓말을 못함', '특정 숫자에 집착', '동물과 잘 통함', '길치', '기억력이 비상함', '추위를 많이 탐', '특정 음식 알레르기', '왼손잡이', '잠버릇이 심함', '징크스가 많음', '향수에 민감함'],
}

interface Gen {
  face: Face; seed: number
  name: string; gender: string; age: number; height: number; weight: number; blood: string; mbti: string
  body: string; hair: string; eyes: string; mark: string
  role: string; job: string; personality: string[]; value: string; desire: string; fear: string; flaw: string; secret: string
  speech: string; habit: string; origin: string; hobby: string; quirk: string
}
type SlotKey = keyof Omit<Gen, 'face' | 'seed'>

function genOne(face: Face): Gen {
  const gender = pick(P.gender)
  return {
    face, seed: ri(1e9),
    name: randName(face), gender, age: 14 + ri(56), height: 150 + ri(46), weight: 42 + ri(58), blood: pick(P.blood), mbti: pick(P.mbti),
    body: pick(P.body), hair: pick(P.hair), eyes: pick(P.eyes), mark: pick(P.mark),
    role: pick(P.role), job: pick(P.job),
    personality: [...new Set([pick(P.personality), pick(P.personality), pick(P.personality)])].slice(0, 3),
    value: pick(P.value), desire: pick(P.desire), fear: pick(P.fear), flaw: pick(P.flaw), secret: pick(P.secret),
    speech: pick(P.speech), habit: pick(P.habit), origin: pick(P.origin), hobby: pick(P.hobby), quirk: pick(P.quirk),
  }
}
// 조합수 = 서로 독립적으로 무작위 추첨되는 슬롯 풀 크기의 곱(고유 항목만). genOne 이 실제로 각각 독립 추첨하는 슬롯만 포함한다.
const COMBOS = P.body.length * P.hair.length * P.eyes.length * P.role.length * P.job.length * P.personality.length * P.value.length * P.desire.length * P.fear.length * P.flaw.length * P.secret.length * P.mbti.length
  * P.speech.length * P.habit.length * P.origin.length * P.hobby.length * P.quirk.length

const ROWS: { k: SlotKey; label: string }[] = [
  { k: 'name', label: '이름' }, { k: 'gender', label: '성별' }, { k: 'age', label: '나이' }, { k: 'height', label: '키' }, { k: 'weight', label: '몸무게' },
  { k: 'blood', label: '혈액형' }, { k: 'mbti', label: 'MBTI' }, { k: 'body', label: '체형' }, { k: 'hair', label: '머리' }, { k: 'eyes', label: '눈' }, { k: 'mark', label: '특징' },
  { k: 'role', label: '역할' }, { k: 'job', label: '직업' }, { k: 'personality', label: '성격' }, { k: 'value', label: '가치관' }, { k: 'desire', label: '욕망' },
  { k: 'fear', label: '두려움' }, { k: 'flaw', label: '약점' }, { k: 'secret', label: '비밀' }, { k: 'speech', label: '말투' }, { k: 'habit', label: '습관' },
  { k: 'origin', label: '출신' }, { k: 'hobby', label: '취미' }, { k: 'quirk', label: '독특한 점' },
]
// 한 줄 소개 — 모든 슬롯은 명사/명사구 자리이므로 곱집합으로 섞여도 문법·의미가 충돌하지 않는다.
// 조사는 받침을 보고 실제로 하나만 골라 붙인다(괄호 이중표기 없음).
function logline(g: Gen): string {
  // value·desire·fear·habit 은 모두 명사/명사구(habit 은 '~음/함' 명사형) 자리 → 조사와 자연 결합.
  return `${g.origin} 출신의 ${g.job}. ${eul(g.value)} 가장 중시하며 ${eul(g.desire)} 꿈꾼다. `
    + `${eun(g.fear)} 두려워하지만 ${eul(g.secret)} 숨기고 있다.`
}
function valStr(g: Gen, k: SlotKey): string {
  const v = g[k] as unknown
  if (k === 'age') return g.age + '세'
  if (k === 'height') return g.height + 'cm'
  if (k === 'weight') return g.weight + 'kg'
  if (Array.isArray(v)) return v.join(', ')
  return String(v)
}

// 성별에 맞는 얼굴 — 우리가 아바타를 생성하므로 분석 대신 성별로 제어한다.
// avataaars 스타일의 머리 길이(top)·수염 확률(facialHairProbability)을 성별로 편향.
const HAIR_LONG = ['longHairStraight', 'longHairStraight2', 'longHairCurly', 'longHairBob', 'longHairBigHair', 'longHairMiaWallace', 'longHairFroBand', 'longHairCurvy', 'longHairDreads']
const HAIR_SHORT = ['shortHairShortFlat', 'shortHairShortRound', 'shortHairShortWaved', 'shortHairSides', 'shortHairTheCaesar', 'shortHairDreads02', 'shortHairShortCurly']
function avatarUrl(g: Gen): string {
  const seed = encodeURIComponent(g.name + '-' + g.seed)
  // 만화풍은 추상 이모지(성별 무관)
  if (g.face === 'cartoon') return `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${seed}`
  const fem = g.gender === '여성'
  const masc = g.gender === '남성'
  const tops = fem ? HAIR_LONG : masc ? HAIR_SHORT : [...HAIR_SHORT.slice(0, 3), ...HAIR_LONG.slice(0, 3)]
  const facial = masc ? 45 : fem ? 0 : 12
  // 판타지풍은 의상·장신구로 분위기만 살짝 다르게(성별 제어는 동일)
  const extra = g.face === 'fantasy' ? '&accessoriesProbability=55&clothing=blazerSweater,collarSweater,hoodie' : ''
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&top=${tops.join(',')}&facialHairProbability=${facial}${extra}`
}

export default function CharacterForge({ payload }: { payload?: Record<string, unknown> }) {
  const [face, setFace] = useState<Face>('person')
  const [g, setG] = useState<Gen>(() => genOne('person'))
  const [locked, setLocked] = useState<Partial<Record<SlotKey, boolean>>>({})
  const [toast, setToast] = useState('')
  const savedRef = useRef(false)
  // 사용자 정의 항목(예: 최종목표) — 무작위 생성 안 됨(데이터 없음), 비어서 시작해 사용자가 입력. + 고정 '기타'.
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')
  const cuid = () => Math.random().toString(36).slice(2, 9)
  const addCustom = () => { const label = window.prompt('추가할 항목 이름 (예: 최종목표, 1번째 목표):'); if (label && label.trim()) setCustom((c) => [...c, { id: cuid(), label: label.trim(), value: '' }]) }
  const setCustomVal = (id: string, v: string) => setCustom((c) => c.map((x) => (x.id === id ? { ...x, value: v } : x)))
  const removeCustom = (id: string) => setCustom((c) => c.filter((x) => x.id !== id))

  const rollAll = (f: Face = face) => {
    setG((prev) => {
      const next = genOne(f)
      // 잠긴 슬롯은 유지
      for (const r of ROWS) if (locked[r.k]) (next as unknown as Record<string, unknown>)[r.k] = (prev as unknown as Record<string, unknown>)[r.k]
      next.face = f
      return next
    })
    // 새 캐릭터: 사용자 정의 항목·기타는 데이터가 없으므로 비운 채로(사용자가 직접 입력).
    setCustom((c) => c.map((x) => ({ ...x, value: '' })))
    setEtc('')
    savedRef.current = false
  }
  const rollOne = (k: SlotKey) => setG((prev) => {
    const fresh = genOne(prev.face)
    return { ...prev, [k]: (fresh as unknown as Record<string, unknown>)[k] } as Gen
  })
  const toggleLock = (k: SlotKey) => setLocked((l) => ({ ...l, [k]: !l[k] }))
  const setFaceAndRoll = (f: Face) => { setFace(f); setG((prev) => ({ ...prev, face: f, seed: ri(1e9) })) }

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 1600) }

  // 정규 캐릭터 필드(linkbus CHARACTER_FIELDS 키)로 항목별 1:1 매핑 — 뭉치지 않아 다른 도구로 손실 없이 전달.
  const canonicalFields = (): Record<string, string> => ({
    name: g.name,
    role: g.role,
    gender: g.gender,
    age: `${g.age}세`,
    bloodType: g.blood,
    mbti: g.mbti,
    height: `${g.height}cm`,
    weight: `${g.weight}kg`,
    body: g.body,
    hair: g.hair,
    eyes: g.eyes,
    mark: g.mark,
    occupation: g.job,
    personality: g.personality.join(', '),
    value: g.value,
    goal: g.desire,
    fear: g.fear,
    flaw: g.flaw,
    secret: g.secret,
    speech: g.speech,
    habit: g.habit,
    origin: g.origin,
    hobby: g.hobby,
    quirk: g.quirk,
    ...Object.fromEntries(custom.filter((c) => c.value.trim()).map((c) => [c.label, c.value.trim()])),
    ...(etc.trim() ? { etc: etc.trim() } : {}),
  })
  const summaryText = () => ['[한 줄 소개] ' + logline(g), '', ...ROWS.map((r) => r.label + ': ' + valStr(g, r.k)), ...custom.filter((c) => c.value.trim()).map((c) => c.label + ': ' + c.value.trim()), etc.trim() ? '기타: ' + etc.trim() : ''].filter(Boolean).join('\n')

  const toSheet = () => { openToolLinked('character-sheet', { character: { name: g.name, role: g.role, photo: avatarUrl(g), photoCredit: 'DiceBear', fields: canonicalFields() } }); flash('인물 시트로 보냈습니다 (모든 항목 전달)') }
  const toLibrary = () => {
    const c: Partial<SharedCharacter> = { name: g.name, photo: avatarUrl(g), photoCredit: 'DiceBear', role: g.role, fields: canonicalFields(), traits: ROWS.map((r) => ({ k: r.label, v: valStr(g, r.k) })), source: '캐릭터 생성기' }
    addToLibrary('characters', c); flash('인물 라이브러리에 저장했습니다 (모든 항목)')
  }
  const toProject = () => {
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물', title: g.name,
      character: canonicalFields(),
      meta: { 키: g.height + 'cm', 몸무게: g.weight + 'kg', 혈액형: g.blood, MBTI: g.mbti, 나이: g.age + '세', 성별: g.gender, 역할: g.role },
    })
    if (id) { savedRef.current = true; flash('프로젝트 ‘자료 › 인물’에 카드로 추가했습니다 (바인더·DB 확인)') }
    else flash('프로젝트에 추가할 수 없습니다')
  }

  // 외부에서 payload 로 시드가 오면 반영(선택적)
  useMemo(() => { if (payload?.reroll) rollAll() /* eslint-disable-next-line */ }, [])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {(Object.keys(FACE_LABEL) as Face[]).map((f) => <button key={f} className={'minibtn' + (face === f ? ' active' : '')} onClick={() => setFaceAndRoll(f)}>{emojify(FACE_LABEL[f])}</button>)}
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>약 {COMBOS.toLocaleString()}+ 조합</span>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <img src={avatarUrl(g)} alt={g.name} width={92} height={92} style={{ borderRadius: 12, background: 'var(--paper)', border: '1px solid var(--border)' }} />
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{g.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{g.role}</div>
          <div className="license-note" style={{ marginTop: 2 }}>DiceBear 아바타</div>
        </div>
        <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, alignSelf: 'center' }}>
          {g.gender} · {g.age}세 · {g.height}cm · {g.weight}kg · {g.blood} · {g.mbti}<br />
          {g.personality.join(', ')} / {g.body}<br />
          <span style={{ color: 'var(--text)' }}>{logline(g)}</span>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {ROWS.map((r) => (
            <div key={r.k} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px' }}>
              <span style={{ fontSize: 10.5, color: 'var(--muted)', width: 52, flexShrink: 0 }}>{r.label}</span>
              <span style={{ flex: 1, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={valStr(g, r.k)}>{valStr(g, r.k)}</span>
              <button className="minibtn" title={locked[r.k] ? '잠금해제' : '잠금'} onClick={() => toggleLock(r.k)} style={{ padding: '0 3px', color: locked[r.k] ? 'var(--accent)' : 'var(--muted)' }}><>{locked[r.k] ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</></button>
              <button className="minibtn" title="이 항목만 다시" onClick={() => rollOne(r.k)} disabled={!!locked[r.k]} style={{ padding: '0 3px' }}><Emoji e="🎲" /></button>
            </div>
          ))}
        </div>

        {/* 사용자 정의 항목(무작위 생성 안 됨 — 직접 입력) */}
        {custom.map((c) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--accent)', width: 64, flexShrink: 0, fontWeight: 600 }} title={c.label}>{c.label}</span>
            <input value={c.value} onChange={(e) => setCustomVal(c.id, e.target.value)} placeholder="직접 입력 (예: 부자되기)" style={{ flex: 1, fontSize: 12, padding: '4px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)' }} />
            <button className="minibtn" title="이 항목 삭제" onClick={() => removeCustom(c.id)} style={{ padding: '0 5px' }}>✕</button>
          </div>
        ))}

        {/* 고정 '기타' 항목 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>기타</span>
          <textarea value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="이 인물에 대한 기타 사항을 자유롭게 적으세요…" rows={2} style={{ fontSize: 12.5, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
        </div>

        <button className="minibtn" onClick={addCustom} style={{ alignSelf: 'flex-start' }}>＋ 항목 추가</button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={() => rollAll()}><Emoji e="🎲" /> 캐릭터 생성</button>
        <button className="minibtn" onClick={() => { navigator.clipboard?.writeText(summaryText()).then(() => flash('복사됨')).catch(() => {}) }}><Emoji e="📋" /> 복사</button>
      </div>
      <div className="linkbar">
        <span className="linkbar-label">연동:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()}><Emoji e="📄" /> 프로젝트에 인물 카드 추가</button>
        <button className="linkbtn" onClick={toSheet}><Emoji e="🪪" /> 인물 시트로</button>
        <button className="linkbtn" onClick={toLibrary}><Emoji e="📥" /> 인물 라이브러리</button>
      </div>
      <div style={{ fontSize: 11, color: toast ? 'var(--ok)' : 'var(--muted)' }}>{toast || '“프로젝트에 인물 카드 추가”를 누르면 좌측 바인더(자료 › 인물)와 DB 뷰에 실시간으로 들어갑니다.'}</div>
    </div>
  )
}
