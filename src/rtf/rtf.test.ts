// RTF 엔진 라운드트립 테스트. 실행: node --experimental-strip-types src/rtf/rtf.test.ts
import type { Block, RtfDoc } from './model.ts'
import { serializeRtf } from './serialize.ts'
import { parseRtf } from './parse.ts'
import { modelToHtml } from './html.ts'

let pass = 0
let fail = 0
function ok(cond: boolean, msg: string) {
  if (cond) {
    pass++
  } else {
    fail++
    console.error('  ✗ FAIL: ' + msg)
  }
}
function eq(a: unknown, b: unknown, msg: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`)
}

function blockText(b: Block): string {
  return b.runs.map((r) => r.text).join('')
}

function roundTrip(doc: RtfDoc): RtfDoc {
  const rtf = serializeRtf(doc)
  return parseRtf(rtf)
}

// 1) 한글 + 영어 + 이모지 + 특수문자
{
  const doc: RtfDoc = {
    blocks: [
      { type: 'p', runs: [{ text: '안녕하세요 Hello 世界 😀 {중괄호} \\백슬래시', style: {} }] },
    ],
  }
  const rtf = serializeRtf(doc)
  ok(rtf.includes('\\u'), '한글이 유니코드 이스케이프로 인코딩됨')
  ok(!/[가-힣]/.test(rtf), 'RTF 출력에 원시 한글 바이트가 없음(모두 \\uN)')
  ok(rtf.includes('\\{') && rtf.includes('\\}'), '중괄호 이스케이프')
  ok(rtf.includes('\\\\'), '백슬래시 이스케이프')
  const back = parseRtf(rtf)
  eq(blockText(back.blocks[0]), '안녕하세요 Hello 世界 😀 {중괄호} \\백슬래시', '한글/이모지/특수문자 왕복')
}

// 2) 문자 서식: 굵게/기울임/밑줄/취소선
{
  const doc: RtfDoc = {
    blocks: [
      {
        type: 'p',
        runs: [
          { text: '보통 ', style: {} },
          { text: '굵게', style: { bold: true } },
          { text: ' ', style: {} },
          { text: '기울임', style: { italic: true } },
          { text: ' ', style: {} },
          { text: '밑줄', style: { underline: true } },
          { text: ' ', style: { strike: true } },
        ],
      },
    ],
  }
  const back = roundTrip(doc)
  eq(blockText(back.blocks[0]), '보통 굵게 기울임 밑줄 ', '서식 텍스트 왕복')
  const findRun = (t: string) => back.blocks[0].runs.find((r) => r.text === t)
  ok(!!findRun('굵게')?.style.bold, '굵게 보존')
  ok(!!findRun('기울임')?.style.italic, '기울임 보존')
  ok(!!findRun('밑줄')?.style.underline, '밑줄 보존')
}

// 3) 헤딩
{
  const doc: RtfDoc = {
    blocks: [
      { type: 'h1', runs: [{ text: '제목 1', style: {} }] },
      { type: 'h2', runs: [{ text: '제목 2', style: {} }] },
      { type: 'p', runs: [{ text: '본문', style: {} }] },
    ],
  }
  const back = roundTrip(doc)
  eq(back.blocks.map((b) => b.type), ['h1', 'h2', 'p'], '헤딩 레벨 보존')
  eq(back.blocks.map(blockText), ['제목 1', '제목 2', '본문'], '헤딩 텍스트 보존')
}

// 4) 정렬
{
  const doc: RtfDoc = {
    blocks: [
      { type: 'p', align: 'center', runs: [{ text: '가운데', style: {} }] },
      { type: 'p', align: 'right', runs: [{ text: '오른쪽', style: {} }] },
      { type: 'p', align: 'justify', runs: [{ text: '양쪽', style: {} }] },
    ],
  }
  const back = roundTrip(doc)
  eq(back.blocks.map((b) => b.align), ['center', 'right', 'justify'], '정렬 보존')
}

// 5) 색상 + 글자크기
{
  const doc: RtfDoc = {
    blocks: [
      {
        type: 'p',
        runs: [
          { text: '빨강', style: { color: '#ff0000' } },
          { text: '파랑24', style: { color: '#0000ff', fontSize: 24 } },
        ],
      },
    ],
  }
  const back = roundTrip(doc)
  const r0 = back.blocks[0].runs.find((r) => r.text === '빨강')
  const r1 = back.blocks[0].runs.find((r) => r.text === '파랑24')
  eq(r0?.style.color, '#ff0000', '빨강 색상 보존')
  eq(r1?.style.color, '#0000ff', '파랑 색상 보존')
  eq(r1?.style.fontSize, 24, '글자크기 24pt 보존')
}

// 6) 리스트
{
  const doc: RtfDoc = {
    blocks: [
      { type: 'li-ul', listLevel: 0, runs: [{ text: '사과', style: {} }] },
      { type: 'li-ul', listLevel: 0, runs: [{ text: '바나나', style: {} }] },
      { type: 'li-ol', listLevel: 0, runs: [{ text: '첫째', style: {} }] },
      { type: 'li-ol', listLevel: 0, runs: [{ text: '둘째', style: {} }] },
    ],
  }
  const back = roundTrip(doc)
  eq(back.blocks.map((b) => b.type), ['li-ul', 'li-ul', 'li-ol', 'li-ol'], '리스트 타입 보존')
  eq(back.blocks.map(blockText), ['사과', '바나나', '첫째', '둘째'], '리스트 텍스트 보존(마커 제거)')
}

// 7) 빈 문단 보존
{
  const doc: RtfDoc = {
    blocks: [
      { type: 'p', runs: [{ text: '첫줄', style: {} }] },
      { type: 'p', runs: [] },
      { type: 'p', runs: [{ text: '셋째줄', style: {} }] },
    ],
  }
  const back = roundTrip(doc)
  eq(back.blocks.length, 3, '빈 문단 포함 3문단 보존')
  eq(back.blocks.map(blockText), ['첫줄', '', '셋째줄', ].slice(0, 3), '빈 문단 텍스트')
}

// 8) 하이퍼링크
{
  const doc: RtfDoc = {
    blocks: [
      {
        type: 'p',
        runs: [
          { text: '앵커', style: { link: 'https://example.com/한글path' } },
        ],
      },
    ],
  }
  const back = roundTrip(doc)
  const linked = back.blocks[0].runs.find((r) => r.text.includes('앵커'))
  ok(!!linked, '링크 텍스트 보존')
  eq(linked?.style.link, 'https://example.com/한글path', '링크 URL 보존(한글 포함)')
}

// 9) 실제 Word 스타일 RTF 파싱(외부 입력 호환)
{
  const external =
    '{\\rtf1\\ansi\\ansicpg949\\deff0{\\fonttbl{\\f0\\fnil\\fcharset129 Malgun Gothic;}}' +
    '{\\colortbl;\\red255\\green0\\blue0;}' +
    '\\pard\\f0\\fs24 일반 {\\b 굵은}\\cf1 빨강\\cf0  \\u54620?\\u44544?\\par}'
  const back = parseRtf(external)
  ok(blockText(back.blocks[0]).includes('일반'), '외부 RTF 일반 텍스트')
  ok(blockText(back.blocks[0]).includes('굵은'), '외부 RTF 굵은 텍스트')
  ok(blockText(back.blocks[0]).includes('한글'), '외부 RTF \\uN 한글 디코딩 (한+글)')
  const bold = back.blocks[0].runs.find((r) => r.text === '굵은')
  ok(!!bold?.style.bold, '외부 RTF 굵게 인식')
}

// 10) 리스트 오탐 방지: 들여쓰기 없는 일반 문단이 "1.\t"/"•\t"로 시작해도 리스트가 아님
{
  const doc: RtfDoc = {
    blocks: [
      { type: 'p', runs: [{ text: '1.\t진짜 리스트가 아닌 본문', style: {} }] },
      { type: 'p', runs: [{ text: '• 그냥 점으로 시작하는 문장', style: {} }] },
    ],
  }
  const back = roundTrip(doc)
  eq(back.blocks.map((b) => b.type), ['p', 'p'], '들여쓰기 없는 문단은 리스트로 오분류되지 않음')
  eq(back.blocks[0].runs.map((r) => r.text).join(''), '1.\t진짜 리스트가 아닌 본문', '본문 텍스트 보존(마커 미제거)')
}

// 11) 진짜 리스트와 일반 문단 혼합
{
  const doc: RtfDoc = {
    blocks: [
      { type: 'p', runs: [{ text: '서론', style: {} }] },
      { type: 'li-ol', listLevel: 0, runs: [{ text: '항목 가', style: {} }] },
      { type: 'li-ol', listLevel: 0, runs: [{ text: '항목 나', style: {} }] },
      { type: 'p', runs: [{ text: '결론', style: {} }] },
    ],
  }
  const back = roundTrip(doc)
  eq(back.blocks.map((b) => b.type), ['p', 'li-ol', 'li-ol', 'p'], '리스트+본문 혼합 보존')
  eq(back.blocks.map(blockText), ['서론', '항목 가', '항목 나', '결론'], '혼합 텍스트 보존')
}

// 12) 구분선(hr) 라운드트립
{
  const doc: RtfDoc = {
    blocks: [
      { type: 'p', runs: [{ text: '윗 문단', style: {} }] },
      { type: 'hr', runs: [] },
      { type: 'p', runs: [{ text: '아랫 문단', style: {} }] },
    ],
  }
  const back = roundTrip(doc)
  eq(back.blocks.map((b) => b.type), ['p', 'hr', 'p'], '구분선(hr) 보존')
}

// 13) 들여쓰기 / 문단 간격 / 줄 간격 라운드트립
{
  const doc: RtfDoc = {
    blocks: [
      {
        type: 'p',
        runs: [{ text: '들여쓴 문단', style: {} }],
        leftIndent: 24,
        firstIndent: 12,
        rightIndent: 18,
        spaceBefore: 6,
        spaceAfter: 10,
        lineSpacing: 1.5,
      },
    ],
  }
  const back = roundTrip(doc)
  const b = back.blocks[0]
  eq(b.leftIndent, 24, '좌측 들여쓰기 24pt')
  eq(b.firstIndent, 12, '첫 줄 들여쓰기 12pt')
  eq(b.rightIndent, 18, '우측 들여쓰기 18pt')
  eq(b.spaceBefore, 6, '문단 앞 6pt')
  eq(b.spaceAfter, 10, '문단 뒤 10pt')
  eq(b.lineSpacing, 1.5, '줄 간격 1.5')
}

// 14) 페이지 나눔(\page) 라운드트립
{
  const doc: RtfDoc = {
    blocks: [
      { type: 'p', runs: [{ text: '1장 끝', style: {} }] },
      { type: 'h1', runs: [{ text: '2장', style: {} }], pageBreak: true },
    ],
  }
  const rtf = serializeRtf(doc)
  ok(rtf.includes('\\page'), 'RTF 에 \\page 출력')
  const back = roundTrip(doc)
  ok(!!back.blocks[1].pageBreak, '페이지 나눔 보존')
}

// 15) 각주(footnote) 라운드트립
{
  const doc: RtfDoc = {
    blocks: [
      {
        type: 'p',
        runs: [
          { text: '본문 앞', style: {} },
          { text: '', style: { footnote: '이것은 각주 내용 한글 footnote' } },
          { text: ' 본문 뒤', style: {} },
        ],
      },
    ],
  }
  const rtf = serializeRtf(doc)
  ok(rtf.includes('\\footnote'), 'RTF 에 \\footnote 출력')
  ok(rtf.includes('\\chftn'), 'RTF 에 \\chftn 출력')
  const back = roundTrip(doc)
  const marker = back.blocks[0].runs.find((r) => r.style.footnote != null)
  ok(!!marker, '각주 마커 런 복원')
  eq(marker?.style.footnote, '이것은 각주 내용 한글 footnote', '각주 텍스트 왕복')
  eq(blockText(back.blocks[0]), '본문 앞 본문 뒤', '각주 마커는 본문 텍스트에 영향 없음')
}

// 16) 미주(endnote) 라운드트립
{
  const doc: RtfDoc = {
    blocks: [{ type: 'p', runs: [{ text: '끝', style: {} }, { text: '', style: { footnote: '미주다', endnote: true } }] }],
  }
  const rtf = serializeRtf(doc)
  ok(rtf.includes('\\ftnalt'), 'RTF 에 \\ftnalt(미주) 출력')
  const back = roundTrip(doc)
  const m = back.blocks[0].runs.find((r) => r.style.footnote != null)
  ok(!!m?.style.endnote, '미주 플래그 보존')
  eq(m?.style.footnote, '미주다', '미주 텍스트 왕복')
}

// 17) 코멘트(주석) 라운드트립
{
  const doc: RtfDoc = {
    blocks: [
      {
        type: 'p',
        runs: [
          { text: '검토 필요', style: {} },
          { text: '', style: { comment: '여기 고쳐주세요 한글 comment', commentId: 'abc123' } },
        ],
      },
    ],
  }
  const rtf = serializeRtf(doc)
  ok(rtf.includes('\\*\\annotation'), 'RTF 에 \\*\\annotation 출력')
  const back = roundTrip(doc)
  const c = back.blocks[0].runs.find((r) => r.style.comment != null)
  ok(!!c, '코멘트 마커 런 복원')
  eq(c?.style.comment, '여기 고쳐주세요 한글 comment', '코멘트 텍스트 왕복')
  eq(c?.style.commentId, 'abc123', '코멘트 id 왕복')
  eq(blockText(back.blocks[0]), '검토 필요', '코멘트 마커는 본문 텍스트에 영향 없음')
}

// 18) 각주 여러 개 + 본문 사이 혼재
{
  const doc: RtfDoc = {
    blocks: [
      {
        type: 'p',
        runs: [
          { text: 'A', style: {} },
          { text: '', style: { footnote: '첫번째' } },
          { text: 'B', style: { bold: true } },
          { text: '', style: { footnote: '두번째' } },
          { text: 'C', style: {} },
        ],
      },
    ],
  }
  const back = roundTrip(doc)
  const notes = back.blocks[0].runs.filter((r) => r.style.footnote != null).map((r) => r.style.footnote)
  eq(notes, ['첫번째', '두번째'], '각주 2개 순서대로 보존')
  eq(blockText(back.blocks[0]), 'ABC', '본문 텍스트 보존')
  ok(!!back.blocks[0].runs.find((r) => r.text === 'B')?.style.bold, '각주 사이 굵게 보존')
}

// 19) 인라인 이미지(\pict) 라운드트립 (1x1 PNG)
{
  const PNG =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  const doc: RtfDoc = {
    blocks: [{ type: 'p', runs: [{ text: '그림:', style: {} }, { text: '', style: { image: PNG } }] }],
  }
  const rtf = serializeRtf(doc)
  ok(rtf.includes('\\pict') && rtf.includes('\\pngblip'), 'RTF 에 \\pict\\pngblip 출력')
  const back = roundTrip(doc)
  const img = back.blocks[0].runs.find((r) => r.style.image != null)
  ok(!!img, '이미지 마커 런 복원')
  eq(img?.style.image, PNG, '이미지 data URL 왕복(바이트 동일)')
  eq(blockText(back.blocks[0]), '그림:', '이미지 마커는 본문 텍스트에 영향 없음')
}

// 20) 각주 내부 중첩 서식 그룹이 마커를 조각내지 않음 (Word RTF 호환)
{
  const rtf =
    '{\\rtf1\\ansi\\deff0 \\pard 본문{\\super\\chftn}{\\footnote\\pard\\plain\\fs20 {\\super\\chftn}각주 {\\i 기울임} 끝}\\par}'
  const back = parseRtf(rtf)
  const notes = back.blocks.flatMap((b) => b.runs).filter((r) => r.style.footnote != null)
  eq(notes.length, 1, '중첩 서식 각주는 마커 1개로 유지')
  ok(notes[0].text === '', '각주 마커 런은 빈 텍스트')
  ok((notes[0].style.footnote || '').includes('각주') && (notes[0].style.footnote || '').includes('끝'), '각주 본문 전체 보존(앞~뒤)')
}

// 21) 주석(annotation) 내부 중첩 그룹도 1개로 유지
{
  const rtf = '{\\rtf1\\ansi\\deff0 \\pard 검토{\\*\\atnid x}{\\*\\annotation 코멘트 {\\b 굵게} 나머지}\\par}'
  const back = parseRtf(rtf)
  const cmts = back.blocks.flatMap((b) => b.runs).filter((r) => r.style.comment != null)
  eq(cmts.length, 1, '중첩 서식 주석은 마커 1개로 유지')
  ok((cmts[0].style.comment || '').includes('코멘트') && (cmts[0].style.comment || '').includes('나머지'), '주석 본문 전체 보존')
}

// 22) \bin 바이너리 데이터가 파서를 깨뜨리지 않음(크래시/가짜 문단 방지)
{
  const rtf = '{\\rtf1\\ansi\\deff0\\pard A{\\pict\\pngblip\\bin3 }}}B\\par C\\par}'
  let back: RtfDoc
  let threw = false
  try {
    back = parseRtf(rtf)
  } catch {
    threw = true
    back = { blocks: [] }
  }
  ok(!threw, '\\bin 바이너리에서 파서가 예외를 던지지 않음')
  const text = back.blocks.map(blockText).join('|')
  ok(text.includes('A'), '\\bin 앞 텍스트 A 보존')
}

// 23) \bin 안의 \par 가 가짜 문단을 만들지 않음
{
  const rtf = '{\\rtf1\\ansi\\deff0\\pard X{\\pict\\pngblip\\bin8 \\par AAAA}Y\\par}'
  const back = parseRtf(rtf)
  // \par 8 코드유닛(\par AAA)이 스킵되어 'X...Y' 가 한 문단에 남아야 함
  const joined = back.blocks.map(blockText).join('')
  ok(joined.includes('X') && joined.includes('Y'), 'X,Y 보존')
  ok(back.blocks.filter((b) => blockText(b).trim()).length === 1, '\\bin 내부 \\par 로 가짜 문단이 생기지 않음')
}

// 24) 각주/이미지 마커가 있는 \brdrb 문단이 hr 로 오분류되지 않음
{
  const doc: RtfDoc = {
    blocks: [{ type: 'p', runs: [{ text: '', style: { footnote: '살아남을 각주' } }] }],
  }
  // brdrb 를 강제로 붙인 RTF 를 만들어 파싱
  const rtf = '{\\rtf1\\ansi\\deff0\\pard\\brdrb\\brdrs {\\super\\chftn}{\\footnote 살아남을 각주}\\par}'
  const back = parseRtf(rtf)
  const note = back.blocks.flatMap((b) => b.runs).find((r) => r.style.footnote != null)
  ok(!!note, '테두리 문단의 각주가 hr 로 사라지지 않음')
  ok(!back.blocks.some((b) => b.type === 'hr'), '마커 문단은 hr 로 분류되지 않음')
  void doc
}

// 25) blockquote 들여쓰기 왕복 안정성: 반복 왕복해도 leftIndent 누적/표기 변화 없음
{
  const doc: RtfDoc = { blocks: [{ type: 'blockquote', runs: [{ text: '인용문', style: {} }] }] }
  const b1 = roundTrip(doc)
  ok(b1.blocks[0].type === 'blockquote', '인용 타입 유지')
  ok(b1.blocks[0].leftIndent == null, '인용 기본 들여쓰기를 명시 leftIndent 로 흡수하지 않음')
  // 한 번 더 왕복해도 동일
  const b2 = roundTrip(b1)
  ok(b2.blocks[0].leftIndent == null, '반복 왕복에도 leftIndent 누적 없음')
  eq(blockText(b2.blocks[0]), '인용문', '인용 텍스트 보존')
}

// 26) 인용에 추가 들여쓰기가 있으면 leftIndent 로 보존
{
  const doc: RtfDoc = { blocks: [{ type: 'blockquote', leftIndent: 48, runs: [{ text: '깊은 인용', style: {} }] }] }
  const back = roundTrip(doc)
  eq(back.blocks[0].leftIndent, 48, '추가 들여쓰기(48pt) 보존')
}

// 27) colortbl 마지막 항목 뒤 ';' 가 없어도 색이 보존됨(관대 파싱)
{
  const doc = parseRtf('{\\rtf1\\ansi{\\colortbl;\\red255\\green0\\blue0}\\cf1 hello}')
  const run = doc.blocks[0]?.runs?.find((r) => r.text.includes('hello'))
  eq(run?.style.color, '#ff0000', 'colortbl 마지막 ; 누락 시에도 \\cf1 색 적용')
  // 정상(세미콜론 있음)에서는 색이 한 번만 등록되어 인덱스가 어긋나지 않음
  const ok2 = parseRtf('{\\rtf1\\ansi{\\colortbl;\\red0\\green0\\blue255;}\\cf1 x}')
  const r2 = ok2.blocks[0]?.runs?.find((r) => r.text.includes('x'))
  eq(r2?.style.color, '#0000ff', '세미콜론 정상 colortbl 도 정확(이중 등록 없음)')
}

// 28) 하이퍼링크: 밑줄 없는 링크는 왕복 후에도 밑줄을 얻지 않고, 밑줄 링크는 보존
{
  const plain: RtfDoc = { blocks: [{ type: 'p', runs: [{ text: '링크', style: { link: 'https://example.com' } }] }] }
  const p = roundTrip(plain).blocks[0].runs.find((r) => r.text === '링크')
  ok(p != null && !p.style.underline, '밑줄 없는 링크는 왕복 후 밑줄이 생기지 않음')
  eq(p?.style.link, 'https://example.com', '링크 URL 보존')
  const ul: RtfDoc = { blocks: [{ type: 'p', runs: [{ text: '링크', style: { link: 'https://example.com', underline: true } }] }] }
  const u = roundTrip(ul).blocks[0].runs.find((r) => r.text === '링크')
  ok(u?.style.underline === true, '밑줄 있는 링크는 왕복 후에도 밑줄 유지')
}

// 29) 중첩 리스트: model->HTML 이 listLevel 을 반영해 중첩 ul 을 생성
{
  const doc: RtfDoc = {
    blocks: [
      { type: 'li-ul', listLevel: 0, runs: [{ text: 'A', style: {} }] },
      { type: 'li-ul', listLevel: 1, runs: [{ text: 'A1', style: {} }] },
      { type: 'li-ul', listLevel: 0, runs: [{ text: 'B', style: {} }] },
    ],
  }
  const html = modelToHtml(doc)
  ok(
    /<ul><li>A<ul><li>A1<\/li><\/ul><\/li><li>B<\/li><\/ul>/.test(html),
    'listLevel 차이가 중첩 <ul> 로 렌더링됨(평탄화되지 않음)',
  )
}

// 30) 보안: 악성 fontFamily 가 style 속성 경계를 깨고 <img> 를 주입하지 못함(XSS 방지)
{
  const doc: RtfDoc = { blocks: [{ type: 'p', runs: [{ text: 'x', style: { fontFamily: 'a"><img src=q onerror=alert(1)>' } }] }] }
  const html = modelToHtml(doc)
  ok(!/<img/i.test(html), 'fontFamily 인젝션으로 <img> 가 생성되지 않음')
  ok(/<span style="[^"]*">x<\/span>/.test(html), 'style 속성이 닫히지 않고 span 이 정상 형태 유지')
  // 정상 다단어 글꼴명은 공백을 보존(제어문자/위험문자 제거가 공백·하이픈을 지우지 않음)
  const normal = modelToHtml({ blocks: [{ type: 'p', runs: [{ text: 'y', style: { fontFamily: 'Times New Roman' } }] }] })
  ok(normal.includes("font-family:'Times New Roman'"), '다단어 글꼴명(공백 포함) 보존')
}

// 31) 보안: 위험 스킴 링크 무력화 + 정상/내부/이미지 URL 보존
{
  const js: RtfDoc = { blocks: [{ type: 'p', runs: [{ text: 'c', style: { link: 'javascript:alert(1)' } }] }] }
  const hjs = modelToHtml(js)
  ok(/href="#"/.test(hjs) && !/javascript:/i.test(hjs), 'javascript: 링크가 # 로 무력화됨')
  const https: RtfDoc = { blocks: [{ type: 'p', runs: [{ text: 'c', style: { link: 'https://example.com' } }] }] }
  ok(/href="https:\/\/example\.com"/.test(modelToHtml(https)), 'https 링크 보존')
  const scriv: RtfDoc = { blocks: [{ type: 'p', runs: [{ text: 'c', style: { link: 'scriv://abc-123' } }] }] }
  ok(/href="scriv:\/\/abc-123"/.test(modelToHtml(scriv)), '내부 scriv:// 링크 보존')
  const img: RtfDoc = { blocks: [{ type: 'p', runs: [{ text: '', style: { image: 'data:image/png;base64,iVBORw0KGgo' } }] }] }
  ok(/src="data:image\/png;base64,iVBORw0KGgo"/.test(modelToHtml(img)), '인라인 data:image 보존(과도 차단 없음)')
}

// 32) 견고성: 대량 '{' 로 된 악성 RTF 가 무한 스택 증가(OOM/행) 없이 종료(그룹 깊이 캡)
{
  const evil = '{\\rtf1\\ansi' + '{'.repeat(300000) + ' hello'
  const doc = parseRtf(evil)
  ok(!!doc && Array.isArray(doc.blocks), '대량 중괄호 입력이 크래시 없이 파싱됨')
}

declare const process: { exit(code: number): never }
console.log(`\nRTF 엔진 테스트: ${pass} 통과 / ${fail} 실패`)
if (fail > 0) process.exit(1)
