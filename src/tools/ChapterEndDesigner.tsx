// 챕터 엔딩 설계 — 연재(웹소설/웹툰/시리즈)에서 한 화의 마지막 문단은 "다음 화를 누르게 하는" 가장
//  중요한 자리다. 이 도구는 회차별 엔딩을 (1) 엔딩 유형(클리프행어/여운/반전/질문/장면전환/감정고조)으로
//  분류하고, (2) 유형별 작법 가이드·체크리스트를 제공하며, (3) 엔딩 문단을 붙여넣으면 "다음 화 견인력"을
//  즉시 점수화(질문 던지기/긴장 미해결/단절 강도/연속 동일유형 피로 등)한다. (4) 회차별 엔딩 메모를 CRUD로
//  관리해 전체 흐름(유형 다양성·끌어당김 곡선)을 한눈에 본다.
//  자급식: react·linkbus 외 import 없음. 전부 로컬(외부 미디어/키/네트워크 불필요). 저작권 안전(자작 텍스트만).
//  연계(linkbus): 좌측 바인더 파일을 끌어다 놓으면 제목/본문 끝부분을 회차 시드로 채운다.
//    설계한 엔딩 표를 실제 프로젝트 자료('엔딩') 폴더에 가이드·점검과 함께 문서로 추가.
import { useState, useEffect, useRef, useMemo } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, Emoji, emojify } from './linkbus'

export const meta = { id: 'chapter-end-designer', name: '챕터 엔딩 설계', icon: '🪝', group: '구상·정리', intro: '엔딩 유형별 가이드와 다음 화 견인력 점검, 회차별 엔딩 메모 관리', w: 760, h: 660 }

// ===================== 엔딩 유형 정의 =====================
type EndKey = 'cliff' | 'lingering' | 'twist' | 'question' | 'sceneshift' | 'emotion' | 'unset'
interface EndType {
  key: EndKey
  label: string
  icon: string
  pull: number           // 기본 견인력(0~5) — 평균 기대치(가이드용)
  short: string          // 한 줄 정의
  desc: string           // 설명
  works: string[]        // 작동 원리(왜 다음 화를 누르게 하나)
  checklist: string[]    // 이 유형 엔딩이 갖춰야 할 점검 항목
  pitfalls: string[]     // 흔한 함정
  examples: string[]     // 자작 예시 패턴(저작권 안전: 일반 패턴 문장)
}

