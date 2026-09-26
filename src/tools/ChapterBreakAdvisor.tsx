// 챕터 분할 조언 — "이 원고/연재를 어디서 끊을 것인가"를 돕는 도구.
//  '챕터 엔딩 설계(chapter-end-designer)'가 "한 화를 어떻게 닫을까(엔딩의 질)"를 다룬다면,
//  이 도구는 그 앞 단계 — "긴 본문/시퀀스를 어느 지점에서 끊어 여러 회차로 나눌까"를 다룬다.
//  (1) 분할 원칙 사전: 훅 지점·긴장 고점·장면 전환·분량 균형 등 6범주의 자작 가이드(정의·신호·요령·함정).
//  (2) 분할 적합도 체크리스트: 가중치·진행률·범주별 묶음. localStorage 로 항목 체크 영속.
//  (3) 분할 메모 관리(CRUD): 계획한 끊는 지점을 회차로 적어 두고, 예상 분량/끊는 이유/근거를 기록.
//  (4) 분할점 자동 제안: 본문을 붙여넣으면 문단 단위로 쪼개 "여기서 끊으면 좋은 후보"를 신호와 함께 표시.
//  (5) 리듬·균형 점검: 계획한 회차들의 분량 편차·연속 동일 의도(끊는 이유) 단조로움을 경고.
//  자급식: react·linkbus 외 import 없음. 전부 로컬(외부 미디어/키/네트워크 불필요). 저작권 안전(자작 텍스트만).
//  연계: 좌측 바인더 파일 드롭 → 본문을 분할점 분석기에 채움. 분할 계획표를 프로젝트 자료('분할')에 문서로 추가.
//        분할 메모를 📎 수집함에 담기. 끊는 지점이 정해지면 ➡️ '챕터 엔딩 설계'로 이어 가기(openToolLinked).
import { useState, useEffect, useRef, useMemo } from 'react'
import { addToProject, hasProjectBridge, addToStash, hasStash, getDragItem, isItemDrag, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'chapter-break-advisor',
  name: '챕터 분할 조언',
  icon: '✂️',
  group: '구상·정리',
  intro: '연재/장편을 어디서 끊을지 — 훅·긴장 고점·장면 전환·분량 균형 원칙과 체크리스트, 분할점 자동 제안, 분할 계획 관리',
  w: 780,
  h: 680,
}

// ===================== 분할 원칙 사전(자작) =====================
type CutKey = 'hook' | 'tension' | 'sceneshift' | 'balance' | 'beat' | 'time'
interface CutPrinciple {
  key: CutKey
  label: string
  icon: string
  pull: number          // 끌어당김 강도(0~5) — 가이드용 평균 기대치
  short: string         // 한 줄 정의
  desc: string          // 설명
  signals: string[]     // "여기가 끊을 자리"라는 신호
  tips: string[]        // 실전 요령
  pitfalls: string[]    // 흔한 함정
}

const PRINCIPLES: CutPrinciple[] = [
  {
    key: 'hook', label: '훅 지점에서 끊기', icon: '🪝', pull: 5,
    short: '다음을 궁금하게 만드는 미끼(질문·위기·등장) 직전·직후에서 끊는다.',
    desc: '연재의 한 화는 "다음 화를 누르게" 만들어야 한다. 새 인물 등장, 결정적 선택 직전, 폭로 한 줄처럼 독자의 즉답 욕구가 가장 큰 지점이 가장 좋은 분할 자리다. 끊는 위치 자체가 곧 훅이 된다.',
    signals: ['"바로 다음에 무슨 일이?"가 강하게 생기는 줄.', '새 인물·정보가 막 등장하려는 직전.', '인물이 중대한 선택·행동을 막 하려는 순간.', '예상 밖의 한마디·반전이 떨어진 직후.'],
    tips: ['끊기 전 한두 문장에 빌드업이 쌓였는지 확인한다(맥락 없이 끊으면 황당함).', '다음 화 첫 문장이 이 훅을 곧바로 받도록 설계한다.', '훅은 회차 끝의 마지막 한 문장에 짧고 강하게 둔다.'],
    pitfalls: ['거짓 훅(다음 화에서 허무하게 해소) → 불신.', '매 화 같은 강도의 훅 → 자극 인플레로 무뎌짐.', '빌드업 없는 갑작스러운 끊기 → 충격이 아니라 혼란.'],
  },
  {
    key: 'tension', label: '긴장 고점에서 끊기', icon: '🌋', pull: 5,
    short: '갈등·긴장 곡선이 정점에 다다른 순간에 화를 닫는다.',
    desc: '한 화 안에서 긴장은 올랐다 내려야 하지만, 회차의 끝은 정점 직전이 가장 강하다. 미해결된 긴장이 화 사이의 공백을 메우며 독자를 다음 화로 끌고 간다(자이가르닉 효과).',
    signals: ['대치·추격·논쟁이 최고조에 이른 줄.', '위험이 임박했지만 아직 결판나지 않은 순간.', '감정(분노·공포·설렘)이 폭발 직전인 지점.', '판돈이 막 올라간 직후(돌이킬 수 없게 된 순간).'],
    tips: ['정점을 "지나서" 끊지 말 것 — 해소된 뒤엔 견인력이 급감한다.', '긴장 고점 한 번에 모든 떡밥을 풀지 말고 하나만 남긴다.', '직전 1~2화에서 긴장을 충분히 빌드업해 둔다.'],
    pitfalls: ['긴장이 풀린 뒤 끊기(클라이맥스 후일담) → 다음 화 동력 약화.', '연속 매 화 최고조 → 독자 피로, "또 위기냐".', '근거 없는 긴장(인위적 위기) → 개연성 훼손.'],
  },
  {
    key: 'sceneshift', label: '장면·시점 전환에서 끊기', icon: '🎬', pull: 3,
    short: 'POV·장소·시간선이 바뀌는 이음매를 회차 경계로 삼는다.',
    desc: '시점이나 무대가 바뀌는 자리는 자연스러운 분할선이다. 한 줄기를 미해결로 남긴 채 다른 줄기로 넘기면 "저쪽은 어떻게 됐지?"라는 멀티 긴장이 생긴다. 군상극·교차 편집에 특히 잘 맞는다.',
    signals: ['POV 캐릭터가 바뀌는 지점.', '장소·공간이 크게 이동하는 이음매.', '시간이 도약하는 자리(다음 날 아침, 며칠 후).', '병렬 줄기 사이를 오가는 교차 지점.'],
    tips: ['전환 직전 줄기에 미해결 긴장을 남겨 둔다(그냥 옮기면 김 빠짐).', '새 회차 도입에서 "지금 누구/어디"를 빠르게 정박시킨다.', '전환이 잦으면 독자가 줄기를 놓치니 한 화에 한 번이 안전하다.'],
    pitfalls: ['긴장 없이 단순 장면 이동만으로 끊기 → 끊는 효과 미미.', '줄기 난립 → 누가 누구인지 혼란.', '본 줄기를 너무 오래 방치 → 답답함.'],
  },
  {
    key: 'beat', label: '비트·국면 완결에서 끊기', icon: '🎯', pull: 3,
    short: '하나의 작은 목표·국면(비트)이 매듭지어지는 자리에서 끊는다.',
    desc: '한 화는 가급적 하나의 의미 단위(작은 목표의 성취·실패, 한 정보의 획득)를 담는 것이 읽기 쉽다. 국면이 완결되는 지점에서 끊으면 완성감·신뢰가 쌓이고, 새 회차는 새 목표로 깨끗이 시작한다.',
    signals: ['인물의 작은 목표가 막 달성/좌절된 직후.', '한 사건(대화·거래·전투)이 한 매듭을 지은 지점.', '새로운 목표·방향이 막 제시되려는 경계.', '"한 챕터 분량의 이야기"가 자족적으로 끝나는 자리.'],
    tips: ['완결시키되 다음 화로 가는 작은 실마리(기대)는 남긴다.', '완결 엔딩과 훅 엔딩을 번갈아 배치해 리듬을 만든다.', '국면이 너무 잘게 쪼개지면 사건 밀도가 낮아 보이니 묶음을 고려한다.'],
    pitfalls: ['모든 화를 완결만 시키면 끌어당김 부재 → 이탈.', '국면 도중 어중간하게 끊기 → "왜 여기서?"라는 단절감.', '교훈·요약으로 닫기 → 설교조, 여운 소멸.'],
  },
  {
    key: 'time', label: '시간·휴지에서 끊기', icon: '⏳', pull: 2,
    short: '하루의 끝·이동·휴식 등 자연스러운 시간의 마디에서 끊는다.',
    desc: '긴장 곡선에는 골(휴지)이 필요하다. 하루가 저물거나 긴 이동·휴식이 시작되는 자리는 호흡을 고르는 자연스러운 분할선이다. 견인력은 약하지만 리듬 조절과 페이스 환기에 쓰인다.',
    signals: ['밤이 되어 인물이 잠드는/쉬는 지점.', '긴 여정·이동이 시작/끝나는 자리.', '큰 사건 뒤 정리·회복의 국면.', '계절·시기가 넘어가는 마디.'],
    tips: ['앞에 충분한 클라이맥스가 있었을 때만 휴지로 끊는다.', '연속으로 휴지 엔딩이 이어지지 않게 한다(늘어짐).', '잔잔하더라도 다음 화로의 작은 기대 한 줄은 남긴다.'],
    pitfalls: ['빌드업·해소 없이 그냥 잔잔하게 끊기 → 지루함.', '매 화 휴지 → 동력 부재.', '시간 점프를 설명 없이 남발 → 독자 혼란.'],
  },
  {
    key: 'balance', label: '분량 균형으로 끊기', icon: '⚖️', pull: 1,
    short: '회차마다 비슷한 분량이 되도록 호흡을 맞춰 끊는다.',
    desc: '연재 독자는 매 화 비슷한 읽기 시간을 기대한다. 극단적으로 짧거나 긴 회차가 섞이면 만족도와 리듬이 흔들린다. 다른 원칙(훅·긴장 등)을 우선하되, 분량 편차가 크면 분할선을 조정한다.',
    signals: ['목표 분량(예: 5,000자)에 근접한 지점.', '직전 회차들과 분량 차이가 크게 벌어지는 자리.', '한 화가 너무 길어 두 화로 나눌 만한 지점.', '두 짧은 국면을 한 화로 합칠 만한 경계.'],
    tips: ['목표 분량을 정하고 ±20% 안에서 끊을 자리를 찾는다.', '분량을 위해 훅·긴장을 희생하지 않는다(우선순위는 견인력).', '분량이 애매하면 가까운 장면 전환·비트 완결로 맞춘다.'],
    pitfalls: ['글자 수만 맞추려 어중간한 데서 끊기 → 단절감.', '분량 편차 방치 → "이번 화 왜 이렇게 짧지" 불만.', '긴 화를 억지로 늘리려 군더더기 추가 → 지루함.'],
  },
]
const PRIN_UNSET: CutPrinciple = { key: 'beat', label: '미지정', icon: '🏷️', pull: 0, short: '', desc: '', signals: [], tips: [], pitfalls: [] }
function prinDef(k: CutKey): CutPrinciple { return PRINCIPLES.find((p) => p.key === k) || PRIN_UNSET }

