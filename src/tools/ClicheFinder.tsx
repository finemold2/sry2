// 상투적 표현(클리셰) 점검 — 글에 잦은 상투어·관용구·진부한 비유를 로컬 사전(150+)으로 찾아
// 본문에 강조 표시하고, 어떤 표현인지·왜 진부한지·대안 방향을 목록으로 정리한다.
// 자급식: react 외 import 없음. 외부 네트워크·키 불필요(100% 로컬 사전). 모든 검사는 브라우저에서 수행.
import { useState, useEffect, useRef, useMemo } from 'react'

export const meta = { id: 'cliche-finder', name: '상투 표현 점검', icon: '🗯️', group: '교정·언어', intro: '가슴이 철렁·눈물이 핑 같은 진부한 상투어를 로컬 사전(150+)으로 찾아 대안을 권합니다', w: 540, h: 600 }

// ── 분류 ───────────────────────────────────────────────
// emotion: 감정·심리 상투구 / sense: 신체 반응·감각 / metaphor: 진부한 비유·관용구
// scene: 장면·서사 클리셰 / filler: 군더더기·상투 어구
type Cat = 'emotion' | 'sense' | 'metaphor' | 'scene' | 'filler'

interface Entry {
  word: string   // 탐지 대상(부분일치). 비교적 고유한 표기로 오탐 최소화
  cat: Cat
  alt?: string   // 대안 방향·바꿔쓰기 힌트(없으면 분류 기본 안내)
}