const TYPES: EndType[] = [
  {
    key: 'cliff', label: '클리프행어', icon: '🧗', pull: 5,
    short: '결정적 순간 직전에 끊어 결말을 유보한다.',
    desc: '위기·선택·등장 등 가장 긴장된 지점에서 의도적으로 화를 닫아, 결과를 다음 화로 미룬다. 연재 견인력이 가장 강하지만 남발하면 피로와 불신을 부른다.',
    works: ['미완결 욕구(자이가르닉 효과): 끝나지 않은 일을 뇌가 계속 떠올린다.', '결과의 공백을 독자가 스스로 채우려 한다.', '"바로 다음에 무슨 일이?"라는 즉답 욕구를 만든다.'],
    checklist: ['끊는 지점이 진짜 결정적 순간인가(시시한 데서 끊지 않았나).', '독자가 이미 결과를 충분히 궁금해할 만큼 빌드업이 쌓였나.', '다음 화 첫 장면이 이 클리프행어를 곧바로 받는가(질질 끌지 않기).', '거짓 위기(다음 화에서 허무하게 해소)가 아닌가.'],
    pitfalls: ['연속으로 매 화 클리프행어 → 독자 피로·불신("어차피 안 죽잖아").', '빌드업 없이 갑자기 끊기 → 충격이 아니라 황당함.', '다음 화에서 클리프행어를 무시하고 딴 얘기로 시작.'],
    examples: ['문이 열리고, 그곳에 서 있는 사람을 본 순간 ___의 심장이 멎었다.', '방아쇠에 손가락이 닿았다. 그리고 ___', '"네가 한 짓을 다 알아." 그 말이 끝나기도 전에 불이 꺼졌다.'],
  },
  {
    key: 'twist', label: '반전·폭로', icon: '🔀', pull: 5,
    short: '독자의 전제를 뒤집는 사실을 마지막에 드러낸다.',
    desc: '지금까지의 해석을 통째로 다시 쓰게 만드는 정보를 화 끝에 배치한다. 강력하지만 복선 회수가 부실하면 "갑툭튀"가 된다.',
    works: ['세계관·인물 재해석 욕구를 자극한다.', '"그럼 앞 내용은 뭐였지?" 되짚기·다음 화 확인 욕구.', '충격의 여운이 화 사이의 공백을 메운다.'],
    checklist: ['반전을 뒷받침하는 복선이 앞에 깔려 있었나(다시 읽으면 보이는가).', '독자를 속이되 정보를 숨기지 않고 "다르게 보게" 했나(반칙 금지).', '반전이 인물·주제와 맞물려 의미를 더하는가(충격만을 위한 충격 아님).', '다음 화가 이 반전의 여파를 다루는가.'],
    pitfalls: ['복선 없는 반전 → 배신감.', '반전을 위한 반전(개연성·주제와 무관) → 공허함.', '같은 인물이 매번 알고 보니 흑막 → 패턴 노출로 김 빠짐.'],
    examples: ['거울 속에서 자신을 보던 그 얼굴은, ___의 것이 아니었다.', '편지의 마지막 줄에는 죽었다던 ___의 이름이 적혀 있었다.', '"내가 바로 네가 찾던 사람이야." ___이(가) 가면을 벗었다.'],
  },
  {
    key: 'question', label: '질문 던지기', icon: '❓', pull: 4,
    short: '답하지 않은 핵심 질문을 또렷이 남긴다.',
    desc: '서사적 질문(누가/왜/무엇이)을 명료하게 세워 두고 화를 닫는다. 클리프행어보다 부드럽지만 방향이 분명해 다음 화 목적을 만든다.',
    works: ['답을 향한 기대가 다음 화를 보는 이유가 된다.', '독자가 가설을 세우며 능동적으로 개입한다.', '미스터리 동력(드라마틱 퀘스천)을 갱신한다.'],
    checklist: ['질문이 막연하지 않고 구체적인가(무엇의 답이 궁금한지 분명한가).', '독자가 이미 그 질문에 감정적으로 투자되어 있나.', '질문이 큰 줄기(주 갈등)와 연결되는가.', '다음 화가 이 질문에 한 걸음이라도 답하거나 키우는가.'],
    pitfalls: ['질문이 너무 추상적 → 궁금하지 않음.', '한 번에 질문 폭탄 → 무엇을 따라가야 할지 분산.', '오래도록 답을 안 줌 → 질문 피로(맥거핀 남용).'],
    examples: ['그가 마지막으로 남긴 한마디. 그것이 무슨 뜻인지, 아무도 알지 못했다.', '왜 ___만이 그 소리를 들을 수 있는 걸까. 답은 아직 멀리 있었다.', '문 너머에서 무언가 자신을 기다리고 있다는 것만은 분명했다.'],
  },
  {
    key: 'emotion', label: '감정 고조', icon: '🌊', pull: 4,
    short: '감정의 정점에서 멈춰 여운과 몰입을 남긴다.',
    desc: '플롯 사건보다 인물 내면·관계의 감정 파고가 정점에 이른 순간 화를 닫는다. 캐릭터 중심·로맨스·드라마에서 강하다.',
    works: ['감정 동일시가 다음 화 욕구로 이어진다("이 마음이 어떻게 될까").', '관계 변화의 기대(설렘/불안/슬픔)가 공백을 채운다.', '카타르시스의 직전·직후 여운이 길게 남는다.'],
    checklist: ['감정이 사건과 인물 동기에서 자연스럽게 솟았나(억지 신파 아님).', '독자가 그 인물에 충분히 이입되어 있나.', '감정의 방향(설렘/분노/상실)이 다음 화 기대를 만드는가.', '문장 호흡·여백이 감정을 살리는가(설명 과잉 금지).'],
    pitfalls: ['감정의 근거 없이 분위기만 → 공감 실패.', '매 화 최고조 → 감정 인플레, 무뎌짐.', '눈물·고백을 설명으로 깔아뭉갬 → 여운 소실.'],
    examples: ['빗속에서 ___은(는) 그제야 자신이 무엇을 잃었는지 깨달았다.', '"좋아해." 그 말은 끝내 입 밖으로 나오지 못한 채 문이 닫혔다.', '돌아선 등 뒤로, ___의 이름을 부르는 목소리가 점점 멀어졌다.'],
  },
  {
    key: 'sceneshift', label: '장면 전환', icon: '🎬', pull: 3,
    short: '시점·시공간을 끊고 다른 줄기로 옮겨 가며 닫는다.',
    desc: 'POV·장소·시간선을 전환하면서 화를 닫아, 병렬 줄기 사이의 긴장과 "저쪽은 어떻게 됐지?" 궁금증을 만든다. 군상극·교차 편집에 적합.',
    works: ['교차 줄기의 동시 긴장(멀티 클리프행어)을 운용한다.', '한 줄기의 미해결을 남긴 채 다른 줄기로 시선을 넘긴다.', '독자가 두 줄기의 충돌·합류를 기대한다.'],
    checklist: ['전환 직전 줄기에 미해결 긴장이 남아 있나(그냥 옮기면 김 빠짐).', '새 줄기가 곧 본 줄기와 연결될 것이라는 신호가 있나.', '전환이 잦아 독자가 줄기를 놓치지 않는가.', '다음 화가 어느 줄기를 받을지 독자가 기대하게 했나.'],
    pitfalls: ['긴장 없이 단순 장면 이동 → 끊는 효과 없음.', '줄기 난립 → 누가 누구인지 혼란.', '본 줄기를 너무 오래 방치 → 답답함.'],
    examples: ['한편, 같은 시각 ___에서는 전혀 다른 일이 시작되고 있었다.', '그 일을 ___은(는) 아직 알지 못했다. 천 리 밖, 또 다른 그림자가 움직였다.', '카메라가 돌아가듯, 이야기는 ___의 곁을 떠나 ___에게로 향했다.'],
  },
  {
    key: 'lingering', label: '여운·정적', icon: '🍃', pull: 2,
    short: '사건을 매듭짓고 잔잔한 이미지·정서로 닫는다.',
    desc: '한 에피소드를 완결하면서 여운 있는 이미지·독백으로 호흡을 고른다. 견인력은 낮지만 리듬 조절과 완성감, 신뢰 구축에 필요하다.',
    works: ['긴장 곡선의 골(휴지)을 만들어 다음 상승을 돋보이게 한다.', '에피소드 완결감이 작품 신뢰(만족도)를 쌓는다.', '여운 이미지가 다음 화의 새 시작을 깨끗하게 받쳐 준다.'],
    checklist: ['바로 앞에 충분한 클라이맥스·해소가 있었나(여운은 그 뒤에).', '연속으로 여운 엔딩이 이어져 늘어지지 않는가.', '잔잔하되 다음 화로의 작은 실마리(기대)는 남겼나.', '여운 이미지가 주제·정서와 맞닿아 있나.'],
    pitfalls: ['빌드업·해소 없이 그냥 잔잔 → 지루함.', '매 화 여운 → 끌어당김 부재, 이탈.', '교훈·요약으로 닫기 → 설교조, 여운 소멸.'],
    examples: ['창밖으로 첫눈이 내렸다. ___은(는) 오랜만에, 아주 오랜만에 편히 숨을 쉬었다.', '모든 것이 끝났다. 그리고 아침이 왔다.', '바람이 들판을 한 번 쓸고 지나갔다. 그뿐이었다.'],
  },
]
const UNSET: EndType = { key: 'unset', label: '미분류', icon: '🏷️', pull: 0, short: '엔딩 유형을 아직 정하지 않음.', desc: '', works: [], checklist: [], pitfalls: [], examples: [] }
function typeDef(k: EndKey): EndType { return TYPES.find((t) => t.key === k) || UNSET }

// ===================== 데이터 모델 =====================
interface Chapter {
  id: string
  no: string             // 회차 라벨(예: "1화", "3-2", "프롤로그")
  title: string          // 회차 제목
  type: EndKey
  endText: string        // 엔딩 문단(붙여넣기) — 견인력 분석 대상
  hook: string           // 다음 화로 끌고 갈 핵심(설계 메모)
  nextSeed: string       // 다음 화 첫 장면 아이디어(이 엔딩을 받는 시작)
  done: boolean          // 작성 완료 표시
  rating: number         // 작가 자체 평가(0~5, 별)
  notes: string          // 자유 메모
  createdAt: number
}

