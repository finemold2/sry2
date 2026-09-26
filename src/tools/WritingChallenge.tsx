// 글쓰기 제약 챌린지 — 무작위 미션(부사 금지·한 문장 한 문단·감각 3개·대화만으로·특정 단어 포함 등 60+)과
// 선택형 타이머로 제약 속 글쓰기 게임을 진행한다. 미션별 자동 점검(부사/문장수/단어수/포함어 등)으로 통과 여부를 즉시 표시.
// 자급식: react 외 import 없음. 외부 네트워크·API 키 불필요(100% 로컬). 미지원 환경에서도 throw 없이 동작.
// 영속: 통계·최근 기록은 localStorage 'sry:tool:writing-challenge' 에 자동 저장/복원. 언마운트 시 타이머 정리.
import { useState, useEffect, useRef, useMemo } from 'react'
import { Emoji } from './linkbus'

export const meta = { id: 'writing-challenge', name: '글쓰기 챌린지', icon: '🎲', group: '집중·생산성', intro: '무작위 제약 미션과 타이머로 즐기는 글쓰기 게임', w: 560, h: 540 }

const LS_KEY = 'sry:tool:writing-challenge'

// ── 자동 점검 종류 ───────────────────────────────────────────────
// 미션은 종류별 검사 함수로 통과 여부를 판단한다. check 가 null 이면 자기보고형(통과 버튼 수동).
type CheckResult = { ok: boolean; detail: string }
type Checker = (text: string, mission: Mission) => CheckResult | null

interface Mission {
  id: string
  title: string          // 미션 한 줄 설명
  hint: string           // 작성 요령
  kind: MissionKind      // 자동 점검 종류
  arg?: string | number | string[] // 점검 파라미터
}
type MissionKind =
  | 'noAdverb' | 'oneSentPerPara' | 'senses3' | 'dialogueOnly' | 'includeWord'
  | 'noWord' | 'maxWords' | 'minWords' | 'startLetter' | 'exactSentences'
  | 'noComma' | 'allQuestions' | 'palindromeWordCount' | 'noDescription'
  | 'secondPerson' | 'presentTense' | 'self' // self = 자기보고형