// 150+ 항목. 한국어 글쓰기에서 닳고 닳은 상투어·관용구·진부한 비유.
const DICT: Entry[] = [
  // ── 감정·심리 상투구 (emotion) ──
  { word: '가슴이 철렁', cat: 'emotion', alt: '놀람의 구체적 몸짓·생각으로: "숟가락이 손에서 미끄러졌다" 처럼.' },
  { word: '가슴이 미어', cat: 'emotion', alt: '슬픔을 상황·행동으로 보여주기.' },
  { word: '가슴이 먹먹', cat: 'emotion' },
  { word: '가슴이 벅차', cat: 'emotion' },
  { word: '가슴이 뭉클', cat: 'emotion' },
  { word: '가슴이 찢어', cat: 'emotion', alt: '비유를 갈아끼우거나 구체적 정황으로.' },
  { word: '가슴이 두근', cat: 'emotion' },
  { word: '가슴이 답답', cat: 'emotion' },
  { word: '가슴이 뜨거', cat: 'emotion' },
  { word: '심장이 멎', cat: 'emotion', alt: '충격을 다른 감각·동작으로 환기.' },
  { word: '심장이 쿵', cat: 'emotion' },
  { word: '심장이 내려앉', cat: 'emotion' },
  { word: '심장이 터질', cat: 'emotion' },
  { word: '심장이 멈추', cat: 'emotion' },
  { word: '눈물이 핑', cat: 'emotion', alt: '눈물의 구체 묘사·억누르는 행동으로.' },
  { word: '눈물이 왈칵', cat: 'emotion' },
  { word: '눈물이 그렁', cat: 'emotion' },
  { word: '눈물이 앞을 가', cat: 'emotion' },
  { word: '눈시울이 붉', cat: 'emotion' },
  { word: '눈시울이 뜨거', cat: 'emotion' },
  { word: '코끝이 찡', cat: 'emotion' },
  { word: '눈앞이 캄캄', cat: 'emotion', alt: '절망의 정황·선택지 부재를 보여주기.' },
  { word: '눈앞이 깜깜', cat: 'emotion' },
  { word: '머릿속이 하얘', cat: 'emotion', alt: '공백의 순간을 구체적 디테일로.' },
  { word: '머릿속이 새하', cat: 'emotion' },
  { word: '머릿속이 복잡', cat: 'emotion' },
  { word: '피가 거꾸로', cat: 'emotion', alt: '분노를 행동·말투로 드러내기.' },
  { word: '피가 끓', cat: 'emotion' },
  { word: '치가 떨', cat: 'emotion' },
  { word: '분이 풀리', cat: 'emotion' },
  { word: '화가 머리끝', cat: 'emotion' },
  { word: '속이 타들어', cat: 'emotion' },
  { word: '속이 새까맣게 타', cat: 'emotion' },
  { word: '애간장이 타', cat: 'emotion' },
  { word: '애간장을 태', cat: 'emotion' },
  { word: '가슴을 쓸어내', cat: 'emotion' },
  { word: '안도의 한숨', cat: 'emotion', alt: '안도의 신체 반응을 새롭게.' },
  { word: '하늘이 무너지', cat: 'emotion' },
  { word: '하늘이 노래', cat: 'emotion' },
  { word: '세상이 무너지', cat: 'emotion' },
  { word: '온몸이 떨', cat: 'emotion' },
  { word: '몸서리', cat: 'emotion' },
  { word: '소름이 돋', cat: 'sense' },
  { word: '소름이 끼', cat: 'sense' },
  { word: '식은땀이 흐', cat: 'sense' },
  { word: '식은땀이 났', cat: 'sense' },
  { word: '등골이 오싹', cat: 'sense' },
  { word: '등골이 서늘', cat: 'sense' },
  { word: '등에 식은땀', cat: 'sense' },
  { word: '머리카락이 곤두', cat: 'sense' },
  { word: '온몸에 전율', cat: 'sense' },
  { word: '전율이 흐', cat: 'sense' },

  // ── 신체 반응·감각 (sense) ──
  { word: '손에 땀을 쥐', cat: 'sense', alt: '긴장을 상황 자체의 긴박함으로 전달.' },
  { word: '손에 땀이', cat: 'sense' },
  { word: '손바닥에 땀', cat: 'sense' },
  { word: '주먹을 불끈', cat: 'sense' },
  { word: '주먹을 꽉 쥐', cat: 'sense' },
  { word: '이를 악물', cat: 'sense' },
  { word: '입술을 깨물', cat: 'sense' },
  { word: '입을 떡 벌', cat: 'sense', alt: '놀람의 표현을 신선하게.' },
  { word: '입이 떡 벌', cat: 'sense' },
  { word: '눈이 휘둥그', cat: 'sense' },
  { word: '눈이 동그래', cat: 'sense' },
  { word: '눈을 크게 뜨', cat: 'sense' },
  { word: '눈이 번쩍', cat: 'sense' },
  { word: '귀를 의심', cat: 'sense' },
  { word: '눈을 의심', cat: 'sense' },
  { word: '숨이 멎', cat: 'sense' },
  { word: '숨이 턱 막', cat: 'sense' },
  { word: '숨이 막', cat: 'sense' },
  { word: '숨을 죽이', cat: 'sense' },
  { word: '숨소리조차', cat: 'sense' },
  { word: '침을 꿀꺽', cat: 'sense' },
  { word: '침이 마르', cat: 'sense' },
  { word: '입안이 바짝', cat: 'sense' },
  { word: '목이 메', cat: 'sense' },
  { word: '목이 콱 메', cat: 'sense' },
  { word: '다리가 후들', cat: 'sense' },
  { word: '다리에 힘이 풀', cat: 'sense' },
  { word: '무릎이 꺾', cat: 'sense' },
  { word: '얼굴이 화끈', cat: 'sense' },
  { word: '얼굴이 붉어', cat: 'sense' },
  { word: '얼굴이 새빨', cat: 'sense' },
  { word: '귀까지 빨개', cat: 'sense' },
  { word: '얼굴이 굳', cat: 'sense' },
  { word: '얼굴이 창백', cat: 'sense' },
  { word: '핏기가 가시', cat: 'sense' },
  { word: '핏기가 사라', cat: 'sense' },
  { word: '온몸에 힘이 빠', cat: 'sense' },
  { word: '온몸이 굳', cat: 'sense' },

  // ── 진부한 비유·관용구 (metaphor) ──
  { word: '쥐 죽은 듯', cat: 'metaphor', alt: '정적을 구체적 소리·부재로: "냉장고 돌아가는 소리만".' },
  { word: '불 보듯 뻔', cat: 'metaphor', alt: '확실함을 정황 근거로 보여주기.' },
  { word: '불을 보듯', cat: 'metaphor' },
  { word: '눈에 불을 켜', cat: 'metaphor' },
  { word: '바늘방석', cat: 'metaphor' },
  { word: '벼랑 끝', cat: 'metaphor' },
  { word: '백척간두', cat: 'metaphor' },
  { word: '풍전등화', cat: 'metaphor' },
  { word: '청천벽력', cat: 'metaphor', alt: '갑작스러움을 사건 묘사로.' },
  { word: '마른하늘에 날벼락', cat: 'metaphor' },
  { word: '날벼락', cat: 'metaphor' },
  { word: '엎친 데 덮친', cat: 'metaphor' },
  { word: '설상가상', cat: 'metaphor' },
  { word: '엎질러진 물', cat: 'metaphor' },
  { word: '발 없는 말', cat: 'metaphor' },
  { word: '꼬리가 길', cat: 'metaphor' },
  { word: '하늘이 도', cat: 'metaphor' },
  { word: '하늘이 두 쪽', cat: 'metaphor' },
  { word: '봇물 터지', cat: 'metaphor' },
  { word: '봇물이 터', cat: 'metaphor' },
  { word: '불티나게', cat: 'metaphor' },
  { word: '쥐도 새도 모르', cat: 'metaphor' },
  { word: '물 만난 고기', cat: 'metaphor' },
  { word: '물 흐르듯', cat: 'metaphor' },
  { word: '꿀 먹은 벙어리', cat: 'metaphor' },
  { word: '꿔다 놓은 보릿자루', cat: 'metaphor' },
  { word: '닭 쫓던 개', cat: 'metaphor' },
  { word: '꿩 먹고 알', cat: 'metaphor' },
  { word: '도마 위에 오', cat: 'metaphor' },
  { word: '도마 위의', cat: 'metaphor' },
  { word: '뜨거운 감자', cat: 'metaphor' },
  { word: '발등에 불', cat: 'metaphor' },
  { word: '눈코 뜰 새', cat: 'metaphor' },
  { word: '눈 깜짝할 사이', cat: 'metaphor' },
  { word: '눈 깜빡할 사이', cat: 'metaphor' },
  { word: '쏜살같이', cat: 'metaphor' },
  { word: '쥐꼬리만', cat: 'metaphor' },
  { word: '새 발의 피', cat: 'metaphor' },
  { word: '하늘과 땅 차이', cat: 'metaphor' },
  { word: '천양지차', cat: 'metaphor' },
  { word: '비 온 뒤에 땅이 굳', cat: 'metaphor' },
  { word: '산 넘어 산', cat: 'metaphor' },
  { word: '하루가 멀다', cat: 'metaphor' },
  { word: '하늘의 별 따', cat: 'metaphor' },
  { word: '밑 빠진 독', cat: 'metaphor' },
  { word: '계란으로 바위', cat: 'metaphor' },
  { word: '달걀로 바위', cat: 'metaphor' },
  { word: '식은 죽 먹기', cat: 'metaphor' },
  { word: '누워서 떡 먹', cat: 'metaphor' },
  { word: '땅 짚고 헤엄', cat: 'metaphor' },
  { word: '엎드려 절받', cat: 'metaphor' },
  { word: '불난 집에 부채질', cat: 'metaphor' },
  { word: '기름을 붓', cat: 'metaphor' },
  { word: '불에 기름', cat: 'metaphor' },
  { word: '꼬리에 꼬리를 물', cat: 'metaphor' },
  { word: '실타래처럼 얽', cat: 'metaphor' },
  { word: '거미줄처럼', cat: 'metaphor' },
  { word: '백지장도 맞들', cat: 'metaphor' },
  { word: '천금 같', cat: 'metaphor' },
  { word: '주마등처럼', cat: 'metaphor', alt: '회상을 장면 단위로 직접 보여주기.' },
  { word: '얼음장같이', cat: 'metaphor' },
  { word: '얼음장처럼', cat: 'metaphor' },
  { word: '불꽃이 튀', cat: 'metaphor' },
  { word: '칼날 같', cat: 'metaphor' },
  { word: '바람처럼 사라', cat: 'metaphor' },
  { word: '연기처럼 사라', cat: 'metaphor' },
  { word: '봄눈 녹듯', cat: 'metaphor' },
  { word: '눈 녹듯', cat: 'metaphor' },
  { word: '꿈인지 생시', cat: 'metaphor' },
  { word: '꿈만 같', cat: 'metaphor' },
  { word: '그림의 떡', cat: 'metaphor' },
  { word: '그림 같은', cat: 'metaphor', alt: '아름다움을 구체적 디테일로.' },
  { word: '하늘이 내린', cat: 'metaphor' },
  { word: '천사 같은', cat: 'metaphor' },
  { word: '악마 같은', cat: 'metaphor' },
  { word: '돌처럼 굳', cat: 'metaphor' },
  { word: '돌이 된 듯', cat: 'metaphor' },
  { word: '석고상처럼', cat: 'metaphor' },
  { word: '시간이 멈춘 듯', cat: 'metaphor' },
  { word: '시간이 멈춘 것', cat: 'metaphor' },
  { word: '폭풍 전야', cat: 'metaphor' },
  { word: '폭풍전야', cat: 'metaphor' },

  // ── 장면·서사 클리셰 (scene) ──
  { word: '운명의 장난', cat: 'scene', alt: '우연·아이러니를 사건으로 직접 구성.' },
  { word: '운명처럼', cat: 'scene' },
  { word: '운명의 상대', cat: 'scene' },
  { word: '운명적인 만남', cat: 'scene' },
  { word: '운명적 만남', cat: 'scene' },
  { word: '첫눈에 반', cat: 'scene', alt: '끌림의 구체적 계기·관찰을 보여주기.' },
  { word: '한눈에 반', cat: 'scene' },
  { word: '시간이 멈춘 것 같', cat: 'scene' },
  { word: '세상이 멈춘 것', cat: 'scene' },
  { word: '둘만의 세계', cat: 'scene' },
  { word: '주위의 소음이 사라', cat: 'scene' },
  { word: '눈이 마주치는 순간', cat: 'scene' },
  { word: '눈빛이 흔들', cat: 'scene' },
  { word: '말없이 고개를 끄덕', cat: 'scene' },
  { word: '쓴웃음을 지', cat: 'scene' },
  { word: '씁쓸한 미소', cat: 'scene' },
  { word: '미소를 머금', cat: 'scene' },
  { word: '엷은 미소', cat: 'scene' },
  { word: '입꼬리가 올라', cat: 'scene' },
  { word: '한숨을 내쉬', cat: 'scene', alt: '한숨 대신 다른 행동·생각으로 변주.' },
  { word: '깊은 한숨', cat: 'scene' },
  { word: '땅이 꺼지게 한숨', cat: 'scene' },
  { word: '어깨가 축 처', cat: 'scene' },
  { word: '어깨를 으쓱', cat: 'scene' },
  { word: '고개를 가로저', cat: 'scene' },
  { word: '고개를 떨', cat: 'scene' },
  { word: '뒷모습을 바라보', cat: 'scene' },
  { word: '멀어지는 뒷모습', cat: 'scene' },
  { word: '창밖을 바라보', cat: 'scene', alt: '시선 처리를 인물 행동으로 차별화.' },
  { word: '먼 산을 바라보', cat: 'scene' },
  { word: '허공을 응시', cat: 'scene' },
  { word: '말끝을 흐', cat: 'scene' },
  { word: '정적이 흘렀', cat: 'scene' },
  { word: '침묵이 흘렀', cat: 'scene' },
  { word: '어색한 침묵', cat: 'scene' },
  { word: '무거운 침묵', cat: 'scene' },
  { word: '정적을 깨', cat: 'scene' },
  { word: '시간이 흐를수록', cat: 'scene' },
  { word: '운명의 수레바퀴', cat: 'scene' },
  { word: '비극의 서막', cat: 'scene' },
  { word: '폭풍 같은 시간', cat: 'scene' },
  { word: '눈물 없이 볼 수 없', cat: 'scene' },
  { word: '먹구름이 드리', cat: 'scene' },
  { word: '어둠이 깔리', cat: 'scene' },
  { word: '여명이 밝아', cat: 'scene' },
  { word: '동이 트', cat: 'scene' },

  // ── 군더더기·상투 어구 (filler) ──
  { word: '다름 아닌', cat: 'filler', alt: '강조 어구 생략 검토.' },
  { word: '다름이 아니라', cat: 'filler' },
  { word: '두말할 나위', cat: 'filler' },
  { word: '말할 것도 없이', cat: 'filler' },
  { word: '말 그대로', cat: 'filler' },
  { word: '그야말로', cat: 'filler' },
  { word: '그도 그럴 것이', cat: 'filler' },
  { word: '아니나 다를까', cat: 'filler' },
  { word: '어찌 보면', cat: 'filler' },
  { word: '어떻게 보면', cat: 'filler' },
  { word: '다시 말해', cat: 'filler' },
  { word: '뭐랄까', cat: 'filler' },
  { word: '어쩌면', cat: 'filler', alt: '추측 남발 시 한두 번으로 줄이기.' },
  { word: '그럼에도 불구하고', cat: 'filler', alt: '"그래도"로 간결하게.' },
  { word: '결론부터 말하자면', cat: 'filler' },
  { word: '솔직히 말해서', cat: 'filler' },
  { word: '두근거리는 마음', cat: 'filler' },
  { word: '설레는 마음', cat: 'filler' },
  { word: '벅찬 마음', cat: 'filler' },
  { word: '만감이 교차', cat: 'filler' },
  { word: '뭐라 형용할 수 없', cat: 'filler' },
  { word: '말로 표현할 수 없', cat: 'filler' },
  { word: '이루 말할 수 없', cat: 'filler' },
  { word: '형언할 수 없', cat: 'filler' },
  { word: '그 무엇과도 바꿀 수 없', cat: 'filler' },
  { word: '세상 그 어떤', cat: 'filler' },
  { word: '뼛속까지', cat: 'filler' },
  { word: '온몸으로', cat: 'filler' },
  { word: '마음 한구석', cat: 'filler' },
  { word: '마음 한편', cat: 'filler' },
  { word: '가슴 한편', cat: 'filler' },
  { word: '깊은 곳에서', cat: 'filler' },
]

