import { serializeRtf } from '../src/rtf/serialize.ts'
import { parseRtf } from '../src/rtf/parse.ts'
import type { RtfDoc } from '../src/rtf/model.ts'
import { writeFileSync } from 'node:fs'

const doc: RtfDoc = {
  blocks: [
    { type: 'h1', runs: [{ text: '제1장 — 새벽', style: {} }] },
    {
      type: 'p',
      runs: [
        { text: '안녕하세요. 이것은 ', style: {} },
        { text: 'Scrivener Web', style: { bold: true, color: '#4a76d4' } },
        { text: ' 에서 만든 ', style: {} },
        { text: 'RTF', style: { italic: true } },
        { text: ' 문서입니다. 한글과 English, 이모지 🌙 가 함께 들어갑니다.', style: {} },
      ],
    },
    { type: 'p', align: 'center', runs: [{ text: '가운데 정렬된 문장.', style: { underline: true } }] },
    { type: 'blockquote', runs: [{ text: '“글쓰기는 다시 쓰기다.” — 인용 스타일', style: {} }] },
    { type: 'li-ul', listLevel: 0, runs: [{ text: '첫 번째 항목', style: {} }] },
    { type: 'li-ul', listLevel: 0, runs: [{ text: '두 번째 항목', style: { highlight: '#ffe14d' } }] },
    { type: 'li-ol', listLevel: 0, runs: [{ text: '번호 하나', style: {} }] },
    { type: 'li-ol', listLevel: 0, runs: [{ text: '번호 둘', style: {} }] },
    { type: 'p', runs: [{ text: '크고 빨간 강조 24pt', style: { fontSize: 24, color: '#db4437', bold: true } }] },
  ],
}

const rtf = serializeRtf(doc)
writeFileSync('example.rtf', rtf)
console.log('생성된 RTF 바이트:', Buffer.byteLength(rtf))
console.log('원시 한글 포함(없어야 정상):', /[가-힣]/.test(rtf))
const back = parseRtf(rtf)
console.log('블록 수:', back.blocks.length, '/ 타입:', back.blocks.map((b) => b.type).join(','))
console.log('첫 문단 텍스트:', back.blocks[1].runs.map((r) => r.text).join(''))