const LS_KEY = 'sry:tool:chapter-end-designer'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function blankChapter(): Chapter {
  return { id: '', no: '', title: '', type: 'unset', endText: '', hook: '', nextSeed: '', done: false, rating: 0, notes: '', createdAt: 0 }
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화. & < > 필수.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ===================== 다음 화 견인력 분석 =====================
// 엔딩 문단 텍스트를 받아 "다음 화를 누르게 하는 힘"을 0~100 으로 점수화한다.
//  완전 로컬 휴리스틱(작법 신호) — 한국어 종결/연결 표지, 미해결 신호, 질문/말줄임/단절 등을 본다.
interface PullSignal { label: string; got: boolean; weight: number; tip: string }
interface PullResult {
  score: number              // 0~100
  band: 'strong' | 'mid' | 'weak'
  signals: PullSignal[]
  charCount: number
  sentenceCount: number
  note: string               // 한 줄 총평
}

// 마지막 문장(엔딩의 핵심 자리) 추출
function lastSentence(text: string): string {
  const t = text.trim()
  if (!t) return ''
  // 줄바꿈/문장부호 기준으로 분할 후 비어있지 않은 마지막
  const parts = t.split(/(?<=[.?!…。」』”])\s+|\n+/).map((x) => x.trim()).filter(Boolean)
  return parts.length ? parts[parts.length - 1] : t
}
function countSentences(text: string): number {
  const t = text.trim()
  if (!t) return 0
  const parts = t.split(/[.?!…。\n]+/).map((x) => x.trim()).filter(Boolean)
  return Math.max(1, parts.length)
}

// 미해결/긴장 신호 어휘(자작 사전 — 일반 한국어 표지)
const SUSPENSE_WORDS = ['갑자기', '순간', '그때', '그 순간', '그러나', '하지만', '그런데', '문득', '돌연', '느닷없이', '난데없이', '동시에', '바로 그때']
const CLIFF_WORDS = ['멈췄다', '멎었다', '얼어붙었다', '굳었다', '돌아봤다', '돌아섰다', '나타났다', '쓰러졌다', '터졌다', '울렸다', '들렸다', '보였다', '깨달았다', '알아차렸다', '발견했다', '소리쳤다', '비명']
const UNRESOLVED_WORDS = ['아직', '모른 채', '모른다', '알 수 없었다', '알지 못했다', '예감', '불길', '무언가', '누군가', '어딘가', '그것이', '그 말', '그 이름', '정체', '비밀']
const EMOTION_WORDS = ['심장', '눈물', '가슴', '떨렸다', '두근', '숨', '먹먹', '울컥', '아팠다', '그리웠다', '사랑', '미안', '두려', '무서', '간절']

function has(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w))
}
function countHits(text: string, words: string[]): number {
  return words.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0)
}

function analyzePull(text: string, type: EndKey): PullResult {
  const t = text.trim()
  const charCount = t.length
  const sentenceCount = countSentences(t)
  const last = lastSentence(t)
  const signals: PullSignal[] = []

  // 1) 미완결 종결: 말줄임표 / 끊김 / 미완 문장으로 끝남
  const endsOpen = /(…|\.\.\.|―|—|-{2,})\s*$/.test(t) || /[,，、]\s*$/.test(t) || /(그리고|그러나|하지만|그런데|그 순간)\s*$/.test(last)
  signals.push({ label: '미완결 종결(말줄임·끊김)', got: endsOpen, weight: 16, tip: '마지막을 말줄임표(…)나 미완 문장으로 끊으면 결과의 공백이 생겨 다음 화 욕구가 커집니다.' })

  // 2) 질문/궁금증: 물음표 또는 미해결 어휘
  const asksQuestion = /[?？]/.test(last) || /[?？]/.test(t.slice(-40))
  signals.push({ label: '질문·물음표로 닫음', got: asksQuestion, weight: 12, tip: '명료한 질문 한 줄은 다음 화의 목적을 만듭니다. 막연하지 않게 "무엇이 궁금한지"를 또렷이 하세요.' })

  // 3) 미해결 신호 어휘(아직/정체/비밀 등)
  const unresolved = countHits(t, UNRESOLVED_WORDS)
  signals.push({ label: '미해결 신호("아직·정체·비밀" 등)', got: unresolved >= 1, weight: 14, tip: '"아직 알지 못했다", "그 정체는…" 같은 미해결 표지는 긴장을 다음 화로 넘깁니다.' })

  // 4) 단절·충격 동사(멈췄다/나타났다/돌아섰다 등) — 마지막 문장에 있으면 가중
  const cliffInLast = has(last, CLIFF_WORDS)
  const cliffAny = has(t, CLIFF_WORDS)
  signals.push({ label: '결정적 동작·등장으로 끊음', got: cliffInLast || cliffAny, weight: cliffInLast ? 16 : 8, tip: '"문이 열렸다", "그가 돌아섰다"처럼 결정적 동작 직후 끊으면 강한 클리프행어가 됩니다. 가급적 마지막 문장에 두세요.' })

  // 5) 전환·급변 표지(갑자기/그 순간/동시에)
  const turn = has(t, SUSPENSE_WORDS)
  signals.push({ label: '급변·전환 표지', got: turn, weight: 8, tip: '"그 순간", "동시에" 같은 표지는 사건의 급변을 알려 긴장을 끌어올립니다(남발은 금물).' })

  // 6) 감정 정점 신호
  const emo = countHits(t, EMOTION_WORDS)
  signals.push({ label: '감정 정점 신호', got: emo >= 1, weight: 8, tip: '감정 어휘(심장·눈물·간절 등)가 정점에 있으면 감정 견인이 작동합니다. 단, 근거 없는 신파는 역효과입니다.' })

  // 7) 적정 호흡(엔딩 문단이 너무 길거나 짧지 않은가)
  const goodLen = charCount >= 20 && charCount <= 600
  signals.push({ label: '적정 호흡(20~600자)', got: goodLen, weight: 6, tip: '엔딩은 너무 길면 긴장이 흐트러지고, 너무 짧으면 빌드업이 부족합니다. 핵심만 압축하세요.' })

  // 8) 마지막 한 문장에 임팩트(짧고 강하게 끊기)
  const punchy = last.length > 0 && last.length <= 35
  signals.push({ label: '마지막 문장 임팩트(짧게 끊기)', got: punchy, weight: 8, tip: '마지막 한 문장이 짧고 강할수록 잔상이 큽니다. 긴 설명으로 끝내지 마세요.' })

  let raw = signals.reduce((n, s) => n + (s.got ? s.weight : 0), 0)
  const maxW = signals.reduce((n, s) => n + s.weight, 0)

  // 유형 보정: 선택한 유형의 핵심 신호가 없으면 약간 감점(설계 의도와 본문 불일치 알림)
  let mismatch = ''
  if (type === 'cliff' && !(cliffAny || endsOpen)) { raw -= 6; mismatch = '클리프행어로 설계했지만 본문에 끊김·결정적 동작 신호가 약합니다.' }
  if (type === 'question' && !asksQuestion && unresolved === 0) { raw -= 6; mismatch = '질문형으로 설계했지만 본문에 또렷한 질문·미해결 신호가 약합니다.' }
  if (type === 'emotion' && emo === 0) { raw -= 6; mismatch = '감정 고조형으로 설계했지만 본문에 감정 정점 신호가 약합니다.' }
  if (type === 'twist' && !(unresolved >= 1 || cliffAny)) { raw -= 4; mismatch = '반전형으로 설계했다면, 폭로를 받쳐 줄 충격·미해결 신호가 마지막에 있는지 확인하세요.' }

  const score = Math.max(0, Math.min(100, Math.round((raw / maxW) * 100)))
  const band: PullResult['band'] = score >= 66 ? 'strong' : score >= 38 ? 'mid' : 'weak'
  let note = band === 'strong' ? '다음 화를 누르게 할 힘이 강합니다.' : band === 'mid' ? '견인력은 보통입니다. 마지막 한 문장을 더 날카롭게 다듬어 보세요.' : '견인력이 약합니다. 미해결·질문·끊김 중 하나를 분명히 살리세요.'
  if (mismatch) note = mismatch + ' ' + note
  if (!t) note = '엔딩 문단을 붙여넣으면 다음 화 견인력을 점수로 보여 드립니다.'

  return { score, band, signals, charCount, sentenceCount, note }
}

