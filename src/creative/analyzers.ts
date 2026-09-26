// 확장형 분석기 프레임워크 — 글쓰기 유형별(웹소설 연재/학술/블로그·SEO/에세이·논픽션/시나리오 등)
// 기능 도구를 "순수 함수 + 표준 결과 모양"으로 빠르게 추가하기 위한 공용 기반.
// 각 분석기는 AnalyzerContext 를 받아 AnalyzerResult(게이지/점수/목록/막대/구획/통계)를 반환하고,
// CreativeStudio 의 제네릭 AnalyzerPanel 이 결과 모양에 따라 렌더한다. node 단독 테스트 가능.
import type { BinderItem, Project } from '../model/types.ts'
import { sceneList, fullManuscript, type Scene } from './scenes.ts'

export type Tier = 'ok' | 'warn' | 'bad'

export interface GaugeResult {
  kind: 'gauge'
  value: number
  min?: number
  max: number
  unit?: string
  label: string
  tier?: Tier
  note?: string
}
export interface ScoreResult {
  kind: 'score'
  score: number
  max?: number
  checks: { label: string; pass: boolean; detail?: string; tier?: Tier }[]
  note?: string
}
export interface ListResult {
  kind: 'list'
  items: { text: string; sub?: string; tier?: Tier; sceneId?: string }[]
  note?: string
  empty?: string
}
export interface BarsResult {
  kind: 'bars'
  rows: { label: string; value: number; max?: number; sub?: string; tier?: Tier; sceneId?: string }[]
  note?: string
}
export interface SectionsResult {
  kind: 'sections'
  sections: { heading: string; items: string[] }[]
  note?: string
}
export interface StatResult {
  kind: 'stat'
  stats: { label: string; value: string; tier?: Tier }[]
  note?: string
}

export type AnalyzerResult = GaugeResult | ScoreResult | ListResult | BarsResult | SectionsResult | StatResult

export interface AnalyzerContext {
  project: Project
  /** 원고 장면 목록(읽기 순서). */
  scenes: Scene[]
  /** 원고 전체 평문. */
  full: string
  /** 활성 문서(없으면 null). */
  active: BinderItem | null
  /** 활성 문서 평문(없으면 원고 전체). 단일 문서 대상 분석에 사용. */
  activeText: string
}

export interface Analyzer {
  id: string
  name: string
  /** 그룹 라벨(나브 자동 그룹화). 예: '웹소설 연재', '학술', '블로그·SEO', '에세이·논픽션', '시나리오'. */
  kind: string
  intro?: string
  /** 'document' = 활성 문서 대상, 'manuscript' = 원고 전체(기본). UI 힌트용. */
  scope?: 'manuscript' | 'document'
  run: (ctx: AnalyzerContext) => AnalyzerResult
}

/** 활성 문서 id 로 AnalyzerContext 를 구성한다. */
export function buildAnalyzerContext(project: Project, activeId: string | null): AnalyzerContext {
  const scenes = sceneList(project)
  const full = fullManuscript(scenes)
  const active = activeId ? project.items[activeId] ?? null : null
  const activeText = active ? (active.plainText ?? '') : full
  return { project, scenes, full, active, activeText: activeText || full }
}
