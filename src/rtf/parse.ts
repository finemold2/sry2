// RTF 문자열 -> 구조화 문서 모델.
// 토크나이저 + 상태스택 방식. 한글 \uN, \'XX, 그룹, 색/폰트/스타일 테이블, 하이퍼링크 필드를 처리.
import { DEFAULT_FONT } from './model.ts'
import type { Align, Block, BlockType, RtfDoc, Run, RunStyle } from './model.ts'

type Dest =
  | 'body'
  | 'skip'
  | 'fonttbl'
  | 'colortbl'
  | 'stylesheet'
  | 'fldinst'
  | 'footnote'
  | 'annotation'
  | 'atnid'
  | 'pict'

interface GroupState {
  char: RunStyle
  dest: Dest
  uc: number
  /** 이 그룹이 dest 를 직접 연 "소유자"인가. 자식 그룹은 dest 를 상속하되 소유자가 아니다.
   *  각주/주석/필드/그림은 소유자 그룹이 닫힐 때만 commit 해야 중첩 서식 그룹에서 조각나지 않는다. */
  destOwner: boolean
}

// 본문이 아닌(스킵 대상) 데스티네이션 컨트롤 워드들
const SKIP_DESTS = new Set([
  'info',
  'header',
  'footer',
  'footerl',
  'footerr',
  'headerl',
  'headerr',
  'xmlnstbl',
  'listtable',
  'listoverridetable',
  'generator',
  'datafield',
  'themedata',
  'colorschememapping',
  'latentstyles',
  'datastore',
  'pgptbl',
  'rsidtbl',
  'mmath',
  'bkmkstart',
  'bkmkend',
  'object',
  'nonshppict',
  // 'footnote' 는 본문 마커로 복원하므로 스킵 목록에서 제외
])

function hexToDataUrl(hexIn: string, blip: 'png' | 'jpeg'): string {
  let hex = hexIn
  if (hex.length % 2 !== 0) hex = hex.slice(0, -1)
  let bin = ''
  for (let i = 0; i < hex.length; i += 2) bin += String.fromCharCode(parseInt(hex.substr(i, 2), 16))
  let b64: string
  try {
    b64 = btoa(bin)
  } catch {
    return ''
  }
  return `data:${blip === 'jpeg' ? 'image/jpeg' : 'image/png'};base64,${b64}`
}

