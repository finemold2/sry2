// 색 분위기 팔레트 — 무작위 5색(HSL) 팔레트를 만들어 각 색의 hex와 연상 분위기 단어를 보여주고,
// 그 분위기로 한 장면의 글감을 제시한다. 외부 네트워크/라이브러리 없이 로컬 매핑만으로 동작한다.
import { useState, useEffect, useCallback } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'color-mood-palette', name: '색 분위기 팔레트', icon: '🎨', group: '분위기·시각', intro: '무작위 5색 팔레트로 장면의 분위기를 잡으세요', w: 420, h: 600 }

interface Swatch { h: number; s: number; l: number; hex: string; mood: string; light: boolean }

// 색상환(hue)을 12구간으로 나눠 연상 분위기 단어 후보를 매핑한다.
const HUE_MOODS: { max: number; words: string[] }[] = [
  { max: 15, words: ['타오르는 열정', '위태로운 분노', '뜨거운 충동'] },
  { max: 40, words: ['노을의 향수', '따스한 모험', '활기찬 설렘'] },
  { max: 65, words: ['눈부신 명랑', '경쾌한 호기심', '환한 기대'] },
  { max: 90, words: ['싱그러운 시작', '풋풋한 생기', '맑은 희망'] },
  { max: 150, words: ['고요한 안정', '깊은 숲의 평온', '치유의 위안'] },
  { max: 180, words: ['청량한 해방감', '서늘한 명료', '잔잔한 신선함'] },
  { max: 210, words: ['투명한 그리움', '시원한 사색', '맑은 거리감'] },
  { max: 250, words: ['차분한 고독', '깊은 침잠', '서늘한 우수'] },
  { max: 280, words: ['몽환적 신비', '아련한 환상', '조용한 동경'] },
  { max: 320, words: ['은밀한 매혹', '우아한 비밀', '나른한 관능'] },
  { max: 345, words: ['달콤한 설렘', '여린 다정함', '부드러운 떨림'] },
  { max: 361, words: ['은근한 긴장', '붉은 예감', '강렬한 끌림'] },
]

// 채도/명도 보정 단어 — 분위기에 질감을 더한다.
const TONE_LOW_SAT = ['바랜', '먼지 낀', '안개 같은', '빛바랜']
const TONE_HIGH_SAT = ['선명한', '강렬한', '쨍한', '도드라진']
const TONE_DARK = ['어둑한', '묵직한', '그늘진', '깊은']
const TONE_BRIGHT = ['환한', '투명한', '들뜬', '밝은']

// 팔레트 전체 분위기로 떠올릴 장면 글감.
const SCENE_PROMPTS = [
  '이 색들이 한 장면을 채운다면 어디일까요? 그 공간을 한 문단으로 묘사하세요.',
  '이 분위기 속에 놓인 한 사람을 떠올리고, 그가 무엇을 기다리는지 써보세요.',
  '가장 강렬한 색이 이 장면의 감정이라면, 그 감정의 이유를 이야기로 만드세요.',
  '이 색감이 하루 중 어느 시간인지 정하고, 그 시간의 공기를 묘사하세요.',
  '이 팔레트가 한 사람의 기억이라면, 어떤 장면이 거기 잠겨 있을까요?',
  '두 인물이 이 색의 방에서 마주합니다. 그들 사이의 침묵을 그려보세요.',
  '이 분위기에서 시작해 정반대 색으로 끝나는 장면을 상상해보세요.',
  '이 색들 중 하나가 사라진다면 장면은 어떻게 변할까요? 그 변화를 써보세요.',
  '이 팔레트를 입은 계절을 정하고, 그 계절의 첫 문장을 적어보세요.',
  '이 색감이 어울리는 한 줄 대사를 떠올리고, 그 말이 나온 상황을 쓰세요.',
  '이 색들 중 가장 차가운 색에서 시작하는 한 문단을 써보세요.',
  '이 분위기가 어울리는 인물의 직업을 정하고, 그의 작업실을 묘사하세요.',
  '이 팔레트가 어느 도시의 풍경이라면, 그 거리의 소리를 적어보세요.',
  '이 색감이 깔린 식탁을 떠올리고, 그 자리에 모인 사람들을 그려보세요.',
  '가장 밝은 색을 한 인물의 희망으로 삼아, 그 희망의 모양을 써보세요.',
  '이 분위기에서 들려올 법한 음악을 정하고, 그 곡이 흐르는 장면을 쓰세요.',
  '이 색들이 어떤 편지의 분위기라면, 그 편지의 첫 줄을 적어보세요.',
  '이 팔레트가 한 꿈의 색이라면, 그 꿈에서 깨는 순간을 묘사하세요.',
  '이 색감으로 칠한 문을 떠올리고, 그 문 너머에 무엇이 있는지 쓰세요.',
  '이 분위기를 품은 한 사물을 정하고, 그 사물의 내력을 짧게 써보세요.',
  '이 색들이 어떤 이별의 풍경이라면, 그 장면의 마지막 대사를 적어보세요.',
  '이 팔레트가 어울리는 날씨를 정하고, 그 날씨 속 인물의 걸음을 그리세요.',
  '가장 어두운 색을 한 비밀로 삼아, 그 비밀이 드러나는 순간을 쓰세요.',
  '이 색감이 감도는 창가를 떠올리고, 그 창으로 보이는 바깥을 묘사하세요.',
  '이 분위기로 시작하는 한 편의 일기를 첫 문장만 적어보세요.',
  '이 색들이 어떤 재회의 색이라면, 두 사람이 처음 건넨 말을 쓰세요.',
  '이 팔레트가 어울리는 향을 떠올리고, 그 향이 불러온 기억을 적어보세요.',
  '이 색감이 흐르는 강을 상상하고, 그 물가에 선 인물의 마음을 쓰세요.',
]

