// 로맨스판타지 장면 생성기(RomfanSceneForge) — 로판 전형 장면을 슬롯 조합으로 무작위 생성(완전 로컬).
// 도시에 근거: 황궁·사교계·회빙환·악역영애·집착광공·사이다/고구마·공주님안기 등 장르 특화 요소만 사용.
// 슬롯별 🔒 잠금 + 🎲 부분 재생성. 전개법(장면 비트) 프리셋 적용. 연계: 프로젝트(장면 폴더)·스니펫·장소·관련 도구.
import { useMemo, useState } from 'react'
import { addToLibrary, openToolLinked, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'romfan-sceneforge', name: '로판 장면 생성기(1경+ 조합)', icon: '🌹', group: '생성기', genre: '로맨스판타지', intro: '황궁·회빙환·집착남주… 로판 전형 장면을 1경 가지 넘게 자동 생성', w: 500, h: 640 }

// ── 조사 자동 선택 헬퍼: 앞 글자 받침을 보고 실제 조사 하나를 출력(괄호 이중표기 금지) ──
function lastSyllable(s: string): number | null {
  // 끝에서부터 한글 음절(가~힣)을 찾아 그 코드 반환(따옴표·기호로 끝나는 경우 대비)
  for (let i = s.length - 1; i >= 0; i--) {
    const c = s.charCodeAt(i)
    if (c >= 0xac00 && c <= 0xd7a3) return c
  }
  return null
}
function hasBatchim(s: string): boolean {
  const c = lastSyllable(s)
  if (c == null) return false
  return (c - 0xac00) % 28 !== 0
}
function isRieulBatchim(s: string): boolean {
  const c = lastSyllable(s)
  if (c == null) return false
  return (c - 0xac00) % 28 === 8 // 종성 ㄹ
}
const J = {
  eunNeun: (s: string) => s + (hasBatchim(s) ? '은' : '는'),
  iGa: (s: string) => s + (hasBatchim(s) ? '이' : '가'),
  eulReul: (s: string) => s + (hasBatchim(s) ? '을' : '를'),
  waGwa: (s: string) => s + (hasBatchim(s) ? '과' : '와'),
  euro: (s: string) => s + (hasBatchim(s) && !isRieulBatchim(s) ? '으로' : '로'),
}

// ── 슬롯 풀(전부 로판 특화·구체) ────────────────────────────────────────────
interface Slot { key: string; label: string; options: string[] }

