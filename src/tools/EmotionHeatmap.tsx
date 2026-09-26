// 감정 히트맵 — 원고를 문장 단위로 분리하고, 100% 로컬 감정 사전으로 문장마다
//  · 감정값(valence, -1~+1)  · 우세 감정(기쁨/슬픔/분노/공포/사랑/놀람/혐오/기대 8종)  · 강도(intensity)
// 를 추정해 문장을 색(따뜻↔차가움, 진하기=강도)으로 칠한 히트맵으로 보여준다.
// 강조어(정말/매우…)·부정어(안/못/않…) 가중치, 감정 분포 요약/막대, 감정 흐름 진단을 제공.
// 연계: 좌측 바인더 파일 드롭으로 원고 수용, 감정이 강한 문장을 글감 스니펫으로 저장,
//        수집함에 리포트 담기, 프로젝트(자료 › 교정)에 감정 히트맵 리포트 문서로 추가.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크/미디어 불필요(전부 브라우저 로컬 계산).
//        localStorage 'sry:tool:emotion-heatmap' 자동 저장/복원. 타이머·언마운트 정리 완비.
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  addToLibrary,
  getDragItem, isItemDrag,
  Emoji,
} from './linkbus'

export const meta = {
  id: 'emotion-heatmap',
  name: '감정 히트맵',
  icon: '🌡️',
  group: '교정·언어',
  intro: '원고를 문장별로 분석해 감정·강도를 색으로 칠한 히트맵과 분포 요약을 보여줍니다',
  w: 760,
  h: 680,
}

const LS_KEY = 'sry:tool:emotion-heatmap'

// ── 감정 분류(8종) ──────────────────────────────────────────────
// Plutchik 8대 기본 감정에 한국어 라벨/이모지/극성/색상(Hue)을 부여.
type EmoKey = 'joy' | 'sadness' | 'anger' | 'fear' | 'love' | 'surprise' | 'disgust' | 'anticipation'
interface EmoMeta { key: EmoKey; ko: string; emoji: string; hue: number; valence: number } // valence: -1~+1
const EMOTIONS: EmoMeta[] = [
  { key: 'joy',          ko: '기쁨',  emoji: '😊', hue: 45,  valence: 1 },
  { key: 'love',         ko: '사랑',  emoji: '💗', hue: 335, valence: 1 },
  { key: 'anticipation', ko: '기대',  emoji: '✨', hue: 25,  valence: 0.5 },
  { key: 'surprise',     ko: '놀람',  emoji: '😮', hue: 280, valence: 0 },
  { key: 'sadness',      ko: '슬픔',  emoji: '😢', hue: 210, valence: -1 },
  { key: 'fear',         ko: '공포',  emoji: '😱', hue: 250, valence: -1 },
  { key: 'anger',        ko: '분노',  emoji: '😠', hue: 5,   valence: -1 },
  { key: 'disgust',      ko: '혐오',  emoji: '🤢', hue: 95,  valence: -0.7 },
]
const EMO_BY_KEY: Record<EmoKey, EmoMeta> = EMOTIONS.reduce((acc, e) => { acc[e.key] = e; return acc }, {} as Record<EmoKey, EmoMeta>)