// 받침(종성) 유무를 보고 조사를 골라 붙이는 헬퍼 — "을(를)" 같은 이중표기를 절대 내지 않는다.
function hasFinalConsonant(word: string): boolean {
  const ch = word.charCodeAt(word.length - 1)
  if (ch < 0xac00 || ch > 0xd7a3) return false // 한글 음절이 아니면 받침 없음으로 처리
  return (ch - 0xac00) % 28 !== 0
}
function josa(word: string, withJong: string, withoutJong: string): string {
  return word + (hasFinalConsonant(word) ? withJong : withoutJong)
}

// ── 분위기 한 문장(카드)을 만드는 독립 슬롯들 ──────────────────────────────
// 각 슬롯은 문법 역할이 고정되어 서로 자유롭게 곱집합으로 섞여도 의미가 충돌하지 않는다.
// 문장 골격:  "{TIME}, {PLACE}{에/에서}  {SUBJECT}{이/가}  {PREDICATE}"  (+ 톤 형용사는 색별 mood에)
// SUBJECT 자리엔 '분위기 명사'만, PREDICATE 자리엔 '종결문'만 들어가 역할이 어긋나지 않는다.

// 1) 시간·계절 (문두 부사구) — 모두 명사구, 쉼표로 분리되어 어떤 본문과도 호응
const TIME_PHRASES = [
  '이른 새벽', '동트기 직전', '해 뜰 무렵', '아침나절', '늦은 오전', '한낮', '나른한 오후',
  '해 질 녘', '땅거미 질 무렵', '초저녁', '깊은 밤', '자정 무렵', '동지의 긴 밤', '한여름 정오',
  '늦가을 오후', '첫눈 내린 아침', '장마철 한낮', '봄볕 좋은 한때', '서리 내린 새벽', '폭염의 한낮',
  '비 갠 직후', '눈 그친 저녁', '안개 낀 아침', '바람 부는 정오', '노을이 번지는 시각',
  '별이 돋는 무렵', '달이 차오른 밤', '환절기의 어느 오후', '연휴 끝자락', '계절이 바뀌는 길목',
  '늦봄의 저녁', '초여름 새벽', '한겨울 정오', '가을 끝물', '눈 오기 전의 고요',
  '소나기 지나간 뒤', '여명이 트는 시각', '땅이 식어가는 밤', '햇살이 길어지는 오후', '하루가 저무는 끝',
  '첫차가 끊긴 새벽', '막차가 떠난 밤', '점심 지난 한때', '퇴근 무렵', '주말 늦은 아침',
]

// 2) 장소 (배경 명사) — '에서'로 받아 어떤 분위기와도 결합
const PLACE_NOUNS = [
  '오래된 골목', '비 젖은 부두', '낡은 서재', '텅 빈 극장', '바닷가 절벽', '안개 낀 숲', '폐역 승강장',
  '도시의 옥상', '강가 산책로', '눈 덮인 들판', '유리온실', '지하 카페', '낡은 등대', '버려진 정원',
  '산중 암자', '항구의 창고', '한밤의 다리 위', '시골 정류장', '오래된 도서관', '물안개 낀 호숫가',
  '좁은 다락방', '눈부신 모래사장', '잿빛 공장지대', '돌담길', '연못가 정자', '깊은 동굴 입구',
  '바람 부는 언덕', '낡은 기차 안', '불 꺼진 사무실', '새벽 시장', '눈 내리는 광장', '낮은 처마 아래',
  '강둑의 갈대밭', '폐허가 된 성', '한적한 묘지', '얼어붙은 강', '꽃 진 화원', '먼지 쌓인 창고',
  '빗소리 가득한 처마', '별빛 아래 사막', '습기 찬 지하실', '낡은 회랑', '물에 잠긴 마을', '고요한 수도원',
  '눈 쌓인 자작나무 숲',
]