const SLOTS: Slot[] = [
  { key: 'place', label: '무대', options: [
    '달빛 쏟아지는 황궁 무도회장', '장미 만개한 황실 온실', '한기 도는 대공가의 서재', '촛불 흔들리는 신전의 제단 앞', '눈 내리는 황궁 정원',
    '다과회가 열린 후작가 응접실', '마탑 꼭대기의 별 관측실', '비 내리는 마차 안', '사교계가 모인 가면 무도회', '황태자의 검술 연무장',
    '버려진 별궁의 먼지 쌓인 침실', '황후의 호화로운 처소', '영지 경계의 작은 예배당', '아카데미 도서관 깊은 서가', '얼어붙은 호숫가 정자',
    '성벽 위 달빛 망루', '귀족 영애들의 사교 살롱', '대신관이 머무는 성소', '황제의 알현실', '죽음을 선고받았던 단두대 광장',
    '회귀 전 처형당한 지하 감옥', '정략결혼 서약이 오가는 대성당', '향수 공방이 차려진 영지 상단', '눈보라 치는 국경의 요새', '연회가 무르익은 백작가 정원',
    '비밀 통로로 이어진 황궁 지하서고', '꽃잎 흩날리는 호수 위 작은 배', '정령들이 깃든 고대 숲의 신단', '몰락 직전의 가문 저택 응접실', '황태자비 책봉식이 열린 대전',
    '온천이 솟는 영지의 비밀 별장', '검은 마법진이 그려진 봉인의 방', '아침 햇살 드는 황녀의 유아실', '귀빈만 드는 황실 극장 특별석', '성녀의 치유 의식이 열린 신전 중앙' ] },

  { key: 'time', label: '시각·계절', options: [
    '첫눈 내리는 새벽', '노을이 핏빛으로 타는 저녁', '보름달이 휘영청 뜬 자정', '장미 향 짙은 한여름 오후', '서리 내린 이른 아침',
    '별이 쏟아지는 깊은 밤', '안개 자욱한 동틀 무렵', '천둥 번개 치는 폭풍의 밤', '벚꽃 흩날리는 봄날 한낮', '함박눈 쏟아지는 황혼',
    '촛불만 남은 연회의 끝자락', '여명이 밝아오는 회귀 직후', '낙엽 구르는 쓸쓸한 늦가을', '무도회가 절정에 이른 한밤중', '햇살 따스한 다과회 시간',
    '얼음꽃 맺힌 한겨울 정오', '소나기 그친 직후의 여름밤', '오로라가 흐르는 극지의 밤', '매화 향 번지는 초봄 새벽', '석양이 바다를 물들이는 늦여름' ] },

  { key: 'heroine', label: '여주(시점)', options: [
    '회귀한 폐황후', '악역영애로 빙의한 현대인', '버림받았던 정략결혼 신부', '처형 직전 과거로 돌아온 공작영애', '소설 속 엑스트라가 된 하녀',
    '숨겨진 황녀였던 시녀', '계약결혼을 제안받은 몰락 귀족 영애', '신탁이 지목한 예언의 성녀', '전생 기억을 가진 어린 황녀', '복수를 다짐한 서출 영애',
    '원작에서 죽을 운명인 조연 영애', '정령과 계약한 마탑의 천재', '이혼만을 바라는 황태자비', '딸을 지키려는 환생한 어머니', '게임 속 멸망 루트에 빙의한 영애',
    '약초 지식을 지닌 환생한 궁중 약제사', '거짓 약혼녀로 들어온 변방 남작 영애', '폐위된 선황의 마지막 핏줄', '대장간 딸로 환생한 전직 기사단장', '독서로 미래를 짜맞추는 황실 사서' ] },

  { key: 'hero', label: '남주', options: [
    '온도 없는 얼음 황태자', '집착광공 흑막 대공', '여주에게만 약해지는 검술의 천재', '냉혹하나 헌신적인 황제', '과거의 그녀를 못 잊은 기사단장',
    '비밀을 품은 은발의 마탑주', '겉은 다정 속은 위험한 신관', '회귀 사실을 눈치챈 적국 황자', '무뚝뚝한 호위 기사', '정략으로 묶인 차가운 공작',
    '여주만 보면 무너지는 폭군', '죽은 줄 알았던 첫사랑 공자', '서브남주 같았으나 진짜 흑막', '신의 권능을 지닌 대신관', '딸바보로 함락당하는 무심한 아버지',
    '용의 피를 이은 변경백', '저주에 묶인 불멸의 흑마법사', '계약 정령의 형상을 한 미지의 존재', '복수만 좇던 용병단의 단장', '황실 비밀정보부를 쥔 그림자 공작' ] },

  { key: 'device', label: '서사 장치', options: [
    '회귀 — 여주만 미래를 안다', '빙의 — 원작 지식이 무기이자 족쇄', '환생 — 전생의 기억이 현재를 흔든다', '원작 강제력이 운명을 옭아맨다', '악역 파멸 플래그를 피하려 한다',
    '남주 호감도가 이유 없이 오른다', '신탁·예언이 여주를 지목한다', '계약 관계가 진심으로 기운다', '남주 독백이 그의 진심을 폭로한다', '독자만 아는 오해와 정보 격차',
    '전생의 죽음·배신이 판단을 지배한다', '천대받던 출신에 숨겨진 고귀함', '전생 지식으로 사업을 일으킨다', '상태창·호감도 시스템이 작동한다', '정해진 결말을 비틀려는 시도' ] },

  { key: 'goal', label: '여주의 목표', options: [
    '조용히 이혼하려', '이번 생엔 살아남으려', '파멸 엔딩을 피하려', '배신자에게 복수를 끝내려', '어린 딸을 지키려',
    '원작 결말을 비틀려', '오해를 풀고 진심을 전하려', '가문의 누명을 벗기려', '신분의 벽을 넘으려', '남주의 집착에서 벗어나려',
    '예언을 거스르려', '잃었던 자리를 되찾으려', '금지된 진실을 밝히려', '계약을 깨끗이 끝내려', '운명을 스스로 개척하려',
    '동생의 빚을 대신 갚으려', '망해가는 영지를 일으키려', '저주의 근원을 끊어내려', '잊힌 첫사랑을 되찾으려', '제 손으로 황실을 떠나려' ] },

  { key: 'obstacle', label: '고구마(장애)', options: [
    '라이벌 영애가 여주를 모함한다', '남주가 그녀를 오해한다', '회귀·빙의 비밀이 들통날 위기다', '약혼 방해와 정치 음모가 얽힌다', '가문이 정략결혼을 강요한다',
    '원작 강제력이 운명을 되돌린다', '믿었던 이가 등을 돌린다', '신분차가 두 사람을 가른다', '과거 여자의 그림자가 끼어든다', '독살·암살 위협이 드리운다',
    '사교계가 일제히 손가락질한다', '황실 권력다툼에 휘말린다', '전생 트라우마가 발목을 잡는다', '진실을 말해도 아무도 믿지 않는다', '시간이 얼마 남지 않았다',
    '계약서의 독소 조항이 발목을 잡는다', '거짓 소문이 무도회를 휩쓴다', '봉인이 풀려 마수가 영지를 위협한다', '황명이 두 사람을 갈라놓는다', '잊었던 전생의 원수가 나타난다' ] },

  { key: 'mood', label: '분위기', options: [
    '묘한 설렘이 감돈다', '숨 막히는 긴장이 흐른다', '아련한 그리움이 번진다', '서늘한 집착이 스민다', '결연한 각오가 선다',
    '쓸쓸한 체념이 깔린다', '들뜬 기대가 차오른다', '불길한 예감이 감돈다', '달콤한 두근거림이 인다', '폭발 직전의 침묵이 흐른다',
    '몽환적인 황홀이 어린다', '냉소적 거리감이 선명하다', '경건한 떨림이 감돈다', '씁쓸한 후회가 밀려온다', '통쾌한 사이다가 터진다',
    '아슬아슬한 긴장이 팽팽하다', '나른한 안온함이 내려앉는다', '서글픈 애틋함이 차오른다', '날 선 경계가 곤두선다', '벅찬 환희가 번진다' ] },

  { key: 'turn', label: '전환·심쿵 사건', options: [
    '남주가 위기의 순간 공주님 안기로 구한다', '벽치기에 도망갈 곳이 사라진다', '"내 것"이라며 손목을 잡아끈다', '차가운 줄 알았던 그의 손끝에 온기가 돈다', '만조백관 앞에서 그가 여주를 지목한다',
    '무도회에서 악역의 죄가 폭로된다', '죽은 줄 알았던 자가 문을 열고 들어선다', '편지 한 통이 모든 진실을 뒤집는다', '남주가 정치적 손해를 감수하고 그녀를 택한다', '봉인된 신탁이 마침내 실현된다',
    '"도망치지 마"라는 낮은 목소리가 귓가에 닿는다', '회귀 비밀이 남주에게 들키지만 그는 포용한다', '가면 너머의 얼굴이 드러난다', '어린 여주가 혀 짧은 말로 그를 함락시킨다', '독배가 바뀌어 음모가 자멸한다',
    '예언의 성흔이 여주의 몸에 떠오른다', '약혼이 만인 앞에서 파기되고 그가 손을 내민다', '정령왕이 여주에게 무릎을 꿇는다', '그가 자신의 외투로 그녀를 감싼다', '재판정에서 증거가 뒤집혀 악역이 무너진다' ] },

  { key: 'hbeat', label: '남주 독백 한 줄', options: [
    '‘왜 이 여자에게서 눈을 뗄 수가 없지.’', '‘이전과 다르다. 그녀가… 나를 보지 않는다.’', '‘도망쳐도 소용없어. 결국 내 곁일 테니.’', '‘이 떨림의 정체를 인정하고 싶지 않다.’', '‘그녀가 웃으면 세상이 멈춘다.’',
    '‘누구든 그녀를 해치면 살려두지 않겠다.’', '‘처음으로, 무릎 꿇어도 좋다고 생각했다.’', '‘그 눈동자에 다른 남자가 비치는 건 참을 수 없다.’', '‘나는 이미, 돌이킬 수 없을 만큼 빠졌다.’', '‘그녀의 손이 차다. 데워주고 싶다.’',
    '‘원작에서 그녀는 내 것이 아니었다. 이번엔 다르다.’', '‘이 감정을 뭐라 불러야 하나.’', '‘그녀가 위험하다는 사실이 나를 미치게 한다.’', '‘딱 한 번만, 안아봐도 될까.’', '‘세상 전부와 등지더라도, 그녀만은.’',
    '‘그녀가 떠난다면, 이 제국이 무슨 소용인가.’', '‘웃는 얼굴 뒤의 그늘까지 갖고 싶다.’', '‘나는 그녀의 적이었는데, 왜 지키고 싶지.’', '‘이 손을 놓으면 다시는 못 잡을 것 같다.’', '‘그녀의 비밀마저, 내가 안아주겠다.’' ] },

  { key: 'sensory', label: '감각 디테일', options: [
    '그의 옷깃에 밴 베르가못 향', '손끝에 닿는 차가운 비단 장갑', '귓가를 스치는 낮은 숨소리', '장미 향과 촛농 냄새가 뒤섞인 공기', '심장이 한 박자 멎는 정적',
    '눈송이가 속눈썹에 내려앉는 감촉', '맞닿은 손바닥의 뜻밖의 온기', '뺨을 스치는 그의 입김', '드레스 자락이 바닥을 쓰는 소리', '멀리서 울리는 신전의 종소리',
    '입안에 도는 와인의 떫은맛', '목덜미를 타고 흐르는 식은땀', '보랏빛 눈동자에 비친 자신의 얼굴', '오래된 양피지의 곰팡내', '손목을 옥죄는 단단한 힘',
    '벽난로에서 튀는 장작 불티', '머리칼을 쓸어 넘기는 손길', '코끝을 적시는 빗방울의 냉기', '발밑에서 부서지는 첫서리', '맞잡은 손에 스미는 떨림' ] },

  { key: 'subtype', label: '하위유형 태그', options: [
    '회귀물', '악역영애 빙의물', '환생·육아물', '계약결혼물', '정략결혼물', '황궁·제국물', '사교계 서양풍', '동양풍 후궁·세가', '소설 속 세계물', '성좌·신물물',
    '다크로판', '힐링로판', '딸바보·아빠물', '집착광공물', '복수 사이다물',
    '먼치킨 성장물', '음모·정쟁물', '신수·계약 정령물', '상태창 시스템물', '변경백 영지물' ] },
]