// ===================== 분할 적합도 체크리스트(자작) =====================
interface CheckItem { id: string; group: string; weight: number; text: string; tip?: string }
const CHECKLIST: CheckItem[] = [
  // 견인력
  { id: 'c-hook', group: '견인력', weight: 3, text: '끊는 지점이 "다음 화를 누르고 싶게" 만드는가(훅이 있는가).', tip: '미끼 없는 단순 단절은 견인력이 없습니다.' },
  { id: 'c-peak', group: '견인력', weight: 3, text: '긴장·감정이 정점(또는 직전)에서 끊기는가(해소된 뒤가 아닌가).' },
  { id: 'c-unresolved', group: '견인력', weight: 2, text: '미해결된 질문·긴장이 다음 화로 넘어가는가.' },
  // 자연스러움
  { id: 'c-buildup', group: '자연스러움', weight: 2, text: '끊기 직전에 충분한 빌드업·맥락이 쌓였는가(갑작스럽지 않은가).' },
  { id: 'c-seam', group: '자연스러움', weight: 2, text: '장면·시점·시간의 자연스러운 이음매를 활용했는가.' },
  { id: 'c-next-start', group: '자연스러움', weight: 2, text: '다음 화 첫 장면이 이 끊김을 곧바로 받는가(질질 끌지 않는가).', tip: '훅을 던져 놓고 다음 화에서 딴소리하면 신뢰가 깨집니다.' },
  // 단위·완결
  { id: 'c-unit', group: '단위·완결', weight: 2, text: '이 회차가 하나의 의미 단위(국면·목표)를 담고 있는가.' },
  { id: 'c-clarity', group: '단위·완결', weight: 1, text: '회차의 초점이 분산되지 않고 또렷한가(따라갈 줄기가 분명한가).' },
  // 리듬·균형
  { id: 'c-length', group: '리듬·균형', weight: 2, text: '회차 분량이 목표 범위 안에 있는가(다른 화와 크게 차이 나지 않는가).' },
  { id: 'c-variety', group: '리듬·균형', weight: 2, text: '같은 끊는 방식(예: 매번 클리프행어)이 연속되지 않는가.', tip: '훅과 완결을 번갈아 배치하면 리듬이 살아납니다.' },
  { id: 'c-rest', group: '리듬·균형', weight: 1, text: '큰 클라이맥스 뒤에 호흡을 고르는 휴지 회차를 적절히 배치했는가.' },
  // 연재 관점
  { id: 'c-recap', group: '연재 관점', weight: 1, text: '회차 간격(연재 텀)을 고려해 독자가 흐름을 기억할 수 있게 했는가.', tip: '긴 간격이면 다음 화 도입에 가벼운 환기가 필요합니다.' },
  { id: 'c-firstline', group: '연재 관점', weight: 1, text: '각 회차 첫 문장이 독자를 빠르게 끌어들이는가(도입 군더더기 제거).' },
  { id: 'c-title', group: '연재 관점', weight: 1, text: '회차 제목·번호가 일관되고, 분할 의도를 해치지 않는가.' },
]
const CHECK_GROUPS = ['견인력', '자연스러움', '단위·완결', '리듬·균형', '연재 관점']

// ===================== 데이터 모델 =====================
interface BreakMemo {
  id: string
  no: string            // 회차 라벨(예: "1화", "프롤로그")
  title: string         // 회차 제목/요약
  principle: CutKey     // 어떤 원칙으로 끊는가
  reason: string        // 끊는 이유(설계 메모)
  endsAt: string        // 어느 장면/문장에서 끊는가
  nextStart: string     // 다음 화가 시작되는 지점
  estChars: number      // 예상 분량(자)
  done: boolean
  notes: string
  createdAt: number
}