// ── 미션 목록 (60+) ───────────────────────────────────────────────
const MISSIONS: Mission[] = [
  // 부사·수식 제약
  { id: 'm1', title: '부사를 한 번도 쓰지 말 것 (~게/~히/~이 부사 금지)', hint: '동사와 명사의 힘으로만 묘사해 보세요.', kind: 'noAdverb' },
  { id: 'm2', title: '형용사 없이 명사와 동사로만 쓰기', hint: '"붉은 노을" 대신 "노을이 타올랐다"처럼.', kind: 'self' },
  { id: 'm3', title: '쉼표(,)를 한 번도 쓰지 말 것', hint: '짧은 문장으로 끊어 호흡을 만드세요.', kind: 'noComma' },
  // 문장 구조 제약
  { id: 'm4', title: '한 문단에 한 문장만 — 모든 문단이 단 한 문장', hint: '빈 줄로 문단을 나누고 각 문단은 한 문장.', kind: 'oneSentPerPara' },
  { id: 'm5', title: '정확히 세 문장으로 완결할 것', hint: '발단·전개·결말을 각 한 문장에 담아요.', kind: 'exactSentences', arg: 3 },
  { id: 'm6', title: '정확히 다섯 문장으로 쓸 것', hint: '한 장면을 다섯 호흡으로.', kind: 'exactSentences', arg: 5 },
  { id: 'm7', title: '모든 문장을 물음표로 끝낼 것', hint: '질문만으로 이야기를 끌어가 보세요.', kind: 'allQuestions' },
  { id: 'm8', title: '한 문장으로만 끝까지 쓸 것 (마침표 1개)', hint: '쉼표와 접속으로 길게 이어가요.', kind: 'exactSentences', arg: 1 },
  // 감각·묘사
  { id: 'm9', title: '오감 중 세 가지 감각을 모두 등장시킬 것', hint: '시각·청각·후각·미각·촉각 중 3종.', kind: 'senses3' },
  { id: 'm10', title: '시각적 묘사 없이 소리·냄새·촉감만으로', hint: '"보였다"류를 피하고 다른 감각으로.', kind: 'self' },
  { id: 'm11', title: '색깔 단어를 세 개 이상 넣을 것', hint: '빨강·파랑·노랑·검정·하양 등.', kind: 'self' },
  // 대화·시점
  { id: 'm12', title: '오직 대화(따옴표)만으로 장면을 완성할 것', hint: '큰따옴표 대사만으로 상황을 전달.', kind: 'dialogueOnly' },
  { id: 'm13', title: '2인칭("너/당신")으로 서술할 것', hint: '독자를 주인공으로 끌어들이세요.', kind: 'secondPerson' },
  { id: 'm14', title: '서술 없이 행동 묘사만으로 감정을 드러낼 것', hint: '"슬펐다" 금지, 행동으로 보여주기.', kind: 'noDescription' },
  { id: 'm15', title: '현재형으로만 서술할 것 (~한다/~이다)', hint: '과거형 어미를 피해 긴장감을 주세요.', kind: 'presentTense' },
  // 포함/금지 단어
  { id: 'm16', title: '"문"이라는 단어를 반드시 포함할 것', hint: '문이 이야기의 전환점이 되게.', kind: 'includeWord', arg: '문' },
  { id: 'm17', title: '"비"라는 단어를 반드시 포함할 것', hint: '비가 분위기를 바꾸도록.', kind: 'includeWord', arg: '비' },
  { id: 'm18', title: '"손"이라는 단어를 반드시 포함할 것', hint: '손의 움직임으로 감정을 드러내요.', kind: 'includeWord', arg: '손' },
  { id: 'm19', title: '"거울"이라는 단어를 반드시 포함할 것', hint: '거울로 반전을 만들어 보세요.', kind: 'includeWord', arg: '거울' },
  { id: 'm20', title: '"시계"라는 단어를 반드시 포함할 것', hint: '시간의 흐름을 시계로.', kind: 'includeWord', arg: '시계' },
  { id: 'm21', title: '"그러나"라는 접속어를 쓰지 말 것', hint: '대조를 다른 방식으로 표현하세요.', kind: 'noWord', arg: '그러나' },
  { id: 'm22', title: '"그리고"를 한 번도 쓰지 말 것', hint: '문장을 끊어 연결을 생략해요.', kind: 'noWord', arg: '그리고' },
  { id: 'm23', title: '"매우/너무/정말" 강조어를 모두 금지', hint: '구체적 묘사로 강도를 표현.', kind: 'noWord', arg: ['매우', '너무', '정말'] },
  { id: 'm24', title: '"것" 의존명사를 쓰지 말 것', hint: '"~하는 것" 대신 동사로 바로.', kind: 'noWord', arg: '것' },
  // 분량 제약
  { id: 'm25', title: '50단어 이내로 한 장면을 완성할 것', hint: '군더더기를 모두 덜어내세요.', kind: 'maxWords', arg: 50 },
  { id: 'm26', title: '30단어 이내 초미니 장면', hint: '단 하나의 순간만 포착.', kind: 'maxWords', arg: 30 },
  { id: 'm27', title: '100단어 이상으로 충분히 펼칠 것', hint: '한 장면을 깊게 확장하세요.', kind: 'minWords', arg: 100 },
  { id: 'm28', title: '딱 6단어로 이야기를 완성할 것', hint: '헤밍웨이식 초단편에 도전.', kind: 'self' },
  // 첫 글자/형식
  { id: 'm29', title: '"오늘"이라는 단어로 시작할 것', hint: '시작 단어가 시점을 잡아줘요.', kind: 'startLetter', arg: '오늘' },
  { id: 'm30', title: '"만약"이라는 단어로 시작할 것', hint: '가정으로 이야기를 열어요.', kind: 'startLetter', arg: '만약' },
  { id: 'm31', title: '의성어·의태어를 세 개 이상 넣을 것', hint: '쿵·살랑·반짝처럼 생생하게.', kind: 'self' },
  { id: 'm32', title: '모든 문장을 같은 단어로 시작할 것', hint: '반복으로 리듬을 만들어요.', kind: 'self' },
  // 추가 미션들
  { id: 'm33', title: '숫자(아라비아)를 쓰지 말 것 — 한글로만', hint: '"3" 대신 "셋".', kind: 'self' },
  { id: 'm34', title: '고유명사(이름) 없이 인물을 그릴 것', hint: '"그", "여자", "노인"처럼.', kind: 'self' },
  { id: 'm35', title: '"사랑"이라는 단어 없이 사랑을 묘사할 것', hint: '행동과 시선으로 보여주기.', kind: 'noWord', arg: '사랑' },
  { id: 'm36', title: '"죽음"이라는 단어 없이 상실을 그릴 것', hint: '빈자리와 침묵으로.', kind: 'noWord', arg: '죽음' },
  { id: 'm37', title: '냄새로 시작해 냄새로 끝낼 것', hint: '후각이 이야기를 감싸도록.', kind: 'self' },
  { id: 'm38', title: '문장마다 점점 짧아지게 쓸 것', hint: '긴 문장 → 짧은 문장으로 긴장 고조.', kind: 'self' },
  { id: 'm39', title: '문장마다 점점 길어지게 쓸 것', hint: '짧게 시작해 점점 확장.', kind: 'self' },
  { id: 'm40', title: '같은 문장으로 시작하고 끝낼 것 (수미상관)', hint: '첫 문장을 마지막에 다시.', kind: 'self' },
  { id: 'm41', title: '"창문"을 반드시 포함할 것', hint: '안과 밖의 경계로.', kind: 'includeWord', arg: '창문' },
  { id: 'm42', title: '"길"을 반드시 포함할 것', hint: '여정·선택의 은유로.', kind: 'includeWord', arg: '길' },
  { id: 'm43', title: '"불"을 반드시 포함할 것', hint: '온기 혹은 파괴로.', kind: 'includeWord', arg: '불' },
  { id: 'm44', title: '"바다"를 반드시 포함할 것', hint: '광활함·깊이의 상징으로.', kind: 'includeWord', arg: '바다' },
  { id: 'm45', title: '"눈(雪)"을 반드시 포함할 것', hint: '고요·소멸의 이미지로.', kind: 'includeWord', arg: '눈' },
  { id: 'm46', title: '"이름"을 반드시 포함할 것', hint: '호명이 관계를 만든다.', kind: 'includeWord', arg: '이름' },
  { id: 'm47', title: '비유(은유·직유)를 두 개 이상 넣을 것', hint: '"~처럼", "~같다"를 활용.', kind: 'self' },
  { id: 'm48', title: '대화 없이 인물의 생각만으로 채울 것', hint: '내면 독백으로 전개.', kind: 'self' },
  { id: 'm49', title: '한 가지 색만 반복해 분위기를 만들 것', hint: '단색의 일관된 톤으로.', kind: 'self' },
  { id: 'm50', title: '시간 역순으로 서술할 것 (결말 → 시작)', hint: '끝을 먼저 보여주고 거슬러 올라가요.', kind: 'self' },
  { id: 'm51', title: '날씨로 인물의 감정을 대신할 것', hint: '맑음·폭풍 등으로 마음을 비춰요.', kind: 'self' },
  { id: 'm52', title: '"행복"이라는 단어 없이 기쁨을 그릴 것', hint: '웃음·온기의 디테일로.', kind: 'noWord', arg: '행복' },
  { id: 'm53', title: '한 사물의 시점으로 서술할 것', hint: '의자·동전 등 사물의 눈으로.', kind: 'self' },
  { id: 'm54', title: '소리만으로 한 장면을 묘사할 것', hint: '청각 디테일에 집중.', kind: 'self' },
  { id: 'm55', title: '40단어 이내 + "밤"을 포함할 것', hint: '짧고 어두운 한 장면.', kind: 'includeWord', arg: '밤' },
  { id: 'm56', title: '문장 끝을 모두 명사로 마칠 것 (명사형 종결)', hint: '"~하기", "~함"처럼 응축.', kind: 'self' },
  { id: 'm57', title: '느낌표를 한 번도 쓰지 말 것', hint: '절제로 감정의 무게를.', kind: 'noWord', arg: '!' },
  { id: 'm58', title: '"그녀/그"를 쓰지 말 것 (대명사 금지)', hint: '구체적 호칭이나 행위로.', kind: 'noWord', arg: ['그녀', '그가', '그는', '그를'] },
  { id: 'm59', title: '첫 문장에 모든 등장인물을 등장시킬 것', hint: '오프닝에 인물을 모두 배치.', kind: 'self' },
  { id: 'm60', title: '"끝"이라는 단어로 끝맺을 것', hint: '마지막 단어로 여운을.', kind: 'self' },
  { id: 'm61', title: '두 사람의 대화만으로 갈등을 드러낼 것', hint: '대사 속에 긴장을 숨겨요.', kind: 'dialogueOnly' },
  { id: 'm62', title: '"기억"을 반드시 포함할 것', hint: '과거의 한 조각으로.', kind: 'includeWord', arg: '기억' },
  { id: 'm63', title: '한 문단으로만 (줄바꿈 금지) 끝까지 쓸 것', hint: '의식의 흐름처럼 한 덩어리로.', kind: 'self' },
]