// 3) 분위기 명사(SUBJECT) — '이/가' 조사로 받는다(josa 헬퍼). 모두 추상 분위기 명사로 역할 고정.
const MOOD_SUBJECTS = [
  '고요', '쓸쓸함', '설렘', '긴장', '그리움', '평온', '권태', '불안', '안도', '동경', '체념', '환희',
  '향수', '서글픔', '기대', '경외', '나른함', '두려움', '온기', '냉기', '아련함', '들뜸', '먹먹함',
  '홀가분함', '막막함', '벅참', '서늘함', '아늑함', '먹빛 침묵', '옅은 흥분', '깊은 침잠', '잔잔한 슬픔',
  '낯선 설렘', '오랜 외로움', '묘한 끌림', '희미한 희망', '말 없는 위로', '뜨거운 충동', '서린 분노',
  '맑은 해방감', '은근한 떨림', '메마른 적막', '포근한 졸음', '아릿한 미련', '담담한 용기',
]

// 4) 종결문(PREDICATE) — 모두 완결된 종결 어미. 주어 자리에 들어갈 수 없는 술어로 역할 고정.
const PREDICATES = [
  '천천히 번져 갔다.', '오래 머물렀다.', '공기를 가득 채웠다.', '발끝부터 스며들었다.', '소리 없이 깊어졌다.',
  '가슴 한구석을 적셨다.', '문득 차올랐다.', '조용히 가라앉았다.', '온몸을 감쌌다.', '서서히 식어 갔다.',
  '한참을 맴돌았다.', '결국 흩어졌다.', '가만히 내려앉았다.', '먼 데서 밀려왔다.', '손끝에 닿을 듯했다.',
  '오래도록 가시지 않았다.', '문틈으로 새어 들었다.', '점점 또렷해졌다.', '아득히 멀어졌다.', '잔잔히 퍼졌다.',
  '숨결처럼 스쳐 갔다.', '한 박자 늦게 찾아왔다.', '모든 것을 잠재웠다.', '말없이 깊어만 갔다.', '천천히 무너져 내렸다.',
  '빛처럼 번졌다.', '안개처럼 흐려졌다.', '뼛속까지 파고들었다.', '오래 곱씹게 했다.', '쉽사리 가시지 않았다.',
  '조용히 차올라 넘쳤다.', '한순간에 사라졌다.', '아주 천천히 풀렸다.', '문득 선명해졌다가 흩어졌다.', '계속 맴돌며 떠나지 않았다.',
  '잔향처럼 남았다.', '서서히 짙어졌다.', '모서리마다 고였다.', '바람결에 실려 갔다.', '끝내 가라앉지 못했다.',
  '천천히 차오르다 멎었다.', '깊은 곳에서 울렸다.', '하염없이 길어졌다.', '소리 없이 차올랐다.', '오래 그 자리에 머물렀다.',
]

// 5) 전체를 여는 분위기 형용사(LEAD) — 문두에 붙어 카드 전체 톤을 정한다(명사 SUBJECT를 꾸미는 관형 역할은 아님, 문장 머리말).
const LEAD_TONES = [
  '어쩐지', '문득', '돌이켜 보면', '그 무렵', '이상하게도', '말없이', '천천히', '한순간', '오래도록', '여전히',
  '가만히', '느닷없이', '조용히', '서서히', '아련하게', '낯설게', '아득하게', '담담하게', '나직이', '은근하게',
  '먼발치에서', '어느새', '돌연', '아주 잠깐', '내내', '끝끝내', '하염없이', '문득문득', '시나브로', '뒤늦게',
  '오롯이', '고스란히', '잔잔하게', '묵묵히', '깊이', '어렴풋이', '희미하게', '또렷하게', '느릿느릿', '한결같이',
  '괜스레', '새삼', '여태', '불현듯', '줄곧',
]

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

