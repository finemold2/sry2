// 순수 텍스트 헬퍼(외부 모듈 의존 없음 → 단위 테스트 용이). 창작 분석 도구 공용.

/** 문장 단위 분리(영/한/CJK 종결부호 기준). */
export function splitSentences(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  return clean.split(/(?<=[.!?。！？…])\s+/).filter((s) => s.trim())
}

/** 단어 토큰(유니코드 문자/숫자 시퀀스). */
export function wordTokens(text: string): string[] {
  return text.match(/[\p{L}\p{N}]+/gu) || []
}

/** 문단 분리(빈 줄/줄바꿈 기준). */
export function splitParagraphs(text: string): string[] {
  return text.split(/\n+/).map((p) => p.trim()).filter(Boolean)
}

/** 한글이 포함되어 있으면 true(언어별 분기용). */
export function hasKorean(text: string): boolean {
  return /[가-힣]/.test(text)
}

/** 영어 음절 근사(가독성 계산용). */
export function syllablesEn(w: string): number {
  w = w.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  const m = w.match(/[aeiouy]+/g)
  let n = m ? m.length : 1
  if (w.endsWith('e')) n = Math.max(1, n - 1)
  return Math.max(1, n)
}

/** 따옴표 안의 대사 구간들을 추출(여러 따옴표 스타일 지원, 근사). */
const DIALOGUE_RE = /[“"«「『](?:[^”"»」』\n]{0,800})[”"»」』]/g
export function extractDialogue(text: string): string[] {
  const out: string[] = []
  let m: RegExpExecArray | null
  DIALOGUE_RE.lastIndex = 0
  while ((m = DIALOGUE_RE.exec(text))) {
    const inner = m[0].slice(1, -1).trim()
    if (inner) out.push(inner)
  }
  return out
}

/** 공백 제외 글자 수. */
export function charsNoSpace(text: string): number {
  return text.replace(/\s/g, '').length
}