// ── 텍스트 분석 유틸 ───────────────────────────────────────────────
function wordCount(t: string): number {
  const s = t.trim()
  if (!s) return 0
  return s.split(/\s+/).filter(Boolean).length
}
function sentenceCount(t: string): number {
  const s = t.trim()
  if (!s) return 0
  // 종결부호 기준 분할(연속 부호는 하나로)
  const parts = s.split(/[.!?。！？…]+/).map((x) => x.trim()).filter(Boolean)
  return parts.length || (s ? 1 : 0)
}
function sentences(t: string): string[] {
  const s = t.trim()
  if (!s) return []
  return s.split(/(?<=[.!?。！？…])\s+/).map((x) => x.trim()).filter(Boolean)
}

// 한국어 부사 근사 탐지: '~게', '~히', '~이' 로 끝나는 일부 + 흔한 부사 목록.
const COMMON_ADVERBS = ['매우', '너무', '정말', '아주', '몹시', '굉장히', '엄청', '완전', '무척', '대단히', '자주', '항상', '늘', '결코', '절대', '그냥', '천천히', '빨리', '조용히', '가만히', '문득', '갑자기', '서서히', '점점', '이내', '곧', '이미', '벌써', '아직', '다시', '함께', '잠시', '한참', '오래', '계속', '여전히']
function detectAdverbs(t: string): string[] {
  const tokens = t.replace(/[^가-힣\s]/g, ' ').split(/\s+/).filter(Boolean)
  const found = new Set<string>()
  for (const w of tokens) {
    if (COMMON_ADVERBS.includes(w)) { found.add(w); continue }
    // ~게/~히 로 끝나면 부사로 추정(2자 이상). ~이 는 오탐 많아 제외.
    if (w.length >= 2 && /(게|히)$/.test(w)) found.add(w)
  }
  return Array.from(found)
}

