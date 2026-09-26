// 창작 구조/관계 분석: 등장인물 추출·이름 혼동·등장 추적·관계도(공동 등장)·코덱스 멘션·장 균형,
// 그리고 장면 메타(POV/무드/스토리시간) 시각화 데이터. 순수 함수.
import { RESEARCH_ROOT, type BinderItem, type Project } from '../model/types.ts'
import type { Scene } from './scenes'

export interface CharacterRef {
  id: string
  name: string
  aliases: string[]
  /** 매칭에 쓰는 모든 표기(name + aliases, 길이 내림차순). */
  forms: string[]
}

/** 프로젝트의 등장인물 목록(character 타입 아이템 + 별칭). */
export function charactersOf(project: Project): CharacterRef[] {
  const out: CharacterRef[] = []
  for (const it of Object.values(project.items)) {
    if (it.type !== 'character') continue
    const name = (it.title || '').trim()
    if (!name) continue
    const aliasStr = it.customMeta?.aliases || it.character?.aliases || it.character?.별칭 || ''
    const aliases = aliasStr.split(/[,，/、]/).map((s) => s.trim()).filter(Boolean)
    const forms = [name, ...aliases].filter((f) => f.length >= 1).sort((a, b) => b.length - a.length)
    out.push({ id: it.id, name, aliases, forms })
  }
  return out
}

function countName(text: string, forms: string[]): number {
  let n = 0
  for (const f of forms) {
    if (f.length < 2) continue // 1글자 이름은 오탐이 많아 제외
    let i = 0
    while ((i = text.indexOf(f, i)) !== -1) { n++; i += f.length }
  }
  return n
}

// ---------- 이름 혼동 경고 ----------
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[m][n]
}
export interface ConfusionPair { a: string; b: string; reason: string }
export function nameConfusion(chars: CharacterRef[]): ConfusionPair[] {
  const names = chars.map((c) => c.name)
  const pairs: ConfusionPair[] = []
  for (let i = 0; i < names.length; i++)
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i], b = names[j]
      if (a === b) continue
      const dist = levenshtein(a, b)
      const maxLen = Math.max(a.length, b.length)
      if (a[0] === b[0] && Math.abs(a.length - b.length) <= 1 && dist <= 2) pairs.push({ a, b, reason: '첫 글자 같고 길이·철자 유사' })
      else if (maxLen >= 3 && dist <= 1) pairs.push({ a, b, reason: '한 글자 차이' })
      else if (a.length >= 2 && b.length >= 2 && a.slice(0, 2) === b.slice(0, 2)) pairs.push({ a, b, reason: '앞 두 글자 동일' })
    }
  return pairs
}

// ---------- 등장인물 등장 추적 ----------
export interface PresenceResult {
  characters: { id: string; name: string; scenes: number[]; total: number; firstScene: number; lastScene: number; maxGap: number }[]
  sceneTitles: string[]
}
export function characterPresence(scenes: Scene[], chars: CharacterRef[]): PresenceResult {
  const sceneTitles = scenes.map((s) => s.title)
  const characters = chars.map((c) => {
    const inScenes: number[] = []
    scenes.forEach((sc, i) => { if (countName(sc.text, c.forms) > 0) inScenes.push(i) })
    let maxGap = 0
    for (let k = 1; k < inScenes.length; k++) maxGap = Math.max(maxGap, inScenes[k] - inScenes[k - 1] - 1)
    return {
      id: c.id, name: c.name, scenes: inScenes, total: inScenes.length,
      firstScene: inScenes[0] ?? -1, lastScene: inScenes[inScenes.length - 1] ?? -1, maxGap,
    }
  }).sort((a, b) => b.total - a.total)
  return { characters, sceneTitles }
}