const LS_KEY = 'sry:tool:chapter-break-advisor'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function blankMemo(): BreakMemo {
  return { id: '', no: '', title: '', principle: 'hook', reason: '', endsAt: '', nextStart: '', estChars: 0, done: false, notes: '', createdAt: 0 }
}
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ===================== 분할점 자동 제안 =====================
// 본문을 문단(빈 줄 기준)으로 쪼개고, 각 경계가 "끊을 자리"로 얼마나 좋은지 신호로 점수화한다.
//  완전 로컬 휴리스틱(자작 사전·표지). 외부 호출 없음.
const HOOK_WORDS = ['갑자기', '그 순간', '그때', '문득', '돌연', '느닷없이', '난데없이', '바로 그때', '동시에', '그러나', '하지만', '그런데']
const PEAK_WORDS = ['멈췄다', '멎었다', '얼어붙었다', '굳었다', '돌아봤다', '돌아섰다', '나타났다', '쓰러졌다', '터졌다', '울렸다', '들렸다', '비명', '소리쳤다', '깨달았다', '발견했다', '심장', '숨', '떨렸다']
const SHIFT_WORDS = ['한편', '같은 시각', '며칠 후', '다음 날', '이튿날', '그날 밤', '얼마 후', '한참 후', '장면이', '시간이 흘러', '몇 시간 뒤', '몇 년 후']
const REST_WORDS = ['잠들었다', '잠이 들었다', '밤이 깊었다', '아침이 밝았다', '집으로 돌아왔다', '하루가 저물었다', '눈을 감았다', '쉬었다']
const QUESTION_WORDS = ['왜', '무엇', '누가', '누구', '정체', '비밀', '의문', '알 수 없', '모른 채', '아직']

interface BreakCandidate {
  afterIndex: number       // 이 문단(0-base) 뒤에서 끊기
  preview: string          // 끊는 자리 직전 문단 미리보기
  score: number            // 0~100
  principle: CutKey        // 추정 원칙
  reasons: string[]        // 왜 좋은 자리인지
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n+/)               // 빈 줄로 문단 분할
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0)
}
function countHits(text: string, words: string[]): number {
  return words.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0)
}
function tail(text: string, n: number): string {
  const t = text.trim()
  return t.length <= n ? t : '…' + t.slice(-n)
}

// 한 문단(끊는 자리 직전)과 다음 문단을 보고 끊기 적합도를 평가
function scoreBoundary(prev: string, next: string): { score: number; principle: CutKey; reasons: string[] } {
  const reasons: string[] = []
  let score = 0
  let principle: CutKey = 'beat'
  let bestStrength = 0

  // 직전 문단 끝 35자(끊는 순간의 임팩트 자리)
  const prevTail = prev.slice(-35)
  const prevAll = prev

  // 훅: 미완결 종결·전환 표지
  const endsOpen = /(…|\.\.\.|―|—)\s*$/.test(prev) || /(그리고|그러나|하지만|그런데|그 순간)\s*$/.test(prevTail)
  const hookHits = countHits(prevAll, HOOK_WORDS)
  if (endsOpen || hookHits >= 1) {
    const s = (endsOpen ? 22 : 0) + Math.min(hookHits, 2) * 10
    score += s
    if (s > bestStrength) { bestStrength = s; principle = 'hook' }
    reasons.push(endsOpen ? '직전 문단이 미완결(말줄임·전환어)로 끝나 훅이 됩니다.' : '전환·급변 표지("그 순간" 등)가 있어 끊기 좋습니다.')
  }

  // 긴장 고점: 결정적 동작·감정 정점
  const peakHits = countHits(prevTail, PEAK_WORDS) * 2 + countHits(prevAll, PEAK_WORDS)
  if (peakHits >= 1) {
    const s = Math.min(peakHits, 4) * 9
    score += s
    if (s > bestStrength) { bestStrength = s; principle = 'tension' }
    reasons.push('직전에 결정적 동작·긴장 신호가 있어 고점에서 끊을 수 있습니다.')
  }

  // 질문·미해결
  const qHits = countHits(prevTail, QUESTION_WORDS)
  if (/[?？]\s*$/.test(prevTail) || qHits >= 1) {
    const s = (/[?？]/.test(prevTail) ? 14 : 0) + Math.min(qHits, 2) * 7
    score += s
    if (s > bestStrength && score >= bestStrength) { bestStrength = Math.max(bestStrength, s); if (s >= 12) principle = 'hook' }
    reasons.push('미해결 질문이 남아 다음 화로 긴장이 넘어갑니다.')
  }

  // 장면·시점·시간 전환: 다음 문단 첫머리의 전환 표지
  const nextHead = next.slice(0, 24)
  const shiftHits = countHits(nextHead, SHIFT_WORDS) * 2 + countHits(next, SHIFT_WORDS)
  if (shiftHits >= 1) {
    const s = Math.min(shiftHits, 3) * 11
    score += s
    if (s > bestStrength) { bestStrength = s; principle = 'sceneshift' }
    reasons.push('다음 문단이 장면·시간 전환("한편/다음 날" 등)으로 시작해 자연스러운 이음매입니다.')
  }

  // 휴지(시간 마디)
  const restHits = countHits(prevTail, REST_WORDS) + countHits(prevAll, REST_WORDS)
  if (restHits >= 1) {
    const s = Math.min(restHits, 2) * 8
    score += s
    if (s > bestStrength) { bestStrength = s; principle = 'time' }
    reasons.push('하루의 끝·휴식 등 시간의 마디라 호흡을 고르며 끊을 수 있습니다.')
  }

  // 임팩트(직전 문단 마지막 줄이 짧고 강하면 가점)
  if (prevTail.length <= 30 && prev.length >= 12) { score += 6; reasons.push('직전 마지막 줄이 짧고 강해 잔상이 큽니다.') }

  if (reasons.length === 0) {
    reasons.push('뚜렷한 끊기 신호는 약합니다. 비트(국면) 완결이 끝나는 자리인지 직접 확인하세요.')
    principle = 'beat'
  }

  return { score: Math.max(0, Math.min(100, score)), principle, reasons }
}

function suggestBreaks(text: string, targetChars: number): { paras: string[]; candidates: BreakCandidate[] } {
  const paras = splitParagraphs(text)
  const candidates: BreakCandidate[] = []
  if (paras.length < 2) return { paras, candidates }

  // 누적 글자 수(분량 균형 보정용)
  let acc = 0
  for (let i = 0; i < paras.length - 1; i++) {
    acc += paras[i].length
    const b = scoreBoundary(paras[i], paras[i + 1])
    let score = b.score
    const reasons = [...b.reasons]
    let principle = b.principle

    // 분량 균형: 목표 분량에 근접하면 가점(목표가 설정된 경우)
    if (targetChars > 0) {
      const ratio = acc / targetChars
      if (ratio >= 0.8 && ratio <= 1.3) {
        score += 10
        reasons.push(`이 지점까지 약 ${acc.toLocaleString()}자로 목표 분량(${targetChars.toLocaleString()}자)에 가깝습니다.`)
        if (principle === 'beat' && score < 25) principle = 'balance'
        acc = 0 // 다음 회차 분량 카운트 리셋
      } else if (ratio > 1.6) {
        score += 5
        reasons.push(`목표 분량을 넘겼습니다(약 ${acc.toLocaleString()}자). 이 부근에서 끊는 것을 고려하세요.`)
      }
    }

    candidates.push({
      afterIndex: i,
      preview: tail(paras[i], 70),
      score: Math.max(0, Math.min(100, score)),
      principle,
      reasons,
    })
  }
  return { paras, candidates }
}

// ===================== localStorage =====================
interface Persisted {
  list: BreakMemo[]
  openId: string | null
  checks: Record<string, boolean>
  targetChars: number
}
function loadState(): Persisted {
  const base: Persisted = { list: [], openId: null, checks: {}, targetChars: 5000 }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return base
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.list) ? p.list : []
    const okPrin = (x: unknown): CutKey => PRINCIPLES.some((t) => t.key === x) ? x as CutKey : 'hook'
    const list: BreakMemo[] = arr.filter((x: any) => x && typeof x === 'object').map((x: any) => ({
      id: String(x.id || newId()),
      no: String(x.no || ''),
      title: String(x.title || ''),
      principle: okPrin(x.principle),
      reason: String(x.reason || ''),
      endsAt: String(x.endsAt || ''),
      nextStart: String(x.nextStart || ''),
      estChars: Math.max(0, Number(x.estChars) || 0),
      done: !!x.done,
      notes: String(x.notes || ''),
      createdAt: Number(x.createdAt) || Date.now(),
    }))
    const checks: Record<string, boolean> = {}
    if (p?.checks && typeof p.checks === 'object') {
      CHECKLIST.forEach((c) => { if (p.checks[c.id]) checks[c.id] = true })
    }
    const openId = typeof p?.openId === 'string' && list.some((s) => s.id === p.openId) ? p.openId : null
    const targetChars = Math.max(0, Number(p?.targetChars) || 5000)
    return { list, openId, checks, targetChars }
  } catch { return base }
}