function bandColor(b: PullResult['band']): string {
  return b === 'strong' ? 'var(--ok)' : b === 'mid' ? 'var(--accent)' : 'var(--warn)'
}

// ===================== localStorage 로드 =====================
interface Persisted { list: Chapter[]; openId: string | null }
function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { list: [], openId: null }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.list) ? p.list : Array.isArray(p) ? p : []
    const okType = (x: unknown): EndKey => TYPES.some((t) => t.key === x) || x === 'unset' ? x as EndKey : 'unset'
    const list: Chapter[] = arr.filter((x: any) => x && typeof x === 'object').map((x: any) => ({
      id: String(x.id || newId()),
      no: String(x.no || ''),
      title: String(x.title || ''),
      type: okType(x.type),
      endText: String(x.endText || ''),
      hook: String(x.hook || ''),
      nextSeed: String(x.nextSeed || ''),
      done: !!x.done,
      rating: Math.max(0, Math.min(5, Number(x.rating) || 0)),
      notes: String(x.notes || ''),
      createdAt: Number(x.createdAt) || Date.now(),
    }))
    const openId = typeof p?.openId === 'string' && list.some((s) => s.id === p.openId) ? p.openId : null
    return { list, openId }
  } catch { return { list: [], openId: null } }
}

// ===================== 전체 흐름 분석(유형 다양성·연속 동일유형 피로) =====================
interface FlowIssue { idx: number; severity: 'warn' | 'info'; text: string }
function analyzeFlow(list: Chapter[]): { issues: FlowIssue[]; typeCount: Record<string, number> } {
  const issues: FlowIssue[] = []
  const typeCount: Record<string, number> = {}
  list.forEach((c) => { typeCount[c.type] = (typeCount[c.type] || 0) + 1 })

  // 연속 동일 유형 3회 이상 → 피로 경고
  let run = 1
  for (let i = 1; i < list.length; i++) {
    if (list[i].type !== 'unset' && list[i].type === list[i - 1].type) {
      run++
      if (run >= 3) {
        issues.push({ idx: i, severity: 'warn', text: `${typeDef(list[i].type).label} 엔딩이 ${run}회 연속입니다. 같은 유형이 이어지면 독자가 패턴을 예측해 긴장이 무뎌집니다. 사이에 다른 유형을 끼워 리듬을 바꿔 보세요.` })
      }
    } else { run = 1 }
  }
  // 클리프행어 비중 과다(전체의 60% 초과, 3화 이상)
  const cliffN = typeCount['cliff'] || 0
  if (list.length >= 3 && cliffN / list.length > 0.6) {
    issues.push({ idx: -1, severity: 'info', text: `클리프행어 비중이 높습니다(${cliffN}/${list.length}화). 매 화 위기로 끊으면 "어차피 해결되겠지"라는 불신과 피로가 쌓입니다. 여운·완결 엔딩으로 신뢰를 채워 주세요.` })
  }
  // 미분류 다수
  const unsetN = typeCount['unset'] || 0
  if (unsetN >= 2) {
    issues.push({ idx: -1, severity: 'info', text: `엔딩 유형 미분류가 ${unsetN}건입니다. 각 화의 엔딩 유형을 정하면 끌어당김 곡선과 다양성을 한눈에 점검할 수 있습니다.` })
  }
  return { issues, typeCount }
}

// 프로젝트 문서 본문(HTML)
function buildBodyHtml(list: Chapter[]): string {
  const parts: string[] = []
  parts.push('<p><b>🪝 챕터 엔딩 설계</b> — 회차별 엔딩 유형 · 다음 화 견인력</p>')
  list.forEach((c, i) => {
    const td = typeDef(c.type)
    const pr = analyzePull(c.endText, c.type)
    const head = `${i + 1}. ${escHtml((c.no.trim() ? c.no.trim() + ' ' : '') + (c.title.trim() || '제목 없는 회차'))}`
    parts.push(`<p><b>${head}</b></p>`)
    const meta: string[] = []
    meta.push(`${td.icon} ${escHtml(td.label)}`)
    if (c.endText.trim()) meta.push(`견인력 ${pr.score}/100`)
    if (c.rating > 0) meta.push('자체평가 ' + '★'.repeat(c.rating))
    if (c.done) meta.push('작성완료')
    parts.push('<p>' + meta.join(' · ') + '</p>')
    if (c.endText.trim()) parts.push('<p>📝 엔딩 문단: ' + escHtml(c.endText.trim()) + '</p>')
    if (c.hook.trim()) parts.push('<p>🪝 다음 화 견인 포인트: ' + escHtml(c.hook.trim()) + '</p>')
    if (c.nextSeed.trim()) parts.push('<p>➡️ 다음 화 시작 아이디어: ' + escHtml(c.nextSeed.trim()) + '</p>')
    if (c.notes.trim()) parts.push('<p>🗒️ ' + escHtml(c.notes.trim()) + '</p>')
  })
  const { issues } = analyzeFlow(list)
  parts.push('<hr>')
  if (issues.length) {
    parts.push(`<p><b>⚠️ 전체 흐름 점검 (${issues.length}건)</b></p><ul>`)
    issues.forEach((it) => {
      const tag = it.severity === 'warn' ? '🔴' : '🟡'
      const loc = it.idx >= 0 ? `[${it.idx + 1}화] ` : ''
      parts.push('<li>' + tag + ' ' + escHtml(loc) + escHtml(it.text) + '</li>')
    })
    parts.push('</ul>')
  } else if (list.length) {
    parts.push('<p>✅ 엔딩 흐름에 특별한 경고가 없습니다.</p>')
  }
  return parts.join('')
}