// ---------- 관계도(공동 등장 기반) ----------
export interface RelationshipGraph {
  nodes: { id: string; name: string; weight: number }[]
  edges: { a: string; b: string; weight: number; scenes: number }[]
}
export function relationshipGraph(scenes: Scene[], chars: CharacterRef[]): RelationshipGraph {
  const present: string[][] = scenes.map((sc) => chars.filter((c) => countName(sc.text, c.forms) > 0).map((c) => c.id))
  const nodeWeight = new Map<string, number>()
  const edgeMap = new Map<string, number>()
  for (const ids of present) {
    for (const id of ids) nodeWeight.set(id, (nodeWeight.get(id) || 0) + 1)
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const key = ids[i] < ids[j] ? ids[i] + '|' + ids[j] : ids[j] + '|' + ids[i]
        edgeMap.set(key, (edgeMap.get(key) || 0) + 1)
      }
  }
  const byId = new Map(chars.map((c) => [c.id, c.name]))
  const nodes = chars.filter((c) => (nodeWeight.get(c.id) || 0) > 0).map((c) => ({ id: c.id, name: c.name, weight: nodeWeight.get(c.id) || 0 }))
  const edges = [...edgeMap.entries()].map(([key, scenes]) => {
    const [a, b] = key.split('|')
    return { a, b, weight: scenes, scenes }
  }).filter((e) => byId.has(e.a) && byId.has(e.b)).sort((a, b) => b.weight - a.weight)
  return { nodes, edges }
}

// ---------- 코덱스(세계관 사전) 멘션 ----------
// firstSceneId: 멘션이 처음 발견된 장면의 id(동명 장면 오작동 방지를 위해 제목 대신 id 로 점프).
export interface CodexEntry { id: string; name: string; type: string; mentions: number; scenes: string[]; firstSceneId: string | null }
export function codexMentions(project: Project, scenes: Scene[]): CodexEntry[] {
  const entries: { id: string; name: string; type: string }[] = []
  const collect = (rootId: string) => {
    const root = project.items[rootId]
    const walk = (id: string) => {
      const it = project.items[id]
      if (!it) return
      if (it.id !== rootId && it.title.trim()) entries.push({ id: it.id, name: it.title.trim(), type: it.type })
      it.childIds.forEach(walk)
    }
    root?.childIds.forEach(walk)
  }
  collect(RESEARCH_ROOT)
  for (const it of Object.values(project.items)) if (it.type === 'character' && !entries.find((e) => e.id === it.id)) entries.push({ id: it.id, name: it.title.trim(), type: 'character' })
  return entries
    .filter((e) => e.name.length >= 2)
    .map((e) => {
      const where: string[] = []
      let mentions = 0
      let firstSceneId: string | null = null
      for (const sc of scenes) {
        let i = 0, c = 0
        while ((i = sc.text.indexOf(e.name, i)) !== -1) { c++; i += e.name.length }
        if (c > 0) { mentions += c; where.push(sc.title); if (!firstSceneId) firstSceneId = sc.id }
      }
      return { id: e.id, name: e.name, type: e.type, mentions, scenes: where, firstSceneId }
    })
    .sort((a, b) => b.mentions - a.mentions)
}

// ---------- 장(chapter) 균형 ----------
export interface ChapterBalance {
  chapters: { id: string | null; title: string; words: number; scenes: number; tier: 'short' | 'normal' | 'long' }[]
  avg: number
}
export function chapterBalance(scenes: Scene[]): ChapterBalance {
  const map = new Map<string, { id: string | null; title: string; words: number; scenes: number }>()
  for (const sc of scenes) {
    const key = sc.chapterId || '__none__'
    const e = map.get(key) || { id: sc.chapterId, title: sc.chapterTitle, words: 0, scenes: 0 }
    e.words += sc.words || 0
    e.scenes += 1
    map.set(key, e)
  }
  const arr = [...map.values()]
  const avg = arr.length ? Math.round(arr.reduce((n, c) => n + c.words, 0) / arr.length) : 0
  const chapters = arr.map((c) => ({ ...c, tier: (avg ? (c.words < avg * 0.5 ? 'short' : c.words > avg * 1.6 ? 'long' : 'normal') : 'normal') as 'short' | 'normal' | 'long' }))
  return { chapters, avg }
}