// ── 감정 사전 ───────────────────────────────────────────────────
// 한국어는 어미 변화가 많아 '어간/핵심 형태소'를 부분일치(includes)로 잡는다.
// 각 항목: 사전 표기(부분일치 대상), 감정, 기본 가중치(1~3).
interface LexEntry { stem: string; emo: EmoKey; w: number }
const LEXICON: LexEntry[] = [
  // 기쁨
  { stem: '기쁘', emo: 'joy', w: 2 }, { stem: '기뻐', emo: 'joy', w: 2 }, { stem: '행복', emo: 'joy', w: 3 },
  { stem: '즐거', emo: 'joy', w: 2 }, { stem: '즐겁', emo: 'joy', w: 2 }, { stem: '신나', emo: 'joy', w: 2 },
  { stem: '웃', emo: 'joy', w: 1 }, { stem: '미소', emo: 'joy', w: 2 }, { stem: '환하', emo: 'joy', w: 1 },
  { stem: '환호', emo: 'joy', w: 2 }, { stem: '벅차', emo: 'joy', w: 2 }, { stem: '뿌듯', emo: 'joy', w: 2 },
  { stem: '만족', emo: 'joy', w: 2 }, { stem: '흐뭇', emo: 'joy', w: 2 }, { stem: '상쾌', emo: 'joy', w: 1 },
  { stem: '활기', emo: 'joy', w: 1 }, { stem: '명랑', emo: 'joy', w: 1 }, { stem: '유쾌', emo: 'joy', w: 2 },
  { stem: '들뜨', emo: 'joy', w: 2 }, { stem: '기분 좋', emo: 'joy', w: 2 }, { stem: '환희', emo: 'joy', w: 3 },
  // 사랑
  { stem: '사랑', emo: 'love', w: 3 }, { stem: '애정', emo: 'love', w: 2 }, { stem: '그리', emo: 'love', w: 2 },
  { stem: '보고 싶', emo: 'love', w: 2 }, { stem: '설레', emo: 'love', w: 2 }, { stem: '두근', emo: 'love', w: 2 },
  { stem: '입맞', emo: 'love', w: 2 }, { stem: '입맞춤', emo: 'love', w: 2 }, { stem: '포옹', emo: 'love', w: 2 },
  { stem: '끌리', emo: 'love', w: 2 }, { stem: '연모', emo: 'love', w: 2 }, { stem: '다정', emo: 'love', w: 2 },
  { stem: '아끼', emo: 'love', w: 1 }, { stem: '소중', emo: 'love', w: 2 }, { stem: '애틋', emo: 'love', w: 2 },
  { stem: '연인', emo: 'love', w: 1 }, { stem: '키스', emo: 'love', w: 2 }, { stem: '품에', emo: 'love', w: 1 },
  // 기대
  { stem: '기대', emo: 'anticipation', w: 2 }, { stem: '바라', emo: 'anticipation', w: 1 }, { stem: '희망', emo: 'anticipation', w: 2 },
  { stem: '소망', emo: 'anticipation', w: 2 }, { stem: '꿈꾸', emo: 'anticipation', w: 1 }, { stem: '설렘', emo: 'anticipation', w: 2 },
  { stem: '기다리', emo: 'anticipation', w: 1 }, { stem: '두근거', emo: 'anticipation', w: 1 }, { stem: '벼르', emo: 'anticipation', w: 1 },
  { stem: '고대', emo: 'anticipation', w: 2 }, { stem: '꿈', emo: 'anticipation', w: 1 }, { stem: '결심', emo: 'anticipation', w: 1 },
  // 놀람
  { stem: '놀라', emo: 'surprise', w: 2 }, { stem: '놀랍', emo: 'surprise', w: 2 }, { stem: '깜짝', emo: 'surprise', w: 2 },
  { stem: '경악', emo: 'surprise', w: 3 }, { stem: '소스라', emo: 'surprise', w: 3 }, { stem: '충격', emo: 'surprise', w: 2 },
  { stem: '어리둥절', emo: 'surprise', w: 2 }, { stem: '얼떨', emo: 'surprise', w: 1 }, { stem: '헉', emo: 'surprise', w: 2 },
  { stem: '믿기지 않', emo: 'surprise', w: 2 }, { stem: '뜻밖', emo: 'surprise', w: 2 }, { stem: '의외', emo: 'surprise', w: 1 },
  { stem: '화들짝', emo: 'surprise', w: 2 }, { stem: '아연', emo: 'surprise', w: 2 },
  // 슬픔
  { stem: '슬프', emo: 'sadness', w: 2 }, { stem: '슬퍼', emo: 'sadness', w: 2 }, { stem: '슬픔', emo: 'sadness', w: 2 },
  { stem: '눈물', emo: 'sadness', w: 2 }, { stem: '울', emo: 'sadness', w: 1 }, { stem: '흐느', emo: 'sadness', w: 2 },
  { stem: '서럽', emo: 'sadness', w: 2 }, { stem: '서글', emo: 'sadness', w: 2 }, { stem: '애통', emo: 'sadness', w: 3 },
  { stem: '비통', emo: 'sadness', w: 3 }, { stem: '절망', emo: 'sadness', w: 3 }, { stem: '외로', emo: 'sadness', w: 2 },
  { stem: '쓸쓸', emo: 'sadness', w: 2 }, { stem: '허전', emo: 'sadness', w: 2 }, { stem: '그리움', emo: 'sadness', w: 2 },
  { stem: '상실', emo: 'sadness', w: 2 }, { stem: '비참', emo: 'sadness', w: 2 }, { stem: '침울', emo: 'sadness', w: 2 },
  { stem: '우울', emo: 'sadness', w: 2 }, { stem: '안타까', emo: 'sadness', w: 2 }, { stem: '미어', emo: 'sadness', w: 2 },
  { stem: '울적', emo: 'sadness', w: 2 }, { stem: '한숨', emo: 'sadness', w: 1 }, { stem: '아련', emo: 'sadness', w: 1 },
  // 공포
  { stem: '두려', emo: 'fear', w: 2 }, { stem: '무서', emo: 'fear', w: 2 }, { stem: '무섭', emo: 'fear', w: 2 },
  { stem: '공포', emo: 'fear', w: 3 }, { stem: '겁', emo: 'fear', w: 1 }, { stem: '떨', emo: 'fear', w: 1 },
  { stem: '오싹', emo: 'fear', w: 2 }, { stem: '소름', emo: 'fear', w: 2 }, { stem: '섬뜩', emo: 'fear', w: 2 },
  { stem: '불안', emo: 'fear', w: 2 }, { stem: '초조', emo: 'fear', w: 2 }, { stem: '조마조마', emo: 'fear', w: 2 },
  { stem: '공황', emo: 'fear', w: 3 }, { stem: '질겁', emo: 'fear', w: 2 }, { stem: '위협', emo: 'fear', w: 1 },
  { stem: '식은땀', emo: 'fear', w: 2 }, { stem: '전율', emo: 'fear', w: 2 }, { stem: '두근반', emo: 'fear', w: 1 },
  { stem: '떨리', emo: 'fear', w: 1 }, { stem: '겁먹', emo: 'fear', w: 2 },
  // 분노
  { stem: '화나', emo: 'anger', w: 2 }, { stem: '화가', emo: 'anger', w: 2 }, { stem: '분노', emo: 'anger', w: 3 },
  { stem: '분개', emo: 'anger', w: 3 }, { stem: '격분', emo: 'anger', w: 3 }, { stem: '성나', emo: 'anger', w: 2 },
  { stem: '짜증', emo: 'anger', w: 2 }, { stem: '열받', emo: 'anger', w: 2 }, { stem: '분통', emo: 'anger', w: 2 },
  { stem: '울분', emo: 'anger', w: 2 }, { stem: '치밀', emo: 'anger', w: 2 }, { stem: '노여', emo: 'anger', w: 2 },
  { stem: '발끈', emo: 'anger', w: 2 }, { stem: '격앙', emo: 'anger', w: 2 }, { stem: '소리치', emo: 'anger', w: 1 },
  { stem: '고함', emo: 'anger', w: 2 }, { stem: '으르렁', emo: 'anger', w: 2 }, { stem: '분하', emo: 'anger', w: 2 },
  { stem: '억울', emo: 'anger', w: 2 }, { stem: '노발', emo: 'anger', w: 3 }, { stem: '버럭', emo: 'anger', w: 2 },
  // 혐오
  { stem: '역겨', emo: 'disgust', w: 3 }, { stem: '혐오', emo: 'disgust', w: 3 }, { stem: '구역', emo: 'disgust', w: 3 },
  { stem: '메스꺼', emo: 'disgust', w: 2 }, { stem: '징그', emo: 'disgust', w: 2 }, { stem: '더럽', emo: 'disgust', w: 2 },
  { stem: '경멸', emo: 'disgust', w: 2 }, { stem: '치욕', emo: 'disgust', w: 2 }, { stem: '불쾌', emo: 'disgust', w: 2 },
  { stem: '거북', emo: 'disgust', w: 1 }, { stem: '꺼림', emo: 'disgust', w: 1 }, { stem: '넌더리', emo: 'disgust', w: 2 },
  { stem: '진저리', emo: 'disgust', w: 2 }, { stem: '토할', emo: 'disgust', w: 2 },
]
// 긴 어간을 먼저 매칭해야 '기분 좋' 같은 복합어가 '좋'에 가려지지 않음.
const LEXICON_SORTED = [...LEXICON].sort((a, b) => b.stem.length - a.stem.length)