// ===================== 메인 컴포넌트 =====================
export default function ChapterEndDesigner({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [list, setList] = useState<Chapter[]>(init.current.list)
  const [openId, setOpenId] = useState<string | null>(init.current.openId)
  const [editing, setEditing] = useState<Chapter | null>(null)
  const [tab, setTab] = useState<'guide' | 'flow'>('guide')   // 우측 빈 상태 보조 탭
  const [guideKey, setGuideKey] = useState<EndKey>('cliff')    // 가이드 탭에서 보는 유형
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

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ list, openId } as Persisted)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [list, openId])

  function flash(msg: string) {
    if (!mounted.current) return
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { if (mounted.current) setToast('') }, 2600)
  }

  // 페이로드 시드(title/text) — 본문 끝부분을 엔딩 문단 후보로
  useEffect(() => {
    if (didSeed.current) return
    const title = typeof payload?.title === 'string' ? payload.title : ''
    const text = typeof payload?.text === 'string' ? payload.text : ''
    if (title || text) {
      didSeed.current = true
      const tail = text.trim() ? text.trim().slice(-400) : ''
      setEditing({ ...blankChapter(), id: newId(), title: title.slice(0, 80), endText: tail })
      setOpenId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startNew = () => {
    const nextNo = list.length ? guessNextNo(list[list.length - 1].no) : '1화'
    setEditing({ ...blankChapter(), id: newId(), no: nextNo }); setOpenId(null); setConfirmDel(null)
  }
  const startEdit = (c: Chapter) => { setEditing({ ...c }); setConfirmDel(null) }
  const cancelEdit = () => setEditing(null)

  const saveForm = () => {
    if (!editing) return
    const e: Chapter = { ...editing }
    if (!e.no.trim() && !e.title.trim()) e.title = '제목 없는 회차'
    if (!e.createdAt) e.createdAt = Date.now()
    setList((prev) => {
      const exists = prev.some((s) => s.id === e.id)
      return exists ? prev.map((s) => (s.id === e.id ? e : s)) : [...prev, e]
    })
    setOpenId(e.id)
    setEditing(null)
    flash('회차 엔딩을 저장했습니다.')
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

  // 드래그 순서 변경(목록 내)
  const onRowDragStart = (e: React.DragEvent, id: string) => { dragId.current = id; try { e.dataTransfer.effectAllowed = 'move' } catch { /* noop */ } }
  const onRowDragOver = (e: React.DragEvent, id: string) => {
    if (dragId.current && dragId.current !== id) { e.preventDefault(); setDragOver(id) }
  }
  const onRowDrop = (id: string) => {
    const from = dragId.current
    dragId.current = null
    setDragOver(null)
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

  // 바인더 파일 드롭(좌측 파일 → 새 회차 시드: 제목 + 본문 끝부분)
  const onPaneDragOver = (e: React.DragEvent) => { if (isItemDrag(e)) { e.preventDefault(); setDropping(true) } }
  const onPaneDragLeave = () => setDropping(false)
  const onPaneDrop = (e: React.DragEvent) => {
    setDropping(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const tail = (item.text || '').trim().slice(-400)
    setEditing({
      ...blankChapter(),
      id: newId(),
      no: list.length ? guessNextNo(list[list.length - 1].no) : '1화',
      title: item.title.slice(0, 80),
      endText: tail,
    })
    setOpenId(null)
    flash(`"${item.title}"의 본문 끝부분을 엔딩 문단 후보로 불러왔습니다.`)
  }

  const flow = useMemo(() => analyzeFlow(list), [list])
  const warnCount = flow.issues.filter((i) => i.severity === 'warn').length

  const toProject = () => {
    if (!list.length) { flash('추가할 회차가 없어요.'); return }
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '엔딩',
      title: '챕터 엔딩 설계',
      bodyHtml: buildBodyHtml(list),
      meta: { 회차수: String(list.length), 점검: flow.issues.length ? `${flow.issues.length}건` : '이상 없음', 경고: String(warnCount) },
    })
    flash(id ? '프로젝트 자료 "엔딩" 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  const opened = openId ? list.find((s) => s.id === openId) || null : null

  // ---------- styles ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', position: 'relative' }
  const topbar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex' }
  const sidebar: React.CSSProperties = { width: 256, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }
  const listWrap: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const main: React.CSSProperties = { flex: 1, minWidth: 0, overflowY: 'auto', padding: 14 }
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)' }
  const ta: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 64, lineHeight: 1.6, fontFamily: 'inherit' }
  const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 700, display: 'block', marginBottom: 4 }
  const field: React.CSSProperties = { marginBottom: 10 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }
  const card: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }
  const selS: React.CSSProperties = { ...input, cursor: 'pointer' }
  const linkbar: React.CSSProperties = { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: '8px 12px', borderTop: '1px solid var(--border)' }

  // 견인력 표시(라이브 — 편집 중 또는 상세)
  const liveText = editing ? editing.endText : opened?.endText || ''
  const liveType = editing ? editing.type : opened?.type || 'unset'
  const pull = useMemo(() => analyzePull(liveText, liveType), [liveText, liveType])

  return (
    <div style={wrap} onDragOver={onPaneDragOver} onDragLeave={onPaneDragLeave} onDrop={onPaneDrop}>
      {dropping && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '2px dashed var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: 14 }}>
          여기에 놓아 본문 끝부분을 엔딩 후보로 불러오기
        </div>
      )}

      <div style={topbar}>
        <button className="btn-primary" onClick={startNew}>＋ 회차 추가</button>
        <span style={hint}>회차 {list.length}개</span>
        <span style={{ flex: 1 }} />
        <button
          className="minibtn"
          onClick={() => { setOpenId(null); setEditing(null); setTab('flow') }}
          title="전체 엔딩 흐름·유형 다양성 점검"
          style={warnCount ? { color: 'var(--warn)', borderColor: 'var(--warn)' } : undefined}
        >
          {flow.issues.length ? emojify(`⚠️ 흐름 ${flow.issues.length}건${warnCount ? ` (경고 ${warnCount})` : ''}`) : <><Emoji e="📊" /> 흐름 점검</>}
        </button>
        <button className="minibtn" onClick={() => { setOpenId(null); setEditing(null); setTab('guide') }} title="엔딩 유형별 작법 가이드"><Emoji e="📖" /> 가이드</button>
      </div>

      <div style={body}>
        {/* 좌측: 회차 목록 */}
        <div style={sidebar}>
          <div style={listWrap}>
            {list.length === 0 ? (
              <div style={{ ...hint, textAlign: 'center', padding: '24px 8px' }}>
                아직 회차가 없어요.<br />
                <b>＋ 회차 추가</b>로 첫 화의 엔딩을 설계하거나,<br />
                좌측 바인더 파일을 이 창에 끌어다 놓으세요.<br /><br />
                <span style={{ fontSize: 11 }}>오른쪽 <b><Emoji e="📖" /> 가이드</b>에서 엔딩 유형별 작법을 먼저 살펴보세요.</span>
              </div>
            ) : list.map((c, i) => {
              const td = typeDef(c.type)
              const active = openId === c.id || editing?.id === c.id
              const pr = c.endText.trim() ? analyzePull(c.endText, c.type) : null
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
                    <span title={td.label}><Emoji e={td.icon} /></span>
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {(c.no.trim() ? c.no.trim() + ' ' : '') + (c.title.trim() || '제목 없는 회차')}
                    </span>
                    {c.done && <span title="작성 완료"><Emoji e="✅" /></span>}
                    {hasWarn && <span title="연속 동일 유형 경고"><Emoji e="🔴" /></span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{td.label}</span>
                    {pr && <PullBadge score={pr.score} band={pr.band} small />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 우측: 편집 / 상세 / 가이드 / 흐름 */}
        <div style={main}>
          {editing ? (
            <EditForm
              editing={editing}
              isNew={!list.some((s) => s.id === editing.id)}
              pull={pull}
              onChange={setEditing}
              onCancel={cancelEdit}
              onSave={saveForm}
              onApplyExample={(ex) => setEditing({ ...editing, endText: editing.endText.trim() ? editing.endText + '\n' + ex : ex })}
              styles={{ input, ta, lbl, field, hint, card, selS }}
            />
          ) : opened ? (
            <ChapterDetail
              chapter={opened}
              index={list.findIndex((s) => s.id === opened.id) + 1}
              total={list.length}
              pull={analyzePull(opened.endText, opened.type)}
              onEdit={() => startEdit(opened)}
              onMoveUp={() => move(opened.id, -1)}
              onMoveDown={() => move(opened.id, 1)}
              confirmDel={confirmDel === opened.id}
              onAskDel={() => setConfirmDel(opened.id)}
              onCancelDel={() => setConfirmDel(null)}
              onDel={() => remove(opened.id)}
              styles={{ hint, card }}
            />
          ) : tab === 'flow' ? (
            <FlowPanel list={list} flow={flow} styles={{ hint, card }} />
          ) : (
            <GuidePanel guideKey={guideKey} setGuideKey={setGuideKey} styles={{ hint, card }} />
          )}
        </div>
      </div>

      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '0 12px 6px' }}>{note}</div>}
      {toast && <div style={{ fontSize: 12, color: 'var(--ok)', padding: '0 12px 6px' }}>✓ {toast}</div>}

      {/* 연계 */}
      <div className="linkbar" style={linkbar}>
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={list.length === 0 || !hasProjectBridge()}
          title={hasProjectBridge() ? '엔딩 설계표와 흐름 점검을 프로젝트 자료 "엔딩" 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        ><Emoji e="📄" /> 프로젝트에 추가</button>
        <span style={hint}>좌측 바인더 파일을 끌어다 놓으면 본문 끝부분을 엔딩 후보로 채웁니다.</span>
      </div>
    </div>
  )
}

// 다음 회차 번호 추정("3화" → "4화", "프롤로그" → "")
function guessNextNo(prev: string): string {
  const m = prev.match(/(\d+)(\s*화|\s*장|\s*회|\s*화차)?\s*$/)
  if (m) {
    const n = parseInt(m[1], 10) + 1
    const suffix = m[2] ? m[2].trim() : ''
    return String(n) + suffix
  }
  return ''
}

// ===================== 견인력 배지 =====================
function PullBadge({ score, band, small }: { score: number; band: PullResult['band']; small?: boolean }) {
  const color = bandColor(band)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700,
      fontSize: small ? 11 : 12.5, color, border: `1px solid ${color}`, borderRadius: 999,
      padding: small ? '1px 7px' : '3px 10px', whiteSpace: 'nowrap',
    }} title={`다음 화 견인력 ${score}/100`}>
      <Emoji e="🪝" /> {score}
    </span>
  )
}

