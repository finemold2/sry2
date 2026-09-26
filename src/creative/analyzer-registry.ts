// 분석기 레지스트리 — 글쓰기 유형별 기능 분석 도구 모듈을 모은다.
import type { Analyzer } from './analyzers.ts'
import { ANALYZERS_WEBNOVEL } from './data/analyzers-webnovel.ts'
import { ANALYZERS_ACADEMIC } from './data/analyzers-academic.ts'
import { ANALYZERS_BLOG } from './data/analyzers-blog.ts'
import { ANALYZERS_ESSAY } from './data/analyzers-essay.ts'
import { ANALYZERS_SCREENPLAY } from './data/analyzers-screenplay.ts'
import { ANALYZERS_UNIVERSAL } from './data/analyzers-universal.ts'

export const ANALYZERS: Analyzer[] = [
  ...ANALYZERS_WEBNOVEL,
  ...ANALYZERS_ACADEMIC,
  ...ANALYZERS_BLOG,
  ...ANALYZERS_ESSAY,
  ...ANALYZERS_SCREENPLAY,
  ...ANALYZERS_UNIVERSAL,
]