// 강조어(강도·가중치 증폭) / 약화어(완화)
const INTENSIFIERS = ['정말', '진짜', '너무', '매우', '몹시', '무척', '굉장히', '엄청', '한없이', '극도로', '지독히', '뼈저리게', '죽도록', '미치도록', '참을 수 없', '아주', '대단히', '한껏', '심하게', '격하게']
// 부정어(감정 반전/감쇄) — 어절 안에 포함되면 직전 감정 점수를 줄인다.
const NEGATORS = ['안 ', '못 ', '않', '없', '아니', '말고', '결코', '전혀', '하나도']

// ── 문장 분리 ───────────────────────────────────────────────────
// 마침표/물음표/느낌표(연속 포함)·줄임표·개행을 경계로 자른다. 빈 조각 제거.
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？…]+)\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

// ── 문장 1개 감정 분석 ───────────────────────────────────────────
interface EmoScores { joy: number; sadness: number; anger: number; fear: number; love: number; surprise: number; disgust: number; anticipation: number }
interface SentInfo {
  idx: number
  text: string
  scores: EmoScores      // 감정별 누적 점수
  dominant: EmoKey | null
  total: number          // 감정어 가중치 총합(강조 반영 후)
  intensity: number      // 0~1 정규화 강도
  valence: number        // -1~+1 (우세 감정 극성을 강도로 가중)
  hits: { stem: string; emo: EmoKey }[]  // 어떤 감정어가 잡혔는지
}

const emptyScores = (): EmoScores => ({ joy: 0, sadness: 0, anger: 0, fear: 0, love: 0, surprise: 0, disgust: 0, anticipation: 0 })

function analyzeSentence(sentence: string, idx: number): SentInfo {
  const scores = emptyScores()
  const hits: { stem: string; emo: EmoKey }[] = []
  // 강조어 개수로 문장 전체 증폭 계수(과증폭 방지 상한)
  let boost = 1
  for (const w of INTENSIFIERS) if (sentence.includes(w)) boost += 0.5
  boost = Math.min(boost, 2.5)

  // 사전 부분일치(어간) — 같은 어간이 여러 번 나오면 횟수만큼(상한 3) 누적.
  for (const { stem, emo, w } of LEXICON_SORTED) {
    let from = 0
    let count = 0
    while (count < 3) {
      const at = sentence.indexOf(stem, from)
      if (at < 0) break
      // 직전 12자 안에 부정어가 있으면 가중치를 절반으로(반전이라기보다 감쇄).
      const ctx = sentence.slice(Math.max(0, at - 12), at)
      const negated = NEGATORS.some((n) => ctx.includes(n))
      const add = w * boost * (negated ? 0.4 : 1)
      scores[emo] += add
      hits.push({ stem, emo })
      count++
      from = at + stem.length
    }
  }

  // 우세 감정 = 최고 점수. 동점이면 |valence| 큰 쪽(더 또렷한 감정) 우선.
  let dominant: EmoKey | null = null
  let best = 0
  for (const e of EMOTIONS) {
    const s = scores[e.key]
    if (s > best || (s > 0 && s === best && dominant && Math.abs(e.valence) > Math.abs(EMO_BY_KEY[dominant].valence))) {
      best = s
      dominant = e.key
    }
  }
  const total = EMOTIONS.reduce((sum, e) => sum + scores[e.key], 0)
  // 강도: 총점을 로그 스케일로 0~1 압축(문장 1~2개 감정어=중간, 다수=높음).
  const intensity = total <= 0 ? 0 : Math.min(1, Math.log2(1 + total) / Math.log2(1 + 8))
  // 극성: 감정별 valence를 점수로 가중 평균 → -1~+1
  let vAcc = 0
  for (const e of EMOTIONS) vAcc += e.valence * scores[e.key]
  const valence = total > 0 ? Math.max(-1, Math.min(1, vAcc / total)) : 0

  return { idx, text: sentence, scores, dominant, total, intensity, valence, hits }
}