// ===================== 리듬·균형 점검 =====================
interface FlowIssue { idx: number; severity: 'warn' | 'info'; text: string }
function analyzeFlow(list: BreakMemo[], target: number): { issues: FlowIssue[]; prinCount: Record<string, number> } {
  const issues: FlowIssue[] = []
  const prinCount: Record<string, number> = {}
  list.forEach((c) => { prinCount[c.principle] = (prinCount[c.principle] || 0) + 1 })

  // 연속 동일 원칙 3회+
  let run = 1
  for (let i = 1; i < list.length; i++) {
    if (list[i].principle === list[i - 1].principle) {
      run++
      if (run >= 3) {
        issues.push({ idx: i, severity: 'warn', text: `'${prinDef(list[i].principle).label}' 방식으로 ${run}회 연속 끊고 있습니다. 같은 끊기 패턴이 이어지면 독자가 리듬을 예측해 긴장이 무뎌집니다. 다른 방식을 끼워 넣으세요.` })
      }
    } else { run = 1 }
  }

  // 분량 편차(평균 대비 ±50% 초과)
  const sized = list.filter((c) => c.estChars > 0)
  if (sized.length >= 3) {
    const avg = sized.reduce((n, c) => n + c.estChars, 0) / sized.length
    sized.forEach((c) => {
      const idx = list.indexOf(c)
      if (avg > 0 && (c.estChars > avg * 1.5 || c.estChars < avg * 0.5)) {
        const rel = c.estChars > avg ? '깁니다' : '짧습니다'
        issues.push({ idx, severity: 'info', text: `이 회차 예상 분량(${c.estChars.toLocaleString()}자)이 평균(${Math.round(avg).toLocaleString()}자)보다 많이 ${rel}. 분량 편차가 크면 연재 리듬이 흔들립니다.` })
      }
    })
  }

  // 목표 분량 미설정 안내
  if (target <= 0 && list.length) {
    issues.push({ idx: -1, severity: 'info', text: '목표 회차 분량이 설정되지 않았습니다. 분할점 분석기 상단에서 목표 분량을 정하면 균형 기준이 또렷해집니다.' })
  }

  return { issues, prinCount }
}

// 프로젝트 문서 본문(HTML)
function buildBodyHtml(list: BreakMemo[], checks: Record<string, boolean>, target: number): string {
  const parts: string[] = []
  parts.push('<p><b>✂️ 챕터 분할 계획</b> — 어디서 끊을지(회차별 분할 지점·이유)</p>')
  if (target > 0) parts.push(`<p>목표 회차 분량: 약 ${escHtml(target.toLocaleString())}자</p>`)
  list.forEach((c, i) => {
    const pd = prinDef(c.principle)
    const head = `${i + 1}. ${escHtml((c.no.trim() ? c.no.trim() + ' ' : '') + (c.title.trim() || '제목 없는 회차'))}`
    parts.push(`<p><b>${head}</b></p>`)
    const m: string[] = [`${pd.icon} ${escHtml(pd.label)}`]
    if (c.estChars > 0) m.push(`약 ${escHtml(c.estChars.toLocaleString())}자`)
    if (c.done) m.push('확정')
    parts.push('<p>' + m.join(' · ') + '</p>')
    if (c.reason.trim()) parts.push('<p>✂️ 끊는 이유: ' + escHtml(c.reason.trim()) + '</p>')
    if (c.endsAt.trim()) parts.push('<p>⏹️ 끊는 지점: ' + escHtml(c.endsAt.trim()) + '</p>')
    if (c.nextStart.trim()) parts.push('<p>▶️ 다음 화 시작: ' + escHtml(c.nextStart.trim()) + '</p>')
    if (c.notes.trim()) parts.push('<p>🗒️ ' + escHtml(c.notes.trim()) + '</p>')
  })
  const { issues } = analyzeFlow(list, target)
  parts.push('<hr>')
  if (issues.length) {
    parts.push(`<p><b>⚠️ 리듬·균형 점검 (${issues.length}건)</b></p><ul>`)
    issues.forEach((it) => {
      const tag = it.severity === 'warn' ? '🔴' : '🟡'
      const loc = it.idx >= 0 ? `[${it.idx + 1}화] ` : ''
      parts.push('<li>' + tag + ' ' + escHtml(loc) + escHtml(it.text) + '</li>')
    })
    parts.push('</ul>')
  } else if (list.length) {
    parts.push('<p>✅ 분할 리듬에 특별한 경고가 없습니다.</p>')
  }
  // 체크리스트 요약
  const doneN = CHECKLIST.filter((c) => checks[c.id]).length
  parts.push(`<p><b>분할 적합도 체크리스트</b> — ${doneN}/${CHECKLIST.length} 항목 점검</p><ul>`)
  CHECKLIST.forEach((c) => {
    parts.push('<li>' + (checks[c.id] ? '☑ ' : '☐ ') + escHtml(c.text) + '</li>')
  })
  parts.push('</ul>')
  return parts.join('')
}

// ===================== 메인 컴포넌트 =====================
type Tab = 'plan' | 'analyze' | 'guide' | 'check'

