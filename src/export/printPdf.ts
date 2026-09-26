// 실제 PDF 출력 — 브라우저 인쇄 엔진 사용(한글은 시스템 폰트로 정확히 렌더, 별도 폰트 임베드 불필요).
// 사용자가 "PDF로 저장"을 선택하면 진짜 .pdf 파일이 생성된다. CSS Paged Media 로 페이지 번호 포함.
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function printToPdf(bodyHtml: string, title: string) {
  const w = window.open('', '_blank', 'width=820,height=1000')
  if (!w) {
    alert('PDF 출력을 위해 팝업을 허용해 주세요.')
    return
  }
  const safeTitle = escapeHtml(title)
  const css = `
    @page { size: A4; margin: 2.2cm 2cm; }
    @page { @bottom-center { content: counter(page); } }
    * { box-sizing: border-box; }
    body { font-family: 'Malgun Gothic', 'Batang', serif; font-size: 11.5pt; line-height: 1.75; color: #000; margin: 0; }
    .doc-title { text-align: center; font-size: 2em; margin: 30vh 0 2em; page-break-after: always; }
    h1 { font-size: 1.7em; margin: 1.4em 0 .6em; }
    h2 { font-size: 1.35em; margin: 1.1em 0 .4em; }
    h3 { font-size: 1.15em; margin: 1em 0 .3em; }
    p { margin: 0 0 .15em; text-indent: 1em; }
    p:first-child, h1 + p, h2 + p, h3 + p, blockquote + p { text-indent: 0; }
    blockquote { margin: .6em 1.6em; font-style: italic; }
    ul, ol { margin: .4em 0 .4em 1.4em; }
    hr { border: none; text-align: center; margin: 1em 0; }
    hr::after { content: '* * *'; }
    a { color: #000; text-decoration: none; }
    @media print { .noprint { display: none; } }
  `
  w.document.write(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${safeTitle}</title><style>${css}</style></head>` +
      `<body><div class="doc-title">${safeTitle}</div>${bodyHtml}` +
      `<div class="noprint" style="position:fixed;top:8px;right:8px;font-family:sans-serif;font-size:13px">` +
      `<button onclick="window.print()" style="padding:6px 14px">PDF로 저장 / 인쇄</button></div>` +
      `</body></html>`,
  )
  w.document.close()
  w.focus()
  setTimeout(() => {
    try {
      w.print()
    } catch {
      /* 사용자가 수동으로 버튼 클릭 */
    }
  }, 400)
}