// ── 색 매핑 ────────────────────────────────────────────────────
// 감정 우세 시: 그 감정의 Hue + 강도(채도/명도). 중립(감정어 없음): 회색.
function heatColor(s: SentInfo): string {
  if (!s.dominant || s.total <= 0) return 'var(--chrome-2)'
  const meta = EMO_BY_KEY[s.dominant]
  const i = s.intensity
  const sat = 35 + i * 50          // 35% ~ 85%
  const light = 80 - i * 33        // 80% ~ 47% (강할수록 진하게)
  return `hsl(${meta.hue}, ${sat}%, ${light}%)`
}
// 색 위 텍스트 대비(강한 색 위에서는 어두운 글자가 무난)
function onHeatColor(s: SentInfo): string {
  if (!s.dominant || s.total <= 0) return 'var(--muted)'
  return s.intensity > 0.62 ? '#1a1a1a' : 'var(--text)'
}

// ── 유틸 ───────────────────────────────────────────────────────
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const SAMPLE = `그는 문을 열었다. 차가운 바람이 뺨을 스쳤다.
순간 심장이 두근거렸다. 그녀가 거기 서 있었다, 정말 보고 싶었던 사람이.
하지만 그녀의 눈에는 눈물이 가득했고, 나는 가슴이 미어지도록 슬펐다.
"왜 이제야 왔어?" 그녀가 버럭 소리쳤다. 분노가 치밀어 올랐다.
나는 두려웠다. 이 순간이 무서웠고, 모든 것이 무너질까 봐 초조했다.
그래도 우리는 다시 만났다. 다행이라는 희망이 천천히 차올랐다.
끝내 그녀가 환하게 웃었다. 나도 행복했다.`

interface SaveShape { text: string; minIntensity: number }
function load(): SaveShape {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { text: '', minIntensity: 0 }
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return { text: '', minIntensity: 0 }
    return {
      text: typeof p.text === 'string' ? p.text : '',
      minIntensity: typeof p.minIntensity === 'number' ? p.minIntensity : 0,
    }
  } catch { return { text: '', minIntensity: 0 } }
}