export default function ChapterBreakAdvisor({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [list, setList] = useState<BreakMemo[]>(init.current.list)
  const [openId, setOpenId] = useState<string | null>(init.current.openId)
  const [editing, setEditing] = useState<BreakMemo | null>(null)
  const [checks, setChecks] = useState<Record<string, boolean>>(init.current.checks)
  const [targetChars, setTargetChars] = useState<number>(init.current.targetChars)
  const [tab, setTab] = useState<Tab>('plan')
  const [guideKey, setGuideKey] = useState<CutKey>('hook')
  const [draft, setDraft] = useState('')                 // 분할점 분석용 본문
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [dropping, setDropping] = useState(false)
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const mounted = useRef(true)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didSeed = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; if (toastTimer.current) clearTimeout(toastTimer.current) }
  }, [])

  // 자동 저장(draft 는 일회성이라 영속 제외)
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ list, openId, checks, targetChars } as Persisted)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [list, openId, checks, targetChars])

  function flash(msg: string) {
    if (!mounted.current) return
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { if (mounted.current) setToast('') }, 2600)
  }

  // 페이로드 시드: title/text → 본문을 분석기로
  useEffect(() => {
    if (didSeed.current) return
    const title = typeof payload?.title === 'string' ? payload.title : ''
    const text = typeof payload?.text === 'string' ? payload.text : ''
    if (text) {
      didSeed.current = true
      setDraft(text)
      setTab('analyze')
    } else if (title) {
      didSeed.current = true
      setEditing({ ...blankMemo(), id: newId(), title: title.slice(0, 80) })
      setTab('plan')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const flow = useMemo(() => analyzeFlow(list, targetChars), [list, targetChars])
  const warnCount = flow.issues.filter((i) => i.severity === 'warn').length
  const analysis = useMemo(() => suggestBreaks(draft, targetChars), [draft, targetChars])

  const checkScore = useMemo(() => {
    const total = CHECKLIST.reduce((n, c) => n + c.weight, 0)
    const got = CHECKLIST.reduce((n, c) => n + (checks[c.id] ? c.weight : 0), 0)
    const doneN = CHECKLIST.filter((c) => checks[c.id]).length
    return { pct: total ? Math.round((got / total) * 100) : 0, doneN, totalN: CHECKLIST.length }
  }, [checks])

  // ---------- 회차 CRUD ----------
  const guessNextNo = (prev: string): string => {
    const m = prev.match(/(\d+)(\s*화|\s*장|\s*회)?\s*$/)
    if (m) { const n = parseInt(m[1], 10) + 1; return String(n) + (m[2] ? m[2].trim() : '') }
    return ''
  }
  const startNew = (seed?: Partial<BreakMemo>) => {
    const nextNo = list.length ? guessNextNo(list[list.length - 1].no) : '1화'
    setEditing({ ...blankMemo(), id: newId(), no: nextNo, ...seed }); setOpenId(null); setConfirmDel(null); setTab('plan')
  }
  const startEdit = (c: BreakMemo) => { setEditing({ ...c }); setConfirmDel(null) }
  const cancelEdit = () => setEditing(null)
  const saveForm = () => {
    if (!editing) return
    const e: BreakMemo = { ...editing }
    if (!e.no.trim() && !e.title.trim()) e.title = '제목 없는 회차'
    if (!e.createdAt) e.createdAt = Date.now()
    setList((prev) => {
      const exists = prev.some((s) => s.id === e.id)
      return exists ? prev.map((s) => (s.id === e.id ? e : s)) : [...prev, e]
    })
    setOpenId(e.id); setEditing(null)
    flash('분할 메모를 저장했습니다.')
  }
  const remove = (id: string) => {
    setList((prev) => prev.filter((s) => s.id !== id))
    if (openId === id) setOpenId(null)
    if (editing?.id === id) setEditing(null)
    setConfirmDel(null)
  }
  const move = (id: string, dir: -1 | 1) => {
    setList((prev) => {
      const i = prev.findIndex((s) => s.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  // ---------- 드래그 순서 변경 ----------
  const onRowDragStart = (e: React.DragEvent, id: string) => { dragId.current = id; try { e.dataTransfer.effectAllowed = 'move' } catch { /* noop */ } }
  const onRowDragOver = (e: React.DragEvent, id: string) => { if (dragId.current && dragId.current !== id) { e.preventDefault(); setDragOver(id) } }
  const onRowDrop = (id: string) => {
    const from = dragId.current
    dragId.current = null; setDragOver(null)
    if (!from || from === id) return
    setList((prev) => {
      const fi = prev.findIndex((s) => s.id === from)
      const ti = prev.findIndex((s) => s.id === id)
      if (fi < 0 || ti < 0) return prev
      const next = prev.slice()
      const [m] = next.splice(fi, 1)
      next.splice(ti, 0, m)
      return next
    })
  }

  // ---------- 바인더 파일 드롭 → 분석기 ----------
  const onPaneDragOver = (e: React.DragEvent) => { if (isItemDrag(e)) { e.preventDefault(); setDropping(true) } }
  const onPaneDragLeave = () => setDropping(false)
  const onPaneDrop = (e: React.DragEvent) => {
    setDropping(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    if (item.text && item.text.trim()) {
      setDraft(item.text)
      setTab('analyze'); setOpenId(null); setEditing(null)
      flash(`"${item.title}"의 본문을 분할점 분석기에 불러왔습니다.`)
    } else {
      startNew({ title: item.title.slice(0, 80) })
      flash(`"${item.title}"로 새 분할 메모를 시작합니다.`)
    }
  }

  // ---------- 연계 ----------
  const toProject = () => {
    if (!list.length) { flash('추가할 분할 계획이 없어요.'); return }
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '분할',
      title: '챕터 분할 계획',
      bodyHtml: buildBodyHtml(list, checks, targetChars),
      meta: { 회차수: String(list.length), 점검: flow.issues.length ? `${flow.issues.length}건` : '이상 없음', 체크: `${checkScore.doneN}/${checkScore.totalN}` },
    })
    flash(id ? '프로젝트 자료 "분할" 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }
  const stashMemo = (c: BreakMemo) => {
    if (!hasStash()) { flash('수집함을 사용할 수 없습니다.'); return }
    const pd = prinDef(c.principle)
    const lines = [
      `[${(c.no.trim() ? c.no.trim() + ' ' : '') + (c.title.trim() || '회차')}] ${pd.icon} ${pd.label}`,
      c.reason.trim() && '끊는 이유: ' + c.reason.trim(),
      c.endsAt.trim() && '끊는 지점: ' + c.endsAt.trim(),
      c.nextStart.trim() && '다음 화 시작: ' + c.nextStart.trim(),
    ].filter(Boolean) as string[]
    addToStash({ kind: 'note', label: '분할 메모 · ' + (c.title.trim() || c.no.trim() || '회차'), text: lines.join('\n') })
    flash('수집함에 담았습니다.')
  }

  const opened = openId ? list.find((s) => s.id === openId) || null : null

  // ---------- styles ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', position: 'relative' }
  const topbar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex' }
  const sidebar: React.CSSProperties = { width: 248, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }
  const listWrap: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const main: React.CSSProperties = { flex: 1, minWidth: 0, overflowY: 'auto', padding: 14 }
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)' }
  const ta: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 60, lineHeight: 1.6, fontFamily: 'inherit' }
  const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 700, display: 'block', marginBottom: 4 }
  const field: React.CSSProperties = { marginBottom: 10 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }
  const card: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }
  const styles = { input, ta, lbl, field, hint, card }

  const tabBtn = (t: Tab, label: string): React.CSSProperties => ({
    fontWeight: 700, fontSize: 12.5,
    ...(tab === t && !editing && !opened ? { color: 'var(--accent)', borderColor: 'var(--accent)' } : {}),
  })

  return (
    <div style={wrap} onDragOver={onPaneDragOver} onDragLeave={onPaneDragLeave} onDrop={onPaneDrop}>
      {dropping && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '2px dashed var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: 14 }}>
          여기에 놓아 본문을 분할점 분석기로 불러오기
        </div>
      )}

      <div style={topbar}>
        <button className="btn-primary" onClick={() => startNew()}>＋ 분할 메모</button>
        <span style={{ width: 6 }} />
        <button className="minibtn" style={tabBtn('plan', '계획')} onClick={() => { setTab('plan'); setOpenId(null); setEditing(null) }} title="회차별 분할 계획 목록·리듬 점검"><Emoji e="📋" /> 계획 {list.length ? `(${list.length})` : ''}</button>
        <button className="minibtn" style={tabBtn('analyze', '분석')} onClick={() => { setTab('analyze'); setOpenId(null); setEditing(null) }} title="본문을 붙여넣어 끊을 자리 자동 제안"><Emoji e="🔍" /> 분할점 분석</button>
        <button className="minibtn" style={tabBtn('guide', '가이드')} onClick={() => { setTab('guide'); setOpenId(null); setEditing(null) }} title="분할 원칙 사전"><Emoji e="📖" /> 원칙</button>
        <button className="minibtn" style={tabBtn('check', '체크')} onClick={() => { setTab('check'); setOpenId(null); setEditing(null) }} title="분할 적합도 체크리스트"><Emoji e="✅" /> 체크 {checkScore.doneN}/{checkScore.totalN}</button>
        <span style={{ flex: 1 }} />
        {warnCount > 0 && <span style={{ fontSize: 12, color: 'var(--warn)', fontWeight: 700 }} title="리듬·균형 경고"><Emoji e="⚠️" /> {warnCount}</span>}
      </div>

      <div style={body}>
        {/* 좌측 회차 목록 */}
        <div style={sidebar}>
          <div style={listWrap}>
            {list.length === 0 ? (
              <div style={{ ...hint, textAlign: 'center', padding: '20px 8px' }}>
                아직 분할 계획이 없어요.<br />
                <b>＋ 분할 메모</b>로 끊을 지점을 적거나,<br />
                <b><Emoji e="🔍" /> 분할점 분석</b>에 본문을 붙여넣어<br />끊을 자리를 추천받으세요.<br /><br />
                <span style={{ fontSize: 11 }}><b><Emoji e="📖" /> 원칙</b>에서 어디서 끊어야 하는지 먼저 익히세요.</span>
              </div>
            ) : list.map((c, i) => {
              const pd = prinDef(c.principle)
              const active = openId === c.id || editing?.id === c.id
              const hasWarn = flow.issues.some((x) => x.severity === 'warn' && x.idx === i)
              return (
                <div
                  key={c.id}
                  draggable
                  onDragStart={(e) => onRowDragStart(e, c.id)}
                  onDragOver={(e) => onRowDragOver(e, c.id)}
                  onDrop={() => onRowDrop(c.id)}
                  onDragEnd={() => { dragId.current = null; setDragOver(null) }}
                  onClick={() => { setOpenId(c.id); setEditing(null); setConfirmDel(null) }}
                  style={{
                    ...card, cursor: 'pointer', padding: 9,
                    borderColor: dragOver === c.id ? 'var(--accent)' : active ? 'var(--accent)' : 'var(--border)',
                    background: active ? 'color-mix(in srgb, var(--accent) 10%, var(--chrome-2))' : 'var(--chrome-2)',
                  }}
                  title="클릭하여 열기 · 끌어서 순서 변경"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 16 }}>{i + 1}</span>
                    <span title={pd.label}><Emoji e={pd.icon} /></span>
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {emojify((c.no.trim() ? c.no.trim() + ' ' : '') + (c.title.trim() || '제목 없는 회차'))}
                    </span>
                    {c.done && <span title="확정"><Emoji e="✅" /></span>}
                    {hasWarn && <span title="연속 동일 방식 경고"><Emoji e="🔴" /></span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emojify(pd.label)}</span>
                    {c.estChars > 0 && <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{c.estChars.toLocaleString()}자</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 우측 본문 */}
        <div style={main}>
          {editing ? (
            <EditForm editing={editing} isNew={!list.some((s) => s.id === editing.id)} onChange={setEditing} onCancel={cancelEdit} onSave={saveForm} styles={styles} />
          ) : opened ? (
            <MemoDetail
              memo={opened}
              index={list.findIndex((s) => s.id === opened.id) + 1}
              total={list.length}
              onEdit={() => startEdit(opened)}
              onMoveUp={() => move(opened.id, -1)}
              onMoveDown={() => move(opened.id, 1)}
              confirmDel={confirmDel === opened.id}
              onAskDel={() => setConfirmDel(opened.id)}
              onCancelDel={() => setConfirmDel(null)}
              onDel={() => remove(opened.id)}
              onStash={() => stashMemo(opened)}
              canStash={hasStash()}
              styles={styles}
            />
          ) : tab === 'analyze' ? (
            <AnalyzePanel
              draft={draft} setDraft={setDraft}
              targetChars={targetChars} setTargetChars={setTargetChars}
              analysis={analysis}
              onUseCandidate={(cand, no) => startNew({
                no: no || '',
                principle: cand.principle,
                reason: cand.reasons[0] || '',
                endsAt: cand.preview,
              })}
              styles={styles}
            />
          ) : tab === 'guide' ? (
            <GuidePanel guideKey={guideKey} setGuideKey={setGuideKey} onUse={(k) => startNew({ principle: k })} styles={styles} />
          ) : tab === 'check' ? (
            <CheckPanel checks={checks} setChecks={setChecks} score={checkScore} styles={styles} />
          ) : (
            <PlanPanel list={list} flow={flow} target={targetChars} styles={styles} />
          )}
        </div>
      </div>

      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '0 12px 6px' }}>{note}</div>}
      {toast && <div style={{ fontSize: 12, color: 'var(--ok)', padding: '0 12px 6px' }}>✓ {emojify(toast)}</div>}

      {/* 연계 */}
      <div className="linkbar" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={list.length === 0 || !hasProjectBridge()} title={hasProjectBridge() ? '분할 계획표·점검을 프로젝트 자료 "분할" 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={() => openToolLinked('chapter-end-designer', opened ? { title: (opened.no.trim() ? opened.no.trim() + ' ' : '') + opened.title } : undefined)} title="끊을 지점이 정해졌다면, 그 화의 엔딩을 어떻게 닫을지 설계로 이어 가기"><Emoji e="➡️" /> 챕터 엔딩 설계로</button>
        <span style={hint}>좌측 바인더 파일을 끌어다 놓으면 본문을 분석기로 불러옵니다.</span>
      </div>
    </div>
  )
}

// ===================== 계획(목록 비었을 때) / 리듬 점검 패널 =====================
function PlanPanel({ list, flow, target, styles }: { list: BreakMemo[]; flow: { issues: FlowIssue[]; prinCount: Record<string, number> }; target: number; styles: any }) {
  const { hint, card } = styles
  return (
    <div>
      <h3 style={{ margin: '0 0 10px', fontSize: 15 }}><Emoji e="📋" /> 분할 계획 · 리듬 점검</h3>
      {list.length === 0 ? (
        <div style={{ ...card }}>
          <div style={{ ...hint }}>
            왼쪽 목록이 비어 있습니다. <b>＋ 분할 메모</b>로 끊을 회차를 추가하거나, <b><Emoji e="🔍" /> 분할점 분석</b>에서 본문을 붙여넣어 추천 지점을 회차로 만들어 보세요.
          </div>
        </div>
      ) : (
        <>
          {/* 끊는 방식 분포 */}
          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>끊는 방식 분포 ({list.length}화)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {PRINCIPLES.map((p) => {
                const n = flow.prinCount[p.key] || 0
                const pct = list.length ? Math.round((n / list.length) * 100) : 0
                return (
                  <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 150, flexShrink: 0, fontSize: 12 }}><Emoji e={p.icon} /> {emojify(p.label)}</span>
                    <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)' }} />
                    </div>
                    <span style={{ width: 40, textAlign: 'right', fontSize: 11, color: 'var(--muted)' }}>{n}화</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 점검 결과 */}
          <div style={{ ...card }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>리듬·균형 점검 {target > 0 && <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 12 }}>(목표 {target.toLocaleString()}자)</span>}</div>
            {flow.issues.length === 0 ? (
              <div style={{ ...hint, color: 'var(--ok)' }}><Emoji e="✅" /> 분할 리듬에 특별한 경고가 없습니다.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {flow.issues.map((it, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, lineHeight: 1.55 }}>
                    <span style={{ flexShrink: 0 }}>{it.severity === 'warn' ? <Emoji e="🔴" /> : <Emoji e="🟡" />}</span>
                    <span>{it.idx >= 0 && <b>[{it.idx + 1}화] </b>}{emojify(it.text)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ===================== 분할점 분석 패널 =====================
function AnalyzePanel(props: {
  draft: string; setDraft: (s: string) => void
  targetChars: number; setTargetChars: (n: number) => void
  analysis: { paras: string[]; candidates: BreakCandidate[] }
  onUseCandidate: (c: BreakCandidate, no: string) => void
  styles: any
}) {
  const { draft, setDraft, targetChars, setTargetChars, analysis, onUseCandidate } = props
  const { ta, hint, card, lbl } = props.styles
  const ranked = [...analysis.candidates].sort((a, b) => b.score - a.score)
  const top = ranked.slice(0, 6)
  const totalChars = draft.trim().length

  return (
    <div>
      <h3 style={{ margin: '0 0 10px', fontSize: 15 }}><Emoji e="🔍" /> 분할점 분석</h3>
      <div style={{ ...hint, marginBottom: 8 }}>나눌 본문을 붙여넣으면 문단 경계마다 "끊기 좋은 자리"를 신호와 함께 추천합니다. 문단은 <b>빈 줄</b>로 구분하세요.</div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 8 }}>
        <div style={{ flex: '0 0 180px' }}>
          <label style={lbl}>목표 회차 분량(자)</label>
          <input type="number" min={0} step={500} value={targetChars || ''} placeholder="예: 5000"
            onChange={(e) => setTargetChars(Math.max(0, Number(e.target.value) || 0))}
            style={{ ...props.styles.input }} />
        </div>
        <div style={{ ...hint, flex: 1 }}>{totalChars > 0 && <>본문 {totalChars.toLocaleString()}자 · 문단 {analysis.paras.length}개{targetChars > 0 && <> · 권장 {Math.max(1, Math.round(totalChars / targetChars))}화 분할</>}</>}</div>
      </div>
      <textarea
        style={{ ...ta, minHeight: 130, marginBottom: 10 }}
        value={draft}
        placeholder={'나눌 본문을 여기에 붙여넣으세요.\n\n문단 사이는 빈 줄로 구분합니다.\n좌측 바인더 파일을 이 창에 끌어다 놓아도 됩니다.'}
        onChange={(e) => setDraft(e.target.value)}
      />

      {totalChars === 0 ? (
        <div style={{ ...card, ...hint }}>본문을 붙여넣으면 추천 분할점이 여기에 표시됩니다.</div>
      ) : analysis.paras.length < 2 ? (
        <div style={{ ...card, ...hint }}>문단이 하나뿐입니다. 빈 줄로 문단을 나눈 본문을 붙여넣어야 분할점을 찾을 수 있습니다.</div>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>추천 분할점 상위 {top.length}곳</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {top.map((c) => {
              const pd = prinDef(c.principle)
              const color = c.score >= 55 ? 'var(--ok)' : c.score >= 30 ? 'var(--accent)' : 'var(--muted)'
              return (
                <div key={c.afterIndex} style={{ ...card }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>문단 {c.afterIndex + 1} 뒤</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}><Emoji e={pd.icon} /> {emojify(pd.label)}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 999, padding: '1px 9px' }}>적합도 {c.score}</span>
                    <button className="minibtn" onClick={() => onUseCandidate(c, '')} title="이 지점을 새 분할 메모(회차)로 추가">＋ 회차로</button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 6, lineHeight: 1.55 }}>…{c.preview}</div>
                  <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {c.reasons.map((r, i) => <li key={i} style={{ fontSize: 12, lineHeight: 1.5 }}>{emojify(r)}</li>)}
                  </ul>
                </div>
              )
            })}
          </div>
          {ranked.length > top.length && <div style={{ ...hint, marginTop: 8 }}>그 밖에 {ranked.length - top.length}개 경계가 더 있습니다(적합도 낮음).</div>}
          <div style={{ ...hint, marginTop: 10, fontSize: 11 }}>※ 추천은 한국어 작법 신호(전환어·결정적 동작·질문·시간 마디·분량)를 활용한 로컬 휴리스틱입니다. 최종 판단은 작가의 몫입니다.</div>
        </>
      )}
    </div>
  )
}

// ===================== 원칙 가이드 패널 =====================
function GuidePanel({ guideKey, setGuideKey, onUse, styles }: { guideKey: CutKey; setGuideKey: (k: CutKey) => void; onUse: (k: CutKey) => void; styles: any }) {
  const { hint, card } = styles
  const pd = prinDef(guideKey)
  return (
    <div>
      <h3 style={{ margin: '0 0 4px', fontSize: 15 }}><Emoji e="📖" /> 챕터 분할 원칙</h3>
      <div style={{ ...hint, marginBottom: 10 }}>긴 본문/시퀀스를 어디서 끊을 것인가 — 견인력 순으로 6가지 원칙. 클릭해 펼쳐 보세요.</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {PRINCIPLES.map((p) => {
          const on = guideKey === p.key
          return (
            <button key={p.key} className="minibtn" onClick={() => setGuideKey(p.key)} title={p.short}
              style={on ? { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)' } : undefined}>
              <Emoji e={p.icon} /> {emojify(p.label)}
            </button>
          )
        })}
      </div>

      <div style={{ ...card }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 16 }}><Emoji e={pd.icon} /></span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{emojify(pd.label)}</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--accent)' }} title="끌어당김 강도">{pd.pull > 0 ? Array.from({ length: pd.pull }).map((_, i) => <Emoji key={i} e="🪝" />) : '—'}</span>
          <button className="minibtn" onClick={() => onUse(pd.key)} title="이 원칙으로 새 분할 메모 만들기">＋ 이 방식으로 메모</button>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{pd.short}</div>
        <div style={{ ...hint, marginBottom: 10 }}>{pd.desc}</div>

        <GuideBlock title="🔎 여기가 끊을 자리라는 신호" items={pd.signals} />
        <GuideBlock title="💡 실전 요령" items={pd.tips} />
        <GuideBlock title="⚠️ 흔한 함정" items={pd.pitfalls} warn />
      </div>
    </div>
  )
}
function GuideBlock({ title, items, warn }: { title: string; items: string[]; warn?: boolean }) {
  if (!items.length) return null
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: warn ? 'var(--warn)' : 'var(--muted)', marginBottom: 4 }}>{emojify(title)}</div>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((x, i) => <li key={i} style={{ fontSize: 12.5, lineHeight: 1.55 }}>{emojify(x)}</li>)}
      </ul>
    </div>
  )
}