// 오감 키워드(근사)
const SENSE_GROUPS: Record<string, string[]> = {
  시각: ['보', '빛', '색', '눈', '바라', '반짝', '어둠', '밝', '붉', '푸르', '하얗', '검'],
  청각: ['소리', '들', '울', '쿵', '속삭', '외', '메아리', '고요', '침묵', '째깍', '바스락'],
  후각: ['냄새', '향', '내음', '비린', '구수', '향기', '악취'],
  미각: ['맛', '달', '쓴', '신', '짠', '매', '씁쓸', '달콤'],
  촉각: ['차갑', '뜨겁', '따뜻', '부드', '거칠', '촉', '닿', '쓰다듬', '아프', '간지'],
}
function detectSenses(t: string): string[] {
  const found: string[] = []
  for (const [sense, keys] of Object.entries(SENSE_GROUPS)) {
    if (keys.some((k) => t.includes(k))) found.push(sense)
  }
  return found
}

function hasPresentTense(t: string): boolean {
  // 현재형 종결 어미 근사: ~ㄴ다/는다/한다/이다/된다 로 끝나는 문장 비율로 판단
  const sents = sentences(t)
  if (sents.length === 0) return false
  const present = sents.filter((s) => /(ㄴ다|는다|한다|이다|된다|간다|온다|진다|난다)[.!?…]*$/.test(s.replace(/\s+$/, '')))
  return present.length >= Math.ceil(sents.length * 0.6)
}
function hasPastTense(t: string): boolean {
  const sents = sentences(t)
  return sents.some((s) => /(었다|았다|였다|했다|됐다|왔다|갔다|졌다)[.!?…]*$/.test(s.replace(/\s+$/, '')))
}