// 분위기 한 문장(카드) 생성 — 5개의 독립 슬롯을 곱집합으로 조합한다.
// SCENE_PROMPTS 와 함께 화면에 노출되는 텍스트 조합의 핵심 곱.
function makeMoodLine(): string {
  const lead = pick(LEAD_TONES)
  const time = pick(TIME_PHRASES)
  const place = pick(PLACE_NOUNS)
  const subject = pick(MOOD_SUBJECTS)
  const predicate = pick(PREDICATES)
  // 장소+"에서", 주어+"이/가"는 받침을 보고 실제 조사를 골라 붙인다(이중표기 없음).
  return `${lead}, ${time}의 ${place}에서 ${josa(subject, '이', '가')} ${predicate}`
}

// 화면·코드에서 함께 쓰는 '조합 가짓수' — 한 결과를 만들 때 곱해지는 독립 슬롯 풀 크기의 곱.
//   분위기 카드 5슬롯(LEAD·TIME·PLACE·SUBJECT·PREDICATE) × 장면 글감(SCENE_PROMPTS)
const COMBOS =
  LEAD_TONES.length *
  TIME_PHRASES.length *
  PLACE_NOUNS.length *
  MOOD_SUBJECTS.length *
  PREDICATES.length *
  SCENE_PROMPTS.length
const COMBOS_LABEL = COMBOS.toLocaleString('ko-KR')

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100, lN = l / 100
  const c = (1 - Math.abs(2 * lN - 1)) * sN
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lN - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x } else if (h < 120) { r = x; g = c } else if (h < 180) { g = c; b = x } else if (h < 240) { g = x; b = c } else if (h < 300) { r = x; b = c } else { r = c; b = x }
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return ('#' + to(r) + to(g) + to(b)).toUpperCase()
}

function moodFor(h: number, s: number, l: number): string {
  const base = (HUE_MOODS.find((b) => h < b.max) || HUE_MOODS[HUE_MOODS.length - 1]).words
  let word = pick(base)
  // 채도·명도에 따라 톤 형용사를 앞에 붙여 변주(무채색에 가까우면 채도 톤 우선)
  if (s < 25) word = pick(TONE_LOW_SAT) + ' ' + word
  else if (s > 75) word = pick(TONE_HIGH_SAT) + ' ' + word
  else if (l < 35) word = pick(TONE_DARK) + ' ' + word
  else if (l > 70) word = pick(TONE_BRIGHT) + ' ' + word
  return word
}

function makePalette(): Swatch[] {
  // 기준 색상에서 일정 간격으로 회전시켜 조화로우면서도 무작위인 5색을 만든다.
  const baseH = Math.floor(Math.random() * 360)
  const step = 30 + Math.floor(Math.random() * 60) // 30~89도 간격
  const out: Swatch[] = []
  for (let i = 0; i < 5; i++) {
    const h = (baseH + step * i + Math.floor(Math.random() * 18 - 9) + 360) % 360
    const s = 30 + Math.floor(Math.random() * 65)   // 30~94
    const l = 28 + Math.floor(Math.random() * 52)   // 28~79
    out.push({ h, s, l, hex: hslToHex(h, s, l), mood: moodFor(h, s, l), light: l > 58 })
  }
  return out
}