// ── 전개법(장면 비트) 프리셋 — 도시에의 매크로 구조/클라이맥스 관습 반영 ────────
interface Beat { id: string; name: string; build: (v: (k: string) => string) => string }
const BEATS: Beat[] = [
  { id: 'meetcute', name: '첫 접촉(적대·계약)', build: v =>
    `[${v('subtype')}] ${v('place')}, ${v('time')}. ${J.eunNeun(v('heroine'))} ${v('goal')} 한다. 그러나 ${v('obstacle')}. ${v('device')}. ${J.waGwa(v('hero'))} 처음 마주친 순간, ${v('mood')}. ${v('sensory')}. 그때, ${v('turn')}. ${v('hbeat')}` },
  { id: 'pining', name: '거리 좁히기(설렘)', build: v =>
    `[${v('subtype')}] ${v('place')}, ${v('time')}. ${J.waGwa(v('heroine'))} ${v('hero')} 사이로 ${v('mood')}. ${J.eunNeun(v('heroine'))} ${v('goal')} 하지만 ${v('obstacle')}. ${v('device')}. ${J.iGa(v('sensory'))} 두 사람의 거리를 좁힌다. 마침내 ${v('turn')}. ${v('hbeat')}` },
  { id: 'crisis', name: '위기·오해(고구마)', build: v =>
    `[${v('subtype')}] ${v('place')}, ${v('time')}. ${v('obstacle')}. ${J.eunNeun(v('heroine'))} ${v('goal')} 하나 궁지에 몰린다. ${v('device')}. 두 사람 사이엔 ${v('mood')}. ${v('sensory')}. 절체절명의 순간, ${v('turn')}. ${v('hbeat')}` },
  { id: 'climax', name: '클라이맥스(사이다 역전)', build: v =>
    `[${v('subtype')}] ${v('place')}, ${v('time')}. 만인이 지켜보는 가운데 갈등이 절정에 달한다. ${v('obstacle')}. ${v('device')}. ${J.eunNeun(v('heroine'))} 이를 무기로 ${v('goal')} 한다. 분위기는 ${v('mood')}. 그 순간 ${v('turn')} — ${v('hero')}의 마음이 확정된다. ${v('sensory')}. ${v('hbeat')}` },
  { id: 'sweet', name: '후일담(달달 외전)', build: v =>
    `[${v('subtype')}] ${v('place')}, ${v('time')}. 모든 위기가 끝난 뒤, ${J.waGwa(v('heroine'))} ${v('hero')} 사이에 ${v('mood')}. 더는 ${v('goal')} 애쓰지 않아도 된다. ${v('sensory')}. 문득 ${v('turn')}. ${v('hbeat')}` },
]

