// 데이터 기반 도구(단어 은행·생성기·가이드) 레지스트리 — 병렬 저작된 데이터 모듈을 모은다.
import type { WordBank, Generator, Guide } from './toolkit.ts'
import { WORD_BANKS_1 } from './data/wordbanks1.ts'
import { WORD_BANKS_2 } from './data/wordbanks2.ts'
import { WORD_BANKS_3 } from './data/wordbanks3.ts'
import { WORD_BANKS_4 } from './data/wordbanks4.ts'
import { WORD_BANKS_5 } from './data/wordbanks5.ts'
import { WORD_BANKS_6 } from './data/wordbanks6.ts'
import { WORD_BANKS_7 } from './data/wordbanks7.ts'
import { WORD_BANKS_8 } from './data/wordbanks8.ts'
import { GENERATORS_1 } from './data/generators1.ts'
import { GENERATORS_2 } from './data/generators2.ts'
import { GENERATORS_3 } from './data/generators3.ts'
import { GENERATORS_4 } from './data/generators4.ts'
import { GENERATORS_5 } from './data/generators5.ts'
import { GENERATORS_6 } from './data/generators6.ts'
import { GENERATORS_7 } from './data/generators7.ts'
import { GENERATORS_8 } from './data/generators8.ts'
import { GENERATORS_9 } from './data/generators9.ts'
import { GENERATORS_10 } from './data/generators10.ts'
import { GENERATORS_11 } from './data/generators11.ts'
import { GUIDES_1 } from './data/guides1.ts'
import { GUIDES_2 } from './data/guides2.ts'
import { GUIDES_3 } from './data/guides3.ts'
import { GUIDES_4 } from './data/guides4.ts'
import { GUIDES_5 } from './data/guides5.ts'
import { GUIDES_6 } from './data/guides6.ts'
import { GUIDES_7 } from './data/guides7.ts'
import { GUIDES_8 } from './data/guides8.ts'
import { GUIDES_9 } from './data/guides9.ts'
import { GUIDES_10 } from './data/guides10.ts'
import { GUIDES_11 } from './data/guides11.ts'
import { GUIDES_12 } from './data/guides12.ts'
// 작법서 기반 형식별 가이드(18개 형식, 약 432종)
import { GUIDES_CRAFT_NOVEL } from './data/guides-craft-novel.ts'
import { GUIDES_CRAFT_CHARACTER } from './data/guides-craft-character.ts'
import { GUIDES_CRAFT_PLOT } from './data/guides-craft-plot.ts'
import { GUIDES_CRAFT_SCENE } from './data/guides-craft-scene.ts'
import { GUIDES_CRAFT_STYLE } from './data/guides-craft-style.ts'
import { GUIDES_CRAFT_DESCRIPTION } from './data/guides-craft-description.ts'
import { GUIDES_CRAFT_ESSAY } from './data/guides-craft-essay.ts'
import { GUIDES_CRAFT_NONFICTION } from './data/guides-craft-nonfiction.ts'
import { GUIDES_CRAFT_EXPOSITORY } from './data/guides-craft-expository.ts'
import { GUIDES_CRAFT_PERSUASIVE } from './data/guides-craft-persuasive.ts'
import { GUIDES_CRAFT_ACADEMIC } from './data/guides-craft-academic.ts'
import { GUIDES_CRAFT_SCREENPLAY } from './data/guides-craft-screenplay.ts'
import { GUIDES_CRAFT_POETRY } from './data/guides-craft-poetry.ts'
import { GUIDES_CRAFT_BLOG } from './data/guides-craft-blog.ts'
import { GUIDES_CRAFT_JOURNALISM } from './data/guides-craft-journalism.ts'
import { GUIDES_CRAFT_COPY } from './data/guides-craft-copywriting.ts'
import { GUIDES_CRAFT_WEBNOVEL } from './data/guides-craft-webnovel.ts'
import { GUIDES_CRAFT_REVISION } from './data/guides-craft-revision.ts'

export const WORD_BANKS: WordBank[] = [...WORD_BANKS_1, ...WORD_BANKS_2, ...WORD_BANKS_3, ...WORD_BANKS_4, ...WORD_BANKS_5, ...WORD_BANKS_6, ...WORD_BANKS_7, ...WORD_BANKS_8]
export const GENERATORS: Generator[] = [...GENERATORS_1, ...GENERATORS_2, ...GENERATORS_3, ...GENERATORS_4, ...GENERATORS_5, ...GENERATORS_6, ...GENERATORS_7, ...GENERATORS_8, ...GENERATORS_9, ...GENERATORS_10, ...GENERATORS_11]
export const GUIDES: Guide[] = [
  ...GUIDES_1, ...GUIDES_2, ...GUIDES_3, ...GUIDES_4, ...GUIDES_5, ...GUIDES_6, ...GUIDES_7, ...GUIDES_8, ...GUIDES_9, ...GUIDES_10, ...GUIDES_11, ...GUIDES_12,
  ...GUIDES_CRAFT_NOVEL, ...GUIDES_CRAFT_CHARACTER, ...GUIDES_CRAFT_PLOT, ...GUIDES_CRAFT_SCENE, ...GUIDES_CRAFT_STYLE,
  ...GUIDES_CRAFT_DESCRIPTION, ...GUIDES_CRAFT_ESSAY, ...GUIDES_CRAFT_NONFICTION, ...GUIDES_CRAFT_EXPOSITORY, ...GUIDES_CRAFT_PERSUASIVE,
  ...GUIDES_CRAFT_ACADEMIC, ...GUIDES_CRAFT_SCREENPLAY, ...GUIDES_CRAFT_POETRY, ...GUIDES_CRAFT_BLOG, ...GUIDES_CRAFT_JOURNALISM,
  ...GUIDES_CRAFT_COPY, ...GUIDES_CRAFT_WEBNOVEL, ...GUIDES_CRAFT_REVISION,
]