// ── 미션별 자동 점검 ───────────────────────────────────────────────
const CHECKERS: Record<MissionKind, Checker> = {
  noAdverb: (t) => {
    const adv = detectAdverbs(t)
    return adv.length === 0
      ? { ok: true, detail: '부사가 발견되지 않았습니다.' }
      : { ok: false, detail: `부사 추정 ${adv.length}개: ${adv.slice(0, 6).join(', ')}${adv.length > 6 ? '…' : ''}` }
  },
  oneSentPerPara: (t) => {
    const paras = t.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean)
    if (paras.length === 0) return { ok: false, detail: '아직 작성된 문단이 없습니다.' }
    const bad = paras.filter((p) => sentenceCount(p) !== 1)
    return bad.length === 0
      ? { ok: true, detail: `모든 문단(${paras.length})이 한 문장입니다.` }
      : { ok: false, detail: `한 문장이 아닌 문단 ${bad.length}개` }
  },
  senses3: (t) => {
    const s = detectSenses(t)
    return s.length >= 3
      ? { ok: true, detail: `감각 ${s.length}종 감지: ${s.join(', ')}` }
      : { ok: false, detail: `감각 ${s.length}종 (필요 3종)${s.length ? ': ' + s.join(', ') : ''}` }
  },
  dialogueOnly: (t) => {
    const trimmed = t.trim()
    if (!trimmed) return { ok: false, detail: '대화를 입력하세요.' }
    // 큰따옴표 안의 내용을 제거한 뒤 의미 있는 글자가 남으면 서술이 있는 것으로 본다.
    const stripped = trimmed.replace(/[“"][^”"]*[”"]/g, '').replace(/[\s.,!?…\-—~’'·]/g, '')
    const hasQuote = /[“"][^”"]*[”"]/.test(trimmed)
    if (!hasQuote) return { ok: false, detail: '큰따옴표 대화가 없습니다.' }
    return stripped.length === 0
      ? { ok: true, detail: '대화(따옴표)만으로 구성되었습니다.' }
      : { ok: false, detail: `대화 밖 서술 ${stripped.length}자 감지` }
  },
  includeWord: (t, m) => {
    const w = String(m.arg)
    return t.includes(w)
      ? { ok: true, detail: `"${w}" 포함됨` }
      : { ok: false, detail: `"${w}"가 아직 없습니다.` }
  },
  noWord: (t, m) => {
    const list = Array.isArray(m.arg) ? m.arg : [String(m.arg)]
    const hit = list.filter((w) => t.includes(w))
    return hit.length === 0
      ? { ok: true, detail: `금지어(${list.join('/')}) 없음` }
      : { ok: false, detail: `금지어 사용: ${hit.join(', ')}` }
  },
  maxWords: (t, m) => {
    const n = wordCount(t); const lim = Number(m.arg)
    return n <= lim
      ? { ok: true, detail: `${n}단어 / 최대 ${lim}` }
      : { ok: false, detail: `${n}단어 — ${n - lim}단어 초과 (최대 ${lim})` }
  },
  minWords: (t, m) => {
    const n = wordCount(t); const lim = Number(m.arg)
    return n >= lim
      ? { ok: true, detail: `${n}단어 / 최소 ${lim}` }
      : { ok: false, detail: `${n}단어 — ${lim - n}단어 부족 (최소 ${lim})` }
  },
  startLetter: (t, m) => {
    const w = String(m.arg)
    return t.trim().startsWith(w)
      ? { ok: true, detail: `"${w}"로 시작함` }
      : { ok: false, detail: `"${w}"로 시작해야 합니다.` }
  },
  exactSentences: (t, m) => {
    const n = sentenceCount(t); const target = Number(m.arg)
    return n === target
      ? { ok: true, detail: `정확히 ${target}문장` }
      : { ok: false, detail: `현재 ${n}문장 (목표 ${target})` }
  },
  noComma: (t) => {
    const cnt = (t.match(/[,，]/g) || []).length
    return cnt === 0
      ? { ok: true, detail: '쉼표 없음' }
      : { ok: false, detail: `쉼표 ${cnt}개 사용됨` }
  },
  allQuestions: (t) => {
    const sents = sentences(t)
    if (sents.length === 0) return { ok: false, detail: '문장을 입력하세요.' }
    const bad = sents.filter((s) => !/[?？]\s*$/.test(s))
    return bad.length === 0
      ? { ok: true, detail: `모든 문장(${sents.length})이 물음표로 끝남` }
      : { ok: false, detail: `물음표로 안 끝난 문장 ${bad.length}개` }
  },
  palindromeWordCount: () => null,
  noDescription: (t) => {
    // 감정 직접 서술어 사용 여부만 경고(통과는 자기 판단). 근사 검사.
    const emo = ['슬펐', '기뻤', '화났', '행복', '두려웠', '무서웠', '외로웠', '설렜', '분노', '절망']
    const hit = emo.filter((w) => t.includes(w))
    return hit.length === 0
      ? { ok: true, detail: '감정 직접 서술이 보이지 않습니다.' }
      : { ok: false, detail: `감정 직접 서술: ${hit.join(', ')}` }
  },
  secondPerson: (t) => {
    const ok = /(너|당신|그대)/.test(t)
    return ok
      ? { ok: true, detail: '2인칭 시점 감지' }
      : { ok: false, detail: '"너/당신/그대"가 보이지 않습니다.' }
  },
  presentTense: (t) => {
    if (!t.trim()) return { ok: false, detail: '문장을 입력하세요.' }
    if (hasPastTense(t)) return { ok: false, detail: '과거형 어미(~었다/했다 등)가 감지됨' }
    return hasPresentTense(t)
      ? { ok: true, detail: '현재형 서술로 보입니다.' }
      : { ok: false, detail: '현재형 종결(~한다/이다)이 부족합니다.' }
  },
  self: () => null, // 자기보고형
}

// ── 영속 상태 ───────────────────────────────────────────────
interface Persisted {
  cleared: number    // 누적 클리어 수
  attempts: number   // 누적 시도(다음 미션) 수
  best: number       // 최고 연속 클리어
  lastMissionId?: string
}
const DEFAULT_STATE: Persisted = { cleared: 0, attempts: 0, best: 0 }
function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { ...DEFAULT_STATE }
    const p = JSON.parse(raw)
    return {
      cleared: Number.isFinite(p?.cleared) ? p.cleared : 0,
      attempts: Number.isFinite(p?.attempts) ? p.attempts : 0,
      best: Number.isFinite(p?.best) ? p.best : 0,
      lastMissionId: typeof p?.lastMissionId === 'string' ? p.lastMissionId : undefined,
    }
  } catch { return { ...DEFAULT_STATE } }
}
function saveState(s: Persisted) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)) } catch { /* 저장 불가 환경 graceful */ }
}