export function parseRtf(rtf: string): RtfDoc {
  if (!rtf) return { blocks: [{ type: 'p', runs: [] }] }
  const blocks: Block[] = []

  // 현재 문단 상태
  let curType: BlockType = 'p'
  let curAlign: Align = 'left'
  let curLi = 0
  let curFi = 0
  let curRi = 0
  let curSb = 0
  let curSa = 0
  let curSl = 0
  let curSlmult = 0
  let curBorderB = false
  let curPageBreak = false
  let curRuns: Run[] = []

  // 현재 런 누적
  let runText = ''
  let runStyle: RunStyle = {}

  // 그룹 스택
  const stack: GroupState[] = [{ char: {}, dest: 'body', uc: 1, destOwner: false }]
  let ucSkip = 1
  let skipChars = 0

  // 테이블 (colorTable[0] = auto)
  const colorTable: (string | null)[] = []
  const fontTable: Record<number, string> = {}
  const styleNames: Record<number, string> = {}

  // colortbl 누적
  let ctR = 0,
    ctG = 0,
    ctB = 0,
    ctHas = false
  // fonttbl / stylesheet 누적
  let fontNum = -1,
    fontNameBuf = ''
  let styleNum = -1,
    styleNameBuf = ''
  // 하이퍼링크
  let fldinstBuf = ''
  let pendingLink: string | undefined
  // 각주/미주 + 코멘트(주석)
  let footnoteBuf = ''
  let footnoteIsEndnote = false
  let annoBuf = ''
  let atnidBuf = ''
  let pendingCommentId: string | undefined
  // 인라인 이미지(\pict)
  let pictHexBuf = ''
  let pictBlip: 'png' | 'jpeg' | null = null
  let pictW = 0
  let pictH = 0
  let lastImageHex = ''

  const top = () => stack[stack.length - 1]

  function flushRun() {
    if (runText.length > 0) curRuns.push({ text: runText, style: { ...runStyle } })
    runText = ''
  }

  function applyCharChange(mut: (c: RunStyle) => void) {
    flushRun()
    mut(runStyle)
  }

  function resetPar() {
    curType = 'p'
    curAlign = 'left'
    curLi = 0
    curFi = 0
    curRi = 0
    curSb = 0
    curSa = 0
    curSl = 0
    curSlmult = 0
    curBorderB = false
  }

  const twToPt = (tw: number) => Math.round((tw / 20) * 10) / 10

  function flushBlock(force: boolean) {
    flushRun()
    if (curRuns.length === 0 && !force) {
      curRuns = []
      return
    }
    let type = curType
    let runs = curRuns.slice()
    const listLevel = curLi > 0 ? Math.max(0, Math.round(curLi / 720) - 1) : 0
    const firstText = runs.length ? runs[0].text : ''
    // 리스트 마커는 직렬화기가 매단 매단 들여쓰기(\li>=720\fi-360)와 함께 출력하므로,
    // 본문에 우연히 "1.\t"/"•\t" 로 시작하는 일반 문단을 오분류하지 않도록 들여쓰기를 함께 본다.
    const looksListIndent = curLi >= 720 && curFi < 0
    if (looksListIndent && /^•\t/.test(firstText)) {
      type = 'li-ul'
      runs[0] = { ...runs[0], text: firstText.replace(/^•\t/, '') }
    } else if (looksListIndent && /^\d+\.\t/.test(firstText)) {
      type = 'li-ol'
      runs[0] = { ...runs[0], text: firstText.replace(/^\d+\.\t/, '') }
    }
    if (
      runs.length &&
      runs[0].text === '' &&
      !runs[0].style.footnote &&
      !runs[0].style.comment &&
      !runs[0].style.image
    )
      runs.shift()

    // 아래 테두리만 있고 내용 없는 문단 = 구분선(hr)
    // 단, 각주/주석/이미지 마커가 들어있으면 hr 로 보지 않는다(콘텐츠 소실 방지).
    if (
      curBorderB &&
      runs.every((r) => r.text.trim() === '' && !r.style.footnote && !r.style.comment && !r.style.image)
    ) {
      blocks.push({ type: 'hr', runs: [] })
      curRuns = []
      return
    }

    const block: Block = { type, align: curAlign, runs }
    if (type === 'li-ul' || type === 'li-ol') {
      block.listLevel = listLevel
    } else {
      // blockquote 는 스타일 기본 들여쓰기(\li480)가 직렬화기에서 자동 부여되므로,
      // 그 기본값과 같은 경우엔 명시 leftIndent 로 흡수하지 않는다(왕복 시 들여쓰기 표기 안정화).
      const isQuoteDefault = type === 'blockquote' && curLi === 480
      if (curLi > 0 && !isQuoteDefault) block.leftIndent = twToPt(curLi)
      if (curRi > 0) block.rightIndent = twToPt(curRi)
      if (curFi !== 0) block.firstIndent = twToPt(curFi)
    }
    if (curSb > 0) block.spaceBefore = twToPt(curSb)
    if (curSa > 0) block.spaceAfter = twToPt(curSa)
    if (curSl > 0 && curSlmult === 1) block.lineSpacing = Math.round((curSl / 240) * 100) / 100
    if (curPageBreak) {
      block.pageBreak = true
      curPageBreak = false
    }
    blocks.push(block)
    curRuns = []
  }

  function setStyle(n: number) {
    const byName = (styleNames[n] || '').toLowerCase()
    if (n === 1 || /heading\s*1|^h1$/.test(byName)) curType = 'h1'
    else if (n === 2 || /heading\s*2|^h2$/.test(byName)) curType = 'h2'
    else if (n === 3 || /heading\s*3|^h3$/.test(byName)) curType = 'h3'
    else if (n === 4 || /heading\s*4|^h4$/.test(byName)) curType = 'h4'
    else if (n === 5 || /quote/.test(byName)) curType = 'blockquote'
    else curType = 'p'
  }

  function appendText(s: string) {
    const d = top().dest
    if (d === 'fldinst') fldinstBuf += s
    else if (d === 'fonttbl') fontNameBuf += s
    else if (d === 'stylesheet') styleNameBuf += s
    else if (d === 'footnote') footnoteBuf += s
    else if (d === 'annotation') annoBuf += s
    else if (d === 'atnid') atnidBuf += s
    else if (d === 'pict') {
      // 16진수 문자만 누적. 과도하게 큰 이미지는 상한(32MB 바이너리=64M hex)에서 버려 메모리 폭증/블로킹 방지.
      if (pictHexBuf.length > 64_000_000) {
        pictBlip = null
        return
      }
      for (let k = 0; k < s.length; k++) {
        const ch = s[k]
        if ((ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F')) pictHexBuf += ch
      }
    } else if (d === 'colortbl' || d === 'skip') return
    else runText += s
  }

  function appendCodeUnit(unit: number) {
    appendText(String.fromCharCode(unit & 0xffff))
  }

  function commitFont() {
    if (fontNum >= 0) {
      const name = fontNameBuf.replace(/;[\s\S]*$/, '').trim()
      if (name) fontTable[fontNum] = name
    }
    fontNum = -1
    fontNameBuf = ''
  }
  function commitStyle() {
    if (styleNum >= 0) {
      const name = styleNameBuf.replace(/;[\s\S]*$/, '').trim()
      if (name) styleNames[styleNum] = name
    }
    styleNum = -1
    styleNameBuf = ''
  }

  function handleControl(word: string, param: number | null, hasParam: boolean) {
    // 1) 데스티네이션 정의 워드 (현재 dest 무관하게 우선)
    if (word === 'fonttbl') {
      top().dest = 'fonttbl'
      fontNum = -1
      fontNameBuf = ''
      return
    }
    if (word === 'colortbl') {
      top().dest = 'colortbl'
      ctR = ctG = ctB = 0
      ctHas = false
      return
    }
    if (word === 'stylesheet') {
      top().dest = 'stylesheet'
      styleNum = -1
      styleNameBuf = ''
      return
    }
    if (word === 'fldinst') {
      top().dest = 'fldinst'
      top().destOwner = true
      fldinstBuf = ''
      return
    }
    // 각주/미주 + 코멘트(주석) 데스티네이션 (선행 \* 로 dest=skip 이어도 우선 처리)
    if (word === 'footnote') {
      top().dest = 'footnote'
      top().destOwner = true
      footnoteBuf = ''
      footnoteIsEndnote = false
      return
    }
    if (word === 'annotation') {
      top().dest = 'annotation'
      top().destOwner = true
      annoBuf = ''
      return
    }
    if (word === 'atnid') {
      top().dest = 'atnid'
      top().destOwner = true
      atnidBuf = ''
      return
    }
    if (word === 'pict') {
      top().dest = 'pict'
      top().destOwner = true
      pictHexBuf = ''
      pictBlip = null
      pictW = 0
      pictH = 0
      return
    }
    if (SKIP_DESTS.has(word)) {
      top().dest = 'skip'
      return
    }

    const d = top().dest

    // 이미지(\pict) 캡처: blip 종류/크기만 읽고 hex 는 appendText 에서 누적
    if (d === 'pict') {
      if (word === 'pngblip') pictBlip = 'png'
      else if (word === 'jpegblip') pictBlip = 'jpeg'
      else if (word === 'picwgoal') pictW = param || 0
      else if (word === 'pichgoal') pictH = param || 0
      return
    }

    // 각주/주석 본문 캡처: 유니코드만 디코딩하고 그 외 컨트롤 워드는 무시
    if (d === 'footnote' || d === 'annotation' || d === 'atnid') {
      if (word === 'u' && hasParam) {
        let cu = param as number
        if (cu < 0) cu += 0x10000
        appendCodeUnit(cu)
        skipChars = ucSkip
      } else if (word === 'uc') {
        ucSkip = param == null ? 1 : (param as number)
        top().uc = ucSkip
      } else if (word === 'ftnalt' && d === 'footnote') {
        footnoteIsEndnote = true
      }
      return
    }

    if (d === 'colortbl') {
      if (word === 'red') (ctR = param || 0), (ctHas = true)
      else if (word === 'green') (ctG = param || 0), (ctHas = true)
      else if (word === 'blue') (ctB = param || 0), (ctHas = true)
      return
    }
    if (d === 'fonttbl') {
      if (word === 'f' && hasParam) {
        commitFont()
        fontNum = param as number
        fontNameBuf = ''
      }
      return
    }
    if (d === 'stylesheet') {
      if (word === 's' && hasParam) {
        styleNum = param as number
        styleNameBuf = ''
      }
      return
    }
    if (d === 'skip') return
    if (d === 'fldinst') {
      // 하이퍼링크 URL 안의 한글 등 유니코드도 디코딩해 캡처
      if (word === 'u' && hasParam) {
        let cu = param as number
        if (cu < 0) cu += 0x10000
        appendCodeUnit(cu)
        skipChars = ucSkip
      } else if (word === 'uc') {
        ucSkip = param == null ? 1 : (param as number)
        top().uc = ucSkip
      }
      return
    }

    // --- 본문 ---
    switch (word) {
      case 'par':
      case 'sect':
        flushBlock(true)
        return
      case 'pard':
        resetPar()
        return
      case 'plain':
        applyCharChange((c) => {
          for (const k of Object.keys(c)) delete (c as Record<string, unknown>)[k]
        })
        return
      case 'b':
        applyCharChange((c) => (c.bold = param !== 0))
        return
      case 'i':
        applyCharChange((c) => (c.italic = param !== 0))
        return
      case 'ul':
        applyCharChange((c) => (c.underline = param !== 0))
        return
      case 'ulnone':
        applyCharChange((c) => (c.underline = false))
        return
      case 'strike':
        applyCharChange((c) => (c.strike = param !== 0))
        return
      case 'super':
        applyCharChange((c) => {
          c.superscript = true
          c.subscript = false
        })
        return
      case 'sub':
        applyCharChange((c) => {
          c.subscript = true
          c.superscript = false
        })
        return
      case 'nosupersub':
        applyCharChange((c) => {
          c.superscript = false
          c.subscript = false
        })
        return
      case 'fs':
        if (hasParam) applyCharChange((c) => (c.fontSize = (param as number) / 2))
        return
      case 'f':
        if (hasParam)
          applyCharChange((c) => {
            const name = fontTable[param as number]
            if (name && name.toLowerCase() !== DEFAULT_FONT.toLowerCase()) c.fontFamily = name
            else delete c.fontFamily
          })
        return
      case 'cf':
        if (hasParam)
          applyCharChange((c) => {
            const hex = colorTable[param as number]
            if (hex) c.color = hex
            else delete c.color
          })
        return
      case 'highlight':
      case 'chcbpat':
        if (hasParam)
          applyCharChange((c) => {
            const hex = colorTable[param as number]
            if (hex) c.highlight = hex
            else delete c.highlight
          })
        return
      case 'ql':
        curAlign = 'left'
        return
      case 'qc':
        curAlign = 'center'
        return
      case 'qr':
        curAlign = 'right'
        return
      case 'qj':
        curAlign = 'justify'
        return
      case 's':
        if (hasParam) setStyle(param as number)
        return
      case 'li':
        if (hasParam) curLi = param as number
        return
      case 'fi':
        if (hasParam) curFi = param as number
        return
      case 'ri':
        if (hasParam) curRi = param as number
        return
      case 'sb':
        if (hasParam) curSb = param as number
        return
      case 'sa':
        if (hasParam) curSa = param as number
        return
      case 'sl':
        if (hasParam) curSl = param as number
        return
      case 'slmult':
        curSlmult = param == null ? 1 : param
        return
      case 'brdrb':
        curBorderB = true
        return
      case 'page':
        curPageBreak = true
        return
      case 'line':
        appendText('\n')
        return
      case 'tab':
        appendText('\t')
        return
      case 'uc':
        ucSkip = param == null ? 1 : (param as number)
        top().uc = ucSkip
        return
      case 'u':
        if (hasParam) {
          let cu = param as number
          if (cu < 0) cu += 0x10000
          appendCodeUnit(cu)
          skipChars = ucSkip
        }
        return
      case 'fldrslt':
        if (pendingLink) {
          const link = pendingLink
          applyCharChange((c) => (c.link = link))
        }
        return
      default:
        return
    }
  }

  const len = rtf.length
  let i = 0
  while (i < len) {
    const ch = rtf[i]

    if (ch === '\\') {
      const next = rtf[i + 1]
      if (next === '\\' || next === '{' || next === '}') {
        i += 2
        if (skipChars > 0) skipChars--
        else appendText(next)
        continue
      }
      if (next === "'") {
        const hex = rtf.substr(i + 2, 2)
        i += 4
        const code = parseInt(hex, 16)
        if (skipChars > 0) skipChars--
        else if (!isNaN(code)) appendCodeUnit(code)
        continue
      }
      if (next === '*') {
        top().dest = 'skip'
        i += 2
        continue
      }
      if (next === '~') {
        i += 2
        if (skipChars > 0) skipChars--
        else appendText(' ')
        continue
      }
      if (next === '_') {
        i += 2
        if (skipChars > 0) skipChars--
        else appendText('-')
        continue
      }
      if (next === '\r' || next === '\n') {
        // 백슬래시+개행: RTF 소스 정형화용 줄바꿈. 단락 구분이 아님(무시).
        i += 2
        continue
      }
      if (next === undefined) {
        i += 1
        continue
      }
      if (/[a-zA-Z]/.test(next)) {
        let j = i + 1
        let word = ''
        while (j < len && /[a-zA-Z]/.test(rtf[j])) word += rtf[j++]
        let numStr = ''
        if (rtf[j] === '-') numStr = '-', j++
        while (j < len && /[0-9]/.test(rtf[j])) numStr += rtf[j++]
        const hasParam = numStr !== '' && numStr !== '-'
        if (rtf[j] === ' ') j++
        i = j
        // \binN: 다음 N개(코드유닛)는 원시 바이너리이므로 RTF 로 파싱하지 않고 건너뛴다.
        if (word === 'bin' && hasParam) {
          const n = parseInt(numStr, 10)
          if (n > 0) {
            i = Math.min(len, i + n)
            continue
          }
        }
        handleControl(word, hasParam ? parseInt(numStr, 10) : null, hasParam)
        continue
      }
      // 알 수 없는 컨트롤 심볼
      i += 2
      continue
    }

    if (ch === '{') {
      // 그룹 스택 깊이 상한 — 악의적 RTF 의 무한 '{' 로 인한 메모리 고갈(DoS) 방지.
      // 실제 문서 중첩은 수십 단계 이내라 4096 은 충분히 여유. 초과 시 push 만 건너뛰고 커서는 전진(O(n) 종료 보장).
      if (stack.length < 4096) {
        stack.push({ char: { ...runStyle }, dest: top().dest, uc: ucSkip, destOwner: false })
      }
      i++
      continue
    }

    if (ch === '}') {
      const closingGroup = top()
      const closing = closingGroup.dest
      // 각주/주석/필드/그림/atnid 는 dest 를 직접 연 "소유자" 그룹이 닫힐 때만 commit.
      // (중첩 서식 그룹 {\b ..}{\i ..} 에서 매번 commit 되어 마커가 조각나는 문제 방지)
      const owner = closingGroup.destOwner
      if (closing === 'colortbl') {
        // 마지막 항목 뒤 ';' 가 없는 경우에도 대기 중인 색을 commit (fonttbl/stylesheet 와 동일하게 관대 처리).
        if (ctHas) {
          colorTable.push(
            '#' +
              ctR.toString(16).padStart(2, '0') +
              ctG.toString(16).padStart(2, '0') +
              ctB.toString(16).padStart(2, '0'),
          )
        }
        ctHas = false
        ctR = ctG = ctB = 0
      } else if (closing === 'fonttbl') {
        commitFont()
      } else if (closing === 'stylesheet') {
        commitStyle()
      } else if (closing === 'fldinst' && owner) {
        const m = fldinstBuf.match(/HYPERLINK\s+"([^"]*)"/i)
        if (m) pendingLink = m[1]
        fldinstBuf = ''
      } else if (closing === 'footnote' && owner) {
        flushRun()
        const style: RunStyle = { footnote: footnoteBuf.trim() }
        if (footnoteIsEndnote) style.endnote = true
        curRuns.push({ text: '', style })
        footnoteBuf = ''
        footnoteIsEndnote = false
      } else if (closing === 'annotation' && owner) {
        flushRun()
        const style: RunStyle = { comment: annoBuf.trim() }
        if (pendingCommentId) style.commentId = pendingCommentId
        curRuns.push({ text: '', style })
        annoBuf = ''
        pendingCommentId = undefined
      } else if (closing === 'atnid' && owner) {
        pendingCommentId = atnidBuf.trim() || undefined
        atnidBuf = ''
      } else if (closing === 'pict' && owner) {
        // PNG/JPEG 만 인라인 이미지로 복원(메타파일 등은 무시). 직전과 동일 이미지면 중복 방지.
        if (pictBlip && pictHexBuf.length >= 8 && pictHexBuf !== lastImageHex) {
          const dataUrl = hexToDataUrl(pictHexBuf, pictBlip)
          if (dataUrl) {
            flushRun()
            const style: RunStyle = { image: dataUrl }
            if (pictW) style.imageW = Math.round(pictW / 15)
            if (pictH) style.imageH = Math.round(pictH / 15)
            curRuns.push({ text: '', style })
            lastImageHex = pictHexBuf
          }
        }
        pictHexBuf = ''
        pictBlip = null
      }
      flushRun()
      // 마지막(body) 그룹은 보호 — 불균형 RTF 로 인한 스택 언더플로우/크래시 방지
      if (stack.length > 1) stack.pop()
      runStyle = { ...top().char }
      ucSkip = top().uc
      i++
      continue
    }

    if (ch === '\r' || ch === '\n') {
      i++
      continue
    }

    if (skipChars > 0) {
      skipChars--
      i++
      continue
    }

    if (top().dest === 'colortbl' && ch === ';') {
      if (ctHas) {
        const hex =
          '#' +
          ctR.toString(16).padStart(2, '0') +
          ctG.toString(16).padStart(2, '0') +
          ctB.toString(16).padStart(2, '0')
        colorTable.push(hex)
      } else {
        colorTable.push(null)
      }
      ctR = ctG = ctB = 0
      ctHas = false
      i++
      continue
    }

    appendText(ch)
    i++
  }

  flushBlock(false)
  if (blocks.length === 0) blocks.push({ type: 'p', runs: [] })
  return { blocks }
}