// ===================== 체크리스트 패널 =====================
function CheckPanel({ checks, setChecks, score, styles }: { checks: Record<string, boolean>; setChecks: (f: (p: Record<string, boolean>) => Record<string, boolean>) => void; score: { pct: number; doneN: number; totalN: number }; styles: any }) {
  const { hint, card } = styles
  const toggle = (id: string) => setChecks((p) => ({ ...p, [id]: !p[id] }))
  const reset = () => setChecks(() => ({}))
  const color = score.pct >= 75 ? 'var(--ok)' : score.pct >= 45 ? 'var(--accent)' : 'var(--warn)'
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}><Emoji e="✅" /> 분할 적합도 체크리스트</h3>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={reset} title="모든 체크 해제">초기화</button>
      </div>
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>가중 점검 점수</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color }}>{score.pct}% · {score.doneN}/{score.totalN}</span>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{ width: `${score.pct}%`, height: '100%', background: color, transition: 'width .25s' }} />
        </div>
        <div style={{ ...hint, marginTop: 8 }}>지금 끊으려는(또는 끊은) 자리가 좋은 분할 지점인지 항목별로 점검하세요. 가중치가 높은 항목(견인력)일수록 점수에 크게 반영됩니다.</div>
      </div>

      {CHECK_GROUPS.map((g) => {
        const items = CHECKLIST.filter((c) => c.group === g)
        const gd = items.filter((c) => checks[c.id]).length
        return (
          <div key={g} style={{ ...card, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{g}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{gd}/{items.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((c) => {
                const on = !!checks[c.id]
                return (
                  <label key={c.id} style={{ display: 'flex', gap: 8, cursor: 'pointer', alignItems: 'flex-start' }}>
                    <input type="checkbox" checked={on} onChange={() => toggle(c.id)} style={{ marginTop: 2 }} />
                    <span style={{ flex: 1 }}>
                      <span style={{ fontSize: 12.5, lineHeight: 1.5, color: on ? 'var(--muted)' : 'var(--text)', textDecoration: on ? 'line-through' : 'none' }}>{emojify(c.text)}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--muted)', marginLeft: 6 }}>·가중 {c.weight}</span>
                      {c.tip && !on && <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{emojify(c.tip)}</span>}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ===================== 편집 폼 =====================
function EditForm(props: {
  editing: BreakMemo
  isNew: boolean
  onChange: (c: BreakMemo) => void
  onCancel: () => void
  onSave: () => void
  styles: any
}) {
  const { editing: e } = props
  const { input, ta, lbl, field, hint, card } = props.styles
  const pd = prinDef(e.principle)
  const upd = (patch: Partial<BreakMemo>) => props.onChange({ ...e, ...patch })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>{props.isNew ? '새 분할 메모' : '분할 메모 수정'}</h3>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={props.onCancel}>취소</button>
        <button className="btn-primary" onClick={props.onSave}>저장</button>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ ...field, flex: '0 0 120px' }}>
          <label style={lbl}>회차</label>
          <input style={input} value={e.no} maxLength={24} placeholder="예: 12화" onChange={(ev) => upd({ no: ev.target.value })} />
        </div>
        <div style={{ ...field, flex: '1 1 160px' }}>
          <label style={lbl}>회차 제목/요약</label>
          <input style={input} value={e.title} maxLength={80} placeholder="예: 추격의 끝" onChange={(ev) => upd({ title: ev.target.value })} />
        </div>
      </div>

      <div style={field}>
        <label style={lbl}>끊는 방식(원칙)</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PRINCIPLES.map((p) => {
            const on = e.principle === p.key
            return (
              <button key={p.key} className="minibtn" onClick={() => upd({ principle: p.key })} title={p.short}
                style={on ? { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)' } : undefined}>
                <Emoji e={p.icon} /> {emojify(p.label)}
              </button>
            )
          })}
        </div>
        {pd.short && <div style={{ ...hint, marginTop: 6 }}>{emojify(pd.short)} (끌어당김 {pd.pull > 0 ? Array.from({ length: pd.pull }).map((_, i) => <Emoji key={i} e="🪝" />) : '약함'})</div>}
      </div>

      {/* 선택 원칙 요약 */}
      {pd.desc && (
        <details style={{ ...card, marginBottom: 10 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13 }}><Emoji e={pd.icon} /> {emojify(pd.label)} — 신호·함정 요약</summary>
          <div style={{ marginTop: 8 }}>
            <div style={{ ...hint, marginBottom: 6 }}>{emojify(pd.desc)}</div>
            <GuideBlock title="🔎 끊을 자리 신호" items={pd.signals} />
            <GuideBlock title="⚠️ 함정" items={pd.pitfalls} warn />
          </div>
        </details>
      )}

      <div style={field}>
        <label style={lbl}><Emoji e="✂️" /> 끊는 이유 <span style={{ fontWeight: 400 }}>(왜 여기서 끊는가)</span></label>
        <textarea style={ta} value={e.reason} placeholder="예: 적의 정체가 막 드러나려는 순간에 끊어 다음 화 견인." onChange={(ev) => upd({ reason: ev.target.value })} />
      </div>
      <div style={field}>
        <label style={lbl}><Emoji e="⏹️" /> 끊는 지점 <span style={{ fontWeight: 400 }}>(어느 장면/문장에서)</span></label>
        <textarea style={ta} value={e.endsAt} placeholder="예: '문이 열렸다.' 직후." onChange={(ev) => upd({ endsAt: ev.target.value })} />
      </div>
      <div style={field}>
        <label style={lbl}><Emoji e="▶️" /> 다음 화 시작 <span style={{ fontWeight: 400 }}>(이 끊김을 받는 시작)</span></label>
        <textarea style={ta} value={e.nextStart} placeholder="예: 다음 화는 문 너머의 얼굴을 정면으로 비추며 시작." onChange={(ev) => upd({ nextStart: ev.target.value })} />
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 10 }}>
        <div style={{ flex: '0 0 160px' }}>
          <label style={lbl}>예상 분량(자)</label>
          <input type="number" min={0} step={500} style={input} value={e.estChars || ''} placeholder="예: 5000" onChange={(ev) => upd({ estChars: Math.max(0, Number(ev.target.value) || 0) })} />
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <label className="minibtn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: e.done ? 'var(--ok)' : 'var(--muted)' }}>
            <input type="checkbox" checked={e.done} onChange={(ev) => upd({ done: ev.target.checked })} />
            분할 확정
          </label>
        </div>
      </div>

      <div style={field}>
        <label style={lbl}><Emoji e="🗒️" /> 메모</label>
        <textarea style={ta} value={e.notes} placeholder="대안·고민 등 자유 메모" onChange={(ev) => upd({ notes: ev.target.value })} />
      </div>
    </div>
  )
}

// ===================== 회차 상세 =====================
function MemoDetail(props: {
  memo: BreakMemo
  index: number
  total: number
  onEdit: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  confirmDel: boolean
  onAskDel: () => void
  onCancelDel: () => void
  onDel: () => void
  onStash: () => void
  canStash: boolean
  styles: any
}) {
  const { memo: c, index, total } = props
  const { hint, card } = props.styles
  const pd = prinDef(c.principle)
  const Row = ({ icon, label, val }: { icon: string; label: string; val: string }) =>
    val.trim() ? (
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 3 }}><Emoji e={icon} /> {emojify(label)}</div>
        <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{emojify(val)}</div>
      </div>
    ) : null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{index}/{total}</span>
        <h3 style={{ margin: 0, fontSize: 15 }}>{(c.no.trim() ? c.no.trim() + ' ' : '') + (c.title.trim() || '제목 없는 회차')}</h3>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={props.onMoveUp} disabled={index <= 1} title="위로">↑</button>
        <button className="minibtn" onClick={props.onMoveDown} disabled={index >= total} title="아래로">↓</button>
        <button className="minibtn" onClick={props.onEdit}>수정</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent)' }}><Emoji e={pd.icon} /> {emojify(pd.label)}</span>
        {c.estChars > 0 && <span style={{ ...hint }}>· 약 {c.estChars.toLocaleString()}자</span>}
        {c.done && <span style={{ fontSize: 12, color: 'var(--ok)' }}>· <Emoji e="✅" /> 분할 확정</span>}
      </div>

      <div style={{ ...card, marginBottom: 12 }}>
        {!c.reason.trim() && !c.endsAt.trim() && !c.nextStart.trim() && !c.notes.trim() ? (
          <div style={{ ...hint }}>아직 세부 내용이 없습니다. <b>수정</b>으로 끊는 이유·지점을 채워 보세요.</div>
        ) : (
          <>
            <Row icon="✂️" label="끊는 이유" val={c.reason} />
            <Row icon="⏹️" label="끊는 지점" val={c.endsAt} />
            <Row icon="▶️" label="다음 화 시작" val={c.nextStart} />
            <Row icon="🗒️" label="메모" val={c.notes} />
          </>
        )}
      </div>

      {/* 선택 원칙 점검 힌트 */}
      <details style={{ ...card, marginBottom: 12 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13 }}><Emoji e={pd.icon} /> 이 끊기 방식 점검 힌트</summary>
        <div style={{ marginTop: 8 }}>
          <GuideBlock title="🔎 끊을 자리 신호" items={pd.signals} />
          <GuideBlock title="⚠️ 함정" items={pd.pitfalls} warn />
        </div>
      </details>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="linkbtn" onClick={props.onStash} disabled={!props.canStash} title="이 분할 메모를 수집함에 담기"><Emoji e="📎" /> 수집함에 담기</button>
        <span style={{ flex: 1 }} />
        {props.confirmDel ? (
          <>
            <span style={{ fontSize: 12, color: 'var(--warn)' }}>삭제할까요?</span>
            <button className="minibtn" onClick={props.onCancelDel}>취소</button>
            <button className="minibtn" style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={props.onDel}>삭제</button>
          </>
        ) : (
          <button className="minibtn" onClick={props.onAskDel} title="이 회차 삭제"><Emoji e="🗑️" /> 삭제</button>
        )}
      </div>
    </div>
  )
}
