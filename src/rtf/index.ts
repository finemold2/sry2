// RTF 엔진 공개 API.
import { serializeRtf } from './serialize.ts'
import { parseRtf } from './parse.ts'
import { htmlToModel, modelToHtml } from './html.ts'
import { docToPlainText } from './model.ts'

export { serializeRtf, parseRtf, htmlToModel, modelToHtml }
export { emptyDoc, docToPlainText, DEFAULT_FONT } from './model.ts'
export type { RtfDoc, Block, Run, RunStyle, BlockType, Align } from './model.ts'

/** contenteditable HTML -> RTF 문자열 (저장용). */
export function htmlToRtf(html: string): string {
  return serializeRtf(htmlToModel(html))
}

/** RTF 문자열 -> contenteditable HTML (편집용). */
export function rtfToHtml(rtf: string): string {
  return modelToHtml(parseRtf(rtf || ''))
}

/** RTF 문자열 -> 순수 텍스트 (단어수/검색용). */
export function rtfToPlainText(rtf: string): string {
  return docToPlainText(parseRtf(rtf || ''))
}

/** 빈 문서의 RTF. */
export function emptyRtf(): string {
  return serializeRtf({ blocks: [{ type: 'p', runs: [] }] })
}
