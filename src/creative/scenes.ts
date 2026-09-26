// 창작 도구 공유 기반: 원고를 "장면(Scene)" 단위로 본다. 순수 텍스트 헬퍼는 ./text 에서 재export.
import { rtfToPlainText } from '../rtf'
import { DRAFT_ROOT, type BinderItem, type Project } from '../model'

export {
  splitSentences,
  wordTokens,
  splitParagraphs,
  hasKorean,
  syllablesEn,
  extractDialogue,
  charsNoSpace,
} from './text.ts'

export interface Scene {
  id: string
  title: string
  /** 평문 본문(plainText 캐시 우선). */
  text: string
  words: number
  /** 원고 읽기 순서(0부터). */
  index: number
  /** 소속 장(chapter) = 원고 루트 바로 아래 최상위 폴더. */
  chapterId: string | null
  chapterTitle: string
  item: BinderItem
}

/** 원고(Draft) 트리를 읽기 순서대로 순회해 텍스트 장면 목록을 만든다. */
export function sceneList(project: Project, onlyIncluded = false): Scene[] {
  const scenes: Scene[] = []
  const draft = project.items[DRAFT_ROOT]
  if (!draft) return scenes
  let idx = 0
  const walk = (id: string, chapterId: string | null, chapterTitle: string) => {
    const it = project.items[id]
    if (!it) return
    if (it.type === 'text') {
      if (!onlyIncluded || it.includeInCompile) {
        const text = it.plainText ?? (it.bodyRtf ? rtfToPlainText(it.bodyRtf) : '')
        scenes.push({
          id: it.id,
          title: it.title,
          text,
          words: it.wordCount,
          index: idx++,
          chapterId,
          chapterTitle,
          item: it,
        })
      }
    }
    it.childIds.forEach((c) => walk(c, chapterId, chapterTitle))
  }
  for (const cid of draft.childIds) {
    const c = project.items[cid]
    if (!c) continue
    if (c.type === 'folder') walk(cid, cid, c.title || '(제목 없는 장)')
    else walk(cid, null, '(장 없음)')
  }
  return scenes
}

/** 원고 전체 평문(읽기 순서로 이어붙임). */
export function fullManuscript(scenes: Scene[]): string {
  return scenes.map((s) => s.text).join('\n\n')
}