// 조합수: 슬롯 옵션 곱 × 전개법 수
const SLOT_COMBOS = SLOTS.reduce((n, s) => n * s.options.length, 1)
const COMBOS = SLOT_COMBOS * BEATS.length

function randIdx(n: number) { return Math.floor(Math.random() * n) }

export default function RomfanSceneForge({ payload }: { payload?: Record<string, unknown> }) {
  const payloadSub = typeof payload?.genre === 'string' ? String(payload.genre) : ''
  const [picks, setPicks] = useState<Record<string, number>>(() => Object.fromEntries(SLOTS.map((s) => [s.key, randIdx(s.options.length)])))
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [beatIdx, setBeatIdx] = useState(0)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState('')

  const rollAll = () => setPicks((p) => Object.fromEntries(SLOTS.map((s) => [s.key, locked[s.key] ? p[s.key] : randIdx(s.options.length)])))
  const rollOne = (k: string) => setPicks((p) => ({ ...p, [k]: randIdx(SLOTS.find((s) => s.key === k)!.options.length) }))
  const toggleLock = (k: string) => setLocked((l) => ({ ...l, [k]: !l[k] }))

  const val = (k: string) => SLOTS.find((s) => s.key === k)!.options[picks[k]]
  const beat = BEATS[beatIdx]
  const sceneText = useMemo(() => beat.build(val), [picks, beatIdx]) // eslint-disable-line react-hooks/exhaustive-deps
  const sceneTitle = `${val('heroine')} × ${val('hero')} · ${beat.name}`

  const copy = () => { navigator.clipboard?.writeText(sceneText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400) }).catch(() => {}) }
  const flash = (m: string) => { setSaved(m); setTimeout(() => setSaved(''), 1600) }
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const toProject = () => {
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '장면',
      title: sceneTitle,
      bodyHtml: `<p><b>${esc(beat.name)}</b> · ${esc(val('subtype'))}</p><p>${esc(sceneText)}</p>`,
      synopsis: sceneText,
      meta: { 무대: val('place'), 여주: val('heroine'), 남주: val('hero'), 장치: val('device'), 분위기: val('mood'), 유형: val('subtype'), 전개법: beat.name },
    })
    flash(id ? '프로젝트 원고 「장면」 폴더에 추가됨' : '프로젝트에 연결되어 있지 않습니다')
  }
  const toSnippet = () => { addToLibrary('snippets', { text: sceneText, source: '로판 장면 생성기', tags: ['장면', '로맨스판타지', val('subtype'), beat.name] }); flash('스니펫으로 저장') }
  const toLibPlace = () => { addToLibrary('places', { name: val('place'), kind: '로판 무대', mood: val('mood'), sensory: val('sensory'), notes: sceneText, fields: { name: val('place'), kind: '로판 무대', atmosphere: val('mood'), sensory: val('sensory'), notes: sceneText }, source: '로판 장면 생성기' }); flash('배경 라이브러리에 무대 저장') }
  const toSceneList = () => { openToolLinked('scene-list', { scene: { title: sceneTitle, summary: sceneText, pov: val('heroine'), place: val('place'), goal: val('goal'), conflict: val('obstacle'), mood: val('mood') } }); flash('장면 목록으로 보냄') }
  const toCharacter = () => { openToolLinked('character-forge', { genre: '로맨스판타지', hint: val('hero') }); flash('인물 생성기로 이동') }
  const toEmotion = () => { openToolLinked('emotion-arc', { genre: '로맨스판타지' }); flash('감정 곡선으로 이동') }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        로맨스판타지 전형 장면 <b style={{ color: 'var(--accent)' }}>{COMBOS.toLocaleString()}</b>가지(전개법 {BEATS.length}종 포함). 슬롯을 <Emoji e="🔒"/> 잠그고 나머지만 <Emoji e="🎲"/> 돌려 원하는 장면을 찾으세요.
        {payloadSub && <span> · 요청 장르: <b>{payloadSub}</b></span>}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {BEATS.map((b, i) => (
          <button key={b.id} className={i === beatIdx ? 'btn-primary' : 'minibtn'} onClick={() => setBeatIdx(i)} title="전개법(장면 비트) 적용">{b.name}</button>
        ))}
      </div>

      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 14.5, lineHeight: 1.7 }}>
        {sceneText}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SLOTS.map((s) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', width: 78, flexShrink: 0 }}>{s.label}</span>
            <span style={{ flex: 1, fontSize: 13, minWidth: 0 }}>{s.options[picks[s.key]]}</span>
            <button className="minibtn" title={locked[s.key] ? '잠금 해제' : '이 슬롯 잠금'} onClick={() => toggleLock(s.key)} style={{ color: locked[s.key] ? 'var(--accent)' : 'var(--muted)' }}>{locked[s.key] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
            <button className="minibtn" title="이 슬롯만 다시" onClick={() => rollOne(s.key)} disabled={locked[s.key]}><Emoji e="🎲"/></button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={rollAll}><Emoji e="🎲"/> 장면 생성</button>
        <button className="minibtn" onClick={copy}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
      </div>
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '현재 장면을 프로젝트 원고 「장면」 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={toSnippet}><Emoji e="📥"/> 스니펫 저장</button>
        <button className="linkbtn" onClick={toLibPlace}><Emoji e="🏞"/> 무대 저장</button>
        <button className="linkbtn" onClick={toSceneList}><Emoji e="📋"/> 장면 목록으로</button>
        <button className="linkbtn" onClick={toCharacter}><Emoji e="🪪"/> 인물 생성기</button>
        <button className="linkbtn" onClick={toEmotion}><Emoji e="💗"/> 감정 곡선</button>
      </div>
      {saved && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>✓ {saved}</div>}
    </div>
  )
}