const CAT_META: Record<Cat, { label: string; color: string; desc: string }> = {
  emotion: { label: '감정·심리 상투구', color: 'var(--warn)', desc: '닳아버린 감정 표현 — 상황·행동으로 보여주기' },
  sense: { label: '신체 반응·감각', color: 'var(--accent)', desc: '반복되는 몸의 반응 묘사 — 신선한 디테일로 대체' },
  metaphor: { label: '진부한 비유·관용구', color: 'var(--ok)', desc: '굳어버린 비유·속담 — 새 이미지로 갈아끼우기' },
  scene: { label: '장면·서사 클리셰', color: '#b07cd8', desc: '익숙한 장면 연출 — 인물만의 행동으로 차별화' },
  filler: { label: '군더더기·상투 어구', color: 'var(--muted)', desc: '의미 없는 상투 표현 — 생략하거나 간결하게' },
}

// ── 탐지 ───────────────────────────────────────────────
interface Hit {
  entry: Entry
  index: number
  end: number
  line: number
}

// 사전 단어를 길이 내림차순으로 정렬(긴 표현 우선 매칭으로 겹침 줄임)
const SORTED = [...DICT].sort((a, b) => b.word.length - a.word.length)

// 정규식 특수문자 이스케이프
function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 전체 사전 단일 정규식(대안 매칭). 길이순으로 합쳐 긴 표현이 먼저 매칭되게 한다.
const COMBINED = new RegExp(SORTED.map((e) => esc(e.word)).join('|'), 'g')
const WORD_INDEX: Map<string, Entry> = new Map(DICT.map((e) => [e.word, e]))