// 견인력 신호 패널(편집·상세 공용)
function PullPanel({ pull, card, hint }: { pull: PullResult; card: React.CSSProperties; hint: React.CSSProperties }) {
  const color = bandColor(pull.band)
  return (
    <div style={{ ...card, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>다음 화 견인력</div>
        <span style={{ flex: 1 }} />
        <PullBadge score={pull.score} band={pull.band} />
      </div>
      {/* 게이지 */}
      <div style={{ height: 8, borderRadius: 999, background: 'var(--border)', overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ width: `${pull.score}%`, height: '100%', background: color, transition: 'width .25s' }} />
      </div>
      <div style={{ ...hint, color, marginBottom: 8 }}>{pull.note}</div>
      {pull.charCount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {pull.signals.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, lineHeight: 1.5 }}>
              <span style={{ width: 16, flexShrink: 0, color: s.got ? 'var(--ok)' : 'var(--muted)' }}>{s.got ? '✓' : '·'}</span>
              <span style={{ flex: 1, color: s.got ? 'var(--text)' : 'var(--muted)' }}>
                {s.label}
                {!s.got && <span style={{ display: 'block', color: 'var(--muted)', fontSize: 11 }}>{s.tip}</span>}
              </span>
            </div>
          ))}
          <div style={{ ...hint, marginTop: 4 }}>문장 {pull.sentenceCount}개 · {pull.charCount}자</div>
        </div>
      )}
    </div>
  )
}

// ===================== 편집 폼 =====================
function EditForm(props: {
  editing: Chapter
  isNew: boolean
  pull: PullResult
  onChange: (c: Chapter) => void
  onCancel: () => void
  onSave: () => void
  onApplyExample: (ex: string) => void
  styles: { input: React.CSSProperties; ta: React.CSSProperties; lbl: React.CSSProperties; field: React.CSSProperties; hint: React.CSSProperties; card: React.CSSProperties; selS: React.CSSProperties }
}) {
  const { editing: e, pull } = props
  const { input, ta, lbl, field, hint, card, selS } = props.styles
  const td = typeDef(e.type)
  const upd = (patch: Partial<Chapter>) => props.onChange({ ...e, ...patch })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>{props.isNew ? '새 회차 엔딩' : '회차 엔딩 수정'}</h3>
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
          <label style={lbl}>회차 제목</label>
          <input style={input} value={e.title} maxLength={80} placeholder="예: 무너진 약속" onChange={(ev) => upd({ title: ev.target.value })} />
        </div>
      </div>

      <div style={field}>
        <label style={lbl}>엔딩 유형</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TYPES.map((t) => {
            const on = e.type === t.key
            return (
              <button
                key={t.key}
                className="minibtn"
                onClick={() => upd({ type: t.key })}
                title={t.short}
                style={on ? { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)' } : undefined}
              ><Emoji e={t.icon} /> {t.label}</button>
            )
          })}
        </div>
        {e.type !== 'unset' && <div style={{ ...hint, marginTop: 6 }}>{td.short} (평균 견인력 {emojify('🪝'.repeat(td.pull))})</div>}
      </div>

      {/* 선택 유형 가이드(접이식 요약) */}
      {e.type !== 'unset' && (
        <details style={{ ...card, marginBottom: 10 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13 }}><Emoji e={td.icon} /> {td.label} 작법 체크리스트</summary>
          <div style={{ marginTop: 8 }}>
            <div style={{ ...hint, marginBottom: 6 }}>{td.desc}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>점검</div>
            <ul style={{ margin: '0 0 8px', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {td.checklist.map((x, i) => <li key={i} style={{ fontSize: 12, lineHeight: 1.5 }}>{x}</li>)}
            </ul>
            {td.examples.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>예시 패턴(클릭해 엔딩 문단에 삽입)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {td.examples.map((ex, i) => (
                    <button key={i} className="minibtn" style={{ textAlign: 'left', fontWeight: 400, whiteSpace: 'normal', lineHeight: 1.5 }} onClick={() => props.onApplyExample(ex)}>“{ex}”</button>
                  ))}
                </div>
              </>
            )}
          </div>
        </details>
      )}

      <div style={field}>
        <label style={lbl}>엔딩 문단 <span style={{ fontWeight: 400 }}>(이 화의 마지막 단락을 붙여넣으면 견인력을 분석합니다)</span></label>
        <textarea style={{ ...ta, minHeight: 96 }} value={e.endText} placeholder="이 화의 마지막 문단을 적거나 붙여넣으세요." onChange={(ev) => upd({ endText: ev.target.value })} />
      </div>

      {/* 라이브 견인력 */}
      <div style={{ marginBottom: 10 }}>
        <PullPanel pull={pull} card={card} hint={hint} />
      </div>

      <div style={field}>
        <label style={lbl}><Emoji e="🪝" /> 다음 화 견인 포인트 <span style={{ fontWeight: 400 }}>(무엇으로 다음 화를 끌고 가나)</span></label>
        <textarea style={ta} value={e.hook} placeholder="예: 죽은 줄 알았던 인물의 등장으로 정체에 대한 의문을 남긴다." onChange={(ev) => upd({ hook: ev.target.value })} />
      </div>

      <div style={field}>
        <label style={lbl}><Emoji e="➡️" /> 다음 화 시작 아이디어 <span style={{ fontWeight: 400 }}>(이 엔딩을 곧바로 받는 시작)</span></label>
        <textarea style={ta} value={e.nextSeed} placeholder="예: 다음 화는 그 인물의 얼굴을 정면으로 비추며 시작한다." onChange={(ev) => upd({ nextSeed: ev.target.value })} />
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ flex: '1 1 160px' }}>
          <label style={lbl}>자체 평가</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className="minibtn" onClick={() => upd({ rating: e.rating === n ? 0 : n })} style={{ padding: '4px 8px', color: n <= e.rating ? 'var(--accent)' : 'var(--muted)' }} title={`${n}점`}>★</button>
            ))}
          </div>
        </div>
        <div style={{ flex: '0 0 auto', alignSelf: 'flex-end' }}>
          <label className="minibtn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: e.done ? 'var(--ok)' : 'var(--muted)' }}>
            <input type="checkbox" checked={e.done} onChange={(ev) => upd({ done: ev.target.checked })} />
            작성 완료
          </label>
        </div>
      </div>

      <div style={field}>
        <label style={lbl}><Emoji e="🗒️" /> 메모</label>
        <textarea style={ta} value={e.notes} placeholder="엔딩에 대한 자유 메모(고민·대안 등)" onChange={(ev) => upd({ notes: ev.target.value })} />
      </div>
    </div>
  )
}