export default function ColorMoodPalette() {
  const [palette, setPalette] = useState<Swatch[]>([])
  const [prompt, setPrompt] = useState(SCENE_PROMPTS[0])
  const [moodLine, setMoodLine] = useState(makeMoodLine())
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [saved, setSaved] = useState('')

  const regen = useCallback(() => {
    setPalette(makePalette())
    setPrompt(pick(SCENE_PROMPTS))
    setMoodLine(makeMoodLine())
    setCopiedIdx(null)
    setCopiedAll(false)
    setSaved('')
  }, [])

  useEffect(() => { regen() }, [regen])

  const safeCopy = (text: string, onDone: () => void) => {
    try {
      navigator.clipboard?.writeText(text).then(onDone).catch(() => {})
    } catch { /* 클립보드 미지원·권한 거부 무시 */ }
  }

  const copyHex = (sw: Swatch, idx: number) => {
    safeCopy(sw.hex, () => { setCopiedIdx(idx); setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 1200) })
  }

  const copyAll = () => {
    if (!palette.length) return
    const list = palette.map((sw) => `${sw.hex}  ${sw.mood}`).join('\n')
    const text = `색 분위기 팔레트\n${list}\n\n분위기 한 문장: ${moodLine}\n글감: ${prompt}`
    safeCopy(text, () => { setCopiedAll(true); setTimeout(() => setCopiedAll(false), 1500) })
  }

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const toProject = () => {
    if (!palette.length) return
    const swatchRows = palette
      .map((sw) => `<li><strong>${esc(sw.hex)}</strong> — ${esc(sw.mood)} <span style="color:#888">(H${sw.h} · S${sw.s} · L${sw.l})</span></li>`)
      .join('')
    const bodyHtml = [
      '<p><strong>색 분위기 팔레트</strong></p>',
      `<ul>${swatchRows}</ul>`,
      `<p><strong>분위기 한 문장:</strong> ${esc(moodLine)}</p>`,
      `<p><strong>장면 글감:</strong> ${esc(prompt)}</p>`,
    ].join('')
    const meta: Record<string, string> = {
      색상: palette.map((sw) => sw.hex).join(', '),
      분위기: palette.map((sw) => sw.mood).join(', '),
      분위기문장: moodLine,
    }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '분위기 메모',
      title: '색 분위기 팔레트 · ' + palette.map((sw) => sw.hex).join(' '),
      bodyHtml,
      meta,
    })
    setSaved(id ? '프로젝트 자료에 분위기 메모 추가됨' : '프로젝트에 연결되지 않았습니다')
    setTimeout(() => setSaved(''), 1800)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)', boxSizing: 'border-box' }

  return (
    <div style={wrap}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        무작위 <b>5색 팔레트</b>와 각 색의 연상 분위기로 장면의 공기를 잡으세요. 색을 누르면 hex가 복사됩니다.
      </div>

      {/* 가로 색 띠 미리보기 */}
      <div style={{ display: 'flex', height: 56, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
        {palette.map((sw, i) => (
          <div key={i} title={sw.hex} style={{ flex: 1, background: `hsl(${sw.h} ${sw.s}% ${sw.l}%)` }} />
        ))}
      </div>

      {/* 색별 카드 목록 */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {palette.map((sw, i) => (
          <button
            key={i}
            onClick={() => copyHex(sw, i)}
            title="클릭하면 hex 복사"
            style={{
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer',
              background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 10, width: '100%',
            }}
          >
            <span style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0, background: `hsl(${sw.h} ${sw.s}% ${sw.l}%)`, border: '1px solid var(--border)' }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{sw.hex}</span>
              <span style={{ display: 'block', fontSize: 13, color: 'var(--text)', marginTop: 2 }}>{sw.mood}</span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>H{sw.h} · S{sw.s} · L{sw.l}</span>
            </span>
            <span style={{ fontSize: 11, color: copiedIdx === i ? 'var(--ok)' : 'var(--muted)', flexShrink: 0 }}>
              {copiedIdx === i ? <>✓ 복사됨</> : <><Emoji e="📋"/> hex</>}
            </span>
          </button>
        ))}
      </div>

      {/* 분위기 한 문장 (독립 슬롯 곱집합) */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.6, flexShrink: 0 }}>
        <div style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: 6, fontSize: 12 }}><Emoji e="🌫️"/> 분위기 한 문장</div>
        {moodLine}
      </div>

      {/* 장면 글감 */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.55, flexShrink: 0 }}>
        <div style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: 6, fontSize: 12 }}><Emoji e="✍️"/> 이 분위기의 장면</div>
        {prompt}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={regen}><Emoji e="🔀"/> 다른 팔레트</button>
        <button className="minibtn" onClick={() => setMoodLine(makeMoodLine())} disabled={!palette.length}><Emoji e="🌫️"/> 다른 분위기 문장</button>
        <button className="minibtn" onClick={() => setPrompt(pick(SCENE_PROMPTS))} disabled={!palette.length}><Emoji e="💡"/> 다른 글감</button>
        <button className="minibtn" onClick={copyAll} disabled={!palette.length}>{copiedAll ? <>✓ 복사됨</> : <><Emoji e="📋"/> 글쓰기에 활용</>}</button>
      </div>
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!palette.length || !hasProjectBridge()}
          title={hasProjectBridge() ? '현재 팔레트(hex·분위기·글감)를 프로젝트 자료의 "분위기 메모"에 추가' : '프로젝트에 연결되어 있지 않습니다'}
        ><Emoji e="📄"/> 프로젝트에 추가</button>
      </div>
      {saved && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>✓ {saved}</div>}
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>색은 분위기의 출발점일 뿐입니다. 연상 단어를 변주해 장면의 감정과 공기를 자유롭게 그려보세요.</div>
      <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>분위기 문장 조합 가짓수: 약 {COMBOS_LABEL}가지</div>
    </div>
  )
}