function detect(text: string): Hit[] {
  if (!text) return []
  const hits: Hit[] = []
  // 줄 계산용 개행 인덱스
  const lineStarts: number[] = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1)
  const toLine = (idx: number) => {
    let lo = 0, hi = lineStarts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (lineStarts[mid] <= idx) lo = mid; else hi = mid - 1
    }
    return lo + 1
  }

  COMBINED.lastIndex = 0
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = COMBINED.exec(text)) !== null) {
    if (guard++ > 20000) break // 폭주 방지
    const word = m[0]
    const entry = WORD_INDEX.get(word)
    if (entry) {
      hits.push({ entry, index: m.index, end: m.index + word.length, line: toLine(m.index) })
    }
    if (m.index === COMBINED.lastIndex) COMBINED.lastIndex++
  }
  return hits
}

// 본문 강조용 세그먼트 분할(매치/비매치 교차)
interface Seg { text: string; hit?: Hit }
function segmentize(text: string, hits: Hit[]): Seg[] {
  if (hits.length === 0) return [{ text }]
  const segs: Seg[] = []
  let cur = 0
  for (const h of hits) {
    if (h.index < cur) continue // 겹침 방지(긴 표현 우선)
    if (h.index > cur) segs.push({ text: text.slice(cur, h.index) })
    segs.push({ text: text.slice(h.index, h.end), hit: h })
    cur = h.end
  }
  if (cur < text.length) segs.push({ text: text.slice(cur) })
  return segs
}