const TIMER_OPTIONS = [0, 60, 180, 300, 600] // 초 (0=없음)
function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60); const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function pickRandom(excludeId?: string): Mission {
  if (MISSIONS.length === 1) return MISSIONS[0]
  let m = MISSIONS[Math.floor(Math.random() * MISSIONS.length)]
  let guard = 0
  while (excludeId && m.id === excludeId && guard++ < 20) {
    m = MISSIONS[Math.floor(Math.random() * MISSIONS.length)]
  }
  return m
}

export default function WritingChallenge() {
  const [persist, setPersist] = useState<Persisted>(() => loadState())
  const [streak, setStreak] = useState(0) // 이번 세션 연속 클리어
  const [mission, setMission] = useState<Mission>(() => {
    const init = loadState()
    const found = init.lastMissionId ? MISSIONS.find((m) => m.id === init.lastMissionId) : undefined
    return found || pickRandom()
  })
  const [text, setText] = useState('')
  const [timerSel, setTimerSel] = useState(0) // 선택된 타이머 길이(초)
  const [remain, setRemain] = useState(0)     // 남은 초
  const [running, setRunning] = useState(false)
  const [timeUp, setTimeUp] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selfDone, setSelfDone] = useState(false) // 자기보고형 통과 표시
  const [cleared, setCleared] = useState(false)    // 이번 미션 클리어 처리됨

  const timerRef = useRef<number | null>(null)
  const copyRef = useRef<number | null>(null)
  // 경쟁상태 방지용 nonce: 미션 전환 시 증가시켜 옛 타이머 콜백 무효화.
  const nonceRef = useRef(0)

  const clearTimer = () => {
    if (timerRef.current !== null) { clearInterval(timerRef.current); timerRef.current = null }
  }

  // 타이머 진행
  useEffect(() => {
    if (!running) { clearTimer(); return }
    const myNonce = nonceRef.current
    timerRef.current = window.setInterval(() => {
      if (myNonce !== nonceRef.current) return // 옛 콜백 무효
      setRemain((prev) => {
        if (prev <= 1) {
          clearTimer()
          setRunning(false)
          setTimeUp(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return clearTimer
  }, [running])

  // 언마운트 정리(타이머·복사 타이머)
  useEffect(() => () => {
    if (timerRef.current !== null) clearInterval(timerRef.current)
    if (copyRef.current !== null) clearTimeout(copyRef.current)
  }, [])

  // 영속 저장
  useEffect(() => { saveState(persist) }, [persist])

  // 자동 점검 결과
  const check = useMemo<CheckResult | null>(() => {
    try { return CHECKERS[mission.kind](text, mission) } catch { return null }
  }, [text, mission])

  const isSelfReport = check === null // 자동 점검 불가 → 자기보고형
  const passed = isSelfReport ? selfDone : !!check?.ok && text.trim().length > 0

  // 미션 통과 시 1회 클리어 집계
  useEffect(() => {
    if (passed && !cleared) {
      setCleared(true)
      setStreak((s) => {
        const ns = s + 1
        setPersist((p) => ({ ...p, cleared: p.cleared + 1, best: Math.max(p.best, ns), lastMissionId: mission.id }))
        return ns
      })
    }
  }, [passed, cleared, mission.id])

  const wc = wordCount(text)
  const sc = sentenceCount(text)

  const startTimer = () => {
    if (timerSel <= 0) return
    nonceRef.current += 1
    setRemain(timerSel)
    setTimeUp(false)
    setRunning(true)
  }
  const stopTimer = () => {
    nonceRef.current += 1
    clearTimer()
    setRunning(false)
  }

  const nextMission = () => {
    nonceRef.current += 1
    clearTimer()
    setRunning(false)
    setRemain(0)
    setTimeUp(false)
    setText('')
    setSelfDone(false)
    setCleared(false)
    setStreak(0) // 새 미션 시작 → 이번 세션 연속 초기화
    const m = pickRandom(mission.id)
    setMission(m)
    setPersist((p) => ({ ...p, attempts: p.attempts + 1, lastMissionId: m.id }))
  }

  const doCopy = async () => {
    const out = `[글쓰기 챌린지]\n미션: ${mission.title}\n\n${text.trim()}`
    if (!text.trim()) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(out)
      } else {
        const ta = document.createElement('textarea')
        ta.value = out; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select()
        try { document.execCommand('copy') } catch { /* graceful */ }
        document.body.removeChild(ta)
      }
      setCopied(true)
      if (copyRef.current !== null) clearTimeout(copyRef.current)
      copyRef.current = window.setTimeout(() => setCopied(false), 1400)
    } catch { setCopied(false) }
  }

  const resetStats = () => {
    setPersist({ ...DEFAULT_STATE })
    setStreak(0)
  }

  // ── 스타일 ───────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const topBar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
  const statPill: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap' }
  const missionCard: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderLeft: '4px solid var(--accent)', borderRadius: 10, padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 5 }
  const missionTitle: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.4 }
  const missionHint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const ctrlRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }
  const taStyle: React.CSSProperties = {
    flex: 1, minHeight: 90, resize: 'none', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: `1px solid ${passed ? 'var(--ok)' : 'var(--border)'}`,
    borderRadius: 10, padding: '11px 13px', fontSize: 15, lineHeight: 1.7, outline: 'none', fontFamily: 'inherit',
  }
  const scroll: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden', flex: 1, minHeight: 0 }
  const timerBox = (active: boolean): React.CSSProperties => ({
    fontSize: 12, padding: '4px 10px', borderRadius: 999, cursor: 'pointer', userSelect: 'none',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'var(--chrome-2)',
    color: active ? 'var(--paper)' : 'var(--text)', whiteSpace: 'nowrap',
  })
  const statusBar = (ok: boolean | null): React.CSSProperties => ({
    fontSize: 12.5, padding: '8px 11px', borderRadius: 9, lineHeight: 1.45,
    border: `1px solid ${ok === true ? 'var(--ok)' : ok === false ? 'var(--warn)' : 'var(--border)'}`,
    background: 'var(--paper)',
    color: ok === true ? 'var(--ok)' : ok === false ? 'var(--warn)' : 'var(--muted)',
    display: 'flex', alignItems: 'center', gap: 8,
  })
  const metaRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, fontSize: 11.5, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }

  const timeLow = running && remain <= 10
  const timerDisplayColor = timeUp ? 'var(--warn)' : timeLow ? 'var(--warn)' : running ? 'var(--accent)' : 'var(--muted)'

  return (
    <div style={wrap}>
      {/* 상단 통계 */}
      <div style={topBar}>
        <span style={{ fontSize: 13, fontWeight: 700 }}><Emoji e="🎲" /> 글쓰기 챌린지</span>
        <span style={{ flex: 1 }} />
        <span style={statPill}>이번 연속 {streak}</span>
        <span style={statPill}>최고 {persist.best}</span>
        <span style={statPill}>누적 클리어 {persist.cleared}</span>
      </div>

      {/* 미션 카드 */}
      <div style={missionCard}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 6, padding: '1px 6px', whiteSpace: 'nowrap', marginTop: 2 }}>미션</span>
          <span style={missionTitle}>{mission.title}</span>
        </div>
        <div style={missionHint}><Emoji e="💡" /> {mission.hint}</div>
      </div>

      {/* 컨트롤: 타이머 선택 + 다른 미션 */}
      <div style={ctrlRow}>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>타이머</span>
        {TIMER_OPTIONS.map((t) => (
          <span
            key={t}
            role="button"
            tabIndex={0}
            style={timerBox(timerSel === t)}
            onClick={() => { if (!running) setTimerSel(t) }}
            title={running ? '진행 중에는 변경 불가' : ''}
          >
            {t === 0 ? '없음' : `${t / 60}분`}
          </span>
        ))}
        <span style={{ flex: 1 }} />
        {!running ? (
          <button className="minibtn" onClick={startTimer} disabled={timerSel <= 0} type="button">▶ 타이머</button>
        ) : (
          <button className="minibtn" onClick={stopTimer} type="button"><Emoji e="⏹" /> 정지</button>
        )}
        <button className="minibtn" onClick={nextMission} type="button"><Emoji e="🎲" /> 다른 미션</button>
      </div>

      {/* 타이머 표시 */}
      {(running || timeUp || (timerSel > 0 && remain > 0)) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: timerDisplayColor, fontVariantNumeric: 'tabular-nums' }}>
            <Emoji e="⏱" /> {fmtTime(running || remain > 0 ? remain : (timeUp ? 0 : timerSel))}
          </span>
          {timeUp && <span style={{ fontSize: 12.5, color: 'var(--warn)', fontWeight: 700 }}>시간 종료! 펜을 멈춰도 좋아요.</span>}
          {running && remain > 0 && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>제약 속에서 자유롭게 써 내려가세요.</span>}
        </div>
      )}

      <div style={scroll}>
        <textarea
          style={taStyle}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="여기에 미션에 맞춰 글을 써 보세요…"
          spellCheck={false}
          aria-label="글쓰기 챌린지 입력"
        />

        {/* 자동 점검 / 자기보고 */}
        {isSelfReport ? (
          <div style={statusBar(selfDone ? true : null)}>
            <span>{selfDone ? <Emoji e="✅" /> : <Emoji e="📝" />}</span>
            <span style={{ flex: 1 }}>
              {selfDone ? '미션 완료로 표시했습니다. 멋져요!' : '이 미션은 자동 채점 대상이 아니에요. 완성했다면 직접 완료를 눌러주세요.'}
            </span>
            <button
              className={selfDone ? 'minibtn' : 'btn-primary'}
              onClick={() => setSelfDone((v) => !v)}
              disabled={!selfDone && text.trim().length === 0}
              type="button"
            >
              {selfDone ? '취소' : '완료 표시'}
            </button>
          </div>
        ) : (
          <div style={statusBar(text.trim().length === 0 ? null : !!check?.ok)}>
            <span>{text.trim().length === 0 ? <Emoji e="⏳" /> : check?.ok ? <Emoji e="✅" /> : <Emoji e="⚠️" />}</span>
            <span style={{ flex: 1 }}>
              {text.trim().length === 0 ? '작성을 시작하면 미션 달성 여부를 실시간으로 확인해 드려요.' : (check?.detail || '점검할 수 없는 미션입니다.')}
            </span>
            {check?.ok && <span style={{ fontWeight: 700 }}>달성!</span>}
          </div>
        )}

        {/* 메타 + 액션 */}
        <div style={metaRow}>
          <span>{wc} 단어</span>
          <span>·</span>
          <span>{sc} 문장</span>
          <span>·</span>
          <span>{text.replace(/\s/g, '').length} 자</span>
          <span style={{ flex: 1 }} />
          <button className="minibtn" onClick={() => setText('')} disabled={!text} type="button">지우기</button>
          <button className="btn-primary" onClick={doCopy} disabled={!text.trim()} type="button">{copied ? '복사됨 ✓' : '복사'}</button>
        </div>

        {persist.cleared > 0 && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ flex: 1 }} />
            <button className="minibtn" onClick={resetStats} type="button" style={{ fontSize: 11 }}>통계 초기화</button>
          </div>
        )}
      </div>
    </div>
  )
}