// ---------- 장면 메타: POV / 무드 / 스토리시간 ----------
export const POV_KEY = 'pov'
export const MOOD_KEY = 'mood'
export const STORYTIME_KEY = 'storyTime'
export const GOAL_KEY = 'goal'
export const CONFLICT_KEY = 'conflict'

export interface PovResult {
  distribution: { pov: string; scenes: number; pct: number }[]
  sequence: { id: string; title: string; pov: string }[]
}
export function povDistribution(scenes: Scene[]): PovResult {
  const map = new Map<string, number>()
  const sequence = scenes.map((sc) => {
    const pov = (sc.item.customMeta?.[POV_KEY] || '').trim() || '(미지정)'
    map.set(pov, (map.get(pov) || 0) + 1)
    return { id: sc.id, title: sc.title, pov }
  })
  const total = scenes.length || 1
  const distribution = [...map.entries()].map(([pov, n]) => ({ pov, scenes: n, pct: Math.round((n / total) * 100) })).sort((a, b) => b.scenes - a.scenes)
  return { distribution, sequence }
}

export interface MoodPoint { id: string; title: string; mood: number | null; index: number }
export function emotionArc(scenes: Scene[]): MoodPoint[] {
  return scenes.map((sc, i) => {
    const raw = (sc.item.customMeta?.[MOOD_KEY] || '').trim()
    const mood = raw === '' ? null : Math.max(-5, Math.min(5, parseFloat(raw)))
    return { id: sc.id, title: sc.title, mood: Number.isNaN(mood as number) ? null : mood, index: i }
  })
}

export interface TimelineItem { id: string; title: string; storyTime: string; readingIndex: number }
export function timeline(scenes: Scene[]): { items: TimelineItem[]; outOfOrder: number } {
  const items = scenes
    .map((sc, i) => ({ id: sc.id, title: sc.title, storyTime: (sc.item.customMeta?.[STORYTIME_KEY] || '').trim(), readingIndex: i }))
    .filter((s) => s.storyTime)
  const sorted = [...items].sort((a, b) => a.storyTime.localeCompare(b.storyTime, undefined, { numeric: true }))
  let outOfOrder = 0
  for (let i = 0; i < sorted.length; i++) if (sorted[i].id !== items[i]?.id) outOfOrder++
  return { items: sorted, outOfOrder }
}

/** 장면-시퀀스(Goal/Conflict) 미작성 장면 체크. */
export interface GmcRow { id: string; title: string; goal: string; conflict: string }
export function gmcRows(scenes: Scene[]): GmcRow[] {
  return scenes.map((sc) => ({
    id: sc.id, title: sc.title,
    goal: (sc.item.customMeta?.[GOAL_KEY] || '').trim(),
    conflict: (sc.item.customMeta?.[CONFLICT_KEY] || '').trim(),
  }))
}

export function isMediaItem(it: BinderItem): boolean {
  return it.type === 'image' || it.type === 'pdf' || it.type === 'file'
}

// ---------- 플롯 그리드(Plottr/Dabble — 플롯라인 × 장면) ----------
export const PLOTLINE_KEY = 'plotlines'
export interface PlotGrid {
  plotlines: string[]
  scenes: { id: string; title: string; lines: string[] }[]
}
export function plotGrid(scenes: Scene[]): PlotGrid {
  const set = new Set<string>()
  const rows = scenes.map((sc) => {
    const lines = (sc.item.customMeta?.[PLOTLINE_KEY] || '').split(',').map((s) => s.trim()).filter(Boolean)
    lines.forEach((l) => set.add(l))
    return { id: sc.id, title: sc.title, lines }
  })
  return { plotlines: [...set], scenes: rows }
}