export default function ClicheFinder() {
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState<'all' | Cat>('all')
  const copyTimer = useRef<number | null>(null)

  // 언마운트 시 복사 타이머 정리
  useEffect(() => () => { if (copyTimer.current != null) clearTimeout(copyTimer.current) }, [])

  const hits = useMemo(() => {
    try { return detect(text) } catch { return [] }
  }, [text])

  const counts = useMemo(() => {
    const c: Record<Cat, number> = { emotion: 0, sense: 0, metaphor: 0, scene: 0, filler: 0 }
    for (const h of hits) c[h.entry.cat]++
    return c
  }, [hits])

  const shownHits = useMemo(
    () => (filter === 'all' ? hits : hits.filter((h) => h.entry.cat === filter)),
    [hits, filter],
  )

  // 강조 표시는 필터 반영(필터된 항목만 강조)
  const segs = useMemo(() => {
    try { return segmentize(text, shownHits) } catch { return [{ text }] }
  }, [text, shownHits])

  // 표현별 집계(목록용): 같은 표현 묶어 횟수 표시
  const grouped = useMemo(() => {
    const map = new Map<string, { entry: Entry; count: number; lines: number[] }>()
    for (const h of shownHits) {
      const g = map.get(h.entry.word)
      if (g) { g.count++; if (!g.lines.includes(h.line)) g.lines.push(h.line) }
      else map.set(h.entry.word, { entry: h.entry, count: 1, lines: [h.line] })
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.entry.word.localeCompare(b.entry.word))
  }, [shownHits])

  // 진부도(상투어 밀도) — 100자당 상투 표현 수 근사
  const density = useMemo(() => {
    const len = text.replace(/\s/g, '').length
    if (len === 0) return 0
    return (hits.length / len) * 100
  }, [hits.length, text])

  const resultText = useMemo(() => {
    if (grouped.length === 0) return ''
    const lines: string[] = ['[상투 표현 점검 결과]', `상투 표현 ${hits.length}건(${grouped.length}종) · 100자당 ${density.toFixed(1)}건`, '']
    for (const g of grouped) {
      const cm = CAT_META[g.entry.cat]
      const alt = g.entry.alt || cm.desc
      lines.push(`• "${g.entry.word}" ×${g.count} [${cm.label}] (줄 ${g.lines.join(', ')})`)
      lines.push(`  → ${alt}`)
    }
    return lines.join('\n')
  }, [grouped, hits.length, density])

  const doCopy = async () => {
    if (!resultText) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(resultText)
      } else {
        const ta = document.createElement('textarea')
        ta.value = resultText
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  const sample = '문이 열리는 순간 그녀와 눈이 마주쳤다. 첫눈에 반한 것처럼 심장이 쿵 내려앉았고, 시간이 멈춘 것 같았다. 가슴이 철렁 내려앉으며 손에 땀을 쥐었다. 쥐 죽은 듯 고요한 방, 그는 깊은 한숨을 내쉬며 씁쓸한 미소를 지었다. 운명의 장난처럼, 모든 것이 불 보듯 뻔했다. 그럼에도 불구하고 만감이 교차하는 마음 한구석이 먹먹했다.'

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const topBar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }
  const title: React.CSSProperties = { fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }
  const taStyle: React.CSSProperties = {
    minHeight: 90, maxHeight: 150, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '11px 13px', fontSize: 15, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const chipRow: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }
  const chip = (active: boolean, color: string): React.CSSProperties => ({
    fontSize: 12, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${active ? color : 'var(--border)'}`,
    background: active ? color : 'var(--chrome-2)',
    color: active ? 'var(--paper)' : 'var(--text)', userSelect: 'none', whiteSpace: 'nowrap',
  })
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 2 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '2px 0' }
  const preview: React.CSSProperties = {
    background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10,
    padding: '11px 13px', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px' }
  const cardHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }
  const tag = (color: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 6, padding: '1px 6px', whiteSpace: 'nowrap' })
  const wordTxt: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: 'var(--text)' }
  const cntTxt: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const altTxt: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 2 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)', textAlign: 'center', fontSize: 13, lineHeight: 1.6, padding: 16 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }
  const statRow: React.CSSProperties = { display: 'flex', gap: 8 }
  const stat: React.CSSProperties = { flex: 1, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 6px', textAlign: 'center', minWidth: 0 }
  const statVal: React.CSSProperties = { fontSize: 19, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const statLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.3 }

  const densityLabel = density === 0 ? '—' : density < 0.5 ? '담백함' : density < 1.2 ? '보통' : density < 2 ? '다소 많음' : '상투어 과다'
  const densityColor = density === 0 ? 'var(--muted)' : density < 0.5 ? 'var(--ok)' : density < 1.2 ? 'var(--accent)' : 'var(--warn)'

  return (
    <div style={wrap}>
      <div style={topBar}>
        <div style={title}>🗯️ 가슴이 철렁·눈물이 핑·쥐 죽은 듯 같은 상투 표현을 로컬 사전({DICT.length}+)으로 찾습니다 (네트워크 불필요)</div>
      </div>

      <textarea
        style={taStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="원고를 붙여넣으세요. 진부한 감정 표현·관용구·장면 클리셰를 찾아 강조하고 대안을 권합니다."
        spellCheck={false}
        aria-label="상투 표현 점검 입력"
      />

      <div style={chipRow}>
        <span style={chip(filter === 'all', 'var(--accent)')} onClick={() => setFilter('all')} role="button" tabIndex={0}>전체 {hits.length}</span>
        <span style={chip(filter === 'emotion', CAT_META.emotion.color)} onClick={() => setFilter('emotion')} role="button" tabIndex={0}>감정 {counts.emotion}</span>
        <span style={chip(filter === 'sense', CAT_META.sense.color)} onClick={() => setFilter('sense')} role="button" tabIndex={0}>감각 {counts.sense}</span>
        <span style={chip(filter === 'metaphor', CAT_META.metaphor.color)} onClick={() => setFilter('metaphor')} role="button" tabIndex={0}>비유 {counts.metaphor}</span>
        <span style={chip(filter === 'scene', CAT_META.scene.color)} onClick={() => setFilter('scene')} role="button" tabIndex={0}>장면 {counts.scene}</span>
        <span style={chip(filter === 'filler', CAT_META.filler.color)} onClick={() => setFilter('filler')} role="button" tabIndex={0}>군더더기 {counts.filler}</span>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => setText(sample)} type="button">예시</button>
        <button className="minibtn" onClick={() => setText('')} disabled={!text} type="button">지우기</button>
        <button className="btn-primary" onClick={doCopy} disabled={grouped.length === 0} type="button">{copied ? '복사됨 ✓' : '결과 복사'}</button>
      </div>

      {text.trim() === '' ? (
        <div style={empty}>
          <div style={{ fontSize: 30 }}>🗯️</div>
          <div>원고를 붙여넣으면 가슴이 철렁·눈물이 핑·손에 땀을 쥐게·불 보듯 뻔<br />같은 상투 표현을 본문에 강조하고 대안 방향을 정리합니다.</div>
          <div style={hint}>부분일치 사전이라 일부는 문맥에 따라 자연스러울 수 있는 참고 항목입니다.</div>
        </div>
      ) : (
        <div style={scroll}>
          <div style={statRow}>
            <div style={stat}><div style={statVal}>{hits.length}</div><div style={statLabel}>상투 표현(건)</div></div>
            <div style={stat}><div style={statVal}>{grouped.length || 0}</div><div style={statLabel}>표현 종류</div></div>
            <div style={stat}><div style={{ ...statVal, color: densityColor }}>{densityLabel}</div><div style={statLabel}>100자당 {density.toFixed(1)}건</div></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={sectionTitle}>본문 강조 {filter !== 'all' && `· ${CAT_META[filter].label}만`}</div>
            <div style={preview}>
              {segs.map((s, i) =>
                s.hit ? (
                  <mark
                    key={i}
                    title={`${CAT_META[s.hit.entry.cat].label}: ${s.hit.entry.alt || CAT_META[s.hit.entry.cat].desc}`}
                    style={{
                      background: 'transparent',
                      color: CAT_META[s.hit.entry.cat].color,
                      fontWeight: 700,
                      borderBottom: `2px solid ${CAT_META[s.hit.entry.cat].color}`,
                      padding: '0 1px',
                    }}
                  >
                    {s.text}
                  </mark>
                ) : (
                  <span key={i}>{s.text}</span>
                ),
              )}
            </div>
          </div>

          {grouped.length === 0 ? (
            <div style={empty}>
              <div style={{ fontSize: 30 }}>{hits.length === 0 ? '✅' : '🔍'}</div>
              <div>{hits.length === 0 ? '눈에 띄는 상투 표현이 없습니다. 표현이 신선합니다!' : '선택한 분류에 해당하는 항목이 없습니다.'}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={sectionTitle}>상투 표현 목록 ({grouped.length}종 · {shownHits.length}건) — 새 표현으로 바꿔보세요</div>
              {grouped.map((g) => {
                const cm = CAT_META[g.entry.cat]
                return (
                  <div key={g.entry.word} style={card}>
                    <div style={cardHead}>
                      <span style={wordTxt}>{g.entry.word}</span>
                      <span style={tag(cm.color)}>{cm.label}</span>
                      <span style={{ flex: 1 }} />
                      <span style={cntTxt}>{g.count}회 · 줄 {g.lines.slice(0, 8).join(', ')}{g.lines.length > 8 ? '…' : ''}</span>
                    </div>
                    <div style={altTxt}>{g.entry.alt || cm.desc}</div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={hint}>상투 표현은 무조건 틀린 게 아니라, 반복되면 글이 닳아 보입니다. 핵심 장면일수록 인물만의 신선한 묘사로 바꿔보세요. 부분일치 사전이라 문맥상 자연스러운 경우도 있습니다.</div>
        </div>
      )}
    </div>
  )
}