export default function EmotionHeatmap({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(load())
  const [text, setText] = useState<string>(() => {
    const p = payload && typeof payload.text === 'string' ? payload.text : ''
    return p || init.current.text
  })
  const [minIntensity, setMinIntensity] = useState(init.current.minIntensity)
  const [focusEmo, setFocusEmo] = useState<EmoKey | 'all'>('all')
  const [selected, setSelected] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')
  const [dropActive, setDropActive] = useState(false)
  const dropDepth = useRef(0)
  const mounted = useRef(true)
  const toastTimer = useRef<number | null>(null)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => () => { if (toastTimer.current != null) clearTimeout(toastTimer.current) }, [])

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ text, minIntensity } as SaveShape)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [text, minIntensity])

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current != null) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => { if (mounted.current) setToast('') }, 2200)
  }

  // ── 분석 ─────────────────────────────────────────────────────
  const analysis = useMemo(() => {
    const trimmed = text.trim()
    if (!trimmed) return null
    const raw = splitSentences(trimmed)
    if (raw.length === 0) return null
    const sents = raw.map((s, i) => analyzeSentence(s, i))

    // 분포: 감정별 문장 수(우세 기준) + 가중 점수 합
    const dist: Record<EmoKey, { sentences: number; weight: number }> =
      EMOTIONS.reduce((acc, e) => { acc[e.key] = { sentences: 0, weight: 0 }; return acc }, {} as Record<EmoKey, { sentences: number; weight: number }>)
    let charged = 0
    for (const s of sents) {
      if (s.dominant && s.total > 0) {
        dist[s.dominant].sentences++
        charged++
      }
      for (const e of EMOTIONS) dist[e.key].weight += s.scores[e.key]
    }
    const neutral = sents.length - charged
    const totalWeight = EMOTIONS.reduce((sum, e) => sum + dist[e.key].weight, 0)

    // 전반 극성/강도
    const avgValence = charged > 0 ? sents.reduce((a, s) => a + s.valence * s.intensity, 0) / Math.max(1, sents.reduce((a, s) => a + s.intensity, 0)) : 0
    const avgIntensity = sents.length ? sents.reduce((a, s) => a + s.intensity, 0) / sents.length : 0
    const peak = sents.reduce((a, s) => (s.intensity > a.intensity ? s : a), sents[0])

    // 우세 감정 순위
    const ranking = [...EMOTIONS]
      .map((e) => ({ e, weight: dist[e.key].weight, sentences: dist[e.key].sentences }))
      .filter((r) => r.weight > 0)
      .sort((a, b) => b.weight - a.weight)

    // 감정 변화량(인접 문장 valence 차의 평균) — 감정 기복 진단
    let swing = 0
    for (let i = 1; i < sents.length; i++) swing += Math.abs(sents[i].valence - sents[i - 1].valence)
    const avgSwing = sents.length > 1 ? swing / (sents.length - 1) : 0

    return { sents, dist, neutral, charged, totalWeight, avgValence, avgIntensity, peak, ranking, avgSwing }
  }, [text])

  // 진단 문구(감정 흐름)
  const diagnosis = useMemo(() => {
    const a = analysis
    if (!a) return null
    const chargedRatio = a.sents.length ? a.charged / a.sents.length : 0
    const msgs: { tone: 'ok' | 'warn' | 'muted'; text: string }[] = []
    if (chargedRatio < 0.25) {
      msgs.push({ tone: 'warn', text: `감정어가 실린 문장이 ${Math.round(chargedRatio * 100)}%로 적습니다. 정보 전달 위주라면 괜찮지만, 정서 장면이라면 감각·내면 묘사를 더해 보세요.` })
    } else if (chargedRatio > 0.85) {
      msgs.push({ tone: 'warn', text: `거의 모든 문장에 감정어가 직접 드러납니다(${Math.round(chargedRatio * 100)}%). 일부는 행동·정황으로 "보여주면" 더 묵직해집니다.` })
    } else {
      msgs.push({ tone: 'ok', text: `감정 문장 비율이 ${Math.round(chargedRatio * 100)}%로 균형 잡혀 있습니다.` })
    }
    if (a.avgSwing >= 0.5) {
      msgs.push({ tone: 'ok', text: `문장 사이 감정 진폭이 큽니다(평균 ${a.avgSwing.toFixed(2)}). 긴장과 이완이 살아 있어요.` })
    } else if (a.charged >= 3 && a.avgSwing < 0.15) {
      msgs.push({ tone: 'muted', text: `감정 결이 한 방향으로 평탄합니다(진폭 ${a.avgSwing.toFixed(2)}). 대비되는 감정 한 줄을 끼우면 굴곡이 생깁니다.` })
    }
    if (a.ranking.length >= 2 && a.ranking[0].weight > 0) {
      const top = a.ranking[0]
      const share = a.totalWeight > 0 ? top.weight / a.totalWeight : 0
      if (share > 0.7) msgs.push({ tone: 'muted', text: `${EMO_BY_KEY[top.e.key].ko} 감정이 ${Math.round(share * 100)}%로 강하게 지배합니다. 의도된 단색조면 OK, 아니라면 보조 감정을 더해 보세요.` })
    }
    return msgs
  }, [analysis])

  // 표시용 문장(강도 임계값/감정 필터)
  const visibleSents = useMemo(() => {
    if (!analysis) return []
    return analysis.sents.filter((s) => {
      if (s.intensity < minIntensity) return false
      if (focusEmo !== 'all' && s.dominant !== focusEmo) return false
      return true
    })
  }, [analysis, minIntensity, focusEmo])

  // ── 리포트 텍스트/HTML ────────────────────────────────────────
  const reportText = useMemo(() => {
    const a = analysis
    if (!a) return ''
    const lines: string[] = []
    lines.push('[감정 히트맵 리포트]')
    lines.push(`문장 ${a.sents.length}개 · 감정 실린 문장 ${a.charged}개 · 중립 ${a.neutral}개`)
    const valLabel = a.avgValence > 0.15 ? '전반적으로 긍정' : a.avgValence < -0.15 ? '전반적으로 부정' : '중립·혼합'
    lines.push(`전반 정서: ${valLabel} (극성 ${a.avgValence >= 0 ? '+' : ''}${a.avgValence.toFixed(2)}) · 평균 강도 ${a.avgIntensity.toFixed(2)} · 감정 진폭 ${a.avgSwing.toFixed(2)}`)
    lines.push('')
    lines.push('— 감정 분포(가중치순) —')
    for (const r of a.ranking) {
      const share = a.totalWeight > 0 ? Math.round((r.weight / a.totalWeight) * 100) : 0
      lines.push(`${EMO_BY_KEY[r.e.key].emoji} ${EMO_BY_KEY[r.e.key].ko}: ${r.sentences}문장 · ${share}%`)
    }
    if (a.neutral > 0) lines.push(`· 중립: ${a.neutral}문장`)
    lines.push('')
    if (a.peak && a.peak.total > 0) {
      lines.push(`— 감정 절정 문장(강도 ${a.peak.intensity.toFixed(2)}) —`)
      lines.push(`${a.peak.idx + 1}. ${a.peak.text}`)
    }
    return lines.join('\n')
  }, [analysis])

  const reportHtml = useMemo(() => {
    const a = analysis
    if (!a) return ''
    const parts: string[] = []
    const valLabel = a.avgValence > 0.15 ? '전반적으로 긍정' : a.avgValence < -0.15 ? '전반적으로 부정' : '중립·혼합'
    parts.push(`<p><strong>감정 히트맵</strong> · 문장 ${a.sents.length}개 · 감정 실린 문장 ${a.charged}개 · 중립 ${a.neutral}개</p>`)
    parts.push(`<p>전반 정서: ${esc(valLabel)} (극성 ${a.avgValence >= 0 ? '+' : ''}${a.avgValence.toFixed(2)}) · 평균 강도 ${a.avgIntensity.toFixed(2)} · 감정 진폭 ${a.avgSwing.toFixed(2)}</p>`)
    parts.push('<p><strong>감정 분포</strong></p><ul>')
    for (const r of a.ranking) {
      const share = a.totalWeight > 0 ? Math.round((r.weight / a.totalWeight) * 100) : 0
      parts.push(`<li>${EMO_BY_KEY[r.e.key].emoji} ${esc(EMO_BY_KEY[r.e.key].ko)} — ${r.sentences}문장 · ${share}%</li>`)
    }
    if (a.neutral > 0) parts.push(`<li>· 중립 — ${a.neutral}문장</li>`)
    parts.push('</ul>')
    if (diagnosis && diagnosis.length) {
      parts.push('<p><strong>진단</strong></p><ul>')
      for (const d of diagnosis) parts.push(`<li>${esc(d.text)}</li>`)
      parts.push('</ul>')
    }
    parts.push('<p><strong>문장별 감정</strong></p><ol>')
    for (const s of a.sents) {
      const tag = s.dominant && s.total > 0 ? `[${EMO_BY_KEY[s.dominant].ko} ${s.intensity.toFixed(2)}]` : '[중립]'
      parts.push(`<li>${esc(tag)} ${esc(s.text)}</li>`)
    }
    parts.push('</ol>')
    return parts.join('')
  }, [analysis, diagnosis])

  // ── 동작 ─────────────────────────────────────────────────────
  const copyReport = async () => {
    if (!reportText) return
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(reportText)
      else {
        const ta = document.createElement('textarea')
        ta.value = reportText; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      flash('리포트를 클립보드에 복사했어요.')
    } catch { flash('복사에 실패했어요. 브라우저 권한을 확인하세요.') }
  }

  const stashReport = () => {
    if (!reportText) { flash('먼저 원고를 입력하세요.'); return }
    if (!hasStash()) { flash('수집함에 연결되어 있지 않습니다.'); return }
    addToStash({ kind: 'note', label: `감정 히트맵 리포트 (문장 ${analysis?.sents.length ?? 0}개)`, text: reportText })
    flash('수집함에 리포트를 담았습니다.')
  }

  const saveChargedSnippets = () => {
    const a = analysis
    if (!a) { flash('먼저 원고를 입력하세요.'); return }
    const strong = a.sents.filter((s) => s.dominant && s.intensity >= 0.5).sort((x, y) => y.intensity - x.intensity).slice(0, 24)
    if (strong.length === 0) { flash('강도 0.5 이상의 감정 문장이 없습니다.'); return }
    strong.forEach((s) => {
      const ko = s.dominant ? EMO_BY_KEY[s.dominant].ko : '감정'
      addToLibrary('snippets', { text: s.text, source: `감정 히트맵 — ${ko}`, tags: ['감정', ko] })
    })
    flash(`감정이 강한 문장 ${strong.length}개를 글감 라이브러리에 저장했습니다.`)
  }

  const toProject = () => {
    if (!analysis) { flash('먼저 원고를 입력하세요.'); return }
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const a = analysis
    const meta: Record<string, string> = {
      문장수: String(a.sents.length),
      감정문장: String(a.charged),
      극성: `${a.avgValence >= 0 ? '+' : ''}${a.avgValence.toFixed(2)}`,
      평균강도: a.avgIntensity.toFixed(2),
    }
    if (a.ranking[0]) meta['우세감정'] = EMO_BY_KEY[a.ranking[0].e.key].ko
    const id = addToProject({
      kind: 'text', root: 'research', folder: '교정',
      title: '감정 히트맵 리포트',
      bodyHtml: reportHtml,
      meta,
    })
    if (!mounted.current) return
    if (id) flash('프로젝트 자료(교정)에 감정 히트맵 리포트를 추가했어요.')
    else flash('프로젝트에 연결되지 않았습니다.')
  }

  // ── 바인더 파일 드롭 ─────────────────────────────────────────
  const onDropItem = (e: React.DragEvent) => {
    dropDepth.current = 0
    setDropActive(false)
    const it = getDragItem(e)
    if (it && typeof it.text === 'string' && it.text.trim()) {
      e.preventDefault()
      setText(it.text)
      setSelected(null)
      flash(`'${it.title || '문서'}'의 본문을 불러왔어요.`)
    }
  }

  // ── 스타일 ───────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)', outline: dropActive ? '2px dashed var(--accent)' : 'none', outlineOffset: -3 }
  const head: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const titleStyle: React.CSSProperties = { fontSize: 13, color: 'var(--muted)', flex: 1, minWidth: 160 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }
  const taStyle: React.CSSProperties = {
    minHeight: 92, maxHeight: 180, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '11px 13px', fontSize: 14, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)', textAlign: 'center', fontSize: 13, lineHeight: 1.7, padding: 24 }
  const chip = (active: boolean, color: string): React.CSSProperties => ({
    fontSize: 12, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${active ? color : 'var(--border)'}`,
    background: active ? color : 'var(--chrome-2)',
    color: active ? '#fff' : 'var(--text)', userSelect: 'none', whiteSpace: 'nowrap',
  })

  const a = analysis
  const sel = selected != null && a ? a.sents.find((s) => s.idx === selected) ?? null : null

  return (
    <div
      style={wrap}
      onDragOver={(e) => { if (isItemDrag(e)) e.preventDefault() }}
      onDragEnter={(e) => { if (isItemDrag(e)) { e.preventDefault(); dropDepth.current += 1; setDropActive(true) } }}
      onDragLeave={(e) => { if (isItemDrag(e)) { dropDepth.current = Math.max(0, dropDepth.current - 1); if (dropDepth.current === 0) setDropActive(false) } }}
      onDrop={onDropItem}
    >
      {/* 헤더 */}
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="🌡️"/></span>
        <div style={titleStyle}>원고를 붙여넣으면 문장별 감정·강도를 색으로 칠합니다 <span style={{ fontSize: 11 }}>(좌측 바인더 파일을 끌어다 놓아도 됩니다 · 네트워크 불필요)</span></div>
        <button className="minibtn" onClick={() => setText(SAMPLE)} type="button">예시</button>
        <button className="minibtn" onClick={() => { setText(''); setSelected(null) }} disabled={!text} type="button">↺ 지우기</button>
      </div>

      {toast && <div style={{ ...hint, color: 'var(--ok)', padding: '6px 14px 0' }}>{toast}</div>}
      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '6px 14px 0' }}>{note}</div>}

      <div style={body}>
        <textarea
          style={taStyle}
          value={text}
          onChange={(e) => { setText(e.target.value); setSelected(null) }}
          placeholder="감정을 점검할 원고를 여기에 붙여넣으세요. 문장 부호(. ? !)와 줄바꿈으로 문장을 나눠 분석합니다."
          spellCheck={false}
          aria-label="감정 분석 원고 입력"
        />

        {!a ? (
          <div style={empty}>
            <div style={{ fontSize: 34 }}><Emoji e="🌡️"/></div>
            <div>원고를 입력하면 문장마다 우세 감정과 강도를 추정해<br />색으로 칠한 <b>히트맵</b>과 <b>감정 분포</b>를 보여줍니다.</div>
            <div style={hint}>기쁨·사랑·기대·놀람·슬픔·공포·분노·혐오 8종을 로컬 사전으로 분류합니다.</div>
          </div>
        ) : (
          <>
            {/* 전반 요약 */}
            <div style={panel}>
              <div style={sectionTitle}>전반 요약</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {(() => {
                  const valColor = a.avgValence > 0.15 ? 'var(--ok)' : a.avgValence < -0.15 ? 'var(--warn)' : 'var(--muted)'
                  const valLabel = a.avgValence > 0.15 ? '긍정 우세' : a.avgValence < -0.15 ? '부정 우세' : '중립·혼합'
                  const cells: { v: string; l: string; c?: string }[] = [
                    { v: String(a.sents.length), l: '문장' },
                    { v: String(a.charged), l: '감정 문장', c: 'var(--accent)' },
                    { v: valLabel, l: `극성 ${a.avgValence >= 0 ? '+' : ''}${a.avgValence.toFixed(2)}`, c: valColor },
                    { v: a.avgIntensity.toFixed(2), l: '평균 강도' },
                    { v: a.avgSwing.toFixed(2), l: '감정 진폭' },
                  ]
                  return cells.map((c, i) => (
                    <div key={i} style={{ flex: '1 1 90px', minWidth: 76, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: c.l.length > 4 ? 14 : 19, fontWeight: 800, color: c.c || 'var(--accent)', lineHeight: 1.2 }}>{c.v}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 3 }}>{c.l}</div>
                    </div>
                  ))
                })()}
              </div>
            </div>

            {/* 감정 분포 막대 */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <span style={{ ...sectionTitle, marginBottom: 0 }}>감정 분포</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>우세 감정 기준 · 클릭하면 해당 감정만 보기</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {EMOTIONS.map((e) => {
                  const d = a.dist[e.key]
                  const share = a.totalWeight > 0 ? d.weight / a.totalWeight : 0
                  const active = focusEmo === e.key
                  return (
                    <div
                      key={e.key}
                      onClick={() => setFocusEmo(active ? 'all' : e.key)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', opacity: d.weight > 0 ? 1 : 0.4, padding: '2px 4px', borderRadius: 8, outline: active ? `2px solid hsl(${e.hue},60%,55%)` : 'none' }}
                      title={`${e.ko}: ${d.sentences}문장, 가중치 ${d.weight.toFixed(1)}`}
                    >
                      <span style={{ width: 58, flexShrink: 0, fontSize: 12, color: 'var(--text)' }}><Emoji e={e.emoji}/> {e.ko}</span>
                      <div style={{ flex: 1, minWidth: 0, height: 14, background: 'var(--chrome-2)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.max(d.weight > 0 ? 3 : 0, Math.round(share * 100))}%`, height: '100%', background: `hsl(${e.hue}, 65%, 55%)`, borderRadius: 4, transition: 'width .3s' }} />
                      </div>
                      <span style={{ width: 64, flexShrink: 0, textAlign: 'right', fontSize: 11, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{d.sentences}문장 {Math.round(share * 100)}%</span>
                    </div>
                  )
                })}
                {a.neutral > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.7, padding: '2px 4px' }}>
                    <span style={{ width: 58, flexShrink: 0, fontSize: 12, color: 'var(--muted)' }}><Emoji e="⚪"/> 중립</span>
                    <div style={{ flex: 1, minWidth: 0, height: 14, background: 'var(--chrome-2)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.round((a.neutral / a.sents.length) * 100)}%`, height: '100%', background: 'var(--muted)', borderRadius: 4, opacity: 0.5 }} />
                    </div>
                    <span style={{ width: 64, flexShrink: 0, textAlign: 'right', fontSize: 11, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{a.neutral}문장</span>
                  </div>
                )}
              </div>
            </div>

            {/* 진단 */}
            {diagnosis && diagnosis.length > 0 && (
              <div style={panel}>
                <div style={sectionTitle}>감정 흐름 진단</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {diagnosis.map((d, i) => {
                    const c = d.tone === 'ok' ? 'var(--ok)' : d.tone === 'warn' ? 'var(--warn)' : 'var(--muted)'
                    return (
                      <div key={i} style={{ fontSize: 12.5, lineHeight: 1.55, color: d.tone === 'muted' ? 'var(--text)' : c, borderLeft: `3px solid ${c}`, paddingLeft: 9 }}>{d.text}</div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 컨트롤: 강도 임계값 + 필터 표시 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '0 2px' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>강도 최소</span>
              <input type="range" min={0} max={0.9} step={0.1} value={minIntensity} onChange={(e) => setMinIntensity(Number(e.target.value))} style={{ flex: 1, minWidth: 120, accentColor: 'var(--accent)' }} aria-label="표시 강도 임계값" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', width: 30, textAlign: 'right' }}>{minIntensity.toFixed(1)}</span>
              {focusEmo !== 'all' && (
                <span style={chip(true, `hsl(${EMO_BY_KEY[focusEmo].hue},60%,52%)`)} onClick={() => setFocusEmo('all')} role="button" tabIndex={0}>
                  <Emoji e={EMO_BY_KEY[focusEmo].emoji}/> {EMO_BY_KEY[focusEmo].ko}만 · ✕
                </span>
              )}
            </div>

            {/* 히트맵 — 문장별 색 칠 */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <span style={{ ...sectionTitle, marginBottom: 0 }}>문장 히트맵</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>색=감정, 진하기=강도 · 문장을 클릭하면 상세</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{visibleSents.length}/{a.sents.length}문장</span>
              </div>
              {visibleSents.length === 0 ? (
                <div style={{ ...empty, padding: 18 }}>표시 조건(강도/감정 필터)에 맞는 문장이 없습니다.</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {visibleSents.map((s) => {
                    const bg = heatColor(s)
                    const fg = onHeatColor(s)
                    const isSel = selected === s.idx
                    return (
                      <div
                        key={s.idx}
                        onClick={() => setSelected(isSel ? null : s.idx)}
                        title={s.dominant && s.total > 0 ? `${EMO_BY_KEY[s.dominant].ko} · 강도 ${s.intensity.toFixed(2)} · 극성 ${s.valence >= 0 ? '+' : ''}${s.valence.toFixed(2)}` : '중립'}
                        style={{
                          background: bg, color: fg, borderRadius: 8, padding: '7px 10px', fontSize: 13, lineHeight: 1.5,
                          cursor: 'pointer', maxWidth: '100%', wordBreak: 'break-word',
                          border: isSel ? '2px solid var(--text)' : '1px solid rgba(0,0,0,0.08)',
                          flex: '1 1 auto', minWidth: 60,
                        }}
                      >
                        <span style={{ fontSize: 10, opacity: 0.7, marginRight: 5, fontVariantNumeric: 'tabular-nums' }}>{s.idx + 1}</span>
                        {s.dominant && s.total > 0 && <span style={{ marginRight: 4 }}><Emoji e={EMO_BY_KEY[s.dominant].emoji}/></span>}
                        {s.text.length > 120 ? s.text.slice(0, 120) + '…' : s.text}
                      </div>
                    )
                  })}
                </div>
              )}
              {/* 범례 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                {EMOTIONS.map((e) => (
                  <span key={e.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--muted)' }}>
                    <span style={{ width: 11, height: 11, borderRadius: 3, background: `hsl(${e.hue}, 65%, 60%)`, display: 'inline-block' }} />
                    {e.ko}
                  </span>
                ))}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--muted)' }}>
                  <span style={{ width: 11, height: 11, borderRadius: 3, background: 'var(--chrome-2)', display: 'inline-block' }} /> 중립
                </span>
              </div>
            </div>

            {/* 선택 문장 상세 */}
            {sel && (
              <div style={{ ...panel, borderLeft: `3px solid ${sel.dominant && sel.total > 0 ? `hsl(${EMO_BY_KEY[sel.dominant].hue},60%,52%)` : 'var(--muted)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={sectionTitle}>{sel.idx + 1}번 문장 상세</span>
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => setSelected(null)}>닫기</button>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', marginBottom: 8 }}>{sel.text}</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)' }}>
                  <span>우세 감정 <strong style={{ color: 'var(--text)' }}>{sel.dominant && sel.total > 0 ? <><Emoji e={EMO_BY_KEY[sel.dominant].emoji}/> {EMO_BY_KEY[sel.dominant].ko}</> : '중립'}</strong></span>
                  <span>강도 <strong style={{ color: 'var(--text)' }}>{sel.intensity.toFixed(2)}</strong></span>
                  <span>극성 <strong style={{ color: 'var(--text)' }}>{sel.valence >= 0 ? '+' : ''}{sel.valence.toFixed(2)}</strong></span>
                </div>
                {sel.hits.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                    {[...new Map(sel.hits.map((h) => [h.stem + h.emo, h])).values()].map((h, i) => (
                      <span key={i} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 999, background: `hsl(${EMO_BY_KEY[h.emo].hue},55%,90%)`, color: '#222', border: `1px solid hsl(${EMO_BY_KEY[h.emo].hue},45%,70%)` }}>
                        {h.stem} <span style={{ opacity: 0.7 }}>· {EMO_BY_KEY[h.emo].ko}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ ...hint, marginTop: 8 }}>이 문장에서는 감정어가 탐지되지 않았습니다(중립).</div>
                )}
              </div>
            )}

            {/* 동작 모음 */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', paddingTop: 2 }}>
              <button className="minibtn" onClick={copyReport}><Emoji e="📋"/> 리포트 복사</button>
              <button className="linkbtn" onClick={saveChargedSnippets} title="강도 0.5 이상 문장을 글감 라이브러리에 저장"><Emoji e="💾"/> 강한 문장 → 글감</button>
              <button className="linkbtn" onClick={stashReport} disabled={!hasStash()} title={hasStash() ? '수집함에 리포트 담기' : '수집함에 연결되지 않음'}><Emoji e="📥"/> 수집함에 담기</button>
              <span style={{ flex: 1 }} />
              <button className="btn-primary" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '자료 › 교정 폴더에 리포트 문서로 추가' : '프로젝트에 연결되지 않음'}><Emoji e="📄"/> 프로젝트에 추가</button>
            </div>

            <div style={hint}>
              규칙 기반 근사 분석입니다(어간 부분일치 + 강조어/부정어 가중). 반어·맥락 의존 감정은 놓칠 수 있으니 참고용으로 활용하세요. 내용은 이 브라우저에 자동 저장됩니다.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