// ===================== 회차 상세 =====================
function ChapterDetail(props: {
  chapter: Chapter
  index: number
  total: number
  pull: PullResult
  onEdit: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  confirmDel: boolean
  onAskDel: () => void
  onCancelDel: () => void
  onDel: () => void
  styles: { hint: React.CSSProperties; card: React.CSSProperties }
}) {
  const { chapter: c, index, total, pull } = props
  const { hint, card } = props.styles
  const td = typeDef(c.type)
  const lblS: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 700 }
  const chip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 10px', fontSize: 12.5 }
  const sec: React.CSSProperties = { marginTop: 14 }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 15, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {index}. {(c.no.trim() ? c.no.trim() + ' ' : '') + (c.title.trim() || '제목 없는 회차')}
        </h3>
        <button className="minibtn" onClick={props.onMoveUp} disabled={index <= 1} title="위로">▲</button>
        <button className="minibtn" onClick={props.onMoveDown} disabled={index >= total} title="아래로">▼</button>
        <button className="minibtn" onClick={props.onEdit}><Emoji e="✏️" /> 수정</button>
        {props.confirmDel ? (
          <>
            <button className="minibtn" style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={props.onDel}>삭제 확인</button>
            <button className="minibtn" onClick={props.onCancelDel}>취소</button>
          </>
        ) : (
          <button className="minibtn" onClick={props.onAskDel} title="삭제"><Emoji e="🗑️" /></button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={chip}><Emoji e={td.icon} /> {td.label}</span>
        {c.rating > 0 && <span style={chip}>{'★'.repeat(c.rating)}<span style={{ color: 'var(--muted)' }}>{'★'.repeat(5 - c.rating)}</span></span>}
        {c.done && <span style={{ ...chip, color: 'var(--ok)', borderColor: 'var(--ok)' }}><Emoji e="✅" /> 작성 완료</span>}
      </div>

      {c.endText.trim() ? (
        <div style={sec}>
          <PullPanel pull={pull} card={card} hint={hint} />
          <div style={{ ...sec, marginTop: 10 }}>
            <div style={lblS}><Emoji e="📝" /> 엔딩 문단</div>
            <div style={{ ...card, marginTop: 6, fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{c.endText.trim()}</div>
          </div>
        </div>
      ) : (
        <div style={{ ...sec, ...hint }}>엔딩 문단을 입력하면 다음 화 견인력을 점수로 보여 드립니다. <b><Emoji e="✏️" /> 수정</b>에서 채워 보세요.</div>
      )}

      {c.hook.trim() && (
        <div style={sec}>
          <div style={lblS}><Emoji e="🪝" /> 다음 화 견인 포인트</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, marginTop: 6, whiteSpace: 'pre-wrap' }}>{c.hook.trim()}</div>
        </div>
      )}
      {c.nextSeed.trim() && (
        <div style={sec}>
          <div style={lblS}><Emoji e="➡️" /> 다음 화 시작 아이디어</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, marginTop: 6, whiteSpace: 'pre-wrap' }}>{c.nextSeed.trim()}</div>
        </div>
      )}
      {c.notes.trim() && (
        <div style={sec}>
          <div style={lblS}><Emoji e="🗒️" /> 메모</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, marginTop: 6, whiteSpace: 'pre-wrap' }}>{c.notes.trim()}</div>
        </div>
      )}

      {/* 유형 가이드 요약 */}
      {c.type !== 'unset' && (
        <div style={{ ...sec, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div style={lblS}><Emoji e={td.icon} /> {td.label} 점검 체크리스트</div>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {td.checklist.map((x, i) => <li key={i} style={{ fontSize: 12.5, lineHeight: 1.5 }}>{x}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

// ===================== 가이드 패널 =====================
function GuidePanel({ guideKey, setGuideKey, styles }: { guideKey: EndKey; setGuideKey: (k: EndKey) => void; styles: { hint: React.CSSProperties; card: React.CSSProperties } }) {
  const { hint, card } = styles
  const td = typeDef(guideKey === 'unset' ? 'cliff' : guideKey)
  const lblS: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 4 }
  const sec: React.CSSProperties = { marginTop: 12 }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 22 }}><Emoji e="📖" /></div>
        <h3 style={{ margin: 0, fontSize: 15 }}>엔딩 유형별 작법 가이드</h3>
      </div>
      <div style={{ ...hint, marginBottom: 10 }}>연재에서 한 화의 마지막 문단은 다음 화 클릭을 결정합니다. 유형을 골라 작동 원리·체크리스트·함정·예시 패턴을 확인하세요.</div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {TYPES.map((t) => {
          const on = (guideKey === 'unset' ? 'cliff' : guideKey) === t.key
          return (
            <button key={t.key} className="minibtn" onClick={() => setGuideKey(t.key)}
              style={on ? { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)' } : undefined}
              title={t.short}><Emoji e={t.icon} /> {t.label}</button>
          )
        })}
      </div>

      <div style={{ ...card, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 20 }}><Emoji e={td.icon} /></div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{td.label}</div>
          <span style={{ flex: 1 }} />
          <span style={{ ...hint, color: 'var(--accent)' }} title="평균 견인력">견인력 {emojify('🪝'.repeat(td.pull))}{'·'.repeat(5 - td.pull)}</span>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.7, marginTop: 10 }}>{td.desc}</div>

        <div style={sec}>
          <div style={lblS}><Emoji e="⚙️" /> 작동 원리(왜 다음 화를 누르게 하나)</div>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {td.works.map((x, i) => <li key={i} style={{ fontSize: 12.5, lineHeight: 1.5 }}>{x}</li>)}
          </ul>
        </div>
        <div style={sec}>
          <div style={lblS}><Emoji e="✅" /> 점검 체크리스트</div>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {td.checklist.map((x, i) => <li key={i} style={{ fontSize: 12.5, lineHeight: 1.5 }}>{x}</li>)}
          </ul>
        </div>
        <div style={sec}>
          <div style={{ ...lblS, color: 'var(--warn)' }}><Emoji e="⚠️" /> 흔한 함정</div>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {td.pitfalls.map((x, i) => <li key={i} style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--warn)' }}>{x}</li>)}
          </ul>
        </div>
        <div style={sec}>
          <div style={lblS}><Emoji e="✍️" /> 예시 패턴(자작 — 빈칸 ___에 인물·대상을 채워 변형하세요)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
            {td.examples.map((ex, i) => (
              <div key={i} style={{ ...card, fontSize: 12.5, lineHeight: 1.6 }}>“{ex}”</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ===================== 흐름 패널 =====================
function FlowPanel({ list, flow, styles }: { list: Chapter[]; flow: { issues: FlowIssue[]; typeCount: Record<string, number> }; styles: { hint: React.CSSProperties; card: React.CSSProperties } }) {
  const { hint, card } = styles
  const lblS: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 6 }
  const sec: React.CSSProperties = { marginTop: 14 }

  if (list.length === 0) {
    return (
      <div style={{ ...hint, padding: '8px 2px', lineHeight: 1.7 }}>
        <div style={{ fontSize: 26, marginBottom: 8 }}><Emoji e="📊" /></div>
        회차를 추가하면 <b>엔딩 유형 다양성</b>과 <b>다음 화 견인력 곡선</b>, 연속 동일 유형 피로를 한눈에 점검합니다.
      </div>
    )
  }

  const total = list.length
  const used = TYPES.filter((t) => (flow.typeCount[t.key] || 0) > 0)
  const maxCount = Math.max(1, ...TYPES.map((t) => flow.typeCount[t.key] || 0), flow.typeCount['unset'] || 0)
  const scored = list.map((c) => ({ c, pr: c.endText.trim() ? analyzePull(c.endText, c.type) : null }))
  const withScore = scored.filter((s) => s.pr)
  const avg = withScore.length ? Math.round(withScore.reduce((n, s) => n + (s.pr as PullResult).score, 0) / withScore.length) : 0
  const warnCount = flow.issues.filter((i) => i.severity === 'warn').length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 22 }}><Emoji e="📊" /></div>
        <h3 style={{ margin: 0, fontSize: 15 }}>엔딩 흐름 점검</h3>
        <span style={{ flex: 1 }} />
        <span style={hint}>{total}화 · 평균 견인력 {avg}/100</span>
      </div>

      {/* 견인력 곡선(막대) */}
      <div style={{ ...card, padding: 12 }}>
        <div style={lblS}><Emoji e="🪝" /> 다음 화 견인력 곡선</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 90, marginTop: 6 }}>
          {scored.map(({ c, pr }, i) => {
            const h = pr ? Math.max(4, pr.score) : 3
            const col = pr ? bandColor(pr.band) : 'var(--border)'
            return (
              <div key={c.id} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
                title={`${i + 1}. ${(c.no.trim() ? c.no.trim() + ' ' : '') + (c.title.trim() || '제목 없는 회차')}\n${typeDef(c.type).label}${pr ? ` · 견인력 ${pr.score}` : ' · 엔딩 미입력'}`}>
                <div style={{ width: '100%', height: `${h}%`, background: col, borderRadius: '3px 3px 0 0', minHeight: 3 }} />
                <span style={{ fontSize: 9, color: 'var(--muted)' }}>{i + 1}</span>
              </div>
            )
          })}
        </div>
        <div style={{ ...hint, marginTop: 6 }}>막대 색: <span style={{ color: 'var(--ok)' }}>강함</span> · <span style={{ color: 'var(--accent)' }}>보통</span> · <span style={{ color: 'var(--warn)' }}>약함</span>. 너무 평평하면 기복을, 너무 위기만 이어지면 휴지를 고민해 보세요.</div>
      </div>

      {/* 유형 분포 */}
      <div style={{ ...card, padding: 12, ...sec }}>
        <div style={lblS}><Emoji e="🏷️" /> 엔딩 유형 분포</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          {used.length === 0 ? <div style={hint}>아직 유형이 지정된 회차가 없습니다.</div> : used.map((t) => {
            const n = flow.typeCount[t.key] || 0
            return (
              <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12.5, width: 96, flexShrink: 0 }}><Emoji e={t.icon} /> {t.label}</span>
                <div style={{ flex: 1, height: 12, background: 'var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${(n / maxCount) * 100}%`, height: '100%', background: 'var(--accent)' }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--muted)', width: 56, textAlign: 'right' }}>{n}화 ({Math.round((n / total) * 100)}%)</span>
              </div>
            )
          })}
          {(flow.typeCount['unset'] || 0) > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12.5, width: 96, flexShrink: 0, color: 'var(--muted)' }}><Emoji e="🏷️" /> 미분류</span>
              <div style={{ flex: 1, height: 12, background: 'var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ width: `${((flow.typeCount['unset'] || 0) / maxCount) * 100}%`, height: '100%', background: 'var(--muted)' }} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted)', width: 56, textAlign: 'right' }}>{flow.typeCount['unset']}화</span>
            </div>
          )}
        </div>
      </div>

      {/* 점검 결과 */}
      <div style={{ ...sec }}>
        <div style={{ ...lblS, color: flow.issues.length ? 'var(--warn)' : 'var(--ok)' }}>
          {flow.issues.length ? emojify(`⚠️ 흐름 점검 (${flow.issues.length}건${warnCount ? `, 경고 ${warnCount}` : ''})`) : emojify('✅ 엔딩 흐름에 특별한 경고가 없습니다.')}
        </div>
        {flow.issues.length > 0 && (
          <ul style={{ margin: '0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {flow.issues.map((it, k) => (
              <li key={k} style={{ fontSize: 12.5, lineHeight: 1.5, color: it.severity === 'warn' ? 'var(--warn)' : 'var(--text)' }}>
                <Emoji e={it.severity === 'warn' ? '🔴' : '🟡'} /> {it.idx >= 0 ? `[${it.idx + 1}화] ` : ''}{it.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
